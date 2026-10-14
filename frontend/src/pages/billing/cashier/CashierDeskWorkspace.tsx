// Billing · Cashier desk workspace (HMS design bible, Section 19).
// Billing queue and patient accounts, today's OPD visits from the front desk, receipts & invoices, the cashier's requests
// and the counter shift. Every figure comes from the live billing API.
import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ListOrdered, Stethoscope, Receipt, ClipboardList, Store, BedDouble, ShieldCheck, Activity, RefreshCw, UserPlus, Scale, ArrowLeft } from 'lucide-react';
import { HmsShell, HmsNavGroup, HmsPageHeader, HmsKpiRow, HmsToast, useHmsToast, HmsBadge, HmsNotice, HmsButton, HMS } from '../../../components/hms';
import { billingService, counterMode } from '../../../services/billingService';
import { useAuth } from '../../../context/AuthContext';
import { useCurrency } from '../../../config/currency';
import { useCashierDeskData, STALE_SHIFT_HOURS, fmtWait, shiftAgeHours } from './cashierDeskData';
import { CashierQueueView } from './CashierQueueView';
import { CashierOpdView } from './CashierOpdView';
import { CashierReceiptsView } from './CashierReceiptsView';
import { CashierRequestsView } from './CashierRequestsView';
import { CashierShiftView } from './CashierShiftView';
import { CashierWalkinModal } from './CashierWalkinModal';
import { CashierPaymentModal, CashierPayTarget, CashierSettlement, CashierSettlementModal } from './CashierPaymentModal';

const TABS = ['queue', 'opd', 'receipts', 'requests', 'shift'] as const;
type Tab = (typeof TABS)[number];
// Old screen paths keep working
const PATH_TAB: Record<string, Tab> = { queue: 'queue', receipts: 'receipts', shift: 'shift', counter: 'shift', requests: 'requests', opd: 'opd' };
const SUPERVISOR_ROLES = ['BILLING_SUPERVISOR', 'BILLING_ADMIN', 'BILLING_MANAGER', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'];
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
};

