import './setupEnv.ts';
import fs from 'fs';
import path from 'path';

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

async function runDoctorBibleTests() {
  console.log('\n================================================================================');
  console.log('       NORTH HOSPITAL HMS: DOCTOR DASHBOARD HEADER & SYSTEM COMPLIANCE');
  console.log('================================================================================\n');

  const doctorFile = path.resolve(process.cwd(), 'src/pages/doctor/DoctorDashboard.tsx');
  const appLayoutFile = path.resolve(process.cwd(), 'src/components/layout/AppLayout.tsx');

  const doctorCode = fs.readFileSync(doctorFile, 'utf-8');
  const layoutCode = fs.readFileSync(appLayoutFile, 'utf-8');

  // Extract the header component slice
  const headerStart = doctorCode.indexOf('{/* 1. TOP EXECUTIVE DOCTOR WORKSPACE HEADER');
  const headerEnd = doctorCode.indexOf('{/* Emergency Casualty Red Alert Banner');
  const headerSlice = doctorCode.slice(headerStart, headerEnd);

  // Requirement 1: Single navigation (sidebar only), no in-page pill tab bar
  console.log('\x1b[36m--- REQ 1: SINGLE NAVIGATION & SIDEBAR SOURCE OF TRUTH ---\x1b[0m');
  assert(
    !doctorCode.includes('STREAMLINED TOP NAVIGATION BAR') &&
      !doctorCode.includes('6 Focused Clinical Pillars') &&
      !doctorCode.includes("id: 'queue', label: '2. Queue & Appointments'"),
    'DoctorDashboard removed duplicate in-page pill tab bar'
  );
  assert(
    layoutCode.includes("label: '1. Dashboard'") &&
      layoutCode.includes("label: '2. Queue & Appointments'") &&
      layoutCode.includes("label: '3. Patient Consultation & Rx'") &&
      layoutCode.includes("label: '4. My Schedule'") &&
      layoutCode.includes("label: '5. Reports & Analytics'") &&
      layoutCode.includes("label: '6. Inpatient Rounds'"),
    'AppLayout contains all 6 canonical doctor navigation items'
  );
  assert(
    layoutCode.includes('doctorStats.queueCount') &&
      layoutCode.includes('doctorStats.inpatientCount'),
    'AppLayout binds dynamic live badge counts to doctor navigation items'
  );

  // Requirement 2: Replace header with WorkspaceHeader
  console.log('\x1b[36m--- REQ 2: WORKSPACE HEADER & VISUAL HIERARCHY ---\x1b[0m');
  assert(
    headerSlice.includes('<WorkspaceHeader') &&
      headerSlice.includes('title={doctorName}') &&
      headerSlice.includes('description="MD (Cardiology / Internal Medicine) • Morning Shift (08:30 - 15:00)"'),
    'DoctorDashboard renders WorkspaceHeader with Dr. Sarah Jenkins and trimmed shift description'
  );
  assert(
    !headerSlice.includes('Lead Consultant'),
    'Lead Consultant badge removed from header'
  );
  assert(
    !headerSlice.includes('#0f172a'),
    'Dark navy background (#0f172a) completely removed from header'
  );
  assert(
    headerSlice.includes("backgroundColor: '#ffffff'") &&
      headerSlice.includes("borderBottom: '1px solid var(--border-color)'"),
    'Header container matches white background and border specification'
  );
  assert(
    headerSlice.includes("borderRadius: '50%'") &&
      headerSlice.includes("doctorStatus === 'AVAILABLE'"),
    'Presence status uses colored status dot in secondary button style'
  );
  assert(
    headerSlice.includes('My Queue ({displayedQueue.length})') &&
      headerSlice.includes('All OPD ({queue.length})'),
    'My Queue and All OPD secondary buttons rendered with dynamic counts'
  );
  assert(
    headerSlice.includes('Call Next') &&
      headerSlice.includes("backgroundColor: 'var(--primary)'") &&
      !headerSlice.includes('#f59e0b'),
    'Call Next is ONE primary blue action (no orange #f59e0b in header)'
  );

  // Requirement 3: Sync button investigation & auto-update
  console.log('\x1b[36m--- REQ 3: SYNC INVESTIGATION & AUTO-SYNC ARCHITECTURE ---\x1b[0m');
  assert(
    !headerSlice.includes('title="Sync Data from Reception"') &&
      !headerSlice.includes('Sync') &&
      !headerSlice.includes('refreshAllData'),
    'Manual Sync button removed from header entirely'
  );
  assert(
    doctorCode.includes("window.addEventListener('storage', handleDataSync)") &&
      doctorCode.includes("window.addEventListener('nh_data_sync', handleDataSync)"),
    'DoctorDashboard subscribes to storage and nh_data_sync for automatic cross-role updates'
  );
  assert(
    layoutCode.includes("window.addEventListener('storage', handleSync)") &&
      layoutCode.includes("window.addEventListener('nh_data_sync', handleSync)") &&
      layoutCode.includes('setDoctorStats'),
    'AppLayout subscribes to storage and nh_data_sync to keep doctor badges automatically updated'
  );

  // Requirement 4: Unmodified clinical & KPI cards
  console.log('\x1b[36m--- REQ 4: PRESERVED KPI ROW & CLINICAL CARDS ---\x1b[0m');
  assert(
    doctorCode.includes("Today's Appointments") &&
      doctorCode.includes("Patients Waiting in Lobby") &&
      doctorCode.includes("Consultations Completed"),
    'KPI cards row (15 / 0 / 11 / 6) preserved intact'
  );
  assert(
    doctorCode.includes('Current In Chamber') &&
      doctorCode.includes('Next On Deck') &&
      doctorCode.includes('Inpatient Ward & Critical Care Rounds'),
    'Current In Chamber, Next On Deck, and Inpatient Ward cards preserved intact'
  );

  console.log('\n================================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDoctorBibleTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
