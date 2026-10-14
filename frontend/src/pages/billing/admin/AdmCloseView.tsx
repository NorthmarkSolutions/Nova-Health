// Billing · Admin — period close. Lock a day once its checklist is clean (shifts closed, nothing unbilled or carried
// with a reason), lock the month (freezes GST and the ERP journal), and the financial year (CFO). Closed periods reject
// new entries; reopening needs CFO approval and lasts 24 hours.
import React, { useCallback, useEffect, useState } from 'react';
import { Lock, LockOpen, CircleCheck, CircleAlert, Download, Check, X } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsField, HmsTone, INPUT } from '../../../components/hms';
import { billingService, PeriodCloseOverview, PeriodLock } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { DAY_STATUS } from '../finance/financeMath';
import { AdminDeskData, MONO, fmtWhen } from './adminDeskData';

export interface AdmCloseViewProps {
  data: AdminDeskData;
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
}

const PILLS = ['days', 'months', 'reopen'];
const TONE: Record<string, HmsTone> = { green: 'green', blue: 'blue', amber: 'amber', muted: 'gray' };

export const AdmCloseView: React.FC<AdmCloseViewProps> = ({ data, notify, initialFilter }) => {
  const { format } = useCurrency();
  const [view, setView] = useState<PeriodCloseOverview | null>(data.period);
  const [failed, setFailed] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'days');
  const [selected, setSelected] = useState<string | null>(null);
  const [carry, setCarry] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchFor = useCallback(async (date?: string) => {
    try {
      setView(await billingService.getPeriodClose(date));
      setFailed(null);
    } catch (e) {
      setFailed(apiError(e, 'Period close could not be loaded.'));
    }
  }, []);

  const p = view;
  const days = [...(p?.days || [])].reverse();
  const q = search.trim().toLowerCase();
  let rows: HmsListRow[] = [];
  if (pill === 'days')
    rows = days
      .filter((d) => !q || d.label.toLowerCase().includes(q))
      .map((d) => {
        const st = DAY_STATUS[d.status] || DAY_STATUS.OPEN;
        return { key: `d:${d.date}`, title: d.label, badge: <HmsBadge tone={TONE[st.tone]}>{st.label}</HmsBadge>, sub: d.date, metaLeft: d.status === 'LIVE' ? 'Still trading' : d.status === 'LOCKED' ? 'Entries locked' : d.status === 'REOPENED' ? 'Temporarily open' : 'Waiting to be closed' };
      });
  if (pill === 'months') {
    rows = (p?.months || [])
      .filter((m) => !q || m.label.toLowerCase().includes(q))
      .map((m) => ({ key: `m:${m.month}`, title: m.label, badge: <HmsBadge tone={m.status === 'LOCKED' ? 'green' : m.status === 'LIVE' ? 'gray' : m.status === 'REOPENED' ? 'amber' : 'blue'}>{m.status === 'LOCKED' ? 'Closed' : m.status === 'LIVE' ? 'Current' : m.status === 'REOPENED' ? 'Reopened' : 'Open'}</HmsBadge>, sub: m.lock ? `Closed by ${m.lock.closed_by || '—'}` : 'Month lock' }));
    if (p && (!q || p.financial_year.label.toLowerCase().includes(q))) rows.push({ key: 'y:fy', title: p.financial_year.label, badge: <HmsBadge tone={p.financial_year.lock ? 'green' : 'blue'}>{p.financial_year.lock ? 'Closed' : 'Open'}</HmsBadge>, sub: 'Financial year · CFO closes after statutory audit' });
  }
  if (pill === 'reopen')
    rows = (p?.reopen_requests || [])
      .filter((l) => !q || l.period_name.toLowerCase().includes(q))
      .map((l) => ({ key: `r:${l.id}`, title: l.period_name, badge: <HmsBadge tone={l.status === 'REOPENED' ? 'amber' : 'blue'}>{l.status === 'REOPENED' ? 'Open now' : 'Awaiting CFO'}</HmsBadge>, sub: l.reopen.reason, metaLeft: l.reopen.requested_by || '—', metaRight: l.status === 'REOPENED' && l.reopen.expires_at ? `until ${fmtWhen(l.reopen.expires_at)}` : undefined }));

  const activeKey = rows.find((r) => r.key === selected)?.key ?? rows[0]?.key ?? null;
  const activeDay = activeKey?.startsWith('d:') ? activeKey.slice(2) : null;
  useEffect(() => {
    if (!activeDay || activeDay === view?.selected.date) return;
    if (p?.days.find((d) => d.date === activeDay)?.status === 'LIVE') return;
    Promise.resolve().then(() => fetchFor(activeDay));
  }, [activeDay, view?.selected.date, p, fetchFor]);
  useEffect(() => {
    if (!view && data.period) Promise.resolve().then(() => setView(data.period));
  }, [data.period, view]);

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      notify(msg);
      setCarry('');
      setReason('');
      await Promise.all([fetchFor(activeDay || undefined), data.reload()]);
    } catch (e) {
      notify(apiError(e, 'The action failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const roles = p?.roles;
  const lockRows = (l: PeriodLock) => (
    <HmsSection title="Locked figures">
      <HmsRow label="Gross billed" value={format(l.totals.gross_billed)} />
      <HmsRow label="Discounts" value={format(l.totals.discounts)} />
      <HmsRow label="Tax" value={format(l.totals.tax)} />
      <HmsRow label="Collected" value={format(l.totals.collected)} />
      <HmsRow label="Refunded" value={format(l.totals.refunded)} />
      <HmsRow label="Outstanding" value={format(l.totals.outstanding)} />
      <HmsRow label="ERP journal" value={<span style={MONO}>{l.journal_reference || '—'}</span>} hint={`Closed ${fmtWhen(l.closed_at)} by ${l.closed_by || '—'}`} last={!l.carry_forward_note} />
      {l.carry_forward_note && <HmsRow label="Carried forward" value={l.carry_forward_note} last />}
    </HmsSection>
  );

  const reopenFooter = (l: PeriodLock) => {
    if (l.status === 'REOPENED')
      return (
        <HmsButton variant="primary" icon={Lock} block disabled={busy} onClick={() => act(() => billingService.periodAction(l.id, 'relock'), `${l.period_name} closed again`)}>
          Close again now
        </HmsButton>
      );
    if (l.reopen.pending)
      return roles?.can_approve_reopen ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
          <HmsButton variant="danger" icon={X} block disabled={busy} onClick={() => act(() => billingService.periodAction(l.id, 'reopen-decision', { approve: false, note: 'Correct it in the open period' }), 'Reopen declined')}>
            Decline
          </HmsButton>
          <HmsButton variant="primary" icon={Check} block disabled={busy} onClick={() => act(() => billingService.periodAction(l.id, 'reopen-decision', { approve: true }), `${l.period_name} reopened for 24 hours`)}>
            Approve reopen
          </HmsButton>
        </div>
      ) : (
        <span style={{ fontSize: '13px', color: '#b45309' }}>Reopen requested — awaiting the CFO.</span>
      );
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '10px', alignItems: 'end' }}>
        <HmsField label="Reason to reopen" htmlFor="pc-reason" hint="At least 10 characters. Goes to the CFO.">
          <input id="pc-reason" style={INPUT} value={reason} onChange={(e) => setReason(e.target.value)} />
        </HmsField>
        <HmsButton icon={LockOpen} disabled={busy || reason.trim().length < 10} onClick={() => act(() => billingService.periodAction(l.id, 'reopen-request', { reason }), `Reopen request for ${l.period_name} sent to the CFO`)}>
          Request reopen
        </HmsButton>
      </div>
    );
  };

  const renderDetail = (key: string | null) => {
    if (!p && !failed) return <HmsEmpty>Loading period close…</HmsEmpty>;
    if (failed || !p) return <HmsEmpty>{failed}</HmsEmpty>;
    const strip = (
      <HmsStatStrip
        items={[
          { label: 'Shifts open', value: p.kpis.shifts_open, note: 'Right now' },
          { label: 'Days not closed', value: p.kpis.days_not_closed, note: 'Last 14 days', tone: p.kpis.days_not_closed ? 'amber' : 'green' },
          { label: 'Blocking items', value: p.kpis.blocking_items, note: `For ${p.selected.label}`, tone: p.kpis.blocking_items ? 'red' : 'default' },
          { label: 'Last month closed', value: p.kpis.last_month_closed || 'None' },
        ]}
      />
    );
    if (!key) return <HmsEmpty>{pill === 'reopen' ? 'No reopen requests. Reopening needs CFO approval and expires after 24 hours.' : 'Nothing in this list.'}</HmsEmpty>;

    if (key.startsWith('d:')) {
      const date = key.slice(2);
      const day = p.days.find((d) => d.date === date);
      if (day?.status === 'LIVE')
        return (
          <>
            <HmsDetailHeader icon={Lock} title={day.label} badge={<HmsBadge tone="gray">Today</HmsBadge>} subtitle="Today is still trading — close it tomorrow once the last shift is signed off." />
            {strip}
            <HmsDetailBody>
              <HmsNotice tone="blue">Days are closed after they end.</HmsNotice>
            </HmsDetailBody>
          </>
        );
      const sel = p.selected.date === date ? p.selected : null;
      if (!sel) return <HmsEmpty>Loading the checklist…</HmsEmpty>;
      const unbilled = sel.checklist.some((c) => c.key === 'unbilled' && c.blocking);
      const other = sel.checklist.some((c) => c.blocking && c.key !== 'unbilled');
      const canClose = !sel.lock && !other && (!unbilled || carry.trim().length >= 10);
      return (
        <>
          <HmsDetailHeader icon={sel.lock ? Lock : LockOpen} title={sel.label} badge={<HmsBadge tone={sel.lock ? (sel.lock.status === 'REOPENED' ? 'amber' : 'green') : 'blue'}>{sel.lock ? (sel.lock.status === 'REOPENED' ? 'Reopened' : 'Closed') : 'Not closed'}</HmsBadge>} subtitle={sel.lock ? `Entries ${sel.lock.status === 'REOPENED' ? 'allowed until it is closed again' : 'locked'}` : 'Close once every checklist item is done'} />
          {strip}
          <HmsDetailBody>
            <HmsSection title="Day-close checklist">
              {sel.checklist.map((c, i) => (
                <HmsRow
                  key={c.key}
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      {c.ok ? <CircleCheck size={16} color="#16a34a" /> : <CircleAlert size={16} color={c.blocking ? '#dc2626' : '#f59e0b'} />}
                      {c.label}
                      {!c.blocking && !c.ok ? ' (advisory)' : ''}
                    </span>
                  }
                  hint={c.detail}
                  last={i === sel.checklist.length - 1}
                />
              ))}
            </HmsSection>
            {!sel.lock && unbilled && (
              <HmsSection title="Carry forward" padded>
                <HmsField label="Reason to carry unbilled items forward" htmlFor="pc-carry" hint="At least 10 characters. Unbilled items stay open into the next day.">
                  <input id="pc-carry" style={INPUT} value={carry} onChange={(e) => setCarry(e.target.value)} placeholder="e.g. lab confirmation pending, carried to tomorrow" />
                </HmsField>
              </HmsSection>
            )}
            {sel.lock && lockRows(sel.lock)}
          </HmsDetailBody>
          <HmsDetailFooter>
            {sel.lock ? (
              reopenFooter(sel.lock)
            ) : (
              <HmsButton variant="primary" icon={Lock} block disabled={busy || !roles?.can_close_day || !canClose} title={!roles?.can_close_day ? 'Day close needs a Billing Manager or Admin' : other ? 'Clear the blocking items first' : undefined} onClick={() => act(() => billingService.closePeriod({ period_type: 'DAILY', date: sel.date, carry_forward_note: carry || undefined }), `${sel.label} closed and locked`)}>
                Close {sel.label}
              </HmsButton>
            )}
          </HmsDetailFooter>
        </>
      );
    }

    if (key.startsWith('m:')) {
      const m = p.months.find((x) => `m:${x.month}` === key);
      if (!m) return <HmsEmpty>Select a month.</HmsEmpty>;
      return (
        <>
          <HmsDetailHeader icon={m.lock ? Lock : LockOpen} title={m.label} badge={<HmsBadge tone={m.lock ? 'green' : m.status === 'LIVE' ? 'gray' : 'blue'}>{m.lock ? 'Closed' : m.status === 'LIVE' ? 'Current month' : 'Open'}</HmsBadge>} subtitle="Month close freezes the GST summary and the ERP journal." />
          {strip}
          <HmsDetailBody>
            {m.status === 'LIVE' && <HmsNotice tone="blue">The current month closes after it ends.</HmsNotice>}
            {!m.lock && m.status !== 'LIVE' && p.kpis.days_not_closed > 0 && <HmsNotice tone="amber">{p.kpis.days_not_closed} day{p.kpis.days_not_closed === 1 ? ' is' : 's are'} still not closed in the last 14 days.</HmsNotice>}
            {m.lock && lockRows(m.lock)}
          </HmsDetailBody>
          <HmsDetailFooter>
            {m.lock ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <HmsButton icon={Download} block onClick={() => billingService.downloadCsv(`/billing/period-close/${m.lock!.id}/journal`, {}, `${m.lock!.journal_reference}.csv`).then(() => notify('ERP journal downloaded')).catch((e) => notify(apiError(e, 'Export failed'), 'error'))}>
                  Download ERP journal
                </HmsButton>
                {reopenFooter(m.lock)}
              </div>
            ) : (
              m.status !== 'LIVE' && (
                <HmsButton variant="primary" icon={Lock} block disabled={busy || !roles?.can_close_month} title={!roles?.can_close_month ? 'Month close needs a Billing Admin or Finance' : undefined} onClick={() => act(() => billingService.closePeriod({ period_type: 'MONTHLY', date: `${m.month}-01` }), `${m.label} closed · GST summary and ERP journal frozen`)}>
                  Close {m.label}
                </HmsButton>
              )
            )}
          </HmsDetailFooter>
        </>
      );
    }

    if (key === 'y:fy') {
      const fy = p.financial_year;
      return (
        <>
          <HmsDetailHeader icon={fy.lock ? Lock : LockOpen} title={fy.label} badge={<HmsBadge tone={fy.lock ? 'green' : 'blue'}>{fy.lock ? 'Closed' : 'Open'}</HmsBadge>} subtitle="Closed by the CFO after statutory audit adjustments." />
          {strip}
          <HmsDetailBody>{fy.lock ? lockRows(fy.lock) : <HmsNotice tone="blue">Year close is the CFO’s step; a Billing Admin sees it here for status.</HmsNotice>}</HmsDetailBody>
          {!fy.lock && (
            <HmsDetailFooter>
              <HmsButton variant="primary" icon={Lock} block disabled={busy || !roles?.can_close_year} title={!roles?.can_close_year ? 'Year close needs the CFO (Finance)' : undefined} onClick={() => act(() => billingService.closePeriod({ period_type: 'ANNUAL', date: p.today }), `${fy.label} closed`)}>
                Close {fy.label}
              </HmsButton>
            </HmsDetailFooter>
          )}
        </>
      );
    }

    const l = p.reopen_requests.find((x) => `r:${x.id}` === key);
    if (!l) return <HmsEmpty>Select a request.</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={LockOpen} title={l.period_name} badge={<HmsBadge tone={l.status === 'REOPENED' ? 'amber' : 'blue'}>{l.status === 'REOPENED' ? 'Open now' : 'Awaiting CFO'}</HmsBadge>} subtitle={`Requested by ${l.reopen.requested_by || '—'} · ${fmtWhen(l.reopen.requested_at)}`} />
        {strip}
        <HmsDetailBody>
          <HmsSection title="Request">
            <HmsRow label="Reason" value={l.reopen.reason || '—'} />
            <HmsRow label="Approved by" value={l.reopen.approved_by || '—'} />
            <HmsRow label="Open until" value={fmtWhen(l.reopen.expires_at)} last />
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>{reopenFooter(l)}</HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="adm-close"
      title="Period close"
      description="Lock days, months and the financial year once everything in them is complete."
      total={pill === 'days' ? days.length : pill === 'months' ? (p?.months.length ?? 0) + (p ? 1 : 0) : p?.reopen_requests.length ?? 0}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search period"
      pills={[
        { key: 'days', label: 'Days', count: p?.kpis.days_not_closed ?? 0, tone: p?.kpis.days_not_closed ? 'amber' : undefined },
        { key: 'months', label: 'Months & year', count: (p?.months || []).filter((m) => !m.lock && m.status !== 'LIVE').length },
        { key: 'reopen', label: 'Reopen requests', count: p?.reopen_requests.length ?? 0 },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
        setReason('');
      }}
      selectedKey={selected}
      onSelect={(k) => {
        if (k !== selected) {
          setCarry('');
          setReason('');
        }
        setSelected(k);
      }}
      primaryLabel="open period"
      detailLabel="Period"
      emptyText="Nothing in this list."
      renderDetail={renderDetail}
    />
  );
};
