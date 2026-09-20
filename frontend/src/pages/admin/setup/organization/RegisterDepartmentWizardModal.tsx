import React, { useState, useMemo } from 'react';
import {
  X,
  Building2,
  BedDouble,
  DoorClosed,
  Stethoscope,
  DollarSign,
  Users,
  CheckCircle2,
  Shield,
  Activity,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  User,
  Clock,
  Sparkles,
  ArrowRightLeft,
  Info,
} from 'lucide-react';
import { DepartmentProfileData } from './DepartmentProfileView';
import {
  BuildingNode,
  FloorNode,
  WardNode,
  RoomNode,
  getCampusBuildings,
  syncDepartmentToCampus,
} from './CampusInfrastructureSection';
import {
  HospitalShift,
  StaffMember,
  getHospitalShifts,
  getHospitalStaff,
  assignStaffMembersToDepartment,
} from './hospitalStaffStore';
import { autoProvisionWorkspace } from '../../../department/departmentWorkspaceStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newDept: DepartmentProfileData) => void;
}

export const RegisterDepartmentWizardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const campusBuildings = useMemo(() => getCampusBuildings(), [isOpen]);

  // Pillar 1: Identity & Leadership
  const hospitalShifts = useMemo(() => getHospitalShifts(), [isOpen]);
  const hospitalStaff = useMemo(() => getHospitalStaff(), [isOpen]);

  const [name, setName] = useState('');
  const [code, setCode] = useState('DEPT-');
  const [shortName, setShortName] = useState('');
  const [category, setCategory] = useState<
    'clinical' | 'diagnostic' | 'revenue' | 'admin' | 'support' | 'custom'
  >('clinical');
  const [customCategory, setCustomCategory] = useState('');
  const [head, setHead] = useState('');
  const [selectedHODStaffId, setSelectedHODStaffId] = useState<string>('');
  const [isCustomHOD, setIsCustomHOD] = useState<boolean>(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [hours, setHours] = useState(
    hospitalShifts[0]
      ? `${hospitalShifts[0].name} (${hospitalShifts[0].startTime} - ${hospitalShifts[0].endTime})`
      : '08:00 - 20:00 Ambulatory OPD'
  );
  const [customHours, setCustomHours] = useState('');
  const [shiftPattern, setShiftPattern] = useState('Rotational Multi-Shift (Morning / Evening / Night)');
  const [customShiftPattern, setCustomShiftPattern] = useState('');
  const [description, setDescription] = useState('');

  // Pillar 2: Campus Infrastructure Allocation
  const [selectedBuildingId, setSelectedBuildingId] = useState(
    campusBuildings[0]?.id || 'bld-main-1'
  );
  const [selectedFloorIds, setSelectedFloorIds] = useState<string[]>([]);
  const [selectedWardIds, setSelectedWardIds] = useState<string[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [hasDedicatedWaitingArea, setHasDedicatedWaitingArea] = useState(true);

  // Pillar 3: Staffing Deployment
  const [doctorsCount, setDoctorsCount] = useState(8);
  const [nursesCount, setNursesCount] = useState(14);
  const [techsCount, setTechsCount] = useState(4);
  const [receptionistsCount, setReceptionistsCount] = useState(2);
  const [onCallRoster, setOnCallRoster] = useState('');

  // Pillar 4: Clinical Privileges
  const [consultationEnabled, setConsultationEnabled] = useState(true);
  const [admissionEnabled, setAdmissionEnabled] = useState(true);
  const [procedureEnabled, setProcedureEnabled] = useState(false);
  const [labRequestsEnabled, setLabRequestsEnabled] = useState(true);
  const [prescriptionEnabled, setPrescriptionEnabled] = useState(true);
  const [emergencyEnabled, setEmergencyEnabled] = useState(false);

  // Pillar 5: Financial Accounting
  const [costCenter, setCostCenter] = useState('CC-CLN-01');
  const [revenueCenter, setRevenueCenter] = useState('RC-CLN-01');
  const [budget, setBudget] = useState(450000);
  const [billingEnabled, setBillingEnabled] = useState(true);

  // Auto-suggestion based on department name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!shortName || shortName === name) {
      setShortName(val.split(' ')[0] || '');
    }
    const cleanWords = val.trim().split(/\s+/);
    const acronym = cleanWords
      .map((w) => w.substring(0, 4).toUpperCase())
      .filter((w) => !['AND', '&', 'OF', 'THE'].includes(w))[0] || 'NEW';

    if (code === 'DEPT-' || code.startsWith('DEPT-')) {
      setCode(`DEPT-${acronym}`);
      setCostCenter(`CC-CLN-${acronym.substring(0, 3)}`);
      setRevenueCenter(`RC-CLN-${acronym.substring(0, 3)}`);
    }
  };

  // Selected building reference
  const currentBuilding = useMemo(() => {
    return (
      campusBuildings.find((b) => b.id === selectedBuildingId) ||
      campusBuildings[0]
    );
  }, [campusBuildings, selectedBuildingId]);

  // Aggregate selected beds count
  const totalSelectedBeds = useMemo(() => {
    let count = 0;
    currentBuilding?.floors.forEach((f) => {
      f.wards.forEach((w) => {
        if (selectedWardIds.includes(w.id)) {
          count += w.beds.length;
        }
      });
    });
    return count;
  }, [currentBuilding, selectedWardIds]);

  // Total staff deployed
  const totalStaffCount =
    (doctorsCount || 0) +
    (nursesCount || 0) +
    (techsCount || 0) +
    (receptionistsCount || 0);

  // Nurse-to-bed clinical safety ratio
  const nurseToBedRatio = useMemo(() => {
    if (totalSelectedBeds === 0) return null;
    if (!nursesCount || nursesCount <= 0) return 999;
    return (totalSelectedBeds / nursesCount).toFixed(1);
  }, [totalSelectedBeds, nursesCount]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 1 && (!name.trim() || !code.trim() || !head.trim())) {
      alert('Please provide the Department Name, Code, and Head of Department.');
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as any);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !head.trim()) {
      alert('Please fill out essential departmental identity details.');
      setStep(1);
      return;
    }

    // Determine assigned floors names
    const floorNamesSet = new Set<string>();
    currentBuilding?.floors.forEach((f) => {
      f.wards.forEach((w) => {
        if (selectedWardIds.includes(w.id)) floorNamesSet.add(f.floorNumber);
      });
      f.rooms.forEach((r) => {
        if (selectedRoomIds.includes(r.id)) floorNamesSet.add(f.floorNumber);
      });
    });

    const newDept: DepartmentProfileData = {
      id: Date.now().toString(),
      code: code.trim().toUpperCase(),
      name: name.trim(),
      shortName: shortName.trim() || name.trim(),
      category: category === 'custom' ? 'clinical' : category,
      description:
        description.trim() ||
        `Hospital division providing healthcare, diagnostic or administrative services under ${name.trim()}.`,
      head: head.trim(),
      hours: hours === 'custom' ? customHours || '08:00 - 18:00' : hours,
      shiftPattern:
        shiftPattern === 'custom' ? customShiftPattern || 'General Shift' : shiftPattern,
      costCenter: costCenter.trim().toUpperCase() || `CC-${code.replace('DEPT-', '')}`,
      revenueCenter:
        revenueCenter.trim().toUpperCase() || `RC-${code.replace('DEPT-', '')}`,
      budget: budget || 350000,
      billingEnabled,
      staffCount: totalStaffCount || 1,
      status: 'ACTIVE',

      // Operational
      isOpen24Hours: hours.includes('24/7'),
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      appointmentBased: true,
      walkInAllowed: true,
      emergencyEnabled,

      // Clinical
      consultationEnabled,
      admissionEnabled,
      procedureEnabled,
      labRequestsEnabled,
      prescriptionEnabled,

      // Staff
      doctorsCount,
      nursesCount,
      techsCount,
      receptionistsCount,
      onCallRoster: onCallRoster.trim(),

      // Campus Infrastructure
      assignedBuildingId: selectedBuildingId,
      buildingAssigned: currentBuilding?.name || 'North Central Hospital Tower',
      floorAssigned: Array.from(floorNamesSet).join(', ') || 'Ground Floor',
      assignedFloorIds: selectedFloorIds,
      assignedWardIds: selectedWardIds,
      assignedRoomIds: selectedRoomIds,
      wardsCount: selectedWardIds.length,
      bedsCount: totalSelectedBeds,
      roomsCount: selectedRoomIds.length,
      hasDedicatedWaitingArea,
    };

    // Synchronize claims directly to Campus Infrastructure
    syncDepartmentToCampus(newDept.name, selectedBuildingId, selectedWardIds, selectedRoomIds);

    // Synchronize assigned staff members from Staff Master to this department
    const allStaffToAssign = Array.from(
      new Set([
        ...selectedStaffIds,
        ...(selectedHODStaffId ? [selectedHODStaffId] : []),
      ])
    );
    if (allStaffToAssign.length > 0) {
      assignStaffMembersToDepartment(allStaffToAssign, newDept.id, newDept.name);
    }

    // Auto-provision independent dedicated department workspace
    autoProvisionWorkspace(newDept.id, {
      departmentId: newDept.id,
      departmentCode: newDept.code,
      departmentName: newDept.name,
      shortName: newDept.shortName,
      category: newDept.category as any,
      adminName: head.trim(),
      adminEmail: `${code.toLowerCase().replace('dept-', '')}.admin@northhospital.com`,
      operatingHours: newDept.hours,
    });

    onSave(newDept);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{
          maxWidth: '880px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* ================= FIXED HEADER ================= */}
        <div
          style={{
            flexShrink: 0,
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--card-bg, #ffffff)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    color: 'var(--primary)',
                    padding: '0.375rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Building2 size={20} />
                </span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                  Register Hospital Department & Division
                </h3>
              </div>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Hospital Enterprise Setup • Commission identity and physical campus space allocation.
              </span>
            </div>
            <button className="action-btn" onClick={onClose} title="Cancel & Close">
              <X size={18} />
            </button>
          </div>

          {/* Step Navigation Pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              overflowX: 'auto',
              paddingBottom: '0.25rem',
            }}
          >
            {[
              { id: 1, label: '1. Identity & Governance' },
              { id: 2, label: '2. Campus Infrastructure' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id as any)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '20px',
                  border: `1px solid ${step === s.id ? 'var(--primary)' : 'var(--border-color)'}`,
                  backgroundColor:
                    step === s.id
                      ? 'var(--primary)'
                      : step > s.id
                      ? 'rgba(37, 99, 235, 0.08)'
                      : 'var(--card-bg, #ffffff)',
                  color: step === s.id ? '#ffffff' : 'var(--text-color)',
                  fontSize: '0.75rem',
                  fontWeight: step === s.id ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                {step > s.id ? <CheckCircle2 size={13} color="#2563eb" /> : null}
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ================= SCROLLABLE BODY ================= */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '1.5rem',
            backgroundColor: 'var(--bg-subtle, #f9fafb)',
          }}
        >
          {/* STEP 1: IDENTITY & LEADERSHIP */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                  Pillar 1: Identity, Governance & Leadership
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                  Define the legal hospital division name, official acronym code, classification category, and accountable chief clinician.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Official Department Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Cardiology & Cardiac Catheterization"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Department Code <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. DEPT-CARD"
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Standard prefix e.g. DEPT-PULM, DEPT-ORTHO
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Short Acronym / Display Name</label>
                  <input
                    className="form-input"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="e.g. Cardiology"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Classification Category</label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                  >
                    <option value="clinical">Clinical Care (OPD, IPD, ICU, OT, Trauma)</option>
                    <option value="diagnostic">Diagnostic & Imaging (Pathology, CT/MRI, Radiology)</option>
                    <option value="revenue">Revenue & Patient Billing (Cashier, Insurance/TPA)</option>
                    <option value="admin">Administration & HR (Medical Records, Legal)</option>
                    <option value="support">Support & Facilities (Biomed, Pharmacy, Housekeeping)</option>
                    <option value="custom">+ Add Custom Category...</option>
                  </select>
                </div>

                {category === 'custom' && (
                  <div className="form-group">
                    <label className="form-label">Enter Custom Classification Category</label>
                    <input
                      className="form-input"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. Research & Genomics"
                    />
                  </div>
                )}

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">
                      Head of Department (HOD) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomHOD(!isCustomHOD);
                        if (!isCustomHOD) {
                          setSelectedHODStaffId('');
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      {isCustomHOD ? '← Select from Staff Master' : '+ Custom Clinician Name'}
                    </button>
                  </div>

                  {!isCustomHOD ? (
                    <select
                      className="form-select"
                      value={selectedHODStaffId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__custom__') {
                          setIsCustomHOD(true);
                          setSelectedHODStaffId('');
                        } else {
                          setSelectedHODStaffId(val);
                          const stf = hospitalStaff.find((s) => s.id === val);
                          if (stf) {
                            setHead(stf.fullName);
                          } else {
                            setHead('');
                          }
                        }
                      }}
                      required
                    >
                      <option value="">-- Select Qualified Staff Member as HOD --</option>
                      <optgroup label="Doctors & Specialists (Staff Master)">
                        {hospitalStaff
                          .filter((s) => s.role === 'doctor')
                          .map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              {doc.fullName} [{doc.employeeCode}] — {doc.designation}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Nursing Leaders & Senior Staff">
                        {hospitalStaff
                          .filter((s) => s.role !== 'doctor')
                          .map((stf) => (
                            <option key={stf.id} value={stf.id}>
                              {stf.fullName} [{stf.employeeCode}] — {stf.designation}
                            </option>
                          ))}
                      </optgroup>
                      <option value="__custom__">+ Enter Custom External Clinician...</option>
                    </select>
                  ) : (
                    <input
                      className="form-input"
                      value={head}
                      onChange={(e) => setHead(e.target.value)}
                      placeholder="e.g. Dr. Arthur Pendelton, MD, FACS"
                      required
                    />
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Chief physician legally and clinically accountable for this department
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Operating Schedule & Staff Timings</label>
                  <select
                    className="form-select"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                  >
                    <optgroup label="Hospital Profile Configured Shifts">
                      {hospitalShifts.map((sh) => (
                        <option key={sh.id} value={`${sh.name} (${sh.startTime} - ${sh.endTime})`}>
                          {sh.name} • {sh.startTime} - {sh.endTime} ({sh.duration})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Standard Hospital Timings">
                      <option value="24/7 Continuous Emergency & Inpatient">24/7 Continuous Emergency & Inpatient</option>
                      <option value="08:00 - 20:00 Ambulatory OPD">08:00 - 20:00 Ambulatory OPD (Mon - Sat)</option>
                      <option value="09:00 - 17:00 Administrative / Daycare">09:00 - 17:00 Administrative / Daycare</option>
                    </optgroup>
                    <option value="custom">+ Add Custom Operating Hours...</option>
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Inherited from Hospital Profile Staff Timings Master
                  </span>
                </div>

                {hours === 'custom' && (
                  <div className="form-group">
                    <label className="form-label">Specify Custom Working Hours</label>
                    <input
                      className="form-input"
                      value={customHours}
                      onChange={(e) => setCustomHours(e.target.value)}
                      placeholder="e.g. 07:00 - 22:00 (Rotational)"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Shift Pattern</label>
                  <select
                    className="form-select"
                    value={shiftPattern}
                    onChange={(e) => setShiftPattern(e.target.value)}
                  >
                    <option value="Rotational Multi-Shift (Morning / Evening / Night)">Rotational Multi-Shift (Morning / Evening / Night)</option>
                    <optgroup label="Dedicated Hospital Shifts">
                      {hospitalShifts.map((sh) => (
                        <option key={sh.id} value={`Dedicated Shift: ${sh.name} (${sh.startTime} - ${sh.endTime})`}>
                          {sh.name} ({sh.startTime} - {sh.endTime})
                        </option>
                      ))}
                    </optgroup>
                    <option value="Single Day Shift (09:00 - 17:00)">Single Day Shift (09:00 - 17:00)</option>
                    <option value="On-Call Emergency Rotation">On-Call Emergency Rotation</option>
                    <option value="custom">+ Add Custom Shift Pattern...</option>
                  </select>
                </div>

                {shiftPattern === 'custom' && (
                  <div className="form-group">
                    <label className="form-label">Specify Custom Shift Pattern</label>
                    <input
                      className="form-input"
                      value={customShiftPattern}
                      onChange={(e) => setCustomShiftPattern(e.target.value)}
                      placeholder="e.g. 12-Hour Fixed ICU Rotation"
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Department Description & Clinical Scope</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Primary acute and elective clinical division specializing in diagnostic catheterization, interventional cardiology, and heart failure telemetry."
                />
              </div>

              {/* Dedicated Workspace Automatic Provisioning Banner */}
              <div
                style={{
                  backgroundColor: 'rgba(2, 132, 199, 0.06)',
                  border: '1px solid rgba(2, 132, 199, 0.25)',
                  borderRadius: '8px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} color="var(--primary)" />
                  <strong style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>
                    Automatic Independent Workspace Provisioning
                  </strong>
                  <span className="badge badge-success" style={{ fontSize: '0.6875rem', marginLeft: 'auto' }}>
                    Dedicated Engine
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  Registering this department automatically configures a dedicated, role-scoped workspace accessible by the assigned Department Administrator. The workspace includes independent doctor rostering, room stationing, and shift scheduling.
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '1rem',
                    fontSize: '0.75rem',
                    paddingTop: '0.375rem',
                    borderTop: '1px dashed rgba(2, 132, 199, 0.2)',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Workspace Admin: </span>
                    <strong>{head || '(Select HOD above)'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Login Account: </span>
                    <code style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      {code ? `${code.toLowerCase().replace('dept-', '')}.admin@northhospital.com` : 'dept.admin@northhospital.com'}
                    </code>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Scope Security: </span>
                    <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>Strictly Scoped to {name || 'Department'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CAMPUS INFRASTRUCTURE ALLOCATION */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                  Pillar 2: Campus Infrastructure & Physical Footprint Allocation
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                  Allocate physical spaces directly from the hospital master blueprint. Selected wards auto-aggregate into the department's capacity.
                </p>
              </div>

              {/* Building Selector */}
              <div className="form-group">
                <label className="form-label">Hospital Campus Building</label>
                <select
                  className="form-select"
                  value={selectedBuildingId}
                  onChange={(e) => {
                    setSelectedBuildingId(e.target.value);
                    setSelectedWardIds([]);
                    setSelectedRoomIds([]);
                  }}
                >
                  {campusBuildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code}) — {b.totalFloorsCount} Floors • {b.buildingType}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Footprint Meter */}
              <div
                style={{
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Allocated Physical Footprint
                  </span>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.25rem' }}>
                    {selectedWardIds.length} Clinical Wards • {totalSelectedBeds} Total Beds • {selectedRoomIds.length} Consultation Chambers
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="badge badge-info">{currentBuilding?.name}</span>
                </div>
              </div>

              {/* Floors and Wards Hierarchy */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {currentBuilding?.floors.map((floor) => (
                  <div
                    key={floor.id}
                    style={{
                      backgroundColor: 'var(--card-bg, #ffffff)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div>
                        <strong style={{ fontSize: '0.9375rem', display: 'block' }}>
                          {floor.floorNumber} — {floor.wing}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Zone: {floor.accessZone} • Code: {floor.code}
                        </span>
                      </div>
                      <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                        {floor.wards.length} Wards • {floor.rooms.length} Rooms
                      </span>
                    </div>

                    {/* Wards on this floor */}
                    {floor.wards.length > 0 && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-color)', display: 'block', marginBottom: '0.5rem' }}>
                          Assign Clinical Wards & Beds:
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.5rem' }}>
                          {floor.wards.map((ward) => {
                            const isChecked = selectedWardIds.includes(ward.id);
                            const isOccupiedByOther = ward.departmentName && ward.departmentName !== name;
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
                                    : isOccupiedByOther
                                    ? 'rgba(234, 88, 12, 0.04)'
                                    : 'var(--bg-subtle, #f9fafb)',
                                  border: `1px solid ${
                                    isChecked
                                      ? 'var(--primary)'
                                      : isOccupiedByOther
                                      ? '#fdba74'
                                      : 'var(--border-color)'
                                  }`,
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedWardIds([...selectedWardIds, ward.id]);
                                    } else {
                                      setSelectedWardIds(selectedWardIds.filter((id) => id !== ward.id));
                                    }
                                  }}
                                  style={{ marginTop: '2px' }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{ward.name}</span>
                                    {ward.departmentName ? (
                                      <span
                                        style={{
                                          fontSize: '0.6875rem',
                                          padding: '0.15rem 0.4rem',
                                          borderRadius: '4px',
                                          backgroundColor: '#ffedd5',
                                          color: '#c2410c',
                                          fontWeight: 600,
                                        }}
                                      >
                                        In Use: {ward.departmentName}
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          fontSize: '0.6875rem',
                                          padding: '0.15rem 0.4rem',
                                          borderRadius: '4px',
                                          backgroundColor: '#dcfce7',
                                          color: '#15803d',
                                          fontWeight: 600,
                                        }}
                                      >
                                        🟢 Available
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {ward.wardType} • <strong>{ward.beds.length} Beds</strong> • Sister {ward.supervisorNurse}
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
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-color)', display: 'block', marginBottom: '0.5rem' }}>
                          Assign Consultation Chambers & Procedure Suites:
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
                          {floor.rooms.map((room) => {
                            const isChecked = selectedRoomIds.includes(room.id);
                            const isOccupiedByOther = room.departmentName && room.departmentName !== name;
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
                                    : isOccupiedByOther
                                    ? 'rgba(234, 88, 12, 0.04)'
                                    : 'var(--bg-subtle, #f9fafb)',
                                  border: `1px solid ${
                                    isChecked
                                      ? '#0ea5e9'
                                      : isOccupiedByOther
                                      ? '#fdba74'
                                      : 'var(--border-color)'
                                  }`,
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRoomIds([...selectedRoomIds, room.id]);
                                    } else {
                                      setSelectedRoomIds(selectedRoomIds.filter((id) => id !== room.id));
                                    }
                                  }}
                                  style={{ marginTop: '2px' }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{room.roomNumber}</span>
                                    {room.departmentName ? (
                                      <span
                                        style={{
                                          fontSize: '0.6875rem',
                                          padding: '0.15rem 0.35rem',
                                          borderRadius: '4px',
                                          backgroundColor: '#ffedd5',
                                          color: '#c2410c',
                                          fontWeight: 600,
                                        }}
                                      >
                                        In Use
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          fontSize: '0.6875rem',
                                          padding: '0.15rem 0.35rem',
                                          borderRadius: '4px',
                                          backgroundColor: '#dcfce7',
                                          color: '#15803d',
                                          fontWeight: 600,
                                        }}
                                      >
                                        🟢 Free
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {room.roomType} (Cap: {room.capacity})
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

              {/* Waiting Area Toggle */}
              <div
                style={{
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={hasDedicatedWaitingArea}
                    onChange={(e) => setHasDedicatedWaitingArea(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.875rem', display: 'block' }}>Dedicated Waiting Lounge & Queue Screen</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Enables a digital token display queue screen and attendant seating in this department's lobby.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ================= FIXED FOOTER ================= */}
        <div
          style={{
            flexShrink: 0,
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--card-bg, #ffffff)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Left summary counter */}
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-info">{code || 'DEPT'}</span>
            <span>
              {selectedWardIds.length} Wards ({totalSelectedBeds} Beds) • {selectedRoomIds.length} Rooms Allocated
            </span>
          </div>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>

            {step > 1 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleBack}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <ChevronLeft size={16} /> Back
              </button>
            )}

            {step === 1 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNext}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                Next Step <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#10b981' }}
              >
                <CheckCircle2 size={16} /> Register & Commission Department
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
