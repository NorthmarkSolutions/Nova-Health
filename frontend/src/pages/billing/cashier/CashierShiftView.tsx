// Billing · Cashier — counter shift: open with a counted float, watch the drawer against its limit, request a cash pickup,
// and submit the closing count (cash by denomination, EDC batch, UPI settlement) for supervisor sign-off.
import React, { useCallback, useEffect, useState } from 'react';
import { Store, ArrowDownToLine, Lock, Scale } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, HmsProgress, INPUT, TEXTAREA } from '../../../components/hms';
import { billingService, ShiftSummary } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { DRAWER_DENOMINATIONS, DenominationInput, PICKUP_THRESHOLD_PERCENT, denominationPayload, denominationTotal, reconcileDrawer, TENDER_LABELS, TenderMode } from '../executive/cashierMath';
import { STALE_SHIFT_HOURS, fmtTime, shiftAgeHours } from './cashierDeskData';

export interface CashierShiftViewProps {
  notify: (message: string, tone?: 'success' | 'error') => void;
  onChanged: () => void;
  /** One-shot request from the workspace (Alt+C / header) to start the closing. */
  closeRequest: boolean;
  onCloseConsumed: () => void;
  initialFilter?: string;
}

const MIN_NOTE = 5;
const signed = (v: number, fmt: (n: number) => string) => (Math.abs(v) < 0.005 ? fmt(0) : `${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}`);

const DenominationGrid: React.FC<{ value: DenominationInput; onChange: (v: DenominationInput) => void }> = ({ value, onChange }) => {
  const { format } = useCurrency();
  const set = (k: keyof DenominationInput, v: string) => onChange({ ...value, [k]: v });
  return (
    <HmsSection title="Count the drawer">
      {DRAWER_DENOMINATIONS.map((d) => (
        <HmsRow
          key={d}
          label={`₹${d} notes`}
          value={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
              <input aria-label={`₹${d} notes`} inputMode="numeric" placeholder="0" style={{ ...INPUT, width: '90px' }} value={value[d] ?? ''} onChange={(e) => set(d, e.target.value.replace(/\D/g, ''))} />
              <span style={{ minWidth: '90px', textAlign: 'right' }}>{format(d * (parseInt(value[d] || '0') || 0))}</span>
            </span>
          }
        />
      ))}
      <HmsRow
        label="Coins (amount)"
        value={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
            <input aria-label="Coins amount" inputMode="decimal" placeholder="0" style={{ ...INPUT, width: '90px' }} value={value.coins ?? ''} onChange={(e) => set('coins', e.target.value.replace(/[^\d.]/g, ''))} />
            <span style={{ minWidth: '90px', textAlign: 'right' }}>{format(parseFloat(value.coins || '0') || 0)}</span>
          </span>
        }
      />
      <HmsRow label={<strong>Total counted</strong>} value={<strong>{format(denominationTotal(value))}</strong>} last />
    </HmsSection>
  );
};

