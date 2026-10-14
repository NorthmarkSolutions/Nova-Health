// OPD Nurse station data: today's token queue (triage), day-care beds the front desk allocated, the nursing chart
// for those beds, doctor prescriptions to give in the treatment room, lab orders to collect and results to act on,
// emergency calls and shift handovers. Everything is the shared patient-journey store the Reception, Doctor and
// Assistant desks also use (lab orders come from the server when signed in); every count on the workspace — KPIs,
// sidebar pills, filter chips — is derived from this one hook.
import { useCallback, useEffect, useState } from 'react';
import {
  patientJourneyService,
  FlatCampusBed,
  NurseChartEntry,
  NurseHandover,
  NurseProcedure,
  SharedEmergencyAlert,
  SharedLabOrder,
  SharedPatient,
  SharedPrescription,
  SharedQueueToken,
} from '../../services/patientJourneyService';
import { LabApi, labApiMode } from '../../services/labService';
import { getDepartmentTariffMaster } from '../department/departmentWorkspaceStore';
import { OPD_DEPT, isDaycareBed, bedState, todayIso, issuedAt } from '../reception/receptionData';

const POLL_MS = 15000;

export interface NurseLabOrder extends SharedLabOrder {
  /** Cancelled on the server (the shared mapping shows these as ORDERED) */
  cancelled: boolean;
  /** Billing has cleared sample collection: true / false, or null when it cannot be known (offline demo) */
  billingOk: boolean | null;
  billingReason: string | null;
  rejectedReason: string | null;
  location: string;
}

export interface NurseData {
  queue: SharedQueueToken[];
  patients: SharedPatient[];
  labOrders: NurseLabOrder[];
  /** Day-care / observation beds (all states) */
  daycareBeds: FlatCampusBed[];
  /** Occupied day-care beds — the nurse's observation list */
  occupiedBeds: FlatCampusBed[];
  chart: NurseChartEntry[];
  procedures: NurseProcedure[];
  prescriptions: SharedPrescription[];
  handovers: NurseHandover[];
  alerts: SharedEmergencyAlert[];
  doctors: string[];
  labOnline: boolean;
  labError: string | null;
  lastSync: Date;
  reload: () => void;
}

const toNurseOrder = (o: SharedLabOrder): NurseLabOrder => {
  const raw = labApiMode() ? LabApi.raw(o.id) : undefined;
  return {
    ...o,
    cancelled: raw?.status === 'CANCELLED',
    billingOk: raw?.billing ? raw.billing.collectionAllowed : null,
    billingReason: raw?.billing?.reason || null,
    rejectedReason: raw?.rejectedReason || null,
    location: raw?.location || '',
  };
};

const read = () => {
  const daycareBeds = patientJourneyService.getFlatBedsList().filter(isDaycareBed);
  return {
    queue: patientJourneyService.getQueue(),
    patients: patientJourneyService.getPatients(),
    labOrders: patientJourneyService.getLabOrders().filter((o) => o.category !== 'Radiology').map(toNurseOrder),
    daycareBeds,
    occupiedBeds: daycareBeds.filter((b) => bedState(b) === 'occupied' && !!b.bed.inpatientDetails),
    chart: patientJourneyService.getNurseChart(),
    procedures: patientJourneyService.getNurseProcedures(),
    prescriptions: patientJourneyService.getPrescriptions(),
    handovers: patientJourneyService.getNurseHandovers(),
    alerts: patientJourneyService.getEmergencyAlerts(),
    doctors: (getDepartmentTariffMaster(OPD_DEPT).doctorTariffs || []).map((d) => d.doctorName),
    labOnline: labApiMode(),
    labError: labApiMode() ? LabApi.lastError : null,
  };
};

