// CFO · one data hook for the workspace (HMS bible 19.11) plus the response shapes of /accounts/cfo/*.
// Figures arrive from CfoStrategyService already formatted (₹ … Cr strings) or as ₹ crore numbers.
import { mergeChanged, sameList } from '../shared/liveData';
import { useCallback, useEffect, useRef, useState } from 'react';
import { accountsService, TrailEntry } from '../../../services/accountsService';

/* ------------------------------------------------------------------ */
/* Response shapes (CfoStrategyService)                                */
/* ------------------------------------------------------------------ */

export interface CfoDashboard {
  kpis: {
    total_revenue: string;
    revenue_growth: string;
    total_expense: string;
    net_profit: string;
    net_profit_margin: string;
    cash_available: string;
    runway_all: string;
    ebitda: string;
    ebitda_margin: string;
    budget_variance: string;
    patient_revenue_growth: string;
    on_track: boolean;
  };
  badges: Record<string, number>;
  questions: Array<{ q: string; v: string; d: string; target: string }>;
  upcoming_decisions: Array<{ k: string; id: string; t: string; v: string; due: string; target: string }>;
  revenue_trend: Array<{ month: string; revenue: number; expense: number }>;
  department_rankings: Array<{ name: string; revenue: number; expense: number; profit: number; margin: number }>;
}

export interface CfoProfitLoss {
  period: string;
  labels: string[];
  kpis: Record<string, string>;
  lines: Array<{ label: string; current: number; comparison: number; is_bold: boolean; is_cost: boolean; change_pct: number; pct_of_rev: number }>;
  trend: Array<{ month: string; actual: number; budget: number | null }>;
}

export interface CfoCashFlow {
  view: string;
  cash_balance: string;
  expected_inflows: string;
  expected_outflows: string;
  closing_balance: string;
  lowest_balance: string;
  lowest_date: string;
  is_below_buffer: boolean;
  runway_cash: string;
  runway_all: string;
  points: Array<{ d?: number; lbl: string; inn: number; out: number; bal: number; ev?: Array<{ t: string; a: number; k: string }> }>;
  warnings: Array<{ level: string; title: string; detail: string }>;
  major_payments: Array<{ date: string; t: string; a: number; k: string; bal: number }>;
}

export interface CfoBalanceSheet {
  total_assets: string;
  total_liabilities: string;
  equity: string;
  debt_to_equity: string;
  has_new_loans: boolean;
  assets: Array<{ name: string; amount: number; share: string }>;
  liabilities: Array<{ name: string; amount: number; share: string }>;
  debt_capacity: Array<{ measure: string; today: string; pro_forma: string; limit: string }>;
}

export interface CfoDeptProfitability {
  rank: string;
  total_revenue: string;
  total_expense: string;
  overhead: string;
  net_contribution: string;
  margin_pct: string;
  loss_making_count: number;
  departments: Array<{ name: string; revenue: number; expense: number; profit: number; margin: number; prev_margin: number; margin_diff: number; driver: string; status: string }>;
  directives: Record<string, unknown>;
}

export interface CfoServiceLines {
  sort_by: string;
  total_revenue: string;
  weighted_growth: string;
  fastest_growing: string;
  fastest_growth_pct: string;
  highest_margin: string;
  highest_margin_pct: string;
  service_lines: Array<{ id: string; service_line: string; department_id: string; revenue: number; volume: number; unit: string; margin_pct: number; yoy_growth_pct: number; trend: string }>;
}

export interface CfoBudgetStrategy {
  view: string;
  status: string;
  proposal: { fiscal_year: string; revenue_target: string; ebitda_target: string; net_profit_target: string; capex_budget: string; trail: TrailEntry[] };
  /** [department, FY budget, YTD actual, variance %, next-FY proposed] (₹ Cr) */
  dept_rows: Array<[string, number, number, number, number]>;
  /** [metric, FY budget, FY outlook, next-FY proposed] (₹ Cr) */
  hospital_rows: Array<[string, number, number, number]>;
  /** [investment, cost, annual revenue, payback years, linked reference] */
  growth_rows: Array<[string, number, number, number, string]>;
}

export interface CfoForecast {
  horizon: string;
  scenario: string;
  kpis: { forecast_revenue: string; forecast_expense: string; forecast_profit: string; profit_margin: string; closing_cash: string; lowest_cash: string; is_low_below_buffer: boolean };
  has_fresh_capex: boolean;
  points: Array<{ lbl: string; month_idx: number; quarter: number; rev: number; exp: number; np: number; bal: number }>;
  scenario_comparison: Record<string, { rev: string; exp: string; np: string; closing_cash: string; low_cash: string }>;
}

export interface CfoCapex {
  id: string;
  reference_no: string;
  name: string;
  department_id: string;
  cost: string;
  roi_pct: string;
  payback_years: string;
  npv: string;
  risk_level: string;
  funding_mix: string;
  loan_pct: string;
  status: string;
  driver: string;
  timeline: string;
  annual_revenue_impact: string;
  proposed_by: string;
  due_date: string;
  cash_out: string;
  trail: TrailEntry[];
}

