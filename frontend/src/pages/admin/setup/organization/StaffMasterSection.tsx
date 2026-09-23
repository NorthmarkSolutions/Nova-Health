import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  FileText,
  MapPin,
  Briefcase,
  GraduationCap,
  DollarSign,
  Calendar,
  HeartPulse,
  CheckCircle,
  Shield,
  ChevronDown,
} from 'lucide-react';
import {
  StaffMember,
  HospitalShift,
  StaffRole,
  StaffStatus,
  StaffOnboardingStage,
  getHospitalStaff,
  saveHospitalStaff,
  addHospitalStaff,
  updateHospitalStaff,
  deleteHospitalStaff,
  getHospitalShifts,
  DEFAULT_HOSPITAL_STAFF,
  calculateStaffProfileCompletion,
} from './hospitalStaffStore';
import { getCampusBuildings, BuildingNode } from './CampusInfrastructureSection';
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
  const [completionFilter, setCompletionFilter] = useState<'all' | 'complete' | 'pending'>('all');

  // Dual Onboarding Mode: 'quick' (Option 1: 35%) vs 'complete' (Option 2: 100%)
  const [onboardingMode, setOnboardingMode] = useState<'quick' | 'complete'>('quick');

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
    buildingId: '',
    buildingName: '',
    floorId: '',
    floorName: '',
    roomId: '',
    roomName: '',
    wardId: '',
    wardName: '',
    dob: '',
    gender: 'Male',
    bloodGroup: 'O+',
    address: { street: '', city: '', state: '', pincode: '' },
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
    experienceYears: 5,
    registrationNumber: '',
    licenseNumber: '',
    specialization: 'General Medicine',
    consultationDurationMinutes: 15,
    dailyPatientCapacity: 25,
    consultationFee: 100,
    documents: {
      aadhaarNumber: '',
      aadhaarVerified: false,
      panNumber: '',
      medicalRegCertUploaded: false,
      certificatesCount: 0,
    },
    profileCompletion: 35,
    onboardingStage: 'BASIC_CREATED',
  });

  // Department Searchable Combobox & Dropdown State
  const [deptSearchQuery, setDeptSearchQuery] = useState('');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [highlightedDeptIndex, setHighlightedDeptIndex] = useState(0);
  const deptDropdownRef = useRef<HTMLDivElement>(null);
  const deptSearchInputRef = useRef<HTMLInputElement>(null);
  const fullNameInputRef = useRef<HTMLInputElement>(null);

  // Filtered departments for combobox
  const filteredDepts = useMemo(() => {
    if (!deptSearchQuery.trim()) return departments;
    const q = deptSearchQuery.toLowerCase().trim();
    return departments.filter(
      (d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)
    );
  }, [departments, deptSearchQuery]);

  // Click-outside listener for Department Combobox
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target as Node)) {
        setIsDeptDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autofocus Full Name input when modal opens in quick mode
  useEffect(() => {
    if (isModalOpen && onboardingMode === 'quick') {
      const timer = setTimeout(() => {
        fullNameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, onboardingMode]);

  // Global Keyboard Shortcuts (Ctrl+Enter to save, Escape to dismiss)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.getElementById('staff-registration-form') as HTMLFormElement;
        if (form) {
          form.requestSubmit();
        }
      } else if (e.key === 'Escape' && !isDeptDropdownOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isModalOpen, isDeptDropdownOpen]);

  // Department combobox keyboard navigation
  const handleDeptKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDeptDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsDeptDropdownOpen(true);
        e.preventDefault();
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedDeptIndex((prev) => (prev + 1) % (filteredDepts.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedDeptIndex((prev) => (prev - 1 + (filteredDepts.length || 1)) % (filteredDepts.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredDepts[highlightedDeptIndex]) {
        toggleDepartmentSelection(filteredDepts[highlightedDeptIndex].id);
      }
    } else if (e.key === 'Backspace' && !deptSearchQuery && (formData.departmentIds?.length || 0) > 0) {
      const currentIds = formData.departmentIds || [];
      const lastId = currentIds[currentIds.length - 1];
      toggleDepartmentSelection(lastId);
    } else if (e.key === 'Escape') {
      setIsDeptDropdownOpen(false);
      e.stopPropagation();
    }
  };

  // Campus Physical Infrastructure for Workstation allocation
  const campusBuildings = useMemo<BuildingNode[]>(() => getCampusBuildings(), [isModalOpen]);

  const selectedBuilding = useMemo(() => {
    return campusBuildings.find((b) => b.id === formData.buildingId);
  }, [campusBuildings, formData.buildingId]);

  const availableFloors = useMemo(() => {
    return selectedBuilding ? selectedBuilding.floors : [];
  }, [selectedBuilding]);

  const selectedFloor = useMemo(() => {
    return availableFloors.find((f) => f.id === formData.floorId);
  }, [availableFloors, formData.floorId]);

  const availableRooms = useMemo(() => {
    return selectedFloor ? selectedFloor.rooms : [];
  }, [selectedFloor]);

  const availableWards = useMemo(() => {
    return selectedFloor ? selectedFloor.wards : [];
  }, [selectedFloor]);

  // Live profile completion computation
  const liveCompletion = useMemo(() => {
    return calculateStaffProfileCompletion(formData);
  }, [formData]);

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

      // Completion filter
      if (completionFilter === 'complete') {
        if ((m.profileCompletion || 0) < 90) return false;
      } else if (completionFilter === 'pending') {
        if ((m.profileCompletion || 0) >= 90) return false;
      }

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
  }, [staffList, roleFilter, shiftFilter, deptFilter, statusFilter, completionFilter, searchQuery]);

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
        : role === 'assistant'
        ? 'AST'
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
    setOnboardingMode('quick');
    const defaultShift = shifts[0] || {
      id: 'shift-morn',
      name: 'Morning Shift',
      startTime: '08:00',
      endTime: '16:00',
    };
    const firstDept = departments[0];
    const firstBld = campusBuildings[0];
    const firstFlr = firstBld?.floors[0];
    const firstRoom = firstFlr?.rooms[0];

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
      buildingId: firstBld?.id || '',
      buildingName: firstBld?.name || '',
      floorId: firstFlr?.id || '',
      floorName: firstFlr ? `Floor ${firstFlr.floorNumber}` : '',
      roomId: firstRoom?.id || '',
      roomName: firstRoom ? `Room ${firstRoom.roomNumber} - ${firstRoom.roomType}` : '',
      wardId: '',
      wardName: '',
      dob: '',
      gender: 'Male',
      bloodGroup: 'O+',
      address: { street: '', city: '', state: '', pincode: '' },
      emergencyContactName: '',
      emergencyContactRelation: '',
      emergencyContactPhone: '',
      experienceYears: 5,
      registrationNumber: '',
      licenseNumber: '',
      specialization: 'General Medicine',
      consultationDurationMinutes: 15,
      dailyPatientCapacity: 25,
      consultationFee: 100,
      documents: {
        aadhaarNumber: '',
        aadhaarVerified: false,
        panNumber: '',
        medicalRegCertUploaded: false,
        certificatesCount: 0,
      },
      profileCompletion: 35,
      onboardingStage: 'BASIC_CREATED',
      joiningDate: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: StaffMember) => {
    setEditingStaffId(member.id);
    if ((member.profileCompletion || 0) >= 90) {
      setOnboardingMode('complete');
    } else {
      setOnboardingMode('quick');
    }
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
      buildingId: member.buildingId || '',
      buildingName: member.buildingName || '',
      floorId: member.floorId || '',
      floorName: member.floorName || '',
      roomId: member.roomId || '',
      roomName: member.roomName || '',
      wardId: member.wardId || '',
      wardName: member.wardName || '',
      dob: member.dob || '',
      gender: member.gender || 'Male',
      bloodGroup: member.bloodGroup || 'O+',
      address: typeof member.address === 'object' ? member.address : { street: typeof member.address === 'string' ? member.address : '', city: '', state: '', pincode: '' },
      emergencyContactName: member.emergencyContactName || '',
      emergencyContactRelation: member.emergencyContactRelation || '',
      emergencyContactPhone: member.emergencyContactPhone || member.emergencyContact || '',
      experienceYears: member.experienceYears !== undefined ? member.experienceYears : 5,
      registrationNumber: member.registrationNumber || '',
      licenseNumber: member.licenseNumber || '',
      specialization: member.specialization || (member.role === 'doctor' ? 'General Medicine' : ''),
      consultationDurationMinutes: member.consultationDurationMinutes || 15,
      dailyPatientCapacity: member.dailyPatientCapacity || 25,
      consultationFee: member.consultationFee !== undefined ? member.consultationFee : 100,
      documents: member.documents || {
        aadhaarNumber: '',
        aadhaarVerified: false,
        panNumber: '',
        medicalRegCertUploaded: false,
        certificatesCount: 0,
      },
      profileCompletion: member.profileCompletion || 35,
      onboardingStage: member.onboardingStage || 'BASIC_CREATED',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName?.trim() || !formData.employeeCode?.trim()) {
      if (onboardingMode === 'complete') {
        setOnboardingMode('quick');
      }
      alert('Please fill out the essential workforce identity (Full Name and Employee Code) under Quick Onboarding first.');
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

    const building = campusBuildings.find((b) => b.id === formData.buildingId);
    const floor = building?.floors.find((f) => f.id === formData.floorId);
    const room = floor?.rooms.find((r) => r.id === formData.roomId);
    const ward = floor?.wards.find((w) => w.id === formData.wardId);

    const comp = calculateStaffProfileCompletion({
      ...formData,
      departmentIds: deptIds,
      shiftIds: shiftIds,
    });

    const completionScore = onboardingMode === 'quick' ? Math.max(35, comp.score) : Math.max(95, comp.score);
    const completionStage: StaffOnboardingStage = completionScore >= 90 ? 'COMPLETE' : 'BASIC_CREATED';

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
      // Workstation / Campus location
      buildingId: formData.buildingId || '',
      buildingName: building ? building.name : formData.buildingName || '',
      floorId: formData.floorId || '',
      floorName: floor ? `Floor ${floor.floorNumber}` : formData.floorName || '',
      roomId: formData.roomId || '',
      roomName: room ? `Room ${room.roomNumber} - ${room.roomType}` : formData.roomName || '',
      wardId: formData.wardId || '',
      wardName: ward ? ward.name : formData.wardName || '',
      // Personal Information
      dob: formData.dob || '',
      gender: formData.gender || 'Male',
      bloodGroup: formData.bloodGroup || 'O+',
      address: formData.address || { street: '', city: '', state: '', pincode: '' },
      emergencyContact: formData.emergencyContactPhone || formData.emergencyContact || '',
      emergencyContactName: formData.emergencyContactName || '',
      emergencyContactRelation: formData.emergencyContactRelation || '',
      emergencyContactPhone: formData.emergencyContactPhone || '',
      // Professional Information
      experienceYears: formData.experienceYears !== undefined ? formData.experienceYears : 5,
      registrationNumber: formData.registrationNumber || '',
      licenseNumber: formData.licenseNumber || '',
      // Doctor Details
      specialization: formData.specialization || (formData.role === 'doctor' ? 'General Medicine' : ''),
      consultationDurationMinutes: formData.consultationDurationMinutes || 15,
      dailyPatientCapacity: formData.dailyPatientCapacity || 25,
      consultationFee: formData.consultationFee !== undefined ? Number(formData.consultationFee) : 100,
      // Verification Documents
      documents: {
        aadhaarNumber: formData.documents?.aadhaarNumber || '',
        aadhaarVerified: Boolean(formData.documents?.aadhaarVerified),
        panNumber: formData.documents?.panNumber || '',
        medicalRegCertUploaded: Boolean(formData.documents?.medicalRegCertUploaded),
        certificatesCount: formData.documents?.certificatesCount || 0,
      },
      profileCompletion: completionScore,
      onboardingStage: completionStage,
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
              3. Hospital Staff Master & Clinical Headcount Roster
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
          <option value="assistant">Doctor Assistants</option>
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

        {/* Profile Completion Filter: All, 100% Complete, Pending Dept Details */}
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '160px' }}
          value={completionFilter}
          onChange={(e) => setCompletionFilter(e.target.value as any)}
        >
          <option value="all">All Profile Stages</option>
          <option value="complete">100% Complete</option>
          <option value="pending">35% Basic (Dept Pending)</option>
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
              <th style={{ width: '200px' }}>Shifts & Workstation</th>
              <th style={{ width: '170px' }}>Contact Details</th>
              <th style={{ width: '140px' }}>Profile Status</th>
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
                      {(member.buildingName || member.roomName) && (
                        <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Building2 size={10} color="#0284c7" />
                          <span>{member.buildingName ? member.buildingName.split(' ')[0] : 'Campus'} • {member.roomName || member.floorName || 'Unit'}</span>
                        </div>
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
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '115px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 800,
                              color: (member.profileCompletion || 0) >= 90 ? '#15803d' : '#c2410c',
                              backgroundColor: (member.profileCompletion || 0) >= 90 ? '#dcfce7' : '#ffedd5',
                              padding: '0.12rem 0.4rem',
                              borderRadius: '4px',
                            }}
                          >
                            {(member.profileCompletion || 0) >= 90 ? '✓ Complete' : '⚡ 35% Basic'}
                          </span>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                            {member.profileCompletion || 35}%
                          </span>
                        </div>
                        <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${(member.profileCompletion || 0) >= 90 ? 100 : Math.max(35, member.profileCompletion || 35)}%`,
                              backgroundColor: (member.profileCompletion || 0) >= 90 ? '#10b981' : '#f59e0b',
                            }}
                          />
                        </div>
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

      {/* Add / Edit Staff Modal - Large Enterprise Dual-Mode Window */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100, padding: '0.75rem' }}>
          <div
            className="modal-content"
            style={{
              width: '96vw',
              maxWidth: '1600px',
              height: '95vh',
              maxHeight: '95vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header (Fixed Top) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-color)',
                padding: '1.25rem 2rem',
                backgroundColor: '#ffffff',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    color: 'var(--primary)',
                    padding: '0.55rem',
                    borderRadius: '10px',
                    display: 'flex',
                  }}
                >
                  <Users size={22} />
                </span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)' }}>
                    {editingStaffId ? 'Edit Staff Credentials & Roster' : 'Register New Hospital Staff Member'}
                  </h4>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.7813rem', color: 'var(--text-muted)' }}>
                    Configure clinical designation, physical workstation allocation, shifts, and credentials.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="action-btn"
                onClick={() => setIsModalOpen(false)}
                title="Close"
                style={{ padding: '0.5rem', borderRadius: '8px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Mode Switcher & Live Completion Bar (Fixed Top) */}
            <div
              style={{
                padding: '1rem 2rem',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.625rem',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#e2e8f0', padding: '0.35rem', borderRadius: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setOnboardingMode('quick')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.55rem 1.25rem',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: onboardingMode === 'quick' ? '#ffffff' : 'transparent',
                      color: onboardingMode === 'quick' ? '#0284c7' : '#64748b',
                      boxShadow: onboardingMode === 'quick' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Sparkles size={16} color={onboardingMode === 'quick' ? '#0284c7' : '#64748b'} />
                    Quick Onboarding
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnboardingMode('complete')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.55rem 1.25rem',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: onboardingMode === 'complete' ? '#ffffff' : 'transparent',
                      color: onboardingMode === 'complete' ? '#0f766e' : '#64748b',
                      boxShadow: onboardingMode === 'complete' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <FileText size={16} color={onboardingMode === 'complete' ? '#0f766e' : '#64748b'} />
                    Complete Onboarding
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Profile Status
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 900, color: liveCompletion.score >= 90 ? '#15803d' : '#c2410c' }}>
                      {liveCompletion.score >= 90 ? '100% Complete Profile' : `${Math.max(35, liveCompletion.score)}% Basic Profile Created`}
                    </div>
                  </div>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '0.8125rem',
                      backgroundColor: liveCompletion.score >= 90 ? '#dcfce7' : '#ffedd5',
                      color: liveCompletion.score >= 90 ? '#15803d' : '#c2410c',
                      border: `2px solid ${liveCompletion.score >= 90 ? '#86efac' : '#fdba74'}`,
                    }}
                  >
                    {liveCompletion.score >= 90 ? '100%' : `${Math.max(35, liveCompletion.score)}%`}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${liveCompletion.score >= 90 ? 100 : Math.max(35, liveCompletion.score)}%`,
                    backgroundColor: liveCompletion.score >= 90 ? '#10b981' : '#0284c7',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  {onboardingMode === 'quick' ? (
                    <>
                      <strong>Quick Onboarding:</strong> Hospital Admin enters only required fields. Staff activates immediately with <strong>35% completion</strong>. Department Admin can finalize clinical details later.
                    </>
                  ) : (
                    <>
                      <strong>Complete Onboarding:</strong> Enter full personal background, credentials, doctor clinical fee/duration, and verification documents for <strong>100% full profile completion</strong>.
                    </>
                  )}
                </span>
                <span style={{ fontWeight: 700, color: onboardingMode === 'quick' ? '#0284c7' : '#0f766e' }}>
                  {onboardingMode === 'quick' ? 'Target: 35% Onboarding' : 'Target: 100% Onboarding'}
                </span>
              </div>
            </div>

            {/* Scrollable Form Content */}
            <form
              id="staff-registration-form"
              onSubmit={handleFormSubmit}
              noValidate
              style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, margin: 0 }}
            >
              <div
                style={{
                  overflowY: 'auto',
                  padding: '1.5rem 2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem',
                  flex: 1,
                }}
              >
                {/* ======================================================== */}
                {/* SECTION 1: ESSENTIAL WORKFORCE IDENTITY (Quick Mode)     */}
                {/* ======================================================== */}
                {onboardingMode === 'quick' && (
                  <div
                    className="card"
                    style={{
                      padding: '1.25rem',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.15rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.625rem' }}>
                      <Users size={18} color="#0284c7" />
                      <h5 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--secondary)' }}>
                        1. Essential Workforce Identity (Hospital Admin Required)
                      </h5>
                      <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>
                        Required for All Staff
                      </span>
                    </div>

                    {/* Row 1: Full Name, Role, Employee Code */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 1fr', gap: '1rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                          Full Name <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          ref={fullNameInputRef}
                          className="form-input"
                          value={formData.fullName || ''}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="e.g. Dr. Arthur Pendelton"
                          required
                        />
                      </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                        Role / Cadre <span style={{ color: '#ef4444' }}>*</span>
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
                        <option value="assistant">Doctor Assistant / Clinical Assistant</option>
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

                  {/* Row 2: Mobile Phone, Email, Staff Status */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                        Mobile Phone <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        className="form-input"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1 (555) 000-0000"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                        Email Address <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        className="form-input"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="staff@northhospital.com"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                        Staff Status <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.status || 'ACTIVE'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as StaffStatus })}
                      >
                        <option value="ACTIVE">Active (On Duty)</option>
                        <option value="ON_LEAVE">On Leave</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="RESIGNED">Resigned</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Designation & Qualifications */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                        Designation / Title
                      </label>
                      <input
                        className="form-input"
                        value={formData.designation || ''}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        placeholder="e.g. Senior Consultant Neurologist"
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

                  {/* Multi-Department Assignment Searchable Combobox */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.45rem' }}>
                      <label className="form-label" style={{ margin: 0, fontWeight: 600, fontSize: '0.8125rem' }}>
                        Assigned Department(s) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Search & select departments (type name to filter instantly)
                      </span>
                    </div>

                    {/* Selected Department Tags */}
                    {(formData.departmentIds?.length || 0) > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.4rem',
                          marginBottom: '0.5rem',
                          alignItems: 'center',
                        }}
                      >
                        {formData.departmentIds?.map((deptId) => {
                          const dept = departments.find((d) => d.id === deptId);
                          return (
                            <span
                              key={deptId}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.7813rem',
                                fontWeight: 600,
                                backgroundColor: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#0284c7',
                              }}
                            >
                              <span>{dept?.name || deptId}</span>
                              {dept?.code && (
                                <span
                                  style={{
                                    fontSize: '0.6875rem',
                                    padding: '0.05rem 0.3rem',
                                    borderRadius: '3px',
                                    backgroundColor: '#dbeafe',
                                    color: '#1d4ed8',
                                    fontFamily: 'monospace',
                                  }}
                                >
                                  {dept.code}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleDepartmentSelection(deptId)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  color: '#0284c7',
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: 0,
                                  marginLeft: '0.15rem',
                                }}
                                title="Remove department"
                              >
                                <X size={13} />
                              </button>
                            </span>
                          );
                        })}
                        {(formData.departmentIds?.length || 0) > 1 && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, departmentIds: [], departmentNames: [] })}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              fontSize: '0.7188rem',
                              color: '#64748b',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              padding: '0.2rem 0.4rem',
                            }}
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    )}

                    {/* Combobox Search Input & Dropdown Menu Container */}
                    <div ref={deptDropdownRef} style={{ position: 'relative' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          border: isDeptDropdownOpen ? '1px solid #0284c7' : '1px solid var(--border-color)',
                          boxShadow: isDeptDropdownOpen ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          padding: '0 0.75rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Search size={16} color="#94a3b8" style={{ flexShrink: 0, marginRight: '0.5rem' }} />
                        <input
                          ref={deptSearchInputRef}
                          type="text"
                          value={deptSearchQuery}
                          onChange={(e) => {
                            setDeptSearchQuery(e.target.value);
                            setIsDeptDropdownOpen(true);
                            setHighlightedDeptIndex(0);
                          }}
                          onFocus={() => setIsDeptDropdownOpen(true)}
                          onKeyDown={handleDeptKeyDown}
                          placeholder={
                            (formData.departmentIds?.length || 0) === 0
                              ? 'Search or select department (e.g. Cardiology, Emergency, Radiology)...'
                              : 'Type department name or code to filter...'
                          }
                          style={{
                            border: 'none',
                            outline: 'none',
                            width: '100%',
                            padding: '0.55rem 0',
                            fontSize: '0.8125rem',
                            backgroundColor: 'transparent',
                          }}
                        />
                        {deptSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeptSearchQuery('');
                              deptSearchInputRef.current?.focus();
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '0.2rem',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <X size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsDeptDropdownOpen((prev) => !prev)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            marginLeft: '0.25rem',
                          }}
                          title="Toggle departments menu"
                        >
                          <ChevronDown
                            size={16}
                            style={{
                              transform: isDeptDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                            }}
                          />
                        </button>
                      </div>

                      {/* Dropdown Menu */}
                      {isDeptDropdownOpen && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            left: 0,
                            right: 0,
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '10px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                            maxHeight: '220px',
                            overflowY: 'auto',
                            zIndex: 50,
                          }}
                        >
                          <div
                            style={{
                              padding: '0.45rem 0.75rem',
                              backgroundColor: '#f8fafc',
                              borderBottom: '1px solid #f1f5f9',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              color: '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            <span>Available Departments ({filteredDepts.length})</span>
                            <span style={{ fontWeight: 500, textTransform: 'none' }}>Use ↑ ↓ + Enter to select</span>
                          </div>

                          {filteredDepts.length === 0 ? (
                            <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>
                              No departments found matching "{deptSearchQuery}"
                            </div>
                          ) : (
                            filteredDepts.map((dept, idx) => {
                              const isSelected = formData.departmentIds?.includes(dept.id);
                              const isHighlighted = idx === highlightedDeptIndex;
                              return (
                                <div
                                  key={dept.id}
                                  onClick={() => {
                                    toggleDepartmentSelection(dept.id);
                                    deptSearchInputRef.current?.focus();
                                  }}
                                  onMouseEnter={() => setHighlightedDeptIndex(idx)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.55rem 0.85rem',
                                    cursor: 'pointer',
                                    backgroundColor: isHighlighted
                                      ? isSelected
                                        ? '#e0f2fe'
                                        : '#f1f5f9'
                                      : isSelected
                                      ? '#eff6ff'
                                      : 'transparent',
                                    borderBottom: '1px solid #f8fafc',
                                    transition: 'background-color 0.1s ease',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <div
                                      style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '4px',
                                        border: isSelected ? '1.5px solid #0284c7' : '1.5px solid #cbd5e1',
                                        backgroundColor: isSelected ? '#0284c7' : '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ffffff',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {isSelected && <Check size={12} strokeWidth={3} />}
                                    </div>
                                    <span
                                      style={{
                                        fontSize: '0.8125rem',
                                        fontWeight: isSelected ? 700 : 500,
                                        color: isSelected ? '#0369a1' : 'var(--text-main)',
                                      }}
                                    >
                                      {dept.name}
                                    </span>
                                  </div>

                                  <span
                                    style={{
                                      fontSize: '0.6875rem',
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: '4px',
                                      backgroundColor: isSelected ? '#bae6fd' : '#f1f5f9',
                                      color: isSelected ? '#0369a1' : '#64748b',
                                      fontFamily: 'monospace',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {dept.code}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
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
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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

                  {/* Physical Workstation Location: Building -> Floor -> Room/Ward */}
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '0.875rem 1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building2 size={16} color="#0284c7" />
                      <strong style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                        Physical Workstation & Location (Campus Allocation)
                      </strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          Campus Building
                        </label>
                        <select
                          className="form-select"
                          style={{ fontSize: '0.8125rem' }}
                          value={formData.buildingId || ''}
                          onChange={(e) => {
                            const bld = campusBuildings.find((b) => b.id === e.target.value);
                            const flr = bld?.floors[0];
                            const rm = flr?.rooms[0];
                            setFormData({
                              ...formData,
                              buildingId: e.target.value,
                              buildingName: bld?.name || '',
                              floorId: flr?.id || '',
                              floorName: flr ? `Floor ${flr.floorNumber}` : '',
                              roomId: rm?.id || '',
                              roomName: rm ? `Room ${rm.roomNumber} - ${rm.roomType}` : '',
                            });
                          }}
                        >
                          <option value="">— Select Building —</option>
                          {campusBuildings.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          Floor Level
                        </label>
                        <select
                          className="form-select"
                          style={{ fontSize: '0.8125rem' }}
                          value={formData.floorId || ''}
                          onChange={(e) => {
                            const flr = availableFloors.find((f) => f.id === e.target.value);
                            const rm = flr?.rooms[0];
                            setFormData({
                              ...formData,
                              floorId: e.target.value,
                              floorName: flr ? `Floor ${flr.floorNumber}` : '',
                              roomId: rm?.id || '',
                              roomName: rm ? `Room ${rm.roomNumber} - ${rm.roomType}` : '',
                            });
                          }}
                          disabled={!formData.buildingId}
                        >
                          <option value="">— Select Floor —</option>
                          {availableFloors.map((f) => (
                            <option key={f.id} value={f.id}>
                              Floor {f.floorNumber} ({f.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          Workstation / Chamber / Room
                        </label>
                        <select
                          className="form-select"
                          style={{ fontSize: '0.8125rem' }}
                          value={formData.roomId || ''}
                          onChange={(e) => {
                            const rm = availableRooms.find((r) => r.id === e.target.value);
                            setFormData({
                              ...formData,
                              roomId: e.target.value,
                              roomName: rm ? `Room ${rm.roomNumber} - ${rm.roomType}` : '',
                            });
                          }}
                          disabled={!formData.floorId}
                        >
                          <option value="">— Select Room / Chamber —</option>
                          {availableRooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              Room {r.roomNumber} — {r.roomType}
                            </option>
                          ))}
                        </select>
                      </div>
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

                  {/* Quick Onboarding Hand-off Notice Banner */}
                  {onboardingMode === 'quick' && (
                    <div
                      style={{
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '10px',
                        padding: '0.875rem 1.25rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                      }}
                    >
                      <Sparkles size={20} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ fontSize: '0.8125rem', color: '#1e40af', lineHeight: 1.45 }}>
                        <strong>Quick Onboarding Hand-off Active:</strong> When saved, this staff member will be activated immediately on hospital rosters with <strong>35% completion</strong>. Department Admin will be able to complete their consultation fee, daily capacity, council licenses, and verification documents directly from the Department Workspace.
                      </div>
                    </div>
                  )}
                </div>
                )}

                {/* ======================================================== */}
                {/* COMPLETE ONBOARDING (Directly starts with Section 2)    */}
                {/* ======================================================== */}
                {onboardingMode === 'complete' && (
                  <>
                    {/* Compact Staff Identity Summary Bar */}
                    <div
                      style={{
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '12px',
                        padding: '0.875rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          <UserCheck size={20} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.9375rem', color: '#166534' }}>
                              {formData.fullName?.trim() || 'New Staff Candidate'}
                            </strong>
                            <span className="badge badge-info" style={{ fontSize: '0.6875rem', textTransform: 'capitalize' }}>
                              {formData.role || 'Staff'}
                            </span>
                            {formData.employeeCode && (
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                                [{formData.employeeCode}]
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.7813rem', color: '#15803d', marginTop: '0.15rem' }}>
                            {formData.departmentNames && formData.departmentNames.length > 0 ? (
                              <span>
                                <strong>Departments:</strong> {formData.departmentNames.join(', ')}
                                {formData.designation ? ` • ${formData.designation}` : ''}
                              </span>
                            ) : (
                              <span style={{ color: '#b45309' }}>
                                ⚠️ No departments assigned yet. Basic workforce identity is configured in Quick Onboarding.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setOnboardingMode('quick')}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #86efac',
                          backgroundColor: '#ffffff',
                          color: '#166534',
                          fontSize: '0.7813rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Users size={14} />
                        <span>Edit Essential Identity in Quick Mode</span>
                      </button>
                    </div>

                    {/* SECTION 2: PERSONAL INFORMATION */}
                    <div
                      className="card"
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                        <HeartPulse size={18} color="#e11d48" />
                        <h5 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--secondary)' }}>
                          2. Personal Demographics & Emergency Contacts
                        </h5>
                        <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>
                          +20% Completion
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                            Date of Birth (DOB)
                          </label>
                          <input
                            type="date"
                            className="form-input"
                            value={formData.dob || ''}
                            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                            Gender
                          </label>
                          <select
                            className="form-select"
                            value={formData.gender || 'Male'}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                            Blood Group
                          </label>
                          <select
                            className="form-select"
                            value={formData.bloodGroup || 'O+'}
                            onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                          >
                            <option value="A+">A+ Positive</option>
                            <option value="A-">A- Negative</option>
                            <option value="B+">B+ Positive</option>
                            <option value="B-">B- Negative</option>
                            <option value="O+">O+ Positive</option>
                            <option value="O-">O- Negative</option>
                            <option value="AB+">AB+ Positive</option>
                            <option value="AB-">AB- Negative</option>
                          </select>
                        </div>
                      </div>

                      {/* Address Fields */}
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            Residential Street Address
                          </label>
                          <input
                            className="form-input"
                            value={typeof formData.address === 'object' ? formData.address.street || '' : formData.address || ''}
                            onChange={(e) => {
                              const curr = typeof formData.address === 'object' ? formData.address : {};
                              setFormData({ ...formData, address: { ...curr, street: e.target.value } });
                            }}
                            placeholder="e.g. 142 Medical Heights, Park Avenue"
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            City
                          </label>
                          <input
                            className="form-input"
                            value={typeof formData.address === 'object' ? formData.address.city || '' : ''}
                            onChange={(e) => {
                              const curr = typeof formData.address === 'object' ? formData.address : {};
                              setFormData({ ...formData, address: { ...curr, city: e.target.value } });
                            }}
                            placeholder="e.g. Metro City"
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            State / Province
                          </label>
                          <input
                            className="form-input"
                            value={typeof formData.address === 'object' ? formData.address.state || '' : ''}
                            onChange={(e) => {
                              const curr = typeof formData.address === 'object' ? formData.address : {};
                              setFormData({ ...formData, address: { ...curr, state: e.target.value } });
                            }}
                            placeholder="e.g. NY"
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            Pincode / ZIP
                          </label>
                          <input
                            className="form-input"
                            value={typeof formData.address === 'object' ? formData.address.pincode || '' : ''}
                            onChange={(e) => {
                              const curr = typeof formData.address === 'object' ? formData.address : {};
                              setFormData({ ...formData, address: { ...curr, pincode: e.target.value } });
                            }}
                            placeholder="e.g. 10001"
                          />
                        </div>
                      </div>

                      {/* Emergency Contact */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            Emergency Contact Name
                          </label>
                          <input
                            className="form-input"
                            value={formData.emergencyContactName || ''}
                            onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                            placeholder="e.g. Claire Jenkins"
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            Relationship
                          </label>
                          <input
                            className="form-input"
                            value={formData.emergencyContactRelation || ''}
                            onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                            placeholder="e.g. Spouse / Parent"
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            Emergency Contact Phone
                          </label>
                          <input
                            className="form-input"
                            value={formData.emergencyContactPhone || ''}
                            onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                            placeholder="+1 (555) 999-1122"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: PROFESSIONAL INFORMATION */}
                    <div
                      className="card"
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                        <GraduationCap size={18} color="#7c3aed" />
                        <h5 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--secondary)' }}>
                          3. Professional Credentials & Licensing
                        </h5>
                        <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>
                          +20% Completion
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                            Academic Qualification & Fellowship
                          </label>
                          <input
                            className="form-input"
                            value={formData.qualification || ''}
                            onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                            placeholder="e.g. MBBS, MD (Cardiology), FACC"
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                            Clinical Experience (Years)
                          </label>
                          <input
                            type="number"
                            className="form-input"
                            value={formData.experienceYears !== undefined ? formData.experienceYears : ''}
                            onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                            placeholder="e.g. 8"
                            min="0"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                            State Medical / Nursing Council Registration #
                          </label>
                          <input
                            className="form-input"
                            value={formData.registrationNumber || ''}
                            onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                            placeholder="e.g. SMC-NY-84920"
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                            Medical Practice License Number / DEA #
                          </label>
                          <input
                            className="form-input"
                            value={formData.licenseNumber || ''}
                            onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })}
                            placeholder="e.g. DEA-BD-90219"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 4: DOCTOR DETAILS (Shown when role is doctor) */}
                    {formData.role === 'doctor' && (
                      <div
                        className="card"
                        style={{
                          padding: '1.25rem',
                          borderRadius: '12px',
                          border: '1.5px solid #93c5fd',
                          backgroundColor: '#f8fafc',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Stethoscope size={18} color="#0284c7" />
                            <h5 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#0369a1' }}>
                              4. Doctor Clinical Details & Consultation Capacity
                            </h5>
                          </div>
                          <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>
                            +15% Completion • Tariff Sync
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                              Clinical Specialization
                            </label>
                            <input
                              className="form-input"
                              value={formData.specialization || ''}
                              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                              placeholder="e.g. Interventional Cardiology & Angioplasty"
                            />
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                              Consultation Duration (Slot Time)
                            </label>
                            <select
                              className="form-select"
                              value={formData.consultationDurationMinutes || 15}
                              onChange={(e) => setFormData({ ...formData, consultationDurationMinutes: Number(e.target.value) })}
                            >
                              <option value={10}>10 Minutes per Patient</option>
                              <option value={15}>15 Minutes per Patient (Standard)</option>
                              <option value={20}>20 Minutes per Patient</option>
                              <option value={30}>30 Minutes per Patient (Comprehensive)</option>
                              <option value={45}>45 Minutes (Specialist / Surgical)</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                              Daily Patient Capacity
                            </label>
                            <input
                              type="number"
                              className="form-input"
                              value={formData.dailyPatientCapacity || 25}
                              onChange={(e) => setFormData({ ...formData, dailyPatientCapacity: Number(e.target.value) })}
                              placeholder="e.g. 25 Patients / Day"
                              min="1"
                            />
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                              Consultation Fee ($) <span style={{ color: '#0284c7' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)' }}>
                                $
                              </span>
                              <input
                                type="number"
                                className="form-input"
                                style={{ paddingLeft: '1.75rem' }}
                                value={formData.consultationFee !== undefined ? formData.consultationFee : 100}
                                onChange={(e) => setFormData({ ...formData, consultationFee: Number(e.target.value) })}
                                placeholder="100.00"
                                min="0"
                              />
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.75rem', color: '#0369a1', backgroundColor: '#eff6ff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                          💡 <strong>Hospital Tariff Synchronization:</strong> Consultation fees set here are automatically fetched by the OPD Reception Counter and Patient Billing module when generating consultation slips.
                        </div>
                      </div>
                    )}

                    {/* SECTION 5: VERIFICATION DOCUMENTS */}
                    <div
                      className="card"
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                        <ShieldCheck size={18} color="#059669" />
                        <h5 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--secondary)' }}>
                          5. Verification Documents & Compliance Records
                        </h5>
                        <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>
                          +10% Completion
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                            National ID / Aadhaar Card Number
                          </label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              className="form-input"
                              value={formData.documents?.aadhaarNumber || ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  documents: { ...formData.documents, aadhaarNumber: e.target.value },
                                })
                              }
                              placeholder="e.g. 5892 4810 9231"
                            />
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  documents: {
                                    ...formData.documents,
                                    aadhaarVerified: !formData.documents?.aadhaarVerified,
                                  },
                                })
                              }
                              style={{
                                color: formData.documents?.aadhaarVerified ? '#15803d' : '#475569',
                                backgroundColor: formData.documents?.aadhaarVerified ? '#dcfce7' : '#f1f5f9',
                                border: `1px solid ${formData.documents?.aadhaarVerified ? '#86efac' : '#cbd5e1'}`,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formData.documents?.aadhaarVerified ? '✓ Verified' : 'Verify ID'}
                            </button>
                          </div>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                            PAN / Tax Identification Number
                          </label>
                          <input
                            className="form-input"
                            value={formData.documents?.panNumber || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                documents: { ...formData.documents, panNumber: e.target.value.toUpperCase() },
                              })
                            }
                            placeholder="e.g. ABCDE1234F"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div
                          style={{
                            padding: '0.75rem',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            backgroundColor: '#f8fafc',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                              Medical Registration Certificate
                            </div>
                            <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>
                              Official state council credential verification
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                documents: {
                                  ...formData.documents,
                                  medicalRegCertUploaded: !formData.documents?.medicalRegCertUploaded,
                                },
                              })
                            }
                            style={{
                              color: formData.documents?.medicalRegCertUploaded ? '#15803d' : '#0284c7',
                              backgroundColor: formData.documents?.medicalRegCertUploaded ? '#dcfce7' : '#f0f9ff',
                              border: `1px solid ${formData.documents?.medicalRegCertUploaded ? '#86efac' : '#bae6fd'}`,
                            }}
                          >
                            {formData.documents?.medicalRegCertUploaded ? '✓ Uploaded' : 'Upload Copy'}
                          </button>
                        </div>

                        <div
                          style={{
                            padding: '0.75rem',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            backgroundColor: '#f8fafc',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                              Degree & Board Certificates
                            </div>
                            <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>
                              Academic degrees, fellowships & diplomas
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#0f766e',
                              backgroundColor: '#ccfbf1',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                            }}
                          >
                            {formData.documents?.certificatesCount || 2} Files Attached
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer Actions (Fixed Bottom) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 2rem',
                  backgroundColor: '#f8fafc',
                  borderTop: '1px solid var(--border-color)',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <span>Saving as:</span>
                  <span
                    style={{
                      fontWeight: 800,
                      color: onboardingMode === 'quick' ? '#0284c7' : '#0f766e',
                      backgroundColor: onboardingMode === 'quick' ? '#eff6ff' : '#f0fdfa',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      border: `1px solid ${onboardingMode === 'quick' ? '#bfdbfe' : '#99f6e4'}`,
                    }}
                  >
                    {onboardingMode === 'quick' ? '⚡ Quick Onboarding (35% Profile)' : '📋 Complete Onboarding (100% Profile)'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                    style={{
                      padding: '0.625rem 1.75rem',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                    }}
                  >
                    <span>
                      {editingStaffId
                        ? 'Save Staff Changes'
                        : onboardingMode === 'quick'
                        ? 'Save Quick Profile (35%)'
                        : 'Complete Staff Onboarding (100%)'}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: '0.6875rem',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.22)',
                        color: '#ffffff',
                        fontWeight: 700,
                        letterSpacing: '0.03em',
                      }}
                      title="Press Ctrl+Enter to save immediately"
                    >
                      Ctrl + ↵
                    </span>
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
