// OPD Doctor Assistant (chamber desk) workspace — HMS design bible, Section 19. Works for one doctor at a time:
// the chamber queue with readiness, appointments, the clinic day and the doctor's status, outside reports, lab
// tracking (status only), follow-ups and the checkout after the consultation. Data is the shared patient-journey
// store the Reception, Nurse and Doctor desks use, so calls show on the lobby TV and bookings in the front desk book.
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListOrdered, CalendarCheck, Clock, FileText, FlaskConical, CalendarHeart, LogOut, Megaphone, FileUp, CalendarPlus, RefreshCw, Stethoscope, UserCheck } from 'lucide-react';
import { HmsShell, HmsNavGroup, HmsPageHeader, HmsKpiRow, HmsToast, useHmsToast, HmsBadge, HmsNotice, HmsField, INPUT, HMS, PANEL } from '../../components/hms';
import { patientJourneyService, SharedAppointment, SharedQueueToken } from '../../services/patientJourneyService';
import { useAuth } from '../../context/AuthContext';
import { BookingModal } from '../reception/ReceptionModals';
import { LONG_WAIT_MIN, fmtWait, slotMinutes, todayIso, tokenLabel, waitMinutes, sameDoctor } from '../reception/receptionData';
import { useAssistantData, AssistantActions, SESSION, byChamberOrder, isCalledIn, isEmergencyTok, isInChamber, isReady, isSeen, isTodayToken, isWaitingForDoctor } from './assistantData';
import { AttachDocumentModal, SessionModal } from './AssistantModals';
import { AstQueueView } from './AstQueueView';
import { AstAppointmentsView } from './AstAppointmentsView';
import { AstDayView } from './AstDayView';
import { AstDocumentsView } from './AstDocumentsView';
import { AstLabsView } from './AstLabsView';
import { AstFollowUpsView } from './AstFollowUpsView';
import { AstCheckoutView } from './AstCheckoutView';

const TABS = ['queue', 'appointments', 'day', 'documents', 'labs', 'followups', 'checkout'] as const;
type Tab = (typeof TABS)[number];
// Old ?tab= values keep working
const LEGACY: Record<string, Tab> = { investigations: 'labs', handoff: 'checkout' };

const CHIP: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 12px', border: `1px solid ${HMS.border}`, borderRadius: '10px', fontSize: '13px', color: HMS.label, background: '#ffffff', whiteSpace: 'nowrap' };

/** Three-note chime for a call into the chamber (Web Audio; silent if the browser blocks audio). */
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

type Dialog = { kind: 'attach'; uhid?: string } | { kind: 'book'; preset: Parameters<AssistantActions['book']>[0]; existing?: SharedAppointment } | { kind: 'session' } | null;

