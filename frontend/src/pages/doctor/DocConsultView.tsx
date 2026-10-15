// Doctor — consultation (design bible §15: three columns). Left: the patient — nurse vitals with NEWS2, allergies,
// conditions, medicines, past visits. Centre: complaint, examination, diagnosis (ICD-10), prescription from the
// pharmacy formulary with stock and allergy checks, investigations, advice, follow-up and referral. Right: alerts,
// this patient's lab reports, outside documents and previous prescriptions. The draft is kept per token, so the
// doctor can send a patient for tests and finish later.
import React, { useEffect, useMemo, useState } from 'react';
import { Megaphone, Save, FlaskConical, Send, CheckCircle2, Trash2, Plus, Repeat, AlertTriangle, ShieldCheck, Search, Eye, Play } from 'lucide-react';
import { HmsBadge, HmsButton, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsField, HmsModal, HmsToggle, INPUT, TEXTAREA, HMS, PANEL, initialsOf } from '../../components/hms';
import { patientJourneyService, SharedLabOrder, SharedPrescription, SharedQueueToken } from '../../services/patientJourneyService';
import { OpdApi } from '../../services/opdService';
import { opdActions } from '../../services/opdActions';
import { pharmacyInventoryService, AllergyEvaluationResponse, MedicineItem } from '../../services/pharmacyInventoryService';
import { LabApi, labApiMode } from '../../services/labService';
import { MONO, tokenLabel, fmtDate, sameDoctor } from '../reception/receptionData';
import { NEWS_BAND, bandOfScore, categoryOf, clock } from '../nurse/nurseData';
import { Choice } from '../nurse/NurseModals';
import { isCalledIn, isInChamber } from '../assistant/assistantData';
import { DoctorActions, DoctorData, ConsultDraft, RxLine, emptyDraft, newRxLine, linesFrom, FREQUENCIES, TIMINGS, RADIOLOGY, DEPARTMENTS, ICD10, addDays, localAllergyHit } from './doctorData';

export interface DocConsultViewProps {
  data: DoctorData;
  act: DoctorActions;
  initialSelect?: string;
}

const COL: React.CSSProperties = { ...PANEL, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0, alignSelf: 'start', position: 'sticky', top: '76px', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' };
const EXAM = ['General: conscious, oriented, afebrile', 'CVS: S1 S2 heard, no murmur', 'RS: bilateral air entry equal, no added sounds', 'P/A: soft, non-tender, no organomegaly', 'CNS: no focal deficit', 'Throat: congested'];
const SMALL: React.CSSProperties = { ...INPUT, height: '36px', fontSize: '13px', padding: '0 8px' };

const CritAckModal: React.FC<{ order: SharedLabOrder; doctor: string; onClose: () => void; onDone: () => void }> = ({ order, doctor, onClose, onDone }) => {
  const [note, setNote] = useState('');
  const [ok, setOk] = useState(false);
  return (
    <HmsModal
      title={`Acknowledge critical result · ${order.testName}`}
      description={`${order.patientName} · ${order.orderNo}. Recorded in the lab's audit trail.`}
      onClose={onClose}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton variant="primary" icon={ShieldCheck} disabled={!ok || note.trim().length < 5} onClick={() => { patientJourneyService.acknowledgeCriticalLabOrder(order.id, doctor, note.trim()); onDone(); }}>
            Acknowledge
          </HmsButton>
        </>
      }
    >
      <HmsNotice tone="red">{order.parameters.filter((p) => p.isCritical).map((p) => `${p.paramName} ${p.observedValue} ${p.unit}`.trim()).join(' · ') || 'Critical flag set by the lab'}</HmsNotice>
      <HmsField label="Action taken" htmlFor="ack-note" required>
        <input id="ack-note" style={INPUT} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Patient recalled, potassium replacement started" />
      </HmsField>
      <HmsToggle checked={ok} onChange={setOk} label="I have reviewed the critical value" showLabel />
    </HmsModal>
  );
};

