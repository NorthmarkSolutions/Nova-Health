import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, CreditCard, QrCode, Landmark, FileCheck2, Wallet, Trash2, CheckCircle2, Unlock, Printer, X, Check } from 'lucide-react';
import { billingService, BillingInvoice, ClinicalUnlock } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { CashierReceiptModal } from '../cashier/CashierReceiptModal';
import {
  allocateTenders,
  buildSplitPayments,
  calculateChange,
  round2,
  tenderBlocker,
  TenderLine,
  TenderMode,
  TENDER_COLORS,
  TENDER_LABELS
} from './cashierMath';
import { Btn, C, Callout, Drawer, Field, Row, apiError, inputStyle, mono } from './executiveUi';

export type PaymentTarget =
  | {
      kind: 'charges';
      patient: string;
      chargeIds: string[];
      net: number;
      discountPercent?: number;
      discountReason?: string;
      approvalRequestId?: string;
      encounterType?: string;
    }
  | { kind: 'invoice'; invoiceId: string; invoiceNumber: string; balance: number }
  | { kind: 'draft'; draftId: string; draftNumber: string; total: number }
  | {
      kind: 'walkin';
      net: number;
      items: Array<{ service_code: string; qty: number }>;
      patient?: string;
      patientName?: string;
      phone?: string;
      gender?: string;
      discountPercent?: number;
      discountReason?: string;
    };

export interface SettlementResult {
  invoice: BillingInvoice;
  receiptToken: string;
  paidNow: number;
  remaining: number;
  unlocks: ClinicalUnlock[];
  note?: string;
}

const dueOf = (t: PaymentTarget) =>
  t.kind === 'invoice' ? t.balance : t.kind === 'draft' ? t.total : t.net;

const TENDER_ICONS: Record<TenderMode, React.ReactNode> = {
  CASH: <Banknote size={16} />,
  CARD: <CreditCard size={16} />,
  UPI: <QrCode size={16} />,
  NET_BANKING: <Landmark size={16} />,
  CHEQUE: <FileCheck2 size={16} />,
  DEPOSIT_DEDUCTION: <Wallet size={16} />
};

let lineSeq = 0;
const newLine = (mode: TenderMode, amount: number): TenderLine => ({
  id: `t${++lineSeq}`,
  mode,
  amount: amount > 0 ? String(round2(amount)) : '',
  cashReceived: '',
  reference: '',
  authCode: ''
});

interface Props {
  target: PaymentTarget;
  patientName: string;
  uhid: string;
  depositBalance: number;
  counterCode?: string;
  onClose: () => void;
  onSettled: (result: SettlementResult) => void;
}

