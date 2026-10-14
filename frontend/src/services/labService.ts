// Lab API service (Phase 1). With a real login (JWT from the backend) every lab order, result and
// report lives on the server, so doctors, nurses, the lab and Billing see the same data on every
// computer. With the offline demo login ("local-…" token) the screens keep using browser storage.
//
// The screens are synchronous, so this keeps the latest server data in memory, refreshes it every
// 20 s and after each change, and applies each change on screen straight away while the request
// runs. If the server refuses a change, the data is reloaded and the reason is broadcast as
// `nh_lab_api_error` for the open workspace to show.
import api from './api';
import type { LabQueueOrder, SignedReportItem, SpecimenStep, TestParameterResult, AuditTrailItem, CatalogTestItem, CatalogRangeItem, AnalyzerItem } from '../pages/lab/data/labDataStore';
import { getDefaultParametersForTest, mapWorkbenchStageToShared } from '../pages/lab/data/labDataStore';
import type { SharedLabOrder, LabTariffItem } from './patientJourneyService';
import type { LabAdminState } from '../pages/lab/data/labAdminStore';

/** Live Billing price per test name, and price changes waiting for Billing approval. */
export interface LabPricingSnapshot {
  tariffs: Record<string, LabTariffItem & { active?: boolean }>;
  pending: Record<string, { requestNumber: string; code: string; proposedPrice: number; currentPrice: number; effectiveFrom: string; status: string; statusLabel: string }>;
}

export interface LabStaffCandidate {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  role: string;
  roleLabel: string;
}

/* ------------------------------------------------------------------ */
/* API shapes                                                          */
/* ------------------------------------------------------------------ */

type ApiStatus = 'ORDERED' | 'SAMPLE_COLLECTED' | 'SAMPLE_RECEIVED' | 'IN_ANALYSIS' | 'RESULTS_ENTERED' | 'REPORT_APPROVED' | 'CANCELLED';

interface ApiSchemaParam {
  name: string;
  unit?: string;
  group?: string;
  low?: number | null;
  high?: number | null;
  criticalLow?: number | null;
  criticalHigh?: number | null;
}

interface ApiResult {
  paramName: string;
  group: string;
  unit: string;
  low: number | null;
  high: number | null;
  criticalLow: number | null;
  criticalHigh: number | null;
  observedValue: string;
  flag: string;
  isAbnormal: boolean;
  previousValue: string | null;
}

interface ApiReportSummary {
  id: string;
  reportNumber: string | null;
  signedByName: string | null;
  approvedAt: string | null;
  remarks: string | null;
  isAmended: boolean;
  amendmentReason: string | null;
}

export interface ApiLabOrder {
  id: string;
  orderNumber: string;
  barcode: string | null;
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  status: ApiStatus;
  patient: { id: string; uhid: string; name: string; age: number | null; gender: string | null };
  test: { id: string; code: string; name: string; category: string; sampleType: string; container: string; tatMinutes: number; price: number; parametersSchema: ApiSchemaParam[] } | null;
  doctorName: string | null;
  location: string;
  clinicalNotes: string | null;
  orderedAt: string;
  collectedAt: string | null;
  collectedByName: string | null;
  receivedAt: string | null;
  rejectedReason: string | null;
  analyzerName: string;
  processingAt: string | null;
  processingByName: string | null;
  resultsEnteredAt: string | null;
  resultsEnteredByName: string | null;
  isFlaggedAbnormal: boolean;
  isFlaggedCritical: boolean;
  criticalAcknowledgedAt: string | null;
  criticalAcknowledgedByName: string | null;
  isRetest: boolean;
  retestReason: string | null;
  retestRequestedByName: string | null;
  technicianNote: string | null;
  pathologistRemarks: string | null;
  results: ApiResult[];
  report: ApiReportSummary | null;
  billing: { collectionAllowed: boolean; reason: string | null; pendingAmount: number | null } | null;
  analyzer: { id: string; code: string | null; name: string; status: ApiEquipment['status']; qcStatus: 'OK' | 'DUE' | 'FAILED'; blockReason: string | null } | null;
  rejections: { reasonCode: string; reason: string; stage: string; rejectedAt: string; rejectedByName: string | null }[];
}

interface ApiQcRun {
  id: string;
  level: string;
  lot: string;
  passed: boolean;
  note: string;
  performedByName: string | null;
  performedAt: string;
}

interface ApiEquipment {
  id: string;
  code: string | null;
  name: string;
  serialNumber: string;
  section: string;
  status: 'RUNNING' | 'READY' | 'MAINTENANCE' | 'OFFLINE';
  testsCovered: string;
  reagentPercent: number | null;
  alertTitle: string;
  alertBody: string;
  serviceTicket: string;
  engineerEta: string;
  qcStatus: 'OK' | 'DUE' | 'FAILED';
  blockReason: string | null;
  lastQc: ApiQcRun | null;
  qcRuns: ApiQcRun[];
  queuedCount: number;
}

