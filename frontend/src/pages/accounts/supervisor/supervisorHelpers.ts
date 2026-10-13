// Accounts Supervisor · shared view props.
import type { SupervisorSnapshot } from './supervisorData';

export interface SupervisorViewProps {
  data: SupervisorSnapshot;
  notify: (message: string, tone?: 'success' | 'error') => void;
  onNavigateTab: (tab: string, filter?: string, select?: string) => void;
  /** Increments when Alt+N is pressed on this section. */
  newSignal: number;
  /** Filter pill to open with (from a KPI click or ?filter= in the URL). */
  initialFilter?: string;
  /** Record to open selected (?select= in the URL). */
  initialSelect?: string;
}
