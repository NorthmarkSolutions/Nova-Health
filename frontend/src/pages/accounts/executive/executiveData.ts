// Accounts Executive · one data hook for the whole workspace (HMS bible 19.11).
// Every count on screen — KPIs, sidebar pills, filter chips — is derived from this snapshot.
import { mergeChanged, sameList } from '../shared/liveData';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  accountsService,
  AccountDocumentItem,
  ApprovalRequestItem,
  AuditLogItem,
  BankTransactionItem,
  ChartOfAccountItem,
  CollectionCaseItem,
  ExpenseRequestItem,
  FinancialEventItem,
  GSTBatchItem,
  JournalVoucher,
  PeriodLockItem,
  ReceivableItem,
  VendorBillItem,
} from '../../../services/accountsService';

export interface ExecutiveSnapshot {
  events: FinancialEventItem[];
  journals: JournalVoucher[];
  bills: VendorBillItem[];
  bank: BankTransactionItem[];
  receivables: ReceivableItem[];
  cases: CollectionCaseItem[];
  expenses: ExpenseRequestItem[];
  gst: GSTBatchItem[];
  requests: ApprovalRequestItem[];
  activity: AuditLogItem[];
  documents: AccountDocumentItem[];
  coa: ChartOfAccountItem[];
  periods: PeriodLockItem[];
  integrity: { status: string; total_records: number; valid: boolean } | null;
  /** True until the first load finishes. */
  loading: boolean;
  /** Sources the server did not return (shown as a notice, never filled with sample data). */
  failed: string[];
  lastSync: Date | null;
  reload: () => Promise<void>;
}

type Data = Omit<ExecutiveSnapshot, 'loading' | 'failed' | 'lastSync' | 'reload'>;

const EMPTY: Data = {
  events: [],
  journals: [],
  bills: [],
  bank: [],
  receivables: [],
  cases: [],
  expenses: [],
  gst: [],
  requests: [],
  activity: [],
  documents: [],
  coa: [],
  periods: [],
  integrity: null,
};

const SOURCES: [keyof Data, string, () => Promise<unknown>][] = [
  ['events', 'Event inbox', () => accountsService.getEvents()],
  ['journals', 'Journals', () => accountsService.getJournals()],
  ['bills', 'Vendor bills', () => accountsService.getVendorBills()],
  ['bank', 'Bank lines', () => accountsService.getBankTransactions()],
  ['receivables', 'Receivables', () => accountsService.getReceivables()],
  ['cases', 'Collections', () => accountsService.getCollectionPipeline()],
  ['expenses', 'Expenses', () => accountsService.getExpenseRequests()],
  ['gst', 'GST batches', () => accountsService.getGSTBatches()],
  ['requests', 'My requests', () => accountsService.getApprovalRequests({ maker: 'me' })],
  ['activity', 'Activity log', () => accountsService.getAuditActivity()],
  ['documents', 'Documents', () => accountsService.getDocuments()],
  ['coa', 'Chart of accounts', () => accountsService.getCOA()],
  ['periods', 'Periods', () => accountsService.getPeriods()],
  ['integrity', 'Ledger integrity', () => accountsService.getAuditIntegrity()],
];

const REFRESH_MS = 60000;

export const useExecutiveData = (): ExecutiveSnapshot => {
  const [data, setData] = useState<Data>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const alive = useRef(true);

  const reload = useCallback(async () => {
    const results = await Promise.allSettled(SOURCES.map(([, , load]) => load()));
    if (!alive.current) return;
    const next: Record<string, unknown> = {};
    const missing: string[] = [];
    results.forEach((r, i) => {
      const [key, label] = SOURCES[i];
      if (r.status === 'fulfilled') next[key] = key === 'integrity' ? r.value ?? null : Array.isArray(r.value) ? r.value : [];
      else missing.push(label);
    });
    setData((prev) => mergeChanged(prev, next as Partial<Data>));
    setFailed((prev) => sameList(prev, missing));
    setLastSync(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    alive.current = true;
    reload();
    const tick = window.setInterval(reload, REFRESH_MS);
    return () => {
      alive.current = false;
      window.clearInterval(tick);
    };
  }, [reload]);

  return { ...data, loading, failed, lastSync, reload };
};

/* ------------------------------------------------------------------ */
/* Formatting & derived state                                          */
/* ------------------------------------------------------------------ */

export const num = (v: unknown) => Number(v) || 0;

export const inr = (v: unknown) => '₹ ' + Math.round(num(v)).toLocaleString('en-IN');

export const inr2 = (v: unknown) => '₹ ' + num(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "medical_consumables" → "Medical consumables" */
export const humanize = (s?: string | null) => {
  if (!s) return '—';
  const t = s.replace(/[_-]+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const addDaysIso = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const AGING_LABEL: Record<ReceivableItem['aging_bucket'], string> = {
  '0_30': '0–30 days',
  '31_60': '31–60 days',
  '61_90': '61–90 days',
  '90_plus': '90+ days',
};

/** Work the executive still owns (drafts or items sent back). */
export const isMakerOpen = (status: string) => status === 'draft' || status === 'returned';

export const isDuplicateRisk = (b: VendorBillItem) => b.duplicate_score >= 80;

export const isRequestOpen = (r: ApprovalRequestItem) => ['pending', 'forwarded', 'escalated'].includes(r.status);

export const isBankOpen = (t: BankTransactionItem) => t.match_status !== 'matched' && t.match_status !== 'excluded';

/** Current open accounting period, from the server's period locks. */
export const openPeriod = (periods: PeriodLockItem[]) =>
  [...periods].filter((p) => p.status === 'open' || p.status === 'reopened').sort((a, b) => b.period_key.localeCompare(a.period_key))[0] || null;

/** Server error text from an axios failure, else a fallback. */
export const apiError = (e: unknown, fallback: string) => {
  const err = e as { response?: { data?: { error?: { message?: string }; detail?: string; message?: string } } };
  return err?.response?.data?.error?.message || err?.response?.data?.detail || err?.response?.data?.message || fallback;
};
