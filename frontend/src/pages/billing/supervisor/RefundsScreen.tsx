import React, { useCallback, useEffect, useState } from 'react';
import { Inbox, IndianRupee, CheckCircle2, FileMinus, RefreshCw, CircleCheck, CircleX } from 'lucide-react';
import { billingService, RefundRow, SupervisorRefundQueue } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { Btn, C, Callout, Empty, Field, KpiCard, PageHeader, PillTabs, StatusChip, apiError, card, inputStyle, mono } from '../executive/executiveUi';
import { ESCALATION_TIER, REFUND_SLA_MINUTES, ageText, refundDecision, slaTone } from './supervisorMath';

const AGE_COLOR = { red: C.red, amber: C.amber, muted: C.muted } as const;

/** Phase 5 refunds: confirm the service was not delivered, then return money to the original tender. */
export const RefundsScreen: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const { format: fmt } = useCurrency();
  const [queue, setQueue] = useState<SupervisorRefundQueue | null>(null);
  const [tab, setTab] = useState<'pending' | 'decided'>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setQueue(await billingService.getSupervisorRefunds());
      setError(null);
    } catch (err) {
      setError(apiError(err, 'Could not load refunds.'));
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const rows = (tab === 'pending' ? queue?.pending : queue?.decided) || [];
  const all: RefundRow[] = [...(queue?.pending || []), ...(queue?.decided || [])];
  const sel = all.find((r) => r.id === selectedId) || rows[0];
  const noteText = sel ? note[sel.id] || '' : '';
  const state = sel ? refundDecision(sel, { tier: queue?.reviewer_tier ?? null, note: noteText }) : null;
  const k = queue?.kpis;

  const decide = async (action: 'APPROVE' | 'REJECT' | 'ESCALATE') => {
    if (!sel) return;
    setBusy(true);
    setError(null);
    try {
      const res = await billingService.actOnRefund(sel.id, { action, note: noteText.trim() || undefined });
      const r = res.refund;
      setNotice(
        action === 'REJECT'
          ? `${r.refund_number} rejected · ${r.requested_by} notified.`
          : action === 'ESCALATE'
            ? `${r.refund_number} escalated to ${ESCALATION_TIER}.`
            : r.awaiting_cash
              ? `${r.refund_number} approved · ${r.requested_by} can pay ${fmt(r.amount)} from the drawer.`
              : `${r.refund_number} approved · ${r.original_tender} reversal started · ${res.credit_note?.credit_note_number}.`
      );
      const next = (queue?.pending || []).find((x) => x.id !== sel.id);
      setSelectedId(next?.id || r.id);
      await load();
      onChanged();
    } catch (err) {
      setError(apiError(err, 'Refund decision failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Refunds"
        subtitle="Confirm the service was not delivered before approving. Money goes back to the original tender."
        actions={<Btn onClick={load}><RefreshCw size={16} /> Refresh</Btn>}
      />
      {error && <div style={{ marginBottom: 12 }}><Callout tone="red">{error}</Callout></div>}
      {notice && <div style={{ marginBottom: 12 }}><Callout tone="green">{notice}</Callout></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
        <KpiCard label="Pending" value={k?.pending ?? '—'} sub={`${k?.failed_verification ?? 0} failed verification`} icon={<Inbox size={16} />} />
        <KpiCard label="Value pending" value={fmt(k?.value_pending || 0)} sub="To original tender" icon={<IndianRupee size={16} />} />
        <KpiCard label="Approved today" value={k?.approved_today ?? '—'} sub={`${k?.awaiting_cash ?? 0} awaiting cash payout`} icon={<CheckCircle2 size={16} />} />
        <KpiCard label="Credit notes" value={k?.credit_notes ?? '—'} sub={`${fmt(k?.credit_note_value || 0)} issued today`} icon={<FileMinus size={16} />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...card }}>
            <div style={{ padding: 12, borderBottom: `1px solid ${C.border}` }}>
              <PillTabs
                tabs={[
                  { key: 'pending', label: 'Pending', count: queue?.pending.length ?? 0 },
                  { key: 'decided', label: 'Decided today', count: queue?.decided.length ?? 0 }
                ]}
                active={tab}
                onPick={(t) => setTab(t as 'pending' | 'decided')}
              />
            </div>
            {queue && rows.length === 0 && <Empty text="No refunds here." />}
            {rows.map((r) => {
              const tone = slaTone(r.age_minutes, r.can_decide, REFUND_SLA_MINUTES);
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', background: sel?.id === r.id ? C.hover : 'transparent', display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                    <span style={{ ...mono, color: C.muted }}>{r.refund_number}</span>
                    <span style={{ color: AGE_COLOR[tone], fontWeight: tone === 'muted' ? 400 : 600 }}>{ageText(r.age_minutes)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14 }}>
                    <span>{r.patient_name}</span>
                    <span style={mono}>{fmt(r.amount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: C.muted }}>
                    <span>{r.requested_by} · {r.counter_name}</span>
                    <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {r.verified != null && r.can_decide && (
                        <span style={{ color: r.verified ? C.green : C.red, fontWeight: 500 }}>{r.verified ? 'Verified' : 'Check failed'}</span>
                      )}
                      <StatusChip status={r.awaiting_cash ? 'PENDING' : r.status} label={r.awaiting_cash ? 'Awaiting cash' : undefined} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ ...card }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 15 }}>Credit notes issued today</div>
            {(queue?.credit_notes || []).length === 0 && <Empty text="None yet." />}
            {(queue?.credit_notes || []).map((c) => (
              <div key={c.credit_note_number} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={mono}>{c.credit_note_number}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{c.patient_name} · {c.tender || '—'} · {new Date(c.issued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
                <span style={mono}>{fmt(c.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!sel && <Empty text="Select a refund." />}
          {sel && state && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, color: C.muted, ...mono }}>{sel.refund_number}</span>
                  <span style={{ fontSize: 17, fontWeight: 600 }}>{sel.patient_name}</span>
                  <span style={{ fontSize: 13, color: C.muted, ...mono }}>{sel.uhid} · {sel.invoice_number}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>
                    Raised {new Date(sel.raised_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {sel.requested_by} · {sel.reason}
                  </span>
                </div>
                <StatusChip status={sel.status} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12, color: C.muted }}>Refund amount</span>
                <span style={{ fontSize: 20, fontWeight: 600, ...mono }}>{fmt(sel.amount)}</span>
              </div>

              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', background: C.bg, fontSize: 12, color: C.muted }}>Items</div>
                {sel.lines.map((l, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 12px', borderTop: `1px solid ${C.border}`, fontSize: 13 }}>
                    <span>{l.label}</span>
                    <span style={mono}>{fmt(l.amount)}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Original payment</span>
                  <span style={mono}>{sel.payment_text}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Refund route</span>
                  <span>{sel.route}</span>
                </div>
              </div>
              {sel.justification && <Callout tone="neutral">“{sel.justification}” — {sel.requested_by}</Callout>}

              {sel.checks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Verification</span>
                  {sel.checks.map((c, i) => (
                    <div
                      key={i}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, fontSize: 13,
                        background: c.ok ? C.greenSoft : C.redSoft, border: `1px solid ${c.ok ? '#BBF7D0' : C.redBorder}` }}
                    >
                      {c.ok ? <CircleCheck size={15} color={C.green} /> : <CircleX size={15} color={C.red} />}
                      <span style={{ fontWeight: 500 }}>{c.label}</span>
                      <span style={{ color: C.textSub }}>{c.value}{c.manual ? ' (manual check)' : ''}</span>
                    </div>
                  ))}
                </div>
              )}

              {sel.can_decide ? (
                <>
                  <Field label="Decision note" hint="Required to reject.">
                    <textarea rows={3} style={{ ...inputStyle, height: 'auto', padding: 10 }} value={noteText} placeholder="What you verified" onChange={(e) => setNote((n) => ({ ...n, [sel.id]: e.target.value }))} />
                  </Field>
                  <span style={{ fontSize: 12, color: state.hint ? C.amber : C.muted }}>{state.hint || `On approval: ${state.outcome}.`}</span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Btn variant="danger" disabled={busy || state.rejectDisabled} onClick={() => decide('REJECT')}>Reject</Btn>
                    {sel.status !== 'ESCALATED' && <Btn disabled={busy} onClick={() => decide('ESCALATE')}>Escalate to Admin</Btn>}
                    <Btn variant="primary" disabled={busy || state.approveDisabled} onClick={() => decide('APPROVE')}>Approve refund</Btn>
                  </div>
                </>
              ) : (
                <Callout tone={sel.status === 'REJECTED' ? 'red' : sel.status === 'ESCALATED' ? 'indigo' : 'green'}>
                  {sel.status === 'DISBURSED' && `Refunded via ${sel.original_tender} · ${sel.credit_note_number} issued${sel.decided_by ? ` · approved by ${sel.decided_by}` : ''}`}
                  {sel.status === 'APPROVED' && `Approved by ${sel.decided_by} · awaiting cash disbursal at the counter`}
                  {sel.status === 'REJECTED' && `Rejected by ${sel.decided_by} · ${sel.rejection_reason}`}
                  {sel.status === 'ESCALATED' && `With ${ESCALATION_TIER}.`}
                </Callout>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
