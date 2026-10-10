import React, { useEffect, useMemo, useState } from 'react';
import { AccountsStickyAppBar, RoleViewKey } from '../components/AccountsStickyAppBar';
import { AccountsSidebarUserFooter } from '../components/AccountsSidebarUserFooter';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarRange,
  CalendarClock,
  Lock,
  Send,
  Landmark,
  FileSpreadsheet,
  Receipt,
  ClipboardCheck,
  ShieldCheck,
  ShieldAlert,
  TriangleAlert,
  BookOpen,
  ScrollText,
  AlertTriangle,
  FileText,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Hourglass,
  Scale,
  Snowflake,
  ShieldX,
  FileCheck,
  FolderOpen,
  FileX,
  FilePen,
  TrendingDown,
  Flag,
  RotateCcw,
  CircleCheck,
  OctagonAlert,
  UserX,
  ArrowUpRight,
  Gauge,
  ListChecks,
  Percent,
  BadgeCheck,
  SearchCheck,
  Banknote,
  Siren,
  Fingerprint
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  accountsService,
  ControllerDashboardData,
  MonthEndCloseData,
  QuarterEndCloseData,
  QuarterEndItem,
  YearEndCloseData,
  YearEndItem,
  ControllerPeriodItem,
  PaymentBatchItem,
  BankAccountControlItem,
  FinancialStatementData,
  TaxReturnItem,
  AuditRequestItem,
  ControlViolationItem,
  HighRiskReviewItem,
  PolicyMasterItem,
  TrailEntry,
  Tone
} from '../../../services/accountsService';

// Formatters
const fmt = (n: number | string) => '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const cr = (n: number | string) => {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  const sg = v < 0 ? '− ' : '';
  return a >= 1e7 ? `${sg}₹ ${(a / 1e7).toFixed(2)} Cr` : a >= 1e5 ? `${sg}₹ ${(a / 1e5).toFixed(1)} L` : sg + fmt(a);
};
const f2 = (n: number) => (n < 0 ? `(${Math.abs(n).toFixed(2)})` : n.toFixed(2));
const hm = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};
const NOW = () => '07 Oct, ' + hm();
const LIM = 5000000; // ₹ 50 L Controller limit

const G = '#F3F4F6';
const GF = '#374151';
const CH: Record<string, [string, string]> = {
  Open: ['#FEF2F2', '#B91C1C'],
  Investigating: ['#FFFBEB', '#B45309'],
  Closed: ['#F0FDF4', '#15803D'],
  'Risk Accepted': [G, GF],
  'With CFO': ['#F0F9FF', '#0369A1'],
  Escalated: ['#F0F9FF', '#0369A1'],
  Remediating: ['#FFFBEB', '#B45309'],
  'Awaiting Release': ['#EFF6FF', '#1D4ED8'],
  Released: ['#F0FDF4', '#15803D'],
  'Awaiting CFO Co-sign': ['#F0F9FF', '#0369A1'],
  'On Hold': ['#FFFBEB', '#B45309'],
  Returned: ['#FFFBEB', '#B45309'],
  Rejected: ['#FEF2F2', '#B91C1C'],
  Approved: ['#F0FDF4', '#15803D'],
  'Awaiting Controller': ['#EFF6FF', '#1D4ED8'],
  Unreconciled: ['#FEF2F2', '#B91C1C'],
  'Under Review': ['#FFFBEB', '#B45309'],
  Reconciled: ['#EFF6FF', '#1D4ED8'],
  Frozen: ['#FEF2F2', '#B91C1C'],
  Exceptions: ['#FEF2F2', '#B91C1C'],
  Ready: ['#EFF6FF', '#1D4ED8'],
  'Approved For Filing': ['#F0FDF4', '#15803D'],
  Filed: [G, GF],
  'In Preparation': [G, GF],
  'In Progress': ['#FFFBEB', '#B45309'],
  Missing: ['#FEF2F2', '#B91C1C'],
  Gap: ['#FEF2F2', '#B91C1C'],
  Requested: ['#EFF6FF', '#1D4ED8'],
  Shared: ['#F0FDF4', '#15803D'],
  Active: ['#F0FDF4', '#15803D'],
  'Review Due': ['#FFFBEB', '#B45309'],
  'Change Proposed': ['#EFF6FF', '#1D4ED8'],
  Locked: ['#F0FDF4', '#15803D'],
  'Close Approved': ['#EFF6FF', '#1D4ED8'],
  'Reopen Requested': ['#FFFBEB', '#B45309'],
  Reopened: ['#FEF2F2', '#B91C1C'],
  'Close Pending': ['#FFFBEB', '#B45309'],
  Done: ['#F0FDF4', '#15803D'],
  'At Risk': ['#FEF2F2', '#B91C1C'],
  Reviewed: ['#F0FDF4', '#15803D'],
  'For Review': ['#EFF6FF', '#1D4ED8'],
  Blocked: [G, GF],
  Remediated: ['#F0FDF4', '#15803D'],
  Critical: ['#FEF2F2', '#B91C1C'],
  High: ['#FFFBEB', '#B45309'],
  Medium: ['#EFF6FF', '#1D4ED8'],
  Low: [G, GF],
  Release: ['#EFF6FF', '#1D4ED8'],
  Approve: ['#EFF6FF', '#1D4ED8'],
  Decide: ['#FFFBEB', '#B45309'],
  Policy: [G, GF],
  File: ['#F0FDF4', '#15803D'],
  Validate: ['#FFFBEB', '#B45309'],
  Approval: ['#F0FDF4', '#15803D'],
  Hold: ['#FFFBEB', '#B45309'],
  Return: ['#FFFBEB', '#B45309'],
  Control: ['#FEF2F2', '#B91C1C'],
  Close: ['#EFF6FF', '#1D4ED8'],
  Lock: ['#F0FDF4', '#15803D'],
  Reopen: ['#FEF2F2', '#B91C1C'],
  Escalation: ['#F0F9FF', '#0369A1'],
  Assignment: [G, GF],
  Flag: ['#FFFBEB', '#B45309'],
  Review: [G, GF]
};
const chip = (st: string) => {
  const c = CH[st] || [G, GF];
  return { label: st, bg: c[0], fg: c[1] };
};
const TONE: Record<Tone, [string, string, string]> = {
  blue: ['#EFF6FF', '#2563EB', '#6B7280'],
  green: ['#F0FDF4', '#16A34A', '#15803D'],
  amber: ['#FFFBEB', '#D97706', '#B45309'],
  red: ['#FEF2F2', '#DC2626', '#B91C1C'],
  gray: ['#F3F4F6', '#4B5563', '#6B7280']
};
const TC = {
  g: { bg: '#F0FDF4', fg: '#15803D' },
  a: { bg: '#FFFBEB', fg: '#B45309' },
  r: { bg: '#FEF2F2', fg: '#B91C1C' },
  b: { bg: '#EFF6FF', fg: '#1D4ED8' }
};
const SEV: Record<string, { bg: string; bd: string; fg: string; tag: string }> = {
  critical: { bg: '#FEF2F2', bd: '#FECACA', fg: '#991B1B', tag: 'Critical' },
  warning: { bg: '#FFFBEB', bd: '#FDE68A', fg: '#92400E', tag: 'Warning' },
  info: { bg: '#F0F9FF', bd: '#BAE6FD', fg: '#075985', tag: 'Info' },
  success: { bg: '#F0FDF4', bd: '#BBF7D0', fg: '#166534', tag: 'OK' }
};

const SCREENS: Record<string, [string, string, string]> = {
  dashboard: ['Overview', 'Financial Integrity Dashboard', 'Can September close, are the books accurate, and is anything putting compliance or final reporting at risk?'],
  monthend: ['Period Close', 'Month-End Close', 'September 2026 close. Every checklist item must reach 100% before you approve; the period is then locked in Period Locks.'],
  quarterend: ['Period Close', 'Quarter-End Close', 'Q2 FY 2026-27 (Jul–Sep). Quarter provisions, statutory returns and the limited-review pack for auditors.'],
  yearend: ['Period Close', 'Year-End Close', 'FY 2026-27 year-end readiness: prior-year audit observations and the year-end calendar. FY 2025-26 is locked and audited.'],
  locks: ['Period Close', 'Period Locks', 'Lock closed periods against further posting. Reopening a locked period needs your reason and is reported to the CFO.'],
  payments: ['Treasury Control', 'Payment Release', 'Release payment batches approved by the Accounts Manager. Every batch passes control checks before money leaves the bank.'],
  bank: ['Treasury Control', 'Bank Control', 'Approve bank reconciliations, check unexplained differences and freeze outgoing payments on an account.'],
  statements: ['Reporting', 'Financial Statements', 'Validate September statements before they go to the CFO. Lines that moved more than 10% are highlighted for review.'],
  gst: ['Compliance', 'GST Compliance', 'Approve GST and TDS returns for filing. Returns with open exceptions cannot be approved.'],
  auditready: ['Compliance', 'Audit Readiness', 'Items requested by the auditors for the H1 limited review starting 20 Oct 2026.'],
  controls: ['Governance', 'Internal Controls', 'Control breaches detected by the system — maker-checker, approval limits, cut-off and master-data changes.'],
  highrisk: ['Governance', 'High-Risk Review', 'Transactions forwarded by the Accounts Manager above their limits. You approve up to ₹ 50 L; related-party and larger items go to the CFO.'],
  exceptions: ['Governance', 'Exception Governance', 'Critical and high exceptions block the close. Closing an exception clears the item it is linked to.'],
  policies: ['Governance', 'Financial Policies', 'Policies that set approval limits, payment release, close and write-off rules. Approve proposed changes and complete due reviews.'],
  audit: ['Tracking', 'Audit Trail', 'Read-only record of releases, approvals, locks, reopenings, policy changes and escalations.']
};

const NAV_GROUPS: Array<[string, Array<[string, string]>]> = [
  ['', [['dashboard', 'Dashboard']]],
  ['Period Close', [['monthend', 'Month-End Close'], ['quarterend', 'Quarter-End Close'], ['yearend', 'Year-End Close'], ['locks', 'Period Locks']]],
  ['Treasury Control', [['payments', 'Payment Release'], ['bank', 'Bank Control']]],
  ['Reporting', [['statements', 'Financial Statements']]],
  ['Compliance', [['gst', 'GST Compliance'], ['auditready', 'Audit Readiness']]],
  ['Governance', [['controls', 'Internal Controls'], ['highrisk', 'High-Risk Review'], ['exceptions', 'Exception Governance'], ['policies', 'Financial Policies']]],
  ['Tracking', [['audit', 'Audit Trail']]]
];

const ICONS: Record<string, React.ReactElement> = {
  dashboard: <LayoutDashboard size={18} />,
  monthend: <CalendarCheck size={18} />,
  quarterend: <CalendarRange size={18} />,
  yearend: <CalendarClock size={18} />,
  locks: <Lock size={18} />,
  payments: <Send size={18} />,
  bank: <Landmark size={18} />,
  statements: <FileSpreadsheet size={18} />,
  gst: <Receipt size={18} />,
  auditready: <ClipboardCheck size={18} />,
  controls: <ShieldCheck size={18} />,
  highrisk: <ShieldAlert size={18} />,
  exceptions: <TriangleAlert size={18} />,
  policies: <BookOpen size={18} />,
  audit: <ScrollText size={18} />
};

const T = (t: string, who: string, when: string, c: string = ''): TrailEntry => ({ t, who, when, c });
const OWNERS = ['Kavita Shah', 'Rahul Menon', 'Kavya Iyer', 'Deepak Joshi', 'Billing Admin', 'Insurance & TPA Desk', 'Procurement', 'IT · Access', 'R. Iyer (Pharmacy)'];

// Seed Data Fallbacks (matching Finance Controller Workspace prototype)
const BANK0: BankAccountControlItem[] = [
  { id: 'B1', bank: 'HDFC Bank', account_no: '••4417', purpose: 'Main collections', book_balance: 30240000, statement_balance: 30582000, difference: 342000, linked_exception: 'EX-105', status: 'Unreconciled', frozen: false, prepared_by: 'Rahul Menon', last_reconciled: '30 Sep', trail: [T('Reconciliation submitted', 'Rahul Menon', '06 Oct', '₹ 3.42 L credits in bank not traced to receipts')] },
  { id: 'B2', bank: 'ICICI Bank', account_no: '••8820', purpose: 'Vendor payments', book_balance: 18600000, statement_balance: 18600000, difference: 0, status: 'Reconciled', frozen: false, prepared_by: 'Rahul Menon', last_reconciled: '05 Oct', trail: [T('Reconciled · verified by Manager', 'Kavita Shah', '06 Oct')] },
  { id: 'B3', bank: 'State Bank of India', account_no: '••1093', purpose: 'Government schemes (CGHS)', book_balance: 12400000, statement_balance: 12400000, difference: 0, status: 'Approved', frozen: false, prepared_by: 'Kavya Iyer', last_reconciled: '04 Oct', trail: [T('Reconciliation approved', 'Anil Verma', '05 Oct')] },
  { id: 'B4', bank: 'Axis Bank', account_no: '••5521', purpose: 'Payroll', book_balance: 4200000, statement_balance: 4200000, difference: 0, status: 'Approved', frozen: false, prepared_by: 'Rahul Menon', last_reconciled: '02 Oct', trail: [T('Reconciliation approved', 'Anil Verma', '03 Oct')] },
  { id: 'B5', bank: 'HDFC Bank', account_no: '••7765', purpose: 'Card POS settlements', book_balance: 1903370, statement_balance: 1900000, difference: -3370, status: 'Under Review', frozen: false, prepared_by: 'Rahul Menon', last_reconciled: '06 Oct', ack_t: 'Accept the ₹ 3,370 MDR difference — refund claim raised with HDFC merchant services', trail: [T('Escalated · Compliance Risk', 'Rahul Menon', '07 Oct', 'MDR charged above contract rate')] }
];

