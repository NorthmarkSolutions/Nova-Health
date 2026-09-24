import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Layers,
  DoorClosed,
  BedDouble,
  Stethoscope,
  FlaskConical,
  Coins,
  Shield,
  Wrench,
  Clock,
  User,
  Users,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  FileText,
  Upload,
  Download,
  GitMerge,
  Archive,
  Trash2,
  Plus,
  Edit2,
  Lock,
  Calendar,
  DollarSign,
  Activity,
  Sparkles,
  ArrowRightLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info,
  LayoutGrid,
  Pill,
  Award,
  RotateCcw,
  Sliders,
  UserCheck,
  FileCheck,
} from 'lucide-react';
import {
  BuildingNode,
  FloorNode,
  WardNode,
  RoomNode,
  BedNode,
  getCampusBuildings,
  saveCampusBuildings,
  syncDepartmentToCampus,
} from './CampusInfrastructureSection';
import {
  HospitalShift,
  StaffMember,
  StaffRole,
  getHospitalShifts,
  getHospitalStaff,
  getDepartmentPersonnelStats,
} from './hospitalStaffStore';

export interface DepartmentProfileData {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  category: 'clinical' | 'diagnostic' | 'revenue' | 'admin' | 'support';
  description?: string;
  head: string;
  hours: string;
  costCenter: string;
  revenueCenter?: string;
  budget?: number;
  billingEnabled?: boolean;
  staffCount: number;
  status: 'ACTIVE' | 'INACTIVE' | 'UNDER_MAINTENANCE' | 'ARCHIVED' | 'MERGED';

  // 2. Operational Settings
  isOpen24Hours?: boolean;
  workingDays?: string[];
  shiftPattern?: string;
  appointmentBased?: boolean;
  walkInAllowed?: boolean;
  emergencyEnabled?: boolean;

  // 4. Clinical Settings
  consultationEnabled?: boolean;
  admissionEnabled?: boolean;
  procedureEnabled?: boolean;
  labRequestsEnabled?: boolean;
  prescriptionEnabled?: boolean;

  // 5. Staff Settings
  doctorsCount?: number;
  nursesCount?: number;
  techsCount?: number;
  receptionistsCount?: number;
  onCallRoster?: string;

  // 6. Infrastructure & Physical Campus Allocation
  buildingAssigned?: string;
  floorAssigned?: string;
  roomsCount?: number;
  wardsCount?: number;
  bedsCount?: number;
  hasDedicatedWaitingArea?: boolean;

  assignedBuildingId?: string;
  assignedFloorIds?: string[];
  assignedWardIds?: string[];
  assignedRoomIds?: string[];
  allocatedWards?: Array<{
    wardId: string;
    wardName: string;
    wardType: string;
    floorNumber: string;
    bedCount: number;
    supervisorNurse?: string;
  }>;
  allocatedRooms?: Array<{
    roomId: string;
    roomNumber: string;
    roomType: string;
    floorNumber: string;
  }>;

  // 7. Documents & SOPs
  documents?: Array<{
    id: string;
    title: string;
    type: string;
    version: string;
    updatedAt: string;
    status: 'Approved' | 'In Review' | 'Draft';
  }>;

  // 8. Department Operational Capabilities & Permissions
  capabilities?: DepartmentCapabilities;
  permissions?: DepartmentRolePermissions;
  staffOverrides?: StaffPermissionOverride[];

  // 9. Enterprise Capacity & Patient Flow
  dailyConsultationCapacity?: number;
  concurrentDoctorSlots?: number;
  emergencyBufferCapacity?: number;
  maxWaitingQueueLength?: number;

  // 10. Live Operational KPIs
  avgConsultationMinutes?: number;
  patientFootfallDaily?: number;
  bedOccupancyRate?: number;
  patientSatisfactionScore?: number;
  prescriptionsIssuedToday?: number;

  // 11. Timings & Shift Handovers
  opdStartTime?: string;
  opdEndTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  shiftHandoverMinutes?: number;

  // 12. Advanced Operational Settings Toggles
  allowTeleconsultation?: boolean;
  autoTokenGeneration?: boolean;
  requireVitalsBeforeConsultation?: boolean;
  requirePrePaymentForConsultation?: boolean;
  allowEmergencyWalkInBypass?: boolean;
  enableSmsTokenAlerts?: boolean;

  // 13. Department Leadership & Administration
  hodStaffId?: string;
  hodStaffName?: string;
  deptAdminStaffId?: string;
  deptAdminStaffName?: string;

  // 14. Immutable Audit Trail
  auditLogs?: DepartmentAuditLogEntry[];
}

export interface DepartmentCapabilities {
  canConsult: boolean;             // Outpatient & Ambulatory Doctor Consultations
  canPrescribe: boolean;           // E-Prescriptions & Controlled Drug Rx
  canOrderDiagnostics: boolean;   // Diagnostic Lab & Radiology Orders
  canAdmitPatients: boolean;       // Inpatient IPD, Daycare & ICU Bed Admissions
  canPerformProcedures: boolean;   // Minor/Major OT & Bedside Procedures
  canCollectPayments: boolean;     // POS Cash, Card, UPI, Insurance Copay Billing
  canEmergencyBypass: boolean;     // Fast-Track Emergency Triage Bypass
  canTeleconsult: boolean;         // Telemedicine & Remote Video Consultations
  canDischarge: boolean;           // Discharge Summary Approval & Bed Clearance
}

export interface DepartmentRolePermissions {
  doctor: {
    viewPatients: boolean;
    clinicalNotes: boolean;
    prescribe: boolean;
    orderDiagnostics: boolean;
    admitDischarge?: boolean;
  };
  doctorAssistant?: {
    preConsultationScreening: boolean;
    draftPrescription: boolean;
    viewReports: boolean;
  };
  nurse: {
    vitalsEntry: boolean;
    medicationAdmin: boolean;
    wardHandover: boolean;
    nursingNotes?: boolean;
  };
  receptionist: {
    checkIn: boolean;
    queueToken: boolean;
    opdBooking: boolean;
    patientRegistration?: boolean;
  };
  billingStaff: {
    chargeSlip: boolean;
    discountAuth: boolean;
    generateBills?: boolean;
    collectPayments?: boolean;
    refundProcessing?: boolean;
  };
  technician?: {
    sampleCollection: boolean;
    enterResults: boolean;
    reportRelease: boolean;
  };
  pharmacist?: {
    dispenseMedication: boolean;
    substituteGeneric: boolean;
    inventoryAdjustment: boolean;
  };
}

export type StaffDepartmentClearanceLevel =
  | 'HOD'
  | 'SENIOR_SPECIALIST'
  | 'ATTENDING'
  | 'TRAINEE'
  | 'RESTRICTED';

export interface StaffPermissionOverride {
  staffId: string;
  staffName: string;
  employeeCode: string;
  role: string;
  clearanceLevel: StaffDepartmentClearanceLevel;
  canApproveDischarges?: boolean;
  canOverrideDiscounts?: boolean;
  canSignNarcotics?: boolean;
  customNotes?: string;
  assignedAt: string;
}

export type DepartmentArchetypePreset = 'OPD' | 'IPD' | 'ER' | 'LAB' | 'PHARMACY' | 'BILLING';

export const DEFAULT_DEPARTMENT_CAPABILITIES: DepartmentCapabilities = {
  canConsult: true,
  canPrescribe: true,
  canOrderDiagnostics: true,
  canAdmitPatients: false,
  canPerformProcedures: true,
  canCollectPayments: true,
  canEmergencyBypass: false,
  canTeleconsult: true,
  canDischarge: false,
};

export const DEFAULT_DEPARTMENT_PERMISSIONS: DepartmentRolePermissions = {
  doctor: {
    viewPatients: true,
    clinicalNotes: true,
    prescribe: true,
    orderDiagnostics: true,
    admitDischarge: true,
  },
  doctorAssistant: {
    preConsultationScreening: true,
    draftPrescription: true,
    viewReports: true,
  },
  nurse: {
    vitalsEntry: true,
    medicationAdmin: true,
    wardHandover: true,
    nursingNotes: true,
  },
  receptionist: {
    checkIn: true,
    queueToken: true,
    opdBooking: true,
    patientRegistration: true,
  },
  billingStaff: {
    chargeSlip: true,
    discountAuth: false,
    generateBills: true,
    collectPayments: true,
    refundProcessing: false,
  },
  technician: {
    sampleCollection: true,
    enterResults: true,
    reportRelease: false,
  },
  pharmacist: {
    dispenseMedication: true,
    substituteGeneric: true,
    inventoryAdjustment: true,
  },
};

export function getDepartmentArchetypePreset(preset: DepartmentArchetypePreset): {
  capabilities: DepartmentCapabilities;
  permissions: DepartmentRolePermissions;
} {
  switch (preset) {
    case 'OPD':
      return {
        capabilities: {
          canConsult: true,
          canPrescribe: true,
          canOrderDiagnostics: true,
          canAdmitPatients: false,
          canPerformProcedures: true,
          canCollectPayments: true,
          canEmergencyBypass: false,
          canTeleconsult: true,
          canDischarge: false,
        },
        permissions: {
          doctor: { viewPatients: true, clinicalNotes: true, prescribe: true, orderDiagnostics: true, admitDischarge: false },
          doctorAssistant: { preConsultationScreening: true, draftPrescription: true, viewReports: true },
          nurse: { vitalsEntry: true, medicationAdmin: true, wardHandover: false, nursingNotes: true },
          receptionist: { checkIn: true, queueToken: true, opdBooking: true, patientRegistration: true },
          billingStaff: { chargeSlip: true, discountAuth: false, generateBills: true, collectPayments: true, refundProcessing: false },
          technician: { sampleCollection: true, enterResults: true, reportRelease: false },
          pharmacist: { dispenseMedication: true, substituteGeneric: true, inventoryAdjustment: false },
        },
      };
    case 'IPD':
      return {
        capabilities: {
          canConsult: true,
          canPrescribe: true,
          canOrderDiagnostics: true,
          canAdmitPatients: true,
          canPerformProcedures: true,
          canCollectPayments: true,
          canEmergencyBypass: false,
          canTeleconsult: false,
          canDischarge: true,
        },
        permissions: {
          doctor: { viewPatients: true, clinicalNotes: true, prescribe: true, orderDiagnostics: true, admitDischarge: true },
          doctorAssistant: { preConsultationScreening: false, draftPrescription: true, viewReports: true },
          nurse: { vitalsEntry: true, medicationAdmin: true, wardHandover: true, nursingNotes: true },
          receptionist: { checkIn: true, queueToken: false, opdBooking: false, patientRegistration: true },
          billingStaff: { chargeSlip: true, discountAuth: true, generateBills: true, collectPayments: true, refundProcessing: false },
          technician: { sampleCollection: true, enterResults: true, reportRelease: false },
          pharmacist: { dispenseMedication: true, substituteGeneric: true, inventoryAdjustment: true },
        },
      };
    case 'ER':
      return {
        capabilities: {
          canConsult: true,
          canPrescribe: true,
          canOrderDiagnostics: true,
          canAdmitPatients: true,
          canPerformProcedures: true,
          canCollectPayments: true,
          canEmergencyBypass: true,
          canTeleconsult: false,
          canDischarge: true,
        },
        permissions: {
          doctor: { viewPatients: true, clinicalNotes: true, prescribe: true, orderDiagnostics: true, admitDischarge: true },
          doctorAssistant: { preConsultationScreening: true, draftPrescription: true, viewReports: true },
          nurse: { vitalsEntry: true, medicationAdmin: true, wardHandover: true, nursingNotes: true },
          receptionist: { checkIn: true, queueToken: true, opdBooking: false, patientRegistration: true },
          billingStaff: { chargeSlip: true, discountAuth: true, generateBills: true, collectPayments: true, refundProcessing: true },
          technician: { sampleCollection: true, enterResults: true, reportRelease: true },
          pharmacist: { dispenseMedication: true, substituteGeneric: true, inventoryAdjustment: true },
        },
      };
    case 'LAB':
      return {
        capabilities: {
          canConsult: false,
          canPrescribe: false,
          canOrderDiagnostics: true,
          canAdmitPatients: false,
          canPerformProcedures: false,
          canCollectPayments: true,
          canEmergencyBypass: false,
          canTeleconsult: false,
          canDischarge: false,
        },
        permissions: {
          doctor: { viewPatients: true, clinicalNotes: false, prescribe: false, orderDiagnostics: true, admitDischarge: false },
          doctorAssistant: { preConsultationScreening: false, draftPrescription: false, viewReports: true },
          nurse: { vitalsEntry: false, medicationAdmin: false, wardHandover: false, nursingNotes: false },
          receptionist: { checkIn: true, queueToken: true, opdBooking: false, patientRegistration: true },
          billingStaff: { chargeSlip: true, discountAuth: false, generateBills: true, collectPayments: true, refundProcessing: false },
          technician: { sampleCollection: true, enterResults: true, reportRelease: true },
          pharmacist: { dispenseMedication: false, substituteGeneric: false, inventoryAdjustment: false },
        },
      };
    case 'PHARMACY':
      return {
        capabilities: {
          canConsult: false,
          canPrescribe: false,
          canOrderDiagnostics: false,
          canAdmitPatients: false,
          canPerformProcedures: false,
          canCollectPayments: true,
          canEmergencyBypass: false,
          canTeleconsult: false,
          canDischarge: false,
        },
        permissions: {
          doctor: { viewPatients: false, clinicalNotes: false, prescribe: false, orderDiagnostics: false, admitDischarge: false },
          doctorAssistant: { preConsultationScreening: false, draftPrescription: false, viewReports: false },
          nurse: { vitalsEntry: false, medicationAdmin: false, wardHandover: false, nursingNotes: false },
          receptionist: { checkIn: false, queueToken: true, opdBooking: false, patientRegistration: false },
          billingStaff: { chargeSlip: true, discountAuth: false, generateBills: true, collectPayments: true, refundProcessing: true },
          technician: { sampleCollection: false, enterResults: false, reportRelease: false },
          pharmacist: { dispenseMedication: true, substituteGeneric: true, inventoryAdjustment: true },
        },
      };
    case 'BILLING':
      return {
        capabilities: {
          canConsult: false,
          canPrescribe: false,
          canOrderDiagnostics: false,
          canAdmitPatients: false,
          canPerformProcedures: false,
          canCollectPayments: true,
          canEmergencyBypass: false,
          canTeleconsult: false,
          canDischarge: false,
        },
        permissions: {
          doctor: { viewPatients: false, clinicalNotes: false, prescribe: false, orderDiagnostics: false, admitDischarge: false },
          doctorAssistant: { preConsultationScreening: false, draftPrescription: false, viewReports: false },
          nurse: { vitalsEntry: false, medicationAdmin: false, wardHandover: false, nursingNotes: false },
          receptionist: { checkIn: true, queueToken: true, opdBooking: true, patientRegistration: true },
          billingStaff: { chargeSlip: true, discountAuth: true, generateBills: true, collectPayments: true, refundProcessing: true },
          technician: { sampleCollection: false, enterResults: false, reportRelease: false },
          pharmacist: { dispenseMedication: false, substituteGeneric: false, inventoryAdjustment: false },
        },
      };
  }
}