interface ApiAudit {
  id: string;
  at: string;
  action: string;
  by: string | null;
  details: Record<string, unknown>;
}

interface ApiCallback {
  id: string;
  status: 'PENDING' | 'ACKNOWLEDGED';
  releasedAt: string;
  ackWindowMinutes: number;
  receivedByName: string;
  receivedByRole: string;
  readBackConfirmed: boolean;
  acknowledgedAt: string | null;
  attempts: { at: string; outcome: string; note: string; byName: string | null }[];
}

interface ApiLabReport extends ApiReportSummary {
  version: number;
  signerDesignation: string;
  signatureHash: string;
  amendedAt: string | null;
  amendments: { number: number; text: string; signedByName: string; signedAt: string }[];
  callback: ApiCallback | null;
  order: ApiLabOrder;
  auditTrail: ApiAudit[];
}

type ApiRanges = Partial<Record<'adultMale' | 'adultFemale' | 'child', { name: string; unit: string; low: number | null; high: number | null; criticalLow: number | null; criticalHigh: number | null }[]>>;

interface ApiRangeVersion {
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED';
  ranges: ApiRanges;
  notes: string;
  createdByName: string | null;
  updatedAt: string;
  publishedByName: string | null;
  publishedAt: string | null;
}

interface ApiLabTest {
  id: string;
  testCode: string;
  name: string;
  category: string;
  sampleType: string;
  containerType: string;
  tatMinutes: number;
  statTatMinutes: number | null;
  isActive: boolean;
  publishedRanges: ApiRangeVersion | null;
  draftRanges: ApiRangeVersion | null;
  versionHistory: { version: number; status: string; publishedAt: string | null; publishedByName: string | null; notes: string }[];
}

/* ------------------------------------------------------------------ */
/* Mode                                                                */
/* ------------------------------------------------------------------ */

/** True when signed in against the backend (not the offline demo login). */
export const labApiMode = () => {
  try {
    const token = localStorage.getItem('token');
    return !!token && !token.startsWith('local-');
  } catch {
    return false;
  }
};

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** "HH:MM" for today (the screens compute waiting times from it); "12 Oct, HH:MM" otherwise. */
export const clock = (iso?: string | null) => {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  if (sameDay(d, new Date())) return hhmm(d);
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${hhmm(d)}`;
};

/** "Today HH:MM" / "Yesterday HH:MM" / "12 Oct HH:MM" (signed-report list format). */
const dayClock = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return `Today ${hhmm(d)}`;
  if (sameDay(d, y)) return `Yesterday ${hhmm(d)}`;
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} ${hhmm(d)}`;
};

const STAGE: Record<ApiStatus, SpecimenStep> = {
  ORDERED: 'ORDERED',
  SAMPLE_COLLECTED: 'COLLECTED',
  SAMPLE_RECEIVED: 'RECEIVED',
  IN_ANALYSIS: 'PROCESSING',
  RESULTS_ENTERED: 'PENDING_REVIEW',
  REPORT_APPROVED: 'SIGNED_OFF',
  CANCELLED: 'ORDERED',
};

const PRIORITY: Record<ApiLabOrder['priority'], LabQueueOrder['priority']> = { ROUTINE: 'Routine', URGENT: 'Urgent', STAT: 'STAT' };

const num = (v: unknown) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Parameter list = the test's schema merged with any results already entered. */
const parametersOf = (o: ApiLabOrder): TestParameterResult[] => {
  const byName = new Map(o.results.map((r) => [r.paramName.toLowerCase(), r]));
  const schema = o.test?.parametersSchema || [];
  const fromSchema: TestParameterResult[] = schema.map((p) => {
    const r = byName.get(p.name.toLowerCase());
    byName.delete(p.name.toLowerCase());
    return {
      group: p.group || r?.group || (o.test?.category || 'Results').toUpperCase(),
      name: p.name,
      unit: p.unit || r?.unit || '',
      low: num(p.low) ?? num(r?.low) ?? 0,
      high: num(p.high) ?? num(r?.high) ?? 0,
      criticalLow: num(p.criticalLow) ?? num(r?.criticalLow) ?? undefined,
      criticalHigh: num(p.criticalHigh) ?? num(r?.criticalHigh) ?? undefined,
      observedValue: r ? num(r.observedValue) : null,
      previousValue: r ? num(r.previousValue) : null,
    };
  });
  const extra: TestParameterResult[] = Array.from(byName.values()).map((r) => ({
    group: r.group || 'Results',
    name: r.paramName,
    unit: r.unit,
    low: num(r.low) ?? 0,
    high: num(r.high) ?? 0,
    criticalLow: num(r.criticalLow) ?? undefined,
    criticalHigh: num(r.criticalHigh) ?? undefined,
    observedValue: num(r.observedValue),
    previousValue: num(r.previousValue),
  }));
  const all = [...fromSchema, ...extra];
  if (all.length) return all;
  // Test without a parameter schema in the catalog: standard panel for its name, no previous values
  return getDefaultParametersForTest(o.test?.name || '', o.test?.category).map((p) => ({ ...p, previousValue: null }));
};

