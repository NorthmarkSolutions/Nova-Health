// Billing · IPD & TPA desk data: inpatient running bills, cashless claims, payers and the officer's counter shift.
// Every count on the workspace (KPIs, sidebar pills, filter chips) is derived from this one hook.
import { useCallback, useEffect, useRef, useState } from 'react';
import { billingService, CorporateAccount, IpdAdmissionOverviewItem, IpdAdmissionsOverviewResponse, ShiftSummary, TPAClaimRecord } from '../../../services/billingService';
import { mergeChanged, sameList } from '../../accounts/shared/liveData';

const POLL_MS = 30000;

/** Claim with every amount as a number — the claim serializer sends decimals as strings. */
export interface IpdClaim extends Omit<TPAClaimRecord, 'requested_amount' | 'pre_auth_amount' | 'enhancement_amount' | 'non_medical_deductibles' | 'copay_percent' | 'room_rent_cap' | 'settled_amount' | 'deduction_amount'> {
  requested_amount: number;
  pre_auth_amount: number;
  enhancement_amount: number;
  non_medical_deductibles: number;
  copay_percent: number;
  room_rent_cap: number | null;
  settled_amount: number;
  deduction_amount: number;
  /** Approved + enhancement. */
  approved_total: number;
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const mapClaim = (c: TPAClaimRecord): IpdClaim => {
  const pre = num(c.pre_auth_amount);
  const enh = num(c.enhancement_amount);
  return {
    ...c,
    requested_amount: num(c.requested_amount),
    pre_auth_amount: pre,
    enhancement_amount: enh,
    non_medical_deductibles: num(c.non_medical_deductibles),
    copay_percent: num(c.copay_percent),
    room_rent_cap: c.room_rent_cap === null || c.room_rent_cap === undefined || c.room_rent_cap === ('' as unknown) ? null : num(c.room_rent_cap),
    settled_amount: num(c.settled_amount),
    deduction_amount: num(c.deduction_amount),
    approved_total: pre + enh,
    tracking_notes: c.tracking_notes || [],
  };
};

export interface IpdTpaData {
  overview: IpdAdmissionsOverviewResponse | null;
  admissions: IpdAdmissionOverviewItem[];
  claims: IpdClaim[];
  payers: CorporateAccount[];
  shift: ShiftSummary | null;
  loading: boolean;
  failed: string[];
  lastSync: Date | null;
  reload: () => Promise<void>;
}

type Sources = Pick<IpdTpaData, 'overview' | 'claims' | 'payers' | 'shift'>;
const EMPTY: Sources = { overview: null, claims: [], payers: [], shift: null };

export const useIpdTpaData = (): IpdTpaData => {
  const [src, setSrc] = useState<Sources>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const alive = useRef(true);

  const reload = useCallback(async () => {
    const [ov, cl, py, sh] = await Promise.allSettled([
      billingService.getIpdAdmissionsOverview(),
      billingService.getTPAClaims(),
      billingService.getInsurancePayers(),
      billingService.getCurrentShift(),
    ]);
    if (!alive.current) return;
    const next: Partial<Sources> = {};
    const missing: string[] = [];
    if (ov.status === 'fulfilled') next.overview = ov.value;
    else missing.push('Running bills');
    if (cl.status === 'fulfilled') next.claims = (cl.value.claims || []).map(mapClaim);
    else missing.push('Cashless claims');
    if (py.status === 'fulfilled') next.payers = py.value;
    else missing.push('Payers');
    if (sh.status === 'fulfilled') next.shift = sh.value;
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

  return { ...src, admissions: src.overview?.admissions || [], loading, failed, lastSync, reload };
};

/* ---------------- shared rules ---------------- */

/** Insurer has not decided yet (pre-auth stage). */
export const isPreAuthOpen = (c: IpdClaim) => c.claim_status === 'PRE_AUTH' && (c.pre_auth_status === 'PENDING' || c.pre_auth_status === 'QUERY_RAISED');
/** Approved or filed — money still to come from the insurer. */
export const isReceivable = (c: IpdClaim) => c.claim_status === 'APPROVED' || c.claim_status === 'CLAIM_FILED';
export const inDischarge = (a: IpdAdmissionOverviewItem) => a.status === 'MEDICALLY_DISCHARGED' || a.status === 'AWAITING_TPA';
export const overCover = (a: IpdAdmissionOverviewItem) => a.status === 'RUNNING' && a.util >= 80;

/** IRDAI cashless guideline: insurer decides a pre-auth within 1 hour; the final discharge authorisation within 3 hours. */
export const PREAUTH_TAT_MIN = 60;

export const minutesSince = (iso?: string | null, now = Date.now()) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.max(0, Math.round((now - t) / 60000));
};

export const fmtAge = (mins: number | null) => {
  if (mins === null) return '—';
  if (mins < 60) return `${mins} min`;
  if (mins < 48 * 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${Math.floor(mins / 1440)} days`;
};

/** A filed claim is overdue once it has waited longer than the payer's contracted settlement days. */
export const settlementOverdue = (c: IpdClaim, payers: CorporateAccount[], now = Date.now()) => {
  if (c.claim_status !== 'CLAIM_FILED') return false;
  const tat = payers.find((p) => p.id === c.corporate_account)?.settlement_tat_days;
  const mins = minutesSince(c.updated_at, now);
  return !!tat && mins !== null && mins > tat * 1440;
};

export const fmtDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const PREAUTH_LABEL: Record<TPAClaimRecord['pre_auth_status'], string> = {
  PENDING: 'Awaiting insurer',
  QUERY_RAISED: 'Query raised',
  APPROVED: 'Approved',
  PARTIAL: 'Partly approved',
  REJECTED: 'Rejected',
};

export const CLAIM_LABEL: Record<TPAClaimRecord['claim_status'], string> = {
  PRE_AUTH: 'Pre-auth',
  APPROVED: 'Approved · to file',
  CLAIM_FILED: 'Filed · awaiting payment',
  SETTLED: 'Settled',
  DENIED: 'Denied',
};

export const ADMISSION_LABEL: Record<IpdAdmissionOverviewItem['status'], string> = {
  RUNNING: 'Running',
  MEDICALLY_DISCHARGED: 'Discharge started',
  AWAITING_TPA: 'Awaiting insurer',
  CLEARED: 'Cleared',
};

export const LEDGER_TYPES: [string, string][] = [
  ['OT_PROCEDURE', 'OT & procedure'],
  ['LAB_TEST', 'Lab & imaging'],
  ['PHARMACY_ISSUE', 'Pharmacy issue'],
  ['NURSING_CARE', 'Nursing care'],
  ['RESIDENT_ROUNDS', 'Doctor visit'],
  ['BED_TARIFF', 'Bed charge'],
];
