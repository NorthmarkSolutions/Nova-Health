import React, { useState } from 'react';
import { patientJourneyService } from '../../../services/patientJourneyService';

interface PricingItem {
  id: string;
  name: string;
  code: string;
  section: string;
  basePrice: number | null;
  tpaPrice: number | null;
  statSurcharge: string;
  billingStatus: 'Synced' | 'Pending sync' | 'No price';
  changedDate: string;
  sampleType: string;
  tatTarget: string;
  analyzer: string;
  effectiveDate: string;
  packageInclusions: string;
  addedBy?: string;
}

interface LabAdminPricingViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const LabAdminPricingView: React.FC<LabAdminPricingViewProps> = () => {
  const [items, setItems] = useState<PricingItem[]>([
    {
      id: 'prc-1',
      name: 'Complete blood count',
      code: 'HEM-CBC-01',
      section: 'Hematology',
      basePrice: 350,
      tpaPrice: 300,
      statSurcharge: '+50%',
      billingStatus: 'Synced',
      changedDate: '12 Mar',
      sampleType: 'Whole Blood · EDTA',
      tatTarget: '45 m',
      analyzer: 'Sysmex XN-1000',
      effectiveDate: '2026-03-12',
      packageInclusions: 'Executive Health Check, Basic Wellness',
    },
    {
      id: 'prc-2',
      name: 'Coagulation profile',
      code: 'HEM-COA-02',
      section: 'Hematology',
      basePrice: 600,
      tpaPrice: 520,
      statSurcharge: '+50%',
      billingStatus: 'Synced',
      changedDate: '12 Mar',
      sampleType: 'Citrate Plasma · Blue top',
      tatTarget: '60 m',
      analyzer: 'Sysmex CA-600',
      effectiveDate: '2026-03-12',
      packageInclusions: 'Pre-Op Surgical Clearance',
    },
    {
      id: 'prc-3',
      name: 'HbA1c',
      code: 'BIO-A1C-01',
      section: 'Biochemistry',
      basePrice: 480,
      tpaPrice: 420,
      statSurcharge: '—',
      billingStatus: 'Pending sync',
      changedDate: 'Today 09:05',
      sampleType: 'Whole Blood · EDTA',
      tatTarget: '2 h',
      analyzer: 'Bio-Rad D-10',
      effectiveDate: '2026-10-01',
      packageInclusions: 'Diabetes Panel, Senior Citizen Panel',
    },
    {
      id: 'prc-4',
      name: 'Lipid profile',
      code: 'BIO-LIP-01',
      section: 'Biochemistry',
      basePrice: 550,
      tpaPrice: 480,
      statSurcharge: '+50%',
      billingStatus: 'Synced',
      changedDate: '02 Aug',
      sampleType: 'Serum · SST',
      tatTarget: '3 h',
      analyzer: 'Beckman AU680',
      effectiveDate: '2026-08-02',
      packageInclusions: 'Executive Health Check, Cardiac Wellness',
    },
    {
      id: 'prc-5',
      name: 'Liver function test',
      code: 'BIO-LFT-01',
      section: 'Biochemistry',
      basePrice: 700,
      tpaPrice: 620,
      statSurcharge: '+50%',
      billingStatus: 'Synced',
      changedDate: '02 Aug',
      sampleType: 'Serum · SST',
      tatTarget: '3 h',
      analyzer: 'Beckman AU680',
      effectiveDate: '2026-08-02',
      packageInclusions: 'Executive Health Check, Whole Body Panel',
    },
    {
      id: 'prc-6',
      name: 'Renal function panel',
      code: 'BIO-RFT-01',
      section: 'Biochemistry',
      basePrice: 650,
      tpaPrice: 560,
      statSurcharge: '+50%',
      billingStatus: 'Synced',
      changedDate: '02 Aug',
      sampleType: 'Serum · SST',
      tatTarget: '2 h',
      analyzer: 'Beckman AU680',
      effectiveDate: '2026-08-02',
      packageInclusions: 'Executive Health Check, Renal Health',
    },
    {
      id: 'prc-7',
      name: 'Thyroid profile',
      code: 'IMM-THY-01',
      section: 'Immunoassay',
      basePrice: 750,
      tpaPrice: 650,
      statSurcharge: '+50%',
      billingStatus: 'Synced',
      changedDate: '15 Jun',
      sampleType: 'Serum · SST',
      tatTarget: '4 h',
      analyzer: 'Roche Cobas e411',
      effectiveDate: '2026-06-15',
      packageInclusions: 'Women Wellness, Senior Citizen Panel',
    },
    {
      id: 'prc-8',
      name: 'Troponin I (hs)',
      code: 'IMM-TRP-01',
      section: 'Immunoassay',
      basePrice: 1200,
      tpaPrice: 1050,
      statSurcharge: 'Incl.',
      billingStatus: 'Synced',
      changedDate: '15 Jun',
      sampleType: 'Plasma · Heparin',
      tatTarget: '30 m',
      analyzer: 'Roche Cobas e411',
      effectiveDate: '2026-06-15',
      packageInclusions: 'Emergency Cardiac Panel',
    },
    {
      id: 'prc-9',
      name: 'Vitamin D (25-OH)',
      code: 'IMM-VTD-01',
      section: 'Immunoassay',
      basePrice: null,
      tpaPrice: null,
      statSurcharge: 'Not offered',
      billingStatus: 'No price',
      changedDate: 'New',
      sampleType: 'Serum · SST',
      tatTarget: '24 h',
      analyzer: 'Roche Cobas e411',
      effectiveDate: '2026-10-01',
      packageInclusions: 'Executive Health Check, Senior Citizen Panel',
      addedBy: 'Dr. Kavitha Menon · 29 Sep',
    },
  ]);

