// Nurse station dialogs: vital-sign inputs shared by triage and the bed chart, bed observation, escalation,
// Code Blue, specimen collection, critical-result read-back, treatment-room administration and the SBAR handover.
import React, { useMemo, useState } from 'react';
import { Activity, Siren, FlaskConical, PhoneCall, Syringe, Send, ShieldAlert } from 'lucide-react';
import { HmsModal, HmsButton, HmsField, HmsToggle, HmsNotice, HmsBadge, INPUT, TEXTAREA, HMS } from '../../components/hms';
import { patientJourneyService, FlatCampusBed, NurseHandover, NurseProcedure } from '../../services/patientJourneyService';
import { getVitalFlagDetails } from './vitalRanges';
import { NurseData, NurseLabOrder, ClinicDose, NEWS_BAND, PROC_KIND, SHIFTS, HANDOVER_CHECKS, EMPTY_OBS, ObsForm, chartKeyOf, news2, obsOf, kindOfItem, Obs } from './nurseData';
import { tokenLabel } from '../reception/receptionData';

/* ---------------- shared inputs ---------------- */

const AVPU: { key: ObsForm['avpu']; label: string }[] = [
  { key: 'A', label: 'Alert' },
  { key: 'C', label: 'New confusion' },
  { key: 'V', label: 'Responds to voice' },
  { key: 'P', label: 'Responds to pain' },
  { key: 'U', label: 'Unresponsive' },
];

