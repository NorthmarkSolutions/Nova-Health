// OPD Doctor Assistant (chamber desk) data. Builds on the front-desk data (tokens, patients, OPD doctors and their
// chambers, appointments, doctor follow-ups, desk invoices) and adds lab orders, prescriptions, outside documents,
// the doctor's session status and the desk's activity log. Everything is scoped to the doctor this assistant works
// with, chosen once and remembered on this browser. Every count on the workspace is derived from this one hook.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  patientJourneyService,
  AssistantLogEntry,
  DoctorSession,
  PatientDocument,
  SharedLabOrder,
  SharedPrescription,
  SharedQueueToken,
} from '../../services/patientJourneyService';
import { LabApi, labApiMode } from '../../services/labService';
import { useReceptionData, ReceptionData, DeskDoctor, sameDoctor, issuedAt } from '../reception/receptionData';
import { isTodayIso } from '../nurse/nurseData';

export interface AstLabOrder extends SharedLabOrder {
  cancelled: boolean;
  /** Minutes the order has been open, and the test's turnaround target (server orders only) */
  ageMin: number | null;
  tatMin: number | null;
}

export interface AssistantData extends ReceptionData {
  doctor: DeskDoctor | null;
  setDoctorId: (id: string) => void;
  /** Today's tokens for this doctor (all statuses) */
  mine: SharedQueueToken[];
  labOrders: AstLabOrder[];
  prescriptions: SharedPrescription[];
  documents: PatientDocument[];
  doctorSession: DoctorSession | null;
  sessions: Record<string, DoctorSession>;
  log: AssistantLogEntry[];
}

const keyFor = (userId: string, prefix = 'nh_assistant_doctor') => `${prefix}:${userId || 'me'}`;
const readChoice = (userId: string, prefix?: string) => {
  try {
    return localStorage.getItem(keyFor(userId, prefix)) || '';
  } catch {
    return '';
  }
};

const readExtra = () => ({
  labOrders: patientJourneyService.getLabOrders().filter((o) => o.category !== 'Radiology'),
  prescriptions: patientJourneyService.getPrescriptions(),
  documents: patientJourneyService.getPatientDocuments(),
  sessions: patientJourneyService.getDoctorSessions(),
  log: patientJourneyService.getAssistantLog(),
});

/** `preferName`: the signed-in doctor's own name — used when no doctor has been chosen on this browser. */
export const useAssistantData = (userId: string, opts: { storagePrefix?: string; preferName?: string } = {}): AssistantData => {
  const base = useReceptionData();
  const [extra, setExtra] = useState(readExtra);
  const [doctorId, setDoctorIdState] = useState(() => readChoice(userId, opts.storagePrefix));
  const { reload: baseReload } = base;
  const reload = useCallback(() => {
    baseReload();
    setExtra(readExtra());
  }, [baseReload]);

  useEffect(() => {
    const onSync = () => setExtra(readExtra());
    window.addEventListener('nh_data_sync', onSync);
    window.addEventListener('nh_lab_sync', onSync);
    window.addEventListener('storage', onSync);
    return () => {
      window.removeEventListener('nh_data_sync', onSync);
      window.removeEventListener('nh_lab_sync', onSync);
      window.removeEventListener('storage', onSync);
    };
  }, []);

  const setDoctorId = (id: string) => {
    try {
      localStorage.setItem(keyFor(userId, opts.storagePrefix), id);
    } catch {
      /* remembered for this session only */
    }
    setDoctorIdState(id);
  };

  const doctor = base.doctors.find((d) => d.id === doctorId) || (opts.preferName ? base.doctors.find((d) => sameDoctor(d.name, opts.preferName)) : undefined) || null;
  const now = base.lastSync.getTime();
  const labOrders = useMemo(
    () =>
      extra.labOrders.map((o): AstLabOrder => {
        const raw = labApiMode() ? LabApi.raw(o.id) : undefined;
        const ordered = raw?.orderedAt ? new Date(raw.orderedAt).getTime() : NaN;
        return { ...o, cancelled: raw?.status === 'CANCELLED', ageMin: Number.isNaN(ordered) ? null : Math.round((now - ordered) / 60000), tatMin: raw?.test?.tatMinutes ?? null };
      }),
    [extra.labOrders, now],
  );
  const mine = doctor ? base.queue.filter((t) => sameDoctor(t.doctor, doctor.name)) : [];

  return {
    ...base,
    reload,
    doctor,
    setDoctorId,
    mine,
    labOrders: doctor ? labOrders.filter((o) => sameDoctor(o.doctor, doctor.name)) : [],
    prescriptions: extra.prescriptions,
    documents: extra.documents,
    doctorSession: doctor ? extra.sessions[doctor.name] || null : null,
    sessions: extra.sessions,
    log: extra.log,
  };
};

