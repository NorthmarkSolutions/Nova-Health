import { RoleType } from '../../types';

export interface HospitalFacility {
  id: string;
  code: string;
  name: string;
  shortName: string;
  campusName: string;
  type: string;
  city: string;
  badge: string;
  tagline: string;
}

export type StaffCadre =
  | 'doctor'
  | 'nurse'
  | 'assistant'
  | 'receptionist'
  | 'technician'
  | 'admin';

export interface CadreMeta {
  key: StaffCadre;
  label: string;
  pluralLabel: string;
  iconKey: string;
  badgeColor: string;
}

export const CADRE_METADATA: Record<StaffCadre, CadreMeta> = {
  doctor: {
    key: 'doctor',
    label: 'Doctor / Consultant',
    pluralLabel: 'Doctors',
    iconKey: 'Stethoscope',
    badgeColor: '#0284c7',
  },
  nurse: {
    key: 'nurse',
    label: 'Staff Nurse',
    pluralLabel: 'Nurses',
    iconKey: 'Activity',
    badgeColor: '#10b981',
  },
  assistant: {
    key: 'assistant',
    label: 'Doctor Clinical Assistant',
    pluralLabel: 'Assistants',
    iconKey: 'UserCheck',
    badgeColor: '#f59e0b',
  },
  receptionist: {
    key: 'receptionist',
    label: 'Front Desk / Intake',
    pluralLabel: 'Reception',
    iconKey: 'UserPlus',
    badgeColor: '#0d9488',
  },
  technician: {
    key: 'technician',
    label: 'Diagnostic Tech / Pharmacist',
    pluralLabel: 'Techs & Rx',
    iconKey: 'FlaskConical',
    badgeColor: '#8b5cf6',
  },
  admin: {
    key: 'admin',
    label: 'Department Administrator',
    pluralLabel: 'Administration',
    iconKey: 'ShieldCheck',
    badgeColor: '#059669',
  },
};

export interface DemoStaffAccount {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
  role: RoleType;
  cadre: StaffCadre;
  email: string;
  targetRoute: string;
  badge: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  avatarInitials: string;
}

export interface DepartmentNode {
  id: string;
  code: string;
  name: string;
  shortName: string;
  category: 'admin' | 'clinical' | 'emergency' | 'diagnostic' | 'support';
  iconKey: string;
  accentColor: string;
  bgLight: string;
  borderLight: string;
  badge: string;
  description: string;
  operatingHours: string;
  defaultRole: RoleType;
  defaultRoute: string;
  demoAccounts: DemoStaffAccount[];
}

export const HOSPITAL_FACILITIES: HospitalFacility[] = [
  {
    id: 'hosp-north-main',
    code: 'HOSP-NC-01',
    name: 'North Central Memorial Hospital',
    shortName: 'North Central Hospital',
    campusName: 'Main Campus (Central Tower & Pavilions)',
    type: 'Tertiary Care Teaching Hospital',
    city: 'Metro Medical District',
    badge: 'Primary Campus',
    tagline: '500+ Beds • 24/7 Level 1 Trauma Center',
  },
  {
    id: 'hosp-north-cardio',
    code: 'HOSP-NC-02',
    name: 'North Heart & Vascular Specialty Pavilion',
    shortName: 'North Heart Center',
    campusName: 'Cardiovascular Surgery Pavilion',
    type: 'Specialized Cardiac Institute',
    city: 'South Medical Quad',
    badge: 'Cardiac Specialty',
    tagline: 'CCU • Cath Labs • Advanced Arrhythmia Suite',
  },
  {
    id: 'hosp-north-ambulatory',
    code: 'HOSP-NC-03',
    name: 'Northmark Ambulatory & Day Surgery Care',
    shortName: 'Northmark Ambulatory',
    campusName: 'West Gateway Plaza',
    type: 'Outpatient & Day Surgery Block',
    city: 'West Suburbs Hub',
    badge: 'Ambulatory Care',
    tagline: 'Rapid OPD • Minor Surgeries • High-Speed Lab',
  },
];

