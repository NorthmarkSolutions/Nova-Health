import React from 'react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'primary' | 'info' | 'neutral';

export interface StatusChipProps {
  label: React.ReactNode;
  tone?: StatusTone;
  variant?: 'pill' | 'rounded' | 'badge';
  dot?: boolean;
  dotColor?: string;
  prefix?: React.ReactNode;
  bordered?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const TONE_STYLES: Record<StatusTone, { bg: string; color: string; border?: string; dot: string }> = {
  success: {
    bg: '#F0FDF4',
    color: '#15803D',
    border: '#DCFCE7',
    dot: '#16A34A',
  },
  warning: {
    bg: '#FFFBEB',
    color: '#B45309',
    border: '#FDE68A',
    dot: '#F59E0B',
  },
  danger: {
    bg: '#FEF2F2',
    color: '#B91C1C',
    border: '#FECACA',
    dot: '#DC2626',
  },
  primary: {
    bg: '#EFF6FF',
    color: '#1D4ED8',
    border: '#BFDBFE',
    dot: '#2563EB',
  },
  info: {
    bg: '#E0F2FE',
    color: '#0369A1',
    border: '#BAE6FD',
    dot: '#0284C7',
  },
  neutral: {
    bg: '#F3F4F6',
    color: '#374151',
    border: '#E5E7EB',
    dot: '#9CA3AF',
  },
};

export const StatusChip: React.FC<StatusChipProps> = ({
  label,
  tone = 'neutral',
  variant = 'pill',
  dot = false,
  dotColor,
  prefix,
  bordered = false,
  className = '',
  style,
}) => {
  const toneStyle = TONE_STYLES[tone] || TONE_STYLES.neutral;
  const borderRadius = variant === 'pill' ? '999px' : variant === 'rounded' ? '6px' : '4px';

  return (
    <span
      className={`status-chip ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        whiteSpace: 'nowrap',
        fontSize: '12px',
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius,
        backgroundColor: toneStyle.bg,
        color: toneStyle.color,
        border: bordered || toneStyle.border ? `1px solid ${toneStyle.border}` : 'none',
        lineHeight: 1.25,
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: dotColor || toneStyle.dot,
            flexShrink: 0,
          }}
        />
      )}
      {prefix && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{prefix}</span>}
      <span>{label}</span>
    </span>
  );
};

export default StatusChip;
