import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  DoorClosed,
  Phone,
  Mail,
  ShieldCheck,
  UserCheck,
  Stethoscope,
  Activity,
  X,
  Check,
  Upload,
  Download,
  Tag,
  Sparkles,
  FileSpreadsheet,
  AlertTriangle,
  Award,
  Calendar,
  Building2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Layers,
} from 'lucide-react';
import { DepartmentWorkspace, DepartmentStaffAssignment, DepartmentRoom } from '../../types';
import {
  getDepartmentStaffAssignments,
  getDepartmentRooms,
} from './departmentWorkspaceStore';
import {
  getHospitalStaff,
  getHospitalShifts,
  StaffMember,
  addHospitalStaff,
  updateHospitalStaff,
  deleteHospitalStaff,
  unassignStaffFromDepartment,
  bulkAddHospitalStaff,
  HospitalShift,
} from '../admin/setup/organization/hospitalStaffStore';

export interface CadreGroupConfig {
  role: 'doctor' | 'nurse' | 'receptionist' | 'technician' | 'assistant' | 'supervisor';
  label: string;
  singular: string;
  plural: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  color: string;
  bgColor: string;
  badgeBg: string;
  badgeColor: string;
  borderColor: string;
  description: string;
}

export const CADRE_HIERARCHY: CadreGroupConfig[] = [
  {
    role: 'doctor',
    label: 'Doctors & Clinical Consultants',
    singular: 'Doctor',
    plural: 'Doctors',
    icon: Stethoscope,
    color: '#0284c7',
    bgColor: '#f0f9ff',
    badgeBg: '#e0f2fe',
    badgeColor: '#0369a1',
    borderColor: '#bae6fd',
    description: 'Senior Consultants, Attending Physicians, Specialists & Resident Medical Officers',
  },
  {
    role: 'nurse',
    label: 'Nursing & Patient Care Team',
    singular: 'Nurse',
    plural: 'Nurses',
    icon: Activity,
    color: '#059669',
    bgColor: '#f0fdf4',
    badgeBg: '#dcfce7',
    badgeColor: '#15803d',
    borderColor: '#bbf7d0',
    description: 'Head Nurses, Charge Sisters, Staff Nurses, Triage & Ward Caregivers',
  },
  {
    role: 'receptionist',
    label: 'Reception & Patient Front Desk',
    singular: 'Receptionist',
    plural: 'Receptionists',
    icon: UserCheck,
    color: '#d97706',
    bgColor: '#fffbeb',
    badgeBg: '#fef3c7',
    badgeColor: '#b45309',
    borderColor: '#fde68a',
    description: 'Front Desk Officers, Token Dispatchers, Intake Registrars & Queue Clerks',
  },
  {
    role: 'technician',
    label: 'Diagnostic & Medical Technicians',
    singular: 'Technician',
    plural: 'Technicians',
    icon: Users,
    color: '#7c3aed',
    bgColor: '#faf5ff',
    badgeBg: '#f3e8ff',
    badgeColor: '#6b21a8',
    borderColor: '#e9d5ff',
    description: 'Lab Technicians, Radiology Specialists, Pathology & Biomedical Operators',
  },
  {
    role: 'assistant',
    label: 'Clinical Assistants & Support Staff',
    singular: 'Assistant',
    plural: 'Assistants',
    icon: Users,
    color: '#0d9488',
    bgColor: '#f0fdfa',
    badgeBg: '#ccfbf1',
    badgeColor: '#0f766e',
    borderColor: '#99f6e4',
    description: 'OPD Attendants, Stretcher Bearers, Clinical Aides & Orderlies',
  },
  {
    role: 'supervisor',
    label: 'Department Supervisors & Administration',
    singular: 'Supervisor',
    plural: 'Supervisors',
    icon: ShieldCheck,
    color: '#dc2626',
    bgColor: '#fef2f2',
    badgeBg: '#fee2e2',
    badgeColor: '#991b1b',
    borderColor: '#fecaca',
    description: 'Department Floor In-Charges, Operations Coordinators & Unit Leads',
  },
];

export const normalizeRoleKey = (
  role: string
): 'doctor' | 'nurse' | 'receptionist' | 'technician' | 'assistant' | 'supervisor' => {
  const r = (role || '').toLowerCase();
  if (r === 'doctor') return 'doctor';
  if (r === 'nurse') return 'nurse';
  if (r === 'receptionist') return 'receptionist';
  if (r === 'technician') return 'technician';
  if (r === 'supervisor' || r === 'admin') return 'supervisor';
  return 'assistant';
};

interface Props {
  workspace: DepartmentWorkspace;
}

