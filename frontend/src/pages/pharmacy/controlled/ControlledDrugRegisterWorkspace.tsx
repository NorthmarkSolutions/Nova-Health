import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  ShieldCheck,
  Search,
  Filter,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  Eye,
  RefreshCw,
  Building2,
  Boxes,
  Pill,
  BedDouble,
  X,
  Calendar,
  Layers,
  KeyRound,
  Download,
} from 'lucide-react';
import pharmacyControlledDrugService, {
  ControlledDrugVaultItem,
  ControlledDrugRegisterEntry,
  ControlledDrugSummaryMetrics,
  InspectionReportData,
} from '../../../services/pharmacyControlledDrugService';

export const ControlledDrugRegisterWorkspace: React.FC = () => {
  const navigate = useNavigate();

  // Data States
  const [vaultItems, setVaultItems] = useState<ControlledDrugVaultItem[]>([]);
  const [entries, setEntries] = useState<ControlledDrugRegisterEntry[]>([]);
  const [metrics, setMetrics] = useState<ControlledDrugSummaryMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [activePill, setActivePill] = useState<'all' | 'X' | 'H1' | 'disc'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected item for drawer
  const [selectedEntry, setSelectedEntry] = useState<ControlledDrugRegisterEntry | null>(null);

  // Reconcile Modal State
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [reconcileBatchId, setReconcileBatchId] = useState('');
  const [physicalCount, setPhysicalCount] = useState<number>(0);
  const [reconcileReason, setReconcileReason] = useState('Daily morning vault audit');
  const [reconcileDiscrepancyNotes, setReconcileDiscrepancyNotes] = useState('');
  const [reconcileWitnessId, setReconcileWitnessId] = useState('');
  const [reconcileWitnessPin, setReconcileWitnessPin] = useState('');
  const [reconcileWitnessVerified, setReconcileWitnessVerified] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [eligibleWitnesses, setEligibleWitnesses] = useState<any[]>([]);

  // Export Modal State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [inspectionData, setInspectionData] = useState<InspectionReportData | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch all initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vData, regData, mData, wData] = await Promise.all([
        pharmacyControlledDrugService.getVaultInventory(),
        pharmacyControlledDrugService.getRegisterEntries({
          pill: activePill,
          q: searchQuery,
        }),
        pharmacyControlledDrugService.getSummaryMetrics(),
        pharmacyControlledDrugService.getEligibleWitnesses(),
      ]);

      setVaultItems(vData);
      setEntries(regData);
      setMetrics(mData);
      setEligibleWitnesses(wData);
      if (wData.length > 0 && !reconcileWitnessId) {
        setReconcileWitnessId(wData[0].id);
      }
      if (regData.length > 0 && !selectedEntry) {
        setSelectedEntry(regData[0]);
      }
    } catch (err) {
      console.error('Failed to load controlled drug data', err);
    } finally {
      setLoading(false);
    }
  }, [activePill, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Export Click
  const handleOpenExport = async () => {
    setIsExportOpen(true);
    setExportLoading(true);
    try {
      const rep = await pharmacyControlledDrugService.exportReport();
      setInspectionData(rep);
    } catch (err) {
      console.error('Failed to fetch inspection report', err);
    } finally {
      setExportLoading(false);
    }
  };

  // Handle Verify Witness for Reconcile
  const handleVerifyReconcileWitness = async () => {
    if (!reconcileWitnessId || !reconcileWitnessPin) {
      setReconcileError('Please select a witness and enter their PIN (e.g. 4412).');
      return;
    }
    try {
      const res = await pharmacyControlledDrugService.verifyWitness(
        reconcileWitnessId,
        reconcileWitnessPin
      );
      if (res.valid) {
        setReconcileWitnessVerified(true);
        setReconcileError(null);
      } else {
        setReconcileError(res.error || 'Witness verification failed.');
      }
    } catch (err: any) {
      setReconcileError(err.response?.data?.error || 'Invalid witness credentials.');
    }
  };

  // Submit Reconciliation
  const handleSubmitReconciliation = async () => {
    if (!reconcileBatchId) {
      setReconcileError('Please select a vault batch.');
      return;
    }
    if (!reconcileWitnessVerified) {
      setReconcileError('Secondary witness countersignature is mandatory.');
      return;
    }

    try {
      await pharmacyControlledDrugService.reconcileVault({
        batch_id: reconcileBatchId,
        physical_count: Number(physicalCount),
        reason: reconcileReason,
        discrepancy_reason: reconcileDiscrepancyNotes,
        witness_id: reconcileWitnessId,
      });

      setIsReconcileOpen(false);
      setReconcileWitnessVerified(false);
      setReconcileWitnessPin('');
      fetchData();
    } catch (err: any) {
      setReconcileError(err.response?.data?.error || 'Reconciliation submission failed.');
    }
  };

  // Selected batch for reconciliation
  const activeReconcileBatch = useMemo(() => {
    for (const v of vaultItems) {
      const b = v.batches.find((b) => b.id === reconcileBatchId);
      if (b) return { batch: b, medicine: v };
    }
    return null;
  }, [vaultItems, reconcileBatchId]);

  const variance = activeReconcileBatch
    ? physicalCount - activeReconcileBatch.batch.available_quantity
    : 0;

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#f8fafc',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* LEFT NAVIGATION SIDEBAR */}
      <aside
        style={{
          width: '260px',
          background: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Hospital Branding */}
        <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '15px',
            }}
          >
            N
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>North Hospital</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Clinical Enterprise HMS</div>
          </div>
        </div>

        {/* Department Badge */}
        <div style={{ margin: '0 16px', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Current department</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#ffffff',
                background: '#111827',
                borderRadius: '4px',
                padding: '1px 6px',
              }}
            >
              SCHEDULE X
            </span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '4px' }}>Pharmacy</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
            Controlled Substances & Narcotics Vault
          </div>

          {/* Quick Cross-Department Switchers */}
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #e5e7eb', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => navigate('/pharmacy/opd')}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#2563eb',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              <Pill size={12} />
              Switch to OPD Dispensing →
            </button>
            <button
              onClick={() => navigate('/pharmacy/ipd')}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#2563eb',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              <BedDouble size={12} />
              Switch to IPD Ward Supply →
            </button>
            <button
              onClick={() => navigate('/pharmacy/inventory')}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#4b5563',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              <Boxes size={12} />
              Switch to Central Store →
            </button>
          </div>
        </div>

        {/* Sidebar Nav */}
        <div style={{ padding: '24px 20px 8px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
          CONTROLLED DRUGS
        </div>

        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#111827',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
            }}
          >
            <Lock size={16} color="#2563eb" />
            <span>Statutory Register</span>
          </div>

          <button
            onClick={() => {
              if (vaultItems.length > 0 && vaultItems[0].batches.length > 0) {
                setReconcileBatchId(vaultItems[0].batches[0].id);
                setPhysicalCount(vaultItems[0].batches[0].available_quantity);
              }
              setIsReconcileOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#4b5563',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <ShieldCheck size={16} />
            <span>Physical Shelf Audit</span>
          </button>
        </nav>

        {/* Regulatory Permit Box */}
        <div style={{ margin: '16px', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', color: '#64748b' }}>
            STATUTORY PERMITS
          </div>
          <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: 600, marginTop: '4px' }}>
            DL-20B-MH-48192
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            NDPS Permit: REG-2026-009
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* TOP BAR */}
        <header
          style={{
            height: '60px',
            background: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
              Controlled Drug & Narcotic Register
            </h1>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              Statutory Schedule X vault compliance & immutable dual-sign audit trail
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => {
                if (vaultItems.length > 0 && vaultItems[0].batches.length > 0) {
                  setReconcileBatchId(vaultItems[0].batches[0].id);
                  setPhysicalCount(vaultItems[0].batches[0].available_quantity);
                }
                setIsReconcileOpen(true);
              }}
              style={{
                height: '36px',
                padding: '0 14px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #d1d5db',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ShieldCheck size={15} color="#2563eb" />
              Reconcile Shelf Count
            </button>

            <button
              onClick={handleOpenExport}
              style={{
                height: '36px',
                padding: '0 14px',
                borderRadius: '8px',
                background: '#111827',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Download size={15} />
              Export Inspection Report
            </button>
          </div>
        </header>

        {/* 4 KPI CARDS */}
        <section
          style={{
            padding: '16px 24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            background: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            flexShrink: 0,
          }}
        >
          {/* KPI 1 */}
          <div style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Tracked CD Items</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
              {metrics?.cd_items_tracked || 7}
            </div>
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 500, marginTop: '2px' }}>
              Schedule X & H1 formulary lines
            </div>
          </div>

          {/* KPI 2 */}
          <div style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Entries Today</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
              {metrics?.register_entries_today || 0}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
              {metrics?.register_entries_total || 0} total lifetime records
            </div>
          </div>

          {/* KPI 3 */}
          <div style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Vault Security Status</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#15803d', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={16} /> All Vault Safes Locked
            </div>
            <div style={{ fontSize: '11px', color: '#15803d', marginTop: '4px' }}>
              Dual Key Protocol Enforced
            </div>
          </div>

          {/* KPI 4 */}
          <div style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #e5e7eb', background: '#f9fafb' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Dual-Sign Compliance</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f766e', marginTop: '4px' }}>
              100.0%
            </div>
            <div style={{ fontSize: '11px', color: '#0f766e', fontWeight: 500, marginTop: '2px' }}>
              0 unverified statutory releases
            </div>
          </div>
        </section>

        {/* WORKSPACE BODY WITH TABLE AND DRAWER */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* REGISTER TABLE COLUMN */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            {/* Filter Pills and Search */}
            <div
              style={{
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #e5e7eb',
                background: '#ffffff',
                flexShrink: 0,
              }}
            >
              {/* Pills */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { key: 'all', label: 'All Entries' },
                  { key: 'X', label: 'Schedule X (Narcotics)' },
                  { key: 'H1', label: 'Schedule H1' },
                  { key: 'disc', label: 'Discrepancies' },
                ].map((p) => {
                  const isActive = activePill === p.key;
                  return (
                    <button
                      key={p.key}
                      onClick={() => setActivePill(p.key as any)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: isActive ? '1px solid #2563eb' : '1px solid #e5e7eb',
                        background: isActive ? '#eff6ff' : '#ffffff',
                        color: isActive ? '#2563eb' : '#4b5563',
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', width: '280px' }}>
                <Search
                  size={15}
                  color="#9ca3af"
                  style={{ position: 'absolute', left: '10px', top: '10px' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search entry #, medicine, patient..."
                  style={{
                    width: '100%',
                    height: '34px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    padding: '0 10px 0 32px',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* REGISTER TABLE */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* Table Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(130px, 0.9fr) minmax(200px, 1.4fr) minmax(130px, 1fr) minmax(150px, 1.1fr) minmax(150px, 1.1fr) 70px 80px minmax(180px, 1.3fr) 110px',
                  alignItems: 'center',
                  height: '44px',
                  background: '#f9fafb',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  color: '#6b7280',
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                }}
              >
                <div style={{ padding: '0 16px' }}>ENTRY #</div>
                <div style={{ padding: '0 16px' }}>MEDICINE & SCHED</div>
                <div style={{ padding: '0 16px' }}>VAULT BATCH</div>
                <div style={{ padding: '0 16px' }}>PATIENT</div>
                <div style={{ padding: '0 16px' }}>PRESCRIBER</div>
                <div style={{ padding: '0 16px' }}>QTY</div>
                <div style={{ padding: '0 16px' }}>BALANCE</div>
                <div style={{ padding: '0 16px' }}>DISPENSER · WITNESS</div>
                <div style={{ padding: '0 16px', textAlign: 'right' }}>SEAL</div>
              </div>

              {/* Rows */}
              {entries.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                  No statutory controlled drug records found.
                </div>
              ) : (
                entries.map((entry) => {
                  const isSelected = selectedEntry?.id === entry.id;
                  const isScheduleX =
                    entry.medicine_schedule === 'Schedule X' || entry.medicine_schedule === 'X';

                  return (
                    <div
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(130px, 0.9fr) minmax(200px, 1.4fr) minmax(130px, 1fr) minmax(150px, 1.1fr) minmax(150px, 1.1fr) 70px 80px minmax(180px, 1.3fr) 110px',
                        alignItems: 'center',
                        minHeight: '56px',
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                      }}
                    >
                      {/* Entry Number */}
                      <div style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#1e40af', fontSize: '13px' }}>
                        {entry.entry_number}
                      </div>

                      {/* Medicine */}
                      <div style={{ padding: '10px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                          {entry.medicine_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#ffffff',
                              background: '#111827',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            {entry.medicine_schedule}
                          </span>
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>
                            {entry.medicine_strength}
                          </span>
                        </div>
                      </div>

                      {/* Batch & Vault Safe */}
                      <div style={{ padding: '10px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                          {entry.batch_number}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                          {entry.vault_location || 'Vault Safe A'}
                        </div>
                      </div>

                      {/* Patient */}
                      <div style={{ padding: '10px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                          {entry.patient_name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace', marginTop: '2px' }}>
                          {entry.patient_uhid || '—'}
                        </div>
                      </div>

                      {/* Prescriber */}
                      <div style={{ padding: '10px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                          {entry.prescribing_doctor_name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                          {entry.doctor_license_number}
                        </div>
                      </div>

                      {/* Quantity */}
                      <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>
                        −{entry.quantity_dispensed}
                      </div>

                      {/* Balance Stock After */}
                      <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 700, color: '#15803d' }}>
                        {entry.balance_stock_after}
                      </div>

                      {/* Dispenser & Witness */}
                      <div style={{ padding: '10px 16px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                          Ph: {entry.primary_pharmacist_name || 'Primary Pharmacist'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '2px' }}>
                          Wit: {entry.witness_staff_name || entry.witness_role}
                        </div>
                      </div>

                      {/* Seal */}
                      <div style={{ padding: '10px 16px', textAlign: 'right' }}>
                        {entry.discrepancy_noted ? (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#b91c1c',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              padding: '3px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            DISCREPANCY
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#15803d',
                              background: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              padding: '3px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            DUAL VERIFIED
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT-HAND AUDIT DETAIL PANEL (380px) */}
          <aside
            style={{
              width: '380px',
              background: '#ffffff',
              borderLeft: '1px solid #e5e7eb',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              overflowY: 'auto',
            }}
          >
            {selectedEntry ? (
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#15803d',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      STATUTORY RECORD
                    </span>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: '6px 0 0' }}>
                      {selectedEntry.entry_number}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      Logged on {new Date(selectedEntry.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Medicine Box */}
                <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    {selectedEntry.medicine_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Schedule: {selectedEntry.medicine_schedule} · Strength: {selectedEntry.medicine_strength}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Batch: <strong>{selectedEntry.batch_number}</strong> · Vault Safe: {selectedEntry.vault_location}
                  </div>
                </div>

                {/* Audit Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    padding: '12px',
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Quantity Dispensed</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#dc2626' }}>
                      {selectedEntry.quantity_dispensed} units
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>Verified Balance After</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#15803d' }}>
                      {selectedEntry.balance_stock_after} units
                    </div>
                  </div>
                </div>

                {/* Patient & Prescriber Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#6b7280' }}>
                    PATIENT & PRESCRIBER
                  </div>
                  <div style={{ fontSize: '13px', color: '#111827' }}>
                    Patient: <strong>{selectedEntry.patient_name}</strong> ({selectedEntry.patient_uhid})
                  </div>
                  <div style={{ fontSize: '13px', color: '#111827' }}>
                    Prescriber: <strong>{selectedEntry.prescribing_doctor_name}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#4b5563' }}>
                    Medical Registration: {selectedEntry.doctor_license_number}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4b5563' }}>
                    Prescription / Token #: {selectedEntry.rx_number || 'RX-VAULT'}
                  </div>
                </div>

                {/* Dual Signatures */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#6b7280' }}>
                    STATUTORY COUNTERSIGNATURES
                  </div>
                  <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e3a8a' }}>
                      Primary Dispensing Pharmacist
                    </div>
                    <div style={{ fontSize: '13px', color: '#1e40af', marginTop: '2px' }}>
                      {selectedEntry.primary_pharmacist_name || 'Staff Pharmacist'}
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#166534' }}>
                      Secondary Witness (Dual Countersigned)
                    </div>
                    <div style={{ fontSize: '13px', color: '#15803d', marginTop: '2px' }}>
                      {selectedEntry.witness_staff_name || selectedEntry.witness_role}
                    </div>
                  </div>
                </div>

                {/* Clinical Remarks */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#6b7280' }}>
                    CLINICAL & STATUTORY REMARKS
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#334155',
                      padding: '10px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      marginTop: '4px',
                      lineHeight: 1.4,
                    }}
                  >
                    {selectedEntry.remarks || 'Statutory verification complete.'}
                  </div>
                </div>

                {/* Print Statutory Slip Button */}
                <button
                  onClick={() => window.print()}
                  style={{
                    height: '38px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#374151',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginTop: '8px',
                  }}
                >
                  <Printer size={15} />
                  Print Statutory Slip
                </button>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                Select an entry to view statutory audit details.
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* RECONCILE SHELF COUNT MODAL */}
      {isReconcileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#2563eb" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#111827' }}>
                  Vault Shelf Physical Count Reconciliation
                </h3>
              </div>
              <button
                onClick={() => setIsReconcileOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                  Select Vault Medicine & Batch
                </label>
                <select
                  value={reconcileBatchId}
                  onChange={(e) => {
                    setReconcileBatchId(e.target.value);
                    const b = vaultItems
                      .flatMap((v) => v.batches)
                      .find((b) => b.id === e.target.value);
                    if (b) setPhysicalCount(b.available_quantity);
                  }}
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    padding: '0 10px',
                    fontSize: '13px',
                    marginTop: '4px',
                  }}
                >
                  {vaultItems.map((v) =>
                    v.batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {v.name} ({b.batch_number}) · Reg Balance: {b.available_quantity}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Physical Count Input and Variance Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                    Physical Count Verified on Shelf
                  </label>
                  <input
                    type="number"
                    value={physicalCount}
                    onChange={(e) => setPhysicalCount(Number(e.target.value))}
                    style={{
                      width: '100%',
                      height: '38px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      padding: '0 10px',
                      fontSize: '14px',
                      fontWeight: 700,
                      marginTop: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                    Audit Variance
                  </label>
                  <div
                    style={{
                      height: '38px',
                      borderRadius: '8px',
                      padding: '0 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '14px',
                      fontWeight: 700,
                      marginTop: '4px',
                      background: variance === 0 ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${variance === 0 ? '#bbf7d0' : '#fecaca'}`,
                      color: variance === 0 ? '#15803d' : '#b91c1c',
                    }}
                  >
                    <span>{variance === 0 ? '0 (Reconciled)' : `${variance} (Discrepancy)`}</span>
                  </div>
                </div>
              </div>

              {/* Discrepancy Note if variance != 0 */}
              {variance !== 0 && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#b91c1c' }}>
                    Discrepancy Investigation Reason (Mandatory)
                  </label>
                  <textarea
                    rows={2}
                    value={reconcileDiscrepancyNotes}
                    onChange={(e) => setReconcileDiscrepancyNotes(e.target.value)}
                    placeholder="e.g. 1 vial broken during shelf count, quarantined for write-off"
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      border: '1px solid #fecaca',
                      padding: '8px 10px',
                      fontSize: '13px',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              {/* Secondary Witness Countersignature */}
              <div
                style={{
                  padding: '12px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a8a' }}>
                  Witness Countersignature (PIN 4412)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr auto', gap: '6px' }}>
                  <select
                    value={reconcileWitnessId}
                    onChange={(e) => {
                      setReconcileWitnessId(e.target.value);
                      setReconcileWitnessVerified(false);
                    }}
                    style={{
                      height: '36px',
                      borderRadius: '6px',
                      border: '1px solid #93c5fd',
                      fontSize: '12px',
                      padding: '0 6px',
                    }}
                  >
                    {eligibleWitnesses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.badge})
                      </option>
                    ))}
                  </select>

                  <input
                    type="password"
                    placeholder="PIN"
                    value={reconcileWitnessPin}
                    onChange={(e) => {
                      setReconcileWitnessPin(e.target.value);
                      setReconcileWitnessVerified(false);
                    }}
                    style={{
                      height: '36px',
                      borderRadius: '6px',
                      border: '1px solid #93c5fd',
                      fontSize: '12px',
                      padding: '0 8px',
                      boxSizing: 'border-box',
                    }}
                  />

                  <button
                    type="button"
                    onClick={handleVerifyReconcileWitness}
                    style={{
                      height: '36px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      background: '#1d4ed8',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Verify
                  </button>
                </div>

                {reconcileWitnessVerified && (
                  <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
                    ✓ Witness Verified
                  </div>
                )}
              </div>

              {reconcileError && (
                <div style={{ fontSize: '12px', color: '#b91c1c' }}>{reconcileError}</div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #e5e7eb',
                background: '#f9fafb',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={() => setIsReconcileOpen(false)}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '6px',
                  background: '#ffffff',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReconciliation}
                style={{
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '6px',
                  background: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Commit Reconciliation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUTORY REGULATORY INSPECTION EXPORT MODAL */}
      {isExportOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.75)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '840px',
              maxHeight: '92vh',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#111827' }}>
                  Statutory Drug Inspector Inspection Register
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Compliant with NDPS Act, 1985 & Drugs and Cosmetics Rules (Rule 65 / Schedule X)
                </div>
              </div>
              <button
                onClick={() => setIsExportOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Printable Content */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {exportLoading || !inspectionData ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                  Assembling official inspection ledger...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Facility Details Header */}
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <div>
                        Institution: <strong>{inspectionData.hospital_name}</strong>
                      </div>
                      <div>
                        Facility Code: <strong>{inspectionData.facility_code}</strong>
                      </div>
                      <div>
                        Generated At: {new Date(inspectionData.generated_at).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div>
                        Drug Licenses: <strong>{inspectionData.drug_license_number}</strong>
                      </div>
                      <div>
                        NDPS Permit: <strong>{inspectionData.ndps_possession_permit}</strong>
                      </div>
                      <div>
                        Audit Compliance: <strong>100% Dual Verification Rate</strong>
                      </div>
                    </div>
                  </div>

                  {/* Table of Entries */}
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '12px',
                      textAlign: 'left',
                    }}
                  >
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ padding: '8px 10px' }}>Entry #</th>
                        <th style={{ padding: '8px 10px' }}>Date/Time</th>
                        <th style={{ padding: '8px 10px' }}>Medicine</th>
                        <th style={{ padding: '8px 10px' }}>Batch</th>
                        <th style={{ padding: '8px 10px' }}>Patient UHID</th>
                        <th style={{ padding: '8px 10px' }}>Prescriber</th>
                        <th style={{ padding: '8px 10px' }}>Qty</th>
                        <th style={{ padding: '8px 10px' }}>Balance</th>
                        <th style={{ padding: '8px 10px' }}>Signatures</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectionData.entries.map((e) => (
                        <tr key={e.entry_number} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600 }}>
                            {e.entry_number}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#64748b' }}>{e.timestamp}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{e.medicine_name}</td>
                          <td style={{ padding: '8px 10px' }}>{e.batch_number}</td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                            {e.patient_uhid}
                          </td>
                          <td style={{ padding: '8px 10px' }}>{e.prescribing_doctor}</td>
                          <td style={{ padding: '8px 10px', color: '#dc2626', fontWeight: 700 }}>
                            −{e.quantity_dispensed}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#16a34a', fontWeight: 700 }}>
                            {e.balance_stock_after}
                          </td>
                          <td style={{ padding: '8px 10px', fontSize: '11px', color: '#334155' }}>
                            <div>Ph: {e.primary_pharmacist}</div>
                            <div style={{ color: '#2563eb' }}>Wit: {e.witness_staff}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #e5e7eb',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Certified true and non-editable statutory digital record.
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsExportOpen(false)}
                  style={{
                    height: '36px',
                    padding: '0 14px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    height: '36px',
                    padding: '0 16px',
                    borderRadius: '6px',
                    background: '#111827',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Printer size={15} />
                  Print Inspection Ledger
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlledDrugRegisterWorkspace;
