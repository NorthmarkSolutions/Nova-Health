// Accounts Manager · budget & cost, compliance, operations, monitoring and tracking sections.
import React, { useState } from 'react';
import { PiggyBank, ChartPie, FileCheck, TriangleAlert, CalendarRange, CalendarCheck, Building2, Flag, ScrollText, MessageSquare, Send, Check, UserCheck, Search as SearchIcon, CircleCheck, Share2, ArrowRight, Download } from 'lucide-react';
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
  HmsProgress,
  HmsTone,
  HMS,
} from '../../../components/hms';
import { accountsService, TrailEntry } from '../../../services/accountsService';
import { fmtDateTime, humanize } from '../executive/executiveData';
import { MONO } from '../executive/executiveHelpers';
import { ESC_TO_LABEL, ESC_TYPE_LABEL, REASON_LABEL, SUP_CAPACITY, ageL, cr, escView, exportAuditCsv, hoursSince, useSectionSource } from './managerData';
import type { ManagerViewProps } from './managerHelpers';
import { MgrAction, MgrActionFooter } from './ManagerActions';
import { ManagerBars } from './ManagerBars';

const TONE: Record<string, HmsTone> = {
  'Over Budget': 'red',
  'Near Limit': 'amber',
  'Within Budget': 'green',
  New: 'blue',
  Assigned: 'gray',
  Investigating: 'amber',
  Escalated: 'red',
  Closed: 'green',
  'On Track': 'blue',
  Delayed: 'red',
  Done: 'green',
  open: 'red',
  investigating: 'amber',
  forwarded: 'blue',
  resolved: 'green',
};
const Tag: React.FC<{ s: string; label?: string }> = ({ s, label }) => <HmsBadge tone={TONE[s] || 'gray'}>{label || humanize(s)}</HmsBadge>;
const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>{children}</div>;
const has = (q: string, values: (string | number | undefined | null)[]) => !q || values.some((v) => String(v ?? '').toLowerCase().includes(q));

const Trail: React.FC<{ trail?: TrailEntry[] }> = ({ trail }) => (
  <HmsSection title={`Trail (${trail?.length || 0})`}>
    {trail?.length ? trail.map((t, i) => <HmsRow key={i} last={i === trail.length - 1} label={t.t} hint={t.c || undefined} value={<span style={{ fontSize: '12px', color: HMS.textSecondary }}>{`${t.who} · ${t.when}`}</span>} />) : <Muted>No actions recorded yet.</Muted>}
  </HmsSection>
);

/* ================================================================== */
/* Department budgets                                                  */
/* ================================================================== */

