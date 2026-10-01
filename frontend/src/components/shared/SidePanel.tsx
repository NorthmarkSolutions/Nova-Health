import React from 'react';

export interface PatientBannerInfo {
  avatarInitials?: string;
  name: string;
  demographics?: string;
  uhid?: string;
  doctorAndRoom?: string;
  sampleInfo?: string;
  collectedTime?: string;
  relevantHistory?: string[];
  location?: string;
}

export interface SidePanelProps {
  headerTag?: string;
  variantBadge?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  patientInfo?: PatientBannerInfo;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  headerTag = 'ACTIVE ORDER',
  variantBadge,
  title,
  subtitle,
  badge,
  patientInfo,
  children,
  footer,
  className = '',
  style,
}) => {
  return (
    <div
      className={`side-panel-wrapper ${className}`}
      style={{
        flex: '1 1 420px',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        ...style,
      }}
    >
      {/* Top Meta Bar */}
      {(headerTag || variantBadge) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {headerTag && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', letterSpacing: '0.04em' }}>
              {headerTag}
            </span>
          )}
          {variantBadge && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#1D4ED8',
                backgroundColor: '#EFF6FF',
                borderRadius: '6px',
                padding: '3px 8px',
              }}
            >
              {variantBadge}
            </span>
          )}
        </div>
      )}

      {/* Main Card Container */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(17, 24, 39, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Panel Header */}
        {(title || badge || patientInfo) && (
          <div
            style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              borderBottom: '1px solid #E5E7EB',
            }}
          >
            {(title || badge) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                  {typeof title === 'string' ? (
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#111827' }}>{title}</h3>
                  ) : (
                    title
                  )}
                  {subtitle && (
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>
                      {subtitle}
                    </div>
                  )}
                </div>
                {badge && <div style={{ flexShrink: 0 }}>{badge}</div>}
              </div>
            )}

            {/* Patient Context Banner */}
            {patientInfo && (
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: '#F9FAFB',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#374151',
                    flexShrink: 0,
                  }}
                >
                  {patientInfo.avatarInitials || patientInfo.name.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                    {patientInfo.name}
                    {patientInfo.demographics && ` · ${patientInfo.demographics}`}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>
                    {patientInfo.uhid && `${patientInfo.uhid} · `}
                    {patientInfo.doctorAndRoom || patientInfo.location || ''}
                  </span>
                </div>
                {(patientInfo.sampleInfo || patientInfo.collectedTime) && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                    {patientInfo.sampleInfo && <span style={{ fontSize: '12px', color: '#6B7280' }}>{patientInfo.sampleInfo}</span>}
                    {patientInfo.collectedTime && <span style={{ fontSize: '12px', color: '#6B7280' }}>{patientInfo.collectedTime}</span>}
                  </div>
                )}
              </div>
            )}

            {/* Relevant Clinical History Tags */}
            {patientInfo?.relevantHistory && patientInfo.relevantHistory.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {patientInfo.relevantHistory.map((hist, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      color: '#374151',
                    }}
                  >
                    {hist}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Panel Body Content */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>

        {/* Panel Footer Slot */}
        {footer && (
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default SidePanel;