export const DEPARTMENT_LOGIN_NODES: DepartmentNode[] = [
  {
    id: 'dept-admin',
    code: 'ADMIN',
    name: 'Hospital Admin & Executive',
    shortName: 'Hospital Admin',
    category: 'admin',
    iconKey: 'ShieldCheck',
    accentColor: '#059669',
    bgLight: 'rgba(5, 150, 105, 0.08)',
    borderLight: 'rgba(5, 150, 105, 0.25)',
    badge: 'Executive',
    description: 'Hospital governance, master setups, buildings & staff directory',
    operatingHours: '08:00 - 18:00 (Corporate)',
    defaultRole: RoleType.HOSPITAL_ADMIN,
    defaultRoute: '/admin',
    demoAccounts: [
      {
        id: 'demo-adm-01',
        employeeId: 'EMP-ADM-001',
        name: 'Dr. Harsh Vardhan',
        designation: 'Hospital Director & Medical Administrator',
        role: RoleType.HOSPITAL_ADMIN,
        cadre: 'admin',
        email: 'admin@northhospital.com',
        targetRoute: '/admin',
        badge: 'Director',
        departmentId: 'dept-admin',
        departmentCode: 'ADMIN',
        departmentName: 'Hospital Admin & Executive',
        avatarInitials: 'HV',
      },
      {
        id: 'demo-adm-02',
        employeeId: 'EMP-ADM-002',
        name: 'Elena Rostova',
        designation: 'Enterprise Super Admin & Audit Lead',
        role: RoleType.SUPER_ADMIN,
        cadre: 'admin',
        email: 'admin@northhospital.com',
        targetRoute: '/admin',
        badge: 'Super Admin',
        departmentId: 'dept-admin',
        departmentCode: 'ADMIN',
        departmentName: 'Hospital Admin & Executive',
        avatarInitials: 'ER',
      },
    ],
  },
  {
    id: 'dept-opd',
    code: 'OPD',
    name: 'Outpatient Department (OPD)',
    shortName: 'OPD Clinic',
    category: 'clinical',
    iconKey: 'Stethoscope',
    accentColor: '#0284c7',
    bgLight: 'rgba(2, 132, 199, 0.08)',
    borderLight: 'rgba(2, 132, 199, 0.25)',
    badge: 'Clinical OPD',
    description: 'Consultations, SOAP clinical notes, token queues & e-prescriptions',
    operatingHours: '08:00 - 20:00 (Mon - Sat)',
    defaultRole: RoleType.DOCTOR,
    defaultRoute: '/doctor',
    demoAccounts: [
      {
        id: 'demo-opd-doc',
        employeeId: 'EMP-DOC-101',
        name: 'Dr. Sarah Jenkins',
        designation: 'Attending Physician (Chamber 101)',
        role: RoleType.DOCTOR,
        cadre: 'doctor',
        email: 'doctor@northhospital.com',
        targetRoute: '/doctor',
        badge: 'Physician',
        departmentId: 'dept-opd',
        departmentCode: 'OPD',
        departmentName: 'Outpatient Department (OPD)',
        avatarInitials: 'SJ',
      },
      {
        id: 'demo-opd-nur',
        employeeId: 'EMP-NUR-001',
        name: 'Nurse Priya Sharma',
        designation: 'Pre-Consultation Triage Staff Nurse',
        role: RoleType.NURSE,
        cadre: 'nurse',
        email: 'nurse@northhospital.com',
        targetRoute: '/nurse?tab=triage-queue',
        badge: 'OPD Triage',
        departmentId: 'dept-opd',
        departmentCode: 'OPD',
        departmentName: 'Outpatient Department (OPD)',
        avatarInitials: 'PS',
      },
      {
        id: 'demo-opd-ast',
        employeeId: 'EMP-AST-204',
        name: 'Nurse Dev Sharma',
        designation: 'Doctor Clinical Assistant (Chamber Desk)',
        role: RoleType.DOCTOR_ASSISTANT,
        cadre: 'assistant',
        email: 'assistant@northhospital.com',
        targetRoute: '/assistant',
        badge: 'Chamber Desk',
        departmentId: 'dept-opd',
        departmentCode: 'OPD',
        departmentName: 'Outpatient Department (OPD)',
        avatarInitials: 'DS',
      },
      {
        id: 'demo-opd-adm',
        employeeId: 'EMP-OPD-ADM',
        name: 'Dr. Sarah Jenkins',
        designation: 'OPD Department Head & Admin',
        role: RoleType.DEPARTMENT_ADMIN,
        cadre: 'admin',
        email: 'opd.admin@northhospital.com',
        targetRoute: '/department/opd',
        badge: 'OPD Admin',
        departmentId: 'dept-opd',
        departmentCode: 'OPD',
        departmentName: 'Outpatient Department (OPD)',
        avatarInitials: 'SJ',
      },
    ],
  },
  {
    id: 'dept-reception',
    code: 'RECEPTION',
    name: 'Front Desk & Reception',
    shortName: 'Reception',
    category: 'support',
    iconKey: 'UserPlus',
    accentColor: '#0d9488',
    bgLight: 'rgba(13, 148, 136, 0.08)',
    borderLight: 'rgba(13, 148, 136, 0.25)',
    badge: 'Front Desk',
    description: 'Patient check-in, token generation, demographic registration & scheduling',
    operatingHours: '24/7 Front Reception',
    defaultRole: RoleType.RECEPTIONIST,
    defaultRoute: '/reception',
    demoAccounts: [
      {
        id: 'demo-rec-01',
        employeeId: 'EMP-REC-001',
        name: 'Rachel Adams',
        designation: 'Lead Receptionist & Patient Intake',
        role: RoleType.RECEPTIONIST,
        cadre: 'receptionist',
        email: 'reception@northhospital.com',
        targetRoute: '/reception',
        badge: 'Front Desk',
        departmentId: 'dept-reception',
        departmentCode: 'RECEPTION',
        departmentName: 'Front Desk & Reception',
        avatarInitials: 'RA',
      },
      {
        id: 'demo-rec-sup',
        employeeId: 'EMP-REC-SUP',
        name: 'Marcus Brody',
        designation: 'Front Office Operations Supervisor',
        role: RoleType.RECEPTION_SUPERVISOR,
        cadre: 'receptionist',
        email: 'reception@northhospital.com',
        targetRoute: '/reception',
        badge: 'Supervisor',
        departmentId: 'dept-reception',
        departmentCode: 'RECEPTION',
        departmentName: 'Front Desk & Reception',
        avatarInitials: 'MB',
      },
    ],
  },
  {
    id: 'dept-ipd',
    code: 'IPD',
    name: 'Inpatient Department (IPD)',
    shortName: 'Inpatient Care',
    category: 'clinical',
    iconKey: 'BedDouble',
    accentColor: '#6366f1',
    bgLight: 'rgba(99, 102, 241, 0.08)',
    borderLight: 'rgba(99, 102, 241, 0.25)',
    badge: 'Wards & Beds',
    description: 'Ward bed assignments, admission management, MAR charting & discharge',
    operatingHours: '24/7 Inpatient Wards',
    defaultRole: RoleType.WARD_MANAGER,
    defaultRoute: '/ipd',
    demoAccounts: [
      {
        id: 'demo-ipd-doc',
        employeeId: 'EMP-IPD-001',
        name: 'Dr. Robert Vance',
        designation: 'Inpatient Medical Director & Ward Head',
        role: RoleType.WARD_MANAGER,
        cadre: 'doctor',
        email: 'ipd@northhospital.com',
        targetRoute: '/ipd',
        badge: 'Ward Head',
        departmentId: 'dept-ipd',
        departmentCode: 'IPD',
        departmentName: 'Inpatient Department (IPD)',
        avatarInitials: 'RV',
      },
      {
        id: 'demo-ipd-nur',
        employeeId: 'EMP-NUR-IPD',
        name: 'Nurse Kavita Verma',
        designation: 'Senior Ward Staff Nurse (Floor 1)',
        role: RoleType.NURSE,
        cadre: 'nurse',
        email: 'nurse@northhospital.com',
        targetRoute: '/nurse',
        badge: 'Ward Nurse',
        departmentId: 'dept-ipd',
        departmentCode: 'IPD',
        departmentName: 'Inpatient Department (IPD)',
        avatarInitials: 'KV',
      },
    ],
  },
  {
    id: 'dept-emergency',
    code: 'EMERGENCY',
    name: 'Emergency & Trauma (ER)',
    shortName: 'ER / Trauma',
    category: 'emergency',
    iconKey: 'Activity',
    accentColor: '#e11d48',
    bgLight: 'rgba(225, 29, 72, 0.08)',
    borderLight: 'rgba(225, 29, 72, 0.25)',
    badge: '24/7 Code Red',
    description: 'Acute stabilization, red triage bays, ambulance intake & crash carts',
    operatingHours: '24/7 Immediate Response',
    defaultRole: RoleType.DEPARTMENT_ADMIN,
    defaultRoute: '/department/3',
    demoAccounts: [
      {
        id: 'demo-er-doc',
        employeeId: 'EMP-ER-001',
        name: 'Dr. Neil Patrick',
        designation: 'Emergency Department Head & Chief Medical Officer',
        role: RoleType.DEPARTMENT_ADMIN,
        cadre: 'doctor',
        email: 'er.admin@northhospital.com',
        targetRoute: '/department/3',
        badge: 'ER Head',
        departmentId: 'dept-emergency',
        departmentCode: 'EMERGENCY',
        departmentName: 'Emergency & Trauma (ER)',
        avatarInitials: 'NP',
      },
      {
        id: 'demo-er-nur',
        employeeId: 'EMP-ER-NUR',
        name: 'Nurse Lisa Wong',
        designation: 'Emergency Trauma Triage Nurse',
        role: RoleType.NURSE,
        cadre: 'nurse',
        email: 'nurse@northhospital.com',
        targetRoute: '/nurse?tab=triage-queue',
        badge: 'Trauma Nurse',
        departmentId: 'dept-emergency',
        departmentCode: 'EMERGENCY',
        departmentName: 'Emergency & Trauma (ER)',
        avatarInitials: 'LW',
      },
    ],
  },
  {
    id: 'dept-ot',
    code: 'OT',
    name: 'Operation Theatre (OT Suite)',
    shortName: 'Surgical OT',
    category: 'clinical',
    iconKey: 'Scissors',
    accentColor: '#d97706',
    bgLight: 'rgba(217, 119, 6, 0.08)',
    borderLight: 'rgba(217, 119, 6, 0.25)',
    badge: 'Surgeries',
    description: 'Surgical schedule, WHO surgical safety checklists & PACU recovery',
    operatingHours: '24/7 Elective & Emergency OT',
    defaultRole: RoleType.SURGEON,
    defaultRoute: '/ot',
    demoAccounts: [
      {
        id: 'demo-ot-surg',
        employeeId: 'EMP-SURG-01',
        name: 'Dr. Michael Roberts',
        designation: 'Chief Consultant Surgeon (OT Suite A)',
        role: RoleType.SURGEON,
        cadre: 'doctor',
        email: 'surgeon@northhospital.com',
        targetRoute: '/ot',
        badge: 'Surgeon',
        departmentId: 'dept-ot',
        departmentCode: 'OT',
        departmentName: 'Operation Theatre (OT Suite)',
        avatarInitials: 'MR',
      },
      {
        id: 'demo-ot-anes',
        employeeId: 'EMP-ANES-01',
        name: 'Dr. Frank Chen',
        designation: 'Senior Consultant Anesthetist',
        role: RoleType.ANESTHETIST,
        cadre: 'doctor',
        email: 'surgeon@northhospital.com',
        targetRoute: '/ot',
        badge: 'Anesthetist',
        departmentId: 'dept-ot',
        departmentCode: 'OT',
        departmentName: 'Operation Theatre (OT Suite)',
        avatarInitials: 'FC',
      },
    ],
  },
  {
    id: 'dept-icu',
    code: 'ICU',
    name: 'Intensive Care Unit (ICU / CCU)',
    shortName: 'Intensive Care',
    category: 'emergency',
    iconKey: 'HeartPulse',
    accentColor: '#7c3aed',
    bgLight: 'rgba(124, 58, 237, 0.08)',
    borderLight: 'rgba(124, 58, 237, 0.25)',
    badge: 'Critical Care',
    description: 'Ventilator management, 1:1 nurse monitoring, central telemetry & arterial lines',
    operatingHours: '24/7 Critical Monitoring',
    defaultRole: RoleType.DOCTOR,
    defaultRoute: '/doctor',
    demoAccounts: [
      {
        id: 'demo-icu-doc',
        employeeId: 'EMP-ICU-001',
        name: 'Dr. Michael Chang',
        designation: 'Intensivist & Critical Care Specialist',
        role: RoleType.DOCTOR,
        cadre: 'doctor',
        email: 'doctor@northhospital.com',
        targetRoute: '/doctor',
        badge: 'Intensivist',
        departmentId: 'dept-icu',
        departmentCode: 'ICU',
        departmentName: 'Intensive Care Unit (ICU / CCU)',
        avatarInitials: 'MC',
      },
      {
        id: 'demo-icu-nur',
        employeeId: 'EMP-ICU-NUR',
        name: 'Nurse Clara Adams',
        designation: 'Lead Critical Care / CCU Specialist Nurse',
        role: RoleType.NURSE,
        cadre: 'nurse',
        email: 'nurse@northhospital.com',
        targetRoute: '/nurse',
        badge: 'CCU Nurse',
        departmentId: 'dept-icu',
        departmentCode: 'ICU',
        departmentName: 'Intensive Care Unit (ICU / CCU)',
        avatarInitials: 'CA',
      },
    ],
  },
  {
    id: 'dept-billing',
    code: 'BILLING',
    name: 'Billing & Financial Accounts',
    shortName: 'Billing & Cashier',
    category: 'support',
    iconKey: 'Receipt',
    accentColor: '#16a34a',
    bgLight: 'rgba(22, 163, 74, 0.08)',
    borderLight: 'rgba(22, 163, 74, 0.25)',
    badge: 'Finance Desk',
    description: 'Cash counter, insurance TPA pre-auth, OPD tokens settlement & receipts',
    operatingHours: '24/7 Cashier Counter',
    defaultRole: RoleType.CASHIER,
    defaultRoute: '/billing',
    demoAccounts: [
      {
        id: 'demo-bill-cash',
        employeeId: 'EMP-CASH-01',
        name: 'David Miller',
        designation: 'Senior Cash Counter Officer',
        role: RoleType.CASHIER,
        cadre: 'admin',
        email: 'billing@northhospital.com',
        targetRoute: '/billing',
        badge: 'Cashier',
        departmentId: 'dept-billing',
        departmentCode: 'BILLING',
        departmentName: 'Billing & Financial Accounts',
        avatarInitials: 'DM',
      },
      {
        id: 'demo-bill-mgr',
        employeeId: 'EMP-FIN-01',
        name: 'Sunita Bai',
        designation: 'Patient Accounts & Billing Supervisor',
        role: RoleType.FINANCE_MANAGER,
        cadre: 'admin',
        email: 'billing@northhospital.com',
        targetRoute: '/billing',
        badge: 'Finance Mgr',
        departmentId: 'dept-billing',
        departmentCode: 'BILLING',
        departmentName: 'Billing & Financial Accounts',
        avatarInitials: 'SB',
      },
    ],
  },
  {
    id: 'dept-lab',
    code: 'LAB',
    name: 'Diagnostic Laboratory',
    shortName: 'Pathology Lab',
    category: 'diagnostic',
    iconKey: 'FlaskConical',
    accentColor: '#0891b2',
    bgLight: 'rgba(8, 145, 178, 0.08)',
    borderLight: 'rgba(8, 145, 178, 0.25)',
    badge: 'Diagnostics',
    description: '8-step specimen pipeline, automated analyzers, barcodes & digital sign-off',
    operatingHours: '24/7 Pathology & Stat Lab',
    defaultRole: RoleType.LAB_TECH,
    defaultRoute: '/lab',
    demoAccounts: [
      {
        id: 'demo-lab-doc',
        employeeId: 'EMP-PATH-01',
        name: 'Dr. Anita Roy',
        designation: 'Consultant Clinical Pathologist & Hematologist',
        role: RoleType.PATHOLOGIST,
        cadre: 'doctor',
        email: 'lab@northhospital.com',
        targetRoute: '/lab',
        badge: 'Pathologist',
        departmentId: 'dept-lab',
        departmentCode: 'LAB',
        departmentName: 'Diagnostic Laboratory',
        avatarInitials: 'AR',
      },
      {
        id: 'demo-lab-tech',
        employeeId: 'EMP-LAB-01',
        name: 'Sarah Connor',
        designation: 'Senior Medical Lab Technologist (Bio-Chem)',
        role: RoleType.LAB_TECH,
        cadre: 'technician',
        email: 'lab@northhospital.com',
        targetRoute: '/lab',
        badge: 'Lab Tech',
        departmentId: 'dept-lab',
        departmentCode: 'LAB',
        departmentName: 'Diagnostic Laboratory',
        avatarInitials: 'SC',
      },
    ],
  },
  {
    id: 'dept-pharmacy',
    code: 'PHARMACY',
    name: 'Pharmacy & Dispensing Counter',
    shortName: 'Pharmacy',
    category: 'support',
    iconKey: 'Pill',
    accentColor: '#db2777',
    bgLight: 'rgba(219, 39, 119, 0.08)',
    borderLight: 'rgba(219, 39, 119, 0.25)',
    badge: 'Dispensing',
    description: 'Prescription queue, formulary barcode validation, dosage checking & billing',
    operatingHours: '24/7 Central Pharmacy',
    defaultRole: RoleType.PHARMACIST,
    defaultRoute: '/pharmacy',
    demoAccounts: [
      {
        id: 'demo-pharm-01',
        employeeId: 'EMP-PHARM-01',
        name: 'Grace Hopper',
        designation: 'Lead Clinical Pharmacist (Central Dispensing)',
        role: RoleType.PHARMACIST,
        cadre: 'technician',
        email: 'pharmacy@northhospital.com',
        targetRoute: '/pharmacy',
        badge: 'Pharmacist',
        departmentId: 'dept-pharmacy',
        departmentCode: 'PHARMACY',
        departmentName: 'Pharmacy & Dispensing Counter',
        avatarInitials: 'GH',
      },
    ],
  },
  {
    id: 'dept-radiology',
    code: 'RADIOLOGY',
    name: 'Radiology & Imaging Sciences',
    shortName: 'Radiology',
    category: 'diagnostic',
    iconKey: 'Radio',
    accentColor: '#9333ea',
    bgLight: 'rgba(147, 51, 234, 0.08)',
    borderLight: 'rgba(147, 51, 234, 0.25)',
    badge: 'Imaging',
    description: 'Digital X-Ray, Multi-slice CT, High-field MRI, Ultrasound & PACS integration',
    operatingHours: '24/7 Emergency Radiology',
    defaultRole: RoleType.LAB_TECH,
    defaultRoute: '/lab',
    demoAccounts: [
      {
        id: 'demo-radio-01',
        employeeId: 'EMP-RADIO-01',
        name: 'Dr. Raymond Holt',
        designation: 'Consultant Radiologist & PACS Lead',
        role: RoleType.LAB_TECH,
        cadre: 'doctor',
        email: 'lab@northhospital.com',
        targetRoute: '/lab',
        badge: 'Radiologist',
        departmentId: 'dept-radiology',
        departmentCode: 'RADIOLOGY',
        departmentName: 'Radiology & Imaging Sciences',
        avatarInitials: 'RH',
      },
    ],
  },
  {
    id: 'dept-cardiology',
    code: 'DEPT-CARDIO',
    name: 'Cardiology & Cardiovascular Sciences',
    shortName: 'Cardiology',
    category: 'clinical',
    iconKey: 'HeartPulse',
    accentColor: '#ef4444',
    bgLight: 'rgba(239, 68, 68, 0.08)',
    borderLight: 'rgba(239, 68, 68, 0.25)',
    badge: 'Pavilion Station',
    description: 'Tertiary cardiac OPD, CCU telemetry wards, cath labs & rapid triage bay',
    operatingHours: '24/7 Tertiary Cardiac Care',
    defaultRole: RoleType.DEPARTMENT_ADMIN,
    defaultRoute: '/department/dept-cardiology',
    demoAccounts: [
      {
        id: 'demo-card-doc',
        employeeId: 'DOC-CARDIO-101',
        name: 'Dr. Arthur Vance',
        designation: 'Department Head & Interventional Cardiologist',
        role: RoleType.DEPARTMENT_ADMIN,
        cadre: 'doctor',
        email: 'cardio.admin@northhospital.com',
        targetRoute: '/department/dept-cardiology',
        badge: 'Cardio HOD',
        departmentId: 'dept-cardiology',
        departmentCode: 'DEPT-CARDIO',
        departmentName: 'Cardiology & Cardiovascular Sciences',
        avatarInitials: 'AV',
      },
      {
        id: 'demo-card-nur',
        employeeId: 'EMP-CARD-NUR',
        name: 'Nurse Clara Adams',
        designation: 'Cardiac Telemetry & CCU Specialist Nurse',
        role: RoleType.NURSE,
        cadre: 'nurse',
        email: 'nurse@northhospital.com',
        targetRoute: '/nurse?tab=triage-queue',
        badge: 'CCU Nurse',
        departmentId: 'dept-cardiology',
        departmentCode: 'DEPT-CARDIO',
        departmentName: 'Cardiology & Cardiovascular Sciences',
        avatarInitials: 'CA',
      },
    ],
  },
];