export const useNurseData = (): NurseData => {
  const [state, setState] = useState(() => ({ ...read(), lastSync: new Date() }));
  const reload = useCallback(() => setState({ ...read(), lastSync: new Date() }), []);

  useEffect(() => {
    const events = ['nh_data_sync', 'nh_lab_sync', 'nh_campus_updated', 'storage', 'focus'];
    events.forEach((e) => window.addEventListener(e, reload));
    const tick = window.setInterval(reload, POLL_MS);
    return () => {
      events.forEach((e) => window.removeEventListener(e, reload));
      window.clearInterval(tick);
    };
  }, [reload]);

  return { ...state, reload };
};

/* ---------------- queue rules ---------------- */

export const TRIAGE_POINT = 'Triage station';
/** Waiting for the nurse: not yet triaged and not already called in by a doctor. */
export const isToTriage = (t: SharedQueueToken) => (t.status === 'WAITING' || t.status === 'EMERGENCY' || t.status === 'HOLD') && !(t.callingStatus === 'CALLING' && !t.callPoint);
export const isCalledToTriage = (t: SharedQueueToken) => t.callingStatus === 'CALLING' && t.callPoint === TRIAGE_POINT && t.status !== 'COMPLETED';
export const isInTriage = (t: SharedQueueToken) => t.status === 'IN_TRIAGE';
export const isReadyForDoctor = (t: SharedQueueToken) => t.status === 'READY_FOR_DOCTOR' || t.status === 'TRIAGED';
export const isEmergency = (t: SharedQueueToken) => t.priority === 'EMERGENCY' || t.status === 'EMERGENCY';
export const NURSE_ACTIVE = (t: SharedQueueToken) => isToTriage(t) || isInTriage(t) || isReadyForDoctor(t);
const rank = (t: SharedQueueToken) => (isEmergency(t) ? 0 : t.priority === 'URGENT' || t.priority === 'VIP' ? 1 : 2);
export const byTriageOrder = (a: SharedQueueToken, b: SharedQueueToken) => rank(a) - rank(b) || a.token - b.token;

export const NURSE_STATUS: Record<string, { label: string; tone: 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'dark' }> = {
  WAITING: { label: 'To triage', tone: 'amber' },
  HOLD: { label: 'On hold', tone: 'gray' },
  EMERGENCY: { label: 'Emergency', tone: 'red' },
  IN_TRIAGE: { label: 'In triage', tone: 'blue' },
  TRIAGED: { label: 'Ready for doctor', tone: 'green' },
  READY_FOR_DOCTOR: { label: 'Ready for doctor', tone: 'green' },
  IN_CONSULTATION: { label: 'With doctor', tone: 'gray' },
  COMPLETED: { label: 'Seen', tone: 'gray' },
  NO_SHOW: { label: 'No-show', tone: 'gray' },
  CANCELLED: { label: 'Cancelled', tone: 'gray' },
};
export const nurseStatusOf = (t: SharedQueueToken) => (isCalledToTriage(t) ? { label: 'Called to triage', tone: 'blue' as const } : NURSE_STATUS[t.status] || { label: t.status, tone: 'gray' as const });

/** Triage done today, by anyone at the station (assessment time stamped when the patient was sent to the doctor). */
export const triagedToday = (t: SharedQueueToken) => {
  const at = t.assessment?.triagedAt;
  if (!at) return false;
  const d = new Date(at);
  return !Number.isNaN(d.getTime()) && isTodayDate(d);
};

/** Token issued → triage started, and triage started → sent to the doctor (minutes). */
const mins = (a?: Date | null, b?: string) => {
  if (!a || !b) return null;
  const d = new Date(b);
  return Number.isNaN(d.getTime()) ? null : Math.max(0, Math.round((d.getTime() - a.getTime()) / 60000));
};
export const timeToTriage = (t: SharedQueueToken) => mins(issuedAt(t), t.triageStartTime);
export const triageDuration = (t: SharedQueueToken) => (t.triageStartTime ? mins(new Date(t.triageStartTime), t.assessment?.triagedAt) : null);
export const avgMin = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null;
};


