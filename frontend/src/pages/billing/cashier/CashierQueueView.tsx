// Billing · Cashier — the billing queue (left) and the selected patient's account (right):
// unbilled charges by department, add a counter service, discount schemes / approved requests, drafts, unpaid invoices,
// advance deposit and coverage. Money is taken in the payment dialog; nothing opens as an overlay drawer.
import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, FilePen, Percent, Search, Trash2, Wallet, ExternalLink, CheckSquare, Square } from 'lucide-react';
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
  INPUT,
  TEXTAREA,
  HMS,
  resolveActiveKey,
} from '../../../components/hms';
import { billingService, CashierPatientWorkspace, CashierQueueRow, TariffItem, counterMode } from '../../../services/billingService';
import { useAuth } from '../../../context/AuthContext';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { computeBillPreview, discountLimitText, isCounterAdded, round2, CASHIER_DISCOUNT_CEILING_PERCENT, SUPERVISOR_LIMIT_AMOUNT, SUPERVISOR_LIMIT_PERCENT } from '../executive/cashierMath';
import { CashierDeskData, deptName, fmtTime, fmtWait } from './cashierDeskData';
import { CashierPaymentModal, CashierPayTarget, CashierSettlement, CashierSettlementModal } from './CashierPaymentModal';

export interface CashierQueueViewProps {
  data: CashierDeskData;
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
  shiftOpen: boolean;
  counterCode?: string;
  onOpenIpd: (admission?: string) => void;
}

