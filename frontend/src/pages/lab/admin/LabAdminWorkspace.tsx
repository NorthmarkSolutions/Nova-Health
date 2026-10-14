// Lab Admin workspace — HMS design bible Section 19 (reference: Pharmacy Admin).
// Sidebar in priority order, large profile control, 4 clickable KPIs and master-detail sections.
import React, { useEffect, useMemo, useState } from 'react';
import { onLabApiError } from '../../../services/labService';
import { useSearchParams } from 'react-router-dom';
import { Activity, Users, CalendarDays, Cpu, Package, Receipt, BarChart3, Settings } from 'lucide-react';
import {
  HmsShell,
  HmsNavGroup,
  HmsPageHeader,
  HmsKpiRow,
  HmsToast,
  useHmsToast,
  HmsBadge,
} from '../../../components/hms';
import { useAuth } from '../../../context/AuthContext';
import {
  useLabAdminData,
  rosterGaps,
  staffStatusNow,
  credentialState,
  stockState,
  buildPriceRows,
  stageGroup,
} from '../data/labAdminStore';
import { LabAdminOverviewView } from './LabAdminOverviewView';
import { LabAdminStaffView } from './LabAdminStaffView';
import { LabAdminSchedulingView } from './LabAdminSchedulingView';
import { LabAdminEquipmentView } from './LabAdminEquipmentView';
import { LabAdminStockView } from './LabAdminStockView';
import { LabAdminPricingView } from './LabAdminPricingView';
import { LabAdminReportsView } from './LabAdminReportsView';
import { LabAdminSettingsView } from './LabAdminSettingsView';
import { LabAdminViewProps } from './labAdminUi';

const TABS = ['overview', 'staff', 'scheduling', 'equipment', 'stock', 'pricing', 'reports', 'settings'] as const;
type Tab = (typeof TABS)[number];

const VIEWS: Record<Tab, React.FC<LabAdminViewProps>> = {
  overview: LabAdminOverviewView,
  staff: LabAdminStaffView,
  scheduling: LabAdminSchedulingView,
  equipment: LabAdminEquipmentView,
  stock: LabAdminStockView,
  pricing: LabAdminPricingView,
  reports: LabAdminReportsView,
  settings: LabAdminSettingsView,
};

/** Sections with an "add" action on Alt+N. */
const ADDABLE: Tab[] = ['staff', 'equipment', 'stock'];

