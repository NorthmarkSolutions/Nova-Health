// Accounts Supervisor · one data hook for the whole workspace (HMS bible 19.11).
// Every count on screen is derived from this snapshot; nothing is typed in.
import { mergeChanged, sameList } from '../shared/liveData';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  accountsService,
  AccountDocumentItem,
  ApprovalRequestItem,
  AuditLogItem,
  BankTransactionItem,
  CollectionCaseItem,
  DailyCloseResponse,
  DelegationLimitItem,
  EscalationItem,
  ExpenseRequestItem,
  GSTBatchItem,
  JournalVoucher,
  ReconciliationMatchItem,
  SupervisorDashboardResponse,
  TeamPerformanceMember,
  VendorBillItem,
  WriteOffRequestItem,
} from '../../../services/accountsService';
import { todayIso } from '../executive/executiveData';

export interface SupervisorSnapshot {
  dashboard: SupervisorDashboardResponse | null;
  requests: ApprovalRequestItem[];
  escalations: EscalationItem[];
  close: DailyCloseResponse | null;
  team: TeamPerformanceMember[];
  writeOffs: WriteOffRequestItem[];
  cases: CollectionCaseItem[];
  gst: GSTBatchItem[];
  matches: ReconciliationMatchItem[];
  documents: AccountDocumentItem[];
  audit: AuditLogItem[];
  journals: JournalVoucher[];
  bills: VendorBillItem[];
  expenses: ExpenseRequestItem[];
  bank: BankTransactionItem[];
  limits: DelegationLimitItem[];
  /** Business date the close screen works on (today). */
  businessDate: string;
  loading: boolean;
  failed: string[];
  lastSync: Date | null;
  reload: () => Promise<void>;
}

type Data = Omit<SupervisorSnapshot, 'businessDate' | 'loading' | 'failed' | 'lastSync' | 'reload'>;

const EMPTY: Data = {
  dashboard: null,
  requests: [],
  escalations: [],
  close: null,
  team: [],
  writeOffs: [],
  cases: [],
  gst: [],
  matches: [],
  documents: [],
  audit: [],
  journals: [],
  bills: [],
  expenses: [],
  bank: [],
  limits: [],
};

const OBJECT_SOURCES: (keyof Data)[] = ['dashboard', 'close'];

const sources = (date: string): [keyof Data, string, () => Promise<unknown>][] => [
  ['dashboard', 'Dashboard', () => accountsService.getSupervisorDashboard()],
  ['requests', 'Approval queue', () => accountsService.getApprovalRequests({ status: 'all' })],
  ['escalations', 'Escalations', () => accountsService.getEscalations()],
  ['close', 'Daily close', () => accountsService.getDailyClose(date)],
  ['team', 'Team activity', () => accountsService.getTeamPerformance('executive')],
  ['writeOffs', 'Write-offs', () => accountsService.getWriteOffRequests()],
  ['cases', 'Collections', () => accountsService.getCollectionPipeline()],
  ['gst', 'GST batches', () => accountsService.getGSTBatches()],
  ['matches', 'Bank matches', () => accountsService.getReconciliationMatches()],
  ['documents', 'Documents', () => accountsService.getDocuments()],
  ['audit', 'Audit trail', () => accountsService.getDepartmentAudit(31)],
  ['journals', 'Journals', () => accountsService.getJournals()],
  ['bills', 'Vendor bills', () => accountsService.getVendorBills()],
  ['expenses', 'Expenses', () => accountsService.getExpenseRequests()],
  ['bank', 'Bank lines', () => accountsService.getBankTransactions()],
  ['limits', 'DoFA limits', () => accountsService.getDelegationLimits()],
];

const REFRESH_MS = 60000;

export const useSupervisorData = (): SupervisorSnapshot => {
  const [data, setData] = useState<Data>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [businessDate] = useState(todayIso);
  const alive = useRef(true);

  const reload = useCallback(async () => {
    const list = sources(businessDate);
    const results = await Promise.allSettled(list.map(([, , load]) => load()));
    if (!alive.current) return;
    const next: Record<string, unknown> = {};
    const missing: string[] = [];
    results.forEach((r, i) => {
      const [key, label] = list[i];
      if (r.status === 'fulfilled') next[key] = OBJECT_SOURCES.includes(key) ? r.value ?? null : Array.isArray(r.value) ? r.value : [];
      else missing.push(label);
    });
    setData((prev) => mergeChanged(prev, next as Partial<Data>));
    setFailed((prev) => sameList(prev, missing));
    setLastSync(new Date());
    setLoading(false);
  }, [businessDate]);

  useEffect(() => {
    alive.current = true;
    reload();
    const tick = window.setInterval(reload, REFRESH_MS);
    return () => {
      alive.current = false;
      window.clearInterval(tick);
    };
  }, [reload]);

  return { ...data, businessDate, loading, failed, lastSync, reload };
};

/* ------------------------------------------------------------------ */
/* Derived state                                                       */
/* ------------------------------------------------------------------ */

/** Approval requests waiting on the supervisor. */
export const isSupervisorPending = (r: ApprovalRequestItem) => r.status === 'pending' && /SUPERVISOR/i.test(r.current_approver_role || r.current_level || '');

/** Hours since the request was submitted (null when the server gave no time). */
export const ageHours = (iso?: string) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.max(0, (Date.now() - t) / 3600000);
};

export const ageLabel = (h: number | null) => (h == null ? '—' : h < 1 ? '<1h' : h < 24 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`);

export const isOverdue = (r: ApprovalRequestItem) => (ageHours(r.submitted_at) ?? 0) > 24;

/** Risk flags the server will not let anyone approve past without acknowledging (ApprovalEngineService). */
export const CRITICAL_FLAGS = ['missing_documents', 'duplicate_risk', 'budget_exceeded', 'related_party', 'bank_change'];

export const criticalFlags = (r: ApprovalRequestItem) => (r.risk_flags || []).filter((f) => CRITICAL_FLAGS.includes(f));

// Seed DoFA defaults used by the server when no DelegationLimit row exists (services.get_role_limit)
const SERVER_DEFAULT_LIMIT: Record<string, number> = { journal: 50000, vendor_bill: 100000, expense: 25000, write_off: 10000, inventory_writeoff: 50000, unbilled_accrual: 500000, consultant_fee_accrual: 100000 };

/** The supervisor's approval limit for a document type, as the server will apply it. */
export const supervisorLimit = (limits: DelegationLimitItem[], docType: string): number | null => {
  const row = limits.find((l) => l.role === 'supervisor' && l.document_type === docType);
  if (row && row.max_amount != null) return Number(row.max_amount);
  return SERVER_DEFAULT_LIMIT[docType] ?? null;
};

export const DOC_LABEL: Record<string, string> = {
  journal: 'Journal',
  vendor_bill: 'Vendor bill',
  expense: 'Expense',
  write_off: 'Write-off',
  refund: 'Refund',
  gst_batch: 'GST batch',
  inventory_writeoff: 'Inventory write-off',
};

export const docLabel = (t: string) => DOC_LABEL[t] || t.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export const ESCALATION_REASONS: [string, string][] = [
  ['high_amount', 'High amount'],
  ['compliance_risk', 'Compliance risk'],
  ['duplicate_risk', 'Duplicate risk'],
  ['budget_violation', 'Budget violation'],
  ['fraud_suspicion', 'Fraud suspicion'],
];
