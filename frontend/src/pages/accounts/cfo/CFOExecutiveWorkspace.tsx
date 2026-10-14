// CFO workspace — HMS design bible Section 19 (reference: Lab Admin, Pharmacy Admin).
// Financial health, performance, planning, investments, board reporting and risk — all from /accounts/cfo/*.
import { UserRound } from 'lucide-react';
import { AuditorAccessView } from '../shared/AuditorAccessView';
import React, { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  IndianRupee,
  Wallet,
  Scale,
  Building2,
  Activity,
  PiggyBank,
  TrendingUp,
  Building,
  Stamp,
  Presentation,
  Rocket,
  ShieldAlert,
  BellRing,
  ScrollText,
  Tags,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { HmsShell, HmsNavGroup, HmsPageHeader, HmsKpiRow, HmsToast, useHmsToast, HmsBadge, HmsNotice, HMS } from '../../../components/hms';
import { WorkloadResponse } from '../../../services/accountsService';
import type { RoleViewKey } from '../components/AccountsStickyAppBar';
import { useCfoData, isAwaitingCfo } from './cfoData';
import type { CfoViewProps } from './cfoHelpers';
import { CfoOverviewView, CfoProfitLossView, CfoCashView, CfoBalanceSheetView, CfoDeptProfitView, CfoServicesView, CfoBudgetView, CfoForecastView } from './CfoFinanceViews';
import { CfoCapexView, CfoApprovalsView, CfoGrowthView, CfoRisksView, CfoAlertsView, CfoBoardView, CfoDecisionsView } from './CfoDecisionViews';

export interface CFOExecutiveWorkspaceProps {
  activeRoleView?: RoleViewKey;
  onSelectRole?: (role: RoleViewKey) => void;
  workload?: WorkloadResponse['queues'] | null;
  currentTime?: Date;
  onOpenMaster?: (master: 'coa' | 'dofa' | 'audit') => void;
}

const VIEWS: Record<string, React.FC<CfoViewProps>> = {
  overview: CfoOverviewView,
  pl: CfoProfitLossView,
  cash: CfoCashView,
  bs: CfoBalanceSheetView,
  deptprof: CfoDeptProfitView,
  services: CfoServicesView,
  budget: CfoBudgetView,
  forecast: CfoForecastView,
  capex: CfoCapexView,
  approvals: CfoApprovalsView,
  board: CfoBoardView,
  growth: CfoGrowthView,
  risks: CfoRisksView,
  alerts: CfoAlertsView,
  auditors: AuditorAccessView,
  decisions: CfoDecisionsView,
};
// The server's links use the old screen keys
const ALIAS: Record<string, string> = { dashboard: 'overview', departments: 'deptprof', dept: 'deptprof' };
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

export const CFOExecutiveWorkspace: React.FC<CFOExecutiveWorkspaceProps> = ({ onOpenMaster }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const requested = searchParams.get('tab') || '';
  const resolved = ALIAS[requested] || requested;
  const activeTab = VIEWS[resolved] ? resolved : 'overview';
  const initialFilter = searchParams.get('filter') || undefined;
  const initialSelect = searchParams.get('select') || undefined;

  const data = useCfoData();
  const { toast, show, clear } = useHmsToast();

  const goTo = (tab: string, filter?: string, select?: string) => {
    if (MASTERS[tab]) {
      if (onOpenMaster) navigate({ pathname: `/accounts/${MASTERS[tab]}`, search: location.search });
      return;
    }
    const t = ALIAS[tab] || tab;
    const next: Record<string, string> = {};
    if (t !== 'overview') next.tab = t;
    if (filter) next.filter = filter;
    if (select) next.select = select;
    setSearchParams(next);
  };

  // Live figures — every number is derived from the CFO API, never typed in
  const m = useMemo(() => {
    const capexAwaiting = (data.capex?.requests || []).filter((x) => isAwaitingCfo(x.status));
    const approvalsAwaiting = data.approvals.filter((x) => isAwaitingCfo(x.status));
    const budgetAwaiting = data.budget && isAwaitingCfo(data.budget.status) ? 1 : 0;
    const growthLive = data.growth.filter((g) => g.stage !== 'Approved' && ['Idea', 'Feasibility', 'Business Case'].includes(g.stage));
    const risksCritical = data.risks.filter((r) => /critical/i.test(r.rating));
    const risksRising = data.risks.filter((r) => /rising/i.test(r.trend));
    const alertsOpen = data.alerts.filter((a) => /open/i.test(a.status));
    const alertsCritical = alertsOpen.filter((a) => /critical/i.test(a.severity));
    const boardDraft = data.board && !/approved/i.test(data.board.status) ? 1 : 0;
    const decisionsDue = capexAwaiting.length + approvalsAwaiting.length + budgetAwaiting;
    return { capexAwaiting, approvalsAwaiting, budgetAwaiting, growthLive, risksCritical, risksRising, alertsOpen, alertsCritical, boardDraft, decisionsDue };
  }, [data]);

  const failed = (label: string) => data.failed.includes(label);
  const k = data.dash?.kpis;

  const navGroups: HmsNavGroup[] = [
    { label: 'Overview', items: [{ key: 'overview', label: 'CFO overview', icon: LayoutDashboard, count: data.dash?.upcoming_decisions.length }] },
    {
      label: 'Financial health',
      items: [
        { key: 'pl', label: 'Profit & loss', icon: IndianRupee },
        { key: 'cash', label: 'Cash flow', icon: Wallet, alert: m.alertsCritical.some((a) => a.target_screen === 'cash') },
        { key: 'bs', label: 'Balance sheet', icon: Scale },
      ],
    },
    {
      label: 'Performance',
      items: [
        { key: 'deptprof', label: 'Department profitability', icon: Building2 },
        { key: 'services', label: 'Service line analytics', icon: Activity },
      ],
    },
    {
      label: 'Planning',
      items: [
        { key: 'budget', label: 'Budget strategy', icon: PiggyBank, count: m.budgetAwaiting },
        { key: 'forecast', label: 'Financial forecasting', icon: TrendingUp },
      ],
    },
    {
      label: 'Investments',
      items: [
        { key: 'capex', label: 'CapEx planning', icon: Building, count: m.capexAwaiting.length },
        { key: 'approvals', label: 'Strategic approvals', icon: Stamp, count: m.approvalsAwaiting.length },
      ],
    },
    {
      label: 'Executive',
      items: [
        { key: 'board', label: 'Board reporting', icon: Presentation, count: m.boardDraft },
        { key: 'growth', label: 'Growth opportunities', icon: Rocket, count: m.growthLive.length },
      ],
    },
    {
      label: 'Risk',
      items: [
        { key: 'risks', label: 'Strategic risks', icon: ShieldAlert, count: m.risksCritical.length, alert: m.risksCritical.length > 0 },
        { key: 'alerts', label: 'Financial alerts', icon: BellRing, count: m.alertsOpen.length, alert: m.alertsCritical.length > 0 },
        { key: 'auditors', label: 'Auditor access', icon: UserRound },
      ],
    },
    { label: 'Tracking', items: [{ key: 'decisions', label: 'Executive decisions', icon: ScrollText }] },
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
      navLabel="CFO navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={goTo}
      department={{ name: 'Accounts & Finance', scope: 'Hospital finance & strategy', roleBadge: 'CFO', roleName: 'Chief Financial Officer', responsibility: 'Strategy & capital · Level 5' }}
      roleLabel="CFO"
      crumb="Accounts & Finance · CFO"
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
      altShortcuts={{ KeyB: () => goTo('board'), KeyC: () => goTo('cash'), KeyR: refresh }}
      shortcutHelp={[
        ['Alt+B  ·  Alt+C', 'Board reporting · Cash flow'],
        ['Alt+R', 'Refresh data'],
      ]}
    >
      <HmsToast toast={toast} onClose={clear} />

      <HmsPageHeader
        title="CFO Workspace"
        description="Profitability, cash and the balance sheet; budgets and forecasts; capital, strategic approvals, growth, risk and the board pack."
        actions={[
          { label: 'Cash flow', icon: Wallet, onClick: () => goTo('cash'), shortcutKey: 'C' },
          { label: 'Board pack', icon: Presentation, onClick: () => goTo('board'), primary: true, shortcutKey: 'B' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'profit',
            label: 'Net profit YTD',
            value: k ? k.net_profit : null,
            loading: data.loading,
            unit: k ? `${k.net_profit_margin} margin` : undefined,
            badge: !k ? { text: 'UNAVAILABLE', tone: 'gray' } : k.on_track ? { text: 'ON TRACK', tone: 'green' } : { text: 'OFF TRACK', tone: 'amber' },
            caption: k ? `Revenue ${k.total_revenue} · ${k.revenue_growth} YoY` : 'Dashboard unavailable',
            onOpen: () => goTo('pl'),
            title: 'Open profit & loss',
          },
          {
            key: 'cash',
            label: 'Cash available',
            value: k ? k.cash_available : null,
            loading: data.loading,
            unit: k ? `runway ${k.runway_all}` : undefined,
            badge: m.alertsCritical.some((a) => a.target_screen === 'cash') ? { text: 'CASH ALERT', tone: 'red' } : { text: 'WATCHED', tone: 'blue' },
            caption: k ? `EBITDA ${k.ebitda} · ${k.ebitda_margin}` : 'Dashboard unavailable',
            onOpen: () => goTo('cash'),
            title: 'Open cash flow',
          },
          {
            key: 'decisions',
            label: 'Decisions waiting on you',
            value: failed('CapEx') && failed('Strategic approvals') ? null : m.decisionsDue,
            loading: data.loading,
            unit: 'CapEx · approvals · budget',
            badge: m.decisionsDue ? { text: 'DECIDE', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            caption: data.capex ? `${m.capexAwaiting.length} CapEx · ${data.capex.kpis.awaiting_cost} awaiting` : 'CapEx unavailable',
            onOpen: () => goTo(m.capexAwaiting.length ? 'capex' : m.approvalsAwaiting.length ? 'approvals' : 'budget', 'awaiting'),
            title: 'Open the decisions waiting on you',
          },
          {
            key: 'alerts',
            label: 'Open financial alerts',
            value: failed('Financial alerts') ? null : m.alertsOpen.length,
            loading: data.loading,
            unit: 'alerts',
            badge: m.alertsCritical.length ? { text: `${m.alertsCritical.length} CRITICAL`, tone: 'red' } : m.alertsOpen.length ? { text: 'OPEN', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            alert: m.alertsCritical.length > 0,
            caption: `${m.risksCritical.length} critical · ${m.risksRising.length} rising strategic risks`,
            captionTone: m.risksCritical.length ? 'amber' : 'muted',
            onOpen: () => goTo('alerts', m.alertsCritical.length ? 'critical' : 'open'),
            title: 'Open financial alerts',
          },
        ]}
      />

      {!data.loading && data.failed.length > 0 && <HmsNotice tone="amber">Could not load: {data.failed.join(', ')}. Those figures show as “—” until the next refresh (Alt+R).</HmsNotice>}

      <View key={`${activeTab}-${initialFilter || ''}-${initialSelect || ''}`} data={data} notify={show} onNavigateTab={goTo} initialFilter={initialFilter} initialSelect={initialSelect} />
    </HmsShell>
  );
};

export default CFOExecutiveWorkspace;
