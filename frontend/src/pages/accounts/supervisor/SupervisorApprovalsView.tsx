// Accounts Supervisor · approval review (first checker).
// One view serves the Overview review queue and the Journal, Vendor bill and Expense approval sections.
// Decisions go to POST /approval-requests/<id>/decision/; the server enforces DoFA limits, SoD and risk acknowledgements.
import React, { useState } from 'react';
import { BookCheck, ReceiptText, WalletCards, ClipboardCheck, Check, CornerUpLeft, X, TriangleAlert, Send } from 'lucide-react';
import {
  HmsMasterDetail,
  HmsListRow,
  HmsBadge,
  HmsButton,
  HmsDetailHeader,
  HmsStatStrip,
  HmsDetailBody,
  HmsDetailFooter,
  HmsSection,
  HmsRow,
  HmsNotice,
  HmsEmpty,
  HmsModal,
  HmsField,
  HmsToggle,
  INPUT,
  TEXTAREA,
  HMS,
} from '../../../components/hms';
import type { LucideIcon } from 'lucide-react';
import { accountsService, ApprovalRequestItem } from '../../../services/accountsService';
import { fmtDate, fmtDateTime, humanize, inr2, num } from '../executive/executiveData';
import { MONO, useAction } from '../executive/executiveHelpers';
import { StatusBadge } from '../executive/executiveUi';
import { ageHours, ageLabel, criticalFlags, docLabel, ESCALATION_REASONS, isOverdue, isSupervisorPending, supervisorLimit } from './supervisorData';
import type { SupervisorViewProps } from './supervisorHelpers';

type Scope = 'all' | 'journal' | 'vendor_bill' | 'expense';

const SCOPE_ICON: Record<string, LucideIcon> = { journal: BookCheck, vendor_bill: ReceiptText, expense: WalletCards };

type Decision = 'return' | 'reject' | 'escalate';

interface Draft {
  id: string;
  decision: Decision;
  comment: string;
  reason: string;
  error?: string;
}

const DECISION_TEXT: Record<Decision, { title: string; button: string; done: string; hint: string }> = {
  return: { title: 'Return for correction', button: 'Return to executive', done: 'returned to the executive', hint: 'Tell the executive exactly what to fix.' },
  reject: { title: 'Reject', button: 'Reject', done: 'rejected', hint: 'Rejection is final for this submission. Give the reason.' },
  escalate: { title: 'Escalate to Accounts Manager', button: 'Escalate', done: 'escalated to the Accounts Manager', hint: 'Explain what the manager needs to decide.' },
};

