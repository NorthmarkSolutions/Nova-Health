// Billing · IPD & TPA desk — inpatient running bills and the financial discharge gate.
// One list of admissions shown two ways: "running" (bill vs deposit and cover) and "discharge" (checklist → final bill → balance → pass).
import React, { useEffect, useState } from 'react';
import { Banknote, Send, PlusCircle, FileCheck2, LogOut, Printer, ShieldAlert, CheckCircle2, Circle, Wallet } from 'lucide-react';
import {
  HmsMasterDetail,
  HmsListRow,
  HmsBadge,
  HmsButton,
  HmsDetailHeader,
  HmsStatStrip,
  HmsDetailBody,
  HmsDetailFooter,
  HmsSection,
  HmsRow,
  HmsNotice,
  HmsEmpty,
  HmsModal,
  HmsField,
  HmsToggle,
  HmsTone,
  INPUT,
  TEXTAREA,
  HMS,
  resolveActiveKey,
} from '../../../components/hms';
import { billingService, IpdAdmissionOverviewItem, IpdRunningBillSummary } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { DischargeClearancePassModal } from '../executive/DischargeClearancePassModal';
import { ADMISSION_LABEL, IpdTpaData, LEDGER_TYPES, PREAUTH_LABEL, fmtAge, fmtDateTime, inDischarge, minutesSince, overCover } from './ipdTpaData';

export interface IpdAdmissionsViewProps {
  mode: 'running' | 'discharge';
  data: IpdTpaData;
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
  /** Opens a new pre-auth for this admission. */
  onStartPreAuth: (admissionNumber: string) => void;
  canOverride: boolean;
  shiftOpen: boolean;
}

const STATUS_TONE: Record<IpdAdmissionOverviewItem['status'], HmsTone> = { RUNNING: 'gray', MEDICALLY_DISCHARGED: 'amber', AWAITING_TPA: 'blue', CLEARED: 'green' };
const PILLS = {
  running: ['all', 'over', 'cashless', 'self'],
  discharge: ['pending', 'insurer', 'cleared'],
};
const has = (q: string, values: (string | null | undefined)[]) => !q || values.some((v) => (v || '').toLowerCase().includes(q));
const today = () => new Date().toISOString().slice(0, 10);
const NO_SHIFT = 'Open your counter shift to take money';
const TENDERS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CHEQUE', label: 'Cheque' },
] as const;
type Tender = (typeof TENDERS)[number]['value'];
const REF_LABEL: Record<Tender, string> = { CASH: 'Receipt note', CARD: 'Card approval code', UPI: 'UPI transaction ID', CHEQUE: 'Cheque number' };
const DEPT_LABEL: Record<string, string> = { LAB: 'Lab', RADIOLOGY: 'Radiology', PHARMACY: 'Pharmacy', IPD: 'Ward', OPD: 'OPD', OT: 'OT', GENERAL: 'General' };
type PayTarget = { kind: 'deposit' } | { kind: 'invoice'; id: string; number: string; balance: number; final: boolean };
type OpenInvoice = IpdRunningBillSummary['open_invoices'][number];

type Pass = React.ComponentProps<typeof DischargeClearancePassModal>['pass'];