  // Selected item for the right edit form
  const [selectedId, setSelectedId] = useState<string>('prc-9');
  const selectedItem = items.find((i) => i.id === selectedId) || items[0];

  // Form State
  const [basePriceInput, setBasePriceInput] = useState<string>(
    selectedItem.basePrice ? `Rs. ${selectedItem.basePrice}` : 'Rs. 1,400'
  );
  const [tpaPriceInput, setTpaPriceInput] = useState<string>(
    selectedItem.tpaPrice ? `Rs. ${selectedItem.tpaPrice}` : 'Rs. 1,250'
  );
  const [statSurchargeInput, setStatSurchargeInput] = useState<string>(
    selectedItem.statSurcharge || 'Not offered'
  );
  const [effectiveDateInput, setEffectiveDateInput] = useState<string>(
    selectedItem.effectiveDate || '2026-10-01'
  );
  const [packageInclusionInput, setPackageInclusionInput] = useState<string>(
    selectedItem.packageInclusions || 'Executive Health Check, Senior Citizen Panel'
  );

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'noprice' | 'pending' | 'hematology' | 'biochem' | 'immuno'>('all');

  // Modals & Feedback
  const [showImportModal, setShowImportModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSelectTest = (item: PricingItem) => {
    setSelectedId(item.id);
    setBasePriceInput(item.basePrice ? `Rs. ${item.basePrice.toLocaleString('en-IN')}` : 'Rs. 1,400');
    setTpaPriceInput(item.tpaPrice ? `Rs. ${item.tpaPrice.toLocaleString('en-IN')}` : 'Rs. 1,250');
    setStatSurchargeInput(item.statSurcharge || 'Not offered');
    setEffectiveDateInput(item.effectiveDate || '2026-10-01');
    setPackageInclusionInput(item.packageInclusions || '');
  };

  const handleSaveDraft = () => {
    const rawBase = parseFloat(basePriceInput.replace(/[^0-9.]/g, '')) || null;
    const rawTpa = parseFloat(tpaPriceInput.replace(/[^0-9.]/g, '')) || null;

    setItems((prev) =>
      prev.map((i) =>
        i.id === selectedId
          ? {
              ...i,
              basePrice: rawBase,
              tpaPrice: rawTpa,
              statSurcharge: statSurchargeInput,
              effectiveDate: effectiveDateInput,
              packageInclusions: packageInclusionInput,
              billingStatus: 'Pending sync',
              changedDate: 'Today (Draft)',
            }
          : i
      )
    );
    triggerToast(`Draft price saved for ${selectedItem.name}`);
  };

  const handleSaveAndSync = () => {
    const rawBase = parseFloat(basePriceInput.replace(/[^0-9.]/g, '')) || null;
    const rawTpa = parseFloat(tpaPriceInput.replace(/[^0-9.]/g, '')) || null;

    setItems((prev) =>
      prev.map((i) =>
        i.id === selectedId
          ? {
              ...i,
              basePrice: rawBase,
              tpaPrice: rawTpa,
              statSurcharge: statSurchargeInput,
              effectiveDate: effectiveDateInput,
              packageInclusions: packageInclusionInput,
              billingStatus: 'Synced',
              changedDate: 'Today (Synced)',
            }
          : i
      )
    );

    if (selectedItem && rawBase) {
      patientJourneyService.updateLabTariff({
        testName: selectedItem.name,
        code: selectedItem.code,
        basePrice: rawBase,
        tpaPrice: rawTpa || Math.round(rawBase * 0.85),
        statSurcharge: statSurchargeInput,
        effectiveDate: effectiveDateInput,
      });
    }

    triggerToast(`Price synced to Billing tariff master for ${selectedItem.name}`);
  };

  const handleSyncAllToBilling = () => {
    setItems((prev) =>
      prev.map((i) =>
        i.billingStatus === 'Pending sync' ? { ...i, billingStatus: 'Synced', changedDate: 'Today (Synced)' } : i
      )
    );

    const tariffsToSync: Record<string, any> = {};
    items.forEach((it) => {
      if (it.basePrice) {
        tariffsToSync[it.name] = {
          testName: it.name,
          code: it.code,
          basePrice: it.basePrice,
          tpaPrice: it.tpaPrice || Math.round(it.basePrice * 0.85),
          statSurcharge: it.statSurcharge,
          effectiveDate: it.effectiveDate,
        };
      }
    });
    patientJourneyService.syncAllLabTariffs(tariffsToSync);

    triggerToast('All pending rate changes synchronized with Billing tariff master');
  };

  // Filter items
  const filteredItems = items.filter((i) => {
    const matchesSearch =
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.section.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === 'noprice') return i.billingStatus === 'No price';
    if (activeFilter === 'pending') return i.billingStatus === 'Pending sync';
    if (activeFilter === 'hematology') return i.section === 'Hematology';
    if (activeFilter === 'biochem') return i.section === 'Biochemistry';
    if (activeFilter === 'immuno') return i.section === 'Immunoassay';
    return true;
  });

