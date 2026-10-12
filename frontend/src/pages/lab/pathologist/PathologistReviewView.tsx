// Pathologist · Review queue — results entered by the bench, waiting for validation and sign-off.
// Critical first, then STAT / Urgent / Routine, then the longest waiting. Signing a critical result
// opens a call-back that must be acknowledged (Critical call-backs section).
import React, { useState } from 'react';
import { FileCheck, RotateCcw, Save, ShieldAlert, FlaskConical } from 'lucide-react';
import {
  HmsMasterDetail,
  HmsListRow,
  HmsBadge,
  HmsButton,
  HmsDetailHeader,
  HmsStatStrip,
  HmsDetailBody,
  HmsDetailFooter,
  HmsSection,
  HmsRow,
  HmsNotice,
  HmsEmpty,
  HmsModal,
  HmsField,
  INPUT,
  TEXTAREA,
  HMS,
} from '../../../components/hms';
import { LabDataStore, LabQueueOrder } from '../data/labDataStore';
import { fmtMinutes } from '../data/labAdminStore';
import {
  orderFlag,
  paramFlag,
  deltaPct,
  DELTA_LIMIT_PCT,
  isReviewable,
  isSentBack,
  reviewOrderSort,
  minutesSince,
  tatTargetFor,
} from '../data/pathologistStore';
import { PathologistViewProps, FlagBadge, PriorityBadge } from './pathologistUi';
import { FLAG_COLOR, fmtRange } from './pathologistFormat';

const RETEST_REASONS = [
  'Haemolysed sample',
  'Clotted sample',
  'Insufficient volume',
  'Delta check failure',
  'Result inconsistent with clinical picture',
  'QC failure on the run',
  'Other',
];

