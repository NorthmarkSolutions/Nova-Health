// Billing · Admin desk data: revenue overview, approval and refund escalations, revenue integrity, tariff change
// requests, period close and today's OPD visits from the front desk. Every count on the workspace — KPIs, sidebar pills,
// filter chips — is derived from this one hook; masters (counters, roster, payers…) load inside their own section.
// A source that fails stays empty and is named in `failed`. Nothing is invented.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  billingService,
  AdminRevenueCommandOverview,
  CashierOpdVisit,
  PeriodCloseOverview,
  RevenueIntegrityOverviewData,
  SupervisorApprovalQueue,
  SupervisorRefundQueue,
  TariffChangeQueue,
} from '../../../services/billingService';
import { mergeChanged, sameList } from '../../accounts/shared/liveData';
import type { SupervisorDeskData } from '../supervisor/supervisorDeskData';

const POLL_MS = 30000;

export interface AdminDeskData {
  overview: AdminRevenueCommandOverview | null;
  approvals: SupervisorApprovalQueue | null;
  refunds: SupervisorRefundQueue | null;
  integrity: RevenueIntegrityOverviewData | null;
  tariffQueue: TariffChangeQueue | null;
  period: PeriodCloseOverview | null;
  visits: CashierOpdVisit[];
  loading: boolean;
  failed: string[];
  lastSync: Date | null;
  reload: () => Promise<void>;
}

type Sources = Pick<AdminDeskData, 'overview' | 'approvals' | 'refunds' | 'integrity' | 'tariffQueue' | 'period' | 'visits'>;
const EMPTY: Sources = { overview: null, approvals: null, refunds: null, integrity: null, tariffQueue: null, period: null, visits: [] };

export const useAdminDeskData = (): AdminDeskData => {
  const [src, setSrc] = useState<Sources>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const alive = useRef(true);

  const reload = useCallback(async () => {
    const [ov, ap, rf, ig, tq, pc, v] = await Promise.allSettled([
      billingService.getAdminOverview(),
      billingService.getSupervisorApprovals(),
      billingService.getSupervisorRefunds(),
      billingService.getRevenueIntegrityOverview(),
      billingService.getTariffChangeQueue(),
      billingService.getPeriodClose(),
      billingService.getCashierOpdVisits(),
    ]);
    if (!alive.current) return;
    const next: Partial<Sources> = {};
    const missing: string[] = [];
    if (ov.status === 'fulfilled') next.overview = ov.value;
    else missing.push('Revenue overview');
    if (ap.status === 'fulfilled') next.approvals = ap.value;
    else missing.push('Approvals');
    if (rf.status === 'fulfilled') next.refunds = rf.value;
    else missing.push('Refunds');
    if (ig.status === 'fulfilled') next.integrity = ig.value;
    else missing.push('Revenue integrity');
    if (tq.status === 'fulfilled') next.tariffQueue = tq.value;
    else missing.push('Tariff changes');
    if (pc.status === 'fulfilled') next.period = pc.value;
    else missing.push('Period close');
    if (v.status === 'fulfilled') next.visits = v.value.visits;
    else missing.push('OPD visits');
    setSrc((prev) => mergeChanged(prev, next));
    setFailed((prev) => sameList(prev, missing));
    setLoading(false);
    setLastSync(new Date());
  }, []);

  useEffect(() => {
    alive.current = true;
    Promise.resolve().then(reload);
    const tick = window.setInterval(reload, POLL_MS);
    return () => {
      alive.current = false;
      window.clearInterval(tick);
    };
  }, [reload]);

  return { ...src, loading, failed, lastSync, reload };
};

/** The supervisor's approval / refund views run unchanged on the admin desk: hand them only what they read. */
export const asSupervisorData = (d: AdminDeskData): SupervisorDeskData => ({
  dashboard: null,
  approvals: d.approvals,
  refunds: d.refunds,
  board: null,
  audit: null,
  visits: d.visits,
  dues: [],
  loading: d.loading,
  failed: d.failed,
  lastSync: d.lastSync,
  reload: d.reload,
});

/* ---------------- shared helpers ---------------- */

export const MONO: CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px' };

export const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const todayIso = () => new Date().toLocaleDateString('en-CA');

export const fmtDate = (iso?: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export const fmtWhen = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const titleCase = (s?: string | null) =>
  (s || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

