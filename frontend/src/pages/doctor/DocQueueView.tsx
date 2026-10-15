// Doctor — today's queue. Emergencies, triaged and "back with reports" patients first, each with the nurse's vitals,
// triage category and early warning score at a glance. Call the patient in, or open the consultation.
import React, { useState } from 'react';
import { Megaphone, Stethoscope, Play } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, initialsOf } from '../../components/hms';
import { patientJourneyService, SharedQueueToken } from '../../services/patientJourneyService';
import { MONO, fmtWait, LONG_WAIT_MIN, tokenLabel, waitMinutes } from '../reception/receptionData';
import { NEWS_BAND, bandOfScore, categoryOf, clock } from '../nurse/nurseData';
import { byChamberOrder, chamberStatus, isCalledIn, isEmergencyTok, isInChamber, isSeen, isWaitingForDoctor } from '../assistant/assistantData';
import { DoctorActions, DoctorData } from './doctorData';

export interface DocQueueViewProps {
  data: DoctorData;
  act: DoctorActions;
  initialFilter?: string;
}

const PILLS = ['all', 'room', 'waiting', 'reports', 'seen'];

export const DocQueueView: React.FC<DocQueueViewProps> = ({ data, act, initialFilter }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'waiting');
  const [selected, setSelected] = useState<string | null>(null);
  const now = data.lastSync.getTime();

  const pendingFor = (t: SharedQueueToken) => data.labOrders.filter((o) => o.uhid === t.uhid && !o.cancelled && o.stage !== 'REPORT_GENERATED').length;
  const sentForTests = (t: SharedQueueToken) => !!t.chamberHold?.startsWith('Sent for');
  const backWithReports = (t: SharedQueueToken) => sentForTests(t) && pendingFor(t) === 0;
  const all = data.mine.filter((t) => t.status !== 'CANCELLED');
  const waitingish = (t: SharedQueueToken) => isWaitingForDoctor(t) || sentForTests(t);
  const match: Record<string, (t: SharedQueueToken) => boolean> = {
    waiting: waitingish,
    reports: sentForTests,
    room: (t) => isInChamber(t) || isCalledIn(t),
    seen: isSeen,
    all: () => true,
  };
  const rankBack = (t: SharedQueueToken) => (backWithReports(t) ? 0 : sentForTests(t) ? 2 : 1);
  const q = search.trim().toLowerCase();
  const list = all.filter((t) => match[pill](t) && (!q || [t.patient, t.uhid, String(t.token)].some((v) => (v || '').toLowerCase().includes(q)))).sort((a, b) => (isEmergencyTok(a) === isEmergencyTok(b) ? rankBack(a) - rankBack(b) || byChamberOrder(a, b) : isEmergencyTok(a) ? -1 : 1));
  const status = (t: SharedQueueToken) => (backWithReports(t) ? { label: 'Reports back', tone: 'green' as const } : sentForTests(t) ? { label: 'At tests', tone: 'gray' as const } : chamberStatus(t));
  const rows: HmsListRow[] = list.map((t) => {
    const s = status(t);
    const band = bandOfScore(t.vitals?.news2);
    return {
      key: `t:${t.token}`,
      title: `${tokenLabel(t.token)} · ${t.patient}`,
      badge: <HmsBadge tone={s.tone}>{s.label}</HmsBadge>,
      sub: <><span style={MONO}>{t.uhid}</span> · {t.age ? `${t.age} y` : '—'} {t.gender ? t.gender[0] : ''} · {t.assessment?.chiefComplaint || t.type || 'Visit'}</>,
      metaLeft: isSeen(t) ? `Seen ${t.checkoutTime || ''}` : <span style={{ color: (waitMinutes(t, now) ?? 0) > LONG_WAIT_MIN ? '#b45309' : undefined }}>Waiting {fmtWait(waitMinutes(t, now))}</span>,
      metaRight: band ? `NEWS2 ${t.vitals!.news2} · ${categoryOf(t.assessment?.triageCategory)?.label || NEWS_BAND[band].label}` : categoryOf(t.assessment?.triageCategory)?.label || (t.vitals?.bp ? `BP ${t.vitals.bp}` : 'No vitals'),
    };
  });

  const renderDetail = (key: string | null) => {
    const t = data.mine.find((x) => `t:${x.token}` === key);
    if (!t) return <HmsEmpty>{all.length ? 'Select a patient from the list.' : 'No patients for you yet today. Tokens issued at the front desk appear here.'}</HmsEmpty>;
    const s = status(t);
    const band = bandOfScore(t.vitals?.news2);
    const allergies = (t.assessment?.allergies?.length ? t.assessment.allergies : t.allergies) || [];
    const busy = data.mine.find((x) => x.id !== t.id && (isInChamber(x) || isCalledIn(x)));
    const draft = patientJourneyService.getConsultDraft(t.id);
    const results = data.labOrders.filter((o) => o.uhid === t.uhid && o.stage === 'REPORT_GENERATED');
    return (
      <>
        <HmsDetailHeader avatar={initialsOf(t.patient)} title={`${tokenLabel(t.token)} · ${t.patient}`} badge={<HmsBadge tone={s.tone}>{s.label}</HmsBadge>} subtitle={<><span style={MONO}>{t.uhid}</span> · {t.age ? `${t.age} y` : 'age —'} · {t.gender || '—'} · {t.type || 'Visit'}</>} />
        <HmsStatStrip
          items={[
            { label: 'Waited', value: fmtWait(waitMinutes(t, now)), tone: (waitMinutes(t, now) ?? 0) > LONG_WAIT_MIN && !isSeen(t) ? 'amber' : 'default' },
            { label: 'Triage', value: categoryOf(t.assessment?.triageCategory)?.label || '—', tone: isEmergencyTok(t) ? 'red' : 'default', note: t.assessment?.triagedBy },
            { label: 'NEWS2', value: t.vitals?.news2 ?? '—', tone: band === 'HIGH' ? 'red' : band === 'MEDIUM' || band === 'LOW_MEDIUM' ? 'amber' : 'default', note: t.vitals?.recordedAt ? clock(t.vitals.recordedAt) : 'No vitals' },
            { label: 'Lab', value: `${results.length} ready`, note: pendingFor(t) ? `${pendingFor(t)} pending` : undefined },
          ]}
        />
        <HmsDetailBody>
          {isEmergencyTok(t) && <HmsNotice tone="red">Emergency{t.triageNotes?.startsWith('EMERGENCY') ? ` — ${t.triageNotes.replace(/^EMERGENCY:\s*/, '')}` : ''}.</HmsNotice>}
          {t.chamberHold && <HmsNotice tone={backWithReports(t) ? 'green' : 'blue'}>{backWithReports(t) ? 'All reports are back — ready for review.' : t.chamberHold}</HmsNotice>}
          {allergies.length > 0 && !allergies.includes('NKDA') && <HmsNotice tone="red">Allergies: {allergies.join(', ')}</HmsNotice>}
          {draft && <HmsNotice tone="blue">A consultation draft is saved for this patient.</HmsNotice>}
          <HmsSection title="Nurse's assessment">
            <HmsRow label="Complaint" value={t.assessment?.chiefComplaint || '—'} />
            <HmsRow label="BP · pulse" value={t.vitals?.bp ? `${t.vitals.bp} · ${t.vitals.pulse ?? '—'} bpm` : '—'} />
            <HmsRow label="SpO₂ · temp" value={t.vitals?.bp ? `${t.vitals.spo2 ?? '—'}% · ${t.vitals.temp ?? '—'} °F` : '—'} />
            <HmsRow label="Pain" value={t.assessment?.painScale !== undefined ? `${t.assessment.painScale}/10` : '—'} />
            <HmsRow label="Note" value={t.assessment?.nurseNotes || (t.triageNotes && !t.triageNotes.startsWith('EMERGENCY') ? t.triageNotes : '—')} last />
          </HmsSection>
        </HmsDetailBody>
        {!isSeen(t) && (
          <HmsDetailFooter>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <HmsButton variant="primary" icon={Stethoscope} block onClick={() => (isInChamber(t) ? act.goTo('consult', undefined, String(t.token)) : act.startConsult(t))} disabled={!!busy && !isInChamber(t) && !isCalledIn(t)} title={busy && !isInChamber(t) && !isCalledIn(t) ? `Finish with ${busy.patient} first` : undefined}>
                  {isInChamber(t) ? 'Open consultation' : draft ? 'Resume consultation' : 'Consult'}
                </HmsButton>
              </div>
              {(isWaitingForDoctor(t) || sentForTests(t)) && (
                <div style={{ gridColumn: '1 / -1' }}><HmsButton icon={Megaphone} block disabled={!!busy} title={busy ? `${busy.patient} is in the room` : undefined} onClick={() => act.callIn(t)}>
                  Call in
                </HmsButton></div>
              )}
              {isCalledIn(t) && (
                <div style={{ gridColumn: '1 / -1' }}><HmsButton icon={Play} block onClick={() => act.startConsult(t)}>
                  Patient is here — start
                </HmsButton></div>
              )}
            </div>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="doc-queue"
      title="Today's queue"
      description="Your patients today. Emergencies, triaged and back-with-reports patients first."
      total={all.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search name, UHID or token"
      pills={[
        { key: 'all', label: 'All', count: all.length },
        { key: 'room', label: 'In room', count: all.filter(match.room).length },
        { key: 'waiting', label: 'Waiting', count: all.filter(waitingish).length, tone: all.some((t) => waitingish(t) && isEmergencyTok(t)) ? 'red' : undefined },
        { key: 'reports', label: 'Sent for tests', count: all.filter(sentForTests).length },
        { key: 'seen', label: 'Seen', count: all.filter(isSeen).length },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      onPrimary={(k) => {
        const t = data.mine.find((x) => `t:${x.token}` === k);
        if (!t || isSeen(t)) return;
        if (isInChamber(t)) act.goTo('consult', undefined, String(t.token));
        else if (!data.mine.some((x) => x.id !== t.id && (isInChamber(x) || isCalledIn(x)))) act.startConsult(t);
      }}
      primaryLabel="consult"
      detailLabel="Patient"
      emptyText="Nobody matches this search or filter."
      renderDetail={renderDetail}
    />
  );
};

