// HMS workspace standard — shared building blocks (HMS design bible, Section 19).
// Every department workspace composes these so sizes, colours and behaviour stay identical.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, ChevronDown, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

export const HMS = {
  primary: '#2563eb',
  primaryStrong: '#1d4ed8',
  primaryTint: '#eff6ff',
  primaryBorder: '#bfdbfe',
  border: '#e5e7eb',
  divider: '#f1f5f9',
  subtle: '#f8fafc',
  page: '#f9fafb',
  text: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#94a3b8',
  label: '#475569',
} as const;

export const PANEL: React.CSSProperties = {
  background: '#ffffff',
  border: `1px solid ${HMS.border}`,
  borderRadius: '12px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  minWidth: 0,
};

export type HmsTone = 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'dark';

const TONES: Record<HmsTone, { bg: string; fg: string; bd: string }> = {
  gray: { bg: '#f3f4f6', fg: '#4b5563', bd: '#e5e7eb' },
  green: { bg: '#f0fdf4', fg: '#15803d', bd: '#bbf7d0' },
  amber: { bg: '#fffbeb', fg: '#b45309', bd: '#fde68a' },
  red: { bg: '#fef2f2', fg: '#dc2626', bd: '#fecaca' },
  blue: { bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' },
  dark: { bg: '#111827', fg: '#ffffff', bd: '#111827' },
};

export const toneColors = (tone: HmsTone) => TONES[tone];

/** Uppercase label used for section headers, stat-strip labels and form groups (12px / 700). */
export const SECTION_LABEL: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: HMS.label,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

/** Text input / select styling (40px, radius 10, 14px). */
export const INPUT: React.CSSProperties = {
  width: '100%',
  height: '40px',
  padding: '0 12px',
  border: '1px solid #d1d5db',
  borderRadius: '10px',
  fontSize: '14px',
  color: HMS.text,
  background: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
};

export const TEXTAREA: React.CSSProperties = { ...INPUT, height: 'auto', minHeight: '84px', padding: '10px 12px', lineHeight: 1.5, resize: 'vertical' };

export const initialsOf = (name: string) =>
  name
    .replace(/^(Dr\.?|Mr\.?|Ms\.?|Mrs\.?)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '—';

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

export const HmsBadge: React.FC<{ tone?: HmsTone; children: React.ReactNode; title?: string; dot?: boolean }> = ({
  tone = 'gray',
  children,
  title,
  dot,
}) => {
  const c = TONES[tone];
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '12px',
        fontWeight: 600,
        lineHeight: '18px',
        padding: '1px 8px',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.bd}`,
      }}
    >
      {dot && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.fg }} />}
      {children}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface HmsButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  icon?: LucideIcon;
  shortcut?: string;
  block?: boolean;
  submit?: boolean;
}

export const HmsButton = React.forwardRef<HTMLButtonElement, HmsButtonProps>(
  ({ variant = 'secondary', size = 'md', icon: Icon, shortcut, block, submit, children, style, ...rest }, ref) => {
    const palette: Record<ButtonVariant, React.CSSProperties> = {
      primary: { background: HMS.primary, color: '#ffffff', border: `1px solid ${HMS.primary}` },
      secondary: { background: '#ffffff', color: HMS.text, border: '1px solid #d1d5db' },
      danger: { background: '#ffffff', color: '#dc2626', border: '1px solid #fecaca' },
      ghost: { background: 'transparent', color: HMS.primary, border: '1px solid transparent' },
    };
    const sm = size === 'sm';
    return (
      <button
        ref={ref}
        type={submit ? 'submit' : 'button'}
        aria-keyshortcuts={shortcut}
        {...rest}
        style={{
          display: block ? 'flex' : 'inline-flex',
          width: block ? '100%' : undefined,
          alignItems: 'center',
          justifyContent: 'center',
          gap: sm ? '6px' : '8px',
          height: sm ? '32px' : '40px',
          padding: sm ? '0 12px' : '0 16px',
          borderRadius: sm ? '8px' : '10px',
          fontSize: sm ? '13px' : '14px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          cursor: rest.disabled ? 'not-allowed' : 'pointer',
          opacity: rest.disabled ? 0.55 : 1,
          flexShrink: 0,
          ...palette[variant],
          ...style,
        }}
      >
        {Icon && <Icon size={sm ? 16 : 18} />}
        {children}
        {shortcut && (
          <span
            className="hms-kbd"
            style={
              variant === 'primary'
                ? { background: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.35)', color: '#ffffff' }
                : undefined
            }
          >
            {shortcut}
          </span>
        )}
      </button>
    );
  }
);
HmsButton.displayName = 'HmsButton';

/* ------------------------------------------------------------------ */
/* Page header (19.4)                                                  */
/* ------------------------------------------------------------------ */

export interface HmsHeaderAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  primary?: boolean;
  /** Alt+{key} shortcut, e.g. "R" → Alt+R. Registered by the shell. */
  shortcutKey?: string;
}

export const HmsPageHeader: React.FC<{ title: string; description: string; actions?: HmsHeaderAction[] }> = ({
  title,
  description,
  actions = [],
}) => (
  <div
    style={{
      ...PANEL,
      padding: '22px 26px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap',
    }}
  >
    <div style={{ minWidth: 0 }}>
      <h1 style={{ fontSize: '32px', fontWeight: 700, color: HMS.text, letterSpacing: '-0.01em', margin: 0 }}>{title}</h1>
      <p style={{ fontSize: '14px', color: '#4b5563', marginTop: '6px', marginBottom: 0 }}>{description}</p>
    </div>
    {actions.length > 0 && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {actions.map((a) => (
          <HmsButton
            key={a.label}
            variant={a.primary ? 'primary' : 'secondary'}
            icon={a.icon}
            onClick={a.onClick}
            shortcut={a.shortcutKey ? `Alt+${a.shortcutKey}` : undefined}
          >
            {a.label}
          </HmsButton>
        ))}
      </div>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/* KPI row (19.5) — exactly four equal, clickable cards                */
/* ------------------------------------------------------------------ */

export interface HmsKpi {
  key: string;
  label: string;
  /** null while loading or unavailable — never an invented number. */
  value: React.ReactNode | null;
  unit?: string;
  caption?: string;
  captionTone?: 'muted' | 'amber';
  badge?: { text: string; tone: HmsTone };
  alert?: boolean;
  loading?: boolean;
  onOpen: () => void;
  title: string;
}

export const HmsKpiRow: React.FC<{ items: [HmsKpi, HmsKpi, HmsKpi, HmsKpi] }> = ({ items }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
    {items.map((k) => (
      <div
        key={k.key}
        role="button"
        tabIndex={0}
        className="hms-kpi"
        title={k.title}
        onClick={k.onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            k.onOpen();
          }
        }}
        style={{
          ...PANEL,
          padding: '18px 20px',
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '10px',
          cursor: 'pointer',
          border: k.alert ? '1.5px solid #fecaca' : PANEL.border,
          boxShadow: k.alert ? '0 2px 4px rgba(220, 38, 38, 0.05)' : PANEL.boxShadow,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: k.alert ? '#b91c1c' : '#4b5563' }}>{k.label}</span>
          {k.badge && <HmsBadge tone={k.badge.tone}>{k.badge.text}</HmsBadge>}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: HMS.text, lineHeight: 1.15 }}>
              {k.loading ? (
                <span className="hms-skel" aria-label="Loading" style={{ width: '72px', height: '28px' }} />
              ) : k.value === null || k.value === undefined ? (
                '—'
              ) : (
                k.value
              )}
            </span>
            {k.unit && <span style={{ fontSize: '12px', color: HMS.textSecondary }}>{k.unit}</span>}
          </div>
          {k.caption && (
            <div style={{ fontSize: '12px', marginTop: '2px', color: k.captionTone === 'amber' ? '#b45309' : HMS.textMuted }}>
              {k.caption}
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/* Completion bar — hidden once complete (19.6)                        */
/* ------------------------------------------------------------------ */

export const HmsProgress: React.FC<{ pct: number; doneLabel: string; label?: string; height?: number; tone?: 'blue' | 'amber' | 'red'; showLabel?: boolean }> = ({
  pct,
  doneLabel,
  label,
  height = 6,
  tone = 'blue',
  showLabel,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  if (clamped >= 100) {
    return (
      <span className="hms-fade-in" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#15803d' }}>
        <CheckCircle2 size={14} /> {showLabel && label ? `${label} · ${doneLabel}` : doneLabel}
      </span>
    );
  }
  const fill = tone === 'red' ? '#dc2626' : tone === 'amber' ? '#f59e0b' : HMS.primary;
  const bar = (
    <span
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `${clamped}% complete`}
      style={{ display: 'block', height: `${height}px`, borderRadius: `${height / 2}px`, background: HMS.divider, overflow: 'hidden' }}
    >
      <span className="hms-bar" style={{ display: 'block', height: `${height}px`, width: `${clamped}%`, borderRadius: `${height / 2}px`, background: fill }} />
    </span>
  );
  if (!showLabel || !label) return bar;
  // Visible caption: what the bar measures on the left, the value on the right
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px', color: HMS.textSecondary }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color: HMS.text }}>{clamped}%</span>
      </span>
      {bar}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Detail panel parts (19.6 right box)                                 */
/* ------------------------------------------------------------------ */

export const HmsDetailHeader: React.FC<{
  avatar?: string;
  icon?: LucideIcon;
  title: string;
  badge?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ avatar, icon: Icon, title, badge, subtitle, actions }) => (
  <div style={{ padding: '16px 24px', borderBottom: `1px solid ${HMS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
      <span
        style={{
          width: '40px',
          height: '40px',
          borderRadius: Icon ? '10px' : '50%',
          background: HMS.primaryTint,
          color: HMS.primaryStrong,
          border: `1.5px solid ${HMS.primaryBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {Icon ? <Icon size={20} /> : avatar}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h3 aria-live="polite" style={{ fontSize: '18px', fontWeight: 700, color: HMS.text, margin: 0 }}>{title}</h3>
          {badge}
        </div>
        {subtitle && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{subtitle}</div>}
      </div>
    </div>
    {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>{actions}</div>}
  </div>
);

export interface HmsStat {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  tone?: 'default' | 'green' | 'amber' | 'red';
}

export const HmsStatStrip: React.FC<{ items: HmsStat[] }> = ({ items }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))`, gap: '12px', padding: '16px 24px', background: HMS.subtle, borderBottom: `1px solid ${HMS.border}`, flexShrink: 0 }}>
    {items.map((b) => (
      <div key={b.label} style={{ minWidth: 0 }}>
        <div style={SECTION_LABEL}>{b.label}</div>
        <div
          style={{
            fontSize: '18px',
            fontWeight: 700,
            marginTop: '2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: b.tone === 'green' ? '#15803d' : b.tone === 'amber' ? '#b45309' : b.tone === 'red' ? '#dc2626' : HMS.text,
          }}
        >
          {b.value}
        </div>
        {b.note && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>{b.note}</div>}
      </div>
    ))}
  </div>
);

export const HmsDetailBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>{children}</div>
);

export const HmsDetailFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ padding: '16px 20px', borderTop: `1px solid ${HMS.border}`, display: 'flex', gap: '10px', flexWrap: 'wrap', flexShrink: 0 }}>{children}</div>
);

