// Lab Department Data Store & Real-time State Service
// Implements 8-step specimen pipeline, analyzer telemetry, parameter reference ranges, and domain events.

export type SpecimenStep =
  | 'ORDERED'
  | 'COLLECTED'
  | 'RECEIVED'
  | 'ACCESSIONED'
  | 'PROCESSING'
  | 'RESULT_ENTERED'
  | 'PENDING_REVIEW'
  | 'SIGNED_OFF';

export interface TestParameterResult {
  group: string;
  name: string;
  unit: string;
  low: number;
  high: number;
  criticalLow?: number;
  criticalHigh?: number;
  observedValue: number | null;
  previousValue?: number | null;
}

export interface LabQueueOrder {
  id: string;
  orderNumber: string; // e.g. "LAB-0142" or "LAB-2609-0142"
  specimenNumber: string; // e.g. "SPM-88213"
  patientName: string;
  age: number;
  gender: string;
  uhid: string; // e.g. "UHID-202609-00031"
  testName: string;
  testCode: string;
  category: string; // "Hematology" | "Biochemistry" | "Immunoassay"
  doctorName: string;
  location: string; // "OPD Room 101" | "IPD Ward 4B, Bed 12" | "ICU Bed 3"
  sampleType: string; // "EDTA whole blood" | "Serum · SST"
  priority: 'STAT' | 'Urgent' | 'Routine';
  stage: SpecimenStep;
  assignedTechnician?: string;
  analyzerId?: string;
  analyzerName?: string;
  isBlockedByDowntime?: boolean;
  blockedReason?: string;
  returnedForRetest?: boolean;
  retestReason?: string;
  returnedBy?: string;
  orderedAt: string;
  collectedAt?: string;
  receivedAt?: string;
  accessionedAt?: string;
  processingAt?: string;
  enteredAt?: string;
  signedOffAt?: string;
  signedOffBy?: string;
  isCritical?: boolean;
  criticalAcknowledgedAt?: string;
  criticalAcknowledgedBy?: string;
  technicianNote?: string;
  pathologistInterpretation?: string;
  relevantHistory?: string[];
  parameters: TestParameterResult[];
}

export interface AnalyzerItem {
  id: string;
  name: string;
  section: string;
  serial: string;
  status: 'Running' | 'Ready' | 'Maintenance' | 'Offline';
  queuedCount: number;
  lastQc: string;
  isQcDue?: boolean;
  reagentPercent: number;
  testsCovered: string;
  alertTitle?: string;
  alertBody?: string;
  serviceTicket?: string;
  engineerEta?: string;
}

export interface LabActivityItem {
  id: string;
  time: string;
  title: string;
  by: string;
  dotColor: string;
}

export interface AuditTrailItem {
  id: string;
  time: string;
  title: string;
  by: string;
  dot: string;
}

export interface SignedReportItem {
  id: string;
  reportNumber: string; // e.g. "RPT-2609-0418"
  orderNumber: string;
  patientName: string;
  age: number;
  gender: string;
  uhid: string;
  testName: string;
  testCode: string;
  section: string;
  doctorName: string;
  location: string;
  signedAt: string;
  flag: 'Critical' | 'Abnormal' | 'Normal';
  deliveryStatus: 'acknowledged' | 'pending' | 'sent';
  deliveryText: string;
  isAmended?: boolean;
  amendmentReason?: string;
  keyFindings: string;
  interpretation: string;
  auditTrail: AuditTrailItem[];
}

export interface CatalogRangeItem {
  name: string;
  unit: string;
  low: number;
  high: number;
  criticalLow?: number;
  criticalHigh?: number;
  draftHigh?: number;
  isDraftChanged?: boolean;
}

export interface CatalogTestItem {
  code: string;
  name: string;
  section: string;
  sampleType: string;
  container: string;
  paramsCount: number;
  tatTarget: string;
  tatStat: string;
  status: 'Active' | 'Draft' | 'Inactive';
  version: number;
  lastPublished: string;
  ranges: Record<'adultMale' | 'adultFemale' | 'child', CatalogRangeItem[]>;
  recentQc: { level: string; meta: string; time: string; result: string; pass: boolean }[];
}

const STORAGE_KEY_ORDERS = 'nh_lab_orders_v2';
const STORAGE_KEY_ANALYZERS = 'nh_lab_analyzers_v2';
const STORAGE_KEY_ACTIVITY = 'nh_lab_activity_v2';
const STORAGE_KEY_REPORTS = 'nh_lab_signed_reports_v2';
const STORAGE_KEY_CATALOG = 'nh_lab_catalog_v2';

const INITIAL_CBC_PARAMS: TestParameterResult[] = [
  { group: 'RED CELLS', name: 'Hemoglobin', unit: 'g/dL', low: 13, high: 17, criticalLow: 7.0, criticalHigh: 20.0, observedValue: 11.2, previousValue: 13.4 },
  { group: 'RED CELLS', name: 'RBC count', unit: '×10⁶/µL', low: 4.5, high: 5.9, observedValue: 4.3, previousValue: 4.8 },
  { group: 'RED CELLS', name: 'Hematocrit', unit: '%', low: 40, high: 50, criticalLow: 20, criticalHigh: 60, observedValue: 36.1, previousValue: 41.0 },
  { group: 'RED CELLS', name: 'MCV', unit: 'fL', low: 80, high: 100, observedValue: 84.0, previousValue: 85.0 },
  { group: 'WHITE CELLS', name: 'WBC count', unit: '×10³/µL', low: 4, high: 11, criticalLow: 2.0, criticalHigh: 30.0, observedValue: 14.8, previousValue: 7.2 },
  { group: 'WHITE CELLS', name: 'Neutrophils', unit: '%', low: 40, high: 75, observedValue: 81, previousValue: 62 },
  { group: 'WHITE CELLS', name: 'Lymphocytes', unit: '%', low: 20, high: 45, observedValue: null, previousValue: 28 },
  { group: 'WHITE CELLS', name: 'Monocytes', unit: '%', low: 2, high: 10, observedValue: null, previousValue: 6 },
  { group: 'PLATELETS', name: 'Platelet count', unit: '×10³/µL', low: 150, high: 410, criticalLow: 50, criticalHigh: 1000, observedValue: 238, previousValue: 245 },
];