/* ---------------- chamber queue rules ---------------- */

const CLOSED = ['COMPLETED', 'NO_SHOW', 'CANCELLED'];
export const isInChamber = (t: SharedQueueToken) => t.status === 'IN_CONSULTATION' && t.callingStatus === 'ACCEPTED';
export const isCalledIn = (t: SharedQueueToken) => t.status === 'IN_CONSULTATION' && t.callingStatus === 'CALLING';
export const isWaitingForDoctor = (t: SharedQueueToken) => !CLOSED.includes(t.status) && t.status !== 'IN_CONSULTATION' && !t.chamberHold;
export const isOnHold = (t: SharedQueueToken) => !CLOSED.includes(t.status) && t.status !== 'IN_CONSULTATION' && !!t.chamberHold;
export const isSeen = (t: SharedQueueToken) => t.status === 'COMPLETED';
export const isReady = (t: SharedQueueToken) => t.status === 'READY_FOR_DOCTOR' || t.status === 'TRIAGED';
export const isEmergencyTok = (t: SharedQueueToken) => t.priority === 'EMERGENCY' || t.status === 'EMERGENCY';
const rank = (t: SharedQueueToken) => (isEmergencyTok(t) ? 0 : t.priority === 'URGENT' || t.priority === 'VIP' ? 1 : isReady(t) ? 2 : 3);
/** Chamber order: emergency, urgent / VIP, triaged and ready, then token number. */
export const byChamberOrder = (a: SharedQueueToken, b: SharedQueueToken) => rank(a) - rank(b) || a.token - b.token;

export const chamberStatus = (t: SharedQueueToken): { label: string; tone: 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'dark' } => {
  if (t.status === 'COMPLETED') return t.handoff ? { label: 'Sent out', tone: 'gray' } : { label: 'Seen — check out', tone: 'amber' };
  if (t.status === 'NO_SHOW') return { label: 'No-show', tone: 'gray' };
  if (t.status === 'CANCELLED') return { label: 'Cancelled', tone: 'gray' };
  if (isInChamber(t)) return { label: 'In chamber', tone: 'green' };
  if (isCalledIn(t)) return { label: 'Called in', tone: 'blue' };
  if (t.chamberHold) return { label: 'On hold', tone: 'gray' };
  if (isEmergencyTok(t)) return { label: 'Emergency', tone: 'red' };
  if (isReady(t)) return { label: 'Ready', tone: 'green' };
  if (t.status === 'IN_TRIAGE') return { label: 'With nurse', tone: 'blue' };
  return { label: 'Waiting for nurse', tone: 'amber' };
};

/* ---------------- pre-consultation readiness ---------------- */

export interface ReadyItem {
  key: string;
  label: string;
  ok: boolean;
  hint: string;
}
/** Computed from the record — nothing is ticked by hand. */
export const readiness = (t: SharedQueueToken, labs: AstLabOrder[]): ReadyItem[] => {
  const pending = labs.filter((o) => o.uhid === t.uhid && !o.cancelled && o.stage !== 'REPORT_GENERATED');
  const allergies = t.assessment?.allergies?.length ? t.assessment.allergies : t.allergies || [];
  return [
    { key: 'vitals', label: 'Vitals recorded', ok: !!t.vitals?.bp, hint: t.vitals?.bp ? `BP ${t.vitals.bp}${t.vitals.recordedBy ? ` · ${t.vitals.recordedBy}` : ''}` : 'Not yet — nurse triage or record basic vitals' },
    { key: 'allergies', label: 'Allergies asked', ok: allergies.length > 0, hint: allergies.length ? allergies.join(', ') : 'Not recorded' },
    { key: 'fee', label: 'Consultation fee', ok: !!t.feePaid || !(t.totalFee || 0), hint: t.feePaid ? `Paid${t.paymentMode ? ` · ${t.paymentMode}` : ''}` : (t.totalFee || 0) > 0 ? 'Not paid — send to the cash counter' : 'No fee' },
    { key: 'labs', label: 'Reports back', ok: pending.length === 0, hint: pending.length ? `${pending.length} lab test${pending.length === 1 ? '' : 's'} still in progress` : 'Nothing pending' },
  ];
};
export const readyPct = (items: ReadyItem[]) => Math.round((items.filter((i) => i.ok).length / items.length) * 100);

