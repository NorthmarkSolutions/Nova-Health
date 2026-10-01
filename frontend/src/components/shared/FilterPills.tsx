import React from 'react';

export interface FilterPillItem {
  id: string;
  label: string;
  count?: number | string;
  tone?: 'default' | 'danger' | 'warning' | 'primary';
  icon?: React.ReactNode;
}

export interface FilterPillsProps {
  items: FilterPillItem[];
  activeId: string;
  onSelect: (id: string) => void;
  variant?: 'pills' | 'segmented';
  className?: string;
  style?: React.CSSProperties;
}

export const FilterPills: React.FC<FilterPillsProps> = ({
  items,
  activeId,
  onSelect,
  variant = 'pills',
  className = '',
  style,
}) => {
  if (variant === 'segmented') {
    return (
      <div
        className={`filter-pills-segmented ${className}`}
        style={{
          display: 'inline-flex',
          gap: '4px',
          padding: '3px',
          borderRadius: '10px',
          backgroundColor: '#F3F4F6',
          height: '40px',
          alignItems: 'center',
          ...style,
        }}
      >
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              style={{
                whiteSpace: 'nowrap',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                boxShadow: isActive ? '0 1px 2px rgba(17, 24, 39, 0.08)' : 'none',
                color: isActive ? '#111827' : '#6B7280',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span style={{ fontSize: '11px', opacity: 0.85 }}>· {item.count}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`filter-pills ${className}`}
      style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        alignItems: 'center',
        ...style,
      }}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        const tone = item.tone || 'default';

        let bg = '#FFFFFF';
        let fg = '#374151';
        let border = '1px solid #E5E7EB';
        let fontWeight = 500;

        if (isActive) {
          if (tone === 'danger') {
            bg = '#FEF2F2';
            fg = '#B91C1C';
            border = '1px solid #FECACA';
            fontWeight = 600;
          } else if (tone === 'warning') {
            bg = '#FFFBEB';
            fg = '#92400E';
            border = '1px solid #FDE68A';
            fontWeight = 600;
          } else {
            bg = '#2563EB';
            fg = '#FFFFFF';
            border = '1px solid #2563EB';
            fontWeight = 600;
          }
        } else {
          if (tone === 'danger') {
            bg = '#FEF2F2';
            fg = '#B91C1C';
            border = '1px solid #FECACA';
            fontWeight = 600;
          } else if (tone === 'warning') {
            bg = '#FFFBEB';
            fg = '#92400E';
            border = '1px solid #FDE68A';
            fontWeight = 600;
          } else {
            bg = '#FFFFFF';
            fg = '#374151';
            border = '1px solid #E5E7EB';
            fontWeight = 500;
          }
        }

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            style={{
              whiteSpace: 'nowrap',
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: '999px',
              backgroundColor: bg,
              color: fg,
              border,
              fontSize: '13px',
              fontWeight,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
            }}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.count !== undefined && <span>· {item.count}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default FilterPills;
