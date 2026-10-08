import React from 'react';
import { X } from 'lucide-react';

// Design tokens from "Billing Executive Workspace v2" specification.
export const C = {
  bg: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textSub: '#374151',
  muted: '#6B7280',
  faint: '#9CA3AF',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primarySoft: '#EFF6FF',
  primaryDisabled: '#93C5FD',
  hover: '#F5F9FF',
  green: '#15803D',
  greenSoft: '#F0FDF4',
  greenBorder: '#BBF7D0',
  amber: '#B45309',
  amberSoft: '#FFFBEB',
  amberBorder: '#FDE68A',
  red: '#DC2626',
  redSoft: '#FEF2F2',
  redBorder: '#FECACA',
  indigo: '#4338CA',
  indigoSoft: '#EEF2FF'
};

export const mono: React.CSSProperties = { fontFamily: '"JetBrains Mono", ui-monospace, monospace' };

export const card: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 12
};

export const STATUS_STYLES: Record<string, [string, string, string]> = {
  AWAITING_BILL: ['Awaiting bill', C.textSub, '#F3F4F6'],
  DRAFT: ['Draft', C.amber, C.amberSoft],
  UNPAID: ['Unpaid', C.amber, C.amberSoft],
  PARTIALLY_PAID: ['Partial', C.amber, C.amberSoft],
  PAID: ['Paid', C.green, C.greenSoft],
  CREDIT_AUTHORIZED: ['Credit', C.indigo, C.indigoSoft],
  CANCELLED: ['Cancelled', C.muted, '#F3F4F6'],
  REFUNDED: ['Refunded', C.muted, '#F3F4F6'],
  PENDING: ['Pending', C.amber, C.amberSoft],
  APPROVED: ['Approved', C.green, C.greenSoft],
  REJECTED: ['Rejected', C.red, C.redSoft],
  ESCALATED: ['Escalated', C.indigo, C.indigoSoft],
  DISBURSED: ['Refunded', C.green, C.greenSoft],
  WITHDRAWN: ['Withdrawn', C.muted, '#F3F4F6']
};

export const StatusChip: React.FC<{ status: string; label?: string }> = ({ status, label }) => {
  const [text, fg, bg] = STATUS_STYLES[status] || [status, C.textSub, '#F3F4F6'];
  return (
    <span style={{ fontSize: 12, fontWeight: 500, color: fg, background: bg, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {label || text}
    </span>
  );
};

export const StatBadge: React.FC = () => (
  <span style={{ fontSize: 11, fontWeight: 700, color: C.red, background: C.redSoft, border: `1px solid ${C.redBorder}`, padding: '0 6px', borderRadius: 6 }}>
    STAT
  </span>
);

export const PageHeader: React.FC<{ title: string; subtitle: string; actions?: React.ReactNode }> = ({ title, subtitle, actions }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
    <div>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: C.text }}>{title}</h1>
      <p style={{ margin: '4px 0 0', fontSize: 14, color: C.muted }}>{subtitle}</p>
    </div>
    {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
  </div>
);

export const KpiCard: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: string;
  trend?: string;
  trendColor?: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}> = ({ label, value, sub, trend, trendColor, icon, active, onClick }) => (
  <div
    onClick={onClick}
    style={{
      ...card,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      cursor: onClick ? 'pointer' : 'default',
      borderColor: active ? C.primary : C.border,
      boxShadow: active ? `0 0 0 1px ${C.primary}` : 'none'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: C.muted, fontSize: 13 }}>
      <span>{label}</span>
      {icon}
    </div>
    <div style={{ fontSize: 24, fontWeight: 600, color: C.text, ...mono }}>{value}</div>
    {(sub || trend) && (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
        <span style={{ color: C.muted }}>{sub}</span>
        {trend && <span style={{ color: trendColor || C.muted, fontWeight: 500 }}>{trend}</span>}
      </div>
    )}
  </div>
);

