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
  FileText,
  DollarSign,
  MapPin,
  Briefcase,
  GraduationCap,
  Shield,
} from 'lucide-react';
import { DepartmentWorkspace, DepartmentStaffAssignment, DepartmentRoom } from '../../types';
import {
  getDepartmentStaffAssignments,
  getDepartmentRooms,
  saveDepartmentDoctor,
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
  calculateStaffProfileCompletion,
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

  // Completion filter state
  const [completionFilter, setCompletionFilter] = useState<'all' | 'pending' | 'complete'>('all');

  // Modal State for Add/Edit/Complete Staff
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'personal' | 'professional' | 'stationing' | 'documents'>('personal');
  const [editingStaff, setEditingStaff] = useState<DepartmentStaffAssignment | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  // 1. Basic & Personal Details
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressPincode, setAddressPincode] = useState('');
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
  const [experienceYears, setExperienceYears] = useState<number>(5);

  // 4. Deployment & Clinical Stationing
  const [assignedShiftId, setAssignedShiftId] = useState('');
  const [assignedRoomId, setAssignedRoomId] = useState('');
  const [isDepartmentHead, setIsDepartmentHead] = useState(false);
  const [consultationFee, setConsultationFee] = useState<number>(75);
  const [consultationDurationMinutes, setConsultationDurationMinutes] = useState<number>(15);
  const [dailyPatientCapacity, setDailyPatientCapacity] = useState<number>(30);

  // 5. Compliance & Documents
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [medicalRegistrationDocName, setMedicalRegistrationDocName] = useState('');
  const [educationDocName, setEducationDocName] = useState('');

  // Live modal profile completion calculation
  const liveCompletion = useMemo(() => {
    let score = 0;
    // Essential (35%)
    if (employeeCode.trim() && fullName.trim() && assignedRole && assignedShiftId) {
      score += 35;
    }
    // Personal (20%)
    let personal = 0;
    if (phone.trim() && email.trim()) personal += 10;
    if (dob || emergencyContact.trim()) personal += 5;
    if (addressStreet.trim() || addressCity.trim()) personal += 5;
    score += personal;

    // Professional (20%)
    let prof = 0;
    if (qualification.trim()) prof += 10;
    if (licenseNumber.trim() || specialization.trim()) prof += 5;
    if (experienceYears && experienceYears > 0) prof += 5;
    score += prof;

    // Stationing / Doctor Tariff (15%)
    let station = 0;
    if (assignedRoomId) station += 5;
    if (assignedRole === 'doctor') {
      if (consultationFee && consultationDurationMinutes && dailyPatientCapacity) {
        station += 10;
      }
    } else {
      station += 10;
    }
    score += station;

    // Documents (10%)
    let docs = 0;
    if (aadhaarNumber.trim() || panNumber.trim()) docs += 5;
    if (medicalRegistrationDocName.trim() || educationDocName.trim()) docs += 5;
    score += docs;

    return Math.min(100, Math.max(35, score));
  }, [
    employeeCode,
    fullName,
    assignedRole,
    assignedShiftId,
    phone,
    email,
    dob,
    emergencyContact,
    addressStreet,
    addressCity,
    qualification,
    licenseNumber,
    specialization,
    experienceYears,
    assignedRoomId,
    consultationFee,
    consultationDurationMinutes,
    dailyPatientCapacity,
    aadhaarNumber,
    panNumber,
    medicalRegistrationDocName,
    educationDocName,
  ]);

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
      if (completionFilter === 'pending' && (s.profileCompletion ?? 100) >= 90) return false;
      if (completionFilter === 'complete' && (s.profileCompletion ?? 100) < 90) return false;
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
  }, [staff, roleFilter, statusFilter, completionFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = staff.length;
    const active = staff.filter((s) => s.status === 'ACTIVE').length;
    const doctors = staff.filter((s) => s.role === 'doctor').length;
    const nurses = staff.filter((s) => s.role === 'nurse').length;
    const receptionists = staff.filter((s) => s.role === 'receptionist').length;
    const techs = staff.filter((s) => s.role === 'technician').length;
    const pendingCompletion = staff.filter((s) => (s.profileCompletion ?? 100) < 90).length;
    return { total, active, doctors, nurses, receptionists, techs, pendingCompletion };
  }, [staff]);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setSelectedStaffId('');
    setFullName('');
    setAssignedRole('doctor');
    setEmployeeCode(generateEmployeeCode('doctor'));
    setGender('Male');
    setDob('');
    setBloodGroup('O+');
    setAddressStreet('');
    setAddressCity('');
    setAddressState('');
    setAddressPincode('');
    setJoiningDate(new Date().toISOString().slice(0, 10));
    setStatus('ACTIVE');
    setPhone('+91 98');
    setEmail('');
    setEmergencyContact('');
    setDesignation('Senior Consultant');
    setQualification('MBBS, MD');
    setSpecialization('Cardiology');
    setLicenseNumber('');
    setExperienceYears(5);
    setAssignedShiftId(shifts[0]?.id || 'shift-morn');
    setAssignedRoomId(rooms[0]?.id || '');
    setIsDepartmentHead(false);
    setConsultationFee(75);
    setConsultationDurationMinutes(15);
    setDailyPatientCapacity(30);
    setAadhaarNumber('');
    setPanNumber('');
    setMedicalRegistrationDocName('');
    setEducationDocName('');
    setModalTab('personal');
    setIsModalOpen(true);
  };

  const populateStaffForm = (assignment: DepartmentStaffAssignment) => {
    setEditingStaff(assignment);
    const existing = hospitalStaffPool.find(
      (s) => s.id === assignment.staffId || s.employeeCode === assignment.employeeCode
    );

    setSelectedStaffId(assignment.staffId);
    setFullName(assignment.fullName);
    setEmployeeCode(assignment.employeeCode);
    setGender(existing?.gender || assignment.gender || 'Male');
    setDob(existing?.dob || '');
    setBloodGroup(existing?.bloodGroup || 'O+');
    const addrObj = typeof existing?.address === 'object' && existing.address !== null ? existing.address : undefined;
    setAddressStreet(addrObj?.street || '');
    setAddressCity(addrObj?.city || '');
    setAddressState(addrObj?.state || '');
    setAddressPincode(addrObj?.pincode || '');
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
    setExperienceYears(Number(existing?.experienceYears) || 5);
    setAssignedShiftId(assignment.shiftId);
    setAssignedRoomId(assignment.assignedRoomId || existing?.roomId || '');
    setIsDepartmentHead(existing?.isDepartmentHead || assignment.isDepartmentHead || false);
    setConsultationFee(existing?.consultationFee || 75);
    setConsultationDurationMinutes(existing?.consultationDurationMinutes || 15);
    setDailyPatientCapacity(existing?.dailyPatientCapacity || 30);
    setAadhaarNumber(existing?.documents?.aadhaarNumber || '');
    setPanNumber(existing?.documents?.panNumber || '');
    setMedicalRegistrationDocName(existing?.documents?.medicalRegistrationDocName || '');
    setEducationDocName(existing?.documents?.educationDocName || '');
  };

  const handleOpenEdit = (assignment: DepartmentStaffAssignment) => {
    populateStaffForm(assignment);
    setModalTab('personal');
    setIsModalOpen(true);
  };

  const handleOpenCompleteProfile = (assignment: DepartmentStaffAssignment) => {
    populateStaffForm(assignment);
    setModalTab(assignment.role === 'doctor' ? 'stationing' : 'professional');
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
      setDob(found.dob || '');
      setBloodGroup(found.bloodGroup || 'O+');
      const foundAddr = typeof found.address === 'object' && found.address !== null ? found.address : undefined;
      setAddressStreet(foundAddr?.street || '');
      setAddressCity(foundAddr?.city || '');
      setAddressState(foundAddr?.state || '');
      setAddressPincode(foundAddr?.pincode || '');
      setExperienceYears(Number(found.experienceYears) || 5);
      setConsultationFee(found.consultationFee || 75);
      setConsultationDurationMinutes(found.consultationDurationMinutes || 15);
      setDailyPatientCapacity(found.dailyPatientCapacity || 30);
      setAadhaarNumber(found.documents?.aadhaarNumber || '');
      setPanNumber(found.documents?.panNumber || '');
      setMedicalRegistrationDocName(found.documents?.medicalRegistrationDocName || '');
      setEducationDocName(found.documents?.educationDocName || '');
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
    const assignedRoom = rooms.find((r) => r.id === assignedRoomId);

    // Maintain single source of truth in HospitalStaffStore
    const staffId = selectedStaffId || editingStaff?.staffId || `stf-${Date.now()}`;
    const existingMember = hospitalStaffPool.find((s) => s.id === staffId);

    const currentDeptIds = existingMember?.departmentIds || [workspace.departmentId];
    const newDeptIds = Array.from(new Set([...currentDeptIds, workspace.departmentId]));

    const currentDeptNames = existingMember?.departmentNames || [workspace.departmentName];
    const newDeptNames = Array.from(new Set([...currentDeptNames, workspace.departmentName]));

    const finalCompletionScore = Math.max(existingMember?.profileCompletion || 35, liveCompletion);

    const staffPayload: StaffMember = {
      ...existingMember,
      id: staffId,
      employeeCode: employeeCode.toUpperCase().trim(),
      fullName: fullName.trim(),
      role: (assignedRole === 'receptionist' ? 'admin' : assignedRole === 'supervisor' ? 'admin' : assignedRole) as any,
      designation: designation.trim() || existingMember?.designation || `${assignedRole.toUpperCase()} - ${workspace.shortName}`,
      qualification: qualification.trim(),
      specialization: specialization.trim(),
      licenseNumber: licenseNumber.trim(),
      experienceYears,
      emergencyContact: emergencyContact.trim(),
      gender,
      dob,
      bloodGroup: bloodGroup as any,
      address: {
        street: addressStreet.trim(),
        city: addressCity.trim(),
        state: addressState.trim(),
        pincode: addressPincode.trim(),
      },
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
      roomId: assignedRoom?.id || existingMember?.roomId,
      roomName: assignedRoom?.name || existingMember?.roomName,
      consultationFee: assignedRole === 'doctor' ? consultationFee : undefined,
      consultationDurationMinutes: assignedRole === 'doctor' ? consultationDurationMinutes : undefined,
      dailyPatientCapacity: assignedRole === 'doctor' ? dailyPatientCapacity : undefined,
      documents: {
        aadhaarNumber: aadhaarNumber.trim(),
        panNumber: panNumber.trim(),
        medicalRegistrationDocName: medicalRegistrationDocName.trim(),
        educationDocName: educationDocName.trim(),
        verified: !!(medicalRegistrationDocName || aadhaarNumber),
      },
      profileCompletion: finalCompletionScore,
      onboardingStage: finalCompletionScore >= 90 ? 'COMPLETE' : 'CLINICAL_PENDING',
    };

    if (existingMember || editingStaff) {
      updateHospitalStaff(staffPayload);
    } else {
      addHospitalStaff(staffPayload);
    }

    // Synchronize department doctor roster if role is doctor
    if (assignedRole === 'doctor') {
      saveDepartmentDoctor({
        id: `doc-${workspace.departmentId}-${staffId}`,
        departmentId: workspace.departmentId,
        staffId: staffId,
        fullName: fullName.trim(),
        employeeCode: employeeCode.toUpperCase().trim(),
        specialization: specialization.trim() || designation.trim() || 'Attending Physician',
        qualification: qualification.trim() || 'MBBS, MD',
        consultationFee: consultationFee || 75,
        consultationStartTime: selectedShift?.startTime || '09:00',
        consultationEndTime: selectedShift?.endTime || '17:00',
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        assignedRoomName: assignedRoom?.name || existingMember?.roomName || 'Chamber 101',
        patientCapacityPerDay: dailyPatientCapacity || 30,
        avgConsultationMinutes: consultationDurationMinutes || 15,
        isAvailable: status === 'ACTIVE',
        status: status === 'ACTIVE' ? 'ACTIVE' : 'ON_LEAVE',
      });
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
          {/* Pending Profile Completion Alert Banner */}
          {stats.pendingCompletion > 0 && (
            <div
              style={{
                padding: '0.875rem 1.25rem',
                borderRadius: '10px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span
                  style={{
                    backgroundColor: '#fef3c7',
                    color: '#b45309',
                    padding: '0.45rem',
                    borderRadius: '8px',
                    display: 'flex',
                  }}
                >
                  <Sparkles size={20} />
                </span>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#92400e' }}>
                    {stats.pendingCompletion} Staff Member{stats.pendingCompletion > 1 ? 's' : ''} Awaiting Department Profile Completion (35% Basic Profile Created)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#b45309' }}>
                    Hospital Admin entered required fields. Complete their room/chamber stationing, clinical tariffs, and credentials.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCompletionFilter(completionFilter === 'pending' ? 'all' : 'pending')}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.4rem 0.85rem',
                  backgroundColor: '#ffffff',
                  borderColor: '#fcd34d',
                  color: '#92400e',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {completionFilter === 'pending' ? 'Show All Staff Pool' : '⚡ Filter Pending Completion (35%)'}
              </button>
            </div>
          )}

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

            <select
              className="form-select"
              style={{ width: 'auto', fontWeight: 600 }}
              value={completionFilter}
              onChange={(e) => setCompletionFilter(e.target.value as any)}
            >
              <option value="all">All Profile States</option>
              <option value="pending">⚡ Pending Dept Completion (35%)</option>
              <option value="complete">✓ Fully Onboarded (100%)</option>
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
                  <th style={{ width: '90px' }}>Staff ID</th>
                  <th>Personnel & Designation</th>
                  <th style={{ width: '130px' }}>Assigned Role</th>
                  <th style={{ width: '150px' }}>Shift Window</th>
                  <th style={{ width: '150px' }}>Stationed Room</th>
                  <th style={{ width: '150px' }}>Contact</th>
                  <th style={{ width: '160px' }}>Profile Status</th>
                  <th style={{ width: '80px' }}>Status</th>
                  <th style={{ width: '95px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
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
                          <td colSpan={9} style={{ padding: '0.625rem 1rem' }}>
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
                                colSpan={9}
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
                                  {(member.profileCompletion ?? 100) < 90 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '135px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                          <Sparkles size={11} color="#d97706" /> {member.profileCompletion || 35}% Basic Profile
                                        </span>
                                      </div>
                                      <div style={{ width: '100%', height: '5px', backgroundColor: '#fed7aa', borderRadius: '999px', overflow: 'hidden' }}>
                                        <div style={{ width: `${member.profileCompletion || 35}%`, height: '100%', backgroundColor: '#ea580c', borderRadius: '999px' }} />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenCompleteProfile(member)}
                                        style={{
                                          marginTop: '2px',
                                          fontSize: '0.6875rem',
                                          fontWeight: 700,
                                          color: '#0284c7',
                                          backgroundColor: '#eff6ff',
                                          border: '1px solid #bfdbfe',
                                          borderRadius: '4px',
                                          padding: '2px 6px',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                          width: 'fit-content',
                                        }}
                                        title="Complete remaining clinical & personal information"
                                      >
                                        <Edit2 size={10} /> Complete Profile
                                      </button>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '110px' }}>
                                      <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <CheckCircle2 size={12} color="#059669" /> 100% Complete
                                      </span>
                                      <div style={{ width: '100%', height: '5px', backgroundColor: '#dcfce7', borderRadius: '999px', overflow: 'hidden' }}>
                                        <div style={{ width: '100%', height: '100%', backgroundColor: '#10b981', borderRadius: '999px' }} />
                                      </div>
                                      <span style={{ fontSize: '0.625rem', color: '#64748b' }}>Fully Onboarded</span>
                                    </div>
                                  )}
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
                                  <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                                    {(member.profileCompletion ?? 100) < 90 && (
                                      <button
                                        type="button"
                                        className="action-btn"
                                        onClick={() => handleOpenCompleteProfile(member)}
                                        title="Complete Staff Profile (35% Basic Profile Created)"
                                        style={{ color: '#0284c7', backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}
                                      >
                                        <Sparkles size={14} />
                                      </button>
                                    )}
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

      {/* Comprehensive Add / Edit / Complete Staff Modal */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div
            className="modal-content"
            style={{
              width: '92vw',
              maxWidth: '920px',
              padding: '1.75rem 2rem',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(2, 132, 199, 0.1)',
                    color: '#0284c7',
                    padding: '0.5rem',
                    borderRadius: '10px',
                    display: 'flex',
                  }}
                >
                  <Users size={22} />
                </span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)' }}>
                    {editingStaff
                      ? (editingStaff.profileCompletion ?? 100) < 90
                        ? `Complete Profile: ${editingStaff.fullName}`
                        : `Edit Credentials: ${editingStaff.fullName}`
                      : `Register New Staff Member to ${workspace.shortName}`}
                  </h4>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.7813rem', color: 'var(--text-muted)' }}>
                    {editingStaff && (editingStaff.profileCompletion ?? 100) < 90
                      ? 'Hospital Admin created this basic record. Fill remaining clinical, stationing, and compliance details to reach 100% completion.'
                      : 'Configure personal credentials, physical room stationing, shift window, and clinical parameters.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="action-btn"
                onClick={() => setIsModalOpen(false)}
                title="Close Modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Live Profile Completion Status Bar */}
            <div
              style={{
                padding: '0.875rem 1.25rem',
                backgroundColor: liveCompletion >= 90 ? '#f0fdf4' : '#fffbeb',
                borderRadius: '12px',
                border: `1px solid ${liveCompletion >= 90 ? '#bbf7d0' : '#fde68a'}`,
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: liveCompletion >= 90 ? '#15803d' : '#92400e' }}>
                    Profile Completion: {liveCompletion}%
                  </span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.55rem',
                      borderRadius: '999px',
                      backgroundColor: liveCompletion >= 90 ? '#dcfce7' : '#fef3c7',
                      color: liveCompletion >= 90 ? '#166534' : '#b45309',
                      border: `1px solid ${liveCompletion >= 90 ? '#86efac' : '#fcd34d'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    {liveCompletion >= 90 ? (
                      <>
                        <CheckCircle2 size={11} color="#166534" /> Complete & Ready for Clinical Operations
                      </>
                    ) : (
                      <>
                        <Sparkles size={11} color="#b45309" /> Basic Profile Created (35%) • Complete Remaining Fields
                      </>
                    )}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {liveCompletion >= 90 ? '✓ 100% Fully Onboarded' : `+${100 - liveCompletion}% needed for full onboarding`}
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${liveCompletion}%`,
                    height: '100%',
                    backgroundColor: liveCompletion >= 90 ? '#10b981' : '#f59e0b',
                    borderRadius: '999px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            {/* Optional Existing Pool Picker when adding new */}
            {!editingStaff && (
              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Fast Option: Populate from Existing Hospital Staff Pool</span>
                  <span style={{ fontSize: '0.6875rem', color: '#0284c7' }}>Optional</span>
                </label>
                <select className="form-select" value={selectedStaffId} onChange={handleSelectExistingStaff}>
                  <option value="">— Or Fill New Staff Details Below —</option>
                  {hospitalStaffPool.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.employeeCode} • {s.designation} • {s.profileCompletion || 35}%)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Modal Internal Section Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto' }}>
              <button
                type="button"
                onClick={() => setModalTab('personal')}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: modalTab === 'personal' ? '#0284c7' : '#f1f5f9',
                  color: modalTab === 'personal' ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>1. Personal & Contact</span>
                {fullName && phone && email && <Check size={13} />}
              </button>

              <button
                type="button"
                onClick={() => setModalTab('professional')}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: modalTab === 'professional' ? '#0284c7' : '#f1f5f9',
                  color: modalTab === 'professional' ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>2. Role & Credentials</span>
                {qualification && <Check size={13} />}
              </button>

              <button
                type="button"
                onClick={() => setModalTab('stationing')}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: modalTab === 'stationing' ? '#0284c7' : '#f1f5f9',
                  color: modalTab === 'stationing' ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>3. Clinical & Stationing</span>
                {assignedRoomId && <Check size={13} />}
              </button>

              <button
                type="button"
                onClick={() => setModalTab('documents')}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: modalTab === 'documents' ? '#0284c7' : '#f1f5f9',
                  color: modalTab === 'documents' ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>4. Compliance & Documents</span>
                {(aadhaarNumber || medicalRegistrationDocName) && <Check size={13} />}
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.875rem' }}>
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
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Blood Group
                      </label>
                      <select
                        className="form-select"
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                      >
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                          <option key={bg} value={bg}>
                            {bg}
                          </option>
                        ))}
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
                  </div>

                  {/* Address Fields */}
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={14} color="#0284c7" /> Residential & Communication Address
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Street Address</label>
                      <input
                        className="form-input"
                        value={addressStreet}
                        onChange={(e) => setAddressStreet(e.target.value)}
                        placeholder="e.g. 42 Medical Enclave, Sector 12"
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>City</label>
                        <input
                          className="form-input"
                          value={addressCity}
                          onChange={(e) => setAddressCity(e.target.value)}
                          placeholder="e.g. New Delhi"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>State</label>
                        <input
                          className="form-input"
                          value={addressState}
                          onChange={(e) => setAddressState(e.target.value)}
                          placeholder="e.g. Delhi"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>PIN Code</label>
                        <input
                          className="form-input"
                          value={addressPincode}
                          onChange={(e) => setAddressPincode(e.target.value)}
                          placeholder="e.g. 110001"
                        />
                      </div>
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.875rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Emergency Contact (Name & Relationship)
                      </label>
                      <input
                        className="form-input"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        placeholder="e.g. Priya Roy (Spouse: +91 98111 22222)"
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Duty Status
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.875rem' }}>
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

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        className="form-input"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)}
                        placeholder="e.g. 8"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: CLINICAL & STATIONING */}
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
                      Station to Room / Chamber / Desk <span style={{ color: '#0284c7' }}>(Department Level)</span>
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

                  {/* Doctor Consultation Parameters (If Doctor) */}
                  {assignedRole === 'doctor' && (
                    <div
                      style={{
                        padding: '1rem',
                        borderRadius: '10px',
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Stethoscope size={16} color="#0284c7" /> OPD Consultation & Token Booking Parameters
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            Consultation Fee ($/₹)
                          </label>
                          <input
                            type="number"
                            min={0}
                            className="form-input"
                            value={consultationFee}
                            onChange={(e) => setConsultationFee(parseInt(e.target.value) || 0)}
                            placeholder="75"
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            Slot Duration (Mins)
                          </label>
                          <input
                            type="number"
                            min={5}
                            max={60}
                            className="form-input"
                            value={consultationDurationMinutes}
                            onChange={(e) => setConsultationDurationMinutes(parseInt(e.target.value) || 15)}
                            placeholder="15"
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            Daily Capacity (Patients)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={200}
                            className="form-input"
                            value={dailyPatientCapacity}
                            onChange={(e) => setDailyPatientCapacity(parseInt(e.target.value) || 30)}
                            placeholder="30"
                          />
                        </div>
                      </div>
                    </div>
                  )}

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

              {/* SECTION 4: DOCUMENTS & COMPLIANCE */}
              {modalTab === 'documents' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        National ID / Aadhaar Number
                      </label>
                      <input
                        className="form-input"
                        value={aadhaarNumber}
                        onChange={(e) => setAadhaarNumber(e.target.value)}
                        placeholder="XXXX-XXXX-XXXX"
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Tax ID / PAN Number
                      </label>
                      <input
                        className="form-input"
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                        placeholder="ABCDE1234F"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Medical Council / Board Registration Certificate
                      </label>
                      <input
                        className="form-input"
                        value={medicalRegistrationDocName}
                        onChange={(e) => setMedicalRegistrationDocName(e.target.value)}
                        placeholder="e.g. MCI_Registration_Certificate.pdf"
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Degree / Specialization Certificate
                      </label>
                      <input
                        className="form-input"
                        value={educationDocName}
                        onChange={(e) => setEducationDocName(e.target.value)}
                        placeholder="e.g. MD_Cardiology_Degree.pdf"
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '0.875rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      fontSize: '0.8125rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <ShieldCheck size={18} color="#059669" />
                    <span>Uploaded credentials will be marked as verified upon submission and archived in the central compliance repository.</span>
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '0.5rem',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1rem',
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {modalTab !== 'personal' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        if (modalTab === 'documents') setModalTab('stationing');
                        else if (modalTab === 'stationing') setModalTab('professional');
                        else setModalTab('personal');
                      }}
                      style={{ fontSize: '0.8125rem' }}
                    >
                      ← Back
                    </button>
                  )}
                  {modalTab !== 'documents' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        if (modalTab === 'personal') setModalTab('professional');
                        else if (modalTab === 'professional') setModalTab('stationing');
                        else setModalTab('documents');
                      }}
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
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      padding: '0.625rem 1.5rem',
                      fontWeight: 800,
                      backgroundColor: liveCompletion >= 90 ? '#059669' : 'var(--primary)',
                      borderColor: liveCompletion >= 90 ? '#059669' : 'var(--primary)',
                    }}
                  >
                    {editingStaff
                      ? liveCompletion >= 90
                        ? '✓ Save & Complete Profile (100%)'
                        : 'Save Changes'
                      : 'Save & Register Staff'}
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
