import React, { useState } from 'react';

interface AnalyzerItem {
  id: string;
  name: string;
  serial: string;
  section: string;
  status: 'Running' | 'Offline' | 'Maintenance' | 'Ready';
  lastPm: string;
  nextPm: string;
  nextPmWarning?: boolean;
  serviceContract: string;
  contractWarning?: boolean;
  contractError?: boolean;
}

interface StockItem {
  id: string;
  name: string;
  category: 'Reagent' | 'Consumable' | 'Calibrator';
  inStock: string;
  reorderAt: string;
  expiry: string;
  expiryWarning?: boolean;
  status: 'Below reorder' | 'Expiring soon' | 'In stock';
}

interface PurchaseRequest {
  id: string;
  item: string;
  code: string;
  status: 'Awaiting Finance' | 'Delivered' | 'Approved · in transit';
  dateText: string;
  statusType: 'amber' | 'green' | 'blue';
}

interface LabAdminEquipmentViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const LabAdminEquipmentView: React.FC<LabAdminEquipmentViewProps> = () => {
  const [analyzers, setAnalyzers] = useState<AnalyzerItem[]>([
    {
      id: 'eq-1',
      name: 'Sysmex XN-1000',
      serial: 'SX-XN1-1188',
      section: 'Hematology',
      status: 'Running',
      lastPm: '12 Aug',
      nextPm: '12 Nov',
      serviceContract: 'Sysmex India · AMC to Mar 2027',
    },
    {
      id: 'eq-2',
      name: 'Beckman AU680',
      serial: 'BC-AU6-3021',
      section: 'Chemistry',
      status: 'Running',
      lastPm: '02 Sep',
      nextPm: '02 Dec',
      serviceContract: 'Beckman Coulter · AMC to Jun 2027',
    },
    {
      id: 'eq-3',
      name: 'Bio-Rad D-10',
      serial: 'BR-D10-0417',
      section: 'HbA1c',
      status: 'Offline',
      lastPm: '20 Jun',
      nextPm: '20 Dec',
      serviceContract: 'Bio-Rad · SR-3391 open',
      contractError: true,
    },
    {
      id: 'eq-4',
      name: 'Radiometer ABL800',
      serial: 'RM-ABL-2210',
      section: 'Blood gas',
      status: 'Maintenance',
      lastPm: 'Today',
      nextPm: '30 Dec',
      serviceContract: 'Radiometer · CMC',
    },
    {
      id: 'eq-5',
      name: 'Roche Cobas e411',
      serial: 'RC-E41-7730',
      section: 'Immunoassay',
      status: 'Ready',
      lastPm: '18 Jul',
      nextPm: '18 Oct',
      nextPmWarning: true,
      serviceContract: 'Roche · AMC renewal due',
      contractWarning: true,
    },
    {
      id: 'eq-6',
      name: 'Sysmex CA-600',
      serial: 'SX-CA6-0932',
      section: 'Coagulation',
      status: 'Running',
      lastPm: '05 Sep',
      nextPm: '05 Dec',
      serviceContract: 'Sysmex India · AMC',
    },
    {
      id: 'eq-7',
      name: 'Erba Chem-7',
      serial: 'ER-CH7-0552',
      section: 'Chemistry backup',
      status: 'Running',
      lastPm: '10 Mar',
      nextPm: '10 Oct',
      nextPmWarning: true,
      serviceContract: 'Transasia · warranty',
    },
  ]);

