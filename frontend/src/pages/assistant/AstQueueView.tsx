// Chamber desk — the doctor's queue. Emergency and triaged patients first, each with a readiness bar worked out from
// the record (vitals, allergies, fee, pending reports). Call the patient in, seat them with the doctor, hold or mark
// a no-show, record basic vitals the nurse missed, and attach the reports they brought.
import React, { useState } from 'react';
import { Megaphone, UserCheck, PauseCircle, PlayCircle, UserX, Activity, FileUp, Check, X } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, initialsOf } from '../../components/hms';
import { patientJourneyService, SharedQueueToken } from '../../services/patientJourneyService';
import { opdActions } from '../../services/opdActions';
import { ReasonModal } from '../reception/ReceptionModals';
import { MONO, fmtWait, LONG_WAIT_MIN, tokenLabel, waitMinutes } from '../reception/receptionData';
import { categoryOf } from '../nurse/nurseData';
import { BasicVitalsModal } from './AssistantModals';
import { AssistantActions, AssistantData, byChamberOrder, chamberStatus, isCalledIn, isEmergencyTok, isInChamber, isOnHold, isSeen, isWaitingForDoctor, readiness, readyPct } from './assistantData';

export interface AstQueueViewProps {
  data: AssistantData;
  act: AssistantActions;
  initialFilter?: string;
  initialSelect?: string;
}

const PILLS = ['waiting', 'chamber', 'hold', 'seen', 'all'];

