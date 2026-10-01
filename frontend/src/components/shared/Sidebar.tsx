import React from 'react';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeDot?: boolean;
  badgeDotColor?: string;
  href?: string;
  onClick?: () => void;
}

export interface SidebarProps {
  appName?: string;
  appSubtitle?: string;
  departmentBadge?: string;
  departmentName?: string;
  departmentLocation?: string;
  sectionTitle?: string;
  navItems: SidebarNavItem[];
  activeId: string;
  onSelectNav?: (id: string) => void;
  userName?: string;
  userRole?: string;
  userInitials?: string;
  onLogout?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Sidebar: React.FC<SidebarProps> = ({
  appName = 'North Hospital',
  appSubtitle = 'Clinical Enterprise HMS',
  departmentBadge = 'LAB',
  departmentName = 'Diagnostic Lab',
  departmentLocation = 'Ground floor · Block C',
  sectionTitle = 'WORKSPACE',
  navItems,
  activeId,
  onSelectNav,
  userName = 'Staff Member',
  userRole = 'Hospital Staff',
  userInitials = 'NH',
  onLogout,
  className = '',
  style,
}) => {
  return (
    <aside
      className={`app-sidebar-light ${className}`}
      style={{
        width: '260px',
        minWidth: '260px',
        maxWidth: '260px',
        flexShrink: 0,
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 16px',
        gap: '20px',
        position: 'sticky',
        top: 0,
        height: '100vh',
        boxSizing: 'border-box',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 40,
        ...style,
      }}
    >
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 4px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: '#2563EB',
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
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>
            {appName}
          </span>
          <span style={{ fontSize: '12px', color: '#6B7280', marginTop: '1px' }}>
            {appSubtitle}
          </span>
        </div>
      </div>

      {/* Department Context Card */}
      <div
        style={{
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>Current department</span>
          {departmentBadge && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                color: '#1D4ED8',
                backgroundColor: '#EFF6FF',
                borderRadius: '4px',
                padding: '1px 6px',
              }}
            >
              {departmentBadge}
            </span>
          )}
        </div>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
          {departmentName}
        </span>
        <span style={{ fontSize: '12px', color: '#6B7280' }}>
          {departmentLocation}
        </span>
      </div>

      {/* Navigation List */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {sectionTitle && (
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#6B7280',
              letterSpacing: '0.04em',
              padding: '0 12px 6px',
              textTransform: 'uppercase',
            }}
          >
            {sectionTitle}
          </span>
        )}
        {navItems.map((item) => {
          const isActive = item.id === activeId;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.onClick) item.onClick();
                if (onSelectNav) onSelectNav(item.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                height: '40px',
                padding: '0 12px',
                borderRadius: '10px',
                backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                color: isActive ? '#1D4ED8' : '#374151',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
                border: 'none',
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {item.icon ? (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: isActive ? '#1D4ED8' : '#6B7280',
                  }}
                >
                  {item.icon}
                </span>
              ) : (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '2px',
                    backgroundColor: isActive ? '#2563EB' : '#D1D5DB',
                    flexShrink: 0,
                  }}
                />
              )}
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.label}
              </span>
              {item.badge !== undefined && item.badge !== '' && (
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
              {item.badgeDot && (
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: item.badgeDotColor || '#F59E0B',
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 0 0 0',
          borderTop: '1px solid #E5E7EB',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 600,
            color: '#374151',
            flexShrink: 0,
          }}
        >
          {userInitials}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#111827',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {userName}
          </span>
          <span
            style={{
              fontSize: '12px',
              color: '#6B7280',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {userRole}
          </span>
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            style={{
              fontSize: '13px',
              color: '#6B7280',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              padding: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6B7280';
            }}
          >
            Log out
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
