import React, { useState } from 'react';
import {
  Building2,
  Building,
  Layers,
  DoorClosed,
  BedDouble,
  SlidersHorizontal,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Search,
  Activity,
  DollarSign,
  Shield,
  X,
  Clock,
  User,
  Users,
  Stethoscope,
  ClipboardList,
  HeartPulse,
  UserPlus,
  Save,
  ArrowRightLeft,
  LogOut,
} from 'lucide-react';

// ============================================================================
// DATA MODELS: CLINICAL IPD CARE, MULTI-DOCTOR, NURSING, COMPOUNDER & CLEANERS
// ============================================================================

export interface InpatientCareDetails {
  patientName: string;
  uhid: string;
  ipdAdmissionNo: string;
  admissionDate: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  diagnosis: string;
  acuity: 'STABLE' | 'GUARDED' | 'CRITICAL' | 'OBSERVATION';

  // Attending Doctors (1 Primary + Multiple Cross-Consulting Doctors)
  primaryDoctor: { id: string; name: string; specialty: string; phone?: string };
  consultingDoctors: Array<{ id: string; name: string; specialty: string; role: string }>;

  // Nursing & Compounders / Paramedics
  primaryNurse: { id: string; name: string; shift: 'Morning' | 'Evening' | 'Night' };
  compounder?: { id: string; name: string; duty: string }; // e.g. Wound Dressing, IV Line Care

  // Sanitation & Housekeeping Staff
  assignedCleaner?: { id: string; name: string; shift: string };
  cleanlinessStatus: 'SANITIZED' | 'NEEDS_CLEANING' | 'CLEANING_IN_PROGRESS';
  lastCleanedAt?: string;

  // Vitals summary
  vitals?: { bp: string; pulse: string; spo2: string; temp: string };
}

export interface BedNode {
  id: string;
  bedNumber: string;
  bedType:
    | 'Standard Ward Bed'
    | 'Motorized ICU Ventilator'
    | 'Semi-Fowler'
    | 'Deluxe Suite'
    | 'Pediatric Crib'
    | 'Emergency Stretcher';
  dailyTariff: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  notes?: string;

  // Deep Inpatient & Staff Activity details
  inpatientDetails?: InpatientCareDetails;

  // Sanitation status when vacant or under maintenance
  cleanlinessStatus?: 'SANITIZED' | 'NEEDS_CLEANING' | 'CLEANING_IN_PROGRESS';
  lastCleanedAt?: string;
  assignedCleaner?: string;
}

export interface RoomNode {
  id: string;
  roomNumber: string;
  roomType:
    | 'Consultation Room'
    | 'Procedure Room'
    | 'Doctor Chamber'
    | 'Private Inpatient Room'
    | 'OT Suite'
    | 'Daycare Unit';
  capacity: number;
  departmentName?: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  attendingStaff?: {
    doctorName?: string;
    nurseOrCompounder?: string;
    statusNote?: string;
  };
}

export interface WardStaffRoster {
  supervisorNurse: string;
  onDutyNurses: Array<{ name: string; shift: string; grade: string }>;
  compounders: Array<{ name: string; duty: string; contact?: string }>;
  cleaners: Array<{ name: string; shift: string; lastRound: string }>;
  roundingDoctors: Array<{ name: string; department: string; roundTime: string }>;
}

export interface WardNode {
  id: string;
  name: string;
  wardType:
    | 'General Ward'
    | 'ICU Ward'
    | 'NICU Ward'
    | 'Pediatric Ward'
    | 'Male Ward'
    | 'Female Ward'
    | 'Maternity Ward'
    | 'Isolation Ward'
    | 'VIP Suite Ward';
  supervisorNurse: string;
  nursingStation: string;
  departmentName?: string;
  beds: BedNode[];
  staffRoster?: WardStaffRoster;
}

export interface FloorNode {
  id: string;
  floorNumber: string;
  code: string;
  wing: string;
  accessZone: string;
  rooms: RoomNode[];
  wards: WardNode[];
}

export interface BuildingNode {
  id: string;
  code: string;
  name: string;
  buildingType:
    | 'Clinical Inpatient Tower'
    | 'Emergency & Trauma Center'
    | 'Diagnostic & Oncology Pavilion'
    | 'Administration & Support';
  fireZone: string;
  utilities: string;
  floors: FloorNode[];
}

