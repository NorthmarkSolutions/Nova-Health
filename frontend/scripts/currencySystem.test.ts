import { formatCurrency, DEFAULT_CURRENCY, CURRENCIES } from '../src/config/currency';
import * as fs from 'fs';
import * as path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

console.log('🧪 RUNNING CURRENCY SYSTEM TESTS...\n');

// 1. DEFAULT CURRENCY
assert(DEFAULT_CURRENCY === 'INR', 'Default hospital currency must be INR');
assert(CURRENCIES.INR.symbol === 'Rs.', 'INR symbol must be Rs.');
assert(CURRENCIES.USD.symbol === '$', 'USD symbol must be $');

// 2. INR FORMATTING (en-IN digit grouping, no .00 for whole numbers)
assert(formatCurrency(100, 'INR') === 'Rs. 100', 'Whole number INR 100 formats as "Rs. 100"');
assert(formatCurrency(125500, 'INR') === 'Rs. 1,25,500', 'Large number INR 125500 formats with Indian grouping "Rs. 1,25,500"');
assert(formatCurrency(11.5, 'INR') === 'Rs. 11.50', 'Decimal INR 11.5 formats as "Rs. 11.50"');
assert(formatCurrency(0, 'INR') === 'Rs. 0', 'Zero INR formats as "Rs. 0"');
assert(formatCurrency(241.5, 'INR') === 'Rs. 241.50', 'Decimal INR 241.5 formats as "Rs. 241.50"');

// 3. USD FORMATTING (en-US digit grouping, always 2 decimals)
assert(formatCurrency(100, 'USD') === '$100.00', 'Whole number USD 100 formats as "$100.00"');
assert(formatCurrency(125500, 'USD') === '$125,500.00', 'Large number USD 125500 formats as "$125,500.00"');
assert(formatCurrency(11.5, 'USD') === '$11.50', 'Decimal USD 11.5 formats as "$11.50"');
assert(formatCurrency(0, 'USD') === '$0.00', 'Zero USD formats as "$0.00"');

// 4. NO MATHEMATICAL EXCHANGE RATE CONVERSION
// The task strictly specifies display-only formatting. 100 units is 100 units regardless of selected currency.
const testAmount = 500;
const inrFormatted = formatCurrency(testAmount, 'INR');
const usdFormatted = formatCurrency(testAmount, 'USD');
assert(inrFormatted.includes('500'), 'INR representation must preserve original numeric magnitude (500)');
assert(usdFormatted.includes('500'), 'USD representation must preserve original numeric magnitude (500)');

// 5. HIDE SYMBOL OPTION
assert(formatCurrency(100, 'INR', { hideSymbol: true }) === '100', 'hideSymbol removes Rs. prefix');
assert(formatCurrency(100, 'USD', { hideSymbol: true }) === '100.00', 'hideSymbol removes $ prefix');

// 6. VERIFY CRITICAL WORKSPACE FILES USE useCurrency / formatMoney / symbol
const criticalFiles = [
  'src/pages/reception/ReceptionDashboard.tsx',
  'src/pages/reception/components/CounterBillingModal.tsx',
  'src/pages/reception/components/DailyClosingReportModal.tsx',
  'src/pages/billing/BillingDashboard.tsx',
  'src/pages/doctor/DoctorDashboard.tsx',
  'src/pages/ipd/IpdDashboard.tsx',
  'src/pages/ot/OtDashboard.tsx',
  'src/pages/lab/LabDashboard.tsx',
  'src/pages/department/DepartmentSettings.tsx',
  'src/pages/department/DepartmentReports.tsx',
  'src/pages/admin/AdminDashboard.tsx',
  'src/pages/admin/setup/FinancialSetup.tsx',
  'src/pages/admin/setup/ClinicalSetup.tsx',
  'src/pages/admin/setup/StaffSetup.tsx',
  'src/pages/admin/setup/organization/BedsSection.tsx',
  'src/pages/admin/setup/organization/BranchesSection.tsx',
  'src/pages/admin/setup/organization/CampusInfrastructureSection.tsx',
  'src/pages/admin/setup/organization/DepartmentProfileView.tsx',
  'src/pages/admin/setup/organization/DocumentPreviewModal.tsx',
  'src/pages/admin/setup/organization/ProfileSection.tsx',
  'src/pages/admin/setup/organization/StaffProfileDrawer.tsx',
];

const frontendDir = process.cwd();
for (const relPath of criticalFiles) {
  const fullPath = path.join(frontendDir, relPath);
  assert(fs.existsSync(fullPath), `File exists: ${relPath}`);
  const content = fs.readFileSync(fullPath, 'utf8');
  assert(
    content.includes('useCurrency') || content.includes('formatCurrency') || content.includes('Money'),
    `${relPath} imports and utilizes currency context/helper`
  );
}

console.log('\n🎉 ALL CURRENCY SYSTEM TESTS PASSED SUCCESSFULLY!\n');
