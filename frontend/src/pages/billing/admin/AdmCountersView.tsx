// Billing · Admin — billing counters and their hardware: station, IP / MAC binding, receipt printer, card terminal,
// UPI handle and terminal lock. Add (Alt+N), edit, activate or retire a counter.
import React, { useCallback, useEffect, useState } from 'react';
import { Monitor, Pencil, Power, Plus, Save } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, HmsToggle, INPUT } from '../../../components/hms';
import { AdminCounterItem, billingService } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { MONO, fmtWhen } from './adminDeskData';

export interface AdmCountersViewProps {
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
  newSignal: number;
}

const LOCATIONS = [
  { value: 'OPD_LOBBY', label: 'Main OPD lobby' },
  { value: 'IPD_BILLING', label: 'IPD discharge desk' },
  { value: 'EMERGENCY', label: 'Emergency admissions' },
  { value: 'PHARMACY_DESK', label: 'Pharmacy cash desk' },
  { value: 'LAB_COLLECTION', label: 'Lab collection desk' },
  { value: 'DAY_CARE', label: 'Day care billing' },
];
const locLabel = (c: AdminCounterItem) => c.station_location_display || LOCATIONS.find((l) => l.value === c.station_location)?.label || c.station_location || '—';
const PILLS = ['all', 'OPEN', 'CLOSED', 'inactive', 'unlocked'];

interface Form {
  id: string | null;
  code: string;
  name: string;
  location: string;
  active: boolean;
  ip: string;
  mac: string;
  printer: string;
  tid: string;
  vpa: string;
  lock: boolean;
}

const blank = (n: number): Form => ({ id: null, code: `COUNTER-${String(n).padStart(2, '0')}`, name: '', location: 'OPD_LOBBY', active: true, ip: '', mac: '', printer: '', tid: '', vpa: '', lock: true });
const fromCounter = (c: AdminCounterItem): Form => ({
  id: c.id,
  code: c.code,
  name: c.name,
  location: c.station_location || 'OPD_LOBBY',
  active: c.is_active,
  ip: c.hardware?.ip_address || c.ip_terminal_binding || '',
  mac: c.hardware?.mac_address || '',
  printer: c.hardware?.thermal_printer_name || '',
  tid: c.hardware?.pos_terminal_tid || '',
  vpa: c.hardware?.upi_vpa || '',
  lock: !!c.hardware?.is_terminal_lock_enabled,
});

