import React from 'react';

export interface PipelineStep {
  label: string;
  time?: string;
  status?: 'completed' | 'current' | 'future';
}

export interface ProgressBarProps {
  variant?: 'linear' | 'pipeline' | 'range-bar' | 'journey-list';
  // Linear props
  value?: number; // 0 to 100
  barColor?: string;
  height?: number | string;
  // Pipeline props
  steps?: PipelineStep[];
  currentStepIndex?: number;
  // Range-bar props
  rangeLow?: number;
  rangeHigh?: number;
  currentValue?: number | null;
  isAbnormal?: boolean;
  isCritical?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  variant = 'linear',
  value = 0,
  barColor = '#2563EB',
  height = 8,
  steps = [],
  currentStepIndex = 0,
  rangeLow = 0,
  rangeHigh = 100,
  currentValue,
  isAbnormal = false,
  isCritical = false,
  className = '',
  style,
}) => {
  if (variant === 'range-bar') {
    const hasVal = currentValue !== null && currentValue !== undefined;
    let pos = 50;
    if (hasVal && rangeHigh > rangeLow) {
      const clamped = Math.max(rangeLow - (rangeHigh - rangeLow) * 0.5, Math.min(rangeHigh + (rangeHigh - rangeLow) * 0.5, currentValue));
      pos = 25 + ((clamped - rangeLow) / (rangeHigh - rangeLow)) * 50;
      pos = Math.max(3, Math.min(97, pos));
    }
    const markerColor = isCritical ? '#DC2626' : isAbnormal ? '#F59E0B' : '#16A34A';

    return (
      <div
        className={`range-bar-container ${className}`}
        style={{
          position: 'relative',
          height: '6px',
          borderRadius: '3px',
          backgroundColor: '#F3F4F6',
          width: '100%',
          ...style,
        }}
      >
        {/* Normal Reference Range Band (25% to 75%) */}
        <div
          style={{
            position: 'absolute',
            left: '25%',
            width: '50%',
            top: 0,
            bottom: 0,
            borderRadius: '3px',
            backgroundColor: '#DCFCE7',
          }}
        />
        {/* Value marker */}
        {hasVal && (
          <div
            style={{
              position: 'absolute',
              top: '-4px',
              width: '4px',
              height: '14px',
              borderRadius: '2px',
              marginLeft: '-2px',
              left: `${pos}%`,
              backgroundColor: markerColor,
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              transition: 'left 0.2s ease',
            }}
          />
        )}
      </div>
    );
  }

  if (variant === 'pipeline') {
    return (
      <div
        className={`pipeline-steps-grid ${className}`}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${steps.length || 8}, minmax(0, 1fr))`,
          gap: '4px',
          ...style,
        }}
      >
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const barBg = isCompleted ? '#2563EB' : isCurrent ? '#93C5FD' : '#E5E7EB';
          const fg = isCompleted || isCurrent ? '#111827' : '#9CA3AF';
          const weight = isCurrent ? 600 : 400;

          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ height: '4px', borderRadius: '2px', backgroundColor: barBg }} />
              <span style={{ fontSize: '11px', lineHeight: 1.25, color: fg, fontWeight: weight }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === 'journey-list') {
    return (
      <div
        className={`journey-list ${className}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          ...style,
        }}
      >
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const dotBg = isCompleted ? '#2563EB' : isCurrent ? '#EFF6FF' : '#FFFFFF';
          const dotBorder = isCompleted || isCurrent ? '#2563EB' : '#E5E7EB';
          const labelColor = isCompleted || isCurrent ? '#111827' : '#9CA3AF';
          const labelWeight = isCurrent ? 600 : 400;

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
              }}
            >
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  backgroundColor: dotBg,
                  border: `2px solid ${dotBorder}`,
                }}
              />
              <span style={{ flex: 1, color: labelColor, fontWeight: labelWeight }}>
                {step.label}
              </span>
              <span style={{ fontSize: '12px', color: '#6B7280', fontVariantNumeric: 'tabular-nums' }}>
                {step.time || '—'}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // Default: Linear Bar
  const clampedVal = Math.max(0, Math.min(100, value));

  return (
    <div
      className={`progress-bar-linear ${className}`}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: '4px',
        backgroundColor: '#F3F4F6',
        overflow: 'hidden',
        width: '100%',
        ...style,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${clampedVal}%`,
          borderRadius: '4px',
          backgroundColor: barColor,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
};

export default ProgressBar;
