// Lab Technician workspace — one live snapshot of the bench (orders, analyzers, catalog, activity)
// plus derived helpers. Every count on screen is calculated from this snapshot.
import { useEffect, useState } from 'react';
import { LabDataStore, LabQueueOrder, AnalyzerItem, CatalogTestItem, LabActivityItem } from './labDataStore';
import { LAB_ADMIN_SYNC_EVENT } from './labAdminStore';

export interface TechnicianSnapshot {
  orders: LabQueueOrder[];
  analyzers: AnalyzerItem[];
  catalog: CatalogTestItem[];
  activity: LabActivityItem[];
}

const readSnapshot = (): TechnicianSnapshot => ({
  orders: LabDataStore.getOrders(),
  analyzers: LabDataStore.getAnalyzers(),
  catalog: LabDataStore.getCatalog(),
  activity: LabDataStore.getActivity(),
});

/** Live view of the bench; refreshes on any lab, nurse, doctor or admin change. */
export const useTechnicianData = (): TechnicianSnapshot => {
  const [snap, setSnap] = useState<TechnicianSnapshot>(readSnapshot);
  useEffect(() => {
    const refresh = () => setSnap(readSnapshot());
    const events = ['nh_lab_sync', 'nh_data_sync', LAB_ADMIN_SYNC_EVENT, 'storage'];
    events.forEach((ev) => window.addEventListener(ev, refresh));
    return () => events.forEach((ev) => window.removeEventListener(ev, refresh));
  }, []);
  return snap;
};

/* Stages ------------------------------------------------------------ */

export const INTAKE_STAGES: LabQueueOrder['stage'][] = ['ORDERED', 'COLLECTED', 'RECEIVED', 'ACCESSIONED'];
export const isIntake = (o: LabQueueOrder) => INTAKE_STAGES.includes(o.stage);
export const isOnBench = (o: LabQueueOrder) => o.stage === 'PROCESSING';
export const isSubmitted = (o: LabQueueOrder) => o.stage === 'RESULT_ENTERED' || o.stage === 'PENDING_REVIEW' || o.stage === 'SIGNED_OFF';

export const isUnpaid = (o: LabQueueOrder) => o.billingStatus === 'UNPAID' || o.isPaid === false;

const PRIORITY_RANK: Record<LabQueueOrder['priority'], number> = { STAT: 0, Urgent: 1, Routine: 2 };
const STAGE_RANK: Partial<Record<LabQueueOrder['stage'], number>> = { RECEIVED: 0, ACCESSIONED: 0, COLLECTED: 1, ORDERED: 2 };

/** STAT first, then samples furthest along, then oldest order. */
export const intakeSort = (a: LabQueueOrder, b: LabQueueOrder) =>
  PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (STAGE_RANK[a.stage] ?? 3) - (STAGE_RANK[b.stage] ?? 3) || (a.orderedAt || '').localeCompare(b.orderedAt || '');

/** Re-tests and STAT first, then the longest on the analyzer. */
export const benchSort = (a: LabQueueOrder, b: LabQueueOrder) =>
  Number(!!b.returnedForRetest) - Number(!!a.returnedForRetest) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.processingAt || '').localeCompare(b.processingAt || '');

/* Analyzers --------------------------------------------------------- */

const SECTION_KEY: Record<string, string> = { Hematology: 'hematology', Biochemistry: 'chemistry', Immunoassay: 'immunoassay', Coagulation: 'coagulation' };

/** Analyzers that run this order's section (all analyzers if the section is unknown). */
export const analyzersFor = (o: LabQueueOrder, analyzers: AnalyzerItem[]) => {
  const key = SECTION_KEY[o.category] || o.category.toLowerCase();
  const match = analyzers.filter((a) => a.section.toLowerCase().startsWith(key));
  return match.length ? match : analyzers;
};

export const analyzerOnline = (a: AnalyzerItem) => a.status === 'Running' || a.status === 'Ready';

/** Why patient samples cannot run on this analyzer right now (null = usable). */
export const analyzerBlock = (a: AnalyzerItem): string | null =>
  !analyzerOnline(a) ? `${a.status}` : a.isQcDue ? 'QC due' : null;

export const QC_LEVELS = ['Level 1 (Low)', 'Level 2 (Normal)', 'Level 3 (High)'];
