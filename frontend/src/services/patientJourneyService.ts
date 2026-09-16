// Shared Patient Journey Store for cross-department persistence
import { Gender, RoleType, AppointmentStatus } from '../types';

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
  status: string;
  allergies?: string[];
  chronicConditions?: string[];
  vitals?: {
    bp: string;
    pulse: number;
    temp: number;
    spo2: number;
    height: number;
    weight: number;
    bmi: number;
    triageNotes?: string;
  };
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
    return token;
  },

  updateQueueStatus(tokenNo: number, status: string): void {
    const list = this.getQueue();
    const updated = list.map((q) => (q.token === tokenNo ? { ...q, status } : q));
    localStorage.setItem('nh_queue', JSON.stringify(updated));
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

  resetDemo(): void {
    localStorage.setItem('nh_patients', JSON.stringify(DEFAULT_PATIENTS));
    localStorage.setItem('nh_queue', JSON.stringify(DEFAULT_QUEUE));
    localStorage.setItem('nh_lab_orders', JSON.stringify(DEFAULT_LAB_ORDERS));
    localStorage.setItem('nh_invoices', JSON.stringify(DEFAULT_INVOICES));
  },
};
