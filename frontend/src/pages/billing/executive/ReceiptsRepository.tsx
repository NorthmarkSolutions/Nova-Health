import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, Printer, Undo2, Ban } from 'lucide-react';
import { billingService, BillingInvoice, BillingReceiptRecord } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { CashierReceiptModal } from '../cashier/CashierReceiptModal';
import { Btn, C, Callout, Drawer, Empty, Field, PageHeader, PillTabs, Row, StatusChip, apiError, card, deptLabel, inputStyle, mono } from './executiveUi';
import { TENDER_LABELS, TenderMode } from './cashierMath';

const STATUS_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'PAID', label: 'Paid' },
  { key: 'PARTIALLY_PAID', label: 'Partial' },
  { key: 'UNPAID', label: 'Unpaid' },
  { key: 'REFUNDED', label: 'Refunded' }
];

const RANGES: Record<string, number | null> = { Today: 0, '7 days': 7, '30 days': 30, All: null };
const REFUND_REASONS = ['Test cancelled by doctor', 'Doctor unavailable', 'Duplicate billing', 'Service not rendered'];
const VOID_REASONS = ['Wrong patient', 'Duplicate invoice', 'Billed in error', 'Patient left before service'];

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString('en-CA'); // local YYYY-MM-DD, matching Invoice.date
};

const tenderText = (inv: BillingInvoice) => {
  const modes = Array.from(new Set((inv.payments || []).map((p: any) => p.tenderMode || p.paymentMethod)));
  return modes.length ? modes.map((m) => TENDER_LABELS[m as TenderMode] || m).join(' + ') : '—';
};

export const ReceiptsRepository: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const { format: fmt } = useCurrency();
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [receipts, setReceipts] = useState<BillingReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('ALL');
  const [range, setRange] = useState('Today');
  const [detail, setDetail] = useState<BillingInvoice | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const days = RANGES[range];
      const [inv, rc] = await Promise.all([
        billingService.getInvoices(days == null ? undefined : { start_date: isoDaysAgo(days) }),
        billingService.getBillingReceipts()
      ]);
      // Drafts are not fiscal documents; they live on the patient's account, not in the repository
      setInvoices([...(inv || [])].filter((i) => i.status !== 'DRAFT').sort((a, b) => String(b.created_at || b.date).localeCompare(String(a.created_at || a.date))));
      setReceipts(rc || []);
    } catch (err) {
      setError(apiError(err, 'Could not load invoices.'));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const receiptsByInvoice = useMemo(() => {
    const m: Record<string, BillingReceiptRecord[]> = {};
    for (const r of receipts) (m[r.invoice] = m[r.invoice] || []).push(r);
    return m;
  }, [receipts]);

  const q = search.trim().toLowerCase();
  const searched = invoices.filter((i) => {
    if (!q) return true;
    const rcp = (receiptsByInvoice[i.id] || []).map((r) => r.receipt_number).join(' ');
    return [i.invoice_number, i.invNo, i.patientName, i.uhid, i.phone, rcp].some((v) => (v || '').toLowerCase().includes(q));
  });
  const rows = tab === 'ALL' ? searched : searched.filter((i) => i.status === tab);
  const counts = Object.fromEntries(STATUS_TABS.map((t) => [t.key, t.key === 'ALL' ? searched.length : searched.filter((i) => i.status === t.key).length]));
  const cols = '150px 150px 70px minmax(160px,2fr) 90px minmax(110px,1fr) 110px 100px';

  return (
    <>
      <PageHeader
        title="Receipts & Invoices"
        subtitle="Every invoice issued at the counter. Reprint, review delivery or start a refund."
        actions={
          <Btn onClick={load} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </Btn>
        }
      />
      {error && <div style={{ marginBottom: 12 }}><Callout tone="red">{error}</Callout></div>}

      <div style={{ ...card }}>
        <div style={{ padding: 14, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 'min(340px, 100%)' }}>
            <Search size={16} color={C.faint} style={{ position: 'absolute', left: 10, top: 11 }} />
            <input style={{ ...inputStyle, paddingLeft: 34 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Invoice, receipt, patient or UHID" />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <PillTabs tabs={STATUS_TABS.map((t) => ({ ...t, count: counts[t.key] }))} active={tab} onPick={setTab} />
            <select style={{ ...inputStyle, width: 120 }} value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">
              {Object.keys(RANGES).map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 980 }}>
            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, padding: '10px 14px', fontSize: 12, color: C.muted, borderBottom: `1px solid ${C.border}`, background: C.bg }}>
              <span>Invoice</span><span>Receipt</span><span>Date</span><span>Patient</span><span>Source</span><span>Tender</span><span style={{ textAlign: 'right' }}>Amount</span><span>Status</span>
            </div>
            {loading && <Empty text="Loading invoices…" />}
            {!loading && rows.length === 0 && <Empty text="No invoices match." />}
            {!loading && rows.map((i) => {
              const rc = receiptsByInvoice[i.id] || [];
              return (
                <div
                  key={i.id}
                  onClick={() => setDetail(i)}
                  style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, alignItems: 'center', padding: '11px 14px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 13 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.hover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={mono}>{i.invoice_number || i.invNo}</span>
                  <span style={{ ...mono, color: rc.length ? C.text : C.faint }}>{rc[0]?.receipt_number || '—'}{rc.length > 1 ? ` +${rc.length - 1}` : ''}</span>
                  <span style={{ color: C.muted }}>{String(i.date).slice(5)}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontWeight: 500 }}>{i.patientName}</span>
                    <span style={{ fontSize: 12, color: C.muted, ...mono }}>{i.uhid}</span>
                  </div>
                  <span>{deptLabel(i.category)}</span>
                  <span>{tenderText(i)}</span>
                  <span style={{ textAlign: 'right', fontWeight: 500, ...mono }}>{fmt(Number(i.total))}</span>
                  <StatusChip status={i.status} />
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ padding: '10px 14px', fontSize: 13, color: C.muted }}>Showing {rows.length} invoices · {range}</div>
      </div>

      {detail && (
        <InvoiceDetailDrawer
          invoice={detail}
          receipts={receiptsByInvoice[detail.id] || []}
          onClose={() => setDetail(null)}
          onReprint={() => setPrintId(detail.id)}
          onRefundRequested={() => {
            setDetail(null);
            load();
            onChanged();
          }}
        />
      )}
      {printId && <CashierReceiptModal invoiceId={printId} isDuplicate onClose={() => setPrintId(null)} />}
    </>
  );
};

