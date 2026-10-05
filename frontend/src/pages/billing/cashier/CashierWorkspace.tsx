import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Coins,
  CreditCard,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Printer,
  Clock,
  ArrowRight,
  User,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  ChevronRight,
  Sparkles,
  Lock,
  Unlock,
  Layers,
  ShoppingBag,
  ExternalLink,
  History
} from 'lucide-react';
import {
  billingService,
  CashierQueueItem,
  ShiftSummary,
  BillingInvoice,
  TariffItem,
  MultiTenderPaymentResponse
} from '../../../services/billingService';
import { MultiTenderPaymentModal } from './MultiTenderPaymentModal';
import { ReceiptThermalPreviewModal } from './ReceiptThermalPreviewModal';
import { CashierShiftModal } from './CashierShiftModal';
import { useCurrency } from '../../../config/currency';

export const CashierWorkspace: React.FC = () => {
  const { format: formatMoney } = useCurrency();

  // Navigation Subtabs
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'walkin' | 'shift_report'>('queue');

  // Core Data States
  const [shift, setShift] = useState<ShiftSummary | null>(null);
  const [queueItems, setQueueItems] = useState<CashierQueueItem[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [tariffs, setTariffs] = useState<TariffItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  // Active Modals State
  const [selectedQueueItem, setSelectedQueueItem] = useState<CashierQueueItem | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showShiftModal, setShowShiftModal] = useState<boolean>(false);
  const [receiptInvoiceId, setReceiptInvoiceId] = useState<string | null>(null);
  const [receiptToken, setReceiptToken] = useState<string | undefined>(undefined);

  // Walk-in Quick POS State
  const [walkinPatientName, setWalkinPatientName] = useState<string>('');
  const [walkinUhid, setWalkinUhid] = useState<string>('');
  const [walkinPhone, setWalkinPhone] = useState<string>('');
  const [walkinDepartment, setWalkinDepartment] = useState<string>('OPD');
  const [selectedTariffCode, setSelectedTariffCode] = useState<string>('');
  const [walkinQty, setWalkinQty] = useState<number>(1);
  const [walkinItems, setWalkinItems] = useState<Array<{ tariff: TariffItem; qty: number }>>([]);
  const [posSubmitting, setPosSubmitting] = useState<boolean>(false);

  // Load Shift Info
  const loadShift = useCallback(async () => {
    try {
      const shiftData = await billingService.getCurrentShift();
      setShift(shiftData);
    } catch (err) {
      console.warn('Could not fetch shift details', err);
    }
  }, []);

  // Load Queue & Invoices
  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const [queueRes, invRes, tariffRes] = await Promise.all([
        billingService.getCashierQueue().catch(() => []),
        billingService.getInvoices().catch(() => []),
        billingService.getTariffs({ is_active: true }).catch(() => [])
      ]);

      setQueueItems(queueRes);
      setInvoices(invRes);
      setTariffs(tariffRes);
    } catch (err) {
      console.error('Error loading billing counter data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadShift();
    loadData();

    const interval = setInterval(() => {
      loadData(true);
    }, 15000); // 15 sec auto polling for live counter tokens

    return () => clearInterval(interval);
  }, [loadShift, loadData]);

  // Handle Multi-Tender Payment Complete
  const handlePaymentSuccess = (response: MultiTenderPaymentResponse) => {
    setShowPaymentModal(false);
    setSelectedQueueItem(null);
    setReceiptInvoiceId(response.invoice.id);
    setReceiptToken(response.receipt_token);
    loadShift();
    loadData(true);
  };

  // Add Walk-in item
  const handleAddWalkinItem = () => {
    if (!selectedTariffCode) return;
    const tariff = tariffs.find((t) => t.code === selectedTariffCode);
    if (!tariff) return;

    setWalkinItems((prev) => {
      const existing = prev.find((item) => item.tariff.code === tariff.code);
      if (existing) {
        return prev.map((item) =>
          item.tariff.code === tariff.code ? { ...item, qty: item.qty + walkinQty } : item
        );
      }
      return [...prev, { tariff, qty: walkinQty }];
    });

    setSelectedTariffCode('');
    setWalkinQty(1);
  };

  const handleRemoveWalkinItem = (code: string) => {
    setWalkinItems((prev) => prev.filter((item) => item.tariff.code !== code));
  };

  // Submit Walk-in Bill
  const handleSubmitWalkinBill = async () => {
    if (walkinItems.length === 0) return;
    try {
      setPosSubmitting(true);
      const itemsPayload = walkinItems.map((item) => ({
        description: item.tariff.name,
        service_code: item.tariff.code,
        department: item.tariff.department,
        qty: item.qty,
        unitPrice: Number(item.tariff.base_price),
        discount_amount: 0,
        tax_rate: Number(item.tariff.gst_rate || 0),
        tax_amount: (Number(item.tariff.base_price) * item.qty * Number(item.tariff.gst_rate || 0)) / 100,
        total: Number(item.tariff.base_price) * item.qty * (1 + Number(item.tariff.gst_rate || 0) / 100)
      }));

      const gross = itemsPayload.reduce((acc, curr) => acc + curr.total, 0);

      const created = await billingService.createInvoice({
        patientName: walkinPatientName || 'Walk-in Counter Guest',
        uhid: walkinUhid || `WALK-${Math.floor(1000 + Math.random() * 9000)}`,
        phone: walkinPhone || '9999999999',
        category: walkinDepartment,
        items: itemsPayload,
        subtotal: gross,
        discount: 0,
        tax: 0,
        total: gross
      });

      // Reset form
      setWalkinItems([]);
      setWalkinPatientName('');
      setWalkinUhid('');
      setWalkinPhone('');

      // Open payment modal immediately
      setSelectedQueueItem({
        id: created.id,
        invoice_id: created.id,
        invoice_number: created.invNo || created.invoice_number || 'INV-TEMP',
        patient_id: created.patient || '',
        patient_name: created.patientName,
        uhid: created.uhid,
        phone: created.phone || '',
        department: created.category,
        encounter_type: 'OPD',
        category: created.category,
        status: created.status,
        created_at: created.date || new Date().toISOString(),
        items_count: itemsPayload.length,
        subtotal: Number(created.subtotal),
        total: Number(created.total),
        amount_paid: Number(created.paid || 0),
        balance_due: Number(created.balance || created.total),
        patient_deposits_available: 0,
        summary_services: itemsPayload.map((i) => i.description).join(', '),
        items: itemsPayload.map((item, idx) => ({
          id: `item-${idx}`,
          description: item.description,
          qty: item.qty,
          unit_price: item.unitPrice,
          discount_amount: 0,
          tax_amount: item.tax_amount,
          total: item.total,
          department: item.department
        }))
      });
      setShowPaymentModal(true);
      loadData(true);
    } catch (err) {
      console.error('Failed to create walk-in bill', err);
    } finally {
      setPosSubmitting(false);
    }
  };

  // Filtered Queue
  const filteredQueue = queueItems.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.uhid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.invoice_number.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = deptFilter === 'ALL' || item.department === deptFilter;

    return matchesSearch && matchesDept;
  });

  return (
    <div className="cashier-workspace" style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* TOP BAR & SHIFT STATUS */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
          backgroundColor: '#ffffff',
          padding: '1.25rem 1.5rem',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)'
            }}
          >
            <Receipt size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: '#0f172a' }}>
                Billing Counter & Cashier Desk
              </h1>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1'
                }}
              >
                POS STATION 01
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
              OPD Token Clearance, Multi-Tender POS, Walk-in Invoicing & Shift Reconciliation
            </p>
          </div>
        </div>

        {/* Shift Badge & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              backgroundColor: shift?.has_active_shift ? '#f0fdf4' : '#fff1f2',
              border: `1px solid ${shift?.has_active_shift ? '#bbf7d0' : '#fecdd3'}`
            }}
          >
            {shift?.has_active_shift ? (
              <ShieldCheck size={18} color="#16a34a" />
            ) : (
              <ShieldAlert size={18} color="#e11d48" />
            )}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: shift?.has_active_shift ? '#15803d' : '#be123c' }}>
                {shift?.has_active_shift ? 'SHIFT ACTIVE' : 'SHIFT INACTIVE'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                {shift?.has_active_shift
                  ? `${shift.counter_code} • Float: ${formatMoney(shift.opening_float)}`
                  : 'Open shift to process payments'}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowShiftModal(true)}
            className={`btn ${shift?.has_active_shift ? 'btn-outline' : 'btn-primary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
          >
            {shift?.has_active_shift ? <Lock size={15} /> : <Unlock size={15} />}
            <span>{shift?.has_active_shift ? 'Close Shift' : 'Open Shift'}</span>
          </button>

          <button
            onClick={() => loadData(true)}
            className="btn btn-outline"
            title="Refresh Queue"
            style={{ padding: '0.5rem', color: '#475569' }}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* QUICK STATS CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '1.25rem',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Waiting in Queue</span>
            <Clock size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0f172a', marginTop: '0.4rem' }}>
            {queueItems.length}
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.2rem' }}>
            Consultations, Diagnostics & Triage
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '1.25rem',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Shift Bills Settled</span>
            <FileText size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, color: '#0f172a', marginTop: '0.4rem' }}>
            {shift?.invoices_settled_count || 0}
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#16a34a', marginTop: '0.2rem' }}>
            Total Collections: {formatMoney(shift?.total_collected || 0)}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '1.25rem',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Cash Drawer Balance</span>
            <Coins size={18} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, color: '#15803d', marginTop: '0.4rem' }}>
            {formatMoney(shift?.expected_cash_in_drawer || shift?.opening_float || 0)}
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.2rem' }}>
            Opening Float ({formatMoney(shift?.opening_float || 0)}) + Cash In
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '1.25rem',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Digital Tenders</span>
            <QrCode size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, color: '#6d28d9', marginTop: '0.4rem' }}>
            {formatMoney(Number(shift?.card_collected || 0) + Number(shift?.upi_collected || 0))}
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '0.2rem' }}>
            UPI: {formatMoney(shift?.upi_collected || 0)} • Cards: {formatMoney(shift?.card_collected || 0)}
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '1.5rem'
        }}
      >
        <button
          onClick={() => setActiveTab('queue')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'queue' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'queue' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'queue' ? 700 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '-2px'
          }}
        >
          <Clock size={16} />
          <span>Billing Queue</span>
          <span
            style={{
              backgroundColor: activeTab === 'queue' ? '#dbeafe' : '#f1f5f9',
              color: activeTab === 'queue' ? '#1e40af' : '#475569',
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '10px'
            }}
          >
            {queueItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'history' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'history' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'history' ? 700 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '-2px'
          }}
        >
          <History size={16} />
          <span>Invoices & Settled Receipts</span>
        </button>

        <button
          onClick={() => setActiveTab('walkin')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'walkin' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'walkin' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'walkin' ? 700 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '-2px'
          }}
        >
          <ShoppingBag size={16} />
          <span>Walk-in Quick POS</span>
        </button>

        <button
          onClick={() => setActiveTab('shift_report')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'shift_report' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'shift_report' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'shift_report' ? 700 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '-2px'
          }}
        >
          <Receipt size={16} />
          <span>Shift Tender Reconciliation</span>
        </button>
      </div>

      {/* TAB 1: BILLING QUEUE */}
      {activeTab === 'queue' && (
        <div>
          {/* Queue Filters */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1', maxWidth: '400px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                />
                <input
                  type="text"
                  placeholder="Scan token slip, search UHID, patient or invoice #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '36px', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Filter size={16} color="#64748b" />
              <select
                className="form-control"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                style={{ fontSize: '0.8125rem', width: '180px' }}
              >
                <option value="ALL">All Departments</option>
                <option value="OPD">General OPD</option>
                <option value="CARDIOLOGY">Cardiology</option>
                <option value="EMERGENCY">Emergency Triage</option>
                <option value="LAB">Diagnostics & Pathology</option>
                <option value="RADIOLOGY">Radiology & Imaging</option>
                <option value="PHARMACY">Pharmacy</option>
              </select>
            </div>
          </div>

          {/* Queue List Table */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                <div className="spinner-border text-primary" role="status" />
                <p style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>Loading token queue...</p>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem'
                  }}
                >
                  <CheckCircle2 size={30} color="#10b981" />
                </div>
                <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>
                  Queue is Clear!
                </h4>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                  No pending consultation, diagnostic, or triage bills waiting for cashier settlement.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: 600 }}>Token / Invoice</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: 600 }}>Patient Details</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: 600 }}>Department</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontWeight: 600 }}>Services</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 600 }}>Total</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 600 }}>Balance Due</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'center', fontWeight: 600 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQueue.map((item) => (
                      <tr
                        key={item.id}
                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      >
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              marginBottom: '2px'
                            }}
                          >
                            {item.invoice_number}
                          </span>
                          <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.patient_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            UHID: <strong>{item.uhid}</strong>
                            {item.phone && ` • ${item.phone}`}
                          </div>
                        </td>

                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: '#f1f5f9',
                              color: '#334155'
                            }}
                          >
                            {item.department}
                          </span>
                        </td>

                        <td style={{ padding: '0.875rem 1rem', maxWidth: '240px' }}>
                          <div
                            style={{
                              fontSize: '0.8125rem',
                              color: '#334155',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={item.summary_services}
                          >
                            {item.summary_services || `${item.items_count} items`}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{item.items_count} billed items</div>
                        </td>

                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                          <div style={{ fontWeight: 600, color: '#334155' }}>{formatMoney(item.total)}</div>
                        </td>

                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '1rem' }}>
                            {formatMoney(item.balance_due)}
                          </div>
                          {item.patient_deposits_available > 0 && (
                            <span style={{ fontSize: '0.6875rem', color: '#16a34a' }}>
                              Deposit: {formatMoney(item.patient_deposits_available)}
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setSelectedQueueItem(item);
                              setShowPaymentModal(true);
                            }}
                            className="btn btn-primary btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.85rem',
                              fontWeight: 600,
                              borderRadius: '8px'
                            }}
                          >
                            <CreditCard size={14} />
                            <span>Collect</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INVOICES & SETTLED RECEIPTS */}
      {activeTab === 'history' && (
        <div>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                Shift & Day Invoices Register
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Showing last {invoices.length} invoices
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Invoice #</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Patient</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Paid</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{inv.invNo || inv.invoice_number}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div>{inv.patientName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>UHID: {inv.uhid}</div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>{inv.category}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>
                        {formatMoney(inv.total)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                        {formatMoney(inv.paid)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            backgroundColor: inv.status === 'PAID' ? '#dcfce7' : '#fef3c7',
                            color: inv.status === 'PAID' ? '#15803d' : '#b45309'
                          }}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setReceiptInvoiceId(inv.id);
                            setReceiptToken(inv.token_slip_number);
                          }}
                          className="btn btn-outline btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.65rem' }}
                        >
                          <Printer size={13} />
                          <span>Reprint</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WALKIN DIRECT POS */}
      {activeTab === 'walkin' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
          {/* Left: Service Selector & Walk-in Patient Info */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem'
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              Walk-in Patient Details
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Patient Name</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  className="form-control"
                  value={walkinPatientName}
                  onChange={(e) => setWalkinPatientName(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Phone Number</label>
                <input
                  type="text"
                  placeholder="10-digit mobile"
                  className="form-control"
                  value={walkinPhone}
                  onChange={(e) => setWalkinPhone(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>UHID (Optional)</label>
                <input
                  type="text"
                  placeholder="Existing UHID if any"
                  className="form-control"
                  value={walkinUhid}
                  onChange={(e) => setWalkinUhid(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Department</label>
                <select
                  className="form-control"
                  value={walkinDepartment}
                  onChange={(e) => setWalkinDepartment(e.target.value)}
                >
                  <option value="OPD">Outpatient (OPD)</option>
                  <option value="LAB">Diagnostics / Lab</option>
                  <option value="RADIOLOGY">Radiology</option>
                  <option value="EMERGENCY">Emergency Casualty</option>
                  <option value="PHARMACY">Direct Pharmacy</option>
                </select>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1.25rem 0' }} />

            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
              Add Services from Tariff Master
            </h4>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Service / Procedure / Consultation</label>
                <select
                  className="form-control"
                  value={selectedTariffCode}
                  onChange={(e) => setSelectedTariffCode(e.target.value)}
                >
                  <option value="">-- Choose from active tariffs --</option>
                  {tariffs.map((t) => (
                    <option key={t.code} value={t.code}>
                      [{t.code}] {t.name} — {formatMoney(t.base_price)} ({t.department})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ width: '80px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Qty</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={walkinQty}
                  onChange={(e) => setWalkinQty(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>

              <button
                type="button"
                onClick={handleAddWalkinItem}
                disabled={!selectedTariffCode}
                className="btn btn-secondary"
                style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Plus size={16} />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Right: Bill Cart & Instant Clearance */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              Walk-in Bill Cart ({walkinItems.length} items)
            </h3>

            <div style={{ flex: 1, minHeight: '200px', maxHeight: '350px', overflowY: 'auto' }}>
              {walkinItems.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  <ShoppingBag size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '0.8125rem' }}>No services added to walk-in cart yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {walkinItems.map((item) => (
                    <div
                      key={item.tariff.code}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{item.tariff.name}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                          {item.qty} × {formatMoney(item.tariff.base_price)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                          {formatMoney(Number(item.tariff.base_price) * item.qty)}
                        </span>
                        <button
                          onClick={() => handleRemoveWalkinItem(item.tariff.code)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Totals */}
            <div
              style={{
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid #e2e8f0'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: '#64748b' }}>Subtotal:</span>
                <strong>
                  {formatMoney(
                    walkinItems.reduce((acc, curr) => acc + Number(curr.tariff.base_price) * curr.qty, 0)
                  )}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1.125rem' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>Total Payable:</span>
                <span style={{ fontWeight: 800, color: '#2563eb' }}>
                  {formatMoney(
                    walkinItems.reduce((acc, curr) => acc + Number(curr.tariff.base_price) * curr.qty, 0)
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSubmitWalkinBill}
                disabled={walkinItems.length === 0 || posSubmitting}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <CreditCard size={18} />
                <span>{posSubmitting ? 'Creating Invoice...' : 'Generate Bill & Collect Payment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SHIFT RECONCILIATION */}
      {activeTab === 'shift_report' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '2rem',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  Cashier Shift Register & Audit Trail
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                  Real-time tender balances for Counter {shift?.counter_code || '01'}
                </p>
              </div>

              <button
                onClick={() => setShowShiftModal(true)}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
              >
                {shift?.has_active_shift ? <Lock size={15} /> : <Unlock size={15} />}
                <span>{shift?.has_active_shift ? 'Close & Reconcile' : 'Open Shift'}</span>
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Initial Opening Float</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {formatMoney(shift?.opening_float || 0)}
                </div>
              </div>

              <div style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.75rem', color: '#166534' }}>Physical Cash In Drawer</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#15803d', marginTop: '2px' }}>
                  {formatMoney(shift?.expected_cash_in_drawer || 0)}
                </div>
              </div>

              <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '0.75rem', color: '#1e40af' }}>Card Payments Handled</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>
                  {formatMoney(shift?.card_collected || 0)}
                </div>
              </div>

              <div style={{ backgroundColor: '#faf5ff', padding: '1rem', borderRadius: '10px', border: '1px solid #e9d5ff' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b21a8' }}>UPI / QR Codes Collected</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#7e22ce', marginTop: '2px' }}>
                  {formatMoney(shift?.upi_collected || 0)}
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f1f5f9',
                padding: '1.25rem',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>Total Invoices Cleared</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>During active cashier shift session</div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                {shift?.invoices_settled_count || 0} bills
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: MULTI-TENDER PAYMENT */}
      {showPaymentModal && selectedQueueItem && (
        <MultiTenderPaymentModal
          queueItem={selectedQueueItem}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedQueueItem(null);
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* MODAL 2: THERMAL RECEIPT PREVIEW */}
      {receiptInvoiceId && (
        <ReceiptThermalPreviewModal
          invoiceId={receiptInvoiceId}
          receiptToken={receiptToken}
          onClose={() => {
            setReceiptInvoiceId(null);
            setReceiptToken(undefined);
          }}
        />
      )}

      {/* MODAL 3: SHIFT OPEN / CLOSE */}
      {showShiftModal && (
        <CashierShiftModal
          currentShift={shift}
          onClose={() => setShowShiftModal(false)}
          onShiftUpdated={loadShift}
        />
      )}
    </div>
  );
};
