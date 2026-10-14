// Billing · Admin workspace (HMS design bible, Section 19).
// Overview & analytics; decisions escalated to the admin; OPD revenue from the front desk, counters and roster;
// tariffs, packages and pricing rules; insurer and corporate contracts; revenue integrity, approval matrix, policies and
// the audit trail; reports, GST and period close. Every figure comes from the live billing API.
import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity, BarChart3, Stamp, Undo2, Stethoscope, Monitor, CalendarDays, Tags, Package, Calculator, ShieldCheck, Building2,
  ShieldAlert, Layers, Sliders, ScrollText, FileSpreadsheet, Receipt, Lock, Store, BedDouble, RefreshCw, TrendingUp,
} from 'lucide-react';
import { HmsShell, HmsNavGroup, HmsPageHeader, HmsKpiRow, HmsToast, useHmsToast, HmsBadge, HmsNotice, HMS } from '../../../components/hms';
import { useCurrency } from '../../../config/currency';
import { opdFlag } from '../supervisor/supervisorDeskData';
import { SupApprovalsView } from '../supervisor/SupApprovalsView';
import { SupRefundsView } from '../supervisor/SupRefundsView';
import { asSupervisorData, useAdminDeskData } from './adminDeskData';
import { AdmOverviewView } from './AdmOverviewView';
import { AdmAnalyticsView } from './AdmAnalyticsView';
import { AdmOpdView } from './AdmOpdView';
import { AdmCountersView } from './AdmCountersView';
import { AdmRosterView } from './AdmRosterView';
import { AdmTariffsView } from './AdmTariffsView';
import { AdmPackagesView } from './AdmPackagesView';
import { AdmPricingView } from './AdmPricingView';
import { AdmInsuranceView } from './AdmInsuranceView';
import { AdmCorporateView } from './AdmCorporateView';
import { AdmIntegrityView } from './AdmIntegrityView';
import { AdmMatrixView } from './AdmMatrixView';
import { AdmPoliciesView } from './AdmPoliciesView';
import { AdmAuditView } from './AdmAuditView';
import { AdmReportsView } from './AdmReportsView';
import { AdmTaxView } from './AdmTaxView';
import { AdmCloseView } from './AdmCloseView';

const TABS = ['overview', 'analytics', 'approvals', 'refunds', 'opd', 'counters', 'roster', 'tariffs', 'packages', 'pricing', 'insurance', 'corporate', 'integrity', 'matrix', 'policies', 'audit', 'reports', 'tax', 'close'] as const;
type Tab = (typeof TABS)[number];
// Old screen paths keep working
const PATH_TAB: Record<string, Tab> = {
  analytics: 'analytics', integrity: 'integrity', reports: 'reports', tax: 'tax', close: 'close', audit: 'audit', insurance: 'insurance', corporate: 'corporate',
  counters: 'counters', staff: 'roster', roster: 'roster', 'approval-matrix': 'matrix', matrix: 'matrix', policies: 'policies', tariffs: 'tariffs', packages: 'packages',
  pricing: 'pricing', approvals: 'approvals', refunds: 'refunds', opd: 'opd',
};
const NEW_TABS: Tab[] = ['counters', 'tariffs', 'packages', 'pricing', 'insurance', 'corporate'];

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
  cursor: 'pointer',
};

