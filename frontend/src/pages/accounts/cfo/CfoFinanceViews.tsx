// CFO · financial health, performance and planning: overview, P&L, cash flow, balance sheet,
// department profitability, service lines, budget strategy and forecasting.
import React, { useState } from 'react';
import { LayoutDashboard, IndianRupee, Wallet, Scale, Building2, Activity, PiggyBank, TrendingUp, ArrowRight, Check, CornerUpLeft, MessageSquare } from 'lucide-react';
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
  INPUT,
  HMS,
} from '../../../components/hms';
import { accountsService } from '../../../services/accountsService';
import { humanize } from '../executive/executiveData';
import { useSectionSource } from '../manager/managerData';
import { MgrAction, MgrActionFooter } from '../manager/ManagerActions';
import { ManagerBars } from '../manager/ManagerBars';
import { CfoCashFlow, CfoDeptProfitability, CfoForecast, CfoProfitLoss, CfoServiceLines, crc, isAwaitingCfo } from './cfoData';
import type { CfoViewProps } from './cfoHelpers';

const has = (q: string, values: (string | number | undefined | null)[]) => !q || values.some((v) => String(v ?? '').toLowerCase().includes(q));
const pct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
const Loading: React.FC<{ failed: boolean; what: string }> = ({ failed, what }) => <HmsEmpty>{failed ? `${what} is unavailable.` : `Loading ${what.toLowerCase()}…`}</HmsEmpty>;

/* ================================================================== */
/* Overview — CFO questions, upcoming decisions, department ranking   */
/* ================================================================== */

