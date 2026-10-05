import React, { useState, useEffect } from 'react';
import {
  X,
  Pill,
  Award,
  Layers,
  ShieldCheck,
  MapPin,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Info
} from 'lucide-react';
import { MedicineItem, SupplierItem } from '../../../../services/pharmacyInventoryService';

interface AddEditMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (medicine: MedicineItem) => void;
  editingMedicine?: MedicineItem | null;
  suppliers: SupplierItem[];
}

export const AddEditMedicineModal: React.FC<AddEditMedicineModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  editingMedicine = null,
  suppliers = []
}) => {
  const [tab, setTab] = useState<'clinical' | 'regulatory' | 'stocking'>('clinical');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Tab 1: Clinical Identity
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [category, setCategory] = useState('TABLET');
  const [strength, setStrength] = useState('');
  const [therapeuticClass, setTherapeuticClass] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('TABLET');

  // Tab 2: Regulatory & Schedule
  const [schedule, setSchedule] = useState('H');
  const [isNarcotic, setIsNarcotic] = useState(false);
  const [isColdChain, setIsColdChain] = useState(false);
  const [isHighRisk, setIsHighRisk] = useState(false);
  const [isCoreFormulary, setIsCoreFormulary] = useState(true);

  // Tab 3: Stocking Parameters
  const [reorderLevel, setReorderLevel] = useState<number>(50);
  const [reorderQuantity, setReorderQuantity] = useState<number>(200);
  const [storageRack, setStorageRack] = useState('Rack A-01 · Ambient Shelf');
  const [preferredSupplier, setPreferredSupplier] = useState('');

  useEffect(() => {
    if (editingMedicine) {
      setName(editingMedicine.name || '');
      setGenericName(editingMedicine.generic_name || '');
      setItemCode(editingMedicine.item_code || '');
      setCategory(editingMedicine.category || 'TABLET');
      setStrength(editingMedicine.strength || '');
      setTherapeuticClass(editingMedicine.therapeutic_class || '');
      setUnitOfMeasure(editingMedicine.unit_of_measure || 'TABLET');
      setSchedule(editingMedicine.schedule || 'H');
      setIsNarcotic(Boolean(editingMedicine.is_narcotic));
      setIsColdChain(Boolean(editingMedicine.is_cold_chain));
      setIsHighRisk(Boolean(editingMedicine.is_high_risk));
      setIsCoreFormulary(editingMedicine.is_core_formulary !== false);
      setReorderLevel(editingMedicine.reorder_level || 50);
      setReorderQuantity(editingMedicine.reorder_quantity || 200);
      setStorageRack(editingMedicine.storage_rack || 'Rack A-01 · Ambient Shelf');
      setPreferredSupplier(editingMedicine.supplier_name || (suppliers[0]?.name || ''));
    } else {
      setName('');
      setGenericName('');
      setItemCode(`MED-${Date.now().toString().slice(-6)}`);
      setCategory('TABLET');
      setStrength('');
      setTherapeuticClass('');
      setUnitOfMeasure('TABLET');
      setSchedule('H');
      setIsNarcotic(false);
      setIsColdChain(false);
      setIsHighRisk(false);
      setIsCoreFormulary(true);
      setReorderLevel(50);
      setReorderQuantity(200);
      setStorageRack('Rack A-01 · Ambient Shelf');
      setPreferredSupplier(suppliers[0]?.name || 'Apex Pharma');
    }
    setTab('clinical');
    setError('');
  }, [editingMedicine, isOpen, suppliers]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Brand / Medicine Name is required');
      setTab('clinical');
      return;
    }
    if (!itemCode.trim()) {
      setError('Item Code / Formulary SKU is required');
      setTab('clinical');
      return;
    }

    setIsSubmitting(true);
    const updated: MedicineItem = {
      id: editingMedicine?.id || `med-${Date.now()}`,
      name: name.trim(),
      item_code: itemCode.trim(),
      generic_name: genericName.trim() || null,
      category,
      schedule,
      therapeutic_class: therapeuticClass.trim() || null,
      strength: strength.trim() || null,
      unit_of_measure: unitOfMeasure,
      unit_price: editingMedicine?.unit_price || 12.50,
      cost_price: editingMedicine?.cost_price || 8.00,
      reorder_level: Number(reorderLevel) || 50,
      reorder_quantity: Number(reorderQuantity) || 200,
      is_narcotic: isNarcotic || schedule === 'X',
      is_cold_chain: isColdChain,
      is_high_risk: isHighRisk,
      is_core_formulary: isCoreFormulary,
      is_archived: false,
      storage_rack: storageRack,
      available_stock: editingMedicine?.available_stock || 0,
      supplier_name: preferredSupplier || 'Apex Pharma Distributors',
      active_pr: editingMedicine?.active_pr || null,
      batches: editingMedicine?.batches || []
    };

    onSaved(updated);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          width: '840px',
          maxWidth: '95vw',
          height: '86vh',
          maxHeight: '800px',
          minHeight: '600px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Fixed Header */}
        <div
          style={{
            flexShrink: 0,
            padding: '18px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Pill size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                {editingMedicine ? `Edit Medicine: ${editingMedicine.name}` : 'Add Medicine to Formulary Master'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>
                Inventory Manager manages clinical descriptions, schedule classification, formulary status, and reorder levels.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Container */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          {/* Pinned Subheader with Tabs & Error */}
          <div
            style={{
              flexShrink: 0,
              padding: '16px 24px 0',
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #e5e7eb'
            }}
          >
            {error && (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '4px', marginBottom: '-1px' }}>
              {[
                { id: 'clinical', label: '1. Clinical Identity', icon: Pill },
                { id: 'regulatory', label: '2. Regulatory & Schedule', icon: ShieldCheck },
                { id: 'stocking', label: '3. Stocking & Location', icon: MapPin }
              ].map(t => {
                const Icon = t.icon;
                const isActive = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id as any)}
                    style={{
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: isActive ? '#2563eb' : '#6b7280',
                      borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                      background: 'none',
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Icon size={16} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Form Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 24px',
              minHeight: 0,
              scrollbarWidth: 'thin'
            }}
          >
            {/* TAB 1: Clinical Identity */}
            {tab === 'clinical' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Brand / Commercial Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Paracetamol 500mg or Augmentin 625"
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Generic INN Name
                    </label>
                    <input
                      type="text"
                      value={genericName}
                      onChange={e => setGenericName(e.target.value)}
                      placeholder="e.g. Paracetamol / Acetaminophen"
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Formulary SKU / Item Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={itemCode}
                      onChange={e => setItemCode(e.target.value)}
                      placeholder="e.g. MED-PAR-500"
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'monospace' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Dosage Form / Category
                    </label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none' }}
                    >
                      <option value="TABLET">Tablet</option>
                      <option value="CAPSULE">Capsule</option>
                      <option value="SYRUP">Syrup / Suspension</option>
                      <option value="INJECTION">Injection / Vial</option>
                      <option value="IV_FLUID">IV Fluid</option>
                      <option value="OINTMENT">Ointment / Gel</option>
                      <option value="INHALER">Inhaler / Respule</option>
                      <option value="DROPS">Drops (Eye/Ear)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Strength
                    </label>
                    <input
                      type="text"
                      value={strength}
                      onChange={e => setStrength(e.target.value)}
                      placeholder="e.g. 500 mg, 10 mg/ml"
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Therapeutic Class
                    </label>
                    <input
                      type="text"
                      value={therapeuticClass}
                      onChange={e => setTherapeuticClass(e.target.value)}
                      placeholder="e.g. Analgesic / Antipyretic, Antibacterial"
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Unit of Measure (UOM)
                    </label>
                    <select
                      value={unitOfMeasure}
                      onChange={e => setUnitOfMeasure(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none' }}
                    >
                      <option value="TABLET">Tablets (Nos)</option>
                      <option value="CAPSULE">Capsules (Nos)</option>
                      <option value="VIAL">Vial / Ampoule</option>
                      <option value="BOTTLE">Bottle</option>
                      <option value="STRIP">Strip</option>
                      <option value="BOX">Box</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Regulatory & Schedule */}
            {tab === 'regulatory' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Statutory Schedule Classification
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                    {[
                      { key: 'OTC', label: 'OTC (Over The Counter)', desc: 'No prescription mandatory' },
                      { key: 'H', label: 'Schedule H', desc: 'Prescription drug required' },
                      { key: 'H1', label: 'Schedule H1', desc: 'Restricted antibiotic / sedative' },
                      { key: 'X', label: 'Schedule X', desc: 'NDPS Narcotic / Dual Key Vault' }
                    ].map(s => {
                      const isSel = schedule === s.key;
                      return (
                        <div
                          key={s.key}
                          onClick={() => {
                            setSchedule(s.key);
                            if (s.key === 'X') setIsNarcotic(true);
                          }}
                          style={{
                            padding: '12px',
                            borderRadius: '10px',
                            border: `1px solid ${isSel ? '#2563eb' : '#e5e7eb'}`,
                            background: isSel ? '#eff6ff' : '#f9fafb',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ fontSize: '14px', fontWeight: 700, color: isSel ? '#2563eb' : '#111827' }}>
                            {s.key}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                            {s.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                    Clinical Safety & Handling Flags
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isColdChain}
                      onChange={e => setIsColdChain(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                    />
                    <span><strong>Cold Chain Storage Required (2°C – 8°C)</strong> · Keep in walk-in cold room</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isHighRisk}
                      onChange={e => setIsHighRisk(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                    />
                    <span><strong>High-Alert / LASA Drug</strong> · Double-check verify during dispensing</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isCoreFormulary}
                      onChange={e => setIsCoreFormulary(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                    />
                    <span><strong>Core Hospital Formulary</strong> · Always keep stocked; prioritized in doctor order sets</span>
                  </label>
                </div>
              </div>
            )}

            {/* TAB 3: Stocking Parameters */}
            {tab === 'stocking' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Minimum Reorder Level (Par) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={reorderLevel}
                      onChange={e => setReorderLevel(Number(e.target.value))}
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                    <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', display: 'block' }}>
                      Alert is triggered when store stock falls below this quantity.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Auto-Reorder Batch Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={reorderQuantity}
                      onChange={e => setReorderQuantity(Number(e.target.value))}
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                    <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', display: 'block' }}>
                      Default suggested quantity when raising automated Purchase Requests.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Preferred Supplier
                    </label>
                    <select
                      value={preferredSupplier}
                      onChange={e => setPreferredSupplier(e.target.value)}
                      style={{ width: '100%', height: '38px', padding: '0 10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none' }}
                    >
                      {suppliers.length > 0 ? (
                        suppliers.map(s => (
                          <option key={s.id} value={s.name}>
                            {s.name} ({s.lead_time_days}d lead · {s.on_time_delivery_rate}% on-time)
                          </option>
                        ))
                      ) : (
                        <option value="Apex Pharma">Apex Pharma (3d lead)</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Physical Storage Rack / Bin
                    </label>
                    <input
                      type="text"
                      value={storageRack}
                      onChange={e => setStorageRack(e.target.value)}
                      placeholder="e.g. Rack A-02 · Shelf 3"
                      style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Pricing Separation Notice */}
                <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Info size={18} color="#1d4ed8" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '12px', color: '#1e40af', lineHeight: 1.5 }}>
                    <strong>Pricing & Tariff Governance:</strong> Patient selling rates, insurance tariff packages, and line item discounts are governed exclusively by the <strong>Hospital Administrator & Finance Department</strong> in Billing Master Setup. Inventory Managers control clinical stock levels and procurement parameters.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <div
            style={{
              flexShrink: 0,
              padding: '14px 24px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)'
            }}
          >
            <div>
              {tab !== 'clinical' && (
                <button
                  type="button"
                  onClick={() => {
                    if (tab === 'stocking') setTab('regulatory');
                    else setTab('clinical');
                  }}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#374151',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  color: '#4b5563',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              {tab !== 'stocking' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (tab === 'clinical') setTab('regulatory');
                    else setTab('stocking');
                  }}
                  style={{
                    height: '38px',
                    padding: '0 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  Next Tab <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    height: '38px',
                    padding: '0 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isSubmitting ? '#93c5fd' : '#16a34a',
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
                  <Check size={16} />
                  <span>{isSubmitting ? 'Saving...' : 'Save Medicine to Master'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