/** Formulary search against the pharmacy server (with stock); free text when offline. */
const MedicineSearch: React.FC<{ onAdd: (name: string, generic?: string, inStock?: boolean | null) => void }> = ({ onAdd }) => {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<MedicineItem[]>([]);
  const online = labApiMode();
  useEffect(() => {
    if (!online || q.trim().length < 2) return;
    let live = true;
    const t = window.setTimeout(() => {
      pharmacyInventoryService
        .getMedicines('all', q.trim())
        .then((r) => live && setHits((r || []).filter((m) => !m.is_archived).slice(0, 8)))
        .catch(() => live && setHits([]));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [q, online]);
  const add = (name: string, generic?: string, inStock?: boolean | null) => {
    onAdd(name, generic, inStock);
    setQ('');
    setHits([]);
  };
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} color={HMS.primary} style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            aria-label="Search medicine"
            style={{ ...INPUT, paddingLeft: '36px' }}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (e.target.value.trim().length < 2) setHits([]);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && q.trim()) {
                e.preventDefault();
                if (hits[0]) add(hits[0].name, hits[0].generic_name || undefined, hits[0].available_stock > 0);
                else add(q.trim(), undefined, null);
              }
            }}
            placeholder={online ? 'Search the pharmacy formulary (name or generic)…' : 'Type a medicine name and press Enter'}
          />
        </div>
        <HmsButton icon={Plus} disabled={!q.trim()} onClick={() => add(q.trim(), undefined, null)}>
          Add
        </HmsButton>
      </div>
      {hits.length > 0 && (
        <div role="listbox" aria-label="Formulary matches" style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, top: '44px', background: '#ffffff', border: `1px solid ${HMS.border}`, borderRadius: '10px', boxShadow: '0 10px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {hits.map((m) => (
            <button key={m.id} type="button" role="option" aria-selected={false} onClick={() => add(m.name, m.generic_name || undefined, m.available_stock > 0)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', gap: '8px', padding: '10px 12px', border: 'none', borderBottom: `1px solid ${HMS.divider}`, background: '#ffffff', cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
              <span>
                <strong>{m.name}</strong>
                {m.generic_name ? <span style={{ color: HMS.textSecondary }}> · {m.generic_name}</span> : null}
              </span>
              {m.available_stock > 0 ? <HmsBadge tone="green">In stock {m.available_stock}</HmsBadge> : <HmsBadge tone="red">Out of stock</HmsBadge>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const DocConsultView: React.FC<DocConsultViewProps> = ({ data, act, initialSelect }) => {
  const closed = ['COMPLETED', 'NO_SHOW', 'CANCELLED'];
  const t = (initialSelect ? data.mine.find((x) => String(x.token) === initialSelect && !closed.includes(x.status)) : undefined) || data.mine.find((x) => isInChamber(x) || isCalledIn(x)) || null;
  if (!t)
    return (
      <div style={{ ...PANEL, padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
        <HmsEmpty>No patient in the consultation room. Call the next patient from the queue.</HmsEmpty>
        <div style={{ display: 'flex', gap: '10px' }}>
          <HmsButton icon={Megaphone} onClick={() => act.goTo('queue')}>
            Open queue
          </HmsButton>
        </div>
      </div>
    );
  return <ConsultForm key={t.id} t={t} data={data} act={act} />;
};

const ConsultForm: React.FC<{ t: SharedQueueToken; data: DoctorData; act: DoctorActions }> = ({ t, data, act }) => {
  const doctor = data.doctor!;
  const [d, setD] = useState<ConsultDraft>(() => patientJourneyService.getConsultDraft<ConsultDraft>(t.id) || emptyDraft(t));
  const [dirty, setDirty] = useState(false);
  const [labQ, setLabQ] = useState('');
  const [check, setCheck] = useState<AllergyEvaluationResponse | null>(null);
  const [override, setOverride] = useState(false);
  const [ack, setAck] = useState<SharedLabOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof ConsultDraft>(k: K, v: ConsultDraft[K]) => {
    setD((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };
  const setLine = (key: string, patch: Partial<RxLine>) => set('rx', d.rx.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const allergies = useMemo(() => (t.assessment?.allergies?.length ? t.assessment.allergies : t.allergies) || [], [t.assessment, t.allergies]);
  const conditions = t.assessment?.medicalHistory?.length ? t.assessment.medicalHistory : t.chronicConditions || [];
  const meds = t.assessment?.currentMedications?.length ? t.assessment.currentMedications : t.currentMedications || [];
  const pastRx = data.prescriptions.filter((r) => r.uhid === t.uhid && r.tokenId !== t.id).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const labs = data.labOrders.filter((o) => o.uhid === t.uhid && !o.cancelled);
  const allLabsForPatient = patientJourneyService.getLabOrders().filter((o) => o.uhid === t.uhid);
  const docs = data.documents.filter((x) => x.uhid === t.uhid);
  const band = bandOfScore(t.vitals?.news2);
  const critOpen = allLabsForPatient.filter((o) => o.stage === 'REPORT_GENERATED' && o.isFlaggedCritical && !o.criticalAcknowledged);
  const pendingLabs = labs.filter((o) => o.stage !== 'REPORT_GENERATED');

  // Server allergy check of the prescription (the pharmacy matches the patient's recorded allergies)
  const names = d.rx.map((l) => l.medicineName.trim()).filter(Boolean).join('|');
  useEffect(() => {
    if (!labApiMode() || !names) return;
    let live = true;
    const tm = window.setTimeout(() => {
      pharmacyInventoryService
        .checkAllergies(t.uhid, names.split('|').map((name) => ({ name })))
        .then((r) => live && setCheck(r))
        .catch(() => live && setCheck(null));
    }, 400);
    return () => {
      live = false;
      window.clearTimeout(tm);
    };
  }, [names, t.uhid]);
  const liveCheck = names ? check : null;
  const conflicts = useMemo(() => {
    const out = new Map<string, string>();
    d.rx.forEach((l) => {
      const local = localAllergyHit(allergies, l);
      if (local) out.set(l.key, `Allergy recorded: ${local}`);
      const srv = liveCheck?.medications.find((m) => m.medicine_name.toLowerCase() === l.medicineName.toLowerCase() && m.has_allergy_conflict);
      if (srv) out.set(l.key, `Pharmacy allergy check: conflicts with ${liveCheck?.patient_allergies.join(', ') || 'recorded allergy'}`);
    });
    return out;
  }, [d.rx, allergies, liveCheck]);

  const catalog = useMemo(() => {
    const live = labApiMode() ? LabApi.catalog().filter((c) => c.status === 'Active').map((c) => c.name) : [];
    return live.length ? live : Object.keys(patientJourneyService.getLabTariffs());
  }, []);
  const labHits = labQ.trim() ? catalog.filter((n) => n.toLowerCase().includes(labQ.trim().toLowerCase()) && !d.labTests.includes(n)).slice(0, 8) : [];

  const saveDraft = (msg = true) => {
    void opdActions.saveDraft(t, d);
    setDirty(false);
    if (msg) act.notify(`Draft saved for ${t.patient}`);
  };

  const sendOrders = (radiologyOnly = false) => {
    const all = [...(radiologyOnly ? [] : d.labTests.map((n) => ({ n, radio: false }))), ...d.radiology.map((n) => ({ n, radio: true }))];
    all.forEach(({ n, radio }, i) => {
      const order = patientJourneyService.addLabOrder(
        {
          id: `lab-${new Date().getTime()}-${i}`,
          orderNo: `${radio ? 'RAD' : 'LAB'}-${new Date().getTime().toString().slice(-8)}-${i}`,
          patientName: t.patient,
          uhid: t.uhid,
          age: t.age,
          gender: t.gender,
          testName: n,
          category: radio ? 'Radiology' : 'Laboratory',
          sampleType: radio ? 'Imaging' : '',
          container: '',
          doctor: doctor.name,
          barcode: '',
          priority: d.orderPriority,
          stage: 'ORDERED',
          price: patientJourneyService.getLabTestPrice(n, d.orderPriority === 'STAT'),
          isFlaggedAbnormal: false,
          parameters: [],
        },
        { location: `OPD ${doctor.room?.roomNumber || t.room}`.trim(), clinicalNotes: [d.diagnosis, d.complaint].filter(Boolean).join(' — ') || undefined },
      );
      // Signed in, Billing stages lab charges when the server creates the order; radiology stays local
      if (!labApiMode() || radio) patientJourneyService.appendLabOrderToBilling(order);
    });
    return all.length;
  };

  const lineOk = (l: RxLine) => l.medicineName.trim() && l.frequency && Number(l.durationDays) > 0;
  const problems = [
    !d.diagnosis.trim() && 'a diagnosis',
    d.rx.some((l) => !lineOk(l)) && 'frequency and days for every medicine',
    conflicts.size > 0 && !override && 'confirmation of the allergy warning',
    !!d.referTo && d.referReason.trim().length < 5 && 'a reason for the referral',
  ].filter(Boolean) as string[];

  const [confirmTests, setConfirmTests] = useState(false);
  const away = !!t.awaitingReports;
  const nextPatient = () => {
    const next = data.queue
      .filter((q) => q.id !== t.id && sameDoctor(q.doctor, doctor.name) && !q.awaitingReports && !q.chamberHold && (q.status === 'READY_FOR_DOCTOR' || q.status === 'TRIAGED' || q.status === 'WAITING' || q.status === 'EMERGENCY'))
      .sort((a, b) => (a.priority === 'EMERGENCY' ? 0 : 1) - (b.priority === 'EMERGENCY' ? 0 : 1) || a.token - b.token)[0];
    if (next) {
      act.callIn(next);
      act.goTo('queue', undefined, String(next.token));
    } else act.goTo('queue');
  };
  const sendForTests = () => {
    if (!d.labTests.length && !d.radiology.length) return act.notify('Choose the tests first', 'error');
    setConfirmTests(false);
    if (opdActions.server()) {
      // Lab tests go to the server with the visit (charges staged, visit waits for the reports); imaging stays a local order
      const radio = d.radiology.length ? sendOrders(true) : 0;
      const tests = d.labTests.map((name) => ({ name, priority: d.orderPriority, notes: [d.diagnosis, d.complaint].filter(Boolean).join(' — ') }));
      void (tests.length ? OpdApi.sendForTests(t, tests, { ...d, labTests: [], radiology: [] }) : Promise.resolve(null)).then((v) => {
        data.reload();
        if (tests.length && !v) return;
        const n = tests.length + radio;
        act.notify(`${n} test${n === 1 ? '' : 's'} ordered · ${t.patient} will come back with the reports`);
        setDirty(false);
      });
      return;
    }
    const n = sendOrders();
    patientJourneyService.saveConsultDraft(t.id, { ...d, labTests: [], radiology: [] });
    patientJourneyService.updateQueueToken(t.token, { status: 'READY_FOR_DOCTOR', callingStatus: 'IDLE', chamberHold: `Sent for ${n} test${n === 1 ? '' : 's'} — review with reports` });
    data.reload();
    act.notify(`${n} test${n === 1 ? '' : 's'} ordered · ${t.patient} will come back with the reports`);
    act.goTo('queue');
  };

  const complete = async () => {
    setBusy(true);
    const now = new Date();
    const lines = d.rx.filter(lineOk);
    const rx: SharedPrescription = {
      id: `rx-${now.getTime()}`,
      prescriptionNo: `RX-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getTime()).slice(-6)}`,
      uhid: t.uhid,
      patientName: t.patient,
      age: t.age,
      gender: t.gender,
      doctorName: doctor.name,
      doctorSpecialization: doctor.specialty,
      chamber: doctor.room?.roomNumber || t.room,
      date: now.toISOString().split('T')[0],
      diagnosis: d.diagnosis.trim(),
      diagnosisCode: d.diagnosisCode.trim() || undefined,
      chiefComplaints: d.complaint.trim(),
      clinicalNotes: d.history.trim() || undefined,
      examination: d.examination.trim() || undefined,
      advice: d.advice.trim() || undefined,
      investigations: [...d.labTests, ...d.radiology],
      referral: d.referTo ? `${d.referTo}: ${d.referReason.trim()}` : undefined,
      vitals: t.vitals?.bp ? { bp: t.vitals.bp, pulse: t.vitals.pulse, temp: t.vitals.temp, spo2: t.vitals.spo2, weight: t.vitals.weight } : undefined,
      items: lines.map((l) => ({ medicineName: l.medicineName.trim(), dosage: l.dosage.trim(), frequency: l.frequency, durationDays: Number(l.durationDays), timing: l.timing === '—' ? undefined : l.timing, instructions: l.instructions.trim() || undefined })),
      followUpDate: d.followUpDate || undefined,
      isDispensed: false,
      tokenId: t.id,
    };
    if (opdActions.server()) {
      // One server transaction: consultation, prescription, pharmacy order and lab orders, all on this visit
      const radio = d.radiology.length ? sendOrders(true) : 0;
      const v = await OpdApi.complete(t, {
        diagnosis: rx.diagnosis, chief_complaint: rx.chiefComplaints, history: rx.clinicalNotes || '', examination: rx.examination || '',
        icd10_codes: rx.diagnosisCode ? [rx.diagnosisCode] : [], advice: rx.advice || '',
        referral: d.referTo ? { department: d.referTo, reason: d.referReason.trim() } : null,
        follow_up_date: d.followUpDate || null, follow_up_reason: d.followUpReason.trim() || d.diagnosis.trim(), allergy_override_reason: override ? 'Allergy warning confirmed by the doctor' : '',
        medicines: rx.items.map((i) => ({ name: i.medicineName, dose: i.dosage, frequency: i.frequency, days: i.durationDays, timing: i.timing || '', instructions: i.instructions || '' })),
        tests: d.labTests.map((name) => ({ name, priority: d.orderPriority })),
      });
      setBusy(false);
      if (!v) return; // refused: the reason is shown and the consultation stays open
      const serverRx = v.prescriptions?.[0];
      // Keep a copy for the print and checkout screens (the server holds the record)
      patientJourneyService.addPrescription({ ...rx, prescriptionNo: serverRx?.number || rx.prescriptionNo });
      if (d.followUpDate) patientJourneyService.addFollowUp({ id: `fu-${now.getTime()}`, uhid: t.uhid, patientName: t.patient, phone: t.phone, doctorName: doctor.name, prescribedOn: rx.date, followUpDate: d.followUpDate, reason: d.followUpReason.trim() || d.diagnosis.trim(), status: 'PENDING_BOOKING' });
      patientJourneyService.saveConsultDraft(t.id, null);
      data.reload();
      const disp = serverRx?.dispenseOrders?.[0];
      const n = d.labTests.length + radio;
      act.notify(`${t.patient}: ${serverRx?.number || 'consultation saved'}${n ? ` · ${n} test${n === 1 ? '' : 's'} ordered` : ''}${d.followUpDate ? ` · follow-up ${fmtDate(d.followUpDate)}` : ''}${disp ? ` · pharmacy order ${disp.number}` : ''}`);
      act.goTo('queue');
      return;
    }
    patientJourneyService.addPrescription(rx);
    const orders = sendOrders();
    if (d.followUpDate) patientJourneyService.addFollowUp({ id: `fu-${now.getTime()}`, uhid: t.uhid, patientName: t.patient, phone: t.phone, doctorName: doctor.name, prescribedOn: rx.date, followUpDate: d.followUpDate, reason: d.followUpReason.trim() || d.diagnosis.trim(), status: 'PENDING_BOOKING' });
    patientJourneyService.updateQueueToken(t.token, {
      status: 'COMPLETED',
      callingStatus: 'IDLE',
      chamberHold: undefined,
      checkoutTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...(d.referTo ? { triageNotes: `Referred to ${d.referTo} by ${doctor.name}: ${d.referReason.trim()}` } : {}),
    });
    patientJourneyService.saveConsultDraft(t.id, null);
    let pharmacy = '';
    if (lines.length && labApiMode()) {
      try {
        const res = await pharmacyInventoryService.enqueueDoctorPrescription({
          uhid: t.uhid,
          encounter_type: 'OPD',
          doctor_name: doctor.name,
          priority: d.orderPriority,
          diagnosis: rx.diagnosis,
          instructions: d.advice.trim() || undefined,
          medications: rx.items.map((i) => ({ medicationName: i.medicineName, dosage: i.dosage, frequency: i.frequency, durationDays: i.durationDays, instructions: [i.timing, i.instructions].filter(Boolean).join(' · ') || undefined })),
        });
        pharmacy = ` · pharmacy order ${res.dispense_order.order_number}`;
      } catch {
        pharmacy = ' · pharmacy did not accept the order — the patient can show the printed prescription';
      }
    }
    setBusy(false);
    data.reload();
    act.notify(`${t.patient}: ${rx.prescriptionNo}${orders ? ` · ${orders} test${orders === 1 ? '' : 's'} ordered` : ''}${d.followUpDate ? ` · follow-up ${fmtDate(d.followUpDate)}` : ''}${pharmacy}`);
    act.goTo('queue');
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(0, 2.75fr) minmax(260px, 1.25fr)', gap: '16px', alignItems: 'start' }}>
        {/* ---------- left: patient ---------- */}
        <aside aria-label="Patient" style={COL}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '9999px', background: HMS.primaryTint, border: `1.5px solid ${HMS.primaryBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: HMS.primaryStrong, flexShrink: 0 }}>{initialsOf(t.patient)}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{t.patient}</div>
              <div style={{ fontSize: '12px', color: HMS.textSecondary }}>
                {tokenLabel(t.token)} · {t.age ? `${t.age} y` : 'age —'} · {t.gender || '—'}
              </div>
              <div style={{ ...MONO, color: HMS.textSecondary }}>{t.uhid}</div>
            </div>
          </div>
          {isCalledIn(t) && (
            <HmsButton variant="primary" icon={Play} block onClick={() => act.startConsult(t)}>
              Patient is here — start
            </HmsButton>
          )}
          {allergies.length === 0 ? <HmsNotice tone="amber">Allergies not asked</HmsNotice> : allergies.includes('NKDA') ? <HmsNotice tone="green">No known drug allergies</HmsNotice> : <HmsNotice tone="red">Allergies: {allergies.join(', ')}</HmsNotice>}
          <HmsSection title={`Vitals${t.vitals?.recordedAt ? ` · ${clock(t.vitals.recordedAt)}` : ''}`}>
            {t.vitals?.bp ? (
              <>
                <HmsRow label="BP" value={t.vitals.bp} />
                <HmsRow label="Pulse · SpO₂" value={`${t.vitals.pulse ?? '—'} · ${t.vitals.spo2 ?? '—'}%`} />
                <HmsRow label="Temp · RR" value={`${t.vitals.temp ?? '—'} °F · ${t.vitals.respiratoryRate ?? '—'}`} />
                <HmsRow label="Weight · BMI" value={`${t.vitals.weight ?? '—'} · ${t.vitals.bmi ?? '—'}`} />
                <HmsRow label="NEWS2" value={band ? <HmsBadge tone={NEWS_BAND[band].tone}>{t.vitals.news2}</HmsBadge> : '—'} hint={t.vitals.recordedBy} last />
              </>
            ) : (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>Not recorded{t.triageNotes?.startsWith('Triage skipped') ? ` — ${t.triageNotes}` : ''}.</div>
            )}
          </HmsSection>
          {(categoryOf(t.assessment?.triageCategory) || t.assessment?.nurseNotes) && (
            <HmsSection title="Triage">
              {categoryOf(t.assessment?.triageCategory) && <HmsRow label="Category" value={categoryOf(t.assessment?.triageCategory)!.label} />}
              {t.assessment?.painScale !== undefined && <HmsRow label="Pain" value={`${t.assessment.painScale}/10`} />}
              {t.assessment?.fallRisk && <HmsRow label="Fall risk" value={t.assessment.fallRisk.toLowerCase()} />}
              {t.assessment?.pregnancy && <HmsRow label="Pregnancy" value={t.assessment.pregnancy.replace('_', ' ').toLowerCase()} />}
              <HmsRow label="Nurse note" value={t.assessment?.nurseNotes || '—'} last />
            </HmsSection>
          )}
          <HmsSection title="History">
            <HmsRow label="Conditions" value={conditions.length ? conditions.join(', ') : '—'} />
            <HmsRow label="Medicines" value={meds.length ? meds.join(', ') : '—'} last />
          </HmsSection>
          <HmsSection title={`Past visits · ${pastRx.length}`}>
            {pastRx.length === 0 && <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>First visit on record.</div>}
            {pastRx.slice(0, 5).map((r, i) => (
              <HmsRow key={r.id} label={fmtDate(r.date)} value={r.diagnosis || '—'} hint={r.doctorName} last={i === Math.min(pastRx.length, 5) - 1} />
            ))}
          </HmsSection>
        </aside>

        {/* ---------- centre: the consultation ---------- */}
        <section aria-label="Consultation" style={{ ...PANEL, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${HMS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>Consultation · {t.patient}</div>
              <div style={{ fontSize: '12px', color: HMS.textSecondary }}>
                {doctor.name} · {doctor.room?.roomNumber || t.room}
                {t.seatedAt ? ` · started ${clock(t.seatedAt)}` : ''}
              </div>
            </div>
            {dirty ? <HmsBadge tone="amber">Unsaved</HmsBadge> : patientJourneyService.getConsultDraft(t.id) ? <HmsBadge tone="blue">Draft saved</HmsBadge> : null}
          </div>
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {t.chamberHold && <HmsNotice tone="blue">{t.chamberHold}</HmsNotice>}
            <HmsSection title="Complaint & history">
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <HmsField label="Chief complaint" htmlFor="cs-complaint" hint={t.assessment?.chiefComplaint ? 'From the nurse’s triage — edit as needed.' : undefined}>
                  <textarea id="cs-complaint" style={{ ...TEXTAREA, minHeight: '60px' }} value={d.complaint} onChange={(e) => set('complaint', e.target.value)} />
                </HmsField>
                <HmsField label="History of present illness" htmlFor="cs-history">
                  <textarea id="cs-history" style={{ ...TEXTAREA, minHeight: '60px' }} value={d.history} onChange={(e) => set('history', e.target.value)} placeholder="Onset, duration, progression, relevant negatives" />
                </HmsField>
              </div>
            </HmsSection>

            <HmsSection title="Examination">
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div role="group" aria-label="Insert examination line" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {EXAM.map((x) => (
                    <button key={x} type="button" onClick={() => set('examination', d.examination ? `${d.examination}\n${x}` : x)} style={{ height: '30px', padding: '0 10px', borderRadius: '9999px', border: `1px solid ${HMS.border}`, background: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                      + {x.split(':')[0]}
                    </button>
                  ))}
                </div>
                <textarea aria-label="Examination findings" style={TEXTAREA} value={d.examination} onChange={(e) => set('examination', e.target.value)} placeholder="Findings on examination" />
              </div>
            </HmsSection>

            <HmsSection title="Diagnosis">
              <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 140px', gap: '12px' }}>
                <HmsField label="Diagnosis" htmlFor="cs-dx" required>
                  <DiagnosisInput
                    value={d.diagnosis}
                    onChange={(v, code) => {
                      setD((p) => ({ ...p, diagnosis: v, diagnosisCode: code ?? p.diagnosisCode }));
                      setDirty(true);
                    }}
                  />
                </HmsField>
                <HmsField label="ICD-10" htmlFor="cs-icdcode">
                  <input id="cs-icdcode" style={INPUT} value={d.diagnosisCode} onChange={(e) => set('diagnosisCode', e.target.value.toUpperCase())} placeholder="e.g. J06.9" />
                </HmsField>
              </div>
            </HmsSection>

            <HmsSection title={`Prescription · ${d.rx.length}`}>
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <MedicineSearch onAdd={(name, generic, inStock) => set('rx', [...d.rx, newRxLine(name, generic, inStock)])} />
                  </div>
                  {pastRx[0] && pastRx[0].items.length > 0 && (
                    <HmsButton icon={Repeat} onClick={() => set('rx', [...d.rx, ...linesFrom(pastRx[0])])} title={`Repeat ${pastRx[0].prescriptionNo} from ${fmtDate(pastRx[0].date)}`}>
                      Repeat last
                    </HmsButton>
                  )}
                </div>
                {d.rx.length === 0 && <div style={{ fontSize: '13px', color: HMS.textSecondary }}>No medicines yet.</div>}
                {d.rx.map((l, i) => (
                  <div key={l.key} style={{ border: `1px solid ${conflicts.has(l.key) ? '#fecaca' : HMS.border}`, background: conflicts.has(l.key) ? '#fef2f2' : '#ffffff', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, minWidth: 0 }}>
                        {i + 1}. {l.medicineName}
                        {l.genericName ? <span style={{ fontWeight: 400, color: HMS.textSecondary }}> · {l.genericName}</span> : null}{' '}
                        {l.inStock === false && <HmsBadge tone="amber">Not in stock</HmsBadge>}
                      </div>
                      <button type="button" aria-label={`Remove ${l.medicineName}`} title={`Remove ${l.medicineName}`} onClick={() => set('rx', d.rx.filter((x) => x.key !== l.key))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: HMS.textSecondary, display: 'flex', padding: '6px', borderRadius: '6px' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {conflicts.has(l.key) && (
                      <div style={{ fontSize: '12px', color: '#b91c1c', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <AlertTriangle size={14} /> {conflicts.get(l.key)}
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 600, color: HMS.textSecondary }}>
                        Dose
                        <input aria-label={`Dose for ${l.medicineName}`} style={SMALL} value={l.dosage} onChange={(e) => setLine(l.key, { dosage: e.target.value })} placeholder="e.g. 1 tab" />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 600, color: HMS.textSecondary }}>
                        Frequency
                        <select aria-label={`Frequency for ${l.medicineName}`} style={SMALL} value={l.frequency} onChange={(e) => setLine(l.key, { frequency: e.target.value })}>
                          {Array.from(new Set([l.frequency, ...FREQUENCIES].filter(Boolean))).map((f) => (
                            <option key={f}>{f}</option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 600, color: HMS.textSecondary }}>
                        When to take
                        <select aria-label={`When to take ${l.medicineName}`} style={SMALL} value={l.timing} onChange={(e) => setLine(l.key, { timing: e.target.value })}>
                          {Array.from(new Set([l.timing, ...TIMINGS].filter(Boolean))).map((f) => (
                            <option key={f}>{f}</option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 600, color: HMS.textSecondary }}>
                        Days
                        <input aria-label={`Days for ${l.medicineName}`} inputMode="numeric" style={SMALL} value={l.durationDays} onChange={(e) => setLine(l.key, { durationDays: e.target.value.replace(/\D/g, '') })} placeholder="e.g. 5" />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 600, color: HMS.textSecondary, gridColumn: 'span 2' }}>
                        Instructions
                        <input aria-label={`Instructions for ${l.medicineName}`} style={SMALL} value={l.instructions} onChange={(e) => setLine(l.key, { instructions: e.target.value })} placeholder="e.g. with warm water" />
                      </label>
                    </div>
                  </div>
                ))}
                {conflicts.size > 0 && <HmsToggle checked={override} onChange={setOverride} label="I have reviewed the allergy warning and still want to prescribe" showLabel />}
              </div>
            </HmsSection>

            <HmsSection title={`Investigations · ${d.labTests.length + d.radiology.length}`}>
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <input aria-label="Search lab tests" style={INPUT} value={labQ} onChange={(e) => setLabQ(e.target.value)} placeholder={`Search ${catalog.length} lab tests…`} />
                  {labHits.length > 0 && (
                    <div role="listbox" aria-label="Lab tests" style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, top: '44px', background: '#ffffff', border: `1px solid ${HMS.border}`, borderRadius: '10px', boxShadow: '0 10px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                      {labHits.map((n) => (
                        <button key={n} type="button" role="option" aria-selected={false} onClick={() => { set('labTests', [...d.labTests, n]); setLabQ(''); }} style={{ display: 'block', width: '100%', padding: '10px 12px', border: 'none', borderBottom: `1px solid ${HMS.divider}`, background: '#ffffff', textAlign: 'left', cursor: 'pointer', fontSize: '14px' }}>
                          {n}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {d.labTests.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {d.labTests.map((n) => (
                      <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 6px 4px 10px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, background: HMS.primaryTint, color: HMS.primaryStrong, border: `1px solid ${HMS.primaryBorder}` }}>
                        {n}
                        <button type="button" aria-label={`Remove ${n}`} onClick={() => set('labTests', d.labTests.filter((x) => x !== n))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}>
                          <Trash2 size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Imaging & ECG</div>
                <div role="group" aria-label="Imaging" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {RADIOLOGY.map((r) => {
                    const on = d.radiology.includes(r);
                    return (
                      <button key={r} type="button" role="checkbox" aria-checked={on} onClick={() => { setD((p) => ({ ...p, radiology: p.radiology.includes(r) ? p.radiology.filter((x) => x !== r) : [...p.radiology, r] })); setDirty(true); }} style={{ height: '32px', padding: '0 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? HMS.primaryBorder : HMS.border}`, background: on ? HMS.primaryTint : '#ffffff', color: on ? HMS.primaryStrong : '#374151' }}>
                        {r}
                      </button>
                    );
                  })}
                </div>
                <HmsField label="Priority">
                  <Choice label="Order priority" value={d.orderPriority} options={[{ key: 'ROUTINE', label: 'Routine' }, { key: 'URGENT', label: 'Urgent', tone: 'amber' }, { key: 'STAT', label: 'STAT', tone: 'red' }]} onChange={(v) => set('orderPriority', v)} />
                </HmsField>
              </div>
            </HmsSection>

            <HmsSection title="Advice & follow-up">
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <textarea aria-label="Advice to the patient" style={{ ...TEXTAREA, minHeight: '60px' }} value={d.advice} onChange={(e) => set('advice', e.target.value)} placeholder="Diet, rest, warning signs to come back for" />
                <div role="group" aria-label="Follow-up in" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginRight: '4px' }}>Follow-up</span>
                  {[3, 7, 15, 30].map((n) => (
                    <button key={n} type="button" aria-pressed={d.followUpDate === addDays(n)} onClick={() => set('followUpDate', addDays(n))} style={{ height: '32px', padding: '0 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${d.followUpDate === addDays(n) ? HMS.primary : HMS.border}`, background: d.followUpDate === addDays(n) ? HMS.primary : '#ffffff', color: d.followUpDate === addDays(n) ? '#ffffff' : '#374151' }}>
                      {n} days
                    </button>
                  ))}
                  <input aria-label="Follow-up date" type="date" min={addDays(1)} style={{ ...INPUT, width: '170px', height: '32px' }} value={d.followUpDate} onChange={(e) => set('followUpDate', e.target.value)} />
                  {d.followUpDate && (
                    <HmsButton size="sm" onClick={() => set('followUpDate', '')}>
                      No follow-up
                    </HmsButton>
                  )}
                </div>
                {d.followUpDate && <input aria-label="Follow-up reason" style={INPUT} value={d.followUpReason} onChange={(e) => set('followUpReason', e.target.value)} placeholder="Reason, e.g. review with fasting sugar report" />}
              </div>
            </HmsSection>

            <HmsSection title="Referral" defaultOpen={!!d.referTo}>
              <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: '12px' }}>
                <HmsField label="Refer to" htmlFor="cs-refer">
                  <select id="cs-refer" style={INPUT} value={d.referTo} onChange={(e) => set('referTo', e.target.value)}>
                    <option value="">No referral</option>
                    {DEPARTMENTS.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </HmsField>
                <HmsField label="Reason" htmlFor="cs-refer-why">
                  <input id="cs-refer-why" style={INPUT} disabled={!d.referTo} value={d.referReason} onChange={(e) => set('referReason', e.target.value)} placeholder="What the other doctor should look at" />
                </HmsField>
              </div>
            </HmsSection>
          </div>
          <div style={{ position: 'sticky', bottom: 0, background: '#ffffff', borderTop: `1px solid ${HMS.border}`, padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '8px', borderRadius: '0 0 12px 12px' }}>
            {away ? (
              <>
                <HmsNotice tone="blue">Sent for tests — {t.chamberHold ? t.chamberHold.replace(/^Waiting for reports · /, '') : 'reports pending'}. {t.patient} comes back to your queue when every report is signed; finish the consultation then.</HmsNotice>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                  <HmsButton icon={Save} block onClick={() => saveDraft()}>
                    Save notes
                  </HmsButton>
                  <HmsButton variant="primary" icon={CheckCircle2} block onClick={nextPatient}>
                    Close — next patient
                  </HmsButton>
                </div>
              </>
            ) : (
            <>
            {problems.length > 0 && <div style={{ fontSize: '12px', color: HMS.textSecondary }}>To complete, add {problems.join(', ')}.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
              <HmsButton icon={Save} block onClick={() => saveDraft()}>
                Save draft
              </HmsButton>
              <HmsButton icon={FlaskConical} block disabled={!d.labTests.length && !d.radiology.length} title="Order the tests now; the patient comes back with the reports" onClick={() => setConfirmTests(true)}>
                Send for tests
              </HmsButton>
              <HmsButton variant="primary" icon={d.referTo ? Send : CheckCircle2} block disabled={problems.length > 0 || busy || isCalledIn(t)} title={isCalledIn(t) ? 'Start when the patient is in the room' : undefined} onClick={complete}>
                {busy ? 'Saving…' : 'Complete consultation'}
              </HmsButton>
            </div>
            </>
            )}
          </div>
        </section>
        {confirmTests && (
          <HmsModal
            title={`Send ${t.patient} for tests?`}
            description="The tests are ordered now and their charges go to the cash counter. The patient leaves your room and comes back to your queue when every report is signed; your notes are kept."
            onClose={() => setConfirmTests(false)}
            footer={
              <>
                <HmsButton onClick={() => setConfirmTests(false)}>Cancel</HmsButton>
                <HmsButton variant="primary" icon={FlaskConical} onClick={sendForTests}>
                  Confirm — send for tests
                </HmsButton>
              </>
            }
          >
            <HmsSection title="Ordering">
              {[...d.labTests.map((n) => [n, 'Lab']), ...d.radiology.map((n) => [n, 'Imaging'])].map(([n, kind], i, arr) => (
                <HmsRow key={n} label={n} value={kind} last={i === arr.length - 1} />
              ))}
            </HmsSection>
            <div style={{ marginTop: '10px', fontSize: '13px', color: HMS.textSecondary }}>Priority: {d.orderPriority.toLowerCase()}</div>
          </HmsModal>
        )}

        {/* ---------- right: reports & alerts ---------- */}
        <aside aria-label="Reports and alerts" style={COL}>
          {(critOpen.length > 0 || (band && band !== 'LOW') || t.priority === 'EMERGENCY') && (
            <HmsSection title="Alerts">
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {t.priority === 'EMERGENCY' && <HmsNotice tone="red">Emergency token{t.triageNotes?.startsWith('EMERGENCY') ? ` — ${t.triageNotes.replace(/^EMERGENCY:\s*/, '')}` : ''}</HmsNotice>}
                {band && band !== 'LOW' && <HmsNotice tone={band === 'HIGH' ? 'red' : 'amber'}>NEWS2 {t.vitals?.news2}: {NEWS_BAND[band].action}</HmsNotice>}
                {critOpen.map((o) => (
                  <HmsNotice key={o.id} tone="red" action={<HmsButton size="sm" onClick={() => setAck(o)}>Acknowledge</HmsButton>}>
                    Critical {o.testName}
                  </HmsNotice>
                ))}
              </div>
            </HmsSection>
          )}
          <HmsSection title={`Lab reports · ${allLabsForPatient.length}`}>
            {allLabsForPatient.length === 0 && <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No lab tests on record.</div>}
            {allLabsForPatient.map((o, i) => (
              <div key={o.id} style={{ padding: '10px 14px', borderBottom: i === allLabsForPatient.length - 1 ? 'none' : `1px solid ${HMS.divider}`, fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'center' }}>
                  <strong style={{ fontSize: '13px' }}>{o.testName}</strong>
                  {o.stage === 'REPORT_GENERATED' ? <HmsBadge tone={o.isFlaggedCritical ? 'red' : o.isFlaggedAbnormal ? 'amber' : 'green'}>{o.isFlaggedCritical ? 'Critical' : o.isFlaggedAbnormal ? 'Abnormal' : 'Normal'}</HmsBadge> : <HmsBadge tone="blue">Pending</HmsBadge>}
                </div>
                {o.stage === 'REPORT_GENERATED' &&
                  o.parameters.map((p) => (
                    <div key={p.paramName} style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', marginTop: '4px', color: p.isCritical ? '#dc2626' : p.isAbnormal ? '#b45309' : HMS.text, fontWeight: p.isAbnormal || p.isCritical ? 600 : 400 }}>
                      <span>{p.paramName}</span>
                      <span>
                        {p.observedValue} {p.unit}
                        {p.referenceRange ? <span style={{ color: HMS.textMuted, fontWeight: 400 }}> ({p.referenceRange})</span> : null}
                      </span>
                    </div>
                  ))}
                {o.approvedAt && <div style={{ fontSize: '12px', color: HMS.textMuted, marginTop: '4px' }}>Signed {o.approvedAt}</div>}
              </div>
            ))}
          </HmsSection>
          {pendingLabs.length > 0 && <HmsNotice tone="blue">{pendingLabs.length} test{pendingLabs.length === 1 ? '' : 's'} still in the lab.</HmsNotice>}
          <HmsSection title={`Outside reports · ${docs.length}`}>
            {docs.length === 0 && <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>None attached.</div>}
            {docs.map((x, i) => (
              <HmsRow
                key={x.id}
                label={x.title}
                hint={`${x.source} · ${x.reportDate}`}
                value={
                  x.shownToDoctorAt ? (
                    <HmsBadge tone="green">Seen</HmsBadge>
                  ) : (
                    <HmsButton size="sm" icon={Eye} onClick={() => { patientJourneyService.updatePatientDocument(x.id, { shownToDoctorAt: new Date().toISOString() }); data.reload(); }}>
                      Seen
                    </HmsButton>
                  )
                }
                last={i === docs.length - 1}
              />
            ))}
          </HmsSection>
          <HmsSection title={`Previous prescriptions · ${pastRx.length}`}>
            {pastRx.length === 0 && <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>None.</div>}
            {pastRx.slice(0, 4).map((r, i) => (
              <div key={r.id} style={{ padding: '10px 14px', borderBottom: i === Math.min(pastRx.length, 4) - 1 ? 'none' : `1px solid ${HMS.divider}`, fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'center' }}>
                  <strong>{fmtDate(r.date)}</strong>
                  {r.items.length > 0 && (
                    <HmsButton size="sm" icon={Repeat} onClick={() => set('rx', [...d.rx, ...linesFrom(r)])}>
                      Repeat
                    </HmsButton>
                  )}
                </div>
                <div style={{ color: HMS.textSecondary }}>{r.diagnosis || '—'} · {r.doctorName}</div>
                {r.items.map((it) => (
                  <div key={it.medicineName}>• {it.medicineName} {it.frequency} × {it.durationDays} d</div>
                ))}
              </div>
            ))}
          </HmsSection>
        </aside>
      </div>
      {ack && (
        <CritAckModal
          order={ack}
          doctor={doctor.name}
          onClose={() => setAck(null)}
          onDone={() => {
            setAck(null);
            data.reload();
            act.notify(`Critical ${ack.testName} acknowledged`);
          }}
        />
      )}
    </>
  );
};


/** Diagnosis box with common ICD-10 suggestions in the HMS style (not the browser's own popup). */
const DiagnosisInput: React.FC<{ value: string; onChange: (v: string, code?: string) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const q = value.trim().toLowerCase();
  const hits = (q ? ICD10.filter(([code, name]) => name.toLowerCase().includes(q) || code.toLowerCase().startsWith(q)) : ICD10).slice(0, 8);
  const pick = (code: string, name: string) => {
    onChange(name, code);
    setOpen(false);
  };
  return (
    <div style={{ position: 'relative' }}>
      <input
        id="cs-dx"
        style={INPUT}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls="cs-dx-list"
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onKeyDown={(e) => {
          if (!open || !hits.length) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, hits.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); pick(hits[hi][0], hits[hi][1]); }
          else if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="Type or pick a common diagnosis"
      />
      {open && hits.length > 0 && (
        <div id="cs-dx-list" role="listbox" style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 4px)', left: 0, right: 0, background: '#ffffff', border: `1px solid ${HMS.border}`, borderRadius: '10px', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)', maxHeight: '280px', overflowY: 'auto' }}>
          {hits.map(([code, name], i) => (
            <button
              key={code}
              type="button"
              role="option"
              aria-selected={i === hi}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHi(i)}
              onClick={() => pick(code, name)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '9px 12px', border: 'none', borderBottom: `1px solid ${HMS.divider}`, background: i === hi ? HMS.primaryTint : '#ffffff', cursor: 'pointer', fontSize: '13px', color: HMS.text, textAlign: 'left' }}
            >
              <span>{name}</span>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: HMS.textSecondary }}>{code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
