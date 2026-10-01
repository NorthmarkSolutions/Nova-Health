export type NurseTabKey =
  | 'triage-queue'
  | 'vitals'
  | 'observation-beds'
  | 'specimen-desk'
  | 'shift-handover'
  | 'reports';

export interface NurseTabConfig {
  key: NurseTabKey;
  label: string;
  legacy: string[];
}

export const NURSE_TABS: NurseTabConfig[] = [
  { key: 'triage-queue', label: 'Triage Queue', legacy: ['triage'] },
  { key: 'vitals', label: 'Vitals & Assessment', legacy: [] },
  { key: 'observation-beds', label: 'Observation Beds', legacy: ['observation'] },
  { key: 'specimen-desk', label: 'Specimen Desk', legacy: ['specimen', 'phlebotomy', 'lab-orders'] },
  { key: 'shift-handover', label: 'Shift & Handover', legacy: ['handoff'] },
  { key: 'reports', label: 'Reports & Audits', legacy: [] },
];

/**
 * Resolves any tab query parameter (including legacy keys, empty/null, or unknown values)
 * to a valid NurseTabKey. Never returns null or blank.
 */
export function resolveNurseTab(param: string | null | undefined): NurseTabKey {
  if (!param) return 'triage-queue';
  const cleanParam = param.trim().toLowerCase();

  for (const tab of NURSE_TABS) {
    if (tab.key === cleanParam) return tab.key;
    if (tab.legacy.includes(cleanParam)) return tab.key;
  }

  return 'triage-queue';
}