/* ---------------- dates & shift ---------------- */

export const isTodayDate = (d: Date) => {
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};
/** Prescription dates are written as the UTC date by the doctor desk; accept either calendar. */
export const isTodayIso = (iso?: string) => !!iso && (iso.slice(0, 10) === todayIso() || iso.slice(0, 10) === new Date().toISOString().slice(0, 10));
export const clock = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso.includes('T') || iso.length > 16 ? iso : iso.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
export const minutesSince = (iso: string | undefined, now: number) => {
  if (!iso) return null;
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : Math.round((now - d.getTime()) / 60000);
};

/** Nursing roster: Morning 07–15, Evening 15–23, Night 23–07. */
export const SHIFTS = {
  MORNING: { label: 'Morning shift', hours: '07:00–15:00' },
  EVENING: { label: 'Evening shift', hours: '15:00–23:00' },
  NIGHT: { label: 'Night shift', hours: '23:00–07:00' },
} as const;
export type ShiftKey = keyof typeof SHIFTS;
export const currentShift = (d = new Date()): ShiftKey => {
  const h = d.getHours();
  return h >= 7 && h < 15 ? 'MORNING' : h >= 15 && h < 23 ? 'EVENING' : 'NIGHT';
};

/* ---------------- NEWS2 early warning score (RCP 2017, SpO2 scale 1) ---------------- */

export interface Obs {
  rr?: number;
  spo2?: number;
  sbp?: number;
  pulse?: number;
  avpu?: 'A' | 'C' | 'V' | 'P' | 'U';
  tempF?: number;
  onOxygen?: boolean;
}
export type NewsBand = 'LOW' | 'LOW_MEDIUM' | 'MEDIUM' | 'HIGH';
export interface NewsResult {
  score: number;
  band: NewsBand;
}

const n = (v: unknown) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v));

/** Null when a parameter is missing or the patient is under 16 (NEWS2 is validated for adults only). */
export function news2(o: Obs, age?: number): NewsResult | null {
  const rr = n(o.rr);
  const spo2 = n(o.spo2);
  const sbp = n(o.sbp);
  const hr = n(o.pulse);
  const tf = n(o.tempF);
  if (age !== undefined && age !== null && Number(age) > 0 && Number(age) < 16) return null;
  if (rr === undefined || spo2 === undefined || sbp === undefined || hr === undefined || tf === undefined || !o.avpu) return null;
  const tc = ((tf - 32) * 5) / 9;
  const parts = [
    rr <= 8 ? 3 : rr <= 11 ? 1 : rr <= 20 ? 0 : rr <= 24 ? 2 : 3,
    spo2 <= 91 ? 3 : spo2 <= 93 ? 2 : spo2 <= 95 ? 1 : 0,
    o.onOxygen ? 2 : 0,
    sbp <= 90 ? 3 : sbp <= 100 ? 2 : sbp <= 110 ? 1 : sbp <= 219 ? 0 : 3,
    hr <= 40 ? 3 : hr <= 50 ? 1 : hr <= 90 ? 0 : hr <= 110 ? 1 : hr <= 130 ? 2 : 3,
    o.avpu === 'A' ? 0 : 3,
    tc <= 35.0 ? 3 : tc <= 36.0 ? 1 : tc <= 38.0 ? 0 : tc <= 39.0 ? 1 : 2,
  ];
  const score = parts.reduce((s, x) => s + x, 0);
  const band: NewsBand = score >= 7 ? 'HIGH' : score >= 5 ? 'MEDIUM' : parts.includes(3) ? 'LOW_MEDIUM' : 'LOW';
  return { score, band };
}

