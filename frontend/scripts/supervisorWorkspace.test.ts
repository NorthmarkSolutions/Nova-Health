import {
  ageText,
  approvalDecision,
  discountAt,
  discountWithinLimit,
  drawerTone,
  refundDecision,
  slaTone,
  ApprovalInput
} from '../src/pages/billing/supervisor/supervisorMath.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string, detail?: string) {
  if (condition) {
    console.log(`  \x1b[32m✓ [PASS]\x1b[0m ${title}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✗ [FAIL]\x1b[0m ${title}`);
    if (detail) console.error(`      \x1b[31m${detail}\x1b[0m`);
    failed++;
  }
}

const req = (o: Partial<ApprovalInput>): ApprovalInput => ({
  request_type: 'DISCOUNT', requested_percent: 15, bill_gross: 1000, requested_amount: 0,
  self_raised: false, can_decide: true, status: 'PENDING', ...o
});

console.log('\n=== Phase 5 · Billing Supervisor UI logic ===\n');

console.log('SLA timer');
assert(ageText(6) === '6 min' && ageText(94) === '1h 34m', 'age text: minutes, then hours + minutes');
assert(slaTone(16, true) === 'red', 'past 15 min → red SLA badge (plan test)');
assert(slaTone(12, true) === 'amber' && slaTone(5, true) === 'muted', 'last third of the SLA → amber, earlier → grey');
assert(slaTone(90, false) === 'muted', 'decided requests are never flagged');
assert(slaTone(31, true, 30) === 'red' && slaTone(25, true, 30) === 'amber', 'refunds use their own 30-minute SLA');

console.log('\nSupervisor discount limit (20% or ₹10,000 per bill)');
assert(discountWithinLimit(20, 10000) && !discountWithinLimit(21, 100) && !discountWithinLimit(15, 15000), 'both percent and amount must be within the limit');
const lowered = discountAt(8400, 15);
assert(lowered.discount === 1260 && lowered.net === 7140, '15% of ₹8,400 = ₹1,260 off, ₹7,140 net', JSON.stringify(lowered));

console.log('\nApproval decision states');
const within = approvalDecision(req({}), { tier: 'SUPERVISOR' });
assert(!within.approveDisabled && within.policyTone === 'green', '15% on ₹1,000 is approvable by a supervisor');
assert(within.rejectDisabled, 'reject needs a note first');
assert(!approvalDecision(req({}), { tier: 'SUPERVISOR', note: 'Not eligible' }).rejectDisabled, 'a 5+ character note enables reject');
const above = approvalDecision(req({ requested_percent: 25, bill_gross: 8400 }), { tier: 'SUPERVISOR' });
assert(above.approveDisabled && above.policyTone === 'amber' && !above.escalateDisabled, '25% is above the limit: escalate or lower');
assert(!approvalDecision(req({ requested_percent: 25, bill_gross: 8400 }), { tier: 'SUPERVISOR', modPercent: 15 }).approveDisabled, 'lowering to 15% brings it within the limit');
const over = approvalDecision(req({ requested_percent: 15 }), { tier: 'SUPERVISOR', modPercent: 18 });
assert(over.approveDisabled && over.overRequested, 'cannot approve more than requested');
assert(approvalDecision(req({}), { tier: 'SUPERVISOR', modPercent: 0 }).approveDisabled, 'zero percent cannot be approved');
assert(!approvalDecision(req({ requested_percent: 40, bill_gross: 100000 }), { tier: 'ADMIN' }).approveDisabled, 'Billing Admin has no supervisor limit');

console.log('\nSelf-approval prevention (plan test)');
const self = approvalDecision(req({ self_raised: true, can_decide: false, status: 'ESCALATED' }), { tier: 'SUPERVISOR', note: 'Approving my own' });
assert(self.approveDisabled && self.rejectDisabled && self.escalateDisabled && self.policyTone === 'red', 'a supervisor-raised request cannot be decided by a supervisor');
assert(self.hint.includes('Billing Admin'), 'hint routes it to Billing Admin', self.hint);
const voidReq = approvalDecision(req({ request_type: 'INVOICE_VOID', requested_amount: 1240 }), { tier: 'SUPERVISOR' });
assert(!voidReq.approveDisabled && voidReq.withinLimit, 'voids of unpaid invoices are within supervisor authority');

console.log('\nRefund decisions');
const verified = refundDecision({ amount: 550, verified: true, can_decide: true, original_tender: 'CASH' }, { tier: 'SUPERVISOR' });
assert(!verified.approveDisabled && verified.outcome.includes('drawer'), 'verified cash refund → approve, cashier pays from drawer');
const failedCheck = refundDecision({ amount: 650, verified: false, can_decide: true, original_tender: 'CARD' }, { tier: 'SUPERVISOR' });
assert(failedCheck.approveDisabled && failedCheck.hint.includes('already delivered'), 'failed verification blocks approval');
assert(refundDecision({ amount: 700, verified: true, can_decide: true, original_tender: 'UPI' }, { tier: 'SUPERVISOR' }).outcome.includes('credit note'), 'UPI refund reverses now with a credit note');
const big = refundDecision({ amount: 12000, verified: true, can_decide: true, original_tender: 'CARD' }, { tier: 'SUPERVISOR' });
assert(big.approveDisabled && !big.withinLimit, 'refunds above ₹10,000 escalate past a supervisor');
assert(!refundDecision({ amount: 12000, verified: true, can_decide: true, original_tender: 'CARD' }, { tier: 'ADMIN' }).approveDisabled, 'Billing Admin can approve large refunds');

console.log('\nDrawer bar');
assert(drawerTone(50) === 'blue' && drawerTone(80) === 'amber' && drawerTone(117) === 'red', 'blue → amber at 80% pickup threshold → red over the limit');

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
