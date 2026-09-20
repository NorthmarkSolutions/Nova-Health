import {
  DepartmentWorkspace,
  DepartmentDoctor,
  DepartmentRoom,
  DepartmentStaffAssignment,
  DepartmentScheduleSlot,
  DepartmentWorkspaceConfig,
  DepartmentWard,
  DepartmentShift,
  DepartmentQueueToken,
  DepartmentTariffMaster,
  DoctorTariffItem,
  WardTariffItem,
  RoomTariffItem,
  BedCategoryTariffItem,
} from '../../types';
import { getHospitalStaff, StaffMember } from '../admin/setup/organization/hospitalStaffStore';
import { getCampusBuildings } from '../admin/setup/organization/CampusInfrastructureSection';

const WORKSPACES_STORAGE_KEY = 'north_hospital_dept_workspaces';
const DOCTORS_STORAGE_KEY = 'north_hospital_dept_doctors';
const ROOMS_STORAGE_KEY = 'north_hospital_dept_rooms';
const WARDS_STORAGE_KEY = 'north_hospital_dept_wards';
const SHIFTS_STORAGE_KEY = 'north_hospital_dept_shifts';
const STAFF_ASSIGNMENTS_STORAGE_KEY = 'north_hospital_dept_staff_assignments';
const SCHEDULES_STORAGE_KEY = 'north_hospital_dept_schedules';
const QUEUE_STORAGE_KEY = 'north_hospital_dept_queue';
const TARIFF_STORAGE_KEY = 'north_hospital_dept_tariffs_v1';

// ----------------- DEFAULT OPD WORKSPACE CONFIGURATION -----------------
export const DEFAULT_OPD_CONFIG: DepartmentWorkspaceConfig = {
  hasAppointments: true,
  hasQueue: true,
  hasAdmissions: false,
  hasBeds: false,
  hasDoctors: true,
  hasTests: true,
  hasPrescriptions: true,
  hasRooms: true,
  hasSchedules: true,
  hasWalkIn: true,
  hasBilling: true,
  dailyCapacity: 100,
  isWalkInAllowed: true,
  isTokenSystemEnabled: true,
  isOnlineAppointmentEnabled: true,
};

export const DEFAULT_WORKSPACES: DepartmentWorkspace[] = [
  {
    id: 'ws-opd',
    departmentId: '1',
    departmentCode: 'DEPT-OPD',
    departmentName: 'Outpatient Department (OPD)',
    shortName: 'OPD',
    category: 'clinical',
    adminId: 'stf-1',
    adminName: 'Dr. Sarah Jenkins',
    adminEmail: 'opd.admin@northhospital.com',
    operatingHours: '08:00 - 20:00 (Mon-Sat)',
    config: DEFAULT_OPD_CONFIG,
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-09-18T10:00:00.000Z',
  },
  {
    id: 'ws-ipd',
    departmentId: '2',
    departmentCode: 'DEPT-IPD',
    departmentName: 'Inpatient Department (IPD)',
    shortName: 'IPD',
    category: 'clinical',
    adminId: 'stf-2',
    adminName: 'Dr. Robert Vance',
    adminEmail: 'ipd.admin@northhospital.com',
    operatingHours: '24/7 Continuous Care',
    config: {
      hasAppointments: false,
      hasQueue: false,
      hasAdmissions: true,
      hasBeds: true,
      hasDoctors: true,
      hasTests: true,
      hasPrescriptions: true,
      hasRooms: true,
      hasSchedules: true,
      hasWalkIn: false,
      hasBilling: true,
    },
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-09-18T10:00:00.000Z',
  },
  {
    id: 'ws-er',
    departmentId: '3',
    departmentCode: 'DEPT-ER',
    departmentName: 'Emergency & Trauma (ER)',
    shortName: 'ER / Trauma',
    category: 'clinical',
    adminId: 'stf-3',
    adminName: 'Dr. Neil Patrick',
    adminEmail: 'er.admin@northhospital.com',
    operatingHours: '24/7 Acute Emergency',
    config: {
      hasAppointments: false,
      hasQueue: true,
      hasAdmissions: true,
      hasBeds: true,
      hasDoctors: true,
      hasTests: true,
      hasPrescriptions: true,
      hasRooms: true,
      hasSchedules: true,
      hasWalkIn: true,
      hasBilling: true,
    },
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-09-18T10:00:00.000Z',
  },
  {
    id: 'ws-lab',
    departmentId: '9',
    departmentCode: 'DEPT-LAB',
    departmentName: 'Clinical Biochemistry & Lab',
    shortName: 'Central Lab',
    category: 'diagnostic',
    adminName: 'Dr. Amanda Chen',
    adminEmail: 'lab.admin@northhospital.com',
    operatingHours: '24/7 Diagnostic Pathology',
    config: {
      hasAppointments: true,
      hasQueue: true,
      hasAdmissions: false,
      hasBeds: false,
      hasDoctors: false,
      hasTests: true,
      hasPrescriptions: false,
      hasRooms: true,
      hasSchedules: true,
      hasWalkIn: true,
      hasBilling: true,
    },
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-09-18T10:00:00.000Z',
  },
];

