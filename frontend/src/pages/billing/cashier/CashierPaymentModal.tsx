// Billing · Cashier — take a payment (HMS modal). Same rules as the server: multi-tender split, card/UPI/cheque references,
// cash change, advance-deposit cap, partial payment; then the settlement result with receipt print and clinical unlocks.
import React, { useMemo, useState } from 'react';
import { Banknote, CreditCard, QrCode, Landmark, FileCheck2, Wallet, Trash2, Printer, Unlock, CheckCircle2 } from 'lucide-react';
import { HmsModal, HmsButton, HmsField, HmsNotice, HmsSection, HmsRow, HmsBadge, INPUT, HMS } from '../../../components/hms';
import { billingService, BillingInvoice, ClinicalUnlock } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { CashierReceiptModal } from './CashierReceiptModal';
import { allocateTenders, buildSplitPayments, calculateChange, round2, tenderBlocker, TenderLine, TenderMode, TENDER_COLORS, TENDER_LABELS } from '../executive/cashierMath';

export type CashierPayTarget =
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

export interface CashierSettlement {
  invoice: BillingInvoice;
  receiptToken: string;
  paidNow: number;
  remaining: number;
  unlocks: ClinicalUnlock[];
  note?: string;
}

const dueOf = (t: CashierPayTarget) => (t.kind === 'invoice' ? t.balance : t.kind === 'draft' ? t.total : t.net);
const ICONS: Record<TenderMode, typeof Banknote> = { CASH: Banknote, CARD: CreditCard, UPI: QrCode, NET_BANKING: Landmark, CHEQUE: FileCheck2, DEPOSIT_DEDUCTION: Wallet };
const ALL_TENDERS: TenderMode[] = ['CASH', 'CARD', 'UPI', 'NET_BANKING', 'CHEQUE', 'DEPOSIT_DEDUCTION'];

let seq = 0;
const newLine = (mode: TenderMode, amount: number): TenderLine => ({ id: `t${++seq}`, mode, amount: amount > 0 ? String(round2(amount)) : '', cashReceived: '', reference: '', authCode: '' });