/** Radio-button group (role="radiogroup"); each option is a 40px chip. */
export const Choice = <T extends string>({ label, value, options, onChange }: { label: string; value: T | ''; options: { key: NoInfer<T>; label: string; tone?: 'red' | 'amber' | 'blue' | 'green' | 'gray' }[]; onChange: (v: NoInfer<T>) => void }) => (
  <div role="radiogroup" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
    {options.map((o) => {
      const on = value === o.key;
      const tone = o.tone === 'red' ? '#dc2626' : o.tone === 'amber' ? '#d97706' : o.tone === 'green' ? '#16a34a' : o.tone === 'gray' ? '#6b7280' : HMS.primary;
      return (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={on}
          onClick={() => onChange(o.key)}
          style={{ height: '36px', padding: '0 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? tone : '#d1d5db'}`, background: on ? tone : '#ffffff', color: on ? '#ffffff' : HMS.text }}
        >
          {o.label}
        </button>
      );
    })}
  </div>
);

const Flag: React.FC<{ field: string; value: string; age?: number }> = ({ field, value, age }) => {
  const f = getVitalFlagDetails(field, value, age);
  return f ? <HmsBadge tone={f.level === 'critical' ? 'red' : 'amber'}>{f.label}</HmsBadge> : null;
};

const NUM = (v: string) => v.replace(/[^0-9.]/g, '');

/** BP, pulse, temperature, SpO2, respiratory rate, consciousness and oxygen — with adult range flags. */
export const ObsFields: React.FC<{ value: ObsForm; onChange: (v: ObsForm) => void; age?: number; idPrefix: string }> = ({ value: f, onChange, age, idPrefix }) => {
  const set = (k: keyof ObsForm, v: string | boolean) => onChange({ ...f, [k]: v });
  const field = (k: 'pulse' | 'temp' | 'spo2' | 'rr', label: string, flag: string, ph: string) => (
    <HmsField label={label} htmlFor={`${idPrefix}-${k}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input id={`${idPrefix}-${k}`} inputMode="decimal" style={INPUT} placeholder={ph} value={f[k]} onChange={(e) => set(k, NUM(e.target.value))} />
        <Flag field={flag} value={f[k]} age={age} />
      </div>
    </HmsField>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        <HmsField label="Blood pressure (mmHg)" htmlFor={`${idPrefix}-sys`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input id={`${idPrefix}-sys`} aria-label="Systolic" inputMode="numeric" style={INPUT} placeholder="Sys" value={f.sys} onChange={(e) => set('sys', NUM(e.target.value))} />
            <span style={{ color: HMS.textMuted }}>/</span>
            <input aria-label="Diastolic" inputMode="numeric" style={INPUT} placeholder="Dia" value={f.dia} onChange={(e) => set('dia', NUM(e.target.value))} />
          </div>
        </HmsField>
        {field('pulse', 'Pulse (bpm)', 'pulse', 'e.g. 72')}
        {field('temp', 'Temperature (°F)', 'temp', 'e.g. 98.6')}
        {field('spo2', 'SpO₂ (%)', 'spo2', 'e.g. 98')}
        {field('rr', 'Respiratory rate (/min)', 'respiratoryRate', 'e.g. 16')}
      </div>
      <HmsField label="Consciousness (ACVPU)">
        <Choice label="Consciousness" value={f.avpu} options={AVPU.map((a) => ({ key: a.key as Exclude<ObsForm['avpu'], ''>, label: a.label, tone: a.key === 'A' ? 'green' : 'red' }))} onChange={(v) => set('avpu', v)} />
      </HmsField>
      <HmsToggle checked={f.onOxygen} onChange={(v) => set('onOxygen', v)} label="On supplemental oxygen" showLabel />
    </div>
  );
};

/** Live NEWS2 strip under the vital-sign inputs. */
export const NewsPanel: React.FC<{ obs: Obs; age?: number }> = ({ obs, age }) => {
  const r = news2(obs, age);
  if (age !== undefined && age > 0 && age < 16) return <HmsNotice tone="blue">Early warning score (NEWS2) is for adults; use clinical judgement for patients under 16.</HmsNotice>;
  if (!r) return <HmsNotice tone="blue">Record respiratory rate, SpO₂, systolic BP, pulse, temperature and consciousness to calculate the early warning score (NEWS2).</HmsNotice>;
  const b = NEWS_BAND[r.band];
  return (
    <HmsNotice tone={b.tone === 'green' ? 'green' : b.tone === 'red' ? 'red' : 'amber'}>
      <strong>NEWS2 {r.score} · {b.label} risk.</strong> {b.action}
    </HmsNotice>
  );
};

const PatientSelect: React.FC<{ id: string; options: { key: string; label: string }[]; value: string; onChange: (v: string) => void; allowUnknown?: boolean }> = ({ id, options, value, onChange, allowUnknown }) => (
  <select id={id} style={INPUT} value={value} onChange={(e) => onChange(e.target.value)}>
    <option value="">{allowUnknown ? 'Unknown person / visitor' : 'Choose a patient'}</option>
    {options.map((o) => (
      <option key={o.key} value={o.key}>
        {o.label}
      </option>
    ))}
  </select>
);

/* ---------------- day-care bed: observation & escalation ---------------- */

export const ObservationModal: React.FC<{ bed: FlatCampusBed; userName: string; onClose: () => void; onDone: (news: number | null) => void }> = ({ bed, userName, onClose, onDone }) => {
  const occ = bed.bed.inpatientDetails!;
  const [f, setF] = useState<ObsForm>(EMPTY_OBS);
  const [pain, setPain] = useState('');
  const [note, setNote] = useState('');
  const r = news2(obsOf(f), occ.age);
  const ok = !!(f.sys && f.dia && f.pulse && f.spo2);
  return (
    <HmsModal
      title={`Observation · ${bed.bed.bedNumber}`}
      description={`${occ.patientName} · ${occ.uhid}. Record what you measured now; the next check is timed from this entry.`}
      width={720}
      onClose={onClose}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton
            variant="primary"
            icon={Activity}
            disabled={!ok}
            title={ok ? undefined : 'BP, pulse and SpO₂ are required'}
            onClick={() => {
              patientJourneyService.addNurseChartEntry({
                id: `chart-${new Date().getTime()}`,
                chartKey: chartKeyOf(bed),
                bedId: bed.bed.id,
                uhid: occ.uhid,
                patientName: occ.patientName,
                kind: 'READING',
                at: new Date().toISOString(),
                by: userName,
                bp: `${f.sys}/${f.dia}`,
                pulse: Number(f.pulse),
                temp: f.temp ? Number(f.temp) : undefined,
                spo2: Number(f.spo2),
                respiratoryRate: f.rr ? Number(f.rr) : undefined,
                avpu: f.avpu || undefined,
                onOxygen: f.onOxygen,
                pain: pain === '' ? undefined : Number(pain),
                news2: r?.score,
                note: note.trim() || undefined,
              });
              onDone(r?.score ?? null);
            }}
          >
            Save observation
          </HmsButton>
        </>
      }
    >
      <ObsFields value={f} onChange={setF} age={occ.age} idPrefix="obs" />
      <NewsPanel obs={obsOf(f)} age={occ.age} />
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
        <HmsField label="Pain (0–10)" htmlFor="obs-pain">
          <select id="obs-pain" style={INPUT} value={pain} onChange={(e) => setPain(e.target.value)}>
            <option value="">Not assessed</option>
            {Array.from({ length: 11 }, (_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </HmsField>
        <HmsField label="Nursing note" htmlFor="obs-note">
          <input id="obs-note" style={INPUT} placeholder="Drip rate, response to treatment, intake/output…" value={note} onChange={(e) => setNote(e.target.value)} />
        </HmsField>
      </div>
    </HmsModal>
  );
};

export const EscalateModal: React.FC<{ bed: FlatCampusBed; data: NurseData; userName: string; lastNews?: number; onClose: () => void; onDone: (to: string) => void }> = ({ bed, data, userName, lastNews, onClose, onDone }) => {
  const occ = bed.bed.inpatientDetails!;
  const doctors = Array.from(new Set([occ.primaryDoctor?.name, ...data.doctors].filter(Boolean))) as string[];
  const [to, setTo] = useState(doctors[0] || '');
  const [urgency, setUrgency] = useState<'RED_IMMEDIATE' | 'YELLOW_URGENT'>(lastNews !== undefined && lastNews >= 7 ? 'RED_IMMEDIATE' : 'YELLOW_URGENT');
  const [reason, setReason] = useState('');
  return (
    <HmsModal
      title={`Escalate ${occ.patientName}`}
      description={`${bed.bed.bedNumber} · the doctor's desk gets an alert until it is attended. Use Code Blue for a cardiac or respiratory arrest.`}
      onClose={onClose}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton
            variant="danger"
            icon={ShieldAlert}
            disabled={!to || reason.trim().length < 5}
            onClick={() => {
              const now = new Date();
              patientJourneyService.addNurseChartEntry({ id: `chart-${now.getTime()}`, chartKey: chartKeyOf(bed), bedId: bed.bed.id, uhid: occ.uhid, patientName: occ.patientName, kind: 'ESCALATION', at: now.toISOString(), by: userName, escalatedTo: to, note: reason.trim() });
              patientJourneyService.raiseEmergencyAlert({ id: `eal-${now.getTime()}`, callTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), location: `${bed.wardName} · ${bed.bed.bedNumber}`, patientName: occ.patientName, age: occ.age, gender: occ.gender, triagePriority: urgency, presentingCondition: `Nurse escalation to ${to}: ${reason.trim()}`, status: 'ACTIVE' });
              onDone(to);
            }}
          >
            Send escalation
          </HmsButton>
        </>
      }
    >
      <HmsField label="Doctor" htmlFor="esc-to" required>
        <select id="esc-to" style={INPUT} value={to} onChange={(e) => setTo(e.target.value)}>
          {doctors.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </HmsField>
      <HmsField label="Urgency" required>
        <Choice label="Urgency" value={urgency} options={[{ key: 'RED_IMMEDIATE', label: 'Immediate — come now', tone: 'red' }, { key: 'YELLOW_URGENT', label: 'Urgent review', tone: 'amber' }]} onChange={setUrgency} />
      </HmsField>
      <HmsField label="What is happening (SBAR situation)" htmlFor="esc-reason" required>
        <textarea id="esc-reason" style={TEXTAREA} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={lastNews !== undefined ? `NEWS2 ${lastNews}. ` : 'e.g. BP falling 90/60, drowsy, SpO₂ 92% on room air'} />
      </HmsField>
    </HmsModal>
  );
};

/* ---------------- Code Blue ---------------- */

export const CodeBlueModal: React.FC<{ data: NurseData; preset?: { patientName?: string; uhid?: string; age?: number; gender?: string; location?: string; condition?: string; token?: number }; onClose: () => void; onDone: (where: string) => void }> = ({ data, preset, onClose, onDone }) => {
  const people = useMemo(() => {
    const fromQueue = data.queue.filter((t) => !['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(t.status)).map((t) => ({ key: `t:${t.token}`, label: `${tokenLabel(t.token)} · ${t.patient} (${t.uhid})`, name: t.patient, uhid: t.uhid, age: t.age, gender: t.gender, token: t.token as number | undefined, where: 'Waiting area' }));
    const fromBeds = data.occupiedBeds.map((b) => ({ key: `b:${b.bed.id}`, label: `${b.bed.bedNumber} · ${b.bed.inpatientDetails!.patientName}`, name: b.bed.inpatientDetails!.patientName, uhid: b.bed.inpatientDetails!.uhid, age: b.bed.inpatientDetails!.age, gender: b.bed.inpatientDetails!.gender, token: undefined, where: `${b.wardName} · ${b.bed.bedNumber}` }));
    return [...fromBeds, ...fromQueue];
  }, [data.queue, data.occupiedBeds]);
  const initial = preset?.token ? `t:${preset.token}` : people.find((p) => p.uhid && p.uhid === preset?.uhid)?.key || '';
  const [who, setWho] = useState(initial);
  const picked = people.find((p) => p.key === who);
  const [location, setLocation] = useState(preset?.location || picked?.where || 'Triage station');
  const [condition, setCondition] = useState(preset?.condition || '');
  const [level, setLevel] = useState<'RED_IMMEDIATE' | 'YELLOW_URGENT'>('RED_IMMEDIATE');
  return (
    <HmsModal
      title="Code Blue / rapid response"
      description="Calls the emergency team. Every doctor desk shows the alert until it is attended."
      onClose={onClose}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton
            variant="danger"
            icon={Siren}
            disabled={location.trim().length < 3 || condition.trim().length < 3}
            onClick={() => {
              const now = new Date();
              patientJourneyService.raiseEmergencyAlert({ id: `eal-${now.getTime()}`, callTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), location: location.trim(), patientName: picked?.name || 'Unknown person', age: picked?.age || 0, gender: picked?.gender || '—', triagePriority: level, presentingCondition: condition.trim(), status: 'ACTIVE' });
              if (picked?.token !== undefined) patientJourneyService.updateQueueToken(picked.token, { status: 'EMERGENCY', priority: 'EMERGENCY', triageNotes: `EMERGENCY: ${condition.trim()}` });
              onDone(location.trim());
            }}
          >
            Call the team
          </HmsButton>
        </>
      }
    >
      <HmsField label="Patient" htmlFor="cb-who">
        <PatientSelect
          id="cb-who"
          allowUnknown
          options={people}
          value={who}
          onChange={(v) => {
            setWho(v);
            const p = people.find((x) => x.key === v);
            if (p) setLocation(p.where);
          }}
        />
      </HmsField>
      <HmsField label="Location" htmlFor="cb-loc" required>
        <input id="cb-loc" style={INPUT} value={location} onChange={(e) => setLocation(e.target.value)} />
      </HmsField>
      <HmsField label="Call type" required>
        <Choice label="Call type" value={level} options={[{ key: 'RED_IMMEDIATE', label: 'Code Blue — arrest / not breathing', tone: 'red' }, { key: 'YELLOW_URGENT', label: 'Rapid response — deteriorating', tone: 'amber' }]} onChange={setLevel} />
      </HmsField>
      <HmsField label="Condition" htmlFor="cb-cond" required>
        <input id="cb-cond" style={INPUT} placeholder="e.g. collapsed in waiting area, no pulse" value={condition} onChange={(e) => setCondition(e.target.value)} />
      </HmsField>
    </HmsModal>
  );
};

/* ---------------- lab: collection & critical read-back ---------------- */

export const CollectModal: React.FC<{ order: NurseLabOrder; userName: string; onClose: () => void; onDone: () => void }> = ({ order, userName, onClose, onDone }) => {
  const [ids, setIds] = useState(false);
  const [tube, setTube] = useState(false);
  const [label, setLabel] = useState(false);
  const blocked = order.billingOk === false;
  return (
    <HmsModal
      title={`Collect ${order.sampleType || 'sample'} · ${order.testName}`}
      description={`${order.patientName} · ${order.uhid} · order ${order.orderNo}. Collected by ${userName}.`}
      onClose={onClose}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton
            variant="primary"
            icon={FlaskConical}
            disabled={blocked || !ids || !tube || !label}
            onClick={() => {
              patientJourneyService.collectSample(order.id, userName);
              onDone();
            }}
          >
            Confirm collection
          </HmsButton>
        </>
      }
    >
      {blocked && <HmsNotice tone="red">Billing has not cleared this test{order.billingReason ? ` — ${order.billingReason}` : ''}. Send the patient to the cash counter first; the lab will refuse an unpaid sample.</HmsNotice>}
      {order.rejectedReason && <HmsNotice tone="amber">Recollection — the lab rejected the last sample: {order.rejectedReason}</HmsNotice>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
        <div>
          <div style={{ fontSize: '12px', color: HMS.textSecondary }}>Container</div>
          <strong>{order.container || 'As per lab manual'}</strong>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: HMS.textSecondary }}>Priority</div>
          <strong>{order.priority || 'ROUTINE'}</strong>
        </div>
      </div>
      <HmsToggle checked={ids} onChange={setIds} label="Two identifiers checked (name and UHID or date of birth)" showLabel />
      <HmsToggle checked={tube} onChange={setTube} label="Correct container and volume" showLabel />
      <HmsToggle checked={label} onChange={setLabel} label="Labelled at the patient's side" showLabel />
    </HmsModal>
  );
};