// ----------------- DEFAULT OPD DOCTORS -----------------
export const DEFAULT_OPD_DOCTORS: DepartmentDoctor[] = [
  {
    id: 'doc-opd-1',
    departmentId: '1',
    staffId: 'stf-1',
    fullName: 'Dr. Sarah Jenkins',
    employeeCode: 'DOC-101',
    specialization: 'Internal Medicine & Diagnostic Cardiology',
    qualification: 'MD, FACP (Internal Medicine)',
    consultationFee: 75,
    consultationStartTime: '08:30',
    consultationEndTime: '14:30',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    assignedRoomId: 'rm-opd-101',
    assignedRoomName: 'Chamber 101 - Primary Consultation',
    patientCapacityPerDay: 35,
    avgConsultationMinutes: 15,
    isAvailable: true,
    status: 'ACTIVE',
  },
  {
    id: 'doc-opd-2',
    departmentId: '1',
    staffId: 'stf-4',
    fullName: 'Dr. Michael Chang',
    employeeCode: 'DOC-104',
    specialization: 'Interventional Cardiology & Hypertension',
    qualification: 'MD, DM (Cardiology), FACC',
    consultationFee: 90,
    consultationStartTime: '09:00',
    consultationEndTime: '16:00',
    workingDays: ['Mon', 'Wed', 'Fri', 'Sat'],
    assignedRoomId: 'rm-opd-102',
    assignedRoomName: 'Chamber 102 - Cardiology Clinic',
    patientCapacityPerDay: 28,
    avgConsultationMinutes: 20,
    isAvailable: true,
    status: 'ACTIVE',
  },
  {
    id: 'doc-opd-3',
    departmentId: '1',
    staffId: 'stf-5',
    fullName: 'Dr. Alisha Patel',
    employeeCode: 'DOC-105',
    specialization: 'Obstetrics, Gynecology & Women Health',
    qualification: 'MS (OBGYN), DGO, FICOG',
    consultationFee: 70,
    consultationStartTime: '10:00',
    consultationEndTime: '17:00',
    workingDays: ['Tue', 'Thu', 'Fri', 'Sat'],
    assignedRoomId: 'rm-opd-103',
    assignedRoomName: 'Chamber 103 - Women Clinic',
    patientCapacityPerDay: 30,
    avgConsultationMinutes: 15,
    isAvailable: true,
    status: 'ACTIVE',
  },
];

// ----------------- DEFAULT OPD ROOMS -----------------
export const DEFAULT_OPD_ROOMS: DepartmentRoom[] = [
  {
    id: 'rm-opd-101',
    departmentId: '1',
    roomNumber: 'CH-101',
    name: 'Chamber 101 - General & Internal Medicine',
    type: 'consultation',
    floorName: 'Ground Floor (Level 0)',
    buildingName: 'North Central Hospital Tower',
    status: 'AVAILABLE',
    assignedDoctorId: 'doc-opd-1',
    assignedDoctorName: 'Dr. Sarah Jenkins',
    assignedNurseName: 'Nurse Priya Sharma',
    capacity: 4,
    equipment: ['Digital Stethoscope', 'Welch Allyn Vitals Monitor', 'ECG Holter Station', 'Examination Couch'],
  },
  {
    id: 'rm-opd-102',
    departmentId: '1',
    roomNumber: 'CH-102',
    name: 'Chamber 102 - Cardiology & Vascular Clinic',
    type: 'consultation',
    floorName: 'Ground Floor (Level 0)',
    buildingName: 'North Central Hospital Tower',
    status: 'IN_CONSULTATION',
    assignedDoctorId: 'doc-opd-2',
    assignedDoctorName: 'Dr. Michael Chang',
    assignedNurseName: 'Nurse David Miller',
    capacity: 4,
    equipment: ['12-Lead ECG Machine', 'Echocardiography Doppler', 'Defibrillator Unit', 'Treadmill Console'],
  },
  {
    id: 'rm-opd-103',
    departmentId: '1',
    roomNumber: 'CH-103',
    name: 'Chamber 103 - OBGYN & Antenatal Suite',
    type: 'consultation',
    floorName: 'Ground Floor (Level 0)',
    buildingName: 'North Central Hospital Tower',
    status: 'AVAILABLE',
    assignedDoctorId: 'doc-opd-3',
    assignedDoctorName: 'Dr. Alisha Patel',
    assignedNurseName: 'Nurse Elena Rostova',
    capacity: 4,
    equipment: ['Fetal Doppler Heart Rate Monitor', 'Ultrasound Ultrasound Unit', 'Colposcopy Scope'],
  },
  {
    id: 'rm-opd-104',
    departmentId: '1',
    roomNumber: 'TR-104',
    name: 'OPD Treatment & Triage Bay 1',
    type: 'triage',
    floorName: 'Ground Floor (Level 0)',
    buildingName: 'North Central Hospital Tower',
    status: 'AVAILABLE',
    assignedNurseName: 'Nurse Priya Sharma',
    capacity: 6,
    equipment: ['Rapid Vitals Kiosk', 'Nebulization Hub', 'Dressing Tray & Suture Kit', 'Oxygen Manifold Port'],
  },
  {
    id: 'rm-opd-105',
    departmentId: '1',
    roomNumber: 'PR-105',
    name: 'OPD Minor Day Procedure Suite',
    type: 'procedure',
    floorName: 'Ground Floor (Level 0)',
    buildingName: 'North Central Hospital Tower',
    status: 'AVAILABLE',
    assignedDoctorName: 'On-Call Surgeon',
    assignedNurseName: 'Nurse David Miller',
    capacity: 2,
    equipment: ['Electrosurgical Cautery Unit', 'Sterile Minor OT Lamp', 'Portable Suction Pump'],
  },
];

