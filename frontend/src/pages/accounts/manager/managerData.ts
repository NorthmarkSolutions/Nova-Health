// Accounts Manager · one data hook for the whole workspace (HMS bible 19.11).
// Section views that switch period (cash range, cost-centre period, week, grouping) load those extras themselves.
import { mergeChanged, sameList } from '../shared/liveData';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fmtDateTime } from '../executive/executiveData';
import {
  accountsService,
  ApprovalRequestItem,
  AuditRecord,
  CashflowProjection,
  DelegationLimitItem,
  DepartmentBudget,
  DepartmentPerformance,
  EscalationRecord,
  ExecutivePerformance,
  FinancialExceptionItem,
  GSTBatchDetail,
  HighValueTransaction,
  ManagerDashboardData,
  MonthEndReadinessData,
  PayableBill,
  PayerItem,
  SupervisorPerformance,
} from '../../../services/accountsService';

/** Month-end readiness is always for the previous calendar month (the period being closed). */
export const closingPeriod = (d = new Date()) => {
  const p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}`;
};

/** Minimum cash buffer the projection is checked against, in ₹ crore (treasury policy used by the server). */
export const BUFFER_CR = 5;

export interface ManagerSnapshot {
  dash: ManagerDashboardData | null;
  queue: ApprovalRequestItem[];
  payers: PayerItem[];
  bills: PayableBill[];
  hv: HighValueTransaction[];
  budgets: DepartmentBudget[];
  excs: FinancialExceptionItem[];
  gst: GSTBatchDetail[];
  escs: EscalationRecord[];
  monthend: MonthEndReadinessData | null;
  sups: SupervisorPerformance[];
  execs: ExecutivePerformance[];
  deptPerf: DepartmentPerformance | null;
  audit: AuditRecord[];
  cash30: CashflowProjection | null;
  limits: DelegationLimitItem[];
  period: string;
  loading: boolean;
  failed: string[];
  lastSync: Date | null;
  reload: () => Promise<void>;
}

type Data = Omit<ManagerSnapshot, 'period' | 'loading' | 'failed' | 'lastSync' | 'reload'>;

const EMPTY: Data = {
  dash: null,
  queue: [],
  payers: [],
  bills: [],
  hv: [],
  budgets: [],
  excs: [],
  gst: [],
  escs: [],
  monthend: null,
  sups: [],
  execs: [],
  deptPerf: null,
  audit: [],
  cash30: null,
  limits: [],
};

const OBJECTS: (keyof Data)[] = ['dash', 'monthend', 'deptPerf', 'cash30'];

const sources = (period: string): [keyof Data, string, () => Promise<unknown>][] => [
  ['dash', 'Dashboard', () => accountsService.getManagerDashboard()],
  ['queue', 'Escalated approvals', () => accountsService.getManagerQueue()],
  ['payers', 'Receivables', () => accountsService.getReceivablesPayers()],
  ['bills', 'Payables', () => accountsService.getPayableBills()],
  ['hv', 'High value transactions', () => accountsService.getHighValueTransactions()],
  ['budgets', 'Budgets', () => accountsService.getDepartmentBudgets()],
  ['excs', 'Exceptions', () => accountsService.getFinancialExceptions()],
  ['gst', 'GST batches', () => accountsService.getGSTBatchesDetailed()],
  ['escs', 'Escalations', () => accountsService.getAllEscalations()],
  ['monthend', 'Month-end readiness', () => accountsService.getMonthEndReadiness(period)],
  ['sups', 'Supervisor performance', () => accountsService.getSupervisorPerformance()],
  ['execs', 'Executive performance', () => accountsService.getExecutivePerformance()],
  ['deptPerf', 'Department performance', () => accountsService.getDepartmentPerformance()],
  ['audit', 'Audit trail', () => accountsService.getRecentAudit(31)],
  ['cash30', 'Cash projection', () => accountsService.getCashflowProjection(30, BUFFER_CR)],
  ['limits', 'DoFA limits', () => accountsService.getDelegationLimits()],
];

const REFRESH_MS = 60000;

export const useManagerData = (): ManagerSnapshot => {
  const [data, setData] = useState<Data>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [period] = useState(() => closingPeriod());
  const alive = useRef(true);

  const reload = useCallback(async () => {
    const list = sources(period);
    const results = await Promise.allSettled(list.map(([, , load]) => load()));
    if (!alive.current) return;
    const next: Record<string, unknown> = {};
    const missing: string[] = [];
    results.forEach((r, i) => {
      const [key, label] = list[i];
      if (r.status === 'fulfilled') next[key] = OBJECTS.includes(key) ? r.value ?? null : Array.isArray(r.value) ? r.value : [];
      else missing.push(label);
    });
    setData((prev) => mergeChanged(prev, next as Partial<Data>));
    setFailed((prev) => sameList(prev, missing));
    setLastSync(new Date());
    setLoading(false);
  }, [period]);

  useEffect(() => {
    alive.current = true;
    reload();
    const tick = window.setInterval(reload, REFRESH_MS);
    return () => {
      alive.current = false;
      window.clearInterval(tick);
    };
  }, [reload]);

  return { ...data, period, loading, failed, lastSync, reload };
};

// Last value per section + view, so returning to a section or a period shows it instantly (refreshed quietly)
// Scoped to the signed-in session: a different login (shared ward/office PCs) starts with an empty cache.
const sectionCache = new Map<string, unknown>();
let cacheOwner: string | null = null;
const sessionId = () => {
  try {
    return localStorage.getItem('token') || '';
  } catch {
    return '';
  }
};
const scopedCache = () => {
  const owner = sessionId();
  if (owner !== cacheOwner) {
    sectionCache.clear();
    cacheOwner = owner;
  }
  return sectionCache;
};

/**
 * Loads a section-local source that depends on a view choice (range, period, week, grouping).
 * Stale-while-revalidate: a view seen before renders from cache at once; the refetch only
 * updates the screen when the server returns something different.
 */
export const useSectionSource = <T>(load: () => Promise<T>, deps: unknown[], reloadTick: Date | null) => {
  const cache = scopedCache();
  const key = `${load.toString()}|${JSON.stringify(deps)}`;
  const [state, setState] = useState<{ key: string; value: T | null; failed: boolean }>(() => ({ key, value: (cache.get(key) as T) ?? null, failed: false }));
  // View switched: show what we already have for the new view straight away
  if (state.key !== key) setState({ key, value: (cache.get(key) as T) ?? null, failed: false });
  useEffect(() => {
    let live = true;
    load()
      .then((v) => {
        if (!live) return;
        const store = scopedCache();
        const before = store.get(key);
        store.set(key, v);
        if (JSON.stringify(before) !== JSON.stringify(v)) setState({ key, value: v, failed: false });
        else setState((s) => (s.key === key && s.value ? s : { key, value: v, failed: false }));
      })
      .catch(() => {
        if (live) setState((s) => (s.key === key ? { ...s, failed: !s.value } : s));
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reloadTick]);
  return { value: state.key === key ? state.value : null, failed: state.key === key && state.failed };
};

/* ------------------------------------------------------------------ */
/* Formatting & policy                                                 */
/* ------------------------------------------------------------------ */

/** ₹ in crore / lakh for large figures. */
export const cr = (n: number | string) => {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  const sg = v < 0 ? '− ' : '';
  return a >= 1e7 ? `${sg}₹ ${(a / 1e7).toFixed(2)} Cr` : a >= 1e5 ? `${sg}₹ ${(a / 1e5).toFixed(1)} L` : `${sg}₹ ${Math.round(a).toLocaleString('en-IN')}`;
};

export const hoursSince = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3600000));
export const ageL = (h: number) => (h < 24 ? `${h}h` : `${Math.round(h / 24)}d`);

export const CRITICAL_FLAGS = ['missing_documents', 'duplicate_risk', 'budget_exceeded', 'related_party', 'bank_change'];

// Seed DoFA defaults the server applies to the manager when no DelegationLimit row exists (services.get_role_limit)
const SERVER_DEFAULT_LIMIT: Record<string, number> = {
  journal: 500000,
  vendor_bill: 1000000,
  expense: 200000,
  expense_request: 200000,
  refund: 500000,
  write_off: 100000,
  inventory_writeoff: 500000,
  unbilled_accrual: 5000000,
  consultant_fee_accrual: 1000000,
};

/** High-value transaction kinds → approval document types. */
export const KIND_DOC: Record<string, string> = { 'Vendor Bill': 'vendor_bill', Refund: 'refund', 'Expense Request': 'expense', Adjustment: 'journal' };

/** The manager's approval limit for a document type, as the server will apply it. */
export const managerLimit = (limits: DelegationLimitItem[], docType: string): number | null => {
  const row = limits.find((l) => l.role === 'manager' && l.document_type === docType);
  if (row && row.max_amount != null) return Number(row.max_amount);
  return SERVER_DEFAULT_LIMIT[docType] ?? null;
};

export const DOC_LABEL: Record<string, string> = {
  journal: 'Journal',
  vendor_bill: 'Vendor bill',
  expense: 'Expense',
  expense_request: 'Expense',
  refund: 'Refund',
  write_off: 'Write-off',
  reconciliation: 'Reconciliation',
  payment_batch: 'Payment batch',
};

export const REASON_LABEL: Record<string, string> = {
  high_amount: 'High amount',
  duplicate_risk: 'Duplicate risk',
  compliance_risk: 'Compliance risk',
  budget_violation: 'Budget violation',
  fraud_concern: 'Fraud concern',
  fraud_suspicion: 'Fraud concern',
};

export const ESC_TYPE_LABEL: Record<string, string> = {
  approval: 'Escalated approval',
  collection: 'Collection',
  vendor_issue: 'Vendor issue',
  budget_overrun: 'Budget overrun',
  gst_issue: 'GST issue',
  financial_exception: 'Exception',
  month_end_delay: 'Month-end delay',
  write_off: 'Write-off',
};

export const ESC_TO_LABEL: Record<string, string> = {
  manager: 'Accounts Manager',
  finance_controller: 'Finance Controller',
  controller: 'Finance Controller',
  recovery_desk: 'Recovery Desk',
  procurement: 'Procurement',
};

/** Escalation status as the manager tracks it. */
export const escView = (e: EscalationRecord) =>
  e.status === 'investigating' ? 'investigating' : e.status === 'forwarded' ? 'forwarded' : e.status === 'resolved' || e.status === 'closed' ? 'resolved' : 'open';

/** Why a supervisor sent this approval up, from its approval trail. */
export const queueReason = (r: ApprovalRequestItem) => {
  const handoff = [...(r.steps || [])].reverse().find((s) => ['escalate', 'approve_and_forward', 'forward'].includes(s.decision));
  const code = (handoff as { reason_code?: string } | undefined)?.reason_code;
  return { reason: (code && REASON_LABEL[code]) || (handoff ? 'Above supervisor limit' : '—'), sup: handoff?.actor_name || '—', note: handoff?.comment || '', at: handoff?.decided_at };
};

export const isQueuePending = (r: ApprovalRequestItem) => r.status === 'pending' || r.status === 'escalated';

/** Supervisor queue size above which the manager should rebalance work. */
export const SUP_CAPACITY = 25;

/** Download audit rows as a read-only CSV. */
export const exportAuditCsv = (rows: AuditRecord[]) => {
  const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [['Timestamp', 'User', 'Role', 'Action', 'Module', 'Reference', 'Detail'].join(','), ...rows.map((a) => [fmtDateTime(a.occurred_at), a.actor_name, a.actor_role, a.action, a.module, a.reference_no, a.reason].map(esc).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `accounts-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
