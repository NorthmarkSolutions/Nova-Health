// Lab Admin data store — staff, weekly roster, leave/swap requests, equipment service records,
// stock, purchase requests, price drafts and department settings.
//
// The Lab module keeps its working data in the browser (see labDataStore.ts); this store follows
// the same pattern so the admin, technician and pathologist screens read one source. Every count
// shown in the Lab Admin workspace is derived from these lists — nothing is typed into the screens.
// There is no lab-admin backend API yet; when one exists, swap the load/save functions below.
import { useEffect, useState } from 'react';
import { LabDataStore, AnalyzerItem, LabQueueOrder, CatalogTestItem, mapTestNameToCode } from './labDataStore';
import { patientJourneyService, LabTariffItem } from '../../../services/patientJourneyService';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type LabStaffCategory = 'Pathologist' | 'Technologist' | 'Phlebotomist';

export interface LabStaffMember {
  id: string;
  name: string;
  code: string;
  role: string;
  category: LabStaffCategory;
  section: string;
  qualification: string;
  licenceNumber?: string;
  credentialName: string;
  /** ISO date the licence / competency / BLS certificate expires. */
  credentialExpiry?: string;
  nablTrained: boolean;
  phone?: string;
  email?: string;
  bench?: string;
  joinedOn?: string;
  suspended?: boolean;
}

/** M 07–15 · D 08–16 · E 15–23 · N 23–07 · OC on call · L leave · O off */
export type ShiftCode = 'M' | 'D' | 'E' | 'N' | 'OC' | 'L' | 'O';

export const SHIFT_INFO: Record<ShiftCode, { label: string; hours: string; start?: number; end?: number; working: boolean }> = {
  M: { label: 'Morning', hours: '07–15', start: 7, end: 15, working: true },
  D: { label: 'Day', hours: '08–16', start: 8, end: 16, working: true },
  E: { label: 'Evening', hours: '15–23', start: 15, end: 23, working: true },
  N: { label: 'Night', hours: '23–07', start: 23, end: 7, working: true },
  OC: { label: 'On call', hours: '24 h', working: false },
  L: { label: 'Leave', hours: '', working: false },
  O: { label: 'Off', hours: '', working: false },
};

export interface LabRoster {
  /** ISO date of the Monday this roster covers. */
  weekStart: string;
  cells: Record<string, ShiftCode[]>;
  published: boolean;
  publishedAt?: string;
  editedAt?: string;
}

export interface LabStaffRequest {
  id: string;
  staffId: string;
  type: 'Leave' | 'Shift swap';
  /** Day indexes (0 = Monday) in the current roster week. */
  days: number[];
  reason: string;
  /** Shift swap partner. */
  withStaffId?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  raisedAt: string;
  decidedAt?: string;
}

export interface LabEquipmentMeta {
  lastPm: string;
  nextPm: string;
  contract: string;
  contractEnds?: string;
  log: { at: string; text: string; by: string }[];
}

export interface LabStockItem {
  id: string;
  name: string;
  category: 'Reagent' | 'Consumable' | 'Calibrator';
  unit: string;
  onHand: number;
  reorderAt: number;
  maxLevel: number;
  expiry?: string;
  lot?: string;
  supplier?: string;
}

export interface LabPurchaseRequest {
  id: string;
  code: string;
  stockId?: string;
  item: string;
  qty: number;
  unit: string;
  estCost: number;
  status: 'Awaiting approval' | 'Awaiting Finance' | 'Ordered' | 'Delivered' | 'Rejected';
  raisedAt: string;
  raisedBy: string;
  decidedAt?: string;
}

export interface LabPriceDraft {
  testName: string;
  code: string;
  basePrice: number;
  tpaPrice: number;
  statSurcharge: string;
  effectiveDate: string;
  savedAt: string;
}

export interface LabSettings {
  deptName: string;
  location: string;
  hod: string;
  intercom: string;
  nablNo: string;
  nablValidTo: string;
  hours: { opd: boolean; sunday: boolean; stat: boolean; home: boolean };
  batchSignoff: boolean;
  autoFlag: boolean;
  retestRoute: 'technician_queue' | 'technician_only' | 'general_queue';
  criticalAckWindow: string;
  escalateTo: string;
  barcodeFormat: string;
  rejectionReasons: string;
  notifyCriticalInApp: boolean;
  notifyCriticalSms: boolean;
  notifyIpdNurse: boolean;
  notifyDoctorAssistant: boolean;
  reportReadySms: boolean;
  reportTemplate: string;
  digitalSignature: string;
  showPreviousResult: string;
  labelPrinter: string;
  savedAt?: string;
  savedBy?: string;
}