// ----------------- STORAGE ACCESS HELPERS -----------------
export function getDepartmentWorkspaces(): DepartmentWorkspace[] {
  try {
    const raw = localStorage.getItem(WORKSPACES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load department workspaces', err);
  }
  return DEFAULT_WORKSPACES;
}

export function saveDepartmentWorkspaces(workspaces: DepartmentWorkspace[]): void {
  try {
    localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(workspaces));
    window.dispatchEvent(new CustomEvent('north_hospital_workspaces_updated', { detail: workspaces }));
  } catch (err) {
    console.error('Failed to save department workspaces', err);
  }
}

export function getDepartmentWorkspaceById(departmentId: string): DepartmentWorkspace {
  const workspaces = getDepartmentWorkspaces();
  const found = workspaces.find((w) => w.departmentId === departmentId || w.departmentCode.toLowerCase() === departmentId.toLowerCase() || w.shortName.toLowerCase() === departmentId.toLowerCase());
  if (found) return found;

  // Auto-provision if not found
  return autoProvisionWorkspace(departmentId);
}

export function saveDepartmentWorkspace(workspace: DepartmentWorkspace): void {
  const workspaces = getDepartmentWorkspaces();
  const idx = workspaces.findIndex((w) => w.id === workspace.id || w.departmentId === workspace.departmentId);
  let updated: DepartmentWorkspace[];
  if (idx !== -1) {
    updated = workspaces.map((w, i) => (i === idx ? { ...workspace, updatedAt: new Date().toISOString() } : w));
  } else {
    updated = [...workspaces, { ...workspace, updatedAt: new Date().toISOString() }];
  }
  saveDepartmentWorkspaces(updated);
}

