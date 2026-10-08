import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileText,
  User,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Trash2,
  CreditCard
} from 'lucide-react';
import {
  billingService,
  UnbilledChargeItem,
  BillingInvoice
} from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';

interface Props {
  onConsolidateBill?: (patientId: string, chargeIds: string[], department: string) => void;
  onOpenPayment?: (invoice: BillingInvoice) => void;
  onShowToast?: (msg: string) => void;
}

export const InvoiceQueueTab: React.FC<Props> = ({
  onConsolidateBill,
  onOpenPayment,
  onShowToast
}) => {
  const { format: formatMoney } = useCurrency();

  const [charges, setCharges] = useState<UnbilledChargeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);
  const [consolidating, setConsolidating] = useState<boolean>(false);

  // Load unbilled charges queue from Billing Backend
  const loadCharges = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const params: any = {};
      if (selectedDept !== 'ALL') params.department = selectedDept;
      if (selectedUrgency !== 'ALL') params.urgency = selectedUrgency;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const data = await billingService.getUnbilledChargesQueue(params);
      setCharges(data || []);
    } catch (err) {
      console.error('Failed to load unbilled charges queue', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDept, selectedUrgency, searchQuery]);

  useEffect(() => {
    loadCharges();
    const timer = setInterval(() => loadCharges(true), 12000);
    return () => clearInterval(timer);
  }, [loadCharges]);

  // Group charges by patient for structured multi-charge consolidation
  const patientGroups = useMemo(() => {
    const groups: Record<string, { patient_name: string; uhid: string; items: UnbilledChargeItem[]; total_sum: number }> = {};
    for (const c of charges) {
      const key = c.uhid || c.patient_id || 'UNKNOWN';
      if (!groups[key]) {
        groups[key] = {
          patient_name: c.patient_name,
          uhid: c.uhid,
          items: [],
          total_sum: 0
        };
      }
      groups[key].items.push(c);
      groups[key].total_sum += c.total_amount;
    }
    return groups;
  }, [charges]);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedChargeIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllPatientItems = (patientUhid: string) => {
    const group = patientGroups[patientUhid];
    if (!group) return;
    const groupIds = group.items.map((i) => i.id);
    const allSelected = groupIds.every((id) => selectedChargeIds.includes(id));

    if (allSelected) {
      setSelectedChargeIds((prev) => prev.filter((id) => !groupIds.includes(id)));
    } else {
      setSelectedChargeIds((prev) => Array.from(new Set([...prev, ...groupIds])));
    }
  };

  // Consolidate selected charges to an official Invoice
  const handleConsolidateSelected = async (targetPatientUhid?: string) => {
    let idsToConsolidate = selectedChargeIds;
    let targetPatientId: string | null = null;
    let targetDept = 'OPD';

    if (targetPatientUhid) {
      const group = patientGroups[targetPatientUhid];
      if (!group || group.items.length === 0) return;
      idsToConsolidate = group.items.map((i) => i.id);
      targetPatientId = group.items[0].patient_id;
      targetDept = group.items[0].department;
    } else {
      if (selectedChargeIds.length === 0) return;
      const firstCharge = charges.find((c) => selectedChargeIds.includes(c.id));
      if (firstCharge) {
        targetPatientId = firstCharge.patient_id;
        targetDept = firstCharge.department;
      }
    }

    if (!targetPatientId) {
      onShowToast?.('Could not identify patient for consolidation.');
      return;
    }

    try {
      setConsolidating(true);
      const invoice = await billingService.createInvoice({
        patient: targetPatientId,
        patientId: targetPatientId,
        charge_ids: idsToConsolidate,
        category: targetDept
      });

      onShowToast?.(`✓ Consolidated ${idsToConsolidate.length} charges into ${invoice.invoice_number}`);
      setSelectedChargeIds([]);
      loadCharges(true);

      if (onOpenPayment) {
        onOpenPayment(invoice);
      }
    } catch (err: any) {
      console.error('Consolidation failed', err);
      onShowToast?.(`Error: ${err?.response?.data?.error || err.message || 'Consolidation failed'}`);
    } finally {
      setConsolidating(false);
    }
  };

  // Cancel charge item if clinical order was aborted
  const handleCancelCharge = async (charge: UnbilledChargeItem) => {
    if (!window.confirm(`Cancel charge "${charge.service_name}" for ${charge.patient_name}?`)) return;

    try {
      await billingService.cancelChargeEvent({
        source_reference_id: charge.source_reference_id || charge.id,
        department: charge.department,
        reason: 'Cancelled by cashier at billing desk'
      });
      onShowToast?.(`✓ Charge cancelled successfully`);
      loadCharges(true);
    } catch (err: any) {
      onShowToast?.(`Failed to cancel charge: ${err?.message || 'Error'}`);
    }
  };

  const departments = [
    { id: 'ALL', label: 'All Departments' },
    { id: 'OPD', label: 'OPD Consultations' },
    { id: 'LAB', label: 'Laboratory' },
    { id: 'PHARMACY', label: 'Pharmacy' },
    { id: 'IPD', label: 'Inpatient (IPD)' },
    { id: 'EMERGENCY', label: 'Emergency' },
    { id: 'RADIOLOGY', label: 'Radiology' }
  ];

  return (
    <div className="invoice-queue-tab">
      {/* FILTER BAR & DEPARTMENT PILLS */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: '#ffffff',
          padding: '16px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          marginBottom: '16px'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {departments.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDept(d.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.8125rem',
                  fontWeight: selectedDept === d.id ? 700 : 500,
                  border: selectedDept === d.id ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: selectedDept === d.id ? '#eff6ff' : '#ffffff',
                  color: selectedDept === d.id ? '#1d4ed8' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Urgency:</span>
            {['ALL', 'STAT', 'ROUTINE'].map((urg) => (
              <button
                key={urg}
                type="button"
                onClick={() => setSelectedUrgency(urg)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: selectedUrgency === urg ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  backgroundColor: selectedUrgency === urg ? '#0f172a' : '#f8fafc',
                  color: selectedUrgency === urg ? '#ffffff' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                {urg === 'STAT' ? '⚡ STAT / Urgent' : urg}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', width: '360px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by UHID, patient name, or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '36px', fontSize: '0.8125rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {selectedChargeIds.length > 0 && (
              <button
                type="button"
                onClick={() => handleConsolidateSelected()}
                disabled={consolidating}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem' }}
              >
                <CreditCard size={15} />
                <span>Consolidate {selectedChargeIds.length} Selected to Invoice</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => loadCharges(true)}
              className="btn btn-outline"
              disabled={refreshing}
              title="Refresh queue"
              style={{ padding: '6px 10px', color: '#475569' }}
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* QUEUE SUMMARY KPI STRIP */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1, backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Pending Clinical Charges</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{charges.length}</div>
        </div>
        <div style={{ flex: 1, backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Unbilled Total Value</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb' }}>
            {formatMoney(charges.reduce((acc, c) => acc + c.total_amount, 0))}
          </div>
        </div>
        <div style={{ flex: 1, backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Patients in Worklist</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>
            {Object.keys(patientGroups).length}
          </div>
        </div>
        <div style={{ flex: 1, backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>STAT Emergency Orders</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626' }}>
            {charges.filter((c) => c.is_stat || c.priority === 'STAT').length}
          </div>
        </div>
      </div>

      {/* MAIN QUEUE DATA TABLE */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
          Loading unbilled charge items from clinical gateways...
        </div>
      ) : charges.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.125rem', color: '#0f172a' }}>Zero Unbilled Charges in Queue</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            All clinical charges emitted by OPD, Diagnostics, and Pharmacy have been processed or settled.
          </p>
        </div>
      ) : (
        <div className="table-responsive" style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedChargeIds.length === charges.length && charges.length > 0}
                    onChange={(e) => setSelectedChargeIds(e.target.checked ? charges.map((c) => c.id) : [])}
                  />
                </th>
                <th style={{ padding: '12px 16px' }}>Patient / UHID</th>
                <th style={{ padding: '12px 16px' }}>Department</th>
                <th style={{ padding: '12px 16px' }}>Service / Procedure</th>
                <th style={{ padding: '12px 16px' }}>Urgency</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Unit Price</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((charge) => {
                const isSelected = selectedChargeIds.includes(charge.id);
                const isStat = charge.is_stat || charge.priority === 'STAT';

                return (
                  <tr
                    key={charge.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isStat ? '#fef2f2' : (isSelected ? '#eff6ff' : '#ffffff'),
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(charge.id)}
                      />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                        {charge.patient_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {charge.uhid}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor:
                            charge.department === 'LAB' ? '#f0fdf4' :
                            charge.department === 'PHARMACY' ? '#fef3c7' :
                            charge.department === 'OPD' ? '#eff6ff' : '#f1f5f9',
                          color:
                            charge.department === 'LAB' ? '#166534' :
                            charge.department === 'PHARMACY' ? '#92400e' :
                            charge.department === 'OPD' ? '#1e40af' : '#475569',
                          border: '1px solid rgba(0,0,0,0.05)'
                        }}
                      >
                        {charge.department}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                        {charge.service_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Code: {charge.service_code || 'STANDARD'} • Ref: {charge.source_reference_id?.slice(0, 8) || 'AUTO'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {isStat ? (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fca5a5',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          ⚡ STAT
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Routine</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.875rem', color: '#334155' }}>
                      {formatMoney(charge.unit_price)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.875rem', color: '#334155' }}>
                      {charge.quantity}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                      {formatMoney(charge.total_amount)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleConsolidateSelected(charge.uhid)}
                          className="btn btn-sm btn-outline-primary"
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                          title="Generate bill for this patient"
                        >
                          Bill Now
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelCharge(charge)}
                          className="btn btn-sm btn-ghost"
                          style={{ padding: '4px', color: '#94a3b8' }}
                          title="Cancel orphaned charge"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
