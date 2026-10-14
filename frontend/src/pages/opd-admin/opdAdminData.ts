// OPD Department Admin data. The front-desk data (today's tokens, patients, desk invoices, OPD doctors with fees
// and chambers, appointments) plus the department masters the admin owns: doctor roster, chambers, staff from the
// hospital staff master, shifts, the duty roster (saved assignments only — nothing is generated), the fee tariff,
// department policies, doctor status / leave blocks and the admin audit log. Every count is derived from this hook.
import { useCallback, useEffect, useState } from 'react';
import { patientJourneyService, DoctorBlock, DoctorSession, OpdAdminLogEntry, SharedQueueToken } from '../../services/patientJourneyService';
import { DepartmentDoctor, DepartmentScheduleSlot, DepartmentShift, DepartmentStaffAssignment, DepartmentWorkspace } from '../../types';
import { getDepartmentDoctors, getDepartmentShifts, getDepartmentStaffAssignments, getDepartmentWorkspaceById } from '../department/departmentWorkspaceStore';
import { getHospitalStaff, StaffMember } from '../admin/setup/organization/hospitalStaffStore';
import { useReceptionData, ReceptionData, DeskDoctor, OPD_DEPT, sameDoctor, issuedAt, todayIso } from '../reception/receptionData';

const SCHEDULES_KEY = 'north_hospital_dept_schedules';

export interface OpdAdminData extends ReceptionData {
  deptDoctors: DepartmentDoctor[];
  staff: DepartmentStaffAssignment[];
  staffMaster: StaffMember[];
  shifts: DepartmentShift[];
  roster: DepartmentScheduleSlot[];
  workspace: DepartmentWorkspace;
  sessions: Record<string, DoctorSession>;
  blocks: DoctorBlock[];
  log: OpdAdminLogEntry[];
}

/** Saved duty-roster assignments only (the department store invents a rotation when none are saved). */
const readRoster = (): DepartmentScheduleSlot[] => {
  try {
    const all = JSON.parse(localStorage.getItem(SCHEDULES_KEY) || '[]');
    return Array.isArray(all) ? all.filter((s: DepartmentScheduleSlot) => s.departmentId === OPD_DEPT) : [];
  } catch {
    return [];
  }
};

const readExtra = () => ({
  deptDoctors: getDepartmentDoctors(OPD_DEPT),
  staff: getDepartmentStaffAssignments(OPD_DEPT).filter((s) => s.role !== 'doctor'),
  staffMaster: getHospitalStaff(),
  shifts: getDepartmentShifts(OPD_DEPT),
  roster: readRoster(),
  workspace: getDepartmentWorkspaceById(OPD_DEPT),
  sessions: patientJourneyService.getDoctorSessions(),
  blocks: patientJourneyService.getDoctorBlocks(),
  log: patientJourneyService.getOpdAdminLog(),
});

export const useOpdAdminData = (): OpdAdminData => {
  const base = useReceptionData();
  const [extra, setExtra] = useState(readExtra);
  const { reload: baseReload } = base;
  const reload = useCallback(() => {
    baseReload();
    setExtra(readExtra());
  }, [baseReload]);

  useEffect(() => {
    const onSync = () => setExtra(readExtra());
    const events = ['nh_data_sync', 'storage', 'focus', 'north_hospital_dept_doctors_updated', 'north_hospital_dept_rooms_updated', 'north_hospital_dept_schedules_updated', 'north_hospital_dept_tariffs_updated', 'north_hospital_staff_updated', 'north_hospital_workspaces_updated'];
    events.forEach((e) => window.addEventListener(e, onSync));
    return () => events.forEach((e) => window.removeEventListener(e, onSync));
  }, []);

  return { ...base, reload, ...extra };
};

/* ---------------- roster store helpers ---------------- */

export const removeRosterSlot = (id: string) => {
  try {
    const all: DepartmentScheduleSlot[] = JSON.parse(localStorage.getItem(SCHEDULES_KEY) || '[]');
    const next = all.filter((s) => s.id !== id);
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('north_hospital_dept_schedules_updated', { detail: next }));
  } catch {
    /* nothing to remove */
  }
};

/* ---------------- dates ---------------- */

export const DAY3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const isoDay = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const dowOf = (iso: string) => new Date(`${iso}T00:00:00`).getDay();
export const isTodayTok = (t: SharedQueueToken) => {
  const d = issuedAt(t);
  return !d || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === todayIso();
};
export const inRange = (t: SharedQueueToken, fromIso: string) => {
  const d = issuedAt(t);
  if (!d) return fromIso === todayIso();
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return iso >= fromIso;
};