export const ReadBackModal: React.FC<{ order: NurseLabOrder; data: NurseData; userName: string; onClose: () => void; onDone: (doctor: string) => void }> = ({ order, data, userName, onClose, onDone }) => {
  const doctors = Array.from(new Set([order.doctor, ...data.doctors].filter(Boolean)));
  const [doctor, setDoctor] = useState(doctors[0] || '');
  const [readBack, setReadBack] = useState(false);
  const [note, setNote] = useState('');
  const crit = order.parameters.filter((p) => p.isCritical);
  return (
    <HmsModal
      title={`Critical result · ${order.patientName}`}
      description={`${order.testName} · ${order.orderNo}. Read the value back to the lab, then tell the doctor.`}
      onClose={onClose}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton
            variant="primary"
            icon={PhoneCall}
            disabled={!readBack || !doctor}
            onClick={() => {
              patientJourneyService.acknowledgeCriticalLabOrder(order.id, userName, `Read back by ${userName} (nurse); ${doctor} informed.${note.trim() ? ` ${note.trim()}` : ''}`);
              onDone(doctor);
            }}
          >
            Record read-back
          </HmsButton>
        </>
      }
    >
      {crit.length > 0 && (
        <HmsNotice tone="red">
          {crit.map((p) => `${p.paramName} ${p.observedValue} ${p.unit}`.trim()).join(' · ')}
        </HmsNotice>
      )}
      <HmsField label="Doctor informed" htmlFor="rb-doc" required>
        <select id="rb-doc" style={INPUT} value={doctor} onChange={(e) => setDoctor(e.target.value)}>
          {doctors.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </HmsField>
      <HmsToggle checked={readBack} onChange={setReadBack} label="Value read back and confirmed with the lab" showLabel />
      <HmsField label="Note" htmlFor="rb-note">
        <input id="rb-note" style={INPUT} placeholder="e.g. Doctor coming to see the patient" value={note} onChange={(e) => setNote(e.target.value)} />
      </HmsField>
    </HmsModal>
  );
};