const INITIAL_RFT_PARAMS: TestParameterResult[] = [
  { group: 'RENAL PANEL', name: 'Potassium', unit: 'mmol/L', low: 3.5, high: 5.1, criticalLow: 2.8, criticalHigh: 6.5, observedValue: 6.8, previousValue: 5.4 },
  { group: 'RENAL PANEL', name: 'Creatinine', unit: 'mg/dL', low: 0.7, high: 1.3, criticalHigh: 4.0, observedValue: 2.4, previousValue: 2.1 },
  { group: 'RENAL PANEL', name: 'Urea', unit: 'mg/dL', low: 17, high: 43, observedValue: 68, previousValue: 52 },
  { group: 'RENAL PANEL', name: 'eGFR', unit: 'mL/min/1.73m²', low: 60, high: 120, criticalLow: 15, observedValue: 29, previousValue: 34 },
  { group: 'RENAL PANEL', name: 'Bicarbonate', unit: 'mmol/L', low: 22, high: 29, observedValue: 18, previousValue: 21 },
  { group: 'RENAL PANEL', name: 'Uric acid', unit: 'mg/dL', low: 3.5, high: 7.2, observedValue: 7.9, previousValue: 7.4 },
  { group: 'ELECTROLYTES', name: 'Sodium', unit: 'mmol/L', low: 135, high: 145, criticalLow: 120, criticalHigh: 160, observedValue: 136, previousValue: 138 },
  { group: 'ELECTROLYTES', name: 'Chloride', unit: 'mmol/L', low: 98, high: 107, observedValue: 101, previousValue: 102 },
];

const INITIAL_ORDERS: LabQueueOrder[] = [
  {
    id: 'ord-0139',
    orderNumber: 'LAB-0139',
    specimenNumber: 'SPM-88209',
    patientName: 'Rohan Mehta',
    age: 61,
    gender: 'M',
    uhid: 'UHID-202609-00019',
    testName: 'Renal function panel',
    testCode: 'BIO-RFT-01',
    category: 'Biochemistry',
    doctorName: 'Dr. Alisha Patel',
    location: 'IPD Ward 4B, Bed 12',
    sampleType: 'Serum · SST',
    priority: 'Urgent',
    stage: 'PENDING_REVIEW',
    assignedTechnician: 'Anjali Verma',
    analyzerName: 'Beckman AU680',
    orderedAt: '09:18',
    collectedAt: '09:34',
    processingAt: '10:15',
    enteredAt: '10:42',
    isCritical: true,
    technicianNote: 'Non-haemolysed serum. K+ re-run on second cuvette, confirms 6.8.',
    pathologistInterpretation: 'Severe hyperkalaemia with worsening renal indices vs 12 Sep, consistent with CKD progression; ACE inhibitor contribution likely. Haemolysis excluded.',
    relevantHistory: ['CKD stage 3b', 'Hypertension', 'On Ramipril 5 mg'],
    parameters: INITIAL_RFT_PARAMS,
  },
  {
    id: 'ord-0143',
    orderNumber: 'LAB-0143',
    specimenNumber: 'SPM-88214',
    patientName: 'Meera Iyer',
    age: 70,
    gender: 'F',
    uhid: 'UHID-202609-00042',
    testName: 'Serum electrolytes',
    testCode: 'BIO-ELE-01',
    category: 'Biochemistry',
    doctorName: 'Dr. R. Kulkarni',
    location: 'ICU Bed 3',
    sampleType: 'Serum · SST',
    priority: 'STAT',
    stage: 'PENDING_REVIEW',
    assignedTechnician: 'Vikram Rao',
    analyzerName: 'Beckman AU680',
    orderedAt: '09:45',
    collectedAt: '10:00',
    enteredAt: '10:31',
    isCritical: true,
    technicianNote: 'Na+ 118 mmol/L critical low. Re-run confirms.',
    pathologistInterpretation: 'Severe hyponatraemia. Urgent hypertonic saline protocol required.',
    relevantHistory: ['SIADH suspect', 'ICU admission post-op'],
    parameters: [
      { group: 'ELECTROLYTES', name: 'Sodium', unit: 'mmol/L', low: 135, high: 145, criticalLow: 120, criticalHigh: 160, observedValue: 118, previousValue: 132 },
      { group: 'ELECTROLYTES', name: 'Potassium', unit: 'mmol/L', low: 3.5, high: 5.1, criticalLow: 2.8, criticalHigh: 6.5, observedValue: 4.1, previousValue: 4.0 },
      { group: 'ELECTROLYTES', name: 'Chloride', unit: 'mmol/L', low: 98, high: 107, observedValue: 88, previousValue: 99 },
    ],
  },
  {
    id: 'ord-0142',
    orderNumber: 'LAB-0142',
    specimenNumber: 'SPM-88213',
    patientName: 'Aarav Sharma',
    age: 34,
    gender: 'M',
    uhid: 'UHID-202609-00031',
    testName: 'Complete blood count',
    testCode: 'HEM-CBC-01',
    category: 'Hematology',
    doctorName: 'Dr. Sarah Jenkins',
    location: 'OPD Room 101',
    sampleType: 'EDTA whole blood',
    priority: 'STAT',
    stage: 'PROCESSING',
    assignedTechnician: 'Anjali Verma',
    analyzerId: 'an-xn1000',
    analyzerName: 'Sysmex XN-1000',
    orderedAt: '09:31',
    collectedAt: '09:52',
    receivedAt: '09:58',
    accessionedAt: '10:01',
    processingAt: '10:06',
    enteredAt: '10:20',
    technicianNote: 'Run on Sysmex XN-1000. No clots, sample adequate. Smear to follow for differential.',
    relevantHistory: ['Viral prodrome', 'High fever x 3 days'],
    parameters: INITIAL_CBC_PARAMS,
  },
  {
    id: 'ord-0136',
    orderNumber: 'LAB-0136',
    specimenNumber: 'SPM-88206',
    patientName: 'Kavya Reddy',
    age: 45,
    gender: 'F',
    uhid: 'UHID-202609-00067',
    testName: 'Liver function test',
    testCode: 'BIO-LFT-01',
    category: 'Biochemistry',
    doctorName: 'Dr. Michael Chang',
    location: 'OPD Room 104',
    sampleType: 'Serum · SST',
    priority: 'Urgent',
    stage: 'PENDING_REVIEW',
    assignedTechnician: 'Vikram Rao',
    analyzerName: 'Beckman AU680',
    orderedAt: '09:05',
    enteredAt: '10:05',
    parameters: [
      { group: 'LIVER', name: 'ALT (SGPT)', unit: 'U/L', low: 7, high: 56, criticalHigh: 500, observedValue: 142, previousValue: 38 },
      { group: 'LIVER', name: 'AST (SGOT)', unit: 'U/L', low: 10, high: 40, criticalHigh: 500, observedValue: 98, previousValue: 28 },
      { group: 'LIVER', name: 'Total Bilirubin', unit: 'mg/dL', low: 0.2, high: 1.2, observedValue: 1.6, previousValue: 0.8 },
    ],
  },
  {
    id: 'ord-0138',
    orderNumber: 'LAB-0138',
    specimenNumber: 'SPM-88208',
    patientName: 'Salman Khan',
    age: 32,
    gender: 'M',
    uhid: 'UHID-202609-00055',
    testName: 'HbA1c',
    testCode: 'BIO-A1C-01',
    category: 'Biochemistry',
    doctorName: 'Dr. Sarah Jenkins',
    location: 'OPD Room 101',
    sampleType: 'Whole Blood · EDTA',
    priority: 'Routine',
    stage: 'PENDING_REVIEW',
    assignedTechnician: 'Vikram Rao',
    analyzerName: 'Bio-Rad D-10',
    returnedForRetest: true,
    retestReason: 'Lipemic interference noted in prior sample',
    returnedBy: 'Dr. Kavitha Menon',
    orderedAt: '08:45',
    enteredAt: '09:30',
    parameters: [
      { group: 'GLYCEMIC', name: 'HbA1c', unit: '%', low: 4.0, high: 5.6, criticalHigh: 10.0, observedValue: 7.9, previousValue: 8.2 },
    ],
  },
  {
    id: 'ord-0141',
    orderNumber: 'LAB-0141',
    specimenNumber: 'SPM-88211',
    patientName: 'Priya Nair',
    age: 28,
    gender: 'F',
    uhid: 'UHID-202609-00089',
    testName: 'Lipid profile',
    testCode: 'BIO-LIP-01',
    category: 'Biochemistry',
    doctorName: 'Dr. Alisha Patel',
    location: 'OPD Room 102',
    sampleType: 'Serum (Fasting 12h)',
    priority: 'Routine',
    stage: 'PENDING_REVIEW',
    assignedTechnician: 'Anjali Verma',
    analyzerName: 'Beckman AU680',
    orderedAt: '08:50',
    enteredAt: '09:48',
    parameters: [
      { group: 'LIPIDS', name: 'Total Cholesterol', unit: 'mg/dL', low: 125, high: 200, observedValue: 172, previousValue: 180 },
      { group: 'LIPIDS', name: 'HDL Cholesterol', unit: 'mg/dL', low: 40, high: 60, observedValue: 52, previousValue: 50 },
      { group: 'LIPIDS', name: 'LDL Cholesterol', unit: 'mg/dL', low: 50, high: 100, observedValue: 94, previousValue: 102 },
      { group: 'LIPIDS', name: 'Triglycerides', unit: 'mg/dL', low: 50, high: 150, observedValue: 110, previousValue: 125 },
    ],
  },
  {
    id: 'ord-0135',
    orderNumber: 'LAB-0135',
    specimenNumber: 'SPM-88205',
    patientName: 'Rahul C',
    age: 32,
    gender: 'M',
    uhid: 'UHID-202609-00078',
    testName: 'Thyroid profile',
    testCode: 'IMM-THY-01',
    category: 'Immunoassay',
    doctorName: 'Dr. Michael Chang',
    location: 'OPD Room 104',
    sampleType: 'Serum · SST',
    priority: 'Routine',
    stage: 'PENDING_REVIEW',
    assignedTechnician: 'Anjali Verma',
    analyzerName: 'Roche Cobas e411',
    orderedAt: '08:30',
    enteredAt: '09:12',
    parameters: [
      { group: 'THYROID', name: 'TSH', unit: 'µIU/mL', low: 0.4, high: 4.5, observedValue: 2.1, previousValue: 2.4 },
      { group: 'THYROID', name: 'Free T3', unit: 'pg/mL', low: 2.0, high: 4.4, observedValue: 3.2, previousValue: 3.1 },
      { group: 'THYROID', name: 'Free T4', unit: 'ng/dL', low: 0.8, high: 1.8, observedValue: 1.2, previousValue: 1.3 },
    ],
  },
];

