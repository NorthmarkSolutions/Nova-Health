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
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const campusBuildings = useMemo(() => getCampusBuildings(), [isOpen]);

  // Pillar 1: Identity & Leadership
  const [name, setName] = useState('');
  const [code, setCode] = useState('DEPT-');
  const [shortName, setShortName] = useState('');
  const [category, setCategory] = useState<
    'clinical' | 'diagnostic' | 'revenue' | 'admin' | 'support' | 'custom'
  >('clinical');
  const [customCategory, setCustomCategory] = useState('');
  const [head, setHead] = useState('');
  const [hours, setHours] = useState('08:00 - 20:00 Ambulatory OPD');
  const [customHours, setCustomHours] = useState('');
  const [shiftPattern, setShiftPattern] = useState('General 2-Shift (08:00 - 20:00)');
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
    if (step < 5) {
      setStep((step + 1) as any);
    }
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
                Hospital Enterprise Setup • Commission identity, physical campus space, staff roster, clinical scope, and financials.
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
              { id: 3, label: '3. Staff Deployment' },
              { id: 4, label: '4. Clinical Scope' },
              { id: 5, label: '5. Financial Ledger' },
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
                  <label className="form-label">
                    Head of Department (HOD) / Chief Clinician <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={head}
                    onChange={(e) => setHead(e.target.value)}
                    placeholder="e.g. Dr. Sarah Jenkins, MD"
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Chief physician or administrator legally accountable for division
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Operating Schedule</label>
                  <select
                    className="form-select"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                  >
                    <option value="24/7 Continuous Emergency & Inpatient">24/7 Continuous Emergency & Inpatient</option>
                    <option value="08:00 - 20:00 Ambulatory OPD">08:00 - 20:00 Ambulatory OPD (Mon - Sat)</option>
                    <option value="09:00 - 17:00 Administrative / Daycare">09:00 - 17:00 Administrative / Daycare</option>
                    <option value="custom">+ Add Custom Operating Hours...</option>
                  </select>
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
                    <option value="3-Shift 24x7 (Rotational)">3-Shift 24x7 (Morning / Evening / Night)</option>
                    <option value="General 2-Shift (08:00 - 20:00)">General 2-Shift (08:00 - 20:00 OPD)</option>
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
                            return (
                              <label
                                key={ward.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '0.625rem',
                                  padding: '0.625rem 0.75rem',
                                  backgroundColor: isChecked ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-subtle, #f9fafb)',
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
                                      setSelectedWardIds([...selectedWardIds, ward.id]);
                                    } else {
                                      setSelectedWardIds(selectedWardIds.filter((id) => id !== ward.id));
                                    }
                                  }}
                                  style={{ marginTop: '2px' }}
                                />
                                <div>
                                  <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{ward.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
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
                            return (
                              <label
                                key={room.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '0.625rem',
                                  padding: '0.5rem 0.75rem',
                                  backgroundColor: isChecked ? 'rgba(14, 165, 233, 0.08)' : 'var(--bg-subtle, #f9fafb)',
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
                                      setSelectedRoomIds([...selectedRoomIds, room.id]);
                                    } else {
                                      setSelectedRoomIds(selectedRoomIds.filter((id) => id !== room.id));
                                    }
                                  }}
                                  style={{ marginTop: '2px' }}
                                />
                                <div>
                                  <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{room.roomNumber}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
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

          {/* STEP 3: STAFFING DEPLOYMENT */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                  Pillar 3: Staffing & Human Resources Deployment
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                  Allocate clinical and support headcount. The nurse-to-bed ratio calculates live from your physical ward selections in Pillar 2.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group" style={{ backgroundColor: 'var(--card-bg, #ffffff)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Consultant Doctors</label>
                  <input
                    type="number"
                    className="form-input"
                    value={doctorsCount}
                    onChange={(e) => setDoctorsCount(parseInt(e.target.value) || 0)}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Specialists & residents</span>
                </div>

                <div className="form-group" style={{ backgroundColor: 'var(--card-bg, #ffffff)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Registered Nurses</label>
                  <input
                    type="number"
                    className="form-input"
                    value={nursesCount}
                    onChange={(e) => setNursesCount(parseInt(e.target.value) || 0)}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ward sisters & staff nurses</span>
                </div>

                <div className="form-group" style={{ backgroundColor: 'var(--card-bg, #ffffff)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Technicians & Paramedics</label>
                  <input
                    type="number"
                    className="form-input"
                    value={techsCount}
                    onChange={(e) => setTechsCount(parseInt(e.target.value) || 0)}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lab, OT & biomed staff</span>
                </div>

                <div className="form-group" style={{ backgroundColor: 'var(--card-bg, #ffffff)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Front Desk & Queue Handlers</label>
                  <input
                    type="number"
                    className="form-input"
                    value={receptionistsCount}
                    onChange={(e) => setReceptionistsCount(parseInt(e.target.value) || 0)}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Token coordinators</span>
                </div>
              </div>

              {/* Staff-to-Bed Safety Metric Banner */}
              <div
                style={{
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={20} color={totalSelectedBeds > 0 ? '#10b981' : 'var(--primary)'} />
                    <strong style={{ fontSize: '0.9375rem' }}>Staff-to-Bed Clinical Safety Metric</strong>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                    {totalSelectedBeds > 0
                      ? `Evaluating ${nursesCount} deployed nurses against ${totalSelectedBeds} aggregate hospital beds.`
                      : 'Ambulatory OPD Model: No inpatient ward beds selected. Nurse-to-bed ratio is not required.'}
                  </p>
                </div>

                <div>
                  {totalSelectedBeds > 0 ? (
                    <div
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        backgroundColor:
                          (nursesCount || 0) >= totalSelectedBeds / 2
                            ? 'rgba(16, 185, 129, 0.12)'
                            : 'rgba(245, 158, 11, 0.12)',
                        border: `1px solid ${
                          (nursesCount || 0) >= totalSelectedBeds / 2
                            ? '#10b981'
                            : '#f59e0b'
                        }`,
                        textAlign: 'right',
                      }}
                    >
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, display: 'block', color: (nursesCount || 0) >= totalSelectedBeds / 2 ? '#047857' : '#b45309' }}>
                        Ratio: 1 Nurse per {nurseToBedRatio} Beds
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {(nursesCount || 0) >= totalSelectedBeds / 2
                          ? '✓ Meets NABH/JCI Inpatient Acute Threshold'
                          : '⚠ Consider deploying additional ward nurses'}
                      </span>
                    </div>
                  ) : (
                    <span className="badge badge-info" style={{ padding: '0.5rem 0.875rem' }}>
                      Ambulatory OPD / Non-Bed Model
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">On-Call Specialist Emergency Roster & Emergency Pager</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={onCallRoster}
                  onChange={(e) => setOnCallRoster(e.target.value)}
                  placeholder="e.g. Primary On-Call: Dr. Sarah Jenkins (Ext: 104) • Secondary Consultant: Pager #881"
                />
              </div>
            </div>
          )}

          {/* STEP 4: CLINICAL SCOPE & PRIVILEGES */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                  Pillar 4: Clinical Scope & Governance Rights
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                  Define what medical actions doctors and nurses stationed in this department are legally and digitally authorized to perform in the HMS.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div
                  style={{
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={consultationEnabled}
                    onChange={(e) => setConsultationEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', marginTop: '2px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Consultation SOAP Notes</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Author OPD and IPD clinical progress notes, symptom evaluations, and diagnosis charting.
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={admissionEnabled}
                    onChange={(e) => setAdmissionEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', marginTop: '2px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Inpatient Bed Admission Rights</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Authorizes physicians to admit patients to hospital beds and assign primary attending care.
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={procedureEnabled}
                    onChange={(e) => setProcedureEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', marginTop: '2px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Surgical & OT Procedures</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Authorizes booking Operation Theatres (OT), endoscopy suites, and minor surgery charting.
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={labRequestsEnabled}
                    onChange={(e) => setLabRequestsEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', marginTop: '2px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Lab & Imaging Order Rights</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Permits clinicians to order biochemistry, hematology, MRI, CT, and X-ray investigations.
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={prescriptionEnabled}
                    onChange={(e) => setPrescriptionEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', marginTop: '2px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.9375rem', display: 'block' }}>E-Prescription & Pharmacy Dispense</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Generates digital prescriptions routed directly to the inpatient and retail pharmacy counters.
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={emergencyEnabled}
                    onChange={(e) => setEmergencyEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', marginTop: '2px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.9375rem', display: 'block' }}>Emergency Trauma Intake</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Marks this department as an emergency triage receiving center for code red/yellow admissions.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: FINANCIAL ACCOUNTING */}
          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                  Pillar 5: Financial Accounting & Revenue Center
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                  Link hospital General Ledger cost centers, revenue tracking, annual operating budget, and patient billing status.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Cost Center Code (General Ledger)</label>
                  <input
                    className="form-input"
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value.toUpperCase())}
                    placeholder="e.g. CC-CLN-08"
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Tracks departmental supplies and operational expenditures
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Revenue Center Code</label>
                  <input
                    className="form-input"
                    value={revenueCenter}
                    onChange={(e) => setRevenueCenter(e.target.value.toUpperCase())}
                    placeholder="e.g. RC-CLN-08"
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Captures procedure, consultation, and bed charges
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Annual Operating Budget ($ USD)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={budget}
                    onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 450000"
                  />
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={billingEnabled}
                      onChange={(e) => setBillingEnabled(e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <strong style={{ fontSize: '0.875rem', display: 'block' }}>Department Direct Billing Enabled</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Allows doctors and billing clerks to post line-item charges directly to patient folios.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Commissioning Summary Card */}
              <div
                style={{
                  backgroundColor: 'rgba(37, 99, 235, 0.05)',
                  border: '1px solid #93c5fd',
                  borderRadius: '10px',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Sparkles size={18} color="var(--primary)" />
                  <strong style={{ fontSize: '0.9375rem', color: 'var(--primary)' }}>
                    Ready to Commission Division: {name || 'New Department'}
                  </strong>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>Code: <strong>{code}</strong> • Head: <strong>{head}</strong></div>
                  <div>Campus: <strong>{currentBuilding?.name}</strong></div>
                  <div>Allocated: <strong>{selectedWardIds.length} Wards</strong> (<strong>{totalSelectedBeds} Beds</strong>)</div>
                  <div>Headcount: <strong>{totalStaffCount} Personnel</strong> ({doctorsCount} Drs, {nursesCount} Nurses)</div>
                  <div>Ledger: Cost <strong>{costCenter}</strong> • Rev <strong>{revenueCenter}</strong> • Budget: <strong>${budget.toLocaleString()}</strong></div>
                  <div>Status: <strong>Active Clinical Division</strong></div>
                </div>
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
              {selectedWardIds.length} Wards ({totalSelectedBeds} Beds) • {totalStaffCount} Staff • ${budget.toLocaleString()}
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

            {step < 5 ? (
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
                <CheckCircle2 size={16} /> Provision & Commission Department
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
