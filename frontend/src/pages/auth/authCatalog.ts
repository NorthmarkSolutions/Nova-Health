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
  | 'admin'
  | 'pathologist'
  | 'opd_pharmacist'
  | 'ipd_pharmacist'
  | 'inventory_manager'
  | 'billing_admin'
  | 'billing_supervisor'
  | 'cashier'
  | 'insurance_coordinator'
  | 'accounts_admin'
  | 'finance_manager'
  | 'internal_auditor'
  | 'accounts_executive'
  | 'accounts_supervisor'
  | 'accounts_manager'
  | 'finance_controller'
  | 'cfo';

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
  pathologist: {
    key: 'pathologist',
    label: 'Consultant Pathologist',
    pluralLabel: 'Pathologists',
    iconKey: 'Microscope',
    badgeColor: '#7c3aed',
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
  opd_pharmacist: {
    key: 'opd_pharmacist',
    label: 'OPD Pharmacist',
    pluralLabel: 'OPD Pharmacist',
    iconKey: 'Pill',
    badgeColor: '#ec4899',
  },
  ipd_pharmacist: {
    key: 'ipd_pharmacist',
    label: 'IPD Pharmacist',
    pluralLabel: 'IPD Pharmacist',
    iconKey: 'BedDouble',
    badgeColor: '#a855f7',
  },
  inventory_manager: {
    key: 'inventory_manager',
    label: 'Inventory Manager',
    pluralLabel: 'Inventory Manager',
    iconKey: 'Package',
    badgeColor: '#f97316',
  },
  billing_admin: {
    key: 'billing_admin',
    label: 'Billing Admin',
    pluralLabel: 'Billing Admin',
    iconKey: 'ShieldCheck',
    badgeColor: '#059669',
  },
  billing_supervisor: {
    key: 'billing_supervisor',
    label: 'Billing Supervisor',
    pluralLabel: 'Supervisor',
    iconKey: 'UserCheck',
    badgeColor: '#2563eb',
  },
  cashier: {
    key: 'cashier',
    label: 'Billing Executive',
    pluralLabel: 'Cashier / OPD',
    iconKey: 'Receipt',
    badgeColor: '#10b981',
  },
  insurance_coordinator: {
    key: 'insurance_coordinator',
    label: 'IPD & TPA Billing',
    pluralLabel: 'IPD & TPA',
    iconKey: 'FileText',
    badgeColor: '#8b5cf6',
  },
  accounts_executive: {
    key: 'accounts_executive',
    label: 'Accounts Executive',
    pluralLabel: 'Executive (Maker)',
    iconKey: 'Receipt',
    badgeColor: '#0284c7',
  },
  accounts_supervisor: {
    key: 'accounts_supervisor',
    label: 'Accounts Supervisor',
    pluralLabel: 'Supervisor (Checker)',
    iconKey: 'UserCheck',
    badgeColor: '#2563eb',
  },
  accounts_manager: {
    key: 'accounts_manager',
    label: 'Accounts Manager',
    pluralLabel: 'Accounts Manager',
    iconKey: 'FileSpreadsheet',
    badgeColor: '#059669',
  },
  finance_controller: {
    key: 'finance_controller',
    label: 'Finance Controller',
    pluralLabel: 'Finance Controller',
    iconKey: 'ShieldCheck',
    badgeColor: '#7c3aed',
  },
  cfo: {
    key: 'cfo',
    label: 'Chief Financial Officer',
    pluralLabel: 'CFO Office',
    iconKey: 'TrendingUp',
    badgeColor: '#dc2626',
  },
  accounts_admin: {
    key: 'accounts_admin',
    label: 'Chief Accounts Officer',
    pluralLabel: 'Accounts Admin',
    iconKey: 'ShieldCheck',
    badgeColor: '#0284c7',
  },
  finance_manager: {
    key: 'finance_manager',
    label: 'Finance & Tax Accountant',
    pluralLabel: 'Finance & Tax',
    iconKey: 'FileSpreadsheet',
    badgeColor: '#059669',
  },
  internal_auditor: {
    key: 'internal_auditor',
    label: 'Internal Financial Auditor',
    pluralLabel: 'Auditors',
    iconKey: 'ScrollText',
    badgeColor: '#d97706',
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
    name: 'Patient Billing & Cashier Desk',
    shortName: 'Billing & Cashier',
    category: 'support',
    iconKey: 'Receipt',
    accentColor: '#16a34a',
    bgLight: 'rgba(22, 163, 74, 0.08)',
    borderLight: 'rgba(22, 163, 74, 0.25)',
    badge: 'Cashier Counter',
    description: 'Cash counter, OPD token settlement, IPD running bills & discharge clearance',
    operatingHours: '24/7 Cashier Counter',
    defaultRole: RoleType.CASHIER,
    defaultRoute: '/billing',
    demoAccounts: [
      {
        id: 'demo-bill-adm',
        employeeId: 'EMP-BILL-ADM',
        name: 'Anita Desai',
        designation: 'Head of Billing & Revenue Operations',
        role: RoleType.BILLING_ADMIN,
        cadre: 'billing_admin',
        email: 'billing.admin@northhospital.com',
        targetRoute: '/billing/admin',
        badge: 'Billing Admin',
        departmentId: 'dept-billing',
        departmentCode: 'BILLING',
        departmentName: 'Patient Billing & Cashier Desk',
        avatarInitials: 'AD',
      },
      {
        id: 'demo-bill-sup',
        employeeId: 'EMP-BILL-SUP',
        name: 'Vikramaditya Rao',
        designation: 'Billing Shift Supervisor & Auditor',
        role: RoleType.BILLING_SUPERVISOR,
        cadre: 'billing_supervisor',
        email: 'billing.supervisor@northhospital.com',
        targetRoute: '/billing/supervisor',
        badge: 'Supervisor',
        departmentId: 'dept-billing',
        departmentCode: 'BILLING',
        departmentName: 'Patient Billing & Cashier Desk',
        avatarInitials: 'VR',
      },
      {
        id: 'demo-bill-cash',
        employeeId: 'EMP-CASH-01',
        name: 'Ritu Verma',
        designation: 'Senior OPD Cashier & Billing Executive',
        role: RoleType.CASHIER,
        cadre: 'cashier',
        email: 'cashier@northhospital.com',
        targetRoute: '/billing',
        badge: 'Cashier',
        departmentId: 'dept-billing',
        departmentCode: 'BILLING',
        departmentName: 'Patient Billing & Cashier Desk',
        avatarInitials: 'RV',
      },
      {
        id: 'demo-bill-tpa',
        employeeId: 'EMP-BILL-TPA',
        name: 'David Miller',
        designation: 'IPD & TPA Insurance Billing Officer',
        role: RoleType.CASHIER,
        cadre: 'insurance_coordinator',
        email: 'billing@northhospital.com',
        targetRoute: '/billing/ipd',
        badge: 'IPD & TPA',
        departmentId: 'dept-billing',
        departmentCode: 'BILLING',
        departmentName: 'Patient Billing & Cashier Desk',
        avatarInitials: 'DM',
      },
    ],
  },
  {
    id: 'dept-accounts',
    code: 'ACCOUNTS',
    name: 'Accounts & Financial Governance',
    shortName: 'Accounts & Finance',
    category: 'admin',
    iconKey: 'Building2',
    accentColor: '#0284c7',
    bgLight: 'rgba(2, 132, 199, 0.08)',
    borderLight: 'rgba(2, 132, 199, 0.25)',
    badge: 'Finance Desk',
    description: 'Hospital general ledger, revenue analytics, tax & GST filings, period close & audit trails',
    operatingHours: '09:00 - 18:00 (Corporate)',
    defaultRole: RoleType.FINANCE_MANAGER,
    defaultRoute: '/accounts',
    demoAccounts: [
      {
        id: 'demo-acc-ae',
        employeeId: 'EMP-ACC-AE',
        name: 'Priya Nair',
        designation: 'Accounts Executive & Voucher Maker',
        role: RoleType.ACCOUNTS_EXECUTIVE,
        cadre: 'accounts_executive',
        email: 'priya.nair@northhospital.com',
        targetRoute: '/accounts',
        badge: 'Maker · AE-01',
        departmentId: 'dept-accounts',
        departmentCode: 'ACCOUNTS',
        departmentName: 'Accounts & Financial Governance',
        avatarInitials: 'PN',
      },
      {
        id: 'demo-acc-as',
        employeeId: 'EMP-ACC-AS',
        name: 'Rahul Menon',
        designation: 'Accounts Supervisor & First Checker',
        role: RoleType.ACCOUNTS_SUPERVISOR,
        cadre: 'accounts_supervisor',
        email: 'rahul.menon@northhospital.com',
        targetRoute: '/accounts',
        badge: 'Checker · AS-01',
        departmentId: 'dept-accounts',
        departmentCode: 'ACCOUNTS',
        departmentName: 'Accounts & Financial Governance',
        avatarInitials: 'RM',
      },
      {
        id: 'demo-acc-am',
        employeeId: 'EMP-ACC-AM',
        name: 'Kavita Shah',
        designation: 'Accounts Manager (Receivables & Payables Control)',
        role: RoleType.ACCOUNTS_MANAGER,
        cadre: 'accounts_manager',
        email: 'kavita.shah@northhospital.com',
        targetRoute: '/accounts',
        badge: 'Ops Control · AM-01',
        departmentId: 'dept-accounts',
        departmentCode: 'ACCOUNTS',
        departmentName: 'Accounts & Financial Governance',
        avatarInitials: 'KS',
      },
      {
        id: 'demo-acc-fc',
        employeeId: 'EMP-ACC-FC',
        name: 'Anil Verma',
        designation: 'Finance Controller & Chief Accounts Officer',
        role: RoleType.FINANCE_CONTROLLER,
        cadre: 'finance_controller',
        email: 'anil.verma@northhospital.com',
        targetRoute: '/accounts',
        badge: 'Controller · FC-01',
        departmentId: 'dept-accounts',
        departmentCode: 'ACCOUNTS',
        departmentName: 'Accounts & Financial Governance',
        avatarInitials: 'AV',
      },
      {
        id: 'demo-acc-cfo',
        employeeId: 'EMP-ACC-CFO',
        name: 'Meera Rao',
        designation: 'Chief Financial Officer (CFO & Board Strategy)',
        role: RoleType.CFO,
        cadre: 'cfo',
        email: 'meera.rao@northhospital.com',
        targetRoute: '/accounts',
        badge: 'CFO · Board Strategy',
        departmentId: 'dept-accounts',
        departmentCode: 'ACCOUNTS',
        departmentName: 'Accounts & Financial Governance',
        avatarInitials: 'MR',
      },
      {
        id: 'demo-acc-aud',
        employeeId: 'EMP-ACC-AUD',
        name: 'Arun Mehta',
        designation: 'Senior Financial Auditor (Sharma & Associates)',
        role: RoleType.AUDITOR,
        cadre: 'internal_auditor',
        email: 'auditor@northhospital.com',
        targetRoute: '/accounts',
        badge: 'Statutory Auditor · AUD',
        departmentId: 'dept-accounts',
        departmentCode: 'ACCOUNTS',
        departmentName: 'Accounts & Financial Governance',
        avatarInitials: 'AM',
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
        id: 'demo-lab-adm',
        employeeId: 'EMP-LAB-ADM',
        name: 'Dr. Marcus Vance',
        designation: 'Laboratory Director & Department Admin',
        role: RoleType.DEPARTMENT_ADMIN,
        cadre: 'admin',
        email: 'lab.admin@northhospital.com',
        targetRoute: '/department/lab',
        badge: 'Lab Admin',
        departmentId: 'lab',
        departmentCode: 'LAB',
        departmentName: 'Diagnostic Laboratory',
        avatarInitials: 'MV',
      },
      {
        id: 'demo-lab-doc',
        employeeId: 'EMP-PATH-01',
        name: 'Dr. Kavitha Menon',
        designation: 'Consultant Clinical Pathologist & Hematologist',
        role: RoleType.PATHOLOGIST,
        cadre: 'pathologist',
        email: 'pathologist@northhospital.com',
        targetRoute: '/lab?tab=review',
        badge: 'Pathologist',
        departmentId: 'lab',
        departmentCode: 'LAB',
        departmentName: 'Diagnostic Laboratory',
        avatarInitials: 'KM',
      },
      {
        id: 'demo-lab-tech',
        employeeId: 'EMP-LAB-01',
        name: 'Sarah Connor',
        designation: 'Senior Medical Lab Technologist (Bio-Chem)',
        role: RoleType.LAB_TECH,
        cadre: 'technician',
        email: 'lab@northhospital.com',
        targetRoute: '/lab?tab=queue',
        badge: 'Lab Tech',
        departmentId: 'lab',
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
        id: 'demo-pharm-adm',
        employeeId: 'EMP-PH-ADM',
        name: 'Dr. Pooja Shah',
        designation: 'Pharmacy Admin · Chief Pharmacist',
        role: RoleType.DEPARTMENT_ADMIN,
        cadre: 'admin',
        email: 'dr.pooja.shah@northhospital.com',
        targetRoute: '/department/pharmacy',
        badge: 'Pharmacy Admin',
        departmentId: 'pharmacy',
        departmentCode: 'PHARMACY',
        departmentName: 'Pharmacy Department & Central Stores',
        avatarInitials: 'PS',
      },
      {
        id: 'demo-pharm-02',
        employeeId: 'EMP-PHARM-02',
        name: 'Arjun Varma',
        designation: 'Senior OPD Dispensing Pharmacist (Counter 2)',
        role: RoleType.PHARMACIST,
        cadre: 'opd_pharmacist',
        email: 'arjun.varma@northhospital.com',
        targetRoute: '/pharmacy/opd',
        badge: 'OPD Pharmacist',
        departmentId: 'dept-pharmacy',
        departmentCode: 'PHARMACY',
        departmentName: 'Pharmacy & Dispensing Counter',
        avatarInitials: 'AV',
      },
      {
        id: 'demo-pharm-03',
        employeeId: 'EMP-PHARM-03',
        name: 'Sneha Nair',
        designation: 'Inpatient Clinical & Ward Supply Pharmacist',
        role: RoleType.PHARMACIST,
        cadre: 'ipd_pharmacist',
        email: 'sneha.nair@northhospital.com',
        targetRoute: '/pharmacy/ipd',
        badge: 'IPD Pharmacist',
        departmentId: 'dept-pharmacy',
        departmentCode: 'PHARMACY',
        departmentName: 'Pharmacy & Dispensing Counter',
        avatarInitials: 'SN',
      },
      {
        id: 'demo-pharm-01',
        employeeId: 'EMP-PHARM-01',
        name: 'Grace Hopper',
        designation: 'Central Medical Store & Inventory Manager',
        role: RoleType.INVENTORY_MANAGER,
        cadre: 'inventory_manager',
        email: 'pharmacy@northhospital.com',
        targetRoute: '/pharmacy/inventory',
        badge: 'Inventory Mgr',
        departmentId: 'dept-pharmacy',
        departmentCode: 'PHARMACY',
        departmentName: 'Pharmacy Department & Central Stores',
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
        (a.email.split('@')[0] && a.email.split('@')[0].toLowerCase() === query) ||
        a.name.toLowerCase().includes(query)
    );
    if (match) return match;
  }
  // Common aliases for lab
  if (
    query === 'pathologist' ||
    query === 'pathology' ||
    query === 'kavitha' ||
    query === 'kavitha.menon' ||
    query === 'kavitha.menon@northhospital.com' ||
    query === 'emp-path-01'
  ) {
    return DEPARTMENT_LOGIN_NODES.find((d) => d.id === 'dept-lab')?.demoAccounts.find((a) => a.cadre === 'pathologist');
  }
  if (
    query === 'lab' ||
    query === 'labtech' ||
    query === 'lab tech' ||
    query === 'technician' ||
    query === 'sarah' ||
    query === 'sarah connor' ||
    query === 'emp-lab-01' ||
    query === 'david'
  ) {
    return DEPARTMENT_LOGIN_NODES.find((d) => d.id === 'dept-lab')?.demoAccounts.find((a) => a.cadre === 'technician');
  }
  if (
    query === 'labadmin' ||
    query === 'lab admin' ||
    query === 'marcus' ||
    query === 'marcus vance' ||
    query === 'emp-lab-adm' ||
    query === 'lab.admin@northhospital.com'
  ) {
    return DEPARTMENT_LOGIN_NODES.find((d) => d.id === 'dept-lab')?.demoAccounts.find((a) => a.cadre === 'admin');
  }
  if (
    query === 'sneha' ||
    query === 'sneha nair' ||
    query === 'sneha.nair@northhospital.com' ||
    query === 'emp-pharm-03' ||
    query === 'ipd pharmacist' ||
    query === 'ipd pharmacy'
  ) {
    return DEPARTMENT_LOGIN_NODES.find((d) => d.id === 'dept-pharmacy')?.demoAccounts.find((a) => a.id === 'demo-pharm-03');
  }
  if (
    query === 'pooja' ||
    query === 'dr pooja shah' ||
    query === 'dr. pooja shah' ||
    query === 'pooja shah' ||
    query === 'pharmadmin' ||
    query === 'pharmacy admin' ||
    query === 'emp-ph-adm' ||
    query === 'dr.pooja.shah@northhospital.com'
  ) {
    return DEPARTMENT_LOGIN_NODES.find((d) => d.id === 'dept-pharmacy')?.demoAccounts.find((a) => a.id === 'demo-pharm-adm');
  }
  if (
    query === 'arjun' ||
    query === 'arjun varma' ||
    query === 'arjun.varma@northhospital.com' ||
    query === 'emp-pharm-02' ||
    query === 'opd pharmacist'
  ) {
    return DEPARTMENT_LOGIN_NODES.find((d) => d.id === 'dept-pharmacy')?.demoAccounts.find((a) => a.id === 'demo-pharm-02');
  }
  if (
    query === 'grace' ||
    query === 'grace hopper' ||
    query === 'pharmacy@northhospital.com' ||
    query === 'emp-pharm-01' ||
    query === 'inventory' ||
    query === 'inventory manager'
  ) {
    return DEPARTMENT_LOGIN_NODES.find((d) => d.id === 'dept-pharmacy')?.demoAccounts.find((a) => a.id === 'demo-pharm-01');
  }
  if (
    query === 'anita' ||
    query === 'anita desai' ||
    query === 'billing.admin@northhospital.com' ||
    query === 'emp-bill-adm' ||
    query === 'billing admin'
  ) {
    return DEPARTMENT_LOGIN_NODES.find((d) => d.id === 'dept-billing')?.demoAccounts.find((a) => a.id === 'demo-bill-adm');
  }
  if (
    query === 'vikram' ||
    query === 'vikramaditya' ||
    query === 'vikramaditya rao' ||
    query === 'billing.supervisor@northhospital.com' ||
    query === 'emp-bill-sup' ||
    query === 'billing supervisor'
  ) {
    return DEPARTMENT_LOGIN_NODES.find((d) => d.id === 'dept-billing')?.demoAccounts.find((a) => a.id === 'demo-bill-sup');
  }
  if (
    query === 'ritu' ||
    query === 'ritu verma' ||
    query === 'cashier@northhospital.com' ||
    query === 'emp-cash-01' ||
    query === 'cashier'
  ) {
    return DEPARTMENT_LOGIN_NODES.find((d) => d.id === 'dept-billing')?.demoAccounts.find((a) => a.id === 'demo-bill-cash');
  }
  if (
    query === 'david' ||
    query === 'david miller' ||
    query === 'billing@northhospital.com' ||
    query === 'emp-bill-tpa' ||
    query === 'tpa' ||
    query === 'ipd billing'
  ) {
    return DEPARTMENT_LOGIN_NODES.find((d) => d.id === 'dept-billing')?.demoAccounts.find((a) => a.id === 'demo-bill-tpa');
  }
  if (
    query === 'priya' ||
    query === 'priya nair' ||
    query === 'priya.nair@northhospital.com' ||
    query === 'emp-acc-ae' ||
    query === 'accounts executive' ||
    query === 'maker'
  ) {
    return DEPARTMENT_LOGIN_NODES.find((d) => d.id === 'dept-accounts')?.demoAccounts.find((a) => a.id === 'demo-acc-ae');
  }
  if (
    query === 'rahul' ||
    query === 'rahul menon' ||
    query === 'rahul.menon@northhospital.com' ||
    query === 'emp-acc-as' ||
    query === 'accounts supervisor' ||
    query === 'checker'
  ) {
    return DEPARTMENT_LOGIN_NODES.find((d) => d.id === 'dept-accounts')?.demoAccounts.find((a) => a.id === 'demo-acc-as');
  }
  if (
    query === 'kavita' ||
    query === 'kavita shah' ||
    query === 'kavita.shah@northhospital.com' ||
    query === 'emp-acc-am' ||
    query === 'accounts manager'
  ) {
    return DEPARTMENT_LOGIN_NODES.find((d) => d.id === 'dept-accounts')?.demoAccounts.find((a) => a.id === 'demo-acc-am');
  }
  if (
    query === 'anil' ||
    query === 'anil verma' ||
    query === 'anil.verma@northhospital.com' ||
    query === 'emp-acc-fc' ||
    query === 'finance controller' ||
    query === 'controller'
  ) {
    return DEPARTMENT_LOGIN_NODES.find((d) => d.id === 'dept-accounts')?.demoAccounts.find((a) => a.id === 'demo-acc-fc');
  }
  if (
    query === 'meera' ||
    query === 'meera rao' ||
    query === 'meera.rao@northhospital.com' ||
    query === 'emp-acc-cfo' ||
    query === 'cfo' ||
    query === 'chief financial officer'
  ) {
    return DEPARTMENT_LOGIN_NODES.find((d) => d.id === 'dept-accounts')?.demoAccounts.find((a) => a.id === 'demo-acc-cfo');
  }
  if (
    query === 'arun' ||
    query === 'arun mehta' ||
    query === 'auditor@northhospital.com' ||
    query === 'emp-acc-aud' ||
    query === 'internal auditor' ||
    query === 'auditor'
  ) {
    return DEPARTMENT_LOGIN_NODES.find((d) => d.id === 'dept-accounts')?.demoAccounts.find((a) => a.id === 'demo-acc-aud');
  }
  return undefined;
}

export function getCadrePluralLabel(cadreKey: StaffCadre, deptId?: string): string {
  if (deptId === 'dept-lab') {
    if (cadreKey === 'pathologist') return 'Pathologists';
    if (cadreKey === 'technician') return 'Lab Techs';
    if (cadreKey === 'admin') return 'Administration';
  }
  if (deptId === 'dept-pharmacy') {
    if (cadreKey === 'admin') return 'Pharmacy Admin';
    if (cadreKey === 'opd_pharmacist') return 'OPD Pharmacist';
    if (cadreKey === 'ipd_pharmacist') return 'IPD Pharmacist';
    if (cadreKey === 'inventory_manager') return 'Inventory Manager';
  }
  if (deptId === 'dept-billing') {
    if (cadreKey === 'billing_admin' || cadreKey === 'admin') return 'Billing Admin';
    if (cadreKey === 'billing_supervisor') return 'Supervisor';
    if (cadreKey === 'cashier') return 'Cashier / OPD';
    if (cadreKey === 'insurance_coordinator') return 'IPD & TPA';
  }
  if (deptId === 'dept-accounts') {
    if (cadreKey === 'accounts_executive') return 'Executive (Maker)';
    if (cadreKey === 'accounts_supervisor') return 'Supervisor (Checker)';
    if (cadreKey === 'accounts_manager') return 'Accounts Manager';
    if (cadreKey === 'finance_controller' || cadreKey === 'accounts_admin' || cadreKey === 'admin') return 'Finance Controller';
    if (cadreKey === 'cfo') return 'Chief Financial Officer';
    if (cadreKey === 'internal_auditor') return 'Auditors';
    if (cadreKey === 'finance_manager') return 'Finance & Tax';
  }
  return CADRE_METADATA[cadreKey]?.pluralLabel || cadreKey;
}

export function getCadreSingleLabel(cadreKey: StaffCadre, deptId?: string): string {
  if (deptId === 'dept-lab') {
    if (cadreKey === 'pathologist') return 'Consultant Pathologist';
    if (cadreKey === 'technician') return 'Medical Lab Technologist';
    if (cadreKey === 'admin') return 'Laboratory Administrator';
  }
  if (deptId === 'dept-pharmacy') {
    if (cadreKey === 'admin') return 'Chief Pharmacist / Admin';
    if (cadreKey === 'opd_pharmacist') return 'OPD Dispensing Pharmacist';
    if (cadreKey === 'ipd_pharmacist') return 'IPD Ward Supply Pharmacist';
    if (cadreKey === 'inventory_manager') return 'Central Store & Inventory Manager';
  }
  if (deptId === 'dept-billing') {
    if (cadreKey === 'billing_admin' || cadreKey === 'admin') return 'Head of Billing & Revenue';
    if (cadreKey === 'billing_supervisor') return 'Billing Shift Supervisor';
    if (cadreKey === 'cashier') return 'Billing Executive / Cashier';
    if (cadreKey === 'insurance_coordinator') return 'IPD & TPA Insurance Billing Officer';
  }
  if (deptId === 'dept-accounts') {
    if (cadreKey === 'accounts_executive') return 'Accounts Executive (Voucher Maker)';
    if (cadreKey === 'accounts_supervisor') return 'Accounts Supervisor (First Checker)';
    if (cadreKey === 'accounts_manager') return 'Accounts Manager (Operations Control)';
    if (cadreKey === 'finance_controller' || cadreKey === 'accounts_admin' || cadreKey === 'admin') return 'Finance Controller & Chief Accounts Officer';
    if (cadreKey === 'cfo') return 'Chief Financial Officer & Strategic Finance';
    if (cadreKey === 'internal_auditor') return 'Senior Financial Auditor (Sharma & Associates)';
    if (cadreKey === 'finance_manager') return 'Senior Finance & Tax Accountant';
  }
  return CADRE_METADATA[cadreKey]?.label || cadreKey;
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
