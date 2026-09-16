import React, { useState } from 'react';
import {
  Receipt,
  DollarSign,
  CreditCard,
  Printer,
  CheckCircle,
  Plus,
  Search,
  CheckCircle2,
  FileText,
  AlertCircle,
  Clock,
  Building2,
  ShieldCheck,
  TrendingUp,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { PaymentMethod, InvoiceStatus } from '../../types';
import { patientJourneyService } from '../../services/patientJourneyService';

interface DetailedInvoice {
  id: string;
  invNo: string;
  patientName: string;
  uhid: string;
  phone: string;
  category: 'OPD' | 'IPD' | 'OT' | 'LAB' | 'PACKAGE';
  date: string;
  subtotal: number;
  discount: number;
  tax: number;
  advanceDeducted: number;
  total: number;
  paid: number;
  balance: number;
  status: 'PAID' | 'UNPAID' | 'PARTIALLY_PAID' | 'INSURANCE_PENDING';
  items: {
    source: 'Consultation' | 'Laboratory' | 'OT' | 'Bed Charge' | 'Pharmacy' | 'Misc';
    description: string;
    qty: number;
    unitPrice: number;
    total: number;
  }[];
}

export const BillingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'advance' | 'insurance' | 'settlement'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showNewInvModal, setShowNewInvModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<DetailedInvoice | null>(null);

  // Settlement Form Controls
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [referenceId, setReferenceId] = useState<string>('UPI/20260916/SETTLED');

  // Invoices synchronized with patientJourneyService
  const [invoices, setInvoices] = useState<DetailedInvoice[]>(() => patientJourneyService.getInvoices() as any);

  const openPaymentModal = (inv: DetailedInvoice) => {
    setActiveInvoice(inv);
    setCollectAmount(inv.balance);
    setPaymentMode('UPI');
    setReferenceId(`TXN-${Date.now().toString().slice(-6)}`);
    setShowPaymentModal(true);
  };

  // Payment settle action with exact partial / full payment computation
  const handleConfirmSettlement = (amount: number, method: string, ref: string) => {
    if (!activeInvoice) return;
    const paidIncrement = Number(amount) || 0;
    const newPaid = Number((activeInvoice.paid + paidIncrement).toFixed(2));
    const newBal = Math.max(0, Number((activeInvoice.total - newPaid).toFixed(2)));
    const newStatus = newBal === 0 ? 'PAID' : (newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');

    patientJourneyService.updateInvoice(activeInvoice.id, {
      paid: newPaid,
      balance: newBal,
      status: newStatus as any,
    });
    setInvoices(patientJourneyService.getInvoices() as any);
    setActiveInvoice((prev) => (prev ? { ...prev, paid: newPaid, balance: newBal, status: newStatus as any } : null));
    setShowPaymentModal(false);
    setShowReceiptModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="badge badge-success">✓ Fully Paid</span>;
      case 'UNPAID':
        return <span className="badge badge-danger">Unpaid Balance</span>;
      case 'PARTIALLY_PAID':
        return <span className="badge badge-warning">Partial Paid</span>;
      case 'INSURANCE_PENDING':
        return <span className="badge badge-secondary" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>TPA Pre-Auth</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.uhid.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'ALL' || inv.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate day metrics
  const totalBilled = invoices.reduce((acc, i) => acc + i.total, 0);
  const totalCollected = invoices.reduce((acc, i) => acc + i.paid, 0);
  const totalOutstanding = invoices.reduce((acc, i) => acc + i.balance, 0);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="page-title">Billing & Accounts Department</h2>
              <p className="page-subtitle">
                Multi-source charge aggregator (Consultation + Lab + OT + Beds + Pharmacy) & settlements
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setActiveTab('settlement')}>
            <TrendingUp size={16} /> Day-End Shift Settlement
          </button>
          <button className="btn btn-primary" onClick={() => setShowNewInvModal(true)}>
            <Plus size={18} /> Generate Consolidated Invoice
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* KPI Strip */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
              <Receipt size={24} />
            </div>
            <div>
              <div className="stat-value">${totalBilled.toFixed(2)}</div>
              <div className="stat-label">Total Invoiced Today</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <div className="stat-value">${totalCollected.toFixed(2)}</div>
              <div className="stat-label">Cash & Digital Receipts</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
              <AlertCircle size={24} />
            </div>
            <div>
              <div className="stat-value">${totalOutstanding.toFixed(2)}</div>
              <div className="stat-label">Outstanding Receivables</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--warning-light)', color: '#d97706' }}>
              <Building2 size={24} />
            </div>
            <div>
              <div className="stat-value">$800.00</div>
              <div className="stat-label">Inpatient Advance Deposits</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="tab-bar" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <button
            className={`tab-item ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            <Receipt size={18} /> Patient Invoices & Charges
          </button>
          <button
            className={`tab-item ${activeTab === 'advance' ? 'active' : ''}`}
            onClick={() => setActiveTab('advance')}
          >
            <DollarSign size={18} /> Advance Deposits & Ledger
          </button>
          <button
            className={`tab-item ${activeTab === 'insurance' ? 'active' : ''}`}
            onClick={() => setActiveTab('insurance')}
          >
            <ShieldCheck size={18} /> Insurance & TPA Pre-Auth Desk
          </button>
          <button
            className={`tab-item ${activeTab === 'settlement' ? 'active' : ''}`}
            onClick={() => setActiveTab('settlement')}
          >
            <TrendingUp size={18} /> Cashier Day-End Handover
          </button>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="search-input-box" style={{ minWidth: '320px' }}>
            <Search size={18} color="var(--text-light)" />
            <input
              type="text"
              placeholder="Search invoice number, patient, UHID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status:</span>
            {['ALL', 'UNPAID', 'PAID', 'INSURANCE_PENDING'].map((s) => (
              <button
                key={s}
                className={`subtab-pill ${selectedStatus === s ? 'active' : ''}`}
                onClick={() => setSelectedStatus(s)}
              >
                {s === 'ALL' ? 'All Invoices' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: Invoices & Charge Aggregator */}
        {activeTab === 'invoices' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  Consolidated Patient Billing Register
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Unified charge capture spanning Consultation, Lab, OT, Inpatient beds & Pharmacy
                </p>
              </div>
              <span className="badge badge-info">{filteredInvoices.length} Invoices Found</span>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Patient Name & UHID</th>
                    <th>Episode Category</th>
                    <th>Subtotal</th>
                    <th>Advance Applied</th>
                    <th>Net Amount</th>
                    <th>Balance Due</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td><code>{inv.invNo}</code></td>

                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{inv.patientName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {inv.uhid} • {inv.phone}
                        </div>
                      </td>

                      <td>
                        <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>
                          {inv.category} Billing
                        </span>
                      </td>

                      <td>${inv.subtotal.toFixed(2)}</td>

                      <td>
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                          -${inv.advanceDeducted.toFixed(2)}
                        </span>
                      </td>

                      <td><strong>${inv.total.toFixed(2)}</strong></td>

                      <td>
                        <strong style={{ color: inv.balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          ${inv.balance.toFixed(2)}
                        </strong>
                      </td>

                      <td>{getStatusBadge(inv.status)}</td>

                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setActiveInvoice(inv);
                              setShowReceiptModal(true);
                            }}
                            title="View / Print Tax Invoice"
                          >
                            <Printer size={14} /> Bill
                          </button>

                          {inv.balance > 0 && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => openPaymentModal(inv)}
                            >
                              <CreditCard size={14} /> Settle
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Advance Deposits & Ledger */}
        {activeTab === 'advance' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  Inpatient Advance Deposits Ledger
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Mandatory admission security deposits automatically offset upon final discharge billing
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => alert('Record Advance Deposit modal')}>
                <Plus size={14} /> Collect Advance Deposit
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Deposit Receipt</th>
                    <th>Patient & UHID</th>
                    <th>Admitted Ward</th>
                    <th>Deposit Amount</th>
                    <th>Mode of Payment</th>
                    <th>Settlement Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>DEP-202609-01</code></td>
                    <td><strong>Robert Fox (UHID-202609-00001)</strong></td>
                    <td>Male Surgical Ward (Bed B-04)</td>
                    <td><strong>$500.00</strong></td>
                    <td>UPI Transfer</td>
                    <td><span className="badge badge-info">Deducted on Final Bill</span></td>
                  </tr>
                  <tr>
                    <td><code>DEP-202609-02</code></td>
                    <td><strong>Eleanor Vance (UHID-202609-00002)</strong></td>
                    <td>Intensive Care Unit (ICU-02)</td>
                    <td><strong>$1,000.00</strong></td>
                    <td>Credit Card POS</td>
                    <td><span className="badge badge-success">Active Holding</span></td>
                  </tr>
                  <tr>
                    <td><code>DEP-202609-03</code></td>
                    <td><strong>Marcus Brody (UHID-202609-00003)</strong></td>
                    <td>Medical Ward A (Bed B-01)</td>
                    <td><strong>$300.00</strong></td>
                    <td>Cash Desk</td>
                    <td><span className="badge badge-info">Deducted on Final Bill</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Insurance & TPA Pre-Auth Desk */}
        {activeTab === 'insurance' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  Insurance & Third Party Administrator (TPA) Desk
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Pre-authorization submissions, cashless claim guarantees & co-payment calculations
                </p>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Claim Number</th>
                    <th>Patient Name</th>
                    <th>TPA / Insurance Company</th>
                    <th>Policy Number</th>
                    <th>Authorized Sum</th>
                    <th>Patient Co-Pay</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>CLM-2026-8819</code></td>
                    <td><strong>Marcus Brody</strong></td>
                    <td>United HealthCare TPA</td>
                    <td>UHM-782190</td>
                    <td>$1,500.00</td>
                    <td>10% ($150.00)</td>
                    <td><span className="badge badge-success">Pre-Auth Approved</span></td>
                  </tr>
                  <tr>
                    <td><code>CLM-2026-8820</code></td>
                    <td><strong>Eleanor Vance</strong></td>
                    <td>Aetna Senior Health</td>
                    <td>AET-449102</td>
                    <td>$3,200.00</td>
                    <td>Nil (Full Cashless)</td>
                    <td><span className="badge badge-warning">Under Review</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Cashier Day-End Handover */}
        {activeTab === 'settlement' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  Cashier Daily Shift Handover & Reconciliation
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Active Shift: Morning Shift (08:00 AM - 04:00 PM) • Cashier: Harsh Director
                </p>
              </div>
              <span className="badge badge-success">Drawer Balanced</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
              <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PHYSICAL CASH IN DRAWER</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)', marginTop: '0.25rem' }}>$480.00</div>
              </div>

              <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CARD POS TERMINAL</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)', marginTop: '0.25rem' }}>$1,000.00</div>
              </div>

              <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>UPI / DIGITAL QR</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)', marginTop: '0.25rem' }}>$655.00</div>
              </div>

              <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL REVENUE COLLECTED</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>$2,135.00</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => window.print()}>
                <Printer size={16} /> Print Shift Handover Summary
              </button>
              <button
                className="btn btn-primary"
                onClick={() => alert('Shift locked and closed. Safe drops verified.')}
              >
                <ShieldCheck size={16} /> Close Shift & Lock Drawer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Settle Payment */}
      {showPaymentModal && activeInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Collect Payment</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {activeInvoice.invNo} • {activeInvoice.patientName}
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPaymentModal(false)}>✕</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmSettlement(collectAmount, paymentMode, referenceId);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div style={{ padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Outstanding Balance Due</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary-hover)' }}>
                    ${activeInvoice.balance.toFixed(2)}
                  </div>
                </div>
                {activeInvoice.advanceDeducted > 0 && (
                  <span className="badge badge-success">
                    Advance Deducted: ${activeInvoice.advanceDeducted.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Payment Mode *</label>
                <select
                  className="form-select"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="CASH">Cash Drawer</option>
                  <option value="UPI">UPI / Digital QR</option>
                  <option value="CARD">Credit / Debit Card POS</option>
                  <option value="BANK_TRANSFER">Bank Wire / Corporate TPA</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount Collecting ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={activeInvoice.balance}
                  className="form-input"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(parseFloat(e.target.value) || 0)}
                  required
                />
                {collectAmount < activeInvoice.balance && collectAmount > 0 && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      color: '#b45309',
                      fontWeight: 600,
                    }}
                  >
                    ⚠️ Partial Payment: ${(activeInvoice.balance - collectAmount).toFixed(2)} will remain due. Status will become <strong>Partial Paid</strong>.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">POS Reference / Transaction ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={16} /> Confirm Settlement & Issue Receipt
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL: Printable Official Tax Invoice */}
      {showReceiptModal && activeInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--secondary)' }}>NORTH HOSPITAL</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Official Inpatient & Outpatient Final Tax Invoice</p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-light)' }}>GSTIN / Tax ID: 29AAACN0192A1Z5</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>{activeInvoice.invNo}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date: {activeInvoice.date}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
              <div><strong>Billed To:</strong> {activeInvoice.patientName}</div>
              <div><strong>UHID:</strong> {activeInvoice.uhid}</div>
              <div><strong>Mobile:</strong> {activeInvoice.phone}</div>
            </div>

            <div className="table-container" style={{ marginBottom: '1.25rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Department / Source</th>
                    <th>Service Description</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Total ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInvoice.items.map((item, i) => (
                    <tr key={i}>
                      <td><span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>{item.source}</span></td>
                      <td><strong>{item.description}</strong></td>
                      <td>{item.qty}</td>
                      <td>${item.unitPrice.toFixed(2)}</td>
                      <td><strong>${item.total.toFixed(2)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
              <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Gross Subtotal:</span>
                  <span>${activeInvoice.subtotal.toFixed(2)}</span>
                </div>
                {activeInvoice.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                    <span>Hospital Discount:</span>
                    <span>-${activeInvoice.discount.toFixed(2)}</span>
                  </div>
                )}
                {activeInvoice.advanceDeducted > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', fontWeight: 600 }}>
                    <span>Less Advance Deposit:</span>
                    <span>-${activeInvoice.advanceDeducted.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '2px solid var(--border-color)', fontWeight: 800, fontSize: '1.125rem' }}>
                  <span>Net Amount Payable:</span>
                  <span style={{ color: 'var(--secondary)' }}>${activeInvoice.total.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <span>Amount Paid:</span>
                  <span>${activeInvoice.paid.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 700, color: activeInvoice.balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  <span>Balance Due:</span>
                  <span>${activeInvoice.balance.toFixed(2)}</span>
                </div>
                <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                  {activeInvoice.balance === 0 ? (
                    <span className="badge badge-success" style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem', fontWeight: 800 }}>✓ PAID IN FULL</span>
                  ) : (
                    <span className="badge badge-warning" style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem', fontWeight: 800, backgroundColor: '#fef3c7', color: '#b45309' }}>
                      ⚠️ PARTIAL PAYMENT (${activeInvoice.balance.toFixed(2)} REMAINING)
                    </span>
                  )}
                </div>
              </div>
            </div>


            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Cashier Signature: <strong>Harsh (Counter #1)</strong>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => setShowReceiptModal(false)}>Close</button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    window.print();
                    setShowReceiptModal(false);
                  }}
                >
                  <Printer size={16} /> Print Official Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
