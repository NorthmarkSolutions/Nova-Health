import React from 'react';
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
  Activity,
  LogOut,
  Search,
} from 'lucide-react';
import { getDepartmentWorkspaces } from './departmentWorkspaceStore';

interface Props {
  workspace: DepartmentWorkspace;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onSwitchDepartment?: (departmentId: string) => void;
  customNavItems?: Array<{ id: string; label: string; icon: React.ReactNode; badge?: string }>;
  children: React.ReactNode;
}

export const DepartmentWorkspaceLayout: React.FC<Props> = ({
  workspace,
  activeTab,
  onSelectTab,
  onSwitchDepartment,
  customNavItems,
  children,
}) => {
  const { user, role, logout } = useAuth();
  const isHospitalAdmin = role === RoleType.HOSPITAL_ADMIN || role === RoleType.SUPER_ADMIN;
  const allWorkspaces = getDepartmentWorkspaces();

  const defaultNavItems = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'staff', label: 'Staff & roster', icon: <Users size={16} /> },
    { id: 'scheduling', label: 'Duty scheduling', icon: <Calendar size={16} /> },
    { id: 'doctors', label: 'Doctors & Chambers', icon: <Stethoscope size={16} /> },
    { id: 'rooms', label: 'Rooms & Facilities', icon: <DoorClosed size={16} /> },
    { id: 'operations', label: 'OPD Operations', icon: <Activity size={16} />, badge: 'Live' },
    { id: 'settings', label: 'Department settings', icon: <Settings size={16} /> },
    { id: 'reports', label: 'Reports & analytics', icon: <TrendingUp size={16} /> },
  ];

  const itemsToRender = customNavItems || defaultNavItems;

  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Staff Member';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'U';

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>
      {/* WHITE SIDEBAR */}
      <aside
        style={{
          width: '260px',
          flexShrink: 0,
          background: '#FFFFFF',
          borderRight: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 16px',
          gap: '20px',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 4px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '16px',
              flexShrink: 0,
            }}
          >
            N
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>North Hospital</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>Department workspace</span>
          </div>
        </div>

        {/* Department Card */}
        <div
          style={{
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>Current department</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: 'monospace',
                color: '#1D4ED8',
                background: '#EFF6FF',
                borderRadius: '4px',
                padding: '1px 6px',
              }}
            >
              {workspace.departmentCode?.replace('DEPT-', '') || 'DEPT'}
            </span>
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{workspace.departmentName}</span>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>{workspace.operatingHours || 'Operational Hours'}</span>

          {isHospitalAdmin && onSwitchDepartment && (
            <div style={{ marginTop: '8px' }}>
              <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                Switch workspace:
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  fontSize: '12px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  color: '#111827',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                value={workspace.departmentId}
                onChange={(e) => onSwitchDepartment(e.target.value)}
              >
                {allWorkspaces.map((w) => (
                  <option key={w.id} value={w.departmentId}>
                    {w.departmentName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#6B7280',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '0 12px 6px',
            }}
          >
            DEPARTMENT
          </span>

          {itemsToRender.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  background: isActive ? '#EFF6FF' : 'transparent',
                  color: isActive ? '#1D4ED8' : '#374151',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background 0.12s ease',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '2px',
                    background: isActive ? '#2563EB' : '#D1D5DB',
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: isActive ? '#1D4ED8' : '#6B7280',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px',
            borderTop: '1px solid #E5E7EB',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#111827',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>
              {user?.designation ||
                (role === RoleType.DEPARTMENT_ADMIN
                  ? `${workspace?.shortName || workspace?.departmentName || 'Department'} Admin`
                  : 'Hospital Admin')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            title="Sign out"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div
          style={{
            minHeight: '60px',
            background: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 24px',
            flexWrap: 'wrap',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: '#6B7280',
              flex: 1,
              minWidth: '200px',
              flexWrap: 'wrap',
              whiteSpace: 'nowrap',
            }}
          >
            <span>Departments</span>
            <span>/</span>
            <span>{workspace.departmentName}</span>
            <span>/</span>
            <span style={{ color: '#111827', fontWeight: 500, textTransform: 'capitalize' }}>
              {itemsToRender.find((i) => i.id === activeTab)?.label || activeTab}
            </span>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#15803D',
                background: '#F0FDF4',
                borderRadius: '999px',
                padding: '2px 8px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} />
              Live
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '36px',
              padding: '0 12px',
              border: '1px solid #E5E7EB',
              borderRadius: '10px',
              width: '280px',
              maxWidth: '100%',
              color: '#6B7280',
              fontSize: '13px',
              background: '#FFFFFF',
            }}
          >
            <Search size={14} />
            <span>Search staff, equipment or test</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: '36px',
              padding: '0 12px',
              border: '1px solid #E5E7EB',
              borderRadius: '10px',
              fontSize: '13px',
              color: '#374151',
              whiteSpace: 'nowrap',
              background: '#FFFFFF',
            }}
          >
            Today · {today} ▾
          </div>
        </div>

        {/* Page body */}
        <div style={{ padding: '24px', flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
};
