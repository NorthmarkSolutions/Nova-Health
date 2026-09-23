import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
} from 'lucide-react';

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

  const navItems: NavItem[] = [
    {
      label: 'Admin Overview',
      path: '/admin',
      icon: <ShieldCheck size={20} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN],
    },
    {
      label: 'Dept. Workspaces',
      path: '/department/opd',
      badge: 'Engine',
      icon: <Building2 size={20} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN],
    },
    {
      label: '1. Reception & Queue',
      path: '/reception',
      badge: 'Desk',
      icon: <UserPlus size={20} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.RECEPTIONIST, RoleType.RECEPTION_SUPERVISOR],
    },
    {
      label: '2. Doctor OPD Station',
      path: '/doctor',
      badge: 'OPD',
      icon: <Stethoscope size={20} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR, RoleType.MEDICAL_SUPERINTENDENT],
    },
    {
      label: 'Doctor Assistant Desk',
      path: '/assistant',
      badge: 'Ante-Room',
      icon: <UserCheck size={20} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.DOCTOR_ASSISTANT],
    },
    {
      label: '3. Lab & Diagnostics',
      path: '/lab',
      badge: 'Lab',
      icon: <FlaskConical size={20} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.LAB_TECH, RoleType.PATHOLOGIST],
    },
    {
      label: '4. Operation Theatre',
      path: '/ot',
      badge: 'OT',
      icon: <Scissors size={20} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.SURGEON, RoleType.ANESTHETIST, RoleType.OT_MANAGER],
    },
    {
      label: '5. Inpatient Care (IPD)',
      path: '/ipd',
      badge: 'IPD',
      icon: <BedDouble size={20} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.WARD_MANAGER, RoleType.NURSE, RoleType.DOCTOR],
    },
    {
      label: '6. Billing & Accounts',
      path: '/billing',
      badge: 'Cash',
      icon: <Receipt size={20} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.CASHIER, RoleType.FINANCE_MANAGER],
    },
    {
      label: 'Nurse Station',
      path: '/nurse',
      icon: <Activity size={20} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.NURSE],
    },
    {
      label: 'Pharmacy Counter',
      path: '/pharmacy',
      icon: <Pill size={20} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.PHARMACIST],
    },
    {
      label: 'Patient Companion',
      path: '/patient',
      icon: <UserCircle size={20} />,
      allowedRoles: [RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN, RoleType.PATIENT],
    },
  ];

  const isAdmin = role === RoleType.SUPER_ADMIN || role === RoleType.HOSPITAL_ADMIN;
  const isReception = role === RoleType.RECEPTIONIST || role === RoleType.RECEPTION_SUPERVISOR;
  const isDoctor = role === RoleType.DOCTOR || role === RoleType.MEDICAL_SUPERINTENDENT;
  const isAssistant = role === RoleType.DOCTOR_ASSISTANT;
  const isNurse = role === RoleType.NURSE;

  const receptionNavItems: NavItem[] = [
    {
      label: '1. Live Token Queue',
      path: '/reception?tab=queue',
      badge: 'Desk',
      icon: <UserPlus size={20} />,
      allowedRoles: [RoleType.RECEPTIONIST, RoleType.RECEPTION_SUPERVISOR],
    },
    {
      label: '2. Doctor Schedules',
      path: '/reception?tab=appointments',
      badge: 'OPD',
      icon: <Stethoscope size={20} />,
      allowedRoles: [RoleType.RECEPTIONIST, RoleType.RECEPTION_SUPERVISOR],
    },
    {
      label: '3. Counter Billing & Cash',
      path: '/reception?tab=billing',
      badge: 'Cash',
      icon: <Receipt size={20} />,
      allowedRoles: [RoleType.RECEPTIONIST, RoleType.RECEPTION_SUPERVISOR],
    },
    {
      label: '4. Patient Master UHID',
      path: '/reception?tab=search',
      badge: 'Directory',
      icon: <UserCircle size={20} />,
      allowedRoles: [RoleType.RECEPTIONIST, RoleType.RECEPTION_SUPERVISOR],
    },
    {
      label: '5. Observation & Beds',
      path: '/reception?tab=daycare',
      badge: 'Beds',
      icon: <BedDouble size={20} />,
      allowedRoles: [RoleType.RECEPTIONIST, RoleType.RECEPTION_SUPERVISOR],
    },
  ];

  const doctorNavItems: NavItem[] = [
    {
      label: '1. Dashboard',
      path: '/doctor?tab=dashboard',
      badge: 'Home',
      icon: <LayoutDashboard size={20} />,
      allowedRoles: [RoleType.DOCTOR, RoleType.MEDICAL_SUPERINTENDENT],
    },
    {
      label: '2. Queue & Appointments',
      path: '/doctor?tab=queue',
      badge: 'Queue',
      icon: <Users size={20} />,
      allowedRoles: [RoleType.DOCTOR, RoleType.MEDICAL_SUPERINTENDENT],
    },
    {
      label: '3. Patient Consultation & Rx',
      path: '/doctor?tab=consultation',
      badge: 'Active',
      icon: <Stethoscope size={20} />,
      allowedRoles: [RoleType.DOCTOR, RoleType.MEDICAL_SUPERINTENDENT],
    },
    {
      label: '4. My Schedule',
      path: '/doctor?tab=schedule',
      badge: 'Roster',
      icon: <Clock size={20} />,
      allowedRoles: [RoleType.DOCTOR, RoleType.MEDICAL_SUPERINTENDENT],
    },
    {
      label: '5. Reports & Analytics',
      path: '/doctor?tab=reports',
      badge: 'Stats',
      icon: <BarChart2 size={20} />,
      allowedRoles: [RoleType.DOCTOR, RoleType.MEDICAL_SUPERINTENDENT],
    },
    {
      label: '6. Inpatient Rounds',
      path: '/doctor?tab=inpatient',
      badge: 'Wards',
      icon: <BedDouble size={20} />,
      allowedRoles: [RoleType.DOCTOR, RoleType.MEDICAL_SUPERINTENDENT],
    },
  ];

  const assistantNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/assistant?tab=dashboard',
      badge: 'Overview',
      icon: <LayoutDashboard size={20} />,
      allowedRoles: [RoleType.DOCTOR_ASSISTANT],
    },
    {
      label: '1. Queue & Preparation',
      path: '/assistant?tab=queue',
      badge: 'Chamber',
      icon: <Users size={20} />,
      allowedRoles: [RoleType.DOCTOR_ASSISTANT],
    },
    {
      label: '2. Investigations & Reports',
      path: '/assistant?tab=investigations',
      badge: 'Labs',
      icon: <FlaskConical size={20} />,
      allowedRoles: [RoleType.DOCTOR_ASSISTANT],
    },
    {
      label: '3. Consultation Handoff',
      path: '/assistant?tab=handoff',
      badge: 'Dispatch',
      icon: <CheckCircle2 size={20} />,
      allowedRoles: [RoleType.DOCTOR_ASSISTANT],
    },
  ];

  const nurseNavItems: NavItem[] = [
    {
      label: '1. Triage Queue',
      path: '/nurse?tab=triage-queue',
      badge: 'Triage',
      icon: <Users size={20} />,
      allowedRoles: [RoleType.NURSE],
    },
    {
      label: '2. Vitals & Assessment',
      path: '/nurse?tab=vitals',
      badge: 'Vitals',
      icon: <Activity size={20} />,
      allowedRoles: [RoleType.NURSE],
    },
    {
      label: '3. Clinical Tasks',
      path: '/nurse?tab=tasks',
      badge: 'Orders',
      icon: <ClipboardCheck size={20} />,
      allowedRoles: [RoleType.NURSE],
    },
    {
      label: '4. Observation Beds',
      path: '/nurse?tab=observation',
      badge: 'Beds',
      icon: <HeartPulse size={20} />,
      allowedRoles: [RoleType.NURSE],
    },
    {
      label: '5. Shift & Handover',
      path: '/nurse?tab=handover',
      badge: 'Shift',
      icon: <Clock size={20} />,
      allowedRoles: [RoleType.NURSE],
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
      if (location.pathname === '/nurse' && (!location.search || location.search === '') && itemPath === '/nurse?tab=triage-queue') {
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
      [RoleType.DEPARTMENT_ADMIN]: user?.departmentCode ? `/department/${user.departmentCode.toLowerCase().replace('dept-', '')}` : '/department/opd',
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
      <aside
        style={{
          width: '260px',
          backgroundColor: 'var(--secondary)',
          color: 'var(--text-inverse)',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--secondary-light)',
          flexShrink: 0,
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            borderBottom: '1px solid var(--secondary-light)',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Hospital size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
              North Hospital
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Clinical Enterprise HMS</p>
          </div>
        </div>

        {/* Role Workspace Banner: Only Admin can switch workspaces. Department users see locked badge */}
        {isAdmin ? (
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'rgba(2, 132, 199, 0.15)',
              borderBottom: '1px solid rgba(2, 132, 199, 0.3)',
            }}
          >
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
              Active Role Workspace
            </div>
            <select
              value={role}
              onChange={handleRoleSwitch}
              style={{
                width: '100%',
                padding: '0.375rem 0.5rem',
                borderRadius: '6px',
                backgroundColor: 'var(--secondary-light)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
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
        ) : (
          <div
            style={{
              padding: '0.875rem 1.25rem',
              backgroundColor: 'rgba(2, 132, 199, 0.1)',
              borderBottom: '1px solid rgba(2, 132, 199, 0.25)',
            }}
          >
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Assigned Department
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
              {getDepartmentTitle(role)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
              Department Dedicated Session
            </div>
          </div>
        )}

        {/* Navigation Links: Filtered strictly for the logged-in department role */}
        <nav style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.375rem', overflowY: 'auto' }}>
          {visibleNavItems.map((item) => {
            const active = isItemActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: active ? '#ffffff' : 'var(--text-light)',
                  backgroundColor: active ? 'var(--primary)' : 'transparent',
                  boxShadow: active ? '0 2px 8px rgba(2, 132, 199, 0.4)' : 'none',
                  transition: 'var(--transition)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    style={{
                      fontSize: '0.625rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      fontWeight: 800,
                      backgroundColor: active ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                      color: active ? '#ffffff' : 'var(--text-light)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Live Desk Telemetry Widget for Receptionist */}
        {isReception && (
          <div
            style={{
              margin: '0.5rem 1rem 1rem 1rem',
              padding: '0.875rem 1rem',
              backgroundColor: 'rgba(2, 132, 199, 0.12)',
              border: '1px solid rgba(2, 132, 199, 0.28)',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary-light)', letterSpacing: '0.05em' }}>
                Active Station
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.6875rem', color: '#4ade80', fontWeight: 700 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
                Online
              </span>
            </div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>
              Desk #01 • Morning Shift
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.15rem' }}>
              OPD Ground Floor • Bay 01
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.6rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Cash Float:</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#38bdf8' }}>$985.00</span>
            </div>
          </div>
        )}

        {/* Live Clinical Telemetry Widget for Doctor */}
        {isDoctor && (
          <div
            style={{
              margin: '0.5rem 1rem 1rem 1rem',
              padding: '1rem',
              backgroundColor: 'rgba(2, 132, 199, 0.12)',
              border: '1px solid rgba(2, 132, 199, 0.28)',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary-light)', letterSpacing: '0.05em' }}>
                Clinical Chamber
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#4ade80', fontWeight: 700 }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
                In Session
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>
              Chamber 204 • OPD Block B
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-light)', marginTop: '0.2rem' }}>
              Cardiology / Internal Medicine
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.65rem', paddingTop: '0.55rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-light)' }}>On-Duty Lead:</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#38bdf8' }}>Dr. Sarah Jenkins</span>
            </div>
          </div>
        )}

        {/* Live Chamber Telemetry Widget for Doctor Assistant */}
        {isAssistant && (
          <div
            style={{
              margin: '0.5rem 1rem 1rem 1rem',
              padding: '0.875rem 1rem',
              backgroundColor: 'rgba(2, 132, 199, 0.12)',
              border: '1px solid rgba(2, 132, 199, 0.28)',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary-light)', letterSpacing: '0.05em' }}>
                Assigned Chamber
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.6875rem', color: '#4ade80', fontWeight: 700 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80' }} />
                Active Shift
              </span>
            </div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>
              Chamber 204 • Ante-Room
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.15rem' }}>
              Lead: Dr. Sarah Jenkins
            </div>
          </div>
        )}

        {/* Live Triage Station Telemetry Widget for Nurse */}
        {isNurse && (
          <div
            style={{
              margin: '0.5rem 1rem 1rem 1rem',
              padding: '1rem',
              backgroundColor: 'rgba(5, 150, 105, 0.14)',
              border: '1px solid rgba(5, 150, 105, 0.3)',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#6ee7b7', letterSpacing: '0.05em' }}>
                Triage Station
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#4ade80', fontWeight: 700 }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
                Active Desk
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>
              Station 01 • OPD Ground Floor
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-light)', marginTop: '0.2rem' }}>
              Morning Roster (07:00 – 15:00)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.65rem', paddingTop: '0.55rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-light)' }}>Lead RN:</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#6ee7b7' }}>Nurse Clara Adams</span>
            </div>
          </div>
        )}

        {/* User Profile & Clear Logout Button */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid var(--secondary-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary-light)', fontWeight: 600 }}>
                {(role || 'HOSPITAL_ADMIN').replace('_', ' ')}
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/logout')}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              cursor: 'pointer',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
              e.currentTarget.style.color = '#fca5a5';
            }}
            title="Safely exit and return to login"
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">{children}</main>
    </div>
  );
};