export const toQueueOrder = (o: ApiLabOrder): LabQueueOrder => ({
  id: o.id,
  orderNumber: o.orderNumber,
  specimenNumber: o.barcode || o.orderNumber,
  patientName: o.patient.name,
  age: o.patient.age ?? 0,
  gender: o.patient.gender || '',
  uhid: o.patient.uhid,
  testName: o.test?.name || 'Test not linked',
  testCode: o.test?.code || '',
  category: o.test?.category || '',
  doctorName: o.doctorName || 'the ordering doctor',
  location: o.location || 'Location not recorded',
  sampleType: o.test?.sampleType || '',
  priority: PRIORITY[o.priority] || 'Routine',
  stage: STAGE[o.status] || 'ORDERED',
  assignedTechnician: o.resultsEnteredByName || o.processingByName || undefined,
  analyzerId: o.analyzer?.code || o.analyzer?.id,
  analyzerName: o.analyzerName || undefined,
  isBlockedByDowntime: o.status === 'IN_ANALYSIS' && !!o.analyzer && (o.analyzer.status === 'OFFLINE' || o.analyzer.status === 'MAINTENANCE'),
  blockedReason: o.status === 'IN_ANALYSIS' ? o.analyzer?.blockReason || undefined : undefined,
  returnedForRetest: o.isRetest,
  retestReason: o.retestReason || undefined,
  returnedBy: o.retestRequestedByName || undefined,
  orderedAt: clock(o.orderedAt) || '',
  collectedAt: clock(o.collectedAt),
  receivedAt: clock(o.receivedAt),
  processingAt: clock(o.processingAt),
  enteredAt: clock(o.resultsEnteredAt),
  signedOffAt: clock(o.report?.approvedAt),
  signedOffBy: o.report?.signedByName || undefined,
  isCritical: o.isFlaggedCritical,
  criticalAcknowledgedAt: clock(o.criticalAcknowledgedAt),
  criticalAcknowledgedBy: o.criticalAcknowledgedByName || undefined,
  isPaid: o.billing ? o.billing.collectionAllowed : undefined,
  billingStatus: o.billing ? (o.billing.collectionAllowed ? 'PAID' : 'UNPAID') : undefined,
  billingAmount: o.test?.price,
  technicianNote: o.technicianNote || undefined,
  sampleRejectedReason: o.rejectedReason || undefined,
  pathologistInterpretation: o.pathologistRemarks || undefined,
  relevantHistory: o.clinicalNotes ? [o.clinicalNotes] : [],
  parameters: parametersOf(o),
});

const flagOf = (o: ApiLabOrder): SignedReportItem['flag'] => (o.isFlaggedCritical ? 'Critical' : o.isFlaggedAbnormal ? 'Abnormal' : 'Normal');

const AUDIT_TITLE: Record<string, string> = {
  LAB_ORDERED: 'Ordered',
  SAMPLE_COLLECTED: 'Sample collected',
  SAMPLE_RECEIVED: 'Sample received in lab',
  SAMPLE_REJECTED: 'Sample rejected',
  ANALYSIS_STARTED: 'Loaded on analyzer',
  RESULTS_DRAFT_SAVED: 'Result draft saved',
  RESULTS_SUBMITTED: 'Result entered',
  RETEST_REQUESTED: 'Re-test requested',
  REPORT_SIGNED: 'Approved & signed off',
  CRITICAL_ACKNOWLEDGED: 'Critical acknowledged',
  CRITICAL_CALL_ATTEMPT: 'Call attempt',
  REPORT_AMENDED: 'Amended',
};
const AUDIT_DOT: Record<string, string> = { REPORT_SIGNED: '#2563EB', CRITICAL_ACKNOWLEDGED: '#16A34A', CRITICAL_CALL_ATTEMPT: '#F59E0B', REPORT_AMENDED: '#F59E0B', SAMPLE_REJECTED: '#DC2626' };

const auditItem = (a: ApiAudit): AuditTrailItem => {
  const d = a.details || {};
  const extra = (d.reason || d.note || d.analyzer || d.reportNumber) as string | undefined;
  const title = AUDIT_TITLE[a.action] || a.action;
  return {
    id: a.id,
    time: clock(a.at) || '—',
    title: extra && a.action !== 'REPORT_SIGNED' ? `${title} · ${extra}` : title,
    by: a.by || 'System',
    dot: AUDIT_DOT[a.action] || '#9CA3AF',
  };
};

