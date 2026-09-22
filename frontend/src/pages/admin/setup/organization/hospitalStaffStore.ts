export interface HospitalShift {
  id: string;
  code: string;
  name: string;
  startTime: string; // "08:00"
  endTime: string;   // "16:00"
  duration: string;  // "8h 00m"
  handoverMinutes: number; // 30 mins
  type: 'clinical' | 'opd' | 'emergency' | 'general';
  description: string;
  applicableDays: string;
  isDefault?: boolean;
}

export type StaffRole = 'doctor' | 'nurse' | 'technician' | 'paramedic' | 'admin' | 'support';
export type StaffStatus = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'RESIGNED';
export type StaffOnboardingStage =
  | 'BASIC_CREATED'
  | 'DEPARTMENT_PENDING'
  | 'CLINICAL_PENDING'
  | 'DOCS_PENDING'
  | 'COMPLETE';

export interface StaffMemberAddress {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface StaffDocuments {
  aadhaarNumber?: string;
  aadhaarVerified?: boolean;
  panNumber?: string;
  medicalRegCertUploaded?: boolean;
  medicalRegistrationDocName?: string;
  educationDocName?: string;
  certificatesCount?: number;
  verified?: boolean;
}

export interface StaffMember {
  id: string;
  employeeCode: string;
  fullName: string;
  role: StaffRole;
  designation: string;

  // Multi-department assignment support
  departmentIds?: string[];
  departmentNames?: string[];
  // Legacy / primary department compatibility
  departmentId?: string;
  departmentName?: string;

  // Department Head (HOD) Assignment
  isDepartmentHead?: boolean;
  hodDepartmentId?: string;
  hodDepartmentName?: string;

  // Multi-shift assignment support
  shiftIds?: string[];
  shiftNames?: string[];
  shiftHoursList?: string[];
  // Legacy / primary shift compatibility
  shiftId: string;
  shiftName: string;
  shiftHours: string;

  // Workstation / Campus Location
  buildingId?: string;
  buildingName?: string;
  floorId?: string;
  floorName?: string;
  wardId?: string;
  wardName?: string;
  roomId?: string;
  roomName?: string;

  email: string;
  phone: string;
  status: StaffStatus;

  // Personal Information
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other';
  bloodGroup?: string;
  address?: StaffMemberAddress | string;
  emergencyContact?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;

  // Professional Information
  qualification?: string;
  experienceYears?: number | string;
  registrationNumber?: string;
  licenseNumber?: string;

  // Doctor Details
  specialization?: string;
  consultationDurationMinutes?: number;
  dailyPatientCapacity?: number;
  consultationFee?: number;

  // Documents
  documents?: StaffDocuments;

  // Onboarding Lifecycle & Completion
  profileCompletion?: number; // 35 to 100
  onboardingStage?: StaffOnboardingStage;

