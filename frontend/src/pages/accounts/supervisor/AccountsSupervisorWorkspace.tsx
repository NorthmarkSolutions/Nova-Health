import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AccountsStickyAppBar, RoleViewKey } from '../components/AccountsStickyAppBar';
import { AccountsSidebarUserFooter } from '../components/AccountsSidebarUserFooter';
import {
  LayoutDashboard,
  BookCheck,
  ReceiptText,
  WalletCards,
  Landmark,
  HandCoins,
  FileCheck,
  FileSearch,
  CalendarCheck,
  Users,
  TriangleAlert,
  ScrollText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Check,
  X,
  ArrowRight,
  Filter,
  FileText,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Eye,
  ShieldAlert,
  Lock,
  Scale,
  Building2,
  Calendar,
  UserCheck,
  Send
} from 'lucide-react';
import {
  accountsService,
  ApprovalRequestItem,
  SupervisorDashboardResponse,
  DailyCloseResponse,
  EscalationItem,
  TeamPerformanceMember,
  CollectionCaseItem,
  WriteOffRequestItem,
  AuditLogItem
} from '../../../services/accountsService';

// Utility formatters
const fmt = (n: number | string) => '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const fmt2 = (n: number | string) => '₹ ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const hm = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};

const LIMIT: Record<string, number> = {
  Journal: 50000,
  'Vendor Bill': 100000,
  Expense: 25000,
  Reconciliation: 500000,
  'GST Batch': Infinity,
  Document: Infinity
};

const ACTIONS: Record<string, Array<[string, string]>> = {
  Journal: [['Approve', 'approve'], ['Return For Correction', 'return'], ['Reject', 'reject'], ['Escalate To Manager', 'escalate']],
  'Vendor Bill': [['Approve', 'approve'], ['Return', 'return'], ['Reject', 'reject'], ['Escalate', 'escalate']],
  Expense: [['Approve', 'approve'], ['Return', 'return'], ['Reject', 'reject'], ['Escalate', 'escalate']],
  Reconciliation: [['Approve Match', 'approve'], ['Return Match', 'return'], ['Escalate Variance', 'escalate']],
  'GST Batch': [['Approve GST Batch', 'approve'], ['Return Batch', 'return'], ['Escalate Issue', 'escalate']],
  Document: [['Approve Documentation', 'approve'], ['Request Additional Evidence', 'evidence'], ['Return Record', 'return']]
};

const ESC_ACTIONS: Array<[string, string]> = [
  ['Forward To Manager', 'forward'],
  ['Add Notes', 'note'],
  ['Track Resolution', 'track']
];

const ESC_REASONS = ['High Amount', 'Compliance Risk', 'Duplicate Risk', 'Budget Violation', 'Fraud Suspicion'];

const TYPE_SHORT: Record<string, string> = {
  Journal: 'Journal',
  'Vendor Bill': 'Vendor Bill',
  Expense: 'Expense',
  Reconciliation: 'Bank Match',
  'GST Batch': 'GST Batch',
  Document: 'Document'
};

const TYPE_SCREEN: Record<string, string> = {
  Journal: 'journals',
  'Vendor Bill': 'bills',
  Expense: 'expenses',
  Reconciliation: 'recon',
  'GST Batch': 'gst',
  Document: 'docs'
};

const SCREEN_TYPE: Record<string, string> = {
  journals: 'Journal',
  bills: 'Vendor Bill',
  expenses: 'Expense',
  recon: 'Reconciliation',
  gst: 'GST Batch',
  docs: 'Document'
};

const EXECS = ['Priya Nair', 'Arjun Rao', 'Sneha Kulkarni', 'Imran Shaikh'];
const STAGES = ['Due Today', 'Promised To Pay', 'Follow-up Required', 'Escalated'];

const CH: Record<string, [string, string]> = {
  Pending: ['#EFF6FF', '#1D4ED8'],
  Approved: ['#F0FDF4', '#15803D'],
  Returned: ['#FFFBEB', '#B45309'],
  Rejected: ['#FEF2F2', '#B91C1C'],
  Escalated: ['#FEF2F2', '#B91C1C'],
  'With Manager': ['#F0F9FF', '#0369A1'],
  'Evidence Requested': ['#FFFBEB', '#B45309'],
  High: ['#FEF2F2', '#B91C1C'],
  Medium: ['#FFFBEB', '#B45309'],
  Low: ['#F3F4F6', '#374151'],
  'Above Limit': ['#F0F9FF', '#0369A1'],
  'Within Limit': ['#F3F4F6', '#374151'],
  'Missing Docs': ['#FEF2F2', '#B91C1C'],
  Matched: ['#F0FDF4', '#15803D'],
  'Quantity Mismatch': ['#FFFBEB', '#B45309'],
  'Price Mismatch': ['#FFFBEB', '#B45309'],
  'Duplicate Risk': ['#FEF2F2', '#B91C1C'],
  'Non-PO': ['#F3F4F6', '#374151'],
  'Budget Exceeded': ['#FEF2F2', '#B91C1C'],
  'Within Budget': ['#F0FDF4', '#15803D'],
  'Manual Match': ['#FFFBEB', '#B45309'],
  Variance: ['#FFFBEB', '#B45309'],
  'Auto Match': ['#F0FDF4', '#15803D'],
  Clean: ['#F0FDF4', '#15803D'],
  Uploaded: ['#F0F9FF', '#0369A1'],
  'High Amount': ['#F0F9FF', '#0369A1'],
  'Compliance Risk': ['#FFFBEB', '#B45309'],
  'Budget Violation': ['#FFFBEB', '#B45309'],
  'Fraud Suspicion': ['#FEF2F2', '#B91C1C'],
  'Due Today': ['#FFFBEB', '#B45309'],
  'Promised To Pay': ['#EFF6FF', '#1D4ED8'],
  'Follow-up Required': ['#F3F4F6', '#374151'],
  Open: ['#F0FDF4', '#15803D'],
  Closed: ['#EFF6FF', '#1D4ED8'],
  Locked: ['#F3F4F6', '#374151'],
  Submitted: ['#F3F4F6', '#374151'],
  Forwarded: ['#F0F9FF', '#0369A1'],
  'Daily Close': ['#EFF6FF', '#1D4ED8'],
  Reassigned: ['#F3F4F6', '#374151'],
  'Write-off': ['#FFFBEB', '#B45309'],
  Note: ['#F3F4F6', '#374151'],
  'Awaiting forward': ['#FFFBEB', '#B45309'],
  'Forwarded to Manager': ['#F0F9FF', '#0369A1']
};

const chip = (st: string) => {
  const c = CH[st] || (/Exceptions$/.test(st) ? ['#FFFBEB', '#B45309'] : ['#F3F4F6', '#374151']);
  return { label: st, bg: c[0], fg: c[1] };
};

const TONE: Record<string, [string, string, string]> = {
  blue: ['#EFF6FF', '#2563EB', '#6B7280'],
  green: ['#F0FDF4', '#16A34A', '#15803D'],
  amber: ['#FFFBEB', '#F59E0B', '#B45309'],
  red: ['#FEF2F2', '#DC2626', '#B91C1C'],
  gray: ['#F3F4F6', '#6B7280', '#6B7280']
};

const SEV: Record<string, { bg: string; bd: string; fg: string; tag: string }> = {
  critical: { bg: '#FEF2F2', bd: '#FECACA', fg: '#991B1B', tag: 'Critical' },
  warning: { bg: '#FFFBEB', bd: '#FDE68A', fg: '#92400E', tag: 'Warning' },
  info: { bg: '#F0F9FF', bd: '#BAE6FD', fg: '#075985', tag: 'Info' }
};

const SCREENS: Record<string, [string, string, string]> = {
  dashboard: ['Overview', 'Supervisor Dashboard', 'What is waiting, overdue, returned or escalated — and what will block today’s close.'],
  journals: ['Approvals', 'Journal Approvals', 'Review journals submitted by Accounts Executives before they reach the Accounts Manager.'],
  bills: ['Approvals', 'Vendor Bill Approvals', 'Check PO · GRN · invoice match results before bills are scheduled for payment.'],
  expenses: ['Approvals', 'Expense Approvals', 'Approve department expense requests against budget, cost center and evidence.'],
  recon: ['Approvals', 'Reconciliation Reviews', 'Review bank matches, manual matches and variances created by executives.'],
  collections: ['Receivables', 'Collection Oversight', 'Monitor the recovery pipeline, reassign work and decide write-off requests.'],
  gst: ['Compliance', 'GST Review', 'Review GST batches prepared by executives before the Finance Controller files.'],
  docs: ['Compliance', 'Document Validation', 'Records whose supporting evidence needs validation before close.'],
  close: ['Operations', 'Daily Close', 'Clear every approval, reconciliation and exception — then close and lock today.'],
  team: ['Tracking', 'Team Activity', 'Workload, throughput and quality across your Accounts Executives.'],
  escalations: ['Tracking', 'Escalations', 'Transactions that need Accounts Manager review.'],
  audit: ['Tracking', 'Audit Trail', 'Read-only record of approvals, returns, rejections, escalations and close actions.']
};

const NAV_GROUPS: Array<[string, Array<[string, string]>]> = [
  ['Overview', [['dashboard', 'Dashboard']]],
  ['Approvals', [['journals', 'Journal Approvals'], ['bills', 'Vendor Bill Approvals'], ['expenses', 'Expense Approvals'], ['recon', 'Reconciliation Reviews']]],
  ['Receivables', [['collections', 'Collection Oversight']]],
  ['Compliance', [['gst', 'GST Review'], ['docs', 'Document Validation']]],
  ['Operations', [['close', 'Daily Close']]],
  ['Tracking', [['team', 'Team Activity'], ['escalations', 'Escalations'], ['audit', 'Audit Trail']]]
];

const ICONS: Record<string, React.ReactElement> = {
  dashboard: <LayoutDashboard size={18} />,
  journals: <BookCheck size={18} />,
  bills: <ReceiptText size={18} />,
  expenses: <WalletCards size={18} />,
  recon: <Landmark size={18} />,
  collections: <HandCoins size={18} />,
  gst: <FileCheck size={18} />,
  docs: <FileSearch size={18} />,
  close: <CalendarCheck size={18} />,
  team: <Users size={18} />,
  escalations: <TriangleAlert size={18} />,
  audit: <ScrollText size={18} />
};

export interface WorkspaceItem {
  id: string;
  type: string;
  ref: string;
  title: string;
  dept: string;
  amt: number;
  by: string;
  sub: string;
  age: number;
  pri: 'High' | 'Medium' | 'Low';
  status: string;
  src?: string;
  docs: string[];
  warns: Array<{ sev: 'critical' | 'warning' | 'info'; t: string }>;
  kv: Array<[string, string]>;
  lines?: Array<[string, string, string, number]>;
  match?: {
    po: [string, number, number];
    grn: [string, number];
    inv: [string, number, number];
    result: string;
    note?: string;
  };
  budget?: [string, number, number];
  dupOf?: string;
  variance?: number;
  manual?: boolean;
  ex?: number;
  missing?: number;
  mismatch?: number;
  audit?: boolean;
  escReason?: string;
  escAt?: string;
  res?: string;
  notes: Array<{ who: string; when: string; t: string }>;
  trail: Array<{ t: string; who: string; when: string; c?: string }>;
}

export interface CollectionCard {
  id: string;
  cust: string;
  type: string;
  inv: string;
  amt: number;
  age: number;
  stage: string;
  owner: string;
  last: string;
  next: string;
  reviewed?: boolean;
  mgr?: boolean;
  wo?: {
    amt: number;
    reason: string;
    status: string;
  };
}

export interface TeamMember {
  name: string;
  code: string;
  processed: number;
  approved: number;
  returned: number;
  errors: number;
}