/* ---------------- treatment room ---------------- */

const RIGHTS = ['Right patient (two identifiers)', 'Right medicine', 'Right dose', 'Right route', 'Right time'];

export const AdministerModal: React.FC<{ dose?: ClinicDose; data: NurseData; userName: string; onClose: () => void; onDone: (p: NurseProcedure) => void }> = ({ dose, data, userName, onClose, onDone }) => {
  const active = data.queue.filter((t) => !['NO_SHOW', 'CANCELLED'].includes(t.status));
  const [uhid, setUhid] = useState(dose?.rx.uhid || '');
  const tok = active.find((t) => t.uhid === uhid);
  const [kind, setKind] = useState<NurseProcedure['kind']>(dose ? kindOfItem(dose.name) : 'INJECTION');
  const [detail, setDetail] = useState(dose ? `${dose.name}${dose.dose ? ` · ${dose.dose}` : ''}` : '');
  const [orderedBy, setOrderedBy] = useState(dose?.rx.doctorName || tok?.doctor || data.doctors[0] || '');
  const [route, setRoute] = useState(dose ? (/^neb/i.test(dose.name) ? 'Inhalation' : /^(iv|i\.v\.|infusion)/i.test(dose.name) ? 'IV' : 'IM') : '');
  const [site, setSite] = useState('');
  const [batch, setBatch] = useState('');
  const [status, setStatus] = useState<NurseProcedure['status']>('GIVEN');
  const [note, setNote] = useState('');
  const [rights, setRights] = useState<boolean[]>(RIGHTS.map(() => false));
  const medicine = kind === 'INJECTION' || kind === 'IV_FLUID' || kind === 'NEBULISATION';
  const patient = dose ? { name: dose.rx.patientName, uhid: dose.rx.uhid } : tok ? { name: tok.patient, uhid: tok.uhid } : null;
  const ok = !!patient && detail.trim().length >= 3 && !!orderedBy && (status === 'REFUSED' ? note.trim().length >= 3 : !medicine || rights.every(Boolean));
  return (
    <HmsModal
      title={dose ? `Give ${dose.name}` : 'Record a procedure'}
      description={dose ? `${dose.rx.patientName} · ${dose.rx.uhid} · prescribed by ${dose.rx.doctorName} (${dose.rx.prescriptionNo})` : 'Injection, drip, nebulisation, dressing or ECG done in the treatment room on a doctor’s order.'}
      width={640}
      onClose={onClose}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton
            variant={status === 'REFUSED' ? 'danger' : 'primary'}
            icon={Syringe}
            disabled={!ok}
            onClick={() => {
              if (!patient) return;
              const p = patientJourneyService.addNurseProcedure({
                id: `proc-${new Date().getTime()}`,
                uhid: patient.uhid,
                patientName: patient.name,
                token: tok?.token,
                kind,
                detail: detail.trim(),
                orderedBy,
                rxNo: dose?.rx.prescriptionNo,
                rxItem: dose?.index,
                route: route.trim() || undefined,
                site: site.trim() || undefined,
                batchNo: batch.trim() || undefined,
                status,
                note: note.trim() || undefined,
                at: new Date().toISOString(),
                by: userName,
              });
              onDone(p);
            }}
          >
            {status === 'REFUSED' ? 'Record refusal' : 'Record as given'}
          </HmsButton>
        </>
      }
    >
      {!dose && (
        <HmsField label="Patient" htmlFor="adm-pt" required>
          <PatientSelect id="adm-pt" options={active.map((t) => ({ key: t.uhid, label: `${tokenLabel(t.token)} · ${t.patient} (${t.uhid})` }))} value={uhid} onChange={(v) => { setUhid(v); const t = active.find((x) => x.uhid === v); if (t) setOrderedBy(t.doctor); }} />
        </HmsField>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <HmsField label="Type" htmlFor="adm-kind">
          <select id="adm-kind" style={INPUT} value={kind} onChange={(e) => setKind(e.target.value as NurseProcedure['kind'])}>
            {(Object.keys(PROC_KIND) as NurseProcedure['kind'][]).map((k) => (
              <option key={k} value={k}>
                {PROC_KIND[k]}
              </option>
            ))}
          </select>
        </HmsField>
        <HmsField label="Ordered by" htmlFor="adm-doc" required>
          <select id="adm-doc" style={INPUT} value={orderedBy} onChange={(e) => setOrderedBy(e.target.value)}>
            <option value="">Choose the doctor</option>
            {Array.from(new Set([orderedBy, ...data.doctors].filter(Boolean))).map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </HmsField>
      </div>
      <HmsField label={medicine ? 'Medicine and dose' : 'What was done'} htmlFor="adm-detail" required>
        <input id="adm-detail" style={INPUT} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={medicine ? 'e.g. Inj. Diclofenac 75 mg' : 'e.g. Wound dressing, left forearm'} />
      </HmsField>
      {medicine && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
          <HmsField label="Route" htmlFor="adm-route">
            <input id="adm-route" style={INPUT} value={route} onChange={(e) => setRoute(e.target.value)} placeholder="IM / IV / SC" />
          </HmsField>
          <HmsField label="Site" htmlFor="adm-site">
            <input id="adm-site" style={INPUT} value={site} onChange={(e) => setSite(e.target.value)} placeholder="e.g. Left deltoid" />
          </HmsField>
          <HmsField label="Batch no." htmlFor="adm-batch">
            <input id="adm-batch" style={INPUT} value={batch} onChange={(e) => setBatch(e.target.value)} />
          </HmsField>
        </div>
      )}
      <HmsField label="Outcome">
        <Choice label="Outcome" value={status} options={[{ key: 'GIVEN', label: 'Given / done', tone: 'green' }, { key: 'REFUSED', label: 'Refused / not given', tone: 'red' }]} onChange={setStatus} />
      </HmsField>
      {medicine && status === 'GIVEN' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Five rights checked</div>
          {RIGHTS.map((r, i) => (
            <HmsToggle key={r} checked={rights[i]} onChange={(v) => setRights((prev) => prev.map((x, j) => (j === i ? v : x)))} label={r} showLabel />
          ))}
        </div>
      )}
      <HmsField label={status === 'REFUSED' ? 'Reason' : 'Note'} htmlFor="adm-note" required={status === 'REFUSED'}>
        <input id="adm-note" style={INPUT} value={note} onChange={(e) => setNote(e.target.value)} placeholder={status === 'REFUSED' ? 'e.g. Patient declined; doctor informed' : 'e.g. Observed 15 min, no reaction'} />
      </HmsField>
    </HmsModal>
  );
};

