import React from 'react';

export interface WorkspaceHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * WorkspaceHeader
 * Standardized header according to HMS Design Bible § 5.
 * Contains page title, clinical/workspace description, icon badge, and right-aligned action buttons.
 * NO badge slot, NO identity/context line (identity belongs strictly in sidebar & user menu).
 */
export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  title,
  description,
  icon,
  actions,
}) => {
  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {icon && (
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
          )}
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: 'var(--secondary)',
              letterSpacing: '-0.02em',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
        </div>
        {description && (
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              margin: '6px 0 0',
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </header>
  );
};

export default WorkspaceHeader;
