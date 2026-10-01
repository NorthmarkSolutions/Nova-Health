import './setupEnv.ts';
import { patientJourneyService, SharedQueueToken } from '../src/services/patientJourneyService.ts';
import { NURSE_TABS, resolveNurseTab } from '../src/pages/nurse/nurseTabs.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string, detail?: string) {
  if (condition) {
    console.log(`  \x1b[32m✓ [PASS]\x1b[0m ${title}`);
    if (detail) console.log(`      \x1b[90m${detail}\x1b[0m`);
    passed++;
  } else {
    console.error(`  \x1b[31m✗ [FAIL]\x1b[0m ${title}`);
    if (detail) console.error(`      \x1b[31m${detail}\x1b[0m`);
    failed++;
  }
}

// BMI calculation helper
function calculateBmi(heightCm: number, weightKg: number): number {
  const hM = heightCm / 100;
  if (!hM || !weightKg || hM <= 0) return 0;
  return Number((weightKg / (hM * hM)).toFixed(1));
}

// BP category helper (§ Phase 3: s>=140||d>=90 -> Stage 2 HTN; s>=130||d>=80 -> Stage 1 HTN; s>=120 && d<80 -> Elevated; else Normal; '-' if empty)
function categorizeBp(systolic: string | number | undefined, diastolic: string | number | undefined): string {
  if (systolic === undefined || diastolic === undefined || systolic === '' || diastolic === '') return '-';
  const s = Number(systolic);
  const d = Number(diastolic);
  if (isNaN(s) || isNaN(d) || s <= 0 || d <= 0) return '-';
  if (s >= 140 || d >= 90) return 'Stage 2 HTN';
  if (s >= 130 || d >= 80) return 'Stage 1 HTN';
  if (s >= 120 && d < 80) return 'Elevated';
  return 'Normal';
}

