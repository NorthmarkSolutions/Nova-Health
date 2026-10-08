import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stamp, Undo2, Wallet, Monitor, Vault, ArrowDownToLine, LogIn } from 'lucide-react';
import { billingService, SupervisorDashboard } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { Btn, C, Callout, Empty, KpiCard, PageHeader, StatusChip, apiError, card, mono } from '../executive/executiveUi';
import { ageText, drawerTone, slaTone } from './supervisorMath';

const TONE = { red: C.red, amber: '#F59E0B', blue: C.primary, muted: C.muted } as const;
const COUNTER_STATUS: Record<string, [string, string, string]> = {
  OPEN: ['Open', C.green, C.greenSoft],
  CLOSING: ['Closing', C.amber, C.amberSoft],
  CLOSED: ['Closed', C.muted, '#F3F4F6']
};

export const SupervisorDashboardScreen: React.FC<{
  dash: SupervisorDashboard | null;
  onRefresh: () => Promise<void> | void;
  onEnterCounter: (shiftId: string) => void;
}> = ({ dash, onRefresh, onEnterCounter }) => {
  const { format: fmt } = useCurrency();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'green' | 'red'; text: string } | null>(null);
  const k = dash?.kpis;

  const pickup = async (shiftId: string, counterName: string) => {
    setBusy(shiftId);
    try {
      const v = await billingService.executeCashPickup({ shift_id: shiftId });
      setNotice({ tone: 'green', text: `${v.voucher_number} · ${fmt(v.amount)} collected from ${counterName}.` });
      await onRefresh();
    } catch (err) {
      setNotice({ tone: 'red', text: apiError(err, 'Cash pickup failed.') });
    } finally {
      setBusy(null);
    }
  };

  const alertAction = (a: SupervisorDashboard['alerts'][number]) => {
    if (a.action === 'PICKUP' && a.shift_id) {
      const c = dash?.counters.find((x) => x.shift_id === a.shift_id);
      return pickup(a.shift_id, c?.counter_name || 'counter');
    }
    navigate(a.action === 'APPROVALS' ? '/billing/supervisor/approvals' : a.action === 'REFUNDS' ? '/billing/supervisor/refunds' : '/billing/supervisor/closing');
  };

  return (
    <>
      <PageHeader
        title="Supervisor Dashboard"
        subtitle="Live counters, requests waiting on you and today’s collection across all counters."
        actions={<Btn variant="primary" onClick={() => navigate('/billing/supervisor/approvals')}>Review approvals</Btn>}
      />
      {notice && <div style={{ marginBottom: 12 }}><Callout tone={notice.tone}>{notice.text}</Callout></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <KpiCard
          label="Pending Approvals"
          value={k?.pending_approvals ?? '—'}
          sub={`${k?.approvals_past_sla ?? 0} past 15 min`}
          trend={k ? (k.approvals_past_sla ? 'SLA' : 'On time') : undefined}
          trendColor={k?.approvals_past_sla ? C.red : C.green}
          icon={<Stamp size={16} />}
          onClick={() => navigate('/billing/supervisor/approvals')}
        />
        <KpiCard
          label="Pending Refunds"
          value={k?.pending_refunds ?? '—'}
          sub={`${fmt(k?.pending_refund_value || 0)} requested`}
          trend={k?.refunds_failed_checks ? `${k.refunds_failed_checks} check failed` : undefined}
          trendColor={C.amber}
          icon={<Undo2 size={16} />}
          onClick={() => navigate('/billing/supervisor/refunds')}
        />
        <KpiCard label="Counter Collections" value={fmt(k?.collections_today || 0)} sub="Today · all counters" icon={<Wallet size={16} />} />
        <KpiCard
          label="Counters Active"
          value={k ? `${k.counters_open} / ${k.counters_total}` : '—'}
          sub={`${k?.counters_closing ?? 0} closing · ${(k?.counters_total ?? 0) - (k?.counters_open ?? 0) - (k?.counters_closing ?? 0)} closed`}
          icon={<Monitor size={16} />}
        />
        <KpiCard
          label="Cash to vault"
          value={fmt(k?.cash_to_vault || 0)}
          sub={`${k?.closings_awaiting ?? 0} closing(s) to review`}
          icon={<Vault size={16} />}
          onClick={() => navigate('/billing/supervisor/closing')}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, alignItems: 'start' }}>
        {/* Live counters */}
        <div style={{ ...card, gridColumn: '1 / -1' }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Live counters</span>
            <span style={{ fontSize: 12, color: C.muted }}>Drawer limit {fmt(dash?.drawer_limit || 50000)} · pickup at {dash?.pickup_threshold_percent ?? 80}%</span>
          </div>
          {!dash && <Empty text="Loading counters…" />}
          {dash && dash.counters.length === 0 && <Empty text="No billing counters are configured." />}
          <div style={{ overflowX: 'auto' }}>
            {(dash?.counters || []).map((c) => {
              const [label, fg, bg] = COUNTER_STATUS[c.status];
              const open = c.status === 'OPEN';
              const tone = drawerTone(c.utilization_percent, dash?.pickup_threshold_percent);
              return (
                <div
                  key={c.counter_code}
                  style={{ display: 'grid', gridTemplateColumns: 'minmax(150px,1.3fr) minmax(120px,1fr) 90px minmax(170px,1.6fr) 110px auto', gap: 12, alignItems: 'center', padding: '12px 14px', borderBottom: `1px solid ${C.border}`, minWidth: 760, opacity: c.status === 'CLOSED' ? 0.6 : 1 }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500 }}>{c.counter_name}</span>
                    <span style={{ fontSize: 12, color: C.muted }}>{c.counter_location || c.counter_code}</span>
                  </div>
                  <span style={{ fontSize: 13 }}>{c.cashier_name}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: fg, background: bg, padding: '2px 8px', borderRadius: 999, justifySelf: 'start' }}>{label}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ height: 8, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
                      <div style={{ width: `${open ? Math.min(100, c.utilization_percent) : 0}%`, height: '100%', background: TONE[tone] }} />
                    </div>
                    <span style={{ fontSize: 12, color: c.over_limit ? C.red : C.muted, ...mono }}>
                      {open ? `${fmt(c.expected_cash_in_drawer || 0)} · ${c.utilization_percent}% of limit` : '—'}
                      {c.pending_pickup ? ` · ${c.pending_pickup.voucher_number} requested` : ''}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, textAlign: 'right', ...mono }}>{open && c.total_collected != null ? fmt(c.total_collected) : '—'}</span>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {open && (c.pickup_due || c.pending_pickup) && (
                      <Btn style={{ height: 30, fontSize: 12 }} disabled={busy === c.shift_id} onClick={() => pickup(c.shift_id!, c.counter_name)}>
                        <ArrowDownToLine size={13} /> Cash pickup
                      </Btn>
                    )}
                    {open && c.shift_id && (
                      <Btn style={{ height: 30, fontSize: 12 }} title="Assist this counter in counter mode" onClick={() => onEnterCounter(c.shift_id!)}>
                        <LogIn size={13} /> Counter mode
                      </Btn>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Oldest approvals */}
        <div style={{ ...card }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Oldest approvals</span>
            <Btn variant="ghost" style={{ height: 26, fontSize: 13 }} onClick={() => navigate('/billing/supervisor/approvals')}>View all</Btn>
          </div>
          {dash && dash.oldest_approvals.length === 0 && <Empty text="Nothing waiting." />}
          {(dash?.oldest_approvals || []).map((a) => {
            const tone = slaTone(a.age_minutes, true);
            return (
              <div
                key={a.id}
                onClick={() => navigate(`/billing/supervisor/approvals?id=${a.id}`)}
                style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: C.primary }}>{a.type_label} · <span style={{ ...mono, fontWeight: 400, color: C.muted }}>{a.request_number}</span></span>
                  <span style={{ color: TONE[tone], fontWeight: tone === 'muted' ? 400 : 600 }}>{ageText(a.age_minutes)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14 }}>
                  <span>{a.patient_name}</span>
                  <span style={mono}>{a.request_type === 'DISCOUNT' ? `${a.requested_percent}% · ${fmt(a.value)}` : fmt(a.value)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: C.muted }}>
                  <span>{a.requested_by} · {a.counter_name}</span>
                  <StatusChip status={a.status} label={a.status === 'ESCALATED' ? 'Escalated' : undefined} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Alerts */}
        <div style={{ ...card }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Alerts</span>
          </div>
          {dash && dash.alerts.length === 0 && <Empty text="No alerts. Drawers, approvals and closings are within limits." />}
          <div style={{ padding: dash?.alerts.length ? 12 : 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(dash?.alerts || []).map((a, i) => (
              <div
                key={`${a.kind}-${i}`}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                  background: a.tone === 'red' ? C.redSoft : C.amberSoft, border: `1px solid ${a.tone === 'red' ? C.redBorder : C.amberBorder}` }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: a.tone === 'red' ? C.red : C.amber }}>{a.title}</span>
                  <span style={{ fontSize: 12, color: C.textSub }}>{a.text}</span>
                </div>
                <Btn style={{ height: 28, fontSize: 12 }} disabled={busy === a.shift_id} onClick={() => alertAction(a)}>
                  {a.action === 'PICKUP' ? 'Pickup' : a.action === 'CLOSING' ? 'Open' : 'Review'}
                </Btn>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
