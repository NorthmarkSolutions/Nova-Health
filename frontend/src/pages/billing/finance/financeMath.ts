// Phase 11 report helpers — mirror BillingReportingService on the backend.

export type RangePreset = 'TODAY' | 'MTD' | 'LAST_MONTH' | 'FYTD' | 'CUSTOM';

export const iso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Date range for a preset, in local business dates. FY runs April–March. */
export function rangeFor(preset: Exclude<RangePreset, 'CUSTOM'>, today = new Date()): { date_from: string; date_to: string } {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (preset === 'TODAY') return { date_from: iso(t), date_to: iso(t) };
  if (preset === 'MTD') return { date_from: iso(new Date(t.getFullYear(), t.getMonth(), 1)), date_to: iso(t) };
  if (preset === 'LAST_MONTH') {
    const first = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    const last = new Date(t.getFullYear(), t.getMonth(), 0);
    return { date_from: iso(first), date_to: iso(last) };
  }
  const fy = t.getMonth() >= 3 ? t.getFullYear() : t.getFullYear() - 1;
  return { date_from: iso(new Date(fy, 3, 1)), date_to: iso(t) };
}

export const AGING_BUCKETS = ['0-30', '31-60', '61-90', '90+'] as const;

export function bucketFor(ageDays: number): (typeof AGING_BUCKETS)[number] {
  if (ageDays <= 30) return '0-30';
  if (ageDays <= 60) return '31-60';
  if (ageDays <= 90) return '61-90';
  return '90+';
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Intra-state supply: CGST is half the GST rounded to paise; SGST takes the remainder so they always sum exactly. */
export function splitGst(tax: number) {
  const cgst = round2(tax / 2);
  return { cgst, sgst: round2(tax - cgst), igst: 0 };
}

export function formatCell(value: unknown, type: 'money' | 'number' | 'text' | 'percent', fmt: (n: number) => string): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (type === 'money') return fmt(Number(value));
  if (type === 'percent') return `${Number(value)}%`;
  if (type === 'number') return Number(value).toLocaleString('en-IN');
  return String(value);
}

export function journalBalanced(rows: Array<{ debit: number; credit: number }>) {
  const debit = round2(rows.reduce((t, r) => t + r.debit, 0));
  const credit = round2(rows.reduce((t, r) => t + r.credit, 0));
  return { debit, credit, balanced: Math.abs(debit - credit) < 0.005 };
}

/** Bar widths as % of the largest value (0 when everything is zero). */
export const barWidths = (values: number[]) => {
  const max = Math.max(0, ...values);
  return values.map((v) => (max > 0 ? Math.max(0, (v / max) * 100) : 0));
};

export const shortMoney = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)}L` : `₹${Math.round(n).toLocaleString('en-IN')}`;

export const DAY_STATUS: Record<string, { label: string; tone: 'green' | 'blue' | 'amber' | 'muted' }> = {
  LOCKED: { label: 'Closed', tone: 'green' },
  REOPENED: { label: 'Reopened', tone: 'amber' },
  OPEN: { label: 'Not closed', tone: 'blue' },
  LIVE: { label: 'Today', tone: 'muted' }
};