export const DepartmentStaffManagement: React.FC<Props> = ({ workspace }) => {
  const [staff, setStaff] = useState<DepartmentStaffAssignment[]>(() =>
    getDepartmentStaffAssignments(workspace.departmentId)
  );
  const [rooms, setRooms] = useState<DepartmentRoom[]>(() =>
    getDepartmentRooms(workspace.departmentId)
  );
  const [shifts, setShifts] = useState<HospitalShift[]>(() => getHospitalShifts());
  const [hospitalStaffPool, setHospitalStaffPool] = useState<StaffMember[]>(() => getHospitalStaff());

  const [subTab, setSubTab] = useState<'roster' | 'designations'>('roster');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Collapsible Cadre Hierarchy State
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({
    doctor: true,
    nurse: true,
    receptionist: true,
    technician: true,
    assistant: true,
    supervisor: true,
  });

  const toggleRole = (roleKey: string) => {
    setExpandedRoles((prev) => ({
      ...prev,
      [roleKey]: !prev[roleKey],
    }));
  };

  const expandAllRoles = () => {
    setExpandedRoles({
      doctor: true,
      nurse: true,
      receptionist: true,
      technician: true,
      assistant: true,
      supervisor: true,
    });
  };

  const collapseAllRoles = () => {
    setExpandedRoles({
      doctor: false,
      nurse: false,
      receptionist: false,
      technician: false,
      assistant: false,
      supervisor: false,
    });
  };

  // Modal State for Add/Edit Staff
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'personal' | 'professional' | 'stationing'>('personal');
  const [editingStaff, setEditingStaff] = useState<DepartmentStaffAssignment | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  // 1. Basic & Personal Details
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'RESIGNED'>('ACTIVE');

  // 2. Contact Details
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // 3. Role & Professional Credentials
  const [assignedRole, setAssignedRole] = useState<'doctor' | 'nurse' | 'receptionist' | 'technician' | 'assistant' | 'supervisor'>('doctor');
  const [designation, setDesignation] = useState('Senior Consultant');
  const [qualification, setQualification] = useState('MBBS, MD');
  const [specialization, setSpecialization] = useState('Cardiology');
  const [licenseNumber, setLicenseNumber] = useState('');

  // 4. Deployment & Stationing
  const [assignedShiftId, setAssignedShiftId] = useState('');
  const [assignedRoomId, setAssignedRoomId] = useState('');
  const [isDepartmentHead, setIsDepartmentHead] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<DepartmentStaffAssignment | null>(null);

  // Bulk Upload Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);

  const reload = () => {
    setStaff(getDepartmentStaffAssignments(workspace.departmentId));
    setRooms(getDepartmentRooms(workspace.departmentId));
    setShifts(getHospitalShifts());
    setHospitalStaffPool(getHospitalStaff());
  };

  useEffect(() => {
    reload();
  }, [workspace.departmentId]);

  const generateEmployeeCode = (role: string) => {
    const prefix =
      role === 'doctor' ? 'DOC' :
      role === 'nurse' ? 'NUR' :
      role === 'receptionist' ? 'REC' :
      role === 'technician' ? 'TECH' :
      role === 'assistant' ? 'AST' : 'SUP';
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${rand}`;
  };

  const getDesignationSuggestions = (role: string) => {
    switch (role) {
      case 'doctor':
        return ['Senior Consultant', 'Consultant', 'Associate Consultant', 'Junior Resident', 'Attending Physician'];
      case 'nurse':
        return ['Head Nurse', 'Staff Nurse', 'Charge Sister', 'Triage Nurse', 'Observation Sister'];
      case 'receptionist':
        return ['Lead Receptionist', 'Front Desk Coordinator', 'Token Dispatcher', 'Queue Clerk'];
      case 'technician':
        return ['Senior Technician', 'Medical Lab Tech', 'ECG Specialist', 'Biomedical Tech'];
      case 'supervisor':
        return ['Clinical Supervisor', 'Floor In-Charge', 'Deputy Nursing Supt'];
      default:
        return ['Healthcare Assistant', 'Floor Attendant', 'Support Assistant'];
    }
  };

  const handleRoleChange = (newRole: any) => {
    setAssignedRole(newRole);
    if (!editingStaff) {
      setEmployeeCode(generateEmployeeCode(newRole));
      const suggestions = getDesignationSuggestions(newRole);
      setDesignation(suggestions[0] || 'Staff Member');
      if (newRole === 'doctor') {
        setQualification('MBBS, MD');
        setSpecialization('Cardiology');
      } else if (newRole === 'nurse') {
        setQualification('B.Sc. Nursing');
        setSpecialization('Triage & Critical Care');
      } else if (newRole === 'technician') {
        setQualification('B.Sc. MLT / DMLT');
        setSpecialization('Biochemical Diagnostics');
      } else if (newRole === 'receptionist') {
        setQualification('Graduate');
        setSpecialization('Front Desk Operations');
      } else {
        setQualification('Diploma / High School');
        setSpecialization('Patient Care Support');
      }
    }
  };

  const handleUpdateDesignation = (staffId: string, newDesignation: string) => {
    const existing = hospitalStaffPool.find((s) => s.id === staffId);
    if (existing) {
      const updated: StaffMember = {
        ...existing,
        designation: newDesignation,
      };
      updateHospitalStaff(updated);
      reload();
    }
  };

  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      if (roleFilter !== 'all' && s.role !== roleFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.employeeCode.toLowerCase().includes(q) ||
          s.designation.toLowerCase().includes(q) ||
          (s.email && s.email.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [staff, roleFilter, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = staff.length;
    const active = staff.filter((s) => s.status === 'ACTIVE').length;
    const doctors = staff.filter((s) => s.role === 'doctor').length;
    const nurses = staff.filter((s) => s.role === 'nurse').length;
    const receptionists = staff.filter((s) => s.role === 'receptionist').length;
    const techs = staff.filter((s) => s.role === 'technician').length;
    return { total, active, doctors, nurses, receptionists, techs };
  }, [staff]);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setSelectedStaffId('');
    setFullName('');
    setAssignedRole('doctor');
    setEmployeeCode(generateEmployeeCode('doctor'));
    setGender('Male');
    setJoiningDate(new Date().toISOString().slice(0, 10));
    setStatus('ACTIVE');
    setPhone('+91 98');
    setEmail('');
    setEmergencyContact('');
    setDesignation('Senior Consultant');
    setQualification('MBBS, MD');
    setSpecialization('Cardiology');
    setLicenseNumber('');
    setAssignedShiftId(shifts[0]?.id || 'shift-morn');
    setAssignedRoomId(rooms[0]?.id || '');
    setIsDepartmentHead(false);
    setModalTab('personal');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (assignment: DepartmentStaffAssignment) => {
    setEditingStaff(assignment);
    const existing = hospitalStaffPool.find(
      (s) => s.id === assignment.staffId || s.employeeCode === assignment.employeeCode
    );

    setSelectedStaffId(assignment.staffId);
    setFullName(assignment.fullName);
    setEmployeeCode(assignment.employeeCode);
    setGender(existing?.gender || assignment.gender || 'Male');
    setJoiningDate(existing?.joiningDate || assignment.joiningDate || new Date().toISOString().slice(0, 10));
    setStatus(assignment.status);
    setPhone(assignment.phone || existing?.phone || '');
    setEmail(assignment.email || existing?.email || '');
    setEmergencyContact(existing?.emergencyContact || assignment.emergencyContact || '');
    setAssignedRole(assignment.role);
    setDesignation(assignment.designation);
    setQualification(existing?.qualification || assignment.qualification || '');
    setSpecialization(existing?.specialization || assignment.specialization || '');
    setLicenseNumber(existing?.licenseNumber || assignment.licenseNumber || '');
    setAssignedShiftId(assignment.shiftId);
    setAssignedRoomId(assignment.assignedRoomId || '');
    setIsDepartmentHead(existing?.isDepartmentHead || assignment.isDepartmentHead || false);
    setModalTab('personal');
    setIsModalOpen(true);
  };

  const handleSelectExistingStaff = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedStaffId(id);
    const found = hospitalStaffPool.find((s) => s.id === id);
    if (found) {
      setFullName(found.fullName);
      setEmployeeCode(found.employeeCode);
      setAssignedRole((found.role === 'admin' ? 'receptionist' : found.role) as any);
      setDesignation(found.designation);
      setPhone(found.phone || '');
      setEmail(found.email || '');
      setEmergencyContact(found.emergencyContact || '');
      setQualification(found.qualification || '');
      setSpecialization(found.specialization || '');
      setLicenseNumber(found.licenseNumber || '');
      setGender(found.gender || 'Male');
      setStatus(found.status);
      setJoiningDate(found.joiningDate || new Date().toISOString().slice(0, 10));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !employeeCode.trim()) {
      alert('Please fill out Full Name and Employee Code.');
      return;
    }

    const selectedShift = shifts.find((s) => s.id === assignedShiftId) || shifts[0];

    // Maintain single source of truth in HospitalStaffStore
    const staffId = selectedStaffId || editingStaff?.staffId || `stf-${Date.now()}`;
    const existingMember = hospitalStaffPool.find((s) => s.id === staffId);

    const currentDeptIds = existingMember?.departmentIds || [workspace.departmentId];
    const newDeptIds = Array.from(new Set([...currentDeptIds, workspace.departmentId]));

    const currentDeptNames = existingMember?.departmentNames || [workspace.departmentName];
    const newDeptNames = Array.from(new Set([...currentDeptNames, workspace.departmentName]));

    const staffPayload: StaffMember = {
      id: staffId,
      employeeCode: employeeCode.toUpperCase().trim(),
      fullName: fullName.trim(),
      role: (assignedRole === 'receptionist' ? 'admin' : assignedRole === 'supervisor' ? 'admin' : assignedRole) as any,
      designation: designation.trim() || existingMember?.designation || `${assignedRole.toUpperCase()} - ${workspace.shortName}`,
      qualification: qualification.trim(),
      specialization: specialization.trim(),
      licenseNumber: licenseNumber.trim(),
      emergencyContact: emergencyContact.trim(),
      gender,
      joiningDate,
      departmentIds: newDeptIds,
      departmentNames: newDeptNames,
      departmentId: workspace.departmentId,
      departmentName: workspace.departmentName,
      isDepartmentHead,
      hodDepartmentId: isDepartmentHead ? workspace.departmentId : undefined,
      hodDepartmentName: isDepartmentHead ? workspace.departmentName : undefined,
      shiftIds: [selectedShift?.id || 'shift-morn'],
      shiftNames: [selectedShift?.name || 'Morning Shift'],
      shiftHoursList: [`${selectedShift?.startTime || '08:00'} - ${selectedShift?.endTime || '16:00'}`],
      shiftId: selectedShift?.id || 'shift-morn',
      shiftName: selectedShift?.name || 'Morning Shift',
      shiftHours: `${selectedShift?.startTime || '08:00'} - ${selectedShift?.endTime || '16:00'}`,
      email: email.trim(),
      phone: phone.trim(),
      status,
    };

    if (existingMember || editingStaff) {
      updateHospitalStaff(staffPayload);
    } else {
      addHospitalStaff(staffPayload);
    }

    setIsModalOpen(false);
    reload();
  };

  // Delete modal triggers
  const handleOpenDelete = (member: DepartmentStaffAssignment) => {
    setStaffToDelete(member);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmUnassign = () => {
    if (!staffToDelete) return;
    unassignStaffFromDepartment(staffToDelete.staffId, workspace.departmentId);
    setIsDeleteModalOpen(false);
    setStaffToDelete(null);
    reload();
  };

  const handleConfirmDeletePermanently = () => {
    if (!staffToDelete) return;
    deleteHospitalStaff(staffToDelete.staffId);
    setIsDeleteModalOpen(false);
    setStaffToDelete(null);
    reload();
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'Employee Code,Full Name,Role,Designation,Shift,Phone,Email\n' +
      `DOC-201,Dr. Rajesh Kumar,doctor,Senior Consultant,Morning Shift,+91 98765 11111,rajesh@northhospital.com\n` +
      `NUR-301,Sister Anjali Roy,nurse,Staff Nurse,Morning Shift,+91 98765 22222,anjali@northhospital.com\n` +
      `REC-102,Rohit Verma,receptionist,Front Desk Coordinator,Evening Shift,+91 98765 33333,rohit@northhospital.com\n` +
      `TECH-104,Amitabh Sen,technician,Senior Technician,Morning Shift,+91 98765 44444,amitabh@northhospital.com\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${workspace.shortName}_Staff_Import_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError(null);
    setBulkSuccess(null);
    if (!bulkInputText.trim()) {
      setBulkError('Please paste CSV records or download the template first.');
      return;
    }

    const lines = bulkInputText.trim().split('\n');
    const validMembers: StaffMember[] = [];
    const header = lines[0].toLowerCase();
    const dataLines = header.includes('employee') || header.includes('code') ? lines.slice(1) : lines;

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;
      const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 2) continue;

      const code = parts[0];
      const name = parts[1];
      const roleStr = (parts[2] || 'nurse').toLowerCase();
      const desig = parts[3] || 'Staff Member';
      const shiftStr = parts[4] || 'Morning Shift';
      const phoneVal = parts[5] || '';
      const emailVal = parts[6] || '';

      const matchedShift = shifts.find((s) => s.name.toLowerCase().includes(shiftStr.toLowerCase())) || shifts[0];
      const roleMapped: any = ['doctor', 'nurse', 'receptionist', 'technician', 'assistant', 'supervisor'].includes(roleStr)
        ? roleStr === 'receptionist' || roleStr === 'supervisor' ? 'admin' : roleStr
        : 'nurse';

      validMembers.push({
        id: `stf-bulk-${Date.now()}-${i}`,
        employeeCode: code.toUpperCase(),
        fullName: name,
        role: roleMapped,
        designation: desig,
        departmentIds: [workspace.departmentId],
        departmentNames: [workspace.departmentName],
        departmentId: workspace.departmentId,
        departmentName: workspace.departmentName,
        shiftIds: [matchedShift?.id || 'shift-morn'],
        shiftNames: [matchedShift?.name || 'Morning Shift'],
        shiftHoursList: [`${matchedShift?.startTime || '08:00'} - ${matchedShift?.endTime || '16:00'}`],
        shiftId: matchedShift?.id || 'shift-morn',
        shiftName: matchedShift?.name || 'Morning Shift',
        shiftHours: `${matchedShift?.startTime || '08:00'} - ${matchedShift?.endTime || '16:00'}`,
        phone: phoneVal,
        email: emailVal,
        status: 'ACTIVE',
        joiningDate: new Date().toISOString().slice(0, 10),
      });
    }

    if (validMembers.length === 0) {
      setBulkError('No valid staff records found. Please check comma-separated columns.');
      return;
    }

    bulkAddHospitalStaff(validMembers);
    setBulkSuccess(`✓ Successfully imported ${validMembers.length} staff records to ${workspace.departmentName}!`);
    setBulkInputText('');
    reload();
    setTimeout(() => {
      setIsBulkModalOpen(false);
      setBulkSuccess(null);
    }, 1500);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'doctor':
        return (
          <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Stethoscope size={12} /> Doctor
          </span>
        );
      case 'nurse':
        return (
          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Activity size={12} /> Nurse
          </span>
        );
      case 'receptionist':
        return (
          <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <UserCheck size={12} /> Receptionist
          </span>
        );
      case 'technician':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Users size={12} /> Technician
          </span>
        );
      case 'supervisor':
        return (
          <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={12} /> Supervisor
          </span>
        );
      default:
        return <span className="badge badge-secondary">{role}</span>;
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
                backgroundColor: 'rgba(2, 132, 199, 0.1)',
                color: '#0284c7',
                padding: '0.375rem',
                borderRadius: '8px',
                display: 'flex',
              }}
            >
              <Users size={22} />
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>
              {workspace.shortName} Staff Pool & Roster Management
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Add, update, and deploy doctors, nurses, receptionists, technicians, assistants, and supervisors to {workspace.departmentName}.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDownloadTemplate}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
          >
            <Download size={15} /> Download Template
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setBulkError(null);
              setBulkSuccess(null);
              setIsBulkModalOpen(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
          >
            <Upload size={15} /> Bulk Upload Staff
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAdd}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 700 }}
          >
            <Plus size={16} /> Add New Staff Member
          </button>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.25rem' }}>
        <button
          type="button"
          onClick={() => setSubTab('roster')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px 8px 0 0',
            fontWeight: 700,
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: subTab === 'roster' ? '#0284c7' : '#f1f5f9',
            color: subTab === 'roster' ? '#ffffff' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Users size={16} /> 1. Staff Roster & Stationing ({staff.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('designations')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px 8px 0 0',
            fontWeight: 700,
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: subTab === 'designations' ? '#0284c7' : '#f1f5f9',
            color: subTab === 'designations' ? '#ffffff' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Tag size={16} /> 2. Step 3: Designation Mapping
        </button>
      </div>

      {subTab === 'roster' ? (
        <>
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
                Total Staff Pool
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--secondary)', marginTop: '0.25rem' }}>
                {stats.total}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.2rem' }}>
                ✓ {stats.active} Active on duty
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af', textTransform: 'uppercase' }}>
                Doctors
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1d4ed8', marginTop: '0.25rem' }}>
                {stats.doctors}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.2rem' }}>
                Consultants & Specialists
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>
                Nurses & Assistants
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#15803d', marginTop: '0.25rem' }}>
                {stats.nurses}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.2rem' }}>
                Triage & Care Staff
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9a3412', textTransform: 'uppercase' }}>
                Reception & Queue
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#c2410c', marginTop: '0.25rem' }}>
                {stats.receptionists}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#ea580c', marginTop: '0.2rem' }}>
                Token & Intake Desks
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#faf5ff', border: '1px solid #e9d5ff' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b21a8', textTransform: 'uppercase' }}>
                Diagnostic Techs
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#7e22ce', marginTop: '0.25rem' }}>
                {stats.techs}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9333ea', marginTop: '0.2rem' }}>
                Specialized Techs
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
                placeholder="Search by staff name, employee code, designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select className="form-select" style={{ width: 'auto' }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All Department Roles</option>
              <option value="doctor">Doctors</option>
              <option value="nurse">Nurses</option>
              <option value="receptionist">Receptionists</option>
              <option value="technician">Technicians</option>
              <option value="assistant">Assistants</option>
              <option value="supervisor">Supervisors</option>
            </select>

            <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="RESIGNED">Resigned</option>
            </select>

            {/* Expand / Collapse Controls */}
            <div style={{ display: 'flex', gap: '0.375rem', marginLeft: 'auto' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={expandAllRoles}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#ffffff' }}
                title="Expand all role groups"
              >
                <ChevronDown size={14} /> Expand All
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={collapseAllRoles}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#ffffff' }}
                title="Collapse all role groups"
              >
                <ChevronUp size={14} /> Collapse All
              </button>
            </div>
          </div>

          {/* Staff Roster Table with Hierarchical Collapsible Cadre Rows */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Staff ID</th>
                  <th>Personnel & Designation</th>
                  <th style={{ width: '140px' }}>Assigned Role</th>
                  <th style={{ width: '180px' }}>Shift Window</th>
                  <th style={{ width: '180px' }}>Stationed Room</th>
                  <th style={{ width: '180px' }}>Contact</th>
                  <th style={{ width: '90px' }}>Status</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No staff members match the selected filters for {workspace.shortName}. Click <strong>"+ Add New Staff Member"</strong> to register personnel.
                    </td>
                  </tr>
                ) : (
                  CADRE_HIERARCHY.map((cadre) => {
                    const cadreMembers = filteredStaff.filter(
                      (m) => normalizeRoleKey(m.role) === cadre.role
                    );

                    // If a specific role filter is chosen and does not match this cadre, skip
                    if (roleFilter !== 'all' && roleFilter !== cadre.role) return null;
                    // If user is searching and no members in this cadre match, skip
                    if (searchQuery.trim() && cadreMembers.length === 0) return null;

                    const isExpanded = expandedRoles[cadre.role] ?? true;
                    const CadreIcon = cadre.icon;

                    return (
                      <React.Fragment key={cadre.role}>
                        {/* Collapsible Cadre Header Row */}
                        <tr
                          onClick={() => toggleRole(cadre.role)}
                          style={{
                            backgroundColor: cadre.bgColor,
                            borderTop: `2px solid ${cadre.borderColor}`,
                            borderBottom: isExpanded ? `1px solid ${cadre.borderColor}` : `2px solid ${cadre.borderColor}`,
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                          className="cadre-header-row"
                        >
                          <td colSpan={8} style={{ padding: '0.625rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    backgroundColor: cadre.badgeBg,
                                    color: cadre.color,
                                    transition: 'transform 0.15s ease',
                                  }}
                                >
                                  {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                </span>

                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.45rem',
                                    fontWeight: 800,
                                    fontSize: '0.9375rem',
                                    color: cadre.color,
                                  }}
                                >
                                  <CadreIcon size={17} />
                                  <span>{cadre.label}</span>
                                </span>

                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    padding: '0.125rem 0.55rem',
                                    borderRadius: '999px',
                                    backgroundColor: cadre.badgeBg,
                                    color: cadre.badgeColor,
                                    border: `1px solid ${cadre.borderColor}`,
                                  }}
                                >
                                  {cadreMembers.length} {cadreMembers.length === 1 ? cadre.singular : cadre.plural}
                                </span>

                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  • {cadre.description}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: cadre.color }}>
                                  {isExpanded ? 'Click to collapse ▲' : 'Click to expand ▼'}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Cadre Children Rows */}
                        {isExpanded && (
                          cadreMembers.length === 0 ? (
                            <tr>
                              <td
                                colSpan={8}
                                style={{
                                  padding: '0.875rem 1.5rem',
                                  color: 'var(--text-muted)',
                                  fontStyle: 'italic',
                                  fontSize: '0.8125rem',
                                  borderLeft: `4px solid ${cadre.borderColor}`,
                                  backgroundColor: '#fafafa',
                                }}
                              >
                                No {cadre.plural.toLowerCase()} currently stationed in {workspace.shortName}. Click <strong>"+ Add New Staff Member"</strong> to register personnel.
                              </td>
                            </tr>
                          ) : (
                            cadreMembers.map((member) => (
                              <tr key={member.id} style={{ borderLeft: `4px solid ${cadre.color}` }}>
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
                                        backgroundColor: cadre.badgeBg,
                                        color: cadre.color,
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
                                      <div style={{ fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <span>{member.fullName}</span>
                                        {member.isDepartmentHead && (
                                          <span className="badge badge-warning" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
                                            HOD
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
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', color: '#0369a1', fontWeight: 600 }}>
                                    <Clock size={12} color="#0284c7" />
                                    <span>{member.shiftName.split('(')[0].trim()}</span>
                                  </div>
                                </td>
                                <td>
                                  {member.assignedRoomName ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', color: '#334155', fontWeight: 600 }}>
                                      <DoorClosed size={12} color="#ea580c" />
                                      <span>{member.assignedRoomName.split('-')[0].trim()}</span>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>— General Area —</span>
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
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{member.email}</span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span
                                    className={`badge ${
                                      member.status === 'ACTIVE'
                                        ? 'badge-success'
                                        : member.status === 'ON_LEAVE'
                                        ? 'badge-warning'
                                        : 'badge-secondary'
                                    }`}
                                    style={{ fontSize: '0.6875rem' }}
                                  >
                                    {member.status === 'ACTIVE' ? 'Active' : member.status === 'ON_LEAVE' ? 'On Leave' : member.status}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      className="action-btn"
                                      onClick={() => handleOpenEdit(member)}
                                      title="Edit Staff Member"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className="action-btn"
                                      onClick={() => handleOpenDelete(member)}
                                      title="Delete or Remove Staff Member"
                                      style={{ color: '#ef4444' }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Step 3: Designation Mapping Matrix */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: '#dbeafe', color: '#1d4ed8', display: 'flex' }}>
                <Tag size={20} />
              </span>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#1e3a8a' }}>
                  Step 3: Department Designation Mapping
                </h4>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: '#3b82f6' }}>
                  Define specific clinical designations for department personnel (e.g., Dr. Sarah → Senior Consultant, Dr. Michael → Consultant, Priya → Head Nurse, Rahul → Staff Nurse).
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-info" style={{ fontWeight: 700, padding: '0.35rem 0.65rem' }}>
                {staff.length} Members in Roster
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={expandAllRoles}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#ffffff' }}
                title="Expand all role groups"
              >
                <ChevronDown size={14} /> Expand All
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={collapseAllRoles}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#ffffff' }}
                title="Collapse all role groups"
              >
                <ChevronUp size={14} /> Collapse All
              </button>
            </div>
          </div>

          {/* Designation Mapping Table with Hierarchical Collapsible Cadre Rows */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Code</th>
                  <th>Staff Member</th>
                  <th style={{ width: '130px' }}>Role</th>
                  <th style={{ width: '260px' }}>Current Designation</th>
                  <th>Quick Assign Designation Presets</th>
                </tr>
              </thead>
              <tbody>
                {CADRE_HIERARCHY.map((cadre) => {
                  const cadreMembers = staff.filter(
                    (m) => normalizeRoleKey(m.role) === cadre.role
                  );

                  const isExpanded = expandedRoles[cadre.role] ?? true;
                  const CadreIcon = cadre.icon;

                  return (
                    <React.Fragment key={cadre.role}>
                      {/* Collapsible Cadre Header Row */}
                      <tr
                        onClick={() => toggleRole(cadre.role)}
                        style={{
                          backgroundColor: cadre.bgColor,
                          borderTop: `2px solid ${cadre.borderColor}`,
                          borderBottom: isExpanded ? `1px solid ${cadre.borderColor}` : `2px solid ${cadre.borderColor}`,
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        className="cadre-header-row"
                      >
                        <td colSpan={5} style={{ padding: '0.625rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '6px',
                                  backgroundColor: cadre.badgeBg,
                                  color: cadre.color,
                                  transition: 'transform 0.15s ease',
                                }}
                              >
                                {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                              </span>

                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.45rem',
                                  fontWeight: 800,
                                  fontSize: '0.9375rem',
                                  color: cadre.color,
                                }}
                              >
                                <CadreIcon size={17} />
                                <span>{cadre.label}</span>
                              </span>

                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  padding: '0.125rem 0.55rem',
                                  borderRadius: '999px',
                                  backgroundColor: cadre.badgeBg,
                                  color: cadre.badgeColor,
                                  border: `1px solid ${cadre.borderColor}`,
                                }}
                              >
                                {cadreMembers.length} {cadreMembers.length === 1 ? cadre.singular : cadre.plural}
                              </span>

                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                • {cadre.description}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: cadre.color }}>
                                {isExpanded ? 'Click to collapse ▲' : 'Click to expand ▼'}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Cadre Children Rows */}
                      {isExpanded && (
                        cadreMembers.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              style={{
                                padding: '0.875rem 1.5rem',
                                color: 'var(--text-muted)',
                                fontStyle: 'italic',
                                fontSize: '0.8125rem',
                                borderLeft: `4px solid ${cadre.borderColor}`,
                                backgroundColor: '#fafafa',
                              }}
                            >
                              No {cadre.plural.toLowerCase()} currently assigned to {workspace.shortName}. Click <strong>"+ Add New Staff Member"</strong> to register {cadre.singular.toLowerCase()}s.
                            </td>
                          </tr>
                        ) : (
                          cadreMembers.map((member) => {
                            const suggestions = getDesignationSuggestions(member.role);
                            return (
                              <tr key={member.id} style={{ borderLeft: `4px solid ${cadre.color}` }}>
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
                                    {member.employeeCode}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{member.fullName}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {member.email || 'No email registered'}
                                  </div>
                                </td>
                                <td>{getRoleBadge(member.role)}</td>
                                <td>
                                  <input
                                    className="form-input"
                                    style={{ fontSize: '0.8125rem', fontWeight: 600 }}
                                    value={member.designation}
                                    onChange={(e) => handleUpdateDesignation(member.staffId, e.target.value)}
                                  />
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                                    {suggestions.map((preset) => (
                                      <button
                                        key={preset}
                                        type="button"
                                        onClick={() => handleUpdateDesignation(member.staffId, preset)}
                                        style={{
                                          fontSize: '0.7188rem',
                                          padding: '0.25rem 0.6rem',
                                          borderRadius: '6px',
                                          border: member.designation === preset ? '1px solid #0284c7' : '1px solid #cbd5e1',
                                          backgroundColor: member.designation === preset ? '#e0f2fe' : '#ffffff',
                                          color: member.designation === preset ? '#0369a1' : '#475569',
                                          fontWeight: member.designation === preset ? 700 : 500,
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.25rem',
                                        }}
                                      >
                                        {member.designation === preset && <Check size={12} color="#0284c7" />}
                                        {preset}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comprehensive Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              width: '90vw',
              maxWidth: '780px',
              padding: '1.75rem',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', padding: '0.375rem', borderRadius: '8px', display: 'flex' }}>
                  <Users size={20} />
                </span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    {editingStaff ? `Update ${editingStaff.fullName} Details` : `Register New Staff to ${workspace.shortName}`}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Complete personnel profile, clinical cadre, contact details, and chamber stationing.
                  </p>
                </div>
              </div>
              <button className="action-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Optional Existing Pool Picker when adding new */}
            {!editingStaff && (
              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Fast Option: Populate from Existing Hospital Staff Pool</span>
                  <span style={{ fontSize: '0.6875rem', color: '#0284c7' }}>Optional</span>
                </label>
                <select className="form-select" value={selectedStaffId} onChange={handleSelectExistingStaff}>
                  <option value="">— Or Fill New Staff Details Below —</option>
                  {hospitalStaffPool.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.employeeCode} • {s.designation})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Modal Internal Section Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setModalTab('personal')}
                style={{
                  padding: '0.4rem 0.875rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: modalTab === 'personal' ? '#0284c7' : '#f1f5f9',
                  color: modalTab === 'personal' ? '#ffffff' : '#64748b',
                }}
              >
                1. Personal & Contact
              </button>
              <button
                type="button"
                onClick={() => setModalTab('professional')}
                style={{
                  padding: '0.4rem 0.875rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: modalTab === 'professional' ? '#0284c7' : '#f1f5f9',
                  color: modalTab === 'professional' ? '#ffffff' : '#64748b',
                }}
              >
                2. Role & Credentials
              </button>
              <button
                type="button"
                onClick={() => setModalTab('stationing')}
                style={{
                  padding: '0.4rem 0.875rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: modalTab === 'stationing' ? '#0284c7' : '#f1f5f9',
                  color: modalTab === 'stationing' ? '#ffffff' : '#64748b',
                }}
              >
                3. Deployment & Stationing
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* SECTION 1: PERSONAL & CONTACT */}
              {modalTab === 'personal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr', gap: '0.875rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Full Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        className="form-input"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Dr. Arthur Pendelton"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                          Employee Code <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setEmployeeCode(generateEmployeeCode(assignedRole))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0284c7',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          <RefreshCw size={10} /> Auto-Generate
                        </button>
                      </div>
                      <input
                        className="form-input"
                        value={employeeCode}
                        onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                        placeholder="e.g. DOC-301"
                        required
                        style={{ marginTop: '0.25rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Gender
                      </label>
                      <select
                        className="form-select"
                        value={gender}
                        onChange={(e) => setGender(e.target.value as any)}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Date of Joining
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={joiningDate}
                        onChange={(e) => setJoiningDate(e.target.value)}
                      />
                    </div>

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
                        <option value="SUSPENDED">Suspended</option>
                        <option value="RESIGNED">Resigned</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Primary Phone Contact <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        className="form-input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 00000"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Email Address <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        className="form-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="doctor@northhospital.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Emergency Contact (Name & Phone)
                    </label>
                    <input
                      className="form-input"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder="e.g. Spouse: +91 98111 22222"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 2: ROLE & PROFESSIONAL CREDENTIALS */}
              {modalTab === 'professional' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '0.875rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Cadre / Department Role <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        className="form-select"
                        value={assignedRole}
                        onChange={(e) => handleRoleChange(e.target.value)}
                      >
                        <option value="doctor">Doctor (Physician / Consultant)</option>
                        <option value="nurse">Nurse (Sister / Care Nurse)</option>
                        <option value="receptionist">Receptionist (Front Desk / Queue)</option>
                        <option value="technician">Technician (Diagnostic / Lab / ECG)</option>
                        <option value="assistant">Assistant (Healthcare Attendant / Ward Boy)</option>
                        <option value="supervisor">Supervisor (Floor In-Charge / Supt)</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Designation <span style={{ color: '#ef4444' }}>*</span></span>
                        <span style={{ fontSize: '0.6875rem', color: '#0284c7' }}>Presets for {assignedRole}</span>
                      </label>
                      <input
                        className="form-input"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="e.g. Senior Consultant"
                        required
                      />
                    </div>
                  </div>

                  {/* Suggestion Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '-0.35rem' }}>
                    {getDesignationSuggestions(assignedRole).map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setDesignation(sug)}
                        style={{
                          fontSize: '0.6875rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          border: designation === sug ? '1px solid #0284c7' : '1px solid #cbd5e1',
                          backgroundColor: designation === sug ? '#e0f2fe' : '#f8fafc',
                          color: designation === sug ? '#0369a1' : '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '0.875rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Academic Qualification <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        className="form-input"
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                        placeholder="e.g. MBBS, MD / B.Sc Nursing"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Clinical Specialization / Domain
                      </label>
                      <input
                        className="form-input"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="e.g. Cardiology & Critical Care"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Medical / Nursing Registration No. (License)
                    </label>
                    <input
                      className="form-input"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g. MCI-2019-48192 or SNC-88192"
                    />
                  </div>
                </div>
              )}

              {/* SECTION 3: DEPLOYMENT & STATIONING */}
              {modalTab === 'stationing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Department Deployment
                      </label>
                      <input
                        className="form-input"
                        value={`${workspace.departmentName} (${workspace.departmentCode})`}
                        disabled
                        style={{ backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 600 }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Assigned Shift Window <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        className="form-select"
                        value={assignedShiftId}
                        onChange={(e) => setAssignedShiftId(e.target.value)}
                        required
                      >
                        {shifts.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.startTime} - {s.endTime})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Station to Room / Chamber / Desk
                    </label>
                    <select
                      className="form-select"
                      value={assignedRoomId}
                      onChange={(e) => setAssignedRoomId(e.target.value)}
                    >
                      <option value="">— Floating / General Department Area —</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.roomNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* HOD Checkbox */}
                  <div
                    style={{
                      padding: '0.875rem',
                      borderRadius: '8px',
                      backgroundColor: isDepartmentHead ? '#fffbeb' : '#f8fafc',
                      border: isDepartmentHead ? '1px solid #fde68a' : '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      id="isHOD"
                      checked={isDepartmentHead}
                      onChange={(e) => setIsDepartmentHead(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="isHOD" style={{ margin: 0, cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 700, color: isDepartmentHead ? '#b45309' : 'var(--secondary)' }}>
                      Designate as Department Head (HOD) for {workspace.shortName}
                    </label>
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {modalTab !== 'personal' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setModalTab(modalTab === 'stationing' ? 'professional' : 'personal')}
                      style={{ fontSize: '0.8125rem' }}
                    >
                      ← Back
                    </button>
                  )}
                  {modalTab !== 'stationing' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setModalTab(modalTab === 'personal' ? 'professional' : 'stationing')}
                      style={{ fontSize: '0.8125rem', color: '#0284c7' }}
                    >
                      Next Step →
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.625rem 1.5rem', fontWeight: 800 }}>
                    {editingStaff ? 'Update Staff Member' : 'Save & Register Staff'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Unassign Confirmation Modal */}
      {isDeleteModalOpen && staffToDelete && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              width: '90vw',
              maxWidth: '520px',
              padding: '1.75rem',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
              <span style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#ef4444', display: 'flex' }}>
                <AlertTriangle size={22} />
              </span>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--secondary)' }}>
                  Remove Staff Member
                </h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {staffToDelete.fullName} ({staffToDelete.employeeCode} • {staffToDelete.designation})
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Please select the desired removal action for <strong>{staffToDelete.fullName}</strong>:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--secondary)' }}>
                    1. Remove from {workspace.shortName} Only
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Unassigns the employee from this department while preserving their profile in the hospital master directory.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleConfirmUnassign}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  Unassign Only
                </button>
              </div>

              <div
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fca5a5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#991b1b' }}>
                    2. Delete Record Permanently
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                    Completely deletes this personnel record across all hospital databases.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmDeletePermanently}
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    padding: '0.45rem 0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Delete Permanently
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setStaffToDelete(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {isBulkModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              width: '90vw',
              maxWidth: '640px',
              padding: '1.75rem',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', padding: '0.375rem', borderRadius: '8px', display: 'flex' }}>
                  <Upload size={18} />
                </span>
                <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>
                  Bulk Upload Staff to {workspace.departmentName}
                </h4>
              </div>
              <button className="action-btn" onClick={() => setIsBulkModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 0 }}>
              Paste comma-separated rows or use our predefined template format:
              <br />
              <code style={{ fontSize: '0.75rem', color: '#0284c7' }}>Employee Code, Full Name, Role, Designation, Shift, Phone, Email</code>
            </p>

            {bulkError && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.8125rem', marginBottom: '1rem', border: '1px solid #fca5a5' }}>
                ✕ {bulkError}
              </div>
            )}
            {bulkSuccess && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '0.8125rem', marginBottom: '1rem', border: '1px solid #86efac' }}>
                {bulkSuccess}
              </div>
            )}

            <form onSubmit={handleBulkImportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                    Staff Data (CSV Rows)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setBulkInputText(
                        `DOC-305, Dr. Sarah Jenkins, doctor, Senior Consultant, Morning Shift, +91 98765 11111, sarah@northhospital.com\n` +
                        `DOC-306, Dr. Michael Chang, doctor, Consultant, Evening Shift, +91 98765 22222, michael@northhospital.com\n` +
                        `NUR-405, Nurse Priya Sharma, nurse, Head Nurse, Morning Shift, +91 98765 33333, priya@northhospital.com\n` +
                        `NUR-406, Nurse Rahul Varma, nurse, Staff Nurse, Evening Shift, +91 98765 44444, rahul@northhospital.com`
                      )
                    }
                    style={{ fontSize: '0.75rem', color: '#0284c7', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Paste Sample Records
                  </button>
                </div>
                <textarea
                  className="form-input"
                  style={{ minHeight: '140px', fontFamily: 'monospace', fontSize: '0.8125rem' }}
                  placeholder="Paste CSV lines here..."
                  value={bulkInputText}
                  onChange={(e) => setBulkInputText(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDownloadTemplate}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}
                >
                  <Download size={14} /> Download Sample CSV
                </button>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsBulkModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.625rem 1.5rem', fontWeight: 700 }}>
                    Validate & Import
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
