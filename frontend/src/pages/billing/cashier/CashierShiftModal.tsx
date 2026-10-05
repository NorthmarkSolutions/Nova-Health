import React, { useState } from 'react';
import {
  X,
  Lock,
  Unlock,
  Coins,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  FileCheck,
  Clock,
  Printer,
  CheckCircle2
} from 'lucide-react';
import { billingService, ShiftSummary } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';

interface CashierShiftModalProps {
  currentShift: ShiftSummary | null;
  onClose: () => void;
  onShiftUpdated: () => void;
}

export const CashierShiftModal: React.FC<CashierShiftModalProps> = ({
  currentShift,
  onClose,
  onShiftUpdated
}) => {
  const { format: formatMoney } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Open Shift Form State
  const [openingFloat, setOpeningFloat] = useState<number>(5000);
  const [counterCode, setCounterCode] = useState<string>('COUNTER-01');

  // Close Shift Form State
  const [closingPhysicalCash, setClosingPhysicalCash] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState<string>('');

  const isShiftOpen = !!currentShift && currentShift.has_active_shift;

  // Compute expected cash if closing
  const openingCash = Number(currentShift?.opening_float || 0);
  const cashCollected = Number(currentShift?.cash_collected || 0);
  const expectedTotalCash = Number(currentShift?.expected_cash_in_drawer || openingCash + cashCollected);
  const cashDiscrepancy = closingPhysicalCash - expectedTotalCash;

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await billingService.openShift({
        opening_float: openingFloat,
        counter_code: counterCode
      });
      onShiftUpdated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to open cashier shift.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift?.shift_id) return;
    try {
      setLoading(true);
      setError(null);
      await billingService.closeShift({
        shift_id: currentShift.shift_id,
        physical_cash_count: closingPhysicalCash,
        notes: closeNotes
      });
      onShiftUpdated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to close cashier shift.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '560px',
          width: '95%',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          padding: '0'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            background: isShiftOpen ? 'linear-gradient(135deg, #1e293b, #0f172a)' : 'linear-gradient(135deg, #1e3a8a, #1e40af)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isShiftOpen ? <Lock size={22} color="#f59e0b" /> : <Unlock size={22} color="#38bdf8" />}
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>
                {isShiftOpen ? 'Close & Reconcile Shift' : 'Open Cashier Shift'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#cbd5e1' }}>
                {isShiftOpen
                  ? `Shift ${currentShift.shift_number || ''} • Counter: ${currentShift.counter_code}`
                  : 'Log initial float to begin handling cash & billing tokens'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem' }}>
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

          {/* MODE 1: OPEN SHIFT */}
          {!isShiftOpen && (
            <form onSubmit={handleOpenShift}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    Select Billing Counter / Desk
                  </label>
                  <select
                    className="form-control"
                    value={counterCode}
                    onChange={(e) => setCounterCode(e.target.value)}
                    required
                  >
                    <option value="COUNTER-01">Counter 01 - OPD Main Entrance</option>
                    <option value="COUNTER-02">Counter 02 - OPD Express Desk</option>
                    <option value="COUNTER-03">Counter 03 - IPD Admissions Desk</option>
                    <option value="COUNTER-04">Counter 04 - Emergency Triage</option>
                    <option value="COUNTER-05">Counter 05 - Daycare & Diagnostics</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    Initial Cash Float (₹)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#64748b',
                        fontWeight: 700
                      }}
                    >
                      ₹
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      className="form-control"
                      style={{ paddingLeft: '28px', fontSize: '1.125rem', fontWeight: 700 }}
                      value={openingFloat}
                      onChange={(e) => setOpeningFloat(Number(e.target.value))}
                      required
                    />
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Count physical currency in drawer before initiating transactions.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={onClose} className="btn btn-outline" disabled={loading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '130px' }}>
                    {loading ? 'Starting...' : 'Open Shift Now'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* MODE 2: CLOSE & RECONCILE SHIFT */}
          {isShiftOpen && (
            <form onSubmit={handleCloseShift}>
              {/* Financial Summary */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.75rem' }}>
                  CURRENT SHIFT REGISTER TOTALS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <div style={{ background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Opening Float</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{formatMoney(openingCash)}</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Cash Collected</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#16a34a' }}>{formatMoney(cashCollected)}</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Card & UPI Collected</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#2563eb' }}>
                      {formatMoney(Number(currentShift?.card_collected || 0) + Number(currentShift?.upi_collected || 0))}
                    </div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Total Invoices</div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                      {currentShift?.invoices_settled_count || 0} bills
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.6rem 0.75rem',
                    backgroundColor: '#e0f2fe',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0369a1' }}>
                    Expected Cash in Drawer:
                  </span>
                  <strong style={{ fontSize: '1rem', color: '#0369a1' }}>{formatMoney(expectedTotalCash)}</strong>
                </div>
              </div>

              {/* Physical Count Input */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                  Counted Physical Cash in Drawer (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748b',
                      fontWeight: 700
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="form-control"
                    style={{ paddingLeft: '28px', fontSize: '1.25rem', fontWeight: 700 }}
                    value={closingPhysicalCash}
                    onChange={(e) => setClosingPhysicalCash(Number(e.target.value))}
                    required
                  />
                </div>

                {/* Discrepancy Alert */}
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: cashDiscrepancy === 0 ? '#f0fdf4' : cashDiscrepancy < 0 ? '#fef2f2' : '#fefce8',
                    color: cashDiscrepancy === 0 ? '#15803d' : cashDiscrepancy < 0 ? '#b91c1c' : '#854d0e',
                    border: `1px solid ${cashDiscrepancy === 0 ? '#bbf7d0' : cashDiscrepancy < 0 ? '#fecaca' : '#fef08a'}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {cashDiscrepancy === 0 ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    <span>
                      {cashDiscrepancy === 0
                        ? 'Cash perfectly balanced!'
                        : cashDiscrepancy < 0
                        ? `Shortage of ${formatMoney(Math.abs(cashDiscrepancy))}`
                        : `Surplus of ${formatMoney(cashDiscrepancy)}`}
                    </span>
                  </div>
                  <strong>Diff: {formatMoney(cashDiscrepancy)}</strong>
                </div>
              </div>

              {/* Handover & Notes */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Closing Reconciliation Notes</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Handed cash bag #401 to vault supervisor..."
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={onClose} className="btn btn-outline" disabled={loading}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={loading}
                  style={{ minWidth: '150px' }}
                >
                  {loading ? 'Reconciling...' : 'Close & Lock Shift'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
