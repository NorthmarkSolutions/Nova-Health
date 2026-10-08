import {
  allocateTenders,
  buildSplitPayments,
  calculateChange,
  computeBillPreview,
  evaluateDiscount,
  filterQueueRows,
  denominationTotal,
  denominationPayload,
  reconcileDrawer,
  drawerUtilization,
  isCounterAdded,
  tariffLine,
  tenderBlocker,
  TenderLine
} from '../src/pages/billing/executive/cashierMath.ts';
import type { CashierQueueRow } from '../src/services/billingService.ts';

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

const row = (o: Partial<CashierQueueRow>): CashierQueueRow => ({
  patient_id: 'p', patient_name: '', uhid: '', mobile: '', age_sex: '', payer_type: 'SELF', payer_label: 'Self Pay',
  sources: ['OPD'], is_stat: false, token: '', charge_ids: [], items_count: 1, amount: 0, wait_minutes: 0, summary: '', status: 'AWAITING_BILL',
  ...o
});

console.log('\n=== Phase 3 · Billing Executive cashier UI logic ===\n');

console.log('Search-as-you-type (UHID / name / mobile / token)');
const rows = [
  row({ patient_id: '1', patient_name: 'Anita Sharma', uhid: 'NH-100231', mobile: '9876500011', token: 'OPD-014', sources: ['OPD'] }),
  row({ patient_id: '2', patient_name: 'Rahul Mehta', uhid: 'NH-100456', mobile: '9822000099', token: 'LAB-ORD-7', sources: ['LAB'], is_stat: true }),
  row({ patient_id: '3', patient_name: 'Gopal Krishnan', uhid: 'NH-207731', mobile: '9000011122', token: 'Q-003', sources: ['PHARMACY', 'LAB'] })
];
assert(filterQueueRows(rows, 'NH-1').length === 2, 'partial UHID prefix narrows progressively', 'expected 2 rows for "NH-1"');
assert(filterQueueRows(rows, 'NH-1004').map((r) => r.patient_id).join() === '2', 'longer UHID prefix narrows to one patient');
assert(filterQueueRows(rows, 'anita').length === 1, 'case-insensitive name match');
assert(filterQueueRows(rows, '98220').length === 1, 'mobile number match');
assert(filterQueueRows(rows, 'opd-014').length === 1, 'token match');
assert(filterQueueRows(rows, '', 'LAB').length === 2, 'department pill includes multi-source patients');
assert(filterQueueRows(rows, '  ').length === 3, 'blank query returns full queue');

console.log('\nBill preview mirrors backend consolidation maths');
const charges = [
  { unit_price: 500, quantity: 1, discount_amount: 0, tax_amount: 0 },
  { unit_price: 350, quantity: 2, discount_amount: 0, tax_amount: 63 }
];
const noDisc = computeBillPreview(charges);
assert(noDisc.gross === 1200 && noDisc.tax === 63 && noDisc.net === 1263, 'gross 1200 + GST 63 = net 1263', JSON.stringify(noDisc));
const fivePct = computeBillPreview(charges, 5);
assert(fivePct.discount === 60 && fivePct.net === 1203, '5% scheme → discount 60, net 1203', JSON.stringify(fivePct));
const lineDisc = computeBillPreview([{ unit_price: 1000, quantity: 1, discount_amount: 80, tax_amount: 0 }], 5);
assert(lineDisc.discount === 80, 'line-level discount wins when larger than requested (max rule)');

console.log('\nTender allocation arithmetic (Cash + Card + UPI + Deposit = Total)');
const split = allocateTenders(1263, [
  { mode: 'CASH', amount: '500' },
  { mode: 'CARD', amount: '400.50' },
  { mode: 'UPI', amount: '262.50' },
  { mode: 'DEPOSIT_DEDUCTION', amount: '100' }
]);
assert(split.isBalanced && split.remaining === 0, 'four tenders balance exactly to total', JSON.stringify(split));
const under = allocateTenders(1263, [{ mode: 'CASH', amount: '1000' }]);
assert(!under.isBalanced && !under.isOver && under.remaining === 263, 'under-allocation reports remaining 263');
const over = allocateTenders(1263, [{ mode: 'CASH', amount: '1000' }, { mode: 'UPI', amount: '300' }]);
assert(over.isOver && over.remaining === -37, 'over-allocation detected (−37)');
const floaty = allocateTenders(0.3, [{ mode: 'CASH', amount: '0.1' }, { mode: 'UPI', amount: '0.2' }]);
assert(floaty.isBalanced, 'floating-point 0.1 + 0.2 = 0.3 treated as balanced');
assert(Math.round(split.segments.reduce((t, s) => t + s.percent, 0)) === 100, 'allocation bar segments sum to 100%');

console.log('\nCash change assistant');
const change = calculateChange(1263, 2000);
assert(change.sufficient && change.change === 737, 'change due 737 on ₹2000 tendered');
const notes = change.denominations.map((d) => `${d.denomination}x${d.count}`).join(',');
assert(notes === '500x1,200x1,20x1,10x1,5x1,2x1', 'denomination breakdown 500+200+20+10+5+2', notes);
const short = calculateChange(1263, 1200);
assert(!short.sufficient && short.shortfall === 63 && short.denominations.length === 0, 'shortfall 63 when cash is insufficient');
const exact = calculateChange(500, 500);
assert(exact.sufficient && exact.change === 0 && exact.denominations.length === 0, 'exact cash → zero change');