export const PillTabs: React.FC<{
  tabs: Array<{ key: string; label: string; count?: number }>;
  active: string;
  onPick: (key: string) => void;
}> = ({ tabs, active, onPick }) => (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    {tabs.map((t) => {
      const on = t.key === active;
      return (
        <button
          key={t.key}
          onClick={() => onPick(t.key)}
          style={{
            height: 32,
            padding: '0 12px',
            borderRadius: 999,
            border: `1px solid ${on ? C.primary : C.border}`,
            background: on ? C.primarySoft : C.surface,
            color: on ? C.primary : C.textSub,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          {t.label}
          {t.count != null && (
            <span style={{ fontSize: 11, color: on ? C.primary : C.muted, background: on ? '#DBEAFE' : '#F3F4F6', padding: '0 6px', borderRadius: 999 }}>
              {t.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }> = ({
  variant = 'secondary',
  disabled,
  style,
  children,
  ...rest
}) => {
  const palette: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: disabled ? C.primaryDisabled : C.primary, color: '#FFFFFF', border: 'none' },
    secondary: { background: C.surface, color: disabled ? C.faint : C.text, border: `1px solid ${C.border}` },
    danger: { background: C.surface, color: disabled ? C.faint : C.red, border: `1px solid ${C.redBorder}` },
    ghost: { background: 'transparent', color: disabled ? C.faint : C.primary, border: 'none' }
  };
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        height: 38,
        padding: '0 14px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        whiteSpace: 'nowrap',
        ...palette[variant],
        ...style
      }}
    >
      {children}
    </button>
  );
};

export const inputStyle: React.CSSProperties = {
  height: 38,
  width: '100%',
  padding: '0 12px',
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  fontSize: 14,
  color: C.text,
  background: C.surface,
  outline: 'none'
};

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: C.textSub, fontWeight: 500, flex: 1, minWidth: 0 }}>
    {label}
    {children}
    {hint && <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>{hint}</span>}
  </label>
);

export const Row: React.FC<{ label: React.ReactNode; value: React.ReactNode; strong?: boolean; color?: string }> = ({ label, value, strong, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: strong ? 15 : 14, fontWeight: strong ? 600 : 400, color: color || (strong ? C.text : C.textSub) }}>
    <span>{label}</span>
    <span style={mono}>{value}</span>
  </div>
);

export const Callout: React.FC<{ tone: 'amber' | 'red' | 'green' | 'indigo' | 'neutral'; title?: string; children: React.ReactNode; icon?: React.ReactNode }> = ({ tone, title, children, icon }) => {
  const tones = {
    amber: [C.amber, C.amberSoft, C.amberBorder],
    red: [C.red, C.redSoft, C.redBorder],
    green: [C.green, C.greenSoft, '#BBF7D0'],
    indigo: [C.indigo, C.indigoSoft, '#C7D2FE'],
    neutral: [C.textSub, C.bg, C.border]
  }[tone];
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 10, background: tones[1], border: `1px solid ${tones[2]}`, color: tones[0], fontSize: 13 }}>
      {icon}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {title && <span style={{ fontWeight: 600 }}>{title}</span>}
        <span>{children}</span>
      </div>
    </div>
  );
};

/** Right-hand slide-over drawer (560px in the specification). */
export const Drawer: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  width?: number;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, width = 560, onClose, footer, children }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(17,24,39,0.32)' }} />
    <div
      role="dialog"
      aria-label={title}
      style={{
        position: 'relative',
        width: `min(${width}px, 100vw)`,
        height: '100vh',
        background: C.surface,
        boxShadow: '-12px 0 32px rgba(17,24,39,0.12)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'nhSlideIn 160ms ease-out'
      }}
    >
      <style>{'@keyframes nhSlideIn{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}'}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '18px 20px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: C.text }}>{title}</span>
          {subtitle && <span style={{ fontSize: 13, color: C.muted }}>{subtitle}</span>}
        </div>
        <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: C.muted, padding: 4 }}>
          <X size={18} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
      {footer && <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, background: C.bg }}>{footer}</div>}
    </div>
  </div>
);

export const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ padding: '32px 16px', textAlign: 'center', color: C.muted, fontSize: 14 }}>{text}</div>
);

export const DEPARTMENT_LABELS: Record<string, string> = {
  OPD: 'OPD',
  LAB: 'Lab',
  RADIOLOGY: 'Radiology',
  PHARMACY: 'Pharmacy',
  IPD: 'IPD',
  OT: 'OT',
  GENERAL: 'General'
};

export const deptLabel = (d: string) => DEPARTMENT_LABELS[d] || d;

export const apiError = (err: any, fallback: string): string =>
  err?.response?.data?.detail || err?.response?.data?.error || err?.message || fallback;