export function autoProvisionWorkspace(
  deptIdOrCode: string,
  overrides?: Partial<DepartmentWorkspace>
): DepartmentWorkspace {
  // Check departments master in localStorage
  let deptMeta: any = null;
  try {
    const rawDepts = localStorage.getItem('north_hospital_departments_master');
    if (rawDepts) {
      const depts = JSON.parse(rawDepts);
      deptMeta = depts.find(
        (d: any) =>
          d.id === deptIdOrCode ||
          d.code?.toLowerCase() === deptIdOrCode.toLowerCase() ||
          d.shortName?.toLowerCase() === deptIdOrCode.toLowerCase()
      );
    }
  } catch (e) {
    console.error(e);
  }

  const name = overrides?.departmentName || deptMeta?.name || 'Outpatient Department (OPD)';
  const code = overrides?.departmentCode || deptMeta?.code || 'DEPT-OPD';
  const category = overrides?.category || deptMeta?.category || 'clinical';
  const id = overrides?.departmentId || deptMeta?.id || deptIdOrCode || '1';
  const head = overrides?.adminName || deptMeta?.head || 'Dr. Sarah Jenkins';

  const isClinical = category === 'clinical';
  const isDiagnostic = category === 'diagnostic';

  const newWorkspace: DepartmentWorkspace = {
    id: `ws-${id}`,
    departmentId: id,
    departmentCode: code,
    departmentName: name,
    shortName: overrides?.shortName || deptMeta?.shortName || name.split(' ')[0],
    category,
    adminName: head,
    adminEmail: overrides?.adminEmail || `${code.toLowerCase().replace('dept-', '')}.admin@northhospital.com`,
    operatingHours: overrides?.operatingHours || deptMeta?.hours || '08:00 - 20:00 (Mon-Sat)',
    config: {
      hasAppointments: isClinical || isDiagnostic,
      hasQueue: true,
      hasAdmissions: code.includes('IPD') || code.includes('ICU'),
      hasBeds: code.includes('IPD') || code.includes('ICU') || code.includes('DIAL'),
      hasDoctors: isClinical,
      hasTests: isClinical || isDiagnostic,
      hasPrescriptions: isClinical,
      hasRooms: true,
      hasSchedules: true,
      hasWalkIn: true,
      hasBilling: true,
      ...(overrides?.config || {}),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };

  saveDepartmentWorkspace(newWorkspace);
  return newWorkspace;
}

// ----------------- DOCTOR REPOSITORY -----------------
export function getDepartmentDoctors(departmentId: string): DepartmentDoctor[] {
  try {
    const raw = localStorage.getItem(DOCTORS_STORAGE_KEY);
    if (raw) {
      const parsed: DepartmentDoctor[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const matches = parsed.filter((d) => d.departmentId === departmentId || departmentId === 'all');
        if (matches.length > 0) return matches;
      }
    }
  } catch (err) {
    console.error('Failed to load department doctors', err);
  }

  if (departmentId === '1' || departmentId.toLowerCase() === 'opd') {
    return DEFAULT_OPD_DOCTORS;
  }

  // Fallback: search staff master for doctors assigned to this department
  const allStaff = getHospitalStaff();
  const doctorsInDept = allStaff.filter(
    (s) =>
      s.role === 'doctor' &&
      ((s.departmentIds && s.departmentIds.includes(departmentId)) ||
        s.departmentId === departmentId)
  );

  return doctorsInDept.map((s, idx) => ({
    id: `doc-${departmentId}-${s.id}`,
    departmentId,
    staffId: s.id,
    fullName: s.fullName,
    employeeCode: s.employeeCode,
    specialization: s.designation || 'Attending Physician',
    qualification: s.qualification || 'MBBS, MD',
    consultationFee: 75,
    consultationStartTime: '09:00',
    consultationEndTime: '17:00',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    assignedRoomName: `Chamber ${100 + idx + 1}`,
    patientCapacityPerDay: 30,
    avgConsultationMinutes: 15,
    isAvailable: s.status === 'ACTIVE',
    status: s.status === 'ACTIVE' ? 'ACTIVE' : 'ON_LEAVE',
  }));
}

export function saveDepartmentDoctor(doctor: DepartmentDoctor): void {
  try {
    const current = getAllDepartmentDoctors();
    const idx = current.findIndex((d) => d.id === doctor.id);
    let updated: DepartmentDoctor[];
    if (idx !== -1) {
      updated = current.map((d, i) => (i === idx ? doctor : d));
    } else {
      updated = [doctor, ...current];
    }
    localStorage.setItem(DOCTORS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('north_hospital_dept_doctors_updated', { detail: updated }));
  } catch (err) {
    console.error('Failed to save department doctor', err);
  }
}

export function deleteDepartmentDoctor(doctorId: string): void {
  try {
    const current = getAllDepartmentDoctors();
    const updated = current.filter((d) => d.id !== doctorId);
    localStorage.setItem(DOCTORS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('north_hospital_dept_doctors_updated', { detail: updated }));
  } catch (err) {
    console.error('Failed to delete department doctor', err);
  }
}

function getAllDepartmentDoctors(): DepartmentDoctor[] {
  try {
    const raw = localStorage.getItem(DOCTORS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error(err);
  }
  return DEFAULT_OPD_DOCTORS;
}

// ----------------- ROOMS REPOSITORY -----------------
export function getDepartmentRooms(departmentId: string): DepartmentRoom[] {
  try {
    const raw = localStorage.getItem(ROOMS_STORAGE_KEY);
    if (raw) {
      const parsed: DepartmentRoom[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const matches = parsed.filter((r) => r.departmentId === departmentId || departmentId === 'all');
        if (matches.length > 0) return matches;
      }
    }
  } catch (err) {
    console.error('Failed to load department rooms', err);
  }

  if (departmentId === '1' || departmentId.toLowerCase() === 'opd') {
    return DEFAULT_OPD_ROOMS;
  }

  // Fallback: sync from CampusInfrastructure allocated rooms
  const campus = getCampusBuildings();
  const allocatedRooms: DepartmentRoom[] = [];

  campus.forEach((b) => {
    b.floors.forEach((f) => {
      f.rooms.forEach((r) => {
        if (!r.departmentName || r.departmentName.toLowerCase().includes(departmentId.toLowerCase())) {
          allocatedRooms.push({
            id: r.id,
            departmentId,
            roomNumber: r.roomNumber,
            name: `${r.roomNumber} - ${r.roomType}`,
            type: r.roomType === 'Procedure Room' ? 'procedure' : 'consultation',
            floorName: f.floorNumber,
            buildingName: b.name,
            status: r.status === 'OCCUPIED' ? 'IN_CONSULTATION' : r.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'AVAILABLE',
            capacity: r.capacity || 2,
            assignedDoctorName: r.attendingStaff?.doctorName,
            assignedNurseName: r.attendingStaff?.nurseOrCompounder,
          });
        }
      });
    });
  });

  return allocatedRooms.length > 0 ? allocatedRooms : DEFAULT_OPD_ROOMS;
}

export function saveDepartmentRoom(room: DepartmentRoom): void {
  try {
    const current = getAllDepartmentRooms();
    const idx = current.findIndex((r) => r.id === room.id);
    let updated: DepartmentRoom[];
    if (idx !== -1) {
      updated = current.map((r, i) => (i === idx ? room : r));
    } else {
      updated = [room, ...current];
    }
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('north_hospital_dept_rooms_updated', { detail: updated }));
  } catch (err) {
    console.error('Failed to save department room', err);
  }
}

function getAllDepartmentRooms(): DepartmentRoom[] {
  try {
    const raw = localStorage.getItem(ROOMS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error(err);
  }
  return DEFAULT_OPD_ROOMS;
}

// ----------------- DEPARTMENT STAFF ROSTER & ASSIGNMENTS -----------------
export function getDepartmentStaffAssignments(departmentId: string): DepartmentStaffAssignment[] {
  const allStaff = getHospitalStaff();
  const rooms = getDepartmentRooms(departmentId);

  // Filter staff who belong to this department
  const filtered = allStaff.filter((s) => {
    if (s.departmentIds && s.departmentIds.includes(departmentId)) return true;
    if (s.departmentId === departmentId) return true;
    if (departmentId === '1' && (s.departmentName?.includes('OPD') || s.departmentName?.includes('Outpatient'))) return true;
    return false;
  });

  return filtered.map((s, idx) => {
    const room = rooms[idx % Math.max(1, rooms.length)];
    return {
      id: `dsa-${departmentId}-${s.id}`,
      departmentId,
      staffId: s.id,
      fullName: s.fullName,
      employeeCode: s.employeeCode,
      role: (s.role === 'admin' ? 'receptionist' : s.role) as any,
      designation: s.designation,
      shiftId: s.shiftId || 'shift-morn',
      shiftName: s.shiftName || 'Morning Shift',
      assignedRoomId: room?.id,
      assignedRoomName: room?.name,
      status: s.status,
      phone: s.phone,
      email: s.email,
      gender: s.gender,
      qualification: s.qualification,
      specialization: s.specialization,
      joiningDate: s.joiningDate,
      licenseNumber: s.licenseNumber,
      emergencyContact: s.emergencyContact,
      isDepartmentHead: s.isDepartmentHead,
    };
  });
}

// ----------------- DEPARTMENT SCHEDULES -----------------
export function getDepartmentSchedules(departmentId: string): DepartmentScheduleSlot[] {
  try {
    const raw = localStorage.getItem(SCHEDULES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const matches = parsed.filter((s: DepartmentScheduleSlot) => s.departmentId === departmentId);
        if (matches.length > 0) return matches;
      }
    }
  } catch (err) {
    console.error(err);
  }

  // Generate standard 7-day rotational schedule from staff roster
  const staff = getDepartmentStaffAssignments(departmentId);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();

  const generated: DepartmentScheduleSlot[] = [];
  days.forEach((day, dayIdx) => {
    staff.forEach((s) => {
      const scheduleDate = new Date(today);
      scheduleDate.setDate(today.getDate() + dayIdx);
      generated.push({
        id: `sch-${departmentId}-${s.staffId}-${dayIdx}`,
        departmentId,
        date: scheduleDate.toISOString().slice(0, 10),
        dayOfWeek: day,
        shiftName: s.shiftName,
        staffId: s.staffId,
        staffName: s.fullName,
        role: s.role,
        roomId: s.assignedRoomId,
        roomName: s.assignedRoomName,
      });
    });
  });

  return generated;
}

export function saveDepartmentSchedule(slot: DepartmentScheduleSlot): void {
  try {
    const raw = localStorage.getItem(SCHEDULES_STORAGE_KEY);
    let current: DepartmentScheduleSlot[] = raw ? JSON.parse(raw) : [];
    const idx = current.findIndex((s) => s.id === slot.id);
    if (idx !== -1) {
      current[idx] = slot;
    } else {
      current = [slot, ...current];
    }
    localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('north_hospital_dept_schedules_updated', { detail: current }));
  } catch (err) {
    console.error(err);
  }
}

