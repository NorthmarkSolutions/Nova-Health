// Billing · Cashier — receipts & invoices issued at the counter: items, payments, receipts; reprint a duplicate,
// ask the supervisor to void an unpaid invoice or approve a refund.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Receipt, Printer, Ban, Undo2, CheckSquare, Square } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, HmsTone, INPUT, TEXTAREA, HMS } from '../../../components/hms';
import { billingService, BillingInvoice, BillingReceiptRecord } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { TENDER_LABELS, TenderMode } from '../executive/cashierMath';
import { CashierReceiptModal } from './CashierReceiptModal';
import { deptName } from './cashierDeskData';

export interface CashierReceiptsViewProps {
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
  onChanged: () => void;
}

const RANGES: [string, number | null][] = [
  ['Today', 0],
  ['Last 7 days', 7],
  ['Last 30 days', 30],
  ['All', null],
];
const REFUND_REASONS = ['Test cancelled by doctor', 'Doctor unavailable', 'Duplicate billing', 'Service not rendered'];
const VOID_REASONS = ['Wrong patient', 'Duplicate invoice', 'Billed in error', 'Patient left before service'];
const STATUS_TONE: Record<string, HmsTone> = { PAID: 'green', PARTIALLY_PAID: 'amber', UNPAID: 'red', REFUNDED: 'gray', CANCELLED: 'gray' };
const STATUS_LABEL: Record<string, string> = { PAID: 'Paid', PARTIALLY_PAID: 'Part paid', UNPAID: 'Unpaid', REFUNDED: 'Refunded', CANCELLED: 'Cancelled', INSURANCE_PENDING: 'With insurer', CORPORATE_PENDING: 'With corporate', CREDIT_AUTHORIZED: 'On credit' };
const PILLS = ['all', 'PAID', 'PARTIALLY_PAID', 'UNPAID', 'REFUNDED'];
const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px' };
const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString('en-CA');
};
const tenderText = (inv: BillingInvoice) => {
  const modes = Array.from(new Set((inv.payments || []).map((p: { tenderMode?: string; paymentMethod?: string }) => p.tenderMode || p.paymentMethod)));
  return modes.length ? modes.map((m) => TENDER_LABELS[m as TenderMode] || m).join(' + ') : '—';
};