const INITIAL_ANALYZERS: AnalyzerItem[] = [
  {
    id: 'an-d10',
    name: 'Bio-Rad D-10',
    section: 'HbA1c',
    serial: 'BR-D10-0417',
    status: 'Offline',
    queuedCount: 3,
    lastQc: '06:55 ✓',
    reagentPercent: 64,
    testsCovered: 'HbA1c',
    alertTitle: 'Pump pressure fault · E-214',
    alertBody: 'Reported 10:38 by you · Ticket SR-3391 · Engineer ETA 13:30',
    serviceTicket: 'SR-3391',
    engineerEta: '13:30',
  },
  {
    id: 'an-abl800',
    name: 'Radiometer ABL800',
    section: 'Blood gas',
    serial: 'RM-ABL-2210',
    status: 'Maintenance',
    queuedCount: 0,
    lastQc: 'After service',
    reagentPercent: 55,
    testsCovered: 'ABG, lactate',
    alertTitle: 'Scheduled calibration',
    alertBody: '09:00 – 11:30 · STAT ABGs go to ICU point-of-care unit',
  },
  {
    id: 'an-ca600',
    name: 'Sysmex CA-600',
    section: 'Coagulation',
    serial: 'SX-CA6-0932',
    status: 'Running',
    queuedCount: 4,
    lastQc: 'Due now',
    isQcDue: true,
    reagentPercent: 47,
    testsCovered: 'PT/INR, aPTT',
  },
  {
    id: 'an-xn1000',
    name: 'Sysmex XN-1000',
    section: 'Hematology',
    serial: 'SX-XN1-1188',
    status: 'Running',
    queuedCount: 6,
    lastQc: '07:40 ✓',
    reagentPercent: 72,
    testsCovered: 'CBC, retic, diff',
  },
  {
    id: 'an-au680',
    name: 'Beckman AU680',
    section: 'Chemistry',
    serial: 'BC-AU6-3021',
    status: 'Running',
    queuedCount: 9,
    lastQc: '07:15 ✓',
    reagentPercent: 41,
    testsCovered: 'RFT, LFT, lipid, electrolytes',
  },
  {
    id: 'an-chem7',
    name: 'Erba Chem-7',
    section: 'Chemistry (backup)',
    serial: 'ER-CH7-0552',
    status: 'Running',
    queuedCount: 2,
    lastQc: '07:20 ✓',
    reagentPercent: 16,
    testsCovered: 'Glucose, urea, creatinine',
  },
  {
    id: 'an-e411',
    name: 'Roche Cobas e411',
    section: 'Immunoassay',
    serial: 'RC-E41-7730',
    status: 'Ready',
    queuedCount: 0,
    lastQc: 'Due 11:00',
    isQcDue: true,
    reagentPercent: 88,
    testsCovered: 'Thyroid, troponin, ferritin',
  },
];