// ----------------- DEFAULT WARDS & BED OWNERSHIP RULES (Steps 6 & 7) -----------------
export const DEFAULT_OPD_WARDS: DepartmentWard[] = [
  {
    id: 'wrd-opd-1',
    departmentId: '1',
    wardName: 'Ward A (OPD Daycare & Observation)',
    buildingName: 'North Central Hospital Tower',
    floorName: 'Ground Floor (Level 0)',
    headNurseId: 'stf-nurse-1',
    headNurseName: 'Nurse Priya Sharma',
    totalBeds: 20,
    responsibleDoctorId: 'doc-opd-1',
    responsibleDoctorName: 'Dr. Sarah Jenkins',
    responsibleNurseId: 'stf-nurse-1',
    responsibleNurseName: 'Nurse Priya Sharma',
    notes: 'Bed ownership configured: 20 observation beds managed by Dr. Sarah & Nurse Priya',
  },
  {
    id: 'wrd-opd-2',
    departmentId: '1',
    wardName: 'Ward B (Post-Consultation Observation)',
    buildingName: 'North Central Hospital Tower',
    floorName: 'Floor 1',
    headNurseId: 'stf-nurse-2',
    headNurseName: 'Nurse Kavita Verma',
    totalBeds: 10,
    responsibleDoctorId: 'doc-opd-2',
    responsibleDoctorName: 'Dr. Michael Chang',
    responsibleNurseId: 'stf-nurse-2',
    responsibleNurseName: 'Nurse Kavita Verma',
    notes: 'Secondary observation beds for cardiac & triage monitoring',
  },
];

export function getDepartmentWards(departmentId: string): DepartmentWard[] {
  try {
    const raw = localStorage.getItem(WARDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const matches = parsed.filter((w: DepartmentWard) => w.departmentId === departmentId);
        if (matches.length > 0) return matches;
      }
    }
  } catch (err) {
    console.error('Failed to get department wards', err);
  }
  return DEFAULT_OPD_WARDS;
}

export function saveDepartmentWard(ward: DepartmentWard): void {
  try {
    const raw = localStorage.getItem(WARDS_STORAGE_KEY);
    let current: DepartmentWard[] = raw ? JSON.parse(raw) : DEFAULT_OPD_WARDS;
    const idx = current.findIndex((w) => w.id === ward.id);
    if (idx !== -1) {
      current[idx] = ward;
    } else {
      current = [...current, ward];
    }
    localStorage.setItem(WARDS_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('north_hospital_dept_wards_updated', { detail: current }));
  } catch (err) {
    console.error('Failed to save department ward', err);
  }
}

