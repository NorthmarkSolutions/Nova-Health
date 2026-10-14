// Billing · Admin — revenue integrity. Three kinds of work in one list: leakage alerts (services delivered but not
// billed), fraud-risk signals (patterns by user or counter) and investigation cases. Scan, recover a leak as a charge,
// dismiss with a reason, acknowledge a signal, open and work an investigation.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldAlert, Radar, Check, X, FolderSearch, Save, ReceiptText } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, HmsTone, INPUT, TEXTAREA } from '../../../components/hms';
import { billingService, FraudRiskSignalItem, RevenueInvestigationCaseItem, RevenueLeakageAlertItem } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { AdminDeskData, MONO, fmtWhen, num, titleCase } from './adminDeskData';

export interface AdmIntegrityViewProps {
  data: AdminDeskData;
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
  scanSignal: number;
}

const PILLS = ['leaks', 'signals', 'cases', 'closed'];
const LEAK_OPEN = ['OPEN', 'INVESTIGATING'];
const CASE_OPEN = ['OPEN', 'EVIDENCE_COLLECTED'];
const SEV_TONE: Record<string, HmsTone> = { CRITICAL: 'red', HIGH: 'red', MEDIUM: 'amber', LOW: 'gray' };

type Item = { kind: 'leak'; v: RevenueLeakageAlertItem } | { kind: 'signal'; v: FraudRiskSignalItem } | { kind: 'case'; v: RevenueInvestigationCaseItem };
const keyOf = (i: Item) => `${i.kind[0]}:${i.v.id}`;
const isOpen = (i: Item) => (i.kind === 'leak' ? LEAK_OPEN.includes(i.v.status) : i.kind === 'signal' ? !i.v.is_acknowledged : CASE_OPEN.includes(i.v.status));

