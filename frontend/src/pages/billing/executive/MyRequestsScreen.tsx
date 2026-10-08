import React, { useCallback, useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle, Undo2, RefreshCw } from 'lucide-react';
import { billingService, RefundRequest, SupervisorApprovalRequest } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { useAuth } from '../../../context/AuthContext';
import { Btn, C, Callout, Empty, KpiCard, PageHeader, PillTabs, StatusChip, apiError, card, mono } from './executiveUi';

interface RequestRow {
  key: string;
  id: string;
  type: 'Discount' | 'Void' | 'Refund';
  /** Approved cash refund still to be paid out of a drawer */
  payable: boolean;
  number: string;
  detail: string;
  reason: string;
  decisionNote: string;
  patient: string;
  uhid: string;
  invoice: string;
  amount: number;
  status: string;
  at: string;
}

const isVoid = (a: SupervisorApprovalRequest) => a.request_type === 'INVOICE_VOID';

const approvalNote = (a: SupervisorApprovalRequest) => {
  if (a.status === 'REJECTED') return a.rejection_reason;
  if (a.status === 'ESCALATED') return `With Billing Admin${a.escalation_reason === 'SELF_RAISED' ? ' (raised by a supervisor)' : a.escalation_reason === 'SLA_BREACH' ? ' (unreviewed past SLA)' : ''}`;
  if (a.status !== 'APPROVED') return '';
  const by = `Approved by ${a.approvedByName || 'supervisor'}`;
  if (isVoid(a)) return `${by} · invoice cancelled, charges back in the queue`;
  const lowered = a.requested_discount_percent != null && Number(a.requested_discount_percent) !== Number(a.discount_percent)
    ? ` at ${Number(a.discount_percent)}% (asked ${Number(a.requested_discount_percent)}%)` : '';
  return `${by}${lowered}${a.invoiceNumber ? ' · used on ' + a.invoiceNumber : ' · ready to apply'}`;
};

const fromApproval = (a: SupervisorApprovalRequest): RequestRow => ({
  key: `a-${a.id}`,
  id: a.id,
  payable: false,
  type: isVoid(a) ? 'Void' : 'Discount',
  number: a.request_number,
  detail: isVoid(a) ? `Void ${a.invoiceNumber || 'invoice'}` : `${Number(a.discount_percent)}% on gross ${Number(a.bill_gross).toFixed(2)}`,
  reason: [a.reason, a.notes].filter(Boolean).join(' — '),
  decisionNote: approvalNote(a),
  patient: a.patientName,
  uhid: a.uhid || '',
  invoice: a.invoiceNumber || '',
  amount: isVoid(a) ? Number(a.requested_amount || 0) : Number(a.discount_amount),
  status: a.status,
  at: a.created_at
});

const fromRefund = (r: RefundRequest): RequestRow => ({
  key: `r-${r.id}`,
  id: r.id,
  payable: r.status === 'APPROVED' && (r.original_tender || 'CASH') === 'CASH',
  type: 'Refund',
  number: r.refundNumber,
  detail: r.status === 'DISBURSED'
    ? `Disbursed via ${r.disbursed_tender || '—'}${r.credit_note_number ? ' · ' + r.credit_note_number : ''}`
    : `Refund to original tender${r.original_tender ? ` (${r.original_tender})` : ''}`,
  reason: [r.reason, r.clinical_justification].filter(Boolean).join(' — '),
  decisionNote: r.status === 'REJECTED'
    ? r.rejection_reason || ''
    : r.status === 'ESCALATED'
      ? 'With Billing Admin'
      : r.status === 'APPROVED' && (r.original_tender || 'CASH') === 'CASH'
        ? `Approved by ${r.approvedByName || 'supervisor'} · pay the cash from your drawer`
        : r.approvedByName ? `Decided by ${r.approvedByName}` : '',
  patient: r.patientName || '',
  uhid: r.uhid || '',
  invoice: r.invoiceNumber || '',
  amount: Number(r.requested_amount),
  status: r.status === 'DISBURSED' ? 'APPROVED' : r.status === 'ESCALATED' ? 'PENDING' : r.status,
  at: r.created_at
});

