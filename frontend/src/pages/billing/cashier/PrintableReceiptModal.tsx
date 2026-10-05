import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  Building2,
  CreditCard,
  QrCode,
  DollarSign,
  FileText,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { billingService, InvoiceReceiptData } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';

interface PrintableReceiptModalProps {
  invoiceId: string;
  onClose: () => void;
}

export const PrintableReceiptModal: React.FC<PrintableReceiptModalProps> = ({
  invoiceId,
  onClose,
}) => {
  const { format: formatMoney } = useCurrency();
  const [loading, setLoading] = useState<boolean>(true);
  const [receiptData, setReceiptData] = useState<InvoiceReceiptData | null>(null);
  const [printFormat, setPrintFormat] = useState<'A4' | 'THERMAL'>('A4');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadReceipt = async () => {
      try {
        setLoading(true);
        const data = await billingService.getInvoiceReceipt(invoiceId);
        if (isMounted) {
          setReceiptData(data);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.response?.data?.error || 'Failed to load official receipt details');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    loadReceipt();
    return () => {
      isMounted = false;
    };
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: printFormat === 'A4' ? '820px' : '440px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          borderRadius: '16px'
        }}
      >
        {/* Top Action Bar (hidden in print) */}
        <div
          className="no-print"
          style={{
            padding: '1rem 1.5rem',
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
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa'
              }}
            >
              <Receipt size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                Official Settlement Receipt
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                Token: <strong style={{ color: '#38bdf8' }}>{receiptData?.invoice.token_slip_number || 'NH-POS'}</strong> • GST Compliant
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Format Switcher */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '3px',
                borderRadius: '8px'
              }}
            >
              <button
                onClick={() => setPrintFormat('A4')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: printFormat === 'A4' ? '#3b82f6' : 'transparent',
                  color: '#ffffff',
                  transition: 'all 0.2s'
                }}
              >
                A4 Tax Bill
              </button>
              <button
                onClick={() => setPrintFormat('THERMAL')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: printFormat === 'THERMAL' ? '#3b82f6' : 'transparent',
                  color: '#ffffff',
                  transition: 'all 0.2s'
                }}
              >
                80mm Thermal Slip
              </button>
            </div>

            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Printer size={15} /> Print
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

        {/* Scrollable Printable Document Body */}
        <div
          style={{
            padding: printFormat === 'A4' ? '2rem' : '1.25rem',
            overflowY: 'auto',
            flex: 1,
            color: '#1e293b',
            fontFamily: printFormat === 'THERMAL' ? '"Courier New", Courier, monospace' : 'inherit'
          }}
        >
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }} />
              <p>Fetching authorized settlement receipt...</p>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '1.25rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c'
              }}
            >
              <strong>Receipt Error:</strong> {error}
            </div>
          )}

          {!loading && receiptData && printFormat === 'A4' && (
            <div id="printable-a4-tax-receipt">
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '2px solid #0f172a',
                  paddingBottom: '1.25rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Building2 size={24} color="#2563eb" />
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                      {receiptData.hospital.name}
                    </h1>
                  </div>
                  <p style={{ margin: '0 0 0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                    {receiptData.hospital.tagline}
                  </p>
                  <p style={{ margin: '0 0 0.15rem', fontSize: '0.75rem', color: '#64748b' }}>
                    {receiptData.hospital.address} • Ph: {receiptData.hospital.phone}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                    <strong>GSTIN:</strong> {receiptData.hospital.gstin} | <strong>PAN:</strong> {receiptData.hospital.pan}
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      marginBottom: '0.5rem'
                    }}
                  >
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
                      Official Tax Invoice
                    </span>
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#1e293b' }}>
                    {receiptData.invoice.invoice_number}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Token / Slip: <strong>{receiptData.invoice.token_slip_number}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Date: {receiptData.invoice.date}
                  </div>
                </div>
              </div>

              {/* Patient & Billing Metadata Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  fontSize: '0.8125rem'
                }}
              >
                <div>
                  <div style={{ marginBottom: '0.35rem' }}>
                    <span style={{ color: '#64748b' }}>Patient Name: </span>
                    <strong style={{ color: '#0f172a' }}>{receiptData.patient.name}</strong>
                  </div>
                  <div style={{ marginBottom: '0.35rem' }}>
                    <span style={{ color: '#64748b' }}>UHID: </span>
                    <code style={{ fontWeight: 700, color: '#2563eb' }}>{receiptData.patient.uhid}</code>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Contact: </span>
                    <span>{receiptData.patient.phone || 'N/A'}</span>
                  </div>
                </div>

                <div>
                  <div style={{ marginBottom: '0.35rem' }}>
                    <span style={{ color: '#64748b' }}>Episode Category: </span>
                    <strong style={{ color: '#0f172a' }}>{receiptData.invoice.category} ({receiptData.invoice.encounter_type})</strong>
                  </div>
                  <div style={{ marginBottom: '0.35rem' }}>
                    <span style={{ color: '#64748b' }}>Billing Counter: </span>
                    <span>{receiptData.invoice.counter}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Cashier: </span>
                    <span>{receiptData.invoice.cashier}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Table */}
              <div style={{ marginBottom: '1.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left', width: '35px' }}>#</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Item / Service Description</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', width: '100px' }}>Dept</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', width: '45px' }}>Qty</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', width: '80px' }}>Rate</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', width: '70px' }}>GST</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', width: '90px' }}>Net Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptData.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.5rem', color: '#64748b' }}>{item.sr}</td>
                        <td style={{ padding: '0.5rem', fontWeight: 600, color: '#1e293b' }}>{item.description}</td>
                        <td style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.75rem' }}>{item.department}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{item.qty}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatMoney(item.unit_price)}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', color: '#64748b' }}>{formatMoney(item.tax_amount)}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700 }}>{formatMoney(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals & Split Payments Summary */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 0.8fr',
                  gap: '1.5rem',
                  borderTop: '2px solid #0f172a',
                  paddingTop: '1rem',
                  marginBottom: '1.5rem'
                }}
              >
                {/* Payments Breakdown */}
                <div>
                  <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#475569', textTransform: 'uppercase' }}>
                    Payment & Settlement Breakdown
                  </h4>
                  {receiptData.payments.length === 0 ? (
                    <div style={{ fontSize: '0.8125rem', color: '#dc2626', fontStyle: 'italic' }}>
                      No payments collected yet (Status: {receiptData.invoice.status})
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {receiptData.payments.map((p, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            backgroundColor: '#f8fafc',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.75rem'
                          }}
                        >
                          <div>
                            <span className="badge badge-primary" style={{ fontSize: '0.625rem', marginRight: '0.35rem' }}>
                              {p.tender_mode}
                            </span>
                            <span style={{ color: '#475569' }}>
                              Ref: <strong>{p.transaction_reference || p.receipt_number}</strong>
                              {p.card_info ? ` (${p.card_info})` : ''}
                            </span>
                          </div>
                          <strong style={{ color: '#15803d' }}>{formatMoney(p.amount)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subtotals Block */}
                <div style={{ fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#64748b' }}>Gross Subtotal:</span>
                    <span>{formatMoney(receiptData.invoice.subtotal)}</span>
                  </div>

                  {receiptData.invoice.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', color: '#16a34a' }}>
                      <span>Discount:</span>
                      <span>-{formatMoney(receiptData.invoice.discount)}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#64748b' }}>Total GST / Taxes:</span>
                    <span>{formatMoney(receiptData.invoice.tax)}</span>
                  </div>

                  {receiptData.invoice.advance_deducted > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', color: '#2563eb' }}>
                      <span>Patient Deposit Deducted:</span>
                      <span>-{formatMoney(receiptData.invoice.advance_deducted)}</span>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #cbd5e1',
                      paddingTop: '0.5rem',
                      marginTop: '0.5rem',
                      fontWeight: 700,
                      fontSize: '0.9375rem',
                      color: '#0f172a'
                    }}
                  >
                    <span>Net Bill Amount:</span>
                    <span>{formatMoney(receiptData.invoice.total)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', color: '#15803d', fontWeight: 600 }}>
                    <span>Amount Paid:</span>
                    <span>{formatMoney(receiptData.invoice.paid)}</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '0.35rem',
                      color: receiptData.invoice.balance > 0 ? '#dc2626' : '#15803d',
                      fontWeight: 700
                    }}
                  >
                    <span>Balance Due:</span>
                    <span>{formatMoney(receiptData.invoice.balance)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Terms & Signatures */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginTop: '2rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px dashed #cbd5e1',
                  fontSize: '0.6875rem',
                  color: '#64748b'
                }}
              >
                <div>
                  <p style={{ margin: '0 0 0.2rem' }}>1. Computer-generated tax invoice. No signature required under rule 46 of CGST.</p>
                  <p style={{ margin: '0 0 0.2rem' }}>2. Please retain this receipt for clinical insurance / tax rebate submissions.</p>
                  <p style={{ margin: 0 }}>Printed at: {receiptData.printed_at}</p>
                </div>

                <div style={{ textAlign: 'center', width: '180px' }}>
                  <div style={{ borderBottom: '1px solid #94a3b8', paddingBottom: '0.25rem', marginBottom: '0.25rem', fontWeight: 600, color: '#334155' }}>
                    {receiptData.invoice.cashier}
                  </div>
                  <div>Authorized Cashier Signature</div>
                </div>
              </div>
            </div>
          )}

          {/* 80MM THERMAL SLIP FORMAT */}
          {!loading && receiptData && printFormat === 'THERMAL' && (
            <div
              id="printable-thermal-slip"
              style={{
                maxWidth: '380px',
                margin: '0 auto',
                fontSize: '11px',
                lineHeight: '1.3',
                textAlign: 'left'
              }}
            >
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '8px', marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{receiptData.hospital.name}</div>
                <div>{receiptData.hospital.address}</div>
                <div>Ph: {receiptData.hospital.phone}</div>
                <div>GSTIN: {receiptData.hospital.gstin}</div>
                <div style={{ marginTop: '4px', fontWeight: 'bold' }}>*** SETTLEMENT SLIP ***</div>
              </div>

              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px' }}>
                <div><strong>Token: {receiptData.invoice.token_slip_number}</strong></div>
                <div>Inv No : {receiptData.invoice.invoice_number}</div>
                <div>Date   : {receiptData.invoice.date}</div>
                <div>UHID   : {receiptData.patient.uhid}</div>
                <div>Patient: {receiptData.patient.name}</div>
                <div>Counter: {receiptData.invoice.counter}</div>
                <div>Cashier: {receiptData.invoice.cashier}</div>
              </div>

              {/* Items List */}
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '4px' }}>
                  <span>Item Description</span>
                  <span>Qty  Amount</span>
                </div>
                {receiptData.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.description}
                    </span>
                    <span>{item.qty}  {formatMoney(item.total)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>{formatMoney(receiptData.invoice.subtotal)}</span>
                </div>
                {receiptData.invoice.tax > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>GST Tax:</span>
                    <span>{formatMoney(receiptData.invoice.tax)}</span>
                  </div>
                )}
                {receiptData.invoice.advance_deducted > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Deposit Applied:</span>
                    <span>-{formatMoney(receiptData.invoice.advance_deducted)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', marginTop: '2px' }}>
                  <span>TOTAL BILL:</span>
                  <span>{formatMoney(receiptData.invoice.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>PAID:</span>
                  <span>{formatMoney(receiptData.invoice.paid)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>BALANCE DUE:</span>
                  <span>{formatMoney(receiptData.invoice.balance)}</span>
                </div>
              </div>

              {/* Payments */}
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>PAYMENTS RECORDED:</div>
                {receiptData.payments.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{p.tender_mode} ({p.transaction_reference || 'COUNTER'})</span>
                    <span>{formatMoney(p.amount)}</span>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <div>Thank You! Get Well Soon.</div>
                <div>{receiptData.printed_at}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
