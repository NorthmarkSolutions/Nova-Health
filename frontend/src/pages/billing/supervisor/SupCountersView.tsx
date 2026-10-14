// Billing · Supervisor — every billing counter: who is on it, cash in the drawer against the limit, collections by
// tender, the day's requests and flagged events from that counter. Cash pickup and counter mode (assist the cashier) start here.
import React, { useState } from 'react';
import { Monitor, ArrowDownToLine, LogIn } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsTone, HMS } from '../../../components/hms';
import { SupervisorCounterRow, billingService } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { drawerTone } from './supervisorMath';
import { SupervisorDeskData, MONO, fmtClock } from './supervisorDeskData';

export interface SupCountersViewProps {
  data: SupervisorDeskData;
  notify: (message: string, tone?: 'success' | 'error') => void;
  onEnterCounter: (shiftId: string) => Promise<void>;
  initialFilter?: string;
  initialSelect?: string;
}

const STATUS: Record<string, { label: string; tone: HmsTone }> = {
  OPEN: { label: 'Open', tone: 'green' },
  CLOSING: { label: 'Closing', tone: 'amber' },
  CLOSED: { label: 'Closed', tone: 'gray' },
};
const BAR = { red: '#dc2626', amber: '#f59e0b', blue: HMS.primary } as const;
const PILLS = ['all', 'OPEN', 'pickup', 'CLOSING', 'CLOSED'];
const needsPickup = (c: SupervisorCounterRow) => c.status === 'OPEN' && (c.pickup_due || !!c.pending_pickup || c.over_limit);

