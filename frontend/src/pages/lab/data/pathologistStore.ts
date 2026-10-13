// Pathologist workspace — one live snapshot of every source the pathologist reads, plus derived helpers.
// Every count on screen (KPIs, sidebar pills, filter chips) is calculated from this snapshot.
import { useEffect, useState } from 'react';
import { patientJourneyService, LabTariffItem } from '../../../services/patientJourneyService';
import { LabDataStore, LabQueueOrder, SignedReportItem, CatalogTestItem, AnalyzerItem, TestParameterResult } from './labDataStore';
import { LabAdminStore, LAB_ADMIN_SYNC_EVENT, minutesOf, parseTatTarget } from './labAdminStore';
import { LabApi, labApiMode } from '../../../services/labService';

export interface PathologistSnapshot {
  orders: LabQueueOrder[];
  reports: SignedReportItem[];
  catalog: CatalogTestItem[];
  analyzers: AnalyzerItem[];
  tariffs: Record<string, LabTariffItem>;
  /** Critical acknowledgement window from Lab Admin › Department settings, in minutes. */
  ackWindowMin: number | null;
  ackWindowLabel: string;
}

const readSnapshot = (): PathologistSnapshot => {
  const settings = LabAdminStore.get().settings;
  // Signed in against the server, the read-back window is the one stored on each call-back
  const serverWindow = labApiMode() ? LabApi.ackWindowMinutes() : null;
  return {
    orders: LabDataStore.getOrders(),
    reports: LabDataStore.getSignedReports(),
    catalog: LabDataStore.getCatalog(),
    analyzers: LabDataStore.getAnalyzers(),
    tariffs: patientJourneyService.getLabTariffs(),
    ackWindowMin: serverWindow ?? parseTatTarget(settings.criticalAckWindow),
    ackWindowLabel: serverWindow !== null ? `${serverWindow} minutes` : settings.criticalAckWindow,
  };
};

/** Live view of orders, reports, catalog and analyzers; refreshes on any lab, admin or billing change. */
export const usePathologistData = (): PathologistSnapshot => {
  const [snap, setSnap] = useState<PathologistSnapshot>(readSnapshot);
  useEffect(() => {
    const refresh = () => setSnap(readSnapshot());
    const events = ['nh_lab_sync', 'nh_data_sync', LAB_ADMIN_SYNC_EVENT, 'storage'];
    events.forEach((ev) => window.addEventListener(ev, refresh));
    return () => events.forEach((ev) => window.removeEventListener(ev, refresh));
  }, []);
  return snap;
};

/* ------------------------------------------------------------------ */
/* Result flags                                                        */
/* ------------------------------------------------------------------ */

export type ResultFlag = 'Critical' | 'Abnormal' | 'Normal';

export const paramFlag = (p: TestParameterResult): ResultFlag | 'Pending' => {
  const v = p.observedValue;
  if (v === null || v === undefined) return 'Pending';
  if ((p.criticalLow !== undefined && v < p.criticalLow) || (p.criticalHigh !== undefined && v > p.criticalHigh)) return 'Critical';
  if (v < p.low || v > p.high) return 'Abnormal';
  return 'Normal';
};

export const orderFlag = (o: LabQueueOrder): ResultFlag => {
  const flags = o.parameters.map(paramFlag);
  if (o.isCritical || flags.includes('Critical')) return 'Critical';
  if (flags.includes('Abnormal')) return 'Abnormal';
  return 'Normal';
};

/** Change from the previous result, as a percentage (delta check). */
export const deltaPct = (p: TestParameterResult) => {
  if (p.observedValue === null || p.previousValue === null || p.previousValue === undefined || p.previousValue === 0) return null;
  return Math.round(((p.observedValue - p.previousValue) / Math.abs(p.previousValue)) * 100);
};
export const DELTA_LIMIT_PCT = 20;

/* ------------------------------------------------------------------ */
/* Queue                                                               */
/* ------------------------------------------------------------------ */