const INITIAL_ACTIVITY: LabActivityItem[] = [
  { id: 'act-1', time: '10:40', title: 'Service ticket SR-3391 raised for D-10', by: 'Lab Admin · Rajesh Kumar', dotColor: '#2563EB' },
  { id: 'act-2', time: '10:38', title: 'Fault reported: D-10 pump pressure E-214', by: 'You', dotColor: '#DC2626' },
  { id: 'act-3', time: '09:52', title: 'Erba Chem-7 reagent below 20%', by: 'Instrument alert', dotColor: '#F59E0B' },
  { id: 'act-4', time: '09:00', title: 'ABL800 calibration started', by: 'Biomedical engineering', dotColor: '#F59E0B' },
  { id: 'act-5', time: '07:40', title: 'XN-1000 QC passed · levels 1–3', by: 'You', dotColor: '#16A34A' },
  { id: 'act-6', time: '07:15', title: 'AU680 QC passed · Westgard rules OK', by: 'Vikram Rao', dotColor: '#16A34A' },
];

const INITIAL_SIGNED_REPORTS: SignedReportItem[] = [
  {
    id: 'rpt-1',
    reportNumber: 'RPT-2609-0418',
    orderNumber: 'LAB-0139',
    patientName: 'Rohan Mehta',
    age: 61,
    gender: 'M',
    uhid: 'UHID-202609-00019',
    testName: 'Renal function panel',
    testCode: 'BIO-RFT-01',
    section: 'Biochemistry',
    doctorName: 'Dr. Alisha Patel',
    location: 'IPD · Ward 4B, Bed 12',
    signedAt: 'Today 10:51',
    flag: 'Critical',
    deliveryStatus: 'acknowledged',
    deliveryText: 'Acknowledged 10:56 · Dr. Patel',
    keyFindings: 'K+ 6.8 mmol/L (critical) · Creatinine 2.4 · eGFR 29',
    interpretation: 'Severe hyperkalaemia with worsening renal indices vs 12 Sep, consistent with CKD progression; ACE inhibitor contribution likely. Haemolysis excluded.',
    auditTrail: [
      { id: 'a1', time: '09:18', title: 'Ordered', by: 'Dr. Alisha Patel · IPD Ward 4B', dot: '#9CA3AF' },
      { id: 'a2', time: '09:34', title: 'Sample collected · SPM-88190', by: 'Ward nurse Rekha S.', dot: '#9CA3AF' },
      { id: 'a3', time: '10:42', title: 'Result entered', by: 'Anjali Verma · Beckman AU680', dot: '#9CA3AF' },
      { id: 'a4', time: '10:49', title: 'Flagged critical · K+ 6.8', by: 'Dr. Kavitha Menon', dot: '#DC2626' },
      { id: 'a5', time: '10:51', title: 'Approved & signed off', by: 'Dr. Kavitha Menon · digital signature', dot: '#2563EB' },
      { id: 'a6', time: '10:56', title: 'Critical acknowledged', by: 'Dr. Alisha Patel', dot: '#16A34A' },
      { id: 'a7', time: '10:56', title: 'Billing line item · Rs. 650', by: 'Auto · IPD invoice', dot: '#9CA3AF' },
      { id: 'a8', time: '11:02', title: 'Report printed', by: 'Ward 4B station', dot: '#9CA3AF' },
    ],
  },
  {
    id: 'rpt-2',
    reportNumber: 'RPT-2609-0417',
    orderNumber: 'LAB-0143',
    patientName: 'Meera Iyer',
    age: 70,
    gender: 'F',
    uhid: 'UHID-202609-00042',
    testName: 'Serum electrolytes',
    testCode: 'BIO-ELE-01',
    section: 'Biochemistry',
    doctorName: 'Dr. R. Kulkarni',
    location: 'ICU Bed 3',
    signedAt: 'Today 10:39',
    flag: 'Critical',
    deliveryStatus: 'pending',
    deliveryText: 'Awaiting acknowledgment · 12m',
    keyFindings: 'Na+ 118 mmol/L (critical low)',
    interpretation: 'Severe hyponatraemia. Urgent hypertonic saline protocol indicated.',
    auditTrail: [
      { id: 'a1', time: '09:45', title: 'Ordered', by: 'Dr. R. Kulkarni', dot: '#9CA3AF' },
      { id: 'a2', time: '10:00', title: 'Sample collected', by: 'ICU nurse Clara Adams', dot: '#9CA3AF' },
      { id: 'a3', time: '10:31', title: 'Result entered', by: 'Vikram Rao', dot: '#9CA3AF' },
      { id: 'a4', time: '10:39', title: 'Signed off & critical alert sent', by: 'Dr. Kavitha Menon', dot: '#DC2626' },
    ],
  },
  {
    id: 'rpt-3',
    reportNumber: 'RPT-2609-0415',
    orderNumber: 'LAB-0140',
    patientName: 'Aarav Sharma',
    age: 34,
    gender: 'M',
    uhid: 'UHID-202609-00031',
    testName: 'Complete blood count',
    testCode: 'HEM-CBC-01',
    section: 'Hematology',
    doctorName: 'Dr. Sarah Jenkins',
    location: 'OPD Room 101',
    signedAt: 'Today 10:28',
    flag: 'Abnormal',
    deliveryStatus: 'sent',
    deliveryText: 'Sent to Dr. Jenkins',
    keyFindings: 'Leukocytosis (WBC 14.8) with neutrophilia (81%) and mild anaemia (Hb 11.2)',
    interpretation: 'Bacterial infection or acute inflammatory response suspected. Correlate clinically.',
    auditTrail: [
      { id: 'a1', time: '09:15', title: 'Ordered', by: 'Dr. Sarah Jenkins', dot: '#9CA3AF' },
      { id: 'a2', time: '09:40', title: 'Sample collected', by: 'Nurse Priya', dot: '#9CA3AF' },
      { id: 'a3', time: '10:15', title: 'Result entered', by: 'Anjali Verma', dot: '#9CA3AF' },
      { id: 'a4', time: '10:28', title: 'Signed off', by: 'Dr. Kavitha Menon', dot: '#2563EB' },
    ],
  },
  {
    id: 'rpt-4',
    reportNumber: 'RPT-2609-0412',
    orderNumber: 'LAB-0136',
    patientName: 'Kavya Reddy',
    age: 45,
    gender: 'F',
    uhid: 'UHID-202609-00067',
    testName: 'Liver function test',
    testCode: 'BIO-LFT-01',
    section: 'Biochemistry',
    doctorName: 'Dr. Michael Chang',
    location: 'OPD Room 104',
    signedAt: 'Today 10:14',
    flag: 'Abnormal',
    deliveryStatus: 'sent',
    deliveryText: 'Sent to Dr. Chang',
    keyFindings: 'Elevated transaminases (ALT 142 U/L, AST 98 U/L)',
    interpretation: 'Hepatocellular pattern of injury. Recommend viral hepatitis serology and abdominal ultrasound.',
    auditTrail: [
      { id: 'a1', time: '08:50', title: 'Ordered', by: 'Dr. Michael Chang', dot: '#9CA3AF' },
      { id: 'a2', time: '10:14', title: 'Signed off', by: 'Dr. Kavitha Menon', dot: '#2563EB' },
    ],
  },
  {
    id: 'rpt-5',
    reportNumber: 'RPT-2609-0409',
    orderNumber: 'LAB-0141',
    patientName: 'Priya Nair',
    age: 28,
    gender: 'F',
    uhid: 'UHID-202609-00089',
    testName: 'Lipid profile',
    testCode: 'BIO-LIP-01',
    section: 'Biochemistry',
    doctorName: 'Dr. Alisha Patel',
    location: 'OPD Room 102',
    signedAt: 'Today 09:55',
    flag: 'Normal',
    deliveryStatus: 'sent',
    deliveryText: 'Sent to Dr. Patel',
    keyFindings: 'All lipid parameters within optimal reference intervals.',
    interpretation: 'Normal fasting lipid profile.',
    auditTrail: [
      { id: 'a1', time: '08:30', title: 'Ordered', by: 'Dr. Alisha Patel', dot: '#9CA3AF' },
      { id: 'a2', time: '09:55', title: 'Signed off', by: 'Dr. Kavitha Menon', dot: '#2563EB' },
    ],
  },
  {
    id: 'rpt-6',
    reportNumber: 'RPT-2609-0386',
    orderNumber: 'LAB-0128',
    patientName: 'Ananya Gupta',
    age: 41,
    gender: 'F',
    uhid: 'UHID-202609-00095',
    testName: 'Thyroid profile',
    testCode: 'IMM-THY-01',
    section: 'Immunoassay',
    doctorName: 'Dr. Michael Chang',
    location: 'OPD Room 104',
    signedAt: 'Yesterday 16:02',
    flag: 'Abnormal',
    deliveryStatus: 'sent',
    deliveryText: 'Sent to Dr. Chang',
    isAmended: true,
    amendmentReason: 'Corrected calibration factor on TSH',
    keyFindings: 'TSH 6.8 µIU/mL (high), Free T4 normal',
    interpretation: 'Subclinical hypothyroidism. Follow-up TSH in 8–12 weeks.',
    auditTrail: [
      { id: 'a1', time: '14:20', title: 'Ordered', by: 'Dr. Michael Chang', dot: '#9CA3AF' },
      { id: 'a2', time: '16:02', title: 'Signed off (v1)', by: 'Dr. Kavitha Menon', dot: '#2563EB' },
      { id: 'a3', time: '17:15', title: 'Amended to v2', by: 'Dr. Kavitha Menon', dot: '#F59E0B' },
    ],
  },
  {
    id: 'rpt-7',
    reportNumber: 'RPT-2609-0371',
    orderNumber: 'LAB-0122',
    patientName: 'Vivek Menon',
    age: 58,
    gender: 'M',
    uhid: 'UHID-202609-00104',
    testName: 'Troponin I (hs)',
    testCode: 'IMM-TRP-01',
    section: 'Immunoassay',
    doctorName: 'Dr. Neil Patrick',
    location: 'Emergency · Red Bay 2',
    signedAt: 'Yesterday 14:47',
    flag: 'Critical',
    deliveryStatus: 'acknowledged',
    deliveryText: 'Acknowledged 14:50 · ER',
    keyFindings: 'Troponin I 820 ng/L (Critical High > 52 ng/L)',
    interpretation: 'High-sensitivity troponin highly positive. Consistent with acute myocardial infarction. Immediate cath lab activation advised.',
    auditTrail: [
      { id: 'a1', time: '14:10', title: 'STAT Order', by: 'ER Dr. Neil Patrick', dot: '#9CA3AF' },
      { id: 'a2', time: '14:47', title: 'Flagged Critical & Signed off', by: 'Dr. Kavitha Menon', dot: '#DC2626' },
      { id: 'a3', time: '14:50', title: 'Acknowledged', by: 'ER Attending Dr. Patrick', dot: '#16A34A' },
    ],
  },
  {
    id: 'rpt-8',
    reportNumber: 'RPT-2609-0360',
    orderNumber: 'LAB-0118',
    patientName: 'Rahul C',
    age: 32,
    gender: 'M',
    uhid: 'UHID-202609-00078',
    testName: 'Thyroid profile',
    testCode: 'IMM-THY-01',
    section: 'Immunoassay',
    doctorName: 'Dr. Michael Chang',
    location: 'OPD Room 104',
    signedAt: 'Yesterday 12:30',
    flag: 'Normal',
    deliveryStatus: 'sent',
    deliveryText: 'Sent to Dr. Chang',
    keyFindings: 'Euthyroid profile (TSH 2.1, FT3 3.2, FT4 1.2)',
    interpretation: 'Normal thyroid function test.',
    auditTrail: [
      { id: 'a1', time: '11:10', title: 'Ordered', by: 'Dr. Michael Chang', dot: '#9CA3AF' },
      { id: 'a2', time: '12:30', title: 'Signed off', by: 'Dr. Kavitha Menon', dot: '#2563EB' },
    ],
  },
];

