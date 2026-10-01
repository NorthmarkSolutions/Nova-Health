import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Search,
  X,
  FileCheck,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { KpiRow, KpiCard } from '../../../components/workspace';
import {
  LabDataStore,
  LabQueueOrder,
} from '../data/labDataStore';

interface Props {
  orders: LabQueueOrder[];
  onOrderUpdated: () => void;
  onShowToast?: (msg: string) => void;
}

export const PathologistReviewQueueView: React.FC<Props> = ({
  orders,
  onOrderUpdated,
  onShowToast,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected order for Slide-out Review Drawer
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);

  // Interpretation state
  const [interpretation, setInterpretation] = useState<string>(
    'Critical electrolyte derangement and worsening renal markers vs prior baseline. ACE inhibitor contribution suspected. Haemolysis excluded.'
  );

  // Modals
  const [showCriticalConfirm, setShowCriticalConfirm] = useState(false);
  const [showRetestModal, setShowRetestModal] = useState(false);
  const [retestReason, setRetestReason] = useState(
    'Sample hemolyzed or lipemic interference suspected. Repeat specimen requested.'
  );

  // Filter orders in reviewable stages
  const reviewOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.stage === 'PENDING_REVIEW' ||
        o.stage === 'RESULT_ENTERED' ||
        o.stage === 'PROCESSING'
    );
  }, [orders]);

  const activeReviewOrder = useMemo(() => {
    if (!reviewOrderId) return null;
    return reviewOrders.find((o) => o.id === reviewOrderId) || null;
  }, [reviewOrders, reviewOrderId]);

  // Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setReviewOrderId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // KPIs
  const criticalOrdersCount = useMemo(
    () => reviewOrders.filter((o) => o.isCritical).length,
    [reviewOrders]
  );
  const abnormalOrdersCount = useMemo(
    () =>
      reviewOrders.filter(
        (o) =>
          !o.isCritical &&
          o.parameters.some(
            (p) => p.observedValue !== null && (p.observedValue < p.low || p.observedValue > p.high)
          )
      ).length,
    [reviewOrders]
  );
  const normalOrdersCount = useMemo(
    () =>
      reviewOrders.filter(
        (o) =>
          !o.isCritical &&
          o.parameters.every(
            (p) =>
              p.observedValue === null ||
              (p.observedValue >= p.low && p.observedValue <= p.high)
          )
      ).length,
    [reviewOrders]
  );
  const retestCount = useMemo(
    () => reviewOrders.filter((o) => o.returnedForRetest).length,
    [reviewOrders]
  );

  const filteredOrders = useMemo(() => {
    return reviewOrders.filter((ord) => {
      if (activeFilter === 'critical') return ord.isCritical;
      if (activeFilter === 'abnormal') {
        return (
          !ord.isCritical &&
          ord.parameters.some(
            (p) => p.observedValue !== null && (p.observedValue < p.low || p.observedValue > p.high)
          )
        );
      }
      if (activeFilter === 'normal') {
        return (
          !ord.isCritical &&
          ord.parameters.every(
            (p) =>
              p.observedValue === null ||
              (p.observedValue >= p.low && p.observedValue <= p.high)
          )
        );
      }
      if (activeFilter === 'retest') return ord.returnedForRetest;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          ord.patientName.toLowerCase().includes(q) ||
          ord.uhid.toLowerCase().includes(q) ||
          ord.testName.toLowerCase().includes(q) ||
          ord.doctorName.toLowerCase().includes(q) ||
          ord.orderNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [reviewOrders, activeFilter, searchQuery]);

  // Actions
  const handleApproveSignOff = () => {
    if (!activeReviewOrder) return;
    const report = LabDataStore.signOffOrder(
      activeReviewOrder.id,
      interpretation,
      'Dr. Kavitha Menon, MD'
    );
    setReviewOrderId(null);
    onOrderUpdated();
    onShowToast?.(`✓ Report ${report?.reportNumber} signed & dispatched to ${activeReviewOrder.doctorName}!`);
  };

  const handleRequestRetestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReviewOrder) return;
    LabDataStore.requestRetest(activeReviewOrder.id, retestReason, 'Dr. Kavitha Menon, MD');
    setShowRetestModal(false);
    setReviewOrderId(null);
    onOrderUpdated();
    onShowToast?.(`↺ Re-test requested for ${activeReviewOrder.patientName}. Returned to technician queue.`);
  };

  const handleConfirmCritical = () => {
    if (!activeReviewOrder) return;
    LabDataStore.flagCritical(activeReviewOrder.id, interpretation, 'Dr. Kavitha Menon, MD');
    setShowCriticalConfirm(false);
    onOrderUpdated();
    onShowToast?.(`🚨 URGENT CRITICAL ALERT logged! Notification dispatched to ${activeReviewOrder.doctorName}.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. KPI CARDS ROW (§ 9) */}
      <KpiRow>
        <KpiCard
          label="Awaiting Review"
          value={reviewOrders.length}
          trend="Pending Validation"
          trendColor="var(--warning)"
          iconBg="var(--warning-light)"
          iconColor="var(--warning)"
          icon={<Clock size={18} />}
        />
        <KpiCard
          label="Critical Flags"
          value={criticalOrdersCount}
          trend="Urgent Alert Required"
          trendColor="var(--danger)"
          iconBg="var(--danger-light)"
          iconColor="var(--danger)"
          valueColor="var(--danger)"
          icon={<AlertTriangle size={18} />}
        />
        <KpiCard
          label="Signed Off Today"
          value={38}
          trend="Dispatched to EHR"
          trendColor="var(--success)"
          iconBg="var(--success-light)"
          iconColor="var(--success)"
          icon={<CheckCircle2 size={18} />}
        />
        <KpiCard
          label="Avg Turnaround"
          value="24m"
          trend="Within SLA Target"
          trendColor="var(--primary)"
          iconBg="var(--primary-light)"
          iconColor="var(--primary)"
          icon={<Activity size={18} />}
        />
      </KpiRow>

      {/* 2. PRIMARY CONTENT: REVIEW QUEUE CARD (§ 8 & § 10) */}
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
              { id: 'all', label: `All In Review (${reviewOrders.length})` },
              { id: 'critical', label: `🚨 Critical (${criticalOrdersCount})` },
              { id: 'abnormal', label: `Abnormal (${abnormalOrdersCount})` },
              { id: 'normal', label: `Normal (${normalOrdersCount})` },
              { id: 'retest', label: `Returned (${retestCount})` },
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

          <div className="search-input-box" style={{ width: '280px' }}>
            <Search size={16} color="var(--text-light)" />
            <input
              type="text"
              placeholder="Search patient, UHID, doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* 100% Full-Width Review Table (§ 10: 56px row height, sticky header) */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Order #</th>
                <th>Patient & UHID</th>
                <th>Test & Department</th>
                <th>Ordering Doctor</th>
                <th>Technician</th>
                <th style={{ width: '100px' }}>Priority</th>
                <th style={{ width: '130px' }}>Result Flag</th>
                <th style={{ width: '160px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: 'center',
                      padding: '48px 24px',
                      color: 'var(--text-muted)',
                      fontSize: '14px',
                    }}
                  >
                    No reports pending pathologist review in this filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const isCrit = ord.isCritical;
                  const isAbn =
                    !isCrit &&
                    ord.parameters.some(
                      (p) => p.observedValue !== null && (p.observedValue < p.low || p.observedValue > p.high)
                    );

                  return (
                    <tr
                      key={ord.id}
                      onClick={() => setReviewOrderId(ord.id)}
                      style={{
                        height: '56px',
                        cursor: 'pointer',
                        backgroundColor: isCrit ? 'var(--danger-light)' : undefined,
                      }}
                    >
                      <td>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: isCrit ? 'var(--danger)' : 'var(--primary)',
                          }}
                        >
                          {ord.orderNumber}
                        </span>
                      </td>

                      <td>
                        <div>
                          <strong style={{ color: 'var(--secondary)', fontSize: '14px' }}>
                            {ord.patientName}
                          </strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {ord.uhid} • {ord.age}y/{ord.gender}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                            {ord.testName}
                          </span>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {ord.sampleType}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--secondary)' }}>
                          {ord.doctorName}
                        </span>
                      </td>

                      <td>
                        <div>
                          <span style={{ fontSize: '13px', color: 'var(--secondary)' }}>
                            {ord.assignedTechnician || 'Anjali Verma'}
                          </span>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {ord.enteredAt || '10:42'}
                          </div>
                        </div>
                      </td>

                      {/* BADGE 1: Priority Badge Only */}
                      <td>
                        <span
                          className={`badge ${
                            ord.priority === 'STAT'
                              ? 'badge-danger'
                              : ord.priority === 'Urgent'
                              ? 'badge-warning'
                              : 'badge-neutral'
                          }`}
                        >
                          {ord.priority}
                        </span>
                      </td>

                      {/* BADGE 2: Result Flag Badge Only */}
                      <td>
                        <span
                          className={`badge ${
                            isCrit
                              ? 'badge-danger'
                              : isAbn
                              ? 'badge-warning'
                              : 'badge-success'
                          }`}
                        >
                          {isCrit ? '🚨 Critical' : isAbn ? '⚠️ Abnormal' : '✓ Normal'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReviewOrderId(ord.id);
                          }}
                        >
                          Review & Sign
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. SLIDE-OUT PATHOLOGIST REVIEW DRAWER */}
      {activeReviewOrder && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setReviewOrderId(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(17, 24, 39, 0.45)',
              backdropFilter: 'blur(2px)',
              zIndex: 9998,
            }}
          />

          {/* Drawer Panel */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '600px',
              maxWidth: '94vw',
              backgroundColor: '#ffffff',
              boxShadow: 'var(--shadow-xl, -4px 0 32px rgba(0,0,0,0.15))',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              overflowY: 'auto',
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                backgroundColor: '#ffffff',
                zIndex: 10,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                    {activeReviewOrder.orderNumber}
                  </span>
                  <span
                    className={`badge ${
                      activeReviewOrder.isCritical ? 'badge-danger' : 'badge-primary'
                    }`}
                  >
                    {activeReviewOrder.isCritical ? 'CRITICAL ALERT' : 'Ready for Sign-Off'}
                  </span>
                </div>
                <h3 style={{ margin: '4px 0 2px 0', fontSize: '18px', fontWeight: 700, color: 'var(--secondary)' }}>
                  {activeReviewOrder.testName}
                </h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {activeReviewOrder.patientName} • {activeReviewOrder.uhid} • Dr. {activeReviewOrder.doctorName}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReviewOrderId(null)}
                style={{
                  border: 'none',
                  background: 'var(--gray-100)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              {/* Critical Alert Warning Banner */}
              {activeReviewOrder.isCritical && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--danger-light)',
                    border: '1px solid var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <AlertTriangle size={20} color="var(--danger)" />
                  <div style={{ fontSize: '13px', color: '#991b1b', lineHeight: 1.4 }}>
                    <strong>Critical Parameter Flagged:</strong> Patient test result exceeds emergency threshold. Direct communication with ordering physician required.
                  </div>
                </div>
              )}

              {/* Observed Parameters Table */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 700, color: 'var(--secondary)' }}>
                  Observed Parameter Results
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activeReviewOrder.parameters.map((param) => {
                    const val = param.observedValue;
                    const isCrit =
                      val !== null &&
                      val !== undefined &&
                      ((param.criticalLow !== undefined && val < param.criticalLow) ||
                        (param.criticalHigh !== undefined && val > param.criticalHigh));
                    const isAbn =
                      !isCrit &&
                      val !== null &&
                      val !== undefined &&
                      (val < param.low || val > param.high);

                    return (
                      <div
                        key={param.name}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: `1px solid ${isCrit ? 'var(--danger)' : 'var(--border-color)'}`,
                          backgroundColor: isCrit ? '#fef2f2' : isAbn ? '#fffbeb' : '#ffffff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '13px', color: 'var(--secondary)' }}>
                            {param.name}
                          </strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Ref: {param.low} – {param.high} {param.unit}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: '16px',
                              fontWeight: 700,
                              color: isCrit ? 'var(--danger)' : isAbn ? 'var(--warning)' : 'var(--success)',
                            }}
                          >
                            {val ?? '—'} {param.unit}
                          </span>
                          <div>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: isCrit ? '#991b1b' : isAbn ? '#92400e' : '#065f46',
                              }}
                            >
                              {isCrit ? 'CRITICAL' : isAbn ? 'ABNORMAL' : 'NORMAL'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Technician Observation */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--gray-50)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  TECHNICIAN RUN OBSERVATION
                </div>
                <div style={{ fontSize: '13px', color: 'var(--secondary)' }}>
                  {activeReviewOrder.technicianNote || 'Sample verified adequate. Processed on automated analyzer.'}
                </div>
              </div>

              {/* Pathologist Clinical Interpretation */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--secondary)', display: 'block', marginBottom: '6px' }}>
                  Pathologist Clinical Interpretation & Sign-Off Notes
                </label>
                <textarea
                  rows={4}
                  value={interpretation}
                  onChange={(e) => setInterpretation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    color: 'var(--secondary)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Actions Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                position: 'sticky',
                bottom: 0,
                backgroundColor: '#ffffff',
                zIndex: 10,
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowRetestModal(true)}
              >
                <RotateCcw size={15} />
                <span>Request Re-test</span>
              </button>

              {activeReviewOrder.isCritical && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setShowCriticalConfirm(true)}
                >
                  <ShieldAlert size={15} />
                  <span>Flag Critical Alert</span>
                </button>
              )}

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApproveSignOff}
              >
                <FileCheck size={16} />
                <span>Approve & Sign Off</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Re-test Request Modal */}
      {showRetestModal && (
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
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Request Specimen Re-Test</h3>
              <button
                type="button"
                onClick={() => setShowRetestModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRequestRetestSubmit}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                This will reject the current analyzer run and return the order to the technician bench queue for specimen recoloring or re-run.
              </p>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Clinical Reason for Re-test
                </label>
                <textarea
                  rows={3}
                  required
                  value={retestReason}
                  onChange={(e) => setRetestReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRetestModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-warning">
                  Return for Re-test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Critical Alert Confirm Modal */}
      {showCriticalConfirm && (
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
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--danger)' }}>
                Confirm Critical Alert Escalation
              </h3>
              <button
                type="button"
                onClick={() => setShowCriticalConfirm(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              This broadcasts an immediate critical lab alert to Dr. {activeReviewOrder?.doctorName} in their OPD chamber and nurse station. Please verify you have reviewed the verified values.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCriticalConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmCritical}
              >
                Broadcast Critical Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
