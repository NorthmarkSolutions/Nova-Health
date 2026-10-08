import { SUPERVISOR_LIMIT_AMOUNT, SUPERVISOR_LIMIT_PERCENT, round2 } from '../executive/cashierMath';

// Phase 5 governance constants — mirror SupervisorGovernanceService on the backend.
export const APPROVAL_SLA_MINUTES = 15;
export const AUTO_ESCALATE_MINUTES = 60;
export const REFUND_SLA_MINUTES = 30;
export const REFUND_LIMIT_AMOUNT = 10000;
export const MIN_NOTE_LENGTH = 5;
export const ESCALATION_TIER = 'Billing Admin';

export type ReviewerTier = 'ADMIN' | 'SUPERVISOR' | null;

export const ageText = (minutes: number) =>
  minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${Math.max(0, Math.floor(minutes))} min`;

/** Age colour on queue rows: red past SLA, amber in the last third, grey otherwise (or once decided). */
export function slaTone(ageMinutes: number, open: boolean, slaMinutes = APPROVAL_SLA_MINUTES): 'red' | 'amber' | 'muted' {
  if (!open) return 'muted';
  if (ageMinutes > slaMinutes) return 'red';
  if (ageMinutes > (slaMinutes * 2) / 3) return 'amber';
  return 'muted';
}

export const discountWithinLimit = (percent: number, amount: number) =>
  percent <= SUPERVISOR_LIMIT_PERCENT && amount <= SUPERVISOR_LIMIT_AMOUNT;

export function discountAt(gross: number, percent: number) {
  const discount = round2((gross * percent) / 100);
  return { discount, net: round2(gross - discount) };
}

export interface ApprovalInput {
  request_type: string;
  requested_percent: number;
  bill_gross: number;
  requested_amount: number;
  self_raised: boolean;
  can_decide: boolean;
  status: string;
}

export interface ApprovalDecisionState {
  approveDisabled: boolean;
  rejectDisabled: boolean;
  escalateDisabled: boolean;
  withinLimit: boolean;
  overRequested: boolean;
  policyTone: 'green' | 'amber' | 'red';
  hint: string;
}

/**
 * What the reviewer may do with a request right now. Discounts can be lowered (never raised) before approval;
 * anything above the supervisor limit must be lowered or escalated; self-raised requests are never decidable.
 */
export function approvalDecision(
  req: ApprovalInput,
  opts: { tier: ReviewerTier; modPercent?: number; note?: string }
): ApprovalDecisionState {
  const isDisc = req.request_type === 'DISCOUNT';
  const pct = isDisc ? (opts.modPercent ?? req.requested_percent) : 0;
  const amount = isDisc ? round2((req.bill_gross * pct) / 100) : req.requested_amount;
  const overRequested = isDisc && pct > req.requested_percent;
  const withinLimit = opts.tier === 'ADMIN' || !isDisc || discountWithinLimit(pct, amount);
  const noteOk = (opts.note || '').trim().length >= MIN_NOTE_LENGTH;
  const blocked = req.self_raised && opts.tier !== 'ADMIN';
  const canAct = req.can_decide && !blocked;

  const approveDisabled = !canAct || !withinLimit || (isDisc && (pct <= 0 || overRequested));
  const rejectDisabled = !canAct || !noteOk;
  const escalateDisabled = !canAct || req.status === 'ESCALATED';

  let hint = '';
  if (blocked) hint = `You raised this request. Self-approval is blocked; it routes to ${ESCALATION_TIER}.`;
  else if (!req.can_decide) hint = req.status === 'ESCALATED' ? `With ${ESCALATION_TIER}.` : 'Decided.';
  else if (overRequested) hint = `Cannot exceed the requested ${req.requested_percent}%.`;
  else if (!withinLimit) hint = `Escalate, or lower within your limit (${SUPERVISOR_LIMIT_PERCENT}% or ₹${SUPERVISOR_LIMIT_AMOUNT.toLocaleString('en-IN')}).`;
  else if (!noteOk) hint = 'A note is required to reject.';

  return {
    approveDisabled,
    rejectDisabled,
    escalateDisabled,
    withinLimit,
    overRequested,
    policyTone: blocked ? 'red' : withinLimit ? 'green' : 'amber',
    hint
  };
}

export interface RefundInput {
  amount: number;
  verified: boolean | null;
  can_decide: boolean;
  original_tender: string;
}

export function refundDecision(r: RefundInput, opts: { tier: ReviewerTier; note?: string }) {
  const noteOk = (opts.note || '').trim().length >= MIN_NOTE_LENGTH;
  const withinLimit = opts.tier === 'ADMIN' || r.amount <= REFUND_LIMIT_AMOUNT;
  const verified = r.verified !== false;
  const cash = r.original_tender === 'CASH';
  let hint = '';
  if (!r.can_decide) hint = 'Decided.';
  else if (!verified) hint = 'Service already delivered — reject, or ask the department to cancel first.';
  else if (!withinLimit) hint = `Above your refund limit of ₹${REFUND_LIMIT_AMOUNT.toLocaleString('en-IN')} — escalate to ${ESCALATION_TIER}.`;
  else if (!noteOk) hint = 'A note is required to reject.';
  return {
    approveDisabled: !r.can_decide || !verified || !withinLimit,
    rejectDisabled: !r.can_decide || !noteOk,
    withinLimit,
    outcome: cash ? 'Cashier pays from the drawer against a signed voucher' : `${r.original_tender} reversal now · credit note issued`,
    hint
  };
}

/** Drawer bar colour against the ₹50,000 limit: red over 100%, amber from the pickup threshold. */
export const drawerTone = (utilization: number, threshold = 80): 'red' | 'amber' | 'blue' =>
  utilization > 100 ? 'red' : utilization >= threshold ? 'amber' : 'blue';
