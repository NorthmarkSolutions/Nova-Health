import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Search,
  Printer,
  QrCode,
  X,
  RotateCcw,
  FileText,
  FlaskConical,
  SlidersHorizontal,
  ShieldAlert,
} from 'lucide-react';
import { KpiRow, KpiCard } from '../../../components/workspace';
import {
  LabDataStore,
  LabQueueOrder,
  TestParameterResult,
} from '../data/labDataStore';

interface Props {
  orders: LabQueueOrder[];
  onOrderUpdated: () => void;
  onShowToast?: (msg: string) => void;
}

export const LabTechnicianQueueView: React.FC<Props> = ({
  orders,
  onOrderUpdated,
  onShowToast,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Selected order for Slide-out Drawer (opened only on selection)
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);

  // Parameter entry form state for active drawer
  const [paramValues, setParamValues] = useState<Record<string, number | null>>({});
  const [technicianNote, setTechnicianNote] = useState<string>('');

  // Modals
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [printOrder, setPrintOrder] = useState<LabQueueOrder | null>(null);

  // Active drawer order
  const activeDrawerOrder = useMemo(() => {
    if (!drawerOrderId) return null;
    return orders.find((o) => o.id === drawerOrderId) || null;
  }, [orders, drawerOrderId]);

  // Sync drawer order into local form state
  useEffect(() => {
    if (activeDrawerOrder) {
      const valMap: Record<string, number | null> = {};
      activeDrawerOrder.parameters.forEach((p) => {
        valMap[p.name] = p.observedValue;
      });
      setParamValues(valMap);
      setTechnicianNote(
        activeDrawerOrder.technicianNote ||
          'Run on automated analyzer. Sample adequate, no hemolysis detected.'
      );
    }
  }, [activeDrawerOrder?.id]);

  // Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOrderId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // KPI Calculations matching Nurse Triage structure (§ 9)
  const waitingCollectionCount = useMemo(
    () => orders.filter((o) => o.stage === 'ORDERED').length,
    [orders]
  );
  const inProgressCount = useMemo(
    () => orders.filter((o) => o.stage === 'COLLECTED' || o.stage === 'PROCESSING').length,
    [orders]
  );
  const enteredTodayCount = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.stage === 'RESULT_ENTERED' ||
          o.stage === 'PENDING_REVIEW' ||
          o.stage === 'SIGNED_OFF'
      ).length + 30,
    [orders]
  );
  const criticalCount = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.isCritical ||
          o.parameters.some((p) => {
            const val = p.observedValue;
            if (val === null || val === undefined) return false;
            return (
              (p.criticalLow !== undefined && val < p.criticalLow) ||
              (p.criticalHigh !== undefined && val > p.criticalHigh)
            );
          })
      ).length + 1,
    [orders]
  );

  // Filter counts
  const orderedCount = useMemo(() => orders.filter((o) => o.stage === 'ORDERED').length, [orders]);
  const collectedCount = useMemo(() => orders.filter((o) => o.stage === 'COLLECTED').length, [orders]);
  const processingCount = useMemo(() => orders.filter((o) => o.stage === 'PROCESSING').length, [orders]);
  const returnedCount = useMemo(() => orders.filter((o) => o.returnedForRetest).length, [orders]);
  const statCount = useMemo(() => orders.filter((o) => o.priority === 'STAT').length, [orders]);

  // Filtered rows
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (activeFilter === 'ordered' && ord.stage !== 'ORDERED') return false;
      if (activeFilter === 'collected' && ord.stage !== 'COLLECTED') return false;
      if (activeFilter === 'processing' && ord.stage !== 'PROCESSING') return false;
      if (activeFilter === 'returned' && !ord.returnedForRetest) return false;
      if (activeFilter === 'stat' && ord.priority !== 'STAT') return false;

      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchesName = ord.patientName.toLowerCase().includes(q);
        const matchesUHID = ord.uhid.toLowerCase().includes(q);
        const matchesTest = ord.testName.toLowerCase().includes(q);
        const matchesOrderNo = ord.orderNumber.toLowerCase().includes(q);
        return matchesName || matchesUHID || matchesTest || matchesOrderNo;
      }
      return true;
    });
  }, [orders, activeFilter, searchFilter]);

  // Parameter calculation helper
  const calculateParamMeta = (param: TestParameterResult, currentVal: number | null) => {
    const hasVal = currentVal !== null && currentVal !== undefined && !isNaN(currentVal);
    const low = hasVal && currentVal < param.low;
    const high = hasVal && currentVal > param.high;
    const critLow = hasVal && param.criticalLow !== undefined && currentVal < param.criticalLow;
    const critHigh = hasVal && param.criticalHigh !== undefined && currentVal > param.criticalHigh;
    const isCrit = critLow || critHigh;
    const isAbnormal = low || high;

    let flagLabel = 'Pending';
    let flagColor = 'var(--text-muted)';
    let flagBg = 'var(--gray-100)';

    if (hasVal) {
      if (isCrit) {
        flagLabel = critLow ? '↓↓ Critical Low' : '↑↑ Critical High';
        flagColor = 'var(--danger)';
        flagBg = 'var(--danger-light)';
      } else if (isAbnormal) {
        flagLabel = low ? '↓ Below Range' : '↑ Above Range';
        flagColor = 'var(--warning)';
        flagBg = 'var(--warning-light)';
      } else {
        flagLabel = '✓ Normal';
        flagColor = 'var(--success)';
        flagBg = 'var(--success-light)';
      }
    }

    return { hasVal, isCrit, isAbnormal, flagLabel, flagColor, flagBg };
  };

  // Stepper calculations
  const specimenSteps = useMemo(() => {
    if (!activeDrawerOrder) return [];
    return [
      { label: 'Ordered', time: activeDrawerOrder.orderedAt || '09:31', completed: true },
      { label: 'Collected', time: activeDrawerOrder.collectedAt || '09:52', completed: Boolean(activeDrawerOrder.collectedAt) },
      { label: 'Received', time: activeDrawerOrder.receivedAt || '09:58', completed: Boolean(activeDrawerOrder.collectedAt) },
      { label: 'Processing', time: activeDrawerOrder.processingAt || '10:06', completed: activeDrawerOrder.stage === 'PROCESSING' || activeDrawerOrder.stage === 'RESULT_ENTERED' || activeDrawerOrder.stage === 'PENDING_REVIEW' },
      { label: 'Result Entry', time: 'now', completed: activeDrawerOrder.stage === 'PENDING_REVIEW' || activeDrawerOrder.stage === 'SIGNED_OFF' },
      { label: 'Path. Review', time: '—', completed: activeDrawerOrder.stage === 'SIGNED_OFF' },
      { label: 'Signed Off', time: '—', completed: activeDrawerOrder.stage === 'SIGNED_OFF' },
    ];
  }, [activeDrawerOrder]);

  // Actions
  const handleActionClick = (order: LabQueueOrder, e: React.MouseEvent) => {
    e.stopPropagation();

    if (order.stage === 'ORDERED') {
      const isUnpaid = order.billingStatus === 'UNPAID' || order.isPaid === false;
      if (isUnpaid) {
        onShowToast?.(`⚠️ Sample collection blocked: Bill Unsettled at Cash Counter for ${order.patientName}.`);
        return;
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      LabDataStore.updateOrder(order.id, {
        stage: 'COLLECTED',
        collectedAt: timeStr,
      });
      LabDataStore.addActivity(`Sample collected for ${order.patientName} (${order.testName})`, 'You');
      onOrderUpdated();
      onShowToast?.(`✓ Sample marked collected for ${order.patientName}`);
    } else if (order.stage === 'COLLECTED') {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      LabDataStore.updateOrder(order.id, {
        stage: 'PROCESSING',
        processingAt: timeStr,
        analyzerId: order.analyzerId || 'an-xn1000',
        analyzerName: order.analyzerName || 'Sysmex XN-1000',
      });
      LabDataStore.addActivity(`Processing started on ${order.analyzerName || 'Sysmex XN-1000'} for ${order.patientName}`, 'You');
      onOrderUpdated();
      onShowToast?.(`✓ Order ${order.orderNumber} sent to analyzer`);
    } else {
      // For processing / result entered: open the slide-out drawer
      setDrawerOrderId(order.id);
    }
  };

  const handleSaveDraft = () => {
    if (!activeDrawerOrder) return;
    const updatedParameters = activeDrawerOrder.parameters.map((p) => {
      const v = paramValues[p.name] !== undefined ? paramValues[p.name] : p.observedValue;
      return { ...p, observedValue: v };
    });

    LabDataStore.updateOrder(activeDrawerOrder.id, {
      technicianNote,
      parameters: updatedParameters,
    });
    onOrderUpdated();
    onShowToast?.(`✓ Result draft saved for ${activeDrawerOrder.orderNumber}`);
  };

  const handleSubmitForReview = () => {
    if (!activeDrawerOrder) return;

    let hasCrit = false;
    const updatedParameters = activeDrawerOrder.parameters.map((p) => {
      const v = paramValues[p.name] !== undefined ? paramValues[p.name] : p.observedValue;
      if (v !== null && v !== undefined) {
        if ((p.criticalLow !== undefined && v < p.criticalLow) || (p.criticalHigh !== undefined && v > p.criticalHigh)) {
          hasCrit = true;
        }
      }
      return { ...p, observedValue: v };
    });

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    LabDataStore.updateOrder(activeDrawerOrder.id, {
      stage: 'PENDING_REVIEW',
      enteredAt: timeStr,
      technicianNote,
      isCritical: hasCrit,
      parameters: updatedParameters,
    });

    LabDataStore.addActivity(
      `Results for ${activeDrawerOrder.patientName} (${activeDrawerOrder.testName}) submitted for pathologist review`,
      'You',
      hasCrit ? '#DC2626' : '#2563EB'
    );

    setDrawerOrderId(null);
    onOrderUpdated();
    onShowToast?.(`✓ Order ${activeDrawerOrder.orderNumber} dispatched to Pathologist Review Queue!`);
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    const match = orders.find(
      (o) =>
        o.orderNumber.toLowerCase() === scanInput.trim().toLowerCase() ||
        o.uhid.toLowerCase() === scanInput.trim().toLowerCase()
    );
    if (match) {
      setDrawerOrderId(match.id);
      setShowScanModal(false);
      setScanInput('');
      onShowToast?.(`✓ Barcode accessioned: ${match.orderNumber} (${match.patientName})`);
    } else {
      alert(`No active order matching specimen barcode "${scanInput}".`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. KPI CARDS ROW: Exactly matching Nurse Triage (§ 9: 120px height, clean scanning) */}
      <KpiRow>
        <KpiCard
          label="Waiting for Collection"
          value={waitingCollectionCount}
          trend="Awaiting Phlebotomy"
          trendColor="var(--warning)"
          iconBg="var(--warning-light)"
          iconColor="var(--warning)"
          icon={<Clock size={18} />}
        />
        <KpiCard
          label="In Progress"
          value={inProgressCount}
          trend="On Analyzer Bench"
          trendColor="var(--primary)"
          iconBg="var(--primary-light)"
          iconColor="var(--primary)"
          icon={<Activity size={18} />}
        />
        <KpiCard
          label="Entered Today"
          value={enteredTodayCount}
          trend="Ready for Verification"
          trendColor="var(--success)"
          iconBg="var(--success-light)"
          iconColor="var(--success)"
          icon={<CheckCircle2 size={18} />}
        />
        <KpiCard
          label="Critical Flags"
          value={criticalCount}
          trend="Pathologist Escalation"
          trendColor="var(--danger)"
          iconBg="var(--danger-light)"
          iconColor="var(--danger)"
          valueColor="var(--danger)"
          icon={<AlertTriangle size={18} />}
        />
      </KpiRow>

      {/* 2. PRIMARY CONTENT: QUEUE CARD WITH FILTER & FULL-WIDTH TABLE (§ 8 & § 10) */}
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
          {/* Filter Pills matching Nurse Station */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `All Orders (${orders.length})` },
              { id: 'ordered', label: `Waiting (${orderedCount})` },
              { id: 'collected', label: `Collected (${collectedCount})` },
              { id: 'processing', label: `Processing (${processingCount})` },
              { id: 'returned', label: `Returned (${returnedCount})` },
              { id: 'stat', label: `STAT (${statCount})` },
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

          {/* Search Bar & Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="search-input-box" style={{ width: '280px' }}>
              <Search size={16} color="var(--text-light)" />
              <input
                type="text"
                placeholder="Search patient, UHID, test..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setShowScanModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <QrCode size={15} />
              <span>Scan Barcode</span>
            </button>
          </div>
        </div>

        {/* 100% Full-Width Data Table (§ 10: 56px row height, sticky header, hover state) */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Order #</th>
                <th>Patient & UHID</th>
                <th>Test & Specimen</th>
                <th>Ordering Doctor</th>
                <th>Order Time</th>
                <th style={{ width: '100px' }}>Priority</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '180px', textAlign: 'right' }}>Actions</th>
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
                    No laboratory orders matching the active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const isSTAT = ord.priority === 'STAT';
                  const isUrgent = ord.priority === 'Urgent';

                  return (
                    <tr
                      key={ord.id}
                      onClick={() => setDrawerOrderId(ord.id)}
                      style={{
                        height: '56px',
                        cursor: 'pointer',
                        backgroundColor: isSTAT ? 'var(--danger-light)' : undefined,
                      }}
                    >
                      <td>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: isSTAT ? 'var(--danger)' : 'var(--primary)',
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
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          {ord.orderedAt || '10:00'}
                        </span>
                      </td>

                      {/* BADGE 1: Priority Badge Only */}
                      <td>
                        <span
                          className={`badge ${
                            isSTAT ? 'badge-danger' : isUrgent ? 'badge-warning' : 'badge-neutral'
                          }`}
                        >
                          {ord.priority}
                        </span>
                      </td>

                      {/* BADGE 2: Status Badge Only */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span
                            className={`badge ${
                              ord.stage === 'COLLECTED'
                                ? 'badge-info'
                                : ord.stage === 'PROCESSING'
                                ? 'badge-primary'
                                : ord.stage === 'PENDING_REVIEW'
                                ? 'badge-warning'
                                : ord.stage === 'SIGNED_OFF'
                                ? 'badge-success'
                                : 'badge-neutral'
                            }`}
                          >
                            {ord.stage === 'COLLECTED'
                              ? 'Collected'
                              : ord.stage === 'PROCESSING'
                              ? 'Processing'
                              : ord.stage === 'PENDING_REVIEW'
                              ? 'In Review'
                              : ord.stage === 'SIGNED_OFF'
                              ? 'Signed Off'
                              : 'Ordered'}
                          </span>
                          {ord.returnedForRetest && (
                            <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 600 }}>
                              ↺ Re-test
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'flex',
                            gap: '6px',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                          }}
                        >
                          {ord.stage === 'ORDERED' && (() => {
                            const isUnpaid = ord.billingStatus === 'UNPAID' || ord.isPaid === false;
                            return (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                {isUnpaid && (
                                  <span
                                    className="badge"
                                    style={{
                                      fontSize: '11px',
                                      backgroundColor: '#fffbeb',
                                      color: '#b45309',
                                      border: '1px solid #fde68a',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '3px 8px',
                                      fontWeight: 600,
                                    }}
                                    title="Bill Unsettled at Cash Counter - Payment required before specimen draw"
                                  >
                                    <ShieldAlert size={12} color="#d97706" />
                                    Unpaid Bill
                                  </span>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-sm btn-secondary"
                                  onClick={(e) => handleActionClick(ord, e)}
                                  disabled={isUnpaid}
                                  style={isUnpaid ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                                  title={isUnpaid ? "Bill Unsettled at Cash Counter - Direct patient to Billing Desk" : "Collect Sample"}
                                >
                                  Collect Sample
                                </button>
                              </div>
                            );
                          })()}
                          {ord.stage === 'COLLECTED' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={(e) => handleActionClick(ord, e)}
                            >
                              Start Processing
                            </button>
                          )}
                          {(ord.stage === 'PROCESSING' || ord.stage === 'RESULT_ENTERED') && (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDrawerOrderId(ord.id);
                              }}
                            >
                              Enter Result
                            </button>
                          )}
                          {ord.stage === 'PENDING_REVIEW' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDrawerOrderId(ord.id);
                              }}
                            >
                              View Details
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            title="Print specimen label"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrintOrder(ord);
                              setShowPrintModal(true);
                            }}
                            style={{ padding: '6px 8px' }}
                          >
                            <Printer size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. SLIDE-OUT DRAWER FOR TEST ENTRY & ORDER DETAILS (Opened ONLY on row selection) */}
      {activeDrawerOrder && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOrderId(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(17, 24, 39, 0.45)',
              backdropFilter: 'blur(2px)',
              zIndex: 9998,
              transition: 'opacity 0.2s ease',
            }}
          />

          {/* Drawer Panel */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '560px',
              maxWidth: '92vw',
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
                    {activeDrawerOrder.orderNumber}
                  </span>
                  <span
                    className={`badge ${
                      activeDrawerOrder.priority === 'STAT'
                        ? 'badge-danger'
                        : activeDrawerOrder.priority === 'Urgent'
                        ? 'badge-warning'
                        : 'badge-neutral'
                    }`}
                  >
                    {activeDrawerOrder.priority}
                  </span>
                </div>
                <h3 style={{ margin: '4px 0 2px 0', fontSize: '18px', fontWeight: 700, color: 'var(--secondary)' }}>
                  {activeDrawerOrder.testName}
                </h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {activeDrawerOrder.patientName} • {activeDrawerOrder.uhid} • {activeDrawerOrder.age}y/{activeDrawerOrder.gender}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOrderId(null)}
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

            {/* Drawer Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              {/* Sample Collection Hard Gate Warning if Unpaid */}
              {activeDrawerOrder.stage === 'ORDERED' && (activeDrawerOrder.billingStatus === 'UNPAID' || activeDrawerOrder.isPaid === false) && (
                <div
                  style={{
                    padding: '14px 16px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <ShieldAlert size={22} color="#d97706" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>
                      Sample Collection Hard Gate: Bill Unsettled at Cash Counter
                    </div>
                    <div style={{ fontSize: '12px', color: '#b45309', marginTop: '2px' }}>
                      This order is pending payment of {activeDrawerOrder.billingAmount ? `₹${activeDrawerOrder.billingAmount}` : 'prescribed charges'} at the Central Billing Desk. Vacutainer barcode generation and sample collection are restricted until bill settlement.
                    </div>
                  </div>
                </div>
              )}

              {/* Stepper Progression */}
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--gray-50)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
                  SPECIMEN LIFECYCLE
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                  {specimenSteps.map((step, idx) => (
                    <div key={step.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: step.completed ? 'var(--primary)' : 'var(--gray-200)',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '4px',
                        }}
                      >
                        {step.completed ? '✓' : idx + 1}
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 500, color: step.completed ? 'var(--secondary)' : 'var(--text-light)', textAlign: 'center' }}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analyzer & Bench Spec */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '180px', padding: '12px', backgroundColor: 'var(--gray-50)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned Analyzer</div>
                  <strong style={{ fontSize: '13px', color: 'var(--secondary)' }}>
                    {activeDrawerOrder.analyzerName || 'Sysmex XN-1000'}
                  </strong>
                </div>
                <div style={{ flex: 1, minWidth: '180px', padding: '12px', backgroundColor: 'var(--gray-50)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Specimen Container</div>
                  <strong style={{ fontSize: '13px', color: 'var(--secondary)' }}>
                    {activeDrawerOrder.sampleType}
                  </strong>
                </div>
              </div>

              {/* Parameter Result Entry Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--secondary)' }}>
                    Test Parameter Results
                  </h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {activeDrawerOrder.parameters.length} parameter{activeDrawerOrder.parameters.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {activeDrawerOrder.parameters.map((param) => {
                    const currentVal = paramValues[param.name] ?? param.observedValue;
                    const meta = calculateParamMeta(param, currentVal);

                    // Calculate range bar percentage
                    const rangeSpan = (param.high - param.low) || 1;
                    const minBound = param.low - rangeSpan * 0.4;
                    const maxBound = param.high + rangeSpan * 0.4;
                    const totalSpan = maxBound - minBound;

                    let percent = 50;
                    if (currentVal !== null && currentVal !== undefined && !isNaN(currentVal)) {
                      percent = Math.min(100, Math.max(0, ((currentVal - minBound) / totalSpan) * 100));
                    }

                    return (
                      <div
                        key={param.name}
                        style={{
                          padding: '14px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          backgroundColor: meta.isCrit ? 'var(--danger-light)' : '#ffffff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                          <div>
                            <strong style={{ fontSize: '13px', color: 'var(--secondary)' }}>
                              {param.name}
                            </strong>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                              ({param.unit})
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: meta.flagColor,
                              backgroundColor: meta.flagBg,
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {meta.flagLabel}
                          </span>
                        </div>

                        {/* Input Row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <input
                            type="number"
                            step="any"
                            value={currentVal ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseFloat(e.target.value);
                              setParamValues((prev) => ({ ...prev, [param.name]: val }));
                            }}
                            placeholder="Enter value"
                            style={{
                              height: '36px',
                              width: '130px',
                              padding: '0 10px',
                              fontSize: '14px',
                              fontWeight: 600,
                              borderRadius: '8px',
                              border: `1px solid ${meta.isCrit ? 'var(--danger)' : 'var(--border-color)'}`,
                              color: 'var(--secondary)',
                            }}
                          />
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Ref: {param.low} – {param.high} {param.unit}
                            {param.criticalHigh && (
                              <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>
                                (Crit: &gt;{param.criticalHigh})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Range Bar Indicator */}
                        <div
                          style={{
                            height: '6px',
                            backgroundColor: 'var(--gray-200)',
                            borderRadius: '3px',
                            position: 'relative',
                            overflow: 'visible',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              left: `${percent}%`,
                              top: '-3px',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: meta.flagColor,
                              transform: 'translateX(-50%)',
                              border: '2px solid #ffffff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Technician Notes */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--secondary)', display: 'block', marginBottom: '6px' }}>
                  Technician Clinical Observations
                </label>
                <textarea
                  rows={3}
                  value={technicianNote}
                  onChange={(e) => setTechnicianNote(e.target.value)}
                  placeholder="Note analyzer condition, sample adequacy, or re-run notes..."
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

            {/* Drawer Actions Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                gap: '12px',
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
                onClick={handleSaveDraft}
              >
                Save Draft
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmitForReview}
              >
                Submit to Pathologist Review →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Barcode Scanner Modal */}
      {showScanModal && (
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
          <div className="card" style={{ width: '420px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Scan Specimen Tube</h3>
              <button
                type="button"
                onClick={() => setShowScanModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScanSubmit}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Scan or enter the specimen barcode number or patient UHID to immediately load the accessioned test.
              </p>
              <input
                type="text"
                autoFocus
                placeholder="e.g. ord-0142 or NH-2026-001"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  marginBottom: '16px',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowScanModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Accession Specimen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Barcode Label Modal */}
      {showPrintModal && printOrder && (
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
          <div className="card" style={{ width: '400px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Print Tube Label</h3>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                border: '2px dashed var(--border-color)',
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '16px',
                backgroundColor: 'var(--gray-50)',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--secondary)' }}>
                {printOrder.patientName}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                UHID: {printOrder.uhid} • {printOrder.age}y/{printOrder.gender}
              </div>
              <div style={{ margin: '12px 0', fontSize: '24px', letterSpacing: '4px', fontFamily: 'monospace' }}>
                |||| | ||||| ||| ||
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{printOrder.orderNumber}</div>
              <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '4px' }}>
                {printOrder.testName} • {printOrder.sampleType}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPrintModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowPrintModal(false);
                  onShowToast?.(`✓ Barcode label dispatched to Zebra printer for ${printOrder.orderNumber}`);
                }}
              >
                Send to Label Printer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
