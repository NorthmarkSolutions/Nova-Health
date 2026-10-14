// Billing · Cashier desk data: dashboard (incl. shift), live billing queue, today's OPD visits and the cashier's own requests.
// Every count on the workspace — KPIs, sidebar pills, filter chips — is derived from this one hook. Nothing is invented:
// a source that fails stays empty and is named in `failed`.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  billingService,
  CashierDashboardData,
  CashierLiveQueue,
  CashierOpdVisit,
  RefundRequest,
  SupervisorApprovalRequest,
  counterMode,
} from '../../../services/billingService';
import { mergeChanged, sameList } from '../../accounts/shared/liveData';

const POLL_MS = 15000;

export interface CashierRequestRow {
  key: string;
  id: string;
  type: 'Discount' | 'Void' | 'Refund';
  /** Approved cash refund still to be paid out of the drawer */
  payable: boolean;
  number: string;
  detail: string;
  reason: string;
  decisionNote: string;
  patient: string;
  uhid: string;
  invoice: string;
  amount: number;
  /** PENDING (incl. escalated) | APPROVED | REJECTED | DISBURSED */
  status: string;
  at: string;
}

const isVoid = (a: SupervisorApprovalRequest) => a.request_type === 'INVOICE_VOID';

const approvalNote = (a: SupervisorApprovalRequest) => {
  if (a.status === 'REJECTED') return a.rejection_reason || 'Rejected';
  if (a.status === 'ESCALATED') return `With Billing Admin${a.escalation_reason === 'SLA_BREACH' ? ' (unreviewed past SLA)' : ''}`;
  if (a.status !== 'APPROVED') return '';
  const by = `Approved by ${a.approvedByName || 'supervisor'}`;
  if (isVoid(a)) return `${by} · invoice cancelled, charges back in the queue`;
  const lowered =
    a.requested_discount_percent != null && Number(a.requested_discount_percent) !== Number(a.discount_percent)
      ? ` at ${Number(a.discount_percent)}% (asked ${Number(a.requested_discount_percent)}%)`
      : '';
  return `${by}${lowered}${a.invoiceNumber ? ` · used on ${a.invoiceNumber}` : ' · ready to apply on the bill'}`;
};

export const fromApproval = (a: SupervisorApprovalRequest): CashierRequestRow => ({
  key: `a-${a.id}`,
  id: a.id,
  payable: false,
  type: isVoid(a) ? 'Void' : 'Discount',
  number: a.request_number,
  detail: isVoid(a) ? `Void ${a.invoiceNumber || 'invoice'}` : `${Number(a.discount_percent)}% on a bill of ${Number(a.bill_gross).toFixed(2)}`,
  reason: [a.reason, a.notes].filter(Boolean).join(' — '),
  decisionNote: approvalNote(a),
  patient: a.patientName || '',
  uhid: a.uhid || '',
  invoice: a.invoiceNumber || '',
  amount: isVoid(a) ? Number(a.requested_amount || 0) : Number(a.discount_amount),
  status: a.status === 'ESCALATED' ? 'PENDING' : a.status,
  at: a.created_at,
});

export const fromRefund = (r: RefundRequest): CashierRequestRow => ({
  key: `r-${r.id}`,
  id: r.id,
  payable: r.status === 'APPROVED' && (r.original_tender || 'CASH') === 'CASH',
  type: 'Refund',
  number: r.refundNumber,
  detail:
    r.status === 'DISBURSED'
      ? `Paid via ${r.disbursed_tender || '—'}${r.credit_note_number ? ` · ${r.credit_note_number}` : ''}`
      : `Refund to original tender${r.original_tender ? ` (${r.original_tender})` : ''}`,
  reason: [r.reason, r.clinical_justification].filter(Boolean).join(' — '),
  decisionNote:
    r.status === 'REJECTED'
      ? r.rejection_reason || 'Rejected'
      : r.status === 'ESCALATED'
        ? 'With Billing Admin'
        : r.status === 'APPROVED' && (r.original_tender || 'CASH') === 'CASH'
          ? `Approved by ${r.approvedByName || 'supervisor'} · pay the cash from your drawer`
          : r.approvedByName
            ? `Decided by ${r.approvedByName}`
            : '',
  patient: r.patientName || '',
  uhid: r.uhid || '',
  invoice: r.invoiceNumber || '',
  amount: Number(r.requested_amount),
  status: r.status === 'ESCALATED' ? 'PENDING' : r.status,
  at: r.created_at,
});

export interface CashierDeskData {
  dashboard: CashierDashboardData | null;
  queue: CashierLiveQueue | null;
  visits: CashierOpdVisit[];
  requests: CashierRequestRow[];
  loading: boolean;
  failed: string[];
  lastSync: Date | null;
  /** Set when the supervisor's assisted shift closed under them. */
  assistEnded: string | null;
  reload: () => Promise<void>;
}

