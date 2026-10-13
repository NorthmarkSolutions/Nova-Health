// Accounts Executive workspace — HMS design bible Section 19 (reference: Lab Admin, Pharmacy Admin).
// Maker role: validates department events, raises journals, bills and expenses, reconciles the bank
// and follows up receivables. Everything submitted goes to the Accounts Supervisor.
import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  NotebookTabs,
  ReceiptText,
  Landmark,
  WalletCards,
  HandCoins,
  PhoneCall,
  FileCheck,
  Paperclip,
  Send,
  History,
  Tags,
  Scale,
  ShieldCheck,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { HmsShell, HmsNavGroup, HmsPageHeader, HmsKpiRow, HmsToast, useHmsToast, HmsBadge, HmsNotice, HMS } from '../../../components/hms';
import { WorkloadResponse } from '../../../services/accountsService';
import type { RoleViewKey } from '../components/AccountsStickyAppBar';
import { useExecutiveData, inr, isBankOpen, isDuplicateRisk, isMakerOpen, isRequestOpen } from './executiveData';
import type { ExecutiveDialog, ExecutiveViewProps } from './executiveHelpers';
import { buildWorkQueue } from './executiveQueue';
import { ExecutiveOverviewView } from './ExecutiveOverviewView';
import { ExecutiveEventsView, ExecutiveJournalsView, ExecutiveBillsView, ExecutiveBankView, ExecutiveExpensesView } from './ExecutiveLedgerViews';
import { ExecutiveReceivablesView, ExecutiveCollectionsView } from './ExecutiveReceivablesViews';
import { ExecutiveGstView, ExecutiveDocumentsView, ExecutiveRequestsView, ExecutiveActivityView } from './ExecutiveGovernanceViews';
import { JournalDialog, BillDialog, ExpenseDialog } from './ExecutiveForms';

export interface AccountsExecutiveWorkspaceProps {
  activeRoleView?: RoleViewKey;
  onSelectRole?: (role: RoleViewKey) => void;
  workload?: WorkloadResponse['queues'] | null;
  currentTime?: Date;
  onOpenMaster?: (master: 'coa' | 'dofa' | 'audit') => void;
}

const TABS = ['overview', 'events', 'journals', 'bills', 'bank', 'expenses', 'receivables', 'collections', 'gst', 'docs', 'requests', 'activity'] as const;
type Tab = (typeof TABS)[number];
const MASTERS = ['coa', 'dofa', 'audit'] as const;
type Master = (typeof MASTERS)[number];

const VIEWS: Record<Exclude<Tab, 'overview'>, React.FC<ExecutiveViewProps>> = {
  events: ExecutiveEventsView,
  journals: ExecutiveJournalsView,
  bills: ExecutiveBillsView,
  bank: ExecutiveBankView,
  expenses: ExecutiveExpensesView,
  receivables: ExecutiveReceivablesView,
  collections: ExecutiveCollectionsView,
  gst: ExecutiveGstView,
  docs: ExecutiveDocumentsView,
  requests: ExecutiveRequestsView,
  activity: ExecutiveActivityView,
};

/** Alt+N on these sections opens the section's own "new" form. */
const NEW_DIALOG: Partial<Record<Tab, Exclude<ExecutiveDialog, null>>> = { journals: 'journal', bills: 'bill', expenses: 'expense' };

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

