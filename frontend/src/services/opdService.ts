// OPD visits on the server (/api/v1/opd/). Signed in against the server, the reception, nurse, doctor and assistant
// desks read today's visits from here (polled, shown in the same token shape the screens use) and every action goes
// to the server, which enforces the visit state machine, roles and cross-department hand-offs. The browser keeps only
// a cache. Demo sign-ins (local- tokens) keep the old browser-only behaviour.
import api from './api';
import type { DoctorBlock, DoctorSession, FlatCampusBed, NurseChartEntry, NurseProcedure, OpdAdminLogEntry, RoundNote, SharedAppointment, SharedDoctorFollowUp, SharedEmergencyAlert, SharedPrescription, SharedQueueToken } from './patientJourneyService';

export const opdApiMode = () => {
  try {
    const token = localStorage.getItem('token');
    return !!token && !token.startsWith('local-');
  } catch {
    return false;
  }
};

type Vitals = {
  systolic_bp: number | null; diastolic_bp: number | null; pulse_rate: number | null; temperature: number | null;
  spo2: number | null; respiratory_rate: number | null; rbs: number | null; avpu: string; on_oxygen: boolean;
  news2: number | null; height_cm: number | null; weight_kg: number | null; bmi: number | null;
};
export interface ApiVisit {
  id: string; visitNumber: string; token: number; date: string; status: string; visitType: string; priority: string;
  holdReason: string; holdFrom: string; chamber: string; fee: number; feeStatus: string; createdBy: string;
  deskPayment: { paid?: boolean; mode?: string; receipt?: string; quoted_fee?: string };
  checkoutRoutes: string[];
  patient: { id: string; uhid: string; name: string; gender: string; dob: string; bloodGroup: string; phone: string; allergies: string[]; conditions: string[] };
  doctor: { id: string; staffRef: string; name: string; department: string } | null;
  timeline: Record<string, string | null>;
  triage?: {
    chiefComplaint: string; painScore: number | null; category: string; news2: number | null; allergies: string[];
    conditions: string[]; currentMedications: string[]; fallRisk: boolean; pregnancy: string; notes: string;
    submitted: boolean; triagedBy: string; triagedAt: string | null; vitals: Vitals | null;
  } | null;
  labOrders?: Array<{ id: string; number: string; test: string; status: string; critical: boolean; criticalAcknowledged: boolean }>;
  draft?: unknown;
  prescriptions?: Array<{
    number: string; date: string; doctor: string; diagnosis: string; advice: string;
    items: Array<{ line: number; name: string; dose: string; frequency: string; days: number; route: string; timing: string; instructions: string; clinicDose: boolean }>;
    dispenseOrders: Array<{ number: string; status: string; total: number; paymentStatus: string }>;
  }>;
  procedures?: Array<{ id: string; uhid: string; patient: string; token: number; kind: NurseProcedure['kind']; detail: string; orderedBy: string; rxNo: string; rxItem: number | null; route: string; site: string; batchNo: string; status: 'GIVEN' | 'REFUSED'; note: string; at: string; by: string }>;
  events?: Array<{ action: string; from: string; to: string; by: string; onBehalfOf: string; payload: Record<string, unknown>; at: string }>;
}

export interface ApiStay {
  id: string; stayNumber: string; visitId: string | null; bedRef: string; bedLabel: string; ward: string; nurse: string; reason: string;
  status: 'OCCUPIED' | 'DISCHARGED'; admittedAt: string; dischargedAt: string | null; outcome: string; cleanedAt: string | null; cleanedBy: string;
  patient: { uhid: string; name: string; gender: string; dob: string };
  doctor: { id: string; name: string; department: string } | null;
  chart: Array<{ id: string; kind: 'READING' | 'ESCALATION' | 'NOTE'; at: string; by: string; bp: string | null; pulse: number | null; temp: number | null; spo2: number | null; respiratoryRate: number | null; avpu: string | null; onOxygen: boolean; pain: number | null; news2: number | null; escalatedTo: string; automatic: boolean; note: string }>;
  rounds: Array<{ id: string; at: string; note: string; plan: string; by: string; onBehalfOf: string }>;
}

