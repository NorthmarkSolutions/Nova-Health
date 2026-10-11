// Shared props and badge helpers for the Lab Admin views.
import React from 'react';
import { HmsBadge, HmsTone } from '../../../components/hms';
import type { LabAdminSnapshot, LabStaffStatus } from '../data/labAdminStore';
import { STAGE_LABEL } from '../data/labAdminStore';
import type { AnalyzerItem, LabQueueOrder } from '../data/labDataStore';

export interface LabAdminViewProps {
  data: LabAdminSnapshot;
  /** Signed-in admin's name, recorded on every change. */
  by: string;
  notify: (message: string, tone?: 'success' | 'error') => void;
  onNavigateTab: (tab: string) => void;
  /** Increments when Alt+N is pressed on this section. */
  newSignal: number;
  /** Filter pill to open with (from a KPI click or ?filter= in the URL). */
  initialFilter?: string;
}

export const STAFF_STATUS_TONE: Record<LabStaffStatus, HmsTone> = {
  'On duty': 'green',
  Rostered: 'blue',
  'On call': 'gray',
  'Off today': 'gray',
  'On leave': 'amber',
  Suspended: 'red',
};

export const ANALYZER_TONE: Record<AnalyzerItem['status'], HmsTone> = {
  Running: 'green',
  Ready: 'blue',
  Maintenance: 'amber',
  Offline: 'red',
};

export const stageTone = (stage: LabQueueOrder['stage']): HmsTone =>
  stage === 'SIGNED_OFF' ? 'green' : stage === 'ORDERED' ? 'amber' : stage === 'PENDING_REVIEW' || stage === 'RESULT_ENTERED' ? 'blue' : 'gray';

export const StageBadge: React.FC<{ stage: LabQueueOrder['stage'] }> = ({ stage }) => <HmsBadge tone={stageTone(stage)}>{STAGE_LABEL[stage]}</HmsBadge>;

export const PriorityBadge: React.FC<{ priority: LabQueueOrder['priority'] }> = ({ priority }) => (
  <HmsBadge tone={priority === 'STAT' ? 'red' : priority === 'Urgent' ? 'amber' : 'gray'}>{priority.toUpperCase()}</HmsBadge>
);

/** Download rows as a CSV file (used by every export button — no placeholder exports). */
export const downloadCsv = (filename: string, header: string[], rows: (string | number)[][]) => {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
