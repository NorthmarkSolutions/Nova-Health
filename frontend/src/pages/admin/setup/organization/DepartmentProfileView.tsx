import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Building2,
  Layers,
  DoorClosed,
  BedDouble,
  Stethoscope,
  FlaskConical,
  Coins,
  Shield,
  Wrench,
  Clock,
  User,
  Users,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  FileText,
  Upload,
  Download,
  GitMerge,
  Archive,
  Trash2,
  Plus,
  Edit2,
  Lock,
  Calendar,
  DollarSign,
  Activity,
  Sparkles,
  ArrowRightLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info,
  LayoutGrid,
} from 'lucide-react';
import {
  BuildingNode,
  FloorNode,
  WardNode,
  RoomNode,
  BedNode,
  getCampusBuildings,
  saveCampusBuildings,
  syncDepartmentToCampus,
} from './CampusInfrastructureSection';

export interface DepartmentProfileData {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  category: 'clinical' | 'diagnostic' | 'revenue' | 'admin' | 'support';
  description?: string;
  head: string;
  hours: string;
  costCenter: string;
  revenueCenter?: string;
  budget?: number;
  billingEnabled?: boolean;
  staffCount: number;
  status: 'ACTIVE' | 'INACTIVE' | 'UNDER_MAINTENANCE' | 'ARCHIVED' | 'MERGED';

  // 2. Operational Settings
  isOpen24Hours?: boolean;
  workingDays?: string[];
  shiftPattern?: string;
  appointmentBased?: boolean;
  walkInAllowed?: boolean;
  emergencyEnabled?: boolean;

  // 4. Clinical Settings
  consultationEnabled?: boolean;
  admissionEnabled?: boolean;
  procedureEnabled?: boolean;
  labRequestsEnabled?: boolean;
  prescriptionEnabled?: boolean;

  // 5. Staff Settings
  doctorsCount?: number;
  nursesCount?: number;
  techsCount?: number;
  receptionistsCount?: number;
  onCallRoster?: string;

  // 6. Infrastructure & Physical Campus Allocation
  buildingAssigned?: string;
  floorAssigned?: string;
  roomsCount?: number;
  wardsCount?: number;
  bedsCount?: number;
  hasDedicatedWaitingArea?: boolean;

  assignedBuildingId?: string;
  assignedFloorIds?: string[];
  assignedWardIds?: string[];
  assignedRoomIds?: string[];
  allocatedWards?: Array<{
    wardId: string;
    wardName: string;
    wardType: string;
    floorNumber: string;
    bedCount: number;
    supervisorNurse?: string;
  }>;
  allocatedRooms?: Array<{
    roomId: string;
    roomNumber: string;
    roomType: string;
    floorNumber: string;
  }>;

  // 7. Documents & SOPs
  documents?: Array<{
    id: string;
    title: string;
    type: string;
    version: string;
    updatedAt: string;
    status: 'Approved' | 'In Review' | 'Draft';
  }>;

  // 8. Role & Permissions
  permissions?: {
    doctor: { viewPatients: boolean; clinicalNotes: boolean; prescribe: boolean; orderDiagnostics: boolean };
    nurse: { vitalsEntry: boolean; medicationAdmin: boolean; wardHandover: boolean };
    receptionist: { checkIn: boolean; queueToken: boolean; opdBooking: boolean };
    billingStaff: { chargeSlip: boolean; discountAuth: boolean };
  };
}

interface Props {
  department: DepartmentProfileData;
  allDepartments: DepartmentProfileData[];
  onBack: () => void;
  onSave: (updated: DepartmentProfileData) => void;
  onDelete?: (id: string) => void;
}