  joiningDate?: string;
}

export interface DepartmentPersonnelStats {
  total: number;
  doctors: number;
  nurses: number;
  techs: number;
  admin: number;
  assignedStaff: StaffMember[];
  hodName?: string;
}

const SHIFTS_STORAGE_KEY = 'north_hospital_master_shifts';
const STAFF_STORAGE_KEY = 'north_hospital_master_staff';
const DEPARTMENTS_STORAGE_KEY = 'north_hospital_departments_master';

export const DEFAULT_HOSPITAL_SHIFTS: HospitalShift[] = [
  {
    id: 'shift-morn',
    code: 'SH-MORN',
    name: 'Morning Shift (OPD & General Wards)',
    startTime: '08:00',
    endTime: '16:00',
    duration: '8h 00m',
    handoverMinutes: 30,
    type: 'opd',
    description: 'Primary ambulatory consultations, elective ward admissions, and procedural care.',
    applicableDays: 'Mon - Sat (Regular)',
    isDefault: true,
  },
  {
    id: 'shift-eve',
    code: 'SH-EVE',
    name: 'Evening Shift (Inpatient & OT Support)',
    startTime: '16:00',
    endTime: '00:00',
    duration: '8h 00m',
    handoverMinutes: 30,
    type: 'clinical',
    description: 'Evening rounds, post-operative recovery monitoring, and inpatient medication rounds.',
    applicableDays: 'All 7 Days',
    isDefault: true,
  },
  {
    id: 'shift-night',
    code: 'SH-NIGHT',
    name: 'Night Duty (Emergency & Critical Care)',
    startTime: '00:00',
    endTime: '08:00',
    duration: '8h 00m',
    handoverMinutes: 30,
    type: 'emergency',
    description: 'Trauma resuscitation, overnight ICU/HDU monitoring, and emergency calls.',
    applicableDays: 'All 7 Days (24x7 Coverage)',
    isDefault: true,
  },
  {
    id: 'shift-gen',
    code: 'SH-GEN',
    name: 'General Day Shift (Administrative & Diagnostics)',
    startTime: '09:00',
    endTime: '17:00',
    duration: '8h 00m',
    handoverMinutes: 15,
    type: 'general',
    description: 'Administrative offices, central diagnostic laboratories, billing, and pharmacy dispensaries.',
    applicableDays: 'Mon - Fri',
    isDefault: true,
  },
  {
    id: 'shift-24x7',
    code: 'SH-24X7',
    name: '24x7 Continuous Emergency Rotational',
    startTime: '00:00',
    endTime: '23:59',
    duration: '24h Continuous',
    handoverMinutes: 30,
    type: 'emergency',
    description: 'Continuous non-stop acute care trauma and critical ICU coverage.',
    applicableDays: 'All 7 Days (365 Days)',
    isDefault: true,
  },
];

export const DEFAULT_HOSPITAL_STAFF: StaffMember[] = [
  {
    id: 'stf-1',
    employeeCode: 'DOC-101',
    fullName: 'Dr. Sarah Jenkins',
    role: 'doctor',
    designation: 'Chief of Outpatient Medicine & Senior Physician',
    departmentIds: ['1', '3', '4'],
    departmentNames: ['Outpatient Department (OPD)', 'Emergency & Trauma (ER)', 'Intensive Critical Care (ICU)'],
    departmentId: '1',
    departmentName: 'Outpatient Department (OPD)',
    isDepartmentHead: true,
    hodDepartmentId: '1',
    hodDepartmentName: 'Outpatient Department (OPD)',
    shiftIds: ['shift-morn', 'shift-eve'],
    shiftNames: ['Morning Shift (OPD & General Wards)', 'Evening Shift (Inpatient & OT Support)'],
    shiftHoursList: ['08:00 - 16:00', '16:00 - 00:00'],
    shiftId: 'shift-morn',
    shiftName: 'Morning Shift (OPD & General Wards)',
    shiftHours: '08:00 - 16:00',
    email: 'sarah.jenkins@northhospital.com',
    phone: '+1 (555) 234-5678',
    qualification: 'MD, FACP (Internal Medicine)',
    status: 'ACTIVE',
    gender: 'Female',
    joiningDate: '2018-03-15',
  },
  {
    id: 'stf-2',
    employeeCode: 'DOC-102',
    fullName: 'Dr. Robert Vance',
    role: 'doctor',
    designation: 'Director of Inpatient Care & Pulmonologist',
    departmentIds: ['2', '4'],
    departmentNames: ['Inpatient Department (IPD)', 'Intensive Critical Care (ICU)'],
    departmentId: '2',
    departmentName: 'Inpatient Department (IPD)',
    isDepartmentHead: true,
    hodDepartmentId: '2',
    hodDepartmentName: 'Inpatient Department (IPD)',
    shiftIds: ['shift-eve', 'shift-night'],
    shiftNames: ['Evening Shift (Inpatient & OT Support)', 'Night Duty (Emergency & Critical Care)'],
    shiftHoursList: ['16:00 - 00:00', '00:00 - 08:00'],
    shiftId: 'shift-eve',
    shiftName: 'Evening Shift (Inpatient & OT Support)',
    shiftHours: '16:00 - 00:00',
    email: 'robert.vance@northhospital.com',
    phone: '+1 (555) 345-6789',
    qualification: 'MD, FCCP (Pulmonary & Critical Care)',
    status: 'ACTIVE',
    gender: 'Male',
    joiningDate: '2016-07-22',
  },
  {
    id: 'stf-3',
    employeeCode: 'DOC-103',
    fullName: 'Dr. Neil Patrick',
    role: 'doctor',
    designation: 'HOD Emergency Medicine & Trauma Resuscitation',
    departmentIds: ['3'],
    departmentNames: ['Emergency & Trauma (ER)'],
    departmentId: '3',
    departmentName: 'Emergency & Trauma (ER)',
    isDepartmentHead: true,
    hodDepartmentId: '3',
    hodDepartmentName: 'Emergency & Trauma (ER)',
    shiftIds: ['shift-night', 'shift-24x7'],
    shiftNames: ['Night Duty (Emergency & Critical Care)', '24x7 Continuous Emergency Rotational'],
    shiftHoursList: ['00:00 - 08:00', '00:00 - 23:59'],
    shiftId: 'shift-night',
    shiftName: 'Night Duty (Emergency & Critical Care)',
    shiftHours: '00:00 - 08:00',
    email: 'neil.patrick@northhospital.com',
    phone: '+1 (555) 456-7890',
    qualification: 'MBBS, FACEM (Emergency Medicine)',
    status: 'ACTIVE',
    gender: 'Male',
    joiningDate: '2019-11-04',
  },
  {
    id: 'stf-4',
    employeeCode: 'DOC-104',
    fullName: 'Dr. Michael Chang',
    role: 'doctor',
    designation: 'Senior Consultant Interventional Cardiologist',
    departmentIds: ['1', '2'],
    departmentNames: ['Outpatient Department (OPD)', 'Inpatient Department (IPD)'],
    departmentId: '1',
    departmentName: 'Outpatient Department (OPD)',
    isDepartmentHead: false,
    shiftIds: ['shift-morn'],
    shiftNames: ['Morning Shift (OPD & General Wards)'],
    shiftHoursList: ['08:00 - 16:00'],
    shiftId: 'shift-morn',
    shiftName: 'Morning Shift (OPD & General Wards)',
    shiftHours: '08:00 - 16:00',
    email: 'michael.chang@northhospital.com',
    phone: '+1 (555) 567-8901',
    qualification: 'MD, DM (Cardiology), FACC',
    status: 'ACTIVE',
    gender: 'Male',
    joiningDate: '2020-01-10',
  },
  {
    id: 'stf-5',
    employeeCode: 'DOC-105',
    fullName: 'Dr. Alisha Patel',
    role: 'doctor',
    designation: 'Consultant Obstetrician & Gynecologist',
    departmentIds: ['1'],
    departmentNames: ['Outpatient Department (OPD)'],
    departmentId: '1',
    departmentName: 'Outpatient Department (OPD)',
    isDepartmentHead: false,
    shiftIds: ['shift-morn'],
    shiftNames: ['Morning Shift (OPD & General Wards)'],
    shiftHoursList: ['08:00 - 16:00'],
    shiftId: 'shift-morn',
    shiftName: 'Morning Shift (OPD & General Wards)',
    shiftHours: '08:00 - 16:00',
    email: 'alisha.patel@northhospital.com',
    phone: '+1 (555) 678-9012',
    qualification: 'MS (OBGYN), DGO, FICOG',
    status: 'ACTIVE',
    gender: 'Female',
    joiningDate: '2021-05-18',
  },
  {
    id: 'stf-6',
    employeeCode: 'NUR-201',
    fullName: 'Nurse Elena Rostova',
    role: 'nurse',
    designation: 'Nurse Superintendent & Inpatient Ward Incharge',
    departmentIds: ['2', '4'],
    departmentNames: ['Inpatient Department (IPD)', 'Intensive Critical Care (ICU)'],
    departmentId: '2',
    departmentName: 'Inpatient Department (IPD)',
    isDepartmentHead: false,
    shiftIds: ['shift-morn', 'shift-eve'],
    shiftNames: ['Morning Shift (OPD & General Wards)', 'Evening Shift (Inpatient & OT Support)'],
    shiftHoursList: ['08:00 - 16:00', '16:00 - 00:00'],
    shiftId: 'shift-morn',
    shiftName: 'Morning Shift (OPD & General Wards)',
    shiftHours: '08:00 - 16:00',
    email: 'elena.rostova@northhospital.com',
    phone: '+1 (555) 789-0123',
    qualification: 'M.Sc. Nursing (Critical Care), RN',
    status: 'ACTIVE',
    gender: 'Female',
    joiningDate: '2017-09-01',
  },
  {
    id: 'stf-7',
    employeeCode: 'NUR-202',
    fullName: 'Nurse David Miller',
    role: 'nurse',
    designation: 'Senior Trauma & Resuscitation Staff Nurse',
    departmentIds: ['3'],
    departmentNames: ['Emergency & Trauma (ER)'],
    departmentId: '3',
    departmentName: 'Emergency & Trauma (ER)',
    isDepartmentHead: false,
    shiftIds: ['shift-night'],
    shiftNames: ['Night Duty (Emergency & Critical Care)'],
    shiftHoursList: ['00:00 - 08:00'],
    shiftId: 'shift-night',
    shiftName: 'Night Duty (Emergency & Critical Care)',
    shiftHours: '00:00 - 08:00',
    email: 'david.miller@northhospital.com',
    phone: '+1 (555) 890-1234',
    qualification: 'B.Sc. Nursing, BLS / ACLS Certified',
    status: 'ACTIVE',
    gender: 'Male',
    joiningDate: '2020-08-14',
  },
  {
    id: 'stf-8',
    employeeCode: 'NUR-203',
    fullName: 'Nurse Priya Sharma',
    role: 'nurse',
    designation: 'Ambulatory OPD Head Nurse',
    departmentIds: ['1'],
    departmentNames: ['Outpatient Department (OPD)'],
    departmentId: '1',
    departmentName: 'Outpatient Department (OPD)',
    isDepartmentHead: false,
    shiftIds: ['shift-morn'],
    shiftNames: ['Morning Shift (OPD & General Wards)'],
    shiftHoursList: ['08:00 - 16:00'],
    shiftId: 'shift-morn',
    shiftName: 'Morning Shift (OPD & General Wards)',
    shiftHours: '08:00 - 16:00',
    email: 'priya.sharma@northhospital.com',
    phone: '+1 (555) 901-2345',
    qualification: 'B.Sc. Nursing, RN',
    status: 'ACTIVE',
    gender: 'Female',
    joiningDate: '2021-02-20',
  },
  {
    id: 'stf-9',
    employeeCode: 'TCH-301',
    fullName: 'Anita Ray',
    role: 'technician',
    designation: 'Senior Diagnostic Pathology & Lab Technologist',
    departmentIds: ['1', '2'],
    departmentNames: ['Outpatient Department (OPD)', 'Inpatient Department (IPD)'],
    departmentId: '1',
    departmentName: 'Outpatient Department (OPD)',
    isDepartmentHead: false,
    shiftIds: ['shift-gen'],
    shiftNames: ['General Day Shift (Administrative & Diagnostics)'],
    shiftHoursList: ['09:00 - 17:00'],
    shiftId: 'shift-gen',
    shiftName: 'General Day Shift (Administrative & Diagnostics)',
    shiftHours: '09:00 - 17:00',
    email: 'anita.ray@northhospital.com',
    phone: '+1 (555) 012-3456',
    qualification: 'B.Sc. MLT, ASCP Certified',
    status: 'ACTIVE',
    gender: 'Female',
    joiningDate: '2019-04-12',
  },
  {
    id: 'stf-10',
    employeeCode: 'ADM-401',
    fullName: 'Marcus Vance',
    role: 'admin',
    designation: 'Central Admissions & Front Desk Head',
    departmentIds: ['1'],
    departmentNames: ['Outpatient Department (OPD)'],
    departmentId: '1',
    departmentName: 'Outpatient Department (OPD)',
    isDepartmentHead: false,
    shiftIds: ['shift-gen'],
    shiftNames: ['General Day Shift (Administrative & Diagnostics)'],
    shiftHoursList: ['09:00 - 17:00'],
    shiftId: 'shift-gen',
    shiftName: 'General Day Shift (Administrative & Diagnostics)',
    shiftHours: '09:00 - 17:00',
    email: 'marcus.vance@northhospital.com',
    phone: '+1 (555) 123-4567',
    qualification: 'MBA (Healthcare Administration)',
    status: 'ACTIVE',
    gender: 'Male',
    joiningDate: '2018-10-01',
  },
];

// Helper: Calculate duration between HH:MM and HH:MM
export function calculateShiftDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return '8h 00m';
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  let startMinutes = (startH || 0) * 60 + (startM || 0);
  let endMinutes = (endH || 0) * 60 + (endM || 0);

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60; // Overnight
  }

  const diffMinutes = endMinutes - startMinutes;
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return `${hours}h ${mins > 0 ? `${mins}m` : '00m'}`;
}

