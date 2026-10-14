// Accounts Executive · maker forms: new journal, record vendor bill, raise expense.
// Each can be saved as a draft or submitted straight to the approval chain.
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Send, Save, Trash2 } from 'lucide-react';
import { HmsModal, HmsButton, HmsField, HmsNotice, HmsToggle, INPUT, TEXTAREA, HMS } from '../../../components/hms';
import { accountsService } from '../../../services/accountsService';
import { ExecutiveSnapshot, addDaysIso, apiError, inr2, num, todayIso } from './executiveData';

interface FormProps {
  data: ExecutiveSnapshot;
  notify: (message: string, tone?: 'success' | 'error') => void;
  onClose: () => void;
}

const GRID2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' };

const Footer: React.FC<{ busy: string | null; onClose: () => void; onDraft: () => void; onSubmit: () => void; canSubmit: boolean; submitLabel: string }> = ({ busy, onClose, onDraft, onSubmit, canSubmit, submitLabel }) => (
  <>
    <HmsButton onClick={onClose} disabled={!!busy}>
      Cancel
    </HmsButton>
    <HmsButton icon={Save} onClick={onDraft} disabled={!!busy}>
      {busy === 'draft' ? 'Saving…' : 'Save draft'}
    </HmsButton>
    <HmsButton variant="primary" icon={Send} onClick={onSubmit} disabled={!!busy || !canSubmit}>
      {busy === 'submit' ? 'Submitting…' : submitLabel}
    </HmsButton>
  </>
);

/* ================================================================== */
/* New journal                                                         */
/* ================================================================== */

interface Line {
  account_id: string;
  debit: string;
  credit: string;
  narration: string;
}

const blankLine = (): Line => ({ account_id: '', debit: '', credit: '', narration: '' });