export const AstQueueView: React.FC<AstQueueViewProps> = ({ data, act, initialFilter, initialSelect }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'waiting');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `t:${initialSelect}` : null);
  const [hold, setHold] = useState<SharedQueueToken | null>(null);
  const [noShow, setNoShow] = useState<SharedQueueToken | null>(null);
  const [vitals, setVitals] = useState<SharedQueueToken | null>(null);
  const now = data.lastSync.getTime();

  const all = data.mine.filter((t) => t.status !== 'CANCELLED');
  const match: Record<string, (t: SharedQueueToken) => boolean> = {
    waiting: isWaitingForDoctor,
    chamber: (t) => isInChamber(t) || isCalledIn(t),
    hold: isOnHold,
    seen: isSeen,
    all: () => true,
  };
  const q = search.trim().toLowerCase();
  const list = all.filter((t) => match[pill](t) && (!q || [t.patient, t.uhid, String(t.token), t.phone].some((v) => (v || '').toLowerCase().includes(q)))).sort(byChamberOrder);
  const rows: HmsListRow[] = list.map((t) => {
    const s = chamberStatus(t);
    const r = readiness(t, data.labOrders);
    const pct = readyPct(r);
    return {
      key: `t:${t.token}`,
      title: `${tokenLabel(t.token)} · ${t.patient}`,
      badge: <HmsBadge tone={s.tone}>{s.label}</HmsBadge>,
      sub: <><span style={MONO}>{t.uhid}</span> · {t.age ? `${t.age} y` : '—'} {t.gender ? t.gender[0] : ''} · {t.type || 'Visit'}</>,
      metaLeft: isWaitingForDoctor(t) ? <span style={{ color: (waitMinutes(t, now) ?? 0) > LONG_WAIT_MIN ? '#b45309' : undefined }}>Waiting {fmtWait(waitMinutes(t, now))}</span> : t.checkoutTime ? `Seen ${t.checkoutTime}` : s.label,
      metaRight: categoryOf(t.assessment?.triageCategory)?.label || (t.vitals?.bp ? `BP ${t.vitals.bp}` : undefined),
      progress: isWaitingForDoctor(t) || isOnHold(t) ? { pct, doneLabel: 'Ready for the doctor', tone: pct < 50 ? 'amber' : 'blue' } : undefined,
    };
  });

  const renderDetail = (key: string | null) => {
    if (!data.doctor) return <HmsEmpty>Choose the doctor you are assisting (top bar) to see their queue.</HmsEmpty>;
    const t = data.mine.find((x) => `t:${x.token}` === key);
    if (!t) return <HmsEmpty>{all.length ? 'Select a patient from the list.' : `No tokens for ${data.doctor.name} yet. Patients appear here as the front desk issues tokens.`}</HmsEmpty>;
    const s = chamberStatus(t);
    const r = readiness(t, data.labOrders);
    const docs = data.documents.filter((d) => d.uhid === t.uhid);
    const lastRx = data.prescriptions.filter((x) => x.uhid === t.uhid).sort((a, b) => b.date.localeCompare(a.date))[0];
    const busy = data.mine.find((x) => x.id !== t.id && (isInChamber(x) || isCalledIn(x)));
    return (
      <>
        <HmsDetailHeader avatar={initialsOf(t.patient)} title={`${tokenLabel(t.token)} · ${t.patient}`} badge={<HmsBadge tone={s.tone}>{s.label}</HmsBadge>} subtitle={<><span style={MONO}>{t.uhid}</span> · {t.age ? `${t.age} y` : 'age —'} · {t.gender || '—'} · {t.phone || 'no phone'}</>} />
        <HmsStatStrip
          items={[
            { label: 'Waited', value: fmtWait(waitMinutes(t, now)), note: t.time ? `Token at ${t.time}` : undefined, tone: (waitMinutes(t, now) ?? 0) > LONG_WAIT_MIN && isWaitingForDoctor(t) ? 'amber' : 'default' },
            { label: 'Priority', value: (t.priority || 'NORMAL').toLowerCase(), note: categoryOf(t.assessment?.triageCategory)?.label || 'Not triaged', tone: isEmergencyTok(t) ? 'red' : t.priority === 'URGENT' ? 'amber' : 'default' },
            { label: 'Ready', value: `${r.filter((i) => i.ok).length}/${r.length}`, tone: r.every((i) => i.ok) ? 'green' : 'amber', note: r.every((i) => i.ok) ? 'All set' : r.find((i) => !i.ok)?.label },
            { label: 'Outside reports', value: docs.length, note: docs.some((d) => !d.shownToDoctorAt) ? 'Not shown yet' : undefined },
          ]}
        />
        <HmsDetailBody>
          {isEmergencyTok(t) && <HmsNotice tone="red">Emergency — send in next{t.triageNotes ? `: ${t.triageNotes.replace(/^EMERGENCY:\s*/, '')}` : ''}.</HmsNotice>}
          {t.chamberHold && <HmsNotice tone="amber">On hold: {t.chamberHold}</HmsNotice>}
          {busy && isWaitingForDoctor(t) && <HmsNotice tone="blue">{tokenLabel(busy.token)} {busy.patient} is {isInChamber(busy) ? 'with the doctor' : 'being called in'}.</HmsNotice>}
          <HmsSection title="Ready for the doctor">
            {r.map((i, n) => (
              <HmsRow
                key={i.key}
                label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>{i.ok ? <Check size={16} color="#16a34a" aria-label="Done" /> : <X size={16} color="#dc2626" aria-label="Missing" />}{i.label}</span>}
                value={i.hint}
                last={n === r.length - 1}
              />
            ))}
          </HmsSection>
          {docs.length > 0 && (
            <HmsSection title="Outside reports on file">
              {docs.map((d, n) => (
                <HmsRow key={d.id} label={d.title} hint={`${d.source} · ${d.reportDate}`} value={d.shownToDoctorAt ? <HmsBadge tone="green">Shown</HmsBadge> : <HmsBadge tone="amber">To show</HmsBadge>} last={n === docs.length - 1} />
              ))}
            </HmsSection>
          )}
          <HmsSection title="Visit">
            <HmsRow label="Visit type" value={t.type || '—'} />
            <HmsRow label="Complaint (nurse)" value={t.assessment?.chiefComplaint || '—'} />
            <HmsRow label="Last prescription" value={lastRx ? `${lastRx.prescriptionNo} · ${lastRx.date}` : 'First visit on record'} hint={lastRx?.doctorName} last />
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
            {isWaitingForDoctor(t) && (
              <div style={{ gridColumn: '1 / -1' }}>
                <HmsButton variant="primary" icon={Megaphone} block disabled={!!busy} title={busy ? 'The doctor already has a patient' : undefined} onClick={() => act.callIn(t)}>
                  Call into chamber
                </HmsButton>
              </div>
            )}
            {isCalledIn(t) && (
              <div style={{ gridColumn: '1 / -1' }}>
                <HmsButton variant="primary" icon={UserCheck} block onClick={() => { void opdActions.seat(t, t.room).then((done) => { data.reload(); if (done) act.notify(`${t.patient} seated with ${data.doctor?.name}`); }); }}>
                  Patient seated with doctor
                </HmsButton>
              </div>
            )}
            {isCalledIn(t) && (
              <HmsButton icon={Megaphone} block onClick={() => act.callIn(t)}>
                Call again
              </HmsButton>
            )}
            {(isWaitingForDoctor(t) || isCalledIn(t)) && (
              <HmsButton icon={PauseCircle} block onClick={() => setHold(t)}>
                Hold
              </HmsButton>
            )}
            {isOnHold(t) && (
              <HmsButton icon={PlayCircle} block onClick={() => { void opdActions.resume(t).then((done) => { data.reload(); if (done) act.notify(`${tokenLabel(t.token)} back in the queue`); }); }}>
                Back to queue
              </HmsButton>
            )}
            {!isSeen(t) && !isInChamber(t) && !t.vitals?.bp && (
              <HmsButton icon={Activity} block onClick={() => setVitals(t)}>
                Record basic vitals
              </HmsButton>
            )}
            {!isSeen(t) && (
              <HmsButton icon={FileUp} block onClick={() => act.attach(t.uhid)}>
                Attach report
              </HmsButton>
            )}
            {(isWaitingForDoctor(t) || isCalledIn(t) || isOnHold(t)) && (
              <HmsButton variant="danger" icon={UserX} block onClick={() => setNoShow(t)}>
                No-show
              </HmsButton>
            )}
            {isSeen(t) && (
              <div style={{ gridColumn: '1 / -1' }}>
                <HmsButton variant="primary" block onClick={() => act.goTo('checkout', undefined, String(t.token))}>
                  Open checkout
                </HmsButton>
              </div>
            )}
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="ast-queue"
        title="Chamber queue"
        description={data.doctor ? `${data.doctor.name}'s patients today. Emergency and triaged patients first.` : 'Choose the doctor you assist.'}
        total={all.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search name, UHID, token or phone"
        pills={[
          { key: 'waiting', label: 'Waiting', count: all.filter(isWaitingForDoctor).length, tone: all.some((t) => isWaitingForDoctor(t) && isEmergencyTok(t)) ? 'red' : undefined },
          { key: 'chamber', label: 'In chamber', count: all.filter(match.chamber).length },
          { key: 'hold', label: 'On hold', count: all.filter(isOnHold).length },
          { key: 'seen', label: 'Seen', count: all.filter(isSeen).length },
          { key: 'all', label: 'All', count: all.length },
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
          if (t && isWaitingForDoctor(t) && !data.mine.some((x) => isInChamber(x) || isCalledIn(x))) act.callIn(t);
        }}
        primaryLabel="call in"
        detailLabel="Patient"
        emptyText="Nobody matches this search or filter."
        renderDetail={renderDetail}
      />
      {hold && (
        <ReasonModal
          title={`Hold ${hold.patient}?`}
          description="The patient keeps their place; call them when they are back."
          label="Why"
          confirm="Put on hold"
          options={['Gone for a test / X-ray', 'Gone to the cash counter', 'Stepped out — not answering', 'Waiting for reports', 'Patient asked to wait']}
          onClose={() => setHold(null)}
          onConfirm={(reason) => {
            const t = hold;
            setHold(null);
            void opdActions.chamberHold(t, reason, isCalledIn(t) ? (t.vitals?.bp ? 'READY_FOR_DOCTOR' : 'WAITING') : t.status).then((done) => {
              data.reload();
              if (done) act.notify(`${tokenLabel(t.token)} on hold · ${reason.toLowerCase()}`);
            });
          }}
        />
      )}
      {noShow && (
        <ReasonModal
          title={`Mark ${noShow.patient} as a no-show?`}
          description="The token closes. The front desk can issue a new one if the patient returns."
          label="Reason"
          confirm="Mark no-show"
          danger
          options={['Called three times — no answer', 'Patient left without being seen', 'Patient asked to cancel']}
          onClose={() => setNoShow(null)}
          onConfirm={(reason) => {
            const t = noShow;
            setNoShow(null);
            void opdActions.noShow(t, reason).then((done) => {
              data.reload();
              if (done) act.notify(`${tokenLabel(t.token)} marked as a no-show`);
            });
          }}
        />
      )}
      {vitals && (
        <BasicVitalsModal
          token={vitals}
          userName={act.userName}
          onClose={() => setVitals(null)}
          onDone={() => {
            const t = vitals;
            setVitals(null);
            data.reload();
            act.notify(`Vitals recorded for ${t.patient}`);
          }}
        />
      )}
    </>
  );
};
