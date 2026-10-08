import React, { useCallback, useEffect, useState } from 'react';
import {
  BedDouble, AlertTriangle, LogOut, Shield, PiggyBank, Search,
  RefreshCw, CheckCircle2, ChevronRight, FileText, Send, UserCheck,
  CheckSquare, Square, Printer, AlertCircle, Clock
} from 'lucide-react';
import {
  billingService,
  IpdAdmissionOverviewItem,
  IpdAdmissionsOverviewResponse,
  IpdRunningBillSummary
} from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { Btn, C, Callout } from './executiveUi';
import { DischargeClearancePassModal } from './DischargeClearancePassModal';

interface Props {
  onAcceptDeposit?: (admissionNumber: string, patientName: string) => void;
}

export const IpdRunningBillsScreen: React.FC<Props> = ({ onAcceptDeposit }) => {
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<IpdAdmissionsOverviewResponse | null>(null);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<IpdRunningBillSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'OVER_80' | 'DISCHARGE_TODAY' | 'AWAITING_TPA' | 'CLEARED'>('ALL');
  const [toast, setToast] = useState<string | null>(null);
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [passData, setPassData] = useState<any>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [cronRunning, setCronRunning] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      const data = await billingService.getIpdAdmissionsOverview();
      setOverview(data);
      if (data.admissions.length > 0 && !selectedIp) {
        setSelectedIp(data.admissions[0].ip);
      }
    } catch (err: any) {
      showToast('Error loading IPD admissions: ' + (err.message || 'Network error'));
    } finally {
      setLoading(false);
    }
  }, [selectedIp]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const loadDetail = useCallback(async (ip: string) => {
    try {
      setDetailLoading(true);
      const detail = await billingService.getIpdRunningBill(ip);
      setSelectedDetail(detail);
    } catch (err: any) {
      showToast('Failed to load running bill detail: ' + (err.message || ''));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedIp) {
      loadDetail(selectedIp);
    }
  }, [selectedIp, loadDetail]);

  const selectedAdm = overview?.admissions.find((a) => a.ip === selectedIp);

  // Filter admissions
  const filteredAdmissions = (overview?.admissions || []).filter((a) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [a.name, a.ip, a.uhid, a.ward, a.payer].join(' ').toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (filter === 'OVER_80') return a.status === 'RUNNING' && a.util >= 80;
    if (filter === 'DISCHARGE_TODAY') return a.status === 'MEDICALLY_DISCHARGED';
    if (filter === 'AWAITING_TPA') return a.status === 'AWAITING_TPA';
    if (filter === 'CLEARED') return a.status === 'CLEARED';
    return true;
  });

  // Handle midnight tariff cron
  const handleTriggerCron = async () => {
    try {
      setCronRunning(true);
      const res = await billingService.triggerIpdDailyTariffCron();
      showToast(`Daily tariff cron processed: ${res.admissions_processed} admissions accrued (${res.total_accrued_entries} charges).`);
      await loadOverview();
      if (selectedIp) await loadDetail(selectedIp);
    } catch (err: any) {
      showToast('Cron trigger failed: ' + (err.message || ''));
    } finally {
      setCronRunning(false);
    }
  };

  // Handle Interim Demand
  const handleRequestTopup = async () => {
    if (!selectedAdm) return;
    try {
      const demand = await billingService.issueIpdInterimDemand({
        admission: selectedAdm.ip,
        notes: `High ledger utilization alert for attendant of ${selectedAdm.name}`
      });
      showToast(`Interim Deposit Demand ${demand.demand_number} issued for ${format(Number(demand.demanded_amount))}`);
      await loadOverview();
      if (selectedIp) await loadDetail(selectedIp);
    } catch (err: any) {
      showToast('Failed to issue demand: ' + (err.message || ''));
    }
  };

  // Handle Checklist toggle
  const handleToggleChecklist = async (key: string, currentVal: boolean) => {
    if (!selectedAdm) return;
    try {
      await billingService.updateIpdDischargeChecklist(selectedAdm.ip, {
        [key]: !currentVal
      });
      if (selectedIp) await loadDetail(selectedIp);
    } catch (err: any) {
      showToast('Checklist update failed: ' + (err.message || ''));
    }
  };

  // Handle Final Bill Consolidation
  const handleConsolidateBill = async () => {
    if (!selectedAdm) return;
    try {
      const res = await billingService.consolidateIpdFinalBill({
        admission: selectedAdm.ip
      });
      showToast(`Final invoice ${res.invoice_number} consolidated. Net payable: ${format(res.balance_due)}`);
      await loadOverview();
      if (selectedIp) await loadDetail(selectedIp);
    } catch (err: any) {
      showToast('Consolidation failed: ' + (err.message || ''));
    }
  };

  // Handle Clearance Release
  const handleIssueClearance = async (override?: string) => {
    if (!selectedAdm) return;
    try {
      const clearance = await billingService.issueIpdDischargeClearance({
        admission: selectedAdm.ip,
        override_reason: override || overrideReason
      });
      showToast(`Financial Discharge Pass ${clearance.qr_verification_token} generated!`);
      setShowOverrideModal(false);
      setOverrideReason('');
      setPassData({
        pass_number: clearance.qr_verification_token,
        patient_name: clearance.patientName || selectedAdm.name,
        admission_number: clearance.admissionNumber || selectedAdm.ip,
        uhid: clearance.uhid || selectedAdm.uhid,
        ward_name: clearance.wardName || selectedAdm.ward,
        bed_number: clearance.bedNumber,
        cleared_at: clearance.cleared_at,
        is_override: clearance.clearance_status === 'OVERRIDDEN',
        override_reason: clearance.override_reason
      });
      setPassModalOpen(true);
      await loadOverview();
      if (selectedIp) await loadDetail(selectedIp);
    } catch (err: any) {
      showToast('Clearance blocked: ' + (err.response?.data?.error || err.message || 'Inpatient has balance'));
    }
  };

  const statusBadge = (st: string) => {
    switch (st) {
      case 'RUNNING':
        return <span style={{ fontSize: 12, color: C.textSub, background: '#F3F4F6', borderRadius: 999, padding: '3px 10px', fontWeight: 500 }}>Running</span>;
      case 'MEDICALLY_DISCHARGED':
        return <span style={{ fontSize: 12, color: C.amber, background: C.amberSoft, borderRadius: 999, padding: '3px 10px', fontWeight: 600 }}>Discharge today</span>;
      case 'AWAITING_TPA':
        return <span style={{ fontSize: 12, color: '#4338CA', background: '#EEF2FF', borderRadius: 999, padding: '3px 10px', fontWeight: 600 }}>Awaiting TPA</span>;
      case 'CLEARED':
        return <span style={{ fontSize: 12, color: C.green, background: C.greenSoft, borderRadius: 999, padding: '3px 10px', fontWeight: 600 }}>Cleared</span>;
      default:
        return <span>{st}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            zIndex: 120,
            background: '#111827',
            color: '#FFFFFF',
            borderRadius: 10,
            padding: '12px 18px',
            fontSize: 14,
            boxShadow: '0 8px 24px rgba(17,24,39,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          <AlertCircle size={18} style={{ color: C.primary }} />
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: C.text }}>
            IPD Running Bills
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, color: C.textSub }}>
            Inpatient ledgers against deposits, interim deposit alerts and financial discharge clearance gate.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn
            variant="ghost"
            onClick={handleTriggerCron}
            disabled={cronRunning}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Clock size={16} /> {cronRunning ? 'Accruing...' : 'Run Midnight Accrual'}
          </Btn>
          <Btn
            variant="secondary"
            onClick={() => {
              if (onAcceptDeposit && selectedAdm) {
                onAcceptDeposit(selectedAdm.ip, selectedAdm.name);
              } else {
                showToast('Open Patient Billing drawer to collect admission deposit.');
              }
            }}
          >
            Accept Deposit
          </Btn>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div style={{ background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, height: 115, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: C.textSub }}>Admitted</span>
            <BedDouble size={18} style={{ color: C.textSub }} />
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700 }}>
            {overview?.kpis.admitted ?? 0}
          </div>
          <div style={{ fontSize: 12, color: C.textSub }}>Running ledgers</div>
        </div>

        <div style={{ background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, height: 115, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: C.textSub }}>Over 80% deposit</span>
            <AlertTriangle size={18} style={{ color: C.amber }} />
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700, color: (overview?.kpis.over_80_deposit || 0) > 0 ? C.amber : C.text }}>
            {overview?.kpis.over_80_deposit ?? 0}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: C.textSub }}>Top-up needed</span>
            {(overview?.kpis.over_80_deposit || 0) > 0 && <span style={{ color: C.amber, fontWeight: 600 }}>Alert</span>}
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, height: 115, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: C.textSub }}>Discharge today</span>
            <LogOut size={18} style={{ color: C.textSub }} />
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700 }}>
            {overview?.kpis.discharge_today ?? 0}
          </div>
          <div style={{ fontSize: 12, color: C.textSub }}>Medically discharged</div>
        </div>

        <div style={{ background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, height: 115, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: C.textSub }}>Awaiting TPA</span>
            <Shield size={18} style={{ color: '#4338CA' }} />
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 26, fontWeight: 700, color: '#4338CA' }}>
            {overview?.kpis.awaiting_tpa ?? 0}
          </div>
          <div style={{ fontSize: 12, color: C.textSub }}>Final GOP approval</div>
        </div>

        <div style={{ background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, height: 115, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: C.textSub }}>Deposits held</span>
            <PiggyBank size={18} style={{ color: C.green }} />
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, color: C.green }}>
            {format(overview?.kpis.deposits_held || 0)}
          </div>
          <div style={{ fontSize: 12, color: C.textSub }}>Across active admissions</div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(360px, 1.2fr)', gap: 20, alignItems: 'start' }}>
        {/* Left Column: Admissions Table */}
        <div style={{ background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Inpatient Admissions</span>
              <span style={{ fontSize: 13, color: C.textSub }}>Sorted by discharge urgency</span>
            </div>
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['ALL', 'OVER_80', 'DISCHARGE_TODAY', 'AWAITING_TPA', 'CLEARED'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: filter === k ? C.primary : '#F3F4F6',
                    color: filter === k ? '#FFFFFF' : C.textSub
                  }}
                >
                  {k === 'ALL' ? 'All' : k === 'OVER_80' ? 'Over 80%' : k === 'DISCHARGE_TODAY' ? 'Discharge today' : k === 'AWAITING_TPA' ? 'Awaiting TPA' : 'Cleared'}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, background: '#F9FAFB' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 12px', height: 38 }}>
              <Search size={16} style={{ color: C.textSub }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by patient name, IP number, UHID, or ward..."
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13 }}
              />
            </div>
          </div>

          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 1.5fr) minmax(130px, 1.1fr) 110px minmax(140px, 1.2fr) 110px 110px',
              gap: 12,
              alignItems: 'center',
              height: 42,
              padding: '0 20px',
              background: '#F9FAFB',
              borderBottom: `1px solid ${C.border}`,
              fontSize: 12,
              color: C.textSub,
              fontWeight: 600
            }}
          >
            <span>Patient</span>
            <span>Ward & Day</span>
            <span>Payer</span>
            <span>Ledger vs Cover</span>
            <span style={{ textAlign: 'right' }}>Balance</span>
            <span style={{ textAlign: 'right' }}>Status</span>
          </div>

          {/* Table Rows */}
          {filteredAdmissions.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: C.textSub, fontSize: 14 }}>
              No admissions found matching the current filter.
            </div>
          ) : (
            filteredAdmissions.map((a) => {
              const isSelected = selectedIp === a.ip;
              const barWidth = Math.min(100, Math.round(a.util));
              const barColor = a.util < 80 ? C.primary : a.util <= 100 ? C.amber : C.red;

              return (
                <div
                  key={a.ip}
                  onClick={() => setSelectedIp(a.ip)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(180px, 1.5fr) minmax(130px, 1.1fr) 110px minmax(140px, 1.2fr) 110px 110px',
                    gap: 12,
                    alignItems: 'center',
                    height: 66,
                    padding: '0 20px',
                    borderBottom: `1px solid ${C.border}`,
                    cursor: 'pointer',
                    background: isSelected ? '#EFF6FF' : '#FFFFFF',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.name}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.textSub }}>
                      {a.ip} · {a.uhid}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: 13, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.ward}
                    </span>
                    <span style={{ fontSize: 12, color: C.textSub }}>Day {a.day}</span>
                  </div>

                  <span
                    style={{
                      fontSize: 12,
                      color: a.payer.includes('TPA') ? '#4338CA' : a.payer.includes('Corporate') ? '#0369A1' : C.textSub,
                      background: a.payer.includes('TPA') ? '#EEF2FF' : a.payer.includes('Corporate') ? '#F0F9FF' : '#F3F4F6',
                      borderRadius: 999,
                      padding: '3px 8px',
                      whiteSpace: 'nowrap',
                      justifySelf: 'start',
                      fontWeight: 500
                    }}
                  >
                    {a.payer.split(' · ')[0]}
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ height: 6, borderRadius: 999, background: '#E5E7EB', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barWidth}%`, background: barColor }}></div>
                    </div>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: a.util >= 80 ? C.amber : C.textSub, fontWeight: a.util >= 80 ? 600 : 400 }}>
                      {a.util}% · {format(a.ledger)}
                    </span>
                  </div>

                  <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, textAlign: 'right', color: a.status === 'CLEARED' ? C.green : a.balance > 0 ? C.text : C.green }}>
                    {a.status === 'CLEARED' ? format(0) : a.balance >= 0 ? format(a.balance) : `+${format(-a.balance)}`}
                  </span>

                  <div style={{ justifySelf: 'end' }}>{statusBadge(a.status)}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Selected Inpatient Ledger & Discharge Actions */}
        {selectedAdm && (
          <div
            style={{
              background: '#FFFFFF',
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              boxShadow: '0 2px 4px rgba(17,24,39,0.03)'
            }}
          >
            {/* Patient Header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                  {selectedAdm.name}
                </span>
                {statusBadge(selectedAdm.status)}
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.textSub }}>
                {selectedAdm.ip} · {selectedAdm.uhid}
              </span>
              <span style={{ fontSize: 13, color: C.textSub }}>
                {selectedAdm.ward} · Day {selectedAdm.day} · {selectedDetail?.consultant || selectedAdm.consultant}
              </span>
            </div>

            {/* Ledger Split by Category */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Inpatient Ledger Breakdown</span>
              {(selectedDetail?.category_split || []).map((x) => (
                <div key={x.category} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: C.textSub }}>{x.label}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{format(x.amount)}</span>
                </div>
              ))}
            </div>

            {/* Financial Summary Calculation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12, borderTop: `1px solid ${C.border}`, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.textSub }}>Gross ledger</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{format(selectedDetail?.ledger_total || selectedAdm.ledger)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.textSub }}>Deposits held</span>
                <span style={{ fontFamily: 'monospace', color: C.green, fontWeight: 600 }}>
                  − {format(selectedDetail?.total_deposit_balance || selectedAdm.deposit)}
                </span>
              </div>
              {selectedDetail?.has_tpa && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.textSub }}>{selectedDetail.tpa_settled_amount > 0 ? 'TPA final GOP settlement' : 'TPA pre-auth cover'}</span>
                  <span style={{ fontFamily: 'monospace', color: '#4338CA', fontWeight: 600 }}>
                    − {format(selectedDetail.tpa_settled_amount > 0 ? selectedDetail.tpa_settled_amount : selectedDetail.tpa_preauth_amount)}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, borderTop: `1px solid #F3F4F6` }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  {selectedAdm.status === 'CLEARED' ? 'Settled' : selectedAdm.status === 'AWAITING_TPA' ? 'Patient share (estimated)' : (selectedDetail?.net_balance || selectedAdm.balance) >= 0 ? 'Balance due' : 'Excess deposit'}
                </span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 20,
                    fontWeight: 700,
                    color: selectedAdm.status === 'CLEARED' ? C.green : (selectedDetail?.net_balance || selectedAdm.balance) > 0 ? C.text : C.green
                  }}
                >
                  {selectedAdm.status === 'CLEARED' ? format(0) : format(Math.abs(selectedDetail?.net_balance ?? selectedAdm.balance))}
                </span>
              </div>
            </div>

            {/* Top-up Alert Banner (> 80% Deposit) */}
            {selectedAdm.status === 'RUNNING' && selectedAdm.util >= 80 && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: C.amberSoft, border: `1px solid ${C.amberBorder}`, color: C.amber, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertTriangle size={16} />
                <span>Running bill is at <b>{selectedAdm.util}%</b> of deposit cover. Interim top-up notice recommended.</span>
              </div>
            )}

            {/* Discharge Checklist for Medically Discharged Patients */}
            {selectedAdm.status === 'MEDICALLY_DISCHARGED' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 10, background: '#F9FAFB', border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Medical Discharge Checklist</span>
                {(selectedDetail?.checklist || []).map((c) => (
                  <label
                    key={c.key}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}
                  >
                    <input
                      type="checkbox"
                      checked={c.done}
                      onChange={() => handleToggleChecklist(c.key, c.done)}
                      style={{ width: 16, height: 16, accentColor: C.primary, cursor: 'pointer' }}
                    />
                    <span style={{ color: c.done ? C.text : C.textSub, fontWeight: c.done ? 500 : 400 }}>
                      {c.label}
                    </span>
                  </label>
                ))}
                {!selectedDetail?.checklist_complete && (
                  <span style={{ fontSize: 12, color: C.amber, marginTop: 4 }}>
                    All checklist items must be confirmed before clearance can be issued.
                  </span>
                )}
              </div>
            )}

            {/* Actions for RUNNING status */}
            {selectedAdm.status === 'RUNNING' && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Btn
                  variant="ghost"
                  onClick={handleRequestTopup}
                  style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Send size={15} /> Request top-up
                </Btn>
                <Btn
                  variant="primary"
                  onClick={() => {
                    if (onAcceptDeposit) {
                      onAcceptDeposit(selectedAdm.ip, selectedAdm.name);
                    } else {
                      showToast('Use the deposit drawer to record advance.');
                    }
                  }}
                  style={{ flex: 1, height: 40 }}
                >
                  Accept deposit
                </Btn>
              </div>
            )}

            {/* Actions for MEDICALLY_DISCHARGED status */}
            {selectedAdm.status === 'MEDICALLY_DISCHARGED' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Btn
                  variant="primary"
                  disabled={!selectedDetail?.checklist_complete}
                  onClick={() => {
                    const bal = selectedDetail?.net_balance ?? selectedAdm.balance;
                    if (bal > 0) {
                      // Positive balance: prompt settlement or override
                      handleConsolidateBill();
                    } else {
                      // Zero or excess deposit: issue clearance directly
                      handleIssueClearance();
                    }
                  }}
                  style={{ height: 42, fontWeight: 600 }}
                >
                  {(selectedDetail?.net_balance ?? selectedAdm.balance) > 0
                    ? `Consolidate Bill & Settle ${format(selectedDetail?.net_balance ?? selectedAdm.balance)}`
                    : 'Issue Financial Discharge Pass'}
                </Btn>

                {/* Supervisor Override Option for charity or MS request */}
                {(selectedDetail?.net_balance ?? selectedAdm.balance) > 0 && selectedDetail?.checklist_complete && (
                  <button
                    onClick={() => setShowOverrideModal(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: C.primary,
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'center',
                      textDecoration: 'underline'
                    }}
                  >
                    Supervisor Override (Charity / VIP discharge)
                  </button>
                )}
              </div>
            )}

            {/* Actions for AWAITING_TPA */}
            {selectedAdm.status === 'AWAITING_TPA' && (
              <div style={{ padding: 12, borderRadius: 10, background: '#EEF2FF', border: '1px solid #C7D2FE', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#312E81', fontWeight: 600 }}>
                  Awaiting Final TPA / Insurer Settlement
                </span>
                <span style={{ fontSize: 12, color: '#4338CA' }}>
                  Pre-auth: {format(selectedDetail?.tpa_preauth_amount || selectedAdm.preauth || 0)}. Coordinate with Insurance Desk for the final GOP letter.
                </span>
              </div>
            )}

            {/* Actions for CLEARED status */}
            {selectedAdm.status === 'CLEARED' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ padding: 12, borderRadius: 10, background: C.greenSoft, border: `1px solid ${C.greenBorder}`, color: C.green, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={18} />
                  <span>Financial discharge cleared. Pass token: <b>{selectedAdm.pass_token || selectedDetail?.gate_pass_token}</b></span>
                </div>
                <Btn
                  variant="secondary"
                  onClick={() => {
                    setPassData({
                      pass_number: selectedAdm.pass_token || selectedDetail?.gate_pass_token || 'FDP-2610-00042',
                      patient_name: selectedAdm.name,
                      admission_number: selectedAdm.ip,
                      uhid: selectedAdm.uhid,
                      ward_name: selectedAdm.ward,
                      bed_number: null,
                      cleared_at: selectedDetail?.cleared_at,
                      is_override: selectedDetail?.clearance_status === 'OVERRIDDEN'
                    });
                    setPassModalOpen(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Printer size={16} /> View Clearance Pass Slip
                </Btn>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Supervisor Override Modal */}
      {showOverrideModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'rgba(17,24,39,0.4)',
            backdropFilter: 'blur(3px)'
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              width: 480,
              maxWidth: '100%',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 20px 40px rgba(17,24,39,0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={20} style={{ color: C.primary }} />
              <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                Supervisor Clearance Override
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
              Issue financial discharge pass despite an outstanding balance of{' '}
              <b>{format(selectedDetail?.net_balance || selectedAdm?.balance || 0)}</b>. This action is permanently logged on the central audit trail.
            </p>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Mandatory Override Justification (min 5 chars)
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Charity discharge requested by Medical Superintendent. Balance after deposits."
                rows={3}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  fontSize: 13,
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Btn variant="ghost" onClick={() => setShowOverrideModal(false)}>
                Cancel
              </Btn>
              <Btn
                variant="primary"
                disabled={overrideReason.trim().length < 5}
                onClick={() => handleIssueClearance(overrideReason)}
              >
                Confirm Override & Issue Pass
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Discharge Clearance Pass Modal */}
      <DischargeClearancePassModal
        isOpen={passModalOpen}
        onClose={() => setPassModalOpen(false)}
        pass={passData}
      />
    </div>
  );
};