/** Inner section card with a #F8FAFC header strip. Click the header to collapse / expand (animated). */
export const HmsSection: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode; padded?: boolean; defaultOpen?: boolean }> = ({
  title,
  right,
  children,
  padded,
  defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section style={{ border: `1px solid ${HMS.border}`, borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ background: HMS.subtle, borderBottom: open ? `1px solid ${HMS.border}` : '1px solid transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', paddingRight: right ? '10px' : 0, transition: 'border-color 200ms ease-out' }}>
        <button
          type="button"
          className="hms-group-header"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          title={open ? `Collapse ${title.toLowerCase()}` : `Expand ${title.toLowerCase()}`}
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <ChevronDown size={16} color={HMS.textSecondary} className="hms-chev" style={{ transform: open ? 'none' : 'rotate(-90deg)', flexShrink: 0 }} />
          <span style={SECTION_LABEL}>{title}</span>
        </button>
        {right}
      </div>
      <div className="hms-collapse" data-open={open ? 'true' : 'false'}>
        <div style={{ minHeight: 0, overflow: 'hidden' }} inert={!open}>
          <div style={padded ? { padding: '14px' } : undefined}>{children}</div>
        </div>
      </div>
    </section>
  );
};

/** One label / value line inside an HmsSection. */
export const HmsRow: React.FC<{ label: React.ReactNode; hint?: React.ReactNode; value?: React.ReactNode; last?: boolean }> = ({
  label,
  hint,
  value,
  last,
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 14px', borderBottom: last ? 'none' : `1px solid ${HMS.divider}` }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '14px', fontWeight: 500, color: HMS.text }}>{label}</div>
      {hint && <div style={{ fontSize: '12px', color: HMS.textSecondary, marginTop: '1px' }}>{hint}</div>}
    </div>
    {value !== undefined && <div style={{ flexShrink: 0, fontSize: '14px', color: HMS.text, textAlign: 'right' }}>{value}</div>}
  </div>
);

export const HmsEmpty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ padding: '48px 24px', textAlign: 'center', color: HMS.textSecondary, fontSize: '14px' }}>{children}</div>
);

