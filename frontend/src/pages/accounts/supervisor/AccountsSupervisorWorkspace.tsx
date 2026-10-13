// Accounts Supervisor workspace — HMS design bible Section 19 (reference: Lab Admin, Pharmacy Admin).
// First checker: reviews what the Accounts Executives submit, oversees collections and GST,
// runs the daily close and forwards escalations to the Accounts Manager.
import React, { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  BookCheck,
  ReceiptText,
  WalletCards,
  Landmark,
  HandCoins,
  FileCheck,
  FileSearch,
  CalendarCheck,
  Users,
  TriangleAlert,
  ScrollText,
  Tags,
  Scale,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { HmsShell, HmsNavGroup, HmsPageHeader, HmsKpiRow, HmsToast, useHmsToast, HmsBadge, HmsNotice, HMS } from '../../../components/hms';
import { WorkloadResponse } from '../../../services/accountsService';
import type { RoleViewKey } from '../components/AccountsStickyAppBar';
import { humanize, inr } from '../executive/executiveData';
import { useSupervisorData, isSupervisorPending, isOverdue, criticalFlags } from './supervisorData';
import type { SupervisorViewProps } from './supervisorHelpers';
import { SupervisorApprovalsView } from './SupervisorApprovalsView';
import {
  SupervisorReconView,
  SupervisorCollectionsView,
  SupervisorGstView,
  SupervisorDocsView,
  SupervisorCloseView,
  SupervisorTeamView,
  SupervisorEscalationsView,
  SupervisorAuditView,
} from './SupervisorOtherViews';

export interface AccountsSupervisorWorkspaceProps {
  activeRoleView?: RoleViewKey;
  onSelectRole?: (role: RoleViewKey) => void;
  workload?: WorkloadResponse['queues'] | null;
  currentTime?: Date;
  onOpenMaster?: (master: 'coa' | 'dofa' | 'audit') => void;
}

const TABS = ['overview', 'journals', 'bills', 'expenses', 'recon', 'collections', 'gst', 'docs', 'close', 'team', 'escalations', 'audit'] as const;
type Tab = (typeof TABS)[number];
const MASTERS = ['coa', 'dofa', 'auditchain'] as const;

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

export const AccountsSupervisorWorkspace: React.FC<AccountsSupervisorWorkspaceProps> = ({ onOpenMaster }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const requested = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = requested && (TABS as readonly string[]).includes(requested) ? requested : 'overview';
  const initialFilter = searchParams.get('filter') || undefined;
  const initialSelect = searchParams.get('select') || undefined;

  const data = useSupervisorData();
  const { toast, show, clear } = useHmsToast();

  // Masters open as route modals in the department container; keep the current section in the URL
  const openMaster = (m: 'coa' | 'dofa' | 'audit') => {
    if (onOpenMaster) navigate({ pathname: `/accounts/${m}`, search: location.search });
  };

  const goTo = (tab: string, filter?: string, select?: string) => {
    if ((MASTERS as readonly string[]).includes(tab)) return openMaster(tab === 'auditchain' ? 'audit' : (tab as 'coa' | 'dofa'));
    const next: Record<string, string> = {};
    if (tab !== 'overview') next.tab = tab;
    if (filter) next.filter = filter;
    if (select) next.select = select;
    setSearchParams(next);
  };

  // Live figures — every number is derived from the accounts API, never typed in
  const m = useMemo(() => {
    const pending = data.requests.filter(isSupervisorPending);
    const byType = (t: string) => pending.filter((r) => r.document_type === t);
    const overdue = pending.filter(isOverdue);
    const critical = pending.filter((r) => criticalFlags(r).length > 0);
    const matches = data.matches.filter((x) => x.status === 'proposed');
    const writeOffs = data.writeOffs.filter((w) => w.status === 'pending');
    const escalatedCases = data.cases.filter((c) => c.stage === 'escalated');
    const gst = data.gst.filter((g) => g.status === 'submitted');
    const docs = data.documents.filter((d) => !d.validated && !d.rejection_reason);
    const openEsc = data.escalations.filter((e) => e.status === 'open');
    const withManager = data.escalations.filter((e) => e.status === 'with_manager');
    const teamErrors = data.team.filter((t) => t.errors > 0);
    const pendingValue = pending.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return { pending, journals: byType('journal'), bills: byType('vendor_bill'), expenses: byType('expense'), overdue, critical, matches, writeOffs, escalatedCases, gst, docs, openEsc, withManager, teamErrors, pendingValue };
  }, [data]);

  const failed = (label: string) => data.failed.includes(label);
  const close = data.close;
  const closeBlockers = close?.blocker_count ?? 0;

  const navGroups: HmsNavGroup[] = [
    { label: 'Overview', items: [{ key: 'overview', label: 'Review queue', icon: LayoutDashboard, count: m.pending.length, alert: m.critical.length > 0 }] },
    {
      label: 'Approvals',
      items: [
        { key: 'journals', label: 'Journal approvals', icon: BookCheck, count: m.journals.length },
        { key: 'bills', label: 'Vendor bill approvals', icon: ReceiptText, count: m.bills.length, alert: m.bills.some((r) => criticalFlags(r).length > 0) },
        { key: 'expenses', label: 'Expense approvals', icon: WalletCards, count: m.expenses.length, alert: m.expenses.some((r) => criticalFlags(r).length > 0) },
        { key: 'recon', label: 'Reconciliation reviews', icon: Landmark, count: m.matches.length },
      ],
    },
    { label: 'Receivables', items: [{ key: 'collections', label: 'Collection oversight', icon: HandCoins, count: m.writeOffs.length + m.escalatedCases.length, alert: m.escalatedCases.length > 0 }] },
    {
      label: 'Compliance',
      items: [
        { key: 'gst', label: 'GST review', icon: FileCheck, count: m.gst.length },
        { key: 'docs', label: 'Document validation', icon: FileSearch, count: m.docs.length },
      ],
    },
    { label: 'Operations', items: [{ key: 'close', label: 'Daily close', icon: CalendarCheck, count: closeBlockers, alert: closeBlockers > 0 }] },
    {
      label: 'Tracking',
      items: [
        { key: 'team', label: 'Team activity', icon: Users, count: m.teamErrors.length },
        { key: 'escalations', label: 'Escalations', icon: TriangleAlert, count: m.openEsc.length, alert: m.openEsc.length > 0 },
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

  const viewProps: SupervisorViewProps = { data, notify: show, onNavigateTab: goTo, newSignal: 0, initialFilter, initialSelect };
  const viewKey = `${activeTab}-${initialFilter || ''}-${initialSelect || ''}`;

  // Server-side alerts (overdue reviews, duplicate risk …) shown above the review queue
  const alerts = data.dashboard?.alerts || [];
  const alertBox = alerts.length ? (
    <div style={{ padding: '0 20px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {alerts.slice(0, 3).map((a, i) => (
        <HmsNotice key={i} tone={a.severity === 'critical' ? 'red' : a.severity === 'warning' ? 'amber' : 'blue'}>
          <strong>{a.t}</strong>
          {a.d ? ` — ${a.d}` : ''}
        </HmsNotice>
      ))}
    </div>
  ) : undefined;

  const renderView = () => {
    switch (activeTab) {
      case 'overview':
        return <SupervisorApprovalsView key={viewKey} {...viewProps} scope="all" listId="sup-queue" title="Review queue" description="Everything executives submitted that waits on you, oldest first." leftExtra={alertBox} />;
      case 'journals':
        return <SupervisorApprovalsView key={viewKey} {...viewProps} scope="journal" listId="sup-journals" title="Journal approvals" description="Journals from the executives, before they reach the Accounts Manager." />;
      case 'bills':
        return <SupervisorApprovalsView key={viewKey} {...viewProps} scope="vendor_bill" listId="sup-bills" title="Vendor bill approvals" description="PO · GRN · invoice match checked before bills are scheduled for payment." />;
      case 'expenses':
        return <SupervisorApprovalsView key={viewKey} {...viewProps} scope="expense" listId="sup-expenses" title="Expense approvals" description="Department expense requests checked against budget and evidence." />;
      case 'recon':
        return <SupervisorReconView key={viewKey} {...viewProps} />;
      case 'collections':
        return <SupervisorCollectionsView key={viewKey} {...viewProps} />;
      case 'gst':
        return <SupervisorGstView key={viewKey} {...viewProps} />;
      case 'docs':
        return <SupervisorDocsView key={viewKey} {...viewProps} />;
      case 'close':
        return <SupervisorCloseView key={viewKey} {...viewProps} />;
      case 'team':
        return <SupervisorTeamView key={viewKey} {...viewProps} />;
      case 'escalations':
        return <SupervisorEscalationsView key={viewKey} {...viewProps} />;
      case 'audit':
        return <SupervisorAuditView key={viewKey} {...viewProps} />;
    }
  };

  return (
    <HmsShell
      navLabel="Accounts supervisor navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={goTo}
      department={{ name: 'Accounts & Finance', scope: 'Central financial control', roleBadge: 'CHECKER', roleName: 'Accounts Supervisor', responsibility: 'First checker · Level 2' }}
      roleLabel="Accounts Supervisor"
      crumb="Accounts & Finance · Supervisor"
      crumbChip={
        <span style={{ marginLeft: '8px' }}>
          <HmsBadge tone="green" dot>
            Live
          </HmsBadge>
        </span>
      }
      statusChips={
        <>
          <button type="button" style={{ ...CHIP, cursor: 'pointer' }} onClick={() => data.reload().then(() => show('Data refreshed'))} title="Refresh data (Alt+R)" aria-keyshortcuts="Alt+R">
            <RefreshCw size={16} />
            {data.lastSync ? `Synced ${data.lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Syncing…'}
          </button>
        </>
      }
      altShortcuts={{
        KeyC: () => goTo('close'),
        KeyS: () => goTo('escalations', 'open'),
        KeyR: () => {
          data.reload().then(() => show('Data refreshed'));
        },
      }}
      shortcutHelp={[
        ['Alt+C  ·  Alt+S', 'Daily close · Escalations to forward'],
        ['Alt+R', 'Refresh data'],
      ]}
    >
      <HmsToast toast={toast} onClose={clear} />

      <HmsPageHeader
        title="Accounts Supervisor Workspace"
        description="Review what the executives submit, oversee collections and GST, forward escalations to the Accounts Manager and close the day."
        actions={[
          { label: 'Escalations', icon: TriangleAlert, onClick: () => goTo('escalations', 'open'), shortcutKey: 'S' },
          { label: 'Daily close', icon: CalendarCheck, onClick: () => goTo('close'), primary: true, shortcutKey: 'C' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'pending',
            label: 'Waiting for review',
            value: failed('Approval queue') ? null : m.pending.length,
            loading: data.loading,
            unit: 'submissions',
            badge: m.critical.length ? { text: `${m.critical.length} CRITICAL`, tone: 'red' } : m.pending.length ? { text: 'TO REVIEW', tone: 'blue' } : { text: 'CLEAR', tone: 'green' },
            caption: failed('Approval queue') ? 'Approval queue unavailable' : `${inr(m.pendingValue)} in the queue`,
            onOpen: () => goTo('overview', m.critical.length ? 'critical' : 'pending'),
            title: 'Open the review queue',
          },
          {
            key: 'overdue',
            label: 'Over 24 hours',
            value: failed('Approval queue') ? null : m.overdue.length,
            loading: data.loading,
            unit: 'overdue reviews',
            badge: m.overdue.length ? { text: 'OVERDUE', tone: 'red' } : { text: 'ON TIME', tone: 'green' },
            alert: m.overdue.length > 0,
            caption: m.overdue.length ? 'Oldest submissions waiting on you' : 'Every review inside 24 hours',
            captionTone: m.overdue.length ? 'amber' : 'muted',
            onOpen: () => goTo('overview', 'overdue'),
            title: 'Open overdue reviews',
          },
          {
            key: 'escalations',
            label: 'Escalations to forward',
            value: failed('Escalations') ? null : m.openEsc.length,
            loading: data.loading,
            unit: 'open',
            badge: m.openEsc.length ? { text: 'FORWARD', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            caption: failed('Escalations') ? 'Escalations unavailable' : `${m.withManager.length} with the Accounts Manager`,
            onOpen: () => goTo('escalations', 'open'),
            title: 'Open escalations',
          },
          {
            key: 'close',
            label: 'Daily close',
            value: close ? humanize(close.status) : null,
            loading: data.loading,
            unit: close ? `${closeBlockers} blocker${closeBlockers === 1 ? '' : 's'}` : undefined,
            badge: !close ? { text: 'UNAVAILABLE', tone: 'gray' } : close.status === 'locked' ? { text: 'LOCKED', tone: 'gray' } : closeBlockers ? { text: 'BLOCKED', tone: 'red' } : { text: 'READY', tone: 'green' },
            alert: closeBlockers > 0,
            caption: close ? (close.date_formatted || close.business_date) : 'Daily close unavailable',
            onOpen: () => goTo('close', closeBlockers ? 'open' : undefined),
            title: 'Open the daily close',
          },
        ]}
      />

      {!data.loading && data.failed.length > 0 && <HmsNotice tone="amber">Could not load: {data.failed.join(', ')}. Those figures show as “—” until the next refresh (Alt+R).</HmsNotice>}

      {renderView()}
    </HmsShell>
  );
};

export default AccountsSupervisorWorkspace;
