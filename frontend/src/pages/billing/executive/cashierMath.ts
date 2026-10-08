import type { CashierQueueRow, MultiTenderSplit, WorkspaceCharge } from '../../../services/billingService';

// Mirrors CashierWorkspaceService on the backend so previews match what the server will compute.
export const CASHIER_DISCOUNT_CEILING_PERCENT = 5;
export const SUPERVISOR_LIMIT_PERCENT = 20;
export const SUPERVISOR_LIMIT_AMOUNT = 10000;
export const INR_DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

export type TenderMode = MultiTenderSplit['tender_mode'];

export const TENDER_LABELS: Record<TenderMode, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  UPI: 'UPI',
  NET_BANKING: 'Netbanking',
  CHEQUE: 'Cheque',
  DEPOSIT_DEDUCTION: 'Advance deposit'
};

export const TENDER_COLORS: Record<TenderMode, string> = {
  CASH: '#16A34A',
  CARD: '#2563EB',
  UPI: '#7C3AED',
  NET_BANKING: '#0891B2',
  CHEQUE: '#B45309',
  DEPOSIT_DEDUCTION: '#DB2777'
};

export const round2 = (value: number): number => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const num = (value: unknown): number => {
  const n = parseFloat(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

// ---------- bill preview ----------
export interface BillPreview {
  gross: number;
  lineDiscount: number;
  discount: number;
  discountPercent: number;
  tax: number;
  net: number;
}

/** Same arithmetic as BillingCoreService.consolidate_charges_to_invoice. */
export function computeBillPreview(
  charges: Pick<WorkspaceCharge, 'unit_price' | 'quantity' | 'discount_amount' | 'tax_amount'>[],
  discountPercent = 0
): BillPreview {
  const gross = round2(charges.reduce((t, c) => t + num(c.unit_price) * num(c.quantity), 0));
  const lineDiscount = round2(charges.reduce((t, c) => t + num(c.discount_amount), 0));
  const tax = round2(charges.reduce((t, c) => t + num(c.tax_amount), 0));
  const requested = round2((gross * Math.max(0, discountPercent)) / 100);
  const discount = Math.max(requested, lineDiscount);
  const net = round2(Math.max(0, gross - discount + tax));
  return {
    gross,
    lineDiscount,
    discount,
    discountPercent: gross > 0 ? round2((discount / gross) * 100) : 0,
    tax,
    net
  };
}

/** Charge-shaped line for a tariff, same arithmetic as CashierWorkspaceService._charge_from_tariff. */
export function tariffLine(basePrice: number | string, gstRate: number | string, qty: number) {
  const unit_price = round2(num(basePrice));
  const quantity = Math.max(1, Math.floor(qty));
  const tax_amount = round2((unit_price * quantity * num(gstRate)) / 100);
  return { unit_price, quantity, discount_amount: 0, tax_amount, total_amount: round2(unit_price * quantity + tax_amount) };
}

export const isCounterAdded = (sourceReferenceId?: string | null) => (sourceReferenceId || '').startsWith('COUNTER-');

// ---------- discount guard ----------
export interface DiscountDecision {
  allowed: boolean;
  requiresApproval: boolean;
  escalatesToAdmin: boolean;
  reason: string;
}

export function evaluateDiscount(
  gross: number,
  percent: number,
  opts: { isSupervisor?: boolean; approvedPercent?: number | null } = {}
): DiscountDecision {
  const amount = round2((gross * percent) / 100);
  const escalatesToAdmin = percent > SUPERVISOR_LIMIT_PERCENT || amount > SUPERVISOR_LIMIT_AMOUNT;
  if (percent <= 0) return { allowed: true, requiresApproval: false, escalatesToAdmin: false, reason: 'No discount applied.' };
  if (percent > 100 || amount > gross) {
    return { allowed: false, requiresApproval: false, escalatesToAdmin: false, reason: 'Discount cannot exceed the bill gross amount.' };
  }
  if (percent <= CASHIER_DISCOUNT_CEILING_PERCENT) {
    return { allowed: true, requiresApproval: false, escalatesToAdmin: false, reason: `Within cashier ceiling of ${CASHIER_DISCOUNT_CEILING_PERCENT}%.` };
  }
  if (opts.isSupervisor) {
    return { allowed: true, requiresApproval: false, escalatesToAdmin, reason: 'Applied directly by billing supervisor.' };
  }
  if (opts.approvedPercent != null && percent <= opts.approvedPercent) {
    return { allowed: true, requiresApproval: false, escalatesToAdmin, reason: 'Covered by an approved supervisor request.' };
  }
  return {
    allowed: false,
    requiresApproval: true,
    escalatesToAdmin,
    reason: `Discount of ${percent}% exceeds the cashier ceiling of ${CASHIER_DISCOUNT_CEILING_PERCENT}%. Supervisor approval required.`
  };
}

export function discountLimitText(percent: number, gross: number): string {
  if (percent <= CASHIER_DISCOUNT_CEILING_PERCENT) return 'Within policy schemes — use the scheme selector instead.';
  const over = percent > SUPERVISOR_LIMIT_PERCENT || (gross * percent) / 100 > SUPERVISOR_LIMIT_AMOUNT;
  return over
    ? `Above supervisor limit (${SUPERVISOR_LIMIT_PERCENT}% or ₹${SUPERVISOR_LIMIT_AMOUNT.toLocaleString('en-IN')}) — will escalate to Billing Admin.`
    : `Within supervisor limit (${SUPERVISOR_LIMIT_PERCENT}% or ₹${SUPERVISOR_LIMIT_AMOUNT.toLocaleString('en-IN')}).`;
}

// ---------- drawer counting (Phase 4) ----------
/** Notes counted at opening and closing; coins are entered as a rupee amount. Mirrors CashDenominationTally. */
export const DRAWER_DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10] as const;
export const DRAWER_LIMIT = 50000;
export const PICKUP_THRESHOLD_PERCENT = 80;

export type DenominationInput = Partial<Record<(typeof DRAWER_DENOMINATIONS)[number] | 'coins', string>>;

export function denominationTotal(counts: DenominationInput): number {
  const notes = DRAWER_DENOMINATIONS.reduce((t, d) => t + d * Math.max(0, Math.floor(num(counts[d]))), 0);
  return round2(notes + Math.max(0, num(counts.coins)));
}

export function denominationPayload(counts: DenominationInput): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of DRAWER_DENOMINATIONS) out[String(d)] = Math.max(0, Math.floor(num(counts[d])));
  out.coins = round2(Math.max(0, num(counts.coins)));
  return out;
}