export const toSignedReport = (r: ApiLabReport): SignedReportItem => {
  const o = r.order;
  const cb = r.callback;
  const abnormal = o.results.filter((x) => x.isAbnormal);
  const receiver = cb && cb.receivedByName ? `${cb.receivedByName}${cb.receivedByRole ? ` (${cb.receivedByRole})` : ''}${cb.readBackConfirmed ? ' · read back' : ''}` : 'receiver not recorded';
  return {
    id: r.id,
    reportNumber: r.reportNumber || '—',
    orderNumber: o.orderNumber,
    patientName: o.patient.name,
    age: o.patient.age ?? 0,
    gender: o.patient.gender || '',
    uhid: o.patient.uhid,
    testName: o.test?.name || 'Test not linked',
    testCode: o.test?.code || '',
    section: o.test?.category || '',
    doctorName: o.doctorName || 'the ordering doctor',
    location: o.location || 'Location not recorded',
    signedAt: dayClock(r.approvedAt),
    flag: flagOf(o),
    deliveryStatus: o.isFlaggedCritical ? ((cb ? cb.status === 'ACKNOWLEDGED' : !!o.criticalAcknowledgedAt) ? 'acknowledged' : 'pending') : 'sent',
    deliveryText: o.isFlaggedCritical
      ? (cb ? cb.status === 'ACKNOWLEDGED' : !!o.criticalAcknowledgedAt)
        ? `Acknowledged ${clock(cb?.acknowledgedAt || o.criticalAcknowledgedAt)} · ${receiver}`
        : 'Awaiting acknowledgment'
      : `Sent to ${o.doctorName || 'the ordering doctor'}`,
    isAmended: r.isAmended,
    amendmentReason: r.amendmentReason || undefined,
    keyFindings: abnormal.length ? abnormal.map((x) => `${x.paramName} ${x.observedValue} ${x.unit}`.trim()).join(' · ') : 'All parameters within reference range.',
    interpretation: r.remarks || '',
    auditTrail: r.auditTrail.map(auditItem),
    // version is 1 + addenda; take the larger in case a refresh read the two at slightly different moments
    signature: { hash: r.signatureHash, designation: r.signerDesignation, version: Math.max(r.version, r.amendments.length + 1), amendments: r.amendments },
    callback: cb
      ? { status: cb.status, ackWindowMinutes: cb.ackWindowMinutes, receivedByName: cb.receivedByName, receivedByRole: cb.receivedByRole, readBackConfirmed: cb.readBackConfirmed, attempts: cb.attempts }
      : undefined,
  };
};

const fmtTat = (mins: number | null | undefined) => (!mins ? '—' : mins % 60 === 0 ? `${mins / 60} h` : `${mins} m`);
const SEGS = ['adultMale', 'adultFemale', 'child'] as const;
const toRanges = (r: ApiRanges | undefined): CatalogTestItem['ranges'] =>
  Object.fromEntries(
    SEGS.map((k) => [
      k,
      (r?.[k] || []).map((x): CatalogRangeItem => ({ name: x.name, unit: x.unit, low: x.low ?? 0, high: x.high ?? 0, criticalLow: x.criticalLow ?? undefined, criticalHigh: x.criticalHigh ?? undefined })),
    ])
  ) as CatalogTestItem['ranges'];
const fromRanges = (r: CatalogTestItem['ranges']) =>
  Object.fromEntries(SEGS.map((k) => [k, (r[k] || []).map((x) => ({ name: x.name, unit: x.unit, low: x.low, high: x.draftHigh ?? x.high, criticalLow: x.criticalLow ?? null, criticalHigh: x.criticalHigh ?? null }))]));

const ANALYZER_STATUS: Record<ApiEquipment['status'], AnalyzerItem['status']> = { RUNNING: 'Running', READY: 'Ready', MAINTENANCE: 'Maintenance', OFFLINE: 'Offline' };

export const toAnalyzer = (e: ApiEquipment): AnalyzerItem => ({
  id: e.code || e.id,
  name: e.name,
  section: e.section,
  serial: e.serialNumber,
  status: ANALYZER_STATUS[e.status] || 'Offline',
  queuedCount: e.queuedCount,
  // "10:42 ✓" / "10:42 ✗" (the screens look for ✗ to hold results) / "Not run"
  lastQc: e.lastQc ? `${clock(e.lastQc.performedAt)} ${e.lastQc.passed ? '✓' : '✗'}` : 'Not run yet',
  isQcDue: e.qcStatus !== 'OK',
  reagentPercent: e.reagentPercent ?? 0,
  testsCovered: e.testsCovered || '—',
  alertTitle: e.alertTitle || (e.qcStatus === 'DUE' && e.status !== 'OFFLINE' && e.status !== 'MAINTENANCE' ? 'QC due' : undefined),
  alertBody: e.alertBody || (e.qcStatus === 'DUE' && e.status !== 'OFFLINE' && e.status !== 'MAINTENANCE' ? e.blockReason || undefined : undefined),
  serviceTicket: e.serviceTicket || undefined,
  engineerEta: e.engineerEta || undefined,
  qcLog: e.qcRuns.map((r) => ({ id: r.id, time: clock(r.performedAt) || '—', level: r.level, lot: r.lot, pass: r.passed, by: r.performedByName || '—', note: r.note || undefined })),
});

