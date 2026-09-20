import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  Sparkles,
  Save,
  CheckCircle2,
  Clock,
  DollarSign,
  Layers,
  Calendar,
  Users,
  Activity,
  BedDouble,
  FlaskConical,
  Pill,
  Receipt,
  RotateCcw,
  Ticket,
  Globe,
  Stethoscope,
  DoorClosed,
  AlertCircle,
  ArrowUpRight,
  Search,
  Check,
  RefreshCw,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import {
  DepartmentWorkspace,
  DepartmentWorkspaceConfig,
  DepartmentTariffMaster,
  DoctorTariffItem,
  WardTariffItem,
  RoomTariffItem,
  BedCategoryTariffItem,
} from '../../types';
import {
  saveDepartmentWorkspace,
  getDepartmentTariffMaster,
  saveDepartmentTariffMaster,
  updateDoctorConsultationFee,
} from './departmentWorkspaceStore';

interface Props {
  workspace: DepartmentWorkspace;
  onWorkspaceUpdated?: (updated: DepartmentWorkspace) => void;
}

export const DepartmentSettings: React.FC<Props> = ({ workspace, onWorkspaceUpdated }) => {
  // Navigation Subtab State
  const [activeTab, setActiveTab] = useState<'capabilities' | 'tariffs'>('tariffs');

  // Modular Engine Config State (Tab 1)
  const [config, setConfig] = useState<DepartmentWorkspaceConfig>({
    ...workspace.config,
  });
  const [operatingHours, setOperatingHours] = useState(workspace.operatingHours || '08:00 - 20:00 (Mon-Sat)');
  const [adminEmail, setAdminEmail] = useState(workspace.adminEmail || '');
  const [adminName, setAdminName] = useState(workspace.adminName || '');
  const [isSaved, setIsSaved] = useState(false);

  const [dailyCapacity, setDailyCapacity] = useState<number>(
    workspace.config?.dailyCapacity ?? 100
  );
  const [isWalkInAllowed, setIsWalkInAllowed] = useState<boolean>(
    workspace.config?.isWalkInAllowed ?? true
  );
  const [isTokenSystemEnabled, setIsTokenSystemEnabled] = useState<boolean>(
    workspace.config?.isTokenSystemEnabled ?? true
  );
  const [isOnlineAppointmentEnabled, setIsOnlineAppointmentEnabled] = useState<boolean>(
    workspace.config?.isOnlineAppointmentEnabled ?? true
  );

  // Department Tariff & Pricing Master State (Tab 2)
  const [tariffMaster, setTariffMaster] = useState<DepartmentTariffMaster>(() =>
    getDepartmentTariffMaster(workspace.departmentId)
  );
  const [doctorSearch, setDoctorSearch] = useState('');
  const [tariffCategoryFilter, setTariffCategoryFilter] = useState<'all' | 'doctors' | 'wards' | 'rooms' | 'intake'>('all');
  const [isTariffSaved, setIsTariffSaved] = useState(false);
  const [tariffSuccessMsg, setTariffSuccessMsg] = useState<string | null>(null);

  // Selected Doctor for Live Receptionist / Cashier Simulation
  const [simulatedDoctorId, setSimulatedDoctorId] = useState<string>('');

  const reloadTariffs = () => {
    const loaded = getDepartmentTariffMaster(workspace.departmentId);
    setTariffMaster(loaded);
    if (loaded.doctorTariffs.length > 0 && !simulatedDoctorId) {
      setSimulatedDoctorId(loaded.doctorTariffs[0].doctorId);
    }
  };

  useEffect(() => {
    reloadTariffs();
  }, [workspace.departmentId]);

  const toggleFlag = (flagKey: keyof DepartmentWorkspaceConfig) => {
    setConfig((prev) => ({
      ...prev,
      [flagKey]: !prev[flagKey],
    }));
    setIsSaved(false);
  };

  const handleApplyStep9Presets = () => {
    setDailyCapacity(100);
    setIsWalkInAllowed(true);
    setIsTokenSystemEnabled(true);
    setIsOnlineAppointmentEnabled(true);
    setConfig((prev) => ({
      ...prev,
      hasQueue: true,
      hasWalkIn: true,
      hasAppointments: true,
      dailyCapacity: 100,
      isWalkInAllowed: true,
      isTokenSystemEnabled: true,
      isOnlineAppointmentEnabled: true,
    }));
    setIsSaved(false);
  };

  const handleSaveCapabilities = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedConfig: DepartmentWorkspaceConfig = {
      ...config,
      dailyCapacity: Number(dailyCapacity),
      isWalkInAllowed,
      isTokenSystemEnabled,
      isOnlineAppointmentEnabled,
    };

    const updated: DepartmentWorkspace = {
      ...workspace,
      operatingHours,
      adminEmail,
      adminName,
      config: updatedConfig,
      updatedAt: new Date().toISOString(),
    };
    saveDepartmentWorkspace(updated);
    if (onWorkspaceUpdated) {
      onWorkspaceUpdated(updated);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Tariff Handlers
  const handleDoctorFeeChange = (
    doctorId: string,
    field: 'standardFee' | 'followUpFee' | 'emergencyFee',
    val: number
  ) => {
    setTariffMaster((prev) => ({
      ...prev,
      doctorTariffs: prev.doctorTariffs.map((doc) =>
        doc.doctorId === doctorId
          ? {
              ...doc,
              [field]: val,
              ...(field === 'standardFee' && {
                followUpFee: Math.round(val * 0.6),
                emergencyFee: Math.round(val * 1.5),
              }),
              lastUpdated: new Date().toISOString(),
            }
          : doc
      ),
    }));
    setIsTariffSaved(false);
  };

  const handleApplyPresetToDoctor = (doctorId: string, presetFee: number) => {
    handleDoctorFeeChange(doctorId, 'standardFee', presetFee);
  };

  const handleWardFeeChange = (
    wardId: string,
    field: 'dailyRate' | 'hourlyRate' | 'nursingChargePerDay',
    val: number
  ) => {
    setTariffMaster((prev) => ({
      ...prev,
      wardTariffs: prev.wardTariffs.map((w) => (w.wardId === wardId ? { ...w, [field]: val } : w)),
    }));
    setIsTariffSaved(false);
  };

  const handleRoomFeeChange = (
    roomId: string,
    field: 'facilityFee' | 'hourlyProcedureRate',
    val: number
  ) => {
    setTariffMaster((prev) => ({
      ...prev,
      roomTariffs: prev.roomTariffs.map((r) => (r.roomId === roomId ? { ...r, [field]: val } : r)),
    }));
    setIsTariffSaved(false);
  };

  const handleBedCategoryFeeChange = (
    id: string,
    field: 'dailyRate' | 'hourlyRate',
    val: number
  ) => {
    setTariffMaster((prev) => ({
      ...prev,
      bedCategoryTariffs: prev.bedCategoryTariffs.map((b) => (b.id === id ? { ...b, [field]: val } : b)),
    }));
    setIsTariffSaved(false);
  };

  const handleSaveAllTariffs = () => {
    saveDepartmentTariffMaster(tariffMaster);
    setIsTariffSaved(true);
    setTariffSuccessMsg('✓ Department Tariffs saved and synchronized with Reception Desk & Central Billing!');
    setTimeout(() => {
      setIsTariffSaved(false);
      setTariffSuccessMsg(null);
    }, 4000);
  };

  // Filtered Doctors for Pricing Table
  const filteredDoctors = useMemo(() => {
    if (!doctorSearch.trim()) return tariffMaster.doctorTariffs;
    const q = doctorSearch.toLowerCase();
    return tariffMaster.doctorTariffs.filter(
      (d) =>
        d.doctorName.toLowerCase().includes(q) ||
        d.employeeCode.toLowerCase().includes(q) ||
        d.specialization.toLowerCase().includes(q) ||
        d.designation.toLowerCase().includes(q)
    );
  }, [tariffMaster.doctorTariffs, doctorSearch]);

  // Doctor Selected for Simulator
  const simulatedDoctor = useMemo(() => {
    return (
      tariffMaster.doctorTariffs.find((d) => d.doctorId === simulatedDoctorId) ||
      tariffMaster.doctorTariffs[0]
    );
  }, [tariffMaster.doctorTariffs, simulatedDoctorId]);

  // KPI Calculations
  const totalDoctors = tariffMaster.doctorTariffs.length;
  const avgDoctorFee =
    totalDoctors > 0
      ? Math.round(tariffMaster.doctorTariffs.reduce((acc, d) => acc + (d.standardFee || 0), 0) / totalDoctors)
      : 0;
  const totalWards = tariffMaster.wardTariffs.length;
  const totalBeds = tariffMaster.wardTariffs.reduce((acc, w) => acc + (w.totalBeds || 0), 0);
  const totalRooms = tariffMaster.roomTariffs.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span
              style={{
                backgroundColor: 'rgba(2, 132, 199, 0.1)',
                color: '#0284c7',
                padding: '0.375rem',
                borderRadius: '8px',
                display: 'flex',
              }}
            >
              <Settings size={22} />
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>
              {workspace.shortName} Settings & Service Pricing Master
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Configure operational capabilities, doctor consultation rates, room surcharges, and bed tariffs for {workspace.departmentName}.
          </p>
        </div>

        {activeTab === 'tariffs' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            {tariffSuccessMsg && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: '#15803d',
                  backgroundColor: '#dcfce7',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                }}
              >
                <CheckCircle2 size={16} /> Saved!
              </span>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveAllTariffs}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800 }}
            >
              <Save size={16} /> Save All Tariffs & Rates
            </button>
          </div>
        )}
      </div>

      {/* Navigation Subtabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.25rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('tariffs')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px 8px 0 0',
            fontWeight: 800,
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'tariffs' ? '#0284c7' : '#f1f5f9',
            color: activeTab === 'tariffs' ? '#ffffff' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
        >
          <DollarSign size={16} /> 1. Department Tariff & Price Master (Doctors, Beds, Wards, Rooms)
          <span
            style={{
              fontSize: '0.625rem',
              backgroundColor: activeTab === 'tariffs' ? '#ffffff' : '#0284c7',
              color: activeTab === 'tariffs' ? '#0284c7' : '#ffffff',
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              fontWeight: 900,
            }}
          >
            ACTIVE MASTER
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('capabilities')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px 8px 0 0',
            fontWeight: 700,
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'capabilities' ? '#0284c7' : '#f1f5f9',
            color: activeTab === 'capabilities' ? '#ffffff' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Settings size={16} /> 2. Modular Engine & Intake Policies
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TARIFF & PRICING MASTER                                           */}
      {/* ========================================================================= */}
      {activeTab === 'tariffs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Synchronized Real-Time Banner */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              border: '1.5px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: '#dbeafe', color: '#1d4ed8', display: 'flex' }}>
                <Globe size={22} />
              </span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#1e3a8a' }}>
                    Real-Time Hospital Pricing Integration Active
                  </h4>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '4px',
                    }}
                  >
                    LIVE SYNC
                  </span>
                </div>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: '#3b82f6' }}>
                  Consultation fees, bed tariffs, and room surcharges configured here are immediately fetched by <strong>Receptionists (`/reception`)</strong>, <strong>Walk-in Token Dispenser</strong>, and <strong>Cashier/Billing</strong>.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <a
                href="/reception"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                title="Preview Reception Desk in new tab"
              >
                <span>View Receptionist Screen</span>
                <ArrowUpRight size={13} />
              </a>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '1rem',
            }}
          >
            <div className="card" style={{ padding: '1rem', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Doctor Consultations
                </span>
                <Stethoscope size={16} color="#0284c7" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--secondary)', marginTop: '0.25rem' }}>
                {totalDoctors} Doctors
              </div>
              <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600, marginTop: '0.2rem' }}>
                Avg Standard Fee: ${avgDoctorFee}.00
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', borderRadius: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  Wards & Daycare Beds
                </span>
                <BedDouble size={16} color="#16a34a" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#15803d', marginTop: '0.25rem' }}>
                {totalWards} Wards • {totalBeds} Beds
              </div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '0.2rem' }}>
                From ${tariffMaster.wardTariffs[0]?.dailyRate || 120}.00 / 24h
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', borderRadius: '12px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
                  Rooms & Chambers
                </span>
                <DoorClosed size={16} color="#ea580c" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#c2410c', marginTop: '0.25rem' }}>
                {totalRooms} Facilities
              </div>
              <div style={{ fontSize: '0.75rem', color: '#ea580c', fontWeight: 600, marginTop: '0.2rem' }}>
                Chambers, Procedure & Triage
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', borderRadius: '12px', backgroundColor: '#faf5ff', border: '1px solid #e9d5ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>
                  Base Intake & Vitals
                </span>
                <Ticket size={16} color="#9333ea" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#7e22ce', marginTop: '0.25rem' }}>
                ${tariffMaster.intakeRegistrationFee + tariffMaster.triageVitalsFee}.00
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9333ea', fontWeight: 600, marginTop: '0.2rem' }}>
                Reg: ${tariffMaster.intakeRegistrationFee} • Triage: ${tariffMaster.triageVitalsFee}
              </div>
            </div>
          </div>

          {/* Section Category Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              Jump to Category:
            </span>
            {[
              { id: 'all', label: 'All Tariffs' },
              { id: 'doctors', label: '🩺 Doctor Consultation Fees' },
              { id: 'wards', label: '🛏️ Wards & Observation Beds' },
              { id: 'rooms', label: '🚪 Consultation Chambers' },
              { id: 'intake', label: '🎫 Registration & Triage Fees' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`subtab-pill ${tariffCategoryFilter === cat.id ? 'active' : ''}`}
                onClick={() => setTariffCategoryFilter(cat.id as any)}
                style={{ fontSize: '0.7813rem', padding: '0.35rem 0.75rem' }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 1: DOCTORS CONSULTATION FEES MASTER                   */}
          {/* ------------------------------------------------------------- */}
          {(tariffCategoryFilter === 'all' || tariffCategoryFilter === 'doctors') && (
            <div className="card" style={{ padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ padding: '0.35rem', borderRadius: '6px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex' }}>
                      <Stethoscope size={18} />
                    </span>
                    <h4 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: 'var(--secondary)' }}>
                      Doctor Consultation Fees Master
                    </h4>
                    <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>
                      {tariffMaster.doctorTariffs.length} Doctors Stationed
                    </span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Set custom consultation tariffs for each doctor. Changes automatically update the Receptionist desk booking slots and walk-in token fees.
                  </p>
                </div>

                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: '2rem', fontSize: '0.8125rem' }}
                    placeholder="Search doctor or code..."
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '100px' }}>Code</th>
                      <th>Attending Doctor</th>
                      <th style={{ width: '160px' }}>Specialization</th>
                      <th style={{ width: '150px' }}>Standard OPD Fee</th>
                      <th style={{ width: '140px' }}>Follow-Up Fee</th>
                      <th style={{ width: '140px' }}>Emergency Fee</th>
                      <th style={{ minWidth: '200px' }}>Quick Fee Presets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDoctors.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No doctors found matching "{doctorSearch}". Register doctors in <strong>1. Staff Pool & Roster</strong> to configure their fees.
                        </td>
                      </tr>
                    ) : (
                      filteredDoctors.map((doc) => (
                        <tr key={doc.doctorId}>
                          <td>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                padding: '0.2rem 0.45rem',
                                borderRadius: '4px',
                                backgroundColor: '#f1f5f9',
                                color: '#0f172a',
                                border: '1px solid #cbd5e1',
                                fontFamily: 'monospace',
                              }}
                            >
                              {doc.employeeCode}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  backgroundColor: '#e0f2fe',
                                  color: '#0284c7',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.8125rem',
                                  flexShrink: 0,
                                }}
                              >
                                {doc.doctorName.replace('Dr. ', '').charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                                  {doc.doctorName}
                                </div>
                                <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>
                                  {doc.designation}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-info" style={{ fontSize: '0.7188rem' }}>
                              {doc.specialization}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span style={{ fontWeight: 800, color: '#0284c7' }}>$</span>
                              <input
                                type="number"
                                min="0"
                                max="5000"
                                step="5"
                                className="form-input"
                                style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.875rem', width: '80px', padding: '0.35rem 0.5rem' }}
                                value={doc.standardFee}
                                onChange={(e) =>
                                  handleDoctorFeeChange(doc.doctorId, 'standardFee', Number(e.target.value))
                                }
                              />
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>$</span>
                              <input
                                type="number"
                                min="0"
                                max="5000"
                                step="5"
                                className="form-input"
                                style={{ fontSize: '0.8125rem', width: '75px', padding: '0.35rem 0.5rem' }}
                                value={doc.followUpFee || Math.round(doc.standardFee * 0.6)}
                                onChange={(e) =>
                                  handleDoctorFeeChange(doc.doctorId, 'followUpFee', Number(e.target.value))
                                }
                              />
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span style={{ fontWeight: 700, color: '#dc2626' }}>$</span>
                              <input
                                type="number"
                                min="0"
                                max="5000"
                                step="5"
                                className="form-input"
                                style={{ fontSize: '0.8125rem', width: '75px', padding: '0.35rem 0.5rem', color: '#b91c1c' }}
                                value={doc.emergencyFee || Math.round(doc.standardFee * 1.5)}
                                onChange={(e) =>
                                  handleDoctorFeeChange(doc.doctorId, 'emergencyFee', Number(e.target.value))
                                }
                              />
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                              {[50, 75, 100, 120, 150].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => handleApplyPresetToDoctor(doc.doctorId, preset)}
                                  style={{
                                    fontSize: '0.6875rem',
                                    padding: '0.2rem 0.45rem',
                                    borderRadius: '5px',
                                    border: doc.standardFee === preset ? '1px solid #0284c7' : '1px solid #cbd5e1',
                                    backgroundColor: doc.standardFee === preset ? '#e0f2fe' : '#ffffff',
                                    color: doc.standardFee === preset ? '#0369a1' : '#475569',
                                    fontWeight: doc.standardFee === preset ? 800 : 500,
                                    cursor: 'pointer',
                                  }}
                                  title={`Apply $${preset} fee`}
                                >
                                  ${preset}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* SECTION 2: WARDS & OBSERVATION BEDS TARIFFS                   */}
          {/* ------------------------------------------------------------- */}
          {(tariffCategoryFilter === 'all' || tariffCategoryFilter === 'wards') && (
            <div className="card" style={{ padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ padding: '0.35rem', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex' }}>
                    <BedDouble size={18} />
                  </span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: 'var(--secondary)' }}>
                      Ward & Daycare Observation Bed Tariffs
                    </h4>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Configure daily bed charges, daycare hourly rates, and nursing care surcharges for department wards.
                    </p>
                  </div>
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Department Ward</th>
                      <th style={{ width: '110px' }}>Total Beds</th>
                      <th style={{ width: '160px' }}>Daily Bed Rate (24h)</th>
                      <th style={{ width: '160px' }}>Hourly Daycare Rate</th>
                      <th style={{ width: '180px' }}>Nursing Care / Day</th>
                      <th style={{ width: '160px' }}>Total 24h Base Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tariffMaster.wardTariffs.map((ward) => (
                      <tr key={ward.wardId}>
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--secondary)' }}>{ward.wardName}</div>
                          <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>
                            North Central Tower • Ground Floor
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-success" style={{ fontWeight: 700 }}>
                            {ward.totalBeds} Beds
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontWeight: 800, color: '#15803d' }}>$</span>
                            <input
                              type="number"
                              min="0"
                              max="5000"
                              step="10"
                              className="form-input"
                              style={{ fontWeight: 800, color: '#15803d', width: '85px', padding: '0.35rem 0.5rem' }}
                              value={ward.dailyRate}
                              onChange={(e) =>
                                handleWardFeeChange(ward.wardId, 'dailyRate', Number(e.target.value))
                              }
                            />
                            <span style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>/ 24h</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>$</span>
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              step="5"
                              className="form-input"
                              style={{ width: '75px', padding: '0.35rem 0.5rem' }}
                              value={ward.hourlyRate || 20}
                              onChange={(e) =>
                                handleWardFeeChange(ward.wardId, 'hourlyRate', Number(e.target.value))
                              }
                            />
                            <span style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>/ hr</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>$</span>
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              step="5"
                              className="form-input"
                              style={{ width: '75px', padding: '0.35rem 0.5rem' }}
                              value={ward.nursingChargePerDay || 35}
                              onChange={(e) =>
                                handleWardFeeChange(ward.wardId, 'nursingChargePerDay', Number(e.target.value))
                              }
                            />
                            <span style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>/ day</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 900, fontSize: '0.9375rem', color: 'var(--secondary)' }}>
                            ${(ward.dailyRate || 0) + (ward.nursingChargePerDay || 0)}.00
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            Bed (${ward.dailyRate}) + Nurse (${ward.nursingChargePerDay})
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* SECTION 3: CONSULTATION ROOMS & CHAMBER TARIFFS               */}
          {/* ------------------------------------------------------------- */}
          {(tariffCategoryFilter === 'all' || tariffCategoryFilter === 'rooms') && (
            <div className="card" style={{ padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ padding: '0.35rem', borderRadius: '6px', backgroundColor: '#ffedd5', color: '#ea580c', display: 'flex' }}>
                    <DoorClosed size={18} />
                  </span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: 'var(--secondary)' }}>
                      Room & Consultation Chamber Facility Charges
                    </h4>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Chamber maintenance fee added to patient invoice, plus procedure room hourly rate for minor procedures.
                    </p>
                  </div>
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '120px' }}>Room No</th>
                      <th>Facility Designation</th>
                      <th style={{ width: '140px' }}>Facility Type</th>
                      <th style={{ width: '180px' }}>Facility Fee / Session</th>
                      <th style={{ width: '180px' }}>Procedure Hourly Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tariffMaster.roomTariffs.map((room) => (
                      <tr key={room.roomId}>
                        <td>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              backgroundColor: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #fed7aa',
                            }}
                          >
                            {room.roomNumber}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{room.roomName}</div>
                          <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>Ground Floor Outpatient Wing</div>
                        </td>
                        <td>
                          <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>
                            {room.type}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>$</span>
                            <input
                              type="number"
                              min="0"
                              max="500"
                              step="5"
                              className="form-input"
                              style={{ width: '75px', padding: '0.35rem 0.5rem', fontWeight: 700 }}
                              value={room.facilityFee}
                              onChange={(e) =>
                                handleRoomFeeChange(room.roomId, 'facilityFee', Number(e.target.value))
                              }
                            />
                            <span style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>/ visit</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontWeight: 700, color: '#ea580c' }}>$</span>
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              step="5"
                              className="form-input"
                              style={{ width: '75px', padding: '0.35rem 0.5rem' }}
                              value={room.hourlyProcedureRate || 60}
                              onChange={(e) =>
                                handleRoomFeeChange(room.roomId, 'hourlyProcedureRate', Number(e.target.value))
                              }
                            />
                            <span style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>/ hr</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* SECTION 4: INTAKE & TRIAGE BASE SURCHARGES                    */}
          {/* ------------------------------------------------------------- */}
          {(tariffCategoryFilter === 'all' || tariffCategoryFilter === 'intake') && (
            <div className="card" style={{ padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ padding: '0.35rem', borderRadius: '6px', backgroundColor: '#f3e8ff', color: '#9333ea', display: 'flex' }}>
                  <Ticket size={18} />
                </span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: 'var(--secondary)' }}>
                    Department Intake & Triage Surcharges
                  </h4>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Standard one-time administrative fees charged upon patient check-in.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                    Department Patient Registration Fee ($)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.125rem', color: '#7e22ce' }}>$</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-input"
                      style={{ fontWeight: 800, fontSize: '1.125rem', color: '#7e22ce', width: '100px' }}
                      value={tariffMaster.intakeRegistrationFee}
                      onChange={(e) => {
                        setTariffMaster((prev) => ({ ...prev, intakeRegistrationFee: Number(e.target.value) }));
                        setIsTariffSaved(false);
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Billed on first OPD visit / file generation
                    </span>
                  </div>
                </div>

                <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                    Nurse Triage & Vitals Assessment Fee ($)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.125rem', color: '#0284c7' }}>$</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-input"
                      style={{ fontWeight: 800, fontSize: '1.125rem', color: '#0284c7', width: '100px' }}
                      value={tariffMaster.triageVitalsFee}
                      onChange={(e) => {
                        setTariffMaster((prev) => ({ ...prev, triageVitalsFee: Number(e.target.value) }));
                        setIsTariffSaved(false);
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      BP, Pulse, SpO2, and Triage recording
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* SECTION 5: LIVE RECEPTIONIST & CASHIER SIMULATION PREVIEW      */}
          {/* ------------------------------------------------------------- */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              borderRadius: '14px',
              backgroundColor: '#1e293b',
              color: '#ffffff',
              border: '1.5px solid #334155',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <span style={{ padding: '0.45rem', borderRadius: '8px', backgroundColor: '#334155', color: '#38bdf8', display: 'flex' }}>
                  <Receipt size={20} />
                </span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
                    Live Receptionist & Cashier Invoice Simulator
                  </h4>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.7813rem', color: '#94a3b8' }}>
                    Preview how receptionists and cashiers see the fees when a patient checks in for a doctor in this department.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Select Doctor:</span>
                <select
                  className="form-select"
                  style={{ width: 'auto', backgroundColor: '#0f172a', color: '#f8fafc', borderColor: '#475569', fontSize: '0.8125rem' }}
                  value={simulatedDoctorId}
                  onChange={(e) => setSimulatedDoctorId(e.target.value)}
                >
                  {tariffMaster.doctorTariffs.map((doc) => (
                    <option key={doc.doctorId} value={doc.doctorId}>
                      {doc.doctorName} ({doc.specialization})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {simulatedDoctor && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                  backgroundColor: '#0f172a',
                  padding: '1.25rem',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.7188rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                    Consultant Fee
                  </span>
                  <div style={{ fontSize: '1.375rem', fontWeight: 900, color: '#38bdf8', marginTop: '0.2rem' }}>
                    ${simulatedDoctor.standardFee}.00
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#cbd5e1' }}>
                    Standard OPD Consultation
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.7188rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                    Follow-Up Fee
                  </span>
                  <div style={{ fontSize: '1.375rem', fontWeight: 900, color: '#a78bfa', marginTop: '0.2rem' }}>
                    ${simulatedDoctor.followUpFee || Math.round(simulatedDoctor.standardFee * 0.6)}.00
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#cbd5e1' }}>
                    Within 14 days of visit
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.7188rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                    Chamber Facility
                  </span>
                  <div style={{ fontSize: '1.375rem', fontWeight: 900, color: '#fb923c', marginTop: '0.2rem' }}>
                    ${tariffMaster.roomTariffs[0]?.facilityFee || 15}.00
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#cbd5e1' }}>
                    Room 101 Maintenance
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.7188rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                    Reg + Triage Fee
                  </span>
                  <div style={{ fontSize: '1.375rem', fontWeight: 900, color: '#4ade80', marginTop: '0.2rem' }}>
                    ${tariffMaster.intakeRegistrationFee + tariffMaster.triageVitalsFee}.00
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#cbd5e1' }}>
                    One-time intake charges
                  </div>
                </div>

                <div style={{ borderLeft: '1px solid #334155', paddingLeft: '1rem' }}>
                  <span style={{ fontSize: '0.7188rem', color: '#facc15', fontWeight: 800, textTransform: 'uppercase' }}>
                    Total Estimated Bill
                  </span>
                  <div style={{ fontSize: '1.625rem', fontWeight: 900, color: '#facc15', marginTop: '0.2rem' }}>
                    $
                    {simulatedDoctor.standardFee +
                      (tariffMaster.roomTariffs[0]?.facilityFee || 15) +
                      tariffMaster.intakeRegistrationFee +
                      tariffMaster.triageVitalsFee}
                    .00
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                    Cashier Invoice Summary
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Save Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveAllTariffs}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', fontWeight: 800 }}
            >
              <Save size={16} /> Save All Tariffs & Rates
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MODULAR ENGINE & INTAKE CAPACITY (Original Settings)              */}
      {/* ========================================================================= */}
      {activeTab === 'capabilities' && (
        <form onSubmit={handleSaveCapabilities} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Department Identity & Administrator */}
          <div className="card" style={{ padding: '1.5rem', borderRadius: '14px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem 0' }}>
              1. Department Metadata & Assigned Administrator
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Department Administrator Name
                </label>
                <input
                  className="form-input"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. Dr. Sarah Jenkins"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Department Admin Login Email
                </label>
                <input
                  type="email"
                  className="form-input"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="opd.admin@northhospital.com"
                />
              </div>

              <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Department Operating Hours
                </label>
                <input
                  className="form-input"
                  value={operatingHours}
                  onChange={(e) => setOperatingHours(e.target.value)}
                  placeholder="e.g. 08:00 - 20:00 (Mon-Sat)"
                />
              </div>
            </div>
          </div>

          {/* Feature Capabilities Switches */}
          <div className="card" style={{ padding: '1.5rem', borderRadius: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Sparkles size={18} color="#0284c7" />
              <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                2. Active Department Capabilities (Generic Feature Engine)
              </h4>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 1.25rem 0' }}>
              Toggle modules on/off to define how this department operates without modifying underlying code.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Appointments */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: config.hasAppointments ? '#eff6ff' : '#f8fafc',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--secondary)' }}>
                    Appointments & Scheduling
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Pre-booking slots, physician calendars (Used in OPD, Physio)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.hasAppointments}
                  onChange={() => toggleFlag('hasAppointments')}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {/* Live Queue & Tokens */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: config.hasQueue ? '#eff6ff' : '#f8fafc',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--secondary)' }}>
                    Live Queue & Tokens
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Waiting board, sequential tokens (Used in OPD, Lab, Pharmacy)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.hasQueue}
                  onChange={() => toggleFlag('hasQueue')}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {/* Doctor Stations */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: config.hasDoctors ? '#eff6ff' : '#f8fafc',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--secondary)' }}>
                    Doctor Consultation Desk
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    SOAP notes, diagnoses, consultation fees (OPD, IPD, OT)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.hasDoctors}
                  onChange={() => toggleFlag('hasDoctors')}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {/* Inpatient Admissions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: config.hasAdmissions ? '#eff6ff' : '#f8fafc',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--secondary)' }}>
                    Inpatient Admissions
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Ward admission workflows, discharge summaries (IPD, ICU)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.hasAdmissions}
                  onChange={() => toggleFlag('hasAdmissions')}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {/* Beds */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: config.hasBeds ? '#eff6ff' : '#f8fafc',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--secondary)' }}>
                    Bed Allocation & Tracking
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Bed matrix, maintenance logging (IPD, ICU, Dialysis)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.hasBeds}
                  onChange={() => toggleFlag('hasBeds')}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {/* Diagnostic Tests */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: config.hasTests ? '#eff6ff' : '#f8fafc',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--secondary)' }}>
                    Diagnostic Requisitions
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Test orders, sample pipeline, pathology results (Lab, Radiology)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.hasTests}
                  onChange={() => toggleFlag('hasTests')}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {/* Prescriptions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: config.hasPrescriptions ? '#eff6ff' : '#f8fafc',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--secondary)' }}>
                    e-Prescriptions
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Medication orders, dosage frequency (OPD, Pharmacy)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.hasPrescriptions}
                  onChange={() => toggleFlag('hasPrescriptions')}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {/* Walk-In Intake */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: config.hasWalkIn ? '#eff6ff' : '#f8fafc',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--secondary)' }}>
                    Walk-In Fast-Track
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Direct walk-in patient intake without pre-booking (OPD, ER)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.hasWalkIn}
                  onChange={() => toggleFlag('hasWalkIn')}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          {/* Step 9: Queue & Capacity Setup Card */}
          <div className="card" style={{ padding: '1.5rem', borderRadius: '14px', border: '1.5px solid #bfdbfe', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <span style={{ padding: '0.45rem', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#1d4ed8', display: 'flex' }}>
                  <Ticket size={20} />
                </span>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#1e3a8a' }}>
                    3. Step 9: Queue & Department Intake Capacity Policies
                  </h4>
                  <p style={{ fontSize: '0.7813rem', color: 'var(--text-muted)', margin: '0.15rem 0 0' }}>
                    Configure intake thresholds, walk-in reception desks, token dispatchers, and online booking limits.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleApplyStep9Presets}
                style={{ fontSize: '0.7813rem', fontWeight: 700, backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
              >
                <Sparkles size={14} /> Apply Step 9 Presets (100 / Day)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {/* Daily Capacity */}
              <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid var(--border-color)' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                  Daily Patient Intake Capacity
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    className="form-input"
                    style={{ fontWeight: 800, fontSize: '1.125rem', color: '#0369a1' }}
                    value={dailyCapacity}
                    onChange={(e) => setDailyCapacity(Number(e.target.value))}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    Patients / Day
                  </span>
                </div>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
                  Configured: {dailyCapacity} max patients per day.
                </p>
              </div>

              {/* Walk-In Allowed */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  backgroundColor: isWalkInAllowed ? '#f0fdf4' : '#f8fafc',
                  border: isWalkInAllowed ? '1px solid #bbf7d0' : '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: isWalkInAllowed ? '#166534' : 'var(--secondary)' }}>
                      Walk-In Allowed
                    </span>
                    <input
                      type="checkbox"
                      checked={isWalkInAllowed}
                      onChange={(e) => setIsWalkInAllowed(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Accept direct front-desk walk-in arrivals without appointment.
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isWalkInAllowed ? '#15803d' : '#64748b', marginTop: '0.5rem' }}>
                  {isWalkInAllowed ? '✓ Yes (Walk-Ins Allowed)' : '✕ Appointments Only'}
                </div>
              </div>

              {/* Token System */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  backgroundColor: isTokenSystemEnabled ? '#eff6ff' : '#f8fafc',
                  border: isTokenSystemEnabled ? '1px solid #bfdbfe' : '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: isTokenSystemEnabled ? '#1e40af' : 'var(--secondary)' }}>
                      Token System
                    </span>
                    <input
                      type="checkbox"
                      checked={isTokenSystemEnabled}
                      onChange={(e) => setIsTokenSystemEnabled(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Sequential digital token dispatching (#OPD-101) & display boards.
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isTokenSystemEnabled ? '#1d4ed8' : '#64748b', marginTop: '0.5rem' }}>
                  {isTokenSystemEnabled ? '✓ Enabled (Tokens Active)' : '✕ Disabled'}
                </div>
              </div>

              {/* Online Appointment */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  backgroundColor: isOnlineAppointmentEnabled ? '#faf5ff' : '#f8fafc',
                  border: isOnlineAppointmentEnabled ? '1px solid #e9d5ff' : '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: isOnlineAppointmentEnabled ? '#6b21a8' : 'var(--secondary)' }}>
                      Online Appointment
                    </span>
                    <input
                      type="checkbox"
                      checked={isOnlineAppointmentEnabled}
                      onChange={(e) => setIsOnlineAppointmentEnabled(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Permit patient portal and online pre-scheduled slot bookings.
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isOnlineAppointmentEnabled ? '#7e22ce' : '#64748b', marginTop: '0.5rem' }}>
                  {isOnlineAppointmentEnabled ? '✓ Enabled (Online Booking Active)' : '✕ Disabled'}
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', fontWeight: 800 }}>
              <Save size={16} /> Save Capabilities Configuration
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