  const [stockItems, setStockItems] = useState<StockItem[]>([
    {
      id: 'stk-1',
      name: 'Erba Chem-7 reagent pack',
      category: 'Reagent',
      inStock: '16%',
      reorderAt: '20%',
      expiry: '14 Nov',
      status: 'Below reorder',
    },
    {
      id: 'stk-2',
      name: 'Troponin I reagent kit',
      category: 'Reagent',
      inStock: '11 tests',
      reorderAt: '50 tests',
      expiry: '02 Dec',
      status: 'Below reorder',
    },
    {
      id: 'stk-3',
      name: 'SST gold-top tubes',
      category: 'Consumable',
      inStock: '140',
      reorderAt: '200',
      expiry: '—',
      status: 'Below reorder',
    },
    {
      id: 'stk-4',
      name: 'CBC diluent (Cellpack)',
      category: 'Reagent',
      inStock: '6 L',
      reorderAt: '4 L',
      expiry: '20 Oct',
      expiryWarning: true,
      status: 'Expiring soon',
    },
    {
      id: 'stk-5',
      name: 'EDTA lavender tubes',
      category: 'Consumable',
      inStock: '1,850',
      reorderAt: '500',
      expiry: '—',
      status: 'In stock',
    },
    {
      id: 'stk-6',
      name: 'HbA1c calibrator set',
      category: 'Calibrator',
      inStock: '2 sets',
      reorderAt: '1 set',
      expiry: '08 Oct',
      expiryWarning: true,
      status: 'Expiring soon',
    },
  ]);

  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([
    {
      id: 'pr-1',
      item: 'Troponin I kit × 4',
      code: 'PR-2609-014',
      status: 'Awaiting Finance',
      dateText: '',
      statusType: 'amber',
    },
    {
      id: 'pr-2',
      item: 'EDTA tubes × 5,000',
      code: 'PR-2609-011',
      status: 'Delivered',
      dateText: 'Delivered 24 Sep',
      statusType: 'green',
    },
    {
      id: 'pr-3',
      item: 'Sysmex Cellpack × 10',
      code: 'PR-2609-009',
      status: 'Approved · in transit',
      dateText: '',
      statusType: 'blue',
    },
  ]);

  // Filters & Search
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'reorder' | 'expiring' | 'reagents' | 'consumables'>('all');

