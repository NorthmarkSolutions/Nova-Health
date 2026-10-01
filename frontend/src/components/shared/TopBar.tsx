import React from 'react';
import { Search, Clock } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface TopBarProps {
  breadcrumbs: (string | BreadcrumbItem)[];
  showLiveBadge?: boolean;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  shiftChip?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const TopBar: React.FC<TopBarProps> = ({
  breadcrumbs,
  showLiveBadge = true,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search patient, UHID or order',
  shiftChip,
  children,
  className = '',
  style,
}) => {
  return (
    <div
      className={`topbar-container ${className}`}
      style={{
        minHeight: '60px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 24px',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {/* Breadcrumbs & Live status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: '#6B7280',
          flex: '1 1 200px',
          minWidth: '200px',
          flexWrap: 'wrap',
          whiteSpace: 'nowrap',
        }}
      >
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          const label = typeof crumb === 'string' ? crumb : crumb.label;
          const onClick = typeof crumb === 'object' ? crumb.onClick : undefined;

          return (
            <React.Fragment key={idx}>
              {idx > 0 && <span style={{ color: '#9CA3AF' }}>/</span>}
              <span
                onClick={onClick}
                style={{
                  color: isLast ? '#111827' : '#6B7280',
                  fontWeight: isLast ? 500 : 400,
                  cursor: onClick ? 'pointer' : 'default',
                }}
              >
                {label}
              </span>
            </React.Fragment>
          );
        })}

        {showLiveBadge && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#15803D',
              backgroundColor: '#F0FDF4',
              borderRadius: '999px',
              padding: '2px 8px',
              marginLeft: '4px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#16A34A',
              }}
            />
            Live
          </span>
        )}
      </div>

      {/* Search Input Box */}
      {onSearchChange !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '36px',
            padding: '0 12px',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            width: '280px',
            maxWidth: '100%',
            color: '#6B7280',
            fontSize: '13px',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Search size={16} color="#6B7280" />
          <input
            type="text"
            value={searchQuery ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '13px',
              color: '#111827',
              backgroundColor: 'transparent',
              fontFamily: 'inherit',
            }}
          />
        </div>
      )}

      {/* Shift Chip / Date Picker Chip */}
      {shiftChip && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            height: '36px',
            padding: '0 12px',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            fontSize: '13px',
            color: '#374151',
            whiteSpace: 'nowrap',
            backgroundColor: '#FFFFFF',
          }}
        >
          {typeof shiftChip === 'string' ? (
            <>
              <Clock size={15} color="#6B7280" />
              <span>{shiftChip}</span>
            </>
          ) : (
            shiftChip
          )}
        </div>
      )}

      {children}
    </div>
  );
};

export default TopBar;
