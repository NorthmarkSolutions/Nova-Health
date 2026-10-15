// OPD Department Admin workspace — HMS design bible, Section 19. Live OPD board, doctor roster, chambers, staff &
// shifts, duty roster with coverage gaps, fees & tariffs, policies, reports and the audit log. Everything edited here
// is what the front desk, nurse station, chamber desk and doctor desk read, so changes take effect at once.
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity, Stethoscope, DoorOpen, Users, CalendarDays, IndianRupee, Settings2, BarChart3, History, UserPlus, RefreshCw } from 'lucide-react';
import { HmsShell, HmsNavGroup, HmsPageHeader, HmsKpiRow, HmsToast, useHmsToast, HmsBadge, HMS } from '../../components/hms';
import { useOpdApiErrors } from '../../services/opdActions';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../config/currency';
import { LONG_WAIT_MIN, fmtWait, isWaiting, sameDoctor, todayIso, waitMinutes } from '../reception/receptionData';
import { deskCollections } from '../reception/deskFees';
import { useOpdAdminData, OpdAdminActions, coverage, doctorState, isTodayTok, isoDay } from './opdAdminData';
import { OaLiveView } from './OaLiveView';
import { OaDoctorsView } from './OaDoctorsView';
import { OaRoomsView } from './OaRoomsView';
import { OaStaffView } from './OaStaffView';
import { OaRosterView } from './OaRosterView';
import { OaTariffView } from './OaTariffView';
import { OaPoliciesView } from './OaPoliciesView';
import { OaReportsView } from './OaReportsView';
import { OaAuditView } from './OaAuditView';

const TABS = ['live', 'doctors', 'rooms', 'staff', 'roster', 'tariff', 'policies', 'reports', 'audit'] as const;
type Tab = (typeof TABS)[number];
// Tabs of the old generic department screen keep working
const LEGACY: Record<string, Tab> = { dashboard: 'live', operations: 'live', scheduling: 'roster', settings: 'tariff' };

const CHIP: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 12px', border: `1px solid ${HMS.border}`, borderRadius: '10px', fontSize: '13px', color: HMS.label, background: '#ffffff', whiteSpace: 'nowrap', cursor: 'pointer' };

