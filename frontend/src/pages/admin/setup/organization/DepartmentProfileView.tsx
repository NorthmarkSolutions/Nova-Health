import React, { useState } from 'react';
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
} from 'lucide-react';

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

  // 6. Infrastructure
  buildingAssigned?: string;
  floorAssigned?: string;
  roomsCount?: number;
  wardsCount?: number;
  bedsCount?: number;
  hasDedicatedWaitingArea?: boolean;

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

    // Infrastructure
    buildingAssigned: department.buildingAssigned || (department.category === 'clinical' ? 'Main Inpatient Tower' : 'Diagnostic & Pavilion'),
    floorAssigned: department.floorAssigned || 'Floor 1 - Wing A',
    roomsCount: department.roomsCount || 6,
    wardsCount: department.wardsCount || (['DEPT-IPD', 'DEPT-ICU', 'DEPT-NICU'].includes(department.code) ? 2 : 0),
    bedsCount: department.bedsCount || (['DEPT-IPD', 'DEPT-ICU', 'DEPT-NICU'].includes(department.code) ? 36 : 0),
    hasDedicatedWaitingArea: department.hasDedicatedWaitingArea !== undefined ? department.hasDedicatedWaitingArea : true,

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveAll = () => {
    onSave(profile);
    showToast(`✓ Department profile for "${profile.name}" saved successfully!`);
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

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-primary"
            onClick={handleSaveAll}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>

      {/* Quick Summary KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
          <span style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--primary)' }}>
            {(profile.doctorsCount || 0) + (profile.nursesCount || 0) + (profile.techsCount || 0) + (profile.receptionistsCount || 0)} Staff
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {profile.doctorsCount || 0} Doctors • {profile.nursesCount || 0} Nurses
          </span>
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
          <span style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--secondary)' }}>
            {profile.roomsCount || 0} Rooms / {profile.bedsCount || 0} Beds
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {profile.buildingAssigned}
          </span>
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
            Operating Hours
          </span>
          <span style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.25rem', color: '#10b981' }}>
            {profile.isOpen24Hours ? '24/7 Uninterrupted' : profile.hours}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {profile.shiftPattern}
          </span>
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
            Financial Allocation
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color: '#0ea5e9' }}>
            ${(profile.budget || 0).toLocaleString()}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Cost: {profile.costCenter} • Rev: {profile.revenueCenter}
          </span>
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
          <FileText size={15} /> 1. Basic Info
        </button>
        <button
          className={`subtab-pill ${activeTab === 'operational' ? 'active' : ''}`}
          onClick={() => setActiveTab('operational')}
        >
          <Clock size={15} /> 2. Operational
        </button>
        <button
          className={`subtab-pill ${activeTab === 'financial' ? 'active' : ''}`}
          onClick={() => setActiveTab('financial')}
        >
          <DollarSign size={15} /> 3. Financial
        </button>
        <button
          className={`subtab-pill ${activeTab === 'clinical' ? 'active' : ''}`}
          onClick={() => setActiveTab('clinical')}
        >
          <Stethoscope size={15} /> 4. Clinical
        </button>
        <button
          className={`subtab-pill ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          <Users size={15} /> 5. Staff Roster
        </button>
        <button
          className={`subtab-pill ${activeTab === 'infrastructure' ? 'active' : ''}`}
          onClick={() => setActiveTab('infrastructure')}
        >
          <Building2 size={15} /> 6. Infrastructure & Space
        </button>
        <button
          className={`subtab-pill ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <FileText size={15} /> 7. Documents & SOPs
        </button>
        <button
          className={`subtab-pill ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          <Lock size={15} /> 8. Permissions
        </button>
        <button
          className={`subtab-pill ${activeTab === 'lifecycle' ? 'active' : ''}`}
          onClick={() => setActiveTab('lifecycle')}
        >
          <GitMerge size={15} /> 9. Status & Merge
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
        {/* ================= 1. BASIC INFORMATION ================= */}
        {activeTab === 'basic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                Department Identity & Classification
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
                Department Staffing Roster & Headcount
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Maintain roster distribution across doctors, nurses, technicians, and front desk coordinators.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Consultant Doctors</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.doctorsCount || 0}
                  onChange={(e) => setProfile({ ...profile, doctorsCount: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Registered Nurses</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.nursesCount || 0}
                  onChange={(e) => setProfile({ ...profile, nursesCount: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Technicians & Paramedics</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.techsCount || 0}
                  onChange={(e) => setProfile({ ...profile, techsCount: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Receptionists & Billing Clerks</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.receptionistsCount || 0}
                  onChange={(e) => setProfile({ ...profile, receptionistsCount: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">On-Call Emergency Specialist Roster & Pager</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={profile.onCallRoster || ''}
                onChange={(e) => setProfile({ ...profile, onCallRoster: e.target.value })}
                placeholder="e.g. Night On-Call: Dr. Neil Patrick (Ext 104) • Secondary: Dr. Emily Thorne (Pager #881)"
              />
            </div>
          </div>
        )}

        {/* ================= 6. INFRASTRUCTURE & SPACE ALLOCATION ================= */}
        {activeTab === 'infrastructure' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                Campus Infrastructure & Physical Space Allocation
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Assign building wings, floor suites, consultation rooms, wards, and beds established in the Campus Infrastructure tab.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Building Assigned</label>
                <select
                  className="form-select"
                  value={profile.buildingAssigned || ''}
                  onChange={(e) => setProfile({ ...profile, buildingAssigned: e.target.value })}
                >
                  <option value="Main Inpatient Tower">Main Inpatient Tower (BLD-TWR-A)</option>
                  <option value="Emergency & Trauma Pavilion">Emergency & Trauma Pavilion (BLD-EMRG-01)</option>
                  <option value="Diagnostic & Oncology Pavilion">Diagnostic & Oncology Pavilion (BLD-DIAG-02)</option>
                  <option value="Administration & Support Block">Administration & Support Block (BLD-ADM-03)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Floor & Wing Location</label>
                <input
                  className="form-input"
                  value={profile.floorAssigned || ''}
                  onChange={(e) => setProfile({ ...profile, floorAssigned: e.target.value })}
                  placeholder="e.g. Floor 2 - East Wing"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Total Consultation / Procedure Rooms</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.roomsCount || 0}
                  onChange={(e) => setProfile({ ...profile, roomsCount: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Total Assigned Inpatient Wards</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.wardsCount || 0}
                  onChange={(e) => setProfile({ ...profile, wardsCount: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Total Bed Allocation</label>
                <input
                  type="number"
                  className="form-input"
                  value={profile.bedsCount || 0}
                  onChange={(e) => setProfile({ ...profile, bedsCount: parseInt(e.target.value) || 0 })}
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
                    checked={profile.hasDedicatedWaitingArea || false}
                    onChange={(e) => setProfile({ ...profile, hasDedicatedWaitingArea: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Dedicated Patient Waiting Lounge</strong>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Includes digital token display queue screen and attendant seating.
                    </span>
                  </div>
                </label>
              </div>
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
    </div>
  );
};
