import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Stethoscope,
  DoorClosed,
  Clock,
  Calendar,
  Activity,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Plus,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Building2,
  Sparkles,
  Coffee,
} from 'lucide-react';
import { DepartmentWorkspace, DepartmentRoom, DepartmentWard } from '../../types';
import {
  getDepartmentDoctors,
  getDepartmentRooms,
  getDepartmentStaffAssignments,
  saveDepartmentRoom,
  getDepartmentWards,
  verifyDepartmentSetup,
} from './departmentWorkspaceStore';

interface Props {
  workspace: DepartmentWorkspace;
  onNavigateTab: (tabId: string) => void;
}

export const DepartmentDashboard: React.FC<Props> = ({ workspace, onNavigateTab }) => {
  const [doctors, setDoctors] = useState(() => getDepartmentDoctors(workspace.departmentId));
  const [rooms, setRooms] = useState(() => getDepartmentRooms(workspace.departmentId));
  const [staff, setStaff] = useState(() => getDepartmentStaffAssignments(workspace.departmentId));
  const [wards, setWards] = useState<DepartmentWard[]>(() => getDepartmentWards(workspace.departmentId));
  const [isVerified, setIsVerified] = useState(Boolean(workspace.setupVerified));
  const [verifiedBy, setVerifiedBy] = useState(workspace.setupVerifiedBy || workspace.adminName || 'Dr. Sarah Jenkins');
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  useEffect(() => {
    setDoctors(getDepartmentDoctors(workspace.departmentId));
    setRooms(getDepartmentRooms(workspace.departmentId));
    setStaff(getDepartmentStaffAssignments(workspace.departmentId));
    setWards(getDepartmentWards(workspace.departmentId));
    setIsVerified(Boolean(workspace.setupVerified));
    setVerifiedBy(workspace.setupVerifiedBy || workspace.adminName || 'Dr. Sarah Jenkins');
  }, [workspace]);

  const handleVerifySetup = () => {
    const updated = verifyDepartmentSetup(workspace.departmentId, workspace.adminName || 'Dr. Sarah Jenkins');
    setIsVerified(true);
    setVerifiedBy(updated.setupVerifiedBy || 'Dr. Sarah Jenkins');
  };

  // Metric computations
  const totalStaffCount = staff.length;
  const activeStaffCount = staff.filter((s) => s.status === 'ACTIVE').length;
  const activeDoctors = doctors.filter((d) => d.isAvailable && d.status === 'ACTIVE');
  const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE');
  const inConsultationRooms = rooms.filter((r) => r.status === 'IN_CONSULTATION');
  const totalCapacity = doctors.reduce((acc, d) => acc + (d.patientCapacityPerDay || 30), 0);

  const toggleRoomStatus = (roomId: string) => {
    const target = rooms.find((r) => r.id === roomId);
    if (!target) return;
    const nextStatus: DepartmentRoom['status'] = target.status === 'AVAILABLE' ? 'IN_CONSULTATION' : 'AVAILABLE';
    const updated: DepartmentRoom = { ...target, status: nextStatus };
    saveDepartmentRoom(updated);
    setRooms((prev) => prev.map((r) => (r.id === roomId ? updated : r)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0369a1 100%)',
          borderRadius: '16px',
          padding: '1.75rem 2rem',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}
      >
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
              }}
            >
              {workspace.departmentCode}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#bae6fd',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Clock size={13} /> {workspace.operatingHours}
            </span>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 900, margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
            {workspace.departmentName} Workspace
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#e0f2fe', lineHeight: 1.5 }}>
            Operational administration hub for clinical headcount, consultation chambers, doctor schedules, and live department capacity.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigateTab('doctors')}
            style={{
              backgroundColor: '#ffffff',
              color: '#0369a1',
              borderColor: '#ffffff',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              borderRadius: '10px',
            }}
          >
            <Stethoscope size={16} /> Manage Doctors
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigateTab('operations')}
            style={{
              backgroundColor: '#ffffff',
              color: '#0284c7',
              borderColor: '#ffffff',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              borderRadius: '10px',
            }}
          >
            <Activity size={16} /> 6. OPD Operations
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigateTab('staff')}
            style={{
              backgroundColor: '#0284c7',
              borderColor: '#38bdf8',
              color: '#ffffff',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              borderRadius: '10px',
            }}
          >
            <Users size={16} /> Staff Roster
          </button>
        </div>
      </div>

      {/* ================= STEP 1: DEPARTMENT SETUP REVIEW ================= */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: isVerified ? '1px solid #bbf7d0' : '1px solid #fed7aa',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.35rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  backgroundColor: isVerified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                  color: isVerified ? '#059669' : '#ea580c',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Step 1: Department Setup Review
              </span>
              {isVerified ? (
                <span className="badge badge-success" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle2 size={13} /> Verified by {verifiedBy}
                </span>
              ) : (
                <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                  Action Required: Verify Assigned Resources
                </span>
              )}
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Hospital Admin Resource Allocation Audit
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
              Confirm all physical infrastructure, assigned rooms, wards, and capacity thresholds provisioned by Hospital Administration.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsSetupModalOpen(true)}
              style={{ fontSize: '0.8125rem', padding: '0.45rem 0.875rem' }}
            >
              Inspect Blueprint Tree
            </button>
            {!isVerified ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleVerifySetup}
                style={{
                  fontSize: '0.8125rem',
                  padding: '0.45rem 1rem',
                  backgroundColor: '#10b981',
                  borderColor: '#059669',
                  color: '#ffffff',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                }}
              >
                <CheckCircle2 size={15} /> Verify Resources Assigned
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleVerifySetup}
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', color: 'var(--text-muted)' }}
              >
                Re-verify
              </button>
            )}
          </div>
        </div>

        {/* Resource Allocation Hierarchy Tree Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '0.875rem',
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px dashed var(--border-color)',
          }}
        >
          <div style={{ backgroundColor: 'var(--bg-subtle, #f8fafc)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Department Name</span>
            <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {workspace.departmentName}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}><code>{workspace.departmentCode}</code></span>
          </div>

          <div style={{ backgroundColor: 'var(--bg-subtle, #f8fafc)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Campus Building</span>
            <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              North Central Tower
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Main Clinical Block</span>
          </div>

          <div style={{ backgroundColor: 'var(--bg-subtle, #f8fafc)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Floor Allocation</span>
            <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              Ground Floor (Level 0)
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ambulatory & Triage Wing</span>
          </div>

          <div style={{ backgroundColor: 'var(--bg-subtle, #f8fafc)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Assigned Rooms</span>
            <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {rooms.length} Consultation Chambers
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => onNavigateTab('rooms')}>
              Chamber 101, 102, 103 →
            </span>
          </div>

          <div style={{ backgroundColor: 'var(--bg-subtle, #f8fafc)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Assigned Wards</span>
            <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {wards.length} Wards ({wards.reduce((a, w) => a + w.totalBeds, 0)} Beds)
            </div>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
              Ward A (20 Beds) • Ward B
            </span>
          </div>

          <div style={{ backgroundColor: 'var(--bg-subtle, #f8fafc)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Daily Capacity</span>
            <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#0284c7', marginTop: '0.2rem' }}>
              {workspace.config?.dailyCapacity || 100} Patients / Day
            </div>
            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
              Walk-in: Yes • Token: Yes
            </span>
          </div>
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
        {/* Doctors On Duty */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid #bfdbfe',
            backgroundColor: '#eff6ff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#1e40af' }}>
              Doctors On Duty
            </span>
            <Stethoscope size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1d4ed8', marginTop: '0.5rem' }}>
            {activeDoctors.length} <span style={{ fontSize: '0.875rem', color: '#60a5fa', fontWeight: 600 }}>/ {doctors.length} Total</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.35rem' }}>
            Active across consultation chambers
          </div>
        </div>

        {/* Assigned Staff Pool */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid #bbf7d0',
            backgroundColor: '#f0fdf4',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#166534' }}>
              Staff Personnel
            </span>
            <Users size={18} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#15803d', marginTop: '0.5rem' }}>
            {activeStaffCount} <span style={{ fontSize: '0.875rem', color: '#4ade80', fontWeight: 600 }}>/ {totalStaffCount} Assigned</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.35rem' }}>
            Nurses, technicians & receptionists
          </div>
        </div>

        {/* Consultation Chambers / Rooms */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid #fed7aa',
            backgroundColor: '#fff7ed',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9a3412' }}>
              Chambers & Rooms
            </span>
            <DoorClosed size={18} color="#ea580c" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#c2410c', marginTop: '0.5rem' }}>
            {availableRooms.length} <span style={{ fontSize: '0.875rem', color: '#f97316', fontWeight: 600 }}>Available ({rooms.length} Total)</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#c2410c', marginTop: '0.35rem' }}>
            {inConsultationRooms.length} Currently in consultation
          </div>
        </div>

        {/* Daily Patient Capacity */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid #e9d5ff',
            backgroundColor: '#faf5ff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#6b21a8' }}>
              Daily Capacity
            </span>
            <TrendingUp size={18} color="#9333ea" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#7e22ce', marginTop: '0.5rem' }}>
            {totalCapacity} <span style={{ fontSize: '0.875rem', color: '#c084fc', fontWeight: 600 }}>Patients / Day</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7e22ce', marginTop: '0.35rem' }}>
            Aggregate doctor slot capacity
          </div>
        </div>
      </div>

      {/* Main Grid: Chambers & Live Roster */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem' }}>
        {/* Left: Consultation Chambers & Room Allocation */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                Consultation Chambers & Procedure Suites
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                Allocated rooms from Campus Infrastructure assigned to {workspace.shortName}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateTab('rooms')}
              style={{ fontSize: '0.75rem' }}
            >
              View All Rooms →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rooms.slice(0, 4).map((room) => {
              const isAvailable = room.status === 'AVAILABLE';
              return (
                <div
                  key={room.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.875rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#fafafa',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        backgroundColor: isAvailable ? '#dcfce7' : '#fed7aa',
                        color: isAvailable ? '#15803d' : '#c2410c',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                      }}
                    >
                      {room.roomNumber}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--secondary)' }}>
                        {room.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Doctor: <strong>{room.assignedDoctorName || 'Not Assigned'}</strong> • Nurse: {room.assignedNurseName || 'General Staff'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => toggleRoomStatus(room.id)}
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: isAvailable ? '1px solid #86efac' : '1px solid #fdba74',
                        backgroundColor: isAvailable ? '#f0fdf4' : '#fff7ed',
                        color: isAvailable ? '#166534' : '#9a3412',
                      }}
                      title="Click to toggle chamber occupancy"
                    >
                      {isAvailable ? '✓ Available' : '● In Consultation'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Scheduled Doctors & Today's Working Hours */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                Doctors Roster
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                Physicians stationed in this department
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateTab('doctors')}
              style={{ fontSize: '0.75rem' }}
            >
              Manage →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {doctors.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(37, 99, 235, 0.1)',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {doc.fullName.replace('Dr. ', '').charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--secondary)' }}>
                      {doc.fullName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {doc.specialization.split('&')[0].trim()}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', fontFamily: 'monospace' }}>
                    {doc.consultationStartTime} - {doc.consultationEndTime}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    Cap: {doc.patientCapacityPerDay}/day
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Department Operational Actions */}
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Workspace Quick Links
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateTab('scheduling')}
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
              >
                <Calendar size={13} /> Duty Roster
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateTab('settings')}
                style={{ fontSize: '0.75rem', justifyContent: 'flex-start' }}
              >
                <Sparkles size={13} /> Settings & Flags
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Blueprint Tree Inspection Modal */}
      {isSetupModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ maxWidth: '640px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <span style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
                  <Building2 size={20} />
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    Department Setup Blueprint Review
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Provisioned by Hospital Admin • Blueprint Hierarchy
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsSetupModalOpen(false)}
                style={{ padding: '0.25rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            {/* Tree Visual View */}
            <div
              style={{
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                padding: '1.25rem',
                borderRadius: '10px',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                lineHeight: 1.6,
                border: '1px solid #334155',
              }}
            >
              <div style={{ color: '#38bdf8', fontWeight: 700 }}>
                {workspace.departmentName} ({workspace.departmentCode})
              </div>
              <div>├── <span style={{ color: '#94a3b8' }}>Campus:</span> North Central Hospital Tower</div>
              <div>├── <span style={{ color: '#94a3b8' }}>Floor:</span> Ground Floor (Level 0) - Ambulatory Block</div>
              <div>
                ├── <span style={{ color: '#a78bfa' }}>Rooms & Chambers ({rooms.length})</span>
              </div>
              {rooms.map((r, idx) => (
                <div key={r.id} style={{ paddingLeft: '1.25rem', color: '#e2e8f0' }}>
                  {idx === rooms.length - 1 ? '└──' : '├──'} <strong style={{ color: '#facc15' }}>{r.roomNumber}</strong>: {r.name}
                  {r.assignedDoctorName && <span style={{ color: '#60a5fa' }}> ({r.assignedDoctorName})</span>}
                </div>
              ))}
              <div>
                ├── <span style={{ color: '#34d399' }}>Assigned Wards ({wards.length})</span>
              </div>
              {wards.map((w, idx) => (
                <div key={w.id} style={{ paddingLeft: '1.25rem', color: '#e2e8f0' }}>
                  {idx === wards.length - 1 ? '└──' : '├──'} <strong style={{ color: '#4ade80' }}>{w.wardName}</strong> ({w.totalBeds} Beds)
                  {w.headNurseName && <span style={{ color: '#94a3b8' }}> • Head Nurse: {w.headNurseName}</span>}
                </div>
              ))}
              <div>
                └── <span style={{ color: '#fb923c' }}>Capacity:</span> {workspace.config?.dailyCapacity || 100} Patients/Day
                <span style={{ color: '#94a3b8' }}> (Walk-in: Allowed • Token: Enabled)</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsSetupModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  handleVerifySetup();
                  setIsSetupModalOpen(false);
                }}
                style={{ backgroundColor: '#10b981', borderColor: '#059669', color: '#ffffff', fontWeight: 700 }}
              >
                ✓ Acknowledge & Verify Blueprint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
