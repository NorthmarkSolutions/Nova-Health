import React, { useEffect, useState } from 'react';
import { Plus, Search, BookOpen } from 'lucide-react';
import { billingService, TariffItem } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { C, Btn, deptLabel, inputStyle, mono } from './executiveUi';
import { UniversalCatalogModal } from './UniversalCatalogModal';

interface Props {
  onPick: (tariff: TariffItem) => void;
  disabled?: boolean;
  placeholder?: string;
}

/** Search-as-you-type over active Tariff Master entries or browse full catalog modal. */
export const TariffServicePicker: React.FC<Props> = ({
  onPick,
  disabled,
  placeholder = 'Add service from Tariff Master'
}) => {
  const { format: fmt } = useCurrency();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TariffItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let stale = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await billingService.getTariffs({
          search: q,
          department: 'OPD,LAB,PHARMACY',
          is_active: true
        });
        if (!stale) {
          setResults((data || []).slice(0, 8));
          setError(false);
        }
      } catch {
        if (!stale) setError(true);
      } finally {
        if (!stale) setSearching(false);
      }
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query]);

  const open = query.trim().length >= 2;

  const handlePick = (tariff: TariffItem) => {
    onPick(tariff);
    setQuery('');
    setResults([]);
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} color={C.faint} style={{ position: 'absolute', left: 10, top: 11 }} />
          <input
            style={{ ...inputStyle, paddingLeft: 34 }}
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label="Search Tariff Master"
          />
          {open && (
            <div
              role="listbox"
              style={{
                position: 'absolute',
                top: 42,
                left: 0,
                right: 0,
                zIndex: 25,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(17,24,39,0.12)',
                overflow: 'hidden',
                maxHeight: 280,
                overflowY: 'auto'
              }}
            >
              {searching && results.length === 0 && (
                <div style={{ padding: 12, fontSize: 13, color: C.muted }}>Searching…</div>
              )}
              {error && <div style={{ padding: 12, fontSize: 13, color: C.red }}>Tariff Master is unavailable.</div>}
              {!searching && !error && results.length === 0 && (
                <div style={{ padding: 12, fontSize: 13, color: C.muted }}>
                  No active tariff matches “{query.trim()}”.
                </div>
              )}
              {results.map((t) => (
                <button
                  key={t.id}
                  role="option"
                  onClick={() => handlePick(t)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    border: 'none',
                    borderBottom: `1px solid ${C.border}`,
                    background: C.surface,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.hover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = C.surface)}
                >
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{t.name}</span>
                    <span style={{ fontSize: 12, color: C.muted, ...mono }}>
                      {t.code} · {deptLabel(t.department)}
                      {Number(t.gst_rate) > 0 ? ` · GST ${Number(t.gst_rate)}%` : ' · GST Exempt'}
                    </span>
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 14,
                      color: C.text,
                      ...mono
                    }}
                  >
                    {fmt(Number(t.base_price))} <Plus size={14} color={C.primary} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Btn
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={disabled}
          style={{
            height: 38,
            fontSize: 13,
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#FFFFFF',
            whiteSpace: 'nowrap'
          }}
          title="Browse full hospital catalog with OPD, Lab, and Pharmacy categories"
        >
          <BookOpen size={15} color={C.primary} /> Browse Catalog
        </Btn>
      </div>

      <UniversalCatalogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPick={(tariff) => handlePick(tariff)}
        disabled={disabled}
      />
    </>
  );
};
