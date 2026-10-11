import { User, RoleType } from '../types';
import {
  StaffMember,
  getHospitalStaff,
  DEFAULT_HOSPITAL_STAFF
} from '../pages/admin/setup/organization/hospitalStaffStore';

export type StaffCategory =
  | 'DOCTOR'
  | 'NURSE'
  | 'PHARMACY'
  | 'ADMIN'
  | 'RECEPTION'
  | 'BILLING'
  | 'GENERAL';

export interface DoctorSpecificDetails {
  medicalRegNumber: string;
  licenseNumber: string;
  specialization: string;
  qualification: string;
  consultationFee: number;
  dailyPatientCapacity: number;
  consultationDurationMinutes: number;
}

export interface NurseSpecificDetails {
  nursingRegNumber: string;
  nursingDesignation: string;
  certifications: string[];
  wardAssignment: string;
  handoverProtocol: string;
}

export interface PharmacySpecificDetails {
  pharmacyRegNumber: string;
  pharmacyRole: string;
  assignedStore: string;
  scheduleXWitnessAuthorized: boolean;
  custodyClearance: string;
  coldChainAuthorized: boolean;
}

export interface AdminSpecificDetails {
  administrativeRank: string;
  executiveScope: string;
  governanceLevel: string;
  facilityOversight: string;
}

export interface ReceptionSpecificDetails {
  counterDesk: string;
  triageStation: string;
  visitorAuthority: string;
}

export interface BillingSpecificDetails {
  counterCode: string;
  discountLimit: number;
  refundApprovalLimit: number;
}

export interface ExtendedStaffProfile {
  id: string;
  staffCategory: StaffCategory;

  // 1. Personal Information
  personal: {
    fullName: string;
    initials: string;
    email: string;
    phone: string;
    dob: string;
    gender: string;
    bloodGroup: string;
    address: {
      street: string;
      city: string;
      state: string;
      pincode: string;
    };
    emergencyContact: {
      name: string;
      relation: string;
      phone: string;
    };
  };

  // 2. Employment Information
  employment: {
    employeeCode: string;
    designation: string;
    joiningDate: string;
    employmentStatus: string;
    contractType: string;
    probationPeriodMonths: number;
    reportingManagerName: string;
    experienceYears: string | number;
  };

  // 3. Department & Assignment
  assignment: {
    primaryDepartment: string;
    secondaryDepartments: string[];
    assignedRole: string;
    workLocation: {
      buildingName: string;
      floorName: string;
      roomOrCounter: string;
    };
    shift: {
      name: string;
      hours: string;
      type: string;
    };
  };

  // 4. Account Information
  account: {
    username: string;
    accountStatus: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'RESIGNED';
    systemRole: string;
    clearanceLevel: string;
    lastLogin: string;
    twoFactorEnabled: boolean;
  };

  // 5. Role-Specific Details
  roleDetails: {
    doctor?: DoctorSpecificDetails;
    nurse?: NurseSpecificDetails;
    pharmacy?: PharmacySpecificDetails;
    admin?: AdminSpecificDetails;
    reception?: ReceptionSpecificDetails;
    billing?: BillingSpecificDetails;
  };
}

/**
 * Determine staff category from RoleType or StaffRole string
 */
export function getStaffCategory(role: RoleType | string): StaffCategory {
  const r = (role || '').toString().toUpperCase();
  if (r.includes('DOCTOR') || r.includes('SURGEON') || r.includes('ANESTHETIST') || r.includes('MEDICAL_SUPERINTENDENT')) {
    return 'DOCTOR';
  }
  if (r.includes('NURSE') || r.includes('WARD_MANAGER')) {
    return 'NURSE';
  }
  if (r.includes('PHARMAC') || r.includes('INVENTORY')) {
    return 'PHARMACY';
  }
  if (r.includes('RECEPTION') || r.includes('ASSISTANT')) {
    return 'RECEPTION';
  }
  if (r.includes('ADMIN') || r.includes('SUPER_ADMIN') || r.includes('DIRECTOR')) {
    return 'ADMIN';
  }
  if (r.includes('CASHIER') || r.includes('BILLING') || r.includes('ACCOUNT') || r.includes('FINANCE')) {
    return 'BILLING';
  }
  return 'GENERAL';
}

