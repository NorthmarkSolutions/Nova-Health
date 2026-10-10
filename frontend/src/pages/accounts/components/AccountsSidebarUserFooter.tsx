import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export interface AccountsSidebarUserFooterProps {
  customName?: string;
  customRole?: string;
  customInitials?: string;
}

export const AccountsSidebarUserFooter: React.FC<AccountsSidebarUserFooterProps> = ({
  customName,
  customRole,
  customInitials,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayName =
    customName ||
    `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
    user?.username ||
    'Finance Staff';

  const designation =
    customRole ||
    (user?.role ? user.role.replace(/_/g, ' ') : 'Accounts & Finance');

  const initials =
    customInitials ||
    displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    'AF';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '16px 20px',
        borderTop: '1px solid #e5e7eb',
        background: '#ffffff',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: '#eff6ff',
          color: '#1d4ed8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#111827',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#6b7280',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {designation}
        </div>
      </div>
      <button
        onClick={handleLogout}
        title="Log Out"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#9ca3af',
          padding: '4px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
      >
        <LogOut size={16} />
      </button>
    </div>
  );
};
