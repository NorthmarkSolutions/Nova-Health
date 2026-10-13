// Lab Technician · Sample intake — collect, receive (or reject) and load samples on an analyzer.
// Collection is blocked while the bill is unsettled; analyzers that are down or due QC cannot take samples.
import React, { useState } from 'react';
import { TestTube2, Droplet, PackageCheck, XCircle, Printer, Cpu, ShieldCheck } from 'lucide-react';
import {
  HmsMasterDetail,
  HmsListRow,
  HmsBadge,
  HmsButton,
  HmsDetailHeader,
  HmsStatStrip,
  HmsDetailBody,
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
import { LabDataStore, LabQueueOrder, ageSex } from '../data/labDataStore';
import { fmtMinutes } from '../data/labAdminStore';
import { minutesSince } from '../data/pathologistStore';
import { isIntake, intakeSort, isUnpaid, analyzersFor, analyzerBlock } from '../data/technicianStore';
import { StageBadge, PriorityBadge, ANALYZER_TONE } from '../admin/labAdminUi';
import { TechnicianViewProps, printSpecimenLabel } from './technicianUi';

const REJECT_REASONS = ['Haemolysed', 'Clotted', 'Insufficient volume', 'Wrong container', 'Unlabelled / mislabelled', 'Leaked in transit', 'Other'];

export const TechnicianIntakeView: React.FC<TechnicianViewProps> = ({ data, by, notify, onNavigateTab, initialFilter, initialSelect }) => {
  const { orders, analyzers } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [rejectFor, setRejectFor] = useState<LabQueueOrder | null>(null);
  const [reject, setReject] = useState({ reason: REJECT_REASONS[0], note: '' });
  const [error, setError] = useState('');

  const intake = orders.filter(isIntake).sort(intakeSort);
  const filters: Record<string, (o: LabQueueOrder) => boolean> = {
    all: () => true,
    collect: (o) => o.stage === 'ORDERED',
    receive: (o) => o.stage === 'COLLECTED',
    load: (o) => o.stage === 'RECEIVED' || o.stage === 'ACCESSIONED',
    stat: (o) => o.priority === 'STAT',
    unpaid: (o) => o.stage === 'ORDERED' && isUnpaid(o),
    rejected: (o) => !!o.sampleRejectedReason,
  };
  const q = search.trim().toLowerCase();
  const visible = intake.filter((o) => (filters[pill] || filters.all)(o) && (!q || [o.patientName, o.uhid, o.orderNumber, o.specimenNumber, o.testName].some((v) => v.toLowerCase().includes(q))));
  const count = (k: string) => intake.filter(filters[k]).length;

  const pills = [
    { key: 'all', label: 'All', count: intake.length },
    { key: 'collect', label: 'To collect', count: count('collect') },
    { key: 'receive', label: 'To receive', count: count('receive') },
    { key: 'load', label: 'To load', count: count('load') },
    { key: 'stat', label: 'STAT', count: count('stat'), tone: 'red' as const },
    { key: 'unpaid', label: 'Bill unpaid', count: count('unpaid'), tone: 'amber' as const },
    { key: 'rejected', label: 'Recollect', count: count('rejected'), tone: 'red' as const },
  ];

  const rows: HmsListRow[] = visible.map((o) => {
    const waited = minutesSince(o.orderedAt);
    return {
      key: o.id,
      title: o.patientName,
      badge: o.sampleRejectedReason ? <HmsBadge tone="red">Recollect</HmsBadge> : <StageBadge stage={o.stage} />,
      sub: (
        <>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{o.specimenNumber}</span> · {o.testName}
        </>
      ),
      metaLeft: `${o.priority} · ${o.sampleType}`,
      metaRight: o.stage === 'ORDERED' && isUnpaid(o) ? <span style={{ color: '#b45309', fontWeight: 600 }}>Bill unpaid</span> : waited !== null ? `Ordered ${fmtMinutes(waited)} ago` : `Ordered ${o.orderedAt || '—'}`,
    };
  });

  const collect = (o: LabQueueOrder) => {
    if (!LabDataStore.collectSample(o.id, by)) {
      notify(`Collection blocked for ${o.patientName}: the bill is not settled at the cash counter.`, 'error');
      return;
    }
    notify(`Sample collected for ${o.patientName}. Print the label before it leaves the chair.`);
  };

  const submitReject = () => {
    if (!rejectFor) return;
    if (reject.reason === 'Other' && reject.note.trim().length < 5) return setError('Describe why the sample is rejected.');
    const reason = reject.note.trim() ? `${reject.reason} — ${reject.note.trim()}` : reject.reason;
    LabDataStore.rejectSample(rejectFor.id, reason, by);
    notify(`${rejectFor.specimenNumber} rejected (${reject.reason.toLowerCase()}). The order is back to “To collect”.`, 'error');
    setRejectFor(null);
    setReject({ reason: REJECT_REASONS[0], note: '' });
    setError('');
  };

  const renderDetail = (key: string | null) => {
    const o = orders.find((x) => x.id === key);
    if (!o) return <HmsEmpty>No samples waiting. New orders from OPD, IPD and the nurse desk appear here.</HmsEmpty>;
    const unpaid = isUnpaid(o);
    const options = analyzersFor(o, analyzers);
    const journey: [string, string | undefined][] = [
      ['Ordered', o.orderedAt],
      ['Collected', o.collectedAt],
      ['Received in lab', o.receivedAt],
    ];

    const actions =
      o.stage === 'ORDERED' ? (
        <HmsButton variant="primary" icon={Droplet} onClick={() => collect(o)} disabled={unpaid} title={unpaid ? 'Bill not settled' : undefined}>
          Mark collected
        </HmsButton>
      ) : o.stage === 'COLLECTED' ? (
        <>
          <HmsButton variant="danger" icon={XCircle} onClick={() => setRejectFor(o)}>
            Reject sample
          </HmsButton>
          <HmsButton variant="primary" icon={PackageCheck} onClick={() => { LabDataStore.receiveSample(o.id, by); notify(`${o.specimenNumber} received. Load it on an analyzer next.`); }}>
            Receive sample
          </HmsButton>
        </>
      ) : (
        <HmsButton variant="danger" icon={XCircle} onClick={() => setRejectFor(o)}>
          Reject sample
        </HmsButton>
      );

    return (
      <>
        <HmsDetailHeader
          icon={TestTube2}
          title={o.patientName}
          badge={<StageBadge stage={o.stage} />}
          subtitle={`${o.uhid} · ${ageSex(o.age, o.gender)} · ${o.location}`}
          actions={
            <>
              <HmsButton icon={Printer} onClick={() => (printSpecimenLabel(o) ? undefined : notify('The print dialog could not open in this browser.', 'error'))}>
                Print label
              </HmsButton>
              {actions}
            </>
          }
        />
        <HmsStatStrip
          items={[
            { label: 'Test', value: o.testName, note: `${o.orderNumber} · ${o.category}` },
            { label: 'Priority', value: <PriorityBadge priority={o.priority} />, note: o.doctorName },
            { label: 'Sample', value: o.sampleType, note: o.specimenNumber },
            { label: 'Bill', value: unpaid ? 'Unpaid' : o.billingStatus === 'EXEMPT' ? 'Exempt' : o.billingStatus === 'PAID' || o.isPaid ? 'Paid' : '—', tone: unpaid ? 'red' : 'default', note: unpaid ? 'Collection blocked' : undefined },
          ]}
        />
        <HmsDetailBody>
          {o.sampleRejectedReason && <HmsNotice tone="red">Previous sample rejected: {o.sampleRejectedReason}. Collect a fresh sample.</HmsNotice>}
          {o.stage === 'ORDERED' && unpaid && <HmsNotice tone="amber">Bill not settled at the cash counter. Send the patient to Billing; collection unlocks when it is paid.</HmsNotice>}

          {(o.stage === 'RECEIVED' || o.stage === 'ACCESSIONED') && (
            <HmsSection title={`Load on analyzer · ${o.category}`}>
              {options.map((a, idx) => {
                const block = analyzerBlock(a);
                return (
                  <HmsRow
                    key={a.id}
                    last={idx === options.length - 1}
                    label={
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        {a.name} <HmsBadge tone={ANALYZER_TONE[a.status]}>{a.status}</HmsBadge>
                      </span>
                    }
                    hint={`${a.section} · ${a.queuedCount} in queue · reagent ${a.reagentPercent}% · last QC ${a.lastQc}`}
                    value={
                      block === 'QC due' ? (
                        <HmsButton size="sm" icon={ShieldCheck} onClick={() => onNavigateTab('analyzers', 'qc', a.id)}>
                          Run QC first
                        </HmsButton>
                      ) : block ? (
                        <HmsBadge tone="red">{block}</HmsBadge>
                      ) : (
                        <HmsButton size="sm" variant="primary" icon={Cpu} onClick={() => { LabDataStore.loadOnAnalyzer(o.id, a.id, by); notify(`${o.testName} loaded on ${a.name}. Enter results in Result entry when the run finishes.`); }}>
                          Load
                        </HmsButton>
                      )
                    }
                  />
                );
              })}
            </HmsSection>
          )}

          <HmsSection title="Specimen journey">
            {journey.map(([label, time], idx) => (
              <HmsRow key={label} last={idx === journey.length - 1} label={label} value={<span style={{ fontSize: '13px', color: time ? HMS.text : HMS.textMuted }}>{time || 'Not yet'}</span>} />
            ))}
          </HmsSection>

          <HmsSection title="Order" defaultOpen={false}>
            <HmsRow label="Ordering doctor" value={o.doctorName} />
            <HmsRow label="Location" value={o.location} />
            <HmsRow label="Parameters" value={o.parameters.length} />
            <HmsRow label="Clinical notes" hint={o.relevantHistory?.length ? o.relevantHistory.join(' · ') : 'None on the order.'} last />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="tech-intake"
        title="Sample intake"
        description="Collect, receive and load samples. STAT first, then samples furthest along."
        total={intake.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search patient, UHID, order, specimen or test"
        pills={pills}
        activePill={pill}
        onPill={setPill}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="next step"
        detailLabel="Sample"
        renderDetail={renderDetail}
      />

      {rejectFor && (
        <HmsModal
          title="Reject sample"
          description={`${rejectFor.specimenNumber} · ${rejectFor.testName} · ${rejectFor.patientName}. The order goes back to collection.`}
          onClose={() => setRejectFor(null)}
          footer={
            <>
              <HmsButton onClick={() => setRejectFor(null)}>Cancel</HmsButton>
              <HmsButton variant="danger" icon={XCircle} onClick={submitReject}>
                Reject & request recollection
              </HmsButton>
            </>
          }
        >
          <HmsField label="Reason" required>
            <select style={INPUT} value={reject.reason} onChange={(e) => setReject({ ...reject, reason: e.target.value })}>
              {REJECT_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </HmsField>
          <HmsField label="Note" required={reject.reason === 'Other'}>
            <textarea style={TEXTAREA} rows={3} className={error ? 'hms-invalid' : undefined} value={reject.note} onChange={(e) => setReject({ ...reject, note: e.target.value })} placeholder="e.g. Visible haemolysis after centrifuge" />
          </HmsField>
          {error && <HmsNotice tone="red">{error}</HmsNotice>}
        </HmsModal>
      )}
    </>
  );
};

export default TechnicianIntakeView;
