// Lab Admin · Duty scheduling — the weekly roster, one day at a time.
// Coverage rules are checked against the roster itself; gaps and suggestions are calculated, not typed in.
import React, { useMemo, useState } from 'react';
import { CalendarDays, Send, CalendarPlus, UserPlus } from 'lucide-react';
import {
  HmsMasterDetail,
  HmsListRow,
  HmsBadge,
  HmsButton,
  HmsDetailHeader,
  HmsStatStrip,
  HmsDetailBody,
  HmsSection,
  HmsRow,
  HmsNotice,
  HmsEmpty,
  INPUT,
  HMS,
} from '../../../components/hms';
import {
  LabAdminStore,
  ShiftCode,
  SHIFT_INFO,
  DAY_NAMES,
  COVERAGE_RULES,
  MAX_CONSECUTIVE_DAYS,
  rosterGaps,
  gapCandidates,
  weeklyHours,
  consecutiveWorkDays,
  addDays,
  fmtShort,
  fmtStamp,
  todayIndex,
  LabStaffCategory,
} from '../data/labAdminStore';
import { LabAdminViewProps } from './labAdminUi';

const CODES: ShiftCode[] = ['M', 'D', 'E', 'N', 'OC', 'L', 'O'];
const CATEGORY_ORDER: LabStaffCategory[] = ['Pathologist', 'Technologist', 'Phlebotomist'];

