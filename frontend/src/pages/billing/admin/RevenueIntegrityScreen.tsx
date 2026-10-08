import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldAlert, AlertTriangle, CheckCircle2, XCircle, Search, RefreshCw,
  Play, FileText, ArrowUpRight, ShieldCheck, UserCheck, Eye, Sparkles, Filter
} from 'lucide-react';
import {
  billingService,
  RevenueIntegrityOverviewData,
  RevenueLeakageAlertItem,
  FraudRiskSignalItem,
  RevenueInvestigationCaseItem
} from '../../../services/billingService';
import {
  C, mono, card, PageHeader, KpiCard, Btn, Drawer, Field, inputStyle, Callout, Empty, apiError
} from '../executive/executiveUi';

export const RevenueIntegrityScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Leakage' | 'Risk signals' | 'Investigations'>('Leakage');
  const [overview, setOverview] = useState<RevenueIntegrityOverviewData | null>(null);
  const [leakages, setLeakages] = useState<RevenueLeakageAlertItem[]>([]);
  const [riskSignals, setRiskSignals] = useState<FraudRiskSignalItem[]>([]);
  const [investigations, setInvestigations] = useState<RevenueInvestigationCaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters - Leakage
  const [leakageSearch, setLeakageSearch] = useState('');
  const [leakageStatusFilter, setLeakageStatusFilter] = useState<string>('ALL');
  const [leakageDeptFilter, setLeakageDeptFilter] = useState<string>('ALL');

  // Filters - Signals
  const [signalSeverityFilter, setSignalSeverityFilter] = useState<string>('ALL');
  const [signalAckFilter, setSignalAckFilter] = useState<string>('ALL');

  // Filters - Investigations
  const [invStatusFilter, setInvStatusFilter] = useState<string>('ALL');
  const [invSearch, setInvSearch] = useState('');

  // Modals & Drawers
  const [dismissModalOpen, setDismissModalOpen] = useState(false);
  const [selectedAlertForDismiss, setSelectedAlertForDismiss] = useState<RevenueLeakageAlertItem | null>(null);
  const [dismissReason, setDismissReason] = useState('');
  const [isDismissing, setIsDismissing] = useState(false);

  // Open Investigation Modal
  const [newCaseModalOpen, setNewCaseModalOpen] = useState(false);
  const [newCaseSubject, setNewCaseSubject] = useState('');
  const [newCaseFindings, setNewCaseFindings] = useState('');
  const [linkedAlertId, setLinkedAlertId] = useState<string | undefined>(undefined);
  const [linkedSignalId, setLinkedSignalId] = useState<string | undefined>(undefined);
  const [isCreatingCase, setIsCreatingCase] = useState(false);

  // Update Investigation Docket Drawer
  const [selectedCase, setSelectedCase] = useState<RevenueInvestigationCaseItem | null>(null);
  const [caseDrawerOpen, setCaseDrawerOpen] = useState(false);
  const [caseStatus, setCaseStatus] = useState<string>('OPEN');
  const [caseFindings, setCaseFindings] = useState('');
  const [caseRecoveredAmount, setCaseRecoveredAmount] = useState<string>('0');
  const [isUpdatingCase, setIsUpdatingCase] = useState(false);

  // Fetch overview & lists
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ovData, lkgData, sigData, invData] = await Promise.all([
        billingService.getRevenueIntegrityOverview(),
        billingService.getRevenueLeakages(),
        billingService.getFraudRiskSignals(),
        billingService.getRevenueInvestigations()
      ]);
      setOverview(ovData);
      setLeakages(lkgData);
      setRiskSignals(sigData);
      setInvestigations(invData);
    } catch (err) {
      setError(apiError(err, 'Failed to load revenue integrity data.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions: Leakage Scanners
  const handleScanLeakage = async () => {
    setIsScanning(true);
    setNotice(null);
    setError(null);
    try {
      const res = await billingService.scanRevenueLeakage();
      setNotice(`Scanner completed. ${res.new_alerts_count} new leakage alert(s) detected (${res.total_open_alerts} total open).`);
      await loadData();
    } catch (err) {
      setError(apiError(err, 'Failed to run revenue leakage scanner.'));
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanFraud = async () => {
    setIsScanning(true);
    setNotice(null);
    setError(null);
    try {
      const res = await billingService.scanFraudRiskSignals();
      setNotice(`Fraud detector finished. ${res.new_signals_count} new risk anomaly signal(s) flagged.`);
      await loadData();
    } catch (err) {
      setError(apiError(err, 'Failed to scan fraud risk signals.'));
    } finally {
      setIsScanning(false);
    }
  };

  const handleConvertCharge = async (alert: RevenueLeakageAlertItem) => {
    try {
      await billingService.convertLeakageToCharge(alert.id);
      setNotice(`Alert converted to active billable charge for patient ${alert.patient_name || alert.patient_uhid}.`);
      await loadData();
    } catch (err) {
      setError(apiError(err, 'Could not convert leakage alert to charge.'));
    }
  };

  const handleOpenDismissModal = (alert: RevenueLeakageAlertItem) => {
    setSelectedAlertForDismiss(alert);
    setDismissReason('');
    setDismissModalOpen(true);
  };

  const handleConfirmDismiss = async () => {
    if (!selectedAlertForDismiss) return;
    if (dismissReason.trim().length < 5) {
      setError('Dismissal reason must be at least 5 characters long.');
      return;
    }
    setIsDismissing(true);
    try {
      await billingService.dismissLeakage(selectedAlertForDismiss.id, dismissReason.trim());
      setDismissModalOpen(false);
      setSelectedAlertForDismiss(null);
      setNotice('Alert marked as false positive and dismissed.');
      await loadData();
    } catch (err) {
      setError(apiError(err, 'Failed to dismiss leakage alert.'));
    } finally {
      setIsDismissing(false);
    }
  };

  const handleAcknowledgeSignal = async (signal: FraudRiskSignalItem) => {
    try {
      await billingService.acknowledgeRiskSignal(signal.id);
      setNotice(`Signal ${signal.signal_code} acknowledged.`);
      await loadData();
    } catch (err) {
      setError(apiError(err, 'Failed to acknowledge signal.'));
    }
  };

  const handleStartInvestigationFromAlert = (alert: RevenueLeakageAlertItem) => {
    setLinkedAlertId(alert.id);
    setLinkedSignalId(undefined);
    setNewCaseSubject(`Investigation: ${alert.leakage_type_display} - ${alert.patient_name || alert.patient_uhid}`);
    setNewCaseFindings(`Initiated from Leakage Alert: ${alert.description}\nSource: ${alert.source_event_reference}`);
    setNewCaseModalOpen(true);
  };

  const handleStartInvestigationFromSignal = (signal: FraudRiskSignalItem) => {
    setLinkedSignalId(signal.id);
    setLinkedAlertId(undefined);
    setNewCaseSubject(`Investigation: ${signal.signal_code} - ${signal.description.slice(0, 40)}`);
    setNewCaseFindings(`Flagged risk pattern: ${signal.description}\nOccurrences in 30d: ${signal.occurrences_count_30d}\nConfidence: ${signal.confidence_score}%`);
    setNewCaseModalOpen(true);
  };

  const handleCreateCase = async () => {
    if (!newCaseSubject.trim()) {
      setError('Case subject is required.');
      return;
    }
    setIsCreatingCase(true);
    try {
      const created = await billingService.openRevenueInvestigation({
        subject: newCaseSubject.trim(),
        leakage_alert_id: linkedAlertId,
        risk_signal_id: linkedSignalId,
        initial_findings: newCaseFindings.trim()
      });
      setNewCaseModalOpen(false);
      setNotice(`Docket ${created.case_number} opened successfully.`);
      await loadData();
    } catch (err) {
      setError(apiError(err, 'Failed to open investigation case.'));
    } finally {
      setIsCreatingCase(false);
    }
  };

  const handleOpenCaseDrawer = (item: RevenueInvestigationCaseItem) => {
    setSelectedCase(item);
    setCaseStatus(item.status);
    setCaseFindings(item.findings || '');
    setCaseRecoveredAmount(item.recovered_amount ? String(item.recovered_amount) : '0');
    setCaseDrawerOpen(true);
  };

  const handleSaveCaseUpdate = async () => {
    if (!selectedCase) return;
    setIsUpdatingCase(true);
    try {
      await billingService.updateRevenueInvestigation(selectedCase.id, {
        status: caseStatus,
        findings: caseFindings,
        recovered_amount: parseFloat(caseRecoveredAmount) || 0
      });
      setCaseDrawerOpen(false);
      setNotice(`Case ${selectedCase.case_number} docket updated.`);
      await loadData();
    } catch (err) {
      setError(apiError(err, 'Failed to update investigation docket.'));
    } finally {
      setIsUpdatingCase(false);
    }
  };

  // Filtered Leakages
  const filteredLeakages = leakages.filter((l) => {
    const matchesSearch =
      leakageSearch === '' ||
      l.patient_name?.toLowerCase().includes(leakageSearch.toLowerCase()) ||
      l.patient_uhid?.toLowerCase().includes(leakageSearch.toLowerCase()) ||
      l.description?.toLowerCase().includes(leakageSearch.toLowerCase()) ||
      l.source_event_reference?.toLowerCase().includes(leakageSearch.toLowerCase());
    const matchesStatus = leakageStatusFilter === 'ALL' || l.status === leakageStatusFilter;
    const matchesDept = leakageDeptFilter === 'ALL' || l.department === leakageDeptFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });

  // Filtered Signals
  const filteredSignals = riskSignals.filter((s) => {
    const matchesSev = signalSeverityFilter === 'ALL' || s.severity === signalSeverityFilter;
    const matchesAck =
      signalAckFilter === 'ALL' ||
      (signalAckFilter === 'ACK' && s.is_acknowledged) ||
      (signalAckFilter === 'UNACK' && !s.is_acknowledged);
    return matchesSev && matchesAck;
  });

  // Filtered Investigations
  const filteredInvestigations = investigations.filter((inv) => {
    const matchesStatus = invStatusFilter === 'ALL' || inv.status === invStatusFilter;
    const matchesSearch =
      invSearch === '' ||
      inv.case_number.toLowerCase().includes(invSearch.toLowerCase()) ||
      inv.subject.toLowerCase().includes(invSearch.toLowerCase()) ||
      (inv.findings && inv.findings.toLowerCase().includes(invSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const kpis = overview?.kpis || {
    amount_at_risk: 0,
    open_leakage_items: 0,
    high_risk_signals: 0,
    investigations_open: 0,
    recovered_mtd: 0
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return { fg: C.red, bg: C.redSoft, border: C.redBorder };
    if (score >= 40) return { fg: C.amber, bg: C.amberSoft, border: C.amberBorder };
    return { fg: C.green, bg: C.greenSoft, border: C.greenBorder };
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return { fg: '#991B1B', bg: '#FEE2E2', border: '#F87171' };
      case 'HIGH':
        return { fg: C.red, bg: C.redSoft, border: C.redBorder };
      case 'MEDIUM':
        return { fg: C.amber, bg: C.amberSoft, border: C.amberBorder };
      default:
        return { fg: C.indigo, bg: C.indigoSoft, border: '#C7D2FE' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <PageHeader
        title="Revenue Integrity"
        subtitle="Find revenue that was earned but not billed, and behaviour that looks wrong."
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Btn
              variant="secondary"
              onClick={loadData}
              disabled={isLoading || isScanning}
              title="Refresh queues"
            >
              <RefreshCw size={15} className={isLoading ? 'spin' : ''} />
              Refresh
            </Btn>
            <Btn
              variant="secondary"
              onClick={handleScanFraud}
              disabled={isScanning}
              style={{ color: C.amber, borderColor: C.amberBorder }}
            >
              <ShieldAlert size={15} />
              Run Fraud Detector
            </Btn>
            <Btn
              variant="primary"
              onClick={handleScanLeakage}
              disabled={isScanning}
            >
              <Play size={15} />
              Run Leakage Scanner
            </Btn>
          </div>
        }
      />

      {/* Notifications */}
      {error && (
        <div style={{ position: 'relative' }}>
          <Callout tone="red" title="Error" icon={<XCircle size={16} />}>
            {error}
          </Callout>
          <button
            onClick={() => setError(null)}
            style={{ position: 'absolute', right: 12, top: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: C.red, fontSize: 13 }}
          >
            Dismiss
          </button>
        </div>
      )}
      {notice && (
        <div style={{ position: 'relative' }}>
          <Callout tone="indigo" title="System Notice" icon={<Sparkles size={16} />}>
            {notice}
          </Callout>
          <button
            onClick={() => setNotice(null)}
            style={{ position: 'absolute', right: 12, top: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: C.indigo, fontSize: 13 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 5 KPIs Row as per A-03 Specification */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <KpiCard
          label="Amount at risk"
          value={`₹${kpis.amount_at_risk.toLocaleString('en-IN')}`}
          sub="Unbilled & flagged items"
          icon={<AlertTriangle size={18} color={C.red} />}
        />
        <KpiCard
          label="Open leakage items"
          value={kpis.open_leakage_items}
          sub="Awaiting action"
          icon={<AlertTriangle size={18} color={C.amber} />}
        />
        <KpiCard
          label="High-risk signals"
          value={kpis.high_risk_signals}
          sub="Cashier/counter anomalies"
          icon={<ShieldAlert size={18} color={C.red} />}
        />
        <KpiCard
          label="Investigations open"
          value={kpis.investigations_open}
          sub="Active dockets"
          icon={<FileText size={18} color={C.primary} />}
        />
        <KpiCard
          label="Recovered MTD"
          value={`₹${kpis.recovered_mtd.toLocaleString('en-IN')}`}
          sub="Resolved back to ledger"
          trend="+100%"
          trendColor={C.green}
          icon={<CheckCircle2 size={18} color={C.green} />}
        />
      </div>

      {/* Tabs Row */}
      <div style={{ display: 'flex', gap: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
        {(['Leakage', 'Risk signals', 'Investigations'] as const).map((tab) => {
          const isActive = activeTab === tab;
          let count = 0;
          if (tab === 'Leakage') count = kpis.open_leakage_items;
          if (tab === 'Risk signals') count = kpis.high_risk_signals;
          if (tab === 'Investigations') count = kpis.investigations_open;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: isActive ? C.primarySoft : 'transparent',
                color: isActive ? C.primary : C.textSub,
                border: `1px solid ${isActive ? C.primary : 'transparent'}`,
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              {tab === 'Leakage' && <AlertTriangle size={15} />}
              {tab === 'Risk signals' && <ShieldAlert size={15} />}
              {tab === 'Investigations' && <FileText size={15} />}
              {tab}
              {count > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    background: isActive ? C.primary : C.border,
                    color: isActive ? '#fff' : C.text,
                    padding: '1px 6px',
                    borderRadius: 999,
                    fontWeight: 700
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: REVENUE LEAKAGE QUEUE */}
      {activeTab === 'Leakage' && (
        <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: 260 }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: C.muted }} />
                <input
                  type="text"
                  placeholder="Search patient, UHID, source ref..."
                  value={leakageSearch}
                  onChange={(e) => setLeakageSearch(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 32 }}
                />
              </div>

              <select
                value={leakageStatusFilter}
                onChange={(e) => setLeakageStatusFilter(e.target.value)}
                style={{ ...inputStyle, width: 'auto', minWidth: 140 }}
              >
                <option value="ALL">All Statuses</option>
                <option value="DETECTED">Detected (Open)</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="CONVERTED">Converted to Charge</option>
                <option value="DISMISSED">Dismissed</option>
                <option value="INVESTIGATING">Under Investigation</option>
              </select>

              <select
                value={leakageDeptFilter}
                onChange={(e) => setLeakageDeptFilter(e.target.value)}
                style={{ ...inputStyle, width: 'auto', minWidth: 140 }}
              >
                <option value="ALL">All Departments</option>
                <option value="OPD">OPD</option>
                <option value="IPD">IPD</option>
                <option value="LAB">Laboratory</option>
                <option value="RADIOLOGY">Radiology</option>
                <option value="PHARMACY">Pharmacy</option>
                <option value="OT">Operation Theatre</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredLeakages.length === 0 ? (
            <Empty
              text="No revenue leakage alerts found. Run the leakage scanner or clear filters to check for unbilled procedures and discharges."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, textAlign: 'left', color: C.muted }}>
                    <th style={{ padding: '10px 12px' }}>Type</th>
                    <th style={{ padding: '10px 12px' }}>Department</th>
                    <th style={{ padding: '10px 12px' }}>Patient</th>
                    <th style={{ padding: '10px 12px' }}>Source Ref</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Est. Amount</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Risk Score</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                    <th style={{ padding: '10px 12px' }}>Detected</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeakages.map((l) => {
                    const scoreStyle = getRiskScoreColor(l.risk_score);
                    const isClosed = ['CONVERTED', 'DISMISSED'].includes(l.status);

                    return (
                      <tr
                        key={l.id}
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontWeight: 600, color: C.text }}>
                            {l.leakage_type_display}
                          </span>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{l.description}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#F3F4F6', color: C.textSub }}>
                            {l.department_display || l.department}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 500, color: C.text }}>{l.patient_name || '—'}</div>
                          <div style={{ fontSize: 11, color: C.muted, ...mono }}>{l.patient_uhid}</div>
                        </td>
                        <td style={{ padding: '12px', ...mono, fontSize: 12, color: C.muted }}>
                          {l.source_event_reference}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, ...mono, color: C.text }}>
                          ₹{Number(l.estimated_amount).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: scoreStyle.fg,
                              background: scoreStyle.bg,
                              border: `1px solid ${scoreStyle.border}`,
                              padding: '2px 8px',
                              borderRadius: 999
                            }}
                          >
                            {l.risk_score}/100
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background:
                                l.status === 'CONVERTED'
                                  ? C.greenSoft
                                  : l.status === 'DISMISSED'
                                  ? '#F3F4F6'
                                  : C.amberSoft,
                              color:
                                l.status === 'CONVERTED'
                                  ? C.green
                                  : l.status === 'DISMISSED'
                                  ? C.muted
                                  : C.amber
                            }}
                          >
                            {l.status_display}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: 12, color: C.muted }}>
                          {new Date(l.detected_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            {!isClosed && (
                              <>
                                <button
                                  onClick={() => handleConvertCharge(l)}
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    background: C.greenSoft,
                                    color: C.green,
                                    border: `1px solid ${C.greenBorder}`,
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    cursor: 'pointer'
                                  }}
                                  title="Add to active billable charge"
                                >
                                  Convert Charge
                                </button>
                                <button
                                  onClick={() => handleOpenDismissModal(l)}
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    background: '#F9FAFB',
                                    color: C.muted,
                                    border: `1px solid ${C.border}`,
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    cursor: 'pointer'
                                  }}
                                  title="Dismiss as false positive"
                                >
                                  Dismiss
                                </button>
                                <button
                                  onClick={() => handleStartInvestigationFromAlert(l)}
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    background: C.primarySoft,
                                    color: C.primary,
                                    border: `1px solid #BFDBFE`,
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    cursor: 'pointer'
                                  }}
                                  title="Open docket investigation"
                                >
                                  Investigate
                                </button>
                              </>
                            )}
                            {isClosed && (
                              <span style={{ fontSize: 12, color: C.muted }}>
                                {l.status === 'CONVERTED' ? 'Charge Generated' : 'Dismissed'}
                              </span>
                            )}
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
      )}

      {/* TAB 2: FRAUD RISK SIGNALS */}
      {activeTab === 'Risk signals' && (
        <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <select
              value={signalSeverityFilter}
              onChange={(e) => setSignalSeverityFilter(e.target.value)}
              style={{ ...inputStyle, width: 'auto', minWidth: 160 }}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={signalAckFilter}
              onChange={(e) => setSignalAckFilter(e.target.value)}
              style={{ ...inputStyle, width: 'auto', minWidth: 160 }}
            >
              <option value="ALL">All Signals</option>
              <option value="UNACK">Unacknowledged Only</option>
              <option value="ACK">Acknowledged</option>
            </select>
          </div>

          {/* Cards Grid */}
          {filteredSignals.length === 0 ? (
            <Empty
              text="No risk anomaly signals detected. Cashier refund volumes, discount clusters, and void patterns are within expected operational thresholds."
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {filteredSignals.map((sig) => {
                const badge = getSeverityBadge(sig.severity);
                return (
                  <div
                    key={sig.id}
                    style={{
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: 16,
                      background: sig.is_acknowledged ? '#FAFBFD' : '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            color: badge.fg,
                            background: badge.bg,
                            border: `1px solid ${badge.border}`
                          }}
                        >
                          {sig.severity_display} · {sig.signal_code}
                        </span>
                        <span style={{ fontSize: 12, color: C.muted }}>
                          {new Date(sig.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                        {sig.description}
                      </div>

                      <div style={{ fontSize: 12, color: C.textSub, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {sig.flagged_user_name && (
                          <div>
                            <b>Cashier:</b> {sig.flagged_user_name}
                          </div>
                        )}
                        {sig.flagged_counter_name && (
                          <div>
                            <b>Counter:</b> {sig.flagged_counter_name}
                          </div>
                        )}
                        <div>
                          <b>30-Day Occurrences:</b> {sig.occurrences_count_30d} incident(s)
                        </div>
                        <div>
                          <b>Model Confidence:</b> {sig.confidence_score}%
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {sig.is_acknowledged ? (
                        <span style={{ fontSize: 12, color: C.green, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={14} /> Acknowledged
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAcknowledgeSignal(sig)}
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            background: '#F3F4F6',
                            color: C.textSub,
                            border: `1px solid ${C.border}`,
                            padding: '4px 10px',
                            borderRadius: 6,
                            cursor: 'pointer'
                          }}
                        >
                          Acknowledge
                        </button>
                      )}

                      <button
                        onClick={() => handleStartInvestigationFromSignal(sig)}
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          background: C.primarySoft,
                          color: C.primary,
                          border: `1px solid #BFDBFE`,
                          padding: '4px 10px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <FileText size={13} /> Open Docket
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVESTIGATIONS */}
      {activeTab === 'Investigations' && (
        <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: 260 }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: C.muted }} />
                <input
                  type="text"
                  placeholder="Search case #, subject, findings..."
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 32 }}
                />
              </div>

              <select
                value={invStatusFilter}
                onChange={(e) => setInvStatusFilter(e.target.value)}
                style={{ ...inputStyle, width: 'auto', minWidth: 160 }}
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <Btn
              variant="primary"
              onClick={() => {
                setLinkedAlertId(undefined);
                setLinkedSignalId(undefined);
                setNewCaseSubject('');
                setNewCaseFindings('');
                setNewCaseModalOpen(true);
              }}
            >
              <FileText size={15} />
              Open New Docket
            </Btn>
          </div>

          {/* Table */}
          {filteredInvestigations.length === 0 ? (
            <Empty
              text="No investigation dockets found. Open a new docket or escalate an unresolved leakage item or fraud pattern."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, textAlign: 'left', color: C.muted }}>
                    <th style={{ padding: '10px 12px' }}>Case Number</th>
                    <th style={{ padding: '10px 12px' }}>Subject</th>
                    <th style={{ padding: '10px 12px' }}>Investigator</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Recovered</th>
                    <th style={{ padding: '10px 12px' }}>Created</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvestigations.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '12px', fontWeight: 600, ...mono, color: C.primary }}>
                        {inv.case_number}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 500, color: C.text }}>{inv.subject}</div>
                        {inv.findings && (
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {inv.findings}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: C.textSub }}>
                        {inv.assigned_investigator_name || 'Unassigned'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background:
                              inv.status === 'RESOLVED'
                                ? C.greenSoft
                                : inv.status === 'CLOSED'
                                ? '#F3F4F6'
                                : C.indigoSoft,
                            color:
                              inv.status === 'RESOLVED'
                                ? C.green
                                : inv.status === 'CLOSED'
                                ? C.muted
                                : C.indigo
                          }}
                        >
                          {inv.status_display}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, ...mono, color: C.text }}>
                        ₹{Number(inv.recovered_amount).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px', fontSize: 12, color: C.muted }}>
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <Btn
                          variant="secondary"
                          style={{ height: 30, padding: '0 10px', fontSize: 12 }}
                          onClick={() => handleOpenCaseDrawer(inv)}
                        >
                          Manage Docket
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DISMISS MODAL (False Positive) */}
      {dismissModalOpen && selectedAlertForDismiss && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16
          }}
        >
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 480, width: '100%', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: C.text }}>
              Dismiss Leakage Alert
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
              Mark this item as a false positive. A clinical or administrative justification is required.
            </p>

            <div style={{ background: C.bg, padding: 12, borderRadius: 8, fontSize: 12, color: C.textSub }}>
              <div><b>Type:</b> {selectedAlertForDismiss.leakage_type_display}</div>
              <div><b>Patient:</b> {selectedAlertForDismiss.patient_name || selectedAlertForDismiss.patient_uhid}</div>
              <div><b>Est. Amount:</b> ₹{Number(selectedAlertForDismiss.estimated_amount).toLocaleString('en-IN')}</div>
            </div>

            <Field label="Reason for Dismissal (mandatory, min 5 chars)">
              <textarea
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                placeholder="e.g. Order was cancelled in system prior to specimen collection..."
                rows={3}
                style={{ ...inputStyle, height: 'auto', padding: 10, fontFamily: 'inherit' }}
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <Btn variant="secondary" onClick={() => setDismissModalOpen(false)}>
                Cancel
              </Btn>
              <Btn
                variant="danger"
                disabled={isDismissing || dismissReason.trim().length < 5}
                onClick={handleConfirmDismiss}
              >
                Confirm Dismissal
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* OPEN INVESTIGATION MODAL */}
      {newCaseModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16
          }}
        >
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 520, width: '100%', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: C.text }}>
              Open Investigation Docket
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
              Initiate an official audit docket tracked under Revenue Integrity governance.
            </p>

            <Field label="Case Subject">
              <input
                type="text"
                value={newCaseSubject}
                onChange={(e) => setNewCaseSubject(e.target.value)}
                placeholder="e.g. Investigation: Unbilled OT procedure post discharge"
                style={inputStyle}
              />
            </Field>

            <Field label="Initial Findings / Context">
              <textarea
                value={newCaseFindings}
                onChange={(e) => setNewCaseFindings(e.target.value)}
                placeholder="Details of discrepancies, preliminary departmental discussions..."
                rows={4}
                style={{ ...inputStyle, height: 'auto', padding: 10, fontFamily: 'inherit' }}
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <Btn variant="secondary" onClick={() => setNewCaseModalOpen(false)}>
                Cancel
              </Btn>
              <Btn
                variant="primary"
                disabled={isCreatingCase || !newCaseSubject.trim()}
                onClick={handleCreateCase}
              >
                Create Docket
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE DOCKET DRAWER */}
      {caseDrawerOpen && selectedCase && (
        <Drawer
          onClose={() => setCaseDrawerOpen(false)}
          title={`Docket: ${selectedCase.case_number}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
              {selectedCase.subject}
            </div>

            <div style={{ background: C.bg, padding: 12, borderRadius: 8, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div><b>Investigator:</b> {selectedCase.assigned_investigator_name || 'Unassigned'}</div>
              <div><b>Opened At:</b> {new Date(selectedCase.created_at).toLocaleString()}</div>
              <div><b>Current Status:</b> {selectedCase.status_display}</div>
            </div>

            <Field label="Update Docket Status">
              <select
                value={caseStatus}
                onChange={(e) => setCaseStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </Field>

            <Field label="Recovered Revenue Amount (₹)">
              <input
                type="number"
                value={caseRecoveredAmount}
                onChange={(e) => setCaseRecoveredAmount(e.target.value)}
                placeholder="0.00"
                style={inputStyle}
              />
            </Field>

            <Field label="Investigation Findings & Audit Resolution Note">
              <textarea
                value={caseFindings}
                onChange={(e) => setCaseFindings(e.target.value)}
                rows={6}
                placeholder="Record final outcomes, recovered invoices, disciplinary or billing matrix actions..."
                style={{ ...inputStyle, height: 'auto', padding: 10, fontFamily: 'inherit' }}
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Btn variant="secondary" onClick={() => setCaseDrawerOpen(false)}>
                Close
              </Btn>
              <Btn
                variant="primary"
                disabled={isUpdatingCase}
                onClick={handleSaveCaseUpdate}
              >
                Save Docket Changes
              </Btn>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
};
