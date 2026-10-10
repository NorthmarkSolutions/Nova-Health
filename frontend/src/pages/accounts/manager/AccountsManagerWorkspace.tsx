import React, { useEffect, useMemo, useState } from 'react';
import { AccountsStickyAppBar, RoleViewKey } from '../components/AccountsStickyAppBar';
import { AccountsSidebarUserFooter } from '../components/AccountsSidebarUserFooter';
import {
  LayoutDashboard,
  HandCoins,
  Wallet,
  ChartLine,
  ShieldAlert,
  BadgeIndianRupee,
  PiggyBank,
  ChartPie,
  FileCheck,
  TriangleAlert,
  CalendarRange,
  CalendarCheck,
  Users,
  Building2,
  Flag,
  ScrollText,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  accountsService,
  ApprovalRequestItem,
  ManagerDashboardData,
  SummaryGroup,
  PayerItem,
  PayableBill,
  CashflowProjection,
  HighValueTransaction,
  DepartmentBudget,
  CostCenterAnalysis,
  FinancialExceptionItem,
  GSTBatchDetail,
  EscalationRecord,
  WeeklyReviewData,
  MonthEndReadinessData,
  SupervisorPerformance,
  ExecutivePerformance,
  DepartmentPerformance,
  AuditRecord,
  TrailEntry,
  Tone
} from '../../../services/accountsService';

// Utility formatters
const fmt = (n: number | string) => '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const cr = (n: number | string) => {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  const sg = v < 0 ? '− ' : '';
  return a >= 1e7 ? `${sg}₹ ${(a / 1e7).toFixed(2)} Cr` : a >= 1e5 ? `${sg}₹ ${(a / 1e5).toFixed(1)} L` : sg + fmt(a);
};
const ageL = (h: number) => (h < 24 ? `${h}h` : `${Math.round(h / 24)}d`);
const hoursSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3600000));
const stamp = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const apiError = (e: any) =>
  e?.response?.data?.error?.message || e?.response?.data?.detail || e?.response?.data?.message || 'Request failed — please retry.';

const PERIOD = '2026-09';
const BUFFER_CR = 5;
const SUP_CAPACITY = 25;
const AGING = ['0–30 days', '31–60 days', '61–90 days', '90+ days'];

// Accounts Manager DoFA limits (POL-01) by approval document type
const LIMIT: Record<string, number> = {
  journal: 500000,
  vendor_bill: 1000000,
  expense: 200000,
  expense_request: 200000,
  refund: 500000,
  write_off: 100000,
  reconciliation: 2500000,
  'Vendor Bill': 1000000,
  Refund: 500000,
  'Expense Request': 200000,
  Adjustment: 500000
};
const DOC_LABEL: Record<string, string> = {
  journal: 'Journal',
  vendor_bill: 'Vendor Bill',
  expense: 'Expense',
  expense_request: 'Expense',
  refund: 'Refund',
  write_off: 'Write-off',
  reconciliation: 'Reconciliation',
  payment_batch: 'Payment Batch'
};
const CRITICAL_FLAGS = ['missing_documents', 'duplicate_risk', 'budget_exceeded', 'related_party', 'bank_change'];
const ESC_REASONS = ['High Amount', 'Duplicate Risk', 'Compliance Risk', 'Budget Violation', 'Fraud Concern'];
const REASON_LABEL: Record<string, string> = {
  high_amount: 'High Amount',
  duplicate_risk: 'Duplicate Risk',
  compliance_risk: 'Compliance Risk',
  budget_violation: 'Budget Violation',
  fraud_concern: 'Fraud Concern',
  fraud_suspicion: 'Fraud Concern'
};
const ESC_TYPE_LABEL: Record<string, string> = {
  approval: 'Escalated Approval',
  collection: 'Collection',
  vendor_issue: 'Vendor Issue',
  budget_overrun: 'Budget Overrun',
  gst_issue: 'GST Issue',
  financial_exception: 'Exception',
  month_end_delay: 'Month-End Delay',
  write_off: 'Write-off'
};
const ESC_TO_LABEL: Record<string, string> = {
  manager: 'Accounts Manager',
  finance_controller: 'Finance Controller',
  controller: 'Finance Controller',
  recovery_desk: 'Recovery Desk',
  procurement: 'Procurement'
};

const G = '#F3F4F6';
const GF = '#374151';
const CH: Record<string, [string, string]> = {
  Open: ['#FEF2F2', '#B91C1C'],
  Pending: ['#EFF6FF', '#1D4ED8'],
  Investigating: ['#FFFBEB', '#B45309'],
  Resolved: ['#F0FDF4', '#15803D'],
  Forwarded: ['#F0F9FF', '#0369A1'],
  'With Controller': ['#F0F9FF', '#0369A1'],
  Approved: ['#F0FDF4', '#15803D'],
  Rejected: ['#FEF2F2', '#B91C1C'],
  Returned: ['#FFFBEB', '#B45309'],
  'Awaiting Manager': ['#EFF6FF', '#1D4ED8'],
  Scheduled: ['#F0FDF4', '#15803D'],
  'On Hold': ['#FFFBEB', '#B45309'],
  Posted: [G, GF],
  'With Supervisor': [G, GF],
  Reviewed: ['#F0FDF4', '#15803D'],
  Escalated: ['#FEF2F2', '#B91C1C'],
  New: ['#EFF6FF', '#1D4ED8'],
  Assigned: [G, GF],
  Closed: ['#F0FDF4', '#15803D'],
  'On Track': ['#F0FDF4', '#15803D'],
  Delayed: ['#FEF2F2', '#B91C1C'],
  Done: ['#F0FDF4', '#15803D'],
  High: ['#FEF2F2', '#B91C1C'],
  Medium: ['#FFFBEB', '#B45309'],
  Low: [G, GF],
  Urgent: ['#FEF2F2', '#B91C1C'],
  Normal: [G, GF],
  Defer: ['#FFFBEB', '#B45309'],
  'Over Budget': ['#FEF2F2', '#B91C1C'],
  'Near Limit': ['#FFFBEB', '#B45309'],
  'Within Budget': ['#F0FDF4', '#15803D'],
  'High Amount': ['#F0F9FF', '#0369A1'],
  'Duplicate Risk': ['#FEF2F2', '#B91C1C'],
  'Compliance Risk': ['#FFFBEB', '#B45309'],
  'Budget Violation': ['#FFFBEB', '#B45309'],
  'Fraud Concern': ['#FEF2F2', '#B91C1C'],
  Overloaded: ['#FEF2F2', '#B91C1C'],
  Balanced: ['#F0FDF4', '#15803D'],
  Requested: ['#FFFBEB', '#B45309'],
  Approval: ['#EFF6FF', '#1D4ED8'],
  Exception: ['#FFFBEB', '#B45309'],
  Escalation: ['#FEF2F2', '#B91C1C'],
  'Write-off': ['#FFFBEB', '#B45309']
};
const chip = (st: string) => {
  const c = CH[st] || [G, GF];
  return { label: st, bg: c[0], fg: c[1] };
};

const TONE: Record<Tone, [string, string, string]> = {
  blue: ['#EFF6FF', '#2563EB', '#6B7280'],
  green: ['#F0FDF4', '#16A34A', '#15803D'],
  amber: ['#FFFBEB', '#F59E0B', '#B45309'],
  red: ['#FEF2F2', '#DC2626', '#B91C1C'],
  gray: ['#F3F4F6', '#6B7280', '#6B7280']
};

type Sev = 'critical' | 'warning' | 'info' | 'success';
const SEV: Record<Sev, { bg: string; bd: string; fg: string; tag: string }> = {
  critical: { bg: '#FEF2F2', bd: '#FECACA', fg: '#991B1B', tag: 'Critical' },
  warning: { bg: '#FFFBEB', bd: '#FDE68A', fg: '#92400E', tag: 'Warning' },
  info: { bg: '#F0F9FF', bd: '#BAE6FD', fg: '#075985', tag: 'Info' },
  success: { bg: '#F0FDF4', bd: '#BBF7D0', fg: '#166534', tag: 'OK' }
};

const SCREENS: Record<string, [string, string, string]> = {
  dashboard: ['Overview', 'Financial Command Center', 'Money in, money out, receivables at risk, vendors to pay, escalations, budget overruns and month-end blockers — in one view.'],
  receivables: ['Financial Operations', 'Receivables Control', 'Payer-level receivables from Patient Billing, Insurance, Corporate and TPA. Set recovery priority, escalate and decide write-offs.'],
  payables: ['Financial Operations', 'Payables Control', 'Vendor liabilities by vendor, department and category. Approve high-value bills and prioritise the payment run.'],
  cash: ['Financial Operations', 'Cash Flow Monitor', 'Projected collections and payments against today’s cash position across the hospital’s bank accounts.'],
  escalated: ['Approvals', 'Escalated Approvals', 'Cases escalated by Accounts Supervisors. Decide within your limits; forward the rest to the Finance Controller.'],
  highvalue: ['Approvals', 'High Value Transactions', 'Every bill, refund, expense and adjustment of ₹ 1 L and above across the hospital.'],
  budgets: ['Budget & Cost', 'Department Budgets', 'FY 2026-27 year-to-date spend against prorated budget for each department.'],
  costcenter: ['Budget & Cost', 'Cost Center Analysis', 'Spending, expense mix and budget variance by cost center.'],
  gst: ['Compliance', 'GST Oversight', 'Process quality of GST batches across supervisors. Invoice-level corrections stay with the team.'],
  exceptions: ['Compliance', 'Financial Exceptions', 'Central exception center — assign, investigate, escalate or close.'],
  weekly: ['Operations', 'Weekly Financial Review', 'Weekly command center for collections, payments, balances and department spending.'],
  monthend: ['Operations', 'Month-End Readiness', 'Preparation for the September close — the Finance Controller locks the period on 10 Oct 2026.'],
  team: ['Monitoring', 'Team Performance', 'Approvals, returns, turnaround and queue load across Accounts Supervisors and Executives.'],
  deptperf: ['Monitoring', 'Department Performance', 'Revenue, expense, profitability and receivables by clinical department.'],
  escalations: ['Tracking', 'Escalations', 'Every escalated financial issue, from Supervisors and from you, through to resolution.'],
  audit: ['Tracking', 'Audit Trail', 'Read-only record of approvals, budget actions, escalations, write-off decisions and assignments.']
};

const NAV_GROUPS: Array<[string, Array<[string, string]>]> = [
  ['', [['dashboard', 'Dashboard']]],
  ['Financial Operations', [['receivables', 'Receivables Control'], ['payables', 'Payables Control'], ['cash', 'Cash Flow Monitor']]],
  ['Approvals', [['escalated', 'Escalated Approvals'], ['highvalue', 'High Value Transactions']]],
  ['Budget & Cost', [['budgets', 'Department Budgets'], ['costcenter', 'Cost Center Analysis']]],
  ['Compliance', [['gst', 'GST Oversight'], ['exceptions', 'Financial Exceptions']]],
  ['Operations', [['weekly', 'Weekly Financial Review'], ['monthend', 'Month-End Readiness']]],
  ['Monitoring', [['team', 'Team Performance'], ['deptperf', 'Department Performance']]],
  ['Tracking', [['escalations', 'Escalations'], ['audit', 'Audit Trail']]]
];

const ICONS: Record<string, React.ReactElement> = {
  dashboard: <LayoutDashboard size={18} />,
  receivables: <HandCoins size={18} />,
  payables: <Wallet size={18} />,
  cash: <ChartLine size={18} />,
  escalated: <ShieldAlert size={18} />,
  highvalue: <BadgeIndianRupee size={18} />,
  budgets: <PiggyBank size={18} />,
  costcenter: <ChartPie size={18} />,
  gst: <FileCheck size={18} />,
  exceptions: <TriangleAlert size={18} />,
  weekly: <CalendarRange size={18} />,
  monthend: <CalendarCheck size={18} />,
  team: <Users size={18} />,
  deptperf: <Building2 size={18} />,
  escalations: <Flag size={18} />,
  audit: <ScrollText size={18} />
};

const CARD: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: '12px',
  boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
  minWidth: 0
};
const TABLE_HEAD: React.CSSProperties = {
  display: 'grid',
  gap: '12px',
  padding: '0 20px',
  height: '44px',
  alignItems: 'center',
  background: '#F9FAFB',
  borderTop: '1px solid #E5E7EB',
  borderBottom: '1px solid #E5E7EB',
  fontSize: '12px',
  fontWeight: 600,
  color: '#6B7280'
};
const TABLE_ROW: React.CSSProperties = {
  display: 'grid',
  gap: '12px',
  padding: '8px 20px',
  minHeight: '56px',
  alignItems: 'center',
  borderBottom: '1px solid #F3F4F6',
  fontSize: '14px'
};
const SELECT: React.CSSProperties = {
  height: '40px',
  border: '1px solid #E5E7EB',
  borderRadius: '10px',
  padding: '0 10px',
  fontSize: '14px',
  outline: 'none',
  background: '#FFFFFF'
};

type KpiSpec = { label: string; value: string; trend: string; tone: Tone; onClick?: () => void };
type Info = { sev: Sev; t: string };
type Act = [string, string, 'p' | 's' | 'd' | 'w'];
type PanelSpec = {
  kicker: string;
  title: string;
  amtL: string;
  st: string;
  info: Info[];
  kv: Array<[string, string]>;
  bars?: Array<{ l: string; v: string; w: string; c: string }>;
  barsTitle?: string;
  listTitle?: string;
  list?: string[];
  trail?: TrailEntry[];
  select?: { label: string; placeholder: string; options: string[] };
  acks?: string[];
  canAct: boolean;
  cmtPh?: string;
  acts: Act[];
  roNote?: string;
};
type QueueRow = {
  id: string;
  c1: string;
  ref: string;
  sub: string;
  dept: string;
  amtL: string;
  who: string;
  age: string;
  ageC?: string;
  st: string;
  bar?: [string, string];
};
type QueueCols = { c1: string; ref: string; dept: string; amt: string; who: string; age: string; st: string };

const Chip: React.FC<{ st: string; style?: React.CSSProperties }> = ({ st, style }) => {
  const c = chip(st);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', background: c.bg, color: c.fg, ...style }}>
      {c.label}
    </span>
  );
};

const Kpi: React.FC<{ k: KpiSpec }> = ({ k }) => {
  const t = TONE[k.tone] || TONE.gray;
  return (
    <div
      onClick={k.onClick}
      style={{ ...CARD, height: '120px', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: k.onClick ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t[0] }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: t[1] }}></span>
        </span>
        <span style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, color: t[2] }}>{k.trend}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.value}</div>
        <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</div>
      </div>
    </div>
  );
};

const Segmented: React.FC<{ options: string[]; value: string; onChange: (v: string) => void }> = ({ options, value, onChange }) => (
  <div style={{ display: 'flex', gap: '4px', padding: '4px', background: '#F3F4F6', borderRadius: '10px', flexWrap: 'wrap' }}>
    {options.map((o) => {
      const on = o === value;
      return (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{ height: '32px', padding: '0 12px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', background: on ? '#FFFFFF' : 'transparent', color: on ? '#111827' : '#6B7280', boxShadow: on ? '0 1px 2px rgba(17,24,39,0.08)' : 'none' }}
        >
          {o}
        </button>
      );
    })}
  </div>
);

