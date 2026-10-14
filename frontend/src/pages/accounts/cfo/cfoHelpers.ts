// CFO · shared view props.
import type { CfoSnapshot } from './cfoData';

export interface CfoViewProps {
  data: CfoSnapshot;
  notify: (message: string, tone?: 'success' | 'error') => void;
  onNavigateTab: (tab: string, filter?: string, select?: string) => void;
  /** Filter pill to open with (from a KPI click or ?filter= in the URL). */
  initialFilter?: string;
  /** Record to open selected (?select= in the URL). */
  initialSelect?: string;
}
