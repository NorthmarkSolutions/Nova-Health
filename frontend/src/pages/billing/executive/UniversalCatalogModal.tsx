import React, { useEffect, useMemo, useState } from 'react';
import { Search, X, Plus, Check, Stethoscope, FlaskConical, Pill, Layers } from 'lucide-react';
import { billingService, TariffItem } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { C, Btn, mono, inputStyle } from './executiveUi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPick: (tariff: TariffItem, qty?: number) => void;
  disabled?: boolean;
}

type DeptFilter = 'ALL' | 'OPD' | 'LAB' | 'PHARMACY';

export const UniversalCatalogModal: React.FC<Props> = ({ isOpen, onClose, onPick, disabled }) => {
  const { format: fmt } = useCurrency();
  const [tariffs, setTariffs] = useState<TariffItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DeptFilter>('ALL');
  const [search, setSearch] = useState('');
  const [recentlyAdded, setRecentlyAdded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    const fetchTariffs = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await billingService.getTariffs({ department: 'OPD,LAB,PHARMACY', is_active: true });
        setTariffs(data || []);
      } catch {
        setError('Failed to load universal catalog.');
      } finally {
        setLoading(false);
      }
    };
    fetchTariffs();
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    return tariffs.filter((t) => {
      const matchDept = activeTab === 'ALL' || t.department.toUpperCase() === activeTab;
      const q = search.trim().toLowerCase();
      const matchSearch = !q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q);
      return matchDept && matchSearch;
    });
  }, [tariffs, activeTab, search]);

  const counts = useMemo(() => {
    return {
      ALL: tariffs.length,
      OPD: tariffs.filter((t) => t.department.toUpperCase() === 'OPD').length,
      LAB: tariffs.filter((t) => t.department.toUpperCase() === 'LAB').length,
      PHARMACY: tariffs.filter((t) => t.department.toUpperCase() === 'PHARMACY').length
    };
  }, [tariffs]);

  const handleAdd = (item: TariffItem) => {
    onPick(item, 1);
    setRecentlyAdded((prev) => ({ ...prev, [item.code]: true }));
    setTimeout(() => {
      setRecentlyAdded((prev) => ({ ...prev, [item.code]: false }));
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(17, 24, 39, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.surface,
          borderRadius: 14,
          border: `1px solid ${C.border}`,
          boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
          width: '100%',
          maxWidth: 820,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFFFFF'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.text }}>
              Universal Department Catalog
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: 12, color: C.muted }}>
              Synchronized tariffs across OPD Doctor Fees, Laboratory Tests, and Pharmacy Formulary
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: C.muted,
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Department Tabs */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: '#FAFAFA' }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={16} color={C.faint} style={{ position: 'absolute', left: 12, top: 11 }} />
            <input
              style={{ ...inputStyle, paddingLeft: 36, background: '#FFFFFF' }}
              placeholder="Search by test name, doctor consultation, medicine, or service code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: 9,
                  background: 'none',
                  border: 'none',
                  color: C.muted,
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('ALL')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                border: activeTab === 'ALL' ? `1px solid ${C.primary}` : `1px solid ${C.border}`,
                background: activeTab === 'ALL' ? C.primarySoft : '#FFFFFF',
                color: activeTab === 'ALL' ? C.primary : C.textSub,
                cursor: 'pointer'
              }}
            >
              <Layers size={14} /> All Services ({counts.ALL})
            </button>
            <button
              onClick={() => setActiveTab('OPD')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                border: activeTab === 'OPD' ? '1px solid #93C5FD' : `1px solid ${C.border}`,
                background: activeTab === 'OPD' ? '#EFF6FF' : '#FFFFFF',
                color: activeTab === 'OPD' ? '#1D4ED8' : C.textSub,
                cursor: 'pointer'
              }}
            >
              <Stethoscope size={14} /> Doctor Consultations ({counts.OPD})
            </button>
            <button
              onClick={() => setActiveTab('LAB')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                border: activeTab === 'LAB' ? '1px solid #A7F3D0' : `1px solid ${C.border}`,
                background: activeTab === 'LAB' ? '#ECFDF5' : '#FFFFFF',
                color: activeTab === 'LAB' ? '#047857' : C.textSub,
                cursor: 'pointer'
              }}
            >
              <FlaskConical size={14} /> Diagnostic Lab ({counts.LAB})
            </button>
            <button
              onClick={() => setActiveTab('PHARMACY')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                border: activeTab === 'PHARMACY' ? '1px solid #DDD6FE' : `1px solid ${C.border}`,
                background: activeTab === 'PHARMACY' ? '#F5F3FF' : '#FFFFFF',
                color: activeTab === 'PHARMACY' ? '#6D28D9' : C.textSub,
                cursor: 'pointer'
              }}
            >
              <Pill size={14} /> Pharmacy Medicines ({counts.PHARMACY})
            </button>
          </div>
        </div>

        {/* Catalog Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {loading && (
            <div style={{ padding: 30, textAlign: 'center', color: C.muted, fontSize: 14 }}>
              Loading synchronized hospital tariffs…
            </div>
          )}

          {error && (
            <div style={{ padding: 20, textAlign: 'center', color: C.red, fontSize: 14 }}>
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: C.muted, fontSize: 14 }}>
              No services found matching your criteria.
            </div>
          )}

          {!loading && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.map((item) => {
                const isOpd = item.department.toUpperCase() === 'OPD';
                const isLab = item.department.toUpperCase() === 'LAB';
                const isPharm = item.department.toUpperCase() === 'PHARMACY';

                const deptBadgeBg = isOpd ? '#EFF6FF' : isLab ? '#ECFDF5' : isPharm ? '#F5F3FF' : '#F3F4F6';
                const deptBadgeColor = isOpd ? '#1D4ED8' : isLab ? '#047857' : isPharm ? '#6D28D9' : C.textSub;
                const deptLabelText = isOpd ? 'OPD Consultation' : isLab ? 'Lab Diagnostic' : isPharm ? 'Pharmacy' : item.department;

                const isAdded = recentlyAdded[item.code];

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#FFFFFF',
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      gap: 12,
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>
                          {item.name}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: deptBadgeBg,
                            color: deptBadgeColor,
                            letterSpacing: '0.02em'
                          }}
                        >
                          {deptLabelText}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, ...mono }}>
                        <span>{item.code}</span>
                        {Number(item.gst_rate) > 0 ? (
                          <span> · GST {Number(item.gst_rate)}%</span>
                        ) : (
                          <span style={{ color: '#059669' }}> · GST Exempt</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: C.text, ...mono }}>
                          {fmt(Number(item.base_price))}
                        </div>
                        <div style={{ fontSize: 11, color: C.faint }}>Base Tariff</div>
                      </div>

                      <Btn
                        variant={isAdded ? 'secondary' : 'primary'}
                        disabled={disabled}
                        onClick={() => handleAdd(item)}
                        style={{
                          height: 34,
                          fontSize: 13,
                          padding: '0 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          background: isAdded ? '#ECFDF5' : undefined,
                          color: isAdded ? '#047857' : undefined,
                          borderColor: isAdded ? '#A7F3D0' : undefined
                        }}
                      >
                        {isAdded ? (
                          <>
                            <Check size={14} /> Added
                          </>
                        ) : (
                          <>
                            <Plus size={14} /> Add to Bill
                          </>
                        )}
                      </Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: `1px solid ${C.border}`,
            background: '#FAFAFA',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
            color: C.muted
          }}
        >
          <span>Showing {filtered.length} services ready for frontdesk cashier addition</span>
          <Btn onClick={onClose} style={{ height: 32, fontSize: 13 }}>
            Done
          </Btn>
        </div>
      </div>
    </div>
  );
};