const INITIAL_CATALOG: CatalogTestItem[] = [
  {
    code: 'HEM-CBC-01',
    name: 'Complete blood count',
    section: 'Hematology',
    sampleType: 'EDTA whole blood',
    container: 'Lavender top vacutainer',
    paramsCount: 14,
    tatTarget: '2 h',
    tatStat: '45 m',
    status: 'Active',
    version: 3,
    lastPublished: '12 Mar 2026',
    ranges: {
      adultMale: [
        { name: 'Hemoglobin', unit: 'g/dL', low: 13, high: 17, criticalLow: 7.0, criticalHigh: 20.0 },
        { name: 'RBC count', unit: '×10⁶/µL', low: 4.5, high: 5.9 },
        { name: 'Hematocrit', unit: '%', low: 40, high: 50, criticalLow: 20, criticalHigh: 60 },
        { name: 'WBC count', unit: '×10³/µL', low: 4, high: 11, criticalLow: 2.0, criticalHigh: 30.0 },
        { name: 'Platelets', unit: '×10³/µL', low: 150, high: 410, criticalLow: 50, criticalHigh: 1000 },
      ],
      adultFemale: [
        { name: 'Hemoglobin', unit: 'g/dL', low: 12, high: 15.5, criticalLow: 7.0, criticalHigh: 20.0 },
        { name: 'RBC count', unit: '×10⁶/µL', low: 4.0, high: 5.2 },
        { name: 'Hematocrit', unit: '%', low: 36, high: 46, criticalLow: 20, criticalHigh: 60 },
        { name: 'WBC count', unit: '×10³/µL', low: 4, high: 11, criticalLow: 2.0, criticalHigh: 30.0 },
        { name: 'Platelets', unit: '×10³/µL', low: 150, high: 410, criticalLow: 50, criticalHigh: 1000 },
      ],
      child: [
        { name: 'Hemoglobin', unit: 'g/dL', low: 11.5, high: 14.5, criticalLow: 7.0, criticalHigh: 18.0 },
        { name: 'WBC count', unit: '×10³/µL', low: 5, high: 15, criticalLow: 2.0, criticalHigh: 35.0 },
        { name: 'Platelets', unit: '×10³/µL', low: 150, high: 450 },
      ],
    },
    recentQc: [
      { level: 'Level 1 (Low)', meta: 'Sysmex XN-1000 · Lot 8821', time: '07:40 ✓', result: 'Pass', pass: true },
      { level: 'Level 2 (Normal)', meta: 'Sysmex XN-1000 · Lot 8822', time: '07:42 ✓', result: 'Pass', pass: true },
      { level: 'Level 3 (High)', meta: 'Sysmex XN-1000 · Lot 8823', time: '07:45 ✓', result: 'Pass', pass: true },
    ],
  },
  {
    code: 'BIO-RFT-01',
    name: 'Renal function panel',
    section: 'Biochemistry',
    sampleType: 'Serum',
    container: 'Gold top SST',
    paramsCount: 8,
    tatTarget: '4 h',
    tatStat: '1 h',
    status: 'Draft',
    version: 4,
    lastPublished: '02 Aug 2026',
    ranges: {
      adultMale: [
        { name: 'Potassium', unit: 'mmol/L', low: 3.5, high: 5.1, criticalLow: 2.8, criticalHigh: 6.5 },
        { name: 'Sodium', unit: 'mmol/L', low: 135, high: 145, criticalLow: 120, criticalHigh: 160 },
        { name: 'Creatinine', unit: 'mg/dL', low: 0.7, high: 1.2, criticalHigh: 5.0, draftHigh: 1.2, isDraftChanged: true },
        { name: 'Urea', unit: 'mg/dL', low: 17, high: 43, criticalHigh: 200 },
        { name: 'Bicarbonate', unit: 'mmol/L', low: 22, high: 29, criticalLow: 10, criticalHigh: 40 },
        { name: 'Chloride', unit: 'mmol/L', low: 98, high: 107, criticalLow: 80, criticalHigh: 120 },
        { name: 'Uric acid', unit: 'mg/dL', low: 3.5, high: 7.2 },
      ],
      adultFemale: [
        { name: 'Potassium', unit: 'mmol/L', low: 3.5, high: 5.1, criticalLow: 2.8, criticalHigh: 6.5 },
        { name: 'Sodium', unit: 'mmol/L', low: 135, high: 145, criticalLow: 120, criticalHigh: 160 },
        { name: 'Creatinine', unit: 'mg/dL', low: 0.5, high: 1.0, criticalHigh: 4.5 },
        { name: 'Urea', unit: 'mg/dL', low: 15, high: 40, criticalHigh: 200 },
      ],
      child: [
        { name: 'Potassium', unit: 'mmol/L', low: 3.6, high: 5.4, criticalLow: 3.0, criticalHigh: 6.5 },
        { name: 'Creatinine', unit: 'mg/dL', low: 0.3, high: 0.7 },
      ],
    },
    recentQc: [
      { level: 'Level 1 (Normal)', meta: 'AU680 · Lot AU-901 · K+ 4.0 (target 4.0)', time: '07:15 ✓', result: 'Pass', pass: true },
      { level: 'Level 2 (High)', meta: 'AU680 · Lot AU-902 · K+ 6.4 (target 6.5)', time: '07:18 ✓', result: 'Pass', pass: true },
      { level: 'Level 1 (Normal)', meta: 'AU680 · Lot AU-901 · Creatinine 1.2 (target 1.2)', time: '07:15 ✓', result: 'Pass', pass: true },
    ],
  },
  {
    code: 'BIO-LFT-01',
    name: 'Liver function test',
    section: 'Biochemistry',
    sampleType: 'Serum',
    container: 'Gold top SST',
    paramsCount: 9,
    tatTarget: '4 h',
    tatStat: '1 h',
    status: 'Draft',
    version: 3,
    lastPublished: '15 May 2026',
    ranges: {
      adultMale: [
        { name: 'ALT (SGPT)', unit: 'U/L', low: 7, high: 56, criticalHigh: 500 },
        { name: 'AST (SGOT)', unit: 'U/L', low: 10, high: 40, criticalHigh: 500 },
        { name: 'Total Bilirubin', unit: 'mg/dL', low: 0.2, high: 1.2, criticalHigh: 15.0 },
      ],
      adultFemale: [
        { name: 'ALT (SGPT)', unit: 'U/L', low: 7, high: 45, criticalHigh: 500 },
        { name: 'AST (SGOT)', unit: 'U/L', low: 9, high: 35, criticalHigh: 500 },
        { name: 'Total Bilirubin', unit: 'mg/dL', low: 0.2, high: 1.2, criticalHigh: 15.0 },
      ],
      child: [
        { name: 'ALT (SGPT)', unit: 'U/L', low: 5, high: 35 },
      ],
    },
    recentQc: [
      { level: 'Level 1 (Normal)', meta: 'AU680 · ALT/AST passed', time: '07:15 ✓', result: 'Pass', pass: true },
    ],
  },
  {
    code: 'BIO-A1C-01',
    name: 'HbA1c',
    section: 'Biochemistry',
    sampleType: 'EDTA whole blood',
    container: 'Lavender top vacutainer',
    paramsCount: 1,
    tatTarget: '6 h',
    tatStat: '2 h',
    status: 'Active',
    version: 2,
    lastPublished: '10 Feb 2026',
    ranges: {
      adultMale: [{ name: 'HbA1c', unit: '%', low: 4.0, high: 5.6, criticalHigh: 10.0 }],
      adultFemale: [{ name: 'HbA1c', unit: '%', low: 4.0, high: 5.6, criticalHigh: 10.0 }],
      child: [{ name: 'HbA1c', unit: '%', low: 4.0, high: 5.6 }],
    },
    recentQc: [
      { level: 'Bio-Rad D-10 Calibrator', meta: 'Lot BR-441 · 06:55 ✓', time: '06:55 ✓', result: 'Pass', pass: true },
    ],
  },
  {
    code: 'IMM-THY-01',
    name: 'Thyroid profile',
    section: 'Immunoassay',
    sampleType: 'Serum',
    container: 'Gold top SST',
    paramsCount: 3,
    tatTarget: '6 h',
    tatStat: '2 h',
    status: 'Draft',
    version: 3,
    lastPublished: '18 Jul 2026',
    ranges: {
      adultMale: [
        { name: 'TSH', unit: 'µIU/mL', low: 0.4, high: 4.5 },
        { name: 'Free T3', unit: 'pg/mL', low: 2.0, high: 4.4 },
        { name: 'Free T4', unit: 'ng/dL', low: 0.8, high: 1.8 },
      ],
      adultFemale: [
        { name: 'TSH', unit: 'µIU/mL', low: 0.4, high: 4.5 },
        { name: 'Free T3', unit: 'pg/mL', low: 2.0, high: 4.4 },
        { name: 'Free T4', unit: 'ng/dL', low: 0.8, high: 1.8 },
      ],
      child: [
        { name: 'TSH', unit: 'µIU/mL', low: 0.6, high: 5.5 },
      ],
    },
    recentQc: [
      { level: 'Cobas e411 Level 1', meta: 'Thyroid QC passed', time: 'Yesterday', result: 'Pass', pass: true },
    ],
  },
  {
    code: 'IMM-TRP-01',
    name: 'Troponin I (hs)',
    section: 'Immunoassay',
    sampleType: 'Li-heparin plasma',
    container: 'Green top tube',
    paramsCount: 1,
    tatTarget: '1 h',
    tatStat: '30 m',
    status: 'Active',
    version: 2,
    lastPublished: '15 Jun 2026',
    ranges: {
      adultMale: [{ name: 'Troponin I (hs)', unit: 'ng/L', low: 0, high: 52, criticalHigh: 100 }],
      adultFemale: [{ name: 'Troponin I (hs)', unit: 'ng/L', low: 0, high: 34, criticalHigh: 80 }],
      child: [{ name: 'Troponin I (hs)', unit: 'ng/L', low: 0, high: 20 }],
    },
    recentQc: [
      { level: 'STAT Cardiac Controls', meta: 'Cobas e411 · Level 2', time: 'Yesterday', result: 'Pass', pass: true },
    ],
  },
];