export interface TenderVariance {
  tender: 'CASH' | 'CARD' | 'UPI';
  expected: number;
  counted: number;
  variance: number;
}

/** Same rule as CounterShiftControlService.submit_closing: any non-zero tender variance is RED and needs a note. */
export function reconcileDrawer(expected: { cash: number; card: number; upi: number }, counted: { cash: number; card: number; upi: number }) {
  const rows: TenderVariance[] = (['cash', 'card', 'upi'] as const).map((k) => ({
    tender: k.toUpperCase() as TenderVariance['tender'],
    expected: round2(expected[k]),
    counted: round2(counted[k]),
    variance: round2(counted[k] - expected[k])
  }));
  const net = round2(rows.reduce((t, r) => t + r.variance, 0));
  const matched = rows.every((r) => Math.abs(r.variance) < 0.005);
  return { rows, net, matched, status: matched ? ('GREEN_MATCH' as const) : ('RED_VARIANCE' as const) };
}

export const drawerUtilization = (expectedCash: number, limit = DRAWER_LIMIT) =>
  limit > 0 ? Math.round((expectedCash / limit) * 1000) / 10 : 0;

// ---------- tender allocation ----------
export interface TenderLine {
  id: string;
  mode: TenderMode;
  amount: string;
  cashReceived?: string;
  reference?: string;
  authCode?: string;
}

export interface TenderAllocation {
  total: number;
  allocated: number;
  remaining: number;
  isBalanced: boolean;
  isOver: boolean;
  segments: Array<{ mode: TenderMode; percent: number; color: string }>;
}