export const AssistantWorkspace: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const raw = params.get('tab') || '';
  const activeTab: Tab = (TABS as readonly string[]).includes(raw) ? (raw as Tab) : LEGACY[raw] || 'queue';
  const initialFilter = params.get('filter') || undefined;
  const initialSelect = params.get('select') || undefined;
  const data = useAssistantData(user?.id ? String(user.id) : user?.username || '');
  const { toast, show, clear } = useHmsToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const userName = (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : '') || 'Chamber desk';
  const doc = data.doctor;

  const goTo = (tab: string, filter?: string, select?: string) => {
    const next: Record<string, string> = {};
    if (tab !== 'queue') next.tab = tab;
    if (filter) next.filter = filter;
    if (select) next.select = select;
    setParams(next);
  };

  const callIn = (t: SharedQueueToken) => {
    patientJourneyService.updateQueueToken(t.token, { status: 'IN_CONSULTATION', callingStatus: 'CALLING', callPoint: undefined, chamberHold: undefined, calledAt: new Date().toISOString(), room: doc?.room?.roomNumber || t.room });
    chime();
    data.reload();
    show(`${tokenLabel(t.token)} · ${t.patient} called to ${doc?.room?.roomNumber || t.room}`);
  };

  const act: AssistantActions = {
    notify: show,
    goTo,
    userName,
    callIn,
    attach: (uhid) => setDialog({ kind: 'attach', uhid }),
    book: (preset) => setDialog({ kind: 'book', preset }),
    reschedule: (id) => {
      const a = data.appointments.find((x) => x.id === id);
      if (a) setDialog({ kind: 'book', preset: {}, existing: a });
    },
    logAction: (kind, ref, uhid, note) => patientJourneyService.addAssistantLog({ id: `alog-${new Date().getTime()}`, kind, ref, uhid, at: new Date().toISOString(), by: userName, note }),
  };

  const now = data.lastSync.getTime();
  const m = useMemo(() => {
    const today = data.mine.filter(isTodayToken);
    const waiting = data.mine.filter(isWaitingForDoctor).sort(byChamberOrder);
    const long = waiting.filter((t) => (waitMinutes(t, now) ?? 0) > LONG_WAIT_MIN).length;
    const emerg = waiting.filter(isEmergencyTok).length;
    const inRoom = data.mine.find((t) => isInChamber(t) || isCalledIn(t)) || null;
    const nowMin = new Date(now).getHours() * 60 + new Date(now).getMinutes();
    const appts = doc ? data.appointments.filter((a) => a.date === todayIso() && sameDoctor(a.doctor, doc.name)) : [];
    const toArrive = appts.filter((a) => a.status === 'BOOKED');
    const late = toArrive.filter((a) => (slotMinutes(a.slot) ?? 0) + 15 < nowMin).length;
    const told = new Set(data.log.filter((l) => l.kind === 'LAB_INFORMED').map((l) => l.ref));
    const labs = data.labOrders.filter((o) => !o.cancelled);
    const readyToTell = labs.filter((o) => o.stage === 'REPORT_GENERATED' && !told.has(o.id)).length;
    const inProgress = labs.filter((o) => o.stage !== 'REPORT_GENERATED').length;
    const overdue = labs.filter((o) => o.stage !== 'REPORT_GENERATED' && o.ageMin !== null && !!o.tatMin && o.ageMin > o.tatMin).length;
    const myUhids = new Set(data.mine.map((t) => t.uhid));
    const docsToShow = data.documents.filter((d) => !d.shownToDoctorAt && ((doc && d.doctor && sameDoctor(d.doctor, doc.name)) || myUhids.has(d.uhid))).length;
    const fus = doc ? data.followUps.filter((f) => sameDoctor(f.doctorName, doc.name) && f.status === 'PENDING_BOOKING') : [];
    const fuOverdue = fus.filter((f) => f.followUpDate < todayIso()).length;
    const seen = today.filter(isSeen);
    const toCheckout = seen.filter((t) => !t.handoff).length;
    return { waiting, long, emerg, ready: waiting.filter(isReady).length, inRoom, toArrive, late, readyToTell, inProgress, overdue, docsToShow, fus, fuOverdue, seen, toCheckout };
  }, [data, doc, now]);

  const navGroups: HmsNavGroup[] = [
    {
      label: 'Chamber',
      items: [
        { key: 'queue', label: 'Chamber queue', icon: ListOrdered, count: m.waiting.length || undefined, alert: m.emerg > 0 || m.long > 0 },
        { key: 'appointments', label: 'Appointments', icon: CalendarCheck, count: m.toArrive.length || undefined, alert: m.late > 0 },
        { key: 'day', label: 'Clinic day', icon: Clock },
      ],
    },
    {
      label: 'Patient support',
      items: [
        { key: 'documents', label: 'Outside reports', icon: FileText, count: m.docsToShow || undefined },
        { key: 'labs', label: 'Lab tracking', icon: FlaskConical, count: m.readyToTell || undefined, alert: m.overdue > 0 },
        { key: 'followups', label: 'Follow-ups', icon: CalendarHeart, count: m.fus.length || undefined, alert: m.fuOverdue > 0 },
      ],
    },
    {
      label: 'After consultation',
      items: [{ key: 'checkout', label: 'Checkout', icon: LogOut, count: m.toCheckout || undefined }],
    },
  ];

  const callNext = () => {
    if (!doc) return show('Choose the doctor you assist first', 'error');
    if (m.inRoom) return show(`${tokenLabel(m.inRoom.token)} ${m.inRoom.patient} is ${isInChamber(m.inRoom) ? 'with the doctor' : 'being called in'}`, 'error');
    const next = m.waiting[0];
    if (!next) return show('Nobody is waiting for the doctor', 'error');
    callIn(next);
  };
  const sectionNew = () => {
    if (activeTab === 'documents') act.attach();
    else if (activeTab === 'appointments' || activeTab === 'followups') act.book({});
    else callNext();
  };
  const refresh = () => {
    data.reload();
    show('Refreshed');
  };
  const s = data.doctorSession;
  const consultFor = m.inRoom?.seatedAt ? Math.round((now - new Date(m.inRoom.seatedAt).getTime()) / 60000) : null;
  const key = `${activeTab}-${initialFilter || ''}-${initialSelect || ''}-${doc?.id || ''}`;
  const d = dialog;

  return (
    <HmsShell
      navLabel="Chamber desk navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={(t) => goTo(t)}
      department={{ name: 'OPD Chamber Desk', scope: doc ? `${doc.name.replace(/\s*\(.*\)$/, '')} · ${doc.room?.roomNumber || 'no chamber'}` : 'Doctor not chosen', roleBadge: 'ASSISTANT', roleName: 'Doctor Assistant', responsibility: 'Chamber queue, reports & checkout' }}
      roleLabel="Doctor Assistant"
      crumb="OPD · Chamber desk"
      crumbChip={
        <span style={{ marginLeft: '8px' }}>
          <HmsBadge tone="green" dot>
            Live
          </HmsBadge>
        </span>
      }
      statusChips={
        <>
          <label style={{ ...CHIP, padding: '0 6px 0 12px' }} title="The doctor you are assisting">
            <Stethoscope size={16} />
            <select aria-label="Doctor you are assisting" value={doc?.id || ''} onChange={(e) => { data.setDoctorId(e.target.value); setParams({}); }} style={{ border: 'none', background: 'transparent', fontSize: '13px', color: HMS.text, fontWeight: 600, maxWidth: '220px', cursor: 'pointer', outline: 'none' }}>
              <option value="">Choose doctor…</option>
              {data.doctors.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          {doc && (
            <button type="button" style={{ ...CHIP, cursor: 'pointer', color: s && s.status !== 'IN' ? '#b45309' : HMS.label, borderColor: s && s.status !== 'IN' ? '#fde68a' : HMS.border, background: s && s.status !== 'IN' ? '#fffbeb' : '#ffffff' }} onClick={() => setDialog({ kind: 'session' })} title="Doctor status (Alt+S)" aria-keyshortcuts="Alt+S">
              <UserCheck size={16} />
              {s ? `${SESSION[s.status].label}${s.until ? ` · ${s.until}` : ''}` : 'Set doctor status'}
            </button>
          )}
          <button type="button" style={{ ...CHIP, cursor: 'pointer' }} onClick={refresh} title="Refresh (Alt+R)" aria-keyshortcuts="Alt+R">
            <RefreshCw size={16} />
            {data.lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </button>
        </>
      }
      altShortcuts={{ KeyC: callNext, KeyB: () => act.book({}), KeyA: () => act.attach(), KeyN: sectionNew, KeyS: () => doc && setDialog({ kind: 'session' }), KeyR: refresh }}
      shortcutHelp={[
        ['Alt+C', 'Call the next patient into the chamber'],
        ['Alt+B', 'Book a visit'],
        ['Alt+A', 'Attach an outside report'],
        ['Alt+S', 'Set the doctor’s status'],
        ['Alt+N', 'New in this section (attach, book, call next)'],
        ['Alt+R', 'Refresh'],
      ]}
    >
      <HmsToast toast={toast} onClose={clear} />

      <HmsPageHeader
        title="OPD Doctor Assistant Workspace"
        description="Run the doctor's chamber: call patients in when they are ready, keep outside reports and lab status in hand, book follow-ups and check patients out to pharmacy, lab or billing."
        actions={[
          { label: 'Book visit', icon: CalendarPlus, onClick: () => act.book({}), shortcutKey: 'B' },
          { label: 'Attach report', icon: FileUp, onClick: () => act.attach(), shortcutKey: 'A' },
          { label: 'Call next', icon: Megaphone, onClick: callNext, primary: true, shortcutKey: 'C' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'waiting',
            label: 'Waiting for doctor',
            value: doc ? m.waiting.length : null,
            unit: doc ? `· ${m.ready} ready` : undefined,
            badge: !doc ? { text: 'NO DOCTOR', tone: 'gray' } : m.emerg ? { text: `${m.emerg} EMERGENCY`, tone: 'red' } : m.long ? { text: `${m.long} OVER ${LONG_WAIT_MIN} MIN`, tone: 'red' } : m.waiting.length ? { text: `NEXT ${tokenLabel(m.waiting[0].token)}`, tone: 'blue' } : { text: 'CLEAR', tone: 'green' },
            alert: m.emerg > 0,
            caption: !doc ? 'Choose the doctor you assist' : m.waiting[0] ? `Next: ${m.waiting[0].patient} · waiting ${fmtWait(waitMinutes(m.waiting[0], now))}` : 'Nobody waiting',
            captionTone: m.long ? 'amber' : 'muted',
            onOpen: () => goTo('queue', 'waiting'),
            title: 'Open the chamber queue',
          },
          {
            key: 'chamber',
            label: 'In the chamber',
            value: !doc ? null : m.inRoom ? tokenLabel(m.inRoom.token) : 'Free',
            unit: m.inRoom ? `· ${m.inRoom.patient}` : undefined,
            badge: s ? { text: SESSION[s.status].label.toUpperCase(), tone: SESSION[s.status].tone === 'blue' ? 'blue' : SESSION[s.status].tone } : { text: 'STATUS NOT SET', tone: 'gray' },
            alert: s?.status === 'LATE',
            caption: m.inRoom ? (isInChamber(m.inRoom) ? (consultFor !== null ? `With the doctor ${fmtWait(consultFor)}` : 'With the doctor') : 'Called — waiting for the patient') : s?.note || (doc ? 'Ready for the next patient' : '—'),
            onOpen: () => goTo('queue', 'chamber'),
            title: 'Open the patient in the chamber',
          },
          {
            key: 'labs',
            label: 'Reports to tell',
            value: doc ? m.readyToTell : null,
            unit: doc ? `· ${m.inProgress} in progress` : undefined,
            badge: m.overdue ? { text: `${m.overdue} OVERDUE`, tone: 'red' } : m.readyToTell ? { text: 'READY', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            caption: m.docsToShow ? `${m.docsToShow} outside report${m.docsToShow === 1 ? '' : 's'} to show the doctor` : 'No outside reports waiting',
            captionTone: m.docsToShow ? 'amber' : 'muted',
            onOpen: () => goTo('labs', m.overdue ? 'overdue' : 'ready'),
            title: 'Open lab tracking',
          },
          {
            key: 'checkout',
            label: 'To check out',
            value: doc ? m.toCheckout : null,
            unit: doc ? `· ${m.seen.length} seen today` : undefined,
            badge: m.toCheckout ? { text: 'WAITING', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            caption: m.fus.length ? `${m.fus.length} follow-up${m.fus.length === 1 ? '' : 's'} to book${m.fuOverdue ? ` · ${m.fuOverdue} overdue` : ''}` : 'No follow-ups waiting to be booked',
            captionTone: m.fuOverdue ? 'amber' : 'muted',
            onOpen: () => goTo('checkout'),
            title: 'Open checkout',
          },
        ]}
      />

      {!doc ? (
        <div style={{ ...PANEL, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '560px' }}>
          <HmsNotice tone="blue">Choose the doctor you are assisting today. The desk remembers it on this computer.</HmsNotice>
          <HmsField label="Doctor" htmlFor="ast-doc">
            <select id="ast-doc" style={INPUT} value="" onChange={(e) => e.target.value && data.setDoctorId(e.target.value)}>
              <option value="">Choose doctor…</option>
              {data.doctors.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} · {x.room ? x.room.roomNumber : 'no chamber'}
                </option>
              ))}
            </select>
          </HmsField>
          {data.doctors.length === 0 && <HmsNotice tone="amber">No OPD doctors are set up in the department tariff. Ask the OPD admin to add them.</HmsNotice>}
        </div>
      ) : (
        <>
          {activeTab === 'queue' && <AstQueueView key={key} data={data} act={act} initialFilter={initialFilter} initialSelect={initialSelect} />}
          {activeTab === 'appointments' && <AstAppointmentsView key={key} data={data} act={act} initialFilter={initialFilter} />}
          {activeTab === 'day' && <AstDayView key={key} data={data} act={act} initialFilter={initialFilter} onSession={() => setDialog({ kind: 'session' })} />}
          {activeTab === 'documents' && <AstDocumentsView key={key} data={data} act={act} initialFilter={initialFilter} />}
          {activeTab === 'labs' && <AstLabsView key={key} data={data} act={act} initialFilter={initialFilter} />}
          {activeTab === 'followups' && <AstFollowUpsView key={key} data={data} act={act} initialFilter={initialFilter} />}
          {activeTab === 'checkout' && <AstCheckoutView key={key} data={data} act={act} initialFilter={initialFilter} initialSelect={initialSelect} />}
        </>
      )}

      {d?.kind === 'attach' && (
        <AttachDocumentModal
          data={data}
          presetUhid={d.uhid}
          userName={userName}
          onClose={() => setDialog(null)}
          onDone={(x) => {
            setDialog(null);
            data.reload();
            show(`${x.title} attached to ${x.patientName}'s file`);
          }}
        />
      )}
      {d?.kind === 'book' && (
        <BookingModal
          data={data}
          preset={{ doctor: doc?.name, ...d.preset }}
          existing={d.existing}
          bookedBy={`${userName} (chamber desk)`}
          notify={show}
          onClose={() => setDialog(null)}
          onRegister={() => show('New patients are registered at the front desk', 'error')}
          onBooked={(a) => {
            setDialog(null);
            data.reload();
            show(`${a.patient} booked with ${a.doctor} on ${a.date === todayIso() ? 'today' : a.date} at ${a.slot}`);
          }}
        />
      )}
      {d?.kind === 'session' && doc && (
        <SessionModal
          doctor={doc.name}
          current={s}
          userName={userName}
          onClose={() => setDialog(null)}
          onDone={(x) => {
            setDialog(null);
            data.reload();
            show(`${doc.name}: ${SESSION[x.status].label.toLowerCase()}${x.until ? ` until ${x.until}` : ''}`);
          }}
        />
      )}
    </HmsShell>
  );
};

export default AssistantWorkspace;
