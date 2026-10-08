import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Download,
  Copy,
  Receipt,
  RotateCw
} from 'lucide-react';
import { billingService, ThermalReceiptPayload, BillingInvoice } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';

interface CashierReceiptModalProps {
  invoiceId: string;
  onClose: () => void;
  isDuplicate?: boolean;
}

export const CashierReceiptModal: React.FC<CashierReceiptModalProps> = ({
  invoiceId,
  onClose,
  isDuplicate = false
}) => {
  const { format: formatMoney } = useCurrency();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ThermalReceiptPayload | null>(null);
  const [invoice, setInvoice] = useState<BillingInvoice | null>(null);
  const [viewMode, setViewMode] = useState<'thermal' | 'a4'>('thermal');

  useEffect(() => {
    let isMounted = true;
    const fetchReceipt = async () => {
      try {
        setLoading(true);
        setError(null);
        const [thermalRes, invRes] = await Promise.all([
          billingService.getThermalReceipt(invoiceId),
          billingService.getInvoice(invoiceId)
        ]);
        if (isMounted) {
          setReceiptData(thermalRes);
          setInvoice(invRes);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.response?.data?.error || 'Failed to fetch receipt data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchReceipt();
    return () => {
      isMounted = false;
    };
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: viewMode === 'thermal' ? '460px' : '820px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          backgroundColor: '#ffffff',
          transition: 'max-width 0.2s ease-in-out'
        }}
      >
        {/* Modal Controls Header (Screen Only) */}
        <div
          className="no-print"
          style={{
            padding: '1rem 1.25rem',
            background: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1e293b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Receipt size={20} color="#38bdf8" />
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                {isDuplicate ? 'Duplicate Receipt Copy' : 'Payment Receipt Generated'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                Slip: {receiptData?.token_slip_number || invoice?.invoice_number}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', backgroundColor: '#1e293b', borderRadius: '6px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setViewMode('thermal')}
                style={{
                  background: viewMode === 'thermal' ? '#2563eb' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                80mm Thermal
              </button>
              <button
                type="button"
                onClick={() => setViewMode('a4')}
                style={{
                  background: viewMode === 'a4' ? '#2563eb' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                A4 Tax Bill
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="btn btn-primary btn-sm"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            >
              <Printer size={14} /> Print
            </button>

            <button
              onClick={onClose}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '6px',
                width: '28px',
                height: '28px',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, backgroundColor: '#f1f5f9' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }} />
              <p>Generating verified fiscal receipt...</p>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '0.8125rem'
              }}
            >
              {error}
            </div>
          )}

          {/* 80mm THERMAL RECEIPT VIEW */}
          {!loading && !error && viewMode === 'thermal' && receiptData && (
            <div
              id="thermal-receipt-container"
              style={{
                maxWidth: '380px',
                margin: '0 auto',
                backgroundColor: '#ffffff',
                padding: '1.25rem 1rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '12px',
                lineHeight: '1.4',
                color: '#000000',
                borderRadius: '4px',
                border: '1px solid #e2e8f0'
              }}
            >
              {isDuplicate && (
                <div
                  style={{
                    border: '1px dashed #000',
                    textAlign: 'center',
                    padding: '2px',
                    fontWeight: 700,
                    marginBottom: '8px',
                    fontSize: '11px'
                  }}
                >
                  *** DUPLICATE RECEIPT COPY ***
                </div>
              )}

              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div style={{ fontWeight: 800, fontSize: '15px' }}>{receiptData.hospital_name}</div>
                <div style={{ fontSize: '11px' }}>{receiptData.tagline}</div>
                <div style={{ fontSize: '10px' }}>{receiptData.address}</div>
                <div style={{ fontSize: '10px' }}>Phone: {receiptData.phone} | GSTIN: {receiptData.gstin}</div>
              </div>

              <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

              {/* Slip Metadata */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>TOKEN / SLIP:</span>
                  <span>{receiptData.token_slip_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Invoice:</span>
                  <span>{receiptData.invoice_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Date/Time:</span>
                  <span>{receiptData.timestamp}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Counter / Shift:</span>
                  <span>{receiptData.counter_name} • {receiptData.cashier_name}</span>
                </div>
              </div>

              <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

              {/* Patient Details */}
              <div>
                <div style={{ fontWeight: 700 }}>
                  {receiptData.patient_name} ({receiptData.gender || 'M'}/{receiptData.age || '35'})
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>UHID: {receiptData.patient_uhid}</span>
                  <span>{receiptData.encounter_type}</span>
                </div>
              </div>

              <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>
                    <th style={{ padding: '2px 0' }}>Item Description</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Amt (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '2px 0' }}>{item.description}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{Number(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

              {/* Totals Calculation */}
              <div style={{ fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Gross Total:</span>
                  <span>₹{receiptData.gross_total.toFixed(2)}</span>
                </div>
                {receiptData.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Discount:</span>
                    <span>-₹{receiptData.discount.toFixed(2)}</span>
                  </div>
                )}
                {receiptData.tax_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>GST / Taxes:</span>
                    <span>+₹{receiptData.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 800,
                    fontSize: '14px',
                    margin: '4px 0'
                  }}
                >
                  <span>NET PAYABLE:</span>
                  <span>₹{receiptData.net_total.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>AMOUNT PAID:</span>
                  <span>₹{receiptData.amount_paid.toFixed(2)}</span>
                </div>
                {receiptData.balance_due > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#000', fontWeight: 700 }}>
                    <span>BALANCE DUE:</span>
                    <span>₹{receiptData.balance_due.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

              {/* Split Tender Breakdown */}
              <div style={{ fontSize: '11px' }}>
                <div style={{ fontWeight: 700, marginBottom: '2px' }}>SETTLEMENT MODES:</div>
                {receiptData.tender_breakdown?.map((t, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      • {t.mode}
                      {t.reference ? ` (${t.reference})` : ''}
                    </span>
                    <span>₹{Number(t.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

              {/* QR Verification & Footer */}
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    border: '1px solid #000',
                    margin: '0 auto 4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    letterSpacing: '-0.5px'
                  }}
                >
                  [QR VALID]
                </div>
                <div style={{ fontSize: '10px' }}>Auth: {receiptData.verification_hash}</div>
                {receiptData.assisted_note && <div style={{ fontSize: '10px', marginTop: '4px' }}>{receiptData.assisted_note}</div>}
                <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: 600 }}>
                  {receiptData.footer_note}
                </div>
              </div>
            </div>
          )}

          {/* A4 FORMAL TAX INVOICE VIEW */}
          {!loading && !error && viewMode === 'a4' && invoice && (
            <div
              id="a4-invoice-container"
              style={{
                backgroundColor: '#ffffff',
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                color: '#0f172a'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800, color: '#1e3a8a' }}>NORTH HOSPITAL</h2>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Tertiary Multi-Specialty Healthcare & Research Institute</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Plot 14, Health City, Sector 62 • GSTIN: 07AAAAA0000A1Z5</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="badge badge-primary" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                    TAX INVOICE / RECEIPT
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.25rem' }}>{invoice.invoice_number}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Token / Slip: <strong>{invoice.token_slip_number || 'N/A'}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Date: {new Date(invoice.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Patient & Doctor Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Patient Details</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{invoice.patient_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>UHID: {invoice.patient_uhid}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Encounter / Care</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{invoice.encounter_type || 'OUTPATIENT'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>Category: {invoice.category || 'GENERAL'}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Payment Status</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: invoice.status === 'PAID' ? '#15803d' : '#b45309' }}>
                    {invoice.status}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                    Settled at Counter Desk
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="table" style={{ width: '100%', marginBottom: '1.25rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>#</th>
                    <th>Service / Item Description</th>
                    <th>Code</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Unit Rate</th>
                    <th style={{ textAlign: 'right' }}>Tax (GST)</th>
                    <th style={{ textAlign: 'right' }}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{item.description}</td>
                      <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.item_code || '-'}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(item.unit_price)}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(item.tax_amount || 0)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(item.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem', color: '#475569' }}>
                    Payment Mode Breakdown
                  </div>
                  {invoice.payments?.length ? (
                    invoice.payments.map((p, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.2rem 0' }}>
                        <span>
                          {p.payment_method} {p.reference_number ? `(${p.reference_number})` : ''}
                        </span>
                        <strong style={{ color: '#15803d' }}>{formatMoney(p.amount)}</strong>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No electronic payment records logged.</div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Gross Total:</span>
                    <span>{formatMoney(invoice.total_amount)}</span>
                  </div>
                  {invoice.discount_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
                      <span>Discount / Waiver:</span>
                      <span>-{formatMoney(invoice.discount_amount)}</span>
                    </div>
                  )}
                  {invoice.tax_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Taxes (GST):</span>
                      <span>+{formatMoney(invoice.tax_amount)}</span>
                    </div>
                  )}
                  {invoice.advance_deducted > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb' }}>
                      <span>Advance Deposit Deducted:</span>
                      <span>-{formatMoney(invoice.advance_deducted)}</span>
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '1rem',
                      fontWeight: 800,
                      borderTop: '1px solid #cbd5e1',
                      paddingTop: '0.5rem',
                      marginTop: '0.25rem'
                    }}
                  >
                    <span>Total Amount Paid:</span>
                    <span style={{ color: '#16a34a' }}>{formatMoney(invoice.paid_amount)}</span>
                  </div>
                  {invoice.balance_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 700 }}>
                      <span>Balance Due:</span>
                      <span>{formatMoney(invoice.balance_amount)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ textAlign: 'center', width: '200px' }}>
                  <div style={{ borderBottom: '1px solid #94a3b8', height: '30px' }} />
                  <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '4px' }}>Patient / Attendant Signature</div>
                </div>

                <div style={{ textAlign: 'center', width: '200px' }}>
                  <div style={{ borderBottom: '1px solid #94a3b8', height: '30px' }} />
                  <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '4px' }}>Authorized Billing Cashier</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