// ----------------- PROFILE COMPLETION CALCULATOR -----------------
export function calculateStaffProfileCompletion(m: Partial<StaffMember>): {
  score: number;
  stage: StaffOnboardingStage;
} {
  let score = 0;

  // 1. Essential Information (Target 35%)
  if (m.fullName?.trim()) score += 6;
  if (m.employeeCode?.trim()) score += 5;
  if (m.phone?.trim()) score += 5;
  if (m.email?.trim()) score += 5;
  if (m.role) score += 4;
  if ((m.departmentIds && m.departmentIds.length > 0) || m.departmentId) score += 4;
  if ((m.shiftIds && m.shiftIds.length > 0) || m.shiftId) score += 3;
  if (m.status) score += 3;

  // 2. Personal Information (Target 20%)
  if (m.dob?.trim()) score += 4;
  if (m.gender) score += 4;
  if (m.bloodGroup?.trim()) score += 4;
  if (m.address) {
    if (typeof m.address === 'string' && m.address.trim()) score += 4;
    else if (typeof m.address === 'object' && (m.address.street || m.address.city)) score += 4;
  }
  if (m.emergencyContactPhone?.trim() || m.emergencyContact?.trim()) score += 4;

  // 3. Professional Information (Target 20%)
  if (m.qualification?.trim()) score += 5;
  if (m.experienceYears !== undefined && m.experienceYears !== '') score += 5;
  if (m.registrationNumber?.trim()) score += 5;
  if (m.licenseNumber?.trim()) score += 5;

  // 4. Doctor Specifics / Workstation (Target 15%)
  if (m.role === 'doctor') {
    if (m.specialization?.trim()) score += 4;
    if (m.consultationDurationMinutes) score += 4;
    if (m.dailyPatientCapacity) score += 3;
    if (m.consultationFee !== undefined && m.consultationFee > 0) score += 4;
  } else {
    if (m.buildingName || m.buildingId) score += 5;
    if (m.floorName || m.floorId) score += 5;
    if (m.roomName || m.roomId || m.wardName) score += 5;
  }

  // 5. Documents (Target 10%)
  if (m.documents?.aadhaarNumber?.trim()) score += 3;
  if (m.documents?.panNumber?.trim()) score += 3;
  if (m.documents?.medicalRegCertUploaded) score += 2;
  if (m.documents?.certificatesCount && m.documents.certificatesCount > 0) score += 2;

  score = Math.min(100, Math.max(0, score));

  let stage: StaffOnboardingStage = 'BASIC_CREATED';
  if (score >= 90) {
    stage = 'COMPLETE';
  } else if (score >= 35) {
    stage = 'DEPARTMENT_PENDING';
  }

  return { score, stage };
}

