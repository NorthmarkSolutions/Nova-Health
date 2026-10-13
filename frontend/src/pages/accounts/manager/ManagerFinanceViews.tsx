// Accounts Manager · financial operations and approvals:
// overview, receivables, payables, cash flow, escalated approvals, high-value transactions.
import React, { useState } from 'react';
import { LayoutDashboard, HandCoins, Wallet, ChartLine, ShieldAlert, BadgeIndianRupee, Check, Send, CornerUpLeft, X, Pause, Flag, TriangleAlert, ArrowUpDown, ArrowRight } from 'lucide-react';
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
  INPUT,
  HMS,
} from '../../../components/hms';
import { accountsService, ApprovalRequestItem, PayableBill, PayerItem, SummaryGroup, TrailEntry } from '../../../services/accountsService';
import { fmtDateTime, humanize } from '../executive/executiveData';
import { MONO } from '../executive/executiveHelpers';
import { BUFFER_CR, CRITICAL_FLAGS, DOC_LABEL, KIND_DOC, ageL, cr, hoursSince, isQueuePending, managerLimit, queueReason, useSectionSource } from './managerData';
import type { ManagerViewProps } from './managerHelpers';
import { MgrAction, MgrActionFooter } from './ManagerActions';
import { ManagerBars } from './ManagerBars';

const TONE: Record<string, HmsTone> = {
  High: 'red',
  Medium: 'amber',
  Low: 'gray',
  Urgent: 'red',
  Normal: 'gray',
  Defer: 'amber',
  'Awaiting Manager': 'blue',
  'With Controller': 'blue',
  Approved: 'green',
  Scheduled: 'green',
  Paid: 'green',
  Posted: 'gray',
  'On Hold': 'amber',
  Rejected: 'red',
  Pending: 'blue',
  Forwarded: 'blue',
};
const Tag: React.FC<{ s: string }> = ({ s }) => <HmsBadge tone={TONE[s] || 'gray'}>{s}</HmsBadge>;
const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>{children}</div>;
const has = (q: string, values: (string | number | undefined | null)[]) => !q || values.some((v) => String(v ?? '').toLowerCase().includes(q));

const Trail: React.FC<{ trail?: TrailEntry[] }> = ({ trail }) => (
  <HmsSection title={`Trail (${trail?.length || 0})`}>
    {trail?.length ? trail.map((t, i) => <HmsRow key={i} last={i === trail.length - 1} label={t.t} hint={t.c || undefined} value={<span style={{ fontSize: '12px', color: HMS.textSecondary }}>{`${t.who} · ${t.when}`}</span>} />) : <Muted>No actions recorded yet.</Muted>}
  </HmsSection>
);

