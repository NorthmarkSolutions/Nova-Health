import React from 'react';

export interface HeaderAction {
  label: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: HeaderAction[];
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions = [],
  children,
  className = '',
  style,
}) => {
  return (
    <header
      className={`page-header ${className}`}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '32px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#111827',
          }}
        >
          {title}
        </h1>
        {description && (
          <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
            {description}
          </p>
        )}
      </div>

      {(actions.length > 0 || children) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {actions.map((act, idx) => {
            const isPrimary = act.variant === 'primary';
            const isDanger = act.variant === 'danger';

            let bg = '#FFFFFF';
            let fg = '#111827';
            let border = '1px solid #E5E7EB';
            let weight = 500;

            if (isPrimary) {
              bg = '#2563EB';
              fg = '#FFFFFF';
              border = '1px solid #2563EB';
              weight = 600;
            } else if (isDanger) {
              bg = '#DC2626';
              fg = '#FFFFFF';
              border = '1px solid #DC2626';
              weight = 600;
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={act.disabled}
                onClick={act.onClick}
                style={{
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  border,
                  backgroundColor: bg,
                  color: fg,
                  fontSize: '14px',
                  fontWeight: weight,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: act.disabled ? 'not-allowed' : 'pointer',
                  opacity: act.disabled ? 0.6 : 1,
                  transition: 'opacity 0.15s ease, background-color 0.15s ease',
                }}
              >
                {act.icon}
                <span>{act.label}</span>
              </button>
            );
          })}
          {children}
        </div>
      )}
    </header>
  );
};

export default PageHeader;
