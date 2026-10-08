// Phase 6 pricing governance rules — mirror TariffGovernanceService / PackageGovernanceService on the backend.

export const CHANGE_ALERT_PERCENT = 15;
export const MIN_NOTE_LENGTH = 5;
export const MIN_JUSTIFICATION_LENGTH = 10;

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Percent change from the current price; null for a new service (no current price). */
export function changePercent(current: number, proposed: number): number | null {
  if (!current) return null;
  return round1(((proposed - current) / current) * 100);
}

export const needsCfo = (current: number, proposed: number) => {
  const pct = changePercent(current, proposed);
  return pct !== null && Math.abs(pct) > CHANGE_ALERT_PERCENT;
};

/** Colour of the "Difference" column in the spec: blue new, red above 15%, amber increase, green decrease. */
export function changeTone(current: number, proposed: number): 'new' | 'red' | 'amber' | 'green' {
  const pct = changePercent(current, proposed);
  if (pct === null) return 'new';
  if (Math.abs(pct) > CHANGE_ALERT_PERCENT) return 'red';
  return proposed > current ? 'amber' : 'green';
}

export function diffText(current: number, proposed: number, fmt: (n: number) => string): string {
  const pct = changePercent(current, proposed);
  if (pct === null) return 'New service';
  const d = proposed - current;
  return `${d >= 0 ? '+' : '−'}${fmt(Math.abs(d))} · ${pct >= 0 ? '+' : ''}${pct}%`;
}

export interface ChangeDecisionState {
  approveDisabled: boolean;
  rejectDisabled: boolean;
  revisionDisabled: boolean;
  cfoRequired: boolean;
  hint: string;
}

export function tariffDecision(
  row: { current_price: number; proposed_price: number; can_decide: boolean },
  opts: { note?: string; cfoConfirmed?: boolean }
): ChangeDecisionState {
  const noteOk = (opts.note || '').trim().length >= MIN_NOTE_LENGTH;
  const cfoRequired = needsCfo(row.current_price, row.proposed_price);
  const cfoOk = !cfoRequired || (!!opts.cfoConfirmed && noteOk);
  let hint = '';
  if (!row.can_decide) hint = 'You proposed this change or it is already decided: another admin must review it.';
  else if (!cfoOk) hint = `Change above ${CHANGE_ALERT_PERCENT}%. Confirm with the CFO and record it in the note.`;
  else if (!noteOk) hint = 'A note to the department is required to reject or request revision.';
  return {
    approveDisabled: !row.can_decide || !cfoOk,
    rejectDisabled: !row.can_decide || !noteOk,
    revisionDisabled: !row.can_decide || !noteOk,
    cfoRequired,
    hint
  };
}

// ---------- emergency markup schedules ----------
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
};

/** Window may wrap midnight (22:00–06:00); weekends apply all day when enabled; equal bounds mean all day. */
export function windowActive(from: string, to: string, at: Date, weekendActive = false): boolean {
  const day = at.getDay();
  if (weekendActive && (day === 0 || day === 6)) return true;
  const t = at.getHours() * 60 + at.getMinutes();
  const a = minutes(from);
  const b = minutes(to);
  if (a === b) return true;
  return a < b ? t >= a && t < b : t >= a || t < b;
}

export interface ScheduleLike {
  label: string;
  department: string;
  markup_percentage: number;
  applies_from_time: string;
  applies_to_time: string;
  is_weekend_active: boolean;
  is_active: boolean;
}

/** Highest active schedule for the department (or ALL) at `at`; otherwise the tariff's flat emergency markup. */
export function emergencyMarkup(schedules: ScheduleLike[], department: string, at: Date, flatPercent: number) {
  const hits = schedules.filter(
    (s) => s.is_active && (s.department === 'ALL' || s.department === department.toUpperCase()) && windowActive(s.applies_from_time, s.applies_to_time, at, s.is_weekend_active)
  );
  if (hits.length) {
    const best = hits.reduce((x, y) => (y.markup_percentage > x.markup_percentage ? y : x));
    return { percent: best.markup_percentage, source: best.label };
  }
  return { percent: flatPercent, source: flatPercent > 0 ? 'Emergency markup' : '' };
}

// ---------- packages ----------
export interface CoverageLine {
  inclusion_type: 'INCLUDED' | 'EXCLUDED';
  service_code: string;
  max_quantity_covered: number;
}

/** Split ordered quantities into package-absorbed and tariff-billed units, consuming allowances in order. */
export function simulateCoverage(lines: CoverageLine[], orders: Array<{ code: string; qty: number }>) {
  const used: Record<string, number> = {};
  return orders.map((o) => {
    const code = o.code.toUpperCase();
    const excluded = lines.some((l) => l.inclusion_type === 'EXCLUDED' && l.service_code === code);
    const inc = lines.find((l) => l.inclusion_type === 'INCLUDED' && l.service_code === code);
    if (excluded || !inc) return { code, covered: 0, billed: o.qty, excluded };
    const left = Math.max(0, inc.max_quantity_covered - (used[code] || 0));
    const covered = Math.min(left, o.qty);
    used[code] = (used[code] || 0) + covered;
    return { code, covered, billed: o.qty - covered, excluded: false };
  });
}

export function packageBlocker(pkg: { package_price: number; inclusions: unknown[]; status: string }): string {
  if (pkg.status === 'RETIRED') return 'Retired packages cannot be republished';
  if (!(pkg.package_price > 0)) return 'Set the package price';
  if (!pkg.inclusions.length) return 'Add at least one inclusion';
  return '';
}

// ---------- CSV import ----------
export function csvHeaderError(text: string): string {
  const first = (text || '').replace(/^﻿/, '').split(/\r?\n/).find((l) => l.trim());
  if (!first) return 'Paste or upload a CSV file.';
  const cols = first.split(',').map((c) => c.trim().toLowerCase());
  if (!cols.includes('code') || !cols.includes('base_price')) return 'Header must include code and base_price.';
  return '';
}

export const lineTotal = (unit: number, qty: number, gstRate: number, markupPercent = 0) => {
  const base = round2(unit * (1 + markupPercent / 100)) * qty;
  return round2(base + round2((base * gstRate) / 100));
};