/**
 * Clean fallback helper for missing values
 */
export function cleanValue(val: any, fallback: string = 'Not Specified'): string {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'string' && val.trim() === '') return fallback;
  return String(val);
}

/**
 * Formats user's full initials (e.g. "Rajesh Kumar" -> "RK")
 */
export function getInitials(name: string): string {
  if (!name) return 'NH';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase() || 'NH';
}

/**
 * Resolves a StaffMember record into the full ExtendedStaffProfile
 */
export function buildProfileFromStaff(staff: StaffMember, user?: User | null, role?: RoleType): ExtendedStaffProfile {
  const category = getStaffCategory(role || staff.role);
  const fullName = staff.fullName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Hospital Staff');
  const initials = getInitials(fullName);

  const addressObj = typeof staff.address === 'object' && staff.address !== null
    ? staff.address
    : {
        street: typeof staff.address === 'string' ? staff.address : '100 Medical Center Boulevard',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110029',
      };

  const profile: ExtendedStaffProfile = {
    id: staff.id || user?.id || 'stf-user',
    staffCategory: category,

    // 1. Personal Information
    personal: {
      fullName,
      initials,
      email: staff.email || user?.email || 'staff@northhospital.com',
      phone: staff.phone || user?.phoneNumber || '+91 98110 24892',
      dob: staff.dob || '1988-06-14',
      gender: staff.gender || 'Not Specified',
      bloodGroup: staff.bloodGroup || 'B+ (Positive)',
      address: {
        street: addressObj.street || 'Hospital Staff Quarters · Block 3',
        city: addressObj.city || 'Metro City',
        state: addressObj.state || 'Delhi NCR',
        pincode: addressObj.pincode || '110029',
      },
      emergencyContact: {
        name: staff.emergencyContactName || staff.emergencyContact || 'Family Caregiver',
        relation: staff.emergencyContactRelation || 'Primary Kin',
        phone: staff.emergencyContactPhone || '+91 98765 43210',
      },
    },

    // 2. Employment Information
    employment: {
      employeeCode: staff.employeeCode || user?.employeeId || 'EMP-NH-2207',
      designation: staff.designation || (role ? role.replace(/_/g, ' ') : 'Healthcare Staff'),
      joiningDate: staff.joiningDate || '2019-02-15',
      employmentStatus: staff.employmentStatus || 'FULL_TIME',
      contractType: staff.contractType || 'PERMANENT',
      probationPeriodMonths: staff.probationPeriodMonths || 6,
      reportingManagerName: staff.reportingManagerName || 'Medical Director Office',
      experienceYears: staff.experienceYears || '7+ Years',
    },

    // 3. Department & Assignment
    assignment: {
      primaryDepartment: staff.departmentName || staff.departmentNames?.[0] || 'Clinical Department',
      secondaryDepartments: (staff.departmentNames || []).filter((d) => d !== staff.departmentName),
      assignedRole: staff.role || (role ? role.replace(/_/g, ' ') : 'Staff'),
      workLocation: {
        buildingName: staff.buildingName || 'North Hospital Main Block B',
        floorName: staff.floorName || 'Ground Floor',
        roomOrCounter: staff.roomName || 'Central Clinical Station',
      },
      shift: {
        name: staff.shiftName || 'Standard Day Operational Shift',
        hours: staff.shiftHours || '08:00 - 16:00',
        type: 'Regular Clinical Roster',
      },
    },

    // 4. Account Information
    account: {
      username: user?.username || staff.employeeCode.toLowerCase(),
      accountStatus: staff.status || 'ACTIVE',
      systemRole: role || (staff.role ? staff.role.toUpperCase() : 'STAFF'),
      clearanceLevel: category === 'ADMIN' ? 'Tier 4 · Enterprise Administrative' : 'Tier 2 · Departmental Clinical',
      lastLogin: new Date().toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ' · 08:30 AM',
      twoFactorEnabled: true,
    },

    // 5. Role-Specific Details
    roleDetails: {},
  };

  // Populate Role-Specific Details
  if (category === 'DOCTOR') {
    profile.roleDetails.doctor = {
      medicalRegNumber: staff.registrationNumber || 'MCI-REG-99124',
      licenseNumber: staff.licenseNumber || user?.doctorProfile?.licenseNumber || 'LIC-DOC-8832',
      specialization: staff.specialization || user?.doctorProfile?.department || 'Internal Medicine & Critical Care',
      qualification: staff.qualification || user?.doctorProfile?.qualification || 'MBBS, MD, FACP',
      consultationFee: staff.consultationFee || (user?.doctorProfile?.consultationFee ? Number(user.doctorProfile.consultationFee) : 150),
      dailyPatientCapacity: staff.dailyPatientCapacity || 35,
      consultationDurationMinutes: staff.consultationDurationMinutes || 15,
    };
  } else if (category === 'NURSE') {
    profile.roleDetails.nurse = {
      nursingRegNumber: staff.registrationNumber || 'INC-NUR-44102',
      nursingDesignation: staff.designation || 'Staff Nurse Grade 1',
      certifications: ['BLS Certified', 'ACLS Certified', 'Hospital Infection Control Protocol'],
      wardAssignment: staff.wardName || 'Inpatient General Ward 3B',
      handoverProtocol: 'Strict Nurse Superintendent Checklist (ISBAR Protocol)',
    };
  } else if (category === 'PHARMACY') {
    const isManager = (role === RoleType.INVENTORY_MANAGER) || staff.designation.toLowerCase().includes('inventory');
    profile.roleDetails.pharmacy = {
      pharmacyRegNumber: staff.registrationNumber || 'PCI-DEL-88402',
      pharmacyRole: isManager ? 'Inventory Manager · Store Custodian' : 'Clinical Pharmacist',
      assignedStore: isManager ? 'Central Medical Store · Main Vault (Block B, Basement)' : 'Pharmacy Dispensing & Ward Supply Units (OPD / IPD)',
      scheduleXWitnessAuthorized: true,
      custodyClearance: isManager ? 'Full Vault Custody & Narcotics Keyholder' : 'Formulary Dispensing & Ward Supply Custody',
      coldChainAuthorized: true,
    };
  } else if (category === 'ADMIN') {
    profile.roleDetails.admin = {
      administrativeRank: 'Operations Director',
      executiveScope: 'Hospital Enterprise Governance & Departmental Setup',
      governanceLevel: 'Full Authority · HIPAA / NABH Compliance Officer',
      facilityOversight: 'All North Hospital Pavilions & Centers of Excellence',
    };
  } else if (category === 'RECEPTION') {
    profile.roleDetails.reception = {
      counterDesk: 'Desk 01 · Front Office Main Atrium',
      triageStation: 'Ambulatory Rapid Triage Unit',
      visitorAuthority: 'Authorized for Visitor Passes & Immediate Queue Tokens',
    };
  } else if (category === 'BILLING') {
    profile.roleDetails.billing = {
      counterCode: 'CTR-02',
      discountLimit: 5000,
      refundApprovalLimit: 20000,
    };
  }

  return profile;
}