export const PathologistReviewView: React.FC<PathologistViewProps> = ({ data, by, notify, initialFilter }) => {
  const { orders, reports, catalog, analyzers, ackWindowLabel } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [retestFor, setRetestFor] = useState<LabQueueOrder | null>(null);
  const [retest, setRetest] = useState({ reason: RETEST_REASONS[0], note: '' });
  const [confirmCritical, setConfirmCritical] = useState<LabQueueOrder | null>(null);

  const reviewable = orders.filter(isReviewable).sort(reviewOrderSort);
  const sentBack = orders.filter(isSentBack);
  const count = (f: (o: LabQueueOrder) => boolean) => reviewable.filter(f).length;

  const filters: Record<string, (o: LabQueueOrder) => boolean> = {
    all: () => true,
    critical: (o) => orderFlag(o) === 'Critical',
    abnormal: (o) => orderFlag(o) === 'Abnormal',
    normal: (o) => orderFlag(o) === 'Normal',
    stat: (o) => o.priority === 'STAT',
    rerun: (o) => !!o.returnedForRetest,
  };
  const base = pill === 'sentback' ? sentBack : reviewable.filter(filters[pill] || filters.all);
  const q = search.trim().toLowerCase();
  const visible = base.filter((o) => !q || [o.patientName, o.uhid, o.orderNumber, o.testName, o.doctorName].some((v) => v.toLowerCase().includes(q)));

  const pills = [
    { key: 'all', label: 'All', count: reviewable.length },
    { key: 'critical', label: 'Critical', count: count(filters.critical), tone: 'red' as const },
    { key: 'abnormal', label: 'Abnormal', count: count(filters.abnormal), tone: 'amber' as const },
    { key: 'normal', label: 'Normal', count: count(filters.normal) },
    { key: 'stat', label: 'STAT', count: count(filters.stat) },
    { key: 'rerun', label: 'Re-run results', count: count(filters.rerun) },
    { key: 'sentback', label: 'At bench for re-test', count: sentBack.length },
  ];

  const rows: HmsListRow[] = visible.map((o) => {
    const waited = minutesSince(o.enteredAt);
    return {
      key: o.id,
      title: o.patientName,
      badge: isSentBack(o) ? <HmsBadge tone="gray">At bench</HmsBadge> : <FlagBadge flag={orderFlag(o)} />,
      sub: (
        <>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{o.orderNumber}</span> · {o.testName}
        </>
      ),
      metaLeft: `${o.priority} · ${o.location}`,
      metaRight: isSentBack(o) ? 'Re-test requested' : waited !== null ? `Waiting ${fmtMinutes(waited)}` : o.enteredAt ? `Entered ${o.enteredAt}` : undefined,
    };
  });

  // Interpretation draft per order; starts from what is saved on the order
  const noteOf = (o: LabQueueOrder) => notes[o.id] ?? o.pathologistInterpretation ?? '';
  const setNote = (o: LabQueueOrder, v: string) => setNotes((n) => ({ ...n, [o.id]: v }));

  const activeKey = rows.find((r) => r.key === selected)?.key ?? rows[0]?.key ?? null;
  const [errorFor, setErrorFor] = useState<string | null>(null);
  if (activeKey !== errorFor) {
    setErrorFor(activeKey);
    setError('');
  }

  const validateNote = (o: LabQueueOrder) => {
    const flag = orderFlag(o);
    const text = noteOf(o).trim();
    if (flag !== 'Normal' && text.length < 10) {
      setError(`Add an interpretation for this ${flag.toLowerCase()} result before signing off.`);
      return null;
    }
    setError('');
    return text || 'All parameters within reference range.';
  };

  const signOff = (o: LabQueueOrder) => {
    const text = validateNote(o);
    if (text === null) return;
    if (orderFlag(o) === 'Critical') {
      setConfirmCritical(o);
      return;
    }
    const report = LabDataStore.signOffOrder(o.id, text, by);
    notify(`${o.testName} for ${o.patientName} signed off${report ? ` as ${report.reportNumber}` : ''} and sent to ${o.doctorName}.`);
  };

  const releaseCritical = () => {
    if (!confirmCritical) return;
    const o = confirmCritical;
    LabDataStore.flagCritical(o.id, noteOf(o).trim(), by);
    setConfirmCritical(null);
    notify(`Critical result released to ${o.doctorName}. Record the read-back in Critical call-backs.`);
  };

  const submitRetest = () => {
    if (!retestFor) return;
    if (retest.reason === 'Other' && retest.note.trim().length < 5) {
      setError('Describe why the sample needs a re-test.');
      return;
    }
    const reason = retest.note.trim() ? `${retest.reason} — ${retest.note.trim()}` : retest.reason;
    LabDataStore.requestRetest(retestFor.id, reason, by);
    notify(`${retestFor.testName} for ${retestFor.patientName} returned to the bench: ${retest.reason.toLowerCase()}.`);
    setRetestFor(null);
    setRetest({ reason: RETEST_REASONS[0], note: '' });
  };

  const focusNote = () => requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('#path-interpretation')?.focus());

  const renderDetail = (key: string | null) => {
    const o = orders.find((x) => x.id === key);
    if (!o) return <HmsEmpty>{pill === 'sentback' ? 'Nothing is waiting at the bench for a re-test.' : 'The review queue is clear. New results appear here as soon as the bench enters them.'}</HmsEmpty>;
    const flag = orderFlag(o);
    const back = isSentBack(o);
    const waited = minutesSince(o.enteredAt);
    const elapsed = minutesSince(o.orderedAt);
    const target = tatTargetFor(o, catalog);
    const overTat = elapsed !== null && target !== null && elapsed > target;
    const criticals = o.parameters.filter((p) => paramFlag(p) === 'Critical');
    const analyzer = analyzers.find((a) => a.name === o.analyzerName);
    const prior = reports.find((r) => r.orderNumber === o.orderNumber);
    const groups = Array.from(new Set(o.parameters.map((p) => p.group || 'Results')));

    return (
      <>
        <HmsDetailHeader
          icon={FlaskConical}
          title={o.patientName}
          badge={back ? <HmsBadge tone="gray">At bench for re-test</HmsBadge> : <FlagBadge flag={flag} />}
          subtitle={`${o.uhid} · ${o.age}y ${o.gender} · ${o.location}`}
        />
        <HmsStatStrip
          items={[
            { label: 'Test', value: o.testName, note: `${o.orderNumber} · ${o.testCode}` },
            { label: 'Priority', value: <PriorityBadge priority={o.priority} />, note: `Ordered ${o.orderedAt || '—'}` },
            { label: 'Waiting for you', value: back ? '—' : fmtMinutes(waited), note: o.enteredAt ? `Entered ${o.enteredAt}` : 'Entry time not recorded' },
            { label: 'Turnaround', value: fmtMinutes(elapsed), note: target !== null ? `Target ${fmtMinutes(target)}` : 'No catalog target', tone: overTat ? 'red' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {back && <HmsNotice tone="amber">Returned to the bench by {o.returnedBy || 'the pathologist'}: {o.retestReason || 'no reason recorded'}. It comes back to this queue when the technician re-enters results.</HmsNotice>}
          {!back && criticals.length > 0 && (
            <HmsNotice tone="red">
              {criticals.length} critical value{criticals.length === 1 ? '' : 's'}: {criticals.map((p) => `${p.name} ${p.observedValue} ${p.unit}`).join(' · ')}. Signing off alerts {o.doctorName} and opens a call-back to be acknowledged within {ackWindowLabel}.
            </HmsNotice>
          )}
          {!back && o.returnedForRetest && <HmsNotice tone="blue">Re-run after your request: {o.retestReason || 'reason not recorded'}.</HmsNotice>}
          {analyzer && (analyzer.isQcDue || analyzer.status === 'Offline' || analyzer.status === 'Maintenance') && (
            <HmsNotice tone="amber">
              {analyzer.status === 'Offline' || analyzer.status === 'Maintenance' ? `${analyzer.name} is ${analyzer.status.toLowerCase()}.` : `QC is due on ${analyzer.name} (last QC ${analyzer.lastQc}).`} Confirm the run is valid before releasing.
            </HmsNotice>
          )}
          {prior && <HmsNotice tone="blue">Already reported as {prior.reportNumber} ({prior.signedAt}). Signing again issues a new report for this order.</HmsNotice>}

          {groups.map((g) => {
            const params = o.parameters.filter((p) => (p.group || 'Results') === g);
            return (
              <HmsSection key={g} title={g === 'Results' ? 'Results' : `Results · ${g.toLowerCase()}`}>
                {params.map((p, idx) => {
                  const f = paramFlag(p);
                  const d = deltaPct(p);
                  const deltaFail = d !== null && Math.abs(d) > DELTA_LIMIT_PCT;
                  const crit = [p.criticalLow !== undefined ? `< ${p.criticalLow}` : '', p.criticalHigh !== undefined ? `> ${p.criticalHigh}` : ''].filter(Boolean).join(' or ');
                  return (
                    <HmsRow
                      key={p.name}
                      last={idx === params.length - 1}
                      label={p.name}
                      hint={
                        <>
                          Ref {fmtRange(p.low, p.high, p.unit)}
                          {crit ? ` · critical ${crit}` : ''}
                          {p.previousValue !== null && p.previousValue !== undefined ? ` · previous ${p.previousValue}` : ''}
                          {deltaFail && <span style={{ color: '#b45309', fontWeight: 600 }}> · delta {d! > 0 ? '+' : ''}{d}%</span>}
                        </>
                      }
                      value={
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: FLAG_COLOR[f] }}>
                            {p.observedValue ?? '—'} <span style={{ fontSize: '12px', fontWeight: 500, color: HMS.textSecondary }}>{p.unit}</span>
                          </span>
                          {f !== 'Normal' && <FlagBadge flag={f} />}
                        </span>
                      }
                    />
                  );
                })}
              </HmsSection>
            );
          })}

          <HmsSection title="Specimen & run">
            <HmsRow label="Specimen" value={`${o.specimenNumber} · ${o.sampleType}`} />
            <HmsRow label="Collected · received" value={`${o.collectedAt || '—'} · ${o.receivedAt || '—'}`} />
            <HmsRow label="Run by" value={`${o.assignedTechnician || 'Not recorded'} · ${o.analyzerName || 'Analyzer not recorded'}`} />
            <HmsRow label="Technician note" hint={o.technicianNote || 'No note from the bench.'} last />
          </HmsSection>

          <HmsSection title="Clinical context" defaultOpen={!!o.relevantHistory?.length}>
            <HmsRow label="Ordering doctor" value={o.doctorName} />
            <HmsRow label="Relevant history" hint={o.relevantHistory?.length ? o.relevantHistory.join(' · ') : 'None recorded on the order.'} last />
          </HmsSection>

          {!back && (
            <HmsSection title="Interpretation" padded>
              {error && (
                <div style={{ marginBottom: '12px' }}>
                  <HmsNotice tone="red">{error}</HmsNotice>
                </div>
              )}
              <HmsField label="Pathologist comment on the report" required={flag !== 'Normal'} htmlFor="path-interpretation" hint={flag === 'Normal' ? 'Optional for normal results — “All parameters within reference range.” is used if left blank.' : undefined}>
                <textarea
                  id="path-interpretation"
                  rows={4}
                  style={TEXTAREA}
                  className={error ? 'hms-invalid' : undefined}
                  value={noteOf(o)}
                  onChange={(e) => setNote(o, e.target.value)}
                  placeholder="Clinical interpretation, correlation with history and any recommendation"
                />
              </HmsField>
              <div style={{ marginTop: '12px' }}>
                <HmsButton
                  size="sm"
                  icon={Save}
                  onClick={() => {
                    LabDataStore.updateOrder(o.id, { pathologistInterpretation: noteOf(o).trim() });
                    notify('Interpretation saved on the order. It is not released until you sign off.');
                  }}
                >
                  Save draft
                </HmsButton>
              </div>
            </HmsSection>
          )}
        </HmsDetailBody>
        {!back && (
          <HmsDetailFooter>
            <HmsButton style={{ flex: 1 }} icon={RotateCcw} onClick={() => setRetestFor(o)}>
              Request re-test
            </HmsButton>
            <HmsButton style={{ flex: 1 }} variant={flag === 'Critical' ? 'danger' : 'primary'} icon={flag === 'Critical' ? ShieldAlert : FileCheck} onClick={() => signOff(o)}>
              {flag === 'Critical' ? 'Sign off & send critical alert' : 'Approve & sign off'}
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="path-review"
        title="Review queue"
        description="Results entered by the bench. Critical and STAT come first, then the longest waiting."
        total={reviewable.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search patient, UHID, order, test or doctor"
        pills={pills}
        activePill={pill}
        onPill={setPill}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="write interpretation"
        onPrimary={focusNote}
        detailLabel="Result review"
        emptyText={pill === 'all' && !q ? 'No results are waiting for review.' : undefined}
        renderDetail={renderDetail}
      />

      {retestFor && (
        <HmsModal
          title="Request re-test"
          description={`${retestFor.testName} · ${retestFor.patientName} · ${retestFor.specimenNumber}. The order goes back to the technician bench.`}
          onClose={() => setRetestFor(null)}
          footer={
            <>
              <HmsButton onClick={() => setRetestFor(null)}>Cancel</HmsButton>
              <HmsButton variant="primary" icon={RotateCcw} onClick={submitRetest}>
                Return to bench
              </HmsButton>
            </>
          }
        >
          <HmsField label="Reason" required>
            <select style={INPUT} value={retest.reason} onChange={(e) => setRetest({ ...retest, reason: e.target.value })}>
              {RETEST_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </HmsField>
          <HmsField label="Note for the technician" required={retest.reason === 'Other'}>
            <textarea style={TEXTAREA} rows={3} value={retest.note} onChange={(e) => setRetest({ ...retest, note: e.target.value })} placeholder="e.g. Recollect in a fresh SST tube" />
          </HmsField>
          {error && <HmsNotice tone="red">{error}</HmsNotice>}
        </HmsModal>
      )}

      {confirmCritical && (
        <HmsModal
          title="Release critical result"
          description={`${confirmCritical.testName} · ${confirmCritical.patientName} · ${confirmCritical.location}`}
          onClose={() => setConfirmCritical(null)}
          footer={
            <>
              <HmsButton onClick={() => setConfirmCritical(null)}>Cancel</HmsButton>
              <HmsButton variant="danger" icon={ShieldAlert} onClick={releaseCritical} data-autofocus>
                Sign off & alert {confirmCritical.doctorName}
              </HmsButton>
            </>
          }
        >
          <HmsNotice tone="red">
            {confirmCritical.parameters
              .filter((p) => paramFlag(p) === 'Critical')
              .map((p) => `${p.name} ${p.observedValue} ${p.unit} (ref ${fmtRange(p.low, p.high, p.unit)})`)
              .join(' · ') || 'Marked critical by the bench.'}
          </HmsNotice>
          <p style={{ fontSize: '14px', color: HMS.textSecondary, margin: 0, lineHeight: 1.5 }}>
            The report is released with your signature and {confirmCritical.doctorName} is alerted. Phone the ward, get a read-back of the value and record it in Critical call-backs within {ackWindowLabel}.
          </p>
        </HmsModal>
      )}
    </>
  );
};

export default PathologistReviewView;
