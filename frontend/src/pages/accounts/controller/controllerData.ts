// Finance Controller · one data hook for the whole workspace (HMS bible 19.11).
// Every list, count and KPI is read from the accounts API — no sample data.
import { mergeChanged, sameList } from '../shared/liveData';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  accountsService,
  AuditObservationItem,
  AuditRecord,
  AuditRequestItem,
  BankAccountControlItem,
  BankReconciliationItem,
  ControlViolationItem,
  ControllerDashboardData,
  ExecutivePerformance,
  FinancialExceptionItem,
  FinancialStatementData,
  HighRiskReviewItem,
  MonthEndCloseData,
  PaymentBatchItem,
  PeriodLockItem,
  PolicyMasterItem,
  QuarterEndCloseData,
  SupervisorPerformance,
  TaxReturnItem,
  YearEndCloseData,
} from '../../../services/accountsService';
import { closingPeriod } from '../manager/managerData';

/** Fiscal year (April–March) and quarter that contain a 'YYYY-MM' period: 2026-09 → FY2026-27 / FY27-Q2. */
export const fiscalOf = (period: string) => {
  const [y, m] = period.split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  const fy = `FY${start}-${String((start + 1) % 100).padStart(2, '0')}`;
  const q = m >= 4 && m <= 6 ? 1 : m >= 7 && m <= 9 ? 2 : m >= 10 && m <= 12 ? 3 : 4;
  return { fy, quarter: `FY${String((start + 1) % 100).padStart(2, '0')}-Q${q}` };
};

export type StatementKey = 'pl' | 'bs' | 'cf';

export interface ControllerSnapshot {
  dash: ControllerDashboardData | null;
  monthEnd: MonthEndCloseData | null;
  quarter: QuarterEndCloseData | null;
  year: YearEndCloseData | null;
  periods: PeriodLockItem[];
  batches: PaymentBatchItem[];
  accounts: BankAccountControlItem[];
  recons: BankReconciliationItem[];
  statements: Partial<Record<StatementKey, FinancialStatementData>>;
  taxReturns: TaxReturnItem[];
  auditRequests: AuditRequestItem[];
  observations: AuditObservationItem[];
  controls: ControlViolationItem[];
  highRisk: HighRiskReviewItem[];
  exceptions: FinancialExceptionItem[];
  policies: PolicyMasterItem[];
  audit: AuditRecord[];
  sups: SupervisorPerformance[];
  execs: ExecutivePerformance[];
  period: string;
  fy: string;
  quarterKey: string;
  loading: boolean;
  failed: string[];
  lastSync: Date | null;
  reload: () => Promise<void>;
}

type Data = Omit<ControllerSnapshot, 'period' | 'fy' | 'quarterKey' | 'loading' | 'failed' | 'lastSync' | 'reload'>;

const EMPTY: Data = {
  dash: null,
  monthEnd: null,
  quarter: null,
  year: null,
  periods: [],
  batches: [],
  accounts: [],
  recons: [],
  statements: {},
  taxReturns: [],
  auditRequests: [],
  observations: [],
  controls: [],
  highRisk: [],
  exceptions: [],
  policies: [],
  audit: [],
  sups: [],
  execs: [],
};

const OBJECTS: (keyof Data)[] = ['dash', 'monthEnd', 'quarter', 'year', 'statements'];

const loadStatements = async (period: string) => {
  // A statement the server has not prepared for this period returns 404 — leave it out rather than fail the section
  const out: Partial<Record<StatementKey, FinancialStatementData>> = {};
  await Promise.all(
    (['pl', 'bs', 'cf'] as StatementKey[]).map(async (k) => {
      try {
        out[k] = await accountsService.getFinancialStatement(k, period);
      } catch {
        /* not prepared */
      }
    })
  );
  return out;
};

const sources = (period: string, fy: string, quarterKey: string): [keyof Data, string, () => Promise<unknown>][] => [
  ['dash', 'Dashboard', () => accountsService.getControllerDashboard()],
  ['monthEnd', 'Month-end close', () => accountsService.getMonthEndClose(period)],
  ['quarter', 'Quarter-end close', () => accountsService.getQuarterEndClose(quarterKey)],
  ['year', 'Year-end close', () => accountsService.getYearEndClose(fy)],
  ['periods', 'Period locks', () => accountsService.getPeriods()],
  ['batches', 'Payment batches', () => accountsService.getPaymentBatches()],
  ['accounts', 'Bank accounts', () => accountsService.getBankAccounts()],
  ['recons', 'Reconciliations', () => accountsService.getBankReconciliations()],
  ['statements', 'Financial statements', () => loadStatements(period)],
  ['taxReturns', 'Tax returns', () => accountsService.getTaxReturns()],
  ['auditRequests', 'Audit requests', () => accountsService.getAuditRequests()],
  ['observations', 'Audit observations', () => accountsService.getAuditObservations()],
  ['controls', 'Control violations', () => accountsService.getControlViolations()],
  ['highRisk', 'High-risk items', () => accountsService.getHighRiskItems()],
  ['exceptions', 'Exceptions', () => accountsService.getFinancialExceptions()],
  ['policies', 'Policies', () => accountsService.getFinancialPolicies()],
  ['audit', 'Audit trail', () => accountsService.getRecentAudit(31)],
  ['sups', 'Supervisors', () => accountsService.getSupervisorPerformance()],
  ['execs', 'Executives', () => accountsService.getExecutivePerformance()],
];

const REFRESH_MS = 60000;

export const useControllerData = (): ControllerSnapshot => {
  const [data, setData] = useState<Data>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [keys] = useState(() => {
    const period = closingPeriod();
    return { period, ...fiscalOf(period) };
  });
  const alive = useRef(true);

  const reload = useCallback(async () => {
    const list = sources(keys.period, keys.fy, keys.quarter);
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
  }, [keys]);

  useEffect(() => {
    alive.current = true;
    reload();
    const tick = window.setInterval(reload, REFRESH_MS);
    return () => {
      alive.current = false;
      window.clearInterval(tick);
    };
  }, [reload]);

  return { ...data, period: keys.period, fy: keys.fy, quarterKey: keys.quarter, loading, failed, lastSync, reload };
};

/* ------------------------------------------------------------------ */
/* Derived state                                                       */
/* ------------------------------------------------------------------ */

export const DONE_EXCEPTION = ['Closed', 'Risk Accepted', 'closed', 'risk_accepted'];

export const isOpenException = (x: FinancialExceptionItem) => !DONE_EXCEPTION.includes(x.status);

export const isBatchAwaiting = (b: PaymentBatchItem) => /awaiting/i.test(b.status);

export const isReconApproved = (r: BankReconciliationItem) => /approved/i.test(r.status);

/** People the controller can hand work to (supervisors and executives on file). */
export const staffOf = (d: Pick<ControllerSnapshot, 'sups' | 'execs'>) => [...d.sups.map((s) => s.name), ...d.execs.map((e) => e.name)];

/** Controller-facing labels for period lock states. */
export const PERIOD_LABEL: Record<string, string> = {
  open: 'Open',
  soft_closed: 'Soft closed',
  close_pending: 'Close pending',
  close_approved: 'Close approved',
  locked: 'Locked',
  reopen_requested: 'Reopen requested',
  reopened: 'Reopened',
};
