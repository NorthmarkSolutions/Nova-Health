import React, { useState, useEffect, useMemo } from 'react';
import {
  DoorClosed,
  Search,
  Plus,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Stethoscope,
  Building2,
  Layers,
  Wrench,
  X,
  Check,
  Bed,
  Sparkles,
  ShieldCheck,
  HeartPulse,
} from 'lucide-react';
import { DepartmentWorkspace, DepartmentRoom, DepartmentDoctor, DepartmentWard } from '../../types';
import {
  getDepartmentRooms,
  saveDepartmentRoom,
  getDepartmentDoctors,
  getDepartmentStaffAssignments,
  getDepartmentWards,
  saveDepartmentWard,
} from './departmentWorkspaceStore';
import {
  getHospitalStaff,
  StaffMember,
} from '../admin/setup/organization/hospitalStaffStore';

interface Props {
  workspace: DepartmentWorkspace;
}

export const DepartmentRoomsManagement: React.FC<Props> = ({ workspace }) => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'wards' | 'beds'>('rooms');

  const [rooms, setRooms] = useState<DepartmentRoom[]>(() =>
    getDepartmentRooms(workspace.departmentId)
  );
  const [wards, setWards] = useState<DepartmentWard[]>(() =>
    getDepartmentWards(workspace.departmentId)
  );
  const [doctors, setDoctors] = useState<DepartmentDoctor[]>(() =>
    getDepartmentDoctors(workspace.departmentId)
  );
  const [staff, setStaff] = useState(() =>
    getDepartmentStaffAssignments(workspace.departmentId)
  );
  const [hospitalStaffPool, setHospitalStaffPool] = useState<StaffMember[]>(() =>
    getHospitalStaff()
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Edit Room Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<DepartmentRoom | null>(null);
  const [roomNumber, setRoomNumber] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'consultation' | 'procedure' | 'treatment' | 'triage' | 'observation'>('consultation');
  const [status, setStatus] = useState<'AVAILABLE' | 'IN_CONSULTATION' | 'MAINTENANCE' | 'OCCUPIED'>('AVAILABLE');
  const [assignedDoctorId, setAssignedDoctorId] = useState('');
  const [assignedNurseName, setAssignedNurseName] = useState('');

  // Edit Ward / Bed Ownership Modal State
  const [isWardModalOpen, setIsWardModalOpen] = useState(false);
  const [editingWard, setEditingWard] = useState<DepartmentWard | null>(null);
  const [wardName, setWardName] = useState('');
  const [wardBuilding, setWardBuilding] = useState('North Central Hospital Tower');
  const [wardFloor, setWardFloor] = useState('Ground Floor (Level 0)');
  const [wardBeds, setWardBeds] = useState(20);
  const [wardHeadNurseId, setWardHeadNurseId] = useState('');
  const [wardRespDoctorId, setWardRespDoctorId] = useState('');
  const [wardRespNurseId, setWardRespNurseId] = useState('');
  const [wardNotes, setWardNotes] = useState('');

  const reload = () => {
    setRooms(getDepartmentRooms(workspace.departmentId));
    setWards(getDepartmentWards(workspace.departmentId));
    setDoctors(getDepartmentDoctors(workspace.departmentId));
    setStaff(getDepartmentStaffAssignments(workspace.departmentId));
    setHospitalStaffPool(getHospitalStaff());
  };

  useEffect(() => {
    reload();
  }, [workspace.departmentId]);

  // Quick Preset for Step 5: Room 101 -> Dr. Sarah + Priya, Room 102 -> Dr. Michael + Rahul
  const handleApplyStep5Presets = () => {
    const docSarah = doctors.find((d) => d.fullName.toLowerCase().includes('sarah')) || doctors[0];
    const docMichael = doctors.find((d) => d.fullName.toLowerCase().includes('michael')) || doctors[1] || doctors[0];
    const nursePriya = staff.find((s) => s.fullName.toLowerCase().includes('priya'))?.fullName || 'Nurse Priya Sharma';
    const nurseRahul = staff.find((s) => s.fullName.toLowerCase().includes('rahul'))?.fullName || 'Nurse Rahul Varma';

    const updatedRooms = rooms.map((r, idx) => {
      if (idx === 0 || r.roomNumber.includes('101')) {
        return {
          ...r,
          roomNumber: 'Room 101',
          name: 'Room 101 - Primary Consultation Chamber',
          assignedDoctorId: docSarah ? docSarah.id : r.assignedDoctorId,
          assignedDoctorName: docSarah ? docSarah.fullName : r.assignedDoctorName,
          assignedNurseName: nursePriya,
        };
      }
      if (idx === 1 || r.roomNumber.includes('102')) {
        return {
          ...r,
          roomNumber: 'Room 102',
          name: 'Room 102 - Cardiac & Clinical Chamber',
          assignedDoctorId: docMichael ? docMichael.id : r.assignedDoctorId,
          assignedDoctorName: docMichael ? docMichael.fullName : r.assignedDoctorName,
          assignedNurseName: nurseRahul,
        };
      }
      return r;
    });

    updatedRooms.forEach((r) => saveDepartmentRoom(r));
    reload();
  };

  // Quick Preset for Steps 6 & 7: Ward A (20 Beds, Dr. Sarah & Nurse Priya), Ward B (10 Beds, Dr. Michael & Nurse Kavita)
  const handleApplyStep6And7Presets = () => {
    const docSarah = doctors.find((d) => d.fullName.toLowerCase().includes('sarah'));
    const docMichael = doctors.find((d) => d.fullName.toLowerCase().includes('michael'));
    const nursePriya = staff.find((s) => s.fullName.toLowerCase().includes('priya'));
    const nurseKavita = staff.find((s) => s.fullName.toLowerCase().includes('kavita'));

    const wardA: DepartmentWard = {
      id: 'wrd-opd-1',
      departmentId: workspace.departmentId,
      wardName: 'Ward A (OPD Observation Ward)',
      buildingName: 'North Central Hospital Tower',
      floorName: 'Ground Floor (Level 0)',
      headNurseId: nursePriya?.staffId || 'stf-nurse-1',
      headNurseName: nursePriya?.fullName || 'Nurse Priya Sharma',
      totalBeds: 20,
      responsibleDoctorId: docSarah?.id || 'doc-opd-1',
      responsibleDoctorName: docSarah?.fullName || 'Dr. Sarah Jenkins',
      responsibleNurseId: nursePriya?.staffId || 'stf-nurse-1',
      responsibleNurseName: nursePriya?.fullName || 'Nurse Priya Sharma',
      notes: 'Bed ownership defined: 20 Beds supervised by Dr. Sarah & Nurse Priya',
    };

    const wardB: DepartmentWard = {
      id: 'wrd-opd-2',
      departmentId: workspace.departmentId,
      wardName: 'Ward B (Post-Consultation Observation)',
      buildingName: 'North Central Hospital Tower',
      floorName: 'Floor 1',
      headNurseId: nurseKavita?.staffId || 'stf-nurse-2',
      headNurseName: nurseKavita?.fullName || 'Nurse Kavita Verma',
      totalBeds: 10,
      responsibleDoctorId: docMichael?.id || 'doc-opd-2',
      responsibleDoctorName: docMichael?.fullName || 'Dr. Michael Chang',
      responsibleNurseId: nurseKavita?.staffId || 'stf-nurse-2',
      responsibleNurseName: nurseKavita?.fullName || 'Nurse Kavita Verma',
      notes: 'Bed ownership defined: 10 Beds supervised by Dr. Michael & Nurse Kavita',
    };

    saveDepartmentWard(wardA);
    saveDepartmentWard(wardB);
    reload();
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.roomNumber.toLowerCase().includes(q) ||
          (r.assignedDoctorName && r.assignedDoctorName.toLowerCase().includes(q)) ||
          (r.assignedNurseName && r.assignedNurseName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [rooms, statusFilter, typeFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = rooms.length;
    const available = rooms.filter((r) => r.status === 'AVAILABLE').length;
    const inUse = rooms.filter((r) => r.status === 'IN_CONSULTATION' || r.status === 'OCCUPIED').length;
    const maintenance = rooms.filter((r) => r.status === 'MAINTENANCE').length;
    const totalWards = wards.length;
    const totalBeds = wards.reduce((acc, w) => acc + (w.totalBeds || 0), 0);
    return { total, available, inUse, maintenance, totalWards, totalBeds };
  }, [rooms, wards]);

  const handleOpenEdit = (room: DepartmentRoom) => {
    setEditingRoom(room);
    setRoomNumber(room.roomNumber);
    setName(room.name);
    setType(room.type);
    setStatus(room.status);
    setAssignedDoctorId(room.assignedDoctorId || '');
    setAssignedNurseName(room.assignedNurseName || '');
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingRoom(null);
    const nextNum = `Room 10${rooms.length + 1}`;
    setRoomNumber(nextNum);
    setName(`Room 10${rooms.length + 1} - Consultation Chamber`);
    setType('consultation');
    setStatus('AVAILABLE');
    setAssignedDoctorId('');
    setAssignedNurseName('');
    setIsModalOpen(true);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roomNumber.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    const assignedDoc = doctors.find((d) => d.id === assignedDoctorId);

    const payload: DepartmentRoom = {
      id: editingRoom?.id || `rm-${workspace.departmentId}-${Date.now()}`,
      departmentId: workspace.departmentId,
      roomNumber: roomNumber.trim(),
      name: name.trim(),
      type,
      floorName: editingRoom?.floorName || 'Ground Floor (Level 0)',
      buildingName: editingRoom?.buildingName || 'North Central Hospital Tower',
      status,
      assignedDoctorId,
      assignedDoctorName: assignedDoc ? assignedDoc.fullName : undefined,
      assignedNurseName: assignedNurseName.trim() || undefined,
      capacity: editingRoom?.capacity || 4,
      equipment: editingRoom?.equipment || ['Examination Couch', 'Vitals Station'],
    };

    saveDepartmentRoom(payload);
    setIsModalOpen(false);
    reload();
  };

  const handleOpenEditWard = (ward: DepartmentWard) => {
    setEditingWard(ward);
    setWardName(ward.wardName);
    setWardBuilding(ward.buildingName);
    setWardFloor(ward.floorName);
    setWardBeds(ward.totalBeds);
    setWardHeadNurseId(ward.headNurseId);
    setWardRespDoctorId(ward.responsibleDoctorId || '');
    setWardRespNurseId(ward.responsibleNurseId || '');
    setWardNotes(ward.notes || '');
    setIsWardModalOpen(true);
  };

  const handleSaveWard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wardName.trim()) return;

    const headNurse = staff.find((s) => s.staffId === wardHeadNurseId);
    const respDoc = doctors.find((d) => d.id === wardRespDoctorId);
    const respNurse = staff.find((s) => s.staffId === wardRespNurseId);

    const payload: DepartmentWard = {
      id: editingWard?.id || `wrd-${workspace.departmentId}-${Date.now()}`,
      departmentId: workspace.departmentId,
      wardName: wardName.trim(),
      buildingName: wardBuilding,
      floorName: wardFloor,
      headNurseId: wardHeadNurseId,
      headNurseName: headNurse?.fullName || editingWard?.headNurseName || 'Assigned Head Nurse',
      totalBeds: Number(wardBeds),
      responsibleDoctorId: wardRespDoctorId,
      responsibleDoctorName: respDoc?.fullName || editingWard?.responsibleDoctorName,
      responsibleNurseId: wardRespNurseId,
      responsibleNurseName: respNurse?.fullName || editingWard?.responsibleNurseName,
      notes: wardNotes.trim(),
    };

    saveDepartmentWard(payload);
    setIsWardModalOpen(false);
    reload();
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'AVAILABLE':
        return (
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <CheckCircle2 size={12} /> Available
          </span>
        );
      case 'IN_CONSULTATION':
      case 'OCCUPIED':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={12} /> In Consultation
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
            <Wrench size={12} /> Maintenance
          </span>
        );
      default:
        return <span className="badge badge-secondary">{s}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
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
                backgroundColor: 'rgba(234, 88, 12, 0.1)',
                color: '#ea580c',
                padding: '0.375rem',
                borderRadius: '8px',
                display: 'flex',
              }}
            >
              <DoorClosed size={22} />
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>
              {workspace.shortName} Rooms, Wards & Bed Ownership Engine
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Steps 5, 6, 7: Room assignment (Doctor & Nurse pairing), Ward allocation (Head Nurse), and Bed Ownership Rules.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {activeTab === 'rooms' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAdd}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <Plus size={16} /> Allocate Room / Chamber
            </button>
          )}
          {activeTab !== 'rooms' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditingWard(null);
                setWardName(`Ward ${String.fromCharCode(65 + wards.length)} (OPD Observation)`);
                setWardBeds(15);
                setWardHeadNurseId(staff.find((s) => s.role === 'nurse')?.staffId || '');
                setWardRespDoctorId(doctors[0]?.id || '');
                setWardRespNurseId(staff.find((s) => s.role === 'nurse')?.staffId || '');
                setWardNotes('');
                setIsWardModalOpen(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <Plus size={16} /> Add Department Ward
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="card" style={{ padding: '1rem', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Consultation Chambers
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--secondary)', marginTop: '0.25rem' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.2rem' }}>
            ✓ {stats.available} Available Now
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>
            Assigned Wards
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#15803d', marginTop: '0.25rem' }}>
            {stats.totalWards}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.2rem' }}>
            Ward A, Ward B Units
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af', textTransform: 'uppercase' }}>
            Owned Beds Total
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1d4ed8', marginTop: '0.25rem' }}>
            {stats.totalBeds} Beds
          </div>
          <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.2rem' }}>
            Observation & Daycare
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9a3412', textTransform: 'uppercase' }}>
            In Active Use
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#c2410c', marginTop: '0.25rem' }}>
            {stats.inUse}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#ea580c', marginTop: '0.2rem' }}>
            Consultation underway
          </div>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.25rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('rooms')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px 8px 0 0',
            fontWeight: 700,
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'rooms' ? '#ea580c' : '#f1f5f9',
            color: activeTab === 'rooms' ? '#ffffff' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
        >
          <DoorClosed size={16} /> 1. Step 5: Chambers & Rooms ({rooms.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('wards')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px 8px 0 0',
            fontWeight: 700,
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'wards' ? '#ea580c' : '#f1f5f9',
            color: activeTab === 'wards' ? '#ffffff' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Layers size={16} /> 2. Step 6: Ward Head Nurse Allocation ({wards.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('beds')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px 8px 0 0',
            fontWeight: 700,
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'beds' ? '#ea580c' : '#f1f5f9',
            color: activeTab === 'beds' ? '#ffffff' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Bed size={16} /> 3. Step 7: Bed Ownership & Responsibility Rules
        </button>
      </div>

      {activeTab === 'rooms' ? (
        /* STEP 5: ROOM ASSIGNMENT VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Quick Scenario Preset Banner */}
          <div
            style={{
              padding: '0.875rem 1.25rem',
              borderRadius: '10px',
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#9a3412', fontSize: '0.875rem' }}>
                <Sparkles size={16} color="#ea580c" />
                <span>Step 5: Room Assignment Specification</span>
              </div>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.7813rem', color: '#c2410c' }}>
                Assign staff to rooms: Room 101 (Doctor: Dr. Sarah, Nurse: Priya) & Room 102 (Doctor: Dr. Michael, Nurse: Rahul).
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleApplyStep5Presets}
              style={{ fontSize: '0.7813rem', fontWeight: 700, backgroundColor: '#ffffff', color: '#ea580c', borderColor: '#fdba74' }}
            >
              Apply Step 5 Specification Presets
            </button>
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
                placeholder="Search by chamber number, doctor, nurse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Room Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="IN_CONSULTATION">In Consultation</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>

            <select className="form-select" style={{ width: 'auto' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Room Types</option>
              <option value="consultation">Consultation Chamber</option>
              <option value="triage">Triage / Assessment</option>
              <option value="procedure">Minor Procedure</option>
              <option value="treatment">Treatment Bay</option>
            </select>
          </div>

          {/* Rooms Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Chamber ID</th>
                  <th>Room Name & Facility</th>
                  <th style={{ width: '140px' }}>Type</th>
                  <th style={{ width: '200px' }}>Location</th>
                  <th style={{ width: '220px' }}>Stationed Doctor</th>
                  <th style={{ width: '200px' }}>Attending Nurse</th>
                  <th style={{ width: '130px' }}>Status</th>
                  <th style={{ width: '90px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No rooms or chambers match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room) => (
                    <tr key={room.id}>
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
                            fontFamily: 'monospace',
                          }}
                        >
                          {room.roomNumber}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{room.name}</div>
                        {room.equipment && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            {room.equipment.slice(0, 2).join(' • ')}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize', color: '#0369a1' }}>
                          {room.type}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <div>{room.buildingName || 'Hospital Tower'}</div>
                          <div style={{ fontSize: '0.6875rem' }}>{room.floorName || 'Ground Floor'}</div>
                        </div>
                      </td>
                      <td>
                        {room.assignedDoctorName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', fontWeight: 700, color: '#1e40af' }}>
                            <Stethoscope size={13} color="#2563eb" />
                            <span>{room.assignedDoctorName}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>— Unassigned —</span>
                        )}
                      </td>
                      <td>
                        {room.assignedNurseName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', color: '#15803d', fontWeight: 700 }}>
                            <UserCheck size={13} color="#16a34a" />
                            <span>{room.assignedNurseName}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>— Floating Nurse —</span>
                        )}
                      </td>
                      <td>{getStatusBadge(room.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => handleOpenEdit(room)}
                          title="Configure Stationing"
                        >
                          <Edit2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'wards' ? (
        /* STEP 6: WARD ASSIGNMENT VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Quick Scenario Preset Banner */}
          <div
            style={{
              padding: '0.875rem 1.25rem',
              borderRadius: '10px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#166534', fontSize: '0.875rem' }}>
                <ShieldCheck size={16} color="#16a34a" />
                <span>Step 6: Ward Assignment Specification</span>
              </div>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.7813rem', color: '#15803d' }}>
                Assign Head Nurses to wards: Ward A → Head Nurse: Priya, Ward B → Head Nurse: Kavita.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleApplyStep6And7Presets}
              style={{ fontSize: '0.7813rem', fontWeight: 700, backgroundColor: '#ffffff', color: '#15803d', borderColor: '#86efac' }}
            >
              Apply Step 6 & 7 Specification Presets
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Ward Unit</th>
                  <th>Ward Name</th>
                  <th style={{ width: '220px' }}>Location</th>
                  <th style={{ width: '120px' }}>Bed Capacity</th>
                  <th style={{ width: '240px' }}>Head Nurse In-Charge</th>
                  <th style={{ width: '90px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {wards.map((ward, idx) => (
                  <tr key={ward.id}>
                    <td>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        Ward {String.fromCharCode(65 + idx)}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{ward.wardName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ward.notes || 'Observation & Recovery Unit'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem' }}>
                        <div style={{ fontWeight: 600 }}>{ward.buildingName}</div>
                        <div style={{ color: 'var(--text-muted)' }}>{ward.floorName}</div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontWeight: 700 }}>
                        {ward.totalBeds} Beds
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                          }}
                        >
                          HN
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#15803d', fontSize: '0.875rem' }}>
                            {ward.headNurseName}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            Assigned Head Nurse
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => handleOpenEditWard(ward)}
                        title="Configure Ward Head Nurse"
                      >
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* STEP 7: BED ASSIGNMENT RULES VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Critical Warning / Step 7 Architectural Rule */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.875rem',
            }}
          >
            <span style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: '#dbeafe', color: '#1d4ed8', display: 'flex', marginTop: '2px' }}>
              <Bed size={20} />
            </span>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#1e3a8a' }}>
                Step 7: Bed Ownership & Responsibility Rules Architecture
              </h4>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#1d4ed8', lineHeight: 1.5 }}>
                <strong>Important Principle:</strong> Department Admin does <em>NOT</em> assign individual patients to beds.
                Instead, they define bed ownership and clinical responsibility rules across the department:
                <br />
                • <strong>Ward A: 20 Beds</strong> → Responsible Doctor: Dr. Sarah | Responsible Nurse: Priya
                <br />
                • <strong>Ward B: 10 Beds</strong> → Responsible Doctor: Dr. Michael | Responsible Nurse: Kavita
              </p>
            </div>
          </div>

          {/* Bed Ownership Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {wards.map((ward, idx) => (
              <div
                key={ward.id}
                className="card"
                style={{
                  padding: '1.5rem',
                  borderRadius: '14px',
                  border: '1.5px solid var(--border-color)',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ padding: '0.35rem 0.65rem', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: '0.8125rem' }}>
                      Ward {String.fromCharCode(65 + idx)}
                    </span>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>
                      {ward.wardName.split('(')[0].trim()}
                    </h4>
                  </div>
                  <span className="badge badge-info" style={{ fontWeight: 800, fontSize: '0.8125rem' }}>
                    {ward.totalBeds} Beds Ownership
                  </span>
                </div>

                <div style={{ padding: '0.875rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Responsible Doctor:</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Stethoscope size={13} /> {ward.responsibleDoctorName || 'Dr. Sarah Jenkins'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Responsible Care Nurse:</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <HeartPulse size={13} /> {ward.responsibleNurseName || 'Nurse Priya Sharma'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Head Nurse In-Charge:</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                      {ward.headNurseName}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {ward.buildingName} • {ward.floorName}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleOpenEditWard(ward)}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  >
                    Edit Bed Ownership
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Room Modal (Step 5) */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              width: '90vw',
              maxWidth: '680px',
              padding: '1.75rem',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ backgroundColor: 'rgba(234, 88, 12, 0.1)', color: '#ea580c', padding: '0.375rem', borderRadius: '8px', display: 'flex' }}>
                  <DoorClosed size={18} />
                </span>
                <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>
                  {editingRoom ? `Configure ${editingRoom.name}` : `Allocate New Chamber to ${workspace.shortName}`}
                </h4>
              </div>
              <button className="action-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.875rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Room / Chamber Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Room 101 - Primary Consultation Chamber"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Room Number / Code <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. Room 101"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Room Type
                  </label>
                  <select className="form-select" value={type} onChange={(e) => setType(e.target.value as any)}>
                    <option value="consultation">Consultation Chamber</option>
                    <option value="triage">Triage / Assessment Bay</option>
                    <option value="procedure">Minor Procedure Suite</option>
                    <option value="treatment">Treatment & Dressing</option>
                    <option value="observation">Short Observation</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Current Operational Status
                  </label>
                  <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                    <option value="AVAILABLE">Available</option>
                    <option value="IN_CONSULTATION">In Consultation</option>
                    <option value="MAINTENANCE">Maintenance / Cleaning</option>
                    <option value="OCCUPIED">Occupied</option>
                  </select>
                </div>
              </div>

              {/* Stationed Doctor & Attending Nurse (Step 5) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Assign Primary Doctor (Step 5)
                  </label>
                  <select
                    className="form-select"
                    value={assignedDoctorId}
                    onChange={(e) => setAssignedDoctorId(e.target.value)}
                  >
                    <option value="">— Unassigned (Rotational) —</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} ({d.specialization.split('&')[0].trim()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Assign Attending Nurse (Step 5)
                  </label>
                  <input
                    className="form-input"
                    value={assignedNurseName}
                    onChange={(e) => setAssignedNurseName(e.target.value)}
                    placeholder="e.g. Priya or Nurse Rahul"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.625rem 1.5rem', fontWeight: 700 }}>
                  Save Chamber Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Ward / Bed Ownership Modal (Steps 6 & 7) */}
      {isWardModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              width: '90vw',
              maxWidth: '680px',
              padding: '1.75rem',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', padding: '0.375rem', borderRadius: '8px', display: 'flex' }}>
                  <Layers size={18} />
                </span>
                <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>
                  {editingWard ? `Configure ${editingWard.wardName}` : `Add Ward to ${workspace.shortName}`}
                </h4>
              </div>
              <button className="action-btn" onClick={() => setIsWardModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWard} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.875rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Ward Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={wardName}
                    onChange={(e) => setWardName(e.target.value)}
                    placeholder="e.g. Ward A (OPD Observation Ward)"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Bed Capacity (Step 7)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={wardBeds}
                    onChange={(e) => setWardBeds(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Head Nurse In-Charge (Step 6)
                  </label>
                  <select
                    className="form-select"
                    value={wardHeadNurseId}
                    onChange={(e) => setWardHeadNurseId(e.target.value)}
                  >
                    <option value="">— Select Head Nurse —</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.staffId}>
                        {s.fullName} ({s.designation})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Campus Location
                  </label>
                  <input
                    className="form-input"
                    value={`${wardBuilding} • ${wardFloor}`}
                    disabled
                  />
                </div>
              </div>

              {/* Step 7 Bed Ownership Rules */}
              <div style={{ padding: '0.875rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#1e3a8a' }}>
                  Step 7: Bed Ownership & Clinical Responsibility Rules
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                      Responsible Doctor
                    </label>
                    <select
                      className="form-select"
                      value={wardRespDoctorId}
                      onChange={(e) => setWardRespDoctorId(e.target.value)}
                    >
                      <option value="">— Select Responsible Doctor —</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullName} ({d.specialization.split('&')[0].trim()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                      Responsible Care Nurse
                    </label>
                    <select
                      className="form-select"
                      value={wardRespNurseId}
                      onChange={(e) => setWardRespNurseId(e.target.value)}
                    >
                      <option value="">— Select Responsible Nurse —</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.staffId}>
                          {s.fullName} ({s.designation})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Notes / Operating Policies
                </label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '60px' }}
                  value={wardNotes}
                  onChange={(e) => setWardNotes(e.target.value)}
                  placeholder="e.g. Bed ownership configured: 20 Beds supervised by Dr. Sarah & Nurse Priya"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsWardModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.625rem 1.5rem', fontWeight: 700 }}>
                  Save Ward & Bed Rules
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