export interface CfoCapexList {
  kpis: { awaiting_cost: string; awaiting_count: number; expected_roi: string; avg_payback: string; approved_fy27: string };
  pro_forma: { new_loans: number; total_debt: number; de_ratio: number; dscr: number; borrowing_headroom: number };
  requests: CfoCapex[];
}

export interface CfoApproval {
  id: string;
  reference_no: string;
  approval_type: string;
  title: string;
  value_text: string;
  annual_impact: string;
  roi_text: string;
  risk_level: string;
  note: string;
  key_values: Array<[string, string]>;
  submitted_by: string;
  status: string;
  trail: TrailEntry[];
}

export interface CfoGrowth {
  id: string;
  reference_no: string;
  title: string;
  opportunity_type: string;
  investment: string;
  revenue_potential: string;
  maturity_year: number;
  irr_pct: string;
  payback_years: string;
  risk_level: string;
  stage: string;
  note: string;
  trail: TrailEntry[];
}

export interface CfoRisk {
  id: string;
  rating: string;
  reference_no: string;
  title: string;
  description: string;
  impact: number;
  likelihood: number;
  owner: string;
  mitigation: string;
  trend: string;
  status: string;
  trail: TrailEntry[];
}

export interface CfoAlert {
  id: string;
  alert_no: string;
  alert_type: string;
  severity: string;
  title: string;
  detail: string;
  target_screen: string;
  status: string;
  assigned_to: string;
  trail: TrailEntry[];
}

export interface CfoBoardReport {
  meeting_date: string;
  period: string;
  status: string;
  kpis: { meeting: string; pack_status: string; sections_count: number; decisions_for_board: number };
  headlines: string[];
  sections: Array<{ key: string; title: string; included: boolean; metrics: Array<{ label: string; value: string }>; bullets: string[] }>;
  trail: TrailEntry[];
}

export interface CfoDecision {
  id: string;
  decision_no: string;
  decided_date: string;
  category: string;
  title: string;
  outcome: string;
  reason: string;
  impact_text: string;
  decided_by_name: string;
  is_fresh: boolean;
}

/* ------------------------------------------------------------------ */
/* Workspace data hook                                                 */
/* ------------------------------------------------------------------ */

export interface CfoSnapshot {
  dash: CfoDashboard | null;
  bs: CfoBalanceSheet | null;
  budget: CfoBudgetStrategy | null;
  capex: CfoCapexList | null;
  approvals: CfoApproval[];
  growth: CfoGrowth[];
  risks: CfoRisk[];
  alerts: CfoAlert[];
  board: CfoBoardReport | null;
  decisions: CfoDecision[];
  loading: boolean;
  failed: string[];
  lastSync: Date | null;
  reload: () => Promise<void>;
}

type Data = Omit<CfoSnapshot, 'loading' | 'failed' | 'lastSync' | 'reload'>;
const EMPTY: Data = { dash: null, bs: null, budget: null, capex: null, approvals: [], growth: [], risks: [], alerts: [], board: null, decisions: [] };

// List endpoints wrap their rows ({ kpis, requests | approvals | … }); pick the rows out here
const SOURCES: [keyof Data, string, () => Promise<unknown>][] = [
  ['dash', 'Dashboard', () => accountsService.getCfoDashboard()],
  ['bs', 'Balance sheet', () => accountsService.getCfoBalanceSheet()],
  ['budget', 'Budget strategy', () => accountsService.getCfoBudgetStrategy('Department')],
  ['capex', 'CapEx', () => accountsService.getCfoCapexRequests('All')],
  ['approvals', 'Strategic approvals', async () => (await accountsService.getCfoStrategicApprovals('All'))?.approvals ?? []],
  ['growth', 'Growth opportunities', async () => (await accountsService.getCfoGrowthOpportunities('All'))?.opportunities ?? []],
  ['risks', 'Strategic risks', async () => (await accountsService.getCfoStrategicRisks('All'))?.risks ?? []],
  ['alerts', 'Financial alerts', async () => (await accountsService.getCfoExecutiveAlerts('All'))?.alerts ?? []],
  ['board', 'Board report', () => accountsService.getCfoBoardReport()],
  ['decisions', 'Executive decisions', async () => (await accountsService.getCfoExecutiveDecisions('All'))?.decisions ?? []],
];
const OBJECTS: (keyof Data)[] = ['dash', 'bs', 'budget', 'capex', 'board'];
const REFRESH_MS = 60000;

export const useCfoData = (): CfoSnapshot => {
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
      if (r.status === 'fulfilled') next[key] = OBJECTS.includes(key) ? r.value ?? null : Array.isArray(r.value) ? r.value : [];
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
/* Formatting & policy                                                 */
/* ------------------------------------------------------------------ */

/** ₹ crore number → "₹ 14.50 Cr". */
export const crc = (v: number | string | null | undefined) => {
  const n = Number(v);
  return Number.isFinite(n) ? `₹ ${n.toFixed(2)} Cr` : '—';
};

/** CFO approval authority for a single CapEx item, ₹ crore (server rule in CfoStrategyService.decide_capex). */
export const BOARD_LIMIT_CR = 25;

export const isAwaitingCfo = (s: string) => /awaiting/i.test(s);