/** Results are entered and waiting for the pathologist. */
export const isReviewable = (o: LabQueueOrder) => o.stage === 'PENDING_REVIEW' || o.stage === 'RESULT_ENTERED';
/** Sent back to the bench for a re-run and not yet re-entered. */
export const isSentBack = (o: LabQueueOrder) => !!o.returnedForRetest && !isReviewable(o) && o.stage !== 'SIGNED_OFF';

const FLAG_RANK: Record<ResultFlag, number> = { Critical: 0, Abnormal: 1, Normal: 2 };
const PRIORITY_RANK: Record<LabQueueOrder['priority'], number> = { STAT: 0, Urgent: 1, Routine: 2 };

/** Critical first, then STAT / Urgent / Routine, then the longest waiting. */
export const reviewOrderSort = (a: LabQueueOrder, b: LabQueueOrder) =>
  FLAG_RANK[orderFlag(a)] - FLAG_RANK[orderFlag(b)] ||
  PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
  (minutesOf(a.enteredAt) ?? 9999) - (minutesOf(b.enteredAt) ?? 9999);

export const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/** Minutes since an "HH:MM" time today (null if unknown or in the future). */
export const minutesSince = (hhmm?: string, now = nowMinutes()) => {
  const m = minutesOf(hhmm);
  return m !== null && now >= m ? now - m : null;
};

export const catalogFor = (catalog: CatalogTestItem[], o: { testCode: string }) => catalog.find((c) => c.code === o.testCode);

/** TAT target for the order's priority, in minutes (from the test catalog). */
export const tatTargetFor = (o: LabQueueOrder, catalog: CatalogTestItem[]) => {
  const c = catalogFor(catalog, o);
  return parseTatTarget(o.priority === 'STAT' ? c?.tatStat : c?.tatTarget);
};

/* ------------------------------------------------------------------ */
/* Signed reports                                                      */
/* ------------------------------------------------------------------ */

export const signedToday = (r: SignedReportItem) => r.signedAt.startsWith('Today');
export const signedTime = (r: SignedReportItem) => r.signedAt.replace(/^(Today|Yesterday)\s*/, '');

const trailTime = (r: SignedReportItem, match: RegExp) => r.auditTrail.find((a) => match.test(a.title))?.time;

/** Who signed the report, from its audit trail. */
export const signerOf = (r: SignedReportItem) => {
  const entry = r.auditTrail.find((a) => /signed off/i.test(a.title));
  return entry ? entry.by.split(' · ')[0] : null;
};

/** Minutes from result entry to sign-off (only for reports signed today with both times recorded). */
export const reviewMinutes = (r: SignedReportItem) => {
  if (!signedToday(r)) return null;
  const entered = minutesOf(trailTime(r, /^Result entered/i));
  const signed = minutesOf(signedTime(r));
  return entered !== null && signed !== null && signed >= entered ? signed - entered : null;
};

export const awaitingAck = (r: SignedReportItem) => r.flag === 'Critical' && r.deliveryStatus === 'pending';

/** Minutes a critical report has been waiting for acknowledgement (reports released today only). */
export const ackWaitMinutes = (r: SignedReportItem) => (signedToday(r) ? minutesSince(signedTime(r)) : null);

export const callAttempts = (r: SignedReportItem) => r.auditTrail.filter((a) => /^Call attempt/i.test(a.title)).length;

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export type RangeSegment = 'adultMale' | 'adultFemale' | 'child';
export const SEGMENTS: { key: RangeSegment; label: string }[] = [
  { key: 'adultMale', label: 'Adult male' },
  { key: 'adultFemale', label: 'Adult female' },
  { key: 'child', label: 'Paediatric' },
];

/** Changes are waiting to be published (saved draft ranges, legacy row drafts, or never published). */
export const hasDraft = (t: CatalogTestItem) => !!t.draftRanges || t.status === 'Draft';
