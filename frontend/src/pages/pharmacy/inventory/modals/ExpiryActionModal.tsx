import React, { useState, useEffect } from 'react';
import {
  X,
  AlertOctagon,
  ShieldOff,
  RotateCcw,
  Flame,
  FileCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { BatchItem, pharmacyInventoryService } from '../../../../services/pharmacyInventoryService';

interface ExpiryActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActionCompleted: (batchId: string, actionType: string) => void;
  batch: BatchItem | null;
  medicineName?: string;
}

export const ExpiryActionModal: React.FC<ExpiryActionModalProps> = ({
  isOpen,
  onClose,
  onActionCompleted,
  batch,
  medicineName = 'Selected Medicine'
}) => {
  const [actionType, setActionType] = useState<'QUARANTINE' | 'RETURN_TO_VENDOR' | 'DESTROY'>('QUARANTINE');
  const [reason, setReason] = useState('Critical expiry window (< 30 days remaining)');
  const [quarantineBay, setQuarantineBay] = useState('Rack Q-01 · Bio-Safety Quarantine Lockbox');
  
  // Return to vendor fields
  const [debitNoteNumber, setDebitNoteNumber] = useState('');
  const [carrierTracking, setCarrierTracking] = useState('');

  // Destruction fields
  const [destructionCert, setDestructionCert] = useState('');
  const [witnessName, setWitnessName] = useState('Dr. Pooja Shah (Pharmacy Admin)');
  const [destructionMethod, setDestructionMethod] = useState('High-Temperature Incineration (CPCB Authorized)');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && batch) {
      setError('');
      setIsSubmitting(false);
      setActionType(batch.is_quarantined ? 'RETURN_TO_VENDOR' : 'QUARANTINE');
      setDebitNoteNumber(`DN-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      setDestructionCert(`BM-WASTE-2026-${Math.floor(100 + Math.random() * 900)}`);
    }
  }, [isOpen, batch]);

  if (!isOpen || !batch) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError('');

      if (actionType === 'QUARANTINE') {
        await pharmacyInventoryService.quarantineBatch(batch.id, `${reason} [Bay: ${quarantineBay}]`);
      } else if (actionType === 'RETURN_TO_VENDOR') {
        if (!debitNoteNumber.trim()) {
          setError('Debit note number is required for Vendor Return.');
          setIsSubmitting(false);
          return;
        }
        await pharmacyInventoryService.returnBatchToVendor(batch.id, {
          supplier_name: batch.supplier_name,
          debit_note: debitNoteNumber,
          quantity: batch.available_quantity,
          reason: reason
        });
      } else {
        if (!destructionCert.trim() || !witnessName.trim()) {
          setError('Certificate ID and Witness Pharmacist are legally required for Bio-Destruction.');
          setIsSubmitting(false);
          return;
        }
        await pharmacyInventoryService.destroyBatch(batch.id, {
          certificate_id: destructionCert,
          witness_name: witnessName,
          method: destructionMethod
        });
      }

      onActionCompleted(batch.id, actionType);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to execute regulatory action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '740px',
          maxWidth: '96vw',
          height: '82vh',
          maxHeight: '760px',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          animation: 'fadeInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Pinned Header */}
        <div
          style={{
            flexShrink: 0,
            padding: '18px 24px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626'
              }}
            >
              <AlertOctagon size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#111827' }}>
                Regulatory Expiry & Quarantine Disposition
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
                Execute physical containment, debit note supplier return, or certified bio-medical scrap.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              scrollbarWidth: 'thin'
            }}
          >
            {error && (
              <div
                style={{
                  marginBottom: '18px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Target Batch Info Strip */}
            <div
              style={{
                marginBottom: '20px',
                padding: '14px 18px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  {batch.medicine_name || medicineName}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                  Batch: <strong>{batch.batch_number}</strong> · Exp: <strong style={{ color: '#dc2626' }}>{batch.expiry_date}</strong> ({batch.months_left} mos remaining)
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#b91c1c' }}>
                  {batch.available_quantity} units
                </span>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Valuation: ₹{(batch.available_quantity * Number(batch.cost_price || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Action Type Selector */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                Select Disposition Protocol <span style={{ color: '#ef4444' }}>*</span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {/* Protocol 1: Quarantine */}
                <div
                  onClick={() => setActionType('QUARANTINE')}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: actionType === 'QUARANTINE' ? '2px solid #ea580c' : '1px solid #e5e7eb',
                    backgroundColor: actionType === 'QUARANTINE' ? '#fff7ed' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ea580c', marginBottom: '6px' }}>
                    <ShieldOff size={18} />
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>1. Quarantine</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#7c2d12', lineHeight: 1.4 }}>
                    Move to isolated lockbox. Prevent any OPD/IPD dispensing immediately.
                  </p>
                </div>

                {/* Protocol 2: Return to Vendor */}
                <div
                  onClick={() => setActionType('RETURN_TO_VENDOR')}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: actionType === 'RETURN_TO_VENDOR' ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    backgroundColor: actionType === 'RETURN_TO_VENDOR' ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', marginBottom: '6px' }}>
                    <RotateCcw size={18} />
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>2. Return to Vendor</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#1e40af', lineHeight: 1.4 }}>
                    Debit Note claim with supplier ({batch.supplier_name || 'Vendor'}) for buyback / credit.
                  </p>
                </div>

                {/* Protocol 3: Bio-Destruction */}
                <div
                  onClick={() => setActionType('DESTROY')}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: actionType === 'DESTROY' ? '2px solid #dc2626' : '1px solid #e5e7eb',
                    backgroundColor: actionType === 'DESTROY' ? '#fef2f2' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', marginBottom: '6px' }}>
                    <Flame size={18} />
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>3. Bio-Destruction</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#991b1b', lineHeight: 1.4 }}>
                    Certified hazardous scrap incineration with dual pharmacist witness log.
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Configuration per Protocol */}
            {actionType === 'QUARANTINE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Quarantine Storage Location
                  </label>
                  <input
                    type="text"
                    value={quarantineBay}
                    onChange={(e) => setQuarantineBay(e.target.value)}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Reason for Quarantine
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px'
                    }}
                  >
                    <option value="Critical expiry window (< 30 days remaining)">Critical expiry window (&lt; 30 days remaining)</option>
                    <option value="Packaging compromised or broken seal">Packaging compromised or broken seal</option>
                    <option value="Temperature excursion breach logged in cold chain">Temperature excursion breach logged in cold chain</option>
                    <option value="Manufacturer batch recall alert issued">Manufacturer batch recall alert issued</option>
                  </select>
                </div>
              </div>
            )}

            {actionType === 'RETURN_TO_VENDOR' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Vendor / Supplier Name
                    </label>
                    <input
                      type="text"
                      value={batch.supplier_name || 'Preferred Vendor'}
                      disabled
                      style={{
                        width: '100%',
                        height: '40px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '13px',
                        backgroundColor: '#f9fafb',
                        color: '#4b5563'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Debit Note Number <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={debitNoteNumber}
                      onChange={(e) => setDebitNoteNumber(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        height: '40px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        fontWeight: 600
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Courier Dispatch / Return Tracking Reference
                  </label>
                  <input
                    type="text"
                    value={carrierTracking}
                    onChange={(e) => setCarrierTracking(e.target.value)}
                    placeholder="e.g. DTDC-AWB-9912048 / Hospital Logistic Van 02"
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>
            )}

            {actionType === 'DESTROY' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Bio-Waste Certificate ID <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={destructionCert}
                      onChange={(e) => setDestructionCert(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        height: '40px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        fontWeight: 600
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Witness Pharmacist Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={witnessName}
                      onChange={(e) => setWitnessName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        height: '40px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Destruction & Disposal Technique
                  </label>
                  <select
                    value={destructionMethod}
                    onChange={(e) => setDestructionMethod(e.target.value)}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13px'
                    }}
                  >
                    <option value="High-Temperature Incineration (CPCB Authorized)">High-Temperature Incineration (CPCB Authorized)</option>
                    <option value="Chemical Neutralization & Encapsulation">Chemical Neutralization & Encapsulation</option>
                    <option value="High-Pressure Autoclaving followed by Shredding">High-Pressure Autoclaving followed by Shredding</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Pinned Footer */}
          <div
            style={{
              flexShrink: 0,
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              Batch will be updated and ledger adjusted.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#4b5563',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  height: '38px',
                  padding: '0 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: actionType === 'QUARANTINE' ? '#ea580c' : actionType === 'RETURN_TO_VENDOR' ? '#2563eb' : '#dc2626',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                <FileCheck size={16} />
                <span>
                  {isSubmitting
                    ? 'Executing Protocol...'
                    : actionType === 'QUARANTINE'
                    ? 'Confirm Quarantine Bay Lock'
                    : actionType === 'RETURN_TO_VENDOR'
                    ? 'Issue RTV Debit Note'
                    : 'Log Hazardous Bio-Destruction'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
