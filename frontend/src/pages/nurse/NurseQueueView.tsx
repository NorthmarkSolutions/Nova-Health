// Nurse — triage queue: today's tokens from the front desk, emergencies first. Call a patient to the triage
// station, start the assessment, escalate an emergency, or (with a reason) send them straight to the doctor.
import React, { useState } from 'react';
import { Megaphone, Activity, ShieldAlert, ArrowRight, PauseCircle, PlayCircle, UserRound } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, initialsOf } from '../../components/hms';
import { patientJourneyService, SharedQueueToken } from '../../services/patientJourneyService';
import { ReasonModal } from '../reception/ReceptionModals';
import { MONO, fmtWait, LONG_WAIT_MIN, tokenLabel, waitMinutes } from '../reception/receptionData';
import { NurseActions, NurseData, NURSE_ACTIVE, NEWS_BAND, bandOfScore, byTriageOrder, categoryOf, clock, isCalledToTriage, isEmergency, isInTriage, isReadyForDoctor, isToTriage, nurseStatusOf, toCollect, isResult, criticalOpen } from './nurseData';

export interface NurseQueueViewProps {
  data: NurseData;
  act: NurseActions;
  initialFilter?: string;
  initialSelect?: string;
}

const PILLS = ['totriage', 'intriage', 'ready', 'emergency', 'all'];

