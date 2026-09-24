/**
 * Northmark Hospital Management System - Enterprise Role-Based Access Control (RBAC) Service
 * 
 * Defines the hospital-wide permission boundaries across 14 roles and 13 functional modules.
 * Ensures strict clinical safety, financial integrity, and data protection.
 */

export type HospitalRole =
  | 'SUPER_ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'DEPARTMENT_ADMIN'
  | 'DOCTOR'
  | 'DOCTOR_ASSISTANT'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'RECEPTION_SUPERVISOR'
  | 'CASHIER'
  | 'FINANCE_MANAGER'
  | 'LAB_TECH'
  | 'PATHOLOGIST'
  | 'PHARMACIST'
  | 'PATIENT';

export type RbacModuleKey =
  | 'patient_registration'
  | 'appointments_tokens'
  | 'triage_vitals'
  | 'doctor_consultation'
  | 'prescriptions'
  | 'diagnostic_lab'
  | 'ipd_bed_allocation'
  | 'billing_invoices'
  | 'department_settings'
  | 'staff_directory'
  | 'staff_bank_payroll'
  | 'campus_infrastructure'
  | 'audit_security';

export type ClearanceLevel =
  | 'CRUD'        // Full Create, Read, Update, Delete
  | 'READ'        // Read Only
  | 'DEPT'        // Scoped strictly to user's assigned Department
  | 'UPDATE'      // Read & Update existing records
  | 'SELF'        // Scoped strictly to own patient or employee record
  | 'NONE';       // No access (—)

export interface ModuleDefinition {
  key: RbacModuleKey;
  name: string;
  category: 'CLINICAL' | 'OPERATIONS' | 'FINANCE' | 'ADMINISTRATION';
  description: string;
}

export const RBAC_MODULES: ModuleDefinition[] = [
  {
    key: 'patient_registration',
    name: 'Patient Registration & UHID',
    category: 'OPERATIONS',
    description: 'Patient demographic onboarding, national ID verification, UHID generation.',
  },
  {
    key: 'appointments_tokens',
    name: 'Walk-in Tokens & Appointments',
    category: 'OPERATIONS',
    description: 'Daily OPD token generation, queue routing, and consultation scheduling.',
  },
  {
    key: 'triage_vitals',
    name: 'Pre-Consultation Triage & Vitals',
    category: 'CLINICAL',
    description: 'Vital signs recording (BP, Pulse, SpO2, Temp), pain score, emergency triage.',
  },
  {
    key: 'doctor_consultation',
    name: 'Doctor Consultation & SOAP Notes',
    category: 'CLINICAL',
    description: 'Subjective complaints, objective observations, clinical diagnosis, ICD-10 coding.',
  },
  {
    key: 'prescriptions',
    name: 'E-Prescriptions (Rx Issuance)',
    category: 'CLINICAL',
    description: 'Medication prescribing, dosage instructions, contraindication warnings.',
  },
  {
    key: 'diagnostic_lab',
    name: 'Diagnostic & Lab Orders',
    category: 'CLINICAL',
    description: 'Pathology/radiology requisition, specimen collection, result publishing.',
  },
  {
    key: 'ipd_bed_allocation',
    name: 'IPD Ward & Bed Allocation',
    category: 'OPERATIONS',
    description: 'Inpatient bed reservation, ward transfers, nurse station handover, discharge.',
  },
  {
    key: 'billing_invoices',
    name: 'Billing, Charge Slips & Invoices',
    category: 'FINANCE',
    description: 'OPD tariff charge capture, IPD ledger, discount authorization, receipt settlement.',
  },
  {
    key: 'department_settings',
    name: 'Department Capacity & Configuration',
    category: 'ADMINISTRATION',
    description: 'Operational hours, doctor capacity quotas, clinical toggles, department KPIs.',
  },
  {
    key: 'staff_directory',
    name: 'Staff Master & Onboarding',
    category: 'ADMINISTRATION',
    description: 'Employee profiles, role assignment, shifts, emergency contacts, documents.',
  },
  {
    key: 'staff_bank_payroll',
    name: 'Staff Bank & Payroll Compensation',
    category: 'FINANCE',
    description: 'Confidential bank accounts, IFSC/SWIFT, tax PAN, salary disbursement modes.',
  },
  {
    key: 'campus_infrastructure',
    name: 'Campus Infrastructure & Bed Locator',
    category: 'ADMINISTRATION',
    description: 'Buildings, wings, floors, wards, rooms, formula-based permanent bed codes.',
  },
  {
    key: 'audit_security',
    name: 'Audit Trail & Security Credentials',
    category: 'ADMINISTRATION',
    description: 'System-wide immutable action logs, credential resets, RBAC administration.',
  },
];

