// Front Desk & Reception data: today's token queue, the patient master (UHID), desk invoices, the counter shift,
// advance appointments, doctor follow-ups waiting to be booked, OPD doctors & chambers and the day-care beds.
// All of it lives in the shared patient-journey store that Doctor, Nurse, Assistant and Billing desks also read;
// every count on the workspace (KPIs, sidebar pills, filter chips) is derived from this one hook.
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import {
  patientJourneyService,
  DailyCounterSession,
  FlatCampusBed,
  SharedAppointment,
  SharedDoctorFollowUp,
  SharedInvoice,
  SharedPatient,
  SharedQueueToken,
} from '../../services/patientJourneyService';
import { DepartmentRoom, DepartmentTariffMaster } from '../../types';
import { getDepartmentRooms, getDepartmentTariffMaster } from '../department/departmentWorkspaceStore';

/** OPD department id in the department workspace store. */
export const OPD_DEPT = '1';
const POLL_MS = 15000;

export interface DeskDoctor {
  id: string;
  name: string;
  specialty: string;
  fee: number;
  followUpFee: number;
  emergencyFee: number;
  /** Chamber assigned to this doctor in the OPD room master, if any */
  room: DepartmentRoom | null;
}

export interface ReceptionData {
  queue: SharedQueueToken[];
  patients: SharedPatient[];
  invoices: SharedInvoice[];
  session: DailyCounterSession;
  tariff: DepartmentTariffMaster;
  rooms: DepartmentRoom[];
  doctors: DeskDoctor[];
  beds: FlatCampusBed[];
  followUps: SharedDoctorFollowUp[];
  appointments: SharedAppointment[];
  lastSync: Date;
  reload: () => void;
}

const read = () => {
  const tariff = getDepartmentTariffMaster(OPD_DEPT);
  const rooms = getDepartmentRooms(OPD_DEPT);
  const doctors: DeskDoctor[] = (tariff.doctorTariffs || []).map((d) => ({
    id: d.doctorId,
    name: d.doctorName,
    specialty: d.specialization || d.designation || 'Consultant',
    fee: Number(d.standardFee) || 0,
    followUpFee: Number(d.followUpFee ?? d.standardFee) || 0,
    emergencyFee: Number(d.emergencyFee ?? d.standardFee) || 0,
    room: rooms.find((r) => r.assignedDoctorId === d.doctorId || (!!r.assignedDoctorName && sameDoctor(r.assignedDoctorName, d.doctorName))) || null,
  }));
  return {
    queue: patientJourneyService.getQueue(),
    patients: patientJourneyService.getPatients(),
    invoices: patientJourneyService.getInvoices(),
    session: patientJourneyService.getCounterSession(),
    tariff,
    rooms,
    doctors,
    beds: patientJourneyService.getFlatBedsList(),
    followUps: patientJourneyService.getFollowUps(),
    appointments: patientJourneyService.getAppointments(),
  };
};

export const useReceptionData = (): ReceptionData => {
  const [state, setState] = useState(() => ({ ...read(), lastSync: new Date() }));
  const reload = useCallback(() => setState({ ...read(), lastSync: new Date() }), []);

  useEffect(() => {
    // Desk tokens issued earlier today reach the cashier once the desk opens; later changes sync as they happen
    patientJourneyService.syncTodayQueueToBilling();
    const events = ['nh_data_sync', 'nh_campus_updated', 'north_hospital_dept_tariffs_updated', 'storage', 'focus'];
    events.forEach((e) => window.addEventListener(e, reload));
    const tick = window.setInterval(reload, POLL_MS);
    return () => {
      events.forEach((e) => window.removeEventListener(e, reload));
      window.clearInterval(tick);
    };
  }, [reload]);

  return { ...state, reload };
};

/* ---------------- shared rules & helpers ---------------- */

