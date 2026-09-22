import React, { useState } from 'react';
import {
  X,
  Receipt,
  CreditCard,
  QrCode,
  Printer,
  CheckCircle2,
  DollarSign,
  User,
  Stethoscope,
  Percent,
  Check,
} from 'lucide-react';
import { SharedQueueToken, patientJourneyService } from '../../../services/patientJourneyService';
import { DepartmentTariffMaster } from '../../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  token: SharedQueueToken | null;
  tariffMaster: DepartmentTariffMaster;
  onPaymentCompleted: (tokenNo: number, invoiceId: string) => void;
}

export const CounterBillingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  token,
  tariffMaster,
  onPaymentCompleted,
}) => {
  if (!isOpen || !token) return null;

  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CARD' | 'UPI' | 'INSURANCE'>('CASH');
  const [cashTendered, setCashTendered] = useState<number>(100);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isPaid, setIsPaid] = useState(token.feePaid || false);
  const [receiptGenerated, setReceiptGenerated] = useState(false);

  // Line items
  const baseConsultFee = token.totalFee ? Math.max(50, token.totalFee - 25) : 75;
  const regFee = tariffMaster.intakeRegistrationFee || 15;
  const triageFee = tariffMaster.triageVitalsFee || 10;
  const chamberFee = tariffMaster.roomTariffs[0]?.facilityFee || 15;

  const subtotal = baseConsultFee + regFee + triageFee + chamberFee;
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const finalTotal = subtotal - discountAmount;
  const cashChange = Math.max(0, cashTendered - finalTotal);

  const invNo = token.invoiceNo || `INV-OPD-${String(token.token).padStart(4, '0')}`;

  const handleProcessPayment = () => {
    // Save invoice to patientJourneyService
    patientJourneyService.addInvoice({
      id: `inv-${Date.now()}`,
      invNo,
      patientName: token.patient,
      uhid: token.uhid,
      phone: token.phone,
      category: 'OPD',
      date: new Date().toISOString().split('T')[0],
      subtotal,
      discount: discountAmount,
      tax: 0,
      advanceDeducted: 0,
      total: finalTotal,
      paid: finalTotal,
      balance: 0,
      status: 'PAID',
      items: [
        {
          source: 'Consultation',
          description: `OPD Consultation Fee - ${token.doctor}`,
          qty: 1,
          unitPrice: baseConsultFee,
          total: baseConsultFee,
        },
        {
          source: 'Misc',
          description: 'OPD Registration & Digital Hospital Card',
          qty: 1,
          unitPrice: regFee,
          total: regFee,
        },
        {
          source: 'Misc',
          description: 'Nurse Triage, Blood Pressure & Vital Signs',
          qty: 1,
          unitPrice: triageFee,
          total: triageFee,
        },
        {
          source: 'Misc',
          description: `Chamber Facility & Sanitation Fee (${token.room})`,
          qty: 1,
          unitPrice: chamberFee,
          total: chamberFee,
        },
      ],
    });

    // Update token status
    patientJourneyService.updateQueueToken(token.token, {
      feePaid: true,
      totalFee: finalTotal,
      paymentMode,
      invoiceNo: invNo,
    });

    setIsPaid(true);
    setReceiptGenerated(true);
    onPaymentCompleted(token.token, invNo);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '640px',
          padding: '1.75rem',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span
              style={{
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                padding: '0.5rem',
                borderRadius: '10px',
                display: 'flex',
              }}
            >
              <Receipt size={22} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
                OPD Front Desk Billing & Cash Collection
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Token #{String(token.token).padStart(2, '0')} • {token.patient} ({token.uhid})
              </p>
            </div>
          </div>
          <button
            type="button"
            className="action-btn"
            onClick={onClose}
            style={{ color: 'var(--text-muted)', border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {!receiptGenerated ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Bill Summary Table */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-subtle)', fontWeight: 800, fontSize: '0.8125rem', color: 'var(--secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Item Description (OPD Tariff Master)</span>
                <span>Amount</span>
              </div>

              <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{token.doctor} (Standard Consultation)</span>
                  <strong>${baseConsultFee}.00</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Hospital OPD Registration Charge</span>
                  <strong>${regFee}.00</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Nurse Triage & Vital Signs Recording</span>
                  <strong>${triageFee}.00</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Chamber Facility & Consumables ({token.room})</span>
                  <strong>${chamberFee}.00</strong>
                </div>

                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Subtotal:</span>
                  <span>${subtotal}.00</span>
                </div>

                {discountPercent > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <span>Special Discount ({discountPercent}%):</span>
                    <span>-${discountAmount}.00</span>
                  </div>
                )}

                <div style={{ borderTop: '1.5px solid var(--border-color)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 900, color: 'var(--secondary)' }}>
                  <span>Total Payable:</span>
                  <span style={{ color: '#0284c7' }}>${finalTotal}.00</span>
                </div>
              </div>
            </div>

            {/* Discounts & Concessions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Apply Concession:
              </span>
              {[
                { label: 'None', val: 0 },
                { label: 'Senior Citizen (15%)', val: 15 },
                { label: 'Staff Dependent (25%)', val: 25 },
                { label: 'Charity (50%)', val: 50 },
              ].map((d) => (
                <button
                  key={d.val}
                  type="button"
                  onClick={() => setDiscountPercent(d.val)}
                  className={`subtab-pill ${discountPercent === d.val ? 'active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Payment Method *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                {[
                  { id: 'CASH', label: 'Cash Desk', icon: <DollarSign size={16} /> },
                  { id: 'CARD', label: 'POS Card', icon: <CreditCard size={16} /> },
                  { id: 'UPI', label: 'UPI / QR', icon: <QrCode size={16} /> },
                  { id: 'INSURANCE', label: 'Insurance TPA', icon: <CheckCircle2 size={16} /> },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMode(m.id as any)}
                    style={{
                      padding: '0.65rem 0.5rem',
                      borderRadius: '8px',
                      border: '1.5px solid',
                      borderColor: paymentMode === m.id ? '#0284c7' : 'var(--border-color)',
                      backgroundColor: paymentMode === m.id ? '#eff6ff' : '#ffffff',
                      color: paymentMode === m.id ? '#0284c7' : 'var(--secondary)',
                      fontWeight: 800,
                      fontSize: '0.8125rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                    }}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Calculator if CASH is selected */}
            {paymentMode === 'CASH' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '0.85rem', backgroundColor: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>Cash Tendered by Patient ($)</label>
                  <input
                    type="number"
                    min={finalTotal}
                    step="5"
                    className="form-input"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(Number(e.target.value))}
                    style={{ fontWeight: 800, fontSize: '1.1rem', color: '#92400e' }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>Change to Return:</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#b45309', marginTop: '0.2rem' }}>
                    ${cashChange}.00
                  </div>
                </div>
              </div>
            )}

            {/* UPI QR Simulation */}
            {paymentMode === 'UPI' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <div style={{ padding: '0.5rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <QrCode size={48} color="#15803d" />
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#15803d' }}>
                    Scan with UPI / PhonePe / GooglePay
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '0.2rem' }}>
                    UPI ID: <code>northhospital.opd@icici</code> • Amount: <strong>${finalTotal}.00</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleProcessPayment}
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, backgroundColor: '#16a34a', borderColor: '#16a34a' }}
              >
                <Check size={16} /> Mark Paid & Print Official Receipt (${finalTotal})
              </button>
            </div>
          </div>
        ) : (
          /* RECEIPT SLIP PREVIEW */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '100%',
                maxWidth: '400px',
                border: '1.5px dashed var(--border-color)',
                borderRadius: '12px',
                padding: '1.5rem',
                backgroundColor: '#ffffff',
                fontFamily: 'monospace',
                fontSize: '0.7813rem',
              }}
            >
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, fontFamily: 'sans-serif' }}>NORTH HOSPITAL</h3>
                <p style={{ margin: '0.15rem 0 0', color: 'var(--text-muted)' }}>OPD RECEPTION CASH DESK #1</p>
                <p style={{ margin: 0, fontSize: '0.6875rem' }}>Tax Invoice / Cash Receipt</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Receipt #:</span>
                <strong>{invNo}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Date:</span>
                <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>Patient:</span>
                <strong>{token.patient}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span>UHID:</span>
                <span>{token.uhid}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span>Token #:</span>
                <strong style={{ fontSize: '0.9rem' }}>#{String(token.token).padStart(2, '0')}</strong>
              </div>

              <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>1x OPD Consultation ({token.doctor.split('(')[0]})</span>
                  <span>${baseConsultFee}.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>1x Registration Fee</span>
                  <span>${regFee}.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>1x Vitals Recording</span>
                  <span>${triageFee}.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>1x Chamber Sanitation ({token.room})</span>
                  <span>${chamberFee}.00</span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '0.9375rem' }}>
                <span>TOTAL PAID:</span>
                <span>${finalTotal}.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', marginTop: '0.2rem' }}>
                <span>Payment Mode:</span>
                <span>{paymentMode} (VERIFIED)</span>
              </div>

              <div style={{ textAlign: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.6875rem' }}>
                <p style={{ margin: 0 }}>Please proceed to <strong>{token.room}</strong></p>
                <p style={{ margin: '0.2rem 0 0' }}>Thank you for choosing North Hospital!</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  window.print();
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Printer size={16} /> Print Cash Receipt
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
