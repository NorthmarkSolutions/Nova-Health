// OPD admin configuration on the server. The admin screens keep saving through the department store (browser cache);
// this module publishes each OPD change to the server (/opd/config/<kind>/) and pulls changes made on other browsers,
// so every desk prices, books and checks policy from the same settings. Only the OPD admin publishes.
import api from './api';
import {
  getDepartmentDoctors,
  getDepartmentRooms,
  getDepartmentSchedules,
  getDepartmentTariffMaster,
  getDepartmentWorkspaceById,
} from '../pages/department/departmentWorkspaceStore';

const OPD = '1';
type Kind = 'workspace' | 'doctors' | 'rooms' | 'schedules' | 'tariff';
const KEYS = {
  workspace: 'north_hospital_dept_workspaces',
  doctors: 'north_hospital_dept_doctors',
  rooms: 'north_hospital_dept_rooms',
  schedules: 'north_hospital_dept_schedules',
  tariff: 'north_hospital_dept_tariffs_v1',
} as const;
const EVENTS: Record<string, Kind> = {
  north_hospital_workspaces_updated: 'workspace',
  north_hospital_dept_doctors_updated: 'doctors',
  north_hospital_dept_rooms_updated: 'rooms',
  north_hospital_dept_schedules_updated: 'schedules',
  north_hospital_dept_tariff_updated: 'tariff',
};
const VERSIONS = 'nh_opd_config_versions';
const ADMIN_ROLES = ['DEPARTMENT_ADMIN', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'];

let applying = false;
let started = false;
const timers: Partial<Record<Kind, ReturnType<typeof setTimeout>>> = {};

const signedIn = () => {
  const t = localStorage.getItem('token');
  return !!t && !t.startsWith('local-');
};
const isAdmin = () => {
  try {
    return ADMIN_ROLES.includes(JSON.parse(localStorage.getItem('user') || '{}').role);
  } catch {
    return false;
  }
};
const versions = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(VERSIONS) || '{}');
  } catch {
    return {};
  }
};
const setVersion = (kind: Kind, v: number) => localStorage.setItem(VERSIONS, JSON.stringify({ ...versions(), [kind]: v }));
const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

/** What this browser holds for the OPD department, in the shape the server stores. */
const local = (kind: Kind): unknown => {
  switch (kind) {
    case 'workspace': return getDepartmentWorkspaceById(OPD);
    case 'doctors': return getDepartmentDoctors(OPD);
    case 'rooms': return getDepartmentRooms(OPD);
    case 'schedules': return getDepartmentSchedules(OPD);
    default: return getDepartmentTariffMaster(OPD);
  }
};

async function publish(kind: Kind) {
  if (!signedIn() || !isAdmin()) return;
  try {
    const res = await api.put<{ version: number; changes: string[] }>(`/opd/config/${kind}/`, { data: local(kind) });
    setVersion(kind, res.data.version);
  } catch (err) {
    const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'OPD settings were not saved on the server.';
    window.dispatchEvent(new CustomEvent('nh_opd_api_error', { detail: msg }));
  }
}

const isOpd = (x: { departmentId?: string }) => String(x?.departmentId ?? OPD) === OPD;

/** Write a server document into the browser cache (replacing only the OPD department's part). */
function apply(kind: Kind, data: unknown) {
  if (kind === 'workspace') {
    const ws = data as { id?: string; departmentId?: string };
    const all = read<Array<{ id?: string; departmentId?: string }>>(KEYS.workspace, []);
    const i = all.findIndex((w) => w.id === ws.id || (ws.departmentId && w.departmentId === ws.departmentId));
    localStorage.setItem(KEYS.workspace, JSON.stringify(i === -1 ? [...all, ws] : all.map((w, j) => (j === i ? ws : w))));
  } else if (kind === 'tariff') {
    const t = data as { departmentId?: string };
    localStorage.setItem(KEYS.tariff, JSON.stringify({ ...read<Record<string, unknown>>(KEYS.tariff, {}), [t.departmentId || OPD]: t }));
  } else {
    const key = KEYS[kind];
    const others = read<Array<{ departmentId?: string }>>(key, []).filter((x) => !isOpd(x));
    localStorage.setItem(key, JSON.stringify([...(data as unknown[]), ...others]));
  }
}

export async function pullOpdConfig() {
  if (!signedIn()) return;
  try {
    const res = await api.get<{ docs: Record<string, { data: unknown; version: number }> }>('/opd/config/');
    const docs = res.data.docs || {};
    const mine = versions();
    const changed: Kind[] = [];
    (Object.keys(KEYS) as Kind[]).forEach((kind) => {
      const doc = docs[kind];
      if (!doc) {
        if (isAdmin()) void publish(kind); // first admin browser seeds the server from its settings
        return;
      }
      if ((mine[kind] || 0) < doc.version) {
        apply(kind, doc.data);
        setVersion(kind, doc.version);
        changed.push(kind);
      }
    });
    if (changed.length) {
      applying = true;
      try {
        Object.entries(EVENTS).forEach(([ev, kind]) => changed.includes(kind) && window.dispatchEvent(new CustomEvent(ev)));
        window.dispatchEvent(new Event('nh_data_sync'));
      } finally {
        applying = false;
      }
    }
  } catch {
    /* offline: keep the cached settings */
  }
}

export function startOpdConfigSync() {
  if (started || typeof window === 'undefined') return;
  started = true;
  Object.entries(EVENTS).forEach(([ev, kind]) =>
    window.addEventListener(ev, () => {
      if (applying || !signedIn() || !isAdmin()) return;
      clearTimeout(timers[kind]);
      timers[kind] = setTimeout(() => void publish(kind), 400);
    }),
  );
  void pullOpdConfig();
  setInterval(() => {
    if (signedIn() && document.visibilityState === 'visible') void pullOpdConfig();
  }, 15000);
}
