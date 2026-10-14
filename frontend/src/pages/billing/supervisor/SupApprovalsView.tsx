// Billing · Supervisor — discount, void and credit-override requests from the counters. Lower a discount before
// approving, reject with a note, or escalate to the Billing Admin. Self-raised requests are never decidable here.
import React, { useState } from 'react';
import { Stamp, Check, X, ArrowUpRight } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsField, HmsTone, INPUT, TEXTAREA } from '../../../components/hms';
import { ApprovalRow, billingService } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { ESCALATION_TIER, ageText, approvalDecision, discountAt, slaTone } from './supervisorMath';
import { SupervisorDeskData, MONO, fmtClock } from './supervisorDeskData';

export interface SupApprovalsViewProps {
  data: SupervisorDeskData;
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
  /** On the Billing Admin desk the list leads with requests escalated to the admin. */
  audience?: 'supervisor' | 'admin';
}

const TYPE_TONE: Record<string, HmsTone> = { DISCOUNT: 'blue', INVOICE_VOID: 'red', CREDIT_LIMIT_OVERRIDE: 'dark', REFUND: 'amber' };
const STATUS: Record<string, { label: string; tone: HmsTone }> = {
  PENDING: { label: 'Pending', tone: 'amber' },
  ESCALATED: { label: 'Escalated', tone: 'dark' },
  APPROVED: { label: 'Approved', tone: 'green' },
  REJECTED: { label: 'Rejected', tone: 'red' },
};
const PILLS = ['escalated', 'open', 'sla', 'DISCOUNT', 'INVOICE_VOID', 'decided'];
const isOpen = (r: ApprovalRow) => r.status === 'PENDING' || (r.status === 'ESCALATED' && r.can_decide);
const AGE_TONE = { red: 'red', amber: 'amber', muted: 'default' } as const;