export const IpdAdmissionsView: React.FC<IpdAdmissionsViewProps> = ({ mode, data, notify, initialFilter, initialSelect, onStartPreAuth, canOverride, shiftOpen }) => {
  const { format } = useCurrency();
  const money = (n: number | null | undefined) => (n === null || n === undefined ? '—' : format(n));
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS[mode].includes(initialFilter) ? initialFilter : PILLS[mode][0]);
  const [selected, setSelected] = useState<string | null>(initialSelect ? `a:${initialSelect}` : null);
  const [details, setDetails] = useState<Record<string, IpdRunningBillSummary>>({});
  const [detailFailed, setDetailFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Deposits and payments are taken in one HMS dialog — the bill stays in the right box
  const [pay, setPay] = useState<{ target: PayTarget; amount: string; tender: Tender; ref: string; error?: string } | null>(null);
  const startDeposit = () => setPay({ target: { kind: 'deposit' }, amount: '', tender: 'CASH', ref: '' });
  const startInvoice = (inv: { id: string; invoice_number: string; balance: number }, final = false) =>
    setPay({ target: { kind: 'invoice', id: inv.id, number: inv.invoice_number, balance: inv.balance, final }, amount: String(inv.balance), tender: 'CASH', ref: '' });
  /** What the patient owes next: the final bill first, then older counter invoices. */
  const nextPayable = (d: IpdRunningBillSummary) =>
    d.final_invoice_id && (d.final_invoice_balance || 0) > 0
      ? () => startInvoice({ id: d.final_invoice_id as string, invoice_number: d.final_invoice_number || 'Final bill', balance: d.final_invoice_balance || 0 }, true)
      : d.open_invoices[0]
        ? () => startInvoice(d.open_invoices[0])
        : null;

  const [chargeDraft, setChargeDraft] = useState<{ type: string; description: string; qty: string; price: string; date: string; error?: string } | null>(null);
  const [topupDraft, setTopupDraft] = useState<{ amount: string; note: string; error?: string } | null>(null);
  const [consolidateOpen, setConsolidateOpen] = useState<{ note: string; confirmed: boolean; error?: string } | null>(null);
  const [overrideDraft, setOverrideDraft] = useState<{ reason: string; error?: string } | null>(null);
  const [pass, setPass] = useState<Pass>(null);

  const q = search.trim().toLowerCase();
  const all = data.admissions;
  const base = mode === 'running' ? all : all.filter((a) => inDischarge(a) || a.status === 'CLEARED');
  const pillMatch = (a: IpdAdmissionOverviewItem, p: string) => {
    switch (p) {
      case 'over':
        return overCover(a);
      case 'cashless':
        return !!a.claim_number;
      case 'self':
        return !a.claim_number;
      case 'pending':
        return a.status === 'MEDICALLY_DISCHARGED';
      case 'insurer':
        return a.status === 'AWAITING_TPA';
      case 'cleared':
        return a.status === 'CLEARED';
      default:
        return true;
    }
  };
  const visible = base.filter((a) => pillMatch(a, pill) && has(q, [a.name, a.ip, a.uhid, a.ward, a.payer, a.claim_number]));

  const rows: HmsListRow[] = visible.map((a) => {
    const checklistDone = a.checklist.filter(Boolean).length;
    const utilTone: HmsTone = a.util >= 100 ? 'red' : a.util >= 80 ? 'amber' : 'gray';
    return {
      key: `a:${a.ip}`,
      title: a.name,
      badge:
        mode === 'running' && a.status === 'RUNNING' ? (
          a.ledger > 0 ? <HmsBadge tone={utilTone}>{`${a.util}% of cover`}</HmsBadge> : <HmsBadge tone="gray">No charges</HmsBadge>
        ) : (
          <HmsBadge tone={STATUS_TONE[a.status]}>{ADMISSION_LABEL[a.status]}</HmsBadge>
        ),
      sub: `${a.ip} · ${a.uhid} · ${a.ward}`,
      metaLeft: `Day ${a.day} · ${a.claim_number ? `Cashless ${a.claim_status ? `(${PREAUTH_LABEL[a.claim_status].toLowerCase()})` : ''}` : 'Self-pay'}`,
      metaRight: a.status === 'CLEARED' ? `Pass ${a.pass_token || '—'}` : `Bill ${money(a.ledger)}${a.open_invoices ? ` + ${money(a.open_invoices)} unpaid` : ''} · ${a.balance > 0 ? `due ${money(a.balance)}` : a.balance < 0 ? `excess ${money(-a.balance)}` : 'nothing due'}`,
      progress: mode === 'discharge' && a.status !== 'CLEARED' ? { pct: (checklistDone / Math.max(1, a.checklist.length)) * 100, doneLabel: 'Checklist complete' } : undefined,
    };
  });

  const activeKey = resolveActiveKey(rows, selected);
  const active = activeKey ? all.find((a) => `a:${a.ip}` === activeKey) : undefined;
  const detail = active ? details[active.ip] : undefined;
  // Re-fetch the itemised bill whenever the selected admission or its summary row changes
  const activeSig = active ? JSON.stringify(active) : '';

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    billingService.getIpdRunningBill(active.id).then(
      (d) => {
        if (cancelled) return;
        setDetails((prev) => (JSON.stringify(prev[active.ip]) === JSON.stringify(d) ? prev : { ...prev, [active.ip]: d }));
        setDetailFailed(null);
      },
      (e) => !cancelled && setDetailFailed(apiError(e, 'The running bill could not be loaded.'))
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSig]);

  const refreshDetail = async (a: IpdAdmissionOverviewItem) => {
    const d = await billingService.getIpdRunningBill(a.id);
    setDetails((prev) => ({ ...prev, [a.ip]: d }));
  };

  const run = async (fn: () => Promise<string>, a?: IpdAdmissionOverviewItem) => {
    setBusy(true);
    try {
      notify(await fn());
      await data.reload();
      if (a) await refreshDetail(a).catch(() => undefined);
      return true;
    } catch (e) {
      notify(apiError(e, 'The server refused the change'), 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- actions ---------------- */

  const saveCharge = async () => {
    if (!active || !chargeDraft) return;
    const qty = Number(chargeDraft.qty);
    const price = Number(chargeDraft.price);
    if (!chargeDraft.description.trim()) return setChargeDraft({ ...chargeDraft, error: 'Describe the charge.' });
    if (!Number.isInteger(qty) || qty < 1) return setChargeDraft({ ...chargeDraft, error: 'Quantity must be a whole number of 1 or more.' });
    if (!(price > 0)) return setChargeDraft({ ...chargeDraft, error: 'Enter the unit price.' });
    const ok = await run(async () => {
      await billingService.addIpdRunningCharge(active.id, { item_type: chargeDraft.type, description: chargeDraft.description.trim(), quantity: qty, unit_price: price, amount: qty * price, date: chargeDraft.date });
      return `${format(qty * price)} posted to ${active.name}'s bill`;
    }, active);
    if (ok) setChargeDraft(null);
  };

  const saveTopup = async () => {
    if (!active || !topupDraft) return;
    const amt = topupDraft.amount.trim() ? Number(topupDraft.amount) : undefined;
    if (amt !== undefined && !(amt > 0)) return setTopupDraft({ ...topupDraft, error: 'Enter a positive amount, or leave it blank.' });
    const ok = await run(async () => {
      const d = await billingService.issueIpdInterimDemand({ admission: active.ip, demanded_amount: amt, notes: topupDraft.note.trim() });
      return `Top-up ${d.demand_number} for ${format(Number(d.demanded_amount))} issued to ${active.name}'s attendant`;
    }, active);
    if (ok) setTopupDraft(null);
  };

  const savePay = async () => {
    if (!active || !pay) return;
    const amt = Number(pay.amount);
    if (!(amt > 0)) return setPay({ ...pay, error: 'Enter the amount received.' });
    if (pay.tender !== 'CASH' && !pay.ref.trim()) return setPay({ ...pay, error: `Enter the ${REF_LABEL[pay.tender].toLowerCase()}.` });
    const t = pay.target;
    const ok = await run(async () => {
      if (t.kind === 'deposit') {
        const dep = await billingService.createDeposit({ patient: active.uhid, amount: amt, tender_mode: pay.tender, transaction_reference: pay.ref.trim() || undefined, counter_code: data.shift?.counter_code || undefined });
        return `Deposit ${(dep as { deposit_number?: string }).deposit_number || ''} of ${format(amt)} received from ${active.name}`;
      }
      await billingService.processMultiTenderPayment({
        invoice_id: t.id,
        split_payments: [{ tender_mode: pay.tender, amount: amt, transaction_reference: pay.ref.trim() || undefined }],
        counter_code: data.shift?.counter_code || undefined,
      });
      return `${format(amt)} received against ${t.number}`;
    }, active);
    if (ok) setPay(null);
  };

  const toggleChecklist = (key: string, done: boolean) => {
    if (!active) return;
    run(async () => {
      await billingService.updateIpdDischargeChecklist(active.id, { [key]: !done });
      return done ? 'Checklist item reopened' : 'Checklist item confirmed';
    }, active);
  };

  const consolidate = async () => {
    if (!active || !consolidateOpen) return;
    if (!consolidateOpen.confirmed) return setConsolidateOpen({ ...consolidateOpen, error: 'Confirm that all charges are posted first.' });
    const ok = await run(async () => {
      const r = await billingService.consolidateIpdFinalBill({ admission: active.ip, notes: consolidateOpen.note.trim() });
      return r.balance_due > 0 ? `Final bill ${r.invoice_number}: ${format(r.balance_due)} to collect` : `Final bill ${r.invoice_number} fully covered`;
    }, active);
    if (ok) setConsolidateOpen(null);
  };

  const issuePass = async (override?: string) => {
    if (!active) return;
    setBusy(true);
    try {
      const c = await billingService.issueIpdDischargeClearance({ admission: active.ip, override_reason: override });
      notify(`Discharge pass ${c.qr_verification_token} issued`);
      setOverrideDraft(null);
      setPass({
        pass_number: c.qr_verification_token,
        patient_name: active.name,
        admission_number: active.ip,
        uhid: active.uhid,
        ward_name: active.ward,
        bed_number: detail?.bed_number ?? null,
        cleared_at: c.cleared_at,
        is_override: c.clearance_status === 'OVERRIDDEN',
        override_reason: c.override_reason,
      });
      await data.reload();
      await refreshDetail(active).catch(() => undefined);
    } catch (e) {
      const msg = apiError(e, 'The discharge pass was refused');
      if (overrideDraft) setOverrideDraft({ ...overrideDraft, error: msg });
      else notify(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- detail ---------------- */

  const coverSection = (a: IpdAdmissionOverviewItem, d: IpdRunningBillSummary) =>
    d.claim ? (
      <HmsSection title="Cashless cover">
        <HmsRow label="Claim" value={<span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{d.claim.claim_number}</span>} hint={d.claim.payer} />
        <HmsRow label="Insurer decision" value={<HmsBadge tone={d.claim.pre_auth_status === 'APPROVED' ? 'green' : d.claim.pre_auth_status === 'PARTIAL' ? 'amber' : d.claim.pre_auth_status === 'QUERY_RAISED' ? 'red' : 'blue'}>{PREAUTH_LABEL[d.claim.pre_auth_status]}</HmsBadge>} />
        <HmsRow label="Requested" value={money(d.claim.requested_amount)} />
        <HmsRow label="Approved (incl. enhancements)" value={d.claim.approved_amount ? money(d.claim.approved_amount) : '—'} hint={d.claim.gop_letter_number ? `GOP ${d.claim.gop_letter_number}` : undefined} last />
      </HmsSection>
    ) : (
      <HmsSection title="Cashless cover">
        <HmsRow
          label="Self-pay"
          hint="No cashless claim on this stay. Start a pre-auth if the patient has health insurance."
          value={
            a.status === 'RUNNING' ? (
              <HmsButton size="sm" icon={PlusCircle} onClick={() => onStartPreAuth(a.ip)}>
                Start pre-auth
              </HmsButton>
            ) : undefined
          }
          last
        />
      </HmsSection>
    );

  const deptSection = (d: IpdRunningBillSummary) => {
    if (!d.department_charges.length) return null;
    const byCode = d.department_charges.reduce<Record<string, number>>((m, c) => ({ ...m, [c.service_code || c.service_name]: (m[c.service_code || c.service_name] || 0) + 1 }), {});
    const repeats = Object.entries(byCode).filter(([, n]) => n > 1);
    return (
      <>
        {repeats.length > 0 && (
          <HmsNotice tone="amber">
            {repeats.map(([code, n]) => `${n} × ${d.department_charges.find((c) => (c.service_code || c.service_name) === code)?.service_name}`).join(', ')} charged — confirm these are separate orders before the final bill.
          </HmsNotice>
        )}
        <HmsSection title={`Department charges (${d.department_charges.length})`} right={<span style={{ fontSize: '12px', color: HMS.textSecondary }}>{money(d.department_total)} · on the final bill</span>}>
          {d.department_charges.map((c, i) => (
            <HmsRow
              key={c.id}
              label={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  {c.service_name}
                  {c.priority === 'STAT' && <HmsBadge tone="red">STAT</HmsBadge>}
                </span>
              }
              hint={`${DEPT_LABEL[c.department.toUpperCase()] || c.department.charAt(0) + c.department.slice(1).toLowerCase()} · ${c.service_code} · ${c.quantity} × ${money(c.unit_price)} · ${fmtDateTime(c.created_at)}`}
              value={money(c.total)}
              last={i === d.department_charges.length - 1}
            />
          ))}
        </HmsSection>
      </>
    );
  };

  const invoicesSection = (d: IpdRunningBillSummary) =>
    d.open_invoices.length > 0 && (
      <HmsSection title={`Unpaid invoices (${d.open_invoices.length})`} right={<span style={{ fontSize: '12px', color: '#b45309' }}>{money(d.open_invoices_total)} due</span>}>
        {d.open_invoices.map((inv: OpenInvoice, i) => (
          <HmsRow
            key={inv.id}
            label={<span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '13px' }}>{inv.invoice_number}</span>}
            hint={`${inv.date} · ${inv.category} · ${money(inv.paid)} paid of ${money(inv.total)}`}
            value={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                <strong>{money(inv.balance)}</strong>
                <HmsButton size="sm" icon={Banknote} disabled={!shiftOpen} title={shiftOpen ? `Take payment for ${inv.invoice_number}` : NO_SHIFT} onClick={() => startInvoice(inv)}>
                  Collect
                </HmsButton>
              </span>
            }
            last={i === d.open_invoices.length - 1}
          />
        ))}
      </HmsSection>
    );

  const renderRunning = (a: IpdAdmissionOverviewItem, d: IpdRunningBillSummary) => {
    const entries = (d.entries || []).slice(0, 8);
    const running = a.status === 'RUNNING';
    return (
      <>
        <HmsStatStrip
          items={[
            { label: 'Bill so far', value: money(d.bill_total), note: `${d.items_count} ward · ${d.department_charges.length} department charge${d.department_charges.length === 1 ? '' : 's'}` },
            { label: 'Deposits held', value: money(d.total_deposit_balance), note: `${money(d.total_deposit_received)} received`, tone: d.total_deposit_balance > 0 ? 'green' : 'default' },
            { label: 'Insurer cover', value: d.has_tpa ? money(d.tpa_settled_amount > 0 ? d.tpa_settled_amount : d.tpa_preauth_amount) : '—', note: d.has_tpa ? (d.tpa_settled_amount > 0 ? 'Settled' : 'Approved') : 'Self-pay' },
            { label: d.net_balance > 0 ? 'Balance due' : d.net_balance < 0 ? 'Excess deposit' : 'Balance', value: money(Math.abs(d.net_balance)), tone: d.net_balance > 0 ? 'amber' : d.net_balance < 0 ? 'green' : 'default', note: d.open_invoices_total > 0 ? `incl. ${money(d.open_invoices_total)} unpaid invoices` : `${d.utilization_percent}% of cover used` },
          ]}
        />
        <HmsDetailBody>
          {d.topup_demanded ? (
            <HmsNotice tone="blue">
              Top-up {d.last_demand_number} for {money(d.last_demand_amount)} was issued {fmtDateTime(d.last_demand_at)} and is awaiting the attendant's payment.
            </HmsNotice>
          ) : (
            running &&
            d.is_over_threshold && (
              <HmsNotice tone="amber">The bill has used {d.utilization_percent}% of the deposit and insurer cover. Ask the attendant for a top-up before it runs out.</HmsNotice>
            )
          )}
          <HmsSection title="Charges by category">
            {d.category_split.length ? (
              d.category_split.map((c, i) => <HmsRow key={c.category} label={c.label} value={money(c.amount)} last={i === d.category_split.length - 1} />)
            ) : (
              <HmsRow label="No charges posted yet" hint="Room, nursing and doctor-visit charges post every night; procedures and issues post as they happen." last />
            )}
          </HmsSection>
          {entries.length > 0 && (
            <HmsSection title={`Latest ward charges (${entries.length} of ${d.items_count})`} defaultOpen={false}>
              {entries.map((e, i) => (
                <HmsRow key={e.id} label={e.description} hint={`${e.date} · ${e.item_type_display} · ${e.quantity} × ${money(Number(e.unit_price))}`} value={money(Number(e.amount))} last={i === entries.length - 1} />
              ))}
            </HmsSection>
          )}
          {deptSection(d)}
          {invoicesSection(d)}
          {coverSection(a, d)}
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
            <HmsButton icon={PlusCircle} block disabled={!running} title={running ? 'Post a procedure, issue or service to the bill' : 'Discharge has started — post charges before consolidating'} onClick={() => setChargeDraft({ type: 'OT_PROCEDURE', description: '', qty: '1', price: '', date: today() })}>
              Post charge
            </HmsButton>
            <HmsButton icon={Send} block disabled={!running || d.topup_demanded} title={d.topup_demanded ? 'A top-up is already pending' : 'Ask the attendant to top up the deposit'} onClick={() => setTopupDraft({ amount: '', note: '' })}>
              Request top-up
            </HmsButton>
            <HmsButton variant="primary" icon={Banknote} block disabled={!shiftOpen} title={shiftOpen ? 'Take an advance deposit' : NO_SHIFT} onClick={startDeposit}>
              Collect deposit
            </HmsButton>
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  const step = (done: boolean, label: string, hint: React.ReactNode, action?: React.ReactNode, last?: boolean) => (
    <HmsRow
      last={last}
      label={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          {done ? <CheckCircle2 size={18} color="#16a34a" aria-hidden /> : <Circle size={18} color={HMS.textMuted} aria-hidden />}
          <span>{label}</span>
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{done ? '(done)' : '(to do)'}</span>
        </span>
      }
      hint={hint}
      value={action}
    />
  );

  const renderDischarge = (a: IpdAdmissionOverviewItem, d: IpdRunningBillSummary) => {
    const cleared = a.status === 'CLEARED';
    const claimPending = !!d.claim && (d.claim.pre_auth_status === 'PENDING' || d.claim.pre_auth_status === 'QUERY_RAISED');
    const needsFinalBill = d.bill_total > 0 && !d.final_invoice_number;
    const collectNext = nextPayable(d);
    const balanceDue = d.net_balance > 0;
    const blockers = [
      !d.checklist_complete && 'finish the checklist',
      claimPending && 'get the insurer’s final approval',
      needsFinalBill && 'consolidate the final bill',
      balanceDue && `collect ${money(d.net_balance)}`,
    ].filter(Boolean) as string[];
    const ready = !cleared && blockers.length === 0;
    const waited = minutesSince(d.discharge_date || null);
    return (
      <>
        <HmsStatStrip
          items={[
            { label: 'Final bill', value: d.final_invoice_number ? money(d.final_invoice_total) : money(d.bill_total), note: d.final_invoice_number || 'Not yet consolidated' },
            { label: 'Deposits', value: money(d.final_invoice_number ? d.final_invoice_paid : d.total_deposit_balance), note: d.final_invoice_number ? 'Applied to the bill' : 'Held' },
            { label: 'Insurer', value: d.has_tpa ? money(d.tpa_settled_amount > 0 ? d.tpa_settled_amount : d.tpa_preauth_amount) : '—', note: d.claim ? PREAUTH_LABEL[d.claim.pre_auth_status] : 'Self-pay' },
            { label: cleared ? 'Status' : balanceDue ? 'Balance due' : 'Balance', value: cleared ? 'Cleared' : money(Math.max(0, d.net_balance)), tone: cleared ? 'green' : balanceDue ? 'amber' : 'green', note: waited !== null && !cleared ? `Discharge started ${fmtAge(waited)} ago` : undefined },
          ]}
        />
        <HmsDetailBody>
          {cleared ? (
            <HmsNotice tone="green">
              Financially cleared{d.cleared_at ? ` on ${fmtDateTime(d.cleared_at)}` : ''}. Pass {d.gate_pass_token}
              {d.clearance_status === 'OVERRIDDEN' ? ` — issued with a balance, by supervisor override: “${d.override_reason}”` : ''}.
            </HmsNotice>
          ) : blockers.length ? (
            <HmsNotice tone="amber">Before the pass: {blockers.join(' · ')}.</HmsNotice>
          ) : (
            <HmsNotice tone="green">Everything is settled — the discharge pass can be issued.</HmsNotice>
          )}
          <HmsSection title="Discharge checklist">
            {d.checklist.map((c, i) => (
              <HmsRow
                key={c.key}
                last={i === d.checklist.length - 1}
                label={c.label}
                value={
                  <HmsButton size="sm" role="checkbox" aria-checked={c.done} variant={c.done ? 'secondary' : 'primary'} icon={c.done ? CheckCircle2 : Circle} disabled={busy || cleared} onClick={() => toggleChecklist(c.key, c.done)}>
                    {c.done ? 'Confirmed' : 'Confirm'}
                  </HmsButton>
                }
              />
            ))}
          </HmsSection>
          <HmsSection title="Steps to the pass">
            {step(d.checklist_complete, 'Checklist confirmed', `${d.checklist.filter((c) => c.done).length} of ${d.checklist.length} confirmed`)}
            {step(!claimPending, 'Insurer final approval', d.claim ? `${d.claim.claim_number} · ${PREAUTH_LABEL[d.claim.pre_auth_status]}` : 'Self-pay — not needed')}
            {step(
              !needsFinalBill,
              'Final bill consolidated',
              d.final_invoice_number ? `${d.final_invoice_number} · ${money(d.final_invoice_total)}` : d.bill_total > 0 ? `${money(d.bill_total)} of charges to bill` : 'No charges on this stay',
              needsFinalBill && !cleared ? (
                <HmsButton size="sm" icon={FileCheck2} disabled={!d.checklist_complete || claimPending} title={!d.checklist_complete ? 'Finish the checklist first' : claimPending ? 'Wait for the insurer’s decision' : undefined} onClick={() => setConsolidateOpen({ note: '', confirmed: false })}>
                  Consolidate
                </HmsButton>
              ) : undefined
            )}
            {step(
              !balanceDue,
              'Balance settled',
              balanceDue ? `${money(d.net_balance)} to collect from the patient${d.open_invoices_total > 0 ? ` (incl. ${money(d.open_invoices_total)} unpaid invoices)` : ''}` : d.net_balance < 0 ? `${money(-d.net_balance)} excess deposit to refund at the cashier` : 'Nothing due',
              balanceDue && !cleared && !needsFinalBill && collectNext ? (
                <HmsButton size="sm" icon={Banknote} disabled={!shiftOpen} title={shiftOpen ? undefined : NO_SHIFT} onClick={collectNext}>
                  Collect
                </HmsButton>
              ) : undefined
            )}
            {step(cleared, 'Discharge pass issued', cleared ? d.gate_pass_token : 'Security checks this pass at the exit', undefined, true)}
          </HmsSection>
          {invoicesSection(d)}
          {coverSection(a, d)}
        </HmsDetailBody>
        <HmsDetailFooter>
          {cleared ? (
            <HmsButton
              block
              icon={Printer}
              onClick={() =>
                setPass({
                  pass_number: d.gate_pass_token || '',
                  patient_name: a.name,
                  admission_number: a.ip,
                  uhid: a.uhid,
                  ward_name: d.ward_name,
                  bed_number: d.bed_number,
                  cleared_at: d.cleared_at,
                  is_override: d.clearance_status === 'OVERRIDDEN',
                  override_reason: d.override_reason,
                })
              }
            >
              View discharge pass
            </HmsButton>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: canOverride && balanceDue && !needsFinalBill ? '1fr 1fr' : '1fr', gap: '10px' }}>
              {canOverride && balanceDue && !needsFinalBill && (
                <HmsButton variant="danger" icon={ShieldAlert} block disabled={!d.checklist_complete || claimPending} onClick={() => setOverrideDraft({ reason: '' })}>
                  Override balance
                </HmsButton>
              )}
              <HmsButton variant="primary" icon={LogOut} block disabled={!ready || busy} title={ready ? 'Issue the financial discharge pass' : `First ${blockers.join(', ')}`} onClick={() => issuePass()}>
                Issue discharge pass
              </HmsButton>
            </div>
          )}
        </HmsDetailFooter>
      </>
    );
  };

  const renderDetail = () => {
    if (data.loading && !all.length) return <HmsEmpty>Loading inpatients…</HmsEmpty>;
    if (!active) return <HmsEmpty>{base.length ? 'Select an inpatient from the list.' : mode === 'running' ? 'No inpatients are admitted.' : 'No discharges in progress.'}</HmsEmpty>;
    const d = detail;
    return (
      <>
        <HmsDetailHeader
          avatar={active.name
            .split(/\s+/)
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
          title={active.name}
          badge={<HmsBadge tone={STATUS_TONE[active.status]}>{ADMISSION_LABEL[active.status]}</HmsBadge>}
          subtitle={`${active.ip} · ${active.uhid} · ${active.ward} · Day ${active.day}${d?.consultant && d.consultant !== 'Treating Consultant' ? ` · ${d.consultant}` : ''}`}
        />
        {!d ? <HmsEmpty>{detailFailed || 'Loading the running bill…'}</HmsEmpty> : mode === 'running' ? renderRunning(active, d) : renderDischarge(active, d)}
      </>
    );
  };

  const pillDefs =
    mode === 'running'
      ? [
          { key: 'all', label: 'All', count: base.length },
          { key: 'over', label: 'Over 80% cover', count: base.filter(overCover).length, tone: 'amber' as const },
          { key: 'cashless', label: 'Cashless', count: base.filter((a) => a.claim_number).length },
          { key: 'self', label: 'Self-pay', count: base.filter((a) => !a.claim_number).length },
        ]
      : [
          { key: 'pending', label: 'To clear', count: base.filter((a) => a.status === 'MEDICALLY_DISCHARGED').length, tone: 'amber' as const },
          { key: 'insurer', label: 'Awaiting insurer', count: base.filter((a) => a.status === 'AWAITING_TPA').length },
          { key: 'cleared', label: 'Cleared', count: base.filter((a) => a.status === 'CLEARED').length },
        ];

  return (
    <>
      <HmsMasterDetail
        listId={`ipd-${mode}`}
        title={mode === 'running' ? 'Running bills' : 'Discharge clearance'}
        description={mode === 'running' ? 'Every admitted patient’s bill against their deposit and insurer cover.' : 'Patients whose discharge has started: checklist, final bill, balance and exit pass.'}
        total={base.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search patient, IP no, UHID, ward or claim"
        pills={pillDefs}
        activePill={pill}
        onPill={(p) => {
          setPill(p);
          setSelected(null);
        }}
        selectedKey={activeKey}
        onSelect={setSelected}
        primaryLabel="open bill"
        detailLabel={mode === 'running' ? 'Running bill' : 'Discharge clearance'}
        emptyText={mode === 'running' ? 'No inpatients match this search or filter.' : 'No discharges match this search or filter.'}
        renderDetail={renderDetail}
      />

      {chargeDraft && active && (
        <HmsModal
          title="Post a charge"
          description={`${active.name} · ${active.ip}. Room, nursing and doctor-visit charges post automatically every night.`}
          onClose={() => setChargeDraft(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setChargeDraft(null)} disabled={busy}>
                Cancel
              </HmsButton>
              <HmsButton variant="primary" icon={PlusCircle} onClick={saveCharge} disabled={busy}>
                {busy ? 'Posting…' : `Post ${Number(chargeDraft.qty) * Number(chargeDraft.price) > 0 ? format(Number(chargeDraft.qty) * Number(chargeDraft.price)) : 'charge'}`}
              </HmsButton>
            </>
          }
        >
          {chargeDraft.error && <HmsNotice tone="red">{chargeDraft.error}</HmsNotice>}
          <HmsField label="Charge type" required>
            <select style={INPUT} value={chargeDraft.type} onChange={(e) => setChargeDraft({ ...chargeDraft, type: e.target.value, error: undefined })}>
              {LEDGER_TYPES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </HmsField>
          <HmsField label="Description" required>
            <input style={INPUT} value={chargeDraft.description} onChange={(e) => setChargeDraft({ ...chargeDraft, description: e.target.value, error: undefined })} placeholder="e.g. Central line insertion" />
          </HmsField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <HmsField label="Quantity" required>
              <input type="number" min={1} step={1} style={INPUT} value={chargeDraft.qty} onChange={(e) => setChargeDraft({ ...chargeDraft, qty: e.target.value, error: undefined })} />
            </HmsField>
            <HmsField label="Unit price" required>
              <input type="number" min={0} step="0.01" style={INPUT} value={chargeDraft.price} onChange={(e) => setChargeDraft({ ...chargeDraft, price: e.target.value, error: undefined })} />
            </HmsField>
            <HmsField label="Service date" required>
              <input type="date" max={today()} style={INPUT} value={chargeDraft.date} onChange={(e) => setChargeDraft({ ...chargeDraft, date: e.target.value, error: undefined })} />
            </HmsField>
          </div>
        </HmsModal>
      )}

      {topupDraft && active && (
        <HmsModal
          title="Request a deposit top-up"
          description={`${active.name} · bill ${money(active.ledger)} against ${money(active.deposit)} deposit${active.preauth ? ` and ${money(active.preauth)} insurer cover` : ''}.`}
          onClose={() => setTopupDraft(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setTopupDraft(null)} disabled={busy}>
                Cancel
              </HmsButton>
              <HmsButton variant="primary" icon={Send} onClick={saveTopup} disabled={busy}>
                {busy ? 'Issuing…' : 'Issue top-up notice'}
              </HmsButton>
            </>
          }
        >
          {topupDraft.error && <HmsNotice tone="red">{topupDraft.error}</HmsNotice>}
          <HmsField label="Amount to ask for" hint="Leave blank and the system asks for enough to cover the bill plus a buffer.">
            <input type="number" min={0} step="1" style={INPUT} value={topupDraft.amount} onChange={(e) => setTopupDraft({ ...topupDraft, amount: e.target.value, error: undefined })} />
          </HmsField>
          <HmsField label="Note to the attendant">
            <textarea style={TEXTAREA} value={topupDraft.note} onChange={(e) => setTopupDraft({ ...topupDraft, note: e.target.value })} placeholder="e.g. Surgery scheduled tomorrow; please deposit before 10 am." />
          </HmsField>
        </HmsModal>
      )}

      {consolidateOpen && active && detail && (
        <HmsModal
          title="Consolidate the final bill"
          description={`${active.name} · ${active.ip}. Turns every posted charge into one final invoice and applies the deposits.`}
          onClose={() => setConsolidateOpen(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setConsolidateOpen(null)} disabled={busy}>
                Cancel
              </HmsButton>
              <HmsButton variant="primary" icon={FileCheck2} onClick={consolidate} disabled={busy || !consolidateOpen.confirmed}>
                {busy ? 'Consolidating…' : 'Create final bill'}
              </HmsButton>
            </>
          }
        >
          {consolidateOpen.error && <HmsNotice tone="red">{consolidateOpen.error}</HmsNotice>}
          <HmsSection title="Estimate">
            <HmsRow label="Ward charges" value={money(detail.ledger_total)} hint={`${detail.items_count} lines`} />
            {detail.department_total > 0 && <HmsRow label="Department charges" value={money(detail.department_total)} hint={`${detail.department_charges.length} lab, pharmacy and service lines`} />}
            <HmsRow label="Deposits applied" value={`− ${money(Math.min(detail.total_deposit_balance, detail.bill_total))}`} />
            {detail.has_tpa && <HmsRow label="Insurer approved" value={`− ${money(detail.tpa_preauth_amount)}`} />}
            {detail.open_invoices_total > 0 && <HmsRow label="Earlier unpaid invoices" value={`+ ${money(detail.open_invoices_total)}`} hint="Paid separately, still needed before the pass" />}
            <HmsRow label={detail.net_balance > 0 ? 'Patient pays' : 'Excess deposit'} value={<strong>{money(Math.abs(detail.net_balance))}</strong>} last />
          </HmsSection>
          <HmsNotice tone="amber">The final bill can be created only once. Charges posted after it will not be on it.</HmsNotice>
          <HmsField label="Note">
            <input style={INPUT} value={consolidateOpen.note} onChange={(e) => setConsolidateOpen({ ...consolidateOpen, note: e.target.value })} />
          </HmsField>
          <HmsToggle showLabel checked={consolidateOpen.confirmed} onChange={(v) => setConsolidateOpen({ ...consolidateOpen, confirmed: v, error: undefined })} label="Lab, pharmacy returns and OT charges are all posted." />
        </HmsModal>
      )}

      {overrideDraft && active && detail && (
        <HmsModal
          title="Discharge with a balance?"
          description={`${active.name} still owes ${money(detail.net_balance)}.`}
          onClose={() => setOverrideDraft(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setOverrideDraft(null)} disabled={busy} data-autofocus>
                Cancel
              </HmsButton>
              <HmsButton variant="danger" icon={ShieldAlert} onClick={() => issuePass(overrideDraft.reason.trim())} disabled={busy || overrideDraft.reason.trim().length < 10}>
                {busy ? 'Issuing…' : 'Override and issue pass'}
              </HmsButton>
            </>
          }
        >
          {overrideDraft.error && <HmsNotice tone="red">{overrideDraft.error}</HmsNotice>}
          <HmsNotice tone="red">The patient leaves without paying {money(detail.net_balance)}. The override and your reason go to the billing audit trail as a high-severity event.</HmsNotice>
          <HmsField label="Reason" required hint="At least 10 characters, e.g. who approved it and why.">
            <textarea style={TEXTAREA} value={overrideDraft.reason} onChange={(e) => setOverrideDraft({ reason: e.target.value })} placeholder="e.g. Charity discharge approved by the Medical Superintendent." />
          </HmsField>
        </HmsModal>
      )}

      {pay && active && (
        <HmsModal
          title={pay.target.kind === 'deposit' ? 'Take an advance deposit' : `Take payment · ${pay.target.number}`}
          description={
            pay.target.kind === 'deposit'
              ? `${active.name} · ${active.ip}. Held against the running bill and applied on the final bill.`
              : `${active.name} · ${money(pay.target.balance)} due${pay.target.final ? ' on the final bill' : ''}. The full balance is taken in one payment.`
          }
          onClose={() => setPay(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setPay(null)} disabled={busy}>
                Cancel
              </HmsButton>
              <HmsButton variant="primary" icon={pay.target.kind === 'deposit' ? Wallet : Banknote} onClick={savePay} disabled={busy || !shiftOpen}>
                {busy ? 'Saving…' : `Receive ${Number(pay.amount) > 0 ? money(Number(pay.amount)) : ''}`}
              </HmsButton>
            </>
          }
        >
          {pay.error && <HmsNotice tone="red">{pay.error}</HmsNotice>}
          {!shiftOpen && <HmsNotice tone="amber">{NO_SHIFT}.</HmsNotice>}
          <HmsField label="Amount" required hint={pay.target.kind === 'invoice' ? 'Equal to the invoice balance' : undefined}>
            <input type="number" min={0} step="1" style={INPUT} value={pay.amount} readOnly={pay.target.kind === 'invoice'} onChange={(e) => setPay({ ...pay, amount: e.target.value, error: undefined })} />
          </HmsField>
          <HmsField label="Paid by" required>
            <div role="radiogroup" aria-label="Paid by" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {TENDERS.map((t) => (
                <HmsButton key={t.value} role="radio" aria-checked={pay.tender === t.value} variant={pay.tender === t.value ? 'primary' : 'secondary'} onClick={() => setPay({ ...pay, tender: t.value, error: undefined })}>
                  {t.label}
                </HmsButton>
              ))}
            </div>
          </HmsField>
          <HmsField label={REF_LABEL[pay.tender]} required={pay.tender !== 'CASH'}>
            <input style={INPUT} value={pay.ref} onChange={(e) => setPay({ ...pay, ref: e.target.value, error: undefined })} />
          </HmsField>
          {data.shift?.counter_name && <HmsRow label="Posted to" value={data.shift.counter_name} last />}
        </HmsModal>
      )}

      <DischargeClearancePassModal isOpen={!!pass} onClose={() => setPass(null)} pass={pass} />
    </>
  );
};