interface ApiFollowUp { id: string; uhid: string; patient: string; phone: string; doctor: string; prescribedOn: string; dueDate: string; reason: string; clinicalNote: string; status: string; bookedSlot: string | null }
interface ApiBooking { id: string; ref: string; date: string; slot: string; uhid: string; patient: string; phone: string; gender: string; dob: string; doctor: string; doctorStaffRef: string; specialty: string; room: string; visitType: SharedAppointment['visitType']; fee: number; status: SharedAppointment['status']; followUpId: string | null; notes: string; cancelReason: string; bookedBy: string; bookedAt: string; token: number | null }

interface ApiAlert { id: string; kind: string; priority: 'RED_IMMEDIATE' | 'YELLOW_URGENT'; location: string; patientName: string; age: number; gender: string; condition: string; escalatedTo: string; automatic: boolean; status: 'ACTIVE' | 'ATTENDED'; raisedAt: string; attendedBy: string; outcome: string }

interface ApiBlock { id: string; doctor: string; date: string; allDay: boolean; from: string | null; to: string | null; reason: string; by: string; at: string }
interface ApiStatus { doctor: string; status: DoctorSession['status']; until: string | null; note: string | null; since: string; by: string }

const state = {
  blocks: [] as ApiBlock[],
  statuses: [] as ApiStatus[],
  audit: [] as OpdAdminLogEntry[],
  alerts: [] as ApiAlert[],
  followUps: [] as ApiFollowUp[],
  bookings: [] as ApiBooking[],
  visits: [] as ApiVisit[],
  stays: [] as ApiStay[],
  loaded: false,
  loading: null as Promise<void> | null,
  timer: null as ReturnType<typeof setInterval> | null,
  fingerprint: '',
  version: 0,
  memo: { version: -1, queue: [] as SharedQueueToken[] },
};

export const OPD_API_ERROR_EVENT = 'nh_opd_api_error';
/** Subscribe to refused OPD actions (wrong state, role, missing data). Returns an unsubscribe. */
export const onOpdApiError = (cb: (message: string) => void) => {
  const handler = (e: Event) => cb(String((e as CustomEvent).detail || 'OPD server error'));
  window.addEventListener(OPD_API_ERROR_EVENT, handler);
  return () => window.removeEventListener(OPD_API_ERROR_EVENT, handler);
};

const emit = () => {
  state.version += 1;
  window.dispatchEvent(new Event('nh_data_sync'));
};

const errorText = (err: unknown) => {
  const e = err as { response?: { data?: unknown; status?: number }; message?: string };
  const data = e?.response?.data as Record<string, unknown> | string | undefined;
  if (typeof data === 'string') return data.slice(0, 200);
  if (data && typeof data === 'object') {
    const first = Object.values(data)[0];
    if (typeof first === 'string') return first;
    if (Array.isArray(first) && first.length) return String(first[0]);
    if (first && typeof first === 'object') return String(Object.values(first as Record<string, unknown>)[0] ?? '');
  }
  if (e?.response?.status === 403) return 'Your role cannot do this.';
  return e?.message || 'The OPD server could not be reached.';
};