  // Modals
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [showPurchaseRequestModal, setShowPurchaseRequestModal] = useState(false);
  const [showActionMenuId, setShowActionMenuId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Equipment Form State
  const [newEqName, setNewEqName] = useState('');
  const [newEqSerial, setNewEqSerial] = useState('');
  const [newEqSection, setNewEqSection] = useState('Hematology');
  const [newEqContract, setNewEqContract] = useState('');

  // New Purchase Request Form State
  const [newPrItem, setNewPrItem] = useState('');
  const [newPrQty, setNewPrQty] = useState('');
  const [newPrEstCost, setNewPrEstCost] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEqName || !newEqSerial) return;
    const newAnalyzer: AnalyzerItem = {
      id: `eq-${Date.now()}`,
      name: newEqName,
      serial: newEqSerial,
      section: newEqSection,
      status: 'Ready',
      lastPm: 'Today',
      nextPm: '30 Dec',
      serviceContract: newEqContract || 'Warranty · 1 Year',
    };
    setAnalyzers((prev) => [newAnalyzer, ...prev]);
    setShowAddEquipmentModal(false);
    setNewEqName('');
    setNewEqSerial('');
    setNewEqContract('');
    triggerToast(`Analyzer ${newAnalyzer.name} added to equipment register`);
  };

  const handleCreatePurchaseRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrItem) return;
    const reqCode = `PR-2609-0${Math.floor(Math.random() * 80 + 20)}`;
    const cost = parseFloat(newPrEstCost.replace(/[^0-9.]/g, '')) || 0;
    const newPr: PurchaseRequest = {
      id: `pr-${Date.now()}`,
      item: `${newPrItem} × ${newPrQty || '1'}`,
      code: reqCode,
      status: cost > 50000 ? 'Awaiting Finance' : 'Approved · in transit',
      dateText: '',
      statusType: cost > 50000 ? 'amber' : 'blue',
    };
    setPurchaseRequests((prev) => [newPr, ...prev]);
    setShowPurchaseRequestModal(false);
    setNewPrItem('');
    setNewPrQty('');
    setNewPrEstCost('');
    triggerToast(`Purchase request ${reqCode} created successfully`);
  };

  const handleRaisePo = (item: StockItem) => {
    const reqCode = `PR-2609-0${Math.floor(Math.random() * 80 + 20)}`;
    const newPr: PurchaseRequest = {
      id: `pr-${Date.now()}`,
      item: `${item.name} × Reorder Pack`,
      code: reqCode,
      status: 'Awaiting Finance',
      dateText: '',
      statusType: 'amber',
    };
    setPurchaseRequests((prev) => [newPr, ...prev]);
    triggerToast(`Purchase Order raised for ${item.name} (${reqCode})`);
  };

  // Filtered analyzers
  const filteredAnalyzers = analyzers.filter(
    (a) =>
      a.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
      a.serial.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
      a.section.toLowerCase().includes(equipmentSearch.toLowerCase())
  );

  // Filtered stock items
  const filteredStock = stockItems.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
      s.category.toLowerCase().includes(stockSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (stockFilter === 'reorder') return s.status === 'Below reorder';
    if (stockFilter === 'expiring') return s.status === 'Expiring soon';
    if (stockFilter === 'reagents') return s.category === 'Reagent';
    if (stockFilter === 'consumables') return s.category === 'Consumable';
    return true;
  });

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
            Equipment &amp; Inventory
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
            Analyzer servicing, AMCs and lab stock. Technicians see live status; you own maintenance and purchasing.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowAddEquipmentModal(true)}
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
            Add equipment
          </button>
          <button
            onClick={() => setShowPurchaseRequestModal(true)}
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
            New purchase request
          </button>
        </div>
      </header>

      {/* 4 KPI Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
        {/* Card 1 */}
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
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Analyzers online</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>5 / 7</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>1 offline · 1 in maintenance</span>
          </div>
        </div>

        {/* Card 2 */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #FECACA',
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
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Open service tickets</span>
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
              Escalate
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#B91C1C' }}>2</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>SR-3391 · SR-3388</span>
          </div>
        </div>

        {/* Card 3 */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #FDE68A',
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
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Items below reorder</span>
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
              Order
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#B45309' }}>3</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>2 critical</span>
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
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Expiring in 30 days</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>4</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>lots · Rs. 38,400 value</span>
          </div>
        </div>
      </section>

      {/* Equipment Register Section */}
      <section
        style={{
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
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>Equipment register</h2>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Preventive maintenance and AMC status</span>
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
                placeholder="Analyzer or serial"
                value={equipmentSearch}
                onChange={(e) => setEquipmentSearch(e.target.value)}
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
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '900px' }}>
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,0.9fr) 108px 80px 80px minmax(0,1.3fr) 44px',
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
              <span>ANALYZER · SERIAL</span>
              <span>SECTION</span>
              <span>STATUS</span>
              <span style={{ textAlign: 'right' }}>LAST PM</span>
              <span>NEXT PM</span>
              <span>SERVICE CONTRACT</span>
              <span style={{ textAlign: 'right' }}></span>
            </div>

            {/* Table Rows */}
            {filteredAnalyzers.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,0.9fr) 108px 80px 80px minmax(0,1.3fr) 44px',
                  gap: '12px',
                  alignItems: 'center',
                  minHeight: '64px',
                  padding: '8px 20px',
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{item.name}</span>
                  <span style={{ fontSize: '12px', color: '#6B7280', fontFamily: "'JetBrains Mono', monospace" }}>
                    {item.serial}
                  </span>
                </div>

                <span style={{ fontSize: '14px', color: '#374151' }}>{item.section}</span>

                {/* Status Badge */}
                <span>
                  {item.status === 'Running' && (
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
                      Running
                    </span>
                  )}
                  {item.status === 'Offline' && (
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
                      Offline
                    </span>
                  )}
                  {item.status === 'Maintenance' && (
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
                      Maintenance
                    </span>
                  )}
                  {item.status === 'Ready' && (
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        background: '#EFF6FF',
                        color: '#1D4ED8',
                      }}
                    >
                      Ready
                    </span>
                  )}
                </span>

                <span style={{ fontSize: '14px', color: '#374151', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {item.lastPm}
                </span>

                <span
                  style={{
                    fontSize: '14px',
                    color: item.nextPmWarning ? '#B45309' : '#374151',
                    fontWeight: item.nextPmWarning ? 600 : 400,
                  }}
                >
                  {item.nextPm}
                </span>

                <span
                  style={{
                    fontSize: '13px',
                    color: item.contractError ? '#B91C1C' : item.contractWarning ? '#B45309' : '#6B7280',
                    fontWeight: item.contractError || item.contractWarning ? 500 : 400,
                  }}
                >
                  {item.serviceContract}
                </span>

                {/* Actions button */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' }}>
                  <button
                    onClick={() => setShowActionMenuId(showActionMenuId === item.id ? null : item.id)}
                    style={{
                      flexShrink: 0,
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      border: '1px solid #E5E7EB',
                      background: '#FFFFFF',
                      color: '#6B7280',
                      fontSize: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ⋯
                  </button>

                  {/* Dropdown Menu */}
                  {showActionMenuId === item.id && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '42px',
                        background: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '10px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                        width: '180px',
                        zIndex: 20,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <button
                        onClick={() => {
                          triggerToast(`Preventive Maintenance logged for ${item.name}`);
                          setShowActionMenuId(null);
                        }}
                        style={{
                          padding: '10px 14px',
                          border: 'none',
                          background: 'transparent',
                          fontSize: '13px',
                          color: '#374151',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        Log PM record
                      </button>
                      <button
                        onClick={() => {
                          triggerToast(`Calibration scheduled for ${item.name}`);
                          setShowActionMenuId(null);
                        }}
                        style={{
                          padding: '10px 14px',
                          border: 'none',
                          background: 'transparent',
                          fontSize: '13px',
                          color: '#374151',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        Schedule calibration
                      </button>
                      <button
                        onClick={() => {
                          triggerToast(`Service ticket opened for ${item.name}`);
                          setShowActionMenuId(null);
                        }}
                        style={{
                          padding: '10px 14px',
                          border: 'none',
                          background: 'transparent',
                          fontSize: '13px',
                          color: '#B91C1C',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        Raise service ticket
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: '4px' }} />
      </section>

      {/* Lower Section: Stock & Purchase Requests */}
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
        {/* Left Column: Stock */}
        <div
          style={{
            flex: '999 1 620px',
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
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>Stock</h2>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>Reagents, calibrators and consumables</span>
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
                  placeholder="Item or lot"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
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
                onClick={() => setStockFilter('all')}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  borderRadius: '999px',
                  background: stockFilter === 'all' ? '#2563EB' : '#FFFFFF',
                  color: stockFilter === 'all' ? '#FFFFFF' : '#374151',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: stockFilter === 'all' ? '#2563EB' : '#E5E7EB',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                All · 64
              </button>
              <button
                onClick={() => setStockFilter('reorder')}
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
                  background: stockFilter === 'reorder' ? '#FEE2E2' : '#FEF2F2',
                  color: '#B91C1C',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Below reorder · 3
              </button>
              <button
                onClick={() => setStockFilter('expiring')}
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
                  background: stockFilter === 'expiring' ? '#FEF3C7' : '#FFFBEB',
                  color: '#B45309',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Expiring · 4
              </button>
              <button
                onClick={() => setStockFilter('reagents')}
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
                  borderColor: stockFilter === 'reagents' ? '#2563EB' : '#E5E7EB',
                  background: stockFilter === 'reagents' ? '#EFF6FF' : '#FFFFFF',
                  color: stockFilter === 'reagents' ? '#1D4ED8' : '#374151',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                Reagents · 28
              </button>
              <button
                onClick={() => setStockFilter('consumables')}
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
                  borderColor: stockFilter === 'consumables' ? '#2563EB' : '#E5E7EB',
                  background: stockFilter === 'consumables' ? '#EFF6FF' : '#FFFFFF',
                  color: stockFilter === 'consumables' ? '#1D4ED8' : '#374151',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                Consumables · 36
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '700px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1.4fr) 80px 80px 76px 124px 96px',
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
                <span>ITEM · CATEGORY</span>
                <span style={{ textAlign: 'right' }}>IN STOCK</span>
                <span style={{ textAlign: 'right' }}>REORDER AT</span>
                <span style={{ textAlign: 'right' }}>EXPIRY</span>
                <span>STATUS</span>
                <span style={{ textAlign: 'right' }}></span>
              </div>

              {filteredStock.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,1.4fr) 80px 80px 76px 124px 96px',
                    gap: '12px',
                    alignItems: 'center',
                    minHeight: '60px',
                    padding: '8px 20px',
                    borderBottom: '1px solid #F3F4F6',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{s.name}</span>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>{s.category}</span>
                  </div>

                  <span style={{ fontSize: '14px', color: '#111827', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {s.inStock}
                  </span>

                  <span style={{ fontSize: '14px', color: '#6B7280', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {s.reorderAt}
                  </span>

                  <span
                    style={{
                      fontSize: '14px',
                      color: s.expiryWarning ? '#B45309' : '#374151',
                      textAlign: 'right',
                    }}
                  >
                    {s.expiry}
                  </span>

                  {/* Status Badge */}
                  <span>
                    {s.status === 'Below reorder' && (
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
                        Below reorder
                      </span>
                    )}
                    {s.status === 'Expiring soon' && (
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
                        Expiring soon
                      </span>
                    )}
                    {s.status === 'In stock' && (
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
                        In stock
                      </span>
                    )}
                  </span>

                  {/* Action */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {s.status === 'Below reorder' ? (
                      <button
                        onClick={() => handleRaisePo(s)}
                        style={{
                          whiteSpace: 'nowrap',
                          height: '32px',
                          padding: '0 10px',
                          borderRadius: '8px',
                          border: '1px solid #2563EB',
                          background: '#2563EB',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          cursor: 'pointer',
                        }}
                      >
                        Raise PO
                      </button>
                    ) : (
                      <button
                        onClick={() => triggerToast(`Viewing lot details for ${s.name}`)}
                        style={{
                          whiteSpace: 'nowrap',
                          height: '32px',
                          padding: '0 10px',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB',
                          background: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#111827',
                          cursor: 'pointer',
                        }}
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: '4px' }} />
        </div>

        {/* Right Column: Purchase Requests */}
        <div
          style={{
            flex: '1 1 340px',
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
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>Purchase requests</h3>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>This month</span>
            </div>
          </div>

          {purchaseRequests.map((pr) => (
            <div
              key={pr.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                minHeight: '52px',
                borderBottom: '1px solid #F3F4F6',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{pr.item}</span>
                <span style={{ fontSize: '12px', color: '#6B7280', fontFamily: "'JetBrains Mono', monospace" }}>{pr.code}</span>
              </div>
              <span
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background:
                    pr.statusType === 'amber' ? '#FFFBEB' : pr.statusType === 'green' ? '#F0FDF4' : '#EFF6FF',
                  color:
                    pr.statusType === 'amber' ? '#B45309' : pr.statusType === 'green' ? '#15803D' : '#1D4ED8',
                }}
              >
                {pr.dateText || pr.status}
              </span>
            </div>
          ))}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: '#F3F4F6',
              fontSize: '13px',
              marginTop: '8px',
            }}
          >
            <span style={{ color: '#374151', lineHeight: '1.4' }}>
              Purchases above Rs. 50,000 go to the Finance Manager for approval
            </span>
          </div>
        </div>
      </section>

      {/* Add Equipment Modal */}
      {showAddEquipmentModal && (
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
              maxWidth: '480px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>Add New Equipment</h3>
              <button
                onClick={() => setShowAddEquipmentModal(false)}
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

            <form onSubmit={handleAddEquipment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Analyzer Name / Model</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sysmex CS-2500"
                  value={newEqName}
                  onChange={(e) => setNewEqName(e.target.value)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Serial Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SX-CS2-9901"
                  value={newEqSerial}
                  onChange={(e) => setNewEqSerial(e.target.value)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Lab Section</label>
                <select
                  value={newEqSection}
                  onChange={(e) => setNewEqSection(e.target.value)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    outline: 'none',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="Hematology">Hematology</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Immunoassay">Immunoassay</option>
                  <option value="Blood gas">Blood gas</option>
                  <option value="HbA1c">HbA1c</option>
                  <option value="Coagulation">Coagulation</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Service Contract / AMC</label>
                <input
                  type="text"
                  placeholder="e.g. Sysmex India · AMC to 2028"
                  value={newEqContract}
                  onChange={(e) => setNewEqContract(e.target.value)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddEquipmentModal(false)}
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
                <button
                  type="submit"
                  style={{
                    height: '40px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: '1px solid #2563EB',
                    background: '#2563EB',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  Save Analyzer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Purchase Request Modal */}
      {showPurchaseRequestModal && (
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
              maxWidth: '480px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>Create Purchase Request</h3>
              <button
                onClick={() => setShowPurchaseRequestModal(false)}
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

            <form onSubmit={handleCreatePurchaseRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Item Name / Specification</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Troponin I High Sensitivity Reagent Kit"
                  value={newPrItem}
                  onChange={(e) => setNewPrItem(e.target.value)}
                  style={{
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Quantity</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5 kits"
                    value={newPrQty}
                    onChange={(e) => setNewPrQty(e.target.value)}
                    style={{
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Estimated Cost (INR)</label>
                  <input
                    type="text"
                    placeholder="e.g. Rs. 45,000"
                    value={newPrEstCost}
                    onChange={(e) => setNewPrEstCost(e.target.value)}
                    style={{
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#6B7280', background: '#F9FAFB', padding: '10px', borderRadius: '8px' }}>
                ℹ Purchases exceeding Rs. 50,000 will be routed automatically to the Finance Department for authorization before vendor issuance.
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowPurchaseRequestModal(false)}
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
                <button
                  type="submit"
                  style={{
                    height: '40px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: '1px solid #2563EB',
                    background: '#2563EB',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabAdminEquipmentView;
