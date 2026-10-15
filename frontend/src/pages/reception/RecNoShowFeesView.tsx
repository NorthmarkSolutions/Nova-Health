// Front Desk — fees on visits that ended as no-show or were cancelled after payment. The front office supervisor
// decides each one under the hospital policy: refund (Accounts approves, then the cash is handed back), carry the fee
// to a rescheduled visit, or retain it under the no-show policy. Receptionists see the list; only the supervisor decides.
import React, { useCallback, useEffect, useState } from 'react';
import { BadgeIndianRupee, CheckCircle2, Undo2 } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsField, INPUT, TEXTAREA } from '../../components/hms';
import api from '../../services/api';
import { opdApiMode } from '../../services/opdService';
import { useCurrency } from '../../config/currency';
import { DeskActions, MONO, fmtDate } from './receptionData';

interface FeeReview {
  id: string; visitNumber: string; date: string; patient: string; uhid: string; doctor: string; amount: number;
  paidAt: 'FRONT_DESK' | 'CASHIER'; outcome: 'NO_SHOW' | 'CANCELLED'; reason: string; status: string; decision: string;
  note: string; refundMode: string; refundReference: string; decidedBy: string; decidedAt: string | null; creditUsedBy: string | null;
}

const REASONS: Array<{ key: string; label: string; hint: string }> = [
  { key: 'ADVANCE_NOTICE', label: 'Patient informed in advance', hint: 'Consider a refund or a rescheduled visit.' },
  { key: 'NO_NOTICE', label: 'Missed without notice', hint: 'Apply the hospital no-show policy.' },
  { key: 'EMERGENCY', label: 'Medical emergency / exceptional', hint: 'Supervisor review — refund or reschedule as appropriate.' },
  { key: 'BILLING_ERROR', label: 'Duplicate payment / billing error', hint: 'Corrected through a refund.' },
  { key: 'OTHER', label: 'Other', hint: 'Record the circumstances in the note.' },
];
const DECISIONS: Array<{ key: string; label: string }> = [
  { key: 'REFUND', label: 'Refund the fee' },
  { key: 'RESCHEDULE', label: 'Carry the fee to a rescheduled visit' },
  { key: 'RETAIN', label: 'Retain under the no-show policy' },
];
const PILLS = ['PENDING', 'refund', 'DONE', 'all'];

const statusBadge = (r: FeeReview) =>
  r.status === 'PENDING' ? <HmsBadge tone="amber">To decide</HmsBadge>
    : r.decision === 'REFUND' && r.status === 'DECIDED' && r.paidAt === 'FRONT_DESK' ? <HmsBadge tone="blue">Refund to hand back</HmsBadge>
      : r.decision === 'REFUND' ? <HmsBadge tone="gray">Refunded</HmsBadge>
        : r.decision === 'RESCHEDULE' ? <HmsBadge tone={r.creditUsedBy ? 'gray' : 'green'}>{r.creditUsedBy ? 'Credit used' : 'Credit open'}</HmsBadge>
          : <HmsBadge tone="gray">Retained</HmsBadge>;

