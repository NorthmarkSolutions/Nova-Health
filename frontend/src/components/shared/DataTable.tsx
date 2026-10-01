import React from 'react';

export interface ColumnDef<T> {
  key: string;
  header: React.ReactNode;
  width?: string; // e.g. "minmax(0, 1.3fr)" or "120px"
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  gridTemplateColumns?: string;
  minWidth?: number | string;
  selectedId?: string;
  isRowSelected?: (row: T) => boolean;
  onRowClick?: (row: T) => void;
  rowBackground?: (row: T) => string | undefined;
  headerSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  gridTemplateColumns,
  minWidth = '680px',
  selectedId,
  isRowSelected,
  onRowClick,
  rowBackground,
  headerSlot,
  footerSlot,
  emptyState,
  className = '',
  style,
}: DataTableProps<T>) {
  // Compute default grid-template-columns if not provided
  const templateColumns =
    gridTemplateColumns ||
    columns
      .map((col) => col.width || 'minmax(0, 1fr)')
      .join(' ');

  return (
    <div
      className={`data-table-card ${className}`}
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {headerSlot && <div style={{ borderBottom: '1px solid #E5E7EB' }}>{headerSlot}</div>}

      <div style={{ overflowX: 'auto', width: '100%' }}>
        <div style={{ minWidth: typeof minWidth === 'number' ? `${minWidth}px` : minWidth }}>
          {/* Table Header Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: templateColumns,
              gap: '12px',
              alignItems: 'center',
              height: '44px',
              padding: '0 20px',
              backgroundColor: '#F9FAFB',
              borderBottom: '1px solid #E5E7EB',
              fontSize: '12px',
              fontWeight: 600,
              color: '#6B7280',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            {columns.map((col) => (
              <span
                key={col.key}
                style={{
                  textAlign: col.align || 'left',
                }}
              >
                {col.header}
              </span>
            ))}
          </div>

          {/* Table Body Rows */}
          {data.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
              {emptyState || 'No records found'}
            </div>
          ) : (
            data.map((row, index) => {
              const rowKey = keyExtractor(row, index);
              const isSelected =
                (selectedId !== undefined && rowKey === selectedId) ||
                (isRowSelected !== undefined && isRowSelected(row));

              const customBg = rowBackground ? rowBackground(row) : undefined;
              const bg = isSelected ? '#EFF6FF' : customBg || '#FFFFFF';

              return (
                <div
                  key={rowKey}
                  onClick={() => onRowClick && onRowClick(row)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: templateColumns,
                    gap: '12px',
                    alignItems: 'center',
                    minHeight: '60px',
                    padding: '8px 20px',
                    borderBottom: '1px solid #F3F4F6',
                    backgroundColor: bg,
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !customBg) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !customBg) {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }
                  }}
                >
                  {columns.map((col) => {
                    const content = col.render
                      ? col.render(row, index)
                      : (row as any)[col.key];

                    return (
                      <div
                        key={col.key}
                        style={{
                          textAlign: col.align || 'left',
                          minWidth: 0,
                        }}
                      >
                        {content}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {footerSlot && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            fontSize: '13px',
            color: '#6B7280',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E5E7EB',
          }}
        >
          {footerSlot}
        </div>
      )}
    </div>
  );
}

export default DataTable;