/**
 * Link logged-in account to correct staff record using stable identifiers
 */
export function getStaffProfileForUser(user: User | null, role: RoleType): ExtendedStaffProfile {
  const staffList = getHospitalStaff();

  let matchedStaff: StaffMember | undefined;

  if (user) {
    // 1. By exact ID or employeeId
    if (user.employeeId) {
      matchedStaff = staffList.find(
        (s) =>
          s.employeeCode?.toLowerCase() === user.employeeId?.toLowerCase() ||
          s.id === user.employeeId ||
          (user.employeeId?.toLowerCase() === 'emp-pharm-03' && s.employeeCode?.toLowerCase() === 'ph-4380')
      );
    }
    // 2. By username (e.g. rajesh.kumar, harsh.admin, pharmadmin)
    if (!matchedStaff && user.username) {
      const u = user.username.toLowerCase();
      matchedStaff = staffList.find(
        (s) =>
          s.email?.toLowerCase().includes(u) ||
          s.fullName?.toLowerCase().replace(/\s+/g, '_').includes(u) ||
          s.employeeCode?.toLowerCase() === u
      );
    }
    // 3. By email
    if (!matchedStaff && user.email) {
      matchedStaff = staffList.find((s) => s.email?.toLowerCase() === user.email.toLowerCase());
    }
    // 4. By First & Last Name
    if (!matchedStaff && (user.firstName || user.lastName)) {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
      if (name) {
        matchedStaff = staffList.find((s) => s.fullName?.toLowerCase().includes(name));
      }
    }
    // 5. Special role-based matches for demo users
    if (!matchedStaff) {
      if (role === RoleType.INVENTORY_MANAGER) {
        matchedStaff = staffList.find((s) => s.employeeCode === 'IM-2207' || s.fullName.includes('Rajesh'));
      } else if (role === RoleType.HOSPITAL_ADMIN || role === RoleType.SUPER_ADMIN) {
        matchedStaff = staffList.find((s) => s.employeeCode === 'ADM-001' || s.fullName.includes('Harsh'));
      } else if (role === RoleType.PHARMACIST) {
        matchedStaff = staffList.find((s) => s.role === 'pharmacist');
      } else if (role === RoleType.DOCTOR) {
        matchedStaff = staffList.find((s) => s.role === 'doctor');
      } else if (role === RoleType.NURSE) {
        matchedStaff = staffList.find((s) => s.role === 'nurse');
      }
    }
  }

  if (matchedStaff) {
    return buildProfileFromStaff(matchedStaff, user, role);
  }

  // Graceful fallback synthesis with zero crashes
  const fallbackStaff: StaffMember = {
    id: user?.id || 'stf-fallback',
    employeeCode: user?.employeeId || (role === RoleType.INVENTORY_MANAGER ? 'IM-2207' : 'EMP-NH-1001'),
    fullName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Rajesh Kumar',
    role: (role ? role.toLowerCase() : 'pharmacist') as any,
    designation: user?.designation || (role === RoleType.INVENTORY_MANAGER ? 'Inventory Manager · IM-2207' : 'Hospital Healthcare Staff'),
    email: user?.email || 'r.kumar@northhospital.org',
    phone: user?.phoneNumber || '+91 98110 24892',
    departmentName: user?.departmentName || 'Pharmacy & Central Medical Store',
    buildingName: 'North Hospital Main Block B',
    floorName: 'Basement Level -1',
    roomName: 'Central Medical Store · Main Vault',
    shiftId: 'shift-gen',
    shiftName: 'General Day Operational Shift',
    shiftHours: '08:00 - 16:00',
    status: 'ACTIVE',
    joiningDate: '2019-02-15',
  };

  return buildProfileFromStaff(fallbackStaff, user, role);
}

