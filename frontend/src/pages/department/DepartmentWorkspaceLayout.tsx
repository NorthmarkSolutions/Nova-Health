import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleType, DepartmentWorkspace } from '../../types';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  DoorClosed,
  Calendar,
  Settings,
  TrendingUp,
  Hospital,
  Building2,
  LogOut,
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  Layers,
  Activity,
} from 'lucide-react';
import { getDepartmentWorkspaces } from './departmentWorkspaceStore';

interface Props {
  workspace: DepartmentWorkspace;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onSwitchDepartment?: (departmentId: string) => void;
  children: React.ReactNode;
}

export const DepartmentWorkspaceLayout: React.FC<Props> = ({
  workspace,
  activeTab,
  onSelectTab,
  onSwitchDepartment,
  children,
}) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const isHospitalAdmin = role === RoleType.HOSPITAL_ADMIN || role === RoleType.SUPER_ADMIN;
  const allWorkspaces = getDepartmentWorkspaces();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'staff', label: '1. Staff Pool & Roster', icon: <Users size={18} /> },
    { id: 'scheduling', label: '2. Duty Scheduling', icon: <Calendar size={18} /> },
    { id: 'doctors', label: '3. Doctors & Chambers', icon: <Stethoscope size={18} /> },
    { id: 'rooms', label: '4. Rooms & Facilities', icon: <DoorClosed size={18} /> },
    { id: 'settings', label: '5. Department Settings', icon: <Settings size={18} /> },
    { id: 'operations', label: '6. OPD Operations', icon: <Activity size={18} />, badge: 'Live Desk' },
    { id: 'reports', label: 'Reports & Analytics', icon: <TrendingUp size={18} /> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      {/* Department Workspace Sidebar */}
      <aside
        style={{
          width: '260px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #1e293b',
          flexShrink: 0,
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Building2 size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              North Hospital
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              Department Engine
            </p>
          </div>
        </div>

        {/* Active Department Identifier */}
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'rgba(2, 132, 199, 0.12)',
            borderBottom: '1px solid rgba(2, 132, 199, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Workspace
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontFamily: 'monospace',
              }}
            >
              {workspace.departmentCode}
            </span>
          </div>

          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.3 }}>
            {workspace.departmentName}
          </div>

          {/* Department Switcher (for Hospital Admin only) */}
          {isHospitalAdmin && onSwitchDepartment && (
            <div style={{ marginTop: '0.625rem' }}>
              <label style={{ fontSize: '0.6875rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                Switch Department Workspace:
              </label>
              <select
                className="form-select"
                style={{
                  width: '100%',
                  padding: '0.3rem 0.5rem',
                  fontSize: '0.75rem',
                  backgroundColor: '#1e293b',
                  color: '#ffffff',
                  borderColor: '#334155',
                }}
                value={workspace.departmentId}
                onChange={(e) => onSwitchDepartment(e.target.value)}
              >
                {allWorkspaces.map((w) => (
                  <option key={w.id} value={w.departmentId}>
                    {w.departmentName} ({w.departmentCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isHospitalAdmin && (
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              Dedicated Department Session
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  textAlign: 'left',
                  width: '100%',
                  backgroundColor: isActive ? '#0284c7' : 'transparent',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.15s ease',
                }}
              >
                {item.icon}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      backgroundColor: isActive ? '#ffffff' : '#0284c7',
                      color: isActive ? '#0284c7' : '#ffffff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Profile & Return to Hospital Admin */}
        <div style={{ padding: '1rem', borderTop: '1px solid #1e293b' }}>
          {isHospitalAdmin && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/admin')}
              style={{
                width: '100%',
                marginBottom: '0.75rem',
                backgroundColor: '#1e293b',
                color: '#ffffff',
                borderColor: '#334155',
                fontSize: '0.75rem',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={13} /> Return to Hospital Admin
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                }}
              >
                {user?.firstName?.charAt(0) || 'U'}
              </div>
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>
                  {user?.firstName} {user?.lastName}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                  {role === RoleType.DEPARTMENT_ADMIN ? 'Department Admin' : 'Hospital Admin'}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="action-btn"
              onClick={() => logout()}
              title="Sign Out"
              style={{ color: '#94a3b8' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        {/* Top Header Bar */}
        <header
          style={{
            backgroundColor: '#ffffff',
            borderBottom: '1px solid var(--border-color)',
            padding: '1rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            <span>Departments</span>
            <ChevronRight size={14} />
            <strong style={{ color: 'var(--secondary)' }}>{workspace.departmentName}</strong>
            <ChevronRight size={14} />
            <span style={{ textTransform: 'capitalize' }}>{activeTab}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
              Workspace Live & Operational
            </span>
          </div>
        </header>

        {/* Tab Content Body */}
        <div style={{ padding: '2rem', flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
};
