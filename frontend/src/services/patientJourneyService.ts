// Shared Patient Journey Store for cross-department persistence
import { Gender, RoleType, AppointmentStatus } from '../types';
import {
  getCampusBuildings,
  saveCampusBuildings,
  BuildingNode,
  FloorNode,
  WardNode,
  RoomNode,
  BedNode,
  InpatientCareDetails,
} from '../pages/admin/setup/organization/CampusInfrastructureSection';

export interface FlatCampusBed {
  buildingId: string;
  buildingName: string;
  buildingCode?: string;
  floorId: string;
  floorName: string;
  floorCode?: string;
  wardId: string;
  wardName: string;
  wardCode?: string;
  wardType: string;
  supervisorNurse?: string;
  departmentName?: string;
  roomNumber: string;
  roomType?: string;
  bed: BedNode;
}

export interface SharedPatient {
  uhid: string;
  firstName: string;
  lastName: string;
  phone: string;
  dob: string;
  age: number;
  gender: Gender | string;
  bloodGroup: string;
  idType: string;
  idNumber: string;
  emergencyContact: string;
  insurance: string;
  visitsCount: number;
  outstandingDue: number;
  recentVisits?: any[];
}

export interface SharedQueueToken {
  id: string;
  token: number;
  aptNo: string;
  uhid: string;
  patient: string;
  age: number;
  gender: string;
  bloodGroup: string;
  phone: string;
  doctor: string;
  room: string;
  time: string;
  type: string;
  status: string; // 'WAITING' | 'IN_TRIAGE' | 'TRIAGED' | 'READY_FOR_DOCTOR' | 'IN_CONSULTATION' | 'COMPLETED' | 'HOLD' | 'NO_SHOW' | 'EMERGENCY'
  priority?: 'NORMAL' | 'URGENT' | 'VIP' | 'EMERGENCY';
  feePaid?: boolean;
  totalFee?: number;
  paymentMode?: string;
  invoiceNo?: string;
  callingStatus?: 'IDLE' | 'CALLING' | 'ACCEPTED';
  checkoutTime?: string;
  allergies?: string[];
  chronicConditions?: string[];
  medicalHistory?: string[];
  currentMedications?: string[];
  triageNotes?: string;
  waitingStartTime?: string;
  triageStartTime?: string;
  vitals?: {
    bp: string;
    pulse: number;
    temp: number;
    spo2: number;
    height: number;
    weight: number;
    bmi: number;
    respiratoryRate?: number;
    rbs?: number;
    painScale?: number;
    triageNotes?: string;
  };
  assessment?: {
    chiefComplaint: string;
    painScale: number;
    allergies: string[];
    medicalHistory: string[];
    currentMedications: string[];
    triageCategory?: 'IMMEDIATE' | 'VERY_URGENT' | 'URGENT' | 'STANDARD' | 'NON_URGENT';
    triagedBy?: string;
    triagedAt?: string;
  };
}

export interface NurseClinicalTask {
  id: string;
  orderNo: string;
  uhid: string;
  patientName: string;
  age: number;
  gender: string;
  doctorName: string;
  category: 'MEDICATION' | 'INJECTION' | 'DRESSING' | 'PROCEDURE' | 'SAMPLE';
  title: string;
  description: string;
  dosage?: string;
  route?: string;
  priority: 'ROUTINE' | 'STAT' | 'URGENT';
  scheduledTime: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  nurseNotes?: string;
  completedAt?: string;
  completedBy?: string;
}

export interface NurseObservationReading {
  id: string;
  time: string;
  bp: string;
  pulse: number;
  temp: number;
  spo2: number;
  respiratoryRate?: number;
  pain: number;
  response: string;
  note?: string;
}

export interface NurseObservationBed {
  id: string;
  bedNumber: string;
  uhid: string;
  patientName: string;
  age: number;
  gender: string;
  doctorName: string;
  diagnosis: string;
  startTime: string;
  status: 'ACTIVE' | 'ESCALATED' | 'DISCHARGED';
  readings: NurseObservationReading[];
}

export interface NurseShiftRecord {
  id: string;
  shift: 'MORNING' | 'EVENING' | 'NIGHT';
  date: string;
  nurseName: string;
  station: string;
  handoffNotes: string;
  criticalPatients: { uhid: string; patientName: string; alert: string }[];
  pendingTasksCount: number;
  completedTasksCount: number;
  submittedAt?: string;
}

export interface DailyCounterSession {
  id: string;
  counterNumber: string;
  receptionistName: string;
  shift: string;
  openedAt: string;
  closedAt?: string;
  status: 'OPEN' | 'CLOSED';
  openingFloat: number;
  notes?: string;
}

export interface SharedLabOrder {
  id: string;
  orderNo: string;
  patientName: string;
  uhid: string;
  age: number;
  gender: string;
  testName: string;
  category: string;
  sampleType: string;
  container: string;
  doctor: string;
  barcode: string;
  stage: 'COLLECTED' | 'PROCESSING' | 'RESULT_ENTERED' | 'VALIDATED' | 'REPORT_GENERATED';
  price: number;
  isFlaggedAbnormal: boolean;
  parameters: {
    paramName: string;
    observedValue: string;
    referenceRange: string;
    unit: string;
    isAbnormal: boolean;
  }[];
  technicianNote?: string;
  pathologistRemarks?: string;
}

export interface SharedInvoice {
  id: string;
  invNo: string;
  patientName: string;
  uhid: string;
  phone: string;
  category: 'OPD' | 'IPD' | 'OT' | 'LAB' | 'PACKAGE';
  date: string;
  subtotal: number;
  discount: number;
  tax: number;
  advanceDeducted: number;
  total: number;
  paid: number;
  balance: number;
  status: 'PAID' | 'UNPAID' | 'PARTIALLY_PAID' | 'INSURANCE_PENDING';
  items: {
    source: 'Consultation' | 'Laboratory' | 'OT' | 'Bed Charge' | 'Pharmacy' | 'Misc';
    description: string;
    qty: number;
    unitPrice: number;
    total: number;
  }[];
}

