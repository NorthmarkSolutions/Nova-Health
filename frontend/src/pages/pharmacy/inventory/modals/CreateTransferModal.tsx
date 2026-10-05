import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRightLeft,
  Building,
  Package,
  Layers,
  Clock,
  AlertCircle,
  Zap,
  Check,
  ShieldAlert
} from 'lucide-react';
import {
  MedicineItem,
  BatchItem,
  DemandItem,
  pharmacyInventoryService
} from '../../../../services/pharmacyInventoryService';

interface CreateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferred: (transfer: any) => void;
  medicines: MedicineItem[];
  preselectedDemand?: DemandItem | null;
}

export const CreateTransferModal: React.FC<CreateTransferModalProps> = ({
  isOpen,
  onClose,
  onTransferred,
  medicines = [],
  preselectedDemand = null
}) => {
  const [sourceStore] = useState('Central Pharmacy Store');
  const [destination, setDestination] = useState<string>('OPD Counter 1');
  const [medicineId, setMedicineId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState<number>(10);
  const [priority, setPriority] = useState<'ROUTINE' | 'URGENT' | 'STAT'>('ROUTINE');
  const [dispatchedBy, setDispatchedBy] = useState('Rajesh Kumar (Inventory Manager)');
  const [receivedByStaff, setReceivedByStaff] = useState('Counter Dispenser On-Duty');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setIsSubmitting(false);

      if (preselectedDemand) {
        setMedicineId(preselectedDemand.medicine_id);
        setDestination(preselectedDemand.source);
        setTransferQuantity(preselectedDemand.requested_quantity || 10);
        setPriority(preselectedDemand.priority || 'URGENT');
        setNotes(`Fulfilling Demand Token #${preselectedDemand.token_number} for Dr. ${preselectedDemand.doctor_name}`);
      } else {
        const firstMed = medicines.length > 0 ? medicines[0] : null;
        if (firstMed) {
          setMedicineId(firstMed.id);
        }
        setDestination('OPD Counter 1');
        setTransferQuantity(20);
        setPriority('ROUTINE');
        setNotes('Routine stock replenishment for satellite counter');
      }
    }
  }, [isOpen, preselectedDemand, medicines]);

  const activeMed = medicines.find(m => m.id === medicineId);

  // Available batches sorted FEFO (Earliest expiry date first)
  const availableBatches: BatchItem[] = (activeMed?.batches || [])
    .filter(b => !b.is_quarantined && b.available_quantity > 0)
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

  // Auto-select FEFO batch when active medicine or batches change
  useEffect(() => {
    if (availableBatches.length > 0) {
      if (!selectedBatchId || !availableBatches.some(b => b.id === selectedBatchId)) {
        setSelectedBatchId(availableBatches[0].id);
      }
    } else {
      setSelectedBatchId('');
    }
  }, [medicineId, availableBatches.length]);

  if (!isOpen) return null;

  const selectedBatch = availableBatches.find(b => b.id === selectedBatchId) || availableBatches[0];
  const maxAvailable = selectedBatch ? selectedBatch.available_quantity : (activeMed ? activeMed.available_stock : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineId) {
      setError('Please select a medicine.');
      return;
    }
    if (transferQuantity <= 0) {
      setError('Transfer quantity must be greater than zero.');
      return;
    }
    if (transferQuantity > maxAvailable) {
      setError(`Cannot transfer ${transferQuantity} units. Only ${maxAvailable} available in chosen batch.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      let result;
      if (preselectedDemand) {
        result = await pharmacyInventoryService.fulfillDemandWithTransfer(preselectedDemand.id, {
          batch_id: selectedBatch?.id,
          quantity: transferQuantity,
          notes: notes
        });
      } else {
        result = await pharmacyInventoryService.createTransfer({
          medicine_id: medicineId,
          batch_id: selectedBatch?.id,
          quantity: transferQuantity,
          source: sourceStore,
          destination: destination,
          priority: priority,
          notes: notes
        });
      }

      onTransferred(result);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to dispatch transfer.');
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
                backgroundColor: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a'
              }}
            >
              <ArrowRightLeft size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#111827' }}>
                {preselectedDemand ? 'Fulfill Department Demand Transfer' : 'Dispatch Internal Stock Transfer'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
                Central Store $\rightarrow$ satellite pharmacy sub-store / OPD counter allocation with FEFO batch locking.
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
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {preselectedDemand && (
              <div
                style={{
                  marginBottom: '18px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>
                    Demand Token #{preselectedDemand.token_number} — {preselectedDemand.source}
                  </div>
                  <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>
                    Requested for <strong>{preselectedDemand.patient_name}</strong> by <strong>{preselectedDemand.doctor_name}</strong>
                  </div>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: preselectedDemand.priority === 'STAT' ? '#ef4444' : '#f59e0b',
                    color: '#ffffff'
                  }}
                >
                  {preselectedDemand.priority} PRIORITY
                </span>
              </div>
            )}

            {/* Source & Destination Routing */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Source Store
                </label>
                <input
                  type="text"
                  value={sourceStore}
                  disabled
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    backgroundColor: '#f9fafb',
                    color: '#4b5563',
                    fontWeight: 600
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Destination Location <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  disabled={Boolean(preselectedDemand)}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    color: '#111827',
                    backgroundColor: preselectedDemand ? '#f9fafb' : '#ffffff'
                  }}
                >
                  <option value="OPD Counter 1">OPD Counter 1 (Main Dispensary)</option>
                  <option value="OPD Counter 2">OPD Counter 2 (Fast Track)</option>
                  <option value="IPD Ward 4B">IPD Ward 4B (Inpatient Satellite)</option>
                  <option value="ICU Satellite">ICU Satellite Pharmacy (Critical Care)</option>
                  <option value="Trauma Emergency">Trauma & Emergency Dispensary</option>
                </select>
              </div>
            </div>

            {/* Medicine Picker */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Medicine SKU <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={medicineId}
                onChange={(e) => setMedicineId(e.target.value)}
                disabled={Boolean(preselectedDemand)}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  color: '#111827',
                  backgroundColor: preselectedDemand ? '#f9fafb' : '#ffffff'
                }}
              >
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.item_code}) — Central Stock: {m.available_stock} {m.unit_of_measure}
                  </option>
                ))}
              </select>
            </div>

            {/* FEFO Batch Picker */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  Fulfill from Batch (FEFO Sorted) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} /> FEFO Recommended: Earliest Expiry First
                </span>
              </div>

              {availableBatches.length === 0 ? (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    color: '#b45309',
                    fontSize: '13px'
                  }}
                >
                  No active batches with stock available in Central Store for this medicine.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {availableBatches.map((b, idx) => {
                    const isSelected = (selectedBatch?.id === b.id);
                    return (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBatchId(b.id)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #2563eb' : '1px solid #e5e7eb',
                          backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: isSelected ? '5px solid #2563eb' : '1px solid #d1d5db',
                              backgroundColor: '#ffffff'
                            }}
                          />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>
                              {b.batch_number} {idx === 0 && <span style={{ fontSize: '10px', backgroundColor: '#10b981', color: '#ffffff', padding: '1px 6px', borderRadius: '4px', marginLeft: '6px' }}>FEFO PRIORITY</span>}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                              Exp: <strong style={{ color: '#b91c1c' }}>{b.expiry_date}</strong> ({b.months_left} mos left) · Loc: {b.storage_location}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                            {b.available_quantity} units
                          </span>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            available in batch
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Grid 2: Quantity & Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Transfer Quantity (Units) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={maxAvailable}
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                  required
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    fontWeight: 700
                  }}
                />
                <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                  Max transferable from selected batch: <strong>{maxAvailable}</strong>
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Priority Level
                </label>
                <div style={{ display: 'flex', gap: '8px', height: '40px' }}>
                  {(['ROUTINE', 'URGENT', 'STAT'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      style={{
                        flex: 1,
                        borderRadius: '8px',
                        border: priority === p ? 'none' : '1px solid #d1d5db',
                        backgroundColor: priority === p ? (p === 'STAT' ? '#ef4444' : p === 'URGENT' ? '#f59e0b' : '#2563eb') : '#ffffff',
                        color: priority === p ? '#ffffff' : '#4b5563',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Handover & Notes */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Transfer Indent / Dispensing Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Indicate purpose, indent token, or clinical reason..."
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
              Dispatched By: <strong>{dispatchedBy}</strong>
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
                disabled={isSubmitting || availableBatches.length === 0}
                style={{
                  height: '38px',
                  padding: '0 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isSubmitting ? '#93c5fd' : '#16a34a',
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
                <ArrowRightLeft size={16} />
                <span>{isSubmitting ? 'Dispatching Transfer...' : 'Confirm Stock Dispatch'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