const fail = (err: unknown) => {
  const message = errorText(err);
  window.dispatchEvent(new CustomEvent(OPD_API_ERROR_EVENT, { detail: message }));
  return message;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const refresh = async () => {
  if (state.loading) return state.loading;
  state.loading = (async () => {
    try {
      const [res, stays, fus, books, alerts, blocks, statuses, audit] = await Promise.all([
        api.get<{ visits: ApiVisit[] }>('/opd/visits/', { params: { date: today(), full: 1 } }),
        api.get<{ stays: ApiStay[] }>('/opd/daycare/stays/'),
        api.get<{ followUps: ApiFollowUp[] }>('/opd/follow-ups/'),
        api.get<{ bookings: ApiBooking[] }>('/opd/bookings/'),
        api.get<{ alerts: ApiAlert[] }>('/opd/emergency-alerts/'),
        api.get<{ blocks: ApiBlock[] }>('/opd/doctor-blocks/'),
        api.get<{ statuses: ApiStatus[] }>('/opd/doctor-status/'),
        api.get<{ entries: OpdAdminLogEntry[] }>('/opd/admin-audit/'),
      ]);
      state.blocks = blocks.data.blocks || [];
      state.statuses = statuses.data.statuses || [];
      state.audit = audit.data.entries || [];
      state.alerts = alerts.data.alerts || [];
      const next = res.data.visits || [];
      state.followUps = fus.data.followUps || [];
      state.bookings = books.data.bookings || [];
      const fp = JSON.stringify([next, stays.data.stays, state.followUps, state.bookings, state.alerts, state.blocks, state.statuses, state.audit]);
      const changed = fp !== state.fingerprint || !state.loaded;
      state.visits = next;
      state.stays = stays.data.stays || [];
      state.fingerprint = fp;
      state.loaded = true;
      if (changed) emit();
    } catch (err) {
      fail(err);
    } finally {
      state.loading = null;
    }
  })();
  return state.loading;
};

const ensureStarted = () => {
  if (!state.loaded && !state.loading) {
    void refresh();
    // OPD admin settings follow the server too (loaded on demand to keep the module graph acyclic)
    void import('./opdConfigSync').then((m) => m.startOpdConfigSync());
  }
  if (!state.timer) {
    state.timer = setInterval(() => {
      if (opdApiMode() && document.visibilityState === 'visible') void refresh();
    }, 10000);
  }
};

const replace = (v: ApiVisit) => {
  const i = state.visits.findIndex((x) => x.id === v.id);
  state.visits = i === -1 ? [...state.visits, v] : state.visits.map((x) => (x.id === v.id ? v : x));
  emit();
  return v;
};

/** Send one action; on success take the server's visit, on refusal report it and re-read. */
async function send(path: string, body: unknown, method: 'post' | 'put' = 'post'): Promise<ApiVisit | null> {
  try {
    const res = await api[method]<ApiVisit>(path, body);
    return res.data && (res.data as ApiVisit).id ? replace(res.data as ApiVisit) : null;
  } catch (err) {
    fail(err);
    void refresh();
    return null;
  }
}

/* ------------------------------------------------------------------ mapping to the desk token shape */

const ageOf = (dob: string) => {
  const d = dob ? new Date(dob) : null;
  if (!d || Number.isNaN(d.getTime())) return 0;
  const n = new Date();
  return n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
};
const hhmm = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
const lastEvent = (v: ApiVisit, action: string) => [...(v.events || [])].reverse().find((e) => e.action === action);

function tokenStatus(v: ApiVisit): Pick<SharedQueueToken, 'status' | 'callingStatus' | 'callPoint' | 'chamberHold'> {
  const emergency = v.priority === 'EMERGENCY';
  switch (v.status) {
    case 'WAITING': return { status: emergency ? 'EMERGENCY' : 'WAITING', callingStatus: 'IDLE' };
    case 'CALLED_TRIAGE': return { status: emergency ? 'EMERGENCY' : 'WAITING', callingStatus: 'CALLING', callPoint: 'Triage station' };
    case 'IN_TRIAGE': return { status: 'IN_TRIAGE', callingStatus: 'ACCEPTED' };
    case 'READY_FOR_DOCTOR': return { status: 'READY_FOR_DOCTOR', callingStatus: 'IDLE' };
    case 'CALLED_IN': return { status: 'IN_CONSULTATION', callingStatus: 'CALLING' };
    case 'IN_CONSULTATION': return { status: 'IN_CONSULTATION', callingStatus: 'ACCEPTED' };
    case 'AWAITING_REPORTS': {
      const labs = v.labOrders || [];
      const signed = labs.filter((o) => o.status === 'REPORT_APPROVED').length;
      return { status: 'READY_FOR_DOCTOR', callingStatus: 'IDLE', chamberHold: `Waiting for reports · ${signed} of ${labs.length} signed` };
    }
    case 'ON_HOLD':
      // Held from the chamber queue shows as a chamber hold; held before triage is the nurse's HOLD
      return ['READY_FOR_DOCTOR', 'CALLED_IN'].includes(v.holdFrom)
        ? { status: 'READY_FOR_DOCTOR', callingStatus: 'IDLE', chamberHold: v.holdReason || 'On hold' }
        : { status: 'HOLD', callingStatus: 'IDLE', chamberHold: v.holdReason || 'On hold' };
    case 'COMPLETED':
    case 'CHECKED_OUT': return { status: 'COMPLETED', callingStatus: 'IDLE' };
    case 'NO_SHOW': return { status: 'NO_SHOW', callingStatus: 'IDLE' };
    default: return { status: 'CANCELLED', callingStatus: 'IDLE' };
  }
}

export function visitToToken(v: ApiVisit): SharedQueueToken {
  const t = v.triage;
  const vs = t?.vitals;
  const out = lastEvent(v, 'CHECKED_OUT');
  const skipped = lastEvent(v, 'SKIP_TRIAGE');
  const noShow = lastEvent(v, 'NO_SHOW');
  const emergencyEv = lastEvent(v, 'MARKED_EMERGENCY');
  const note = (e?: { payload: Record<string, unknown> }) => String(e?.payload?.reason || '');
  return {
    id: v.id,
    token: v.token,
    aptNo: v.visitNumber,
    uhid: v.patient.uhid,
    patient: v.patient.name,
    age: ageOf(v.patient.dob),
    gender: v.patient.gender,
    bloodGroup: v.patient.bloodGroup,
    phone: v.patient.phone,
    doctor: v.doctor ? `${v.doctor.name}${v.doctor.department ? ` (${v.doctor.department})` : ''}` : 'Doctor not assigned',
    room: v.chamber || 'Chamber not assigned',
    time: hhmm(v.timeline.issued_at),
    type: v.visitType === 'NEW' ? 'WALK_IN' : v.visitType,
    ...tokenStatus(v),
    priority: v.priority as SharedQueueToken['priority'],
    feePaid: ['PAID', 'CREDITED', 'REFUNDED'].includes(v.feeStatus),
    totalFee: v.fee,
    paymentMode: v.deskPayment?.paid ? v.deskPayment.mode || 'CASH' : v.feeStatus === 'PAID' ? 'CASHIER' : 'UNPAID',
    invoiceNo: v.deskPayment?.receipt || undefined,
    calledAt: v.timeline.called_at || undefined,
    seatedAt: v.timeline.seated_at || undefined,
    handoff: out ? { at: out.at, by: out.by, routes: ((out.payload.routes as string[]) || []).filter((r) => r !== 'HOME').map(routeLabel), note: String(out.payload.note || '') || undefined } : undefined,
    checkoutTime: hhmm(v.timeline.completed_at) || undefined,
    allergies: v.patient.allergies,
    chronicConditions: v.patient.conditions,
    currentMedications: t?.currentMedications,
    triageNotes: noShow ? `No-show: ${note(noShow)}` : skipped ? `Triage skipped: ${note(skipped)}` : emergencyEv && note(emergencyEv) ? `EMERGENCY: ${note(emergencyEv)}` : t?.notes || undefined,
    waitingStartTime: v.timeline.issued_at || undefined,
    triageStartTime: v.timeline.triage_started_at || undefined,
    vitals: vs && vs.systolic_bp ? {
      bp: `${vs.systolic_bp}/${vs.diastolic_bp ?? ''}`,
      pulse: vs.pulse_rate ?? 0,
      temp: vs.temperature ?? 0,
      spo2: vs.spo2 ?? 0,
      height: vs.height_cm ?? 0,
      weight: vs.weight_kg ?? 0,
      bmi: vs.bmi ?? 0,
      respiratoryRate: vs.respiratory_rate ?? undefined,
      rbs: vs.rbs ?? undefined,
      painScale: t?.painScore ?? undefined,
      avpu: (vs.avpu || undefined) as 'A' | 'C' | 'V' | 'P' | 'U' | undefined,
      onOxygen: vs.on_oxygen || undefined,
      news2: vs.news2 ?? t?.news2 ?? undefined,
      recordedAt: t?.triagedAt || undefined,
      recordedBy: t?.triagedBy || undefined,
    } : undefined,
    assessment: t && (t.chiefComplaint || t.category) ? {
      chiefComplaint: t.chiefComplaint,
      painScale: t.painScore ?? undefined,
      allergies: t.allergies,
      medicalHistory: t.conditions,
      currentMedications: t.currentMedications,
      triageCategory: (t.category || undefined) as NonNullable<SharedQueueToken['assessment']>['triageCategory'],
      triagedBy: t.triagedBy || undefined,
      triagedAt: t.triagedAt || undefined,
      fallRisk: t.fallRisk ? 'HIGH' : 'LOW',
      pregnancy: (t.pregnancy || undefined) as NonNullable<SharedQueueToken['assessment']>['pregnancy'],
      nurseNotes: t.notes || undefined,
    } : undefined,
  };
}

const ROUTES: Array<[RegExp, string, string]> = [
  [/pharm/i, 'PHARMACY', 'Pharmacy'],
  [/sample|lab/i, 'LAB', 'Sample collection'],
  [/cash|bill/i, 'BILLING', 'Cash counter'],
  [/follow/i, 'FOLLOW_UP', 'Follow-up booking'],
  [/x-?ray|radio|imaging|scan/i, 'RADIOLOGY', 'Radiology'],
  [/treat|inject|dress/i, 'TREATMENT_ROOM', 'Treatment room'],
  [/day.?care|observ/i, 'DAYCARE', 'Day-care'],
  [/admi/i, 'ADMISSION', 'Admission'],
  [/refer/i, 'REFERRAL', 'Referral'],
];
const routeCode = (label: string) => ROUTES.find(([re]) => re.test(label))?.[1] || 'HOME';
const routeLabel = (code: string) => ROUTES.find(([, c]) => c === code)?.[2] || code;

/* ------------------------------------------------------------------ public API */

const visitFor = (t: SharedQueueToken) => state.visits.find((v) => v.id === t.id);
const tx = (t: SharedQueueToken, action: string, reason = '') => send(`/opd/visits/${t.id}/transition/`, { action, reason });

const num = (v: unknown) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v));