export interface LabAdminEvent {
  at: string;
  by: string;
  text: string;
  area: 'staff' | 'roster' | 'equipment' | 'stock' | 'pricing' | 'settings';
}

export interface LabAdminState {
  staff: LabStaffMember[];
  roster: LabRoster;
  requests: LabStaffRequest[];
  equipment: Record<string, LabEquipmentMeta>;
  stock: LabStockItem[];
  purchases: LabPurchaseRequest[];
  priceDrafts: Record<string, LabPriceDraft>;
  settings: LabSettings;
  events: LabAdminEvent[];
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const addDays = (iso: string, n: number) => {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
};
export const mondayOf = (d: Date) => {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - dow);
  return isoDate(c);
};
export const daysUntil = (iso?: string) => {
  if (!iso) return null;
  const today = parseIso(isoDate(new Date()));
  return Math.round((parseIso(iso).getTime() - today.getTime()) / 86400000);
};
export const fmtDate = (iso?: string) =>
  iso ? parseIso(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtShort = (iso?: string) => (iso ? parseIso(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—');
export const fmtStamp = (stamp?: string) => {
  if (!stamp) return '—';
  const d = new Date(stamp);
  if (Number.isNaN(d.getTime())) return stamp;
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};
export const todayIndex = () => (new Date().getDay() + 6) % 7;
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/* ------------------------------------------------------------------ */
/* Seed data (first run only — then everything is edited in the app)  */
/* ------------------------------------------------------------------ */

const SEED_STAFF: LabStaffMember[] = [
  { id: 'ls-0102', name: 'Dr. Kavitha Menon', code: 'EMP-L-0102', role: 'Consultant Pathologist', category: 'Pathologist', section: 'All sections', qualification: 'MD Pathology', licenceNumber: 'MCI-2009-44821', credentialName: 'Medical Council registration', credentialExpiry: '2029-03-31', nablTrained: true, email: 'kavitha.menon@northhospital.com' },
  { id: 'ls-0107', name: 'Dr. Sanjay Rao', code: 'EMP-L-0107', role: 'Hematopathologist', category: 'Pathologist', section: 'Hematology', qualification: 'MD Pathology', licenceNumber: 'MCI-2012-50733', credentialName: 'Medical Council registration', credentialExpiry: '2028-01-31', nablTrained: true },
  { id: 'ls-0214', name: 'Anjali Verma', code: 'EMP-L-0214', role: 'Sr. Lab Technologist', category: 'Technologist', section: 'Hematology & Chemistry', qualification: 'DMLT', credentialName: 'Bench competency assessment', credentialExpiry: '2027-04-30', nablTrained: true, bench: 'Bench 2' },
  { id: 'ls-0221', name: 'Vikram Rao', code: 'EMP-L-0221', role: 'Lab Technologist', category: 'Technologist', section: 'Chemistry', qualification: 'BMLT', credentialName: 'Chemistry competency assessment', credentialExpiry: '2026-10-12', nablTrained: false, bench: 'Bench 3' },
  { id: 'ls-0230', name: 'Pooja Sharma', code: 'EMP-L-0230', role: 'Lab Technologist', category: 'Technologist', section: 'Immunoassay', qualification: 'BMLT', credentialName: 'Immunoassay competency assessment', credentialExpiry: '2027-06-30', nablTrained: true },
  { id: 'ls-0233', name: 'Imran Shaikh', code: 'EMP-L-0233', role: 'Lab Technologist', category: 'Technologist', section: 'Blood gas / ER', qualification: 'BMLT', credentialName: 'Blood gas competency assessment', credentialExpiry: '2027-02-28', nablTrained: false },
  { id: 'ls-0312', name: 'Ritu Das', code: 'EMP-L-0312', role: 'Lab Technologist', category: 'Technologist', section: 'Hematology', qualification: 'DMLT', credentialName: 'Hematology competency assessment', credentialExpiry: '2027-01-31', nablTrained: true },
  { id: 'ls-0301', name: 'Neha Pillai', code: 'EMP-L-0301', role: 'Phlebotomist', category: 'Phlebotomist', section: 'OPD collection', qualification: 'Certificate in Phlebotomy', credentialName: 'BLS certification', credentialExpiry: '2027-02-28', nablTrained: true },
  { id: 'ls-0305', name: 'Arjun Kapoor', code: 'EMP-L-0305', role: 'Phlebotomist', category: 'Phlebotomist', section: 'Ward rounds', qualification: 'Certificate in Phlebotomy', credentialName: 'BLS certification', credentialExpiry: '2026-10-18', nablTrained: false },
];

const SEED_CELLS: Record<string, ShiftCode[]> = {
  'ls-0102': ['D', 'D', 'D', 'D', 'D', 'O', 'OC'],
  'ls-0107': ['OC', 'OC', 'O', 'O', 'D', 'D', 'D'],
  'ls-0214': ['M', 'M', 'M', 'M', 'M', 'O', 'O'],
  'ls-0221': ['M', 'M', 'M', 'L', 'L', 'O', 'M'],
  'ls-0230': ['E', 'E', 'E', 'E', 'M', 'O', 'E'],
  'ls-0233': ['N', 'N', 'N', 'E', 'N', 'O', 'O'],
  'ls-0312': ['L', 'L', 'L', 'L', 'O', 'M', 'M'],
  'ls-0301': ['M', 'M', 'M', 'M', 'M', 'M', 'O'],
  'ls-0305': ['M', 'M', 'O', 'M', 'M', 'E', 'E'],
};

const SEED_EQUIPMENT: Record<string, LabEquipmentMeta> = {
  'an-xn1000': { lastPm: '2026-08-12', nextPm: '2026-11-12', contract: 'Sysmex India · AMC', contractEnds: '2027-03-31', log: [] },
  'an-au680': { lastPm: '2026-09-02', nextPm: '2026-12-02', contract: 'Beckman Coulter · AMC', contractEnds: '2027-06-30', log: [] },
  'an-d10': { lastPm: '2026-06-20', nextPm: '2026-12-20', contract: 'Bio-Rad · CMC', contractEnds: '2027-01-31', log: [] },
  'an-abl800': { lastPm: '2026-10-11', nextPm: '2026-12-30', contract: 'Radiometer · CMC', contractEnds: '2027-05-31', log: [] },
  'an-e411': { lastPm: '2026-07-18', nextPm: '2026-10-18', contract: 'Roche · AMC', contractEnds: '2026-10-31', log: [] },
  'an-ca600': { lastPm: '2026-09-05', nextPm: '2026-12-05', contract: 'Sysmex India · AMC', contractEnds: '2027-03-31', log: [] },
  'an-chem7': { lastPm: '2026-03-10', nextPm: '2026-10-10', contract: 'Transasia · warranty', contractEnds: '2027-03-10', log: [] },
};

const SEED_STOCK: LabStockItem[] = [
  { id: 'stk-chem7', name: 'Erba Chem-7 reagent pack', category: 'Reagent', unit: 'packs', onHand: 3, reorderAt: 4, maxLevel: 20, expiry: '2026-11-14', lot: 'ER-7731', supplier: 'Transasia' },
  { id: 'stk-trop', name: 'Troponin I reagent kit', category: 'Reagent', unit: 'tests', onHand: 11, reorderAt: 50, maxLevel: 400, expiry: '2026-12-02', lot: 'RC-TNI-118', supplier: 'Roche Diagnostics' },
  { id: 'stk-sst', name: 'SST gold-top tubes', category: 'Consumable', unit: 'tubes', onHand: 140, reorderAt: 200, maxLevel: 2000, supplier: 'BD India' },
  { id: 'stk-cellpack', name: 'CBC diluent (Cellpack)', category: 'Reagent', unit: 'L', onHand: 6, reorderAt: 4, maxLevel: 40, expiry: '2026-10-20', lot: 'SX-CP-2209', supplier: 'Sysmex India' },
  { id: 'stk-edta', name: 'EDTA lavender tubes', category: 'Consumable', unit: 'tubes', onHand: 1850, reorderAt: 500, maxLevel: 5000, supplier: 'BD India' },
  { id: 'stk-a1ccal', name: 'HbA1c calibrator set', category: 'Calibrator', unit: 'sets', onHand: 2, reorderAt: 1, maxLevel: 6, expiry: '2026-10-08', lot: 'BR-A1C-77', supplier: 'Bio-Rad' },
];

const SEED_PURCHASES: LabPurchaseRequest[] = [
  { id: 'lpr-014', code: 'PR-LAB-014', stockId: 'stk-trop', item: 'Troponin I reagent kit', qty: 400, unit: 'tests', estCost: 64000, status: 'Awaiting Finance', raisedAt: '2026-10-09T10:20:00', raisedBy: 'Lab Admin' },
  { id: 'lpr-011', code: 'PR-LAB-011', stockId: 'stk-edta', item: 'EDTA lavender tubes', qty: 5000, unit: 'tubes', estCost: 18500, status: 'Delivered', raisedAt: '2026-09-20T09:05:00', raisedBy: 'Lab Admin', decidedAt: '2026-09-24T15:40:00' },
  { id: 'lpr-009', code: 'PR-LAB-009', stockId: 'stk-cellpack', item: 'CBC diluent (Cellpack)', qty: 20, unit: 'L', estCost: 26000, status: 'Ordered', raisedAt: '2026-10-06T11:30:00', raisedBy: 'Lab Admin', decidedAt: '2026-10-07T09:10:00' },
];

const DEFAULT_SETTINGS: LabSettings = {
  deptName: 'Diagnostic Lab',
  location: 'Ground floor · Block C',
  hod: 'Dr. Kavitha Menon',
  intercom: '2140',
  nablNo: 'MC-4418',
  nablValidTo: '2027-08-31',
  hours: { opd: true, sunday: true, stat: true, home: true },
  batchSignoff: true,
  autoFlag: true,
  retestRoute: 'technician_queue',
  criticalAckWindow: '15 minutes',
  escalateTo: 'Department HOD, then Medical Superintendent',
  barcodeFormat: 'LAB-YYMM-#### · Code 128',
  rejectionReasons: 'Haemolysed, clotted, QNS, mislabelled',
  notifyCriticalInApp: true,
  notifyCriticalSms: true,
  notifyIpdNurse: true,
  notifyDoctorAssistant: true,
  reportReadySms: false,
  reportTemplate: 'NABL standard · A4',
  digitalSignature: 'Signing pathologist + HOD',
  showPreviousResult: 'Last 1 result with date',
  labelPrinter: 'Zebra ZD421 · Bench 2',
};

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'nh_lab_admin_v1';
export const LAB_ADMIN_SYNC_EVENT = 'nh_lab_admin_sync';

const seedState = (): LabAdminState => {
  const weekStart = mondayOf(new Date());
  return {
    staff: SEED_STAFF,
    roster: { weekStart, cells: SEED_CELLS, published: false },
    requests: [
      { id: 'lr-1', staffId: 'ls-0221', type: 'Leave', days: [5, 6], reason: 'Personal · cover requested from Pooja Sharma', status: 'Pending', raisedAt: '2026-10-09T08:40:00' },
      { id: 'lr-2', staffId: 'ls-0233', type: 'Shift swap', days: [3], withStaffId: 'ls-0230', reason: 'Night ↔ Evening swap · both agreed', status: 'Pending', raisedAt: '2026-10-10T17:15:00' },
    ],
    equipment: SEED_EQUIPMENT,
    stock: SEED_STOCK,
    purchases: SEED_PURCHASES,
    priceDrafts: {},
    settings: DEFAULT_SETTINGS,
    events: [],
  };
};

let cache: LabAdminState | null = null;

const load = (): LabAdminState => {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LabAdminState;
      cache = { ...seedState(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) } };
      return cache;
    }
  } catch {
    /* fall through to seed */
  }
  cache = seedState();
  persist(cache);
  return cache;
};