export interface RbacRoleDefinition {
  role: HospitalRole;
  displayName: string;
  cadre: 'EXECUTIVE' | 'CLINICAL' | 'NURSING' | 'FRONTLINE' | 'FINANCIAL' | 'DIAGNOSTIC' | 'PATIENT';
  description: string;
  clearances: Record<RbacModuleKey, ClearanceLevel>;
}

/**
 * Enterprise Access Matrix for all 14 Hospital Roles across 13 Modules
 */
export const RBAC_MATRIX: Record<HospitalRole, RbacRoleDefinition> = {
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    displayName: 'Super Administrator',
    cadre: 'EXECUTIVE',
    description: 'Hospital owner and system architect with unrestricted master access.',
    clearances: {
      patient_registration: 'CRUD',
      appointments_tokens: 'CRUD',
      triage_vitals: 'CRUD',
      doctor_consultation: 'CRUD',
      prescriptions: 'CRUD',
      diagnostic_lab: 'CRUD',
      ipd_bed_allocation: 'CRUD',
      billing_invoices: 'CRUD',
      department_settings: 'CRUD',
      staff_directory: 'CRUD',
      staff_bank_payroll: 'CRUD',
      campus_infrastructure: 'CRUD',
      audit_security: 'CRUD',
    },
  },

  HOSPITAL_ADMIN: {
    role: 'HOSPITAL_ADMIN',
    displayName: 'Hospital Administrator',
    cadre: 'EXECUTIVE',
    description: 'Campus operations director managing departments, rosters, and hospital policies.',
    clearances: {
      patient_registration: 'CRUD',
      appointments_tokens: 'CRUD',
      triage_vitals: 'READ',
      doctor_consultation: 'READ',
      prescriptions: 'READ',
      diagnostic_lab: 'READ',
      ipd_bed_allocation: 'CRUD',
      billing_invoices: 'CRUD',
      department_settings: 'CRUD',
      staff_directory: 'CRUD',
      staff_bank_payroll: 'CRUD',
      campus_infrastructure: 'CRUD',
      audit_security: 'CRUD',
    },
  },

  DEPARTMENT_ADMIN: {
    role: 'DEPARTMENT_ADMIN',
    displayName: 'Department Administrator / HOD',
    cadre: 'EXECUTIVE',
    description: 'Clinical head or operational manager responsible for department capacity & staff.',
    clearances: {
      patient_registration: 'READ',
      appointments_tokens: 'DEPT',
      triage_vitals: 'DEPT',
      doctor_consultation: 'DEPT',
      prescriptions: 'DEPT',
      diagnostic_lab: 'DEPT',
      ipd_bed_allocation: 'DEPT',
      billing_invoices: 'READ',
      department_settings: 'DEPT',
      staff_directory: 'DEPT',
      staff_bank_payroll: 'NONE',
      campus_infrastructure: 'DEPT',
      audit_security: 'DEPT',
    },
  },

  DOCTOR: {
    role: 'DOCTOR',
    displayName: 'Consultant Doctor / Specialist',
    cadre: 'CLINICAL',
    description: 'Licensed medical officer performing patient consultations, diagnosis, and Rx.',
    clearances: {
      patient_registration: 'READ',
      appointments_tokens: 'READ',
      triage_vitals: 'READ',
      doctor_consultation: 'CRUD',
      prescriptions: 'CRUD',
      diagnostic_lab: 'CRUD',
      ipd_bed_allocation: 'READ',
      billing_invoices: 'NONE', // Strict separation of medical & billing
      department_settings: 'NONE',
      staff_directory: 'READ',
      staff_bank_payroll: 'NONE',
      campus_infrastructure: 'READ',
      audit_security: 'NONE',
    },
  },

  DOCTOR_ASSISTANT: {
    role: 'DOCTOR_ASSISTANT',
    displayName: 'Doctor Assistant / Clinical Scribe',
    cadre: 'CLINICAL',
    description: 'Aids doctor with patient preparation, vitals check, and draft consultation notes.',
    clearances: {
      patient_registration: 'READ',
      appointments_tokens: 'READ',
      triage_vitals: 'UPDATE',
      doctor_consultation: 'UPDATE', // Draft notes only
      prescriptions: 'READ', // Cannot prescribe directly
      diagnostic_lab: 'READ',
      ipd_bed_allocation: 'READ',
      billing_invoices: 'NONE',
      department_settings: 'NONE',
      staff_directory: 'READ',
      staff_bank_payroll: 'NONE',
      campus_infrastructure: 'READ',
      audit_security: 'NONE',
    },
  },

  NURSE: {
    role: 'NURSE',
    displayName: 'Staff Nurse / Ward Incharge',
    cadre: 'NURSING',
    description: 'Patient care provider recording pre-consultation vitals and inpatient care.',
    clearances: {
      patient_registration: 'READ',
      appointments_tokens: 'READ',
      triage_vitals: 'CRUD',
      doctor_consultation: 'READ',
      prescriptions: 'READ',
      diagnostic_lab: 'READ',
      ipd_bed_allocation: 'UPDATE',
      billing_invoices: 'NONE',
      department_settings: 'NONE',
      staff_directory: 'READ',
      staff_bank_payroll: 'NONE',
      campus_infrastructure: 'READ',
      audit_security: 'NONE',
    },
  },

  RECEPTIONIST: {
    role: 'RECEPTIONIST',
    displayName: 'Front Desk Receptionist',
    cadre: 'FRONTLINE',
    description: 'Frontline staff onboarding patients, issuing tokens, and booking appointments.',
    clearances: {
      patient_registration: 'CRUD',
      appointments_tokens: 'CRUD',
      triage_vitals: 'NONE',
      doctor_consultation: 'NONE',
      prescriptions: 'NONE',
      diagnostic_lab: 'NONE',
      ipd_bed_allocation: 'READ',
      billing_invoices: 'READ',
      department_settings: 'NONE',
      staff_directory: 'READ',
      staff_bank_payroll: 'NONE',
      campus_infrastructure: 'READ',
      audit_security: 'NONE',
    },
  },

  RECEPTION_SUPERVISOR: {
    role: 'RECEPTION_SUPERVISOR',
    displayName: 'Reception / Front Desk Supervisor',
    cadre: 'FRONTLINE',
    description: 'Supervisor managing queue overflow, token prioritization, and emergency check-in.',
    clearances: {
      patient_registration: 'CRUD',
      appointments_tokens: 'CRUD',
      triage_vitals: 'NONE',
      doctor_consultation: 'NONE',
      prescriptions: 'NONE',
      diagnostic_lab: 'NONE',
      ipd_bed_allocation: 'READ',
      billing_invoices: 'READ',
      department_settings: 'READ',
      staff_directory: 'READ',
      staff_bank_payroll: 'NONE',
      campus_infrastructure: 'READ',
      audit_security: 'NONE',
    },
  },

  CASHIER: {
    role: 'CASHIER',
    displayName: 'Billing Cashier',
    cadre: 'FINANCIAL',
    description: 'Handles outpatient tariff collection, receipt generation, and payment closure.',
    clearances: {
      patient_registration: 'READ',
      appointments_tokens: 'READ',
      triage_vitals: 'NONE',
      doctor_consultation: 'NONE',
      prescriptions: 'READ', // Needs to view meds to bill
      diagnostic_lab: 'READ', // Needs to view ordered tests to bill
      ipd_bed_allocation: 'READ',
      billing_invoices: 'CRUD',
      department_settings: 'NONE',
      staff_directory: 'NONE',
      staff_bank_payroll: 'NONE',
      campus_infrastructure: 'NONE',
      audit_security: 'NONE',
    },
  },

  FINANCE_MANAGER: {
    role: 'FINANCE_MANAGER',
    displayName: 'Finance & Accounts Manager',
    cadre: 'FINANCIAL',
    description: 'Financial auditor overseeing revenue cycles, staff payroll, and tariff ledgers.',
    clearances: {
      patient_registration: 'READ',
      appointments_tokens: 'READ',
      triage_vitals: 'NONE',
      doctor_consultation: 'NONE',
      prescriptions: 'READ',
      diagnostic_lab: 'READ',
      ipd_bed_allocation: 'READ',
      billing_invoices: 'CRUD',
      department_settings: 'READ',
      staff_directory: 'READ',
      staff_bank_payroll: 'CRUD',
      campus_infrastructure: 'READ',
      audit_security: 'READ',
    },
  },

  LAB_TECH: {
    role: 'LAB_TECH',
    displayName: 'Diagnostic Lab Technician',
    cadre: 'DIAGNOSTIC',
    description: 'Processes blood/imaging samples and enters preliminary test values.',
    clearances: {
      patient_registration: 'READ',
      appointments_tokens: 'READ',
      triage_vitals: 'NONE',
      doctor_consultation: 'NONE',
      prescriptions: 'NONE',
      diagnostic_lab: 'CRUD',
      ipd_bed_allocation: 'NONE',
      billing_invoices: 'NONE',
      department_settings: 'NONE',
      staff_directory: 'READ',
      staff_bank_payroll: 'NONE',
      campus_infrastructure: 'READ',
      audit_security: 'NONE',
    },
  },

  PATHOLOGIST: {
    role: 'PATHOLOGIST',
    displayName: 'Pathologist / Radiologist Specialist',
    cadre: 'DIAGNOSTIC',
    description: 'Clinical diagnostic doctor validating and signing official laboratory reports.',
    clearances: {
      patient_registration: 'READ',
      appointments_tokens: 'READ',
      triage_vitals: 'READ',
      doctor_consultation: 'READ',
      prescriptions: 'NONE',
      diagnostic_lab: 'CRUD',
      ipd_bed_allocation: 'READ',
      billing_invoices: 'NONE',
      department_settings: 'NONE',
      staff_directory: 'READ',
      staff_bank_payroll: 'NONE',
      campus_infrastructure: 'READ',
      audit_security: 'NONE',
    },
  },

  PHARMACIST: {
    role: 'PHARMACIST',
    displayName: 'Chief Pharmacist / Dispenser',
    cadre: 'CLINICAL',
    description: 'Reviews verified doctor prescriptions and dispenses pharmaceuticals.',
    clearances: {
      patient_registration: 'READ',
      appointments_tokens: 'READ',
      triage_vitals: 'NONE',
      doctor_consultation: 'NONE',
      prescriptions: 'READ',
      diagnostic_lab: 'NONE',
      ipd_bed_allocation: 'NONE',
      billing_invoices: 'UPDATE', // Dispense confirmation & pharmacy billing
      department_settings: 'NONE',
      staff_directory: 'READ',
      staff_bank_payroll: 'NONE',
      campus_infrastructure: 'READ',
      audit_security: 'NONE',
    },
  },

  PATIENT: {
    role: 'PATIENT',
    displayName: 'Patient (Self-Service Portal)',
    cadre: 'PATIENT',
    description: 'Hospital patient viewing their own appointments, vitals, prescriptions and bills.',
    clearances: {
      patient_registration: 'SELF',
      appointments_tokens: 'SELF',
      triage_vitals: 'SELF',
      doctor_consultation: 'SELF',
      prescriptions: 'SELF',
      diagnostic_lab: 'SELF',
      ipd_bed_allocation: 'SELF',
      billing_invoices: 'SELF',
      department_settings: 'NONE',
      staff_directory: 'NONE',
      staff_bank_payroll: 'NONE',
      campus_infrastructure: 'NONE',
      audit_security: 'NONE',
    },
  },
};

