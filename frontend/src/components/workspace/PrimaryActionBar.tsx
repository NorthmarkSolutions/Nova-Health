import React from 'react';

export interface ActionButtonConfig {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  title?: string;
  className?: string;
}

export interface PrimaryActionBarProps {
  secondaryAction?: React.ReactNode | ActionButtonConfig;
  primaryAction: React.ReactNode | ActionButtonConfig;
  statusText?: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * PrimaryActionBar
 * Generic pinned bottom footer pattern according to HMS Design Bible § 11 & § 13.
 * Pins to bottom of viewport or scrolling container, hosting secondary draft save, status indicators,
 * validation warnings, and primary workflow progression CTA.
 */
export const PrimaryActionBar: React.FC<PrimaryActionBarProps> = ({
  secondaryAction,
  primaryAction,
  statusText,
  hint,
  className = 'pinned-action-footer',
  style,
}) => {
  const renderAction = (
    action: React.ReactNode | ActionButtonConfig,
    defaultVariant: 'primary' | 'secondary'
  ) => {
    if (!action) return null;
    if (React.isValidElement(action)) return action;

    const config = action as ActionButtonConfig;
    const variant = config.variant || defaultVariant;
    const isPrimary = variant === 'primary';
    const isDanger = variant === 'danger';

    let btnClass = 'btn';
    if (config.className) {
      btnClass = config.className;
    } else if (isPrimary) {
      btnClass = 'btn btn-primary';
    } else if (isDanger) {
      btnClass = 'btn btn-danger';
    } else {
      btnClass = 'btn btn-secondary';
    }

    return (
      <button
        type="button"
        className={btnClass}
        onClick={config.onClick}
        disabled={config.disabled}
        title={config.title}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: isPrimary ? '8px' : '6px',
          height: '40px',
          padding: isPrimary ? '0 18px' : '0 16px',
          borderRadius: '10px',
          opacity: config.disabled ? 0.5 : 1,
          cursor: config.disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {isPrimary ? (
          <>
            <span>{config.label}</span>
            {config.icon}
          </>
        ) : (
          <>
            {config.icon}
            <span>{config.label}</span>
          </>
        )}
      </button>
    );
  };

  return (
    <div
      className={className}
      style={{
        position: 'sticky',
        bottom: 0,
        flexShrink: 0,
        borderTop: '1px solid var(--border-color)',
        backgroundColor: '#ffffff',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        boxSizing: 'border-box',
        zIndex: 10,
        ...style,
      }}
    >
      {/* Left: Secondary action + Status text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {renderAction(secondaryAction, 'secondary')}
        {statusText && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {statusText}
          </div>
        )}
      </div>

      {/* Right: Validation hint + Primary CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {hint && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {hint}
          </span>
        )}
        {renderAction(primaryAction, 'primary')}
      </div>
    </div>
  );
};

export default PrimaryActionBar;
