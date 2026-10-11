// HMS workspace standard — page shell (HMS design bible, Sections 19.2, 19.3 and 19.8).
// Sidebar, sticky top bar with the large profile control, keyboard shortcuts dialog and
// the global keyboard layer. Department workspaces pass their own navigation and content.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Calendar, ChevronDown, KeyRound, LogOut, ShieldCheck, User as UserIcon, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RoleType } from '../../types';
import { MyProfileModal } from '../../pages/pharmacy/inventory/modals/MyProfileModal';
import { ChangePasswordModal } from '../../pages/pharmacy/inventory/modals/ChangePasswordModal';
import { HMS, initialsOf } from './HmsPrimitives';
import './hms.css';

export interface HmsNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Live count from real data only; omitted when there is nothing to count. */
  count?: number;
  /** Red pill when the count signals a problem (gaps, offline, overdue). */
  alert?: boolean;
}

export interface HmsNavGroup {
  label: string;
  items: HmsNavItem[];
}

export interface HmsShellProps {
  navLabel: string;
  navGroups: HmsNavGroup[];
  activeKey: string;
  onNavigate: (key: string) => void;
  department: { name: string; scope: string; roleBadge: string; roleName: string; responsibility: string };
  /** Short role label under the user's name, e.g. "Lab Admin". */
  roleLabel: string;
  /** Middle breadcrumb, e.g. "Laboratory · Admin". */
  crumb: string;
  crumbChip?: React.ReactNode;
  statusChips?: React.ReactNode;
  /** Department Alt+letter shortcuts keyed by KeyboardEvent.code, e.g. { KeyR: openReports }. */
  altShortcuts?: Record<string, () => void>;
  /** Extra rows for the "?" dialog: [keys, description]. */
  shortcutHelp?: [string, string][];
  children: React.ReactNode;
}

/** True while any dialog is open — global shortcuts stay out of the way. */
export const hmsDialogOpen = () => !!document.querySelector('[aria-modal="true"]');

/** Focus the current list search box (rendered by HmsMasterDetail). */
export const focusHmsSearch = () => {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[data-hms-search]')?.focus())
  );
};

const navShortcut = (index: number) => (index < 9 ? `Alt+${index + 1}` : index === 9 ? 'Alt+0' : '');