export const AccountsExecutiveWorkspace: React.FC<AccountsExecutiveWorkspaceProps> = ({ onOpenMaster }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const requested = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = requested && (TABS as readonly string[]).includes(requested) ? requested : 'overview';
  const initialFilter = searchParams.get('filter') || undefined;
  const initialSelect = searchParams.get('select') || undefined;

  const data = useExecutiveData();
  const { toast, show, clear } = useHmsToast();
  const [dialog, setDialog] = useState<ExecutiveDialog>(null);
  const [newSignal, setNewSignal] = useState<Record<string, number>>({});

  const goTo = (tab: string, filter?: string, select?: string) => {
    if ((MASTERS as readonly string[]).includes(tab)) return openMaster(tab as Master);
    const next: Record<string, string> = {};
    if (tab !== 'overview') next.tab = tab;
    if (filter) next.filter = filter;
    if (select) next.select = select;
    setSearchParams(next);
  };

  // Masters open as route modals in the department container; keep the current section in the URL
  const openMaster = (m: Master) => {
    if (onOpenMaster) navigate({ pathname: `/accounts/${m}`, search: location.search });
  };

  // Live figures — every number below is derived from the accounts API, never typed in
  const m = useMemo(() => {
    const pendingEvents = data.events.filter((e) => e.status === 'pending_validation' || e.status === 'received');
    const openJournals = data.journals.filter((j) => isMakerOpen(j.status));
    const openBills = data.bills.filter((b) => isMakerOpen(b.status));
    const dupBills = openBills.filter(isDuplicateRisk);
    const openBank = data.bank.filter(isBankOpen);
    const openExpenses = data.expenses.filter((e) => isMakerOpen(e.status));
    const overdue = data.receivables.filter((r) => r.aging_bucket === '90_plus' && r.status !== 'settled' && r.status !== 'written_off');
    const dueCases = data.cases.filter((c) => c.stage === 'due_today' || c.stage === 'followup_required');
    const draftGst = data.gst.filter((g) => g.status === 'draft');
    const docsPending = data.documents.filter((d) => !d.validated && !d.rejection_reason);
    const returned = data.requests.filter((r) => r.status === 'returned');
    const inApproval = data.requests.filter(isRequestOpen);
    const queue = buildWorkQueue(data);
    return { pendingEvents, openJournals, openBills, dupBills, openBank, openExpenses, overdue, dueCases, draftGst, docsPending, returned, inApproval, queue };
  }, [data]);

  const failed = (label: string) => data.failed.includes(label);

  const navGroups: HmsNavGroup[] = [
    { label: 'Overview', items: [{ key: 'overview', label: "Today's work", icon: LayoutDashboard, count: m.queue.length, alert: m.dupBills.length + m.overdue.length > 0 }] },
    {
      label: 'Daily operations',
      items: [
        { key: 'events', label: 'Event inbox', icon: Inbox, count: m.pendingEvents.length },
        { key: 'journals', label: 'Journal entries', icon: NotebookTabs, count: m.openJournals.length },
        { key: 'bills', label: 'Vendor bills', icon: ReceiptText, count: m.openBills.length, alert: m.dupBills.length > 0 },
        { key: 'bank', label: 'Bank reconciliation', icon: Landmark, count: m.openBank.length },
        { key: 'expenses', label: 'Expense requests', icon: WalletCards, count: m.openExpenses.length },
      ],
    },
    {
      label: 'Receivables',
      items: [
        { key: 'receivables', label: 'Receivables', icon: HandCoins, count: m.overdue.length, alert: m.overdue.length > 0 },
        { key: 'collections', label: 'Collection pipeline', icon: PhoneCall, count: m.dueCases.length },
      ],
    },
    {
      label: 'Compliance',
      items: [
        { key: 'gst', label: 'GST preparation', icon: FileCheck, count: m.draftGst.length },
        { key: 'docs', label: 'Supporting documents', icon: Paperclip, count: m.docsPending.length },
      ],
    },
    {
      label: 'Trace',
      items: [
        { key: 'requests', label: 'My requests', icon: Send, count: m.returned.length, alert: m.returned.length > 0 },
        { key: 'activity', label: 'Activity log', icon: History, alert: data.integrity ? !data.integrity.valid : false },
      ],
    },
    {
      label: 'Masters',
      items: [
        { key: 'coa', label: 'Chart of accounts', icon: Tags },
        { key: 'dofa', label: 'DoFA matrix', icon: Scale },
        { key: 'audit', label: 'Audit hash chain', icon: ShieldCheck },
      ],
    },
  ];

  const sum = (rows: { amount?: string | number; outstanding_amount?: string | number }[], key: 'amount' | 'outstanding_amount') => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
  const dash = <T,>(label: string, v: T) => (failed(label) ? null : v);

  const viewProps: ExecutiveViewProps = {
    data,
    notify: show,
    onNavigateTab: goTo,
    openDialog: setDialog,
    onOpenMaster: onOpenMaster ? openMaster : undefined,
    newSignal: newSignal[activeTab] || 0,
    initialFilter,
    initialSelect,
  };
  const View = activeTab === 'overview' ? null : VIEWS[activeTab];

  return (
    <HmsShell
      navLabel="Accounts executive navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={goTo}
      department={{ name: 'Accounts & Finance', scope: 'Central financial control', roleBadge: 'MAKER', roleName: 'Accounts Executive', responsibility: 'Maker · Level 1' }}
      roleLabel="Accounts Executive"
      crumb="Accounts & Finance · Executive"
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
        KeyN: () => {
          const d = NEW_DIALOG[activeTab];
          if (d) setDialog(d);
          else if (activeTab === 'receivables') setNewSignal((s) => ({ ...s, receivables: (s.receivables || 0) + 1 }));
        },
        KeyJ: () => setDialog('journal'),
        KeyB: () => setDialog('bill'),
        KeyX: () => setDialog('expense'),
        KeyR: () => {
          data.reload().then(() => show('Data refreshed'));
        },
      }}
      shortcutHelp={[
        ['Alt+N', 'New journal · record bill · raise expense · log follow-up (on those sections)'],
        ['Alt+J  ·  Alt+B  ·  Alt+X', 'New journal · Record vendor bill · Raise expense'],
        ['Alt+R', 'Refresh data'],
      ]}
    >
      <HmsToast toast={toast} onClose={clear} />

      <HmsPageHeader
        title="Accounts Executive Workspace"
        description="Validate department events, raise journals, vendor bills and expenses, reconcile the bank and follow up receivables. Everything you submit goes to the Accounts Supervisor."
        actions={[
          { label: 'Record vendor bill', icon: ReceiptText, onClick: () => setDialog('bill'), shortcutKey: 'B' },
          { label: 'Raise expense', icon: WalletCards, onClick: () => setDialog('expense'), shortcutKey: 'X' },
          { label: 'New journal', icon: Plus, onClick: () => setDialog('journal'), primary: true, shortcutKey: 'J' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'events',
            label: 'Events to validate',
            value: dash('Event inbox', m.pendingEvents.length),
            loading: data.loading,
            unit: 'from departments',
            badge: m.pendingEvents.length ? { text: 'TO VALIDATE', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            caption: failed('Event inbox') ? 'Event inbox unavailable' : m.pendingEvents.length ? `${inr(sum(m.pendingEvents, 'amount'))} waiting for posting` : 'Nothing waiting for posting',
            onOpen: () => goTo('events', 'pending'),
            title: 'Open the event inbox',
          },
          {
            key: 'bank',
            label: 'Bank lines to match',
            value: dash('Bank lines', m.openBank.length),
            loading: data.loading,
            unit: 'statement lines',
            badge: m.openBank.length ? { text: 'UNMATCHED', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            caption: failed('Bank lines') ? 'Bank lines unavailable' : m.openBank.length ? `${inr(sum(m.openBank, 'amount'))} not yet reconciled` : 'Statement fully reconciled',
            onOpen: () => goTo('bank', 'open'),
            title: 'Open bank reconciliation',
          },
          {
            key: 'returned',
            label: 'Returned to me',
            value: dash('My requests', m.returned.length),
            loading: data.loading,
            unit: 'to correct',
            badge: m.returned.length ? { text: 'ACTION', tone: 'red' } : { text: 'CLEAR', tone: 'green' },
            alert: m.returned.length > 0,
            caption: failed('My requests') ? 'Requests unavailable' : `${m.inApproval.length} still in approval`,
            captionTone: m.returned.length ? 'amber' : 'muted',
            onOpen: () => goTo('requests', m.returned.length ? 'returned' : 'open'),
            title: 'Open my requests',
          },
          {
            key: 'overdue',
            label: 'Overdue 90+ days',
            value: dash('Receivables', inr(sum(m.overdue, 'outstanding_amount'))),
            loading: data.loading,
            unit: `${m.overdue.length} account${m.overdue.length === 1 ? '' : 's'}`,
            badge: m.overdue.length ? { text: 'FOLLOW UP', tone: 'red' } : { text: 'CLEAR', tone: 'green' },
            alert: m.overdue.length > 0,
            caption: failed('Receivables') ? 'Receivables unavailable' : `${m.dueCases.length} collection case${m.dueCases.length === 1 ? '' : 's'} due for follow-up`,
            captionTone: m.dueCases.length ? 'amber' : 'muted',
            onOpen: () => goTo('receivables', '90_plus'),
            title: 'Open overdue receivables',
          },
        ]}
      />

      {!data.loading && data.failed.length > 0 && (
        <HmsNotice tone="amber">
          Could not load: {data.failed.join(', ')}. Those figures show as “—” until the next refresh (Alt+R).
        </HmsNotice>
      )}

      {View ? (
        <View key={`${activeTab}-${initialFilter || ''}-${initialSelect || ''}`} {...viewProps} />
      ) : (
        <ExecutiveOverviewView key={`overview-${initialFilter || ''}`} {...viewProps} onOpenItem={(tab, filter, id) => goTo(tab, filter, id)} />
      )}

      {dialog === 'journal' && <JournalDialog data={data} notify={show} onClose={() => setDialog(null)} />}
      {dialog === 'bill' && <BillDialog data={data} notify={show} onClose={() => setDialog(null)} />}
      {dialog === 'expense' && <ExpenseDialog data={data} notify={show} onClose={() => setDialog(null)} />}
    </HmsShell>
  );
};

export default AccountsExecutiveWorkspace;