export const BillingAdminDeskWorkspace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { format } = useCurrency();
  const pathTab = PATH_TAB[pathname.replace(/^\/billing\/admin\/?/, '').split('/')[0]];
  const requested = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = requested && TABS.includes(requested) ? requested : pathTab || 'overview';
  const initialFilter = searchParams.get('filter') || undefined;
  const initialSelect = searchParams.get('select') || undefined;

  const data = useAdminDeskData();
  const { toast, show, clear } = useHmsToast();
  const [newSignal, setNewSignal] = useState(0);
  const [quoteSignal, setQuoteSignal] = useState(0);
  const [testSignal, setTestSignal] = useState(0);
  const [scanSignal, setScanSignal] = useState(0);

  const goTo = (tab: string, filter?: string, select?: string) => {
    if (tab === 'cashier') return navigate('/billing');
    if (tab === 'supervisor') return navigate('/billing/supervisor');
    if (tab === 'ipd') return navigate('/billing/ipd');
    const next: Record<string, string> = {};
    if (tab !== 'overview') next.tab = tab;
    if (filter) next.filter = filter;
    if (select) next.select = select;
    if (pathname !== '/billing/admin' && pathname !== '/billing/admin/') navigate({ pathname: '/billing/admin', search: new URLSearchParams(next).toString() });
    else setSearchParams(next);
  };

  const o = data.overview;

  const m = useMemo(() => {
    const escApprovals = (data.approvals?.pending || []).filter((r) => r.status === 'ESCALATED' && r.can_decide);
    const escRefunds = (data.refunds?.pending || []).filter((r) => r.status === 'ESCALATED' && r.can_decide);
    const tariffPending = data.tariffQueue?.pending.length ?? 0;
    const reopen = (data.period?.reopen_requests || []).filter((l) => l.reopen.pending).length;
    const leak = data.visits.filter((v) => opdFlag(v) === 'leak').length;
    const desk = data.visits.filter((v) => opdFlag(v) === 'desk').length;
    const ik = data.integrity?.kpis;
    return { escApprovals, escRefunds, tariffPending, reopen, leak, desk, ik, waiting: escApprovals.length + escRefunds.length + tariffPending + reopen };
  }, [data.approvals, data.refunds, data.tariffQueue, data.period, data.visits, data.integrity]);

  const pk = data.period?.kpis;
  const navGroups: HmsNavGroup[] = [
    {
      label: 'Overview',
      items: [
        { key: 'overview', label: 'Revenue overview', icon: Activity },
        { key: 'analytics', label: 'Revenue analytics', icon: BarChart3 },
      ],
    },
    {
      label: 'Decisions',
      items: [
        { key: 'approvals', label: 'Approval escalations', icon: Stamp, count: m.escApprovals.length || undefined, alert: m.escApprovals.length > 0 },
        { key: 'refunds', label: 'Refund escalations', icon: Undo2, count: m.escRefunds.length || undefined, alert: m.escRefunds.length > 0 },
      ],
    },
    {
      label: 'Operations',
      items: [
        { key: 'opd', label: 'OPD revenue', icon: Stethoscope, count: m.leak + m.desk || undefined, alert: m.leak > 0 },
        { key: 'counters', label: 'Counters & hardware', icon: Monitor, count: o ? o.active_counters_count : undefined },
        { key: 'roster', label: 'Staff roster', icon: CalendarDays },
      ],
    },
    {
      label: 'Pricing',
      items: [
        { key: 'tariffs', label: 'Tariff master', icon: Tags, count: m.tariffPending || undefined, alert: (data.tariffQueue?.kpis.above_alert || 0) > 0 },
        { key: 'packages', label: 'Health packages', icon: Package },
        { key: 'pricing', label: 'Pricing rules', icon: Calculator },
      ],
    },
    {
      label: 'Payers',
      items: [
        { key: 'insurance', label: 'Insurance & TPA', icon: ShieldCheck },
        { key: 'corporate', label: 'Corporate credit', icon: Building2 },
      ],
    },
    {
      label: 'Governance',
      items: [
        { key: 'integrity', label: 'Revenue integrity', icon: ShieldAlert, count: m.ik ? m.ik.open_leakage_items + m.ik.high_risk_signals || undefined : undefined, alert: (m.ik?.high_risk_signals || 0) > 0 },
        { key: 'matrix', label: 'Approval matrix', icon: Layers },
        { key: 'policies', label: 'Policy rules', icon: Sliders },
        { key: 'audit', label: 'Audit trail', icon: ScrollText },
      ],
    },
    {
      label: 'Finance close',
      items: [
        { key: 'reports', label: 'Financial reports', icon: FileSpreadsheet },
        { key: 'tax', label: 'Tax & GST', icon: Receipt },
        { key: 'close', label: 'Period close', icon: Lock, count: pk ? pk.days_not_closed + m.reopen || undefined : undefined, alert: m.reopen > 0 },
      ],
    },
    {
      label: 'Other desks',
      items: [
        { key: 'cashier', label: 'Cashier desk', icon: Store },
        { key: 'supervisor', label: 'Supervisor desk', icon: ShieldCheck },
        { key: 'ipd', label: 'IPD & TPA desk', icon: BedDouble },
      ],
    },
  ];

  const refresh = () => data.reload().then(() => show('Data refreshed'));
  const openEscalations = () => goTo(m.escApprovals.length || !m.escRefunds.length ? 'approvals' : 'refunds', 'escalated');
  const sectionNew = () => {
    if (NEW_TABS.includes(activeTab)) setNewSignal((n) => n + 1);
    else show('Nothing to add in this section', 'error');
  };
  const inSection = (tab: Tab, fn: () => void) => () => {
    if (activeTab === tab) fn();
    else goTo(tab);
  };

  const ach = o?.budget_achievement_pct ?? 0;
  const key = `${activeTab}-${initialFilter || ''}-${initialSelect || ''}`;
  const sup = asSupervisorData(data);

  return (
    <HmsShell
      navLabel="Billing admin navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={(t) => goTo(t)}
      department={{ name: 'Patient Billing', scope: o ? `${o.active_counters_count} of ${o.total_counters_count} counters open · OPD · IPD` : 'OPD · IPD · Pharmacy · Lab', roleBadge: 'ADMIN', roleName: 'Billing Admin', responsibility: 'Revenue, pricing & governance' }}
      roleLabel="Billing Admin"
      crumb="Billing · Admin"
      crumbChip={
        <span style={{ marginLeft: '8px' }}>
          <HmsBadge tone="green" dot>
            Live
          </HmsBadge>
        </span>
      }
      statusChips={
        <>
          <button type="button" style={CHIP} onClick={() => goTo('analytics')} title="Open revenue analytics">
            <TrendingUp size={16} />
            {o ? `MTD ${format(o.mtd_revenue)} · ${o.mtd_achievement_pct}%` : 'MTD —'}
          </button>
          <button type="button" style={CHIP} onClick={refresh} title="Refresh data (Alt+R)" aria-keyshortcuts="Alt+R">
            <RefreshCw size={16} />
            {data.lastSync ? `Synced ${data.lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Syncing…'}
          </button>
        </>
      }
      altShortcuts={{
        KeyA: openEscalations,
        KeyL: () => goTo('audit'),
        KeyC: () => goTo('close'),
        KeyR: refresh,
        KeyN: sectionNew,
        KeyQ: inSection('pricing', () => setQuoteSignal((n) => n + 1)),
        KeyT: inSection('matrix', () => setTestSignal((n) => n + 1)),
        KeyS: inSection('integrity', () => setScanSignal((n) => n + 1)),
      }}
      shortcutHelp={[
        ['Alt+A', 'Escalations waiting on you'],
        ['Alt+L', 'Audit trail'],
        ['Alt+C', 'Period close'],
        ['Alt+R', 'Refresh data'],
        ['Alt+N', 'Add in this section (counter, service, package, schedule, payer)'],
        ['Alt+Q', 'Quotation calculator (Pricing rules)'],
        ['Alt+T', 'Test an approval route (Approval matrix)'],
        ['Alt+S', 'Scan for leakage and risk (Revenue integrity)'],
      ]}
    >
      <HmsToast toast={toast} onClose={clear} />

      <HmsPageHeader
        title="Billing Admin Workspace"
        description="Revenue against target, decisions escalated to you, OPD front-desk revenue, prices and packages, payer contracts, integrity, audit and closing the books."
        actions={[
          { label: 'Audit trail', icon: ScrollText, onClick: () => goTo('audit'), shortcutKey: 'L' },
          { label: 'Close the books', icon: Lock, onClick: () => goTo('close'), shortcutKey: 'C' },
          { label: 'Escalations', icon: Stamp, onClick: openEscalations, primary: true, shortcutKey: 'A' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'revenue',
            label: 'Collected today',
            value: o ? format(o.revenue_today) : null,
            loading: data.loading,
            badge: !o ? (data.loading ? { text: 'LOADING', tone: 'gray' } : { text: 'UNAVAILABLE', tone: 'gray' }) : { text: `${ach}% OF TARGET`, tone: ach >= 100 ? 'green' : ach >= 60 ? 'blue' : 'amber' },
            caption: o ? `Target ${format(o.daily_budget)} · ${o.paid_invoices_count} of ${o.invoices_today_count} invoices paid` : data.loading ? 'Loading…' : 'Revenue overview unavailable',
            onOpen: () => goTo('overview'),
            title: 'Open the revenue overview',
          },
          {
            key: 'waiting',
            label: 'Waiting on you',
            value: data.loading && !data.approvals ? null : m.waiting,
            loading: data.loading,
            unit: 'decisions',
            badge: data.loading && !data.approvals ? { text: 'LOADING', tone: 'gray' } : m.escApprovals.length + m.escRefunds.length ? { text: `${m.escApprovals.length + m.escRefunds.length} ESCALATED`, tone: 'red' } : m.waiting ? { text: 'REVIEW', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            alert: m.escApprovals.length + m.escRefunds.length > 0,
            caption: `${m.escApprovals.length + m.escRefunds.length} escalated · ${m.tariffPending} tariff change${m.tariffPending === 1 ? '' : 's'} · ${m.reopen} reopen`,
            onOpen: () => (m.escApprovals.length + m.escRefunds.length ? openEscalations() : m.tariffPending ? goTo('tariffs', 'pending') : m.reopen ? goTo('close', 'reopen') : openEscalations()),
            title: 'Open what is waiting on you',
          },
          {
            key: 'risk',
            label: 'Revenue at risk',
            value: o ? format(o.leakage_at_risk_amount) : null,
            loading: data.loading,
            badge: !o ? (data.loading ? { text: 'LOADING', tone: 'gray' } : { text: 'UNAVAILABLE', tone: 'gray' }) : m.ik?.high_risk_signals ? { text: `${m.ik.high_risk_signals} HIGH RISK`, tone: 'red' } : o.leakage_at_risk_amount > 0 ? { text: 'RECOVER', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            caption: o ? `Unbilled + overdue${m.ik ? ` · ${format(m.ik.recovered_mtd)} recovered this month` : ''}${m.leak ? ` · ${m.leak} OPD unpaid` : ''}` : data.loading ? 'Loading…' : 'Unavailable',
            captionTone: m.leak ? 'amber' : 'muted',
            onOpen: () => goTo('integrity'),
            title: 'Open revenue integrity',
          },
          {
            key: 'close',
            label: 'Days not closed',
            value: pk ? pk.days_not_closed : null,
            loading: data.loading,
            unit: 'of the last 14',
            badge: !pk ? (data.loading ? { text: 'LOADING', tone: 'gray' } : { text: 'UNAVAILABLE', tone: 'gray' }) : pk.days_not_closed ? { text: 'CLOSE BOOKS', tone: 'amber' } : { text: 'UP TO DATE', tone: 'green' },
            caption: pk ? `Last month closed: ${pk.last_month_closed || 'none'} · ${pk.shifts_open} shift${pk.shifts_open === 1 ? '' : 's'} open` : data.loading ? 'Loading…' : 'Period close unavailable',
            captionTone: pk?.days_not_closed ? 'amber' : 'muted',
            onOpen: () => goTo('close', 'days'),
            title: 'Open period close',
          },
        ]}
      />

      {!data.loading && data.failed.length > 0 && <HmsNotice tone="amber">Could not load: {data.failed.join(', ')}. Those figures show as “—” until the next refresh (Alt+R).</HmsNotice>}

      {activeTab === 'overview' && <AdmOverviewView data={data} goTo={goTo} />}
      {activeTab === 'analytics' && <AdmAnalyticsView key={key} initialSelect={initialSelect} />}
      {activeTab === 'approvals' && <SupApprovalsView key={key} data={sup} notify={show} initialFilter={initialFilter} initialSelect={initialSelect} audience="admin" />}
      {activeTab === 'refunds' && <SupRefundsView key={key} data={sup} notify={show} initialFilter={initialFilter} initialSelect={initialSelect} audience="admin" />}
      {activeTab === 'opd' && <AdmOpdView key={key} data={data} initialFilter={initialFilter} initialSelect={initialSelect} />}
      {activeTab === 'counters' && <AdmCountersView key={key} notify={show} initialFilter={initialFilter} initialSelect={initialSelect} newSignal={newSignal} />}
      {activeTab === 'roster' && <AdmRosterView key={key} notify={show} initialSelect={initialSelect} />}
      {activeTab === 'tariffs' && <AdmTariffsView key={key} data={data} notify={show} initialFilter={initialFilter} initialSelect={initialSelect} newSignal={newSignal} />}
      {activeTab === 'packages' && <AdmPackagesView key={key} notify={show} initialFilter={initialFilter} initialSelect={initialSelect} newSignal={newSignal} />}
      {activeTab === 'pricing' && <AdmPricingView key={key} notify={show} initialFilter={initialFilter} newSignal={newSignal} quoteSignal={quoteSignal} />}
      {activeTab === 'insurance' && <AdmInsuranceView key={key} notify={show} onOpenIpd={() => goTo('ipd')} initialFilter={initialFilter} initialSelect={initialSelect} newSignal={newSignal} />}
      {activeTab === 'corporate' && <AdmCorporateView key={key} notify={show} initialFilter={initialFilter} initialSelect={initialSelect} newSignal={newSignal} />}
      {activeTab === 'integrity' && <AdmIntegrityView key={key} data={data} notify={show} initialFilter={initialFilter} initialSelect={initialSelect} scanSignal={scanSignal} />}
      {activeTab === 'matrix' && <AdmMatrixView key={key} notify={show} initialSelect={initialSelect} testSignal={testSignal} />}
      {activeTab === 'policies' && <AdmPoliciesView key={key} notify={show} initialFilter={initialFilter} initialSelect={initialSelect} />}
      {activeTab === 'audit' && <AdmAuditView key={key} notify={show} initialFilter={initialFilter} />}
      {activeTab === 'reports' && <AdmReportsView key={key} notify={show} initialSelect={initialSelect} />}
      {activeTab === 'tax' && <AdmTaxView key={key} notify={show} initialFilter={initialFilter} />}
      {activeTab === 'close' && <AdmCloseView key={key} data={data} notify={show} initialFilter={initialFilter} />}
    </HmsShell>
  );
};

export default BillingAdminDeskWorkspace;
