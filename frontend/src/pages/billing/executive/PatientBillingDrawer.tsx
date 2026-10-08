import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Clock, FileText, ShieldCheck, Wallet, Receipt, Trash2, FilePen, Stethoscope, FlaskConical, Pill, Layers } from 'lucide-react';
import { billingService, CashierPatientWorkspace, TariffItem, counterMode } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { useAuth } from '../../../context/AuthContext';
import { computeBillPreview, isCounterAdded, round2, CASHIER_DISCOUNT_CEILING_PERCENT, SUPERVISOR_LIMIT_AMOUNT, SUPERVISOR_LIMIT_PERCENT } from './cashierMath';
import { TariffServicePicker } from './TariffServicePicker';
import { Btn, C, Callout, Drawer, Empty, Field, Row, StatBadge, StatusChip, apiError, card, deptLabel, inputStyle, mono } from './executiveUi';
import { DiscountRequestDrawer } from './DiscountRequestDrawer';
import { PaymentCollectionDrawer, PaymentTarget, SettlementResult, SettlementResultModal } from './PaymentCollectionDrawer';

const ADMIN_ROLES = ['BILLING_ADMIN', 'BILLING_MANAGER', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'];
const DECISION_POLL_MS = 8000;

interface Props {
  uhid: string;
  counterCode?: string;
  /** Phase 4 shift guard: without the cashier's own open shift nothing can be collected. */
  shiftOpen?: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export const PatientBillingDrawer: React.FC<Props> = ({ uhid, counterCode, shiftOpen = true, onClose, onChanged }) => {
  const NO_SHIFT = 'Open your counter shift to collect';
  const { format: fmt } = useCurrency();
  const { role } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(String(role));
  // Phase 5: a supervisor applies discounts directly only within their limit and never in counter mode
  // (requests raised there route to Billing Admin). Admin tier applies directly.
  const directApply = isAdmin || (String(role) === 'BILLING_SUPERVISOR' && !counterMode.get());

  const [ws, setWs] = useState<CashierPatientWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheme, setScheme] = useState('0');
  const [customPct, setCustomPct] = useState('');
  const [showDiscount, setShowDiscount] = useState(false);
  const [payTarget, setPayTarget] = useState<PaymentTarget | null>(null);
  const [result, setResult] = useState<SettlementResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deposit, setDeposit] = useState<{ open: boolean; amount: string; mode: string; ref: string; busy: boolean }>({
    open: false, amount: '', mode: 'CASH', ref: '', busy: false
  });

  const [busy, setBusy] = useState<string | null>(null);
  // Charges seen on the previous load: new ones arrive selected, ones the cashier unticked stay unticked.
  const knownIds = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await billingService.getCashierPatientWorkspace(uhid);
      setWs(data);
      const ids = data.unbilled_charges.map((c) => c.id);
      setSelected((prev) => new Set(ids.filter((id) => !knownIds.current.has(id) || prev.has(id))));
      knownIds.current = new Set(ids);
    } catch (err) {
      setError(apiError(err, 'Could not load the patient billing workspace.'));
    } finally {
      setLoading(false);
    }
  }, [uhid]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingRequest = ws?.approval_requests.find((a) => a.status === 'PENDING' || a.status === 'ESCALATED');

  // Approval decision push: while a request is open, re-read the workspace so the supervisor's decision
  // unlocks collection without a manual refresh.
  useEffect(() => {
    if (!pendingRequest) return;
    const timer = setInterval(load, DECISION_POLL_MS);
    return () => clearInterval(timer);
  }, [pendingRequest, load]);

  const approvedRequests = (ws?.approval_requests || []).filter((a) => a.status === 'APPROVED' && !a.consumed);
  const approved = scheme.startsWith('apr:') ? approvedRequests.find((a) => a.id === scheme.slice(4)) : undefined;

  const discountPercent = approved
    ? approved.discount_percent
    : scheme === 'custom'
      ? parseFloat(customPct) || 0
      : parseFloat(scheme) || 0;

  const chosen = (ws?.unbilled_charges || []).filter((c) => selected.has(c.id));
  const bill = computeBillPreview(chosen, discountPercent);
  const withinSupervisorLimit = discountPercent <= SUPERVISOR_LIMIT_PERCENT && bill.discount <= SUPERVISOR_LIMIT_AMOUNT;
  const selfApplied = directApply && (isAdmin || withinSupervisorLimit);
  const overCeiling = discountPercent > CASHIER_DISCOUNT_CEILING_PERCENT && !approved && !selfApplied;
  const openBalance = round2((ws?.open_invoices || []).reduce((t, i) => t + i.balance, 0));

  let collectBlocker = '';
  if (!chosen.length) collectBlocker = 'Select at least one charge';
  else if (pendingRequest) collectBlocker = 'Collection unlocks when the supervisor decides';
  else if (overCeiling) collectBlocker = `Discounts above ${CASHIER_DISCOUNT_CEILING_PERCENT}% need supervisor approval`;
  // Drafts move no money, so they stay available without a shift
  const draftBlocker = collectBlocker;
  if (!collectBlocker && !shiftOpen) collectBlocker = NO_SHIFT;

  const discountReason = approved ? approved.reason : scheme === '5' ? 'Senior Citizen scheme' : scheme === '5s' ? 'Staff Family scheme' : scheme === 'custom' ? 'Supervisor discount' : '';

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const groupedCharges = useMemo(() => {
    if (!ws) return { opd: [], lab: [], pharmacy: [], other: [] };
    const charges = ws.unbilled_charges || [];
    const opd = charges.filter((c) => c.department.toUpperCase() === 'OPD');
    const lab = charges.filter((c) => c.department.toUpperCase() === 'LAB');
    const pharmacy = charges.filter((c) => c.department.toUpperCase() === 'PHARMACY');
    const other = charges.filter((c) => !['OPD', 'LAB', 'PHARMACY'].includes(c.department.toUpperCase()));
    return { opd, lab, pharmacy, other };
  }, [ws]);

  const toggleDept = (items: Array<any>) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = items.every((i) => next.has(i.id));
      if (allSelected) {
        items.forEach((i) => next.delete(i.id));
      } else {
        items.forEach((i) => next.add(i.id));
      }
      return next;
    });
  };

  const run = async (key: string, action: () => Promise<string | void>) => {
    setBusy(key);
    setError(null);
    try {
      const msg = await action();
      if (msg) setNotice(msg);
      await load();
      onChanged();
    } catch (err) {
      setError(apiError(err, 'Action failed.'));
    } finally {
      setBusy(null);
    }
  };

  const addService = (t: TariffItem) =>
    run('add', async () => {
      await billingService.addCounterService({ patient: ws!.patient.id, service_code: t.code, qty: 1 });
      return `${t.name} added at Tariff Master rate.`;
    });

  const removeService = (id: string, name: string) =>
    run(`rm-${id}`, async () => {
      await billingService.removeCounterService(id);
      return `${name} removed.`;
    });

  const saveDraft = () =>
    run('draft', async () => {
      const draft = await billingService.saveDraftInvoice({
        patient: ws!.patient.id,
        charge_ids: chosen.map((c) => c.id),
        discount_percent: discountPercent || undefined,
        discount_reason: discountReason,
        approval_request_id: approved?.id,
        counter_code: counterCode,
        encounter_type: ws!.encounter.type
      });
      setScheme('0');
      return `Draft ${draft.invoice_number || draft.invNo} saved to ${ws!.patient.name}'s account. Collect it any time from this drawer or the queue.`;
    });

  const discardDraft = (id: string, number: string) => {
    if (!window.confirm(`Discard ${number}? Its charges go back to the unbilled list.`)) return;
    run(`discard-${id}`, async () => {
      const r = await billingService.discardDraftInvoice(id);
      return `${number} discarded · ${r.released_charges} charge(s) back in the unbilled list.`;
    });
  };

  const submitDeposit = async () => {
    if (!ws) return;
    setDeposit((d) => ({ ...d, busy: true }));
    try {
      const dep = await billingService.createDeposit({
        patient: ws.patient.id,
        amount: parseFloat(deposit.amount),
        tender_mode: deposit.mode,
        transaction_reference: deposit.ref || undefined,
        counter_code: counterCode
      });
      setNotice(`Advance deposit ${(dep as any).deposit_number || ''} of ${fmt(parseFloat(deposit.amount))} recorded.`);
      setDeposit({ open: false, amount: '', mode: 'CASH', ref: '', busy: false });
      await load();
      onChanged();
    } catch (err) {
      setError(apiError(err, 'Deposit could not be recorded.'));
      setDeposit((d) => ({ ...d, busy: false }));
    }
  };

  if (result) {
    return (
      <SettlementResultModal
        result={result}
        onDone={() => {
          setResult(null);
          onChanged();
          onClose();
        }}
      />
    );
  }

  const p = ws?.patient;

  return (
    <>
      <Drawer
        title={p ? p.name : 'Patient billing'}
        subtitle={p ? <><span style={mono}>{p.uhid}</span> · {p.age_sex} · {p.mobile}</> : uhid}
        onClose={onClose}
        footer={
          ws && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: collectBlocker ? C.amber : C.muted }}>{collectBlocker || `${chosen.length} line(s) selected`}</span>
              <div style={{ display: 'flex', gap: 8 }}>
              <Btn disabled={!!draftBlocker || busy === 'draft'} onClick={saveDraft} title="Park this bill on the patient's account without issuing an invoice">
                <FilePen size={16} /> {busy === 'draft' ? 'Saving…' : 'Save draft'}
              </Btn>
              <Btn
                variant="primary"
                disabled={!!collectBlocker}
                onClick={() =>
                  setPayTarget({
                    kind: 'charges',
                    patient: ws.patient.id,
                    chargeIds: chosen.map((c) => c.id),
                    net: bill.net,
                    discountPercent: discountPercent || undefined,
                    discountReason,
                    approvalRequestId: approved?.id,
                    encounterType: ws.encounter.type
                  })
                }
              >
                Collect {fmt(bill.net)}
              </Btn>
              </div>
            </div>
          )
        }
      >
        {loading && <Empty text="Loading patient account…" />}
        {error && <Callout tone="red">{error}</Callout>}
        {notice && <Callout tone="green">{notice}</Callout>}

        {ws && (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <StatusChip status="AWAITING_BILL" label={ws.coverage.payer_label} />
              <StatusChip status={ws.encounter.type === 'IPD' ? 'CREDIT_AUTHORIZED' : 'AWAITING_BILL'} label={ws.encounter.type === 'IPD' ? `IPD · ${ws.encounter.admission_number}${ws.encounter.ward ? ' · ' + ws.encounter.ward : ''}` : 'OPD encounter'} />
              {ws.patient.allergies?.length > 0 && <StatusChip status="REJECTED" label={`Allergies: ${ws.patient.allergies.join(', ')}`} />}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
              {[
                ['Unbilled', fmt(ws.unbilled_total), <Clock size={14} key="c" />],
                ['Open balance', fmt(openBalance), <FileText size={14} key="f" />],
                ['Advance', fmt(ws.deposit_balance), <Wallet size={14} key="w" />],
                ['Past invoices', String(ws.invoice_history.length), <Receipt size={14} key="r" />]
              ].map(([label, value, icon]) => (
                <div key={label as string} style={{ ...card, padding: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: 12 }}>
                    {label}
                    {icon}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4, ...mono }}>{value}</div>
                </div>
              ))}
            </div>

            {pendingRequest && (
              <Callout tone="amber" title="Discount pending approval" icon={<Clock size={16} />}>
                {pendingRequest.request_number} · {pendingRequest.discount_percent}% · {pendingRequest.reason}
                {pendingRequest.status === 'ESCALATED' ? ' · escalated to Billing Admin' : ''}
              </Callout>
            )}
            {ws.open_invoices.length > 0 && (
              <Callout tone="amber" title="Outstanding invoices" icon={<AlertTriangle size={16} />}>
                {ws.open_invoices.length} invoice(s) with {fmt(openBalance)} unpaid. Settle them from the list below.
              </Callout>
            )}

            {/* Unbilled charges */}
            <section style={{ ...card }}>
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Unbilled charges</span>
                <span style={{ fontSize: 12, color: C.muted }}>Prices from Tariff Master</span>
              </div>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
                <TariffServicePicker onPick={addService} disabled={busy === 'add'} />
              </div>
              {ws.unbilled_charges.length === 0 && <Empty text="No unbilled charges for this patient." />}
              {ws.unbilled_charges.length > 0 && (
                <>
                  {/* OPD Consultations */}
                  {groupedCharges.opd.length > 0 && (
                    <div>
                      <div
                        style={{
                          padding: '8px 14px',
                          background: '#EFF6FF',
                          borderBottom: `1px solid ${C.border}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#1E40AF' }}>
                          <Stethoscope size={15} /> OPD Consultations ({groupedCharges.opd.length})
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: C.muted, ...mono }}>
                            {fmt(groupedCharges.opd.reduce((s, c) => s + Number(c.total_amount), 0))}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleDept(groupedCharges.opd)}
                            style={{ fontSize: 12, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                          >
                            {groupedCharges.opd.every((c) => selected.has(c.id)) ? 'Deselect all' : 'Select all'}
                          </button>
                        </div>
                      </div>
                      {groupedCharges.opd.map((c) => {
                        const counter = isCounterAdded(c.source_reference_id);
                        return (
                          <label
                            key={c.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '20px 1fr auto auto',
                              gap: 10,
                              alignItems: 'center',
                              padding: '10px 14px',
                              borderBottom: `1px solid ${C.border}`,
                              cursor: 'pointer',
                              background: selected.has(c.id) ? '#FFFFFF' : '#FAFAFA'
                            }}
                          >
                            <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                              <span style={{ fontSize: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
                                {c.service_name} {c.priority === 'STAT' && <StatBadge />}
                              </span>
                              <span style={{ fontSize: 12, color: C.muted, ...mono }}>
                                {c.service_code} · {c.quantity} × {fmt(c.unit_price)} · {counter ? 'Added at counter' : c.source_reference_id || 'OPD check-in'}
                              </span>
                            </div>
                            <span style={{ fontSize: 14, ...mono }}>{fmt(c.total_amount)}</span>
                            {counter ? (
                              <button
                                title="Remove counter-added line"
                                aria-label={`Remove ${c.service_name}`}
                                disabled={busy === `rm-${c.id}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  removeService(c.id, c.service_name);
                                }}
                                style={{ border: 'none', background: 'transparent', color: C.muted, cursor: 'pointer', padding: 2, display: 'flex' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            ) : (
                              <span style={{ width: 19 }} />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Laboratory Diagnostic Tests */}
                  {groupedCharges.lab.length > 0 && (
                    <div>
                      <div
                        style={{
                          padding: '8px 14px',
                          background: '#ECFDF5',
                          borderBottom: `1px solid ${C.border}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#047857' }}>
                          <FlaskConical size={15} /> Diagnostic Laboratory ({groupedCharges.lab.length})
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: C.muted, ...mono }}>
                            {fmt(groupedCharges.lab.reduce((s, c) => s + Number(c.total_amount), 0))}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleDept(groupedCharges.lab)}
                            style={{ fontSize: 12, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                          >
                            {groupedCharges.lab.every((c) => selected.has(c.id)) ? 'Deselect all' : 'Select all'}
                          </button>
                        </div>
                      </div>
                      {groupedCharges.lab.map((c) => {
                        const counter = isCounterAdded(c.source_reference_id);
                        return (
                          <label
                            key={c.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '20px 1fr auto auto',
                              gap: 10,
                              alignItems: 'center',
                              padding: '10px 14px',
                              borderBottom: `1px solid ${C.border}`,
                              cursor: 'pointer',
                              background: selected.has(c.id) ? '#FFFFFF' : '#FAFAFA'
                            }}
                          >
                            <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                              <span style={{ fontSize: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
                                {c.service_name} {c.priority === 'STAT' && <StatBadge />}
                              </span>
                              <span style={{ fontSize: 12, color: C.muted, ...mono }}>
                                {c.service_code} · {c.quantity} × {fmt(c.unit_price)} · {counter ? 'Added at counter' : c.source_reference_id || 'Lab requisition'}
                              </span>
                            </div>
                            <span style={{ fontSize: 14, ...mono }}>{fmt(c.total_amount)}</span>
                            {counter ? (
                              <button
                                title="Remove counter-added line"
                                aria-label={`Remove ${c.service_name}`}
                                disabled={busy === `rm-${c.id}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  removeService(c.id, c.service_name);
                                }}
                                style={{ border: 'none', background: 'transparent', color: C.muted, cursor: 'pointer', padding: 2, display: 'flex' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            ) : (
                              <span style={{ width: 19 }} />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Pharmacy Formulary Medicines */}
                  {groupedCharges.pharmacy.length > 0 && (
                    <div>
                      <div
                        style={{
                          padding: '8px 14px',
                          background: '#F5F3FF',
                          borderBottom: `1px solid ${C.border}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#6D28D9' }}>
                          <Pill size={15} /> Pharmacy Formulary ({groupedCharges.pharmacy.length})
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: C.muted, ...mono }}>
                            {fmt(groupedCharges.pharmacy.reduce((s, c) => s + Number(c.total_amount), 0))}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleDept(groupedCharges.pharmacy)}
                            style={{ fontSize: 12, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                          >
                            {groupedCharges.pharmacy.every((c) => selected.has(c.id)) ? 'Deselect all' : 'Select all'}
                          </button>
                        </div>
                      </div>
                      {groupedCharges.pharmacy.map((c) => {
                        const counter = isCounterAdded(c.source_reference_id);
                        return (
                          <label
                            key={c.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '20px 1fr auto auto',
                              gap: 10,
                              alignItems: 'center',
                              padding: '10px 14px',
                              borderBottom: `1px solid ${C.border}`,
                              cursor: 'pointer',
                              background: selected.has(c.id) ? '#FFFFFF' : '#FAFAFA'
                            }}
                          >
                            <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                              <span style={{ fontSize: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
                                {c.service_name} {c.priority === 'STAT' && <StatBadge />}
                              </span>
                              <span style={{ fontSize: 12, color: C.muted, ...mono }}>
                                {c.service_code} · {c.quantity} × {fmt(c.unit_price)} · {counter ? 'Added at counter' : c.source_reference_id || 'Prescription dispense'}
                              </span>
                            </div>
                            <span style={{ fontSize: 14, ...mono }}>{fmt(c.total_amount)}</span>
                            {counter ? (
                              <button
                                title="Remove counter-added line"
                                aria-label={`Remove ${c.service_name}`}
                                disabled={busy === `rm-${c.id}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  removeService(c.id, c.service_name);
                                }}
                                style={{ border: 'none', background: 'transparent', color: C.muted, cursor: 'pointer', padding: 2, display: 'flex' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            ) : (
                              <span style={{ width: 19 }} />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* General / Other Services */}
                  {groupedCharges.other.length > 0 && (
                    <div>
                      <div
                        style={{
                          padding: '8px 14px',
                          background: '#F8FAFC',
                          borderBottom: `1px solid ${C.border}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: C.textSub }}>
                          <Layers size={15} /> General Services ({groupedCharges.other.length})
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: C.muted, ...mono }}>
                            {fmt(groupedCharges.other.reduce((s, c) => s + Number(c.total_amount), 0))}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleDept(groupedCharges.other)}
                            style={{ fontSize: 12, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                          >
                            {groupedCharges.other.every((c) => selected.has(c.id)) ? 'Deselect all' : 'Select all'}
                          </button>
                        </div>
                      </div>
                      {groupedCharges.other.map((c) => {
                        const counter = isCounterAdded(c.source_reference_id);
                        return (
                          <label
                            key={c.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '20px 1fr auto auto',
                              gap: 10,
                              alignItems: 'center',
                              padding: '10px 14px',
                              borderBottom: `1px solid ${C.border}`,
                              cursor: 'pointer',
                              background: selected.has(c.id) ? '#FFFFFF' : '#FAFAFA'
                            }}
                          >
                            <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                              <span style={{ fontSize: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
                                {c.service_name} {c.priority === 'STAT' && <StatBadge />}
                              </span>
                              <span style={{ fontSize: 12, color: C.muted, ...mono }}>
                                {deptLabel(c.department)} · {c.service_code} · {c.quantity} × {fmt(c.unit_price)} · {counter ? 'Added at counter' : c.source_reference_id || 'Service'}
                              </span>
                            </div>
                            <span style={{ fontSize: 14, ...mono }}>{fmt(c.total_amount)}</span>
                            {counter ? (
                              <button
                                title="Remove counter-added line"
                                aria-label={`Remove ${c.service_name}`}
                                disabled={busy === `rm-${c.id}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  removeService(c.id, c.service_name);
                                }}
                                style={{ border: 'none', background: 'transparent', color: C.muted, cursor: 'pointer', padding: 2, display: 'flex' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            ) : (
                              <span style={{ width: 19 }} />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {ws.unbilled_charges.length > 0 && (
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <Field label="Discount">
                      <select style={inputStyle} value={scheme} onChange={(e) => setScheme(e.target.value)} disabled={!!pendingRequest}>
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
                    </Field>
                    {scheme === 'custom' && (
                      <Field label="Percent">
                        <input style={{ ...inputStyle, width: 90 }} inputMode="decimal" value={customPct} onChange={(e) => setCustomPct(e.target.value)} />
                      </Field>
                    )}
                    {!pendingRequest && (!directApply || overCeiling) && (
                      <Btn variant="ghost" onClick={() => setShowDiscount(true)} disabled={bill.gross <= 0}>
                        Request higher discount
                      </Btn>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Row label="Gross" value={fmt(bill.gross)} />
                    <Row label={`Discount${bill.discountPercent ? ` (${bill.discountPercent}%)` : ''}`} value={`− ${fmt(bill.discount)}`} />
                    <Row label="GST" value={fmt(bill.tax)} />
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                      <Row label="Net payable" value={fmt(bill.net)} strong />
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Drafts parked on the account (not fiscal invoices yet) */}
            {ws.draft_invoices.length > 0 && (
              <section style={{ ...card, borderColor: C.amberBorder }}>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Saved drafts</span>
                  <span style={{ fontSize: 12, color: C.muted }}>Invoice number issued on collection</span>
                </div>
                {ws.draft_invoices.map((d) => (
                  <div key={d.id} style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={mono}>{d.invoice_number}</span> <StatusChip status="DRAFT" />
                        </span>
                        <span style={{ fontSize: 12, color: C.muted }}>
                          {d.items.map((it) => it.description).join(', ')}
                          {d.discount > 0 ? ` · discount ${fmt(d.discount)}` : ''}
                        </span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 600, ...mono }}>{fmt(d.total)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Btn variant="danger" style={{ height: 32, fontSize: 13 }} disabled={busy === `discard-${d.id}`} onClick={() => discardDraft(d.id, d.invoice_number)}>
                        Discard
                      </Btn>
                      <Btn variant="primary" style={{ height: 32, fontSize: 13 }} disabled={!shiftOpen} title={shiftOpen ? undefined : NO_SHIFT} onClick={() => setPayTarget({ kind: 'draft', draftId: d.id, draftNumber: d.invoice_number, total: d.total })}>
                        Collect {fmt(d.total)}
                      </Btn>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Open invoices */}
            {ws.open_invoices.length > 0 && (
              <section style={{ ...card }}>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 14 }}>Open invoices</div>
                {ws.open_invoices.map((inv) => (
                  <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 14, ...mono }}>{inv.invoice_number}</span>
                      <span style={{ fontSize: 12, color: C.muted }}>{inv.date} · {inv.summary || inv.category}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StatusChip status={inv.status} />
                      <Btn
                        style={{ height: 32, fontSize: 13 }}
                        disabled={!shiftOpen}
                        title={shiftOpen ? undefined : NO_SHIFT}
                        onClick={() => setPayTarget({ kind: 'invoice', invoiceId: inv.id, invoiceNumber: inv.invoice_number, balance: inv.balance })}
                      >
                        Collect {fmt(inv.balance)}
                      </Btn>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Advance deposit */}
            <section style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Advance &amp; deposit</span>
                {!deposit.open && (
                  <Btn style={{ height: 32, fontSize: 13 }} disabled={!shiftOpen} title={shiftOpen ? undefined : NO_SHIFT} onClick={() => setDeposit((d) => ({ ...d, open: true }))}>
                    Add deposit
                  </Btn>
                )}
              </div>
              <Row label="Advance balance" value={fmt(ws.deposit_balance)} />
              {deposit.open && (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Field label="Amount">
                      <input style={{ ...inputStyle, ...mono }} inputMode="decimal" placeholder="0.00" value={deposit.amount} onChange={(e) => setDeposit((d) => ({ ...d, amount: e.target.value }))} />
                    </Field>
                    <Field label="Tender">
                      <select style={inputStyle} value={deposit.mode} onChange={(e) => setDeposit((d) => ({ ...d, mode: e.target.value }))}>
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="UPI">UPI</option>
                      </select>
                    </Field>
                    {deposit.mode !== 'CASH' && (
                      <Field label={deposit.mode === 'UPI' ? 'UPI UTR' : 'Card auth / ref'}>
                        <input style={inputStyle} value={deposit.ref} onChange={(e) => setDeposit((d) => ({ ...d, ref: e.target.value }))} />
                      </Field>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Btn onClick={() => setDeposit((d) => ({ ...d, open: false }))}>Cancel</Btn>
                    <Btn
                      variant="primary"
                      disabled={deposit.busy || !(parseFloat(deposit.amount) > 0) || (deposit.mode !== 'CASH' && !deposit.ref.trim())}
                      onClick={submitDeposit}
                    >
                      Accept deposit
                    </Btn>
                  </div>
                </>
              )}
            </section>

            {/* Coverage */}
            <section style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} color={C.muted} /> Coverage
              </span>
              <Row label="Payer" value={ws.coverage.payer_label} />
              <Row label="Eligible schemes" value={ws.coverage.eligible_schemes.join(', ') || '—'} />
              <Row label="Cashier discount ceiling" value={`${ws.coverage.cashier_discount_ceiling_percent}%`} />
            </section>

            {/* History */}
            <section style={{ ...card }}>
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 14 }}>Previous invoices</div>
              {ws.invoice_history.length === 0 && <Empty text="First visit." />}
              {ws.invoice_history.slice(0, 8).map((h) => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 13, ...mono }}>{h.invoice_number}</span>
                    <span style={{ fontSize: 12, color: C.muted }}>{h.date} · {h.summary || h.category}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 13, ...mono }}>{fmt(h.total)}</span>
                    <StatusChip status={h.status} />
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </Drawer>

      {showDiscount && ws && (
        <DiscountRequestDrawer
          patientId={ws.patient.id}
          patientName={ws.patient.name}
          gross={bill.gross}
          onClose={() => setShowDiscount(false)}
          onSubmitted={(req) => {
            setShowDiscount(false);
            setNotice(`Discount request ${req.request_number} sent to the Billing Supervisor.`);
            load();
            onChanged();
          }}
        />
      )}

      {payTarget && ws && (
        <PaymentCollectionDrawer
          target={payTarget}
          patientName={ws.patient.name}
          uhid={ws.patient.uhid}
          depositBalance={ws.deposit_balance}
          counterCode={counterCode}
          onClose={() => setPayTarget(null)}
          onSettled={(r) => {
            setPayTarget(null);
            setResult(r);
          }}
        />
      )}
    </>
  );
};