export const NEWS_BAND: Record<NewsBand, { label: string; tone: 'green' | 'amber' | 'red'; action: string; intervalMin: number }> = {
  LOW: { label: 'Low', tone: 'green', action: 'Routine observations.', intervalMin: 60 },
  LOW_MEDIUM: { label: 'Low–medium', tone: 'amber', action: 'One parameter scores 3 — ask the doctor to review.', intervalMin: 30 },
  MEDIUM: { label: 'Medium', tone: 'amber', action: 'Urgent doctor review. Observe at least every 30 minutes.', intervalMin: 30 },
  HIGH: { label: 'High', tone: 'red', action: 'Emergency response — call the doctor now and consider a Code Blue.', intervalMin: 15 },
};
export const bandOfScore = (score?: number): NewsBand | null => (score === undefined || score === null ? null : score >= 7 ? 'HIGH' : score >= 5 ? 'MEDIUM' : 'LOW');

export const parseBp = (bp?: string) => {
  const m = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec((bp || '').trim());
  return m ? { sys: Number(m[1]), dia: Number(m[2]) } : null;
};

/* ---------------- vital-sign form ---------------- */

export interface ObsForm {
  sys: string;
  dia: string;
  pulse: string;
  temp: string;
  spo2: string;
  rr: string;
  avpu: '' | 'A' | 'C' | 'V' | 'P' | 'U';
  onOxygen: boolean;
}
export const EMPTY_OBS: ObsForm = { sys: '', dia: '', pulse: '', temp: '', spo2: '', rr: '', avpu: '', onOxygen: false };
export const obsOf = (f: ObsForm): Obs => ({
  rr: f.rr ? Number(f.rr) : undefined,
  spo2: f.spo2 ? Number(f.spo2) : undefined,
  sbp: f.sys ? Number(f.sys) : undefined,
  pulse: f.pulse ? Number(f.pulse) : undefined,
  tempF: f.temp ? Number(f.temp) : undefined,
  avpu: f.avpu || undefined,
  onOxygen: f.onOxygen,
});


/* ---------------- triage categories (5-level, Manchester style) ---------------- */

export type TriageCategory = 'IMMEDIATE' | 'VERY_URGENT' | 'URGENT' | 'STANDARD' | 'NON_URGENT';
export const CATEGORIES: { key: TriageCategory; label: string; tone: 'red' | 'amber' | 'blue' | 'green' | 'gray'; target: string; priority: 'EMERGENCY' | 'URGENT' | 'NORMAL' }[] = [
  { key: 'IMMEDIATE', label: 'Immediate', tone: 'red', target: 'Doctor now', priority: 'EMERGENCY' },
  { key: 'VERY_URGENT', label: 'Very urgent', tone: 'amber', target: 'Doctor within 10 min', priority: 'URGENT' },
  { key: 'URGENT', label: 'Urgent', tone: 'amber', target: 'Doctor within 60 min', priority: 'URGENT' },
  { key: 'STANDARD', label: 'Standard', tone: 'blue', target: 'Normal queue', priority: 'NORMAL' },
  { key: 'NON_URGENT', label: 'Non-urgent', tone: 'gray', target: 'Normal queue', priority: 'NORMAL' },
];
export const categoryOf = (k?: string) => CATEGORIES.find((c) => c.key === k);
/** What the early warning score suggests; the nurse makes the call. */
export const suggestedCategory = (r: NewsResult | null): TriageCategory | null => (!r ? null : r.band === 'HIGH' ? 'IMMEDIATE' : r.band === 'MEDIUM' ? 'VERY_URGENT' : r.band === 'LOW_MEDIUM' ? 'URGENT' : null);

/* ---------------- day-care beds & chart ---------------- */

export const chartKeyOf = (b: FlatCampusBed) => `${b.bed.id}|${b.bed.inpatientDetails?.ipdAdmissionNo || ''}`;
export const chartFor = (chart: NurseChartEntry[], b: FlatCampusBed) => {
  const k = chartKeyOf(b);
  return chart.filter((e) => e.chartKey === k).sort((a, z) => z.at.localeCompare(a.at));
};
/** Next observation is due one interval after the last reading (interval set by its NEWS2 band); no reading yet = due now. */
export const obsDue = (entries: NurseChartEntry[], now: number) => {
  const last = entries.find((e) => e.kind === 'READING');
  if (!last) return { last: null, dueIn: 0, intervalMin: null as number | null };
  const band = bandOfScore(last.news2);
  const intervalMin = band ? NEWS_BAND[band].intervalMin : 30;
  const since = minutesSince(last.at, now) ?? 0;
  return { last, dueIn: intervalMin - since, intervalMin };
};

