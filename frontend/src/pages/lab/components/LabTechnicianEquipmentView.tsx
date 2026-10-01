import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Wrench,
  AlertTriangle,
  Activity,
  Search,
  Plus,
  X,
  Clock,
  Cpu,
  Layers,
} from 'lucide-react';
import { KpiRow, KpiCard } from '../../../components/workspace';
import {
  LabDataStore,
  AnalyzerItem,
  LabActivityItem,
} from '../data/labDataStore';

interface Props {
  onShowToast?: (msg: string) => void;
}

export const LabTechnicianEquipmentView: React.FC<Props> = ({ onShowToast }) => {
  const [analyzers, setAnalyzers] = useState<AnalyzerItem[]>(() => LabDataStore.getAnalyzers());
  const [activity, setActivity] = useState<LabActivityItem[]>(() => LabDataStore.getActivity());
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showQcModal, setShowQcModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [qcAnalyzerId, setQcAnalyzerId] = useState<string>('an-ca600');
  const [qcLevel, setQcLevel] = useState<string>('Normal');
  const [issueDescription, setIssueDescription] = useState<string>('');
  const [issueAnalyzerId, setIssueAnalyzerId] = useState<string>('an-chem7');

  const refreshData = () => {
    setAnalyzers(LabDataStore.getAnalyzers());
    setActivity(LabDataStore.getActivity());
  };

  // KPI Calculations
  const onlineCount = useMemo(
    () => analyzers.filter((a) => a.status === 'Running' || a.status === 'Ready').length,
    [analyzers]
  );
  const maintenanceCount = useMemo(
    () => analyzers.filter((a) => a.status === 'Maintenance').length,
    [analyzers]
  );
  const offlineCount = useMemo(
    () => analyzers.filter((a) => a.status === 'Offline').length,
    [analyzers]
  );
  const qcDueCount = useMemo(
    () => analyzers.filter((a) => a.isQcDue || a.lastQc.includes('Due')).length,
    [analyzers]
  );

  // Filtered analyzers
  const filteredAnalyzers = useMemo(() => {
    return analyzers.filter((a) => {
      if (activeFilter === 'running' && a.status !== 'Running') return false;
      if (activeFilter === 'ready' && a.status !== 'Ready') return false;
      if (activeFilter === 'maintenance' && a.status !== 'Maintenance') return false;
      if (activeFilter === 'offline' && a.status !== 'Offline') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = a.name.toLowerCase().includes(q);
        const matchesSerial = a.serial.toLowerCase().includes(q);
        const matchesSection = a.section.toLowerCase().includes(q);
        return matchesName || matchesSerial || matchesSection;
      }
      return true;
    });
  }, [analyzers, activeFilter, searchQuery]);

  // QC submit handler
  const handleLogQcSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = analyzers.find((a) => a.id === qcAnalyzerId);
    if (!target) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const updated = analyzers.map((a) => {
      if (a.id === qcAnalyzerId) {
        return {
          ...a,
          lastQc: `${timeStr} ✓`,
          isQcDue: false,
        };
      }
      return a;
    });

    LabDataStore.saveAnalyzers(updated);
    LabDataStore.addActivity(`${target.name} QC passed · ${qcLevel} level`, 'You', '#16A34A');
    refreshData();
    setShowQcModal(false);
    onShowToast?.(`✓ QC logged successfully for ${target.name}`);
  };

  // Report Issue submit handler
  const handleReportIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = analyzers.find((a) => a.id === issueAnalyzerId);
    if (!target) return;

    LabDataStore.addActivity(`Fault logged for ${target.name}: ${issueDescription}`, 'You', '#DC2626');
    refreshData();
    setShowIssueModal(false);
    setIssueDescription('');
    onShowToast?.(`🚨 Fault ticket submitted for ${target.name}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. KPI CARDS ROW (§ 9) */}
      <KpiRow>
        <KpiCard
          label="Online & Running"
          value={onlineCount}
          trend="Operational Analyzers"
          trendColor="var(--success)"
          iconBg="var(--success-light)"
          iconColor="var(--success)"
          icon={<CheckCircle2 size={18} />}
        />
        <KpiCard
          label="Under Maintenance"
          value={maintenanceCount}
          trend="Scheduled Calibration"
          trendColor="var(--warning)"
          iconBg="var(--warning-light)"
          iconColor="var(--warning)"
          icon={<Wrench size={18} />}
        />
        <KpiCard
          label="Offline / Fault"
          value={offlineCount}
          trend="Biomed Ticket Active"
          trendColor="var(--danger)"
          iconBg="var(--danger-light)"
          iconColor="var(--danger)"
          valueColor="var(--danger)"
          icon={<AlertTriangle size={18} />}
        />
        <KpiCard
          label="QC Calibration Due"
          value={qcDueCount}
          trend="Next Shift Verification"
          trendColor="var(--primary)"
          iconBg="var(--primary-light)"
          iconColor="var(--primary)"
          icon={<Activity size={18} />}
        />
      </KpiRow>

      {/* 2. PRIMARY CONTENT: ANALYZER BENCH ROSTER (§ 8: 12px Radius Cards) */}
      <div className="card" style={{ padding: '20px' }}>
        {/* Filter and Action Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `All Analyzers (${analyzers.length})` },
              { id: 'running', label: 'Running' },
              { id: 'ready', label: 'Ready' },
              { id: 'maintenance', label: 'Maintenance' },
              { id: 'offline', label: 'Offline' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`btn btn-sm ${activeFilter === f.id ? 'btn-primary' : 'btn-secondary'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="search-input-box" style={{ width: '260px' }}>
              <Search size={16} color="var(--text-light)" />
              <input
                type="text"
                placeholder="Search analyzer, serial..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setShowQcModal(true)}
            >
              Log QC Run
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setShowIssueModal(true)}
            >
              Report Fault
            </button>
          </div>
        </div>

        {/* Equipment Card Grid (Matching Nurse Day-Care Beds Pattern) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredAnalyzers.map((a) => {
            const isOffline = a.status === 'Offline';
            const isMaint = a.status === 'Maintenance';
            const isRunning = a.status === 'Running';

            return (
              <div
                key={a.id}
                style={{
                  padding: '18px',
                  borderRadius: '12px',
                  border: `1px solid ${isOffline ? 'var(--danger)' : 'var(--border-color)'}`,
                  backgroundColor: isOffline ? '#fff8f8' : '#ffffff',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--secondary)' }}>
                      {a.name}
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      S/N: {a.serial} • Reagent: {a.reagentPercent}%
                    </div>
                  </div>

                  <span
                    className={`badge ${
                      isRunning
                        ? 'badge-success'
                        : a.status === 'Ready'
                        ? 'badge-info'
                        : isMaint
                        ? 'badge-warning'
                        : 'badge-danger'
                    }`}
                  >
                    {a.status}
                  </span>
                </div>

                {/* Specs Row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--gray-50)',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Section</div>
                    <strong style={{ color: 'var(--secondary)' }}>{a.section}</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>In Queue</div>
                    <strong style={{ color: 'var(--secondary)' }}>{a.queuedCount} tests</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Last QC</div>
                    <strong style={{ color: a.isQcDue ? 'var(--danger)' : 'var(--success)' }}>
                      {a.lastQc}
                    </strong>
                  </div>
                </div>

                {/* Assigned Tests */}
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    SUPPORTED TESTS
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--secondary)', lineHeight: 1.4 }}>
                    {a.testsCovered}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setQcAnalyzerId(a.id);
                      setShowQcModal(true);
                    }}
                  >
                    Run QC
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setIssueAnalyzerId(a.id);
                      setShowIssueModal(true);
                    }}
                  >
                    Log Issue
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* QC Run Modal */}
      {showQcModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div className="card" style={{ width: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Log Quality Control Run</h3>
              <button
                type="button"
                onClick={() => setShowQcModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLogQcSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Select Analyzer
                </label>
                <select
                  value={qcAnalyzerId}
                  onChange={(e) => setQcAnalyzerId(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    padding: '0 10px',
                    fontSize: '13px',
                  }}
                >
                  {analyzers.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.section})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  QC Control Level
                </label>
                <select
                  value={qcLevel}
                  onChange={(e) => setQcLevel(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    padding: '0 10px',
                    fontSize: '13px',
                  }}
                >
                  <option value="Normal">Level 2 (Normal) · Lot #QC-2026-N</option>
                  <option value="Low">Level 1 (Low Abnormal) · Lot #QC-2026-L</option>
                  <option value="High">Level 3 (High Abnormal) · Lot #QC-2026-H</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowQcModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Verify & Pass QC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Issue Modal */}
      {showIssueModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div className="card" style={{ width: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Report Analyzer Fault</h3>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReportIssueSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Analyzer
                </label>
                <select
                  value={issueAnalyzerId}
                  onChange={(e) => setIssueAnalyzerId(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    padding: '0 10px',
                    fontSize: '13px',
                  }}
                >
                  {analyzers.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.section})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Issue Description
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe error code, aspiration failure, optical sensor flag, or mechanical jam..."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    padding: '10px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowIssueModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  Dispatch Biomed Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
