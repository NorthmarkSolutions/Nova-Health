import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  DollarSign,
  QrCode,
  ShieldCheck,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ArrowRight,
  Coins,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import {
  billingService,
  TenderLineItem,
  MultiTenderPaymentPayload,
  ShiftSummary
} from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';

interface MultiTenderSettlementModalProps {
  invoice: {
    id: string;
    invoice_number: string;
    token_slip_number?: string;
    patient_name: string;
    patient_uhid: string;
    encounter_type?: string;
    category?: string;
    total_amount: number;
    paid_amount: number;
    balance_amount: number;
    advance_deducted?: number;
  };
  currentShift: ShiftSummary | null;
  onClose: () => void;
  onSuccess: (settledInvoiceId: string) => void;
}

export const MultiTenderSettlementModal: React.FC<MultiTenderSettlementModalProps> = ({
  invoice,
  currentShift,
  onClose,
  onSuccess
}) => {
  const { format: formatMoney, symbol } = useCurrency();
  const balanceDue = Number(invoice.balance_amount) || 0;

  // Tender Lines
  const [tenderLines, setTenderLines] = useState<TenderLineItem[]>([
    {
      tender_mode: 'CASH',
      amount: balanceDue,
      reference_number: ''
    }
  ]);

  // Cash Calculation state for CASH lines
  const [tenderedCash, setTenderedCash] = useState<number>(balanceDue);

  // Patient deposit ledger balance state
  const [depositBalance, setDepositBalance] = useState<number>(0);
  const [loadingDeposit, setLoadingDeposit] = useState<boolean>(true);

  // Submitting state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch patient advance deposit balance
  useEffect(() => {
    let isMounted = true;
    const fetchDeposit = async () => {
      try {
        setLoadingDeposit(true);
        const data = await billingService.getPatientAdvanceLedger(invoice.patient_uhid);
        if (isMounted) {
          setDepositBalance(data.current_balance || 0);
        }
      } catch (e) {
        // If not found or error, fallback 0
        if (isMounted) setDepositBalance(0);
      } finally {
        if (isMounted) setLoadingDeposit(false);
      }
    };
    fetchDeposit();
    return () => {
      isMounted = false;
    };
  }, [invoice.patient_uhid]);

  // Calculations
  const totalAllocated = tenderLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  const remainingDue = Math.max(0, balanceDue - totalAllocated);
  const isExactOrFull = Math.abs(balanceDue - totalAllocated) < 0.01;
  const isOverAllocated = totalAllocated > balanceDue + 0.01;

  // Calculate change for Cash mode
  const cashLine = tenderLines.find((l) => l.tender_mode === 'CASH');
  const cashAmount = cashLine ? Number(cashLine.amount) || 0 : 0;
  const changeToReturn = Math.max(0, tenderedCash - cashAmount);

  const handleAddTenderLine = (mode: TenderLineItem['tender_mode']) => {
    if (remainingDue <= 0 && mode !== 'CASH') return;
    const allocAmount = remainingDue > 0 ? remainingDue : 0;
    setTenderLines((prev) => [
      ...prev,
      {
        tender_mode: mode,
        amount: allocAmount,
        reference_number: mode === 'UPI' ? 'UPI/VERIFIED' : ''
      }
    ]);
  };

  const handleRemoveTenderLine = (index: number) => {
    if (tenderLines.length <= 1) return;
    setTenderLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateLine = (index: number, updates: Partial<TenderLineItem>) => {
    setTenderLines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  // Quick cash tender increment
  const handleQuickCash = (amount: number) => {
    setTenderedCash((prev) => prev + amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tenderLines.length === 0 || totalAllocated <= 0) {
      setError('Please add at least one valid tender amount to settle.');
      return;
    }

    if (isOverAllocated) {
      setError(`Allocated payment (${formatMoney(totalAllocated)}) exceeds balance due (${formatMoney(balanceDue)}). Please adjust lines.`);
      return;
    }

    if (cashLine && tenderedCash < cashAmount) {
      setError(`Cash tendered (${formatMoney(tenderedCash)}) is less than cash payment amount (${formatMoney(cashAmount)}).`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: MultiTenderPaymentPayload = {
        invoice_id: invoice.id,
        shift_id: currentShift?.shift_id,
        tender_lines: tenderLines.map((line) => ({
          ...line,
          amount: Number(line.amount)
        })),
        notes: `Cashier settlement at counter ${currentShift?.counter_name || 'Desk'}`
      };

      const res = await billingService.processMultiTenderPayment(payload);
      onSuccess(res.invoice.id);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Settlement failed. Please check shift status and tender details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '740px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          backgroundColor: '#ffffff'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
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
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa'
              }}
            >
              <CreditCard size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#f8fafc' }}>
                Multi-Tender POS Settlement
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                Invoice: <strong style={{ color: '#38bdf8' }}>{invoice.invoice_number}</strong> • Patient: <strong>{invoice.patient_name}</strong> ({invoice.patient_uhid})
              </p>
            </div>
          </div>

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

          {/* Balance Banner & Deposit Ledger Card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: '1rem',
              marginBottom: '1.25rem'
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Outstanding Balance Due
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Gross: {formatMoney(invoice.total_amount)} | Settled: {formatMoney(invoice.paid_amount)}
                </div>
              </div>
              <div style={{ fontSize: '1.625rem', fontWeight: 900, color: '#2563eb' }}>
                {formatMoney(balanceDue)}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Patient Deposit Ledger
                </div>
                <div style={{ fontSize: '0.75rem', color: depositBalance > 0 ? '#16a34a' : '#94a3b8' }}>
                  {depositBalance > 0 ? `Available: ${formatMoney(depositBalance)}` : 'No advance credit'}
                </div>
              </div>

              {depositBalance > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const amountToUse = Math.min(depositBalance, balanceDue);
                    handleAddTenderLine('DEPOSIT_DEDUCTION');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem' }}
                >
                  <Sparkles size={13} color="#2563eb" /> Apply Deposit
                </button>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Tender Items Section */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                    Payment Tenders & Allocations
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                    Split settlement across multiple tender modes
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => handleAddTenderLine('UPI')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    + UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddTenderLine('CARD')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    + Card
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddTenderLine('CASH')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    + Cash
                  </button>
                </div>
              </div>

              {/* Tender Rows List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {tenderLines.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      backgroundColor: '#f8fafc'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 140px 1fr 36px', gap: '0.75rem', alignItems: 'center' }}>
                      {/* Tender Mode */}
                      <div>
                        <select
                          className="form-select"
                          style={{ fontSize: '0.8125rem', padding: '0.4rem 0.6rem' }}
                          value={line.tender_mode}
                          onChange={(e) => handleUpdateLine(idx, { tender_mode: e.target.value as any })}
                        >
                          <option value="CASH">Cash</option>
                          <option value="UPI">UPI / Digital QR</option>
                          <option value="CARD">Credit/Debit Card</option>
                          <option value="DEPOSIT_DEDUCTION">Deposit Deduction</option>
                          <option value="CHEQUE">Cheque / Demand Draft</option>
                          <option value="BANK_TRANSFER">Bank Wire / RTGS</option>
                        </select>
                      </div>

                      {/* Tender Amount */}
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="form-input"
                          style={{ fontSize: '0.8125rem', padding: '0.4rem 0.6rem', fontWeight: 700 }}
                          value={line.amount}
                          onChange={(e) => handleUpdateLine(idx, { amount: parseFloat(e.target.value) || 0 })}
                          required
                        />
                      </div>

                      {/* Specific metadata field depending on mode */}
                      <div>
                        {line.tender_mode === 'CASH' && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Cash drawer drop • Change calculated below
                          </div>
                        )}

                        {line.tender_mode === 'UPI' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                              type="text"
                              placeholder="UPI Ref / UTR / App Txn ID"
                              className="form-input"
                              style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem' }}
                              value={line.reference_number || ''}
                              onChange={(e) => handleUpdateLine(idx, { reference_number: e.target.value })}
                            />
                            <span className="badge badge-info" style={{ fontSize: '0.625rem', whiteSpace: 'nowrap' }}>
                              UPI QR Live
                            </span>
                          </div>
                        )}

                        {line.tender_mode === 'CARD' && (
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <select
                              className="form-select"
                              style={{ fontSize: '0.75rem', padding: '0.4rem 0.4rem', width: '100px' }}
                              value={line.card_network || 'VISA'}
                              onChange={(e) => handleUpdateLine(idx, { card_network: e.target.value })}
                            >
                              <option value="VISA">Visa</option>
                              <option value="MASTERCARD">Mastercard</option>
                              <option value="RUPAY">RuPay</option>
                              <option value="AMEX">Amex</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Last 4"
                              maxLength={4}
                              className="form-input"
                              style={{ fontSize: '0.75rem', padding: '0.4rem 0.4rem', width: '65px' }}
                              value={line.card_last_four || ''}
                              onChange={(e) => handleUpdateLine(idx, { card_last_four: e.target.value })}
                            />
                            <input
                              type="text"
                              placeholder="Auth Code"
                              className="form-input"
                              style={{ fontSize: '0.75rem', padding: '0.4rem 0.4rem' }}
                              value={line.reference_number || ''}
                              onChange={(e) => handleUpdateLine(idx, { reference_number: e.target.value })}
                            />
                          </div>
                        )}

                        {line.tender_mode === 'DEPOSIT_DEDUCTION' && (
                          <div style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                            Deducted from patient advance balance ({formatMoney(depositBalance)})
                          </div>
                        )}

                        {line.tender_mode === 'CHEQUE' && (
                          <input
                            type="text"
                            placeholder="Cheque No & Bank Name"
                            className="form-input"
                            style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem' }}
                            value={line.reference_number || ''}
                            onChange={(e) => handleUpdateLine(idx, { reference_number: e.target.value })}
                          />
                        )}
                      </div>

                      {/* Remove Button */}
                      <div>
                        {tenderLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTenderLine(idx)}
                            style={{
                              backgroundColor: '#fee2e2',
                              border: 'none',
                              borderRadius: '6px',
                              width: '32px',
                              height: '32px',
                              color: '#dc2626',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CASH CHANGE CALCULATOR (When CASH tender is present) */}
            {cashLine && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Coins size={18} color="#16a34a" />
                  <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                    Cash Tendered & Change Return Calculator
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                      Cash Given by Patient ({symbol}):
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="number"
                        step="10"
                        min={cashAmount}
                        className="form-input"
                        style={{ fontSize: '1.125rem', fontWeight: 700, width: '160px' }}
                        value={tenderedCash}
                        onChange={(e) => setTenderedCash(parseFloat(e.target.value) || 0)}
                      />
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button
                          type="button"
                          onClick={() => setTenderedCash(cashAmount)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem' }}
                        >
                          Exact
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickCash(500)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem' }}
                        >
                          +500
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickCash(1000)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem' }}
                        >
                          +1000
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickCash(2000)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem' }}
                        >
                          +2000
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: changeToReturn > 0 ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${changeToReturn > 0 ? '#bbf7d0' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      textAlign: 'right'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Change to Return Patient:</div>
                    <div
                      style={{
                        fontSize: '1.375rem',
                        fontWeight: 800,
                        color: changeToReturn > 0 ? '#15803d' : '#64748b'
                      }}
                    >
                      {formatMoney(changeToReturn)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Allocation Status Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: isOverAllocated ? '#fef2f2' : remainingDue > 0 ? '#fffbeb' : '#f0fdf4',
                border: `1px solid ${isOverAllocated ? '#fecaca' : remainingDue > 0 ? '#fde68a' : '#bbf7d0'}`,
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem'
              }}
            >
              <div>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                  Total Allocated: <strong>{formatMoney(totalAllocated)}</strong> of {formatMoney(balanceDue)}
                </span>
              </div>

              <div>
                {isExactOrFull ? (
                  <span style={{ fontSize: '0.8125rem', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle2 size={16} /> Fully Allocated & Ready
                  </span>
                ) : remainingDue > 0 ? (
                  <span style={{ fontSize: '0.8125rem', color: '#b45309', fontWeight: 600 }}>
                    Remaining due: {formatMoney(remainingDue)} (Partial Payment)
                  </span>
                ) : (
                  <span style={{ fontSize: '0.8125rem', color: '#dc2626', fontWeight: 700 }}>
                    Over-allocated by {formatMoney(totalAllocated - balanceDue)}
                  </span>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || isOverAllocated || totalAllocated <= 0}
                className="btn btn-primary"
                style={{
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              >
                <CheckCircle2 size={16} />
                {submitting ? 'Processing Payment...' : 'Confirm Settlement & Issue Receipt'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