const REJECT_CODES: [RegExp, string][] = [
  [/^haemolys|^hemolys/i, 'HAEMOLYSED'],
  [/^clotted/i, 'CLOTTED'],
  [/^insufficient/i, 'INSUFFICIENT'],
  [/^wrong container/i, 'WRONG_CONTAINER'],
  [/label/i, 'LABEL'],
  [/^leak/i, 'LEAKED'],
];

export const toCatalogTest = (t: ApiLabTest): CatalogTestItem => {
  const live = t.publishedRanges;
  const draft = t.draftRanges;
  return {
    code: t.testCode,
    name: t.name,
    section: t.category,
    sampleType: t.sampleType || '—',
    container: t.containerType || '—',
    paramsCount: (live || draft)?.ranges?.adultMale?.length ?? 0,
    tatTarget: fmtTat(t.tatMinutes),
    tatStat: fmtTat(t.statTatMinutes),
    status: !t.isActive ? 'Inactive' : draft || !live ? 'Draft' : 'Active',
    version: live?.version ?? 0,
    lastPublished: live?.publishedAt ? new Date(live.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    // A never-published test shows its draft as the starting point
    ranges: toRanges((live || draft)?.ranges),
    draftRanges: draft ? toRanges(draft.ranges) : undefined,
    draftSavedBy: draft?.createdByName || undefined,
    recentQc: [],
    versionHistory: t.versionHistory,
  };
};

/** Shape used by the doctor, assistant and nurse screens. */
export const toSharedOrder = (o: ApiLabOrder): SharedLabOrder => {
  const q = toQueueOrder(o);
  return {
    id: o.id,
    orderNo: o.orderNumber,
    patientName: q.patientName,
    uhid: q.uhid,
    age: q.age,
    gender: q.gender,
    testName: q.testName,
    category: q.category,
    sampleType: q.sampleType,
    container: o.test?.container || '',
    doctor: o.doctorName || '',
    barcode: o.barcode || '',
    priority: o.priority,
    stage: mapWorkbenchStageToShared(q.stage),
    price: o.test?.price ?? 0,
    isFlaggedAbnormal: o.isFlaggedAbnormal,
    isFlaggedCritical: o.isFlaggedCritical,
    criticalAcknowledged: !!o.criticalAcknowledgedAt,
    criticalAcknowledgedBy: o.criticalAcknowledgedByName || undefined,
    criticalAcknowledgedAt: clock(o.criticalAcknowledgedAt),
    parameters: o.results.map((r) => ({
      paramName: r.paramName,
      observedValue: r.observedValue,
      referenceRange: r.low !== null && r.high !== null ? `${r.low} - ${r.high}` : r.high !== null ? `< ${r.high}` : '',
      unit: r.unit,
      isAbnormal: r.isAbnormal,
      isCritical: r.flag.startsWith('CRITICAL'),
      flag: r.flag.startsWith('CRITICAL') ? 'CRITICAL' : r.isAbnormal ? 'ABNORMAL' : undefined,
    })),
    technicianNote: o.technicianNote || undefined,
    pathologistRemarks: o.report ? o.report.remarks || undefined : undefined,
    sampleCollector: o.collectedByName || undefined,
    collectedAt: clock(o.collectedAt),
    approvedBy: o.report?.signedByName || undefined,
    approvedAt: clock(o.report?.approvedAt),
    reportId: o.report?.reportNumber || undefined,
  };
};

/* ------------------------------------------------------------------ */
/* Cache, polling and errors                                           */
/* ------------------------------------------------------------------ */

const state = {
  orders: [] as ApiLabOrder[],
  reports: [] as ApiLabReport[],
  tests: [] as ApiLabTest[],
  equipment: [] as ApiEquipment[],
  admin: null as LabAdminState | null,
  pricing: null as LabPricingSnapshot | null,
  ackWindowMinutes: null as number | null,
  loaded: false,
  loading: null as Promise<void> | null,
  lastError: null as string | null,
  timer: null as ReturnType<typeof setInterval> | null,
  fingerprint: '',
  version: 0,
  memo: { version: -1, queue: [] as LabQueueOrder[], reports: [] as SignedReportItem[], shared: [] as SharedLabOrder[], catalog: [] as CatalogTestItem[], analyzers: [] as AnalyzerItem[] },
};

const emitSync = () => {
  state.version += 1;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nh_lab_sync'));
    window.dispatchEvent(new Event('nh_lab_admin_sync'));
    // Doctor, assistant and nurse screens refresh on the shared data event
    window.dispatchEvent(new Event('nh_data_sync'));
  }
};

export const LAB_API_ERROR_EVENT = 'nh_lab_api_error';