export interface AuditEntry {
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

export const AccountsSupervisorWorkspace: React.FC<any> = ({
  activeRoleView = 'supervisor',
  onSelectRole = () => {},
  workload,
  currentTime,
  onOpenMaster
}) => {
  const [screen, setScreen] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('asScreen');
      return saved && SCREENS[saved] ? saved : 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const [q, setQ] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Record<string, string>>({
    dashboard: 'All',
    journals: 'Pending',
    bills: 'Pending',
    expenses: 'Pending',
    recon: 'Pending',
    gst: 'Pending',
    docs: 'Pending',
    escalations: 'Open',
    audit: 'This Week'
  });

  const [sel, setSel] = useState<Record<string, string>>({
    dashboard: 'B1',
    journals: 'J1',
    bills: 'B1',
    expenses: 'E1',
    recon: 'R1',
    gst: 'G1',
    docs: 'D1',
    escalations: 'X1'
  });

  // Decision inputs
  const [cmt, setCmt] = useState('');
  const [escR, setEscR] = useState('High Amount');
  const [ack, setAck] = useState(false);
  const [err, setErr] = useState('');
  const [showRes, setShowRes] = useState(false);

  // Collections state
  const [cSel, setCSel] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState('');

  // Team state
  const [tSel, setTSel] = useState('Priya Nair');

  // Audit state
  const [aUser, setAUser] = useState('All users');
  const [aMod, setAMod] = useState('All modules');
  const [aAct, setAAct] = useState('All actions');

  // Daily close state
  const [closeSt, setCloseSt] = useState<'Open' | 'Closed' | 'Locked'>('Open');
  const [closeEsc, setCloseEsc] = useState(false);
  const [closeLog, setCloseLog] = useState<Array<{ t: string; who: string; when: string }>>([
    { t: 'Pre-close check run — blockers found', who: 'Rahul Menon', when: '09:45' },
    { t: 'Billing shift 1 revenue batch received', who: 'Billing', when: '08:30' },
    { t: 'Bank statement imported · HDFC ••4417', who: 'System', when: '08:10' },
    { t: 'Day opened', who: 'System', when: '00:00' }
  ]);

  // Toast
  const [toast, setToast] = useState('');
  const toastTimeoutRef = useRef<any>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const showToast = (m: string) => {
    setToast(m);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(''), 3500);
  };

  // Seed Data Initializers
  const [items, setItems] = useState<WorkspaceItem[]>([
    {
      id: 'J1',
      type: 'Journal',
      ref: 'JV-2610-0150',
      title: 'Payroll – September salaries and statutory contributions',
      dept: 'HR / Payroll',
      amt: 1842600,
      by: 'Priya Nair',
      sub: '07 Oct, 10:20',
      age: 2,
      pri: 'High',
      status: 'Pending',
      src: 'System generated · PAYRUN-SEP-26',
      docs: ['payroll-register-sep.xlsx', 'bank-advice-sal0926.pdf'],
      warns: [],
      kv: [['Journal date', '07 Oct 2026'], ['Entry type', 'Payroll posting']],
      lines: [['5410 Salary Expense', '1120 HDFC Bank – Current A/c', 'CC-100 Administration', 1842600]],
      notes: [],
      trail: [{ t: 'Submitted', who: 'Priya Nair', when: '07 Oct, 10:20' }]
    },
    {
      id: 'J2',
      type: 'Journal',
      ref: 'JV-2610-0144',
      title: 'Doctor fee accrual – September IPD cases',
      dept: 'Billing',
      amt: 418000,
      by: 'Priya Nair',
      sub: '07 Oct, 09:12',
      age: 3,
      pri: 'High',
      status: 'Pending',
      src: 'System generated · DRF-SEP-IPD',
      docs: ['doctor-share-sep.xlsx'],
      warns: [],
      kv: [['Journal date', '03 Oct 2026'], ['Entry type', 'Accrual']],
      lines: [
        ['5420 Doctor Fee Expense', '2150 Doctor Fee Payable', 'CC-220 IPD Wards', 268000],
        ['5420 Doctor Fee Expense', '2150 Doctor Fee Payable', 'CC-230 ICU', 150000]
      ],
      notes: [],
      trail: [{ t: 'Submitted', who: 'Priya Nair', when: '07 Oct, 09:12' }]
    },
    {
      id: 'J3',
      type: 'Journal',
      ref: 'JV-2610-0153',
      title: 'Reclass – OPD consumables issued to ICU',
      dept: 'Pharmacy & Inventory',
      amt: 28600,
      by: 'Arjun Rao',
      sub: '07 Oct, 07:40',
      age: 5,
      pri: 'Medium',
      status: 'Pending',
      src: 'Pharmacy GRN · IND-ICU-0221',
      docs: ['indent-transfer-icu.pdf'],
      warns: [{ sev: 'warning', t: 'Back-dated to 30 Sep 2026 — prior-period entry' }],
      kv: [['Journal date', '30 Sep 2026'], ['Entry type', 'Expense adjustment']],
      lines: [['5110 Medical Consumables · ICU', '5110 Medical Consumables · OPD', 'CC-230 ICU', 28600]],
      notes: [],
      trail: [{ t: 'Submitted', who: 'Arjun Rao', when: '07 Oct, 07:40' }]
    },
    {
      id: 'J4',
      type: 'Journal',
      ref: 'JV-2610-0152',
      title: 'Revenue adjustment – package discount IP-23011',
      dept: 'Billing',
      amt: 12500,
      by: 'Sneha Kulkarni',
      sub: '07 Oct, 10:55',
      age: 1,
      pri: 'Medium',
      status: 'Pending',
      src: 'Billing Invoice · IP-BILL-23011',
      docs: [],
      warns: [],
      kv: [['Journal date', '07 Oct 2026'], ['Entry type', 'Revenue adjustment']],
      lines: [['4120 IPD Revenue', '1210 Patient Receivable', 'CC-220 IPD Wards', 12500]],
      notes: [],
      trail: [{ t: 'Submitted', who: 'Sneha Kulkarni', when: '07 Oct, 10:55' }]
    },
    {
      id: 'J5',
      type: 'Journal',
      ref: 'JV-2610-0146',
      title: 'Bank charges – HDFC current account, September',
      dept: 'Banking',
      amt: 3840,
      by: 'Priya Nair',
      sub: '04 Oct, 16:20',
      age: 66,
      pri: 'Low',
      status: 'Pending',
      src: 'Bank Adjustment · HDFC-SEP-STMT',
      docs: ['hdfc-sep-charges.pdf'],
      warns: [],
      kv: [['Journal date', '04 Oct 2026'], ['Entry type', 'Bank adjustment']],
      lines: [['5910 Bank Charges', '1120 HDFC Bank – Current A/c', 'CC-100 Administration', 3840]],
      notes: [],
      trail: [{ t: 'Submitted', who: 'Priya Nair', when: '04 Oct, 16:20' }]
    },
    {
      id: 'B1',
      type: 'Vendor Bill',
      ref: 'VB-2610-0090',
      title: 'Apex Pharma – Ceftriaxone 1g inj',
      dept: 'Pharmacy',
      amt: 208768,
      by: 'Priya Nair',
      sub: '06 Oct, 14:30',
      age: 21,
      pri: 'High',
      status: 'Pending',
      src: 'GRN-PH-7781 · PO-PH-4471',
      docs: ['apd-9812.pdf'],
      warns: [{ sev: 'critical', t: 'Same vendor and invoice no. APD/26-27/9812 also exists as VB-2610-0091 (draft)' }],
      match: {
        po: ['PO-PH-4471', 4000, 46.6],
        grn: ['GRN-PH-7781', 4000],
        inv: ['APD/26-27/9812', 4000, 46.6],
        result: 'Duplicate Risk'
      },
      kv: [['Vendor', 'Apex Pharma Distributors'], ['GST', '12% · ₹ 22,368']],
      notes: [],
      trail: [{ t: 'Submitted', who: 'Priya Nair', when: '06 Oct, 14:30' }]
    },
    {
      id: 'B2',
      type: 'Vendor Bill',
      ref: 'VB-2610-0089',
      title: 'Medline Surgicals – surgical gloves',
      dept: 'Operation Theatre',
      amt: 103376,
      by: 'Priya Nair',
      sub: '07 Oct, 09:05',
      age: 3,
      pri: 'Medium',
      status: 'Pending',
      src: 'GRN-OT-2210 · PO-OT-1902',
      docs: ['ms-55120.pdf'],
      warns: [{ sev: 'warning', t: 'Invoice quantity 1,300 vs 1,250 received on GRN' }],
      match: {
        po: ['PO-OT-1902', 1300, 71],
        grn: ['GRN-OT-2210', 1250],
        inv: ['MS-55120', 1300, 71],
        result: 'Quantity Mismatch',
        note: 'Executive note: vendor confirms 50 boxes in transit; credit note if not delivered by 10 Oct.'
      },
      kv: [['Vendor', 'Medline Surgicals Pvt Ltd'], ['GST', '12% · ₹ 11,076']],
      notes: [],
      trail: [{ t: 'Submitted', who: 'Priya Nair', when: '07 Oct, 09:05' }]
    },
    {
      id: 'B3',
      type: 'Vendor Bill',
      ref: 'VB-2610-0083',
      title: 'Apex Pharma – Pantoprazole 40mg inj',
      dept: 'Pharmacy',
      amt: 44240,
      by: 'Arjun Rao',
      sub: '06 Oct, 16:10',
      age: 19,
      pri: 'Medium',
      status: 'Pending',
      src: 'GRN-PH-7764 · PO-PH-4460',
      docs: ['apd-9790.pdf', 'rate-revision-0110.pdf'],
      warns: [{ sev: 'warning', t: 'Invoice rate ₹ 19.75 vs PO rate ₹ 18.50 (+6.8%)' }],
      match: {
        po: ['PO-PH-4460', 2000, 18.5],
        grn: ['GRN-PH-7764', 2000],
        inv: ['APD/26-27/9790', 2000, 19.75],
        result: 'Price Mismatch',
        note: 'Executive note: rate revision letter dated 01 Oct attached.'
      },
      kv: [['Vendor', 'Apex Pharma Distributors'], ['GST', '12% · ₹ 4,740']],
      notes: [],
      trail: [{ t: 'Submitted', who: 'Arjun Rao', when: '06 Oct, 16:10' }]
    },
    {
      id: 'E1',
      type: 'Expense',
      ref: 'EXP-2610-029',
      title: 'AHU motor rewinding – ICU block',
      dept: 'Facilities',
      amt: 42800,
      by: 'Priya Nair',
      sub: '06 Oct, 15:00',
      age: 20,
      pri: 'High',
      status: 'Pending',
      src: 'Raised by Suresh Pawar (Facilities)',
      docs: ['quote-ahu.pdf'],
      warns: [],
      budget: ['Repairs – ICU block', 150000, 131500],
      kv: [['Cost center', 'CC-510 Facilities'], ['Requested by', 'Suresh Pawar'], ['Category', 'Repairs & Maintenance']],
      notes: [],
      trail: [{ t: 'Submitted', who: 'Priya Nair', when: '06 Oct, 15:00' }]
    },
    {
      id: 'E2',
      type: 'Expense',
      ref: 'EXP-2610-031',
      title: 'Urgent reagent purchase – vendor stock-out',
      dept: 'Laboratory',
      amt: 18400,
      by: 'Priya Nair',
      sub: '07 Oct, 09:40',
      age: 2,
      pri: 'High',
      status: 'Pending',
      src: 'Raised by Dr. Anita Desai (Laboratory)',
      docs: [],
      warns: [],
      budget: ['Lab consumables', 220000, 154000],
      kv: [['Cost center', 'CC-310 Laboratory'], ['Requested by', 'Dr. Anita Desai'], ['Category', 'Medical Consumables']],
      notes: [],
      trail: [{ t: 'Submitted', who: 'Priya Nair', when: '07 Oct, 09:40' }]
    },
    {
      id: 'R1',
      type: 'Reconciliation',
      ref: 'BS-02 · UPI/STL/071026',
      title: 'UPI settlement – Razorpay vs collections 06 Oct',
      dept: 'Billing Collections',
      amt: 342860,
      by: 'Priya Nair',
      sub: '07 Oct, 10:30',
      age: 1,
      pri: 'Medium',
      status: 'Pending',
      src: 'Billing Collections · RCPT-UPI-1006',
      docs: ['razorpay-settlement-0710.csv'],
      warns: [],
      variance: 2260,
      kv: [['Book voucher', 'RCPT-UPI-1006 · ₹ 3,45,120'], ['Match type', 'Suggested · 78%'], ['Difference', '₹ 2,260 · MDR']],
      notes: [],
      trail: [{ t: 'Submitted', who: 'Priya Nair', when: '07 Oct, 10:30' }]
    },
    {
      id: 'G1',
      type: 'GST Batch',
      ref: 'GST-OCT-W1',
      title: 'Outward batch 01–07 Oct · Billing, Pharmacy, Corporate',
      dept: 'Compliance',
      amt: 106950,
      by: 'Priya Nair',
      sub: '07 Oct, 08:50',
      age: 3,
      pri: 'High',
      status: 'Pending',
      src: 'GSTR-1 · October',
      docs: ['gstr1-draft-oct-w1.xlsx'],
      ex: 2,
      missing: 1,
      mismatch: 1,
      warns: [
        { sev: 'warning', t: 'INV-PH-26100451 tax mismatch — correction requested from Pharmacy' },
        { sev: 'info', t: 'INV-PH-26100418 reclassified as B2C (no GSTIN)' }
      ],
      kv: [['Invoices', '12 · 10 outward, 2 inward ITC'], ['Taxable value', '₹ 7,99,450'], ['GST amount', '₹ 1,06,950']],
      notes: [],
      trail: [{ t: 'Submitted', who: 'Priya Nair', when: '07 Oct, 08:50' }]
    },
    {
      id: 'D1',
      type: 'Document',
      ref: 'JV-2610-0152',
      title: 'Package discount – IP-23011 (approval note)',
      dept: 'Billing',
      amt: 12500,
      by: 'Sneha Kulkarni',
      sub: '07 Oct, 10:55',
      age: 1,
      pri: 'High',
      status: 'Pending',
      src: 'Journal · revenue adjustment',
      docs: [],
      audit: true,
      warns: [],
      kv: [['Record', 'Journal entry'], ['Evidence required', 'Discount approval note']],
      notes: [],
      trail: [{ t: 'Submitted', who: 'Sneha Kulkarni', when: '07 Oct, 10:55' }]
    },
    {
      id: 'X1',
      type: 'Vendor Bill',
      ref: 'VB-2610-0079',
      title: 'Siemens Healthineers – CT AMC renewal',
      dept: 'Radiology',
      amt: 486160,
      by: 'Priya Nair',
      sub: '06 Oct, 11:00',
      age: 24,
      pri: 'High',
      status: 'Escalated',
      escReason: 'High Amount',
      escAt: '06 Oct, 17:20',
      res: 'Awaiting forward',
      src: 'SES-RAD-101 · PO-RAD-0101',
      docs: ['shi-amc-2620.pdf', 'amc-comparison.xlsx'],
      warns: [],
      match: {
        po: ['PO-RAD-0101', 1, 412000],
        grn: ['SES-RAD-101', 1],
        inv: ['SHI/AMC/2620', 1, 412000],
        result: 'Matched'
      },
      notes: [{ who: 'Rahul Menon', when: '06 Oct, 17:20', t: 'AMC renewal 18% higher than last year — needs Manager sign-off.' }],
      trail: [
        { t: 'Submitted', who: 'Priya Nair', when: '06 Oct, 11:00' },
        { t: 'Escalated · High Amount', who: 'Rahul Menon', when: '06 Oct, 17:20' }
      ],
      kv: [['Vendor', 'Siemens Healthcare'], ['GST', '18%']]
    },
    {
      id: 'X2',
      type: 'Expense',
      ref: 'EXP-2610-022',
      title: 'Marketing hoardings – Q3 campaign',
      dept: 'Marketing',
      amt: 148000,
      by: 'Arjun Rao',
      sub: '05 Oct, 12:30',
      age: 46,
      pri: 'High',
      status: 'Escalated',
      escReason: 'Budget Violation',
      escAt: '06 Oct, 16:40',
      res: 'Awaiting forward',
      src: 'Raised by Neha Kapoor (Marketing)',
      docs: ['hoarding-quotes.pdf'],
      budget: ['Brand marketing', 300000, 276000],
      warns: [],
      notes: [],
      trail: [
        { t: 'Submitted', who: 'Arjun Rao', when: '05 Oct, 12:30' },
        { t: 'Escalated · Budget Violation', who: 'Rahul Menon', when: '06 Oct, 16:40' }
      ],
      kv: [['Cost center', 'CC-610 Marketing']]
    }
  ]);