const InvoiceDetailDrawer: React.FC<{
  invoice: BillingInvoice;
  receipts: BillingReceiptRecord[];
  onClose: () => void;
  onReprint: () => void;
  onRefundRequested: () => void;
}> = ({ invoice: i, receipts, onClose, onReprint, onRefundRequested }) => {
  const { format: fmt } = useCurrency();
  const [refund, setRefund] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidNote, setVoidNote] = useState('');
  const [voidSent, setVoidSent] = useState<string | null>(null);

  const paid = Number(i.paid);
  // Phase 5: only unpaid invoices can be voided, and only with a supervisor's approval
  const canVoid = i.status === 'UNPAID' && paid <= 0;

  const submitVoid = async () => {
    setBusy(true);
    setError(null);
    try {
      const req = await billingService.requestInvoiceVoid(i.id, { reason: voidReason, notes: voidNote.trim() || undefined });
      setVoidSent(`${req.request_number} sent to the Billing Supervisor. The invoice is cancelled once approved.`);
      setVoiding(false);
    } catch (err) {
      setError(apiError(err, 'Void request failed.'));
    } finally {
      setBusy(false);
    }
  };
  const refundAmount = Math.min(paid, (i.items || []).reduce((t, it, idx) => t + (selected.has(idx) ? Number(it.total) : 0), 0));
  const canRefund = paid > 0 && i.status !== 'REFUNDED' && i.status !== 'CANCELLED';

  const submitRefund = async () => {
    setBusy(true);
    setError(null);
    try {
      const itemIds = (i.items || []).filter((it, idx) => selected.has(idx) && it.id).map((it) => it.id as string);
      await billingService.requestRefund({
        invoice_id: i.id, amount: refundAmount, reason, clinical_justification: note,
        item_ids: itemIds.length ? itemIds : undefined
      });
      onRefundRequested();
    } catch (err) {
      setError(apiError(err, 'Refund request failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      title={refund ? 'Request refund' : 'Invoice detail'}
      subtitle={<span style={mono}>{i.invoice_number || i.invNo} · {i.patientName}</span>}
      width={refund ? 480 : 560}
      onClose={onClose}
      footer={
        refund ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: C.amber }}>{!refundAmount ? 'Select items to refund' : !reason ? 'Select a reason' : 'Routed to Billing Supervisor for approval'}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={() => setRefund(false)}>Back</Btn>
              <Btn variant="primary" disabled={busy || !refundAmount || !reason} onClick={submitRefund}>
                Send for approval
              </Btn>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: C.muted }}>
              {canVoid ? 'Unpaid: a supervisor can void it.' : canRefund ? 'Refunds need supervisor approval.' : 'No collected amount to refund.'}
            </span>
            {voiding ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={() => setVoiding(false)}>Back</Btn>
                <Btn variant="danger" disabled={busy || !voidReason} onClick={submitVoid}>Send void request</Btn>
              </div>
            ) : canVoid ? (
              <Btn variant="danger" disabled={!!voidSent} onClick={() => setVoiding(true)}>
                <Ban size={16} /> Request void
              </Btn>
            ) : (
              <Btn variant="danger" disabled={!canRefund} onClick={() => setRefund(true)}>
                <Undo2 size={16} /> Start refund
              </Btn>
            )}
          </div>
        )
      }
    >
      {error && <Callout tone="red">{error}</Callout>}
      {voidSent && <Callout tone="green">{voidSent}</Callout>}
      {voiding && (
        <section style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Void this invoice</span>
          <Field label="Reason">
            <select style={inputStyle} value={voidReason} onChange={(e) => setVoidReason(e.target.value)}>
              <option value="">Select reason</option>
              {VOID_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Note" hint="The charges return to the queue once the supervisor approves.">
            <textarea style={{ ...inputStyle, height: 'auto', padding: 10 }} rows={2} value={voidNote} onChange={(e) => setVoidNote(e.target.value)} />
          </Field>
        </section>
      )}
      {!refund ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600 }}>{i.patientName}</span>
              <span style={{ fontSize: 12, color: C.muted, ...mono }}>{i.uhid}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 600, ...mono }}>{fmt(Number(i.total))}</span>
              <StatusChip status={i.status} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Row label="Invoice" value={i.invoice_number || i.invNo} />
            <Row label="Receipts" value={receipts.map((r) => r.receipt_number).join(', ') || '—'} />
            <Row label="Issued" value={`${i.date}${i.counterCode ? ' · ' + i.counterCode : ''}`} />
            <Row label="Cashier" value={i.cashierName || '—'} />
            <Row label="Tender" value={tenderText(i)} />
          </div>
          <section style={{ ...card }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 14 }}>Items</div>
            {(i.items || []).map((it, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 14px', fontSize: 13, borderBottom: `1px solid ${C.border}` }}>
                <span>{it.description} <span style={{ color: C.muted }}>× {it.qty}</span></span>
                <span style={mono}>{fmt(Number(it.total))}</span>
              </div>
            ))}
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Row label="Subtotal" value={fmt(Number(i.subtotal))} />
              <Row label="Discount" value={`− ${fmt(Number(i.discount))}`} />
              <Row label="Tax" value={fmt(Number(i.tax))} />
              <Row label="Paid" value={fmt(paid)} strong />
              {Number(i.balance) > 0 && <Row label="Balance" value={fmt(Number(i.balance))} color={C.amber} />}
            </div>
          </section>
          <section style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Payments</span>
            {(i.payments || []).length === 0 && <span style={{ fontSize: 13, color: C.muted }}>No payments recorded.</span>}
            {(i.payments || []).map((p: any) => (
              <Row key={p.id} label={`${TENDER_LABELS[p.tenderMode as TenderMode] || p.tenderMode} · ${p.paymentNumber}${p.transactionReference ? ' · ' + p.transactionReference : ''}`} value={fmt(Number(p.amount))} />
            ))}
          </section>
          <Btn onClick={onReprint} disabled={paid <= 0}>
            <Printer size={16} /> Reprint (duplicate copy)
          </Btn>
        </>
      ) : (
        <>
          <span style={{ fontSize: 13, color: C.muted }}>Items to refund</span>
          {(i.items || []).map((it, idx) => (
            <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selected.has(idx)}
                onChange={() =>
                  setSelected((s) => {
                    const n = new Set(s);
                    if (n.has(idx)) n.delete(idx);
                    else n.add(idx);
                    return n;
                  })
                }
              />
              <span style={{ flex: 1 }}>{it.description}</span>
              <span style={mono}>{fmt(Number(it.total))}</span>
            </label>
          ))}
          <Field label="Reason">
            <select style={inputStyle} value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Select reason</option>
              {REFUND_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Justification">
            <textarea style={{ ...inputStyle, height: 'auto', padding: 10 }} rows={3} placeholder="What happened and what you verified" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Row label={`Refund to ${tenderText(i)}`} value={fmt(refundAmount)} strong />
        </>
      )}
    </Drawer>
  );
};