export interface SharedPrescription {
  id: string;
  prescriptionNo: string;
  uhid: string;
  patientName: string;
  age: number;
  gender: string;
  doctorName: string;
  doctorSpecialization: string;
  chamber: string;
  date: string;
  diagnosis: string;
  diagnosisCode?: string;
  chiefComplaints: string;
  clinicalNotes?: string;
  vitals?: {
    bp: string;
    pulse: number;
    temp: number;
    spo2: number;
    weight: number;
  };
  items: {
    medicineName: string;
    dosage: string;
    frequency: string;
    durationDays: number;
    timing?: string;
    instructions?: string;
    reason?: string;
  }[];
  followUpDate?: string;
  isDispensed?: boolean;
}

export interface SharedDoctorFollowUp {
  id: string;
  uhid: string;
  patientName: string;
  phone: string;
  doctorName: string;
  prescribedOn: string;
  followUpDate: string;
  reason: string;
  clinicalNotes?: string;
  status: 'PENDING_BOOKING' | 'BOOKED' | 'COMPLETED';
  bookedSlot?: string;
}

export interface SharedInpatientRound {
  id: string;
  uhid: string;
  patientName: string;
  age: number;
  gender: string;
  bedCode: string;
  wardName: string;
  admittedDate: string;
  doctorName: string;
  primaryDiagnosis: string;
  todayVitals: {
    bp: string;
    pulse: number;
    temp: number;
    spo2: number;
  };
  roundStatus: 'PENDING' | 'COMPLETED';
  progressNote?: string;
  dietPlan?: string;
  oxygenSupport?: string;
}

export interface SharedEmergencyAlert {
  id: string;
  callTime: string;
  location: string;
  patientName: string;
  age: number;
  gender: string;
  triagePriority: 'RED_IMMEDIATE' | 'YELLOW_URGENT';
  presentingCondition: string;
  status: 'ACTIVE' | 'ATTENDED';
}

const DEFAULT_PATIENTS: SharedPatient[] = [
  {
    uhid: 'UHID-202609-00001',
    firstName: 'Robert',
    lastName: 'Fox',
    phone: '+1 555-019-2834',
    dob: '1988-04-12',
    age: 38,
    gender: Gender.MALE,
    bloodGroup: 'O+',
    idType: 'Passport',
    idNumber: 'P8920194A',
    emergencyContact: 'Emily Fox (Wife) • +1 555-019-2835',
    insurance: 'BlueCross Silver Care • Pol# BC-882910',
    visitsCount: 4,
    outstandingDue: 1345.0,
  },
  {
    uhid: 'UHID-202609-00002',
    firstName: 'Eleanor',
    lastName: 'Vance',
    phone: '+1 555-014-9821',
    dob: '1964-11-23',
    age: 62,
    gender: Gender.FEMALE,
    bloodGroup: 'A+',
    idType: 'Driver License',
    idNumber: 'DL-908129-NC',
    emergencyContact: 'Thomas Vance (Son) • +1 555-014-9822',
    insurance: 'Aetna Senior Health • Pol# AET-449102',
    visitsCount: 2,
    outstandingDue: 0.0,
  },
];

const DEFAULT_QUEUE: SharedQueueToken[] = [
  {
    id: 'apt-001',
    token: 1,
    aptNo: 'APT-20260915-0001',
    uhid: 'UHID-202609-00001',
    patient: 'Robert Fox',
    age: 38,
    gender: 'MALE',
    bloodGroup: 'O+',
    phone: '+1 555-019-2834',
    doctor: 'Dr. Sarah Jenkins (Cardiology)',
    room: 'Room 204',
    time: '09:00 AM',
    type: 'WALK_IN',
    status: 'IN_CONSULTATION',
    allergies: ['Penicillin', 'Sulfa Drugs'],
    chronicConditions: ['Hypertension'],
    vitals: {
      bp: '120/80',
      pulse: 74,
      temp: 98.4,
      spo2: 99,
      height: 178,
      weight: 76,
      bmi: 24.0,
      triageNotes: 'Mild fatigue, routine follow up.',
    },
  },
  {
    id: 'apt-002',
    token: 2,
    aptNo: 'APT-20260915-0002',
    uhid: 'UHID-202609-00002',
    patient: 'Eleanor Vance',
    age: 62,
    gender: 'FEMALE',
    bloodGroup: 'A+',
    phone: '+1 555-014-9821',
    doctor: 'Dr. Michael Chang (General Surgery)',
    room: 'Room 102',
    time: '09:15 AM',
    type: 'SCHEDULED',
    status: 'TRIAGED',
    allergies: [],
    chronicConditions: [],
    vitals: {
      bp: '110/70',
      pulse: 68,
      temp: 99.1,
      spo2: 98,
      height: 162,
      weight: 60,
      bmi: 22.8,
    },
  },
];

const DEFAULT_LAB_ORDERS: SharedLabOrder[] = [
  {
    id: 'lab-01',
    orderNo: 'LAB-202609-001',
    patientName: 'Robert Fox',
    uhid: 'UHID-202609-00001',
    age: 38,
    gender: 'MALE',
    testName: 'Complete Blood Count (CBC) with ESR',
    category: 'Hematology',
    sampleType: 'Whole Blood',
    container: 'EDTA Vacutainer (Lavender Cap)',
    doctor: 'Dr. Sarah Jenkins',
    barcode: 'BC-2026-0915-01',
    stage: 'PROCESSING',
    price: 45.0,
    isFlaggedAbnormal: false,
    parameters: [
      { paramName: 'Hemoglobin (Hb)', observedValue: '14.2', referenceRange: '13.0 - 17.0', unit: 'g/dL', isAbnormal: false },
      { paramName: 'Total Leukocyte Count (WBC)', observedValue: '8,400', referenceRange: '4,000 - 11,000', unit: '/mcL', isAbnormal: false },
      { paramName: 'Platelet Count', observedValue: '280,000', referenceRange: '150,000 - 450,000', unit: '/mcL', isAbnormal: false },
      { paramName: 'Erythrocyte Sedimentation Rate (ESR)', observedValue: '12', referenceRange: '0 - 15', unit: 'mm/1st hr', isAbnormal: false },
    ],
    technicianNote: 'Specimen processed on automated analyzer.',
  },
];

