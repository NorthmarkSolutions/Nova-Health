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

async function runReceptionBibleTests() {
  console.log('\n================================================================================');
  console.log('      NORTH HOSPITAL HMS: RECEPTION DASHBOARD DESIGN BIBLE COMPLIANCE           ');
  console.log('================================================================================\n');

  const receptionFile = path.resolve(process.cwd(), 'src/pages/reception/ReceptionDashboard.tsx');
  const receptionSrc = fs.readFileSync(receptionFile, 'utf-8');

  const appLayoutFile = path.resolve(process.cwd(), 'src/components/layout/AppLayout.tsx');
  const appLayoutSrc = fs.readFileSync(appLayoutFile, 'utf-8');

  console.log('--- REQ 1: REMOVE DUPLICATE NAV (SIDEBAR IS SINGLE SOURCE OF TRUTH) ---');
  assert(
    !receptionSrc.includes('Main Workstation Segmented Subtabs Bar'),
    'ReceptionDashboard removed duplicate in-page pill tab bar comment'
  );
  assert(
    !receptionSrc.includes('1. 🎫 Live Token Queue & Calling Desk'),
    'ReceptionDashboard removed duplicate pill tab buttons'
  );
  assert(
    appLayoutSrc.includes('receptionNavItems: NavItem[] = [') &&
    appLayoutSrc.includes("path: '/reception?tab=queue'") &&
    appLayoutSrc.includes("path: '/reception?tab=appointments'") &&
    appLayoutSrc.includes("path: '/reception?tab=billing'") &&
    appLayoutSrc.includes("path: '/reception?tab=search'") &&
    appLayoutSrc.includes("path: '/reception?tab=daycare'"),
    'AppLayout defines the canonical 5 reception navigation items with tab query params'
  );

  console.log('\n--- REQ 2: WORKSPACE HEADER & VISUAL HIERARCHY ---');
  assert(
    receptionSrc.includes('<WorkspaceHeader'),
    'ReceptionDashboard uses shared WorkspaceHeader component'
  );
  assert(
    receptionSrc.includes('title="OPD Reception & Calling Cockpit"'),
    'WorkspaceHeader title is "OPD Reception & Calling Cockpit"'
  );
  assert(
    receptionSrc.includes('description="Station Lead • Patient intake, doctor queue dispatch, counter settlement & bed admissions."'),
    'WorkspaceHeader description contains required subtitle text without Emma FrontDesk'
  );
  assert(
    !receptionSrc.includes('Emma FrontDesk') && !receptionSrc.includes('RECEPTION DESK 01'),
    'WorkspaceHeader removes user identity and desk badge (belongs in sidebar)'
  );
  assert(
    !receptionSrc.includes('linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0369a1 100%)'),
    'ReceptionDashboard dark blue gradient hero banner completely removed'
  );

  // Actions slot in header
  assert(
    receptionSrc.includes('Daily Closing') &&
    receptionSrc.includes('Lobby TV') &&
    receptionSrc.includes('Call Next Patient') &&
    receptionSrc.includes('Walk-In Token') &&
    receptionSrc.includes('Register Patient'),
    'All 5 header action buttons are preserved'
  );

  // Call Next Patient is ONE primary action
  assert(
    receptionSrc.includes('className="btn btn-primary"') &&
    receptionSrc.includes('Call Next Patient'),
    'Call Next Patient is styled as the ONE primary button (btn-primary)'
  );
  assert(
    !receptionSrc.includes("backgroundColor: '#f59e0b'") &&
    !receptionSrc.includes("background: '#f59e0b'"),
    'Call Next Patient does not use orange (#f59e0b)'
  );

  console.log('\n--- REQ 3: DESK/FLOAT SUMMARY STRIP (WHITE CARD PER BIBLE § 8) ---');
  assert(
    receptionSrc.includes("backgroundColor: '#ffffff'") &&
    receptionSrc.includes("borderRadius: '12px'") &&
    receptionSrc.includes("border: '1px solid var(--border-color)'"),
    'Desk/float summary strip styled as normal white card with 12px radius and 1px border'
  );
  assert(
    receptionSrc.includes('Opening Float:') &&
    receptionSrc.includes('Total Collections:') &&
    receptionSrc.includes('Live In-Drawer Cash:'),
    'All desk/float telemetry data is preserved'
  );
  assert(
    receptionSrc.includes("border: counterSession.status === 'OPEN' ? '1px solid var(--success)'"),
    'Counter session status uses small outlined status pill (no solid fill)'
  );
  assert(
    receptionSrc.includes("border: '1px solid var(--primary)'") &&
    receptionSrc.includes('Tariffs Synced Live'),
    'Tariffs Synced Live uses small outlined status pill'
  );
  assert(
    receptionSrc.includes('Shift Handover') &&
    receptionSrc.includes('<ArrowRight'),
    'Shift Handover is secondary button with ArrowRight icon'
  );
  assert(
    receptionSrc.includes('setShowOpenCounterModal(true)') &&
    receptionSrc.includes('setShowClosingReportModal(true)'),
    'Both desk/float summary buttons retain their exact existing click handlers'
  );

  console.log('\n--- REQ 4: KPI ROW & KPI CARDS (MATCHING NURSE PATTERN) ---');
  assert(
    receptionSrc.includes('<KpiRow>') && receptionSrc.includes('</KpiRow>'),
    'ReceptionDashboard renders shared KpiRow component'
  );
  assert(
    receptionSrc.includes('label="Total Visits Today"') &&
    receptionSrc.includes('value={totalVisitsToday}') &&
    receptionSrc.includes('subtext="All active & checked-in tokens"'),
    'KpiCard renders Total Visits Today with value and subtext'
  );
  assert(
    receptionSrc.includes('label="Waiting in Lobby"') &&
    receptionSrc.includes('value={waitingInLobby}') &&
    receptionSrc.includes('subtext="Awaiting doctor chamber calling"'),
    'KpiCard renders Waiting in Lobby with value and subtext'
  );
  assert(
    receptionSrc.includes('label="In Consultation"') &&
    receptionSrc.includes('value={inConsultation}') &&
    receptionSrc.includes('subtext="Currently inside doctor chambers"'),
    'KpiCard renders In Consultation with value and subtext'
  );
  assert(
    receptionSrc.includes('label="Counter Revenue"') &&
    (receptionSrc.includes('value={`$${totalCollectionsToday}.00`}') || receptionSrc.includes('value={formatMoney(totalCollectionsToday)}')) &&
    receptionSrc.includes('subtext="Consultation & desk collections"'),
    'KpiCard renders Counter Revenue with value and subtext'
  );
  assert(
    !receptionSrc.includes('Total Patients Today') &&
    !receptionSrc.includes("border: '1.5px solid #fed7aa'") &&
    !receptionSrc.includes("border: '1.5px solid #99f6e4'"),
    'Custom colored border cards completely removed from Reception KPI row'
  );

  console.log('\n--- REQ 5: TABLE ACTIONS COLUMN & ROW ACTIONS MENU ---');
  assert(
    receptionSrc.includes('<RowActionsMenu'),
    'Reception queue table renders shared RowActionsMenu in actions column'
  );
  assert(
    receptionSrc.includes("label: 'Check-Out'") &&
    receptionSrc.includes("variant: 'primary'"),
    'Check-Out action is primary blue (no solid green)'
  );
  assert(
    receptionSrc.includes("label: 'Call'") &&
    receptionSrc.includes("variant: 'secondary'") &&
    receptionSrc.includes("color: 'var(--primary)'"),
    'Call action is secondary style with blue text'
  );
  assert(
    receptionSrc.includes("label: 'Print Token Slip'") &&
    receptionSrc.includes("label: 'Counter Bill Receipt'") &&
    receptionSrc.includes("label: 'Mark Nurse Triaged'") &&
    receptionSrc.includes("label: 'Mark Urgent Priority'") &&
    receptionSrc.includes("label: 'Mark No-Show'"),
    'All existing table actions preserved in RowActionsMenu fixed/overflow slots'
  );
  assert(
    receptionSrc.includes('confirm: {') &&
    receptionSrc.includes('title: `Escalate Token #${item.token} to Urgent?`') &&
    receptionSrc.includes('title: `Mark Token #${item.token} as No-Show?`'),
    'Destructive/escalation actions require confirmation step matching Nurse pattern'
  );

  console.log('\n--- REQ 6: RIGHT PANEL (DOCTOR AVAILABILITY & CHAMBERS) UNTOUCHED ---');
  assert(
    receptionSrc.includes("gridTemplateColumns: '7fr 3fr'"),
    'Two-column grid layout preserved (70% queue, 30% chambers)'
  );
  assert(
    receptionSrc.includes('Consultation Chambers Panel') &&
    receptionSrc.includes('Doctor Availability, Chamber Status & Shift Summary'),
    'Doctor Availability & Chambers panel preserved intact'
  );

  console.log('\n================================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runReceptionBibleTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
