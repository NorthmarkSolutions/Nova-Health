import React from 'react';

export interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendColor?: string;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
  subtext?: string;
}

/**
 * KpiCard
 * Standardized 120px KPI card according to HMS Design Bible § 9.
 * Matches existing Nurse KPI cards with 120px height, radius, soft shadow, clean metric + trend scanning.
 */
export const KpiCard: React.FC<KpiCardProps> = ({
  icon,
  label,
  value,
  trend,
  trendColor,
  iconBg,
  iconColor,
  valueColor,
  subtext,
}) => {
  return (
    <div className="kpi-card" style={subtext ? { height: 'auto', minHeight: '120px' } : undefined}>
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        <div
          className="kpi-icon-box"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>
      <div>
        <div className="kpi-metric-row">
          <span className="kpi-metric" style={valueColor ? { color: valueColor } : undefined}>
            {value}
          </span>
          {trend && (
            <span
              className="kpi-trend"
              style={trendColor ? { color: trendColor } : undefined}
            >
              {trend}
            </span>
          )}
        </div>
        {subtext && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.3 }}>
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
};

export default KpiCard;
