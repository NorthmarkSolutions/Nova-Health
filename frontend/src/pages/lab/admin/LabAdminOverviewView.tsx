import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/shared';
import { LabDataStore, LabQueueOrder } from '../data/labDataStore';
import {
  FlaskConical,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Activity,
  Filter,
  Check,
  Search,
} from 'lucide-react';

interface Props {
  onNavigateTab: (tab: string) => void;
}

export const LabAdminOverviewView: React.FC<Props> = ({ onNavigateTab }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<LabQueueOrder[]>(() => LabDataStore.getOrders());
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'opd' | 'stat' | 'pending'>('all');

  useEffect(() => {
    const handleSync = () => {
      setOrders(LabDataStore.getOrders());
    };
    window.addEventListener('nh_lab_sync', handleSync);
    window.addEventListener('nh_data_sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('nh_lab_sync', handleSync);
      window.removeEventListener('nh_data_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Filtered orders for live stream
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        !orderSearchQuery ||
        o.patientName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
        o.uhid.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
        o.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
        o.testName.toLowerCase().includes(orderSearchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (orderFilter === 'opd') {
        return (
          o.location.toLowerCase().includes('opd') ||
          (o.relevantHistory && o.relevantHistory.some((h) => h.toLowerCase().includes('opd')))
        );
      }
      if (orderFilter === 'stat') {
        return o.priority === 'STAT' || o.isCritical;
      }
      if (orderFilter === 'pending') {
        return o.stage === 'ORDERED' || o.stage === 'COLLECTED';
      }
      return true;
    });
  }, [orders, orderSearchQuery, orderFilter]);

  // Dynamic KPIs
  const totalOrdersToday = 410 + orders.length;
  const pendingIntakeCount = orders.filter((o) => o.stage === 'ORDERED').length;
  const inAnalysisCount = orders.filter(
    (o) =>
      o.stage === 'COLLECTED' ||
      o.stage === 'PROCESSING' ||
      o.stage === 'ACCESSIONED' ||
      o.stage === 'RECEIVED'
  ).length;
  const pathologistReviewCount = orders.filter(
    (o) => o.stage === 'PENDING_REVIEW' || o.stage === 'RESULT_ENTERED'
  ).length;
  const criticalCount = orders.filter((o) => o.isCritical).length;

  const kpis = [
    {
      label: 'Orders today',
      value: String(totalOrdersToday),
      trend: '+12% vs Tue',
      tBg: '#F0FDF4',
      tFg: '#15803D',
      sub: `OPD ${(58 + orders.length * 0.1).toFixed(0)}% · IPD 27% · ER 15%`,
    },
    {
      label: 'Pending Phlebotomy',
      value: String(pendingIntakeCount),
      trend: pendingIntakeCount > 0 ? 'Intake Queue' : 'All Collected',
      tBg: pendingIntakeCount > 0 ? '#FFFBEB' : '#F0FDF4',
      tFg: pendingIntakeCount > 0 ? '#B45309' : '#15803D',
      sub: `${pendingIntakeCount} awaiting specimen draw`,
    },
    {
      label: 'On Analyzers',
      value: String(inAnalysisCount),
      trend: 'In Testing',
      tBg: '#EFF6FF',
      tFg: '#1D4ED8',
      sub: `${inAnalysisCount} active specimens`,
    },
    {
      label: 'Pathologist Review',
      value: String(pathologistReviewCount),
      trend: pathologistReviewCount > 0 ? 'Verification' : 'Up to date',
      tBg: pathologistReviewCount > 0 ? '#FEF3C7' : '#F0FDF4',
      tFg: pathologistReviewCount > 0 ? '#B45309' : '#15803D',
      sub: `${pathologistReviewCount} awaiting sign-off`,
    },
    {
      label: 'Critical Flags',
      value: String(criticalCount),
      trend: criticalCount > 0 ? 'STAT Alert' : '0 open',
      tBg: criticalCount > 0 ? '#FEF2F2' : '#F3F4F6',
      tFg: criticalCount > 0 ? '#B91C1C' : '#374151',
      sub: `${criticalCount} panic values logged`,
    },
  ];

  // Hourly workload bars: [collected, signed]
  const hoursData = [
    { label: '07:00', a: (18 / 60) * 100, b: (10 / 60) * 100 },
    { label: '08:00', a: (42 / 60) * 100, b: (26 / 60) * 100 },
    { label: '09:00', a: (55 / 60) * 100, b: (41 / 60) * 100 },
    { label: '10:00', a: (51 / 60) * 100, b: (49 / 60) * 100 },
    { label: '11:00', a: (46 / 60) * 100, b: (44 / 60) * 100 },
    { label: '12:00', a: (38 / 60) * 100, b: (40 / 60) * 100 },
    { label: '13:00', a: (44 / 60) * 100, b: (36 / 60) * 100 },
    { label: '14:00', a: (40 / 60) * 100, b: (38 / 60) * 100 },
    { label: '15:00', a: (42 / 60) * 100, b: (39 / 60) * 100 },
    { label: '16:00', a: (36 / 60) * 100, b: (43 / 60) * 100 },
  ];

  const tatItems = [
    { name: 'Hematology', actual: '38m', target: '60m', pct: '63%', bar: '#16A34A', fg: '#111827' },
    { name: 'Biochemistry', actual: '52m', target: '60m', pct: '86%', bar: '#F59E0B', fg: '#111827' },
    { name: 'Immunoassay', actual: '1h 48m', target: '2h', pct: '90%', bar: '#F59E0B', fg: '#111827' },
    { name: 'STAT orders', actual: '34m', target: '30m', pct: '100%', bar: '#DC2626', fg: '#B91C1C' },
    { name: 'HbA1c', actual: 'Held', target: '6h', pct: '0%', bar: '#DC2626', fg: '#B45309' },
  ];

  const staffItems = [
    { initials: 'KM', name: 'Dr. Kavitha Menon', role: 'Consultant Pathologist · 12 reviews', status: 'Reviewing', bg: '#EFF6FF', fg: '#1D4ED8' },
    { initials: 'SR', name: 'Dr. Sanjay Rao', role: 'Hematopathologist · on call', status: 'On call', bg: '#F3F4F6', fg: '#374151' },
    { initials: 'AV', name: 'Anjali Verma', role: 'Sr. Technologist · Bench 2', status: 'Busy', bg: '#FFFBEB', fg: '#B45309' },
    { initials: 'VR', name: 'Vikram Rao', role: 'Technologist · Chemistry', status: 'Busy', bg: '#FFFBEB', fg: '#B45309' },
    { initials: 'NP', name: 'Neha Pillai', role: 'Phlebotomist · OPD collection', status: 'Available', bg: '#F0FDF4', fg: '#15803D' },
    { initials: 'AK', name: 'Arjun Kapoor', role: 'Phlebotomist · Ward rounds', status: 'Collecting', bg: '#E0F2FE', fg: '#0369A1' },
  ];

  const reagentItems = [
    { name: 'Erba Chem-7 reagent pack', left: '16% · reorder today', pct: '16%', bar: '#DC2626', fg: '#B91C1C' },
    { name: 'Troponin I reagent', left: '11 tests left', pct: '22%', bar: '#DC2626', fg: '#B91C1C' },
    { name: 'SST gold-top tubes', left: '140 left · reorder at 200', pct: '35%', bar: '#F59E0B', fg: '#B45309' },
  ];

  const priceItems = [
    { name: 'Complete blood count', code: 'HEM-CBC-01', price: 'Rs. 350', sync: 'Synced', bg: '#F0FDF4', fg: '#15803D' },
    { name: 'Renal function panel', code: 'BIO-RFT-01', price: 'Rs. 650', sync: 'Synced', bg: '#F0FDF4', fg: '#15803D' },
    { name: 'Liver function test', code: 'BIO-LFT-01', price: 'Rs. 700', sync: 'Synced', bg: '#F0FDF4', fg: '#15803D' },
    { name: 'HbA1c', code: 'BIO-A1C-01', price: 'Rs. 480', sync: 'Pending sync', bg: '#FFFBEB', fg: '#B45309' },
    { name: 'Troponin I (hs)', code: 'IMM-TRP-01', price: 'Rs. 1,200', sync: 'Synced', bg: '#F0FDF4', fg: '#15803D' },
    { name: 'Vitamin D (25-OH)', code: 'IMM-VTD-01', price: '—', sync: 'No price', bg: '#FEF2F2', fg: '#B91C1C' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <PageHeader
        title="Laboratory Overview"
        description="Department performance, staffing, equipment and pricing. Daily bench work stays in the Technician and Pathologist workspaces."
      >
        <button
          type="button"
          onClick={() => onNavigateTab('reports')}
          style={{
            whiteSpace: 'nowrap',
            height: '40px',
            padding: '0 16px',
            borderRadius: '10px',
            border: '1px solid #E5E7EB',
            backgroundColor: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 500,
            color: '#111827',
            cursor: 'pointer',
          }}
        >
          Export report
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('scheduling')}
          style={{
            whiteSpace: 'nowrap',
            height: '40px',
            padding: '0 16px',
            borderRadius: '10px',
            border: '1px solid #E5E7EB',
            backgroundColor: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 500,
            color: '#111827',
            cursor: 'pointer',
          }}
        >
          Duty roster
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab('staff')}
          style={{
            whiteSpace: 'nowrap',
            height: '40px',
            padding: '0 16px',
            borderRadius: '10px',
            border: '1px solid #2563EB',
            backgroundColor: '#2563EB',
            fontSize: '14px',
            fontWeight: 600,
            color: '#FFFFFF',
            cursor: 'pointer',
          }}
        >
          Add staff
        </button>
      </PageHeader>

      {/* 5 KPI Cards */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        {kpis.map((k) => (
          <div
            key={k.label}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '20px',
              minHeight: '120px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>{k.label}</span>
              <span
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: k.tBg,
                  color: k.tFg,
                }}
              >
                {k.trend}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>
                {k.value}
              </span>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>{k.sub}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Live Diagnostic Orders Stream (Real-Time OPD / IPD Intake) */}
      <section
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                Live Diagnostic Orders Stream
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#EFF6FF',
                  color: '#1D4ED8',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB', display: 'inline-block' }} />
                Real-Time OPD Sync
              </span>
            </div>
            <span style={{ fontSize: '13px', color: '#6B7280' }}>
              Incoming laboratory and pathology requisitions from OPD Doctor consultations, IPD wards, and emergency desks.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', backgroundColor: '#F3F4F6', borderRadius: '8px', padding: '3px', border: '1px solid #E5E7EB' }}>
              {(['all', 'opd', 'stat', 'pending'] as const).map((filterKey) => {
                const labels: Record<string, string> = {
                  all: `All (${orders.length})`,
                  opd: 'OPD Doctor Orders',
                  stat: 'STAT / Critical',
                  pending: 'Pending Intake',
                };
                return (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setOrderFilter(filterKey)}
                    style={{
                      border: 'none',
                      backgroundColor: orderFilter === filterKey ? '#FFFFFF' : 'transparent',
                      color: orderFilter === filterKey ? '#111827' : '#6B7280',
                      fontWeight: orderFilter === filterKey ? 600 : 500,
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      boxShadow: orderFilter === filterKey ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    {labels[filterKey]}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => navigate('/department/lab?tab=queue')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '34px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #2563EB',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <FlaskConical size={14} /> Open Tech Workbench <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div style={{ overflowX: 'auto', border: '1px solid #F3F4F6', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#4B5563', fontWeight: 600 }}>
                <th style={{ padding: '10px 14px' }}>Order & Barcode</th>
                <th style={{ padding: '10px 14px' }}>Patient Details</th>
                <th style={{ padding: '10px 14px' }}>Test & Department</th>
                <th style={{ padding: '10px 14px' }}>Requesting Physician</th>
                <th style={{ padding: '10px 14px' }}>Priority</th>
                <th style={{ padding: '10px 14px' }}>Pipeline Stage</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '28px', textAlign: 'center', color: '#9CA3AF' }}>
                    No orders match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.slice(0, 8).map((ord) => {
                  const isOpd =
                    ord.location.toLowerCase().includes('opd') ||
                    (ord.relevantHistory && ord.relevantHistory.some((h) => h.toLowerCase().includes('opd')));

                  const stageBadge = {
                    ORDERED: { label: 'Waiting Collection', bg: '#FEF3C7', color: '#B45309' },
                    COLLECTED: { label: 'Sample Intake', bg: '#E0F2FE', color: '#0369A1' },
                    RECEIVED: { label: 'Received in Lab', bg: '#E0F2FE', color: '#0369A1' },
                    ACCESSIONED: { label: 'Accessioned', bg: '#EDE9FE', color: '#6D28D9' },
                    PROCESSING: { label: 'On Analyzer', bg: '#DBEAFE', color: '#1D4ED8' },
                    RESULT_ENTERED: { label: 'Results Entered', bg: '#FEF3C7', color: '#92400E' },
                    PENDING_REVIEW: { label: 'Pathologist Review', bg: '#FCE7F3', color: '#BE185D' },
                    SIGNED_OFF: { label: 'Signed & Released', bg: '#DCFCE7', color: '#15803D' },
                  }[ord.stage] || { label: ord.stage, bg: '#F3F4F6', color: '#374151' };

                  return (
                    <tr key={ord.id} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.15s ease' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontFamily: 'monospace' }}>
                          {ord.orderNumber}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>
                          {ord.specimenNumber}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{ord.patientName}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>
                          {ord.uhid} · {ord.age}y/{ord.gender}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 500, color: '#111827' }}>{ord.testName}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>{ord.category}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 500, color: '#111827' }}>{ord.doctorName}</span>
                          {isOpd && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#EFF6FF',
                                color: '#1D4ED8',
                              }}
                            >
                              OPD
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>{ord.location}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            backgroundColor:
                              ord.priority === 'STAT' ? '#FEF2F2' : ord.priority === 'Urgent' ? '#FFFBEB' : '#F3F4F6',
                            color:
                              ord.priority === 'STAT' ? '#DC2626' : ord.priority === 'Urgent' ? '#D97706' : '#4B5563',
                            border: `1px solid ${ord.priority === 'STAT' ? '#FECACA' : ord.priority === 'Urgent' ? '#FDE68A' : '#E5E7EB'}`,
                          }}
                        >
                          {ord.priority}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: stageBadge.bg,
                            color: stageBadge.color,
                          }}
                        >
                          {stageBadge.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (ord.stage === 'PENDING_REVIEW' || ord.stage === 'RESULT_ENTERED') {
                              navigate('/department/lab?tab=review');
                            } else {
                              navigate('/department/lab?tab=queue');
                            }
                          }}
                          style={{
                            border: '1px solid #E5E7EB',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#2563EB',
                            cursor: 'pointer',
                          }}
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Workload Bar Chart + TAT vs Target */}
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'stretch' }}>
        {/* Sample Workload by Hour */}
        <div
          style={{
            flex: '999 1 560px',
            minWidth: 0,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Sample workload</h2>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Collected vs signed-off, by hour</span>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '13px', color: '#374151', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#2563EB' }} />
                Collected <b>412</b>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#16A34A' }} />
                Signed off <b>366</b>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', height: '220px' }}>
            {/* Y-axis labels */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#9CA3AF',
                paddingBottom: '22px',
                textAlign: 'right',
                width: '22px',
              }}
            >
              <span>60</span>
              <span>40</span>
              <span>20</span>
              <span>0</span>
            </div>

            {/* Bars */}
            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(10, minmax(0, 1fr))',
                gap: '8px',
                borderLeft: '1px solid #F3F4F6',
              }}
            >
              {hoursData.map((h) => (
                <div key={h.label} style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      gap: '3px',
                      borderBottom: '1px solid #E5E7EB',
                    }}
                  >
                    <div
                      style={{
                        width: '38%',
                        maxWidth: '16px',
                        borderRadius: '4px 4px 0 0',
                        backgroundColor: '#2563EB',
                        height: `${h.a}%`,
                        transition: 'height 0.3s ease',
                      }}
                    />
                    <div
                      style={{
                        width: '38%',
                        maxWidth: '16px',
                        borderRadius: '4px 4px 0 0',
                        backgroundColor: '#16A34A',
                        height: `${h.b}%`,
                        transition: 'height 0.3s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: '#6B7280', textAlign: 'center' }}>{h.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Turnaround vs Target */}
        <div
          style={{
            flex: '1 1 360px',
            minWidth: 0,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Turnaround vs target</h2>
            <span style={{ fontSize: '13px', color: '#6B7280' }}>Median, order → sign-off · today</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {tatItems.map((t) => (
              <div key={t.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 500, color: '#111827' }}>{t.name}</span>
                  <span>
                    <b style={{ color: t.fg }}>{t.actual}</b>
                    <span style={{ color: '#6B7280' }}> / {t.target}</span>
                  </span>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', backgroundColor: '#F3F4F6', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: '4px',
                      width: t.pct,
                      backgroundColor: t.bar,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 Overview Cards: Staff on shift + Equipment & inventory + Test pricing */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Card 1: Staff on shift */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Staff on shift</h3>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Morning · 9 on duty, 2 on call</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('staff')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '13px',
                fontWeight: 500,
                color: '#2563EB',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Roster →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {staffItems.map((s) => (
              <div
                key={s.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  minHeight: '52px',
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#F3F4F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    flexShrink: 0,
                    color: '#374151',
                  }}
                >
                  {s.initials}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{s.name}</span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>{s.role}</span>
                </div>
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '999px',
                    backgroundColor: s.bg,
                    color: s.fg,
                  }}
                >
                  {s.status}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: '10px',
              backgroundColor: '#FFFBEB',
              fontSize: '13px',
              gap: '8px',
            }}
          >
            <span style={{ color: '#92400E' }}>1 leave request pending · Vikram Rao, 3–4 Oct</span>
            <button
              type="button"
              onClick={() => onNavigateTab('staff')}
              style={{
                background: 'none',
                border: 'none',
                fontWeight: 600,
                color: '#2563EB',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Review
            </button>
          </div>
        </div>

        {/* Card 2: Equipment & inventory */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Equipment &amp; inventory</h3>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>5 of 7 analyzers online</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('equipment')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '13px',
                fontWeight: 500,
                color: '#2563EB',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Stockroom →
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
            <div style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: '#F0FDF4', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#15803D' }}>5</span>
              <span style={{ fontSize: '12px', color: '#374151' }}>Online</span>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: '#FFFBEB', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#B45309' }}>1</span>
              <span style={{ fontSize: '12px', color: '#374151' }}>Maintenance</span>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: '#FEF2F2', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#B91C1C' }}>1</span>
              <span style={{ fontSize: '12px', color: '#374151' }}>Offline</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              border: '1px solid #FECACA',
              borderRadius: '10px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Bio-Rad D-10 · pump fault</span>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>SR-3391 · engineer ETA 13:30 · 3 orders held</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('equipment')}
              style={{
                whiteSpace: 'nowrap',
                flexShrink: 0,
                height: '32px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                color: '#111827',
                cursor: 'pointer',
              }}
            >
              Escalate
            </button>
          </div>

          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', letterSpacing: '0.04em', paddingTop: '4px' }}>
            REAGENTS BELOW REORDER LEVEL
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {reagentItems.map((r) => (
              <div key={r.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 500, color: '#111827' }}>{r.name}</span>
                  <span style={{ color: r.fg, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.left}</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '3px', width: r.pct, backgroundColor: r.bar }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Test pricing */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Test pricing</h3>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Synced to Billing tariff master · 09:12</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('pricing')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '13px',
                fontWeight: 500,
                color: '#2563EB',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              All prices →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {priceItems.map((p) => (
              <div
                key={p.code}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                  gap: '12px',
                  alignItems: 'center',
                  minHeight: '48px',
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{p.name}</span>
                  <span style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>
                    {p.code}
                  </span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#111827' }}>
                  {p.price}
                </span>
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: p.bg,
                    color: p.fg,
                  }}
                >
                  {p.sync}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              fontSize: '13px',
              gap: '8px',
              marginTop: 'auto',
            }}
          >
            <span style={{ color: '#1E3A8A' }}>1 new test from Pathology has no price yet</span>
            <button
              type="button"
              onClick={() => onNavigateTab('pricing')}
              style={{
                background: 'none',
                border: 'none',
                fontWeight: 600,
                color: '#2563EB',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Set price
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
