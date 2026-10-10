import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AccountsStickyAppBar, RoleViewKey } from '../components/AccountsStickyAppBar';
import { AccountsSidebarUserFooter } from '../components/AccountsSidebarUserFooter';
import {
  LayoutDashboard,
  BarChart3,
  Wallet,
  Scale,
  Building2,
  Stethoscope,
  PiggyBank,
  TrendingUp,
  Construction,
  Stamp,
  Presentation,
  Rocket,
  ShieldAlert,
  BellRing,
  History,
  IndianRupee,
  Receipt,
  Landmark,
  Activity,
  Target,
  LineChart,
  HeartPulse,
  ArrowDownToLine,
  ArrowUpFromLine,
  Hourglass,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  CalendarClock,
  LayoutList,
  Gavel,
  Gem,
  Building,
  FileMinus,
  BadgeCheck,
  Percent,
  Siren,
  ClipboardList,
  UserCheck,
  CalendarCheck,
  Check,
  X,
  Download,
  AlertCircle,
  FileText,
  Clock
} from 'lucide-react';
import { accountsService, TrailEntry } from '../../../services/accountsService';

// Formatting Helpers
const cc = (v: number) => {
  const a = Math.abs(v);
  const sg = v < 0 ? '− ' : '';
  return a >= 1 ? `${sg}₹ ${a.toFixed(2)} Cr` : `${sg}₹ ${(a * 100).toFixed(1)} L`;
};
const pc = (v: number, d: number = 1) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}%`;
const hm = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const NOW = () => `08 Oct, ${hm()}`;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BOARD_LIM = 25; // ₹ 25 Cr threshold

// Status Chip Styling
const G = '#F3F4F6';
const GF = '#374151';
const CH: Record<string, [string, string]> = {
  'Awaiting CFO': ['#EFF6FF', '#1D4ED8'],
  Approved: ['#F0FDF4', '#15803D'],
  Rejected: ['#FEF2F2', '#B91C1C'],
  'Analysis Requested': ['#FFFBEB', '#B45309'],
  'More Info Requested': ['#FFFBEB', '#B45309'],
  'Board Review': ['#F0F9FF', '#0369A1'],
  Deferred: ['#FFFBEB', '#B45309'],
  'Revision Requested': ['#FFFBEB', '#B45309'],
  Idea: [G, GF],
  Feasibility: ['#EFF6FF', '#1D4ED8'],
  'Business Case': ['#F0F9FF', '#0369A1'],
  Parked: ['#FFFBEB', '#B45309'],
  Critical: ['#FEF2F2', '#B91C1C'],
  High: ['#FFFBEB', '#B45309'],
  Medium: ['#EFF6FF', '#1D4ED8'],
  Low: ['#F0FDF4', '#15803D'],
  Monitoring: [G, GF],
  'Mitigation Requested': ['#FFFBEB', '#B45309'],
  Accepted: [G, GF],
  'With Board': ['#F0F9FF', '#0369A1'],
  Open: ['#FEF2F2', '#B91C1C'],
  Acknowledged: [G, GF],
  Assigned: ['#FFFBEB', '#B45309'],
  'In Board Pack': ['#F0F9FF', '#0369A1'],
  Profitable: ['#F0FDF4', '#15803D'],
  'Loss-making': ['#FEF2F2', '#B91C1C'],
  'Thin margin': ['#FFFBEB', '#B45309'],
  Growing: ['#F0FDF4', '#15803D'],
  Declining: ['#FEF2F2', '#B91C1C'],
  Stable: [G, GF],
  Investment: ['#EFF6FF', '#1D4ED8'],
  Budget: ['#FFFBEB', '#B45309'],
  Expansion: ['#F0F9FF', '#0369A1'],
  CapEx: ['#EFF6FF', '#1D4ED8'],
  Contract: [G, GF],
  Risk: ['#FEF2F2', '#B91C1C'],
  Funding: ['#F0F9FF', '#0369A1'],
  Draft: ['#FFFBEB', '#B45309'],
  'Cash Crisis': ['#FEF2F2', '#B91C1C'],
  'Loss-Making Department': ['#FEF2F2', '#B91C1C'],
  'Budget Overrun': ['#FFFBEB', '#B45309'],
  'Revenue Drop': ['#FFFBEB', '#B45309'],
  'Target Miss': ['#FFFBEB', '#B45309'],
  'Receivable Concentration': ['#FFFBEB', '#B45309'],
  Critical2: ['#FEF2F2', '#B91C1C'],
  Warning: ['#FFFBEB', '#B45309'],
  Info: ['#F0F9FF', '#0369A1'],
  Fixed: [G, GF],
  'Debt service': ['#F0F9FF', '#0369A1'],
  Payroll: ['#EFF6FF', '#1D4ED8'],
  Statutory: ['#FFFBEB', '#B45309'],
  Vendors: [G, GF],
};

const chip = (st: string) => {
  const c = CH[st] || [G, GF];
  return { label: st, bg: c[0], fg: c[1] };
};

const TONE: Record<string, [string, string, string]> = {
  blue: ['#EFF6FF', '#2563EB', '#6B7280'],
  green: ['#F0FDF4', '#16A34A', '#15803D'],
  amber: ['#FFFBEB', '#D97706', '#B45309'],
  red: ['#FEF2F2', '#DC2626', '#B91C1C'],
  gray: ['#F3F4F6', '#4B5563', '#6B7280'],
  sky: ['#F0F9FF', '#0284C7', '#0369A1'],
  violet: ['#F5F3FF', '#7C3AED', '#6D28D9'],
};

const TC = {
  g: { bg: '#F0FDF4', fg: '#15803D' },
  a: { bg: '#FFFBEB', fg: '#B45309' },
  r: { bg: '#FEF2F2', fg: '#B91C1C' },
  b: { bg: '#EFF6FF', fg: '#1D4ED8' },
};

const SEV: Record<string, { bg: string; bd: string; fg: string; tag: string }> = {
  critical: { bg: '#FEF2F2', bd: '#FECACA', fg: '#991B1B', tag: 'Critical' },
  warning: { bg: '#FFFBEB', bd: '#FDE68A', fg: '#92400E', tag: 'Warning' },
  info: { bg: '#F0F9FF', bd: '#BAE6FD', fg: '#075985', tag: 'Info' },
  success: { bg: '#F0FDF4', bd: '#BBF7D0', fg: '#166534', tag: 'OK' },
};

const SCREENS: Record<string, [string, string, string]> = {
  dashboard: ['Executive Overview', 'CFO Dashboard', 'Is the hospital making money, can it afford to grow, and what should the board hear today?'],
  pl: ['Financial Health', 'Profit & Loss', 'Executive P&L from revenue to net profit. Compare month, quarter and year to date.'],
  cash: ['Financial Health', 'Cash Flow', 'Cash position, expected inflows and outflows, and how long the hospital can run on its cash.'],
  bs: ['Financial Health', 'Balance Sheet', 'Assets, liabilities and equity as at 30 Sep 2026, with debt capacity for new investment.'],
  deptprof: ['Performance', 'Department Profitability', 'September contribution by clinical department after direct and allocated costs.'],
  services: ['Performance', 'Service Line Analytics', 'FY 2026-27 year to date (Apr–Sep). Which services drive growth and which dilute margin.'],
  budget: ['Planning', 'Budget Strategy', 'FY 2026-27 performance against budget and the FY 2027-28 budget proposal from the Finance Controller.'],
  forecast: ['Planning', 'Financial Forecasting', 'Forward view of revenue, expense, profit and cash under three scenarios.'],
  capex: ['Investments', 'CapEx Planning', 'Capital projects with cost, return and payback. You approve up to ₹ 25 Cr; larger projects go to the Board.'],
  approvals: ['Investments', 'Strategic Approvals', 'Major contracts, funding, expansion and equipment decisions only.'],
  board: ['Executive', 'Board Reporting', 'Auto-generated Q2 FY 2026-27 pack for the Board meeting on 24 Oct 2026.'],
  growth: ['Executive', 'Growth Opportunities', 'New specialties, sites and services — investment needed against revenue potential and risk.'],
  risks: ['Risk', 'Strategic Risks', 'Hospital-wide financial risks by impact and likelihood.'],
  alerts: ['Risk', 'Financial Alerts', 'Executive-level alerts only — operational exceptions stay with the Finance Controller.'],
  decisions: ['Tracking', 'Executive Decisions', 'Every strategic decision with the reason and its financial impact.'],
};

const NAV: Array<[string, Array<[string, string]>]> = [
  ['', [['dashboard', 'Dashboard']]],
  ['Financial Health', [['pl', 'Profit & Loss'], ['cash', 'Cash Flow'], ['bs', 'Balance Sheet']]],
  ['Performance', [['deptprof', 'Department Profitability'], ['services', 'Service Line Analytics']]],
  ['Planning', [['budget', 'Budget Strategy'], ['forecast', 'Financial Forecasting']]],
  ['Investments', [['capex', 'CapEx Planning'], ['approvals', 'Strategic Approvals']]],
  ['Executive', [['board', 'Board Reporting'], ['growth', 'Growth Opportunities']]],
  ['Risk', [['risks', 'Strategic Risks'], ['alerts', 'Financial Alerts']]],
  ['Tracking', [['decisions', 'Executive Decisions']]],
];

const CFO_ICONS: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  pl: Receipt,
  cash: Wallet,
  bs: Scale,
  deptprof: Building2,
  services: Activity,
  budget: Target,
  forecast: TrendingUp,
  capex: PiggyBank,
  approvals: Stamp,
  board: Presentation,
  growth: Rocket,
  risks: ShieldAlert,
  alerts: BellRing,
  decisions: History,
};

const T = (t: string, who: string, when: string, c: string = ''): TrailEntry => ({ t, who, when, c });

// Baseline Financial Constants
const M12 = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
const REV = [19.6, 19.2, 19.9, 20.3, 19.1, 20.6, 19.8, 20.4, 20.1, 20.9, 21.17, 21.82];
const ER = [0.86, 0.87, 0.85, 0.85, 0.88, 0.84, 0.86, 0.86, 0.875, 0.855, 0.84, 0.84922];
const REV_LY = [17.6, 18.1, 18.0, 18.7, 19.0, 19.4];
const ER_LY = 0.87;
const BUD_REV = [20.2, 20.6, 20.9, 21.2, 21.4, 21.7];
const BUD_ER = 0.845;
const CASH12 = [5.1, 4.8, 5.6, 6.2, 5.4, 6.9, 6.1, 6.6, 6.0, 6.8, 7.18, 6.73];
const CASH = 6.73;
const DEBT = 38.2;
const EQUITY = 98.4;

const lines = (rev: number, exp: number, i: number, ly: boolean) => {
  const ex: Record<number, [number, number, number]> = { 11: [8.42, 4.86, 2.08], 10: [8.30, 4.40, 2.02] };
  const [pay, drg, fee] = (!ly && ex[i]) || [rev * 0.388, rev * 0.21, rev * 0.095];
  const dep = ly ? 0.85 : 0.92;
  const int = ly ? 0.42 : 0.38;
  const oth = exp - pay - drg - fee - dep - int;
  return { rev, pay, drg, fee, oth, opx: drg + fee + oth, ebitda: rev - pay - drg - fee - oth, dep, int, np: rev - exp };
};
const agg = (list: Array<any>) =>
  list.reduce((a, x) => {
    Object.keys(x).forEach((k) => (a[k] = (a[k] || 0) + x[k]));
    return a;
  }, {});
const MONTH = (i: number) => lines(REV[i], REV[i] * ER[i], i, false);
const LYM = (i: number) => lines(REV_LY[i], REV_LY[i] * ER_LY, i, true);

const DEPT_INIT: Array<[string, number, number, number, number, string]> = [
  ['OPD', 3.12, 2.14, 2.98, 2.08, 'Footfall 41,200 (+6% MoM) · consult fee revision in July'],
  ['IPD', 7.84, 6.71, 7.62, 6.48, 'Occupancy 82% · average stay 4.1 days'],
  ['Laboratory', 1.88, 1.21, 1.91, 1.20, 'Test volumes flat; outsourced test cost rising'],
  ['Radiology', 2.26, 1.64, 2.14, 1.58, 'MRI running at 96% of capacity'],
  ['Pharmacy', 4.10, 3.38, 4.02, 3.27, 'Drug cost up 10.5% month on month'],
  ['Operation Theatre', 2.62, 2.81, 2.50, 2.66, 'Utilisation 58% · implants are 34% of OT revenue'],
];
const OVERHEAD = 0.64;

const SVC_INIT: Array<[string, string, number, number, string, number, number]> = [
  ['MRI', 'Radiology', 4.86, 6480, 'scans', 41, 22],
  ['CT Scan', 'Radiology', 3.92, 9850, 'scans', 38, 15],
  ['Pathology', 'Laboratory', 7.40, 142300, 'tests', 44, 9],
  ['Cardiology', 'IPD', 18.60, 2140, 'procedures', 24, 28],
  ['Orthopedics', 'IPD', 14.20, 1860, 'surgeries', 19, 11],
  ['Physiotherapy', 'OPD', 1.12, 18400, 'sessions', 12, -4],
  ['Oncology (day care)', 'IPD', 6.80, 3120, 'cycles', 21, 34],
  ['Dialysis', 'IPD', 2.30, 11200, 'sessions', 8, 6],
];

export interface CapexItem {
  id: string;
  name: string;
  dept: string;
  cost: number;
  roi: number;
  pay: number;
  npv: number;
  risk: string;
  fund: string;
  loan: number;
  status: string;
  driver: string;
  timeline: string;
  rev: number;
  by: string;
  due: string;
  cashOut: number;
  fresh?: boolean;
  trail: TrailEntry[];
}

export interface StrategicApprovalItem {
  id: string;
  type: string;
  title: string;
  val: string;
  impact: number;
  roi: string;
  risk: string;
  note: string;
  kv: Array<[string, string]>;
  from: string;
  link?: string;
  risk2?: string;
  status: string;
  trail: TrailEntry[];
}

export interface GrowthOpportunityItem {
  id: string;
  title: string;
  type: string;
  inv: number;
  rev: number;
  yr: number;
  irr: number;
  pay: number;
  risk: string;
  stage: string;
  note: string;
  trail: TrailEntry[];
}

export interface StrategicRiskItem {
  id: string;
  t: string;
  d: string;
  imp: number;
  lik: number;
  owner: string;
  mit: string;
  trend: string;
  status: string;
  trail: TrailEntry[];
}

export interface ExecutiveAlertItem {
  id: string;
  type: string;
  sev: string;
  t: string;
  d: string;
  go: string;
  owner?: string;
  status: string;
  trail: TrailEntry[];
}

export interface ExecutiveDecisionItem {
  id: string;
  date: string;
  cat: string;
  t: string;
  out: string;
  why: string;
  imp: string;
  fresh?: boolean;
}

const CX_INIT: CapexItem[] = [
  { id: 'CX-01', name: '3T MRI – second scanner', dept: 'Radiology', cost: 14.5, roi: 24, pay: 3.8, npv: 9.6, risk: 'Medium', fund: '70% term loan · 30% internal accruals', loan: 0.7, status: 'Awaiting CFO', driver: 'Current MRI at 96% capacity, 11-day wait list, an estimated 18% of referrals lost', timeline: 'Order Nov 2026 · live Apr 2027', rev: 6.8, by: 'Dr. P. Shah · Radiology', due: '15 Oct', cashOut: 4.35, trail: [T('Proposal submitted', 'Dr. P. Shah · Radiology', 'Sep 2026')] },
  { id: 'CX-02', name: '128-slice CT replacement', dept: 'Radiology', cost: 6.2, roi: 19, pay: 4.2, npv: 3.1, risk: 'Low', fund: '100% internal accruals', loan: 0, status: 'Awaiting CFO', driver: 'CT is 9 years old with 46 downtime hours last quarter', timeline: 'Q4 FY 2026-27', rev: 2.9, by: 'Dr. P. Shah · Radiology', due: '22 Oct', cashOut: 6.2, trail: [T('Proposal submitted', 'Dr. P. Shah · Radiology', 'Sep 2026')] },
  { id: 'CX-03', name: 'ICU expansion – 20 beds', dept: 'IPD', cost: 9.8, roi: 21, pay: 4.6, npv: 5.2, risk: 'Medium', fund: '60% term loan · 40% internal accruals', loan: 0.6, status: 'Analysis Requested', driver: 'ICU occupancy 94%; 31 patients transferred out in Q2', timeline: 'Build Jan–Jun 2027', rev: 7.2, by: 'Dr. M. Kulkarni · IPD', due: '31 Oct', cashOut: 3.92, trail: [T('Proposal submitted', 'Dr. M. Kulkarni · IPD', 'Sep 2026'), T('Analysis requested', 'Meera Rao', '02 Oct', 'Show phasing with nurse hiring and the payer mix of ICU transfers')] },
  { id: 'CX-04', name: 'New 120-bed tower – building expansion', dept: 'Hospital', cost: 85, roi: 16, pay: 7.5, npv: 28.4, risk: 'High', fund: '60% debt · 40% equity or PE', loan: 0.6, status: 'Awaiting CFO', driver: 'Bed occupancy 82% today, projected 95% by FY 2028-29', timeline: 'FY 2027-28 to FY 2029-30', rev: 64, by: 'Hospital Director', due: '24 Oct', cashOut: 34, trail: [T('Proposal submitted', 'Hospital Director', 'Sep 2026')] },
  { id: 'CX-05', name: 'Modular OT ×2', dept: 'Operation Theatre', cost: 4.4, roi: 11, pay: 6.4, npv: 0.6, risk: 'High', fund: '100% internal accruals', loan: 0, status: 'Awaiting CFO', driver: 'OT utilisation is only 58% — capacity is not the constraint', timeline: 'Q1 FY 2027-28', rev: 1.6, by: 'OT Committee', due: '20 Oct', cashOut: 4.4, trail: [T('Proposal submitted', 'OT Committee', 'Sep 2026')] },
  { id: 'CX-06', name: 'Cath lab C-arm upgrade', dept: 'Cardiology', cost: 1.55, roi: 28, pay: 2.9, npv: 1.8, risk: 'Low', fund: '100% internal accruals', loan: 0, status: 'Approved', driver: 'Replaces an 11-year-old unit with rising downtime', timeline: 'Advance paid · install Dec 2026', rev: 2.4, by: 'Cardiology', due: '—', cashOut: 0, trail: [T('Proposal submitted', 'Cardiology', 'Jul 2026'), T('Approved', 'Meera Rao', 'Aug 2026')] },
  { id: 'CX-07', name: 'Solar rooftop 1 MW', dept: 'Facilities', cost: 4.1, roi: 22, pay: 4.5, npv: 2.3, risk: 'Low', fund: '80% green loan', loan: 0.8, status: 'Approved', driver: 'Saves ₹ 0.9 Cr a year in power', timeline: 'Commissioned Sep 2026', rev: 0.9, by: 'Facilities', due: '—', cashOut: 0, trail: [T('Proposal submitted', 'Facilities', 'Jul 2026'), T('Approved', 'Meera Rao', 'Aug 2026')] },
];

const SA_INIT: StrategicApprovalItem[] = [
  { id: 'SA-01', type: 'Major Contract', title: 'Star Health – 3-year network rate agreement', val: 'Contract · 3 years', impact: 4.2, roi: '—', risk: 'Medium', note: '+7.5% on packages, locked for 3 years with a 5% inflation clause', kv: [['Volume', '~6,800 claims a year'], ['Counterparty', 'Star Health & Allied Insurance']], from: 'Revenue Cycle Head', status: 'Awaiting CFO', trail: [T('Submitted for CFO decision', 'Revenue Cycle Head', 'Oct 2026')] },
  { id: 'SA-02', type: 'Major Contract', title: 'Apex Pharma – 3-year exclusive supply', val: '₹ 58 Cr over 3 years', impact: 3.4, roi: '6% saving', risk: 'High', note: 'Raises Apex’s share of pharmacy purchases from 41% to 78%', kv: [['Saving', '₹ 3.4 Cr a year'], ['Exit clause', '12 months’ notice']], from: 'Procurement Head', risk2: 'R3', status: 'Awaiting CFO', trail: [T('Submitted for CFO decision', 'Procurement Head', 'Oct 2026')] },
  { id: 'SA-03', type: 'Hospital Expansion', title: 'Wakad diagnostic centre – 10-year lease', val: '₹ 1.2 Cr a year rent', impact: -1.2, roi: '27% IRR (GO-03)', risk: 'Low', note: 'Lease is needed only if GO-03 goes ahead', kv: [['Area', '8,400 sq ft · ground + 1'], ['Lock-in', '3 years']], from: 'Strategy Office', status: 'Awaiting CFO', trail: [T('Submitted for CFO decision', 'Strategy Office', 'Oct 2026')] },
  { id: 'SA-04', type: 'Fund Raising', title: 'HDFC term loan ₹ 12 Cr for the second MRI', val: '₹ 12 Cr · 7 years', impact: -1.1, roi: '9.1% floating', risk: 'Medium', note: 'Draw only if CX-01 is approved', kv: [['Security', 'Equipment hypothecation'], ['Covenant', 'DSCR ≥ 1.5x']], from: 'Finance Controller', link: 'CX-01', status: 'Awaiting CFO', trail: [T('Submitted for CFO decision', 'Finance Controller', 'Oct 2026')] },
  { id: 'SA-05', type: 'Related Party', title: 'Medisys Advisory – consulting (trustee-owned firm)', val: '₹ 9.5 L', impact: -0.095, roi: '—', risk: 'High', note: 'Forwarded by the Finance Controller · 2 comparable quotes · arm’s length confirmed', kv: [['Related party', 'Trustee R. Kapoor · 60% owner'], ['Board noting', 'Required']], from: 'Finance Controller', status: 'Awaiting CFO', trail: [T('Submitted for CFO decision', 'Finance Controller', 'Oct 2026')] },
  { id: 'SA-06', type: 'Equipment Purchase', title: 'Cath lab C-arm – 40% advance to Siemens', val: '₹ 62 L', impact: -0.62, roi: '28% (CX-06)', risk: 'Low', note: 'Within the approved CX-06 project budget', kv: [['Project', 'CX-06 · approved Aug 2026'], ['Balance', 'On installation']], from: 'Finance Controller', status: 'Awaiting CFO', trail: [T('Submitted for CFO decision', 'Finance Controller', 'Oct 2026')] },
  { id: 'SA-07', type: 'Major Contract', title: 'Housekeeping outsourcing – 5 years', val: '₹ 10.8 Cr over 5 years', impact: 0.45, roi: '9% saving', risk: 'Medium', note: '140 staff transfer to the vendor; union consultation complete', kv: [['Saving', '₹ 0.45 Cr a year'], ['Vendor', 'CleanCare Facility Services']], from: 'COO', status: 'Awaiting CFO', trail: [T('Submitted for CFO decision', 'COO', 'Oct 2026')] },
];

const GO_INIT: GrowthOpportunityItem[] = [
  { id: 'GO-01', title: 'Oncology centre – radiation + day care', type: 'New Specialty', inv: 38, rev: 26, yr: 3, irr: 21, pay: 5.8, risk: 'Medium', stage: 'Business Case', note: 'Day-care chemo already +34% YoY; radiation referrals go out of town', trail: [T('Opportunity logged', 'Strategy Office', '2026')] },
  { id: 'GO-02', title: 'New 150-bed branch – Hinjewadi', type: 'New Branch', inv: 140, rev: 95, yr: 4, irr: 15, pay: 8.5, risk: 'High', stage: 'Feasibility', note: 'Catchment of 1.8 lakh IT workforce; needs equity partner', trail: [T('Opportunity logged', 'Strategy Office', '2026')] },
  { id: 'GO-03', title: 'Standalone diagnostic centre – Wakad', type: 'New Diagnostic Center', inv: 11, rev: 9.5, yr: 2, irr: 27, pay: 3.6, risk: 'Low', stage: 'Business Case', note: 'Relieves MRI/CT capacity at the main campus', trail: [T('Opportunity logged', 'Strategy Office', '2026')] },
  { id: 'GO-04', title: 'Telemedicine & home care', type: 'Telemedicine', inv: 1.8, rev: 4.2, yr: 2, irr: 34, pay: 2.1, risk: 'Low', stage: 'Feasibility', note: 'Post-discharge follow-ups and chronic-care subscriptions', trail: [T('Opportunity logged', 'Strategy Office', '2026')] },
  { id: 'GO-05', title: 'IVF & fertility centre', type: 'New Specialty', inv: 6.5, rev: 7.8, yr: 3, irr: 24, pay: 3.9, risk: 'Medium', stage: 'Idea', note: 'Two senior specialists have expressed interest in joining', trail: [T('Opportunity logged', 'Strategy Office', '2026')] },
  { id: 'GO-06', title: 'International patient desk', type: 'Medical Tourism', inv: 0.6, rev: 3.1, yr: 2, irr: 31, pay: 1.8, risk: 'Medium', stage: 'Idea', note: 'Cardiology and orthopedics packages for Gulf & Africa markets', trail: [T('Opportunity logged', 'Strategy Office', '2026')] },
];
const STAGES = ['Idea', 'Feasibility', 'Business Case', 'Approved'];

const LIK = ['Rare', 'Possible', 'Likely', 'Almost Certain'];
const IMP = ['Low', 'Medium', 'High', 'Critical'];
const rate = (r: { imp: number; lik: number }) => {
  const s = r.imp + r.lik;
  return s >= 5 ? 'Critical' : s === 4 ? 'High' : s >= 2 ? 'Medium' : 'Low';
};

const RK_INIT: StrategicRiskItem[] = [
  { id: 'R1', t: 'Insurance & TPA dependency', d: '58% of revenue comes from insurers and TPAs; disallowances run at 2.1% of claims', imp: 2, lik: 2, owner: 'Revenue Cycle Head', mit: 'Diversify payer mix; renegotiate top 3 contracts (SA-01)', trend: 'Rising', status: 'Monitoring', trail: [T('Risk logged', 'Revenue Cycle Head', 'Q2 review')] },
  { id: 'R2', t: 'Cash-flow risk from government receivables', d: 'CGHS owes ₹ 1.25 Cr, 138 days old — 26% of all receivables', imp: 2, lik: 2, owner: 'Finance Controller', mit: 'Escalation with CGHS regional office; cap scheme exposure', trend: 'Rising', status: 'Monitoring', trail: [T('Risk logged', 'Finance Controller', 'Q2 review')] },
  { id: 'R3', t: 'Vendor concentration – pharmacy', d: 'Apex Pharma supplies 41% of drugs; one disruption hits pharmacy margin', imp: 1, lik: 2, owner: 'Procurement Head', mit: 'Dual-source top 50 SKUs', trend: 'Stable', status: 'Monitoring', trail: [T('Risk logged', 'Procurement Head', 'Q2 review')] },
  { id: 'R4', t: 'Operation Theatre losses & idle capacity', d: 'OT lost ₹ 0.19 Cr in September at 58% utilisation — third loss-making month', imp: 2, lik: 3, owner: 'COO', mit: 'Surgeon scheduling, implant rate contracts, day-surgery mix', trend: 'Rising', status: 'Monitoring', trail: [T('Risk logged', 'COO', 'Q2 review')] },
  { id: 'R5', t: 'Regulatory price caps', d: 'Price caps on stents and implants, and GST changes on room rent', imp: 1, lik: 1, owner: 'Finance Controller', mit: 'Track NPPA notices; package repricing', trend: 'Stable', status: 'Monitoring', trail: [T('Risk logged', 'Finance Controller', 'Q2 review')] },
  { id: 'R6', t: 'Senior surgeon attrition', d: 'Top 5 surgeons generate 22% of revenue', imp: 3, lik: 1, owner: 'Medical Director', mit: 'Retention contracts with revenue share', trend: 'Stable', status: 'Monitoring', trail: [T('Risk logged', 'Medical Director', 'Q2 review')] },
  { id: 'R7', t: 'Interest-rate rise', d: '₹ 38.2 Cr of floating-rate debt; +1% adds ₹ 0.38 Cr a year', imp: 1, lik: 2, owner: 'CFO', mit: 'Fix 50% of debt via swap', trend: 'Stable', status: 'Monitoring', trail: [T('Risk logged', 'CFO', 'Q2 review')] },
  { id: 'R8', t: 'Revenue decline – physiotherapy & lab', d: 'Physiotherapy −4% YoY; lab −1.6% month on month', imp: 0, lik: 2, owner: 'COO', mit: 'Home-collection and corporate wellness tie-ups', trend: 'Rising', status: 'Monitoring', trail: [T('Risk logged', 'COO', 'Q2 review')] },
  { id: 'R9', t: 'IT downtime / cyber incident', d: 'HIS outage stops billing and admissions', imp: 2, lik: 0, owner: 'CIO', mit: 'DR site live; quarterly drills', trend: 'Falling', status: 'Monitoring', trail: [T('Risk logged', 'CIO', 'Q2 review')] },
];

const AL_INIT: ExecutiveAlertItem[] = [
  { id: 'AL-01', type: 'Cash Crisis', sev: 'Critical', t: 'Cash projected below the buffer after October salaries', d: 'Balance falls to the low point shown in Cash Flow — accelerate CGHS/TPA collections or draw the credit line', go: 'cash', status: 'Open', trail: [T('Alert raised', 'Finance analytics', '07 Oct')] },
  { id: 'AL-02', type: 'Loss-Making Department', sev: 'Critical', t: 'Operation Theatre lost ₹ 0.19 Cr in September', d: 'Third loss-making month in a row; margin −7.3%', go: 'deptprof', status: 'Open', trail: [T('Alert raised', 'Finance analytics', '07 Oct')] },
  { id: 'AL-03', type: 'Budget Overrun', sev: 'High', t: 'HR 13.8% and Laboratory 5.7% over YTD budget', d: 'Oncology-wing hiring not budgeted; outsourced lab tests rising', go: 'budget', status: 'Open', trail: [T('Alert raised', 'Finance analytics', '07 Oct')] },
  { id: 'AL-04', type: 'Target Miss', sev: 'High', t: 'EBITDA margin 20.7% YTD vs 22% target', d: 'Drug and consumable costs grew faster than revenue', go: 'pl', status: 'Open', trail: [T('Alert raised', 'Finance analytics', '07 Oct')] },
  { id: 'AL-05', type: 'Receivable Concentration', sev: 'High', t: 'CGHS is 26% of receivables and 138 days old', d: 'Government scheme exposure above the 20% policy ceiling', go: 'risks', status: 'Open', trail: [T('Alert raised', 'Finance analytics', '07 Oct')] },
  { id: 'AL-06', type: 'Revenue Drop', sev: 'Medium', t: 'Physiotherapy revenue −4% year on year', d: 'Only declining service line; lab volumes flat', go: 'services', status: 'Open', trail: [T('Alert raised', 'Finance analytics', '07 Oct')] },
];

const DEC_INIT: ExecutiveDecisionItem[] = [
  { id: 'D6', date: '12 Aug 2026', cat: 'CapEx', t: 'Cath lab C-arm upgrade', out: 'Approved', why: 'Replaces an 11-year-old unit with rising downtime', imp: '₹ 1.55 Cr capex · +₹ 2.4 Cr a year cardiology revenue' },
  { id: 'D5', date: '28 Jul 2026', cat: 'Budget', t: 'Oncology-wing recruitment above HR budget', out: 'Approved', why: 'Specialists needed before the centre opens', imp: '+₹ 0.44 Cr opex in FY 2026-27' },
  { id: 'D4', date: '15 Jul 2026', cat: 'Investment', t: 'Solar rooftop 1 MW', out: 'Approved', why: '4.5-year payback on a green loan', imp: '₹ 4.1 Cr capex · saves ₹ 0.9 Cr a year' },
  { id: 'D3', date: '02 Jun 2026', cat: 'Expansion', t: 'Hinjewadi branch — move to full feasibility', out: 'Deferred', why: 'Wait for H1 results and an equity partner', imp: 'No spend committed' },
  { id: 'D2', date: '18 May 2026', cat: 'Budget', t: 'FY 2026-27 annual budget', out: 'Approved', why: 'Board-approved revenue target ₹ 253 Cr', imp: 'EBITDA target ₹ 58.5 Cr (22%)' },
  { id: 'D1', date: '10 Apr 2026', cat: 'CapEx', t: 'Second cath lab', out: 'Rejected', why: 'Existing lab utilisation at 61%', imp: 'Avoided ₹ 9.5 Cr capex' },
];

export const CFOExecutiveWorkspace: React.FC<any> = ({
  activeRoleView = 'cfo',
  onSelectRole = () => {},
  workload,
  currentTime,
  onOpenMaster
}) => {
  // Screen and Selection State
  const [screen, setScreen] = useState<string>('dashboard');
  const [sel, setSel] = useState<Record<string, string>>({
    capex: 'CX-01',
    approvals: 'SA-02',
    growth: 'GO-01',
    risks: 'R4',
    alerts: 'AL-01',
    deptprof: 'Operation Theatre',
  });

  // Views & Filters
  const [plPer, setPlPer] = useState<'Month' | 'Quarter' | 'Year'>('Month');
  const [cfView, setCfView] = useState<'7 Days' | '30 Days' | '90 Days' | '12 Months'>('30 Days');
  const [rank, setRank] = useState<'Most Profitable' | 'Least Profitable'>('Most Profitable');
  const [svcSort, setSvcSort] = useState<'Growth' | 'Revenue' | 'Margin'>('Growth');
  const [budView, setBudView] = useState<'Department' | 'Hospital' | 'Growth'>('Department');
  const [fcH, setFcH] = useState<'3 Months' | '6 Months' | '12 Months' | '3 Years'>('12 Months');
  const [fcS, setFcS] = useState<'Best' | 'Expected' | 'Worst'>('Expected');
  const [cxF, setCxF] = useState<'Awaiting' | 'All' | 'Approved' | 'Board' | 'Rejected'>('Awaiting');
  const [saF, setSaF] = useState<'Awaiting' | 'All' | 'Decided'>('Awaiting');
  const [goF, setGoF] = useState<'All' | 'Idea' | 'Feasibility' | 'Business Case' | 'Approved'>('All');
  const [rkF, setRkF] = useState<'All' | 'Critical' | 'High' | 'Medium' | 'Low'>('All');
  const [alF, setAlF] = useState<'Open' | 'All' | 'Handled'>('Open');
  const [decF, setDecF] = useState<'All' | 'Investment' | 'CapEx' | 'Budget' | 'Expansion'>('All');

  // Entities State
  const [cxList, setCxList] = useState<CapexItem[]>(CX_INIT);
  const [saList, setSaList] = useState<StrategicApprovalItem[]>(SA_INIT);
  const [goList, setGoList] = useState<GrowthOpportunityItem[]>(GO_INIT);
  const [rkList, setRkList] = useState<StrategicRiskItem[]>(RK_INIT);
  const [alList, setAlList] = useState<ExecutiveAlertItem[]>(AL_INIT);
  const [decList, setDecList] = useState<ExecutiveDecisionItem[]>(DEC_INIT);
  const [deptTrails, setDeptTrails] = useState<Record<string, TrailEntry[]>>({});
  const [budgetState, setBudgetState] = useState<{ status: string; trail: TrailEntry[] }>({
    status: 'Awaiting CFO',
    trail: [T('FY 2027-28 proposal submitted', 'Finance Controller', '06 Oct')],
  });
  const [boardState, setBoardState] = useState<{ status: string; inc: Record<string, boolean>; trail: TrailEntry[] }>({
    status: 'Draft',
    inc: { rev: true, prof: true, cash: true, growth: true, risk: true },
    trail: [T('Pack auto-generated', 'System', '08 Oct')],
  });

  // Action Inputs & UI feedback
  const [cmt, setCmt] = useState<string>('');
  const [err, setErr] = useState<string>('');
  const [selVal, setSelVal] = useState<string>('');
  const [toast, setToast] = useState<string>('');
  const mainRef = useRef<HTMLDivElement>(null);

  const cfoName = 'Meera Rao';
  const cashBufferCr = 5.0;

  // Sync with backend on mount
  useEffect(() => {
    const fetchLive = async () => {
      try {
        const [dash, capexRes, saRes, goRes, rkRes, alRes, repRes, decRes] = await Promise.allSettled([
          accountsService.getCfoDashboard(),
          accountsService.getCfoCapexRequests('All'),
          accountsService.getCfoStrategicApprovals('All'),
          accountsService.getCfoGrowthOpportunities('All'),
          accountsService.getCfoStrategicRisks('All'),
          accountsService.getCfoExecutiveAlerts('All'),
          accountsService.getCfoBoardReport(),
          accountsService.getCfoExecutiveDecisions('All'),
        ]);

        if (capexRes.status === 'fulfilled' && Array.isArray(capexRes.value) && capexRes.value.length > 0) {
          // If backend has items, integrate their statuses
          setCxList((prev) =>
            prev.map((item) => {
              const matched = capexRes.value.find((b: any) => b.id === item.id || b.title === item.name);
              return matched ? { ...item, status: matched.status } : item;
            })
          );
        }
      } catch (e) {
        console.warn('API sync completed with defaults', e);
      }
    };
    fetchLive();
  }, []);

  const say = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const go = (targetScreen: string, extraSel?: { sc: string; id: string }) => {
    setScreen(targetScreen);
    setCmt('');
    setErr('');
    setSelVal('');
    if (extraSel) {
      setSel((prev) => ({ ...prev, [extraSel.sc]: extraSel.id }));
    }
    if (mainRef.current) mainRef.current.scrollTop = 0;
  };

  const pick = (sc: string, id: string) => {
    setSel((prev) => ({ ...prev, [sc]: id }));
    setCmt('');
    setErr('');
    setSelVal('');
  };

  const logDecision = (cat: string, title: string, outcome: string, why: string, impact: string) => {
    const newEntry: ExecutiveDecisionItem = {
      id: `D${Date.now()}`,
      date: '08 Oct 2026',
      cat,
      t: title,
      out: outcome,
      why: why || '—',
      imp: impact || '—',
      fresh: true,
    };
    setDecList((prev) => [newEntry, ...prev]);
  };

  // Fresh Approved CapEx calculations
  const newCapexApproved = useMemo(() => {
    return cxList.filter((x) => x.status === 'Approved' && x.fresh);
  }, [cxList]);

  // Dynamic Pro Forma Debt
  const proFormaDebt = useMemo(() => {
    const nl = newCapexApproved.reduce((a, x) => a + x.cost * x.loan, 0);
    const totalDebt = DEBT + nl;
    const de = totalDebt / EQUITY;
    const ebitda = 4.59 * 12;
    const ds = 0.38 * 12 + 0.42 * 12 + nl * 0.16;
    return {
      nl,
      debt: totalDebt,
      de,
      dscr: ebitda / ds,
      head: EQUITY * 0.8 - totalDebt,
    };
  }, [newCapexApproved]);

  // Daily Cash Flow calculation (90 Days)
  const dailySeries = useMemo(() => {
    const out: Array<{ d: number; lbl: string; inn: number; out: number; bal: number; ev: Array<{ t: string; a: number; k: string }> }> = [];
    let bal = CASH;
    const add = newCapexApproved.reduce((a, x) => a + x.cashOut * 0.3, 0);

    for (let d = 1; d <= 90; d++) {
      const dt = new Date(2026, 9, 8 + d);
      const wk = dt.getDay();
      const dom = dt.getDate();
      let inn = 0.62 * (wk === 0 ? 0.5 : 1);
      let o = 0.46 * (wk === 0 ? 0.4 : 1);
      const ev: Array<{ t: string; a: number; k: string }> = [];

      const E = (t: string, a: number, k: string) => {
        o += a;
        ev.push({ t, a, k });
      };

      if (dom === 8) E('Equipment loan EMI – HDFC', 0.42, 'Debt service');
      if (dom === 9) E('Vendor payment run', 1.28, 'Vendors');
      if (dom === 13) E('GST & TDS deposit', 0.68, 'Statutory');
      if (dom === 22) E('Vendor payment run', 1.40, 'Vendors');
      if (dom === dt.getDate() && new Date(2026, dt.getMonth() + 1, 0).getDate() === dom) {
        E(`Salaries – ${MON[dt.getMonth()]}`, 1.84, 'Payroll');
      }
      if (dom === 27) inn += 1.5;
      if (d === 40) inn += 1.25;
      if (add && dom === 15) E('Approved CapEx – equity share', add / 3, 'CapEx');

      bal += inn - o;
      out.push({
        d,
        lbl: `${String(dom).padStart(2, '0')} ${MON[dt.getMonth()]}`,
        inn,
        out: o,
        bal,
        ev,
      });
    }
    return out;
  }, [newCapexApproved]);

  // Monthly Cash Flow
  const monthlySeries = useMemo(() => {
    const out: Array<{ lbl: string; inn: number; out: number; bal: number }> = [];
    let bal = CASH;
    const add = newCapexApproved;
    for (let m = 1; m <= 12; m++) {
      const rev = 21.82 * Math.pow(1.01, m) * (m === 5 ? 0.95 : 1);
      const exp = rev * 0.847;
      const capex = 0.6 + add.reduce((a, x) => a + (x.cashOut * 0.3) / 12, 0);
      const inn = rev * 0.985;
      const o = exp - 0.92 + 0.42 + capex;
      bal += inn - o;
      const dt = new Date(2026, 9 + m - 1, 1);
      out.push({
        lbl: `${MON[dt.getMonth()]} ${String(dt.getFullYear()).slice(2)}`,
        inn,
        out: o,
        bal,
      });
    }
    return out;
  }, [newCapexApproved]);

  // Forecasting Calculation
  const fcData = useMemo(() => {
    const P = {
      Best: [0.016, 0.83],
      Expected: [0.010, 0.847],
      Worst: [0.002, 0.875],
    }[fcS];
    const n = { '3 Months': 3, '6 Months': 6, '12 Months': 12, '3 Years': 36 }[fcH];
    const add = newCapexApproved;
    let bal = CASH;
    const rows: Array<{ lbl: string; q: number; rev: number; exp: number; np: number; bal: number }> = [];

    for (let m = 1; m <= n; m++) {
      const dt = new Date(2026, 9 + m - 1, 1);
      const seas = dt.getMonth() === 1 ? 0.95 : 1;
      const rev = 21.82 * Math.pow(1 + P[0], m) * seas;
      const exp =
        rev * P[1] +
        add.reduce((a, x) => a + x.cost / 120, 0) +
        (m > 6 ? add.reduce((a, x) => a + (x.rev / 12) * -0.45, 0) : 0);
      const capex = 0.6 + add.reduce((a, x) => a + (m <= 12 ? (x.cashOut * 0.3) / 12 : 0), 0);
      const np = rev - exp;
      bal += np + 0.92 - 0.42 - capex - np * 0.15;
      rows.push({
        lbl: `${MON[dt.getMonth()]} ${String(dt.getFullYear()).slice(2)}`,
        q: Math.floor((m - 1) / 3),
        rev,
        exp,
        np,
        bal,
      });
    }
    return { n, rows };
  }, [fcH, fcS, newCapexApproved]);

  // All Scenarios comparison
  const scenarioComparisons = useMemo(() => {
    const calc = (sc: 'Best' | 'Expected' | 'Worst') => {
      const P = { Best: [0.016, 0.83], Expected: [0.010, 0.847], Worst: [0.002, 0.875] }[sc];
      const n = { '3 Months': 3, '6 Months': 6, '12 Months': 12, '3 Years': 36 }[fcH];
      let bal = CASH;
      let totRev = 0;
      let totExp = 0;
      let totNp = 0;
      let minBal = CASH;
      for (let m = 1; m <= n; m++) {
        const dt = new Date(2026, 9 + m - 1, 1);
        const seas = dt.getMonth() === 1 ? 0.95 : 1;
        const rev = 21.82 * Math.pow(1 + P[0], m) * seas;
        const exp = rev * P[1];
        const np = rev - exp;
        bal += np + 0.92 - 0.42 - 0.6 - np * 0.15;
        totRev += rev;
        totExp += exp;
        totNp += np;
        if (bal < minBal) minBal = bal;
      }
      return { rev: totRev, exp: totExp, np: totNp, cash: bal, low: minBal };
    };
    return { Best: calc('Best'), Expected: calc('Expected'), Worst: calc('Worst') };
  }, [fcH]);

  // Financial Summary Aggregations
  const ytd = useMemo(() => agg([6, 7, 8, 9, 10, 11].map(MONTH)), []);
  const ly = useMemo(() => agg([0, 1, 2, 3, 4, 5].map(LYM)), []);
  const budRev = useMemo(() => BUD_REV.reduce((a, b) => a + b, 0), []);
  const budNp = useMemo(() => budRev * (1 - BUD_ER), [budRev]);
  const growth = ((ytd.rev / ly.rev - 1) * 100);
  const bvar = ((ytd.rev / budRev - 1) * 100);
  const ebm = (ytd.ebitda / ytd.rev) * 100;
  const runCash = Math.round(CASH / (10.92 / 30));
  const runAll = Math.round((CASH + 15) / (10.92 / 30));
  const onTrack = bvar > -2 && ebm >= 21;

  // Department Profitability rows
  const deptRows = useMemo(() => {
    return DEPT_INIT.map(([d, rev, exp, pr, pe, drv]) => ({
      d,
      rev,
      exp,
      pr,
      pe,
      drv,
      p: rev - exp,
      m: ((rev - exp) / rev) * 100,
      pm: ((pr - pe) / pr) * 100,
    }));
  }, []);

  // Action Dispatcher
  const handleAction = async (kind: string, targetId: string) => {
    const c = cmt.trim();
    const NEED_REASON = ['reject', 'analysis', 'info', 'revise', 'mitigate', 'accept', 'park', 'board', 'defer', 'turn'];
    if (NEED_REASON.includes(kind) && c.length < 5) {
      setErr('Add your reasoning (at least 5 characters) — it is recorded with the decision.');
      return;
    }
    setErr('');

    try {
      if (screen === 'capex') {
        const item = cxList.find((x) => x.id === targetId);
        if (!item) return;

        if (kind === 'approve') {
          if (item.cost > BOARD_LIM) {
            setErr(`Above your ₹ 25 Cr authority — use Recommend To Board.`);
            return;
          }
          await accountsService.decideCfoCapex(item.id, 'approve', c).catch(() => null);
          setCxList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'Approved', fresh: true, trail: [...x.trail, T('Approved', cfoName, NOW(), c)] } : x))
          );
          logDecision('CapEx', item.name, 'Approved', c || `ROI ${item.roi}% · payback ${item.pay} yrs`, `${cc(item.cost)} capex · +${cc(item.rev)} a year revenue`);
          say(`${item.name} approved — forecast and cash flow updated`);
        } else if (kind === 'board') {
          await accountsService.decideCfoCapex(item.id, 'recommend_board', c).catch(() => null);
          setCxList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'Board Review', trail: [...x.trail, T('Recommended to Board', cfoName, NOW(), c)] } : x))
          );
          logDecision('CapEx', item.name, 'Referred to Board', c, `${cc(item.cost)} capex`);
          say(`${item.name} added to the 24 Oct Board agenda`);
        } else if (kind === 'reject') {
          await accountsService.decideCfoCapex(item.id, 'reject', c).catch(() => null);
          setCxList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'Rejected', trail: [...x.trail, T('Rejected', cfoName, NOW(), c)] } : x))
          );
          logDecision('CapEx', item.name, 'Rejected', c, `Avoided ${cc(item.cost)} capex`);
          say(`${item.name} rejected`);
        } else if (kind === 'analysis') {
          await accountsService.decideCfoCapex(item.id, 'request_analysis', c).catch(() => null);
          setCxList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'Analysis Requested', trail: [...x.trail, T('Further analysis requested', cfoName, NOW(), c)] } : x))
          );
          say(`Analysis requested from ${item.by}`);
        }
      }

      if (screen === 'approvals') {
        const item = saList.find((x) => x.id === targetId);
        if (!item) return;

        if (kind === 'approve') {
          if (item.link) {
            const linked = cxList.find((y) => y.id === item.link);
            if (linked && linked.status !== 'Approved') {
              setErr(`Approve ${item.link} (${linked.name}) first — this loan funds it.`);
              return;
            }
          }
          await accountsService.decideCfoStrategicApproval(item.id, 'approve', c).catch(() => null);
          setSaList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'Approved', trail: [...x.trail, T('Approved', cfoName, NOW(), c)] } : x))
          );
          if (item.risk2 === 'R3') {
            setRkList((prev) =>
              prev.map((r) =>
                r.id === 'R3'
                  ? { ...r, lik: 3, d: 'Apex Pharma will supply 78% of drugs under the exclusive contract', trail: [...r.trail, T('Likelihood raised after SA-02 approval', cfoName, NOW())] }
                  : r
              )
            );
          }
          logDecision(item.type === 'Fund Raising' ? 'Funding' : 'Contract', item.title, 'Approved', c || item.note, `${item.impact >= 0 ? '+' : ''}${cc(item.impact)} a year`);
          say(`${item.id} approved${item.risk2 ? ' — vendor concentration risk raised to Critical' : ''}`);
        } else if (kind === 'reject') {
          await accountsService.decideCfoStrategicApproval(item.id, 'reject', c).catch(() => null);
          setSaList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'Rejected', trail: [...x.trail, T('Rejected', cfoName, NOW(), c)] } : x))
          );
          logDecision('Contract', item.title, 'Rejected', c, item.val);
          say(`${item.id} — rejected`);
        } else if (kind === 'info') {
          await accountsService.decideCfoStrategicApproval(item.id, 'request_info', c).catch(() => null);
          setSaList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'More Info Requested', trail: [...x.trail, T('More information requested', cfoName, NOW(), c)] } : x))
          );
          say(`${item.id} — more information requested`);
        } else if (kind === 'board') {
          await accountsService.decideCfoStrategicApproval(item.id, 'refer_board', c).catch(() => null);
          setSaList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'Board Review', trail: [...x.trail, T('Referred to Board', cfoName, NOW(), c)] } : x))
          );
          logDecision('Contract', item.title, 'Referred to Board', c, item.val);
          say(`${item.id} — referred to board`);
        }
      }

      if (screen === 'growth') {
        const item = goList.find((x) => x.id === targetId);
        if (!item) return;

        if (kind === 'advance') {
          const i = STAGES.indexOf(item.stage === 'Parked' ? 'Idea' : item.stage);
          const nextStage = STAGES[i + 1] || 'Approved';
          if (nextStage === 'Approved' && item.inv > BOARD_LIM) {
            setErr(`Investment of ${cc(item.inv)} needs Board approval — use Refer To Board.`);
            return;
          }
          await accountsService.decideCfoGrowthOpportunity(item.id, 'advance', c).catch(() => null);
          setGoList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, stage: nextStage, trail: [...x.trail, T(`Moved to ${nextStage}`, cfoName, NOW(), c)] } : x))
          );
          if (nextStage === 'Approved') {
            logDecision('Expansion', item.title, 'Approved', c, `${cc(item.inv)} investment · ${cc(item.rev)} a year by year ${item.yr}`);
          }
          say(`${item.title} moved to ${nextStage}`);
        } else if (kind === 'board') {
          await accountsService.decideCfoGrowthOpportunity(item.id, 'refer_board', c).catch(() => null);
          setGoList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, stage: 'Board Review', trail: [...x.trail, T('Referred to Board', cfoName, NOW(), c)] } : x))
          );
          logDecision('Expansion', item.title, 'Referred to Board', c, `${cc(item.inv)} investment`);
          say(`${item.title} added to the Board agenda`);
        } else if (kind === 'park') {
          await accountsService.decideCfoGrowthOpportunity(item.id, 'park', c).catch(() => null);
          setGoList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, stage: 'Parked', trail: [...x.trail, T('Parked', cfoName, NOW(), c)] } : x))
          );
          logDecision('Expansion', item.title, 'Deferred', c, 'No spend committed');
          say(`${item.title} parked`);
        } else if (kind === 'reject') {
          await accountsService.decideCfoGrowthOpportunity(item.id, 'reject', c).catch(() => null);
          setGoList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, stage: 'Rejected', trail: [...x.trail, T('Rejected', cfoName, NOW(), c)] } : x))
          );
          logDecision('Expansion', item.title, 'Rejected', c, '—');
          say(`${item.title} rejected`);
        }
      }

      if (screen === 'risks') {
        const item = rkList.find((x) => x.id === targetId);
        if (!item) return;

        if (kind === 'mitigate') {
          await accountsService.decideCfoStrategicRisk(item.id, 'mitigate', c).catch(() => null);
          setRkList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'Mitigation Requested', trail: [...x.trail, T(`Mitigation plan requested from ${item.owner}`, cfoName, NOW(), c)] } : x))
          );
          logDecision('Risk', item.t, 'Mitigation Requested', c, `${rate(item)} risk`);
          say(`${item.t} — mitigation plan requested`);
        } else if (kind === 'accept') {
          await accountsService.decideCfoStrategicRisk(item.id, 'accept', c).catch(() => null);
          setRkList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'Accepted', trail: [...x.trail, T('Risk accepted', cfoName, NOW(), c)] } : x))
          );
          logDecision('Risk', item.t, 'Accepted', c, `${rate(item)} risk`);
          say(`${item.t} — risk accepted`);
        } else if (kind === 'board') {
          await accountsService.decideCfoStrategicRisk(item.id, 'escalate_board', c).catch(() => null);
          setRkList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'With Board', trail: [...x.trail, T('Escalated to Board risk committee', cfoName, NOW(), c)] } : x))
          );
          logDecision('Risk', item.t, 'Escalated to Board', c, `${rate(item)} risk`);
          say(`${item.t} — escalated to board risk committee`);
        }
      }

      if (screen === 'alerts') {
        const item = alList.find((x) => x.id === targetId);
        if (!item) return;

        if (kind === 'ack') {
          await accountsService.actCfoExecutiveAlert(item.id, 'acknowledge', undefined, c).catch(() => null);
          setAlList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'Acknowledged', trail: [...x.trail, T('Acknowledged', cfoName, NOW(), c)] } : x))
          );
          say('Alert acknowledged');
        } else if (kind === 'assign') {
          if (!selVal) {
            setErr('Choose who should act on this alert.');
            return;
          }
          await accountsService.actCfoExecutiveAlert(item.id, 'assign', selVal, c).catch(() => null);
          setAlList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'Assigned', owner: selVal, trail: [...x.trail, T(`Assigned to ${selVal}`, cfoName, NOW(), c)] } : x))
          );
          say(`Assigned to ${selVal}`);
        } else if (kind === 'pack') {
          await accountsService.actCfoExecutiveAlert(item.id, 'add_board_pack', undefined, c).catch(() => null);
          setAlList((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'In Board Pack', trail: [...x.trail, T('Added to Board pack', cfoName, NOW(), c)] } : x))
          );
          say('Added to the Board pack risk section');
        }
      }

      if (screen === 'deptprof') {
        const dept = targetId;
        if (kind === 'turn') {
          await accountsService.requestCfoTurnaroundPlan(dept, c).catch(() => null);
          setDeptTrails((prev) => ({
            ...prev,
            [dept]: [...(prev[dept] || []), T('Turnaround plan requested', cfoName, NOW(), c)],
          }));
          logDecision('Budget', `${dept} turnaround plan`, 'Requested', c, 'Margin target to be set');
          say(`Turnaround plan requested for ${dept}`);
        } else if (kind === 'pack') {
          setDeptTrails((prev) => ({
            ...prev,
            [dept]: [...(prev[dept] || []), T('Added to Board pack', cfoName, NOW(), c)],
          }));
          say(`${dept} added to the Board pack`);
        }
      }

      if (screen === 'budget') {
        if (kind === 'approve') {
          await accountsService.decideCfoBudgetStrategy('approve', c).catch(() => null);
          setBudgetState((prev) => ({
            ...prev,
            status: 'Approved',
            trail: [...prev.trail, T('Strategy approved — sent to Board', cfoName, NOW(), c)],
          }));
          logDecision('Budget', 'FY 2027-28 budget strategy', 'Approved', c || 'Balanced growth with EBITDA margin expansion', 'Revenue ₹ 288 Cr · EBITDA ₹ 70.5 Cr · CapEx ₹ 46 Cr');
          say('FY 2027-28 budget strategy approved — goes to the Board on 24 Oct');
        } else if (kind === 'revise') {
          await accountsService.decideCfoBudgetStrategy('request_revision', c).catch(() => null);
          setBudgetState((prev) => ({
            ...prev,
            status: 'Revision Requested',
            trail: [...prev.trail, T('Revision requested', cfoName, NOW(), c)],
          }));
          logDecision('Budget', 'FY 2027-28 budget strategy', 'Revision requested', c, '—');
          say('Revision requested from the Finance Controller');
        }
      }

      if (screen === 'board') {
        if (kind === 'approve') {
          if (boardState.status === 'Approved') {
            say('Board pack already approved.');
            return;
          }
          await accountsService.approveCfoBoardReport(c).catch(() => null);
          setBoardState((prev) => ({
            ...prev,
            status: 'Approved',
            trail: [...prev.trail, T('Pack approved for circulation', cfoName, NOW(), c)],
          }));
          say('Board pack approved — ready to circulate');
        } else if (kind === 'pdf' || kind === 'ppt' || kind === 'pack') {
          const nm = { pdf: 'PDF report', ppt: 'presentation (12 slides)', pack: 'full Board pack (PDF + annexures)' }[kind as 'pdf' | 'ppt' | 'pack'];
          await accountsService.exportCfoBoardReport(kind).catch(() => null);
          setBoardState((prev) => ({
            ...prev,
            trail: [...prev.trail, T(`Exported ${nm}`, cfoName, NOW())],
          }));
          say(`${boardState.status === 'Approved' ? 'Exported ' : 'Exported DRAFT '}${nm}`);
        }
      }

      setCmt('');
      setSelVal('');
    } catch (err: any) {
      setErr(err?.message || 'Operation failed.');
    }
  };

  // Nav Badges
  const badges = {
    capex: cxList.filter((x) => x.status === 'Awaiting CFO').length,
    approvals: saList.filter((x) => x.status === 'Awaiting CFO').length,
    alerts: alList.filter((x) => x.status === 'Open').length,
    risks: rkList.filter((r) => rate(r) === 'Critical' && r.status === 'Monitoring').length,
    budget: budgetState.status === 'Awaiting CFO' ? 1 : 0,
    board: boardState.status === 'Draft' ? 1 : 0,
  };

  // 10-Question Data
  const lossDepts = deptRows.filter((d) => d.p < 0);
  const mriItem = cxList.find((x) => x.id === 'CX-01');
  const criticalRisks = rkList.filter((r) => rate(r) === 'Critical');

  const questions = [
    { q: 'Are we making money?', v: 'Yes', t: 'g', d: `Net profit ${cc(ytd.np)} YTD (${((ytd.np / ytd.rev) * 100).toFixed(1)}%); September ₹ 3.29 Cr`, target: 'pl' },
    { q: 'Which departments are profitable?', v: `${6 - lossDepts.length} of 6`, t: lossDepts.length ? 'a' : 'g', d: lossDepts.length ? `${lossDepts.map((d) => d.d).join(', ')} lost ${cc(-lossDepts.reduce((a, b) => a + b.p, 0))} in September` : 'All departments profitable', target: 'deptprof' },
    { q: 'What is our cash runway?', v: `${runAll} days`, t: runAll > 45 ? 'g' : 'a', d: `${runCash} days on cash alone · ${runAll - runCash} more from the ₹ 15 Cr undrawn credit line`, target: 'cash' },
    { q: 'Can we open a new hospital branch?', v: 'Not yet', t: 'r', d: `Hinjewadi needs ₹ 140 Cr; debt headroom is ${cc(proFormaDebt.head)} — needs an equity partner`, target: 'growth' },
    { q: 'Can we buy new MRI/CT equipment?', v: mriItem?.status === 'Approved' ? 'Approved' : 'Yes', t: 'g', d: `MRI ₹ 14.5 Cr at 70% debt keeps DSCR at ${proFormaDebt.dscr.toFixed(1)}x (covenant 1.5x)`, target: 'capex' },
    { q: 'Where is revenue leaking?', v: '₹ 1.4 Cr / month', t: 'a', d: 'OT idle capacity (58% utilisation) ~₹ 0.9 Cr; insurance disallowances 2.1% of claims ~₹ 0.5 Cr', target: 'deptprof' },
    { q: 'Which services are growing?', v: 'Oncology +34%', t: 'g', d: 'Cardiology +28% and MRI +22% lead; physiotherapy is the only decliner (−4%)', target: 'services' },
    { q: 'What are our biggest financial risks?', v: `${criticalRisks.length} critical`, t: 'r', d: criticalRisks.map((r) => r.t).join(' · ') || 'No critical risks', target: 'risks' },
    { q: 'Are we hitting annual targets?', v: onTrack ? 'On track' : 'At risk', t: onTrack ? 'g' : 'a', d: `Revenue ${(100 + bvar).toFixed(1)}% of YTD budget · EBITDA margin ${ebm.toFixed(1)}% vs 22% target`, target: 'budget' },
    { q: 'What should the board know today?', v: '3 headlines', t: 'b', d: `Growth +${growth.toFixed(0)}% · OT turnaround needed · ₹ 85 Cr tower needs a funding decision`, target: 'board' },
  ];

  // Current Screen Header Info
  const head = SCREENS[screen] || ['Overview', 'Dashboard', ''];

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', fontFamily: 'Inter, sans-serif', color: '#111827', background: '#F9FAFB' }}>
      {/* INNER CFO SIDEBAR NAVIGATION */}
      <aside style={{ width: '260px', flexShrink: 0, background: '#FFFFFF', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 20px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#2563EB',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '15px',
            }}
          >
            N
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>North Hospital</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>Financial Enterprise HMS</div>
          </div>
        </div>

        {/* Current Department Card */}
        <div style={{ margin: '0 16px 8px', padding: '12px 14px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>Current department</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#2563EB',
                background: '#EFF6FF',
                borderRadius: '4px',
                padding: '1px 6px',
              }}
            >
              FINANCE
            </span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '4px' }}>Accounts &amp; Finance</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
            CFO Office · Board &amp; Capital Strategy
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV.map(([groupLabel, items]) => (
            <React.Fragment key={groupLabel || 'top'}>
              {groupLabel && (
                <div
                  style={{
                    flexShrink: 0,
                    padding: '16px 8px 6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                  }}
                >
                  {groupLabel}
                </div>
              )}
              {items.map(([key, label]) => {
                const active = screen === key;
                const IconComponent = CFO_ICONS[key] || LayoutDashboard;
                const badgeCount = (badges as Record<string, number>)[key] || 0;
                const isRedBadge = key === 'alerts' || key === 'risks';

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => go(key)}
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: active ? '#EFF6FF' : 'transparent',
                      color: active ? '#2563EB' : '#374151',
                      fontWeight: active ? 600 : 500,
                      fontSize: '14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s ease',
                      width: '100%',
                    }}
                  >
                    <IconComponent size={18} color={active ? '#2563EB' : '#6B7280'} />
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {label}
                    </span>
                    {badgeCount > 0 && (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: '10px',
                          background: isRedBadge ? '#FEE2E2' : active ? '#DBEAFE' : '#F1F5F9',
                          color: isRedBadge ? '#B91C1C' : '#1D4ED8',
                        }}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>
        <AccountsSidebarUserFooter customName="Meera Rao" customRole="Chief Financial Officer · CFO-01" customInitials="MR" />
      </aside>

      {/* WORKSPACE MAIN BODY */}
      <main ref={mainRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <AccountsStickyAppBar
          activeRoleView={activeRoleView}
          onSelectRole={onSelectRole}
          workload={workload}
          breadcrumbScreen={head[1] || 'CFO Strategy & Board Workspace'}
          currentTime={currentTime}
          onOpenMaster={onOpenMaster}
        />
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* HERO HEADER CARD (Matches Pharmacy) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 700, color: '#111827', letterSpacing: '-0.01em', margin: 0 }}>
              {head[1]}
            </h1>
            <p style={{ fontSize: '14px', color: '#4b5563', marginTop: '6px', margin: 0, lineHeight: 1.5, maxWidth: '820px' }}>
              {head[2]}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {screen === 'board' ? (
              <button
                type="button"
                onClick={() => handleAction('approve', 'board')}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                }}
              >
                Approve Board Pack
              </button>
            ) : screen === 'decisions' ? (
              <button
                type="button"
                onClick={() => say(`Exported ${decList.length} decisions to CSV`)}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#111827',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Download size={14} /> Export CSV
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => go('board')}
                  style={{
                    height: '40px',
                    padding: '0 16px',
                    borderRadius: '10px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                  }}
                >
                  <Presentation size={15} /> Board Review
                </button>
                <button
                  type="button"
                  onClick={() => go('capex')}
                  style={{
                    height: '40px',
                    padding: '0 16px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    color: '#111827',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <PiggyBank size={15} color="#2563EB" /> Review CapEx
                </button>
                <button
                  type="button"
                  onClick={() => go('approvals')}
                  style={{
                    height: '40px',
                    padding: '0 16px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    color: '#111827',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Stamp size={15} color="#16A34A" /> Strategic Approvals
                </button>
                <button
                  type="button"
                  onClick={() => go('risks')}
                  style={{
                    height: '40px',
                    padding: '0 16px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    color: '#111827',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ShieldAlert size={15} color="#DC2626" /> Financial Risks
                </button>
              </>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SCREEN 1: DASHBOARD */}
        {/* ========================================================================= */}
        {screen === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top KPI Cards Grid (Matches Pharmacy) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div
                onClick={() => go('pl')}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>Total Revenue</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: '#eff6ff', color: '#2563eb' }}>
                    YTD
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#111827' }}>{cc(ytd.rev)}</span>
                  <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>{pc(growth)} vs last year</span>
                </div>
              </div>

              <div
                onClick={() => go('pl')}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>Total Expense</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: '#f3f4f6', color: '#4b5563' }}>
                    Operational
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#111827' }}>{cc(ytd.rev - ytd.np)}</span>
                  <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>{pc(((ytd.rev - ytd.np) / (ly.rev - ly.np) - 1) * 100)} vs LY</span>
                </div>
              </div>

              <div
                onClick={() => go('pl')}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>Net Profit</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: '#f0fdf4', color: '#16a34a' }}>
                    {((ytd.np / ytd.rev) * 100).toFixed(1)}% Margin
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#16a34a' }}>{cc(ytd.np)}</span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>accumulated YTD</span>
                </div>
              </div>

              <div
                onClick={() => go('cash')}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>Cash Available</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: '#f0f9ff', color: '#0284c7' }}>
                    {runAll} Days Cover
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#0284c7' }}>{cc(CASH)}</span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>incl. ₹15 Cr credit</span>
                </div>
              </div>
            </div>

            {/* Second KPI Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div
                onClick={() => go('pl')}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>EBITDA</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: ebm >= 22 ? '#f0fdf4' : '#fffbeb', color: ebm >= 22 ? '#16a34a' : '#d97706' }}>
                    Target 22%
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#111827' }}>{cc(ytd.ebitda)}</span>
                  <span style={{ fontSize: '12px', color: ebm >= 22 ? '#16a34a' : '#d97706', fontWeight: 600 }}>{ebm.toFixed(1)}% margin</span>
                </div>
              </div>

              <div
                onClick={() => go('budget')}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>Budget Variance</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: bvar >= 0 ? '#f0fdf4' : '#fef2f2', color: bvar >= 0 ? '#16a34a' : '#dc2626' }}>
                    {pc(bvar)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#111827' }}>{pc(bvar)}</span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>vs budget {cc(budRev)}</span>
                </div>
              </div>

              <div
                onClick={() => go('services')}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>Revenue Growth</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: '#f0fdf4', color: '#16a34a' }}>
                    YoY
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#16a34a' }}>{pc(growth)}</span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Apr–Sep vs last year</span>
                </div>
              </div>

              <div
                onClick={() => go('deptprof')}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 600 }}>Patient Revenue</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: '#f5f3ff', color: '#7c3aed' }}>
                    +14.2% YoY
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 700, color: '#7c3aed' }}>+14.2%</span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>IPD + OPD + Daycare</span>
                </div>
              </div>
            </div>

            {/* 10 QUESTIONS FOR THE CFO */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>What the CFO needs to know</h2>
                <span style={{ fontSize: '13px', color: '#4B5563' }}>Click any question to jump to the detailed analysis</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {questions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => go(item.target)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      alignItems: 'flex-start',
                      textAlign: 'left',
                      padding: '16px',
                      borderRadius: '10px',
                      border: '1px solid #E5E7EB',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', lineHeight: '1.4' }}>{item.q}</span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: '22px',
                          padding: '0 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          background: TC[item.t as keyof typeof TC].bg,
                          color: TC[item.t as keyof typeof TC].fg,
                        }}
                      >
                        {item.v}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#4B5563', lineHeight: '1.45' }}>{item.d}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CHARTS ROW (Revenue Trend, Profit Trend, Cash Trend, Dept Margins) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '16px' }}>
              {/* Revenue Trend */}
              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Revenue Trend</h2>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>Monthly · ₹ Cr · last 12 months</div>
                  </div>
                  <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600, background: '#eff6ff', padding: '3px 8px', borderRadius: '6px' }}>Record ₹ 21.82 Cr (Sep)</span>
                </div>
                <div style={{ position: 'relative', height: '140px', display: 'flex', alignItems: 'flex-end', gap: '4px', borderBottom: '1px solid #E5E7EB' }}>
                  {REV.map((v, i) => (
                    <div key={i} title={`${M12[i]}: ₹ ${v} Cr`} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{ width: '80%', maxWidth: '24px', borderRadius: '3px 3px 0 0', height: `${(v / 22) * 125}px`, background: i === 11 ? '#1D4ED8' : '#93C5FD' }}></div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {M12.map((m, i) => (
                    <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: '11px', color: '#6B7280' }}>{m}</span>
                  ))}
                </div>
              </div>

              {/* Cash Position Trend with ₹ 5 Cr buffer line */}
              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Cash Position Trend</h2>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>Month-end cash & bank · ₹ Cr</div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#B91C1C', fontWeight: 600, background: '#fef2f2', padding: '3px 8px', borderRadius: '6px' }}>Dashed: ₹ 5.0 Cr Buffer</span>
                </div>
                <div style={{ position: 'relative', height: '140px', display: 'flex', alignItems: 'flex-end', gap: '4px', borderBottom: '1px solid #E5E7EB' }}>
                  {/* Dashed Buffer line */}
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(cashBufferCr / 7.5) * 125}px`, borderTop: '1.5px dashed #DC2626', zIndex: 1 }}></div>
                  {CASH12.map((v, i) => (
                    <div key={i} title={`${M12[i]}: ₹ ${v} Cr`} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{ width: '80%', maxWidth: '24px', borderRadius: '3px 3px 0 0', height: `${(v / 7.5) * 125}px`, background: v < cashBufferCr ? '#DC2626' : '#0284C7', zIndex: 2 }}></div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {M12.map((m, i) => (
                    <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: '11px', color: '#6B7280' }}>{m}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* TABLES: Top Departments, Cost Centers, Upcoming Decisions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Top Revenue Departments (Sep 2026)</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {deptRows.slice().sort((a, b) => b.rev - a.rev).map((d) => (
                    <div key={d.d} onClick={() => go('deptprof', { sc: 'deptprof', id: d.d })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', background: '#F8FAFC', cursor: 'pointer', border: '1px solid #f1f5f9' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>{d.d}</div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Margin: {d.m.toFixed(1)}%</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>{cc(d.rev)}</div>
                        <div style={{ fontSize: '11px', color: d.m < 0 ? '#B91C1C' : '#15803D', fontWeight: 600, marginTop: '2px' }}>{d.m < 0 ? 'Loss' : 'Profit'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>Upcoming Major Decisions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cxList.filter((x) => x.status === 'Awaiting CFO').slice(0, 3).map((cx) => (
                    <div key={cx.id} onClick={() => go('capex', { sc: 'capex', id: cx.id })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: '#F8FAFC', cursor: 'pointer' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{cx.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>CapEx · Due: {cx.due}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{cc(cx.cost)}</div>
                        <span style={{ fontSize: '10px', background: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Awaiting CFO</span>
                      </div>
                    </div>
                  ))}
                  {saList.filter((x) => x.status === 'Awaiting CFO').slice(0, 2).map((sa) => (
                    <div key={sa.id} onClick={() => go('approvals', { sc: 'approvals', id: sa.id })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: '#F8FAFC', cursor: 'pointer' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{sa.title}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{sa.type}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{sa.val}</div>
                        <span style={{ fontSize: '10px', background: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Awaiting CFO</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: PROFIT & LOSS */}
        {/* ========================================================================= */}
        {screen === 'pl' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Period Segment Filter */}
            <div style={{ display: 'flex', gap: '6px', background: '#F3F4F6', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
              {(['Month', 'Quarter', 'Year'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlPer(p)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: plPer === p ? '#FFFFFF' : 'transparent',
                    color: plPer === p ? '#111827' : '#6B7280',
                    fontWeight: plPer === p ? 600 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: plPer === p ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* P&L Table */}
            <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', background: '#F8FAFC' }}>
                <span style={{ fontSize: '15px', fontWeight: 700 }}>Executive P&L Comparison (₹ Cr)</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px' }}>Line Item</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Current Period</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Comparison</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Change %</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>% of Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Revenue', cur: 21.82, prev: 21.17, b: true },
                    { label: 'Payroll', cur: 8.42, prev: 8.30, cost: true },
                    { label: 'Drugs & consumables', cur: 4.86, prev: 4.40, cost: true },
                    { label: 'Professional fees', cur: 2.08, prev: 2.02, cost: true },
                    { label: 'Other operating expenses', cur: 1.87, prev: 1.84, cost: true },
                    { label: 'EBITDA', cur: 4.59, prev: 4.61, b: true },
                    { label: 'Depreciation', cur: 0.92, prev: 0.92, cost: true },
                    { label: 'Interest', cur: 0.38, prev: 0.38, cost: true },
                    { label: 'Net Profit', cur: 3.29, prev: 3.31, b: true },
                  ].map((row, i) => {
                    const chg = ((row.cur / row.prev - 1) * 100);
                    const isGood = row.cost ? chg <= 0 : chg >= 0;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #F3F4F6', background: row.b ? '#F8FAFC' : 'transparent', fontWeight: row.b ? 700 : 400 }}>
                        <td style={{ padding: '10px 16px', color: '#111827' }}>{row.label}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>₹ {row.cur.toFixed(2)} Cr</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#6B7280' }}>₹ {row.prev.toFixed(2)} Cr</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: isGood ? '#15803D' : '#B91C1C', fontWeight: 600 }}>{pc(chg)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#6B7280' }}>{((row.cur / 21.82) * 100).toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: '12px 16px', fontSize: '12px', color: '#64748B', background: '#F8FAFC', borderTop: '1px solid #E5E7EB' }}>
                Note: Drug & consumable costs are growing faster than revenue — the main reason EBITDA margin is below the 22% target.
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 3: CASH FLOW */}
        {/* ========================================================================= */}
        {screen === 'cash' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '6px', background: '#F3F4F6', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
              {(['7 Days', '30 Days', '90 Days', '12 Months'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setCfView(v)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: cfView === v ? '#FFFFFF' : 'transparent',
                    color: cfView === v ? '#111827' : '#6B7280',
                    fontWeight: cfView === v ? 600 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Cash KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={{ background: '#FFF', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Current Balance</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#0284C7' }}>{cc(CASH)}</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>5 bank accounts · 08 Oct</div>
              </div>
              <div style={{ background: '#FFF', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Runway on Cash</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#16A34A' }}>{runCash} Days</div>
                <div style={{ fontSize: '11px', color: '#16A34A' }}>At average daily burn</div>
              </div>
              <div style={{ background: '#FFF', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Runway with Credit Line</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#2563EB' }}>{runAll} Days</div>
                <div style={{ fontSize: '11px', color: '#2563EB' }}>Includes ₹ 15 Cr overdraft line</div>
              </div>
              <div style={{ background: '#FFF', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Buffer Floor</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#DC2626' }}>₹ 5.00 Cr</div>
                <div style={{ fontSize: '11px', color: '#DC2626' }}>Target liquidity threshold</div>
              </div>
            </div>

            {/* Cash Warnings & Major Outflows Table */}
            <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Major Upcoming Cash Outflows (₹ 60 L+)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Date</th>
                    <th style={{ padding: '8px 12px' }}>Payment Narration</th>
                    <th style={{ padding: '8px 12px' }}>Type</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySeries.slice(0, 30).flatMap((x) => x.ev.filter((e) => e.a >= 0.6).map((e) => ({ ...e, date: x.lbl }))).map((pay, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{pay.date}</td>
                      <td style={{ padding: '8px 12px' }}>{pay.t}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(pay.k).bg, color: chip(pay.k).fg, fontWeight: 600 }}>
                          {pay.k}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#B91C1C' }}>₹ {pay.a.toFixed(2)} Cr</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 4: BALANCE SHEET */}
        {/* ========================================================================= */}
        {screen === 'bs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={{ background: '#FFF', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Total Assets</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>₹ 164.41 Cr</div>
                <div style={{ fontSize: '11px', color: '#16A34A' }}>+₹ 1.32 Cr vs August</div>
              </div>
              <div style={{ background: '#FFF', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Total Debt</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>₹ {proFormaDebt.debt.toFixed(2)} Cr</div>
                <div style={{ fontSize: '11px', color: '#2563EB' }}>{proFormaDebt.nl ? 'Includes newly approved loans' : 'Base debt'}</div>
              </div>
              <div style={{ background: '#FFF', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Debt / Equity</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: proFormaDebt.de > 0.8 ? '#DC2626' : '#111827' }}>
                  {proFormaDebt.de.toFixed(2)}x
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Policy Ceiling: 0.80x</div>
              </div>
              <div style={{ background: '#FFF', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>DSCR (Pro Forma)</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: proFormaDebt.dscr < 1.5 ? '#DC2626' : '#16A34A' }}>
                  {proFormaDebt.dscr.toFixed(1)}x
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Covenant Floor: ≥ 1.5x</div>
              </div>
            </div>

            {/* Debt Capacity Table */}
            <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Debt Capacity & Covenants for Capital Expansion</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Measure</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Today</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Pro Forma</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Governing Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Total Borrowings', cc(DEBT), cc(proFormaDebt.debt), '—'],
                    ['Debt / Equity Ratio', `${(DEBT / EQUITY).toFixed(2)}x`, `${proFormaDebt.de.toFixed(2)}x`, '0.80x ceiling'],
                    ['Debt Service Coverage Ratio (DSCR)', `${((4.59 * 12) / (0.38 * 12 + 0.42 * 12)).toFixed(1)}x`, `${proFormaDebt.dscr.toFixed(1)}x`, '≥ 1.5x floor'],
                    ['Borrowing Headroom', cc(EQUITY * 0.8 - DEBT), cc(proFormaDebt.head), 'Policy Ceiling'],
                  ].map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r[0]}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{r[1]}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#1D4ED8' }}>{r[2]}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6B7280' }}>{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 5: DEPARTMENT PROFITABILITY */}
        {/* ========================================================================= */}
        {screen === 'deptprof' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '6px', background: '#F3F4F6', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
                {(['Most Profitable', 'Least Profitable'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRank(r)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      background: rank === r ? '#FFFFFF' : 'transparent',
                      color: rank === r ? '#111827' : '#6B7280',
                      fontWeight: rank === r ? 600 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                      <th style={{ padding: '10px 16px' }}>Department</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Revenue</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Expense</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Profit / Loss</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Margin %</th>
                      <th style={{ padding: '10px 16px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptRows
                      .slice()
                      .sort((a, b) => (rank === 'Most Profitable' ? b.m - a.m : a.m - b.m))
                      .map((d) => (
                        <tr
                          key={d.d}
                          onClick={() => pick('deptprof', d.d)}
                          style={{
                            borderBottom: '1px solid #F3F4F6',
                            background: sel.deptprof === d.d ? '#EFF6FF' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <td style={{ padding: '10px 16px', fontWeight: 600 }}>{d.d}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>{cc(d.rev)}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: '#6B7280' }}>{cc(d.exp)}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: d.p < 0 ? '#B91C1C' : '#15803D' }}>
                            {cc(d.p)}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: d.m < 0 ? '#B91C1C' : '#111827' }}>
                            {d.m.toFixed(1)}%
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(d.m < 0 ? 'Loss-making' : d.m < 15 ? 'Thin margin' : 'Profitable').bg, color: chip(d.m < 0 ? 'Loss-making' : d.m < 15 ? 'Thin margin' : 'Profitable').fg, fontWeight: 600 }}>
                              {d.m < 0 ? 'Loss-making' : d.m < 15 ? 'Thin margin' : 'Profitable'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Inspection Panel */}
            {(() => {
              const selectedDept = deptRows.find((d) => d.d === sel.deptprof) || deptRows[0];
              return (
                <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase' }}>Department Inspection</div>
                      <div style={{ fontSize: '18px', fontWeight: 700 }}>{selectedDept.d}</div>
                    </div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(selectedDept.m < 0 ? 'Loss-making' : 'Profitable').bg, color: chip(selectedDept.m < 0 ? 'Loss-making' : 'Profitable').fg, fontWeight: 600 }}>
                      {selectedDept.m < 0 ? 'Loss-making' : 'Profitable'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Revenue</div>
                      <div style={{ fontSize: '16px', fontWeight: 700 }}>{cc(selectedDept.rev)}</div>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Margin</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: selectedDept.m < 0 ? '#B91C1C' : '#15803D' }}>{selectedDept.m.toFixed(1)}%</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#4B5563', lineHeight: '1.5' }}>
                    <strong>Clinical & Operational Driver:</strong> {selectedDept.drv}
                  </div>

                  {selectedDept.p < 0 && (
                    <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '12px', color: '#991B1B' }}>
                      <strong>Critical Action Required:</strong> Third consecutive loss-making month. Operating below breakeven utilization.
                    </div>
                  )}

                  {/* Turnaround Plan Directive Form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>CFO Directive / Turnaround Requirements</label>
                    <textarea
                      rows={3}
                      placeholder="Specify targets (e.g. improve surgeon utilization to 75%, renegotiate implant pricing)..."
                      value={cmt}
                      onChange={(e) => setCmt(e.target.value)}
                      style={{ padding: '8px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                    />
                    {err && <div style={{ fontSize: '11px', color: '#DC2626' }}>{err}</div>}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button
                        onClick={() => handleAction('turn', selectedDept.d)}
                        style={{ flex: 1, height: '36px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                      >
                        Request Turnaround Plan
                      </button>
                      <button
                        onClick={() => handleAction('pack', selectedDept.d)}
                        style={{ height: '36px', padding: '0 12px', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                      >
                        Add to Pack
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 6: SERVICE LINES */}
        {/* ========================================================================= */}
        {screen === 'services' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '6px', background: '#F3F4F6', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
              {(['Growth', 'Revenue', 'Margin'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSvcSort(s)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: svcSort === s ? '#FFFFFF' : 'transparent',
                    color: svcSort === s ? '#111827' : '#6B7280',
                    fontWeight: svcSort === s ? 600 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Sort by {s}
                </button>
              ))}
            </div>

            <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px' }}>Service Line</th>
                    <th style={{ padding: '10px 16px' }}>Department</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Revenue</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Volume</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Margin %</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>YoY Growth</th>
                    <th style={{ padding: '10px 16px' }}>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {SVC_INIT.slice()
                    .sort((a, b) => {
                      const idx = svcSort === 'Growth' ? 6 : svcSort === 'Revenue' ? 2 : 5;
                      return b[idx] - a[idx];
                    })
                    .map((svc, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600 }}>{svc[0]}</td>
                        <td style={{ padding: '10px 16px', color: '#6B7280' }}>{svc[1]}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>{cc(svc[2])}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#4B5563' }}>{svc[3].toLocaleString()} {svc[4]}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: svc[5] < 15 ? '#D97706' : '#15803D' }}>{svc[5]}%</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: svc[6] < 0 ? '#B91C1C' : '#15803D' }}>{pc(svc[6])}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(svc[6] < 0 ? 'Declining' : svc[6] >= 15 ? 'Growing' : 'Stable').bg, color: chip(svc[6] < 0 ? 'Declining' : svc[6] >= 15 ? 'Growing' : 'Stable').fg, fontWeight: 600 }}>
                            {svc[6] < 0 ? 'Declining' : svc[6] >= 15 ? 'Growing' : 'Stable'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 7: BUDGET STRATEGY */}
        {/* ========================================================================= */}
        {screen === 'budget' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '6px', background: '#F3F4F6', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
                {(['Department', 'Hospital', 'Growth'] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBudView(b)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      background: budView === b ? '#FFFFFF' : 'transparent',
                      color: budView === b ? '#111827' : '#6B7280',
                      fontWeight: budView === b ? 600 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {b} View
                  </button>
                ))}
              </div>

              {budView === 'Department' && (
                <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', background: '#F8FAFC' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700 }}>Department Operating Expense Budgets (₹ Cr)</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                        <th style={{ padding: '8px 14px' }}>Department</th>
                        <th style={{ padding: '8px 14px', textAlign: 'right' }}>FY27 Budget</th>
                        <th style={{ padding: '8px 14px', textAlign: 'right' }}>YTD Actual</th>
                        <th style={{ padding: '8px 14px', textAlign: 'right' }}>Variance</th>
                        <th style={{ padding: '8px 14px', textAlign: 'right' }}>FY28 Proposed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['OPD', 3.60, 1.96, -6.5, 3.95],
                        ['IPD', 8.23, 4.62, -3.8, 9.10],
                        ['Laboratory', 2.06, 1.27, 5.7, 2.30],
                        ['Radiology', 2.49, 1.29, -11.3, 2.95],
                        ['Pharmacy', 6.17, 3.21, -10.8, 6.60],
                        ['Administration', 1.46, 0.79, -6.8, 1.50],
                        ['HR', 0.55, 0.36, 13.8, 0.62],
                        ['IT', 1.10, 0.52, -19.0, 1.40],
                      ].map((r: any, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '8px 14px', fontWeight: 600 }}>{r[0]}</td>
                          <td style={{ padding: '8px 14px', textAlign: 'right' }}>₹ {r[1].toFixed(2)} Cr</td>
                          <td style={{ padding: '8px 14px', textAlign: 'right' }}>₹ {r[2].toFixed(2)} Cr</td>
                          <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, color: r[3] > 0 ? '#B91C1C' : '#15803D' }}>{pc(r[3])}</td>
                          <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#2563EB' }}>₹ {r[4].toFixed(2)} Cr</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Panel for Budget Strategy */}
            <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>Proposal Status</div>
                  <div style={{ fontSize: '17px', fontWeight: 700 }}>FY 2027-28 Budget Strategy</div>
                </div>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(budgetState.status).bg, color: chip(budgetState.status).fg, fontWeight: 600 }}>
                  {budgetState.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Revenue Target</div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>₹ 288.0 Cr</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>EBITDA Target</div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>₹ 70.5 Cr (24.5%)</div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#4B5563', lineHeight: '1.5' }}>
                Targets step-up margin from 22.1% to 24.5%, supported by the Operation Theatre turnaround directive and bulk pharmacy contracts.
              </div>

              {budgetState.status === 'Awaiting CFO' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Approver Rationale / Feedback</label>
                  <textarea
                    rows={3}
                    placeholder="Provide comment or revision directives..."
                    value={cmt}
                    onChange={(e) => setCmt(e.target.value)}
                    style={{ padding: '8px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                  />
                  {err && <div style={{ fontSize: '11px', color: '#DC2626' }}>{err}</div>}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button
                      onClick={() => handleAction('approve', 'budget')}
                      style={{ flex: 1, height: '36px', background: '#16A34A', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                    >
                      Approve Strategy
                    </button>
                    <button
                      onClick={() => handleAction('revise', 'budget')}
                      style={{ height: '36px', padding: '0 12px', background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                    >
                      Request Revision
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 8: FINANCIAL FORECASTING */}
        {/* ========================================================================= */}
        {screen === 'forecast' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '6px', background: '#F3F4F6', padding: '4px', borderRadius: '8px' }}>
                {(['3 Months', '6 Months', '12 Months', '3 Years'] as const).map((h) => (
                  <button
                    key={h}
                    onClick={() => setFcH(h)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: fcH === h ? '#FFFFFF' : 'transparent',
                      color: fcH === h ? '#111827' : '#6B7280',
                      fontWeight: fcH === h ? 600 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {h}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '6px', background: '#F3F4F6', padding: '4px', borderRadius: '8px' }}>
                {(['Best', 'Expected', 'Worst'] as const).map((sc) => (
                  <button
                    key={sc}
                    onClick={() => setFcS(sc)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: fcS === sc ? '#FFFFFF' : 'transparent',
                      color: fcS === sc ? '#111827' : '#6B7280',
                      fontWeight: fcS === sc ? 600 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {sc} Scenario
                  </button>
                ))}
              </div>
            </div>

            {/* Scenario Comparison Table */}
            <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Scenario Comparison ({fcH} Projection)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Financial Metric</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Best Case</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Expected Case</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Worst Case</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Cumulative Revenue', cc(scenarioComparisons.Best.rev), cc(scenarioComparisons.Expected.rev), cc(scenarioComparisons.Worst.rev)],
                    ['Cumulative Expense', cc(scenarioComparisons.Best.exp), cc(scenarioComparisons.Expected.exp), cc(scenarioComparisons.Worst.exp)],
                    ['Cumulative Net Profit', cc(scenarioComparisons.Best.np), cc(scenarioComparisons.Expected.np), cc(scenarioComparisons.Worst.np)],
                    ['Closing Cash Balance', cc(scenarioComparisons.Best.cash), cc(scenarioComparisons.Expected.cash), cc(scenarioComparisons.Worst.cash)],
                    ['Lowest Projected Cash Point', cc(scenarioComparisons.Best.low), cc(scenarioComparisons.Expected.low), cc(scenarioComparisons.Worst.low)],
                  ].map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r[0]}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: fcS === 'Best' ? '#1D4ED8' : '#374151', fontWeight: fcS === 'Best' ? 700 : 400 }}>{r[1]}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: fcS === 'Expected' ? '#1D4ED8' : '#374151', fontWeight: fcS === 'Expected' ? 700 : 400 }}>{r[2]}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: fcS === 'Worst' ? '#1D4ED8' : '#374151', fontWeight: fcS === 'Worst' ? 700 : 400 }}>{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 9: CAPEX PLANNING */}
        {/* ========================================================================= */}
        {screen === 'capex' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '6px', background: '#F3F4F6', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
                {(['Awaiting', 'All', 'Approved', 'Board', 'Rejected'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setCxF(f)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      background: cxF === f ? '#FFFFFF' : 'transparent',
                      color: cxF === f ? '#111827' : '#6B7280',
                      fontWeight: cxF === f ? 600 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {f} Projects
                  </button>
                ))}
              </div>

              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                      <th style={{ padding: '10px 16px' }}>Project</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Cost</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Expected ROI</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Payback</th>
                      <th style={{ padding: '10px 16px' }}>Risk</th>
                      <th style={{ padding: '10px 16px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cxList
                      .filter((x) =>
                        cxF === 'All'
                          ? true
                          : cxF === 'Awaiting'
                          ? x.status === 'Awaiting CFO' || x.status === 'Analysis Requested'
                          : cxF === 'Approved'
                          ? x.status === 'Approved'
                          : cxF === 'Board'
                          ? x.status === 'Board Review'
                          : x.status === 'Rejected'
                      )
                      .map((x) => (
                        <tr
                          key={x.id}
                          onClick={() => pick('capex', x.id)}
                          style={{
                            borderBottom: '1px solid #F3F4F6',
                            background: sel.capex === x.id ? '#EFF6FF' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{x.name}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>{x.id} · {x.dept}</div>
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>{cc(x.cost)}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: x.roi < 15 ? '#D97706' : '#15803D' }}>{x.roi}%</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: '#4B5563' }}>{x.pay} yrs</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(x.risk).bg, color: chip(x.risk).fg, fontWeight: 600 }}>{x.risk}</span>
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(x.status).bg, color: chip(x.status).fg, fontWeight: 600 }}>{x.status}</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Panel: Selected CapEx Detail & Actions */}
            {(() => {
              const selectedCx = cxList.find((x) => x.id === sel.capex) || cxList[0];
              const isOverAuthority = selectedCx.cost > BOARD_LIM;

              return (
                <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>{selectedCx.id} · {selectedCx.dept}</div>
                      <div style={{ fontSize: '17px', fontWeight: 700, margin: '2px 0' }}>{selectedCx.name}</div>
                      <div style={{ fontSize: '12px', color: '#4B5563' }}>Submitted by: {selectedCx.by}</div>
                    </div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(selectedCx.status).bg, color: chip(selectedCx.status).fg, fontWeight: 600 }}>
                      {selectedCx.status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Project Cost</div>
                      <div style={{ fontSize: '16px', fontWeight: 700 }}>{cc(selectedCx.cost)}</div>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Expected ROI</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: selectedCx.roi < 15 ? '#D97706' : '#15803D' }}>{selectedCx.roi}%</div>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Payback Period</div>
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>{selectedCx.pay} years</div>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>NPV @ 11%</div>
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>{cc(selectedCx.npv)}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#4B5563', lineHeight: '1.5' }}>
                    <strong>Clinical & Revenue Driver:</strong> {selectedCx.driver}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4B5563' }}>
                    <strong>Funding Structure:</strong> {selectedCx.fund}
                  </div>

                  {isOverAuthority && (
                    <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '12px', color: '#991B1B' }}>
                      <strong>Authority Boundary:</strong> Exceeds your ₹ 25 Cr CFO approval ceiling. Must be recommended to the Board of Trustees.
                    </div>
                  )}

                  {/* Audit Trail */}
                  {selectedCx.trail.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '10px', borderTop: '1px solid #E5E7EB' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Audit & Proposal History</span>
                      {selectedCx.trail.map((t, idx) => (
                        <div key={idx} style={{ fontSize: '11px', color: '#6B7280', padding: '4px 0' }}>
                          <strong>{t.t}</strong> — {t.who} ({t.when})
                          {t.c && <div style={{ color: '#374151', fontStyle: 'italic', marginTop: '2px' }}>"{t.c}"</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {['Awaiting CFO', 'Analysis Requested'].includes(selectedCx.status) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600 }}>Decision Rationale / Notes</label>
                      <textarea
                        rows={3}
                        placeholder="Required for Rejection or Requesting Analysis..."
                        value={cmt}
                        onChange={(e) => setCmt(e.target.value)}
                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                      />
                      {err && <div style={{ fontSize: '11px', color: '#DC2626' }}>{err}</div>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                        {isOverAuthority ? (
                          <button
                            onClick={() => handleAction('board', selectedCx.id)}
                            style={{ flex: 1, height: '36px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                          >
                            Recommend To Board
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction('approve', selectedCx.id)}
                            style={{ flex: 1, height: '36px', background: '#16A34A', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                          >
                            Approve CapEx
                          </button>
                        )}
                        <button
                          onClick={() => handleAction('analysis', selectedCx.id)}
                          style={{ height: '36px', padding: '0 12px', background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                        >
                          Request Analysis
                        </button>
                        <button
                          onClick={() => handleAction('reject', selectedCx.id)}
                          style={{ height: '36px', padding: '0 12px', background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 10: STRATEGIC APPROVALS */}
        {/* ========================================================================= */}
        {screen === 'approvals' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '6px', background: '#F3F4F6', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
                {(['Awaiting', 'All', 'Decided'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSaF(f)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      background: saF === f ? '#FFFFFF' : 'transparent',
                      color: saF === f ? '#111827' : '#6B7280',
                      fontWeight: saF === f ? 600 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                      <th style={{ padding: '10px 16px' }}>Decision</th>
                      <th style={{ padding: '10px 16px' }}>Type</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Annual Impact</th>
                      <th style={{ padding: '10px 16px' }}>Risk</th>
                      <th style={{ padding: '10px 16px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saList
                      .filter((x) => (saF === 'All' ? true : saF === 'Awaiting' ? x.status === 'Awaiting CFO' || x.status === 'More Info Requested' : x.status !== 'Awaiting CFO'))
                      .map((x) => (
                        <tr
                          key={x.id}
                          onClick={() => pick('approvals', x.id)}
                          style={{
                            borderBottom: '1px solid #F3F4F6',
                            background: sel.approvals === x.id ? '#EFF6FF' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{x.title}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>{x.id} · from {x.from}</div>
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(x.type).bg, color: chip(x.type).fg, fontWeight: 600 }}>{x.type}</span>
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: x.impact >= 0 ? '#15803D' : '#B91C1C' }}>
                            {x.impact >= 0 ? '+' : ''}{cc(x.impact)}
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(x.risk).bg, color: chip(x.risk).fg, fontWeight: 600 }}>{x.risk}</span>
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(x.status).bg, color: chip(x.status).fg, fontWeight: 600 }}>{x.status}</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Panel: Selected Approval Item */}
            {(() => {
              const selectedSa = saList.find((x) => x.id === sel.approvals) || saList[0];
              return (
                <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>{selectedSa.id} · {selectedSa.type}</div>
                      <div style={{ fontSize: '17px', fontWeight: 700, margin: '2px 0' }}>{selectedSa.title}</div>
                    </div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(selectedSa.status).bg, color: chip(selectedSa.status).fg, fontWeight: 600 }}>
                      {selectedSa.status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Contract Value</div>
                      <div style={{ fontSize: '15px', fontWeight: 700 }}>{selectedSa.val}</div>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Annual Impact</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: selectedSa.impact >= 0 ? '#15803D' : '#B91C1C' }}>
                        {selectedSa.impact >= 0 ? '+' : ''}{cc(selectedSa.impact)}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#4B5563', lineHeight: '1.5' }}>
                    <strong>Terms & Analysis:</strong> {selectedSa.note}
                  </div>

                  {selectedSa.link && (
                    <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#F0F9FF', border: '1px solid #BAE6FD', fontSize: '12px', color: '#0369A1' }}>
                      <strong>CapEx Dependency:</strong> Linked to project {selectedSa.link}. Must be approved first.
                    </div>
                  )}

                  {selectedSa.risk2 && (
                    <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '12px', color: '#991B1B' }}>
                      <strong>Risk Warning:</strong> Approving this agreement automatically elevates Strategic Risk R3 (Vendor Concentration) to Critical.
                    </div>
                  )}

                  {['Awaiting CFO', 'More Info Requested'].includes(selectedSa.status) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600 }}>Decision Rationale / Conditions</label>
                      <textarea
                        rows={3}
                        placeholder="Enter justification or specific terms..."
                        value={cmt}
                        onChange={(e) => setCmt(e.target.value)}
                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                      />
                      {err && <div style={{ fontSize: '11px', color: '#DC2626' }}>{err}</div>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                        <button
                          onClick={() => handleAction('approve', selectedSa.id)}
                          style={{ flex: 1, height: '36px', background: '#16A34A', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction('info', selectedSa.id)}
                          style={{ height: '36px', padding: '0 12px', background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                        >
                          More Info
                        </button>
                        <button
                          onClick={() => handleAction('reject', selectedSa.id)}
                          style={{ height: '36px', padding: '0 12px', background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleAction('board', selectedSa.id)}
                          style={{ height: '36px', padding: '0 12px', background: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                        >
                          Refer to Board
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 11: BOARD REPORTING */}
        {/* ========================================================================= */}
        {screen === 'board' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1E40AF' }}>What the Board Should Know Today (24 Oct 2026 Pack)</div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#1E3A8A', lineHeight: '1.6' }}>
                <li>Revenue is up {growth.toFixed(0)}% YoY with September recording an all-time high of ₹ 21.82 Cr.</li>
                <li>EBITDA margin of {ebm.toFixed(1)}% is slightly below the 22% target; Operation Theatre turnaround plan is the highest-leverage operational fix.</li>
                <li>The proposed ₹ 85 Cr 120-bed hospital tower expansion requires a board financing decision; internal borrowing headroom stands at {cc(proFormaDebt.head)}.</li>
              </ul>
            </div>

            {/* 5 Board Pack Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { key: 'rev', title: '1. Revenue Performance & Payer Mix', metrics: [['YTD Revenue', cc(ytd.rev)], ['YoY Growth', pc(growth)]], bullets: [`YTD revenue stands at ${cc(ytd.rev)}, +${growth.toFixed(1)}% vs last year.`, 'September set a single-month revenue record.'] },
                { key: 'prof', title: '2. Profitability & Cost Control', metrics: [['EBITDA', cc(ytd.ebitda)], ['Net Margin', `${((ytd.np / ytd.rev) * 100).toFixed(1)}%`]], bullets: [`Net profit reached ${cc(ytd.np)} at ${((ytd.np / ytd.rev) * 100).toFixed(1)}% net margin.`, 'Operation Theatre has been loss-making for 3 consecutive months; turnaround plan is active.'] },
                { key: 'cash', title: '3. Cash Runway & Debt Headroom', metrics: [['Cash & Bank', cc(CASH)], ['Pro Forma D/E', `${proFormaDebt.de.toFixed(2)}x`]], bullets: [`Cash liquidity stands at ${cc(CASH)} providing ${runAll} days of runway with the credit line.`, `DSCR remains at ${proFormaDebt.dscr.toFixed(1)}x, compliant with bank covenants (≥ 1.5x).`] },
                { key: 'growth', title: '4. Capital Expenditure & Growth Pipeline', metrics: [['Active Pipeline', '₹ 49.1 Cr'], ['Approved CapEx', cc(cxList.filter((x) => x.status === 'Approved').reduce((a, b) => a + b.cost, 0))]], bullets: ['Oncology (+34%), Cardiology (+28%), and MRI (+22%) drive volume growth.', ...cxList.filter((x) => x.status === 'Board Review').map((x) => `Referred to Board for decision: ${x.name} (${cc(x.cost)}).`)] },
                { key: 'risk', title: '5. Risk Register & Regulatory Governance', metrics: [['Critical Risks', String(criticalRisks.length)], ['Rising Risks', '4']], bullets: criticalRisks.map((r) => `Critical: ${r.t} — mitigation: ${r.mit}.`) },
              ].map((sect) => (
                <div key={sect.key} style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{sect.title}</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: '#4B5563' }}>
                      <input
                        type="checkbox"
                        checked={boardState.inc[sect.key] ?? true}
                        onChange={(e) => setBoardState((prev) => ({ ...prev, inc: { ...prev.inc, [sect.key]: e.target.checked } }))}
                      />
                      <span>Include in Export</span>
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {sect.metrics.map(([l, v], idx) => (
                      <div key={idx} style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', minWidth: '120px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{l}</div>
                        <div style={{ fontSize: '16px', fontWeight: 700 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#4B5563', lineHeight: '1.5' }}>
                    {sect.bullets.map((b, idx) => (
                      <li key={idx}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Export Actions Row */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '12px' }}>
              <button
                onClick={() => handleAction('pdf', 'board')}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', background: '#FFF', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Export PDF
              </button>
              <button
                onClick={() => handleAction('ppt', 'board')}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', background: '#FFF', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Export Presentation
              </button>
              <button
                onClick={() => handleAction('pack', 'board')}
                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563EB', color: '#FFF', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Export Full Board Pack
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 12: GROWTH OPPORTUNITIES */}
        {/* ========================================================================= */}
        {screen === 'growth' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '6px', background: '#F3F4F6', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
                {(['All', 'Idea', 'Feasibility', 'Business Case', 'Approved'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoF(g)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      background: goF === g ? '#FFFFFF' : 'transparent',
                      color: goF === g ? '#111827' : '#6B7280',
                      fontWeight: goF === g ? 600 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>

              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                      <th style={{ padding: '10px 16px' }}>Opportunity</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Investment</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Revenue / yr</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>IRR</th>
                      <th style={{ padding: '10px 16px' }}>Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goList
                      .filter((x) => (goF === 'All' ? true : x.stage === goF))
                      .map((x) => (
                        <tr
                          key={x.id}
                          onClick={() => pick('growth', x.id)}
                          style={{
                            borderBottom: '1px solid #F3F4F6',
                            background: sel.growth === x.id ? '#EFF6FF' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ fontWeight: 600 }}>{x.title}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>{x.id} · {x.type}</div>
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>{cc(x.inv)}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#15803D' }}>{cc(x.rev)}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#2563EB' }}>{x.irr}%</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(x.stage).bg, color: chip(x.stage).fg, fontWeight: 600 }}>{x.stage}</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Panel for Selected Growth Opportunity */}
            {(() => {
              const selectedGo = goList.find((x) => x.id === sel.growth) || goList[0];
              const exceedsBorrowing = selectedGo.inv * 0.6 > proFormaDebt.head;

              return (
                <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>{selectedGo.id} · {selectedGo.type}</div>
                      <div style={{ fontSize: '17px', fontWeight: 700, margin: '2px 0' }}>{selectedGo.title}</div>
                    </div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(selectedGo.stage).bg, color: chip(selectedGo.stage).fg, fontWeight: 600 }}>
                      {selectedGo.stage}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Required Investment</div>
                      <div style={{ fontSize: '15px', fontWeight: 700 }}>{cc(selectedGo.inv)}</div>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Revenue Potential</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#15803D' }}>{cc(selectedGo.rev)} / yr</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#4B5563', lineHeight: '1.5' }}>
                    <strong>Strategic Concept:</strong> {selectedGo.note}
                  </div>

                  {exceedsBorrowing && (
                    <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '12px', color: '#991B1B' }}>
                      <strong>Capital Ceiling:</strong> 60% debt funding ({cc(selectedGo.inv * 0.6)}) exceeds hospital debt headroom ({cc(proFormaDebt.head)}). Requires equity or private equity syndication.
                    </div>
                  )}

                  {!['Approved', 'Rejected', 'Board Review'].includes(selectedGo.stage) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600 }}>Evaluation Notes / Justification</label>
                      <textarea
                        rows={3}
                        placeholder="Add strategic evaluation or requirements..."
                        value={cmt}
                        onChange={(e) => setCmt(e.target.value)}
                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                      />
                      {err && <div style={{ fontSize: '11px', color: '#DC2626' }}>{err}</div>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                        <button
                          onClick={() => handleAction('advance', selectedGo.id)}
                          style={{ flex: 1, height: '36px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                        >
                          {selectedGo.stage === 'Business Case' ? 'Approve' : 'Advance Stage'}
                        </button>
                        <button
                          onClick={() => handleAction('board', selectedGo.id)}
                          style={{ height: '36px', padding: '0 12px', background: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                        >
                          Refer to Board
                        </button>
                        <button
                          onClick={() => handleAction('park', selectedGo.id)}
                          style={{ height: '36px', padding: '0 12px', background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                        >
                          Park
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 13: STRATEGIC RISKS */}
        {/* ========================================================================= */}
        {screen === 'risks' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 4x4 Risk Matrix */}
              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700 }}>Hospital Risk Matrix (Impact × Likelihood)</span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>Click any risk chip to inspect</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(4, 1fr)', gap: '6px' }}>
                  <span></span>
                  {LIK.map((h, i) => (
                    <span key={i} style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textAlign: 'center' }}>{h}</span>
                  ))}
                  {[3, 2, 1, 0].map((im) => (
                    <React.Fragment key={im}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center' }}>{IMP[im]}</span>
                      {[0, 1, 2, 3].map((lk) => {
                        const s = im + lk;
                        const cellSev = s >= 5 ? 'Critical' : s === 4 ? 'High' : s >= 2 ? 'Medium' : 'Low';
                        const cellBg = { Critical: '#FEE2E2', High: '#FEF3C7', Medium: '#DBEAFE', Low: '#DCFCE7' }[cellSev];
                        const matched = rkList.filter((r) => r.imp === im && r.lik === lk);

                        return (
                          <div key={lk} style={{ minHeight: '52px', borderRadius: '6px', background: cellBg, padding: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignContent: 'flex-start' }}>
                            {matched.map((r) => (
                              <button
                                key={r.id}
                                onClick={() => pick('risks', r.id)}
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: '#FFF',
                                  border: sel.risks === r.id ? '2px solid #000' : '1px solid #CBD5E1',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {r.id}
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Risk Register Table */}
              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                      <th style={{ padding: '10px 16px' }}>Risk</th>
                      <th style={{ padding: '10px 16px' }}>Rating</th>
                      <th style={{ padding: '10px 16px' }}>Trend</th>
                      <th style={{ padding: '10px 16px' }}>Owner</th>
                      <th style={{ padding: '10px 16px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rkList.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => pick('risks', r.id)}
                        style={{
                          borderBottom: '1px solid #F3F4F6',
                          background: sel.risks === r.id ? '#EFF6FF' : 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{r.id}: {r.t}</div>
                          <div style={{ fontSize: '11px', color: '#6B7280' }}>{r.d}</div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(rate(r)).bg, color: chip(rate(r)).fg, fontWeight: 600 }}>{rate(r)}</span>
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: r.trend === 'Rising' ? '#B91C1C' : '#374151' }}>{r.trend}</td>
                        <td style={{ padding: '10px 16px', color: '#4B5563' }}>{r.owner}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(r.status).bg, color: chip(r.status).fg, fontWeight: 600 }}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Panel: Selected Risk Detail */}
            {(() => {
              const selectedRk = rkList.find((r) => r.id === sel.risks) || rkList[0];
              const rRating = rate(selectedRk);

              return (
                <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>{selectedRk.id} · Owner: {selectedRk.owner}</div>
                      <div style={{ fontSize: '17px', fontWeight: 700, margin: '2px 0' }}>{selectedRk.t}</div>
                    </div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(rRating).bg, color: chip(rRating).fg, fontWeight: 600 }}>
                      {rRating}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Impact Rating</div>
                      <div style={{ fontSize: '15px', fontWeight: 700 }}>{IMP[selectedRk.imp]}</div>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Likelihood Rating</div>
                      <div style={{ fontSize: '15px', fontWeight: 700 }}>{LIK[selectedRk.lik]}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#4B5563', lineHeight: '1.5' }}>
                    <strong>Risk Exposure:</strong> {selectedRk.d}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4B5563', lineHeight: '1.5' }}>
                    <strong>Active Mitigation Strategy:</strong> {selectedRk.mit}
                  </div>

                  {selectedRk.status !== 'With Board' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600 }}>CFO Directive / Action Rationale</label>
                      <textarea
                        rows={3}
                        placeholder="Provide direction for mitigation or acceptance..."
                        value={cmt}
                        onChange={(e) => setCmt(e.target.value)}
                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                      />
                      {err && <div style={{ fontSize: '11px', color: '#DC2626' }}>{err}</div>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                        <button
                          onClick={() => handleAction('mitigate', selectedRk.id)}
                          style={{ flex: 1, height: '36px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                        >
                          Request Mitigation Plan
                        </button>
                        <button
                          onClick={() => handleAction('accept', selectedRk.id)}
                          style={{ height: '36px', padding: '0 12px', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                        >
                          Accept Risk
                        </button>
                        <button
                          onClick={() => handleAction('board', selectedRk.id)}
                          style={{ height: '36px', padding: '0 12px', background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                        >
                          Escalate to Board
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 14: FINANCIAL ALERTS */}
        {/* ========================================================================= */}
        {screen === 'alerts' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '6px', background: '#F3F4F6', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
                {(['Open', 'All', 'Handled'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setAlF(f)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      background: alF === f ? '#FFFFFF' : 'transparent',
                      color: alF === f ? '#111827' : '#6B7280',
                      fontWeight: alF === f ? 600 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {f} Alerts
                  </button>
                ))}
              </div>

              <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                      <th style={{ padding: '10px 16px' }}>Severity</th>
                      <th style={{ padding: '10px 16px' }}>Alert Type</th>
                      <th style={{ padding: '10px 16px' }}>Description</th>
                      <th style={{ padding: '10px 16px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alList
                      .filter((x) => (alF === 'All' ? true : alF === 'Open' ? x.status === 'Open' : x.status !== 'Open'))
                      .map((x) => (
                        <tr
                          key={x.id}
                          onClick={() => pick('alerts', x.id)}
                          style={{
                            borderBottom: '1px solid #F3F4F6',
                            background: sel.alerts === x.id ? '#EFF6FF' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(x.sev).bg, color: chip(x.sev).fg, fontWeight: 700 }}>{x.sev}</span>
                          </td>
                          <td style={{ padding: '10px 16px', fontWeight: 600 }}>{x.type}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{x.t}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>{x.d}</div>
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(x.status).bg, color: chip(x.status).fg, fontWeight: 600 }}>{x.status}</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Panel for Alert Item */}
            {(() => {
              const selectedAl = alList.find((x) => x.id === sel.alerts) || alList[0];

              return (
                <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>{selectedAl.type} · Severity: {selectedAl.sev}</div>
                      <div style={{ fontSize: '17px', fontWeight: 700, margin: '2px 0' }}>{selectedAl.t}</div>
                    </div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(selectedAl.status).bg, color: chip(selectedAl.status).fg, fontWeight: 600 }}>
                      {selectedAl.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#4B5563', lineHeight: '1.5' }}>
                    {selectedAl.d}
                  </div>

                  <button
                    onClick={() => go(selectedAl.go)}
                    style={{ height: '36px', background: '#F8FAFC', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}
                  >
                    Open Linked Analysis ({selectedAl.go.toUpperCase()})
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>Assign Responsible Executive</label>
                    <select
                      value={selVal}
                      onChange={(e) => setSelVal(e.target.value)}
                      style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                    >
                      <option value="">Select executive...</option>
                      {['Finance Controller', 'Accounts Manager', 'COO', 'Medical Director', 'Revenue Cycle Head'].map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      <button
                        onClick={() => handleAction('assign', selectedAl.id)}
                        style={{ flex: 1, height: '36px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                      >
                        Assign
                      </button>
                      <button
                        onClick={() => handleAction('ack', selectedAl.id)}
                        style={{ height: '36px', padding: '0 12px', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleAction('pack', selectedAl.id)}
                        style={{ height: '36px', padding: '0 12px', background: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                      >
                        Add to Board Pack
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 15: EXECUTIVE DECISIONS */}
        {/* ========================================================================= */}
        {screen === 'decisions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '6px', background: '#F3F4F6', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
              {(['All', 'Investment', 'CapEx', 'Budget', 'Expansion'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setDecF(c)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: decF === c ? '#FFFFFF' : 'transparent',
                    color: decF === c ? '#111827' : '#6B7280',
                    fontWeight: decF === c ? 600 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px' }}>Date</th>
                    <th style={{ padding: '10px 16px' }}>Category</th>
                    <th style={{ padding: '10px 16px' }}>Decision Subject</th>
                    <th style={{ padding: '10px 16px' }}>Outcome</th>
                    <th style={{ padding: '10px 16px' }}>Recorded Rationale</th>
                    <th style={{ padding: '10px 16px' }}>Financial Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {decList
                    .filter((x) => (decF === 'All' ? true : x.cat === decF))
                    .map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid #F3F4F6', background: d.fresh ? '#F0FDF4' : 'transparent' }}>
                        <td style={{ padding: '10px 16px', color: '#6B7280' }}>{d.date}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(d.cat).bg, color: chip(d.cat).fg, fontWeight: 600 }}>{d.cat}</span>
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: '#111827' }}>{d.t}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: chip(d.out).bg, color: chip(d.out).fg, fontWeight: 600 }}>{d.out}</span>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#4B5563' }}>{d.why}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1E293B' }}>{d.imp}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TOAST NOTIFICATION */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              background: '#111827',
              color: '#FFFFFF',
              padding: '12px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 999,
            }}
          >
            <CheckCircle2 size={16} color="#4ADE80" />
            <span>{toast}</span>
          </div>
        )}
        </div>
      </main>
    </div>
  );
};