/* ---------------- doctors ---------------- */

export const recordOf = (data: OpdAdminData, d: DeskDoctor) => data.deptDoctors.find((x) => x.id === d.id || sameDoctor(x.fullName, d.name));
export const deskOf = (data: OpdAdminData, r: DepartmentDoctor) => data.doctors.find((x) => x.id === r.id || sameDoctor(x.name, r.fullName));
export const tokensOf = (data: OpdAdminData, name: string) => data.queue.filter((t) => sameDoctor(t.doctor, name) && isTodayTok(t));

export type DoctorState = { key: 'IN' | 'BUSY' | 'AWAY' | 'LATE' | 'LEAVE' | 'OFF' | 'NOT_TODAY'; label: string; tone: 'green' | 'blue' | 'amber' | 'red' | 'gray' };
/** Today's state of a doctor from the roster record, leave blocks, the chamber-desk status and the live queue. */
export const doctorState = (data: OpdAdminData, name: string): DoctorState => {
  const rec = data.deptDoctors.find((x) => sameDoctor(x.fullName, name));
  const today = todayIso();
  const block = data.blocks.find((b) => b.date === today && b.allDay && sameDoctor(b.doctor, name));
  const s = data.sessions[name];
  const sToday = s && new Date(s.since).toDateString() === new Date().toDateString() ? s : null;
  if (rec?.status === 'ON_LEAVE' || block) return { key: 'LEAVE', label: block ? `Unavailable · ${block.reason}` : 'On leave', tone: 'red' };
  if (rec?.status === 'OFF_DUTY') return { key: 'OFF', label: 'Off duty', tone: 'gray' };
  if (rec && rec.workingDays?.length && !rec.workingDays.includes(DAY3[new Date().getDay()])) return { key: 'NOT_TODAY', label: 'Not an OPD day', tone: 'gray' };
  if (sToday?.status === 'LATE') return { key: 'LATE', label: `Running late${sToday.until ? ` · ${sToday.until}` : ''}`, tone: 'red' };
  if (sToday && sToday.status !== 'IN') return { key: 'AWAY', label: `${sToday.status === 'BREAK' ? 'On a break' : sToday.status === 'ROUNDS' ? 'On rounds' : sToday.status === 'OT' ? 'In OT' : 'Left for the day'}${sToday.until ? ` · ${sToday.until}` : ''}`, tone: 'amber' };
  if (tokensOf(data, name).some((t) => t.status === 'IN_CONSULTATION')) return { key: 'BUSY', label: 'Seeing a patient', tone: 'green' };
  return { key: 'IN', label: 'In clinic', tone: 'blue' };
};

/* ---------------- roster coverage ---------------- */

/** OPD runs on the day shifts; each needs a nurse and a front-desk person. */
export const OPD_SHIFT_TYPES: DepartmentShift['type'][] = ['morning', 'evening', 'general'];
export const ROLE_NEEDS: { role: string; label: string; match: (r: string) => boolean }[] = [
  { role: 'nurse', label: 'Nurse', match: (r) => r === 'nurse' },
  { role: 'receptionist', label: 'Front desk', match: (r) => r === 'receptionist' || r === 'admin' || r === 'supervisor' },
];
export const coverage = (data: OpdAdminData, date: string) => {
  const day = data.roster.filter((s) => s.date === date);
  return data.shifts
    .filter((sh) => OPD_SHIFT_TYPES.includes(sh.type))
    .map((sh) => {
      const on = day.filter((s) => s.shiftName === sh.name);
      const missing = ROLE_NEEDS.filter((n) => !on.some((s) => n.match(s.role)));
      return { shift: sh, on, missing };
    });
};

/* ---------------- audit ---------------- */

export const logChange = (by: string, kind: OpdAdminLogEntry['kind'], subject: string, change: string, before?: string, after?: string) =>
  patientJourneyService.addOpdAdminLog({ id: `oal-${new Date().getTime()}-${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), by, kind, subject, change, before, after });

/* ---------------- actions the views share ---------------- */

export interface OpdAdminActions {
  notify: (msg: string, tone?: 'success' | 'error') => void;
  goTo: (tab: string, filter?: string, select?: string) => void;
  userName: string;
}