const Tabs: React.FC<{ tabs: Array<{ label: string; count: number; active: boolean; onClick: () => void }> }> = ({ tabs }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px', background: '#F3F4F6', borderRadius: '10px' }}>
    {tabs.map((t) => (
      <button
        key={t.label}
        onClick={t.onClick}
        style={{ height: '32px', padding: '0 10px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', background: t.active ? '#FFFFFF' : 'transparent', color: t.active ? '#111827' : '#6B7280', boxShadow: t.active ? '0 1px 2px rgba(17,24,39,0.08)' : 'none' }}
      >
        {t.label}
        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{t.count}</span>
      </button>
    ))}
  </div>
);

type ChartSpec = {
  title: string;
  sub: string;
  labels: string[];
  a: number[];
  b?: number[];
  color?: (v: number, i: number) => string;
  legend?: Array<{ l: string; c: string }>;
  foot?: string;
  line?: number;
  lineLabel?: string;
  tip?: (i: number) => string;
};

const BarChart: React.FC<{ c: ChartSpec }> = ({ c }) => {
  const mx = Math.max(...c.a.map(Math.abs), ...(c.b || [0]).map(Math.abs), c.line || 0) || 1;
  const h = (v: number) => Math.max(2, Math.round((Math.abs(v) / mx) * 120)) + 'px';
  return (
    <div style={{ ...CARD, padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '16px', fontWeight: 600 }}>{c.title}</span>
          <span style={{ fontSize: '13px', color: '#6B7280' }}>{c.sub}</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {(c.legend || []).map((lg) => (
            <span key={lg.l} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B7280' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: lg.c }}></span>
              {lg.l}
            </span>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative', height: '132px', display: 'flex', alignItems: 'flex-end', gap: '4px', borderBottom: '1px solid #E5E7EB' }}>
        {c.line ? (
          <>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: Math.round((c.line / mx) * 120) + 'px', borderTop: '1.5px dashed #DC2626', zIndex: 1 }}></div>
            <span style={{ position: 'absolute', left: 0, bottom: Math.round((c.line / mx) * 120) + 'px', fontSize: '11px', fontWeight: 600, color: '#B91C1C', background: '#FFFFFF', padding: '0 4px', zIndex: 2, marginBottom: '2px' }}>
              {c.lineLabel}
            </span>
          </>
        ) : null}
        {c.labels.map((l, i) => (
          <div key={i} title={c.tip ? c.tip(i) : l} style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '2px' }}>
            <div style={{ flex: 1, maxWidth: '24px', borderRadius: '3px 3px 0 0', height: h(c.a[i]), background: c.color ? c.color(c.a[i], i) : '#2563EB' }}></div>
            {c.b ? <div style={{ flex: 1, maxWidth: '24px', borderRadius: '3px 3px 0 0', height: h(c.b[i]), background: '#CBD5E1' }}></div> : null}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '4px', marginTop: '-6px' }}>
        {c.labels.map((l, i) => (
          <span key={i} style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: '11px', color: '#6B7280', whiteSpace: 'nowrap' }}>{l}</span>
        ))}
      </div>
      {c.foot ? <span style={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.45 }}>{c.foot}</span> : null}
    </div>
  );
};

