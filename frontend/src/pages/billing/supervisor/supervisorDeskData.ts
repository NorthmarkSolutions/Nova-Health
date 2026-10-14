// Billing · Supervisor desk data: dashboard (counters, alerts), approvals, refunds, the shift board (closings),
// the audit stream, today's OPD visits from the front desk and unpaid invoices. Every count on the workspace — KPIs,
// sidebar pills, filter chips — is derived from this one hook. A source that fails stays empty and is named in `failed`.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  billingService,
  AuditStream,
  BillingInvoice,
  CashierOpdVisit,
  SupervisorApprovalQueue,
  SupervisorDashboard,
  SupervisorRefundQueue,
  SupervisorShiftBoard,
} from '../../../services/billingService';
import { mergeChanged, sameList } from '../../accounts/shared/liveData';
import { HmsTone } from '../../../components/hms';

const POLL_MS = 15000;

export interface SupervisorDeskData {
  dashboard: SupervisorDashboard | null;
  approvals: SupervisorApprovalQueue | null;
  refunds: SupervisorRefundQueue | null;
  board: SupervisorShiftBoard | null;
  audit: AuditStream | null;
  visits: CashierOpdVisit[];
  dues: BillingInvoice[];
  loading: boolean;
  failed: string[];
  lastSync: Date | null;
  reload: () => Promise<void>;
}

type Sources = Pick<SupervisorDeskData, 'dashboard' | 'approvals' | 'refunds' | 'board' | 'audit' | 'visits' | 'dues'>;
const EMPTY: Sources = { dashboard: null, approvals: null, refunds: null, board: null, audit: null, visits: [], dues: [] };

export const useSupervisorDeskData = (): SupervisorDeskData => {
  const [src, setSrc] = useState<Sources>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const alive = useRef(true);

  const reload = useCallback(async () => {
    const [d, a, r, b, au, v, unpaid, part] = await Promise.allSettled([
      billingService.getSupervisorDashboard(),
      billingService.getSupervisorApprovals(),
      billingService.getSupervisorRefunds(),
      billingService.getSupervisorShiftBoard(),
      billingService.getAuditStream(),
      billingService.getCashierOpdVisits(),
      billingService.getInvoices({ status: 'UNPAID' }),
      billingService.getInvoices({ status: 'PARTIALLY_PAID' }),
    ]);
    if (!alive.current) return;
    const next: Partial<Sources> = {};
    const missing: string[] = [];
    if (d.status === 'fulfilled') next.dashboard = d.value;
    else missing.push('Counters & alerts');
    if (a.status === 'fulfilled') next.approvals = a.value;
    else missing.push('Approvals');
    if (r.status === 'fulfilled') next.refunds = r.value;
    else missing.push('Refunds');
    if (b.status === 'fulfilled') next.board = b.value;
    else missing.push('Closings');
    if (au.status === 'fulfilled') next.audit = au.value;
    else missing.push('Audit stream');
    if (v.status === 'fulfilled') next.visits = v.value.visits;
    else missing.push('OPD visits');
    if (unpaid.status === 'fulfilled' && part.status === 'fulfilled') next.dues = [...(unpaid.value || []), ...(part.value || [])];
    else missing.push('Unpaid invoices');
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

/* ---------------- OPD reconciliation: where each front-desk visit stands for the supervisor ---------------- */

export type OpdFlag = 'leak' | 'refund' | 'desk' | 'received' | 'nocharge' | 'due' | 'paid' | 'cancelled';

export const OPD_FLAG: Record<OpdFlag, { label: string; tone: HmsTone; hint: string }> = {
  leak: { label: 'Seen · not paid', tone: 'red', hint: 'The doctor has seen this patient but the consultation fee is still unpaid. Collect it before the patient leaves.' },
  refund: { label: 'Refund due', tone: 'amber', hint: 'The front desk took the fee, then the visit was cancelled or marked no-show. Refund the patient and record it.' },
  desk: { label: 'Desk cash to receive', tone: 'amber', hint: 'The front desk collected this fee itself. Receive the money from the desk and confirm it here.' },
  received: { label: 'Desk cash received', tone: 'green', hint: 'Fee collected at the front desk and handed over to billing.' },
  nocharge: { label: 'No charge raised', tone: 'amber', hint: 'No consultation charge reached billing — usually the doctor is not mapped or has no tariff. Check before the day closes.' },
  due: { label: 'Fee due', tone: 'blue', hint: 'Consultation fee is waiting at the billing counter.' },
  paid: { label: 'Paid at counter', tone: 'green', hint: 'Consultation fee collected at the billing counter.' },
  cancelled: { label: 'Cancelled', tone: 'gray', hint: 'Cancelled or no-show with no money taken.' },
};

const SEEN = ['IN_CONSULTATION', 'COMPLETED'];
const UNPAID = ['TO_COLLECT', 'DRAFT', 'BILLED'];

export const opdFlag = (v: CashierOpdVisit): OpdFlag => {
  const st = v.billing.state;
  if (st === 'PAID_AT_DESK') {
    if (v.status === 'CANCELLED') return 'refund';
    return v.billing.reconciled ? 'received' : 'desk';
  }
  if (v.status === 'CANCELLED') return 'cancelled';
  if (UNPAID.includes(st)) return SEEN.includes(v.status) ? 'leak' : 'due';
  if (st === 'PAID') return 'paid';
  if (st === 'NO_CHARGE') return 'nocharge';
  return 'cancelled';
};

export const visitAmount = (v: CashierOpdVisit) => Number(v.billing.amount ?? v.quoted_fee ?? 0) || 0;

/* ---------------- Dues ageing ---------------- */

export const DUE_BUCKETS = [
  { key: 'd0', label: 'Today', min: 0, max: 0 },
  { key: 'd7', label: '1–7 days', min: 1, max: 7 },
  { key: 'd30', label: '8–30 days', min: 8, max: 30 },
  { key: 'd31', label: 'Over 30 days', min: 31, max: Infinity },
] as const;

export const dueAgeDays = (inv: BillingInvoice, now = Date.now()) => {
  const t = new Date(String(inv.created_at || inv.date)).getTime();
  return Number.isNaN(t) ? 0 : Math.max(0, Math.floor((now - t) / 86400000));
};

export const dueBucket = (days: number) => DUE_BUCKETS.find((b) => days >= b.min && days <= b.max)?.key || 'd31';

/* ---------------- shared labels ---------------- */

export const fmtClock = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const fmtWhen = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const TENDER_NAME: Record<string, string> = { CASH: 'Cash', CARD: 'Card (EDC)', UPI: 'UPI' };

export const MONO: CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px' };
