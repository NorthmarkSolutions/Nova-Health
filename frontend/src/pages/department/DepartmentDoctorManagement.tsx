import React, { useState, useEffect, useMemo } from 'react';
import {
  Stethoscope,
  Search,
  Plus,
  Edit2,
  Trash2,
  Clock,
  DoorClosed,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Award,
  DollarSign,
  X,
  Check,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { DepartmentWorkspace, DepartmentDoctor, DepartmentRoom } from '../../types';
import {
  getDepartmentDoctors,
  saveDepartmentDoctor,
  deleteDepartmentDoctor,
  getDepartmentRooms,
} from './departmentWorkspaceStore';
import { getHospitalStaff, StaffMember } from '../admin/setup/organization/hospitalStaffStore';

interface Props {
  workspace: DepartmentWorkspace;
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DepartmentDoctorManagement: React.FC<Props> = ({ workspace }) => {
  const [doctors, setDoctors] = useState<DepartmentDoctor[]>(() =>
    getDepartmentDoctors(workspace.departmentId)
  );
  const [rooms, setRooms] = useState<DepartmentRoom[]>(() =>
    getDepartmentRooms(workspace.departmentId)
  );
  const [hospitalStaff, setHospitalStaff] = useState<StaffMember[]>(() => getHospitalStaff());

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'ON_LEAVE' | 'OFF_DUTY'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [qualification, setQualification] = useState('');
  const [consultationFee, setConsultationFee] = useState(75);
  const [consultationStartTime, setConsultationStartTime] = useState('09:00');
  const [consultationEndTime, setConsultationEndTime] = useState('17:00');
  const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [assignedRoomId, setAssignedRoomId] = useState('');
  const [patientCapacityPerDay, setPatientCapacityPerDay] = useState(30);
  const [avgConsultationMinutes, setAvgConsultationMinutes] = useState(15);
  const [isAvailable, setIsAvailable] = useState(true);
  const [status, setStatus] = useState<'ACTIVE' | 'ON_LEAVE' | 'OFF_DUTY'>('ACTIVE');

  const reload = () => {
    setDoctors(getDepartmentDoctors(workspace.departmentId));
    setRooms(getDepartmentRooms(workspace.departmentId));
    setHospitalStaff(getHospitalStaff());
  };

  useEffect(() => {
    reload();
  }, [workspace.departmentId]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          doc.fullName.toLowerCase().includes(q) ||
          doc.employeeCode.toLowerCase().includes(q) ||
          doc.specialization.toLowerCase().includes(q) ||
          doc.qualification.toLowerCase().includes(q) ||
          (doc.assignedRoomName && doc.assignedRoomName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [doctors, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = doctors.length;
    const active = doctors.filter((d) => d.status === 'ACTIVE' && d.isAvailable).length;
    const totalCapacity = doctors.reduce((acc, d) => acc + (d.patientCapacityPerDay || 0), 0);
    const avgFee = total > 0 ? Math.round(doctors.reduce((acc, d) => acc + (d.consultationFee || 0), 0) / total) : 0;
    return { total, active, totalCapacity, avgFee };
  }, [doctors]);

  const handleOpenAdd = () => {
    setEditingDoctorId(null);
    setSelectedStaffId('');
    setFullName('');
    setEmployeeCode(`DOC-${Math.floor(100 + Math.random() * 900)}`);
    setSpecialization('Consultant Specialist');
    setQualification('MBBS, MD');
    setConsultationFee(75);
    setConsultationStartTime('09:00');
    setConsultationEndTime('17:00');
    setWorkingDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    setAssignedRoomId(rooms[0]?.id || '');
    setPatientCapacityPerDay(30);
    setAvgConsultationMinutes(15);
    setIsAvailable(true);
    setStatus('ACTIVE');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc: DepartmentDoctor) => {
    setEditingDoctorId(doc.id);
    setSelectedStaffId(doc.staffId);
    setFullName(doc.fullName);
    setEmployeeCode(doc.employeeCode);
    setSpecialization(doc.specialization);
    setQualification(doc.qualification);
    setConsultationFee(doc.consultationFee);
    setConsultationStartTime(doc.consultationStartTime);
    setConsultationEndTime(doc.consultationEndTime);
    setWorkingDays(doc.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    setAssignedRoomId(doc.assignedRoomId || '');
    setPatientCapacityPerDay(doc.patientCapacityPerDay);
    setAvgConsultationMinutes(doc.avgConsultationMinutes);
    setIsAvailable(doc.isAvailable);
    setStatus(doc.status);
    setIsModalOpen(true);
  };

  const handleSelectHospitalDoctor = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const staffId = e.target.value;
    setSelectedStaffId(staffId);
    const found = hospitalStaff.find((s) => s.id === staffId);
    if (found) {
      setFullName(found.fullName);
      setEmployeeCode(found.employeeCode);
      setSpecialization(found.designation || 'Specialist');
      setQualification(found.qualification || 'MBBS, MD');
    }
  };

  const toggleDay = (day: string) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !employeeCode.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    const assignedRoom = rooms.find((r) => r.id === assignedRoomId);

    const docPayload: DepartmentDoctor = {
      id: editingDoctorId || `doc-${workspace.departmentId}-${Date.now()}`,
      departmentId: workspace.departmentId,
      staffId: selectedStaffId || `stf-${Date.now()}`,
      fullName: fullName.trim(),
      employeeCode: employeeCode.toUpperCase().trim(),
      specialization: specialization.trim(),
      qualification: qualification.trim(),
      consultationFee: Number(consultationFee) || 75,
      consultationStartTime,
      consultationEndTime,
      workingDays: workingDays.length > 0 ? workingDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      assignedRoomId,
      assignedRoomName: assignedRoom ? `${assignedRoom.name} (${assignedRoom.roomNumber})` : undefined,
      patientCapacityPerDay: Number(patientCapacityPerDay) || 30,
      avgConsultationMinutes: Number(avgConsultationMinutes) || 15,
      isAvailable,
      status,
    };

    saveDepartmentDoctor(docPayload);
    setIsModalOpen(false);
    reload();
  };

  const handleDelete = (docId: string, name: string) => {
    if (window.confirm(`Remove ${name} from this department roster?`)) {
      deleteDepartmentDoctor(docId);
      reload();
    }
  };

  const toggleAvailability = (doc: DepartmentDoctor) => {
    const updated = {
      ...doc,
      isAvailable: !doc.isAvailable,
      status: (!doc.isAvailable ? 'ACTIVE' : 'OFF_DUTY') as any,
    };
    saveDepartmentDoctor(updated);
    reload();
  };

  const handleApplyStep8Presets = () => {
    const updated = doctors.map((d, idx) => {
      if (idx === 0 || d.fullName.toLowerCase().includes('sarah')) {
        const room101 = rooms.find((r) => r.roomNumber.includes('101')) || rooms[0];
        return {
          ...d,
          specialization: 'Cardiology',
          avgConsultationMinutes: 15,
          patientCapacityPerDay: 30,
          assignedRoomId: room101?.id || d.assignedRoomId,
          assignedRoomName: room101 ? `${room101.name} (${room101.roomNumber})` : 'Room 101',
        };
      }
      if (idx === 1 || d.fullName.toLowerCase().includes('michael')) {
        const room102 = rooms.find((r) => r.roomNumber.includes('102')) || rooms[1] || rooms[0];
        return {
          ...d,
          specialization: 'Cardiology',
          avgConsultationMinutes: 15,
          patientCapacityPerDay: 30,
          assignedRoomId: room102?.id || d.assignedRoomId,
          assignedRoomName: room102 ? `${room102.name} (${room102.roomNumber})` : 'Room 102',
        };
      }
      return d;
    });

    updated.forEach((d) => saveDepartmentDoctor(d));
    reload();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
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
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: 'var(--primary)',
                padding: '0.375rem',
                borderRadius: '8px',
                display: 'flex',
              }}
            >
              <Stethoscope size={22} />
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>
              {workspace.shortName} Doctor Management & Consultation Chambers
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Manage consultant hours, specializations, chamber allocation, patient slot capacity, and availability calendars.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenAdd}
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <Plus size={16} /> Add / Configure Doctor
        </button>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="card" style={{ padding: '1rem', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Department Doctors
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--secondary)', marginTop: '0.25rem' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.2rem' }}>
            ✓ {stats.active} Available on duty
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af', textTransform: 'uppercase' }}>
            Daily Slot Capacity
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1d4ed8', marginTop: '0.25rem' }}>
            {stats.totalCapacity}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.2rem' }}>
            Patients / Day Across Chambers
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>
            Average Consultation
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#15803d', marginTop: '0.25rem' }}>
            15 mins
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.2rem' }}>
            Per patient clinical window
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9a3412', textTransform: 'uppercase' }}>
            Base Tariff
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#c2410c', marginTop: '0.25rem' }}>
            ${stats.avgFee}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#ea580c', marginTop: '0.2rem' }}>
            Average consultation fee
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Search doctors by name, code, chamber, specialization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
          <option value="all">All Doctor Statuses</option>
          <option value="ACTIVE">Active & Available</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="OFF_DUTY">Off Duty</option>
        </select>
      </div>

      {/* Step 8 Specification Banner */}
      <div
        style={{
          padding: '0.875rem 1.25rem',
          borderRadius: '10px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#1e3a8a', fontSize: '0.875rem' }}>
            <Sparkles size={16} color="#2563eb" />
            <span>Step 8: Doctor Configuration Specification</span>
          </div>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.7813rem', color: '#1d4ed8' }}>
            Duration: 15 mins • Patients / Day: 30 • Stationed Chamber: Room 101 • Specialization: Cardiology
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleApplyStep8Presets}
          style={{ fontSize: '0.7813rem', fontWeight: 700, backgroundColor: '#ffffff', color: '#1d4ed8', borderColor: '#93c5fd' }}
        >
          Apply Step 8 Configuration Presets
        </button>
      </div>

      {/* Doctor Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {filteredDoctors.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No doctors configured for {workspace.shortName}. Click "+ Add / Configure Doctor" to assign physicians.
          </div>
        ) : (
          filteredDoctors.map((doc) => (
            <div
              key={doc.id}
              className="card"
              style={{
                padding: '1.25rem',
                borderRadius: '14px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <div>
                {/* Doctor Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(37, 99, 235, 0.12)',
                        color: 'var(--primary)',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {doc.fullName.replace('Dr. ', '').charAt(0)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--secondary)' }}>
                          {doc.fullName}
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '0.6875rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            color: '#0f172a',
                            fontFamily: 'monospace',
                          }}
                        >
                          {doc.employeeCode}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 600 }}>
                        {doc.specialization}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {doc.qualification}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleAvailability(doc)}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: doc.isAvailable ? '1px solid #86efac' : '1px solid #cbd5e1',
                      backgroundColor: doc.isAvailable ? '#f0fdf4' : '#f8fafc',
                      color: doc.isAvailable ? '#166534' : '#64748b',
                    }}
                  >
                    {doc.isAvailable ? '● Available' : '○ Off Duty'}
                  </button>
                </div>

                {/* Consultation Details */}
                <div
                  style={{
                    backgroundColor: '#fafafa',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    marginBottom: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={12} color="#0284c7" /> Consultation Duration:
                    </span>
                    <strong style={{ color: '#0369a1', fontWeight: 800 }}>
                      {doc.avgConsultationMinutes || 15} Mins / Patient
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={12} color="#0284c7" /> Consultation Hours:
                    </span>
                    <strong style={{ color: '#0369a1', fontFamily: 'monospace' }}>
                      {doc.consultationStartTime} - {doc.consultationEndTime}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <DoorClosed size={12} color="#ea580c" /> Stationed Chamber:
                    </span>
                    <strong style={{ color: '#334155' }}>
                      {doc.assignedRoomName || 'Chamber 101'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Users size={12} color="#16a34a" /> Daily Patient Capacity:
                    </span>
                    <strong style={{ color: '#15803d' }}>
                      {doc.patientCapacityPerDay} Patients / Day
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <DollarSign size={12} color="#854d0e" /> Tariff Fee:
                    </span>
                    <strong style={{ color: '#b45309' }}>
                      ${doc.consultationFee}.00
                    </strong>
                  </div>
                </div>

                {/* Working Days Badges */}
                <div style={{ marginBottom: '0.875rem' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Availability Schedule:
                  </span>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                    {ALL_DAYS.map((day) => {
                      const isActive = doc.workingDays?.includes(day);
                      return (
                        <span
                          key={day}
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: isActive ? '#eff6ff' : '#f1f5f9',
                            color: isActive ? '#1d4ed8' : '#94a3b8',
                            border: isActive ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                          }}
                        >
                          {day}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '0.75rem',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenEdit(doc)}
                  style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Edit2 size={13} /> Edit Timing & Room
                </button>
                <button
                  type="button"
                  className="action-btn text-danger"
                  onClick={() => handleDelete(doc.id, doc.fullName)}
                  title="Remove Doctor"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Doctor Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              width: '92vw',
              maxWidth: '760px',
              padding: '1.75rem',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', padding: '0.375rem', borderRadius: '8px', display: 'flex' }}>
                  <Stethoscope size={18} />
                </span>
                <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>
                  {editingDoctorId ? `Configure ${fullName}` : `Add Doctor to ${workspace.shortName}`}
                </h4>
              </div>
              <button className="action-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!editingDoctorId && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Select Doctor from Hospital Staff Master (Optional)
                  </label>
                  <select className="form-select" value={selectedStaffId} onChange={handleSelectHospitalDoctor}>
                    <option value="">— Or Register / Enter Doctor Details Manually —</option>
                    {hospitalStaff
                      .filter((s) => s.role === 'doctor')
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} ({s.employeeCode} • {s.designation})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.875rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. William Foster"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Employee Code <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                    placeholder="e.g. DOC-201"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.875rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Specialization <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Interventional Cardiology & Hypertension"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Qualifications
                  </label>
                  <input
                    className="form-input"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder="e.g. MBBS, MD, DM (Cardiology)"
                  />
                </div>
              </div>

              {/* Consultation Time and Room */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Consultation Start Time
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={consultationStartTime}
                    onChange={(e) => setConsultationStartTime(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Consultation End Time
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={consultationEndTime}
                    onChange={(e) => setConsultationEndTime(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Stationed Chamber
                  </label>
                  <select
                    className="form-select"
                    value={assignedRoomId}
                    onChange={(e) => setAssignedRoomId(e.target.value)}
                  >
                    <option value="">— Select Chamber —</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.roomNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Patient Capacity, Duration & Fee */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Patient Capacity / Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="150"
                    className="form-input"
                    value={patientCapacityPerDay}
                    onChange={(e) => setPatientCapacityPerDay(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Avg Duration (Mins)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    className="form-input"
                    value={avgConsultationMinutes}
                    onChange={(e) => setAvgConsultationMinutes(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Consultation Fee ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              {/* Availability Days Selector */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
                  Weekly Availability Schedule
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {ALL_DAYS.map((day) => {
                    const selected = workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: selected ? '1px solid #2563eb' : '1px solid #cbd5e1',
                          backgroundColor: selected ? '#eff6ff' : '#ffffff',
                          color: selected ? '#1d4ed8' : '#64748b',
                        }}
                      >
                        {selected ? `✓ ${day}` : day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Status
                  </label>
                  <select
                    className="form-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="OFF_DUTY">Off Duty</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', marginTop: '1.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isAvailable}
                      onChange={(e) => setIsAvailable(e.target.checked)}
                    />
                    Available for patient queue today
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.625rem 1.5rem', fontWeight: 700 }}>
                  {editingDoctorId ? 'Save Doctor Changes' : 'Save & Assign to Chamber'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
