import React, { useState, useMemo } from 'react';
import {
  FlaskConical,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Printer,
  QrCode,
  ShieldCheck,
  FileText,
  User,
  ExternalLink,
} from 'lucide-react';
import {
  SharedLabOrder,
  patientJourneyService,
} from '../../../services/patientJourneyService';
import { KpiRow, KpiCard } from '../../../components/workspace';

interface NurseSpecimenDeskViewProps {
  orders: SharedLabOrder[];
  nurseName: string;
  onCollectSample: (order: SharedLabOrder) => void;
  onViewReport: (order: SharedLabOrder) => void;
}

export const NurseSpecimenDeskView: React.FC<NurseSpecimenDeskViewProps> = ({
  orders,
  nurseName,
  onCollectSample,
  onViewReport,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COLLECTED' | 'REPORTS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Counts for KPIs
  const pendingCount = useMemo(
    () => orders.filter((o) => o.stage === 'ORDERED').length,
    [orders]
  );
  const collectedCount = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.stage === 'COLLECTED' ||
          o.stage === 'SAMPLE_COLLECTED' ||
          o.stage === 'PROCESSING' ||
          o.stage === 'RESULT_ENTERED' ||
          o.stage === 'VALIDATED'
      ).length,
    [orders]
  );
  const reportsCount = useMemo(
    () => orders.filter((o) => o.stage === 'REPORT_GENERATED').length,
    [orders]
  );
  const criticalCount = useMemo(
    () => orders.filter((o) => o.isFlaggedCritical).length,
    [orders]
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((item) => {
      if (filter === 'PENDING' && item.stage !== 'ORDERED') return false;
      if (
        filter === 'COLLECTED' &&
        item.stage !== 'COLLECTED' &&
        item.stage !== 'SAMPLE_COLLECTED' &&
        item.stage !== 'PROCESSING' &&
        item.stage !== 'RESULT_ENTERED' &&
        item.stage !== 'VALIDATED'
      )
        return false;
      if (filter === 'REPORTS' && item.stage !== 'REPORT_GENERATED') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.patientName.toLowerCase().includes(q) ||
          item.uhid.toLowerCase().includes(q) ||
          item.testName.toLowerCase().includes(q) ||
          item.orderNo.toLowerCase().includes(q) ||
          item.barcode.toLowerCase().includes(q) ||
          item.doctor.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, filter, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. KPI CARDS */}
      <KpiRow>
        <KpiCard
          label="Pending Specimen Collection"
          value={pendingCount}
          trend="Awaiting Phlebotomy"
          trendColor="var(--warning)"
          iconBg="var(--warning-light)"
          iconColor="var(--warning)"
          icon={<FlaskConical size={18} />}
        />
        <KpiCard
          label="Collected / In Lab"
          value={collectedCount}
          trend="Transferred to Lab"
          trendColor="var(--primary)"
          iconBg="var(--primary-light)"
          iconColor="var(--primary)"
          icon={<Clock size={18} />}
        />
        <KpiCard
          label="Reports Released"
          value={reportsCount}
          trend="Signed by Pathologist"
          trendColor="var(--success)"
          iconBg="var(--success-light)"
          iconColor="var(--success)"
          icon={<CheckCircle2 size={18} />}
        />
        <KpiCard
          label="Critical Value Alerts"
          value={criticalCount}
          trend="Immediate Physician Action"
          trendColor="var(--danger)"
          iconBg="var(--danger-light)"
          iconColor="var(--danger)"
          valueColor="var(--danger)"
          icon={<AlertTriangle size={18} />}
        />
      </KpiRow>

      {/* 2. SPECIMEN WORKSTATION CARD */}
      <div className="card" style={{ padding: '20px' }}>
        {/* Filters and search */}
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
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`btn btn-sm ${filter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All Orders ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('PENDING')}
              className={`btn btn-sm ${filter === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
            >
              🧪 Awaiting Phlebotomy ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('COLLECTED')}
              className={`btn btn-sm ${filter === 'COLLECTED' ? 'btn-primary' : 'btn-secondary'}`}
            >
              ⏳ Collected / Lab Processing ({collectedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('REPORTS')}
              className={`btn btn-sm ${filter === 'REPORTS' ? 'btn-primary' : 'btn-secondary'}`}
            >
              📄 Released Reports ({reportsCount})
            </button>
          </div>

          <div className="search-input-box" style={{ width: '300px' }}>
            <Search size={16} color="var(--text-light)" />
            <input
              type="text"
              placeholder="Search UHID, Patient, Test, Barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Order & Barcode</th>
                <th>Patient & Demographics</th>
                <th>Investigation & Department</th>
                <th>Specimen & Vacutainer</th>
                <th>Consultant Doctor</th>
                <th>Priority</th>
                <th>Stage</th>
                <th style={{ width: '180px', textAlign: 'right' }}>Phlebotomy Action</th>
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
                    No laboratory orders found for the active filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isPending = order.stage === 'ORDERED';
                  const isReport = order.stage === 'REPORT_GENERATED';
                  const isStat = order.priority === 'STAT';

                  return (
                    <tr
                      key={order.id}
                      style={{
                        height: '56px',
                        backgroundColor: order.isFlaggedCritical
                          ? 'rgba(239, 68, 68, 0.05)'
                          : undefined,
                      }}
                    >
                      <td>
                        <strong style={{ color: 'var(--primary)', fontSize: '13px' }}>
                          {order.orderNo}
                        </strong>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            fontFamily: 'monospace',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <QrCode size={11} /> {order.barcode}
                        </div>
                      </td>

                      <td>
                        <div>
                          <strong style={{ color: 'var(--secondary)', fontSize: '13px' }}>
                            {order.patientName}
                          </strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {order.uhid} • {order.age}Y/{order.gender[0]}
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                          {order.testName}
                        </strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {order.category}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: order.containerColor || '#94a3b8',
                              display: 'inline-block',
                              border: '1px solid rgba(0,0,0,0.1)',
                            }}
                          />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {order.sampleType}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {order.container}
                        </div>
                      </td>

                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                          {order.doctor}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            isStat
                              ? 'badge-danger'
                              : order.priority === 'URGENT'
                              ? 'badge-warning'
                              : 'badge-secondary'
                          }`}
                          style={{ fontSize: '11px' }}
                        >
                          {order.priority || 'ROUTINE'}
                        </span>
                      </td>

                      <td>
                        {isReport ? (
                          <span
                            className={`badge ${
                              order.isFlaggedCritical
                                ? 'badge-danger'
                                : order.isFlaggedAbnormal
                                ? 'badge-warning'
                                : 'badge-success'
                            }`}
                            style={{ fontSize: '11px' }}
                          >
                            {order.isFlaggedCritical
                              ? '🚨 Critical Report'
                              : order.isFlaggedAbnormal
                              ? '⚠️ Abnormal Report'
                              : '✓ Report Ready'}
                          </span>
                        ) : isPending ? (
                          <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                            Awaiting Phlebotomy
                          </span>
                        ) : (
                          <span className="badge badge-info" style={{ fontSize: '11px' }}>
                            In Lab Analysis
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right', padding: '0.75rem 1rem' }}>
                        {isPending ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => onCollectSample(order)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          >
                            <FlaskConical size={14} /> Collect Specimen
                          </button>
                        ) : isReport ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => onViewReport(order)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          >
                            <FileText size={14} /> View Report
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => onCollectSample(order)}
                            title="Re-print Specimen Barcode Label"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          >
                            <Printer size={14} /> Barcode
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