export const HmsShell: React.FC<HmsShellProps> = ({
  navLabel,
  navGroups,
  activeKey,
  onNavigate,
  department,
  roleLabel,
  crumb,
  crumbChip,
  statusChips,
  altShortcuts = {},
  shortcutHelp = [],
  children,
}) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : roleLabel;
  const initials = initialsOf(displayName);
  const designation = user?.designation || roleLabel;

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMyProfileOpen, setIsMyProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  const navOrder = useMemo(() => navGroups.flatMap((g) => g.items.map((i) => i.key)), [navGroups]);
  const currentLabel = navGroups.flatMap((g) => g.items).find((i) => i.key === activeKey)?.label || '';

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(tick);
  }, []);

  // Profile menu: focus first item, Esc returns focus, outside click closes
  useEffect(() => {
    if (!isProfileOpen) return;
    const onClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) setIsProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileOpen(false);
        profileButtonRef.current?.focus();
      }
    };
    requestAnimationFrame(() => profileMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isProfileOpen]);

  const handleSignOut = () => {
    setIsProfileOpen(false);
    if (logout) logout();
    navigate('/login');
  };

  const goTo = (key: string) => {
    onNavigate(key);
    focusHmsSearch();
  };

  // Global keyboard layer (19.8)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (hmsDialogOpen() || isMyProfileOpen || isChangePasswordOpen) return;
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const digit = /^Digit(\d)$/.exec(e.code);
        if (digit) {
          const n = Number(digit[1]);
          const key = navOrder[n === 0 ? 9 : n - 1];
          if (key) {
            e.preventDefault();
            goTo(key);
          }
          return;
        }
        if (e.code === 'KeyP') {
          e.preventDefault();
          setIsProfileOpen((v) => !v);
          return;
        }
        const action = altShortcuts[e.code];
        if (action) {
          e.preventDefault();
          action();
        }
        return;
      }
      if (typing || e.ctrlKey || e.metaKey) return;
      if (e.key === '/') {
        const search = document.querySelector<HTMLInputElement>('[data-hms-search]');
        if (search) {
          e.preventDefault();
          search.focus();
        }
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const menuItemStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#334155',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    textAlign: 'left',
  };

  return (
    <div
      className="hms-root hms-motion"
      style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: HMS.page, fontFamily: "'Inter', sans-serif", fontSize: '14px', color: HMS.text }}
    >
      {/* Sidebar (19.2) */}
      <aside style={{ width: '260px', flexShrink: 0, background: '#ffffff', borderRight: `1px solid ${HMS.border}`, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 18px', borderBottom: `1px solid ${HMS.divider}` }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: HMS.primary, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '15px' }}>N</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: HMS.text, letterSpacing: '-0.01em' }}>North Hospital</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Clinical Enterprise HMS</div>
          </div>
        </div>

        <div style={{ margin: '12px 14px 8px', padding: '10px 12px', background: HMS.subtle, border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Current Department</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: HMS.primary, background: HMS.primaryTint, border: `1px solid ${HMS.primaryBorder}`, borderRadius: '4px', padding: '1px 5px' }}>{department.roleBadge}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
              <Building2 size={13} style={{ color: HMS.primary, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>{department.name}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>{department.scope}</div>
          </div>
          <div style={{ paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Operating Role</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', padding: '1px 5px' }}>ACTIVE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>{department.roleName}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
              {user?.employeeId ? `ID: ${user.employeeId} · ` : ''}
              {department.responsibility}
            </div>
          </div>
        </div>

        <nav aria-label={navLabel} style={{ flex: 1, padding: '4px 10px 12px', display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', scrollbarWidth: 'thin' }}>
          {navGroups.map((group, gIdx) => {
            const isCollapsed = !!collapsed[group.label];
            const hasActive = group.items.some((i) => i.key === activeKey);
            return (
              <div key={group.label} style={{ marginTop: gIdx > 0 ? '6px' : '2px' }}>
                <button
                  type="button"
                  className="hms-group-header"
                  onClick={() => setCollapsed((prev) => ({ ...prev, [group.label]: !prev[group.label] }))}
                  aria-expanded={!isCollapsed}
                  title={`${isCollapsed ? 'Expand' : 'Collapse'} ${group.label.toLowerCase()}`}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: gIdx > 0 ? '10px 8px 4px' : '6px 8px 4px', cursor: 'pointer', userSelect: 'none', borderRadius: '6px', border: 'none', borderTop: gIdx > 0 ? `1px solid ${HMS.divider}` : 'none', background: 'transparent' }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: hasActive ? HMS.primaryStrong : '#64748b' }}>{group.label}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: hasActive ? HMS.primary : HMS.textMuted, background: hasActive ? HMS.primaryTint : HMS.subtle, padding: '0 6px', borderRadius: '4px', border: `1px solid ${hasActive ? HMS.primaryBorder : HMS.divider}` }}>{group.items.length}</span>
                    <ChevronDown size={14} color={HMS.textMuted} className="hms-chev" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none' }} />
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="hms-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                    {group.items.map((item) => {
                      const isActive = activeKey === item.key;
                      const Icon = item.icon;
                      const shortcut = navShortcut(navOrder.indexOf(item.key));
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className="hms-nav-item"
                          onClick={() => goTo(item.key)}
                          aria-current={isActive ? 'page' : undefined}
                          aria-keyshortcuts={shortcut || undefined}
                          title={shortcut ? `${item.label} (${shortcut})` : item.label}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            width: '100%',
                            height: '40px',
                            padding: '0 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: isActive ? 600 : 500,
                            textAlign: 'left',
                            color: isActive ? HMS.primaryStrong : '#334155',
                            background: isActive ? HMS.primaryTint : 'transparent',
                            border: `1px solid ${isActive ? HMS.primaryBorder : 'transparent'}`,
                            boxShadow: isActive ? '0 1px 3px rgba(37, 99, 235, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)' : 'none',
                          }}
                        >
                          <Icon size={18} style={{ color: isActive ? HMS.primary : '#64748b', flexShrink: 0 }} />
                          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                          {item.count !== undefined && item.count > 0 && (
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                padding: '0 7px',
                                borderRadius: '10px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                background: item.alert ? '#fef2f2' : isActive ? '#dbeafe' : '#f1f5f9',
                                color: item.alert ? '#dc2626' : isActive ? '#1e40af' : '#64748b',
                                border: item.alert ? '1px solid #fecaca' : '1px solid transparent',
                              }}
                            >
                              {item.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderTop: `1px solid ${HMS.border}`, background: '#ffffff', flexShrink: 0 }}>
          <button
            type="button"
            className="hms-nav-item"
            onClick={() => setIsMyProfileOpen(true)}
            title="View my profile"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, cursor: 'pointer', borderRadius: '8px', padding: '2px 4px', margin: '-2px -4px', border: 'none', background: 'transparent', textAlign: 'left' }}
          >
            <span style={{ width: '36px', height: '36px', borderRadius: '50%', background: HMS.primaryTint, color: HMS.primaryStrong, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0, border: `1.5px solid ${HMS.primaryBorder}` }}>{initials}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: HMS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
              <span style={{ display: 'block', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{roleLabel}</span>
            </span>
          </button>
          <button
            type="button"
            className="hms-logout"
            onClick={handleSignOut}
            title="Log out"
            aria-label="Log out"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: HMS.textMuted, padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Top bar (19.3) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', height: '52px', padding: '0 24px', borderBottom: `1px solid ${HMS.border}`, background: '#ffffff', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b', minWidth: 0, whiteSpace: 'nowrap' }}>
            <span>North Hospital</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span>{crumb}</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ color: HMS.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentLabel}</span>
            {crumbChip}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {statusChips}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 12px', border: `1px solid ${HMS.border}`, borderRadius: '10px', fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>
              <Calendar size={16} color={HMS.textSecondary} />
              Today · {now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              aria-keyshortcuts="?"
              title="Keyboard shortcuts (?)"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 12px', border: `1px solid ${HMS.border}`, borderRadius: '10px', background: '#ffffff', fontSize: '13px', fontWeight: 500, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <span className="hms-kbd">?</span>
              Shortcuts
            </button>

            <div style={{ width: '1px', height: '20px', background: HMS.border, margin: '0 2px' }} />

            <div style={{ position: 'relative' }} ref={profileMenuRef}>
              <button
                ref={profileButtonRef}
                type="button"
                onClick={() => setIsProfileOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
                aria-keyshortcuts="Alt+P"
                title="Account (Alt+P)"
                style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '44px', padding: '0 12px 0 6px', background: isProfileOpen ? '#f1f5f9' : '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' }}
              >
                <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: HMS.primaryTint, color: HMS.primary, border: `1.5px solid ${HMS.primaryBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>{initials}</span>
                <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.25 }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
                  <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>{roleLabel}</span>
                </span>
                <ChevronDown size={16} className="hms-chev" style={{ color: '#64748b', transform: isProfileOpen ? 'rotate(180deg)' : 'none' }} />
              </button>

              {isProfileOpen && (
                <div
                  role="menu"
                  aria-label="Account"
                  onKeyDown={(e) => {
                    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
                    e.preventDefault();
                    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
                    const i = items.indexOf(document.activeElement as HTMLElement);
                    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
                    items[next]?.focus();
                  }}
                  style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: '285px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', zIndex: 100, overflow: 'hidden' }}
                >
                  <div style={{ padding: '16px 18px', background: HMS.subtle, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '40px', height: '40px', borderRadius: '50%', background: HMS.primaryTint, color: HMS.primary, border: `2px solid ${HMS.primaryBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>{initials}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                      {user?.email && <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>{user.email}</div>}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '12px', fontWeight: 600, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', padding: '0 7px' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a' }} />
                        {designation}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button type="button" role="menuitem" className="hms-menu-item" onClick={() => { setIsProfileOpen(false); setIsMyProfileOpen(true); }} style={menuItemStyle}>
                      <UserIcon size={16} style={{ color: '#64748b' }} />
                      <span>My Profile</span>
                    </button>
                    <button type="button" role="menuitem" className="hms-menu-item" onClick={() => { setIsProfileOpen(false); setIsChangePasswordOpen(true); }} style={menuItemStyle}>
                      <KeyRound size={16} style={{ color: '#64748b' }} />
                      <span>Change Password</span>
                    </button>
                  </div>
                  <div style={{ borderTop: '1px solid #e2e8f0', padding: '6px' }}>
                    <button type="button" role="menuitem" className="hms-menu-item hms-danger" onClick={handleSignOut} style={{ ...menuItemStyle, color: '#dc2626' }}>
                      <LogOut size={16} style={{ color: '#dc2626' }} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>{children}</div>
      </main>

      {isShortcutsOpen && (
        <div
          className="hms-backdrop"
          onClick={() => setIsShortcutsOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsShortcutsOpen(false);
          }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: '12px', width: '540px', maxWidth: '92%', maxHeight: '86vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: HMS.text, margin: 0 }}>Keyboard shortcuts</h3>
              <button type="button" autoFocus onClick={() => setIsShortcutsOpen(false)} aria-label="Close (Esc)" style={{ background: 'none', border: 'none', cursor: 'pointer', color: HMS.textSecondary, padding: '4px', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>
            {(
              [
                [`Alt+1 … ${navShortcut(Math.min(navOrder.length, 10) - 1)}`, `Open a sidebar section (${navGroups[0]?.items[0]?.label || 'first'} … ${navGroups.flatMap((g) => g.items).slice(0, 10).slice(-1)[0]?.label || 'last'})`],
                ['/', 'Search the current list'],
                ['↑ ↓  ·  PageUp PageDown  ·  Home End', 'Move through the list'],
                ['Enter', 'Run the main action for the selected row, or open its details'],
                ['Esc', 'Clear search · close dialogs and menus'],
                ...shortcutHelp,
                ['Alt+P', 'Account menu'],
                ['?', 'Show this list'],
              ] as [string, string][]
            ).map(([k, d]) => (
              <div key={k + d} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '10px 0', borderBottom: '1px solid #f3f4f6', fontSize: '14px' }}>
                <span style={{ color: '#374151' }}>{d}</span>
                <span className="hms-kbd" style={{ fontSize: '12px', alignSelf: 'center' }}>{k}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <MyProfileModal
        isOpen={isMyProfileOpen}
        onClose={() => setIsMyProfileOpen(false)}
        user={user}
        role={(role || RoleType.DEPARTMENT_ADMIN) as RoleType}
        displayName={displayName}
        designation={designation}
        initials={initials}
        onChangePasswordClick={() => {
          setIsMyProfileOpen(false);
          setIsChangePasswordOpen(true);
        }}
      />
      <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
    </div>
  );
};
