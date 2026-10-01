import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, ShieldAlert } from 'lucide-react';

export interface ActionSlotConfirm {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export interface ActionSlotItem {
  icon?: React.ReactNode;
  label?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  title?: string;
  disabled?: boolean;
  width?: number | string;
  iconOnly?: boolean;
  confirm?: ActionSlotConfirm;
  style?: React.CSSProperties;
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
  fixedActions?: ActionSlotItem[];
  menuItems?: MenuItem[];
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * RowActionsMenu
 * Standardized table row action component according to HMS Design Bible § 10 & § 12.
 * Supports fixed-width action slots (e.g., Call icon + Primary CTA) and an overflow popover menu.
 * Danger actions are strictly confined to the overflow menu with explicit confirmation.
 * Prevents horizontal layout shifting via fixed width and renders popovers in portal.
 */
export const RowActionsMenu: React.FC<RowActionsMenuProps> = ({
  fixedActions = [],
  menuItems = [],
  isOpen,
  onOpen,
  onClose,
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Support both controlled and uncontrolled open state
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpenState = isOpen !== undefined ? isOpen : internalIsOpen;

  const handleOpen = () => {
    if (onOpen) onOpen();
    else setInternalIsOpen(true);
  };

  const handleClose = () => {
    if (onClose) onClose();
    else setInternalIsOpen(false);
    setConfirmingItem(null);
  };

  const [menuCoords, setMenuCoords] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [confirmingItem, setConfirmingItem] = useState<MenuItem | null>(null);

  const hasMenuItems = menuItems.length > 0;

  // Calculate Fixed Screen Coordinates on Open
  useEffect(() => {
    if (isOpenState && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const right = window.innerWidth - rect.right;
      const spaceBelow = window.innerHeight - rect.bottom;

      // Popover is ~120px normal, ~160px in confirm mode. Flip up if near viewport bottom.
      if (spaceBelow < 170) {
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
      setConfirmingItem(null);
    }
  }, [isOpenState]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpenState) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        handleClose();
        triggerRef.current?.focus();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        triggerRef.current?.focus();
      }
    };

    const handleScrollOrResize = () => {
      handleClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpenState]);

