// OPD desk actions used by the reception, nurse, doctor and assistant screens. Signed in, each one is a server call
// (the server checks the state, the role and does the hand-offs); with a demo sign-in it updates the browser queue as
// before. Every action resolves true when it took effect, false when the server refused it (the reason is raised on
// the OPD error event and shown by the desk).
import { patientJourneyService, FlatCampusBed, NurseChartEntry, NurseProcedure, SharedAppointment, SharedEmergencyAlert, SharedQueueToken } from './patientJourneyService';
import { useEffect } from 'react';
import { OpdApi, onOpdApiError, opdApiMode } from './opdService';

type Patch = Partial<SharedQueueToken>;
type ApiVisitLike = { token: number };
const local = (t: SharedQueueToken, patch: Patch) => {
  patientJourneyService.updateQueueToken(t.token, patch);
  return Promise.resolve(true);
};
const ok = async (p: Promise<unknown>) => !!(await p);
const nowIso = () => new Date().toISOString();

export const opdActions = {
  server: opdApiMode,

  // ---- reception
  /** Issue a token. Signed in the server numbers it; `payNow` records the desk fee with it. */
  async issue(t: SharedQueueToken, o: { doctorRef: string; payNow: boolean; mode: string; receipt?: string }) {
    if (opdApiMode()) {
      const v = await OpdApi.issue(t, o);
      return v ? { ...t, id: v.id, token: v.token, aptNo: v.visitNumber } : null;
    }
    patientJourneyService.addQueueToken(t);
    return t;
  },
  deskFee: (t: SharedQueueToken, mode: string, receipt: string, total: number) =>
    opdApiMode() ? ok(OpdApi.deskFee(t, mode, receipt, total)) : local(t, { feePaid: true, paymentMode: mode, invoiceNo: receipt, totalFee: total }),
  reassign: (t: SharedQueueToken, doctorRef: string, doctorLabel: string, room: string) =>
    opdApiMode() ? ok(OpdApi.reassign(t, doctorRef, room, doctorLabel)) : local(t, { doctor: doctorLabel, room, callingStatus: 'IDLE' }),
  cancel(t: SharedQueueToken, reason: string) {
    if (opdApiMode()) return ok(OpdApi.cancel(t, reason));
    patientJourneyService.deleteQueueToken(t.token);
    return Promise.resolve(true);
  },

  // ---- queue movement (nurse, reception, assistant)
  callToTriage: (t: SharedQueueToken, point: string) =>
    opdApiMode() ? ok(OpdApi.callToTriage(t)) : local(t, { callingStatus: 'CALLING', callPoint: point }),
  startTriage: (t: SharedQueueToken) =>
    opdApiMode() ? ok(OpdApi.startTriage(t)) : local(t, { status: 'IN_TRIAGE', callingStatus: 'ACCEPTED', callPoint: undefined, triageStartTime: t.triageStartTime || nowIso() }),
  skipTriage: (t: SharedQueueToken, reason: string) =>
    opdApiMode() ? ok(OpdApi.skipTriage(t, reason)) : local(t, { status: 'READY_FOR_DOCTOR', callingStatus: 'IDLE', callPoint: undefined, triageNotes: `Triage skipped: ${reason}` }),
  markEmergency: (t: SharedQueueToken, reason: string) =>
    opdApiMode() ? ok(OpdApi.markEmergency(t, reason)) : local(t, { status: 'EMERGENCY', priority: 'EMERGENCY', triageNotes: `EMERGENCY: ${reason}` }),
  /** Nurse hold before triage (patient stepped away). */
  hold: (t: SharedQueueToken, reason = 'Patient stepped away') =>
    opdApiMode() ? ok(OpdApi.hold(t, reason)) : local(t, { status: 'HOLD', callingStatus: 'IDLE', callPoint: undefined }),
  /** Chamber-desk hold: the token keeps its place, waiting for the patient. */
  chamberHold: (t: SharedQueueToken, reason: string, localStatus: string) =>
    opdApiMode() ? ok(OpdApi.hold(t, reason)) : local(t, { chamberHold: reason, callingStatus: 'IDLE', status: localStatus }),
  resume: (t: SharedQueueToken) =>
    opdApiMode() ? ok(OpdApi.resume(t)) : local(t, t.status === 'HOLD' ? { status: 'WAITING' } : { chamberHold: undefined }),
  noShow: (t: SharedQueueToken, reason: string) =>
    opdApiMode() ? ok(OpdApi.noShow(t, reason)) : local(t, { status: 'NO_SHOW', callingStatus: 'IDLE', chamberHold: undefined, triageNotes: `No-show: ${reason}` }),

  /** Late arrival after a no-show: back in the queue. */
  reopen: (t: SharedQueueToken) =>
    opdApiMode() ? ok(OpdApi.reopen(t)) : local(t, { status: 'WAITING', callingStatus: 'IDLE', waitingStartTime: nowIso() }),
  prioritize: (t: SharedQueueToken) => (opdApiMode() ? ok(OpdApi.prioritize(t)) : local(t, { priority: 'URGENT' })),
  /** Reception check-out of a seen patient (no assistant at the chamber). */
  receptionCheckout(t: SharedQueueToken, time: string) {
    return opdApiMode() ? ok(OpdApi.checkout(t, [], 'Checked out at reception')) : local(t, { status: 'COMPLETED', callingStatus: 'IDLE', checkoutTime: time });
  },

  /** Treatment room: a clinic dose or procedure given (charged on the server) or refused. */
  recordProcedure(p: NurseProcedure, fiveRights: boolean) {
    if (opdApiMode()) return OpdApi.recordProcedure(p, fiveRights);
    patientJourneyService.addNurseProcedure(p);
    return Promise.resolve(true);
  },

  // ---- emergency alerts
  /** Code Blue / escalation. `ref` links the alert to a patient (uhid) or a day-care stay's bed. */
  raiseAlert(alert: SharedEmergencyAlert, ref: { uhid?: string; bedId?: string; kind?: 'CODE_BLUE' | 'ESCALATION'; escalatedTo?: string } = {}) {
    if (!opdApiMode()) {
      patientJourneyService.raiseEmergencyAlert(alert);
      return Promise.resolve(true);
    }
    const stay = ref.bedId ? OpdApi.stayForBed(ref.bedId) : undefined;
    return ok(OpdApi.stayAction('/opd/emergency-alerts/', {
      kind: ref.kind || 'CODE_BLUE', priority: alert.triagePriority, location: alert.location, condition: alert.presentingCondition,
      uhid: ref.uhid, stay_id: stay?.id, patient_name: alert.patientName, age: alert.age, gender: alert.gender, escalated_to: ref.escalatedTo,
    }));
  },
  attendAlert(id: string, outcome = '') {
    if (!opdApiMode()) return Promise.resolve(patientJourneyService.markEmergencyAlertAttended(id));
    return ok(OpdApi.stayAction(`/opd/emergency-alerts/${id}/attend/`, { outcome }));
  },

  // ---- appointments & follow-ups
  /** Book a new appointment (or reschedule `existingId`). Resolves the saved booking or null when refused. */
  async book(a: SharedAppointment, doctorRef: string, existingId?: string): Promise<SharedAppointment | null> {
    if (!opdApiMode()) {
      patientJourneyService.saveAppointment(a);
      if (a.followUpId) patientJourneyService.updateFollowUpStatus(a.followUpId, 'BOOKED', `${a.date} ${a.slot}`);
      return a;
    }
    const body = { uhid: a.uhid, doctor: doctorRef, doctor_name: a.doctor, date: a.date, slot: a.slot, visit_type: a.visitType, fee: a.fee, room: a.room, notes: a.notes || '', follow_up_id: existingId ? undefined : a.followUpId };
    const r = existingId ? await OpdApi.bookingCall('put', `/opd/bookings/${existingId}/`, body) : await OpdApi.bookingCall('post', '/opd/bookings/', body);
    return r ? OpdApi.appointments().find((x) => x.id === r.id) || null : null;
  },
  cancelBooking(a: SharedAppointment, reason: string) {
    if (!opdApiMode()) {
      patientJourneyService.updateAppointment(a.id, { status: 'CANCELLED', cancelReason: reason });
      if (a.followUpId) patientJourneyService.updateFollowUpStatus(a.followUpId, 'PENDING_BOOKING');
      return Promise.resolve(true);
    }
    return ok(OpdApi.bookingCall('post', `/opd/bookings/${a.id}/cancel/`, { reason }));
  },
  bookingNoShow(a: SharedAppointment) {
    if (!opdApiMode()) {
      patientJourneyService.updateAppointment(a.id, { status: 'NO_SHOW' });
      return Promise.resolve(true);
    }
    return ok(OpdApi.bookingCall('post', `/opd/bookings/${a.id}/cancel/`, { no_show: true }));
  },
  /** Check a booked patient in: the server issues the visit (follow-up type and fee for a follow-up). Resolves the token number. */
  async checkIn(a: SharedAppointment, fee: number, local: () => Promise<number | null>): Promise<number | null> {
    if (!opdApiMode()) return local();
    const v = await OpdApi.bookingCall('post', `/opd/bookings/${a.id}/check-in/`, { fee });
    return v ? (v as unknown as ApiVisitLike).token : null;
  },

  // ---- day-care beds
  allocateBed(bed: FlatCampusBed, o: { uhid: string; doctor: string; doctorName?: string; nurse: string; reason: string }, local: () => void) {
    if (!opdApiMode()) {
      local();
      return Promise.resolve(true);
    }
    return ok(OpdApi.stayAction('/opd/daycare/stays/', { uhid: o.uhid, bed_ref: bed.bed.id, bed_label: bed.bed.bedNumber, ward_name: bed.wardName, doctor: o.doctor, doctor_name: o.doctorName, nurse: o.nurse, reason: o.reason }));
  },
  dischargeBed(bed: FlatCampusBed, outcome: string) {
    const s = opdApiMode() ? OpdApi.stayForBed(bed.bed.id) : null;
    if (!opdApiMode()) {
      patientJourneyService.dischargeCampusBed(bed.buildingId, bed.floorId, bed.wardId, bed.bed.id);
      return Promise.resolve(true);
    }
    return s ? ok(OpdApi.stayAction(`/opd/daycare/stays/${s.id}/discharge/`, { outcome })) : Promise.resolve(false);
  },
  bedCleaned(bed: FlatCampusBed, by: string) {
    if (!opdApiMode()) return Promise.resolve(patientJourneyService.markCampusBedCleaned(bed.bed.id, by));
    const s = OpdApi.stays().filter((x) => x.bedRef === bed.bed.id && x.status === 'DISCHARGED' && !x.cleanedAt)[0];
    return s ? ok(OpdApi.stayAction(`/opd/daycare/stays/${s.id}/cleaned/`, { cleaner: by })) : Promise.resolve(false);
  },
  transferBed(bed: FlatCampusBed, target: FlatCampusBed | undefined) {
    if (!target) return Promise.resolve(false);
    if (!opdApiMode()) return Promise.resolve(patientJourneyService.transferCampusBed(bed.bed.id, target.bed.id));
    const s = OpdApi.stayForBed(bed.bed.id);
    return s ? ok(OpdApi.stayAction(`/opd/daycare/stays/${s.id}/transfer/`, { bed_ref: target.bed.id, bed_label: target.bed.bedNumber, ward_name: target.wardName })) : Promise.resolve(false);
  },
  /** Observation chart entry. Resolves { ok, autoEscalation } — the server escalates NEWS2 >= 7 itself. */
  async chartEntry(bed: FlatCampusBed, e: NurseChartEntry) {
    if (!opdApiMode()) {
      patientJourneyService.addNurseChartEntry(e);
      return { ok: true, autoEscalation: false };
    }
    const s = OpdApi.stayForBed(bed.bed.id);
    if (!s) return { ok: false, autoEscalation: false };
    const r = await OpdApi.stayAction(`/opd/daycare/stays/${s.id}/chart/`, {
      kind: e.kind, bp: e.bp, pulse: e.pulse, temp: e.temp, spo2: e.spo2, respiratory_rate: e.respiratoryRate, avpu: e.avpu, on_oxygen: e.onOxygen,
      pain: e.pain, news2: e.news2, escalated_to: e.escalatedTo, note: e.note,
    });
    return { ok: !!r, autoEscalation: !!r?.autoEscalation };
  },
  roundNote(bed: FlatCampusBed, note: string, plan: string, local: () => void) {
    if (!opdApiMode()) {
      local();
      return Promise.resolve(true);
    }
    const s = OpdApi.stayForBed(bed.bed.id);
    return s ? ok(OpdApi.stayAction(`/opd/daycare/stays/${s.id}/rounds/`, { note, plan })) : Promise.resolve(false);
  },

  // ---- triage
  saveTriage: (t: SharedQueueToken, updates: Patch, send: boolean) =>
    opdApiMode() ? ok(OpdApi.saveTriage(t, updates, send)) : local(t, updates),

  // ---- chamber (doctor / assistant / reception)
  callIn: (t: SharedQueueToken, room: string) =>
    opdApiMode() ? ok(OpdApi.callIn(t)) : local(t, { status: 'IN_CONSULTATION', callingStatus: 'CALLING', callPoint: undefined, chamberHold: undefined, calledAt: nowIso(), room }),
  seat(t: SharedQueueToken, room: string) {
    if (opdApiMode()) return ok(OpdApi.seat(t));
    const now = nowIso();
    return local(t, { status: 'IN_CONSULTATION', callingStatus: 'ACCEPTED', callPoint: undefined, chamberHold: undefined, calledAt: t.calledAt || now, seatedAt: t.seatedAt || now, room });
  },
  saveDraft(t: SharedQueueToken, draft: unknown | null) {
    patientJourneyService.saveConsultDraft(t.id, draft);
    return opdApiMode() ? OpdApi.saveDraft(t, draft) : Promise.resolve(true);
  },
  checkout: (t: SharedQueueToken, routes: string[], by: string, note?: string) =>
    opdApiMode() ? ok(OpdApi.checkout(t, routes, note)) : local(t, { handoff: { at: nowIso(), by, routes, note } }),
};

/** Show the OPD server's refusals (wrong step, role, missing data) in the desk's message bar. */
export function useOpdApiErrors(show: (message: string, tone?: 'success' | 'error') => void) {
  useEffect(() => onOpdApiError((m) => show(m, 'error')), [show]);
}