export const JournalDialog: React.FC<FormProps> = ({ data, notify, onClose }) => {
  const accounts = data.coa.filter((a) => a.active && a.is_postable !== false);
  const [date, setDate] = useState(todayIso());
  const [ref, setRef] = useState('');
  const [desc, setDesc] = useState('');
  const [lines, setLines] = useState<Line[]>([blankLine(), blankLine()]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const totalDr = lines.reduce((s, l) => s + num(l.debit), 0);
  const totalCr = lines.reduce((s, l) => s + num(l.credit), 0);
  const balanced = totalDr > 0 && Math.abs(totalDr - totalCr) < 0.005;

  const setLine = (i: number, patch: Partial<Line>) => {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
    setError(null);
  };

  const save = async (submit: boolean) => {
    if (!desc.trim()) return setError('Add a narration explaining the entry.');
    const used = lines.filter((l) => l.account_id || num(l.debit) || num(l.credit));
    if (used.length < 2) return setError('A journal needs at least two lines.');
    if (used.some((l) => !l.account_id)) return setError('Choose an account on every line.');
    if (used.some((l) => (num(l.debit) > 0) === (num(l.credit) > 0))) return setError('Each line takes either a debit or a credit, not both.');
    if (!balanced) return setError('Debits and credits must be equal.');
    setBusy(submit ? 'submit' : 'draft');
    try {
      const created = await accountsService.createJournal({
        journal_date: date,
        description: desc.trim(),
        external_reference: ref.trim() || undefined,
        lines: used.map((l) => ({ account_id: l.account_id, debit: num(l.debit), credit: num(l.credit), narration: l.narration.trim() || undefined })),
      });
      if (submit) await accountsService.submitJournal(created.id, created.version ?? 1);
      notify(submit ? `Journal ${created.reference_no} sent to the supervisor` : `Journal ${created.reference_no} saved as draft`);
      await data.reload();
      onClose();
    } catch (e) {
      setError(apiError(e, 'Could not save the journal'));
      setBusy(null);
    }
  };

  return (
    <HmsModal
      title="New journal entry"
      description="Debits must equal credits. Submitted journals go to the Accounts Supervisor."
      onClose={onClose}
      busy={!!busy}
      width={760}
      footer={<Footer busy={busy} onClose={onClose} onDraft={() => save(false)} onSubmit={() => save(true)} canSubmit={balanced} submitLabel="Submit for approval" />}
    >
      {error && <HmsNotice tone="red">{error}</HmsNotice>}
      {!accounts.length && <HmsNotice tone="amber">The chart of accounts did not load, so no account can be chosen. Refresh and try again.</HmsNotice>}
      <div style={GRID2}>
        <HmsField label="Journal date" required>
          <input type="date" style={INPUT} value={date} onChange={(e) => setDate(e.target.value)} />
        </HmsField>
        <HmsField label="External reference" hint="Invoice, memo or advice number">
          <input style={INPUT} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. INV-1042" />
        </HmsField>
      </div>
      <HmsField label="Narration" required>
        <input style={INPUT} value={desc} onChange={(e) => (setDesc(e.target.value), setError(null))} placeholder="Why this entry is being made" />
      </HmsField>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: HMS.text }}>Lines</span>
          <HmsButton size="sm" icon={Plus} onClick={() => setLines((ls) => [...ls, blankLine()])}>
            Add line
          </HmsButton>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {lines.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.2fr) minmax(0, 1fr) minmax(0, 1fr) 36px', gap: '8px', alignItems: 'center' }}>
              <select style={INPUT} value={l.account_id} onChange={(e) => setLine(i, { account_id: e.target.value })} aria-label={`Line ${i + 1} account`}>
                <option value="">Choose account…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} · {a.name}
                  </option>
                ))}
              </select>
              <input type="number" min={0} step="0.01" style={INPUT} placeholder="Debit" value={l.debit} onChange={(e) => setLine(i, { debit: e.target.value, credit: e.target.value ? '' : l.credit })} aria-label={`Line ${i + 1} debit`} />
              <input type="number" min={0} step="0.01" style={INPUT} placeholder="Credit" value={l.credit} onChange={(e) => setLine(i, { credit: e.target.value, debit: e.target.value ? '' : l.debit })} aria-label={`Line ${i + 1} credit`} />
              <HmsButton variant="ghost" icon={Trash2} disabled={lines.length <= 2} onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} aria-label={`Remove line ${i + 1}`} title="Remove line" />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginTop: '12px', padding: '10px 14px', background: HMS.subtle, border: `1px solid ${HMS.border}`, borderRadius: '10px', fontSize: '13px' }}>
          <span>
            Debit <strong>{inr2(totalDr)}</strong>
          </span>
          <span>
            Credit <strong>{inr2(totalCr)}</strong>
          </span>
          <span style={{ fontWeight: 700, color: balanced ? '#15803d' : '#dc2626' }}>{balanced ? 'Balanced' : `Out by ${inr2(Math.abs(totalDr - totalCr))}`}</span>
        </div>
      </div>
    </HmsModal>
  );
};

/* ================================================================== */
/* Record vendor bill                                                  */
/* ================================================================== */

const GST_RATES = [0, 5, 12, 18, 28];

