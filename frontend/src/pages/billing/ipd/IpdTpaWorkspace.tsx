// Billing · IPD & TPA desk workspace (HMS design bible, Section 19).
// Inpatient running bills and the financial discharge gate; cashless pre-auths, claims and settlement; payer reference.
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BedDouble, LogOut, FileClock, FileCheck2, Building2, RefreshCw, FilePlus2, MoonStar, Store } from 'lucide-react';
import { HmsShell, HmsNavGroup, HmsPageHeader, HmsKpiRow, HmsToast, useHmsToast, HmsBadge, HmsNotice, HmsModal, HmsButton, HmsRow, HmsSection, HMS } from '../../../components/hms';
import { billingService } from '../../../services/billingService';
import { useAuth } from '../../../context/AuthContext';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { IpdAdmissionsView } from './IpdAdmissionsView';
import { IpdClaimsView } from './IpdClaimsView';
import { IpdPayersView } from './IpdPayersView';
import { PREAUTH_TAT_MIN, fmtAge, inDischarge, isPreAuthOpen, isReceivable, minutesSince, overCover, settlementOverdue, useIpdTpaData } from './ipdTpaData';

const TABS = ['running', 'discharge', 'preauth', 'claims', 'payers'] as const;
type Tab = (typeof TABS)[number];
const SUPERVISOR_ROLES = ['BILLING_SUPERVISOR', 'BILLING_ADMIN', 'BILLING_MANAGER', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'];

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

export const IpdTpaWorkspace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = requested && TABS.includes(requested) ? requested : 'running';
  const initialFilter = searchParams.get('filter') || undefined;
  const initialSelect = searchParams.get('select') || undefined;

  const { role } = useAuth();
  const canOverride = SUPERVISOR_ROLES.includes(String(role));
  const { format } = useCurrency();
  const data = useIpdTpaData();
  const { toast, show, clear } = useHmsToast();
  const [newRequest, setNewRequest] = useState<{ admission?: string } | null>(null);
  const [accrualOpen, setAccrualOpen] = useState(false);
  const [accruing, setAccruing] = useState(false);

  const goTo = (tab: string, filter?: string, select?: string) => {
    const next: Record<string, string> = {};
    if (tab !== 'running') next.tab = tab;
    if (filter) next.filter = filter;
    if (select) next.select = select;
    setSearchParams(next);
  };

  const newPreAuth = (admission?: string) => {
    setNewRequest({ admission });
    if (activeTab !== 'preauth') goTo('preauth');
  };

  // Every figure below is derived from the live sources — nothing is typed in
  const m = useMemo(() => {
    const now = data.lastSync ? data.lastSync.getTime() : 0;
    const adm = data.admissions;
    const over = adm.filter(overCover);
    const discharge = adm.filter(inDischarge);
    const toClear = adm.filter((a) => a.status === 'MEDICALLY_DISCHARGED');
    const preauth = data.claims.filter(isPreAuthOpen);
    const query = preauth.filter((c) => c.pre_auth_status === 'QUERY_RAISED');
    const late = preauth.filter((c) => c.pre_auth_status === 'PENDING' && (minutesSince(c.updated_at, now) ?? 0) > PREAUTH_TAT_MIN);
    const oldestWait = preauth.reduce<number | null>((mx, c) => {
      const w = minutesSince(c.updated_at, now);
      return w !== null && (mx === null || w > mx) ? w : mx;
    }, null);
    const receivable = data.claims.filter(isReceivable);
    const toFile = receivable.filter((c) => c.claim_status === 'APPROVED');
    const overdue = receivable.filter((c) => settlementOverdue(c, data.payers, now));
    return { over, discharge, toClear, preauth, query, late, oldestWait, receivable, toFile, overdue };
  }, [data.admissions, data.claims, data.payers, data.lastSync]);

  const failed = (label: string) => data.failed.includes(label);
  const k = data.overview?.kpis;
  const shiftOpen = !!data.shift?.has_active_shift;

  const navGroups: HmsNavGroup[] = [
    {
      label: 'Inpatients',
      items: [
        { key: 'running', label: 'Running bills', icon: BedDouble, count: k?.admitted, alert: m.over.length > 0 },
        { key: 'discharge', label: 'Discharge clearance', icon: LogOut, count: m.discharge.length, alert: m.toClear.length > 0 },
      ],
    },
    {
      label: 'Insurance',
      items: [
        { key: 'preauth', label: 'Pre-authorisations', icon: FileClock, count: m.preauth.length, alert: m.query.length + m.late.length > 0 },
        { key: 'claims', label: 'Claims & settlement', icon: FileCheck2, count: m.receivable.length, alert: m.overdue.length > 0 },
        { key: 'payers', label: 'Payers & plans', icon: Building2, count: data.payers.length || undefined },
      ],
    },
  ];

  const runAccrual = async () => {
    setAccruing(true);
    try {
      const r = await billingService.triggerIpdDailyTariffCron();
      show(r.total_accrued_entries ? `Posted ${r.total_accrued_entries} room, nursing and visit charges for ${r.admissions_processed} patients (${r.target_date})` : `Nothing new to post for ${r.target_date} — already done`);
      setAccrualOpen(false);
      await data.reload();
    } catch (e) {
      show(apiError(e, 'Daily charges were not posted'), 'error');
    } finally {
      setAccruing(false);
    }
  };

  const refresh = () => data.reload().then(() => show('Data refreshed'));

  const viewProps = { data, notify: show, initialFilter, initialSelect };
  const key = `${activeTab}-${initialFilter || ''}-${initialSelect || ''}`;

  return (
    <HmsShell
      navLabel="IPD & TPA navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={(t) => goTo(t)}
      department={{ name: 'Patient Billing', scope: 'IPD billing · Cashless insurance', roleBadge: 'IPD & TPA', roleName: 'IPD & TPA Billing Officer', responsibility: 'Inpatient bills · claims' }}
      roleLabel="IPD & TPA Billing"
      crumb="Billing · IPD & TPA"
      crumbChip={
        <span style={{ marginLeft: '8px' }}>
          <HmsBadge tone="green" dot>
            Live
          </HmsBadge>
        </span>
      }
      statusChips={
        <>
          <span style={{ ...CHIP, color: shiftOpen ? HMS.label : '#b45309', borderColor: shiftOpen ? HMS.border : '#fde68a', background: shiftOpen ? '#ffffff' : '#fffbeb' }} title={shiftOpen ? `Shift ${data.shift?.shift_number}` : 'Deposits and payments need an open counter shift'}>
            <Store size={16} />
            {data.shift ? (shiftOpen ? `${data.shift.counter_name || data.shift.counter_code} · open` : 'Counter closed') : 'Counter —'}
          </span>
          <button type="button" style={{ ...CHIP, cursor: 'pointer' }} onClick={refresh} title="Refresh data (Alt+R)" aria-keyshortcuts="Alt+R">
            <RefreshCw size={16} />
            {data.lastSync ? `Synced ${data.lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Syncing…'}
          </button>
        </>
      }
      altShortcuts={{ KeyN: () => newPreAuth(), KeyR: refresh, KeyT: () => setAccrualOpen(true) }}
      shortcutHelp={[
        ['Alt+N', 'New cashless pre-auth'],
        ['Alt+T', 'Post today’s room charges'],
        ['Alt+R', 'Refresh data'],
      ]}
    >
      <HmsToast toast={toast} onClose={clear} />

      <HmsPageHeader
        title="IPD & TPA Billing Workspace"
        description="Inpatient running bills against deposits and insurer cover, the discharge clearance gate, and cashless pre-auths through to claim settlement."
        actions={[
          { label: 'Post daily charges', icon: MoonStar, onClick: () => setAccrualOpen(true), shortcutKey: 'T' },
          { label: 'New pre-auth', icon: FilePlus2, onClick: () => newPreAuth(), primary: true, shortcutKey: 'N' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'admitted',
            label: 'Inpatients on bill',
            value: k ? k.admitted : null,
            loading: data.loading,
            unit: 'admitted',
            badge: k ? { text: 'LIVE', tone: 'blue' } : { text: 'UNAVAILABLE', tone: 'gray' },
            caption: k ? `${format(k.deposits_held)} deposits held` : 'Running bills unavailable',
            onOpen: () => goTo('running'),
            title: 'Open running bills',
          },
          {
            key: 'over',
            label: 'Cover above 80%',
            value: k ? m.over.length : null,
            loading: data.loading,
            unit: m.over.length === 1 ? 'patient' : 'patients',
            badge: m.over.length ? { text: 'TOP-UP', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            alert: m.over.some((a) => a.util >= 100),
            caption: m.over.length ? `${m.over.filter((a) => a.topup_sent).length} top-up notices pending` : 'Every bill within its deposit and cover',
            captionTone: m.over.length ? 'amber' : 'muted',
            onOpen: () => goTo('running', 'over'),
            title: 'Open bills above 80% of cover',
          },
          {
            key: 'preauth',
            label: 'Pre-auths with insurer',
            value: failed('Cashless claims') ? null : m.preauth.length,
            loading: data.loading,
            unit: 'waiting',
            badge: m.query.length ? { text: `${m.query.length} QUERY`, tone: 'red' } : m.late.length ? { text: 'OVER 1 HR', tone: 'amber' } : m.preauth.length ? { text: 'WAITING', tone: 'blue' } : { text: 'CLEAR', tone: 'green' },
            alert: m.query.length > 0,
            caption: m.oldestWait !== null ? `Oldest waiting ${fmtAge(m.oldestWait)}` : 'No requests outstanding',
            captionTone: m.late.length ? 'amber' : 'muted',
            onOpen: () => goTo('preauth', m.query.length ? 'query' : m.late.length ? 'late' : undefined),
            title: 'Open pre-authorisations',
          },
          {
            key: 'discharge',
            label: 'Discharges to clear',
            value: k ? m.discharge.length : null,
            loading: data.loading,
            unit: m.discharge.length === 1 ? 'patient' : 'patients',
            badge: m.toClear.length ? { text: 'ACTION', tone: 'amber' } : m.discharge.length ? { text: 'INSURER', tone: 'blue' } : { text: 'CLEAR', tone: 'green' },
            caption: m.discharge.length ? `${m.toClear.length} ready to bill · ${m.discharge.length - m.toClear.length} awaiting insurer` : 'No discharge in progress',
            onOpen: () => goTo('discharge', m.toClear.length ? 'pending' : 'insurer'),
            title: 'Open discharge clearance',
          },
        ]}
      />

      {!data.loading && data.failed.length > 0 && <HmsNotice tone="amber">Could not load: {data.failed.join(', ')}. Those figures show as “—” until the next refresh (Alt+R).</HmsNotice>}
      {data.shift && !shiftOpen && <HmsNotice tone="amber">Your counter is closed. Bills, claims and the discharge checklist work as usual; taking a deposit or payment needs an open shift at the Cashier desk.</HmsNotice>}

      {(activeTab === 'running' || activeTab === 'discharge') && (
        <IpdAdmissionsView key={key} mode={activeTab} {...viewProps} onStartPreAuth={newPreAuth} canOverride={canOverride} shiftOpen={shiftOpen} />
      )}
      {(activeTab === 'preauth' || activeTab === 'claims') && <IpdClaimsView key={key} mode={activeTab} {...viewProps} newRequest={newRequest} onNewConsumed={() => setNewRequest(null)} />}
      {activeTab === 'payers' && <IpdPayersView key={key} data={data} initialFilter={initialFilter} initialSelect={initialSelect} />}

      {accrualOpen && (
        <HmsModal
          title="Post today’s room charges?"
          onClose={() => setAccrualOpen(false)}
          busy={accruing}
          description="Adds today’s bed, nursing and doctor-visit charges to every admitted patient’s bill. This normally runs automatically at midnight."
          footer={
            <>
              <HmsButton onClick={() => setAccrualOpen(false)} disabled={accruing} data-autofocus>
                Cancel
              </HmsButton>
              <HmsButton variant="primary" icon={MoonStar} onClick={runAccrual} disabled={accruing}>
                {accruing ? 'Posting…' : 'Post charges'}
              </HmsButton>
            </>
          }
        >
          <HmsSection title="Safe to repeat">
            <HmsRow label="Patients already charged for today are skipped" hint="Running it twice never double-charges." />
            <HmsRow label="Admitted patients" value={k ? k.admitted : '—'} last />
          </HmsSection>
        </HmsModal>
      )}

    </HmsShell>
  );
};

export default IpdTpaWorkspace;