const InfoBox: React.FC<{ w: Info }> = ({ w }) => {
  const s = SEV[w.sev];
  return (
    <div style={{ padding: '10px 12px', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start', background: s.bg, border: `1px solid ${s.bd}` }}>
      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.03em', flexShrink: 0, marginTop: '2px', color: s.fg }}>{s.tag}</span>
      <span style={{ fontSize: '13px', lineHeight: 1.45, color: s.fg }}>{w.t}</span>
    </div>
  );
};

const ProgressBar: React.FC<{ w: string; c: string; h?: number; max?: string }> = ({ w, c, h = 8, max }) => (
  <span style={{ flex: 1, height: `${h}px`, borderRadius: `${h / 2}px`, background: '#F3F4F6', overflow: 'hidden', maxWidth: max, display: 'block' }}>
    <span style={{ display: 'block', height: `${h}px`, borderRadius: `${h / 2}px`, width: w, background: c }}></span>
  </span>
);

export const AccountsManagerWorkspace: React.FC<any> = ({
  activeRoleView = 'manager',
  onSelectRole = () => {},
  workload,
  currentTime,
  onOpenMaster
}) => {
  const { user } = useAuth();
  const mgrName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Accounts Manager';
  const mgrIni = mgrName.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();

  const [screen, setScreen] = useState<string>(() => {
    try {
      const s = localStorage.getItem('amScreen');
      return s && SCREENS[s] ? s : 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [q, setQ] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Record<string, string>>({ gst: 'Open Issues', exceptions: 'Open', escalations: 'Open', audit: 'This Week', team: 'Supervisors' });
  const [sel, setSel] = useState<Record<string, string>>({});
  const [cmt, setCmt] = useState('');
  const [err, setErr] = useState('');
  const [selVal, setSelVal] = useState('');
  const [acks, setAcks] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  // View options
  const [rView, setRView] = useState('By Payer');
  const [rGroup, setRGroup] = useState('');
  const [pView, setPView] = useState('Vendor Wise');
  const [pGroup, setPGroup] = useState('');
  const [cfRange, setCfRange] = useState('30 Days');
  const [ccView, setCcView] = useState<'Monthly' | 'Quarterly' | 'Yearly'>('Monthly');
  const [wk, setWk] = useState<'This Week' | 'Last Week'>('This Week');
  const [summaryShown, setSummaryShown] = useState<Record<string, boolean>>({});
  const [chkOwner, setChkOwner] = useState<Record<string, string>>({});
  const [aUser, setAUser] = useState('All users');
  const [aMod, setAMod] = useState('All modules');
  const [aAct, setAAct] = useState('All actions');

  // Live data
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [dash, setDash] = useState<ManagerDashboardData | null>(null);
  const [queue, setQueue] = useState<ApprovalRequestItem[]>([]);
  const [payers, setPayers] = useState<PayerItem[]>([]);
  const [bills, setBills] = useState<PayableBill[]>([]);
  const [hv, setHv] = useState<HighValueTransaction[]>([]);
  const [budgets, setBudgets] = useState<DepartmentBudget[]>([]);
  const [excs, setExcs] = useState<FinancialExceptionItem[]>([]);
  const [gst, setGst] = useState<GSTBatchDetail[]>([]);
  const [escs, setEscs] = useState<EscalationRecord[]>([]);
  const [monthend, setMonthend] = useState<MonthEndReadinessData | null>(null);
  const [sups, setSups] = useState<SupervisorPerformance[]>([]);
  const [execs, setExecs] = useState<ExecutivePerformance[]>([]);
  const [deptPerf, setDeptPerf] = useState<DepartmentPerformance | null>(null);
  const [audit, setAudit] = useState<AuditRecord[]>([]);
  const [rcvSummary, setRcvSummary] = useState<SummaryGroup[]>([]);
  const [paySummary, setPaySummary] = useState<SummaryGroup[]>([]);
  const [cash, setCash] = useState<CashflowProjection | null>(null);
  const [cash30, setCash30] = useState<CashflowProjection | null>(null);
  const [cc, setCc] = useState<CostCenterAnalysis | null>(null);
  const [weekly, setWeekly] = useState<WeeklyReviewData | null>(null);

  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    let alive = true;
    const loaders: Array<[string, () => Promise<any>, (v: any) => void]> = [
      ['Dashboard', accountsService.getManagerDashboard, setDash],
      ['Escalated approvals', () => accountsService.getManagerQueue(), setQueue],
      ['Receivables', accountsService.getReceivablesPayers, setPayers],
      ['Payables', accountsService.getPayableBills, setBills],
      ['High value transactions', () => accountsService.getHighValueTransactions(), setHv],
      ['Budgets', () => accountsService.getDepartmentBudgets(), setBudgets],
      ['Exceptions', accountsService.getFinancialExceptions, setExcs],
      ['GST batches', accountsService.getGSTBatchesDetailed, setGst],
      ['Escalations', accountsService.getAllEscalations, setEscs],
      ['Month-end readiness', () => accountsService.getMonthEndReadiness(PERIOD), setMonthend],
      ['Supervisor performance', accountsService.getSupervisorPerformance, setSups],
      ['Executive performance', accountsService.getExecutivePerformance, setExecs],
      ['Department performance', accountsService.getDepartmentPerformance, setDeptPerf],
      ['Audit trail', () => accountsService.getRecentAudit(31), setAudit],
      ['Cash projection', () => accountsService.getCashflowProjection(30, BUFFER_CR), setCash30]
    ];
    Promise.allSettled(loaders.map(([, fn]) => fn())).then((results) => {
      if (!alive) return;
      const failed: string[] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') loaders[i][2](r.value);
        else failed.push(loaders[i][0]);
      });
      setLoadErrors(failed);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [tick]);

  useEffect(() => {
    const g = rView === 'By Payer' ? 'payer' : rView === 'By Department' ? 'department' : 'aging';
    accountsService.getReceivablesSummary(g).then(setRcvSummary).catch(() => setRcvSummary([]));
  }, [rView, tick]);

  useEffect(() => {
    const g = pView === 'Vendor Wise' ? 'vendor' : pView === 'Department Wise' ? 'department' : 'category';
    accountsService.getPayablesSummary(g).then(setPaySummary).catch(() => setPaySummary([]));
  }, [pView, tick]);

  useEffect(() => {
    accountsService.getCashflowProjection(parseInt(cfRange, 10), BUFFER_CR).then(setCash).catch(() => setCash(null));
  }, [cfRange, tick]);

  useEffect(() => {
    accountsService.getCostCenterAnalysis(ccView).then(setCc).catch(() => setCc(null));
  }, [ccView, tick]);

  useEffect(() => {
    accountsService.getWeeklyReview(wk).then(setWeekly).catch(() => setWeekly(null));
  }, [wk, tick]);

  const say = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((cur) => (cur === m ? '' : cur)), 3400);
  };

  const go = (sc: string, extra?: { sel?: string; tab?: string }) => {
    setScreen(sc);
    setCmt('');
    setErr('');
    setSelVal('');
    setAcks([]);
    if (extra?.sel) setSel((s) => ({ ...s, [sc]: extra.sel as string }));
    if (extra?.tab) setTab((t) => ({ ...t, [sc]: extra.tab as string }));
    try {
      localStorage.setItem('amScreen', sc);
    } catch {
      /* storage unavailable */
    }
  };

  const pick = (id: string) => {
    setSel((s) => ({ ...s, [screen]: id }));
    setCmt('');
    setErr('');
    setSelVal('');
    setAcks([]);
  };

  const staff = useMemo(() => [...sups.map((s) => s.name), ...execs.map((e) => e.name)], [sups, execs]);

  // ----- Shared derived data -----
  const pendingQueue = useMemo(() => queue.filter((r) => r.status === 'pending' || r.status === 'escalated'), [queue]);
  const overBudget = budgets.filter((b) => b.status === 'Over Budget');
  const escStatus = (e: EscalationRecord) =>
    e.status === 'investigating' ? 'Investigating' : e.status === 'forwarded' ? 'Forwarded' : e.status === 'resolved' || e.status === 'closed' ? 'Resolved' : 'Open';
  const queueReason = (r: ApprovalRequestItem) => {
    const handoff = [...(r.steps || [])].reverse().find((s) => ['escalate', 'approve_and_forward', 'forward'].includes(s.decision));
    const code = (handoff as any)?.reason_code as string | undefined;
    return { reason: (code && REASON_LABEL[code]) || 'High Amount', sup: handoff?.actor_name || '—', note: handoff?.comment || '', at: handoff?.decided_at };
  };
  const queueStatus = (r: ApprovalRequestItem) =>
    r.status === 'pending' || r.status === 'escalated' ? 'Pending' : r.status === 'approved' ? 'Approved' : r.status === 'returned' ? 'Returned' : r.status === 'rejected' ? 'Rejected' : 'Forwarded';
  const gstStatus = (g: GSTBatchDetail) => {
    if (g.status === 'escalated') return 'Escalated';
    if (g.reviewed_by_manager) return 'Reviewed';
    return ({ submitted: 'With Supervisor', rejected: 'Rejected', approved: 'Approved', returned: 'Returned', draft: 'Draft' } as Record<string, string>)[g.status] || g.status;
  };
  const readiness = monthend?.readiness_score ?? null;

  const badges: Record<string, [number, boolean]> = {
    escalated: [pendingQueue.length, true],
    highvalue: [hv.filter((h) => h.status === 'Awaiting Manager').length, false],
    payables: [bills.filter((b) => b.status === 'Awaiting Manager').length, false],
    budgets: [overBudget.length, true],
    exceptions: [excs.filter((x) => x.status === 'New').length, false],
    escalations: [escs.filter((e) => escStatus(e) === 'Open').length, true],
    monthend: [(monthend?.checklist || []).filter((k) => k.status === 'Delayed').length, true]
  };

  // ----- Generic queue builder -----
  const curQ = (q[screen] || '').toLowerCase();
  function buildQueue<T extends { id: string }>(cfg: {
    items: T[];
    tabs: Array<[string, (x: T) => boolean]>;
    search: (x: T) => string;
    sort?: (a: T, b: T) => number;
    extra?: ((x: T) => boolean) | null;
  }) {
    const active = cfg.tabs.find((t) => t[0] === tab[screen]) || cfg.tabs[0];
    let list = cfg.items.filter(active[1]).filter((x) => !curQ || cfg.search(x).toLowerCase().includes(curQ));
    if (cfg.extra) list = list.filter(cfg.extra);
    if (cfg.sort) list = [...list].sort(cfg.sort);
    const cur = list.find((x) => x.id === sel[screen]) || list[0] || null;
    const tabs = cfg.tabs.map(([label, f]) => ({
      label,
      count: cfg.items.filter(f).length,
      active: label === active[0],
      onClick: () => setTab((t) => ({ ...t, [screen]: label }))
    }));
    return { list, cur, tabs };
  }

  // ----- Actions -----
  const NEEDS_COMMENT = ['reject', 'return', 'forward', 'hold', 'escalate', 'close', 'explain', 'escOverrun', 'escColl', 'escVendor', 'flag', 'woReject', 'resolve', 'gstEsc'];

  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true);
    try {
      const msg = await fn();
      setCmt('');
      setErr('');
      setSelVal('');
      setAcks([]);
      if (msg) say(msg);
      refresh();
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const act = (kind: string, id: string) => {
    const c = cmt.trim();
    if (NEEDS_COMMENT.includes(kind) && c.length < 5) {
      setErr('Add a comment (at least 5 characters) — it travels with your decision.');
      return;
    }

    if (screen === 'escalated') {
      const r = queue.find((x) => x.id === id);
      if (!r) return;
      const missing = r.risk_flags.filter((f) => CRITICAL_FLAGS.includes(f) && !acks.includes(f));
      if (kind === 'approve' && missing.length) {
        setErr(`Acknowledge the critical risk signals before approving: ${missing.join(', ').replace(/_/g, ' ')}.`);
        return;
      }
      const label: Record<string, string> = { approve: 'approved', return: 'returned to the supervisor', reject: 'rejected', forward: 'forwarded to the Finance Controller' };
      return run(async () => {
        await accountsService.processDecision(r.id, { decision: kind as any, comment: c, acknowledgements: acks, version: r.version });
        return `${r.reference_no} — ${label[kind]}`;
      });
    }

    if (screen === 'receivables') {
      const p = payers.find((x) => x.id === id);
      if (!p) return;
      if (kind === 'prio') {
        if (!selVal) return setErr('Choose a recovery priority first.');
        return run(async () => {
          await accountsService.setReceivablePriority(p.id, selVal);
          return `${p.payer} set to ${selVal} recovery priority`;
        });
      }
      if (kind === 'escColl')
        return run(async () => {
          await accountsService.escalateReceivableCollection(p.id, c);
          return 'Collection escalated to the Recovery Desk — tracked in Escalations';
        });
      if (kind === 'woApprove' || kind === 'woReject')
        return run(async () => {
          const res = await accountsService.decidePayerWriteOff(p.id, kind === 'woApprove' ? 'approve' : 'reject', c);
          return res.message;
        });
    }

    if (screen === 'payables') {
      const b = bills.find((x) => x.id === id);
      if (!b) return;
      if (kind === 'approve' || kind === 'hold')
        return run(async () => (await accountsService.decideVendorBill(b.id, kind, c)).message);
      if (kind === 'prio') {
        if (!selVal) return setErr('Choose a payment priority first.');
        return run(async () => {
          await accountsService.setVendorBillPaymentPriority(b.id, selVal);
          return `${b.vendor} set to ${selVal}${selVal === 'Urgent' && b.status === 'Approved' ? ' and added to the next payment run' : ''}`;
        });
      }
      if (kind === 'escVendor')
        return run(async () => {
          await accountsService.escalateVendorIssue(b.id, c);
          return 'Vendor issue escalated to Procurement — tracked in Escalations';
        });
    }

    if (screen === 'highvalue') {
      const h = hv.find((x) => x.id === id);
      if (!h) return;
      if (kind === 'flag')
        return run(async () => {
          const res = await accountsService.flagHighValueTransaction(h.id, c);
          return `${h.ref} flagged — ${res.exception_no || 'exception'} created in Financial Exceptions`;
        });
      return run(async () => (await accountsService.decideHighValueTransaction(h.id, kind as any, c)).message);
    }

    if (screen === 'budgets') {
      const b = budgets.find((x) => x.id === id);
      if (!b) return;
      if (kind === 'explain') return run(async () => (await accountsService.requestBudgetExplanation(b.dept, c)).message);
      if (kind === 'escOverrun') return run(async () => (await accountsService.escalateBudgetOverrun(b.dept, c)).message);
    }

    if (screen === 'gst') {
      const g = gst.find((x) => x.id === id);
      if (!g) return;
      if (kind === 'review')
        return run(async () => {
          await accountsService.reviewGSTBatchExceptions(g.id, c);
          return `${g.reference_no} exceptions reviewed`;
        });
      if (kind === 'gstEsc') return run(async () => (await accountsService.escalateGSTBatch(g.id, c)).message);
    }

    if (screen === 'exceptions') {
      const x = excs.find((e) => e.id === id);
      if (!x) return;
      if (kind === 'assign' && !selVal) return setErr('Choose who should own this exception.');
      const labels: Record<string, string> = { assign: `assigned to ${selVal}`, investigate: 'investigation started', escalate: 'escalated to the Finance Controller', close: 'closed' };
      return run(async () => {
        await accountsService.actOnFinancialException(x.id, kind as any, { owner: selVal, comment: c });
        return `${x.id} — ${labels[kind]}`;
      });
    }

    if (screen === 'escalations') {
      const e = escs.find((x) => x.id === id);
      if (!e) return;
      if (kind === 'open') {
        const linked = queue.find((r) => r.document_id === e.entity_id);
        if (!linked) return setErr('The linked approval is no longer in your queue.');
        return go('escalated', { sel: linked.id, tab: 'All' });
      }
      const map: Record<string, ['investigate' | 'forward_to_controller' | 'resolve', string]> = {
        investigate: ['investigate', 'investigation started'],
        forward: ['forward_to_controller', 'forwarded to the Finance Controller'],
        resolve: ['resolve', 'resolved']
      };
      return run(async () => {
        await accountsService.transitionEscalation(e.id, map[kind][0], c);
        return `${e.reference_no} — ${map[kind][1]}`;
      });
    }
  };

  const assignChecklist = (code: string, current: string) => {
    const o = chkOwner[code];
    if (!o || o === current) return say('Choose a different owner to assign.');
    run(async () => {
      await accountsService.reassignMonthEndChecklistOwner(PERIOD, code, o);
      setChkOwner((s) => ({ ...s, [code]: '' }));
      return `Checklist item assigned to ${o}`;
    });
  };

  const escalateDelays = () =>
    run(async () => {
      const res = await accountsService.escalateMonthEndDelays(PERIOD);
      return res.count ? `${res.count} delayed tasks escalated to the Finance Controller` : 'No new delayed tasks to escalate.';
    });

  const shareWeekly = () =>
    run(async () => {
      await accountsService.shareWeeklyReview(wk);
      return 'Weekly summary shared with the Finance Controller';
    });

  const exportAudit = (rows: AuditRecord[]) => {
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      ['Timestamp', 'User', 'Role', 'Action', 'Module', 'Reference', 'Detail'].join(','),
      ...rows.map((a) => [stamp(a.occurred_at), a.actor_name, a.actor_role, a.action, a.module, a.reference_no, a.reason].map(esc).join(','))
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `accounts-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    say(`Exported ${rows.length} audit records · read-only CSV`);
  };

  // ----- Screen assembly -----
  let kpis: KpiSpec[] = [];
  let headBtns: Array<{ label: string; onClick: () => void; kind?: 'p' | 'w' }> = [];
  let seg: { options: string[]; value: string; onChange: (v: string) => void } | null = null;
  let charts: ChartSpec[] = [];
  let summary: { title: string; views: string[]; view: string; setView: (v: string) => void; groups: SummaryGroup[]; filter: string; setFilter: (v: string) => void; col4: string } | null = null;
  let queueView: {
    tabs: Array<{ label: string; count: number; active: boolean; onClick: () => void }>;
    cols: QueueCols;
    rows: QueueRow[];
    curId: string | null;
    panel: PanelSpec | null;
    ph: string;
    meta: string;
  } | null = null;
  let body: React.ReactNode = null;

  const KV = (l: Array<[string, string]>) => l;

  if (screen === 'dashboard' && dash) {
    kpis = dash.kpis.map((k) => ({ label: k.label, value: k.value, trend: k.trend, tone: k.tone, onClick: () => go(k.link_screen) }));
    headBtns = [
      { label: 'Weekly Review', onClick: () => go('weekly') },
      { label: 'Cash Flow Monitor', onClick: () => go('cash'), kind: 'p' }
    ];
    const t = dash.trends;
    const n = t.weeks.length - 1;
    charts = [
      {
        title: 'Receivables Trend',
        sub: 'Outstanding at week end · ₹ Cr',
        labels: t.weeks,
        a: t.ar,
        color: (_v, i) => (i === n ? '#F59E0B' : '#FCD34D'),
        foot: `${t.ar[n] >= t.ar[0] ? 'Up' : 'Down'} ${Math.abs((t.ar[n] / t.ar[0] - 1) * 100).toFixed(1)}% in ${t.weeks.length} weeks.`,
        tip: (i) => `${t.weeks[i]} · ₹ ${t.ar[i].toFixed(2)} Cr`
      },
      {
        title: 'Payables Trend',
        sub: 'Outstanding at week end · ₹ Cr',
        labels: t.weeks,
        a: t.ap,
        color: (_v, i) => (i === n ? '#2563EB' : '#93C5FD'),
        foot: `${t.ap[n] <= t.ap[0] ? 'Down' : 'Up'} ${Math.abs((1 - t.ap[n] / t.ap[0]) * 100).toFixed(0)}% over the period.`,
        tip: (i) => `${t.weeks[i]} · ₹ ${t.ap[i].toFixed(2)} Cr`
      },
      {
        title: 'Cash Flow Trend',
        sub: 'Weekly inflow vs outflow · ₹ L',
        labels: t.weeks,
        a: t.cash_inflow,
        b: t.cash_outflow,
        legend: [{ l: 'Inflow', c: '#2563EB' }, { l: 'Outflow', c: '#CBD5E1' }],
        foot: `Net inflow positive in ${t.cash_inflow.filter((v, i) => v > t.cash_outflow[i]).length} of ${t.weeks.length} weeks.${cash30 ? ` Next 30 days: lowest balance ${cr(cash30.lowest_balance)} on ${cash30.lowest_date}.` : ''}`,
        tip: (i) => `${t.weeks[i]} · in ₹ ${t.cash_inflow[i]} L / out ₹ ${t.cash_outflow[i]} L`
      },
      {
        title: 'Department Spending Trend',
        sub: 'Total operating spend by month · ₹ Cr',
        labels: t.dept_spend_months,
        a: t.dept_spend,
        color: (_v, i) => (i === t.dept_spend.length - 1 ? '#1D4ED8' : '#93C5FD'),
        foot: `${t.dept_spend_months[t.dept_spend.length - 1]} spend ${cr(t.dept_spend[t.dept_spend.length - 1] * 1e7)}${overBudget.length ? ` — ${overBudget.map((b) => b.dept).join(' and ')} over budget` : ''}.`,
        tip: (i) => `₹ ${t.dept_spend[i]} Cr`
      }
    ];
    const openHp = (h: ManagerDashboardData['high_priority'][number]) =>
      h.screen === 'escalated' ? go('escalated', { sel: h.item_id, tab: 'All' }) : h.screen === 'exceptions' ? go('exceptions', { sel: h.ref, tab: 'Open' }) : go(h.screen, { sel: h.ref, tab: 'All' });
    body = (
      <>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ ...CARD, flex: '999 1 560px', overflowX: 'auto' }}>
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>High Priority Items</span>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>{dash.high_priority.length} items need you · showing top 8</span>
            </div>
            <div style={{ ...TABLE_HEAD, gridTemplateColumns: '96px minmax(160px,1fr) 110px 110px 80px', minWidth: '640px' }}>
              <span>Type</span><span>Item</span><span>Department</span><span style={{ textAlign: 'right' }}>Amount</span><span></span>
            </div>
            {dash.high_priority.slice(0, 8).map((h) => (
              <div key={h.type + h.ref} style={{ ...TABLE_ROW, gridTemplateColumns: '96px minmax(160px,1fr) 110px 110px 80px', minWidth: '640px' }}>
                <span><Chip st={h.type} /></span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{h.ref}</span>
                  <span style={{ fontSize: '12px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.title}</span>
                </span>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>{h.dept}</span>
                <span style={{ textAlign: 'right', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmt(h.amt)}</span>
                <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => openHp(h)} style={{ height: '32px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFFFFF', fontSize: '13px', fontWeight: 500, cursor: 'pointer', color: '#111827' }}>Open</button>
                </span>
              </div>
            ))}
            {!dash.high_priority.length && <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6B7280' }}>Nothing needs you right now.</div>}
          </div>
          <div style={{ ...CARD, flex: '1 1 340px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>Critical Financial Alerts</span>
            {!dash.alerts.length && <span style={{ fontSize: '13px', color: '#6B7280' }}>No critical alerts.</span>}
            {dash.alerts.map((a) => {
              const s = SEV[a.severity] || SEV.info;
              return (
                <button key={a.title} onClick={() => go(a.screen)} style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start', textAlign: 'left', width: '100%', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', background: s.bg, border: `1px solid ${s.bd}` }}>
                  <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.03em', color: s.fg }}>{a.tag}</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: s.fg }}>{a.title}</span>
                  </span>
                  <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.4 }}>{a.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>Escalated Cases</span>
            <span style={{ fontSize: '13px', color: '#6B7280' }}>From Accounts Supervisors · oldest first</span>
          </div>
          <div style={{ ...TABLE_HEAD, gridTemplateColumns: '130px minmax(200px,1fr) 140px 110px 60px', minWidth: '700px' }}>
            <span>Reason</span><span>Case</span><span>Supervisor</span><span style={{ textAlign: 'right' }}>Amount</span><span>Age</span>
          </div>
          {dash.escalated_cases.map((e) => (
            <div key={e.id} onClick={() => go('escalated', { sel: e.id, tab: 'All' })} style={{ ...TABLE_ROW, gridTemplateColumns: '130px minmax(200px,1fr) 140px 110px 60px', minWidth: '700px', cursor: 'pointer' }}>
              <span><Chip st={e.reason} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{e.ref}</span>
                <span style={{ fontSize: '12px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
              </span>
              <span style={{ fontSize: '13px' }}>{e.sup}</span>
              <span style={{ textAlign: 'right', fontWeight: 500 }}>{cr(e.amt)}</span>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{e.age}</span>
            </div>
          ))}
          {!dash.escalated_cases.length && <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6B7280' }}>No escalated cases waiting for you.</div>}
        </div>
      </>
    );
  }

  if (screen === 'receivables') {
    const tot = payers.reduce((a, r) => a + r.amt, 0) || 1;
    const sumBy = (f: (r: PayerItem) => number) => payers.reduce((a, r) => a + f(r), 0);
    const o30 = sumBy((r) => (r.amt * (r.pct[1] + r.pct[2] + r.pct[3])) / 100);
    const o90 = sumBy((r) => (r.amt * r.pct[3]) / 100);
    const rec = Math.round(sumBy((r) => r.amt * r.rec) / tot);
    kpis = [
      { label: 'Total Receivable', value: cr(tot), trend: `${payers.length} payer accounts`, tone: 'blue' },
      { label: 'Due Today', value: cr(sumBy((r) => r.due)), trend: `${payers.filter((r) => r.due > 0).length} payers`, tone: 'amber' },
      { label: 'Over 30 Days', value: cr(o30), trend: `${Math.round((o30 / tot) * 100)}% of book`, tone: 'amber' },
      { label: 'Over 90 Days', value: cr(o90), trend: `${Math.round((o90 / tot) * 100)}% of book`, tone: 'red', onClick: () => setTab((t) => ({ ...t, receivables: 'At Risk' })) },
      { label: 'Recovery Rate', value: `${rec}%`, trend: 'MTD · target 90%', tone: rec >= 90 ? 'green' : 'amber' }
    ];
    summary = {
      title: `Receivables ${rView.toLowerCase()}`,
      views: ['By Payer', 'By Department', 'By Aging Bucket'],
      view: rView,
      setView: (v) => {
        setRView(v);
        setRGroup('');
      },
      groups: rcvSummary,
      filter: rGroup,
      setFilter: setRGroup,
      col4: rView === 'By Aging Bucket' ? 'Action' : 'Over 90 days'
    };
    const bi = AGING.indexOf(rGroup);
    const { list, cur, tabs } = buildQueue<PayerItem>({
      items: payers,
      tabs: [
        ['All', () => true],
        ['At Risk', (r) => r.pct[3] >= 28 || r.late > 0],
        ['Write-off Requests', (r) => !!r.wo && r.wo.status === 'Pending'],
        ['Escalated', (r) => r.esc]
      ],
      search: (r) => `${r.payer} ${r.src} ${r.owner}`,
      sort: (a, b) => b.amt - a.amt,
      extra: rGroup ? (r) => (rView === 'By Payer' ? r.src === rGroup : rView === 'By Department' ? r.dept === rGroup : r.pct[bi] > 0) : null
    });
    let panel: PanelSpec | null = null;
    if (cur) {
      const r = cur;
      const info: Info[] = [];
      if (r.late) info.push({ sev: 'critical', t: `Promise-to-pay of ${r.promise} missed by ${r.late} days` });
      if (r.pct[3] >= 28) info.push({ sev: 'warning', t: `${r.pct[3]}% of balance is over 90 days (${cr((r.amt * r.pct[3]) / 100)})` });
      if (r.esc) info.push({ sev: 'info', t: 'Collection escalated — tracked in Escalations' });
      if (r.note) info.push({ sev: 'info', t: r.note });
      const acts: Act[] = [['Set Recovery Priority', 'prio', 's'], ['Escalate Collection', 'escColl', 'w']];
      if (r.wo) {
        info.push({ sev: r.wo.status === 'Pending' ? 'warning' : 'info', t: `Write-off request ${fmt(r.wo.amt)} · ${r.wo.status} — ${r.wo.reason}` });
        if (r.wo.status === 'Pending') {
          acts.unshift(['Reject Write-Off', 'woReject', 'd']);
          acts.unshift([r.wo.amt > LIMIT.write_off ? 'Approve & Forward Write-Off' : 'Approve Write-Off', 'woApprove', 'p']);
        }
      }
      panel = {
        kicker: `${r.src} · ${r.count} open items`,
        title: r.payer,
        amtL: cr(r.amt),
        st: r.prio,
        info,
        kv: KV([
          ['Department', r.dept],
          ['Owner', `${r.owner} (Supervisor)`],
          ['Oldest item', `${r.oldest} days`],
          ['Due today', r.due ? fmt(r.due) : '—'],
          ['Recovery rate', `${r.rec}% MTD`],
          ['Promise to pay', r.promise || '—']
        ]),
        bars: ['0–30', '31–60', '61–90', '90+'].map((l, i) => ({ l: `${l} days`, v: cr((r.amt * r.pct[i]) / 100), w: `${r.pct[i]}%`, c: i === 3 ? '#DC2626' : i === 2 ? '#F59E0B' : '#2563EB' })),
        barsTitle: 'Aging',
        select: { label: 'Recovery priority', placeholder: `Current: ${r.prio}`, options: ['High', 'Medium', 'Low'] },
        canAct: true,
        cmtPh: 'Comment — required to escalate or reject a write-off',
        acts
      };
    }
    queueView = {
      tabs,
      cols: { c1: 'Source', ref: 'Payer', dept: 'Department', amt: 'Outstanding', who: 'Owner', age: 'Oldest', st: 'Priority' },
      rows: list.map((r) => ({
        id: r.id,
        c1: r.src,
        ref: r.payer,
        sub: `${r.count} open ${r.src === 'Patient Billing' ? 'bills' : 'claims'}${r.late ? ` · promise missed ${r.late}d` : r.wo && r.wo.status === 'Pending' ? ' · write-off request' : ''}`,
        dept: r.dept,
        amtL: cr(r.amt),
        who: r.owner.split(' ')[0],
        age: `${r.oldest}d`,
        ageC: r.oldest > 90 ? '#B91C1C' : r.oldest > 60 ? '#B45309' : '#374151',
        st: r.prio
      })),
      curId: cur?.id || null,
      panel,
      ph: 'Search payer',
      meta: `${list.length} payer accounts · ${rGroup ? `filtered: ${rGroup}` : 'sorted by amount'}`
    };
  }

  if (screen === 'payables') {
    const open = bills.filter((b) => b.status !== 'Paid');
    const total = open.reduce((a, b) => a + b.amt, 0);
    const dueWeek = open.filter((b) => b.dueIn >= 0 && b.dueIn <= 7);
    const overdue = open.filter((b) => b.dueIn < 0);
    kpis = [
      { label: 'Total Payable', value: cr(total), trend: `${open.length} open bills`, tone: 'blue' },
      { label: 'Due This Week', value: cr(dueWeek.reduce((a, b) => a + b.amt, 0)), trend: `${dueWeek.length} bills`, tone: 'amber', onClick: () => setTab((t) => ({ ...t, payables: 'Due This Week' })) },
      { label: 'Overdue Vendors', value: String(overdue.length), trend: `${cr(overdue.reduce((a, b) => a + b.amt, 0))} · ${overdue.filter((b) => b.msme).length} MSME`, tone: 'red', onClick: () => setTab((t) => ({ ...t, payables: 'Overdue' })) },
      { label: 'Pending Payments', value: String(bills.filter((b) => b.status === 'Approved' || b.status === 'Scheduled').length), trend: `${badges.payables[0]} awaiting your approval`, tone: 'amber', onClick: () => setTab((t) => ({ ...t, payables: 'Awaiting Manager' })) }
    ];
    const keyF = (b: PayableBill) => (pView === 'Vendor Wise' ? b.vendor : pView === 'Department Wise' ? b.dept : b.cat);
    summary = {
      title: `Payables ${pView.toLowerCase()}`,
      views: ['Vendor Wise', 'Department Wise', 'Category Wise'],
      view: pView,
      setView: (v) => {
        setPView(v);
        setPGroup('');
      },
      groups: paySummary.slice(0, pView === 'Vendor Wise' ? 8 : 10),
      filter: pGroup,
      setFilter: setPGroup,
      col4: 'Overdue'
    };
    const { list, cur, tabs } = buildQueue<PayableBill>({
      items: bills,
      tabs: [
        ['All', () => true],
        ['Awaiting Manager', (b) => b.status === 'Awaiting Manager'],
        ['Due This Week', (b) => b.dueIn >= 0 && b.dueIn <= 7],
        ['Overdue', (b) => b.dueIn < 0],
        ['On Hold', (b) => b.status === 'On Hold']
      ],
      search: (b) => `${b.vendor} ${b.ref} ${b.id}`,
      sort: (a, b) => a.dueIn - b.dueIn,
      extra: pGroup ? (b) => keyF(b) === pGroup : null
    });
    let panel: PanelSpec | null = null;
    if (cur) {
      const b = cur;
      const info: Info[] = [];
      if (b.dueIn < 0) info.push({ sev: b.msme ? 'critical' : 'warning', t: `Overdue by ${-b.dueIn} days${b.msme ? ' — MSME vendor, 45-day payment rule applies' : ''}` });
      if (b.issue) info.push({ sev: 'warning', t: `Vendor issue: ${b.issue}` });
      if (b.status === 'Awaiting Manager')
        info.push(b.amt > LIMIT.vendor_bill ? { sev: 'info', t: 'Above your ₹ 10 L limit — approving verifies and forwards to the Finance Controller.' } : { sev: 'success', t: 'Within your ₹ 10 L approval limit.' });
      const acts: Act[] = [];
      if (b.status === 'Awaiting Manager') acts.push([b.amt > LIMIT.vendor_bill ? 'Approve & Forward' : 'Approve High Value Bill', 'approve', 'p'], ['Hold', 'hold', 's']);
      acts.push(['Prioritize Payment', 'prio', 's'], ['Escalate Vendor Issue', 'escVendor', 'w']);
      panel = {
        kicker: `${b.id} · ${b.cat}`,
        title: `${b.vendor} — ${b.ref}`,
        amtL: fmt(b.amt),
        st: b.status,
        info,
        kv: KV([
          ['Department', b.dept],
          ['Due', b.dueIn < 0 ? `${-b.dueIn} days overdue` : b.dueIn === 0 ? 'Today' : `In ${b.dueIn} days`],
          ['3-way match', b.match || '—'],
          ['Payment priority', b.prio],
          ['Risk', b.risk],
          ['Approved by', b.approvedBy || '—']
        ]),
        trail: b.trail,
        select: { label: 'Payment priority', placeholder: `Current: ${b.prio}`, options: ['Urgent', 'Normal', 'Defer'] },
        canAct: b.status !== 'With Controller',
        roNote: 'With the Finance Controller for approval.',
        acts
      };
    }
    queueView = {
      tabs,
      cols: { c1: 'Category', ref: 'Vendor', dept: 'Department', amt: 'Amount', who: 'Priority', age: 'Due', st: 'Status' },
      rows: list.map((b) => ({
        id: b.id,
        c1: b.cat,
        ref: b.vendor,
        sub: `${b.id} · ${b.ref}${b.msme ? ' · MSME' : ''}`,
        dept: b.dept,
        amtL: cr(b.amt),
        who: b.prio,
        age: b.dueIn < 0 ? `${-b.dueIn}d late` : b.dueIn === 0 ? 'Today' : `in ${b.dueIn}d`,
        ageC: b.dueIn < 0 ? '#B91C1C' : b.dueIn <= 3 ? '#B45309' : '#374151',
        st: b.status
      })),
      curId: cur?.id || null,
      panel,
      ph: 'Search vendor, bill',
      meta: `${list.length} bills · ${pGroup ? `filtered: ${pGroup}` : 'sorted by due date'}`
    };
  }

  if (screen === 'cash') {
    seg = { options: ['7 Days', '30 Days', '90 Days'], value: cfRange, onChange: setCfRange };
    if (cash) {
      const n = cash.days;
      const buf = cash.buffer;
      kpis = [
        { label: 'Expected Collections', value: cr(cash.expected_collections), trend: `Next ${n} days`, tone: 'green' },
        { label: 'Expected Payments', value: cr(cash.expected_payments), trend: `Next ${n} days`, tone: 'amber' },
        { label: 'Cash Available Today', value: cr(cash.starting_cash), trend: 'Unfrozen bank accounts', tone: 'blue' },
        { label: 'Lowest Balance', value: cr(cash.lowest_balance), trend: `On ${cash.lowest_date}`, tone: cash.is_breach ? 'red' : 'green' },
        { label: 'Net Position', value: cr(cash.projected_closing), trend: `Projected at day ${n}`, tone: cash.projected_closing < buf ? 'red' : 'green' }
      ];
      let labels: string[];
      let ins: number[];
      let outs: number[];
      let bals: number[];
      if (n <= 30) {
        labels = cash.series.map((x, i) => (n === 7 || i % 5 === 0 ? x.label : ''));
        ins = cash.series.map((x) => x.inflow / 1e5);
        outs = cash.series.map((x) => x.outflow / 1e5);
        bals = cash.series.map((x) => x.balance / 1e7);
      } else {
        labels = [];
        ins = [];
        outs = [];
        bals = [];
        for (let w = 0; w * 7 < cash.series.length; w++) {
          const ch = cash.series.slice(w * 7, w * 7 + 7);
          labels.push(w % 2 === 0 ? ch[0].label : '');
          ins.push(ch.reduce((a, x) => a + x.inflow, 0) / 1e5);
          outs.push(ch.reduce((a, x) => a + x.outflow, 0) / 1e5);
          bals.push(ch[ch.length - 1].balance / 1e7);
        }
      }
      const unit = n === 90 ? 'Weekly' : 'Daily';
      charts = [
        {
          title: 'Projected Inflow vs Outflow',
          sub: `${unit} · ₹ L · next ${n} days`,
          labels,
          a: ins,
          b: outs,
          legend: [{ l: 'Expected collections', c: '#2563EB' }, { l: 'Expected payments', c: '#CBD5E1' }],
          foot: 'Payments include scheduled and approved vendor bills, payroll, loan EMIs and tax deposits. Bills on hold are excluded.',
          tip: (i) => `${labels[i] || ''} in ₹ ${ins[i].toFixed(1)} L / out ₹ ${outs[i].toFixed(1)} L`
        },
        {
          title: 'Projected Cash Balance',
          sub: `End of ${n === 90 ? 'week' : 'day'} · ₹ Cr`,
          labels,
          a: bals,
          line: buf / 1e7,
          lineLabel: `Buffer ${cr(buf)}`,
          color: (v) => (v * 1e7 < buf ? '#DC2626' : '#16A34A'),
          foot: `Lowest: ${cr(cash.lowest_balance)} on ${cash.lowest_date}.`,
          tip: (i) => `₹ ${bals[i].toFixed(2)} Cr`
        }
      ];
      body = (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: '16px', alignItems: 'start' }}>
          <div style={{ ...CARD, padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>Warnings</span>
            {cash.warnings.map((w) => {
              const s = SEV[w.severity] || SEV.info;
              return (
                <div key={w.title} style={{ display: 'flex', flexDirection: 'column', gap: '3px', padding: '12px 14px', borderRadius: '10px', background: s.bg, border: `1px solid ${s.bd}` }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: s.fg }}>{w.title}</span>
                  <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.45 }}>{w.desc}</span>
                </div>
              );
            })}
          </div>
          <div style={{ ...CARD, padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Large Upcoming Payments</span>
            {!cash.large_payments.length && <span style={{ fontSize: '13px', color: '#6B7280' }}>No payment of ₹ 25 L or more in this window.</span>}
            {cash.large_payments.map((b, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '56px minmax(0,1fr) auto', gap: '10px', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>{b.date}</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{b.title}</span>
                  <span style={{ fontSize: '12px', color: b.breach ? '#B91C1C' : '#111827' }}>Balance after · {cr(b.balance_after)}</span>
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{cr(b.amount)}</span>
              </div>
            ))}
          </div>
          <div style={{ ...CARD, padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Delayed Receivables</span>
            {!cash.delayed_receivables.length && <span style={{ fontSize: '13px', color: '#6B7280' }}>No missed promise-to-pay dates.</span>}
            {cash.delayed_receivables.map((r) => (
              <button
                key={r.payer}
                onClick={() => {
                  const p = payers.find((x) => x.payer === r.payer);
                  go('receivables', { sel: p?.id, tab: 'All' });
                }}
                style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '10px', alignItems: 'center', padding: '10px 0', border: 'none', borderBottom: '1px solid #F3F4F6', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{r.payer}</span>
                  <span style={{ fontSize: '12px', color: '#B91C1C' }}>Promised {r.promise} · {r.late} late</span>
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{cr(r.amount)}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }
  }

  if (screen === 'escalated') {
    const decided = queue.filter((r) => queueStatus(r) !== 'Pending');
    kpis = [
      { label: 'Awaiting Your Decision', value: String(pendingQueue.length), trend: cr(pendingQueue.reduce((a, r) => a + Number(r.amount), 0)), tone: 'red' },
      { label: 'Above Your Limit', value: String(pendingQueue.filter((r) => Number(r.amount) > (LIMIT[r.document_type] ?? 0)).length), trend: 'Forward to Controller', tone: 'blue' },
      { label: 'Fraud & Compliance', value: String(pendingQueue.filter((r) => ['Fraud Concern', 'Compliance Risk'].includes(queueReason(r).reason)).length), trend: 'Highest risk', tone: 'amber' },
      { label: 'Decided', value: String(decided.length), trend: 'By you, still at your level', tone: 'green' }
    ];
    const { list, cur, tabs } = buildQueue<ApprovalRequestItem>({
      items: queue,
      tabs: [['All', () => true] as [string, (r: ApprovalRequestItem) => boolean], ...ESC_REASONS.map((x) => [x, (r: ApprovalRequestItem) => queueReason(r).reason === x] as [string, (r: ApprovalRequestItem) => boolean]), ['Decided', (r) => queueStatus(r) !== 'Pending']],
      search: (r) => `${r.reference_no} ${r.maker_name} ${queueReason(r).sup}`,
      sort: (a, b) => (queueStatus(a) === 'Pending' ? 0 : 1) - (queueStatus(b) === 'Pending' ? 0 : 1) || Number(b.amount) - Number(a.amount)
    });
    let panel: PanelSpec | null = null;
    if (cur) {
      const r = cur;
      const meta = queueReason(r);
      const lim = LIMIT[r.document_type] ?? 0;
      const over = Number(r.amount) > lim;
      const docLabel = DOC_LABEL[r.document_type] || r.document_type;
      const crit = r.risk_flags.filter((f) => CRITICAL_FLAGS.includes(f));
      panel = {
        kicker: `${docLabel} · ${r.reference_no}`,
        title: `${docLabel} ${r.reference_no} — ${meta.reason}`,
        amtL: fmt(r.amount),
        st: queueStatus(r),
        info: [
          { sev: ['Fraud Concern', 'Duplicate Risk'].includes(meta.reason) ? 'critical' : 'warning', t: `Escalated for ${meta.reason} by ${meta.sup}${meta.note ? ` — “${meta.note}”` : ''}` },
          over ? { sev: 'info', t: `Above your ${fmt(lim)} limit for ${docLabel.toLowerCase()}s — forward to the Finance Controller.` } : { sev: 'success', t: `Within your ${fmt(lim)} limit.` }
        ],
        kv: KV([
          ['Document', docLabel],
          ['Maker', r.maker_name],
          ['Escalated by', `${meta.sup}${meta.at ? ` · ${stamp(meta.at)}` : ''}`],
          ['Submitted', stamp(r.submitted_at)],
          ['Priority', r.priority],
          ['Risk flags', r.risk_flags.length ? r.risk_flags.join(', ').replace(/_/g, ' ') : 'None']
        ]),
        trail: (r.steps || []).map((s) => ({ t: `${s.decision.replace(/_/g, ' ')} · ${s.level}`, who: s.actor_name, when: stamp(s.decided_at), c: s.comment })),
        acks: crit,
        canAct: queueStatus(r) === 'Pending',
        roNote: `Decision recorded — ${queueStatus(r)}.`,
        cmtPh: 'Comment — required to return, reject or forward',
        acts: over
          ? [['Forward To Controller', 'forward', 'p'], ['Return', 'return', 's'], ['Reject', 'reject', 'd']]
          : [['Approve', 'approve', 'p'], ['Return', 'return', 's'], ['Reject', 'reject', 'd'], ['Forward To Controller', 'forward', 'w']]
      };
    }
    queueView = {
      tabs,
      cols: { c1: 'Reason', ref: 'Reference', dept: 'Document', amt: 'Amount', who: 'Supervisor', age: 'Age', st: 'Status' },
      rows: list.map((r) => {
        const meta = queueReason(r);
        const h = hoursSince(r.submitted_at);
        return {
          id: r.id,
          c1: meta.reason,
          ref: r.reference_no,
          sub: `Maker ${r.maker_name}`,
          dept: DOC_LABEL[r.document_type] || r.document_type,
          amtL: cr(r.amount),
          who: meta.sup.split(' ')[0],
          age: ageL(h),
          ageC: h > 48 ? '#B91C1C' : '#374151',
          st: queueStatus(r)
        };
      }),
      curId: cur?.id || null,
      panel,
      ph: 'Search reference, supervisor',
      meta: `${list.length} cases`
    };
  }

  if (screen === 'highvalue') {
    const aw = hv.filter((h) => h.status === 'Awaiting Manager');
    const total = hv.reduce((a, h) => a + h.amt, 0) || 1;
    const byD: Record<string, number> = {};
    hv.forEach((h) => (byD[h.dept] = (byD[h.dept] || 0) + h.amt));
    const topD = Object.keys(byD).sort((a, b) => byD[b] - byD[a])[0] || '—';
    kpis = [
      { label: 'Count', value: String(hv.length), trend: `${aw.length} awaiting you`, tone: 'blue' },
      { label: 'Amount', value: cr(total), trend: '₹ 1 L and above', tone: 'blue' },
      { label: 'Top Department', value: topD, trend: byD[topD] ? `${cr(byD[topD])} · ${Math.round((byD[topD] / total) * 100)}% of value` : '—', tone: 'amber' },
      { label: 'Risk Level', value: `${hv.filter((h) => h.risk === 'High').length} high`, trend: `${hv.filter((h) => h.risk === 'Medium').length} medium · ${hv.filter((h) => h.risk === 'Low').length} low`, tone: 'red' }
    ];
    const PRI: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    const { list, cur, tabs } = buildQueue<HighValueTransaction>({
      items: hv,
      tabs: [
        ['All', () => true],
        ['Vendor Bills', (h) => h.kind === 'Vendor Bill'],
        ['Refunds', (h) => h.kind === 'Refund'],
        ['Expense Requests', (h) => h.kind === 'Expense Request'],
        ['Adjustments', (h) => h.kind === 'Adjustment']
      ],
      search: (h) => `${h.ref} ${h.title} ${h.dept}`,
      sort: (a, b) => (a.status === 'Awaiting Manager' ? 0 : 1) - (b.status === 'Awaiting Manager' ? 0 : 1) || PRI[a.risk] - PRI[b.risk] || b.amt - a.amt
    });
    let panel: PanelSpec | null = null;
    if (cur) {
      const h = cur;
      const lim = LIMIT[h.kind] ?? 0;
      const waiting = h.status === 'Awaiting Manager';
      const over = h.amt > lim;
      const info: Info[] = [];
      if (h.risk === 'High') info.push({ sev: 'warning', t: 'High risk — review evidence before deciding' });
      if (waiting) info.push(over ? { sev: 'info', t: `Above your ${fmt(lim)} limit — approving verifies and forwards to the Finance Controller.` } : { sev: 'success', t: `Within your ${fmt(lim)} limit.` });
      const canFlag = !waiting && h.kind !== 'Vendor Bill' && ['Approved', 'Posted', 'Scheduled'].includes(h.status);
      panel = {
        kicker: `${h.kind} · ${h.ref}`,
        title: h.title,
        amtL: fmt(h.amt),
        st: h.status,
        info,
        kv: KV([['Department', h.dept], ['Risk level', h.risk], ['Raised / verified by', h.by || '—'], ['Date', h.date], ...h.kv]),
        trail: h.trail || [],
        canAct: waiting || canFlag,
        cmtPh: waiting ? 'Comment — required to hold or forward' : 'Reason for flagging — creates a Financial Exception',
        acts: waiting ? [[over ? 'Approve & Forward' : 'Approve', 'approve', 'p'], ['Hold', 'hold', 's'], ['Forward To Controller', 'forward', 'w']] : [['Flag For Review', 'flag', 'w']],
        roNote: h.status === 'With Controller' ? 'With the Finance Controller.' : h.status === 'On Hold' ? 'On hold.' : 'Monitoring only.'
      };
    }
    queueView = {
      tabs,
      cols: { c1: 'Type', ref: 'Transaction', dept: 'Department', amt: 'Amount', who: 'Risk', age: 'Date', st: 'Status' },
      rows: list.map((h) => ({ id: h.id, c1: h.kind, ref: h.ref, sub: h.title, dept: h.dept, amtL: cr(h.amt), who: h.risk, age: h.date, st: h.status })),
      curId: cur?.id || null,
      panel,
      ph: 'Search reference, department',
      meta: `${list.length} transactions`
    };
  }

  if (screen === 'budgets') {
    const bt = budgets.reduce((a, b) => a + b.budget, 0) || 1;
    const bu = budgets.reduce((a, b) => a + b.used, 0);
    kpis = [
      { label: 'Budget', value: cr(bt), trend: `YTD · ${budgets.length} departments`, tone: 'blue' },
      { label: 'Consumed', value: cr(bu), trend: `${Math.round((bu / bt) * 100)}% of YTD budget`, tone: 'amber' },
      { label: 'Remaining', value: cr(bt - bu), trend: `${cr(budgets.reduce((a, b) => a + b.committed, 0))} committed in open POs`, tone: 'green' },
      { label: 'Variance', value: cr(bu - bt), trend: `${overBudget.length} over · ${budgets.filter((b) => b.status === 'Near Limit').length} near limit`, tone: bu > bt ? 'red' : 'green' }
    ];
    const { list, cur, tabs } = buildQueue<DepartmentBudget>({
      items: budgets,
      tabs: [
        ['All', () => true],
        ['Over Budget', (b) => b.status === 'Over Budget'],
        ['Near Limit', (b) => b.status === 'Near Limit'],
        ['Within Budget', (b) => b.status === 'Within Budget']
      ],
      search: (b) => `${b.dept} ${b.head}`,
      sort: (a, b) => b.used / b.budget - a.used / a.budget
    });
    let panel: PanelSpec | null = null;
    if (cur) {
      const b = cur;
      const u = b.used / b.budget;
      const info: Info[] = [];
      if (b.status === 'Over Budget') info.push({ sev: 'critical', t: `Over budget by ${cr(b.used - b.budget)} (${((u - 1) * 100).toFixed(1)}%)` });
      if (b.status === 'Near Limit') info.push({ sev: 'warning', t: `${Math.round(u * 100)}% consumed — near limit` });
      if (b.committed) info.push({ sev: 'info', t: `${cr(b.committed)} further committed in open purchase orders` });
      if (b.esc) info.push({ sev: 'info', t: 'Overrun is with the Finance Controller' });
      if (b.expl) info.push({ sev: 'info', t: `Explanation requested from ${b.head}` });
      const barC = b.status === 'Over Budget' ? '#DC2626' : b.status === 'Near Limit' ? '#F59E0B' : '#16A34A';
      panel = {
        kicker: 'Department budget · FY 2026-27 YTD',
        title: b.dept,
        amtL: `${cr(b.used)} of ${cr(b.budget)}`,
        st: b.status,
        info,
        kv: KV([['Department head', b.head], ['Remaining', cr(b.budget - b.used)], ['Committed', cr(b.committed)], ['After commitments', cr(b.available)]]),
        bars: [
          { l: 'Consumed', v: `${Math.round(u * 100)}%`, w: `${Math.min(100, u * 100)}%`, c: barC },
          { l: 'Incl. committed', v: `${Math.round(((b.used + b.committed) / b.budget) * 100)}%`, w: `${Math.min(100, ((b.used + b.committed) / b.budget) * 100)}%`, c: '#93C5FD' }
        ],
        barsTitle: 'Utilisation',
        trail: b.trail,
        canAct: true,
        cmtPh: `Message to ${b.head} or the Finance Controller — required`,
        acts: [['Request Explanation', 'explain', 's'], ...(b.status !== 'Within Budget' && !b.esc ? ([['Escalate Overrun', 'escOverrun', 'w']] as Act[]) : [])]
      };
    }
    queueView = {
      tabs,
      cols: { c1: 'Status', ref: 'Department', dept: 'Budget', amt: 'Consumed', who: 'Used', age: 'Variance', st: 'Action' },
      rows: list.map((b) => {
        const u = b.used / b.budget;
        return {
          id: b.id,
          c1: b.status,
          ref: b.dept,
          sub: `Head: ${b.head}`,
          dept: cr(b.budget),
          amtL: cr(b.used),
          who: `${Math.round(u * 100)}%`,
          age: cr(b.used - b.budget),
          ageC: b.used > b.budget ? '#B91C1C' : '#15803D',
          st: b.esc ? 'Escalated' : b.expl ? 'Requested' : '—',
          bar: [`${Math.min(100, u * 100)}%`, b.status === 'Over Budget' ? '#DC2626' : b.status === 'Near Limit' ? '#F59E0B' : '#16A34A']
        };
      }),
      curId: cur?.id || null,
      panel,
      ph: 'Search department',
      meta: `${list.length} departments`
    };
  }

  if (screen === 'costcenter') {
    seg = { options: ['Monthly', 'Quarterly', 'Yearly'], value: ccView, onChange: (v) => setCcView(v as any) };
    if (cc) {
      kpis = [
        { label: 'Total Spend', value: cr(cc.total_spend), trend: cc.label, tone: 'blue' },
        { label: 'Budget', value: cr(cc.total_budget), trend: 'Same period', tone: 'gray' },
        { label: 'Variance', value: cr(cc.variance), trend: `${cc.variance_pct > 0 ? '+' : ''}${cc.variance_pct}% vs budget`, tone: cc.variance > 0 ? 'red' : 'green' },
        { label: 'Over-Budget Cost Centers', value: String(cc.over_budget_count), trend: `of ${cc.top_cost_centers.length}`, tone: 'amber' }
      ];
      charts = [
        {
          title: 'Variance Trend',
          sub: 'Actual vs budget · %',
          labels: cc.trend.map((x) => x[0]),
          a: cc.trend.map((x) => x[1]),
          color: (v) => (v > 0 ? '#F59E0B' : '#16A34A'),
          foot: 'Amber = over budget, green = under. Bars show size of variance.',
          tip: (i) => `${cc.trend[i][0]} · ${cc.trend[i][1] > 0 ? '+' : ''}${cc.trend[i][1]}%`
        }
      ];
      const mx = cc.top_cost_centers[0]?.actual || 1;
      body = (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ ...CARD, flex: '999 1 560px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '6px' }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>Top Cost Centers</span>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>{cc.label} · actual vs budget</span>
            </div>
            {cc.top_cost_centers.map((c) => (
              <div key={c.code} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,180px) minmax(0,1fr) 84px 64px', gap: '12px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{c.name}</span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>{c.code} · budget {cr(c.budget)}</span>
                </span>
                <ProgressBar w={`${Math.round((c.actual / mx) * 100)}%`} c={c.variance_pct > 0 ? '#F59E0B' : '#2563EB'} h={10} />
                <span style={{ fontSize: '13px', fontWeight: 600, textAlign: 'right' }}>{cr(c.actual)}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, textAlign: 'right', color: c.variance_pct > 0 ? '#B91C1C' : '#15803D' }}>{`${c.variance_pct > 0 ? '+' : ''}${c.variance_pct.toFixed(1)}%`}</span>
              </div>
            ))}
          </div>
          <div style={{ ...CARD, flex: '1 1 340px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>Expense Distribution</span>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>{cc.label}</span>
            </div>
            <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', gap: '2px' }}>
              {cc.mix.map((m) => <span key={m.l} style={{ height: '14px', width: m.w, background: m.c }}></span>)}
            </div>
            {cc.mix.map((m) => (
              <div key={m.l} style={{ display: 'grid', gridTemplateColumns: '12px minmax(0,1fr) 44px 84px', gap: '10px', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: m.c }}></span>
                <span>{m.l}</span>
                <span style={{ color: '#6B7280', textAlign: 'right' }}>{m.w}</span>
                <span style={{ fontWeight: 600, textAlign: 'right' }}>{cr(m.amt)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  if (screen === 'gst') {
    const open = gst.filter((g) => g.status !== 'approved');
    const issues = open.reduce((a, g) => a + (g.reviewed_by_manager ? 0 : g.exception_count), 0);
    kpis = [
      { label: 'Pending Batches', value: String(gst.filter((g) => g.status === 'submitted').length), trend: 'In supervisor review', tone: 'blue' },
      { label: 'Rejected Batches', value: String(gst.filter((g) => g.status === 'rejected').length), trend: 'Awaiting resubmission', tone: 'red', onClick: () => setTab((t) => ({ ...t, gst: 'Rejected' })) },
      { label: 'Compliance Issues', value: String(issues), trend: 'Not yet reviewed by you', tone: 'amber' },
      { label: 'Avg Turnaround', value: gst.length ? `${(gst.reduce((a, g) => a + Number(g.turnaround_days), 0) / gst.length).toFixed(1)} days` : '—', trend: 'Prepared → supervisor decision', tone: 'gray' }
    ];
    const { list, cur, tabs } = buildQueue<GSTBatchDetail>({
      items: gst,
      tabs: [
        ['Open Issues', (g) => g.status !== 'approved'],
        ['Rejected', (g) => g.status === 'rejected'],
        ['Approved', (g) => g.status === 'approved'],
        ['All', () => true]
      ],
      search: (g) => `${g.reference_no} ${g.prepared_by_name} ${g.reviewed_by_name}`,
      sort: (a, b) => b.exception_count - a.exception_count
    });
    let panel: PanelSpec | null = null;
    if (cur) {
      const g = cur;
      const rate = g.invoice_count ? (g.exception_count / g.invoice_count) * 100 : 0;
      const info: Info[] = [];
      if (g.status === 'rejected') info.push({ sev: 'critical', t: `Rejected${g.reviewed_by_name ? ` by ${g.reviewed_by_name}` : ''} — resubmission pending` });
      if (rate > 2) info.push({ sev: 'warning', t: `Exception rate ${rate.toFixed(1)}% — above 2% quality threshold` });
      info.push({ sev: 'info', t: 'Process review only — invoice-level corrections stay with the supervisor’s team.' });
      const clean = g.status === 'approved' && !g.exception_count;
      panel = {
        kicker: `GST batch · prepared by ${g.prepared_by_name}`,
        title: `${g.reference_no} — ${g.direction === 'outward' ? 'Outward' : 'Inward ITC'} ${g.period_from} to ${g.period_to}`,
        amtL: fmt(g.tax_value),
        st: gstStatus(g),
        info,
        kv: KV([
          ['Reviewed by', g.reviewed_by_name || '—'],
          ['Prepared by', g.prepared_by_name],
          ['Invoices', String(g.invoice_count)],
          ['Exception rate', `${rate.toFixed(1)}%`],
          ['Turnaround', `${g.turnaround_days} days`],
          ['Reviewed by you', g.reviewed_by_manager ? 'Yes' : 'No']
        ]),
        listTitle: 'Exceptions',
        list: g.exceptions.map((x) => `${x.type.replace(/_/g, ' ')} · ${fmt(x.amount)} · ${x.status}`),
        canAct: g.status !== 'escalated' && !clean,
        cmtPh: 'Process note — required to escalate',
        roNote: g.status === 'escalated' ? 'With the Finance Controller.' : 'Clean batch — nothing to review.',
        acts: [[g.reviewed_by_manager ? 'Reviewed' : 'Review Exceptions', 'review', 'p'], ['Escalate To Controller', 'gstEsc', 'w']]
      };
    }
    queueView = {
      tabs,
      cols: { c1: 'Exceptions', ref: 'Batch', dept: 'Prepared By', amt: 'Tax Value', who: 'Invoices', age: 'Turnaround', st: 'Status' },
      rows: list.map((g) => ({
        id: g.id,
        c1: g.exception_count ? `${g.exception_count} exceptions` : 'Clean',
        ref: g.reference_no,
        sub: `${g.direction === 'outward' ? 'Outward' : 'Inward ITC'} · ${g.period_from} → ${g.period_to}`,
        dept: g.prepared_by_name,
        amtL: cr(g.tax_value),
        who: String(g.invoice_count),
        age: `${g.turnaround_days} d`,
        ageC: Number(g.turnaround_days) > 2 ? '#B91C1C' : '#374151',
        st: gstStatus(g)
      })),
      curId: cur?.id || null,
      panel,
      ph: 'Search batch, preparer',
      meta: `${list.length} batches`
    };
  }

  if (screen === 'exceptions') {
    const open = excs.filter((x) => x.status !== 'Closed');
    kpis = [
      { label: 'Open Exceptions', value: String(open.length), trend: cr(open.reduce((a, x) => a + x.amt, 0)), tone: 'amber' },
      { label: 'Unassigned', value: String(open.filter((x) => !x.owner).length), trend: 'Need an owner', tone: 'red' },
      { label: 'Under Investigation', value: String(open.filter((x) => x.status === 'Investigating').length), trend: 'In progress', tone: 'blue' },
      { label: 'Escalated', value: String(open.filter((x) => x.status === 'Escalated').length), trend: 'With Finance Controller', tone: 'gray' }
    ];
    const { list, cur, tabs } = buildQueue<FinancialExceptionItem>({
      items: excs,
      tabs: [
        ['Open', (x) => x.status !== 'Closed'],
        ['Duplicate Bills', (x) => x.type === 'Duplicate Bill'],
        ['Budget Violations', (x) => x.type === 'Budget Violation'],
        ['Missing Documentation', (x) => x.type === 'Missing Documentation'],
        ['GST Issues', (x) => x.type === 'GST Issue'],
        ['Large Variances', (x) => x.type === 'Large Variance'],
        ['Closed', (x) => x.status === 'Closed']
      ],
      search: (x) => `${x.id} ${x.ref} ${x.title} ${x.owner}`,
      sort: (a, b) => (a.status === 'Closed' ? 1 : 0) - (b.status === 'Closed' ? 1 : 0) || b.amt - a.amt
    });
    const panel: PanelSpec | null = cur
      ? {
          kicker: `${cur.type} · ${cur.src}`,
          title: cur.title,
          amtL: fmt(cur.amt),
          st: cur.status,
          info: cur.owner ? [] : [{ sev: 'warning', t: 'No owner — assign before investigation' }],
          kv: KV([['Reference', cur.ref], ['Department', cur.dept], ['Owner', cur.owner || 'Unassigned'], ['Raised', cur.raised]]),
          trail: cur.trail,
          select: { label: 'Owner', placeholder: cur.owner ? `Current: ${cur.owner}` : 'Select owner', options: staff },
          canAct: cur.status !== 'Closed' && cur.status !== 'Escalated',
          roNote: cur.status === 'Closed' ? 'Closed.' : 'With the Finance Controller.',
          cmtPh: 'Comment — required to escalate or close',
          acts: [['Assign', 'assign', 's'], ['Investigate', 'investigate', 's'], ['Escalate', 'escalate', 'w'], ['Close', 'close', 'p']]
        }
      : null;
    queueView = {
      tabs,
      cols: { c1: 'Type', ref: 'Exception', dept: 'Department', amt: 'Amount', who: 'Owner', age: 'Age', st: 'Status' },
      rows: list.map((x) => ({
        id: x.id,
        c1: x.type,
        ref: `${x.id} · ${x.ref}`,
        sub: x.title,
        dept: x.dept,
        amtL: cr(x.amt),
        who: x.owner ? x.owner.split(' ')[0] : '—',
        age: ageL(x.age),
        ageC: x.age > 72 && x.status !== 'Closed' ? '#B91C1C' : '#374151',
        st: x.status
      })),
      curId: cur?.id || null,
      panel,
      ph: 'Search exception, reference',
      meta: `${list.length} exceptions`
    };
  }

  if (screen === 'escalations') {
    const tracked = escs.map((e) => ({ ...e, view: escStatus(e) }));
    const count = (s: string) => tracked.filter((x) => x.view === s).length;
    kpis = [
      { label: 'Open', value: String(count('Open')), trend: 'Need action', tone: 'red', onClick: () => setTab((t) => ({ ...t, escalations: 'Open' })) },
      { label: 'Investigating', value: String(count('Investigating')), trend: 'In progress', tone: 'amber', onClick: () => setTab((t) => ({ ...t, escalations: 'Investigating' })) },
      { label: 'Resolved', value: String(count('Resolved')), trend: 'Closed out', tone: 'green', onClick: () => setTab((t) => ({ ...t, escalations: 'Resolved' })) },
      { label: 'Forwarded', value: String(count('Forwarded')), trend: 'With Finance Controller', tone: 'blue', onClick: () => setTab((t) => ({ ...t, escalations: 'Forwarded' })) }
    ];
    const { list, cur, tabs } = buildQueue({
      items: tracked,
      tabs: [
        ['Open', (x) => x.view === 'Open'],
        ['Investigating', (x) => x.view === 'Investigating'],
        ['Resolved', (x) => x.view === 'Resolved'],
        ['Forwarded', (x) => x.view === 'Forwarded'],
        ['All', () => true]
      ],
      search: (x) => `${x.reference_no} ${x.type} ${x.reason} ${x.raised_by_full_name}`
    });
    let panel: PanelSpec | null = null;
    if (cur) {
      const x = cur;
      const typeL = ESC_TYPE_LABEL[x.type] || x.type;
      const trail = (x.notes || []).map((n) => ({ t: n.t || n.text || 'Note', who: n.who || n.author || '—', when: n.when || n.timestamp || '' }));
      const linked = x.type === 'approval';
      const acts: Act[] = linked
        ? [['Open in Escalated Approvals', 'open', 'p']]
        : [...(x.view === 'Open' ? ([['Start Investigation', 'investigate', 's']] as Act[]) : []), ['Mark Resolved', 'resolve', 'p'], ['Forward To Controller', 'forward', 'w']];
      panel = {
        kicker: `${typeL} · ${x.reference_no}`,
        title: `${typeL} — ${REASON_LABEL[x.reason] || x.reason.replace(/_/g, ' ')}`,
        amtL: Number(x.amount) ? fmt(x.amount) : '—',
        st: x.view,
        info: linked ? [{ sev: 'info', t: `Escalated by ${x.raised_by_full_name}. Decide it in Escalated Approvals.` }] : x.resolution ? [{ sev: 'success', t: `Resolution: ${x.resolution}` }] : [],
        kv: KV([['Reference', x.reference_no], ['Entity', x.entity_type.replace(/_/g, ' ')], ['Raised by', x.raised_by_full_name], ['Assigned to', ESC_TO_LABEL[x.raised_to] || x.raised_to], ['Raised', stamp(x.created_at)]]),
        trail,
        canAct: x.view === 'Open' || x.view === 'Investigating',
        cmtPh: linked ? 'Optional note' : 'Comment — required to resolve or forward',
        roNote: x.view === 'Forwarded' ? 'With the Finance Controller.' : 'Resolved.',
        acts
      };
    }
    queueView = {
      tabs,
      cols: { c1: 'Type', ref: 'Issue', dept: 'Assigned To', amt: 'Amount', who: 'Raised By', age: 'Raised', st: 'Status' },
      rows: list.map((x) => ({
        id: x.id,
        c1: ESC_TYPE_LABEL[x.type] || x.type,
        ref: x.reference_no,
        sub: REASON_LABEL[x.reason] || x.reason.replace(/_/g, ' '),
        dept: ESC_TO_LABEL[x.raised_to] || x.raised_to,
        amtL: Number(x.amount) ? cr(x.amount) : '—',
        who: x.raised_by_full_name.split(' ')[0],
        age: ageL(hoursSince(x.created_at)),
        st: x.view
      })),
      curId: cur?.id || null,
      panel,
      ph: 'Search escalation',
      meta: `${list.length} escalations`
    };
  }

  if (screen === 'weekly') {
    seg = { options: ['This Week', 'Last Week'], value: wk, onChange: (v) => setWk(v as any) };
    if (weekly) {
      const p = weekly.previous;
      const delta = (cur: number, prev: number, good: 'up' | 'down', onClick?: () => void, label = ''): KpiSpec => {
        const d = prev ? (cur / prev - 1) * 100 : 0;
        return { label, value: cr(cur), trend: `${d > 0 ? '+' : ''}${d.toFixed(1)}% vs prior week`, tone: (good === 'up' ? d >= 0 : d <= 0) ? 'green' : 'red', onClick };
      };
      kpis = [
        delta(weekly.collections, p.collections, 'up', undefined, 'Collections'),
        delta(weekly.payments, p.payments, 'down', undefined, 'Payments'),
        delta(weekly.receivables, p.receivables, 'down', () => go('receivables'), 'Receivables'),
        delta(weekly.payables, p.payables, 'down', () => go('payables'), 'Payables'),
        delta(weekly.total_spend, p.total_spend, 'down', () => go('budgets'), 'Department Spending')
      ];
      headBtns = [{ label: summaryShown[wk] ? 'Hide Summary' : 'Generate Weekly Summary', onClick: () => setSummaryShown((s) => ({ ...s, [wk]: !s[wk] })), kind: 'p' }];
      const mx = Math.max(...weekly.dept_spending.map((d) => d.amount), 1);
      const riskSev: Record<string, Sev> = { Critical: 'critical', Warning: 'warning', Info: 'info' };
      body = (
        <>
          {summaryShown[wk] && (
            <div style={{ ...CARD, border: '1px solid #BFDBFE', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>Weekly Summary · {weekly.range}</span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>Generated by {mgrName} · Accounts Manager</span>
                </div>
                <button disabled={busy} onClick={shareWeekly} style={{ height: '40px', padding: '0 16px', borderRadius: '10px', border: '1px solid #E5E7EB', background: '#FFFFFF', color: '#111827', fontSize: '14px', fontWeight: 500, cursor: busy ? 'wait' : 'pointer' }}>
                  Share with Finance Controller
                </button>
              </div>
              {weekly.summary_lines.map((l) => (
                <div key={l} style={{ display: 'flex', gap: '10px', fontSize: '14px', lineHeight: 1.5 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '3px', background: '#2563EB', marginTop: '8px', flexShrink: 0 }}></span>
                  <span>{l}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ ...CARD, flex: '999 1 560px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px', fontWeight: 600 }}>Department Spending</span>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>{weekly.range} · vs prior week</span>
              </div>
              {weekly.dept_spending.map((d) => (
                <div key={d.dept} style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr) 84px 84px 52px', gap: '12px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F3F4F6', fontSize: '13px' }}>
                  <span style={{ fontWeight: 500 }}>{d.dept}</span>
                  <ProgressBar w={`${Math.round((d.amount / mx) * 100)}%`} c="#2563EB" h={10} />
                  <span style={{ fontWeight: 600, textAlign: 'right' }}>{cr(d.amount)}</span>
                  <span style={{ color: '#6B7280', textAlign: 'right' }}>{cr(d.prev_amount)}</span>
                  <span style={{ fontWeight: 600, textAlign: 'right', color: d.pct_change > 10 ? '#B91C1C' : d.pct_change < 0 ? '#15803D' : '#374151' }}>{`${d.pct_change > 0 ? '+' : ''}${d.pct_change}%`}</span>
                </div>
              ))}
            </div>
            <div style={{ ...CARD, flex: '1 1 340px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>Key Risks</span>
              {weekly.risks.map((r) => <InfoBox key={r.t} w={{ sev: riskSev[r.tag] || 'info', t: r.t }} />)}
            </div>
          </div>
        </>
      );
    }
  }

  if (screen === 'monthend' && monthend) {
    const delayed = monthend.checklist.filter((k) => k.status === 'Delayed');
    const ready = monthend.readiness_score;
    kpis = [
      { label: 'Readiness Score', value: `${ready}%`, trend: `Target 100% by ${monthend.target_date}`, tone: ready >= 90 ? 'green' : 'amber' },
      { label: 'Tasks Complete', value: `${monthend.completed_count} of ${monthend.checklist.length}`, trend: 'Checklist items', tone: 'blue' },
      { label: 'Delayed Tasks', value: String(delayed.length), trend: delayed.length ? 'Could slip the close' : 'None', tone: delayed.length ? 'red' : 'green' },
      { label: 'Controller Close', value: monthend.controller_close_date.slice(0, 6), trend: `${monthend.period} period lock`, tone: 'gray' }
    ];
    headBtns = [{ label: 'Escalate Delays', onClick: escalateDelays, kind: 'w' }];
    const readyC = ready >= 90 ? '#16A34A' : ready >= 75 ? '#2563EB' : '#F59E0B';
    body = (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ ...CARD, flex: '999 1 620px', overflowX: 'auto' }}>
          <div style={{ padding: '16px 20px', fontSize: '16px', fontWeight: 600 }}>Close Checklist · {monthend.period}</div>
          <div style={{ ...TABLE_HEAD, gridTemplateColumns: 'minmax(200px,1fr) 160px 70px 90px 210px', minWidth: '800px' }}>
            <span>Task</span><span>Progress</span><span>Due</span><span>Status</span><span>Owner</span>
          </div>
          {monthend.checklist.map((k) => (
            <div key={k.id} style={{ ...TABLE_ROW, gridTemplateColumns: 'minmax(200px,1fr) 160px 70px 90px 210px', minWidth: '800px', minHeight: '64px', padding: '10px 20px' }}>
              <button onClick={() => go(k.screen)} style={{ display: 'flex', flexDirection: 'column', gap: '2px', border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer', minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{k.title}</span>
                <span style={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.4 }}>{k.desc}</span>
                {k.escalated && <span style={{ fontSize: '12px', fontWeight: 600, color: '#0369A1' }}>Escalated to Finance Controller</span>}
              </button>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ProgressBar w={`${k.pct}%`} c={k.status === 'Done' ? '#16A34A' : k.status === 'Delayed' ? '#F59E0B' : '#2563EB'} />
                <span style={{ fontSize: '12px', fontWeight: 600, width: '34px', textAlign: 'right' }}>{k.pct}%</span>
              </span>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>{k.due}</span>
              <span><Chip st={k.status} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{k.owner}</span>
                <span style={{ display: 'flex', gap: '6px' }}>
                  <select value={chkOwner[k.code] || ''} onChange={(e) => setChkOwner((s) => ({ ...s, [k.code]: e.target.value }))} style={{ ...SELECT, flex: 1, minWidth: 0, height: '32px', borderRadius: '8px', padding: '0 6px', fontSize: '12px' }}>
                    <option value="">Reassign…</option>
                    {staff.filter((o) => o !== k.owner).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <button disabled={busy} onClick={() => assignChecklist(k.code, k.owner)} style={{ height: '32px', padding: '0 10px', borderRadius: '8px', border: '1px solid #E5E7EB', background: '#FFFFFF', fontSize: '12px', fontWeight: 500, cursor: 'pointer', color: '#111827' }}>Assign</button>
                </span>
              </span>
            </div>
          ))}
        </div>
        <div style={{ ...CARD, flex: '1 1 300px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', position: 'sticky', top: '24px' }}>
          <span style={{ fontSize: '16px', fontWeight: 600 }}>Readiness Score</span>
          <span style={{ fontSize: '48px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, color: readyC }}>{ready}%</span>
          <ProgressBar w={`${ready}%`} c={readyC} h={10} />
          <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.45 }}>{ready >= 90 ? 'On track for the Finance Controller close.' : `${100 - ready} points to go — clear delayed items first.`}</span>
          <span style={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.45 }}>Average of the five checklist items. Payables, GST and Approvals update live as you clear items in their screens.</span>
        </div>
      </div>
    );
  }

  if (screen === 'team') {
    const teamTab = tab.team || 'Supervisors';
    seg = { options: ['Supervisors', 'Executives'], value: teamTab, onChange: (v) => setTab((t) => ({ ...t, team: v })) };
    const tp = execs.reduce((a, e) => a + e.processed, 0);
    const ta = sups.reduce((a, s) => a + s.approved, 0);
    const tr = sups.reduce((a, s) => a + s.returns, 0);
    const pendingWork = execs.reduce((a, e) => a + e.pending, 0);
    const resList = sups.filter((s) => s.resolution_hours !== null);
    const overloaded = sups.filter((s) => s.pending > SUP_CAPACITY);
    kpis = [
      { label: 'Items Processed', value: String(tp), trend: `${execs.length} executives`, tone: 'green' },
      { label: 'Approvals', value: String(ta), trend: 'By supervisors', tone: 'blue' },
      { label: 'Returns', value: String(tr), trend: ta + tr ? `${Math.round((tr / (ta + tr)) * 100)}% of decisions` : 'No decisions yet', tone: 'amber' },
      { label: 'Pending Work', value: String(pendingWork), trend: `${overloaded.length} supervisors over capacity`, tone: overloaded.length ? 'red' : 'gray' },
      { label: 'Resolution Time', value: resList.length ? `${(resList.reduce((a, s) => a + (s.resolution_hours || 0), 0) / resList.length).toFixed(1)} h` : '—', trend: 'Avg submit → decision', tone: 'gray' }
    ];
    const supRows = sups
      .map((s) => {
        const decided = s.approved + s.returns;
        const score = Math.round((decided ? (s.approved / decided) * 60 : 0) + Math.max(0, 40 - (s.resolution_hours ?? 13) * 3));
        return { ...s, score };
      })
      .sort((a, b) => b.score - a.score);
    const exRows = execs
      .map((e) => {
        const prod = parseInt(e.productivity, 10) || 0;
        const fp = parseInt(e.first_pass, 10) || 0;
        return { ...e, prod, fp, score: Math.round(prod * 0.5 + fp * 0.5) };
      })
      .sort((a, b) => b.score - a.score);
    const rank = (i: number, top: number) => (
      <span style={{ width: '28px', height: '28px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, background: i < top ? '#FEF3C7' : '#F3F4F6' }}>{i + 1}</span>
    );
    const ini = (n: string) => (
      <span style={{ width: '32px', height: '32px', borderRadius: '16px', background: '#EFF6FF', color: '#2563EB', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {n.split(' ').map((y) => y[0]).join('').slice(0, 2)}
      </span>
    );
    body =
      teamTab === 'Supervisors' ? (
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline' }}>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>Supervisor Leaderboard</span>
            <span style={{ fontSize: '13px', color: '#6B7280' }}>Score = first-pass quality and turnaround · from the approval trail</span>
          </div>
          <div style={{ ...TABLE_HEAD, gridTemplateColumns: '44px minmax(180px,1fr) 70px 90px 80px 90px 170px 100px', minWidth: '900px' }}>
            <span>Rank</span><span>Supervisor</span><span style={{ textAlign: 'right' }}>Score</span><span style={{ textAlign: 'right' }}>Approvals</span><span style={{ textAlign: 'right' }}>Returns</span><span style={{ textAlign: 'right' }}>Resolution</span><span>Queue Load</span><span>Status</span>
          </div>
          {supRows.map((x, i) => (
            <div key={x.code} style={{ ...TABLE_ROW, gridTemplateColumns: '44px minmax(180px,1fr) 70px 90px 80px 90px 170px 100px', minWidth: '900px', minHeight: '60px' }}>
              {rank(i, 1)}
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                {ini(x.name)}
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: 500 }}>{x.name}</span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>{x.code} · {x.escalations} escalations</span>
                </span>
              </span>
              <span style={{ textAlign: 'right', fontWeight: 700 }}>{x.score}</span>
              <span style={{ textAlign: 'right' }}>{x.approved}</span>
              <span style={{ textAlign: 'right' }}>{x.returns}</span>
              <span style={{ textAlign: 'right' }}>{x.resolution_hours === null ? '—' : `${x.resolution_hours} h`}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ProgressBar w={`${Math.min(100, Math.round((x.pending / SUP_CAPACITY) * 100))}%`} c={x.pending > SUP_CAPACITY ? '#DC2626' : '#16A34A'} />
                <span style={{ fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{x.pending} / {SUP_CAPACITY}</span>
              </span>
              <span><Chip st={x.pending > SUP_CAPACITY ? 'Overloaded' : 'Balanced'} /></span>
            </div>
          ))}
          {!supRows.length && <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6B7280' }}>No Accounts Supervisor users found.</div>}
        </div>
      ) : (
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline' }}>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>Executive Leaderboard</span>
            <span style={{ fontSize: '13px', color: '#6B7280' }}>Score = productivity and first-pass rate</span>
          </div>
          <div style={{ ...TABLE_HEAD, gridTemplateColumns: '44px minmax(180px,1fr) 90px 160px 80px 70px 70px', minWidth: '820px' }}>
            <span>Rank</span><span>Executive</span><span style={{ textAlign: 'right' }}>Processed</span><span>Productivity</span><span style={{ textAlign: 'right' }}>First Pass</span><span style={{ textAlign: 'right' }}>Pending</span><span style={{ textAlign: 'right' }}>Returns</span>
          </div>
          {exRows.map((e, i) => (
            <div key={e.code} style={{ ...TABLE_ROW, gridTemplateColumns: '44px minmax(180px,1fr) 90px 160px 80px 70px 70px', minWidth: '820px' }}>
              {rank(i, 3)}
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                {ini(e.name)}
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: 500 }}>{e.name}</span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>{e.code}</span>
                </span>
              </span>
              <span style={{ textAlign: 'right' }}>{e.processed}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ProgressBar w={`${e.prod}%`} c={e.prod >= 85 ? '#16A34A' : e.prod >= 60 ? '#2563EB' : '#F59E0B'} />
                <span style={{ fontSize: '12px', fontWeight: 600, width: '36px', textAlign: 'right' }}>{e.prod}%</span>
              </span>
              <span style={{ textAlign: 'right', fontWeight: 600, color: e.fp < 88 ? '#B91C1C' : '#374151' }}>{e.fp}%</span>
              <span style={{ textAlign: 'right' }}>{e.pending}</span>
              <span style={{ textAlign: 'right' }}>{e.returned}</span>
            </div>
          ))}
        </div>
      );
  }

  if (screen === 'deptperf' && deptPerf) {
    const arBy = (d: string) => payers.filter((r) => r.dept === d).reduce((a, r) => a + r.amt, 0);
    const rows = deptPerf.departments.map((d) => ({ ...d, arLive: arBy(d.dept) }));
    const totAr = rows.reduce((a, r) => a + r.arLive, 0);
    kpis = [
      { label: 'Revenue', value: cr(deptPerf.total_revenue), trend: `${deptPerf.growth_pct > 0 ? '+' : ''}${deptPerf.growth_pct}% vs prior month`, tone: 'green' },
      { label: 'Expense', value: cr(deptPerf.total_expense), trend: `${Math.round((deptPerf.total_expense / deptPerf.total_revenue) * 100)}% of revenue`, tone: 'gray' },
      { label: 'Profitability', value: `${Math.round(deptPerf.profitability_pct)}%`, trend: `Operating margin · ${cr(deptPerf.total_profit)}`, tone: 'blue' },
      { label: 'Outstanding Receivables', value: cr(totAr), trend: `Attributed to these ${rows.length} departments`, tone: 'amber', onClick: () => { setRView('By Department'); go('receivables'); } }
    ];
    charts = [
      {
        title: 'Revenue vs Expense',
        sub: `${deptPerf.period} · ₹ L`,
        labels: rows.map((r) => r.dept),
        a: rows.map((r) => r.revenue / 1e5),
        b: rows.map((r) => r.expense / 1e5),
        legend: [{ l: 'Revenue', c: '#2563EB' }, { l: 'Expense', c: '#CBD5E1' }],
        foot: (() => {
          const top = [...rows].sort((a, b) => b.revenue - a.revenue)[0];
          const thin = [...rows].sort((a, b) => a.margin_pct - b.margin_pct)[0];
          return top && thin ? `${top.dept} carries ${Math.round((top.revenue / deptPerf.total_revenue) * 100)}% of revenue; ${thin.dept} has the thinnest margin.` : '';
        })(),
        tip: (i) => `${rows[i].dept} · ₹ ${(rows[i].revenue / 1e5).toFixed(0)} L / ₹ ${(rows[i].expense / 1e5).toFixed(0)} L`
      }
    ];
    body = (
      <div style={{ ...CARD, overflowX: 'auto' }}>
        <div style={{ padding: '16px 20px', fontSize: '16px', fontWeight: 600 }}>Department Comparison · {deptPerf.period}</div>
        <div style={{ ...TABLE_HEAD, gridTemplateColumns: 'minmax(120px,1fr) 100px 100px 100px 160px 80px 130px', minWidth: '860px' }}>
          <span>Department</span><span style={{ textAlign: 'right' }}>Revenue</span><span style={{ textAlign: 'right' }}>Expense</span><span style={{ textAlign: 'right' }}>Profit</span><span>Profitability</span><span style={{ textAlign: 'right' }}>Growth</span><span style={{ textAlign: 'right' }}>Outstanding AR</span>
        </div>
        {rows.map((r) => (
          <div key={r.dept} style={{ ...TABLE_ROW, gridTemplateColumns: 'minmax(120px,1fr) 100px 100px 100px 160px 80px 130px', minWidth: '860px' }}>
            <span style={{ fontWeight: 600 }}>{r.dept}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{cr(r.revenue)}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#6B7280' }}>{cr(r.expense)}</span>
            <span style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{cr(r.profit)}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ProgressBar w={`${Math.round(r.margin_pct * 2)}%`} c={r.margin_pct < 20 ? '#F59E0B' : '#16A34A'} />
              <span style={{ fontSize: '12px', fontWeight: 600, width: '40px', textAlign: 'right' }}>{r.margin_pct.toFixed(1)}%</span>
            </span>
            <span style={{ textAlign: 'right', fontWeight: 600, color: r.growth_pct < 0 ? '#B91C1C' : '#15803D' }}>{`${r.growth_pct > 0 ? '+' : ''}${r.growth_pct.toFixed(1)}%`}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
              <span style={{ fontWeight: 500 }}>{r.arLive ? cr(r.arLive) : '—'}</span>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>{r.arLive ? `${Math.round((r.arLive / r.revenue) * 100)}% of revenue` : 'Cash sales'}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (screen === 'audit') {
    const curTab = tab.audit || 'This Week';
    const LIM_DAYS: Record<string, number> = { Today: 0, 'This Week': 6, 'This Month': 31 };
    const daysAgo = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    const inTab = audit.filter((a) => daysAgo(a.occurred_at) <= LIM_DAYS[curTab]);
    const rows = inTab.filter(
      (a) =>
        (aUser === 'All users' || a.actor_name === aUser) &&
        (aMod === 'All modules' || a.module === aMod) &&
        (aAct === 'All actions' || a.action === aAct) &&
        (!curQ || `${a.reference_no} ${a.reason} ${a.actor_name}`.toLowerCase().includes(curQ))
    );
    const count = (f: (a: AuditRecord) => boolean) => String(inTab.filter(f).length);
    kpis = [
      { label: 'Records', value: String(inTab.length), trend: curTab, tone: 'blue' },
      { label: 'Approvals', value: count((a) => a.action.includes('approve')), trend: 'Bills, refunds, journals', tone: 'green' },
      { label: 'Escalations', value: count((a) => a.action.includes('escalat') || a.action.includes('forward')), trend: 'Raised or forwarded', tone: 'red' },
      { label: 'Write-off Decisions', value: count((a) => a.module === 'write_off'), trend: 'Approved, forwarded or rejected', tone: 'amber' },
      { label: 'Assignments', value: count((a) => a.action.includes('assign') || a.action.includes('priority')), trend: 'Owners and priorities', tone: 'gray' }
    ];
    headBtns = [{ label: 'Export', onClick: () => exportAudit(rows) }];
    const opts = (all: string, vals: string[]) => [all, ...Array.from(new Set(vals))].map((o) => <option key={o} value={o}>{o}</option>);
    body = (
      <div style={{ ...CARD, overflowX: 'auto' }}>
        <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <Tabs tabs={['Today', 'This Week', 'This Month'].map((t) => ({ label: t, count: audit.filter((a) => daysAgo(a.occurred_at) <= LIM_DAYS[t]).length, active: t === curTab, onClick: () => setTab((s) => ({ ...s, audit: t })) }))} />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select value={aUser} onChange={(e) => setAUser(e.target.value)} style={{ ...SELECT, width: '170px' }}>{opts('All users', audit.map((a) => a.actor_name))}</select>
            <select value={aMod} onChange={(e) => setAMod(e.target.value)} style={{ ...SELECT, width: '180px' }}>{opts('All modules', audit.map((a) => a.module))}</select>
            <select value={aAct} onChange={(e) => setAAct(e.target.value)} style={{ ...SELECT, width: '170px' }}>{opts('All actions', audit.map((a) => a.action))}</select>
            <input value={q.audit || ''} onChange={(e) => setQ((s) => ({ ...s, audit: e.target.value }))} placeholder="Search reference, detail" style={{ ...SELECT, width: '200px', padding: '0 12px' }} />
          </div>
        </div>
        <div style={{ ...TABLE_HEAD, gridTemplateColumns: '150px 160px 150px minmax(120px,1fr) 160px minmax(180px,1.4fr)', minWidth: '980px' }}>
          <span>Timestamp</span><span>User</span><span>Action</span><span>Module</span><span>Reference</span><span>Detail</span>
        </div>
        {rows.map((a) => (
          <div key={a.id} style={{ ...TABLE_ROW, gridTemplateColumns: '150px 160px 150px minmax(120px,1fr) 160px minmax(180px,1.4fr)', minWidth: '980px' }}>
            <span style={{ fontSize: '13px', color: '#6B7280', fontVariantNumeric: 'tabular-nums' }}>{stamp(a.occurred_at)}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500 }}>{a.actor_name}</span>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>{a.actor_role.replace(/_/g, ' ').toLowerCase()}</span>
            </span>
            <span><Chip st={a.action.replace(/_/g, ' ')} /></span>
            <span style={{ fontSize: '13px', color: '#374151' }}>{a.module.replace(/_/g, ' ')}</span>
            <span style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reference_no || '—'}</span>
            <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.4 }}>{a.reason || '—'}</span>
          </div>
        ))}
        {!rows.length && <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>No records for these filters.</div>}
        <div style={{ padding: '14px 20px', fontSize: '13px', color: '#6B7280' }}>{rows.length} records · immutable — no edits allowed</div>
      </div>
    );
  }

  const head = SCREENS[screen];
  const panel = queueView?.panel || null;
  const readyChip = readiness === null ? null : { label: `${readiness}% ready`, bg: readiness >= 90 ? '#F0FDF4' : '#FFFBEB', fg: readiness >= 90 ? '#15803D' : '#B45309' };
  const btnStyle = (kind: string): [string, string, string] =>
    kind === 'p' ? ['#2563EB', '#FFFFFF', '#2563EB'] : kind === 'd' ? ['#FFFFFF', '#DC2626', '#FECACA'] : kind === 'w' ? ['#FFFFFF', '#B45309', '#FDE68A'] : ['#FFFFFF', '#111827', '#E5E7EB'];

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#111827', background: '#F9FAFB' }}>
      {/* SIDEBAR NAVIGATION */}
      <aside style={{ width: '260px', flexShrink: 0, background: '#FFFFFF', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#2563EB', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>N</div>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>NorthHospital</div>
        </div>

        {/* Role Identity Box */}
        <div style={{ margin: '0 16px 8px', padding: '14px', border: '1px solid #E5E7EB', borderRadius: '12px', background: '#F9FAFB', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>Accounts Manager</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>AM-01 · Operations owner</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Current Period</span>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Oct 2026</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Sep Close</span>
              {readyChip ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '22px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: readyChip.bg, color: readyChip.fg }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '3px', background: readyChip.fg }}></span>
                  {readyChip.label}
                </span>
              ) : (
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>—</span>
              )}
            </div>
          </div>
        </div>

        {/* Nav List */}
        <nav style={{ flex: 1, overflow: 'auto', padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV_GROUPS.map(([groupLabel, navItems]) => (
            <div key={groupLabel || 'overview'}>
              {groupLabel && <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, padding: '14px 10px 6px' }}>{groupLabel}</div>}
              {navItems.map(([scKey, itemTitle]) => {
                const isActive = screen === scKey;
                const [badge, isRed] = badges[scKey] || [0, false];
                return (
                  <button
                    key={scKey}
                    onClick={() => go(scKey)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '40px', flexShrink: 0, padding: '0 10px', border: 'none', borderRadius: '10px', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px', background: isActive ? '#EFF6FF' : 'transparent', color: isActive ? '#2563EB' : '#374151', fontWeight: isActive ? 600 : 500 }}
                  >
                    <span style={{ width: '18px', height: '18px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85 }}>{ICONS[scKey]}</span>
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{itemTitle}</span>
                    {badge > 0 && (
                      <span style={{ minWidth: '22px', height: '20px', padding: '0 6px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isRed ? '#FEF2F2' : '#EFF6FF', color: isRed ? '#B91C1C' : '#1D4ED8' }}>
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
        <AccountsSidebarUserFooter customName={mgrName} customRole="Accounts Manager · AM-01" customInitials={mgrIni} />
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <AccountsStickyAppBar
          activeRoleView={activeRoleView}
          onSelectRole={onSelectRole}
          workload={workload}
          breadcrumbScreen={head[1] || 'Manager Operational Workspace'}
          currentTime={currentTime}
          onOpenMaster={onOpenMaster}
        />
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          <header style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '780px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Accounts Manager · {head[0]}</div>
              <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{head[1]}</h1>
              <p style={{ margin: 0, color: '#6B7280', fontSize: '14px', lineHeight: 1.5 }}>{head[2]}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              {seg && <Segmented options={seg.options} value={seg.value} onChange={seg.onChange} />}
              {headBtns.map((b) => {
                const [bg, fg, bd] = btnStyle(b.kind || 's');
                return (
                  <button key={b.label} disabled={busy} onClick={b.onClick} style={{ height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: busy ? 'wait' : 'pointer', whiteSpace: 'nowrap', background: bg, color: fg, border: `1px solid ${bd}` }}>
                    {b.label}
                  </button>
                );
              })}
            </div>
          </header>

          {loadErrors.length > 0 && (
            <InfoBox w={{ sev: 'warning', t: `Some data could not be loaded (${loadErrors.join(', ')}). Figures that depend on it may be incomplete — use the refresh button to retry.` }} />
          )}
          {loading && <div style={{ fontSize: '13px', color: '#6B7280' }}>Loading live data…</div>}

          {kpis.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '16px' }}>
              {kpis.map((k) => <Kpi key={k.label} k={k} />)}
            </div>
          )}

          {charts.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,440px),1fr))', gap: '16px' }}>
              {charts.map((c) => <BarChart key={c.title} c={c} />)}
            </div>
          )}

          {summary && (
            <div style={{ ...CARD, overflowX: 'auto' }}>
              <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '16px', fontWeight: 600 }}>{summary.title}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {summary.filter && (
                    <button onClick={() => summary!.setFilter('')} style={{ height: '32px', padding: '0 10px', borderRadius: '8px', border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                      Filter: {summary.filter} · Clear
                    </button>
                  )}
                  <Segmented options={summary.views} value={summary.view} onChange={summary.setView} />
                </div>
              </div>
              <div style={{ ...TABLE_HEAD, gridTemplateColumns: 'minmax(160px,1.2fr) 100px minmax(160px,1.6fr) 110px 150px', minWidth: '760px' }}>
                <span>Group</span><span>Items</span><span>Share</span><span style={{ textAlign: 'right' }}>Outstanding</span><span>{summary.col4}</span>
              </div>
              {(() => {
                const mx = Math.max(...summary.groups.map((g) => g.amt), 1);
                return summary.groups.map((g) => (
                  <div
                    key={g.label}
                    onClick={() => summary!.setFilter(summary!.filter === g.label ? '' : g.label)}
                    style={{ ...TABLE_ROW, gridTemplateColumns: 'minmax(160px,1.2fr) 100px minmax(160px,1.6fr) 110px 150px', minWidth: '760px', minHeight: '48px', padding: '6px 20px', cursor: 'pointer', background: summary!.filter === g.label ? '#EFF6FF' : '#FFFFFF' }}
                  >
                    <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.label}</span>
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>{g.n}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ProgressBar w={`${Math.round((g.amt / mx) * 100)}%`} c="#2563EB" />
                      <span style={{ fontSize: '12px', color: '#6B7280', width: '36px', textAlign: 'right' }}>{g.share}</span>
                    </span>
                    <span style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{cr(g.amt)}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: g.c4_color }}>{g.c4}</span>
                  </div>
                ));
              })()}
            </div>
          )}

          {queueView && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ ...CARD, flex: '999 1 600px', overflowX: 'auto' }}>
                <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <Tabs tabs={queueView.tabs} />
                  <input
                    value={q[screen] || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setQ((s) => ({ ...s, [screen]: v }));
                    }}
                    placeholder={queueView.ph}
                    style={{ ...SELECT, width: '220px', padding: '0 12px' }}
                  />
                </div>
                <div style={{ ...TABLE_HEAD, gridTemplateColumns: '120px minmax(160px,1fr) 110px 100px 76px 72px 112px', gap: '10px', padding: '0 16px', minWidth: '820px' }}>
                  <span>{queueView.cols.c1}</span><span>{queueView.cols.ref}</span><span>{queueView.cols.dept}</span><span style={{ textAlign: 'right' }}>{queueView.cols.amt}</span><span>{queueView.cols.who}</span><span>{queueView.cols.age}</span><span>{queueView.cols.st}</span>
                </div>
                {queueView.rows.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => pick(r.id)}
                    style={{ ...TABLE_ROW, gridTemplateColumns: '120px minmax(160px,1fr) 110px 100px 76px 72px 112px', gap: '10px', padding: '8px 16px', minWidth: '820px', cursor: 'pointer', background: r.id === queueView!.curId ? '#EFF6FF' : '#FFFFFF' }}
                  >
                    <span style={{ minWidth: 0 }}><Chip st={r.c1} /></span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ref}</span>
                      <span style={{ fontSize: '12px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</span>
                      {r.bar && <ProgressBar w={r.bar[0]} c={r.bar[1]} h={6} max="220px" />}
                    </span>
                    <span style={{ fontSize: '13px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.dept}</span>
                    <span style={{ textAlign: 'right', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{r.amtL}</span>
                    <span style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.who}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', color: r.ageC || '#374151' }}>{r.age}</span>
                    <span style={{ minWidth: 0 }}><Chip st={r.st} /></span>
                  </div>
                ))}
                {!queueView.rows.length && <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>Nothing in this view.</div>}
                <div style={{ padding: '14px 20px', fontSize: '13px', color: '#6B7280' }}>{queueView.meta}</div>
              </div>

              {/* DETAIL & DECISION PANEL */}
              <div style={{ ...CARD, flex: '1 1 360px', maxWidth: '100%', position: 'sticky', top: '24px', maxHeight: 'calc(100vh - 168px)', display: 'flex', flexDirection: 'column' }}>
                {!panel && <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>Select an item.</div>}
                {panel && queueView.curId && (
                  <>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>{panel.kicker}</span>
                        <span style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.35 }}>{panel.title}</span>
                        <span style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>{panel.amtL}</span>
                      </div>
                      <Chip st={panel.st} style={{ flexShrink: 0 }} />
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      {panel.info.map((w) => <InfoBox key={w.t} w={w} />)}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {panel.kv.map(([l, v]) => (
                          <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                            <span style={{ fontSize: '12px', color: '#6B7280' }}>{l}</span>
                            <span style={{ fontSize: '13px', fontWeight: 500, overflowWrap: 'anywhere' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      {panel.bars && panel.bars.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>{panel.barsTitle}</span>
                          {panel.bars.map((b) => (
                            <div key={b.l} style={{ display: 'grid', gridTemplateColumns: '92px minmax(0,1fr) 72px', gap: '10px', alignItems: 'center', fontSize: '12px' }}>
                              <span style={{ color: '#6B7280' }}>{b.l}</span>
                              <ProgressBar w={b.w} c={b.c} />
                              <span style={{ fontWeight: 600, textAlign: 'right' }}>{b.v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {panel.list && panel.list.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>{panel.listTitle}</span>
                          {panel.list.map((t) => (
                            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '40px', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '10px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#93C5FD', flexShrink: 0 }}></span>
                              <span style={{ fontSize: '13px', lineHeight: 1.4 }}>{t}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {panel.trail && panel.trail.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>Trail</span>
                          {panel.trail.map((t, i) => (
                            <div key={i} style={{ display: 'flex', gap: '12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '5px', marginTop: '4px', background: '#2563EB' }}></span>
                                <span style={{ flex: 1, width: '1px', background: '#E5E7EB', minHeight: '20px' }}></span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingBottom: '12px', minWidth: 0 }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' }}>{t.t}</span>
                                <span style={{ fontSize: '12px', color: '#6B7280' }}>{t.who}{t.when ? ` · ${t.when}` : ''}</span>
                                {t.c && <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.45 }}>“{t.c}”</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {panel.canAct && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '14px', borderTop: '1px solid #E5E7EB' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>Decision</span>
                          {panel.acks && panel.acks.length > 0 && (
                            <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {panel.acks.map((f) => (
                                <label key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#7F1D1D', cursor: 'pointer' }}>
                                  <input type="checkbox" checked={acks.includes(f)} onChange={(e) => setAcks((s) => (e.target.checked ? [...s, f] : s.filter((x) => x !== f)))} />
                                  <span>I have reviewed the critical signal: <strong>{f.replace(/_/g, ' ')}</strong></span>
                                </label>
                              ))}
                            </div>
                          )}
                          {panel.select && (
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>{panel.select.label}</span>
                              <select value={selVal} onChange={(e) => { setSelVal(e.target.value); setErr(''); }} style={{ ...SELECT, width: '100%' }}>
                                <option value="">{panel.select.placeholder}</option>
                                {panel.select.options.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </label>
                          )}
                          <textarea
                            value={cmt}
                            onChange={(e) => { setCmt(e.target.value); setErr(''); }}
                            placeholder={panel.cmtPh || 'Comment — required to reject, return, hold or escalate'}
                            style={{ minHeight: '72px', width: '100%', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', outline: 'none', resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }}
                          />
                          {err && <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '13px', color: '#991B1B' }}>{err}</div>}
                        </div>
                      )}
                    </div>
                    {panel.canAct ? (
                      <div style={{ padding: '16px 20px', borderTop: '1px solid #E5E7EB', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {panel.acts.map(([label, kind, style]) => {
                          const [bg, fg, bd] = btnStyle(style);
                          return (
                            <button
                              key={label}
                              disabled={busy}
                              onClick={() => act(kind, queueView!.curId as string)}
                              style={{ height: '40px', padding: '0 10px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: busy ? 'wait' : 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: bg, color: fg, border: `1px solid ${bd}`, opacity: busy ? 0.7 : 1 }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ padding: '16px 20px', borderTop: '1px solid #E5E7EB', fontSize: '13px', color: '#374151' }}>{panel.roNote}</div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {body}
        </div>
      </main>

      {toast && (
        <div style={{ position: 'fixed', right: '24px', bottom: '24px', zIndex: 60, background: '#111827', color: '#FFFFFF', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', boxShadow: '0 8px 24px rgba(17,24,39,0.2)', maxWidth: '480px', lineHeight: 1.45 }}>
          {toast}
        </div>
      )}
    </div>
  );
};

export default AccountsManagerWorkspace;
