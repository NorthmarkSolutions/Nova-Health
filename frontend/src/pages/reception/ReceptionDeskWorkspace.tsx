// Front Desk & Reception workspace (HMS design bible, Section 19). One role — receptionist — with the front-office
// supervisor login adding cancel-token and reopen-shift rights. Live queue, appointments, doctors & chambers, patient
// directory, doctor follow-ups, fee collection, day-care beds and the counter shift. Data is the shared patient-journey
// store the clinical desks read, and desk tokens reach Billing automatically.
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListOrdered, CalendarCheck, Stethoscope, Users, CalendarHeart, Receipt, BedDouble, Store, Ticket, CalendarPlus, Megaphone, Tv, RefreshCw } from 'lucide-react';
import { HmsShell, HmsNavGroup, HmsPageHeader, HmsKpiRow, HmsToast, useHmsToast, HmsBadge, HmsNotice, HmsButton, HMS } from '../../components/hms';
import { patientJourneyService, SharedAppointment, SharedPatient, SharedQueueToken } from '../../services/patientJourneyService';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../config/currency';
import { RoleType } from '../../types';
import { useReceptionData, DeskActions, LONG_WAIT_MIN, bedState, feeDue, fmtWait, isDaycareBed, isWaiting, isWithDoctor, slotMinutes, todayIso, tokenLabel, waitMinutes, patientName } from './receptionData';
import { BookingModal, CollectFeeModal, ReassignModal, RegisterPatientModal, ShiftModal, WalkInModal } from './ReceptionModals';
import { RecQueueView } from './RecQueueView';
import { RecAppointmentsView } from './RecAppointmentsView';
import { RecDoctorsView } from './RecDoctorsView';
import { RecPatientsView } from './RecPatientsView';
import { RecFollowUpsView } from './RecFollowUpsView';
import { RecFeesView } from './RecFeesView';
import { RecBedsView } from './RecBedsView';
import { RecShiftView } from './RecShiftView';
import { deskCollections } from './deskFees';
import { ReceptionTvBoard } from './ReceptionTvBoard';

const TABS = ['queue', 'appointments', 'doctors', 'patients', 'followups', 'fees', 'beds', 'shift'] as const;
type Tab = (typeof TABS)[number];
// Old ?tab= values keep working
const LEGACY: Record<string, Tab> = { billing: 'fees', search: 'patients', daycare: 'beds' };
const SUPERVISOR_ROLES = [RoleType.RECEPTION_SUPERVISOR, RoleType.HOSPITAL_ADMIN, RoleType.SUPER_ADMIN];

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

/** Three-note chime for a call to the chamber (Web Audio; silent if the browser blocks audio). */
const chime = () => {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc.start();
    osc.stop(ctx.currentTime + 0.9);
  } catch {
    /* audio is optional */
  }
};

type Dialog =
  | { kind: 'walkin'; uhid?: string; doctor?: string }
  | { kind: 'book'; preset?: Parameters<DeskActions['book']>[0]; existing?: SharedAppointment }
  | { kind: 'register'; query?: string; editing?: SharedPatient; then?: 'walkin' | 'book' }
  | { kind: 'fee'; token: SharedQueueToken }
  | { kind: 'reassign'; token: SharedQueueToken }
  | { kind: 'shift'; mode: 'open' | 'close' }
  | null;

export const ReceptionDeskWorkspace: React.FC = () => {
  const [params, setParams] = useSearchParams();
  if (params.get('tv') === '1') return <ReceptionTvBoard />;
  return <Desk params={params} setParams={setParams} />;
};

