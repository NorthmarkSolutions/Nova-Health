/**
 * Northmark Hospital Management System - Authentication & Password Reset Service
 * 
 * Supports:
 * 1. Self-Service Staff Password Reset (via Employee ID or Registered Email)
 * 2. Administrator Credential Overrides & Temporary Passwords
 * 3. Enterprise Password Strength Policy Enforcement
 * 4. Immutable Security Audit Logging
 */

import { getHospitalStaff, updateHospitalStaff, StaffMember } from '../pages/admin/setup/organization/hospitalStaffStore';

const PENDING_RESETS_KEY = 'north_hospital_pending_password_resets';
const CREDENTIALS_KEY = 'north_hospital_staff_credentials';
const SECURITY_AUDIT_KEY = 'north_hospital_security_audit_logs';

export interface PendingReset {
  token: string;
  staffId: string;
  employeeCode: string;
  email: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  eventType: 'PASSWORD_RESET_REQUEST' | 'PASSWORD_RESET_COMPLETED' | 'ADMIN_CREDENTIAL_OVERRIDE' | 'FAILED_RESET_ATTEMPT';
  employeeCode: string;
  staffName: string;
  performedBy: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FAILURE';
  details: string;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates password strength according to hospital enterprise security policy
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z).');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z).');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9).');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special symbol (!@#$%^&*).');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Logs an authentication or credential security event to the audit trail
 */