export const ManagerBudgetsView: React.FC<ManagerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { budgets } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);

  const q = search.trim().toLowerCase();
  const util = (b: (typeof budgets)[number]) => (b.budget ? b.used / b.budget : 0);
  const visible = budgets.filter((b) => (pill === 'all' || b.status === pill) && has(q, [b.dept, b.head])).sort((a, b) => util(b) - util(a));
  const count = (s: string) => budgets.filter((b) => b.status === s).length;

  const rows: HmsListRow[] = visible.map((b) => ({
    key: b.id,
    title: b.dept,
    badge: <Tag s={b.status} label={b.status} />,
    sub: `Head: ${b.head} · budget ${cr(b.budget)}`,
    metaLeft: `${Math.round(util(b) * 100)}% of budget used${b.esc ? ' · overrun escalated' : b.expl ? ' · explanation requested' : ''}`,
    metaRight: <strong>{cr(b.used)}</strong>,
    progress: { pct: Math.round(util(b) * 100), doneLabel: 'Budget fully used', tone: b.status === 'Over Budget' ? 'red' : b.status === 'Near Limit' ? 'amber' : 'blue' },
  }));

  const renderDetail = (key: string | null) => {
    const b = budgets.find((x) => x.id === key);
    if (!b) return <HmsEmpty>{budgets.length ? 'Select a department from the list to see its budget.' : 'No department budgets are set for this year.'}</HmsEmpty>;
    const u = util(b);
    const withCommitted = b.budget ? (b.used + b.committed) / b.budget : 0;
    const actions: MgrAction[] = [
      { key: 'explain', label: 'Request explanation', icon: MessageSquare, comment: 'required', commentHint: `Sent to ${b.head}.`, run: async (c) => (await accountsService.requestBudgetExplanation(b.dept, c)).message },
      ...(b.status !== 'Within Budget' && !b.esc ? [{ key: 'escOverrun', label: 'Escalate overrun', icon: TriangleAlert, comment: 'required' as const, commentHint: 'Goes to the Finance Controller.', run: async (c: string) => (await accountsService.escalateBudgetOverrun(b.dept, c)).message }] : []),
    ];
    return (
      <>
        <HmsDetailHeader icon={PiggyBank} title={b.dept} badge={<Tag s={b.status} label={b.status} />} subtitle={`Department budget · year to date · head ${b.head}`} />
        <HmsStatStrip
          items={[
            { label: 'Budget', value: cr(b.budget) },
            { label: 'Consumed', value: cr(b.used), tone: b.status === 'Over Budget' ? 'red' : b.status === 'Near Limit' ? 'amber' : 'default', note: `${Math.round(u * 100)}%` },
            { label: 'Committed', value: cr(b.committed), note: 'Open purchase orders' },
            { label: 'After commitments', value: cr(b.available), tone: b.available < 0 ? 'red' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {b.status === 'Over Budget' && <HmsNotice tone="red">Over budget by {cr(b.used - b.budget)} ({((u - 1) * 100).toFixed(1)}%).</HmsNotice>}
          {b.status === 'Near Limit' && <HmsNotice tone="amber">{Math.round(u * 100)}% consumed — near the limit.</HmsNotice>}
          {b.esc && <HmsNotice tone="blue">The overrun is with the Finance Controller.</HmsNotice>}
          {b.expl && <HmsNotice tone="blue">Explanation requested from {b.head}.</HmsNotice>}
          <HmsSection title="Utilisation" padded>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <HmsProgress showLabel pct={Math.round(u * 100)} doneLabel="Budget fully used" label="Budget consumed" tone={b.status === 'Over Budget' ? 'red' : b.status === 'Near Limit' ? 'amber' : 'blue'} />
              <HmsProgress showLabel pct={Math.round(withCommitted * 100)} doneLabel="Fully committed" label="Including open purchase orders" />
            </div>
          </HmsSection>
          <Trail trail={b.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="mgr-budgets"
      title="Department budgets"
      description="Year-to-date spend against prorated budget, highest utilisation first."
      total={budgets.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search department or head"
      pills={[
        { key: 'all', label: 'All', count: budgets.length },
        { key: 'Over Budget', label: 'Over budget', count: count('Over Budget'), tone: 'red' },
        { key: 'Near Limit', label: 'Near limit', count: count('Near Limit'), tone: 'amber' },
        { key: 'Within Budget', label: 'Within budget', count: count('Within Budget') },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Department budget"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Cost centre analysis                                                */
/* ================================================================== */

export const ManagerCostCenterView: React.FC<ManagerViewProps> = ({ data, initialFilter, initialSelect }) => {
  const [period, setPeriod] = useState<'Monthly' | 'Quarterly' | 'Yearly'>(initialFilter === 'Quarterly' || initialFilter === 'Yearly' ? initialFilter : 'Monthly');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const src = useSectionSource(() => accountsService.getCostCenterAnalysis(period), [period], data.lastSync);
  const cc = src.value;
  const centers = cc?.top_cost_centers || [];
  const q = search.trim().toLowerCase();
  const visible = [{ code: '__all', name: 'All cost centres' }, ...centers].filter((c) => c.code === '__all' || has(q, [c.code, c.name]));

  const rows: HmsListRow[] = visible.map((c) => {
    if (c.code === '__all') return { key: c.code, title: 'All cost centres', badge: <HmsBadge tone={cc && cc.variance > 0 ? 'red' : 'green'}>{cc ? `${cc.variance_pct > 0 ? '+' : ''}${cc.variance_pct}%` : '—'}</HmsBadge>, sub: cc ? `${cc.label} · ${cc.over_budget_count} over budget` : 'Loading…', metaRight: cc ? <strong>{cr(cc.total_spend)}</strong> : undefined };
    const x = centers.find((y) => y.code === c.code)!;
    return {
      key: x.code,
      title: x.name,
      badge: <HmsBadge tone={x.variance_pct > 0 ? 'red' : 'green'}>{`${x.variance_pct > 0 ? '+' : ''}${x.variance_pct.toFixed(1)}%`}</HmsBadge>,
      sub: `${x.code} · budget ${cr(x.budget)}`,
      metaLeft: `${x.budget ? Math.round((x.actual / x.budget) * 100) : 0}% of budget spent`,
      metaRight: <strong>{cr(x.actual)}</strong>,
      progress: { pct: x.budget ? Math.round((x.actual / x.budget) * 100) : 0, doneLabel: 'At or over budget', tone: x.variance_pct > 0 ? 'amber' : 'blue' },
    };
  });

  const renderDetail = (key: string | null) => {
    if (!cc) return <HmsEmpty>{src.failed ? 'Cost centre analysis is unavailable.' : 'Loading cost centres…'}</HmsEmpty>;
    const x = centers.find((y) => y.code === key);
    if (!x)
      return (
        <>
          <HmsDetailHeader icon={ChartPie} title={`All cost centres · ${cc.label}`} badge={<HmsBadge tone={cc.variance > 0 ? 'red' : 'green'}>{cc.variance > 0 ? 'Over budget' : 'Within budget'}</HmsBadge>} subtitle="Spending, expense mix and budget variance" />
          <HmsStatStrip
            items={[
              { label: 'Total spend', value: cr(cc.total_spend) },
              { label: 'Budget', value: cr(cc.total_budget) },
              { label: 'Variance', value: cr(cc.variance), tone: cc.variance > 0 ? 'red' : 'green', note: `${cc.variance_pct > 0 ? '+' : ''}${cc.variance_pct}%` },
              { label: 'Over budget', value: cc.over_budget_count, note: `of ${centers.length}` },
            ]}
          />
          <HmsDetailBody>
            <HmsSection title="Expense mix" padded>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cc.mix.map((m) => (
                  <HmsRow key={m.l} label={m.l} hint={m.w} value={<strong>{cr(m.amt)}</strong>} />
                ))}
              </div>
            </HmsSection>
            {cc.trend.length > 0 && (
              <HmsSection title="Variance trend · % vs budget" padded>
                <ManagerBars labels={cc.trend.map((t) => t[0])} a={cc.trend.map((t) => t[1])} colorA={(v) => (v > 0 ? '#f59e0b' : '#16a34a')} tip={(i) => `${cc.trend[i][0]} · ${cc.trend[i][1] > 0 ? '+' : ''}${cc.trend[i][1]}%`} />
              </HmsSection>
            )}
          </HmsDetailBody>
        </>
      );
    return (
      <>
        <HmsDetailHeader icon={ChartPie} title={x.name} badge={<HmsBadge tone={x.variance_pct > 0 ? 'red' : 'green'}>{x.variance_pct > 0 ? 'Over budget' : 'Within budget'}</HmsBadge>} subtitle={`${x.code} · ${cc.label}`} />
        <HmsStatStrip
          items={[
            { label: 'Actual', value: cr(x.actual) },
            { label: 'Budget', value: cr(x.budget) },
            { label: 'Variance', value: cr(x.variance), tone: x.variance > 0 ? 'red' : 'green' },
            { label: 'Variance %', value: `${x.variance_pct > 0 ? '+' : ''}${x.variance_pct.toFixed(1)}%`, tone: x.variance_pct > 0 ? 'red' : 'green' },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title="Against budget" padded>
            <HmsProgress showLabel pct={x.budget ? Math.round((x.actual / x.budget) * 100) : 0} doneLabel="At or over budget" label={`Spent ${cr(x.actual)} of ${cr(x.budget)} budget`} tone={x.variance_pct > 0 ? 'amber' : 'blue'} />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="mgr-costcenter"
      title="Cost centre analysis"
      description="Spending and budget variance by cost centre."
      total={centers.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search cost centre"
      pills={(['Monthly', 'Quarterly', 'Yearly'] as const).map((p) => ({ key: p, label: p, count: p === period ? centers.length : 0 }))}
      activePill={period}
      onPill={(p) => setPeriod(p as 'Monthly' | 'Quarterly' | 'Yearly')}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Cost centre"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* GST oversight                                                       */
/* ================================================================== */

export const ManagerGstView: React.FC<ManagerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { gst } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'open');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const statusOf = (g: (typeof gst)[number]) => (g.status === 'escalated' ? 'Escalated' : g.reviewed_by_manager ? 'Reviewed' : ({ submitted: 'With supervisor', rejected: 'Rejected', approved: 'Approved', returned: 'Returned', draft: 'Draft' } as Record<string, string>)[g.status] || humanize(g.status));
  const filters: Record<string, (g: (typeof gst)[number]) => boolean> = { open: (g) => g.status !== 'approved', rejected: (g) => g.status === 'rejected', approved: (g) => g.status === 'approved', all: () => true };
  const q = search.trim().toLowerCase();
  const visible = gst.filter((g) => (filters[pill] || filters.all)(g) && has(q, [g.reference_no, g.prepared_by_name, g.reviewed_by_name])).sort((a, b) => b.exception_count - a.exception_count);
  const count = (k: string) => gst.filter(filters[k]).length;

  const rows: HmsListRow[] = visible.map((g) => ({
    key: g.id,
    title: `${g.reference_no} · ${g.direction === 'outward' ? 'Outward' : 'Inward ITC'}`,
    badge: <HmsBadge tone={g.status === 'rejected' || g.status === 'escalated' ? 'red' : g.reviewed_by_manager || g.status === 'approved' ? 'green' : 'blue'}>{statusOf(g)}</HmsBadge>,
    sub: `${g.period_from} → ${g.period_to} · ${g.prepared_by_name}`,
    metaLeft: g.exception_count ? <HmsBadge tone="amber">{g.exception_count} exceptions</HmsBadge> : 'Clean',
    metaRight: <strong>{cr(g.tax_value)}</strong>,
  }));

  const renderDetail = (key: string | null) => {
    const g = gst.find((x) => x.id === key);
    if (!g) return <HmsEmpty>{gst.length ? 'Select a batch from the list to see its details.' : 'No GST batches have been prepared.'}</HmsEmpty>;
    const rate = g.invoice_count ? (g.exception_count / g.invoice_count) * 100 : 0;
    const clean = g.status === 'approved' && !g.exception_count;
    const actions: MgrAction[] =
      g.status !== 'escalated' && !clean
        ? [
            ...(!g.reviewed_by_manager ? [{ key: 'review', label: 'Mark exceptions reviewed', icon: Check, comment: 'optional' as const, run: async (c: string) => (await accountsService.reviewGSTBatchExceptions(g.id, c), `${g.reference_no} exceptions reviewed`) }] : []),
            { key: 'gstEsc', label: 'Escalate to controller', icon: Send, comment: 'required', run: async (c) => (await accountsService.escalateGSTBatch(g.id, c)).message },
          ]
        : [];
    return (
      <>
        <HmsDetailHeader icon={FileCheck} title={`${g.reference_no} · ${g.direction === 'outward' ? 'Outward' : 'Inward ITC'}`} badge={<HmsBadge tone={g.status === 'rejected' ? 'red' : 'blue'}>{statusOf(g)}</HmsBadge>} subtitle={`${g.period_from} → ${g.period_to} · prepared by ${g.prepared_by_name}`} />
        <HmsStatStrip
          items={[
            { label: 'Tax value', value: cr(g.tax_value) },
            { label: 'Invoices', value: g.invoice_count },
            { label: 'Exception rate', value: `${rate.toFixed(1)}%`, tone: rate > 2 ? 'amber' : 'default' },
            { label: 'Turnaround', value: `${g.turnaround_days} days`, tone: Number(g.turnaround_days) > 2 ? 'red' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {g.status === 'rejected' && <HmsNotice tone="red">Rejected{g.reviewed_by_name ? ` by ${g.reviewed_by_name}` : ''} — resubmission pending.</HmsNotice>}
          {rate > 2 && <HmsNotice tone="amber">Exception rate {rate.toFixed(1)}% — above the 2% quality threshold.</HmsNotice>}
          <HmsNotice tone="blue">Process review only — invoice-level corrections stay with the supervisor's team.</HmsNotice>
          <HmsSection title={`Exceptions (${g.exceptions.length})`}>
            {g.exceptions.length ? g.exceptions.map((x, i) => <HmsRow key={x.id} last={i === g.exceptions.length - 1} label={humanize(x.type)} hint={humanize(x.status)} value={<strong>{cr(x.amount)}</strong>} />) : <Muted>No exceptions in this batch.</Muted>}
          </HmsSection>
          <HmsSection title="Review">
            <HmsRow label="Reviewed by supervisor" value={g.reviewed_by_name || '—'} />
            <HmsRow label="Reviewed by you" value={g.reviewed_by_manager ? <HmsBadge tone="green">Yes</HmsBadge> : 'No'} last />
          </HmsSection>
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} note={g.status === 'escalated' ? 'With the Finance Controller.' : clean ? 'Clean batch — nothing to review.' : undefined} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="mgr-gst"
      title="GST oversight"
      description="Process quality of GST batches across supervisors."
      total={gst.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search batch or preparer"
      pills={[
        { key: 'open', label: 'Open issues', count: count('open') },
        { key: 'rejected', label: 'Rejected', count: count('rejected'), tone: 'red' },
        { key: 'approved', label: 'Approved', count: count('approved') },
        { key: 'all', label: 'All', count: gst.length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="GST batch"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Financial exceptions                                                */
/* ================================================================== */

export const ManagerExceptionsView: React.FC<ManagerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { excs, sups, execs } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'open');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const staff = [...sups.map((s) => s.name), ...execs.map((e) => e.name)];
  const TYPES = ['Duplicate Bill', 'Budget Violation', 'Missing Documentation', 'GST Issue', 'Large Variance'];
  const filters: Record<string, (x: (typeof excs)[number]) => boolean> = {
    open: (x) => x.status !== 'Closed',
    unassigned: (x) => x.status !== 'Closed' && !x.owner,
    ...Object.fromEntries(TYPES.map((t) => [t, (x: (typeof excs)[number]) => x.type === t])),
    closed: (x) => x.status === 'Closed',
  };
  const q = search.trim().toLowerCase();
  const visible = excs.filter((x) => (filters[pill] || filters.open)(x) && has(q, [x.id, x.ref, x.title, x.owner])).sort((a, b) => (a.status === 'Closed' ? 1 : 0) - (b.status === 'Closed' ? 1 : 0) || b.amt - a.amt);
  const count = (k: string) => excs.filter(filters[k]).length;

  const rows: HmsListRow[] = visible.map((x) => ({
    key: x.id,
    title: x.title,
    badge: <Tag s={x.status} label={x.status} />,
    sub: (
      <>
        {x.type} · <span style={MONO}>{x.id}</span> · {x.ref}
      </>
    ),
    metaLeft: <span style={{ color: x.age > 72 && x.status !== 'Closed' ? '#b91c1c' : undefined }}>{x.owner ? `Owner ${x.owner}` : 'Unassigned'} · {ageL(x.age)}</span>,
    metaRight: <strong>{cr(x.amt)}</strong>,
  }));

  const renderDetail = (key: string | null) => {
    const x = excs.find((e) => e.id === key);
    if (!x) return <HmsEmpty>{excs.length ? 'Select an exception from the list to see its details.' : 'No financial exceptions are open.'}</HmsEmpty>;
    const live = x.status !== 'Closed' && x.status !== 'Escalated';
    const act = (kind: 'assign' | 'investigate' | 'escalate' | 'close', done: string) => async (c: string, v: string) => {
      await accountsService.actOnFinancialException(x.id, kind, { owner: v, comment: c });
      return `${x.id} — ${done.replace('{owner}', v)}`;
    };
    const actions: MgrAction[] = live
      ? [
          { key: 'close', label: 'Close', icon: CircleCheck, comment: 'required', run: act('close', 'closed') },
          { key: 'assign', label: 'Assign owner', icon: UserCheck, select: { label: 'Owner', options: staff, current: x.owner || undefined }, run: act('assign', 'assigned to {owner}') },
          { key: 'investigate', label: 'Investigate', icon: SearchIcon, run: act('investigate', 'investigation started') },
          { key: 'escalate', label: 'Escalate', icon: Send, comment: 'required', run: act('escalate', 'escalated to the Finance Controller') },
        ]
      : [];
    return (
      <>
        <HmsDetailHeader icon={TriangleAlert} title={x.title} badge={<Tag s={x.status} label={x.status} />} subtitle={`${x.type} · ${x.id} · ${x.src}`} />
        <HmsStatStrip
          items={[
            { label: 'Amount', value: cr(x.amt) },
            { label: 'Owner', value: x.owner || 'Unassigned', tone: x.owner ? 'default' : 'amber' },
            { label: 'Age', value: ageL(x.age), tone: x.age > 72 && live ? 'red' : 'default' },
            { label: 'Department', value: x.dept },
          ]}
        />
        <HmsDetailBody>
          {!x.owner && live && <HmsNotice tone="amber">No owner — assign one before the investigation.</HmsNotice>}
          {!live && <HmsNotice tone="blue">{x.status === 'Closed' ? 'Closed.' : 'With the Finance Controller.'}</HmsNotice>}
          <HmsSection title="Exception">
            <HmsRow label="Reference" value={x.ref} />
            <HmsRow label="Raised" value={x.raised} last />
          </HmsSection>
          <Trail trail={x.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="mgr-exceptions"
      title="Financial exceptions"
      description="Central exception centre — assign, investigate, escalate or close."
      total={excs.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search exception, reference or owner"
      pills={[
        { key: 'open', label: 'Open', count: count('open') },
        { key: 'unassigned', label: 'Unassigned', count: count('unassigned'), tone: 'red' },
        ...TYPES.map((t) => ({ key: t, label: t, count: count(t) })),
        { key: 'closed', label: 'Closed', count: count('closed') },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Exception"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Weekly financial review                                             */
/* ================================================================== */

export const ManagerWeeklyView: React.FC<ManagerViewProps> = ({ data, notify, onNavigateTab, initialFilter, initialSelect }) => {
  const [wk, setWk] = useState<'This Week' | 'Last Week'>(initialFilter === 'Last Week' ? 'Last Week' : 'This Week');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const src = useSectionSource(() => accountsService.getWeeklyReview(wk), [wk], data.lastSync);
  const w = src.value;

  type Item = { key: string; kind: 'summary' | 'dept' | 'risk'; title: string; sub: string; badge: React.ReactNode; amount?: number };
  const items: Item[] = w
    ? [
        { key: 'summary', kind: 'summary', title: `Weekly summary · ${w.range}`, sub: `${w.summary_lines.length} points · ${w.risks.length} risks`, badge: <HmsBadge tone="gray">Summary</HmsBadge> },
        ...w.risks.map((r, i) => ({ key: `risk:${i}`, kind: 'risk' as const, title: r.t, sub: 'Key risk', badge: <HmsBadge tone={r.tag === 'Critical' ? 'red' : r.tag === 'Warning' ? 'amber' : 'blue'}>{r.tag}</HmsBadge> })),
        ...w.dept_spending.map((d) => ({ key: `dept:${d.dept}`, kind: 'dept' as const, title: d.dept, sub: `Prior week ${cr(d.prev_amount)}`, badge: <HmsBadge tone={d.pct_change > 10 ? 'red' : d.pct_change < 0 ? 'green' : 'gray'}>{`${d.pct_change > 0 ? '+' : ''}${d.pct_change}%`}</HmsBadge>, amount: d.amount })),
      ]
    : [];
  const q = search.trim().toLowerCase();
  const visible = items.filter((i) => has(q, [i.title, i.sub]));
  const rows: HmsListRow[] = visible.map((i) => ({ key: i.key, title: i.title, badge: i.badge, sub: i.sub, metaRight: i.amount != null ? <strong>{cr(i.amount)}</strong> : undefined }));

  const delta = (cur: number, prev: number) => (prev ? (cur / prev - 1) * 100 : 0);
  const fig = (label: string, cur: number, prev: number, goodUp: boolean) => {
    const d = delta(cur, prev);
    return { label, value: cr(cur), note: `${d > 0 ? '+' : ''}${d.toFixed(1)}% vs prior`, tone: ((goodUp ? d >= 0 : d <= 0) ? 'green' : 'red') as 'green' | 'red' };
  };

  const renderDetail = (key: string | null) => {
    if (!w) return <HmsEmpty>{src.failed ? 'The weekly review is unavailable.' : 'Loading the weekly review…'}</HmsEmpty>;
    const i = items.find((x) => x.key === key) || items[0];
    const p = w.previous;
    if (i.kind === 'dept') {
      const d = w.dept_spending.find((x) => `dept:${x.dept}` === i.key)!;
      return (
        <>
          <HmsDetailHeader icon={CalendarRange} title={d.dept} badge={i.badge} subtitle={`Department spending · ${w.range}`} />
          <HmsStatStrip
            items={[
              { label: 'This week', value: cr(d.amount) },
              { label: 'Prior week', value: cr(d.prev_amount) },
              { label: 'Change', value: `${d.pct_change > 0 ? '+' : ''}${d.pct_change}%`, tone: d.pct_change > 10 ? 'red' : 'default' },
              { label: 'Budget', value: d.is_over ? 'Over' : 'Within', tone: d.is_over ? 'red' : 'green' },
            ]}
          />
          <HmsDetailBody>{d.is_over && <HmsNotice tone="red">{d.dept} is over budget.</HmsNotice>}</HmsDetailBody>
          <HmsDetailFooter>
            <HmsButton block icon={ArrowRight} onClick={() => onNavigateTab('budgets')}>
              Open department budgets
            </HmsButton>
          </HmsDetailFooter>
        </>
      );
    }
    return (
      <>
        <HmsDetailHeader icon={CalendarRange} title={`Weekly review · ${w.range}`} badge={<HmsBadge tone="gray">{wk}</HmsBadge>} subtitle="Collections, payments, balances and department spending" />
        <HmsStatStrip items={[fig('Collections', w.collections, p.collections, true), fig('Payments', w.payments, p.payments, false), fig('Receivables', w.receivables, p.receivables, false), fig('Payables', w.payables, p.payables, false)]} />
        <HmsDetailBody>
          {i.kind === 'risk' && <HmsNotice tone="amber">{i.title}</HmsNotice>}
          <HmsSection title="Department spending">
            <HmsRow label="Total this week" value={<strong>{cr(w.total_spend)}</strong>} hint={`Prior week ${cr(p.total_spend)}`} last />
          </HmsSection>
          <HmsSection title="Summary" padded>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', lineHeight: 1.5 }}>
              {w.summary_lines.length ? w.summary_lines.map((l) => <div key={l}>• {l}</div>) : <span style={{ color: HMS.textSecondary }}>No summary from the server.</span>}
            </div>
          </HmsSection>
        </HmsDetailBody>
        <MgrActionFooter
          actions={[{ key: 'share', label: 'Share with Finance Controller', icon: Share2, run: async () => (await accountsService.shareWeeklyReview(wk), 'Weekly summary shared with the Finance Controller') }]}
          notify={notify}
          reload={data.reload}
        />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="mgr-weekly"
      title="Weekly financial review"
      description="Weekly command centre for collections, payments, balances and spending."
      total={items.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search department or risk"
      pills={(['This Week', 'Last Week'] as const).map((p) => ({ key: p, label: p, count: p === wk ? items.length : 0 }))}
      activePill={wk}
      onPill={(p) => setWk(p as 'This Week' | 'Last Week')}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Weekly review"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Month-end readiness                                                 */
/* ================================================================== */

export const ManagerMonthEndView: React.FC<ManagerViewProps> = ({ data, notify, onNavigateTab, initialFilter, initialSelect }) => {
  const { monthend, sups, execs, period } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const staff = [...sups.map((s) => s.name), ...execs.map((e) => e.name)];
  const list = monthend?.checklist || [];
  const q = search.trim().toLowerCase();
  const visible = list.filter((k) => (pill === 'all' || k.status === pill) && has(q, [k.title, k.owner, k.desc]));
  const count = (s: string) => list.filter((k) => k.status === s).length;

  const rows: HmsListRow[] = visible.map((k) => ({
    key: k.code,
    title: k.title,
    badge: <Tag s={k.status} label={k.status} />,
    sub: `${k.owner} · due ${k.due}${k.escalated ? ' · escalated' : ''}`,
    metaLeft: `${k.pct}% complete`,
    progress: { pct: k.pct, doneLabel: 'Done', tone: k.status === 'Delayed' ? 'amber' : 'blue' },
  }));

  const renderDetail = (key: string | null) => {
    if (!monthend) return <HmsEmpty>{data.loading ? 'Loading month-end readiness…' : 'Month-end readiness is unavailable.'}</HmsEmpty>;
    const k = list.find((x) => x.code === key);
    const delayed = list.filter((x) => x.status === 'Delayed');
    const escalate: MgrAction = { key: 'escDelays', label: 'Escalate delays', icon: Send, run: async () => {
      const res = await accountsService.escalateMonthEndDelays(period);
      return res.count ? `${res.count} delayed task(s) escalated to the Finance Controller` : 'No new delayed tasks to escalate.';
    } };
    if (!k)
      return (
        <>
          <HmsDetailHeader icon={CalendarCheck} title={`Month-end · ${monthend.period}`} badge={<HmsBadge tone={monthend.readiness_score >= 90 ? 'green' : 'amber'}>{monthend.readiness_score}% ready</HmsBadge>} subtitle={`Target ${monthend.target_date} · controller close ${monthend.controller_close_date}`} />
          <HmsDetailBody>
            <HmsProgress showLabel pct={monthend.readiness_score} doneLabel="Ready for close" label="Readiness" />
          </HmsDetailBody>
          <MgrActionFooter actions={delayed.length ? [escalate] : []} notify={notify} reload={data.reload} />
        </>
      );
    return (
      <>
        <HmsDetailHeader icon={CalendarCheck} title={k.title} badge={<Tag s={k.status} label={k.status} />} subtitle={`${monthend.period} close · owner ${k.owner} · due ${k.due}`} />
        <HmsStatStrip
          items={[
            { label: 'Readiness', value: `${monthend.readiness_score}%`, tone: monthend.readiness_score >= 90 ? 'green' : 'amber', note: `Target ${monthend.target_date}` },
            { label: 'Tasks done', value: `${monthend.completed_count}/${list.length}` },
            { label: 'Delayed', value: delayed.length, tone: delayed.length ? 'red' : 'green' },
            { label: 'Controller close', value: monthend.controller_close_date },
          ]}
        />
        <HmsDetailBody>
          {k.escalated && <HmsNotice tone="blue">Escalated to the Finance Controller.</HmsNotice>}
          <HmsSection title="Task" padded>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '14px', color: HMS.text, lineHeight: 1.5 }}>{k.desc}</div>
              <HmsProgress showLabel pct={k.pct} doneLabel="Done" label="Complete" tone={k.status === 'Delayed' ? 'amber' : 'blue'} />
              {k.screen && (
                <div>
                  <HmsButton size="sm" icon={ArrowRight} onClick={() => onNavigateTab(k.screen)}>
                    Open {humanize(k.screen)}
                  </HmsButton>
                </div>
              )}
            </div>
          </HmsSection>
        </HmsDetailBody>
        <MgrActionFooter
          actions={[
            { key: 'assign', label: 'Reassign owner', icon: UserCheck, select: { label: 'New owner', options: staff.filter((o) => o !== k.owner), current: k.owner }, run: async (_c, v) => (await accountsService.reassignMonthEndChecklistOwner(period, k.code, v), `Checklist item assigned to ${v}`) },
            ...(delayed.length ? [escalate] : []),
          ]}
          notify={notify}
          reload={data.reload}
        />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="mgr-monthend"
      title="Month-end readiness"
      description={monthend ? `Close checklist for ${monthend.period} — the Finance Controller locks it on ${monthend.controller_close_date}.` : 'Close checklist for the period being closed.'}
      total={list.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search task or owner"
      pills={[
        { key: 'all', label: 'All', count: list.length },
        { key: 'Delayed', label: 'Delayed', count: count('Delayed'), tone: 'red' },
        { key: 'On Track', label: 'On track', count: count('On Track') },
        { key: 'Done', label: 'Done', count: count('Done') },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Checklist item"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Team performance                                                    */
/* ================================================================== */

export const ManagerTeamView: React.FC<ManagerViewProps> = ({ data, initialFilter, initialSelect }) => {
  const { sups, execs } = data;
  const [pill, setPill] = useState(initialFilter === 'executives' ? 'executives' : 'supervisors');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const supRows = sups
    .map((s) => {
      const decided = s.approved + s.returns;
      // Quality (first-pass share of decisions) and speed; no speed score without a measured resolution time
      const score = Math.round((decided ? (s.approved / decided) * 60 : 0) + (s.resolution_hours == null ? 0 : Math.max(0, 40 - s.resolution_hours * 3)));
      return { ...s, score };
    })
    .sort((a, b) => b.score - a.score);
  const exRows = execs.map((e) => ({ ...e, prod: parseInt(e.productivity, 10) || 0, fp: parseInt(e.first_pass, 10) || 0 })).map((e) => ({ ...e, score: Math.round(e.prod * 0.5 + e.fp * 0.5) })).sort((a, b) => b.score - a.score);
  const q = search.trim().toLowerCase();

  const rows: HmsListRow[] =
    pill === 'supervisors'
      ? supRows.filter((s) => has(q, [s.name, s.code])).map((s, i) => ({
          key: `s:${s.code}`,
          title: `${i + 1}. ${s.name}`,
          badge: <HmsBadge tone={s.pending > SUP_CAPACITY ? 'red' : 'green'}>{s.pending > SUP_CAPACITY ? 'Overloaded' : 'Balanced'}</HmsBadge>,
          sub: `${s.code} · ${s.approved} approvals · ${s.returns} returns`,
          metaLeft: `Queue ${s.pending}/${SUP_CAPACITY}`,
          metaRight: `Score ${s.score}`,
          progress: { pct: Math.round((s.pending / SUP_CAPACITY) * 100), doneLabel: 'At capacity', tone: s.pending > SUP_CAPACITY ? 'red' : 'blue' },
        }))
      : exRows.filter((e) => has(q, [e.name, e.code])).map((e, i) => ({
          key: `e:${e.code}`,
          title: `${i + 1}. ${e.name}`,
          badge: <HmsBadge tone={e.fp < 88 ? 'amber' : 'green'}>{e.fp}% first pass</HmsBadge>,
          sub: `${e.code} · ${e.processed} processed · ${e.pending} pending`,
          metaLeft: `Productivity ${e.prod}%`,
          metaRight: `Score ${e.score}`,
          progress: { pct: e.prod, doneLabel: 'Full productivity' },
        }));

  const renderDetail = (key: string | null) => {
    if (key?.startsWith('s:')) {
      const s = supRows.find((x) => `s:${x.code}` === key)!;
      return (
        <>
          <HmsDetailHeader avatar={s.name} title={s.name} badge={<HmsBadge tone="blue">{s.code}</HmsBadge>} subtitle="Accounts Supervisor" />
          <HmsStatStrip
            items={[
              { label: 'Approvals', value: s.approved },
              { label: 'Returns', value: s.returns, tone: s.returns ? 'amber' : 'default' },
              { label: 'Escalations', value: s.escalations },
              { label: 'Resolution', value: s.resolution_hours == null ? '—' : `${s.resolution_hours} h`, note: 'Submit → decision' },
            ]}
          />
          <HmsDetailBody>
            {s.pending > SUP_CAPACITY && <HmsNotice tone="red">Queue of {s.pending} is over the {SUP_CAPACITY}-item capacity — rebalance work.</HmsNotice>}
            <HmsSection title="Queue load" padded>
              <HmsProgress showLabel pct={Math.round((s.pending / SUP_CAPACITY) * 100)} doneLabel="At capacity" label={`Queue · ${s.pending} of ${SUP_CAPACITY} items`} tone={s.pending > SUP_CAPACITY ? 'red' : 'blue'} />
            </HmsSection>
            <HmsSection title="Score">
              <HmsRow label="Leaderboard score" hint="First-pass quality and turnaround, from the approval trail" value={<strong>{s.score}</strong>} last />
            </HmsSection>
          </HmsDetailBody>
        </>
      );
    }
    const e = exRows.find((x) => `e:${x.code}` === key);
    if (!e) return <HmsEmpty>{sups.length + execs.length ? 'Select a team member to see their performance.' : 'Team performance is unavailable.'}</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader avatar={e.name} title={e.name} badge={<HmsBadge tone="blue">{e.code}</HmsBadge>} subtitle="Accounts Executive" />
        <HmsStatStrip
          items={[
            { label: 'Processed', value: e.processed },
            { label: 'Pending', value: e.pending },
            { label: 'Returned', value: e.returned, tone: e.returned ? 'amber' : 'default' },
            { label: 'Errors', value: e.errors, tone: e.errors ? 'red' : 'default' },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title="Quality" padded>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <HmsProgress showLabel pct={e.prod} doneLabel="Full productivity" label="Productivity" />
              <HmsProgress showLabel pct={e.fp} doneLabel="Every item passed first time" label="First-pass rate" tone={e.fp < 88 ? 'amber' : 'blue'} />
            </div>
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="mgr-team"
      title="Team performance"
      description="Approvals, returns, turnaround and queue load, ranked."
      total={sups.length + execs.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search name or code"
      pills={[
        { key: 'supervisors', label: 'Supervisors', count: sups.length },
        { key: 'executives', label: 'Executives', count: execs.length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Team member"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Department performance                                              */
/* ================================================================== */

export const ManagerDeptPerfView: React.FC<ManagerViewProps> = ({ data, onNavigateTab, initialSelect }) => {
  const { deptPerf, payers } = data;
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const arBy = (d: string) => payers.filter((r) => r.dept === d).reduce((a, r) => a + r.amt, 0);
  const depts = (deptPerf?.departments || []).map((d) => ({ ...d, arLive: arBy(d.dept) }));
  const q = search.trim().toLowerCase();
  const visible = depts.filter((d) => has(q, [d.dept])).sort((a, b) => b.revenue - a.revenue);

  const rows: HmsListRow[] = visible.map((d) => ({
    key: d.dept,
    title: d.dept,
    badge: <HmsBadge tone={d.growth_pct < 0 ? 'red' : 'green'}>{`${d.growth_pct > 0 ? '+' : ''}${d.growth_pct.toFixed(1)}%`}</HmsBadge>,
    sub: `Revenue ${cr(d.revenue)} · expense ${cr(d.expense)}`,
    metaLeft: `Margin ${d.margin_pct.toFixed(1)}%`,
    metaRight: <strong>{cr(d.profit)}</strong>,
  }));

  const renderDetail = (key: string | null) => {
    if (!deptPerf) return <HmsEmpty>{data.loading ? 'Loading department performance…' : 'Department performance is unavailable.'}</HmsEmpty>;
    const d = depts.find((x) => x.dept === key);
    if (!d) return <HmsEmpty>Select a department from the list.</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={Building2} title={d.dept} badge={<HmsBadge tone={d.margin_pct < 20 ? 'amber' : 'green'}>{d.margin_pct.toFixed(1)}% margin</HmsBadge>} subtitle={deptPerf.period} />
        <HmsStatStrip
          items={[
            { label: 'Revenue', value: cr(d.revenue), note: `${Math.round((d.revenue / (deptPerf.total_revenue || 1)) * 100)}% of hospital` },
            { label: 'Expense', value: cr(d.expense) },
            { label: 'Profit', value: cr(d.profit), tone: d.profit < 0 ? 'red' : 'green' },
            { label: 'Growth', value: `${d.growth_pct > 0 ? '+' : ''}${d.growth_pct.toFixed(1)}%`, tone: d.growth_pct < 0 ? 'red' : 'green', note: 'vs prior month' },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title="Profitability" padded>
            <HmsProgress showLabel pct={Math.max(0, Math.round(d.margin_pct))} doneLabel="Full margin" label="Operating margin" tone={d.margin_pct < 20 ? 'amber' : 'blue'} />
          </HmsSection>
          <HmsSection title="Receivables">
            <HmsRow label="Outstanding (live)" value={d.arLive ? cr(d.arLive) : '—'} hint={d.arLive ? `${Math.round((d.arLive / (d.revenue || 1)) * 100)}% of revenue` : 'No open payer balances — cash sales'} last />
          </HmsSection>
          <HmsSection title="Hospital totals">
            <HmsRow label="Revenue" value={cr(deptPerf.total_revenue)} />
            <HmsRow label="Expense" value={cr(deptPerf.total_expense)} />
            <HmsRow label="Profitability" value={`${Math.round(deptPerf.profitability_pct)}%`} hint={`Growth ${deptPerf.growth_pct > 0 ? '+' : ''}${deptPerf.growth_pct}%`} last />
          </HmsSection>
        </HmsDetailBody>
        {d.arLive > 0 && (
          <HmsDetailFooter>
            <HmsButton block icon={ArrowRight} onClick={() => onNavigateTab('receivables')}>
              Open receivables
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="mgr-deptperf"
      title="Department performance"
      description={deptPerf ? `Revenue, expense and profitability · ${deptPerf.period}` : 'Revenue, expense and profitability by clinical department.'}
      total={depts.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search department"
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Department"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Escalations                                                         */
/* ================================================================== */

export const ManagerEscalationsView: React.FC<ManagerViewProps> = ({ data, notify, onNavigateTab, initialFilter, initialSelect }) => {
  const { escs, queue } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'open');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const q = search.trim().toLowerCase();
  const visible = escs.filter((e) => (pill === 'all' || escView(e) === pill) && has(q, [e.reference_no, e.type, e.reason, e.raised_by_full_name]));
  const count = (s: string) => escs.filter((e) => escView(e) === s).length;

  const rows: HmsListRow[] = visible.map((e) => ({
    key: e.id,
    title: `${ESC_TYPE_LABEL[e.type] || humanize(e.type)} — ${REASON_LABEL[e.reason] || humanize(e.reason)}`,
    badge: <Tag s={escView(e)} />,
    sub: (
      <>
        <span style={MONO}>{e.reference_no}</span> · {e.raised_by_full_name} → {ESC_TO_LABEL[e.raised_to] || humanize(e.raised_to)}
      </>
    ),
    metaLeft: `${ageL(hoursSince(e.created_at))} ago`,
    metaRight: Number(e.amount) ? <strong>{cr(e.amount)}</strong> : undefined,
  }));

  const renderDetail = (key: string | null) => {
    const e = escs.find((x) => x.id === key);
    if (!e) return <HmsEmpty>{escs.length ? 'Select an escalation from the list to see its details.' : 'No escalations have been raised.'}</HmsEmpty>;
    const v = escView(e);
    const linked = e.type === 'approval';
    const live = v === 'open' || v === 'investigating';
    const go = (action: 'investigate' | 'forward_to_controller' | 'resolve', done: string) => async (c: string) => (await accountsService.transitionEscalation(e.id, action, c), `${e.reference_no} — ${done}`);
    const actions: MgrAction[] = !live
      ? []
      : linked
        ? []
        : [
            { key: 'resolve', label: 'Mark resolved', icon: CircleCheck, comment: 'required', run: go('resolve', 'resolved') },
            ...(v === 'open' ? [{ key: 'investigate', label: 'Start investigation', icon: SearchIcon, comment: 'optional' as const, run: go('investigate', 'investigation started') }] : []),
            { key: 'forward', label: 'Forward to controller', icon: Send, comment: 'required', run: go('forward_to_controller', 'forwarded to the Finance Controller') },
          ];
    const notes = (e.notes || []).map((n) => ({ t: n.t || n.text || 'Note', who: n.who || n.author || '—', when: n.when || n.timestamp || '' }));
    const linkedReq = linked ? queue.find((r) => r.document_id === e.entity_id) : undefined;
    return (
      <>
        <HmsDetailHeader icon={Flag} title={`${ESC_TYPE_LABEL[e.type] || humanize(e.type)} — ${REASON_LABEL[e.reason] || humanize(e.reason)}`} badge={<Tag s={v} />} subtitle={`${e.reference_no} · raised ${fmtDateTime(e.created_at)}`} />
        <HmsStatStrip
          items={[
            { label: 'Amount', value: Number(e.amount) ? cr(e.amount) : '—' },
            { label: 'Raised by', value: e.raised_by_full_name || '—' },
            { label: 'Assigned to', value: ESC_TO_LABEL[e.raised_to] || humanize(e.raised_to) },
            { label: 'Record', value: humanize(e.entity_type) },
          ]}
        />
        <HmsDetailBody>
          {linked && <HmsNotice tone="blue">Escalated by {e.raised_by_full_name}. Decide it in Escalated approvals.</HmsNotice>}
          {e.resolution && <HmsNotice tone="green">Resolution: {e.resolution}</HmsNotice>}
          {!live && !e.resolution && <HmsNotice tone="blue">{v === 'forwarded' ? 'With the Finance Controller.' : 'Resolved.'}</HmsNotice>}
          <Trail trail={notes} />
        </HmsDetailBody>
        {linked && live ? (
          <HmsDetailFooter>
            <HmsButton variant="primary" block icon={ArrowRight} disabled={!linkedReq} title={linkedReq ? undefined : 'The linked approval is no longer in your queue'} onClick={() => linkedReq && onNavigateTab('escalated', 'all', linkedReq.id)}>
              Open in Escalated approvals
            </HmsButton>
          </HmsDetailFooter>
        ) : (
          <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="mgr-escalations"
      title="Escalations"
      description="Every escalated financial issue, from supervisors and from you, through to resolution."
      total={escs.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search reference, type or person"
      pills={[
        { key: 'open', label: 'Open', count: count('open'), tone: 'red' },
        { key: 'investigating', label: 'Investigating', count: count('investigating'), tone: 'amber' },
        { key: 'forwarded', label: 'Forwarded', count: count('forwarded') },
        { key: 'resolved', label: 'Resolved', count: count('resolved') },
        { key: 'all', label: 'All', count: escs.length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Escalation"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Audit trail (read-only, CSV export)                                 */
/* ================================================================== */

export const ManagerAuditView: React.FC<ManagerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { audit } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'week');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [now] = useState(() => Date.now());
  const daysAgo = (iso: string) => Math.floor((now - new Date(iso).getTime()) / 86400000);
  const LIM: Record<string, number> = { today: 0, week: 6, month: 31 };
  const q = search.trim().toLowerCase();
  const visible = audit.filter((a) => daysAgo(a.occurred_at) <= (LIM[pill] ?? 31) && has(q, [a.reference_no, a.reason, a.actor_name, a.action, a.module]));

  const rows: HmsListRow[] = visible.map((a) => ({
    key: a.id,
    title: `${humanize(a.action)} · ${a.reference_no || humanize(a.module)}`,
    badge: <HmsBadge tone="gray">{humanize(a.module)}</HmsBadge>,
    sub: `${a.actor_name} · ${humanize(a.actor_role)}`,
    metaLeft: fmtDateTime(a.occurred_at),
  }));

  const renderDetail = (key: string | null) => {
    const a = audit.find((x) => x.id === key);
    if (!a) return <HmsEmpty>{audit.length ? 'Select a record from the list to see its details.' : 'No department activity in the last 31 days.'}</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={ScrollText} title={`${humanize(a.action)} · ${a.reference_no || humanize(a.module)}`} badge={<HmsBadge tone="gray">Read-only</HmsBadge>} subtitle={`${a.actor_name} · ${humanize(a.actor_role)} · ${fmtDateTime(a.occurred_at)}`} />
        <HmsDetailBody>
          <HmsSection title="Record">
            <HmsRow label="Module" value={humanize(a.module)} />
            <HmsRow label="Action" value={humanize(a.action)} />
            <HmsRow label="Reference" value={a.reference_no || '—'} />
            <HmsRow label="Detail" value={a.reason || '—'} last />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="mgr-audit"
      title="Audit trail"
      description="Approvals, budget actions, escalations, write-offs and assignments — immutable."
      total={audit.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search user, action or reference"
      pills={[
        { key: 'today', label: 'Today', count: audit.filter((a) => daysAgo(a.occurred_at) <= 0).length },
        { key: 'week', label: 'This week', count: audit.filter((a) => daysAgo(a.occurred_at) <= 6).length },
        { key: 'month', label: 'This month', count: audit.filter((a) => daysAgo(a.occurred_at) <= 31).length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      headerAction={
        <HmsButton
          icon={Download}
          onClick={() => {
            exportAuditCsv(visible);
            notify(`Exported ${visible.length} audit records`);
          }}
          disabled={!visible.length}
          title="Export the filtered records as CSV"
        >
          Export
        </HmsButton>
      }
      detailLabel="Audit record"
      renderDetail={renderDetail}
    />
  );
};

