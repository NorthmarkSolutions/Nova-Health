// Auditor · shared view props (read-only: no actions, only navigation).
import type { AuditorSnapshot } from './auditorData';

export interface AuditorViewProps {
  data: AuditorSnapshot;
  onNavigateTab: (tab: string, filter?: string, select?: string) => void;
  /** Filter pill to open with (from a KPI click or ?filter= in the URL). */
  initialFilter?: string;
  /** Record to open selected (?select= in the URL). */
  initialSelect?: string;
}