const persist = (state: LabAdminState) => {
  cache = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked — keep the in-memory copy */
  }
  window.dispatchEvent(new Event(LAB_ADMIN_SYNC_EVENT));
};

const update = (fn: (s: LabAdminState) => LabAdminState) => persist(fn(load()));

const logEvent = (s: LabAdminState, area: LabAdminEvent['area'], text: string, by: string): LabAdminState => ({
  ...s,
  events: [{ at: new Date().toISOString(), by, text, area }, ...s.events].slice(0, 200),
});

/* ------------------------------------------------------------------ */
/* Derived helpers                                                     */
/* ------------------------------------------------------------------ */

export type LabStaffStatus = 'On duty' | 'Rostered' | 'On call' | 'Off today' | 'On leave' | 'Suspended';

export const shiftToday = (state: LabAdminState, staffId: string): ShiftCode => state.roster.cells[staffId]?.[todayIndex()] ?? 'O';

export const staffStatusNow = (state: LabAdminState, staff: LabStaffMember, now = new Date()): LabStaffStatus => {
  if (staff.suspended) return 'Suspended';
  const code = shiftToday(state, staff.id);
  if (code === 'L') return 'On leave';
  if (code === 'O') return 'Off today';
  if (code === 'OC') return 'On call';
  const info = SHIFT_INFO[code];
  const h = now.getHours();
  const within = info.start! < info.end! ? h >= info.start! && h < info.end! : h >= info.start! || h < info.end!;
  return within ? 'On duty' : 'Rostered';
};