// ----------------- SHIFTS GETTERS / SETTERS -----------------
export function getHospitalShifts(): HospitalShift[] {
  try {
    const raw = localStorage.getItem(SHIFTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read hospital shifts from localStorage', err);
  }
  return DEFAULT_HOSPITAL_SHIFTS;
}

export function saveHospitalShifts(shifts: HospitalShift[]): void {
  try {
    localStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(shifts));
    window.dispatchEvent(new CustomEvent('north_hospital_shifts_updated', { detail: shifts }));
  } catch (err) {
    console.error('Failed to save hospital shifts to localStorage', err);
  }
}

export function addHospitalShift(shift: HospitalShift): void {
  const current = getHospitalShifts();
  const updated = [...current, shift];
  saveHospitalShifts(updated);
}

export function updateHospitalShift(shift: HospitalShift): void {
  const current = getHospitalShifts();
  const updated = current.map((s) => (s.id === shift.id ? shift : s));
  saveHospitalShifts(updated);
}

export function deleteHospitalShift(shiftId: string): void {
  const current = getHospitalShifts();
  const updated = current.filter((s) => s.id !== shiftId);
  saveHospitalShifts(updated);
}

export function resetDefaultHospitalShifts(): HospitalShift[] {
  saveHospitalShifts(DEFAULT_HOSPITAL_SHIFTS);
  return DEFAULT_HOSPITAL_SHIFTS;
}