const DEFAULT_INVOICES: SharedInvoice[] = [
  {
    id: 'inv-001',
    invNo: 'INV-202609-00001',
    patientName: 'Robert Fox',
    uhid: 'UHID-202609-00001',
    phone: '+1 555-019-2834',
    category: 'OT',
    date: '2026-09-15',
    subtotal: 1945.0,
    discount: 100.0,
    tax: 0.0,
    advanceDeducted: 500.0,
    total: 1345.0,
    paid: 0.0,
    balance: 1345.0,
    status: 'UNPAID',
    items: [
      { source: 'Consultation', description: 'Dr. Michael Chang, MS Consultation', qty: 1, unitPrice: 90.0, total: 90.0 },
      { source: 'Laboratory', description: 'Complete Blood Count (CBC) with ESR', qty: 1, unitPrice: 45.0, total: 45.0 },
      { source: 'OT', description: 'Laparoscopic Cholecystectomy & OT Theater Fee', qty: 1, unitPrice: 1500.0, total: 1500.0 },
      { source: 'Bed Charge', description: 'Male Surgical Ward Bed (MSW-B04) • 1 Day', qty: 1, unitPrice: 160.0, total: 160.0 },
      { source: 'Pharmacy', description: 'Post-Op Antibiotics & Analgesics Pack', qty: 1, unitPrice: 150.0, total: 150.0 },
    ],
  },
];

const DEFAULT_PRESCRIPTIONS: SharedPrescription[] = [
  {
    id: 'rx-001',
    prescriptionNo: 'RX-202609-001',
    uhid: 'UHID-202609-00001',
    patientName: 'Robert Fox',
    age: 38,
    gender: 'MALE',
    doctorName: 'Dr. Sarah Jenkins',
    doctorSpecialization: 'MD (Cardiology / Internal Medicine)',
    chamber: 'Room 204, OPD Block B',
    date: '2026-09-22',
    diagnosis: 'Acute Upper Respiratory Tract Infection',
    diagnosisCode: 'ICD-10: J06.9',
    chiefComplaints: 'Persistent dry cough for 4 days, mild sore throat, and intermittent fatigue.',
    clinicalNotes: 'Advised hydration, warm water gargles, and rest. Return if fever persists beyond 3 days.',
    vitals: { bp: '120/80', pulse: 74, temp: 98.4, spo2: 99, weight: 76 },
    items: [
      {
        medicineName: 'Amoxicillin 500mg',
        dosage: '500mg (1 Cap)',
        frequency: '1-0-1',
        durationDays: 5,
        timing: 'AFTER_FOOD',
        reason: 'Bacterial pharyngitis & throat infection coverage',
        instructions: 'Take after meals with a full glass of water',
      },
      {
        medicineName: 'Paracetamol 650mg',
        dosage: '650mg (1 Tab)',
        frequency: '1-0-1 SOS',
        durationDays: 3,
        timing: 'AFTER_FOOD',
        reason: 'Fever reduction & bodyache relief (SOS)',
        instructions: 'Take only if temperature exceeds 99°F',
      },
      {
        medicineName: 'Levocetirizine 5mg',
        dosage: '5mg (1 Tab)',
        frequency: '0-0-1',
        durationDays: 5,
        timing: 'AFTER_FOOD',
        reason: 'Allergic rhinitis, sneezing & cough relief',
        instructions: 'Take before bedtime',
      },
    ],
    followUpDate: '2026-09-27',
    isDispensed: false,
  },
  {
    id: 'rx-002',
    prescriptionNo: 'RX-202609-002',
    uhid: 'UHID-202609-00002',
    patientName: 'Eleanor Vance',
    age: 62,
    gender: 'FEMALE',
    doctorName: 'Dr. Sarah Jenkins',
    doctorSpecialization: 'MD (Cardiology / Internal Medicine)',
    chamber: 'Room 204, OPD Block B',
    date: '2026-09-21',
    diagnosis: 'Essential Primary Hypertension (Stage 1)',
    diagnosisCode: 'ICD-10: I10',
    chiefComplaints: 'Occasional morning occipital headache and mild exertion fatigue.',
    clinicalNotes: 'Low sodium diet advised (DASH diet). Daily BP logging recommended.',
    vitals: { bp: '142/88', pulse: 78, temp: 98.6, spo2: 98, weight: 64 },
    items: [
      {
        medicineName: 'Telmisartan 40mg',
        dosage: '40mg (1 Tab)',
        frequency: '1-0-0',
        durationDays: 30,
        timing: 'BEFORE_FOOD',
        reason: 'Blood pressure control & cardiovascular protection',
        instructions: 'Take early morning with water',
      },
      {
        medicineName: 'Amlodipine 5mg',
        dosage: '5mg (1 Tab)',
        frequency: '0-0-1',
        durationDays: 30,
        timing: 'AFTER_FOOD',
        reason: 'Peripheral vasodilation for night BP control',
        instructions: 'Take at night after dinner',
      },
    ],
    followUpDate: '2026-10-21',
    isDispensed: true,
  },
];

const DEFAULT_FOLLOW_UPS: SharedDoctorFollowUp[] = [
  {
    id: 'fu-001',
    uhid: 'UHID-202609-00001',
    patientName: 'Robert Fox',
    phone: '+1 555-019-2834',
    doctorName: 'Dr. Sarah Jenkins',
    prescribedOn: '2026-09-22',
    followUpDate: '2026-09-27',
    reason: 'Symptom reassessment post-antibiotics course',
    clinicalNotes: 'Check throat resolution and complete lung auscultation.',
    status: 'PENDING_BOOKING',
  },
  {
    id: 'fu-002',
    uhid: 'UHID-202609-00002',
    patientName: 'Eleanor Vance',
    phone: '+1 555-014-9821',
    doctorName: 'Dr. Sarah Jenkins',
    prescribedOn: '2026-09-21',
    followUpDate: '2026-10-21',
    reason: 'BP control review & serum electrolytes monitoring',
    clinicalNotes: 'Bring 30-day home BP chart. Repeat Serum Creatinine & Potassium.',
    status: 'BOOKED',
    bookedSlot: '09:30 AM',
  },
  {
    id: 'fu-003',
    uhid: 'UHID-202609-00004',
    patientName: 'Pushkar Sonar',
    phone: '+1 555-018-7744',
    doctorName: 'Dr. Sarah Jenkins',
    prescribedOn: '2026-09-20',
    followUpDate: '2026-09-25',
    reason: 'Post-gastritis review & dietary tolerance assessment',
    clinicalNotes: 'Check if epigastric burning has subsided on PPIs.',
    status: 'PENDING_BOOKING',
  },
];

