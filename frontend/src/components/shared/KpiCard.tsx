import React from 'react';

export type KpiCardTone = 'default' | 'warning' | 'danger' | 'success';

export interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: React.ReactNode;
  badge?: React.ReactNode;
  badgeTone?: 'success' | 'warning' | 'danger' | 'neutral' | 'primary';
  badgeAction?: () => void;
  tone?: KpiCardTone;
  valueColor?: string;
  layout?: 'stacked' | 'inline'; // 'stacked': value above subtext; 'inline': value and subtext on same baseline
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  success: { bg: '#F0FDF4', color: '#15803D' },
  warning: { bg: '#FFFBEB', color: '#B45309' },
  danger: { bg: '#FEF2F2', color: '#B91C1C' },
  primary: { bg: '#EFF6FF', color: '#1D4ED8' },
  neutral: { bg: '#F3F4F6', color: '#374151' },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtext,
  badge,
  badgeTone = 'neutral',
  badgeAction,
  tone = 'default',
  valueColor,
  layout = 'stacked',
  onClick,
  className = '',
  style,
}) => {
  let borderColor = '#E5E7EB';
  let defaultValColor = '#111827';

  if (tone === 'danger') {
    borderColor = '#FECACA';
    defaultValColor = '#B91C1C';
  } else if (tone === 'warning') {
    borderColor = '#FDE68A';
    defaultValColor = '#B45309';
  } else if (tone === 'success') {
    borderColor = '#DCFCE7';
    defaultValColor = '#15803D';
  }

  const finalValColor = valueColor || defaultValColor;
  const bStyle = BADGE_STYLES[badgeTone] || BADGE_STYLES.neutral;

  return (
    <div
      className={`kpi-card ${className}`}
      onClick={onClick}
      style={{
        backgroundColor: '#FFFFFF',
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '20px',
        minHeight: '120px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>{label}</span>
        {badge && (
          badgeAction ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                badgeAction();
              }}
              style={{
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '999px',
                backgroundColor: bStyle.bg,
                color: bStyle.color,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {badge}
            </button>
          ) : (
            <span
              style={{
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '999px',
                backgroundColor: bStyle.bg,
                color: bStyle.color,
              }}
            >
              {badge}
            </span>
          )
        )}
      </div>

      {layout === 'inline' ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: finalValColor }}>
            {value}
          </span>
          {subtext && <span style={{ fontSize: '13px', color: '#6B7280' }}>{subtext}</span>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: finalValColor }}>
            {value}
          </span>
          {subtext && <span style={{ fontSize: '12px', color: '#6B7280' }}>{subtext}</span>}
        </div>
      )}
    </div>
  );
};

export default KpiCard;
