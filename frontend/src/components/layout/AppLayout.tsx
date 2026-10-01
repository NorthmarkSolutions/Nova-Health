import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleType } from '../../types';
import {
  LayoutDashboard,
  UserPlus,
  Stethoscope,
  Activity,
  Pill,
  FlaskConical,
  Receipt,
  UserCircle,
  LogOut,
  Hospital,
  ShieldCheck,
  Scissors,
  BedDouble,
  Building2,
  Calendar,
  Users,
  Clock,
  BarChart2,
  ClipboardList,
  UserCheck,
  CheckCircle2,
  ClipboardCheck,
  HeartPulse,
  FileText,
  ChevronsUpDown,
} from 'lucide-react';
import { patientJourneyService } from '../../services/patientJourneyService';
import { NURSE_TABS, resolveNurseTab } from '../../pages/nurse/nurseTabs';
import { WorkspaceSidebarContext } from '../workspace/WorkspaceSidebarContext';

interface NavItem {
  label: string;
  path: string;
  badge?: string;
  icon: React.ReactNode;
  allowedRoles: RoleType[];
}

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, logout, switchRolePreview } = useAuth();
  const navigate = useNavigate();

  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.replace(/^Nurse\s+/i, '').replace(/^Dr\.\s+/i, '').trim() || user.username
    : 'Staff Member';

  const getDesignation = () => {
    if (user?.designation) return user.designation;
    if (!role) return 'Staff';
    if (role === RoleType.NURSE) return 'Staff Nurse';
    return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const profileRows = [
    { label: 'Employee ID', value: user?.employeeId },
    { label: 'Department', value: user?.departmentName },
    { label: 'Station', value: user?.station },
    { label: 'Email', value: user?.email },
  ].filter((row): row is { label: string; value: string } => Boolean(row.value && row.value.trim() !== ''));

  const getUserInitials = () => {
    if (!user) return 'NH';
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return 'NH';
  };

  const getStationLocation = (r: RoleType): string => {
    switch (r) {
      case RoleType.NURSE:
        return 'Station 01 • OPD Ground Floor';
      case RoleType.DOCTOR:
      case RoleType.MEDICAL_SUPERINTENDENT:
        return 'Chamber 204 • OPD Block B';
      case RoleType.DOCTOR_ASSISTANT:
        return 'Chamber 204 • Ante-Room';
      case RoleType.RECEPTIONIST:
      case RoleType.RECEPTION_SUPERVISOR:
        return 'Desk #01 • Ground Floor Bay 01';
      case RoleType.LAB_TECH:
      case RoleType.PATHOLOGIST:
        return 'Diagnostic Wing • Level 1';
      case RoleType.PHARMACIST:
        return 'Outpatient Pharmacy • Ground Floor';
      case RoleType.CASHIER:
      case RoleType.FINANCE_MANAGER:
        return 'Billing Counter 02 • Ground Floor';
      default:
        return 'Central Facility • Main Campus';
    }
  };

  const navItems: NavItem[] = [
    {
      label: 'Admin Overview',
      path: '/admin',
      icon: <ShieldCheck size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN],
    },
    {
      label: 'Dept. Workspaces',
      path: '/department/opd',
      badge: 'Engine',
      icon: <Building2 size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN],
    },
    {
      label: '1. Reception & Queue',
      path: '/reception',
      badge: 'Desk',
      icon: <UserPlus size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.RECEPTIONIST, RoleType.RECEPTION_SUPERVISOR],
    },
    {
      label: '2. Doctor OPD Station',
      path: '/doctor',
      badge: 'OPD',
      icon: <Stethoscope size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR, RoleType.MEDICAL_SUPERINTENDENT],
    },
    {
      label: 'Doctor Assistant Desk',
      path: '/assistant',
      badge: 'Ante-Room',
      icon: <UserCheck size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR_ASSISTANT],
    },
    {
      label: '3. Lab & Diagnostics',
      path: '/lab',
      badge: 'Lab',
      icon: <FlaskConical size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.LAB_TECH, RoleType.PATHOLOGIST],
    },
    {
      label: '4. Operation Theatre',
      path: '/ot',
      badge: 'OT',
      icon: <Scissors size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.SURGEON, RoleType.ANESTHETIST, RoleType.OT_MANAGER],
    },
    {
      label: '5. Inpatient Care (IPD)',
      path: '/ipd',
      badge: 'IPD',
      icon: <BedDouble size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.WARD_MANAGER, RoleType.NURSE, RoleType.DOCTOR],
    },
    {
      label: '6. Billing & Accounts',
      path: '/billing',
      badge: 'Cash',
      icon: <Receipt size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.CASHIER, RoleType.FINANCE_MANAGER],
    },
    {
      label: 'Nurse Station',
      path: '/nurse',
      icon: <Activity size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.NURSE],
    },
    {
      label: 'Pharmacy Counter',
      path: '/pharmacy',
      icon: <Pill size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.PHARMACIST],
    },
    {
      label: 'Patient Companion',
      path: '/patient',
      icon: <UserCircle size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.PATIENT],
    },
  ];

  const isAdmin = role === RoleType.SUPER_ADMIN || role === RoleType.HOSPITAL_ADMIN;
  const isReception = role === RoleType.RECEPTIONIST || role === RoleType.RECEPTION_SUPERVISOR;
  const isDoctor = role === RoleType.DOCTOR || role === RoleType.MEDICAL_SUPERINTENDENT;
  const isAssistant = role === RoleType.DOCTOR_ASSISTANT;
  const isNurse = role === RoleType.NURSE;
  const isLabTech = role === RoleType.LAB_TECH;
  const isPathologist = role === RoleType.PATHOLOGIST;

  const receptionNavItems: NavItem[] = [
    {
      label: '1. Live Token Queue',
      path: '/reception?tab=queue',
      badge: 'Desk',
      icon: <UserPlus size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.RECEPTIONIST, RoleType.RECEPTION_SUPERVISOR],
    },
    {
      label: '2. Doctor Schedules',
      path: '/reception?tab=appointments',
      badge: 'OPD',
      icon: <Stethoscope size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.RECEPTIONIST, RoleType.RECEPTION_SUPERVISOR],
    },
    {
      label: '3. Counter Billing & Cash',
      path: '/reception?tab=billing',
      badge: 'Cash',
      icon: <Receipt size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.RECEPTIONIST, RoleType.RECEPTION_SUPERVISOR],
    },
    {
      label: '4. Patient Master UHID',
      path: '/reception?tab=search',
      badge: 'Directory',
      icon: <UserCircle size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.RECEPTIONIST, RoleType.RECEPTION_SUPERVISOR],
    },
    {
      label: '5. Observation & Beds',
      path: '/reception?tab=daycare',
      badge: 'Beds',
      icon: <BedDouble size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.RECEPTIONIST, RoleType.RECEPTION_SUPERVISOR],
    },
  ];

  const [doctorStats, setDoctorStats] = React.useState(() => {
    try {
      const q = patientJourneyService.getQueue();
      const docQ = q.filter(
        (t) =>
          t.doctor.toLowerCase().includes('jenkins') ||
          t.doctor.toLowerCase().includes('sarah') ||
          t.room.toLowerCase().includes('204')
      );
      const inpatientRounds = patientJourneyService.getInpatientRounds();
      return { queueCount: docQ.length, inpatientCount: inpatientRounds.length };
    } catch {
      return { queueCount: 0, inpatientCount: 0 };
    }
  });

  const doctorNavItems: NavItem[] = [
    {
      label: '1. Dashboard',
      path: '/doctor?tab=dashboard',
      icon: <LayoutDashboard size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.DOCTOR, RoleType.MEDICAL_SUPERINTENDENT],
    },
    {
      label: '2. Queue & Appointments',
      path: '/doctor?tab=queue',
      badge: doctorStats.queueCount > 0 ? `${doctorStats.queueCount}` : undefined,
      icon: <Users size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.DOCTOR, RoleType.MEDICAL_SUPERINTENDENT],
    },
    {
      label: '3. Patient Consultation & Rx',
      path: '/doctor?tab=consultation',
      icon: <Stethoscope size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.DOCTOR, RoleType.MEDICAL_SUPERINTENDENT],
    },
    {
      label: '4. My Schedule',
      path: '/doctor?tab=schedule',
      icon: <Clock size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.DOCTOR, RoleType.MEDICAL_SUPERINTENDENT],
    },
    {
      label: '5. Reports & Analytics',
      path: '/doctor?tab=reports',
      icon: <BarChart2 size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.DOCTOR, RoleType.MEDICAL_SUPERINTENDENT],
    },
    {
      label: '6. Inpatient Rounds',
      path: '/doctor?tab=inpatient',
      badge: doctorStats.inpatientCount > 0 ? `${doctorStats.inpatientCount}` : undefined,
      icon: <BedDouble size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.DOCTOR, RoleType.MEDICAL_SUPERINTENDENT],
    },
  ];

  const [assistantStats, setAssistantStats] = React.useState(() => {
    try {
      const q = patientJourneyService.getQueue();
      const docQ = q.filter(
        (t) =>
          t.doctor.toLowerCase().includes('jenkins') ||
          t.doctor.toLowerCase().includes('sarah') ||
          t.room.toLowerCase().includes('204')
      );
      const waitingCount = docQ.filter(
        (t) => t.status === 'WAITING' || t.status === 'TRIAGED' || t.status === 'READY_FOR_DOCTOR' || t.status === 'SCHEDULED'
      ).length;
      const labs = patientJourneyService.getLabOrders();
      const completedCount = docQ.filter((t) => t.status === 'COMPLETED').length;
      return { waitingCount, labCount: labs.length, completedCount };
    } catch {
      return { waitingCount: 0, labCount: 0, completedCount: 0 };
    }
  });

  const assistantNavItems: NavItem[] = [
    {
      label: '1. Queue & Patient Prep',
      path: '/assistant?tab=queue',
      badge: assistantStats.waitingCount > 0 ? `${assistantStats.waitingCount}` : undefined,
      icon: <Users size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.DOCTOR_ASSISTANT],
    },
    {
      label: '2. Investigations & Reports',
      path: '/assistant?tab=investigations',
      badge: assistantStats.labCount > 0 ? `${assistantStats.labCount}` : undefined,
      icon: <FlaskConical size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.DOCTOR_ASSISTANT],
    },
    {
      label: '3. Consultation Handoff',
      path: '/assistant?tab=handoff',
      badge: assistantStats.completedCount > 0 ? `${assistantStats.completedCount}` : undefined,
      icon: <CheckCircle2 size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.DOCTOR_ASSISTANT],
    },
  ];

  const [nurseStats, setNurseStats] = React.useState(() => {
    try {
      const q = patientJourneyService.getQueue();
      const waitingTriage = q.filter((t) => t.status === 'WAITING' || t.status === 'IN_TRIAGE').length;
      const beds = patientJourneyService.getObservationBeds();
      const activeBeds = beds.filter((b) => b.status === 'ACTIVE').length;
      const labOrders = patientJourneyService.getLabOrders();
      const pendingSamples = labOrders.filter((o) => o.stage === 'ORDERED').length;
      return { waitingTriage, activeBeds, pendingSamples };
    } catch {
      return { waitingTriage: 0, activeBeds: 0, pendingSamples: 0 };
    }
  });

  React.useEffect(() => {
    if (!isNurse && !isAdmin && !isAssistant && !isDoctor) return;
    const handleSync = () => {
      try {
        const q = patientJourneyService.getQueue();
        const waitingTriage = q.filter((t) => t.status === 'WAITING' || t.status === 'IN_TRIAGE').length;
        const beds = patientJourneyService.getObservationBeds();
        const activeBeds = beds.filter((b) => b.status === 'ACTIVE').length;
        const labOrders = patientJourneyService.getLabOrders();
        const pendingSamples = labOrders.filter((o) => o.stage === 'ORDERED').length;
        setNurseStats({ waitingTriage, activeBeds, pendingSamples });

        const docQ = q.filter(
          (t) =>
            t.doctor.toLowerCase().includes('jenkins') ||
            t.doctor.toLowerCase().includes('sarah') ||
            t.room.toLowerCase().includes('204')
        );
        const waitingCount = docQ.filter(
          (t) => t.status === 'WAITING' || t.status === 'TRIAGED' || t.status === 'READY_FOR_DOCTOR' || t.status === 'SCHEDULED'
        ).length;
        const labs = patientJourneyService.getLabOrders();
        const completedCount = docQ.filter((t) => t.status === 'COMPLETED').length;
        setAssistantStats({ waitingCount, labCount: labs.length, completedCount });

        const inpatientRounds = patientJourneyService.getInpatientRounds();
        setDoctorStats({ queueCount: docQ.length, inpatientCount: inpatientRounds.length });
      } catch {}
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('nh_data_sync', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('nh_data_sync', handleSync);
    };
  }, [isNurse, isAdmin, isAssistant, isDoctor]);

  const nurseNavIcons: Record<string, React.ReactNode> = {
    'triage-queue': <Users size={18} strokeWidth={1.75} />,
    'vitals': <Activity size={18} strokeWidth={1.75} />,
    'observation-beds': <BedDouble size={18} strokeWidth={1.75} />,
    'specimen-desk': <FlaskConical size={18} strokeWidth={1.75} />,
    'shift-handover': <Clock size={18} strokeWidth={1.75} />,
    'reports': <FileText size={18} strokeWidth={1.75} />,
  };

  const nurseNavItems: NavItem[] = NURSE_TABS.map((tab) => ({
    label: tab.label,
    path: `/nurse?tab=${tab.key}`,
    badge:
      tab.key === 'triage-queue' && nurseStats.waitingTriage > 0
        ? `${nurseStats.waitingTriage}`
        : tab.key === 'observation-beds' && nurseStats.activeBeds > 0
        ? `${nurseStats.activeBeds}`
        : tab.key === 'specimen-desk' && nurseStats.pendingSamples > 0
        ? `${nurseStats.pendingSamples}`
        : undefined,
    icon: nurseNavIcons[tab.key] || <Activity size={18} strokeWidth={1.75} />,
    allowedRoles: [RoleType.NURSE],
  }));

  const labTechNavItems: NavItem[] = [
    {
      label: '1. Test Queue & Entry',
      path: '/lab?tab=queue',
      badge: '24',
      icon: <FlaskConical size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.LAB_TECH],
    },
    {
      label: '2. Equipment Status',
      path: '/lab?tab=equipment',
      icon: <Activity size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.LAB_TECH],
    },
  ];

  const pathologistNavItems: NavItem[] = [
    {
      label: '1. Review Queue',
      path: '/lab?tab=review',
      badge: '14',
      icon: <ClipboardCheck size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.PATHOLOGIST],
    },
    {
      label: '2. Signed Reports',
      path: '/lab?tab=signed-reports',
      icon: <FileText size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.PATHOLOGIST],
    },
    {
      label: '3. Test Catalog & Ranges',
      path: '/lab?tab=catalog',
      icon: <ClipboardList size={18} strokeWidth={1.75} />,
      allowedRoles: [RoleType.PATHOLOGIST],
    },
  ];

  const visibleNavItems = isAdmin
    ? navItems
    : isReception
    ? receptionNavItems
    : isDoctor
    ? doctorNavItems
    : isAssistant
    ? assistantNavItems
    : isNurse
    ? nurseNavItems
    : isLabTech
    ? labTechNavItems
    : isPathologist
    ? pathologistNavItems
    : navItems.filter((item) => item.allowedRoles.includes(role));

  const location = useLocation();

  const isItemActive = (itemPath: string) => {
    if (itemPath.includes('?')) {
      const currentFull = location.pathname + location.search;
      if (currentFull === itemPath) return true;
      if (location.pathname === '/reception' && (!location.search || location.search === '') && itemPath === '/reception?tab=queue') {
        return true;
      }
      if (location.pathname === '/doctor' && (!location.search || location.search === '') && itemPath === '/doctor?tab=dashboard') {
        return true;
      }
      if (location.pathname === '/assistant' && (!location.search || location.search === '') && itemPath === '/assistant?tab=queue') {
        return true;
      }
      if (location.pathname === '/nurse' && itemPath.startsWith('/nurse?tab=')) {
        const currentTab = resolveNurseTab(new URLSearchParams(location.search).get('tab'));
        const itemTab = new URLSearchParams(itemPath.split('?')[1] || '').get('tab');
        if (currentTab === itemTab) return true;
      }
      if (location.pathname === '/lab' && itemPath.startsWith('/lab?tab=')) {
        const currentTab = new URLSearchParams(location.search).get('tab') || (role === RoleType.PATHOLOGIST ? 'review' : 'queue');
        const itemTab = new URLSearchParams(itemPath.split('?')[1] || '').get('tab');
        if (currentTab === itemTab) return true;
      }
      if (location.pathname === '/lab' && (!location.search || location.search === '') && itemPath === (role === RoleType.PATHOLOGIST ? '/lab?tab=review' : '/lab?tab=queue')) {
        return true;
      }
      return false;
    }
    return location.pathname === itemPath;
  };

  const getDepartmentTitle = (r: RoleType): string => {
    switch (r) {
      case RoleType.SUPER_ADMIN:
      case RoleType.HOSPITAL_ADMIN:
        return 'Hospital Administration';
      case RoleType.RECEPTIONIST:
      case RoleType.RECEPTION_SUPERVISOR:
        return 'Reception & Registration';
      case RoleType.DOCTOR:
      case RoleType.MEDICAL_SUPERINTENDENT:
        return 'Doctor OPD Station';
      case RoleType.DOCTOR_ASSISTANT:
        return 'Doctor Assistant Station';
      case RoleType.LAB_TECH:
      case RoleType.PATHOLOGIST:
        return 'Diagnostic Laboratory';
      case RoleType.SURGEON:
      case RoleType.ANESTHETIST:
      case RoleType.OT_MANAGER:
        return 'Operation Theatre (OT)';
      case RoleType.WARD_MANAGER:
        return 'Inpatient Care (IPD)';
      case RoleType.NURSE:
        return 'OPD Nurse Station & Triage';
      case RoleType.PHARMACIST:
        return 'Pharmacy Counter';
      case RoleType.CASHIER:
      case RoleType.FINANCE_MANAGER:
        return 'Billing & Accounts';
      case RoleType.PATIENT:
        return 'Patient Portal';
      case RoleType.DEPARTMENT_ADMIN:
        return `${user?.departmentName || 'Department'} Workspace`;
      default:
        return 'Department Workspace';
    }
  };

  const handleRoleSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as RoleType;
    switchRolePreview(selected);
    const roleRoutes: Record<RoleType, string> = {
      [RoleType.SUPER_ADMIN]: '/admin',
      [RoleType.HOSPITAL_ADMIN]: '/admin',
      [RoleType.DEPARTMENT_ADMIN]: user?.departmentId ? `/department/${user.departmentId}` : user?.departmentCode ? `/department/${user.departmentCode.toLowerCase().replace('dept-', '')}` : '/department/opd',
      [RoleType.RECEPTION_SUPERVISOR]: '/reception',
      [RoleType.RECEPTIONIST]: '/reception',
      [RoleType.DOCTOR]: '/doctor',
      [RoleType.DOCTOR_ASSISTANT]: '/assistant',
      [RoleType.MEDICAL_SUPERINTENDENT]: '/doctor',
      [RoleType.SURGEON]: '/ot',
      [RoleType.ANESTHETIST]: '/ot',
      [RoleType.OT_MANAGER]: '/ot',
      [RoleType.WARD_MANAGER]: '/ipd',
      [RoleType.NURSE]: '/nurse',
      [RoleType.PATHOLOGIST]: '/lab',
      [RoleType.LAB_TECH]: '/lab',
      [RoleType.PHARMACIST]: '/pharmacy',
      [RoleType.FINANCE_MANAGER]: '/billing',
      [RoleType.CASHIER]: '/billing',
      [RoleType.PATIENT]: '/patient',
    };
    navigate(roleRoutes[selected] || '/admin');
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar-container">
        {/* Brand Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Hospital size={20} color="#ffffff" strokeWidth={1.75} />
          </div>
          <div>
            <h1
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--secondary)',
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              North Hospital
            </h1>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                margin: '2px 0 0',
                lineHeight: 1.2,
              }}
            >
              Clinical Enterprise HMS
            </p>
          </div>
        </div>

        {/* Role Workspace Banner: Only Admin can switch workspaces */}
        {isAdmin && (
          <div className="sidebar-dept-block" style={{ marginBottom: '8px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '4px',
              }}
            >
              Active Role Workspace
            </div>
            <select
              value={role}
              onChange={handleRoleSwitch}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value={RoleType.HOSPITAL_ADMIN}>Hospital Admin</option>
              <option value={RoleType.DEPARTMENT_ADMIN}>Department Admin (OPD)</option>
              <option value={RoleType.RECEPTIONIST}>Receptionist</option>
              <option value={RoleType.DOCTOR}>Doctor (OPD)</option>
              <option value={RoleType.DOCTOR_ASSISTANT}>Doctor Assistant (Chamber 204)</option>
              <option value={RoleType.SURGEON}>Surgeon (OT)</option>
              <option value={RoleType.WARD_MANAGER}>Ward Manager (IPD)</option>
              <option value={RoleType.NURSE}>Nurse Station</option>
              <option value={RoleType.LAB_TECH}>Lab Technician</option>
              <option value={RoleType.CASHIER}>Cashier / Billing</option>
              <option value={RoleType.PHARMACIST}>Pharmacist</option>
              <option value={RoleType.PATIENT}>Patient Portal</option>
            </select>
          </div>
        )}

        {/* Consolidated Department & Station Context Block (§ 4 & § 5 SaaS Pattern) */}
        <WorkspaceSidebarContext
          title={getDepartmentTitle(role)}
          subtitle={user?.station || getStationLocation(role)}
          statusLabel="Active"
        />

        {/* Small section label above nav */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-light)',
            margin: '8px 0 4px 12px',
          }}
        >
          WORKSPACE
        </div>

        {/* Navigation Links: Filtered strictly for the logged-in department role */}
        <nav
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          {visibleNavItems.map((item) => {
            const active = isItemActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-nav-item ${active ? 'active' : ''}`}
                title={item.label}
              >
                <span className="sidebar-nav-icon">
                  {item.icon}
                </span>
                <span className="sidebar-nav-label" title={item.label}>
                  {item.label}
                </span>
                {item.badge && (
                  <span className="sidebar-badge">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Menu (§ 4 & § 5 SaaS Pattern) */}
        <div
          ref={userMenuRef}
          style={{
            position: 'relative',
            marginTop: 'auto',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          {/* Popover ABOVE trigger */}
          {isUserMenuOpen && (
            <div
              role="menu"
              aria-label="User Profile Menu"
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                padding: '12px',
                zIndex: 100,
                boxSizing: 'border-box',
              }}
            >
              {/* Header: name + designation */}
              <div
                style={{
                  paddingBottom: '10px',
                  borderBottom: '1px solid var(--border-color)',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.3,
                  }}
                  title={displayName}
                >
                  {displayName}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    marginTop: '2px',
                    lineHeight: 1.3,
                  }}
                >
                  {getDesignation()}
                </div>
              </div>

              {/* Rows: Employee ID, Department, Station, Email (rendered ONLY if field exists) */}
              {profileRows.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                  {profileRows.map((row) => (
                    <div
                      key={row.label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                      <span
                        style={{
                          fontWeight: 500,
                          color: 'var(--secondary)',
                          textAlign: 'right',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '120px',
                        }}
                        title={row.value}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Divider */}
              <div
                style={{
                  height: '1px',
                  backgroundColor: 'var(--border-color)',
                  margin: '8px 0',
                }}
              />

              {/* Log out item */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  navigate('/logout');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--danger)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--danger-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <LogOut size={15} color="var(--danger)" />
                <span>Log Out</span>
              </button>
            </div>
          )}

          {/* Trigger row */}
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '8px',
              borderRadius: '10px',
              backgroundColor: isUserMenuOpen ? 'var(--gray-100)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s ease',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--gray-100)';
            }}
            onMouseLeave={(e) => {
              if (!isUserMenuOpen) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {/* 36px circular avatar with initials */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {getUserInitials()}
            </div>

            {/* Name & Designation */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.3,
                }}
                title={displayName}
              >
                {displayName}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.3,
                  marginTop: '1px',
                }}
              >
                {getDesignation()}
              </div>
            </div>

            {/* Chevron */}
            <ChevronsUpDown size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">{children}</main>
    </div>
  );
};