const Desk: React.FC<{ params: URLSearchParams; setParams: ReturnType<typeof useSearchParams>[1] }> = ({ params, setParams }) => {
  const { user, role } = useAuth();
  const { format } = useCurrency();
  const raw = params.get('tab') || '';
  const activeTab: Tab = (TABS as readonly string[]).includes(raw) ? (raw as Tab) : LEGACY[raw] || 'queue';
  const initialFilter = params.get('filter') || undefined;
  const initialSelect = params.get('select') || undefined;
  const data = useReceptionData();
  const { toast, show, clear } = useHmsToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const userName = (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : '') || 'Front desk';
  const supervisor = SUPERVISOR_ROLES.includes(role);

  const goTo = (tab: string, filter?: string, select?: string) => {
    const next: Record<string, string> = {};
    if (tab !== 'queue') next.tab = tab;
    if (filter) next.filter = filter;
    if (select) next.select = select;
    setParams(next);
  };

  const callToken = (t: SharedQueueToken) => {
    patientJourneyService.updateQueueToken(t.token, { status: 'IN_CONSULTATION', callingStatus: 'CALLING', callPoint: undefined });
    chime();
    data.reload();
    show(`Token ${tokenLabel(t.token)} · ${t.patient} called to ${t.room}`);
  };

  const act: DeskActions = {
    notify: show,
    walkIn: (uhid, doctor) => setDialog({ kind: 'walkin', uhid, doctor }),
    book: (preset) => setDialog({ kind: 'book', preset }),
    reschedule: (a) => setDialog({ kind: 'book', existing: a }),
    register: (query) => setDialog({ kind: 'register', query }),
    editPatient: (p) => setDialog({ kind: 'register', editing: p }),
    collectFee: (t) => setDialog({ kind: 'fee', token: t }),
    reassign: (t) => setDialog({ kind: 'reassign', token: t }),
    callToken,
    goTo,
    supervisor,
    userName,
  };

  const now = data.lastSync.getTime();
  const m = useMemo(() => {
    const waiting = data.queue.filter(isWaiting);
    const longest = Math.max(-1, ...waiting.map((t) => waitMinutes(t, now) ?? -1));
    const long = waiting.filter((t) => (waitMinutes(t, now) ?? 0) > LONG_WAIT_MIN).length;
    const due = data.queue.filter(feeDue);
    const today = data.appointments.filter((a) => a.date === todayIso());
    const toArrive = today.filter((a) => a.status === 'BOOKED');
    const nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();
    const lateAppts = toArrive.filter((a) => (slotMinutes(a.slot) ?? 0) + 15 < nowMin).length;
    const fuPending = data.followUps.filter((f) => f.status === 'PENDING_BOOKING');
    const fuOverdue = fuPending.filter((f) => f.followUpDate < todayIso()).length;
    const beds = data.beds.filter(isDaycareBed);
    return { waiting, longest, long, due, dueAmt: due.reduce((s, t) => s + (t.totalFee || 0), 0), today, toArrive, lateAppts, fuPending, fuOverdue, beds, bedsFree: beds.filter((b) => bedState(b) === 'available').length, bedsCleaning: beds.filter((b) => bedState(b) === 'cleaning').length, withDoctor: data.queue.filter(isWithDoctor).length };
  }, [data, now]);
  const col = deskCollections(data.queue);
  const shiftOpen = data.session.status === 'OPEN';

  const navGroups: HmsNavGroup[] = [
    {
      label: 'Front desk',
      items: [
        { key: 'queue', label: 'Live queue', icon: ListOrdered, count: m.waiting.length || undefined, alert: m.long > 0 },
        { key: 'appointments', label: 'Appointments', icon: CalendarCheck, count: m.toArrive.length || undefined, alert: m.lateAppts > 0 },
        { key: 'doctors', label: 'Doctors & chambers', icon: Stethoscope, count: data.doctors.length || undefined },
      ],
    },
    {
      label: 'Patients',
      items: [
        { key: 'patients', label: 'Patient directory', icon: Users, count: data.patients.length || undefined },
        { key: 'followups', label: 'Doctor follow-ups', icon: CalendarHeart, count: m.fuPending.length || undefined, alert: m.fuOverdue > 0 },
      ],
    },
    {
      label: 'Money & beds',
      items: [
        { key: 'fees', label: 'Fee collection', icon: Receipt, count: m.due.length || undefined, alert: m.due.some((t) => t.status === 'COMPLETED') },
        { key: 'beds', label: 'Day-care beds', icon: BedDouble, count: m.bedsFree || undefined, alert: m.bedsCleaning > 0 },
        { key: 'shift', label: 'Shift & cash', icon: Store, alert: !shiftOpen },
      ],
    },
  ];

  const callNext = () => {
    const next = [...m.waiting].sort((a, b) => {
      const r = (t: SharedQueueToken) => (t.priority === 'EMERGENCY' || t.status === 'EMERGENCY' ? 0 : t.priority === 'URGENT' || t.priority === 'VIP' ? 1 : 2);
      return r(a) - r(b) || a.token - b.token;
    })[0];
    if (!next) return show('Nobody is waiting', 'error');
    callToken(next);
  };
  const openTv = () => {
    const w = window.open('/reception?tv=1', 'north-lobby-tv', 'width=1280,height=720');
    if (!w) show('Allow pop-ups to open the lobby screen', 'error');
  };
  const sectionNew = () => {
    if (activeTab === 'patients') act.register();
    else if (activeTab === 'appointments') act.book();
    else act.walkIn();
  };

  const key = `${activeTab}-${initialFilter || ''}-${initialSelect || ''}`;
  const d = dialog;

  return (
    <HmsShell
      navLabel="Reception navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={(t) => goTo(t)}
      department={{ name: 'Front Desk & Reception', scope: `OPD · ${data.session.counterNumber}`, roleBadge: supervisor ? 'SUPERVISOR' : 'FRONT DESK', roleName: supervisor ? 'Front Office Supervisor' : 'Receptionist', responsibility: 'Registration, queue & desk fees' }}
      roleLabel={supervisor ? 'Front Office Supervisor' : 'Receptionist'}
      crumb="Reception · Front desk"
      crumbChip={
        <span style={{ marginLeft: '8px' }}>
          <HmsBadge tone="green" dot>
            Live
          </HmsBadge>
        </span>
      }
      statusChips={
        <>
          <button type="button" style={{ ...CHIP, color: shiftOpen ? HMS.label : '#b45309', borderColor: shiftOpen ? HMS.border : '#fde68a', background: shiftOpen ? '#ffffff' : '#fffbeb' }} onClick={() => goTo('shift')} title="Open shift & cash">
            <Store size={16} />
            {shiftOpen ? `${data.session.counterNumber} · drawer ${format((data.session.openingFloat || 0) + col.cash)}` : 'Counter closed'}
          </button>
          <button type="button" style={CHIP} onClick={openTv} title="Open the lobby calling screen (Alt+T)">
            <Tv size={16} />
            Lobby TV
          </button>
          <button type="button" style={CHIP} onClick={() => { data.reload(); show('Refreshed'); }} title="Refresh (Alt+R)" aria-keyshortcuts="Alt+R">
            <RefreshCw size={16} />
            {data.lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </button>
        </>
      }
      altShortcuts={{
        KeyW: () => act.walkIn(),
        KeyB: () => act.book(),
        KeyC: callNext,
        KeyN: sectionNew,
        KeyT: openTv,
        KeyR: () => { data.reload(); show('Refreshed'); },
      }}
      shortcutHelp={[
        ['Alt+W', 'Issue a walk-in token'],
        ['Alt+B', 'Book an appointment'],
        ['Alt+C', 'Call the next patient'],
        ['Alt+N', 'New in this section (register patient, book, token)'],
        ['Alt+T', 'Open the lobby TV screen'],
        ['Alt+R', 'Refresh'],
      ]}
    >
      <HmsToast toast={toast} onClose={clear} />

      <HmsPageHeader
        title="Front Desk Reception Workspace"
        description="Register patients, issue tokens and book appointments, call patients to chambers, collect desk fees, manage day-care beds and run the counter shift."
        actions={[
          { label: 'Call next', icon: Megaphone, onClick: callNext, shortcutKey: 'C' },
          { label: 'Book appointment', icon: CalendarPlus, onClick: () => act.book(), shortcutKey: 'B' },
          { label: 'Walk-in token', icon: Ticket, onClick: () => act.walkIn(), primary: true, shortcutKey: 'W' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'waiting',
            label: 'Waiting now',
            value: m.waiting.length,
            unit: `· ${m.withDoctor} with doctors`,
            badge: m.long ? { text: `${m.long} OVER ${LONG_WAIT_MIN} MIN`, tone: 'red' } : m.waiting.length ? { text: 'IN LOBBY', tone: 'blue' } : { text: 'CLEAR', tone: 'green' },
            alert: m.long > 0,
            caption: m.longest >= 0 ? `Longest wait ${fmtWait(m.longest)}` : 'Nobody waiting',
            captionTone: m.long ? 'amber' : 'muted',
            onOpen: () => goTo('queue', 'waiting'),
            title: 'Open the live queue',
          },
          {
            key: 'appointments',
            label: 'Appointments today',
            value: m.today.length,
            unit: `· ${m.toArrive.length} to arrive`,
            badge: m.lateAppts ? { text: `${m.lateAppts} LATE`, tone: 'amber' } : { text: 'TODAY', tone: 'gray' },
            caption: m.fuPending.length ? `${m.fuPending.length} doctor follow-up${m.fuPending.length === 1 ? '' : 's'} to book${m.fuOverdue ? ` · ${m.fuOverdue} overdue` : ''}` : 'No follow-ups waiting to be booked',
            captionTone: m.fuOverdue ? 'amber' : 'muted',
            onOpen: () => goTo('appointments', m.lateAppts ? 'late' : 'BOOKED'),
            title: 'Open appointments',
          },
          {
            key: 'fees',
            label: 'Fees to collect',
            value: format(m.dueAmt),
            unit: `· ${m.due.length} visits`,
            badge: m.due.some((t) => t.status === 'COMPLETED') ? { text: 'LEFT UNPAID', tone: 'red' } : m.due.length ? { text: 'COLLECT', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            caption: `${format(col.total)} collected at the desk today`,
            onOpen: () => goTo('fees', m.due.some((t) => t.status === 'COMPLETED') ? 'seen' : 'due'),
            title: 'Open fee collection',
          },
          {
            key: 'beds',
            label: 'Day-care beds free',
            value: m.beds.length ? m.bedsFree : null,
            unit: m.beds.length ? `of ${m.beds.length}` : undefined,
            badge: !m.beds.length ? { text: 'NOT SET UP', tone: 'gray' } : m.bedsFree ? { text: 'AVAILABLE', tone: 'green' } : { text: 'FULL', tone: 'red' },
            caption: m.beds.length ? `${m.bedsCleaning} waiting for housekeeping` : 'No day-care ward configured',
            captionTone: m.bedsCleaning ? 'amber' : 'muted',
            onOpen: () => goTo('beds', m.bedsCleaning ? 'cleaning' : 'available'),
            title: 'Open day-care beds',
          },
        ]}
      />

      {!shiftOpen && activeTab !== 'shift' && (
        <HmsNotice tone="amber" action={<HmsButton size="sm" icon={Store} onClick={() => setDialog({ kind: 'shift', mode: 'open' })}>Open shift</HmsButton>}>
          The counter is closed. Tokens and bookings work, but open a shift before taking money.
        </HmsNotice>
      )}

      {activeTab === 'queue' && <RecQueueView key={key} data={data} act={act} initialFilter={initialFilter} initialSelect={initialSelect} />}
      {activeTab === 'appointments' && <RecAppointmentsView key={key} data={data} act={act} initialFilter={initialFilter} initialSelect={initialSelect} />}
      {activeTab === 'doctors' && <RecDoctorsView key={key} data={data} act={act} initialFilter={initialFilter} />}
      {activeTab === 'patients' && <RecPatientsView key={key} data={data} act={act} initialFilter={initialFilter} initialSelect={initialSelect} />}
      {activeTab === 'followups' && <RecFollowUpsView key={key} data={data} act={act} initialFilter={initialFilter} />}
      {activeTab === 'fees' && <RecFeesView key={key} data={data} act={act} initialFilter={initialFilter} />}
      {activeTab === 'beds' && <RecBedsView key={key} data={data} act={act} initialFilter={initialFilter} />}
      {activeTab === 'shift' && <RecShiftView key={key} data={data} act={act} onOpenShift={() => setDialog({ kind: 'shift', mode: 'open' })} onCloseShift={() => setDialog({ kind: 'shift', mode: 'close' })} />}

      {d?.kind === 'walkin' && (
        <WalkInModal
          data={data}
          presetUhid={d.uhid}
          presetDoctor={d.doctor}
          notify={show}
          onClose={() => setDialog(null)}
          onRegister={() => setDialog({ kind: 'register', then: 'walkin' })}
          onIssued={(t) => {
            setDialog(null);
            data.reload();
            show(`Token ${tokenLabel(t.token)} issued to ${t.patient} for ${t.doctor.replace(/\s*\(.*\)$/, '')}${t.feePaid ? ` · ${t.paymentMode} collected` : ''}`);
            goTo('queue', 'waiting', String(t.token));
          }}
        />
      )}
      {d?.kind === 'book' && (
        <BookingModal
          data={data}
          preset={d.preset}
          existing={d.existing}
          bookedBy={userName}
          notify={show}
          onClose={() => setDialog(null)}
          onRegister={() => setDialog({ kind: 'register', then: 'book' })}
          onBooked={(a) => {
            setDialog(null);
            data.reload();
            show(`${a.patient} booked with ${a.doctor} on ${a.date === todayIso() ? 'today' : a.date} at ${a.slot}`);
            if (activeTab === 'appointments' || !d.preset?.followUpId) goTo('appointments', 'BOOKED', a.id);
          }}
        />
      )}
      {d?.kind === 'register' && (
        <RegisterPatientModal
          data={data}
          editing={d.editing}
          initialQuery={d.query}
          notify={show}
          onClose={() => setDialog(null)}
          onUseExisting={(p) => setDialog(d.then === 'book' ? { kind: 'book', preset: { uhid: p.uhid } } : { kind: 'walkin', uhid: p.uhid })}
          onSaved={(p, next) => {
            data.reload();
            show(d.editing ? `${patientName(p)} updated` : `${patientName(p)} registered · ${p.uhid}`);
            if (next === 'token' || d.then === 'walkin') setDialog({ kind: 'walkin', uhid: p.uhid });
            else if (next === 'book' || d.then === 'book') setDialog({ kind: 'book', preset: { uhid: p.uhid } });
            else setDialog(null);
          }}
        />
      )}
      {d?.kind === 'fee' && (
        <CollectFeeModal
          token={d.token}
          data={data}
          onClose={() => setDialog(null)}
          onPaid={(inv, mode) => {
            setDialog(null);
            data.reload();
            show(`${format(d.token.totalFee || 0)} collected by ${mode.toLowerCase()} · ${inv}`);
          }}
        />
      )}
      {d?.kind === 'reassign' && (
        <ReassignModal
          token={d.token}
          data={data}
          onClose={() => setDialog(null)}
          onDone={(doc) => {
            setDialog(null);
            data.reload();
            show(`Token ${tokenLabel(d.token.token)} moved to ${doc.name}`);
          }}
        />
      )}
      {d?.kind === 'shift' && (
        <ShiftModal
          mode={d.mode}
          data={data}
          userName={userName}
          expected={{ cash: col.cash, upi: col.upi, card: col.card }}
          onClose={() => setDialog(null)}
          onDone={(s) => {
            setDialog(null);
            data.reload();
            show(d.mode === 'open' ? `${s.counterNumber} opened with a float of ${format(s.openingFloat)}` : `Shift closed${s.variance && Math.abs(s.variance) >= 1 ? ` · ${s.variance > 0 ? 'excess' : 'short'} ${format(Math.abs(s.variance))}` : ' · cash matched'}`);
          }}
        />
      )}
    </HmsShell>
  );
};

export default ReceptionDeskWorkspace;