export const MyRequestsScreen: React.FC<{ shiftOpen?: boolean }> = ({ shiftOpen = true }) => {
  const { format: fmt } = useCurrency();
  const [paying, setPaying] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const userId = useAuth().user?.id;
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [tab, setTab] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [approvals, refunds] = await Promise.all([
        billingService.getApprovalRequests({ mine: true }),
        billingService.getRefundRequests()
      ]);
      // Refund list is not scoped server-side; keep only the ones this cashier raised.
      const mine = (refunds || []).filter((r) => !userId || !r.initiated_by || String(r.initiated_by) === String(userId));
      setRows([...(approvals || []).map(fromApproval), ...mine.map(fromRefund)].sort((a, b) => b.at.localeCompare(a.at)));
    } catch (err) {
      setError(apiError(err, 'Could not load your requests.'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const payOut = async (r: RequestRow) => {
    setPaying(r.id);
    setError(null);
    try {
      const res = await billingService.payCashRefund(r.id);
      setNotice(`${r.number} paid · ${fmt(r.amount)} from your drawer · ${res.credit_note.credit_note_number}. Get the patient to sign the voucher.`);
      await load();
    } catch (err) {
      setError(apiError(err, 'Cash payout failed.'));
    } finally {
      setPaying(null);
    }
  };

  // Escalated requests are still waiting on a decision, so they count as pending here
  const statusOf = (r: RequestRow) => (r.status === 'ESCALATED' ? 'PENDING' : r.status);
  const count = (s: string) => rows.filter((r) => statusOf(r) === s).length;
  const shown = tab === 'ALL' ? rows : rows.filter((r) => statusOf(r) === tab);
  const pendingRefundValue = rows.filter((r) => r.type === 'Refund' && r.status === 'PENDING').reduce((t, r) => t + r.amount, 0);

  return (
    <>
      <PageHeader
        title="My Requests"
        subtitle="Discount, void and refund requests you raised, with supervisor decisions."
        actions={<Btn onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</Btn>}
      />
      {error && <div style={{ marginBottom: 12 }}><Callout tone="red">{error}</Callout></div>}
      {notice && <div style={{ marginBottom: 12 }}><Callout tone="green">{notice}</Callout></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <KpiCard label="Pending" value={count('PENDING')} sub="Awaiting supervisor" icon={<Clock size={16} />} trendColor={C.amber} />
        <KpiCard label="Approved" value={count('APPROVED')} sub="Ready or applied" icon={<CheckCircle2 size={16} />} />
        <KpiCard label="Rejected" value={count('REJECTED')} sub="See decision note" icon={<XCircle size={16} />} />
        <KpiCard label="Refunds in review" value={fmt(pendingRefundValue)} sub={`${rows.filter((r) => r.type === 'Refund' && r.status === 'PENDING').length} request(s)`} icon={<Undo2 size={16} />} />
      </div>

      <div style={{ ...card }}>
        <div style={{ padding: 14, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Requests</span>
          <PillTabs
            tabs={[
              { key: 'ALL', label: 'All', count: rows.length },
              { key: 'PENDING', label: 'Pending', count: count('PENDING') },
              { key: 'APPROVED', label: 'Approved', count: count('APPROVED') },
              { key: 'REJECTED', label: 'Rejected', count: count('REJECTED') }
            ]}
            active={tab}
            onPick={setTab}
          />
        </div>
        {loading && <Empty text="Loading requests…" />}
        {!loading && shown.length === 0 && <Empty text="Nothing here." />}
        {!loading &&
          shown.map((r) => (
            <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '84px minmax(220px,3fr) minmax(140px,1.5fr) 110px 110px', gap: 12, alignItems: 'center', padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: r.type === 'Refund' ? C.amber : r.type === 'Void' ? C.red : C.primary }}>{r.type}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 14 }}>{r.detail}</span>
                <span style={{ fontSize: 12, color: C.muted, ...mono }}>{r.number} · {new Date(r.at).toLocaleString()}</span>
                {r.reason && <span style={{ fontSize: 12, color: C.textSub }}>{r.reason}</span>}
                {r.decisionNote && <span style={{ fontSize: 12, color: r.status === 'REJECTED' ? C.red : C.green }}>{r.decisionNote}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 13 }}>{r.patient}</span>
                <span style={{ fontSize: 12, color: C.muted, ...mono }}>{r.invoice || r.uhid}</span>
              </div>
              <span style={{ fontSize: 14, textAlign: 'right', ...mono }}>{fmt(r.amount)}</span>
              {r.payable ? (
                <Btn
                  variant="primary"
                  style={{ height: 30, fontSize: 12 }}
                  disabled={!shiftOpen || paying === r.id}
                  title={shiftOpen ? 'Pay this approved refund in cash from your drawer' : 'Open your counter shift to pay out cash'}
                  onClick={() => payOut(r)}
                >
                  Pay from drawer
                </Btn>
              ) : (
                <StatusChip status={r.status} />
              )}
            </div>
          ))}
      </div>
    </>
  );
};
