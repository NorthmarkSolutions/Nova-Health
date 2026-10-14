// Billing · Supervisor workspace (HMS design bible, Section 19).
// Decisions (approvals, refunds), cash control (counters, closings & vault), revenue watch (OPD reconciliation with the
// reception front desk, patient dues) and governance (audit stream, shift reports). Every figure comes from the live billing API.
import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Stamp, Undo2, Monitor, Scale, Stethoscope, Wallet, ShieldAlert, FileText, Store, BedDouble, Activity, RefreshCw, Vault, HandCoins } from 'lucide-react';
import { HmsShell, HmsNavGroup, HmsPageHeader, HmsKpiRow, HmsToast, useHmsToast, HmsBadge, HmsNotice, HmsButton, HMS } from '../../../components/hms';
import { billingService, SupervisorAlert } from '../../../services/billingService';
import { useAuth } from '../../../context/AuthContext';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { useSupervisorDeskData, dueAgeDays, opdFlag, visitAmount } from './supervisorDeskData';
import { SupApprovalsView } from './SupApprovalsView';
import { SupRefundsView } from './SupRefundsView';
import { SupCountersView } from './SupCountersView';
import { SupClosingsView } from './SupClosingsView';
import { SupOpdView } from './SupOpdView';
import { SupDuesView } from './SupDuesView';
import { SupAuditView } from './SupAuditView';
import { SupReportsView } from './SupReportsView';

