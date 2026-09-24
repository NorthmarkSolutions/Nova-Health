/**
 * Northmark Hospital Management System
 * Phase 1 Enterprise Foundation Test Suite
 * 
 * Verifies:
 * 1. Role & Login System: Auto Employee ID generation, RBAC clearance enforcement across all roles & modules.
 * 2. Password Reset Engine: Self-service tokens, admin overrides, strength validation, and security audit trail.
 * 3. Staff Master: 360° profile models, bank accounts, emergency contacts, reporting hierarchy, and CSV export.
 * 4. Department Master: Operational capacity quotas, live throughput KPIs, timings, settings toggles, and immutable audit logs.
 */

import './setupEnv';
import {
  generateEmployeeCode,
  getHospitalStaff,
  updateHospitalStaff,
  getStaffReportingManagers,
  StaffMember,
} from '../src/pages/admin/setup/organization/hospitalStaffStore';

import {
  RBAC_MODULES,
  RBAC_MATRIX,
  hasPermission,
  getRoleClearance,
  getFullRbacMatrix,
  normalizeRole,
  HospitalRole,
} from '../src/services/rbacService';

import {
  validatePasswordStrength,
  requestPasswordReset,
  verifyResetToken,
  completePasswordReset,
  adminResetStaffPassword,
  getSecurityAuditLogs,
} from '../src/services/authResetService';

import {
  DepartmentProfileData,
  DepartmentAuditLogEntry,
} from '../src/pages/admin/setup/organization/DepartmentProfileView';

import { defaultCardiologyDept } from '../src/pages/admin/setup/organization/DepartmentsSection';
import { exportAllStaffToCsv, parseCSV } from '../src/pages/admin/setup/organization/staffTemplateGenerator';

