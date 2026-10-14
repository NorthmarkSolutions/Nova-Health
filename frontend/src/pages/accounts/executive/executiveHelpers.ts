// Accounts Executive · shared view props and helpers (no components, so Fast Refresh keeps working).
import React from 'react';
import type { HmsTone } from '../../../components/hms';
import { apiError, type ExecutiveSnapshot } from './executiveData';

export type ExecutiveDialog = 'journal' | 'bill' | 'expense' | null;

export interface ExecutiveViewProps {
  data: ExecutiveSnapshot;
  notify: (message: string, tone?: 'success' | 'error') => void;
  onNavigateTab: (tab: string, filter?: string) => void;
  /** Opens a workspace-level form (New journal, Record vendor bill, Raise expense). */
  openDialog: (d: Exclude<ExecutiveDialog, null>) => void;
  onOpenMaster?: (master: 'coa' | 'dofa' | 'audit') => void;
  /** Increments when Alt+N is pressed on this section. */
  newSignal: number;
  /** Filter pill to open with (from a KPI click or ?filter= in the URL). */
  initialFilter?: string;
  /** Record to open selected (from the overview queue, ?select= in the URL). */
  initialSelect?: string;
}

const STATUS_TONE: Record<string, HmsTone> = {
  draft: 'gray',
  received: 'gray',
  pending_validation: 'amber',
  validated: 'green',
  posted: 'green',
  approved: 'green',
  matched: 'green',
  settled: 'green',
  recovered: 'green',
  paid: 'green',
  submitted: 'blue',
  in_approval: 'blue',
  pending: 'blue',
  forwarded: 'blue',
  scheduled: 'blue',
  suggested: 'blue',
  promised: 'blue',
  open: 'blue',
  partially_settled: 'blue',
  returned: 'amber',
  on_hold: 'amber',
  for_review: 'amber',
  due_today: 'amber',
  followup_required: 'amber',
  disputed: 'amber',
  escalated: 'red',
  unmatched: 'red',
  rejected: 'red',
  rejected_technical: 'red',
  rejected_business: 'red',
  cancelled: 'gray',
  withdrawn: 'gray',
  excluded: 'gray',
  reversed: 'gray',
  written_off: 'gray',
  proposed: 'blue',
  confirmed: 'green',
  with_manager: 'blue',
  resolved: 'green',
  closed: 'green',
  locked: 'gray',
  approve: 'green',
  approve_and_forward: 'blue',
  return: 'amber',
  reject: 'red',
  escalate: 'red',
};

const STATUS_LABEL: Record<string, string> = {
  pending_validation: 'To validate',
  in_approval: 'In approval',
  rejected_technical: 'Rejected · technical',
  rejected_business: 'Rejected · business',
  partially_settled: 'Part settled',
  followup_required: 'Follow-up due',
  due_today: 'Due today',
  for_review: 'For review',
  on_hold: 'On hold',
  written_off: 'Written off',
  proposed: 'To review',
  with_manager: 'With manager',
  approve: 'Approved',
  approve_and_forward: 'Verified & forwarded',
  return: 'Returned',
  reject: 'Rejected',
  escalate: 'Escalated',
};

export const statusTone = (s?: string): HmsTone => (s && STATUS_TONE[s]) || 'gray';

export const statusLabel = (s?: string) => {
  if (!s) return '—';
  if (STATUS_LABEL[s]) return STATUS_LABEL[s];
  const t = s.replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};


export const MONO: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px' };

/** Edge-triggered Alt+N: runs `open` once each time the signal increments. */
export const useNewSignal = (newSignal: number, open: () => void) => {
  const [seen, setSeen] = React.useState(newSignal);
  if (newSignal !== seen) {
    setSeen(newSignal);
    if (newSignal > 0) open();
  }
};

/** Runs one server action at a time per view: busy key, toast on success or with the server's reason, then reload. */
export const useAction = (data: Pick<ExecutiveSnapshot, 'reload'>, notify: ExecutiveViewProps['notify']) => {
  const [busy, setBusy] = React.useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<unknown>, ok: string, fail: string) => {
    setBusy(key);
    try {
      await fn();
      notify(ok);
      await data.reload();
      return true;
    } catch (e) {
      notify(apiError(e, fail), 'error');
      return false;
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
};
