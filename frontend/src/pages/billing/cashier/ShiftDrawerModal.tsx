import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  X,
  Clock,
  DollarSign,
  CreditCard,
  QrCode,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Calculator,
  RefreshCw,
  Coins
} from 'lucide-react';
import { billingService, ShiftSummary } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';

interface ShiftDrawerModalProps {
  onClose: () => void;
  onShiftStatusChange?: (shift: ShiftSummary) => void;
}

export const ShiftDrawerModal: React.FC<ShiftDrawerModalProps> = ({
  onClose,
  onShiftStatusChange
}) => {
  const { format: formatMoney, symbol } = useCurrency();
  const [loading, setLoading] = useState<boolean>(true);
  const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Open Shift Form State
  const [counterCode, setCounterCode] = useState<string>('COUNTER-01');
  const [openingFloat, setOpeningFloat] = useState<number>(5000);

  // Close Shift & Reconciliation State
  const [denominations, setDenominations] = useState<Record<string, number>>({
    '2000': 0,
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
    'coins': 0
  });
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchShift = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await billingService.getCurrentShift();
      setShiftSummary(data);
      if (onShiftStatusChange) {
        onShiftStatusChange(data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to fetch shift details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShift();
  }, []);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await billingService.openShift({
        counter_code: counterCode,
        opening_float: openingFloat
      });
      setSuccessMsg(`Shift successfully opened at ${counterCode} with float ${formatMoney(openingFloat)}`);
      await fetchShift();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to open shift');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate physical cash from denominations
  const calculatePhysicalCash = (): number => {
    const total =
      (denominations['2000'] || 0) * 2000 +
      (denominations['500'] || 0) * 500 +
      (denominations['200'] || 0) * 200 +
      (denominations['100'] || 0) * 100 +
      (denominations['50'] || 0) * 50 +
      (denominations['20'] || 0) * 20 +
      (denominations['10'] || 0) * 10 +
      (denominations['coins'] || 0);
    return total;
  };

  const physicalCashTotal = calculatePhysicalCash();
  const expectedCash = shiftSummary?.expected_cash_in_drawer || 0;
  const cashVariance = physicalCashTotal - expectedCash;

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftSummary?.shift_id) return;

    if (physicalCashTotal === 0 && !window.confirm('Physical cash counted is Rs. 0. Are you sure you wish to submit closing?')) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await billingService.closeShift({
        shift_id: shiftSummary.shift_id,
        physical_cash_count: physicalCashTotal,
        denominations,
        notes: closeNotes
      });
      setSuccessMsg('Shift closed and locked successfully. Reconciliation record generated.');
      await fetchShift();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to close shift');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1150 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '680px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #334155'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: shiftSummary?.has_active_shift ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: shiftSummary?.has_active_shift ? '#34d399' : '#f87171'
              }}
            >
              {shiftSummary?.has_active_shift ? <ShieldCheck size={22} /> : <Lock size={22} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#f8fafc' }}>
                Counter Shift & Drawer Settlement
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                {shiftSummary?.has_active_shift
                  ? `Active Shift: ${shiftSummary.shift_number} • ${shiftSummary.counter_name}`
                  : 'No active shift open on this terminal'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={fetchShift}
              title="Refresh Shift Telemetry"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, backgroundColor: '#f8fafc' }}>
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '0.8125rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                color: '#15803d',
                fontSize: '0.8125rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }} />
              <p>Loading shift register and drawer balance...</p>
            </div>
          ) : !shiftSummary?.has_active_shift ? (
            /* OPEN SHIFT FORM */
            <form onSubmit={handleOpenShift}>
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Building2 size={20} color="#2563eb" />
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                    Open Cashier Terminal Shift
                  </h4>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
                  Before processing point-of-sale settlements, you must initialize your counter shift and declare your starting opening float cash drawer.
                </p>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Billing Station / Counter *</label>
                  <select
                    className="form-select"
                    value={counterCode}
                    onChange={(e) => setCounterCode(e.target.value)}
                    required
                  >
                    <option value="COUNTER-01">Counter 1 - Main Lobby OPD (COUNTER-01)</option>
                    <option value="COUNTER-02">Counter 2 - Emergency Care Desk (COUNTER-02)</option>
                    <option value="COUNTER-03">Counter 3 - IPD Discharge Billing (COUNTER-03)</option>
                    <option value="COUNTER-04">Counter 4 - Diagnostics & Lab POS (COUNTER-04)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Opening Float Cash ({symbol}) *
                  </label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    className="form-input"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                    required
                    placeholder="e.g. 5000"
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Standard starting float drawer for change return is typically {formatMoney(5000)}.
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                >
                  {submitting ? 'Opening Shift...' : '🚀 Open Shift & Initialize Drawer'}
                </button>
              </div>
            </form>
          ) : (
            /* ACTIVE SHIFT SUMMARY & RECONCILIATION */
            <div>
              {/* Telemetry Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.75rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem'
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                    Opening Float
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
                    {formatMoney(shiftSummary.opening_float)}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem'
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                    Cash Collected
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#16a34a', marginTop: '0.2rem' }}>
                    {formatMoney(shiftSummary.cash_collected)}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem'
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                    Digital (UPI/Card)
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#2563eb', marginTop: '0.2rem' }}>
                    {formatMoney(shiftSummary.card_collected + shiftSummary.upi_collected)}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem'
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                    Total Settled
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
                    {formatMoney(shiftSummary.total_collected)}
                  </div>
                </div>
              </div>

              {/* Expected Drawer Focus Card */}
              <div
                style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>
                    System Expected Physical Cash In Drawer
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Opening Float ({formatMoney(shiftSummary.opening_float)}) + Cash Receipts ({formatMoney(shiftSummary.cash_collected)})
                  </div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a8a' }}>
                  {formatMoney(expectedCash)}
                </div>
              </div>

              {/* DENOMINATION RECONCILIATION FOR CLOSING */}
              <form onSubmit={handleCloseShift}>
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Calculator size={18} color="#2563eb" />
                    <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                      End-of-Shift Physical Cash Denomination Count
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
                    Count all currency notes in your drawer and enter their counts below to verify variance:
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '0.75rem',
                      marginBottom: '1.25rem'
                    }}
                  >
                    {[
                      { key: '2000', label: '₹2000' },
                      { key: '500', label: '₹500' },
                      { key: '200', label: '₹200' },
                      { key: '100', label: '₹100' },
                      { key: '50', label: '₹50' },
                      { key: '20', label: '₹20' },
                      { key: '10', label: '₹10' },
                      { key: 'coins', label: 'Coins (₹)' }
                    ].map((item) => (
                      <div key={item.key}>
                        <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>
                          {item.label}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step={item.key === 'coins' ? '1' : '1'}
                          className="form-input"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.8125rem' }}
                          value={denominations[item.key] || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setDenominations((prev) => ({ ...prev, [item.key]: val }));
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Physical Count & Variance Summary */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1rem',
                      padding: '0.75rem 1rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      marginBottom: '1rem'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Physical Cash Counted:</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                        {formatMoney(physicalCashTotal)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Reconciliation Variance:</div>
                      <div
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          color:
                            cashVariance === 0
                              ? '#15803d'
                              : cashVariance > 0
                              ? '#d97706'
                              : '#dc2626'
                        }}
                      >
                        {cashVariance === 0
                          ? '✓ Balanced (₹0.00)'
                          : cashVariance > 0
                          ? `+${formatMoney(cashVariance)} (Surplus)`
                          : `-${formatMoney(Math.abs(cashVariance))} (Shortage)`}
                      </div>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                      Handover Notes / Variance Remarks
                    </label>
                    <textarea
                      rows={2}
                      className="form-input"
                      placeholder="Remarks on petty cash, safe drop bag number, or supervisor verification..."
                      value={closeNotes}
                      onChange={(e) => setCloseNotes(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={onClose}
                    >
                      Keep Shift Active
                    </button>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary"
                      style={{
                        backgroundColor: '#dc2626',
                        borderColor: '#dc2626',
                        color: '#ffffff'
                      }}
                    >
                      <Lock size={15} />
                      {submitting ? 'Closing...' : 'Close Shift & Handover Drawer'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