export const DepartmentProfileView: React.FC<Props> = ({
  department,
  allDepartments,
  onBack,
  onSave,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'basic'
    | 'operational'
    | 'financial'
    | 'clinical'
    | 'staff'
    | 'infrastructure'
    | 'documents'
    | 'permissions'
    | 'lifecycle'
  >('basic');

  // Initialize editable form with fallback defaults
  const [campusBuildings, setCampusBuildings] = useState<BuildingNode[]>(() => getCampusBuildings());
  const [profile, setProfile] = useState<DepartmentProfileData>({
    ...department,
    shortName: department.shortName || department.code.replace('DEPT-', ''),
    description:
      department.description ||
      `Primary operational division providing healthcare, diagnostics or administrative support for ${department.name}.`,
    revenueCenter: department.revenueCenter || `RC-${department.costCenter.replace('CC-', '')}`,
    budget: department.budget || (department.category === 'clinical' ? 450000 : 180000),
    billingEnabled: department.billingEnabled !== undefined ? department.billingEnabled : true,
    isOpen24Hours: department.isOpen24Hours !== undefined ? department.isOpen24Hours : department.hours.includes('24/7'),
    workingDays: department.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    shiftPattern: department.shiftPattern || (department.hours.includes('24/7') ? '3-Shift 24x7 (Rotational)' : 'General 2-Shift (08:00 - 20:00)'),
    appointmentBased: department.appointmentBased !== undefined ? department.appointmentBased : department.category === 'clinical',
    walkInAllowed: department.walkInAllowed !== undefined ? department.walkInAllowed : true,
    emergencyEnabled: department.emergencyEnabled !== undefined ? department.emergencyEnabled : ['DEPT-ER', 'DEPT-ICU'].includes(department.code),

    // Clinical
    consultationEnabled: department.consultationEnabled !== undefined ? department.consultationEnabled : department.category === 'clinical',
    admissionEnabled: department.admissionEnabled !== undefined ? department.admissionEnabled : ['DEPT-IPD', 'DEPT-ICU', 'DEPT-ER'].includes(department.code),
    procedureEnabled: department.procedureEnabled !== undefined ? department.procedureEnabled : ['DEPT-OT', 'DEPT-ER', 'DEPT-DIAL'].includes(department.code),
    labRequestsEnabled: department.labRequestsEnabled !== undefined ? department.labRequestsEnabled : ['clinical', 'diagnostic'].includes(department.category),
    prescriptionEnabled: department.prescriptionEnabled !== undefined ? department.prescriptionEnabled : department.category === 'clinical',

    // Staff
    doctorsCount: department.doctorsCount || (department.category === 'clinical' ? 8 : 1),
    nursesCount: department.nursesCount || (department.category === 'clinical' ? 14 : 0),
    techsCount: department.techsCount || (['clinical', 'diagnostic'].includes(department.category) ? 6 : 2),
    receptionistsCount: department.receptionistsCount || 2,
    onCallRoster: department.onCallRoster || 'Duty Registrar (Ext: 104) • Senior Consultant on SMS Page',

    // Infrastructure & Campus links
    buildingAssigned: department.buildingAssigned || (department.category === 'clinical' ? 'North Central Hospital Tower' : 'Diagnostic & Oncology Pavilion'),
    floorAssigned: department.floorAssigned || 'Floor 1 - Wing A',
    roomsCount: department.roomsCount || 6,
    wardsCount: department.wardsCount || (['DEPT-IPD', 'DEPT-ICU', 'DEPT-NICU'].includes(department.code) ? 2 : 0),
    bedsCount: department.bedsCount || (['DEPT-IPD', 'DEPT-ICU', 'DEPT-NICU'].includes(department.code) ? 36 : 0),
    hasDedicatedWaitingArea: department.hasDedicatedWaitingArea !== undefined ? department.hasDedicatedWaitingArea : true,
    assignedBuildingId: department.assignedBuildingId || 'bld-main-1',
    assignedFloorIds: department.assignedFloorIds || [],
    assignedWardIds: department.assignedWardIds || [],
    assignedRoomIds: department.assignedRoomIds || [],

    // Documents
    documents: department.documents || [
      { id: '1', title: `${department.name} Clinical Standard Operating Procedure`, type: 'SOP', version: 'v2.4', updatedAt: '2026-08-15', status: 'Approved' },
      { id: '2', title: 'Emergency Response & Evacuation Protocol', type: 'Emergency Protocol', version: 'v1.2', updatedAt: '2026-07-10', status: 'Approved' },
      { id: '3', title: 'Department Infection Control & Sterilization Guide', type: 'Clinical Guidelines', version: 'v3.0', updatedAt: '2026-09-01', status: 'In Review' },
    ],

    // Permissions
    permissions: department.permissions || {
      doctor: { viewPatients: true, clinicalNotes: true, prescribe: true, orderDiagnostics: true },
      nurse: { vitalsEntry: true, medicationAdmin: true, wardHandover: true },
      receptionist: { checkIn: true, queueToken: true, opdBooking: true },
      billingStaff: { chargeSlip: true, discountAuth: false },
    },
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [targetMergeDeptId, setTargetMergeDeptId] = useState('');
  const [mergeConfirmationText, setMergeConfirmationText] = useState('');
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Campus Space Reallocation Modal
  const [isReallocateModalOpen, setIsReallocateModalOpen] = useState(false);
  const [tempBuildingId, setTempBuildingId] = useState('bld-main-1');
  const [tempWardIds, setTempWardIds] = useState<string[]>([]);
  const [tempRoomIds, setTempRoomIds] = useState<string[]>([]);

  // Calculate live departmental assets from the real campus master
  const { departmentalWards, departmentalRooms, liveBedStats } = useMemo(() => {
    const wardsList: Array<{ ward: WardNode; floor: FloorNode; building: BuildingNode }> = [];
    const roomsList: Array<{ room: RoomNode; floor: FloorNode; building: BuildingNode }> = [];

    campusBuildings.forEach((b) => {
      b.floors.forEach((f) => {
        f.wards.forEach((w) => {
          const isAssigned =
            (profile.assignedWardIds && profile.assignedWardIds.includes(w.id)) ||
            (w.departmentName && (w.departmentName === profile.name || w.departmentName.toLowerCase() === profile.name.toLowerCase()));
          if (isAssigned) {
            wardsList.push({ ward: w, floor: f, building: b });
          }
        });
        f.rooms.forEach((r) => {
          const isAssigned =
            (profile.assignedRoomIds && profile.assignedRoomIds.includes(r.id)) ||
            (r.departmentName && (r.departmentName === profile.name || r.departmentName.toLowerCase() === profile.name.toLowerCase()));
          if (isAssigned) {
            roomsList.push({ room: r, floor: f, building: b });
          }
        });
      });
    });

    const totalBeds = wardsList.reduce((sum, item) => sum + item.ward.beds.length, 0);
    const occupiedBeds = wardsList.reduce(
      (sum, item) => sum + item.ward.beds.filter((b) => b.status === 'OCCUPIED').length,
      0
    );
    const availableBeds = wardsList.reduce(
      (sum, item) => sum + item.ward.beds.filter((b) => b.status === 'AVAILABLE').length,
      0
    );
    const sanitizedBeds = wardsList.reduce(
      (sum, item) => sum + item.ward.beds.filter((b) => b.cleanlinessStatus === 'SANITIZED').length,
      0
    );

    return {
      departmentalWards: wardsList,
      departmentalRooms: roomsList,
      liveBedStats: {
        totalBeds: totalBeds > 0 ? totalBeds : (profile.bedsCount || 0),
        occupiedBeds,
        availableBeds: totalBeds > 0 ? availableBeds : Math.max(0, (profile.bedsCount || 0) - occupiedBeds),
        sanitizedBeds,
      },
    };
  }, [campusBuildings, profile.assignedWardIds, profile.assignedRoomIds, profile.name, profile.bedsCount]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveAll = () => {
    syncDepartmentToCampus(
      profile.name,
      profile.assignedBuildingId || 'bld-main-1',
      profile.assignedWardIds || [],
      profile.assignedRoomIds || []
    );
    onSave(profile);
    showToast(`✓ Department profile for "${profile.name}" saved successfully!`);
  };

  const handleOpenReallocateModal = () => {
    const currentBuildingId = profile.assignedBuildingId || campusBuildings[0]?.id || 'bld-main-1';
    setTempBuildingId(currentBuildingId);
    setTempWardIds(departmentalWards.map((item) => item.ward.id));
    setTempRoomIds(departmentalRooms.map((item) => item.room.id));
    setIsReallocateModalOpen(true);
  };

  const handleSaveReallocation = () => {
    const targetBuilding = campusBuildings.find((b) => b.id === tempBuildingId) || campusBuildings[0];
    let totalBeds = 0;
    let totalWards = 0;
    let totalRooms = 0;
    const floorNumbers = new Set<string>();

    targetBuilding.floors.forEach((f) => {
      f.wards.forEach((w) => {
        if (tempWardIds.includes(w.id)) {
          totalWards += 1;
          totalBeds += w.beds.length;
          floorNumbers.add(f.floorNumber);
        }
      });
      f.rooms.forEach((r) => {
        if (tempRoomIds.includes(r.id)) {
          totalRooms += 1;
          floorNumbers.add(f.floorNumber);
        }
      });
    });

    const updated: DepartmentProfileData = {
      ...profile,
      assignedBuildingId: tempBuildingId,
      buildingAssigned: targetBuilding.name,
      floorAssigned: Array.from(floorNumbers).join(', ') || profile.floorAssigned,
      assignedWardIds: tempWardIds,
      assignedRoomIds: tempRoomIds,
      wardsCount: totalWards,
      bedsCount: totalBeds,
      roomsCount: totalRooms,
    };

    setProfile(updated);
    syncDepartmentToCampus(profile.name, tempBuildingId, tempWardIds, tempRoomIds);
    setCampusBuildings(getCampusBuildings());
    setIsReallocateModalOpen(false);
    showToast(
      `✓ Campus infrastructure reallocated: ${totalWards} wards (${totalBeds} beds) & ${totalRooms} rooms allocated to ${profile.name}!`
    );
  };

  const handleMergeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mergeConfirmationText.trim().toUpperCase() !== 'MERGE') {
      alert('Please type MERGE to confirm department consolidation.');
      return;
    }
    const targetDept = allDepartments.find((d) => d.id === targetMergeDeptId);
    const updated: DepartmentProfileData = {
      ...profile,
      status: 'MERGED',
      description: `${profile.description} [Consolidated into ${targetDept?.name || 'target department'} on ${new Date().toLocaleDateString()}]`,
    };
    setProfile(updated);
    onSave(updated);
    setIsMergeModalOpen(false);
    showToast(`✓ Department successfully consolidated into ${targetDept?.name || 'target department'}!`);
  };

  const handleArchiveConfirm = () => {
    const updated: DepartmentProfileData = {
      ...profile,
      status: 'ARCHIVED',
    };
    setProfile(updated);
    onSave(updated);
    setIsArchiveModalOpen(false);
    showToast(`✓ Department marked as ARCHIVED. Historical patient and financial records remain preserved.`);
  };

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (day: string) => {
    const current = profile.workingDays || [];
    if (current.includes(day)) {
      setProfile({ ...profile, workingDays: current.filter((d) => d !== day) });
    } else {
      setProfile({ ...profile, workingDays: [...current, day] });
    }
  };

  const isClinical = ['clinical', 'diagnostic'].includes(profile.category);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast Banner */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            padding: '0.875rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Breadcrumb */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--card-bg, #ffffff)',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onBack}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem' }}
          >
            <ArrowLeft size={16} /> Back to Departments
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                {profile.name}
              </h2>
              <span
                className={`badge ${
                  profile.category === 'clinical'
                    ? 'badge-info'
                    : profile.category === 'diagnostic'
                    ? 'badge-warning'
                    : profile.category === 'revenue'
                    ? 'badge-success'
                    : 'badge-secondary'
                }`}
              >
                {profile.category.toUpperCase()}
              </span>
              <span
                className={`badge ${
                  profile.status === 'ACTIVE'
                    ? 'badge-success'
                    : profile.status === 'UNDER_MAINTENANCE'
                    ? 'badge-warning'
                    : 'badge-secondary'
                }`}
              >
                {profile.status}
              </span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Department Code: <strong>{profile.code}</strong> • Cost Center: <strong>{profile.costCenter}</strong> • Head: <strong>{profile.head}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleOpenReallocateModal}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
          >
            <Building2 size={15} /> Reallocate Space
          </button>
          {isEditMode ? (
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditMode(false)}
                style={{ fontSize: '0.8125rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  handleSaveAll();
                  setIsEditMode(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
              >
                <Save size={15} /> Save Changes
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsEditMode(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
            >
              <Edit2 size={15} /> ✏️ Edit Department
            </button>
          )}
        </div>
      </div>

      {/* Executive Administrative KPI Command Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Active Personnel
          </span>
          <span style={{ fontSize: '1.375rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--primary)' }}>
            {(profile.doctorsCount || 0) + (profile.nursesCount || 0) + (profile.techsCount || 0) + (profile.receptionistsCount || 0)} Deployed Staff
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {profile.doctorsCount || 0} Doctors • {profile.nursesCount || 0} Nurses • {profile.techsCount || 0} Techs
          </span>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span
              className="badge"
              style={{
                fontSize: '0.6875rem',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: 'var(--primary)',
                padding: '0.125rem 0.375rem',
              }}
            >
              {liveBedStats.totalBeds > 0 && (profile.nursesCount || 0) > 0
                ? `1 Nurse : ${(liveBedStats.totalBeds / (profile.nursesCount || 1)).toFixed(1)} Beds`
                : 'Ambulatory OPD Model'}
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Physical Footprint
          </span>
          <span style={{ fontSize: '1.375rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--secondary)' }}>
            {profile.roomsCount || departmentalRooms.length || 0} Rooms • {liveBedStats.totalBeds} Beds
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {profile.buildingAssigned} ({departmentalWards.length || profile.wardsCount || 0} Wards)
          </span>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span
              className="badge badge-success"
              style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem' }}
            >
              {liveBedStats.availableBeds} Available
            </span>
            <span
              className="badge badge-warning"
              style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem' }}
            >
              {liveBedStats.occupiedBeds} Occupied
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Operating Schedule
          </span>
          <span style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.25rem', color: '#10b981' }}>
            {profile.isOpen24Hours ? '24/7 Continuous Care' : profile.hours}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {profile.shiftPattern}
          </span>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {profile.emergencyEnabled && (
              <span
                className="badge"
                style={{
                  fontSize: '0.6875rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  padding: '0.125rem 0.375rem',
                }}
              >
                Trauma ER Triage
              </span>
            )}
            {profile.walkInAllowed && (
              <span
                className="badge"
                style={{
                  fontSize: '0.6875rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  padding: '0.125rem 0.375rem',
                }}
              >
                Walk-Ins Allowed
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Financial Ledger
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color: '#0ea5e9' }}>
            ${(profile.budget || 0).toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ yr</span>
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Cost: {profile.costCenter} • Rev: {profile.revenueCenter || 'N/A'}
          </span>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span
              className={`badge ${profile.billingEnabled !== false ? 'badge-success' : 'badge-secondary'}`}
              style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem' }}
            >
              {profile.billingEnabled !== false ? '✓ Direct Patient Billing' : 'Non-Billing Ledger'}
            </span>
          </div>
        </div>
      </div>

      {/* 9 Deep Profile Tabs Navigation */}
      <div
        className="subtab-bar"
        style={{
          backgroundColor: 'var(--card-bg, #ffffff)',
          padding: '0.5rem 0.75rem',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          gap: '0.375rem',
          overflowX: 'auto',
        }}
      >
        <button
          className={`subtab-pill ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          <LayoutGrid size={15} /> 1. Executive Overview
        </button>
        <button
          className={`subtab-pill ${activeTab === 'infrastructure' ? 'active' : ''}`}
          onClick={() => setActiveTab('infrastructure')}
        >
          <Building2 size={15} /> 2. Campus & Beds ({liveBedStats.totalBeds})
        </button>
        <button
          className={`subtab-pill ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          <Users size={15} /> 3. Staff Deployment
        </button>
        <button
          className={`subtab-pill ${activeTab === 'financial' ? 'active' : ''}`}
          onClick={() => setActiveTab('financial')}
        >
          <DollarSign size={15} /> 4. Financials & Tariffs
        </button>
        <button
          className={`subtab-pill ${activeTab === 'clinical' ? 'active' : ''}`}
          onClick={() => setActiveTab('clinical')}
        >
          <Stethoscope size={15} /> 5. Clinical Scope
        </button>
        <button
          className={`subtab-pill ${activeTab === 'operational' ? 'active' : ''}`}
          onClick={() => setActiveTab('operational')}
        >
          <Clock size={15} /> 6. Operational Rules
        </button>
        <button
          className={`subtab-pill ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <FileText size={15} /> 7. Documents & SOPs
        </button>
        <button
          className={`subtab-pill ${activeTab === 'lifecycle' ? 'active' : ''}`}
          onClick={() => setActiveTab('lifecycle')}
        >
          <GitMerge size={15} /> 8. Status & Merge
        </button>
      </div>

      {/* Main Tab Content Panel */}
      <div
        style={{
          backgroundColor: 'var(--card-bg, #ffffff)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.75rem',
        }}
      >
        {/* ================= 1. EXECUTIVE OVERVIEW (READ-FIRST WITH EDIT TOGGLE) ================= */}
        {activeTab === 'basic' && (
          <div>
            {!isEditMode ? (
              /* READ-FIRST EXECUTIVE OVERVIEW DOSSIER */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Executive Dossier Sub-Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '1rem',
                    borderBottom: '1px solid var(--border-color)',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.5px' }}>
                        Executive Administrative Command Dossier
                      </span>
                      <span className="badge badge-success">✓ Commissioned & Governed</span>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.25rem 0 0 0' }}>
                      {profile.name} ({profile.code})
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                      Stationed in {profile.buildingAssigned} • Head of Department: <strong>{profile.head}</strong>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.625rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleOpenReallocateModal}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
                    >
                      <Building2 size={15} /> Reallocate Footprint
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setIsEditMode(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
                    >
                      <Edit2 size={15} /> ✏️ Edit Department Details
                    </button>
                  </div>
                </div>

                {/* 2-Column Grid of Executive Panels */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
                  
                  {/* PANEL 1: GOVERNANCE & IDENTITY DOSSIER */}
                  <div
                    style={{
                      backgroundColor: 'var(--card-bg, #ffffff)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <ShieldCheck size={18} color="var(--primary)" />
                      <strong style={{ fontSize: '0.9375rem' }}>1. Governance & Administrative Identity</strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Official Legal Title</span>
                        <strong>{profile.name}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>System Identifier</span>
                        <code>{profile.code}</code> {profile.shortName && <span className="badge badge-secondary" style={{ marginLeft: '4px' }}>{profile.shortName}</span>}
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Operational Category</span>
                        <span className="badge badge-info" style={{ marginTop: '2px' }}>{profile.category.toUpperCase()}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Operational Status</span>
                        <span className="badge badge-success" style={{ marginTop: '2px' }}>{profile.status}</span>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Accountable Clinical Head (HOD)</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                          <User size={15} color="var(--primary)" />
                          <strong>{profile.head}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• Chief Clinician</span>
                        </div>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Emergency Intercom & Escalation</span>
                        <span style={{ fontSize: '0.8125rem' }}>{profile.onCallRoster || 'Ext: 104 • Speed Dial #881 (Duty Registrar)'}</span>
                      </div>
                    </div>

                    {profile.description && (
                      <div
                        style={{
                          backgroundColor: 'var(--bg-subtle, #f9fafb)',
                          borderLeft: '3px solid var(--primary)',
                          padding: '0.625rem 0.875rem',
                          borderRadius: '0 6px 6px 0',
                          fontSize: '0.8125rem',
                          color: 'var(--text-color)',
                          fontStyle: 'italic',
                          lineHeight: 1.4,
                        }}
                      >
                        "{profile.description}"
                      </div>
                    )}
                  </div>

                  {/* PANEL 2: PHYSICAL CAMPUS ALLOCATION & BED FOOTPRINT */}
                  <div
                    style={{
                      backgroundColor: 'var(--card-bg, #ffffff)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={18} color="var(--primary)" />
                        <strong style={{ fontSize: '0.9375rem' }}>2. Campus Physical Footprint & Beds</strong>
                      </div>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                        {liveBedStats.totalBeds} Beds • {departmentalRooms.length || profile.roomsCount || 0} Chambers
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Assigned Complex:</span>
                        <strong>{profile.buildingAssigned}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Floors / Wings:</span>
                        <span>{profile.floorAssigned}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Waiting Area & Token LED:</span>
                        <span className="badge badge-success">
                          {profile.hasDedicatedWaitingArea ? '✓ Dedicated Lounge with LED Queue' : 'Central Shared Lounge'}
                        </span>
                      </div>

                      {/* Clinical Wards Breakdown */}
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.375rem' }}>
                          Allocated Inpatient Wards:
                        </span>
                        {departmentalWards.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                            {departmentalWards.map(({ ward, floor }) => (
                              <div
                                key={ward.id}
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(37, 99, 235, 0.04)',
                                  border: '1px solid var(--border-color)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <div>
                                  <strong>{ward.name}</strong>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                                    {floor.floorNumber} • Sister {ward.supervisorNurse}
                                  </span>
                                </div>
                                <span className="badge badge-info">{ward.beds.length} Beds</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', backgroundColor: 'var(--bg-subtle, #f9fafb)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            No overnight inpatient wards allocated (Ambulatory OPD / Diagnostic unit).
                          </div>
                        )}
                      </div>

                      {/* Consultation Chambers */}
                      {departmentalRooms.length > 0 && (
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.375rem' }}>
                            Consultation & Procedure Chambers:
                          </span>
                          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                            {departmentalRooms.map(({ room }) => (
                              <span key={room.id} className="badge badge-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                🚪 Room {room.roomNumber} ({room.roomType})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PANEL 3: CLINICAL PRIVILEGES & HMS CAPABILITIES */}
                  <div
                    style={{
                      backgroundColor: 'var(--card-bg, #ffffff)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <Stethoscope size={18} color="var(--primary)" />
                      <strong style={{ fontSize: '0.9375rem' }}>3. Clinical Governance & HMS Privileges</strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                      {[
                        { label: 'OPD Appointments', enabled: profile.consultationEnabled, desc: 'Accepts scheduled patient bookings' },
                        { label: 'IPD Bed Admissions', enabled: profile.admissionEnabled, desc: 'Can admit patients to hospital beds' },
                        { label: 'OT Surgical Booking', enabled: profile.procedureEnabled, desc: 'Can reserve operation theatre suites' },
                        { label: 'Digital E-Prescriptions', enabled: profile.prescriptionEnabled, desc: 'Issues pharmacy dispensary orders' },
                        { label: 'Diagnostic Requisitions', enabled: profile.labRequestsEnabled, desc: 'Orders pathology, biochemistry & MRI' },
                        { label: 'Emergency Trauma Triage', enabled: profile.emergencyEnabled, desc: 'Receives ambulance code-red alerts' },
                      ].map((item) => (
                        <div
                          key={item.label}
                          style={{
                            padding: '0.625rem',
                            borderRadius: '8px',
                            border: `1px solid ${item.enabled ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                            backgroundColor: item.enabled ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-subtle, #f9fafb)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.125rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            {item.enabled ? (
                              <CheckCircle2 size={15} color="#10b981" />
                            ) : (
                              <X size={15} color="var(--text-muted)" />
                            )}
                            <strong style={{ fontSize: '0.8125rem', color: item.enabled ? 'var(--text-color)' : 'var(--text-muted)' }}>
                              {item.label}
                            </strong>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '1.3rem' }}>
                            {item.desc}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PANEL 4: FINANCIAL ACCOUNTING & BILLING RULES */}
                  <div
                    style={{
                      backgroundColor: 'var(--card-bg, #ffffff)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <DollarSign size={18} color="var(--primary)" />
                      <strong style={{ fontSize: '0.9375rem' }}>4. Financial Accounting & Billing Rules</strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>GL Cost Center</span>
                        <code style={{ fontSize: '0.875rem' }}>{profile.costCenter}</code>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>GL Revenue Center</span>
                        <code style={{ fontSize: '0.875rem' }}>{profile.revenueCenter || 'RC-CLN-01'}</code>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Default Specialist OPD Tariff</span>
                        <strong style={{ fontSize: '1rem', color: '#10b981' }}>$50.00 / ₹800</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Follow-up Visit Policy</span>
                        <span className="badge badge-info" style={{ marginTop: '2px' }}>Free within 7 Days</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Annual Operating Budget</span>
                        <strong style={{ fontSize: '1rem' }}>${(profile.budget || 0).toLocaleString()}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Direct Cashier Billing</span>
                        <span className={`badge ${profile.billingEnabled !== false ? 'badge-success' : 'badge-secondary'}`} style={{ marginTop: '2px' }}>
                          {profile.billingEnabled !== false ? '✓ Enabled' : 'Non-Billing Ledger'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PANEL 5: STAFF DEPLOYMENT & SAFETY RATIO (Full Width) */}
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      backgroundColor: 'var(--card-bg, #ffffff)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={18} color="var(--primary)" />
                        <strong style={{ fontSize: '0.9375rem' }}>5. Staff Deployment Quotas & Safety Roster</strong>
                      </div>
                      <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                        {(profile.doctorsCount || 0) + (profile.nursesCount || 0) + (profile.techsCount || 0) + (profile.receptionistsCount || 0)} Total Personnel
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                      <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle, #f9fafb)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attending Doctors</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.25rem' }}>
                          {profile.doctorsCount || 0} Physicians
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Specialists & Residents</span>
                      </div>

                      <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle, #f9fafb)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nursing Staff</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981', marginTop: '0.25rem' }}>
                          {profile.nursesCount || 0} Nurses
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sisters & Floor Care</span>
                      </div>

                      <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle, #f9fafb)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Technical & Paramedical</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0ea5e9', marginTop: '0.25rem' }}>
                          {profile.techsCount || 0} Technicians
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Compounders & Techs</span>
                      </div>

                      <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle, #f9fafb)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Front Desk & Clerks</span>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8b5cf6', marginTop: '0.25rem' }}>
                          {profile.receptionistsCount || 0} Clerks
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Token & Check-In Desk</span>
                      </div>

                      <div style={{ padding: '0.75rem', backgroundColor: 'rgba(37, 99, 235, 0.04)', borderRadius: '8px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 700 }}>Nurse-to-Bed Safety</span>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.25rem' }}>
                          {liveBedStats.totalBeds > 0 && (profile.nursesCount || 0) > 0
                            ? `1 : ${(liveBedStats.totalBeds / (profile.nursesCount || 1)).toFixed(1)} Ratio`
                            : 'Ambulatory OPD'}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>✓ Within Accreditation Norms</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              /* EDIT MODE ACTIVE: INTERACTIVE INPUT FORM */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Edit Mode Notice Banner */}
                <div
                  style={{
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    border: '1px solid var(--primary)',
                    borderRadius: '8px',
                    padding: '0.875rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Edit2 size={16} color="var(--primary)" />
                    <strong style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>
                      Edit Mode Active: Modify department identity, clinical scope, and administrative settings.
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsEditMode(false)}
                      style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        handleSaveAll();
                        setIsEditMode(false);
                      }}
                      style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                    >
                      <Save size={14} /> Save Changes
                    </button>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                    Department Identity & Classification Form
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                    Define core naming, official hospital abbreviation, functional classification category, and scope of operations.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Official Department Name</label>
                    <input
                      className="form-input"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="e.g. Emergency & Trauma Center"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">System Department Code</label>
                    <input
                      className="form-input"
                      value={profile.code}
                      onChange={(e) => setProfile({ ...profile, code: e.target.value })}
                      placeholder="e.g. DEPT-ER"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Short Name / Display Acronym</label>
                    <input
                      className="form-input"
                      value={profile.shortName || ''}
                      onChange={(e) => setProfile({ ...profile, shortName: e.target.value })}
                      placeholder="e.g. Emergency / ER"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Classification Category</label>
                    <select
                      className="form-select"
                      value={profile.category}
                      onChange={(e) => setProfile({ ...profile, category: e.target.value as any })}
                    >
                      <option value="clinical">Clinical Care</option>
                      <option value="diagnostic">Diagnostic & Imaging</option>
                      <option value="revenue">Revenue & Patient Billing</option>
                      <option value="admin">Administration & HR</option>
                      <option value="support">Support & Facilities</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Head of Department (HOD)</label>
                    <input
                      className="form-input"
                      value={profile.head}
                      onChange={(e) => setProfile({ ...profile, head: e.target.value })}
                      placeholder="e.g. Dr. Neil Patrick, MD"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Current Operational Status</label>
                    <select
                      className="form-select"
                      value={profile.status}
                      onChange={(e) => setProfile({ ...profile, status: e.target.value as any })}
                    >
                      <option value="ACTIVE">Active (In Operation)</option>
                      <option value="UNDER_MAINTENANCE">Under Maintenance / Renovation</option>
                      <option value="INACTIVE">Inactive (Temporarily Suspended)</option>
                      <option value="ARCHIVED">Archived (Decommissioned)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Department Description & Scope</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={profile.description || ''}
                    onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                    placeholder="Detail clinical specializations, patient intake policies, or internal administrative responsibilities..."
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= 2. OPERATIONAL SETTINGS ================= */}
        {activeTab === 'operational' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                Operational Schedules & Intake Rules
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Configure operating schedules, shifts, walk-in tokens, and emergency intake capabilities.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-subtle, #f9fafb)',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={profile.isOpen24Hours || false}
                    onChange={(e) => setProfile({ ...profile, isOpen24Hours: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Open 24 Hours (Continuous Service)</strong>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Enables non-stop round-the-clock shift assignments (mandatory for ER, ICU, Labour Ward).
                    </span>
                  </div>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Shift Pattern</label>
                <select
                  className="form-select"
                  value={profile.shiftPattern || ''}
                  onChange={(e) => setProfile({ ...profile, shiftPattern: e.target.value })}
                >
                  <option value="3-Shift 24x7 (Rotational)">3-Shift 24x7 (Morning / Evening / Night)</option>
                  <option value="General 2-Shift (08:00 - 20:00)">General 2-Shift (08:00 - 14:00, 14:00 - 20:00)</option>
                  <option value="Single General Shift (09:00 - 17:00)">Single General Shift (09:00 - 17:00)</option>
                  <option value="On-Call Emergency Duty">On-Call Emergency Duty (Specialist Coverage)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Standard Working Hours Display</label>
                <input
                  className="form-input"
                  value={profile.hours}
                  onChange={(e) => setProfile({ ...profile, hours: e.target.value })}
                  placeholder="e.g. 08:00 - 20:00 (Mon-Sat) or 24/7"
                />
              </div>
            </div>

            {/* Working Days Selector */}
            <div>
              <label className="form-label">Active Working Days</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.375rem' }}>
                {daysOfWeek.map((day) => {
                  const isSelected = (profile.workingDays || []).includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                        backgroundColor: isSelected ? 'var(--primary)' : 'var(--card-bg, #ffffff)',
                        color: isSelected ? '#ffffff' : 'var(--text-color)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Intake Toggles */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginTop: '0.5rem',
              }}
            >
              <div
                style={{
                  padding: '1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.appointmentBased || false}
                  onChange={(e) => setProfile({ ...profile, appointmentBased: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.875rem', display: 'block' }}>Appointment Based</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Requires booking slot</span>
                </div>
              </div>

              <div
                style={{
                  padding: '1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.walkInAllowed || false}
                  onChange={(e) => setProfile({ ...profile, walkInAllowed: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.875rem', display: 'block' }}>Walk-Ins Permitted</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Direct kiosk / reception queuing</span>
                </div>
              </div>

              <div
                style={{
                  padding: '1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.emergencyEnabled || false}
                  onChange={(e) => setProfile({ ...profile, emergencyEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.875rem', display: 'block' }}>Emergency Trauma Intake</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Priority triage code enabled</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 3. FINANCIAL SETTINGS ================= */}
        {activeTab === 'financial' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                Cost Center & Revenue Management
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Link hospital general ledger cost centers, revenue streams, department operational budgets, and billing authorization.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Cost Center Code (General Ledger)</label>
                <input
                  className="form-input"
                  value={profile.costCenter}
                  onChange={(e) => setProfile({ ...profile, costCenter: e.target.value })}
                  placeholder="e.g. CC-CLN-01"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Used for department expenses, equipment purchase, and supplies requisition.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Revenue Center Code</label>
                <input
                  className="form-input"
                  value={profile.revenueCenter || ''}
                  onChange={(e) => setProfile({ ...profile, revenueCenter: e.target.value })}
                  placeholder="e.g. RC-CLN-01"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Captures consultation fees, procedure billings, and diagnostic charges.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Annual Operating Budget ($ USD)</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.budget || 0}
                  onChange={(e) => setProfile({ ...profile, budget: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 450000"
                />
              </div>

              <div
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-subtle, #f9fafb)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={profile.billingEnabled !== false}
                    onChange={(e) => setProfile({ ...profile, billingEnabled: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Department Billing Enabled</strong>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Allows doctors and counters to post charges directly to patient folios.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ================= 4. CLINICAL SETTINGS ================= */}
        {activeTab === 'clinical' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                  Clinical Workflow Capabilities
                </h3>
                {!isClinical && (
                  <span className="badge badge-warning">
                    Notice: Department is classified under non-clinical '{profile.category}'
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Define which medical actions doctors and nurses can execute inside this department in the HMS.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.consultationEnabled || false}
                  onChange={(e) => setProfile({ ...profile, consultationEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Consultation Notes Enabled</strong>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Doctors can author OPD/IPD SOAP clinical notes, diagnoses, and symptom assessments.
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.admissionEnabled || false}
                  onChange={(e) => setProfile({ ...profile, admissionEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Inpatient Admission Enabled</strong>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Permits admitting patients to ward beds under this department's primary care consultant.
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.procedureEnabled || false}
                  onChange={(e) => setProfile({ ...profile, procedureEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Surgical / Clinical Procedures</strong>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Authorizes booking OT slots, endoscopy suites, or minor surgery procedure charting.
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.labRequestsEnabled || false}
                  onChange={(e) => setProfile({ ...profile, labRequestsEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Lab & Imaging Orders</strong>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Allows requisitioning biochemistry, hematology, CT, MRI, and ultrasound requisitions.
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.prescriptionEnabled || false}
                  onChange={(e) => setProfile({ ...profile, prescriptionEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.9375rem', display: 'block' }}>E-Prescription & Pharmacy Dispense</strong>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Generates official stamped Rx with drug-interaction checks and dosage scheduling.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 5. STAFF SETTINGS ================= */}
        {activeTab === 'staff' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                Department Staffing Deployment & Clinical Roster
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Assign accountable medical leadership, doctor/nurse headcount, and monitor bed-to-nurse clinical safety ratios.
              </p>
            </div>

            {/* HOD Accountability Card */}
            <div
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.25rem',
                alignItems: 'center',
              }}
            >
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={16} color="var(--primary)" /> Head of Department (HOD) / Chief Clinician
                </label>
                <input
                  className="form-input"
                  value={profile.head}
                  onChange={(e) => setProfile({ ...profile, head: e.target.value })}
                  placeholder="e.g. Dr. Sarah Jenkins, MD"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Primary physician legally and clinically accountable for departmental protocols.
                </span>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Duty Shift Pattern</label>
                <select
                  className="form-select"
                  value={profile.shiftPattern || ''}
                  onChange={(e) => setProfile({ ...profile, shiftPattern: e.target.value })}
                >
                  <option value="3-Shift 24x7 (Rotational)">3-Shift 24x7 (Rotational Morning / Evening / Night)</option>
                  <option value="General 2-Shift (08:00 - 20:00)">General 2-Shift (08:00 - 20:00 OPD / Daycare)</option>
                  <option value="Single Day Shift (09:00 - 17:00)">Single Day Shift (09:00 - 17:00 Administrative)</option>
                  <option value="On-Call Emergency Rotation">On-Call Emergency Rotation (Trauma Roster)</option>
                </select>
              </div>
            </div>

            {/* Staff Deployment Headcount */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group" style={{ backgroundColor: 'var(--card-bg, #ffffff)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Consultant Doctors</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.doctorsCount || 0}
                  onChange={(e) => setProfile({ ...profile, doctorsCount: parseInt(e.target.value) || 0 })}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attending & resident specialists</span>
              </div>

              <div className="form-group" style={{ backgroundColor: 'var(--card-bg, #ffffff)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Registered Nurses</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.nursesCount || 0}
                  onChange={(e) => setProfile({ ...profile, nursesCount: parseInt(e.target.value) || 0 })}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ward sisters & staff nurses</span>
              </div>

              <div className="form-group" style={{ backgroundColor: 'var(--card-bg, #ffffff)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Technicians & Paramedics</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.techsCount || 0}
                  onChange={(e) => setProfile({ ...profile, techsCount: parseInt(e.target.value) || 0 })}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lab, OT & dialysis assistants</span>
              </div>

              <div className="form-group" style={{ backgroundColor: 'var(--card-bg, #ffffff)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Front Desk & Queue Handlers</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.receptionistsCount || 0}
                  onChange={(e) => setProfile({ ...profile, receptionistsCount: parseInt(e.target.value) || 0 })}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Token coordinators & clerks</span>
              </div>
            </div>

            {/* Nurse-to-Bed Clinical Safety Metric */}
            <div
              style={{
                backgroundColor: 'var(--bg-subtle, #f9fafb)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={20} color={liveBedStats.totalBeds > 0 ? '#10b981' : 'var(--primary)'} />
                  <strong style={{ fontSize: '0.9375rem' }}>Staff-to-Bed Clinical Safety Threshold</strong>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                  {liveBedStats.totalBeds > 0
                    ? `Currently ${profile.nursesCount || 0} Nurses assigned to ${liveBedStats.totalBeds} inpatient beds (${(departmentalWards.length || profile.wardsCount || 0)} wards).`
                    : 'This department operates on an ambulatory outpatient model without overnight inpatient ward beds.'}
                </p>
              </div>

              <div>
                {liveBedStats.totalBeds > 0 ? (
                  <div
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      backgroundColor:
                        (profile.nursesCount || 0) >= liveBedStats.totalBeds / 2
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(245, 158, 11, 0.12)',
                      border: `1px solid ${
                        (profile.nursesCount || 0) >= liveBedStats.totalBeds / 2
                          ? '#10b981'
                          : '#f59e0b'
                      }`,
                      textAlign: 'right',
                    }}
                  >
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, display: 'block', color: (profile.nursesCount || 0) >= liveBedStats.totalBeds / 2 ? '#047857' : '#b45309' }}>
                      Ratio: 1 Nurse per {(liveBedStats.totalBeds / (profile.nursesCount || 1)).toFixed(1)} Beds
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      {(profile.nursesCount || 0) >= liveBedStats.totalBeds / 2
                        ? '✓ Meets NABH / JCI Acute Safety Standard'
                        : '⚠ Consider deploying additional ward nurses'}
                    </span>
                  </div>
                ) : (
                  <span className="badge badge-info" style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem' }}>
                    Ambulatory OPD / Daycare Footprint
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">On-Call Emergency Specialist Roster & Emergency Pager</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={profile.onCallRoster || ''}
                onChange={(e) => setProfile({ ...profile, onCallRoster: e.target.value })}
                placeholder="e.g. Primary On-Call: Dr. Neil Patrick (Ext: 104) • Secondary Consultant: Dr. Emily Thorne (Pager #881)"
              />
            </div>
          </div>
        )}

        {/* ================= 6. INFRASTRUCTURE & SPACE ALLOCATION ================= */}
        {activeTab === 'infrastructure' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                  Campus Infrastructure & Physical Space Allocation
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                  Real-time physical asset mapping from North Central Hospital Tower master blueprint.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleOpenReallocateModal}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <ArrowRightLeft size={16} /> Reallocate Campus Space
              </button>
            </div>

            {/* Campus Physical Footprint Summary Banner */}
            <div
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.25rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Assigned Hospital Building
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <Building2 size={18} color="var(--primary)" />
                  <strong style={{ fontSize: '1rem' }}>{profile.buildingAssigned}</strong>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Floor Location: <strong>{profile.floorAssigned || 'Level 0 & 1'}</strong>
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Wards & Aggregate Bed Capacity
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <BedDouble size={18} color="var(--secondary)" />
                  <strong style={{ fontSize: '1rem' }}>
                    {departmentalWards.length || profile.wardsCount || 0} Wards • {liveBedStats.totalBeds} Beds
                  </strong>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  {liveBedStats.occupiedBeds} Occupied • {liveBedStats.availableBeds} Available • {liveBedStats.sanitizedBeds} Sanitized
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Consultation Chambers
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <DoorClosed size={18} color="#0ea5e9" />
                  <strong style={{ fontSize: '1rem' }}>
                    {departmentalRooms.length || profile.roomsCount || 0} Rooms / Suites
                  </strong>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  OPD Consulting Chambers & Minor Procedure Suites
                </span>
              </div>
            </div>

            {/* Direct Allocated Clinical Wards */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BedDouble size={16} /> Allocated Inpatient Wards ({departmentalWards.length})
                </h4>
                <button
                  className="btn btn-secondary"
                  onClick={handleOpenReallocateModal}
                  style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}
                >
                  Manage Wards Allocation
                </button>
              </div>

              {departmentalWards.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {departmentalWards.map((item) => (
                    <div
                      key={item.ward.id}
                      style={{
                        backgroundColor: 'var(--card-bg, #ffffff)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '1.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h5 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{item.ward.name}</h5>
                            <span className="badge badge-info">{item.ward.wardType}</span>
                          </div>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            {item.floor.floorNumber} • Supervisor: <strong>{item.ward.supervisorNurse}</strong> • Station: {item.ward.nursingStation}
                          </span>
                        </div>
                        <span className="badge badge-secondary" style={{ fontSize: '0.8125rem' }}>
                          {item.ward.beds.length} Assigned Beds ({item.ward.beds.filter((b) => b.status === 'OCCUPIED').length} Occupied)
                        </span>
                      </div>

                      {/* Beds Grid for this ward */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                        {item.ward.beds.map((bed) => (
                          <div
                            key={bed.id}
                            style={{
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              padding: '0.75rem',
                              backgroundColor:
                                bed.status === 'OCCUPIED'
                                  ? 'rgba(239, 68, 68, 0.04)'
                                  : 'rgba(16, 185, 129, 0.04)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '0.875rem' }}>{bed.bedNumber}</strong>
                              <span
                                className={`badge ${
                                  bed.status === 'OCCUPIED'
                                    ? 'badge-warning'
                                    : bed.status === 'AVAILABLE'
                                    ? 'badge-success'
                                    : 'badge-secondary'
                                }`}
                                style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem' }}
                              >
                                {bed.status}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              {bed.bedType} • ${bed.dailyTariff}/day
                            </div>
                            {bed.inpatientDetails && (
                              <div
                                style={{
                                  marginTop: '0.5rem',
                                  paddingTop: '0.5rem',
                                  borderTop: '1px dashed var(--border-color)',
                                  fontSize: '0.75rem',
                                }}
                              >
                                <div>Pt: <strong>{bed.inpatientDetails.patientName}</strong></div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>
                                  {bed.inpatientDetails.uhid} • Dr: {bed.inpatientDetails.primaryDoctor.name}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '1.5rem',
                    border: '1px dashed var(--border-color)',
                    borderRadius: '10px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-subtle, #f9fafb)',
                  }}
                >
                  <BedDouble size={28} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                  <strong style={{ display: 'block', fontSize: '0.9375rem' }}>No Inpatient Wards Currently Bound</strong>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.75rem 0' }}>
                    This department currently operates on an ambulatory model or has not claimed physical inpatient wards from the campus blueprint.
                  </p>
                  <button className="btn btn-secondary" onClick={handleOpenReallocateModal}>
                    <ArrowRightLeft size={14} /> Allocate Wards from Campus Infrastructure
                  </button>
                </div>
              )}
            </div>

            {/* Direct Allocated Consultation Rooms */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <DoorClosed size={16} /> Allocated Consultation & Procedure Chambers ({departmentalRooms.length})
                </h4>
                <button
                  className="btn btn-secondary"
                  onClick={handleOpenReallocateModal}
                  style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}
                >
                  Manage Chambers
                </button>
              </div>

              {departmentalRooms.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                  {departmentalRooms.map((item) => (
                    <div
                      key={item.room.id}
                      style={{
                        backgroundColor: 'var(--card-bg, #ffffff)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.9375rem' }}>{item.room.roomNumber}</strong>
                        <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>
                          {item.room.roomType}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {item.floor.floorNumber} • Capacity: {item.room.capacity}
                      </div>
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          className={`badge ${
                            item.room.status === 'OCCUPIED' ? 'badge-warning' : 'badge-success'
                          }`}
                          style={{ fontSize: '0.6875rem' }}
                        >
                          {item.room.status}
                        </span>
                        {item.room.attendingStaff?.doctorName && (
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            {item.room.attendingStaff.doctorName}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '1.25rem',
                    border: '1px dashed var(--border-color)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-subtle, #f9fafb)',
                  }}
                >
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    No consultation chambers or procedure suites currently allocated.
                  </span>
                </div>
              )}
            </div>

            {/* Dedicated Waiting Lounge */}
            <div
              style={{
                padding: '1.25rem',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-subtle, #f9fafb)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={profile.hasDedicatedWaitingArea || false}
                  onChange={(e) => setProfile({ ...profile, hasDedicatedWaitingArea: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Dedicated Patient Waiting Lounge & Token Display</strong>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Includes digital LED token display queue screen, attendant seating, and patient check-in kiosk.
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ================= 7. DOCUMENTS & SOPS ================= */}
        {activeTab === 'documents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                  Department Documents, SOPs & Clinical Protocols
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                  Manage standard operating procedures, clinical guidelines, and regulatory compliance documents.
                </p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  const newDoc = {
                    id: Date.now().toString(),
                    title: `${profile.shortName || 'Dept'} New Operational Policy`,
                    type: 'Standard Operating Procedure (SOP)',
                    version: 'v1.0',
                    updatedAt: new Date().toISOString().split('T')[0],
                    status: 'Draft' as const,
                  };
                  setProfile({ ...profile, documents: [...(profile.documents || []), newDoc] });
                  showToast('New document entry added.');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Upload size={14} /> + Add Policy Document
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Category Type</th>
                    <th>Version</th>
                    <th>Last Updated</th>
                    <th>Approval Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.documents || []).map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <strong>{doc.title}</strong>
                      </td>
                      <td>
                        <span className="badge badge-secondary">{doc.type}</span>
                      </td>
                      <td>
                        <code>{doc.version}</code>
                      </td>
                      <td>{doc.updatedAt}</td>
                      <td>
                        <span
                          className={`badge ${
                            doc.status === 'Approved'
                              ? 'badge-success'
                              : doc.status === 'In Review'
                              ? 'badge-warning'
                              : 'badge-secondary'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="action-btn edit"
                          title="Download Document"
                          onClick={() => alert(`Downloading ${doc.title} (${doc.version})...`)}
                        >
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= 8. ROLE & PERMISSIONS ================= */}
        {activeTab === 'permissions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                Department Level Role & Action Access Matrix
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Control which actions Doctors, Nurses, Receptionists, and Billing Clerks can perform specifically inside this department.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {/* Doctor Permissions */}
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-subtle, #f9fafb)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Stethoscope size={18} color="var(--primary)" />
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>Doctor Permissions</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
                    <input
                      type="checkbox"
                      checked={profile.permissions?.doctor.viewPatients ?? true}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          permissions: {
                            ...profile.permissions!,
                            doctor: { ...profile.permissions!.doctor, viewPatients: e.target.checked },
                          },
                        })
                      }
                    />
                    View Department Patient Queue & History
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
                    <input
                      type="checkbox"
                      checked={profile.permissions?.doctor.clinicalNotes ?? true}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          permissions: {
                            ...profile.permissions!,
                            doctor: { ...profile.permissions!.doctor, clinicalNotes: e.target.checked },
                          },
                        })
                      }
                    />
                    Write & Sign SOAP Clinical Consultation Notes
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
                    <input
                      type="checkbox"
                      checked={profile.permissions?.doctor.prescribe ?? true}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          permissions: {
                            ...profile.permissions!,
                            doctor: { ...profile.permissions!.doctor, prescribe: e.target.checked },
                          },
                        })
                      }
                    />
                    Issue Digital Prescriptions with Barcode
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
                    <input
                      type="checkbox"
                      checked={profile.permissions?.doctor.orderDiagnostics ?? true}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          permissions: {
                            ...profile.permissions!,
                            doctor: { ...profile.permissions!.doctor, orderDiagnostics: e.target.checked },
                          },
                        })
                      }
                    />
                    Requisition Lab Tests & Radiology Scans
                  </label>
                </div>
              </div>

              {/* Nurse Permissions */}
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-subtle, #f9fafb)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Activity size={18} color="#10b981" />
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>Nursing Staff Permissions</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
                    <input
                      type="checkbox"
                      checked={profile.permissions?.nurse.vitalsEntry ?? true}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          permissions: {
                            ...profile.permissions!,
                            nurse: { ...profile.permissions!.nurse, vitalsEntry: e.target.checked },
                          },
                        })
                      }
                    />
                    Record Patient Vitals (BP, SpO2, Pulse, Temp)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
                    <input
                      type="checkbox"
                      checked={profile.permissions?.nurse.medicationAdmin ?? true}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          permissions: {
                            ...profile.permissions!,
                            nurse: { ...profile.permissions!.nurse, medicationAdmin: e.target.checked },
                          },
                        })
                      }
                    />
                    Medication Administration Record (MAR Charting)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
                    <input
                      type="checkbox"
                      checked={profile.permissions?.nurse.wardHandover ?? true}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          permissions: {
                            ...profile.permissions!,
                            nurse: { ...profile.permissions!.nurse, wardHandover: e.target.checked },
                          },
                        })
                      }
                    />
                    Shift Handover & Bed Status Updates
                  </label>
                </div>
              </div>

              {/* Reception & Front Desk */}
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-subtle, #f9fafb)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Users size={18} color="#0ea5e9" />
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>Reception & Front Desk</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
                    <input
                      type="checkbox"
                      checked={profile.permissions?.receptionist.checkIn ?? true}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          permissions: {
                            ...profile.permissions!,
                            receptionist: { ...profile.permissions!.receptionist, checkIn: e.target.checked },
                          },
                        })
                      }
                    />
                    Patient Check-In & UHID Verification
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
                    <input
                      type="checkbox"
                      checked={profile.permissions?.receptionist.queueToken ?? true}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          permissions: {
                            ...profile.permissions!,
                            receptionist: { ...profile.permissions!.receptionist, queueToken: e.target.checked },
                          },
                        })
                      }
                    />
                    Queue Token Slip Printing
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
                    <input
                      type="checkbox"
                      checked={profile.permissions?.receptionist.opdBooking ?? true}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          permissions: {
                            ...profile.permissions!,
                            receptionist: { ...profile.permissions!.receptionist, opdBooking: e.target.checked },
                          },
                        })
                      }
                    />
                    Doctor Slot Booking & Rescheduling
                  </label>
                </div>
              </div>

              {/* Billing Desk */}
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-subtle, #f9fafb)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Coins size={18} color="#eab308" />
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>Billing & Financial Staff</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
                    <input
                      type="checkbox"
                      checked={profile.permissions?.billingStaff.chargeSlip ?? true}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          permissions: {
                            ...profile.permissions!,
                            billingStaff: { ...profile.permissions!.billingStaff, chargeSlip: e.target.checked },
                          },
                        })
                      }
                    />
                    Generate Inpatient & OPD Charge Slips
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
                    <input
                      type="checkbox"
                      checked={profile.permissions?.billingStaff.discountAuth ?? false}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          permissions: {
                            ...profile.permissions!,
                            billingStaff: { ...profile.permissions!.billingStaff, discountAuth: e.target.checked },
                          },
                        })
                      }
                    />
                    Authorize Special Concession / Discretionary Discount
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 9. STATUS, MERGE & ARCHIVE ================= */}
        {activeTab === 'lifecycle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                Department Lifecycle, Consolidation & Decommissioning
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Safely manage department restructuring, merge patients and clinical staff into another department, or archive.
              </p>
            </div>

            {/* Merge Department Card */}
            <div
              style={{
                border: '1px solid #3b82f6',
                borderRadius: '10px',
                padding: '1.5rem',
                backgroundColor: 'rgba(59, 130, 246, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <GitMerge size={20} color="#3b82f6" />
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e40af' }}>
                      Merge & Consolidate Department
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0', maxWidth: '640px' }}>
                    If hospital management decides to restructure or unite two departments (e.g. merging Pulmonology into General Medicine), all active patients, assigned doctors, and duty rosters can be transferred in a single audited step.
                  </p>
                </div>
                <button
                  className="btn"
                  onClick={() => setIsMergeModalOpen(true)}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <GitMerge size={16} /> Merge Department Wizard
                </button>
              </div>
            </div>

            {/* Archive / Deactivate Card */}
            <div
              style={{
                border: '1px solid #ef4444',
                borderRadius: '10px',
                padding: '1.5rem',
                backgroundColor: 'rgba(239, 68, 68, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Archive size={20} color="#ef4444" />
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#991b1b' }}>
                      Archive Department (Preserve Historical Records)
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0', maxWidth: '640px' }}>
                    Never hard delete an operational department. Archiving deactivates new appointment bookings and bed admissions while maintaining full regulatory medico-legal compliance and past patient history.
                  </p>
                </div>
                <button
                  className="btn"
                  onClick={() => setIsArchiveModalOpen(true)}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Archive size={16} /> Archive Department
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MERGE MODAL ================= */}
      {isMergeModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GitMerge size={20} color="var(--primary)" />
                <h3 className="modal-title">Merge "{profile.name}"</h3>
              </div>
              <button className="action-btn" onClick={() => setIsMergeModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleMergeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                }}
              >
                <strong>Consolidation Impact:</strong>
                <ul style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                  <li>All active doctors ({profile.doctorsCount}) will be reallocated to the target department.</li>
                  <li>Inpatient beds ({profile.bedsCount}) will transition under the target cost center.</li>
                  <li>This department ({profile.code}) will be permanently closed to new admissions.</li>
                </ul>
              </div>

              <div className="form-group">
                <label className="form-label">Select Target Department to Absorb Assets</label>
                <select
                  className="form-select"
                  value={targetMergeDeptId}
                  onChange={(e) => setTargetMergeDeptId(e.target.value)}
                  required
                >
                  <option value="">-- Choose destination department --</option>
                  {allDepartments
                    .filter((d) => d.id !== profile.id && d.status === 'ACTIVE')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code}) - {d.head}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Type <strong style={{ color: '#dc2626' }}>MERGE</strong> to confirm consolidation:
                </label>
                <input
                  className="form-input"
                  placeholder="MERGE"
                  value={mergeConfirmationText}
                  onChange={(e) => setMergeConfirmationText(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsMergeModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#2563eb' }}>
                  Confirm Department Merger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ARCHIVE MODAL ================= */}
      {isArchiveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} color="#dc2626" />
                <h3 className="modal-title">Archive Department</h3>
              </div>
              <button className="action-btn" onClick={() => setIsArchiveModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.875rem', margin: 0, color: 'var(--text-color)' }}>
                Are you sure you want to archive <strong>{profile.name} ({profile.code})</strong>?
              </p>

              <div
                style={{
                  padding: '0.875rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  color: '#991b1b',
                }}
              >
                This department will no longer be available for patient appointments, doctor roster scheduling, or new bed allocations. Historical billing and patient records will remain accessible in read-only mode for statutory compliance.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsArchiveModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleArchiveConfirm}
                  style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                >
                  Archive Department
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= CAMPUS SPACE REALLOCATION MODAL ================= */}
      {isReallocateModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              maxWidth: '840px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <Building2 size={20} color="var(--primary)" />
                <div>
                  <h3 className="modal-title" style={{ margin: 0, fontSize: '1.125rem' }}>
                    Reallocate Campus Space — {profile.name}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Assign or release clinical wards, beds, and consultation rooms from campus infrastructure.
                  </span>
                </div>
              </div>
              <button className="action-btn" onClick={() => setIsReallocateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              <div className="form-group">
                <label className="form-label">Select Hospital Campus Building</label>
                <select
                  className="form-select"
                  value={tempBuildingId}
                  onChange={(e) => setTempBuildingId(e.target.value)}
                >
                  {campusBuildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code}) — {b.totalFloorsCount} Floors • {b.buildingType}
                    </option>
                  ))}
                </select>
              </div>

              {/* Floors, Wards, and Rooms Selection */}
              {(() => {
                const bldg = campusBuildings.find((b) => b.id === tempBuildingId) || campusBuildings[0];
                if (!bldg) return <div>No building blueprint found.</div>;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {bldg.floors.map((floor) => (
                      <div
                        key={floor.id}
                        style={{
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          padding: '1rem',
                          backgroundColor: 'var(--bg-subtle, #f9fafb)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.75rem',
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: '0.9375rem', display: 'block' }}>
                              {floor.floorNumber} — {floor.wing}
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Code: {floor.code} • Access Zone: {floor.accessZone}
                            </span>
                          </div>
                          <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                            {floor.wards.length} Wards • {floor.rooms.length} Rooms
                          </span>
                        </div>

                        {/* Wards on this floor */}
                        {floor.wards.length > 0 && (
                          <div style={{ marginBottom: '0.75rem' }}>
                            <div
                              style={{
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                color: 'var(--text-color)',
                                marginBottom: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                              }}
                            >
                              <BedDouble size={14} /> Inpatient Clinical Wards & Beds:
                            </div>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '0.5rem',
                              }}
                            >
                              {floor.wards.map((ward) => {
                                const isChecked = tempWardIds.includes(ward.id);
                                return (
                                  <label
                                    key={ward.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '0.625rem',
                                      padding: '0.625rem 0.75rem',
                                      backgroundColor: isChecked
                                        ? 'rgba(37, 99, 235, 0.08)'
                                        : 'var(--card-bg, #ffffff)',
                                      border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border-color)'}`,
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setTempWardIds([...tempWardIds, ward.id]);
                                        } else {
                                          setTempWardIds(tempWardIds.filter((id) => id !== ward.id));
                                        }
                                      }}
                                      style={{ marginTop: '2px' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{ward.name}</div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {ward.wardType} • <strong>{ward.beds.length} Beds</strong> • Nurse:{' '}
                                        {ward.supervisorNurse}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Rooms on this floor */}
                        {floor.rooms.length > 0 && (
                          <div>
                            <div
                              style={{
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                color: 'var(--text-color)',
                                marginBottom: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                              }}
                            >
                              <DoorClosed size={14} /> Consultation Chambers & Procedure Rooms:
                            </div>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                gap: '0.5rem',
                              }}
                            >
                              {floor.rooms.map((room) => {
                                const isChecked = tempRoomIds.includes(room.id);
                                return (
                                  <label
                                    key={room.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '0.625rem',
                                      padding: '0.5rem 0.75rem',
                                      backgroundColor: isChecked
                                        ? 'rgba(14, 165, 233, 0.08)'
                                        : 'var(--card-bg, #ffffff)',
                                      border: `1px solid ${isChecked ? '#0ea5e9' : 'var(--border-color)'}`,
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setTempRoomIds([...tempRoomIds, room.id]);
                                        } else {
                                          setTempRoomIds(tempRoomIds.filter((id) => id !== room.id));
                                        }
                                      }}
                                      style={{ marginTop: '2px' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{room.roomNumber}</div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {room.roomType} (Capacity: {room.capacity})
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Fixed Footer with dynamic totals */}
            <div
              className="modal-footer"
              style={{
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.875rem 1.25rem',
                borderTop: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-subtle, #f9fafb)',
              }}
            >
              {(() => {
                const bldg = campusBuildings.find((b) => b.id === tempBuildingId) || campusBuildings[0];
                let bedsSum = 0;
                bldg?.floors.forEach((f) => {
                  f.wards.forEach((w) => {
                    if (tempWardIds.includes(w.id)) {
                      bedsSum += w.beds.length;
                    }
                  });
                });
                return (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-color)' }}>
                    Allocating: <strong>{tempWardIds.length} Wards</strong> (<strong>{bedsSum} Beds</strong>) •{' '}
                    <strong>{tempRoomIds.length} Rooms</strong>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsReallocateModalOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSaveReallocation}>
                  Save & Apply Space Allocation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