const BAT0: PaymentBatchItem[] = [
  { id: 'PRB-1008', name: 'Vendor payment run · 08 Oct', type: 'Vendor', count: 9, amount: 12840000, src: 'B2', sched: '08 Oct', status: 'Awaiting Release', prep: 'Rahul Menon', appr: 'Kavita Shah', checks: [{ t: 'All bills approved within delegated limits', ok: true }, { t: '3-way match complete for goods bills', ok: true }, { t: 'Duplicate payment check — no repeats in 90 days', ok: true }, { t: 'Medline Surgicals bank account changed on 05 Oct — call-back verification pending (IC-02)', ok: false, sev: 'critical', ctl: 'IC-02' }], ack_t: 'I have verified the changed Medline bank account by call-back to the registered number', items: ['Apex Pharma Distributors · ₹ 48.6 L', 'Roche Diagnostics · ₹ 22.4 L', 'Medline Surgicals · ₹ 18.4 L', 'Serum Institute (Distributor) · ₹ 11.2 L', '5 more vendors · ₹ 27.8 L'], trail: [T('Prepared', 'Rahul Menon', '06 Oct'), T('Approved by Accounts Manager', 'Kavita Shah', '06 Oct')] },
  { id: 'PRB-1009', name: 'Statutory deposit · GST & TDS Sep', type: 'Statutory', count: 3, amount: 6800000, src: 'B2', sched: '13 Oct', status: 'Awaiting Release', prep: 'Deepak Joshi', appr: 'Kavita Shah', checks: [{ t: 'Amounts tie to GSTR-3B draft and TDS register', ok: true }, { t: 'Challan details validated', ok: true }], items: ['GST · ₹ 41.2 L', 'TDS 194J · ₹ 18.6 L', 'TDS 194C · ₹ 8.2 L'], trail: [T('Prepared', 'Deepak Joshi', '06 Oct'), T('Approved by Accounts Manager', 'Kavita Shah', '06 Oct')] },
  { id: 'PRB-1010', name: 'Visiting consultants · Sep payout', type: 'Professional Fees', count: 42, amount: 4180000, src: 'B2', sched: '08 Oct', status: 'Awaiting Release', prep: 'Rahul Menon', appr: 'Kavita Shah', checks: [{ t: 'Doctor-share report reconciled to billing', ok: true }, { t: 'TDS deducted at 10%', ok: true }, { t: '2 doctors have no PAN–Aadhaar link — higher TDS applies', ok: false, sev: 'warning' }], ack_t: 'Deduct TDS at 20% for the 2 doctors without PAN–Aadhaar link', items: ['42 consultants · OPD, IPD, Radiology'], trail: [T('Prepared', 'Rahul Menon', '06 Oct'), T('Approved by Accounts Manager', 'Kavita Shah', '06 Oct')] },
  { id: 'PRB-1011', name: 'MSME urgent · OxyLife & Shree Ram Linen', type: 'Vendor', count: 2, amount: 1008500, src: 'B2', sched: '07 Oct', status: 'Awaiting Release', prep: 'Rahul Menon', appr: 'Kavita Shah', checks: [{ t: 'Overdue under the MSME 45-day rule', ok: true }, { t: 'Bills approved within limits', ok: true }], items: ['OxyLife Medical Gases · ₹ 6.8 L', 'Shree Ram Linen Services · ₹ 3.3 L'], trail: [T('Prepared', 'Rahul Menon', '06 Oct'), T('Approved by Accounts Manager', 'Kavita Shah', '06 Oct')] },
  { id: 'PRB-1012', name: 'October salaries', type: 'Payroll', count: 612, amount: 18420000, src: 'B4', sched: '31 Oct', status: 'Awaiting Release', prep: 'Kavita Shah', appr: 'Kavita Shah', checks: [{ t: 'Payroll register approved by HR', ok: true }], items: ['612 employees'], trail: [T('Prepared', 'Kavita Shah', '06 Oct'), T('Approved by Accounts Manager', 'Kavita Shah', '06 Oct')] },
  { id: 'PRB-1007', name: 'Vendor payment run · 01 Oct', type: 'Vendor', count: 11, amount: 9620000, src: 'B2', sched: '01 Oct', status: 'Released', prep: 'Rahul Menon', appr: 'Kavita Shah', checks: [], items: [], trail: [T('Prepared', 'Rahul Menon', '01 Oct'), T('Approved by Accounts Manager', 'Kavita Shah', '01 Oct'), T('Released to bank', 'Anil Verma', '01 Oct')] },
  { id: 'PRB-1006', name: 'Patient refunds · week 40', type: 'Refund', count: 18, amount: 612000, src: 'B1', sched: '30 Sep', status: 'Released', prep: 'Kavya Iyer', appr: 'Kavita Shah', checks: [], items: [], trail: [T('Prepared', 'Kavya Iyer', '30 Sep'), T('Approved by Accounts Manager', 'Kavita Shah', '30 Sep'), T('Released to bank', 'Anil Verma', '30 Sep')] }
];

const HR0: HighRiskReviewItem[] = [
  { id: 'H1', reference_no: 'JV-2610-0150', kind: 'Journal', title: 'Payroll – September salaries and statutory contributions', department: 'HR', amount: 1842600, risk: 'Medium', reason: 'Above Manager ₹ 5 L journal limit', received_at: '07 Oct', key_values: [['Source', 'System · PAYRUN-SEP-26'], ['Entry', 'Dr Salary Expense · Cr HDFC Bank']], evidence_docs: ['payroll-register-sep.xlsx', 'bank-advice-sal0926.pdf'], status: 'Awaiting Controller', trail: [T('Forwarded · Above Manager limit', 'Kavita Shah', '07 Oct')] },
  { id: 'H2', reference_no: 'PB-02', kind: 'Vendor Bill', title: 'Medline Surgicals – stent consignment (46 stents)', department: 'IPD', amount: 1840000, risk: 'High', reason: 'Above ₹ 10 L; vendor bank account changed 05 Oct', received_at: '07 Oct', key_values: [['3-way match', 'Cath lab register · 46 implanted'], ['Vendor flag', 'Bank change · IC-02']], evidence_docs: ['ms-cl-2609.pdf', 'cathlab-register-sep.xlsx'], ack_t: 'Bank account change is verified or the payment will be held until IC-02 closes', status: 'Awaiting Controller', trail: [T('Forwarded · IC-02 bank change', 'Kavita Shah', '07 Oct')] },
  { id: 'H3', reference_no: 'PB-08', kind: 'Vendor Bill', title: 'Roche Diagnostics – reagents September', department: 'Laboratory', amount: 2240000, risk: 'Medium', reason: 'Above ₹ 10 L; price 2.1% over PO', received_at: '06 Oct', key_values: [['3-way match', 'GRN-LAB-4471 · price variance'], ['Support', 'Contract revision letter 01 Sep']], evidence_docs: ['rdi-55190.pdf', 'roche-price-revision.pdf'], status: 'Awaiting Controller', trail: [T('Forwarded · Price variance', 'Kavita Shah', '06 Oct')] },
  { id: 'H4', reference_no: 'JV-2610-0157', kind: 'Journal', title: 'Inventory write-down – expired drugs, September', department: 'Pharmacy', amount: 640000, risk: 'High', reason: 'Above ₹ 5 L; reduces September profit', received_at: '06 Oct', key_values: [['Source', 'Pharmacy expiry register'], ['Batches', '63 batches · 41 SKUs']], evidence_docs: ['expiry-register-sep.xlsx'], status: 'Awaiting Controller', trail: [T('Forwarded · Profit impact', 'Kavita Shah', '06 Oct')] },
  { id: 'H5', reference_no: 'WO-2610-C06', kind: 'Write-off', title: 'Patient credit hardship write-off (38 cases)', department: 'IPD', amount: 142000, risk: 'Medium', reason: 'Above Manager ₹ 1 L write-off limit', received_at: '07 Oct', key_values: [['Cases', '38 · each under ₹ 10,000'], ['Recommended by', 'Billing & Social Work']], evidence_docs: ['hardship-cases.xlsx'], status: 'Awaiting Controller', trail: [T('Forwarded · Hardship write-off', 'Kavita Shah', '07 Oct')] },
  { id: 'H6', reference_no: 'CAPEX-2610-04', kind: 'Capital Purchase', title: 'Cath lab C-arm upgrade – advance to Siemens Healthineers', department: 'Radiology', amount: 6200000, risk: 'High', reason: 'Above your ₹ 50 L limit', received_at: '05 Oct', key_values: [['Budget', 'Capex FY27 · approved by Board'], ['Advance', '40% of ₹ 1.55 Cr']], evidence_docs: ['siemens-po-c-arm.pdf'], status: 'Awaiting Controller', trail: [T('Forwarded · Capex advance > 50L', 'Kavita Shah', '05 Oct')] },
  { id: 'H7', reference_no: 'RP-2610-01', kind: 'Related Party', title: 'Consulting fee – Medisys Advisory (trustee-owned firm)', department: 'Administration', amount: 950000, risk: 'High', reason: 'Related-party transaction — Controller review, CFO approval', received_at: '04 Oct', key_values: [['Related party', 'Trustee R. Kapoor · 60% owner'], ['Arm’s length', '2 comparable quotes attached']], evidence_docs: ['medisys-engagement.pdf', 'comparable-quotes.pdf'], status: 'Awaiting Controller', trail: [T('Forwarded · Related party', 'Kavita Shah', '04 Oct')] }
];

interface ExcItem {
  id: string;
  type: string;
  sev: string;
  ref: string;
  title: string;
  dept: string;
  amt: number;
  owner: string;
  status: string;
  raised: string;
  link: string;
  trail: TrailEntry[];
}

const EXC0: ExcItem[] = [
  { id: 'EX-105', type: 'Bank Variance', sev: 'Critical', ref: 'HDFC ••4417', title: 'Unexplained bank difference ₹ 3.42 L – September', dept: 'Finance', amt: 342000, owner: 'Rahul Menon', status: 'Investigating', raised: '04 Oct', link: 'Bank reconciliation B1', trail: [T('Raised', 'Accounts Manager', '04 Oct'), T('Assigned to Rahul Menon', 'Kavita Shah', '04 Oct')] },
  { id: 'EX-104', type: 'GST', sev: 'High', ref: 'GSTR-1 Sep', title: '4 invoices duplicated in GSTR-1; credit notes not netted', dept: 'Compliance', amt: 112400, owner: 'Deepak Joshi', status: 'Investigating', raised: '06 Oct', link: 'GSTR-1 Sep 2026', trail: [T('Raised', 'Accounts Manager', '06 Oct'), T('Assigned to Deepak Joshi', 'Kavita Shah', '06 Oct')] },
  { id: 'EX-201', type: 'Statement Variance', sev: 'High', ref: 'Balance Sheet · Inventory', title: 'Inventory up 15.5% month on month — physical count pending', dept: 'Pharmacy', amt: 9200000, owner: '', status: 'Open', raised: '07 Oct', link: 'Balance Sheet line', trail: [T('Raised', 'Accounts Manager', '07 Oct')] },
  { id: 'EX-108', type: 'Documentation', sev: 'High', ref: 'GRN-PENDING-OT', title: '7 OT vendor bills without a posted GRN', dept: 'IPD', amt: 986000, owner: 'Deepak Joshi', status: 'Investigating', raised: '03 Oct', link: '', trail: [T('Raised', 'Accounts Manager', '03 Oct'), T('Assigned to Deepak Joshi', 'Kavita Shah', '03 Oct')] },
  { id: 'EX-107', type: 'Budget', sev: 'Medium', ref: 'BUD-HR-FY27', title: 'HR recruitment & training 13.8% over budget', dept: 'HR', amt: 440000, owner: 'Kavita Shah', status: 'Open', raised: '03 Oct', link: '', trail: [T('Raised', 'Accounts Manager', '03 Oct')] },
  { id: 'EX-106', type: 'Bank Variance', sev: 'Medium', ref: 'POS-MDR-SEP', title: 'Card MDR charged above contract rate – September', dept: 'Finance', amt: 38600, owner: 'Rahul Menon', status: 'Open', raised: '07 Oct', link: '', trail: [T('Raised', 'Accounts Manager', '07 Oct')] },
  { id: 'EX-109', type: 'Duplicate Bill', sev: 'Medium', ref: 'SDX/SEP/0927', title: 'Sodexo meal invoice billed twice — debit note issued', dept: 'IPD', amt: 64000, owner: 'Rahul Menon', status: 'Closed', raised: '29 Sep', link: '', trail: [T('Raised', 'Accounts Manager', '29 Sep'), T('Closed', 'Rahul Menon', '30 Sep')] }
];

const GST0: TaxReturnItem[] = [
  { id: 'R1', form: 'GSTR-1', period: 'Sep 2026', due: '11 Oct', tax: 4112000, status: 'Exceptions', exceptions: ['4 duplicate invoices in the draft (EX-104)', 'Credit notes CN-0912 to CN-0915 not netted (EX-104)'], link: 'EX-104', prepared_by: 'Deepak Joshi', invoices_count: 849, trail: [T('Prepared', 'Deepak Joshi', '06 Oct')] },
  { id: 'R2', form: 'GSTR-3B', period: 'Sep 2026', due: '20 Oct', tax: 3496000, status: 'Ready', exceptions: ['ITC ₹ 18,400 not in GSTR-2B for 3 vendors', 'Om Sai Chemists GSTIN cancelled — ITC ₹ 6,120 to reverse'], ack_t: 'Reverse ITC of ₹ 24,520 in this return', prepared_by: 'Arjun Rao', invoices_count: 412, trail: [T('Prepared', 'Arjun Rao', '06 Oct')] },
  { id: 'R3', form: 'TDS 26Q', period: 'Q2 FY27', due: '31 Oct', tax: 7840000, status: 'In Preparation', exceptions: [], prepared_by: 'Imran Shaikh', invoices_count: 0, trail: [T('Prepared', 'Imran Shaikh', '06 Oct')] },
  { id: 'R4', form: 'GSTR-1', period: 'Aug 2026', due: '11 Sep', tax: 3984000, status: 'Filed', exceptions: [], prepared_by: 'Priya Nair', invoices_count: 822, trail: [T('Filed', 'Priya Nair', '11 Sep')] },
  { id: 'R5', form: 'GSTR-3B', period: 'Aug 2026', due: '20 Sep', tax: 3312000, status: 'Filed', exceptions: [], prepared_by: 'Arjun Rao', invoices_count: 398, trail: [T('Filed', 'Arjun Rao', '20 Sep')] },
  { id: 'R6', form: 'GSTR-9', period: 'FY 2025-26', due: '31 Dec', tax: 0, status: 'In Preparation', exceptions: [], prepared_by: 'Deepak Joshi', invoices_count: 0, trail: [T('In preparation', 'Deepak Joshi', '01 Oct')] }
];