export const LabAdminSchedulingView: React.FC<LabAdminViewProps> = ({ data, by, notify, initialFilter }) => {
  const { state } = data;
  const { roster } = state;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(String(todayIndex()));

  const gaps = useMemo(() => rosterGaps(state), [state]);
  const active = state.staff.filter((s) => !s.suspended);
  const pendingRequests = state.requests.filter((r) => r.status === 'Pending').length;

  const days = DAY_NAMES.map((name, i) => {
    const date = addDays(roster.weekStart, i);
    const dayGaps = gaps.filter((g) => g.day === i);
    const rulesMet = COVERAGE_RULES.length - new Set(dayGaps.map((g) => g.rule)).size;
    const count = (codes: ShiftCode[]) => active.filter((s) => codes.includes(roster.cells[s.id]?.[i] ?? 'O')).length;
    return { i, name, date, dayGaps, rulesMet, onDuty: count(['M', 'D', 'E', 'N']), onCall: count(['OC']), onLeave: count(['L']) };
  });

  const q = search.trim().toLowerCase();
  const visible = days.filter((d) => {
    if (pill === 'gaps' && !d.dayGaps.length) return false;
    if (pill === 'today' && d.i !== todayIndex()) return false;
    if (!q) return true;
    return `${d.name} ${fmtShort(d.date)}`.toLowerCase().includes(q) || active.some((s) => s.name.toLowerCase().includes(q) && SHIFT_INFO[roster.cells[s.id]?.[d.i] ?? 'O'].working);
  });

  const rows: HmsListRow[] = visible.map((d) => ({
    key: String(d.i),
    title: `${d.name} · ${fmtShort(d.date)}${d.i === todayIndex() ? ' · Today' : ''}`,
    badge: d.dayGaps.length ? <HmsBadge tone="red">{d.dayGaps.length} gap{d.dayGaps.length === 1 ? '' : 's'}</HmsBadge> : <HmsBadge tone="green">Covered</HmsBadge>,
    sub: `${d.onDuty} on duty · ${d.onCall} on call · ${d.onLeave} on leave`,
    metaLeft: `M ${active.filter((s) => (roster.cells[s.id]?.[d.i] ?? 'O') === 'M' || (roster.cells[s.id]?.[d.i] ?? 'O') === 'D').length} · E ${active.filter((s) => roster.cells[s.id]?.[d.i] === 'E').length} · N ${active.filter((s) => roster.cells[s.id]?.[d.i] === 'N').length}`,
    metaRight: `${d.rulesMet} of ${COVERAGE_RULES.length} rules met`,
    progress: { pct: (d.rulesMet / COVERAGE_RULES.length) * 100, doneLabel: 'Fully covered', tone: d.dayGaps.length ? 'amber' : 'blue' },
  }));

  const pills = [
    { key: 'all', label: 'Whole week', count: 7 },
    { key: 'gaps', label: 'Days with gaps', count: days.filter((d) => d.dayGaps.length).length, tone: 'red' as const },
    { key: 'today', label: 'Today', count: 1 },
  ];

  const publish = () => {
    LabAdminStore.publishRoster(by);
    if (gaps.length) {
      notify(`Roster published to ${active.length} staff with ${gaps.length} coverage gap${gaps.length === 1 ? '' : 's'} still open.`, 'error');
    } else {
      notify(`Roster for week of ${fmtShort(roster.weekStart)} published to ${active.length} staff.`);
    }
  };

  const setShift = (staffId: string, day: number, code: ShiftCode) => {
    LabAdminStore.setShift(staffId, day, code, by);
  };

  const renderDetail = (key: string | null) => {
    const d = days.find((x) => String(x.i) === key);
    if (!d) return <HmsEmpty>Select a day to see who is rostered.</HmsEmpty>;
    const overLimit = active.filter((s) => consecutiveWorkDays(roster.cells[s.id]) > MAX_CONSECUTIVE_DAYS);
    return (
      <>
        <HmsDetailHeader
          icon={CalendarDays}
          title={`${d.name} · ${fmtShort(d.date)}`}
          badge={d.dayGaps.length ? <HmsBadge tone="red">{d.dayGaps.length} gap{d.dayGaps.length === 1 ? '' : 's'}</HmsBadge> : <HmsBadge tone="green">Covered</HmsBadge>}
          subtitle={`Week of ${fmtShort(roster.weekStart)} · ${roster.published ? `Published ${fmtStamp(roster.publishedAt)}` : roster.editedAt ? `Draft · edited ${fmtStamp(roster.editedAt)}` : 'Draft'}`}
          actions={
            <>
              <HmsButton icon={CalendarPlus} onClick={() => { LabAdminStore.copyPreviousWeekPattern(by); notify('Next week started from this week’s pattern. Review and publish.'); }}>
                Start next week
              </HmsButton>
              <HmsButton variant="primary" icon={Send} onClick={publish} disabled={roster.published}>
                {roster.published ? 'Published' : 'Publish roster'}
              </HmsButton>
            </>
          }
        />
        <HmsStatStrip
          items={[
            { label: 'On duty', value: d.onDuty, note: 'Across all shifts' },
            { label: 'On call', value: d.onCall },
            { label: 'On leave', value: d.onLeave, tone: d.onLeave ? 'amber' : 'default' },
            { label: 'Coverage', value: `${d.rulesMet}/${COVERAGE_RULES.length}`, note: 'Rules met', tone: d.dayGaps.length ? 'red' : 'green' },
          ]}
        />
        <HmsDetailBody>
          {pendingRequests > 0 && <HmsNotice tone="amber">{pendingRequests} leave / swap request{pendingRequests === 1 ? '' : 's'} waiting in Staff & credentials. Decide before publishing.</HmsNotice>}

          <HmsSection title="Gaps & suggestions">
            {d.dayGaps.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: '#15803d', fontWeight: 600 }}>Every coverage rule is met on this day.</div>
            ) : (
              d.dayGaps.map((g, idx) => {
                const best = gapCandidates(state, g)[0];
                return (
                  <HmsRow
                    key={g.key}
                    last={idx === d.dayGaps.length - 1}
                    label={`${SHIFT_INFO[g.shift].label} ${SHIFT_INFO[g.shift].hours} · ${g.category.toLowerCase()} short by ${g.needed - g.have}`}
                    hint={best ? `Suggested: ${best.staff.name} (off, ${best.hours} h this week)` : `${g.rule} — no ${g.category.toLowerCase()} is free on this day`}
                    value={
                      best ? (
                        <HmsButton size="sm" variant="primary" icon={UserPlus} onClick={() => { setShift(best.staff.id, g.day, g.shift); notify(`${best.staff.name} assigned to ${SHIFT_INFO[g.shift].label.toLowerCase()} on ${d.name}.`); }}>
                          Assign
                        </HmsButton>
                      ) : (
                        <HmsBadge tone="red">No cover</HmsBadge>
                      )
                    }
                  />
                );
              })
            )}
          </HmsSection>

          <HmsSection title="Coverage rules">
            {COVERAGE_RULES.map((r, idx) => {
              const have = active.filter((s) => s.category === r.category && r.shifts.includes(roster.cells[s.id]?.[d.i] ?? 'O')).length;
              return (
                <HmsRow key={r.id} last={idx === COVERAGE_RULES.length - 1} label={r.label} hint={`${have} rostered · need ${r.min}`} value={<HmsBadge tone={have >= r.min ? 'green' : 'red'}>{have >= r.min ? 'Met' : 'Short'}</HmsBadge>} />
              );
            })}
          </HmsSection>

          {overLimit.length > 0 && <HmsNotice tone="amber">Over {MAX_CONSECUTIVE_DAYS} consecutive working days: {overLimit.map((s) => s.name).join(', ')}.</HmsNotice>}

          {CATEGORY_ORDER.map((cat) => {
            const people = active.filter((s) => s.category === cat);
            if (!people.length) return null;
            return (
              <HmsSection key={cat} title={`${cat}s · ${d.name}`}>
                {people.map((s, idx) => {
                  const cells = roster.cells[s.id] || (Array(7).fill('O') as ShiftCode[]);
                  const hrs = weeklyHours(cells);
                  const run = consecutiveWorkDays(cells);
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', borderBottom: idx < people.length - 1 ? `1px solid ${HMS.divider}` : 'none' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: HMS.text }}>{s.name}</div>
                        <div style={{ fontSize: '12px', color: hrs > 48 || run > MAX_CONSECUTIVE_DAYS ? '#b45309' : HMS.textSecondary }}>
                          {s.role} · {hrs} h this week{hrs > 48 ? ' · overtime' : ''}{run > MAX_CONSECUTIVE_DAYS ? ` · ${run} days in a row` : ''}
                        </div>
                      </div>
                      <select
                        aria-label={`${s.name} shift on ${d.name}`}
                        value={cells[d.i]}
                        onChange={(e) => setShift(s.id, d.i, e.target.value as ShiftCode)}
                        style={{ ...INPUT, width: '190px', flexShrink: 0 }}
                      >
                        {CODES.map((c) => (
                          <option key={c} value={c}>
                            {SHIFT_INFO[c].label}
                            {SHIFT_INFO[c].hours && c !== 'OC' ? ` ${SHIFT_INFO[c].hours}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </HmsSection>
            );
          })}
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="lab-roster"
      title="Duty scheduling"
      description={`Week of ${fmtShort(roster.weekStart)} · ${roster.published ? 'published' : 'draft — publish to notify staff'}. Pick a day to change shifts and fill gaps.`}
      total={7}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search day or staff name"
      pills={pills}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="edit shifts"
      detailLabel="Day roster"
      renderDetail={renderDetail}
    />
  );
};

export default LabAdminSchedulingView;