export const SupApprovalsView: React.FC<SupApprovalsViewProps> = ({ data, notify, initialFilter, initialSelect, audience = 'supervisor' }) => {
  const { format } = useCurrency();
  const queue = data.approvals;
  const all = [...(queue?.pending || []), ...(queue?.decided || [])];
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : audience === 'admin' ? 'escalated' : 'open');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `a:${initialSelect}` : null);
  const [modPct, setModPct] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const match = (r: ApprovalRow, p: string) =>
    p === 'escalated' ? r.status === 'ESCALATED' && r.can_decide : p === 'open' ? isOpen(r) : p === 'sla' ? isOpen(r) && r.sla_breached : p === 'decided' ? !isOpen(r) : isOpen(r) && r.request_type === p;
  const q = search.trim().toLowerCase();
  const visible = all.filter((r) => match(r, pill) && (!q || [r.request_number, r.patient_name, r.uhid, r.invoice_label, r.requested_by, r.counter_name, r.reason].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = visible.map((r) => {
    const st = STATUS[r.status] || { label: r.status, tone: 'gray' as HmsTone };
    return {
      key: `a:${r.id}`,
      title: `${r.type_label} · ${r.patient_name || r.uhid}`,
      badge: r.sla_breached && isOpen(r) ? <HmsBadge tone="red">Past SLA</HmsBadge> : <HmsBadge tone={st.tone}>{st.label}</HmsBadge>,
      sub: (
        <>
          <span style={MONO}>{r.request_number}</span> · {r.requested_by} · {r.counter_name}
        </>
      ),
      metaLeft: isOpen(r) ? `Waiting ${ageText(r.age_minutes)}` : `Decided ${fmtClock(r.decided_at)}`,
      metaRight: r.request_type === 'DISCOUNT' ? `${r.requested_percent}% · ${format(r.value)}` : format(r.value),
    };
  });

  const decide = async (sel: ApprovalRow, action: 'APPROVE' | 'REJECT' | 'ESCALATE', pct: number, noteText: string) => {
    setBusy(true);
    try {
      const isDisc = sel.request_type === 'DISCOUNT';
      const res = await billingService.actOnApproval(sel.id, { action, note: noteText.trim() || undefined, approved_percent: action === 'APPROVE' && isDisc ? pct : undefined });
      const word = action === 'APPROVE' ? `approved${isDisc ? ` at ${res.discount_percent}%` : ''}` : action === 'REJECT' ? 'rejected' : `escalated to ${ESCALATION_TIER}`;
      notify(`${res.request_number} ${word}${action !== 'ESCALATE' ? ` · ${res.requested_by} sees it on their next refresh` : ''}`);
      setSelected(null);
      await data.reload();
    } catch (e) {
      notify(apiError(e, 'The decision failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const renderDetail = (key: string | null) => {
    if (data.loading && !queue) return <HmsEmpty>Loading approvals…</HmsEmpty>;
    const sel = all.find((r) => `a:${r.id}` === key);
    if (!sel) return <HmsEmpty>{all.length ? 'Select a request from the list.' : 'No discount, void or override requests today.'}</HmsEmpty>;
    const isDisc = sel.request_type === 'DISCOUNT';
    const modRaw = modPct[sel.id] ?? String(sel.requested_percent);
    const pct = parseFloat(modRaw) || 0;
    const noteText = note[sel.id] || '';
    const tier = queue?.reviewer_tier ?? null;
    const state = approvalDecision(sel, { tier, modPercent: isDisc ? pct : undefined, note: noteText });
    const at = discountAt(sel.bill_gross || 0, pct);
    const st = STATUS[sel.status] || { label: sel.status, tone: 'gray' as HmsTone };
    const open = isOpen(sel);
    const blocked = sel.self_raised && tier !== 'ADMIN';
    const policyText = blocked
      ? `You raised this request${sel.assisted_on ? ' in counter mode' : ''}. Self-approval is blocked; it routes to ${ESCALATION_TIER}.`
      : state.withinLimit
        ? `Within your approval limit · ${sel.policy}`
        : `Above your approval limit (${sel.policy}). Lower the amount or escalate to ${ESCALATION_TIER}.`;

    return (
      <>
        <HmsDetailHeader
          icon={Stamp}
          title={`${sel.type_label} · ${sel.patient_name || sel.uhid}`}
          badge={<HmsBadge tone={TYPE_TONE[sel.request_type] || 'gray'}>{st.label}</HmsBadge>}
          subtitle={
            <>
              <span style={MONO}>{sel.request_number}</span> · {sel.uhid} · {sel.invoice_label}
            </>
          }
        />
        <HmsStatStrip
          items={[
            { label: 'Requested', value: isDisc ? `${sel.requested_percent}%` : format(sel.value), note: isDisc ? format(discountAt(sel.bill_gross, sel.requested_percent).discount) : sel.type_label },
            { label: 'Bill', value: format(sel.bill_gross || sel.requested_amount), note: sel.invoice_label },
            { label: open ? 'Waiting' : 'Raised', value: open ? ageText(sel.age_minutes) : fmtClock(sel.raised_at), note: `SLA ${sel.sla_minutes} min`, tone: open ? AGE_TONE[slaTone(sel.age_minutes, true, sel.sla_minutes)] : 'default' },
            { label: 'Raised by', value: sel.requested_by, note: sel.counter_name },
          ]}
        />
        <HmsDetailBody>
          {sel.escalation_label && <HmsNotice tone="blue">Escalated: {sel.escalation_label}{sel.escalated_at ? ` · ${fmtClock(sel.escalated_at)}` : ''}</HmsNotice>}
          {open && <HmsNotice tone={state.policyTone === 'green' ? 'green' : state.policyTone === 'red' ? 'red' : 'amber'}>{policyText}</HmsNotice>}

          <HmsSection title="Request">
            <HmsRow label="Reason" value={sel.reason || '—'} />
            {sel.notes && <HmsRow label="Cashier note" value={`“${sel.notes}”`} />}
            <HmsRow label="Raised" value={`${fmtClock(sel.raised_at)} by ${sel.requested_by}`} hint={sel.assisted_on ? `Counter mode on ${sel.assisted_on}’s shift` : sel.counter_name} last />
          </HmsSection>

          <HmsSection title="Invoice context">
            {sel.lines.length === 0 && <HmsRow label="No billed lines" last />}
            {sel.lines.map((l, i) => (
              <HmsRow key={i} label={l.label} value={<span style={MONO}>{format(l.amount)}</span>} />
            ))}
            {isDisc ? (
              <>
                <HmsRow label="Gross" value={format(sel.bill_gross)} />
                <HmsRow label={`Discount at ${pct}%`} value={<span style={{ color: '#15803d' }}>− {format(at.discount)}</span>} />
                <HmsRow label={<strong>Net payable</strong>} value={<strong>{format(at.net)}</strong>} last />
              </>
            ) : sel.request_type === 'INVOICE_VOID' ? (
              <HmsRow label={<strong>Invoice total</strong>} hint="On approval the invoice is cancelled and its charges return to the queue" value={<strong>{format(sel.requested_amount)}</strong>} last />
            ) : (
              <HmsRow label={<strong>Amount</strong>} value={<strong>{format(sel.requested_amount)}</strong>} last />
            )}
          </HmsSection>

          {open && sel.can_decide && !blocked ? (
            <HmsSection title="Your decision" padded>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {isDisc && (
                  <HmsField label="Approve at (%)" htmlFor="sup-approve-pct" hint={state.overRequested ? `Cannot exceed the requested ${sel.requested_percent}%` : pct !== sel.requested_percent ? `Lowered from ${sel.requested_percent}% requested` : 'Lower it to approve a smaller discount'}>
                    <input
                      id="sup-approve-pct"
                      style={{ ...INPUT, width: '140px', borderColor: state.overRequested ? '#dc2626' : undefined }}
                      inputMode="decimal"
                      value={modRaw}
                      onChange={(e) => setModPct((m) => ({ ...m, [sel.id]: e.target.value }))}
                    />
                  </HmsField>
                )}
                <HmsField label="Decision note" htmlFor="sup-approve-note" hint="Required to reject (at least 5 characters).">
                  <textarea id="sup-approve-note" style={TEXTAREA} value={noteText} placeholder="What you checked" onChange={(e) => setNote((n) => ({ ...n, [sel.id]: e.target.value }))} />
                </HmsField>
                {state.hint && <span style={{ fontSize: '12px', color: '#b45309' }}>{state.hint}</span>}
              </div>
            </HmsSection>
          ) : (
            !open && (
              <HmsNotice tone={sel.status === 'APPROVED' ? 'green' : sel.status === 'REJECTED' ? 'red' : 'blue'}>
                {sel.status === 'APPROVED' && `Approved${isDisc ? ` at ${sel.discount_percent}%` : ''} by ${sel.decided_by}${sel.decided_at ? ` · ${fmtClock(sel.decided_at)}` : ''}${sel.review_notes ? ` · ${sel.review_notes}` : ''}`}
                {sel.status === 'REJECTED' && `Rejected by ${sel.decided_by} · ${sel.rejection_reason}`}
                {sel.status === 'ESCALATED' && (state.hint || `With ${ESCALATION_TIER}.`)}
              </HmsNotice>
            )
          )}
        </HmsDetailBody>
        {open && sel.can_decide && !blocked && (
          <HmsDetailFooter>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
              <HmsButton variant="danger" icon={X} block disabled={busy || state.rejectDisabled} onClick={() => decide(sel, 'REJECT', pct, noteText)} title={state.rejectDisabled ? 'Add a note to reject' : 'Reject this request'}>
                Reject
              </HmsButton>
              <HmsButton icon={ArrowUpRight} block disabled={busy || state.escalateDisabled} onClick={() => decide(sel, 'ESCALATE', pct, noteText)}>
                Escalate
              </HmsButton>
              <HmsButton variant="primary" icon={Check} block disabled={busy || state.approveDisabled} onClick={() => decide(sel, 'APPROVE', pct, noteText)}>
                {isDisc ? `Approve ${pct}%` : 'Approve'}
              </HmsButton>
            </div>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="sup-approvals"
      title="Approvals"
      description={
        audience === 'admin'
          ? 'Discounts, voids and overrides above the supervisor’s limit, self-raised, or unreviewed past SLA — only you can decide these.'
          : `Requests from the counters. Decide within ${queue?.sla_minutes ?? 15} min; unreviewed after ${queue?.auto_escalate_minutes ?? 60} min they move to ${ESCALATION_TIER}.`
      }
      total={all.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search request, patient, cashier or counter"
      pills={[
        ...(audience === 'admin' ? [{ key: 'escalated', label: 'Escalated to me', count: all.filter((r) => r.status === 'ESCALATED' && r.can_decide).length, tone: 'red' as const }] : []),
        { key: 'open', label: 'Open', count: all.filter(isOpen).length },
        { key: 'sla', label: 'Past SLA', count: all.filter((r) => isOpen(r) && r.sla_breached).length, tone: 'red' },
        { key: 'DISCOUNT', label: 'Discounts', count: all.filter((r) => isOpen(r) && r.request_type === 'DISCOUNT').length },
        { key: 'INVOICE_VOID', label: 'Voids', count: all.filter((r) => isOpen(r) && r.request_type === 'INVOICE_VOID').length },
        { key: 'decided', label: 'Decided today', count: all.filter((r) => !isOpen(r)).length },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="decide"
      detailLabel="Approval request"
      emptyText="No requests match this search or filter."
      renderDetail={renderDetail}
    />
  );
};