const TABS = ['approvals', 'refunds', 'counters', 'closings', 'opd', 'dues', 'audit', 'reports'] as const;
type Tab = (typeof TABS)[number];
// Old screen paths keep working
const PATH_TAB: Record<string, Tab> = { approvals: 'approvals', refunds: 'refunds', counters: 'counters', closing: 'closings', closings: 'closings', opd: 'opd', dues: 'dues', audit: 'audit', reports: 'reports' };
const ADMIN_ROLES = ['BILLING_ADMIN', 'DEPARTMENT_ADMIN', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'];

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

export const SupervisorDeskWorkspace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { format } = useCurrency();
  const pathTab = PATH_TAB[pathname.replace(/^\/billing\/supervisor\/?/, '').split('/')[0]];
  const requested = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = requested && TABS.includes(requested) ? requested : pathTab || 'approvals';
  const initialFilter = searchParams.get('filter') || undefined;
  const initialSelect = searchParams.get('select') || searchParams.get('id') || undefined;

  const data = useSupervisorDeskData();
  const { toast, show, clear } = useHmsToast();
  const [vaultRequest, setVaultRequest] = useState(false);
  const [receiveRequest, setReceiveRequest] = useState(false);

  const goTo = (tab: string, filter?: string, select?: string) => {
    if (tab === 'cashier') return navigate('/billing');
    if (tab === 'ipd') return navigate('/billing/ipd');
    if (tab === 'admin') return navigate('/billing/admin');
    const next: Record<string, string> = {};
    if (tab !== 'approvals') next.tab = tab;
    if (filter) next.filter = filter;
    if (select) next.select = select;
    if (pathname !== '/billing/supervisor' && pathname !== '/billing/supervisor/') navigate({ pathname: '/billing/supervisor', search: new URLSearchParams(next).toString() });
    else setSearchParams(next);
  };

  const dk = data.dashboard?.kpis;
  const ak = data.approvals?.kpis;
  const rk = data.refunds?.kpis;
  const failed = (label: string) => data.failed.includes(label);
  // Before the first load nothing is "clear" or "unavailable" yet
  const pending = { text: 'LOADING', tone: 'gray' as const };
  const missing = (what: string) => (data.loading ? 'Loading…' : `${what} unavailable`);

  // Live figures — derived from the one data hook
  const m = useMemo(() => {
    const approvalsOpen = [...(data.approvals?.pending || [])].filter((r) => r.status === 'PENDING' || (r.status === 'ESCALATED' && r.can_decide));
    const refundsOpen = [...(data.refunds?.pending || [])].filter((r) => r.can_decide);
    const counters = data.dashboard?.counters || [];
    const pickups = counters.filter((c) => c.status === 'OPEN' && (c.pickup_due || !!c.pending_pickup || c.over_limit));
    const closingsToReview = (data.board?.closings || []).filter((c) => c.status === 'PENDING_APPROVAL' || c.status === 'UNDER_INVESTIGATION');
    const toVault = (data.board?.closings || []).filter((c) => c.status === 'CLOSED' && !c.vault_handover);
    const leaks = data.visits.filter((v) => opdFlag(v) === 'leak');
    const desk = data.visits.filter((v) => opdFlag(v) === 'desk');
    const refundDue = data.visits.filter((v) => opdFlag(v) === 'refund');
    const now = data.lastSync?.getTime() ?? 0;
    const oldDues = now ? data.dues.filter((i) => dueAgeDays(i, now) > 30) : [];
    const duesTotal = data.dues.reduce((s, i) => s + (Number(i.balance) || 0), 0);
    const auditOpen = (data.audit?.rows || []).filter((e) => !e.reviewed);
    return {
      approvalsOpen,
      refundsOpen,
      pickups,
      closingsToReview,
      toVault,
      leaks,
      desk,
      deskTotal: desk.reduce((s, v) => s + visitAmount(v), 0),
      leakTotal: leaks.reduce((s, v) => s + visitAmount(v), 0),
      refundDue,
      oldDues,
      duesTotal,
      auditOpen,
      auditHigh: auditOpen.filter((e) => e.severity === 'HIGH').length,
    };
  }, [data.approvals, data.refunds, data.dashboard, data.board, data.visits, data.dues, data.audit, data.lastSync]);

  const isAdmin = ADMIN_ROLES.includes(String(role));

  const navGroups: HmsNavGroup[] = [
    {
      label: 'Decisions',
      items: [
        { key: 'approvals', label: 'Approvals', icon: Stamp, count: m.approvalsOpen.length || undefined, alert: (ak?.past_sla || 0) > 0 },
        { key: 'refunds', label: 'Refunds', icon: Undo2, count: m.refundsOpen.length || undefined, alert: (rk?.failed_verification || 0) > 0 },
      ],
    },
    {
      label: 'Cash control',
      items: [
        { key: 'counters', label: 'Counters', icon: Monitor, count: dk?.counters_open || undefined, alert: m.pickups.length > 0 },
        { key: 'closings', label: 'Closings & vault', icon: Scale, count: m.closingsToReview.length + m.toVault.length || undefined, alert: (data.board?.closings || []).some((c) => c.status === 'UNDER_INVESTIGATION') },
      ],
    },
    {
      label: 'Revenue watch',
      items: [
        { key: 'opd', label: 'OPD reconciliation', icon: Stethoscope, count: m.leaks.length + m.desk.length + m.refundDue.length || undefined, alert: m.leaks.length > 0 },
        { key: 'dues', label: 'Patient dues', icon: Wallet, count: data.dues.length || undefined, alert: m.oldDues.length > 0 },
      ],
    },
    {
      label: 'Governance',
      items: [
        { key: 'audit', label: 'Audit stream', icon: ShieldAlert, count: m.auditOpen.length || undefined, alert: m.auditHigh > 0 },
        { key: 'reports', label: 'Shift reports', icon: FileText },
      ],
    },
    {
      label: 'Other desks',
      items: [
        { key: 'cashier', label: 'Cashier desk', icon: Store },
        { key: 'ipd', label: 'IPD & TPA desk', icon: BedDouble },
        ...(isAdmin ? [{ key: 'admin', label: 'Billing admin', icon: Activity }] : []),
      ],
    },
  ];

  const refresh = () => data.reload().then(() => show('Data refreshed'));
  const openVault = () => {
    goTo('closings');
    setVaultRequest(true);
  };
  const openReceive = () => {
    goTo('opd');
    setReceiveRequest(true);
  };
  const nextApproval = () => {
    const oldest = [...m.approvalsOpen].sort((a, b) => b.age_minutes - a.age_minutes)[0];
    if (!oldest) return show('No approvals waiting');
    goTo('approvals', 'open', oldest.id);
  };

  const enterCounter = async (shiftId: string) => {
    try {
      await billingService.enterCounterMode(shiftId);
      navigate('/billing');
    } catch (e) {
      show(apiError(e, 'Could not enter counter mode'), 'error');
    }
  };

  const alertAction = (a: SupervisorAlert) => {
    if (a.action === 'PICKUP' && a.shift_id) {
      const c = data.dashboard?.counters.find((x) => x.shift_id === a.shift_id);
      return goTo('counters', undefined, c?.counter_code);
    }
    if (a.action === 'APPROVALS') return goTo('approvals', a.request_id ? 'open' : 'sla', a.request_id);
    if (a.action === 'REFUNDS') return goTo('refunds', 'open', a.refund_id);
    goTo('closings', 'review');
  };

  const alerts = (data.dashboard?.alerts || []).slice(0, 3);
  const key = `${activeTab}-${initialFilter || ''}-${initialSelect || ''}`;

  return (
    <HmsShell
      navLabel="Supervisor navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={(t) => goTo(t)}
      department={{ name: 'Patient Billing', scope: `${dk ? `${dk.counters_open} of ${dk.counters_total} counters open` : 'All billing counters'} · OPD desk`, roleBadge: 'SUPERVISOR', roleName: 'Billing Supervisor', responsibility: 'Approvals, cash control & audit' }}
      roleLabel="Billing Supervisor"
      crumb="Billing · Supervisor"
      crumbChip={
        <span style={{ marginLeft: '8px' }}>
          <HmsBadge tone="green" dot>
            Live
          </HmsBadge>
        </span>
      }
      statusChips={
        <>
          <button
            type="button"
            style={{ ...CHIP, color: m.toVault.length ? '#b45309' : HMS.label, borderColor: m.toVault.length ? '#fde68a' : HMS.border, background: m.toVault.length ? '#fffbeb' : '#ffffff' }}
            onClick={() => goTo('closings', m.toVault.length ? 'signed' : undefined)}
            title="Open closings & vault"
          >
            <Vault size={16} />
            {data.board ? `To vault ${format(data.board.kpis.cash_to_vault)}` : 'Vault —'}
          </button>
          <button type="button" style={CHIP} onClick={refresh} title="Refresh data (Alt+R)" aria-keyshortcuts="Alt+R">
            <RefreshCw size={16} />
            {data.lastSync ? `Synced ${data.lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Syncing…'}
          </button>
        </>
      }
      altShortcuts={{ KeyA: nextApproval, KeyV: openVault, KeyO: openReceive, KeyR: refresh }}
      shortcutHelp={[
        ['Alt+A', 'Open the oldest approval'],
        ['Alt+V', 'Vault handover'],
        ['Alt+O', 'Receive front-desk OPD fees'],
        ['Alt+R', 'Refresh data'],
      ]}
    >
      <HmsToast toast={toast} onClose={clear} />

      <HmsPageHeader
        title="Billing Supervisor Workspace"
        description="Decide discounts, voids and refunds; watch every counter’s drawer; sign off closings and the vault; reconcile today’s OPD front-desk fees and chase patient dues."
        actions={[
          { label: 'Receive desk fees', icon: HandCoins, onClick: openReceive, shortcutKey: 'O' },
          { label: 'Vault handover', icon: Vault, onClick: openVault, shortcutKey: 'V' },
          { label: 'Next approval', icon: Stamp, onClick: nextApproval, primary: true, shortcutKey: 'A' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'approvals',
            label: 'Approvals waiting',
            value: ak ? m.approvalsOpen.length : null,
            loading: data.loading,
            unit: ak ? `· ${format(ak.discount_value)} discounts` : undefined,
            badge: !ak ? pending : ak.past_sla ? { text: `${ak.past_sla} PAST SLA`, tone: 'red' } : m.approvalsOpen.length ? { text: 'DECIDE', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            alert: (ak?.past_sla || 0) > 0,
            caption: ak ? (m.approvalsOpen.length ? `${ak.discounts} discount · ${ak.voids} void · ${ak.other} other` : 'Nothing waiting on you') : missing('Approvals'),
            captionTone: ak?.past_sla ? 'amber' : 'muted',
            onOpen: () => goTo('approvals', ak?.past_sla ? 'sla' : 'open'),
            title: 'Open approvals',
          },
          {
            key: 'refunds',
            label: 'Refunds waiting',
            value: rk ? m.refundsOpen.length : null,
            loading: data.loading,
            unit: rk ? `· ${format(rk.value_pending)}` : undefined,
            badge: !rk ? pending : rk.failed_verification ? { text: `${rk.failed_verification} CHECK FAILED`, tone: 'red' } : m.refundsOpen.length ? { text: 'VERIFY', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            caption: rk ? `${rk.credit_notes} credit note${rk.credit_notes === 1 ? '' : 's'} today · ${rk.awaiting_cash} awaiting cash` : missing('Refunds'),
            onOpen: () => goTo('refunds', rk?.failed_verification ? 'failed' : 'open'),
            title: 'Open refunds',
          },
          {
            key: 'collected',
            label: 'Collected today',
            value: dk ? format(dk.collections_today) : null,
            loading: data.loading,
            badge: !dk ? pending : m.pickups.length ? { text: `${m.pickups.length} PICKUP DUE`, tone: 'amber' } : { text: `${dk.counters_open}/${dk.counters_total} OPEN`, tone: 'blue' },
            caption: dk ? `${dk.counters_closing} closing · ${dk.closings_awaiting} closing${dk.closings_awaiting === 1 ? '' : 's'} to review` : missing('Counters'),
            captionTone: m.pickups.length ? 'amber' : 'muted',
            onOpen: () => goTo('counters', m.pickups.length ? 'pickup' : undefined),
            title: 'Open counters',
          },
          {
            key: 'opd',
            label: 'OPD fees at risk',
            value: failed('OPD visits') ? null : m.leaks.length,
            loading: data.loading,
            unit: `seen · not paid${m.leakTotal ? ` · ${format(m.leakTotal)}` : ''}`,
            badge: data.loading ? pending : failed('OPD visits') ? { text: 'UNAVAILABLE', tone: 'gray' } : m.leaks.length ? { text: 'LEAKAGE', tone: 'red' } : m.desk.length ? { text: `${m.desk.length} DESK`, tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            alert: m.leaks.length > 0,
            caption: data.loading ? 'Loading…' : failed('OPD visits') ? 'OPD visits unavailable' : m.desk.length ? `${format(m.deskTotal)} collected at the front desk to receive` : `${data.visits.length} visit${data.visits.length === 1 ? '' : 's'} today · desk fees all received`,
            captionTone: m.desk.length ? 'amber' : 'muted',
            onOpen: () => goTo('opd', m.leaks.length ? 'leak' : m.desk.length ? 'desk' : undefined),
            title: 'Open OPD reconciliation',
          },
        ]}
      />

      {!data.loading && data.failed.length > 0 && <HmsNotice tone="amber">Could not load: {data.failed.join(', ')}. Those figures show as “—” until the next refresh (Alt+R).</HmsNotice>}
      {alerts.map((a, i) => (
        <HmsNotice
          key={`${a.kind}-${i}`}
          tone={a.tone}
          action={
            <HmsButton size="sm" onClick={() => alertAction(a)}>
              {a.action === 'PICKUP' ? 'Open counter' : a.action === 'CLOSING' ? 'Review' : 'Decide'}
            </HmsButton>
          }
        >
          <strong>{a.title}</strong> — {a.text}
        </HmsNotice>
      ))}

      {activeTab === 'approvals' && <SupApprovalsView key={key} data={data} notify={show} initialFilter={initialFilter} initialSelect={initialSelect} />}
      {activeTab === 'refunds' && <SupRefundsView key={key} data={data} notify={show} initialFilter={initialFilter} initialSelect={initialSelect} />}
      {activeTab === 'counters' && <SupCountersView key={key} data={data} notify={show} onEnterCounter={enterCounter} initialFilter={initialFilter} initialSelect={initialSelect} />}
      {activeTab === 'closings' && <SupClosingsView key={key} data={data} notify={show} initialFilter={initialFilter} initialSelect={initialSelect} vaultRequest={vaultRequest} onVaultConsumed={() => setVaultRequest(false)} />}
      {activeTab === 'opd' && <SupOpdView key={key} data={data} notify={show} initialFilter={initialFilter} initialSelect={initialSelect} receiveRequest={receiveRequest} onReceiveConsumed={() => setReceiveRequest(false)} />}
      {activeTab === 'dues' && <SupDuesView key={key} data={data} notify={show} initialFilter={initialFilter} initialSelect={initialSelect} />}
      {activeTab === 'audit' && <SupAuditView key={key} data={data} notify={show} initialFilter={initialFilter} initialSelect={initialSelect} />}
      {activeTab === 'reports' && <SupReportsView key={activeTab} notify={show} initialSelect={initialSelect} />}
    </HmsShell>
  );
};

export default SupervisorDeskWorkspace;
