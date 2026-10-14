// Finance Controller workspace — HMS design bible Section 19 (reference: Lab Admin, Pharmacy Admin).
// Integrity and close owner: period close and locks, payment release, bank control, statements,
// tax compliance, audit readiness and financial governance.
import { UserRound } from 'lucide-react';
import { AuditorAccessView } from '../shared/AuditorAccessView';
import React, { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarRange,
  CalendarClock,
  Lock,
  Send,
  Landmark,
  FileSpreadsheet,
  FileCheck,
  ClipboardCheck,
  ShieldX,
  ShieldAlert,
  TriangleAlert,
  BookLock,
  ScrollText,
  Tags,
  Scale,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { HmsShell, HmsNavGroup, HmsPageHeader, HmsKpiRow, HmsToast, useHmsToast, HmsBadge, HmsNotice, HMS } from '../../../components/hms';
import { WorkloadResponse } from '../../../services/accountsService';
import type { RoleViewKey } from '../components/AccountsStickyAppBar';
import { humanize } from '../executive/executiveData';
import { cr } from '../manager/managerData';
import { useControllerData, isBatchAwaiting, isOpenException, isReconApproved, PERIOD_LABEL } from './controllerData';
import type { ControllerViewProps } from './controllerHelpers';
import { ControllerOverviewView, ControllerMonthEndView, ControllerQuarterView, ControllerYearView, ControllerLocksView } from './ControllerCloseViews';
import {
  ControllerPaymentsView,
  ControllerBankView,
  ControllerStatementsView,
  ControllerGstView,
  ControllerAuditReadyView,
  ControllerControlsView,
  ControllerHighRiskView,
  ControllerExceptionsView,
  ControllerPoliciesView,
  ControllerAuditView,
} from './ControllerGovernanceViews';

export interface FinanceControllerWorkspaceProps {
  activeRoleView?: RoleViewKey;
  onSelectRole?: (role: RoleViewKey) => void;
  workload?: WorkloadResponse['queues'] | null;
  currentTime?: Date;
  onOpenMaster?: (master: 'coa' | 'dofa' | 'audit') => void;
}

const VIEWS: Record<string, React.FC<ControllerViewProps>> = {
  overview: ControllerOverviewView,
  monthend: ControllerMonthEndView,
  quarterend: ControllerQuarterView,
  yearend: ControllerYearView,
  locks: ControllerLocksView,
  payments: ControllerPaymentsView,
  bank: ControllerBankView,
  statements: ControllerStatementsView,
  gst: ControllerGstView,
  auditready: ControllerAuditReadyView,
  controls: ControllerControlsView,
  highrisk: ControllerHighRiskView,
  exceptions: ControllerExceptionsView,
  policies: ControllerPoliciesView,
  auditors: AuditorAccessView,
  audit: ControllerAuditView,
};
// The server's dashboard links use the old screen keys; 'dashboard' maps to the overview
const ALIAS: Record<string, string> = { dashboard: 'overview' };
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

export const FinanceControllerWorkspace: React.FC<FinanceControllerWorkspaceProps> = ({ onOpenMaster }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const requested = searchParams.get('tab') || '';
  const activeTab = VIEWS[ALIAS[requested] || requested] ? ALIAS[requested] || requested : 'overview';
  const initialFilter = searchParams.get('filter') || undefined;
  const initialSelect = searchParams.get('select') || undefined;

  const data = useControllerData();
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

  // Live figures — every number is derived from the accounts API, never typed in
  const m = useMemo(() => {
    const awaiting = data.batches.filter(isBatchAwaiting);
    const failingBatches = awaiting.filter((b) => b.checks.some((c) => !c.ok));
    const openExc = data.exceptions.filter(isOpenException);
    const unassignedExc = openExc.filter((x) => !x.owner);
    const reconOk = data.recons.filter(isReconApproved);
    const unexplained = data.recons.filter((r) => r.difference !== 0 && !isReconApproved(r));
    const frozen = data.accounts.filter((a) => a.frozen);
    const reopenReq = data.periods.filter((p) => p.status === 'reopen_requested');
    const hrAwaiting = data.highRisk.filter((h) => /awaiting/i.test(h.status));
    const ctlOpen = data.controls.filter((v) => !/closed/i.test(v.status));
    const ctlCritical = ctlOpen.filter((v) => /critical/i.test(v.severity));
    const taxReady = data.taxReturns.filter((r) => r.status === 'Ready' || r.exceptions.length > 0);
    const pbcGaps = data.auditRequests.filter((r) => /gap|missing/i.test(r.status));
    const policyChanges = data.policies.filter((p) => !!p.change_data);
    const stmtsOpen = (['pl', 'bs', 'cf'] as const).filter((k) => data.statements[k] && !data.statements[k]!.is_approved);
    const yearOpen = (data.year?.items || []).filter((x) => !/remediated|approved/i.test(x.status));
    const quarterReview = (data.quarter?.items || []).filter((x) => x.status === 'For Review');
    return { awaiting, failingBatches, openExc, unassignedExc, reconOk, unexplained, frozen, reopenReq, hrAwaiting, ctlOpen, ctlCritical, taxReady, pbcGaps, policyChanges, stmtsOpen, yearOpen, quarterReview };
  }, [data]);

  const failed = (label: string) => data.failed.includes(label);
  const me = data.monthEnd;
  const meBlockers = me?.blockers.length ?? 0;

  const navGroups: HmsNavGroup[] = [
    { label: 'Overview', items: [{ key: 'overview', label: 'Integrity overview', icon: LayoutDashboard, count: data.dash?.pending_actions.length, alert: (data.dash?.risks || []).some((r) => /critical/i.test(r.sev)) }] },
    {
      label: 'Period close',
      items: [
        { key: 'monthend', label: 'Month-end close', icon: CalendarCheck, count: meBlockers, alert: meBlockers > 0 },
        { key: 'quarterend', label: 'Quarter-end close', icon: CalendarRange, count: m.quarterReview.length },
        { key: 'yearend', label: 'Year-end close', icon: CalendarClock, count: m.yearOpen.length },
        { key: 'locks', label: 'Period locks', icon: Lock, count: m.reopenReq.length, alert: m.reopenReq.length > 0 },
      ],
    },
    {
      label: 'Treasury',
      items: [
        { key: 'payments', label: 'Payment release', icon: Send, count: m.awaiting.length, alert: m.failingBatches.length > 0 },
        { key: 'bank', label: 'Bank control', icon: Landmark, count: data.recons.length - m.reconOk.length, alert: m.unexplained.length > 0 || m.frozen.length > 0 },
      ],
    },
    { label: 'Reporting', items: [{ key: 'statements', label: 'Financial statements', icon: FileSpreadsheet, count: m.stmtsOpen.length }] },
    {
      label: 'Compliance',
      items: [
        { key: 'gst', label: 'GST compliance', icon: FileCheck, count: m.taxReady.length },
        { key: 'auditready', label: 'Audit readiness', icon: ClipboardCheck, count: m.pbcGaps.length, alert: m.pbcGaps.length > 0 },
      ],
    },
    {
      label: 'Governance',
      items: [
        { key: 'controls', label: 'Internal controls', icon: ShieldX, count: m.ctlOpen.length, alert: m.ctlCritical.length > 0 },
        { key: 'highrisk', label: 'High-risk review', icon: ShieldAlert, count: m.hrAwaiting.length },
        { key: 'exceptions', label: 'Exception governance', icon: TriangleAlert, count: m.openExc.length, alert: m.unassignedExc.length > 0 },
        { key: 'policies', label: 'Financial policies', icon: BookLock, count: m.policyChanges.length },
        { key: 'auditors', label: 'Auditor access', icon: UserRound },
      ],
    },
    { label: 'Tracking', items: [{ key: 'audit', label: 'Audit trail', icon: ScrollText }] },
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
  const awaitingAmt = m.awaiting.reduce((a, b) => a + (b.total_amount || 0), 0);

  return (
    <HmsShell
      navLabel="Finance controller navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={goTo}
      department={{ name: 'Accounts & Finance', scope: 'Central financial control', roleBadge: 'CONTROLLER', roleName: 'Finance Controller', responsibility: 'Integrity & close · Level 4' }}
      roleLabel="Finance Controller"
      crumb="Accounts & Finance · Controller"
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
      altShortcuts={{ KeyM: () => goTo('monthend'), KeyL: () => goTo('payments'), KeyR: refresh }}
      shortcutHelp={[
        ['Alt+M  ·  Alt+L', 'Month-end close · Payment release'],
        ['Alt+R', 'Refresh data'],
      ]}
    >
      <HmsToast toast={toast} onClose={clear} />

      <HmsPageHeader
        title="Finance Controller Workspace"
        description="Close the books, release payments, approve reconciliations and statements, and keep compliance, audit and controls clean."
        actions={[
          { label: 'Payment release', icon: Send, onClick: () => goTo('payments'), shortcutKey: 'L' },
          { label: 'Month-end close', icon: CalendarCheck, onClick: () => goTo('monthend'), primary: true, shortcutKey: 'M' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'close',
            label: 'Close readiness',
            value: me ? `${me.readiness_pct}%` : null,
            loading: data.loading,
            unit: me ? me.period : undefined,
            badge: !me ? { text: 'UNAVAILABLE', tone: 'gray' } : me.readiness_pct >= 100 ? { text: 'READY', tone: 'green' } : { text: `${meBlockers} BLOCKING`, tone: 'red' },
            alert: !!me && me.readiness_pct < 100 && (me.status === 'open' || me.status === 'reopened'),
            caption: me ? `${PERIOD_LABEL[me.status] || humanize(me.status)} · target ${me.target_date}` : 'Month-end close unavailable',
            onOpen: () => goTo('monthend', meBlockers ? 'open' : undefined),
            title: 'Open the month-end close',
          },
          {
            key: 'payments',
            label: 'Payments to release',
            value: failed('Payment batches') ? null : m.awaiting.length,
            loading: data.loading,
            unit: `batches · ${cr(awaitingAmt)}`,
            badge: m.failingBatches.length ? { text: `${m.failingBatches.length} CHECKS FAIL`, tone: 'red' } : m.awaiting.length ? { text: 'RELEASE', tone: 'blue' } : { text: 'CLEAR', tone: 'green' },
            caption: failed('Payment batches') ? 'Payment batches unavailable' : m.awaiting.length ? `${m.awaiting.length - m.failingBatches.length} pass every check` : 'Nothing waiting for release',
            onOpen: () => goTo('payments', m.failingBatches.length ? 'blocked' : 'awaiting'),
            title: 'Open payment release',
          },
          {
            key: 'exceptions',
            label: 'Open exceptions',
            value: failed('Exceptions') ? null : m.openExc.length,
            loading: data.loading,
            unit: cr(m.openExc.reduce((a, x) => a + (x.amt || 0), 0)),
            badge: m.unassignedExc.length ? { text: `${m.unassignedExc.length} UNASSIGNED`, tone: 'red' } : m.openExc.length ? { text: 'OWNED', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            alert: m.unassignedExc.length > 0,
            caption: failed('Exceptions') ? 'Exceptions unavailable' : `${m.ctlOpen.length} control violation${m.ctlOpen.length === 1 ? '' : 's'} open`,
            captionTone: m.ctlCritical.length ? 'amber' : 'muted',
            onOpen: () => goTo('exceptions', m.unassignedExc.length ? 'unassigned' : 'open'),
            title: 'Open exception governance',
          },
          {
            key: 'bank',
            label: 'Reconciliations approved',
            value: failed('Reconciliations') ? null : `${m.reconOk.length}/${data.recons.length}`,
            loading: data.loading,
            unit: 'bank accounts',
            badge: m.unexplained.length ? { text: 'DIFFERENCES', tone: 'red' } : data.recons.length && m.reconOk.length === data.recons.length ? { text: 'ALL APPROVED', tone: 'green' } : { text: 'TO APPROVE', tone: 'amber' },
            caption: data.recons.length ? (m.frozen.length ? `${m.frozen.length} account${m.frozen.length === 1 ? '' : 's'} frozen` : 'No accounts frozen') : 'No reconciliations submitted',
            captionTone: m.frozen.length ? 'amber' : 'muted',
            onOpen: () => goTo('bank', m.reconOk.length < data.recons.length ? 'open' : undefined),
            title: 'Open bank control',
          },
        ]}
      />

      {!data.loading && data.failed.length > 0 && <HmsNotice tone="amber">Could not load: {data.failed.join(', ')}. Those figures show as “—” until the next refresh (Alt+R).</HmsNotice>}

      <View key={`${activeTab}-${initialFilter || ''}-${initialSelect || ''}`} data={data} notify={show} onNavigateTab={goTo} initialFilter={initialFilter} initialSelect={initialSelect} />
    </HmsShell>
  );
};

export default FinanceControllerWorkspace;
