// Accounts Manager workspace — HMS design bible Section 19 (reference: Lab Admin, Pharmacy Admin).
// Operations owner: receivables, payables and cash, escalated and high-value approvals, budgets,
// compliance, the month-end close and team performance.
import React, { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  HandCoins,
  Wallet,
  ChartLine,
  ShieldAlert,
  BadgeIndianRupee,
  PiggyBank,
  ChartPie,
  FileCheck,
  TriangleAlert,
  CalendarRange,
  CalendarCheck,
  Users,
  Building2,
  Flag,
  ScrollText,
  Tags,
  Scale,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { HmsShell, HmsNavGroup, HmsPageHeader, HmsKpiRow, HmsToast, useHmsToast, HmsBadge, HmsNotice, HMS } from '../../../components/hms';
import { WorkloadResponse } from '../../../services/accountsService';
import type { RoleViewKey } from '../components/AccountsStickyAppBar';
import { useManagerData, cr, escView, isQueuePending, managerLimit, SUP_CAPACITY } from './managerData';
import type { ManagerViewProps } from './managerHelpers';
import { ManagerOverviewView, ManagerReceivablesView, ManagerPayablesView, ManagerCashView, ManagerEscalatedView, ManagerHighValueView } from './ManagerFinanceViews';
import {
  ManagerBudgetsView,
  ManagerCostCenterView,
  ManagerGstView,
  ManagerExceptionsView,
  ManagerWeeklyView,
  ManagerMonthEndView,
  ManagerTeamView,
  ManagerDeptPerfView,
  ManagerEscalationsView,
  ManagerAuditView,
} from './ManagerControlViews';

export interface AccountsManagerWorkspaceProps {
  activeRoleView?: RoleViewKey;
  onSelectRole?: (role: RoleViewKey) => void;
  workload?: WorkloadResponse['queues'] | null;
  currentTime?: Date;
  onOpenMaster?: (master: 'coa' | 'dofa' | 'audit') => void;
}

const VIEWS: Record<string, React.FC<ManagerViewProps>> = {
  overview: ManagerOverviewView,
  receivables: ManagerReceivablesView,
  payables: ManagerPayablesView,
  cash: ManagerCashView,
  escalated: ManagerEscalatedView,
  highvalue: ManagerHighValueView,
  budgets: ManagerBudgetsView,
  costcenter: ManagerCostCenterView,
  gst: ManagerGstView,
  exceptions: ManagerExceptionsView,
  weekly: ManagerWeeklyView,
  monthend: ManagerMonthEndView,
  team: ManagerTeamView,
  deptperf: ManagerDeptPerfView,
  escalations: ManagerEscalationsView,
  audit: ManagerAuditView,
};
const MASTERS: Record<string, 'coa' | 'dofa' | 'audit'> = { coa: 'coa', dofa: 'dofa', auditchain: 'audit' };

const CHIP: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '40px',
  padding: '0 12px',
  border: `1px solid ${HMS.border}`,
  borderRadius: '10px',
  fontSize: '13px',
  color: HMS.label,
  background: '#ffffff',
  whiteSpace: 'nowrap',
};