  const [coll, setColl] = useState<CollectionCard[]>([
    {
      id: 'C1',
      cust: 'Star Health & Allied Insurance',
      type: 'Insurance',
      inv: 'CLM-STAR-22904',
      amt: 286400,
      age: 96,
      stage: 'Follow-up Required',
      owner: 'Priya Nair',
      last: '01 Oct · Call',
      next: 'Query status on discharge summary'
    },
    {
      id: 'C2',
      cust: 'Reliance Industries – Employee Health',
      type: 'Corporate',
      inv: 'INV-CORP-3296',
      amt: 418750,
      age: 41,
      stage: 'Due Today',
      owner: 'Priya Nair',
      last: '06 Oct · Call',
      next: 'Confirm NEFT release today'
    },
    {
      id: 'C3',
      cust: 'ICICI Lombard General Insurance',
      type: 'Insurance',
      inv: 'CLM-ICL-21788',
      amt: 512300,
      age: 63,
      stage: 'Promised To Pay',
      owner: 'Arjun Rao',
      last: '03 Oct · Call',
      next: 'Promise date 09 Oct'
    },
    {
      id: 'C4',
      cust: 'Larsen & Toubro Ltd',
      type: 'Corporate',
      inv: 'INV-CORP-3340',
      amt: 156200,
      age: 12,
      stage: 'Due Today',
      owner: 'Sneha Kulkarni',
      last: '—',
      next: 'First follow-up on due date'
    },
    {
      id: 'C5',
      cust: 'Ramesh Kulkarni · UHID 220871',
      type: 'Patient',
      inv: 'IP-BILL-22871',
      amt: 38600,
      age: 124,
      stage: 'Escalated',
      owner: 'Priya Nair',
      last: '20 Sep · Call',
      next: 'Write-off decision pending',
      reviewed: true,
      wo: {
        amt: 8600,
        reason: 'Hardship — patient has paid ₹ 30,000 in instalments; Billing recommends waiving the balance.',
        status: 'Pending'
      }
    },
    {
      id: 'C6',
      cust: 'Niva Bupa Health Insurance',
      type: 'Insurance',
      inv: 'CLM-NB-21650',
      amt: 198000,
      age: 104,
      stage: 'Escalated',
      owner: 'Arjun Rao',
      last: '02 Oct · Email',
      next: 'TPA escalation matrix level 2',
      reviewed: true,
      wo: {
        amt: 18000,
        reason: 'TPA disallowance for non-payable consumables — upheld after appeal.',
        status: 'Pending'
      }
    }
  ]);

  const [team, setTeam] = useState<TeamMember[]>([
    { name: 'Priya Nair', code: 'AE-01', processed: 24, approved: 61, returned: 4, errors: 2 },
    { name: 'Arjun Rao', code: 'AE-02', processed: 17, approved: 48, returned: 6, errors: 3 },
    { name: 'Sneha Kulkarni', code: 'AE-03', processed: 12, approved: 29, returned: 5, errors: 4 },
    { name: 'Imran Shaikh', code: 'AE-04', processed: 19, approved: 52, returned: 2, errors: 1 }
  ]);

  const [auditList, setAuditList] = useState<AuditEntry[]>([
    { id: 'A1', ts: '07 Oct 2026, 10:55', day: 0, user: 'Sneha Kulkarni', role: 'Accounts Executive', action: 'Submitted', module: 'Journal Approvals', ref: 'JV-2610-0152', detail: 'Revenue adjustment submitted' },
    { id: 'A2', ts: '07 Oct 2026, 10:20', day: 0, user: 'Priya Nair', role: 'Accounts Executive', action: 'Submitted', module: 'Journal Approvals', ref: 'JV-2610-0150', detail: 'System payroll journal verified and submitted' },
    { id: 'A3', ts: '07 Oct 2026, 10:02', day: 0, user: 'Rahul Menon', role: 'Accounts Supervisor', action: 'Forwarded', module: 'Vendor Bill Approvals', ref: 'VB-2610-0088', detail: 'Above ₹ 1 L — forwarded to Accounts Manager' },
    { id: 'A4', ts: '07 Oct 2026, 09:31', day: 0, user: 'Rahul Menon', role: 'Accounts Supervisor', action: 'Returned', module: 'Journal Approvals', ref: 'JV-2610-0147', detail: 'Attach GRN and split cost centers' },
    { id: 'A5', ts: '07 Oct 2026, 09:20', day: 0, user: 'Rahul Menon', role: 'Accounts Supervisor', action: 'Approved', module: 'Reconciliation Reviews', ref: 'NEFT/STAR/88213', detail: 'Auto-match 97% approved' },
    { id: 'A6', ts: '07 Oct 2026, 08:45', day: 0, user: 'Rahul Menon', role: 'Accounts Supervisor', action: 'Escalated', module: 'Escalations', ref: 'BS-05', detail: 'Compliance Risk' }
  ]);

  // Load live data from Backend API on mount
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const [dashRes, reqsRes, escRes, closeRes] = await Promise.all([
          accountsService.getSupervisorDashboard().catch(() => null),
          accountsService.getApprovalRequests().catch(() => []),
          accountsService.getEscalations().catch(() => []),
          accountsService.getDailyClose('2026-10-08').catch(() => null)
        ]);

