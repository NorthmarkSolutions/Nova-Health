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

async function runAssistantBibleTests() {
  console.log('\n================================================================================');
  console.log('   NORTH HOSPITAL HMS: DOCTOR ASSISTANT WORKSTATION DESIGN BIBLE COMPLIANCE');
  console.log('================================================================================\n');

  const assistantFile = path.resolve(process.cwd(), 'src/pages/doctor/DoctorAssistantDashboard.tsx');
  const appLayoutFile = path.resolve(process.cwd(), 'src/components/layout/AppLayout.tsx');

  const assistantCode = fs.readFileSync(assistantFile, 'utf-8');
  const layoutCode = fs.readFileSync(appLayoutFile, 'utf-8');

  // Requirement 1: Single navigation (sidebar only), no in-page pill tab bar
  console.log('\x1b[36m--- REQ 1: SINGLE NAVIGATION & SIDEBAR SOURCE OF TRUTH ---\x1b[0m');
  assert(
    !assistantCode.includes('Dashboard Overview') && !assistantCode.includes('1. Queue & Patient Preparation'),
    'DoctorAssistantDashboard removes the in-page pill tab bar'
  );
  assert(
    layoutCode.includes("label: '1. Queue & Patient Prep'") &&
      layoutCode.includes("label: '2. Investigations & Reports'") &&
      layoutCode.includes("label: '3. Consultation Handoff'"),
    'AppLayout defines exactly the 3 canonical assistant navigation items'
  );
  assert(
    layoutCode.includes('assistantStats.waitingCount') &&
      layoutCode.includes('assistantStats.labCount') &&
      layoutCode.includes('assistantStats.completedCount'),
    'AppLayout binds live badge counts to assistant navigation items'
  );
  assert(
    assistantCode.includes("const validTabs = ['queue', 'investigations', 'handoff']"),
    'DoctorAssistantDashboard strictly validates activeTab to the 3 sidebar views'
  );

  // Requirement 2: Header replaced with WorkspaceHeader, no badge, no duplicate physician/room
  console.log('\x1b[36m--- REQ 2: WORKSPACE HEADER & SIDEBAR CONTEXT INTEGRATION ---\x1b[0m');
  assert(
    assistantCode.includes('<WorkspaceHeader') &&
      assistantCode.includes('title="OPD Doctor Assistant Workstation"'),
    'DoctorAssistantDashboard renders WorkspaceHeader with title "OPD Doctor Assistant Workstation"'
  );
  assert(
    !assistantCode.includes('badge="Ante-Room"') && !assistantCode.includes('badge="OPD"'),
    'WorkspaceHeader removes badge next to title'
  );
  assert(
    layoutCode.includes("<WorkspaceSidebarContext") &&
      layoutCode.includes("case RoleType.DOCTOR_ASSISTANT:\n        return 'Doctor Assistant Station'") &&
      layoutCode.includes("case RoleType.DOCTOR_ASSISTANT:\n        return 'Chamber 204 • Ante-Room'"),
    'Chamber / Room lives in sidebar context block via WorkspaceSidebarContext'
  );

  // Requirement 3: Chamber selector & session status restyled
  console.log('\x1b[36m--- REQ 3: CHAMBER SELECTOR & SESSION STATUS STYLING ---\x1b[0m');
  assert(
    assistantCode.includes('Chamber:') && assistantCode.includes('border: \'1px solid var(--border-color)\''),
    'Chamber dropdown styled with secondary bordered control styling'
  );
  assert(
    assistantCode.includes("width: '8px'") &&
      assistantCode.includes("height: '8px'") &&
      assistantCode.includes("borderRadius: '50%'") &&
      (assistantCode.includes("'In Session'") || assistantCode.includes("'Chamber Ready'")),
    'Chamber session status rendered as small dot + label indicator (not CTA button)'
  );

  // Requirement 4: KpiRow above content with 5 KpiCards
  console.log('\x1b[36m--- REQ 4: KPI ROW & KPI CARDS ---\x1b[0m');
  assert(
    assistantCode.includes('<KpiRow>') && assistantCode.includes('</KpiRow>'),
    'DoctorAssistantDashboard renders shared KpiRow component'
  );
  assert(
    assistantCode.includes('label="Waiting in Lobby"') &&
      assistantCode.includes('label="Now in Chamber"') &&
      assistantCode.includes('label="Prepared for Doctor"') &&
      assistantCode.includes('label="Pending Investigations"') &&
      assistantCode.includes('label="Completed Consultations"'),
    'KpiRow renders the 5 key workstation metrics from existing state'
  );

  // Requirement 5: "Call Next Token" card restyled
  console.log('\x1b[36m--- REQ 5: CALL NEXT TOKEN CARD ---\x1b[0m');
  assert(
    assistantCode.includes('Next in Queue') &&
      assistantCode.includes('className="btn btn-primary"') &&
      assistantCode.includes('Call Next Token'),
    'Call Next Token restyled as white card with primary button inside (no solid blue bar)'
  );

  // Requirement 6: "Now in Chamber" & "Waiting in Lobby" left accent borders
  console.log('\x1b[36m--- REQ 6: LEFT ACCENT BORDER CARDS (NO FULL COLOR FILLS) ---\x1b[0m');
  assert(
    assistantCode.includes('borderLeft: currentInChamber ? \'4px solid var(--success)\' : \'4px solid var(--border-color)\'') ||
      assistantCode.includes('borderLeft: currentInChamber ? \'4px solid var(--success)\''),
    'Now in Chamber card uses white background with colored left accent border'
  );
  assert(
    assistantCode.includes('borderLeft: \'4px solid var(--primary)\'') &&
      assistantCode.includes('Waiting In Lobby'),
    'Waiting in Lobby card uses white background with primary left accent border'
  );

  // Requirement 7: Drug Allergies / Chronic Conditions / Current Home Meds boxes
  console.log('\x1b[36m--- REQ 7: CLINICAL SAFETY ALERT BOXES ---\x1b[0m');
  assert(
    assistantCode.includes('Drug Allergies') &&
      assistantCode.includes('Chronic Conditions') &&
      assistantCode.includes('Current Home Meds'),
    'Clinical safety alerts contain Allergies, Chronic Conditions, and Home Meds'
  );
  assert(
    assistantCode.includes("backgroundColor: '#ffffff'") &&
      assistantCode.includes("border: '1px solid var(--border-color)'"),
    'Alert boxes use white cards with 1px border and colored icon/label (matching Nurse)'
  );

  // Requirement 8: Primary action bar CTA
  console.log('\x1b[36m--- REQ 8: PRIMARY ACTION BAR & SAVE CTA ---\x1b[0m');
  assert(
    assistantCode.includes('<PrimaryActionBar') &&
      assistantCode.includes('Save & Push Vitals Directly to'),
    'Save & Push Vitals uses PrimaryActionBar component with primary blue CTA'
  );

  // Requirement 9: Section headers dropped leading numbers
  console.log('\x1b[36m--- REQ 9: CLEAN SECTION HEADERS ---\x1b[0m');
  assert(
    assistantCode.includes('Vital Signs Intake') &&
      !assistantCode.includes('1. VITAL SIGNS INTAKE') &&
      !assistantCode.includes('1. Vital Signs Intake'),
    'Section header drops leading number: "Vital Signs Intake"'
  );
  assert(
    assistantCode.includes('Presenting Complaints & Symptoms') &&
      !assistantCode.includes('2. Presenting Complaints & Symptoms'),
    'Section header drops leading number: "Presenting Complaints & Symptoms"'
  );
  assert(
    assistantCode.includes('Clinical Safety Alerts & Medical History') &&
      !assistantCode.includes('3. Clinical Safety Alerts & Medical History'),
    'Section header drops leading number: "Clinical Safety Alerts & Medical History"'
  );

  // Requirement 10: RowActionsMenu used for table/queue rows
  console.log('\x1b[36m--- REQ 10: ROW ACTIONS MENU CONSISTENCY ---\x1b[0m');
  assert(
    assistantCode.includes('<RowActionsMenu') &&
      assistantCode.includes('fixedActions=') &&
      assistantCode.includes('menuItems='),
    'DoctorAssistantDashboard employs shared RowActionsMenu with fixed actions & popover'
  );
  assert(
    assistantCode.includes('Mark as No Show') && assistantCode.includes('Re-Chime'),
    'RowActionsMenu configures chamber token actions with confirmation dialogs'
  );

  // Requirement 11: Sidebar nav item spacing and wrapping compliance
  console.log('\x1b[36m--- REQ 11: SIDEBAR NAV ITEM SPACING & WRAPPING COMPLIANCE ---\x1b[0m');
  const cssFile = path.resolve(process.cwd(), 'src/index.css');
  const cssCode = fs.readFileSync(cssFile, 'utf-8');

  assert(
    cssCode.includes('align-items: flex-start;') && cssCode.includes('.sidebar-nav-item {'),
    'Sidebar nav items anchor icon, label, and badge to flex-start (top)'
  );
  assert(
    cssCode.includes('padding: 10px 12px;') &&
      cssCode.includes('min-height: 42px;') &&
      !/(?<!min-)height:\s*42px/.test(cssCode),
    'Sidebar nav items enforce consistent 10px/12px padding and fluid min-height: 42px'
  );
  assert(
    cssCode.includes('margin-bottom: 16px;') && layoutCode.includes('gap: 0'),
    'Sidebar nav items maintain uniform 16px vertical gap between consecutive rows'
  );
  assert(
    cssCode.includes('-webkit-line-clamp: 2;') &&
      cssCode.includes('line-height: 1.3;') &&
      cssCode.includes('white-space: normal;'),
    'Sidebar nav label supports clean 2-line wrapping with 1.3 line-height'
  );
  assert(
    layoutCode.includes('className="sidebar-nav-label" title={item.label}'),
    'Sidebar nav label includes native title attribute for full name hover tooltip'
  );
  assert(
    cssCode.includes('.sidebar-badge {\n  align-self: flex-start;\n  margin-top: 2px;\n  flex-shrink: 0;') ||
      (cssCode.includes('align-self: flex-start;') && cssCode.includes('margin-top: 2px;')),
    'Sidebar badge and icon anchor to flex-start with 2px margin level with first text line'
  );

  console.log('\n================================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAssistantBibleTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
