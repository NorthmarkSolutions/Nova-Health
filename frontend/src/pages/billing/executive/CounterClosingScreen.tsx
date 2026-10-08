import React, { useCallback, useEffect, useState } from 'react';
import { Inbox, CheckCircle2, Scale, Vault, RefreshCw, ArrowDownToLine } from 'lucide-react';
import { billingService, ClosingSubmission, SupervisorShiftBoard } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { Btn, C, Callout, Empty, Field, KpiCard, PageHeader, apiError, card, inputStyle, mono } from './executiveUi';

const MIN_NOTE = 5;

const STATUS: Record<string, [string, string, string]> = {
  PENDING_APPROVAL: ['Submitted', C.primary, C.primarySoft],
  UNDER_INVESTIGATION: ['Investigating', C.red, C.redSoft],
  CLOSED: ['Signed off', C.green, C.greenSoft],
  CLOSED_VAR: ['Closed with variance', C.amber, C.amberSoft],
  HANDED: ['In vault', C.muted, '#F3F4F6']
};

const statusKey = (r: ClosingSubmission) =>
  r.vault_handover ? 'HANDED' : r.status === 'CLOSED' && r.closed_with_variance ? 'CLOSED_VAR' : r.status;

/** Phase 4 supervisor view: live drawers, cash pickups, closing reconciliation, sign-off and vault handover. */
export const CounterClosingScreen: React.FC = () => {
  const { format: fmt } = useCurrency();
  const [board, setBoard] = useState<SupervisorShiftBoard | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [finding, setFinding] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBoard(await billingService.getSupervisorShiftBoard());
      setError(null);
    } catch (err) {
      setError(apiError(err, 'Could not load counter closings.'));
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const varF = (v: number | null) => (v == null ? '—' : Math.abs(v) < 0.005 ? fmt(0) : `${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}`);
  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    try {
      setNotice(await action());
      setFinding('');
      await load();
    } catch (err) {
      setError(apiError(err, 'Action failed.'));
    } finally {
      setBusy(false);
    }
  };

  const closings = board?.closings || [];
  const sel = closings.find((c) => c.shift_id === selected) || closings.find((c) => c.status !== 'CLOSED') || closings[0];
  const k = board?.kpis;
  const short = finding.trim().length < MIN_NOTE;
  const matched = sel?.variance_status === 'GREEN_MATCH';

  return (
    <>
      <PageHeader
        title="Counter Closing"
        subtitle="Sign off matched counters, investigate variances, then hand cash to the vault."
        actions={
          <>
            <Btn onClick={load}><RefreshCw size={16} /> Refresh</Btn>
            <Btn
              variant="primary"
              disabled={busy || !k?.awaiting_vault}
              onClick={() => run(async () => {
                const v = await billingService.vaultHandover();
                return `Vault handover ${v.handover_number} · ${fmt(v.total_cash)} from ${v.shift_count} counter(s).`;
              })}
            >
              {k?.awaiting_vault ? `Confirm vault handover · ${fmt(k.cash_to_vault)}` : 'Vault handover'}
            </Btn>
          </>
        }
      />
      {error && <div style={{ marginBottom: 12 }}><Callout tone="red">{error}</Callout></div>}
      {notice && <div style={{ marginBottom: 12 }}><Callout tone="green">{notice}</Callout></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <KpiCard label="Submitted" value={k?.submitted ?? '—'} sub={`${k?.open_counters ?? 0} counter(s) still open`} icon={<Inbox size={16} />} />
        <KpiCard label="Matched" value={k?.matched ?? '—'} sub="Zero variance" icon={<CheckCircle2 size={16} />} />
        <KpiCard label="Net variance" value={varF(k?.net_variance ?? 0)} sub="Counted − expected" trendColor={C.red} icon={<Scale size={16} />} />
        <KpiCard label="Cash to vault" value={fmt(k?.cash_to_vault || 0)} sub={`${k?.awaiting_vault ?? 0} signed, not handed over`} icon={<Vault size={16} />} />
      </div>

      {/* Live drawers */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Live counters</span>
          <span style={{ fontSize: 12, color: C.muted }}>Drawer limit {fmt(board?.drawer_limit || 50000)} · pickup at {board?.pickup_threshold_percent ?? 80}%</span>
        </div>
        {(board?.live_counters || []).length === 0 && <Empty text="No counters are open." />}
        {(board?.live_counters || []).map((c) => {
          const util = c.utilization_percent;
          return (
            <div key={c.shift_id} style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,1.4fr) minmax(160px,2fr) 120px auto', gap: 12, alignItems: 'center', padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 500 }}>{c.counter_name}</span>
                <span style={{ fontSize: 12, color: C.muted }}>{c.cashier_name} · {c.counter_location}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ height: 8, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, util)}%`, height: '100%', background: util >= 100 ? C.red : c.pickup_due ? '#F59E0B' : C.primary }} />
                </div>
                <span style={{ fontSize: 12, color: c.over_limit ? C.red : C.muted }}>
                  {fmt(c.expected_cash_in_drawer)} cash · {util}% of limit{c.pending_pickup ? ` · pickup ${c.pending_pickup.voucher_number} requested` : ''}
                </span>
              </div>
              <span style={{ fontSize: 13, textAlign: 'right', ...mono }}>{fmt(c.total_collected)}</span>
              <Btn
                style={{ height: 32, fontSize: 13 }}
                disabled={busy || !(c.pickup_due || c.pending_pickup)}
                title={c.pickup_due || c.pending_pickup ? 'Collect cash above the opening float' : `Pickup unlocks at ${board?.pickup_threshold_percent ?? 80}% or on request`}
                onClick={() => run(async () => {
                  const v = await billingService.executeCashPickup({ shift_id: c.shift_id });
                  return `${v.voucher_number} · ${fmt(v.amount)} collected from ${c.counter_name}.`;
                })}
              >
                <ArrowDownToLine size={14} /> Cash pickup
              </Btn>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, alignItems: 'start' }}>
        <div style={{ ...card }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Closing submissions</span>
            <span style={{ fontSize: 12, color: C.muted }}>Variance = counted − expected</span>
          </div>
          {closings.length === 0 && <Empty text="No closings submitted yet." />}
          {closings.map((r) => {
            const [label, fg, bg] = STATUS[statusKey(r)] || [r.status, C.textSub, '#F3F4F6'];
            return (
              <div
                key={r.shift_id}
                onClick={() => { setSelected(r.shift_id); setFinding(''); }}
                style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,1.3fr) repeat(3, 80px) auto', gap: 8, alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', background: sel?.shift_id === r.shift_id ? C.hover : 'transparent', fontSize: 13 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 500 }}>{r.counter_name}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{r.cashier_name}</span>
                </div>
                {r.tenders.map((t) => (
                  <span key={t.tender} title={t.tender} style={{ textAlign: 'right', color: Math.abs(t.variance) < 0.005 ? C.green : C.red, ...mono }}>{varF(t.variance)}</span>
                ))}
                <span style={{ fontSize: 12, fontWeight: 500, color: fg, background: bg, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>{label}</span>
              </div>
            );
          })}
        </div>

        <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!sel && <Empty text="Select a closing to review." />}
          {sel && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{sel.counter_name}</span>
                  <span style={{ fontSize: 13, color: C.muted }}>
                    {sel.counter_location} · {sel.cashier_name} · submitted {sel.submitted_at ? new Date(sel.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
                {sel.investigation_number && <span style={{ fontSize: 12, color: C.red, ...mono }}>{sel.investigation_number}</span>}
              </div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1fr', gap: 8, padding: '8px 12px', background: C.bg, fontSize: 12, color: C.muted }}>
                  <span>Tender</span><span style={{ textAlign: 'right' }}>Expected</span><span style={{ textAlign: 'right' }}>Counted</span><span style={{ textAlign: 'right' }}>Variance</span>
                </div>
                {sel.tenders.map((t) => (
                  <div key={t.tender} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1fr', gap: 8, padding: '8px 12px', borderTop: `1px solid ${C.border}`, fontSize: 14 }}>
                    <span>{t.tender === 'CARD' ? 'Card (EDC)' : t.tender === 'CASH' ? 'Cash' : 'UPI'}</span>
                    <span style={{ textAlign: 'right', ...mono }}>{t.expected == null ? '—' : fmt(t.expected)}</span>
                    <span style={{ textAlign: 'right', ...mono }}>{t.counted == null ? '—' : fmt(t.counted)}</span>
                    <span style={{ textAlign: 'right', fontWeight: 600, color: Math.abs(t.variance) < 0.005 ? C.green : C.red, ...mono }}>{varF(t.variance)}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 13, color: C.textSub }}>
                <span style={{ color: C.muted }}>Denominations · </span>
                <span style={mono}>{sel.denominations?.text || '—'}</span>
              </div>
              {sel.cashier_note && <Callout tone="neutral">“{sel.cashier_note}” — {sel.cashier_name}</Callout>}
              {sel.supervisor_finding && <Callout tone={sel.status === 'UNDER_INVESTIGATION' ? 'red' : 'amber'} title="Supervisor finding">{sel.supervisor_finding}</Callout>}

              {sel.status === 'PENDING_APPROVAL' && matched && (
                <Btn variant="primary" disabled={busy} onClick={() => run(async () => {
                  await billingService.signOffShift(sel.shift_id, 'SIGN_OFF');
                  return `${sel.counter_name} signed off · cash bag ${fmt(sel.tenders[0].counted || 0)} sealed.`;
                })}>
                  Sign off · cash bag {fmt(sel.tenders[0].counted || 0)}
                </Btn>
              )}

              {(sel.status === 'PENDING_APPROVAL' || sel.status === 'UNDER_INVESTIGATION') && !matched && (
                <>
                  <Field label="Supervisor finding" hint="Required before acting on a variance.">
                    <textarea rows={3} style={{ ...inputStyle, height: 'auto', padding: 10 }} placeholder="What you checked and found" value={finding} onChange={(e) => setFinding(e.target.value)} />
                  </Field>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {sel.status === 'PENDING_APPROVAL' && (
                      <Btn variant="danger" disabled={busy || short} onClick={() => run(async () => {
                        const s = await billingService.signOffShift(sel.shift_id, 'INVESTIGATE', finding.trim());
                        return `Investigation ${s.closing?.investigation_number || ''} opened for ${sel.counter_name}.`;
                      })}>
                        Open investigation
                      </Btn>
                    )}
                    <Btn variant="primary" disabled={busy || short} onClick={() => run(async () => {
                      await billingService.signOffShift(sel.shift_id, 'SIGN_OFF_WITH_VARIANCE', finding.trim());
                      return `${sel.counter_name} closed with variance ${varF(sel.net_variance)}.`;
                    })}>
                      Sign off with variance
                    </Btn>
                  </div>
                </>
              )}

              {sel.status === 'CLOSED' && (
                <Callout tone={sel.closed_with_variance ? 'amber' : 'green'}>
                  {sel.vault_handover
                    ? `Cash handed to vault under ${sel.vault_handover}.`
                    : `Signed off by ${sel.signed_off_by}${sel.closed_with_variance ? ` with variance ${varF(sel.net_variance)}` : ' · matched'}. Awaiting vault handover.`}
                </Callout>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