/** Subscribe to lab server errors (refused step, patient not registered, offline…). Returns an unsubscribe. */
export const onLabApiError = (cb: (message: string) => void) => {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => cb(String((e as CustomEvent).detail || 'Lab server error'));
  window.addEventListener(LAB_API_ERROR_EVENT, handler);
  return () => window.removeEventListener(LAB_API_ERROR_EVENT, handler);
};

const errorText = (err: unknown) => {
  const e = err as { response?: { data?: { error?: string; detail?: string } | string; status?: number }; message?: string };
  const data = e?.response?.data;
  if (typeof data === 'string') return data;
  if (data?.error) return data.detail && typeof data.detail === 'string' ? `${data.error} — ${data.detail}` : data.error;
  if (e?.response?.status === 403) return 'Your role cannot perform this lab action.';
  return e?.message || 'The lab server could not be reached.';
};

const reportError = (err: unknown) => {
  const message = errorText(err);
  state.lastError = message;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(LAB_API_ERROR_EVENT, { detail: message }));
  return message;
};

const refresh = async () => {
  if (state.loading) return state.loading;
  state.loading = (async () => {
    try {
      const [orders, reports, tests, equipment, admin, pricing] = await Promise.all([
        api.get<ApiLabOrder[]>('/lab/orders/', { params: { since_days: 30 } }),
        api.get<ApiLabReport[]>('/lab/reports/'),
        api.get<ApiLabTest[]>('/lab/tests/'),
        api.get<ApiEquipment[]>('/lab/equipment/'),
        api.get<LabAdminState>('/lab/admin/state/'),
        api.get<LabPricingSnapshot>('/lab/admin/pricing/'),
      ]);
      const nextOrders = (orders.data || []).filter((o) => o.status !== 'CANCELLED');
      const nextReports = reports.data || [];
      const nextTests = tests.data || [];
      const nextEquipment = equipment.data || [];
      const fingerprint = JSON.stringify([nextOrders, nextReports, nextTests, nextEquipment, admin.data, pricing.data]);
      const changed = fingerprint !== state.fingerprint || !state.loaded;
      state.orders = nextOrders;
      state.reports = nextReports;
      state.tests = nextTests;
      state.equipment = nextEquipment;
      state.admin = admin.data;
      state.pricing = pricing.data;
      state.ackWindowMinutes = nextReports.find((r) => r.callback)?.callback?.ackWindowMinutes ?? state.ackWindowMinutes;
      state.fingerprint = fingerprint;
      state.loaded = true;
      state.lastError = null;
      // Polling only wakes the screens when something actually changed
      if (changed) emitSync();
    } catch (err) {
      reportError(err);
    } finally {
      state.loading = null;
    }
  })();
  return state.loading;
};

const ensureStarted = () => {
  if (typeof window === 'undefined') return;
  if (!state.loaded && !state.loading) void refresh();
  if (!state.timer) {
    state.timer = setInterval(() => {
      if (!labApiMode()) return;
      if (typeof document === 'undefined' || document.visibilityState === 'visible') void refresh();
    }, 20000);
  }
};

const replaceOrder = (o: ApiLabOrder) => {
  const i = state.orders.findIndex((x) => x.id === o.id);
  state.orders = i === -1 ? [o, ...state.orders] : state.orders.map((x) => (x.id === o.id ? o : x));
  emitSync();
};

const patchOrder = (id: string, patch: Partial<ApiLabOrder>) => {
  state.orders = state.orders.map((o) => (o.id === id ? { ...o, ...patch } : o));
  emitSync();
};

/** Apply `optimistic` now, send the request, then take the server's version (or reload on failure). */
const mutate = async (id: string, optimistic: Partial<ApiLabOrder> | null, request: () => Promise<{ data: ApiLabOrder }>, alsoReports = false) => {
  if (optimistic) patchOrder(id, optimistic);
  try {
    const res = await request();
    replaceOrder(res.data);
    if (alsoReports) await refresh();
    return true;
  } catch (err) {
    reportError(err);
    await refresh();
    return false;
  }
};

const nowIso = () => new Date().toISOString();

// Catalog edits for one test are sent in order ("save draft" then "publish" must not race)
const testQueues = new Map<string, Promise<unknown>>();
const serial = <T>(key: string, job: () => Promise<T>) => {
  const next = (testQueues.get(key) || Promise.resolve()).catch(() => undefined).then(job);
  testQueues.set(key, next);
  return next;
};
const testId = (code: string) => state.tests.find((t) => t.testCode === code)?.id;
const replaceTest = (t: ApiLabTest) => {
  state.tests = state.tests.some((x) => x.id === t.id) ? state.tests.map((x) => (x.id === t.id ? t : x)) : [t, ...state.tests];
  emitSync();
};
const equipmentCall = (code: string, path: string, body: unknown) =>
  serial(`eq:${code}`, async () => {
    try {
      const res = await api.post<ApiEquipment>(`/lab/equipment/${code}/${path}/`, body);
      state.equipment = state.equipment.map((e) => (e.id === res.data.id ? res.data : e));
      emitSync();
      // Orders on this analyzer change state too (held / blocked)
      await refresh();
      return true;
    } catch (err) {
      reportError(err);
      await refresh();
      return false;
    }
  });