// ----------------- TWO-WAY SYNCHRONIZATION WITH DEPARTMENTS -----------------
export function syncStaffToDepartments(staffList: StaffMember[]): void {
  try {
    const raw = localStorage.getItem(DEPARTMENTS_STORAGE_KEY);
    if (!raw) return;
    const departments = JSON.parse(raw);
    if (!Array.isArray(departments)) return;

    const updatedDepartments = departments.map((dept: any) => {
      // Find all staff who belong to this department (either via departmentIds or legacy departmentId/departmentName)
      const matchingStaff = staffList.filter((s) => {
        if (s.departmentIds && s.departmentIds.includes(dept.id)) return true;
        if (s.departmentNames && s.departmentNames.includes(dept.name)) return true;
        if (s.departmentId === dept.id || s.departmentName === dept.name) return true;
        return false;
      });

      // Find if an HOD is explicitly mapped
      const assignedHOD = staffList.find(
        (s) =>
          s.isDepartmentHead &&
          (s.hodDepartmentId === dept.id ||
            s.hodDepartmentName === dept.name ||
            (s.departmentIds && s.departmentIds.includes(dept.id)))
      );

      const docs = matchingStaff.filter((s) => s.role === 'doctor').length;
      const nurses = matchingStaff.filter((s) => s.role === 'nurse').length;
      const techs = matchingStaff.filter((s) => s.role === 'technician' || s.role === 'paramedic').length;
      const admin = matchingStaff.filter((s) => s.role === 'admin' || s.role === 'support').length;

      return {
        ...dept,
        staffCount: matchingStaff.length || dept.staffCount,
        doctorsCount: docs || dept.doctorsCount,
        nursesCount: nurses || dept.nursesCount,
        techsCount: techs || dept.techsCount,
        receptionistsCount: admin || dept.receptionistsCount,
        head: assignedHOD ? assignedHOD.fullName : dept.head,
      };
    });

    localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(updatedDepartments));
    window.dispatchEvent(new CustomEvent('north_hospital_departments_updated', { detail: updatedDepartments }));
  } catch (err) {
    console.error('Failed to synchronize staff to departments', err);
  }
}