export const RecNoShowFeesView: React.FC<{ act: DeskActions & { supervisor?: boolean }; initialFilter?: string }> = ({ act, initialFilter }) => {
  const { format } = useCurrency();
  const [reviews, setReviews] = useState<FeeReview[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'PENDING');
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ reason: '', decision: '', note: '', mode: 'CASH' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!opdApiMode()) return setLoaded(true);
    api.get<{ reviews: FeeReview[] }>('/opd/fee-reviews/').then((r) => setReviews(r.data.reviews)).catch(() => act.notify('Could not load the no-show fees', 'error')).finally(() => setLoaded(true));
  }, [act]);
  useEffect(() => {
    load();
    window.addEventListener('nh_data_sync', load);
    return () => window.removeEventListener('nh_data_sync', load);
  }, [load]);

  const toHandBack = (r: FeeReview) => r.decision === 'REFUND' && r.status === 'DECIDED' && r.paidAt === 'FRONT_DESK';
  const match = (r: FeeReview, p: string) => (p === 'PENDING' ? r.status === 'PENDING' : p === 'refund' ? toHandBack(r) : p === 'DONE' ? r.status !== 'PENDING' && !toHandBack(r) : true);
  const q = search.trim().toLowerCase();
  const list = reviews.filter((r) => match(r, pill) && (!q || [r.patient, r.uhid, r.visitNumber, r.doctor].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = list.map((r) => ({
    key: `r:${r.id}`,
    title: r.patient,
    badge: statusBadge(r),
    sub: <><span style={MONO}>{r.uhid}</span> · {r.doctor}</>,
    metaLeft: `${r.outcome === 'NO_SHOW' ? 'No-show' : 'Cancelled'} · ${fmtDate(r.date)}`,
    metaRight: format(r.amount),
  }));

  const post = async (path: string, body: object, msg: string) => {
    setBusy(true);
    try {
      await api.post(path, body);
      act.notify(msg);
      setForm({ reason: '', decision: '', note: '', mode: 'CASH' });
      load();
    } catch (err) {
      const d = (err as { response?: { data?: Record<string, unknown> } }).response?.data;
      const first = d ? Object.values(d)[0] : null;
      act.notify(typeof first === 'string' ? first : Array.isArray(first) ? String(first[0]) : 'The decision was not saved', 'error');
    } finally {
      setBusy(false);
    }
  };

  const renderDetail = (key: string | null) => {
    const r = reviews.find((x) => `r:${x.id}` === key);
    if (!r) return <HmsEmpty>{reviews.length ? 'Select a fee from the list.' : 'No paid visit has ended as a no-show.'}</HmsEmpty>;
    const reason = REASONS.find((x) => x.key === (r.reason || form.reason));
    const needNote = form.decision && form.decision !== 'RETAIN';
    const ready = !!form.reason && !!form.decision && (!needNote || form.note.trim().length >= 3) && !(form.reason === 'BILLING_ERROR' && form.decision !== 'REFUND');
    return (
      <>
        <HmsDetailHeader icon={BadgeIndianRupee} title={r.patient} badge={statusBadge(r)} subtitle={<><span style={MONO}>{r.uhid}</span> · {r.visitNumber}</>} />
        <HmsStatStrip
          items={[
            { label: 'Fee', value: format(r.amount) },
            { label: 'Paid at', value: r.paidAt === 'FRONT_DESK' ? 'Front desk' : 'Cash counter' },
            { label: 'Visit', value: r.outcome === 'NO_SHOW' ? 'No-show' : 'Cancelled', tone: 'amber' },
            { label: 'Doctor', value: r.doctor || '—' },
          ]}
        />
        <HmsDetailBody>
          {r.status === 'PENDING' && (
            <>
              <HmsNotice tone="blue">If the patient has now arrived, use “Patient arrived — back to the queue” on the live queue instead: a late arrival is seen and no refund is due.</HmsNotice>
              {!act.supervisor && <HmsNotice tone="amber">The front office supervisor decides this fee.</HmsNotice>}
              {act.supervisor && (
                <HmsSection title="Supervisor decision">
                  <HmsField label="Why the patient did not attend" htmlFor="ns-reason" hint={reason?.hint}>
                    <select id="ns-reason" style={INPUT} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value, decision: e.target.value === 'BILLING_ERROR' ? 'REFUND' : form.decision })}>
                      <option value="">Choose…</option>
                      {REASONS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                    </select>
                  </HmsField>
                  <HmsField label="Decision" htmlFor="ns-decision">
                    <select id="ns-decision" style={INPUT} value={form.decision} onChange={(e) => setForm({ ...form, decision: e.target.value })}>
                      <option value="">Choose…</option>
                      {DECISIONS.filter((x) => form.reason !== 'BILLING_ERROR' || x.key === 'REFUND').map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                    </select>
                  </HmsField>
                  {form.decision === 'REFUND' && (
                    <HmsField label="Refund by" htmlFor="ns-mode">
                      <select id="ns-mode" style={INPUT} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="CARD">Card reversal</option>
                      </select>
                    </HmsField>
                  )}
                  <HmsField label={needNote ? 'Note (required)' : 'Note'} htmlFor="ns-note">
                    <textarea id="ns-note" style={TEXTAREA} rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Called at 09:10 to cancel" />
                  </HmsField>
                </HmsSection>
              )}
            </>
          )}
          {r.status !== 'PENDING' && (
            <HmsSection title="Decision">
              <HmsRow label="Reason" value={REASONS.find((x) => x.key === r.reason)?.label || '—'} />
              <HmsRow label="Decision" value={DECISIONS.find((x) => x.key === r.decision)?.label || '—'} />
              {r.refundReference && <HmsRow label="Refund reference" value={<span style={MONO}>{r.refundReference}</span>} />}
              {r.creditUsedBy && <HmsRow label="Credit used on" value={<span style={MONO}>{r.creditUsedBy}</span>} />}
              <HmsRow label="Note" value={r.note || '—'} />
              <HmsRow label="Decided by" value={`${r.decidedBy || '—'}${r.decidedAt ? ` · ${new Date(r.decidedAt).toLocaleString()}` : ''}`} last />
            </HmsSection>
          )}
          {toHandBack(r) && <HmsNotice tone="blue">Accounts approves the refund first. Hand the money back only after the approval; the desk records it here.</HmsNotice>}
          {r.decision === 'RESCHEDULE' && !r.creditUsedBy && <HmsNotice tone="green">The next token issued to this patient uses this fee — no new charge.</HmsNotice>}
        </HmsDetailBody>
        {act.supervisor && (r.status === 'PENDING' || toHandBack(r)) && (
          <HmsDetailFooter>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', width: '100%' }}>
              {r.status === 'PENDING' ? (
                <HmsButton variant="primary" icon={CheckCircle2} block disabled={!ready || busy}
                  onClick={() => void post(`/opd/fee-reviews/${r.id}/decide/`, { reason: form.reason, decision: form.decision, note: form.note.trim(), refund_mode: form.mode }, `${r.patient}: ${DECISIONS.find((x) => x.key === form.decision)?.label.toLowerCase()}`)}>
                  Save decision
                </HmsButton>
              ) : (
                <HmsButton variant="primary" icon={Undo2} block disabled={busy}
                  onClick={() => void post(`/opd/fee-reviews/${r.id}/refund-paid/`, {}, `${format(r.amount)} handed back to ${r.patient}`)}>
                  Refund handed back
                </HmsButton>
              )}
            </div>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  if (!opdApiMode()) return <HmsEmpty>No-show fee decisions need the hospital server. Sign in with your hospital account.</HmsEmpty>;
  return (
    <HmsMasterDetail
      listId="rec-noshow-fees"
      title="No-show fees"
      description="Paid visits that ended as a no-show or were cancelled. The supervisor refunds, carries forward or retains each fee."
      total={reviews.length}
      rows={loaded ? rows : []}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search patient, UHID, visit or doctor"
      pills={[
        { key: 'PENDING', label: 'To decide', count: reviews.filter((r) => r.status === 'PENDING').length, tone: 'amber' },
        { key: 'refund', label: 'Refund to hand back', count: reviews.filter(toHandBack).length },
        { key: 'DONE', label: 'Settled', count: reviews.filter((r) => match(r, 'DONE')).length },
        { key: 'all', label: 'All', count: reviews.length },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
        setForm({ reason: '', decision: '', note: '', mode: 'CASH' });
      }}
      selectedKey={selected}
      onSelect={(k) => {
        setSelected(k);
        setForm({ reason: '', decision: '', note: '', mode: 'CASH' });
      }}
      primaryLabel="decide"
      detailLabel="Fee"
      emptyText={loaded ? 'No fees match this search or filter.' : 'Loading…'}
      renderDetail={renderDetail}
    />
  );
};