export const SupervisorApprovalsView: React.FC<SupervisorViewProps & { scope: Scope; listId: string; title: string; description: string; leftExtra?: React.ReactNode }> = ({
  data,
  notify,
  initialFilter,
  initialSelect,
  scope,
  listId,
  title,
  description,
  leftExtra,
}) => {
  const all = data.requests.filter((r) => scope === 'all' || r.document_type === scope);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'pending');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [ackFor, setAckFor] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const { busy, run } = useAction(data, notify);

  const filters: Record<string, (r: ApprovalRequestItem) => boolean> = {
    pending: isSupervisorPending,
    overdue: (r) => isSupervisorPending(r) && isOverdue(r),
    critical: (r) => isSupervisorPending(r) && criticalFlags(r).length > 0,
    returned: (r) => r.status === 'returned',
    decided: (r) => ['approved', 'forwarded', 'escalated'].includes(r.status) || (r.status === 'pending' && !isSupervisorPending(r)),
    rejected: (r) => r.status === 'rejected' || r.status === 'withdrawn',
    all: () => true,
  };
  const count = (k: string) => all.filter(filters[k]).length;

  // The record behind each request, from the ledger lists the workspace already holds
  const journalOf = (r: ApprovalRequestItem) => data.journals.find((j) => j.id === r.document_id);
  const billOf = (r: ApprovalRequestItem) => data.bills.find((b) => b.id === r.document_id);
  const expenseOf = (r: ApprovalRequestItem) => data.expenses.find((e) => e.id === r.document_id);
  const summaryOf = (r: ApprovalRequestItem) => {
    if (r.document_type === 'journal') return journalOf(r)?.description;
    if (r.document_type === 'vendor_bill') return billOf(r)?.vendor?.name;
    if (r.document_type === 'expense') {
      const e = expenseOf(r);
      return e ? `${humanize(e.expense_type)} · ${humanize(e.department_id)}` : undefined;
    }
    return undefined;
  };

  const q = search.trim().toLowerCase();
  const visible = all
    .filter((r) => (filters[pill] || filters.all)(r) && (!q || [r.reference_no, r.maker_name, r.document_type, summaryOf(r)].some((v) => (v || '').toLowerCase().includes(q))))
    // Oldest first for the work pills (what must be decided first); newest first otherwise
    .sort((a, b) => (['pending', 'overdue', 'critical'].includes(pill) ? 1 : -1) * (new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()));

  const rows: HmsListRow[] = visible.map((r) => {
    const crit = criticalFlags(r);
    const h = ageHours(r.submitted_at);
    return {
      key: r.id,
      title: summaryOf(r) || `${docLabel(r.document_type)} ${r.reference_no}`,
      badge: <StatusBadge status={r.status} />,
      sub: (
        <>
          {scope === 'all' ? `${docLabel(r.document_type)} · ` : ''}
          <span style={MONO}>{r.reference_no}</span> · {r.maker_name || '—'}
        </>
      ),
      metaLeft: crit.length ? (
        <HmsBadge tone="red">{humanize(crit[0])}</HmsBadge>
      ) : (
        <span style={{ color: isSupervisorPending(r) && (h ?? 0) > 24 ? '#b45309' : undefined }}>
          {ageLabel(h)} waiting · {humanize(r.priority)}
        </span>
      ),
      metaRight: <strong>{inr2(r.amount)}</strong>,
    };
  });

  const approve = (r: ApprovalRequestItem, over: boolean) => {
    const crit = criticalFlags(r);
    run(
      'approve',
      () => accountsService.processDecision(r.id, { decision: over ? 'approve_and_forward' : 'approve', acknowledgements: ackFor === r.id ? crit : [], version: r.version }),
      over ? `${r.reference_no} verified and forwarded to the Accounts Manager` : `${r.reference_no} approved`,
      'Could not approve'
    );
  };

  const decide = async () => {
    if (!draft) return;
    const r = all.find((x) => x.id === draft.id);
    if (!r) return;
    if (draft.comment.trim().length < 5) return setDraft({ ...draft, error: 'Write at least 5 characters so the executive knows why.' });
    const ok = await run(
      'decide',
      () =>
        accountsService.processDecision(r.id, {
          decision: draft.decision,
          comment: draft.comment.trim(),
          reason_code: draft.decision === 'escalate' ? draft.reason : undefined,
          version: r.version,
        }),
      `${r.reference_no} ${DECISION_TEXT[draft.decision].done}`,
      `Could not ${draft.decision} ${r.reference_no}`
    );
    if (ok) setDraft(null);
  };

  const docSection = (r: ApprovalRequestItem) => {
    if (r.document_type === 'journal') {
      const j = journalOf(r);
      if (!j) return null;
      const lines = j.lines || [];
      return (
        <>
          <HmsSection title="Narration" padded>
            <div style={{ fontSize: '14px', color: HMS.text, lineHeight: 1.6 }}>{j.description || 'No narration recorded.'}</div>
          </HmsSection>
          <HmsSection title={`Journal lines (${lines.length})`}>
            {lines.length ? (
              lines.map((ln, idx) => (
                <HmsRow
                  key={ln.id || idx}
                  last={idx === lines.length - 1}
                  label={ln.account_name || ln.account_code || ln.account_id}
                  hint={[ln.account_code, ln.cost_center_code, ln.narration].filter(Boolean).join(' · ') || undefined}
                  value={<strong>{num(ln.debit) > 0 ? `Dr ${inr2(ln.debit)}` : `Cr ${inr2(ln.credit)}`}</strong>}
                />
              ))
            ) : (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>The server returned no lines for this journal.</div>
            )}
          </HmsSection>
          <HmsSection title="Journal">
            <HmsRow label="Journal date" value={fmtDate(j.journal_date)} />
            <HmsRow label="Entry type" value={humanize(j.entry_type)} />
            <HmsRow label="External reference" value={j.external_reference || '—'} />
            <HmsRow label="Balanced" value={Math.abs(num(j.total_debit) - num(j.total_credit)) < 0.005 ? <HmsBadge tone="green">Yes</HmsBadge> : <HmsBadge tone="red">No</HmsBadge>} last />
          </HmsSection>
        </>
      );
    }
    if (r.document_type === 'vendor_bill') {
      const b = billOf(r);
      if (!b) return null;
      const twm = b.three_way_match;
      return (
        <>
          <HmsSection title="3-way match">
            {twm ? (
              <>
                <HmsRow label="Purchase order" value={twm.po_no || '—'} />
                <HmsRow label="Goods receipt (GRN)" value={twm.grn_no || '—'} />
                <HmsRow label="Result" value={<HmsBadge tone={twm.result === 'matched' ? 'green' : 'red'}>{humanize(twm.result)}</HmsBadge>} />
                <HmsRow label="Variance" value={`${inr2(twm.variance_amount)} (${num(twm.variance_pct)}%)`} last />
              </>
            ) : (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No PO / GRN match recorded — treat as a non-PO bill.</div>
            )}
          </HmsSection>
          <HmsSection title="Invoice">
            <HmsRow label="Vendor" value={b.vendor?.name || '—'} />
            <HmsRow label="Invoice" value={`${b.invoice_no || '—'} · ${fmtDate(b.invoice_date)}`} />
            <HmsRow label="Due date" value={fmtDate(b.due_date)} />
            <HmsRow label="Taxable · GST" value={`${inr2(b.taxable_amount)} · ${inr2(num(b.cgst) + num(b.sgst) + num(b.igst))}`} />
            <HmsRow label="Duplicate score" value={b.duplicate_score >= 80 ? <HmsBadge tone="red">{b.duplicate_score}%</HmsBadge> : `${b.duplicate_score}%`} last />
          </HmsSection>
        </>
      );
    }
    if (r.document_type === 'expense') {
      const e = expenseOf(r);
      if (!e) return null;
      const budget = num(e.budget_available_at_submit);
      return (
        <>
          <HmsSection title="Business reason" padded>
            <div style={{ fontSize: '14px', color: e.business_reason ? HMS.text : HMS.textSecondary, lineHeight: 1.6 }}>{e.business_reason || 'No reason recorded.'}</div>
          </HmsSection>
          <HmsSection title="Request">
            <HmsRow label="Department" value={humanize(e.department_id)} />
            <HmsRow label="Category" value={humanize(e.expense_type)} />
            <HmsRow label="Requested by" value={e.requested_by_staff || '—'} />
            <HmsRow label="Budget available at submit" value={<span style={{ color: budget > 0 && num(e.amount) > budget ? '#dc2626' : undefined, fontWeight: 600 }}>{inr2(budget)}</span>} last />
          </HmsSection>
        </>
      );
    }
    return null;
  };

  const renderDetail = (key: string | null) => {
    const r = all.find((x) => x.id === key);
    if (!r) return <HmsEmpty>{all.length ? 'Select an item from the list to see its details.' : 'Nothing has been submitted for review.'}</HmsEmpty>;
    const pending = isSupervisorPending(r);
    const limit = supervisorLimit(data.limits, r.document_type);
    const over = limit != null && num(r.amount) > limit;
    const crit = criticalFlags(r);
    const other = (r.risk_flags || []).filter((f) => !crit.includes(f));
    const acknowledged = ackFor === r.id;
    const steps = r.steps || [];
    const section = docSection(r);
    return (
      <>
        <HmsDetailHeader
          icon={SCOPE_ICON[r.document_type] || ClipboardCheck}
          title={summaryOf(r) || r.reference_no}
          badge={<StatusBadge status={r.status} />}
          subtitle={`${docLabel(r.document_type)} · ${r.reference_no} · by ${r.maker_name || '—'} · ${fmtDateTime(r.submitted_at)}`}
        />
        <HmsStatStrip
          items={[
            { label: 'Amount', value: inr2(r.amount) },
            { label: 'Your limit', value: limit == null ? '—' : inr2(limit), tone: over ? 'amber' : 'default', note: limit == null ? 'Not set' : over ? 'Above limit — forward' : 'Within limit' },
            { label: 'Waiting', value: ageLabel(ageHours(r.submitted_at)), tone: pending && isOverdue(r) ? 'red' : 'default', note: pending && isOverdue(r) ? 'Over 24 hours' : undefined },
            { label: 'Priority', value: humanize(r.priority), tone: r.priority === 'high' ? 'amber' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {crit.length > 0 && <HmsNotice tone="red">Critical: {crit.map(humanize).join(', ')}. Check before approving — the server asks you to confirm it.</HmsNotice>}
          {other.length > 0 && <HmsNotice tone="amber">Warnings: {other.map(humanize).join(', ')}.</HmsNotice>}
          {pending && over && <HmsNotice tone="blue">Above your {docLabel(r.document_type).toLowerCase()} limit of {inr2(limit)}. Approving verifies it and sends it to the Accounts Manager.</HmsNotice>}
          {!pending && r.status === 'pending' && <HmsNotice tone="blue">With {humanize(r.current_approver_role || r.current_level)} now.</HmsNotice>}
          {section || <HmsNotice tone="amber">The {docLabel(r.document_type).toLowerCase()} record behind this request was not returned by the server.</HmsNotice>}
          <HmsSection title={`Approval trail (${steps.length})`}>
            {steps.length ? (
              steps.map((s, idx) => (
                <HmsRow
                  key={s.step_no}
                  last={idx === steps.length - 1}
                  label={`${s.step_no}. ${humanize(s.level)} · ${s.actor_name || '—'}`}
                  hint={s.comment || undefined}
                  value={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <StatusBadge status={s.decision} />
                      <span style={{ fontSize: '12px', color: HMS.textSecondary }}>{fmtDateTime(s.decided_at)}</span>
                    </span>
                  }
                />
              ))
            ) : (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>Submitted by {r.maker_name || 'the executive'}. No decisions yet.</div>
            )}
          </HmsSection>
        </HmsDetailBody>
        {pending && (
          <HmsDetailFooter>
            {crit.length > 0 && <HmsToggle checked={acknowledged} onChange={(v) => setAckFor(v ? r.id : null)} label={`I have checked: ${crit.map(humanize).join(', ')}`} showLabel />}
            <HmsButton variant="primary" block icon={over ? Send : Check} disabled={!!busy || (crit.length > 0 && !acknowledged)} onClick={() => approve(r, over)}>
              {busy === 'approve' ? 'Saving…' : over ? 'Verify & forward to manager' : 'Approve'}
            </HmsButton>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
              <HmsButton block icon={CornerUpLeft} disabled={!!busy} onClick={() => setDraft({ id: r.id, decision: 'return', comment: '', reason: '' })}>
                Return
              </HmsButton>
              <HmsButton block icon={TriangleAlert} disabled={!!busy} onClick={() => setDraft({ id: r.id, decision: 'escalate', comment: '', reason: ESCALATION_REASONS[0][0] })}>
                Escalate
              </HmsButton>
              <HmsButton block variant="danger" icon={X} disabled={!!busy} onClick={() => setDraft({ id: r.id, decision: 'reject', comment: '', reason: '' })}>
                Reject
              </HmsButton>
            </div>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  const target = draft ? all.find((x) => x.id === draft.id) : null;

  return (
    <>
      <HmsMasterDetail
        listId={listId}
        title={title}
        description={description}
        total={all.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search reference, maker or detail"
        pills={[
          { key: 'pending', label: 'To review', count: count('pending') },
          { key: 'overdue', label: 'Over 24h', count: count('overdue'), tone: 'red' },
          { key: 'critical', label: 'Critical risk', count: count('critical'), tone: 'red' },
          { key: 'returned', label: 'Returned', count: count('returned'), tone: 'amber' },
          { key: 'decided', label: 'Approved / forwarded', count: count('decided') },
          { key: 'rejected', label: 'Rejected', count: count('rejected') },
          { key: 'all', label: 'All', count: all.length },
        ]}
        activePill={pill}
        onPill={setPill}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open"
        leftExtra={leftExtra}
        detailLabel="Approval request"
        renderDetail={renderDetail}
      />
      {draft && target && (
        <HmsModal
          title={DECISION_TEXT[draft.decision].title}
          description={`${docLabel(target.document_type)} ${target.reference_no} · ${inr2(target.amount)} · ${target.maker_name || ''}`}
          onClose={() => setDraft(null)}
          busy={busy === 'decide'}
          footer={
            <>
              <HmsButton onClick={() => setDraft(null)} disabled={busy === 'decide'}>
                Cancel
              </HmsButton>
              <HmsButton variant={draft.decision === 'reject' ? 'danger' : 'primary'} onClick={decide} disabled={busy === 'decide'}>
                {busy === 'decide' ? 'Saving…' : DECISION_TEXT[draft.decision].button}
              </HmsButton>
            </>
          }
        >
          {draft.error && <HmsNotice tone="red">{draft.error}</HmsNotice>}
          {draft.decision === 'escalate' && (
            <HmsField label="Reason" required>
              <select style={INPUT} value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })}>
                {ESCALATION_REASONS.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </HmsField>
          )}
          <HmsField label="Comment" required hint={DECISION_TEXT[draft.decision].hint}>
            <textarea style={TEXTAREA} value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value, error: undefined })} />
          </HmsField>
        </HmsModal>
      )}
    </>
  );
};