const DEFAULT_INPATIENT_ROUNDS: SharedInpatientRound[] = [
  {
    id: 'round-001',
    uhid: 'UHID-202609-00011',
    patientName: 'James Wilson',
    age: 54,
    gender: 'MALE',
    bedCode: 'MSW-B02',
    wardName: 'Male Medical Ward (Floor 2)',
    admittedDate: '2026-09-20',
    doctorName: 'Dr. Sarah Jenkins',
    primaryDiagnosis: 'Acute Coronary Syndrome - NSTEMI (Stabilized)',
    todayVitals: { bp: '128/82', pulse: 72, temp: 98.4, spo2: 98 },
    roundStatus: 'COMPLETED',
    progressNote: 'Patient asymptomatic this morning. No angina or dyspnea overnight. ECG stable with inverted T waves in V4-V6. Continue dual antiplatelet therapy and high-intensity statin.',
    dietPlan: 'Low salt, low fat diabetic cardiac diet',
    oxygenSupport: 'Room Air (SpO2 98%)',
  },
  {
    id: 'round-002',
    uhid: 'UHID-202609-00014',
    patientName: 'Maria Rodriguez',
    age: 48,
    gender: 'FEMALE',
    bedCode: 'FSW-B05',
    wardName: 'Female Medical Ward (Floor 2)',
    admittedDate: '2026-09-21',
    doctorName: 'Dr. Sarah Jenkins',
    primaryDiagnosis: 'Hypertensive Urgency with Mild Renal Azotemia',
    todayVitals: { bp: '142/90', pulse: 80, temp: 98.6, spo2: 97 },
    roundStatus: 'PENDING',
    progressNote: 'Blood pressure improving from admission (was 190/115). Titrate ACE inhibitor. Monitor daily urine output and creatinine.',
    dietPlan: 'Renal-sparing cardiac diet',
    oxygenSupport: 'Room Air',
  },
  {
    id: 'round-003',
    uhid: 'UHID-202609-00018',
    patientName: 'Samuel Adams',
    age: 68,
    gender: 'MALE',
    bedCode: 'ICU-B01',
    wardName: 'Intensive Care Unit (Floor 3)',
    admittedDate: '2026-09-21',
    doctorName: 'Dr. Sarah Jenkins',
    primaryDiagnosis: 'Acute Decompensated Heart Failure (NYHA Class III)',
    todayVitals: { bp: '116/74', pulse: 84, temp: 99.0, spo2: 95 },
    roundStatus: 'PENDING',
    progressNote: 'Bilateral basal crackles improving on IV Furosemide infusion. Net fluid negative by 1,400 ml in 24 hrs. Continue telemetry monitoring.',
    dietPlan: 'Strict fluid restriction 1.2 L/day',
    oxygenSupport: 'Nasal cannula at 2 L/min',
  },
  {
    id: 'round-004',
    uhid: 'UHID-202609-00022',
    patientName: 'Brenda Chen',
    age: 39,
    gender: 'FEMALE',
    bedCode: 'DAY-B03',
    wardName: 'OPD Observation Unit (Ground Floor)',
    admittedDate: '2026-09-22',
    doctorName: 'Dr. Sarah Jenkins',
    primaryDiagnosis: 'Vasovagal Syncope under Short-Stay Observation',
    todayVitals: { bp: '112/72', pulse: 68, temp: 98.2, spo2: 99 },
    roundStatus: 'COMPLETED',
    progressNote: 'Orthostatic vitals negative. 12-lead ECG normal sinus rhythm. Tolerating oral fluids well. Discharged with syncope precautions.',
    dietPlan: 'Normal general diet + Oral rehydration',
    oxygenSupport: 'Room Air',
  },
];

const DEFAULT_EMERGENCY_ALERTS: SharedEmergencyAlert[] = [
  {
    id: 'emg-001',
    callTime: '09:42 AM',
    location: 'Casualty / ER Bay 02',
    patientName: 'Marcus Brody',
    age: 52,
    gender: 'MALE',
    triagePriority: 'RED_IMMEDIATE',
    presentingCondition: 'Acute retrosternal crushing chest pain radiating to jaw and left arm. Diaphoretic. ECG shows ST-segment elevation in leads II, III, aVF. STAT Cardiology Evaluation requested.',
    status: 'ACTIVE',
  },
  {
    id: 'emg-002',
    callTime: '08:15 AM',
    location: 'Triage Desk 01',
    patientName: 'Helen Garcia',
    age: 60,
    gender: 'FEMALE',
    triagePriority: 'YELLOW_URGENT',
    presentingCondition: 'Sudden onset palpitations and presyncope. Pulse 145 bpm irregularly irregular. Atrial fibrillation with rapid ventricular rate. Stabilized with IV Diltiazem.',
    status: 'ATTENDED',
  },
];

const DEFAULT_NURSE_TASKS: NurseClinicalTask[] = [
  {
    id: 'task-001',
    orderNo: 'ORD-20260923-01',
    uhid: 'UHID-202609-00001',
    patientName: 'Robert Fox',
    age: 38,
    gender: 'MALE',
    doctorName: 'Dr. Sarah Jenkins',
    category: 'INJECTION',
    title: 'IV Ketorolac 30mg STAT',
    description: 'Administer slow IV push over 2 minutes for severe musculoskeletal spasm. Monitor for epigastric discomfort.',
    dosage: '30 mg',
    route: 'Intravenous (IV)',
    priority: 'STAT',
    scheduledTime: '10:00 AM',
    status: 'PENDING',
  },
  {
    id: 'task-002',
    orderNo: 'ORD-20260923-02',
    uhid: 'UHID-202609-00002',
    patientName: 'Eleanor Vance',
    age: 62,
    gender: 'FEMALE',
    doctorName: 'Dr. Michael Chang',
    category: 'MEDICATION',
    title: 'Tab Paracetamol 650mg PO',
    description: 'Provide single dose with water for acute febrile headache (Temp 99.8 F).',
    dosage: '650 mg',
    route: 'Oral (PO)',
    priority: 'ROUTINE',
    scheduledTime: '10:15 AM',
    status: 'IN_PROGRESS',
    nurseNotes: 'Patient given 1 tablet with cup of water. Recheck temp in 45 mins.',
  },
  {
    id: 'task-003',
    orderNo: 'ORD-20260923-03',
    uhid: 'UHID-202609-00003',
    patientName: 'David Miller',
    age: 45,
    gender: 'MALE',
    doctorName: 'Dr. Michael Chang',
    category: 'DRESSING',
    title: 'Aseptic Post-Op Wound Dressing',
    description: 'Clean right forearm superficial wound with Betadine & saline, apply non-adherent sterile gauze dressing.',
    priority: 'URGENT',
    scheduledTime: '10:30 AM',
    status: 'PENDING',
  },
  {
    id: 'task-004',
    orderNo: 'ORD-20260923-04',
    uhid: 'UHID-202609-00005',
    patientName: 'Sarah Connor',
    age: 29,
    gender: 'FEMALE',
    doctorName: 'Dr. Sarah Jenkins',
    category: 'SAMPLE',
    title: 'STAT Blood Sample Collection (Troponin-T + CBC)',
    description: 'Venipuncture 5ml EDTA (Purple) & 3.5ml SST (Gold). Deliver directly to Diagnostic Lab immediately.',
    priority: 'STAT',
    scheduledTime: '09:45 AM',
    status: 'COMPLETED',
    nurseNotes: 'Clean venipuncture right antecubital fossa. Sample barcoded and sent to Lab with tech Priya.',
    completedAt: '09:55 AM',
    completedBy: 'Nurse Clara Adams',
  },
  {
    id: 'task-005',
    orderNo: 'ORD-20260923-05',
    uhid: 'UHID-202609-00004',
    patientName: 'Michael Chang',
    age: 51,
    gender: 'MALE',
    doctorName: 'Dr. Sarah Jenkins',
    category: 'PROCEDURE',
    title: 'Standard 12-Lead Resting ECG',
    description: 'Obtain 12-lead ECG recording before doctor review. Check baseline rhythm.',
    priority: 'URGENT',
    scheduledTime: '10:45 AM',
    status: 'PENDING',
  },
];