/**
 * Normalizes role string to standard HospitalRole enum key
 */
export function normalizeRole(roleStr: string): HospitalRole {
  const upper = (roleStr || '').trim().toUpperCase().replace(/[\s-]/g, '_');
  if (upper in RBAC_MATRIX) {
    return upper as HospitalRole;
  }
  // Mapping common aliases
  if (upper === 'ADMIN' || upper === 'ADMINISTRATOR') return 'HOSPITAL_ADMIN';
  if (upper === 'TECH' || upper === 'TECHNICIAN') return 'LAB_TECH';
  if (upper === 'RECEPTION') return 'RECEPTIONIST';
  if (upper === 'BILLING' || upper === 'ACCOUNTANT') return 'CASHIER';
  if (upper === 'PHARMACY') return 'PHARMACIST';
  if (upper === 'ASSISTANT') return 'DOCTOR_ASSISTANT';

  return 'DOCTOR'; // Safe fallback
}

/**
 * Retrieves the clearance level for a specific role and module
 */
export function getRoleClearance(role: string, moduleKey: RbacModuleKey): ClearanceLevel {
  const normalized = normalizeRole(role);
  const def = RBAC_MATRIX[normalized];
  if (!def || !def.clearances) return 'NONE';
  return def.clearances[moduleKey] || 'NONE';
}

