// Billing · Admin — revenue analytics. Each list row is one lens on the period (headline figures, monthly trend,
// departments, payer mix, insurer performance, discount & refund risk, ledger postings); the right box shows it.
import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsField, INPUT, HMS } from '../../../components/hms';
import { billingService, GLJournalEntry, RevenueAnalytics } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { MONO, fmtWhen, titleCase } from './adminDeskData';
import { AdmBars, AdmTable } from './adminUi';

const LENSES = [
  { key: 'headline', title: 'Headline figures', sub: 'Net revenue, billing vs collection, growth and projection' },
  { key: 'trend', title: 'Monthly trend', sub: 'Net revenue for the last 12 months' },
  { key: 'departments', title: 'Departments', sub: 'Net revenue and invoices by department' },
  { key: 'payers', title: 'Payer mix', sub: 'Self pay, insurance and corporate share' },
  { key: 'insurers', title: 'Insurer performance', sub: 'Days to pay, settlements and deductions' },
  { key: 'risk', title: 'Discounts, refunds & leakage', sub: 'Share of gross billing given away or lost' },
  { key: 'ledger', title: 'Ledger postings', sub: 'Journal vouchers posted from billing to accounts' },
] as const;

const lastMonthKey = () => {
  const d = new Date();
  const l = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${l.getFullYear()}-${String(l.getMonth() + 1).padStart(2, '0')}`;
};

export const AdmAnalyticsView: React.FC<{ initialSelect?: string }> = ({ initialSelect }) => {
  const { format } = useCurrency();
  const [period, setPeriod] = useState('MTD');
  const [data, setData] = useState<RevenueAnalytics | null>(null);
  const [ledger, setLedger] = useState<GLJournalEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `l:${initialSelect}` : null);

  const load = useCallback(async () => {
    try {
      setData(await billingService.getRevenueAnalytics(period));
      setError(null);
    } catch (e) {
      setData(null);
      setError(apiError(e, 'Revenue analytics are unavailable.'));
    }
  }, [period]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  useEffect(() => {
    billingService
      .getLiveJournalStream({ limit: 50 })
      .then((r) => setLedger(r.entries))
      .catch(() => setLedger([]));
  }, []);

  const q = search.trim().toLowerCase();
  const rows: HmsListRow[] = LENSES.filter((l) => !q || `${l.title} ${l.sub}`.toLowerCase().includes(q)).map((l) => ({
    key: `l:${l.key}`,
    title: l.title,
    sub: l.sub,
    badge: l.key === 'ledger' ? <HmsBadge tone="gray">{ledger ? `${ledger.length} recent` : '…'}</HmsBadge> : <HmsBadge tone="gray">{data?.period.label || '…'}</HmsBadge>,
  }));

  const k = data?.kpis;
  const renderLens = (key: string) => {
    if (!data) return <HmsEmpty>{error || 'Loading analytics…'}</HmsEmpty>;
    if (key === 'headline' && k)
      return (
        <HmsSection title="Period figures">
          <HmsRow label="Net revenue" value={format(k.net_revenue)} hint={k.growth_vs_last_year_percent == null ? 'No figure for the same period last year' : `${k.growth_vs_last_year_percent >= 0 ? '+' : ''}${k.growth_vs_last_year_percent}% vs last year (${format(k.net_revenue_last_year)})`} />
          <HmsRow label="Billed" value={format(k.billed)} />
          <HmsRow label="Collected" value={format(k.collected)} hint={`Collection efficiency ${k.collection_efficiency_percent}%`} />
          <HmsRow label="Insurance share" value={`${k.insurance_share_percent}%`} />
          <HmsRow label="Discounts" value={`${k.discount_percent_of_gross}% of gross`} />
          <HmsRow label="Refunds" value={`${k.refund_percent_of_gross}% of gross`} />
          <HmsRow label="Month-end projection" value={k.month_end_projection == null ? '—' : format(k.month_end_projection)} hint="Run-rate to the end of the month" last />
        </HmsSection>
      );
    if (key === 'trend')
      return data.monthly_trend.length ? (
        <HmsSection title="Net revenue by month">
          <AdmBars items={data.monthly_trend.map((m) => ({ label: m.label, value: Math.max(m.net, m.projected || 0), display: format(m.net), note: m.projected ? `projected ${format(m.projected)}` : undefined }))} />
        </HmsSection>
      ) : (
        <HmsEmpty>No monthly figures yet.</HmsEmpty>
      );
    if (key === 'departments')
      return data.departments.length ? (
        <HmsSection title="By department · net of discounts">
          <AdmTable
            columns={[
              { key: 'd', label: 'Department' },
              { key: 'n', label: 'Net revenue', align: 'right', mono: true },
              { key: 's', label: 'Share', align: 'right', mono: true },
              { key: 'i', label: 'Invoices', align: 'right', mono: true },
            ]}
            rows={data.departments.map((d) => ({ d: titleCase(d.department), n: format(d.net), s: `${d.share_percent}%`, i: d.invoices.toLocaleString('en-IN') }))}
          />
        </HmsSection>
      ) : (
        <HmsEmpty>No department revenue in this period.</HmsEmpty>
      );
    if (key === 'payers')
      return data.payer_mix.length ? (
        <HmsSection title="Share of billed value">
          <AdmBars items={data.payer_mix.map((p) => ({ label: p.label, value: p.amount, display: format(p.amount), note: `${p.share_percent}%` }))} />
        </HmsSection>
      ) : (
        <HmsEmpty>No billing in this period.</HmsEmpty>
      );
    if (key === 'insurers')
      return data.insurers.length ? (
        <HmsSection title={`Claims settled · denial rate ${data.claim_denial_percent}%`}>
          <AdmTable
            columns={[
              { key: 'n', label: 'Insurer / TPA' },
              { key: 'c', label: 'Claims', align: 'right', mono: true },
              { key: 'd', label: 'Avg days to pay', align: 'right', mono: true },
              { key: 's', label: 'Settled', align: 'right', mono: true },
              { key: 'x', label: 'Deducted', align: 'right', mono: true },
            ]}
            rows={data.insurers.map((i) => ({ n: i.name, c: i.claims, d: i.avg_days_to_pay, s: format(i.settled), x: `${i.deduction_percent}%` }))}
          />
        </HmsSection>
      ) : (
        <HmsEmpty>No insurer settlements in this period.</HmsEmpty>
      );
    if (key === 'risk')
      return (
        <HmsSection title="Percent of gross billing">
          <AdmBars tone="#f59e0b" items={data.risk.map((r) => ({ label: r.label, value: r.percent, display: `${r.percent}%` }))} />
        </HmsSection>
      );
    if (key === 'ledger') {
      if (!ledger) return <HmsEmpty>Loading ledger postings…</HmsEmpty>;
      if (!ledger.length) return <HmsEmpty>No journal vouchers posted yet.</HmsEmpty>;
      return (
        <HmsSection title={`Recent journal vouchers · ${ledger.length}`}>
          {ledger.map((e, i) => (
            <HmsRow
              key={e.id}
              label={e.narration || e.journal_reference}
              hint={
                <>
                  <span style={MONO}>{e.journal_reference}</span> · {fmtWhen(e.timestamp)} · {e.invoice_number || e.receipt_number || e.source_type}
                </>
              }
              value={
                <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                  <span style={MONO}>{format(e.total_debit)}</span>
                  <HmsBadge tone={e.is_balanced ? 'green' : 'red'}>{e.is_balanced ? 'Balanced' : 'Unbalanced'}</HmsBadge>
                </span>
              }
              last={i === ledger.length - 1}
            />
          ))}
        </HmsSection>
      );
    }
    return null;
  };

  const renderDetail = (key: string | null) => {
    const lens = LENSES.find((l) => `l:${l.key}` === key);
    if (!lens) return <HmsEmpty>Select a lens from the list.</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={BarChart3} title={lens.title} badge={<HmsBadge tone="gray">{data?.period.label || '—'}</HmsBadge>} subtitle={data ? `${data.period.from} to ${data.period.to}` : lens.sub} />
        <HmsStatStrip
          items={[
            { label: 'Net revenue', value: k ? format(k.net_revenue) : '—', note: k?.growth_vs_last_year_percent == null ? 'vs last year —' : `${k.growth_vs_last_year_percent >= 0 ? '+' : ''}${k.growth_vs_last_year_percent}% vs last year` },
            { label: 'Collected', value: k ? format(k.collected) : '—', note: k ? `${k.collection_efficiency_percent}% of billed` : undefined, tone: k && k.collection_efficiency_percent < 90 ? 'amber' : 'default' },
            { label: 'Discounts', value: k ? `${k.discount_percent_of_gross}%` : '—', note: 'of gross' },
            { label: 'Projection', value: k?.month_end_projection == null ? '—' : format(k.month_end_projection), note: 'Month end' },
          ]}
        />
        <HmsDetailBody>
          {error && <HmsNotice tone="red">{error}</HmsNotice>}
          {data?.note && lens.key !== 'ledger' && <span style={{ fontSize: '12px', color: HMS.textSecondary }}>{data.note}</span>}
          {renderLens(lens.key)}
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="adm-analytics"
      title="Revenue analytics"
      description="Trends, mix and leakage for the period, from posted invoices and payments."
      total={LENSES.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search analytics"
      leftExtra={
        <HmsField label="Period" htmlFor="adm-analytics-period">
          <select id="adm-analytics-period" style={INPUT} value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="MTD">This month</option>
            <option value={lastMonthKey()}>Last month</option>
            <option value="FY">Financial year to date</option>
          </select>
        </HmsField>
      }
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open lens"
      detailLabel="Analytics"
      emptyText="No analytics match this search."
      renderDetail={renderDetail}
    />
  );
};