const catalogCall = (code: string, path: string, body: unknown) =>
  serial(code, async () => {
    const id = testId(code);
    if (!id) return reportError(new Error(`Test ${code} is not in the server catalog.`));
    try {
      replaceTest((await api.post<ApiLabTest>(`/lab/tests/${id}/${path}/`, body)).data);
      return true;
    } catch (err) {
      reportError(err);
      await refresh();
      return false;
    }
  });

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

const memoised = () => {
  if (state.memo.version !== state.version) {
    state.memo = {
      version: state.version,
      queue: state.orders.map(toQueueOrder),
      reports: state.reports.map(toSignedReport),
      shared: state.orders.map(toSharedOrder),
      catalog: state.tests.map(toCatalogTest),
      analyzers: state.equipment.map(toAnalyzer),
    };
  }
  return state.memo;
};

export const LabApi = {
  refresh,
  get loaded() {
    return state.loaded;
  },
  get lastError() {
    return state.lastError;
  },

  queueOrders(): LabQueueOrder[] {
    ensureStarted();
    return memoised().queue;
  },
  signedReports(): SignedReportItem[] {
    ensureStarted();
    return memoised().reports;
  },
  sharedOrders(): SharedLabOrder[] {
    ensureStarted();
    return memoised().shared;
  },
  raw(id: string) {
    return state.orders.find((o) => o.id === id || o.orderNumber === id);
  },
  catalog(): CatalogTestItem[] {
    ensureStarted();
    return memoised().catalog;
  },
  analyzers(): AnalyzerItem[] {
    ensureStarted();
    return memoised().analyzers;
  },

  logQc: (code: string, entry: { level: string; lot: string; pass: boolean; note?: string }) =>
    equipmentCall(code, 'qc', { level: entry.level, lot: entry.lot, passed: entry.pass, note: entry.note || '' }),
  reportFault: (code: string, description: string) => equipmentCall(code, 'report-fault', { description }),
  returnToService: (code: string) => equipmentCall(code, 'return-to-service', {}),
  /** Not supported against the server. */
  unsupported(message: string) {
    reportError(new Error(message));
  },

  /** Lab Admin snapshot (staff, roster, requests, equipment service, stock, purchases, drafts, settings, history). */
  adminState(): LabAdminState | null {
    ensureStarted();
    return state.admin;
  },
  pricing(): LabPricingSnapshot | null {
    ensureStarted();
    return state.pricing;
  },
  async staffCandidates(): Promise<LabStaffCandidate[]> {
    try {
      return (await api.get<LabStaffCandidate[]>('/lab/admin/staff/candidates/')).data;
    } catch (err) {
      reportError(err);
      return [];
    }
  },
  /** One Lab Admin change: POST/PATCH the endpoint, then reload everything (counts on every screen depend on it). */
  admin<T = unknown>(path: string, body: unknown = {}, method: 'post' | 'patch' = 'post') {
    return serial('lab-admin', async () => {
      try {
        const res = await api[method]<T>(`/lab/admin/${path}`, body);
        await refresh();
        return res.data;
      } catch (err) {
        reportError(err);
        await refresh();
        return null;
      }
    });
  },
  /** Critical read-back window from the server (null until a call-back has been loaded). */
  ackWindowMinutes() {
    return state.ackWindowMinutes;
  },

  saveRangeDraft: (code: string, ranges: CatalogTestItem['ranges']) => catalogCall(code, 'range-draft', { ranges: fromRanges(ranges) }),
  publishRanges: (code: string) => catalogCall(code, 'publish-ranges', {}),
  discardRangeDraft: (code: string) => catalogCall(code, 'discard-draft', {}),
  createTest: (t: CatalogTestItem) =>
    serial(t.code, async () => {
      const mins = (v: string) => {
        const m = /([\d.]+)\s*(h|m)/i.exec(v || '');
        return m ? Math.round(m[2].toLowerCase() === 'h' ? Number(m[1]) * 60 : Number(m[1])) : null;
      };
      try {
        const res = await api.post<ApiLabTest>('/lab/tests/', {
          testCode: t.code,
          name: t.name,
          category: t.section,
          sampleType: t.sampleType,
          containerType: t.container,
          tatMinutes: mins(t.tatTarget) || 240,
          statTatMinutes: mins(t.tatStat),
          ranges: fromRanges(t.ranges),
        });
        replaceTest(res.data);
        return true;
      } catch (err) {
        reportError(err);
        return false;
      }
    }),

  async verifyReport(reportId: string): Promise<{ status: 'VALID' | 'TAMPERED' | 'UNSIGNED'; message: string; amendments: { number: number; status: string }[] } | null> {
    try {
      return (await api.get(`/lab/reports/${reportId}/verify/`)).data;
    } catch (err) {
      reportError(err);
      return null;
    }
  },

  async createOrder(input: { uhid: string; testName: string; testCode?: string; priority?: string; location?: string; clinicalNotes?: string; encounterId?: string }) {
    try {
      const res = await api.post<ApiLabOrder>('/lab/orders/', input);
      replaceOrder(res.data);
      return res.data;
    } catch (err) {
      reportError(err);
      return null;
    }
  },

  collect: (id: string) => mutate(id, { status: 'SAMPLE_COLLECTED', collectedAt: nowIso(), rejectedReason: null }, () => api.post(`/lab/orders/${id}/collect-sample/`)),
  receive: (id: string) => mutate(id, { status: 'SAMPLE_RECEIVED', receivedAt: nowIso() }, () => api.post(`/lab/orders/${id}/receive-sample/`)),
  reject: (id: string, reason: string) =>
    mutate(id, { status: 'ORDERED', rejectedReason: reason, collectedAt: null, receivedAt: null }, () =>
      api.post(`/lab/orders/${id}/reject-sample/`, { reason, reasonCode: REJECT_CODES.find(([re]) => re.test(reason))?.[1] || 'OTHER' })
    ),
  /** analyzerId: the analyzer's code (e.g. "an-xn1000") or server id. */
  startAnalysis: (id: string, analyzerId: string) =>
    mutate(
      id,
      { status: 'IN_ANALYSIS', analyzerName: state.equipment.find((e) => e.code === analyzerId || e.id === analyzerId)?.name || '', processingAt: nowIso() },
      () => api.post(`/lab/orders/${id}/start-analysis/`, { analyzerId }),
      true
    ),

  saveResults(id: string, parameters: TestParameterResult[], technicianNote: string, submit: boolean) {
    const body = {
      submit,
      technicianNote,
      parameters: parameters.map((p) => ({
        paramName: p.name,
        group: p.group,
        unit: p.unit,
        low: p.low,
        high: p.high,
        criticalLow: p.criticalLow ?? null,
        criticalHigh: p.criticalHigh ?? null,
        observedValue: p.observedValue === null || p.observedValue === undefined ? '' : String(p.observedValue),
      })),
    };
    const optimistic: Partial<ApiLabOrder> | null = submit ? { status: 'RESULTS_ENTERED', resultsEnteredAt: nowIso(), technicianNote } : { technicianNote };
    return mutate(id, optimistic, () => api.post(`/lab/orders/${id}/results/`, body));
  },

  retest: (id: string, reason: string) => mutate(id, { status: 'IN_ANALYSIS', isRetest: true, retestReason: reason }, () => api.post(`/lab/orders/${id}/request-retest/`, { reason })),
  saveInterpretation: (id: string, remarks: string) => mutate(id, { pathologistRemarks: remarks }, () => api.post(`/lab/orders/${id}/interpretation-draft/`, { remarks })),

  async signOff(id: string, remarks: string) {
    patchOrder(id, { status: 'REPORT_APPROVED' });
    try {
      const res = await api.post<ApiLabReport>('/lab/reports/approve/', { orderId: id, remarks });
      await refresh();
      return toSignedReport(res.data);
    } catch (err) {
      reportError(err);
      await refresh();
      return null;
    }
  },

  async amend(reportId: string, reason: string) {
    const r = state.reports.find((x) => x.id === reportId);
    if (!r) return null;
    try {
      const res = await api.post<ApiLabReport>('/lab/reports/amend/', { orderId: r.order.id, amendmentReason: reason });
      state.reports = state.reports.map((x) => (x.id === reportId ? res.data : x));
      emitSync();
      return toSignedReport(res.data);
    } catch (err) {
      reportError(err);
      return null;
    }
  },

  /**
   * reportOrOrderId: a signed report id (call-backs screen) or an order id (doctor screen).
   * Lab staff pass the receiver; a clinician acknowledging in the app is the receiver themselves.
   */
  async acknowledgeCritical(reportOrOrderId: string, note: string, receiver?: { name: string; role: string }) {
    const orderId = state.reports.find((x) => x.id === reportOrOrderId)?.order.id || reportOrOrderId;
    patchOrder(orderId, { criticalAcknowledgedAt: nowIso() });
    try {
      await api.post(`/lab/orders/${orderId}/acknowledge-critical/`, { notes: note, readBack: true, receivedByName: receiver?.name, receivedByRole: receiver?.role });
      await refresh();
      return true;
    } catch (err) {
      reportError(err);
      await refresh();
      return false;
    }
  },

  async logCall(reportId: string, note: string) {
    const orderId = state.reports.find((x) => x.id === reportId)?.order.id;
    if (!orderId) return false;
    try {
      await api.post(`/lab/orders/${orderId}/log-call/`, { note, outcome: 'NO_ANSWER' });
      await refresh();
      return true;
    } catch (err) {
      reportError(err);
      return false;
    }
  },
};

export default LabApi;