/** Inline notice used inside detail panels (amber or red tint). */
export const HmsNotice: React.FC<{ tone?: 'amber' | 'red' | 'blue' | 'green'; children: React.ReactNode; action?: React.ReactNode }> = ({
  tone = 'amber',
  children,
  action,
}) => {
  const c = TONES[tone];
  return (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', borderRadius: '10px', background: c.bg, border: `1px solid ${c.bd}`, color: c.fg, fontSize: '13px', fontWeight: 500 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        {tone !== 'green' && tone !== 'blue' && <AlertTriangle size={16} style={{ flexShrink: 0 }} />}
        <span>{children}</span>
      </span>
      {action}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Form controls                                                       */
/* ------------------------------------------------------------------ */

export const HmsField: React.FC<{ label: string; hint?: string; required?: boolean; children: React.ReactNode; htmlFor?: string }> = ({
  label,
  hint,
  required,
  children,
  htmlFor,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
    <label htmlFor={htmlFor} style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
      {label}
      {required && <span style={{ color: '#dc2626' }}> *</span>}
    </label>
    {children}
    {hint && <span style={{ fontSize: '12px', color: HMS.textSecondary }}>{hint}</span>}
  </div>
);

export const HmsToggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; showLabel?: boolean }> = ({
  checked,
  onChange,
  label,
  disabled,
  showLabel,
}) => {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="hms-switch"
      style={{
        position: 'relative',
        width: '40px',
        height: '24px',
        borderRadius: '9999px',
        border: 'none',
        padding: 0,
        background: checked ? HMS.primary : '#d1d5db',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        flexShrink: 0,
      }}
    >
      {/* Knob slides with transform (19.10: 150ms ease-out, opacity/transform only) */}
      <span className="hms-switch-knob" style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }} />
    </button>
  );
  if (!showLabel) return control;
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: HMS.text, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      {control}
      <span>{label}</span>
    </label>
  );
};