// ----------------- STAFF GETTERS / SETTERS -----------------
export function getHospitalStaff(): StaffMember[] {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((m: any) => {
          const comp = calculateStaffProfileCompletion(m);
          return {
            ...m,
            departmentIds: m.departmentIds || (m.departmentId ? [m.departmentId] : []),
            departmentNames: m.departmentNames || (m.departmentName ? [m.departmentName] : []),
            shiftIds: m.shiftIds || (m.shiftId ? [m.shiftId] : []),
            shiftNames: m.shiftNames || (m.shiftName ? [m.shiftName] : []),
            shiftHoursList: m.shiftHoursList || (m.shiftHours ? [m.shiftHours] : []),
            status: m.status === 'INACTIVE' ? 'RESIGNED' : m.status || 'ACTIVE',
            profileCompletion: m.profileCompletion !== undefined ? m.profileCompletion : comp.score,
            onboardingStage: m.onboardingStage || comp.stage,
          };
        });
      }
    }
  } catch (err) {
    console.error('Failed to read hospital staff from localStorage', err);
  }
  return DEFAULT_HOSPITAL_STAFF.map((m) => {
    const comp = calculateStaffProfileCompletion(m);
    return {
      ...m,
      profileCompletion: m.profileCompletion !== undefined ? m.profileCompletion : comp.score,
      onboardingStage: m.onboardingStage || comp.stage,
    };
  });
}

