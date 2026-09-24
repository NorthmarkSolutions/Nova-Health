import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutGrid,
  Stethoscope,
  FlaskConical,
  Coins,
  Shield,
  Wrench,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Clock,
  UserCheck,
  Settings,
  Layers,
  FileText,
  SlidersHorizontal,
  Sparkles,
  Building2,
  AlertTriangle,
  CheckCircle2,
  BedDouble,
  Users,
  Award,
  ShieldCheck,
} from 'lucide-react';
import { DepartmentProfileView, DepartmentProfileData } from './DepartmentProfileView';
import { RegisterDepartmentWizardModal } from './RegisterDepartmentWizardModal';
import { OnboardingStarterPacksModal } from './OnboardingStarterPacksModal';
import { CampusSpaceAllocationModal } from './CampusSpaceAllocationModal';
import { getCampusBuildings } from './CampusInfrastructureSection';
import { getDepartmentPersonnelStats } from './hospitalStaffStore';
import { DepartmentAssignedStaffModal } from './DepartmentAssignedStaffModal';

export const defaultCardiologyDept: DepartmentProfileData = {
  id: 'dept-cardiology',
  code: 'DEPT-CARDIO',
  name: 'Cardiology & Cardiovascular Sciences',
  shortName: 'Cardiology',
  category: 'clinical',
  head: 'Dr. Arthur Vance',
  hours: '24/7 Tertiary Cardiology & Emergency',
  costCenter: 'CC-CARD-01',
  revenueCenter: 'RC-CARD-01',
  budget: 850000,
  billingEnabled: true,
  staffCount: 1,
  status: 'ACTIVE',
  doctorsCount: 1,
  nursesCount: 1,
  techsCount: 0,
  receptionistsCount: 0,
  assignedBuildingId: 'bld-cardio-pavilion',
  buildingAssigned: 'Cardiovascular Sciences & Surgery Pavilion',
  floorAssigned: 'Ground Floor & Level 1',
  assignedFloorIds: ['fl-card-0', 'fl-card-1'],
  assignedWardIds: ['wd-card-triage', 'wd-card-telemetry'],
  assignedRoomIds: ['rm-card-101'],
  roomsCount: 1,
  wardsCount: 2,
  bedsCount: 12,
  hasDedicatedWaitingArea: true,
  consultationEnabled: true,
  admissionEnabled: true,
  procedureEnabled: true,
  labRequestsEnabled: true,
  prescriptionEnabled: true,
  isOpen24Hours: true,
  emergencyEnabled: true,
  dailyConsultationCapacity: 150,
  concurrentDoctorSlots: 6,
  emergencyBufferCapacity: 25,
  maxWaitingQueueLength: 50,
  avgConsultationMinutes: 14,
  patientFootfallDaily: 118,
  bedOccupancyRate: 85,
  patientSatisfactionScore: 4.9,
  prescriptionsIssuedToday: 82,
  opdStartTime: '08:00',
  opdEndTime: '18:00',
  breakStartTime: '13:00',
  breakEndTime: '14:00',
  shiftHandoverMinutes: 30,
  allowTeleconsultation: true,
  autoTokenGeneration: true,
  requireVitalsBeforeConsultation: true,
  requirePrePaymentForConsultation: false,
  allowEmergencyWalkInBypass: true,
  enableSmsTokenAlerts: true,
  hodStaffId: 'stf-1',
  hodStaffName: 'Dr. Arthur Vance',
  deptAdminStaffName: 'Cardiology Operations Lead',
  auditLogs: [
    {
      id: 'aud-cardio-1',
      timestamp: '2026-09-01T08:00:00.000Z',
      action: 'DEPARTMENT_COMMISSIONED',
      performedBy: 'Hospital Super Administrator',
      details: 'Cardiology & Cardiovascular Sciences commissioned with 12 inpatient beds and 150 daily consultation quota.',
      severity: 'INFO',
    },
  ],
};

