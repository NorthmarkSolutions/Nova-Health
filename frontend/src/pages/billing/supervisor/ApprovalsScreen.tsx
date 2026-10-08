import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Inbox, Percent, Ban, FileClock, Timer, RefreshCw } from 'lucide-react';
import { ApprovalRow, billingService, SupervisorApprovalQueue } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { Btn, C, Callout, Empty, Field, KpiCard, PageHeader, PillTabs, Row, StatusChip, apiError, card, inputStyle, mono } from '../executive/executiveUi';
import { ESCALATION_TIER, ageText, approvalDecision, discountAt, slaTone } from './supervisorMath';

const TYPE_COLORS: Record<string, [string, string]> = {
  DISCOUNT: [C.primary, C.primarySoft],
  INVOICE_VOID: [C.red, C.redSoft],
  CREDIT_LIMIT_OVERRIDE: [C.indigo, C.indigoSoft],
  REFUND: [C.amber, C.amberSoft]
};
const AGE_COLOR = { red: C.red, amber: C.amber, muted: C.muted } as const;

const TypeTag: React.FC<{ row: ApprovalRow }> = ({ row }) => {
  const [fg, bg] = TYPE_COLORS[row.request_type] || [C.textSub, '#F3F4F6'];
  return <span style={{ fontSize: 12, fontWeight: 600, color: fg, background: bg, padding: '2px 8px', borderRadius: 6 }}>{row.type_label}</span>;
};