export const OpdAdminWorkspace: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { format } = useCurrency();
  const raw = params.get('tab') || '';
  const activeTab: Tab = (TABS as readonly string[]).includes(raw) ? (raw as Tab) : LEGACY[raw] || 'live';
  const initialFilter = params.get('filter') || undefined;
  const data = useOpdAdminData();
  const { toast, show, clear } = useHmsToast();
  useOpdApiErrors(show);
  const [newSignal, setNewSignal] = useState(0);
  const userName = (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : '') || 'OPD admin';

  const goTo = (tab: string, filter?: string) => {
    const next: Record<string, string> = {};
    if (tab !== 'live') next.tab = tab;
    if (filter) next.filter = filter;
    setParams(next);
  };
  const act: OpdAdminActions = { notify: show, goTo, userName };

  const now = data.lastSync.getTime();
  const m = useMemo(() => {
    const today = data.queue.filter((t) => isTodayTok(t) && t.status !== 'CANCELLED');
    const waiting = data.queue.filter(isWaiting);
    const longest = Math.max(-1, ...waiting.map((t) => waitMinutes(t, now) ?? -1));
    const long = waiting.filter((t) => (waitMinutes(t, now) ?? 0) > LONG_WAIT_MIN).length;
    const states = data.doctors.map((d) => ({ d, s: doctorState(data, d.name) }));
    const rostered = states.filter(({ s }) => !['NOT_TODAY', 'OFF'].includes(s.key));
    const inClinic = rostered.filter(({ s }) => s.key === 'IN' || s.key === 'BUSY');
    const away = rostered.filter(({ s }) => ['LATE', 'AWAY', 'LEAVE'].includes(s.key));
    const col = deskCollections(data.queue);
    const due = today.filter((t) => !t.feePaid && t.status !== 'NO_SHOW').reduce((s, t) => s + (t.totalFee || 0), 0);
    const gapDays = Array.from({ length: 7 }, (_, i) => isoDay(i)).filter((d) => coverage(data, d).some((c) => c.missing.length)).length;
    const todayGaps = coverage(data, isoDay(0)).filter((c) => c.missing.length).length;
    const toArrive = data.appointments.filter((a) => a.date === todayIso() && a.status === 'BOOKED').length;
    const cap = data.workspace.config.dailyCapacity || 0;
    return { today, seen: today.filter((t) => t.status === 'COMPLETED').length, waiting, longest, long, rostered, inClinic, away, col, due, gapDays, todayGaps, toArrive, cap, maint: data.rooms.filter((r) => r.status === 'MAINTENANCE').length, onLeave: data.deptDoctors.filter((d) => d.status !== 'ACTIVE').length };
  }, [data, now]);

  const navGroups: HmsNavGroup[] = [
    { label: 'Today', items: [{ key: 'live', label: 'Live OPD', icon: Activity, count: m.waiting.length || undefined, alert: m.long > 0 || m.away.length > 0 }] },
    {
      label: 'Clinical setup',
      items: [
        { key: 'doctors', label: 'Doctors', icon: Stethoscope, count: data.deptDoctors.length || undefined, alert: m.onLeave > 0 },
        { key: 'rooms', label: 'Chambers & rooms', icon: DoorOpen, count: data.rooms.length || undefined, alert: m.maint > 0 },
        { key: 'staff', label: 'Staff & shifts', icon: Users, count: data.staff.length || undefined },
        { key: 'roster', label: 'Duty roster', icon: CalendarDays, count: m.gapDays || undefined, alert: m.gapDays > 0 },
      ],
    },
    {
      label: 'Fees & policy',
      items: [
        { key: 'tariff', label: 'Fees & tariffs', icon: IndianRupee },
        { key: 'policies', label: 'Policies', icon: Settings2 },
      ],
    },
    {
      label: 'Reports & audit',
      items: [
        { key: 'reports', label: 'Reports', icon: BarChart3 },
        { key: 'audit', label: 'Audit log', icon: History, count: data.log.length || undefined },
      ],
    },
  ];

  const addDoctor = () => {
    if (activeTab !== 'doctors') goTo('doctors', 'new');
    else setNewSignal((n) => n + 1);
  };
  const sectionNew = () => {
    if (activeTab === 'doctors' || activeTab === 'rooms' || activeTab === 'roster') setNewSignal((n) => n + 1);
    else show('Nothing to add in this section', 'error');
  };
  const refresh = () => {
    data.reload();
    show('Refreshed');
  };
  const key = `${activeTab}-${initialFilter || ''}`;

  return (
    <HmsShell
      navLabel="OPD admin navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={(t) => goTo(t)}
      department={{ name: 'Outpatient Department', scope: `${data.deptDoctors.length} doctors · ${data.rooms.length} rooms · ${data.staff.length} staff`, roleBadge: 'ADMIN', roleName: 'OPD Department Admin', responsibility: 'Roster, chambers, fees & policies' }}
      roleLabel="OPD Admin"
      crumb="OPD · Department admin"
      crumbChip={
        <span style={{ marginLeft: '8px' }}>
          <HmsBadge tone="green" dot>
            Live
          </HmsBadge>
        </span>
      }
      statusChips={
        <>
          {m.todayGaps > 0 && (
            <button type="button" style={{ ...CHIP, color: '#b91c1c', borderColor: '#fecaca', background: '#fef2f2' }} onClick={() => goTo('roster', 'gaps')} title="Open the duty roster">
              <CalendarDays size={16} />
              {m.todayGaps} shift gap{m.todayGaps === 1 ? '' : 's'} today
            </button>
          )}
          <button type="button" style={CHIP} onClick={refresh} title="Refresh (Alt+R)" aria-keyshortcuts="Alt+R">
            <RefreshCw size={16} />
            {data.lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </button>
        </>
      }
      altShortcuts={{ KeyL: () => goTo('live'), KeyU: () => goTo('roster'), KeyA: addDoctor, KeyN: sectionNew, KeyR: refresh }}
      shortcutHelp={[
        ['Alt+L', 'Live OPD'],
        ['Alt+U', 'Duty roster'],
        ['Alt+A', 'Add a doctor'],
        ['Alt+N', 'New in this section (doctor, room, roster duty)'],
        ['Alt+R', 'Refresh'],
      ]}
    >
      <HmsToast toast={toast} onClose={clear} />

      <HmsPageHeader
        title="OPD Department Admin Workspace"
        description="Run the outpatient department: watch the live queue, manage doctors, chambers, staff and the duty roster, set fees and policies, and review reports."
        actions={[
          { label: 'Live OPD', icon: Activity, onClick: () => goTo('live'), shortcutKey: 'L' },
          { label: 'Duty roster', icon: CalendarDays, onClick: () => goTo('roster'), shortcutKey: 'U' },
          { label: 'Add doctor', icon: UserPlus, onClick: addDoctor, primary: true, shortcutKey: 'A' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'patients',
            label: 'Patients today',
            value: m.today.length,
            unit: `· ${m.seen} seen`,
            badge: m.cap ? { text: `${Math.round((m.today.length / m.cap) * 100)}% OF ${m.cap}`, tone: m.today.length >= m.cap ? 'red' : 'blue' } : { text: 'TODAY', tone: 'gray' },
            alert: !!m.cap && m.today.length >= m.cap,
            caption: m.toArrive ? `${m.toArrive} booked appointment${m.toArrive === 1 ? '' : 's'} still to arrive` : 'No booked appointments pending',
            onOpen: () => goTo('reports'),
            title: 'Open reports',
          },
          {
            key: 'waiting',
            label: 'Waiting now',
            value: m.waiting.length,
            unit: m.longest >= 0 ? `· longest ${fmtWait(m.longest)}` : undefined,
            badge: m.long ? { text: `${m.long} OVER ${LONG_WAIT_MIN} MIN`, tone: 'red' } : m.waiting.length ? { text: 'IN LOBBY', tone: 'blue' } : { text: 'CLEAR', tone: 'green' },
            alert: m.long > 0,
            caption: m.long ? 'Patients waiting too long — check the doctors' : 'Across all OPD doctors',
            captionTone: m.long ? 'amber' : 'muted',
            onOpen: () => goTo('live', m.long ? 'attention' : 'busy'),
            title: 'Open live OPD',
          },
          {
            key: 'doctors',
            label: 'Doctors in clinic',
            value: m.inClinic.length,
            unit: `of ${m.rostered.length} today`,
            badge: m.away.length ? { text: `${m.away.length} AWAY`, tone: 'amber' } : { text: 'ON DUTY', tone: 'blue' },
            alert: m.away.some(({ d }) => data.queue.some((t) => isWaiting(t) && sameDoctor(t.doctor, d.name))),
            caption: m.away.length ? m.away.map(({ d, s }) => `${d.name.replace(/^Dr\.?\s*/, 'Dr ')}: ${s.label.toLowerCase()}`).join(' · ') : 'Everyone rostered today is in',
            captionTone: m.away.length ? 'amber' : 'muted',
            onOpen: () => goTo('live', m.away.length ? 'away' : undefined),
            title: 'Open live OPD',
          },
          {
            key: 'collection',
            label: 'Collected today',
            value: format(m.col.total),
            unit: m.due ? `· ${format(m.due)} due` : undefined,
            badge: { text: 'DESK', tone: 'gray' },
            caption: `Cash ${format(m.col.cash)} · UPI ${format(m.col.upi)} · Card ${format(m.col.card)}`,
            onOpen: () => goTo('reports'),
            title: 'Open reports',
          },
        ]}
      />

      {activeTab === 'live' && <OaLiveView key={key} data={data} act={act} initialFilter={initialFilter} />}
      {activeTab === 'doctors' && <OaDoctorsView key={key} data={data} act={act} initialFilter={initialFilter} newSignal={newSignal} />}
      {activeTab === 'rooms' && <OaRoomsView key={key} data={data} act={act} initialFilter={initialFilter} newSignal={newSignal} />}
      {activeTab === 'staff' && <OaStaffView key={key} data={data} act={act} initialFilter={initialFilter} />}
      {activeTab === 'roster' && <OaRosterView key={key} data={data} act={act} initialFilter={initialFilter} newSignal={newSignal} />}
      {activeTab === 'tariff' && <OaTariffView key={key} data={data} act={act} initialFilter={initialFilter} />}
      {activeTab === 'policies' && <OaPoliciesView key={key} data={data} act={act} />}
      {activeTab === 'reports' && <OaReportsView key={key} data={data} act={act} />}
      {activeTab === 'audit' && <OaAuditView key={key} data={data} initialFilter={initialFilter} />}
    </HmsShell>
  );
};

export default OpdAdminWorkspace;
