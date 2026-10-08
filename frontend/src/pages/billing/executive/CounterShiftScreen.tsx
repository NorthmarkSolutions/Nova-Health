import React, { useCallback, useEffect, useState } from 'react';
import { Banknote, Coins, CreditCard, QrCode, Undo2, ArrowDownToLine, Lock, RefreshCw } from 'lucide-react';
import { billingService, ShiftSummary } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import {
  DRAWER_DENOMINATIONS,
  DenominationInput,
  PICKUP_THRESHOLD_PERCENT,
  denominationPayload,
  denominationTotal,
  reconcileDrawer,
  TENDER_COLORS,
  TenderMode
} from './cashierMath';
import { Btn, C, Callout, Drawer, Empty, Field, KpiCard, PageHeader, StatusChip, apiError, card, inputStyle, mono } from './executiveUi';

const MIN_NOTE = 5;

export const DenominationTable: React.FC<{ value: DenominationInput; onChange: (v: DenominationInput) => void }> = ({ value, onChange }) => {
  const { format: fmt } = useCurrency();
  const set = (k: keyof DenominationInput, v: string) => onChange({ ...value, [k]: v.replace(/[^\d.]/g, '') });
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr', gap: 10, padding: '8px 12px', background: C.bg, fontSize: 12, color: C.muted }}>
        <span>Note</span>
        <span>Count</span>
        <span style={{ textAlign: 'right' }}>Subtotal</span>
      </div>
      {DRAWER_DENOMINATIONS.map((d) => (
        <div key={d} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr', gap: 10, alignItems: 'center', padding: '6px 12px', borderTop: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 14, ...mono }}>₹{d}</span>
          <input aria-label={`₹${d} notes`} inputMode="numeric" placeholder="0" style={{ ...inputStyle, height: 32, ...mono }} value={value[d] ?? ''} onChange={(e) => set(d, e.target.value.replace(/\D/g, ''))} />
          <span style={{ textAlign: 'right', fontSize: 14, ...mono }}>{fmt(d * (parseInt(value[d] || '0') || 0))}</span>
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr', gap: 10, alignItems: 'center', padding: '6px 12px', borderTop: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 14 }}>Coins</span>
        <input aria-label="Coins amount" inputMode="decimal" placeholder="₹ amount" style={{ ...inputStyle, height: 32, ...mono }} value={value.coins ?? ''} onChange={(e) => set('coins', e.target.value)} />
        <span style={{ textAlign: 'right', fontSize: 14, ...mono }}>{fmt(parseFloat(value.coins || '0') || 0)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderTop: `1px solid ${C.border}`, background: C.bg, fontWeight: 600 }}>
        <span>Total counted</span>
        <span style={mono}>{fmt(denominationTotal(value))}</span>
      </div>
    </div>
  );
};

const varText = (v: number, fmt: (n: number) => string) => (Math.abs(v) < 0.005 ? fmt(0) : `${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}`);

const ClosingDrawer: React.FC<{ shift: ShiftSummary; onClose: () => void; onSubmitted: () => void }> = ({ shift, onClose, onSubmitted }) => {
  const { format: fmt } = useCurrency();
  const [counts, setCounts] = useState<DenominationInput>({});
  const [edc, setEdc] = useState('');
  const [upi, setUpi] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cash = denominationTotal(counts);
  const entered = cash > 0 && edc !== '' && upi !== '';
  const rec = reconcileDrawer(
    { cash: shift.expected_cash_in_drawer, card: shift.card_collected, upi: shift.upi_collected },
    { cash, card: parseFloat(edc) || 0, upi: parseFloat(upi) || 0 }
  );
  const blocker = !entered ? 'Enter the cash count, EDC batch and UPI settlement totals' : !rec.matched && note.trim().length < MIN_NOTE ? 'Explain the variance' : '';

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await billingService.submitShiftClosing({ denominations: denominationPayload(counts), card_total: parseFloat(edc) || 0, upi_total: parseFloat(upi) || 0, notes: note.trim() });
      onSubmitted();
    } catch (err) {
      setError(apiError(err, 'Closing could not be submitted.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      title="Submit counter closing"
      subtitle={`${shift.counter_name || shift.counter_code} · sent to the Billing Supervisor for sign-off`}
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: blocker ? C.amber : rec.matched ? C.green : C.red }}>{blocker || (rec.matched ? 'All tenders match' : `Net variance ${varText(rec.net, fmt)}`)}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" disabled={!!blocker || busy} onClick={submit}>
              {busy ? 'Submitting…' : 'Submit for sign-off'}
            </Btn>
          </div>
        </div>
      }
    >
      {error && <Callout tone="red">{error}</Callout>}
      <span style={{ fontSize: 13, color: C.muted }}>Count the drawer note by note, including the opening float.</span>
      <DenominationTable value={counts} onChange={setCounts} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Field label="EDC batch total (₹)">
          <input inputMode="decimal" placeholder="0.00" style={{ ...inputStyle, ...mono }} value={edc} onChange={(e) => setEdc(e.target.value.replace(/[^\d.]/g, ''))} />
        </Field>
        <Field label="UPI settlement total (₹)">
          <input inputMode="decimal" placeholder="0.00" style={{ ...inputStyle, ...mono }} value={upi} onChange={(e) => setUpi(e.target.value.replace(/[^\d.]/g, ''))} />
        </Field>
      </div>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 8, padding: '8px 12px', background: C.bg, fontSize: 12, color: C.muted }}>
          <span>Tender</span><span style={{ textAlign: 'right' }}>System</span><span style={{ textAlign: 'right' }}>Counted</span><span style={{ textAlign: 'right' }}>Variance</span>
        </div>
        {rec.rows.map((r) => {
          const show = r.tender === 'CASH' ? cash > 0 : r.tender === 'CARD' ? edc !== '' : upi !== '';
          const ok = Math.abs(r.variance) < 0.005;
          return (
            <div key={r.tender} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 8, padding: '8px 12px', borderTop: `1px solid ${C.border}`, fontSize: 14 }}>
              <span>{r.tender === 'CARD' ? 'Card (EDC)' : r.tender === 'CASH' ? 'Cash' : 'UPI'}</span>
              <span style={{ textAlign: 'right', ...mono }}>{fmt(r.expected)}</span>
              <span style={{ textAlign: 'right', ...mono }}>{show ? fmt(r.counted) : '—'}</span>
              <span style={{ textAlign: 'right', fontWeight: 600, color: !show ? C.faint : ok ? C.green : C.red, ...mono }}>{show ? varText(r.variance, fmt) : '—'}</span>
            </div>
          );
        })}
      </div>
      {entered && !rec.matched && (
        <Field label="Variance explanation" hint="Required when any tender does not match. The supervisor sees this note.">
          <textarea rows={3} style={{ ...inputStyle, height: 'auto', padding: 10 }} placeholder="What happened and what you checked" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      )}
    </Drawer>
  );
};