export const CashierReceiptsView: React.FC<CashierReceiptsViewProps> = ({ notify, initialFilter, initialSelect, onChanged }) => {
  const { format } = useCurrency();
  const [range, setRange] = useState(0);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [receipts, setReceipts] = useState<BillingReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `i:${initialSelect}` : null);
  const [printId, setPrintId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [voidDraft, setVoidDraft] = useState<{ reason: string; note: string; error?: string } | null>(null);
  const [refundDraft, setRefundDraft] = useState<{ items: Set<number>; reason: string; note: string; error?: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const days = RANGES[range][1];
      const [inv, rc] = await Promise.all([billingService.getInvoices(days == null ? undefined : { start_date: isoDaysAgo(days) }), billingService.getBillingReceipts()]);
      // Drafts are not fiscal documents; they stay on the patient's account
      setInvoices([...(inv || [])].filter((i) => i.status !== 'DRAFT').sort((a, b) => String(b.created_at || b.date).localeCompare(String(a.created_at || a.date))));
      setReceipts(rc || []);
      setFailed(null);
    } catch (e) {
      setFailed(apiError(e, 'Invoices could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const byInvoice = useMemo(() => {
    const m: Record<string, BillingReceiptRecord[]> = {};
    for (const r of receipts) (m[r.invoice] = m[r.invoice] || []).push(r);
    return m;
  }, [receipts]);

  const q = search.trim().toLowerCase();
  const searched = invoices.filter((i) => !q || [i.invoice_number, i.invNo, i.patientName, i.uhid, i.phone, ...(byInvoice[i.id] || []).map((r) => r.receipt_number)].some((v) => (v || '').toLowerCase().includes(q)));
  const visible = pill === 'all' ? searched : searched.filter((i) => i.status === pill);

  const rows: HmsListRow[] = visible.map((i) => ({
    key: `i:${i.invoice_number || i.invNo}`,
    title: i.patientName || '—',
    badge: <HmsBadge tone={STATUS_TONE[i.status] || 'blue'}>{STATUS_LABEL[i.status] || i.status}</HmsBadge>,
    sub: `${i.invoice_number || i.invNo} · ${i.uhid || ''}`,
    metaLeft: `${String(i.date)} · ${deptName(i.category)} · ${tenderText(i)}`,
    metaRight: format(Number(i.total)),
  }));

  const activeKey = rows.find((r) => r.key === selected)?.key ?? rows[0]?.key ?? null;
  const inv = activeKey ? invoices.find((i) => `i:${i.invoice_number || i.invNo}` === activeKey) : undefined;
  const paid = inv ? Number(inv.paid) : 0;
  const canVoid = !!inv && inv.status === 'UNPAID' && paid <= 0;
  const canRefund = !!inv && paid > 0 && inv.status !== 'REFUNDED' && inv.status !== 'CANCELLED';

  const sendVoid = async () => {
    if (!inv || !voidDraft) return;
    if (!voidDraft.reason) return setVoidDraft({ ...voidDraft, error: 'Choose a reason.' });
    setBusy(true);
    try {
      const req = await billingService.requestInvoiceVoid(inv.id, { reason: voidDraft.reason, notes: voidDraft.note.trim() || undefined });
      notify(`${req.request_number} sent to the Billing Supervisor — the invoice is cancelled once approved`);
      setVoidDraft(null);
      onChanged();
    } catch (e) {
      setVoidDraft({ ...voidDraft, error: apiError(e, 'The void request failed') });
    } finally {
      setBusy(false);
    }
  };

  const refundAmount = inv && refundDraft ? Math.min(paid, (inv.items || []).reduce((t, it, idx) => t + (refundDraft.items.has(idx) ? Number(it.total) : 0), 0)) : 0;
  const sendRefund = async () => {
    if (!inv || !refundDraft) return;
    if (!refundAmount) return setRefundDraft({ ...refundDraft, error: 'Tick the items to refund.' });
    if (!refundDraft.reason) return setRefundDraft({ ...refundDraft, error: 'Choose a reason.' });
    if (refundDraft.note.trim().length < 5) return setRefundDraft({ ...refundDraft, error: 'Explain what happened and what you checked.' });
    setBusy(true);
    try {
      const itemIds = (inv.items || []).filter((it, idx) => refundDraft.items.has(idx) && it.id).map((it) => it.id as string);
      await billingService.requestRefund({ invoice_id: inv.id, amount: refundAmount, reason: refundDraft.reason, clinical_justification: refundDraft.note.trim(), item_ids: itemIds.length ? itemIds : undefined });
      notify(`Refund of ${format(refundAmount)} sent to the Billing Supervisor`);
      setRefundDraft(null);
      await load();
      onChanged();
    } catch (e) {
      setRefundDraft({ ...refundDraft, error: apiError(e, 'The refund request failed') });
    } finally {
      setBusy(false);
    }
  };

  const renderDetail = () => {
    if (loading) return <HmsEmpty>Loading invoices…</HmsEmpty>;
    if (failed && !invoices.length) return <HmsEmpty>{failed}</HmsEmpty>;
    if (!inv) return <HmsEmpty>{invoices.length ? 'Select an invoice from the list.' : `No invoices issued ${RANGES[range][0].toLowerCase()}.`}</HmsEmpty>;
    const rc = byInvoice[inv.id] || [];
    return (
      <>
        <HmsDetailHeader icon={Receipt} title={`${inv.invoice_number || inv.invNo}`} badge={<HmsBadge tone={STATUS_TONE[inv.status] || 'blue'}>{STATUS_LABEL[inv.status] || inv.status}</HmsBadge>} subtitle={`${inv.patientName} · ${inv.uhid} · ${inv.date}${inv.counterCode ? ` · ${inv.counterCode}` : ''}`} />
        <HmsStatStrip
          items={[
            { label: 'Total', value: format(Number(inv.total)), note: `${(inv.items || []).length} items` },
            { label: 'Paid', value: format(paid), note: tenderText(inv), tone: paid > 0 ? 'green' : 'default' },
            { label: 'Balance', value: format(Number(inv.balance)), tone: Number(inv.balance) > 0 ? 'amber' : 'default' },
            { label: 'Receipts', value: rc.length, note: rc[0]?.receipt_number || 'None yet' },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title={`Items (${(inv.items || []).length})`}>
            {(inv.items || []).map((it, idx) => (
              <HmsRow key={idx} label={it.description} hint={`× ${it.qty}`} value={format(Number(it.total))} />
            ))}
            <HmsRow label="Subtotal" value={format(Number(inv.subtotal))} />
            <HmsRow label="Discount" value={`− ${format(Number(inv.discount))}`} />
            <HmsRow label="GST" value={format(Number(inv.tax))} last />
          </HmsSection>
          <HmsSection title={`Payments (${(inv.payments || []).length})`}>
            {(inv.payments || []).length ? (
              (inv.payments || []).map((p: { id: string; tenderMode: string; paymentNumber: string; transactionReference?: string; amount: number | string }, i: number, arr: unknown[]) => (
                <HmsRow key={p.id} label={`${TENDER_LABELS[p.tenderMode as TenderMode] || p.tenderMode} · ${p.paymentNumber}`} hint={p.transactionReference || undefined} value={format(Number(p.amount))} last={i === arr.length - 1} />
              ))
            ) : (
              <HmsRow label="No payments recorded" last />
            )}
          </HmsSection>
          <HmsSection title="Issued" defaultOpen={false}>
            <HmsRow label="Cashier" value={inv.cashierName || '—'} />
            <HmsRow label="Receipts" value={<span style={mono}>{rc.map((r) => r.receipt_number).join(', ') || '—'}</span>} last />
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <HmsButton icon={Printer} block disabled={paid <= 0} title={paid > 0 ? 'Print a duplicate copy' : 'Nothing paid yet'} onClick={() => setPrintId(inv.id)}>
              Reprint receipt
            </HmsButton>
            {canVoid ? (
              <HmsButton variant="danger" icon={Ban} block onClick={() => setVoidDraft({ reason: '', note: '' })}>
                Request void
              </HmsButton>
            ) : (
              <HmsButton variant="danger" icon={Undo2} block disabled={!canRefund} title={canRefund ? 'Ask the supervisor to approve a refund' : 'No collected amount to refund'} onClick={() => setRefundDraft({ items: new Set(), reason: '', note: '' })}>
                Request refund
              </HmsButton>
            )}
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="cashier-receipts"
        title="Receipts & invoices"
        description="Every invoice issued at the counter — reprint, void or refund through the supervisor."
        total={invoices.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search invoice, receipt, patient or UHID"
        pills={PILLS.map((k) => ({ key: k, label: k === 'all' ? 'All' : STATUS_LABEL[k], count: k === 'all' ? searched.length : searched.filter((i) => i.status === k).length, tone: k === 'UNPAID' ? ('red' as const) : undefined }))}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        leftExtra={
          <div role="radiogroup" aria-label="Date range" style={{ display: 'flex', gap: '6px', padding: '0 20px 12px', flexWrap: 'wrap' }}>
            {RANGES.map(([label], i) => (
              <HmsButton key={label} size="sm" role="radio" aria-checked={range === i} variant={range === i ? 'primary' : 'secondary'} onClick={() => {
                setLoading(true);
                setRange(i);
              }}>
                {label}
              </HmsButton>
            ))}
          </div>
        }
        selectedKey={activeKey}
        onSelect={setSelected}
        primaryLabel="open invoice"
        detailLabel="Invoice"
        emptyText="No invoices match this search or filter."
        renderDetail={renderDetail}
      />

      {printId && <CashierReceiptModal invoiceId={printId} isDuplicate onClose={() => setPrintId(null)} />}

      {voidDraft && inv && (
        <HmsModal
          title={`Void ${inv.invoice_number || inv.invNo}?`}
          description={`${inv.patientName} · ${format(Number(inv.total))} unpaid. The supervisor decides; the charges go back to the queue once approved.`}
          onClose={() => setVoidDraft(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setVoidDraft(null)} data-autofocus>
                Cancel
              </HmsButton>
              <HmsButton variant="danger" icon={Ban} onClick={sendVoid} disabled={busy}>
                Send void request
              </HmsButton>
            </>
          }
        >
          {voidDraft.error && <HmsNotice tone="red">{voidDraft.error}</HmsNotice>}
          <HmsField label="Reason" required>
            <select style={INPUT} value={voidDraft.reason} onChange={(e) => setVoidDraft({ ...voidDraft, reason: e.target.value, error: undefined })}>
              <option value="">Choose a reason…</option>
              {VOID_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </HmsField>
          <HmsField label="Note">
            <textarea style={TEXTAREA} value={voidDraft.note} onChange={(e) => setVoidDraft({ ...voidDraft, note: e.target.value })} />
          </HmsField>
        </HmsModal>
      )}

      {refundDraft && inv && (
        <HmsModal
          title="Request a refund"
          description={`${inv.invoice_number || inv.invNo} · ${inv.patientName}. Paid by ${tenderText(inv)}; the refund goes back the same way after supervisor approval.`}
          onClose={() => setRefundDraft(null)}
          busy={busy}
          width={600}
          footer={
            <>
              <HmsButton onClick={() => setRefundDraft(null)}>Cancel</HmsButton>
              <HmsButton variant="danger" icon={Undo2} onClick={sendRefund} disabled={busy}>
                Send {refundAmount ? format(refundAmount) : ''} for approval
              </HmsButton>
            </>
          }
        >
          {refundDraft.error && <HmsNotice tone="red">{refundDraft.error}</HmsNotice>}
          <HmsSection title="Items to refund">
            {(inv.items || []).map((it, idx, arr) => {
              const on = refundDraft.items.has(idx);
              return (
                <HmsRow
                  key={idx}
                  last={idx === arr.length - 1}
                  label={
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => {
                        const n = new Set(refundDraft.items);
                        if (on) n.delete(idx);
                        else n.add(idx);
                        setRefundDraft({ ...refundDraft, items: n, error: undefined });
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontSize: '14px', color: HMS.text }}
                    >
                      {on ? <CheckSquare size={18} color={HMS.primary} aria-hidden /> : <Square size={18} color={HMS.textMuted} aria-hidden />}
                      {it.description}
                    </button>
                  }
                  value={format(Number(it.total))}
                />
              );
            })}
          </HmsSection>
          <HmsField label="Reason" required>
            <select style={INPUT} value={refundDraft.reason} onChange={(e) => setRefundDraft({ ...refundDraft, reason: e.target.value, error: undefined })}>
              <option value="">Choose a reason…</option>
              {REFUND_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </HmsField>
          <HmsField label="What happened" required>
            <textarea style={TEXTAREA} value={refundDraft.note} onChange={(e) => setRefundDraft({ ...refundDraft, note: e.target.value, error: undefined })} placeholder="What happened and what you verified" />
          </HmsField>
        </HmsModal>
      )}
    </>
  );
};