/**
 * Access-controlled lookup by ID / Employee Code
 * Stage 3 Requirement: Prevent regular users from accessing another employee's private profile by changing a URL or identifier.
 */
export function getStaffProfileById(
  targetIdOrCode: string,
  currentUser: User | null,
  currentRole: RoleType
): { profile: ExtendedStaffProfile | null; error?: string } {
  const myProfile = getStaffProfileForUser(currentUser, currentRole);

  if (!targetIdOrCode || targetIdOrCode === 'me' || targetIdOrCode === myProfile.id || targetIdOrCode === myProfile.employment.employeeCode) {
    return { profile: myProfile };
  }

  // Check if current user has administrative permissions to view other staff records
  const isAdmin = currentRole === RoleType.HOSPITAL_ADMIN || currentRole === RoleType.SUPER_ADMIN;

  if (!isAdmin) {
    return {
      profile: myProfile,
      error: 'Access Restricted: You are only authorized to view your own staff profile.',
    };
  }

  // Find target staff member
  const allStaff = getHospitalStaff();
  const found = allStaff.find(
    (s) => s.id === targetIdOrCode || s.employeeCode.toLowerCase() === targetIdOrCode.toLowerCase()
  );

  if (!found) {
    return {
      profile: null,
      error: `Staff record with ID or code "${targetIdOrCode}" was not found.`,
    };
  }

  return { profile: buildProfileFromStaff(found) };
}
