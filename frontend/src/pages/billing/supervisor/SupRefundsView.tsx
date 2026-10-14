// Billing · Supervisor — refund requests: confirm the service was not delivered, then return the money to the original
// tender (card/UPI reversal with a credit note, or cash paid from the cashier's drawer).
import React, { useState } from 'react';
import { Undo2, Check, X, ArrowUpRight, CircleCheck, CircleX } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsField, HmsTone, TEXTAREA } from '../../../components/hms';
import { RefundRow, billingService } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { ESCALATION_TIER, REFUND_SLA_MINUTES, ageText, refundDecision, slaTone } from './supervisorMath';
import { SupervisorDeskData, MONO, fmtClock } from './supervisorDeskData';

export interface SupRefundsViewProps {
  data: SupervisorDeskData;
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
  /** On the Billing Admin desk the list leads with refunds escalated to the admin. */
  audience?: 'supervisor' | 'admin';
}

const STATUS: Record<string, { label: string; tone: HmsTone }> = {
  PENDING: { label: 'Pending', tone: 'amber' },
  ESCALATED: { label: 'Escalated', tone: 'dark' },
  APPROVED: { label: 'Awaiting cash', tone: 'blue' },
  REJECTED: { label: 'Rejected', tone: 'red' },
  DISBURSED: { label: 'Refunded', tone: 'green' },
};
const PILLS = ['escalated', 'open', 'failed', 'cash', 'decided'];
const AGE_TONE = { red: 'red', amber: 'amber', muted: 'default' } as const;

