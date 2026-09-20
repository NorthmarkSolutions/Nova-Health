import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Stethoscope,
  ShieldCheck,
  Clock,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  X,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Award,
  Layers,
  Download,
  UploadCloud,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Activity,
} from 'lucide-react';
import {
  StaffMember,
  HospitalShift,
  StaffRole,
  StaffStatus,
  getHospitalStaff,
  saveHospitalStaff,
  addHospitalStaff,
  updateHospitalStaff,
  deleteHospitalStaff,
  getHospitalShifts,
  DEFAULT_HOSPITAL_STAFF,
} from './hospitalStaffStore';
import { downloadStaffImportTemplate } from './staffTemplateGenerator';
import { BulkStaffImportModal } from './BulkStaffImportModal';

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

export const StaffMasterSection: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>(() => getHospitalStaff());
  const [shifts, setShifts] = useState<HospitalShift[]>(() => getHospitalShifts());
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Bulk Import Modal state
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<StaffMember>>({
    fullName: '',
    role: 'doctor',
    employeeCode: '',
    designation: '',
    qualification: '',
    departmentIds: [],
    departmentNames: [],
    isDepartmentHead: false,
    hodDepartmentId: '',
    hodDepartmentName: '',
    shiftIds: [],
    shiftNames: [],
    shiftHoursList: [],
    shiftId: '',
    shiftName: '',
    shiftHours: '',
    email: '',
    phone: '',
    status: 'ACTIVE',
    gender: 'Male',
  });

  // Load departments from local storage
  const loadDepartments = () => {
    try {
      const raw = localStorage.getItem('north_hospital_departments_master');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setDepartments(parsed.map((d: any) => ({ id: d.id, name: d.name, code: d.code })));
        }
      }
    } catch (e) {
      console.error('Failed to load departments in StaffMaster', e);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  // Listen to shifts, staff, and departments store broadcasts
  useEffect(() => {
    const onStaffUpdated = (e: any) => {
      if (e.detail) setStaffList(e.detail);
      else setStaffList(getHospitalStaff());
    };
    const onShiftsUpdated = (e: any) => {
      if (e.detail) setShifts(e.detail);
      else setShifts(getHospitalShifts());
    };
    const onDeptsUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setDepartments(e.detail.map((d: any) => ({ id: d.id, name: d.name, code: d.code })));
      } else {
        loadDepartments();
      }
    };

    window.addEventListener('north_hospital_staff_updated', onStaffUpdated);
    window.addEventListener('north_hospital_shifts_updated', onShiftsUpdated);
    window.addEventListener('north_hospital_departments_updated', onDeptsUpdated);

    return () => {
      window.removeEventListener('north_hospital_staff_updated', onStaffUpdated);
      window.removeEventListener('north_hospital_shifts_updated', onShiftsUpdated);
      window.removeEventListener('north_hospital_departments_updated', onDeptsUpdated);
    };
  }, []);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((m) => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;

      // Shift filter
      if (shiftFilter !== 'all') {
        const hasShift =
          (m.shiftIds && m.shiftIds.includes(shiftFilter)) ||
          m.shiftId === shiftFilter ||
          (m.shiftNames && m.shiftNames.some((sn) => sn.toLowerCase().includes(shiftFilter.toLowerCase())));
        if (!hasShift) return false;
      }

      // Department filter
      if (deptFilter !== 'all') {
        if (deptFilter === 'unassigned') {
          const hasDepts = (m.departmentIds && m.departmentIds.length > 0) || Boolean(m.departmentName);
          if (hasDepts) return false;
        } else {
          const inDept =
            (m.departmentIds && m.departmentIds.includes(deptFilter)) ||
            (m.departmentNames && m.departmentNames.includes(deptFilter)) ||
            m.departmentId === deptFilter ||
            m.departmentName === deptFilter;
          if (!inDept) return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.fullName.toLowerCase().includes(q);
        const matchesCode = m.employeeCode.toLowerCase().includes(q);
        const matchesDesig = m.designation?.toLowerCase().includes(q) || false;
        const matchesQual = m.qualification?.toLowerCase().includes(q) || false;
        const matchesDept =
          m.departmentName?.toLowerCase().includes(q) ||
          (m.departmentNames && m.departmentNames.some((dn) => dn.toLowerCase().includes(q))) ||
          false;
        return matchesName || matchesCode || matchesDesig || matchesQual || matchesDept;
      }
      return true;
    });
  }, [staffList, roleFilter, shiftFilter, deptFilter, statusFilter, searchQuery]);

  // Metric stats for the 5 summary cards
  const stats = useMemo(() => {
    const total = staffList.length;
    const doctors = staffList.filter((s) => s.role === 'doctor').length;
    const nurses = staffList.filter((s) => s.role === 'nurse').length;
    const techs = staffList.filter((s) => s.role === 'technician' || s.role === 'paramedic').length;
    const admin = staffList.filter((s) => s.role === 'admin' || s.role === 'support').length;
    const active = staffList.filter((s) => s.status === 'ACTIVE').length;
    return { total, doctors, nurses, techs, admin, active };
  }, [staffList]);

  // Generate an employee code suggestion
  const generateEmployeeCode = (role: string) => {
    const prefix =
      role === 'doctor'
        ? 'DOC'
        : role === 'nurse'
        ? 'NUR'
        : role === 'technician'
        ? 'TCH'
        : role === 'paramedic'
        ? 'PRM'
        : role === 'admin'
        ? 'ADM'
        : 'STF';
    const randNum = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${randNum}`;
  };

  const handleOpenAddModal = () => {
    setEditingStaffId(null);
    const defaultShift = shifts[0] || {
      id: 'shift-morn',
      name: 'Morning Shift',
      startTime: '08:00',
      endTime: '16:00',
    };
    const firstDept = departments[0];

    setFormData({
      fullName: '',
      role: 'doctor',
      employeeCode: generateEmployeeCode('doctor'),
      designation: 'Clinical Specialist',
      qualification: 'MBBS, MD',
      departmentIds: firstDept ? [firstDept.id] : [],
      departmentNames: firstDept ? [firstDept.name] : [],
      isDepartmentHead: false,
      hodDepartmentId: '',
      hodDepartmentName: '',
      shiftIds: [defaultShift.id],
      shiftNames: [defaultShift.name],
      shiftHoursList: [`${defaultShift.startTime} - ${defaultShift.endTime}`],
      shiftId: defaultShift.id,
      shiftName: defaultShift.name,
      shiftHours: `${defaultShift.startTime} - ${defaultShift.endTime}`,
      email: '',
      phone: '',
      status: 'ACTIVE',
      gender: 'Male',
      joiningDate: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: StaffMember) => {
    setEditingStaffId(member.id);
    const deptIds = member.departmentIds?.length
      ? member.departmentIds
      : member.departmentId
      ? [member.departmentId]
      : [];
    const deptNames = member.departmentNames?.length
      ? member.departmentNames
      : member.departmentName
      ? [member.departmentName]
      : [];
    const shiftIds = member.shiftIds?.length
      ? member.shiftIds
      : member.shiftId
      ? [member.shiftId]
      : [];
    const shiftNames = member.shiftNames?.length
      ? member.shiftNames
      : member.shiftName
      ? [member.shiftName]
      : [];
    const shiftHoursList = member.shiftHoursList?.length
      ? member.shiftHoursList
      : member.shiftHours
      ? [member.shiftHours]
      : [];

    setFormData({
      ...member,
      departmentIds: deptIds,
      departmentNames: deptNames,
      shiftIds: shiftIds,
      shiftNames: shiftNames,
      shiftHoursList: shiftHoursList,
      isDepartmentHead: Boolean(member.isDepartmentHead),
      hodDepartmentId: member.hodDepartmentId || '',
      hodDepartmentName: member.hodDepartmentName || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.employeeCode) {
      alert('Please fill out all required fields.');
      return;
    }

    const deptIds = formData.departmentIds || [];
    const deptNames = deptIds.map((id) => departments.find((d) => d.id === id)?.name || id);

    const shiftIds = formData.shiftIds || [];
    const shiftNames = shiftIds.map((id) => shifts.find((s) => s.id === id)?.name || id);
    const shiftHoursList = shiftIds.map((id) => {
      const sh = shifts.find((s) => s.id === id);
      return sh ? `${sh.startTime} - ${sh.endTime}` : '08:00 - 16:00';
    });

    const primaryShift = shifts.find((s) => s.id === shiftIds[0]) || shifts[0];
    const shiftHours = primaryShift ? `${primaryShift.startTime} - ${primaryShift.endTime}` : '08:00 - 16:00';
    const shiftName = primaryShift ? primaryShift.name : 'Morning Shift';

    const hodDept = departments.find((d) => d.id === formData.hodDepartmentId);

    const payload: StaffMember = {
      id: editingStaffId || `stf-${Date.now()}`,
      employeeCode: (formData.employeeCode || generateEmployeeCode(formData.role || 'doctor')).toUpperCase().trim(),
      fullName: formData.fullName.trim(),
      role: formData.role || 'doctor',
      designation: formData.designation?.trim() || 'Staff Clinician',
      qualification: formData.qualification?.trim() || '',
      departmentIds: deptIds,
      departmentNames: deptNames,
      departmentId: deptIds[0] || '',
      departmentName: deptNames[0] || '',
      isDepartmentHead: Boolean(formData.isDepartmentHead),
      hodDepartmentId: formData.isDepartmentHead ? formData.hodDepartmentId || deptIds[0] || '' : undefined,
      hodDepartmentName: formData.isDepartmentHead ? hodDept?.name || deptNames[0] || '' : undefined,
      shiftIds: shiftIds,
      shiftNames: shiftNames,
      shiftHoursList: shiftHoursList,
      shiftId: primaryShift ? primaryShift.id : 'shift-morn',
      shiftName,
      shiftHours,
      email: formData.email?.trim() || '',
      phone: formData.phone?.trim() || '',
      status: (formData.status as StaffStatus) || 'ACTIVE',
      gender: formData.gender || 'Male',
      joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
    };

    if (editingStaffId) {
      updateHospitalStaff(payload);
    } else {
      addHospitalStaff(payload);
    }
    setIsModalOpen(false);
  };

  const toggleDepartmentSelection = (deptId: string) => {
    const current = formData.departmentIds || [];
    let updated: string[];
    if (current.includes(deptId)) {
      updated = current.filter((id) => id !== deptId);
    } else {
      updated = [...current, deptId];
    }
    const names = updated.map((id) => departments.find((d) => d.id === id)?.name || id);
    setFormData({
      ...formData,
      departmentIds: updated,
      departmentNames: names,
    });
  };

  const toggleShiftSelection = (shiftId: string) => {
    const current = formData.shiftIds || [];
    let updated: string[];
    if (current.includes(shiftId)) {
      updated = current.filter((id) => id !== shiftId);
    } else {
      updated = [...current, shiftId];
    }
    const names = updated.map((id) => shifts.find((s) => s.id === id)?.name || id);
    const hours = updated.map((id) => {
      const sh = shifts.find((s) => s.id === id);
      return sh ? `${sh.startTime} - ${sh.endTime}` : '';
    });
    setFormData({
      ...formData,
      shiftIds: updated,
      shiftNames: names,
      shiftHoursList: hours,
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'doctor':
        return (
          <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Stethoscope size={12} /> Doctor / Specialist
          </span>
        );
      case 'nurse':
        return (
          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Activity size={12} /> Registered Nurse
          </span>
        );
      case 'technician':
      case 'paramedic':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Users size={12} /> Technician / Paramedic
          </span>
        );
      case 'admin':
        return (
          <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={12} /> Administration
          </span>
        );
      default:
        return <span className="badge badge-secondary">{role}</span>;
    }
  };

  const getStatusBadge = (status: StaffStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
            Active
          </span>
        );
      case 'ON_LEAVE':
        return (
          <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>
            On Leave
          </span>
        );
      case 'SUSPENDED':
        return (
          <span
            className="badge"
            style={{
              fontSize: '0.6875rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fca5a5',
            }}
          >
            Suspended
          </span>
        );
      case 'RESIGNED':
        return (
          <span
            className="badge"
            style={{
              fontSize: '0.6875rem',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              border: '1px solid #cbd5e1',
            }}
          >
            Resigned
          </span>
        );
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      {/* Top Banner & Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem',
          flexWrap: 'wrap',
          gap: '1rem',
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
              <Users size={22} />
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)', margin: 0 }}>
              4. Hospital Staff Master & Clinical Headcount Roster
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Manage staff credentials, multi-department rosters, shift rotations, and department head assignments with live departmental synchronization.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Download Excel Template */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => downloadStaffImportTemplate(departments, shifts)}
            title="Download blank Excel / CSV template with current hospital departments & shifts"
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Download size={14} /> Download Excel Template
          </button>

          {/* Bulk Import Staff */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsBulkImportOpen(true)}
            title="Upload CSV or Excel file to batch import personnel into departments"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              borderColor: 'var(--primary)',
              color: 'var(--primary)',
              backgroundColor: 'rgba(37, 99, 235, 0.05)',
            }}
          >
            <UploadCloud size={14} /> Bulk Import Staff
          </button>

          {/* Restore Defaults */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (window.confirm('Reset Staff roster back to standard hospital defaults?')) {
                saveHospitalStaff(DEFAULT_HOSPITAL_STAFF);
              }
            }}
            title="Reset staff roster"
          >
            <RotateCcw size={14} />
          </button>

          {/* Register Staff Member */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAddModal}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Plus size={16} /> Register Staff Member
          </button>
        </div>
      </div>

      {/* 5 Summary KPI Cards: Total Staff, Doctors, Nurses, Technicians, Administrative Staff */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Total Staff */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1rem',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Staff
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)', marginTop: '0.25rem' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>
            ✓ {stats.active} Active on Roster
          </div>
        </div>

        {/* Doctors */}
        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '10px',
            padding: '1rem',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>
            Doctors
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1d4ed8', marginTop: '0.25rem' }}>
            {stats.doctors}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.25rem' }}>
            Specialists & Consultants
          </div>
        </div>

        {/* Nurses */}
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '1rem',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>
            Nurses
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d', marginTop: '0.25rem' }}>
            {stats.nurses}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem' }}>
            Clinical & Ward Incharges
          </div>
        </div>

        {/* Technicians */}
        <div
          style={{
            backgroundColor: '#faf5ff',
            border: '1px solid #e9d5ff',
            borderRadius: '10px',
            padding: '1rem',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#6b21a8', fontWeight: 600, textTransform: 'uppercase' }}>
            Technicians
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7e22ce', marginTop: '0.25rem' }}>
            {stats.techs}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9333ea', marginTop: '0.25rem' }}>
            Pathology, MRI & OT
          </div>
        </div>

        {/* Administrative Staff */}
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            padding: '1rem',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600, textTransform: 'uppercase' }}>
            Administrative Staff
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b45309', marginTop: '0.25rem' }}>
            {stats.admin}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '0.25rem' }}>
            Admissions, Billing & Records
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          backgroundColor: 'var(--bg-subtle, #f8fafc)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            className="form-input"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Search by staff name, code (DOC-101), designation, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Role Filter */}
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '150px' }}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles & Cadres</option>
          <option value="doctor">Doctors / Specialists</option>
          <option value="nurse">Registered Nurses</option>
          <option value="technician">Technicians</option>
          <option value="paramedic">Paramedics</option>
          <option value="admin">Admin & Records</option>
          <option value="support">Support Staff</option>
        </select>

        {/* Shift Filter */}
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '170px' }}
          value={shiftFilter}
          onChange={(e) => setShiftFilter(e.target.value)}
        >
          <option value="all">All Shift Schedules</option>
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.startTime} - {s.endTime})
            </option>
          ))}
        </select>

        {/* Department Filter */}
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '170px' }}
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="all">All Departments</option>
          <option value="unassigned">Unassigned Staff</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        {/* Enhanced Status Filter: Active, On Leave, Suspended, Resigned */}
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '130px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="RESIGNED">Resigned</option>
        </select>
      </div>

      {/* Staff Roster Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '100px' }}>Staff ID</th>
              <th>Full Name & Credentials</th>
              <th style={{ width: '160px' }}>Role & Cadre</th>
              <th style={{ width: '220px' }}>Departments Assigned</th>
              <th style={{ width: '220px' }}>Assigned Shifts</th>
              <th style={{ width: '180px' }}>Contact Details</th>
              <th style={{ width: '100px' }}>Status</th>
              <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No hospital staff members match the selected filters.
                </td>
              </tr>
            ) : (
              filteredStaff.map((member) => {
                const depts =
                  member.departmentNames && member.departmentNames.length > 0
                    ? member.departmentNames
                    : member.departmentName
                    ? [member.departmentName]
                    : [];

                const shiftList =
                  member.shiftNames && member.shiftNames.length > 0
                    ? member.shiftNames
                    : member.shiftName
                    ? [member.shiftName]
                    : [];

                return (
                  <tr key={member.id}>
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
                          letterSpacing: '0.04em',
                        }}
                      >
                        {member.employeeCode}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            backgroundColor:
                              member.role === 'doctor'
                                ? 'rgba(37, 99, 235, 0.12)'
                                : member.role === 'nurse'
                                ? 'rgba(16, 185, 129, 0.12)'
                                : 'rgba(100, 116, 139, 0.12)',
                            color:
                              member.role === 'doctor'
                                ? '#2563eb'
                                : member.role === 'nurse'
                                ? '#10b981'
                                : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            flexShrink: 0,
                          }}
                        >
                          {member.fullName.replace('Dr. ', '').replace('Nurse ', '').charAt(0)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>{member.fullName}</span>
                            {member.isDepartmentHead && (
                              <span
                                title={`Department Head (HOD) - ${member.hodDepartmentName || 'Department'}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  fontSize: '0.6875rem',
                                  fontWeight: 700,
                                  backgroundColor: '#fef3c7',
                                  color: '#b45309',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                  border: '1px solid #fde68a',
                                }}
                              >
                                <Award size={11} /> HOD
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {member.designation} {member.qualification ? `• ${member.qualification}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{getRoleBadge(member.role)}</td>
                    <td>
                      {depts.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {depts.map((dName, idx) => (
                            <span
                              key={idx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                backgroundColor: '#f0f9ff',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                              }}
                            >
                              <Building2 size={11} /> {dName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          — Floating / Unassigned —
                        </span>
                      )}
                    </td>
                    <td>
                      {shiftList.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {shiftList.map((sName, idx) => (
                            <span
                              key={idx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.6875rem',
                                fontWeight: 500,
                                backgroundColor: '#f8fafc',
                                color: '#334155',
                                border: '1px solid #e2e8f0',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                              }}
                            >
                              <Clock size={11} color="#0284c7" /> {sName.split('(')[0].trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {member.shiftName || 'Morning Shift'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem' }}>
                        {member.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-color)' }}>
                            <Phone size={11} color="var(--text-muted)" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                        {member.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            <Mail size={11} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                              {member.email}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{getStatusBadge(member.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="action-btn"
                          title="Edit Staff Member"
                          onClick={() => handleOpenEditModal(member)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="action-btn text-danger"
                          title="Delete Staff Member"
                          onClick={() => {
                            if (window.confirm(`Remove staff member ${member.fullName} (${member.employeeCode})?`)) {
                              deleteHospitalStaff(member.id);
                            }
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Staff Import Modal */}
      <BulkStaffImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        availableDepartments={departments}
        availableShifts={shifts}
        onImportSuccess={(importedCount) => {
          setStaffList(getHospitalStaff());
        }}
      />

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              width: '94vw',
              maxWidth: '960px',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '1.75rem 2rem',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    color: 'var(--primary)',
                    padding: '0.5rem',
                    borderRadius: '10px',
                    display: 'flex',
                  }}
                >
                  <Users size={20} />
                </span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary)' }}>
                    {editingStaffId ? 'Edit Staff Credentials & Roster' : 'Register New Hospital Staff Member'}
                  </h4>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Configure clinical designation, credentials, multi-department allocation, and shift coverage.
                  </p>
                </div>
              </div>
              <button
                className="action-btn"
                onClick={() => setIsModalOpen(false)}
                title="Close"
                style={{ padding: '0.5rem', borderRadius: '8px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Row 1: Full Name, Role, Employee Code */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={formData.fullName || ''}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Dr. Arthur Pendelton"
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    Role / Cadre
                  </label>
                  <select
                    className="form-select"
                    value={formData.role || 'doctor'}
                    onChange={(e) => {
                      const newRole = e.target.value as StaffRole;
                      setFormData({
                        ...formData,
                        role: newRole,
                        employeeCode: editingStaffId ? formData.employeeCode : generateEmployeeCode(newRole),
                      });
                    }}
                  >
                    <option value="doctor">Doctor / Specialist</option>
                    <option value="nurse">Registered Nurse</option>
                    <option value="technician">Technician</option>
                    <option value="paramedic">Paramedic</option>
                    <option value="admin">Admin & Front Desk</option>
                    <option value="support">Support & Facilities</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    Employee Code <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    className="form-input"
                    value={formData.employeeCode || ''}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. DOC-105"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Designation & Qualifications */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    Designation / Title
                  </label>
                  <input
                    className="form-input"
                    value={formData.designation || ''}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Senior Consultant Neurologist & Critical Care Physician"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    Qualifications / Credentials
                  </label>
                  <input
                    className="form-input"
                    value={formData.qualification || ''}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    placeholder="e.g. MBBS, MD, DM, FRCP"
                  />
                </div>
              </div>

              {/* Multi-Department Assignment */}
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 600, fontSize: '0.8125rem' }}>
                    Assigned Department(s) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Select one or more departments this staff member is stationed at (e.g. OPD, ER, ICU)
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  {departments.map((dept) => {
                    const isSelected = formData.departmentIds?.includes(dept.id);
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => toggleDepartmentSelection(dept.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          border: isSelected ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                          color: isSelected ? '#1d4ed8' : '#334155',
                          boxShadow: isSelected ? '0 1px 2px rgba(37, 99, 235, 0.1)' : 'none',
                        }}
                      >
                        {isSelected ? (
                          <Check size={14} color="#1d4ed8" strokeWidth={2.5} />
                        ) : (
                          <Building2 size={13} color="#94a3b8" />
                        )}
                        {dept.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Department Head (HOD) Assignment */}
              <div
                style={{
                  backgroundColor: '#fefce8',
                  border: '1px solid #fef08a',
                  borderRadius: '10px',
                  padding: '0.875rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.625rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: '#fef3c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#b45309',
                      }}
                    >
                      <Award size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.875rem', color: '#854d0e' }}>
                        Is this staff member a Department Head (HOD)?
                      </strong>
                      <div style={{ fontSize: '0.75rem', color: '#a16207' }}>
                        Department Master automatically displays this appointed head on department profiles and space records.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="isDepartmentHead"
                        checked={Boolean(formData.isDepartmentHead)}
                        onChange={() => setFormData({ ...formData, isDepartmentHead: true })}
                      />
                      Yes
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="isDepartmentHead"
                        checked={!formData.isDepartmentHead}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            isDepartmentHead: false,
                            hodDepartmentId: '',
                            hodDepartmentName: '',
                          })
                        }
                      />
                      No
                    </label>
                  </div>
                </div>

                {formData.isDepartmentHead && (
                  <div style={{ marginTop: '0.25rem', borderTop: '1px dashed #fde68a', paddingTop: '0.625rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#854d0e', marginBottom: '0.35rem' }}>
                      Select Department Governed as Head:
                    </label>
                    <select
                      className="form-select"
                      style={{ fontSize: '0.875rem', backgroundColor: '#ffffff' }}
                      value={formData.hodDepartmentId || ''}
                      onChange={(e) => {
                        const dept = departments.find((d) => d.id === e.target.value);
                        setFormData({
                          ...formData,
                          hodDepartmentId: e.target.value,
                          hodDepartmentName: dept?.name || '',
                        });
                      }}
                      required={formData.isDepartmentHead}
                    >
                      <option value="">— Select Department to Lead —</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Multi-Shift Selection */}
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 600, fontSize: '0.8125rem' }}>
                    Assigned Shift Schedule(s) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Staff can be assigned multiple rotational shift windows
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  {shifts.map((s) => {
                    const isSelected = formData.shiftIds?.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleShiftSelection(s.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          border: isSelected ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                          color: isSelected ? '#0369a1' : '#334155',
                          boxShadow: isSelected ? '0 1px 2px rgba(2, 132, 199, 0.1)' : 'none',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                          {isSelected ? (
                            <Check size={14} color="#0369a1" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                          ) : (
                            <Clock size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                          )}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.name.split('(')[0].trim()}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: isSelected ? '#e0f2fe' : '#f1f5f9',
                            color: isSelected ? '#0369a1' : '#64748b',
                            flexShrink: 0,
                            fontFamily: 'monospace',
                          }}
                        >
                          {s.startTime} - {s.endTime}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 4: Phone, Email, Status (4 Hospital Statuses) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    Phone Contact
                  </label>
                  <input
                    className="form-input"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="doctor@northhospital.com"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    Staff Status
                  </label>
                  <select
                    className="form-select"
                    value={formData.status || 'ACTIVE'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as StaffStatus })}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="RESIGNED">Resigned</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '0.5rem',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1.25rem',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '0.625rem 1.25rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.625rem 1.5rem', fontWeight: 700 }}
                >
                  {editingStaffId ? 'Save Changes' : 'Register Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