// Helper to find staff by either employeeId or email
export function findDemoStaffByCredential(identifier: string): DemoStaffAccount | undefined {
  const query = identifier.trim().toLowerCase();
  for (const dept of DEPARTMENT_LOGIN_NODES) {
    const match = dept.demoAccounts.find(
      (a) =>
        a.employeeId.toLowerCase() === query ||
        a.email.toLowerCase() === query ||
        a.name.toLowerCase().includes(query)
    );
    if (match) return match;
  }
  return undefined;
}

// Returns list of unique cadres available within a department
export function getDepartmentCadres(deptId: string): StaffCadre[] {
  const dept = DEPARTMENT_LOGIN_NODES.find((d) => d.id === deptId);
  if (!dept) return ['admin'];
  const cadres = new Set<StaffCadre>();
  dept.demoAccounts.forEach((acc) => cadres.add(acc.cadre));
  return Array.from(cadres);
}

// Returns staff filtered by department and cadre
export function getDepartmentStaffByCadre(deptId: string, cadre?: StaffCadre): DemoStaffAccount[] {
  const dept = DEPARTMENT_LOGIN_NODES.find((d) => d.id === deptId);
  if (!dept) return [];
  if (!cadre) return dept.demoAccounts;
  return dept.demoAccounts.filter((a) => a.cadre === cadre);
}