export interface DepartmentAuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

interface Props {
  department: DepartmentProfileData;
  allDepartments: DepartmentProfileData[];
  initialTab?: string;
  onBack: () => void;
  onSave: (updated: DepartmentProfileData) => void;
  onDelete?: (id: string) => void;
}

export const DepartmentProfileView: React.FC<Props> = ({
  department,
  allDepartments,
  initialTab,
  onBack,
  onSave,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'basic');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const navigate = useNavigate();

  // Initialize editable form with fallback defaults
  const hospitalShifts = useMemo(() => getHospitalShifts(), []);
  const hospitalStaff = useMemo(() => getHospitalStaff(), []);
  const [campusBuildings, setCampusBuildings] = useState<BuildingNode[]>(() => getCampusBuildings());
  const [profile, setProfile] = useState<DepartmentProfileData>({
    ...department,
    shortName: department.shortName || department.code.replace('DEPT-', ''),
    description:
      department.description ||
      `Primary operational division providing healthcare, diagnostics or administrative support for ${department.name}.`,
    revenueCenter: department.revenueCenter || `RC-${department.costCenter.replace('CC-', '')}`,
    budget: department.budget || (department.category === 'clinical' ? 450000 : 180000),
    billingEnabled: department.billingEnabled !== undefined ? department.billingEnabled : true,
    isOpen24Hours: department.isOpen24Hours !== undefined ? department.isOpen24Hours : department.hours.includes('24/7'),
    workingDays: department.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    shiftPattern: department.shiftPattern || (department.hours.includes('24/7') ? '3-Shift 24x7 (Rotational)' : 'General 2-Shift (08:00 - 20:00)'),
    appointmentBased: department.appointmentBased !== undefined ? department.appointmentBased : department.category === 'clinical',
    walkInAllowed: department.walkInAllowed !== undefined ? department.walkInAllowed : true,
    emergencyEnabled: department.emergencyEnabled !== undefined ? department.emergencyEnabled : ['DEPT-ER', 'DEPT-ICU'].includes(department.code),

    // Clinical
    consultationEnabled: department.consultationEnabled !== undefined ? department.consultationEnabled : department.category === 'clinical',
    admissionEnabled: department.admissionEnabled !== undefined ? department.admissionEnabled : ['DEPT-IPD', 'DEPT-ICU', 'DEPT-ER'].includes(department.code),
    procedureEnabled: department.procedureEnabled !== undefined ? department.procedureEnabled : ['DEPT-OT', 'DEPT-ER', 'DEPT-DIAL'].includes(department.code),
    labRequestsEnabled: department.labRequestsEnabled !== undefined ? department.labRequestsEnabled : ['clinical', 'diagnostic'].includes(department.category),
    prescriptionEnabled: department.prescriptionEnabled !== undefined ? department.prescriptionEnabled : department.category === 'clinical',

    // Staff
    doctorsCount: department.doctorsCount || (department.category === 'clinical' ? 8 : 1),
    nursesCount: department.nursesCount || (department.category === 'clinical' ? 14 : 0),
    techsCount: department.techsCount || (['clinical', 'diagnostic'].includes(department.category) ? 6 : 2),
    receptionistsCount: department.receptionistsCount || 2,
    onCallRoster: department.onCallRoster || 'Duty Registrar (Ext: 104) • Senior Consultant on SMS Page',

    // Infrastructure & Campus links
    buildingAssigned: department.buildingAssigned || (department.category === 'clinical' ? 'North Central Hospital Tower' : 'Diagnostic & Oncology Pavilion'),
    floorAssigned: department.floorAssigned || 'Floor 1 - Wing A',
    roomsCount: department.roomsCount || 6,
    wardsCount: department.wardsCount || (['DEPT-IPD', 'DEPT-ICU', 'DEPT-NICU'].includes(department.code) ? 2 : 0),
    bedsCount: department.bedsCount || (['DEPT-IPD', 'DEPT-ICU', 'DEPT-NICU'].includes(department.code) ? 36 : 0),
    hasDedicatedWaitingArea: department.hasDedicatedWaitingArea !== undefined ? department.hasDedicatedWaitingArea : true,
    assignedBuildingId: department.assignedBuildingId || 'bld-main-1',
    assignedFloorIds: department.assignedFloorIds || [],
    assignedWardIds: department.assignedWardIds || [],
    assignedRoomIds: department.assignedRoomIds || [],

    // Documents
    documents: department.documents || [
      { id: '1', title: `${department.name} Clinical Standard Operating Procedure`, type: 'SOP', version: 'v2.4', updatedAt: '2026-08-15', status: 'Approved' },
      { id: '2', title: 'Emergency Response & Evacuation Protocol', type: 'Emergency Protocol', version: 'v1.2', updatedAt: '2026-07-10', status: 'Approved' },
      { id: '3', title: 'Department Infection Control & Sterilization Guide', type: 'Clinical Guidelines', version: 'v3.0', updatedAt: '2026-09-01', status: 'In Review' },
    ],

    // Permissions & Capabilities
    permissions: department.permissions || DEFAULT_DEPARTMENT_PERMISSIONS,
    capabilities: department.capabilities || {
      canConsult: department.consultationEnabled !== undefined ? department.consultationEnabled : department.category === 'clinical',
      canPrescribe: department.prescriptionEnabled !== undefined ? department.prescriptionEnabled : department.category === 'clinical',
      canOrderDiagnostics: department.labRequestsEnabled !== undefined ? department.labRequestsEnabled : ['clinical', 'diagnostic'].includes(department.category),
      canAdmitPatients: department.admissionEnabled !== undefined ? department.admissionEnabled : ['DEPT-IPD', 'DEPT-ICU', 'DEPT-ER'].includes(department.code),
      canPerformProcedures: department.procedureEnabled !== undefined ? department.procedureEnabled : ['DEPT-OT', 'DEPT-ER', 'DEPT-DIAL'].includes(department.code),
      canCollectPayments: department.billingEnabled !== undefined ? department.billingEnabled : true,
      canEmergencyBypass: department.emergencyEnabled !== undefined ? department.emergencyEnabled : ['DEPT-ER', 'DEPT-ICU'].includes(department.code),
      canTeleconsult: department.allowTeleconsultation !== undefined ? department.allowTeleconsultation : true,
      canDischarge: ['DEPT-IPD', 'DEPT-ICU', 'DEPT-ER'].includes(department.code),
    },
    staffOverrides: department.staffOverrides || [],

    // Capacity & Flow
    dailyConsultationCapacity: department.dailyConsultationCapacity !== undefined ? department.dailyConsultationCapacity : 120,
    concurrentDoctorSlots: department.concurrentDoctorSlots !== undefined ? department.concurrentDoctorSlots : 6,
    emergencyBufferCapacity: department.emergencyBufferCapacity !== undefined ? department.emergencyBufferCapacity : 20,
    maxWaitingQueueLength: department.maxWaitingQueueLength !== undefined ? department.maxWaitingQueueLength : 40,

    // Live KPIs
    avgConsultationMinutes: department.avgConsultationMinutes !== undefined ? department.avgConsultationMinutes : 12,
    patientFootfallDaily: department.patientFootfallDaily !== undefined ? department.patientFootfallDaily : 96,
    bedOccupancyRate: department.bedOccupancyRate !== undefined ? department.bedOccupancyRate : 82,
    patientSatisfactionScore: department.patientSatisfactionScore !== undefined ? department.patientSatisfactionScore : 4.8,
    prescriptionsIssuedToday: department.prescriptionsIssuedToday !== undefined ? department.prescriptionsIssuedToday : 74,

    // Timings
    opdStartTime: department.opdStartTime || '08:30',
    opdEndTime: department.opdEndTime || '17:30',
    breakStartTime: department.breakStartTime || '13:00',
    breakEndTime: department.breakEndTime || '14:00',
    shiftHandoverMinutes: department.shiftHandoverMinutes !== undefined ? department.shiftHandoverMinutes : 30,

    // Settings
    allowTeleconsultation: department.allowTeleconsultation !== undefined ? department.allowTeleconsultation : true,
    autoTokenGeneration: department.autoTokenGeneration !== undefined ? department.autoTokenGeneration : true,
    requireVitalsBeforeConsultation: department.requireVitalsBeforeConsultation !== undefined ? department.requireVitalsBeforeConsultation : true,
    requirePrePaymentForConsultation: department.requirePrePaymentForConsultation !== undefined ? department.requirePrePaymentForConsultation : false,
    allowEmergencyWalkInBypass: department.allowEmergencyWalkInBypass !== undefined ? department.allowEmergencyWalkInBypass : true,
    enableSmsTokenAlerts: department.enableSmsTokenAlerts !== undefined ? department.enableSmsTokenAlerts : true,

    // Leadership
    hodStaffId: department.hodStaffId || '',
    hodStaffName: department.hodStaffName || department.head,
    deptAdminStaffId: department.deptAdminStaffId || '',
    deptAdminStaffName: department.deptAdminStaffName || `${department.shortName || 'Dept'} Administrator`,

    // Audit Logs
    auditLogs: department.auditLogs && department.auditLogs.length > 0 ? department.auditLogs : [
      {
        id: 'aud-init',
        timestamp: new Date().toISOString(),
        action: 'DEPARTMENT_COMMISSIONED',
        performedBy: 'Hospital Super Administrator',
        details: 'Initial department profile, clinical scope, and staffing quotas established.',
        severity: 'INFO',
      },
    ],
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [targetMergeDeptId, setTargetMergeDeptId] = useState('');
  const [mergeConfirmationText, setMergeConfirmationText] = useState('');
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Campus Space Reallocation Modal
  const [isReallocateModalOpen, setIsReallocateModalOpen] = useState(false);
  const [tempBuildingId, setTempBuildingId] = useState('bld-main-1');
  const [tempWardIds, setTempWardIds] = useState<string[]>([]);
  const [tempRoomIds, setTempRoomIds] = useState<string[]>([]);

  // Calculate live departmental assets from the real campus master
  const { departmentalWards, departmentalRooms, liveBedStats } = useMemo(() => {
    const wardsList: Array<{ ward: WardNode; floor: FloorNode; building: BuildingNode }> = [];
    const roomsList: Array<{ room: RoomNode; floor: FloorNode; building: BuildingNode }> = [];

    campusBuildings.forEach((b) => {
      b.floors.forEach((f) => {
        f.wards.forEach((w) => {
          const isAssigned =
            (profile.assignedWardIds && profile.assignedWardIds.includes(w.id)) ||
            (w.departmentName && (w.departmentName === profile.name || w.departmentName.toLowerCase() === profile.name.toLowerCase()));
          if (isAssigned) {
            wardsList.push({ ward: w, floor: f, building: b });
          }
        });
        f.rooms.forEach((r) => {
          const isAssigned =
            (profile.assignedRoomIds && profile.assignedRoomIds.includes(r.id)) ||
            (r.departmentName && (r.departmentName === profile.name || r.departmentName.toLowerCase() === profile.name.toLowerCase()));
          if (isAssigned) {
            roomsList.push({ room: r, floor: f, building: b });
          }
        });
      });
    });

    const totalBeds = wardsList.reduce((sum, item) => sum + item.ward.beds.length, 0);
    const occupiedBeds = wardsList.reduce(
      (sum, item) => sum + item.ward.beds.filter((b) => b.status === 'OCCUPIED').length,
      0
    );
    const availableBeds = wardsList.reduce(
      (sum, item) => sum + item.ward.beds.filter((b) => b.status === 'AVAILABLE').length,
      0
    );
    const sanitizedBeds = wardsList.reduce(
      (sum, item) => sum + item.ward.beds.filter((b) => b.cleanlinessStatus === 'SANITIZED').length,
      0
    );

    return {
      departmentalWards: wardsList,
      departmentalRooms: roomsList,
      liveBedStats: {
        totalBeds: totalBeds > 0 ? totalBeds : (profile.bedsCount || 0),
        occupiedBeds,
        availableBeds: totalBeds > 0 ? availableBeds : Math.max(0, (profile.bedsCount || 0) - occupiedBeds),
        sanitizedBeds,
      },
    };
  }, [campusBuildings, profile.assignedWardIds, profile.assignedRoomIds, profile.name, profile.bedsCount]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const departmentPersonnel = useMemo(() => {
    return getDepartmentPersonnelStats(profile.id, profile.name);
  }, [profile.id, profile.name]);

  const handleToggleCapability = (capKey: keyof DepartmentCapabilities) => {
    const currentCaps = profile.capabilities || DEFAULT_DEPARTMENT_CAPABILITIES;
    const updated = {
      ...currentCaps,
      [capKey]: !currentCaps[capKey],
    };
    setProfile((prev) => ({
      ...prev,
      capabilities: updated,
    }));
  };

  const handleToggleRolePerm = (cadre: keyof DepartmentRolePermissions, action: string) => {
    const currentPerms = profile.permissions || DEFAULT_DEPARTMENT_PERMISSIONS;
    const cadrePerms = (currentPerms[cadre] as any) || (DEFAULT_DEPARTMENT_PERMISSIONS[cadre] as any) || {};
    const defaultVal = cadre === 'billingStaff' ? false : true;
    const currentVal = cadrePerms[action] !== undefined
      ? Boolean(cadrePerms[action])
      : Boolean((DEFAULT_DEPARTMENT_PERMISSIONS[cadre] as any)?.[action] ?? defaultVal);
    const updated = {
      ...currentPerms,
      [cadre]: {
        ...cadrePerms,
        [action]: !currentVal,
      },
    };
    setProfile((prev) => ({
      ...prev,
      permissions: updated as DepartmentRolePermissions,
    }));
  };

  const handleApplyPreset = (preset: DepartmentArchetypePreset) => {
    const p = getDepartmentArchetypePreset(preset);
    setProfile((prev) => ({
      ...prev,
      capabilities: p.capabilities,
      permissions: p.permissions,
    }));
    showToast(`✓ Applied "${preset}" archetype permissions preset to ${profile.name}`);
  };

  const handleUpdateStaffOverride = (
    staff: StaffMember,
    clearanceLevel: StaffDepartmentClearanceLevel,
    privilegeUpdate?: { canApproveDischarges?: boolean; canOverrideDiscounts?: boolean; canSignNarcotics?: boolean },
    customNotes?: string
  ) => {
    const existing = [...(profile.staffOverrides || [])];
    const idx = existing.findIndex((o) => o.staffId === staff.id);
    const updatedEntry: StaffPermissionOverride = {
      staffId: staff.id,
      staffName: staff.fullName,
      employeeCode: staff.employeeCode,
      role: staff.role,
      clearanceLevel,
      canApproveDischarges: privilegeUpdate?.canApproveDischarges ?? (idx >= 0 ? existing[idx].canApproveDischarges : false),
      canOverrideDiscounts: privilegeUpdate?.canOverrideDiscounts ?? (idx >= 0 ? existing[idx].canOverrideDiscounts : false),
      canSignNarcotics: privilegeUpdate?.canSignNarcotics ?? (idx >= 0 ? existing[idx].canSignNarcotics : false),
      customNotes: customNotes !== undefined ? customNotes : (idx >= 0 ? existing[idx].customNotes : ''),
      assignedAt: idx >= 0 ? existing[idx].assignedAt : new Date().toISOString(),
    };

    if (idx >= 0) {
      existing[idx] = updatedEntry;
    } else {
      existing.push(updatedEntry);
    }

    setProfile((prev) => ({
      ...prev,
      staffOverrides: existing,
    }));
  };

  const handleSavePermissions = () => {
    const caps = profile.capabilities || DEFAULT_DEPARTMENT_CAPABILITIES;
    const activeCaps = Object.entries(caps).filter(([, v]) => Boolean(v)).map(([k]) => k);
    const overridesCount = profile.staffOverrides?.length || 0;

    const auditEntry: DepartmentAuditLogEntry = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'DEPARTMENT_PERMISSIONS_UPDATED',
      performedBy: profile.head || 'Hospital Administrator',
      details: `Department permissions & access policies assigned for ${profile.name} (${profile.code}). Active capabilities: ${activeCaps.length}/9 [${activeCaps.join(', ')}]. Personnel overrides: ${overridesCount} staff configured.`,
      severity: 'INFO',
    };

    const updatedProfile: DepartmentProfileData = {
      ...profile,
      capabilities: caps,
      permissions: profile.permissions || DEFAULT_DEPARTMENT_PERMISSIONS,
      auditLogs: [auditEntry, ...(profile.auditLogs || [])].slice(0, 100),
    };

    setProfile(updatedProfile);
    onSave(updatedProfile);
    showToast(`✓ Department permissions & access controls for "${profile.name}" successfully saved!`);
  };

  const handleSaveAll = () => {
    syncDepartmentToCampus(
      profile.name,
      profile.assignedBuildingId || 'bld-main-1',
      profile.assignedWardIds || [],
      profile.assignedRoomIds || []
    );

    const auditEntry: DepartmentAuditLogEntry = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'CONFIGURATION_UPDATED',
      performedBy: profile.head || 'Hospital Administrator',
      details: `Department capacity (${profile.dailyConsultationCapacity || 120}/day), timings (${profile.hours}), and operational settings updated.`,
      severity: 'INFO',
    };

    const updatedProfile: DepartmentProfileData = {
      ...profile,
      auditLogs: [auditEntry, ...(profile.auditLogs || [])].slice(0, 100),
    };

    setProfile(updatedProfile);
    onSave(updatedProfile);
    showToast(`✓ Department profile for "${profile.name}" saved successfully!`);
  };

  const handleOpenReallocateModal = () => {
    const currentBuildingId = profile.assignedBuildingId || campusBuildings[0]?.id || 'bld-main-1';
    setTempBuildingId(currentBuildingId);
    setTempWardIds(departmentalWards.map((item) => item.ward.id));
    setTempRoomIds(departmentalRooms.map((item) => item.room.id));
    setIsReallocateModalOpen(true);
  };

  const handleSaveReallocation = () => {
    const targetBuilding = campusBuildings.find((b) => b.id === tempBuildingId) || campusBuildings[0];
    let totalBeds = 0;
    let totalWards = 0;
    let totalRooms = 0;
    const floorNumbers = new Set<string>();

    targetBuilding.floors.forEach((f) => {
      f.wards.forEach((w) => {
        if (tempWardIds.includes(w.id)) {
          totalWards += 1;
          totalBeds += w.beds.length;
          floorNumbers.add(f.floorNumber);
        }
      });
      f.rooms.forEach((r) => {
        if (tempRoomIds.includes(r.id)) {
          totalRooms += 1;
          floorNumbers.add(f.floorNumber);
        }
      });
    });

    const updated: DepartmentProfileData = {
      ...profile,
      assignedBuildingId: tempBuildingId,
      buildingAssigned: targetBuilding.name,
      floorAssigned: Array.from(floorNumbers).join(', ') || profile.floorAssigned,
      assignedWardIds: tempWardIds,
      assignedRoomIds: tempRoomIds,
      wardsCount: totalWards,
      bedsCount: totalBeds,
      roomsCount: totalRooms,
    };

    setProfile(updated);
    syncDepartmentToCampus(profile.name, tempBuildingId, tempWardIds, tempRoomIds);
    setCampusBuildings(getCampusBuildings());
    setIsReallocateModalOpen(false);
    showToast(
      `✓ Campus infrastructure reallocated: ${totalWards} wards (${totalBeds} beds) & ${totalRooms} rooms allocated to ${profile.name}!`
    );
  };

  const handleMergeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mergeConfirmationText.trim().toUpperCase() !== 'MERGE') {
      alert('Please type MERGE to confirm department consolidation.');
      return;
    }
    const targetDept = allDepartments.find((d) => d.id === targetMergeDeptId);
    const updated: DepartmentProfileData = {
      ...profile,
      status: 'MERGED',
      description: `${profile.description} [Consolidated into ${targetDept?.name || 'target department'} on ${new Date().toLocaleDateString()}]`,
    };
    setProfile(updated);
    onSave(updated);
    setIsMergeModalOpen(false);
    showToast(`✓ Department successfully consolidated into ${targetDept?.name || 'target department'}!`);
  };

  const handleArchiveConfirm = () => {
    const updated: DepartmentProfileData = {
      ...profile,
      status: 'ARCHIVED',
    };
    setProfile(updated);
    onSave(updated);
    setIsArchiveModalOpen(false);
    showToast(`✓ Department marked as ARCHIVED. Historical patient and financial records remain preserved.`);
  };

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (day: string) => {
    const current = profile.workingDays || [];
    if (current.includes(day)) {
      setProfile({ ...profile, workingDays: current.filter((d) => d !== day) });
    } else {
      setProfile({ ...profile, workingDays: [...current, day] });
    }
  };

  const isClinical = ['clinical', 'diagnostic'].includes(profile.category);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast Banner */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            padding: '0.875rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Breadcrumb */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--card-bg, #ffffff)',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onBack}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem' }}
          >
            <ArrowLeft size={16} /> Back to Departments
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                {profile.name}
              </h2>
              <span
                className={`badge ${
                  profile.category === 'clinical'
                    ? 'badge-info'
                    : profile.category === 'diagnostic'
                    ? 'badge-warning'
                    : profile.category === 'revenue'
                    ? 'badge-success'
                    : 'badge-secondary'
                }`}
              >
                {profile.category.toUpperCase()}
              </span>
              <span
                className={`badge ${
                  profile.status === 'ACTIVE'
                    ? 'badge-success'
                    : profile.status === 'UNDER_MAINTENANCE'
                    ? 'badge-warning'
                    : 'badge-secondary'
                }`}
              >
                {profile.status}
              </span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Department Code: <strong>{profile.code}</strong> • Cost Center: <strong>{profile.costCenter}</strong> • Head: <strong>{profile.head}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleOpenReallocateModal}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
          >
            <Building2 size={15} /> Reallocate Space
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const deptTarget = profile.code ? profile.code.toLowerCase().replace('dept-', '') : profile.id;
              navigate(`/department/${deptTarget}`);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontSize: '0.8125rem',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
            }}
          >
            <LayoutGrid size={15} /> Open Workspace ↗
          </button>
          {isEditMode ? (
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditMode(false)}
                style={{ fontSize: '0.8125rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  handleSaveAll();
                  setIsEditMode(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
              >
                <Save size={15} /> Save Changes
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsEditMode(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
            >
              <Edit2 size={15} /> ✏️ Edit Department
            </button>
          )}
        </div>
      </div>

      {/* Executive Administrative KPI Command Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Active Personnel
          </span>
          <span style={{ fontSize: '1.375rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--primary)' }}>
            {(profile.doctorsCount || 0) + (profile.nursesCount || 0) + (profile.techsCount || 0) + (profile.receptionistsCount || 0)} Deployed Staff
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {profile.doctorsCount || 0} Doctors • {profile.nursesCount || 0} Nurses • {profile.techsCount || 0} Techs
          </span>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span
              className="badge"
              style={{
                fontSize: '0.6875rem',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: 'var(--primary)',
                padding: '0.125rem 0.375rem',
              }}
            >
              {liveBedStats.totalBeds > 0 && (profile.nursesCount || 0) > 0
                ? `1 Nurse : ${(liveBedStats.totalBeds / (profile.nursesCount || 1)).toFixed(1)} Beds`
                : 'Ambulatory OPD Model'}
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Physical Footprint
          </span>
          <span style={{ fontSize: '1.375rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--secondary)' }}>
            {profile.roomsCount || departmentalRooms.length || 0} Rooms • {liveBedStats.totalBeds} Beds
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {profile.buildingAssigned} ({departmentalWards.length || profile.wardsCount || 0} Wards)
          </span>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span
              className="badge badge-success"
              style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem' }}
            >
              {liveBedStats.availableBeds} Available
            </span>
            <span
              className="badge badge-warning"
              style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem' }}
            >
              {liveBedStats.occupiedBeds} Occupied
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Operating Schedule
          </span>
          <span style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.25rem', color: '#10b981' }}>
            {profile.isOpen24Hours ? '24/7 Continuous Care' : profile.hours}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {profile.shiftPattern}
          </span>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {profile.emergencyEnabled && (
              <span
                className="badge"
                style={{
                  fontSize: '0.6875rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  padding: '0.125rem 0.375rem',
                }}
              >
                Trauma ER Triage
              </span>
            )}
            {profile.walkInAllowed && (
              <span
                className="badge"
                style={{
                  fontSize: '0.6875rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  padding: '0.125rem 0.375rem',
                }}
              >
                Walk-Ins Allowed
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Financial Ledger
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color: '#0ea5e9' }}>
            ${(profile.budget || 0).toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ yr</span>
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Cost: {profile.costCenter} • Rev: {profile.revenueCenter || 'N/A'}
          </span>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span
              className={`badge ${profile.billingEnabled !== false ? 'badge-success' : 'badge-secondary'}`}
              style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem' }}
            >
              {profile.billingEnabled !== false ? '✓ Direct Patient Billing' : 'Non-Billing Ledger'}
            </span>
          </div>
        </div>
      </div>

      {/* Department Dedicated Workspace Gateway Card */}
      <div
        style={{
          backgroundColor: 'rgba(2, 132, 199, 0.05)',
          border: '1px solid rgba(2, 132, 199, 0.25)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              flexShrink: 0,
            }}
          >
            <LayoutGrid size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                {profile.name} Dedicated Workspace
              </h3>
              <span className="badge badge-success" style={{ fontSize: '0.6875rem', padding: '0.15rem 0.5rem' }}>
                Independent Engine Active
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Assigned Department Administrator: <strong style={{ color: 'var(--text-main)' }}>{profile.head}</strong> • Login Account:{' '}
              <code style={{ backgroundColor: 'rgba(0,0,0,0.06)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>
                {profile.code.toLowerCase().replace('dept-', '')}.admin@northhospital.com
              </code>
              <span style={{ marginLeft: '0.5rem', color: '#10b981', fontWeight: 600 }}>• Role Scoped</span>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActiveTab('operational')}
            style={{ fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}
          >
            Configure Policies
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const deptTarget = profile.code ? profile.code.toLowerCase().replace('dept-', '') : profile.id;
              navigate(`/department/${deptTarget}`);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem',
              padding: '0.5rem 1.125rem',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)',
            }}
          >
            <LayoutGrid size={16} /> Open {profile.shortName || 'Department'} Workspace ↗
          </button>
        </div>
      </div>

      {/* 9 Deep Profile Tabs Navigation */}
      <div
        className="subtab-bar"
        style={{
          backgroundColor: 'var(--card-bg, #ffffff)',
          padding: '0.5rem 0.75rem',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          gap: '0.375rem',
          overflowX: 'auto',
        }}
      >
        <button
          className={`subtab-pill ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          <LayoutGrid size={15} /> 1. Executive Overview
        </button>
        <button
          className={`subtab-pill ${activeTab === 'infrastructure' ? 'active' : ''}`}
          onClick={() => setActiveTab('infrastructure')}
        >
          <Building2 size={15} /> 2. Campus & Beds ({liveBedStats.totalBeds})
        </button>
        <button
          className={`subtab-pill ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          <Users size={15} /> 3. Staff Deployment
        </button>
        <button
          className={`subtab-pill ${activeTab === 'financial' ? 'active' : ''}`}
          onClick={() => setActiveTab('financial')}
        >
          <DollarSign size={15} /> 4. Financials & Tariffs
        </button>
        <button
          className={`subtab-pill ${activeTab === 'clinical' ? 'active' : ''}`}
          onClick={() => setActiveTab('clinical')}
        >
          <Stethoscope size={15} /> 5. Clinical Scope
        </button>
        <button
          className={`subtab-pill ${activeTab === 'operational' ? 'active' : ''}`}
          onClick={() => setActiveTab('operational')}
        >
          <Clock size={15} /> 6. Operational Rules
        </button>
        <button
          className={`subtab-pill ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
          style={{
            fontWeight: 600,
            color: activeTab === 'permissions' ? '#047857' : undefined,
            borderColor: activeTab === 'permissions' ? '#10b981' : undefined,
          }}
        >
          <ShieldCheck size={15} /> 7. Permissions & Access Control
        </button>
        <button
          className={`subtab-pill ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <FileText size={15} /> 8. Documents & SOPs
        </button>
        <button
          className={`subtab-pill ${activeTab === 'lifecycle' ? 'active' : ''}`}
          onClick={() => setActiveTab('lifecycle')}
        >
          <GitMerge size={15} /> 9. Status & Merge
        </button>
        <button
          className={`subtab-pill ${activeTab === 'capacity_kpis' ? 'active' : ''}`}
          onClick={() => setActiveTab('capacity_kpis')}
        >
          <Activity size={15} /> 10. Capacity & KPIs
        </button>
        <button
          className={`subtab-pill ${activeTab === 'audit_logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit_logs')}
        >
          <Shield size={15} /> 11. Audit Trail ({profile.auditLogs?.length || 1})
        </button>
      </div>

      {/* Main Tab Content Panel */}
      <div
        style={{
          backgroundColor: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.75rem',
        }}
      >
        {/* ================= 1. EXECUTIVE OVERVIEW (READ-FIRST WITH EDIT TOGGLE) ================= */}
        {activeTab === 'basic' && (
          <div>
            {!isEditMode ? (
              /* READ-FIRST EXECUTIVE OVERVIEW DOSSIER */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Executive Dossier Sub-Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid var(--border-color)',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.5px' }}>
                        Executive Administrative Command Dossier
                      </span>
                      <span className="badge badge-success">✓ Commissioned & Governed</span>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.25rem 0 0 0' }}>
                      {profile.name} ({profile.code})
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                      Stationed in {profile.buildingAssigned} • Head of Department: <strong>{profile.head}</strong>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.625rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleOpenReallocateModal}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
                    >
                      <Building2 size={15} /> Reallocate Footprint
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setIsEditMode(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
                    >
                      <Edit2 size={15} /> ✏️ Edit Department Details
                    </button>
                  </div>
                </div>

                {/* 2-Column Grid of Executive Panels */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
                  
                  {/* PANEL 1: GOVERNANCE & IDENTITY DOSSIER */}
                  <div
                    style={{
                      backgroundColor: 'var(--card-bg, #ffffff)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <ShieldCheck size={18} color="var(--primary)" />
                      <strong style={{ fontSize: '0.9375rem' }}>1. Governance & Administrative Identity</strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Official Legal Title</span>
                        <strong>{profile.name}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>System Identifier</span>
                        <code>{profile.code}</code> {profile.shortName && <span className="badge badge-secondary" style={{ marginLeft: '4px' }}>{profile.shortName}</span>}
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Operational Category</span>
                        <span className="badge badge-info" style={{ marginTop: '2px' }}>{profile.category.toUpperCase()}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Operational Status</span>
                        <span className="badge badge-success" style={{ marginTop: '2px' }}>{profile.status}</span>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Accountable Clinical Head (HOD)</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                          <User size={15} color="var(--primary)" />
                          <strong>{profile.head}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• Chief Clinician</span>
                        </div>
                      </div>
                      <div
                        style={{
                          gridColumn: 'span 2',
                          backgroundColor: 'rgba(2, 132, 199, 0.05)',
                          border: '1px solid rgba(2, 132, 199, 0.2)',
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '0.25rem',
                        }}
                      >
                        <div>
                          <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, display: 'block' }}>
                            Dedicated Workspace Administrator
                          </span>
                          <div style={{ fontSize: '0.8125rem', marginTop: '2px' }}>
                            <strong>{profile.head}</strong>{' '}
                            <code style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                              {profile.code.toLowerCase().replace('dept-', '')}.admin@northhospital.com
                            </code>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Scope: Strictly scoped to {profile.name} (Zero access to global hospital admin)
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            const deptTarget = profile.code ? profile.code.toLowerCase().replace('dept-', '') : profile.id;
                            navigate(`/department/${deptTarget}`);
                          }}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.375rem 0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                            border: 'none',
                            color: '#ffffff',
                            fontWeight: 600,
                          }}
                        >
                          <LayoutGrid size={13} /> Launch ↗
                        </button>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Emergency Intercom & Escalation</span>
                        <span style={{ fontSize: '0.8125rem' }}>{profile.onCallRoster || 'Ext: 104 • Speed Dial #881 (Duty Registrar)'}</span>
                      </div>
                    </div>

                    {profile.description && (
                      <div
                        style={{
                          backgroundColor: 'var(--bg-subtle, #f9fafb)',
                          borderLeft: '3px solid var(--primary)',
                          padding: '0.625rem 0.875rem',
                          borderRadius: '0 6px 6px 0',
                          fontSize: '0.8125rem',
                          color: 'var(--text-color)',
                          fontStyle: 'italic',
                          lineHeight: 1.4,
                        }}
                      >
                        "{profile.description}"
                      </div>
                    )}
                  </div>

                  {/* PANEL 2: PHYSICAL CAMPUS ALLOCATION & BED FOOTPRINT */}
                  <div
                    style={{
                      backgroundColor: 'var(--card-bg, #ffffff)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={18} color="var(--primary)" />
                        <strong style={{ fontSize: '0.9375rem' }}>2. Campus Physical Footprint & Beds</strong>
                      </div>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                        {liveBedStats.totalBeds} Beds • {departmentalRooms.length || profile.roomsCount || 0} Chambers
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Assigned Complex:</span>
                        <strong>{profile.buildingAssigned}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Floors / Wings:</span>
                        <span>{profile.floorAssigned}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Waiting Area & Token LED:</span>
                        <span className="badge badge-success">
                          {profile.hasDedicatedWaitingArea ? '✓ Dedicated Lounge with LED Queue' : 'Central Shared Lounge'}
                        </span>
                      </div>

                      {/* Clinical Wards Breakdown */}
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.375rem' }}>
                          Allocated Inpatient Wards:
                        </span>
                        {departmentalWards.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                            {departmentalWards.map(({ ward, floor }) => (
                              <div
                                key={ward.id}
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(37, 99, 235, 0.04)',
                                  border: '1px solid var(--border-color)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <div>
                                  <strong>{ward.name}</strong>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                                    {floor.floorNumber} • Sister {ward.supervisorNurse}
                                  </span>
                                </div>
                                <span className="badge badge-info">{ward.beds.length} Beds</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-subtle, #f9fafb)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            No overnight inpatient wards allocated (Ambulatory OPD / Diagnostic unit).
                          </div>
                        )}
                      </div>

                      {/* Consultation Chambers */}
                      {departmentalRooms.length > 0 && (
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.375rem' }}>
                            Consultation & Procedure Chambers:
                          </span>
                          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                            {departmentalRooms.map(({ room }) => (
                              <span key={room.id} className="badge badge-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                🚪 Room {room.roomNumber} ({room.roomType})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PANEL 3: CLINICAL PRIVILEGES & HMS CAPABILITIES */}
                  <div
                    style={{
                      backgroundColor: 'var(--card-bg, #ffffff)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <Stethoscope size={18} color="var(--primary)" />
                      <strong style={{ fontSize: '0.9375rem' }}>3. Clinical Governance & HMS Privileges</strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                      {[
                        { label: 'OPD Appointments', enabled: profile.consultationEnabled, desc: 'Accepts scheduled patient bookings' },
                        { label: 'IPD Bed Admissions', enabled: profile.admissionEnabled, desc: 'Can admit patients to hospital beds' },
                        { label: 'OT Surgical Booking', enabled: profile.procedureEnabled, desc: 'Can reserve operation theatre suites' },
                        { label: 'Digital E-Prescriptions', enabled: profile.prescriptionEnabled, desc: 'Issues pharmacy dispensary orders' },
                        { label: 'Diagnostic Requisitions', enabled: profile.labRequestsEnabled, desc: 'Orders pathology, biochemistry & MRI' },
                        { label: 'Emergency Trauma Triage', enabled: profile.emergencyEnabled, desc: 'Receives ambulance code-red alerts' },
                      ].map((item) => (
                        <div
                          key={item.label}
                          style={{
                            padding: '0.625rem',
                            borderRadius: '8px',
                            border: `1px solid ${item.enabled ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                            backgroundColor: item.enabled ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-subtle, #f9fafb)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.125rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            {item.enabled ? (
                              <CheckCircle2 size={15} color="#10b981" />
                            ) : (
                              <X size={15} color="var(--text-muted)" />
                            )}
                            <strong style={{ fontSize: '0.8125rem', color: item.enabled ? 'var(--text-color)' : 'var(--text-muted)' }}>
                              {item.label}
                            </strong>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '1.3rem' }}>
                            {item.desc}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PANEL 4: FINANCIAL ACCOUNTING & BILLING RULES */}
                  <div
                    style={{
                      backgroundColor: 'var(--card-bg, #ffffff)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <DollarSign size={18} color="var(--primary)" />
                      <strong style={{ fontSize: '0.9375rem' }}>4. Financial Accounting & Billing Rules</strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>GL Cost Center</span>
                        <code style={{ fontSize: '0.875rem' }}>{profile.costCenter}</code>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>GL Revenue Center</span>
                        <code style={{ fontSize: '0.875rem' }}>{profile.revenueCenter || 'RC-CLN-01'}</code>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Default Specialist OPD Tariff</span>
                        <strong style={{ fontSize: '1rem', color: '#10b981' }}>$50.00 / ₹800</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Follow-up Visit Policy</span>
                        <span className="badge badge-info" style={{ marginTop: '2px' }}>Free within 7 Days</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Annual Operating Budget</span>
                        <strong style={{ fontSize: '1rem' }}>${(profile.budget || 0).toLocaleString()}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Direct Cashier Billing</span>
                        <span className={`badge ${profile.billingEnabled !== false ? 'badge-success' : 'badge-secondary'}`} style={{ marginTop: '2px' }}>
                          {profile.billingEnabled !== false ? '✓ Enabled' : 'Non-Billing Ledger'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PANEL 5: STAFF DEPLOYMENT & SAFETY RATIO (Full Width) */}
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      backgroundColor: 'var(--card-bg, #ffffff)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={18} color="var(--primary)" />
                        <strong style={{ fontSize: '0.9375rem' }}>5. Staff Deployment Quotas & Safety Roster</strong>
                      </div>
                      <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                        {(profile.doctorsCount || 0) + (profile.nursesCount || 0) + (profile.techsCount || 0) + (profile.receptionistsCount || 0)} Total Personnel
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                      <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle, #f9fafb)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attending Doctors</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.25rem' }}>
                          {profile.doctorsCount || 0} Physicians
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Specialists & Residents</span>
                      </div>

                      <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle, #f9fafb)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nursing Staff</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981', marginTop: '0.25rem' }}>
                          {profile.nursesCount || 0} Nurses
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sisters & Floor Care</span>
                      </div>

                      <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle, #f9fafb)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Technical & Paramedical</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0ea5e9', marginTop: '0.25rem' }}>
                          {profile.techsCount || 0} Technicians
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Compounders & Techs</span>
                      </div>

                      <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle, #f9fafb)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Front Desk & Clerks</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8b5cf6', marginTop: '0.25rem' }}>
                          {profile.receptionistsCount || 0} Clerks
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Token & Check-In Desk</span>
                      </div>

                      <div style={{ padding: '0.75rem', backgroundColor: 'rgba(37, 99, 235, 0.04)', borderRadius: '8px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 700 }}>Nurse-to-Bed Safety</span>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.25rem' }}>
                          {liveBedStats.totalBeds > 0 && (profile.nursesCount || 0) > 0
                            ? `1 : ${(liveBedStats.totalBeds / (profile.nursesCount || 1)).toFixed(1)} Ratio`
                            : 'Ambulatory OPD'}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>✓ Within Accreditation Norms</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              /* EDIT MODE ACTIVE: INTERACTIVE INPUT FORM */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Edit Mode Notice Banner */}
                <div
                  style={{
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    border: '1px solid var(--primary)',
                    borderRadius: '8px',
                    padding: '0.875rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Edit2 size={16} color="var(--primary)" />
                    <strong style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>
                      Edit Mode Active: Modify department identity, clinical scope, and administrative settings.
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsEditMode(false)}
                      style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        handleSaveAll();
                        setIsEditMode(false);
                      }}
                      style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                    >
                      <Save size={14} /> Save Changes
                    </button>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                    Department Identity & Classification Form
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                    Define core naming, official hospital abbreviation, functional classification category, and scope of operations.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Official Department Name</label>
                    <input
                      className="form-input"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="e.g. Emergency & Trauma Center"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">System Department Code</label>
                    <input
                      className="form-input"
                      value={profile.code}
                      onChange={(e) => setProfile({ ...profile, code: e.target.value })}
                      placeholder="e.g. DEPT-ER"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Short Name / Display Acronym</label>
                    <input
                      className="form-input"
                      value={profile.shortName || ''}
                      onChange={(e) => setProfile({ ...profile, shortName: e.target.value })}
                      placeholder="e.g. Emergency / ER"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Classification Category</label>
                    <select
                      className="form-select"
                      value={profile.category}
                      onChange={(e) => setProfile({ ...profile, category: e.target.value as any })}
                    >
                      <option value="clinical">Clinical Care</option>
                      <option value="diagnostic">Diagnostic & Imaging</option>
                      <option value="revenue">Revenue & Patient Billing</option>
                      <option value="admin">Administration & HR</option>
                      <option value="support">Support & Facilities</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Head of Department (HOD)</label>
                    <input
                      className="form-input"
                      value={profile.head}
                      onChange={(e) => setProfile({ ...profile, head: e.target.value })}
                      placeholder="e.g. Dr. Neil Patrick, MD"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Current Operational Status</label>
                    <select
                      className="form-select"
                      value={profile.status}
                      onChange={(e) => setProfile({ ...profile, status: e.target.value as any })}
                    >
                      <option value="ACTIVE">Active (In Operation)</option>
                      <option value="UNDER_MAINTENANCE">Under Maintenance / Renovation</option>
                      <option value="INACTIVE">Inactive (Temporarily Suspended)</option>
                      <option value="ARCHIVED">Archived (Decommissioned)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Department Description & Scope</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={profile.description || ''}
                    onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                    placeholder="Detail clinical specializations, patient intake policies, or internal administrative responsibilities..."
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= 2. OPERATIONAL SETTINGS ================= */}
        {activeTab === 'operational' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                Operational Schedules & Intake Rules
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Configure operating schedules, shifts, walk-in tokens, and emergency intake capabilities.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-subtle, #f9fafb)',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={profile.isOpen24Hours || false}
                    onChange={(e) => setProfile({ ...profile, isOpen24Hours: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Open 24 Hours (Continuous Service)</strong>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Enables non-stop round-the-clock shift assignments (mandatory for ER, ICU, Labour Ward).
                    </span>
                  </div>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Shift Pattern</label>
                <select
                  className="form-select"
                  value={profile.shiftPattern || ''}
                  onChange={(e) => setProfile({ ...profile, shiftPattern: e.target.value })}
                >
                  <option value="3-Shift 24x7 (Rotational)">3-Shift 24x7 (Morning / Evening / Night)</option>
                  <option value="General 2-Shift (08:00 - 20:00)">General 2-Shift (08:00 - 14:00, 14:00 - 20:00)</option>
                  <option value="Single General Shift (09:00 - 17:00)">Single General Shift (09:00 - 17:00)</option>
                  <option value="On-Call Emergency Duty">On-Call Emergency Duty (Specialist Coverage)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Standard Working Hours Display</label>
                <input
                  className="form-input"
                  value={profile.hours}
                  onChange={(e) => setProfile({ ...profile, hours: e.target.value })}
                  placeholder="e.g. 08:00 - 20:00 (Mon-Sat) or 24/7"
                />
              </div>
            </div>

            {/* Working Days Selector */}
            <div>
              <label className="form-label">Active Working Days</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.375rem' }}>
                {daysOfWeek.map((day) => {
                  const isSelected = (profile.workingDays || []).includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                        backgroundColor: isSelected ? 'var(--primary)' : 'var(--card-bg, #ffffff)',
                        color: isSelected ? '#ffffff' : 'var(--text-color)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Intake Toggles */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginTop: '0.5rem',
              }}
            >
              <div
                style={{
                  padding: '1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.appointmentBased || false}
                  onChange={(e) => setProfile({ ...profile, appointmentBased: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.875rem', display: 'block' }}>Appointment Based</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Requires booking slot</span>
                </div>
              </div>

              <div
                style={{
                  padding: '1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.walkInAllowed || false}
                  onChange={(e) => setProfile({ ...profile, walkInAllowed: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.875rem', display: 'block' }}>Walk-Ins Permitted</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Direct kiosk / reception queuing</span>
                </div>
              </div>

              <div
                style={{
                  padding: '1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.emergencyEnabled || false}
                  onChange={(e) => setProfile({ ...profile, emergencyEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.875rem', display: 'block' }}>Emergency Trauma Intake</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Priority triage code enabled</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 3. FINANCIAL SETTINGS ================= */}
        {activeTab === 'financial' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                Cost Center & Revenue Management
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Link hospital general ledger cost centers, revenue streams, department operational budgets, and billing authorization.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Cost Center Code (General Ledger)</label>
                <input
                  className="form-input"
                  value={profile.costCenter}
                  onChange={(e) => setProfile({ ...profile, costCenter: e.target.value })}
                  placeholder="e.g. CC-CLN-01"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Used for department expenses, equipment purchase, and supplies requisition.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Revenue Center Code</label>
                <input
                  className="form-input"
                  value={profile.revenueCenter || ''}
                  onChange={(e) => setProfile({ ...profile, revenueCenter: e.target.value })}
                  placeholder="e.g. RC-CLN-01"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Captures consultation fees, procedure billings, and diagnostic charges.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Annual Operating Budget ($ USD)</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.budget || 0}
                  onChange={(e) => setProfile({ ...profile, budget: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 450000"
                />
              </div>

              <div
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-subtle, #f9fafb)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={profile.billingEnabled !== false}
                    onChange={(e) => setProfile({ ...profile, billingEnabled: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Department Billing Enabled</strong>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Allows doctors and counters to post charges directly to patient folios.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ================= 4. CLINICAL SETTINGS ================= */}
        {activeTab === 'clinical' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                  Clinical Workflow Capabilities
                </h3>
                {!isClinical && (
                  <span className="badge badge-warning">
                    Notice: Department is classified under non-clinical '{profile.category}'
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Define which medical actions doctors and nurses can execute inside this department in the HMS.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.consultationEnabled || false}
                  onChange={(e) => setProfile({ ...profile, consultationEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Consultation Notes Enabled</strong>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Doctors can author OPD/IPD SOAP clinical notes, diagnoses, and symptom assessments.
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.admissionEnabled || false}
                  onChange={(e) => setProfile({ ...profile, admissionEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Inpatient Admission Enabled</strong>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Permits admitting patients to ward beds under this department's primary care consultant.
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.procedureEnabled || false}
                  onChange={(e) => setProfile({ ...profile, procedureEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Surgical / Clinical Procedures</strong>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Authorizes booking OT slots, endoscopy suites, or minor surgery procedure charting.
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.labRequestsEnabled || false}
                  onChange={(e) => setProfile({ ...profile, labRequestsEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Lab & Imaging Orders</strong>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Allows requisitioning biochemistry, hematology, CT, MRI, and ultrasound requisitions.
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.prescriptionEnabled || false}
                  onChange={(e) => setProfile({ ...profile, prescriptionEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.9375rem', display: 'block' }}>E-Prescription & Pharmacy Dispense</strong>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Generates official stamped Rx with drug-interaction checks and dosage scheduling.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 5. STAFF SETTINGS ================= */}
        {activeTab === 'staff' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                Department Staffing Deployment & Clinical Roster
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Assign accountable medical leadership, doctor/nurse headcount, and monitor bed-to-nurse clinical safety ratios.
              </p>
            </div>

            {/* HOD Accountability Card */}
            <div
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.25rem',
                alignItems: 'center',
              }}
            >
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={16} color="var(--primary)" /> Head of Department (HOD) / Chief Clinician
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    className="form-select"
                    value={profile.head}
                    onChange={(e) => setProfile({ ...profile, head: e.target.value })}
                  >
                    <option value="">-- Select Staff from Staff Master --</option>
                    <optgroup label="Doctors & Clinical Specialists (Staff Master)">
                      {hospitalStaff
                        .filter((s) => s.role === 'doctor')
                        .map((doc) => (
                          <option key={doc.id} value={doc.fullName}>
                            {doc.fullName} [{doc.employeeCode}] — {doc.designation}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="All Other Staff Members">
                      {hospitalStaff
                        .filter((s) => s.role !== 'doctor')
                        .map((stf) => (
                          <option key={stf.id} value={stf.fullName}>
                            {stf.fullName} [{stf.employeeCode}] — {stf.designation}
                          </option>
                        ))}
                    </optgroup>
                    {profile.head && !hospitalStaff.some((s) => s.fullName === profile.head) && (
                      <option value={profile.head}>{profile.head} (Custom HOD)</option>
                    )}
                  </select>
                  <input
                    className="form-input"
                    style={{ flex: '1 1 200px' }}
                    value={profile.head}
                    onChange={(e) => setProfile({ ...profile, head: e.target.value })}
                    placeholder="Or type custom clinician name"
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Primary physician legally and clinically accountable for departmental protocols.
                </span>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Duty Shift Pattern & Timings</label>
                <select
                  className="form-select"
                  value={profile.shiftPattern || ''}
                  onChange={(e) => setProfile({ ...profile, shiftPattern: e.target.value })}
                >
                  <option value="Rotational Multi-Shift (Morning / Evening / Night)">Rotational Multi-Shift (Morning / Evening / Night)</option>
                  <optgroup label="Hospital Profile Configured Shifts">
                    {hospitalShifts.map((sh) => (
                      <option key={sh.id} value={`Dedicated Shift: ${sh.name} (${sh.startTime} - ${sh.endTime})`}>
                        {sh.name} • {sh.startTime} - {sh.endTime} ({sh.duration})
                      </option>
                    ))}
                  </optgroup>
                  <option value="General 2-Shift (08:00 - 20:00)">General 2-Shift (08:00 - 20:00 OPD / Daycare)</option>
                  <option value="Single Day Shift (09:00 - 17:00)">Single Day Shift (09:00 - 17:00 Administrative)</option>
                  <option value="On-Call Emergency Rotation">On-Call Emergency Rotation (Trauma Roster)</option>
                </select>
              </div>
            </div>

            {/* Staff Deployment Headcount */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group" style={{ backgroundColor: 'var(--card-bg, #ffffff)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Consultant Doctors</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.doctorsCount || 0}
                  onChange={(e) => setProfile({ ...profile, doctorsCount: parseInt(e.target.value) || 0 })}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attending & resident specialists</span>
              </div>

              <div className="form-group" style={{ backgroundColor: 'var(--card-bg, #ffffff)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Registered Nurses</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.nursesCount || 0}
                  onChange={(e) => setProfile({ ...profile, nursesCount: parseInt(e.target.value) || 0 })}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ward sisters & staff nurses</span>
              </div>

              <div className="form-group" style={{ backgroundColor: 'var(--card-bg, #ffffff)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Technicians & Paramedics</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.techsCount || 0}
                  onChange={(e) => setProfile({ ...profile, techsCount: parseInt(e.target.value) || 0 })}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lab, OT & dialysis assistants</span>
              </div>

              <div className="form-group" style={{ backgroundColor: 'var(--card-bg, #ffffff)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Front Desk & Queue Handlers</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.receptionistsCount || 0}
                  onChange={(e) => setProfile({ ...profile, receptionistsCount: parseInt(e.target.value) || 0 })}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Token coordinators & clerks</span>
              </div>
            </div>

            {/* Nurse-to-Bed Clinical Safety Metric */}
            <div
              style={{
                backgroundColor: 'var(--bg-subtle, #f9fafb)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={20} color={liveBedStats.totalBeds > 0 ? '#10b981' : 'var(--primary)'} />
                  <strong style={{ fontSize: '0.9375rem' }}>Staff-to-Bed Clinical Safety Threshold</strong>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                  {liveBedStats.totalBeds > 0
                    ? `Currently ${profile.nursesCount || 0} Nurses assigned to ${liveBedStats.totalBeds} inpatient beds (${(departmentalWards.length || profile.wardsCount || 0)} wards).`
                    : 'This department operates on an ambulatory outpatient model without overnight inpatient ward beds.'}
                </p>
              </div>

              <div>
                {liveBedStats.totalBeds > 0 ? (
                  <div
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      backgroundColor:
                        (profile.nursesCount || 0) >= liveBedStats.totalBeds / 2
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(245, 158, 11, 0.12)',
                      border: `1px solid ${
                        (profile.nursesCount || 0) >= liveBedStats.totalBeds / 2
                          ? '#10b981'
                          : '#f59e0b'
                      }`,
                      textAlign: 'right',
                    }}
                  >
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, display: 'block', color: (profile.nursesCount || 0) >= liveBedStats.totalBeds / 2 ? '#047857' : '#b45309' }}>
                      Ratio: 1 Nurse per {(liveBedStats.totalBeds / (profile.nursesCount || 1)).toFixed(1)} Beds
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      {(profile.nursesCount || 0) >= liveBedStats.totalBeds / 2
                        ? '✓ Meets NABH / JCI Acute Safety Standard'
                        : '⚠ Consider deploying additional ward nurses'}
                    </span>
                  </div>
                ) : (
                  <span className="badge badge-info" style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem' }}>
                    Ambulatory OPD / Daycare Footprint
                  </span>
                )}
              </div>
            </div>

            {/* Roster of Staff Members Assigned from Staff Master */}
            <div
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                <div>
                  <strong style={{ fontSize: '0.9375rem', color: 'var(--secondary)' }}>
                    Assigned Personnel from Hospital Staff Master
                  </strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                    Active medical officers, specialists, and nursing sisters registered to this department.
                  </p>
                </div>
                <span className="badge badge-info">
                  {hospitalStaff.filter(
                    (s) =>
                      s.departmentId === profile.id ||
                      s.departmentName === profile.name ||
                      s.fullName === profile.head
                  ).length}{' '}
                  Staff Linked
                </span>
              </div>

              {hospitalStaff.filter(
                (s) =>
                  s.departmentId === profile.id ||
                  s.departmentName === profile.name ||
                  s.fullName === profile.head
              ).length === 0 ? (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-subtle, #f8fafc)',
                    border: '1px dashed var(--border-color)',
                    textAlign: 'center',
                    fontSize: '0.8125rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  No specific personnel records are currently linked to this department in the Staff Master.
                  You can assign staff when registering departments or manage their assignments under <strong>3. Staff Master</strong>.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                  {hospitalStaff
                    .filter(
                      (s) =>
                        s.departmentId === profile.id ||
                        s.departmentName === profile.name ||
                        s.fullName === profile.head
                    )
                    .map((staff) => (
                      <div
                        key={staff.id}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          backgroundColor: 'var(--bg-subtle, #f8fafc)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <strong style={{ fontSize: '0.8125rem' }}>{staff.fullName}</strong>
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                backgroundColor: staff.role === 'doctor' ? '#e0f2fe' : '#dcfce7',
                                color: staff.role === 'doctor' ? '#0369a1' : '#15803d',
                                fontWeight: 600,
                              }}
                            >
                              {staff.employeeCode}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {staff.designation}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              color: '#0369a1',
                              display: 'block',
                            }}
                          >
                            {staff.shiftHours}
                          </span>
                          <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                            {staff.shiftName.split(' ')[0]} Shift
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">On-Call Emergency Specialist Roster & Emergency Pager</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={profile.onCallRoster || ''}
                onChange={(e) => setProfile({ ...profile, onCallRoster: e.target.value })}
                placeholder="e.g. Primary On-Call: Dr. Neil Patrick (Ext: 104) • Secondary Consultant: Dr. Emily Thorne (Pager #881)"
              />
            </div>
          </div>
        )}

        {/* ================= 6. INFRASTRUCTURE & SPACE ALLOCATION ================= */}
        {activeTab === 'infrastructure' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                  Campus Infrastructure & Physical Space Allocation
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                  Real-time physical asset mapping from North Central Hospital Tower master blueprint.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleOpenReallocateModal}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <ArrowRightLeft size={16} /> Reallocate Campus Space
              </button>
            </div>

            {/* Campus Physical Footprint Summary Banner */}
            <div
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.25rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Assigned Hospital Building
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <Building2 size={18} color="var(--primary)" />
                  <strong style={{ fontSize: '1rem' }}>{profile.buildingAssigned}</strong>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Floor Location: <strong>{profile.floorAssigned || 'Level 0 & 1'}</strong>
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Wards & Aggregate Bed Capacity
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <BedDouble size={18} color="var(--secondary)" />
                  <strong style={{ fontSize: '1rem' }}>
                    {departmentalWards.length || profile.wardsCount || 0} Wards • {liveBedStats.totalBeds} Beds
                  </strong>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  {liveBedStats.occupiedBeds} Occupied • {liveBedStats.availableBeds} Available • {liveBedStats.sanitizedBeds} Sanitized
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Consultation Chambers
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <DoorClosed size={18} color="#0ea5e9" />
                  <strong style={{ fontSize: '1rem' }}>
                    {departmentalRooms.length || profile.roomsCount || 0} Rooms / Suites
                  </strong>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  OPD Consulting Chambers & Minor Procedure Suites
                </span>
              </div>
            </div>

            {/* Direct Allocated Clinical Wards */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BedDouble size={16} /> Allocated Inpatient Wards ({departmentalWards.length})
                </h4>
                <button
                  className="btn btn-secondary"
                  onClick={handleOpenReallocateModal}
                  style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}
                >
                  Manage Wards Allocation
                </button>
              </div>

              {departmentalWards.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {departmentalWards.map((item) => (
                    <div
                      key={item.ward.id}
                      style={{
                        backgroundColor: 'var(--card-bg, #ffffff)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '1.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h5 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{item.ward.name}</h5>
                            <span className="badge badge-info">{item.ward.wardType}</span>
                          </div>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            {item.floor.floorNumber} • Supervisor: <strong>{item.ward.supervisorNurse}</strong> • Station: {item.ward.nursingStation}
                          </span>
                        </div>
                        <span className="badge badge-secondary" style={{ fontSize: '0.8125rem' }}>
                          {item.ward.beds.length} Assigned Beds ({item.ward.beds.filter((b) => b.status === 'OCCUPIED').length} Occupied)
                        </span>
                      </div>

                      {/* Beds Grid for this ward */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                        {item.ward.beds.map((bed) => (
                          <div
                            key={bed.id}
                            style={{
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              padding: '0.75rem',
                              backgroundColor:
                                bed.status === 'OCCUPIED'
                                  ? 'rgba(239, 68, 68, 0.04)'
                                  : 'rgba(16, 185, 129, 0.04)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '0.875rem' }}>{bed.bedNumber}</strong>
                              <span
                                className={`badge ${
                                  bed.status === 'OCCUPIED'
                                    ? 'badge-warning'
                                    : bed.status === 'AVAILABLE'
                                    ? 'badge-success'
                                    : 'badge-secondary'
                                }`}
                                style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem' }}
                              >
                                {bed.status}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              {bed.bedType} • ${bed.dailyTariff}/day
                            </div>
                            {bed.inpatientDetails && (
                              <div
                                style={{
                                  marginTop: '0.5rem',
                                  paddingTop: '0.5rem',
                                  borderTop: '1px dashed var(--border-color)',
                                  fontSize: '0.75rem',
                                }}
                              >
                                <div>Pt: <strong>{bed.inpatientDetails.patientName}</strong></div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>
                                  {bed.inpatientDetails.uhid} • Dr: {bed.inpatientDetails.primaryDoctor.name}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '1.5rem',
                    border: '1px dashed var(--border-color)',
                    borderRadius: '10px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-subtle, #f9fafb)',
                  }}
                >
                  <BedDouble size={28} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                  <strong style={{ display: 'block', fontSize: '0.9375rem' }}>No Inpatient Wards Currently Bound</strong>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.75rem 0' }}>
                    This department currently operates on an ambulatory model or has not claimed physical inpatient wards from the campus blueprint.
                  </p>
                  <button className="btn btn-secondary" onClick={handleOpenReallocateModal}>
                    <ArrowRightLeft size={14} /> Allocate Wards from Campus Infrastructure
                  </button>
                </div>
              )}
            </div>

            {/* Direct Allocated Consultation Rooms */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <DoorClosed size={16} /> Allocated Consultation & Procedure Chambers ({departmentalRooms.length})
                </h4>
                <button
                  className="btn btn-secondary"
                  onClick={handleOpenReallocateModal}
                  style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}
                >
                  Manage Chambers
                </button>
              </div>

              {departmentalRooms.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                  {departmentalRooms.map((item) => (
                    <div
                      key={item.room.id}
                      style={{
                        backgroundColor: 'var(--card-bg, #ffffff)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.9375rem' }}>{item.room.roomNumber}</strong>
                        <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>
                          {item.room.roomType}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {item.floor.floorNumber} • Capacity: {item.room.capacity}
                      </div>
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          className={`badge ${
                            item.room.status === 'OCCUPIED' ? 'badge-warning' : 'badge-success'
                          }`}
                          style={{ fontSize: '0.6875rem' }}
                        >
                          {item.room.status}
                        </span>
                        {item.room.attendingStaff?.doctorName && (
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            {item.room.attendingStaff.doctorName}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '1.25rem',
                    border: '1px dashed var(--border-color)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-subtle, #f9fafb)',
                  }}
                >
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    No consultation chambers or procedure suites currently allocated.
                  </span>
                </div>
              )}
            </div>

            {/* Dedicated Waiting Lounge */}
            <div
              style={{
                padding: '1.25rem',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-subtle, #f9fafb)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={profile.hasDedicatedWaitingArea || false}
                  onChange={(e) => setProfile({ ...profile, hasDedicatedWaitingArea: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Dedicated Patient Waiting Lounge & Token Display</strong>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Includes digital LED token display queue screen, attendant seating, and patient check-in kiosk.
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ================= 7. DOCUMENTS & SOPS ================= */}
        {activeTab === 'documents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                  Department Documents, SOPs & Clinical Protocols
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                  Manage standard operating procedures, clinical guidelines, and regulatory compliance documents.
                </p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  const newDoc = {
                    id: Date.now().toString(),
                    title: `${profile.shortName || 'Dept'} New Operational Policy`,
                    type: 'Standard Operating Procedure (SOP)',
                    version: 'v1.0',
                    updatedAt: new Date().toISOString().split('T')[0],
                    status: 'Draft' as const,
                  };
                  setProfile({ ...profile, documents: [...(profile.documents || []), newDoc] });
                  showToast('New document entry added.');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Upload size={14} /> + Add Policy Document
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Category Type</th>
                    <th>Version</th>
                    <th>Last Updated</th>
                    <th>Approval Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.documents || []).map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <strong>{doc.title}</strong>
                      </td>
                      <td>
                        <span className="badge badge-secondary">{doc.type}</span>
                      </td>
                      <td>
                        <code>{doc.version}</code>
                      </td>
                      <td>{doc.updatedAt}</td>
                      <td>
                        <span
                          className={`badge ${
                            doc.status === 'Approved'
                              ? 'badge-success'
                              : doc.status === 'In Review'
                              ? 'badge-warning'
                              : 'badge-secondary'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="action-btn edit"
                          title="Download Document"
                          onClick={() => alert(`Downloading ${doc.title} (${doc.version})...`)}
                        >
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= 7. DEPARTMENT PERMISSIONS & ACCESS CONTROL CENTER ================= */}
        {activeTab === 'permissions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header Command Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                backgroundColor: 'rgba(5, 150, 105, 0.04)',
                border: '1px solid rgba(5, 150, 105, 0.25)',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '10px',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                    flexShrink: 0,
                  }}
                >
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                      Department Permissions & Access Governance
                    </h3>
                    <span className="badge badge-success">
                      {Object.values(profile.capabilities || DEFAULT_DEPARTMENT_CAPABILITIES).filter(Boolean).length}/9 Capabilities Active
                    </span>
                    <span className="badge badge-secondary">
                      {departmentPersonnel.total} Staff Governed
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                    Authorize what clinical, acute, and billing operations are permitted within <strong>{profile.name}</strong> ({profile.code}), configure cadre roles, and set personnel clearance tiers.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleApplyPreset(profile.category === 'diagnostic' ? 'LAB' : profile.category === 'revenue' ? 'BILLING' : 'OPD')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
                >
                  <RotateCcw size={14} /> Reset to Defaults
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSavePermissions}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8125rem',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    border: 'none',
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                  }}
                >
                  <Save size={15} /> Save Department Permissions
                </button>
              </div>
            </div>

            {/* Quick 1-Click Archetype Presets */}
            <div
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={16} color="#f59e0b" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    1-Click Department Permission Archetype Presets
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Clicking an archetype auto-configures capabilities and cadre permissions
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleApplyPreset('OPD')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}
                >
                  <Stethoscope size={14} color="#0284c7" /> OPD Ambulatory Clinic
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleApplyPreset('IPD')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}
                >
                  <BedDouble size={14} color="#6366f1" /> Inpatient Ward / ICU (IPD)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleApplyPreset('ER')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}
                >
                  <AlertTriangle size={14} color="#ef4444" /> Emergency & Trauma (ER)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleApplyPreset('LAB')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}
                >
                  <FlaskConical size={14} color="#8b5cf6" /> Diagnostic Pathology / Lab
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleApplyPreset('PHARMACY')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}
                >
                  <Pill size={14} color="#10b981" /> Pharmacy & Dispensary
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleApplyPreset('BILLING')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}
                >
                  <Coins size={14} color="#f59e0b" /> Cashier & Billing Desk
                </button>
              </div>
            </div>

            {/* SECTION 1: MASTER DEPARTMENT OPERATIONAL CAPABILITIES */}
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sliders size={18} color="var(--primary)" />
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                    1. Department Operational Capabilities (Master Switches)
                  </h4>
                </div>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Authorizes what workflows can legally take place within this department. If a capability is disabled here, individual staff roles cannot perform it.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {[
                  {
                    key: 'canConsult' as keyof DepartmentCapabilities,
                    title: 'Outpatient Consultations',
                    desc: 'Authorizes doctors to conduct consults, call queue tokens, and schedule visits.',
                    icon: <Stethoscope size={18} color="#0284c7" />,
                  },
                  {
                    key: 'canPrescribe' as keyof DepartmentCapabilities,
                    title: 'E-Prescription Issuance',
                    desc: 'Authorizes issuing digital prescriptions, medication orders, and refill approvals.',
                    icon: <Pill size={18} color="#10b981" />,
                  },
                  {
                    key: 'canOrderDiagnostics' as keyof DepartmentCapabilities,
                    title: 'Diagnostic Lab & Imaging Orders',
                    desc: 'Enables ordering blood tests, microbiology, histology, X-rays, and MRI scans.',
                    icon: <FlaskConical size={18} color="#8b5cf6" />,
                  },
                  {
                    key: 'canAdmitPatients' as keyof DepartmentCapabilities,
                    title: 'Inpatient Bed Admissions',
                    desc: 'Authorizes admitting patients directly into wards, ICU, or daycare beds.',
                    icon: <BedDouble size={18} color="#6366f1" />,
                  },
                  {
                    key: 'canPerformProcedures' as keyof DepartmentCapabilities,
                    title: 'Clinical Procedures & OT',
                    desc: 'Authorizes minor OT bookings, bedside suturing, and surgical interventions.',
                    icon: <Activity size={18} color="#f59e0b" />,
                  },
                  {
                    key: 'canCollectPayments' as keyof DepartmentCapabilities,
                    title: 'Point of Sale (POS) Billing',
                    desc: 'Enables cashiering, collecting cash/card/UPI, and printing official receipts.',
                    icon: <Coins size={18} color="#10b981" />,
                  },
                  {
                    key: 'canEmergencyBypass' as keyof DepartmentCapabilities,
                    title: 'Emergency Triage Fast-Track Bypass',
                    desc: 'Permits unverified critical trauma patients to bypass registration to doctor queue.',
                    icon: <AlertTriangle size={18} color="#ef4444" />,
                  },
                  {
                    key: 'canTeleconsult' as keyof DepartmentCapabilities,
                    title: 'Telemedicine & Video Care',
                    desc: 'Allows remote audio/video consultations and virtual follow-ups.',
                    icon: <Zap size={18} color="#0ea5e9" />,
                  },
                  {
                    key: 'canDischarge' as keyof DepartmentCapabilities,
                    title: 'Discharge Signoff & Bed Release',
                    desc: 'Authorizes finalizing discharge summaries, medication reconciliations, and releasing beds.',
                    icon: <CheckCircle2 size={18} color="#059669" />,
                  },
                ].map((cap) => {
                  const isEnabled = (profile.capabilities || DEFAULT_DEPARTMENT_CAPABILITIES)[cap.key];
                  return (
                    <div
                      key={cap.key}
                      onClick={() => handleToggleCapability(cap.key)}
                      style={{
                        backgroundColor: isEnabled ? 'rgba(5, 150, 105, 0.03)' : 'var(--card-bg, #ffffff)',
                        border: isEnabled ? '1px solid #10b981' : '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease-in-out',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {cap.icon}
                            <h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>{cap.title}</h5>
                          </div>
                          <span
                            className={`badge ${isEnabled ? 'badge-success' : 'badge-secondary'}`}
                            style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem' }}
                          >
                            {isEnabled ? 'ENABLED' : 'DISABLED'}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {cap.desc}
                        </p>
                      </div>

                      <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '20px',
                            backgroundColor: isEnabled ? '#10b981' : '#cbd5e1',
                            borderRadius: '20px',
                            position: 'relative',
                            transition: 'background-color 0.2s',
                          }}
                        >
                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              backgroundColor: '#ffffff',
                              borderRadius: '50%',
                              position: 'absolute',
                              top: '2px',
                              left: isEnabled ? '20px' : '2px',
                              transition: 'left 0.2s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: GRANULAR ROLE ACTION PERMISSIONS BY CADRE */}
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={18} color="var(--primary)" />
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                    2. Granular Role Action Permissions by Cadre
                  </h4>
                </div>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Configure what individual actions each cadre is authorized to execute when working in <strong>{profile.name}</strong>.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {([
                  {
                    key: 'doctor' as keyof DepartmentRolePermissions,
                    title: 'Doctors & Specialists',
                    badge: 'Clinical Cadre',
                    badgeClass: 'badge-info',
                    icon: <Stethoscope size={18} color="#0284c7" />,
                    defaultVal: true,
                    actions: [
                      { key: 'viewPatients', label: 'View department patient queue & full medical history' },
                      { key: 'clinicalNotes', label: 'Write & sign SOAP clinical consultation notes' },
                      { key: 'prescribe', label: 'Issue digital prescriptions with barcode verification' },
                      { key: 'orderDiagnostics', label: 'Order lab tests, radiology imaging & pathology' },
                      { key: 'admitDischarge', label: 'Authorize inpatient admission & sign final discharge' },
                    ],
                  },
                  {
                    key: 'doctorAssistant' as keyof DepartmentRolePermissions,
                    title: 'Doctor Assistants & Fellows',
                    badge: 'Clinical Support',
                    badgeClass: 'badge-secondary',
                    icon: <UserCheck size={18} color="#0369a1" />,
                    defaultVal: true,
                    actions: [
                      { key: 'preConsultationScreening', label: 'Record chief complaints & triage vitals' },
                      { key: 'draftPrescription', label: 'Prepare draft prescriptions for doctor countersign' },
                      { key: 'viewReports', label: 'View diagnostic reports & investigation results' },
                    ],
                  },
                  {
                    key: 'nurse' as keyof DepartmentRolePermissions,
                    title: 'Nursing Staff',
                    badge: 'Patient Care',
                    badgeClass: 'badge-success',
                    icon: <Activity size={18} color="#10b981" />,
                    defaultVal: true,
                    actions: [
                      { key: 'vitalsEntry', label: 'Record patient vitals (BP, SpO2, Pulse, Temp, Pain)' },
                      { key: 'medicationAdmin', label: 'Medication Administration Record (MAR Charting)' },
                      { key: 'wardHandover', label: 'Shift handover & departmental bed status updates' },
                      { key: 'nursingNotes', label: 'Record nursing progress notes & care observations' },
                    ],
                  },
                  {
                    key: 'receptionist' as keyof DepartmentRolePermissions,
                    title: 'Reception & Front Desk',
                    badge: 'Patient Access',
                    badgeClass: 'badge-info',
                    icon: <Users size={18} color="#0ea5e9" />,
                    defaultVal: true,
                    actions: [
                      { key: 'patientRegistration', label: 'Register new patients & issue UHID identifiers' },
                      { key: 'checkIn', label: 'Patient check-in & arrival desk verification' },
                      { key: 'queueToken', label: 'Generate & print OPD consultation queue token slips' },
                      { key: 'opdBooking', label: 'Doctor slot appointment booking & rescheduling' },
                    ],
                  },
                  {
                    key: 'billingStaff' as keyof DepartmentRolePermissions,
                    title: 'Billing & Financial Staff',
                    badge: 'Financial Ledger',
                    badgeClass: 'badge-warning',
                    icon: <Coins size={18} color="#eab308" />,
                    defaultVal: false,
                    actions: [
                      { key: 'chargeSlip', label: 'Generate inpatient & OPD charge slips and invoices' },
                      { key: 'collectPayments', label: 'Collect Cash, Card, UPI payments & print receipts' },
                      { key: 'discountAuth', label: 'Authorize special concessions & discretionary discounts' },
                      { key: 'refundProcessing', label: 'Process approved refund requests' },
                    ],
                  },
                  {
                    key: 'technician' as keyof DepartmentRolePermissions,
                    title: 'Laboratory Technicians',
                    badge: 'Diagnostic Cadre',
                    badgeClass: 'badge-secondary',
                    icon: <FlaskConical size={18} color="#8b5cf6" />,
                    defaultVal: true,
                    actions: [
                      { key: 'sampleCollection', label: 'Phlebotomy, specimen accessioning & barcode scanning' },
                      { key: 'enterResults', label: 'Input investigation values & analyze parameters' },
                      { key: 'reportRelease', label: 'Authorize, sign, and release official diagnostic reports' },
                    ],
                  },
                  {
                    key: 'pharmacist' as keyof DepartmentRolePermissions,
                    title: 'Dispensary Pharmacists',
                    badge: 'Pharmacy Cadre',
                    badgeClass: 'badge-success',
                    icon: <Pill size={18} color="#10b981" />,
                    defaultVal: true,
                    actions: [
                      { key: 'dispenseMedication', label: 'Dispense medications against digital e-prescriptions' },
                      { key: 'substituteGeneric', label: 'Generic molecule substitution & safety verification' },
                      { key: 'inventoryAdjustment', label: 'Dispensary batch stock adjustment & returns' },
                    ],
                  },
                ]).map((cadre) => {
                  const cadrePerms = (profile.permissions?.[cadre.key] as any) || (DEFAULT_DEPARTMENT_PERMISSIONS[cadre.key] as any) || {};
                  const activeCount = cadre.actions.filter((item) => {
                    const val = cadrePerms[item.key];
                    return Boolean(val !== undefined ? val : cadre.defaultVal);
                  }).length;

                  return (
                    <div
                      key={cadre.key}
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '1.25rem',
                        backgroundColor: 'var(--bg-subtle, #f9fafb)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {cadre.icon}
                            <h5 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>{cadre.title}</h5>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                padding: '0.125rem 0.375rem',
                                borderRadius: '4px',
                                backgroundColor: activeCount === cadre.actions.length ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.1)',
                                color: activeCount === cadre.actions.length ? '#059669' : 'var(--text-muted)',
                              }}
                            >
                              {activeCount}/{cadre.actions.length} ON
                            </span>
                            <span className={`badge ${cadre.badgeClass}`} style={{ fontSize: '0.6875rem' }}>
                              {cadre.badge}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {cadre.actions.map((item) => {
                            const isPermEnabled = Boolean(
                              cadrePerms[item.key] !== undefined
                                ? cadrePerms[item.key]
                                : cadre.defaultVal
                            );

                            return (
                              <div
                                key={item.key}
                                onClick={() => handleToggleRolePerm(cadre.key, item.key)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleToggleRolePerm(cadre.key, item.key);
                                  }
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0.5rem 0.625rem',
                                  borderRadius: '8px',
                                  backgroundColor: isPermEnabled ? 'rgba(16, 185, 129, 0.05)' : 'var(--card-bg, #ffffff)',
                                  border: isPermEnabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease-in-out',
                                  gap: '0.75rem',
                                  userSelect: 'none',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '0.8125rem',
                                    fontWeight: isPermEnabled ? 500 : 400,
                                    color: isPermEnabled ? 'var(--text-main, #0f172a)' : 'var(--text-muted, #64748b)',
                                    lineHeight: 1.35,
                                    flex: 1,
                                  }}
                                >
                                  {item.label}
                                </span>

                                {/* Modern animated toggle on/off button matching Section 1 */}
                                <div
                                  style={{
                                    width: '36px',
                                    height: '19px',
                                    backgroundColor: isPermEnabled ? '#10b981' : '#cbd5e1',
                                    borderRadius: '20px',
                                    position: 'relative',
                                    transition: 'background-color 0.2s',
                                    flexShrink: 0,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: '15px',
                                      height: '15px',
                                      backgroundColor: '#ffffff',
                                      borderRadius: '50%',
                                      position: 'absolute',
                                      top: '2px',
                                      left: isPermEnabled ? '19px' : '2px',
                                      transition: 'left 0.2s',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 3: ASSIGNED PERSONNEL CLEARANCE OVERRIDES */}
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={18} color="#d97706" />
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                    3. Personnel Department Clearance Overrides ({departmentPersonnel.total} Assigned Staff)
                  </h4>
                </div>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Assign individual clearance tiers and signing privileges to specific staff members stationed in <strong>{profile.name}</strong>.
                </p>
              </div>

              {departmentPersonnel.assignedStaff.length > 0 ? (
                <div
                  style={{
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-subtle, #f9fafb)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Staff Member</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Role Cadre</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Department Clearance Level</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Special Privileges</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Authorization Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentPersonnel.assignedStaff.map((staff) => {
                        const override = (profile.staffOverrides || []).find((o) => o.staffId === staff.id);
                        const clearance: StaffDepartmentClearanceLevel =
                          override?.clearanceLevel ||
                          (staff.isDepartmentHead || profile.head === staff.fullName
                            ? 'HOD'
                            : staff.role === 'doctor'
                            ? 'SENIOR_SPECIALIST'
                            : 'ATTENDING');

                        return (
                          <tr key={staff.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                <div
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: staff.role === 'doctor' ? '#e0f2fe' : staff.role === 'nurse' ? '#dcfce7' : '#f3f4f6',
                                    color: staff.role === 'doctor' ? '#0369a1' : staff.role === 'nurse' ? '#15803d' : '#374151',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    flexShrink: 0,
                                  }}
                                >
                                  {staff.fullName.charAt(0)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600 }}>{staff.fullName}</div>
                                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                    {staff.employeeCode}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span
                                className={`badge ${
                                  staff.role === 'doctor'
                                    ? 'badge-info'
                                    : staff.role === 'nurse'
                                    ? 'badge-success'
                                    : staff.role === 'technician'
                                    ? 'badge-warning'
                                    : 'badge-secondary'
                                }`}
                              >
                                {staff.role.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <select
                                className="form-control"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: '170px' }}
                                value={clearance}
                                onChange={(e) =>
                                  handleUpdateStaffOverride(staff, e.target.value as StaffDepartmentClearanceLevel)
                                }
                              >
                                <option value="HOD">HOD (Department Head)</option>
                                <option value="SENIOR_SPECIALIST">Senior Specialist</option>
                                <option value="ATTENDING">Attending Practitioner</option>
                                <option value="TRAINEE">Trainee / Supervised</option>
                                <option value="RESTRICTED">Restricted Access</option>
                              </select>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={override?.canApproveDischarges ?? (staff.role === 'doctor')}
                                    onChange={(e) =>
                                      handleUpdateStaffOverride(staff, clearance, { canApproveDischarges: e.target.checked })
                                    }
                                  />
                                  <span>Discharge Signoff</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={override?.canOverrideDiscounts ?? (staff.isDepartmentHead || clearance === 'HOD')}
                                    onChange={(e) =>
                                      handleUpdateStaffOverride(staff, clearance, { canOverrideDiscounts: e.target.checked })
                                    }
                                  />
                                  <span>Discount Auth</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={override?.canSignNarcotics ?? (staff.role === 'doctor')}
                                    onChange={(e) =>
                                      handleUpdateStaffOverride(staff, clearance, { canSignNarcotics: e.target.checked })
                                    }
                                  />
                                  <span>Narcotics Rx</span>
                                </label>
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Authorized for Chemotherapy protocol"
                                value={override?.customNotes || ''}
                                onChange={(e) =>
                                  handleUpdateStaffOverride(staff, clearance, undefined, e.target.value)
                                }
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: '220px' }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: 'var(--bg-subtle, #f9fafb)',
                    border: '1px dashed var(--border-color)',
                    borderRadius: '10px',
                    padding: '2rem',
                    textAlign: 'center',
                  }}
                >
                  <Users size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem auto' }} />
                  <h5 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>No Personnel Currently Assigned</h5>
                  <p style={{ margin: '0.375rem 0 1rem 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Station staff to <strong>{profile.name}</strong> to configure individual clearance levels and clinical signing privileges.
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActiveTab('staff')}
                    style={{ fontSize: '0.8125rem' }}
                  >
                    View Staff Deployment (Tab 3)
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Action Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--border-color)',
                marginTop: '1rem',
              }}
            >
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Audit Record will be logged as <code style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>DEPARTMENT_PERMISSIONS_UPDATED</code>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onBack}
                  style={{ fontSize: '0.8125rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSavePermissions}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8125rem',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    border: 'none',
                    fontWeight: 600,
                  }}
                >
                  <Save size={15} /> Save Department Permissions & Access Controls
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= 9. STATUS, MERGE & ARCHIVE ================= */}
        {activeTab === 'lifecycle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                Department Lifecycle, Consolidation & Decommissioning
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Safely manage department restructuring, merge patients and clinical staff into another department, or archive.
              </p>
            </div>

            {/* Merge Department Card */}
            <div
              style={{
                border: '1px solid #3b82f6',
                borderRadius: '10px',
                padding: '1.5rem',
                backgroundColor: 'rgba(59, 130, 246, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <GitMerge size={20} color="#3b82f6" />
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e40af' }}>
                      Merge & Consolidate Department
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0', maxWidth: '640px' }}>
                    If hospital management decides to restructure or unite two departments (e.g. merging Pulmonology into General Medicine), all active patients, assigned doctors, and duty rosters can be transferred in a single audited step.
                  </p>
                </div>
                <button
                  className="btn"
                  onClick={() => setIsMergeModalOpen(true)}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <GitMerge size={16} /> Merge Department Wizard
                </button>
              </div>
            </div>

            {/* Archive / Deactivate Card */}
            <div
              style={{
                border: '1px solid #ef4444',
                borderRadius: '10px',
                padding: '1.5rem',
                backgroundColor: 'rgba(239, 68, 68, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Archive size={20} color="#ef4444" />
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#991b1b' }}>
                      Archive Department (Preserve Historical Records)
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0', maxWidth: '640px' }}>
                    Never hard delete an operational department. Archiving deactivates new appointment bookings and bed admissions while maintaining full regulatory medico-legal compliance and past patient history.
                  </p>
                </div>
                <button
                  className="btn"
                  onClick={() => setIsArchiveModalOpen(true)}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Archive size={16} /> Archive Department
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= 9. CAPACITY & LIVE KPIS TAB ================= */}
        {activeTab === 'capacity_kpis' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>
                  Department Capacity Quotas & Live Patient Throughput
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                  Manage patient consultation quotas, emergency buffer allocations, and live operational metrics.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveAll}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Save size={14} /> Save Capacity Rules
              </button>
            </div>

            {/* 4 Capacity Quota Cards */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={16} color="var(--primary)" /> 1. Intake Capacity & Quota Thresholds
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Daily Patient Quota (Max Tokens)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={profile.dailyConsultationCapacity || 120}
                    onChange={(e) => setProfile({ ...profile, dailyConsultationCapacity: parseInt(e.target.value) || 0 })}
                    style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                    Ceiling on ambulatory OPD tokens per day.
                  </span>
                </div>

                <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Concurrent Doctor Consulting Slots
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={profile.concurrentDoctorSlots || 6}
                    onChange={(e) => setProfile({ ...profile, concurrentDoctorSlots: parseInt(e.target.value) || 0 })}
                    style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                    Active consulting chambers in this unit.
                  </span>
                </div>

                <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Emergency Buffer Reserve (%)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={profile.emergencyBufferCapacity || 20}
                    onChange={(e) => setProfile({ ...profile, emergencyBufferCapacity: parseInt(e.target.value) || 0 })}
                    style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                    Slot reserve for walk-in acute emergencies.
                  </span>
                </div>

                <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Max Waiting Lounge Queue Size
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={profile.maxWaitingQueueLength || 40}
                    onChange={(e) => setProfile({ ...profile, maxWaitingQueueLength: parseInt(e.target.value) || 0 })}
                    style={{ fontSize: '1.25rem', fontWeight: 800, color: '#6366f1' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                    Waiting room seat capacity threshold.
                  </span>
                </div>
              </div>
            </div>

            {/* 5 Live Operational KPIs */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Activity size={16} color="#10b981" /> 2. Live Clinical & Operational Throughput KPIs
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Consultation Time</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0284c7', margin: '0.25rem 0' }}>
                    {profile.avgConsultationMinutes || 12} mins
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: '#16a34a', fontWeight: 600 }}>✓ Within standard (10-15m)</span>
                </div>

                <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Today's Patient Footfall</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', margin: '0.25rem 0' }}>
                    {profile.patientFootfallDaily || 96} Patients
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>80% of daily capacity</span>
                </div>

                <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bed Occupancy Rate</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#6366f1', margin: '0.25rem 0' }}>
                    {profile.bedOccupancyRate || 82}%
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Optimal inpatient load</span>
                </div>

                <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Satisfaction Score</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f59e0b', margin: '0.25rem 0' }}>
                    ★ {profile.patientSatisfactionScore || 4.8} / 5.0
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: '#16a34a', fontWeight: 600 }}>96% positive feedback</span>
                </div>

                <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Prescriptions Issued</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0ea5e9', margin: '0.25rem 0' }}>
                    {profile.prescriptionsIssuedToday || 74} Rx
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Direct pharmacy sync</span>
                </div>
              </div>
            </div>

            {/* Timings & Operational Policy Toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Operating Timings */}
              <div style={{ padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle, #f8fafc)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={16} /> Operating Timings & Shift Buffers
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>OPD Start Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={profile.opdStartTime || '08:30'}
                      onChange={(e) => setProfile({ ...profile, opdStartTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>OPD End Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={profile.opdEndTime || '17:30'}
                      onChange={(e) => setProfile({ ...profile, opdEndTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Lunch Break Start</label>
                    <input
                      type="time"
                      className="form-input"
                      value={profile.breakStartTime || '13:00'}
                      onChange={(e) => setProfile({ ...profile, breakStartTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Shift Handover (Mins)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={profile.shiftHandoverMinutes || 30}
                      onChange={(e) => setProfile({ ...profile, shiftHandoverMinutes: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* Operational Policy Toggles */}
              <div style={{ padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle, #f8fafc)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={16} /> Operational Policy Engine Toggles
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {[
                    { key: 'allowTeleconsultation', label: 'Allow Teleconsultation & Video OPD Appointments' },
                    { key: 'autoTokenGeneration', label: 'Automatic Token Routing at Kiosk & Reception' },
                    { key: 'requireVitalsBeforeConsultation', label: 'Mandatory Pre-Consultation Vitals by Nurse' },
                    { key: 'requirePrePaymentForConsultation', label: 'Require Pre-Payment Before Consultation Slip' },
                    { key: 'allowEmergencyWalkInBypass', label: 'Allow Emergency Triage Walk-in Queue Bypass' },
                    { key: 'enableSmsTokenAlerts', label: 'Send SMS Queue Alerts to Patient Mobile' },
                  ].map((toggle) => (
                    <label key={toggle.key} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.7813rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={Boolean((profile as any)[toggle.key])}
                        onChange={(e) => setProfile({ ...profile, [toggle.key]: e.target.checked })}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span>{toggle.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 10. IMMUTABLE AUDIT TRAIL TAB ================= */}
        {activeTab === 'audit_logs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>
                  Department Governance & Immutable Audit Logs
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                  Chronological, tamper-evident log of all capacity modifications, leadership assignments, and policy adjustments.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const auditText = JSON.stringify(profile.auditLogs || [], null, 2);
                  const blob = new Blob([auditText], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `${profile.code}_Audit_Trail_${new Date().toISOString().slice(0, 10)}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Download size={14} /> Export Audit JSON
              </button>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table className="table" style={{ margin: 0, fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle, #f8fafc)' }}>
                    <th style={{ width: '160px' }}>Timestamp</th>
                    <th style={{ width: '150px' }}>Event Action</th>
                    <th style={{ width: '180px' }}>Performed By</th>
                    <th style={{ width: '100px' }}>Severity</th>
                    <th>Details & Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.auditLogs && profile.auditLogs.length > 0) ? (
                    profile.auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td>
                          <code style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', fontWeight: 700, fontSize: '0.72rem' }}>
                            {log.action}
                          </code>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{log.performedBy}</td>
                        <td>
                          <span
                            style={{
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.6875rem',
                              fontWeight: 800,
                              backgroundColor: log.severity === 'CRITICAL' ? '#fee2e2' : log.severity === 'WARNING' ? '#fef3c7' : '#e0f2fe',
                              color: log.severity === 'CRITICAL' ? '#991b1b' : log.severity === 'WARNING' ? '#92400e' : '#0369a1',
                            }}
                          >
                            {log.severity}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-main)' }}>{log.details}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                        No audit events recorded yet for this department.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ================= MERGE MODAL ================= */}
      {isMergeModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GitMerge size={20} color="var(--primary)" />
                <h3 className="modal-title">Merge "{profile.name}"</h3>
              </div>
              <button className="action-btn" onClick={() => setIsMergeModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleMergeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                }}
              >
                <strong>Consolidation Impact:</strong>
                <ul style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                  <li>All active doctors ({profile.doctorsCount}) will be reallocated to the target department.</li>
                  <li>Inpatient beds ({profile.bedsCount}) will transition under the target cost center.</li>
                  <li>This department ({profile.code}) will be permanently closed to new admissions.</li>
                </ul>
              </div>

              <div className="form-group">
                <label className="form-label">Select Target Department to Absorb Assets</label>
                <select
                  className="form-select"
                  value={targetMergeDeptId}
                  onChange={(e) => setTargetMergeDeptId(e.target.value)}
                  required
                >
                  <option value="">-- Choose destination department --</option>
                  {allDepartments
                    .filter((d) => d.id !== profile.id && d.status === 'ACTIVE')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code}) - {d.head}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Type <strong style={{ color: '#dc2626' }}>MERGE</strong> to confirm consolidation:
                </label>
                <input
                  className="form-input"
                  placeholder="MERGE"
                  value={mergeConfirmationText}
                  onChange={(e) => setMergeConfirmationText(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsMergeModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#2563eb' }}>
                  Confirm Department Merger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ARCHIVE MODAL ================= */}
      {isArchiveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} color="#dc2626" />
                <h3 className="modal-title">Archive Department</h3>
              </div>
              <button className="action-btn" onClick={() => setIsArchiveModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.875rem', margin: 0, color: 'var(--text-color)' }}>
                Are you sure you want to archive <strong>{profile.name} ({profile.code})</strong>?
              </p>

              <div
                style={{
                  padding: '0.875rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  color: '#991b1b',
                }}
              >
                This department will no longer be available for patient appointments, doctor roster scheduling, or new bed allocations. Historical billing and patient records will remain accessible in read-only mode for statutory compliance.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsArchiveModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleArchiveConfirm}
                  style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                >
                  Archive Department
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= CAMPUS SPACE REALLOCATION MODAL ================= */}
      {isReallocateModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              maxWidth: '840px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <Building2 size={20} color="var(--primary)" />
                <div>
                  <h3 className="modal-title" style={{ margin: 0, fontSize: '1.125rem' }}>
                    Reallocate Campus Space — {profile.name}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Assign or release clinical wards, beds, and consultation rooms from campus infrastructure.
                  </span>
                </div>
              </div>
              <button className="action-btn" onClick={() => setIsReallocateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              <div className="form-group">
                <label className="form-label">Select Hospital Campus Building</label>
                <select
                  className="form-select"
                  value={tempBuildingId}
                  onChange={(e) => setTempBuildingId(e.target.value)}
                >
                  {campusBuildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code}) — {b.totalFloorsCount} Floors • {b.buildingType}
                    </option>
                  ))}
                </select>
              </div>

              {/* Floors, Wards, and Rooms Selection */}
              {(() => {
                const bldg = campusBuildings.find((b) => b.id === tempBuildingId) || campusBuildings[0];
                if (!bldg) return <div>No building blueprint found.</div>;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {bldg.floors.map((floor) => (
                      <div
                        key={floor.id}
                        style={{
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          padding: '1rem',
                          backgroundColor: 'var(--bg-subtle, #f9fafb)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.75rem',
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: '0.9375rem', display: 'block' }}>
                              {floor.floorNumber} — {floor.wing}
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Code: {floor.code} • Access Zone: {floor.accessZone}
                            </span>
                          </div>
                          <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                            {floor.wards.length} Wards • {floor.rooms.length} Rooms
                          </span>
                        </div>

                        {/* Wards on this floor */}
                        {floor.wards.length > 0 && (
                          <div style={{ marginBottom: '0.75rem' }}>
                            <div
                              style={{
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                color: 'var(--text-color)',
                                marginBottom: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                              }}
                            >
                              <BedDouble size={14} /> Inpatient Clinical Wards & Beds:
                            </div>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '0.5rem',
                              }}
                            >
                              {floor.wards.map((ward) => {
                                const isChecked = tempWardIds.includes(ward.id);
                                return (
                                  <label
                                    key={ward.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '0.625rem',
                                      padding: '0.625rem 0.75rem',
                                      backgroundColor: isChecked
                                        ? 'rgba(37, 99, 235, 0.08)'
                                        : 'var(--card-bg, #ffffff)',
                                      border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border-color)'}`,
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setTempWardIds([...tempWardIds, ward.id]);
                                        } else {
                                          setTempWardIds(tempWardIds.filter((id) => id !== ward.id));
                                        }
                                      }}
                                      style={{ marginTop: '2px' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{ward.name}</div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {ward.wardType} • <strong>{ward.beds.length} Beds</strong> • Nurse:{' '}
                                        {ward.supervisorNurse}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Rooms on this floor */}
                        {floor.rooms.length > 0 && (
                          <div>
                            <div
                              style={{
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                color: 'var(--text-color)',
                                marginBottom: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                              }}
                            >
                              <DoorClosed size={14} /> Consultation Chambers & Procedure Rooms:
                            </div>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                gap: '0.5rem',
                              }}
                            >
                              {floor.rooms.map((room) => {
                                const isChecked = tempRoomIds.includes(room.id);
                                return (
                                  <label
                                    key={room.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '0.625rem',
                                      padding: '0.5rem 0.75rem',
                                      backgroundColor: isChecked
                                        ? 'rgba(14, 165, 233, 0.08)'
                                        : 'var(--card-bg, #ffffff)',
                                      border: `1px solid ${isChecked ? '#0ea5e9' : 'var(--border-color)'}`,
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setTempRoomIds([...tempRoomIds, room.id]);
                                        } else {
                                          setTempRoomIds(tempRoomIds.filter((id) => id !== room.id));
                                        }
                                      }}
                                      style={{ marginTop: '2px' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{room.roomNumber}</div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {room.roomType} (Capacity: {room.capacity})
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Fixed Footer with dynamic totals */}
            <div
              className="modal-footer"
              style={{
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.875rem 1.25rem',
                borderTop: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-subtle, #f9fafb)',
              }}
            >
              {(() => {
                const bldg = campusBuildings.find((b) => b.id === tempBuildingId) || campusBuildings[0];
                let bedsSum = 0;
                bldg?.floors.forEach((f) => {
                  f.wards.forEach((w) => {
                    if (tempWardIds.includes(w.id)) {
                      bedsSum += w.beds.length;
                    }
                  });
                });
                return (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-color)' }}>
                    Allocating: <strong>{tempWardIds.length} Wards</strong> (<strong>{bedsSum} Beds</strong>) •{' '}
                    <strong>{tempRoomIds.length} Rooms</strong>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsReallocateModalOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSaveReallocation}>
                  Save & Apply Space Allocation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
