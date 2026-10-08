import React, { useCallback, useEffect, useState } from 'react';
import {
  IndianRupee, Wallet, Shield, Percent, TrendingUp, Printer, Table2, BarChart3,
  RefreshCw, CheckCircle2, Stethoscope, FlaskConical, Pill, Layers,
  ChevronDown, ChevronUp, FileText, ArrowRight, ShieldCheck
} from 'lucide-react';
import {
  billingService, RevenueAnalytics, GLJournalEntry, LiveDepartmentRevenueSummary
} from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { Btn, C, Callout, Empty, KpiCard, PageHeader, PillTabs, apiError, card, mono } from '../executive/executiveUi';
import { barWidths, shortMoney } from './financeMath';

// Single-series magnitude charts: one sequential hue, lighter step for the run-rate projection (also labelled).
const BAR = C.primary;
const BAR_PROJECTED = '#BFDBFE';

const HBar: React.FC<{ rows: Array<{ label: string; value: number; text: string; sub?: string }> }> = ({ rows }) => {
  const widths = barWidths(rows.map((r) => r.value));
  if (!rows.length) return <Empty text="No data for this period." />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
      {rows.map((r, i) => (
        <div key={r.label} title={`${r.label} · ${r.text}${r.sub ? ` · ${r.sub}` : ''}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 0.9fr) 2fr minmax(90px, auto)', gap: 10, alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: C.textSub }}>{r.label}</span>
          <div style={{ height: 10, background: '#F3F4F6', borderRadius: 4 }}>
            <div style={{ width: `${widths[i]}%`, height: '100%', background: BAR, borderRadius: '0 4px 4px 0' }} />
          </div>
          <span style={{ textAlign: 'right', ...mono }}>{r.text}{r.sub ? <span style={{ color: C.muted }}> · {r.sub}</span> : null}</span>
        </div>
      ))}
    </div>
  );
};

const Panel: React.FC<{ title: string; sub?: string; actions?: React.ReactNode; children: React.ReactNode }> = ({ title, sub, actions, children }) => (
  <section style={{ ...card }}>
    <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
        {sub && <span style={{ fontSize: 12, color: C.muted }}>{sub}</span>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
    {children}
  </section>
);

/**
 * A-02 Revenue Analytics & Phase 3 Accounts GL Bridge:
 * Monthly trends + Real-Time Department Revenue Split (OPD, Lab, Pharmacy) & Live General Ledger (GL) Stream.
 */
export const RevenueAnalyticsScreen: React.FC = () => {
  const { format: fmt } = useCurrency();
  const [viewMode, setViewMode] = useState<'analytics' | 'gl_stream'>('analytics');
  const [period, setPeriod] = useState('MTD');
  const [data, setData] = useState<RevenueAnalytics | null>(null);
  const [liveSummary, setLiveSummary] = useState<LiveDepartmentRevenueSummary | null>(null);
  const [glEntries, setGlEntries] = useState<GLJournalEntry[]>([]);
  const [glDeptFilter, setGlDeptFilter] = useState('ALL');
  const [expandedJv, setExpandedJv] = useState<string | null>(null);
  const [isRefreshingGl, setIsRefreshingGl] = useState(false);
  const [asTable, setAsTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await billingService.getRevenueAnalytics(period));
      setError(null);
    } catch (err) {
      setError(apiError(err, 'Could not load revenue analytics.'));
    }
  }, [period]);

  const loadLiveGL = useCallback(async () => {
    setIsRefreshingGl(true);
    try {
      const [sumRes, streamRes] = await Promise.all([
        billingService.getLiveDepartmentRevenueSummary(),
        billingService.getLiveJournalStream({ department: glDeptFilter })
      ]);
      setLiveSummary(sumRes);
      setGlEntries(streamRes.entries);
    } catch (err) {
      console.error('Failed to load GL stream', err);
    } finally {
      setIsRefreshingGl(false);
    }
  }, [glDeptFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadLiveGL();
  }, [loadLiveGL]);

  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastKey = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}`;
  const k = data?.kpis;
  const trend = data?.monthly_trend || [];
  const peak = Math.max(1, ...trend.map((m) => Math.max(m.net, m.projected || 0)));

  return (
    <>
      <PageHeader
        title="Revenue & General Ledger Analytics"
        subtitle={`Real-time clinical department revenue synchronization and double-entry General Ledger bridge. ${data?.note || ''}`}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Btn
              variant={viewMode === 'analytics' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('analytics')}
            >
              <BarChart3 size={15} /> Revenue Overview
            </Btn>
            <Btn
              variant={viewMode === 'gl_stream' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('gl_stream')}
            >
              <Layers size={15} /> Live GL Stream ({glEntries.length})
            </Btn>
            {viewMode === 'analytics' && (
              <Btn onClick={() => setAsTable((v) => !v)}>
                {asTable ? <BarChart3 size={15} /> : <Table2 size={15} />} {asTable ? 'Chart view' : 'Table view'}
              </Btn>
            )}
            <Btn onClick={() => loadLiveGL()} disabled={isRefreshingGl} title="Sync Live GL">
              <RefreshCw size={15} className={isRefreshingGl ? 'animate-spin' : ''} /> Sync
            </Btn>
            <Btn onClick={() => window.print()}><Printer size={15} /> Export PDF</Btn>
          </div>
        }
      />

      {/* 1. REAL-TIME DEPARTMENT SYNCHRONIZATION TILES (Phase 3 Core COA Split) */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Real-Time Department Revenue & COA Ledger Split (Today)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ECFDF5', color: '#047857', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12 }}>
              <CheckCircle2 size={12} /> Auto-Journal Active
            </span>
          </div>
          <span style={{ fontSize: 12, color: C.muted }}>
            COA Double-Entry Ledger Linked · ₹{fmt(liveSummary?.totals.total_collected || 0)} Collected Today
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {/* OPD Consultations Card */}
          <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderLeft: '4px solid #2563EB', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>4110 · OPD Revenue</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', marginTop: 2 }}>Outpatient Consults</div>
              </div>
              <div style={{ background: '#EFF6FF', padding: 6, borderRadius: 6, color: '#2563EB' }}>
                <Stethoscope size={16} />
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginTop: 8 }}>
              {fmt(liveSummary?.departments.OPD.revenue || 0)}
            </div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
              {liveSummary?.departments.OPD.share_percent || 0}% departmental share
            </div>
          </div>

          {/* Diagnostic Laboratory Card */}
          <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderLeft: '4px solid #7C3AED', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase' }}>4120 · LAB Revenue</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', marginTop: 2 }}>Pathology & Diagnostics</div>
              </div>
              <div style={{ background: '#F5F3FF', padding: 6, borderRadius: 6, color: '#7C3AED' }}>
                <FlaskConical size={16} />
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginTop: 8 }}>
              {fmt(liveSummary?.departments.LAB.revenue || 0)}
            </div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
              {liveSummary?.departments.LAB.share_percent || 0}% departmental share
            </div>
          </div>

          {/* Pharmacy Formulary Card */}
          <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderLeft: '4px solid #059669', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>4140 · PHARMACY Revenue</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', marginTop: 2 }}>Medicine Formulary</div>
              </div>
              <div style={{ background: '#ECFDF5', padding: 6, borderRadius: 6, color: '#059669' }}>
                <Pill size={16} />
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginTop: 8 }}>
              {fmt(liveSummary?.departments.PHARMACY.revenue || 0)}
            </div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
              {liveSummary?.departments.PHARMACY.share_percent || 0}% departmental share
            </div>
          </div>

          {/* Counter Tender Collections Card */}
          <div style={{ background: '#ffffff', border: '1px solid #E5E7EB', borderLeft: '4px solid #D97706', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>1110-1130 · Collections</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', marginTop: 2 }}>Counter Cash & Digital</div>
              </div>
              <div style={{ background: '#FFFBEB', padding: 6, borderRadius: 6, color: '#D97706' }}>
                <Wallet size={16} />
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginTop: 8 }}>
              {fmt(liveSummary?.totals.total_collected || 0)}
            </div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
              Cash: ₹{shortMoney(liveSummary?.tenders.cash || 0)} · UPI: ₹{shortMoney(liveSummary?.tenders.upi || 0)} · Card: ₹{shortMoney(liveSummary?.tenders.card || 0)}
            </div>
          </div>
        </div>
      </div>

      {error && <div style={{ marginBottom: 12 }}><Callout tone="red">{error}</Callout></div>}

      {/* 2. CONDITIONAL VIEW: LIVE GL JOURNAL STREAM OR ANALYTICS OVERVIEW */}
      {viewMode === 'gl_stream' ? (
        <section style={{ ...card }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Live General Ledger Journal Stream</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                Real-time balanced double-entry vouchers automatically posted from frontdesk cashier checkout
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: C.muted, marginRight: 4 }}>Filter Department:</span>
              {(['ALL', 'OPD', 'LAB', 'PHARMACY'] as const).map((dept) => (
                <button
                  key={dept}
                  onClick={() => setGlDeptFilter(dept)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: glDeptFilter === dept ? '#2563EB' : '#D1D5DB',
                    background: glDeptFilter === dept ? '#EFF6FF' : '#FFFFFF',
                    color: glDeptFilter === dept ? '#2563EB' : '#374151',
                    cursor: 'pointer'
                  }}
                >
                  {dept === 'ALL' ? 'All Departments' : dept}
                </button>
              ))}
            </div>
          </div>

          {!glEntries.length ? (
            <div style={{ padding: 40 }}>
              <Empty text="No journal entries recorded for this filter." />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {glEntries.map((jv) => {
                const isExpanded = expandedJv === jv.id;
                return (
                  <div
                    key={jv.id}
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      padding: '14px 18px',
                      background: isExpanded ? '#F9FAFB' : '#FFFFFF',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#1E40AF', ...mono }}>
                          {jv.journal_reference}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: jv.is_balanced ? '#ECFDF5' : '#FEF2F2',
                            color: jv.is_balanced ? '#047857' : '#B91C1C'
                          }}
                        >
                          {jv.is_balanced ? '✓ BALANCED' : 'UNBALANCED'}
                        </span>
                        {jv.invoice_number && (
                          <span style={{ fontSize: 12, color: '#4B5563', ...mono }}>
                            Inv: {jv.invoice_number}
                          </span>
                        )}
                        {jv.receipt_number && (
                          <span style={{ fontSize: 12, color: '#6B7280', ...mono }}>
                            Rcpt: {jv.receipt_number}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', ...mono }}>
                            Dr/Cr {fmt(jv.total_debit)}
                          </span>
                          <div style={{ fontSize: 11, color: C.muted }}>{jv.timestamp}</div>
                        </div>
                        <button
                          onClick={() => setExpandedJv(isExpanded ? null : jv.id)}
                          style={{
                            background: 'none',
                            border: '1px solid #D1D5DB',
                            borderRadius: 6,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            color: '#374151'
                          }}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Details
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>
                      {jv.narration} · Posted by <strong style={{ color: '#111827' }}>{jv.posted_by}</strong>
                    </div>

                    {/* EXPANDABLE DOUBLE-ENTRY LINE ITEMS */}
                    {isExpanded && (
                      <div style={{ marginTop: 12, borderTop: '1px solid #E5E7EB', paddingTop: 10 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: '#F3F4F6', color: '#4B5563', textAlign: 'left' }}>
                              <th style={{ padding: '6px 10px', fontWeight: 600 }}>Account</th>
                              <th style={{ padding: '6px 10px', fontWeight: 600 }}>Account Name</th>
                              <th style={{ padding: '6px 10px', fontWeight: 600 }}>Dept Tag</th>
                              <th style={{ padding: '6px 10px', fontWeight: 600, textAlign: 'right' }}>Debit (Dr)</th>
                              <th style={{ padding: '6px 10px', fontWeight: 600, textAlign: 'right' }}>Credit (Cr)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {jv.lines.map((ln, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                <td style={{ padding: '6px 10px', fontWeight: 700, color: '#1E3A8A', ...mono }}>{ln.account_code}</td>
                                <td style={{ padding: '6px 10px', color: '#1F2937' }}>{ln.account_name}</td>
                                <td style={{ padding: '6px 10px' }}>
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: ln.department === 'OPD' ? '#EFF6FF' : (ln.department === 'LAB' ? '#F5F3FF' : (ln.department === 'PHARMACY' ? '#ECFDF5' : '#F3F4F6')),
                                    color: ln.department === 'OPD' ? '#1D4ED8' : (ln.department === 'LAB' ? '#6D28D9' : (ln.department === 'PHARMACY' ? '#047857' : '#4B5563'))
                                  }}>
                                    {ln.department}
                                  </span>
                                </td>
                                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: ln.debit_amount > 0 ? 600 : 400, color: ln.debit_amount > 0 ? '#111827' : '#9CA3AF', ...mono }}>
                                  {ln.debit_amount > 0 ? fmt(ln.debit_amount) : '—'}
                                </td>
                                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: ln.credit_amount > 0 ? 600 : 400, color: ln.credit_amount > 0 ? '#111827' : '#9CA3AF', ...mono }}>
                                  {ln.credit_amount > 0 ? fmt(ln.credit_amount) : '—'}
                                </td>
                              </tr>
                            ))}
                            <tr style={{ background: '#F9FAFB', fontWeight: 700 }}>
                              <td colSpan={3} style={{ padding: '8px 10px', textAlign: 'right', color: '#374151' }}>Voucher Total:</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', color: '#111827', ...mono }}>{fmt(jv.total_debit)}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', color: '#111827', ...mono }}>{fmt(jv.total_credit)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* 3. PERIOD TABS FOR MANAGEMENT REVIEW */}
          <div style={{ marginBottom: 16 }}>
            <PillTabs
              tabs={[
                { key: 'MTD', label: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) },
                { key: lastKey, label: last.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) },
                { key: 'FY', label: 'Financial year to date' }
              ]}
              active={period}
              onPick={setPeriod}
            />
          </div>

          {/* KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <KpiCard label="Net revenue" value={k ? shortMoney(k.net_revenue) : '—'} sub={data?.period.label}
              trend={k?.growth_vs_last_year_percent != null ? `${k.growth_vs_last_year_percent >= 0 ? '+' : ''}${k.growth_vs_last_year_percent}% vs LY` : 'No LY data'}
              trendColor={(k?.growth_vs_last_year_percent ?? 0) >= 0 ? C.green : C.red} icon={<IndianRupee size={16} />} />
            <KpiCard label="Collection efficiency" value={k ? `${k.collection_efficiency_percent}%` : '—'} sub="Collected ÷ billed" icon={<Wallet size={16} />} />
            <KpiCard label="Insurance share" value={k ? `${k.insurance_share_percent}%` : '—'} sub="Of billed value" icon={<Shield size={16} />} />
            <KpiCard label="Discount % of gross" value={k ? `${k.discount_percent_of_gross}%` : '—'} sub={`Refunds ${k?.refund_percent_of_gross ?? 0}%`} icon={<Percent size={16} />} />
            <KpiCard label="Month-end projection" value={k?.month_end_projection != null ? shortMoney(k.month_end_projection) : '—'} sub="Run-rate only" icon={<TrendingUp size={16} />} />
          </div>

          {/* NET REVENUE CHART OR TABLE */}
          {asTable ? (
            <Panel title="Net revenue by month" sub="Table view">
              {trend.map((m) => (
                <div key={m.month} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderTop: `1px solid ${C.border}`, fontSize: 13 }}>
                  <span>{m.month}</span>
                  <span style={mono}>{fmt(m.net)}{m.projected != null ? ` · projected ${fmt(m.projected)}` : ''}</span>
                </div>
              ))}
            </Panel>
          ) : (
            <Panel title="Net revenue by month" sub="Last 12 months · lighter bar = run-rate projection to month end">
              {!trend.length && <Empty text="Loading…" />}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 200, padding: '16px 14px 0', position: 'relative' }}>
                {trend.map((m, i) => {
                  const projected = m.projected != null && m.projected > m.net;
                  return (
                    <div key={m.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                      style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', position: 'relative', cursor: 'default' }}>
                      {hover === i && (
                        <div role="tooltip" style={{ position: 'absolute', bottom: '100%', marginBottom: -8, zIndex: 2, background: C.text, color: '#fff', fontSize: 12, padding: '6px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                          {m.month} · {fmt(m.net)}{projected ? ` · projected ${fmt(m.projected!)}` : ''}
                        </div>
                      )}
                      {projected && <div style={{ width: '70%', maxWidth: 28, height: `${((m.projected! - m.net) / peak) * 100}%`, background: BAR_PROJECTED, borderRadius: '4px 4px 0 0' }} />}
                      <div style={{ width: '70%', maxWidth: 28, height: `${(m.net / peak) * 100}%`, minHeight: m.net > 0 ? 2 : 0, background: hover === i ? C.primaryDark : BAR, borderRadius: projected ? 0 : '4px 4px 0 0' }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 2, padding: '6px 14px 12px', borderTop: `1px solid ${C.border}` }}>
                {trend.map((m) => (
                  <span key={m.month} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: C.muted }}>{m.label}{m.projected != null ? '*' : ''}</span>
                ))}
              </div>
            </Panel>
          )}

          {/* DEPARTMENT BREAKDOWN & MIX */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginTop: 16 }}>
            <Panel title="Revenue by department" sub="Net of discounts">
              <HBar rows={(data?.departments || []).map((d) => ({ label: d.department, value: d.net, text: shortMoney(d.net), sub: `${d.share_percent}%` }))} />
            </Panel>
            <Panel title="Payer mix" sub="Share of billed value">
              <HBar rows={(data?.payer_mix || []).map((p) => ({ label: p.label, value: p.amount, text: `${p.share_percent}%`, sub: shortMoney(p.amount) }))} />
            </Panel>
            <Panel title="Insurer performance · days to pay" sub={`Claims settled in the period · denial rate ${data?.claim_denial_percent ?? 0}%`}>
              <HBar rows={(data?.insurers || []).map((x) => ({ label: x.name, value: x.avg_days_to_pay, text: `${x.avg_days_to_pay}d`, sub: `${x.claims} claim(s)` }))} />
            </Panel>
            <Panel title="Discount, refund and leakage · % of gross">
              <HBar rows={(data?.risk || []).map((r) => ({ label: r.label, value: r.percent, text: `${r.percent}%` }))} />
            </Panel>
          </div>
        </>
      )}
    </>
  );
};
