// HMS workspace standard — master-detail (HMS design bible, Section 19.6).
// Left box (~30%, never narrower than 340px) lists only the important information;
// right box (~70%) shows the details of the active row. Keyboard-first (19.8).
import React, { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { HMS, HmsProgress, PANEL, HmsEmpty } from './HmsPrimitives';

export interface HmsListRow {
  key: string;
  title: string;
  badge?: React.ReactNode;
  sub?: React.ReactNode;
  metaLeft?: React.ReactNode;
  metaRight?: React.ReactNode;
  /** Completion bar — hidden and replaced by "✓ doneLabel" once complete. */
  progress?: { pct: number; doneLabel: string; tone?: 'blue' | 'amber' | 'red' };
}

export interface HmsPill {
  key: string;
  label: string;
  count: number;
  tone?: 'red' | 'amber';
}

export interface HmsMasterDetailProps {
  listId: string;
  title: string;
  description: string;
  total: number;
  rows: HmsListRow[];
  search: string;
  onSearch: (q: string) => void;
  searchPlaceholder: string;
  pills?: HmsPill[];
  activePill?: string;
  onPill?: (key: string) => void;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  /** Footer hint, e.g. "edit profile". */
  primaryLabel: string;
  /** Enter / double-click on a row. Without it Enter moves focus into the right box. */
  onPrimary?: (key: string) => void;
  headerAction?: React.ReactNode;
  leftExtra?: React.ReactNode;
  detailLabel: string;
  emptyText?: string;
  renderDetail: (activeKey: string | null) => React.ReactNode;
}

const domId = (listId: string, key: string) => `${listId}-${key}`.replace(/[^A-Za-z0-9_-]/g, '_');

/** The highlighted row and the right box always resolve to the same visible row (19.6 selection rules). */
export const resolveActiveKey = (rows: { key: string }[], selected: string | null) =>
  rows.find((r) => r.key === selected)?.key ?? rows[0]?.key ?? null;

export const HmsMasterDetail: React.FC<HmsMasterDetailProps> = ({
  listId,
  title,
  description,
  total,
  rows,
  search,
  onSearch,
  searchPlaceholder,
  pills,
  activePill,
  onPill,
  selectedKey,
  onSelect,
  primaryLabel,
  onPrimary,
  headerAction,
  leftExtra,
  detailLabel,
  emptyText = 'Nothing matches this search or filter.',
  renderDetail,
}) => {
  const searchRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const activeKey = resolveActiveKey(rows, selectedKey);

  // Motion: fade the right box when the selection changes (no remount, keeps focus and scroll)
  useEffect(() => {
    const el = detailRef.current;
    if (!el || !activeKey || typeof el.animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    el.animate([{ opacity: 0.55, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 160, easing: 'ease-out' });
  }, [activeKey, listId]);

  const runPrimary = (key: string) => {
    if (onPrimary) onPrimary(key);
    else detailRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, fromSearch = false) => {
    if (fromSearch && e.key === 'Escape') {
      if (search) onSearch('');
      else (e.currentTarget as HTMLElement).blur();
      return;
    }
    if (e.key === 'Enter' && activeKey) {
      e.preventDefault();
      runPrimary(activeKey);
      return;
    }
    const step: Record<string, number | 'first' | 'last'> = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 };
    if (!fromSearch) Object.assign(step, { Home: 'first', End: 'last' });
    if (!(e.key in step) || !rows.length) return;
    e.preventDefault();
    const idx = Math.max(0, rows.findIndex((r) => r.key === activeKey));
    const d = step[e.key];
    const next = d === 'first' ? 0 : d === 'last' ? rows.length - 1 : Math.min(rows.length - 1, Math.max(0, idx + (d as number)));
    const key = rows[next].key;
    onSelect(key);
    requestAnimationFrame(() => {
      const el = document.getElementById(domId(listId, key));
      el?.scrollIntoView({ block: 'nearest' });
      if (!fromSearch) el?.focus();
    });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) minmax(0, 2.3fr)', gap: '16px', alignItems: 'start' }}>
      {/* Left box */}
      <div style={{ ...PANEL, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: HMS.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h2>
              <span style={{ fontSize: '12px', fontWeight: 600, color: HMS.primary, background: HMS.primaryTint, border: `1px solid ${HMS.primaryBorder}`, padding: '0 8px', borderRadius: '9999px', whiteSpace: 'nowrap' }}>
                {rows.length === total ? total : `${rows.length} of ${total}`}
              </span>
            </div>
            {headerAction}
          </div>
          <p style={{ fontSize: '13px', color: HMS.textSecondary, margin: 0 }}>{description}</p>

          <div style={{ position: 'relative' }}>
            <Search size={18} color={HMS.primary} style={{ position: 'absolute', left: '12px', top: '11px', pointerEvents: 'none' }} />
            <input
              ref={searchRef}
              data-hms-search
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, true)}
              placeholder={`${searchPlaceholder}…`}
              aria-label={searchPlaceholder}
              aria-keyshortcuts="/"
              aria-controls={listId}
              aria-activedescendant={activeKey ? domId(listId, activeKey) : undefined}
              style={{ width: '100%', height: '40px', padding: '0 64px 0 40px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = HMS.primary;
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            {search ? (
              <button
                type="button"
                onClick={() => {
                  onSearch('');
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
                style={{ position: 'absolute', right: '10px', top: '10px', width: '20px', height: '20px', borderRadius: '50%', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >
                <X size={13} />
              </button>
            ) : (
              <span className="hms-kbd" style={{ position: 'absolute', right: '10px', top: '11px' }}>/</span>
            )}
          </div>

          {pills && pills.length > 0 && (
            <div role="group" aria-label="Filters" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {pills.map((p) => {
                const on = activePill === p.key;
                const toneFg = p.tone === 'red' ? '#dc2626' : p.tone === 'amber' ? '#b45309' : '#64748b';
                const toneBg = p.tone === 'red' ? '#fef2f2' : p.tone === 'amber' ? '#fffbeb' : '#f1f5f9';
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => onPill?.(p.key)}
                    aria-pressed={on}
                    style={{ height: '32px', padding: '0 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', background: on ? HMS.primary : '#ffffff', color: on ? '#ffffff' : '#4b5563', border: `1px solid ${on ? HMS.primary : HMS.border}`, boxShadow: on ? '0 1px 3px rgba(37,99,235,0.25)' : 'none' }}
                  >
                    <span>{p.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, padding: '0 6px', borderRadius: '4px', background: on ? 'rgba(255,255,255,0.22)' : toneBg, color: on ? '#ffffff' : toneFg }}>{p.count}</span>
                  </button>
                );
              })}
            </div>
          )}
          {leftExtra}
        </div>

        <div
          id={listId}
          role="listbox"
          aria-label={title}
          onKeyDown={(e) => handleKeyDown(e)}
          style={{ maxHeight: 'calc(100vh - 320px)', minHeight: '120px', overflowY: 'auto', borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column' }}
        >
          {rows.length === 0 ? (
            <HmsEmpty>{emptyText}</HmsEmpty>
          ) : (
            rows.map((row) => {
              const isSel = row.key === activeKey;
              return (
                <div
                  key={row.key}
                  id={domId(listId, row.key)}
                  role="option"
                  aria-selected={isSel}
                  tabIndex={isSel ? 0 : -1}
                  className="hms-row"
                  onClick={() => onSelect(row.key)}
                  onFocus={() => onSelect(row.key)}
                  onDoubleClick={() => runPrimary(row.key)}
                  style={{ padding: '12px 16px', borderBottom: `1px solid ${HMS.divider}`, borderLeft: `3px solid ${isSel ? HMS.primary : 'transparent'}`, background: isSel ? HMS.primaryTint : '#ffffff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span title={row.title} style={{ flex: 1, minWidth: 0, fontSize: '14px', fontWeight: 600, color: isSel ? HMS.primaryStrong : HMS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</span>
                    {row.badge && <span style={{ flexShrink: 0 }}>{row.badge}</span>}
                  </div>
                  {row.sub && <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.sub}</div>}
                  {(row.metaLeft || row.metaRight) && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '12px', color: HMS.label }}>
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.metaLeft}</span>
                      <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>{row.metaRight}</span>
                    </div>
                  )}
                  {row.progress && (
                    <span style={{ alignSelf: row.progress.pct >= 100 ? 'flex-start' : 'stretch' }}>
                      <HmsProgress pct={row.progress.pct} doneLabel={row.progress.doneLabel} tone={row.progress.tone} />
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '12px 16px', fontSize: '12px', color: HMS.textSecondary, borderTop: `1px solid ${HMS.border}` }}>
          <span>
            {rows.length} of {total} shown
          </span>
          <span>↑ ↓ move · Enter {primaryLabel}</span>
        </div>
      </div>

      {/* Right box */}
      <div
        ref={detailRef}
        tabIndex={-1}
        aria-label={`${detailLabel} details`}
        style={{ ...PANEL, position: 'sticky', top: '76px', maxHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', outline: 'none' }}
      >
        {renderDetail(activeKey)}
      </div>
    </div>
  );
};