export const PaymentCollectionDrawer: React.FC<Props> = ({ target: initialTarget, patientName, uhid, depositBalance, counterCode, onClose, onSettled }) => {
  const { format: fmt } = useCurrency();
  const [target, setTarget] = useState<PaymentTarget>(initialTarget);
  const amountDue = dueOf(target);
  const [lines, setLines] = useState<TenderLine[]>(() => [newLine('CASH', amountDue)]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrSent, setQrSent] = useState<Record<string, boolean>>({});

  const alloc = useMemo(() => allocateTenders(amountDue, lines), [amountDue, lines]);
  const depositUsed = lines.filter((l) => l.mode === 'DEPOSIT_DEDUCTION').reduce((t, l) => t + (parseFloat(l.amount) || 0), 0);
  const usedModes = lines.map((l) => l.mode);
  const addable = (['CASH', 'CARD', 'UPI', 'NET_BANKING', 'CHEQUE', 'DEPOSIT_DEDUCTION'] as TenderMode[]).filter(
    (m) => !usedModes.includes(m) && (m !== 'DEPOSIT_DEDUCTION' || depositBalance > 0)
  );

  const lineBlocker = lines.map(tenderBlocker).find(Boolean) || '';
  let blocker = '';
  if (amountDue <= 0) blocker = 'Nothing due';
  else if (alloc.isOver) blocker = `Over-allocated by ${fmt(-alloc.remaining)}`;
  else if (depositUsed > depositBalance + 0.004) blocker = `Advance deposit available is only ${fmt(depositBalance)}`;
  else if (lineBlocker) blocker = lineBlocker;
  else if (!alloc.isBalanced) blocker = `Remaining ${fmt(alloc.remaining)} to allocate`;
  const canPartial = !alloc.isBalanced && !alloc.isOver && alloc.allocated > 0 && !lineBlocker && depositUsed <= depositBalance + 0.004;

  const update = (id: string, patch: Partial<TenderLine>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const remove = (id: string) => setLines((ls) => ls.filter((l) => l.id !== id));
  const add = (mode: TenderMode) => {
    const rem = Math.max(0, alloc.remaining);
    const amount = mode === 'DEPOSIT_DEDUCTION' ? Math.min(rem, depositBalance) : rem;
    setLines((ls) => [...ls, newLine(mode, amount)]);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const split_payments = buildSplitPayments(lines);
    try {
      if (target.kind === 'charges') {
        const res = await billingService.cashierBillAndCollect({
          patient: target.patient,
          charge_ids: target.chargeIds,
          discount_percent: target.discountPercent || undefined,
          discount_reason: target.discountReason,
          approval_request_id: target.approvalRequestId,
          encounter_type: target.encounterType,
          split_payments,
          counter_code: counterCode
        });
        onSettled({
          invoice: res.invoice,
          receiptToken: res.payment?.receipt_token || '',
          paidNow: res.payment?.total_paid_now || 0,
          remaining: res.payment?.remaining_balance ?? Number(res.invoice.balance),
          unlocks: res.clinical_unlocks || []
        });
      } else if (target.kind === 'draft') {
        const res = await billingService.collectDraftInvoice(target.draftId, { split_payments, counter_code: counterCode });
        onSettled({
          invoice: res.invoice,
          receiptToken: res.payment?.receipt_token || '',
          paidNow: res.payment?.total_paid_now || 0,
          remaining: res.payment?.remaining_balance ?? Number(res.invoice.balance),
          unlocks: res.clinical_unlocks || [],
          note: `Draft ${target.draftNumber} finalised as ${res.invoice.invoice_number || res.invoice.invNo}.`
        });
      } else if (target.kind === 'walkin') {
        const res = await billingService.cashierQuickWalkin({
          items: target.items,
          split_payments,
          patient: target.patient,
          patient_name: target.patientName,
          phone: target.phone,
          gender: target.gender,
          discount_percent: target.discountPercent || undefined,
          discount_reason: target.discountReason,
          counter_code: counterCode
        });
        onSettled({
          invoice: res.invoice,
          receiptToken: res.receipt_token,
          paidNow: Number(res.total_paid_now),
          remaining: Number(res.remaining_balance),
          unlocks: [],
          note: target.patient ? undefined : `Walk-in registered as ${res.patient_uhid}.`
        });
      } else {
        const res = await billingService.processMultiTenderPayment({ invoice_id: target.invoiceId, split_payments, counter_code: counterCode });
        onSettled({
          invoice: res.invoice,
          receiptToken: res.receipt_token,
          paidNow: Number(res.total_paid_now),
          remaining: Number(res.remaining_balance),
          unlocks: []
        });
      }
    } catch (err: any) {
      const data = err?.response?.data;
      if (target.kind === 'charges' && data?.invoice?.id) {
        // Invoice was raised but the tender allocation was rejected: continue against the sealed invoice balance.
        const inv = data.invoice as BillingInvoice;
        const balance = Number(inv.balance);
        setTarget({ kind: 'invoice', invoiceId: inv.id, invoiceNumber: inv.invoice_number || inv.invNo, balance });
        setLines([newLine('CASH', balance)]);
        setError(`Invoice ${inv.invoice_number || inv.invNo} was raised for ${fmt(balance)}. Re-allocate tenders against this amount.`);
      } else if (err?.response?.status === 403 && data?.requires_approval) {
        setError(`Supervisor approval required — ${data.detail || 'discount exceeds the cashier ceiling.'}`);
      } else {
        setError(apiError(err, 'Payment could not be processed.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title="Collect payment"
      subtitle={
        <>
          {patientName} · <span style={mono}>{uhid}</span>
          {target.kind === 'invoice' && <> · <span style={mono}>{target.invoiceNumber}</span></>}
          {target.kind === 'draft' && <> · <span style={mono}>{target.draftNumber}</span></>}
          {target.kind === 'walkin' && <> · Walk-in</>}
        </>
      }
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: blocker ? C.amber : C.green }}>{blocker || 'Ready to issue receipt'}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={onClose}>Cancel</Btn>
            {canPartial && (
              <Btn onClick={submit} disabled={submitting}>
                Save partial · {fmt(alloc.allocated)}
              </Btn>
            )}
            <Btn variant="primary" onClick={submit} disabled={!!blocker || submitting}>
              {submitting ? 'Processing…' : 'Confirm & issue receipt'}
            </Btn>
          </div>
        </div>
      }
    >
      {error && <Callout tone="red">{error}</Callout>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 13, color: C.muted }}>Amount due</span>
            <span style={{ fontSize: 28, fontWeight: 600, ...mono }}>{fmt(amountDue)}</span>
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              padding: '4px 10px',
              borderRadius: 999,
              color: alloc.isBalanced ? C.green : alloc.isOver ? C.red : C.amber,
              background: alloc.isBalanced ? C.greenSoft : alloc.isOver ? C.redSoft : C.amberSoft
            }}
          >
            {alloc.isBalanced ? 'Fully allocated' : alloc.isOver ? `Over by ${fmt(-alloc.remaining)}` : `Remaining ${fmt(alloc.remaining)}`}
          </span>
        </div>
        <div aria-label="Tender allocation" style={{ display: 'flex', height: 10, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
          {alloc.segments.map((s, i) => (
            <div key={i} title={TENDER_LABELS[s.mode]} style={{ width: `${s.percent}%`, background: s.color }} />
          ))}
        </div>
      </div>

      {lines.map((l) => {
        const amount = parseFloat(l.amount) || 0;
        const change = l.mode === 'CASH' && l.cashReceived ? calculateChange(amount, parseFloat(l.cashReceived) || 0) : null;
        const hint = tenderBlocker(l);
        return (
          <div key={l.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: TENDER_COLORS[l.mode] }} />
              <span style={{ color: C.muted, display: 'flex' }}>{TENDER_ICONS[l.mode]}</span>
              <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{TENDER_LABELS[l.mode]}</span>
              {lines.length > 1 && (
                <button onClick={() => remove(l.id)} style={{ border: 'none', background: 'transparent', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                  <Trash2 size={14} /> Remove
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Field label="Amount" hint={l.mode === 'DEPOSIT_DEDUCTION' ? `Available ${fmt(depositBalance)}` : undefined}>
                <input style={{ ...inputStyle, ...mono }} inputMode="decimal" value={l.amount} onChange={(e) => update(l.id, { amount: e.target.value })} />
              </Field>
              {l.mode === 'CASH' && (
                <Field label="Cash received">
                  <input style={{ ...inputStyle, ...mono }} inputMode="decimal" placeholder="0.00" value={l.cashReceived} onChange={(e) => update(l.id, { cashReceived: e.target.value })} />
                </Field>
              )}
              {l.mode === 'CARD' && (
                <>
                  <Field label="Terminal TID">
                    <input style={inputStyle} placeholder="EDC-01" value={l.reference} onChange={(e) => update(l.id, { reference: e.target.value })} />
                  </Field>
                  <Field label="Auth code">
                    <input style={{ ...inputStyle, ...mono }} placeholder="6 digits" maxLength={6} value={l.authCode} onChange={(e) => update(l.id, { authCode: e.target.value.replace(/\D/g, '') })} />
                  </Field>
                </>
              )}
              {l.mode === 'UPI' && (
                <Field label="UTR / reference">
                  <input style={{ ...inputStyle, ...mono }} placeholder="12 digits" maxLength={12} value={l.reference} onChange={(e) => update(l.id, { reference: e.target.value.replace(/\D/g, '') })} />
                </Field>
              )}
              {(l.mode === 'NET_BANKING' || l.mode === 'CHEQUE') && (
                <Field label={l.mode === 'CHEQUE' ? 'Cheque number' : 'Bank reference'}>
                  <input style={inputStyle} value={l.reference} onChange={(e) => update(l.id, { reference: e.target.value })} />
                </Field>
              )}
            </div>
            {hint && <span style={{ fontSize: 12, color: C.amber }}>{hint}</span>}
            {l.mode === 'UPI' && (
              <Btn style={{ alignSelf: 'flex-start', height: 32, fontSize: 13 }} onClick={() => setQrSent((s) => ({ ...s, [l.id]: true }))}>
                <QrCode size={14} /> {qrSent[l.id] ? `QR shown for ${fmt(amount)} · enter UTR once paid` : 'Show UPI QR on customer display'}
              </Btn>
            )}
            {change && (
              <div style={{ background: change.sufficient ? C.greenSoft : C.amberSoft, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {change.sufficient ? (
                  <>
                    <Row label="Change to return" value={fmt(change.change)} strong color={C.green} />
                    {change.denominations.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {change.denominations.map((d) => (
                          <span key={d.denomination} style={{ fontSize: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '2px 8px', ...mono }}>
                            ₹{d.denomination} × {d.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Row label="Short by" value={fmt(change.shortfall)} strong color={C.amber} />
                )}
              </div>
            )}
          </div>
        );
      })}

      {addable.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 13, color: C.muted }}>Add tender</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {addable.map((m) => (
              <Btn key={m} style={{ height: 34, fontSize: 13 }} onClick={() => add(m)}>
                {TENDER_ICONS[m]} {TENDER_LABELS[m]}
              </Btn>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  );
};

/** Post-settlement confirmation: receipt numbers, clinical unlocks and print. */
export const SettlementResultModal: React.FC<{ result: SettlementResult; onDone: () => void }> = ({ result, onDone }) => {
  const { format: fmt } = useCurrency();
  const [printing, setPrinting] = useState(false);
  const inv = result.invoice;
  const settled = result.remaining <= 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDone();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDone]);

  if (printing) return <CashierReceiptModal invoiceId={inv.id} onClose={() => setPrinting(false)} />;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17,24,39,0.4)', padding: 16 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onDone();
      }}
    >
      <div style={{ background: C.surface, borderRadius: 16, width: 'min(440px, 100%)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={22} color={settled ? C.green : C.amber} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>{settled ? 'Payment recorded' : 'Partial payment recorded'}</span>
          </div>
          <button
            onClick={onDone}
            aria-label="Close"
            title="Close (Esc)"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#111827';
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6b7280';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Row label="Invoice" value={inv.invoice_number || inv.invNo} />
          <Row label="Receipt" value={result.receiptToken || '—'} />
          <Row label="Collected now" value={fmt(result.paidNow)} />
          {!settled && <Row label="Balance outstanding" value={fmt(result.remaining)} color={C.amber} />}
          <Row label="Status" value={inv.status} strong />
        </div>
        {result.note && <Callout tone="neutral">{result.note}</Callout>}
        {result.unlocks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {result.unlocks.map((u, i) => (
              <Callout key={i} tone="green" icon={<Unlock size={16} />}>
                {u.message}
              </Callout>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn style={{ flex: 1 }} onClick={() => setPrinting(true)}>
            <Printer size={16} /> Print receipt
          </Btn>
          <Btn variant="primary" style={{ flex: 1 }} onClick={onDone}>
            <Check size={16} /> Done / Close
          </Btn>
        </div>
      </div>
    </div>
  );
};
