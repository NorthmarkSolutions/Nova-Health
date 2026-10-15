// OPD Doctor workspace — HMS design bible, Section 19 (consultation keeps its 3-column layout, §15). Today's queue,
// the consultation, lab results with critical acknowledgement, patient history, inpatients and ward rounds,
// emergency calls, availability (blocks the front desk respects) and case-mix reports. The signed-in doctor is
// matched to the OPD doctor list; data is the shared patient-journey store the Reception, Nurse and Assistant desks
// use, and prescriptions and lab orders go to the pharmacy and lab servers.
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListOrdered, Stethoscope, FileText, Users, BedDouble, Siren, CalendarOff, BarChart3, Megaphone, UserCheck, CalendarX2, RefreshCw } from 'lucide-react';
import { HmsShell, HmsNavGroup, HmsPageHeader, HmsKpiRow, HmsToast, useHmsToast, HmsBadge, HmsNotice, HmsField, INPUT, HMS, PANEL } from '../../components/hms';
import { patientJourneyService, SharedQueueToken } from '../../services/patientJourneyService';
import { opdActions, useOpdApiErrors } from '../../services/opdActions';
import { useAuth } from '../../context/AuthContext';
import { RoleType } from '../../types';
import { LONG_WAIT_MIN, fmtWait, tokenLabel, waitMinutes } from '../reception/receptionData';
import { avgMin, isTodayDate } from '../nurse/nurseData';
import { SESSION, byChamberOrder, consultMinutes, isCalledIn, isEmergencyTok, isInChamber, isReady, isSeen, isTodayToken, isWaitingForDoctor } from '../assistant/assistantData';
import { SessionModal } from '../assistant/AssistantModals';
import { useDoctorData, DoctorActions, liveAlerts } from './doctorData';
import { DocQueueView } from './DocQueueView';
import { DocConsultView } from './DocConsultView';
import { DocResultsView } from './DocResultsView';
import { DocPatientsView } from './DocPatientsView';
import { DocWardView } from './DocWardView';
import { DocAlertsView } from './DocAlertsView';
import { DocAvailabilityView } from './DocAvailabilityView';
import { DocReportsView } from './DocReportsView';

const TABS = ['queue', 'consult', 'results', 'patients', 'ward', 'alerts', 'availability', 'reports'] as const;
type Tab = (typeof TABS)[number];
// Old ?tab= values keep working
const LEGACY: Record<string, Tab> = { dashboard: 'queue', appointments: 'queue', followups: 'queue', consultation: 'consult', prescriptions: 'results', investigations: 'results', schedule: 'availability', inpatient: 'ward' };

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

