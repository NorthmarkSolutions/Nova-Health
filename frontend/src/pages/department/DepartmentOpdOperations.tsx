import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Ticket,
  Users,
  Clock,
  DoorClosed,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Phone,
  Bed,
  Check,
  X,
  Sparkles,
  HeartPulse,
  Flame,
} from 'lucide-react';
import {
  DepartmentWorkspace,
  DepartmentQueueToken,
  DepartmentDoctor,
  DepartmentRoom,
  DepartmentWard,
} from '../../types';
import {
  getDepartmentQueue,
  issueDepartmentQueueToken,
  updateQueueTokenStatus,
  getDepartmentDoctors,
  getDepartmentRooms,
  getDepartmentWards,
} from './departmentWorkspaceStore';

interface Props {
  workspace: DepartmentWorkspace;
}

export const DepartmentOpdOperations: React.FC<Props> = ({ workspace }) => {
  const [tokens, setTokens] = useState<DepartmentQueueToken[]>(() =>
    getDepartmentQueue(workspace.departmentId)
  );
  const [doctors, setDoctors] = useState<DepartmentDoctor[]>(() =>
    getDepartmentDoctors(workspace.departmentId)
  );
  const [rooms, setRooms] = useState<DepartmentRoom[]>(() =>
    getDepartmentRooms(workspace.departmentId)
  );
  const [wards, setWards] = useState<DepartmentWard[]>(() =>
    getDepartmentWards(workspace.departmentId)
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [doctorFilter, setDoctorFilter] = useState<string>('all');

  // New Walk-in Token Modal
  const [isDispenserOpen, setIsDispenserOpen] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState<number>(35);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [phone, setPhone] = useState('+91 98');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [vitals, setVitals] = useState('BP 120/80, Pulse 76, SpO2 99%');

  const reload = () => {
    setTokens(getDepartmentQueue(workspace.departmentId));
    setDoctors(getDepartmentDoctors(workspace.departmentId));
    setRooms(getDepartmentRooms(workspace.departmentId));
    setWards(getDepartmentWards(workspace.departmentId));
  };

  useEffect(() => {
    reload();

    const handleQueueUpdate = () => reload();
    window.addEventListener('north_hospital_dept_queue_updated', handleQueueUpdate);
    return () => {
      window.removeEventListener('north_hospital_dept_queue_updated', handleQueueUpdate);
    };
  }, [workspace.departmentId]);

  const dailyCapacity = workspace.config?.dailyCapacity || 100;

  // Filtered Tokens
  const filteredTokens = useMemo(() => {
    return tokens.filter((tok) => {
      if (statusFilter !== 'all' && tok.status !== statusFilter) return false;
      if (doctorFilter !== 'all' && tok.doctorId !== doctorFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          tok.tokenNumber.toLowerCase().includes(q) ||
          tok.patientName.toLowerCase().includes(q) ||
          (tok.uhid && tok.uhid.toLowerCase().includes(q)) ||
          (tok.doctorName && tok.doctorName.toLowerCase().includes(q)) ||
          (tok.chiefComplaint && tok.chiefComplaint.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [tokens, statusFilter, doctorFilter, searchQuery]);

  // Operational Statistics
  const stats = useMemo(() => {
    const totalIssued = tokens.length;
    const waiting = tokens.filter((t) => t.status === 'WAITING').length;
    const inConsultation = tokens.filter((t) => t.status === 'IN_CONSULTATION').length;
    const completed = tokens.filter((t) => t.status === 'COMPLETED').length;
    const walkInCount = tokens.filter((t) => t.type === 'WALK_IN').length;
    const onlineCount = tokens.filter((t) => t.type === 'ONLINE_APPOINTMENT').length;
    const capacityPercent = Math.min(Math.round((totalIssued / dailyCapacity) * 100), 100);

    return {
      totalIssued,
      waiting,
      inConsultation,
      completed,
      walkInCount,
      onlineCount,
      capacityPercent,
    };
  }, [tokens, dailyCapacity]);

  const handleOpenDispenser = () => {
    setPatientName('');
    setAge(35);
    setGender('Male');
    setPhone('+91 98');
    setSelectedDoctorId(doctors[0]?.id || '');
    setChiefComplaint('');
    setVitals('BP 120/80, Pulse 76, SpO2 99%');
    setIsDispenserOpen(true);
  };

  const handleIssueToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      alert('Please enter patient name.');
      return;
    }

    const assignedDoc = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];
    const assignedRoom = rooms.find((r) => r.id === assignedDoc?.assignedRoomId) || rooms[0];

    const nextTokenNum = `OPD-${100 + tokens.length + 1}`;
    const nextUhid = `UHID-2026-${String(Math.floor(100 + Math.random() * 900))}`;

    const newToken: DepartmentQueueToken = {
      id: `tok-${Date.now()}`,
      departmentId: workspace.departmentId,
      tokenNumber: nextTokenNum,
      patientName: patientName.trim(),
      uhid: nextUhid,
      age: Number(age),
      gender,
      phone: phone.trim(),
      doctorId: assignedDoc ? assignedDoc.id : undefined,
      doctorName: assignedDoc ? assignedDoc.fullName : 'General Duty Physician',
      roomId: assignedRoom ? assignedRoom.id : undefined,
      roomName: assignedRoom ? `${assignedRoom.name} (${assignedRoom.roomNumber})` : undefined,
      type: 'WALK_IN',
      status: 'WAITING',
      createdAt: new Date().toISOString(),
      chiefComplaint: chiefComplaint.trim() || 'General consultation & vitals triage',
      vitals: vitals.trim(),
    };

    issueDepartmentQueueToken(newToken);
    setIsDispenserOpen(false);
    reload();
  };

  const handleStatusChange = (
    tokenId: string,
    newStatus: 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED'
  ) => {
    updateQueueTokenStatus(tokenId, newStatus);
    reload();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WAITING':
        return (
          <span
            className="badge"
            style={{
              backgroundColor: '#fff7ed',
              color: '#c2410c',
              border: '1px solid #fed7aa',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
            }}
          >
            <Clock size={12} /> Waiting
          </span>
        );
      case 'IN_CONSULTATION':
        return (
          <span
            className="badge"
            style={{
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
            }}
          >
            <Activity size={12} /> In Consultation
          </span>
        );
      case 'COMPLETED':
        return (
          <span
            className="badge"
            style={{
              backgroundColor: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={12} /> Completed
          </span>
        );
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
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
                backgroundColor: 'rgba(2, 132, 199, 0.1)',
                color: '#0284c7',
                padding: '0.375rem',
                borderRadius: '8px',
                display: 'flex',
              }}
            >
              <Activity size={22} />
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>
              {workspace.shortName} OPD Operations & Live Desk
            </h3>
            <span
              style={{
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #86efac',
                fontSize: '0.6875rem',
                fontWeight: 800,
                padding: '0.2rem 0.5rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Flame size={12} color="#16a34a" /> Live Desk Active
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Step 10: Live token dispatching, real-time consultation tracker, chamber queue management, and daycare ward status.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenDispenser}
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', fontWeight: 700 }}
        >
          <Plus size={16} /> Dispense Walk-In Token
        </button>
      </div>

      {/* Daily Intake Capacity Counter & KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr repeat(3, 1fr)',
          gap: '1rem',
        }}
      >
        {/* Capacity Intake Meter */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#bae6fd' }}>
                Daily Intake Policy
              </span>
              <span style={{ fontSize: '0.6875rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                Max {dailyCapacity} / Day
              </span>
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 900, marginTop: '0.35rem' }}>
              {stats.totalIssued} <span style={{ fontSize: '1.125rem', fontWeight: 600, opacity: 0.85 }}>/ {dailyCapacity} Patients</span>
            </div>
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${stats.capacityPercent}%`,
                  height: '100%',
                  backgroundColor: '#38bdf8',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', marginTop: '0.35rem', opacity: 0.9 }}>
              <span>{stats.walkInCount} Walk-Ins • {stats.onlineCount} Online</span>
              <span>{stats.capacityPercent}% Capacity</span>
            </div>
          </div>
        </div>

        {/* Waiting */}
        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9a3412', textTransform: 'uppercase' }}>
            Waiting Queue
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#c2410c', marginTop: '0.25rem' }}>
            {stats.waiting}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#ea580c', marginTop: '0.25rem' }}>
            Patients in waiting lobby
          </div>
        </div>

        {/* In Consultation */}
        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
            In Consultation
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1d4ed8', marginTop: '0.25rem' }}>
            {stats.inConsultation}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.25rem' }}>
            Currently in chambers
          </div>
        </div>

        {/* Completed */}
        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
            Consultations Done
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#15803d', marginTop: '0.25rem' }}>
            {stats.completed}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem' }}>
            Intake completed today
          </div>
        </div>
      </div>

      {/* Active Consultation Chambers Live Overview */}
      <div className="card" style={{ padding: '1.25rem', borderRadius: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DoorClosed size={18} color="#ea580c" />
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>
              Active Doctor Chambers & Real-Time Consultation Tracker
            </h4>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Rooms assigned per Step 5 & 8
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {rooms.slice(0, 3).map((room) => {
            const activeToken = tokens.find(
              (t) => (t.roomId === room.id || t.doctorName === room.assignedDoctorName) && t.status === 'IN_CONSULTATION'
            );
            const nextWaiting = tokens.find(
              (t) => (t.roomId === room.id || t.doctorName === room.assignedDoctorName) && t.status === 'WAITING'
            );

            return (
              <div
                key={room.id}
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  border: activeToken ? '1.5px solid #93c5fd' : '1px solid var(--border-color)',
                  backgroundColor: activeToken ? '#f0f7ff' : '#fafafa',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#c2410c', fontFamily: 'monospace' }}>
                    {room.roomNumber}
                  </span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      backgroundColor: activeToken ? '#eff6ff' : '#f1f5f9',
                      color: activeToken ? '#1d4ed8' : '#64748b',
                    }}
                  >
                    {activeToken ? '● In Consultation' : '○ Ready / Available'}
                  </span>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800, color: 'var(--secondary)', fontSize: '0.875rem' }}>
                    <Stethoscope size={14} color="#2563eb" />
                    <span>{room.assignedDoctorName || 'Dr. Sarah Jenkins'}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600, marginTop: '2px' }}>
                    Attending: {room.assignedNurseName || 'Nurse Priya Sharma'}
                  </div>
                </div>

                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.625rem', fontSize: '0.75rem' }}>
                  {activeToken ? (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Current Patient:</span>
                      <div style={{ fontWeight: 800, color: '#1d4ed8', marginTop: '2px' }}>
                        #{activeToken.tokenNumber} • {activeToken.patientName} ({activeToken.age}y/{activeToken.gender?.charAt(0)})
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No active patient inside chamber.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto' }}>
                  {nextWaiting && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleStatusChange(nextWaiting.id, 'IN_CONSULTATION')}
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', color: '#0369a1' }}
                    >
                      Call Next: #{nextWaiting.tokenNumber}
                    </button>
                  )}
                  {activeToken && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleStatusChange(activeToken.id, 'COMPLETED')}
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Observation Ward Oversight (Step 6 & 7 Linkage) */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          backgroundColor: '#f8fafc',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ padding: '0.45rem', borderRadius: '8px', backgroundColor: '#e2e8f0', color: '#334155', display: 'flex' }}>
            <Bed size={18} />
          </span>
          <div>
            <h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: 'var(--secondary)' }}>
              OPD Daycare Observation Wards (Steps 6 & 7 Linkage)
            </h5>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Bed ownership and daycare patient observation units
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {wards.map((w) => (
            <div
              key={w.id}
              style={{
                padding: '0.5rem 0.875rem',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                fontSize: '0.75rem',
              }}
            >
              <span style={{ fontWeight: 800, color: '#1e3a8a' }}>{w.wardName.split('(')[0].trim()}: </span>
              <span style={{ color: '#15803d', fontWeight: 700 }}>{w.totalBeds} Beds</span>
              <span style={{ color: 'var(--text-muted)' }}> • Supervised by {w.responsibleDoctorName?.split(' ')[1] || 'Dr. Sarah'} & {w.responsibleNurseName?.split(' ')[1] || 'Priya'}</span>
            </div>
          ))}
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
            placeholder="Search tokens by token #, patient name, UHID, complaint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Queue Statuses</option>
          <option value="WAITING">Waiting</option>
          <option value="IN_CONSULTATION">In Consultation</option>
          <option value="COMPLETED">Completed</option>
        </select>

        <select className="form-select" style={{ width: 'auto' }} value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
          <option value="all">All Attending Doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fullName}
            </option>
          ))}
        </select>
      </div>

      {/* Live Queue Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '100px' }}>Token #</th>
              <th>Patient & Identification</th>
              <th style={{ width: '120px' }}>Intake Mode</th>
              <th style={{ width: '220px' }}>Assigned Station</th>
              <th style={{ width: '220px' }}>Vitals & Chief Complaint</th>
              <th style={{ width: '140px' }}>Queue Status</th>
              <th style={{ width: '180px', textAlign: 'right' }}>Live Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTokens.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No patients match the selected queue filter. Click "+ Dispense Walk-In Token" to register a patient.
                </td>
              </tr>
            ) : (
              filteredTokens.map((token) => (
                <tr key={token.id}>
                  <td>
                    <span
                      style={{
                        fontWeight: 900,
                        fontSize: '0.8125rem',
                        padding: '0.25rem 0.55rem',
                        borderRadius: '6px',
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        fontFamily: 'monospace',
                        letterSpacing: '0.04em',
                      }}
                    >
                      #{token.tokenNumber}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, color: 'var(--secondary)' }}>{token.patientName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {token.uhid} • {token.age} yrs • {token.gender}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: token.type === 'WALK_IN' ? '#f0fdf4' : '#faf5ff',
                        color: token.type === 'WALK_IN' ? '#15803d' : '#7e22ce',
                        border: token.type === 'WALK_IN' ? '1px solid #bbf7d0' : '1px solid #e9d5ff',
                      }}
                    >
                      {token.type === 'WALK_IN' ? 'Walk-In' : 'Online Booking'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#1e40af' }}>
                      {token.doctorName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {token.roomName || 'Chamber 101'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--secondary)' }}>
                      {token.chiefComplaint || 'General Checkup'}
                    </div>
                    {token.vitals && (
                      <div style={{ fontSize: '0.6875rem', color: '#0369a1', fontFamily: 'monospace' }}>
                        {token.vitals}
                      </div>
                    )}
                  </td>
                  <td>{getStatusBadge(token.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      {token.status === 'WAITING' && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleStatusChange(token.id, 'IN_CONSULTATION')}
                          style={{ fontSize: '0.7188rem', padding: '0.25rem 0.55rem' }}
                        >
                          Call In
                        </button>
                      )}
                      {token.status === 'IN_CONSULTATION' && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleStatusChange(token.id, 'COMPLETED')}
                          style={{ fontSize: '0.7188rem', padding: '0.25rem 0.55rem', backgroundColor: '#f0fdf4', color: '#15803d', borderColor: '#86efac', fontWeight: 700 }}
                        >
                          Finish
                        </button>
                      )}
                      {token.status === 'COMPLETED' && (
                        <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
                          ✓ Done
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dispense Walk-In Token Modal */}
      {isDispenserOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              width: '90vw',
              maxWidth: '560px',
              padding: '1.75rem',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', padding: '0.375rem', borderRadius: '8px', display: 'flex' }}>
                  <Ticket size={18} />
                </span>
                <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>
                  Dispense Walk-In OPD Token
                </h4>
              </div>
              <button className="action-btn" onClick={() => setIsDispenserOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleIssueToken} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.875rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Patient Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Anand Sharma"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Phone Contact
                  </label>
                  <input
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 00000"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Age
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    className="form-input"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Gender
                  </label>
                  <select className="form-select" value={gender} onChange={(e) => setGender(e.target.value as any)}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Assign Attending Doctor & Chamber
                </label>
                <select
                  className="form-select"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.specialization}) • {d.assignedRoomName || 'Room 101'}
                    </option>
                  ))}
                </select>

                {(() => {
                  const doc = doctors.find((d) => d.id === selectedDoctorId);
                  return doc ? (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.8125rem',
                        marginTop: '0.4rem',
                      }}
                    >
                      <span style={{ color: '#0369a1', fontWeight: 600 }}>
                        Consultation Tariff:
                      </span>
                      <span style={{ fontWeight: 800, color: '#0284c7' }}>
                        ${doc.consultationFee || 75}.00 • Billed at Cashier
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Chief Complaint / Symptom
                </label>
                <input
                  className="form-input"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="e.g. Chest pain, palpitations, acute hypertension"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Initial Triage Vitals
                </label>
                <input
                  className="form-input"
                  value={vitals}
                  onChange={(e) => setVitals(e.target.value)}
                  placeholder="BP, Pulse, SpO2..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsDispenserOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.625rem 1.5rem', fontWeight: 700 }}>
                  Issue Token & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