export const credentialState = (s: LabStaffMember): 'expired' | 'expiring' | 'valid' | 'none' => {
  const d = daysUntil(s.credentialExpiry);
  if (d === null) return 'none';
  if (d < 0) return 'expired';
  if (d <= 30) return 'expiring';
  return 'valid';
};

export const weeklyHours = (cells: ShiftCode[] = []) => cells.filter((c) => SHIFT_INFO[c].working).length * 8;

export const consecutiveWorkDays = (cells: ShiftCode[] = []) => {
  let best = 0;
  let run = 0;
  cells.forEach((c) => {
    run = SHIFT_INFO[c].working ? run + 1 : 0;
    best = Math.max(best, run);
  });
  return best;
};

/** Coverage rules checked against the roster: one entry per (rule, day) that is short. */
export interface RosterGap {
  key: string;
  day: number;
  shift: ShiftCode;
  category: LabStaffCategory;
  rule: string;
  needed: number;
  have: number;
}

export const COVERAGE_RULES: { id: string; label: string; category: LabStaffCategory; shifts: ShiftCode[]; min: number }[] = [
  { id: 'path', label: 'Pathologist on duty or on call every day', category: 'Pathologist', shifts: ['D', 'OC'], min: 1 },
  { id: 'tech-m', label: 'Min. 2 technologists on the morning shift', category: 'Technologist', shifts: ['M'], min: 2 },
  { id: 'tech-e', label: 'Min. 1 technologist on the evening shift', category: 'Technologist', shifts: ['E'], min: 1 },
  { id: 'tech-n', label: 'Min. 1 technologist on the night shift', category: 'Technologist', shifts: ['N'], min: 1 },
  { id: 'phleb', label: '1 phlebotomist for the morning ward round', category: 'Phlebotomist', shifts: ['M'], min: 1 },
];

