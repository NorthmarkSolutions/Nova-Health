import {
  changePercent,
  changeTone,
  csvHeaderError,
  diffText,
  emergencyMarkup,
  lineTotal,
  needsCfo,
  packageBlocker,
  simulateCoverage,
  tariffDecision,
  windowActive
} from '../src/pages/billing/admin/pricingMath.ts';

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

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const at = (h: number, m = 0, day = 6) => new Date(2026, 9, day, h, m); // 6 Oct 2026 Tue, 10 Oct Sat

console.log('\n=== Phase 6 · Tariffs, packages & pricing governance ===\n');

console.log('Tariff change review');
assert(changePercent(7500, 7900) === 5.3 && changePercent(0, 8500) === null, 'change % from current price; null for a new service');
assert(diffText(350, 380, fmt) === '+₹30 · +8.6%', 'difference text', diffText(350, 380, fmt));
assert(diffText(0, 8500, fmt) === 'New service', 'new service label');
assert(needsCfo(10400, 12500) && !needsCfo(32000, 36500), 'ICU bed +20.2% needs CFO; OT +14.1% does not');
assert(changeTone(600, 800) === 'red' && changeTone(350, 380) === 'amber' && changeTone(900, 850) === 'green' && changeTone(0, 1) === 'new', 'difference column tones');
const big = tariffDecision({ current_price: 600, proposed_price: 800, can_decide: true }, {});
assert(big.approveDisabled && big.cfoRequired, '33% change cannot be approved without CFO confirmation');
assert(tariffDecision({ current_price: 600, proposed_price: 800, can_decide: true }, { cfoConfirmed: true }).approveDisabled, 'CFO tick alone is not enough: the note must record it');
assert(!tariffDecision({ current_price: 600, proposed_price: 800, can_decide: true }, { cfoConfirmed: true, note: 'CFO email 05 Oct' }).approveDisabled, 'CFO tick + note unlocks approval');
const small = tariffDecision({ current_price: 350, proposed_price: 380, can_decide: true }, {});
assert(!small.approveDisabled && small.rejectDisabled && small.revisionDisabled, 'small change approvable; reject/revision need a note');
assert(tariffDecision({ current_price: 350, proposed_price: 380, can_decide: false }, { note: 'looks fine' }).approveDisabled, 'proposer cannot publish their own change');

console.log('\nEmergency markup schedules (plan test: night surcharge)');
assert(windowActive('22:00', '06:00', at(23, 30)) && windowActive('22:00', '06:00', at(5, 59)), 'overnight window covers 23:30 and 05:59');
assert(!windowActive('22:00', '06:00', at(6, 0)) && !windowActive('22:00', '06:00', at(14, 0)), 'window ends at 06:00 and excludes the day');
assert(windowActive('08:00', '09:00', at(14, 0, 10), true) && !windowActive('08:00', '09:00', at(14, 0, 6), true), 'weekend flag applies all day on Saturday only');
const schedules = [
  { label: 'Night surcharge', department: 'ALL', markup_percentage: 50, applies_from_time: '22:00', applies_to_time: '06:00', is_weekend_active: false, is_active: true },
  { label: 'ER weekend', department: 'EMERGENCY', markup_percentage: 25, applies_from_time: '08:00', applies_to_time: '09:00', is_weekend_active: true, is_active: true }
];
assert(emergencyMarkup(schedules, 'EMERGENCY', at(23, 30), 10).percent === 50, 'night schedule beats the flat 10% markup');
assert(emergencyMarkup(schedules, 'EMERGENCY', at(14, 0), 10).percent === 10, 'by day the flat tariff markup applies');
assert(emergencyMarkup(schedules, 'EMERGENCY', at(14, 0, 10), 10).percent === 25, 'Saturday afternoon → weekend schedule');
assert(lineTotal(1000, 1, 0, 50) === 1500, 'ER consult ₹1,000 at night = ₹1,500 (matches backend test)');

console.log('\nPackage coverage (plan test: CBC under Knee Replacement)');
const knee = [
  { inclusion_type: 'INCLUDED' as const, service_code: 'LAB-CBC', max_quantity_covered: 2 },
  { inclusion_type: 'EXCLUDED' as const, service_code: 'RAD-XR-KNEE', max_quantity_covered: 1 }
];
const sim = simulateCoverage(knee, [{ code: 'LAB-CBC', qty: 3 }, { code: 'LAB-LFT', qty: 1 }, { code: 'RAD-XR-KNEE', qty: 1 }]);
assert(sim[0].covered === 2 && sim[0].billed === 1, 'CBC × 3 → 2 absorbed at ₹0, 1 billed at tariff', JSON.stringify(sim[0]));
assert(sim[1].covered === 0 && sim[1].billed === 1 && !sim[1].excluded, 'LFT not included → standard tariff');
assert(sim[2].excluded && sim[2].billed === 1, 'X-Ray excluded → billed separately');
const twice = simulateCoverage(knee, [{ code: 'LAB-CBC', qty: 1 }, { code: 'lab-cbc', qty: 2 }]);
assert(twice[1].covered === 1 && twice[1].billed === 1, 'allowance is shared across orders of the same service');
assert(packageBlocker({ package_price: 0, inclusions: [1], status: 'DRAFT' }) !== '' && packageBlocker({ package_price: 185000, inclusions: [], status: 'DRAFT' }) !== '', 'publishing needs a price and at least one inclusion');
assert(packageBlocker({ package_price: 185000, inclusions: [1], status: 'DRAFT' }) === '' && packageBlocker({ package_price: 1, inclusions: [1], status: 'RETIRED' }) !== '', 'draft ready; retired never republishes');

console.log('\nCSV import');
assert(csvHeaderError('code,name,base_price\nA,B,1') === '', 'header with code + base_price accepted');
assert(csvHeaderError('﻿code,base_price') === '', 'UTF-8 BOM from Excel is tolerated');
assert(csvHeaderError('name,price\nA,1') !== '' && csvHeaderError('') !== '', 'missing columns / empty input rejected');

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
