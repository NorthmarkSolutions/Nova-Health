import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  X,
  Layers,
  Building2,
  Stethoscope,
  HeartPulse,
  Baby,
  Activity,
  Bone,
  Check,
  AlertTriangle,
  ArrowRight,
  Shield,
  Coins,
  Clock,
  FlaskConical,
} from 'lucide-react';
import { DepartmentProfileData } from './DepartmentProfileView';
import { getCampusBuildings, syncDepartmentToCampus } from './CampusInfrastructureSection';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDeployPack: (newDepartments: DepartmentProfileData[], mode: 'replace' | 'append') => void;
  currentCount: number;
}

interface ArchetypePack {
  id: string;
  name: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  accentColor: string;
  departmentsCount: number;
  bedsEstimate: number;
  departments: DepartmentProfileData[];
}

export const OnboardingStarterPacksModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onDeployPack,
  currentCount,
}) => {
  const [selectedPackId, setSelectedPackId] = useState<string>('multi-specialty');
  const [deployMode, setDeployMode] = useState<'replace' | 'append'>('replace');

  const packs: ArchetypePack[] = [
    {
      id: 'multi-specialty',
      name: 'General Multi-Specialty Hospital',
      badge: 'Recommended for 100-300 Bed Hospitals',
      description:
        'Standard comprehensive hospital setup covering ambulatory outpatient clinics, inpatient bed wards, 24/7 emergency triage, critical care ICU, surgical operation theatres, and core diagnostics.',
      icon: Building2,
      accentColor: '#2563eb',
      departmentsCount: 8,
      bedsEstimate: 25,
      departments: [
        {
          id: 'pack-gen-1',
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
          assignedRoomIds: ['rm-101', 'rm-102'],
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
          id: 'pack-gen-2',
          code: 'DEPT-IPD',
          name: 'Inpatient Department (IPD)',
          shortName: 'IPD',
          category: 'clinical',
          head: 'Dr. Robert Vance',
          hours: '24/7 Continuous Inpatient',
          costCenter: 'CC-CLN-02',
          revenueCenter: 'RC-CLN-02',
          budget: 850000,
          billingEnabled: true,
          staffCount: 46,
          status: 'ACTIVE',
          doctorsCount: 14,
          nursesCount: 26,
          techsCount: 4,
          receptionistsCount: 2,
          assignedBuildingId: 'bld-main-1',
          buildingAssigned: 'North Central Hospital Tower',
          floorAssigned: 'First Floor (Level 1)',
          assignedFloorIds: ['fl-main-1'],
          assignedWardIds: ['wd-1-1'],
          assignedRoomIds: ['rm-110', 'rm-111'],
          roomsCount: 2,
          wardsCount: 1,
          bedsCount: 3,
          hasDedicatedWaitingArea: true,
          consultationEnabled: true,
          admissionEnabled: true,
          procedureEnabled: true,
          labRequestsEnabled: true,
          prescriptionEnabled: true,
        },
        {
          id: 'pack-gen-3',
          code: 'DEPT-ER',
          name: 'Emergency & Trauma (ER)',
          shortName: 'ER / Trauma',
          category: 'clinical',
          head: 'Dr. Neil Patrick',
          hours: '24/7 Emergency Triage',
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
          assignedRoomIds: ['rm-104'],
          roomsCount: 1,
          wardsCount: 1,
          bedsCount: 6,
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
          id: 'pack-gen-4',
          code: 'DEPT-ICU',
          name: 'Intensive Critical Care (ICU)',
          shortName: 'ICU',
          category: 'clinical',
          head: 'Dr. Arthur Pendelton',
          hours: '24/7 Critical Care',
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
          id: 'pack-gen-5',
          code: 'DEPT-OT',
          name: 'Operation Theatre Complex (OT)',
          shortName: 'OT Complex',
          category: 'clinical',
          head: 'Dr. Marcus Brody',
          hours: '24/7 Surgical Suites',
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
          assignedRoomIds: ['rm-201', 'rm-202'],
          roomsCount: 2,
          wardsCount: 0,
          bedsCount: 0,
          procedureEnabled: true,
          consultationEnabled: false,
        },
        {
          id: 'pack-gen-6',
          code: 'DEPT-RAD',
          name: 'Radiology & Medical Imaging',
          shortName: 'Radiology',
          category: 'diagnostic',
          head: 'Dr. Elena Rostova',
          hours: '24/7 Diagnostics',
          costCenter: 'CC-DIA-01',
          revenueCenter: 'RC-DIA-01',
          budget: 450000,
          billingEnabled: true,
          staffCount: 16,
          status: 'ACTIVE',
          doctorsCount: 4,
          nursesCount: 2,
          techsCount: 8,
          receptionistsCount: 2,
          buildingAssigned: 'North Central Hospital Tower',
          floorAssigned: 'Ground Floor (Level 0)',
          roomsCount: 3,
          wardsCount: 0,
          bedsCount: 0,
          labRequestsEnabled: true,
        },
        {
          id: 'pack-gen-7',
          code: 'DEPT-PATH',
          name: 'Clinical Pathology & Bio-Chemistry Lab',
          shortName: 'Pathology',
          category: 'diagnostic',
          head: 'Dr. Aris Thorne',
          hours: '24/7 Central Lab',
          costCenter: 'CC-DIA-02',
          revenueCenter: 'RC-DIA-02',
          budget: 380000,
          billingEnabled: true,
          staffCount: 18,
          status: 'ACTIVE',
          doctorsCount: 4,
          nursesCount: 2,
          techsCount: 10,
          receptionistsCount: 2,
          buildingAssigned: 'North Central Hospital Tower',
          floorAssigned: 'Ground Floor (Level 0)',
          roomsCount: 2,
          wardsCount: 0,
          bedsCount: 0,
          labRequestsEnabled: true,
        },
        {
          id: 'pack-gen-8',
          code: 'DEPT-PHARM',
          name: 'Central Hospital Pharmacy & Stores',
          shortName: 'Pharmacy',
          category: 'support',
          head: 'Pharm. David Sterling',
          hours: '24/7 Dispensary',
          costCenter: 'CC-SUP-01',
          revenueCenter: 'RC-SUP-01',
          budget: 520000,
          billingEnabled: true,
          staffCount: 14,
          status: 'ACTIVE',
          doctorsCount: 0,
          nursesCount: 0,
          techsCount: 12,
          receptionistsCount: 2,
          buildingAssigned: 'North Central Hospital Tower',
          floorAssigned: 'Ground Floor (Level 0)',
          roomsCount: 2,
          wardsCount: 0,
          bedsCount: 0,
          prescriptionEnabled: true,
        },
      ],
    },
    {
      id: 'maternity',
      name: 'Maternity, Women & Child Health Center',
      badge: 'Specialized OB/GYN & Pediatric Hospital',
      description:
        'Configured specifically for maternity hospitals, birthing centers, and pediatric clinical facilities. Includes labor suites, NICU incubators, and pediatric clinics.',
      icon: Baby,
      accentColor: '#ec4899',
      departmentsCount: 5,
      bedsEstimate: 20,
      departments: [
        {
          id: 'pack-mat-1',
          code: 'DEPT-OBGYN',
          name: 'Obstetrics & High-Risk Pregnancy',
          shortName: 'OB/GYN',
          category: 'clinical',
          head: 'Dr. Meera Nambiar, MD (OBGYN)',
          hours: '24/7 Maternity Emergency',
          costCenter: 'CC-MAT-01',
          revenueCenter: 'RC-MAT-01',
          budget: 680000,
          billingEnabled: true,
          staffCount: 28,
          status: 'ACTIVE',
          doctorsCount: 8,
          nursesCount: 16,
          techsCount: 2,
          receptionistsCount: 2,
          assignedBuildingId: 'bld-main-1',
          buildingAssigned: 'North Central Hospital Tower',
          floorAssigned: 'First Floor (Level 1)',
          assignedFloorIds: ['fl-main-1'],
          assignedWardIds: ['wd-1-2'],
          assignedRoomIds: ['rm-101'],
          roomsCount: 1,
          wardsCount: 1,
          bedsCount: 2,
          consultationEnabled: true,
          admissionEnabled: true,
          procedureEnabled: true,
          prescriptionEnabled: true,
          emergencyEnabled: true,
        },
        {
          id: 'pack-mat-2',
          code: 'DEPT-NICU',
          name: 'Neonatal Intensive Care Unit (NICU)',
          shortName: 'NICU',
          category: 'clinical',
          head: 'Dr. Emily Thorne, FAAP',
          hours: '24/7 Critical Neonatal Care',
          costCenter: 'CC-MAT-02',
          revenueCenter: 'RC-MAT-02',
          budget: 540000,
          billingEnabled: true,
          staffCount: 22,
          status: 'ACTIVE',
          doctorsCount: 6,
          nursesCount: 14,
          techsCount: 2,
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
          prescriptionEnabled: true,
          isOpen24Hours: true,
        },
        {
          id: 'pack-mat-3',
          code: 'DEPT-PED',
          name: 'Pediatrics & Adolescent Care',
          shortName: 'Pediatrics',
          category: 'clinical',
          head: 'Dr. Julian Alvarez, MD',
          hours: '08:00 - 20:00 (Mon-Sat)',
          costCenter: 'CC-MAT-03',
          revenueCenter: 'RC-MAT-03',
          budget: 320000,
          billingEnabled: true,
          staffCount: 18,
          status: 'ACTIVE',
          doctorsCount: 8,
          nursesCount: 6,
          techsCount: 2,
          receptionistsCount: 2,
          assignedBuildingId: 'bld-main-1',
          buildingAssigned: 'North Central Hospital Tower',
          floorAssigned: 'Ground Floor (Level 0)',
          assignedFloorIds: ['fl-main-0'],
          assignedWardIds: [],
          assignedRoomIds: ['rm-102'],
          roomsCount: 1,
          wardsCount: 0,
          bedsCount: 0,
          consultationEnabled: true,
          admissionEnabled: false,
          prescriptionEnabled: true,
        },
        {
          id: 'pack-mat-4',
          code: 'DEPT-LDR',
          name: 'Labor, Delivery & Recovery (LDR)',
          shortName: 'Labor Suites',
          category: 'clinical',
          head: 'Dr. Meera Nambiar',
          hours: '24/7 Delivery Suites',
          costCenter: 'CC-MAT-04',
          revenueCenter: 'RC-MAT-04',
          budget: 490000,
          billingEnabled: true,
          staffCount: 16,
          status: 'ACTIVE',
          doctorsCount: 4,
          nursesCount: 10,
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
          admissionEnabled: true,
        },
        {
          id: 'pack-mat-5',
          code: 'DEPT-CASH',
          name: 'Maternity Package Cashier & TPA',
          shortName: 'Maternity Billing',
          category: 'revenue',
          head: 'Karen Mitchell (CFO)',
          hours: '08:00 - 22:00',
          costCenter: 'CC-REV-01',
          revenueCenter: 'RC-REV-01',
          budget: 180000,
          billingEnabled: true,
          staffCount: 8,
          status: 'ACTIVE',
          doctorsCount: 0,
          nursesCount: 0,
          techsCount: 2,
          receptionistsCount: 6,
          buildingAssigned: 'North Central Hospital Tower',
          floorAssigned: 'Ground Floor (Level 0)',
          roomsCount: 1,
          wardsCount: 0,
          bedsCount: 0,
        },
      ],
    },
    {
      id: 'cardiac',
      name: 'Heart & Vascular Tertiary Institute',
      badge: 'Cardiology, Cath Lab & Heart Surgery',
      description:
        'For specialized cardiac institutes and centers of excellence. Pre-provisions non-invasive cardiac evaluation, interventional catheterization labs, CTVS suites, and CCU critical care.',
      icon: HeartPulse,
      accentColor: '#ef4444',
      departmentsCount: 6,
      bedsEstimate: 18,
      departments: [
        {
          id: 'pack-card-1',
          code: 'DEPT-CARD',
          name: 'Cardiology & Clinical Electrophysiology',
          shortName: 'Cardiology',
          category: 'clinical',
          head: 'Dr. Anthony Russo, FACC',
          hours: '08:00 - 20:00 Ambulatory',
          costCenter: 'CC-CARD-01',
          revenueCenter: 'RC-CARD-01',
          budget: 720000,
          billingEnabled: true,
          staffCount: 24,
          status: 'ACTIVE',
          doctorsCount: 10,
          nursesCount: 8,
          techsCount: 4,
          receptionistsCount: 2,
          assignedBuildingId: 'bld-main-1',
          buildingAssigned: 'North Central Hospital Tower',
          floorAssigned: 'Ground Floor (Level 0)',
          assignedFloorIds: ['fl-main-0'],
          assignedWardIds: [],
          assignedRoomIds: ['rm-102'],
          roomsCount: 1,
          wardsCount: 0,
          bedsCount: 0,
          consultationEnabled: true,
          prescriptionEnabled: true,
          labRequestsEnabled: true,
        },
        {
          id: 'pack-card-2',
          code: 'DEPT-CATH',
          name: 'Interventional Cardiology & Cath Lab',
          shortName: 'Cath Lab',
          category: 'clinical',
          head: 'Dr. Priya Sundaram, MD',
          hours: '24/7 Stemi Coverage',
          costCenter: 'CC-CARD-02',
          revenueCenter: 'RC-CARD-02',
          budget: 1200000,
          billingEnabled: true,
          staffCount: 18,
          status: 'ACTIVE',
          doctorsCount: 6,
          nursesCount: 6,
          techsCount: 6,
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
          emergencyEnabled: true,
        },
        {
          id: 'pack-card-3',
          code: 'DEPT-CTVS',
          name: 'Cardiothoracic & Vascular Surgery (CTVS)',
          shortName: 'CTVS Surgery',
          category: 'clinical',
          head: 'Dr. Gregory Vance, FACS',
          hours: '24/7 Open Heart Suites',
          costCenter: 'CC-CARD-03',
          revenueCenter: 'RC-CARD-03',
          budget: 1400000,
          billingEnabled: true,
          staffCount: 20,
          status: 'ACTIVE',
          doctorsCount: 8,
          nursesCount: 8,
          techsCount: 4,
          receptionistsCount: 0,
          assignedBuildingId: 'bld-main-1',
          buildingAssigned: 'North Central Hospital Tower',
          floorAssigned: 'Second Floor (Level 2)',
          assignedFloorIds: ['fl-main-2'],
          assignedWardIds: [],
          assignedRoomIds: ['rm-202'],
          roomsCount: 1,
          wardsCount: 0,
          bedsCount: 0,
          procedureEnabled: true,
        },
        {
          id: 'pack-card-4',
          code: 'DEPT-CCU',
          name: 'Coronary Care Critical Unit (CCU)',
          shortName: 'Cardiac ICU',
          category: 'clinical',
          head: 'Dr. Arthur Pendelton',
          hours: '24/7 Telemetry ICU',
          costCenter: 'CC-CARD-04',
          revenueCenter: 'RC-CARD-04',
          budget: 950000,
          billingEnabled: true,
          staffCount: 26,
          status: 'ACTIVE',
          doctorsCount: 8,
          nursesCount: 16,
          techsCount: 2,
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
          admissionEnabled: true,
          procedureEnabled: true,
          isOpen24Hours: true,
        },
        {
          id: 'pack-card-5',
          code: 'DEPT-ER-CHEST',
          name: 'Chest Pain & Acute Resuscitation Center',
          shortName: 'Chest Pain ER',
          category: 'clinical',
          head: 'Dr. Neil Patrick',
          hours: '24/7 Code STEMI Emergency',
          costCenter: 'CC-CARD-05',
          revenueCenter: 'RC-CARD-05',
          budget: 620000,
          billingEnabled: true,
          staffCount: 22,
          status: 'ACTIVE',
          doctorsCount: 8,
          nursesCount: 12,
          techsCount: 2,
          receptionistsCount: 0,
          assignedBuildingId: 'bld-main-1',
          buildingAssigned: 'North Central Hospital Tower',
          floorAssigned: 'Ground Floor (Level 0)',
          assignedFloorIds: ['fl-main-0'],
          assignedWardIds: ['wd-0-1'],
          assignedRoomIds: ['rm-104'],
          roomsCount: 1,
          wardsCount: 1,
          bedsCount: 6,
          emergencyEnabled: true,
          admissionEnabled: true,
          isOpen24Hours: true,
        },
        {
          id: 'pack-card-6',
          code: 'DEPT-REHAB',
          name: 'Cardiac Rehabilitation & Prevention',
          shortName: 'Cardiac Rehab',
          category: 'clinical',
          head: 'Dr. Claire Bennett',
          hours: '08:00 - 18:00',
          costCenter: 'CC-CARD-06',
          revenueCenter: 'RC-CARD-06',
          budget: 240000,
          billingEnabled: true,
          staffCount: 10,
          status: 'ACTIVE',
          doctorsCount: 2,
          nursesCount: 4,
          techsCount: 4,
          receptionistsCount: 0,
          buildingAssigned: 'North Central Hospital Tower',
          floorAssigned: 'First Floor (Level 1)',
          roomsCount: 1,
          wardsCount: 0,
          bedsCount: 0,
          consultationEnabled: true,
        },
      ],
    },
    {
      id: 'ortho',
      name: 'Orthopedics & Joint Reconstruction Hospital',
      badge: 'Joint Replacement, Spine & Sports Medicine',
      description:
        'Tailored for specialized orthopedic, spine, and trauma centers. Focuses on elective arthroplasty, acute fracture triage, physical rehabilitation, and digital skeletal radiology.',
      icon: Bone,
      accentColor: '#10b981',
      departmentsCount: 5,
      bedsEstimate: 15,
      departments: [
        {
          id: 'pack-ort-1',
          code: 'DEPT-ORTHO-JNT',
          name: 'Joint Replacement & Arthroscopy',
          shortName: 'Joint Replacement',
          category: 'clinical',
          head: 'Dr. Sean MacIntyre, FRCS',
          hours: '08:00 - 19:00',
          costCenter: 'CC-ORT-01',
          revenueCenter: 'RC-ORT-01',
          budget: 820000,
          billingEnabled: true,
          staffCount: 22,
          status: 'ACTIVE',
          doctorsCount: 8,
          nursesCount: 10,
          techsCount: 2,
          receptionistsCount: 2,
          assignedBuildingId: 'bld-main-1',
          buildingAssigned: 'North Central Hospital Tower',
          floorAssigned: 'Ground Floor (Level 0)',
          assignedFloorIds: ['fl-main-0'],
          assignedWardIds: [],
          assignedRoomIds: ['rm-103'],
          roomsCount: 1,
          wardsCount: 0,
          bedsCount: 0,
          consultationEnabled: true,
          procedureEnabled: true,
          prescriptionEnabled: true,
        },
        {
          id: 'pack-ort-2',
          code: 'DEPT-ORTHO-TRM',
          name: 'Orthopedic Trauma & Fracture Care',
          shortName: 'Ortho Trauma',
          category: 'clinical',
          head: 'Dr. Marcus Brody',
          hours: '24/7 Fracture Emergency',
          costCenter: 'CC-ORT-02',
          revenueCenter: 'RC-ORT-02',
          budget: 610000,
          billingEnabled: true,
          staffCount: 24,
          status: 'ACTIVE',
          doctorsCount: 8,
          nursesCount: 12,
          techsCount: 2,
          receptionistsCount: 2,
          assignedBuildingId: 'bld-main-1',
          buildingAssigned: 'North Central Hospital Tower',
          floorAssigned: 'First Floor (Level 1)',
          assignedFloorIds: ['fl-main-1'],
          assignedWardIds: ['wd-1-1'],
          assignedRoomIds: ['rm-110'],
          roomsCount: 1,
          wardsCount: 1,
          bedsCount: 3,
          admissionEnabled: true,
          emergencyEnabled: true,
          procedureEnabled: true,
        },
        {
          id: 'pack-ort-3',
          code: 'DEPT-PHYSIO',
          name: 'Physical Therapy & Sports Rehabilitation',
          shortName: 'Physio & Rehab',
          category: 'clinical',
          head: 'Dr. Claire Bennett, DPT',
          hours: '08:00 - 18:00',
          costCenter: 'CC-ORT-03',
          revenueCenter: 'RC-ORT-03',
          budget: 280000,
          billingEnabled: true,
          staffCount: 14,
          status: 'ACTIVE',
          doctorsCount: 4,
          nursesCount: 4,
          techsCount: 4,
          receptionistsCount: 2,
          buildingAssigned: 'North Central Hospital Tower',
          floorAssigned: 'First Floor (Level 1)',
          roomsCount: 2,
          wardsCount: 0,
          bedsCount: 0,
          consultationEnabled: true,
          procedureEnabled: true,
        },
        {
          id: 'pack-ort-4',
          code: 'DEPT-ORTHO-SURG',
          name: 'Laminar Flow Orthopedic OR Complex',
          shortName: 'Ortho OR',
          category: 'clinical',
          head: 'Dr. Sean MacIntyre',
          hours: '24/7 Sterile OR',
          costCenter: 'CC-ORT-04',
          revenueCenter: 'RC-ORT-04',
          budget: 950000,
          billingEnabled: true,
          staffCount: 16,
          status: 'ACTIVE',
          doctorsCount: 6,
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
        },
        {
          id: 'pack-ort-5',
          code: 'DEPT-RAD-ORTHO',
          name: 'Digital Musculoskeletal Imaging & MRI',
          shortName: 'MSK Radiology',
          category: 'diagnostic',
          head: 'Dr. Elena Rostova',
          hours: '24/7 Digital X-Ray & MRI',
          costCenter: 'CC-DIA-03',
          revenueCenter: 'RC-DIA-03',
          budget: 420000,
          billingEnabled: true,
          staffCount: 12,
          status: 'ACTIVE',
          doctorsCount: 2,
          nursesCount: 2,
          techsCount: 6,
          receptionistsCount: 2,
          buildingAssigned: 'North Central Hospital Tower',
          floorAssigned: 'Ground Floor (Level 0)',
          roomsCount: 2,
          wardsCount: 0,
          bedsCount: 0,
          labRequestsEnabled: true,
        },
      ],
    },
  ];

  const selectedPack = packs.find((p) => p.id === selectedPackId) || packs[0];

  const handleDeploy = () => {
    // Also synchronize assigned wards/rooms to campus infrastructure
    selectedPack.departments.forEach((d) => {
      if (d.assignedBuildingId && (d.assignedWardIds?.length || d.assignedRoomIds?.length)) {
        syncDepartmentToCampus(
          d.name,
          d.assignedBuildingId,
          d.assignedWardIds || [],
          d.assignedRoomIds || []
        );
      }
    });

    onDeployPack(selectedPack.departments, deployMode);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{
          maxWidth: '920px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* ================= FIXED HEADER ================= */}
        <div
          style={{
            flexShrink: 0,
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--card-bg, #ffffff)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(234, 88, 12, 0.1)',
                    color: '#ea580c',
                    padding: '0.375rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={20} />
                </span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                  Hospital Client Onboarding: Starter Archetype Packs
                </h3>
              </div>
              <span
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.25rem',
                  display: 'block',
                }}
              >
                Instantly provision an entire hospital department roster tailored to your client’s specialty. You can modify or add more departments anytime.
              </span>
            </div>
            <button className="action-btn" onClick={onClose} title="Cancel">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ================= SCROLLABLE BODY ================= */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '1.5rem',
            backgroundColor: 'var(--bg-subtle, #f9fafb)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Pack Selection Cards */}
          <div>
            <label
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'var(--text-color)',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '0.75rem',
              }}
            >
              1. Choose Hospital Specialization Archetype:
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {packs.map((pack) => {
                const isSelected = pack.id === selectedPackId;
                const Icon = pack.icon;
                return (
                  <div
                    key={pack.id}
                    onClick={() => setSelectedPackId(pack.id)}
                    style={{
                      backgroundColor: isSelected ? 'var(--card-bg, #ffffff)' : 'var(--card-bg, #ffffff)',
                      border: `2px solid ${isSelected ? pack.accentColor : 'var(--border-color)'}`,
                      borderRadius: '10px',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected
                        ? '0 4px 12px rgba(0,0,0,0.08)'
                        : 'none',
                      position: 'relative',
                    }}
                  >
                    {isSelected && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          backgroundColor: pack.accentColor,
                          color: '#ffffff',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                    <span
                      style={{
                        display: 'inline-flex',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        backgroundColor: `${pack.accentColor}15`,
                        color: pack.accentColor,
                        marginBottom: '0.5rem',
                      }}
                    >
                      <Icon size={20} />
                    </span>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9375rem', fontWeight: 700 }}>
                      {pack.name}
                    </h4>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: pack.accentColor,
                        display: 'block',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {pack.departmentsCount} Clinical Divisions
                    </span>
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        margin: 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {pack.badge}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Pack Preview */}
          <div
            style={{
              backgroundColor: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '1.25rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    color: selectedPack.accentColor,
                    fontWeight: 700,
                  }}
                >
                  Archetype Blueprint Preview
                </span>
                <h4 style={{ margin: '0.25rem 0 0 0', fontSize: '1.125rem', fontWeight: 700 }}>
                  {selectedPack.name}
                </h4>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {selectedPack.description}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="badge badge-info" style={{ padding: '0.375rem 0.625rem' }}>
                  {selectedPack.departmentsCount} Departments
                </span>
                <span className="badge badge-success" style={{ padding: '0.375rem 0.625rem' }}>
                  ~{selectedPack.departments.reduce((acc, d) => acc + (d.staffCount || 0), 0)} Core Staff
                </span>
              </div>
            </div>

            {/* Department Roster Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.5rem' }}>Code</th>
                    <th style={{ padding: '0.5rem' }}>Department</th>
                    <th style={{ padding: '0.5rem' }}>Category</th>
                    <th style={{ padding: '0.5rem' }}>Clinical Head (HOD)</th>
                    <th style={{ padding: '0.5rem' }}>Assigned Campus Space</th>
                    <th style={{ padding: '0.5rem' }}>Staff Baseline</th>
                    <th style={{ padding: '0.5rem' }}>Cost Center</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPack.departments.map((d) => (
                    <tr key={d.code} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.625rem 0.5rem' }}>
                        <code style={{ fontSize: '0.75rem' }}>{d.code}</code>
                      </td>
                      <td style={{ padding: '0.625rem 0.5rem', fontWeight: 600 }}>
                        {d.name}
                      </td>
                      <td style={{ padding: '0.625rem 0.5rem' }}>
                        <span
                          className={`badge ${
                            d.category === 'clinical'
                              ? 'badge-info'
                              : d.category === 'diagnostic'
                              ? 'badge-warning'
                              : 'badge-secondary'
                          }`}
                          style={{ fontSize: '0.7rem' }}
                        >
                          {d.category}
                        </span>
                      </td>
                      <td style={{ padding: '0.625rem 0.5rem', color: 'var(--text-muted)' }}>
                        {d.head}
                      </td>
                      <td style={{ padding: '0.625rem 0.5rem' }}>
                        <span style={{ fontSize: '0.75rem' }}>
                          {d.floorAssigned || 'Campus Building'}
                          {(d.bedsCount || 0) > 0 && (
                            <strong> • {d.bedsCount} Beds</strong>
                          )}
                        </span>
                      </td>
                      <td style={{ padding: '0.625rem 0.5rem' }}>
                        <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                          {d.staffCount} Staff ({d.doctorsCount} Drs, {d.nursesCount} Nurses)
                        </span>
                      </td>
                      <td style={{ padding: '0.625rem 0.5rem' }}>
                        <code style={{ fontSize: '0.75rem' }}>{d.costCenter}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deployment Mode Selection */}
          <div
            style={{
              backgroundColor: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
            }}
          >
            <label
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'var(--text-color)',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '0.5rem',
              }}
            >
              2. Onboarding Deployment Mode:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.625rem',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${deployMode === 'replace' ? 'var(--primary)' : 'var(--border-color)'}`,
                  backgroundColor: deployMode === 'replace' ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="deployMode"
                  checked={deployMode === 'replace'}
                  onChange={() => setDeployMode('replace')}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.8125rem', display: 'block' }}>
                    Fresh Client Onboarding: Replace current department list
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Clears the {currentCount} existing prototype departments and initializes this hospital with the {selectedPack.departmentsCount} departments from this archetype.
                  </span>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.625rem',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${deployMode === 'append' ? 'var(--primary)' : 'var(--border-color)'}`,
                  backgroundColor: deployMode === 'append' ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="deployMode"
                  checked={deployMode === 'append'}
                  onChange={() => setDeployMode('append')}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.8125rem', display: 'block' }}>
                    Expand Existing Hospital: Append to current department list
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Preserves existing departments and adds these new {selectedPack.departmentsCount} divisions to the roster.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* ================= FIXED FOOTER ================= */}
        <div
          style={{
            flexShrink: 0,
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--card-bg, #ffffff)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Selected: <strong>{selectedPack.name}</strong> ({selectedPack.departmentsCount} departments)
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleDeploy}
              style={{
                backgroundColor: selectedPack.accentColor,
                borderColor: selectedPack.accentColor,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Sparkles size={16} /> Deploy {selectedPack.name}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