export const SupCountersView: React.FC<SupCountersViewProps> = ({ data, notify, onEnterCounter, initialFilter, initialSelect }) => {
  const { format } = useCurrency();
  const dash = data.dashboard;
  const counters = dash?.counters || [];
  const threshold = dash?.pickup_threshold_percent ?? 80;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `c:${initialSelect}` : null);
  const [pickup, setPickup] = useState<SupervisorCounterRow | null>(null);
  const [busy, setBusy] = useState(false);

  const match = (c: SupervisorCounterRow, p: string) => (p === 'all' ? true : p === 'pickup' ? needsPickup(c) : c.status === p);
  const q = search.trim().toLowerCase();
  const visible = counters.filter((c) => match(c, pill) && (!q || [c.counter_code, c.counter_name, c.counter_location, c.cashier_name].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = visible.map((c) => {
    const st = STATUS[c.status];
    const open = c.status === 'OPEN';
    return {
      key: `c:${c.counter_code}`,
      title: c.counter_name,
      badge: c.over_limit ? <HmsBadge tone="red">Over limit</HmsBadge> : needsPickup(c) ? <HmsBadge tone="amber">Pickup due</HmsBadge> : <HmsBadge tone={st.tone}>{st.label}</HmsBadge>,
      sub: (
        <>
          <span style={MONO}>{c.counter_code}</span>
          {c.counter_location ? ` · ${c.counter_location}` : ''}
        </>
      ),
      metaLeft: open || c.status === 'CLOSING' ? c.cashier_name || '—' : 'No cashier',
      metaRight: open ? `${format(c.expected_cash_in_drawer || 0)} cash · ${c.utilization_percent}%` : c.total_collected != null ? format(c.total_collected) : '—',
    };
  });

  const doPickup = async () => {
    if (!pickup?.shift_id) return;
    setBusy(true);
    try {
      const v = await billingService.executeCashPickup({ shift_id: pickup.shift_id });
      notify(`${v.voucher_number} · ${format(v.amount)} collected from ${pickup.counter_name}`);
      setPickup(null);
      await data.reload();
    } catch (e) {
      notify(apiError(e, 'Cash pickup failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const renderDetail = (key: string | null) => {
    if (data.loading && !dash) return <HmsEmpty>Loading counters…</HmsEmpty>;
    const c = counters.find((x) => `c:${x.counter_code}` === key);
    if (!c) return <HmsEmpty>{counters.length ? 'Select a counter from the list.' : 'No billing counters are configured.'}</HmsEmpty>;
    const st = STATUS[c.status];
    const open = c.status === 'OPEN';
    const live = (data.board?.live_counters || []).find((l) => l.shift_id === c.shift_id);
    const closing = (data.board?.closings || []).find((r) => r.shift_id === c.shift_id);
    const approvals = [...(data.approvals?.pending || []), ...(data.approvals?.decided || [])].filter((a) => a.counter_code === c.counter_code);
    const refunds = [...(data.refunds?.pending || []), ...(data.refunds?.decided || [])].filter((r) => r.counter_code === c.counter_code);
    const events = (data.audit?.rows || []).filter((e) => e.counter_code === c.counter_code);
    const unreviewed = events.filter((e) => !e.reviewed);
    const tone = drawerTone(c.utilization_percent, threshold);
    const avgTicket = c.transactions && c.total_collected ? c.total_collected / c.transactions : null;

    return (
      <>
        <HmsDetailHeader
          icon={Monitor}
          title={c.counter_name}
          badge={<HmsBadge tone={st.tone}>{st.label}</HmsBadge>}
          subtitle={
            <>
              <span style={MONO}>{c.counter_code}</span>
              {c.counter_location ? ` · ${c.counter_location}` : ''}
              {c.status !== 'CLOSED' ? ` · ${c.cashier_name}` : ''}
              {live?.started_at ? ` · shift since ${fmtClock(live.started_at)}` : ''}
            </>
          }
        />
        <HmsStatStrip
          items={[
            { label: 'Cash in drawer', value: open ? format(c.expected_cash_in_drawer || 0) : '—', note: `Limit ${format(dash?.drawer_limit || 0)}`, tone: c.over_limit ? 'red' : c.pickup_due ? 'amber' : 'default' },
            { label: 'Collected', value: c.total_collected != null ? format(c.total_collected) : '—', note: 'This shift' },
            { label: 'Transactions', value: open || c.status === 'CLOSING' ? c.transactions : '—', note: avgTicket ? `Avg ${format(avgTicket)}` : '—' },
            { label: 'To review', value: unreviewed.length, note: 'Flagged events', tone: unreviewed.some((e) => e.severity === 'HIGH') ? 'red' : unreviewed.length ? 'amber' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {c.over_limit && <HmsNotice tone="red">Drawer is above the {format(dash?.drawer_limit || 0)} limit. Pick up the excess cash now.</HmsNotice>}
          {!c.over_limit && c.pending_pickup && <HmsNotice tone="amber">The cashier asked for a pickup · {c.pending_pickup.voucher_number}.</HmsNotice>}
          {c.status === 'CLOSING' && <HmsNotice tone="amber">Closing submitted{closing?.submitted_at ? ` at ${fmtClock(closing.submitted_at)}` : ''}. Review it in Closings & vault.</HmsNotice>}

          {open && (
            <HmsSection title="Drawer" padded>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div role="progressbar" aria-label="Drawer cash against limit" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, c.utilization_percent)} style={{ height: '8px', borderRadius: '4px', background: HMS.divider, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, c.utilization_percent)}%`, height: '100%', background: BAR[tone], transition: 'width 300ms ease-out' }} />
                </div>
                <span style={{ fontSize: '12px', color: c.over_limit ? '#dc2626' : HMS.textSecondary }}>
                  {c.utilization_percent}% of the drawer limit · pickup from {threshold}%
                </span>
              </div>
            </HmsSection>
          )}

          {live && (
            <HmsSection title="Collections by tender">
              <HmsRow label="Cash" value={format(live.expected_cash_in_drawer)} hint="Expected in drawer, after pickups and cash refunds" />
              <HmsRow label="Card (EDC)" value={format(live.card_collected)} />
              <HmsRow label="UPI" value={format(live.upi_collected)} />
              <HmsRow label={<strong>Total collected</strong>} value={<strong>{format(live.total_collected)}</strong>} last />
            </HmsSection>
          )}

          <HmsSection title={`Requests from this counter today · ${approvals.length + refunds.length}`}>
            {approvals.length + refunds.length === 0 && <HmsRow label="None today" last />}
            {approvals.slice(0, 6).map((a, i) => (
              <HmsRow key={a.id} label={`${a.type_label} · ${a.patient_name}`} hint={`${a.request_number} · ${a.requested_by}`} value={<HmsBadge tone={a.status === 'APPROVED' ? 'green' : a.status === 'REJECTED' ? 'red' : 'amber'}>{a.status.toLowerCase()}</HmsBadge>} last={i === approvals.length - 1 && !refunds.length} />
            ))}
            {refunds.slice(0, 6).map((r, i) => (
              <HmsRow key={r.id} label={`Refund · ${r.patient_name}`} hint={`${r.refund_number} · ${format(r.amount)}`} value={<HmsBadge tone={r.status === 'DISBURSED' ? 'green' : r.status === 'REJECTED' ? 'red' : 'amber'}>{r.status.toLowerCase()}</HmsBadge>} last={i === refunds.length - 1} />
            ))}
          </HmsSection>

          <HmsSection title={`Flagged events · ${unreviewed.length} to review`} defaultOpen={unreviewed.length > 0}>
            {events.length === 0 && <HmsRow label="No flagged events from this counter" last />}
            {events.slice(0, 8).map((e, i) => (
              <HmsRow key={e.id} label={e.title} hint={`${fmtClock(e.occurred_at)} · ${e.actor} · ${e.detail}`} value={e.reviewed ? <HmsBadge tone="gray">Reviewed</HmsBadge> : <HmsBadge tone={e.severity === 'HIGH' ? 'red' : e.severity === 'MEDIUM' ? 'amber' : 'gray'}>{e.severity.toLowerCase()}</HmsBadge>} last={i === Math.min(events.length, 8) - 1} />
            ))}
          </HmsSection>
        </HmsDetailBody>
        {open && c.shift_id && (
          <HmsDetailFooter>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
              <HmsButton icon={ArrowDownToLine} block disabled={!(c.pickup_due || c.pending_pickup || c.over_limit)} title={c.pickup_due || c.pending_pickup || c.over_limit ? 'Collect the cash above the opening float' : `Pickup unlocks at ${threshold}% or when the cashier asks`} onClick={() => setPickup(c)}>
                Cash pickup
              </HmsButton>
              <HmsButton variant="primary" icon={LogIn} block title="Work on this counter as the supervisor; every action is marked as assisted" onClick={() => onEnterCounter(c.shift_id!)}>
                Assist in counter mode
              </HmsButton>
            </div>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="sup-counters"
        title="Counters"
        description={`Live drawers and cashiers. Drawer limit ${format(dash?.drawer_limit || 0)} · pickup at ${threshold}%.`}
        total={counters.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search counter or cashier"
        pills={[
          { key: 'all', label: 'All', count: counters.length },
          { key: 'OPEN', label: 'Open', count: counters.filter((c) => c.status === 'OPEN').length },
          { key: 'pickup', label: 'Pickup due', count: counters.filter(needsPickup).length, tone: 'amber' },
          { key: 'CLOSING', label: 'Closing', count: counters.filter((c) => c.status === 'CLOSING').length },
          { key: 'CLOSED', label: 'Closed', count: counters.filter((c) => c.status === 'CLOSED').length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open counter"
        detailLabel="Counter"
        emptyText="No counters match this search or filter."
        renderDetail={renderDetail}
      />
      {pickup && (
        <HmsModal
          title={`Cash pickup from ${pickup.counter_name}?`}
          description={`${pickup.cashier_name} · ${format(pickup.expected_cash_in_drawer || 0)} in the drawer. Cash above the opening float is collected against a voucher.`}
          onClose={() => setPickup(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setPickup(null)} data-autofocus>
                Cancel
              </HmsButton>
              <HmsButton variant="primary" icon={ArrowDownToLine} onClick={doPickup} disabled={busy}>
                {busy ? 'Collecting…' : 'Collect cash'}
              </HmsButton>
            </>
          }
        >
          <HmsNotice tone="amber">Count the cash with the cashier and both sign the pickup voucher before you leave the counter.</HmsNotice>
        </HmsModal>
      )}
    </>
  );
};