export const CashierShiftView: React.FC<CashierShiftViewProps> = ({ notify, onChanged, closeRequest, onCloseConsumed, initialFilter }) => {
  const { format } = useCurrency();
  const [shift, setShift] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState(0);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter === 'history' ? 'history' : 'register');
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openDraft, setOpenDraft] = useState<{ code: string; counts: DenominationInput } | null>(null);
  const [closing, setClosing] = useState<{ counts: DenominationInput; edc: string; upi: string; note: string; error?: string } | null>(null);
  const [pickupOpen, setPickupOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setShift(await billingService.getCurrentShift());
      setFailed(null);
    } catch (e) {
      setFailed(apiError(e, 'Your shift could not be loaded.'));
    } finally {
      setLoading(false);
      setLastSync(Date.now());
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
    const t = window.setInterval(load, 20000);
    return () => window.clearInterval(t);
  }, [load]);

  const isOpen = !!shift?.has_active_shift;
  const awaiting = !!shift && !isOpen && !!shift.shift_id;

  // Alt+C from the workspace starts the closing once the shift is loaded
  useEffect(() => {
    if (!closeRequest || loading) return;
    Promise.resolve().then(() => {
      if (isOpen) setClosing({ counts: {}, edc: '', upi: '', note: '' });
      onCloseConsumed();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeRequest, loading, isOpen]);

  const after = async (msg: string) => {
    notify(msg);
    await load();
    onChanged();
  };

  const openCounter = async () => {
    if (!openDraft) return;
    const free = (shift?.counters || []).filter((c) => !c.occupied_by);
    const code = openDraft.code || free[0]?.code || '';
    setBusy(true);
    try {
      await billingService.openShift({ counter_code: code, denominations: denominationPayload(openDraft.counts) });
      setOpenDraft(null);
      await after(`Counter ${code} opened with a float of ${format(denominationTotal(openDraft.counts))}`);
    } catch (e) {
      notify(apiError(e, 'The counter could not be opened'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const requestPickup = async () => {
    setBusy(true);
    try {
      const v = await billingService.requestCashPickup();
      setPickupOpen(false);
      await after(`Pickup ${v.voucher_number} for ${format(v.amount)} requested — the supervisor collects it from your drawer`);
    } catch (e) {
      notify(apiError(e, 'The pickup request failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const rec =
    closing && shift
      ? reconcileDrawer(
          { cash: shift.expected_cash_in_drawer, card: shift.card_collected, upi: shift.upi_collected },
          { cash: denominationTotal(closing.counts), card: parseFloat(closing.edc) || 0, upi: parseFloat(closing.upi) || 0 }
        )
      : null;
  const closeEntered = !!closing && denominationTotal(closing.counts) > 0 && closing.edc !== '' && closing.upi !== '';
  const closeBlocker = !closing ? '' : !closeEntered ? 'Enter the cash count, EDC batch and UPI settlement totals' : rec && !rec.matched && closing.note.trim().length < MIN_NOTE ? 'Explain the variance' : '';

  const submitClosing = async () => {
    if (!closing || closeBlocker) return;
    setBusy(true);
    try {
      await billingService.submitShiftClosing({ denominations: denominationPayload(closing.counts), card_total: parseFloat(closing.edc) || 0, upi_total: parseFloat(closing.upi) || 0, notes: closing.note.trim() });
      setClosing(null);
      await after('Closing submitted — your drawer is locked until the supervisor signs off');
    } catch (e) {
      setClosing({ ...closing, error: apiError(e, 'The closing could not be submitted') });
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- list: register or previous shifts ---------------- */
  const register = shift?.register || [];
  const history = shift?.history || [];
  const q = search.trim().toLowerCase();
  const rows: HmsListRow[] =
    pill === 'history'
      ? history
          .filter((h) => !q || [h.counter_code, h.signed_off_by, h.status].some((v) => (v || '').toLowerCase().includes(q)))
          .map((h) => ({
            key: `h:${h.shift_id}`,
            title: `${h.counter_code} · ${fmtTime(h.opened_at)}`,
            badge: <HmsBadge tone={h.status === 'CLOSED' ? (h.closed_with_variance ? 'amber' : 'green') : h.status === 'UNDER_INVESTIGATION' ? 'red' : 'blue'}>{h.status === 'CLOSED' ? (h.closed_with_variance ? 'Closed with variance' : 'Closed') : h.status === 'UNDER_INVESTIGATION' ? 'Investigating' : 'Awaiting sign-off'}</HmsBadge>,
            sub: h.signed_off_by ? `Signed off by ${h.signed_off_by}` : 'Not signed off',
            metaLeft: `${format(h.total_collected)} collected`,
            metaRight: `Variance ${signed(h.net_variance, format)}`,
          }))
      : register
          .filter((r) => !q || [r.ref, r.detail, r.tender, r.kind].some((v) => (v || '').toLowerCase().includes(q)))
          .map((r, i) => ({
            key: `r:${r.ref}:${i}`,
            title: r.detail || r.ref,
            badge: <HmsBadge tone={r.amount < 0 ? 'red' : r.kind === 'DEPOSIT' ? 'blue' : 'green'}>{r.kind.charAt(0) + r.kind.slice(1).toLowerCase()}</HmsBadge>,
            sub: r.ref,
            metaLeft: `${r.at} · ${TENDER_LABELS[r.tender as TenderMode] || r.tender}`,
            metaRight: `${r.amount < 0 ? '− ' : ''}${format(Math.abs(r.amount))}`,
          }));

  const renderDetail = () => {
    if (loading) return <HmsEmpty>Loading your shift…</HmsEmpty>;
    if (failed && !shift) return <HmsEmpty>{failed}</HmsEmpty>;
    if (!isOpen) {
      return (
        <>
          <HmsDetailHeader icon={Lock} title="Counter closed" badge={<HmsBadge tone="amber">{awaiting ? 'Awaiting sign-off' : 'Closed'}</HmsBadge>} subtitle="Billing, payments and deposits are locked until you open a shift and declare the opening float." />
          <HmsDetailBody>
            {awaiting && shift?.closing && (
              <HmsNotice tone={shift.closing.variance_status === 'GREEN_MATCH' ? 'amber' : 'red'}>
                {shift.status === 'UNDER_INVESTIGATION' ? `Variance under investigation · ${shift.closing.investigation_number}. ` : 'Your last closing is waiting for supervisor sign-off. '}
                Net variance {signed(shift.closing.net_variance, format)}
                {shift.closing.supervisor_finding ? ` · Supervisor: ${shift.closing.supervisor_finding}` : ''}.
              </HmsNotice>
            )}
            <HmsSection title="Counters">
              {(shift?.counters || []).length ? (
                (shift?.counters || []).map((c, i, arr) => (
                  <HmsRow key={c.code} label={`${c.code} · ${c.name}`} hint={c.location} value={c.occupied_by ? <HmsBadge tone="gray">{`Open under ${c.occupied_by}`}</HmsBadge> : <HmsBadge tone="green">Free</HmsBadge>} last={i === arr.length - 1} />
                ))
              ) : (
                <HmsRow label="No counters are configured" hint="Ask the Billing Admin to add one." last />
              )}
            </HmsSection>
          </HmsDetailBody>
          <HmsDetailFooter>
            <HmsButton variant="primary" icon={Store} block disabled={!(shift?.counters || []).some((c) => !c.occupied_by)} onClick={() => setOpenDraft({ code: '', counts: { 500: '10' } })}>
              Open counter
            </HmsButton>
          </HmsDetailFooter>
        </>
      );
    }
    const s = shift!;
    const util = s.utilization_percent || 0;
    const ageH = shiftAgeHours(s.started_at, lastSync);
    const stale = ageH !== null && ageH > STALE_SHIFT_HOURS;
    return (
      <>
        <HmsDetailHeader icon={Store} title={s.counter_name || s.counter_code || 'Counter'} badge={<HmsBadge tone={stale ? 'amber' : 'green'}>{stale ? 'Open too long' : 'Open'}</HmsBadge>} subtitle={`${s.counter_location || ''} · opened ${fmtTime(s.started_at)} by ${s.cashier_name || '—'}`} />
        <HmsStatStrip
          items={[
            { label: 'Opening float', value: format(s.opening_float), note: s.opening_denominations?.text || 'Declared at opening' },
            { label: 'Cash expected', value: format(s.expected_cash_in_drawer), note: 'Float + cash + deposits − refunds − pickups', tone: s.over_limit ? 'red' : 'default' },
            { label: 'Card · UPI', value: `${format(s.card_collected)} · ${format(s.upi_collected)}`, note: 'EDC · dynamic QR' },
            { label: 'Collected', value: format(s.total_collected), note: `${s.transactions || 0} transactions` },
          ]}
        />
        <HmsDetailBody>
          {stale && (
            <HmsNotice tone="amber">
              This shift has been open {ageH! >= 48 ? `${Math.floor(ageH! / 24)} days` : `${Math.round(ageH!)} hours`}. Count the drawer and submit the closing so the supervisor can reconcile it — a shift should not run past one working day.
            </HmsNotice>
          )}
          {s.pickup_due && !s.pending_pickup && <HmsNotice tone="amber">The drawer is above {PICKUP_THRESHOLD_PERCENT}% of its limit. Request a cash pickup.</HmsNotice>}
          {s.pending_pickup && <HmsNotice tone="blue">Pickup {s.pending_pickup.voucher_number} for {format(s.pending_pickup.amount)} requested — waiting for the supervisor.</HmsNotice>}
          <HmsSection title="Drawer cash" padded>
            <HmsProgress pct={Math.min(100, util)} doneLabel="At the drawer limit" tone={util >= 100 ? 'red' : util >= PICKUP_THRESHOLD_PERCENT ? 'amber' : 'blue'} label={`${util}% of the ${format(s.drawer_limit || 50000)} limit`} showLabel />
          </HmsSection>
          <HmsSection title="Out of the drawer">
            <HmsRow label="Cash refunds" value={format(s.cash_refunds || 0)} />
            <HmsRow label="Cash pickups" value={format(s.cash_pickups || 0)} />
            <HmsRow label="Deposits taken in cash" value={format(s.cash_deposits || 0)} last />
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <HmsButton icon={ArrowDownToLine} block disabled={busy || !!s.pending_pickup || s.expected_cash_in_drawer <= s.opening_float} title={s.pending_pickup ? 'A pickup is already requested' : 'Ask the supervisor to collect cash'} onClick={() => setPickupOpen(true)}>
              Request pickup
            </HmsButton>
            <HmsButton variant="primary" icon={Scale} block onClick={() => setClosing({ counts: {}, edc: '', upi: '', note: '' })} aria-keyshortcuts="Alt+C">
              Submit closing
            </HmsButton>
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  const counters = shift?.counters || [];
  const free = counters.filter((c) => !c.occupied_by);
  return (
    <>
      <HmsMasterDetail
        listId="cashier-shift"
        title={pill === 'history' ? 'Previous shifts' : 'Shift register'}
        description={pill === 'history' ? 'Your earlier shifts, their totals and the supervisor’s sign-off.' : 'Every payment, deposit, refund and pickup on this shift, latest first.'}
        total={pill === 'history' ? history.length : register.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={pill === 'history' ? 'Search counter or supervisor' : 'Search reference, patient or tender'}
        pills={[
          { key: 'register', label: 'This shift', count: register.length },
          { key: 'history', label: 'Previous shifts', count: history.length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="go to shift"
        detailLabel="Counter shift"
        emptyText={pill === 'history' ? 'No earlier shifts.' : 'No transactions on this shift yet.'}
        renderDetail={renderDetail}
      />

      {openDraft && (
        <HmsModal
          title="Open your counter"
          description="Count the opening float note by note — it is the starting point for the closing reconciliation."
          onClose={() => setOpenDraft(null)}
          busy={busy}
          width={600}
          footer={
            <>
              <HmsButton onClick={() => setOpenDraft(null)}>Cancel</HmsButton>
              <HmsButton variant="primary" icon={Store} onClick={openCounter} disabled={busy || denominationTotal(openDraft.counts) <= 0 || !(openDraft.code || free[0]?.code)}>
                Open with {format(denominationTotal(openDraft.counts))}
              </HmsButton>
            </>
          }
        >
          <HmsField label="Counter" required>
            <select style={INPUT} value={openDraft.code || free[0]?.code || ''} onChange={(e) => setOpenDraft({ ...openDraft, code: e.target.value })}>
              {counters.map((c) => (
                <option key={c.code} value={c.code} disabled={!!c.occupied_by}>
                  {c.code} · {c.name}
                  {c.occupied_by ? ` — open under ${c.occupied_by}` : ''}
                </option>
              ))}
            </select>
          </HmsField>
          <DenominationGrid value={openDraft.counts} onChange={(v) => setOpenDraft({ ...openDraft, counts: v })} />
        </HmsModal>
      )}

      {pickupOpen && shift && (
        <HmsModal
          title="Request a cash pickup?"
          description={`Drawer cash ${format(shift.expected_cash_in_drawer)} against a ${format(shift.drawer_limit || 50000)} limit. The supervisor collects the excess above your float and signs a voucher.`}
          onClose={() => setPickupOpen(false)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setPickupOpen(false)} data-autofocus>
                Cancel
              </HmsButton>
              <HmsButton variant="primary" icon={ArrowDownToLine} onClick={requestPickup} disabled={busy}>
                Request pickup
              </HmsButton>
            </>
          }
        >
          <HmsNotice tone="blue">Keep the cash in the drawer until the supervisor arrives with the voucher.</HmsNotice>
        </HmsModal>
      )}

      {closing && shift && rec && (
        <HmsModal
          title="Submit the counter closing"
          description={`${shift.counter_name || shift.counter_code} · sent to the Billing Supervisor for sign-off. Count everything in the drawer, including the opening float.`}
          onClose={() => setClosing(null)}
          busy={busy}
          width={680}
          footer={
            <>
              <span style={{ marginRight: 'auto', fontSize: '13px', color: closeBlocker ? '#b45309' : rec.matched ? '#15803d' : '#dc2626' }}>{closeBlocker || (rec.matched ? 'All tenders match' : `Net variance ${signed(rec.net, format)}`)}</span>
              <HmsButton onClick={() => setClosing(null)}>Cancel</HmsButton>
              <HmsButton variant="primary" icon={Scale} onClick={submitClosing} disabled={!!closeBlocker || busy}>
                {busy ? 'Submitting…' : 'Submit for sign-off'}
              </HmsButton>
            </>
          }
        >
          {closing.error && <HmsNotice tone="red">{closing.error}</HmsNotice>}
          <DenominationGrid value={closing.counts} onChange={(v) => setClosing({ ...closing, counts: v })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <HmsField label="EDC batch total" required>
              <input style={INPUT} inputMode="decimal" placeholder="0.00" value={closing.edc} onChange={(e) => setClosing({ ...closing, edc: e.target.value.replace(/[^\d.]/g, '') })} />
            </HmsField>
            <HmsField label="UPI settlement total" required>
              <input style={INPUT} inputMode="decimal" placeholder="0.00" value={closing.upi} onChange={(e) => setClosing({ ...closing, upi: e.target.value.replace(/[^\d.]/g, '') })} />
            </HmsField>
          </div>
          <HmsSection title="Reconciliation">
            {rec.rows.map((r, i) => {
              const shown = r.tender === 'CASH' ? denominationTotal(closing.counts) > 0 : r.tender === 'CARD' ? closing.edc !== '' : closing.upi !== '';
              const ok = Math.abs(r.variance) < 0.005;
              return (
                <HmsRow
                  key={r.tender}
                  last={i === rec.rows.length - 1}
                  label={r.tender === 'CARD' ? 'Card (EDC)' : r.tender === 'CASH' ? 'Cash' : 'UPI'}
                  hint={`System ${format(r.expected)}${shown ? ` · counted ${format(r.counted)}` : ''}`}
                  value={shown ? <HmsBadge tone={ok ? 'green' : 'red'}>{signed(r.variance, format)}</HmsBadge> : '—'}
                />
              );
            })}
          </HmsSection>
          {closeEntered && !rec.matched && (
            <HmsField label="Why the count differs" required hint="The supervisor sees this note.">
              <textarea style={TEXTAREA} value={closing.note} onChange={(e) => setClosing({ ...closing, note: e.target.value })} placeholder="What happened and what you checked" />
            </HmsField>
          )}
        </HmsModal>
      )}
    </>
  );
};