export function saveHospitalStaff(staffList: StaffMember[]): void {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staffList));
    window.dispatchEvent(new CustomEvent('north_hospital_staff_updated', { detail: staffList }));
    syncStaffToDepartments(staffList);
  } catch (err) {
    console.error('Failed to save hospital staff to localStorage', err);
  }
}

export function addHospitalStaff(member: StaffMember): void {
  const current = getHospitalStaff();
  const updated = [member, ...current];
  saveHospitalStaff(updated);
}

export function bulkAddHospitalStaff(newMembers: StaffMember[]): void {
  const current = getHospitalStaff();
  // Filter out any that already exist by employeeCode
  const existingCodes = new Set(current.map((s) => s.employeeCode.toUpperCase()));
  const filteredNew = newMembers.filter((m) => !existingCodes.has(m.employeeCode.toUpperCase()));
  const updated = [...filteredNew, ...current];
  saveHospitalStaff(updated);
}

export function updateHospitalStaff(member: StaffMember): void {
  const current = getHospitalStaff();
  const updated = current.map((s) => (s.id === member.id ? member : s));
  saveHospitalStaff(updated);
}

export function deleteHospitalStaff(staffId: string): void {
  const current = getHospitalStaff();
  const updated = current.filter((s) => s.id !== staffId);
  saveHospitalStaff(updated);
}

export function assignStaffMembersToDepartment(
  staffIds: string[],
  departmentId: string,
  departmentName: string
): void {
  const current = getHospitalStaff();
  const updated = current.map((member) => {
    if (staffIds.includes(member.id)) {
      const currentDeptIds = member.departmentIds || (member.departmentId ? [member.departmentId] : []);
      const currentDeptNames = member.departmentNames || (member.departmentName ? [member.departmentName] : []);
      const newDeptIds = Array.from(new Set([...currentDeptIds, departmentId]));
      const newDeptNames = Array.from(new Set([...currentDeptNames, departmentName]));

      return {
        ...member,
        departmentId: member.departmentId || departmentId,
        departmentName: member.departmentName || departmentName,
        departmentIds: newDeptIds,
        departmentNames: newDeptNames,
      };
    }
    return member;
  });
  saveHospitalStaff(updated);
}

export function unassignStaffFromDepartment(staffId: string, departmentId: string): void {
  const current = getHospitalStaff();
  const updated = current.map((member) => {
    if (member.id === staffId) {
      const currentDeptIds = member.departmentIds || (member.departmentId ? [member.departmentId] : []);
      const newDeptIds = currentDeptIds.filter((id) => id !== departmentId);
      const newPrimaryDeptId = newDeptIds[0] || '';

      return {
        ...member,
        departmentId: newPrimaryDeptId,
        departmentIds: newDeptIds,
      };
    }
    return member;
  });
  saveHospitalStaff(updated);
}

// ----------------- DEPARTMENT PERSONNEL STATS CALCULATION -----------------
export function getDepartmentPersonnelStats(
  deptId: string,
  deptName?: string
): DepartmentPersonnelStats {
  const allStaff = getHospitalStaff();
  const assigned = allStaff.filter((s) => {
    if (s.departmentIds && s.departmentIds.includes(deptId)) return true;
    if (deptName && s.departmentNames && s.departmentNames.includes(deptName)) return true;
    if (s.departmentId === deptId || (deptName && s.departmentName === deptName)) return true;
    return false;
  });

  const doctors = assigned.filter((s) => s.role === 'doctor').length;
  const nurses = assigned.filter((s) => s.role === 'nurse').length;
  const techs = assigned.filter((s) => s.role === 'technician' || s.role === 'paramedic').length;
  const admin = assigned.filter((s) => s.role === 'admin' || s.role === 'support').length;

  const hod = allStaff.find(
    (s) =>
      s.isDepartmentHead &&
      (s.hodDepartmentId === deptId || (deptName && s.hodDepartmentName === deptName))
  );

  return {
    total: assigned.length,
    doctors,
    nurses,
    techs,
    admin,
    assignedStaff: assigned,
    hodName: hod?.fullName,
  };
}