// ----------------- SHIFT MANAGEMENT & MATRIX (Step 4) -----------------
export const DEFAULT_DEPARTMENT_SHIFTS: DepartmentShift[] = [
  {
    id: 'sh-morn',
    departmentId: '1',
    code: 'MORN',
    name: 'Morning Shift',
    startTime: '08:00',
    endTime: '16:00',
    duration: '8 hrs',
    type: 'morning',
  },
  {
    id: 'sh-eve',
    departmentId: '1',
    code: 'EVE',
    name: 'Evening Shift',
    startTime: '16:00',
    endTime: '00:00',
    duration: '8 hrs',
    type: 'evening',
  },
  {
    id: 'sh-night',
    departmentId: '1',
    code: 'NIGHT',
    name: 'Night Shift',
    startTime: '00:00',
    endTime: '08:00',
    duration: '8 hrs',
    type: 'night',
  },
];

export function getDepartmentShifts(departmentId: string): DepartmentShift[] {
  try {
    const raw = localStorage.getItem(SHIFTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const matches = parsed.filter((s: DepartmentShift) => s.departmentId === departmentId);
        if (matches.length > 0) return matches;
      }
    }
  } catch (err) {
    console.error('Failed to get department shifts', err);
  }
  return DEFAULT_DEPARTMENT_SHIFTS;
}

export function saveDepartmentShift(shift: DepartmentShift): void {
  try {
    const raw = localStorage.getItem(SHIFTS_STORAGE_KEY);
    let current: DepartmentShift[] = raw ? JSON.parse(raw) : DEFAULT_DEPARTMENT_SHIFTS;
    const idx = current.findIndex((s) => s.id === shift.id);
    if (idx !== -1) {
      current[idx] = shift;
    } else {
      current = [...current, shift];
    }
    localStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('north_hospital_dept_shifts_updated', { detail: current }));
  } catch (err) {
    console.error('Failed to save department shift', err);
  }
}

// ----------------- LIVE OPD QUEUE & CAPACITY (Steps 9 & 10) -----------------
export const DEFAULT_OPD_QUEUE: DepartmentQueueToken[] = [
  {
    id: 'tok-101',
    departmentId: '1',
    tokenNumber: 'OPD-101',
    patientName: 'Ramesh Sharma',
    uhid: 'UHID-2026-081',
    age: 52,
    gender: 'Male',
    phone: '+91 98765 43210',
    doctorId: 'doc-opd-1',
    doctorName: 'Dr. Sarah Jenkins',
    roomId: 'rm-opd-101',
    roomName: 'Chamber 101 - General & Internal Medicine',
    type: 'WALK_IN',
    status: 'WAITING',
    createdAt: '2026-09-20T08:15:00.000Z',
    chiefComplaint: 'Chest tightness, elevated BP',
    vitals: 'BP 145/95, Pulse 88, SpO2 98%',
  },
  {
    id: 'tok-102',
    departmentId: '1',
    tokenNumber: 'OPD-102',
    patientName: 'Sunita Devi',
    uhid: 'UHID-2026-082',
    age: 38,
    gender: 'Female',
    phone: '+91 98123 45678',
    doctorId: 'doc-opd-1',
    doctorName: 'Dr. Sarah Jenkins',
    roomId: 'rm-opd-101',
    roomName: 'Chamber 101 - General & Internal Medicine',
    type: 'ONLINE_APPOINTMENT',
    status: 'IN_CONSULTATION',
    createdAt: '2026-09-20T08:20:00.000Z',
    chiefComplaint: 'Follow-up for chronic hypertension',
    vitals: 'BP 130/84, Pulse 76, SpO2 99%',
  },
  {
    id: 'tok-103',
    departmentId: '1',
    tokenNumber: 'OPD-103',
    patientName: 'Vikram Mehta',
    uhid: 'UHID-2026-083',
    age: 44,
    gender: 'Male',
    phone: '+91 97234 56789',
    doctorId: 'doc-opd-2',
    doctorName: 'Dr. Michael Chang',
    roomId: 'rm-opd-102',
    roomName: 'Chamber 102 - Cardiology & Vascular Clinic',
    type: 'WALK_IN',
    status: 'WAITING',
    createdAt: '2026-09-20T08:30:00.000Z',
    chiefComplaint: 'Routine cardiac evaluation',
    vitals: 'BP 125/80, Pulse 72, SpO2 99%',
  },
  {
    id: 'tok-104',
    departmentId: '1',
    tokenNumber: 'OPD-104',
    patientName: 'Meenakshi Iyer',
    uhid: 'UHID-2026-084',
    age: 29,
    gender: 'Female',
    phone: '+91 96345 67890',
    doctorId: 'doc-opd-3',
    doctorName: 'Dr. Alisha Patel',
    roomId: 'rm-opd-103',
    roomName: 'Chamber 103 - Women Health Suite',
    type: 'ONLINE_APPOINTMENT',
    status: 'COMPLETED',
    createdAt: '2026-09-20T08:05:00.000Z',
    chiefComplaint: 'Antenatal wellness check',
    vitals: 'BP 118/74, Pulse 78, SpO2 99%',
  },
];

