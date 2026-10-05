import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  Package,
  Calendar,
  Layers,
  MapPin,
  Truck,
  CheckCircle2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { MedicineItem, SupplierItem, BatchItem, pharmacyInventoryService } from '../../../../services/pharmacyInventoryService';

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (batch: BatchItem) => void;
  medicines: MedicineItem[];
  suppliers: SupplierItem[];
  selectedMedicine?: MedicineItem | null;
}

export const CreateBatchModal: React.FC<CreateBatchModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  medicines = [],
  suppliers = [],
  selectedMedicine = null
}) => {
  const [medicineId, setMedicineId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [initialQuantity, setInitialQuantity] = useState<number>(100);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [storageLocation, setStorageLocation] = useState('Rack A-01 · Ambient Shelf');
  const [supplierName, setSupplierName] = useState('');
  const [grnReference, setGrnReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // QC Checks
  const [qcSealIntact, setQcSealIntact] = useState(true);
  const [qcTempVerified, setQcTempVerified] = useState(true);
  const [qcCoaAttached, setQcCoaAttached] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setIsSubmitting(false);
      const chosenMed = selectedMedicine || (medicines.length > 0 ? medicines[0] : null);
      if (chosenMed) {
        setMedicineId(chosenMed.id);
        setCostPrice(Number(chosenMed.cost_price || 0));
        setStorageLocation(chosenMed.storage_rack || (chosenMed.is_cold_chain ? 'Cold Chain Refrigerator 01' : 'Rack A-01 · Ambient Shelf'));
      }
      // Generate default batch suggestion
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      setBatchNumber(`BTC-2026-${randomCode}`);
      setGrnReference(`GRN-2026-0${Math.floor(100 + Math.random() * 900)}`);
      
      // Default dates
      const now = new Date();
      setManufacturingDate(now.toISOString().split('T')[0]);
      const nextYear = new Date();
      nextYear.setFullYear(now.getFullYear() + 2);
      setExpiryDate(nextYear.toISOString().split('T')[0]);

      if (suppliers.length > 0) {
        setSupplierName(suppliers[0].name);
      }
    }
  }, [isOpen, selectedMedicine, medicines, suppliers]);

  if (!isOpen) return null;

  const activeMed = medicines.find(m => m.id === medicineId) || selectedMedicine;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineId) {
      setError('Please select a valid medicine.');
      return;
    }
    if (!batchNumber.trim()) {
      setError('Batch number is required.');
      return;
    }
    if (!expiryDate) {
      setError('Expiry date is required.');
      return;
    }
    if (initialQuantity <= 0) {
      setError('Initial received quantity must be greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const newBatch = await pharmacyInventoryService.createBatch(medicineId, {
        batch_number: batchNumber.trim().toUpperCase(),
        expiry_date: expiryDate,
        initial_quantity: initialQuantity,
        available_quantity: initialQuantity,
        cost_price: Number(costPrice),
        supplier_name: supplierName || 'Direct Vendor Intake',
        storage_location: storageLocation,
        grn_reference: grnReference
      });

      onCreated(newBatch);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to create and log batch.');
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
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}
            >
              <Package size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#111827' }}>
                Receive & Log New Batch (GRN Intake)
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
                Log incoming physical lot with FEFO expiry queueing, storage rack allocation, and QC verification.
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

            {/* Medicine Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '6px'
                }}
              >
                Target Medicine <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={medicineId}
                onChange={(e) => {
                  setMedicineId(e.target.value);
                  const m = medicines.find(med => med.id === e.target.value);
                  if (m) {
                    setCostPrice(Number(m.cost_price || 0));
                    setStorageLocation(m.storage_rack || (m.is_cold_chain ? 'Cold Chain Refrigerator 01' : 'Rack A-01 · Ambient Shelf'));
                  }
                }}
                disabled={Boolean(selectedMedicine)}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  color: '#111827',
                  backgroundColor: selectedMedicine ? '#f9fafb' : '#ffffff'
                }}
              >
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.item_code}) — In Stock: {m.available_stock} {m.unit_of_measure}
                  </option>
                ))}
              </select>

              {activeMed && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '12px',
                    color: '#64748b'
                  }}
                >
                  <span><strong>Schedule:</strong> {activeMed.schedule}</span>
                  <span>•</span>
                  <span><strong>Category:</strong> {activeMed.category}</span>
                  <span>•</span>
                  <span>
                    <strong>Cold Chain:</strong>{' '}
                    <span style={{ color: activeMed.is_cold_chain ? '#0284c7' : '#64748b', fontWeight: 600 }}>
                      {activeMed.is_cold_chain ? 'Yes (2°C - 8°C Required)' : 'No (Ambient)'}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Grid 1: Batch Identification */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Batch Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. BTC-2026-9812"
                  required
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  GRN / Invoice Reference
                </label>
                <input
                  type="text"
                  value={grnReference}
                  onChange={(e) => setGrnReference(e.target.value)}
                  placeholder="e.g. GRN-2026-0819 / INV-9912"
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

            {/* Grid 2: Dates (Mfg & Expiry) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Manufacturing Date
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    value={manufacturingDate}
                    onChange={(e) => setManufacturingDate(e.target.value)}
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
                  Expiry Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    color: '#dc2626',
                    fontWeight: 600
                  }}
                />
              </div>
            </div>

            {/* Grid 3: Quantities & Costing */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Initial Received Quantity <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={initialQuantity}
                  onChange={(e) => setInitialQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                  required
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    fontWeight: 700
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Unit Cost Price (₹ / Unit)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Math.max(0, parseFloat(e.target.value) || 0))}
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

            {/* Grid 4: Storage Rack & Supplier */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '22px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Storage Bay / Rack Location
                </label>
                <input
                  type="text"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  placeholder="e.g. Rack B-04 · Tier 2"
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
                  Supplier / Vendor Source
                </label>
                <select
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px'
                  }}
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.supplier_code})
                    </option>
                  ))}
                  <option value="Direct Hospital Depot">Direct Hospital Depot</option>
                  <option value="Emergency Local Procurement">Emergency Local Procurement</option>
                </select>
              </div>
            </div>

            {/* Quality & Physical Intake Verification */}
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                marginBottom: '10px'
              }}
            >
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} color="#059669" />
                Physical Intake & Good Distribution QC Checklist
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={qcSealIntact}
                    onChange={(e) => setQcSealIntact(e.target.checked)}
                    style={{ accentColor: '#2563eb' }}
                  />
                  <span>Manufacturer Seal Intact</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={qcTempVerified}
                    onChange={(e) => setQcTempVerified(e.target.checked)}
                    style={{ accentColor: '#2563eb' }}
                  />
                  <span>Transit Temp Logged</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={qcCoaAttached}
                    onChange={(e) => setQcCoaAttached(e.target.checked)}
                    style={{ accentColor: '#2563eb' }}
                  />
                  <span>COA / Invoice Verified</span>
                </label>
              </div>
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
              Valuation: <strong>₹{(initialQuantity * costPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
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
                  backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb',
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
                <PlusCircle size={16} />
                <span>{isSubmitting ? 'Receiving Batch...' : 'Confirm & Log Batch'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