export const CampusInfrastructureSection: React.FC = () => {
  // View mode switcher: 'staff_activity' (rich clinical care & staff visibility) vs 'architecture' (compact layout)
  const [viewMode, setViewMode] = useState<'staff_activity' | 'architecture'>('staff_activity');

  // Pre-seeded 240-bed campus template with comprehensive IPD patients and staff activity
  const defaultCampusTemplate: BuildingNode[] = [
    {
      id: 'bld-1',
      code: 'BLD-MAIN',
      name: 'Main Clinical Hospital Tower',
      buildingType: 'Clinical Inpatient Tower',
      fireZone: 'Zone A & B (Smoke Detectors + Wet Risers)',
      utilities: 'Dual Substation (500kVA DG Backup), Central O2 Manifold',
      floors: [
        {
          id: 'fl-1-0',
          floorNumber: 'Ground Floor (Level 0)',
          code: 'FL-0',
          wing: 'Public Reception & Ambulatory Care',
          accessZone: 'Public Open Access',
          rooms: [
            {
              id: 'rm-101',
              roomNumber: 'OPD-101',
              roomType: 'Consultation Room',
              capacity: 1,
              departmentName: 'General Medicine',
              status: 'AVAILABLE',
              attendingStaff: { doctorName: 'Dr. Sarah Jenkins', nurseOrCompounder: 'Nurse Lisa Wong', statusNote: 'Active OPD Roster' },
            },
            {
              id: 'rm-102',
              roomNumber: 'OPD-102',
              roomType: 'Consultation Room',
              capacity: 1,
              departmentName: 'Cardiology',
              status: 'OCCUPIED',
              attendingStaff: { doctorName: 'Dr. Robert Vance', nurseOrCompounder: 'Compounder Dev Sharma', statusNote: 'Patient In Chamber' },
            },
            {
              id: 'rm-103',
              roomNumber: 'OPD-103',
              roomType: 'Consultation Room',
              capacity: 1,
              departmentName: 'Orthopedics',
              status: 'AVAILABLE',
              attendingStaff: { doctorName: 'Dr. Marcus Brody', nurseOrCompounder: 'Nurse Paul Davis', statusNote: 'Slot Available' },
            },
            {
              id: 'rm-104',
              roomNumber: 'TRIAGE-01',
              roomType: 'Procedure Room',
              capacity: 2,
              departmentName: 'Emergency & Trauma',
              status: 'AVAILABLE',
              attendingStaff: { doctorName: 'Dr. Neil Patrick', nurseOrCompounder: 'Sister Clara Oswald', statusNote: 'Emergency Triage Open' },
            },
          ],
          wards: [
            {
              id: 'wd-0-1',
              name: 'Emergency Observation Unit',
              wardType: 'General Ward',
              supervisorNurse: 'Sister Clara Oswald, RN',
              nursingStation: 'Station 0-A',
              departmentName: 'Emergency & Trauma (ER)',
              staffRoster: {
                supervisorNurse: 'Sister Clara Oswald, RN',
                onDutyNurses: [
                  { name: 'Sister Clara Oswald', shift: 'Day Shift (Lead)', grade: 'RN-BSN' },
                  { name: 'Nurse Emily Vance', shift: 'Day Shift', grade: 'Staff Nurse' },
                ],
                compounders: [
                  { name: 'Dev Sharma', duty: 'Trauma Dressing & IV Cannulation', contact: 'Ext: 201' },
                ],
                cleaners: [
                  { name: 'Ramesh Kumar', shift: 'Shift A (Sanitation)', lastRound: '25 mins ago' },
                ],
                roundingDoctors: [
                  { name: 'Dr. Neil Patrick', department: 'Emergency Medicine', roundTime: '08:15 AM' },
                  { name: 'Dr. Robert Vance', department: 'Internal Medicine Consult', roundTime: '09:00 AM' },
                ],
              },
              beds: [
                {
                  id: 'b-0-1',
                  bedNumber: 'ER-OBS-01',
                  bedType: 'Emergency Stretcher',
                  dailyTariff: 180,
                  status: 'OCCUPIED',
                  cleanlinessStatus: 'SANITIZED',
                  lastCleanedAt: 'Today, 08:30 AM',
                  assignedCleaner: 'Ramesh Kumar',
                  inpatientDetails: {
                    patientName: 'James Sullivan',
                    uhid: 'UHID-1049',
                    ipdAdmissionNo: 'IPD-2026-081',
                    admissionDate: '2026-09-16 22:45',
                    age: 48,
                    gender: 'MALE',
                    diagnosis: 'Acute Abdominal Trauma - Post Observation',
                    acuity: 'GUARDED',
                    primaryDoctor: { id: 'd-1', name: 'Dr. Neil Patrick', specialty: 'Emergency & Trauma', phone: '+1 555-0192' },
                    consultingDoctors: [
                      { id: 'd-2', name: 'Dr. Robert Vance', specialty: 'General Surgery Consult', role: 'Abdominal Evaluation' },
                      { id: 'd-3', name: 'Dr. Sarah Jenkins', specialty: 'Internal Medicine', role: 'Metabolic Monitoring' },
                    ],
                    primaryNurse: { id: 'n-1', name: 'Sister Clara Oswald, RN', shift: 'Morning' },
                    compounder: { id: 'c-1', name: 'Dev Sharma', duty: 'IV Antibiotics & Fluid Line' },
                    assignedCleaner: { id: 'cl-1', name: 'Ramesh Kumar', shift: 'Morning Shift' },
                    cleanlinessStatus: 'SANITIZED',
                    lastCleanedAt: 'Today, 08:30 AM',
                    vitals: { bp: '128/84', pulse: '82 bpm', spo2: '98%', temp: '98.6 °F' },
                  },
                },
                {
                  id: 'b-0-2',
                  bedNumber: 'ER-OBS-02',
                  bedType: 'Emergency Stretcher',
                  dailyTariff: 180,
                  status: 'OCCUPIED',
                  cleanlinessStatus: 'SANITIZED',
                  lastCleanedAt: 'Today, 07:15 AM',
                  assignedCleaner: 'Ramesh Kumar',
                  inpatientDetails: {
                    patientName: 'Maria Rodriguez',
                    uhid: 'UHID-1054',
                    ipdAdmissionNo: 'IPD-2026-085',
                    admissionDate: '2026-09-17 06:10',
                    age: 34,
                    gender: 'FEMALE',
                    diagnosis: 'Hypertensive Urgency & Severe Migraine',
                    acuity: 'STABLE',
                    primaryDoctor: { id: 'd-1', name: 'Dr. Neil Patrick', specialty: 'Emergency Medicine' },
                    consultingDoctors: [
                      { id: 'd-4', name: 'Dr. Arthur Pendelton', specialty: 'Neurology Consult', role: 'CT Angio Review' },
                    ],
                    primaryNurse: { id: 'n-2', name: 'Nurse Emily Vance, RN', shift: 'Morning' },
                    compounder: { id: 'c-1', name: 'Dev Sharma', duty: 'BP Monitoring & IV Infusion' },
                    assignedCleaner: { id: 'cl-1', name: 'Ramesh Kumar', shift: 'Morning Shift' },
                    cleanlinessStatus: 'SANITIZED',
                    lastCleanedAt: 'Today, 07:15 AM',
                    vitals: { bp: '158/96', pulse: '88 bpm', spo2: '99%', temp: '98.8 °F' },
                  },
                },
                {
                  id: 'b-0-3',
                  bedNumber: 'ER-OBS-03',
                  bedType: 'Emergency Stretcher',
                  dailyTariff: 180,
                  status: 'AVAILABLE',
                  cleanlinessStatus: 'SANITIZED',
                  lastCleanedAt: 'Today, 09:10 AM',
                  assignedCleaner: 'Ramesh Kumar',
                },
                {
                  id: 'b-0-4',
                  bedNumber: 'ER-OBS-04',
                  bedType: 'Emergency Stretcher',
                  dailyTariff: 180,
                  status: 'MAINTENANCE',
                  notes: 'Hydraulic lever calibration and sterilization cycle',
                  cleanlinessStatus: 'CLEANING_IN_PROGRESS',
                  assignedCleaner: 'Sunita Bai',
                },
                {
                  id: 'b-0-5',
                  bedNumber: 'ER-OBS-05',
                  bedType: 'Emergency Stretcher',
                  dailyTariff: 180,
                  status: 'AVAILABLE',
                  cleanlinessStatus: 'SANITIZED',
                  lastCleanedAt: 'Today, 06:40 AM',
                  assignedCleaner: 'Ramesh Kumar',
                },
                {
                  id: 'b-0-6',
                  bedNumber: 'ER-OBS-06',
                  bedType: 'Emergency Stretcher',
                  dailyTariff: 180,
                  status: 'AVAILABLE',
                  cleanlinessStatus: 'NEEDS_CLEANING',
                  lastCleanedAt: 'Yesterday, 22:00',
                  assignedCleaner: 'Pending Housekeeping Call',
                },
              ],
            },
          ],
        },
        {
          id: 'fl-1-1',
          floorNumber: 'First Floor (Level 1)',
          code: 'FL-1',
          wing: 'General Inpatient Wards (Male / Female)',
          accessZone: 'Authorized Patients & Relatives',
          rooms: [
            {
              id: 'rm-110',
              roomNumber: 'NURSE-STN-1A',
              roomType: 'Doctor Chamber',
              capacity: 4,
              departmentName: 'Inpatient Department (IPD)',
              status: 'OCCUPIED',
              attendingStaff: { doctorName: 'Dr. Robert Vance', nurseOrCompounder: 'Marcus Bell, BSN', statusNote: 'Inpatient Shift Handover' },
            },
            {
              id: 'rm-111',
              roomNumber: 'TREATMENT-1A',
              roomType: 'Procedure Room',
              capacity: 1,
              departmentName: 'Inpatient Department (IPD)',
              status: 'AVAILABLE',
              attendingStaff: { nurseOrCompounder: 'Compounder Anil Verma', statusNote: 'Sterile Dressing Cart Ready' },
            },
          ],
          wards: [
            {
              id: 'wd-1-1',
              name: 'Central Male Medical Inpatient Ward',
              wardType: 'Male Ward',
              supervisorNurse: 'Marcus Bell, BSN',
              nursingStation: 'Station 1-A',
              departmentName: 'Inpatient Department (IPD)',
              staffRoster: {
                supervisorNurse: 'Marcus Bell, BSN',
                onDutyNurses: [
                  { name: 'Marcus Bell', shift: 'Day Shift (Lead)', grade: 'BSN' },
                  { name: 'Nurse David Cho', shift: 'Day Shift', grade: 'Staff Nurse' },
                ],
                compounders: [
                  { name: 'Anil Verma', duty: 'Wound Dressings & Post-Op Drain Care', contact: 'Ext: 301' },
                ],
                cleaners: [
                  { name: 'Mohan Lal', shift: 'General Sanitation', lastRound: '40 mins ago' },
                ],
                roundingDoctors: [
                  { name: 'Dr. Robert Vance', department: 'Head of Internal Medicine', roundTime: '10:00 AM' },
                  { name: 'Dr. Kevin Zhao', department: 'Nephrology Rounds', roundTime: '11:15 AM' },
                ],
              },
              beds: [
                {
                  id: 'b-male-1',
                  bedNumber: 'BED-M-01',
                  bedType: 'Standard Ward Bed',
                  dailyTariff: 150,
                  status: 'OCCUPIED',
                  cleanlinessStatus: 'SANITIZED',
                  lastCleanedAt: 'Today, 08:00 AM',
                  assignedCleaner: 'Mohan Lal',
                  inpatientDetails: {
                    patientName: 'George Washington',
                    uhid: 'UHID-1088',
                    ipdAdmissionNo: 'IPD-2026-092',
                    admissionDate: '2026-09-15 14:00',
                    age: 62,
                    gender: 'MALE',
                    diagnosis: 'Community Acquired Pneumonia - Day 3',
                    acuity: 'STABLE',
                    primaryDoctor: { id: 'd-2', name: 'Dr. Robert Vance', specialty: 'Internal Medicine' },
                    consultingDoctors: [
                      { id: 'd-5', name: 'Dr. Emily Thorne', specialty: 'Pulmonology Consult', role: 'Bronchial Clearance' },
                    ],
                    primaryNurse: { id: 'n-3', name: 'Marcus Bell, BSN', shift: 'Morning' },
                    compounder: { id: 'c-2', name: 'Anil Verma', duty: 'Nebulization & IV Infusion' },
                    assignedCleaner: { id: 'cl-2', name: 'Mohan Lal', shift: 'Morning' },
                    cleanlinessStatus: 'SANITIZED',
                    lastCleanedAt: 'Today, 08:00 AM',
                    vitals: { bp: '122/78', pulse: '76 bpm', spo2: '96%', temp: '99.1 °F' },
                  },
                },
                {
                  id: 'b-male-2',
                  bedNumber: 'BED-M-02',
                  bedType: 'Standard Ward Bed',
                  dailyTariff: 150,
                  status: 'OCCUPIED',
                  cleanlinessStatus: 'SANITIZED',
                  lastCleanedAt: 'Today, 08:15 AM',
                  assignedCleaner: 'Mohan Lal',
                  inpatientDetails: {
                    patientName: 'Robert Chen',
                    uhid: 'UHID-1092',
                    ipdAdmissionNo: 'IPD-2026-094',
                    admissionDate: '2026-09-16 09:30',
                    age: 55,
                    gender: 'MALE',
                    diagnosis: 'Post Total Hip Replacement (Left)',
                    acuity: 'STABLE',
                    primaryDoctor: { id: 'd-6', name: 'Dr. Marcus Brody', specialty: 'Orthopedics & Surgery' },
                    consultingDoctors: [
                      { id: 'd-7', name: 'Dr. Claire Bennett', specialty: 'Physiotherapy & Rehab', role: 'Gait Training' },
                    ],
                    primaryNurse: { id: 'n-4', name: 'Nurse David Cho', shift: 'Morning' },
                    compounder: { id: 'c-2', name: 'Anil Verma', duty: 'Surgical Wound Dressing' },
                    assignedCleaner: { id: 'cl-2', name: 'Mohan Lal', shift: 'Morning' },
                    cleanlinessStatus: 'SANITIZED',
                    lastCleanedAt: 'Today, 08:15 AM',
                    vitals: { bp: '130/82', pulse: '78 bpm', spo2: '98%', temp: '98.4 °F' },
                  },
                },
                {
                  id: 'b-male-3',
                  bedNumber: 'BED-M-03',
                  bedType: 'Standard Ward Bed',
                  dailyTariff: 150,
                  status: 'AVAILABLE',
                  cleanlinessStatus: 'SANITIZED',
                  lastCleanedAt: 'Today, 07:00 AM',
                  assignedCleaner: 'Mohan Lal',
                },
                {
                  id: 'b-male-4',
                  bedNumber: 'BED-M-04',
                  bedType: 'Standard Ward Bed',
                  dailyTariff: 150,
                  status: 'AVAILABLE',
                  cleanlinessStatus: 'SANITIZED',
                  lastCleanedAt: 'Today, 07:30 AM',
                  assignedCleaner: 'Mohan Lal',
                },
              ],
            },
            {
              id: 'wd-1-2',
              name: 'Central Female Medical Inpatient Ward',
              wardType: 'Female Ward',
              supervisorNurse: 'Elena Rostova, RN',
              nursingStation: 'Station 1-B',
              departmentName: 'Inpatient Department (IPD)',
              staffRoster: {
                supervisorNurse: 'Elena Rostova, RN',
                onDutyNurses: [
                  { name: 'Elena Rostova', shift: 'Day Shift (Lead)', grade: 'RN' },
                  { name: 'Nurse Priya Sharma', shift: 'Day Shift', grade: 'Staff Nurse' },
                ],
                compounders: [
                  { name: 'Sunil Nair', duty: 'Post-Op Care & Dressings', contact: 'Ext: 302' },
                ],
                cleaners: [
                  { name: 'Sunita Bai', shift: 'Sanitation Ward B', lastRound: '15 mins ago' },
                ],
                roundingDoctors: [
                  { name: 'Dr. Sarah Jenkins', department: 'General Medicine', roundTime: '10:30 AM' },
                ],
              },
              beds: [
                {
                  id: 'b-fem-1',
                  bedNumber: 'BED-F-01',
                  bedType: 'Standard Ward Bed',
                  dailyTariff: 150,
                  status: 'OCCUPIED',
                  cleanlinessStatus: 'SANITIZED',
                  lastCleanedAt: 'Today, 08:30 AM',
                  assignedCleaner: 'Sunita Bai',
                  inpatientDetails: {
                    patientName: 'Sarah Connor',
                    uhid: 'UHID-1102',
                    ipdAdmissionNo: 'IPD-2026-101',
                    admissionDate: '2026-09-15 11:20',
                    age: 44,
                    gender: 'FEMALE',
                    diagnosis: 'Acute Pyelonephritis with Sepsis Watch',
                    acuity: 'GUARDED',
                    primaryDoctor: { id: 'd-3', name: 'Dr. Sarah Jenkins', specialty: 'General Medicine' },
                    consultingDoctors: [
                      { id: 'd-8', name: 'Dr. Kevin Zhao', specialty: 'Nephrology', role: 'Renal Function Monitoring' },
                      { id: 'd-9', name: 'Dr. Amanda Chen', specialty: 'Clinical Microbiology', role: 'Blood Culture & Sensitivities' },
                    ],
                    primaryNurse: { id: 'n-5', name: 'Elena Rostova, RN', shift: 'Morning' },
                    compounder: { id: 'c-3', name: 'Sunil Nair', duty: 'IV Infusions & Fluid Balance' },
                    assignedCleaner: { id: 'cl-3', name: 'Sunita Bai', shift: 'Morning' },
                    cleanlinessStatus: 'SANITIZED',
                    lastCleanedAt: 'Today, 08:30 AM',
                    vitals: { bp: '115/72', pulse: '86 bpm', spo2: '97%', temp: '100.2 °F' },
                  },
                },
                {
                  id: 'b-fem-2',
                  bedNumber: 'BED-F-02',
                  bedType: 'Standard Ward Bed',
                  dailyTariff: 150,
                  status: 'AVAILABLE',
                  cleanlinessStatus: 'SANITIZED',
                  lastCleanedAt: 'Today, 07:45 AM',
                  assignedCleaner: 'Sunita Bai',
                },
              ],
            },
          ],
        },
        {
          id: 'fl-1-2',
          floorNumber: 'Second Floor (Level 2)',
          code: 'FL-2',
          wing: 'Critical Care & Surgical Suites',
          accessZone: 'Strict Sterile Surgical Zone',
          rooms: [
            {
              id: 'rm-201',
              roomNumber: 'OT-SUITE-01',
              roomType: 'OT Suite',
              capacity: 1,
              departmentName: 'Operation Theatre & Surgery (OT)',
              status: 'OCCUPIED',
              attendingStaff: { doctorName: 'Dr. Marcus Brody', nurseOrCompounder: 'Surgical Tech Rajiv', statusNote: 'Laparoscopic Case In Progress' },
            },
            {
              id: 'rm-202',
              roomNumber: 'OT-SUITE-02',
              roomType: 'OT Suite',
              capacity: 1,
              departmentName: 'Operation Theatre & Surgery (OT)',
              status: 'AVAILABLE',
              attendingStaff: { nurseOrCompounder: 'Staff Nurse Maria', statusNote: 'Sterilized & Available' },
            },
          ],
          wards: [
            {
              id: 'wd-2-1',
              name: 'Intensive Critical Care Unit (ICU)',
              wardType: 'ICU Ward',
              supervisorNurse: 'Sister Miriam Cruz, CCRN',
              nursingStation: 'Station ICU-Central',
              departmentName: 'Intensive Critical Care (ICU)',
              staffRoster: {
                supervisorNurse: 'Sister Miriam Cruz, CCRN',
                onDutyNurses: [
                  { name: 'Miriam Cruz', shift: 'Day Shift (ICU Charge)', grade: 'CCRN' },
                  { name: 'Nurse Alan Walker', shift: 'Day Shift (1:1 Bed Care)', grade: 'BSN' },
                ],
                compounders: [
                  { name: 'Kishore Kumar', duty: 'Ventilator Circuit & Arterial Line Care', contact: 'Ext: 401' },
                ],
                cleaners: [
                  { name: 'Ramesh Kumar (Sterile Certified)', shift: 'Critical Area Clean', lastRound: '10 mins ago' },
                ],
                roundingDoctors: [
                  { name: 'Dr. Arthur Pendelton', department: 'Intensivist / Critical Care Head', roundTime: '08:00 AM' },
                  { name: 'Dr. Marcus Brody', department: 'Surgical ICU Consult', roundTime: '09:30 AM' },
                ],
              },
              beds: [
                {
                  id: 'b-icu-1',
                  bedNumber: 'ICU-BED-01',
                  bedType: 'Motorized ICU Ventilator',
                  dailyTariff: 450,
                  status: 'OCCUPIED',
                  cleanlinessStatus: 'SANITIZED',
                  lastCleanedAt: 'Today, 08:45 AM',
                  assignedCleaner: 'Ramesh Kumar (Sterile)',
                  inpatientDetails: {
                    patientName: 'Donald Vance',
                    uhid: 'UHID-1140',
                    ipdAdmissionNo: 'IPD-2026-118',
                    admissionDate: '2026-09-14 03:30',
                    age: 68,
                    gender: 'MALE',
                    diagnosis: 'Acute Respiratory Distress Syndrome (ARDS) on Mechanical Ventilation',
                    acuity: 'CRITICAL',
                    primaryDoctor: { id: 'd-10', name: 'Dr. Arthur Pendelton', specialty: 'Intensive Critical Care', phone: '+1 555-0188' },
                    consultingDoctors: [
                      { id: 'd-11', name: 'Dr. Jonathan Ross', specialty: 'Interventional Pulmonology', role: 'Ventilator Weaning Strategy' },
                      { id: 'd-12', name: 'Dr. Michael Chang', specialty: 'Cardiology Consult', role: 'Echo & Hemodynamic Support' },
                      { id: 'd-13', name: 'Dr. Anita Roy', specialty: 'Infectious Disease', role: 'Targeted Antibiotic Regimen' },
                    ],
                    primaryNurse: { id: 'n-6', name: 'Sister Miriam Cruz, CCRN', shift: 'Morning' },
                    compounder: { id: 'c-4', name: 'Kishore Kumar', duty: 'Arterial Blood Gas & Endotracheal Suction' },
                    assignedCleaner: { id: 'cl-1', name: 'Ramesh Kumar (Sterile Certified)', shift: 'Morning' },
                    cleanlinessStatus: 'SANITIZED',
                    lastCleanedAt: 'Today, 08:45 AM',
                    vitals: { bp: '136/88', pulse: '92 bpm', spo2: '94% (FiO2 50%)', temp: '99.4 °F' },
                  },
                },
                {
                  id: 'b-icu-2',
                  bedNumber: 'ICU-BED-02',
                  bedType: 'Motorized ICU Ventilator',
                  dailyTariff: 450,
                  status: 'AVAILABLE',
                  cleanlinessStatus: 'SANITIZED',
                  lastCleanedAt: 'Today, 09:00 AM',
                  assignedCleaner: 'Ramesh Kumar (Sterile)',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'bld-2',
      code: 'BLD-EMRG',
      name: 'Emergency & Trauma Pavilion',
      buildingType: 'Emergency & Trauma Center',
      fireZone: 'Zone E (Dedicated Helipad Access)',
      utilities: 'Independent Oxygen Liquefaction Tank, 300kVA Redundant UPS',
      floors: [
        {
          id: 'fl-2-0',
          floorNumber: 'Ground Floor Triage',
          code: 'FL-ER-0',
          wing: 'Resuscitation & Immediate Care',
          accessZone: 'Red Priority Emergency Triage',
          rooms: [
            { id: 'rm-er-01', roomNumber: 'RESUS-01', roomType: 'Procedure Room', capacity: 2, departmentName: 'Emergency & Trauma (ER)', status: 'AVAILABLE', attendingStaff: { doctorName: 'Dr. Neil Patrick', nurseOrCompounder: 'Sister Clara Oswald', statusNote: 'Crash Cart Checked' } },
            { id: 'rm-er-02', roomNumber: 'DECONTAM-01', roomType: 'Procedure Room', capacity: 1, departmentName: 'Emergency & Trauma (ER)', status: 'AVAILABLE' },
          ],
          wards: [
            {
              id: 'wd-er-red',
              name: 'Resuscitation Bay (Red Triage)',
              wardType: 'ICU Ward',
              supervisorNurse: 'Sister Clara Oswald, RN',
              nursingStation: 'Station Red Triage',
              departmentName: 'Emergency & Trauma (ER)',
              staffRoster: {
                supervisorNurse: 'Sister Clara Oswald, RN',
                onDutyNurses: [{ name: 'Sister Clara Oswald', shift: 'Emergency 24x7', grade: 'Lead Trauma RN' }],
                compounders: [{ name: 'Dev Sharma', duty: 'Emergency Cannulation & Defibrillator Assist' }],
                cleaners: [{ name: 'Ramesh Kumar', shift: 'Emergency Rapid Response', lastRound: '5 mins ago' }],
                roundingDoctors: [{ name: 'Dr. Neil Patrick', department: 'Trauma Team Leader', roundTime: 'Continuous 24/7' }],
              },
              beds: [
                { id: 'b-resus-1', bedNumber: 'RESUS-BED-01', bedType: 'Motorized ICU Ventilator', dailyTariff: 350, status: 'AVAILABLE', cleanlinessStatus: 'SANITIZED', lastCleanedAt: 'Today, 09:30 AM', assignedCleaner: 'Ramesh Kumar' },
                { id: 'b-resus-2', bedNumber: 'RESUS-BED-02', bedType: 'Motorized ICU Ventilator', dailyTariff: 350, status: 'AVAILABLE', cleanlinessStatus: 'SANITIZED', lastCleanedAt: 'Today, 09:25 AM', assignedCleaner: 'Ramesh Kumar' },
              ],
            },
          ],
        },
      ],
    },
  ];

  const [buildings, setBuildings] = useState<BuildingNode[]>(defaultCampusTemplate);
  const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({ 'bld-1': true, 'bld-2': true });
  const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>({ 'fl-1-0': true, 'fl-1-1': true, 'fl-1-2': true });
  const [expandedWards, setExpandedWards] = useState<Record<string, boolean>>({ 'wd-0-1': true, 'wd-1-1': true, 'wd-1-2': true, 'wd-2-1': true });

  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Modals state
  const [showAddBuildingModal, setShowAddBuildingModal] = useState(false);
  const [showAddFloorModal, setShowAddFloorModal] = useState<string | null>(null); // buildingId
  const [showAddWardModal, setShowAddWardModal] = useState<{ buildingId: string; floorId: string } | null>(null);
  const [showAddRoomModal, setShowAddRoomModal] = useState<{ buildingId: string; floorId: string } | null>(null);
  const [showAddBedModal, setShowAddBedModal] = useState<{ buildingId: string; floorId: string; wardId: string } | null>(null);

  // Deep Care & Staff Activity Inspection Modal
  const [selectedBedForCare, setSelectedBedForCare] = useState<{
    buildingId: string;
    floorId: string;
    wardId: string;
    bed: BedNode;
  } | null>(null);

  // Quick Admit Patient Modal
  const [admitPatientTarget, setAdmitPatientTarget] = useState<{
    buildingId: string;
    floorId: string;
    wardId: string;
    bed: BedNode;
  } | null>(null);

  // Ward Staff Manager Modal
  const [selectedWardForStaff, setSelectedWardForStaff] = useState<{
    buildingId: string;
    floorId: string;
    ward: WardNode;
  } | null>(null);

  // Form states
  const [buildingForm, setBuildingForm] = useState({ name: '', code: '', buildingType: 'Clinical Inpatient Tower' as BuildingNode['buildingType'] });
  const [floorForm, setFloorForm] = useState({ floorNumber: '', code: '', wing: '' });
  const [wardForm, setWardForm] = useState({ name: '', wardType: 'General Ward' as WardNode['wardType'], supervisorNurse: '' });
  const [roomForm, setRoomForm] = useState({ roomNumber: '', roomType: 'Consultation Room' as RoomNode['roomType'] });
  const [bedForm, setBedForm] = useState({ bedNumber: '', bedType: 'Standard Ward Bed' as BedNode['bedType'], dailyTariff: 150 });

  const showAlert = (msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 3500);
  };

  const toggleBuilding = (id: string) => {
    setExpandedBuildings((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFloor = (id: string) => {
    setExpandedFloors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleWard = (id: string) => {
    setExpandedWards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Rollup stats
  const totalBuildings = buildings.length;
  const totalFloors = buildings.reduce((acc, b) => acc + b.floors.length, 0);
  const totalRooms = buildings.reduce((acc, b) => acc + b.floors.reduce((accF, f) => accF + f.rooms.length, 0), 0);
  const totalWards = buildings.reduce((acc, b) => acc + b.floors.reduce((accF, f) => accF + f.wards.length, 0), 0);
  const totalBeds = buildings.reduce(
    (acc, b) => acc + b.floors.reduce((accF, f) => accF + f.wards.reduce((accW, w) => accW + w.beds.length, 0), 0),
    0
  );
  const occupiedBeds = buildings.reduce(
    (acc, b) =>
      acc +
      b.floors.reduce(
        (accF, f) =>
          accF + f.wards.reduce((accW, w) => accW + w.beds.filter((bed) => bed.status === 'OCCUPIED').length, 0),
        0
      ),
    0
  );
  const availableBeds = totalBeds - occupiedBeds;

  // Handlers for Add
  const handleAddBuildingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newBld: BuildingNode = {
      id: `bld-${Date.now()}`,
      code: buildingForm.code.toUpperCase(),
      name: buildingForm.name,
      buildingType: buildingForm.buildingType,
      fireZone: 'Zone A (Automated Suppression)',
      utilities: 'Primary Feeder + 250kVA Emergency Backup',
      floors: [],
    };
    setBuildings([...buildings, newBld]);
    setShowAddBuildingModal(false);
    setBuildingForm({ name: '', code: '', buildingType: 'Clinical Inpatient Tower' });
    showAlert(`Added building: ${newBld.name}`);
  };

  const handleAddFloorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddFloorModal) return;
    const newFloor: FloorNode = {
      id: `fl-${Date.now()}`,
      floorNumber: floorForm.floorNumber,
      code: floorForm.code.toUpperCase(),
      wing: floorForm.wing || 'Standard Wing',
      accessZone: 'Standard Clinical Access',
      rooms: [],
      wards: [],
    };
    setBuildings((prev) =>
      prev.map((b) => (b.id === showAddFloorModal ? { ...b, floors: [...b.floors, newFloor] } : b))
    );
    setExpandedFloors((prev) => ({ ...prev, [newFloor.id]: true }));
    setShowAddFloorModal(null);
    setFloorForm({ floorNumber: '', code: '', wing: '' });
    showAlert(`Added ${newFloor.floorNumber}`);
  };

  const handleAddWardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddWardModal) return;
    const { buildingId, floorId } = showAddWardModal;
    const newWard: WardNode = {
      id: `wd-${Date.now()}`,
      name: wardForm.name,
      wardType: wardForm.wardType,
      supervisorNurse: wardForm.supervisorNurse || 'Ward Incharge, RN',
      nursingStation: `Station ${wardForm.name.slice(0, 3).toUpperCase()}`,
      departmentName: 'Inpatient Department (IPD)',
      beds: [],
      staffRoster: {
        supervisorNurse: wardForm.supervisorNurse || 'Ward Incharge, RN',
        onDutyNurses: [{ name: wardForm.supervisorNurse || 'Ward Incharge, RN', shift: 'Day', grade: 'RN' }],
        compounders: [{ name: 'Compounder On Duty', duty: 'General Care' }],
        cleaners: [{ name: 'Assigned Cleaner', shift: 'Day', lastRound: 'Just now' }],
        roundingDoctors: [{ name: 'Dr. Assigned', department: 'Inpatient Care', roundTime: 'Morning' }],
      },
    };
    setBuildings((prev) =>
      prev.map((b) =>
        b.id === buildingId
          ? {
              ...b,
              floors: b.floors.map((f) => (f.id === floorId ? { ...f, wards: [...f.wards, newWard] } : f)),
            }
          : b
      )
    );
    setExpandedWards((prev) => ({ ...prev, [newWard.id]: true }));
    setShowAddWardModal(null);
    setWardForm({ name: '', wardType: 'General Ward', supervisorNurse: '' });
    showAlert(`Added ward: ${newWard.name}`);
  };

  const handleAddRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddRoomModal) return;
    const { buildingId, floorId } = showAddRoomModal;
    const newRoom: RoomNode = {
      id: `rm-${Date.now()}`,
      roomNumber: roomForm.roomNumber.toUpperCase(),
      roomType: roomForm.roomType,
      capacity: 1,
      departmentName: 'General Consultation',
      status: 'AVAILABLE',
      attendingStaff: { doctorName: 'Dr. Assigned', nurseOrCompounder: 'Assistant On-Duty' },
    };
    setBuildings((prev) =>
      prev.map((b) =>
        b.id === buildingId
          ? {
              ...b,
              floors: b.floors.map((f) => (f.id === floorId ? { ...f, rooms: [...f.rooms, newRoom] } : f)),
            }
          : b
      )
    );
    setShowAddRoomModal(null);
    setRoomForm({ roomNumber: '', roomType: 'Consultation Room' });
    showAlert(`Added room: ${newRoom.roomNumber}`);
  };

  const handleAddBedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddBedModal) return;
    const { buildingId, floorId, wardId } = showAddBedModal;
    const newBed: BedNode = {
      id: `bed-${Date.now()}`,
      bedNumber: bedForm.bedNumber.toUpperCase(),
      bedType: bedForm.bedType,
      dailyTariff: bedForm.dailyTariff,
      status: 'AVAILABLE',
      cleanlinessStatus: 'SANITIZED',
      lastCleanedAt: 'Just now',
      assignedCleaner: 'Housekeeping Desk',
    };
    setBuildings((prev) =>
      prev.map((b) =>
        b.id === buildingId
          ? {
              ...b,
              floors: b.floors.map((f) =>
                f.id === floorId
                  ? {
                      ...f,
                      wards: f.wards.map((w) => (w.id === wardId ? { ...w, beds: [...w.beds, newBed] } : w)),
                    }
                  : f
              ),
            }
          : b
      )
    );
    setShowAddBedModal(null);
    setBedForm({ bedNumber: '', bedType: 'Standard Ward Bed', dailyTariff: 150 });
    showAlert(`Added bed: ${newBed.bedNumber}`);
  };

  // Handlers for Delete
  const handleDeleteBuilding = (bldId: string) => {
    if (window.confirm('Delete this entire building and all floors/wards/beds?')) {
      setBuildings((prev) => prev.filter((b) => b.id !== bldId));
      showAlert('Building removed.');
    }
  };

  const handleDeleteFloor = (bldId: string, floorId: string) => {
    setBuildings((prev) =>
      prev.map((b) => (b.id === bldId ? { ...b, floors: b.floors.filter((f) => f.id !== floorId) } : b))
    );
    showAlert('Floor removed.');
  };

  const handleDeleteWard = (bldId: string, floorId: string, wardId: string) => {
    setBuildings((prev) =>
      prev.map((b) =>
        b.id === bldId
          ? {
              ...b,
              floors: b.floors.map((f) => (f.id === floorId ? { ...f, wards: f.wards.filter((w) => w.id !== wardId) } : f)),
            }
          : b
      )
    );
    showAlert('Ward removed.');
  };

  const handleDeleteBed = (bldId: string, floorId: string, wardId: string, bedId: string) => {
    setBuildings((prev) =>
      prev.map((b) =>
        b.id === bldId
          ? {
              ...b,
              floors: b.floors.map((f) =>
                f.id === floorId
                  ? {
                      ...f,
                      wards: f.wards.map((w) => (w.id === wardId ? { ...w, beds: w.beds.filter((bed) => bed.id !== bedId) } : w)),
                    }
                  : f
              ),
            }
          : b
      )
    );
    showAlert('Bed removed.');
  };

  // Toggle quick status
  const handleToggleBedStatus = (bldId: string, floorId: string, wardId: string, bedId: string) => {
    setBuildings((prev) =>
      prev.map((b) =>
        b.id === bldId
          ? {
              ...b,
              floors: b.floors.map((f) =>
                f.id === floorId
                  ? {
                      ...f,
                      wards: f.wards.map((w) =>
                        w.id === wardId
                          ? {
                              ...w,
                              beds: w.beds.map((bed) => {
                                if (bed.id === bedId) {
                                  const nextStatus: BedNode['status'] =
                                    bed.status === 'AVAILABLE' ? 'OCCUPIED' : bed.status === 'OCCUPIED' ? 'MAINTENANCE' : 'AVAILABLE';
                                  return { ...bed, status: nextStatus };
                                }
                                return bed;
                              }),
                            }
                          : w
                      ),
                    }
                  : f
              ),
            }
          : b
      )
    );
  };

  // Save Care Details Updates
  const handleSaveBedCareDetails = (updatedBed: BedNode) => {
    if (!selectedBedForCare) return;
    const { buildingId, floorId, wardId } = selectedBedForCare;
    setBuildings((prev) =>
      prev.map((b) =>
        b.id === buildingId
          ? {
              ...b,
              floors: b.floors.map((f) =>
                f.id === floorId
                  ? {
                      ...f,
                      wards: f.wards.map((w) =>
                        w.id === wardId
                          ? {
                              ...w,
                              beds: w.beds.map((bed) => (bed.id === updatedBed.id ? updatedBed : bed)),
                            }
                          : w
                      ),
                    }
                  : f
              ),
            }
          : b
      )
    );
    setSelectedBedForCare(null);
    showAlert(`✓ Updated inpatient care team & staff roster for ${updatedBed.bedNumber}`);
  };

  // Discharge Patient Workflow
  const handleDischargePatient = (bldId: string, floorId: string, wardId: string, bedId: string) => {
    setBuildings((prev) =>
      prev.map((b) =>
        b.id === bldId
          ? {
              ...b,
              floors: b.floors.map((f) =>
                f.id === floorId
                  ? {
                      ...f,
                      wards: f.wards.map((w) =>
                        w.id === wardId
                          ? {
                              ...w,
                              beds: w.beds.map((bed) => {
                                if (bed.id === bedId) {
                                  return {
                                    ...bed,
                                    status: 'AVAILABLE',
                                    inpatientDetails: undefined,
                                    cleanlinessStatus: 'NEEDS_CLEANING',
                                    notes: 'Patient discharged. Bed marked for linen change & sanitation.',
                                  };
                                }
                                return bed;
                              }),
                            }
                          : w
                      ),
                    }
                  : f
              ),
            }
          : b
      )
    );
    setSelectedBedForCare(null);
    showAlert('✓ Patient successfully discharged. Bed marked as AVAILABLE (Needs Cleaning).');
  };

  // Quick Admit Form Submit
  const handleAdmitPatientSubmit = (e: React.FormEvent, admitData: any) => {
    e.preventDefault();
    if (!admitPatientTarget) return;
    const { buildingId, floorId, wardId, bed } = admitPatientTarget;

    const newInpatient: InpatientCareDetails = {
      patientName: admitData.patientName,
      uhid: admitData.uhid || `UHID-${Math.floor(1000 + Math.random() * 9000)}`,
      ipdAdmissionNo: `IPD-2026-${Math.floor(100 + Math.random() * 900)}`,
      admissionDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      age: parseInt(admitData.age) || 40,
      gender: admitData.gender || 'MALE',
      diagnosis: admitData.diagnosis || 'Under Observation',
      acuity: admitData.acuity || 'STABLE',
      primaryDoctor: {
        id: 'd-new',
        name: admitData.primaryDoctor || 'Dr. Robert Vance',
        specialty: admitData.primaryDoctorSpecialty || 'Internal Medicine',
      },
      consultingDoctors: admitData.consultingDoctor
        ? [{ id: 'd-co-1', name: admitData.consultingDoctor, specialty: 'Cross Specialty', role: 'Co-Monitoring' }]
        : [],
      primaryNurse: {
        id: 'n-new',
        name: admitData.primaryNurse || 'Sister Clara Oswald, RN',
        shift: 'Morning',
      },
      compounder: {
        id: 'c-new',
        name: admitData.compounder || 'Dev Sharma',
        duty: 'IV Line & Daily Medication Care',
      },
      assignedCleaner: {
        id: 'cl-new',
        name: admitData.cleaner || 'Ramesh Kumar',
        shift: 'Morning',
      },
      cleanlinessStatus: 'SANITIZED',
      lastCleanedAt: 'Just now (Pre-admission sanitized)',
      vitals: { bp: '120/80', pulse: '78 bpm', spo2: '99%', temp: '98.6 °F' },
    };

    const updatedBed: BedNode = {
      ...bed,
      status: 'OCCUPIED',
      inpatientDetails: newInpatient,
      cleanlinessStatus: 'SANITIZED',
      lastCleanedAt: 'Just now',
    };

    setBuildings((prev) =>
      prev.map((b) =>
        b.id === buildingId
          ? {
              ...b,
              floors: b.floors.map((f) =>
                f.id === floorId
                  ? {
                      ...f,
                      wards: f.wards.map((w) =>
                        w.id === wardId
                          ? {
                              ...w,
                              beds: w.beds.map((bItem) => (bItem.id === bed.id ? updatedBed : bItem)),
                            }
                          : w
                      ),
                    }
                  : f
              ),
            }
          : b
      )
    );

    setAdmitPatientTarget(null);
    showAlert(`✓ Successfully admitted ${admitData.patientName} to ${bed.bedNumber}!`);
  };

  const getBedStatusBadge = (status: BedNode['status']) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="badge badge-success" style={{ fontSize: '0.6875rem', padding: '0.15rem 0.4rem' }}>AVAILABLE</span>;
      case 'OCCUPIED':
        return <span className="badge badge-info" style={{ fontSize: '0.6875rem', padding: '0.15rem 0.4rem' }}>OCCUPIED</span>;
      case 'RESERVED':
        return <span className="badge badge-warning" style={{ fontSize: '0.6875rem', padding: '0.15rem 0.4rem' }}>RESERVED</span>;
      case 'MAINTENANCE':
        return <span className="badge badge-danger" style={{ fontSize: '0.6875rem', padding: '0.15rem 0.4rem' }}>MAINTENANCE</span>;
    }
  };

  const getAcuityBadge = (acuity: InpatientCareDetails['acuity']) => {
    switch (acuity) {
      case 'CRITICAL':
        return <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>CRITICAL</span>;
      case 'GUARDED':
        return <span style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>GUARDED</span>;
      case 'STABLE':
        return <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>STABLE</span>;
      case 'OBSERVATION':
        return <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>OBSERVATION</span>;
    }
  };

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      {/* Top Banner & Summary Rollup Strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary)', margin: 0 }}>
              2. Campus Physical Infrastructure & Inpatient Operations
            </h3>
            <span className="badge badge-info" style={{ textTransform: 'none', fontWeight: 700 }}>
              Single-Location Campus Tree
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Collapsible hierarchy: <strong>Building</strong> $\rightarrow$ <strong>Floors</strong> $\rightarrow$ <strong>Rooms & Wards</strong> $\rightarrow$ <strong>Beds</strong> with multi-doctor care teams, nurses, compounders, and sanitation visibility.
          </p>
        </div>

        {/* Action Controls & View Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Mode Toggle Pill Button Group */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-subtle, #f1f5f9)',
              padding: '0.25rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('staff_activity')}
              style={{
                border: 'none',
                background: viewMode === 'staff_activity' ? '#ffffff' : 'transparent',
                color: viewMode === 'staff_activity' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: viewMode === 'staff_activity' ? 700 : 500,
                fontSize: '0.75rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: viewMode === 'staff_activity' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <Stethoscope size={13} /> 🩺 Live Care & Staff Operations
            </button>
            <button
              type="button"
              onClick={() => setViewMode('architecture')}
              style={{
                border: 'none',
                background: viewMode === 'architecture' ? '#ffffff' : 'transparent',
                color: viewMode === 'architecture' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: viewMode === 'architecture' ? 700 : 500,
                fontSize: '0.75rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: viewMode === 'architecture' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <Layers size={13} /> 📐 Architecture View
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setBuildings(defaultCampusTemplate);
              showAlert('Reloaded enterprise campus template with live patient & staff activity data.');
            }}
            title="Reload Campus Template"
          >
            <RotateCcw size={14} /> Reset Campus
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddBuildingModal(true)}
          >
            <Plus size={15} /> + Add Hospital Building
          </button>
        </div>
      </div>

      {alertMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            color: '#065f46',
            fontSize: '0.8125rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <CheckCircle size={16} /> {alertMsg}
        </div>
      )}

      {/* Campus Summary Rollup KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          padding: '0.875rem',
          backgroundColor: 'var(--bg-subtle, #f8fafc)',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#e0f2fe', borderRadius: '8px', color: '#0284c7' }}>
            <Building2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{totalBuildings}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Buildings</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#f3e8ff', borderRadius: '8px', color: '#9333ea' }}>
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{totalFloors}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Floors</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#fef3c7', borderRadius: '8px', color: '#d97706' }}>
            <DoorClosed size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{totalRooms}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rooms / Chambers</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#fee2e2', borderRadius: '8px', color: '#e11d48' }}>
            <BedDouble size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{totalWards}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clinical Wards</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#dcfce7', borderRadius: '8px', color: '#16a34a' }}>
            <Activity size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>
              {totalBeds}{' '}
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                ({occupiedBeds} Occ / {availableBeds} Avail)
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Beds Monitored</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEVEL 1: BUILDINGS ACCORDION */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {buildings.map((bld) => {
          const isBldExpanded = !!expandedBuildings[bld.id];
          const bldBedCount = bld.floors.reduce(
            (accF, f) => accF + f.wards.reduce((accW, w) => accW + w.beds.length, 0),
            0
          );
          const bldRoomCount = bld.floors.reduce((accF, f) => accF + f.rooms.length, 0);

          return (
            <div
              key={bld.id}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
              }}
            >
              {/* Building Header Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                  borderBottom: isBldExpanded ? '1px solid var(--border-color)' : 'none',
                }}
                onClick={() => toggleBuilding(bld.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    {isBldExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <Building size={18} color="var(--primary)" />
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', marginRight: '0.5rem' }}>
                      {bld.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <code>{bld.code}</code>
                    </span>
                    <span
                      className="badge badge-secondary"
                      style={{ marginLeft: '0.5rem', fontSize: '0.6875rem' }}
                    >
                      {bld.buildingType.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} onClick={(e) => e.stopPropagation()}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {bld.floors.length} Floors • {bldRoomCount} Rooms • {bldBedCount} Total Beds
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    onClick={() => setShowAddFloorModal(bld.id)}
                  >
                    <Plus size={12} /> Add Floor
                  </button>
                  <button
                    type="button"
                    className="action-btn delete"
                    style={{ padding: '0.25rem' }}
                    onClick={() => handleDeleteBuilding(bld.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* LEVEL 2: FLOORS CONTAINER */}
              {isBldExpanded && (
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {bld.floors.length === 0 ? (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                      No floors added yet. Click <strong>+ Add Floor</strong> above.
                    </div>
                  ) : (
                    bld.floors.map((floor) => {
                      const isFloorExpanded = !!expandedFloors[floor.id];
                      const floorBedCount = floor.wards.reduce((acc, w) => acc + w.beds.length, 0);

                      return (
                        <div
                          key={floor.id}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            backgroundColor: '#fafbfc',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Floor Header Bar */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.625rem 0.875rem',
                              backgroundColor: '#f1f5f9',
                              cursor: 'pointer',
                              borderBottom: isFloorExpanded ? '1px solid #e2e8f0' : 'none',
                            }}
                            onClick={() => toggleFloor(floor.id)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                              >
                                {isFloorExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                              </button>
                              <Layers size={16} color="var(--secondary)" />
                              <strong style={{ fontSize: '0.875rem' }}>{floor.floorNumber}</strong>
                              <code style={{ fontSize: '0.75rem' }}>{floor.code}</code>
                              <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>
                                {floor.wing}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                ({floor.wards.length} Wards • {floor.rooms.length} Rooms • {floorBedCount} Beds)
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.375rem' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                                onClick={() => setShowAddWardModal({ buildingId: bld.id, floorId: floor.id })}
                              >
                                <Plus size={11} /> Add Ward
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                                onClick={() => setShowAddRoomModal({ buildingId: bld.id, floorId: floor.id })}
                              >
                                <Plus size={11} /> Add Room
                              </button>
                              <button
                                type="button"
                                className="action-btn delete"
                                style={{ padding: '0.2rem' }}
                                onClick={() => handleDeleteFloor(bld.id, floor.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* LEVEL 3: WARDS & ROOMS WITHIN FLOOR */}
                          {isFloorExpanded && (
                            <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                              {/* Floor Clinical Wards */}
                              <div>
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                  }}
                                >
                                  CLINICAL WARDS & INPATIENT BEDS
                                </span>

                                {floor.wards.length === 0 ? (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem', fontStyle: 'italic' }}>
                                    No inpatient wards allocated on this floor yet.
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.35rem' }}>
                                    {floor.wards.map((ward) => {
                                      const isWardExpanded = !!expandedWards[ward.id];
                                      const roster = ward.staffRoster;

                                      return (
                                        <div
                                          key={ward.id}
                                          style={{
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            backgroundColor: '#ffffff',
                                            overflow: 'hidden',
                                          }}
                                        >
                                          {/* Ward Header */}
                                          <div
                                            style={{
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                              padding: '0.625rem 0.75rem',
                                              backgroundColor: '#ffffff',
                                              cursor: 'pointer',
                                              borderBottom: isWardExpanded ? '1px solid #e2e8f0' : 'none',
                                            }}
                                            onClick={() => toggleWard(ward.id)}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                              <button
                                                type="button"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                              >
                                                {isWardExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                              </button>
                                              <BedDouble size={16} color="#0284c7" />
                                              <strong style={{ fontSize: '0.875rem' }}>{ward.name}</strong>
                                              <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>
                                                {ward.wardType}
                                              </span>
                                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                Supervisor: <strong>{ward.supervisorNurse}</strong> • Total Beds: {ward.beds.length}
                                              </span>
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                                              <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                                onClick={() => setSelectedWardForStaff({ buildingId: bld.id, floorId: floor.id, ward })}
                                                title="View/Edit Ward Nurses, Compounders, Cleaners and Rounding Doctors"
                                              >
                                                <Users size={12} /> Staff Roster
                                              </button>
                                              <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                                                onClick={() => setShowAddBedModal({ buildingId: bld.id, floorId: floor.id, wardId: ward.id })}
                                              >
                                                <Plus size={11} /> Add Bed
                                              </button>
                                              <button
                                                type="button"
                                                className="action-btn delete"
                                                style={{ padding: '0.2rem' }}
                                                onClick={() => handleDeleteWard(bld.id, floor.id, ward.id)}
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            </div>
                                          </div>

                                          {/* Ward Staff & Hygiene Summary Strip */}
                                          {isWardExpanded && roster && (
                                            <div
                                              style={{
                                                padding: '0.5rem 0.75rem',
                                                backgroundColor: '#f8fafc',
                                                borderBottom: '1px dashed #e2e8f0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1.25rem',
                                                flexWrap: 'wrap',
                                                fontSize: '0.75rem',
                                              }}
                                            >
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>👩‍⚕️ Nurses on Duty:</span>
                                                <span style={{ color: 'var(--text-color)' }}>
                                                  {roster.onDutyNurses.map((n) => n.name).join(', ') || ward.supervisorNurse}
                                                </span>
                                              </div>

                                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <span style={{ fontWeight: 600, color: '#d97706' }}>🩹 Compounder:</span>
                                                <span style={{ color: 'var(--text-color)' }}>
                                                  {roster.compounders.map((c) => `${c.name} (${c.duty})`).join('; ') || 'Assigned per shift'}
                                                </span>
                                              </div>

                                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <span style={{ fontWeight: 600, color: '#059669' }}>🧹 Housekeeping / Cleaners:</span>
                                                <span style={{ color: 'var(--text-color)' }}>
                                                  {roster.cleaners.map((cl) => `${cl.name} (Last round: ${cl.lastRound})`).join('; ') || 'Housekeeping Pool'}
                                                </span>
                                              </div>

                                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <span style={{ fontWeight: 600, color: '#4f46e5' }}>🩺 Rounding Doctors:</span>
                                                <span style={{ color: 'var(--text-color)' }}>
                                                  {roster.roundingDoctors.map((rd) => rd.name).join(', ') || 'Consultant on duty'}
                                                </span>
                                              </div>
                                            </div>
                                          )}

                                          {/* LEVEL 4: BEDS TILES GRID */}
                                          {isWardExpanded && (
                                            <div style={{ padding: '0.75rem', backgroundColor: '#f1f5f9' }}>
                                              {ward.beds.length === 0 ? (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
                                                  No beds in this ward. Click <strong>+ Add Bed</strong> to insert hospital beds.
                                                </div>
                                              ) : (
                                                <div
                                                  style={{
                                                    display: 'grid',
                                                    gridTemplateColumns:
                                                      viewMode === 'staff_activity'
                                                        ? 'repeat(auto-fill, minmax(290px, 1fr))'
                                                        : 'repeat(auto-fill, minmax(180px, 1fr))',
                                                    gap: '0.75rem',
                                                  }}
                                                >
                                                  {ward.beds.map((bed) => {
                                                    const pt = bed.inpatientDetails;

                                                    // RENDER MODE A: LIVE CARE & STAFF OPERATIONS VIEW
                                                    if (viewMode === 'staff_activity') {
                                                      return (
                                                        <div
                                                          key={bed.id}
                                                          style={{
                                                            padding: '0.75rem',
                                                            backgroundColor: '#ffffff',
                                                            borderRadius: '8px',
                                                            border:
                                                              bed.status === 'OCCUPIED'
                                                                ? '1px solid #bfdbfe'
                                                                : bed.status === 'MAINTENANCE'
                                                                ? '1px solid #fecaca'
                                                                : '1px solid #e2e8f0',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '0.5rem',
                                                          }}
                                                        >
                                                          {/* Card Top Strip */}
                                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                              <strong style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>
                                                                {bed.bedNumber}
                                                              </strong>
                                                              {getBedStatusBadge(bed.status)}
                                                            </div>
                                                            {pt && getAcuityBadge(pt.acuity)}
                                                          </div>

                                                          {/* OCCUPIED BED CLINICAL DATA */}
                                                          {bed.status === 'OCCUPIED' && pt ? (
                                                            <>
                                                              {/* Patient Info Box */}
                                                              <div
                                                                style={{
                                                                  padding: '0.5rem',
                                                                  backgroundColor: '#eff6ff',
                                                                  borderRadius: '6px',
                                                                  border: '1px solid #dbeafe',
                                                                }}
                                                              >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                  <div>
                                                                    <strong style={{ fontSize: '0.875rem', color: '#1e3a8a' }}>
                                                                      {pt.patientName}
                                                                    </strong>{' '}
                                                                    <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>
                                                                      ({pt.age}y / {pt.gender.substring(0, 1)})
                                                                    </span>
                                                                  </div>
                                                                  <code style={{ fontSize: '0.7rem', color: '#1e40af' }}>{pt.uhid}</code>
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>
                                                                  <strong>Diagnosis:</strong> {pt.diagnosis}
                                                                </div>
                                                              </div>

                                                              {/* Multidisciplinary Care Team Chips */}
                                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.75rem' }}>
                                                                {/* Doctors Line */}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                                                  <span style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                    <Stethoscope size={13} /> Doctor(s):
                                                                  </span>
                                                                  <span style={{ color: 'var(--text-color)', fontWeight: 600 }}>
                                                                    {pt.primaryDoctor.name}
                                                                  </span>
                                                                  {pt.consultingDoctors && pt.consultingDoctors.length > 0 && (
                                                                    <span
                                                                      className="badge badge-info"
                                                                      style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', cursor: 'help' }}
                                                                      title={`Consulting: ${pt.consultingDoctors.map((d) => `${d.name} (${d.specialty})`).join(', ')}`}
                                                                    >
                                                                      +{pt.consultingDoctors.length} Co-Doctors
                                                                    </span>
                                                                  )}
                                                                </div>

                                                                {/* Nurse & Compounder */}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                                                                  <span>👩‍⚕️ Nurse: <strong>{pt.primaryNurse.name}</strong></span>
                                                                  {pt.compounder && (
                                                                    <span>• 🩹 Comp: <strong>{pt.compounder.name}</strong></span>
                                                                  )}
                                                                </div>

                                                                {/* Sanitation & Cleaner */}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#059669', fontSize: '0.7rem' }}>
                                                                  <span>🧹 Sanitized by <strong>{pt.assignedCleaner?.name || 'Ramesh K.'}</strong></span>
                                                                  <span>({pt.lastCleanedAt || '08:30 AM'})</span>
                                                                </div>
                                                              </div>

                                                              {/* Card Action Buttons */}
                                                              <div
                                                                style={{
                                                                  display: 'flex',
                                                                  justifyContent: 'space-between',
                                                                  alignItems: 'center',
                                                                  marginTop: '0.25rem',
                                                                  paddingTop: '0.35rem',
                                                                  borderTop: '1px solid #e2e8f0',
                                                                }}
                                                              >
                                                                <button
                                                                  type="button"
                                                                  className="btn btn-secondary btn-sm"
                                                                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                                                  onClick={() =>
                                                                    setSelectedBedForCare({
                                                                      buildingId: bld.id,
                                                                      floorId: floor.id,
                                                                      wardId: ward.id,
                                                                      bed,
                                                                    })
                                                                  }
                                                                >
                                                                  <ClipboardList size={12} /> Care Team & Vitals
                                                                </button>
                                                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                                                  <button
                                                                    type="button"
                                                                    className="btn btn-secondary btn-sm"
                                                                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', color: '#dc2626' }}
                                                                    onClick={() => handleDischargePatient(bld.id, floor.id, ward.id, bed.id)}
                                                                    title="Discharge Patient / Vacate Bed"
                                                                  >
                                                                    Discharge
                                                                  </button>
                                                                  <button
                                                                    type="button"
                                                                    className="action-btn delete"
                                                                    style={{ padding: '0.1rem' }}
                                                                    onClick={() => handleDeleteBed(bld.id, floor.id, ward.id, bed.id)}
                                                                  >
                                                                    <Trash2 size={12} />
                                                                  </button>
                                                                </div>
                                                              </div>
                                                            </>
                                                          ) : (
                                                            // AVAILABLE OR MAINTENANCE BED
                                                            <>
                                                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                {bed.bedType} • <strong style={{ color: '#047857' }}>${bed.dailyTariff}/day</strong>
                                                              </div>

                                                              {/* Hygiene status */}
                                                              <div style={{ fontSize: '0.7rem', color: bed.cleanlinessStatus === 'NEEDS_CLEANING' ? '#b45309' : '#059669', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                                <span>
                                                                  {bed.cleanlinessStatus === 'NEEDS_CLEANING'
                                                                    ? '⚠️ Needs Linen Change'
                                                                    : '✓ Sanitized & Ready for Admission'}
                                                                </span>
                                                                {bed.assignedCleaner && <span>({bed.assignedCleaner})</span>}
                                                              </div>

                                                              {bed.notes && (
                                                                <div style={{ fontSize: '0.7rem', color: '#dc2626' }}>
                                                                  Note: {bed.notes}
                                                                </div>
                                                              )}

                                                              <div
                                                                style={{
                                                                  display: 'flex',
                                                                  justifyContent: 'space-between',
                                                                  alignItems: 'center',
                                                                  marginTop: '0.25rem',
                                                                  paddingTop: '0.35rem',
                                                                  borderTop: '1px solid #e2e8f0',
                                                                }}
                                                              >
                                                                {bed.status === 'AVAILABLE' ? (
                                                                  <button
                                                                    type="button"
                                                                    className="btn btn-primary btn-sm"
                                                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                                                    onClick={() =>
                                                                      setAdmitPatientTarget({
                                                                        buildingId: bld.id,
                                                                        floorId: floor.id,
                                                                        wardId: ward.id,
                                                                        bed,
                                                                      })
                                                                    }
                                                                  >
                                                                    <UserPlus size={12} /> + Admit IPD Patient
                                                                  </button>
                                                                ) : (
                                                                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
                                                                    Under Maintenance
                                                                  </span>
                                                                )}

                                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                                  <button
                                                                    type="button"
                                                                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.6875rem', color: '#0284c7', padding: '0.1rem 0.25rem' }}
                                                                    onClick={() => handleToggleBedStatus(bld.id, floor.id, ward.id, bed.id)}
                                                                  >
                                                                    Toggle
                                                                  </button>
                                                                  <button
                                                                    type="button"
                                                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.1rem' }}
                                                                    onClick={() => handleDeleteBed(bld.id, floor.id, ward.id, bed.id)}
                                                                  >
                                                                    <Trash2 size={11} />
                                                                  </button>
                                                                </div>
                                                              </div>
                                                            </>
                                                          )}
                                                        </div>
                                                      );
                                                    }

                                                    // RENDER MODE B: ARCHITECTURE COMPACT VIEW
                                                    return (
                                                      <div
                                                        key={bed.id}
                                                        style={{
                                                          padding: '0.5rem 0.75rem',
                                                          backgroundColor: '#ffffff',
                                                          borderRadius: '6px',
                                                          border: '1px solid #e2e8f0',
                                                          display: 'flex',
                                                          flexDirection: 'column',
                                                          gap: '0.25rem',
                                                        }}
                                                      >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                          <strong style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                                                            {bed.bedNumber}
                                                          </strong>
                                                          {getBedStatusBadge(bed.status)}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                          {bed.bedType}
                                                        </div>
                                                        <div
                                                          style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            marginTop: '0.25rem',
                                                            paddingTop: '0.25rem',
                                                            borderTop: '1px dashed #e2e8f0',
                                                          }}
                                                        >
                                                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#047857' }}>
                                                            ${bed.dailyTariff}/day
                                                          </span>
                                                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                            <button
                                                              type="button"
                                                              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.6875rem', color: '#0284c7', padding: '0.1rem 0.25rem' }}
                                                              onClick={() => handleToggleBedStatus(bld.id, floor.id, ward.id, bed.id)}
                                                              title="Toggle Status"
                                                            >
                                                              Toggle
                                                            </button>
                                                            <button
                                                              type="button"
                                                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.1rem' }}
                                                              onClick={() => handleDeleteBed(bld.id, floor.id, ward.id, bed.id)}
                                                            >
                                                              <Trash2 size={11} />
                                                            </button>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Floor Rooms & Chambers */}
                              <div style={{ marginTop: '0.5rem' }}>
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                  }}
                                >
                                  ROOMS, CHAMBERS & PROCEDURE SUITES
                                </span>

                                {floor.rooms.length === 0 ? (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem', fontStyle: 'italic' }}>
                                    No consultation chambers or procedure rooms added to this floor yet.
                                  </div>
                                ) : (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.625rem', marginTop: '0.35rem' }}>
                                    {floor.rooms.map((room) => (
                                      <div
                                        key={room.id}
                                        style={{
                                          padding: '0.625rem 0.75rem',
                                          backgroundColor: '#ffffff',
                                          borderRadius: '6px',
                                          border: '1px solid #e2e8f0',
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <DoorClosed size={14} color="var(--primary)" />
                                            <strong style={{ fontSize: '0.8125rem' }}>{room.roomNumber}</strong>
                                          </div>
                                          <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>
                                            {room.roomType}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                          Dept: {room.departmentName || 'General'}
                                        </div>
                                        {room.attendingStaff && (
                                          <div style={{ fontSize: '0.7rem', color: '#1e40af', marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px dashed #e2e8f0' }}>
                                            🩺 {room.attendingStaff.doctorName || 'Staff Assigned'} • {room.attendingStaff.nurseOrCompounder || 'Attendant'}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: DEEP BED CARE TEAM & INPATIENT ACTIVITY INSPECTOR */}
      {/* ========================================================================= */}
      {selectedBedForCare && (
        <BedCareInspectorModal
          data={selectedBedForCare}
          onClose={() => setSelectedBedForCare(null)}
          onSave={handleSaveBedCareDetails}
          onDischarge={() =>
            handleDischargePatient(
              selectedBedForCare.buildingId,
              selectedBedForCare.floorId,
              selectedBedForCare.wardId,
              selectedBedForCare.bed.id
            )
          }
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: QUICK ADMIT IPD PATIENT */}
      {/* ========================================================================= */}
      {admitPatientTarget && (
        <AdmitPatientModal
          bedNumber={admitPatientTarget.bed.bedNumber}
          dailyTariff={admitPatientTarget.bed.dailyTariff}
          onClose={() => setAdmitPatientTarget(null)}
          onSubmit={handleAdmitPatientSubmit}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: WARD STAFF ROSTER MANAGER */}
      {/* ========================================================================= */}
      {selectedWardForStaff && (
        <WardStaffManagerModal
          ward={selectedWardForStaff.ward}
          onClose={() => setSelectedWardForStaff(null)}
          onSave={(updatedRoster) => {
            const { buildingId, floorId, ward } = selectedWardForStaff;
            setBuildings((prev) =>
              prev.map((b) =>
                b.id === buildingId
                  ? {
                      ...b,
                      floors: b.floors.map((f) =>
                        f.id === floorId
                          ? {
                              ...f,
                              wards: f.wards.map((w) =>
                                w.id === ward.id
                                  ? {
                                      ...w,
                                      supervisorNurse: updatedRoster.supervisorNurse,
                                      staffRoster: updatedRoster,
                                    }
                                  : w
                              ),
                            }
                          : f
                      ),
                    }
                  : b
              )
            );
            setSelectedWardForStaff(null);
            showAlert(`✓ Updated ward staff roster for ${ward.name}`);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD BUILDING */}
      {/* ========================================================================= */}
      {showAddBuildingModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '480px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Add Hospital Building</h4>
              <button onClick={() => setShowAddBuildingModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddBuildingSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Building Name</label>
                <input
                  className="form-input"
                  value={buildingForm.name}
                  onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
                  placeholder="e.g. Surgical & Super Specialty Tower"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Building Code</label>
                <input
                  className="form-input"
                  value={buildingForm.code}
                  onChange={(e) => setBuildingForm({ ...buildingForm, code: e.target.value })}
                  placeholder="e.g. BLD-SURG"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Building Classification</label>
                <select
                  className="form-select"
                  value={buildingForm.buildingType}
                  onChange={(e) => setBuildingForm({ ...buildingForm, buildingType: e.target.value as any })}
                >
                  <option value="Clinical Inpatient Tower">Clinical Inpatient Tower</option>
                  <option value="Emergency & Trauma Center">Emergency & Trauma Center</option>
                  <option value="Diagnostic & Oncology Pavilion">Diagnostic & Oncology Pavilion</option>
                  <option value="Administration & Support">Administration & Support</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddBuildingModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Building size={14} /> Create Building</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD FLOOR */}
      {/* ========================================================================= */}
      {showAddFloorModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '460px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Add Floor to Building</h4>
              <button onClick={() => setShowAddFloorModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddFloorSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Floor Number / Name</label>
                <input
                  className="form-input"
                  value={floorForm.floorNumber}
                  onChange={(e) => setFloorForm({ ...floorForm, floorNumber: e.target.value })}
                  placeholder="e.g. Floor 4 (Orthopedic & Neuro Wing)"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Floor Code</label>
                <input
                  className="form-input"
                  value={floorForm.code}
                  onChange={(e) => setFloorForm({ ...floorForm, code: e.target.value })}
                  placeholder="e.g. FL-4"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Wing / Description</label>
                <input
                  className="form-input"
                  value={floorForm.wing}
                  onChange={(e) => setFloorForm({ ...floorForm, wing: e.target.value })}
                  placeholder="e.g. South Surgical Wing"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddFloorModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Layers size={14} /> Add Floor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD WARD */}
      {/* ========================================================================= */}
      {showAddWardModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '480px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Add Clinical Inpatient Ward</h4>
              <button onClick={() => setShowAddWardModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddWardSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Ward Name</label>
                <input
                  className="form-input"
                  value={wardForm.name}
                  onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })}
                  placeholder="e.g. Pediatric Intensive Care Ward"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Ward Type</label>
                <select
                  className="form-select"
                  value={wardForm.wardType}
                  onChange={(e) => setWardForm({ ...wardForm, wardType: e.target.value as any })}
                >
                  <option value="General Ward">General Ward</option>
                  <option value="ICU Ward">ICU Ward</option>
                  <option value="Male Ward">Male Ward</option>
                  <option value="Female Ward">Female Ward</option>
                  <option value="Maternity Ward">Maternity Ward</option>
                  <option value="Isolation Ward">Isolation Ward</option>
                  <option value="VIP Suite Ward">VIP Suite Ward</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">In-Charge Supervisor Nurse</label>
                <input
                  className="form-input"
                  value={wardForm.supervisorNurse}
                  onChange={(e) => setWardForm({ ...wardForm, supervisorNurse: e.target.value })}
                  placeholder="e.g. Sister Elena Rostova, RN"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddWardModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><BedDouble size={14} /> Add Ward</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD ROOM */}
      {/* ========================================================================= */}
      {showAddRoomModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '460px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Add Room / Consultation Chamber</h4>
              <button onClick={() => setShowAddRoomModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddRoomSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Room / Chamber Number</label>
                <input
                  className="form-input"
                  value={roomForm.roomNumber}
                  onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                  placeholder="e.g. OPD-105"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Room Type</label>
                <select
                  className="form-select"
                  value={roomForm.roomType}
                  onChange={(e) => setRoomForm({ ...roomForm, roomType: e.target.value as any })}
                >
                  <option value="Consultation Room">Consultation Room</option>
                  <option value="Procedure Room">Procedure Room</option>
                  <option value="Doctor Chamber">Doctor Chamber</option>
                  <option value="Private Inpatient Room">Private Inpatient Room</option>
                  <option value="OT Suite">OT Suite</option>
                  <option value="Daycare Unit">Daycare Unit</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddRoomModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><DoorClosed size={14} /> Add Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD BED */}
      {/* ========================================================================= */}
      {showAddBedModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '460px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Add Bed to Ward</h4>
              <button onClick={() => setShowAddBedModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddBedSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Bed Number / Code</label>
                <input
                  className="form-input"
                  value={bedForm.bedNumber}
                  onChange={(e) => setBedForm({ ...bedForm, bedNumber: e.target.value })}
                  placeholder="e.g. BED-M-26"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Bed Classification Type</label>
                <select
                  className="form-select"
                  value={bedForm.bedType}
                  onChange={(e) => setBedForm({ ...bedForm, bedType: e.target.value as any })}
                >
                  <option value="Standard Ward Bed">Standard Ward Bed</option>
                  <option value="Motorized ICU Ventilator">Motorized ICU Ventilator</option>
                  <option value="Semi-Fowler">Semi-Fowler Bed</option>
                  <option value="Deluxe Suite">Deluxe Suite Bed</option>
                  <option value="Pediatric Crib">Pediatric Crib</option>
                  <option value="Emergency Stretcher">Emergency Stretcher</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Daily Tariff ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={bedForm.dailyTariff}
                  onChange={(e) => setBedForm({ ...bedForm, dailyTariff: Number(e.target.value) || 0 })}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddBedModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><BedDouble size={14} /> Add Bed</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SUB-MODAL 1: BED CARE INSPECTOR (MULTI-DOCTORS, NURSES, COMPOUNDERS, CLEANERS)
// ============================================================================
interface BedCareModalProps {
  data: {
    buildingId: string;
    floorId: string;
    wardId: string;
    bed: BedNode;
  };
  onClose: () => void;
  onSave: (updated: BedNode) => void;
  onDischarge: () => void;
}

const BedCareInspectorModal: React.FC<BedCareModalProps> = ({ data, onClose, onSave, onDischarge }) => {
  const [activeTab, setActiveTab] = useState<'patient' | 'care_team' | 'sanitation'>('care_team');
  const [bedState, setBedState] = useState<BedNode>(JSON.parse(JSON.stringify(data.bed)));
  const [newCoDoctorName, setNewCoDoctorName] = useState('');
  const [newCoDoctorSpec, setNewCoDoctorSpec] = useState('');

  const pt = bedState.inpatientDetails;

  const handleUpdatePtField = (field: string, val: any) => {
    if (!bedState.inpatientDetails) return;
    setBedState({
      ...bedState,
      inpatientDetails: {
        ...bedState.inpatientDetails,
        [field]: val,
      },
    });
  };

  const handleAddCoDoctor = () => {
    if (!newCoDoctorName.trim()) return;
    const currentList = pt?.consultingDoctors || [];
    handleUpdatePtField('consultingDoctors', [
      ...currentList,
      {
        id: `doc-${Date.now()}`,
        name: newCoDoctorName.trim(),
        specialty: newCoDoctorSpec.trim() || 'Cross Consultant',
        role: 'Co-Monitoring',
      },
    ]);
    setNewCoDoctorName('');
    setNewCoDoctorSpec('');
  };

  const handleRemoveCoDoctor = (id: string) => {
    const currentList = pt?.consultingDoctors || [];
    handleUpdatePtField(
      'consultingDoctors',
      currentList.filter((d) => d.id !== id)
    );
  };

  const handleMarkSanitizedNow = () => {
    const nowStr = `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (bedState.inpatientDetails) {
      setBedState({
        ...bedState,
        inpatientDetails: {
          ...bedState.inpatientDetails,
          cleanlinessStatus: 'SANITIZED',
          lastCleanedAt: nowStr,
        },
      });
    } else {
      setBedState({
        ...bedState,
        cleanlinessStatus: 'SANITIZED',
        lastCleanedAt: nowStr,
      });
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '680px', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BedDouble size={20} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>
                Bed & Inpatient Care Team: {bedState.bedNumber}
              </h3>
              <span className="badge badge-info">{bedState.status}</span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {pt ? `${pt.patientName} (${pt.uhid}) • ${pt.ipdAdmissionNo}` : 'Vacant Bed Infrastructure Profile'}
            </p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'care_team' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('care_team')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
          >
            <Stethoscope size={14} /> 1. Attending Doctors & Staff Roster
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'patient' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('patient')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
          >
            <User size={14} /> 2. Patient Demographics & Vitals
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'sanitation' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('sanitation')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
          >
            <Sparkles size={14} /> 3. Sanitation & Cleaners
          </button>
        </div>

        {/* TAB 1: ATTENDING DOCTORS, NURSING, COMPOUNDERS */}
        {activeTab === 'care_team' && pt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Primary Doctor */}
            <div style={{ padding: '0.875rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.875rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Stethoscope size={16} /> Primary Attending Consultant Doctor
                </strong>
                <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Chief of Care</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Doctor Name</label>
                  <input
                    className="form-input"
                    value={pt.primaryDoctor.name}
                    onChange={(e) =>
                      handleUpdatePtField('primaryDoctor', { ...pt.primaryDoctor, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Clinical Specialty</label>
                  <input
                    className="form-input"
                    value={pt.primaryDoctor.specialty}
                    onChange={(e) =>
                      handleUpdatePtField('primaryDoctor', { ...pt.primaryDoctor, specialty: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Consulting / Co-monitoring Doctors (Multi-Doctor Care) */}
            <div style={{ padding: '0.875rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <strong style={{ fontSize: '0.875rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Users size={16} /> Cross-Consultation & Co-Monitoring Doctors
                  </strong>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Multiple physicians collaborating on this inpatient case
                  </p>
                </div>
              </div>

              {/* Existing Co-Doctors List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                {pt.consultingDoctors && pt.consultingDoctors.length > 0 ? (
                  pt.consultingDoctors.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.4rem 0.6rem',
                        backgroundColor: '#ffffff',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <div>
                        <strong>{doc.name}</strong> • <span style={{ color: 'var(--text-muted)' }}>{doc.specialty}</span>{' '}
                        <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>{doc.role}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCoDoctor(doc.id)}
                        style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', padding: '0.1rem' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No secondary doctors assigned yet.
                  </div>
                )}
              </div>

              {/* Add Co-Doctor Line */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '0.5rem', alignItems: 'flex-end' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>+ Add Consulting Doctor</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Dr. Arthur Pendelton"
                    value={newCoDoctorName}
                    onChange={(e) => setNewCoDoctorName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Specialty / Reason</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Neurology Review"
                    value={newCoDoctorSpec}
                    onChange={(e) => setNewCoDoctorSpec(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddCoDoctor}
                  style={{ height: '36px' }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            {/* Nurse & Compounder Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* Assigned Inpatient Nurse */}
              <div style={{ padding: '0.875rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '0.8125rem', color: '#047857', display: 'block', marginBottom: '0.5rem' }}>
                  👩‍⚕️ Assigned Ward Nurse
                </strong>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Nurse Name</label>
                  <input
                    className="form-input"
                    value={pt.primaryNurse.name}
                    onChange={(e) =>
                      handleUpdatePtField('primaryNurse', { ...pt.primaryNurse, name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Shift</label>
                  <select
                    className="form-select"
                    value={pt.primaryNurse.shift}
                    onChange={(e) =>
                      handleUpdatePtField('primaryNurse', { ...pt.primaryNurse, shift: e.target.value as any })
                    }
                  >
                    <option value="Morning">Morning Shift (07:00 - 15:00)</option>
                    <option value="Evening">Evening Shift (15:00 - 23:00)</option>
                    <option value="Night">Night Shift (23:00 - 07:00)</option>
                  </select>
                </div>
              </div>

              {/* Compounder / Dresser */}
              <div style={{ padding: '0.875rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '0.8125rem', color: '#b45309', display: 'block', marginBottom: '0.5rem' }}>
                  🩹 Compounder / Medical Assistant
                </strong>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Compounder Name</label>
                  <input
                    className="form-input"
                    value={pt.compounder?.name || ''}
                    onChange={(e) =>
                      handleUpdatePtField('compounder', {
                        id: pt.compounder?.id || 'c-new',
                        name: e.target.value,
                        duty: pt.compounder?.duty || 'IV Line Care',
                      })
                    }
                    placeholder="e.g. Dev Sharma"
                  />
                </div>
                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Specific Procedure Duty</label>
                  <input
                    className="form-input"
                    value={pt.compounder?.duty || ''}
                    onChange={(e) =>
                      handleUpdatePtField('compounder', {
                        id: pt.compounder?.id || 'c-new',
                        name: pt.compounder?.name || 'Assigned',
                        duty: e.target.value,
                      })
                    }
                    placeholder="e.g. Wound Dressing & IV Cannula"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PATIENT DEMOGRAPHICS & VITALS */}
        {activeTab === 'patient' && pt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Patient Full Name</label>
                <input
                  className="form-input"
                  value={pt.patientName}
                  onChange={(e) => handleUpdatePtField('patientName', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>UHID (Unique Health ID)</label>
                <input
                  className="form-input"
                  value={pt.uhid}
                  onChange={(e) => handleUpdatePtField('uhid', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Age (Years)</label>
                <input
                  type="number"
                  className="form-input"
                  value={pt.age}
                  onChange={(e) => handleUpdatePtField('age', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Clinical Acuity</label>
                <select
                  className="form-select"
                  value={pt.acuity}
                  onChange={(e) => handleUpdatePtField('acuity', e.target.value as any)}
                >
                  <option value="STABLE">STABLE</option>
                  <option value="GUARDED">GUARDED</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="OBSERVATION">OBSERVATION</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Primary Inpatient Diagnosis</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={pt.diagnosis}
                onChange={(e) => handleUpdatePtField('diagnosis', e.target.value)}
              />
            </div>

            {/* Vitals */}
            {pt.vitals && (
              <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '0.8125rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                  <HeartPulse size={15} /> Recent Vital Signs
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.65rem' }}>Blood Pressure</label>
                    <input
                      className="form-input"
                      value={pt.vitals.bp}
                      onChange={(e) =>
                        handleUpdatePtField('vitals', { ...pt.vitals, bp: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.65rem' }}>Pulse Rate</label>
                    <input
                      className="form-input"
                      value={pt.vitals.pulse}
                      onChange={(e) =>
                        handleUpdatePtField('vitals', { ...pt.vitals, pulse: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.65rem' }}>SpO2 %</label>
                    <input
                      className="form-input"
                      value={pt.vitals.spo2}
                      onChange={(e) =>
                        handleUpdatePtField('vitals', { ...pt.vitals, spo2: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.65rem' }}>Temp</label>
                    <input
                      className="form-input"
                      value={pt.vitals.temp}
                      onChange={(e) =>
                        handleUpdatePtField('vitals', { ...pt.vitals, temp: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SANITATION & CLEANERS */}
        {activeTab === 'sanitation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.9375rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={16} /> Bed Hygiene & Sanitization Protocol
                  </strong>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#15803d' }}>
                    Status: <strong>{pt?.cleanlinessStatus || bedState.cleanlinessStatus || 'SANITIZED'}</strong> • Last Sanitized: {pt?.lastCleanedAt || bedState.lastCleanedAt || 'Today'}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
                  onClick={handleMarkSanitizedNow}
                >
                  ✓ Mark Sanitized Now
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Assigned Cleaner / Housekeeper</label>
                <input
                  className="form-input"
                  value={pt?.assignedCleaner?.name || bedState.assignedCleaner || ''}
                  onChange={(e) => {
                    if (bedState.inpatientDetails) {
                      handleUpdatePtField('assignedCleaner', { id: 'cl-1', name: e.target.value, shift: 'General' });
                    } else {
                      setBedState({ ...bedState, assignedCleaner: e.target.value });
                    }
                  }}
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Cleanliness State</label>
                <select
                  className="form-select"
                  value={pt?.cleanlinessStatus || bedState.cleanlinessStatus || 'SANITIZED'}
                  onChange={(e) => {
                    if (bedState.inpatientDetails) {
                      handleUpdatePtField('cleanlinessStatus', e.target.value as any);
                    } else {
                      setBedState({ ...bedState, cleanlinessStatus: e.target.value as any });
                    }
                  }}
                >
                  <option value="SANITIZED">Sanitized & Safe</option>
                  <option value="NEEDS_CLEANING">Needs Linen Change / Cleaning</option>
                  <option value="CLEANING_IN_PROGRESS">Deep Cleaning In Progress</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
          <div>
            {bedState.status === 'OCCUPIED' && (
              <button
                type="button"
                className="btn btn-sm"
                style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}
                onClick={() => {
                  if (window.confirm('Discharge patient from this bed? Bed will be marked AVAILABLE.')) {
                    onDischarge();
                  }
                }}
              >
                Discharge Patient
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onSave(bedState)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Save size={14} /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-MODAL 2: QUICK ADMIT INPATIENT TO AVAILABLE BED
// ============================================================================
interface AdmitModalProps {
  bedNumber: string;
  dailyTariff: number;
  onClose: () => void;
  onSubmit: (e: React.FormEvent, data: any) => void;
}

const AdmitPatientModal: React.FC<AdmitModalProps> = ({ bedNumber, dailyTariff, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    patientName: '',
    uhid: `UHID-${Math.floor(1000 + Math.random() * 9000)}`,
    age: '45',
    gender: 'MALE',
    diagnosis: '',
    acuity: 'STABLE',
    primaryDoctor: 'Dr. Robert Vance',
    primaryDoctorSpecialty: 'Internal Medicine',
    consultingDoctor: '',
    primaryNurse: 'Sister Clara Oswald, RN',
    compounder: 'Dev Sharma',
    cleaner: 'Ramesh Kumar',
  });

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '580px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>
              Admit IPD Patient to {bedNumber}
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Standard Tariff: ${dailyTariff}/day • Immediate Multi-Disciplinary Staff Assignment
            </span>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <form onSubmit={(e) => onSubmit(e, formData)} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Patient Name</label>
              <input
                className="form-input"
                placeholder="e.g. Arthur Pendelton"
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">UHID</label>
              <input
                className="form-input"
                value={formData.uhid}
                onChange={(e) => setFormData({ ...formData, uhid: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Age</label>
              <input
                type="number"
                className="form-input"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select
                className="form-select"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Initial Acuity</label>
              <select
                className="form-select"
                value={formData.acuity}
                onChange={(e) => setFormData({ ...formData, acuity: e.target.value })}
              >
                <option value="STABLE">STABLE</option>
                <option value="GUARDED">GUARDED</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="OBSERVATION">OBSERVATION</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Provisional Admission Diagnosis</label>
            <input
              className="form-input"
              placeholder="e.g. Acute Gastroenteritis with Moderate Dehydration"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              required
            />
          </div>

          {/* Doctors Assignment */}
          <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', display: 'block', marginBottom: '0.35rem' }}>
              🩺 Medical Staff Allocation
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Primary Attending Doctor</label>
                <input
                  className="form-input"
                  value={formData.primaryDoctor}
                  onChange={(e) => setFormData({ ...formData, primaryDoctor: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Co-Consultant (Optional)</label>
                <input
                  className="form-input"
                  placeholder="e.g. Dr. Neil Patrick (Trauma)"
                  value={formData.consultingDoctor}
                  onChange={(e) => setFormData({ ...formData, consultingDoctor: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Nursing & Compounder */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Assigned Nurse</label>
              <input
                className="form-input"
                value={formData.primaryNurse}
                onChange={(e) => setFormData({ ...formData, primaryNurse: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Compounder</label>
              <input
                className="form-input"
                value={formData.compounder}
                onChange={(e) => setFormData({ ...formData, compounder: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Cleaner Staff</label>
              <input
                className="form-input"
                value={formData.cleaner}
                onChange={(e) => setFormData({ ...formData, cleaner: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <UserPlus size={14} /> Confirm IPD Admission
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-MODAL 3: WARD STAFF ROSTER MANAGER
// ============================================================================
interface WardStaffModalProps {
  ward: WardNode;
  onClose: () => void;
  onSave: (updatedRoster: WardStaffRoster) => void;
}

const WardStaffManagerModal: React.FC<WardStaffModalProps> = ({ ward, onClose, onSave }) => {
  const [roster, setRoster] = useState<WardStaffRoster>(
    ward.staffRoster || {
      supervisorNurse: ward.supervisorNurse,
      onDutyNurses: [{ name: ward.supervisorNurse, shift: 'Day', grade: 'RN' }],
      compounders: [{ name: 'Dev Sharma', duty: 'General Inpatient Care' }],
      cleaners: [{ name: 'Ramesh Kumar', shift: 'Day Shift', lastRound: '30 mins ago' }],
      roundingDoctors: [{ name: 'Dr. Robert Vance', department: 'Internal Medicine', roundTime: '10:00 AM' }],
    }
  );

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '600px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>
              Ward Staff Roster: {ward.name}
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Supervisor, Nurses, Compounders, Sanitation Cleaners & Rounding Consultants
            </span>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div className="form-group">
            <label className="form-label">In-Charge Supervisor Nurse</label>
            <input
              className="form-input"
              value={roster.supervisorNurse}
              onChange={(e) => setRoster({ ...roster, supervisorNurse: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">On-Duty Nurses (Comma separated)</label>
            <input
              className="form-input"
              value={roster.onDutyNurses.map((n) => n.name).join(', ')}
              onChange={(e) =>
                setRoster({
                  ...roster,
                  onDutyNurses: e.target.value.split(',').map((nm) => ({ name: nm.trim(), shift: 'Day', grade: 'RN' })),
                })
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">Assigned Compounders & Duties</label>
            <input
              className="form-input"
              value={roster.compounders.map((c) => `${c.name} (${c.duty})`).join('; ')}
              onChange={(e) =>
                setRoster({
                  ...roster,
                  compounders: e.target.value.split(';').map((str) => {
                    const parts = str.split('(');
                    return { name: parts[0]?.trim() || 'Compounder', duty: parts[1]?.replace(')', '').trim() || 'General Dressing' };
                  }),
                })
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">Housekeeping / Sanitation Cleaners</label>
            <input
              className="form-input"
              value={roster.cleaners.map((c) => `${c.name}`).join(', ')}
              onChange={(e) =>
                setRoster({
                  ...roster,
                  cleaners: e.target.value.split(',').map((nm) => ({ name: nm.trim(), shift: 'Day', lastRound: 'Just updated' })),
                })
              }
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={() => onSave(roster)}>
              <Save size={14} /> Update Ward Roster
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