console.log('\nTender reference validation');
const line = (o: Partial<TenderLine>): TenderLine => ({ id: 'x', mode: 'CASH', amount: '100', ...o });
assert(tenderBlocker(line({ mode: 'UPI', reference: '12345' })) !== '', 'UPI requires a 12-digit UTR');
assert(tenderBlocker(line({ mode: 'UPI', reference: '123456789012' })) === '', 'valid UPI UTR accepted');
assert(tenderBlocker(line({ mode: 'CARD', reference: 'EDC-01', authCode: '12345' })) !== '', 'card requires 6-digit auth code');
assert(tenderBlocker(line({ mode: 'CARD', reference: 'EDC-01', authCode: '123456' })) === '', 'valid card capture accepted');
const payload = buildSplitPayments([line({ mode: 'CARD', amount: '400.5', reference: 'EDC-01', authCode: '123456' }), line({ mode: 'CASH', amount: '0' })]);
assert(payload.length === 1 && payload[0].auth_code === '123456' && payload[0].amount === 400.5, 'zero-amount tenders dropped from split payload');

console.log('\nDiscretionary discount guard (5% cashier ceiling)');
assert(evaluateDiscount(1200, 5).allowed, '5% allowed for cashier');
const ten = evaluateDiscount(1200, 10);
assert(!ten.allowed && ten.requiresApproval, '10% blocked → supervisor approval required');
assert(evaluateDiscount(1200, 10, { isSupervisor: true }).allowed, 'supervisor may apply 10% directly');
assert(evaluateDiscount(1200, 10, { approvedPercent: 15 }).allowed, 'approved request at 15% covers 10%');
assert(!evaluateDiscount(1200, 20, { approvedPercent: 15 }).allowed, 'approved 15% does not cover 20%');
assert(evaluateDiscount(100000, 15).escalatesToAdmin, '15% on ₹1,00,000 (> ₹10,000) escalates to Billing Admin');

console.log('\nTariff Master lines (add service / walk-in)');
const xray = tariffLine(600, 5, 2);
assert(xray.unit_price === 600 && xray.tax_amount === 60 && xray.total_amount === 1260, 'X-Ray ₹600 × 2 + 5% GST = 1260 (matches backend add-service test)', JSON.stringify(xray));
assert(tariffLine('250.00', '0.00', 0).quantity === 1, 'quantity floors at 1');
const walkin = computeBillPreview([tariffLine(250, 0, 1), tariffLine(400, 0, 1)], 5);
assert(walkin.net === 617.5, 'walk-in cert ₹250 + CBC ₹400 with 5% scheme = 617.50 (matches backend walk-in test)', JSON.stringify(walkin));
const gstOdd = tariffLine(333.33, 18, 3);
assert(gstOdd.tax_amount === 180 && gstOdd.total_amount === 1179.99, 'GST rounds half-up to paise like Decimal.quantize', JSON.stringify(gstOdd));

console.log('\nCounter-added line detection');
assert(isCounterAdded('COUNTER-20261006101500-ritu'), 'COUNTER- prefix is removable at counter');
assert(!isCounterAdded('LAB-ORD-7') && !isCounterAdded(null), 'clinical / empty references are not removable');

console.log('\nDraft rows in the live queue');
const withDraft = [...rows, row({ patient_id: '1', patient_name: 'Anita Sharma', uhid: 'NH-100231', token: 'DRF-202610-00001', status: 'DRAFT', draft_id: 'd1', sources: ['OPD'] })];
assert(filterQueueRows(withDraft, 'DRF-2026').length === 1, 'drafts are searchable by draft number');
assert(filterQueueRows(withDraft, 'anita').length === 2, 'patient with queued charges and a draft shows both rows');

console.log('\nPhase 4 drawer counting & reconciliation');
assert(denominationTotal({ 500: '10', 200: '5' }) === 6000, 'denomination math: ₹500 × 10 + ₹200 × 5 = ₹6,000 (plan test)');
assert(denominationTotal({ 2000: '1', 10: '3', coins: '7.50' }) === 2037.5, 'coins entered as an amount are added');
assert(denominationTotal({ 500: '-2', 100: 'abc' }) === 0, 'negative / non-numeric counts are ignored');
const notesPayload = denominationPayload({ 500: '10' });
assert(notesPayload['500'] === 10 && notesPayload['2000'] === 0 && notesPayload.coins === 0 && Object.keys(notesPayload).length === 8, 'payload carries every note plus coins');
const green = reconcileDrawer({ cash: 4200, card: 1000, upi: 400 }, { cash: 4200, card: 1000, upi: 400 });
assert(green.status === 'GREEN_MATCH' && green.net === 0, 'zero variance is tagged GREEN_MATCH (plan test)');
const red = reconcileDrawer({ cash: 4200, card: 1000, upi: 400 }, { cash: 4100, card: 900, upi: 400 });
assert(red.status === 'RED_VARIANCE' && red.net === -200 && red.rows[0].variance === -100 && red.rows[1].variance === -100,
  'discrepancy is tagged RED_VARIANCE with per-tender variance (plan test)', JSON.stringify(red));
assert(reconcileDrawer({ cash: 0.3, card: 0, upi: 0 }, { cash: 0.1 + 0.2, card: 0, upi: 0 }).matched, 'floating-point paise do not create false variances');
assert(drawerUtilization(45000) === 90 && drawerUtilization(50000) === 100, 'drawer utilisation against the ₹50,000 limit');

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