export const MAX_CONSECUTIVE_DAYS = 6;

export const rosterGaps = (state: LabAdminState): RosterGap[] => {
  const gaps: RosterGap[] = [];
  const active = state.staff.filter((s) => !s.suspended);
  COVERAGE_RULES.forEach((rule) => {
    for (let day = 0; day < 7; day++) {
      const have = active.filter((s) => s.category === rule.category && rule.shifts.includes(state.roster.cells[s.id]?.[day] ?? 'O')).length;
      if (have < rule.min) {
        gaps.push({ key: `${rule.id}-${day}`, day, shift: rule.shifts[0], category: rule.category, rule: rule.label, needed: rule.min, have });
      }
    }
  });
  return gaps;
};

/** Staff who could fill a gap: same category, off that day, fewest hours first, not over the consecutive-day limit. */
export const gapCandidates = (state: LabAdminState, gap: RosterGap) =>
  state.staff
    .filter((s) => !s.suspended && s.category === gap.category && (state.roster.cells[s.id]?.[gap.day] ?? 'O') === 'O')
    .map((s) => {
      const cells = [...(state.roster.cells[s.id] || Array(7).fill('O'))] as ShiftCode[];
      cells[gap.day] = gap.shift;
      return { staff: s, hours: weeklyHours(state.roster.cells[s.id]), runAfter: consecutiveWorkDays(cells) };
    })
    .filter((c) => c.runAfter <= MAX_CONSECUTIVE_DAYS)
    .sort((a, b) => a.hours - b.hours);

export const stockState = (i: LabStockItem): { label: 'Below reorder' | 'Expired' | 'Expiring soon' | 'In stock'; tone: 'red' | 'amber' | 'green' } => {
  const d = daysUntil(i.expiry);
  if (d !== null && d < 0) return { label: 'Expired', tone: 'red' };
  if (i.onHand <= i.reorderAt) return { label: 'Below reorder', tone: 'red' };
  if (d !== null && d <= 30) return { label: 'Expiring soon', tone: 'amber' };
  return { label: 'In stock', tone: 'green' };
};

export const pmState = (m?: LabEquipmentMeta): 'overdue' | 'due' | 'ok' | 'unknown' => {
  const d = daysUntil(m?.nextPm);
  if (d === null) return 'unknown';
  if (d < 0) return 'overdue';
  if (d <= 14) return 'due';
  return 'ok';
};

