import { barWidths, bucketFor, formatCell, journalBalanced, rangeFor, shortMoney, splitGst } from '../src/pages/billing/finance/financeMath.ts';

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

const fmt = (n: number) => `₹${n.toFixed(2)}`;
const today = new Date(2026, 9, 7); // 07 Oct 2026

console.log('\n=== Phase 11 · Reports, period close & audit ===\n');

console.log('Report periods');
assert(JSON.stringify(rangeFor('TODAY', today)) === JSON.stringify({ date_from: '2026-10-07', date_to: '2026-10-07' }), 'today');
assert(rangeFor('MTD', today).date_from === '2026-10-01', 'month to date starts on the 1st');
const lm = rangeFor('LAST_MONTH', today);
assert(lm.date_from === '2026-09-01' && lm.date_to === '2026-09-30', 'last month is the full calendar month', JSON.stringify(lm));
assert(rangeFor('FYTD', today).date_from === '2026-04-01', 'financial year starts in April');
assert(rangeFor('FYTD', new Date(2027, 1, 10)).date_from === '2026-04-01', 'February still belongs to the FY that began last April');
assert(rangeFor('LAST_MONTH', new Date(2026, 0, 15)).date_from === '2025-12-01', 'January → last month is December of the prior year');

console.log('\nAR aging buckets (plan test: 45 days → 31-60)');
assert(bucketFor(45) === '31-60', '45 days falls in 31-60');
assert([0, 30, 31, 60, 61, 90, 91].map(bucketFor).join() === '0-30,0-30,31-60,31-60,61-90,61-90,90+', 'bucket edges are inclusive at 30/60/90');

console.log('\nGST split');
const g = splitGst(120);
assert(g.cgst === 60 && g.sgst === 60 && g.igst === 0, 'intra-state: CGST = SGST = half');
const odd = splitGst(5.21);
assert(odd.cgst === 2.61 && odd.sgst === 2.6 && Math.round((odd.cgst + odd.sgst) * 100) === 521, 'odd paise: halves always sum to the exact tax', JSON.stringify(odd));

console.log('\nSettlement journal');
const j = journalBalanced([{ debit: 2000, credit: 0 }, { debit: 0, credit: 1800 }, { debit: 0, credit: 200 }]);
assert(j.balanced && j.debit === 2000, 'debits equal credits');
assert(!journalBalanced([{ debit: 100, credit: 0 }, { debit: 0, credit: 99.99 }]).balanced, 'a one-paisa gap is reported as unbalanced');
assert(journalBalanced([{ debit: 0.1, credit: 0 }, { debit: 0.2, credit: 0 }, { debit: 0, credit: 0.3 }]).balanced, 'floating-point paise do not break the balance');

console.log('\nCells & bars');
assert(formatCell(1250, 'money', fmt) === '₹1250.00' && formatCell(12.5, 'percent', fmt) === '12.5%', 'money and percent cells');
assert(formatCell(null, 'money', fmt) === '—' && formatCell(['LAB', 'OPD'], 'text', fmt) === 'LAB, OPD', 'empty cells and lists');
assert(barWidths([50, 100, 0]).join() === '50,100,0' && barWidths([0, 0]).join() === '0,0', 'bars scale to the largest value; all-zero stays empty');
assert(shortMoney(45100000) === '₹4.51Cr' && shortMoney(980000) === '₹9.80L' && shortMoney(4500) === '₹4,500', 'crore / lakh short money');

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