export const CashierDeskWorkspace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { format } = useCurrency();
  const pathTab = PATH_TAB[pathname.replace(/^\/billing\/?/, '').split('/')[0]];
  const requested = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = requested && TABS.includes(requested) ? requested : pathTab || 'queue';
  const initialFilter = searchParams.get('filter') || undefined;
  const initialSelect = searchParams.get('select') || undefined;

  const data = useCashierDeskData(user?.id);
  const { toast, show, clear } = useHmsToast();
  const [assist, setAssist] = useState(() => counterMode.get());
  const [walkin, setWalkin] = useState(false);
  const [walkinPay, setWalkinPay] = useState<{ target: CashierPayTarget; name: string; uhid: string } | null>(null);
  const [walkinDone, setWalkinDone] = useState<CashierSettlement | null>(null);
  const [closeRequest, setCloseRequest] = useState(false);

  const goTo = (tab: string, filter?: string, select?: string) => {
    if (tab === 'ipd') return navigate(select ? `/billing/ipd?select=${encodeURIComponent(select)}` : '/billing/ipd');
    if (tab === 'supervisor') return navigate('/billing/supervisor');
    if (tab === 'admin') return navigate('/billing/admin');
    const next: Record<string, string> = {};
    if (tab !== 'queue') next.tab = tab;
    if (filter) next.filter = filter;
    if (select) next.select = select;
    if (pathname !== '/billing' && pathname !== '/billing/') navigate({ pathname: '/billing', search: new URLSearchParams(next).toString() });
    else setSearchParams(next);
  };

  const k = data.dashboard?.kpis;
  const shift = data.dashboard?.shift;
  const shiftOpen = !!shift?.has_active_shift;
  const counterCode = shift?.counter_code || undefined;

  // Live figures — derived from the dashboard, queue, OPD visits and requests
  const m = useMemo(() => {
    const visits = data.visits;
    const toCollect = visits.filter((v) => v.billing.state === 'TO_COLLECT' || v.billing.state === 'DRAFT');
    const deskPaid = visits.filter((v) => v.billing.state === 'PAID_AT_DESK');
    const unpaidVisits = visits.filter((v) => v.billing.state === 'BILLED');
    const pending = data.requests.filter((r) => r.status === 'PENDING');
    const payable = data.requests.filter((r) => r.payable);
    const tenders = data.dashboard?.collections_by_tender || {};
    const ageH = shiftAgeHours(shift?.started_at, data.lastSync ? data.lastSync.getTime() : 0);
    return { visits, toCollect, deskPaid, unpaidVisits, pending, payable, tenders, ageH, stale: shiftOpen && ageH !== null && ageH > STALE_SHIFT_HOURS };
  }, [data.visits, data.requests, data.dashboard, data.lastSync, shift, shiftOpen]);

  const isSupervisor = SUPERVISOR_ROLES.includes(String(role));
  const isAdmin = ADMIN_ROLES.includes(String(role));
  const failed = (label: string) => data.failed.includes(label);

  const navGroups: HmsNavGroup[] = [
    {
      label: 'Counter',
      items: [
        { key: 'queue', label: 'Billing queue', icon: ListOrdered, count: data.queue?.total_patients, alert: (data.queue?.stat_count || 0) > 0 },
        { key: 'opd', label: 'OPD visits', icon: Stethoscope, count: m.toCollect.length || undefined, alert: m.unpaidVisits.length > 0 },
      ],
    },
    {
      label: 'Records',
      items: [
        { key: 'receipts', label: 'Receipts & invoices', icon: Receipt, count: k?.unpaid_invoices || undefined },
        { key: 'requests', label: 'My requests', icon: ClipboardList, count: m.pending.length + m.payable.length || undefined, alert: m.payable.length > 0 },
      ],
    },
    { label: 'Shift', items: [{ key: 'shift', label: 'Counter shift', icon: Store, alert: !shiftOpen || m.stale }] },
    {
      label: 'Other desks',
      items: [
        { key: 'ipd', label: 'IPD & TPA desk', icon: BedDouble },
        ...(isSupervisor ? [{ key: 'supervisor', label: 'Supervisor oversight', icon: ShieldCheck }] : []),
        ...(isAdmin ? [{ key: 'admin', label: 'Billing admin', icon: Activity }] : []),
      ],
    },
  ];

  const refresh = () => data.reload().then(() => show('Data refreshed'));
  const backToSupervisor = async () => {
    await billingService.exitCounterMode();
    setAssist(null);
    navigate('/billing/supervisor');
  };
  const startClosing = () => {
    if (!shiftOpen) return show('No open shift to close', 'error');
    setCloseRequest(true);
    goTo('shift');
  };

  const tenderCaption = Object.entries(m.tenders)
    .filter(([, v]) => Number(v) > 0)
    .map(([t, v]) => `${t.charAt(0) + t.slice(1).toLowerCase()} ${format(Number(v))}`)
    .join(' · ');
  const key = `${activeTab}-${initialFilter || ''}-${initialSelect || ''}`;

  return (
    <HmsShell
      navLabel="Cashier navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={(t) => goTo(t)}
      department={{ name: 'Patient Billing', scope: shift?.counter_name || 'OPD · Lab · Pharmacy counter', roleBadge: 'CASHIER', roleName: 'Billing Cashier', responsibility: 'Counter billing & collections' }}
      roleLabel="Cashier"
      crumb="Billing · Cashier"
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
            style={{ ...CHIP, cursor: 'pointer', color: shiftOpen && !m.stale ? HMS.label : '#b45309', borderColor: shiftOpen && !m.stale ? HMS.border : '#fde68a', background: shiftOpen && !m.stale ? '#ffffff' : '#fffbeb' }}
            onClick={() => goTo('shift')}
            title="Open counter shift"
          >
            <Store size={16} />
            {!shift ? 'Counter —' : shiftOpen ? `${shift.counter_code} · drawer ${format(shift.expected_cash_in_drawer)}` : 'Counter closed'}
          </button>
          <button type="button" style={{ ...CHIP, cursor: 'pointer' }} onClick={refresh} title="Refresh data (Alt+R)" aria-keyshortcuts="Alt+R">
            <RefreshCw size={16} />
            {data.lastSync ? `Synced ${data.lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Syncing…'}
          </button>
        </>
      }
      altShortcuts={{ KeyW: () => setWalkin(true), KeyC: startClosing, KeyR: refresh }}
      shortcutHelp={[
        ['Alt+W', 'Walk-in bill'],
        ['Alt+C', 'Submit counter closing'],
        ['Alt+R', 'Refresh data'],
      ]}
    >
      <HmsToast toast={toast} onClose={clear} />

      {assist && (
        <HmsNotice
          tone="amber"
          action={
            <HmsButton size="sm" icon={ArrowLeft} onClick={backToSupervisor}>
              Back to supervisor
            </HmsButton>
          }
        >
          <strong>{assist.banner}</strong> — actions post to this counter as “assisted by {assist.supervisor_name}”. Requests you raise here go to the Billing Admin.
        </HmsNotice>
      )}
      {data.assistEnded && !assist && <HmsNotice tone="amber">Counter mode ended: {data.assistEnded}</HmsNotice>}

      <HmsPageHeader
        title="Billing Cashier Workspace"
        description="Bill and collect for OPD, lab, pharmacy and radiology; follow today’s front-desk visits; reprint, void and refund; run and close the counter."
        actions={[
          { label: shiftOpen ? 'Submit closing' : 'Open counter', icon: Scale, onClick: shiftOpen ? startClosing : () => goTo('shift'), shortcutKey: 'C' },
          { label: 'Walk-in bill', icon: UserPlus, onClick: () => setWalkin(true), primary: true, shortcutKey: 'W' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'collected',
            label: 'Collected this shift',
            value: shift ? format(shift.total_collected) : null,
            loading: data.loading,
            badge: !shift ? { text: 'UNAVAILABLE', tone: 'gray' } : shiftOpen ? (m.stale ? { text: 'CLOSE SHIFT', tone: 'amber' } : { text: 'OPEN', tone: 'green' }) : { text: 'CLOSED', tone: 'amber' },
            caption: shift ? (shiftOpen ? tenderCaption || `${shift.transactions || 0} transactions` : 'Open the counter to bill') : 'Shift unavailable',
            captionTone: m.stale || !shiftOpen ? 'amber' : 'muted',
            onOpen: () => goTo('shift'),
            title: 'Open counter shift',
          },
          {
            key: 'queue',
            label: 'Waiting to be billed',
            value: k ? k.pending_queue_patients : null,
            loading: data.loading,
            unit: k ? `patients · ${format(k.pending_queue_amount)}` : undefined,
            badge: k?.pending_queue_stat ? { text: `${k.pending_queue_stat} STAT`, tone: 'red' } : k?.pending_queue_patients ? { text: 'WAITING', tone: 'blue' } : { text: 'CLEAR', tone: 'green' },
            alert: (k?.pending_queue_stat || 0) > 0,
            caption: k ? (k.pending_queue_patients ? `Oldest waiting ${fmtWait(k.oldest_wait_minutes)}` : 'Nobody waiting') : 'Dashboard unavailable',
            onOpen: () => goTo('queue', k?.pending_queue_stat ? 'stat' : undefined),
            title: 'Open the billing queue',
          },
          {
            key: 'opd',
            label: 'OPD fees to collect',
            value: failed('OPD visits') ? null : m.toCollect.length,
            loading: data.loading,
            unit: `of ${m.visits.length} visits today`,
            badge: m.unpaidVisits.length ? { text: `${m.unpaidVisits.length} UNPAID`, tone: 'red' } : m.toCollect.length ? { text: 'COLLECT', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            caption: m.visits.length ? `${m.deskPaid.length} paid at the front desk` : 'No front-desk visits yet today',
            onOpen: () => goTo('opd', m.toCollect.length ? 'collect' : undefined),
            title: 'Open today’s OPD visits',
          },
          {
            key: 'unpaid',
            label: 'Unpaid invoices',
            value: k ? k.unpaid_invoices : null,
            loading: data.loading,
            unit: k ? format(k.unpaid_balance) : undefined,
            badge: m.payable.length ? { text: `${m.payable.length} REFUND TO PAY`, tone: 'amber' } : k?.unpaid_invoices ? { text: 'FOLLOW UP', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            caption: m.pending.length ? `${m.pending.length} request${m.pending.length === 1 ? '' : 's'} with the supervisor` : 'No requests waiting',
            onOpen: () => (m.payable.length ? goTo('requests', 'pay') : goTo('receipts', 'UNPAID')),
            title: 'Open unpaid invoices',
          },
        ]}
      />

      {!data.loading && data.failed.length > 0 && <HmsNotice tone="amber">Could not load: {data.failed.join(', ')}. Those figures show as “—” until the next refresh (Alt+R).</HmsNotice>}
      {shift && !shiftOpen && activeTab !== 'shift' && (
        <HmsNotice
          tone="amber"
          action={
            <HmsButton size="sm" icon={Store} onClick={() => goTo('shift')}>
              Open counter
            </HmsButton>
          }
        >
          Your counter is closed. Billing, payments and deposits stay read-only until you open a shift.
        </HmsNotice>
      )}

      {activeTab === 'queue' && <CashierQueueView key={key} data={data} notify={show} initialFilter={initialFilter} initialSelect={initialSelect} shiftOpen={shiftOpen} counterCode={counterCode} onOpenIpd={(adm) => goTo('ipd', undefined, adm)} />}
      {activeTab === 'opd' && <CashierOpdView key={key} data={data} initialFilter={initialFilter} initialSelect={initialSelect} onOpenAccount={(uhid) => goTo('queue', undefined, uhid)} />}
      {activeTab === 'receipts' && <CashierReceiptsView key={key} notify={show} initialFilter={initialFilter} initialSelect={initialSelect} onChanged={() => data.reload()} />}
      {activeTab === 'requests' && <CashierRequestsView key={key} data={data} notify={show} initialFilter={initialFilter} initialSelect={initialSelect} shiftOpen={shiftOpen} />}
      {activeTab === 'shift' && <CashierShiftView key={activeTab} notify={show} onChanged={() => data.reload()} closeRequest={closeRequest} onCloseConsumed={() => setCloseRequest(false)} initialFilter={initialFilter} />}

      {walkin && (
        <CashierWalkinModal
          shiftOpen={shiftOpen}
          onClose={() => setWalkin(false)}
          onCollect={(target, name, uhid) => {
            setWalkin(false);
            setWalkinPay({ target, name, uhid });
          }}
        />
      )}
      {walkinPay && (
        <CashierPaymentModal
          target={walkinPay.target}
          patientName={walkinPay.name}
          uhid={walkinPay.uhid}
          depositBalance={0}
          counterCode={counterCode}
          onClose={() => setWalkinPay(null)}
          onSettled={(r) => {
            setWalkinPay(null);
            setWalkinDone(r);
            data.reload();
          }}
        />
      )}
      {walkinDone && <CashierSettlementModal result={walkinDone} onDone={() => setWalkinDone(null)} />}
    </HmsShell>
  );
};

export default CashierDeskWorkspace;