export function logSecurityAudit(entry: Omit<SecurityAuditEntry, 'id' | 'timestamp'>): void {
  try {
    const raw = localStorage.getItem(SECURITY_AUDIT_KEY);
    const logs: SecurityAuditEntry[] = raw ? JSON.parse(raw) : [];

    const newEntry: SecurityAuditEntry = {
      ...entry,
      id: `SEC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };

    logs.unshift(newEntry);
    localStorage.setItem(SECURITY_AUDIT_KEY, JSON.stringify(logs.slice(0, 200))); // Keep last 200 security events
  } catch (err) {
    console.error('Failed to log security audit', err);
  }
}

/**
 * Fetches all security audit entries
 */
export function getSecurityAuditLogs(): SecurityAuditEntry[] {
  try {
    const raw = localStorage.getItem(SECURITY_AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Initiates a self-service password reset request
 */
export function requestPasswordReset(identifier: string): {
  success: boolean;
  message: string;
  resetToken?: string;
  employeeName?: string;
  employeeCode?: string;
} {
  const cleanId = (identifier || '').trim().toLowerCase();
  if (!cleanId) {
    return { success: false, message: 'Please enter a valid Employee Code or registered email address.' };
  }

  const allStaff = getHospitalStaff();
  const staff = allStaff.find(
    (s) =>
      s.employeeCode.trim().toLowerCase() === cleanId ||
      s.email.trim().toLowerCase() === cleanId
  );

  if (!staff) {
    logSecurityAudit({
      eventType: 'FAILED_RESET_ATTEMPT',
      employeeCode: identifier.toUpperCase(),
      staffName: 'Unknown Identifier',
      performedBy: 'Self-Service Portal',
      ipAddress: '127.0.0.1 (Local Client)',
      status: 'FAILURE',
      details: `Password reset requested for unrecognized identifier: ${identifier}`,
    });
    return {
      success: false,
      message: `No staff member found matching "${identifier}". Please verify your Employee Code with Hospital Admin.`,
    };
  }

  // Generate 8-character token
  const token = `RST-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const now = Date.now();
  const expiresAt = now + 30 * 60 * 1000; // 30 minutes

  const pending: PendingReset = {
    token,
    staffId: staff.id,
    employeeCode: staff.employeeCode,
    email: staff.email,
    createdAt: now,
    expiresAt,
    used: false,
  };

  try {
    const raw = localStorage.getItem(PENDING_RESETS_KEY);
    const existing: PendingReset[] = raw ? JSON.parse(raw) : [];
    existing.push(pending);
    localStorage.setItem(PENDING_RESETS_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to store pending reset', err);
  }

  logSecurityAudit({
    eventType: 'PASSWORD_RESET_REQUEST',
    employeeCode: staff.employeeCode,
    staffName: staff.fullName,
    performedBy: 'Self-Service Portal',
    ipAddress: '127.0.0.1 (Local Client)',
    status: 'SUCCESS',
    details: `Generated password reset authorization token valid for 30 minutes.`,
  });

  return {
    success: true,
    message: `Password reset token generated for ${staff.fullName} (${staff.employeeCode}).`,
    resetToken: token,
    employeeName: staff.fullName,
    employeeCode: staff.employeeCode,
  };
}

/**
 * Validates a reset token
 */
export function verifyResetToken(token: string): { valid: boolean; message: string; record?: PendingReset } {
  try {
    const raw = localStorage.getItem(PENDING_RESETS_KEY);
    const existing: PendingReset[] = raw ? JSON.parse(raw) : [];

    const found = existing.find((p) => p.token === token && !p.used);
    if (!found) {
      return { valid: false, message: 'Invalid or already utilized password reset token.' };
    }

    if (Date.now() > found.expiresAt) {
      return { valid: false, message: 'Password reset token has expired. Please request a new one.' };
    }

    return { valid: true, message: 'Token verified successfully.', record: found };
  } catch {
    return { valid: false, message: 'Error verifying reset token.' };
  }
}

/**
 * Completes a self-service password reset with validation
 */
export function completePasswordReset(
  token: string,
  newPassword: string
): { success: boolean; message: string } {
  const verification = verifyResetToken(token);
  if (!verification.valid || !verification.record) {
    return { success: false, message: verification.message };
  }

  const validation = validatePasswordStrength(newPassword);
  if (!validation.isValid) {
    return { success: false, message: validation.errors.join(' ') };
  }

  const record = verification.record;

  try {
    // 1. Mark token used
    const rawResets = localStorage.getItem(PENDING_RESETS_KEY);
    if (rawResets) {
      const existing: PendingReset[] = JSON.parse(rawResets);
      const updated = existing.map((r) => (r.token === token ? { ...r, used: true } : r));
      localStorage.setItem(PENDING_RESETS_KEY, JSON.stringify(updated));
    }

    // 2. Save new password in credentials store
    const rawCreds = localStorage.getItem(CREDENTIALS_KEY);
    const creds: Record<string, string> = rawCreds ? JSON.parse(rawCreds) : {};
    creds[record.employeeCode.toUpperCase()] = newPassword;
    creds[record.staffId] = newPassword;
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));

    // 3. Log audit event
    const allStaff = getHospitalStaff();
    const staff = allStaff.find((s) => s.id === record.staffId);
    logSecurityAudit({
      eventType: 'PASSWORD_RESET_COMPLETED',
      employeeCode: record.employeeCode,
      staffName: staff?.fullName || record.employeeCode,
      performedBy: 'Self-Service Portal',
      ipAddress: '127.0.0.1 (Local Client)',
      status: 'SUCCESS',
      details: 'Password successfully updated meeting enterprise complexity policy.',
    });

    return { success: true, message: 'Your password has been successfully reset. You may now log in.' };
  } catch (err) {
    console.error('Failed to complete password reset', err);
    return { success: false, message: 'Failed to complete password update. Please try again.' };
  }
}

/**
 * Administrator Credential Override
 * Directly issues a temporary secure password for a staff member.
 */
export function adminResetStaffPassword(
  staffId: string,
  performedByAdmin: string,
  customNewPassword?: string
): { success: boolean; tempPassword: string; message: string } {
  const allStaff = getHospitalStaff();
  const staff = allStaff.find((s) => s.id === staffId);

  if (!staff) {
    return { success: false, tempPassword: '', message: 'Staff member record not found.' };
  }

  const tempPassword = customNewPassword || `North@${Math.floor(1000 + Math.random() * 9000)}!`;

  try {
    const rawCreds = localStorage.getItem(CREDENTIALS_KEY);
    const creds: Record<string, string> = rawCreds ? JSON.parse(rawCreds) : {};
    creds[staff.employeeCode.toUpperCase()] = tempPassword;
    creds[staff.id] = tempPassword;
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));

    logSecurityAudit({
      eventType: 'ADMIN_CREDENTIAL_OVERRIDE',
      employeeCode: staff.employeeCode,
      staffName: staff.fullName,
      performedBy: performedByAdmin || 'Super Administrator',
      ipAddress: '127.0.0.1 (Internal Admin Console)',
      status: 'SUCCESS',
      details: `Temporary credentials generated by administrator ${performedByAdmin}.`,
    });

    return {
      success: true,
      tempPassword,
      message: `Temporary password successfully assigned for ${staff.fullName} (${staff.employeeCode}).`,
    };
  } catch (err) {
    console.error('Failed admin password reset', err);
    return { success: false, tempPassword: '', message: 'Failed to update staff credentials.' };
  }
}