/* Orders: times are stored as "HH:MM" for today */
export const minutesOf = (hhmm?: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export const tatMinutes = (o: LabQueueOrder) => {
  const a = minutesOf(o.orderedAt);
  const b = minutesOf(o.signedOffAt);
  return a !== null && b !== null && b >= a ? b - a : null;
};

export const parseTatTarget = (t?: string) => {
  const m = /([\d.]+)\s*(h|m)/i.exec(t || '');
  if (!m) return null;
  return m[2].toLowerCase() === 'h' ? Number(m[1]) * 60 : Number(m[1]);
};

export const fmtMinutes = (mins: number | null) => {
  if (mins === null) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

export const STAGE_ORDER: LabQueueOrder['stage'][] = ['ORDERED', 'COLLECTED', 'RECEIVED', 'ACCESSIONED', 'PROCESSING', 'RESULT_ENTERED', 'PENDING_REVIEW', 'SIGNED_OFF'];

export const STAGE_LABEL: Record<LabQueueOrder['stage'], string> = {
  ORDERED: 'Awaiting collection',
  COLLECTED: 'Sample collected',
  RECEIVED: 'Received in lab',
  ACCESSIONED: 'Accessioned',
  PROCESSING: 'On analyzer',
  RESULT_ENTERED: 'Results entered',
  PENDING_REVIEW: 'Pathologist review',
  SIGNED_OFF: 'Signed & released',
};

export const stageGroup = (stage: LabQueueOrder['stage']): 'collection' | 'inlab' | 'review' | 'released' =>
  stage === 'ORDERED' ? 'collection' : stage === 'SIGNED_OFF' ? 'released' : stage === 'RESULT_ENTERED' || stage === 'PENDING_REVIEW' ? 'review' : 'inlab';

/* Pricing: billing tariff master is the source of truth; drafts wait until synced */
export interface LabPriceRow {
  key: string;
  testName: string;
  code: string;
  section: string;
  sampleType?: string;
  tatTarget?: string;
  catalogCode?: string;
  tariff?: LabTariffItem;
  draft?: LabPriceDraft;
  status: 'Synced' | 'Pending sync' | 'No price';
}

const isLabTariff = (t: LabTariffItem) => !(t.code || '').toUpperCase().startsWith('RAD');

export const buildPriceRows = (state: LabAdminState, catalog: CatalogTestItem[], tariffs: Record<string, LabTariffItem>): LabPriceRow[] => {
  const rows: LabPriceRow[] = [];
  const coveredCatalog = new Set<string>();
  Object.values(tariffs)
    .filter(isLabTariff)
    .forEach((t) => {
      const catalogCode = mapTestNameToCode(t.testName);
      const cat = catalog.find((c) => c.code === catalogCode);
      if (cat) coveredCatalog.add(cat.code);
      const draft = state.priceDrafts[t.testName];
      rows.push({
        key: t.testName,
        testName: t.testName,
        code: t.code || catalogCode,
        section: cat?.section || (t.code?.startsWith('HEM') ? 'Hematology' : t.code?.startsWith('IMM') ? 'Immunoassay' : 'Biochemistry'),
        sampleType: cat?.sampleType,
        tatTarget: cat?.tatTarget,
        catalogCode: cat?.code,
        tariff: t,
        draft,
        status: draft ? 'Pending sync' : 'Synced',
      });
    });
  catalog
    .filter((c) => !coveredCatalog.has(c.code) && c.status !== 'Inactive')
    .forEach((c) => {
      const draft = state.priceDrafts[c.name];
      rows.push({
        key: c.name,
        testName: c.name,
        code: c.code,
        section: c.section,
        sampleType: c.sampleType,
        tatTarget: c.tatTarget,
        catalogCode: c.code,
        draft,
        status: draft ? 'Pending sync' : 'No price',
      });
    });
  return rows;
};

/* ------------------------------------------------------------------ */
/* Snapshot hook                                                       */
/* ------------------------------------------------------------------ */

export interface LabAdminSnapshot {
  state: LabAdminState;
  orders: LabQueueOrder[];
  analyzers: AnalyzerItem[];
  catalog: CatalogTestItem[];
  tariffs: Record<string, LabTariffItem>;
}

const readSnapshot = (): LabAdminSnapshot => ({
  state: load(),
  orders: LabDataStore.getOrders(),
  analyzers: LabDataStore.getAnalyzers(),
  catalog: LabDataStore.getCatalog(),
  tariffs: patientJourneyService.getLabTariffs(),
});

/** Live view of every Lab Admin data source; refreshes on any lab, admin or billing change. */
export const useLabAdminData = (): LabAdminSnapshot => {
  const [snap, setSnap] = useState<LabAdminSnapshot>(readSnapshot);
  useEffect(() => {
    const refresh = () => setSnap(readSnapshot());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) cache = null;
      refresh();
    };
    const events = [LAB_ADMIN_SYNC_EVENT, 'nh_lab_sync', 'nh_data_sync'];
    events.forEach((ev) => window.addEventListener(ev, refresh));
    window.addEventListener('storage', onStorage);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, refresh));
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return snap;
};

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export const LabAdminStore = {
  get: load,

  addStaff(member: Omit<LabStaffMember, 'id'>, defaultShift: ShiftCode, by: string) {
    const id = `ls-${Date.now()}`;
    update((s) =>
      logEvent(
        {
          ...s,
          staff: [{ ...member, id }, ...s.staff],
          roster: { ...s.roster, cells: { ...s.roster.cells, [id]: DAY_NAMES.map((_, i) => (i < 5 ? defaultShift : 'O')) as ShiftCode[] } },
        },
        'staff',
        `Added ${member.name} (${member.role})`,
        by
      )
    );
    return id;
  },

  updateStaff(id: string, patch: Partial<LabStaffMember>, by: string) {
    update((s) => {
      const target = s.staff.find((m) => m.id === id);
      return logEvent({ ...s, staff: s.staff.map((m) => (m.id === id ? { ...m, ...patch } : m)) }, 'staff', `Updated ${target?.name || id}`, by);
    });
  },

  setShift(staffId: string, day: number, code: ShiftCode, by: string) {
    update((s) => {
      const cells = [...(s.roster.cells[staffId] || (Array(7).fill('O') as ShiftCode[]))];
      cells[day] = code;
      const name = s.staff.find((m) => m.id === staffId)?.name || staffId;
      return logEvent(
        { ...s, roster: { ...s.roster, cells: { ...s.roster.cells, [staffId]: cells }, published: false, editedAt: new Date().toISOString() } },
        'roster',
        `${name} · ${DAY_NAMES[day]} set to ${SHIFT_INFO[code].label}`,
        by
      );
    });
  },

  publishRoster(by: string) {
    update((s) => logEvent({ ...s, roster: { ...s.roster, published: true, publishedAt: new Date().toISOString() } }, 'roster', 'Published the weekly roster', by));
  },

  copyPreviousWeekPattern(by: string) {
    // The roster keeps one week; "start next week" carries the same pattern forward as a new draft.
    update((s) =>
      logEvent(
        { ...s, roster: { ...s.roster, weekStart: addDays(s.roster.weekStart, 7), published: false, publishedAt: undefined, editedAt: new Date().toISOString() } },
        'roster',
        'Started next week from this week’s pattern',
        by
      )
    );
  },

  decideRequest(id: string, approve: boolean, by: string) {
    update((s) => {
      const req = s.requests.find((r) => r.id === id);
      if (!req || req.status !== 'Pending') return s;
      let cells = s.roster.cells;
      if (approve) {
        cells = { ...cells };
        if (req.type === 'Leave') {
          const row = [...(cells[req.staffId] || (Array(7).fill('O') as ShiftCode[]))];
          req.days.forEach((d) => (row[d] = 'L'));
          cells[req.staffId] = row;
        } else if (req.withStaffId) {
          const a = [...(cells[req.staffId] || (Array(7).fill('O') as ShiftCode[]))];
          const b = [...(cells[req.withStaffId] || (Array(7).fill('O') as ShiftCode[]))];
          req.days.forEach((d) => {
            const t = a[d];
            a[d] = b[d];
            b[d] = t;
          });
          cells[req.staffId] = a;
          cells[req.withStaffId] = b;
        }
      }
      const name = s.staff.find((m) => m.id === req.staffId)?.name || req.staffId;
      return logEvent(
        {
          ...s,
          roster: approve ? { ...s.roster, cells, published: false, editedAt: new Date().toISOString() } : s.roster,
          requests: s.requests.map((r) => (r.id === id ? { ...r, status: approve ? 'Approved' : 'Rejected', decidedAt: new Date().toISOString() } : r)),
        },
        'staff',
        `${approve ? 'Approved' : 'Rejected'} ${req.type.toLowerCase()} for ${name}`,
        by
      );
    });
  },

  logMaintenance(analyzerId: string, text: string, kind: 'pm' | 'calibration' | 'ticket', by: string) {
    update((s) => {
      const meta = s.equipment[analyzerId] || { lastPm: '', nextPm: '', contract: '', log: [] };
      const today = isoDate(new Date());
      const next: LabEquipmentMeta = {
        ...meta,
        lastPm: kind === 'pm' ? today : meta.lastPm,
        nextPm: kind === 'pm' ? addDays(today, 90) : meta.nextPm,
        log: [{ at: new Date().toISOString(), text, by }, ...meta.log].slice(0, 50),
      };
      return logEvent({ ...s, equipment: { ...s.equipment, [analyzerId]: next } }, 'equipment', text, by);
    });
  },

  addAnalyzer(input: { name: string; serial: string; section: string; contract: string; testsCovered: string }, by: string) {
    const id = `an-${Date.now()}`;
    const analyzers = LabDataStore.getAnalyzers();
    LabDataStore.saveAnalyzers([
      ...analyzers,
      { id, name: input.name, serial: input.serial, section: input.section, status: 'Ready', queuedCount: 0, lastQc: 'Not run', isQcDue: true, reagentPercent: 100, testsCovered: input.testsCovered },
    ]);
    const today = isoDate(new Date());
    update((s) =>
      logEvent(
        { ...s, equipment: { ...s.equipment, [id]: { lastPm: today, nextPm: addDays(today, 90), contract: input.contract || 'Warranty', log: [{ at: new Date().toISOString(), text: 'Installed and registered', by }] } } },
        'equipment',
        `Registered analyzer ${input.name} (${input.serial})`,
        by
      )
    );
    return id;
  },

  addStockItem(item: LabStockItem, by: string) {
    update((s) => logEvent({ ...s, stock: [item, ...s.stock] }, 'stock', `Added stock item ${item.name}`, by));
  },

  raisePurchase(input: { stockId?: string; item: string; qty: number; unit: string; estCost: number }, by: string) {
    const s0 = load();
    const nextNo = s0.purchases.reduce((mx, p) => Math.max(mx, Number(/(\d+)$/.exec(p.code)?.[1] || 0)), 0) + 1;
    const code = `PR-LAB-${String(nextNo).padStart(3, '0')}`;
    update((s) =>
      logEvent(
        {
          ...s,
          purchases: [
            { id: `lpr-${Date.now()}`, code, ...input, status: input.estCost > 50000 ? 'Awaiting Finance' : 'Awaiting approval', raisedAt: new Date().toISOString(), raisedBy: by },
            ...s.purchases,
          ],
        },
        'stock',
        `Raised ${code} · ${input.item} × ${input.qty} ${input.unit}`,
        by
      )
    );
    return code;
  },

  setPurchaseStatus(id: string, status: LabPurchaseRequest['status'], by: string) {
    update((s) => {
      const pr = s.purchases.find((p) => p.id === id);
      if (!pr) return s;
      let stock = s.stock;
      if (status === 'Delivered' && pr.stockId) {
        stock = s.stock.map((i) => (i.id === pr.stockId ? { ...i, onHand: i.onHand + pr.qty } : i));
      }
      return logEvent(
        { ...s, stock, purchases: s.purchases.map((p) => (p.id === id ? { ...p, status, decidedAt: new Date().toISOString() } : p)) },
        'stock',
        `${pr.code} marked ${status.toLowerCase()}`,
        by
      );
    });
  },

  savePriceDraft(draft: Omit<LabPriceDraft, 'savedAt'>, by: string) {
    update((s) =>
      logEvent({ ...s, priceDrafts: { ...s.priceDrafts, [draft.testName]: { ...draft, savedAt: new Date().toISOString() } } }, 'pricing', `Saved draft price for ${draft.testName}`, by)
    );
  },

  discardPriceDraft(testName: string, by: string) {
    update((s) => {
      const next = { ...s.priceDrafts };
      delete next[testName];
      return logEvent({ ...s, priceDrafts: next }, 'pricing', `Discarded draft price for ${testName}`, by);
    });
  },

  /** Push drafts to the Billing tariff master (the price doctors and billing actually charge). */
  syncPrices(testNames: string[], by: string) {
    const s0 = load();
    const tariffs: Record<string, LabTariffItem> = {};
    testNames.forEach((n) => {
      const d = s0.priceDrafts[n];
      if (d) tariffs[n] = { testName: d.testName, code: d.code, basePrice: d.basePrice, tpaPrice: d.tpaPrice, statSurcharge: d.statSurcharge, effectiveDate: d.effectiveDate };
    });
    if (!Object.keys(tariffs).length) return 0;
    patientJourneyService.syncAllLabTariffs(tariffs);
    update((s) => {
      const next = { ...s.priceDrafts };
      Object.keys(tariffs).forEach((n) => delete next[n]);
      return logEvent({ ...s, priceDrafts: next }, 'pricing', `Synced ${Object.keys(tariffs).length} price${Object.keys(tariffs).length === 1 ? '' : 's'} to the Billing tariff master`, by);
    });
    return Object.keys(tariffs).length;
  },

  saveSettings(settings: LabSettings, by: string) {
    update((s) => logEvent({ ...s, settings: { ...settings, savedAt: new Date().toISOString(), savedBy: by } }, 'settings', 'Updated department settings', by));
  },

  defaultSettings: () => DEFAULT_SETTINGS,
};