/* ---------------- times ---------------- */

/** Parse the doctor desk's "HH:MM AM" checkout stamp as today. */
export const todayAt = (hhmm?: string) => {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(hhmm.trim());
  if (!m) return null;
  let h = Number(m[1]);
  if (m[3]) h = (h % 12) + (/pm/i.test(m[3]) ? 12 : 0);
  const d = new Date();
  d.setHours(h, Number(m[2]), 0, 0);
  return d;
};
export const consultMinutes = (t: SharedQueueToken) => {
  const a = t.seatedAt ? new Date(t.seatedAt) : null;
  const b = todayAt(t.checkoutTime);
  return a && b && b > a ? Math.round((b.getTime() - a.getTime()) / 60000) : null;
};
export const isTodayToken = (t: SharedQueueToken) => {
  const d = issuedAt(t);
  if (!d) return true; // older demo tokens carry no date; treat as today's list
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

/* ---------------- after the consultation ---------------- */

export const rxFor = (t: SharedQueueToken, rx: SharedPrescription[]) => rx.filter((r) => r.uhid === t.uhid && isTodayIso(r.date)).sort((a, b) => b.id.localeCompare(a.id))[0];
export interface NextStop {
  key: string;
  label: string;
  todo: boolean;
  hint: string;
}
/** Where the patient goes after the doctor, worked out from what the doctor ordered. */
export const nextStops = (t: SharedQueueToken, data: AssistantData): NextStop[] => {
  const rx = rxFor(t, data.prescriptions);
  const toCollect = data.labOrders.filter((o) => o.uhid === t.uhid && o.stage === 'ORDERED' && !o.cancelled);
  const fu = data.followUps.find((f) => f.uhid === t.uhid && sameDoctor(f.doctorName, t.doctor) && f.status === 'PENDING_BOOKING');
  const unpaid = !t.feePaid && (t.totalFee || 0) > 0;
  return [
    { key: 'pharmacy', label: 'Pharmacy', todo: !!rx && rx.items.length > 0 && !rx.isDispensed, hint: rx ? `${rx.items.length} item${rx.items.length === 1 ? '' : 's'} on ${rx.prescriptionNo}${rx.isDispensed ? ' · dispensed' : ''}` : 'No prescription today' },
    { key: 'lab', label: 'Sample collection', todo: toCollect.length > 0, hint: toCollect.length ? toCollect.map((o) => o.testName).join(', ') : 'No samples ordered' },
    { key: 'billing', label: 'Cash counter', todo: unpaid, hint: unpaid ? 'Consultation fee not paid' : 'Nothing due at the desk' },
    { key: 'followup', label: 'Follow-up booking', todo: !!fu, hint: fu ? `Doctor asked for ${fu.followUpDate}${fu.reason ? ` · ${fu.reason}` : ''}` : 'No follow-up asked' },
  ];
};

export const SESSION: Record<DoctorSession['status'], { label: string; tone: 'green' | 'amber' | 'red' | 'gray' | 'blue' }> = {
  IN: { label: 'In clinic', tone: 'green' },
  BREAK: { label: 'On a break', tone: 'amber' },
  ROUNDS: { label: 'On ward rounds', tone: 'amber' },
  OT: { label: 'In OT / procedure', tone: 'amber' },
  LATE: { label: 'Running late', tone: 'red' },
  OUT: { label: 'Left for the day', tone: 'gray' },
};

/** Patient-friendly messages the desk copies into SMS / WhatsApp. */
export const message = {
  report: (name: string, test: string, doctor: string) => `Dear ${name}, your ${test} report is ready at North Hospital. Please visit ${doctor}'s OPD to review it.`,
  followup: (name: string, doctor: string, date: string) => `Dear ${name}, ${doctor} has advised a follow-up visit on ${date}. Please call North Hospital OPD to confirm your slot.`,
  appointment: (name: string, doctor: string, date: string, slot: string) => `Dear ${name}, reminder of your appointment with ${doctor} on ${date} at ${slot}, North Hospital OPD. Please arrive 15 minutes early.`,
};

/* ---------------- actions the views share ---------------- */

export interface AssistantActions {
  notify: (msg: string, tone?: 'success' | 'error') => void;
  goTo: (tab: string, filter?: string, select?: string) => void;
  userName: string;
  callIn: (t: SharedQueueToken) => void;
  attach: (uhid?: string) => void;
  book: (preset: { uhid?: string; followUpId?: string; visitType?: 'NEW' | 'FOLLOW_UP' | 'SECOND_OPINION'; date?: string }) => void;
  reschedule: (apptId: string) => void;
  logAction: (kind: AssistantLogEntry['kind'], ref: string, uhid: string, note?: string) => void;
}

/** Copy a message for SMS / WhatsApp; false when the browser blocks the clipboard. */
export const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/** Print a prescription in a pop-up (false when pop-ups are blocked). */
export const printRx = (rx: SharedPrescription) => {
  const w = window.open('', '_blank', 'width=720,height=900');
  if (!w) return false;
  const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(rx.prescriptionNo)}</title><style>
    body{font-family:Inter,Arial,sans-serif;margin:28px;color:#111827}h1{font-size:20px;margin:0}p{margin:2px 0;font-size:13px;color:#4b5563}
    table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}th,td{text-align:left;padding:8px;border-bottom:1px solid #e5e7eb}th{font-size:12px;color:#475569}
    .row{display:flex;justify-content:space-between;border-bottom:2px solid #111827;padding-bottom:10px;margin-bottom:12px}.sig{margin-top:48px;text-align:right;font-size:13px}
  </style></head><body>
  <div class="row"><div><h1>North Hospital</h1><p>Outpatient Department</p></div><div style="text-align:right"><strong>${esc(rx.doctorName)}</strong><p>${esc(rx.doctorSpecialization)} · ${esc(rx.chamber)}</p></div></div>
  <p><strong>${esc(rx.patientName)}</strong> · ${esc(rx.uhid)} · ${esc(rx.age)} y · ${esc(rx.gender)}</p>
  <p>Date ${esc(rx.date)} · ${esc(rx.prescriptionNo)}</p>
  ${rx.diagnosis ? `<p style="margin-top:10px">Diagnosis: <strong>${esc(rx.diagnosis)}</strong>${rx.diagnosisCode ? ` (${esc(rx.diagnosisCode)})` : ''}</p>` : ''}
  <table><thead><tr><th>Medicine</th><th>Dose</th><th>When</th><th>Days</th><th>Instructions</th></tr></thead><tbody>
  ${rx.items.map((i) => `<tr><td>${esc(i.medicineName)}</td><td>${esc(i.dosage)}</td><td>${esc(i.frequency)}${i.timing ? ` · ${esc(i.timing)}` : ''}</td><td>${esc(i.durationDays)}</td><td>${esc(i.instructions || '')}</td></tr>`).join('')}
  </tbody></table>
  ${rx.investigations?.length ? `<p style="margin-top:16px">Investigations: ${esc(rx.investigations.join(', '))}</p>` : ''}
  ${rx.advice ? `<p style="margin-top:8px">Advice: ${esc(rx.advice)}</p>` : ''}
  ${rx.referral ? `<p style="margin-top:8px">Referred to ${esc(rx.referral)}</p>` : ''}
  ${rx.followUpDate ? `<p style="margin-top:16px">Follow-up on <strong>${esc(rx.followUpDate)}</strong></p>` : ''}
  <div class="sig">${esc(rx.doctorName)}</div>
  <script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
  return true;
};

