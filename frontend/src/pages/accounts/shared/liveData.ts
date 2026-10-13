// Accounts · helpers that keep live data calm: no re-render when a refresh returns what is already on screen.

/** Merge freshly loaded sources into state, keeping the previous object (and identity) for anything unchanged. */
export const mergeChanged = <T extends object>(prev: T, next: Partial<T>): T => {
  let changed = false;
  const out = { ...prev };
  for (const key of Object.keys(next) as (keyof T)[]) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
      out[key] = next[key] as T[keyof T];
      changed = true;
    }
  }
  return changed ? out : prev;
};

/** Same list of labels (e.g. failed sources) → keep the previous array so nothing re-renders. */
export const sameList = (prev: string[], next: string[]) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next);