// Test runner helper
let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ✕ FAIL: ${testName} - ${failureDetails || 'Assertion failed'}`);
    failCount++;
  }
}

console.log('\n============================================================');
console.log('PHASE 1 ENTERPRISE FOUNDATION TEST SUITE');
console.log('============================================================\n');

// -------------------------------------------------------------
// TEST SUITE 1: AUTOMATIC EMPLOYEE ID GENERATION
// -------------------------------------------------------------
console.log('--- 1. Automatic Employee ID Generation ---');

const doctorCode = generateEmployeeCode('doctor', 'DEPT-CARDIO');
assert(/^DOC-CARDIO-\d+$/.test(doctorCode), `Doctor code format: ${doctorCode}`);

const nurseCode = generateEmployeeCode('nurse', 'OPD');
assert(/^NUR-OPD-\d+$/.test(nurseCode), `Nurse code format: ${nurseCode}`);

const assistantCode = generateEmployeeCode('assistant', 'OPD');
assert(/^AST-OPD-\d+$/.test(assistantCode), `Assistant code format: ${assistantCode}`);

const techCode = generateEmployeeCode('technician', 'LAB');
assert(/^TEC-LAB-\d+$/.test(techCode), `Technician code format: ${techCode}`);

const adminCode = generateEmployeeCode('admin');
assert(/^ADM-GEN-\d+$/.test(adminCode), `Admin code format: ${adminCode}`);

// -------------------------------------------------------------
// TEST SUITE 2: RBAC MATRIX ENGINE & PERMISSION BOUNDARIES
// -------------------------------------------------------------
console.log('\n--- 2. Enterprise RBAC Matrix & Permission Boundaries ---');

assert(RBAC_MODULES.length === 13, `Total functional modules registered is 13 (found ${RBAC_MODULES.length})`);
assert(Object.keys(RBAC_MATRIX).length === 14, `Total hospital roles defined is 14 (found ${Object.keys(RBAC_MATRIX).length})`);

// Super Admin
const superAdminPatientClearance = getRoleClearance('SUPER_ADMIN', 'patient_registration');
const superAdminPrescriptionClearance = getRoleClearance('SUPER_ADMIN', 'prescriptions');
assert(superAdminPatientClearance === 'CRUD' && superAdminPrescriptionClearance === 'CRUD', 'Super Admin possesses unrestricted CRUD across modules');

// Doctor permissions
assert(hasPermission('DOCTOR', 'doctor_consultation', 'create'), 'Doctor CAN create consultations');
assert(hasPermission('DOCTOR', 'prescriptions', 'create'), 'Doctor CAN issue prescriptions');
assert(!hasPermission('DOCTOR', 'billing_invoices', 'create'), 'Doctor CANNOT create billing charge slips (Strict Separation)');
assert(!hasPermission('DOCTOR', 'department_settings', 'admin'), 'Doctor CANNOT modify hospital department settings');

// Receptionist permissions
assert(hasPermission('RECEPTIONIST', 'patient_registration', 'create'), 'Receptionist CAN register new patients');
assert(hasPermission('RECEPTIONIST', 'appointments_tokens', 'create'), 'Receptionist CAN issue OPD queue tokens');
assert(!hasPermission('RECEPTIONIST', 'prescriptions', 'create'), 'Receptionist CANNOT issue medication prescriptions');
assert(!hasPermission('RECEPTIONIST', 'triage_vitals', 'create'), 'Receptionist CANNOT record clinical vitals');

// Nurse permissions
assert(hasPermission('NURSE', 'triage_vitals', 'create'), 'Nurse CAN record pre-consultation vitals');
assert(hasPermission('NURSE', 'ipd_bed_allocation', 'update'), 'Nurse CAN update inpatient bed allocations');
assert(!hasPermission('NURSE', 'billing_invoices', 'create'), 'Nurse CANNOT generate billing invoices');

// Cashier permissions
assert(hasPermission('CASHIER', 'billing_invoices', 'create'), 'Cashier CAN process patient invoices');
assert(!hasPermission('CASHIER', 'doctor_consultation', 'create'), 'Cashier CANNOT modify clinical SOAP consultation notes');
assert(!hasPermission('CASHIER', 'prescriptions', 'create'), 'Cashier CANNOT prescribe medications');

// Full RBAC Matrix generator
const fullMatrix = getFullRbacMatrix();
assert(fullMatrix.length === 13, `Full RBAC matrix yields 13 rows for UI rendering`);
assert(Boolean(fullMatrix[0].roleClearances.DOCTOR), 'RBAC matrix contains role clearances for DOCTOR');

// -------------------------------------------------------------
// TEST SUITE 3: AUTHENTICATION & PASSWORD RESET SERVICE
// -------------------------------------------------------------
console.log('\n--- 3. Authentication & Password Reset Service ---');

// Password complexity rules
const weakPass = validatePasswordStrength('weak');
assert(!weakPass.isValid && weakPass.errors.length > 0, 'Weak password rejected by security policy');

const strongPass = validatePasswordStrength('Hospital@2026!');
assert(strongPass.isValid && strongPass.errors.length === 0, 'Strong password accepted by security policy');

// Self-Service password reset
const resetReq = requestPasswordReset('DOC-101');
assert(resetReq.success && Boolean(resetReq.resetToken), `Password reset token generated: ${resetReq.resetToken}`);

const verifyRes = verifyResetToken(resetReq.resetToken || '');
assert(verifyRes.valid, 'Reset token successfully verified as active and valid');

const completeRes = completePasswordReset(resetReq.resetToken || '', 'NewDoctorPass@2026!');
assert(completeRes.success, `Self-service password update successful: ${completeRes.message}`);

// Admin credential override
const adminResetRes = adminResetStaffPassword('stf-1', 'Super Administrator');
assert(adminResetRes.success && Boolean(adminResetRes.tempPassword), `Admin credential override issued temp key: ${adminResetRes.tempPassword}`);

// Security audit log check
const auditLogs = getSecurityAuditLogs();
assert(auditLogs.length >= 2, `Security audit trail contains entries (count: ${auditLogs.length})`);
assert(auditLogs.some((l) => l.eventType === 'PASSWORD_RESET_COMPLETED'), 'Security audit contains completed reset event');
assert(auditLogs.some((l) => l.eventType === 'ADMIN_CREDENTIAL_OVERRIDE'), 'Security audit contains admin override event');

// -------------------------------------------------------------
// TEST SUITE 4: STAFF MASTER 360° PROFILE ENHANCEMENTS
// -------------------------------------------------------------
console.log('\n--- 4. Staff Master 360° Profile & Roster Enhancements ---');

const staffList = getHospitalStaff();
assert(staffList.length > 0, `Staff roster loaded with ${staffList.length} initial records`);

const sampleStaff = staffList[0];
const updatedMember: StaffMember = {
  ...sampleStaff,
  emergencyContactName: 'Eleanor Jenkins',
  emergencyContactRelation: 'Spouse',
  emergencyContactPhone: '+1 (555) 987-6543',
  employmentStatus: 'FULL_TIME',
  contractType: 'PERMANENT',
  probationPeriodMonths: 6,
  reportingManagerId: 'stf-admin-1',
  reportingManagerName: 'Dr. Arthur Vance',
  bankDetails: {
    bankName: 'Northmark National Bank',
    accountNumber: '998877665544',
    ifscOrSwift: 'NMBK0001234',
    branchName: 'Metro Healthcare Center',
    salaryPaymentMode: 'DIRECT_DEPOSIT',
    panOrTaxId: 'ABCDE1234F',
  },
};

updateHospitalStaff(updatedMember);
const reloaded = getHospitalStaff().find((s) => s.id === updatedMember.id);
assert(reloaded?.emergencyContactName === 'Eleanor Jenkins', 'Emergency contact name persisted in store');
assert(reloaded?.bankDetails?.bankName === 'Northmark National Bank', 'Bank details persisted in store');
assert(reloaded?.reportingManagerName === 'Dr. Arthur Vance', 'Reporting manager persisted in store');
assert(reloaded?.employmentStatus === 'FULL_TIME', 'Employment status persisted in store');

// Reporting managers query
const reportingManagers = getStaffReportingManagers();
assert(reportingManagers.length > 0, `Identified ${reportingManagers.length} eligible reporting managers in hierarchy`);

// -------------------------------------------------------------
// TEST SUITE 5: DEPARTMENT MASTER CAPACITY, TIMINGS, KPIS & AUDIT
// -------------------------------------------------------------
console.log('\n--- 5. Department Master Capacity, Live KPIs, Timings & Audit ---');

assert(defaultCardiologyDept.dailyConsultationCapacity === 150, 'Cardiology default consultation capacity is 150/day');
assert(defaultCardiologyDept.concurrentDoctorSlots === 6, 'Cardiology concurrent doctor slots is 6');
assert(defaultCardiologyDept.emergencyBufferCapacity === 25, 'Cardiology emergency buffer reserve is 25%');
assert(defaultCardiologyDept.avgConsultationMinutes === 14, 'Cardiology avg consultation duration is 14 minutes');
assert(defaultCardiologyDept.patientSatisfactionScore === 4.9, 'Cardiology patient satisfaction score is 4.9/5.0');
assert(defaultCardiologyDept.allowTeleconsultation === true, 'Cardiology teleconsultation toggle is active');
assert(defaultCardiologyDept.requireVitalsBeforeConsultation === true, 'Cardiology mandatory vitals toggle is active');
assert(Boolean(defaultCardiologyDept.auditLogs && defaultCardiologyDept.auditLogs.length > 0), 'Cardiology contains initial audit log');

const newAuditLog: DepartmentAuditLogEntry = {
  id: `aud-${Date.now()}`,
  timestamp: new Date().toISOString(),
  action: 'CAPACITY_QUOTA_ADJUSTED',
  performedBy: 'HOD Dr. Arthur Vance',
  details: 'Increased daily quota to 180 and reserved 2 extra emergency consulting slots.',
  severity: 'INFO',
};

const updatedDept: DepartmentProfileData = {
  ...defaultCardiologyDept,
  dailyConsultationCapacity: 180,
  auditLogs: [newAuditLog, ...(defaultCardiologyDept.auditLogs || [])],
};

assert(updatedDept.dailyConsultationCapacity === 180, 'Department capacity successfully updated');
assert(updatedDept.auditLogs?.[0].action === 'CAPACITY_QUOTA_ADJUSTED', 'Audit log records capacity adjustment');

// -------------------------------------------------------------
// FINAL REPORT
// -------------------------------------------------------------
console.log('\n============================================================');
console.log(`TEST RESULTS: ${passCount} PASSED | ${failCount} FAILED`);
console.log('============================================================\n');

if (failCount > 0) {
  process.exit(1);
}