export const AdmIntegrityView: React.FC<AdmIntegrityViewProps> = ({ data, notify, initialFilter, initialSelect, scanSignal }) => {
  const { format } = useCurrency();
  const [leaks, setLeaks] = useState<RevenueLeakageAlertItem[]>([]);
  const [signals, setSignals] = useState<FraudRiskSignalItem[]>([]);
  const [cases, setCases] = useState<RevenueInvestigationCaseItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'leaks');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [busy, setBusy] = useState(false);
  const [dismiss, setDismiss] = useState<null | { leak: RevenueLeakageAlertItem; reason: string }>(null);
  const [open, setOpen] = useState<null | { subject: string; findings: string; leak?: string; signal?: string }>(null);
  const [work, setWork] = useState<Record<string, { status: string; findings: string; recovered: string }>>({});
  const seen = useRef(scanSignal);

  const load = useCallback(async () => {
    const [l, s, c] = await Promise.allSettled([billingService.getRevenueLeakages(), billingService.getFraudRiskSignals(), billingService.getRevenueInvestigations()]);
    const miss: string[] = [];
    if (l.status === 'fulfilled') setLeaks(l.value);
    else miss.push('leakage alerts');
    if (s.status === 'fulfilled') setSignals(s.value);
    else miss.push('risk signals');
    if (c.status === 'fulfilled') setCases(c.value);
    else miss.push('investigations');
    setFailed(miss);
    setLoaded(true);
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const after = async (msg: string) => {
    notify(msg);
    setSelected(null);
    await Promise.all([load(), data.reload()]);
  };
  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try {
      await after(await fn());
    } catch (e) {
      notify(apiError(e, 'The action failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const scan = () =>
    run(async () => {
      const [l, s] = await Promise.all([billingService.scanRevenueLeakage(), billingService.scanFraudRiskSignals()]);
      return `Scan done · ${l.new_alerts_count} new leak${l.new_alerts_count === 1 ? '' : 's'}, ${s.new_signals_count} new signal${s.new_signals_count === 1 ? '' : 's'}`;
    });
  // Alt+S from the workspace runs a scan
  useEffect(() => {
    if (scanSignal === seen.current) return;
    seen.current = scanSignal;
    scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanSignal]);

  const items: Item[] = [...leaks.map((v) => ({ kind: 'leak' as const, v })), ...signals.map((v) => ({ kind: 'signal' as const, v })), ...cases.map((v) => ({ kind: 'case' as const, v }))];
  const match = (i: Item, p: string) => (p === 'closed' ? !isOpen(i) : isOpen(i) && (p === 'leaks' ? i.kind === 'leak' : p === 'signals' ? i.kind === 'signal' : i.kind === 'case'));
  const text = (i: Item) => (i.kind === 'leak' ? [i.v.notes, i.v.patient_name, i.v.patient_uhid, i.v.department, i.v.leakage_type_display, i.v.source_event_reference, i.v.admission_number] : i.kind === 'signal' ? [i.v.description, i.v.signal_code, i.v.target_user_name, i.v.counter_name] : [i.v.subject, i.v.case_number, i.v.findings, i.v.owner_name]);
  const q = search.trim().toLowerCase();
  const visible = items.filter((i) => match(i, pill) && (!q || text(i).some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = visible.map((i) => {
    if (i.kind === 'leak')
      return {
        key: keyOf(i),
        title: i.v.leakage_type_display || titleCase(i.v.leakage_type),
        badge: <HmsBadge tone={LEAK_OPEN.includes(i.v.status) ? (i.v.risk_score >= 70 ? 'red' : 'amber') : 'gray'}>{i.v.status_display || titleCase(i.v.status)}</HmsBadge>,
        sub: `${i.v.patient_name || '—'} · ${titleCase(i.v.department)}`,
        metaLeft: `Risk ${i.v.risk_score} · ${fmtWhen(i.v.detected_at)}`,
        metaRight: format(num(i.v.estimated_amount)),
      };
    if (i.kind === 'signal')
      return {
        key: keyOf(i),
        title: titleCase(i.v.signal_code),
        badge: <HmsBadge tone={i.v.is_acknowledged ? 'gray' : SEV_TONE[i.v.severity] || 'amber'}>{i.v.is_acknowledged ? 'Acknowledged' : i.v.severity_display || i.v.severity}</HmsBadge>,
        sub: `${i.v.target_user_name || 'No user'}${i.v.counter_name ? ` · ${i.v.counter_name}` : ''}`,
        metaLeft: `${i.v.occurrences_count}× seen`,
        metaRight: `Risk ${i.v.risk_score}`,
      };
    return {
      key: keyOf(i),
      title: i.v.subject,
      badge: <HmsBadge tone={CASE_OPEN.includes(i.v.status) ? 'blue' : 'green'}>{i.v.status_display || titleCase(i.v.status)}</HmsBadge>,
      sub: (
        <>
          <span style={MONO}>{i.v.case_number}</span> · {i.v.owner_name || 'Unassigned'}
        </>
      ),
      metaLeft: `Opened ${fmtWhen(i.v.created_at)}`,
      metaRight: num(i.v.recovered_amount) ? `${format(num(i.v.recovered_amount))} recovered` : undefined,
    };
  });

  const renderDetail = (key: string | null) => {
    if (!loaded) return <HmsEmpty>Loading revenue integrity…</HmsEmpty>;
    const i = items.find((x) => keyOf(x) === key);
    if (!i) return <HmsEmpty>{failed.length ? `Could not load ${failed.join(', ')}.` : pill === 'closed' ? 'Nothing closed yet.' : 'Nothing open here. Run a scan (Alt+S) to look for new leaks and signals.'}</HmsEmpty>;

    if (i.kind === 'leak') {
      const l = i.v;
      const openLeak = LEAK_OPEN.includes(l.status);
      return (
        <>
          <HmsDetailHeader icon={ShieldAlert} title={l.leakage_type_display || titleCase(l.leakage_type)} badge={<HmsBadge tone={openLeak ? 'amber' : 'gray'}>{l.status_display || titleCase(l.status)}</HmsBadge>} subtitle={<>{l.patient_name} · <span style={MONO}>{l.patient_uhid}</span> · {titleCase(l.department)}{l.admission_number ? ` · ${l.admission_number}` : ''}</>} />
          <HmsStatStrip
            items={[
              { label: 'Estimated', value: format(num(l.estimated_amount)) },
              { label: 'Risk score', value: l.risk_score, tone: l.risk_score >= 70 ? 'red' : l.risk_score >= 40 ? 'amber' : 'default' },
              { label: 'Reference', value: l.source_event_reference || '—', note: l.admission_number ? 'Admission' : undefined },
              { label: 'Detected', value: fmtWhen(l.detected_at) },
            ]}
          />
          <HmsDetailBody>
            <HmsSection title="What was found">
              <HmsRow label="Description" value={l.notes || '—'} />
              <HmsRow label="Assigned to" value={l.assigned_to_name || 'Nobody'} />
              {l.dismissal_reason && <HmsRow label="Dismissed because" value={l.dismissal_reason} />}
              {l.converted_charge && <HmsRow label="Recovered as charge" value={<span style={MONO}>{l.converted_charge}</span>} />}
              <HmsRow label="Last updated" value={fmtWhen(l.updated_at)} last />
            </HmsSection>
            {openLeak && <HmsNotice tone="blue">Recover it as a charge if the service was delivered (it goes to the patient’s billing queue), or dismiss it with a reason.</HmsNotice>}
          </HmsDetailBody>
          {openLeak && (
            <HmsDetailFooter>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                <HmsButton variant="danger" icon={X} block disabled={busy} onClick={() => setDismiss({ leak: l, reason: '' })}>
                  Dismiss
                </HmsButton>
                <HmsButton icon={FolderSearch} block disabled={busy} onClick={() => setOpen({ subject: `${l.leakage_type_display || 'Leakage'} · ${l.patient_name}`, findings: l.notes, leak: l.id })}>
                  Investigate
                </HmsButton>
                <HmsButton variant="primary" icon={ReceiptText} block disabled={busy} onClick={() => run(async () => { await billingService.convertLeakageToCharge(l.id); return `${format(num(l.estimated_amount))} recovered as a charge for ${l.patient_name}`; })}>
                  Recover charge
                </HmsButton>
              </div>
            </HmsDetailFooter>
          )}
        </>
      );
    }

    if (i.kind === 'signal') {
      const s = i.v;
            return (
        <>
          <HmsDetailHeader icon={Radar} title={titleCase(s.signal_code)} badge={<HmsBadge tone={s.is_acknowledged ? 'gray' : SEV_TONE[s.severity] || 'amber'}>{s.is_acknowledged ? 'Acknowledged' : s.severity_display || s.severity}</HmsBadge>} subtitle={`${s.target_user_name || 'No user'}${s.counter_name ? ` · ${s.counter_name}` : ''}`} />
          <HmsStatStrip
            items={[
              { label: 'Severity', value: s.severity_display || s.severity, tone: s.severity === 'HIGH' || s.severity === 'CRITICAL' ? 'red' : 'default' },
              { label: 'Risk score', value: s.risk_score, tone: s.risk_score >= 70 ? 'red' : 'default' },
              { label: 'Occurrences', value: `${s.occurrences_count}×` },
              { label: 'Detected', value: fmtWhen(s.detected_at) },
            ]}
          />
          <HmsDetailBody>
            <HmsSection title="Signal">
              <HmsRow label="Pattern" value={s.description || '—'} />
              <HmsRow label="User" value={s.target_user_name || '—'} />
              <HmsRow label="Counter" value={s.counter_name || '—'} last={!s.is_acknowledged} />
              {s.is_acknowledged && <HmsRow label="Acknowledged by" value={s.acknowledged_by_name || '—'} last />}
            </HmsSection>
          </HmsDetailBody>
          {!s.is_acknowledged && (
            <HmsDetailFooter>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                <HmsButton icon={FolderSearch} block disabled={busy} onClick={() => setOpen({ subject: `${titleCase(s.signal_code)} · ${s.target_user_name || s.counter_name || 'billing'}`, findings: s.description, signal: s.id })}>
                  Open investigation
                </HmsButton>
                <HmsButton variant="primary" icon={Check} block disabled={busy} onClick={() => run(async () => { await billingService.acknowledgeRiskSignal(s.id); return 'Signal acknowledged'; })}>
                  Acknowledge
                </HmsButton>
              </div>
            </HmsDetailFooter>
          )}
        </>
      );
    }

    const c = i.v;
    const w = work[c.id] || { status: c.status, findings: c.findings || '', recovered: String(num(c.recovered_amount) || '') };
    const setW = (patch: Partial<typeof w>) => setWork((x) => ({ ...x, [c.id]: { ...w, ...patch } }));
    const openCase = CASE_OPEN.includes(c.status);
    return (
      <>
        <HmsDetailHeader icon={FolderSearch} title={c.subject} badge={<HmsBadge tone={openCase ? 'blue' : 'green'}>{c.status_display || titleCase(c.status)}</HmsBadge>} subtitle={<span style={MONO}>{c.case_number}</span>} />
        <HmsStatStrip
          items={[
            { label: 'Status', value: c.status_display || titleCase(c.status) },
            { label: 'Owner', value: c.owner_name || '—' },
            { label: 'Recovered', value: format(num(c.recovered_amount)), tone: num(c.recovered_amount) ? 'green' : 'default' },
            { label: 'Opened', value: fmtWhen(c.created_at), note: `Updated ${fmtWhen(c.updated_at)}` },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title="Case work" padded>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
              <HmsField label="Status" htmlFor="case-status">
                <select id="case-status" style={INPUT} value={w.status} onChange={(e) => setW({ status: e.target.value })}>
                  <option value="OPEN">Open</option>
                  <option value="EVIDENCE_COLLECTED">Evidence collected</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </HmsField>
              <HmsField label="Recovered amount" htmlFor="case-rec">
                <input id="case-rec" style={INPUT} inputMode="decimal" value={w.recovered} onChange={(e) => setW({ recovered: e.target.value })} />
              </HmsField>
            </div>
            <div style={{ marginTop: '16px' }}>
              <HmsField label="Findings" htmlFor="case-find">
                <textarea id="case-find" style={TEXTAREA} value={w.findings} onChange={(e) => setW({ findings: e.target.value })} />
              </HmsField>
            </div>
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton
            variant="primary"
            icon={Save}
            block
            disabled={busy || (w.status === c.status && w.findings === (c.findings || '') && num(w.recovered) === num(c.recovered_amount))}
            onClick={() => run(async () => { await billingService.updateRevenueInvestigation(c.id, { status: w.status, findings: w.findings, recovered_amount: num(w.recovered) }); setWork((x) => { const n = { ...x }; delete n[c.id]; return n; }); return `${c.case_number} updated`; })}
          >
            Save case
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  const ik = data.integrity?.kpis;
  return (
    <>
      <HmsMasterDetail
        listId="adm-integrity"
        title="Revenue integrity"
        description={ik ? `${format(ik.amount_at_risk)} at risk · ${format(ik.recovered_mtd)} recovered this month.` : 'Leakage, fraud-risk signals and investigations.'}
        total={items.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search patient, user, counter or case"
        headerAction={
          <HmsButton size="sm" icon={Radar} disabled={busy} onClick={scan} title="Scan for new leaks and signals (Alt+S)">
            Scan
          </HmsButton>
        }
        pills={[
          { key: 'leaks', label: 'Leakage', count: items.filter((i) => match(i, 'leaks')).length, tone: 'amber' },
          { key: 'signals', label: 'Risk signals', count: items.filter((i) => match(i, 'signals')).length, tone: 'red' },
          { key: 'cases', label: 'Investigations', count: items.filter((i) => match(i, 'cases')).length },
          { key: 'closed', label: 'Closed', count: items.filter((i) => !isOpen(i)).length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open item"
        detailLabel="Integrity item"
        emptyText="Nothing matches this search or filter."
        renderDetail={renderDetail}
      />
      {dismiss && (
        <HmsModal
          title="Dismiss this leakage alert?"
          description={`${dismiss.leak.patient_name} · ${format(num(dismiss.leak.estimated_amount))}. The reason is kept on the audit log.`}
          onClose={() => setDismiss(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setDismiss(null)}>Cancel</HmsButton>
              <HmsButton
                variant="danger"
                icon={X}
                disabled={busy || dismiss.reason.trim().length < 5}
                onClick={() => {
                  const d = dismiss;
                  setDismiss(null);
                  run(async () => {
                    await billingService.dismissLeakage(d.leak.id, d.reason.trim());
                    return 'Alert dismissed';
                  });
                }}
              >
                Dismiss
              </HmsButton>
            </>
          }
        >
          <HmsField label="Reason" htmlFor="lk-reason" required hint="e.g. service waived by the medical superintendent, duplicate alert.">
            <textarea id="lk-reason" autoFocus style={TEXTAREA} value={dismiss.reason} onChange={(e) => setDismiss({ ...dismiss, reason: e.target.value })} />
          </HmsField>
        </HmsModal>
      )}
      {open && (
        <HmsModal
          title="Open an investigation"
          description="A case docket for revenue assurance to work."
          onClose={() => setOpen(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setOpen(null)}>Cancel</HmsButton>
              <HmsButton
                variant="primary"
                icon={FolderSearch}
                disabled={busy || !open.subject.trim()}
                onClick={() => {
                  const o = open;
                  setOpen(null);
                  run(async () => {
                    const c = await billingService.openRevenueInvestigation({ subject: o.subject.trim(), initial_findings: o.findings.trim() || undefined, leakage_alert_id: o.leak, risk_signal_id: o.signal });
                    setPill('cases');
                    return `${c.case_number} opened`;
                  });
                }}
              >
                Open case
              </HmsButton>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <HmsField label="Subject" htmlFor="inv-sub" required>
              <input id="inv-sub" autoFocus style={INPUT} value={open.subject} onChange={(e) => setOpen({ ...open, subject: e.target.value })} />
            </HmsField>
            <HmsField label="Initial findings" htmlFor="inv-find">
              <textarea id="inv-find" style={TEXTAREA} value={open.findings} onChange={(e) => setOpen({ ...open, findings: e.target.value })} />
            </HmsField>
          </div>
        </HmsModal>
      )}
    </>
  );
};