export const BillDialog: React.FC<FormProps> = ({ data, notify, onClose }) => {
  // Vendors known to the ledger (there is no vendor-list endpoint for the executive yet)
  const vendors = useMemo(() => {
    const m = new Map<string, { id: string; name: string; terms: number }>();
    data.bills.forEach((b) => {
      if (b.vendor?.id && !m.has(b.vendor.id)) m.set(b.vendor.id, { id: b.vendor.id, name: b.vendor.name || b.vendor.id, terms: b.vendor.payment_terms_days || 0 });
    });
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [data.bills]);

  const [vendorId, setVendorId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(addDaysIso(todayIso(), 30));
  const [poNo, setPoNo] = useState('');
  const [taxable, setTaxable] = useState('');
  const [rate, setRate] = useState(18);
  const [dup, setDup] = useState<{ has_duplicate?: boolean; score?: number } | null>(null);
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const amount = num(taxable);
  const halfTax = Math.round(amount * rate * 0.5) / 100;
  const total = amount + halfTax * 2;
  const canCheck = !!vendorId && !!invoiceNo.trim() && amount > 0;
  const highDup = canCheck && !!dup?.has_duplicate && num(dup.score) >= 80;

  // Duplicate check as the invoice is typed (debounced); a stale result is ignored via canCheck
  useEffect(() => {
    if (!vendorId || !invoiceNo.trim() || amount <= 0) return;
    const t = window.setTimeout(async () => {
      try {
        setDup(await accountsService.checkDuplicateBill({ vendor_id: vendorId, invoice_no: invoiceNo.trim(), amount, invoice_date: invoiceDate }));
      } catch {
        setDup(null);
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [vendorId, invoiceNo, amount, invoiceDate]);

  const pickVendor = (id: string) => {
    setVendorId(id);
    const v = vendors.find((x) => x.id === id);
    if (v?.terms) setDueDate(addDaysIso(invoiceDate, v.terms));
    setError(null);
  };

  const save = async (submit: boolean) => {
    if (!vendorId) return setError('Choose the vendor.');
    if (!invoiceNo.trim()) return setError('Enter the vendor invoice number.');
    if (amount <= 0) return setError('Enter the taxable amount.');
    if (submit && highDup && !ack) return setError('Confirm you checked the possible duplicate before submitting.');
    setBusy(submit ? 'submit' : 'draft');
    try {
      const bill = await accountsService.createVendorBill({
        vendor_id: vendorId,
        invoice_no: invoiceNo.trim(),
        invoice_date: invoiceDate,
        due_date: dueDate,
        po_no: poNo.trim(),
        taxable_amount: amount,
        cgst: halfTax,
        sgst: halfTax,
        total_amount: total,
        net_payable: total,
      });
      if (submit) await accountsService.submitVendorBill(bill.id, ack, bill.version ?? 1);
      notify(submit ? `Bill ${bill.reference_no} sent for approval` : `Bill ${bill.reference_no} saved as draft`);
      await data.reload();
      onClose();
    } catch (e) {
      setError(apiError(e, 'Could not save the bill'));
      setBusy(null);
    }
  };

  return (
    <HmsModal
      title="Record vendor bill"
      description="The bill is matched against its PO and GRN and checked for duplicates."
      onClose={onClose}
      busy={!!busy}
      width={620}
      footer={<Footer busy={busy} onClose={onClose} onDraft={() => save(false)} onSubmit={() => save(true)} canSubmit={!highDup || ack} submitLabel="Submit for approval" />}
    >
      {error && <HmsNotice tone="red">{error}</HmsNotice>}
      {!vendors.length && <HmsNotice tone="amber">No vendors are on file yet. A vendor must exist in the ledger before a bill can be recorded.</HmsNotice>}
      <HmsField label="Vendor" required>
        <select style={INPUT} value={vendorId} onChange={(e) => pickVendor(e.target.value)}>
          <option value="">Choose vendor…</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </HmsField>
      <div style={GRID2}>
        <HmsField label="Invoice number" required>
          <input style={INPUT} value={invoiceNo} onChange={(e) => (setInvoiceNo(e.target.value), setError(null))} placeholder="As printed on the invoice" />
        </HmsField>
        <HmsField label="PO number">
          <input style={INPUT} value={poNo} onChange={(e) => setPoNo(e.target.value)} placeholder="For the 3-way match" />
        </HmsField>
        <HmsField label="Invoice date" required>
          <input type="date" style={INPUT} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        </HmsField>
        <HmsField label="Due date" required>
          <input type="date" style={INPUT} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </HmsField>
        <HmsField label="Taxable amount (₹)" required>
          <input type="number" min={0} step="0.01" style={INPUT} value={taxable} onChange={(e) => (setTaxable(e.target.value), setError(null))} />
        </HmsField>
        <HmsField label="GST rate" hint="Split equally into CGST and SGST">
          <select style={INPUT} value={rate} onChange={(e) => setRate(Number(e.target.value))}>
            {GST_RATES.map((r) => (
              <option key={r} value={r}>
                {r}%
              </option>
            ))}
          </select>
        </HmsField>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '10px 14px', background: HMS.subtle, border: `1px solid ${HMS.border}`, borderRadius: '10px', fontSize: '13px' }}>
        <span>
          CGST <strong>{inr2(halfTax)}</strong>
        </span>
        <span>
          SGST <strong>{inr2(halfTax)}</strong>
        </span>
        <span>
          Net payable <strong>{inr2(total)}</strong>
        </span>
      </div>
      {highDup && (
        <>
          <HmsNotice tone="red">Possible duplicate: {dup?.score}% match with an invoice already on file from this vendor.</HmsNotice>
          <HmsToggle checked={ack} onChange={(v) => (setAck(v), setError(null))} label="I checked the original invoice — this is not a duplicate" showLabel />
        </>
      )}
    </HmsModal>
  );
};

/* ================================================================== */
/* Raise expense                                                       */
/* ================================================================== */

const DEPARTMENTS: [string, string][] = [
  ['opd', 'Outpatient (OPD)'],
  ['ipd', 'Inpatient (IPD)'],
  ['pharmacy', 'Pharmacy'],
  ['lab', 'Laboratory'],
  ['radiology', 'Radiology & imaging'],
];

const CATEGORIES: [string, string][] = [
  ['medical_consumables', 'Medical consumables'],
  ['lab_reagents', 'Laboratory reagents'],
  ['pharmacy_emergency', 'Emergency medicine purchase'],
  ['admin_supplies', 'Administrative supplies'],
];

export const ExpenseDialog: React.FC<FormProps> = ({ data, notify, onClose }) => {
  const [dept, setDept] = useState('opd');
  const [type, setType] = useState('medical_consumables');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const save = async (submit: boolean) => {
    if (num(amount) <= 0) return setError('Enter the amount requested.');
    if (!reason.trim()) return setError('Give the business reason for the expense.');
    setBusy(submit ? 'submit' : 'draft');
    try {
      const exp = await accountsService.createExpenseRequest({ department_id: dept, expense_type: type, amount: num(amount), business_reason: reason.trim() });
      if (submit) await accountsService.submitExpenseRequest(exp.id);
      notify(submit ? `Expense ${exp.reference_no} sent for approval` : `Expense ${exp.reference_no} saved as draft`);
      await data.reload();
      onClose();
    } catch (e) {
      setError(apiError(e, 'Could not save the expense'));
      setBusy(null);
    }
  };

  return (
    <HmsModal
      title="Raise expense request"
      description="The department budget is checked when the request is submitted."
      onClose={onClose}
      busy={!!busy}
      footer={<Footer busy={busy} onClose={onClose} onDraft={() => save(false)} onSubmit={() => save(true)} canSubmit submitLabel="Submit for approval" />}
    >
      {error && <HmsNotice tone="red">{error}</HmsNotice>}
      <div style={GRID2}>
        <HmsField label="Department" required>
          <select style={INPUT} value={dept} onChange={(e) => setDept(e.target.value)}>
            {DEPARTMENTS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </HmsField>
        <HmsField label="Category" required>
          <select style={INPUT} value={type} onChange={(e) => setType(e.target.value)}>
            {CATEGORIES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </HmsField>
      </div>
      <HmsField label="Amount (₹)" required>
        <input type="number" min={0} step="0.01" style={INPUT} value={amount} onChange={(e) => (setAmount(e.target.value), setError(null))} />
      </HmsField>
      <HmsField label="Business reason" required>
        <textarea style={TEXTAREA} value={reason} onChange={(e) => (setReason(e.target.value), setError(null))} placeholder="What is being bought and why" />
      </HmsField>
    </HmsModal>
  );
};
