import React, { useState, useEffect } from 'react';
import {
  X,
  ClipboardCheck,
  Package,
  Layers,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ShieldAlert,
  Calculator
} from 'lucide-react';
import {
  MedicineItem,
  BatchItem,
  ReconciliationItem,
  pharmacyInventoryService
} from '../../../../services/pharmacyInventoryService';

interface StockReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: (item: ReconciliationItem) => void;
  medicines: MedicineItem[];
  preselectedMedicine?: MedicineItem | null;
}

export const StockReconciliationModal: React.FC<StockReconciliationModalProps> = ({
  isOpen,
  onClose,
  onSubmitted,
  medicines = [],
  preselectedMedicine = null
}) => {
  const [medicineId, setMedicineId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [physicalCount, setPhysicalCount] = useState<number>(0);
  const [reasonCode, setReasonCode] = useState<
    'COUNT_VERIFIED' | 'DAMAGED_CARTON' | 'PILFERAGE' | 'DATA_MISMATCH' | 'EXPIRED_SCRAP'
  >('COUNT_VERIFIED');
  const [notes, setNotes] = useState('');
  const [auditorName] = useState('Rajesh Kumar (Inventory Manager)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setIsSubmitting(false);
      const chosenMed = preselectedMedicine || (medicines.length > 0 ? medicines[0] : null);
      if (chosenMed) {
        setMedicineId(chosenMed.id);
        if (chosenMed.batches && chosenMed.batches.length > 0) {
          setBatchId(chosenMed.batches[0].id);
          setPhysicalCount(chosenMed.batches[0].available_quantity);
        } else {
          setBatchId('');
          setPhysicalCount(chosenMed.available_stock);
        }
      }
      setReasonCode('COUNT_VERIFIED');
      setNotes('');
    }
  }, [isOpen, preselectedMedicine, medicines]);

  const activeMed = medicines.find(m => m.id === medicineId);
  const batches = activeMed?.batches || [];

  // When medicine changes, update selected batch
  const handleMedicineChange = (newMedId: string) => {
    setMedicineId(newMedId);
    const med = medicines.find(m => m.id === newMedId);
    if (med && med.batches && med.batches.length > 0) {
      setBatchId(med.batches[0].id);
      setPhysicalCount(med.batches[0].available_quantity);
    } else {
      setBatchId('');
      setPhysicalCount(med ? med.available_stock : 0);
    }
  };

  const selectedBatch = batches.find(b => b.id === batchId) || (batches.length > 0 ? batches[0] : null);
  const systemBalance = selectedBatch ? selectedBatch.available_quantity : (activeMed ? activeMed.available_stock : 0);
  const unitCost = Number(selectedBatch?.cost_price || activeMed?.cost_price || 0);

  const varianceUnits = physicalCount - systemBalance;
  const variancePercentage = systemBalance > 0 ? ((varianceUnits / systemBalance) * 100) : 0;
  const varianceValue = varianceUnits * unitCost;

  // Threshold rules: > ₹1,000 variance or Narcotic/Schedule X requires Admin Approval
  const isHighValueOrNarcotic =
    Math.abs(varianceValue) > 1000 ||
    Boolean(activeMed?.is_narcotic) ||
    activeMed?.schedule === 'X' ||
    activeMed?.schedule === 'H1';

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineId) {
      setError('Please select a medicine.');
      return;
    }
    if (physicalCount < 0) {
      setError('Physical count cannot be negative.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const result = await pharmacyInventoryService.submitReconciliationCount({
        medicine_id: medicineId,
        batch_id: selectedBatch?.id || 'GLOBAL',
        physical_count: physicalCount,
        reason_code: reasonCode,
        notes: notes
      });

      onSubmitted(result);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to submit reconciliation count.');
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
          width: '760px',
          maxWidth: '96vw',
          height: '84vh',
          maxHeight: '780px',
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
                backgroundColor: '#f5f3ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7c3aed'
              }}
            >
              <ClipboardCheck size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#111827' }}>
                Physical Stock Reconciliation (Cycle Count Audit)
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
                Verify physical shelf stock against system ledger. Auto-routes variances &gt; ₹1,000 for Admin approval.
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

        {/* Scrollable Form Body */}
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

            {/* Medicine & Batch Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Audited Medicine SKU <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={medicineId}
                  onChange={(e) => handleMedicineChange(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    color: '#111827'
                  }}
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.item_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Specific Batch / Lot
                </label>
                <select
                  value={batchId}
                  onChange={(e) => {
                    setBatchId(e.target.value);
                    const b = batches.find(item => item.id === e.target.value);
                    if (b) setPhysicalCount(b.available_quantity);
                  }}
                  disabled={batches.length === 0}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    color: '#111827',
                    backgroundColor: batches.length === 0 ? '#f9fafb' : '#ffffff'
                  }}
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_number} (Exp: {b.expiry_date}) — {b.available_quantity} units
                    </option>
                  ))}
                  {batches.length === 0 && <option value="">Aggregate Medicine Stock</option>}
                </select>
              </div>
            </div>

            {/* Counts Comparison Box */}
            <div
              style={{
                marginBottom: '20px',
                padding: '18px',
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                alignItems: 'center'
              }}
            >
              {/* Card 1: System Balance */}
              <div style={{ textAlign: 'center', padding: '12px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  System Balance
                </span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                  {systemBalance}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  Units logged in ERP
                </div>
              </div>

              {/* Card 2: Physical Count Input */}
              <div style={{ textAlign: 'center', padding: '12px', borderRadius: '8px', backgroundColor: '#ffffff', border: '2px solid #7c3aed' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Physical Shelf Count
                </span>
                <input
                  type="number"
                  min="0"
                  value={physicalCount}
                  onChange={(e) => setPhysicalCount(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{
                    width: '100px',
                    height: '38px',
                    textAlign: 'center',
                    fontSize: '22px',
                    fontWeight: 800,
                    color: '#7c3aed',
                    border: '1px solid #c4b5fd',
                    borderRadius: '6px',
                    margin: '4px auto 0',
                    display: 'block'
                  }}
                />
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Units counted on shelf
                </div>
              </div>

              {/* Card 3: Live Variance Calculation */}
              <div
                style={{
                  textAlign: 'center',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: varianceUnits === 0 ? '#f0fdf4' : varianceUnits > 0 ? '#eff6ff' : '#fef2f2',
                  border: `1px solid ${varianceUnits === 0 ? '#bbf7d0' : varianceUnits > 0 ? '#bfdbfe' : '#fecaca'}`
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: varianceUnits === 0 ? '#15803d' : varianceUnits > 0 ? '#1d4ed8' : '#b91c1c'
                  }}
                >
                  Live Variance
                </span>
                <div
                  style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    color: varianceUnits === 0 ? '#15803d' : varianceUnits > 0 ? '#1d4ed8' : '#b91c1c',
                    marginTop: '4px'
                  }}
                >
                  {varianceUnits > 0 ? `+${varianceUnits}` : varianceUnits} units
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: varianceUnits === 0 ? '#16a34a' : '#b91c1c', marginTop: '2px' }}>
                  {variancePercentage.toFixed(1)}% (₹{Math.abs(varianceValue).toLocaleString('en-IN', { maximumFractionDigits: 2 })})
                </div>
              </div>
            </div>

            {/* Threshold & Governance Rule Banner */}
            {isHighValueOrNarcotic ? (
              <div
                style={{
                  marginBottom: '18px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <ShieldAlert size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>
                    Governance Gate: Admin Authorization Required
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#b45309', lineHeight: 1.4 }}>
                    Variance value (₹{Math.abs(varianceValue).toFixed(2)}) exceeds ₹1,000 threshold, or drug is classified as controlled/narcotic ({activeMed?.schedule}). This count will be recorded with status <strong style={{ color: '#b45309' }}>PENDING_ADMIN_APPROVAL</strong> and routed to Pharmacy Admin (Dr. Pooja Shah) and Hospital Admin before stock balances update.
                  </p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginBottom: '18px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <CheckCircle size={18} color="#16a34a" />
                <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                  Variance is within standard tolerance (≤ ₹1,000). Stock ledger will be adjusted immediately upon submission.
                </span>
              </div>
            )}

            {/* Reason Code */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Discrepancy Reason Code <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value as any)}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  color: '#111827'
                }}
              >
                <option value="COUNT_VERIFIED">COUNT_VERIFIED — Routine audit verified with shelf balance</option>
                <option value="DAMAGED_CARTON">DAMAGED_CARTON — Broken vial, leaking bottle, or crushed packaging</option>
                <option value="PILFERAGE">PILFERAGE — Unaccounted missing inventory / suspected shortage</option>
                <option value="DATA_MISMATCH">DATA_MISMATCH — Dispense transaction unlogged or returns unrecorded</option>
                <option value="EXPIRED_SCRAP">EXPIRED_SCRAP — Physical units found past expiry date during count</option>
              </select>
            </div>

            {/* Auditor Notes */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Cycle Count Investigation / Auditor Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Document rack condition, damaged serials, or reconciliation comments..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  resize: 'none'
                }}
              />
            </div>
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
              Auditor: <strong>{auditorName}</strong>
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
                  backgroundColor: isSubmitting ? '#a78bfa' : '#7c3aed',
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
                <ClipboardCheck size={16} />
                <span>{isSubmitting ? 'Submitting Count...' : 'Submit Physical Count'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
