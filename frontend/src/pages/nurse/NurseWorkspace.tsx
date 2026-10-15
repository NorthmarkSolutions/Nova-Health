// OPD Nurse workspace (HMS design bible, Section 19). Triage queue and the vitals / triage assessment, day-care
// observation charts, treatment room, specimen collection, lab results with critical read-back, shift handover and
// the triage register. Data is the shared patient-journey store the Reception, Doctor and Assistant desks use,
// so tokens arrive from the front desk and triaged patients land in the doctor's queue.
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListOrdered, Activity, BedDouble, Syringe, FlaskConical, FileText, ClipboardList, ClipboardCheck, Megaphone, Siren, PlayCircle, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { HmsShell, HmsNavGroup, HmsPageHeader, HmsKpiRow, HmsToast, useHmsToast, HmsBadge, HMS } from '../../components/hms';
import { patientJourneyService, SharedQueueToken } from '../../services/patientJourneyService';
import { opdApiMode } from '../../services/opdService';
import { opdActions, useOpdApiErrors } from '../../services/opdActions';
import { useAuth } from '../../context/AuthContext';
import { RoleType } from '../../types';
import { fmtWait, LONG_WAIT_MIN, tokenLabel, waitMinutes } from '../reception/receptionData';
import { resolveNurseTab, NurseTabKey } from './nurseTabs';
import { useNurseData, NurseActions, SHIFTS, TRIAGE_POINT, avgMin, byTriageOrder, chartFor, clinicDoses, criticalOpen, currentShift, inLab, isEmergency, isInTriage, isOpdOrder, isReadyForDoctor, isToTriage, obsDue, timeToTriage, toCollect, triagedToday } from './nurseData';
import { CodeBlueModal } from './NurseModals';
import { NurseQueueView } from './NurseQueueView';
import { NurseVitalsView } from './NurseVitalsView';
import { NurseObservationView } from './NurseObservationView';
import { NurseTreatmentView } from './NurseTreatmentView';
import { NurseSpecimensView } from './NurseSpecimensView';
import { NurseResultsView } from './NurseResultsView';
import { NurseHandoverView } from './NurseHandoverView';
import { NurseRegisterView } from './NurseRegisterView';

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

/** Two-note chime for a call to the triage station (Web Audio; silent if the browser blocks audio). */
const chime = () => {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
    osc.start();
    osc.stop(ctx.currentTime + 0.85);
  } catch {
    /* audio is optional */
  }
};

type CodeBluePreset = Parameters<NurseActions['codeBlue']>[0];