const PBC0: AuditRequestItem[] = [
  { id: 'PBC-01', title: 'Fixed asset register with H1 additions', owner: 'Rahul Menon', due: '14 Oct', status: 'Ready', evidence_files: ['far-h1.xlsx', 'capex-invoices.zip'], trail: [T('Requested by Sharma & Associates', 'Statutory auditor', '01 Oct')] },
  { id: 'PBC-02', title: 'Bank confirmations – all 5 accounts', owner: 'Rahul Menon', due: '16 Oct', status: 'In Progress', evidence_files: ['3 of 5 confirmations received'], note: 'HDFC ••4417 and ••7765 pending', trail: [T('Requested by Sharma & Associates', 'Statutory auditor', '01 Oct')] },
  { id: 'PBC-03', title: 'Balance confirmations – top 10 payers', owner: 'Kavya Iyer', due: '16 Oct', status: 'In Progress', evidence_files: ['6 of 10 confirmations received'], trail: [T('Requested by Sharma & Associates', 'Statutory auditor', '01 Oct')] },
  { id: 'PBC-04', title: 'Payroll reconciliation – H1', owner: 'Kavita Shah', due: '14 Oct', status: 'Ready', evidence_files: ['payroll-recon-h1.xlsx'], trail: [T('Requested by Sharma & Associates', 'Statutory auditor', '01 Oct')] },
  { id: 'PBC-05', title: 'GSTR-1 vs books reconciliation', owner: 'Deepak Joshi', due: '15 Oct', status: 'Gap', evidence_files: [], note: 'Blocked by GSTR-1 Sep exceptions (EX-104)', trail: [T('Requested by Sharma & Associates', 'Statutory auditor', '01 Oct')] },
  { id: 'PBC-06', title: 'Manual journals above ₹ 5 L with approval trail', owner: 'System report', due: '14 Oct', status: 'Shared', evidence_files: ['jv-listing-h1.csv'], trail: [T('Requested by Sharma & Associates', 'Statutory auditor', '01 Oct')] },
  { id: 'PBC-07', title: 'Inventory count sheets – 30 Sep', owner: 'R. Iyer (Pharmacy)', due: '15 Oct', status: 'Missing', evidence_files: [], trail: [T('Requested by Sharma & Associates', 'Statutory auditor', '01 Oct')] },
  { id: 'PBC-08', title: 'Prior-year audit observations – status', owner: 'Anil Verma', due: '18 Oct', status: 'In Progress', evidence_files: ['obs-tracker.xlsx'], note: '2 of 4 open', trail: [T('Requested by Sharma & Associates', 'Statutory auditor', '01 Oct')] }
];

const CT0: ControlViolationItem[] = [
  { id: 'IC-01', control_name: 'Maker-checker segregation', severity: 'Critical', title: '3 journals created and approved by the same user through a supervisor override', source_or_user: 'Kavya Iyer', references: 'JV-2609-0412, 0415, 0419', detected_at: '29 Sep', status: 'Open', exposure_amount: 286000, trail: [T('Detected by monitor', 'System', '29 Sep')] },
  { id: 'IC-02', control_name: 'Vendor master change', severity: 'Critical', title: 'Medline Surgicals bank account changed 2 days before an ₹ 18.4 L payment', source_or_user: 'Procurement · P. Gupta', references: 'VM-MED-0041', detected_at: '05 Oct', status: 'Open', exposure_amount: 1840000, trail: [T('Detected by monitor', 'System', '05 Oct')] },
  { id: 'IC-03', control_name: 'Approval limits', severity: 'High', title: 'Refund approved at ₹ 5.24 L against a ₹ 5 L Manager limit', source_or_user: 'Kavita Shah', references: 'RF-2610-0108', detected_at: '02 Oct', status: 'Open', exposure_amount: 524000, trail: [T('Detected by monitor', 'System', '02 Oct')] },
  { id: 'IC-04', control_name: 'Period cut-off', severity: 'High', title: '6 journals back-dated to 31 Aug after the August soft close', source_or_user: 'Arjun Rao', references: 'JV-2608-0921 to 0926', detected_at: '04 Oct', status: 'Remediating', exposure_amount: 212000, owner: 'Rahul Menon', trail: [T('Detected by monitor', 'System', '04 Oct'), T('Assigned to Rahul Menon', 'Anil Verma', '04 Oct')] },
  { id: 'IC-05', control_name: 'Split transactions', severity: 'Medium', title: '3 Sodexo bills of ₹ 98,000 on one day — just under the ₹ 1 L supervisor limit', source_or_user: 'Rahul Menon', references: 'VB-2610-0061/62/63', detected_at: '03 Oct', status: 'Open', exposure_amount: 294000, trail: [T('Detected by monitor', 'System', '03 Oct')] },
  { id: 'IC-06', control_name: 'Vendor master duplicates', severity: 'Medium', title: '“Apex Pharma” and “Apex Pharma Distributors” share one GSTIN and bank account', source_or_user: 'System', references: 'VM-APX-0007 / 0112', detected_at: '01 Oct', status: 'Remediating', exposure_amount: 0, owner: 'Procurement', trail: [T('Detected by monitor', 'System', '01 Oct'), T('Assigned to Procurement', 'Anil Verma', '01 Oct')] },
  { id: 'IC-07', control_name: 'User access review', severity: 'Low', title: 'Billing user BC-14 inactive for 45 days still has posting rights', source_or_user: 'IT · Access', references: 'BC-14', detected_at: '30 Sep', status: 'Open', exposure_amount: 0, trail: [T('Detected by monitor', 'System', '30 Sep')] }
];

const POL0: PolicyMasterItem[] = [
  { id: 'POL-01', name: 'Delegation of Financial Authority', version: '3.2', owner: 'Anil Verma', next_review: '31 Oct 2026', status: 'Change Proposed', proposed_change: { what: 'Raise the Accounts Supervisor journal limit from ₹ 50,000 to ₹ 1,00,000', by: 'Kavita Shah', why: 'Supervisors escalate about 40 routine journals a month; 92% are approved unchanged.' }, key_rules: [['Executive', 'Create and submit only'], ['Supervisor', 'JV ₹ 50k · Bill ₹ 1 L · Exp ₹ 25k'], ['Manager', 'JV ₹ 5 L · Bill ₹ 10 L · Write-off ₹ 1 L'], ['Controller', 'Up to ₹ 50 L'], ['CFO', 'Above ₹ 50 L · related party']], trail: [T('Version 3.2 in force', 'Anil Verma', '—'), T('Change proposed', 'Kavita Shah', '05 Oct')] },
  { id: 'POL-02', name: 'Payment Release & Dual Signatory', version: '2.0', owner: 'Anil Verma', next_review: '15 Jan 2027', status: 'Active', key_rules: [['Release', 'Finance Controller'], ['Co-sign', 'CFO above ₹ 1 Cr'], ['Bank change', 'Call-back verification before payment']], trail: [T('Version 2.0 in force', 'Anil Verma', '—')] },
  { id: 'POL-03', name: 'Period Close & Lock', version: '1.4', owner: 'Anil Verma', next_review: '31 Dec 2026', status: 'Active', key_rules: [['Soft close', 'Working day 1'], ['Hard close', 'Working day 7'], ['Reopen', 'Controller with reason · CFO informed']], trail: [T('Version 1.4 in force', 'Anil Verma', '—')] },
  { id: 'POL-04', name: 'Receivable Write-off & Provisioning', version: '2.1', owner: 'Anil Verma', next_review: '30 Sep 2026', status: 'Review Due', key_rules: [['Provision', '50% over 180 days · 100% over 365 days'], ['Write-off', 'Manager ₹ 1 L · Controller ₹ 10 L']], trail: [T('Version 2.1 in force', 'Anil Verma', '—')] },
  { id: 'POL-05', name: 'Revenue Recognition – IPD unbilled', version: '1.2', owner: 'Anil Verma', next_review: '31 Mar 2027', status: 'Active', key_rules: [['Accrual', 'Daily room & services for in-house patients'], ['Reversal', 'Auto-reverses on day 1']], trail: [T('Version 1.2 in force', 'Anil Verma', '—')] },
  { id: 'POL-06', name: 'Fixed Asset Capitalisation', version: '1.1', owner: 'Anil Verma', next_review: '30 Sep 2026', status: 'Review Due', key_rules: [['Threshold', '₹ 25,000'], ['Depreciation', 'Straight line · Companies Act rates']], trail: [T('Version 1.1 in force', 'Anil Verma', '—')] },
  { id: 'POL-07', name: 'Related Party Transactions', version: '1.0', owner: 'CFO', next_review: '31 Mar 2027', status: 'Active', key_rules: [['Review', 'Finance Controller'], ['Approval', 'CFO · Board noting']], trail: [T('Version 1.0 in force', 'CFO', '—')] }
];

const PER0: ControllerPeriodItem[] = [
  { id: 'P-AUG', label: 'August 2026', period_type: 'Month', status: 'Reopen Requested', locked: '09 Sep', req: { by: 'Kavita Shah', why: 'Siemens credit note ₹ 2.8 L for August AMC arrived 03 Oct and should be posted in August.' }, trail: [T('Period locked', 'Anil Verma', '09 Sep'), T('Reopen requested', 'Kavita Shah', '06 Oct')] },
  { id: 'P-JUL', label: 'July 2026', period_type: 'Month', status: 'Locked', locked: '08 Aug', trail: [T('Period locked', 'Anil Verma', '08 Aug')] },
  { id: 'P-Q1', label: 'Q1 FY 2026-27', period_type: 'Quarter', status: 'Locked', locked: '12 Jul', trail: [T('Period locked', 'Anil Verma', '12 Jul')] },
  { id: 'P-JUN', label: 'June 2026', period_type: 'Month', status: 'Locked', locked: '08 Jul', trail: [T('Period locked', 'Anil Verma', '08 Jul')] },
  { id: 'P-FY26', label: 'FY 2025-26', period_type: 'Year', status: 'Locked', locked: '28 Jun', note: 'Audited · signed by CFO', trail: [T('Period locked', 'Anil Verma', '28 Jun')] }
];

const QI0: QuarterEndItem[] = [
  { id: 'Q1', t: 'Depreciation run – July to September', d: '₹ 2.76 Cr posted', owner: 'System', st: 'Done' },
  { id: 'Q2', t: 'Bad-debt provision – receivables over 180 days', d: '₹ 14.2 L proposed: CGHS, Medi Assist TPA, patient credit', owner: 'Kavita Shah', st: 'For Review' },
  { id: 'Q3', t: 'Inventory valuation & expiry provision', d: '₹ 3.8 L expiry provision — needs EX-201 count closed', owner: 'R. Iyer (Pharmacy)', st: 'For Review', need: 'EX-201' },
  { id: 'Q4', t: 'TDS return 26Q – Q2', d: '₹ 78.4 L deducted · due 31 Oct', owner: 'Imran Shaikh', st: 'For Review' },
  { id: 'Q5', t: 'Related-party transactions schedule', d: '4 transactions · ₹ 31.6 L', owner: 'Anil Verma', st: 'Done' },
  { id: 'Q6', t: 'Inter-unit & pharmacy store reconciliation', d: 'Nil difference', owner: 'Rahul Menon', st: 'Done' },
  { id: 'Q7', t: 'Limited-review pack for auditors', d: 'Needs all three September statements approved', owner: 'Anil Verma', st: 'Blocked', need_st: true }
];

const YI0: YearEndItem[] = [
  { id: 'Y1', t: 'Observation: 18% of fixed assets not physically verified', d: 'Verification plan due 30 Nov · 3 of 11 blocks done', owner: 'Rahul Menon', st: 'Open', kind: 'obs' },
  { id: 'Y2', t: 'Observation: TPA receivables over 1 year unreconciled (₹ 42 L)', d: '₹ 26 L reconciled so far', owner: 'Kavya Iyer', st: 'Open', kind: 'obs' },
  { id: 'Y3', t: 'Observation: GST input credit not reconciled monthly', d: 'Monthly reconciliation in place since July', owner: 'Deepak Joshi', st: 'Remediated', kind: 'obs' },
  { id: 'Y4', t: 'Observation: no call-back on vendor bank changes', d: 'Policy POL-02 v2.0 — breached once (IC-02)', owner: 'Procurement', st: 'Remediated', kind: 'obs' },
  { id: 'Y5', t: 'Year-end calendar FY 2026-27', d: 'Hard close 10 Apr · audit fieldwork 20 Apr–31 May · Board 30 Jun', owner: 'Anil Verma', st: 'For Review', kind: 'plan' },
  { id: 'Y6', t: 'Physical inventory count plan – 31 Mar 2027', d: 'Pharmacy, OT stores, CSSD and linen', owner: 'R. Iyer (Pharmacy)', st: 'For Review', kind: 'plan' }
];

const STM: Record<string, { name: string; sub: string; rows: Array<[string, string, string, number, number]> }> = {
  pl: {
    name: 'Profit & Loss',
    sub: 'September 2026',
    rows: [
      ['h', '', 'Revenue', 0, 0],
      ['l', 'pl:opd', 'OPD', 3.12, 2.98],
      ['l', 'pl:ipd', 'IPD', 10.46, 10.12],
      ['l', 'pl:lab', 'Laboratory', 1.88, 1.91],
      ['l', 'pl:rad', 'Radiology', 2.26, 2.14],
      ['l', 'pl:phm', 'Pharmacy', 4.10, 4.02],
      ['t', 'pl:rev', 'Total revenue', 21.82, 21.17],
      ['h', '', 'Expenses', 0, 0],
      ['l', 'pl:sal', 'Salaries & benefits', 8.42, 8.30],
      ['l', 'pl:drg', 'Drugs & consumables', 4.86, 4.40],
      ['l', 'pl:fee', 'Professional fees', 2.08, 2.02],
      ['l', 'pl:mnt', 'Maintenance & AMC', 0.71, 0.69],
      ['l', 'pl:utl', 'Utilities', 0.52, 0.47],
      ['l', 'pl:adm', 'Administration & other', 1.02, 0.98],
      ['l', 'pl:dep', 'Depreciation', 0.92, 0.92],
      ['t', 'pl:exp', 'Total expenses', 18.53, 17.78],
      ['t', 'pl:np', 'Net profit', 3.29, 3.39]
    ]
  },
  bs: {
    name: 'Balance Sheet',
    sub: 'As at 30 Sep 2026',
    rows: [
      ['h', '', 'Assets', 0, 0],
      ['l', 'bs:fa', 'Fixed assets (net)', 143.92, 143.52],
      ['l', 'bs:inv', 'Inventory', 6.84, 5.92],
      ['l', 'bs:ar', 'Receivables', 4.82, 4.42],
      ['l', 'bs:cash', 'Cash & bank', 6.73, 7.18],
      ['l', 'bs:oca', 'Other current assets', 2.10, 2.05],
      ['t', 'bs:ta', 'Total assets', 164.41, 163.09],
      ['h', '', 'Equity & liabilities', 0, 0],
      ['l', 'bs:eq', 'Equity & reserves', 98.40, 95.11],
      ['l', 'bs:ltl', 'Long-term borrowings', 38.20, 38.62],
      ['l', 'bs:ap', 'Trade payables', 1.98, 2.21],
      ['l', 'bs:stat', 'Statutory dues', 1.42, 1.36],
      ['l', 'bs:prov', 'Provisions & other liabilities', 24.41, 25.79],
      ['t', 'bs:tl', 'Total equity & liabilities', 164.41, 163.09]
    ]
  },
  cf: {
    name: 'Cash Flow',
    sub: 'September 2026',
    rows: [
      ['h', '', 'Operating activities', 0, 0],
      ['l', 'cf:np', 'Net profit', 3.29, 3.39],
      ['l', 'cf:dep', 'Depreciation', 0.92, 0.92],
      ['l', 'cf:wc', 'Working capital changes', -2.92, -0.41],
      ['t', 'cf:op', 'Net cash from operations', 1.29, 3.90],
      ['h', '', 'Investing activities', 0, 0],
      ['l', 'cf:capex', 'Capital expenditure', -1.32, -0.88],
      ['h', '', 'Financing activities', 0, 0],
      ['l', 'cf:loan', 'Loan repayment', -0.42, -0.42],
      ['t', 'cf:net', 'Net change in cash', -0.45, 2.60],
      ['l', 'cf:open', 'Opening cash & bank', 7.18, 4.58],
      ['t', 'cf:close', 'Closing cash & bank', 6.73, 7.18]
    ]
  }
};

