// OPD Admin — reports for today, 7 or 30 days. Department totals (footfall, seen, no-shows, new vs follow-up, desk
// collection, wait to see the doctor) and the same per doctor, with each doctor's share and capacity use. Printable.
import React, { useState } from 'react';
import { BarChart3, Printer } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsSection, HmsRow, HmsEmpty, HmsField, INPUT, HMS } from '../../components/hms';
import { useCurrency } from '../../config/currency';
import { SharedQueueToken } from '../../services/patientJourneyService';
import { fmtWait, issuedAt, printSlip, sameDoctor } from '../reception/receptionData';
import { avgMin } from '../nurse/nurseData';
import { consultMinutes } from '../assistant/assistantData';
import { OpdAdminActions, OpdAdminData, inRange, isoDay, recordOf } from './opdAdminData';

export interface OaReportsViewProps {
  data: OpdAdminData;
  act: OpdAdminActions;
}

const PERIODS: Record<string, { label: string; days: number }> = { today: { label: 'Today', days: 0 }, week: { label: 'Last 7 days', days: 6 }, month: { label: 'Last 30 days', days: 29 } };
const waitToDoctor = (t: SharedQueueToken) => {
  const a = issuedAt(t);
  const b = t.seatedAt ? new Date(t.seatedAt) : null;
  return a && b && b > a ? Math.round((b.getTime() - a.getTime()) / 60000) : null;
};
const stats = (toks: SharedQueueToken[]) => {
  const seen = toks.filter((t) => t.status === 'COMPLETED');
  const noShow = toks.filter((t) => t.status === 'NO_SHOW').length;
  const followUp = toks.filter((t) => /follow/i.test(t.type || '')).length;
  const collected = toks.filter((t) => t.feePaid).reduce((s, t) => s + (t.totalFee || 0), 0);
  const due = toks.filter((t) => !t.feePaid && t.status !== 'CANCELLED' && t.status !== 'NO_SHOW').reduce((s, t) => s + (t.totalFee || 0), 0);
  return { total: toks.length, seen: seen.length, noShow, followUp, fresh: toks.length - followUp, collected, due, wait: avgMin(toks.map(waitToDoctor)), consult: avgMin(seen.map(consultMinutes)) };
};

export const OaReportsView: React.FC<OaReportsViewProps> = ({ data, act }) => {
  const { format } = useCurrency();
  const [period, setPeriod] = useState('today');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const from = isoDay(-PERIODS[period].days);
  const toks = data.queue.filter((t) => t.status !== 'CANCELLED' && inRange(t, from));
  const dept = stats(toks);
  const q = search.trim().toLowerCase();
  const perDoc = data.doctors.map((d) => ({ d, s: stats(toks.filter((t) => sameDoctor(t.doctor, d.name))) }));
  const list = perDoc.filter(({ d }) => !q || [d.name, d.specialty].some((v) => v.toLowerCase().includes(q))).sort((a, b) => b.s.total - a.s.total);
  const days = PERIODS[period].days + 1;
  const rows: HmsListRow[] = list.map(({ d, s }) => {
    const cap = (recordOf(data, d)?.patientCapacityPerDay || 0) * days;
    return {
      key: `d:${d.id}`,
      title: d.name,
      badge: <HmsBadge tone="blue">{s.total}</HmsBadge>,
      sub: d.specialty,
      metaLeft: `${s.seen} seen · ${s.noShow} no-show`,
      metaRight: format(s.collected),
      progress: cap ? { pct: Math.min(100, (s.total / cap) * 100), doneLabel: 'Full capacity used', tone: 'blue' } : undefined,
    };
  });

  const print = () => {
    const ok = printSlip(`OPD report · ${PERIODS[period].label}`, [
      ['Patients (tokens)', String(dept.total)],
      ['Seen', String(dept.seen)],
      ['No-shows', String(dept.noShow)],
      ['New / follow-up', `${dept.fresh} / ${dept.followUp}`],
      ['Collected at desk', format(dept.collected)],
      ['Still due', format(dept.due)],
      ['Average wait to doctor', fmtWait(dept.wait)],
      ...perDoc.map(({ d, s }) => [d.name, `${s.total} pts · ${s.seen} seen · ${format(s.collected)}`] as [string, string]),
    ]);
    if (!ok) act.notify('Allow pop-ups to print', 'error');
  };

  const renderDetail = (key: string | null) => {
    const row = perDoc.find(({ d }) => `d:${d.id}` === key);
    if (!row) return <HmsEmpty>{data.doctors.length ? 'Select a doctor.' : 'No OPD doctors set up.'}</HmsEmpty>;
    const { d, s } = row;
    const cap = (recordOf(data, d)?.patientCapacityPerDay || 0) * days;
    return (
      <>
        <HmsDetailHeader icon={BarChart3} title={d.name} badge={<HmsBadge tone="blue">{PERIODS[period].label}</HmsBadge>} subtitle={d.specialty} />
        <HmsStatStrip
          items={[
            { label: 'Patients', value: s.total, note: dept.total ? `${Math.round((s.total / dept.total) * 100)}% of OPD` : undefined },
            { label: 'Seen', value: s.seen, note: `${s.noShow} no-show` },
            { label: 'Collected', value: format(s.collected), note: s.due ? `${format(s.due)} due` : undefined, tone: s.due ? 'amber' : 'default' },
            { label: 'Capacity used', value: cap ? `${Math.round((s.total / cap) * 100)}%` : '—', note: cap ? `${cap} slots` : 'No capacity set' },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title="Visits">
            <HmsRow label="New visits" value={s.fresh} />
            <HmsRow label="Follow-ups" value={s.followUp} />
            <HmsRow label="Average wait to see the doctor" value={fmtWait(s.wait)} hint="Token → seated, where the seat time was recorded" />
            <HmsRow label="Average consultation" value={fmtWait(s.consult)} hint="Today's visits with seat and finish times" last />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="oa-reports"
      title="Reports"
      description="Footfall, collection and waiting, for the OPD and per doctor."
      total={data.doctors.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search doctor or specialty"
      headerAction={
        <HmsButton icon={Printer} onClick={print}>
          Print
        </HmsButton>
      }
      leftExtra={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <HmsField label="Period" htmlFor="oa-period">
            <select id="oa-period" style={INPUT} value={period} onChange={(e) => { setPeriod(e.target.value); setSelected(null); }}>
              {Object.entries(PERIODS).map(([k, p]) => (
                <option key={k} value={k}>
                  {p.label}
                </option>
              ))}
            </select>
          </HmsField>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: HMS.textSecondary }}>
            <span>Patients <strong style={{ color: HMS.text }}>{dept.total}</strong></span>
            <span>Seen <strong style={{ color: HMS.text }}>{dept.seen}</strong></span>
            <span>No-show <strong style={{ color: HMS.text }}>{dept.noShow}</strong></span>
            <span>New / FU <strong style={{ color: HMS.text }}>{dept.fresh} / {dept.followUp}</strong></span>
            <span>Collected <strong style={{ color: HMS.text }}>{format(dept.collected)}</strong></span>
            <span>Avg wait <strong style={{ color: HMS.text }}>{fmtWait(dept.wait)}</strong></span>
          </div>
        </div>
      }
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open doctor"
      detailLabel="Doctor"
      emptyText="No doctors match this search."
      renderDetail={renderDetail}
    />
  );
};
