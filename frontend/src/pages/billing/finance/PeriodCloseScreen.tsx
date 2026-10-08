import React, { useCallback, useEffect, useState } from 'react';
import { Monitor, CalendarX, OctagonAlert, Lock, CircleCheck, CircleAlert, Download, RefreshCw } from 'lucide-react';
import { billingService, PeriodCloseOverview, PeriodLock } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { Btn, C, Callout, Empty, Field, KpiCard, PageHeader, apiError, card, inputStyle, mono } from '../executive/executiveUi';
import { DAY_STATUS } from './financeMath';

const TONE = { green: [C.green, C.greenSoft], blue: [C.primary, C.primarySoft], amber: [C.amber, C.amberSoft], muted: [C.muted, '#F3F4F6'] } as const;

/** A-13 Period Close: lock a day or month once everything in it is complete. Closed periods reject new entries. */
export const PeriodCloseScreen: React.FC = () => {
  const { format: fmt } = useCurrency();
  const [data, setData] = useState<PeriodCloseOverview | null>(null);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [carry, setCarry] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await billingService.getPeriodClose(selected));
      setError(null);
    } catch (err) {
      setError(apiError(err, 'Could not load period close.'));
    }
  }, [selected]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setNotice(msg);
      setCarry('');
      setReason('');
      await load();
    } catch (err) {
      setError(apiError(err, 'Action failed.'));
    } finally {
      setBusy(false);
    }
  };

  const k = data?.kpis;
  const sel = data?.selected;
  const roles = data?.roles;
  const unbilledBlocking = sel?.checklist.some((c) => c.key === 'unbilled' && c.blocking);
  const otherBlocking = sel?.checklist.some((c) => c.blocking && c.key !== 'unbilled');
  const canCloseSel = !!sel && !sel.lock && !otherBlocking && (!unbilledBlocking || carry.trim().length >= 10);

  const lockLine = (l: PeriodLock) => (
    <span style={{ fontSize: 12, color: C.muted }}>
      Closed {l.closed_at ? new Date(l.closed_at).toLocaleString() : ''} by {l.closed_by} · billed {fmt(l.totals.gross_billed - l.totals.discounts + l.totals.tax)} · collected {fmt(l.totals.collected)} · {l.journal_reference}
    </span>
  );

  return (
    <>
      <PageHeader
        title="Period Close"
        subtitle="Lock a day or month once everything in it is complete. Closed periods reject new entries; corrections post to the open period with a back-reference."
        actions={<Btn onClick={load}><RefreshCw size={16} /> Refresh</Btn>}
      />
      {error && <div style={{ marginBottom: 12 }}><Callout tone="red">{error}</Callout></div>}
      {notice && <div style={{ marginBottom: 12 }}><Callout tone="green">{notice}</Callout></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <KpiCard label="Shifts open" value={k?.shifts_open ?? '—'} sub="Right now" icon={<Monitor size={16} />} />
        <KpiCard label="Days not closed" value={k?.days_not_closed ?? '—'} sub="Last 14 days, excluding today" trendColor={C.amber} icon={<CalendarX size={16} />} />
        <KpiCard label="Blocking items" value={k?.blocking_items ?? '—'} sub={sel ? `For ${sel.label}` : ''} icon={<OctagonAlert size={16} />} />
        <KpiCard label="Last month closed" value={k?.last_month_closed || 'None'} sub="Month locks" icon={<Lock size={16} />} />
      </div>

      {/* Calendar strip */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
        {(data?.days || []).map((d) => {
          const st = DAY_STATUS[d.status] || DAY_STATUS.OPEN;
          const [fg, bg] = TONE[st.tone];
          const on = sel?.date === d.date;
          return (
            <button key={d.date} onClick={() => d.status !== 'LIVE' && setSelected(d.date)} disabled={d.status === 'LIVE'}
              style={{ minWidth: 82, padding: '8px 10px', borderRadius: 10, cursor: d.status === 'LIVE' ? 'default' : 'pointer', textAlign: 'left',
                border: `1px solid ${on ? C.primary : C.border}`, background: on ? C.hover : C.surface, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{d.label}</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: fg, background: bg, padding: '1px 6px', borderRadius: 999, alignSelf: 'flex-start' }}>{st.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, alignItems: 'start' }}>
        <section style={{ ...card }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Day close checklist · {sel?.label}</span>
              <span style={{ fontSize: 12, color: C.muted }}>{sel?.lock ? `${sel.lock.status === 'REOPENED' ? 'Reopened' : 'Closed'} · entries ${sel.lock.status === 'REOPENED' ? 'allowed until relock' : 'locked'}` : 'Ready to close once every item is done'}</span>
            </span>
          </div>
          {!sel && <Empty text="Loading…" />}
          {sel?.checklist.map((c) => (
            <div key={c.key} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${C.border}`, alignItems: 'flex-start' }}>
              {c.ok ? <CircleCheck size={17} color={C.green} /> : c.blocking ? <CircleAlert size={17} color={C.red} /> : <CircleAlert size={17} color={C.amber} />}
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 14 }}>{c.label}{!c.blocking && !c.ok ? ' (advisory)' : ''}</span>
                <span style={{ fontSize: 12, color: c.ok ? C.muted : c.blocking ? C.red : C.amber }}>{c.detail}</span>
              </span>
            </div>
          ))}
          {sel && !sel.lock && (
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {unbilledBlocking && (
                <Field label="Carry forward reason" hint="Unbilled items stay open into the next day with this reason.">
                  <input style={inputStyle} value={carry} onChange={(e) => setCarry(e.target.value)} placeholder="e.g. lab confirmation pending, carried to tomorrow" />
                </Field>
              )}
              <Btn variant="primary" disabled={busy || !roles?.can_close_day || !canCloseSel}
                title={!roles?.can_close_day ? 'Day close needs a Billing Manager or Admin' : undefined}
                onClick={() => act(() => billingService.closePeriod({ period_type: 'DAILY', date: sel.date, carry_forward_note: carry || undefined }), `${sel.label} closed and locked.`)}>
                <Lock size={15} /> Close day
              </Btn>
            </div>
          )}
          {sel?.lock && (
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lockLine(sel.lock)}
              <ReopenControls lock={sel.lock} reason={reason} setReason={setReason} busy={busy} canApprove={!!roles?.can_approve_reopen} act={act} />
            </div>
          )}
        </section>

        <section style={{ ...card }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 15 }}>Months & financial year</div>
          {(data?.months || []).map((m) => (
            <div key={m.month} style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <b style={{ fontSize: 14 }}>{m.label}</b>
                <span style={{ fontSize: 12, fontWeight: 500, color: m.status === 'LOCKED' ? C.green : m.status === 'LIVE' ? C.amber : C.primary }}>
                  {m.status === 'LOCKED' ? 'Closed' : m.status === 'LIVE' ? 'Current month' : m.status === 'REOPENED' ? 'Reopened' : 'Open'}
                </span>
              </div>
              {m.lock ? (
                <>
                  {lockLine(m.lock)}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Btn style={{ height: 30, fontSize: 12 }} onClick={() => billingService.downloadCsv(`/billing/period-close/${m.lock!.id}/journal`, {}, `${m.lock!.journal_reference}.csv`).catch((e) => setError(apiError(e, 'Export failed.')))}>
                      <Download size={13} /> ERP journal
                    </Btn>
                  </div>
                  <ReopenControls lock={m.lock} reason={reason} setReason={setReason} busy={busy} canApprove={!!roles?.can_approve_reopen} act={act} />
                </>
              ) : m.status !== 'LIVE' && (
                <Btn style={{ alignSelf: 'flex-start' }} disabled={busy || !roles?.can_close_month}
                  title={!roles?.can_close_month ? 'Month close needs a Billing Admin or Finance' : undefined}
                  onClick={() => act(() => billingService.closePeriod({ period_type: 'MONTHLY', date: `${m.month}-01` }), `${m.label} closed. GST summary and ERP journal frozen.`)}>
                  <Lock size={14} /> Close month
                </Btn>
              )}
            </div>
          ))}
          {data && (
            <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <b style={{ fontSize: 14 }}>{data.financial_year.label}</b>
                <span style={{ fontSize: 12, color: C.muted }}>Year close by the CFO after statutory audit adjustments.</span>
              </span>
              {data.financial_year.lock ? <span style={{ color: C.green, fontSize: 12 }}>Closed</span> : (
                <Btn disabled={busy || !roles?.can_close_year} title={!roles?.can_close_year ? 'Year close needs the CFO (Finance)' : undefined}
                  onClick={() => act(() => billingService.closePeriod({ period_type: 'ANNUAL', date: data.today }), `${data.financial_year.label} closed.`)}>
                  <Lock size={14} /> Close year
                </Btn>
              )}
            </div>
          )}
        </section>
      </div>

      <section style={{ ...card, marginTop: 16 }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 15 }}>Reopen requests</div>
        {(data?.reopen_requests || []).length === 0 && <Empty text="None. Reopening needs CFO approval and expires after 24 hours." />}
        {(data?.reopen_requests || []).map((l) => (
          <div key={l.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,1fr) 2fr minmax(140px,1fr)', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
            <b>{l.period_name}</b>
            <span>{l.reopen.reason} <span style={{ color: C.muted }}>· {l.reopen.requested_by}</span></span>
            <span style={{ color: l.status === 'REOPENED' ? C.amber : C.primary, ...mono, fontSize: 12 }}>
              {l.status === 'REOPENED' ? `Open until ${l.reopen.expires_at ? new Date(l.reopen.expires_at).toLocaleString() : ''}` : 'Awaiting CFO'}
            </span>
          </div>
        ))}
      </section>
    </>
  );
};

const ReopenControls: React.FC<{
  lock: PeriodLock;
  reason: string;
  setReason: (v: string) => void;
  busy: boolean;
  canApprove: boolean;
  act: (fn: () => Promise<unknown>, msg: string) => void;
}> = ({ lock, reason, setReason, busy, canApprove, act }) => {
  if (lock.status === 'REOPENED') {
    return (
      <Btn style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={() => act(() => billingService.periodAction(lock.id, 'relock'), `${lock.period_name} closed again.`)}>
        <Lock size={14} /> Close again now
      </Btn>
    );
  }
  if (lock.reopen.pending) {
    return canApprove ? (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: C.amber }}>Reopen requested: {lock.reopen.reason}</span>
        <Btn style={{ height: 30, fontSize: 12 }} disabled={busy} onClick={() => act(() => billingService.periodAction(lock.id, 'reopen-decision', { approve: true }), `${lock.period_name} reopened for 24 hours.`)}>Approve reopen</Btn>
        <Btn variant="danger" style={{ height: 30, fontSize: 12 }} disabled={busy} onClick={() => act(() => billingService.periodAction(lock.id, 'reopen-decision', { approve: false, note: 'Correct it in the open period' }), 'Reopen declined.')}>Decline</Btn>
      </div>
    ) : <span style={{ fontSize: 12, color: C.amber }}>Reopen awaiting CFO: {lock.reopen.reason}</span>;
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <Field label="Reopen reason"><input style={inputStyle} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why it must be reopened" /></Field>
      </div>
      <Btn disabled={busy || reason.trim().length < 10} onClick={() => act(() => billingService.periodAction(lock.id, 'reopen-request', { reason }), `Reopen request for ${lock.period_name} sent to the CFO.`)}>Request reopen</Btn>
    </div>
  );
};
