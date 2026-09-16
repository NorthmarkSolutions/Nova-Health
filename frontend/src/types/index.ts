export enum RoleType {
  SUPER_ADMIN = 'SUPER_ADMIN',
  HOSPITAL_ADMIN = 'HOSPITAL_ADMIN',
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

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleType;
  phoneNumber?: string;
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

