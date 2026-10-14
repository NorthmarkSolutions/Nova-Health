// Billing · Admin — small building blocks shared by the admin sections, all on the HMS tokens (design bible §19.1):
// a horizontal bar list, a utilisation meter, a compact data table and a tariff search box.
import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { HMS, INPUT } from '../../../components/hms';
import { billingService, TariffItem } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { MONO } from './adminDeskData';

/** Labelled horizontal bars scaled to the largest value. */
export const AdmBars: React.FC<{ items: { label: string; value: number; display: string; note?: string }[]; tone?: string }> = ({ items, tone = HMS.primary }) => {
  const max = Math.max(0, ...items.map((i) => i.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px' }}>
      {items.map((i) => (
        <div key={i.label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px' }}>
            <span style={{ fontWeight: 600, color: HMS.text }}>{i.label}</span>
            <span style={{ color: HMS.label }}>
              <span style={MONO}>{i.display}</span>
              {i.note ? <span style={{ color: HMS.textMuted }}> · {i.note}</span> : null}
            </span>
          </div>
          <div style={{ height: '6px', borderRadius: '3px', background: HMS.divider, overflow: 'hidden' }}>
            <div style={{ width: `${max > 0 ? Math.max(0, (i.value / max) * 100) : 0}%`, height: '100%', background: tone, transition: 'width 300ms ease-out' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

/** A utilisation meter (credit used, drawer cash…): unlike a completion bar it never hides, and turns amber / red near the limit. */
export const AdmMeter: React.FC<{ pct: number; label: string; caption?: string }> = ({ pct, label, caption }) => {
  const p = Math.max(0, pct);
  const color = p >= 95 ? '#dc2626' : p >= 85 ? '#f59e0b' : HMS.primary;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px' }}>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(p))} style={{ height: '8px', borderRadius: '4px', background: HMS.divider, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, p)}%`, height: '100%', background: color, transition: 'width 300ms ease-out' }} />
      </div>
      {caption && <span style={{ fontSize: '12px', color: p >= 85 ? '#b45309' : HMS.textSecondary }}>{caption}</span>}
    </div>
  );
};

export interface AdmColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  mono?: boolean;
}

/** Compact table for report and tax figures (design bible §10: tables only for billing and reports). */
export const AdmTable: React.FC<{ columns: AdmColumn[]; rows: Record<string, React.ReactNode>[]; total?: Record<string, React.ReactNode> }> = ({ columns, rows, total }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
      <thead>
        <tr style={{ background: HMS.subtle }}>
          {columns.map((c) => (
            <th key={c.key} scope="col" style={{ textAlign: c.align || 'left', padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: HMS.label, whiteSpace: 'nowrap', borderBottom: `1px solid ${HMS.border}` }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c.key} style={{ textAlign: c.align || 'left', padding: '10px 14px', borderBottom: `1px solid ${HMS.divider}`, ...(c.mono ? MONO : {}) }}>
                {r[c.key]}
              </td>
            ))}
          </tr>
        ))}
        {total && (
          <tr style={{ background: HMS.subtle, fontWeight: 600 }}>
            {columns.map((c) => (
              <td key={c.key} style={{ textAlign: c.align || 'left', padding: '10px 14px', ...(c.mono ? MONO : {}) }}>
                {total[c.key]}
              </td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

/** Search the live tariff (any department) and pick a service. */
export const AdmTariffSearch: React.FC<{ onPick: (t: TariffItem) => void; placeholder?: string; disabled?: boolean; id?: string }> = ({ onPick, placeholder = 'Search tariff service or code', disabled, id }) => {
  const { format } = useCurrency();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<TariffItem[]>([]);
  const term = q.trim();

  useEffect(() => {
    if (term.length < 2) return;
    let stale = false;
    const t = window.setTimeout(() => {
      billingService
        .getTariffs({ search: term, is_active: true })
        .then((r) => !stale && setHits((r || []).slice(0, 8)))
        .catch(() => !stale && setHits([]));
    }, 250);
    return () => {
      stale = true;
      window.clearTimeout(t);
    };
  }, [term]);

  const shown = term.length >= 2 ? hits : [];
  return (
    <div style={{ position: 'relative' }}>
      <Search size={18} color={HMS.primary} style={{ position: 'absolute', left: '12px', top: '11px', pointerEvents: 'none' }} />
      <input id={id} style={{ ...INPUT, paddingLeft: '40px' }} value={q} disabled={disabled} placeholder={placeholder} aria-label={placeholder} onChange={(e) => setQ(e.target.value)} />
      {shown.length > 0 && (
        <div role="listbox" aria-label="Tariff matches" style={{ position: 'absolute', left: 0, right: 0, top: '44px', zIndex: 20, background: '#ffffff', border: `1px solid ${HMS.border}`, borderRadius: '10px', boxShadow: '0 12px 32px rgba(17,24,39,0.12)', overflow: 'hidden' }}>
          {shown.map((t) => (
            <button
              key={t.code}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => {
                onPick(t);
                setQ('');
                setHits([]);
              }}
              style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 12px', border: 'none', borderBottom: `1px solid ${HMS.divider}`, background: '#ffffff', cursor: 'pointer', fontSize: '13px' }}
            >
              <span>
                {t.name} <span style={{ ...MONO, color: HMS.textSecondary }}>· {t.code}</span>
              </span>
              <span style={MONO}>{format(Number(t.base_price))}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