export const SupRefundsView: React.FC<SupRefundsViewProps> = ({ data, notify, initialFilter, initialSelect, audience = 'supervisor' }) => {
  const { format } = useCurrency();
  const queue = data.refunds;
  const all: RefundRow[] = [...(queue?.pending || []), ...(queue?.decided || [])];
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : audience === 'admin' ? 'escalated' : 'open');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `r:${initialSelect}` : null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const match = (r: RefundRow, p: string) =>
    p === 'escalated' ? r.status === 'ESCALATED' && r.can_decide : p === 'open' ? r.can_decide : p === 'failed' ? r.can_decide && r.verified === false : p === 'cash' ? r.awaiting_cash : !r.can_decide;
  const q = search.trim().toLowerCase();
  const visible = all.filter((r) => match(r, pill) && (!q || [r.refund_number, r.patient_name, r.uhid, r.invoice_number, r.requested_by, r.counter_name, r.reason].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = visible.map((r) => {
    const st = r.awaiting_cash ? STATUS.APPROVED : STATUS[r.status] || { label: r.status, tone: 'gray' as HmsTone };
    return {
      key: `r:${r.id}`,
      title: r.patient_name || r.uhid,
      badge: r.can_decide && r.verified === false ? <HmsBadge tone="red">Check failed</HmsBadge> : <HmsBadge tone={st.tone}>{st.label}</HmsBadge>,
      sub: (
        <>
          <span style={MONO}>{r.refund_number}</span> · {r.invoice_number} · {r.requested_by}
        </>
      ),
      metaLeft: r.can_decide ? `Waiting ${ageText(r.age_minutes)} · ${r.original_tender}` : `${r.original_tender} · ${r.reason}`,
      metaRight: format(r.amount),
    };
  });

  const decide = async (sel: RefundRow, action: 'APPROVE' | 'REJECT' | 'ESCALATE', noteText: string) => {
    setBusy(true);
    try {
      const res = await billingService.actOnRefund(sel.id, { action, note: noteText.trim() || undefined });
      const r = res.refund;
      notify(
        action === 'REJECT'
          ? `${r.refund_number} rejected · ${r.requested_by} notified`
          : action === 'ESCALATE'
            ? `${r.refund_number} escalated to ${ESCALATION_TIER}`
            : r.awaiting_cash
              ? `${r.refund_number} approved · ${r.requested_by} pays ${format(r.amount)} from the drawer`
              : `${r.refund_number} approved · ${r.original_tender} reversal started · ${res.credit_note?.credit_note_number || 'credit note issued'}`
      );
      setSelected(null);
      await data.reload();
    } catch (e) {
      notify(apiError(e, 'The refund decision failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const renderDetail = (key: string | null) => {
    if (data.loading && !queue) return <HmsEmpty>Loading refunds…</HmsEmpty>;
    const sel = all.find((r) => `r:${r.id}` === key);
    if (!sel) return <HmsEmpty>{all.length ? 'Select a refund from the list.' : 'No refund requests today.'}</HmsEmpty>;
    const noteText = note[sel.id] || '';
    const state = refundDecision(sel, { tier: queue?.reviewer_tier ?? null, note: noteText });
    const st = sel.awaiting_cash ? STATUS.APPROVED : STATUS[sel.status] || { label: sel.status, tone: 'gray' as HmsTone };
    const credit = (queue?.credit_notes || []).find((c) => c.credit_note_number === sel.credit_note_number);

    return (
      <>
        <HmsDetailHeader
          icon={Undo2}
          title={`Refund · ${sel.patient_name || sel.uhid}`}
          badge={<HmsBadge tone={st.tone}>{st.label}</HmsBadge>}
          subtitle={
            <>
              <span style={MONO}>{sel.refund_number}</span> · {sel.uhid} · {sel.invoice_number}
            </>
          }
        />
        <HmsStatStrip
          items={[
            { label: 'Refund', value: format(sel.amount), note: sel.reason },
            { label: 'Original payment', value: sel.original_tender || '—', note: sel.payment_text },
            { label: sel.can_decide ? 'Waiting' : 'Raised', value: sel.can_decide ? ageText(sel.age_minutes) : fmtClock(sel.raised_at), note: `SLA ${REFUND_SLA_MINUTES} min`, tone: sel.can_decide ? AGE_TONE[slaTone(sel.age_minutes, true, REFUND_SLA_MINUTES)] : 'default' },
            { label: 'Verification', value: sel.verified === false ? 'Failed' : sel.verified ? 'Passed' : 'Manual', tone: sel.verified === false ? 'red' : sel.verified ? 'green' : 'amber', note: `${sel.checks.length} check${sel.checks.length === 1 ? '' : 's'}` },
          ]}
        />
        <HmsDetailBody>
          {sel.can_decide && state.hint && <HmsNotice tone={sel.verified === false ? 'red' : 'amber'}>{state.hint}</HmsNotice>}
          {sel.can_decide && !state.hint && <HmsNotice tone="blue">On approval: {state.outcome}.</HmsNotice>}

          {sel.checks.length > 0 && (
            <HmsSection title="Service not delivered — checks">
              {sel.checks.map((c, i) => (
                <HmsRow
                  key={i}
                  last={i === sel.checks.length - 1}
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      {c.ok ? <CircleCheck size={16} color="#16a34a" /> : <CircleX size={16} color="#dc2626" />}
                      {c.label}
                    </span>
                  }
                  hint={c.manual ? 'Manual check' : undefined}
                  value={c.value}
                />
              ))}
            </HmsSection>
          )}

          <HmsSection title="Items to refund">
            {sel.lines.map((l, i) => (
              <HmsRow key={i} label={l.label} value={<span style={MONO}>{format(l.amount)}</span>} />
            ))}
            <HmsRow label={<strong>Total</strong>} value={<strong>{format(sel.amount)}</strong>} hint={`Route: ${sel.route}`} last />
          </HmsSection>

          <HmsSection title="Request">
            <HmsRow label="Reason" value={sel.reason || '—'} />
            {sel.justification && <HmsRow label="Justification" value={`“${sel.justification}”`} />}
            <HmsRow label="Raised" value={`${fmtClock(sel.raised_at)} by ${sel.requested_by}`} hint={sel.counter_name} last />
          </HmsSection>

          {sel.can_decide ? (
            <HmsSection title="Your decision" padded>
              <HmsField label="Decision note" htmlFor="sup-refund-note" hint="Required to reject (at least 5 characters).">
                <textarea id="sup-refund-note" style={TEXTAREA} value={noteText} placeholder="What you verified" onChange={(e) => setNote((n) => ({ ...n, [sel.id]: e.target.value }))} />
              </HmsField>
            </HmsSection>
          ) : (
            <HmsNotice tone={sel.status === 'REJECTED' ? 'red' : sel.status === 'ESCALATED' ? 'blue' : 'green'}>
              {sel.status === 'DISBURSED' && `Refunded via ${sel.original_tender}${sel.credit_note_number ? ` · ${sel.credit_note_number}` : ''}${credit ? ` (${format(credit.amount)})` : ''}${sel.decided_by ? ` · approved by ${sel.decided_by}` : ''}`}
              {sel.status === 'APPROVED' && `Approved by ${sel.decided_by} · the cashier pays the cash from the drawer against a signed voucher`}
              {sel.status === 'REJECTED' && `Rejected by ${sel.decided_by} · ${sel.rejection_reason}`}
              {sel.status === 'ESCALATED' && `With ${ESCALATION_TIER}.`}
            </HmsNotice>
          )}
        </HmsDetailBody>
        {sel.can_decide && (
          <HmsDetailFooter>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sel.status === 'ESCALATED' ? 2 : 3}, minmax(0, 1fr))`, gap: '10px' }}>
              <HmsButton variant="danger" icon={X} block disabled={busy || state.rejectDisabled} onClick={() => decide(sel, 'REJECT', noteText)} title={state.rejectDisabled ? 'Add a note to reject' : 'Reject this refund'}>
                Reject
              </HmsButton>
              {sel.status !== 'ESCALATED' && (
                <HmsButton icon={ArrowUpRight} block disabled={busy} onClick={() => decide(sel, 'ESCALATE', noteText)}>
                  Escalate
                </HmsButton>
              )}
              <HmsButton variant="primary" icon={Check} block disabled={busy || state.approveDisabled} onClick={() => decide(sel, 'APPROVE', noteText)}>
                Approve refund
              </HmsButton>
            </div>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="sup-refunds"
      title="Refunds"
      description={audience === 'admin' ? 'Refunds above the supervisor’s limit or escalated to you. Confirm the service was not delivered before approving.' : 'Confirm the service was not delivered before approving. Money goes back to the original tender.'}
      total={all.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search refund, patient, invoice or cashier"
      pills={[
        ...(audience === 'admin' ? [{ key: 'escalated', label: 'Escalated to me', count: all.filter((r) => r.status === 'ESCALATED' && r.can_decide).length, tone: 'red' as const }] : []),
        { key: 'open', label: 'To decide', count: all.filter((r) => r.can_decide).length },
        { key: 'failed', label: 'Check failed', count: all.filter((r) => r.can_decide && r.verified === false).length, tone: 'red' },
        { key: 'cash', label: 'Awaiting cash', count: all.filter((r) => r.awaiting_cash).length, tone: 'amber' },
        { key: 'decided', label: 'Decided today', count: all.filter((r) => !r.can_decide).length },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="decide"
      detailLabel="Refund request"
      emptyText="No refunds match this search or filter."
      renderDetail={renderDetail}
    />
  );
};