export const CfoOverviewView: React.FC<CfoViewProps> = ({ data, onNavigateTab, initialFilter, initialSelect }) => {
  const { dash } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);

  type Item = { key: string; kind: 'summary' | 'question' | 'decision'; title: string; sub: string; badge: React.ReactNode; target?: string; select?: string };
  const items: Item[] = dash
    ? [
        { key: 'summary', kind: 'summary', title: 'Year to date at a glance', sub: `Revenue ${dash.kpis.total_revenue} · profit ${dash.kpis.net_profit}`, badge: <HmsBadge tone={dash.kpis.on_track ? 'green' : 'amber'}>{dash.kpis.on_track ? 'On track' : 'Off track'}</HmsBadge> },
        ...dash.questions.map((q, i) => ({ key: `q:${i}`, kind: 'question' as const, title: q.q, sub: q.d, badge: <HmsBadge tone={/^(yes|no risk|on track|healthy)/i.test(q.v) ? 'green' : /^no\b|^not|risk|below|off/i.test(q.v) ? 'amber' : 'blue'}>{q.v}</HmsBadge>, target: q.target })),
        ...dash.upcoming_decisions.map((u) => ({ key: `d:${u.k}:${u.id}`, kind: 'decision' as const, title: u.t, sub: `${u.k} · ${u.id} · due ${u.due}`, badge: <HmsBadge tone="amber">{u.v}</HmsBadge>, target: u.target })),
      ]
    : [];
  const filters: Record<string, (i: Item) => boolean> = { all: () => true, questions: (i) => i.kind === 'question', decisions: (i) => i.kind === 'decision' };
  const q = search.trim().toLowerCase();
  const visible = items.filter((i) => (filters[pill] || filters.all)(i) && has(q, [i.title, i.sub]));
  const rows: HmsListRow[] = visible.map((i) => ({ key: i.key, title: i.title, badge: i.badge, sub: i.sub }));

  const renderDetail = (key: string | null) => {
    if (!dash) return <Loading failed={data.failed.includes('Dashboard')} what="The CFO dashboard" />;
    const i = items.find((x) => x.key === key) || items[0];
    const k = dash.kpis;
    return (
      <>
        <HmsDetailHeader icon={LayoutDashboard} title={i.title} badge={i.badge} subtitle={i.kind === 'summary' ? 'Financial year to date' : i.sub} />
        <HmsStatStrip
          items={[
            { label: 'Revenue YTD', value: k.total_revenue, note: `${k.revenue_growth} vs last year` },
            { label: 'Net profit', value: k.net_profit, note: `${k.net_profit_margin} margin` },
            { label: 'EBITDA', value: k.ebitda, note: `${k.ebitda_margin} margin` },
            { label: 'Budget variance', value: k.budget_variance, tone: k.budget_variance.startsWith('-') ? 'amber' : 'green' },
          ]}
        />
        <HmsDetailBody>
          {i.kind !== 'summary' && <HmsNotice tone={i.kind === 'decision' ? 'amber' : 'blue'}>{i.sub}</HmsNotice>}
          <HmsSection title="Revenue vs expense · ₹ Cr per month" padded>
            <ManagerBars labels={dash.revenue_trend.map((t) => t.month)} a={dash.revenue_trend.map((t) => t.revenue)} b={dash.revenue_trend.map((t) => t.expense)} legend={['Revenue', 'Expense']} tip={(n) => `${dash.revenue_trend[n].month} · ₹ ${dash.revenue_trend[n].revenue} Cr / ₹ ${dash.revenue_trend[n].expense} Cr`} />
          </HmsSection>
          <HmsSection title="Department ranking · ₹ Cr this month">
            {dash.department_rankings.map((d, n) => (
              <HmsRow key={d.name} last={n === dash.department_rankings.length - 1} label={d.name} hint={`Revenue ${crc(d.revenue)} · expense ${crc(d.expense)}`} value={<HmsBadge tone={d.margin < 0 ? 'red' : d.margin < 15 ? 'amber' : 'green'}>{`${d.margin.toFixed(1)}%`}</HmsBadge>} />
            ))}
          </HmsSection>
          <HmsSection title="Other figures">
            <HmsRow label="Total expense" value={k.total_expense} />
            <HmsRow label="Cash available" value={k.cash_available} hint={`Runway ${k.runway_all}`} />
            <HmsRow label="Patient revenue growth" value={k.patient_revenue_growth} last />
          </HmsSection>
        </HmsDetailBody>
        {i.target && (
          <HmsDetailFooter>
            <HmsButton variant="primary" block icon={ArrowRight} onClick={() => onNavigateTab(i.target!)}>
              Open {humanize(i.target)}
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="cfo-overview"
      title="CFO overview"
      description="The questions the board asks, and the decisions due from you."
      total={items.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search question or decision"
      pills={[
        { key: 'all', label: 'All', count: items.length },
        { key: 'questions', label: 'Key questions', count: items.filter(filters.questions).length },
        { key: 'decisions', label: 'Decisions due', count: items.filter(filters.decisions).length, tone: 'amber' },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      onPrimary={(k) => {
        const i = items.find((x) => x.key === k);
        if (i?.target) onNavigateTab(i.target);
      }}
      detailLabel="Overview"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Profit & loss                                                       */
/* ================================================================== */

export const CfoProfitLossView: React.FC<CfoViewProps> = ({ data, initialFilter, initialSelect }) => {
  const [period, setPeriod] = useState(initialFilter && ['Month', 'Quarter', 'Year'].includes(initialFilter) ? initialFilter : 'Month');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const src = useSectionSource<CfoProfitLoss>(() => accountsService.getCfoProfitLoss(period) as Promise<CfoProfitLoss>, [period], data.lastSync);
  const pl = src.value;
  const lines = pl?.lines || [];
  const q = search.trim().toLowerCase();
  const visible = lines.filter((l) => has(q, [l.label]));
  const rows: HmsListRow[] = visible.map((l) => ({
    key: l.label,
    title: l.label,
    badge: l.change_pct ? <HmsBadge tone={(l.is_cost ? l.change_pct <= 0 : l.change_pct >= 0) ? 'green' : 'amber'}>{pct(l.change_pct)}</HmsBadge> : undefined,
    sub: `${l.pct_of_rev.toFixed(1)}% of revenue · prior ${crc(l.comparison)}`,
    metaRight: <strong style={{ fontWeight: l.is_bold ? 700 : 600 }}>{crc(l.current)}</strong>,
  }));

  const renderDetail = (key: string | null) => {
    if (!pl) return <Loading failed={src.failed} what="The profit & loss" />;
    const l = lines.find((x) => x.label === key) || lines[0];
    const k = pl.kpis;
    return (
      <>
        <HmsDetailHeader icon={IndianRupee} title={l ? l.label : 'Profit & loss'} badge={<HmsBadge tone="gray">{pl.labels.join(' vs ')}</HmsBadge>} subtitle={`Profit & loss · ${pl.period}`} />
        <HmsStatStrip
          items={[
            { label: 'Revenue', value: k.revenue, note: k.revenue_change },
            { label: 'EBITDA', value: k.ebitda, note: `${k.ebitda_margin} margin` },
            { label: 'Payroll', value: k.payroll, note: k.payroll_pct },
            { label: 'Net profit', value: k.net_profit, note: `${k.net_profit_margin} margin` },
          ]}
        />
        <HmsDetailBody>
          {l && (
            <HmsSection title={l.label}>
              <HmsRow label={pl.labels[0] || 'Current'} value={<strong>{crc(l.current)}</strong>} />
              <HmsRow label={pl.labels[1] || 'Comparison'} value={crc(l.comparison)} />
              <HmsRow label="Change" value={pct(l.change_pct)} />
              <HmsRow label="Share of revenue" value={`${l.pct_of_rev.toFixed(1)}%`} last />
            </HmsSection>
          )}
          {pl.trend.length > 0 && (
            <HmsSection title="Net profit trend · ₹ Cr" padded>
              <ManagerBars labels={pl.trend.map((t) => t.month)} a={pl.trend.map((t) => t.actual)} b={pl.trend.some((t) => t.budget != null) ? pl.trend.map((t) => t.budget ?? 0) : undefined} legend={['Actual', 'Budget']} tip={(n) => `${pl.trend[n].month} · ₹ ${pl.trend[n].actual} Cr`} />
            </HmsSection>
          )}
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="cfo-pl"
      title="Profit & loss"
      description={pl ? `${pl.labels.join(' vs ')} · ₹ Cr` : 'Income statement by period.'}
      total={lines.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search line"
      pills={['Month', 'Quarter', 'Year'].map((p) => ({ key: p, label: p, count: p === period ? lines.length : 0 }))}
      activePill={period}
      onPill={setPeriod}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="P&L line"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Cash flow                                                           */
/* ================================================================== */

const CASH_VIEWS = ['7 Days', '30 Days', '90 Days', '12 Months'];

export const CfoCashView: React.FC<CfoViewProps> = ({ data, onNavigateTab, initialFilter, initialSelect }) => {
  const [view, setView] = useState(initialFilter && CASH_VIEWS.includes(initialFilter) ? initialFilter : '30 Days');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const src = useSectionSource<CfoCashFlow>(() => accountsService.getCfoCashFlow(view) as Promise<CfoCashFlow>, [view], data.lastSync);
  const cf = src.value;
  type Item = { key: string; kind: 'summary' | 'warning' | 'payment'; title: string; sub: string; badge: React.ReactNode; amount?: number };
  const items: Item[] = cf
    ? [
        { key: 'summary', kind: 'summary', title: `Cash · next ${view.toLowerCase()}`, sub: `Lowest ${cf.lowest_balance} on ${cf.lowest_date}`, badge: <HmsBadge tone={cf.is_below_buffer ? 'red' : 'green'}>{cf.is_below_buffer ? 'Below buffer' : 'Above buffer'}</HmsBadge> },
        ...cf.warnings.map((w, i) => ({ key: `w:${i}`, kind: 'warning' as const, title: w.title, sub: w.detail, badge: <HmsBadge tone={/crit/i.test(w.level) ? 'red' : /warn/i.test(w.level) ? 'amber' : 'blue'}>{w.level}</HmsBadge> })),
        ...cf.major_payments.map((p, i) => ({ key: `p:${i}`, kind: 'payment' as const, title: p.t, sub: `${p.date} · ${p.k} · balance after ${crc(p.bal)}`, badge: <HmsBadge tone="gray">{p.k}</HmsBadge>, amount: p.a })),
      ]
    : [];
  const q = search.trim().toLowerCase();
  const visible = items.filter((i) => has(q, [i.title, i.sub]));
  const rows: HmsListRow[] = visible.map((i) => ({ key: i.key, title: i.title, badge: i.badge, sub: i.sub, metaRight: i.amount != null ? <strong>{crc(i.amount)}</strong> : undefined }));

  const renderDetail = (key: string | null) => {
    if (!cf) return <Loading failed={src.failed} what="The cash projection" />;
    const i = items.find((x) => x.key === key) || items[0];
    const pts = cf.points;
    const step = pts.length > 31 ? Math.ceil(pts.length / 12) : pts.length > 10 ? 5 : 1;
    const labels = pts.map((p, n) => (n % step === 0 ? p.lbl : ''));
    return (
      <>
        <HmsDetailHeader icon={Wallet} title={i.title} badge={i.badge} subtitle={i.kind === 'summary' ? 'Projected inflows, outflows and balance' : i.sub} />
        <HmsStatStrip
          items={[
            { label: 'Cash today', value: cf.cash_balance, note: `Runway ${cf.runway_cash}` },
            { label: 'Inflows', value: cf.expected_inflows, tone: 'green' },
            { label: 'Outflows', value: cf.expected_outflows, tone: 'amber' },
            { label: 'Lowest balance', value: cf.lowest_balance, tone: cf.is_below_buffer ? 'red' : 'green', note: cf.lowest_date },
          ]}
        />
        <HmsDetailBody>
          {i.kind === 'warning' && <HmsNotice tone="amber">{i.sub}</HmsNotice>}
          <HmsSection title="Inflow vs outflow · ₹ Cr" padded>
            <ManagerBars labels={labels} a={pts.map((p) => p.inn)} b={pts.map((p) => p.out)} legend={['Inflow', 'Outflow']} tip={(n) => `${pts[n].lbl} · in ₹ ${pts[n].inn.toFixed(2)} Cr / out ₹ ${pts[n].out.toFixed(2)} Cr`} />
          </HmsSection>
          <HmsSection title="Balance · ₹ Cr" padded>
            <ManagerBars labels={labels} a={pts.map((p) => p.bal)} colorA={(v) => (cf.is_below_buffer && v === Math.min(...pts.map((p) => p.bal)) ? '#dc2626' : '#16a34a')} tip={(n) => `${pts[n].lbl} · ₹ ${pts[n].bal.toFixed(2)} Cr`} />
          </HmsSection>
          <HmsSection title="Position">
            <HmsRow label="Closing balance" value={cf.closing_balance} />
            <HmsRow label="Runway incl. credit lines" value={cf.runway_all} last />
          </HmsSection>
        </HmsDetailBody>
        {cf.is_below_buffer && (
          <HmsDetailFooter>
            <HmsButton block icon={ArrowRight} onClick={() => onNavigateTab('alerts')}>
              Open financial alerts
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="cfo-cash"
      title="Cash flow"
      description="Projected cash, the treasury buffer and large payments ahead."
      total={items.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search payment or warning"
      pills={CASH_VIEWS.map((v) => ({ key: v, label: v, count: v === view ? items.length : 0 }))}
      activePill={view}
      onPill={setView}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Cash flow"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Balance sheet                                                       */
/* ================================================================== */

export const CfoBalanceSheetView: React.FC<CfoViewProps> = ({ data, initialFilter, initialSelect }) => {
  const { bs } = data;
  const [pill, setPill] = useState(initialFilter || 'assets');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const q = search.trim().toLowerCase();
  // Share of its side of the balance sheet, in words — no bar: list bars are reserved for completion (HMS 19.6)
  const rowsOf = (list: Array<{ name: string; amount: number; share: string }>, kind: string): HmsListRow[] =>
    list.filter((x) => has(q, [x.name])).map((x) => ({ key: `${kind}:${x.name}`, title: x.name, sub: `${x.share} of total ${kind === 'a' ? 'assets' : 'liabilities'}`, metaRight: <strong>{crc(x.amount)}</strong> }));
  const rows: HmsListRow[] = !bs
    ? []
    : pill === 'assets'
      ? rowsOf(bs.assets, 'a')
      : pill === 'liabilities'
        ? rowsOf(bs.liabilities, 'l')
        : bs.debt_capacity.filter((d) => has(q, [d.measure])).map((d) => ({ key: `d:${d.measure}`, title: d.measure, sub: `Today ${d.today} · pro forma ${d.pro_forma}`, metaRight: d.limit && d.limit !== '—' ? `Limit ${d.limit}` : undefined }));

  const renderDetail = (key: string | null) => {
    if (!bs) return <Loading failed={data.failed.includes('Balance sheet')} what="The balance sheet" />;
    const name = key?.slice(2);
    const asset = bs.assets.find((x) => x.name === name);
    const liab = bs.liabilities.find((x) => x.name === name);
    const debt = bs.debt_capacity.find((x) => x.measure === name);
    return (
      <>
        <HmsDetailHeader icon={Scale} title={asset?.name || liab?.name || debt?.measure || 'Balance sheet'} badge={<HmsBadge tone={bs.has_new_loans ? 'amber' : 'gray'}>{bs.has_new_loans ? 'Includes new loans' : 'As reported'}</HmsBadge>} subtitle="Balance sheet · ₹ Cr" />
        <HmsStatStrip
          items={[
            { label: 'Total assets', value: bs.total_assets },
            { label: 'Total liabilities', value: bs.total_liabilities },
            { label: 'Equity', value: bs.equity },
            { label: 'Debt / equity', value: bs.debt_to_equity },
          ]}
        />
        <HmsDetailBody>
          {(asset || liab) && (
            <HmsSection title={asset ? 'Asset' : 'Liability'}>
              <HmsRow label="Amount" value={<strong>{crc((asset || liab)!.amount)}</strong>} />
              <HmsRow label={`Share of ${asset ? 'assets' : 'liabilities'}`} value={(asset || liab)!.share} last />
            </HmsSection>
          )}
          <HmsSection title="Debt capacity">
            {bs.debt_capacity.map((d, n) => (
              <HmsRow key={d.measure} last={n === bs.debt_capacity.length - 1} label={d.measure} hint={d.limit && d.limit !== '—' ? `Limit ${d.limit}` : undefined} value={`${d.today} → ${d.pro_forma}`} />
            ))}
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="cfo-bs"
      title="Balance sheet"
      description="Assets, liabilities and borrowing capacity."
      total={bs ? bs.assets.length + bs.liabilities.length + bs.debt_capacity.length : 0}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search line"
      pills={[
        { key: 'assets', label: 'Assets', count: bs?.assets.length || 0 },
        { key: 'liabilities', label: 'Liabilities', count: bs?.liabilities.length || 0 },
        { key: 'debt', label: 'Debt capacity', count: bs?.debt_capacity.length || 0 },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Balance sheet"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Department profitability                                            */
/* ================================================================== */

export const CfoDeptProfitView: React.FC<CfoViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const [rank, setRank] = useState(initialFilter === 'Least Profitable' ? 'Least Profitable' : 'Most Profitable');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const src = useSectionSource<CfoDeptProfitability>(() => accountsService.getCfoDeptProfitability(rank) as Promise<CfoDeptProfitability>, [rank], data.lastSync);
  const dp = src.value;
  const depts = dp?.departments || [];
  const q = search.trim().toLowerCase();
  const rows: HmsListRow[] = depts
    .filter((d) => has(q, [d.name, d.driver]))
    .map((d) => ({ key: d.name, title: d.name, badge: <HmsBadge tone={d.profit < 0 ? 'red' : d.margin_diff < 0 ? 'amber' : 'green'}>{`${d.margin.toFixed(1)}%`}</HmsBadge>, sub: d.driver, metaLeft: `${d.margin_diff > 0 ? '+' : ''}${d.margin_diff.toFixed(1)} pts vs last month`, metaRight: <strong>{crc(d.profit)}</strong> }));

  const renderDetail = (key: string | null) => {
    if (!dp) return <Loading failed={src.failed} what="Department profitability" />;
    const d = depts.find((x) => x.name === key) || depts[0];
    if (!d) return <HmsEmpty>No departments returned.</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={Building2} title={d.name} badge={<HmsBadge tone={d.profit < 0 ? 'red' : 'green'}>{d.status}</HmsBadge>} subtitle={`Department profitability · margin ${d.margin.toFixed(1)}%`} />
        <HmsStatStrip
          items={[
            { label: 'Revenue', value: crc(d.revenue) },
            { label: 'Expense', value: crc(d.expense) },
            { label: 'Contribution', value: crc(d.profit), tone: d.profit < 0 ? 'red' : 'green' },
            { label: 'Margin', value: `${d.margin.toFixed(1)}%`, note: `was ${d.prev_margin.toFixed(1)}%`, tone: d.margin_diff < 0 ? 'amber' : 'default' },
          ]}
        />
        <HmsDetailBody>
          <HmsNotice tone={d.profit < 0 ? 'red' : 'blue'}>Driver: {d.driver}</HmsNotice>
          <HmsSection title="Hospital">
            <HmsRow label="Total revenue" value={dp.total_revenue} />
            <HmsRow label="Shared overhead" value={dp.overhead} />
            <HmsRow label="Net contribution" value={dp.net_contribution} hint={`${dp.margin_pct} margin · ${dp.loss_making_count} loss-making`} last />
          </HmsSection>
        </HmsDetailBody>
        <MgrActionFooter
          actions={[{ key: 'turn', label: 'Request turnaround plan', icon: MessageSquare, comment: 'required', commentHint: `Sent to the head of ${d.name}.`, run: async (c) => ((await accountsService.requestCfoTurnaroundPlan(d.name, c)) as { message?: string })?.message || `Turnaround plan requested from ${d.name}` }]}
          notify={notify}
          reload={data.reload}
        />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="cfo-dept"
      title="Department profitability"
      description={dp ? `Contribution after direct costs · ${dp.loss_making_count} loss-making` : 'Contribution after direct costs.'}
      total={depts.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search department or driver"
      pills={['Most Profitable', 'Least Profitable'].map((r) => ({ key: r, label: r, count: r === rank ? depts.length : 0 }))}
      activePill={rank}
      onPill={setRank}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Department"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Service line analytics                                              */
/* ================================================================== */

export const CfoServicesView: React.FC<CfoViewProps> = ({ data, initialFilter, initialSelect }) => {
  const [sort, setSort] = useState(initialFilter && ['Growth', 'Revenue', 'Margin'].includes(initialFilter) ? initialFilter : 'Growth');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const src = useSectionSource<CfoServiceLines>(() => accountsService.getCfoServiceLines(sort) as Promise<CfoServiceLines>, [sort], data.lastSync);
  const sl = src.value;
  const lines = sl?.service_lines || [];
  const q = search.trim().toLowerCase();
  const rows: HmsListRow[] = lines
    .filter((l) => has(q, [l.service_line, l.department_id]))
    .map((l) => ({ key: l.id, title: l.service_line, badge: <HmsBadge tone={l.yoy_growth_pct < 0 ? 'red' : l.yoy_growth_pct >= 15 ? 'green' : 'gray'}>{pct(l.yoy_growth_pct)}</HmsBadge>, sub: `${l.department_id} · ${l.volume.toLocaleString('en-IN')} ${l.unit}`, metaLeft: `Margin ${l.margin_pct}%`, metaRight: <strong>{crc(l.revenue)}</strong> }));

  const renderDetail = (key: string | null) => {
    if (!sl) return <Loading failed={src.failed} what="Service line analytics" />;
    const l = lines.find((x) => x.id === key) || lines[0];
    if (!l) return <HmsEmpty>No service lines returned.</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={Activity} title={l.service_line} badge={<HmsBadge tone={/grow/i.test(l.trend) ? 'green' : /declin/i.test(l.trend) ? 'red' : 'gray'}>{l.trend}</HmsBadge>} subtitle={`${l.department_id} · ${l.volume.toLocaleString('en-IN')} ${l.unit}`} />
        <HmsStatStrip
          items={[
            { label: 'Revenue', value: crc(l.revenue) },
            { label: 'Growth (YoY)', value: pct(l.yoy_growth_pct), tone: l.yoy_growth_pct < 0 ? 'red' : 'green' },
            { label: 'Margin', value: `${l.margin_pct}%` },
            { label: 'Volume', value: l.volume.toLocaleString('en-IN'), note: l.unit },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title="Margin" padded>
            <HmsProgress showLabel pct={Math.max(0, Math.round(l.margin_pct))} doneLabel="Full margin" label="Contribution margin" />
          </HmsSection>
          <HmsSection title="All service lines">
            <HmsRow label="Total revenue" value={sl.total_revenue} hint={`Weighted growth ${sl.weighted_growth}`} />
            <HmsRow label="Fastest growing" value={`${sl.fastest_growing} (${sl.fastest_growth_pct})`} />
            <HmsRow label="Highest margin" value={`${sl.highest_margin} (${sl.highest_margin_pct})`} last />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="cfo-services"
      title="Service line analytics"
      description="Revenue, growth and margin by clinical service line."
      total={lines.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search service line"
      pills={['Growth', 'Revenue', 'Margin'].map((s) => ({ key: s, label: `By ${s.toLowerCase()}`, count: s === sort ? lines.length : 0 }))}
      activePill={sort}
      onPill={setSort}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Service line"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Budget strategy                                                     */
/* ================================================================== */

export const CfoBudgetView: React.FC<CfoViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const b = data.budget;
  const [pill, setPill] = useState(initialFilter && ['Department', 'Hospital', 'Growth'].includes(initialFilter) ? initialFilter : 'Department');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const q = search.trim().toLowerCase();
  const rows: HmsListRow[] = !b
    ? []
    : pill === 'Department'
      ? b.dept_rows.filter((r) => has(q, [r[0]])).map((r) => ({ key: `d:${r[0]}`, title: r[0], badge: <HmsBadge tone={r[3] > 0 ? 'red' : 'green'}>{pct(r[3])}</HmsBadge>, sub: `Budget ${crc(r[1])} · YTD ${crc(r[2])}`, metaRight: <strong>{crc(r[4])}</strong> }))
      : pill === 'Hospital'
        ? b.hospital_rows.filter((r) => has(q, [r[0]])).map((r) => ({ key: `h:${r[0]}`, title: r[0], sub: `Budget ${crc(r[1])} · outlook ${crc(r[2])}`, metaRight: <strong>{crc(r[3])}</strong> }))
        : b.growth_rows.filter((r) => has(q, [r[0], r[4]])).map((r) => ({ key: `g:${r[0]}`, title: r[0], badge: r[4] ? <HmsBadge tone="blue">{r[4]}</HmsBadge> : undefined, sub: `Revenue ${crc(r[2])} / yr · payback ${r[3]} yrs`, metaRight: <strong>{crc(r[1])}</strong> }));

  const renderDetail = (key: string | null) => {
    if (!b) return <Loading failed={data.failed.includes('Budget strategy')} what="The budget proposal" />;
    const name = key?.slice(2);
    const dr = b.dept_rows.find((r) => r[0] === name);
    const hr = b.hospital_rows.find((r) => r[0] === name);
    const gr = b.growth_rows.find((r) => r[0] === name);
    const p = b.proposal;
    const awaiting = isAwaitingCfo(b.status);
    const actions: MgrAction[] = awaiting
      ? [
          { key: 'approve', label: `Approve ${p.fiscal_year} budget`, icon: Check, comment: 'optional', confirm: `I approve the ${p.fiscal_year} budget: revenue ${p.revenue_target}, EBITDA ${p.ebitda_target}, capex ${p.capex_budget}.`, run: async (c) => ((await accountsService.decideCfoBudgetStrategy('approve', c)) as { message?: string })?.message || 'Budget approved' },
          { key: 'revise', label: 'Request revision', icon: CornerUpLeft, comment: 'required', run: async (c) => ((await accountsService.decideCfoBudgetStrategy('revise', c)) as { message?: string })?.message || 'Revision requested' },
        ]
      : [];
    return (
      <>
        <HmsDetailHeader icon={PiggyBank} title={name || `${p.fiscal_year} budget`} badge={<HmsBadge tone={awaiting ? 'amber' : 'green'}>{b.status}</HmsBadge>} subtitle={`${p.fiscal_year} budget proposal`} />
        <HmsStatStrip
          items={[
            { label: 'Revenue target', value: p.revenue_target },
            { label: 'EBITDA target', value: p.ebitda_target },
            { label: 'Net profit target', value: p.net_profit_target },
            { label: 'CapEx budget', value: p.capex_budget },
          ]}
        />
        <HmsDetailBody>
          {dr && (
            <HmsSection title="Department budget · ₹ Cr">
              <HmsRow label="Current-year budget" value={crc(dr[1])} />
              <HmsRow label="Year-to-date actual" value={crc(dr[2])} />
              <HmsRow label="Variance" value={pct(dr[3])} />
              <HmsRow label={`${p.fiscal_year} proposed`} value={<strong>{crc(dr[4])}</strong>} last />
            </HmsSection>
          )}
          {hr && (
            <HmsSection title="Hospital line · ₹ Cr">
              <HmsRow label="Current-year budget" value={crc(hr[1])} />
              <HmsRow label="Current-year outlook" value={crc(hr[2])} />
              <HmsRow label={`${p.fiscal_year} proposed`} value={<strong>{crc(hr[3])}</strong>} last />
            </HmsSection>
          )}
          {gr && (
            <HmsSection title="Growth investment">
              <HmsRow label="Investment" value={crc(gr[1])} />
              <HmsRow label="Annual revenue" value={crc(gr[2])} />
              <HmsRow label="Payback" value={`${gr[3]} years`} />
              <HmsRow label="Linked request" value={gr[4] || '—'} last />
            </HmsSection>
          )}
          <HmsSection title={`Trail (${p.trail.length})`}>
            {p.trail.map((t, n) => (
              <HmsRow key={n} last={n === p.trail.length - 1} label={t.t} hint={t.c || undefined} value={<span style={{ fontSize: '12px', color: HMS.textSecondary }}>{`${t.who} · ${t.when}`}</span>} />
            ))}
          </HmsSection>
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="cfo-budget"
      title="Budget strategy"
      description={b ? `${b.proposal.fiscal_year} proposal · ${b.status}` : 'Next year’s budget proposal.'}
      total={b ? b.dept_rows.length + b.hospital_rows.length + b.growth_rows.length : 0}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search line"
      pills={[
        { key: 'Department', label: 'Departments', count: b?.dept_rows.length || 0 },
        { key: 'Hospital', label: 'Hospital', count: b?.hospital_rows.length || 0 },
        { key: 'Growth', label: 'Growth', count: b?.growth_rows.length || 0 },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Budget line"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Financial forecasting                                               */
/* ================================================================== */

const HORIZONS = ['3 Months', '6 Months', '12 Months', '3 Years'];
const SCENARIOS = ['Best', 'Expected', 'Worst'];

export const CfoForecastView: React.FC<CfoViewProps> = ({ data, initialFilter, initialSelect }) => {
  const [horizon, setHorizon] = useState(initialFilter && HORIZONS.includes(initialFilter) ? initialFilter : '12 Months');
  const [scenario, setScenario] = useState('Expected');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const src = useSectionSource<CfoForecast>(() => accountsService.getCfoForecast(horizon, scenario) as Promise<CfoForecast>, [horizon, scenario], data.lastSync);
  const fc = src.value;
  const points = fc?.points || [];
  const q = search.trim().toLowerCase();
  const rows: HmsListRow[] = [
    ...(fc ? [{ key: '__summary', title: `${scenario} case · ${horizon}`, badge: <HmsBadge tone={fc.kpis.is_low_below_buffer ? 'red' : 'green'}>{fc.kpis.profit_margin}</HmsBadge>, sub: `Profit ${fc.kpis.forecast_profit} · closing cash ${fc.kpis.closing_cash}` }] : []),
    ...points.filter((p) => has(q, [p.lbl])).map((p) => ({ key: p.lbl, title: p.lbl, sub: `Revenue ${crc(p.rev)} · expense ${crc(p.exp)}`, metaLeft: `Profit ${crc(p.np)}`, metaRight: <strong>{crc(p.bal)}</strong> })),
  ];

  const renderDetail = (key: string | null) => {
    if (!fc) return <Loading failed={src.failed} what="The forecast" />;
    const p = points.find((x) => x.lbl === key);
    const k = fc.kpis;
    return (
      <>
        <HmsDetailHeader icon={TrendingUp} title={p ? p.lbl : `${scenario} case · ${horizon}`} badge={<HmsBadge tone="gray">{scenario}</HmsBadge>} subtitle={fc.has_fresh_capex ? 'Includes newly approved CapEx' : 'Forecast from the current run-rate'} />
        <HmsStatStrip
          items={
            p
              ? [
                  { label: 'Revenue', value: crc(p.rev) },
                  { label: 'Expense', value: crc(p.exp) },
                  { label: 'Net profit', value: crc(p.np), tone: p.np < 0 ? 'red' : 'green' },
                  { label: 'Cash balance', value: crc(p.bal) },
                ]
              : [
                  { label: 'Revenue', value: k.forecast_revenue },
                  { label: 'Expense', value: k.forecast_expense },
                  { label: 'Profit', value: k.forecast_profit, note: `${k.profit_margin} margin` },
                  { label: 'Lowest cash', value: k.lowest_cash, tone: k.is_low_below_buffer ? 'red' : 'green', note: `Closing ${k.closing_cash}` },
                ]
          }
        />
        <HmsDetailBody>
          <HmsSection title="Revenue vs expense · ₹ Cr" padded>
            <ManagerBars labels={points.map((x, n) => (points.length > 12 && n % 3 ? '' : x.lbl))} a={points.map((x) => x.rev)} b={points.map((x) => x.exp)} legend={['Revenue', 'Expense']} tip={(n) => `${points[n].lbl} · ₹ ${points[n].rev} / ₹ ${points[n].exp} Cr`} />
          </HmsSection>
          <HmsSection title="Scenario comparison">
            {Object.entries(fc.scenario_comparison).map(([name, s], n, arr) => (
              <HmsRow key={name} last={n === arr.length - 1} label={name} hint={`Revenue ${s.rev} · expense ${s.exp} · lowest cash ${s.low_cash}`} value={<strong>{s.np}</strong>} />
            ))}
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="cfo-forecast"
      title="Financial forecasting"
      description="Revenue, profit and cash by scenario and horizon."
      total={points.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search month"
      pills={HORIZONS.map((h) => ({ key: h, label: h, count: h === horizon ? points.length : 0 }))}
      activePill={horizon}
      onPill={setHorizon}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      leftExtra={
        <div style={{ padding: '0 20px 12px' }}>
          <select style={INPUT} value={scenario} onChange={(e) => setScenario(e.target.value)} aria-label="Scenario">
            {SCENARIOS.map((s) => (
              <option key={s} value={s}>
                {s} case
              </option>
            ))}
          </select>
        </div>
      }
      detailLabel="Forecast"
      renderDetail={renderDetail}
    />
  );
};