export const DepartmentsSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'clinical' | 'diagnostic' | 'revenue' | 'admin' | 'support'
  >('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeViewDept, setActiveViewDept] = useState<DepartmentProfileData | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<string>('basic');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStarterPacksOpen, setIsStarterPacksOpen] = useState(false);
  const [isCampusMatrixOpen, setIsCampusMatrixOpen] = useState(false);
  const [selectedDeptForStaff, setSelectedDeptForStaff] = useState<DepartmentProfileData | null>(null);
  const [staffVersion, setStaffVersion] = useState(0);

  const [departments, setDepartments] = useState<DepartmentProfileData[]>(() => {
    try {
      const saved = localStorage.getItem('north_hospital_departments_master');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasCardio = parsed.some((d: any) => d.id === 'dept-cardiology' || d.code === 'DEPT-CARDIO');
          if (!hasCardio) {
            return [defaultCardiologyDept, ...parsed];
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [
      defaultCardiologyDept,
      // Clinical
    {
      id: '1',
      code: 'DEPT-OPD',
      name: 'Outpatient Department (OPD)',
      shortName: 'OPD',
      category: 'clinical',
      head: 'Dr. Sarah Jenkins',
      hours: '08:00 - 20:00 (Mon-Sat)',
      costCenter: 'CC-CLN-01',
      revenueCenter: 'RC-CLN-01',
      budget: 350000,
      billingEnabled: true,
      staffCount: 24,
      status: 'ACTIVE',
      doctorsCount: 12,
      nursesCount: 8,
      techsCount: 2,
      receptionistsCount: 2,
      assignedBuildingId: 'bld-main-1',
      buildingAssigned: 'North Central Hospital Tower',
      floorAssigned: 'Ground Floor (Level 0)',
      assignedFloorIds: ['fl-main-0'],
      assignedWardIds: [],
      assignedRoomIds: ['rm-005', 'rm-006'],
      roomsCount: 2,
      wardsCount: 0,
      bedsCount: 0,
      hasDedicatedWaitingArea: true,
      consultationEnabled: true,
      admissionEnabled: false,
      procedureEnabled: true,
      labRequestsEnabled: true,
      prescriptionEnabled: true,
    },
    {
      id: '2',
      code: 'DEPT-IPD',
      name: 'Inpatient Department (IPD)',
      shortName: 'IPD',
      category: 'clinical',
      head: 'Dr. Robert Vance',
      hours: '24/7 Continuous',
      costCenter: 'CC-CLN-02',
      revenueCenter: 'RC-CLN-02',
      budget: 850000,
      billingEnabled: true,
      staffCount: 52,
      status: 'ACTIVE',
      doctorsCount: 16,
      nursesCount: 30,
      techsCount: 4,
      receptionistsCount: 2,
      assignedBuildingId: 'bld-main-1',
      buildingAssigned: 'North Central Hospital Tower',
      floorAssigned: 'First Floor (Level 1)',
      assignedFloorIds: ['fl-main-1'],
      assignedWardIds: ['wd-1-1', 'wd-1-2'],
      assignedRoomIds: ['rm-101', 'rm-102'],
      roomsCount: 2,
      wardsCount: 2,
      bedsCount: 5,
      hasDedicatedWaitingArea: true,
      consultationEnabled: true,
      admissionEnabled: true,
      procedureEnabled: true,
      labRequestsEnabled: true,
      prescriptionEnabled: true,
    },
    {
      id: '3',
      code: 'DEPT-ER',
      name: 'Emergency & Trauma (ER)',
      shortName: 'ER / Trauma',
      category: 'clinical',
      head: 'Dr. Neil Patrick',
      hours: '24/7 Emergency',
      costCenter: 'CC-CLN-03',
      revenueCenter: 'RC-CLN-03',
      budget: 650000,
      billingEnabled: true,
      staffCount: 30,
      status: 'ACTIVE',
      doctorsCount: 10,
      nursesCount: 14,
      techsCount: 4,
      receptionistsCount: 2,
      assignedBuildingId: 'bld-main-1',
      buildingAssigned: 'North Central Hospital Tower',
      floorAssigned: 'Ground Floor (Level 0)',
      assignedFloorIds: ['fl-main-0'],
      assignedWardIds: ['wd-0-1'],
      assignedRoomIds: ['rm-001', 'rm-002', 'rm-003', 'rm-004'],
      roomsCount: 4,
      wardsCount: 1,
      bedsCount: 4,
      hasDedicatedWaitingArea: true,
      consultationEnabled: true,
      admissionEnabled: true,
      procedureEnabled: true,
      labRequestsEnabled: true,
      prescriptionEnabled: true,
      emergencyEnabled: true,
      isOpen24Hours: true,
    },
    {
      id: '4',
      code: 'DEPT-ICU',
      name: 'Intensive Critical Care (ICU)',
      shortName: 'ICU',
      category: 'clinical',
      head: 'Dr. Arthur Pendelton',
      hours: '24/7 Critical',
      costCenter: 'CC-CLN-04',
      revenueCenter: 'RC-CLN-04',
      budget: 920000,
      billingEnabled: true,
      staffCount: 28,
      status: 'ACTIVE',
      doctorsCount: 8,
      nursesCount: 16,
      techsCount: 4,
      receptionistsCount: 0,
      assignedBuildingId: 'bld-main-1',
      buildingAssigned: 'North Central Hospital Tower',
      floorAssigned: 'Second Floor (Level 2)',
      assignedFloorIds: ['fl-main-2'],
      assignedWardIds: ['wd-2-1'],
      assignedRoomIds: [],
      roomsCount: 0,
      wardsCount: 1,
      bedsCount: 2,
      consultationEnabled: true,
      admissionEnabled: true,
      procedureEnabled: true,
      labRequestsEnabled: true,
      prescriptionEnabled: true,
      isOpen24Hours: true,
    },
    {
      id: '5',
      code: 'DEPT-OT',
      name: 'Operation Theatre & Surgery (OT)',
      shortName: 'OT Complex',
      category: 'clinical',
      head: 'Dr. Marcus Brody',
      hours: '24/7 Surgeries',
      costCenter: 'CC-CLN-05',
      revenueCenter: 'RC-CLN-05',
      budget: 1100000,
      billingEnabled: true,
      staffCount: 20,
      status: 'ACTIVE',
      doctorsCount: 10,
      nursesCount: 8,
      techsCount: 2,
      receptionistsCount: 0,
      assignedBuildingId: 'bld-main-1',
      buildingAssigned: 'North Central Hospital Tower',
      floorAssigned: 'Second Floor (Level 2)',
      assignedFloorIds: ['fl-main-2'],
      assignedWardIds: [],
      assignedRoomIds: ['rm-201'],
      roomsCount: 1,
      wardsCount: 0,
      bedsCount: 0,
      procedureEnabled: true,
      consultationEnabled: false,
    },
    {
      id: '6',
      code: 'DEPT-NICU',
      name: 'Neonatal ICU (NICU)',
      shortName: 'NICU',
      category: 'clinical',
      head: 'Dr. Emily Thorne',
      hours: '24/7 Neonatal',
      costCenter: 'CC-CLN-06',
      revenueCenter: 'RC-CLN-06',
      budget: 480000,
      billingEnabled: true,
      staffCount: 16,
      status: 'ACTIVE',
      doctorsCount: 4,
      nursesCount: 10,
      techsCount: 2,
      receptionistsCount: 0,
      buildingAssigned: 'Main Inpatient Tower',
      floorAssigned: 'Floor 4 - Maternity Wing',
      roomsCount: 2,
      wardsCount: 1,
      bedsCount: 12,
      isOpen24Hours: true,
    },
    {
      id: '7',
      code: 'DEPT-DIAL',
      name: 'Renal Dialysis Unit',
      shortName: 'Dialysis',
      category: 'clinical',
      head: 'Dr. Kevin Zhao',
      hours: '06:00 - 22:00',
      costCenter: 'CC-CLN-07',
      revenueCenter: 'RC-CLN-07',
      budget: 310000,
      billingEnabled: true,
      staffCount: 12,
      status: 'ACTIVE',
      doctorsCount: 3,
      nursesCount: 6,
      techsCount: 3,
      receptionistsCount: 0,
      buildingAssigned: 'Diagnostic & Oncology Pavilion',
      floorAssigned: 'Floor 1',
      roomsCount: 2,
      wardsCount: 1,
      bedsCount: 10,
      procedureEnabled: true,
    },
    {
      id: '8',
      code: 'DEPT-PHYSIO',
      name: 'Physiotherapy & Rehab',
      shortName: 'Physio',
      category: 'clinical',
      head: 'Dr. Claire Bennett',
      hours: '09:00 - 18:00',
      costCenter: 'CC-CLN-08',
      revenueCenter: 'RC-CLN-08',
      budget: 180000,
      billingEnabled: true,
      staffCount: 8,
      status: 'ACTIVE',
      doctorsCount: 2,
      nursesCount: 2,
      techsCount: 4,
      receptionistsCount: 0,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Ground Floor',
      roomsCount: 3,
      wardsCount: 0,
      bedsCount: 0,
    },

    // Diagnostic
    {
      id: '9',
      code: 'DEPT-LAB',
      name: 'Clinical Biochemistry & Lab',
      shortName: 'Central Lab',
      category: 'diagnostic',
      head: 'Dr. Amanda Chen',
      hours: '24/7 Lab Services',
      costCenter: 'CC-DIAG-01',
      revenueCenter: 'RC-DIAG-01',
      budget: 420000,
      billingEnabled: true,
      staffCount: 14,
      status: 'ACTIVE',
      doctorsCount: 2,
      nursesCount: 0,
      techsCount: 10,
      receptionistsCount: 2,
      buildingAssigned: 'Diagnostic & Oncology Pavilion',
      floorAssigned: 'Ground Floor',
      roomsCount: 5,
      wardsCount: 0,
      bedsCount: 0,
      isOpen24Hours: true,
      labRequestsEnabled: true,
    },
    {
      id: '10',
      code: 'DEPT-RAD',
      name: 'Radiology, CT & MRI',
      shortName: 'Radiology',
      category: 'diagnostic',
      head: 'Dr. Jonathan Ross',
      hours: '24/7 Imaging',
      costCenter: 'CC-DIAG-02',
      revenueCenter: 'RC-DIAG-02',
      budget: 680000,
      billingEnabled: true,
      staffCount: 18,
      status: 'ACTIVE',
      doctorsCount: 4,
      nursesCount: 2,
      techsCount: 10,
      receptionistsCount: 2,
      buildingAssigned: 'Diagnostic & Oncology Pavilion',
      floorAssigned: 'Ground Floor Radiation Wing',
      roomsCount: 6,
      wardsCount: 0,
      bedsCount: 0,
      isOpen24Hours: true,
    },
    {
      id: '11',
      code: 'DEPT-PATH',
      name: 'Histopathology & Cytology',
      shortName: 'Pathology',
      category: 'diagnostic',
      head: 'Dr. Anita Roy',
      hours: '09:00 - 18:00',
      costCenter: 'CC-DIAG-03',
      revenueCenter: 'RC-DIAG-03',
      budget: 220000,
      billingEnabled: true,
      staffCount: 8,
      status: 'ACTIVE',
      doctorsCount: 2,
      nursesCount: 0,
      techsCount: 5,
      receptionistsCount: 1,
      buildingAssigned: 'Diagnostic & Oncology Pavilion',
      floorAssigned: 'Floor 2',
      roomsCount: 4,
      wardsCount: 0,
      bedsCount: 0,
    },
    {
      id: '12',
      code: 'DEPT-BLOOD',
      name: 'Blood Transfusion & Blood Bank',
      shortName: 'Blood Bank',
      category: 'diagnostic',
      head: 'Dr. Michael Chang',
      hours: '24/7 Emergency Transfusion',
      costCenter: 'CC-DIAG-04',
      revenueCenter: 'RC-DIAG-04',
      budget: 350000,
      billingEnabled: true,
      staffCount: 10,
      status: 'ACTIVE',
      doctorsCount: 2,
      nursesCount: 2,
      techsCount: 5,
      receptionistsCount: 1,
      buildingAssigned: 'Emergency & Trauma Pavilion',
      floorAssigned: 'Floor 1',
      roomsCount: 3,
      wardsCount: 0,
      bedsCount: 0,
      isOpen24Hours: true,
    },

    // Revenue
    {
      id: '13',
      code: 'DEPT-BILL',
      name: 'Patient Billing & Cashier Desk',
      shortName: 'Billing',
      category: 'revenue',
      head: 'Susan Alvarez',
      hours: '24/7 Inpatient / OPD Cashier',
      costCenter: 'CC-REV-01',
      revenueCenter: 'RC-REV-01',
      budget: 160000,
      billingEnabled: true,
      staffCount: 12,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 12,
      buildingAssigned: 'Main Inpatient Tower',
      floorAssigned: 'Ground Floor Lobby',
      roomsCount: 4,
      wardsCount: 0,
      bedsCount: 0,
      isOpen24Hours: true,
    },
    {
      id: '14',
      code: 'DEPT-INSUR',
      name: 'Insurance & TPA Helpdesk',
      shortName: 'Insurance / TPA',
      category: 'revenue',
      head: 'David Kumar',
      hours: '08:00 - 20:00 (Pre-Auth)',
      costCenter: 'CC-REV-02',
      revenueCenter: 'RC-REV-02',
      budget: 110000,
      billingEnabled: true,
      staffCount: 6,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 6,
      buildingAssigned: 'Main Inpatient Tower',
      floorAssigned: 'Ground Floor',
      roomsCount: 2,
      wardsCount: 0,
      bedsCount: 0,
    },
    {
      id: '15',
      code: 'DEPT-PHARM',
      name: 'Inpatient & Retail Pharmacy',
      shortName: 'Pharmacy',
      category: 'revenue',
      head: 'David Ross, PharmD',
      hours: '24/7 Pharmacy Counter',
      costCenter: 'CC-REV-03',
      revenueCenter: 'RC-REV-03',
      budget: 550000,
      billingEnabled: true,
      staffCount: 15,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 12,
      receptionistsCount: 3,
      buildingAssigned: 'Main Inpatient Tower',
      floorAssigned: 'Ground Floor Central Dispense',
      roomsCount: 3,
      wardsCount: 0,
      bedsCount: 0,
      isOpen24Hours: true,
    },
    {
      id: '16',
      code: 'DEPT-CORP',
      name: 'Corporate Empanelment Desk',
      shortName: 'Corporate Desk',
      category: 'revenue',
      head: 'Rachel Green',
      hours: '09:00 - 18:00',
      costCenter: 'CC-REV-04',
      revenueCenter: 'RC-REV-04',
      budget: 95000,
      billingEnabled: true,
      staffCount: 4,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 4,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Floor 1',
      roomsCount: 2,
      wardsCount: 0,
      bedsCount: 0,
    },

    // Admin
    {
      id: '17',
      code: 'DEPT-HR',
      name: 'Human Resources & Payroll',
      shortName: 'HR',
      category: 'admin',
      head: 'Patricia Wright',
      hours: '09:00 - 18:00',
      costCenter: 'CC-ADM-01',
      budget: 140000,
      billingEnabled: false,
      staffCount: 8,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 8,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Floor 2',
      roomsCount: 3,
      wardsCount: 0,
      bedsCount: 0,
    },
    {
      id: '18',
      code: 'DEPT-FIN',
      name: 'Finance & Accounts Audit',
      shortName: 'Finance',
      category: 'admin',
      head: 'Franklin Moore, CPA',
      hours: '09:00 - 18:00',
      costCenter: 'CC-ADM-02',
      budget: 130000,
      billingEnabled: false,
      staffCount: 7,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 7,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Floor 2',
      roomsCount: 3,
      wardsCount: 0,
      bedsCount: 0,
    },
    {
      id: '19',
      code: 'DEPT-MRD',
      name: 'Medical Records Department (MRD)',
      shortName: 'MRD',
      category: 'admin',
      head: 'Helen Keller, RHIA',
      hours: '08:00 - 18:00',
      costCenter: 'CC-ADM-03',
      budget: 120000,
      billingEnabled: false,
      staffCount: 9,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 4,
      receptionistsCount: 5,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Basement Archive Suite',
      roomsCount: 4,
      wardsCount: 0,
      bedsCount: 0,
    },
    {
      id: '20',
      code: 'DEPT-LEGAL',
      name: 'Legal & Clinical Compliance',
      shortName: 'Legal & Medico',
      category: 'admin',
      head: 'Adv. Samuel Vance',
      hours: '09:00 - 17:00',
      costCenter: 'CC-ADM-04',
      budget: 150000,
      billingEnabled: false,
      staffCount: 3,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 3,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Floor 3',
      roomsCount: 2,
      wardsCount: 0,
      bedsCount: 0,
    },

    // Support
    {
      id: '21',
      code: 'DEPT-HK',
      name: 'Hospital Housekeeping & Sanitation',
      shortName: 'Housekeeping',
      category: 'support',
      head: 'George Bailey',
      hours: '24/7 Multi-Shift',
      costCenter: 'CC-SUP-01',
      budget: 260000,
      billingEnabled: false,
      staffCount: 48,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 0,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Service Basement',
      roomsCount: 2,
      wardsCount: 0,
      bedsCount: 0,
      isOpen24Hours: true,
    },
    {
      id: '22',
      code: 'DEPT-BIOMED',
      name: 'Biomedical Engineering & Calibration',
      shortName: 'Biomed',
      category: 'support',
      head: 'Eng. Victor Stone',
      hours: '24/7 On-Call Maintenance',
      costCenter: 'CC-SUP-02',
      budget: 210000,
      billingEnabled: false,
      staffCount: 6,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 6,
      receptionistsCount: 0,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Basement Workshop',
      roomsCount: 2,
      wardsCount: 0,
      bedsCount: 0,
      isOpen24Hours: true,
    },
    {
      id: '23',
      code: 'DEPT-SEC',
      name: 'Security & Access Surveillance',
      shortName: 'Security',
      category: 'support',
      head: 'Capt. Roger Davis',
      hours: '24/7 CCTV & Guards',
      costCenter: 'CC-SUP-03',
      budget: 190000,
      billingEnabled: false,
      staffCount: 22,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 0,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Gatehouse & Control Hub',
      roomsCount: 2,
      wardsCount: 0,
      bedsCount: 0,
      isOpen24Hours: true,
    },
    {
      id: '24',
      code: 'DEPT-KITCH',
      name: 'Dietary & Patient Nutrition Kitchen',
      shortName: 'Dietary',
      category: 'support',
      head: 'Chef Maria Santos',
      hours: '05:00 - 22:00 (Meal Schedules)',
      costCenter: 'CC-SUP-04',
      budget: 310000,
      billingEnabled: false,
      staffCount: 18,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 0,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Ground Floor Kitchen',
      roomsCount: 3,
      wardsCount: 0,
      bedsCount: 0,
    },
    ];
  });

  const saveDepartments = (depts: DepartmentProfileData[]) => {
    setDepartments(depts);
    try {
      localStorage.setItem('north_hospital_departments_master', JSON.stringify(depts));
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAdd = () => {
    setIsAddModalOpen(true);
  };

  const handleSaveAdd = (newDept: DepartmentProfileData) => {
    const updated = [newDept, ...departments];
    saveDepartments(updated);
    setIsAddModalOpen(false);
    setActiveViewDept(newDept);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this department?')) {
      const updated = departments.filter((d) => d.id !== id);
      saveDepartments(updated);
      if (activeViewDept?.id === id) {
        setActiveViewDept(null);
      }
    }
  };

  const handleUpdateDept = (updated: DepartmentProfileData) => {
    const nextList = departments.map((d) => (d.id === updated.id ? updated : d));
    saveDepartments(nextList);
    setActiveViewDept(updated);
  };

  const handleDeployPack = (newDepts: DepartmentProfileData[], mode: 'replace' | 'append') => {
    let nextList: DepartmentProfileData[];
    if (mode === 'replace') {
      nextList = newDepts;
    } else {
      const existingCodes = new Set(departments.map((d) => d.code));
      nextList = [...departments, ...newDepts.filter((nd) => !existingCodes.has(nd.code))];
    }
    saveDepartments(nextList);
  };

  // Synchronize department updates and staff changes in real time
  useEffect(() => {
    const onDeptUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setDepartments(e.detail);
      }
    };
    const onStaffUpdate = () => {
      setStaffVersion((v) => v + 1);
    };

    window.addEventListener('north_hospital_departments_updated', onDeptUpdate);
    window.addEventListener('north_hospital_staff_updated', onStaffUpdate);

    return () => {
      window.removeEventListener('north_hospital_departments_updated', onDeptUpdate);
      window.removeEventListener('north_hospital_staff_updated', onStaffUpdate);
    };
  }, []);

  const campusBuildings = useMemo(
    () => getCampusBuildings(),
    [isAddModalOpen, isCampusMatrixOpen, isStarterPacksOpen, departments]
  );

  const campusStats = useMemo(() => {
    let totalWards = 0;
    let assignedWards = 0;
    let totalRooms = 0;
    let assignedRooms = 0;
    let totalBeds = 0;
    let assignedBeds = 0;

    campusBuildings.forEach((b) => {
      b.floors.forEach((f) => {
        f.wards.forEach((w) => {
          totalWards++;
          totalBeds += w.beds.length;
          if (w.departmentName) {
            assignedWards++;
            assignedBeds += w.beds.length;
          }
        });
        f.rooms.forEach((r) => {
          totalRooms++;
          if (r.departmentName) {
            assignedRooms++;
          }
        });
      });
    });

    const unassignedWards = totalWards - assignedWards;
    const unassignedBeds = totalBeds - assignedBeds;
    const unassignedRooms = totalRooms - assignedRooms;
    const allocationPercent = totalBeds > 0 ? Math.round((assignedBeds / totalBeds) * 100) : 0;

    return {
      totalBuildings: campusBuildings.length,
      totalWards,
      assignedWards,
      unassignedWards,
      totalRooms,
      assignedRooms,
      unassignedRooms,
      totalBeds,
      assignedBeds,
      unassignedBeds,
      allocationPercent,
    };
  }, [campusBuildings]);


  // If a department is selected for deep profile view/configuration, render DepartmentProfileView!
  if (activeViewDept) {
    return (
      <DepartmentProfileView
        department={activeViewDept}
        allDepartments={departments}
        initialTab={activeViewTab}
        onBack={() => {
          setActiveViewDept(null);
          setActiveViewTab('basic');
        }}
        onSave={handleUpdateDept}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div>
      {/* Executive Campus Space & Onboarding Allocation Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(249, 115, 22, 0.05) 100%)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', maxWidth: '650px' }}>
          <span
            style={{
              padding: '0.625rem',
              borderRadius: '10px',
              backgroundColor: campusStats.unassignedBeds > 0 ? 'rgba(234, 88, 12, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: campusStats.unassignedBeds > 0 ? '#ea580c' : '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '2px',
            }}
          >
            {campusStats.unassignedBeds > 0 ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
          </span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '1rem', fontWeight: 700 }}>
                Campus Physical Footprint Allocation
              </strong>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  backgroundColor: campusStats.unassignedBeds > 0 ? '#ffedd5' : '#dcfce7',
                  color: campusStats.unassignedBeds > 0 ? '#c2410c' : '#15803d',
                  fontWeight: 600,
                }}
              >
                {campusStats.assignedBeds} / {campusStats.totalBeds} Beds Governed ({campusStats.allocationPercent}%)
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.375rem 0 0 0', lineHeight: 1.4 }}>
              {campusStats.unassignedBeds > 0 ? (
                <>
                  Campus Infrastructure has <strong>{campusStats.unassignedBeds} Beds</strong> across {campusStats.unassignedWards} Wards and {campusStats.unassignedRooms} Consultation Chambers that are currently <strong>unassigned</strong> to any department.
                </>
              ) : (
                <>All {campusStats.totalBeds} hospital beds and clinical wards are fully assigned and governed by active departments.</>
              )}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsCampusMatrixOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}
          >
            <Building2 size={16} /> Campus Space Matrix
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsStarterPacksOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem',
              borderColor: '#ea580c',
              color: '#ea580c',
              backgroundColor: 'rgba(234, 88, 12, 0.05)',
            }}
          >
            <Sparkles size={16} /> ⚡ Onboarding Starter Packs
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="subtab-bar" style={{ marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        <button
          className={`subtab-pill ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          <LayoutGrid size={15} /> All Departments ({departments.length})
        </button>
        <button
          className={`subtab-pill ${activeCategory === 'clinical' ? 'active' : ''}`}
          onClick={() => setActiveCategory('clinical')}
        >
          <Stethoscope size={15} /> Clinical ({departments.filter((d) => d.category === 'clinical').length})
        </button>
        <button
          className={`subtab-pill ${activeCategory === 'diagnostic' ? 'active' : ''}`}
          onClick={() => setActiveCategory('diagnostic')}
        >
          <FlaskConical size={15} /> Diagnostic ({departments.filter((d) => d.category === 'diagnostic').length})
        </button>
        <button
          className={`subtab-pill ${activeCategory === 'revenue' ? 'active' : ''}`}
          onClick={() => setActiveCategory('revenue')}
        >
          <Coins size={15} /> Revenue & Billing ({departments.filter((d) => d.category === 'revenue').length})
        </button>
        <button
          className={`subtab-pill ${activeCategory === 'admin' ? 'active' : ''}`}
          onClick={() => setActiveCategory('admin')}
        >
          <Shield size={15} /> Administration & HR ({departments.filter((d) => d.category === 'admin').length})
        </button>
        <button
          className={`subtab-pill ${activeCategory === 'support' ? 'active' : ''}`}
          onClick={() => setActiveCategory('support')}
        >
          <Wrench size={15} /> Support & Facilities ({departments.filter((d) => d.category === 'support').length})
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            placeholder="Search departments by code, name, head, or cost center..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsStarterPacksOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', borderColor: '#ea580c', color: '#c2410c' }}
            title="1-Click deploy archetype packs for Multi-Specialty, Maternity, or Cardiac hospitals"
          >
            <Sparkles size={15} /> ⚡ Starter Packs
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsCampusMatrixOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            title="View full campus allocation matrix and assign rooms/wards"
          >
            <Building2 size={15} /> Space Matrix
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> + Custom Department
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Department Name</th>
              <th>Category</th>
              <th>Department Head</th>
              <th>Working Hours</th>
              <th>Cost Center</th>
              <th>Staff / Space</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>⚙ Configuration</th>
            </tr>
          </thead>
          <tbody>
            {departments
              .filter(
                (d) =>
                  (activeCategory === 'all' || d.category === activeCategory) &&
                  (d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    d.head.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    d.costCenter.toLowerCase().includes(searchQuery.toLowerCase()))
              )
              .map((dept) => {
                const liveStaff = getDepartmentPersonnelStats(dept.id, dept.name);
                const displayHead = liveStaff.hodName || dept.head;

                return (
                <tr
                  key={dept.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setActiveViewTab('basic');
                    setActiveViewDept(dept);
                  }}
                  title="Click to open Department Profile"
                >
                  <td>
                    <strong>{dept.code}</strong>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong>{dept.name}</strong>
                      {dept.buildingAssigned && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {dept.buildingAssigned} • {dept.floorAssigned || 'Floor 1'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        dept.category === 'clinical'
                          ? 'badge-info'
                          : dept.category === 'diagnostic'
                          ? 'badge-warning'
                          : dept.category === 'revenue'
                          ? 'badge-success'
                          : 'badge-secondary'
                      }`}
                    >
                      {dept.category}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {liveStaff.hodName && (
                        <span title="Assigned Head of Department (HOD) via Staff Master" style={{ color: '#d97706', display: 'flex' }}>
                          <Award size={14} />
                        </span>
                      )}
                      <span style={{ fontWeight: liveStaff.hodName ? 700 : 400 }}>{displayHead}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8125rem' }}>{dept.hours}</span>
                  </td>
                  <td>
                    <code>{dept.costCenter}</code>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="badge badge-secondary" style={{ fontWeight: 700 }}>
                          {liveStaff.total || dept.staffCount} Staff
                        </span>
                        {(dept.bedsCount || 0) > 0 && (
                          <span className="badge badge-info">{dept.bedsCount} Beds</span>
                        )}
                        {(dept.dailyConsultationCapacity || 0) > 0 && (
                          <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>
                            Quota: {dept.dailyConsultationCapacity}/day
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {liveStaff.doctors} Dr • {liveStaff.nurses} Nu • {liveStaff.techs} Tc
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        dept.status === 'ACTIVE'
                          ? 'badge-success'
                          : dept.status === 'UNDER_MAINTENANCE'
                          ? 'badge-warning'
                          : 'badge-secondary'
                      }`}
                    >
                      {dept.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'inline-flex', gap: '0.375rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          padding: '0.375rem 0.625rem',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          color: '#0369a1',
                          borderColor: '#bae6fd',
                          backgroundColor: '#f0f9ff',
                        }}
                        onClick={() => setSelectedDeptForStaff(dept)}
                        title="View Assigned Personnel & Role Roster"
                      >
                        <Users size={13} /> View Staff ({liveStaff.total})
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          padding: '0.375rem 0.625rem',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          color: '#047857',
                          borderColor: '#a7f3d0',
                          backgroundColor: '#ecfdf5',
                          fontWeight: 600,
                        }}
                        onClick={() => {
                          setActiveViewTab('permissions');
                          setActiveViewDept(dept);
                        }}
                        title="Assign & Manage Department Permissions, Capabilities & Staff Clearances"
                      >
                        <ShieldCheck size={13} /> Permissions
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                        onClick={() => {
                          setActiveViewTab('basic');
                          setActiveViewDept(dept);
                        }}
                        title="Open Department Profile & Operational Modules"
                      >
                        <Settings size={13} /> ⚙ Profile
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(dept.id)}
                        title="Delete Department"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* 1-Click Hospital Onboarding Archetype Starter Packs */}
      <OnboardingStarterPacksModal
        isOpen={isStarterPacksOpen}
        onClose={() => setIsStarterPacksOpen(false)}
        onDeployPack={handleDeployPack}
        currentCount={departments.length}
      />

      {/* Campus Space Allocation Matrix Modal */}
      <CampusSpaceAllocationModal
        isOpen={isCampusMatrixOpen}
        onClose={() => setIsCampusMatrixOpen(false)}
        departments={departments}
        onDepartmentUpdated={saveDepartments}
      />

      {/* 5-Step Hospital Admin Provisioning Wizard */}
      <RegisterDepartmentWizardModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveAdd}
      />

      {/* View Assigned Staff Modal */}
      <DepartmentAssignedStaffModal
        isOpen={Boolean(selectedDeptForStaff)}
        onClose={() => setSelectedDeptForStaff(null)}
        department={selectedDeptForStaff}
      />
    </div>
  );
};