export const AccountsManagerWorkspace: React.FC<AccountsManagerWorkspaceProps> = ({ onOpenMaster }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const requested = searchParams.get('tab');
  const activeTab = requested && VIEWS[requested] ? requested : 'overview';
  const initialFilter = searchParams.get('filter') || undefined;
  const initialSelect = searchParams.get('select') || undefined;

  const data = useManagerData();
  const { toast, show, clear } = useHmsToast();

  const goTo = (tab: string, filter?: string, select?: string) => {
    if (MASTERS[tab]) {
      if (onOpenMaster) navigate({ pathname: `/accounts/${MASTERS[tab]}`, search: location.search });
      return;
    }
    const next: Record<string, string> = {};
    if (tab !== 'overview') next.tab = tab;
    if (filter) next.filter = filter;
    if (select) next.select = select;
    setSearchParams(next);
  };

  // Live figures — every number is derived from the accounts API, never typed in
  const m = useMemo(() => {
    const pending = data.queue.filter(isQueuePending);
    const aboveLimit = pending.filter((r) => {
      const l = managerLimit(data.limits, r.document_type);
      return l != null && Number(r.amount) > l;
    });
    const over90 = data.payers.reduce((a, r) => a + (r.amt * r.pct[3]) / 100, 0);
    const missedPromises = data.payers.filter((r) => r.late > 0);
    const woPending = data.payers.filter((r) => r.wo?.status === 'Pending');
    const billsAwaiting = data.bills.filter((b) => b.status === 'Awaiting Manager');
    const overdueBills = data.bills.filter((b) => b.dueIn < 0 && b.status !== 'Paid');
    const hvAwaiting = data.hv.filter((h) => h.status === 'Awaiting Manager');
    const overBudget = data.budgets.filter((b) => b.status === 'Over Budget');
    const gstOpen = data.gst.filter((g) => g.status !== 'approved' && g.status !== 'escalated' && !g.reviewed_by_manager && g.exception_count > 0);
    const newExc = data.excs.filter((x) => x.status === 'New');
    const unassigned = data.excs.filter((x) => x.status !== 'Closed' && !x.owner);
    const delayed = (data.monthend?.checklist || []).filter((k) => k.status === 'Delayed');
    const overloaded = data.sups.filter((s) => s.pending > SUP_CAPACITY);
    const openEsc = data.escs.filter((e) => escView(e) === 'open');
    return { pending, aboveLimit, over90, missedPromises, woPending, billsAwaiting, overdueBills, hvAwaiting, overBudget, gstOpen, newExc, unassigned, delayed, overloaded, openEsc };
  }, [data]);

  const failed = (label: string) => data.failed.includes(label);
  const cash = data.cash30;
  const me = data.monthend;

  const navGroups: HmsNavGroup[] = [
    { label: 'Overview', items: [{ key: 'overview', label: 'Command centre', icon: LayoutDashboard, count: data.dash ? data.dash.alerts.length : undefined, alert: (data.dash?.alerts || []).some((a) => a.severity === 'critical') }] },
    {
      label: 'Financial operations',
      items: [
        { key: 'receivables', label: 'Receivables control', icon: HandCoins, count: m.woPending.length + m.missedPromises.length, alert: m.missedPromises.length > 0 },
        { key: 'payables', label: 'Payables control', icon: Wallet, count: m.billsAwaiting.length, alert: m.overdueBills.some((b) => b.msme) },
        { key: 'cash', label: 'Cash flow monitor', icon: ChartLine, alert: !!cash?.is_breach },
      ],
    },
    {
      label: 'Approvals',
      items: [
        { key: 'escalated', label: 'Escalated approvals', icon: ShieldAlert, count: m.pending.length, alert: m.pending.length > 0 },
        { key: 'highvalue', label: 'High-value transactions', icon: BadgeIndianRupee, count: m.hvAwaiting.length },
      ],
    },
    {
      label: 'Budget & cost',
      items: [
        { key: 'budgets', label: 'Department budgets', icon: PiggyBank, count: m.overBudget.length, alert: m.overBudget.length > 0 },
        { key: 'costcenter', label: 'Cost centre analysis', icon: ChartPie },
      ],
    },
    {
      label: 'Compliance',
      items: [
        { key: 'gst', label: 'GST oversight', icon: FileCheck, count: m.gstOpen.length },
        { key: 'exceptions', label: 'Financial exceptions', icon: TriangleAlert, count: m.newExc.length, alert: m.unassigned.length > 0 },
      ],
    },
    {
      label: 'Operations',
      items: [
        { key: 'weekly', label: 'Weekly financial review', icon: CalendarRange },
        { key: 'monthend', label: 'Month-end readiness', icon: CalendarCheck, count: m.delayed.length, alert: m.delayed.length > 0 },
      ],
    },
    {
      label: 'Monitoring',
      items: [
        { key: 'team', label: 'Team performance', icon: Users, count: m.overloaded.length, alert: m.overloaded.length > 0 },
        { key: 'deptperf', label: 'Department performance', icon: Building2 },
      ],
    },
    {
      label: 'Tracking',
      items: [
        { key: 'escalations', label: 'Escalations', icon: Flag, count: m.openEsc.length, alert: m.openEsc.length > 0 },
        { key: 'audit', label: 'Audit trail', icon: ScrollText },
      ],
    },
    {
      label: 'Masters',
      items: [
        { key: 'coa', label: 'Chart of accounts', icon: Tags },
        { key: 'dofa', label: 'DoFA matrix', icon: Scale },
        { key: 'auditchain', label: 'Audit hash chain', icon: ShieldCheck },
      ],
    },
  ];

  const View = VIEWS[activeTab];
  const refresh = () => data.reload().then(() => show('Data refreshed'));

  return (
    <HmsShell
      navLabel="Accounts manager navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={goTo}
      department={{ name: 'Accounts & Finance', scope: 'Central financial control', roleBadge: 'MANAGER', roleName: 'Accounts Manager', responsibility: 'Operations owner · Level 3' }}
      roleLabel="Accounts Manager"
      crumb="Accounts & Finance · Manager"
      crumbChip={
        <span style={{ marginLeft: '8px' }}>
          <HmsBadge tone="green" dot>
            Live
          </HmsBadge>
        </span>
      }
      statusChips={
        <>
          <button type="button" style={{ ...CHIP, cursor: 'pointer' }} onClick={refresh} title="Refresh data (Alt+R)" aria-keyshortcuts="Alt+R">
            <RefreshCw size={16} />
            {data.lastSync ? `Synced ${data.lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Syncing…'}
          </button>
        </>
      }
      altShortcuts={{ KeyW: () => goTo('weekly'), KeyC: () => goTo('cash'), KeyR: refresh }}
      shortcutHelp={[
        ['Alt+W  ·  Alt+C', 'Weekly financial review · Cash flow monitor'],
        ['Alt+R', 'Refresh data'],
      ]}
    >
      <HmsToast toast={toast} onClose={clear} />

      <HmsPageHeader
        title="Accounts Manager Workspace"
        description="Money in, money out, receivables at risk, vendors to pay, escalations, budget overruns and the month-end close — in one place."
        actions={[
          { label: 'Weekly review', icon: CalendarRange, onClick: () => goTo('weekly'), shortcutKey: 'W' },
          { label: 'Cash flow monitor', icon: ChartLine, onClick: () => goTo('cash'), primary: true, shortcutKey: 'C' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'escalated',
            label: 'Escalated to you',
            value: failed('Escalated approvals') ? null : m.pending.length,
            loading: data.loading,
            unit: 'approvals',
            badge: m.aboveLimit.length ? { text: `${m.aboveLimit.length} ABOVE LIMIT`, tone: 'blue' } : m.pending.length ? { text: 'DECIDE', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            alert: m.pending.length > 0,
            caption: failed('Escalated approvals') ? 'Queue unavailable' : `${cr(m.pending.reduce((a, r) => a + (Number(r.amount) || 0), 0))} waiting on your decision`,
            onOpen: () => goTo('escalated', 'pending'),
            title: 'Open escalated approvals',
          },
          {
            key: 'over90',
            label: 'Receivables over 90 days',
            value: failed('Receivables') ? null : cr(m.over90),
            loading: data.loading,
            unit: `${data.payers.length} payers`,
            badge: m.missedPromises.length ? { text: `${m.missedPromises.length} PROMISE MISSED`, tone: 'red' } : { text: 'ON TRACK', tone: 'green' },
            caption: `${m.woPending.length} write-off request${m.woPending.length === 1 ? '' : 's'} to decide`,
            captionTone: m.woPending.length ? 'amber' : 'muted',
            onOpen: () => goTo('receivables', 'risk'),
            title: 'Open receivables at risk',
          },
          {
            key: 'cash',
            label: 'Lowest cash · 30 days',
            value: cash ? cr(cash.lowest_balance) : null,
            loading: data.loading,
            unit: cash ? `on ${cash.lowest_date}` : undefined,
            badge: !cash ? { text: 'UNAVAILABLE', tone: 'gray' } : cash.is_breach ? { text: 'BELOW BUFFER', tone: 'red' } : { text: 'ABOVE BUFFER', tone: 'green' },
            alert: !!cash?.is_breach,
            caption: cash ? `Buffer ${cr(cash.buffer)} · cash today ${cr(cash.starting_cash)}` : 'Cash projection unavailable',
            onOpen: () => goTo('cash'),
            title: 'Open the cash flow monitor',
          },
          {
            key: 'monthend',
            label: 'Month-end readiness',
            value: me ? `${me.readiness_score}%` : null,
            loading: data.loading,
            unit: me ? `${me.completed_count} of ${me.checklist.length} done` : undefined,
            badge: !me ? { text: 'UNAVAILABLE', tone: 'gray' } : m.delayed.length ? { text: `${m.delayed.length} DELAYED`, tone: 'red' } : { text: 'ON TRACK', tone: 'green' },
            caption: me ? `${me.period} close · controller locks ${me.controller_close_date}` : 'Readiness unavailable',
            captionTone: m.delayed.length ? 'amber' : 'muted',
            onOpen: () => goTo('monthend', m.delayed.length ? 'Delayed' : undefined),
            title: 'Open month-end readiness',
          },
        ]}
      />

      {!data.loading && data.failed.length > 0 && <HmsNotice tone="amber">Could not load: {data.failed.join(', ')}. Those figures show as “—” until the next refresh (Alt+R).</HmsNotice>}

      <View key={`${activeTab}-${initialFilter || ''}-${initialSelect || ''}`} data={data} notify={show} onNavigateTab={goTo} initialFilter={initialFilter} initialSelect={initialSelect} />
    </HmsShell>
  );
};

export default AccountsManagerWorkspace;