        if (dashRes && dashRes.priority_queue?.length) {
          // Merge API priority queue items into items state
          // Items already loaded with rich mockup details
        }
        if (closeRes) {
          if (closeRes.is_locked) setCloseSt('Locked');
          else if (closeRes.status === 'closed') setCloseSt('Closed');
        }
      } catch (err) {
        console.error('Error fetching supervisor live data', err);
      }
    };
    fetchLiveData();
  }, []);

  const navigateTo = (sc: string, extra?: Record<string, any>) => {
    setScreen(sc);
    setCmt('');
    setErr('');
    setAck(false);
    setShowRes(false);
    if (extra?.sel) setSel(prev => ({ ...prev, ...extra.sel }));
    if (extra?.tab) setTab(prev => ({ ...prev, ...extra.tab }));
    try {
      localStorage.setItem('asScreen', sc);
    } catch {}
    if (mainRef.current) mainRef.current.scrollTop = 0;
  };

  // Helper getters
  const warnsOf = (it: WorkspaceItem) => {
    const w = [...it.warns];
    if (it.budget && it.budget[2] + it.amt > it.budget[1]) {
      w.unshift({
        sev: 'critical',
        t: `Budget exceeded — ${it.budget[0]} has ${fmt(Math.max(0, it.budget[1] - it.budget[2]))} left; request is ${fmt(it.amt)}`
      });
    }
    if (['Journal', 'Vendor Bill', 'Expense', 'Document'].includes(it.type) && !it.docs.length) {
      w.unshift({ sev: 'critical', t: 'Missing supporting documents' });
    }
    if (it.dupOf) {
      w.push({ sev: 'warning', t: `Duplicate request — ${it.dupOf}` });
    }
    return w;
  };

  const hasCrit = (it: WorkspaceItem) => warnsOf(it).some(w => w.sev === 'critical');

  const checkOf = (it: WorkspaceItem) => {
    if (it.type === 'Journal') return !it.docs.length ? 'Missing Docs' : it.amt > LIMIT.Journal ? 'Above Limit' : 'Within Limit';
    if (it.type === 'Vendor Bill') return it.match ? it.match.result : 'Non-PO';
    if (it.type === 'Expense') return it.budget && it.budget[2] + it.amt > it.budget[1] ? 'Budget Exceeded' : !it.docs.length ? 'Missing Docs' : it.dupOf ? 'Duplicate Risk' : 'Within Budget';
    if (it.type === 'Reconciliation') return it.manual ? 'Manual Match' : it.variance ? 'Variance' : 'Auto Match';
    if (it.type === 'GST Batch') return it.ex ? `${it.ex} Exceptions` : 'Clean';
    return it.docs.length ? 'Uploaded' : 'Missing Docs';
  };

  const ageLabel = (h: number) => (h < 1 ? '<1h' : h < 24 ? Math.round(h) + 'h' : Math.round(h / 24) + 'd');

  const closeStats = useMemo(() => {
    const pend = items.filter(i => i.status === 'Pending');
    const crit = pend.filter(hasCrit).length;
    const esc = items.filter(i => i.status === 'Escalated').length;
    return { pend: pend.length, crit, esc, blockers: pend.length + esc };
  }, [items]);

  // Main Decision Dispatcher
  const handleAction = async (kind: string) => {
    const curId = sel[screen];
    const it = items.find(x => x.id === curId);
    if (!it) return;

    if (kind === 'track') {
      setShowRes(!showRes);
      return;
    }

    if (closeSt === 'Locked') {
      showToast('Today is locked — changes need the Accounts Manager to reopen the day.');
      return;
    }

    const c = cmt.trim();
    const t = '07 Oct, ' + hm();
    const sup = 'Rahul Menon';

    if (['return', 'reject', 'escalate', 'evidence', 'note'].includes(kind) && c.length < 5) {
      setErr('Add a comment for the executive (at least 5 characters).');
      return;
    }

    if (kind === 'approve' && hasCrit(it) && !ack) {
      setErr('Tick the confirmation — this item has critical warnings.');
      return;
    }

    const over = it.amt > LIMIT[it.type];
    let patch: Partial<WorkspaceItem> = {};
    let act = '';
    let detail = '';
    let msg = '';

    if (kind === 'approve') {
      patch = {
        status: over ? 'With Manager' : 'Approved',
        trail: [...it.trail, { t: over ? 'Verified & forwarded to Accounts Manager' : 'Approved', who: sup, when: t, c }]
      };
      act = over ? 'Forwarded' : 'Approved';
      detail = over ? `Above ${fmt(LIMIT[it.type])} — forwarded to Accounts Manager` : c || 'Approved';
      msg = `${it.ref} ${over ? 'verified and forwarded to Accounts Manager' : 'approved'}`;

      // Call API if matching backend endpoint exists
      try {
        await accountsService.processDecision(it.id, {
          decision: over ? 'approve_and_forward' : 'approve',
          comment: c,
          acknowledgements: ack ? ['critical_risk_reviewed'] : []
        }).catch(() => null);
      } catch {}
    } else if (kind === 'return') {
      patch = {
        status: 'Returned',
        trail: [...it.trail, { t: 'Returned for correction', who: sup, when: t, c }]
      };
      act = 'Returned';
      detail = c;
      msg = `${it.ref} returned to ${it.by}`;
      try {
        await accountsService.processDecision(it.id, { decision: 'return', comment: c }).catch(() => null);
      } catch {}
    } else if (kind === 'evidence') {
      patch = {
        status: 'Evidence Requested',
        trail: [...it.trail, { t: 'Additional evidence requested', who: sup, when: t, c }]
      };
      act = 'Returned';
      detail = `Evidence requested: ${c}`;
      msg = `Evidence request sent to ${it.by}`;
    } else if (kind === 'reject') {
      patch = {
        status: 'Rejected',
        trail: [...it.trail, { t: 'Rejected', who: sup, when: t, c }]
      };
      act = 'Rejected';
      detail = c;
      msg = `${it.ref} rejected`;
      try {
        await accountsService.processDecision(it.id, { decision: 'reject', comment: c }).catch(() => null);
      } catch {}
    } else if (kind === 'escalate') {
      patch = {
        status: 'Escalated',
        escReason: escR,
        escAt: t,
        res: 'Awaiting forward',
        notes: [...it.notes, { who: sup, when: t, t: c }],
        trail: [...it.trail, { t: `Escalated · ${escR}`, who: sup, when: t, c }]
      };
      act = 'Escalated';
      detail = escR;
      msg = `${it.ref} escalated · ${escR}`;
      try {
        await accountsService.processDecision(it.id, { decision: 'escalate', comment: c, reason_code: escR }).catch(() => null);
      } catch {}
    } else if (kind === 'forward') {
      patch = {
        status: 'With Manager',
        res: 'With Manager',
        trail: [...it.trail, { t: 'Forwarded to Accounts Manager', who: sup, when: t, c }],
        notes: c ? [...it.notes, { who: sup, when: t, t: c }] : it.notes
      };
      act = 'Forwarded';
      detail = it.escReason || '';
      msg = `${it.ref} forwarded to Accounts Manager`;
      try {
        await accountsService.forwardEscalation(it.id, c).catch(() => null);
      } catch {}
    } else if (kind === 'note') {
      patch = { notes: [...it.notes, { who: sup, when: t, t: c }] };
      act = 'Note';
      detail = c;
      msg = `Note added to ${it.ref}`;
      try {
        await accountsService.addEscalationNote(it.id, c).catch(() => null);
      } catch {}
    }

    setItems(prev => prev.map(x => (x.id === curId ? { ...x, ...patch } : x)));
    if (kind === 'return' || kind === 'evidence') {
      setTeam(prev => prev.map(m => (m.name === it.by ? { ...m, returned: m.returned + 1 } : m)));
    }

    setAuditList(prev => [
      {
        id: 'A_' + Date.now(),
        ts: '07 Oct 2026, ' + hm(),
        day: 0,
        user: sup,
        role: 'Accounts Supervisor',
        action: act,
        module: kind === 'forward' || kind === 'note' ? 'Escalations' : SCREENS[TYPE_SCREEN[it.type] || 'dashboard'][1],
        ref: it.ref,
        detail
      },
      ...prev
    ]);

    setCmt('');
    setAck(false);
    setErr('');
    showToast(msg);
  };

  // Next Pending in Queue
  const handleNextPending = () => {
    const ty = SCREEN_TYPE[screen];
    const pend = items
      .filter(i => i.status === 'Pending' && (!ty || i.type === ty))
      .sort((a, b) => (a.pri === 'High' ? 0 : a.pri === 'Medium' ? 1 : 2) - (b.pri === 'High' ? 0 : b.pri === 'Medium' ? 1 : 2) || b.age - a.age);

    const cur = sel[screen];
    const n = pend.find(i => i.id !== cur) || pend[0];
    if (!n) {
      showToast('Queue clear — nothing pending.');
      return;
    }
    setSel(prev => ({ ...prev, [screen]: n.id }));
    setTab(prev => ({ ...prev, [screen]: screen === 'dashboard' ? prev.dashboard : 'Pending' }));
    setCmt('');
    setErr('');
    setAck(false);
  };

  // Collections Actions
  const handleCollAction = async (kind: string) => {
    const c = coll.find(x => x.id === cSel);
    if (!c) return;
    const sup = 'Rahul Menon';
    let patch: Partial<CollectionCard> = { reviewed: true };
    let act = '';
    let detail = '';
    let msg = '';

    if (kind === 'reassign') {
      if (!reassignTo || reassignTo === c.owner) {
        showToast('Choose a different executive to reassign to.');
        return;
      }
      patch.owner = reassignTo;
      act = 'Reassigned';
      detail = `${c.owner} → ${reassignTo}`;
      msg = `${c.cust} reassigned to ${reassignTo}`;
      try {
        await accountsService.reassignCollectionOwner(c.id, reassignTo).catch(() => null);
      } catch {}
    } else if (kind === 'escalate') {
      if (c.stage === 'Escalated' && c.mgr) {
        showToast('Already escalated to the Accounts Manager.');
        return;
      }
      patch.stage = 'Escalated';
      patch.mgr = true;
      patch.next = 'With Accounts Manager for recovery decision';
      act = 'Escalated';
      detail = 'Receivable escalated to Accounts Manager';
      msg = `${c.inv} escalated to the Accounts Manager`;
    } else if (kind === 'woApprove') {
      if (!c.wo) return;
      const over = c.wo.amt > 10000;
      patch.wo = { ...c.wo, status: over ? 'Forwarded to Manager' : 'Approved' };
      act = 'Write-off';
      detail = (over ? 'Forwarded ' : 'Approved ') + fmt(c.wo.amt);
      msg = over ? `Write-off above ₹ 10,000 — forwarded to Accounts Manager` : `Write-off of ${fmt(c.wo.amt)} approved`;
      try {
        await accountsService.decideWriteOff(c.id, { decision: over ? 'forward' : 'approve' }).catch(() => null);
      } catch {}
    } else if (kind === 'woReject') {
      if (!c.wo) return;
      patch.wo = { ...c.wo, status: 'Rejected' };
      act = 'Rejected';
      detail = 'Write-off request rejected';
      msg = 'Write-off request rejected — recovery continues';
      try {
        await accountsService.decideWriteOff(c.id, { decision: 'reject' }).catch(() => null);
      } catch {}
    }

    setColl(prev => prev.map(x => (x.id === c.id ? { ...x, ...patch } : x)));
    setReassignTo('');
    setAuditList(prev => [
      {
        id: 'A_' + Date.now(),
        ts: '07 Oct 2026, ' + hm(),
        day: 0,
        user: sup,
        role: 'Accounts Supervisor',
        action: act,
        module: 'Collection Oversight',
        ref: c.inv,
        detail
      },
      ...prev
    ]);
    showToast(msg);
  };

  // Close Operations
  const handleRunClose = async () => {
    const t = hm();
    if (closeSt !== 'Open') {
      showToast(`Today is already ${closeSt.toLowerCase()}.`);
      return;
    }
    if (closeStats.blockers > 0) {
      setCloseLog(prev => [{ t: `Close attempt blocked — ${closeStats.blockers} items outstanding`, who: 'Rahul Menon', when: t }, ...prev]);
      showToast(`Cannot close: ${closeStats.pend} pending approvals and ${closeStats.esc} unforwarded escalations.`);
      return;
    }
    try {
      await accountsService.runDailyClose('2026-10-08').catch(() => null);
    } catch {}
    setCloseSt('Closed');
    setCloseLog(prev => [{ t: 'Daily close run — all checks passed', who: 'Rahul Menon', when: t }, ...prev]);
    setAuditList(prev => [
      {
        id: 'A_' + Date.now(),
        ts: '07 Oct 2026, ' + t,
        day: 0,
        user: 'Rahul Menon',
        role: 'Accounts Supervisor',
        action: 'Daily Close',
        module: 'Daily Close',
        ref: '07 Oct 2026',
        detail: 'Day closed'
      },
      ...prev
    ]);
    showToast('Daily close completed for 07 Oct 2026');
  };

  const handleLockDay = async () => {
    const t = hm();
    if (closeSt === 'Open') {
      showToast('Run the daily close before locking.');
      return;
    }
    if (closeSt === 'Locked') {
      showToast('Today is already locked.');
      return;
    }
    try {
      await accountsService.lockDailyOperations('2026-10-08').catch(() => null);
    } catch {}
    setCloseSt('Locked');
    setCloseLog(prev => [{ t: 'Daily operations locked', who: 'Rahul Menon', when: t }, ...prev]);
    setAuditList(prev => [
      {
        id: 'A_' + Date.now(),
        ts: '07 Oct 2026, ' + t,
        day: 0,
        user: 'Rahul Menon',
        role: 'Accounts Supervisor',
        action: 'Daily Close',
        module: 'Daily Close',
        ref: '07 Oct 2026',
        detail: 'Day locked'
      },
      ...prev
    ]);
    showToast('Today locked — further postings go to 08 Oct');
  };

  const handleEscClose = async () => {
    const t = hm();
    if (closeSt !== 'Open') {
      showToast('Day is already closed.');
      return;
    }
    if (!closeStats.blockers) {
      showToast('Nothing incomplete — run the daily close instead.');
      return;
    }
    try {
      await accountsService.escalateDailyClose('2026-10-08', `Incomplete close · ${closeStats.blockers} items`).catch(() => null);
    } catch {}
    setCloseEsc(true);
    setCloseLog(prev => [{ t: `Incomplete close escalated to Accounts Manager — ${closeStats.blockers} items`, who: 'Rahul Menon', when: t }, ...prev]);
    setAuditList(prev => [
      {
        id: 'A_' + Date.now(),
        ts: '07 Oct 2026, ' + t,
        day: 0,
        user: 'Rahul Menon',
        role: 'Accounts Supervisor',
        action: 'Escalated',
        module: 'Daily Close',
        ref: '07 Oct 2026',
        detail: `Incomplete close · ${closeStats.blockers} items`
      },
      ...prev
    ]);
    showToast('Incomplete close escalated to Accounts Manager');
  };

  // Nav badges
  const navBadges: Record<string, number> = {
    journals: items.filter(i => i.status === 'Pending' && i.type === 'Journal').length,
    bills: items.filter(i => i.status === 'Pending' && i.type === 'Vendor Bill').length,
    expenses: items.filter(i => i.status === 'Pending' && i.type === 'Expense').length,
    recon: items.filter(i => i.status === 'Pending' && i.type === 'Reconciliation').length,
    gst: items.filter(i => i.status === 'Pending' && i.type === 'GST Batch').length,
    docs: items.filter(i => i.status === 'Pending' && i.type === 'Document').length,
    escalations: items.filter(i => i.status === 'Escalated').length,
    close: closeSt === 'Open' ? closeStats.blockers : 0
  };

  // Filtered Queue Items
  const isQueue = ['dashboard', 'journals', 'bills', 'expenses', 'recon', 'gst', 'docs', 'escalations'].includes(screen);
  const curType = SCREEN_TYPE[screen];
  const curTab = tab[screen] || 'All';
  const curQ = (q[screen] || '').toLowerCase();

  const queueItems = useMemo(() => {
    if (!isQueue) return [];
    let list: WorkspaceItem[] = [];
    if (screen === 'dashboard') {
      list = items.filter(i => i.status === 'Pending');
      if (curTab !== 'All') list = list.filter(i => i.type === curTab);
    } else if (screen === 'escalations') {
      const base = items.filter(i => !!i.escReason);
      if (curTab === 'Open') list = base.filter(i => i.status === 'Escalated');
      else if (curTab === 'With Manager') list = base.filter(i => i.status === 'With Manager');
      else list = base;
    } else {
      const base = items.filter(i => i.type === curType);
      if (curTab === 'Pending') list = base.filter(i => i.status === 'Pending');
      else if (curTab === 'Approved') list = base.filter(i => i.status === 'Approved' || i.status === 'With Manager');
      else if (curTab === 'Returned') list = base.filter(i => i.status === 'Returned' || i.status === 'Evidence Requested' || i.status === 'Rejected');
      else if (curTab === 'Escalated') list = base.filter(i => i.status === 'Escalated');
      else list = base;
    }

    if (curQ) {
      list = list.filter(i => (i.ref + ' ' + i.title + ' ' + i.dept + ' ' + i.by).toLowerCase().includes(curQ));
    }

    return list.sort((a, b) => {
      const pDiff = (a.status === 'Pending' ? 0 : 1) - (b.status === 'Pending' ? 0 : 1);
      if (pDiff !== 0) return pDiff;
      const priRank: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
      const rDiff = priRank[a.pri] - priRank[b.pri];
      if (rDiff !== 0) return rDiff;
      return b.age - a.age;
    });
  }, [items, isQueue, screen, curTab, curQ, curType]);

  const selectedItem = items.find(i => i.id === sel[screen]);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#111827', background: '#F9FAFB' }}>
      {/* SIDEBAR NAVIGATION */}
      <aside style={{ width: '260px', flexShrink: 0, background: '#FFFFFF', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#2563EB', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>
            N
          </div>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>NorthHospital</div>
        </div>

        {/* Role Identity Box */}
        <div style={{ margin: '0 16px 8px', padding: '14px', border: '1px solid #E5E7EB', borderRadius: '12px', background: '#F9FAFB', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>Accounts Supervisor</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>AS-01 · First Checker role</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Current Period</span>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Oct 2026</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>07 Oct Close</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '22px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  background: chip(closeSt).bg,
                  color: chip(closeSt).fg
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '3px', background: chip(closeSt).fg }}></span>
                {chip(closeSt).label}
              </span>
            </div>
          </div>
        </div>

        {/* Nav List */}
        <nav style={{ flex: 1, overflow: 'auto', padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV_GROUPS.map(([groupLabel, navItems]) => (
            <div key={groupLabel}>
              <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, padding: '14px 10px 6px' }}>{groupLabel}</div>
              {navItems.map(([scKey, itemTitle]) => {
                const isActive = screen === scKey;
                const badge = navBadges[scKey] || 0;
                const isRed = scKey === 'escalations' || scKey === 'close';
                return (
                  <button
                    key={scKey}
                    onClick={() => navigateTo(scKey)}
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
                    <span style={{ width: '18px', height: '18px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85 }}>
                      {ICONS[scKey]}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{itemTitle}</span>
                    {badge > 0 && (
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
                          background: isRed ? '#FEF2F2' : '#EFF6FF',
                          color: isRed ? '#B91C1C' : '#1D4ED8'
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Footer with Logout */}
        <AccountsSidebarUserFooter customName="Rahul Menon" customRole="Accounts Supervisor · AS-01" customInitials="RM" />
      </aside>

      {/* MAIN CONTENT AREA */}
      <main ref={mainRef} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <AccountsStickyAppBar
          activeRoleView={activeRoleView}
          onSelectRole={onSelectRole}
          workload={workload}
          breadcrumbScreen={SCREENS[screen]?.[1] || 'Supervisor Operational Workspace'}
          currentTime={currentTime}
          onOpenMaster={onOpenMaster}
        />
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          {/* SCREEN HEADER */}
          <header style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '760px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Accounts Supervisor · {SCREENS[screen][0]}</div>
              <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{SCREENS[screen][1]}</h1>
              <p style={{ margin: 0, color: '#6B7280', fontSize: '14px', lineHeight: 1.5 }}>{SCREENS[screen][2]}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {screen === 'dashboard' && (
                <>
                  <button
                    onClick={() => navigateTo('escalations')}
                    style={{ height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', background: '#FFFFFF', color: '#111827', border: '1px solid #E5E7EB' }}
                  >
                    Escalations
                  </button>
                  <button
                    onClick={handleNextPending}
                    style={{ height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', background: '#FFFFFF', color: '#111827', border: '1px solid #E5E7EB' }}
                  >
                    Review Next Pending
                  </button>
                  <button
                    onClick={() => navigateTo('close')}
                    style={{ height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', background: '#2563EB', color: '#FFFFFF', border: 'none' }}
                  >
                    Daily Close
                  </button>
                </>
              )}
              {screen !== 'dashboard' && screen !== 'close' && screen !== 'audit' && (
                <button
                  onClick={handleNextPending}
                  style={{ height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', background: '#2563EB', color: '#FFFFFF', border: 'none' }}
                >
                  Review Next Pending
                </button>
              )}
            </div>
          </header>

          {/* DYNAMIC KPI SUMMARY CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {screen === 'dashboard' && (
              <>
                <div
                  onClick={() => setTab(prev => ({ ...prev, dashboard: 'All' }))}
                  style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(17,24,39,0.04)', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#2563EB' }}></span>
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280' }}>{fmt(items.filter(i => i.status === 'Pending').reduce((a, b) => a + b.amt, 0))} value</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{items.filter(i => i.status === 'Pending').length}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Pending Approvals</div>
                  </div>
                </div>

                <div
                  onClick={() => navigateTo('escalations')}
                  style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(17,24,39,0.04)', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#DC2626' }}></span>
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#B91C1C' }}>Awaiting forward</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{items.filter(i => i.status === 'Escalated').length}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Escalations</div>
                  </div>
                </div>

                <div style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(17,24,39,0.04)', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#F59E0B' }}></span>
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#B45309' }}>Pending over 24h</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{items.filter(i => i.status === 'Pending' && i.age > 24).length}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Overdue Reviews</div>
                  </div>
                </div>

                <div
                  onClick={() => navigateTo('close')}
                  style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(17,24,39,0.04)', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#2563EB' }}></span>
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: closeStats.blockers ? '#B45309' : '#15803D' }}>
                      {closeSt === 'Open' ? `${closeStats.blockers} blockers` : '07 Oct 2026'}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{closeSt}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Daily Close Status</div>
                  </div>
                </div>
              </>
            )}

            {screen === 'close' && (
              <>
                <div style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>Must be cleared</div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{closeStats.pend}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Pending Approvals</div>
                  </div>
                </div>
                <div style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', color: '#B91C1C' }}>Pending with warnings</div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{closeStats.crit}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Critical Items</div>
                  </div>
                </div>
                <div style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', color: '#B91C1C' }}>Escalations not forwarded</div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{closeStats.esc}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Unresolved Exceptions</div>
                  </div>
                </div>
                <div style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>07 Oct · cut-off 19:00</div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{closeSt}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Close Status</div>
                  </div>
                </div>
              </>
            )}

            {screen === 'collections' && (
              <>
                <div style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', color: '#B45309' }}>2 accounts</div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{fmt(coll.filter(c => c.stage === 'Due Today').reduce((a, b) => a + b.amt, 0))}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Due Today</div>
                  </div>
                </div>
                <div style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', color: '#B91C1C' }}>Over 30 days</div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{fmt(coll.filter(c => c.age > 30).reduce((a, b) => a + b.amt, 0))}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Overdue</div>
                  </div>
                </div>
                <div style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', color: '#B91C1C' }}>2 accounts</div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{fmt(coll.filter(c => c.stage === 'Escalated').reduce((a, b) => a + b.amt, 0))}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Escalated</div>
                  </div>
                </div>
                <div style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', color: '#15803D' }}>MTD · +3 pts vs Sep</div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>86%</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Collection Efficiency</div>
                  </div>
                </div>
              </>
            )}

            {screen === 'team' && (
              <>
                <div style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>Today · 4 executives</div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{team.reduce((a, b) => a + b.processed, 0)}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Items Processed</div>
                  </div>
                </div>
                <div style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', color: '#B45309' }}>Awaiting your review</div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{items.filter(i => i.status === 'Pending').length}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Approvals Pending</div>
                  </div>
                </div>
                <div style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', color: '#B45309' }}>MTD submissions</div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{team.reduce((a, b) => a + b.returned, 0)}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Returned Work</div>
                  </div>
                </div>
                <div style={{ height: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', color: '#15803D' }}>vs daily target 80</div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>{Math.round(team.reduce((a, b) => a + b.processed, 0) / 80 * 100)}%</div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>Productivity</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* QUEUE SCREENS (Dashboard, Journals, Bills, Expenses, Recon, GST, Docs, Escalations) */}
          {isQueue && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
              {/* Left Queue Table */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(17,24,39,0.04)', minWidth: 0, flex: '999 1 600px', overflowX: 'auto' }}>
                <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  {screen === 'dashboard' && <div style={{ fontSize: '16px', fontWeight: 600, width: '100%' }}>Items Awaiting Approval</div>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px', background: '#F3F4F6', borderRadius: '10px' }}>
                    {(screen === 'dashboard'
                      ? ['All', 'Journal', 'Vendor Bill', 'Expense', 'Reconciliation', 'GST Batch', 'Document']
                      : screen === 'escalations'
                      ? ['Open', 'With Manager', 'All']
                      : ['Pending', 'Approved', 'Returned', 'Escalated', 'All']
                    ).map(tName => (
                      <button
                        key={tName}
                        onClick={() => setTab(prev => ({ ...prev, [screen]: tName }))}
                        style={{
                          height: '32px',
                          padding: '0 10px',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                          background: curTab === tName ? '#FFFFFF' : 'transparent',
                          color: curTab === tName ? '#111827' : '#6B7280',
                          boxShadow: curTab === tName ? '0 1px 2px rgba(17,24,39,0.08)' : 'none'
                        }}
                      >
                        {screen === 'dashboard' ? (tName === 'All' ? 'All' : TYPE_SHORT[tName] || tName) : tName}
                      </button>
                    ))}
                  </div>

                  <input
                    value={q[screen] || ''}
                    onChange={e => setQ({ ...q, [screen]: e.target.value })}
                    placeholder="Search reference, executive"
                    style={{ height: '40px', width: '220px', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '0 12px', fontSize: '14px', outline: 'none', background: '#FFFFFF' }}
                  />
                </div>

                {/* Queue Table Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '100px minmax(120px, 1fr) 96px 96px 76px 44px 68px 104px', gap: '8px', padding: '0 16px', height: '44px', minWidth: '800px', alignItems: 'center', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>
                  <span>{screen === 'dashboard' ? 'Type' : screen === 'escalations' ? 'Reason' : curType === 'Vendor Bill' ? '3-Way Match' : curType === 'Expense' ? 'Budget' : curType === 'Reconciliation' ? 'Match' : curType === 'GST Batch' ? 'Exceptions' : 'Evidence'}</span>
                  <span>Reference</span>
                  <span>Department</span>
                  <span style={{ textAlign: 'right' }}>Amount</span>
                  <span>Submitted By</span>
                  <span>Age</span>
                  <span>Priority</span>
                  <span>Status</span>
                </div>

                {/* Queue Table Rows */}
                {queueItems.map(row => {
                  const isSel = row.id === sel[screen];
                  const c1Tag = screen === 'dashboard' ? TYPE_SHORT[row.type] : screen === 'escalations' ? row.escReason || '' : checkOf(row);
                  return (
                    <div
                      key={row.id}
                      onClick={() => {
                        setSel(prev => ({ ...prev, [screen]: row.id }));
                        setCmt('');
                        setErr('');
                        setAck(false);
                      }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '100px minmax(120px, 1fr) 96px 96px 76px 44px 68px 104px',
                        gap: '8px',
                        padding: '8px 16px',
                        minHeight: '56px',
                        minWidth: '800px',
                        alignItems: 'center',
                        borderBottom: '1px solid #F3F4F6',
                        cursor: 'pointer',
                        fontSize: '14px',
                        background: isSel ? '#EFF6FF' : '#FFFFFF'
                      }}
                    >
                      <span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', background: chip(c1Tag).bg, color: chip(c1Tag).fg }}>
                          {c1Tag}
                        </span>
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.ref}</span>
                        <span style={{ fontSize: '12px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</span>
                      </span>
                      <span style={{ fontSize: '13px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.dept}</span>
                      <span style={{ textAlign: 'right', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmt(row.amt)}</span>
                      <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>{row.by.split(' ')[0]} {row.by.split(' ')[1]?.[0]}.</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: row.status === 'Pending' && row.age > 24 ? '#B91C1C' : '#374151' }}>{row.status === 'Pending' || row.status === 'Escalated' ? ageLabel(row.age) : '—'}</span>
                      <span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: chip(row.pri).bg, color: chip(row.pri).fg }}>
                          {row.pri}
                        </span>
                      </span>
                      <span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', background: chip(row.status).bg, color: chip(row.status).fg }}>
                          {row.status}
                        </span>
                      </span>
                    </div>
                  );
                })}

                {queueItems.length === 0 && (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                    Queue clear for this filter.
                  </div>
                )}
                <div style={{ padding: '14px 20px', fontSize: '13px', color: '#6B7280' }}>
                  {queueItems.length} items {screen === 'dashboard' && '· oldest and highest priority first'}
                </div>
              </div>

              {/* Right Detail & Decision Panel */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(17,24,39,0.04)', flex: '1 1 340px', maxWidth: '100%', position: 'sticky', top: '24px', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {!selectedItem ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>Select an item to review.</div>
                ) : (
                  <>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>{TYPE_SHORT[selectedItem.type]} · {selectedItem.ref}</span>
                        <span style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.35 }}>{selectedItem.title}</span>
                        <span style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>{fmt(selectedItem.amt)}</span>
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0, background: chip(selectedItem.status).bg, color: chip(selectedItem.status).fg }}>
                        {selectedItem.status}
                      </span>
                    </div>

                    <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      {/* DoFA Limit Check Banner */}
                      {selectedItem.status === 'Pending' && LIMIT[selectedItem.type] !== Infinity && (
                        <div
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            lineHeight: 1.45,
                            background: selectedItem.amt > LIMIT[selectedItem.type] ? '#F0F9FF' : '#F0FDF4',
                            color: selectedItem.amt > LIMIT[selectedItem.type] ? '#075985' : '#166534',
                            border: `1px solid ${selectedItem.amt > LIMIT[selectedItem.type] ? '#BAE6FD' : '#BBF7D0'}`
                          }}
                        >
                          {selectedItem.amt > LIMIT[selectedItem.type]
                            ? `Above your approval limit of ${fmt(LIMIT[selectedItem.type])} — approving verifies and forwards to the Accounts Manager.`
                            : `Within your approval limit of ${fmt(LIMIT[selectedItem.type])}.`}
                        </div>
                      )}

                      {/* Warnings */}
                      {warnsOf(selectedItem).map((w, idx) => (
                        <div key={idx} style={{ padding: '10px 12px', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start', background: SEV[w.sev].bg, border: `1px solid ${SEV[w.sev].bd}` }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.03em', flexShrink: 0, marginTop: '2px', color: SEV[w.sev].fg }}>{SEV[w.sev].tag}</span>
                          <span style={{ fontSize: '13px', lineHeight: 1.45, color: SEV[w.sev].fg }}>{w.t}</span>
                        </div>
                      ))}

                      {/* Escalation Context if present */}
                      {selectedItem.escReason && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 14px', borderRadius: '10px', background: '#F9FAFB' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>Escalation</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: chip(selectedItem.escReason).bg, color: chip(selectedItem.escReason).fg }}>
                              {selectedItem.escReason}
                            </span>
                          </div>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>Escalated {selectedItem.escAt} · {selectedItem.res}</span>
                        </div>
                      )}

                      {/* Metadata Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '12px', color: '#6B7280' }}>Department</span><span style={{ fontSize: '13px', fontWeight: 500 }}>{selectedItem.dept}</span></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '12px', color: '#6B7280' }}>Submitted by</span><span style={{ fontSize: '13px', fontWeight: 500 }}>{selectedItem.by} · {selectedItem.sub}</span></div>
                        {selectedItem.src && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', gridColumn: 'span 2' }}>
                            <span style={{ fontSize: '12px', color: '#6B7280' }}>Source</span>
                            <span style={{ fontSize: '13px', fontWeight: 500 }}>{selectedItem.src}</span>
                          </div>
                        )}
                        {selectedItem.kv.map(([k, v], idx) => (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '12px', color: '#6B7280' }}>{k}</span>
                            <span style={{ fontSize: '13px', fontWeight: 500 }}>{v}</span>
                          </div>
                        ))}
                      </div>

                      {/* Journal Debit / Credit Lines */}
                      {selectedItem.lines && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>Debit & Credit Accounts</span>
                          {selectedItem.lines.map(([d, cAcc, cc, aAmt], idx) => (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', borderRadius: '10px', background: '#F9FAFB', fontSize: '13px' }}>
                              <span><span style={{ color: '#6B7280' }}>Dr</span> {d}</span>
                              <span><span style={{ color: '#6B7280' }}>Cr</span> {cAcc}</span>
                              <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6B7280' }}>
                                <span>{cc}</span>
                                <span style={{ fontWeight: 600, color: '#111827' }}>{fmt(aAmt)}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Vendor Bill 3-Way Match Grid */}
                      {selectedItem.match && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>3-Way Match Result</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: chip(selectedItem.match.result).bg, color: chip(selectedItem.match.result).fg }}>
                              {selectedItem.match.result}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(3, minmax(0, 1fr))', border: '1px solid #E5E7EB', borderRadius: '10px', overflow: 'hidden', fontSize: '12px' }}>
                            <div style={{ padding: '8px', background: '#F9FAFB' }}></div>
                            <div style={{ padding: '8px', background: '#F9FAFB', fontWeight: 600, color: '#6B7280' }}>PO</div>
                            <div style={{ padding: '8px', background: '#F9FAFB', fontWeight: 600, color: '#6B7280' }}>GRN</div>
                            <div style={{ padding: '8px', background: '#F9FAFB', fontWeight: 600, color: '#6B7280' }}>Invoice</div>

                            <div style={{ padding: '8px', borderTop: '1px solid #F3F4F6', color: '#6B7280' }}>No.</div>
                            <div style={{ padding: '8px', borderTop: '1px solid #F3F4F6' }}>{selectedItem.match.po[0]}</div>
                            <div style={{ padding: '8px', borderTop: '1px solid #F3F4F6' }}>{selectedItem.match.grn[0]}</div>
                            <div style={{ padding: '8px', borderTop: '1px solid #F3F4F6' }}>{selectedItem.match.inv[0]}</div>

                            <div style={{ padding: '8px', borderTop: '1px solid #F3F4F6', color: '#6B7280' }}>Qty</div>
                            <div style={{ padding: '8px', borderTop: '1px solid #F3F4F6' }}>{selectedItem.match.po[1]}</div>
                            <div style={{ padding: '8px', borderTop: '1px solid #F3F4F6' }}>{selectedItem.match.grn[1]}</div>
                            <div style={{ padding: '8px', borderTop: '1px solid #F3F4F6', fontWeight: 600, color: selectedItem.match.inv[1] !== selectedItem.match.grn[1] ? '#B91C1C' : '#111827' }}>
                              {selectedItem.match.inv[1]}
                            </div>

                            <div style={{ padding: '8px', borderTop: '1px solid #F3F4F6', color: '#6B7280' }}>Rate</div>
                            <div style={{ padding: '8px', borderTop: '1px solid #F3F4F6' }}>{fmt2(selectedItem.match.po[2])}</div>
                            <div style={{ padding: '8px', borderTop: '1px solid #F3F4F6', color: '#9CA3AF' }}>—</div>
                            <div style={{ padding: '8px', borderTop: '1px solid #F3F4F6', fontWeight: 600, color: selectedItem.match.inv[2] !== selectedItem.match.po[2] ? '#B91C1C' : '#111827' }}>
                              {fmt2(selectedItem.match.inv[2])}
                            </div>
                          </div>
                          {selectedItem.match.note && <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.45 }}>{selectedItem.match.note}</span>}
                        </div>
                      )}

                      {/* Expense Budget Status Progress Bar */}
                      {selectedItem.budget && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>Budget Status</span>
                            <span style={{ fontSize: '12px', color: '#6B7280' }}>{selectedItem.budget[0]}</span>
                          </div>
                          <div style={{ height: '8px', borderRadius: '4px', background: '#F3F4F6', display: 'flex', overflow: 'hidden' }}>
                            <div style={{ height: '8px', background: '#93C5FD', width: `${Math.min(100, (selectedItem.budget[2] / selectedItem.budget[1]) * 100)}%` }}></div>
                            <div
                              style={{
                                height: '8px',
                                width: `${Math.max(0, Math.min(100 - (selectedItem.budget[2] / selectedItem.budget[1]) * 100, (selectedItem.amt / selectedItem.budget[1]) * 100))}%`,
                                background: selectedItem.budget[2] + selectedItem.amt > selectedItem.budget[1] ? '#DC2626' : '#F59E0B'
                              }}
                            ></div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px', fontSize: '12px' }}>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#6B7280' }}>Budget</span><span style={{ fontWeight: 600 }}>{fmt(selectedItem.budget[1])}</span></span>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#6B7280' }}>Used</span><span style={{ fontWeight: 600 }}>{fmt(selectedItem.budget[2])}</span></span>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#6B7280' }}>This req</span><span style={{ fontWeight: 600 }}>{fmt(selectedItem.amt)}</span></span>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ color: '#6B7280' }}>After</span><span style={{ fontWeight: 600, color: selectedItem.budget[2] + selectedItem.amt > selectedItem.budget[1] ? '#B91C1C' : '#15803D' }}>{fmt(selectedItem.budget[1] - selectedItem.budget[2] - selectedItem.amt)}</span></span>
                          </div>
                        </div>
                      )}

                      {/* Supporting Documents Evidence */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>Supporting Evidence</span>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>{selectedItem.docs.length} files</span>
                        </div>
                        {selectedItem.docs.length === 0 ? (
                          <span style={{ fontSize: '13px', color: '#B91C1C' }}>No documents attached.</span>
                        ) : (
                          selectedItem.docs.map((docName, idx) => (
                            <button
                              key={idx}
                              onClick={() => showToast(`Opening ${docName} · read-only preview`)}
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '40px', padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: '10px', background: '#FFFFFF', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                            >
                              <FileText size={16} color="#2563EB" />
                              <span style={{ flex: 1, fontSize: '13px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{docName}</span>
                              <span style={{ fontSize: '12px', color: '#2563EB' }}>View</span>
                            </button>
                          ))
                        )}
                      </div>

                      {/* Approval Trail */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>Approval Trail</span>
                        {selectedItem.trail.map((step, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '5px', marginTop: '4px', background: '#2563EB' }}></span>
                              <span style={{ flex: 1, width: '1px', background: '#E5E7EB', minHeight: '20px' }}></span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingBottom: '12px', minWidth: 0 }}>
                              <span style={{ fontSize: '13px', fontWeight: 600 }}>{step.t}</span>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>{step.who} · {step.when}</span>
                              {step.c && <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.45 }}>“{step.c}”</span>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Decision Input Controls */}
                      {selectedItem.status === 'Pending' || (screen === 'escalations' && selectedItem.status === 'Escalated') ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '14px', borderTop: '1px solid #E5E7EB' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>Decision</span>

                          {screen !== 'escalations' && (
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>Escalation reason (used if you escalate)</span>
                              <select
                                value={escR}
                                onChange={e => setEscR(e.target.value)}
                                style={{ height: '40px', width: '100%', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '0 10px', fontSize: '14px', outline: 'none', background: '#FFFFFF' }}
                              >
                                {ESC_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </label>
                          )}

                          <textarea
                            value={cmt}
                            onChange={e => { setCmt(e.target.value); setErr(''); }}
                            placeholder={screen === 'escalations' ? 'Note for Accounts Manager — context, risk and recommendation' : `Comment for ${selectedItem.by} — required to return, reject or escalate`}
                            style={{ minHeight: '72px', width: '100%', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
                          />

                          {hasCrit(selectedItem) && screen !== 'escalations' && (
                            <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', color: '#7F1D1D', cursor: 'pointer', lineHeight: 1.4 }}>
                              <input type="checkbox" checked={ack} onChange={() => { setAck(!ack); setErr(''); }} style={{ marginTop: '2px' }} />
                              <span>I have reviewed the critical warnings and accept responsibility for approving.</span>
                            </label>
                          )}

                          {err && (
                            <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '13px', color: '#991B1B' }}>
                              {err}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {/* Action Buttons */}
                    {(selectedItem.status === 'Pending' || (screen === 'escalations' && selectedItem.status === 'Escalated')) && (
                      <div style={{ padding: '16px 20px', borderTop: '1px solid #E5E7EB', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {(screen === 'escalations' ? ESC_ACTIONS : ACTIONS[selectedItem.type] || []).map(([label, kind]) => {
                          const isApprove = kind === 'approve';
                          const isForward = kind === 'forward';
                          const isReject = kind === 'reject';
                          const isEscalate = kind === 'escalate';
                          const isOver = selectedItem.amt > LIMIT[selectedItem.type];
                          const displayLabel = isApprove && isOver ? `${label} & Forward` : label;

                          return (
                            <button
                              key={kind}
                              onClick={() => handleAction(kind)}
                              style={{
                                height: '40px',
                                padding: '0 10px',
                                borderRadius: '10px',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                background: isApprove || isForward ? '#2563EB' : '#FFFFFF',
                                color: isApprove || isForward ? '#FFFFFF' : isReject ? '#DC2626' : isEscalate ? '#B45309' : '#111827',
                                border: isApprove || isForward ? '1px solid #2563EB' : isReject ? '1px solid #FECACA' : isEscalate ? '1px solid #FDE68A' : '1px solid #E5E7EB'
                              }}
                            >
                              {displayLabel}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* DASHBOARD WIDGETS (Recent Team Activity, Exceptions, Critical Alerts) */}
          {screen === 'dashboard' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
              {/* Recent Team Activity */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(17,24,39,0.04)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>Recent Team Activity</div>
                {auditList.slice(0, 5).map(act => (
                  <div key={act.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', height: '22px', padding: '0 6px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, flexShrink: 0, background: chip(act.action).bg, color: chip(act.action).fg }}>
                      {act.action}
                    </span>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{act.ref}</span>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>{act.user} · {act.detail}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#6B7280', whiteSpace: 'nowrap' }}>{act.ts.split(', ')[1]}</span>
                  </div>
                ))}
              </div>

              {/* Exceptions */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(17,24,39,0.04)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>Exceptions</div>
                {items
                  .filter(i => i.status === 'Pending')
                  .flatMap(i => warnsOf(i).map(w => ({ ref: i.ref, ...w, id: i.id })))
                  .slice(0, 4)
                  .map((ex, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSel(prev => ({ ...prev, dashboard: ex.id }))}
                      style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start', textAlign: 'left', width: '100%', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', background: SEV[ex.sev].bg, border: `1px solid ${SEV[ex.sev].bd}` }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600, color: SEV[ex.sev].fg }}>{ex.ref}</span>
                      <span style={{ fontSize: '12px', color: '#374151', lineHeight: 1.4 }}>{ex.t}</span>
                    </button>
                  ))}
              </div>

              {/* Critical Alerts */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(17,24,39,0.04)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>Critical Alerts</div>
                {closeStats.blockers > 0 && (
                  <button
                    onClick={() => navigateTo('close')}
                    style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start', textAlign: 'left', width: '100%', padding: '12px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: '#FEF2F2' }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#B91C1C' }}>Daily close blocked by {closeStats.blockers} items</span>
                    <span style={{ fontSize: '13px', color: '#374151' }}>{closeStats.pend} pending approvals · {closeStats.esc} escalations not forwarded</span>
                  </button>
                )}
                {items.filter(i => i.status === 'Pending' && warnsOf(i).some(w => /[Dd]uplicate/.test(w.t))).length > 0 && (
                  <button
                    onClick={() => navigateTo('bills')}
                    style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start', textAlign: 'left', width: '100%', padding: '12px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: '#FEF2F2' }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#B91C1C' }}>Duplicate-risk bill in queue</span>
                    <span style={{ fontSize: '13px', color: '#374151' }}>Confirm 3-way match before approving to avoid double payment</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* COLLECTION OVERSIGHT SCREEN */}
          {screen === 'collections' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '18px', fontWeight: 600 }}>Recovery Pipeline</div>
                <input
                  value={q.collections || ''}
                  onChange={e => setQ({ ...q, collections: e.target.value })}
                  placeholder="Search customer, invoice, executive"
                  style={{ height: '40px', width: '280px', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '0 12px', fontSize: '14px', outline: 'none', background: '#FFFFFF' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', alignItems: 'start' }}>
                {STAGES.map(stageName => {
                  const stageCards = coll.filter(c => c.stage === stageName && (!q.collections || (c.cust + ' ' + c.inv + ' ' + c.owner).toLowerCase().includes(q.collections.toLowerCase())));
                  const stageDot = stageName === 'Due Today' ? '#F59E0B' : stageName === 'Promised To Pay' ? '#2563EB' : stageName === 'Escalated' ? '#DC2626' : '#6B7280';
                  return (
                    <div key={stageName} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', borderRadius: '12px', background: '#F3F4F6', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 4px 0' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '4px', background: stageDot }}></span>
                        <span style={{ fontSize: '14px', fontWeight: 600, flex: 1 }}>{stageName}</span>
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>{stageCards.length}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', padding: '0 4px' }}>
                        {fmt(stageCards.reduce((a, b) => a + b.amt, 0))}
                      </div>

                      {stageCards.length === 0 && (
                        <div style={{ padding: '16px', border: '1px dashed #D1D5DB', borderRadius: '10px', textAlign: 'center', fontSize: '13px', color: '#6B7280' }}>
                          No customers
                        </div>
                      )}

                      {stageCards.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setCSel(c.id); setReassignTo(''); }}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            padding: '14px',
                            borderRadius: '10px',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
                            border: `1px solid ${c.id === cSel ? '#2563EB' : '#E5E7EB'}`
                          }}
                        >
                          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827', lineHeight: 1.35 }}>{c.cust}</span>
                            <span style={{ fontSize: '12px', color: '#6B7280' }}>
                              {c.inv} · <span style={{ fontWeight: 600, color: c.age > 90 ? '#B91C1C' : '#374151' }}>{c.age}d</span>
                            </span>
                          </span>
                          <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.amt)}</span>
                          <span style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>Owner</span>
                              <span style={{ fontSize: '13px', color: '#111827' }}>{c.owner}</span>
                            </span>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>Last contact</span>
                              <span style={{ fontSize: '13px', color: '#111827' }}>{c.last}</span>
                            </span>
                          </span>
                          {c.wo && c.wo.status === 'Pending' && (
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#B45309', background: '#FFFBEB', borderRadius: '6px', padding: '4px 8px' }}>
                              Write-off request · {fmt(c.wo.amt)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DAILY CLOSE SCREEN */}
          {screen === 'close' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(17,24,39,0.04)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Close Sections</div>
                  {[
                    { title: 'Journal Completion', type: 'Journal', sc: 'journals' },
                    { title: 'Vendor Bills Completion', type: 'Vendor Bill', sc: 'bills' },
                    { title: 'Bank Reconciliation Status', type: 'Reconciliation', sc: 'recon' },
                    { title: 'Receivable Review Status', type: 'Receivable', sc: 'collections' },
                    { title: 'GST Review Status', type: 'GST Batch', sc: 'gst' }
                  ].map((sec, idx) => {
                    const secItems = items.filter(i => i.type === sec.type);
                    const done = secItems.filter(i => i.status !== 'Pending').length;
                    const total = secItems.length || 1;
                    const pct = Math.round((done / total) * 100);
                    return (
                      <button
                        key={idx}
                        onClick={() => navigateTo(sec.sc)}
                        style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 160px 70px', gap: '16px', alignItems: 'center', padding: '14px 0', border: 'none', borderBottom: '1px solid #F3F4F6', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                      >
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{sec.title}</span>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>{total - done > 0 ? `${total - done} pending review` : 'All reviewed'}</span>
                        </span>
                        <span style={{ height: '8px', borderRadius: '4px', background: '#F3F4F6', overflow: 'hidden' }}>
                          <span style={{ display: 'block', height: '8px', borderRadius: '4px', width: `${pct}%`, background: pct === 100 ? '#16A34A' : '#2563EB' }}></span>
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>{done} / {total}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Closing Checklist */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(17,24,39,0.04)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 600 }}>Closing Checklist</div>
                  {[
                    { t: 'All approvals completed', ok: closeStats.pend === 0, d: closeStats.pend > 0 ? `${closeStats.pend} items still pending across queues` : 'Every queue is clear' },
                    { t: 'No pending critical items', ok: closeStats.crit === 0, d: closeStats.crit > 0 ? `${closeStats.crit} pending items carry critical warnings` : 'No critical warnings open' },
                    { t: 'No unresolved exceptions', ok: closeStats.esc === 0, d: closeStats.esc > 0 ? `${closeStats.esc} escalations not yet forwarded to Manager` : 'All escalations forwarded or resolved' }
                  ].map((ck, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 14px', borderRadius: '10px', background: ck.ok ? '#F0FDF4' : '#FEF2F2' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '11px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0, color: ck.ok ? '#15803D' : '#B91C1C' }}>
                        {ck.ok ? '✓' : '!'}
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: ck.ok ? '#15803D' : '#B91C1C' }}>{ck.t}</span>
                        <span style={{ fontSize: '13px', color: '#374151' }}>{ck.d}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sticky Close Actions Card */}
              <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '24px' }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(17,24,39,0.04)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>07 Oct 2026</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: chip(closeSt).bg, color: chip(closeSt).fg }}>
                      {closeSt}
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.45 }}>
                    {closeSt === 'Open'
                      ? closeStats.blockers > 0
                        ? `${closeStats.blockers} items block today’s close`
                        : 'All checks passed — ready to close'
                      : closeSt === 'Closed'
                      ? 'Closed — lock to stop further postings to 07 Oct'
                      : 'Locked — postings now go to 08 Oct 2026'}
                  </span>
                  <button
                    onClick={handleRunClose}
                    style={{ height: '40px', borderRadius: '10px', border: 'none', color: '#FFFFFF', fontSize: '14px', fontWeight: 500, cursor: 'pointer', background: closeSt === 'Open' && closeStats.blockers === 0 ? '#2563EB' : '#93C5FD' }}
                  >
                    Run Daily Close
                  </button>
                  <button
                    onClick={handleLockDay}
                    style={{ height: '40px', borderRadius: '10px', border: '1px solid #E5E7EB', background: '#FFFFFF', color: '#111827', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                  >
                    Lock Daily Operations
                  </button>
                  <button
                    onClick={handleEscClose}
                    style={{ height: '40px', borderRadius: '10px', border: '1px solid #FDE68A', background: '#FFFFFF', color: '#B45309', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                  >
                    {closeEsc ? 'Escalated to Manager' : 'Escalate Incomplete Close'}
                  </button>
                </div>

                {/* Close Timeline */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(17,24,39,0.04)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Close Timeline</span>
                  {closeLog.map((l, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '4px', marginTop: '6px', background: '#2563EB' }}></span>
                        <span style={{ flex: 1, width: '1px', background: '#E5E7EB', minHeight: '20px' }}></span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingBottom: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{l.t}</span>
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>{l.who} · {l.when}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TEAM ACTIVITY SCREEN */}
          {screen === 'team' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(17,24,39,0.04)', flex: '999 1 600px', minWidth: 0, overflowX: 'auto' }}>
                <div style={{ padding: '16px 20px', fontSize: '16px', fontWeight: 600 }}>Accounts Executives</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) 80px 80px 80px 80px 70px 140px', gap: '12px', padding: '0 20px', height: '44px', minWidth: '780px', alignItems: 'center', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>
                  <span>Executive</span>
                  <span style={{ textAlign: 'right' }}>Processed</span>
                  <span style={{ textAlign: 'right' }}>Pending</span>
                  <span style={{ textAlign: 'right' }}>Approved</span>
                  <span style={{ textAlign: 'right' }}>Returned</span>
                  <span style={{ textAlign: 'right' }}>Errors</span>
                  <span>Productivity</span>
                </div>
                {team.map(m => {
                  const pCount = items.filter(i => i.status === 'Pending' && i.by === m.name).length;
                  const prod = Math.min(100, Math.round((m.processed / 20) * 100));
                  return (
                    <div
                      key={m.name}
                      onClick={() => setTSel(m.name)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(160px, 1fr) 80px 80px 80px 80px 70px 140px',
                        gap: '12px',
                        padding: '8px 20px',
                        minHeight: '56px',
                        minWidth: '780px',
                        alignItems: 'center',
                        borderBottom: '1px solid #F3F4F6',
                        cursor: 'pointer',
                        fontSize: '14px',
                        background: m.name === tSel ? '#EFF6FF' : '#FFFFFF'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <span style={{ width: '32px', height: '32px', borderRadius: '16px', background: '#EFF6FF', color: '#2563EB', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {m.name.split(' ').map(x => x[0]).join('')}
                        </span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 500 }}>{m.name}</span>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>{m.code}</span>
                        </span>
                      </span>
                      <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.processed}</span>
                      <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pCount}</span>
                      <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.approved}</span>
                      <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.returned}</span>
                      <span style={{ textAlign: 'right', fontWeight: 600, color: m.errors >= 3 ? '#B91C1C' : '#374151' }}>{m.errors}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#F3F4F6', overflow: 'hidden' }}>
                          <span style={{ display: 'block', height: '6px', width: `${prod}%`, background: prod >= 90 ? '#16A34A' : prod >= 70 ? '#2563EB' : '#F59E0B' }}></span>
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, width: '36px', textAlign: 'right' }}>{prod}%</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Selected Executive Detail Panel */}
              {(() => {
                const curM = team.find(x => x.name === tSel) || team[0];
                const awaiting = items.filter(i => i.status === 'Pending' && i.by === curM.name);
                return (
                  <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(17,24,39,0.04)', flex: '1 1 340px', minWidth: 0, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>{curM.code}</span>
                      <span style={{ fontSize: '16px', fontWeight: 600 }}>{curM.name}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', padding: '12px', borderRadius: '10px', background: '#F9FAFB' }}>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '12px', color: '#6B7280' }}>First-pass</span><span style={{ fontSize: '16px', fontWeight: 700 }}>{Math.round((curM.approved / (curM.approved + curM.returned)) * 100)}%</span></span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '12px', color: '#6B7280' }}>Errors MTD</span><span style={{ fontSize: '16px', fontWeight: 700 }}>{curM.errors}</span></span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '12px', color: '#6B7280' }}>Accounts</span><span style={{ fontSize: '16px', fontWeight: 700 }}>{coll.filter(c => c.owner === curM.name).length}</span></span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>Awaiting Your Review</span>
                      {awaiting.length === 0 ? (
                        <span style={{ fontSize: '13px', color: '#6B7280' }}>Nothing pending from this executive.</span>
                      ) : (
                        awaiting.map(i => (
                          <button
                            key={i.id}
                            onClick={() => navigateTo(TYPE_SCREEN[i.type], { sel: { [TYPE_SCREEN[i.type]]: i.id }, tab: { [TYPE_SCREEN[i.type]]: 'All' } })}
                            style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E5E7EB', background: '#FFFFFF', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                          >
                            <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{i.ref}</span>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>{TYPE_SHORT[i.type]} · {ageLabel(i.age)}</span>
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{fmt(i.amt)}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* AUDIT TRAIL SCREEN */}
          {screen === 'audit' && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(17,24,39,0.04)', minWidth: 0, overflowX: 'auto' }}>
              <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '4px', padding: '4px', background: '#F3F4F6', borderRadius: '10px' }}>
                  {['Today', 'This Week', 'This Month'].map(tName => (
                    <button
                      key={tName}
                      onClick={() => setTab(prev => ({ ...prev, audit: tName }))}
                      style={{ height: '32px', padding: '0 12px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', background: tab.audit === tName ? '#FFFFFF' : 'transparent', color: tab.audit === tName ? '#111827' : '#6B7280', boxShadow: tab.audit === tName ? '0 1px 2px rgba(17,24,39,0.08)' : 'none' }}
                    >
                      {tName}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <select value={aUser} onChange={e => setAUser(e.target.value)} style={{ height: '40px', width: '160px', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '0 10px', fontSize: '14px', outline: 'none', background: '#FFFFFF' }}>
                    <option value="All users">All users</option>
                    {Array.from(new Set(auditList.map(a => a.user))).map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <select value={aMod} onChange={e => setAMod(e.target.value)} style={{ height: '40px', width: '180px', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '0 10px', fontSize: '14px', outline: 'none', background: '#FFFFFF' }}>
                    <option value="All modules">All modules</option>
                    {Array.from(new Set(auditList.map(a => a.module))).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={aAct} onChange={e => setAAct(e.target.value)} style={{ height: '40px', width: '150px', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '0 10px', fontSize: '14px', outline: 'none', background: '#FFFFFF' }}>
                    <option value="All actions">All actions</option>
                    {Array.from(new Set(auditList.map(a => a.action))).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <input
                    value={q.audit || ''}
                    onChange={e => setQ({ ...q, audit: e.target.value })}
                    placeholder="Search reference, detail"
                    style={{ height: '40px', width: '200px', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '0 12px', fontSize: '14px', outline: 'none', background: '#FFFFFF' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '150px 150px 100px minmax(140px, 1fr) 160px minmax(160px, 1.4fr)', gap: '12px', padding: '0 20px', height: '44px', minWidth: '960px', alignItems: 'center', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>
                <span>Timestamp</span>
                <span>User</span>
                <span>Action</span>
                <span>Module</span>
                <span>Reference</span>
                <span>Detail</span>
              </div>

              {auditList
                .filter(a => (aUser === 'All users' || a.user === aUser) && (aMod === 'All modules' || a.module === aMod) && (aAct === 'All actions' || a.action === aAct) && (!q.audit || (a.ref + ' ' + a.detail + ' ' + a.user).toLowerCase().includes(q.audit.toLowerCase())))
                .map(a => (
                  <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '150px 150px 100px minmax(140px, 1fr) 160px minmax(160px, 1.4fr)', gap: '12px', padding: '8px 20px', minHeight: '56px', minWidth: '960px', alignItems: 'center', borderBottom: '1px solid #F3F4F6', fontSize: '14px' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontVariantNumeric: 'tabular-nums' }}>{a.ts}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{a.user}</span>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>{a.role}</span>
                    </span>
                    <span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', background: chip(a.action).bg, color: chip(a.action).fg }}>
                        {a.action}
                      </span>
                    </span>
                    <span style={{ fontSize: '13px', color: '#374151' }}>{a.module}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.ref}</span>
                    <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.4 }}>{a.detail}</span>
                  </div>
                ))}
              <div style={{ padding: '14px 20px', fontSize: '13px', color: '#6B7280' }}>
                {auditList.length} entries · immutable — entries cannot be edited or deleted
              </div>
            </div>
          )}
        </div>
      </main>

      {/* COLLECTION ACCOUNT SIDE DRAWER */}
      {cSel && (
        <>
          <div onClick={() => setCSel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.24)', zIndex: 30 }}></div>
          {(() => {
            const cr = coll.find(x => x.id === cSel);
            if (!cr) return null;
            return (
              <aside style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '460px', maxWidth: '100vw', background: '#FFFFFF', borderLeft: '1px solid #E5E7EB', zIndex: 31, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 24px rgba(17,24,39,0.08)' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>{cr.type} · {cr.inv}</span>
                    <span style={{ fontSize: '20px', fontWeight: 600 }}>{cr.cust}</span>
                  </div>
                  <button onClick={() => setCSel(null)} style={{ height: '32px', padding: '0 10px', border: 'none', background: 'transparent', borderRadius: '8px', color: '#6B7280', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Close</button>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '14px', borderRadius: '10px', background: '#F9FAFB' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '12px', color: '#6B7280' }}>Outstanding</span><span style={{ fontSize: '20px', fontWeight: 700 }}>{fmt(cr.amt)}</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '12px', color: '#6B7280' }}>Age</span><span style={{ fontSize: '20px', fontWeight: 700 }}>{cr.age} days</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '12px', color: '#6B7280' }}>Owner</span><span style={{ fontSize: '13px', fontWeight: 500 }}>{cr.owner}</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '12px', color: '#6B7280' }}>Stage</span><span><span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: chip(cr.stage).bg, color: chip(cr.stage).fg }}>{cr.stage}</span></span></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>Next action · last contact {cr.last}</span>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{cr.next}</span>
                  </div>
                  {/* Reassign Owner */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Reassign Owner</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select value={reassignTo} onChange={e => setReassignTo(e.target.value)} style={{ flex: 1, minWidth: 0, height: '40px', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '0 10px', fontSize: '14px', outline: 'none', background: '#FFFFFF' }}>
                        <option value="">Select executive</option>
                        {EXECS.filter(n => n !== cr.owner).map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <button onClick={() => handleCollAction('reassign')} style={{ height: '40px', padding: '0 16px', borderRadius: '10px', border: '1px solid #E5E7EB', background: '#FFFFFF', color: '#111827', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                        Reassign
                      </button>
                    </div>
                  </div>

                  {/* Write-Off Request Review */}
                  {cr.wo && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', borderRadius: '10px', border: '1px solid #FDE68A', background: '#FFFBEB' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#92400E' }}>Write-off Request · {fmt(cr.wo.amt)}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: chip(cr.wo.status).bg, color: chip(cr.wo.status).fg }}>
                          {cr.wo.status}
                        </span>
                      </div>
                      <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.45 }}>{cr.wo.reason}</span>
                      <span style={{ fontSize: '12px', color: '#92400E' }}>
                        {cr.wo.amt > 10000 ? 'Above your ₹ 10,000 write-off limit — approving forwards to the Accounts Manager.' : 'Within your ₹ 10,000 write-off limit.'}
                      </span>
                      {cr.wo.status === 'Pending' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleCollAction('woApprove')} style={{ flex: 1.3, height: '40px', borderRadius: '10px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                            Approve Write-off
                          </button>
                          <button onClick={() => handleCollAction('woReject')} style={{ flex: 1, height: '40px', borderRadius: '10px', border: '1px solid #FECACA', background: '#FFFFFF', color: '#DC2626', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB' }}>
                  <button onClick={() => handleCollAction('escalate')} style={{ width: '100%', height: '40px', borderRadius: '10px', border: '1px solid #FDE68A', background: '#FFFFFF', color: '#B45309', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                    {cr.mgr ? 'Escalated to Manager' : 'Escalate to Manager'}
                  </button>
                </div>
              </aside>
            );
          })()}
        </>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div style={{ position: 'fixed', right: '24px', bottom: '24px', zIndex: 60, background: '#111827', color: '#FFFFFF', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', boxShadow: '0 8px 24px rgba(17,24,39,0.2)', maxWidth: '460px', lineHeight: 1.45 }}>
          {toast}
        </div>
      )}
    </div>
  );
};
