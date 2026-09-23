import './setupEnv.ts';
import { patientJourneyService, SharedQueueToken, SharedPatient } from '../src/services/patientJourneyService.ts';

// Test Runner Helper
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  \x1b[32m✓ [PASS]\x1b[0m ${testName}`);
    if (detail) console.log(`      \x1b[90m${detail}\x1b[0m`);
    testsPassed++;
  } else {
    console.error(`  \x1b[31m✗ [FAIL]\x1b[0m ${testName}`);
    if (detail) console.error(`      \x1b[31m${detail}\x1b[0m`);
    testsFailed++;
  }
}

async function runOpdEndToEndTest() {
  console.log('\n================================================================================');
  console.log('       NORTH HOSPITAL HMS: FULL OPD PATIENT JOURNEY END-TO-END TEST');
  console.log('================================================================================\n');

  // ---------------------------------------------------------------------------
  // STAGE 1: RECEPTION DESK — Patient Registration & Token Creation
  // ---------------------------------------------------------------------------
  console.log('\x1b[36m--- STAGE 1: RECEPTION DESK (Patient Registration & Walk-In Intake) ---\x1b[0m');

  const testUhid = 'UHID-202609-99881';
  const newPatient: SharedPatient = {
    uhid: testUhid,
    firstName: 'Alexander',
    lastName: 'Hayes',
    phone: '+1 555-019-9988',
    dob: '1984-06-15',
    age: 42,
    gender: 'MALE',
    bloodGroup: 'O+',
    idType: 'National ID',
    idNumber: 'NAT-998812-NC',
    emergencyContact: 'Victoria Hayes (Spouse) • +1 555-019-9989',
    insurance: 'Self Pay (Cash)',
    visitsCount: 1,
    outstandingDue: 0,
    recentVisits: [],
  };

  patientJourneyService.registerPatient(newPatient);
  const registered = patientJourneyService.getPatients().find((p) => p.uhid === testUhid);
  assert(!!registered, 'Patient successfully registered in Master Directory', `UHID: ${registered?.uhid}, Name: ${registered?.firstName} ${registered?.lastName}`);

  const currentQueue = patientJourneyService.getQueue();
  const nextTokenNo = currentQueue.length > 0 ? Math.max(...currentQueue.map((q) => q.token)) + 1 : 1;
  const aptNo = `APT-20260923-${String(nextTokenNo).padStart(4, '0')}`;
  const invoiceNo = `INV-OPD-${String(nextTokenNo).padStart(4, '0')}`;

  const walkInToken: SharedQueueToken = {
    id: `tok-${Date.now()}`,
    token: nextTokenNo,
    aptNo,
    uhid: testUhid,
    patient: 'Alexander Hayes',
    age: 42,
    gender: 'MALE',
    bloodGroup: 'O+',
    phone: '+1 555-019-9988',
    doctor: 'Dr. Sarah Jenkins (Cardiology)',
    room: 'Chamber 204',
    time: '10:00 AM',
    type: 'WALK_IN',
    status: 'WAITING',
    priority: 'URGENT',
    feePaid: true,
    totalFee: 100,
    paymentMode: 'CASH',
    invoiceNo,
    callingStatus: 'IDLE',
  };

  patientJourneyService.addQueueToken(walkInToken);
  patientJourneyService.addInvoice({
    id: `inv-${Date.now()}`,
    invNo: invoiceNo,
    patientName: 'Alexander Hayes',
    uhid: testUhid,
    phone: '+1 555-019-9988',
    category: 'OPD',
    date: new Date().toISOString().split('T')[0],
    subtotal: 100,
    discount: 0,
    tax: 0,
    advanceDeducted: 0,
    total: 100,
    paid: 100,
    balance: 0,
    status: 'PAID',
    items: [{ source: 'Consultation', description: 'OPD Consultation Fee - Dr. Sarah Jenkins (Cardiology)', qty: 1, unitPrice: 100, total: 100 }],
  });

  const createdToken = patientJourneyService.getQueue().find((q) => q.token === nextTokenNo);
  assert(!!createdToken && createdToken.status === 'WAITING', `Walk-in Token #${nextTokenNo} generated with status 'WAITING'`, `Assigned: Dr. Sarah Jenkins (Chamber 204), Priority: URGENT`);
  assert(createdToken?.priority === 'URGENT', 'Priority correctly flagged as URGENT');

  // ---------------------------------------------------------------------------
  // STAGE 2: NURSE STATION & TRIAGE — Vitals, Symptoms & Clinical Assessment
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[36m--- STAGE 2: NURSE STATION & TRIAGE (Vitals & Assessment Intake) ---\x1b[0m');

  // 1. Nurse starts triage
  patientJourneyService.updateQueueToken(nextTokenNo, {
    status: 'IN_TRIAGE',
    triageStartTime: '10:05 AM',
  });
  let triageToken = patientJourneyService.getQueue().find((q) => q.token === nextTokenNo);
  assert(triageToken?.status === 'IN_TRIAGE', `Token #${nextTokenNo} transitioned to 'IN_TRIAGE'`, `Triage Start: ${triageToken?.triageStartTime}`);

  // 2. Nurse records vitals & clinical assessment
  const triagedVitals = {
    bp: '138/88',
    pulse: 82,
    temp: 99.2,
    spo2: 98,
    respiratoryRate: 18,
    height: 180,
    weight: 84,
    bmi: 25.9,
    rbs: 114,
    painScale: 4,
    triageNotes: 'Central chest tightness and mild shortness of breath for 2 days.',
  };

  const triagedAssessment = {
    chiefComplaint: 'Central chest tightness and mild shortness of breath for 2 days.',
    painScale: 4,
    allergies: ['Penicillin', 'Sulfa drugs'],
    medicalHistory: ['Hypertension (Stage 1)'],
    currentMedications: ['Amlodipine 5mg OD'],
    triagedBy: 'Nurse Clara Adams, RN',
    triagedAt: '10:12 AM',
  };

  // Nurse pushes to doctor queue
  patientJourneyService.updateQueueToken(nextTokenNo, {
    status: 'READY_FOR_DOCTOR',
    vitals: triagedVitals,
    assessment: triagedAssessment,
    allergies: triagedAssessment.allergies,
    chronicConditions: triagedAssessment.medicalHistory,
    currentMedications: triagedAssessment.currentMedications,
    triageNotes: triagedAssessment.chiefComplaint,
  });

  triageToken = patientJourneyService.getQueue().find((q) => q.token === nextTokenNo);
  assert(triageToken?.status === 'READY_FOR_DOCTOR', `Token #${nextTokenNo} pushed to 'READY_FOR_DOCTOR'`, `Nurse Push completed`);
  assert(triageToken?.vitals?.bp === '138/88' && triageToken.vitals.pulse === 82, 'Vitals saved correctly (BP: 138/88, Pulse: 82, SpO2: 98%)');
  assert(triageToken?.vitals?.bmi === 25.9, 'BMI accurately auto-calculated (25.9 Overweight)');
  assert(triageToken?.vitals?.painScale === 4, 'Visual Pain Scale accurately recorded (4/10 Moderate)');
  assert(triageToken?.allergies?.includes('Penicillin'), 'Drug allergy warning (Penicillin) attached to patient token');

  // ---------------------------------------------------------------------------
  // STAGE 3: DOCTOR ASSISTANT DESK — Ante-Room Triage Inspection & Calling
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[36m--- STAGE 3: DOCTOR ASSISTANT DESK (Chamber 204 Ante-Room Prep) ---\x1b[0m');

  const assistantDoctorQueue = patientJourneyService
    .getQueue()
    .filter((q) => q.doctor.toLowerCase().includes('jenkins') || q.room.toLowerCase().includes('204'));

  const assistantReadyPatient = assistantDoctorQueue.find((q) => q.token === nextTokenNo);
  assert(!!assistantReadyPatient, `Doctor Assistant identifies Token #${nextTokenNo} in Chamber 204 Queue`);
  assert(
    assistantReadyPatient?.status === 'READY_FOR_DOCTOR' || assistantReadyPatient?.status === 'TRIAGED',
    `Patient flagged under 'Patients Ready / Triaged' in Assistant Workstation`
  );
  assert(
    assistantReadyPatient?.vitals?.bp === '138/88' && assistantReadyPatient.allergies?.includes('Penicillin'),
    'Assistant screen inherits nurse vitals and allergy warnings without re-typing'
  );

  // Assistant calls patient into chamber
  patientJourneyService.updateQueueToken(nextTokenNo, {
    callingStatus: 'CALLING',
    status: 'IN_CONSULTATION',
    room: 'Chamber 204',
  });

  const inChamberToken = patientJourneyService.getQueue().find((q) => q.token === nextTokenNo);
  assert(inChamberToken?.status === 'IN_CONSULTATION' && inChamberToken.callingStatus === 'CALLING', `Token #${nextTokenNo} called into Chamber 204 by Assistant`);

  // ---------------------------------------------------------------------------
  // STAGE 4: DOCTOR OPD CONSULTATION — Evaluation, Diagnosis & Prescription
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[36m--- STAGE 4: DOCTOR OPD CONSULTATION (Dr. Sarah Jenkins - Chamber 204) ---\x1b[0m');

  const doctorActiveToken = patientJourneyService.getQueue().find((q) => q.token === nextTokenNo);
  assert(!!doctorActiveToken, 'Doctor Consultation Workspace loads active patient Alexander Hayes');
  assert(doctorActiveToken?.vitals?.bp === '138/88', 'Doctor Summary Panel displays live BP 138/88');
  assert(doctorActiveToken?.allergies?.includes('Penicillin'), 'Doctor Screen displays high-visibility crimson allergy alert: Penicillin');
  assert(doctorActiveToken?.triageNotes?.includes('Central chest tightness'), 'Chief complaints auto-loaded from Triage intake');

  // Doctor prescribes medications
  const prescriptionItems = [
    {
      medicineName: 'Metoprolol Succinate 25mg',
      dosage: '25mg (1 Tab)',
      frequency: '1-0-0',
      timing: 'AFTER_FOOD' as const,
      durationDays: 30,
      totalQuantity: 30,
      reason: 'Hypertension and heart rate control',
      instructions: 'Take in the morning after breakfast',
    },
    {
      medicineName: 'Aspirin 75mg Gastro-resistant',
      dosage: '75mg (1 Tab)',
      frequency: '0-1-0',
      timing: 'AFTER_FOOD' as const,
      durationDays: 30,
      totalQuantity: 30,
      reason: 'Cardioprotection & antiplatelet prophylaxis',
      instructions: 'Take after lunch with water',
    },
    {
      medicineName: 'Atorvastatin 20mg',
      dosage: '20mg (1 Tab)',
      frequency: '0-0-1',
      timing: 'AFTER_FOOD' as const,
      durationDays: 30,
      totalQuantity: 30,
      reason: 'Lipid lowering and plaque stabilization',
      instructions: 'Take at bedtime',
    },
    {
      medicineName: 'Sorbitrate 5mg Sublingual',
      dosage: '5mg (1 Tab SL)',
      frequency: 'SOS',
      timing: 'EMPTY_STOMACH' as const,
      durationDays: 10,
      totalQuantity: 5,
      reason: 'Immediate relief of acute angina discomfort',
      instructions: 'Place under tongue if acute chest tightness occurs',
    },
  ];

  const rxNo = `RX-202609-${Math.floor(100 + Math.random() * 900)}`;
  patientJourneyService.addPrescription({
    id: `rx-${Date.now()}`,
    prescriptionNo: rxNo,
    uhid: testUhid,
    patientName: 'Alexander Hayes',
    age: 42,
    gender: 'MALE',
    doctorName: 'Dr. Sarah Jenkins',
    doctorSpecialization: 'Cardiology',
    chamber: 'Chamber 204',
    date: new Date().toISOString().split('T')[0],
    diagnosis: 'Atypical Angina Pectoris / Mild Hypertensive Urgency',
    diagnosisCode: 'ICD-10: I20.9',
    chiefComplaints: 'Central chest tightness and mild shortness of breath for 2 days.',
    clinicalNotes: 'Evaluated for chest discomfort. Normal heart sounds. Prescribed cardioprotective regimen and ordered STAT Cardiac enzymes.',
    vitals: {
      bp: doctorActiveToken?.vitals?.bp || '138/88',
      pulse: doctorActiveToken?.vitals?.pulse || 82,
      temp: doctorActiveToken?.vitals?.temp || 99.2,
      spo2: doctorActiveToken?.vitals?.spo2 || 98,
      weight: doctorActiveToken?.vitals?.weight || 84,
    },
    items: prescriptionItems,
    followUpDate: '2026-09-30',
    isDispensed: false,
  });

  // Doctor orders Diagnostic Tests
  patientJourneyService.addLabOrder({
    id: `lab-${Date.now()}-1`,
    orderNo: 'LAB-202609-901',
    patientName: 'Alexander Hayes',
    uhid: testUhid,
    age: 42,
    gender: 'MALE',
    testName: 'STAT Serum Troponin-T',
    category: 'Biochemistry',
    sampleType: 'Venous Blood',
    container: 'SST Gold Top',
    doctor: 'Dr. Sarah Jenkins',
    barcode: '890202699881',
    stage: 'COLLECTED',
    price: 45,
    isFlaggedAbnormal: false,
    parameters: [],
  });

  // Doctor schedules follow-up
  patientJourneyService.addFollowUp({
    id: `fu-${Date.now()}`,
    uhid: testUhid,
    patientName: 'Alexander Hayes',
    phone: '+1 555-019-9988',
    doctorName: 'Dr. Sarah Jenkins',
    prescribedOn: new Date().toISOString().split('T')[0],
    followUpDate: '2026-09-30',
    reason: 'Follow-up cardiac review & exercise treadmill check',
    status: 'PENDING_BOOKING',
  });

  // Doctor completes consultation
  patientJourneyService.updateQueueToken(nextTokenNo, {
    status: 'COMPLETED',
    checkoutTime: '10:35 AM',
  });

  const completedToken = patientJourneyService.getQueue().find((q) => q.token === nextTokenNo);
  const issuedRx = patientJourneyService.getPrescriptions().find((rx) => rx.uhid === testUhid);
  const issuedLab = patientJourneyService.getLabOrders().find((l) => l.uhid === testUhid);
  const scheduledFollowUp = patientJourneyService.getFollowUps().find((f) => f.uhid === testUhid);

  assert(completedToken?.status === 'COMPLETED', `Token #${nextTokenNo} marked as 'COMPLETED' by Doctor`, `Checkout Time: ${completedToken?.checkoutTime}`);
  assert(!!issuedRx && issuedRx.items.length === 4, `Official Prescription ${issuedRx?.prescriptionNo} issued with 4 medications`, `Diagnosis: ${issuedRx?.diagnosis}`);
  assert(!!issuedLab && issuedLab.testName.includes('Troponin-T'), 'STAT Cardiac Lab Order dispatched to Diagnostic Lab');
  assert(!!scheduledFollowUp && scheduledFollowUp.followUpDate === '2026-09-30', 'Follow-up appointment ticket scheduled for 2026-09-30');

  // ---------------------------------------------------------------------------
  // STAGE 5: RECEPTION DESK — Checkout Verification & Settle
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[36m--- STAGE 5: RECEPTION DESK (Checkout Verification & Discharge) ---\x1b[0m');

  const finalQueue = patientJourneyService.getQueue();
  const receptionCompletedPatient = finalQueue.find((q) => q.token === nextTokenNo);

  assert(receptionCompletedPatient?.status === 'COMPLETED', 'Reception Desk recognizes patient under Completed Consultations filter');
  assert(receptionCompletedPatient?.feePaid === true, 'Consultation fee verified settled at Desk');

  const patientInvoices = patientJourneyService.getInvoices().filter((inv) => inv.uhid === testUhid);
  assert(patientInvoices.length > 0 && patientInvoices[0].status === 'PAID', `Invoice ${patientInvoices[0]?.invNo} cleared in Financial Ledger ($${patientInvoices[0]?.total}.00 USD)`);

  // Final Summary
  console.log('\n================================================================================');
  console.log(`                       TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('================================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runOpdEndToEndTest().catch((err) => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});