type Sources = Pick<CashierDeskData, 'dashboard' | 'queue' | 'visits' | 'requests'>;
const EMPTY: Sources = { dashboard: null, queue: null, visits: [], requests: [] };

export const useCashierDeskData = (userId?: string | number): CashierDeskData => {
  const [src, setSrc] = useState<Sources>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [assistEnded, setAssistEnded] = useState<string | null>(null);
  const alive = useRef(true);

  const reload = useCallback(async () => {
    const [d, q, v, a, r] = await Promise.allSettled([
      billingService.getCashierDashboard(),
      billingService.getCashierLiveQueue(),
      billingService.getCashierOpdVisits(),
      billingService.getApprovalRequests({ mine: true }),
      billingService.getRefundRequests(),
    ]);
    if (!alive.current) return;
    const next: Partial<Sources> = {};
    const missing: string[] = [];
    if (d.status === 'fulfilled') {
      const dash = d.value;
      if (dash.assist && 'detail' in dash.assist) {
        // The assisted cashier closed their counter: drop out of counter mode
        counterMode.clear();
        setAssistEnded(dash.assist.detail);
      }
      next.dashboard = dash;
    } else missing.push('Dashboard & shift');
    if (q.status === 'fulfilled') next.queue = q.value;
    else missing.push('Billing queue');
    if (v.status === 'fulfilled') next.visits = v.value.visits;
    else missing.push('OPD visits');
    if (a.status === 'fulfilled' && r.status === 'fulfilled') {
      // Refund list is not scoped server-side; keep the ones this cashier raised
      const mine = (r.value || []).filter((x) => !userId || !x.initiated_by || String(x.initiated_by) === String(userId));
      next.requests = [...(a.value || []).map(fromApproval), ...mine.map(fromRefund)].sort((x, y) => y.at.localeCompare(x.at));
    } else missing.push('My requests');
    setSrc((prev) => mergeChanged(prev, next));
    setFailed((prev) => sameList(prev, missing));
    setLoading(false);
    setLastSync(new Date());
  }, [userId]);

  useEffect(() => {
    alive.current = true;
    Promise.resolve().then(reload);
    const tick = window.setInterval(reload, POLL_MS);
    return () => {
      alive.current = false;
      window.clearInterval(tick);
    };
  }, [reload]);

  return { ...src, loading, failed, lastSync, assistEnded, reload };
};

/* ---------------- shared rules & labels ---------------- */

export const DEPT_LABEL: Record<string, string> = {
  OPD: 'OPD',
  LAB: 'Lab',
  PHARMACY: 'Pharmacy',
  RADIOLOGY: 'Radiology',
  IPD: 'IPD',
  EMERGENCY: 'Emergency',
  GENERAL: 'General',
  COUNTER: 'Counter',
};
export const deptName = (d: string) => DEPT_LABEL[(d || '').toUpperCase()] || (d ? d.charAt(0) + d.slice(1).toLowerCase() : 'General');

export const fmtWait = (mins: number | null | undefined) => {
  if (mins === null || mins === undefined) return '—';
  if (mins < 60) return `${Math.round(mins)} min`;
  if (mins < 48 * 60) return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;
  return `${Math.floor(mins / 1440)} days`;
};

export const fmtTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/** A counter shift should not run past one working day without a closing and cash count. */
export const STALE_SHIFT_HOURS = 14;
export const shiftAgeHours = (startedAt?: string | null, now = 0) => {
  if (!startedAt || !now) return null;
  const t = new Date(startedAt).getTime();
  return Number.isNaN(t) ? null : Math.max(0, (now - t) / 3600000);
};

export const VISIT_STATE: Record<CashierOpdVisit['billing']['state'], { label: string; tone: 'amber' | 'green' | 'blue' | 'gray' | 'red' }> = {
  TO_COLLECT: { label: 'Fee to collect', tone: 'amber' },
  DRAFT: { label: 'Draft bill', tone: 'blue' },
  BILLED: { label: 'Billed · unpaid', tone: 'red' },
  PAID: { label: 'Paid', tone: 'green' },
  PAID_AT_DESK: { label: 'Paid at front desk', tone: 'green' },
  NO_CHARGE: { label: 'No charge', tone: 'gray' },
  CANCELLED: { label: 'Cancelled', tone: 'gray' },
};

export const VISIT_STATUS: Record<string, string> = {
  WAITING: 'Waiting',
  TRIAGED: 'Triaged',
  IN_CONSULTATION: 'With doctor',
  COMPLETED: 'Seen',
  CANCELLED: 'Cancelled / no-show',
};
