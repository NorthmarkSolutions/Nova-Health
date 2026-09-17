import React, { useState } from 'react';
import {
  LayoutGrid,
  Stethoscope,
  FlaskConical,
  Coins,
  Shield,
  Wrench,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Clock,
  UserCheck,
  Settings,
  Layers,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { DepartmentProfileView, DepartmentProfileData } from './DepartmentProfileView';
import { RegisterDepartmentWizardModal } from './RegisterDepartmentWizardModal';

export const DepartmentsSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'clinical' | 'diagnostic' | 'revenue' | 'admin' | 'support'
  >('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeViewDept, setActiveViewDept] = useState<DepartmentProfileData | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [departments, setDepartments] = useState<DepartmentProfileData[]>([
    // Clinical
    {
      id: '1',
      code: 'DEPT-OPD',
      name: 'Outpatient Department (OPD)',
      shortName: 'OPD',
      category: 'clinical',
      head: 'Dr. Sarah Jenkins',
      hours: '08:00 - 20:00 (Mon-Sat)',
      costCenter: 'CC-CLN-01',
      revenueCenter: 'RC-CLN-01',
      budget: 350000,
      billingEnabled: true,
      staffCount: 24,
      status: 'ACTIVE',
      doctorsCount: 12,
      nursesCount: 8,
      techsCount: 2,
      receptionistsCount: 2,
      assignedBuildingId: 'bld-main-1',
      buildingAssigned: 'North Central Hospital Tower',
      floorAssigned: 'Ground Floor (Level 0)',
      assignedFloorIds: ['fl-main-0'],
      assignedWardIds: [],
      assignedRoomIds: ['rm-005', 'rm-006'],
      roomsCount: 2,
      wardsCount: 0,
      bedsCount: 0,
      hasDedicatedWaitingArea: true,
      consultationEnabled: true,
      admissionEnabled: false,
      procedureEnabled: true,
      labRequestsEnabled: true,
      prescriptionEnabled: true,
    },
    {
      id: '2',
      code: 'DEPT-IPD',
      name: 'Inpatient Department (IPD)',
      shortName: 'IPD',
      category: 'clinical',
      head: 'Dr. Robert Vance',
      hours: '24/7 Continuous',
      costCenter: 'CC-CLN-02',
      revenueCenter: 'RC-CLN-02',
      budget: 850000,
      billingEnabled: true,
      staffCount: 52,
      status: 'ACTIVE',
      doctorsCount: 16,
      nursesCount: 30,
      techsCount: 4,
      receptionistsCount: 2,
      assignedBuildingId: 'bld-main-1',
      buildingAssigned: 'North Central Hospital Tower',
      floorAssigned: 'First Floor (Level 1)',
      assignedFloorIds: ['fl-main-1'],
      assignedWardIds: ['wd-1-1', 'wd-1-2'],
      assignedRoomIds: ['rm-101', 'rm-102'],
      roomsCount: 2,
      wardsCount: 2,
      bedsCount: 5,
      hasDedicatedWaitingArea: true,
      consultationEnabled: true,
      admissionEnabled: true,
      procedureEnabled: true,
      labRequestsEnabled: true,
      prescriptionEnabled: true,
    },
    {
      id: '3',
      code: 'DEPT-ER',
      name: 'Emergency & Trauma (ER)',
      shortName: 'ER / Trauma',
      category: 'clinical',
      head: 'Dr. Neil Patrick',
      hours: '24/7 Emergency',
      costCenter: 'CC-CLN-03',
      revenueCenter: 'RC-CLN-03',
      budget: 650000,
      billingEnabled: true,
      staffCount: 30,
      status: 'ACTIVE',
      doctorsCount: 10,
      nursesCount: 14,
      techsCount: 4,
      receptionistsCount: 2,
      assignedBuildingId: 'bld-main-1',
      buildingAssigned: 'North Central Hospital Tower',
      floorAssigned: 'Ground Floor (Level 0)',
      assignedFloorIds: ['fl-main-0'],
      assignedWardIds: ['wd-0-1'],
      assignedRoomIds: ['rm-001', 'rm-002', 'rm-003', 'rm-004'],
      roomsCount: 4,
      wardsCount: 1,
      bedsCount: 4,
      hasDedicatedWaitingArea: true,
      consultationEnabled: true,
      admissionEnabled: true,
      procedureEnabled: true,
      labRequestsEnabled: true,
      prescriptionEnabled: true,
      emergencyEnabled: true,
      isOpen24Hours: true,
    },
    {
      id: '4',
      code: 'DEPT-ICU',
      name: 'Intensive Critical Care (ICU)',
      shortName: 'ICU',
      category: 'clinical',
      head: 'Dr. Arthur Pendelton',
      hours: '24/7 Critical',
      costCenter: 'CC-CLN-04',
      revenueCenter: 'RC-CLN-04',
      budget: 920000,
      billingEnabled: true,
      staffCount: 28,
      status: 'ACTIVE',
      doctorsCount: 8,
      nursesCount: 16,
      techsCount: 4,
      receptionistsCount: 0,
      assignedBuildingId: 'bld-main-1',
      buildingAssigned: 'North Central Hospital Tower',
      floorAssigned: 'Second Floor (Level 2)',
      assignedFloorIds: ['fl-main-2'],
      assignedWardIds: ['wd-2-1'],
      assignedRoomIds: [],
      roomsCount: 0,
      wardsCount: 1,
      bedsCount: 2,
      consultationEnabled: true,
      admissionEnabled: true,
      procedureEnabled: true,
      labRequestsEnabled: true,
      prescriptionEnabled: true,
      isOpen24Hours: true,
    },
    {
      id: '5',
      code: 'DEPT-OT',
      name: 'Operation Theatre & Surgery (OT)',
      shortName: 'OT Complex',
      category: 'clinical',
      head: 'Dr. Marcus Brody',
      hours: '24/7 Surgeries',
      costCenter: 'CC-CLN-05',
      revenueCenter: 'RC-CLN-05',
      budget: 1100000,
      billingEnabled: true,
      staffCount: 20,
      status: 'ACTIVE',
      doctorsCount: 10,
      nursesCount: 8,
      techsCount: 2,
      receptionistsCount: 0,
      assignedBuildingId: 'bld-main-1',
      buildingAssigned: 'North Central Hospital Tower',
      floorAssigned: 'Second Floor (Level 2)',
      assignedFloorIds: ['fl-main-2'],
      assignedWardIds: [],
      assignedRoomIds: ['rm-201'],
      roomsCount: 1,
      wardsCount: 0,
      bedsCount: 0,
      procedureEnabled: true,
      consultationEnabled: false,
    },
    {
      id: '6',
      code: 'DEPT-NICU',
      name: 'Neonatal ICU (NICU)',
      shortName: 'NICU',
      category: 'clinical',
      head: 'Dr. Emily Thorne',
      hours: '24/7 Neonatal',
      costCenter: 'CC-CLN-06',
      revenueCenter: 'RC-CLN-06',
      budget: 480000,
      billingEnabled: true,
      staffCount: 16,
      status: 'ACTIVE',
      doctorsCount: 4,
      nursesCount: 10,
      techsCount: 2,
      receptionistsCount: 0,
      buildingAssigned: 'Main Inpatient Tower',
      floorAssigned: 'Floor 4 - Maternity Wing',
      roomsCount: 2,
      wardsCount: 1,
      bedsCount: 12,
      isOpen24Hours: true,
    },
    {
      id: '7',
      code: 'DEPT-DIAL',
      name: 'Renal Dialysis Unit',
      shortName: 'Dialysis',
      category: 'clinical',
      head: 'Dr. Kevin Zhao',
      hours: '06:00 - 22:00',
      costCenter: 'CC-CLN-07',
      revenueCenter: 'RC-CLN-07',
      budget: 310000,
      billingEnabled: true,
      staffCount: 12,
      status: 'ACTIVE',
      doctorsCount: 3,
      nursesCount: 6,
      techsCount: 3,
      receptionistsCount: 0,
      buildingAssigned: 'Diagnostic & Oncology Pavilion',
      floorAssigned: 'Floor 1',
      roomsCount: 2,
      wardsCount: 1,
      bedsCount: 10,
      procedureEnabled: true,
    },
    {
      id: '8',
      code: 'DEPT-PHYSIO',
      name: 'Physiotherapy & Rehab',
      shortName: 'Physio',
      category: 'clinical',
      head: 'Dr. Claire Bennett',
      hours: '09:00 - 18:00',
      costCenter: 'CC-CLN-08',
      revenueCenter: 'RC-CLN-08',
      budget: 180000,
      billingEnabled: true,
      staffCount: 8,
      status: 'ACTIVE',
      doctorsCount: 2,
      nursesCount: 2,
      techsCount: 4,
      receptionistsCount: 0,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Ground Floor',
      roomsCount: 3,
      wardsCount: 0,
      bedsCount: 0,
    },

    // Diagnostic
    {
      id: '9',
      code: 'DEPT-LAB',
      name: 'Clinical Biochemistry & Lab',
      shortName: 'Central Lab',
      category: 'diagnostic',
      head: 'Dr. Amanda Chen',
      hours: '24/7 Lab Services',
      costCenter: 'CC-DIAG-01',
      revenueCenter: 'RC-DIAG-01',
      budget: 420000,
      billingEnabled: true,
      staffCount: 14,
      status: 'ACTIVE',
      doctorsCount: 2,
      nursesCount: 0,
      techsCount: 10,
      receptionistsCount: 2,
      buildingAssigned: 'Diagnostic & Oncology Pavilion',
      floorAssigned: 'Ground Floor',
      roomsCount: 5,
      wardsCount: 0,
      bedsCount: 0,
      isOpen24Hours: true,
      labRequestsEnabled: true,
    },
    {
      id: '10',
      code: 'DEPT-RAD',
      name: 'Radiology, CT & MRI',
      shortName: 'Radiology',
      category: 'diagnostic',
      head: 'Dr. Jonathan Ross',
      hours: '24/7 Imaging',
      costCenter: 'CC-DIAG-02',
      revenueCenter: 'RC-DIAG-02',
      budget: 680000,
      billingEnabled: true,
      staffCount: 18,
      status: 'ACTIVE',
      doctorsCount: 4,
      nursesCount: 2,
      techsCount: 10,
      receptionistsCount: 2,
      buildingAssigned: 'Diagnostic & Oncology Pavilion',
      floorAssigned: 'Ground Floor Radiation Wing',
      roomsCount: 6,
      wardsCount: 0,
      bedsCount: 0,
      isOpen24Hours: true,
    },
    {
      id: '11',
      code: 'DEPT-PATH',
      name: 'Histopathology & Cytology',
      shortName: 'Pathology',
      category: 'diagnostic',
      head: 'Dr. Anita Roy',
      hours: '09:00 - 18:00',
      costCenter: 'CC-DIAG-03',
      revenueCenter: 'RC-DIAG-03',
      budget: 220000,
      billingEnabled: true,
      staffCount: 8,
      status: 'ACTIVE',
      doctorsCount: 2,
      nursesCount: 0,
      techsCount: 5,
      receptionistsCount: 1,
      buildingAssigned: 'Diagnostic & Oncology Pavilion',
      floorAssigned: 'Floor 2',
      roomsCount: 4,
      wardsCount: 0,
      bedsCount: 0,
    },
    {
      id: '12',
      code: 'DEPT-BLOOD',
      name: 'Blood Transfusion & Blood Bank',
      shortName: 'Blood Bank',
      category: 'diagnostic',
      head: 'Dr. Michael Chang',
      hours: '24/7 Emergency Transfusion',
      costCenter: 'CC-DIAG-04',
      revenueCenter: 'RC-DIAG-04',
      budget: 350000,
      billingEnabled: true,
      staffCount: 10,
      status: 'ACTIVE',
      doctorsCount: 2,
      nursesCount: 2,
      techsCount: 5,
      receptionistsCount: 1,
      buildingAssigned: 'Emergency & Trauma Pavilion',
      floorAssigned: 'Floor 1',
      roomsCount: 3,
      wardsCount: 0,
      bedsCount: 0,
      isOpen24Hours: true,
    },

    // Revenue
    {
      id: '13',
      code: 'DEPT-BILL',
      name: 'Patient Billing & Cashier Desk',
      shortName: 'Billing',
      category: 'revenue',
      head: 'Susan Alvarez',
      hours: '24/7 Inpatient / OPD Cashier',
      costCenter: 'CC-REV-01',
      revenueCenter: 'RC-REV-01',
      budget: 160000,
      billingEnabled: true,
      staffCount: 12,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 12,
      buildingAssigned: 'Main Inpatient Tower',
      floorAssigned: 'Ground Floor Lobby',
      roomsCount: 4,
      wardsCount: 0,
      bedsCount: 0,
      isOpen24Hours: true,
    },
    {
      id: '14',
      code: 'DEPT-INSUR',
      name: 'Insurance & TPA Helpdesk',
      shortName: 'Insurance / TPA',
      category: 'revenue',
      head: 'David Kumar',
      hours: '08:00 - 20:00 (Pre-Auth)',
      costCenter: 'CC-REV-02',
      revenueCenter: 'RC-REV-02',
      budget: 110000,
      billingEnabled: true,
      staffCount: 6,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 6,
      buildingAssigned: 'Main Inpatient Tower',
      floorAssigned: 'Ground Floor',
      roomsCount: 2,
      wardsCount: 0,
      bedsCount: 0,
    },
    {
      id: '15',
      code: 'DEPT-PHARM',
      name: 'Inpatient & Retail Pharmacy',
      shortName: 'Pharmacy',
      category: 'revenue',
      head: 'David Ross, PharmD',
      hours: '24/7 Pharmacy Counter',
      costCenter: 'CC-REV-03',
      revenueCenter: 'RC-REV-03',
      budget: 550000,
      billingEnabled: true,
      staffCount: 15,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 12,
      receptionistsCount: 3,
      buildingAssigned: 'Main Inpatient Tower',
      floorAssigned: 'Ground Floor Central Dispense',
      roomsCount: 3,
      wardsCount: 0,
      bedsCount: 0,
      isOpen24Hours: true,
    },
    {
      id: '16',
      code: 'DEPT-CORP',
      name: 'Corporate Empanelment Desk',
      shortName: 'Corporate Desk',
      category: 'revenue',
      head: 'Rachel Green',
      hours: '09:00 - 18:00',
      costCenter: 'CC-REV-04',
      revenueCenter: 'RC-REV-04',
      budget: 95000,
      billingEnabled: true,
      staffCount: 4,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 4,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Floor 1',
      roomsCount: 2,
      wardsCount: 0,
      bedsCount: 0,
    },

    // Admin
    {
      id: '17',
      code: 'DEPT-HR',
      name: 'Human Resources & Payroll',
      shortName: 'HR',
      category: 'admin',
      head: 'Patricia Wright',
      hours: '09:00 - 18:00',
      costCenter: 'CC-ADM-01',
      budget: 140000,
      billingEnabled: false,
      staffCount: 8,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 8,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Floor 2',
      roomsCount: 3,
      wardsCount: 0,
      bedsCount: 0,
    },
    {
      id: '18',
      code: 'DEPT-FIN',
      name: 'Finance & Accounts Audit',
      shortName: 'Finance',
      category: 'admin',
      head: 'Franklin Moore, CPA',
      hours: '09:00 - 18:00',
      costCenter: 'CC-ADM-02',
      budget: 130000,
      billingEnabled: false,
      staffCount: 7,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 7,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Floor 2',
      roomsCount: 3,
      wardsCount: 0,
      bedsCount: 0,
    },
    {
      id: '19',
      code: 'DEPT-MRD',
      name: 'Medical Records Department (MRD)',
      shortName: 'MRD',
      category: 'admin',
      head: 'Helen Keller, RHIA',
      hours: '08:00 - 18:00',
      costCenter: 'CC-ADM-03',
      budget: 120000,
      billingEnabled: false,
      staffCount: 9,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 4,
      receptionistsCount: 5,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Basement Archive Suite',
      roomsCount: 4,
      wardsCount: 0,
      bedsCount: 0,
    },
    {
      id: '20',
      code: 'DEPT-LEGAL',
      name: 'Legal & Clinical Compliance',
      shortName: 'Legal & Medico',
      category: 'admin',
      head: 'Adv. Samuel Vance',
      hours: '09:00 - 17:00',
      costCenter: 'CC-ADM-04',
      budget: 150000,
      billingEnabled: false,
      staffCount: 3,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 3,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Floor 3',
      roomsCount: 2,
      wardsCount: 0,
      bedsCount: 0,
    },

    // Support
    {
      id: '21',
      code: 'DEPT-HK',
      name: 'Hospital Housekeeping & Sanitation',
      shortName: 'Housekeeping',
      category: 'support',
      head: 'George Bailey',
      hours: '24/7 Multi-Shift',
      costCenter: 'CC-SUP-01',
      budget: 260000,
      billingEnabled: false,
      staffCount: 48,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 0,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Service Basement',
      roomsCount: 2,
      wardsCount: 0,
      bedsCount: 0,
      isOpen24Hours: true,
    },
    {
      id: '22',
      code: 'DEPT-BIOMED',
      name: 'Biomedical Engineering & Calibration',
      shortName: 'Biomed',
      category: 'support',
      head: 'Eng. Victor Stone',
      hours: '24/7 On-Call Maintenance',
      costCenter: 'CC-SUP-02',
      budget: 210000,
      billingEnabled: false,
      staffCount: 6,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 6,
      receptionistsCount: 0,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Basement Workshop',
      roomsCount: 2,
      wardsCount: 0,
      bedsCount: 0,
      isOpen24Hours: true,
    },
    {
      id: '23',
      code: 'DEPT-SEC',
      name: 'Security & Access Surveillance',
      shortName: 'Security',
      category: 'support',
      head: 'Capt. Roger Davis',
      hours: '24/7 CCTV & Guards',
      costCenter: 'CC-SUP-03',
      budget: 190000,
      billingEnabled: false,
      staffCount: 22,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 0,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Gatehouse & Control Hub',
      roomsCount: 2,
      wardsCount: 0,
      bedsCount: 0,
      isOpen24Hours: true,
    },
    {
      id: '24',
      code: 'DEPT-KITCH',
      name: 'Dietary & Patient Nutrition Kitchen',
      shortName: 'Dietary',
      category: 'support',
      head: 'Chef Maria Santos',
      hours: '05:00 - 22:00 (Meal Schedules)',
      costCenter: 'CC-SUP-04',
      budget: 310000,
      billingEnabled: false,
      staffCount: 18,
      status: 'ACTIVE',
      doctorsCount: 0,
      nursesCount: 0,
      techsCount: 0,
      receptionistsCount: 0,
      buildingAssigned: 'Administration & Support Block',
      floorAssigned: 'Ground Floor Kitchen',
      roomsCount: 3,
      wardsCount: 0,
      bedsCount: 0,
    },
  ]);

  const handleOpenAdd = () => {
    setIsAddModalOpen(true);
  };

  const handleSaveAdd = (newDept: DepartmentProfileData) => {
    setDepartments([newDept, ...departments]);
    setIsAddModalOpen(false);
    setActiveViewDept(newDept);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this department?')) {
      setDepartments(departments.filter((d) => d.id !== id));
      if (activeViewDept?.id === id) {
        setActiveViewDept(null);
      }
    }
  };

  const handleUpdateDept = (updated: DepartmentProfileData) => {
    setDepartments(departments.map((d) => (d.id === updated.id ? updated : d)));
    setActiveViewDept(updated);
  };

  // If a department is selected for deep profile view/configuration, render DepartmentProfileView!
  if (activeViewDept) {
    return (
      <DepartmentProfileView
        department={activeViewDept}
        allDepartments={departments}
        onBack={() => setActiveViewDept(null)}
        onSave={handleUpdateDept}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div>
      {/* Category Filter Pills */}
      <div className="subtab-bar" style={{ marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        <button
          className={`subtab-pill ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          <LayoutGrid size={15} /> All Departments ({departments.length})
        </button>
        <button
          className={`subtab-pill ${activeCategory === 'clinical' ? 'active' : ''}`}
          onClick={() => setActiveCategory('clinical')}
        >
          <Stethoscope size={15} /> Clinical ({departments.filter((d) => d.category === 'clinical').length})
        </button>
        <button
          className={`subtab-pill ${activeCategory === 'diagnostic' ? 'active' : ''}`}
          onClick={() => setActiveCategory('diagnostic')}
        >
          <FlaskConical size={15} /> Diagnostic ({departments.filter((d) => d.category === 'diagnostic').length})
        </button>
        <button
          className={`subtab-pill ${activeCategory === 'revenue' ? 'active' : ''}`}
          onClick={() => setActiveCategory('revenue')}
        >
          <Coins size={15} /> Revenue & Billing ({departments.filter((d) => d.category === 'revenue').length})
        </button>
        <button
          className={`subtab-pill ${activeCategory === 'admin' ? 'active' : ''}`}
          onClick={() => setActiveCategory('admin')}
        >
          <Shield size={15} /> Administration & HR ({departments.filter((d) => d.category === 'admin').length})
        </button>
        <button
          className={`subtab-pill ${activeCategory === 'support' ? 'active' : ''}`}
          onClick={() => setActiveCategory('support')}
        >
          <Wrench size={15} /> Support & Facilities ({departments.filter((d) => d.category === 'support').length})
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            placeholder="Search departments by code, name, head, or cost center..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> + Register Department
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Department Name</th>
              <th>Category</th>
              <th>Department Head</th>
              <th>Working Hours</th>
              <th>Cost Center</th>
              <th>Staff / Space</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>⚙ Configuration</th>
            </tr>
          </thead>
          <tbody>
            {departments
              .filter(
                (d) =>
                  (activeCategory === 'all' || d.category === activeCategory) &&
                  (d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    d.head.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    d.costCenter.toLowerCase().includes(searchQuery.toLowerCase()))
              )
              .map((dept) => (
                <tr
                  key={dept.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setActiveViewDept(dept)}
                  title="Click to open Department Profile"
                >
                  <td>
                    <strong>{dept.code}</strong>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong>{dept.name}</strong>
                      {dept.buildingAssigned && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {dept.buildingAssigned} • {dept.floorAssigned || 'Floor 1'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        dept.category === 'clinical'
                          ? 'badge-info'
                          : dept.category === 'diagnostic'
                          ? 'badge-warning'
                          : dept.category === 'revenue'
                          ? 'badge-success'
                          : 'badge-secondary'
                      }`}
                    >
                      {dept.category}
                    </span>
                  </td>
                  <td>{dept.head}</td>
                  <td>
                    <span style={{ fontSize: '0.8125rem' }}>{dept.hours}</span>
                  </td>
                  <td>
                    <code>{dept.costCenter}</code>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      <span className="badge badge-secondary">{dept.staffCount} Staff</span>
                      {(dept.bedsCount || 0) > 0 && (
                        <span className="badge badge-info">{dept.bedsCount} Beds</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        dept.status === 'ACTIVE'
                          ? 'badge-success'
                          : dept.status === 'UNDER_MAINTENANCE'
                          ? 'badge-warning'
                          : 'badge-secondary'
                      }`}
                    >
                      {dept.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                        onClick={() => setActiveViewDept(dept)}
                        title="Open Department Profile & 9 Operational Modules"
                      >
                        <Settings size={13} /> ⚙ Profile
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(dept.id)}
                        title="Delete Department"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* 5-Step Hospital Admin Provisioning Wizard */}
      <RegisterDepartmentWizardModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveAdd}
      />
    </div>
  );
};
