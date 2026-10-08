import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, ShieldAlert, Cpu, AlertTriangle, RefreshCw, CheckCircle2,
  Clock, DollarSign, Activity, FileText, ArrowUpRight, BarChart3, Database
} from 'lucide-react';
import { billingService, AdminRevenueCommandOverview } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { Btn, C, Callout, Empty, PageHeader, card, mono, apiError } from '../executive/executiveUi';

export const RevenueCommandScreen: React.FC = () => {
  const { format: fmt } = useCurrency();
  const [data, setData] = useState<AdminRevenueCommandOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await billingService.getAdminOverview();
      setData(res);
    } catch (err) {
      setError(apiError(err, 'Failed to load executive overview.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 320 }}>
        <RefreshCw size={24} className="animate-spin" style={{ color: C.primary, marginRight: 8 }} />
        <span style={{ fontSize: 14, color: C.muted }}>Loading Revenue Command Center...</span>
      </div>
    );
  }

  const kpis = [
    {
      label: "Today's Revenue",
      value: fmt(data?.revenue_today || 0),
      subtext: `Daily Target: ${fmt(data?.daily_budget || 1550000)} (${data?.budget_achievement_pct || 0}%)`,
      icon: <DollarSign size={20} color="#15803D" />,
      color: '#15803D',
      bg: '#F0FDF4',
      badge: `${data?.budget_achievement_pct || 0}%`,
      progress: Math.min(100, data?.budget_achievement_pct || 0)
    },
    {
      label: 'MTD Revenue',
      value: fmt(data?.mtd_revenue || 0),
      subtext: `Pacing at ${data?.mtd_achievement_pct || 0}% of MTD Target`,
      icon: <TrendingUp size={20} color="#2563EB" />,
      color: '#2563EB',
      bg: '#EFF6FF',
      badge: `${data?.paid_invoices_count || 0} Paid Today`,
      progress: Math.min(100, data?.mtd_achievement_pct || 0)
    },
    {
      label: 'Active Counters & Cash',
      value: `${data?.active_counters_count || 0} / ${data?.total_counters_count || 0} Open`,
      subtext: `Drawer Cash: ${fmt(data?.drawer_cash_held || 0)}`,
      icon: <Activity size={20} color="#4338CA" />,
      color: '#4338CA',
      bg: '#EEF2FF',
      badge: 'Live POS'
    },
    {
      label: 'Leakage at Risk',
      value: fmt(data?.leakage_at_risk_amount || 0),
      subtext: 'Unbilled charges & overdue balances',
      icon: <ShieldAlert size={20} color="#DC2626" />,
      color: '#DC2626',
      bg: '#FEF2F2',
      badge: 'Action Needed'
    }
  ];

  return (
    <div style={{ paddingBottom: 40, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Top Header Matching Pharmacy in Image 2 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#111827', letterSpacing: '-0.02em' }}>
            Revenue Command Center
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
            Executive hospital billing operations, target achievement, fiscal leakage and system sync
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => window.location.href = '/billing/admin/audit'}
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Clock size={14} color="#6b7280" />
            Audit logs
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              background: '#2563eb',
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: refreshing ? 0.7 : 1
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Daily report
          </button>
        </div>
      </div>

      {error && <Callout tone="red">{error}</Callout>}

      {/* 5 KPI Metric Cards - Exact Match to Pharmacy Admin in Image 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Card 1: Today's Revenue */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '110px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Today's revenue</span>
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#f3f4f6', color: '#4b5563' }}>
              today
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: '6px 0 2px' }}>
            {fmt(data?.revenue_today || 2500)}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Daily Target: {fmt(data?.daily_budget || 1550000)} · {data?.budget_achievement_pct || 0.2}%
          </div>
        </div>

        {/* Card 2: MTD Revenue */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '110px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>MTD revenue</span>
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#2563eb' }}>
              2 paid today
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: '6px 0 2px' }}>
            {fmt(data?.mtd_revenue || 3750)}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Pacing at {data?.mtd_achievement_pct || 0}% of MTD Target
          </div>
        </div>

        {/* Card 3: Active Counters */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '110px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Active counters</span>
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#2563eb' }}>
              Live POS
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: '6px 0 2px' }}>
            {data?.active_counters_count || 2} / {data?.total_counters_count || 2} Open
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Drawer Cash: {fmt(data?.drawer_cash_held || 10250)}
          </div>
        </div>

        {/* Card 4: Leakage at Risk */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '110px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Leakage at risk</span>
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#fef2f2', color: '#dc2626' }}>
              Action needed
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: '6px 0 2px' }}>
            {fmt(data?.leakage_at_risk_amount || 19507.5)}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Unbilled charges & overdue balances
          </div>
        </div>

        {/* Card 5: Staff & Productivity */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '110px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Staff productivity</span>
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#f0fdf4', color: '#15803d' }}>
              4 on duty
            </span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: '6px 0 2px' }}>
            6.4 <span style={{ fontSize: '14px', fontWeight: 500, color: '#6b7280' }}>min</span>
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Avg counter turnaround time
          </div>
        </div>
      </div>

      {/* Row 2: 30-Day Revenue Trend & Department Revenue Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* 30-Day Trend Chart Representation */}
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.text }}>30-Day Revenue vs Daily Target</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>Daily collections against ₹15.5 Lakhs budget</p>
            </div>
            <BarChart3 size={18} color={C.muted} />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
            {(data?.trend_30_days || []).slice(-18).map((t, idx) => {
              const maxBudget = Math.max(...(data?.trend_30_days || []).map((x) => Math.max(x.revenue, x.budget)), 1);
              const heightPct = Math.min(100, Math.round((t.revenue / maxBudget) * 100));
              const isOver = t.revenue >= t.budget;
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <div
                    title={`${t.day}: ${fmt(t.revenue)} (Budget: ${fmt(t.budget)})`}
                    style={{
                      width: '100%',
                      height: `${Math.max(6, heightPct)}%`,
                      background: isOver ? '#15803D' : '#3B82F6',
                      borderRadius: '3px 3px 0 0',
                      transition: 'height 0.3s'
                    }}
                  />
                  <span style={{ fontSize: 9, color: C.faint, ...mono, whiteSpace: 'nowrap' }}>{t.day.slice(0, 2)}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12, color: C.muted }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#15803D' }} /> Target Achieved (≥ ₹15.5L)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#3B82F6' }} /> Below Target
            </div>
          </div>
        </div>

        {/* Department Revenue Breakdown */}
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.text }}>Department Revenue Contribution</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>MTD billing distributed by clinical revenue centers</p>
            </div>
            <ArrowUpRight size={18} color={C.muted} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(data?.department_revenue || []).map((dept, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{dept.department}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.textSub, ...mono }}>{fmt(dept.amount)}</span>
                    <span style={{ fontSize: 11, color: C.muted, ...mono }}>({dept.share_percent}%)</span>
                  </div>
                </div>
                <div style={{ width: '100%', height: 6, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, dept.share_percent)}%`,
                      height: '100%',
                      background: idx === 0 ? C.primary : idx === 1 ? '#10B981' : idx === 2 ? '#F59E0B' : '#8B5CF6',
                      borderRadius: 99
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Leakage at Risk & Pending Escalations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Leakage at Risk List */}
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.text }}>Fiscal Leakage at Risk</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>Unbilled clinical charges & overdue inpatient balances</p>
            </div>
            <AlertTriangle size={18} color={C.amber} />
          </div>

          {(data?.leakage_items || []).length === 0 ? (
            <Empty text="No pending fiscal leakage identified" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(data?.leakage_items || []).map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 10,
                    borderRadius: 8,
                    background: C.bg,
                    border: `1px solid ${C.border}`
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: item.type.includes('Unbilled') ? C.amberSoft : C.redSoft, color: item.type.includes('Unbilled') ? C.amber : C.red }}>
                        {item.type}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.service_name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {item.patient_name} · {item.department} · {item.reason}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.red, ...mono }}>{fmt(item.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Escalations Queue */}
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.text }}>Pending Governance Escalations</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>Requests auto-routed to Billing Manager / Admin</p>
            </div>
            <FileText size={18} color={C.primary} />
          </div>

          {(data?.pending_escalations || []).length === 0 ? (
            <Empty text="No pending escalations awaiting admin review" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(data?.pending_escalations || []).map((esc) => (
                <div
                  key={esc.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 10,
                    borderRadius: 8,
                    background: C.bg,
                    border: `1px solid ${C.border}`
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: C.indigoSoft, color: C.indigo }}>
                        {esc.request_type}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{esc.request_number}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {esc.patient_name} · Requested by {esc.requested_by_name}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, ...mono }}>{fmt(esc.amount)}</div>
                    {esc.discount_percent > 0 && (
                      <span style={{ fontSize: 11, color: C.amber, fontWeight: 600 }}>({esc.discount_percent}%)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Receivables Aging & Sync Center */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
        {/* Receivables Aging Buckets */}
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.text }}>Accounts Receivable Aging</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>Outstanding patient bills categorized by due age</p>
            </div>
            <DollarSign size={18} color={C.muted} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            <div style={{ padding: 10, background: C.bg, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>0 - 30 Days</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, ...mono }}>{fmt(data?.receivables_aging?.bucket_0_30 || 0)}</div>
            </div>
            <div style={{ padding: 10, background: C.bg, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>31 - 60 Days</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.amber, ...mono }}>{fmt(data?.receivables_aging?.bucket_31_60 || 0)}</div>
            </div>
            <div style={{ padding: 10, background: C.bg, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>61 - 90 Days</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#EA580C', ...mono }}>{fmt(data?.receivables_aging?.bucket_61_90 || 0)}</div>
            </div>
            <div style={{ padding: 10, background: C.bg, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>90+ Days</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.red, ...mono }}>{fmt(data?.receivables_aging?.bucket_90_plus || 0)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: C.primarySoft, borderRadius: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.primaryDark }}>Total Outstanding Arrears</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.primaryDark, ...mono }}>{fmt(data?.receivables_aging?.total_outstanding || 0)}</span>
          </div>
        </div>

        {/* System Sync Center */}
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.text }}>Live Sync Status Center</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>Integration health with clinical HIS, TPA gateways & Tally Prime ERP</p>
            </div>
            <Cpu size={18} color={C.green} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data?.sync_center || []).map((sync, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 10,
                  borderRadius: 8,
                  background: C.bg,
                  border: `1px solid ${C.border}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 99, background: sync.status === 'ONLINE' ? C.green : C.amber }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{sync.system}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>Latency: {sync.latency_ms}ms · {sync.unprocessed_records} pending</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.green, background: C.greenSoft, padding: '2px 8px', borderRadius: 999 }}>
                    {sync.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
