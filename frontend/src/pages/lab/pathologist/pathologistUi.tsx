// Shared props and badges for the Pathologist views.
import React from 'react';
import { HmsBadge } from '../../../components/hms';
import type { PathologistSnapshot, ResultFlag } from '../data/pathologistStore';
import type { LabQueueOrder } from '../data/labDataStore';
import { FLAG_TONE } from './pathologistFormat';

export interface PathologistViewProps {
  data: PathologistSnapshot;
  /** Signed-in pathologist's name, recorded on every sign-off and change. */
  by: string;
  notify: (message: string, tone?: 'success' | 'error') => void;
  onNavigateTab: (tab: string, filter?: string) => void;
  /** Increments when Alt+N is pressed on this section. */
  newSignal: number;
  /** Filter pill to open with (from a KPI click or ?filter= in the URL). */
  initialFilter?: string;
}

export const FlagBadge: React.FC<{ flag: ResultFlag | 'Pending' }> = ({ flag }) => <HmsBadge tone={FLAG_TONE[flag]}>{flag}</HmsBadge>;

export const PriorityBadge: React.FC<{ priority: LabQueueOrder['priority'] }> = ({ priority }) => (
  <HmsBadge tone={priority === 'STAT' ? 'red' : priority === 'Urgent' ? 'amber' : 'gray'}>{priority.toUpperCase()}</HmsBadge>
);
