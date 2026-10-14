// Billing · Admin — overview (dashboard layout, design bible §19.6): collections against the daily target, department
// mix, revenue at risk, receivables ageing, today's OPD front desk and everything waiting on the admin.
import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { HMS, PANEL, SECTION_LABEL, HmsBadge, HmsEmpty, HmsTone } from '../../../components/hms';
import { useCurrency } from '../../../config/currency';
import { opdFlag, visitAmount } from '../supervisor/supervisorDeskData';
import { AdminDeskData, MONO, titleCase } from './adminDeskData';
import { AdmBars } from './adminUi';

export interface AdmOverviewViewProps {
  data: AdminDeskData;
  goTo: (tab: string, filter?: string) => void;
}

const Panel: React.FC<{ title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, sub, action, children }) => (
  <section style={{ ...PANEL, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div style={{ padding: '18px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', borderBottom: `1px solid ${HMS.divider}` }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: HMS.text }}>{title}</h2>
        {sub && <p style={{ margin: '4px 0 0', fontSize: '13px', color: HMS.textSecondary }}>{sub}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const LinkRow: React.FC<{ label: string; hint?: string; value: React.ReactNode; tone?: HmsTone; onClick: () => void }> = ({ label, hint, value, tone = 'gray', onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="hms-row"
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', padding: '12px 20px', border: 'none', borderBottom: `1px solid ${HMS.divider}`, background: '#ffffff', cursor: 'pointer', textAlign: 'left' }}
  >
    <span style={{ minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: HMS.text }}>{label}</span>
      {hint && <span style={{ display: 'block', fontSize: '12px', color: HMS.textSecondary, marginTop: '2px' }}>{hint}</span>}
    </span>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
      <HmsBadge tone={tone}>{value}</HmsBadge>
      <ChevronRight size={16} color={HMS.textMuted} />
    </span>
  </button>
);

export const AdmOverviewView: React.FC<AdmOverviewViewProps> = ({ data, goTo }) => {
  const { format } = useCurrency();
  const o = data.overview;
  const [hover, setHover] = useState<number | null>(null);

  if (data.loading && !o) return <section style={PANEL}><HmsEmpty>Loading the revenue overview…</HmsEmpty></section>;
  if (!o) return <section style={PANEL}><HmsEmpty>The revenue overview is unavailable. Try Refresh (Alt+R).</HmsEmpty></section>;

  const trend = o.trend_30_days;
  const peak = Math.max(1, o.daily_budget, ...trend.map((t) => t.revenue));
  const targetTop = 100 - (o.daily_budget / peak) * 100;
  const daysMet = trend.filter((t) => t.revenue >= t.budget && t.budget > 0).length;
  const ar = o.receivables_aging;

  const visits = data.visits;
  const leak = visits.filter((v) => opdFlag(v) === 'leak');
  const desk = visits.filter((v) => opdFlag(v) === 'desk');
  const deskAll = visits.filter((v) => v.billing.state === 'PAID_AT_DESK' && v.status !== 'CANCELLED');
  const counterPaid = visits.filter((v) => v.billing.state === 'PAID');
  const sum = (l: typeof visits) => l.reduce((s, v) => s + visitAmount(v), 0);

  const escalated = [...(data.approvals?.pending || []), ...(data.refunds?.pending || [])].filter((r) => r.status === 'ESCALATED' && r.can_decide).length;
  const tq = data.tariffQueue?.kpis;
  const reopen = (data.period?.reopen_requests || []).filter((l) => l.reopen.pending).length;
  const highRisk = data.integrity?.kpis.high_risk_signals ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px', alignItems: 'start' }}>
        <Panel title="Collections · last 30 days" sub={`Against the ${format(o.daily_budget)} daily target · target met on ${daysMet} of ${trend.length} days`}>
          <div style={{ padding: '20px', position: 'relative' }}>
            <div style={{ position: 'relative', height: '160px', display: 'flex', alignItems: 'flex-end', gap: '2px' }} role="img" aria-label={`Daily collections for the last 30 days, peak ${format(Math.max(0, ...trend.map((t) => t.revenue)))}`}>
              <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: `${targetTop}%`, borderTop: `1px dashed ${HMS.textMuted}` }} />
              <span aria-hidden style={{ position: 'absolute', right: 0, top: `calc(${targetTop}% - 18px)`, fontSize: '12px', color: HMS.textSecondary, background: '#ffffff', paddingLeft: '4px' }}>
                Target {format(o.daily_budget)}
              </span>
              {trend.map((t, i) => (
                <div
                  key={t.date}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  title={`${t.day} · ${format(t.revenue)}`}
                  style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'default' }}
                >
                  <div style={{ width: '100%', height: `${Math.max(t.revenue > 0 ? 2 : 0, (t.revenue / peak) * 100)}%`, background: HMS.primary, opacity: hover === null || hover === i ? 1 : 0.45, borderRadius: '4px 4px 0 0', transition: 'opacity 120ms ease-out' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: HMS.textSecondary }}>
              <span>{trend[0]?.day}</span>
              <span style={{ color: HMS.text, fontWeight: 600 }}>{hover !== null ? `${trend[hover].day} · ${format(trend[hover].revenue)}` : `Today · ${format(o.revenue_today)}`}</span>
              <span>{trend[trend.length - 1]?.day}</span>
            </div>
          </div>
        </Panel>

        <Panel title="Revenue by department · month to date" sub={`${format(o.mtd_revenue)} collected · ${o.mtd_achievement_pct}% of the month-to-date target`} action={<button type="button" onClick={() => goTo('analytics')} style={{ border: 'none', background: 'transparent', color: HMS.primary, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Analytics</button>}>
          {o.department_revenue.every((d) => !d.amount) ? (
            <HmsEmpty>No collections this month yet.</HmsEmpty>
          ) : (
            <AdmBars items={[...o.department_revenue].sort((a, b) => b.amount - a.amount).map((d) => ({ label: titleCase(d.department), value: d.amount, display: format(d.amount), note: `${d.share_percent}%` }))} />
          )}
        </Panel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', alignItems: 'start' }}>
        <Panel title="Waiting on you" sub="Decisions only a Billing Admin can take">
          <LinkRow label="Escalated approvals & refunds" hint="Above the supervisor’s limit, self-raised or past SLA" value={escalated || 'None'} tone={escalated ? 'red' : 'green'} onClick={() => goTo('approvals', 'escalated')} />
          <LinkRow label="Tariff change requests" hint={tq?.above_alert ? `${tq.above_alert} above 15% · CFO confirmation` : 'Proposed by departments'} value={tq ? tq.pending || 'None' : '—'} tone={tq?.pending ? 'amber' : 'green'} onClick={() => goTo('tariffs', 'pending')} />
          <LinkRow label="High-risk integrity signals" hint="Fraud and leakage patterns" value={data.integrity ? highRisk || 'None' : '—'} tone={highRisk ? 'red' : 'green'} onClick={() => goTo('integrity', 'signals')} />
          <LinkRow label="Period reopen requests" hint="Need CFO approval" value={data.period ? reopen || 'None' : '—'} tone={reopen ? 'amber' : 'green'} onClick={() => goTo('close', 'reopen')} />
        </Panel>

        <Panel title="Today at the OPD front desk" sub={`${visits.length} visit${visits.length === 1 ? '' : 's'} from reception and online booking`} action={<button type="button" onClick={() => goTo('opd')} style={{ border: 'none', background: 'transparent', color: HMS.primary, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>OPD revenue</button>}>
          <LinkRow label="Paid at the billing counter" value={`${counterPaid.length} · ${format(sum(counterPaid))}`} tone="green" onClick={() => goTo('opd')} />
          <LinkRow label="Collected at the front desk" hint={desk.length ? `${format(sum(desk))} not yet handed to billing` : 'All handed to billing'} value={`${deskAll.length} · ${format(sum(deskAll))}`} tone={desk.length ? 'amber' : 'green'} onClick={() => goTo('opd', 'desk')} />
          <LinkRow label="Seen by the doctor · fee unpaid" hint="Revenue leakage" value={leak.length ? `${leak.length} · ${format(sum(leak))}` : 'None'} tone={leak.length ? 'red' : 'green'} onClick={() => goTo('opd', 'leak')} />
        </Panel>

        <Panel title="Receivables ageing" sub={`${format(ar.total_outstanding)} outstanding on unpaid invoices`}>
          {ar.total_outstanding <= 0 ? (
            <HmsEmpty>No unpaid invoices.</HmsEmpty>
          ) : (
            <AdmBars
              items={[
                { label: '0–30 days', value: ar.bucket_0_30, display: format(ar.bucket_0_30) },
                { label: '31–60 days', value: ar.bucket_31_60, display: format(ar.bucket_31_60) },
                { label: '61–90 days', value: ar.bucket_61_90, display: format(ar.bucket_61_90) },
                { label: 'Over 90 days', value: ar.bucket_90_plus, display: format(ar.bucket_90_plus) },
              ]}
            />
          )}
        </Panel>
      </div>

      <Panel title="Revenue at risk" sub={`${format(o.leakage_at_risk_amount)} in unbilled charges and overdue balances · the largest items`} action={<button type="button" onClick={() => goTo('integrity')} style={{ border: 'none', background: 'transparent', color: HMS.primary, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Revenue integrity</button>}>
        {o.leakage_items.length === 0 ? (
          <HmsEmpty>Nothing at risk: every service is billed and no balance is overdue.</HmsEmpty>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.4fr) 120px', gap: '12px', padding: '10px 20px', background: HMS.subtle, ...SECTION_LABEL }}>
              <span>Item</span>
              <span>Patient · department</span>
              <span style={{ textAlign: 'right' }}>Amount</span>
            </div>
            {o.leakage_items.map((l) => (
              <div key={`${l.type}-${l.id}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.4fr) 120px', gap: '12px', alignItems: 'center', padding: '12px 20px', borderBottom: `1px solid ${HMS.divider}` }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HmsBadge tone={l.type === 'Unbilled Charge' ? 'amber' : 'red'}>{l.type === 'Unbilled Charge' ? 'Unbilled' : 'Overdue'}</HmsBadge>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: HMS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.service_name}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: '12px', color: HMS.textSecondary, marginTop: '2px' }}>{l.reason}</span>
                </span>
                <span style={{ fontSize: '13px', color: HMS.label }}>
                  {l.patient_name} · {titleCase(l.department)}
                </span>
                <span style={{ ...MONO, textAlign: 'right', fontSize: '13px' }}>{format(l.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};