export function getDepartmentQueue(departmentId: string): DepartmentQueueToken[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const matches = parsed.filter((t: DepartmentQueueToken) => t.departmentId === departmentId);
        if (matches.length > 0) return matches;
      }
    }
  } catch (err) {
    console.error('Failed to get department queue', err);
  }
  return DEFAULT_OPD_QUEUE;
}

export function issueDepartmentQueueToken(token: DepartmentQueueToken): void {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    let current: DepartmentQueueToken[] = raw ? JSON.parse(raw) : DEFAULT_OPD_QUEUE;
    current = [token, ...current];
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('north_hospital_dept_queue_updated', { detail: current }));
  } catch (err) {
    console.error('Failed to issue department queue token', err);
  }
}

export function updateQueueTokenStatus(
  tokenId: string,
  status: 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED'
): void {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    let current: DepartmentQueueToken[] = raw ? JSON.parse(raw) : DEFAULT_OPD_QUEUE;
    current = current.map((t) => (t.id === tokenId ? { ...t, status } : t));
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('north_hospital_dept_queue_updated', { detail: current }));
  } catch (err) {
    console.error('Failed to update queue token status', err);
  }
}

// ----------------- SETUP VERIFICATION (Step 1) -----------------
export function verifyDepartmentSetup(departmentId: string, adminName: string): DepartmentWorkspace {
  const ws = getDepartmentWorkspaceById(departmentId);
  const updated: DepartmentWorkspace = {
    ...ws,
    setupVerified: true,
    setupVerifiedAt: new Date().toISOString(),
    setupVerifiedBy: adminName,
    updatedAt: new Date().toISOString(),
  };
  saveDepartmentWorkspace(updated);
  return updated;
}

// ----------------- DEPARTMENT TARIFF & PRICING MASTER -----------------

export function getDepartmentTariffMaster(departmentId: string): DepartmentTariffMaster {
  const doctors = getDepartmentDoctors(departmentId);
  const wards = getDepartmentWards(departmentId);
  const rooms = getDepartmentRooms(departmentId);

  try {
    const raw = localStorage.getItem(TARIFF_STORAGE_KEY);
    if (raw) {
      const parsedAll = JSON.parse(raw);
      if (parsedAll && parsedAll[departmentId]) {
        const stored: DepartmentTariffMaster = parsedAll[departmentId];
        // Ensure all currently active doctors exist in doctorTariffs
        const doctorTariffs = [...stored.doctorTariffs];
        doctors.forEach((doc) => {
          const exists = doctorTariffs.find((dt) => dt.doctorId === doc.id || dt.staffId === doc.staffId);
          if (!exists) {
            doctorTariffs.push({
              doctorId: doc.id,
              staffId: doc.staffId,
              doctorName: doc.fullName,
              employeeCode: doc.employeeCode,
              designation: doc.qualification || 'Consultant',
              specialization: doc.specialization,
              standardFee: doc.consultationFee || 75,
              followUpFee: Math.round((doc.consultationFee || 75) * 0.6),
              emergencyFee: Math.round((doc.consultationFee || 75) * 1.5),
              lastUpdated: new Date().toISOString(),
            });
          }
        });

        // Ensure all wards exist
        const wardTariffs = [...stored.wardTariffs];
        wards.forEach((w) => {
          const exists = wardTariffs.find((wt) => wt.wardId === w.id);
          if (!exists) {
            wardTariffs.push({
              wardId: w.id,
              wardName: w.wardName,
              totalBeds: w.totalBeds,
              dailyRate: w.dailyRate || 120,
              hourlyRate: w.hourlyRate || 20,
              nursingChargePerDay: w.nursingChargePerDay || 35,
            });
          }
        });

        // Ensure all rooms exist
        const roomTariffs = [...stored.roomTariffs];
        rooms.forEach((r) => {
          const exists = roomTariffs.find((rt) => rt.roomId === r.id);
          if (!exists) {
            roomTariffs.push({
              roomId: r.id,
              roomNumber: r.roomNumber,
              roomName: r.name,
              type: r.type,
              facilityFee: r.facilityFee || 15,
              hourlyProcedureRate: r.hourlyProcedureRate || 60,
            });
          }
        });

        return {
          ...stored,
          doctorTariffs,
          wardTariffs,
          roomTariffs,
        };
      }
    }
  } catch (err) {
    console.error('Failed to get department tariffs', err);
  }

  // Generate initial default tariff master
  const initialDoctorTariffs: DoctorTariffItem[] = doctors.map((doc) => ({
    doctorId: doc.id,
    staffId: doc.staffId,
    doctorName: doc.fullName,
    employeeCode: doc.employeeCode,
    designation: doc.qualification || 'Consultant',
    specialization: doc.specialization,
    standardFee: doc.consultationFee || 75,
    followUpFee: Math.round((doc.consultationFee || 75) * 0.6),
    emergencyFee: Math.round((doc.consultationFee || 75) * 1.5),
    lastUpdated: new Date().toISOString(),
  }));

  const initialWardTariffs: WardTariffItem[] = wards.map((w) => ({
    wardId: w.id,
    wardName: w.wardName,
    totalBeds: w.totalBeds,
    dailyRate: w.dailyRate || (w.wardName.includes('A') ? 120 : 100),
    hourlyRate: w.hourlyRate || 20,
    nursingChargePerDay: w.nursingChargePerDay || 35,
  }));

  const initialRoomTariffs: RoomTariffItem[] = rooms.map((r) => ({
    roomId: r.id,
    roomNumber: r.roomNumber,
    roomName: r.name,
    type: r.type,
    facilityFee: r.facilityFee || 15,
    hourlyProcedureRate: r.hourlyProcedureRate || 60,
  }));

  const initialBedTariffs: BedCategoryTariffItem[] = [
    {
      id: 'bed-cat-daycare',
      categoryName: 'OPD Daycare Observation Bed',
      dailyRate: 120,
      hourlyRate: 20,
      description: 'Observation & IV administration bed for outpatient daycare procedures',
    },
    {
      id: 'bed-cat-cardiac',
      categoryName: 'Cardiac Step-Down Observation Bed',
      dailyRate: 220,
      hourlyRate: 35,
      description: 'Telemetry monitored bed with continuous vitals display',
    },
    {
      id: 'bed-cat-general',
      categoryName: 'General Clinical Holding Bed',
      dailyRate: 90,
      hourlyRate: 15,
      description: 'Holding bed prior to discharge or inter-department ward transfer',
    },
  ];

  const defaultTariff: DepartmentTariffMaster = {
    departmentId,
    currency: 'USD',
    doctorTariffs: initialDoctorTariffs,
    wardTariffs: initialWardTariffs,
    roomTariffs: initialRoomTariffs,
    bedCategoryTariffs: initialBedTariffs,
    intakeRegistrationFee: 15,
    triageVitalsFee: 10,
    updatedAt: new Date().toISOString(),
  };

  saveDepartmentTariffMaster(defaultTariff);
  return defaultTariff;
}