export const DoctorWorkspace: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const { user, role } = useAuth();
  const raw = params.get('tab') || '';
  const activeTab: Tab = (TABS as readonly string[]).includes(raw) ? (raw as Tab) : LEGACY[raw] || 'queue';
  const initialFilter = params.get('filter') || undefined;
  const initialSelect = params.get('select') || undefined;
  const userName = (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : '') || 'Doctor';
  const data = useDoctorData(user?.id ? String(user.id) : user?.username || '', role === RoleType.DOCTOR ? userName : '');
  const { toast, show, clear } = useHmsToast();
  useOpdApiErrors(show);
  const [session, setSession] = useState(false);
  const [newSignal, setNewSignal] = useState(0);
  const doc = data.doctor;

  const goTo = (tab: string, filter?: string, select?: string) => {
    const next: Record<string, string> = {};
    if (tab !== 'queue') next.tab = tab;
    if (filter) next.filter = filter;
    if (select) next.select = select;
    setParams(next);
  };

  const callIn = (t: SharedQueueToken) => {
    void opdActions.callIn(t, doc?.room?.roomNumber || t.room).then((done) => {
      data.reload();
      if (!done) return;
      chime();
      show(`${tokenLabel(t.token)} · ${t.patient} called to ${doc?.room?.roomNumber || t.room}`);
    });
  };
  const startConsult = (t: SharedQueueToken) => {
    void opdActions.seat(t, doc?.room?.roomNumber || t.room).then((done) => {
      data.reload();
      if (done) goTo('consult', undefined, String(t.token));
    });
  };
  const act: DoctorActions = { notify: show, goTo, userName, callIn, startConsult };

  const now = data.lastSync.getTime();
  const m = useMemo(() => {
    const sentForTests = (t: SharedQueueToken) => !!t.chamberHold?.startsWith('Sent for');
    const today = data.mine.filter(isTodayToken);
    const waiting = data.mine.filter((t) => isWaitingForDoctor(t) || sentForTests(t)).sort(byChamberOrder);
    const callable = waiting.filter((t) => !sentForTests(t) || !data.labOrders.some((o) => o.uhid === t.uhid && !o.cancelled && o.stage !== 'REPORT_GENERATED'));
    const back = waiting.filter((t) => sentForTests(t) && !data.labOrders.some((o) => o.uhid === t.uhid && !o.cancelled && o.stage !== 'REPORT_GENERATED')).length;
    const long = waiting.filter((t) => (waitMinutes(t, now) ?? 0) > LONG_WAIT_MIN).length;
    const emerg = waiting.filter(isEmergencyTok).length;
    const inRoom = data.mine.find((t) => isInChamber(t) || isCalledIn(t)) || null;
    const seen = today.filter(isSeen);
    const labs = data.labOrders.filter((o) => !o.cancelled);
    const crit = labs.filter((o) => o.stage === 'REPORT_GENERATED' && o.isFlaggedCritical && !o.criticalAcknowledged).length;
    const abnormal = labs.filter((o) => o.stage === 'REPORT_GENERATED' && !o.isFlaggedCritical && o.isFlaggedAbnormal).length;
    const pending = labs.filter((o) => o.stage !== 'REPORT_GENERATED').length;
    const toRound = data.beds.filter((b) => !data.roundNotes.some((n) => n.bedId === b.bed.id && n.admissionNo === (b.bed.inpatientDetails?.ipdAdmissionNo || '') && isTodayDate(new Date(n.at)))).length;
    const calls = liveAlerts(data.alerts).filter((a) => a.status === 'ACTIVE').length;
    return { waiting, callable, back, long, emerg, ready: waiting.filter(isReady).length, inRoom, seen, today, avgConsult: avgMin(seen.map(consultMinutes)), crit, abnormal, pending, toRound, calls };
  }, [data, now]);

  const navGroups: HmsNavGroup[] = [
    {
      label: 'Clinic',
      items: [
        { key: 'queue', label: "Today's queue", icon: ListOrdered, count: m.waiting.length || undefined, alert: m.emerg > 0 || m.long > 0 },
        { key: 'consult', label: 'Consultation', icon: Stethoscope, count: m.inRoom ? 1 : undefined },
      ],
    },
    {
      label: 'Patients & results',
      items: [
        { key: 'results', label: 'Lab results', icon: FileText, count: m.crit || m.abnormal || undefined, alert: m.crit > 0 },
        { key: 'patients', label: 'My patients', icon: Users },
      ],
    },
    {
      label: 'Inpatients & emergencies',
      items: [
        { key: 'ward', label: 'My inpatients', icon: BedDouble, count: m.toRound || undefined },
        { key: 'alerts', label: 'Emergency calls', icon: Siren, count: m.calls || undefined, alert: m.calls > 0 },
      ],
    },
    {
      label: 'Schedule & reports',
      items: [
        { key: 'availability', label: 'Availability', icon: CalendarOff, count: data.blocks.filter((b) => b.date >= new Date().toISOString().slice(0, 10)).length || undefined },
        { key: 'reports', label: 'Reports', icon: BarChart3 },
      ],
    },
  ];

  const nextPatient = () => {
    if (!doc) return show('Choose a doctor first', 'error');
    if (m.inRoom) return goTo('consult', undefined, String(m.inRoom.token));
    const next = m.callable[0];
    if (!next) return show('Nobody is waiting for you', 'error');
    callIn(next);
    goTo('consult', undefined, String(next.token));
  };
  const blockTime = () => {
    if (activeTab !== 'availability') goTo('availability', 'block');
    else setNewSignal((n) => n + 1);
  };
  const refresh = () => {
    data.reload();
    show('Refreshed');
  };
  const s = data.doctorSession;
  const key = `${activeTab}-${initialFilter || ''}-${initialSelect || ''}-${doc?.id || ''}`;

  return (
    <HmsShell
      navLabel="Doctor navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={(t) => goTo(t)}
      department={{ name: 'OPD · Consultant', scope: doc ? `${doc.specialty} · ${doc.room?.roomNumber || 'no chamber'}` : 'Doctor not matched', roleBadge: role === RoleType.DOCTOR ? 'DOCTOR' : 'ADMIN', roleName: doc ? doc.name : 'Doctor', responsibility: 'Consultation, results & rounds' }}
      roleLabel="OPD Doctor"
      crumb="OPD · Doctor"
      crumbChip={
        <span style={{ marginLeft: '8px' }}>
          <HmsBadge tone="green" dot>
            Live
          </HmsBadge>
        </span>
      }
      statusChips={
        <>
          {role !== RoleType.DOCTOR && (
            <label style={{ ...CHIP, padding: '0 6px 0 12px' }} title="Doctor">
              <Stethoscope size={16} />
              <select aria-label="Doctor" value={doc?.id || ''} onChange={(e) => { data.setDoctorId(e.target.value); setParams({}); }} style={{ border: 'none', background: 'transparent', fontSize: '13px', color: HMS.text, fontWeight: 600, maxWidth: '220px', cursor: 'pointer', outline: 'none' }}>
                <option value="">Choose doctor…</option>
                {data.doctors.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {m.calls > 0 && (
            <button type="button" style={{ ...CHIP, cursor: 'pointer', color: '#b91c1c', borderColor: '#fecaca', background: '#fef2f2' }} onClick={() => goTo('alerts')} title="Open emergency calls">
              <Siren size={16} />
              {m.calls} emergency call{m.calls === 1 ? '' : 's'}
            </button>
          )}
          {doc && (
            <button type="button" style={{ ...CHIP, cursor: 'pointer', color: s && s.status !== 'IN' ? '#b45309' : HMS.label, borderColor: s && s.status !== 'IN' ? '#fde68a' : HMS.border, background: s && s.status !== 'IN' ? '#fffbeb' : '#ffffff' }} onClick={() => setSession(true)} title="My status (Alt+S)" aria-keyshortcuts="Alt+S">
              <UserCheck size={16} />
              {s ? `${SESSION[s.status].label}${s.until ? ` · ${s.until}` : ''}` : 'Set my status'}
            </button>
          )}
          <button type="button" style={{ ...CHIP, cursor: 'pointer' }} onClick={refresh} title="Refresh (Alt+R)" aria-keyshortcuts="Alt+R">
            <RefreshCw size={16} />
            {data.lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </button>
        </>
      }
      altShortcuts={{ KeyC: nextPatient, KeyS: () => doc && setSession(true), KeyB: blockTime, KeyN: () => (activeTab === 'availability' ? blockTime() : nextPatient()), KeyR: refresh }}
      shortcutHelp={[
        ['Alt+C', 'Next patient (call in and open the consultation)'],
        ['Alt+S', 'Set my status'],
        ['Alt+B', 'Block time on my calendar'],
        ['Alt+N', 'New in this section (next patient, block time)'],
        ['Alt+R', 'Refresh'],
      ]}
    >
      <HmsToast toast={toast} onClose={clear} />

      <HmsPageHeader
        title="OPD Doctor Workspace"
        description="See today's patients with the nurse's vitals, consult and prescribe from the pharmacy formulary, order tests, review results, round on your inpatients and manage your availability."
        actions={[
          { label: 'My status', icon: UserCheck, onClick: () => doc && setSession(true), shortcutKey: 'S' },
          { label: 'Block time', icon: CalendarX2, onClick: blockTime, shortcutKey: 'B' },
          { label: m.inRoom ? 'Open consultation' : 'Next patient', icon: Megaphone, onClick: nextPatient, primary: true, shortcutKey: 'C' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'waiting',
            label: 'Waiting for you',
            value: doc ? m.waiting.length : null,
            unit: doc ? `· ${m.ready} triaged` : undefined,
            badge: !doc ? { text: 'NO DOCTOR', tone: 'gray' } : m.emerg ? { text: `${m.emerg} EMERGENCY`, tone: 'red' } : m.back ? { text: `${m.back} REPORTS BACK`, tone: 'green' } : m.long ? { text: `${m.long} OVER ${LONG_WAIT_MIN} MIN`, tone: 'amber' } : m.waiting.length ? { text: 'WAITING', tone: 'blue' } : { text: 'CLEAR', tone: 'green' },
            alert: m.emerg > 0,
            caption: m.inRoom ? `In the room: ${tokenLabel(m.inRoom.token)} ${m.inRoom.patient}` : m.callable[0] ? `Next: ${m.callable[0].patient} · waiting ${fmtWait(waitMinutes(m.callable[0], now))}` : 'Nobody waiting',
            onOpen: () => goTo('queue', 'waiting'),
            title: "Open today's queue",
          },
          {
            key: 'seen',
            label: 'Seen today',
            value: doc ? m.seen.length : null,
            unit: doc ? `of ${m.today.length}` : undefined,
            badge: { text: 'TODAY', tone: 'gray' },
            caption: m.avgConsult !== null ? `Average consultation ${fmtWait(m.avgConsult)}` : 'No consultation timings yet',
            onOpen: () => goTo('queue', 'seen'),
            title: 'Open patients seen today',
          },
          {
            key: 'results',
            label: 'Results to review',
            value: doc ? m.crit + m.abnormal : null,
            unit: doc ? `· ${m.pending} pending` : undefined,
            badge: m.crit ? { text: `${m.crit} CRITICAL`, tone: 'red' } : m.abnormal ? { text: 'ABNORMAL', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            alert: m.crit > 0,
            caption: m.crit ? 'Critical values waiting for your acknowledgement' : `${m.abnormal} abnormal report${m.abnormal === 1 ? '' : 's'}`,
            captionTone: m.crit ? 'amber' : 'muted',
            onOpen: () => goTo('results', m.crit ? 'critical' : 'abnormal'),
            title: 'Open lab results',
          },
          {
            key: 'ward',
            label: 'Inpatients',
            value: doc ? data.beds.length : null,
            unit: doc ? `· ${m.toRound} to round` : undefined,
            badge: m.calls ? { text: `${m.calls} CALL${m.calls === 1 ? '' : 'S'}`, tone: 'red' } : m.toRound ? { text: 'ROUNDS DUE', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            alert: m.calls > 0,
            caption: m.calls ? 'Emergency call waiting for a doctor' : data.beds.length ? 'Admitted and day-care patients under you' : 'No inpatients under you',
            captionTone: m.calls ? 'amber' : 'muted',
            onOpen: () => (m.calls ? goTo('alerts') : goTo('ward')),
            title: m.calls ? 'Open emergency calls' : 'Open my inpatients',
          },
        ]}
      />

      {!doc ? (
        <div style={{ ...PANEL, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '560px' }}>
          <HmsNotice tone={role === RoleType.DOCTOR ? 'amber' : 'blue'}>{role === RoleType.DOCTOR ? `${userName} is not in the OPD doctor list yet. Ask the OPD admin to add you with your fee and chamber; until then choose your entry below.` : 'Choose the doctor whose desk you want to open.'}</HmsNotice>
          <HmsField label="Doctor" htmlFor="doc-pick">
            <select id="doc-pick" style={INPUT} value="" onChange={(e) => e.target.value && data.setDoctorId(e.target.value)}>
              <option value="">Choose doctor…</option>
              {data.doctors.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} · {x.room ? x.room.roomNumber : 'no chamber'}
                </option>
              ))}
            </select>
          </HmsField>
        </div>
      ) : (
        <>
          {activeTab === 'queue' && <DocQueueView key={key} data={data} act={act} initialFilter={initialFilter} />}
          {activeTab === 'consult' && <DocConsultView key={key} data={data} act={act} initialSelect={initialSelect} />}
          {activeTab === 'results' && <DocResultsView key={key} data={data} act={act} initialFilter={initialFilter} />}
          {activeTab === 'patients' && <DocPatientsView key={key} data={data} act={act} initialFilter={initialFilter} />}
          {activeTab === 'ward' && <DocWardView key={key} data={data} act={act} initialFilter={initialFilter} />}
          {activeTab === 'alerts' && <DocAlertsView key={key} data={data} act={act} initialFilter={initialFilter} />}
          {activeTab === 'availability' && <DocAvailabilityView key={key} data={data} act={act} newSignal={newSignal} initialFilter={initialFilter} />}
          {activeTab === 'reports' && <DocReportsView key={key} data={data} act={act} />}
        </>
      )}

      {session && doc && (
        <SessionModal
          doctor={doc.name}
          current={s}
          userName={userName}
          onClose={() => setSession(false)}
          onDone={(x) => {
            setSession(false);
            data.reload();
            show(`Status: ${SESSION[x.status].label.toLowerCase()}${x.until ? ` until ${x.until}` : ''}`);
          }}
        />
      )}
    </HmsShell>
  );
};

export default DoctorWorkspace;
