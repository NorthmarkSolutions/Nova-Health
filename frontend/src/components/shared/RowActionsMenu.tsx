import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ActionSlotConfirm {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export interface MenuItem {
  id?: string;
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  dividerBefore?: boolean;
  confirm?: ActionSlotConfirm;
}

export interface RowActionsMenuProps {
  menuItems?: MenuItem[];
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  triggerButton?: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  style?: React.CSSProperties;
}

export const RowActionsMenu: React.FC<RowActionsMenuProps> = ({
  menuItems = [],
  isOpen,
  onOpen,
  onClose,
  triggerButton,
  align = 'right',
  className = '',
  style,
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpenState = isOpen !== undefined ? isOpen : internalIsOpen;

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpen) onOpen();
    else setInternalIsOpen(true);
  };

  const handleClose = () => {
    if (onClose) onClose();
    else setInternalIsOpen(false);
    setConfirmingItem(null);
  };

  const [menuCoords, setMenuCoords] = useState<{ top?: number; bottom?: number; right?: number; left?: number } | null>(null);
  const [confirmingItem, setConfirmingItem] = useState<MenuItem | null>(null);

  // Position calculation on open
  useEffect(() => {
    if (isOpenState && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const right = window.innerWidth - rect.right;
      const spaceBelow = window.innerHeight - rect.bottom;

      if (spaceBelow < 180) {
        setMenuCoords({
          bottom: window.innerHeight - rect.top + 4,
          right: Math.max(12, right),
        });
      } else {
        setMenuCoords({
          top: rect.bottom + 4,
          right: Math.max(12, right),
        });
      }
    }
  }, [isOpenState]);

  // Outside click & escape listener
  useEffect(() => {
    if (!isOpenState) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpenState]);

  return (
    <div
      className={`row-actions-container ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', ...style }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        aria-label="Row actions"
        style={{
          whiteSpace: 'nowrap',
          flexShrink: 0,
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          border: '1px solid #E5E7EB',
          backgroundColor: '#FFFFFF',
          color: '#6B7280',
          fontSize: '16px',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {triggerButton || '⋯'}
      </button>

      {isOpenState && menuCoords && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: menuCoords.top,
            bottom: menuCoords.bottom,
            right: menuCoords.right,
            zIndex: 9999,
            minWidth: '200px',
            maxWidth: '300px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {confirmingItem ? (
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                {confirmingItem.confirm?.title || 'Are you sure?'}
              </div>
              {confirmingItem.confirm?.description && (
                <div style={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.4 }}>
                  {confirmingItem.confirm.description}
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setConfirmingItem(null)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    cursor: 'pointer',
                  }}
                >
                  {confirmingItem.confirm?.cancelText || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmingItem.onClick();
                    handleClose();
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    backgroundColor: confirmingItem.danger ? '#DC2626' : '#2563EB',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  {confirmingItem.confirm?.confirmText || 'Confirm'}
                </button>
              </div>
            </div>
          ) : (
            menuItems.map((item, idx) => (
              <React.Fragment key={idx}>
                {item.dividerBefore && (
                  <div style={{ height: '1px', backgroundColor: '#F3F4F6', margin: '4px 0' }} />
                )}
                <button
                  type="button"
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.disabled) return;
                    if (item.confirm) {
                      setConfirmingItem(item);
                    } else {
                      item.onClick();
                      handleClose();
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    textAlign: 'left',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: item.disabled ? '#9CA3AF' : item.danger ? '#DC2626' : '#374151',
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!item.disabled) {
                      e.currentTarget.style.backgroundColor = item.danger ? '#FEF2F2' : '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {item.icon && <span style={{ display: 'inline-flex', flexShrink: 0 }}>{item.icon}</span>}
                  <span style={{ flex: 1 }}>{item.label}</span>
                </button>
              </React.Fragment>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default RowActionsMenu;