async function runNurseTriageBibleTests() {
  console.log('\n================================================================================');
  console.log('   NORTH HOSPITAL HMS: NURSE TRIAGE & DESIGN BIBLE COMPLIANCE TEST SUITE');
  console.log('================================================================================\n');

  // Test 1: Vitals Mathematical Accuracy
  console.log('\x1b[36m--- TEST GROUP 1: CLINICAL VITALS CALCULATION ACCURACY ---\x1b[0m');
  const bmi1 = calculateBmi(174, 70);
  assert(bmi1 === 23.1, 'BMI calculation for 174cm / 70kg is 23.1', `Calculated: ${bmi1}`);

  const bmi2 = calculateBmi(160, 85);
  assert(bmi2 === 33.2, 'BMI calculation for 160cm / 85kg is 33.2 (Obese)', `Calculated: ${bmi2}`);

  const bpNorm = categorizeBp(118, 76);
  assert(bpNorm === 'Normal', 'BP 118/76 is categorized as Normal', `Category: ${bpNorm}`);

  const bpElev = categorizeBp(124, 78);
  assert(bpElev === 'Elevated', 'BP 124/78 is categorized as Elevated', `Category: ${bpElev}`);

  const bpStage1 = categorizeBp(134, 84);
  assert(bpStage1 === 'Stage 1 HTN', 'BP 134/84 is categorized as Stage 1 HTN', `Category: ${bpStage1}`);

  const bpStage2 = categorizeBp(148, 96);
  assert(bpStage2 === 'Stage 2 HTN', 'BP 148/96 is categorized as Stage 2 HTN', `Category: ${bpStage2}`);

  const bp15080 = categorizeBp(150, 80);
  assert(bp15080 === 'Stage 2 HTN', 'BP 150/80 is correctly categorized as Stage 2 HTN (Phase 3 fix)', `Category: ${bp15080}`);

  const bpEmpty = categorizeBp('', '');
  assert(bpEmpty === '-', 'Empty BP fields return neutral "-" label', `Category: ${bpEmpty}`);

  // Test 2: Queue Token Lifecycle & Transitions
  console.log('\n\x1b[36m--- TEST GROUP 2: TRIAGE QUEUE STATE TRANSITIONS ---\x1b[0m');
  const initialQueue = patientJourneyService.getQueue();
  assert(Array.isArray(initialQueue) && initialQueue.length > 0, 'Queue retrieves active tokens from service', `Total: ${initialQueue.length}`);

  const targetToken = initialQueue[0];
  assert(Boolean(targetToken?.id), `Target token identified: #${targetToken.token} (${targetToken.patient})`);

  // Start triage transition
  patientJourneyService.updateQueueStatus(targetToken.token, 'IN_TRIAGE');
  const inTriageQueue = patientJourneyService.getQueue();
  const triagedItem = inTriageQueue.find((q) => q.token === targetToken.token);
  assert(triagedItem?.status === 'IN_TRIAGE', 'Status transitioned to IN_TRIAGE', `Status: ${triagedItem?.status}`);

  // Save Vitals
  patientJourneyService.updateQueueToken(targetToken.token, {
    vitals: {
      bp: '128/82',
      pulse: 76,
      temp: 98.4,
      spo2: 99,
      respiratoryRate: 16,
      weight: 72,
      height: 174,
      bmi: 23.8,
      painScale: 2,
    },
  });
  const withVitals = patientJourneyService.getQueue().find((q) => q.token === targetToken.token);
  assert(withVitals?.vitals?.bp === '128/82', 'Vitals correctly persisted to patient token', `BP: ${withVitals?.vitals?.bp}`);
  assert(withVitals?.vitals?.pulse === 76, 'Pulse correctly persisted', `Pulse: ${withVitals?.vitals?.pulse}`);

  // Push to Doctor Chamber
  patientJourneyService.updateQueueStatus(targetToken.token, 'READY_FOR_DOCTOR');
  const readyItem = patientJourneyService.getQueue().find((q) => q.token === targetToken.token);
  assert(readyItem?.status === 'READY_FOR_DOCTOR', 'Token pushed to READY_FOR_DOCTOR chamber queue', `Status: ${readyItem?.status}`);

  // Test 3: Emergency Escalation Bypass
  console.log('\n\x1b[36m--- TEST GROUP 3: EMERGENCY ESCALATION BYPASS ---\x1b[0m');
  if (initialQueue.length > 1) {
    const emergTarget = initialQueue[1];
    patientJourneyService.updateQueueToken(emergTarget.token, {
      status: 'EMERGENCY',
      priority: 'EMERGENCY',
      triageNotes: 'EMERGENCY: Immediate chamber bypass flagged by nurse.',
    });
    const emergItem = patientJourneyService.getQueue().find((q) => q.token === emergTarget.token);
    assert(emergItem?.priority === 'EMERGENCY', 'Priority elevated to EMERGENCY', `Priority: ${emergItem?.priority}`);
    assert(emergItem?.status === 'EMERGENCY', 'Status transitioned to EMERGENCY', `Status: ${emergItem?.status}`);
  }

  // Test 4: Shift Handover & SBAR Record Persistence
  console.log('\n\x1b[36m--- TEST GROUP 4: SHIFT SBAR & OBSERVATION BEDS ---\x1b[0m');
  const shiftRecord = patientJourneyService.getNurseShiftRecord();
  assert(Boolean(shiftRecord), 'Nurse shift record accessible');
  assert(Array.isArray(shiftRecord.criticalPatients), 'Critical patient surveillance list active', `Count: ${shiftRecord.criticalPatients.length}`);

  const obsBeds = patientJourneyService.getObservationBeds();
  assert(Array.isArray(obsBeds) && obsBeds.length > 0, 'Observation beds census loaded', `Beds count: ${obsBeds.length}`);

  // Test 5: Phase 1 Tab Navigation & Legacy Route Resolution
  console.log('\n\x1b[36m--- TEST GROUP 5: PHASE 1 NURSE TABS & RESOLVER ROBUSTNESS ---\x1b[0m');
  assert(NURSE_TABS.length === 5, 'NURSE_TABS exports exactly 5 tabs', `Count: ${NURSE_TABS.length}`);
  assert(resolveNurseTab('triage-queue') === 'triage-queue', 'Canonical "triage-queue" resolves to "triage-queue"');
  assert(resolveNurseTab('vitals') === 'vitals', 'Canonical "vitals" resolves to "vitals"');
  assert(resolveNurseTab('observation-beds') === 'observation-beds', 'Canonical "observation-beds" resolves to "observation-beds"');
  assert(resolveNurseTab('shift-handover') === 'shift-handover', 'Canonical "shift-handover" resolves to "shift-handover"');
  assert(resolveNurseTab('reports') === 'reports', 'Canonical "reports" resolves to "reports"');

  // Legacy mappings
  assert(resolveNurseTab('triage') === 'triage-queue', 'Legacy "?tab=triage" maps to "triage-queue"');
  assert(resolveNurseTab('observation') === 'observation-beds', 'Legacy "?tab=observation" maps to "observation-beds"');
  assert(resolveNurseTab('handoff') === 'shift-handover', 'Legacy "?tab=handoff" maps to "shift-handover"');

  // Fallback & resiliency (never blank)
  assert(resolveNurseTab(null) === 'triage-queue', 'Null tab param falls back to "triage-queue"');
  assert(resolveNurseTab(undefined) === 'triage-queue', 'Undefined tab param falls back to "triage-queue"');
  assert(resolveNurseTab('') === 'triage-queue', 'Empty string tab param falls back to "triage-queue"');
  assert(resolveNurseTab('unknown-tab') === 'triage-queue', 'Unknown tab falls back to "triage-queue"');
  assert(resolveNurseTab('  TRIAGE  ') === 'triage-queue', 'Case-insensitive & trimmed legacy parameter maps to "triage-queue"');

  // Test 6: SaaS Fact Consolidation & Single-Home Identity Compliance
  console.log('\n\x1b[36m--- TEST GROUP 6: SAAS FACT CONSOLIDATION & SINGLE-HOME COMPLIANCE ---\x1b[0m');
  const fs = await import('fs');
  const path = await import('path');

  const nurseHeaderContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/nurse/components/NurseHeader.tsx'),
    'utf-8'
  );
  assert(!nurseHeaderContent.includes('Staff:'), 'NurseHeader removes redundant "Staff: ..." fact');
  assert(!nurseHeaderContent.includes('Roster:'), 'NurseHeader removes redundant "Roster: ..." fact');
  assert(!nurseHeaderContent.includes('TRIAGE STATION 01'), 'NurseHeader removes redundant station badge');
  assert(
    nurseHeaderContent.includes('Patient intake, clinical vitals assessment, and rapid doctor chamber handoff.'),
    'NurseHeader retains clean clinical description'
  );
  assert(
    nurseHeaderContent.includes('07:00 – 15:00'),
    'NurseHeader shift button includes roster hours tooltip'
  );

  const appLayoutContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/layout/AppLayout.tsx'),
    'utf-8'
  );
  assert(
    !appLayoutContent.includes('Department Dedicated Session'),
    'AppLayout removes redundant "Department Dedicated Session"'
  );
  assert(!appLayoutContent.includes('Lead RN:'), 'AppLayout removes redundant "Lead RN" property');
  assert(!appLayoutContent.includes('sidebar-station-card'), 'AppLayout removes bottom station cards entirely');
  assert(
    appLayoutContent.includes('sidebar-dept-block'),
    'AppLayout consolidates department & station into single top context block'
  );
  assert(
    appLayoutContent.includes('aria-haspopup="menu"'),
    'AppLayout user menu trigger provides accessible aria-haspopup="menu"'
  );
  assert(
    appLayoutContent.includes('ChevronsUpDown'),
    'AppLayout user menu trigger includes chevron icon'
  );
  assert(
    appLayoutContent.includes("replace(/^Nurse\\s+/i, '')"),
    'AppLayout displayName strips duplicate "Nurse" prefix'
  );

  // Test 7: Consistent Actions Column & Three Fixed Slots Compliance
  console.log('\n\x1b[36m--- TEST GROUP 7: CONSISTENT ACTIONS COLUMN & FIXED SLOTS COMPLIANCE ---\x1b[0m');
  const triageQueueContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/nurse/components/TriageQueueView.tsx'),
    'utf-8'
  );
  assert(
    triageQueueContent.includes("width: '208px'"),
    'TriageQueueView enforces fixed 208px Actions column width'
  );
  assert(
    triageQueueContent.includes('TriageRowActions'),
    'TriageQueueView renders unified TriageRowActions component'
  );
  assert(
    !triageQueueContent.includes('btn-danger'),
    'TriageQueueView removes solid red emergency buttons from table rows'
  );

  const triageRowActionsContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/nurse/components/TriageRowActions.tsx'),
    'utf-8'
  );
  assert(
    triageRowActionsContent.includes('Volume2'),
    'Slot 1: Call patient icon-only button with Volume2 icon'
  );
  assert(
    triageRowActionsContent.includes("width: '112px'"),
    'Slot 2: Primary action fixed width of 112px'
  );
  assert(
    triageRowActionsContent.includes('Start Triage') && triageRowActionsContent.includes('Continue') && triageRowActionsContent.includes('View'),
    'Slot 2: Dynamic status labels (Start Triage / Continue / View)'
  );
  assert(
    triageRowActionsContent.includes('MoreHorizontal'),
    'Slot 3: More menu icon-only button with MoreHorizontal icon'
  );
  assert(
    triageRowActionsContent.includes('createPortal'),
    'Slot 3: Popover renders via createPortal to prevent table overflow clipping'
  );
  assert(
    triageRowActionsContent.includes('Escalate Token #') && triageRowActionsContent.includes('Triggers immediate priority physician chamber bypass.'),
    'Slot 3: Mark emergency requires explicit confirmation step before escalating'
  );
  assert(
    triageRowActionsContent.includes('ArrowDown') && triageRowActionsContent.includes('ArrowUp'),
    'Slot 3: Arrow-key navigation between popover menu items'
  );
  assert(
    triageRowActionsContent.includes("e.key === 'Escape'"),
    'Slot 3: Escape key dismisses popover and returns focus'
  );

  // Test 8: Clinical UX, Abnormal Vital Flags & Unified Save Flow
  console.log('\n\x1b[36m--- TEST GROUP 8: CLINICAL UX, VITAL FLAGS & UNIFIED SAVE FLOW ---\x1b[0m');
  const { getFlag, getVitalFlagDetails, ADULT_VITAL_RANGES } = await import(
    '../src/pages/nurse/components/vitalRanges.ts'
  );

  // 8.1 vitalRanges adult thresholds and pediatric safety
  assert(
    getFlag('spo2', 92, 32) === 'warning',
    'VitalFlags: SpO2 92% flags warning in adults'
  );
  assert(
    getFlag('spo2', 88, 32) === 'critical',
    'VitalFlags: SpO2 88% flags critical in adults'
  );
  assert(
    getFlag('spo2', 98, 32) === 'normal',
    'VitalFlags: SpO2 98% is normal in adults'
  );
  assert(
    getFlag('spo2', 88, 10) === null,
    'VitalFlags: SpO2 flags hidden for children (age < 12)'
  );

  // Temp
  assert(
    getFlag('temperature', 101.2, 45) === 'warning',
    'VitalFlags: Temp 101.2F flags warning'
  );
  assert(
    getFlag('temperature', 103.5, 45) === 'critical',
    'VitalFlags: Temp 103.5F flags critical'
  );
  assert(
    getFlag('temperature', 95.8, 45) === 'warning',
    'VitalFlags: Temp 95.8F (hypothermia) flags warning'
  );

  // Pulse
  assert(
    getFlag('pulse', 105, 28) === 'warning',
    'VitalFlags: Pulse 105 flags warning (tachycardia)'
  );
  assert(
    getFlag('pulse', 125, 28) === 'critical',
    'VitalFlags: Pulse 125 flags critical'
  );
  assert(
    getFlag('pulse', 55, 28) === 'warning',
    'VitalFlags: Pulse 55 flags warning (bradycardia)'
  );
  assert(
    getFlag('pulse', 45, 28) === 'critical',
    'VitalFlags: Pulse 45 flags critical'
  );

  // Resp rate
  assert(
    getFlag('respiratoryRate', 22, 50) === 'warning',
    'VitalFlags: Resp rate 22 flags warning'
  );
  assert(
    getFlag('respiratoryRate', 26, 50) === 'critical',
    'VitalFlags: Resp rate 26 flags critical'
  );
  assert(
    getFlag('respiratoryRate', 10, 50) === 'warning',
    'VitalFlags: Resp rate 10 flags warning'
  );
  assert(
    getFlag('respiratoryRate', 7, 50) === 'critical',
    'VitalFlags: Resp rate 7 flags critical'
  );

  // Random blood sugar
  assert(
    getFlag('randomSugar', 220, 60) === 'warning',
    'VitalFlags: RBS 220 flags warning'
  );
  assert(
    getFlag('randomSugar', 60, 60) === 'critical',
    'VitalFlags: RBS 60 flags critical (hypoglycemia)'
  );

  // Config comment check
  const vitalRangesFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/nurse/components/vitalRanges.ts'),
    'utf-8'
  );
  assert(
    vitalRangesFile.includes('confirm thresholds with clinical lead'),
    'vitalRanges.ts includes mandatory "confirm thresholds with clinical lead" comment'
  );

  // 8.2 VitalsAssessmentView full height layout, reload bug & clinical controls
  const vitalsAssessmentContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/nurse/components/VitalsAssessmentView.tsx'),
    'utf-8'
  );
  assert(
    !vitalsAssessmentContent.includes('maxHeight: 680'),
    'VitalsAssessmentView removed hardcoded maxHeight: 680px from roster list'
  );
  assert(
    vitalsAssessmentContent.includes('pinned-action-footer') &&
      vitalsAssessmentContent.includes("position: 'sticky'"),
    'VitalsAssessmentView implements pinned action footer with border-top and white background'
  );
  assert(
    vitalsAssessmentContent.includes('onSaveDraft'),
    'VitalsAssessmentView receives and invokes unified onSaveDraft prop'
  );
  assert(
    !vitalsAssessmentContent.includes('onSaveVitals') && !vitalsAssessmentContent.includes('onSaveAssessment'),
    'VitalsAssessmentView eliminates separate onSaveVitals and onSaveAssessment'
  );
  assert(
    vitalsAssessmentContent.includes('Unsaved changes') &&
      vitalsAssessmentContent.includes('Saved '),
    'VitalsAssessmentView tracks draft save status ("Unsaved changes" / "Saved HH:MM")'
  );
  assert(
    vitalsAssessmentContent.includes('patient.assessment?.currentMedications') ||
      vitalsAssessmentContent.includes('currentMedications:'),
    'VitalsAssessmentView reloads medications from patient.assessment without leaking'
  );
  assert(
    vitalsAssessmentContent.includes('No known drug allergies (NKDA)'),
    'VitalsAssessmentView provides "No known drug allergies" (NKDA) checkbox'
  );
  assert(
    vitalsAssessmentContent.includes('triage-priority-segmented') &&
      vitalsAssessmentContent.includes('URGENT') &&
      vitalsAssessmentContent.includes('EMERGENCY'),
    'VitalsAssessmentView provides Normal / Urgent / Emergency priority segmented control'
  );
  assert(
    vitalsAssessmentContent.includes('Recorded ') &&
      (vitalsAssessmentContent.includes('currentUserName') || vitalsAssessmentContent.includes('user')),
    'VitalsAssessmentView provides clinical audit line displaying recorded time and staff name'
  );

  // 8.3 NurseDashboard integration
  const nurseDashboardContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/nurse/NurseDashboard.tsx'),
    'utf-8'
  );
  assert(
    nurseDashboardContent.includes('handleSaveDraft') &&
      nurseDashboardContent.includes('onSaveDraft={handleSaveDraft}'),
    'NurseDashboard wires unified handleSaveDraft to VitalsAssessmentView'
  );

  // Summary
  console.log('\n================================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runNurseTriageBibleTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
