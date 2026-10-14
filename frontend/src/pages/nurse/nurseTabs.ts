// Nurse workspace sections (HMS shell sidebar order) and the old ?tab= values that still resolve to them.
export type NurseTabKey = 'queue' | 'vitals' | 'observation' | 'treatment' | 'specimens' | 'results' | 'handover' | 'register';

export interface NurseTabConfig {
  key: NurseTabKey;
  label: string;
  legacy: string[];
}

export const NURSE_TABS: NurseTabConfig[] = [
  { key: 'queue', label: 'Triage queue', legacy: ['triage-queue', 'triage'] },
  { key: 'vitals', label: 'Vitals & assessment', legacy: [] },
  { key: 'observation', label: 'Day-care observation', legacy: ['observation-beds'] },
  { key: 'treatment', label: 'Treatment room', legacy: ['tasks', 'injections'] },
  { key: 'specimens', label: 'Specimen collection', legacy: ['specimen-desk', 'specimen', 'phlebotomy', 'lab-orders'] },
  { key: 'results', label: 'Lab results', legacy: ['reports-lab'] },
  { key: 'handover', label: 'Shift handover', legacy: ['shift-handover', 'handoff'] },
  { key: 'register', label: 'Triage register', legacy: ['reports'] },
];

/** Any ?tab= value (new, legacy, empty or unknown) resolves to a real section. */
export function resolveNurseTab(param: string | null | undefined): NurseTabKey {
  const clean = (param || '').trim().toLowerCase();
  const hit = NURSE_TABS.find((t) => t.key === clean || t.legacy.includes(clean));
  return hit ? hit.key : 'queue';
}
