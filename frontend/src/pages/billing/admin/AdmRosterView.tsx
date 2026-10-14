// Billing · Admin — weekly counter roster. Each day shows how many counter shifts are covered; the right box assigns
// a cashier to every counter for morning, evening and night. Double-booking a person in the same shift is refused.
// Save keeps a draft; Publish releases the week so cashiers can log in to their counters.
import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Save, Send } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsNotice, HmsEmpty, HmsStat, INPUT, HMS } from '../../../components/hms';
import { billingService, StaffRosterData } from '../../../services/billingService';
import { apiError } from '../executive/executiveUi';
import { fmtDate } from './adminDeskData';

export interface AdmRosterViewProps {
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialSelect?: string;
}

const SHIFTS = [
  { key: 'MORNING', label: 'Morning', hours: '08:00–16:00' },
  { key: 'EVENING', label: 'Evening', hours: '16:00–00:00' },
  { key: 'NIGHT', label: 'Night', hours: '00:00–08:00' },
] as const;
const slotKey = (counter: string, date: string, shift: string) => `${counter}|${date}|${shift}`;
const dayName = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long' });
const shiftWeek = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-CA');
};

export const AdmRosterView: React.FC<AdmRosterViewProps> = ({ notify, initialSelect }) => {
  const [week, setWeek] = useState<string | undefined>(undefined);
  const [data, setData] = useState<StaffRosterData | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [map, setMap] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `d:${initialSelect}` : null);

  const load = useCallback(async (weekStart?: string) => {
    try {
      const r = await billingService.getAdminStaffRoster({ week_start: weekStart });
      setData(r);
      const m: Record<string, string> = {};
      r.roster.forEach((a) => (m[slotKey(a.counter_id, a.roster_date, a.shift_type)] = a.staff_id));
      setMap(m);
      setDirty(false);
      setFailed(null);
    } catch (e) {
      setFailed(apiError(e, 'The roster could not be loaded.'));
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load(week));
  }, [load, week]);

  const saved = new Set((data?.roster || []).map((a) => slotKey(a.counter_id, a.roster_date, a.shift_type)));
  const counters = data?.counters || [];
  const totalSlots = counters.length * SHIFTS.length;
  const filled = (date: string) => counters.reduce((n, c) => n + SHIFTS.filter((s) => map[slotKey(c.id, date, s.key)]).length, 0);
  const staffName = (id: string) => data?.staff.find((s) => s.id === id)?.name || '—';

  const q = search.trim().toLowerCase();
  const days = (data?.week_dates || []).filter((d) => !q || `${dayName(d)} ${fmtDate(d)}`.toLowerCase().includes(q) || counters.some((c) => SHIFTS.some((s) => staffName(map[slotKey(c.id, d, s.key)] || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = days.map((d) => {
    const n = filled(d);
    return {
      key: `d:${d}`,
      title: dayName(d),
      badge: n === 0 ? <HmsBadge tone="red">Not staffed</HmsBadge> : n < totalSlots ? <HmsBadge tone="amber">{`${totalSlots - n} open`}</HmsBadge> : <HmsBadge tone="green">Covered</HmsBadge>,
      sub: fmtDate(d),
      metaLeft: `${n} of ${totalSlots} counter shifts`,
      metaRight: `${new Set(counters.flatMap((c) => SHIFTS.map((s) => map[slotKey(c.id, d, s.key)]).filter(Boolean))).size} people`,
      progress: totalSlots ? { pct: (n / totalSlots) * 100, doneLabel: 'Fully covered' } : undefined,
    };
  });

  const assign = (counterId: string, date: string, shift: string, staffId: string) => {
    const key = slotKey(counterId, date, shift);
    if (staffId) {
      const clash = Object.entries(map).find(([k, sid]) => sid === staffId && k !== key && k.endsWith(`|${date}|${shift}`));
      if (clash) {
        const other = counters.find((c) => c.id === clash[0].split('|')[0]);
        return notify(`${staffName(staffId)} is already on ${other?.name || 'another counter'} for this ${shift.toLowerCase()} shift`, 'error');
      }
    }
    setMap((m) => {
      const next = { ...m };
      if (staffId) next[key] = staffId;
      else delete next[key];
      return next;
    });
    setDirty(true);
  };

  const save = async (): Promise<boolean> => {
    const assignments = Object.entries(map).map(([k, staff_id]) => {
      const [counter_id, roster_date, shift_type] = k.split('|');
      return { counter_id, staff_id, roster_date, shift_type };
    });
    if (!assignments.length) {
      notify('Assign at least one shift first', 'error');
      return false;
    }
    setBusy(true);
    try {
      await billingService.assignAdminStaffRoster(assignments);
      notify('Roster saved as a draft');
      await load(data?.week_start);
      return true;
    } catch (e) {
      notify(apiError(e, 'The roster could not be saved'), 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (dirty && !(await save())) return;
    setBusy(true);
    try {
      const r = await billingService.publishAdminStaffRoster(data?.week_start);
      notify(`Week published · ${r.count} shift${r.count === 1 ? '' : 's'} released to cashiers`);
      await load(data?.week_start);
    } catch (e) {
      notify(apiError(e, 'The roster could not be published'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const renderDetail = (key: string | null) => {
    if (!data && !failed) return <HmsEmpty>Loading the roster…</HmsEmpty>;
    if (failed) return <HmsEmpty>{failed}</HmsEmpty>;
    const date = key?.slice(2);
    if (!date || !data?.week_dates.includes(date)) return <HmsEmpty>Select a day from the list.</HmsEmpty>;
    if (!counters.length) return <HmsEmpty>No active counters. Add counters under Counters & hardware first.</HmsEmpty>;
    const n = filled(date);
    return (
      <>
        <HmsDetailHeader icon={CalendarDays} title={`${dayName(date)} · ${fmtDate(date)}`} badge={data.is_published ? <HmsBadge tone="green">Published</HmsBadge> : <HmsBadge tone="amber">Draft</HmsBadge>} subtitle={`Week ${fmtDate(data.week_start)} – ${fmtDate(data.week_end)}`} />
        <HmsStatStrip
          items={SHIFTS.map((s): HmsStat => ({ label: s.label, value: `${counters.filter((c) => map[slotKey(c.id, date, s.key)]).length} / ${counters.length}`, note: s.hours, tone: counters.every((c) => map[slotKey(c.id, date, s.key)]) ? ('green' as const) : ('amber' as const) })).concat([
            { label: 'Covered', value: `${n} / ${totalSlots}`, note: 'Counter shifts', tone: n === totalSlots ? 'green' : 'amber' },
          ])}
        />
        <HmsDetailBody>
          {dirty && <HmsNotice tone="amber">Unsaved changes. Save the draft or publish the week.</HmsNotice>}
          <HmsNotice tone="blue">A saved assignment can be changed to another person but not cleared here; pick who covers it instead.</HmsNotice>
          {counters.map((c) => (
            <HmsSection key={c.id} title={`${c.name} · ${c.location}`} padded>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                {SHIFTS.map((s) => {
                  const key = slotKey(c.id, date, s.key);
                  const id = `roster-${c.id}-${date}-${s.key}`;
                  return (
                    <label key={s.key} htmlFor={id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600, color: HMS.label }}>
                      {s.label} <span style={{ fontWeight: 400, color: HMS.textSecondary, fontSize: '12px' }}>{s.hours}</span>
                      <select id={id} style={INPUT} value={map[key] || ''} onChange={(e) => assign(c.id, date, s.key, e.target.value)}>
                        {!saved.has(key) && <option value="">— Unassigned —</option>}
                        {data.staff.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {p.role ? ` · ${p.role.replace(/_/g, ' ').toLowerCase()}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>
            </HmsSection>
          ))}
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
            <HmsButton icon={Save} block disabled={busy || !dirty} onClick={() => save()}>
              Save draft
            </HmsButton>
            <HmsButton variant="primary" icon={Send} block disabled={busy || (!dirty && data.is_published) || !Object.keys(map).length} onClick={publish}>
              {data.is_published && !dirty ? 'Week published' : 'Publish week'}
            </HmsButton>
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="adm-roster"
      title="Staff roster"
      description="Who runs each counter, every shift of the week."
      total={data?.week_dates.length ?? 0}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search day or person"
      leftExtra={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <HmsButton size="sm" icon={ChevronLeft} disabled={!data || dirty} title={dirty ? 'Save or discard changes first' : 'Previous week'} aria-label="Previous week" onClick={() => data && setWeek(shiftWeek(data.week_start, -7))}>
            Prev
          </HmsButton>
          <span style={{ fontSize: '13px', fontWeight: 600, color: HMS.text }}>{data ? `${fmtDate(data.week_start)} – ${fmtDate(data.week_end)}` : '—'}</span>
          <HmsButton size="sm" icon={ChevronRight} disabled={!data || dirty} title={dirty ? 'Save or discard changes first' : 'Next week'} aria-label="Next week" onClick={() => data && setWeek(shiftWeek(data.week_start, 7))}>
            Next
          </HmsButton>
        </div>
      }
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="assign shifts"
      detailLabel="Day roster"
      emptyText="No days match this search."
      renderDetail={renderDetail}
    />
  );
};