export const CashierPaymentModal: React.FC<{
  target: CashierPayTarget;
  patientName: string;
  uhid: string;
  depositBalance: number;
  counterCode?: string;
  onClose: () => void;
  onSettled: (r: CashierSettlement) => void;
}> = ({ target: initial, patientName, uhid, depositBalance, counterCode, onClose, onSettled }) => {
  const { format } = useCurrency();
  const [target, setTarget] = useState<CashierPayTarget>(initial);
  const due = dueOf(target);
  const [lines, setLines] = useState<TenderLine[]>(() => [newLine('CASH', due)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alloc = useMemo(() => allocateTenders(due, lines), [due, lines]);
  const depositUsed = lines.filter((l) => l.mode === 'DEPOSIT_DEDUCTION').reduce((t, l) => t + (parseFloat(l.amount) || 0), 0);
  const addable = ALL_TENDERS.filter((m) => !lines.some((l) => l.mode === m) && (m !== 'DEPOSIT_DEDUCTION' || depositBalance > 0));
  const lineBlocker = lines.map(tenderBlocker).find(Boolean) || '';
  let blocker = '';
  if (due <= 0) blocker = 'Nothing due';
  else if (alloc.isOver) blocker = `Over-allocated by ${format(-alloc.remaining)}`;
  else if (depositUsed > depositBalance + 0.004) blocker = `Advance deposit available is only ${format(depositBalance)}`;
  else if (lineBlocker) blocker = lineBlocker;
  else if (!alloc.isBalanced) blocker = `${format(alloc.remaining)} still to allocate`;
  const canPartial = !alloc.isBalanced && !alloc.isOver && alloc.allocated > 0 && !lineBlocker && depositUsed <= depositBalance + 0.004;

  const update = (id: string, patch: Partial<TenderLine>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const add = (mode: TenderMode) => {
    const rem = Math.max(0, alloc.remaining);
    setLines((ls) => [...ls, newLine(mode, mode === 'DEPOSIT_DEDUCTION' ? Math.min(rem, depositBalance) : rem)]);
  };

  const submit = async () => {
    setBusy(true);
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
          counter_code: counterCode,
        });
        onSettled({ invoice: res.invoice, receiptToken: res.payment?.receipt_token || '', paidNow: res.payment?.total_paid_now || 0, remaining: res.payment?.remaining_balance ?? Number(res.invoice.balance), unlocks: res.clinical_unlocks || [] });
      } else if (target.kind === 'draft') {
        const res = await billingService.collectDraftInvoice(target.draftId, { split_payments, counter_code: counterCode });
        onSettled({
          invoice: res.invoice,
          receiptToken: res.payment?.receipt_token || '',
          paidNow: res.payment?.total_paid_now || 0,
          remaining: res.payment?.remaining_balance ?? Number(res.invoice.balance),
          unlocks: res.clinical_unlocks || [],
          note: `Draft ${target.draftNumber} finalised as ${res.invoice.invoice_number || res.invoice.invNo}.`,
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
          counter_code: counterCode,
        });
        onSettled({ invoice: res.invoice, receiptToken: res.receipt_token, paidNow: Number(res.total_paid_now), remaining: Number(res.remaining_balance), unlocks: [], note: target.patient ? undefined : `Walk-in registered as ${res.patient_uhid}.` });
      } else {
        const res = await billingService.processMultiTenderPayment({ invoice_id: target.invoiceId, split_payments, counter_code: counterCode });
        onSettled({ invoice: res.invoice, receiptToken: res.receipt_token, paidNow: Number(res.total_paid_now), remaining: Number(res.remaining_balance), unlocks: [] });
      }
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { invoice?: BillingInvoice; requires_approval?: boolean; detail?: string } } };
      const data = e?.response?.data;
      if (target.kind === 'charges' && data?.invoice?.id) {
        // The invoice was raised but the tenders were refused: continue against the sealed invoice balance
        const inv = data.invoice;
        const balance = Number(inv.balance);
        setTarget({ kind: 'invoice', invoiceId: inv.id, invoiceNumber: inv.invoice_number || inv.invNo, balance });
        setLines([newLine('CASH', balance)]);
        setError(`Invoice ${inv.invoice_number || inv.invNo} was raised for ${format(balance)}. Allocate the tenders against this amount.`);
      } else if (e?.response?.status === 403 && data?.requires_approval) {
        setError(`Supervisor approval required — ${data.detail || 'the discount is above the cashier ceiling.'}`);
      } else {
        setError(apiError(err, 'The payment could not be processed.'));
      }
    } finally {
      setBusy(false);
    }
  };

  const ref =
    target.kind === 'invoice' ? ` · ${target.invoiceNumber}` : target.kind === 'draft' ? ` · ${target.draftNumber}` : target.kind === 'walkin' ? ' · Walk-in' : '';

  return (
    <HmsModal
      title={`Take payment · ${format(due)}`}
      description={`${patientName} · ${uhid}${ref}`}
      onClose={onClose}
      busy={busy}
      width={640}
      footer={
        <>
          <span style={{ marginRight: 'auto', fontSize: '13px', color: blocker ? '#b45309' : '#15803d' }}>{blocker || 'Ready to issue the receipt'}</span>
          <HmsButton onClick={onClose} disabled={busy}>
            Cancel
          </HmsButton>
          {canPartial && (
            <HmsButton onClick={submit} disabled={busy}>
              Save part payment · {format(alloc.allocated)}
            </HmsButton>
          )}
          <HmsButton variant="primary" icon={CheckCircle2} onClick={submit} disabled={!!blocker || busy}>
            {busy ? 'Processing…' : 'Confirm & issue receipt'}
          </HmsButton>
        </>
      }
    >
      {error && <HmsNotice tone="red">{error}</HmsNotice>}
      <div aria-label="Tender allocation" role="img" style={{ display: 'flex', height: '8px', borderRadius: '4px', background: HMS.divider, overflow: 'hidden' }}>
        {alloc.segments.map((s, i) => (
          <div key={i} title={TENDER_LABELS[s.mode]} style={{ width: `${s.percent}%`, background: s.color }} />
        ))}
      </div>
      {lines.map((l) => {
        const Icon = ICONS[l.mode];
        const amount = parseFloat(l.amount) || 0;
        const change = l.mode === 'CASH' && l.cashReceived ? calculateChange(amount, parseFloat(l.cashReceived) || 0) : null;
        const hint = tenderBlocker(l);
        return (
          <HmsSection
            key={l.id}
            title={TENDER_LABELS[l.mode]}
            right={
              lines.length > 1 ? (
                <HmsButton size="sm" variant="ghost" icon={Trash2} onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))} aria-label={`Remove ${TENDER_LABELS[l.mode]}`}>
                  Remove
                </HmsButton>
              ) : (
                <Icon size={16} color={TENDER_COLORS[l.mode]} aria-hidden />
              )
            }
            padded
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              <HmsField label="Amount" hint={l.mode === 'DEPOSIT_DEDUCTION' ? `Available ${format(depositBalance)}` : undefined}>
                <input style={INPUT} inputMode="decimal" value={l.amount} onChange={(e) => update(l.id, { amount: e.target.value })} />
              </HmsField>
              {l.mode === 'CASH' && (
                <HmsField label="Cash received" hint="For the change calculation">
                  <input style={INPUT} inputMode="decimal" placeholder="0.00" value={l.cashReceived} onChange={(e) => update(l.id, { cashReceived: e.target.value })} />
                </HmsField>
              )}
              {l.mode === 'CARD' && (
                <>
                  <HmsField label="Terminal TID">
                    <input style={INPUT} placeholder="EDC-01" value={l.reference} onChange={(e) => update(l.id, { reference: e.target.value })} />
                  </HmsField>
                  <HmsField label="Auth code">
                    <input style={INPUT} placeholder="6 digits" maxLength={6} value={l.authCode} onChange={(e) => update(l.id, { authCode: e.target.value.replace(/\D/g, '') })} />
                  </HmsField>
                </>
              )}
              {l.mode === 'UPI' && (
                <HmsField label="UTR / reference">
                  <input style={INPUT} placeholder="12 digits" maxLength={12} value={l.reference} onChange={(e) => update(l.id, { reference: e.target.value.replace(/\D/g, '') })} />
                </HmsField>
              )}
              {(l.mode === 'NET_BANKING' || l.mode === 'CHEQUE') && (
                <HmsField label={l.mode === 'CHEQUE' ? 'Cheque number' : 'Bank reference'}>
                  <input style={INPUT} value={l.reference} onChange={(e) => update(l.id, { reference: e.target.value })} />
                </HmsField>
              )}
            </div>
            {hint && <div style={{ marginTop: '8px', fontSize: '12px', color: '#b45309' }}>{hint}</div>}
            {change &&
              (change.sufficient ? (
                <div style={{ marginTop: '10px' }}>
                  <HmsNotice tone="green">
                    Return {format(change.change)}
                    {change.denominations.length ? ` · ${change.denominations.map((d) => `₹${d.denomination} × ${d.count}`).join(', ')}` : ''}
                  </HmsNotice>
                </div>
              ) : (
                <div style={{ marginTop: '10px' }}>
                  <HmsNotice tone="amber">Short by {format(change.shortfall)}</HmsNotice>
                </div>
              ))}
          </HmsSection>
        );
      })}
      {addable.length > 0 && (
        <HmsField label="Add another tender">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {addable.map((m) => (
              <HmsButton key={m} size="sm" icon={ICONS[m]} onClick={() => add(m)}>
                {TENDER_LABELS[m]}
              </HmsButton>
            ))}
          </div>
        </HmsField>
      )}
    </HmsModal>
  );
};

