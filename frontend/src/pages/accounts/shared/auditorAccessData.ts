// Accounts · auditor access data (Finance Controller and CFO): engagements with their grants, and auditor logins.
import { useCallback, useEffect, useRef, useState } from 'react';
import { accountsService, AuditEngagementItem, AuditorUserItem } from '../../../services/accountsService';
import { mergeChanged, sameList } from './liveData';

export const GRANT_DAYS = [1, 7, 15, 30] as const;
export type GrantDays = (typeof GRANT_DAYS)[number];

export interface AuditAccessSnapshot {
  engagements: AuditEngagementItem[];
  auditors: AuditorUserItem[];
  loading: boolean;
  failed: string[];
  reload: () => Promise<void>;
}

type Data = Pick<AuditAccessSnapshot, 'engagements' | 'auditors'>;
const EMPTY: Data = { engagements: [], auditors: [] };

export const useAuditAccessData = (): AuditAccessSnapshot => {
  const [data, setData] = useState<Data>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const alive = useRef(true);

  const reload = useCallback(async () => {
    const [eng, aud] = await Promise.allSettled([accountsService.getAuditEngagements(), accountsService.getAuditorUsers()]);
    if (!alive.current) return;
    const next: Partial<Data> = {};
    const missing: string[] = [];
    if (eng.status === 'fulfilled') next.engagements = eng.value;
    else missing.push('Engagements');
    if (aud.status === 'fulfilled') next.auditors = aud.value;
    else missing.push('Auditors');
    setData((prev) => mergeChanged(prev, next));
    setFailed((prev) => sameList(prev, missing));
    setLoading(false);
  }, []);

  useEffect(() => {
    alive.current = true;
    Promise.resolve().then(reload);
    const tick = window.setInterval(reload, 60000);
    return () => {
      alive.current = false;
      window.clearInterval(tick);
    };
  }, [reload]);

  return { ...data, loading, failed, reload };
};

/** End of the engagement's last fieldwork day — the server never lets access run past this. */
export const fieldworkEnd = (e: AuditEngagementItem) => new Date(`${e.fieldwork_to}T23:59:59`);

export const engagementPhase = (e: AuditEngagementItem, now = new Date()): 'upcoming' | 'live' | 'ended' => {
  if (fieldworkEnd(e) < now) return 'ended';
  return new Date(`${e.fieldwork_from}T00:00:00`) > now ? 'upcoming' : 'live';
};

/** When a grant chosen now would end: the chosen length, or the fieldwork end if that comes first. */
export const grantEnd = (e: AuditEngagementItem, days: GrantDays, now = new Date()) => {
  const wanted = new Date(now.getTime() + days * 86400000);
  const cap = fieldworkEnd(e);
  return { end: wanted < cap ? wanted : cap, capped: wanted >= cap };
};

export const fmtDateTime = (d: Date | string) => {
  const x = typeof d === 'string' ? new Date(d) : d;
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const fmtDay = (iso: string) => {
  const x = new Date(`${iso}T00:00:00`);
  return Number.isNaN(x.getTime()) ? iso || '—' : x.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const AUDIT_TYPES: [string, string][] = [
  ['statutory', 'Statutory'],
  ['internal', 'Internal'],
  ['tax', 'Tax'],
  ['special', 'Special'],
];
