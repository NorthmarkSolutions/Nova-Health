export enum RoleType {
  SUPER_ADMIN = 'SUPER_ADMIN',
  HOSPITAL_ADMIN = 'HOSPITAL_ADMIN',
  DEPARTMENT_ADMIN = 'DEPARTMENT_ADMIN',
  RECEPTION_SUPERVISOR = 'RECEPTION_SUPERVISOR',
  RECEPTIONIST = 'RECEPTIONIST',
  DOCTOR = 'DOCTOR',
  MEDICAL_SUPERINTENDENT = 'MEDICAL_SUPERINTENDENT',
  SURGEON = 'SURGEON',
  ANESTHETIST = 'ANESTHETIST',
  OT_MANAGER = 'OT_MANAGER',
  WARD_MANAGER = 'WARD_MANAGER',
  NURSE = 'NURSE',
  PATHOLOGIST = 'PATHOLOGIST',
  LAB_TECH = 'LAB_TECH',
  PHARMACIST = 'PHARMACIST',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
  CASHIER = 'CASHIER',
  PATIENT = 'PATIENT',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  WAITING = 'WAITING',
  TRIAGED = 'TRIAGED',
  IN_CONSULTATION = 'IN_CONSULTATION',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum AppointmentType {
  WALK_IN = 'WALK_IN',
  SCHEDULED = 'SCHEDULED',
  EMERGENCY = 'EMERGENCY',
  FOLLOW_UP = 'FOLLOW_UP',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  INSURANCE_PENDING = 'INSURANCE_PENDING',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  INSURANCE = 'INSURANCE',
  NET_BANKING = 'NET_BANKING',
}

export interface DepartmentWorkspaceConfig {
  hasAppointments: boolean;
  hasQueue: boolean;
  hasAdmissions: boolean;
  hasBeds: boolean;
  hasDoctors: boolean;
  hasTests: boolean;
  hasPrescriptions: boolean;
  hasRooms: boolean;
  hasSchedules: boolean;
  hasWalkIn: boolean;
  hasBilling: boolean;

  // Queue & Capacity Policies (Step 9)
  dailyCapacity?: number;              // Default: 100 Patients / Day
  isWalkInAllowed?: boolean;           // Default: true
  isTokenSystemEnabled?: boolean;      // Default: true
  isOnlineAppointmentEnabled?: boolean;// Default: true
}

export interface DepartmentDoctor {
  id: string;
  departmentId: string;
  staffId: string;
  fullName: string;
  employeeCode: string;
  specialization: string;
  qualification: string;
  consultationFee: number;
  consultationStartTime: string; // e.g. "09:00"
  consultationEndTime: string;   // e.g. "17:00"
  workingDays: string[];         // e.g. ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  assignedRoomId?: string;
  assignedRoomName?: string;
  patientCapacityPerDay: number; // e.g. 30
  avgConsultationMinutes: number;// e.g. 15
  isAvailable: boolean;
  status: 'ACTIVE' | 'ON_LEAVE' | 'OFF_DUTY';
}

export interface DepartmentRoom {
  id: string;
  departmentId: string;
  roomNumber: string;
  name: string;
  type: 'consultation' | 'procedure' | 'treatment' | 'triage' | 'observation';
  floorName?: string;
  buildingName?: string;
  status: 'AVAILABLE' | 'IN_CONSULTATION' | 'MAINTENANCE' | 'OCCUPIED';
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  assignedNurseId?: string;
  assignedNurseName?: string;
  capacity?: number;
  equipment?: string[];
  facilityFee?: number;          // Base facility charge per consultation/visit ($)
  hourlyProcedureRate?: number;  // Hourly rate for minor OT / procedure room ($)
}

export interface DepartmentWard {
  id: string;
  departmentId: string;
  wardName: string;
  buildingName?: string;
  floorName?: string;
  headNurseId?: string;
  headNurseName?: string;
  totalBeds: number;
  responsibleDoctorId?: string;
  responsibleDoctorName?: string;
  responsibleNurseId?: string;
  responsibleNurseName?: string;
  notes?: string;
  dailyRate?: number;            // Standard 24h bed charge ($)
  hourlyRate?: number;           // Hourly daycare observation rate ($)
  nursingChargePerDay?: number;  // Inpatient nursing surcharge ($)
}

export interface DoctorTariffItem {
  doctorId: string;
  staffId: string;
  doctorName: string;
  employeeCode: string;
  designation: string;
  specialization: string;
  standardFee: number;           // Standard OPD consultation fee ($)
  followUpFee?: number;          // Follow-up visit consultation fee ($)
  emergencyFee?: number;         // Emergency / Priority intake fee ($)
  lastUpdated?: string;
}

export interface WardTariffItem {
  wardId: string;
  wardName: string;
  totalBeds: number;
  dailyRate: number;             // $ / 24 hours
  hourlyRate?: number;           // $ / hour for daycare observation
  nursingChargePerDay?: number;  // $ / 24 hours
}

export interface RoomTariffItem {
  roomId: string;
  roomNumber: string;
  roomName: string;
  type: string;
  facilityFee: number;           // Per consultation/visit ($)
  hourlyProcedureRate?: number;  // For minor OT / procedure room ($)
}

export interface BedCategoryTariffItem {
  id: string;
  categoryName: string;          // 'Standard Observation Bed', 'Daycare Bed', 'ICU Step-Down'
  dailyRate: number;             // $ / day
  hourlyRate: number;            // $ / hr
  description?: string;
}

export interface DepartmentTariffMaster {
  departmentId: string;
  currency: string;              // 'USD' ($)
  doctorTariffs: DoctorTariffItem[];
  wardTariffs: WardTariffItem[];
  roomTariffs: RoomTariffItem[];
  bedCategoryTariffs: BedCategoryTariffItem[];
  intakeRegistrationFee: number; // Department registration fee ($)
  triageVitalsFee: number;       // Nurse vitals assessment charge ($)
  updatedAt: string;
  updatedBy?: string;
}

export interface DepartmentShift {
  id: string;
  departmentId: string;
  code: string;
  name: string;
  startTime: string; // e.g. "08:00"
  endTime: string;   // e.g. "16:00"
  duration: string;  // e.g. "8 hrs"
  type: 'morning' | 'evening' | 'night' | 'general';
}

export interface DepartmentQueueToken {
  id: string;
  departmentId: string;
  tokenNumber: string; // e.g. "OPD-101"
  patientName: string;
  uhid?: string;
  age?: number;
  gender?: string;
  phone?: string;
  doctorId: string;
  doctorName: string;
  roomId: string;
  roomName: string;
  type: 'WALK_IN' | 'ONLINE_APPOINTMENT';
  status: 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  vitals?: string;
  chiefComplaint?: string;
}

export interface DepartmentStaffAssignment {
  id: string;
  departmentId: string;
  staffId: string;
  fullName: string;
  employeeCode: string;
  role: 'doctor' | 'nurse' | 'receptionist' | 'technician' | 'assistant' | 'supervisor';
  designation: string;
  shiftId: string;
  shiftName: string;
  assignedRoomId?: string;
  assignedRoomName?: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'RESIGNED';
  phone?: string;
  email?: string;
  gender?: 'Male' | 'Female' | 'Other';
  qualification?: string;
  specialization?: string;
  joiningDate?: string;
  licenseNumber?: string;
  emergencyContact?: string;
  isDepartmentHead?: boolean;
  profileCompletion?: number;
  onboardingStage?: 'BASIC_CREATED' | 'DEPARTMENT_PENDING' | 'CLINICAL_PENDING' | 'DOCS_PENDING' | 'COMPLETE';
}

export interface DepartmentScheduleSlot {
  id: string;
  departmentId: string;
  date: string;
  dayOfWeek: string;
  shiftName: string;
  staffId: string;
  staffName: string;
  role: string;
  roomId?: string;
  roomName?: string;
  notes?: string;
}

export interface DepartmentWorkspace {
  id: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  shortName: string;
  category: 'clinical' | 'diagnostic' | 'revenue' | 'admin' | 'support';
  adminId?: string;
  adminName?: string;
  adminEmail?: string;
  operatingHours: string;
  config: DepartmentWorkspaceConfig;
  createdAt: string;
  updatedAt: string;

  // Step 1: Department Setup Review & Resource Audit
  setupVerified?: boolean;
  setupVerifiedAt?: string;
  setupVerifiedBy?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleType;
  phoneNumber?: string;
  departmentId?: string;
  departmentName?: string;
  departmentCode?: string;
  doctorProfile?: DoctorProfile;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  licenseNumber: string;
  department: string;
  qualification: string;
  consultationFee: number;
  isAvailable: boolean;
  user?: User;
}

export interface Patient {
  id: string;
  uhid: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  bloodGroup?: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  allergies: string[];
  chronicConditions: string[];
  createdAt: string;
}

export interface VitalSign {
  id: string;
  appointmentId: string;
  systolicBp?: number;
  diastolicBp?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  spo2?: number;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  triageNotes?: string;
  recordedAt: string;
}

export interface Appointment {
  id: string;
  appointmentNumber: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: DoctorProfile;
  appointmentDate: string;
  slotStartTime: string;
  slotEndTime: string;
  tokenNumber: number;
  type: string;
  status: AppointmentStatus;
  vitals?: VitalSign;
  consultation?: Consultation;
  createdAt: string;
}

export interface PrescriptionItem {
  id?: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  timing?: string;
  durationDays: number;
  totalQuantity: number;
  instructions?: string;
}

export interface Prescription {
  id: string;
  prescriptionNumber: string;
  consultationId: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: DoctorProfile;
  generalAdvice?: string;
  isFinalized: boolean;
  isDispensed: boolean;
  items: PrescriptionItem[];
  createdAt: string;
}

export interface Consultation {
  id: string;
  appointmentId: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: DoctorProfile;
  chiefComplaints: string;
  clinicalFindings?: string;
  diagnosis: string;
  diagnosisCodes: string[];
  doctorNotes?: string;
  followUpDate?: string;
  status: string;
  prescription?: Prescription;
  startedAt?: string;
  endedAt?: string;
}

export interface InvoiceItem {
  id?: string;
  itemName: string;
  itemType: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  transactionReference?: string;
  status: string;
  paidAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patient?: Patient;
  appointmentId?: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: InvoiceStatus;
  notes?: string;
  items: InvoiceItem[];
  payments: Payment[];
  createdAt: string;
}

export interface LabTest {
  id: string;
  testCode: string;
  testName: string;
  category: string;
  price: number;
  normalRange?: string;
  unit?: string;
  isActive: boolean;
}

export interface LabResult {
  id: string;
  orderId: string;
  testId: string;
  test: LabTest;
  resultValue?: string;
  remarks?: string;
  isAbnormal: boolean;
  recordedAt: string;
}

export interface LabOrder {
  id: string;
  orderNumber: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: DoctorProfile;
  status: string;
  clinicalNotes?: string;
  results: LabResult[];
  createdAt: string;
}

// ----------------------------------------------------
// Operation Theatre (OT) Types
// ----------------------------------------------------
export enum SurgeryStatus {
  PLANNED = 'PLANNED',
  CONSENT_COMPLETED = 'CONSENT_COMPLETED',
  PRE_OP_ASSESSED = 'PRE_OP_ASSESSED',
  BOOKED = 'BOOKED',
  IN_PROGRESS = 'IN_PROGRESS',
  PROCEDURE_PERFORMED = 'PROCEDURE_PERFORMED',
  POST_OP_RECOVERY = 'POST_OP_RECOVERY',
  TRANSFERRED_TO_IPD = 'TRANSFERRED_TO_IPD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface SurgeryBooking {
  id: string;
  surgeryCode: string;
  surgeryName: string;
  surgeryType: string;
  patientId: string;
  patientName: string;
  uhid: string;
  age: number;
  gender: string;
  surgeonName: string;
  assistantSurgeon?: string;
  anesthetistName: string;
  otRoom: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  status: SurgeryStatus;
  nursingTeam: string[];
  equipmentAssigned: string[];
  preOpAssessmentNote?: string;
  postOpNotes?: string;
  consentFormSigned: boolean;
  pacCleared: boolean;
  npoStatusHours: number;
  estimatedCost: number;
}

// ----------------------------------------------------
// Inpatient Department (IPD) Types
// ----------------------------------------------------
export enum InpatientStatus {
  ADMISSION_REQUESTED = 'ADMISSION_REQUESTED',
  ADMITTED = 'ADMITTED',
  IN_SURGERY = 'IN_SURGERY',
  POST_OP = 'POST_OP',
  OBSERVATION = 'OBSERVATION',
  DISCHARGE_INITIATED = 'DISCHARGE_INITIATED',
  DISCHARGED = 'DISCHARGED',
}

export interface InpatientAdmission {
  id: string;
  admissionNo: string;
  patientId: string;
  patientName: string;
  uhid: string;
  age: number;
  gender: string;
  wardName: string;
  roomNo: string;
  bedNo: string;
  admittingDoctor: string;
  admissionDate: string;
  plannedDischargeDate?: string;
  actualDischargeDate?: string;
  diagnosis: string;
  advanceDeposit: number;
  status: InpatientStatus;
  dietPlan?: string;
  isolationRequired?: boolean;
}

export interface MedicationAdminRecord {
  id: string;
  admissionId: string;
  medicineName: string;
  dosage: string;
  route: string;
  scheduledTime: string;
  administeredBy?: string;
  administeredAt?: string;
  status: 'PENDING' | 'ADMINISTERED' | 'HELD' | 'REFUSED';
  nurseRemarks?: string;
}

export interface NurseVitalsRecord {
  id: string;
  admissionId: string;
  recordedAt: string;
  recordedBy: string;
  systolicBp: number;
  diastolicBp: number;
  pulseRate: number;
  temperature: number;
  spo2: number;
  respiratoryRate: number;
  intakeOutputMl?: string;
  notes?: string;
}