export const AdmCountersView: React.FC<AdmCountersViewProps> = ({ notify, initialFilter, initialSelect, newSignal }) => {
  const { format } = useCurrency();
  const [counters, setCounters] = useState<AdminCounterItem[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `c:${initialSelect}` : null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState(newSignal);

  const load = useCallback(async () => {
    try {
      setCounters(await billingService.getAdminCounters());
      setFailed(null);
    } catch (e) {
      setFailed(apiError(e, 'Counters could not be loaded.'));
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const list = counters || [];
  if (newSignal !== seen) {
    setSeen(newSignal);
    setForm(blank(list.length + 1));
  }

  const match = (c: AdminCounterItem, p: string) => (p === 'all' ? true : p === 'inactive' ? !c.is_active : p === 'unlocked' ? c.is_active && !c.hardware?.is_terminal_lock_enabled : c.is_active && c.shift_status === p);
  const q = search.trim().toLowerCase();
  const visible = list.filter((c) => match(c, pill) && (!q || [c.code, c.name, locLabel(c), c.active_cashier, c.hardware?.ip_address].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = visible.map((c) => ({
    key: `c:${c.code}`,
    title: c.name,
    badge: !c.is_active ? <HmsBadge tone="gray">Inactive</HmsBadge> : c.shift_status === 'OPEN' ? <HmsBadge tone="green">Open</HmsBadge> : <HmsBadge tone="blue">Closed</HmsBadge>,
    sub: (
      <>
        <span style={MONO}>{c.code}</span> · {locLabel(c)}
      </>
    ),
    metaLeft: c.shift_status === 'OPEN' ? c.active_cashier || 'Cashier on shift' : 'No shift',
    metaRight: c.shift_status === 'OPEN' ? `${format(c.drawer_cash)} in drawer` : c.hardware?.is_terminal_lock_enabled ? 'Terminal locked' : 'No terminal lock',
  }));

  const save = async () => {
    if (!form) return;
    if (!form.code.trim() || !form.name.trim()) return notify('Code and name are required', 'error');
    setBusy(true);
    const payload: Partial<AdminCounterItem> = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      station_location: form.location,
      is_active: form.active,
      ip_terminal_binding: form.ip.trim(),
      hardware: { ip_address: form.ip.trim(), mac_address: form.mac.trim(), thermal_printer_name: form.printer.trim(), pos_terminal_tid: form.tid.trim(), upi_vpa: form.vpa.trim(), is_terminal_lock_enabled: form.lock, status: 'ONLINE' },
    };
    try {
      const saved = form.id ? await billingService.updateAdminCounter(form.id, payload) : await billingService.createAdminCounter(payload);
      notify(`${saved.name || payload.name} ${form.id ? 'updated' : 'added'}`);
      setForm(null);
      setSelected(`c:${saved.code || payload.code}`);
      await load();
    } catch (e) {
      notify(apiError(e, 'The counter could not be saved'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (c: AdminCounterItem) => {
    setBusy(true);
    try {
      await billingService.updateAdminCounter(c.id, { is_active: !c.is_active });
      notify(`${c.name} ${c.is_active ? 'deactivated' : 'activated'}`);
      await load();
    } catch (e) {
      notify(apiError(e, 'The counter could not be changed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const renderDetail = (key: string | null) => {
    if (!counters && !failed) return <HmsEmpty>Loading counters…</HmsEmpty>;
    if (failed) return <HmsEmpty>{failed}</HmsEmpty>;
    const c = list.find((x) => `c:${x.code}` === key);
    if (!c) return <HmsEmpty>{list.length ? 'Select a counter from the list.' : 'No billing counters yet. Add one with Alt+N.'}</HmsEmpty>;
    const hw = c.hardware;
    const open = c.shift_status === 'OPEN';
    return (
      <>
        <HmsDetailHeader
          icon={Monitor}
          title={c.name}
          badge={!c.is_active ? <HmsBadge tone="gray">Inactive</HmsBadge> : open ? <HmsBadge tone="green">Shift open</HmsBadge> : <HmsBadge tone="blue">Closed</HmsBadge>}
          subtitle={
            <>
              <span style={MONO}>{c.code}</span> · {locLabel(c)}
            </>
          }
          actions={
            <HmsButton icon={Pencil} onClick={() => setForm(fromCounter(c))}>
              Edit
            </HmsButton>
          }
        />
        <HmsStatStrip
          items={[
            { label: 'Shift', value: open ? 'Open' : 'Closed', note: open ? c.active_cashier || '—' : 'No cashier' },
            { label: 'Drawer cash', value: open ? format(c.drawer_cash) : '—' },
            { label: 'Terminal lock', value: hw?.is_terminal_lock_enabled ? 'On' : 'Off', tone: hw?.is_terminal_lock_enabled ? 'green' : 'amber', note: 'Login only from this PC' },
            { label: 'Hardware', value: hw?.status ? hw.status.charAt(0) + hw.status.slice(1).toLowerCase() : '—', note: hw?.last_heartbeat_at ? `Seen ${fmtWhen(hw.last_heartbeat_at)}` : 'No heartbeat recorded' },
          ]}
        />
        <HmsDetailBody>
          {c.is_active && !hw?.is_terminal_lock_enabled && <HmsNotice tone="amber">Terminal lock is off: this counter can be opened from any computer. Turn it on to bind cash collection to the registered PC.</HmsNotice>}
          {!c.is_active && <HmsNotice tone="blue">Inactive counters cannot open a shift. Past shifts and receipts stay on record.</HmsNotice>}
          <HmsSection title="Hardware binding">
            <HmsRow label="IP address" value={<span style={MONO}>{hw?.ip_address || c.ip_terminal_binding || '—'}</span>} />
            <HmsRow label="MAC address" value={<span style={MONO}>{hw?.mac_address || '—'}</span>} />
            <HmsRow label="Receipt printer" value={hw?.thermal_printer_name || '—'} />
            <HmsRow label="Card terminal (TID)" value={<span style={MONO}>{hw?.pos_terminal_tid || '—'}</span>} />
            <HmsRow label="UPI handle" value={<span style={MONO}>{hw?.upi_vpa || '—'}</span>} last />
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton variant={c.is_active ? 'danger' : 'primary'} icon={Power} block disabled={busy || (c.is_active && open)} title={c.is_active && open ? 'Close the open shift before deactivating' : undefined} onClick={() => toggle(c)}>
            {c.is_active ? 'Deactivate counter' : 'Activate counter'}
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <>
      <HmsMasterDetail
        listId="adm-counters"
        title="Counters & hardware"
        description="Cash collection stations, their hardware binding and terminal lock."
        total={list.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search counter, location, cashier or IP"
        headerAction={
          <HmsButton size="sm" icon={Plus} onClick={() => setForm(blank(list.length + 1))} title="Add a counter (Alt+N)" aria-keyshortcuts="Alt+N">
            Add
          </HmsButton>
        }
        pills={[
          { key: 'all', label: 'All', count: list.length },
          { key: 'OPEN', label: 'Shift open', count: list.filter((c) => c.is_active && c.shift_status === 'OPEN').length },
          { key: 'CLOSED', label: 'Closed', count: list.filter((c) => c.is_active && c.shift_status === 'CLOSED').length },
          { key: 'unlocked', label: 'No terminal lock', count: list.filter((c) => c.is_active && !c.hardware?.is_terminal_lock_enabled).length, tone: 'amber' },
          { key: 'inactive', label: 'Inactive', count: list.filter((c) => !c.is_active).length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="edit counter"
        onPrimary={(k) => {
          const c = list.find((x) => `c:${x.code}` === k);
          if (c) setForm(fromCounter(c));
        }}
        detailLabel="Counter"
        emptyText="No counters match this search or filter."
        renderDetail={renderDetail}
      />
      {form && (
        <HmsModal
          title={form.id ? `Edit ${form.name || form.code}` : 'Add a billing counter'}
          description="Bind the counter to its PC and payment hardware. Changes apply from the next shift."
          onClose={() => setForm(null)}
          busy={busy}
          width={640}
          footer={
            <>
              <HmsButton onClick={() => setForm(null)}>Cancel</HmsButton>
              <HmsButton variant="primary" icon={Save} onClick={save} disabled={busy}>
                {busy ? 'Saving…' : form.id ? 'Save changes' : 'Add counter'}
              </HmsButton>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
            <HmsField label="Code" htmlFor="ac-code" required>
              <input id="ac-code" style={{ ...INPUT, ...MONO, fontSize: '14px' }} value={form.code} onChange={set('code')} disabled={!!form.id} autoFocus={!form.id} />
            </HmsField>
            <HmsField label="Name" htmlFor="ac-name" required>
              <input id="ac-name" style={INPUT} value={form.name} onChange={set('name')} placeholder="Counter 3 · OPD lobby" autoFocus={!!form.id} />
            </HmsField>
            <HmsField label="Location" htmlFor="ac-loc">
              <select id="ac-loc" style={INPUT} value={form.location} onChange={set('location')}>
                {LOCATIONS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </HmsField>
            <HmsField label="IP address" htmlFor="ac-ip">
              <input id="ac-ip" style={INPUT} value={form.ip} onChange={set('ip')} placeholder="192.168.1.21" />
            </HmsField>
            <HmsField label="MAC address" htmlFor="ac-mac">
              <input id="ac-mac" style={INPUT} value={form.mac} onChange={set('mac')} />
            </HmsField>
            <HmsField label="Receipt printer" htmlFor="ac-pr">
              <input id="ac-pr" style={INPUT} value={form.printer} onChange={set('printer')} />
            </HmsField>
            <HmsField label="Card terminal TID" htmlFor="ac-tid">
              <input id="ac-tid" style={INPUT} value={form.tid} onChange={set('tid')} />
            </HmsField>
            <HmsField label="UPI handle" htmlFor="ac-vpa">
              <input id="ac-vpa" style={INPUT} value={form.vpa} onChange={set('vpa')} placeholder="hospital@bank" />
            </HmsField>
          </div>
          <div style={{ display: 'flex', gap: '24px', marginTop: '16px', flexWrap: 'wrap' }}>
            <HmsToggle checked={form.lock} onChange={(v) => setForm({ ...form, lock: v })} label="Terminal lock (open only from this PC)" showLabel />
            <HmsToggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Active" showLabel />
          </div>
        </HmsModal>
      )}
    </>
  );
};