/** After a payment: invoice, receipt, balance, clinical unlocks and print. */
export const CashierSettlementModal: React.FC<{ result: CashierSettlement; onDone: () => void }> = ({ result, onDone }) => {
  const { format } = useCurrency();
  const [printing, setPrinting] = useState(false);
  const inv = result.invoice;
  const settled = result.remaining <= 0;
  if (printing) return <CashierReceiptModal invoiceId={inv.id} onClose={() => setPrinting(false)} />;
  return (
    <HmsModal
      title={settled ? 'Payment recorded' : 'Part payment recorded'}
      description={`${inv.patientName || ''} · ${inv.invoice_number || inv.invNo}`}
      onClose={onDone}
      footer={
        <>
          <HmsButton icon={Printer} onClick={() => setPrinting(true)}>
            Print receipt
          </HmsButton>
          <HmsButton variant="primary" icon={CheckCircle2} onClick={onDone} data-autofocus>
            Done
          </HmsButton>
        </>
      }
    >
      <HmsSection title="Receipt">
        <HmsRow label="Invoice" value={inv.invoice_number || inv.invNo} />
        <HmsRow label="Receipt" value={result.receiptToken || '—'} />
        <HmsRow label="Collected now" value={<strong>{format(result.paidNow)}</strong>} />
        {!settled && <HmsRow label="Still outstanding" value={<HmsBadge tone="amber">{format(result.remaining)}</HmsBadge>} />}
        <HmsRow label="Status" value={<HmsBadge tone={settled ? 'green' : 'amber'}>{settled ? 'Paid' : 'Partly paid'}</HmsBadge>} last />
      </HmsSection>
      {result.note && <HmsNotice tone="blue">{result.note}</HmsNotice>}
      {result.unlocks.map((u, i) => (
        <HmsNotice key={i} tone="green">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Unlock size={16} aria-hidden /> {u.message}
          </span>
        </HmsNotice>
      ))}
    </HmsModal>
  );
};