  // Initial focus management when menu opens
  useEffect(() => {
    if (isOpenState) {
      const timer = setTimeout(() => {
        if (confirmingItem) {
          cancelBtnRef.current?.focus();
        } else {
          const firstEnabled = itemRefs.current.find((el) => el && !el.disabled);
          firstEnabled?.focus();
        }
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpenState, confirmingItem]);

  // Arrow-key navigation between menu items
  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (confirmingItem) return;

    const activeElements = itemRefs.current.filter((el): el is HTMLButtonElement => el !== null && !el.disabled);
    if (activeElements.length <= 1) return;

    const currentIndex = activeElements.findIndex((el) => el === document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex === -1 || currentIndex === activeElements.length - 1 ? 0 : currentIndex + 1;
      activeElements[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex <= 0 ? activeElements.length - 1 : currentIndex - 1;
      activeElements[prevIndex]?.focus();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'nowrap',
      }}
    >
      {/* Fixed Action Slots */}
      {fixedActions.map((action, idx) => {
        const isIconOnly = action.iconOnly || (!action.label && Boolean(action.icon));
        const resolvedWidth = action.width
          ? typeof action.width === 'number'
            ? `${action.width}px`
            : action.width
          : isIconOnly
          ? '36px'
          : '112px';

        const btnClass = action.variant === 'primary' ? 'btn btn-primary' : 'btn btn-secondary';

        return (
          <button
            key={idx}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={btnClass}
            style={{
              width: resolvedWidth,
              height: '36px',
              minWidth: resolvedWidth,
              maxWidth: resolvedWidth,
              minHeight: '36px',
              padding: isIconOnly ? 0 : '0 8px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              cursor: action.disabled ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              boxSizing: 'border-box',
              ...action.style,
            }}
            aria-label={action.label || action.title}
            title={action.title || action.label}
          >
            {action.icon}
            {action.label && !isIconOnly && (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{action.label}</span>
            )}
          </button>
        );
      })}

      {/* Overflow Menu Trigger */}
      {hasMenuItems && (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (!hasMenuItems) return;
            if (isOpenState) {
              handleClose();
            } else {
              handleOpen();
            }
          }}
          disabled={!hasMenuItems}
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={isOpenState}
          className="btn btn-secondary"
          style={{
            width: '36px',
            height: '36px',
            minWidth: '36px',
            minHeight: '36px',
            padding: 0,
            borderRadius: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: hasMenuItems ? 'pointer' : 'not-allowed',
            opacity: hasMenuItems ? 1 : 0.4,
            backgroundColor: isOpenState ? 'var(--gray-100)' : '#ffffff',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-color)',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
          title={hasMenuItems ? 'More actions' : undefined}
        >
          <MoreHorizontal size={16} />
        </button>
      )}

      {/* Portal-rendered Popover Menu */}
      {isOpenState && hasMenuItems && menuCoords && createPortal(
        <div
          ref={popoverRef}
          role="menu"
          aria-label="Actions overflow menu"
          onKeyDown={handleMenuKeyDown}
          style={{
            position: 'fixed',
            top: menuCoords.top !== undefined ? `${menuCoords.top}px` : undefined,
            bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : undefined,
            right: `${menuCoords.right}px`,
            minWidth: '210px',
            maxWidth: '240px',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            padding: '6px',
            zIndex: 9999,
            boxSizing: 'border-box',
          }}
        >
          {!confirmingItem ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {menuItems.map((item, index) => {
                const isDanger = item.danger;
                return (
                  <React.Fragment key={item.id || index}>
                    {item.dividerBefore && (
                      <div
                        style={{
                          height: '1px',
                          backgroundColor: 'var(--border-color)',
                          margin: '4px 6px',
                        }}
                      />
                    )}
                    <button
                      ref={(el) => {
                        itemRefs.current[index] = el;
                      }}
                      type="button"
                      role="menuitem"
                      disabled={item.disabled}
                      onClick={() => {
                        if (item.confirm) {
                          setConfirmingItem(item);
                        } else {
                          item.onClick();
                          handleClose();
                          triggerRef.current?.focus();
                        }
                      }}
                      style={{
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: isDanger ? 'var(--danger)' : 'var(--secondary)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: item.disabled ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        transition: 'background-color 0.12s ease',
                        outline: 'none',
                        opacity: item.disabled ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!item.disabled) {
                          e.currentTarget.style.backgroundColor = isDanger
                            ? 'var(--danger-light)'
                            : 'var(--gray-50)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onFocus={(e) => {
                        if (!item.disabled) {
                          e.currentTarget.style.backgroundColor = isDanger
                            ? 'var(--danger-light)'
                            : 'var(--gray-50)';
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            /* Inline Confirmation Step */
            <div style={{ padding: '8px 8px 6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                {confirmingItem.confirm?.danger && (
                  <ShieldAlert size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
                )}
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--secondary)',
                    lineHeight: 1.3,
                  }}
                >
                  {confirmingItem.confirm?.title}
                </span>
              </div>
              {confirmingItem.confirm?.description && (
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    margin: '0 0 10px',
                    lineHeight: 1.4,
                  }}
                >
                  {confirmingItem.confirm.description}
                </p>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  ref={cancelBtnRef}
                  type="button"
                  onClick={() => {
                    setConfirmingItem(null);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{
                    height: '30px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                >
                  {confirmingItem.confirm?.cancelText || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmingItem.onClick();
                    handleClose();
                    triggerRef.current?.focus();
                  }}
                  className={
                    confirmingItem.confirm?.danger
                      ? 'btn btn-danger btn-sm'
                      : 'btn btn-primary btn-sm'
                  }
                  style={{
                    height: '30px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {confirmingItem.confirm?.confirmText || 'Confirm'}
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default RowActionsMenu;