export const LabAdminWorkspace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = requested && (TABS as readonly string[]).includes(requested) ? requested : 'overview';
  const { user } = useAuth();
  const by = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Lab Admin';

  const data = useLabAdminData();
  const { state, orders, analyzers, catalog, tariffs } = data;
  const { toast, show, clear } = useHmsToast();
  // Steps the lab server refuses (wrong stage, role, unpaid bill…) are shown here and the data reloads
  useEffect(() => onLabApiError((msg) => show(msg, 'error')), [show]);
  const [newSignal, setNewSignal] = useState<Record<string, number>>({});

  const initialFilter = searchParams.get('filter') || undefined;
  const goTo = (tab: string, filter?: string) => {
    const next: Record<string, string> = {};
    if (tab !== 'overview') next.tab = tab;
    if (filter) next.filter = filter;
    setSearchParams(next);
  };

  // Live figures — every number below is derived from the lab data, never typed in
  const m = useMemo(() => {
    const active = orders.filter((o) => o.stage !== 'SIGNED_OFF');
    const review = orders.filter((o) => stageGroup(o.stage) === 'review');
    const critical = orders.filter((o) => o.isCritical && o.stage !== 'SIGNED_OFF');
    const stat = orders.filter((o) => o.priority === 'STAT');
    const offline = analyzers.filter((a) => a.status === 'Offline');
    const maintenance = analyzers.filter((a) => a.status === 'Maintenance');
    const online = analyzers.filter((a) => a.status === 'Running' || a.status === 'Ready');
    const gaps = rosterGaps(state);
    const onDuty = state.staff.filter((s) => staffStatusNow(state, s) === 'On duty');
    const pendingRequests = state.requests.filter((r) => r.status === 'Pending');
    const credDue = state.staff.filter((s) => ['expired', 'expiring'].includes(credentialState(s)));
    const credExpired = state.staff.filter((s) => credentialState(s) === 'expired');
    const stockAlerts = state.stock.filter((i) => ['Below reorder', 'Expired'].includes(stockState(i).label));
    const prices = buildPriceRows(state, catalog, tariffs, data.pendingPrices);
    const noPrice = prices.filter((p) => p.status === 'No price');
    const pendingPrice = prices.filter((p) => p.status === 'Pending sync');
    return { active, review, critical, stat, offline, maintenance, online, gaps, onDuty, pendingRequests, credDue, credExpired, stockAlerts, noPrice, pendingPrice };
  }, [orders, analyzers, state, catalog, tariffs, data.pendingPrices]);

  const navGroups: HmsNavGroup[] = [
    { label: 'Overview', items: [{ key: 'overview', label: 'Live orders', icon: Activity, count: m.active.length, alert: m.critical.length > 0 }] },
    {
      label: 'Staff & roster',
      items: [
        { key: 'staff', label: 'Staff & credentials', icon: Users, count: m.pendingRequests.length + m.credDue.length, alert: m.credExpired.length > 0 },
        { key: 'scheduling', label: 'Duty scheduling', icon: CalendarDays, count: m.gaps.length, alert: m.gaps.length > 0 },
      ],
    },
    {
      label: 'Equipment & stock',
      items: [
        { key: 'equipment', label: 'Analyzers & service', icon: Cpu, count: m.offline.length + m.maintenance.length, alert: m.offline.length > 0 },
        { key: 'stock', label: 'Reagents & stock', icon: Package, count: m.stockAlerts.length, alert: m.stockAlerts.length > 0 },
      ],
    },
    {
      label: 'Billing & governance',
      items: [
        { key: 'pricing', label: 'Test pricing', icon: Receipt, count: m.noPrice.length + m.pendingPrice.length, alert: m.noPrice.length > 0 },
        { key: 'reports', label: 'Reports & analytics', icon: BarChart3 },
        { key: 'settings', label: 'Department settings', icon: Settings },
      ],
    },
  ];

  const View = VIEWS[activeTab];

  return (
    <HmsShell
      navLabel="Lab admin navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={goTo}
      department={{ name: 'Diagnostic Laboratory', scope: state.settings.location, roleBadge: 'ADMIN', roleName: 'Lab Admin', responsibility: 'Oversight & governance' }}
      roleLabel="Lab Admin"
      crumb="Laboratory · Admin"
      crumbChip={
        <span style={{ marginLeft: '8px' }}>
          <HmsBadge tone="green" dot>
            Live
          </HmsBadge>
        </span>
      }
      altShortcuts={{
        KeyN: () => {
          if (ADDABLE.includes(activeTab)) setNewSignal((s) => ({ ...s, [activeTab]: (s[activeTab] || 0) + 1 }));
        },
        KeyS: () => goTo('scheduling'),
        KeyR: () => goTo('reports'),
      }}
      shortcutHelp={[
        ['Alt+N', 'Add staff · register analyzer · add stock item (on those sections)'],
        ['Alt+S  ·  Alt+R', 'Duty scheduling · Reports'],
      ]}
    >
      <HmsToast toast={toast} onClose={clear} />

      <HmsPageHeader
        title="Laboratory Admin Workspace"
        description="Department oversight for the diagnostic lab · staff and roster, analyzers and stock, test pricing and reports. Bench work stays in the Technician and Pathologist workspaces."
        actions={[
          { label: 'Duty scheduling', icon: CalendarDays, onClick: () => goTo('scheduling'), shortcutKey: 'S' },
          { label: 'Daily report', icon: BarChart3, onClick: () => goTo('reports'), primary: true, shortcutKey: 'R' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'orders',
            label: 'Orders today',
            value: orders.length,
            unit: 'received',
            badge: { text: `${m.active.length} IN PROGRESS`, tone: 'blue' },
            caption: `${m.stat.length} STAT · ${orders.length - m.active.length} released`,
            onOpen: () => goTo('overview', 'active'),
            title: 'Open live orders',
          },
          {
            key: 'review',
            label: 'Awaiting sign-off',
            value: m.review.length,
            unit: 'reports',
            badge: m.critical.length ? { text: `${m.critical.length} CRITICAL`, tone: 'red' } : { text: 'CLEAR', tone: 'green' },
            alert: m.critical.length > 0,
            caption: m.critical.length ? 'Critical values waiting for the pathologist' : 'No critical values open',
            captionTone: m.critical.length ? 'amber' : 'muted',
            onOpen: () => goTo('overview', m.critical.length ? 'urgent' : 'review'),
            title: 'Open orders awaiting sign-off',
          },
          {
            key: 'analyzers',
            label: 'Analyzers online',
            value: `${m.online.length}/${analyzers.length}`,
            unit: 'running or ready',
            badge: m.offline.length ? { text: `${m.offline.length} OFFLINE`, tone: 'red' } : { text: 'ALL UP', tone: 'green' },
            alert: m.offline.length > 0,
            caption: `${m.maintenance.length} in maintenance · ${m.stockAlerts.length} stock alert${m.stockAlerts.length === 1 ? '' : 's'}`,
            captionTone: m.stockAlerts.length ? 'amber' : 'muted',
            onOpen: () => goTo('equipment', m.offline.length || m.maintenance.length ? 'down' : undefined),
            title: 'Open analyzers & service',
          },
          {
            key: 'staff',
            label: 'Staff on duty',
            value: m.onDuty.length,
            unit: `of ${state.staff.filter((s) => !s.suspended).length}`,
            badge: { text: `${m.pendingRequests.length} REQUEST${m.pendingRequests.length === 1 ? '' : 'S'}`, tone: m.pendingRequests.length ? 'amber' : 'gray' },
            caption: m.gaps.length ? `${m.gaps.length} roster gap${m.gaps.length === 1 ? '' : 's'} this week` : 'Roster fully covered this week',
            captionTone: m.gaps.length ? 'amber' : 'muted',
            onOpen: () => goTo('staff', m.pendingRequests.length ? 'requests' : undefined),
            title: 'Open staff & credentials',
          },
        ]}
      />

      <View key={`${activeTab}-${initialFilter || ''}`} data={data} by={by} notify={show} onNavigateTab={goTo} newSignal={newSignal[activeTab] || 0} initialFilter={initialFilter} />
    </HmsShell>
  );
};

export default LabAdminWorkspace;