/** Group-by selector + group filter shown above a list (receivables / payables breakdown). */
const GroupBar: React.FC<{ views: string[]; view: string; setView: (v: string) => void; groups: SummaryGroup[]; group: string; setGroup: (g: string) => void }> = ({ views, view, setView, groups, group, setGroup }) => (
  <div style={{ padding: '0 20px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
    <select style={INPUT} value={view} onChange={(e) => setView(e.target.value)} aria-label="Group by">
      {views.map((v) => (
        <option key={v}>{v}</option>
      ))}
    </select>
    <select style={INPUT} value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Group">
      <option value="">All groups</option>
      {groups.map((g) => (
        <option key={g.label} value={g.label}>
          {g.label} · {cr(g.amt)} ({g.share})
        </option>
      ))}
    </select>
  </div>
);

/* ================================================================== */
/* Overview (Financial command centre)                                */
/* ================================================================== */

export const ManagerOverviewView: React.FC<ManagerViewProps> = ({ data, onNavigateTab, initialFilter, initialSelect }) => {
  const { dash, cash30 } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);

  type Item = { key: string; kind: 'alert' | 'priority' | 'case' | 'trends'; title: string; sub: string; badge: React.ReactNode; amount?: number; screen?: string; select?: string; detail: string };
  const items: Item[] = dash
    ? [
        { key: 'trends', kind: 'trends', title: 'Trends & headline figures', sub: `${dash.kpis.length} figures · ${dash.trends.weeks.length} weeks`, badge: <HmsBadge tone="gray">Summary</HmsBadge>, detail: '' },
        ...dash.alerts.map((a, i) => ({ key: `alert:${i}`, kind: 'alert' as const, title: a.title, sub: a.desc, badge: <HmsBadge tone={a.severity === 'critical' ? 'red' : a.severity === 'warning' ? 'amber' : 'blue'}>{a.tag}</HmsBadge>, screen: a.screen, detail: a.desc })),
        ...dash.escalated_cases.map((e) => ({ key: `case:${e.id}`, kind: 'case' as const, title: `${e.ref} · ${e.title}`, sub: `Escalated by ${e.sup} · ${e.age}`, badge: <HmsBadge tone="red">{e.reason}</HmsBadge>, amount: e.amt, screen: 'escalated', select: e.id, detail: `${e.type} escalated for ${e.reason} by ${e.sup}.` })),
        ...dash.high_priority.map((h, i) => ({ key: `hp:${i}`, kind: 'priority' as const, title: `${h.ref} · ${h.title}`, sub: `${h.type} · ${h.dept}`, badge: <HmsBadge tone="amber">{h.type}</HmsBadge>, amount: h.amt, screen: h.screen, select: h.screen === 'escalated' ? h.item_id : undefined, detail: h.title })),
      ]
    : [];
  const filters: Record<string, (i: Item) => boolean> = { all: () => true, alerts: (i) => i.kind === 'alert', cases: (i) => i.kind === 'case', priority: (i) => i.kind === 'priority' };
  const q = search.trim().toLowerCase();
  const visible = items.filter((i) => (filters[pill] || filters.all)(i) && has(q, [i.title, i.sub]));
  const count = (k: string) => items.filter(filters[k]).length;

  const rows: HmsListRow[] = visible.map((i) => ({ key: i.key, title: i.title, badge: i.badge, sub: i.sub, metaRight: i.amount != null ? <strong>{cr(i.amount)}</strong> : undefined }));

  const renderDetail = (key: string | null) => {
    if (!dash) return <HmsEmpty>{data.loading ? 'Loading the command centre…' : 'The manager dashboard is unavailable.'}</HmsEmpty>;
    const i = items.find((x) => x.key === key);
    if (!i) return <HmsEmpty>Nothing needs you right now.</HmsEmpty>;
    if (i.kind === 'trends') {
      const t = dash.trends;
      const n = t.weeks.length - 1;
      return (
        <>
          <HmsDetailHeader icon={LayoutDashboard} title="Financial command centre" badge={<HmsBadge tone="gray">Read-only</HmsBadge>} subtitle="Headline figures and weekly trends from the server" />
          <HmsDetailBody>
            <HmsSection title="Headline figures">
              {dash.kpis.map((k, idx) => (
                <HmsRow
                  key={k.code}
                  last={idx === dash.kpis.length - 1}
                  label={k.label}
                  hint={k.trend}
                  value={
                    <HmsButton size="sm" onClick={() => onNavigateTab(k.link_screen)}>
                      {k.value}
                    </HmsButton>
                  }
                />
              ))}
            </HmsSection>
            {t.weeks.length > 0 && (
              <>
                <HmsSection title="Receivables · ₹ Cr at week end" padded>
                  <ManagerBars labels={t.weeks} a={t.ar} colorA={(_v, idx) => (idx === n ? '#f59e0b' : '#fcd34d')} tip={(idx) => `${t.weeks[idx]} · ₹ ${t.ar[idx].toFixed(2)} Cr`} />
                </HmsSection>
                <HmsSection title="Payables · ₹ Cr at week end" padded>
                  <ManagerBars labels={t.weeks} a={t.ap} tip={(idx) => `${t.weeks[idx]} · ₹ ${t.ap[idx].toFixed(2)} Cr`} />
                </HmsSection>
                <HmsSection title="Cash flow · ₹ L per week" padded>
                  <ManagerBars labels={t.weeks} a={t.cash_inflow} b={t.cash_outflow} legend={['Inflow', 'Outflow']} tip={(idx) => `${t.weeks[idx]} · in ₹ ${t.cash_inflow[idx]} L / out ₹ ${t.cash_outflow[idx]} L`} />
                </HmsSection>
              </>
            )}
            {t.dept_spend.length > 0 && (
              <HmsSection title="Department spending · ₹ Cr per month" padded>
                <ManagerBars labels={t.dept_spend_months} a={t.dept_spend} tip={(idx) => `₹ ${t.dept_spend[idx]} Cr`} />
              </HmsSection>
            )}
            {cash30 && <HmsNotice tone={cash30.is_breach ? 'red' : 'green'}>Next 30 days: lowest balance {cr(cash30.lowest_balance)} on {cash30.lowest_date}.</HmsNotice>}
          </HmsDetailBody>
        </>
      );
    }
    return (
      <>
        <HmsDetailHeader icon={LayoutDashboard} title={i.title} badge={i.badge} subtitle={i.sub} />
        <HmsDetailBody>
          <HmsNotice tone={i.kind === 'alert' ? 'amber' : 'blue'}>{i.detail}</HmsNotice>
          {i.amount != null && (
            <HmsSection title="Amount">
              <HmsRow label="Value" value={<strong>{cr(i.amount)}</strong>} last />
            </HmsSection>
          )}
        </HmsDetailBody>
        {i.screen && (
          <HmsDetailFooter>
            <HmsButton variant="primary" block icon={ArrowRight} onClick={() => onNavigateTab(i.screen!, undefined, i.select)}>
              Open in {humanize(i.screen)}
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="mgr-overview"
      title="Command centre"
      description="Alerts, escalated cases and high-priority items across finance."
      total={items.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search item or reference"
      pills={[
        { key: 'all', label: 'All', count: items.length },
        { key: 'alerts', label: 'Alerts', count: count('alerts'), tone: 'red' },
        { key: 'cases', label: 'Escalated', count: count('cases'), tone: 'amber' },
        { key: 'priority', label: 'High priority', count: count('priority') },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      onPrimary={(k) => {
        const i = items.find((x) => x.key === k);
        if (i?.screen) onNavigateTab(i.screen, undefined, i.select);
      }}
      detailLabel="Command centre"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Receivables control                                                 */
/* ================================================================== */

const AGING = ['0–30 days', '31–60 days', '61–90 days', '90+ days'];

export const ManagerReceivablesView: React.FC<ManagerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { payers, limits } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [view, setView] = useState('By Payer');
  const [group, setGroup] = useState('');
  const groupKey = view === 'By Payer' ? 'payer' : view === 'By Department' ? 'department' : 'aging';
  const summary = useSectionSource(() => accountsService.getReceivablesSummary(groupKey), [groupKey], data.lastSync);

  const bi = AGING.indexOf(group);
  const inGroup = (r: PayerItem) => !group || (view === 'By Payer' ? r.src === group : view === 'By Department' ? r.dept === group : r.pct[bi] > 0);
  const filters: Record<string, (r: PayerItem) => boolean> = {
    all: () => true,
    risk: (r) => r.pct[3] >= 28 || r.late > 0,
    writeoffs: (r) => !!r.wo && r.wo.status === 'Pending',
    escalated: (r) => r.esc,
  };
  const q = search.trim().toLowerCase();
  const visible = payers.filter((r) => (filters[pill] || filters.all)(r) && inGroup(r) && has(q, [r.payer, r.src, r.owner])).sort((a, b) => b.amt - a.amt);
  const count = (k: string) => payers.filter(filters[k]).length;
  const woLimit = managerLimit(limits, 'write_off');

  const rows: HmsListRow[] = visible.map((r) => ({
    key: r.id,
    title: r.payer,
    badge: <Tag s={r.prio} />,
    sub: `${r.src} · ${r.dept} · ${r.count} open`,
    metaLeft: <span style={{ color: r.late ? '#b91c1c' : r.oldest > 90 ? '#b45309' : undefined }}>{r.late ? `Promise missed ${r.late}d` : r.wo?.status === 'Pending' ? 'Write-off request' : `Oldest ${r.oldest}d`}</span>,
    metaRight: <strong>{cr(r.amt)}</strong>,
  }));

  const renderDetail = (key: string | null) => {
    const r = payers.find((x) => x.id === key);
    if (!r) return <HmsEmpty>{payers.length ? 'Select a payer from the list to see the account.' : 'No receivables are outstanding.'}</HmsEmpty>;
    const actions: MgrAction[] = [];
    if (r.wo?.status === 'Pending') {
      const over = woLimit != null && r.wo.amt > woLimit;
      actions.push(
        { key: 'woApprove', label: over ? 'Approve & forward write-off' : 'Approve write-off', icon: over ? Send : Check, comment: 'optional', run: async (c) => (await accountsService.decidePayerWriteOff(r.id, 'approve', c)).message },
        { key: 'woReject', label: 'Reject write-off', variant: 'danger', icon: X, comment: 'required', run: async (c) => (await accountsService.decidePayerWriteOff(r.id, 'reject', c)).message }
      );
    }
    actions.push(
      { key: 'prio', label: 'Set recovery priority', icon: ArrowUpDown, select: { label: 'Recovery priority', options: ['High', 'Medium', 'Low'], current: r.prio }, run: async (_c, v) => (await accountsService.setReceivablePriority(r.id, v), `${r.payer} set to ${v} recovery priority`) },
      { key: 'escColl', label: 'Escalate collection', icon: TriangleAlert, comment: 'required', commentHint: 'Goes to the Recovery Desk and is tracked in Escalations.', run: async (c) => (await accountsService.escalateReceivableCollection(r.id, c), 'Collection escalated to the Recovery Desk') }
    );
    return (
      <>
        <HmsDetailHeader icon={HandCoins} title={r.payer} badge={<Tag s={r.prio} />} subtitle={`${r.src} · ${r.dept} · owner ${r.owner}`} />
        <HmsStatStrip
          items={[
            { label: 'Outstanding', value: cr(r.amt), note: `${r.count} open items` },
            { label: 'Over 90 days', value: cr((r.amt * r.pct[3]) / 100), tone: r.pct[3] >= 28 ? 'red' : 'default', note: `${r.pct[3]}% of balance` },
            { label: 'Due today', value: r.due ? cr(r.due) : '—' },
            { label: 'Recovery', value: `${r.rec}%`, note: 'Month to date', tone: r.rec >= 90 ? 'green' : 'amber' },
          ]}
        />
        <HmsDetailBody>
          {r.late > 0 && <HmsNotice tone="red">Promise-to-pay of {r.promise} missed by {r.late} days.</HmsNotice>}
          {r.esc && <HmsNotice tone="blue">Collection escalated — tracked in Escalations.</HmsNotice>}
          {r.wo && <HmsNotice tone={r.wo.status === 'Pending' ? 'amber' : 'blue'}>Write-off request {cr(r.wo.amt)} · {r.wo.status} — {r.wo.reason}{r.wo.status === 'Pending' && woLimit != null && r.wo.amt > woLimit ? ` Above your ${cr(woLimit)} limit; approving forwards it to the Finance Controller.` : ''}</HmsNotice>}
          {r.note && <HmsNotice tone="blue">{r.note}</HmsNotice>}
          <HmsSection title="Aging" padded>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {AGING.map((l, idx) => (
                <HmsProgress showLabel key={l} pct={r.pct[idx]} doneLabel={`All ${l}`} label={`${l} · ${cr((r.amt * r.pct[idx]) / 100)}`} tone={idx === 3 ? 'red' : idx === 2 ? 'amber' : 'blue'} />
              ))}
            </div>
          </HmsSection>
          <HmsSection title="Account">
            <HmsRow label="Owner" value={`${r.owner} (Supervisor)`} />
            <HmsRow label="Oldest item" value={`${r.oldest} days`} />
            <HmsRow label="Promise to pay" value={r.promise || '—'} last />
          </HmsSection>
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="mgr-receivables"
      title="Receivables control"
      description="Payer-level receivables — set recovery priority, escalate and decide write-offs."
      total={payers.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search payer, source or owner"
      pills={[
        { key: 'all', label: 'All', count: payers.length },
        { key: 'risk', label: 'At risk', count: count('risk'), tone: 'red' },
        { key: 'writeoffs', label: 'Write-off requests', count: count('writeoffs'), tone: 'amber' },
        { key: 'escalated', label: 'Escalated', count: count('escalated') },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      leftExtra={<GroupBar views={['By Payer', 'By Department', 'By Aging Bucket']} view={view} setView={(v) => (setView(v), setGroup(''))} groups={summary.value || []} group={group} setGroup={setGroup} />}
      detailLabel="Payer account"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Payables control                                                    */
/* ================================================================== */

export const ManagerPayablesView: React.FC<ManagerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { bills, limits } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [view, setView] = useState('Vendor Wise');
  const [group, setGroup] = useState('');
  const groupKey = view === 'Vendor Wise' ? 'vendor' : view === 'Department Wise' ? 'department' : 'category';
  const summary = useSectionSource(() => accountsService.getPayablesSummary(groupKey), [groupKey], data.lastSync);
  const keyOf = (b: PayableBill) => (view === 'Vendor Wise' ? b.vendor : view === 'Department Wise' ? b.dept : b.cat);

  const filters: Record<string, (b: PayableBill) => boolean> = {
    all: () => true,
    awaiting: (b) => b.status === 'Awaiting Manager',
    week: (b) => b.dueIn >= 0 && b.dueIn <= 7,
    overdue: (b) => b.dueIn < 0 && b.status !== 'Paid',
    hold: (b) => b.status === 'On Hold',
  };
  const q = search.trim().toLowerCase();
  const visible = bills.filter((b) => (filters[pill] || filters.all)(b) && (!group || keyOf(b) === group) && has(q, [b.vendor, b.ref, b.id])).sort((a, b) => a.dueIn - b.dueIn);
  const count = (k: string) => bills.filter(filters[k]).length;
  const limit = managerLimit(limits, 'vendor_bill');

  const dueText = (b: PayableBill) => (b.dueIn < 0 ? `${-b.dueIn}d overdue` : b.dueIn === 0 ? 'Due today' : `Due in ${b.dueIn}d`);
  const rows: HmsListRow[] = visible.map((b) => ({
    key: b.id,
    title: b.vendor,
    badge: <Tag s={b.status} />,
    sub: (
      <>
        <span style={MONO}>{b.ref}</span> · {b.cat}
        {b.msme ? ' · MSME' : ''}
      </>
    ),
    metaLeft: <span style={{ color: b.dueIn < 0 ? '#b91c1c' : b.dueIn <= 3 ? '#b45309' : undefined }}>{dueText(b)}</span>,
    metaRight: <strong>{cr(b.amt)}</strong>,
  }));

  const renderDetail = (key: string | null) => {
    const b = bills.find((x) => x.id === key);
    if (!b) return <HmsEmpty>{bills.length ? 'Select a bill from the list to see its details.' : 'No vendor liabilities are open.'}</HmsEmpty>;
    const awaiting = b.status === 'Awaiting Manager';
    const over = limit != null && b.amt > limit;
    const actions: MgrAction[] = [];
    if (awaiting)
      actions.push(
        { key: 'approve', label: over ? 'Approve & forward' : 'Approve bill', icon: over ? Send : Check, run: async () => (await accountsService.decideVendorBill(b.id, 'approve', '')).message },
        { key: 'hold', label: 'Hold', icon: Pause, comment: 'required', run: async (c) => (await accountsService.decideVendorBill(b.id, 'hold', c)).message }
      );
    if (b.status !== 'With Controller')
      actions.push(
        { key: 'prio', label: 'Prioritise payment', icon: ArrowUpDown, select: { label: 'Payment priority', options: ['Urgent', 'Normal', 'Defer'], current: b.prio }, run: async (_c, v) => (await accountsService.setVendorBillPaymentPriority(b.id, v), `${b.vendor} set to ${v}${v === 'Urgent' && b.status === 'Approved' ? ' and added to the next payment run' : ''}`) },
        { key: 'escVendor', label: 'Escalate vendor issue', icon: TriangleAlert, comment: 'required', commentHint: 'Goes to Procurement and is tracked in Escalations.', run: async (c) => (await accountsService.escalateVendorIssue(b.id, c), 'Vendor issue escalated to Procurement') }
      );
    return (
      <>
        <HmsDetailHeader icon={Wallet} title={b.vendor} badge={<Tag s={b.status} />} subtitle={`${b.ref} · ${b.id} · ${b.cat} · ${b.dept}`} />
        <HmsStatStrip
          items={[
            { label: 'Amount', value: cr(b.amt) },
            { label: 'Due', value: dueText(b), tone: b.dueIn < 0 ? 'red' : b.dueIn <= 3 ? 'amber' : 'default' },
            { label: 'Payment priority', value: b.prio },
            { label: 'Your limit', value: limit == null ? '—' : cr(limit), tone: awaiting && over ? 'amber' : 'default', note: awaiting ? (over ? 'Above limit — forward' : 'Within limit') : undefined },
          ]}
        />
        <HmsDetailBody>
          {b.dueIn < 0 && <HmsNotice tone={b.msme ? 'red' : 'amber'}>Overdue by {-b.dueIn} days{b.msme ? ' — MSME vendor, 45-day payment rule applies.' : '.'}</HmsNotice>}
          {b.issue && <HmsNotice tone="amber">Vendor issue: {b.issue}</HmsNotice>}
          {b.status === 'With Controller' && <HmsNotice tone="blue">With the Finance Controller for approval.</HmsNotice>}
          <HmsSection title="Bill">
            <HmsRow label="3-way match" value={b.match || '—'} />
            <HmsRow label="Risk" value={b.risk || '—'} />
            <HmsRow label="Approved by" value={b.approvedBy || '—'} last />
          </HmsSection>
          <Trail trail={b.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="mgr-payables"
      title="Payables control"
      description="Vendor liabilities — approve high-value bills and prioritise the payment run."
      total={bills.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search vendor or bill"
      pills={[
        { key: 'all', label: 'All', count: bills.length },
        { key: 'awaiting', label: 'Awaiting you', count: count('awaiting') },
        { key: 'week', label: 'Due this week', count: count('week'), tone: 'amber' },
        { key: 'overdue', label: 'Overdue', count: count('overdue'), tone: 'red' },
        { key: 'hold', label: 'On hold', count: count('hold') },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      leftExtra={<GroupBar views={['Vendor Wise', 'Department Wise', 'Category Wise']} view={view} setView={(v) => (setView(v), setGroup(''))} groups={summary.value || []} group={group} setGroup={setGroup} />}
      detailLabel="Vendor bill"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Cash flow monitor                                                   */
/* ================================================================== */

export const ManagerCashView: React.FC<ManagerViewProps> = ({ data, onNavigateTab, initialFilter, initialSelect }) => {
  const [range, setRange] = useState(initialFilter && ['7', '30', '90'].includes(initialFilter) ? initialFilter : '30');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const src = useSectionSource(() => accountsService.getCashflowProjection(Number(range), BUFFER_CR), [range], data.lastSync);
  const cash = src.value;

  type Item = { key: string; kind: 'summary' | 'payment' | 'delayed' | 'warning'; title: string; sub: string; badge: React.ReactNode; amount?: number; payer?: string; detail?: string };
  const items: Item[] = cash
    ? [
        { key: 'summary', kind: 'summary', title: `Next ${cash.days} days`, sub: `Lowest ${cr(cash.lowest_balance)} on ${cash.lowest_date}`, badge: <HmsBadge tone={cash.is_breach ? 'red' : 'green'}>{cash.is_breach ? 'Below buffer' : 'Above buffer'}</HmsBadge>, amount: cash.projected_closing },
        ...cash.warnings.map((w, i) => ({ key: `warn:${i}`, kind: 'warning' as const, title: w.title, sub: w.desc, badge: <HmsBadge tone={w.severity === 'critical' ? 'red' : w.severity === 'warning' ? 'amber' : 'green'}>{w.severity === 'success' ? 'OK' : humanize(w.severity)}</HmsBadge>, detail: w.desc })),
        ...cash.large_payments.map((p, i) => ({ key: `pay:${i}`, kind: 'payment' as const, title: p.title, sub: `${p.date} · balance after ${cr(p.balance_after)}`, badge: <HmsBadge tone={p.breach ? 'red' : 'gray'}>{p.breach ? 'Breaches buffer' : 'Payment'}</HmsBadge>, amount: p.amount })),
        ...cash.delayed_receivables.map((r, i) => ({ key: `late:${i}`, kind: 'delayed' as const, title: r.payer, sub: `Promised ${r.promise} · ${r.late} late`, badge: <HmsBadge tone="amber">Delayed</HmsBadge>, amount: r.amount, payer: r.payer })),
      ]
    : [];
  const q = search.trim().toLowerCase();
  const visible = items.filter((i) => has(q, [i.title, i.sub]));

  const rows: HmsListRow[] = visible.map((i) => ({ key: i.key, title: i.title, badge: i.badge, sub: i.sub, metaRight: i.amount != null ? <strong>{cr(i.amount)}</strong> : undefined }));

  const renderDetail = (key: string | null) => {
    if (!cash) return <HmsEmpty>{src.failed ? 'The cash projection is unavailable.' : 'Loading the cash projection…'}</HmsEmpty>;
    const i = items.find((x) => x.key === key) || items[0];
    const n = cash.days;
    let labels: string[], ins: number[], outs: number[], bals: number[];
    if (n <= 30) {
      labels = cash.series.map((x, idx) => (n === 7 || idx % 5 === 0 ? x.label : ''));
      ins = cash.series.map((x) => x.inflow / 1e5);
      outs = cash.series.map((x) => x.outflow / 1e5);
      bals = cash.series.map((x) => x.balance / 1e7);
    } else {
      labels = [];
      ins = [];
      outs = [];
      bals = [];
      for (let w = 0; w * 7 < cash.series.length; w++) {
        const ch = cash.series.slice(w * 7, w * 7 + 7);
        labels.push(w % 2 === 0 ? ch[0].label : '');
        ins.push(ch.reduce((a, x) => a + x.inflow, 0) / 1e5);
        outs.push(ch.reduce((a, x) => a + x.outflow, 0) / 1e5);
        bals.push(ch[ch.length - 1].balance / 1e7);
      }
    }
    return (
      <>
        <HmsDetailHeader icon={ChartLine} title={i.kind === 'summary' ? `Cash projection · next ${n} days` : i.title} badge={i.badge} subtitle={i.kind === 'summary' ? 'Collections, payments and balance against the treasury buffer' : i.sub} />
        <HmsStatStrip
          items={[
            { label: 'Cash today', value: cr(cash.starting_cash) },
            { label: 'Collections', value: cr(cash.expected_collections), tone: 'green', note: `Next ${n} days` },
            { label: 'Payments', value: cr(cash.expected_payments), tone: 'amber', note: `Next ${n} days` },
            { label: 'Lowest balance', value: cr(cash.lowest_balance), tone: cash.is_breach ? 'red' : 'green', note: cash.lowest_date },
          ]}
        />
        <HmsDetailBody>
          {i.kind === 'warning' && <HmsNotice tone="amber">{i.detail}</HmsNotice>}
          {i.kind === 'payment' && <HmsNotice tone={i.badge ? 'blue' : 'blue'}>{i.title} · {cr(i.amount || 0)} on {i.sub}</HmsNotice>}
          {i.kind === 'delayed' && (
            <HmsNotice tone="amber" action={<HmsButton size="sm" onClick={() => onNavigateTab('receivables', undefined, data.payers.find((p) => p.payer === i.payer)?.id)}>Open payer</HmsButton>}>
              {i.title} — {i.sub}
            </HmsNotice>
          )}
          <HmsSection title={`Inflow vs outflow · ₹ L · ${n === 90 ? 'weekly' : 'daily'}`} padded>
            <ManagerBars labels={labels} a={ins} b={outs} legend={['Expected collections', 'Expected payments']} tip={(idx) => `${labels[idx] || ''} in ₹ ${ins[idx].toFixed(1)} L / out ₹ ${outs[idx].toFixed(1)} L`} />
          </HmsSection>
          <HmsSection title="Projected balance · ₹ Cr" padded>
            <ManagerBars labels={labels} a={bals} colorA={(v) => (v * 1e7 < cash.buffer ? '#dc2626' : '#16a34a')} line={{ value: cash.buffer / 1e7, label: `Buffer ${cr(cash.buffer)}` }} tip={(idx) => `₹ ${bals[idx].toFixed(2)} Cr`} />
          </HmsSection>
          <HmsSection title="Projection">
            <HmsRow label="Projected closing" value={cr(cash.projected_closing)} />
            <HmsRow label="Treasury buffer" value={cr(cash.buffer)} last />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="mgr-cash"
      title="Cash flow monitor"
      description="Projected collections and payments against today's cash and the treasury buffer."
      total={items.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search payment, payer or warning"
      pills={[
        { key: '7', label: '7 days', count: range === '7' ? items.length : 0 },
        { key: '30', label: '30 days', count: range === '30' ? items.length : 0 },
        { key: '90', label: '90 days', count: range === '90' ? items.length : 0 },
      ]}
      activePill={range}
      onPill={setRange}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Cash flow"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Escalated approvals                                                 */
/* ================================================================== */

export const ManagerEscalatedView: React.FC<ManagerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { queue, limits } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'pending');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);

  const over = (r: ApprovalRequestItem) => {
    const l = managerLimit(limits, r.document_type);
    return l != null && Number(r.amount) > l;
  };
  const risky = (r: ApprovalRequestItem) => ['Fraud concern', 'Compliance risk', 'Duplicate risk'].includes(queueReason(r).reason);
  const filters: Record<string, (r: ApprovalRequestItem) => boolean> = {
    pending: isQueuePending,
    over: (r) => isQueuePending(r) && over(r),
    risk: (r) => isQueuePending(r) && risky(r),
    decided: (r) => !isQueuePending(r),
    all: () => true,
  };
  const q = search.trim().toLowerCase();
  const visible = queue
    .filter((r) => (filters[pill] || filters.all)(r) && has(q, [r.reference_no, r.maker_name, queueReason(r).sup]))
    .sort((a, b) => (isQueuePending(a) ? 0 : 1) - (isQueuePending(b) ? 0 : 1) || Number(b.amount) - Number(a.amount));
  const count = (k: string) => queue.filter(filters[k]).length;
  const statusOf = (r: ApprovalRequestItem) => (isQueuePending(r) ? 'Pending' : humanize(r.status));

  const rows: HmsListRow[] = visible.map((r) => {
    const m = queueReason(r);
    const h = hoursSince(r.submitted_at);
    return {
      key: r.id,
      title: `${DOC_LABEL[r.document_type] || humanize(r.document_type)} ${r.reference_no}`,
      badge: <Tag s={statusOf(r)} />,
      sub: `${m.reason} · by ${m.sup} · maker ${r.maker_name}`,
      metaLeft: <span style={{ color: isQueuePending(r) && h > 48 ? '#b91c1c' : undefined }}>{ageL(h)} waiting</span>,
      metaRight: <strong>{cr(r.amount)}</strong>,
    };
  });

  const renderDetail = (key: string | null) => {
    const r = queue.find((x) => x.id === key);
    if (!r) return <HmsEmpty>{queue.length ? 'Select a case from the list to see its details.' : 'No escalated approvals are waiting for you.'}</HmsEmpty>;
    const m = queueReason(r);
    const lim = managerLimit(limits, r.document_type);
    const isOver = over(r);
    const crit = (r.risk_flags || []).filter((f) => CRITICAL_FLAGS.includes(f));
    const doc = DOC_LABEL[r.document_type] || humanize(r.document_type);
    const decide = (decision: 'approve' | 'return' | 'reject' | 'forward', label: string) => async (c: string, _v: string, acks: string[]) => {
      await accountsService.processDecision(r.id, { decision, comment: c, acknowledgements: acks, version: r.version });
      return `${r.reference_no} — ${label}`;
    };
    const forward: MgrAction = { key: 'forward', label: 'Forward to controller', icon: Send, comment: 'required', run: decide('forward', 'forwarded to the Finance Controller') };
    const actions: MgrAction[] = !isQueuePending(r)
      ? []
      : isOver
        ? [{ ...forward, variant: 'primary' }, { key: 'return', label: 'Return', icon: CornerUpLeft, comment: 'required', run: decide('return', 'returned to the supervisor') }, { key: 'reject', label: 'Reject', variant: 'danger', icon: X, comment: 'required', run: decide('reject', 'rejected') }]
        : [
            { key: 'approve', label: 'Approve', icon: Check, comment: 'optional', acks: crit, run: decide('approve', 'approved') },
            { key: 'return', label: 'Return', icon: CornerUpLeft, comment: 'required', run: decide('return', 'returned to the supervisor') },
            { key: 'reject', label: 'Reject', variant: 'danger', icon: X, comment: 'required', run: decide('reject', 'rejected') },
            forward,
          ];
    return (
      <>
        <HmsDetailHeader icon={ShieldAlert} title={`${doc} ${r.reference_no}`} badge={<Tag s={statusOf(r)} />} subtitle={`${m.reason} · escalated by ${m.sup}${m.at ? ` · ${fmtDateTime(m.at)}` : ''}`} />
        <HmsStatStrip
          items={[
            { label: 'Amount', value: cr(r.amount) },
            { label: 'Your limit', value: lim == null ? '—' : cr(lim), tone: isOver ? 'amber' : 'default', note: isOver ? 'Above — forward' : 'Within limit' },
            { label: 'Waiting', value: ageL(hoursSince(r.submitted_at)) },
            { label: 'Priority', value: humanize(r.priority) },
          ]}
        />
        <HmsDetailBody>
          <HmsNotice tone={['Fraud concern', 'Duplicate risk'].includes(m.reason) ? 'red' : 'amber'}>
            Escalated for {m.reason.toLowerCase()} by {m.sup}
            {m.note ? ` — “${m.note}”` : ''}
          </HmsNotice>
          {crit.length > 0 && <HmsNotice tone="red">Critical: {crit.map(humanize).join(', ')} — you confirm these when approving.</HmsNotice>}
          <HmsSection title="Request">
            <HmsRow label="Document" value={doc} />
            <HmsRow label="Maker" value={r.maker_name || '—'} />
            <HmsRow label="Submitted" value={fmtDateTime(r.submitted_at)} />
            <HmsRow label="Risk flags" value={r.risk_flags?.length ? r.risk_flags.map(humanize).join(', ') : 'None'} last />
          </HmsSection>
          <HmsSection title={`Approval trail (${r.steps?.length || 0})`}>
            {r.steps?.length ? (
              r.steps.map((s, idx) => <HmsRow key={s.step_no} last={idx === r.steps!.length - 1} label={`${humanize(s.decision)} · ${humanize(s.level)}`} hint={s.comment || undefined} value={<span style={{ fontSize: '12px', color: HMS.textSecondary }}>{`${s.actor_name} · ${fmtDateTime(s.decided_at)}`}</span>} />)
            ) : (
              <Muted>No decisions recorded.</Muted>
            )}
          </HmsSection>
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} note={!isQueuePending(r) ? `Decision recorded — ${statusOf(r)}.` : undefined} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="mgr-escalated"
      title="Escalated approvals"
      description="Cases sent up by Accounts Supervisors. Decide within your limit; forward the rest."
      total={queue.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search reference, maker or supervisor"
      pills={[
        { key: 'pending', label: 'Awaiting you', count: count('pending') },
        { key: 'over', label: 'Above your limit', count: count('over') },
        { key: 'risk', label: 'Fraud / compliance / duplicate', count: count('risk'), tone: 'red' },
        { key: 'decided', label: 'Decided', count: count('decided') },
        { key: 'all', label: 'All', count: queue.length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Escalated approval"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* High-value transactions                                             */
/* ================================================================== */

export const ManagerHighValueView: React.FC<ManagerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { hv, limits } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const PRI: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

  const filters: Record<string, (h: (typeof hv)[number]) => boolean> = {
    all: () => true,
    awaiting: (h) => h.status === 'Awaiting Manager',
    bills: (h) => h.kind === 'Vendor Bill',
    refunds: (h) => h.kind === 'Refund',
    expenses: (h) => h.kind === 'Expense Request',
    adjustments: (h) => h.kind === 'Adjustment',
  };
  const q = search.trim().toLowerCase();
  const visible = hv
    .filter((h) => (filters[pill] || filters.all)(h) && has(q, [h.ref, h.title, h.dept]))
    .sort((a, b) => (a.status === 'Awaiting Manager' ? 0 : 1) - (b.status === 'Awaiting Manager' ? 0 : 1) || PRI[a.risk] - PRI[b.risk] || b.amt - a.amt);
  const count = (k: string) => hv.filter(filters[k]).length;

  const rows: HmsListRow[] = visible.map((h) => ({
    key: h.id,
    title: h.title,
    badge: <Tag s={h.status} />,
    sub: (
      <>
        {h.kind} · <span style={MONO}>{h.ref}</span> · {h.dept}
      </>
    ),
    metaLeft: <HmsBadge tone={TONE[h.risk] || 'gray'}>{h.risk} risk</HmsBadge>,
    metaRight: <strong>{cr(h.amt)}</strong>,
  }));

  const renderDetail = (key: string | null) => {
    const h = hv.find((x) => x.id === key);
    if (!h) return <HmsEmpty>{hv.length ? 'Select a transaction from the list to see its details.' : 'No transactions of ₹ 1 L or more.'}</HmsEmpty>;
    const lim = managerLimit(limits, KIND_DOC[h.kind] || '');
    const waiting = h.status === 'Awaiting Manager';
    const isOver = lim != null && h.amt > lim;
    const canFlag = !waiting && h.kind !== 'Vendor Bill' && ['Approved', 'Posted', 'Scheduled'].includes(h.status);
    const decide = (d: 'approve' | 'hold' | 'forward') => async (c: string) => (await accountsService.decideHighValueTransaction(h.id, d, c)).message;
    const actions: MgrAction[] = waiting
      ? [
          { key: 'approve', label: isOver ? 'Approve & forward' : 'Approve', icon: isOver ? Send : Check, run: decide('approve') },
          { key: 'hold', label: 'Hold', icon: Pause, comment: 'required', run: decide('hold') },
          { key: 'forward', label: 'Forward to controller', icon: Send, comment: 'required', run: decide('forward') },
        ]
      : canFlag
        ? [{ key: 'flag', label: 'Flag for review', variant: 'secondary', icon: Flag, comment: 'required', commentHint: 'Creates a Financial Exception.', run: async (c) => `${h.ref} flagged — ${(await accountsService.flagHighValueTransaction(h.id, c)).exception_no || 'exception'} created` }]
        : [];
    return (
      <>
        <HmsDetailHeader icon={BadgeIndianRupee} title={h.title} badge={<Tag s={h.status} />} subtitle={`${h.kind} · ${h.ref} · ${h.dept} · ${h.date}`} />
        <HmsStatStrip
          items={[
            { label: 'Amount', value: cr(h.amt) },
            { label: 'Risk', value: h.risk, tone: h.risk === 'High' ? 'red' : h.risk === 'Medium' ? 'amber' : 'default' },
            { label: 'Your limit', value: lim == null ? '—' : cr(lim), tone: waiting && isOver ? 'amber' : 'default', note: waiting ? (isOver ? 'Above — forward' : 'Within limit') : undefined },
            { label: 'Raised by', value: h.by || '—' },
          ]}
        />
        <HmsDetailBody>
          {h.risk === 'High' && <HmsNotice tone="amber">High risk — review the evidence before deciding.</HmsNotice>}
          {!waiting && !canFlag && <HmsNotice tone="blue">{h.status === 'With Controller' ? 'With the Finance Controller.' : h.status === 'On Hold' ? 'On hold.' : 'Monitoring only.'}</HmsNotice>}
          <HmsSection title="Transaction">
            {h.kv.length ? h.kv.map(([k, v], idx) => <HmsRow key={k} label={k} value={v} last={idx === h.kv.length - 1} />) : <Muted>No further details from the server.</Muted>}
          </HmsSection>
          <Trail trail={h.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="mgr-highvalue"
      title="High-value transactions"
      description="Every bill, refund, expense and adjustment of ₹ 1 L and above."
      total={hv.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search reference, title or department"
      pills={[
        { key: 'all', label: 'All', count: hv.length },
        { key: 'awaiting', label: 'Awaiting you', count: count('awaiting') },
        { key: 'bills', label: 'Vendor bills', count: count('bills') },
        { key: 'refunds', label: 'Refunds', count: count('refunds') },
        { key: 'expenses', label: 'Expenses', count: count('expenses') },
        { key: 'adjustments', label: 'Adjustments', count: count('adjustments') },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Transaction"
      renderDetail={renderDetail}
    />
  );
};