const OpenCounterPanel: React.FC<{ shift: ShiftSummary | null; onOpened: () => void }> = ({ shift, onOpened }) => {
  const { format: fmt } = useCurrency();
  const counters = shift?.counters || [];
  const [code, setCode] = useState('');
  const [counts, setCounts] = useState<DenominationInput>({ 500: '10' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const free = counters.filter((c) => !c.occupied_by);
  const chosen = code || free[0]?.code || '';
  const total = denominationTotal(counts);

  const open = async () => {
    setBusy(true);
    setError(null);
    try {
      await billingService.openShift({ counter_code: chosen, denominations: denominationPayload(counts) });
      onOpened();
    } catch (err) {
      setError(apiError(err, 'Counter could not be opened.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...card, padding: 20, maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Lock size={18} color={C.amber} />
        <span style={{ fontSize: 16, fontWeight: 600 }}>Open your counter</span>
      </div>
      <span style={{ fontSize: 14, color: C.muted }}>Billing, payments and deposits stay locked until you open a shift and declare your opening float.</span>
      {error && <Callout tone="red">{error}</Callout>}
      <Field label="Counter">
        <select style={inputStyle} value={chosen} onChange={(e) => setCode(e.target.value)}>
          {counters.length === 0 && <option value="">No counters configured</option>}
          {counters.map((c) => (
            <option key={c.code} value={c.code} disabled={!!c.occupied_by}>
              {c.code} · {c.name} · {c.location}{c.occupied_by ? ` — open under ${c.occupied_by}` : ''}
            </option>
          ))}
        </select>
      </Field>
      <span style={{ fontSize: 13, fontWeight: 500, color: C.textSub }}>Opening float</span>
      <DenominationTable value={counts} onChange={setCounts} />
      <Btn variant="primary" disabled={!chosen || busy || total <= 0} onClick={open}>
        {busy ? 'Opening…' : `Open ${chosen || 'counter'} · float ${fmt(total)}`}
      </Btn>
    </div>
  );
};

export const CounterShiftScreen: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const { format: fmt } = useCurrency();
  const [shift, setShift] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setShift(await billingService.getCurrentShift());
      setError(null);
    } catch (err) {
      setError(apiError(err, 'Could not load your shift.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [load]);

  const refresh = () => {
    load();
    onChanged();
  };

  const requestPickup = async () => {
    setBusy(true);
    try {
      const v = await billingService.requestCashPickup();
      setNotice(`Pickup ${v.voucher_number} requested for ${fmt(v.amount)}. The supervisor will collect it from your drawer.`);
      refresh();
    } catch (err) {
      setError(apiError(err, 'Pickup request failed.'));
    } finally {
      setBusy(false);
    }
  };

  const isOpen = !!shift?.has_active_shift;
  const awaiting = !!shift && !isOpen && !!shift.shift_id;
  const util = shift?.utilization_percent || 0;

  return (
    <>
      <PageHeader
        title="Counter Shift"
        subtitle={
          isOpen || awaiting
            ? `${shift!.counter_name} · ${shift!.counter_location || ''} · opened ${new Date(shift!.started_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by ${shift!.cashier_name}`
            : 'Open your counter to start billing.'
        }
        actions={
          isOpen && (
            <>
              <Btn onClick={load}><RefreshCw size={16} /> Refresh</Btn>
              <Btn onClick={requestPickup} disabled={busy || !!shift?.pending_pickup || (shift?.expected_cash_in_drawer || 0) <= (shift?.opening_float || 0)}>
                <ArrowDownToLine size={16} /> {shift?.pending_pickup ? `Pickup ${shift.pending_pickup.voucher_number} requested` : 'Request cash pickup'}
              </Btn>
              <Btn variant="primary" onClick={() => setClosing(true)}>Submit closing</Btn>
            </>
          )
        }
      />
      {error && <div style={{ marginBottom: 12 }}><Callout tone="red">{error}</Callout></div>}
      {notice && <div style={{ marginBottom: 12 }}><Callout tone="green">{notice}</Callout></div>}
      {loading && <Empty text="Loading your shift…" />}

      {!loading && !isOpen && !awaiting && <OpenCounterPanel shift={shift} onOpened={refresh} />}

      {awaiting && shift?.closing && (
        <div style={{ marginBottom: 16 }}>
          <Callout tone={shift.closing.variance_status === 'GREEN_MATCH' ? 'amber' : 'red'} title={shift.status === 'UNDER_INVESTIGATION' ? `Variance under investigation · ${shift.closing.investigation_number}` : 'Closing submitted · awaiting supervisor sign-off'}>
            Submitted {shift.closing.submitted_at ? new Date(shift.closing.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} · net variance {varText(shift.closing.net_variance, fmt)}
            {shift.closing.supervisor_finding ? ` · Supervisor: ${shift.closing.supervisor_finding}` : ''}. You can open a new shift once this is signed off or from another counter.
          </Callout>
          <div style={{ marginTop: 12 }}>
            <OpenCounterPanel shift={shift} onOpened={refresh} />
          </div>
        </div>
      )}

      {isOpen && shift && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
            <KpiCard label="Opening float" value={fmt(shift.opening_float)} sub={shift.opening_denominations?.text || 'Declared at opening'} icon={<Coins size={16} />} />
            <KpiCard label="Cash expected" value={fmt(shift.expected_cash_in_drawer)} sub="Float + cash + deposits − refunds − pickups" trend={shift.over_limit ? 'Above ₹50K' : undefined} trendColor={C.red} icon={<Banknote size={16} />} />
            <KpiCard label="Card" value={fmt(shift.card_collected)} sub="EDC" icon={<CreditCard size={16} />} />
            <KpiCard label="UPI" value={fmt(shift.upi_collected)} sub="Dynamic QR" icon={<QrCode size={16} />} />
            <KpiCard label="Refunds & pickups" value={fmt((shift.cash_refunds || 0) + (shift.cash_pickups || 0))} sub={`Refunds ${fmt(shift.cash_refunds || 0)} · pickups ${fmt(shift.cash_pickups || 0)}`} icon={<Undo2 size={16} />} />
          </div>

          <div style={{ ...card, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>Drawer cash vs ₹{(shift.drawer_limit || 50000).toLocaleString('en-IN')} limit</span>
              <span style={{ color: util >= 100 ? C.red : util >= PICKUP_THRESHOLD_PERCENT ? C.amber : C.muted, ...mono }}>{util}%</span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, util)}%`, height: '100%', background: util >= 100 ? C.red : util >= PICKUP_THRESHOLD_PERCENT ? '#F59E0B' : C.primary }} />
            </div>
            {shift.pickup_due && !shift.pending_pickup && (
              <span style={{ fontSize: 13, color: C.amber }}>Drawer is above {PICKUP_THRESHOLD_PERCENT}% of the limit. Request a cash pickup.</span>
            )}
          </div>

          <div style={{ ...card }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Shift register</span>
              <span style={{ fontSize: 12, color: C.muted }}>Latest first · {shift.transactions || 0} transactions</span>
            </div>
            {(shift.register || []).length === 0 && <Empty text="No transactions yet this shift." />}
            {(shift.register || []).slice(0, 15).map((r, i) => (
              <div key={`${r.ref}-${i}`} style={{ display: 'grid', gridTemplateColumns: '60px 170px 1fr 110px 120px', gap: 10, alignItems: 'center', padding: '9px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <span style={{ color: C.muted, ...mono }}>{r.at}</span>
                <span style={mono}>{r.ref}</span>
                <span style={{ color: C.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.detail}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: TENDER_COLORS[r.tender as TenderMode] || C.faint }} />
                  {r.tender}
                </span>
                <span style={{ textAlign: 'right', fontWeight: 500, color: r.amount < 0 ? C.red : C.text, ...mono }}>
                  {r.amount < 0 ? '− ' : ''}{fmt(Math.abs(r.amount))}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {(shift?.history || []).length > 0 && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 15 }}>Previous shifts</div>
          {shift!.history!.map((h) => (
            <div key={h.shift_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span>{new Date(h.opened_at).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {h.counter_code}</span>
                <span style={{ color: C.muted }}>{fmt(h.total_collected)} collected{h.signed_off_by ? ` · signed off by ${h.signed_off_by}` : ''}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ color: Math.abs(h.net_variance) < 0.005 ? C.green : C.red, ...mono }}>{varText(h.net_variance, fmt)}</span>
                <StatusChip status={h.status === 'CLOSED' ? (h.closed_with_variance ? 'PARTIALLY_PAID' : 'PAID') : 'PENDING'} label={h.status === 'CLOSED' ? (h.closed_with_variance ? 'Closed with variance' : 'Closed') : h.status === 'UNDER_INVESTIGATION' ? 'Investigating' : 'Awaiting sign-off'} />
              </div>
            </div>
          ))}
        </div>
      )}

      {closing && shift && (
        <ClosingDrawer
          shift={shift}
          onClose={() => setClosing(false)}
          onSubmitted={() => {
            setClosing(false);
            setNotice('Closing submitted. Your drawer is locked until the supervisor signs off.');
            refresh();
          }}
        />
      )}
    </>
  );
};
