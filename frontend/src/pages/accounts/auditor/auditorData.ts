// Auditor · one data hook for the read-only engagement workspace (HMS bible 19.11).
// Access is time-boxed per engagement: when /auditor/me is refused, nothing else is requested.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  accountsService,
  AuditorControls,
  AuditorIntegrity,
  AuditorLedgerEntry,
  AuditorLogEntry,
  AuditorMe,
  AuditorPBCItem,
} from '../../../services/accountsService';
import { apiError } from '../executive/executiveData';
import { mergeChanged, sameList } from '../shared/liveData';

export interface AuditorSnapshot {
  me: AuditorMe | null;
  integrity: AuditorIntegrity | null;
  pbc: AuditorPBCItem[];
  controls: AuditorControls | null;
  logs: AuditorLogEntry[];
  ledger: AuditorLedgerEntry[];
  /** Server's reason when access is refused (expired, revoked, outside the engagement window). */
  denied: string | null;
  loading: boolean;
  failed: string[];
  lastSync: Date | null;
  reload: () => Promise<void>;
}

type Data = Pick<AuditorSnapshot, 'me' | 'integrity' | 'pbc' | 'controls' | 'logs' | 'ledger'>;
const EMPTY: Data = { me: null, integrity: null, pbc: [], controls: null, logs: [], ledger: [] };

const SOURCES: [keyof Data, string, () => Promise<unknown>][] = [
  ['integrity', 'Integrity', () => accountsService.getAuditorIntegrity()],
  ['pbc', 'Shared evidence', () => accountsService.getAuditorPBC()],
  ['controls', 'Internal controls', () => accountsService.getAuditorControls()],
  ['logs', 'Audit trail', async () => (await accountsService.getAuditorLogs()).logs],
  ['ledger', 'General ledger', async () => (await accountsService.getAuditorLedger()).entries],
];
const OBJECTS: (keyof Data)[] = ['integrity', 'controls'];
// Auditor views are recorded in the audit trail on every request, so refresh less often than the operational roles
const REFRESH_MS = 120000;

export const useAuditorData = (): AuditorSnapshot => {
  const [data, setData] = useState<Data>(EMPTY);
  const [denied, setDenied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const alive = useRef(true);

  const reload = useCallback(async () => {
    const [meRes] = await Promise.allSettled([accountsService.getAuditorMe()]);
    if (!alive.current) return;
    if (meRes.status === 'rejected') {
      const e = meRes.reason;
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 403 || status === 401) {
        setDenied(apiError(e, 'Your audit access is not active.'));
        setData(EMPTY);
        setFailed((prev) => sameList(prev, []));
      } else {
        setFailed((prev) => sameList(prev, ['Engagement']));
      }
      setLastSync(new Date());
      setLoading(false);
      return;
    }
    const me: AuditorMe = meRes.value;
    const results = await Promise.allSettled(SOURCES.map(([, , load]) => load()));
    if (!alive.current) return;
    const next: Record<string, unknown> = { me };
    const missing: string[] = [];
    results.forEach((r, i) => {
      const [key, label] = SOURCES[i];
      if (r.status === 'fulfilled') next[key] = OBJECTS.includes(key) ? r.value ?? null : Array.isArray(r.value) ? r.value : [];
      else missing.push(label);
    });
    setDenied(null);
    setData((prev) => mergeChanged(prev, next as Partial<Data>));
    setFailed((prev) => sameList(prev, missing));
    setLastSync(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    alive.current = true;
    // First load starts on the next microtask (same timing in practice; keeps the effect free of synchronous state updates)
    Promise.resolve().then(reload);
    const tick = window.setInterval(reload, REFRESH_MS);
    return () => {
      alive.current = false;
      window.clearInterval(tick);
    };
  }, [reload]);

  return { ...data, denied, loading, failed, lastSync, reload };
};

/** "2026-10-13T…" → "13 Oct 2026, 11:52" */
export const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export const rupees = (n: number | string) => '₹ ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

/** Whole days from now until an ISO date (negative once passed). */
export const daysUntil = (iso?: string | null) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.ceil((t - Date.now()) / 86400000);
};