export const OpdApi = {
  ensureStarted,
  refresh,
  isLoaded: () => state.loaded,
  visits: () => {
    ensureStarted();
    return state.visits;
  },
  /** Today's visits in the desk token shape (cancelled visits are dropped, as a deleted token was). */
  queue(): SharedQueueToken[] {
    ensureStarted();
    if (state.memo.version !== state.version) {
      state.memo = { version: state.version, queue: state.visits.filter((v) => v.status !== 'CANCELLED').map(visitToToken) };
    }
    return state.memo.queue;
  },
  visit: (id: string) => state.visits.find((v) => v.id === id),
  /** Today's prescriptions written on the server, in the shape the nurse / assistant screens read. */
  prescriptions(): SharedPrescription[] {
    ensureStarted();
    return state.visits.flatMap((v) =>
      (v.prescriptions || []).map((rx) => ({
        id: `rx-${rx.number}`, prescriptionNo: rx.number, uhid: v.patient.uhid, patientName: v.patient.name, age: ageOf(v.patient.dob),
        gender: v.patient.gender, doctorName: rx.doctor, doctorSpecialization: v.doctor?.department || '', chamber: v.chamber, date: rx.date,
        diagnosis: rx.diagnosis, chiefComplaints: v.triage?.chiefComplaint || '', advice: rx.advice || undefined, tokenId: v.id,
        isDispensed: rx.dispenseOrders.some((o) => o.status === 'DISPENSED'),
        items: rx.items.map((i) => ({ medicineName: i.name, dosage: i.dose, frequency: i.frequency, durationDays: i.days, timing: i.timing || undefined, instructions: i.instructions || undefined })),
      })),
    );
  },
  /** Today's treatment-room records from the server. */
  procedures(): NurseProcedure[] {
    ensureStarted();
    return state.visits.flatMap((v) =>
      (v.procedures || []).map((p) => ({
        id: p.id, uhid: p.uhid, patientName: p.patient, token: p.token, kind: p.kind, detail: p.detail, orderedBy: p.orderedBy,
        rxNo: p.rxNo || undefined, rxItem: p.rxItem ?? undefined, route: p.route || undefined, site: p.site || undefined,
        batchNo: p.batchNo || undefined, status: p.status, note: p.note || undefined, at: p.at, by: p.by,
      })),
    );
  },
  // ---- doctor availability & admin log
  blocks(): DoctorBlock[] {
    ensureStarted();
    return state.blocks.map((b) => ({ id: b.id, doctor: b.doctor, date: b.date, allDay: b.allDay, from: b.from || undefined, to: b.to || undefined, reason: b.reason, by: b.by, at: b.at }));
  },
  sessions(): Record<string, DoctorSession> {
    ensureStarted();
    return Object.fromEntries(state.statuses.map((s) => [s.doctor, { doctor: s.doctor, status: s.status, until: s.until || undefined, note: s.note || undefined, since: s.since, by: s.by }]));
  },
  auditLog: (): OpdAdminLogEntry[] => {
    ensureStarted();
    return state.audit;
  },
  async call(method: 'post' | 'put' | 'delete', path: string, body?: object) {
    try {
      await (method === 'delete' ? api.delete(path) : api[method](path, body));
      await refresh();
      return true;
    } catch (err) {
      fail(err);
      void refresh();
      return false;
    }
  },

  // ---- emergency alerts
  alerts(): SharedEmergencyAlert[] {
    ensureStarted();
    return state.alerts.map((a) => ({
      id: a.id, callTime: new Date(a.raisedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), location: a.location,
      patientName: a.patientName, age: a.age, gender: a.gender || '—', triagePriority: a.priority,
      presentingCondition: a.kind === 'ESCALATION' && a.escalatedTo ? `${a.automatic ? 'Automatic' : 'Nurse'} escalation to ${a.escalatedTo}: ${a.condition}` : a.condition,
      status: a.status, attendedBy: a.attendedBy || undefined,
    }));
  },

  // ---- follow-ups & bookings
  followUps(): SharedDoctorFollowUp[] {
    ensureStarted();
    return state.followUps.filter((f) => f.status !== 'CANCELLED').map((f) => ({
      id: f.id, uhid: f.uhid, patientName: f.patient, phone: f.phone, doctorName: f.doctor, prescribedOn: f.prescribedOn,
      followUpDate: f.dueDate, reason: f.reason, clinicalNotes: f.clinicalNote || undefined,
      // a missed follow-up goes back on the to-book list
      status: (f.status === 'MISSED' ? 'PENDING_BOOKING' : f.status) as SharedDoctorFollowUp['status'],
      bookedSlot: f.bookedSlot || undefined,
    }));
  },
  appointments(): SharedAppointment[] {
    ensureStarted();
    return state.bookings.map((b) => ({
      id: b.id, ref: b.ref, date: b.date, slot: b.slot, uhid: b.uhid, patient: b.patient, phone: b.phone, age: ageOf(b.dob), gender: b.gender,
      doctor: b.doctor, specialty: b.specialty, room: b.room, visitType: b.visitType, fee: b.fee, status: b.status,
      token: b.token ?? undefined, followUpId: b.followUpId || undefined, notes: b.notes || undefined, bookedBy: b.bookedBy, bookedAt: b.bookedAt,
      cancelReason: b.cancelReason || undefined,
    }));
  },
  async bookingCall(method: 'post' | 'put', path: string, body: object) {
    try {
      const res = await api[method]<ApiBooking & ApiVisit>(path, body);
      await refresh();
      return res.data;
    } catch (err) {
      fail(err);
      return null;
    }
  },

  // ---- day-care beds
  stays: () => {
    ensureStarted();
    return state.stays;
  },
  stayForBed: (bedId: string) => state.stays.find((s) => s.bedRef === bedId && s.status === 'OCCUPIED'),
  /** Day-care occupancy from the server laid over the campus bed layout. */
  overlayBeds(beds: FlatCampusBed[], isDaycare: (b: FlatCampusBed) => boolean): FlatCampusBed[] {
    ensureStarted();
    return beds.map((b) => {
      const mine = state.stays.filter((s) => s.bedRef === b.bed.id);
      if (!isDaycare(b) && !mine.length) return b;
      const open = mine.find((s) => s.status === 'OCCUPIED');
      const dirty = !open && mine.some((s) => s.status === 'DISCHARGED' && !s.cleanedAt);
      const cleaned = mine.filter((s) => s.cleanedAt).sort((x, y) => (y.cleanedAt || '').localeCompare(x.cleanedAt || ''))[0];
      const bed = { ...b.bed, status: open ? ('OCCUPIED' as const) : b.bed.status === 'OCCUPIED' ? ('AVAILABLE' as const) : b.bed.status, inpatientDetails: undefined as FlatCampusBed['bed']['inpatientDetails'] };
      bed.cleanlinessStatus = dirty ? 'NEEDS_CLEANING' : 'SANITIZED';
      if (cleaned && !dirty) Object.assign(bed, { lastCleanedAt: new Date(cleaned.cleanedAt as string).toLocaleString(), assignedCleaner: cleaned.cleanedBy });
      if (open) {
        bed.inpatientDetails = {
          patientName: open.patient.name, uhid: open.patient.uhid, ipdAdmissionNo: open.stayNumber,
          admissionDate: new Date(open.admittedAt).toLocaleString(), age: ageOf(open.patient.dob),
          gender: (open.patient.gender || 'OTHER') as 'MALE' | 'FEMALE' | 'OTHER', diagnosis: open.reason, acuity: 'OBSERVATION',
          primaryDoctor: { id: open.doctor?.id || 'opd', name: open.doctor?.name || 'Doctor not set', specialty: open.doctor?.department || 'OPD' },
          consultingDoctors: [], primaryNurse: { id: 'opd-nurse', name: open.nurse || 'Duty nurse', shift: '' }, cleanlinessStatus: 'SANITIZED',
        } as unknown as FlatCampusBed['bed']['inpatientDetails'];
      }
      return { ...b, bed };
    });
  },
  chart(): NurseChartEntry[] {
    ensureStarted();
    return state.stays.flatMap((s) => s.chart.map((e) => ({
      id: e.id, chartKey: `${s.bedRef}|${s.stayNumber}`, bedId: s.bedRef, uhid: s.patient.uhid, patientName: s.patient.name, kind: e.kind,
      at: e.at, by: e.by, bp: e.bp || undefined, pulse: e.pulse ?? undefined, temp: e.temp ?? undefined, spo2: e.spo2 ?? undefined,
      respiratoryRate: e.respiratoryRate ?? undefined, avpu: (e.avpu || undefined) as NurseChartEntry['avpu'], onOxygen: e.onOxygen || undefined,
      pain: e.pain ?? undefined, news2: e.news2 ?? undefined, escalatedTo: e.escalatedTo || undefined, note: e.note || undefined,
    })));
  },
  rounds(): RoundNote[] {
    ensureStarted();
    return state.stays.flatMap((s) => s.rounds.map((r) => ({
      id: r.id, bedId: s.bedRef, admissionNo: s.stayNumber, uhid: s.patient.uhid, patientName: s.patient.name,
      doctor: r.onBehalfOf ? `${r.onBehalfOf} (entered by ${r.by})` : r.by, at: r.at, note: r.note, plan: r.plan || undefined,
    })));
  },
  async stayAction(path: string, body: object) {
    try {
      const res = await api.post<ApiStay & { autoEscalation?: boolean }>(path, body);
      await refresh();
      return res.data;
    } catch (err) {
      fail(err);
      return null;
    }
  },
  async recordProcedure(p: NurseProcedure, fiveRights: boolean) {
    try {
      await api.post('/opd/procedures/', {
        uhid: p.uhid, rx_no: p.rxNo, rx_item: p.rxItem, kind: p.kind, detail: p.detail, ordered_by: p.orderedBy, route: p.route,
        site: p.site, batch_no: p.batchNo, status: p.status, note: p.note, five_rights: fiveRights,
      });
      await refresh();
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  },
  draftOf: (id: string) => state.visits.find((v) => v.id === id)?.draft ?? null,

  // ---- reception
  issue: (t: SharedQueueToken, opts: { doctorRef: string; payNow: boolean; mode: string; receipt?: string }) =>
    send('/opd/visits/', {
      uhid: t.uhid, patient_name: t.patient, gender: t.gender, phone: t.phone, blood_group: t.bloodGroup,
      doctor: opts.doctorRef || t.doctor, visit_type: t.type === 'WALK_IN' || t.type === 'SCHEDULED' ? 'NEW' : t.type,
      priority: t.priority || 'NORMAL', fee: t.totalFee ?? undefined, fee_paid: opts.payNow,
      payment_mode: opts.payNow ? opts.mode : '', receipt: opts.receipt || '', chamber: t.room === 'Chamber not assigned' ? '' : t.room,
    }),
  deskFee: (t: SharedQueueToken, mode: string, receipt: string, amount?: number) => send(`/opd/visits/${t.id}/desk-fee/`, { mode, receipt, amount }),
  reassign: (t: SharedQueueToken, doctorRef: string, chamber?: string) => send(`/opd/visits/${t.id}/reassign/`, { doctor: doctorRef, chamber }),
  cancel: (t: SharedQueueToken, reason: string) => tx(t, 'cancel', reason),
  noShow: (t: SharedQueueToken, reason: string) => tx(t, 'no_show', reason),
  reopen: (t: SharedQueueToken) => tx(t, 'reopen'),
  prioritize: (t: SharedQueueToken) => tx(t, 'prioritize'),

  // ---- nurse
  callToTriage: (t: SharedQueueToken) => tx(t, 'call_triage'),
  startTriage: async (t: SharedQueueToken) => {
    const v = visitFor(t);
    if (v && ['WAITING', 'CALLED_TRIAGE'].includes(v.status)) return tx(t, 'start_triage');
    return v || null;
  },
  skipTriage: (t: SharedQueueToken, reason: string) => tx(t, 'skip_triage', reason),
  markEmergency: (t: SharedQueueToken, reason: string) => tx(t, 'mark_emergency', reason),
  hold: (t: SharedQueueToken, reason: string) => tx(t, 'hold', reason || 'Patient stepped away'),
  resume: (t: SharedQueueToken) => tx(t, 'resume'),
  /** Save (or send to the doctor) the triage from the nurse/assistant form, given in the token shape. */
  saveTriage: async (t: SharedQueueToken, u: Partial<SharedQueueToken>, submit: boolean) => {
    const v = visitFor(t);
    if (v && ['WAITING', 'CALLED_TRIAGE'].includes(v.status) && !submit) {
      // recording vitals means triage has started (nurse only; the assistant just records)
      let role = '';
      try {
        role = JSON.parse(localStorage.getItem('user') || '{}').role || '';
      } catch {
        role = '';
      }
      if (role === 'NURSE') await tx(t, 'start_triage');
    }
    const vt = u.vitals;
    const [sys, dia] = String(vt?.bp || '').split('/');
    const a = u.assessment;
    const body: Record<string, unknown> = {
      vitals: vt ? {
        bpSys: num(sys), bpDia: num(dia), pulse: num(vt.pulse), temp: num(vt.temp), spo2: num(vt.spo2),
        rr: num(vt.respiratoryRate), rbs: num(vt.rbs), height: num(vt.height), weight: num(vt.weight),
        avpu: vt.avpu || '', onOxygen: !!vt.onOxygen,
      } : undefined,
    };
    if (vt?.news2 !== undefined) body.news2 = vt.news2;
    if (a) Object.assign(body, {
      chief_complaint: a.chiefComplaint, pain_score: a.painScale ?? vt?.painScale ?? '', triage_category: a.triageCategory || '',
      allergies: a.allergies, conditions: a.medicalHistory, current_medications: a.currentMedications,
      fall_risk: a.fallRisk === 'HIGH', pregnancy: a.pregnancy || '', nurse_notes: a.nurseNotes || '',
    });
    return send(`/opd/visits/${t.id}/triage/${submit ? 'submit/' : ''}`, body, submit ? 'post' : 'put');
  },

  // ---- doctor / assistant
  callIn: (t: SharedQueueToken) => tx(t, 'call_in'),
  seat: async (t: SharedQueueToken) => {
    const v = visitFor(t);
    if (v?.status === 'READY_FOR_DOCTOR' && !(await tx(t, 'call_in'))) return null;
    return tx(t, 'seat');
  },
  saveDraft: async (t: SharedQueueToken, draft: unknown) => {
    try {
      await api.put(`/opd/visits/${t.id}/consultation/draft/`, draft || {});
      const v = visitFor(t);
      if (v) replace({ ...v, draft });
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  },
  sendForTests: (t: SharedQueueToken, tests: Array<{ name: string; priority: string; notes?: string }>, draft: unknown) =>
    send(`/opd/visits/${t.id}/send-for-tests/`, { tests, draft }),
  complete: (t: SharedQueueToken, body: Record<string, unknown>) => send(`/opd/visits/${t.id}/complete/`, body),
  checkout: (t: SharedQueueToken, labels: string[], note?: string) =>
    send(`/opd/visits/${t.id}/checkout/`, { routes: [...new Set(labels.map(routeCode))].filter((r) => r !== 'HOME'), note }),
};
