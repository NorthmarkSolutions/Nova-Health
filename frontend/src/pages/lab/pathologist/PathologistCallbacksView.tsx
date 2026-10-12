// Pathologist · Critical call-backs — every released critical result needs a recorded read-back
// from the receiving clinician within the window set in Lab Admin › Department settings.
import React, { useState } from 'react';
import { PhoneCall, PhoneMissed, ShieldAlert, CheckCircle2 } from 'lucide-react';
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
  HmsField,
  HmsToggle,
  INPUT,
  HMS,
} from '../../../components/hms';
import { LabDataStore, SignedReportItem } from '../data/labDataStore';
import { fmtMinutes } from '../data/labAdminStore';
import { awaitingAck, ackWaitMinutes, callAttempts, paramFlag, signerOf } from '../data/pathologistStore';
import { PathologistViewProps } from './pathologistUi';

const RECEIVER_ROLES = ['Ordering doctor', 'Resident on duty', 'Nurse in-charge', 'Duty consultant'];

interface AckForm {
  receivedBy: string;
  role: string;
  readBack: boolean;
}
const EMPTY_FORM: AckForm = { receivedBy: '', role: RECEIVER_ROLES[0], readBack: false };

export const PathologistCallbacksView: React.FC<PathologistViewProps> = ({ data, by, notify, initialFilter }) => {
  const { reports, orders, ackWindowMin, ackWindowLabel } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'pending');
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<AckForm>(EMPTY_FORM);
  const [formKey, setFormKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const critical = reports.filter((r) => r.flag === 'Critical');
  const overdue = (r: SignedReportItem) => {
    const w = ackWaitMinutes(r);
    return awaitingAck(r) && w !== null && ackWindowMin !== null && w > ackWindowMin;
  };
  const filters: Record<string, (r: SignedReportItem) => boolean> = {
    pending: awaitingAck,
    overdue,
    acknowledged: (r) => r.deliveryStatus === 'acknowledged',
    all: () => true,
  };
  const q = search.trim().toLowerCase();
  const visible = critical
    .filter((r) => (filters[pill] || filters.pending)(r))
    .filter((r) => !q || [r.patientName, r.uhid, r.reportNumber, r.testName, r.doctorName, r.location].some((v) => v.toLowerCase().includes(q)))
    .sort((a, b) => Number(awaitingAck(b)) - Number(awaitingAck(a)) || (ackWaitMinutes(b) ?? -1) - (ackWaitMinutes(a) ?? -1));

  const pills = [
    { key: 'pending', label: 'Awaiting read-back', count: critical.filter(awaitingAck).length, tone: 'red' as const },
    { key: 'overdue', label: 'Past window', count: critical.filter(overdue).length, tone: 'red' as const },
    { key: 'acknowledged', label: 'Acknowledged', count: critical.filter(filters.acknowledged).length },
    { key: 'all', label: 'All critical', count: critical.length },
  ];

  const rows: HmsListRow[] = visible.map((r) => {
    const w = ackWaitMinutes(r);
    const late = overdue(r);
    return {
      key: r.id,
      title: r.patientName,
      badge: awaitingAck(r) ? <HmsBadge tone="red">{late ? 'Overdue' : 'Awaiting'}</HmsBadge> : r.deliveryStatus === 'acknowledged' ? <HmsBadge tone="green">Acknowledged</HmsBadge> : <HmsBadge tone="gray">Sent</HmsBadge>,
      sub: (
        <>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{r.reportNumber}</span> · {r.testName}
        </>
      ),
      metaLeft: `${r.doctorName} · ${r.location}`,
      metaRight: awaitingAck(r) ? <span style={{ color: late ? '#dc2626' : '#b45309', fontWeight: 600 }}>{w !== null ? `${fmtMinutes(w)} since release` : `Released ${r.signedAt}`}</span> : r.deliveryText,
    };
  });

  const activeKey = rows.find((r) => r.key === selected)?.key ?? rows[0]?.key ?? null;
  if (activeKey !== formKey) {
    const r = reports.find((x) => x.id === activeKey);
    setFormKey(activeKey);
    setForm({ ...EMPTY_FORM, receivedBy: r?.doctorName || '' });
    setError('');
  }

  const acknowledge = (r: SignedReportItem) => {
    if (form.receivedBy.trim().length < 3) return setError('Enter the name of the person who received the result.');
    if (!form.readBack) return setError('Confirm the value was read back before recording the acknowledgement.');
    setError('');
    LabDataStore.acknowledgeCritical(r.id, form.receivedBy.trim(), form.role, by);
    notify(`Read-back recorded for ${r.patientName} · ${r.testName} (${form.receivedBy.trim()}).`);
  };

  const logAttempt = (r: SignedReportItem) => {
    LabDataStore.logCallAttempt(r.id, `no answer from ${r.location}`, by);
    notify(`Unanswered call logged for ${r.reportNumber}. Try again or escalate to the duty consultant.`, 'error');
  };

  const renderDetail = (key: string | null) => {
    const r = reports.find((x) => x.id === key);
    if (!r) return <HmsEmpty>{pill === 'pending' ? 'No critical results are waiting for a read-back.' : 'Select a critical result to see its call-back.'}</HmsEmpty>;
    const order = orders.find((o) => o.orderNumber === r.orderNumber);
    const values = order?.parameters.filter((p) => paramFlag(p) === 'Critical') || [];
    const w = ackWaitMinutes(r);
    const late = overdue(r);
    const pending = awaitingAck(r);
    const attempts = callAttempts(r);

    return (
      <>
        <HmsDetailHeader
          icon={ShieldAlert}
          title={r.patientName}
          badge={pending ? <HmsBadge tone="red">{late ? 'Overdue' : 'Awaiting read-back'}</HmsBadge> : <HmsBadge tone="green">Acknowledged</HmsBadge>}
          subtitle={`${r.reportNumber} · ${r.testName} · ${r.uhid}`}
        />
        <HmsStatStrip
          items={[
            { label: 'Released', value: r.signedAt, note: `By ${signerOf(r) || 'not recorded'}` },
            { label: 'Waiting', value: pending ? fmtMinutes(w) : '—', note: `Window ${ackWindowLabel}`, tone: late ? 'red' : pending ? 'amber' : 'default' },
            { label: 'Call to', value: r.doctorName, note: r.location },
            { label: 'Call attempts', value: attempts, note: attempts ? 'Unanswered, logged' : 'None logged', tone: attempts ? 'amber' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {late && <HmsNotice tone="red">Past the {ackWindowLabel} acknowledgement window. If {r.doctorName} cannot be reached, call the resident or the duty consultant for {r.location} and record who took the result.</HmsNotice>}
          {!pending && <HmsNotice tone="green">{r.deliveryText}</HmsNotice>}

          <HmsSection title="Critical values to read out">
            {values.length ? (
              values.map((p, idx) => (
                <HmsRow
                  key={p.name}
                  last={idx === values.length - 1}
                  label={p.name}
                  hint={`Ref ${p.low}–${p.high} ${p.unit}${p.criticalLow !== undefined ? ` · critical < ${p.criticalLow}` : ''}${p.criticalHigh !== undefined ? ` · critical > ${p.criticalHigh}` : ''}`}
                  value={
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626' }}>
                      {p.observedValue} <span style={{ fontSize: '12px', fontWeight: 500, color: HMS.textSecondary }}>{p.unit}</span>
                    </span>
                  }
                />
              ))
            ) : (
              <HmsRow label="Key findings" hint={r.keyFindings} last />
            )}
          </HmsSection>

          {pending && (
            <HmsSection title="Record read-back" padded>
              {error && (
                <div style={{ marginBottom: '12px' }}>
                  <HmsNotice tone="red">{error}</HmsNotice>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                <HmsField label="Result received by" required>
                  <input style={INPUT} className={error && form.receivedBy.trim().length < 3 ? 'hms-invalid' : undefined} value={form.receivedBy} onChange={(e) => setForm({ ...form, receivedBy: e.target.value })} placeholder="Full name" />
                </HmsField>
                <HmsField label="Role">
                  <select style={INPUT} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {RECEIVER_ROLES.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </HmsField>
              </div>
              <div style={{ marginTop: '14px' }}>
                <HmsToggle checked={form.readBack} onChange={(v) => setForm({ ...form, readBack: v })} label="The receiver read the value back correctly" />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                <HmsButton variant="primary" icon={CheckCircle2} onClick={() => acknowledge(r)}>
                  Record acknowledgement
                </HmsButton>
                <HmsButton icon={PhoneMissed} onClick={() => logAttempt(r)}>
                  Log unanswered call
                </HmsButton>
              </div>
            </HmsSection>
          )}

          <HmsSection title="Call log & audit trail" right={<PhoneCall size={16} color={HMS.textSecondary} />}>
            {r.auditTrail.map((a, idx) => (
              <HmsRow key={a.id} last={idx === r.auditTrail.length - 1} label={a.title} hint={a.by} value={<span style={{ fontSize: '13px', color: HMS.textSecondary }}>{a.time}</span>} />
            ))}
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="path-callbacks"
      title="Critical call-backs"
      description={`Released critical results. Phone the ward, get a read-back and record it within ${ackWindowLabel}.`}
      total={critical.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search patient, report, doctor or ward"
      pills={pills}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="record read-back"
      onPrimary={() => requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-label="Critical call-back details"] input')?.focus())}
      detailLabel="Critical call-back"
      emptyText={pill === 'pending' && !q ? 'Every critical result has been acknowledged.' : undefined}
      renderDetail={renderDetail}
    />
  );
};

export default PathologistCallbacksView;