export const NurseWorkspace: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const { user, role } = useAuth();
  const activeTab: NurseTabKey = resolveNurseTab(params.get('tab'));
  const initialFilter = params.get('filter') || undefined;
  const initialSelect = params.get('select') || undefined;
  const data = useNurseData();
  const { toast, show, clear } = useHmsToast();
  useOpdApiErrors(show);
  const [codeBlue, setCodeBlue] = useState<{ preset?: CodeBluePreset } | null>(null);
  const [newSignal, setNewSignal] = useState(0);
  const userName = (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : '') || 'Duty nurse';
  const nurse = role === RoleType.NURSE;

  const goTo = (tab: string, filter?: string, select?: string) => {
    const next: Record<string, string> = {};
    if (tab !== 'queue') next.tab = tab;
    if (filter) next.filter = filter;
    if (select) next.select = select;
    setParams(next);
  };

  const callToTriage = (t: SharedQueueToken) => {
    void opdActions.callToTriage(t, TRIAGE_POINT).then((done) => {
      data.reload();
      if (!done) return;
      chime();
      show(`${tokenLabel(t.token)} · ${t.patient} called to the triage station`);
    });
  };
  const startTriage = (t: SharedQueueToken) => {
    if (!isReadyForDoctor(t)) void opdActions.startTriage(t).then(() => data.reload());
    else data.reload();
    goTo('vitals', isReadyForDoctor(t) ? 'ready' : 'intriage', String(t.token));
  };

  const act: NurseActions = {
    notify: show,
    goTo,
    userName,
    callToTriage,
    startTriage,
    codeBlue: (preset) => setCodeBlue({ preset }),
  };

  const now = data.lastSync.getTime();
  const m = useMemo(() => {
    const toTriage = data.queue.filter(isToTriage).sort(byTriageOrder);
    const longest = Math.max(-1, ...toTriage.map((t) => waitMinutes(t, now) ?? -1));
    const long = toTriage.filter((t) => (waitMinutes(t, now) ?? 0) > LONG_WAIT_MIN).length;
    const emergWaiting = toTriage.filter(isEmergency).length;
    const inTriage = data.queue.filter(isInTriage).length;
    const ready = data.queue.filter(isReadyForDoctor).length;
    const triaged = data.queue.filter(triagedToday);
    const bedInfo = data.occupiedBeds.map((b) => obsDue(chartFor(data.chart, b), now));
    const obsDueNow = bedInfo.filter((d) => d.dueIn <= 0).length;
    const highNews = bedInfo.filter((d) => (d.last?.news2 ?? -1) >= 5).length;
    const opd = data.labOrders.filter(isOpdOrder);
    const collect = opd.filter((o) => toCollect(o) && o.billingOk !== false);
    const blocked = opd.filter((o) => toCollect(o) && o.billingOk === false).length;
    const stat = collect.filter((o) => o.priority === 'STAT').length;
    const crit = opd.filter(criticalOpen).length;
    const toGive = clinicDoses(data.prescriptions, data.procedures).filter((d) => !d.done).length;
    const myAlerts = data.alerts.filter((a) => (opdApiMode() || /^eal-\d{13}$/.test(a.id)) && a.status === 'ACTIVE').length;
    return { toTriage, longest, long, emergWaiting, inTriage, ready, triaged, avgToTriage: avgMin(triaged.map(timeToTriage)), obsDueNow, highNews, collect, blocked, stat, crit, inLab: opd.filter(inLab).length, toGive, myAlerts };
  }, [data, now]);
  const shift = currentShift(data.lastSync);

  const navGroups: HmsNavGroup[] = [
    {
      label: 'Triage',
      items: [
        { key: 'queue', label: 'Triage queue', icon: ListOrdered, count: m.toTriage.length || undefined, alert: m.emergWaiting > 0 || m.long > 0 },
        { key: 'vitals', label: 'Vitals & assessment', icon: Activity, count: m.inTriage || undefined },
      ],
    },
    {
      label: 'Care',
      items: [
        { key: 'observation', label: 'Day-care observation', icon: BedDouble, count: data.occupiedBeds.length || undefined, alert: m.obsDueNow > 0 },
        { key: 'treatment', label: 'Treatment room', icon: Syringe, count: m.toGive || undefined },
        { key: 'specimens', label: 'Specimen collection', icon: FlaskConical, count: m.collect.length || undefined, alert: m.stat > 0 },
        { key: 'results', label: 'Lab results', icon: FileText, count: m.crit || undefined, alert: m.crit > 0 },
      ],
    },
    {
      label: 'Shift',
      items: [
        { key: 'handover', label: 'Shift handover', icon: ClipboardList },
        { key: 'register', label: 'Triage register', icon: ClipboardCheck, count: m.triaged.length || undefined },
      ],
    },
  ];

  const next = m.toTriage[0];
  const callNext = () => (next ? callToTriage(next) : show('Nobody is waiting for triage', 'error'));
  const triageNext = () => {
    const inProgress = data.queue.filter(isInTriage).sort(byTriageOrder)[0];
    const t = inProgress || next;
    if (!t) return show('Nobody is waiting for triage', 'error');
    startTriage(t);
  };
  const sectionNew = () => {
    if (activeTab === 'treatment' || activeTab === 'handover') setNewSignal((n) => n + 1);
    else if (activeTab === 'queue' || activeTab === 'vitals') triageNext();
    else show('Nothing to add in this section', 'error');
  };
  const refresh = () => {
    data.reload();
    show('Refreshed');
  };

  const key = `${activeTab}-${initialFilter || ''}-${initialSelect || ''}`;

  return (
    <HmsShell
      navLabel="Nurse navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={(t) => goTo(t)}
      department={{ name: 'OPD Nursing', scope: 'OPD · Triage · Day-care', roleBadge: nurse ? 'NURSE' : 'ADMIN', roleName: 'Staff Nurse', responsibility: 'Triage, observation & treatment room' }}
      roleLabel="OPD Staff Nurse"
      crumb="OPD · Nurse station"
      crumbChip={
        <span style={{ marginLeft: '8px' }}>
          <HmsBadge tone="green" dot>
            Live
          </HmsBadge>
        </span>
      }
      statusChips={
        <>
          <span style={CHIP} title={`${SHIFTS[shift].label} ${SHIFTS[shift].hours}`}>
            <Clock size={16} />
            {SHIFTS[shift].label} · {SHIFTS[shift].hours}
          </span>
          {m.myAlerts > 0 && (
            <span style={{ ...CHIP, color: '#b91c1c', borderColor: '#fecaca', background: '#fef2f2' }} title="Emergency calls from this station not yet attended by a doctor">
              <Siren size={16} />
              {m.myAlerts} call{m.myAlerts === 1 ? '' : 's'} open
            </span>
          )}
          {data.labError && (
            <span style={{ ...CHIP, color: '#b45309', borderColor: '#fde68a', background: '#fffbeb' }} title={data.labError}>
              <AlertTriangle size={16} />
              Lab not reachable
            </span>
          )}
          <button type="button" style={{ ...CHIP, cursor: 'pointer' }} onClick={refresh} title="Refresh (Alt+R)" aria-keyshortcuts="Alt+R">
            <RefreshCw size={16} />
            {data.lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </button>
        </>
      }
      altShortcuts={{
        KeyC: callNext,
        KeyB: () => setCodeBlue({}),
        KeyT: triageNext,
        KeyN: sectionNew,
        KeyR: refresh,
      }}
      shortcutHelp={[
        ['Alt+T', 'Triage the next patient'],
        ['Alt+C', 'Call the next patient to the triage station'],
        ['Alt+B', 'Code Blue / rapid response'],
        ['Alt+N', 'New in this section (triage next, record procedure, hand over)'],
        ['Alt+R', 'Refresh'],
      ]}
    >
      <HmsToast toast={toast} onClose={clear} />

      <HmsPageHeader
        title="OPD Nurse Workspace"
        description="Triage and vitals for today's OPD patients, day-care observation, treatment room, sample collection, lab results and the shift handover."
        actions={[
          { label: 'Call next', icon: Megaphone, onClick: callNext, shortcutKey: 'C' },
          { label: 'Code Blue', icon: Siren, onClick: () => setCodeBlue({}), shortcutKey: 'B' },
          { label: 'Triage next', icon: PlayCircle, onClick: triageNext, primary: true, shortcutKey: 'T' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'triage',
            label: 'Waiting for triage',
            value: m.toTriage.length,
            unit: `· ${m.inTriage} in triage`,
            badge: m.emergWaiting ? { text: `${m.emergWaiting} EMERGENCY`, tone: 'red' } : m.long ? { text: `${m.long} OVER ${LONG_WAIT_MIN} MIN`, tone: 'red' } : m.toTriage.length ? { text: 'WAITING', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            alert: m.emergWaiting > 0 || m.long > 0,
            caption: m.longest >= 0 ? `Longest wait ${fmtWait(m.longest)}` : 'Nobody waiting',
            captionTone: m.long ? 'amber' : 'muted',
            onOpen: () => goTo('queue', m.emergWaiting ? 'emergency' : 'totriage'),
            title: 'Open the triage queue',
          },
          {
            key: 'triaged',
            label: 'Triaged today',
            value: m.triaged.length,
            unit: `· ${m.ready} waiting for doctor`,
            badge: { text: 'TODAY', tone: 'gray' },
            caption: m.avgToTriage !== null ? `Average time to triage ${fmtWait(m.avgToTriage)}` : 'No triage timings yet',
            captionTone: m.avgToTriage !== null && m.avgToTriage > LONG_WAIT_MIN ? 'amber' : 'muted',
            onOpen: () => goTo('register'),
            title: 'Open the triage register',
          },
          {
            key: 'beds',
            label: 'Day-care patients',
            value: data.daycareBeds.length ? data.occupiedBeds.length : null,
            unit: data.daycareBeds.length ? `of ${data.daycareBeds.length} beds` : undefined,
            badge: !data.daycareBeds.length ? { text: 'NOT SET UP', tone: 'gray' } : m.obsDueNow ? { text: `${m.obsDueNow} OBS DUE`, tone: 'red' } : m.highNews ? { text: `${m.highNews} NEWS2 5+`, tone: 'amber' } : data.occupiedBeds.length ? { text: 'ON CHART', tone: 'blue' } : { text: 'EMPTY', tone: 'gray' },
            alert: m.obsDueNow > 0,
            caption: data.daycareBeds.length ? (m.highNews ? `${m.highNews} with NEWS2 of 5 or more` : 'Observations timed from the last score') : 'No day-care ward configured',
            captionTone: m.highNews ? 'amber' : 'muted',
            onOpen: () => goTo('observation', m.obsDueNow ? 'due' : undefined),
            title: 'Open day-care observation',
          },
          {
            key: 'samples',
            label: 'Samples to collect',
            value: m.collect.length,
            unit: m.blocked ? `· ${m.blocked} unpaid` : undefined,
            badge: m.crit ? { text: `${m.crit} CRITICAL`, tone: 'red' } : m.stat ? { text: `${m.stat} STAT`, tone: 'amber' } : m.collect.length ? { text: 'COLLECT', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            alert: m.crit > 0,
            caption: m.crit ? `${m.crit} critical result${m.crit === 1 ? '' : 's'} to read back` : `${m.inLab} in the lab`,
            captionTone: m.crit ? 'amber' : 'muted',
            onOpen: () => (m.crit ? goTo('results', 'critical') : goTo('specimens', 'collect')),
            title: m.crit ? 'Open critical lab results' : 'Open specimen collection',
          },
        ]}
      />

      {activeTab === 'queue' && <NurseQueueView key={key} data={data} act={act} initialFilter={initialFilter} initialSelect={initialSelect} />}
      {activeTab === 'vitals' && <NurseVitalsView key={key} data={data} act={act} initialFilter={initialFilter} initialSelect={initialSelect} />}
      {activeTab === 'observation' && <NurseObservationView key={key} data={data} act={act} initialFilter={initialFilter} />}
      {activeTab === 'treatment' && <NurseTreatmentView key={key} data={data} act={act} initialFilter={initialFilter} newSignal={newSignal} />}
      {activeTab === 'specimens' && <NurseSpecimensView key={key} data={data} act={act} initialFilter={initialFilter} />}
      {activeTab === 'results' && <NurseResultsView key={key} data={data} act={act} initialFilter={initialFilter} />}
      {activeTab === 'handover' && <NurseHandoverView key={key} data={data} act={act} newSignal={newSignal} />}
      {activeTab === 'register' && <NurseRegisterView key={key} data={data} act={act} initialFilter={initialFilter} />}

      {codeBlue && (
        <CodeBlueModal
          data={data}
          preset={codeBlue.preset}
          onClose={() => setCodeBlue(null)}
          onDone={(where) => {
            setCodeBlue(null);
            chime();
            data.reload();
            show(`Emergency team called to ${where}`, 'error');
          }}
        />
      )}
    </HmsShell>
  );
};

export default NurseWorkspace;
