// OPD Admin — duty roster for the next 7 days. Who is on each OPD shift, and the gaps: every OPD shift needs at least
// one nurse and one front-desk person. Assign staff, remove a duty, or copy the previous day's roster.
import React, { useState } from 'react';
import { CalendarDays, UserPlus, Copy, Trash2 } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, INPUT, HMS } from '../../components/hms';
import { DepartmentScheduleSlot } from '../../types';
import { saveDepartmentSchedule } from '../department/departmentWorkspaceStore';
import { OPD_DEPT, fmtDate } from '../reception/receptionData';
import { OpdAdminActions, OpdAdminData, DAY_FULL, coverage, dowOf, isoDay, logChange, removeRosterSlot } from './opdAdminData';

export interface OaRosterViewProps {
  data: OpdAdminData;
  act: OpdAdminActions;
  initialFilter?: string;
  newSignal?: number;
}

const PILLS = ['all', 'gaps'];
const DAYS = 7;
const ROLE: Record<string, string> = { nurse: 'Nurse', receptionist: 'Front desk', admin: 'Front desk', supervisor: 'Supervisor', assistant: 'Assistant' };

export const OaRosterView: React.FC<OaRosterViewProps> = ({ data, act, initialFilter, newSignal = 0 }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [shiftName, setShiftName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [seen, setSeen] = useState(newSignal);
  if (newSignal !== seen) {
    setSeen(newSignal);
    setAssigning(selected?.slice(2) || isoDay(0));
    setShiftName(data.shifts[0]?.name || '');
    setPicked([]);
  }

  const days = Array.from({ length: DAYS }, (_, i) => isoDay(i));
  const gaps = (d: string) => coverage(data, d).filter((c) => c.missing.length > 0);
  const match: Record<string, (d: string) => boolean> = { all: () => true, gaps: (d) => gaps(d).length > 0 };
  const q = search.trim().toLowerCase();
  const list = days.filter((d) => match[pill](d) && (!q || fmtDate(d).toLowerCase().includes(q) || data.roster.some((r) => r.date === d && r.staffName.toLowerCase().includes(q))));
  const rows: HmsListRow[] = list.map((d) => {
    const cov = coverage(data, d);
    const g = cov.filter((c) => c.missing.length > 0);
    const filled = cov.filter((c) => c.missing.length === 0).length;
    return {
      key: `d:${d}`,
      title: `${fmtDate(d)}${d === isoDay(0) ? ' · today' : ''}`,
      badge: g.length ? <HmsBadge tone="red">{g.length} gap{g.length === 1 ? '' : 's'}</HmsBadge> : <HmsBadge tone="green">Covered</HmsBadge>,
      sub: `${data.roster.filter((r) => r.date === d).length} on duty`,
      metaLeft: g.length ? g.map((c) => `${c.shift.name}: ${c.missing.map((m) => m.label.toLowerCase()).join(', ')}`).join(' · ') : 'All OPD shifts staffed',
      progress: cov.length ? { pct: (filled / cov.length) * 100, doneLabel: 'All shifts covered', tone: g.length ? 'red' : 'blue' } : undefined,
    };
  });

  const renderDetail = (key: string | null) => {
    const d = key?.slice(2);
    if (!d) return <HmsEmpty>Select a day.</HmsEmpty>;
    const cov = coverage(data, d);
    const day = data.roster.filter((r) => r.date === d);
    const prev = data.roster.filter((r) => r.date === isoDay(days.indexOf(d) - 1));
    const others = data.shifts.filter((sh) => !cov.some((c) => c.shift.id === sh.id));
    return (
      <>
        <HmsDetailHeader icon={CalendarDays} title={fmtDate(d)} badge={gaps(d).length ? <HmsBadge tone="red">{gaps(d).length} gap{gaps(d).length === 1 ? '' : 's'}</HmsBadge> : <HmsBadge tone="green">Covered</HmsBadge>} subtitle={`${DAY_FULL[dowOf(d)]} · ${day.length} on duty`} />
        <HmsStatStrip
          items={[
            { label: 'On duty', value: day.length },
            { label: 'Nurses', value: day.filter((r) => r.role === 'nurse').length },
            { label: 'Front desk', value: day.filter((r) => ['receptionist', 'admin', 'supervisor'].includes(r.role)).length },
            { label: 'Gaps', value: gaps(d).length, tone: gaps(d).length ? 'red' : 'green' },
          ]}
        />
        <HmsDetailBody>
          {day.length === 0 && <HmsNotice tone="amber">Nobody is rostered yet. Assign staff or copy the previous day.</HmsNotice>}
          {[...cov.map((c) => ({ shift: c.shift, on: c.on, missing: c.missing })), ...others.map((sh) => ({ shift: sh, on: day.filter((r) => r.shiftName === sh.name), missing: [] as typeof cov[number]['missing'] }))].map(({ shift, on, missing }) => (
            <HmsSection key={shift.id} title={`${shift.name} · ${shift.startTime}–${shift.endTime}`} right={missing.length ? <HmsBadge tone="red">Needs {missing.map((m) => m.label.toLowerCase()).join(' & ')}</HmsBadge> : undefined}>
              {on.length === 0 && <HmsRow label="Nobody assigned" last />}
              {on.map((r, i) => (
                <HmsRow
                  key={r.id}
                  label={r.staffName}
                  hint={ROLE[r.role] || r.role}
                  value={
                    <HmsButton size="sm" icon={Trash2} aria-label={`Remove ${r.staffName}`} onClick={() => { removeRosterSlot(r.id); logChange(act.userName, 'ROSTER', fmtDate(d), `Removed ${r.staffName} from ${r.shiftName}`); data.reload(); act.notify(`${r.staffName} removed from ${r.shiftName}`); }}>
                      Remove
                    </HmsButton>
                  }
                  last={i === on.length - 1}
                />
              ))}
            </HmsSection>
          ))}
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
            <HmsButton variant="primary" icon={UserPlus} block onClick={() => { setAssigning(d); setShiftName(cov.find((c) => c.missing.length)?.shift.name || data.shifts[0]?.name || ''); setPicked([]); }}>
              Assign staff
            </HmsButton>
            <HmsButton
              icon={Copy}
              block
              disabled={!prev.length || days.indexOf(d) === 0}
              title={days.indexOf(d) === 0 ? 'Nothing before today in this view' : prev.length ? `Copy ${prev.length} duties from the day before` : 'The day before has no roster'}
              onClick={() => {
                let n = 0;
                prev.forEach((r) => {
                  if (day.some((x) => x.staffId === r.staffId && x.shiftName === r.shiftName)) return;
                  saveDepartmentSchedule({ ...r, id: `sch-${OPD_DEPT}-${r.staffId}-${d}-${r.shiftName.replace(/\W+/g, '')}`, date: d, dayOfWeek: DAY_FULL[dowOf(d)] });
                  n += 1;
                });
                logChange(act.userName, 'ROSTER', fmtDate(d), `Copied ${n} duties from the previous day`);
                data.reload();
                act.notify(n ? `${n} duties copied to ${fmtDate(d)}` : 'Everyone from the previous day is already on this day');
              }}
            >
              Copy previous day
            </HmsButton>
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  const candidates = assigning ? data.staff.filter((s) => s.status === 'ACTIVE' && !data.roster.some((r) => r.date === assigning && r.staffId === s.staffId && r.shiftName === shiftName)) : [];
  return (
    <>
      <HmsMasterDetail
        listId="oa-roster"
        title="Duty roster"
        description="The next 7 days. Each OPD shift needs a nurse and a front-desk person."
        total={days.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search a day or a staff name"
        headerAction={
          <HmsButton variant="primary" icon={UserPlus} onClick={() => { setAssigning(selected?.slice(2) || isoDay(0)); setShiftName(data.shifts[0]?.name || ''); setPicked([]); }} title="Assign staff (Alt+N)" aria-keyshortcuts="Alt+N">
            Assign
          </HmsButton>
        }
        pills={[
          { key: 'all', label: 'All', count: days.length },
          { key: 'gaps', label: 'With gaps', count: days.filter(match.gaps).length, tone: 'red' },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open day"
        detailLabel="Day"
        emptyText="No days match this search or filter."
        renderDetail={renderDetail}
      />
      {assigning && (
        <HmsModal
          title="Assign staff to a shift"
          onClose={() => setAssigning(null)}
          width={600}
          footer={
            <>
              <HmsButton onClick={() => setAssigning(null)}>Cancel</HmsButton>
              <HmsButton
                variant="primary"
                icon={UserPlus}
                disabled={!shiftName || picked.length === 0}
                onClick={() => {
                  const d = assigning;
                  picked.forEach((id) => {
                    const s = data.staff.find((x) => x.staffId === id);
                    if (!s) return;
                    const slot: DepartmentScheduleSlot = { id: `sch-${OPD_DEPT}-${s.staffId}-${d}-${shiftName.replace(/\W+/g, '')}`, departmentId: OPD_DEPT, date: d, dayOfWeek: DAY_FULL[dowOf(d)], shiftName, staffId: s.staffId, staffName: s.fullName, role: s.role, roomId: s.assignedRoomId, roomName: s.assignedRoomName };
                    saveDepartmentSchedule(slot);
                  });
                  logChange(act.userName, 'ROSTER', fmtDate(d), `Assigned ${picked.length} to ${shiftName}`);
                  const n = picked.length;
                  setAssigning(null);
                  data.reload();
                  setSelected(`d:${d}`);
                  act.notify(`${n} assigned to ${shiftName} on ${fmtDate(d)}`);
                }}
              >
                Assign {picked.length || ''}
              </HmsButton>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <HmsField label="Day" htmlFor="ro-day" required>
              <select id="ro-day" style={INPUT} value={assigning} onChange={(e) => { setAssigning(e.target.value); setPicked([]); }}>
                {days.map((d) => (
                  <option key={d} value={d}>
                    {fmtDate(d)}
                  </option>
                ))}
              </select>
            </HmsField>
            <HmsField label="Shift" htmlFor="ro-shift" required>
              <select id="ro-shift" style={INPUT} value={shiftName} onChange={(e) => { setShiftName(e.target.value); setPicked([]); }}>
                {data.shifts.map((sh) => (
                  <option key={sh.id} value={sh.name}>
                    {sh.name} · {sh.startTime}–{sh.endTime}
                  </option>
                ))}
              </select>
            </HmsField>
          </div>
          {candidates.length === 0 && <HmsNotice tone="blue">Everyone on duty is already on this shift, or no staff are posted to OPD.</HmsNotice>}
          <div role="group" aria-label="Staff to assign" style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
            {candidates.map((s) => {
              const on = picked.includes(s.staffId);
              const elsewhere = data.roster.find((r) => r.date === assigning && r.staffId === s.staffId);
              return (
                <button key={s.staffId} type="button" role="checkbox" aria-checked={on} onClick={() => setPicked((prev) => (prev.includes(s.staffId) ? prev.filter((x) => x !== s.staffId) : [...prev, s.staffId]))} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', fontSize: '14px', border: `1px solid ${on ? HMS.primaryBorder : HMS.border}`, background: on ? HMS.primaryTint : '#ffffff', color: HMS.text }}>
                  <span>
                    {on ? '☑' : '☐'} {s.fullName} <span style={{ color: HMS.textSecondary }}>· {ROLE[s.role] || s.role}</span>
                  </span>
                  {elsewhere && <span style={{ fontSize: '12px', color: '#b45309' }}>Already on {elsewhere.shiftName}</span>}
                </button>
              );
            })}
          </div>
        </HmsModal>
      )}
    </>
  );
};