export function allocateTenders(total: number, lines: Pick<TenderLine, 'mode' | 'amount'>[]): TenderAllocation {
  const due = round2(total);
  const allocated = round2(lines.reduce((t, l) => t + Math.max(0, num(l.amount)), 0));
  const remaining = round2(due - allocated);
  return {
    total: due,
    allocated,
    remaining,
    isBalanced: Math.abs(remaining) < 0.005,
    isOver: remaining < -0.004,
    segments: lines.map((l) => ({
      mode: l.mode,
      percent: Math.max(0, Math.min(100, (num(l.amount) / (due || 1)) * 100)),
      color: TENDER_COLORS[l.mode]
    }))
  };
}

// ---------- cash change assistant ----------
export interface ChangeBreakdown {
  sufficient: boolean;
  shortfall: number;
  change: number;
  roundedChange: number;
  denominations: Array<{ denomination: number; count: number; kind: 'NOTE' | 'COIN' }>;
}

/** Same rounding/denomination walk as CashierWorkspaceService.calculate_cash_change. */
export function calculateChange(amountDue: number, cashReceived: number): ChangeBreakdown {
  const due = round2(amountDue);
  const received = round2(cashReceived);
  if (received < due) {
    return { sufficient: false, shortfall: round2(due - received), change: 0, roundedChange: 0, denominations: [] };
  }
  const change = round2(received - due);
  let remaining = Math.round(change);
  const roundedChange = remaining;
  const denominations: ChangeBreakdown['denominations'] = [];
  for (const note of INR_DENOMINATIONS) {
    const count = Math.floor(remaining / note);
    remaining -= count * note;
    if (count) denominations.push({ denomination: note, count, kind: note >= 10 ? 'NOTE' : 'COIN' });
  }
  return { sufficient: true, shortfall: 0, change, roundedChange, denominations };
}

// ---------- tender reference validation ----------
export function tenderBlocker(line: TenderLine): string {
  const amount = num(line.amount);
  if (amount <= 0) return '';
  switch (line.mode) {
    case 'CASH':
      return line.cashReceived && num(line.cashReceived) < amount ? 'Cash received is less than the cash amount' : '';
    case 'CARD':
      if (!line.reference?.trim()) return 'Enter card terminal TID';
      return /^\d{6}$/.test(line.authCode || '') ? '' : 'Enter 6-digit card auth code';
    case 'UPI':
      return /^\d{12}$/.test(line.reference || '') ? '' : 'Enter 12-digit UPI UTR';
    case 'NET_BANKING':
    case 'CHEQUE':
      return line.reference?.trim() ? '' : `Enter ${line.mode === 'CHEQUE' ? 'cheque number' : 'bank reference'}`;
    default:
      return '';
  }
}

export function buildSplitPayments(lines: TenderLine[]): MultiTenderSplit[] {
  return lines
    .filter((l) => num(l.amount) > 0)
    .map((l) => {
      const split: MultiTenderSplit = { tender_mode: l.mode, amount: round2(num(l.amount)) };
      if (l.mode === 'CARD') {
        split.transaction_reference = l.reference?.trim();
        split.auth_code = l.authCode?.trim();
      } else if (l.mode === 'UPI' || l.mode === 'NET_BANKING') {
        split.transaction_reference = l.reference?.trim();
      } else if (l.mode === 'CHEQUE') {
        split.cheque_number = l.reference?.trim();
        split.transaction_reference = l.reference?.trim();
      }
      return split;
    });
}

// ---------- queue search ----------
/** Client-side search-as-you-type over the live queue: name, UHID, mobile, token or service. */
export function filterQueueRows(rows: CashierQueueRow[], query: string, department = 'ALL'): CashierQueueRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => {
    if (department !== 'ALL' && !r.sources.includes(department)) return false;
    if (!q) return true;
    return [r.patient_name, r.uhid, r.mobile, r.token, r.summary].some((v) => (v || '').toLowerCase().includes(q));
  });
}