const DEFAULT_OBSERVATION_BEDS: NurseObservationBed[] = [
  {
    id: 'obs-01',
    bedNumber: 'OBS-Bed 01',
    uhid: 'UHID-202609-00002',
    patientName: 'Eleanor Vance',
    age: 62,
    gender: 'FEMALE',
    doctorName: 'Dr. Michael Chang',
    diagnosis: 'Post-Injection Vasovagal Dizziness / Mild Hypotension',
    startTime: '09:15 AM',
    status: 'ACTIVE',
    readings: [
      {
        id: 'r-1',
        time: '09:15 AM',
        bp: '104/66',
        pulse: 64,
        temp: 98.6,
        spo2: 99,
        respiratoryRate: 16,
        pain: 2,
        response: 'Placed in supine position with legs elevated. Infusing 250ml Normal Saline.',
        note: 'Patient conscious and oriented.',
      },
      {
        id: 'r-2',
        time: '09:45 AM',
        bp: '116/74',
        pulse: 70,
        temp: 98.4,
        spo2: 99,
        respiratoryRate: 16,
        pain: 1,
        response: 'Dizziness significantly improved. Tolerating sips of water without nausea.',
        note: 'BP normalized. Repeat check in 30 mins.',
      },
    ],
  },
  {
    id: 'obs-02',
    bedNumber: 'OBS-Bed 02',
    uhid: 'UHID-202609-00003',
    patientName: 'David Miller',
    age: 45,
    gender: 'MALE',
    doctorName: 'Dr. Sarah Jenkins',
    diagnosis: 'Atypical Chest Discomfort under Continuous Telemetry',
    startTime: '09:30 AM',
    status: 'ACTIVE',
    readings: [
      {
        id: 'r-3',
        time: '09:30 AM',
        bp: '138/86',
        pulse: 82,
        temp: 98.8,
        spo2: 98,
        respiratoryRate: 18,
        pain: 4,
        response: 'Connected to multi-para monitor. Sorbitrate sublingual administered.',
        note: 'ECG shows sinus rhythm without ST elevations.',
      },
    ],
  },
  {
    id: 'obs-03',
    bedNumber: 'OBS-Bed 03',
    uhid: 'UHID-202609-00006',
    patientName: 'Arthur Pendelton',
    age: 71,
    gender: 'MALE',
    doctorName: 'Dr. Robert Chen',
    diagnosis: 'Acute Asthmatic Bronchospasm (Post-Nebulization Observation)',
    startTime: '08:45 AM',
    status: 'DISCHARGED',
    readings: [
      {
        id: 'r-4',
        time: '08:45 AM',
        bp: '130/80',
        pulse: 92,
        temp: 98.6,
        spo2: 94,
        respiratoryRate: 22,
        pain: 0,
        response: 'Duolin + Budecort nebulization administered. Oxygen at 2L via nasal prongs.',
      },
      {
        id: 'r-5',
        time: '09:30 AM',
        bp: '124/78',
        pulse: 78,
        temp: 98.4,
        spo2: 98,
        respiratoryRate: 16,
        pain: 0,
        response: 'Bilateral wheezing resolved. Room air trial successful. Discharged home with inhaler prescription.',
      },
    ],
  },
];

const DEFAULT_NURSE_SHIFT: NurseShiftRecord = {
  id: 'shift-today',
  shift: 'MORNING',
  date: new Date().toISOString().split('T')[0],
  nurseName: 'Nurse Clara Adams, RN',
  station: 'OPD Central Triage & Day-Care Observation',
  handoffNotes: 'OPD patient flow high for Dr. Sarah Jenkins (Cardiology). 2 patients currently under active observation in OBS-01 and OBS-02. Crash cart checked and verified with all emergency ampoules sealed. Glucometer calibrated.',
  criticalPatients: [
    {
      uhid: 'UHID-202609-00003',
      patientName: 'David Miller',
      alert: 'Serial cardiac enzymes pending; report any recurrent chest tightness immediately.',
    },
    {
      uhid: 'UHID-202609-00002',
      patientName: 'Eleanor Vance',
      alert: 'Recheck orthostatic BP prior to discharge from OBS Bed 01.',
    },
  ],
  pendingTasksCount: 3,
  completedTasksCount: 8,
};