/** Phase 5 approvals: discount, void and override requests from counters. Target decision time 15 minutes. */
export const ApprovalsScreen: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const { format: fmt } = useCurrency();
  const [params] = useSearchParams();
  const [queue, setQueue] = useState<SupervisorApprovalQueue | null>(null);
  const [tab, setTab] = useState<'pending' | 'decided'>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(params.get('id'));
  const [modPct, setModPct] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setQueue(await billingService.getSupervisorApprovals());
      setError(null);
    } catch (err) {
      setError(apiError(err, 'Could not load approvals.'));
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const rows = (tab === 'pending' ? queue?.pending : queue?.decided) || [];
  const all = [...(queue?.pending || []), ...(queue?.decided || [])];
  const sel = all.find((r) => r.id === selectedId) || rows[0];
  const k = queue?.kpis;

  const isDisc = sel?.request_type === 'DISCOUNT';
  const modRaw = sel ? modPct[sel.id] ?? String(sel.requested_percent) : '';
  const pct = parseFloat(modRaw) || 0;
  const noteText = sel ? note[sel.id] || '' : '';
  const state = sel ? approvalDecision(sel, { tier: queue?.reviewer_tier ?? null, modPercent: isDisc ? pct : undefined, note: noteText }) : null;
  const at = discountAt(sel?.bill_gross || 0, pct);

  const decide = async (action: 'APPROVE' | 'REJECT' | 'ESCALATE') => {
    if (!sel) return;
    setBusy(true);
    setError(null);
    try {
      const res = await billingService.actOnApproval(sel.id, {
        action,
        note: noteText.trim() || undefined,
        approved_percent: action === 'APPROVE' && isDisc ? pct : undefined
      });
      const word = action === 'APPROVE' ? `approved${isDisc ? ` at ${res.discount_percent}%` : ''}` : action === 'REJECT' ? 'rejected' : `escalated to ${ESCALATION_TIER}`;
      setNotice(`${res.request_number} ${word}${action !== 'ESCALATE' ? ` · ${res.requested_by} sees it on their next refresh` : ''}.`);
      const next = (queue?.pending || []).find((r) => r.id !== sel.id);
      setSelectedId(next?.id || res.id);
      await load();
      onChanged();
    } catch (err) {
      setError(apiError(err, 'Decision failed.'));
    } finally {
      setBusy(false);
    }
  };

  const policyColors = state ? ({ green: [C.green, C.greenSoft, '#BBF7D0'], amber: [C.amber, C.amberSoft, C.amberBorder], red: [C.red, C.redSoft, C.redBorder] } as const)[state.policyTone] : null;
  const policyText = !sel
    ? ''
    : sel.self_raised && queue?.reviewer_tier !== 'ADMIN'
      ? `This request was raised by a supervisor${sel.assisted_on ? ' in counter mode' : ''}. Self-approval is blocked; it routes to ${ESCALATION_TIER}.`
      : state?.withinLimit
        ? `Within your approval limit · ${sel.policy}`
        : `Above your approval limit (${sel.policy}). Lower the amount or escalate to ${ESCALATION_TIER}.`;

  return (
    <>
      <PageHeader
        title="Approvals"
        subtitle={`Discount, void and override requests from counters. Target decision time ${queue?.sla_minutes ?? 15} minutes; unreviewed after ${queue?.auto_escalate_minutes ?? 60} minutes they move to ${ESCALATION_TIER}.`}
        actions={<Btn onClick={load}><RefreshCw size={16} /> Refresh</Btn>}
      />
      {error && <div style={{ marginBottom: 12 }}><Callout tone="red">{error}</Callout></div>}
      {notice && <div style={{ marginBottom: 12 }}><Callout tone="green">{notice}</Callout></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
        <KpiCard label="Pending" value={k?.pending ?? '—'} sub={`Across ${k?.counters ?? 0} counters`} icon={<Inbox size={16} />} />
        <KpiCard label="Discounts" value={k?.discounts ?? '—'} sub={`${fmt(k?.discount_value || 0)} requested`} icon={<Percent size={16} />} />
        <KpiCard label="Voids" value={k?.voids ?? '—'} sub="Unpaid invoices" icon={<Ban size={16} />} />
        <KpiCard label="Other" value={k?.other ?? '—'} sub="Credit overrides" icon={<FileClock size={16} />} />
        <KpiCard label="Past SLA" value={k?.past_sla ?? '—'} sub={`Waiting over ${queue?.sla_minutes ?? 15} min`} trend={k?.past_sla ? 'Act now' : undefined} trendColor={C.red} icon={<Timer size={16} />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, alignItems: 'start' }}>
        {/* Queue */}
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
          {queue && rows.length === 0 && <Empty text="No requests here." />}
          {rows.map((r) => {
            const open = r.status === 'PENDING' || (r.status === 'ESCALATED' && r.can_decide);
            const tone = slaTone(r.age_minutes, open, r.sla_minutes);
            return (
              <div
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', background: sel?.id === r.id ? C.hover : 'transparent', display: 'flex', flexDirection: 'column', gap: 4 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <TypeTag row={r} />
                    <span style={{ fontSize: 12, color: C.muted, ...mono }}>{r.request_number}</span>
                  </span>
                  <span style={{ fontSize: 12, color: AGE_COLOR[tone], fontWeight: tone === 'muted' ? 400 : 600 }}>
                    {r.sla_breached ? '● ' : ''}{ageText(r.age_minutes)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14 }}>
                  <span>{r.patient_name}</span>
                  <span style={mono}>{r.request_type === 'DISCOUNT' ? `${r.requested_percent}% · ${fmt(r.value)}` : fmt(r.value)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: C.muted }}>
                  <span>{r.requested_by} · {r.counter_name}</span>
                  <StatusChip status={r.status} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail */}
        <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!sel && <Empty text="Select a request." />}
          {sel && state && policyColors && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <TypeTag row={sel} />
                    <span style={{ fontSize: 12, color: C.muted, ...mono }}>{sel.request_number}</span>
                  </span>
                  <span style={{ fontSize: 17, fontWeight: 600 }}>{sel.patient_name}</span>
                  <span style={{ fontSize: 13, color: C.muted, ...mono }}>{sel.uhid} · {sel.invoice_label}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>
                    Raised {new Date(sel.raised_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {sel.requested_by} · {sel.counter_name}
                    {sel.assisted_on ? ` · counter mode on ${sel.assisted_on}’s shift` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <StatusChip status={sel.status} />
                  <span style={{ fontSize: 12, color: AGE_COLOR[slaTone(sel.age_minutes, sel.can_decide, sel.sla_minutes)] }}>{ageText(sel.age_minutes)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Requested</span>
                  <span style={{ fontSize: 16, fontWeight: 600, ...mono }}>
                    {isDisc ? `${sel.requested_percent}% · ${fmt(discountAt(sel.bill_gross, sel.requested_percent).discount)}` : fmt(sel.value)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Reason</span>
                  <span style={{ fontSize: 14 }}>{sel.reason}</span>
                </div>
              </div>
              {sel.notes && <Callout tone="neutral">“{sel.notes}” — {sel.requested_by}</Callout>}
              {sel.escalation_label && <Callout tone="indigo" title="Escalated">{sel.escalation_label}{sel.escalated_at ? ` · ${new Date(sel.escalated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</Callout>}

              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', background: C.bg, fontSize: 12, color: C.muted }}>Invoice context</div>
                {sel.lines.length === 0 && <div style={{ padding: '8px 12px', fontSize: 13, color: C.muted }}>No billed lines.</div>}
                {sel.lines.map((l, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 12px', borderTop: `1px solid ${C.border}`, fontSize: 13 }}>
                    <span>{l.label}</span>
                    <span style={mono}>{fmt(l.amount)}</span>
                  </div>
                ))}
                <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {isDisc ? (
                    <>
                      <Row label="Gross" value={fmt(sel.bill_gross)} />
                      <Row label={`Discount at ${pct}%`} value={`− ${fmt(at.discount)}`} color={C.green} />
                      <Row label="Net payable" value={fmt(at.net)} strong />
                    </>
                  ) : sel.request_type === 'INVOICE_VOID' ? (
                    <>
                      <Row label="Invoice total" value={fmt(sel.requested_amount)} strong />
                      <Row label="On approval" value="Invoice cancelled · charges return to the queue" />
                    </>
                  ) : (
                    <Row label="Amount" value={fmt(sel.requested_amount)} strong />
                  )}
                </div>
              </div>

              <div style={{ padding: '10px 12px', borderRadius: 10, fontSize: 13, color: policyColors[0], background: policyColors[1], border: `1px solid ${policyColors[2]}` }}>{policyText}</div>

              {sel.can_decide ? (
                <>
                  {isDisc && (
                    <Field
                      label="Approve at (%)"
                      hint={state.overRequested ? `Cannot exceed the requested ${sel.requested_percent}%` : pct !== sel.requested_percent ? `Modified from ${sel.requested_percent}% requested` : 'Lower it to approve a smaller discount'}
                    >
                      <input
                        style={{ ...inputStyle, width: 120, borderColor: state.overRequested ? C.red : C.border, ...mono }}
                        inputMode="decimal"
                        value={modRaw}
                        onChange={(e) => setModPct((m) => ({ ...m, [sel.id]: e.target.value }))}
                      />
                    </Field>
                  )}
                  <Field label="Decision note" hint="Required to reject.">
                    <textarea
                      rows={3}
                      style={{ ...inputStyle, height: 'auto', padding: 10 }}
                      value={noteText}
                      placeholder="What you checked"
                      onChange={(e) => setNote((n) => ({ ...n, [sel.id]: e.target.value }))}
                    />
                  </Field>
                  {state.hint && <span style={{ fontSize: 12, color: C.amber }}>{state.hint}</span>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Btn variant="danger" disabled={busy || state.rejectDisabled} onClick={() => decide('REJECT')}>Reject</Btn>
                    <Btn disabled={busy || state.escalateDisabled} onClick={() => decide('ESCALATE')}>Escalate to Admin</Btn>
                    <Btn variant="primary" disabled={busy || state.approveDisabled} onClick={() => decide('APPROVE')}>
                      {isDisc ? `Approve ${pct}%` : 'Approve'}
                    </Btn>
                  </div>
                </>
              ) : (
                <Callout tone={sel.status === 'APPROVED' ? 'green' : sel.status === 'REJECTED' ? 'red' : 'indigo'}>
                  {sel.status === 'APPROVED' && `Approved${isDisc ? ` at ${sel.discount_percent}%` : ''} by ${sel.decided_by}${sel.decided_at ? ` · ${new Date(sel.decided_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`}
                  {sel.status === 'REJECTED' && `Rejected by ${sel.decided_by} · ${sel.rejection_reason}`}
                  {sel.status === 'ESCALATED' && (state.hint || `With ${ESCALATION_TIER}.`)}
                  {sel.review_notes && sel.status === 'APPROVED' ? ` · ${sel.review_notes}` : ''}
                </Callout>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