export class LabDataStore {
  // Orders
  static getOrders(): LabQueueOrder[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ORDERS);
      if (raw) return JSON.parse(raw);
    } catch {}
    this.saveOrders(INITIAL_ORDERS);
    return INITIAL_ORDERS;
  }

  static saveOrders(orders: LabQueueOrder[]) {
    try {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
      window.dispatchEvent(new Event('nh_lab_sync'));
      window.dispatchEvent(new Event('nh_data_sync'));
    } catch {}
  }

  static getOrderById(id: string): LabQueueOrder | undefined {
    return this.getOrders().find((o) => o.id === id || o.orderNumber === id);
  }

  static updateOrder(orderId: string, updates: Partial<LabQueueOrder>): LabQueueOrder | undefined {
    const orders = this.getOrders();
    const idx = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
    if (idx === -1) return undefined;

    const updated = { ...orders[idx], ...updates };
    orders[idx] = updated;
    this.saveOrders(orders);
    return updated;
  }

  // Analyzers
  static getAnalyzers(): AnalyzerItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ANALYZERS);
      if (raw) return JSON.parse(raw);
    } catch {}
    this.saveAnalyzers(INITIAL_ANALYZERS);
    return INITIAL_ANALYZERS;
  }

  static saveAnalyzers(analyzers: AnalyzerItem[]) {
    try {
      localStorage.setItem(STORAGE_KEY_ANALYZERS, JSON.stringify(analyzers));
      window.dispatchEvent(new Event('nh_lab_sync'));
    } catch {}
  }

  static updateAnalyzerStatus(analyzerId: string, status: AnalyzerItem['status']) {
    const analyzers = this.getAnalyzers();
    const idx = analyzers.findIndex((a) => a.id === analyzerId);
    if (idx === -1) return;

    analyzers[idx].status = status;
    this.saveAnalyzers(analyzers);

    const orders = this.getOrders();
    const isOffline = status === 'Offline';
    const updatedOrders = orders.map((o) => {
      if (o.analyzerId === analyzerId) {
        return {
          ...o,
          isBlockedByDowntime: isOffline,
          blockedReason: isOffline ? `${analyzers[idx].name} is offline` : undefined,
        };
      }
      return o;
    });
    this.saveOrders(updatedOrders);
  }

  // Activity Log
  static getActivity(): LabActivityItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACTIVITY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return INITIAL_ACTIVITY;
  }

  static addActivity(title: string, by: string, dotColor: string = '#2563EB') {
    const list = this.getActivity();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newItem: LabActivityItem = {
      id: `act-${Date.now()}`,
      time: timeStr,
      title,
      by,
      dotColor,
    };
    const updated = [newItem, ...list].slice(0, 15);
    localStorage.setItem(STORAGE_KEY_ACTIVITY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nh_lab_sync'));
  }

  // Signed Reports
  static getSignedReports(): SignedReportItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
      if (raw) return JSON.parse(raw);
    } catch {}
    this.saveSignedReports(INITIAL_SIGNED_REPORTS);
    return INITIAL_SIGNED_REPORTS;
  }

  static saveSignedReports(reports: SignedReportItem[]) {
    try {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
      window.dispatchEvent(new Event('nh_lab_sync'));
    } catch {}
  }

  // Pathologist Domain Actions
  static signOffOrder(orderId: string, interpretation: string, signedBy: string = 'Dr. Kavitha Menon'): SignedReportItem | undefined {
    const order = this.getOrderById(orderId);
    if (!order) return undefined;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const reportNo = `RPT-2609-${Math.floor(1000 + Math.random() * 9000)}`;

    const isCrit = order.isCritical || order.parameters.some((p) => {
      const v = p.observedValue;
      if (v === null) return false;
      return (p.criticalLow !== undefined && v < p.criticalLow) || (p.criticalHigh !== undefined && v > p.criticalHigh);
    });

    const isAbnormal = isCrit || order.parameters.some((p) => {
      const v = p.observedValue;
      if (v === null) return false;
      return v < p.low || v > p.high;
    });

    const flag: 'Critical' | 'Abnormal' | 'Normal' = isCrit ? 'Critical' : isAbnormal ? 'Abnormal' : 'Normal';

    // 1. Update Order in Queue
    this.updateOrder(orderId, {
      stage: 'SIGNED_OFF',
      signedOffAt: timeStr,
      signedOffBy: signedBy,
      pathologistInterpretation: interpretation,
    });

    // 2. Create Signed Report
    const keyFindings = order.parameters
      .filter((p) => p.observedValue !== null && (p.observedValue < p.low || p.observedValue > p.high))
      .map((p) => `${p.name} ${p.observedValue} ${p.unit}`)
      .join(' · ') || 'All parameters within reference range.';

    const newReport: SignedReportItem = {
      id: `rpt-${Date.now()}`,
      reportNumber: reportNo,
      orderNumber: order.orderNumber,
      patientName: order.patientName,
      age: order.age,
      gender: order.gender,
      uhid: order.uhid,
      testName: order.testName,
      testCode: order.testCode,
      section: order.category,
      doctorName: order.doctorName,
      location: order.location,
      signedAt: `Today ${timeStr}`,
      flag,
      deliveryStatus: isCrit ? 'pending' : 'sent',
      deliveryText: isCrit ? 'Awaiting acknowledgment' : `Sent to ${order.doctorName}`,
      keyFindings,
      interpretation,
      auditTrail: [
        { id: '1', time: order.orderedAt || '09:18', title: 'Ordered', by: `${order.doctorName} · ${order.location}`, dot: '#9CA3AF' },
        { id: '2', time: order.collectedAt || '09:40', title: `Sample collected · ${order.specimenNumber}`, by: 'Phlebotomy team', dot: '#9CA3AF' },
        { id: '3', time: order.enteredAt || timeStr, title: 'Result entered', by: `${order.assignedTechnician || 'Technician'} · ${order.analyzerName || 'Analyzer'}`, dot: '#9CA3AF' },
        { id: '4', time: timeStr, title: 'Approved & signed off', by: `${signedBy} · digital signature`, dot: '#2563EB' },
        { id: '5', time: timeStr, title: 'Billing line item', by: 'Auto · Hospital tariff master', dot: '#9CA3AF' },
      ],
    };

    const reports = this.getSignedReports();
    this.saveSignedReports([newReport, ...reports]);

    // 3. Fire cross-module domain event
    this.addActivity(`${order.testName} signed off for ${order.patientName} (${reportNo})`, signedBy, isCrit ? '#DC2626' : '#2563EB');
    window.dispatchEvent(new CustomEvent('nh_lab_signoff', { detail: newReport }));

    return newReport;
  }

  static requestRetest(orderId: string, reason: string, returnedBy: string = 'Dr. Kavitha Menon') {
    const order = this.getOrderById(orderId);
    if (!order) return;

    this.updateOrder(orderId, {
      stage: 'PROCESSING',
      returnedForRetest: true,
      retestReason: reason,
      returnedBy,
    });

    this.addActivity(`Re-test requested for ${order.patientName} (${order.testName}): ${reason}`, returnedBy, '#B45309');
  }

  static flagCritical(orderId: string, interpretation: string, flaggedBy: string = 'Dr. Kavitha Menon') {
    const order = this.getOrderById(orderId);
    if (!order) return;

    this.updateOrder(orderId, {
      isCritical: true,
      pathologistInterpretation: interpretation,
    });

    this.signOffOrder(orderId, interpretation, flaggedBy);
    this.addActivity(`URGENT CRITICAL ALERT: ${order.testName} for ${order.patientName} flagged critical`, flaggedBy, '#DC2626');
  }

  static issueAmendment(reportId: string, amendmentNote: string, by: string = 'Dr. Kavitha Menon'): SignedReportItem | undefined {
    const reports = this.getSignedReports();
    const idx = reports.findIndex((r) => r.id === reportId || r.reportNumber === reportId);
    if (idx === -1) return undefined;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const original = reports[idx];

    const updated: SignedReportItem = {
      ...original,
      isAmended: true,
      amendmentReason: amendmentNote,
      auditTrail: [
        ...original.auditTrail,
        {
          id: `a-${Date.now()}`,
          time: timeStr,
          title: `Amended · ${amendmentNote}`,
          by,
          dot: '#F59E0B',
        },
      ],
    };

    reports[idx] = updated;
    this.saveSignedReports(reports);
    this.addActivity(`Report ${original.reportNumber} amended: ${amendmentNote}`, by, '#F59E0B');
    return updated;
  }

  // Test Catalog
  static getCatalog(): CatalogTestItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CATALOG);
      if (raw) return JSON.parse(raw);
    } catch {}
    this.saveCatalog(INITIAL_CATALOG);
    return INITIAL_CATALOG;
  }

  static saveCatalog(catalog: CatalogTestItem[]) {
    try {
      localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(catalog));
      window.dispatchEvent(new Event('nh_lab_sync'));
    } catch {}
  }

  static publishRangeChanges(code: string) {
    const catalog = this.getCatalog();
    const idx = catalog.findIndex((t) => t.code === code);
    if (idx === -1) return;

    const test = catalog[idx];
    const now = new Date();
    const dateStr = `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;

    // Apply any draft changes to published
    const updatedRanges = { ...test.ranges };
    Object.keys(updatedRanges).forEach((key) => {
      const list = (updatedRanges as any)[key] as CatalogRangeItem[];
      (updatedRanges as any)[key] = list.map((r) => {
        if (r.draftHigh !== undefined) {
          return { ...r, high: r.draftHigh, draftHigh: undefined, isDraftChanged: false };
        }
        return r;
      });
    });

    catalog[idx] = {
      ...test,
      status: 'Active',
      version: test.version + 1,
      lastPublished: dateStr,
      ranges: updatedRanges,
    };

    this.saveCatalog(catalog);
    this.addActivity(`${test.name} clinical ranges published (v${test.version + 1})`, 'Dr. Kavitha Menon', '#2563EB');
  }
}

export default LabDataStore;