const TIE: Record<string, Array<[string, boolean]>> = {
  pl: [['Revenue less expenses equals net profit', true], ['Net profit carried to Cash Flow (₹ 3.29 Cr)', true]],
  bs: [['Total assets equal total equity & liabilities (₹ 164.41 Cr)', true], ['Change in reserves equals net profit (₹ 3.29 Cr)', true]],
  cf: [['Closing cash ties to Balance Sheet (₹ 6.73 Cr)', true], ['Loan repayment ties to borrowings movement', true]]
};

interface AuditLogRecord {
  id: string;
  ts: string;
  day: number;
  user: string;
  role: string;
  action: string;
  module: string;
  ref: string;
  detail: string;
}

const A0: AuditLogRecord[] = [
  { id: '1', ts: '07 Oct 2026, 09:20', day: 0, user: 'Anil Verma', role: 'Finance Controller', action: 'Assignment', module: 'Exception Governance', ref: 'EX-105', detail: 'Assigned to Rahul Menon' },
  { id: '2', ts: '07 Oct 2026, 08:45', day: 0, user: 'Kavita Shah', role: 'Accounts Manager', action: 'Escalation', module: 'High-Risk Review', ref: 'PB-02', detail: 'Forwarded — above ₹ 10 L' },
  { id: '3', ts: '06 Oct 2026, 18:10', day: 1, user: 'Kavita Shah', role: 'Accounts Manager', action: 'Reopen', module: 'Period Locks', ref: 'August 2026', detail: 'Reopen requested' },
  { id: '4', ts: '06 Oct 2026, 17:00', day: 1, user: 'Anil Verma', role: 'Finance Controller', action: 'Return', module: 'GST Compliance', ref: 'GSTR-1 Sep', detail: 'Rejected batch W3 — duplicates' },
  { id: '5', ts: '05 Oct 2026, 16:30', day: 2, user: 'Anil Verma', role: 'Finance Controller', action: 'Approval', module: 'Bank Control', ref: 'SBI ••1093', detail: 'Reconciliation approved' },
  { id: '6', ts: '05 Oct 2026, 11:15', day: 2, user: 'System', role: 'Control monitor', action: 'Control', module: 'Internal Controls', ref: 'IC-02', detail: 'Vendor bank change detected' },
  { id: '7', ts: '03 Oct 2026, 15:40', day: 4, user: 'Anil Verma', role: 'Finance Controller', action: 'Approval', module: 'Bank Control', ref: 'Axis ••5521', detail: 'Reconciliation approved' },
  { id: '8', ts: '01 Oct 2026, 10:00', day: 6, user: 'Anil Verma', role: 'Finance Controller', action: 'Release', module: 'Payment Release', ref: 'PRB-1007', detail: 'Released · ₹ 96,20,000' },
  { id: '9', ts: '09 Sep 2026, 18:20', day: 28, user: 'Anil Verma', role: 'Finance Controller', action: 'Lock', module: 'Period Locks', ref: 'August 2026', detail: 'Period locked' }
];

const SEVR: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const DONE_EX = ['Closed', 'Risk Accepted'];