/* ---------------- treatment room ---------------- */

/** Prescription lines that are given in the clinic (injections, drips, nebulisation), not taken home. */
export const isClinicItem = (name: string, extra = '') => /^(inj\b|inj\.|injection|iv\b|i\.v\.|infusion|neb\b|neb\.|nebul)/i.test(name.trim()) || /\b(stat|in clinic|in opd|before leaving)\b/i.test(extra);
export const kindOfItem = (name: string): NurseProcedure['kind'] => (/^neb/i.test(name.trim()) ? 'NEBULISATION' : /^(iv\b|i\.v\.|infusion)/i.test(name.trim()) || /\b(ns|rl|dns|saline)\b/i.test(name) ? 'IV_FLUID' : 'INJECTION');
export const PROC_KIND: Record<NurseProcedure['kind'], string> = {
  INJECTION: 'Injection',
  IV_FLUID: 'IV fluid',
  NEBULISATION: 'Nebulisation',
  DRESSING: 'Dressing',
  ECG: 'ECG',
  OTHER: 'Procedure',
};
export interface ClinicDose {
  key: string;
  rx: SharedPrescription;
  index: number;
  name: string;
  dose: string;
  done?: NurseProcedure;
}
export const clinicDoses = (prescriptions: SharedPrescription[], procedures: NurseProcedure[]): ClinicDose[] =>
  prescriptions
    .filter((rx) => isTodayIso(rx.date))
    .flatMap((rx) =>
      rx.items
        .map((it, index) => ({ it, index }))
        .filter(({ it }) => isClinicItem(it.medicineName, `${it.instructions || ''} ${it.timing || ''} ${it.frequency || ''}`))
        .map(({ it, index }) => ({
          key: `${rx.prescriptionNo}#${index}`,
          rx,
          index,
          name: it.medicineName,
          dose: [it.dosage, it.frequency, it.instructions].filter(Boolean).join(' · '),
          done: procedures.find((p) => p.rxNo === rx.prescriptionNo && p.rxItem === index),
        })),
    );

/* ---------------- lab ---------------- */

export const toCollect = (o: NurseLabOrder) => o.stage === 'ORDERED' && !o.cancelled;
export const inLab = (o: NurseLabOrder) => !o.cancelled && o.stage !== 'ORDERED' && o.stage !== 'REPORT_GENERATED';
export const isResult = (o: NurseLabOrder) => o.stage === 'REPORT_GENERATED';
export const criticalOpen = (o: NurseLabOrder) => isResult(o) && !!o.isFlaggedCritical && !o.criticalAcknowledged;
export const isOpdOrder = (o: NurseLabOrder) => !/^ipd|ward/i.test(o.location || '');

/** Station safety checks at every handover. */
export const HANDOVER_CHECKS = ['Crash cart checked and sealed', 'Emergency drugs in date', 'Oxygen cylinder full and suction working', 'Defibrillator self-test passed', 'Glucometer control test done', 'Sharps and biomedical waste cleared'];

/* ---------------- actions the views share ---------------- */

export interface NurseActions {
  notify: (msg: string, tone?: 'success' | 'error') => void;
  goTo: (tab: string, filter?: string, select?: string) => void;
  userName: string;
  callToTriage: (t: SharedQueueToken) => void;
  startTriage: (t: SharedQueueToken) => void;
  codeBlue: (preset?: { patientName?: string; uhid?: string; age?: number; gender?: string; location?: string; condition?: string; token?: number }) => void;
}
