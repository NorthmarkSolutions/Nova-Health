import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  const visibleNavItems = isAdmin ? navItems : navItems.filter((item) => item.allowedRoles.includes(role));

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
        return 'Nurse Station';
      case RoleType.PHARMACIST:
        return 'Pharmacy Counter';
      case RoleType.CASHIER:
      case RoleType.FINANCE_MANAGER:
        return 'Billing & Accounts';
      case RoleType.PATIENT:
        return 'Patient Portal';
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
      [RoleType.RECEPTION_SUPERVISOR]: '/reception',
      [RoleType.RECEPTIONIST]: '/reception',
      [RoleType.DOCTOR]: '/doctor',
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
              <option value={RoleType.RECEPTIONIST}>Receptionist</option>
              <option value={RoleType.DOCTOR}>Doctor (OPD)</option>
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
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
                color: isActive ? '#ffffff' : 'var(--text-light)',
                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                transition: 'var(--transition)',
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  style={{
                    fontSize: '0.625rem',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    fontWeight: 800,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    letterSpacing: '0.05em',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

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
                {role.replace('_', ' ')}
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