export const FinanceControllerWorkspace: React.FC<any> = ({
  activeRoleView = 'controller',
  onSelectRole = () => {},
  workload,
  currentTime,
  onOpenMaster
}) => {
  const { user } = useAuth();
  const fcName = (user as any)?.name || (user as any)?.username || 'Anil Verma';
  const fcIni = fcName.split(' ').map((n: string) => n[0]).join('').slice(0, 2);

  // Core navigation & screen state
  const [screen, setScreen] = useState<string>(() => {
    try {
      return localStorage.getItem('fcScreen') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const [tab, setTab] = useState<Record<string, string>>({
    payments: 'Awaiting Release',
    bank: 'All',
    highrisk: 'Awaiting',
    exceptions: 'Blocking Close',
    gst: 'Open',
    auditready: 'All',
    controls: 'Open',
    policies: 'All',
    locks: 'All',
    audit: 'This Week'
  });

  const [sel, setSel] = useState<Record<string, string>>({
    payments: 'PRB-1008',
    bank: 'B1',
    highrisk: 'H2',
    exceptions: 'EX-105',
    gst: 'R1',
    auditready: 'PBC-07',
    controls: 'IC-02',
    policies: 'POL-01',
    locks: 'P-SEP'
  });

  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({});
  const [cmt, setCmt] = useState('');
  const [err, setErr] = useState('');
  const [selVal, setSelVal] = useState('');
  const [ack, setAck] = useState(false);
  const [toast, setToast] = useState('');

  // Domain state
  const [banks, setBanks] = useState<BankAccountControlItem[]>(BANK0);
  const [batches, setBatches] = useState<PaymentBatchItem[]>(BAT0);
  const [hr, setHr] = useState<HighRiskReviewItem[]>(HR0);
  const [exc, setExc] = useState<ExcItem[]>(EXC0);
  const [gst, setGst] = useState<TaxReturnItem[]>(GST0);
  const [pbc, setPbc] = useState<AuditRequestItem[]>(PBC0);
  const [ctrl, setCtrl] = useState<ControlViolationItem[]>(CT0);
  const [pol, setPol] = useState<PolicyMasterItem[]>(POL0);
  const [per, setPer] = useState<ControllerPeriodItem[]>(PER0);
  const [qi, setQi] = useState<QuarterEndItem[]>(QI0);
  const [yi, setYi] = useState<YearEndItem[]>(YI0);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(A0);

  // Month-end close & statement state
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [chkOwner, setChkOwner] = useState<Record<string, string>>({});
  const [sepStatus, setSepStatus] = useState<'Open' | 'Close Approved' | 'Locked'>('Open');
  const [closeState, setCloseState] = useState<'Open' | 'Delayed' | 'Approved'>('Open');
  const [closeTarget, setCloseTarget] = useState('10 Oct');
  const [delayTo, setDelayTo] = useState('');
  const [qState, setQState] = useState<'Open' | 'Approved' | 'Locked'>('Open');
  const [stView, setStView] = useState<'pl' | 'bs' | 'cf'>('pl');
  const [stSel, setStSel] = useState('');
  const [stApp, setStApp] = useState<Record<string, boolean>>({ pl: false, bs: false, cf: false });
  const [stFlags, setStFlags] = useState<Record<string, string>>({ 'bs:inv': 'EX-201' });
  const [exSeq, setExSeq] = useState(210);
  const [yShared, setYShared] = useState(false);

  // Audit filter state
  const [aUser, setAUser] = useState('All users');
  const [aMod, setAMod] = useState('All modules');
  const [aAct, setAAct] = useState('All actions');

  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 4000);
  };

  const logAction = (action: string, module: string, ref: string, detail: string) => {
    const entry: AuditLogRecord = {
      id: String(Date.now()),
      ts: '07 Oct 2026, ' + hm(),
      day: 0,
      user: fcName,
      role: 'Finance Controller',
      action,
      module,
      ref,
      detail
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  const cosignLimit = 1e7; // ₹ 1 Cr

  const batchChecks = (b: PaymentBatchItem) => {
    const src = banks.find((k) => k.id === b.src);
    const out = b.checks.map((c) => {
      if (c.ctl) {
        const v = ctrl.find((x) => x.id === c.ctl);
        if (v && v.status === 'Closed') {
          return { ...c, ok: true, t: c.t.split(' — ')[0] + ' — verified (' + c.ctl + ' closed)' };
        }
      }
      return c;
    });
    if (src) {
      if (src.frozen) {
        out.push({ t: `Source account ${src.bank} ${src.account_no} is frozen`, ok: false, hard: true });
      } else if (b.amount > src.book_balance) {
        out.push({ t: `Insufficient balance in ${src.bank} ${src.account_no} (${cr(src.book_balance)}) — fund the account before release`, ok: false, hard: true });
      } else {
        out.push({ t: `Sufficient balance in ${src.bank} ${src.account_no} (${cr(src.book_balance)})`, ok: true });
      }
    }
    return out;
  };

  // Compute calculated metrics
  const calc = useMemo(() => {
    const own = (id: string, d: string) => owners[id] || d;
    const bankOK = banks.filter((b) => b.status === 'Approved').length;
    const unexpl = banks.filter((b) => b.difference !== 0 && b.linked_exception && !DONE_EX.includes(exc.find((e) => e.id === b.linked_exception)?.status || ''));
    const hrP = hr.filter((h) => h.status === 'Awaiting Controller');
    const jP = hrP.filter((h) => h.kind === 'Journal').length;
    const vP = hrP.filter((h) => h.kind === 'Vendor Bill').length;
    const openEx = exc.filter((e) => !DONE_EX.includes(e.status));
    const blockEx = openEx.filter((e) => e.sev === 'Critical' || e.sev === 'High');
    const ctlOpen = ctrl.filter((v) => v.status !== 'Closed');
    const ctlBlk = ctlOpen.filter((v) => v.severity === 'Critical' || v.severity === 'High');
    const r1 = gst.find((g) => g.id === 'R1');
    const gstPct = r1 ? (['Approved For Filing', 'Filed'].includes(r1.status) ? 100 : r1.status === 'Ready' ? 85 : 60) : 100;
    const stAppCount = ['pl', 'bs', 'cf'].filter((k) => stApp[k]).length;

    const chk = [
      { id: 'K1', t: 'Billing Posted', d: 'All September bills posted · 05 Oct', pct: 100, owner: own('K1', 'Billing Admin'), go: null },
      { id: 'K2', t: 'Insurance & TPA Updated', d: 'Claim settlements posted · 06 Oct', pct: 100, owner: own('K2', 'Insurance & TPA Desk'), go: null },
      { id: 'K3', t: 'Vendor Posting Completed', d: vP ? `${vP} high-value bills awaiting your review` : 'All vendor bills posted', pct: Math.max(0, 100 - vP * 6), owner: own('K3', 'Rahul Menon'), go: 'highrisk' },
      { id: 'K4', t: 'Bank Reconciliations Approved', d: `${bankOK} of 5 accounts approved${unexpl.length ? ' · ' + cr(unexpl.reduce((a, b) => a + Math.abs(b.difference), 0)) + ' unexplained' : ''}`, pct: Math.round((bankOK / 5) * 100), owner: own('K4', 'Rahul Menon'), go: 'bank' },
      { id: 'K5', t: 'Journals Posted', d: jP ? `${jP} high-value journals awaiting you` : 'All journals posted', pct: Math.max(0, 100 - jP * 7), owner: own('K5', 'Kavita Shah'), go: 'highrisk' },
      { id: 'K6', t: 'GST Reviewed', d: `GSTR-1 Sep · ${r1?.status}`, pct: gstPct, owner: own('K6', 'Deepak Joshi'), go: 'gst' },
      { id: 'K7', t: 'High-Risk Exceptions Cleared', d: blockEx.length ? `${blockEx.length} critical/high exceptions open` : 'None open', pct: Math.max(0, 100 - blockEx.length * 10), owner: own('K7', 'Kavita Shah'), go: 'exceptions' },
      { id: 'K8', t: 'Internal Controls Reviewed', d: ctlBlk.length ? `${ctlBlk.length} critical/high violations open` : 'No open violations', pct: Math.max(0, 100 - ctlBlk.length * 12), owner: own('K8', fcName), go: 'controls' },
      { id: 'K9', t: 'Financial Statements Validated', d: `${stAppCount} of 3 statements approved`, pct: Math.round((stAppCount / 3) * 100), owner: own('K9', fcName), go: 'statements' }
    ].map((k) => ({ ...k, st: (k.pct >= 100 ? 'Done' : k.pct < 70 ? 'At Risk' : 'In Progress') as 'Done' | 'At Risk' | 'In Progress' }));

    const ready = Math.round(chk.reduce((a, k) => a + k.pct, 0) / chk.length);
    const pbcR = pbc.filter((p) => p.status === 'Ready' || p.status === 'Shared').length;
    const audPct = Math.round((pbcR / pbc.length) * 100);
    const batchAw = batches.filter((b) => b.status === 'Awaiting Release');
    const batchOK = batchAw.filter((b) => batchChecks(b).every((c) => c.ok));
    const gstRisk = gst.filter((g) => g.exceptions.length && !['Approved For Filing', 'Filed'].includes(g.status));
    const stFlagOpen = Object.keys(stFlags).filter((k) => {
      const x = exc.find((y) => y.id === stFlags[k]);
      return x && !DONE_EX.includes(x.status);
    });
    const bypass = ctlOpen.filter((v) => ['Maker-checker segregation', 'Approval limits', 'Split transactions', 'Period cut-off'].includes(v.control_name));

    return { bankOK, unexpl, hrP, jP, vP, openEx, blockEx, ctlOpen, ctlBlk, r1, stAppCount, chk, ready, audPct, batchAw, batchOK, gstRisk, stFlagOpen, bypass };
  }, [banks, batches, hr, exc, gst, pbc, ctrl, stApp, stFlags, owners, fcName]);

  const sideStatus = closeState === 'Delayed' ? { label: 'Delayed', ...TC.r } : sepStatus === 'Locked' ? { label: 'Locked', ...TC.g } : sepStatus === 'Close Approved' ? { label: 'Approved', ...TC.b } : { label: `${calc.ready}% ready`, ...TC.a };

  // Handlers for Decisions and Actions
  const handleAction = async (kind: string, id: string) => {
    const sc = screen;
    const c = cmt.trim();
    const NEED = ['reject', 'return', 'hold', 'cfo', 'close', 'accept', 'freeze', 'rejectChange', 'request', 'rejectReopen', 'approveReopen', 'reopen'];
    if (NEED.includes(kind) && c.length < 5) {
      setErr('Add a comment (at least 5 characters) — it is recorded in the audit trail.');
      return;
    }

    if (sc === 'payments') {
      const b = batches.find((x) => x.id === id);
      if (!b || b.status !== 'Awaiting Release') return;
      if (kind === 'release') {
        const ck = batchChecks(b);
        const hard = ck.find((x) => !x.ok && x.hard);
        if (hard) {
          setErr(hard.t + '.');
          return;
        }
        if (ck.some((x) => !x.ok) && !ack) {
          setErr('Tick the acknowledgement for the failed check before releasing.');
          return;
        }
        const co = b.amount > cosignLimit;
        setBatches((prev) =>
          prev.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: co ? 'Awaiting CFO Co-sign' : 'Released',
                  trail: [...x.trail, T(co ? 'Released by Controller — awaiting CFO co-sign' : 'Released to bank', fcName, NOW(), c)]
                }
              : x
          )
        );
        if (!co) {
          setBanks((prev) =>
            prev.map((k) => (k.id === b.src ? { ...k, book_balance: k.book_balance - b.amount, statement_balance: k.statement_balance - b.amount } : k))
          );
        }
        logAction('Release', 'Payment Release', b.id, (co ? 'Co-sign requested · ' : 'Released · ') + fmt(b.amount));
        say(co ? `${b.id} released — above ${cr(cosignLimit)}, sent to CFO for co-sign` : `${b.id} released to bank · ${cr(b.amount)}`);
      } else if (kind === 'hold') {
        setBatches((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'On Hold', trail: [...x.trail, T('Put on hold', fcName, NOW(), c)] } : x)));
        logAction('Hold', 'Payment Release', b.id, c);
        say(`${b.id} put on hold`);
      } else if (kind === 'return') {
        setBatches((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Returned', trail: [...x.trail, T('Returned to Accounts Manager', fcName, NOW(), c)] } : x)));
        logAction('Return', 'Payment Release', b.id, c);
        say(`${b.id} returned to the Accounts Manager`);
      }
    } else if (sc === 'bank') {
      const b = banks.find((x) => x.id === id);
      if (!b) return;
      const ex = b.linked_exception && exc.find((e) => e.id === b.linked_exception);
      const un = b.difference !== 0 && ex && !DONE_EX.includes(ex.status);
      if (kind === 'approve') {
        if (b.status === 'Approved') return;
        if (un) {
          setErr(`Difference of ${fmt(Math.abs(b.difference))} is unexplained — close ${b.linked_exception} in Exception Governance first.`);
          return;
        }
        if (b.difference !== 0 && b.ack_t && !ack) {
          setErr('Tick the acknowledgement to approve with a difference.');
          return;
        }
        setBanks((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Approved', trail: [...x.trail, T('Reconciliation approved', fcName, NOW())] } : x)));
        logAction('Approval', 'Bank Control', `${b.bank} ${b.account_no}`, `Reconciliation approved${b.difference ? ' · difference accepted' : ''}`);
        say(`${b.bank} ${b.account_no} reconciliation approved`);
      } else if (kind === 'return') {
        setBanks((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Under Review', trail: [...x.trail, T('Returned to Accounts Manager', fcName, NOW(), c)] } : x)));
        logAction('Return', 'Bank Control', `${b.bank} ${b.account_no}`, c);
        say('Reconciliation returned to Accounts Manager');
      } else if (kind === 'freeze') {
        setBanks((prev) => prev.map((x) => (x.id === id ? { ...x, frozen: !x.frozen, trail: [...x.trail, T(x.frozen ? 'Outgoing payments unfrozen' : 'Outgoing payments frozen', fcName, NOW(), c)] } : x)));
        logAction('Control', 'Bank Control', `${b.bank} ${b.account_no}`, b.frozen ? 'Unfrozen' : 'Payments frozen');
        say(`${b.bank} ${b.account_no} ${b.frozen ? 'unfrozen' : 'frozen — batches from this account cannot be released'}`);
      }
    } else if (sc === 'highrisk') {
      const h = hr.find((x) => x.id === id);
      if (!h || h.status !== 'Awaiting Controller') return;
      if (kind === 'approve') {
        if (h.kind === 'Related Party') {
          setErr('Related-party transactions need CFO approval — use Forward To CFO.');
          return;
        }
        if (h.amount > LIM) {
          setErr('Above your ₹ 50 L limit — use Forward To CFO.');
          return;
        }
        if (h.ack_t && !ack) {
          setErr('Tick the acknowledgement first.');
          return;
        }
        setHr((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Approved', trail: [...x.trail, T(h.kind === 'Journal' ? 'Approved and posted' : 'Approved', fcName, NOW())] } : x)));
        logAction('Approval', 'High-Risk Review', h.reference_no, `Approved · ${fmt(h.amount)}`);
        say(`${h.reference_no} ${h.kind === 'Journal' ? 'approved and posted to the ledger' : 'approved'}`);
      } else if (kind === 'cfo') {
        setHr((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'With CFO', trail: [...x.trail, T('Forwarded to CFO', fcName, NOW(), c)] } : x)));
        logAction('Escalation', 'High-Risk Review', h.reference_no, `Forwarded to CFO · ${c}`);
        say(`${h.reference_no} forwarded to the CFO`);
      } else if (kind === 'return') {
        setHr((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Returned', trail: [...x.trail, T('Returned to Accounts Manager', fcName, NOW(), c)] } : x)));
        logAction('Return', 'High-Risk Review', h.reference_no, `Returned · ${c}`);
        say(`${h.reference_no} returned to the Accounts Manager`);
      } else if (kind === 'reject') {
        setHr((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Rejected', trail: [...x.trail, T('Rejected', fcName, NOW(), c)] } : x)));
        logAction('Approval', 'High-Risk Review', h.reference_no, `Rejected · ${c}`);
        say(`${h.reference_no} rejected`);
      }
    } else if (sc === 'exceptions') {
      const e = exc.find((x) => x.id === id);
      if (!e || DONE_EX.includes(e.status)) return;
      if (kind === 'assign') {
        if (!selVal) {
          setErr('Choose an owner first.');
          return;
        }
        setExc((prev) => prev.map((x) => (x.id === id ? { ...x, owner: selVal, status: x.status === 'Open' ? 'Investigating' : x.status, trail: [...x.trail, T(`Assigned to ${selVal}`, fcName, NOW())] } : x)));
        logAction('Assignment', 'Exception Governance', e.id, `Assigned to ${selVal}`);
        say(`${e.id} assigned to ${selVal}`);
      } else if (kind === 'accept') {
        if (e.sev === 'Critical' || e.sev === 'High') {
          setErr('Critical and High exceptions cannot be risk-accepted — close or escalate them.');
          return;
        }
        setExc((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Risk Accepted', trail: [...x.trail, T('Risk accepted', fcName, NOW(), c)] } : x)));
        logAction('Approval', 'Exception Governance', e.id, `Risk accepted · ${c}`);
        say(`${e.id} risk accepted`);
      } else if (kind === 'cfo') {
        setExc((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'With CFO', trail: [...x.trail, T('Escalated to CFO', fcName, NOW(), c)] } : x)));
        logAction('Escalation', 'Exception Governance', e.id, 'Escalated to CFO');
        say(`${e.id} escalated to the CFO`);
      } else if (kind === 'close') {
        setExc((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Closed', trail: [...x.trail, T('Closed', fcName, NOW(), c)] } : x)));
        logAction('Close', 'Exception Governance', e.id, `Closed · ${c}`);
        if (e.id === 'EX-104') {
          setGst((prev) => prev.map((g) => (g.id === 'R1' ? { ...g, status: 'Ready', exceptions: [], trail: [...g.trail, T('Exceptions cleared via EX-104', fcName, NOW())] } : g)));
          setPbc((prev) => prev.map((p) => (p.id === 'PBC-05' ? { ...p, status: 'In Progress', evidence_files: ['gstr1-vs-books-sep.xlsx'], note: '' } : p)));
          say(`${e.id} closed — GSTR-1 Sep is ready for approval`);
        } else if (e.id === 'EX-105') {
          say(`${e.id} closed — HDFC ••4417 reconciliation can now be approved`);
        } else if (e.id === 'EX-201') {
          setPbc((prev) => prev.map((p) => (p.id === 'PBC-07' ? { ...p, status: 'In Progress', evidence_files: ['count-sheets-30sep.pdf'], note: '' } : p)));
          say(`${e.id} closed — inventory flag cleared`);
        } else {
          say(`${e.id} closed`);
        }
      }
    } else if (sc === 'gst') {
      const g = gst.find((x) => x.id === id);
      if (!g) return;
      if (kind === 'approve') {
        if (g.status === 'Exceptions') {
          setErr(`Resolve ${g.exceptions.length} exceptions first — close ${g.link} in Exception Governance.`);
          return;
        }
        if (g.ack_t && g.exceptions.length && !ack) {
          setErr('Tick the acknowledgement first.');
          return;
        }
        setGst((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Approved For Filing', trail: [...x.trail, T('Approved for filing', fcName, NOW())] } : x)));
        logAction('Approval', 'GST Compliance', `${g.form} ${g.period}`, `Approved for filing · ${fmt(g.tax)}`);
        say(`${g.form} ${g.period} approved for filing`);
      } else if (kind === 'return') {
        setGst((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'In Preparation', trail: [...x.trail, T('Returned to Accounts Manager', fcName, NOW(), c)] } : x)));
        logAction('Return', 'GST Compliance', `${g.form} ${g.period}`, c);
        say(`${g.form} returned`);
      } else if (kind === 'cfo') {
        setGst((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'With CFO', trail: [...x.trail, T('Escalated to CFO', fcName, NOW(), c)] } : x)));
        logAction('Escalation', 'GST Compliance', `${g.form} ${g.period}`, c);
        say(`${g.form} escalated to the CFO`);
      }
    } else if (sc === 'auditready') {
      const r = pbc.find((x) => x.id === id);
      if (!r) return;
      if (kind === 'ready') {
        if (!r.evidence_files.length) {
          setErr('No evidence attached — request it from the owner first.');
          return;
        }
        setPbc((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Ready', trail: [...x.trail, T('Marked ready', fcName, NOW())] } : x)));
        logAction('Approval', 'Audit Readiness', r.id, 'Marked ready');
        say(`${r.id} marked ready`);
      } else if (kind === 'request') {
        const o = selVal || r.owner;
        setPbc((prev) => prev.map((x) => (x.id === id ? { ...x, status: x.status === 'Ready' ? x.status : 'Requested', owner: o, trail: [...x.trail, T(`Evidence requested from ${o}`, fcName, NOW(), c)] } : x)));
        logAction('Assignment', 'Audit Readiness', r.id, `Evidence requested from ${o}`);
        say(`Evidence requested from ${o}`);
      } else if (kind === 'share') {
        if (r.status !== 'Ready') {
          setErr('Only items marked Ready can be shared with the auditor.');
          return;
        }
        setPbc((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Shared', trail: [...x.trail, T('Shared with Sharma & Associates', fcName, NOW())] } : x)));
        logAction('Release', 'Audit Readiness', r.id, 'Shared with auditor');
        say(`${r.id} shared with the auditor`);
      }
    } else if (sc === 'controls') {
      const v = ctrl.find((x) => x.id === id);
      if (!v || v.status === 'Closed') return;
      if (kind === 'remediate') {
        if (!selVal) {
          setErr('Choose who will remediate.');
          return;
        }
        setCtrl((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Remediating', owner: selVal, trail: [...x.trail, T(`Remediation assigned to ${selVal}`, fcName, NOW())] } : x)));
        logAction('Assignment', 'Internal Controls', v.id, `Remediation → ${selVal}`);
        say(`${v.id} assigned to ${selVal}`);
      } else if (kind === 'cfo') {
        setCtrl((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Escalated', trail: [...x.trail, T('Escalated to CFO', fcName, NOW(), c)] } : x)));
        logAction('Escalation', 'Internal Controls', v.id, c);
        say(`${v.id} escalated to the CFO`);
      } else if (kind === 'close') {
        setCtrl((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Closed', trail: [...x.trail, T('Closed — remediated', fcName, NOW(), c)] } : x)));
        logAction('Close', 'Internal Controls', v.id, c);
        say(`${v.id} closed${v.id === 'IC-02' ? ' — PRB-1008 Medline check now passes' : ''}`);
      }
    } else if (sc === 'policies') {
      const p = pol.find((x) => x.id === id);
      if (!p) return;
      if (kind === 'approveChange') {
        if (p.status !== 'Change Proposed') return;
        const nv = (parseFloat(p.version) + 0.1).toFixed(1);
        setPol((prev) =>
          prev.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: 'Active',
                  version: nv,
                  proposed_change: null,
                  key_rules: x.id === 'POL-01' ? x.key_rules.map((k) => (k[0] === 'Supervisor' ? ['Supervisor', 'JV ₹ 1 L · Bill ₹ 1 L · Exp ₹ 25k'] : k)) : x.key_rules,
                  trail: [...x.trail, T(`Change approved · v${nv}`, fcName, NOW())]
                }
              : x
          )
        );
        logAction('Approval', 'Financial Policies', p.id, `Change approved · v${nv}`);
        say(`${p.name} v${nv} in force`);
      } else if (kind === 'rejectChange') {
        setPol((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Active', proposed_change: null, trail: [...x.trail, T('Change rejected', fcName, NOW(), c)] } : x)));
        logAction('Return', 'Financial Policies', p.id, `Change rejected · ${c}`);
        say('Change rejected');
      } else if (kind === 'review') {
        const nx = p.next_review.replace(/\d{4}$/, (y) => String(+y + 1));
        setPol((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Active', next_review: nx, trail: [...x.trail, T('Reviewed — no change', fcName, NOW())] } : x)));
        logAction('Review', 'Financial Policies', p.id, `Reviewed · next ${nx}`);
        say(`${p.name} reviewed · next review ${nx}`);
      }
    } else if (sc === 'locks') {
      if (id === 'P-SEP') {
        if (kind === 'lock') {
          if (sepStatus !== 'Close Approved') {
            setErr('Approve the September close first in Month-End Close.');
            return;
          }
          setSepStatus('Locked');
          logAction('Lock', 'Period Locks', 'September 2026', 'Period locked');
          say('September 2026 locked — no further posting');
        } else if (kind === 'reopen') {
          if (sepStatus !== 'Locked') return;
          if (!ack) {
            setErr('Tick the acknowledgement to reopen a locked period.');
            return;
          }
          setSepStatus('Open');
          setCloseState('Open');
          logAction('Reopen', 'Period Locks', 'September 2026', c);
          say('September 2026 reopened — CFO notified');
        }
      } else {
        const p = per.find((x) => x.id === id);
        if (!p) return;
        if (kind === 'approveReopen') {
          setPer((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Reopened', trail: [...(x.trail || []), T('Reopen approved', fcName, NOW(), c)] } : x)));
          logAction('Reopen', 'Period Locks', p.label, `Reopen approved · ${c}`);
          say(`${p.label} reopened for posting — CFO notified`);
        } else if (kind === 'rejectReopen') {
          setPer((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Locked', req: null, trail: [...(x.trail || []), T('Reopen rejected', fcName, NOW(), c)] } : x)));
          logAction('Return', 'Period Locks', p.label, `Reopen rejected · ${c}`);
          say('Reopen rejected — post in the current period');
        } else if (kind === 'reopen') {
          if (!ack) {
            setErr('Tick the acknowledgement to reopen a locked period.');
            return;
          }
          setPer((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Reopened', trail: [...(x.trail || []), T('Period reopened', fcName, NOW(), c)] } : x)));
          logAction('Reopen', 'Period Locks', p.label, c);
          say(`${p.label} reopened — CFO notified`);
        } else if (kind === 'lock') {
          setPer((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Locked', req: null, trail: [...(x.trail || []), T('Period re-locked', fcName, NOW())] } : x)));
          logAction('Lock', 'Period Locks', p.label, 'Re-locked');
          say(`${p.label} re-locked`);
        }
      }
    }

    setCmt('');
    setErr('');
    setSelVal('');
    setAck(false);
  };

  const handleApproveMonthEndClose = () => {
    if (sepStatus !== 'Open') {
      say(`September close is already ${sepStatus.toLowerCase()}.`);
      return;
    }
    const incomplete = calc.chk.filter((k) => k.pct < 100);
    if (incomplete.length) {
      setErr(`Cannot approve — ${incomplete.length} checklist items are below 100%: ${incomplete.map((k) => k.t).join(', ')}.`);
      return;
    }
    setSepStatus('Close Approved');
    setCloseState('Approved');
    setErr('');
    logAction('Approval', 'Month-End Close', 'September 2026', 'Close approved');
    say('September close approved — lock the period in Period Locks');
  };

  const handleDelayMonthEndClose = () => {
    const c = cmt.trim();
    if (!delayTo) {
      setErr('Choose the new close date.');
      return;
    }
    if (c.length < 5) {
      setErr('Add the reason for the delay.');
      return;
    }
    setCloseTarget(delayTo);
    setCloseState('Delayed');
    setDelayTo('');
    setCmt('');
    setErr('');
    logAction('Hold', 'Month-End Close', 'September 2026', `Close moved to ${delayTo} · ${c}`);
    say(`Close moved to ${delayTo} — CFO notified`);
  };

  const handleEscalateMonthEndClose = () => {
    const c = cmt.trim();
    if (c.length < 5) {
      setErr('Describe the issue to escalate.');
      return;
    }
    setCmt('');
    setErr('');
    logAction('Escalation', 'Month-End Close', 'September 2026', c);
    say('Close issue escalated to the CFO');
  };

  const handleAssignChecklistItem = (id: string) => {
    const o = chkOwner[id];
    if (!o) {
      say('Choose an owner first.');
      return;
    }
    setOwners((prev) => ({ ...prev, [id]: o }));
    setChkOwner((prev) => ({ ...prev, [id]: '' }));
    logAction('Assignment', 'Month-End Close', id, `Owner → ${o}`);
    say(`Owner set to ${o}`);
  };

  const handleQuarterItemReview = (id: string) => {
    const it = qi.find((x) => x.id === id);
    if (!it) return;
    if (it.need) {
      const e = exc.find((x) => x.id === it.need);
      if (e && !DONE_EX.includes(e.status)) {
        say(`Close ${it.need} (inventory count) before reviewing this provision.`);
        return;
      }
    }
    if (it.need_st && calc.stAppCount < 3) {
      say('Approve all three September statements first.');
      return;
    }
    setQi((prev) => prev.map((x) => (x.id === id ? { ...x, st: 'Reviewed' } : x)));
    logAction('Review', 'Quarter-End Close', it.t, 'Reviewed');
    say(`${it.t} reviewed`);
  };

  const handleApproveQuarter = () => {
    if (qState !== 'Open') {
      say(`Quarter already ${qState.toLowerCase()}.`);
      return;
    }
    const aug = per.find((p) => p.id === 'P-AUG');
    if (sepStatus !== 'Locked') {
      say('Lock September 2026 before approving the quarter.');
      return;
    }
    if (aug && aug.status !== 'Locked') {
      say(`August 2026 is ${aug.status.toLowerCase()} — re-lock it first.`);
      return;
    }
    const openItems = qi.filter((x) => x.st !== 'Done' && x.st !== 'Reviewed');
    if (openItems.length) {
      say(`${openItems.length} quarter items still need review.`);
      return;
    }
    setQState('Approved');
    logAction('Approval', 'Quarter-End Close', 'Q2 FY 2026-27', 'Quarter approved');
    say('Q2 approved — lock it to finish');
  };

  const handleLockQuarter = () => {
    if (qState !== 'Approved') {
      say(qState === 'Locked' ? 'Quarter already locked.' : 'Approve the quarter first.');
      return;
    }
    setQState('Locked');
    logAction('Lock', 'Quarter-End Close', 'Q2 FY 2026-27', 'Quarter locked');
    say('Q2 FY 2026-27 locked');
  };

  const handleYearEndAction = (id: string) => {
    const y = yi.find((x) => x.id === id);
    if (!y) return;
    const st: YearEndItem['st'] = y.kind === 'obs' ? 'Remediated' : 'Approved';
    setYi((prev) => prev.map((x) => (x.id === id ? { ...x, st } : x)));
    logAction(y.kind === 'obs' ? 'Close' : 'Approval', 'Year-End Close', y.t.split(':')[0], st);
    say(`${y.t.split(' – ')[0]} — ${st.toLowerCase()}`);
  };

  const handleStatementFlagVariance = () => {
    const v = stView;
    const row = stSel ? STM[v].rows.find((r) => r[0] === 'l' && r[1] === stSel) : null;
    if (!row || row[0] !== 'l') {
      setErr('Select a statement line first.');
      return;
    }
    const existingFlag = stFlags[row[1]] && exc.find((e) => e.id === stFlags[row[1]]);
    if (existingFlag && !DONE_EX.includes(existingFlag.status)) {
      setErr(`This line already has an open flag (${existingFlag.id}).`);
      return;
    }
    const c = cmt.trim();
    if (c.length < 5) {
      setErr('Write the variance query (at least 5 characters).');
      return;
    }
    const nid = `EX-${exSeq}`;
    const newExc: ExcItem = {
      id: nid,
      type: 'Statement Variance',
      sev: 'High',
      ref: `${STM[v].name} · ${row[2]}`,
      title: c,
      dept: 'Finance',
      amt: Math.abs(row[3] - row[4]) * 1e7,
      owner: 'Kavita Shah',
      status: 'Open',
      raised: '07 Oct',
      link: `${STM[v].name} line`,
      trail: [T('Variance flagged', fcName, NOW(), c)]
    };
    setExc((prev) => [newExc, ...prev]);
    setExSeq((prev) => prev + 1);
    setStFlags((prev) => ({ ...prev, [row[1]]: nid }));
    setCmt('');
    setErr('');
    setStApp((prev) => ({ ...prev, [v]: false }));
    logAction('Flag', 'Financial Statements', row[2], `${nid} · ${c}`);
    say(`${row[2]} flagged — ${nid} sent to Kavita Shah`);
  };

  const handleApproveStatement = () => {
    const v = stView;
    if (stApp[v]) {
      say(`${STM[v].name} is already approved.`);
      return;
    }
    const openFlags = calc.stFlagOpen.filter((k) => k.startsWith(v + ':'));
    if (openFlags.length) {
      setErr(`${openFlags.length} flagged variance(s) still open — close the linked exception first.`);
      return;
    }
    if (v !== 'pl' && calc.bankOK < 5) {
      setErr(`Bank reconciliations must all be approved first (${calc.bankOK} of 5).`);
      return;
    }
    const bigUnflagged = STM[v].rows.filter((r) => r[0] === 'l' && Math.abs((r[3] - r[4]) / Math.abs(r[4] || 1)) > 0.1 && !stFlags[r[1]]);
    if (bigUnflagged.length && !ack) {
      setErr(`Tick the acknowledgement that you reviewed ${bigUnflagged.length} unflagged variance(s) above 10%.`);
      return;
    }
    setStApp((prev) => ({ ...prev, [v]: true }));
    setErr('');
    setAck(false);
    logAction('Approval', 'Financial Statements', STM[v].name, 'Statement approved');
    say(`${STM[v].name} approved`);
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#111827', background: '#F9FAFB' }}>
      {/* 260px FIXED SIDEBAR */}
      <aside style={{ width: '260px', flexShrink: 0, background: '#FFFFFF', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#2563EB', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>N</div>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>NorthHospital</div>
        </div>

        {/* ROLE PROFILE & CLOSING PERIOD CARD */}
        <div style={{ margin: '0 16px 8px', padding: '14px', border: '1px solid #E5E7EB', borderRadius: '12px', background: '#F9FAFB', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>Finance Controller</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>FC-01 · Integrity &amp; compliance</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Closing Period</span>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Sep 2026</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Status</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '22px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', background: sideStatus.bg, color: sideStatus.fg }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '3px', background: sideStatus.fg }}></span>
                {sideStatus.label}
              </span>
            </div>
          </div>
        </div>

        {/* NAVIGATION ITEMS */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV_GROUPS.map(([groupLabel, items]) => (
            <React.Fragment key={groupLabel || 'top'}>
              {groupLabel && <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, padding: '14px 10px 6px' }}>{groupLabel}</div>}
              {items.map(([key, label]) => {
                const isActive = screen === key;
                let badgeVal = 0;
                let badgeDanger = false;
                if (key === 'highrisk') badgeVal = calc.hrP.length;
                if (key === 'payments') badgeVal = calc.batchAw.length;
                if (key === 'exceptions') {
                  badgeVal = calc.blockEx.length;
                  badgeDanger = true;
                }
                if (key === 'controls') {
                  badgeVal = ctrl.filter((v) => v.severity === 'Critical' && v.status !== 'Closed').length;
                  badgeDanger = true;
                }
                if (key === 'locks') {
                  badgeVal = per.filter((p) => p.status === 'Reopen Requested').length;
                  badgeDanger = true;
                }
                if (key === 'policies') badgeVal = pol.filter((p) => p.status !== 'Active').length;
                if (key === 'monthend') {
                  badgeVal = calc.chk.filter((k) => k.st === 'At Risk').length;
                  badgeDanger = true;
                }
                if (key === 'gst') badgeVal = calc.gstRisk.length;

                return (
                  <button
                    key={key}
                    onClick={() => {
                      setScreen(key);
                      setCmt('');
                      setErr('');
                      setSelVal('');
                      setAck(false);
                      try {
                        localStorage.setItem('fcScreen', key);
                      } catch {}
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      height: '40px',
                      flexShrink: 0,
                      padding: '0 10px',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      fontSize: '14px',
                      background: isActive ? '#EFF6FF' : 'transparent',
                      color: isActive ? '#2563EB' : '#374151',
                      fontWeight: isActive ? 600 : 500
                    }}
                  >
                    <span style={{ width: '18px', height: '18px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85 }}>{ICONS[key]}</span>
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                    {badgeVal > 0 && (
                      <span
                        style={{
                          minWidth: '22px',
                          height: '20px',
                          padding: '0 6px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: badgeDanger ? '#FEF2F2' : '#EFF6FF',
                          color: badgeDanger ? '#B91C1C' : '#1D4ED8'
                        }}
                      >
                        {badgeVal}
                      </span>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        {/* CONTROLLER USER FOOTER WITH LOGOUT */}
        <AccountsSidebarUserFooter customName={fcName} customRole="Finance Controller · FC-01" customInitials={fcIni} />
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <AccountsStickyAppBar
          activeRoleView={activeRoleView}
          onSelectRole={onSelectRole}
          workload={workload}
          breadcrumbScreen={SCREENS[screen]?.[1] || 'Controller Operational Workspace'}
          currentTime={currentTime}
          onOpenMaster={onOpenMaster}
        />
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          {/* HEADER */}
          <header style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '780px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Finance Controller · {SCREENS[screen]?.[0]}</div>
              <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{SCREENS[screen]?.[1]}</h1>
              <p style={{ margin: 0, color: '#6B7280', fontSize: '14px', lineHeight: 1.5 }}>{SCREENS[screen]?.[2]}</p>
            </div>
          </header>

          {/* DASHBOARD SCREEN */}
          {screen === 'dashboard' && (
            <>
              {/* TOP 8 KPIS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div onClick={() => setScreen('monthend')} style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0FDF4', color: '#16A34A' }}><CalendarCheck size={18} /></span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#15803D' }}>Sep close · target {closeTarget}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{calc.ready}%</div>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>Close Readiness</div>
                  </div>
                </div>

                <div onClick={() => setScreen('bank')} style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: calc.bankOK === 5 ? '#F0FDF4' : '#FEF2F2', color: calc.bankOK === 5 ? '#16A34A' : '#DC2626' }}><Landmark size={18} /></span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: calc.bankOK === 5 ? '#15803D' : '#B91C1C' }}>{calc.unexpl.length ? `${cr(calc.unexpl.reduce((a, b) => a + Math.abs(b.difference), 0))} unexplained` : 'All differences explained'}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{calc.bankOK} / 5</div>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>Reconciliations Complete</div>
                  </div>
                </div>

                <div onClick={() => setScreen('exceptions')} style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: calc.blockEx.length ? '#FEF2F2' : '#F0FDF4', color: calc.blockEx.length ? '#DC2626' : '#16A34A' }}><TriangleAlert size={18} /></span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: calc.blockEx.length ? '#B91C1C' : '#15803D' }}>{calc.blockEx.length} critical / high block close</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{calc.openEx.length}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>Unresolved Exceptions</div>
                  </div>
                </div>

                <div onClick={() => setScreen('gst')} style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFBEB', color: '#D97706' }}><ShieldAlert size={18} /></span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#B45309' }}>{calc.gstRisk.length} GST returns · {ctrl.filter((v) => v.severity === 'Critical').length} critical controls</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{calc.gstRisk.length + ctrl.filter((v) => v.severity === 'Critical').length}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>Compliance Risks</div>
                  </div>
                </div>
              </div>

              {/* SECOND ROW KPIS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '-8px' }}>
                <div onClick={() => setScreen('payments')} style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EFF6FF', color: '#2563EB' }}><Send size={18} /></span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#1D4ED8' }}>{calc.batchOK.length} of {calc.batchAw.length} batches pass all checks</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{cr(calc.batchAw.reduce((a, b) => a + b.amount, 0))}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>Payments Awaiting Release</div>
                  </div>
                </div>

                <div onClick={() => setScreen('controls')} style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: calc.ctlOpen.length ? '#FEF2F2' : '#F0FDF4', color: calc.ctlOpen.length ? '#DC2626' : '#16A34A' }}><ShieldX size={18} /></span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: calc.ctlOpen.length ? '#B91C1C' : '#15803D' }}>42 controls tested · {42 - calc.ctlOpen.length} passed</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{calc.ctlOpen.length}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>Control Violations</div>
                  </div>
                </div>

                <div onClick={() => setScreen('auditready')} style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0FDF4', color: '#16A34A' }}><ClipboardCheck size={18} /></span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#15803D' }}>Limited review starts 20 Oct</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{calc.audPct}%</div>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>Audit Readiness</div>
                  </div>
                </div>

                <div onClick={() => setScreen('statements')} style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F9FF', color: '#0284C7' }}><FileSpreadsheet size={18} /></span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#0369A1' }}>{calc.stFlagOpen.length} variance flags open</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{calc.stAppCount} / 3</div>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>Statements Validated</div>
                  </div>
                </div>
              </div>

              {/* INTEGRITY CHECKS 9-BOX GRID */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>Integrity Check · September 2026</span>
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>What must be true before results go to the CFO</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                  <button onClick={() => setScreen('monthend')} style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', padding: '14px', borderRadius: '10px', border: '1px solid #E5E7EB', background: '#FFFFFF', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Can we close this month?</span>
                      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: calc.ready >= 100 ? '#F0FDF4' : '#FEF2F2', color: calc.ready >= 100 ? '#15803D' : '#B91C1C' }}>{calc.ready >= 100 ? 'Yes' : 'Not yet'}</span>
                    </div>
                    <span style={{ fontSize: '13px', color: '#4B5563', lineHeight: 1.45 }}>{calc.ready >= 100 ? 'Every checklist item is at 100% — approve the close.' : `${calc.chk.filter((k) => k.pct < 100).length} of 9 checklist items incomplete`}</span>
                  </button>

                  <button onClick={() => setScreen('bank')} style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', padding: '14px', borderRadius: '10px', border: '1px solid #E5E7EB', background: '#FFFFFF', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Are all reconciliations complete?</span>
                      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: calc.bankOK === 5 ? '#F0FDF4' : '#FEF2F2', color: calc.bankOK === 5 ? '#15803D' : '#B91C1C' }}>{calc.bankOK === 5 ? 'Yes' : 'No'}</span>
                    </div>
                    <span style={{ fontSize: '13px', color: '#4B5563', lineHeight: 1.45 }}>{5 - calc.bankOK} of 5 accounts not approved</span>
                  </button>

                  <button onClick={() => setScreen('statements')} style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', padding: '14px', borderRadius: '10px', border: '1px solid #E5E7EB', background: '#FFFFFF', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Are financial statements accurate?</span>
                      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: calc.stFlagOpen.length ? '#FFFBEB' : '#F0FDF4', color: calc.stFlagOpen.length ? '#B45309' : '#15803D' }}>{calc.stFlagOpen.length ? 'Flagged' : 'Validated'}</span>
                    </div>
                    <span style={{ fontSize: '13px', color: '#4B5563', lineHeight: 1.45 }}>All tie-outs pass · {calc.stAppCount} of 3 approved</span>
                  </button>
                </div>
              </div>

              {/* CLOSING STATUS MINI CHECKLIST & RISKS */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', flex: '999 1 560px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>Closing Status</span>
                    <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: sideStatus.bg, color: sideStatus.fg }}>{sideStatus.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '36px', fontWeight: 700 }}>{calc.ready}%</span>
                    <span style={{ flex: 1, height: '10px', borderRadius: '5px', background: '#F3F4F6', overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '10px', width: `${calc.ready}%`, background: calc.ready >= 100 ? '#16A34A' : '#2563EB' }}></span>
                    </span>
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>Target {closeTarget}</span>
                  </div>
                  {calc.chk.map((k) => (
                    <button key={k.id} onClick={() => k.go && setScreen(k.go)} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 140px 100px', gap: '12px', alignItems: 'center', padding: '10px 0', border: 'none', borderTop: '1px solid #F3F4F6', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{k.t}</span>
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>{k.d} · {k.owner}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#F3F4F6', overflow: 'hidden' }}>
                          <div style={{ height: '6px', width: `${k.pct}%`, background: k.st === 'Done' ? '#16A34A' : '#2563EB' }}></div>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, width: '36px', textAlign: 'right' }}>{k.pct}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: chip(k.st).bg, color: chip(k.st).fg }}>{k.st}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* CRITICAL FINANCIAL RISKS */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', flex: '1 1 340px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>Critical Financial Risks</span>
                  {calc.unexpl.length > 0 && (
                    <button onClick={() => setScreen('exceptions')} style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'left', padding: '12px 14px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#991B1B' }}>Critical</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#991B1B' }}>Unexplained bank difference ₹ 3.42 L</span>
                      <span style={{ fontSize: '13px', color: '#374151' }}>HDFC ••4417 · blocks reconciliation, Balance Sheet and Cash Flow</span>
                    </button>
                  )}
                  {ctrl.filter((v) => v.severity === 'Critical').map((v) => (
                    <button key={v.id} onClick={() => setScreen('controls')} style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'left', padding: '12px 14px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA', cursor: 'pointer' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#991B1B' }}>Critical · {v.control_name}</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#991B1B' }}>{v.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* MONTH-END CLOSE SCREEN */}
          {screen === 'monthend' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', flex: '999 1 620px', minWidth: 0, overflowX: 'auto' }}>
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>Close Checklist · September 2026</span>
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>Progress updates as underlying items clear</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,1fr) 150px 100px 200px 80px', gap: '12px', padding: '0 20px', height: '44px', minWidth: '840px', alignItems: 'center', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>
                  <span>Checklist Item</span><span>Progress</span><span>Status</span><span>Owner</span><span></span>
                </div>
                {calc.chk.map((k) => (
                  <div key={k.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,1fr) 150px 100px 200px 80px', gap: '12px', padding: '10px 20px', minHeight: '68px', minWidth: '840px', alignItems: 'center', borderBottom: '1px solid #F3F4F6', fontSize: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{k.t}</span>
                      <span style={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.4 }}>{k.d}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: '#F3F4F6', overflow: 'hidden' }}>
                        <div style={{ height: '8px', width: `${k.pct}%`, background: k.st === 'Done' ? '#16A34A' : '#2563EB' }}></div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, width: '36px', textAlign: 'right' }}>{k.pct}%</span>
                    </div>
                    <div>
                      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: chip(k.st).bg, color: chip(k.st).fg }}>{k.st}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{k.owner}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select value={chkOwner[k.id] || ''} onChange={(e) => setChkOwner({ ...chkOwner, [k.id]: e.target.value })} style={{ flex: 1, height: '32px', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0 6px', fontSize: '12px', background: '#FFF' }}>
                          <option value="">Reassign…</option>
                          {OWNERS.concat([fcName]).filter((o) => o !== k.owner).map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                        <button onClick={() => handleAssignChecklistItem(k.id)} style={{ height: '32px', padding: '0 10px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFF', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>Assign</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => k.go && setScreen(k.go)} style={{ height: '32px', padding: '0 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', background: '#FFF', border: `1px solid ${k.pct >= 100 ? '#BBF7D0' : '#E5E7EB'}`, color: k.pct >= 100 ? '#15803D' : '#111827' }}>
                        {k.pct >= 100 ? 'Done' : 'Open'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* CLOSE READINESS DECISION CARD */}
              <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '24px' }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>Close Readiness</span>
                    <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: sideStatus.bg, color: sideStatus.fg }}>{sideStatus.label}</span>
                  </div>
                  <span style={{ fontSize: '48px', fontWeight: 700, color: calc.ready >= 100 ? '#16A34A' : '#2563EB', lineHeight: 1 }}>{calc.ready}%</span>
                  <div style={{ height: '10px', borderRadius: '5px', background: '#F3F4F6', overflow: 'hidden' }}>
                    <div style={{ height: '10px', width: `${calc.ready}%`, background: calc.ready >= 100 ? '#16A34A' : '#2563EB' }}></div>
                  </div>
                  <span style={{ fontSize: '13px', color: '#374151' }}>Target close <strong>{closeTarget}</strong> · lock the period after approval</span>

                  {calc.chk.filter((k) => k.pct < 100).length > 0 && sepStatus === 'Open' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', borderRadius: '10px', background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#92400E' }}>Blocking approval</span>
                      {calc.chk.filter((k) => k.pct < 100).map((b) => (
                        <span key={b.id} style={{ fontSize: '13px', color: '#92400E' }}>• {b.t} · {b.pct}%</span>
                      ))}
                    </div>
                  )}

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>If delaying, new close date</span>
                    <select value={delayTo} onChange={(e) => setDelayTo(e.target.value)} style={{ height: '40px', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '0 10px', fontSize: '14px', background: '#FFF' }}>
                      <option value="">Select date</option>
                      <option value="12 Oct">12 Oct</option>
                      <option value="14 Oct">14 Oct</option>
                      <option value="17 Oct">17 Oct</option>
                    </select>
                  </label>
                  <textarea value={cmt} onChange={(e) => { setCmt(e.target.value); setErr(''); }} placeholder="Reason — required to delay or escalate" style={{ minHeight: '72px', width: '100%', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', resize: 'vertical' }} />

                  {err && <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '13px', color: '#991B1B' }}>{err}</div>}

                  <button onClick={handleApproveMonthEndClose} style={{ height: '40px', borderRadius: '10px', border: 'none', color: '#FFF', fontSize: '14px', fontWeight: 500, cursor: 'pointer', background: calc.ready >= 100 && sepStatus === 'Open' ? '#2563EB' : '#9CA3AF' }}>
                    {sepStatus === 'Open' ? 'Approve Close' : `Close ${sepStatus === 'Locked' ? 'Approved & Locked' : 'Approved'}`}
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button onClick={handleDelayMonthEndClose} style={{ height: '40px', borderRadius: '10px', border: '1px solid #E5E7EB', background: '#FFF', color: '#111827', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Delay Close</button>
                    <button onClick={handleEscalateMonthEndClose} style={{ height: '40px', borderRadius: '10px', border: '1px solid #FDE68A', background: '#FFF', color: '#B45309', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Escalate To CFO</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* QUARTER-END CLOSE SCREEN */}
          {screen === 'quarterend' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>Quarter Checklist · Q2 FY 2026-27</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleApproveQuarter} style={{ height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', background: qState === 'Open' ? '#2563EB' : '#FFF', color: qState === 'Open' ? '#FFF' : '#6B7280', border: '1px solid #2563EB' }}>Approve Quarter</button>
                  <button onClick={handleLockQuarter} style={{ height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', background: qState === 'Approved' ? '#2563EB' : '#FFF', color: qState === 'Approved' ? '#FFF' : '#6B7280', border: '1px solid #E5E7EB' }}>Lock Quarter</button>
                </div>
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflowX: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1fr) 170px 120px 150px', gap: '12px', padding: '0 20px', height: '44px', minWidth: '740px', alignItems: 'center', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>
                  <span>Item</span><span>Owner</span><span>Status</span><span></span>
                </div>
                {qi.map((x) => (
                  <div key={x.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1fr) 170px 120px 150px', gap: '12px', padding: '10px 20px', minHeight: '60px', minWidth: '740px', alignItems: 'center', borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{x.t}</span>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>{x.d}</span>
                    </div>
                    <span style={{ fontSize: '13px' }}>{x.owner}</span>
                    <div>
                      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: chip(x.st).bg, color: chip(x.st).fg }}>{x.st}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {(x.st === 'For Review' || x.st === 'Blocked') && (
                        <button onClick={() => handleQuarterItemReview(x.id)} style={{ height: '32px', padding: '0 12px', borderRadius: '8px', border: '1px solid #2563EB', background: '#2563EB', color: '#FFF', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                          Review
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* YEAR-END CLOSE SCREEN */}
          {screen === 'yearend' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '16px', fontWeight: 600 }}>Year-End Readiness · FY 2026-27</span>
                <button onClick={() => { setYShared(true); say('Year-end readiness shared with CFO'); }} style={{ height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', background: yShared ? '#FFF' : '#2563EB', color: yShared ? '#15803D' : '#FFF', border: `1px solid ${yShared ? '#BBF7D0' : '#2563EB'}` }}>
                  {yShared ? 'Shared With CFO' : 'Share Readiness With CFO'}
                </button>
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflowX: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1fr) 170px 120px 150px', gap: '12px', padding: '0 20px', height: '44px', minWidth: '740px', alignItems: 'center', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>
                  <span>Item</span><span>Owner</span><span>Status</span><span></span>
                </div>
                {yi.map((y) => (
                  <div key={y.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1fr) 170px 120px 150px', gap: '12px', padding: '10px 20px', minHeight: '60px', minWidth: '740px', alignItems: 'center', borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{y.t}</span>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>{y.d}</span>
                    </div>
                    <span style={{ fontSize: '13px' }}>{y.owner}</span>
                    <div>
                      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: chip(y.st).bg, color: chip(y.st).fg }}>{y.st}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {(y.st === 'Open' || y.st === 'For Review') && (
                        <button onClick={() => handleYearEndAction(y.id)} style={{ height: '32px', padding: '0 12px', borderRadius: '8px', border: '1px solid #2563EB', background: '#2563EB', color: '#FFF', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                          {y.kind === 'obs' ? 'Mark Remediated' : 'Approve'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FINANCIAL STATEMENTS SCREEN */}
          {screen === 'statements' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', flex: '999 1 600px', minWidth: 0, overflowX: 'auto' }}>
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['pl', 'bs', 'cf'] as const).map((viewKey) => (
                      <button key={viewKey} onClick={() => { setStView(viewKey); setStSel(''); setErr(''); }} style={{ height: '32px', padding: '0 12px', borderRadius: '8px', border: 'none', background: stView === viewKey ? '#2563EB' : '#F3F4F6', color: stView === viewKey ? '#FFF' : '#374151', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                        {viewKey === 'pl' ? 'Profit & Loss' : viewKey === 'bs' ? 'Balance Sheet' : 'Cash Flow'}
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>₹ Cr · click a line to query it</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px,1fr) 90px 90px 80px 130px', gap: '12px', padding: '0 20px', height: '44px', minWidth: '660px', alignItems: 'center', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>
                  <span>Line</span><span style={{ textAlign: 'right' }}>Sep 2026</span><span style={{ textAlign: 'right' }}>Aug 2026</span><span style={{ textAlign: 'right' }}>Change</span><span>Review</span>
                </div>

                {STM[stView].rows.map(([type, key, label, curVal, prevVal], idx) => {
                  if (type === 'h') {
                    return (
                      <div key={idx} style={{ padding: '0 20px', height: '36px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>
                        {label}
                      </div>
                    );
                  }
                  const variancePct = ((curVal - prevVal) / Math.abs(prevVal || 1)) * 100;
                  const isBig = Math.abs(variancePct) > 10;
                  const hasFlag = stFlags[key] && exc.find((e) => e.id === stFlags[key]);
                  const isSelected = stSel === key;

                  return (
                    <div
                      key={key || idx}
                      onClick={() => type === 'l' && setStSel(key)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(200px,1fr) 90px 90px 80px 130px',
                        gap: '12px',
                        padding: '0 20px',
                        minHeight: '48px',
                        minWidth: '660px',
                        alignItems: 'center',
                        fontSize: '14px',
                        cursor: type === 'l' ? 'pointer' : 'default',
                        background: isSelected ? '#EFF6FF' : isBig && type === 'l' ? '#FFFBEB' : '#FFFFFF',
                        borderBottom: '1px solid #F3F4F6',
                        fontWeight: type === 't' ? 700 : 400
                      }}
                    >
                      <span style={{ paddingLeft: type === 'l' ? '14px' : '0', color: '#111827' }}>{label}</span>
                      <span style={{ textAlign: 'right' }}>{f2(curVal)}</span>
                      <span style={{ textAlign: 'right', color: '#6B7280' }}>{f2(prevVal)}</span>
                      <span style={{ textAlign: 'right', fontSize: '13px', fontWeight: 600, color: isBig ? '#B45309' : '#6B7280' }}>
                        {(variancePct > 0 ? '+' : '') + variancePct.toFixed(1) + '%'}
                      </span>
                      <div>
                        {hasFlag ? (
                          <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: '#FFFBEB', color: '#B45309' }}>Flagged</span>
                        ) : isBig && type === 'l' ? (
                          <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: '#F3F4F6', color: '#374151' }}>Review</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* STATEMENT DETAILS & TIE-OUTS */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', flex: '1 1 340px', minWidth: 0, padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', position: 'sticky', top: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>{STM[stView].name}</span>
                  <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: stApp[stView] ? '#F0FDF4' : '#FFFBEB', color: stApp[stView] ? '#15803D' : '#B45309' }}>
                    {stApp[stView] ? 'Approved' : 'Under Review'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Tie-Out Checks</span>
                  {TIE[stView].map(([checkTitle], i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, background: '#DCFCE7', color: '#15803D' }}>✓</span>
                      <span style={{ fontSize: '13px', lineHeight: 1.45 }}>{checkTitle}</span>
                    </div>
                  ))}
                  {stView !== 'pl' && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, background: calc.bankOK === 5 ? '#DCFCE7' : '#FEE2E2', color: calc.bankOK === 5 ? '#15803D' : '#B91C1C' }}>{calc.bankOK === 5 ? '✓' : '!'}</span>
                      <span style={{ fontSize: '13px', lineHeight: 1.45 }}>Bank reconciliations approved ({calc.bankOK} of 5)</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>Selected line</span>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{stSel || 'Click a line above'}</span>
                </div>

                <textarea value={cmt} onChange={(e) => { setCmt(e.target.value); setErr(''); }} placeholder="Variance query — required to flag a line" style={{ minHeight: '64px', width: '100%', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', resize: 'vertical' }} />

                <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 12px', borderRadius: '10px', border: '1px solid #FDE68A', background: '#FFFBEB', cursor: 'pointer' }}>
                  <input type="checkbox" checked={ack} onChange={(e) => { setAck(e.target.checked); setErr(''); }} style={{ marginTop: '2px', accentColor: '#2563EB' }} />
                  <span style={{ fontSize: '13px', color: '#92400E', lineHeight: 1.45 }}>I have reviewed unflagged variances above 10% on this statement</span>
                </label>

                {err && <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '13px', color: '#991B1B' }}>{err}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button onClick={handleStatementFlagVariance} style={{ height: '40px', borderRadius: '10px', border: '1px solid #FDE68A', background: '#FFF', color: '#B45309', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Flag Variance</button>
                  <button onClick={handleApproveStatement} style={{ height: '40px', borderRadius: '10px', border: 'none', background: stApp[stView] ? '#FFF' : '#2563EB', color: stApp[stView] ? '#15803D' : '#FFF', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                    {stApp[stView] ? 'Approved' : 'Approve Statement'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* QUEUE-BASED SCREENS: payments, bank, highrisk, exceptions, gst, auditready, controls, policies, locks */}
          {['payments', 'bank', 'highrisk', 'exceptions', 'gst', 'auditready', 'controls', 'policies', 'locks'].includes(screen) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', flex: '999 1 600px', minWidth: 0, overflowX: 'auto' }}>
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>Active Queue</span>
                  <input
                    value={searchQuery[screen] || ''}
                    onChange={(e) => setSearchQuery({ ...searchQuery, [screen]: e.target.value })}
                    placeholder="Search items..."
                    style={{ height: '36px', width: '220px', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0 10px', fontSize: '13px' }}
                  />
                </div>

                {/* TABLE ROWS PER SCREEN */}
                {screen === 'payments' && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {batches.map((b) => (
                      <div key={b.id} onClick={() => setSel({ ...sel, payments: b.id })} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', background: sel.payments === b.id ? '#EFF6FF' : '#FFF' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{b.name}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{b.id} · {b.type} · {b.count} payments</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700 }}>{fmt(b.amount)}</div>
                          <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', background: chip(b.status).bg, color: chip(b.status).fg }}>{b.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {screen === 'bank' && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {banks.map((b) => (
                      <div key={b.id} onClick={() => setSel({ ...sel, bank: b.id })} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', background: sel.bank === b.id ? '#EFF6FF' : '#FFF' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{b.bank} {b.account_no}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{b.purpose} · By {b.prepared_by}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700 }}>{fmt(b.book_balance)}</div>
                          <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', background: b.frozen ? '#FEF2F2' : chip(b.status).bg, color: b.frozen ? '#B91C1C' : chip(b.status).fg }}>{b.frozen ? 'Frozen' : b.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {screen === 'highrisk' && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {hr.map((h) => (
                      <div key={h.id} onClick={() => setSel({ ...sel, highrisk: h.id })} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', background: sel.highrisk === h.id ? '#EFF6FF' : '#FFF' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{h.title}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{h.reference_no} · {h.kind} · {h.department}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700 }}>{fmt(h.amount)}</div>
                          <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', background: chip(h.status).bg, color: chip(h.status).fg }}>{h.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {screen === 'exceptions' && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {exc.map((e) => (
                      <div key={e.id} onClick={() => setSel({ ...sel, exceptions: e.id })} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', background: sel.exceptions === e.id ? '#EFF6FF' : '#FFF' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{e.id} · {e.title}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{e.ref} · {e.dept} · Owner: {e.owner || 'Unassigned'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700 }}>{fmt(e.amt)}</div>
                          <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', background: chip(e.status).bg, color: chip(e.status).fg }}>{e.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {screen === 'gst' && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {gst.map((g) => (
                      <div key={g.id} onClick={() => setSel({ ...sel, gst: g.id })} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', background: sel.gst === g.id ? '#EFF6FF' : '#FFF' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{g.form} — {g.period}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>Due: {g.due} · By {g.prepared_by}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700 }}>{fmt(g.tax)}</div>
                          <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', background: chip(g.status).bg, color: chip(g.status).fg }}>{g.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {screen === 'controls' && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {ctrl.map((v) => (
                      <div key={v.id} onClick={() => setSel({ ...sel, controls: v.id })} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', background: sel.controls === v.id ? '#EFF6FF' : '#FFF' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{v.id} · {v.control_name}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{v.title}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', background: chip(v.status).bg, color: chip(v.status).fg }}>{v.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {screen === 'policies' && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {pol.map((p) => (
                      <div key={p.id} onClick={() => setSel({ ...sel, policies: p.id })} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', background: sel.policies === p.id ? '#EFF6FF' : '#FFF' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.id} · {p.name} (v{p.version})</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>Owner: {p.owner} · Review: {p.next_review}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', background: chip(p.status).bg, color: chip(p.status).fg }}>{p.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {screen === 'auditready' && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {pbc.map((p) => (
                      <div key={p.id} onClick={() => setSel({ ...sel, auditready: p.id })} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', background: sel.auditready === p.id ? '#EFF6FF' : '#FFF' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.id} · {p.title}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>Owner: {p.owner} · Due: {p.due}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', background: chip(p.status).bg, color: chip(p.status).fg }}>{p.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {screen === 'locks' && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div onClick={() => setSel({ ...sel, locks: 'P-SEP' })} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', background: sel.locks === 'P-SEP' ? '#EFF6FF' : '#FFF' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>September 2026</div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>Current Close Period</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', background: chip(sepStatus).bg, color: chip(sepStatus).fg }}>{sepStatus}</span>
                      </div>
                    </div>
                    {per.map((p) => (
                      <div key={p.id} onClick={() => setSel({ ...sel, locks: p.id })} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', background: sel.locks === p.id ? '#EFF6FF' : '#FFF' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.label}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>Locked on: {p.locked}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', background: chip(p.status).bg, color: chip(p.status).fg }}>{p.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ACTION / DECISION DRAWER */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', flex: '1 1 360px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', position: 'sticky', top: '24px' }}>
                <span style={{ fontSize: '16px', fontWeight: 600 }}>Controller Action Drawer</span>
                <textarea
                  value={cmt}
                  onChange={(e) => { setCmt(e.target.value); setErr(''); }}
                  placeholder="Decision comment / reason (min 5 characters)..."
                  style={{ minHeight: '72px', width: '100%', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', resize: 'vertical' }}
                />

                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={ack} onChange={(e) => { setAck(e.target.checked); setErr(''); }} style={{ accentColor: '#2563EB' }} />
                  <span>Acknowledge control verification / override</span>
                </label>

                {err && <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '13px', color: '#991B1B' }}>{err}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {screen === 'payments' && (
                    <>
                      <button onClick={() => handleAction('release', sel.payments)} style={{ height: '36px', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFF', fontWeight: 500, cursor: 'pointer' }}>Release Batch</button>
                      <button onClick={() => handleAction('hold', sel.payments)} style={{ height: '36px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFF', color: '#111827', fontWeight: 500, cursor: 'pointer' }}>Put on Hold</button>
                      <button onClick={() => handleAction('return', sel.payments)} style={{ height: '36px', borderRadius: '8px', border: '1px solid #FECACA', background: '#FFF', color: '#DC2626', fontWeight: 500, cursor: 'pointer', gridColumn: 'span 2' }}>Return to Manager</button>
                    </>
                  )}

                  {screen === 'bank' && (
                    <>
                      <button onClick={() => handleAction('approve', sel.bank)} style={{ height: '36px', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFF', fontWeight: 500, cursor: 'pointer' }}>Approve Recon</button>
                      <button onClick={() => handleAction('freeze', sel.bank)} style={{ height: '36px', borderRadius: '8px', border: '1px solid #FECACA', background: '#FFF', color: '#DC2626', fontWeight: 500, cursor: 'pointer' }}>Freeze / Unfreeze</button>
                    </>
                  )}

                  {screen === 'highrisk' && (
                    <>
                      <button onClick={() => handleAction('approve', sel.highrisk)} style={{ height: '36px', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFF', fontWeight: 500, cursor: 'pointer' }}>Approve</button>
                      <button onClick={() => handleAction('cfo', sel.highrisk)} style={{ height: '36px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFF', color: '#0369A1', fontWeight: 500, cursor: 'pointer' }}>Forward To CFO</button>
                      <button onClick={() => handleAction('return', sel.highrisk)} style={{ height: '36px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFF', color: '#D97706', fontWeight: 500, cursor: 'pointer' }}>Return</button>
                      <button onClick={() => handleAction('reject', sel.highrisk)} style={{ height: '36px', borderRadius: '8px', border: '1px solid #FECACA', background: '#FFF', color: '#DC2626', fontWeight: 500, cursor: 'pointer' }}>Reject</button>
                    </>
                  )}

                  {screen === 'exceptions' && (
                    <>
                      <button onClick={() => handleAction('close', sel.exceptions)} style={{ height: '36px', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFF', fontWeight: 500, cursor: 'pointer' }}>Close Exception</button>
                      <button onClick={() => handleAction('cfo', sel.exceptions)} style={{ height: '36px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFF', color: '#0369A1', fontWeight: 500, cursor: 'pointer' }}>Escalate To CFO</button>
                    </>
                  )}

                  {screen === 'gst' && (
                    <>
                      <button onClick={() => handleAction('approve', sel.gst)} style={{ height: '36px', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFF', fontWeight: 500, cursor: 'pointer' }}>Approve For Filing</button>
                      <button onClick={() => handleAction('cfo', sel.gst)} style={{ height: '36px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFF', color: '#0369A1', fontWeight: 500, cursor: 'pointer' }}>Escalate To CFO</button>
                    </>
                  )}

                  {screen === 'controls' && (
                    <>
                      <button onClick={() => handleAction('close', sel.controls)} style={{ height: '36px', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFF', fontWeight: 500, cursor: 'pointer' }}>Close (Remediated)</button>
                      <button onClick={() => handleAction('cfo', sel.controls)} style={{ height: '36px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFF', color: '#0369A1', fontWeight: 500, cursor: 'pointer' }}>Escalate To CFO</button>
                    </>
                  )}

                  {screen === 'policies' && (
                    <>
                      <button onClick={() => handleAction('approveChange', sel.policies)} style={{ height: '36px', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFF', fontWeight: 500, cursor: 'pointer' }}>Approve Change</button>
                      <button onClick={() => handleAction('review', sel.policies)} style={{ height: '36px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFF', color: '#111827', fontWeight: 500, cursor: 'pointer' }}>Mark Reviewed</button>
                    </>
                  )}

                  {screen === 'auditready' && (
                    <>
                      <button onClick={() => handleAction('ready', sel.auditready)} style={{ height: '36px', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFF', fontWeight: 500, cursor: 'pointer' }}>Mark Ready</button>
                      <button onClick={() => handleAction('share', sel.auditready)} style={{ height: '36px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFF', color: '#15803D', fontWeight: 500, cursor: 'pointer' }}>Share With Auditor</button>
                    </>
                  )}

                  {screen === 'locks' && (
                    <>
                      <button onClick={() => handleAction('lock', sel.locks)} style={{ height: '36px', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFF', fontWeight: 500, cursor: 'pointer' }}>Lock Period</button>
                      <button onClick={() => handleAction('reopen', sel.locks)} style={{ height: '36px', borderRadius: '8px', border: '1px solid #FECACA', background: '#FFF', color: '#DC2626', fontWeight: 500, cursor: 'pointer' }}>Reopen Period</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AUDIT TRAIL SCREEN */}
          {screen === 'audit' && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflowX: 'auto' }}>
              <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '16px', fontWeight: 600 }}>Immutable Hash-Chained Audit Trail</span>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>{auditLogs.length} verified events</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 160px 110px minmax(150px,1fr) 160px minmax(180px,1.4fr)', gap: '12px', padding: '0 20px', height: '44px', minWidth: '980px', alignItems: 'center', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>
                <span>Timestamp</span><span>User</span><span>Action</span><span>Module</span><span>Reference</span><span>Detail</span>
              </div>
              {auditLogs.map((a) => (
                <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '150px 160px 110px minmax(150px,1fr) 160px minmax(180px,1.4fr)', gap: '12px', padding: '8px 20px', minHeight: '56px', minWidth: '980px', alignItems: 'center', borderBottom: '1px solid #F3F4F6', fontSize: '14px' }}>
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>{a.ts}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{a.user}</span>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>{a.role}</span>
                  </div>
                  <div>
                    <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: chip(a.action).bg, color: chip(a.action).fg }}>{a.action}</span>
                  </div>
                  <span style={{ fontSize: '13px', color: '#374151' }}>{a.module}</span>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{a.ref}</span>
                  <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.4 }}>{a.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div style={{ position: 'fixed', right: '24px', bottom: '24px', zIndex: 60, background: '#111827', color: '#FFFFFF', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', boxShadow: '0 8px 24px rgba(17,24,39,0.2)', maxWidth: '480px', lineHeight: 1.45 }}>
          {toast}
        </div>
      )}
    </div>
  );
};

export default FinanceControllerWorkspace;
