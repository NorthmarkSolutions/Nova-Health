import React from 'react';

export interface WorkspaceSidebarContextProps {
  title: string;
  subtitle?: string;
  statusLabel?: string;
}

/**
 * WorkspaceSidebarContext
 * Consolidated Department & Station context block for the sidebar top (§ 4 & § 5 SaaS Pattern).
 * Displays department title, active status indicator dot, and physical station/location line.
 */
export const WorkspaceSidebarContext: React.FC<WorkspaceSidebarContextProps> = ({
  title,
  subtitle,
  statusLabel = 'Active',
}) => {
  return (
    <div className="sidebar-dept-block">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--secondary)',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={title}
        >
          {title}
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            color: 'var(--success)',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--success)',
              display: 'inline-block',
            }}
          />
          {statusLabel}
        </div>
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            marginTop: '4px',
            lineHeight: 1.3,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};

export default WorkspaceSidebarContext;