  const pendingSyncCount = items.filter((i) => i.billingStatus === 'Pending sync').length;
  const noPriceCount = items.filter((i) => i.billingStatus === 'No price').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#111827',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>
            Test Pricing
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
            Prices for every lab test. Changes sync to the Billing tariff master used by Reception, Cashier and IPD invoices.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowImportModal(true)}
            style={{
              whiteSpace: 'nowrap',
              height: '40px',
              padding: '0 16px',
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              color: '#111827',
              cursor: 'pointer',
            }}
          >
            Import rate card
          </button>
          <button
            onClick={handleSyncAllToBilling}
            style={{
              whiteSpace: 'nowrap',
              height: '40px',
              padding: '0 16px',
              borderRadius: '10px',
              border: '1px solid #2563EB',
              background: '#2563EB',
              fontSize: '14px',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            Sync all to Billing
          </button>
        </div>
      </header>

      {/* 4 KPI Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
        {/* Card 1 */}
        <div
          style={{
            background: '#FFFFFF',
            border: noPriceCount > 0 ? '1px solid #FECACA' : '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Priced tests</span>
            {noPriceCount > 0 && (
              <span
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: '#FEF2F2',
                  color: '#B91C1C',
                }}
              >
                Action
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{
                fontSize: '30px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: noPriceCount > 0 ? '#B91C1C' : '#111827',
              }}
            >
              88 / 89
            </span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>
              {noPriceCount > 0 ? '1 new test without a price' : 'All tests priced'}
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div
          style={{
            background: '#FFFFFF',
            border: pendingSyncCount > 0 ? '1px solid #FDE68A' : '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Pending Billing sync</span>
            {pendingSyncCount > 0 && (
              <span
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: '#FFFBEB',
                  color: '#B45309',
                }}
              >
                Sync
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{
                fontSize: '30px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: pendingSyncCount > 0 ? '#B45309' : '#111827',
              }}
            >
              {pendingSyncCount}
            </span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>HbA1c · edited today</span>
          </div>
        </div>

        {/* Card 3 */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Price changes</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>5</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>this month</span>
          </div>
        </div>

        {/* Card 4 */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Avg. revenue per order</span>
            <span
              style={{
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '999px',
                background: '#F0FDF4',
                color: '#15803D',
              }}
            >
              +4%
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>Rs. 612</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>last 30 days</span>
          </div>
        </div>
      </section>

      {/* Main Section: Rate card table & Price Editor */}
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
        {/* Left Column: Rate Card Table */}
        <div
          style={{
            flex: '999 1 640px',
            minWidth: 0,
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>Rate card</h2>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>Prices in INR · inclusive of all charges</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '36px',
                  padding: '0 12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                  minWidth: '220px',
                  color: '#6B7280',
                  fontSize: '13px',
                  background: '#FFFFFF',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="text"
                  placeholder="Test or code"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '13px',
                    color: '#111827',
                    width: '100%',
                    background: 'transparent',
                  }}
                />
              </div>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveFilter('all')}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  borderRadius: '999px',
                  background: activeFilter === 'all' ? '#2563EB' : '#FFFFFF',
                  color: activeFilter === 'all' ? '#FFFFFF' : '#374151',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: activeFilter === 'all' ? '#2563EB' : '#E5E7EB',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                All · 89
              </button>
              <button
                onClick={() => setActiveFilter('noprice')}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  borderRadius: '999px',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: '#FECACA',
                  background: activeFilter === 'noprice' ? '#FEE2E2' : '#FEF2F2',
                  color: '#B91C1C',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                No price · 1
              </button>
              <button
                onClick={() => setActiveFilter('pending')}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  borderRadius: '999px',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: '#FDE68A',
                  background: activeFilter === 'pending' ? '#FEF3C7' : '#FFFBEB',
                  color: '#B45309',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Pending sync · 1
              </button>
              <button
                onClick={() => setActiveFilter('hematology')}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  borderRadius: '999px',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: activeFilter === 'hematology' ? '#2563EB' : '#E5E7EB',
                  background: activeFilter === 'hematology' ? '#EFF6FF' : '#FFFFFF',
                  color: activeFilter === 'hematology' ? '#1D4ED8' : '#374151',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                Hematology · 18
              </button>
              <button
                onClick={() => setActiveFilter('biochem')}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  borderRadius: '999px',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: activeFilter === 'biochem' ? '#2563EB' : '#E5E7EB',
                  background: activeFilter === 'biochem' ? '#EFF6FF' : '#FFFFFF',
                  color: activeFilter === 'biochem' ? '#1D4ED8' : '#374151',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                Biochemistry · 34
              </button>
              <button
                onClick={() => setActiveFilter('immuno')}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  borderRadius: '999px',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: activeFilter === 'immuno' ? '#2563EB' : '#E5E7EB',
                  background: activeFilter === 'immuno' ? '#EFF6FF' : '#FFFFFF',
                  color: activeFilter === 'immuno' ? '#1D4ED8' : '#374151',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                Immunoassay · 21
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '820px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,0.9fr) 88px 88px 64px 116px 92px',
                  gap: '12px',
                  alignItems: 'center',
                  height: '44px',
                  padding: '0 20px',
                  background: '#F9FAFB',
                  borderTop: '1px solid #E5E7EB',
                  borderBottom: '1px solid #E5E7EB',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6B7280',
                  letterSpacing: '0.02em',
                }}
              >
                <span>TEST · CODE</span>
                <span>SECTION</span>
                <span style={{ textAlign: 'right' }}>BASE</span>
                <span style={{ textAlign: 'right' }}>TPA / PANEL</span>
                <span style={{ textAlign: 'right' }}>STAT</span>
                <span>BILLING</span>
                <span>CHANGED</span>
              </div>

              {filteredItems.map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectTest(item)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,0.9fr) 88px 88px 64px 116px 92px',
                      gap: '12px',
                      alignItems: 'center',
                      minHeight: '64px',
                      padding: '8px 20px',
                      borderBottom: '1px solid #F3F4F6',
                      background: isSelected ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{item.name}</span>
                      <span style={{ fontSize: '12px', color: '#6B7280', fontFamily: "'JetBrains Mono', monospace" }}>
                        {item.code}
                      </span>
                    </div>

                    <span style={{ fontSize: '14px', color: '#374151' }}>{item.section}</span>

                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: item.basePrice ? 600 : 400,
                        color: item.basePrice ? '#111827' : '#9CA3AF',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {item.basePrice ? `Rs. ${item.basePrice}` : '—'}
                    </span>

                    <span
                      style={{
                        fontSize: '14px',
                        color: item.tpaPrice ? '#374151' : '#9CA3AF',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {item.tpaPrice ? `Rs. ${item.tpaPrice}` : '—'}
                    </span>

                    <span
                      style={{
                        fontSize: '14px',
                        color: '#374151',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {item.statSurcharge}
                    </span>

                    {/* Billing Status Badge */}
                    <span>
                      {item.billingStatus === 'Synced' && (
                        <span
                          style={{
                            whiteSpace: 'nowrap',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#F0FDF4',
                            color: '#15803D',
                          }}
                        >
                          Synced
                        </span>
                      )}
                      {item.billingStatus === 'Pending sync' && (
                        <span
                          style={{
                            whiteSpace: 'nowrap',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#FFFBEB',
                            color: '#B45309',
                          }}
                        >
                          Pending sync
                        </span>
                      )}
                      {item.billingStatus === 'No price' && (
                        <span
                          style={{
                            whiteSpace: 'nowrap',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#FEF2F2',
                            color: '#B91C1C',
                          }}
                        >
                          No price
                        </span>
                      )}
                    </span>

                    <span style={{ fontSize: '14px', color: '#6B7280', fontVariantNumeric: 'tabular-nums' }}>
                      {item.changedDate}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px 16px', fontSize: '13px', color: '#6B7280' }}>
            <span>Showing {filteredItems.length} of 89</span>
            <span>1 / 10</span>
          </div>
        </div>

        {/* Right Column: Set Price Form */}
        <div
          style={{
            flex: '1 1 400px',
            minWidth: 0,
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                Set price · {selectedItem.name}
              </h3>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>
                {selectedItem.addedBy || `Code: ${selectedItem.code} · ${selectedItem.section}`}
              </span>
            </div>
            <span
              style={{
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '999px',
                background:
                  selectedItem.billingStatus === 'No price'
                    ? '#FEF2F2'
                    : selectedItem.billingStatus === 'Pending sync'
                    ? '#FFFBEB'
                    : '#F0FDF4',
                color:
                  selectedItem.billingStatus === 'No price'
                    ? '#B91C1C'
                    : selectedItem.billingStatus === 'Pending sync'
                    ? '#B45309'
                    : '#15803D',
              }}
            >
              {selectedItem.billingStatus}
            </span>
          </div>

          {/* Clinical Definition Box (Read-Only) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              padding: '14px',
              borderRadius: '10px',
              background: '#F9FAFB',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Section</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{selectedItem.section}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Sample</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{selectedItem.sampleType}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>TAT target</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{selectedItem.tatTarget}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Analyzer</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{selectedItem.analyzer}</span>
            </div>
            <span style={{ gridColumn: '1 / -1', fontSize: '12px', color: '#6B7280' }}>
              Clinical definition is owned by Pathology and is read-only here.
            </span>
          </div>

          {/* Price Inputs Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Base price</label>
              <div
                style={{
                  height: '40px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '0 12px',
                  fontSize: '14px',
                  background: '#FFFFFF',
                  color: '#111827',
                }}
              >
                <input
                  type="text"
                  value={basePriceInput}
                  onChange={(e) => setBasePriceInput(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#111827',
                  }}
                />
                <span style={{ fontSize: '12px', color: '#6B7280', whiteSpace: 'nowrap' }}>per test</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>TPA / panel rate</label>
              <div
                style={{
                  height: '40px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '0 12px',
                  fontSize: '14px',
                  background: '#FFFFFF',
                  color: '#111827',
                }}
              >
                <input
                  type="text"
                  value={tpaPriceInput}
                  onChange={(e) => setTpaPriceInput(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#111827',
                  }}
                />
                <span style={{ fontSize: '12px', color: '#6B7280', whiteSpace: 'nowrap' }}>per test</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>STAT surcharge</label>
              <select
                value={statSurchargeInput}
                onChange={(e) => setStatSurchargeInput(e.target.value)}
                style={{
                  height: '40px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '0 12px',
                  fontSize: '14px',
                  background: '#FFFFFF',
                  color: '#111827',
                  outline: 'none',
                }}
              >
                <option value="Not offered">Not offered</option>
                <option value="+25%">+25%</option>
                <option value="+50%">+50%</option>
                <option value="+100%">+100%</option>
                <option value="Incl.">Included</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Effective from</label>
              <input
                type="date"
                value={effectiveDateInput}
                onChange={(e) => setEffectiveDateInput(e.target.value)}
                style={{
                  height: '40px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '0 12px',
                  fontSize: '14px',
                  background: '#FFFFFF',
                  color: '#111827',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Package inclusion</label>
            <input
              type="text"
              value={packageInclusionInput}
              onChange={(e) => setPackageInclusionInput(e.target.value)}
              placeholder="e.g. Executive Health Check, Senior Citizen Panel"
              style={{
                height: '40px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '0 12px',
                fontSize: '14px',
                background: '#FFFFFF',
                color: '#111827',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '12px', color: '#6B7280' }}>
              Package prices are recalculated by Billing after sync
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              borderTop: '1px solid #E5E7EB',
              paddingTop: '14px',
            }}
          >
            <button
              onClick={handleSaveDraft}
              style={{
                whiteSpace: 'nowrap',
                height: '40px',
                padding: '0 16px',
                borderRadius: '10px',
                border: '1px solid #E5E7EB',
                background: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                color: '#111827',
                cursor: 'pointer',
              }}
            >
              Save draft
            </button>
            <button
              onClick={handleSaveAndSync}
              style={{
                whiteSpace: 'nowrap',
                flex: '1 1 180px',
                height: '40px',
                padding: '0 16px',
                borderRadius: '10px',
                border: '1px solid #2563EB',
                background: '#2563EB',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Save &amp; sync to Billing
            </button>
          </div>

          <span style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.4' }}>
            Syncs to the Billing tariff master. Orders placed before the effective date keep their old price.
          </span>
        </div>
      </section>

      {/* Import Rate Card Modal */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17,24,39,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>Import Rate Card</h3>
              <button
                onClick={() => setShowImportModal(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '18px',
                  color: '#6B7280',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>
                Upload a CSV or Excel rate schedule containing Test Code, Base Price, TPA Panel Rate, and STAT Surcharge.
              </p>
              <div
                style={{
                  border: '2px dashed #D1D5DB',
                  borderRadius: '12px',
                  padding: '32px 16px',
                  textAlign: 'center',
                  background: '#F9FAFB',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  triggerToast('Rate card file validated (89 tests parsed)');
                  setShowImportModal(false);
                }}
              >
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📄</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Click to select rate card file</div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Supports .csv, .xlsx tariff templates</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setShowImportModal(false)}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  background: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabAdminPricingView;