export const patientJourneyService = {
  // --- Patients ---
  getPatients(): SharedPatient[] {
    const raw = localStorage.getItem('nh_patients');
    if (!raw) {
      localStorage.setItem('nh_patients', JSON.stringify(DEFAULT_PATIENTS));
      return DEFAULT_PATIENTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_PATIENTS;
    }
  },

  registerPatient(patient: SharedPatient): SharedPatient {
    const list = this.getPatients();
    const updated = [patient, ...list.filter((p) => p.uhid !== patient.uhid)];
    localStorage.setItem('nh_patients', JSON.stringify(updated));
    return patient;
  },

  // --- Queue ---
  getQueue(): SharedQueueToken[] {
    const raw = localStorage.getItem('nh_queue');
    if (!raw) {
      localStorage.setItem('nh_queue', JSON.stringify(DEFAULT_QUEUE));
      return DEFAULT_QUEUE;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_QUEUE;
    }
  },

  addQueueToken(token: SharedQueueToken): SharedQueueToken {
    const list = this.getQueue();
    const updated = [token, ...list.filter((q) => q.token !== token.token)];
    localStorage.setItem('nh_queue', JSON.stringify(updated));
    window.dispatchEvent(new Event('nh_data_sync'));
    return token;
  },

  updateQueueStatus(tokenNo: number, status: string): void {
    const list = this.getQueue();
    const updated = list.map((q) => (q.token === tokenNo ? { ...q, status } : q));
    localStorage.setItem('nh_queue', JSON.stringify(updated));
    window.dispatchEvent(new Event('nh_data_sync'));
  },

  updateQueueToken(tokenNo: number, updates: Partial<SharedQueueToken>): void {
    const list = this.getQueue();
    const updated = list.map((q) => (q.token === tokenNo ? { ...q, ...updates } : q));
    localStorage.setItem('nh_queue', JSON.stringify(updated));
    window.dispatchEvent(new Event('nh_data_sync'));
  },

  deleteQueueToken(tokenNo: number): void {
    const list = this.getQueue();
    const updated = list.filter((q) => q.token !== tokenNo);
    localStorage.setItem('nh_queue', JSON.stringify(updated));
    window.dispatchEvent(new Event('nh_data_sync'));
  },

  // --- Laboratory Orders ---
  getLabOrders(): SharedLabOrder[] {
    const raw = localStorage.getItem('nh_lab_orders');
    if (!raw) {
      localStorage.setItem('nh_lab_orders', JSON.stringify(DEFAULT_LAB_ORDERS));
      return DEFAULT_LAB_ORDERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_LAB_ORDERS;
    }
  },

  addLabOrder(order: SharedLabOrder): SharedLabOrder {
    const list = this.getLabOrders();
    const updated = [order, ...list.filter((o) => o.id !== order.id)];
    localStorage.setItem('nh_lab_orders', JSON.stringify(updated));
    return order;
  },

  updateLabOrder(orderId: string, updates: Partial<SharedLabOrder>): void {
    const list = this.getLabOrders();
    const updated = list.map((o) => (o.id === orderId ? { ...o, ...updates } : o));
    localStorage.setItem('nh_lab_orders', JSON.stringify(updated));
  },

  // --- Invoices ---
  getInvoices(): SharedInvoice[] {
    const raw = localStorage.getItem('nh_invoices');
    if (!raw) {
      localStorage.setItem('nh_invoices', JSON.stringify(DEFAULT_INVOICES));
      return DEFAULT_INVOICES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_INVOICES;
    }
  },

  addInvoice(invoice: SharedInvoice): SharedInvoice {
    const list = this.getInvoices();
    const updated = [invoice, ...list.filter((i) => i.id !== invoice.id)];
    localStorage.setItem('nh_invoices', JSON.stringify(updated));
    return invoice;
  },

  updateInvoice(invoiceId: string, updates: Partial<SharedInvoice>): void {
    const list = this.getInvoices();
    const updated = list.map((i) => (i.id === invoiceId ? { ...i, ...updates } : i));
    localStorage.setItem('nh_invoices', JSON.stringify(updated));
  },

  // --- Daily Counter Shift Session ---
  getCounterSession(): DailyCounterSession {
    const raw = localStorage.getItem('nh_counter_session');
    if (!raw) {
      const defaultSession: DailyCounterSession = {
        id: `cnt-${new Date().toISOString().slice(0, 10)}`,
        counterNumber: 'Desk #1',
        receptionistName: 'Emma FrontDesk',
        shift: 'Morning Shift (08:00 - 16:00)',
        openedAt: '08:00 AM',
        status: 'OPEN',
        openingFloat: 150.0,
        notes: 'Daily counter opened with $150 opening float cash.',
      };
      localStorage.setItem('nh_counter_session', JSON.stringify(defaultSession));
      return defaultSession;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        id: `cnt-${new Date().toISOString().slice(0, 10)}`,
        counterNumber: 'Desk #1',
        receptionistName: 'Emma FrontDesk',
        shift: 'Morning Shift (08:00 - 16:00)',
        openedAt: '08:00 AM',
        status: 'OPEN',
        openingFloat: 150.0,
      };
    }
  },

  openCounterSession(data: Partial<DailyCounterSession>): DailyCounterSession {
    const current = this.getCounterSession();
    const newSession: DailyCounterSession = {
      ...current,
      id: `cnt-${Date.now()}`,
      status: 'OPEN',
      openedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      closedAt: undefined,
      ...data,
    };
    localStorage.setItem('nh_counter_session', JSON.stringify(newSession));
    return newSession;
  },

  closeCounterSession(closingNotes?: string): DailyCounterSession {
    const current = this.getCounterSession();
    const closedSession: DailyCounterSession = {
      ...current,
      status: 'CLOSED',
      closedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes: closingNotes || current.notes,
    };
    localStorage.setItem('nh_counter_session', JSON.stringify(closedSession));
    return closedSession;
  },

  resetDemo(): void {
    localStorage.setItem('nh_patients', JSON.stringify(DEFAULT_PATIENTS));
    localStorage.setItem('nh_queue', JSON.stringify(DEFAULT_QUEUE));
    localStorage.setItem('nh_lab_orders', JSON.stringify(DEFAULT_LAB_ORDERS));
    localStorage.setItem('nh_invoices', JSON.stringify(DEFAULT_INVOICES));
  },

  // --- Campus Infrastructure & Bed Management ---
  getCampusBuildings(): BuildingNode[] {
    return getCampusBuildings();
  },

  getFlatBedsList(): FlatCampusBed[] {
    const buildings = getCampusBuildings();
    const result: FlatCampusBed[] = [];

    buildings.forEach((bld) => {
      (bld.floors || []).forEach((fl) => {
        (fl.wards || []).forEach((w) => {
          (w.beds || []).forEach((b) => {
            result.push({
              buildingId: bld.id,
              buildingName: bld.name,
              buildingCode: bld.code,
              floorId: fl.id,
              floorName: fl.floorNumber,
              floorCode: fl.code,
              wardId: w.id,
              wardName: w.name,
              wardCode: w.code,
              wardType: w.wardType,
              supervisorNurse: w.supervisorNurse,
              departmentName: w.departmentName,
              roomNumber: b.roomNumber || 'General Bay',
              roomType: b.roomType || 'Standard',
              bed: b,
            });
          });
        });
      });
    });

    return result;
  },

  allocateCampusBed(
    buildingId: string,
    floorId: string,
    wardId: string,
    bedId: string,
    occupant: InpatientCareDetails
  ): boolean {
    const buildings = getCampusBuildings();
    let found = false;

    const updated = buildings.map((bld) => {
      if (buildingId && bld.id !== buildingId) return bld;
      return {
        ...bld,
        floors: (bld.floors || []).map((fl) => {
          if (floorId && fl.id !== floorId) return fl;
          return {
            ...fl,
            wards: (fl.wards || []).map((w) => {
              if (wardId && w.id !== wardId) return w;
              return {
                ...w,
                beds: (w.beds || []).map((b) => {
                  if (b.id === bedId) {
                    found = true;
                    return {
                      ...b,
                      status: 'OCCUPIED' as const,
                      cleanlinessStatus: 'SANITIZED' as const,
                      inpatientDetails: occupant,
                    };
                  }
                  return b;
                }),
              };
            }),
          };
        }),
      };
    });

    if (found) {
      saveCampusBuildings(updated);
    }
    return found;
  },

  dischargeCampusBed(
    buildingId: string,
    floorId: string,
    wardId: string,
    bedId: string
  ): boolean {
    const buildings = getCampusBuildings();
    let found = false;

    const updated = buildings.map((bld) => {
      return {
        ...bld,
        floors: (bld.floors || []).map((fl) => {
          return {
            ...fl,
            wards: (fl.wards || []).map((w) => {
              return {
                ...w,
                beds: (w.beds || []).map((b) => {
                  if (b.id === bedId) {
                    found = true;
                    return {
                      ...b,
                      status: 'AVAILABLE' as const,
                      cleanlinessStatus: 'NEEDS_CLEANING' as const,
                      inpatientDetails: undefined,
                    };
                  }
                  return b;
                }),
              };
            }),
          };
        }),
      };
    });

    if (found) {
      saveCampusBuildings(updated);
    }
    return found;
  },

  markCampusBedCleaned(
    bedId: string,
    cleanerName: string = 'Housekeeping Staff'
  ): boolean {
    const buildings = getCampusBuildings();
    let found = false;

    const updated = buildings.map((bld) => {
      return {
        ...bld,
        floors: (bld.floors || []).map((fl) => {
          return {
            ...fl,
            wards: (fl.wards || []).map((w) => {
              return {
                ...w,
                beds: (w.beds || []).map((b) => {
                  if (b.id === bedId) {
                    found = true;
                    return {
                      ...b,
                      status: b.status === 'MAINTENANCE' ? ('AVAILABLE' as const) : b.status,
                      cleanlinessStatus: 'SANITIZED' as const,
                      lastCleanedAt: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                      assignedCleaner: cleanerName,
                    };
                  }
                  return b;
                }),
              };
            }),
          };
        }),
      };
    });

    if (found) {
      saveCampusBuildings(updated);
    }
    return found;
  },

  transferCampusBed(
    sourceBedId: string,
    targetBedId: string
  ): boolean {
    const buildings = getCampusBuildings();
    let sourceOccupant: InpatientCareDetails | undefined;
    let foundSource = false;
    let foundTarget = false;

    // 1. Locate and extract source occupant
    buildings.forEach((bld) => {
      (bld.floors || []).forEach((fl) => {
        (fl.wards || []).forEach((w) => {
          (w.beds || []).forEach((b) => {
            if (b.id === sourceBedId && b.inpatientDetails) {
              sourceOccupant = b.inpatientDetails;
              foundSource = true;
            }
          });
        });
      });
    });

    if (!foundSource || !sourceOccupant) return false;

    // 2. Move occupant to target and vacate source
    const updated = buildings.map((bld) => {
      return {
        ...bld,
        floors: (bld.floors || []).map((fl) => {
          return {
            ...fl,
            wards: (fl.wards || []).map((w) => {
              return {
                ...w,
                beds: (w.beds || []).map((b) => {
                  if (b.id === sourceBedId) {
                    return {
                      ...b,
                      status: 'AVAILABLE' as const,
                      cleanlinessStatus: 'NEEDS_CLEANING' as const,
                      inpatientDetails: undefined,
                    };
                  }
                  if (b.id === targetBedId) {
                    foundTarget = true;
                    return {
                      ...b,
                      status: 'OCCUPIED' as const,
                      cleanlinessStatus: 'SANITIZED' as const,
                      inpatientDetails: sourceOccupant,
                    };
                  }
                  return b;
                }),
              };
            }),
          };
        }),
      };
    });

    if (foundTarget) {
      saveCampusBuildings(updated);
    }
    return foundTarget;
  },

  // --- Doctor Prescriptions ---
  getPrescriptions(): SharedPrescription[] {
    const raw = localStorage.getItem('nh_prescriptions');
    if (!raw) {
      localStorage.setItem('nh_prescriptions', JSON.stringify(DEFAULT_PRESCRIPTIONS));
      return DEFAULT_PRESCRIPTIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_PRESCRIPTIONS;
    }
  },

  addPrescription(rx: SharedPrescription): SharedPrescription {
    const list = this.getPrescriptions();
    const updated = [rx, ...list];
    localStorage.setItem('nh_prescriptions', JSON.stringify(updated));
    window.dispatchEvent(new Event('nh_data_sync'));
    return rx;
  },

  // --- Doctor Follow-ups ---
  getFollowUps(): SharedDoctorFollowUp[] {
    const raw = localStorage.getItem('nh_doctor_followups');
    if (!raw) {
      localStorage.setItem('nh_doctor_followups', JSON.stringify(DEFAULT_FOLLOW_UPS));
      return DEFAULT_FOLLOW_UPS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_FOLLOW_UPS;
    }
  },

  addFollowUp(fu: SharedDoctorFollowUp): SharedDoctorFollowUp {
    const list = this.getFollowUps();
    const updated = [fu, ...list];
    localStorage.setItem('nh_doctor_followups', JSON.stringify(updated));
    window.dispatchEvent(new Event('nh_data_sync'));
    return fu;
  },

  updateFollowUpStatus(id: string, status: 'PENDING_BOOKING' | 'BOOKED' | 'COMPLETED', bookedSlot?: string): boolean {
    const list = this.getFollowUps();
    const updated = list.map((f) => (f.id === id ? { ...f, status, bookedSlot: bookedSlot || f.bookedSlot } : f));
    localStorage.setItem('nh_doctor_followups', JSON.stringify(updated));
    window.dispatchEvent(new Event('nh_data_sync'));
    return true;
  },

  // --- Inpatient Rounds ---
  getInpatientRounds(): SharedInpatientRound[] {
    const raw = localStorage.getItem('nh_inpatient_rounds');
    if (!raw) {
      localStorage.setItem('nh_inpatient_rounds', JSON.stringify(DEFAULT_INPATIENT_ROUNDS));
      return DEFAULT_INPATIENT_ROUNDS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_INPATIENT_ROUNDS;
    }
  },

  updateInpatientRound(id: string, progressNote: string, status: 'PENDING' | 'COMPLETED' = 'COMPLETED'): boolean {
    const list = this.getInpatientRounds();
    const updated = list.map((r) => (r.id === id ? { ...r, progressNote, roundStatus: status } : r));
    localStorage.setItem('nh_inpatient_rounds', JSON.stringify(updated));
    window.dispatchEvent(new Event('nh_data_sync'));
    return true;
  },

  // --- Emergency Alerts ---
  getEmergencyAlerts(): SharedEmergencyAlert[] {
    const raw = localStorage.getItem('nh_emergency_alerts');
    if (!raw) {
      localStorage.setItem('nh_emergency_alerts', JSON.stringify(DEFAULT_EMERGENCY_ALERTS));
      return DEFAULT_EMERGENCY_ALERTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_EMERGENCY_ALERTS;
    }
  },

  markEmergencyAlertAttended(id: string): boolean {
    const list = this.getEmergencyAlerts();
    const updated = list.map((a) => (a.id === id ? { ...a, status: 'ATTENDED' as const } : a));
    localStorage.setItem('nh_emergency_alerts', JSON.stringify(updated));
    window.dispatchEvent(new Event('nh_data_sync'));
    return true;
  },

  // --- Nurse Station: Tasks ---
  getNurseTasks(): NurseClinicalTask[] {
    const raw = localStorage.getItem('nh_nurse_tasks');
    if (!raw) {
      localStorage.setItem('nh_nurse_tasks', JSON.stringify(DEFAULT_NURSE_TASKS));
      return DEFAULT_NURSE_TASKS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_NURSE_TASKS;
    }
  },

  addNurseTask(task: NurseClinicalTask): NurseClinicalTask {
    const list = this.getNurseTasks();
    const updated = [task, ...list];
    localStorage.setItem('nh_nurse_tasks', JSON.stringify(updated));
    window.dispatchEvent(new Event('nh_data_sync'));
    return task;
  },

  updateNurseTaskStatus(id: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED', nurseNotes?: string): boolean {
    const list = this.getNurseTasks();
    const updated = list.map((t) =>
      t.id === id
        ? {
            ...t,
            status,
            nurseNotes: nurseNotes !== undefined ? nurseNotes : t.nurseNotes,
            completedAt: status === 'COMPLETED' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t.completedAt,
            completedBy: status === 'COMPLETED' ? 'Nurse Clara Adams' : t.completedBy,
          }
        : t
    );
    localStorage.setItem('nh_nurse_tasks', JSON.stringify(updated));
    window.dispatchEvent(new Event('nh_data_sync'));
    return true;
  },

  // --- Nurse Station: Observation Beds ---
  getObservationBeds(): NurseObservationBed[] {
    const raw = localStorage.getItem('nh_nurse_obs_beds');
    if (!raw) {
      localStorage.setItem('nh_nurse_obs_beds', JSON.stringify(DEFAULT_OBSERVATION_BEDS));
      return DEFAULT_OBSERVATION_BEDS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_OBSERVATION_BEDS;
    }
  },

  addObservationReading(bedId: string, reading: Omit<NurseObservationReading, 'id'>): boolean {
    const list = this.getObservationBeds();
    const newReading: NurseObservationReading = {
      ...reading,
      id: `r-${Date.now()}`,
    };
    const updated = list.map((b) => (b.id === bedId ? { ...b, readings: [...b.readings, newReading] } : b));
    localStorage.setItem('nh_nurse_obs_beds', JSON.stringify(updated));
    window.dispatchEvent(new Event('nh_data_sync'));
    return true;
  },

  escalateObservationBed(bedId: string, _escalationNote?: string): boolean {
    const list = this.getObservationBeds();
    const updated = list.map((b) => (b.id === bedId ? { ...b, status: 'ESCALATED' as const } : b));
    localStorage.setItem('nh_nurse_obs_beds', JSON.stringify(updated));
    window.dispatchEvent(new Event('nh_data_sync'));
    return true;
  },

  dischargeObservationBed(bedId: string): boolean {
    const list = this.getObservationBeds();
    const updated = list.map((b) => (b.id === bedId ? { ...b, status: 'DISCHARGED' as const } : b));
    localStorage.setItem('nh_nurse_obs_beds', JSON.stringify(updated));
    window.dispatchEvent(new Event('nh_data_sync'));
    return true;
  },

  // --- Nurse Station: Shift & Handover ---
  getNurseShiftRecord(): NurseShiftRecord {
    const raw = localStorage.getItem('nh_nurse_shift');
    if (!raw) {
      localStorage.setItem('nh_nurse_shift', JSON.stringify(DEFAULT_NURSE_SHIFT));
      return DEFAULT_NURSE_SHIFT;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_NURSE_SHIFT;
    }
  },

  submitNurseHandover(record: Partial<NurseShiftRecord>): NurseShiftRecord {
    const current = this.getNurseShiftRecord();
    const updated: NurseShiftRecord = {
      ...current,
      ...record,
      submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    localStorage.setItem('nh_nurse_shift', JSON.stringify(updated));
    window.dispatchEvent(new Event('nh_data_sync'));
    return updated;
  },
};