export type RbacAction = 'read' | 'create' | 'update' | 'delete' | 'admin';

/**
 * Checks if a user role is permitted to perform an action on a module.
 */
export function hasPermission(
  role: string,
  moduleKey: RbacModuleKey,
  action: RbacAction = 'read'
): boolean {
  const clearance = getRoleClearance(role, moduleKey);

  if (clearance === 'NONE') return false;

  if (clearance === 'CRUD') {
    return true; // Unrestricted on this module
  }

  if (clearance === 'DEPT') {
    // Has full operational access within their department
    return true;
  }

  if (action === 'read') {
    return clearance === 'READ' || clearance === 'UPDATE' || clearance === 'SELF';
  }

  if (action === 'create' || action === 'update') {
    return clearance === 'UPDATE' || clearance === 'SELF';
  }

  return false;
}

export interface RbacMatrixRow {
  module: ModuleDefinition;
  roleClearances: Record<HospitalRole, ClearanceLevel>;
}

/**
 * Generates full RBAC matrix suitable for rendering in the Admin Settings & Security view
 */
export function getFullRbacMatrix(): RbacMatrixRow[] {
  const roles = Object.keys(RBAC_MATRIX) as HospitalRole[];

  return RBAC_MODULES.map((module) => {
    const roleClearances = {} as Record<HospitalRole, ClearanceLevel>;
    roles.forEach((r) => {
      roleClearances[r] = RBAC_MATRIX[r].clearances[module.key];
    });
    return {
      module,
      roleClearances,
    };
  });
}