export const NurseQueueView: React.FC<NurseQueueViewProps> = ({ data, act, initialFilter, initialSelect }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'totriage');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `t:${initialSelect}` : null);
  const [fastTrack, setFastTrack] = useState<SharedQueueToken | null>(null);
  const [emergency, setEmergency] = useState<SharedQueueToken | null>(null);
  const now = data.lastSync.getTime();

  const today = data.queue.filter(NURSE_ACTIVE);
  const match: Record<string, (t: SharedQueueToken) => boolean> = {
    totriage: isToTriage,
    intriage: isInTriage,
    ready: isReadyForDoctor,
    emergency: isEmergency,
    all: () => true,
  };
  const q = search.trim().toLowerCase();
  const list = today.filter((t) => match[pill](t) && (!q || [t.patient, t.uhid, t.doctor, String(t.token), t.phone].some((v) => (v || '').toLowerCase().includes(q)))).sort(byTriageOrder);

  const rows: HmsListRow[] = list.map((t) => {
    const s = nurseStatusOf(t);
    const w = waitMinutes(t, now);
    const band = bandOfScore(t.vitals?.news2);
    return {
      key: `t:${t.token}`,
      title: `${tokenLabel(t.token)} · ${t.patient}`,
      badge: isEmergency(t) && s.tone !== 'red' ? <HmsBadge tone="red">Emergency</HmsBadge> : <HmsBadge tone={s.tone}>{s.label}</HmsBadge>,
      sub: (
        <>
          <span style={MONO}>{t.uhid}</span> · {t.age ? `${t.age} y` : '—'} {t.gender ? t.gender[0] : ''} · {t.doctor.replace(/\s*\(.*\)$/, '')}
        </>
      ),
      metaLeft: isToTriage(t) ? <span style={{ color: (w ?? 0) > LONG_WAIT_MIN ? '#b45309' : undefined }}>Waiting {fmtWait(w)}</span> : t.priority && t.priority !== 'NORMAL' ? t.priority.toLowerCase() : t.type,
      metaRight: band ? `NEWS2 ${t.vitals!.news2} · ${NEWS_BAND[band].label}` : t.vitals?.bp ? `BP ${t.vitals.bp}` : 'No vitals yet',
    };
  });

  const renderDetail = (key: string | null) => {
    const t = data.queue.find((x) => `t:${x.token}` === key);
    if (!t) return <HmsEmpty>{today.length ? 'Select a patient from the list.' : 'No patients in the OPD queue yet. Tokens issued at the front desk appear here.'}</HmsEmpty>;
    const s = nurseStatusOf(t);
    const w = waitMinutes(t, now);
    const cat = categoryOf(t.assessment?.triageCategory);
    const labs = data.labOrders.filter((o) => o.uhid === t.uhid && !o.cancelled);
    const prev = data.queue.filter((x) => x.uhid === t.uhid && x.id !== t.id && x.vitals?.bp).sort((a, b) => (b.vitals?.recordedAt || '').localeCompare(a.vitals?.recordedAt || ''))[0];
    const allergies = t.assessment?.allergies?.length ? t.assessment.allergies : t.allergies || [];
    return (
      <>
        <HmsDetailHeader avatar={initialsOf(t.patient)} title={`${tokenLabel(t.token)} · ${t.patient}`} badge={<HmsBadge tone={s.tone}>{s.label}</HmsBadge>} subtitle={<><span style={MONO}>{t.uhid}</span> · {t.age ? `${t.age} y` : 'age —'} · {t.gender || '—'} · {t.doctor} · {t.room}</>} />
        <HmsStatStrip
          items={[
            { label: 'Waited', value: fmtWait(w), note: t.time ? `Token at ${t.time}` : undefined, tone: (w ?? 0) > LONG_WAIT_MIN && isToTriage(t) ? 'amber' : 'default' },
            { label: 'Priority', value: (t.priority || 'NORMAL').toLowerCase(), tone: isEmergency(t) ? 'red' : t.priority === 'URGENT' ? 'amber' : 'default', note: cat ? cat.label : 'Not triaged' },
            { label: 'NEWS2', value: t.vitals?.news2 ?? '—', tone: t.vitals?.news2 !== undefined && t.vitals.news2 >= 5 ? 'red' : 'default', note: t.vitals?.recordedAt ? `at ${clock(t.vitals.recordedAt)}` : 'No vitals' },
            { label: 'Lab orders', value: labs.length, note: labs.some(toCollect) ? `${labs.filter(toCollect).length} to collect` : labs.some(criticalOpen) ? 'Critical result' : undefined, tone: labs.some(criticalOpen) ? 'red' : labs.some(toCollect) ? 'amber' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {isEmergency(t) && <HmsNotice tone="red">Emergency — see before everyone else{t.triageNotes ? `: ${t.triageNotes.replace(/^EMERGENCY:\s*/, '')}` : '.'}</HmsNotice>}
          {isCalledToTriage(t) && <HmsNotice tone="blue">Called to the triage station. Start the assessment when the patient arrives.</HmsNotice>}
          {allergies.length > 0 && !allergies.includes('NKDA') && <HmsNotice tone="red">Allergies: {allergies.join(', ')}</HmsNotice>}
          <HmsSection title="Visit">
            <HmsRow label="Doctor" value={t.doctor} hint={t.room} />
            <HmsRow label="Visit type" value={t.type || '—'} />
            <HmsRow label="Phone" value={t.phone || '—'} />
            <HmsRow label="Desk fee" value={t.feePaid ? `Paid${t.paymentMode ? ` · ${t.paymentMode}` : ''}` : (t.totalFee || 0) > 0 ? 'Not paid yet' : '—'} last />
          </HmsSection>
          {t.vitals?.bp && (
            <HmsSection title="Vitals this visit">
              <HmsRow label="BP · pulse" value={`${t.vitals.bp} · ${t.vitals.pulse ?? '—'} bpm`} />
              <HmsRow label="SpO₂ · temp" value={`${t.vitals.spo2 ?? '—'}% · ${t.vitals.temp ?? '—'} °F`} />
              <HmsRow label="Chief complaint" value={t.assessment?.chiefComplaint || '—'} />
              <HmsRow label="Recorded by" value={t.vitals.recordedBy || t.assessment?.triagedBy || '—'} hint={clock(t.vitals.recordedAt || t.assessment?.triagedAt)} last />
            </HmsSection>
          )}
          {prev && (
            <HmsSection title="Last recorded vitals (earlier visit)">
              <HmsRow label="BP · pulse" value={`${prev.vitals!.bp} · ${prev.vitals!.pulse ?? '—'} bpm`} hint={prev.vitals!.recordedAt ? new Date(prev.vitals!.recordedAt).toLocaleDateString() : undefined} />
              <HmsRow label="Weight" value={prev.vitals!.weight ? `${prev.vitals!.weight} kg` : '—'} last />
            </HmsSection>
          )}
          {labs.length > 0 && (
            <HmsSection title="Lab">
              {labs.map((o, i) => (
                <HmsRow key={o.id} label={o.testName} value={toCollect(o) ? <HmsBadge tone="amber">To collect</HmsBadge> : isResult(o) ? <HmsBadge tone={o.isFlaggedCritical ? 'red' : o.isFlaggedAbnormal ? 'amber' : 'green'}>{o.isFlaggedCritical ? 'Critical' : o.isFlaggedAbnormal ? 'Abnormal' : 'Normal'}</HmsBadge> : <HmsBadge tone="blue">In lab</HmsBadge>} hint={o.orderNo} last={i === labs.length - 1} />
              ))}
            </HmsSection>
          )}
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
            {(isToTriage(t) || isInTriage(t)) && (
              <div style={{ gridColumn: '1 / -1' }}>
              <HmsButton variant="primary" icon={Activity} block onClick={() => act.startTriage(t)}>
                {isInTriage(t) ? 'Continue assessment' : 'Start triage'}
              </HmsButton>
              </div>
            )}
            {isToTriage(t) && (
              <HmsButton icon={Megaphone} block onClick={() => act.callToTriage(t)}>
                Call to triage
              </HmsButton>
            )}
            {isReadyForDoctor(t) && (
              <HmsButton icon={Activity} block onClick={() => act.goTo('vitals', undefined, String(t.token))}>
                Amend vitals
              </HmsButton>
            )}
            {!isReadyForDoctor(t) && (
              <HmsButton icon={ArrowRight} block onClick={() => setFastTrack(t)}>
                Send to doctor without triage
              </HmsButton>
            )}
            {t.status === 'HOLD' ? (
              <HmsButton icon={PlayCircle} block onClick={() => { patientJourneyService.updateQueueToken(t.token, { status: 'WAITING' }); data.reload(); act.notify(`${tokenLabel(t.token)} back in the triage queue`); }}>
                Back to queue
              </HmsButton>
            ) : (
              isToTriage(t) && !isEmergency(t) && (
                <HmsButton icon={PauseCircle} block title="Patient stepped away (e.g. gone for X-ray or to the cashier)" onClick={() => { patientJourneyService.updateQueueToken(t.token, { status: 'HOLD', callingStatus: 'IDLE', callPoint: undefined }); data.reload(); act.notify(`${tokenLabel(t.token)} on hold`); }}>
                  Put on hold
                </HmsButton>
              )
            )}
            {!isEmergency(t) ? (
              <HmsButton variant="danger" icon={ShieldAlert} block onClick={() => setEmergency(t)}>
                Mark emergency
              </HmsButton>
            ) : (
              <HmsButton variant="danger" icon={UserRound} block onClick={() => act.codeBlue({ patientName: t.patient, uhid: t.uhid, age: t.age, gender: t.gender, token: t.token })}>
                Code Blue
              </HmsButton>
            )}
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="nurse-queue"
        title="Triage queue"
        description="Today's OPD tokens from the front desk. Emergencies and priority patients come first."
        total={today.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search name, UHID, token, doctor or phone"
        pills={[
          { key: 'totriage', label: 'To triage', count: today.filter(isToTriage).length, tone: today.some((t) => isToTriage(t) && (waitMinutes(t, now) ?? 0) > LONG_WAIT_MIN) ? 'amber' : undefined },
          { key: 'intriage', label: 'In triage', count: today.filter(isInTriage).length },
          { key: 'ready', label: 'Ready for doctor', count: today.filter(isReadyForDoctor).length },
          { key: 'emergency', label: 'Emergency', count: today.filter(isEmergency).length, tone: 'red' },
          { key: 'all', label: 'All', count: today.length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        onPrimary={(k) => {
          const t = data.queue.find((x) => `t:${x.token}` === k);
          if (t && (isToTriage(t) || isInTriage(t))) act.startTriage(t);
        }}
        primaryLabel="start triage"
        detailLabel="Patient"
        emptyText="Nobody matches this search or filter."
        renderDetail={renderDetail}
      />
      {fastTrack && (
        <ReasonModal
          title={`Send ${fastTrack.patient} to the doctor without triage?`}
          description="Vitals stay blank for the doctor. Record why triage was skipped."
          label="Reason"
          confirm="Send to doctor"
          options={['Doctor asked to see the patient directly', 'Follow-up visit — vitals not required', 'Patient too unwell to wait — doctor informed', 'Report review only']}
          onClose={() => setFastTrack(null)}
          onConfirm={(reason) => {
            patientJourneyService.updateQueueToken(fastTrack.token, { status: 'READY_FOR_DOCTOR', callingStatus: 'IDLE', callPoint: undefined, triageNotes: `Triage skipped: ${reason}` });
            setFastTrack(null);
            data.reload();
            act.notify(`${tokenLabel(fastTrack.token)} sent to ${fastTrack.doctor.replace(/\s*\(.*\)$/, '')}`);
          }}
        />
      )}
      {emergency && (
        <ReasonModal
          title={`Mark ${emergency.patient} as an emergency?`}
          description="The patient moves to the top of every queue and the doctor sees the reason."
          label="Why"
          confirm="Mark emergency"
          danger
          onClose={() => setEmergency(null)}
          onConfirm={(reason) => {
            patientJourneyService.updateQueueToken(emergency.token, { status: 'EMERGENCY', priority: 'EMERGENCY', triageNotes: `EMERGENCY: ${reason}` });
            setEmergency(null);
            data.reload();
            act.notify(`${tokenLabel(emergency.token)} marked as an emergency`);
          }}
        />
      )}
    </>
  );
};
