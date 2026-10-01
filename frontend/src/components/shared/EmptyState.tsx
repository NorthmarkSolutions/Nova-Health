import React from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
  style,
}) => {
  return (
    <div
      className={`empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: '12px',
        ...style,
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: '#F3F4F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6B7280',
          marginBottom: '4px',
        }}
      >
        {icon || <Inbox size={24} />}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '400px' }}>
        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
          {title}
        </h4>
        {description && (
          <p style={{ margin: 0, fontSize: '13px', color: '#6B7280', lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: '8px',
            height: '36px',
            padding: '0 16px',
            borderRadius: '10px',
            border: '1px solid #2563EB',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
