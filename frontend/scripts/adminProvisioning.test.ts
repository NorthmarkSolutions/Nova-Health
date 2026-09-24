import './setupEnv.ts';
import { adminProvisioningService } from '../src/services/adminProvisioningService.ts';
import { BuildingNode } from '../src/pages/admin/setup/organization/CampusInfrastructureSection.tsx';
import { DepartmentProfileData } from '../src/pages/admin/setup/organization/DepartmentProfileView.tsx';
import { StaffMember } from '../src/pages/admin/setup/organization/hospitalStaffStore.ts';
import { getDepartmentDoctors, getDepartmentTariffMaster } from '../src/pages/department/departmentWorkspaceStore.ts';

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

async function runAdminProvisioningTest() {
  console.log('\n================================================================================');
  console.log('       NORTH HOSPITAL HMS: ADMIN LEVEL ENTITY PROVISIONING TEST');
  console.log('================================================================================\n');

  // ---------------------------------------------------------------------------
  // STAGE 1: ADMIN CREATES A NEW BUILDING IN CAMPUS INFRASTRUCTURE
  // ---------------------------------------------------------------------------
  console.log('\x1b[36m--- STAGE 1: CAMPUS INFRASTRUCTURE (Create New Hospital Building) ---\x1b[0m');

  const newBuildingId = 'bld-cardio-pavilion';
  const newBuildingCode = 'BLD-CARDIO';
  const newBuildingName = 'Cardiovascular Sciences & Surgery Pavilion';

  const newBuilding: BuildingNode = {
    id: newBuildingId,
    code: newBuildingCode,
    name: newBuildingName,
    buildingType: 'Main Clinical Hospital Tower',
    totalFloorsCount: 3,
    basementCount: 1,
    buildingAdmin: 'Eng. Marcus Brody (Biomedical & Facilities)',
    intercomExt: 'Ext: 4401',
    operatingHours: '24/7 Tertiary Cardiac Emergency & CCU',
    fireNocStatus: 'APPROVED',
    fireZone: 'Zone Cardio-WetRiser',
    powerBackupKva: 750,
    hasCentralOxygen: true,
    stretcherLifts: 4,
    utilities: 'Dual Substation DG, Dedicated Cryogenic O2, Central Vacuum & Telemetry',
    floors: [
      {
        id: 'fl-card-0',
        floorNumber: '0',
        code: 'FL-CARD-0',
        name: 'Ground Floor - Emergency Cardiac Triage',
        supervisorNurse: 'Nurse Clara Adams',
        wards: [
          {
            id: 'wd-card-triage',
            code: 'WD-CARD-TR',
            name: 'Rapid Chest Pain Evaluation Bay',
            floorId: 'fl-card-0',
            wardType: 'Emergency Observation Ward',
            totalBeds: 4,
            dailyTariff: 180,
            beds: [
              {
                id: 'bed-card-1',
                code: 'BED-CARD-01',
                bedNumber: 'Bay C-1',
                roomNumber: 'Chamber 101',
                roomType: 'Triage Unit',
                bedType: 'Monitored ICU Bed',
                dailyTariff: 180,
                status: 'AVAILABLE',
                cleanlinessStatus: 'SANITIZED',
              },
            ],
          },
        ],
        rooms: [
          {
            id: 'rm-card-101',
            roomNumber: 'CH-101',
            name: 'Consultation Chamber 101',
            type: 'CONSULTATION',
            floorId: 'fl-card-0',
            floorNumber: '0',
            status: 'AVAILABLE',
            dailyTariff: 120,
            hourlyTariff: 25,
            capacity: 4,
          },
        ],
      },
      {
        id: 'fl-card-1',
        floorNumber: '1',
        code: 'FL-CARD-1',
        name: 'Level 1 - Coronary Step-Down & Telemetry Ward',
        supervisorNurse: 'Nurse Elena Rostova',
        wards: [
          {
            id: 'wd-card-telemetry',
            code: 'WD-CARD-TEL',
            name: 'Cardiac Step-Down Telemetry Ward',
            floorId: 'fl-card-1',
            wardType: 'Inpatient Specialty Ward',
            totalBeds: 8,
            dailyTariff: 220,
            beds: [],
          },
        ],
        rooms: [],
      },
    ],
  };

  adminProvisioningService.createBuilding(newBuilding);
  const fetchedBuilding = adminProvisioningService.getBuildingById(newBuildingId);

  assert(!!fetchedBuilding, 'New building created and persisted in Campus Infrastructure', `ID: ${fetchedBuilding?.id}, Name: ${fetchedBuilding?.name}`);
  assert(fetchedBuilding?.code === newBuildingCode, `Building code verified as '${newBuildingCode}'`);
  assert(fetchedBuilding?.hasCentralOxygen === true, 'Central Medical Gas Pipeline (Oxygen) flag verified');
  assert(fetchedBuilding?.powerBackupKva === 750, 'Power Backup verified at 750 kVA DG capacity');
  assert(fetchedBuilding?.floors.length === 2, '2 Clinical Floors provisioned with telemetry wards & rooms');

  // ---------------------------------------------------------------------------
  // STAGE 2: ADMIN CREATES A NEW DEPARTMENT ASSIGNED TO THIS BUILDING
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[36m--- STAGE 2: DEPARTMENTS MASTER (Create New Clinical Department) ---\x1b[0m');

  const newDeptId = 'dept-cardiology';
  const newDeptCode = 'DEPT-CARDIO';
  const newDeptName = 'Cardiology & Cardiovascular Sciences';

  const newDepartment: DepartmentProfileData = {
    id: newDeptId,
    code: newDeptCode,
    name: newDeptName,
    shortName: 'Cardiology',
    category: 'clinical',
    head: 'Dr. Arthur Vance',
    hours: '24/7 Tertiary Cardiology & Emergency',
    costCenter: 'CC-CARD-01',
    revenueCenter: 'RC-CARD-01',
    budget: 850000,
    billingEnabled: true,
    staffCount: 0,
    status: 'ACTIVE',
    doctorsCount: 0,
    nursesCount: 0,
    techsCount: 0,
    receptionistsCount: 0,
    assignedBuildingId: newBuildingId,
    buildingAssigned: newBuildingName,
    floorAssigned: 'Ground Floor & Level 1',
    assignedFloorIds: ['fl-card-0', 'fl-card-1'],
    assignedWardIds: ['wd-card-triage', 'wd-card-telemetry'],
    assignedRoomIds: ['rm-card-101'],
    roomsCount: 1,
    wardsCount: 2,
    bedsCount: 12,
    hasDedicatedWaitingArea: true,
    consultationEnabled: true,
    admissionEnabled: true,
    procedureEnabled: true,
    labRequestsEnabled: true,
    prescriptionEnabled: true,
    isOpen24Hours: true,
    emergencyEnabled: true,
  };

  adminProvisioningService.createDepartment(newDepartment);
  const fetchedDept = adminProvisioningService.getDepartmentById(newDeptId);

  assert(!!fetchedDept, 'New department created in Department Master', `Code: ${fetchedDept?.code}, Name: ${fetchedDept?.name}`);
  assert(fetchedDept?.assignedBuildingId === newBuildingId, `Department physically assigned to building '${newBuildingName}'`);
  assert(fetchedDept?.category === 'clinical' && fetchedDept.billingEnabled === true, 'Department designated as Clinical with Revenue & Billing enabled');
  assert(fetchedDept?.isOpen24Hours === true, '24/7 Emergency & Inpatient care flags activated');

  // ---------------------------------------------------------------------------
  // STAGE 3: ADMIN ADDS A NEW STAFF MEMBER (CARDIOLOGIST)
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[36m--- STAGE 3: STAFF MASTER (Add New Physician / Specialist) ---\x1b[0m');

  const newStaffId = 'stf-cardio-101';
  const newEmployeeCode = 'DOC-CARDIO-101';

  const newStaffMember: StaffMember = {
    id: newStaffId,
    employeeCode: newEmployeeCode,
    fullName: 'Dr. Arthur Vance',
    role: 'doctor',
    designation: 'Head of Cardiology & Senior Interventional Cardiologist',
    specialization: 'Interventional Cardiology & Catheterization',
    qualification: 'MD, DM (Cardiology), FACC',
    experienceYears: 16,
    registrationNumber: 'MCI-CARD-99214',
    email: 'arthur.vance@northhospital.com',
    phone: '+1 (555) 782-3490',
    gender: 'Male',
    dob: '1978-04-12',
    bloodGroup: 'A+',
    status: 'ACTIVE',
    shiftId: 'shift-morn',
    shiftName: 'Morning Shift (OPD & General Wards)',
    shiftHours: '08:00 - 16:00',
    consultationFee: 120,
    consultationDurationMinutes: 20,
    dailyPatientCapacity: 35,
    isDepartmentHead: true,
    hodDepartmentId: newDeptId,
    hodDepartmentName: newDeptName,
    joiningDate: '2026-09-24',
  };

  adminProvisioningService.createStaff(newStaffMember);
  const fetchedStaff = adminProvisioningService.getStaffById(newStaffId);

  assert(!!fetchedStaff, 'New doctor registered in Staff Master roster', `Name: ${fetchedStaff?.fullName}, Code: ${fetchedStaff?.employeeCode}`);
  assert(fetchedStaff?.specialization?.includes('Cardiology'), 'Specialization confirmed as Interventional Cardiology');
  assert(fetchedStaff?.consultationFee === 120, 'Consultation Tariff configured at $120.00 USD');

  // ---------------------------------------------------------------------------
  // STAGE 4: ASSIGN STAFF TO NEW DEPARTMENT & VERIFY BIDIRECTIONAL SYNC
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[36m--- STAGE 4: ASSIGN STAFF TO DEPARTMENT & SYNCHRONIZE ---\x1b[0m');

  adminProvisioningService.assignStaffToDepartment(
    [newStaffId],
    newDeptId,
    newDeptName,
    newBuildingId,
    newBuildingName
  );

  const updatedStaff = adminProvisioningService.getStaffById(newStaffId);
  assert(
    updatedStaff?.departmentIds?.includes(newDeptId) || updatedStaff?.departmentId === newDeptId,
    `Dr. Arthur Vance assigned to '${newDeptName}'`
  );
  assert(
    updatedStaff?.buildingId === newBuildingId,
    `Dr. Arthur Vance workstation mapped to '${newBuildingName}'`
  );

  // Department Statistics Check
  const deptStats = adminProvisioningService.getDepartmentStats(newDeptId, newDeptName);
  assert(deptStats.total >= 1, `Department personnel stats reflects ${deptStats.total} total assigned staff`);
  assert(deptStats.doctors >= 1, `Department doctors count calculated as ${deptStats.doctors}`);
  assert(deptStats.hodName === 'Dr. Arthur Vance', 'Dr. Arthur Vance successfully designated as Department Head (HOD)');

  // Verify Master Department record sync
  const syncedDept = adminProvisioningService.getDepartmentById(newDeptId);
  assert(
    syncedDept?.staffCount !== undefined && syncedDept.staffCount >= 1,
    `Department master record auto-synchronized staffCount (${syncedDept?.staffCount})`
  );

  // ---------------------------------------------------------------------------
  // STAGE 5: DEPARTMENT WORKSPACE AUTO-PROVISIONING & CLINICAL READINESS
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[36m--- STAGE 5: DEPARTMENT WORKSPACE (Engine Readiness for New Department) ---\x1b[0m');

  const workspace = adminProvisioningService.getWorkspace(newDeptId);
  assert(!!workspace, `Dedicated workspace provisioned for '${newDeptName}'`, `Workspace ID: ${workspace?.id}`);
  assert(workspace?.config.hasAppointments === true && workspace.config.hasQueue === true, 'OPD consultation queues and appointment booking initialized');
  assert(workspace?.config.hasAdmissions === true, 'Inpatient & CCU admissions enabled');

  // Verify doctor catalog in department workspace
  const deptDoctors = getDepartmentDoctors(newDeptId);
  assert(deptDoctors.length >= 1, `Department doctor roster contains ${deptDoctors.length} attending physicians`);
  const cardioDoc = deptDoctors.find((d) => d.staffId === newStaffId || d.fullName === 'Dr. Arthur Vance');
  assert(!!cardioDoc, 'Dr. Arthur Vance active and schedulable in department consultation roster');

  // Verify department tariffs
  const deptTariff = getDepartmentTariffMaster(newDeptId);
  assert(!!deptTariff, 'Department tariff master initialized with multi-tier fee structures');
  assert(deptTariff.currency === 'USD', 'Currency set to USD');

  // Final Summary
  console.log('\n================================================================================');
  console.log(`                       TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('================================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAdminProvisioningTest().catch((err) => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});