const ADMIN_ROLES = ['BILLING_ADMIN', 'BILLING_MANAGER', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'];
const PILL_KEYS = ['all', 'stat', 'OPD', 'LAB', 'PHARMACY', 'RADIOLOGY', 'IPD', 'drafts'];
const SCHEMES: Record<string, [number, string]> = { '0': [0, ''], '5': [5, 'Senior Citizen scheme'], '5s': [5, 'Staff Family scheme'] };
const DISCOUNT_REASONS = ['Senior Citizen (extended)', 'Financial hardship', 'Staff referral', 'Repeat visit within 7 days'];
const NO_SHIFT = 'Open your counter shift to take money';
const has = (q: string, values: (string | null | undefined)[]) => !q || values.some((v) => (v || '').toLowerCase().includes(q));
const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px' };

export const CashierQueueView: React.FC<CashierQueueViewProps> = ({ data, notify, initialFilter, initialSelect, shiftOpen, counterCode, onOpenIpd }) => {
  const { format } = useCurrency();
  const { role } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(String(role));
  // A supervisor applies a custom discount directly within their limit, never in counter mode; admins always
  const directApply = isAdmin || (String(role) === 'BILLING_SUPERVISOR' && !counterMode.get());

  // A patient looked up by UHID (paying an old bill, or opened from an OPD visit) joins the list until the queue has them
  const [lookup, setLookup] = useState<CashierQueueRow | null>(null);
  const queueRows = data.queue?.rows || [];
  const rowsAll = lookup && !queueRows.some((r) => r.uhid === lookup.uhid) ? [lookup, ...queueRows] : queueRows;
  const [lookingUp, setLookingUp] = useState(false);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILL_KEYS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `p:${initialSelect}` : null);
  const [accounts, setAccounts] = useState<Record<string, CashierPatientWorkspace>>({});
  const [accountError, setAccountError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, Set<string>>>({});
  const [scheme, setScheme] = useState('0');
  const [customPct, setCustomPct] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const [tariffQ, setTariffQ] = useState('');
  const [tariffHits, setTariffHits] = useState<TariffItem[]>([]);
  const [pay, setPay] = useState<CashierPayTarget | null>(null);
  const [settled, setSettled] = useState<CashierSettlement | null>(null);
  const [discountDraft, setDiscountDraft] = useState<{ pct: string; reason: string; note: string; error?: string } | null>(null);
  const [depositDraft, setDepositDraft] = useState<{ amount: string; mode: 'CASH' | 'CARD' | 'UPI'; ref: string; error?: string } | null>(null);
  const [discardDraft, setDiscardDraft] = useState<{ id: string; number: string } | null>(null);

  const q = search.trim().toLowerCase();
  const pillMatch = (r: CashierQueueRow, p: string) =>
    p === 'all' ? true : p === 'stat' ? r.is_stat : p === 'drafts' ? r.status === 'DRAFT' : r.sources.includes(p);
  const visible = rowsAll.filter((r) => pillMatch(r, pill) && has(q, [r.patient_name, r.uhid, r.mobile, r.token, r.summary]));

  const rows: HmsListRow[] = visible.map((r) => ({
    key: `p:${r.uhid}`,
    title: r.patient_name,
    badge: r.status === 'LOOKUP' ? <HmsBadge tone="blue">Looked up</HmsBadge> : r.status === 'DRAFT' ? <HmsBadge tone="blue">Draft</HmsBadge> : r.is_stat ? <HmsBadge tone="red">STAT</HmsBadge> : <HmsBadge tone="gray">{r.sources.map(deptName).join(' + ')}</HmsBadge>,
    sub: `${r.uhid} · ${r.age_sex}${r.mobile ? ` · ${r.mobile}` : ''}`,
    metaLeft: r.status === 'LOOKUP' ? r.payer_label : `${r.payer_label} · waiting ${fmtWait(r.wait_minutes)}`,
    metaRight: `${r.items_count} item${r.items_count === 1 ? '' : 's'} · ${format(r.amount)}`,
  }));

  const activeKey = resolveActiveKey(rows, selected);
  const activeRow = activeKey ? rowsAll.find((r) => `p:${r.uhid}` === activeKey) : undefined;
  const ws = activeRow ? accounts[activeRow.uhid] : undefined;
  const sig = activeRow ? `${activeRow.uhid}:${activeRow.amount}:${activeRow.items_count}:${activeRow.status}` : '';

  const loadAccount = async (uhid: string) => {
    const w = await billingService.getCashierPatientWorkspace(uhid);
    setAccounts((prev) => ({ ...prev, [uhid]: w }));
    // New charges arrive ticked; ones the cashier unticked stay unticked
    const known = new Set((accounts[uhid]?.unbilled_charges || []).map((c) => c.id));
    setPicked((prev) => {
      const before = prev[uhid];
      return { ...prev, [uhid]: new Set(w.unbilled_charges.map((c) => c.id).filter((id) => !before || !known.has(id) || before.has(id))) };
    });
    setAccountError(null);
  };

  useEffect(() => {
    if (!activeRow) return;
    let cancelled = false;
    billingService.getCashierPatientWorkspace(activeRow.uhid).then(
      (w) => {
        if (cancelled) return;
        setAccounts((prev) => (JSON.stringify(prev[activeRow.uhid]) === JSON.stringify(w) ? prev : { ...prev, [activeRow.uhid]: w }));
        setPicked((prev) => (prev[activeRow.uhid] ? prev : { ...prev, [activeRow.uhid]: new Set(w.unbilled_charges.map((c) => c.id)) }));
        setAccountError(null);
      },
      (e) => !cancelled && setAccountError(apiError(e, 'The patient account could not be loaded.'))
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // Counter service search (Tariff Master)
  useEffect(() => {
    const term = tariffQ.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      billingService.getTariffs({ search: term, is_active: true }).then(
        (list) => !cancelled && setTariffHits((list || []).slice(0, 8)),
        () => !cancelled && setTariffHits([])
      );
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [tariffQ]);

  const lookupPatient = async (term: string) => {
    const uhid = term.trim();
    if (!uhid) return;
    setLookingUp(true);
    try {
      const w = await billingService.getCashierPatientWorkspace(uhid);
      setAccounts((prev) => ({ ...prev, [w.patient.uhid]: w }));
      setPicked((prev) => ({ ...prev, [w.patient.uhid]: new Set(w.unbilled_charges.map((c) => c.id)) }));
      setLookup({
        patient_id: w.patient.id,
        patient_name: w.patient.name,
        uhid: w.patient.uhid,
        mobile: w.patient.mobile,
        age_sex: w.patient.age_sex,
        payer_type: w.coverage.payer_type,
        payer_label: w.coverage.payer_label,
        sources: Array.from(new Set(w.unbilled_charges.map((c) => (c.department || 'GENERAL').toUpperCase()))),
        is_stat: w.unbilled_charges.some((c) => c.priority === 'STAT'),
        token: '',
        charge_ids: w.unbilled_charges.map((c) => c.id),
        items_count: w.unbilled_charges.length,
        amount: w.unbilled_total + w.open_invoices.reduce((t, i) => t + i.balance, 0),
        wait_minutes: 0,
        summary: 'Looked up at the counter',
        status: 'LOOKUP',
      });
      setPill('all');
      setSearch('');
      setSelected(`p:${w.patient.uhid}`);
    } catch (e) {
      notify(apiError(e, `No patient found for ${uhid}`), 'error');
    } finally {
      setLookingUp(false);
    }
  };

  // Opened from an OPD visit (or a link) for a patient who is not in the queue: look them up once the queue is in
  const [lookedUpInitial, setLookedUpInitial] = useState(false);
  useEffect(() => {
    if (lookedUpInitial || !initialSelect || !data.queue) return;
    Promise.resolve().then(() => {
      setLookedUpInitial(true);
      if (!data.queue!.rows.some((r) => r.uhid === initialSelect)) lookupPatient(initialSelect);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.queue, initialSelect, lookedUpInitial]);

  /* ---------------- bill maths ---------------- */
  const chosenIds = activeRow ? picked[activeRow.uhid] || new Set<string>() : new Set<string>();
  const chosen = (ws?.unbilled_charges || []).filter((c) => chosenIds.has(c.id));
  const pendingRequest = ws?.approval_requests.find((a) => a.status === 'PENDING' || a.status === 'ESCALATED');
  const approvedRequests = (ws?.approval_requests || []).filter((a) => a.status === 'APPROVED' && !a.consumed);
  const approved = scheme.startsWith('apr:') ? approvedRequests.find((a) => a.id === scheme.slice(4)) : undefined;
  const discountPercent = approved ? approved.discount_percent : scheme === 'custom' ? parseFloat(customPct) || 0 : SCHEMES[scheme]?.[0] || 0;
  const bill = computeBillPreview(chosen, discountPercent);
  const withinSupervisorLimit = discountPercent <= SUPERVISOR_LIMIT_PERCENT && bill.discount <= SUPERVISOR_LIMIT_AMOUNT;
  const selfApplied = directApply && (isAdmin || withinSupervisorLimit);
  const overCeiling = discountPercent > CASHIER_DISCOUNT_CEILING_PERCENT && !approved && !selfApplied;
  const discountReason = approved ? approved.reason : SCHEMES[scheme]?.[1] || (scheme === 'custom' ? 'Supervisor discount' : '');
  const openBalance = round2((ws?.open_invoices || []).reduce((t, i) => t + i.balance, 0));

  let draftBlocker = '';
  if (!chosen.length) draftBlocker = 'Tick at least one charge';
  else if (pendingRequest) draftBlocker = 'Waiting for the supervisor’s discount decision';
  else if (overCeiling) draftBlocker = `Discounts above ${CASHIER_DISCOUNT_CEILING_PERCENT}% need supervisor approval`;
  const collectBlocker = draftBlocker || (!shiftOpen ? NO_SHIFT : '');

  const groups = useMemo(() => {
    const m = new Map<string, CashierPatientWorkspace['unbilled_charges']>();
    for (const c of ws?.unbilled_charges || []) {
      const k = (c.department || 'GENERAL').toUpperCase();
      m.set(k, [...(m.get(k) || []), c]);
    }
    return Array.from(m.entries());
  }, [ws]);

  /* ---------------- actions ---------------- */
  const run = async (key: string, fn: () => Promise<string>) => {
    if (!activeRow) return false;
    setBusy(key);
    try {
      notify(await fn());
      await loadAccount(activeRow.uhid).catch(() => undefined);
      await data.reload();
      return true;
    } catch (e) {
      notify(apiError(e, 'The action failed'), 'error');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const toggle = (id: string) =>
    activeRow &&
    setPicked((prev) => {
      const n = new Set(prev[activeRow.uhid] || []);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return { ...prev, [activeRow.uhid]: n };
    });
  const toggleGroup = (ids: string[]) =>
    activeRow &&
    setPicked((prev) => {
      const n = new Set(prev[activeRow.uhid] || []);
      const all = ids.every((id) => n.has(id));
      ids.forEach((id) => (all ? n.delete(id) : n.add(id)));
      return { ...prev, [activeRow.uhid]: n };
    });

  const addService = (t: TariffItem) =>
    run('add', async () => {
      await billingService.addCounterService({ patient: ws!.patient.id, service_code: t.code, qty: 1 });
      setTariffQ('');
      setTariffHits([]);
      return `${t.name} added at the Tariff Master rate`;
    });

  const saveDraft = () =>
    run('draft', async () => {
      const d = await billingService.saveDraftInvoice({
        patient: ws!.patient.id,
        charge_ids: chosen.map((c) => c.id),
        discount_percent: discountPercent || undefined,
        discount_reason: discountReason,
        approval_request_id: approved?.id,
        counter_code: counterCode,
        encounter_type: ws!.encounter.type,
      });
      setScheme('0');
      return `Draft ${d.invoice_number || d.invNo} saved to ${ws!.patient.name}'s account`;
    });

  const sendDiscount = async () => {
    if (!ws || !discountDraft) return;
    const p = parseFloat(discountDraft.pct) || 0;
    if (p <= CASHIER_DISCOUNT_CEILING_PERCENT || p > 100) return setDiscountDraft({ ...discountDraft, error: `Ask for more than ${CASHIER_DISCOUNT_CEILING_PERCENT}% and at most 100%.` });
    if (!discountDraft.reason) return setDiscountDraft({ ...discountDraft, error: 'Choose a reason.' });
    const ok = await run('discount', async () => {
      const req = await billingService.createApprovalRequest({ patient: ws.patient.id, bill_gross: bill.gross, discount_percent: p, reason: discountDraft.reason, notes: discountDraft.note });
      return `Discount request ${req.request_number} sent to the Billing Supervisor`;
    });
    if (ok) setDiscountDraft(null);
  };

  const saveDeposit = async () => {
    if (!ws || !depositDraft) return;
    const amt = parseFloat(depositDraft.amount);
    if (!(amt > 0)) return setDepositDraft({ ...depositDraft, error: 'Enter the amount received.' });
    if (depositDraft.mode !== 'CASH' && !depositDraft.ref.trim()) return setDepositDraft({ ...depositDraft, error: depositDraft.mode === 'UPI' ? 'Enter the UPI UTR.' : 'Enter the card approval code.' });
    const ok = await run('deposit', async () => {
      const d = await billingService.createDeposit({ patient: ws.patient.id, amount: amt, tender_mode: depositDraft.mode, transaction_reference: depositDraft.ref.trim() || undefined, counter_code: counterCode });
      return `Advance ${(d as { deposit_number?: string }).deposit_number || ''} of ${format(amt)} received`;
    });
    if (ok) setDepositDraft(null);
  };

  const confirmDiscard = async () => {
    if (!discardDraft) return;
    const ok = await run('discard', async () => {
      const r = await billingService.discardDraftInvoice(discardDraft.id);
      return `${discardDraft.number} discarded · ${r.released_charges} charge(s) back in the unbilled list`;
    });
    if (ok) setDiscardDraft(null);
  };

  /* ---------------- detail ---------------- */
  const renderDetail = () => {
    if (data.loading && !rowsAll.length) return <HmsEmpty>Loading the billing queue…</HmsEmpty>;
    if (!activeRow) return <HmsEmpty>{rowsAll.length ? 'Select a patient from the queue.' : 'Nobody is waiting to be billed. New OPD, lab, pharmacy and radiology charges appear here as they are raised.'}</HmsEmpty>;
    const header = (
      <HmsDetailHeader
        avatar={activeRow.patient_name
          .split(/\s+/)
          .map((x) => x[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()}
        title={activeRow.patient_name}
        badge={activeRow.is_stat ? <HmsBadge tone="red">STAT</HmsBadge> : <HmsBadge tone="gray">{activeRow.payer_label}</HmsBadge>}
        subtitle={`${activeRow.uhid} · ${activeRow.age_sex}${activeRow.mobile ? ` · ${activeRow.mobile}` : ''}`}
      />
    );
    if (!ws) return (
      <>
        {header}
        <HmsEmpty>{accountError || 'Loading the patient account…'}</HmsEmpty>
      </>
    );
    const inpatient = ws.encounter.type === 'IPD';
    return (
      <>
        {header}
        <HmsStatStrip
          items={[
            { label: 'Unbilled', value: format(ws.unbilled_total), note: `${ws.unbilled_charges.length} charge${ws.unbilled_charges.length === 1 ? '' : 's'}` },
            { label: 'Unpaid invoices', value: format(openBalance), note: `${ws.open_invoices.length} open`, tone: openBalance > 0 ? 'amber' : 'default' },
            { label: 'Advance', value: format(ws.deposit_balance), note: 'Usable as a tender', tone: ws.deposit_balance > 0 ? 'green' : 'default' },
            { label: 'Past invoices', value: ws.invoice_history.length, note: ws.coverage.payer_label },
          ]}
        />
        <HmsDetailBody>
          {ws.patient.allergies?.length > 0 && <HmsNotice tone="red">Allergies: {ws.patient.allergies.join(', ')}</HmsNotice>}
          {inpatient && (
            <HmsNotice
              tone="blue"
              action={
                <HmsButton size="sm" icon={ExternalLink} onClick={() => onOpenIpd(ws.encounter.admission_number || undefined)}>
                  IPD desk
                </HmsButton>
              }
            >
              Admitted · {ws.encounter.admission_number}
              {ws.encounter.ward ? ` · ${ws.encounter.ward}` : ''}. Unbilled charges go on the IPD final bill — take only what the family wants to pay now.
            </HmsNotice>
          )}
          {pendingRequest && (
            <HmsNotice tone="amber">
              Discount {pendingRequest.request_number} for {pendingRequest.discount_percent}% is with the supervisor{pendingRequest.status === 'ESCALATED' ? ' (escalated to Billing Admin)' : ''}. Collection unlocks once they decide.
            </HmsNotice>
          )}

          <HmsSection title={`Unbilled charges (${ws.unbilled_charges.length})`} right={<span style={{ fontSize: '12px', color: HMS.textSecondary }}>Prices from Tariff Master</span>}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${HMS.divider}`, position: 'relative' }}>
              <label htmlFor="cashier-tariff" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                Add a counter service
              </label>
              <Search size={18} color={HMS.primary} style={{ position: 'absolute', left: 26, top: 23 }} aria-hidden />
              <input
                id="cashier-tariff"
                style={{ ...INPUT, paddingLeft: '38px' }}
                placeholder="Add a service — search the Tariff Master"
                value={tariffQ}
                onChange={(e) => {
                  setTariffQ(e.target.value);
                  if (e.target.value.trim().length < 2) setTariffHits([]);
                }}
                disabled={busy === 'add'}
              />
              {tariffHits.length > 0 && tariffQ.trim().length >= 2 && (
                <div role="listbox" aria-label="Matching services" style={{ marginTop: '8px', border: `1px solid ${HMS.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                  {tariffHits.map((t) => (
                    <button
                      key={t.code}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => addService(t)}
                      style={{ display: 'flex', width: '100%', justifyContent: 'space-between', gap: '12px', padding: '10px 12px', border: 'none', borderBottom: `1px solid ${HMS.divider}`, background: '#ffffff', cursor: 'pointer', fontSize: '14px', textAlign: 'left' }}
                    >
                      <span>
                        {t.name}
                        <span style={{ display: 'block', ...mono, color: HMS.textSecondary }}>
                          {t.code} · {deptName(t.department)}
                        </span>
                      </span>
                      <span style={{ fontWeight: 600 }}>{format(Number(t.base_price))}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!ws.unbilled_charges.length && <HmsRow label="No unbilled charges" hint="Search above to bill a counter service." last />}
            {groups.map(([dept, items]) => {
              const ids = items.map((c) => c.id);
              const allOn = ids.every((id) => chosenIds.has(id));
              return (
                <div key={dept}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: HMS.subtle, borderBottom: `1px solid ${HMS.divider}` }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: HMS.label }}>
                      {deptName(dept)} ({items.length}) · {format(items.reduce((s, c) => s + Number(c.total_amount), 0))}
                    </span>
                    <HmsButton size="sm" variant="ghost" onClick={() => toggleGroup(ids)}>
                      {allOn ? 'Untick all' : 'Tick all'}
                    </HmsButton>
                  </div>
                  {items.map((c, i) => {
                    const on = chosenIds.has(c.id);
                    const counter = isCounterAdded(c.source_reference_id);
                    return (
                      <HmsRow
                        key={c.id}
                        last={i === items.length - 1}
                        label={
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            onClick={() => toggle(c.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontSize: '14px', color: HMS.text, textAlign: 'left' }}
                          >
                            {on ? <CheckSquare size={18} color={HMS.primary} aria-hidden /> : <Square size={18} color={HMS.textMuted} aria-hidden />}
                            <span>
                              {c.service_name} {c.priority === 'STAT' && <HmsBadge tone="red">STAT</HmsBadge>}
                            </span>
                          </button>
                        }
                        hint={`${c.service_code} · ${c.quantity} × ${format(c.unit_price)} · ${counter ? 'added at the counter' : fmtTime(c.created_at)}`}
                        value={
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            {format(c.total_amount)}
                            {counter && (
                              <HmsButton size="sm" variant="ghost" icon={Trash2} aria-label={`Remove ${c.service_name}`} title="Remove counter-added line" disabled={busy === `rm-${c.id}`} onClick={() => run(`rm-${c.id}`, async () => (await billingService.removeCounterService(c.id), `${c.service_name} removed`))} />
                            )}
                          </span>
                        }
                      />
                    );
                  })}
                </div>
              );
            })}
          </HmsSection>

          {ws.unbilled_charges.length > 0 && (
            <HmsSection title="Bill" padded>
              <div style={{ display: 'grid', gridTemplateColumns: scheme === 'custom' ? '2fr 1fr' : '1fr', gap: '12px' }}>
                <HmsField label="Discount" hint={ws.coverage.eligible_schemes.length ? `Eligible: ${ws.coverage.eligible_schemes.join(', ')}` : undefined}>
                  <select style={INPUT} value={scheme} onChange={(e) => setScheme(e.target.value)} disabled={!!pendingRequest}>
                    <option value="0">No discount</option>
                    <option value="5">Senior Citizen scheme · 5%</option>
                    <option value="5s">Staff Family scheme · 5%</option>
                    {approvedRequests.map((a) => (
                      <option key={a.id} value={`apr:${a.id}`}>
                        Approved {a.request_number} · {a.discount_percent}%
                      </option>
                    ))}
                    {directApply && <option value="custom">Custom (supervisor)</option>}
                  </select>
                </HmsField>
                {scheme === 'custom' && (
                  <HmsField label="Percent">
                    <input style={INPUT} inputMode="decimal" value={customPct} onChange={(e) => setCustomPct(e.target.value)} />
                  </HmsField>
                )}
              </div>
              <div style={{ marginTop: '12px' }}>
                <HmsRow label="Gross" value={format(bill.gross)} hint={`${chosen.length} of ${ws.unbilled_charges.length} charges ticked`} />
                <HmsRow label={`Discount${bill.discountPercent ? ` (${bill.discountPercent}%)` : ''}`} value={`− ${format(bill.discount)}`} />
                <HmsRow label="GST" value={format(bill.tax)} />
                <HmsRow label="Net payable" value={<strong style={{ fontSize: '16px' }}>{format(bill.net)}</strong>} last />
              </div>
              {!pendingRequest && (!directApply || overCeiling) && (
                <div style={{ marginTop: '10px' }}>
                  <HmsButton size="sm" icon={Percent} disabled={bill.gross <= 0} onClick={() => setDiscountDraft({ pct: '15', reason: '', note: '' })}>
                    Request a higher discount
                  </HmsButton>
                </div>
              )}
            </HmsSection>
          )}

          {ws.draft_invoices.length > 0 && (
            <HmsSection title={`Saved drafts (${ws.draft_invoices.length})`} right={<span style={{ fontSize: '12px', color: HMS.textSecondary }}>Invoice number issued on payment</span>}>
              {ws.draft_invoices.map((d, i) => (
                <HmsRow
                  key={d.id}
                  last={i === ws.draft_invoices.length - 1}
                  label={<span style={mono}>{d.invoice_number}</span>}
                  hint={`${d.items.map((it) => it.description).join(', ')}${d.discount > 0 ? ` · discount ${format(d.discount)}` : ''}`}
                  value={
                    <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                      <strong>{format(d.total)}</strong>
                      <HmsButton size="sm" variant="danger" onClick={() => setDiscardDraft({ id: d.id, number: d.invoice_number })}>
                        Discard
                      </HmsButton>
                      <HmsButton size="sm" variant="primary" icon={Banknote} disabled={!shiftOpen} title={shiftOpen ? undefined : NO_SHIFT} onClick={() => setPay({ kind: 'draft', draftId: d.id, draftNumber: d.invoice_number, total: d.total })}>
                        Collect
                      </HmsButton>
                    </span>
                  }
                />
              ))}
            </HmsSection>
          )}

          {ws.open_invoices.length > 0 && (
            <HmsSection title={`Unpaid invoices (${ws.open_invoices.length})`} right={<span style={{ fontSize: '12px', color: '#b45309' }}>{format(openBalance)} due</span>}>
              {ws.open_invoices.map((inv, i) => (
                <HmsRow
                  key={inv.id}
                  last={i === ws.open_invoices.length - 1}
                  label={<span style={mono}>{inv.invoice_number}</span>}
                  hint={`${inv.date} · ${inv.summary || deptName(inv.category)} · ${format(inv.paid)} paid of ${format(inv.total)}`}
                  value={
                    <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                      <strong>{format(inv.balance)}</strong>
                      <HmsButton size="sm" icon={Banknote} disabled={!shiftOpen} title={shiftOpen ? undefined : NO_SHIFT} onClick={() => setPay({ kind: 'invoice', invoiceId: inv.id, invoiceNumber: inv.invoice_number, balance: inv.balance })}>
                        Collect
                      </HmsButton>
                    </span>
                  }
                />
              ))}
            </HmsSection>
          )}

          <HmsSection title="Advance & coverage" defaultOpen={false}>
            <HmsRow
              label="Advance balance"
              value={
                <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                  {format(ws.deposit_balance)}
                  <HmsButton size="sm" icon={Wallet} disabled={!shiftOpen} title={shiftOpen ? 'Take an advance deposit' : NO_SHIFT} onClick={() => setDepositDraft({ amount: '', mode: 'CASH', ref: '' })}>
                    Take advance
                  </HmsButton>
                </span>
              }
            />
            <HmsRow label="Payer" value={ws.coverage.payer_label} />
            <HmsRow label="Eligible schemes" value={ws.coverage.eligible_schemes.join(', ') || '—'} />
            <HmsRow label="Your discount ceiling" value={`${ws.coverage.cashier_discount_ceiling_percent}%`} last />
          </HmsSection>
        </HmsDetailBody>
        {ws.unbilled_charges.length > 0 && (
          <HmsDetailFooter>
            {collectBlocker && <div style={{ fontSize: '12px', color: '#b45309', marginBottom: '8px' }}>{collectBlocker}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
              <HmsButton icon={FilePen} block disabled={!!draftBlocker || busy === 'draft'} title="Park this bill on the patient's account without issuing an invoice" onClick={saveDraft}>
                {busy === 'draft' ? 'Saving…' : 'Save draft'}
              </HmsButton>
              <HmsButton
                variant="primary"
                icon={Banknote}
                block
                disabled={!!collectBlocker}
                onClick={() =>
                  setPay({
                    kind: 'charges',
                    patient: ws.patient.id,
                    chargeIds: chosen.map((c) => c.id),
                    net: bill.net,
                    discountPercent: discountPercent || undefined,
                    discountReason,
                    approvalRequestId: approved?.id,
                    encounterType: ws.encounter.type,
                  })
                }
              >
                Collect {format(bill.net)}
              </HmsButton>
            </div>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  const counts = data.queue?.department_counts || {};
  const pillDefs = [
    { key: 'all', label: 'All', count: rowsAll.length },
    { key: 'stat', label: 'STAT', count: rowsAll.filter((r) => r.is_stat).length, tone: 'red' as const },
    ...(['OPD', 'LAB', 'PHARMACY', 'RADIOLOGY', 'IPD'] as const).map((k) => ({ key: k, label: deptName(k), count: counts[k] ?? rowsAll.filter((r) => r.sources.includes(k)).length })),
    { key: 'drafts', label: 'Drafts', count: rowsAll.filter((r) => r.status === 'DRAFT').length },
  ].filter((p) => p.key === 'all' || p.key === pill || p.count > 0);

  return (
    <>
      <HmsMasterDetail
        listId="cashier-queue"
        title="Billing queue"
        description="Patients with charges to bill — STAT first, then the longest wait."
        total={rowsAll.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search name, UHID, mobile, token or service"
        pills={pillDefs}
        activePill={pill}
        onPill={(p) => {
          setPill(p);
          setSelected(null);
        }}
        selectedKey={activeKey}
        onSelect={(k) => {
          setSelected(k);
          setScheme('0');
          setTariffQ('');
          setTariffHits([]);
        }}
        leftExtra={
          q.length >= 4 && !visible.length ? (
            <div style={{ padding: '0 20px 12px' }}>
              <HmsButton size="sm" icon={Search} disabled={lookingUp} onClick={() => lookupPatient(search)}>
                {lookingUp ? 'Looking up…' : `Find patient ${search.trim()} by UHID`}
              </HmsButton>
            </div>
          ) : undefined
        }
        primaryLabel="open account"
        detailLabel="Patient account"
        emptyText="Nobody in the queue matches this search or filter."
        renderDetail={renderDetail}
      />

      {pay && ws && (
        <CashierPaymentModal
          target={pay}
          patientName={ws.patient.name}
          uhid={ws.patient.uhid}
          depositBalance={ws.deposit_balance}
          counterCode={counterCode}
          onClose={() => setPay(null)}
          onSettled={(r) => {
            setPay(null);
            setSettled(r);
            setScheme('0');
            if (activeRow) loadAccount(activeRow.uhid).catch(() => undefined);
            data.reload();
          }}
        />
      )}
      {settled && <CashierSettlementModal result={settled} onDone={() => setSettled(null)} />}

      {discountDraft && ws && (
        <HmsModal
          title="Request a higher discount"
          description={`${ws.patient.name} · bill ${format(bill.gross)}. The Billing Supervisor decides; collection waits until then.`}
          onClose={() => setDiscountDraft(null)}
          busy={busy === 'discount'}
          footer={
            <>
              <HmsButton onClick={() => setDiscountDraft(null)}>Cancel</HmsButton>
              <HmsButton variant="primary" icon={Percent} onClick={sendDiscount} disabled={busy === 'discount'}>
                Send for approval
              </HmsButton>
            </>
          }
        >
          {discountDraft.error && <HmsNotice tone="red">{discountDraft.error}</HmsNotice>}
          <HmsField label="Discount (%)" required hint={discountLimitText(parseFloat(discountDraft.pct) || 0, bill.gross)}>
            <input style={INPUT} inputMode="decimal" value={discountDraft.pct} onChange={(e) => setDiscountDraft({ ...discountDraft, pct: e.target.value, error: undefined })} />
          </HmsField>
          <HmsField label="Reason" required>
            <select style={INPUT} value={discountDraft.reason} onChange={(e) => setDiscountDraft({ ...discountDraft, reason: e.target.value, error: undefined })}>
              <option value="">Choose a reason…</option>
              {DISCOUNT_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </HmsField>
          <HmsField label="Note for the supervisor">
            <textarea style={TEXTAREA} value={discountDraft.note} onChange={(e) => setDiscountDraft({ ...discountDraft, note: e.target.value })} />
          </HmsField>
          {(parseFloat(discountDraft.pct) || 0) > 0 && <HmsNotice tone="blue">Value {format(round2((bill.gross * (parseFloat(discountDraft.pct) || 0)) / 100))}</HmsNotice>}
        </HmsModal>
      )}

      {depositDraft && ws && (
        <HmsModal
          title="Take an advance deposit"
          description={`${ws.patient.name} · held on the account and usable as a tender on any bill.`}
          onClose={() => setDepositDraft(null)}
          busy={busy === 'deposit'}
          footer={
            <>
              <HmsButton onClick={() => setDepositDraft(null)}>Cancel</HmsButton>
              <HmsButton variant="primary" icon={Wallet} onClick={saveDeposit} disabled={busy === 'deposit'}>
                Receive {(parseFloat(depositDraft.amount) || 0) > 0 ? format(parseFloat(depositDraft.amount)) : ''}
              </HmsButton>
            </>
          }
        >
          {depositDraft.error && <HmsNotice tone="red">{depositDraft.error}</HmsNotice>}
          <HmsField label="Amount" required>
            <input style={INPUT} inputMode="decimal" value={depositDraft.amount} onChange={(e) => setDepositDraft({ ...depositDraft, amount: e.target.value, error: undefined })} />
          </HmsField>
          <HmsField label="Paid by" required>
            <div role="radiogroup" aria-label="Paid by" style={{ display: 'flex', gap: '8px' }}>
              {(['CASH', 'CARD', 'UPI'] as const).map((m) => (
                <HmsButton key={m} role="radio" aria-checked={depositDraft.mode === m} variant={depositDraft.mode === m ? 'primary' : 'secondary'} onClick={() => setDepositDraft({ ...depositDraft, mode: m, error: undefined })}>
                  {m === 'CASH' ? 'Cash' : m === 'CARD' ? 'Card' : 'UPI'}
                </HmsButton>
              ))}
            </div>
          </HmsField>
          {depositDraft.mode !== 'CASH' && (
            <HmsField label={depositDraft.mode === 'UPI' ? 'UPI UTR' : 'Card approval code'} required>
              <input style={INPUT} value={depositDraft.ref} onChange={(e) => setDepositDraft({ ...depositDraft, ref: e.target.value, error: undefined })} />
            </HmsField>
          )}
        </HmsModal>
      )}

      {discardDraft && (
        <HmsModal
          title={`Discard ${discardDraft.number}?`}
          description="Its charges go back to the unbilled list. Nothing is cancelled for the patient."
          onClose={() => setDiscardDraft(null)}
          busy={busy === 'discard'}
          footer={
            <>
              <HmsButton onClick={() => setDiscardDraft(null)} data-autofocus>
                Keep draft
              </HmsButton>
              <HmsButton variant="danger" icon={Trash2} onClick={confirmDiscard} disabled={busy === 'discard'}>
                Discard draft
              </HmsButton>
            </>
          }
        >
          <HmsNotice tone="amber">The draft number is not reused; the bill can be raised again from the unbilled charges.</HmsNotice>
        </HmsModal>
      )}
    </>
  );
};

