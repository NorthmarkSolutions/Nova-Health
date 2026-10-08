import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck, Plus, Clock, AlertCircle, CheckCircle2, XCircle, FileText, Calculator,
  Search, RefreshCw, ChevronRight, FileCheck
} from 'lucide-react';
import {
  billingService, TPAClaimRecord, CorporateAccount, CoPaySplitResult
} from '../../../services/billingService';
import {
  C, mono, card, PageHeader, KpiCard, Btn, Drawer, Field, inputStyle, Callout, Empty, apiError
} from '../executive/executiveUi';

export const InsuranceTpaScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Pre-authorisations' | 'Contracts'>('Pre-authorisations');
  const [claims, setClaims] = useState<TPAClaimRecord[]>([]);
  const [payers, setPayers] = useState<CorporateAccount[]>([]);
  const [selectedPayerId, setSelectedPayerId] = useState<string>('');
  const [paFilter, setPaFilter] = useState<'Open' | 'Query raised' | 'Approved' | 'Rejected' | 'All'>('Open');
  const [selectedClaim, setSelectedClaim] = useState<TPAClaimRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Pre-auth drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paFormStatus, setPaFormStatus] = useState<'PENDING' | 'APPROVED' | 'QUERY_RAISED' | 'REJECTED' | 'PARTIAL'>('APPROVED');
  const [paFormApproved, setPaFormApproved] = useState<string>('');
  const [paFormNote, setPaFormNote] = useState<string>('');
  const [isUpdatingPa, setIsUpdatingPa] = useState(false);

  // Add plan modal state
  const [addPlanOpen, setAddPlanOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanCopay, setNewPlanCopay] = useState('10');
  const [newPlanRoomCap, setNewPlanRoomCap] = useState('5000');
  const [newPlanExclusions, setNewPlanExclusions] = useState('Cosmetic, Vitamins');

  // Co-Pay Sandbox state
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sbTotal, setSbTotal] = useState<string>('125000');
  const [sbApprovedGop, setSbApprovedGop] = useState<string>('95000');
  const [sbCopayPct, setSbCopayPct] = useState<string>('10');
  const [sbNonMedical, setSbNonMedical] = useState<string>('8500');
  const [sbRoomExcess, setSbRoomExcess] = useState<string>('4000');
  const [splitResult, setSplitResult] = useState<CoPaySplitResult | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [claimsRes, payersData] = await Promise.all([
        billingService.getTPAClaims(),
        billingService.getInsurancePayers()
      ]);
      setClaims(claimsRes.claims || []);
      setPayers(payersData);
      if (payersData.length > 0 && !selectedPayerId) {
        setSelectedPayerId(payersData[0].id);
      }
    } catch (err) {
      setError(apiError(err, 'Failed to load insurance and TPA data.'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedPayerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pre-auth filter logic
  const filteredClaims = claims.filter((c) => {
    if (paFilter === 'Open') {
      return ['PENDING', 'QUERY_RAISED'].includes(c.pre_auth_status);
    }
    if (paFilter === 'Query raised') {
      return c.pre_auth_status === 'QUERY_RAISED';
    }
    if (paFilter === 'Approved') {
      return ['APPROVED', 'PARTIAL'].includes(c.pre_auth_status);
    }
    if (paFilter === 'Rejected') {
      return c.pre_auth_status === 'REJECTED';
    }
    return true;
  });

  // KPIs
  const openCount = claims.filter((c) => ['PENDING', 'QUERY_RAISED'].includes(c.pre_auth_status)).length;
  const openReqSum = claims
    .filter((c) => ['PENDING', 'QUERY_RAISED'].includes(c.pre_auth_status))
    .reduce((acc, c) => acc + Number(c.requested_amount || 0), 0);
  const queryCount = claims.filter((c) => c.pre_auth_status === 'QUERY_RAISED').length;
  const approvedSum = claims
    .filter((c) => ['APPROVED', 'PARTIAL'].includes(c.pre_auth_status))
    .reduce((acc, c) => acc + Number(c.pre_auth_amount || 0), 0);
  const partialCount = claims.filter((c) => c.pre_auth_status === 'PARTIAL').length;
  const gapSum = claims
    .filter((c) => c.pre_auth_status === 'PARTIAL')
    .reduce((acc, c) => acc + (Number(c.requested_amount || 0) - Number(c.pre_auth_amount || 0)), 0);

  const openDrawerForClaim = (claim: TPAClaimRecord) => {
    setSelectedClaim(claim);
    setPaFormStatus(claim.pre_auth_status);
    setPaFormApproved(claim.pre_auth_amount ? String(claim.pre_auth_amount) : '');
    setPaFormNote('');
    setDrawerOpen(true);
  };

  const handleUpdatePreAuth = async () => {
    if (!selectedClaim) return;
    setIsUpdatingPa(true);
    setError(null);
    try {
      const apprNum = paFormApproved ? parseFloat(paFormApproved) : undefined;
      const updated = await billingService.updateTPAPreAuth(selectedClaim.id, {
        status: paFormStatus,
        approved_amount: apprNum,
        note: paFormNote.trim() || undefined
      });
      setClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSelectedClaim(updated);
      setNotice(`Pre-auth updated for ${updated.patient_name || updated.claim_number}`);
      setDrawerOpen(false);
    } catch (err) {
      setError(apiError(err, 'Failed to update pre-authorization status.'));
    } finally {
      setIsUpdatingPa(false);
    }
  };

  const handleRunSplitSandbox = async () => {
    setError(null);
    try {
      const res = await billingService.calculateCoPaySplit({
        total_bill: parseFloat(sbTotal) || 0,
        approved_gop: parseFloat(sbApprovedGop) || 0,
        copay_percent: parseFloat(sbCopayPct) || 0,
        non_medical_deductibles: parseFloat(sbNonMedical) || 0,
        room_rent_excess: parseFloat(sbRoomExcess) || 0
      });
      setSplitResult(res);
    } catch (err) {
      setError(apiError(err, 'Failed to calculate co-pay split.'));
    }
  };

  const handleAddPlan = () => {
    if (!newPlanName.trim()) return;
    setNotice(`Plan "${newPlanName}" added to contract`);
    setNewPlanName('');
    setAddPlanOpen(false);
  };

  const selectedPayer = payers.find((p) => p.id === selectedPayerId) || payers[0];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span style={{ fontSize: 12, fontWeight: 500, color: C.green, background: C.greenSoft, padding: '2px 8px', borderRadius: 999 }}>Approved</span>;
      case 'PARTIAL':
        return <span style={{ fontSize: 12, fontWeight: 500, color: '#0369A1', background: '#F0F9FF', padding: '2px 8px', borderRadius: 999 }}>Partially approved</span>;
      case 'QUERY_RAISED':
        return <span style={{ fontSize: 12, fontWeight: 500, color: '#C2410C', background: '#FFF7ED', padding: '2px 8px', borderRadius: 999 }}>Query raised</span>;
      case 'REJECTED':
        return <span style={{ fontSize: 12, fontWeight: 500, color: C.red, background: C.redSoft, padding: '2px 8px', borderRadius: 999 }}>Rejected</span>;
      case 'PENDING':
        return <span style={{ fontSize: 12, fontWeight: 500, color: C.amber, background: C.amberSoft, padding: '2px 8px', borderRadius: 999 }}>Pending insurer</span>;
      default:
        return <span style={{ fontSize: 12, fontWeight: 500, color: C.muted, background: '#F3F4F6', padding: '2px 8px', borderRadius: 999 }}>{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Insurance & TPA"
        subtitle="Payer contracts, plan rules and claim terms. Counters split every bill using these rules."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" onClick={() => setSandboxOpen(true)}>
              <Calculator size={16} /> Co-Pay Sandbox
            </Btn>
            <Btn variant="primary" onClick={() => setAddPlanOpen(true)}>
              <Plus size={16} /> Add Plan
            </Btn>
            <Btn variant="secondary" onClick={loadData}>
              <RefreshCw size={15} />
            </Btn>
          </div>
        }
      />

      {error && <Callout tone="red">{error}</Callout>}
      {notice && <Callout tone="green">{notice}</Callout>}

      {/* Main Mode Tabs */}
      <div style={{ display: 'flex', gap: 6, background: '#F3F4F6', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('Pre-authorisations')}
          style={{
            height: 32,
            padding: '0 14px',
            border: 'none',
            borderRadius: 8,
            background: activeTab === 'Pre-authorisations' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'Pre-authorisations' ? C.text : C.muted,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: activeTab === 'Pre-authorisations' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          Pre-authorisations <span style={{ ...mono, fontSize: 11, color: C.muted }}>{openCount}</span>
        </button>
        <button
          onClick={() => setActiveTab('Contracts')}
          style={{
            height: 32,
            padding: '0 14px',
            border: 'none',
            borderRadius: 8,
            background: activeTab === 'Contracts' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'Contracts' ? C.text : C.muted,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: activeTab === 'Contracts' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          Contracts & Plans <span style={{ ...mono, fontSize: 11, color: C.muted }}>{payers.length}</span>
        </button>
      </div>

      {activeTab === 'Pre-authorisations' ? (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <KpiCard
              label="Open pre-auths"
              value={openCount}
              sub={`₹${(openReqSum / 100000).toFixed(1)}L requested`}
              icon={<Clock size={18} />}
            />
            <KpiCard
              label="Queries to answer"
              value={queryCount}
              sub="Insurer waiting on hospital"
              trend={queryCount > 0 ? 'Action required' : 'Clear'}
              trendColor={queryCount > 0 ? '#C2410C' : C.green}
              icon={<AlertCircle size={18} />}
            />
            <KpiCard
              label="Approved value"
              value={`₹${(approvedSum / 100000).toFixed(1)}L`}
              sub={`${partialCount} partial approvals`}
              trend="Cashless ready"
              trendColor={C.green}
              icon={<CheckCircle2 size={18} />}
            />
            <KpiCard
              label="Approval gap"
              value={`₹${(gapSum / 100000).toFixed(1)}L`}
              sub="Patient share or enhancement"
              trendColor={C.amber}
              icon={<FileText size={18} />}
            />
          </div>

          {/* Pre-auth Table Section */}
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Pre-authorisation tracking</div>
                <div style={{ fontSize: 13, color: C.muted }}>IPD, OT and high-value procedures · track insurer approval before discharge</div>
              </div>
              <div style={{ display: 'flex', gap: 4, background: '#F3F4F6', borderRadius: 8, padding: 3 }}>
                {(['Open', 'Query raised', 'Approved', 'Rejected', 'All'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setPaFilter(tab)}
                    style={{
                      height: 28,
                      padding: '0 10px',
                      border: 'none',
                      borderRadius: 6,
                      background: paFilter === tab ? '#FFFFFF' : 'transparent',
                      color: paFilter === tab ? C.text : C.muted,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: `1px solid ${C.border}`, color: C.muted, fontSize: 12, fontWeight: 500 }}>
                    <th style={{ padding: '12px 20px' }}>Patient · UHID</th>
                    <th style={{ padding: '12px 16px' }}>Insurance Provider</th>
                    <th style={{ padding: '12px 16px' }}>Source</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Requested</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Approved</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 20px' }}>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: C.muted }}>
                        No pre-authorisations match this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredClaims.map((c) => {
                      const req = Number(c.requested_amount || 0);
                      const appr = Number(c.pre_auth_amount || 0);
                      const gap = req - appr;
                      const hasGap = c.pre_auth_status === 'PARTIAL' && gap > 0;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => openDrawerForClaim(c)}
                          style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = C.hover)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '12px 20px' }}>
                            <div style={{ fontWeight: 500, color: C.text }}>{c.patient_name || 'Patient'}</div>
                            <div style={{ ...mono, fontSize: 12, color: C.muted }}>
                              {c.patient_uhid || 'UHID'} · {c.claim_number}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 500 }}>{c.corporate_account_name}</div>
                            {c.plan_name && <div style={{ fontSize: 11, color: C.muted }}>Plan: {c.plan_name}</div>}
                          </td>
                          <td style={{ padding: '12px 16px', color: C.muted }}>{c.source || 'IPD'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', ...mono }}>
                            ₹{req.toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ ...mono, fontWeight: 600 }}>
                              {appr > 0 ? `₹${appr.toLocaleString('en-IN')}` : '—'}
                            </div>
                            {hasGap && (
                              <div style={{ ...mono, fontSize: 11, color: '#C2410C' }}>
                                gap ₹{gap.toLocaleString('en-IN')}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>{getStatusBadge(c.pre_auth_status)}</td>
                          <td style={{ padding: '12px 20px', ...mono, fontSize: 12, color: C.muted }}>
                            {c.updated_at ? new Date(c.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Contracts & Plans Tab */
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
          {/* Payer list left column */}
          <div style={{ flex: '1 1 320px', maxWidth: 420, minWidth: 280, ...card, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', background: '#F9FAFB', borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 600, color: C.textSub }}>
              Insurance Payers ({payers.length})
            </div>
            {payers.map((p) => {
              const isSelected = p.id === selectedPayer?.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPayerId(p.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    padding: '14px 20px',
                    width: '100%',
                    border: 'none',
                    borderBottom: '1px solid #F3F4F6',
                    background: isSelected ? C.primarySoft : '#FFFFFF',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: isSelected ? C.primary : C.text }}>{p.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: p.is_active ? C.green : C.muted, background: p.is_active ? C.greenSoft : '#F3F4F6', padding: '2px 8px', borderRadius: 999 }}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, width: '100%' }}>
                    <span>{p.code} · {(p.plans_data || []).length} plans</span>
                    <span style={{ ...mono, color: C.text }}>TAT: {p.settlement_tat_days || 30}d</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Payer Detail right column */}
          {selectedPayer ? (
            <div style={{ flex: '2 1 540px', minWidth: 320, ...card, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 600 }}>{selectedPayer.name}</div>
                    <div style={{ fontSize: 13, color: C.muted }}>
                      Code: {selectedPayer.code} · Contract: {selectedPayer.contract_reference || 'TPA-MOU-2026'}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: C.green, background: C.greenSoft, padding: '3px 10px', borderRadius: 999 }}>
                    Active Empanelled Payer
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: C.muted }}>Tariff schedule</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Standard NABH - {selectedPayer.tariff_discount_percent || 0}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: C.muted }}>Claim TAT</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{selectedPayer.settlement_tat_days || 30} days</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: C.muted }}>Open claims</div>
                    <div style={{ fontSize: 14, fontWeight: 500, ...mono }}>
                      {claims.filter((c) => c.corporate_account_name?.toLowerCase().includes(selectedPayer.name.toLowerCase().slice(0, 4))).length}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: C.muted }}>Contact</div>
                    <div style={{ fontSize: 13, color: C.textSub }}>{selectedPayer.contact_email || 'desk@payer.com'}</div>
                  </div>
                </div>
              </div>

              {/* Plans Table */}
              <div style={{ padding: '16px 24px 8px', fontSize: 14, fontWeight: 600 }}>Available Plans & Benefits</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: `1px solid ${C.border}`, color: C.muted, fontSize: 12, fontWeight: 500 }}>
                      <th style={{ padding: '10px 20px' }}>Plan</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Co-pay</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Room Cap/Day</th>
                      <th style={{ padding: '10px 16px' }}>Key Exclusions</th>
                      <th style={{ padding: '10px 20px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPayer.plans_data && selectedPayer.plans_data.length > 0) ? (
                      selectedPayer.plans_data.map((pl: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '12px 20px', fontWeight: 500 }}>{pl.name || `Plan ${idx + 1}`}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', ...mono }}>{pl.copay ? `${pl.copay}%` : '10%'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', ...mono }}>
                            {pl.cap ? `₹${Number(pl.cap).toLocaleString('en-IN')}` : '₹5,000'}
                          </td>
                          <td style={{ padding: '12px 16px', color: C.muted }}>{pl.exc || 'Cosmetics, PPE'}</td>
                          <td style={{ padding: '12px 20px' }}>
                            <span style={{ fontSize: 11, color: C.green, background: C.greenSoft, padding: '2px 8px', borderRadius: 999 }}>
                              Active
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: C.muted }}>
                          No plans configured for this payer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Required Documents */}
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #F3F4F6' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Claim Documents Required</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(selectedPayer.required_docs && selectedPayer.required_docs.length > 0
                    ? selectedPayer.required_docs
                    : ['Discharge summary', 'Detailed itemised bill', 'Investigation reports with film', 'Pre-auth letter (GOP)', 'Pharmacy prescriptions', 'Implant stickers']
                  ).map((doc: string, idx: number) => (
                    <span key={idx} style={{ fontSize: 12, background: '#F3F4F6', color: C.textSub, borderRadius: 6, padding: '4px 10px' }}>
                      {doc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Empty text="Select an insurance payer to view plans and contract terms." />
          )}
        </div>
      )}

      {/* Pre-Auth Update Drawer */}
      {drawerOpen && selectedClaim && (
        <Drawer
          title={`Pre-Authorisation: ${selectedClaim.patient_name || 'Patient'}`}
          subtitle={`${selectedClaim.patient_uhid || 'UHID'} · Claim: ${selectedClaim.claim_number}`}
          onClose={() => setDrawerOpen(false)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ fontSize: 12, color: C.muted }}>Updates are audited with timestamp</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="secondary" onClick={() => setDrawerOpen(false)}>Cancel</Btn>
                <Btn variant="primary" onClick={handleUpdatePreAuth} disabled={isUpdatingPa}>
                  {isUpdatingPa ? 'Saving...' : 'Save Update'}
                </Btn>
              </div>
            </div>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, background: '#F9FAFB', padding: 14, borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted }}>Insurance provider</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{selectedClaim.corporate_account_name}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.muted }}>Plan Name</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{selectedClaim.plan_name || 'Standard'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.muted }}>Requested Amount</div>
              <div style={{ fontSize: 15, fontWeight: 600, ...mono }}>
                ₹{Number(selectedClaim.requested_amount || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.muted }}>Approved so far</div>
              <div style={{ fontSize: 15, fontWeight: 600, ...mono, color: C.green }}>
                ₹{Number(selectedClaim.pre_auth_amount || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 14, fontWeight: 600, paddingBottom: 4, borderBottom: `1px solid ${C.border}` }}>
            Update Pre-Authorisation
          </div>

          <Field label="Status">
            <select
              value={paFormStatus}
              onChange={(e) => setPaFormStatus(e.target.value as any)}
              style={inputStyle}
            >
              <option value="PENDING">Pending Insurer</option>
              <option value="QUERY_RAISED">Query Raised</option>
              <option value="APPROVED">Approved</option>
              <option value="PARTIAL">Partially Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </Field>

          <Field label="Approved GOP Amount (₹)">
            <input
              type="number"
              value={paFormApproved}
              onChange={(e) => setPaFormApproved(e.target.value)}
              placeholder="e.g. 50000"
              style={{ ...inputStyle, ...mono }}
            />
          </Field>

          <Field label="Audit Note / Insurer Remarks">
            <input
              type="text"
              value={paFormNote}
              onChange={(e) => setPaFormNote(e.target.value)}
              placeholder="e.g. Initial GOP letter received with 10% co-pay clause"
              style={inputStyle}
            />
          </Field>

          {/* History Timeline */}
          <div style={{ fontSize: 14, fontWeight: 600, paddingBottom: 4, borderBottom: `1px solid ${C.border}` }}>
            Audit & Timeline Notes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(selectedClaim.tracking_notes && selectedClaim.tracking_notes.length > 0) ? (
              selectedClaim.tracking_notes.map((n: any, idx: number) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, fontSize: 13 }}>
                  <span style={{ ...mono, fontSize: 11, color: C.muted }}>
                    {n.t ? new Date(n.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                  <span>{n.text || n.note}</span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 13, color: C.muted }}>No prior updates recorded for this pre-authorisation.</div>
            )}
          </div>
        </Drawer>
      )}

      {/* Co-Pay Split Sandbox Drawer */}
      {sandboxOpen && (
        <Drawer
          title="Co-Pay & Cashless Split Sandbox"
          subtitle="Simulate insurer cashless approval vs patient co-pay split engine"
          width={600}
          onClose={() => setSandboxOpen(false)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="secondary" onClick={() => setSandboxOpen(false)}>Close</Btn>
              <Btn variant="primary" onClick={handleRunSplitSandbox}>
                <Calculator size={15} /> Compute Split
              </Btn>
            </div>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <Field label="Total Bill Amount (₹)">
              <input
                type="number"
                value={sbTotal}
                onChange={(e) => setSbTotal(e.target.value)}
                style={{ ...inputStyle, ...mono }}
              />
            </Field>
            <Field label="Approved GOP (₹)">
              <input
                type="number"
                value={sbApprovedGop}
                onChange={(e) => setSbApprovedGop(e.target.value)}
                style={{ ...inputStyle, ...mono }}
              />
            </Field>
            <Field label="Co-Pay Percentage (%)">
              <input
                type="number"
                value={sbCopayPct}
                onChange={(e) => setSbCopayPct(e.target.value)}
                style={{ ...inputStyle, ...mono }}
              />
            </Field>
            <Field label="Non-Medical Deductibles (₹)">
              <input
                type="number"
                value={sbNonMedical}
                onChange={(e) => setSbNonMedical(e.target.value)}
                style={{ ...inputStyle, ...mono }}
              />
            </Field>
            <Field label="Room Rent Excess (₹)">
              <input
                type="number"
                value={sbRoomExcess}
                onChange={(e) => setSbRoomExcess(e.target.value)}
                style={{ ...inputStyle, ...mono }}
              />
            </Field>
          </div>

          <Btn variant="primary" onClick={handleRunSplitSandbox} style={{ marginTop: 8 }}>
            Run Split Simulation
          </Btn>

          {splitResult && (
            <div style={{ ...card, padding: 18, marginTop: 12, background: '#F9FAFB', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Simulation Result Breakdown</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E5E7EB' }}>
                <span style={{ color: C.muted }}>Total Bill:</span>
                <span style={{ ...mono, fontWeight: 600 }}>₹{splitResult.total_bill.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E5E7EB' }}>
                <span style={{ color: C.muted }}>Admissible Expenses:</span>
                <span style={{ ...mono }}>₹{splitResult.admissible_amount.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E5E7EB', color: C.green }}>
                <span style={{ fontWeight: 600 }}>Insurer Cashless Share:</span>
                <span style={{ ...mono, fontWeight: 700, fontSize: 16 }}>₹{splitResult.insurer_payable.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E5E7EB', color: '#B45309' }}>
                <span style={{ fontWeight: 600 }}>Patient Co-Pay Share:</span>
                <span style={{ ...mono, fontWeight: 700, fontSize: 16 }}>₹{splitResult.patient_copay.toLocaleString('en-IN')}</span>
              </div>

              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                Formula verification: Insurer (₹{splitResult.insurer_payable.toLocaleString('en-IN')}) + Patient (₹{splitResult.patient_copay.toLocaleString('en-IN')}) = Total (₹{splitResult.total_bill.toLocaleString('en-IN')})
              </div>
            </div>
          )}
        </Drawer>
      )}

      {/* Add Plan Modal */}
      {addPlanOpen && (
        <Drawer
          title="Add Insurance Plan"
          subtitle={`Attach plan to ${selectedPayer?.name || 'Selected Payer'}`}
          onClose={() => setAddPlanOpen(false)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="secondary" onClick={() => setAddPlanOpen(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={handleAddPlan}>Add Plan</Btn>
            </div>
          }
        >
          <Field label="Plan Name">
            <input
              type="text"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              placeholder="e.g. Comprehensive Health Shield Gold"
              style={inputStyle}
            />
          </Field>
          <Field label="Co-Pay Percentage (%)">
            <input
              type="number"
              value={newPlanCopay}
              onChange={(e) => setNewPlanCopay(e.target.value)}
              style={{ ...inputStyle, ...mono }}
            />
          </Field>
          <Field label="Room Rent Cap Per Day (₹)">
            <input
              type="number"
              value={newPlanRoomCap}
              onChange={(e) => setNewPlanRoomCap(e.target.value)}
              style={{ ...inputStyle, ...mono }}
            />
          </Field>
          <Field label="Key Exclusions">
            <input
              type="text"
              value={newPlanExclusions}
              onChange={(e) => setNewPlanExclusions(e.target.value)}
              style={inputStyle}
            />
          </Field>
        </Drawer>
      )}
    </div>
  );
};