export function saveDepartmentTariffMaster(tariff: DepartmentTariffMaster): void {
  try {
    const raw = localStorage.getItem(TARIFF_STORAGE_KEY);
    const current = raw ? JSON.parse(raw) : {};
    current[tariff.departmentId] = {
      ...tariff,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(TARIFF_STORAGE_KEY, JSON.stringify(current));

    // Synchronize doctor consultationFee back to DepartmentDoctor records
    const doctors = getDepartmentDoctors(tariff.departmentId);
    let doctorsChanged = false;
    tariff.doctorTariffs.forEach((dt) => {
      const doc = doctors.find((d) => d.id === dt.doctorId || d.staffId === dt.staffId);
      if (doc && doc.consultationFee !== dt.standardFee) {
        doc.consultationFee = dt.standardFee;
        doctorsChanged = true;
      }
    });
    if (doctorsChanged) {
      doctors.forEach((d) => saveDepartmentDoctor(d));
    }

    // Synchronize ward daily rates back to DepartmentWard records
    const wards = getDepartmentWards(tariff.departmentId);
    let wardsChanged = false;
    tariff.wardTariffs.forEach((wt) => {
      const ward = wards.find((w) => w.id === wt.wardId);
      if (ward) {
        ward.dailyRate = wt.dailyRate;
        ward.hourlyRate = wt.hourlyRate;
        ward.nursingChargePerDay = wt.nursingChargePerDay;
        wardsChanged = true;
      }
    });
    if (wardsChanged) {
      localStorage.setItem(WARDS_STORAGE_KEY, JSON.stringify(wards));
    }

    // Synchronize room facility fees back to DepartmentRoom records
    const rooms = getDepartmentRooms(tariff.departmentId);
    let roomsChanged = false;
    tariff.roomTariffs.forEach((rt) => {
      const room = rooms.find((r) => r.id === rt.roomId);
      if (room) {
        room.facilityFee = rt.facilityFee;
        room.hourlyProcedureRate = rt.hourlyProcedureRate;
        roomsChanged = true;
      }
    });
    if (roomsChanged) {
      rooms.forEach((r) => saveDepartmentRoom(r));
    }

    window.dispatchEvent(
      new CustomEvent('north_hospital_dept_tariffs_updated', {
        detail: current[tariff.departmentId],
      })
    );
  } catch (err) {
    console.error('Failed to save department tariffs', err);
  }
}

export function updateDoctorConsultationFee(
  departmentId: string,
  doctorId: string,
  standardFee: number,
  followUpFee?: number,
  emergencyFee?: number
): void {
  const master = getDepartmentTariffMaster(departmentId);
  const updatedDoctors = master.doctorTariffs.map((doc) => {
    if (doc.doctorId === doctorId || doc.staffId === doctorId) {
      return {
        ...doc,
        standardFee,
        followUpFee: followUpFee !== undefined ? followUpFee : Math.round(standardFee * 0.6),
        emergencyFee: emergencyFee !== undefined ? emergencyFee : Math.round(standardFee * 1.5),
        lastUpdated: new Date().toISOString(),
      };
    }
    return doc;
  });
  saveDepartmentTariffMaster({
    ...master,
    doctorTariffs: updatedDoctors,
  });
}