/* ------------------------------------------------------------------ */
/* Dialog (19.8 — role, focus, Esc)                                    */
/* ------------------------------------------------------------------ */

export const HmsModal: React.FC<{
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
  busy?: boolean;
}> = ({ title, description, onClose, children, footer, width = 560, busy }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const first = panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button[data-autofocus]');
    (first || panelRef.current)?.focus();
  }, []);
  return (
    <div
      className="hms-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !busy) {
          e.stopPropagation();
          onClose();
        }
      }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ background: '#ffffff', borderRadius: '14px', width: `${width}px`, maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', outline: 'none' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '20px 24px 0' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: HMS.text, margin: 0 }}>{title}</h3>
            {description && <p style={{ fontSize: '13px', color: HMS.textSecondary, margin: '4px 0 0' }}>{description}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close (Esc)" title="Close (Esc)" style={{ background: 'none', border: 'none', cursor: 'pointer', color: HMS.textSecondary, padding: '4px', borderRadius: '6px', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '16px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>{children}</div>
        {footer && <div style={{ padding: '16px 24px', borderTop: `1px solid ${HMS.border}`, display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>{footer}</div>}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */

export interface HmsToastState {
  id: number;
  message: string;
  tone: 'success' | 'error';
}

export const useHmsToast = () => {
  const [toast, setToast] = useState<HmsToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message, tone });
    timer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { toast, show, clear: () => setToast(null) };
};

export const HmsToast: React.FC<{ toast: HmsToastState | null; onClose: () => void }> = ({ toast, onClose }) => {
  if (!toast) return null;
  const error = toast.tone === 'error';
  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className={`hms-toast${error ? ' hms-shake' : ''}`}
      style={{ position: 'fixed', top: '64px', right: '24px', zIndex: 1100, display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '420px', padding: '12px 14px 12px 16px', borderRadius: '10px', background: error ? '#991b1b' : '#0f172a', color: '#ffffff', fontSize: '14px', fontWeight: 500, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.25)' }}
    >
      {error ? <AlertTriangle size={18} color="#fca5a5" /> : <CheckCircle2 size={18} color="#4ade80" />}
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '2px', display: 'flex' }}>
        <X size={16} />
      </button>
    </div>
  );
};