/* ---------------- SBAR handover ---------------- */


export const HandoverModal: React.FC<{ draft: Omit<NurseHandover, 'id' | 'at' | 'to' | 'checklist' | 'exceptions'>; onClose: () => void; onDone: (h: NurseHandover) => void }> = ({ draft, onClose, onDone }) => {
  const [s, setS] = useState(draft.situation);
  const [b, setB] = useState(draft.background);
  const [a, setA] = useState(draft.assessment);
  const [r, setR] = useState(draft.recommendation);
  const [to, setTo] = useState('');
  const [checks, setChecks] = useState<boolean[]>(HANDOVER_CHECKS.map(() => false));
  const [exceptions, setExceptions] = useState('');
  const missing = checks.some((c) => !c);
  const ok = to.trim().length >= 3 && s.trim().length > 0 && (!missing || exceptions.trim().length >= 5);
  const area = (id: string, label: string, v: string, set: (x: string) => void, hint: string) => (
    <HmsField label={label} htmlFor={id} hint={hint}>
      <textarea id={id} style={{ ...TEXTAREA, minHeight: '72px' }} value={v} onChange={(e) => set(e.target.value)} />
    </HmsField>
  );
  return (
    <HmsModal
      title={`Hand over · ${SHIFTS[draft.shift].label}`}
      description={`From ${draft.from}. Pre-filled from the live station; edit before you sign.`}
      width={760}
      onClose={onClose}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton
            variant="primary"
            icon={Send}
            disabled={!ok}
            onClick={() =>
              onDone(
                patientJourneyService.addNurseHandover({
                  ...draft,
                  id: `ho-${new Date().getTime()}`,
                  at: new Date().toISOString(),
                  to: to.trim(),
                  situation: s.trim(),
                  background: b.trim(),
                  assessment: a.trim(),
                  recommendation: r.trim(),
                  checklist: Object.fromEntries(HANDOVER_CHECKS.map((c, i) => [c, checks[i]])),
                  exceptions: exceptions.trim() || undefined,
                }),
              )
            }
          >
            Sign and hand over
          </HmsButton>
        </>
      }
    >
      {area('ho-s', 'S — Situation', s, setS, 'Station status now.')}
      {area('ho-b', 'B — Background', b, setB, 'Patients on beds and why.')}
      {area('ho-a', 'A — Assessment', a, setA, 'Who is unwell or at risk.')}
      {area('ho-r', 'R — Recommendation', r, setR, 'What the next nurse must do first.')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Station safety checks</div>
        {HANDOVER_CHECKS.map((c, i) => (
          <HmsToggle key={c} checked={checks[i]} onChange={(v) => setChecks((prev) => prev.map((x, j) => (j === i ? v : x)))} label={c} showLabel />
        ))}
      </div>
      {missing && (
        <HmsField label="Checks not done — reason" htmlFor="ho-exc" required>
          <input id="ho-exc" style={INPUT} value={exceptions} onChange={(e) => setExceptions(e.target.value)} placeholder="e.g. Defibrillator sent to biomedical; spare from ICU" />
        </HmsField>
      )}
      <HmsField label="Handed over to" htmlFor="ho-to" required>
        <input id="ho-to" style={INPUT} value={to} onChange={(e) => setTo(e.target.value)} placeholder="Incoming nurse's name" />
      </HmsField>
    </HmsModal>
  );
};