export const norm = (s?: string | null) => (s || '').toLowerCase().replace(/^dr\.?\s*/, '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
export function sameDoctor(a?: string | null, b?: string | null) {
  const x = norm(a);
  const y = norm(b);
  return !!x && !!y && (x === y || x.startsWith(y) || y.startsWith(x));
}

export const ACTIVE = ['WAITING', 'IN_TRIAGE', 'TRIAGED', 'READY_FOR_DOCTOR', 'HOLD', 'EMERGENCY'];
export const isWaiting = (t: SharedQueueToken) => ACTIVE.includes(t.status) && t.callingStatus !== 'CALLING';
export const isWithDoctor = (t: SharedQueueToken) => t.status === 'IN_CONSULTATION';
export const isDone = (t: SharedQueueToken) => t.status === 'COMPLETED';
export const isCancelled = (t: SharedQueueToken) => t.status === 'NO_SHOW' || t.status === 'CANCELLED';
export const feeDue = (t: SharedQueueToken) => !t.feePaid && !isCancelled(t) && (t.totalFee || 0) > 0;

export const STATUS: Record<string, { label: string; tone: 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'dark' }> = {
  WAITING: { label: 'Waiting', tone: 'amber' },
  IN_TRIAGE: { label: 'In triage', tone: 'blue' },
  TRIAGED: { label: 'Triaged', tone: 'blue' },
  READY_FOR_DOCTOR: { label: 'Ready for doctor', tone: 'blue' },
  HOLD: { label: 'On hold', tone: 'gray' },
  EMERGENCY: { label: 'Emergency', tone: 'red' },
  IN_CONSULTATION: { label: 'With doctor', tone: 'green' },
  COMPLETED: { label: 'Checked out', tone: 'gray' },
  NO_SHOW: { label: 'No-show', tone: 'gray' },
  CANCELLED: { label: 'Cancelled', tone: 'gray' },
};
export const statusOf = (t: SharedQueueToken) => (t.callingStatus === 'CALLING' && t.status !== 'COMPLETED' ? { label: 'Being called', tone: 'green' as const } : STATUS[t.status] || { label: t.status, tone: 'gray' as const });

/** When the token was issued: explicit waiting start, else the timestamp inside a desk token id (tok-/apt-<ms>). */
export const issuedAt = (t: SharedQueueToken): Date | null => {
  if (t.waitingStartTime) {
    const d = new Date(t.waitingStartTime);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const m = /(\d{13})/.exec(t.id || '');
  return m ? new Date(Number(m[1])) : null;
};
export const waitMinutes = (t: SharedQueueToken, now: number) => {
  const d = issuedAt(t);
  return d ? Math.max(0, Math.round((now - d.getTime()) / 60000)) : null;
};
/** Front-desk service standard: a patient waiting longer than this is flagged. */
export const LONG_WAIT_MIN = 30;
export const fmtWait = (m: number | null) => (m === null ? '—' : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`);

export const tokenLabel = (n: number) => `#${String(n).padStart(2, '0')}`;
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const fmtDate = (iso?: string) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : '—');
/** Local 'YYYY-MM-DD HH:MM' — the format the campus bed records use. */
export const localStamp = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
export const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export const patientName = (p: SharedPatient) => `${p.firstName} ${p.lastName}`.trim();
export const nextTokenNo = () => {
  const q = patientJourneyService.getQueue();
  return q.length ? Math.max(...q.map((t) => t.token)) + 1 : 1;
};

/** OPD slot grid (15 minutes) for the standard OPD sessions. */
export const SLOTS = [
  ...['09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45', '12:00', '12:15', '12:30', '12:45'],
  ...['14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '15:45', '16:00', '16:15', '16:30', '16:45'],
].map((hm) => {
  const [h, m] = hm.split(':').map(Number);
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
});
export const slotMinutes = (slot: string) => {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(slot || '');
  if (!m) return null;
  return ((Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(m[2]);
};

/** The doctor's leave / unavailable block covering this slot, if any (set from the doctor's desk). */
export const blockFor = (doctor: string, date: string, slot: string) => {
  const m = slotMinutes(slot);
  return patientJourneyService.getDoctorBlocks().find((b) => b.date === date && sameDoctor(b.doctor, doctor) && (b.allDay || (m !== null && (slotMinutes(b.from || '') ?? -1) <= m && m <= (slotMinutes(b.to || '') ?? -1))));
};

/** Next UHID in sequence for this month (UHID-YYYYMM-NNNNN), never colliding with an existing one. */
export const nextUhid = (patients: SharedPatient[]) => {
  const d = new Date();
  const prefix = `UHID-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-`;
  const max = patients.reduce((n, p) => (p.uhid.startsWith(prefix) ? Math.max(n, Number(p.uhid.slice(prefix.length)) || 0) : n), 0);
  return `${prefix}${String(max + 1).padStart(5, '0')}`;
};

export const isDaycareBed = (b: FlatCampusBed) => b.wardId === 'wd-opd-a' || b.wardId === 'wd-opd-b' || /daycare|day care|observation/i.test(b.wardName || '');
export const bedState = (b: FlatCampusBed): 'available' | 'occupied' | 'cleaning' | 'reserved' | 'maintenance' =>
  b.bed.status === 'OCCUPIED' ? 'occupied' : b.bed.status === 'RESERVED' ? 'reserved' : b.bed.status === 'MAINTENANCE' ? 'maintenance' : b.bed.cleanlinessStatus === 'NEEDS_CLEANING' || b.bed.cleanlinessStatus === 'CLEANING_IN_PROGRESS' ? 'cleaning' : 'available';

export const MONO: CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px' };

/** Print a small slip (token, appointment, patient card) in its own window. */
export function printSlip(title: string, lines: Array<[string, string]>, big?: string) {
  const w = window.open('', '_blank', 'width=380,height=560');
  if (!w) return false;
  const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    body{font-family:Inter,Arial,sans-serif;margin:16px;color:#111827}h1{font-size:16px;margin:0}p{margin:2px 0;font-size:12px;color:#4b5563}
    .big{font-size:44px;font-weight:700;text-align:center;margin:12px 0}table{width:100%;font-size:13px;border-collapse:collapse}td{padding:4px 0;border-bottom:1px solid #eee}td:last-child{text-align:right;font-weight:600}
  </style></head><body><h1>North Hospital</h1><p>${esc(title)} · ${esc(new Date().toLocaleString())}</p>${big ? `<div class="big">${esc(big)}</div>` : ''}
  <table>${lines.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
  <script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
  return true;
}

/** Dialogs and cross-section moves the workspace offers to every section view. */
export interface DeskActions {
  notify: (message: string, tone?: 'success' | 'error') => void;
  walkIn: (uhid?: string, doctor?: string) => void;
  book: (preset?: { uhid?: string; doctor?: string; date?: string; followUpId?: string; visitType?: SharedAppointment['visitType'] }) => void;
  reschedule: (a: SharedAppointment) => void;
  register: (query?: string) => void;
  editPatient: (p: SharedPatient) => void;
  collectFee: (t: SharedQueueToken) => void;
  reassign: (t: SharedQueueToken) => void;
  callToken: (t: SharedQueueToken) => void;
  goTo: (tab: string, filter?: string, select?: string) => void;
  /** Reception supervisor (or hospital admin): may cancel tokens issued in error and reopen a closed shift. */
  supervisor: boolean;
  userName: string;
}
