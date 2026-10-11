// Lab Admin · Reports & analytics — every figure is calculated from today's lab worklist,
// the roster, analyzers, stock and the Billing tariff master. Exports download real CSV files.
// Order times are stored as HH:MM for the current day, so history beyond today needs the
// lab orders API (see the note on each report).
import React, { useMemo, useState } from 'react';
import { BarChart3, Download, Printer } from 'lucide-react';
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
  HmsEmpty,
  HmsNotice,
  HmsStat,
  HMS,
} from '../../../components/hms';
import {
  tatMinutes,
  minutesOf,
  fmtMinutes,
  parseTatTarget,
  rosterGaps,
  staffStatusNow,
  credentialState,
  stockState,
  pmState,
  inr,
  isoDate,
} from '../data/labAdminStore';
import { LabAdminViewProps, downloadCsv } from './labAdminUi';

interface Report {
  key: string;
  group: 'Operations' | 'Quality' | 'Finance' | 'Resources';
  title: string;
  description: string;
  headline: string;
  stats: HmsStat[];
  table: { header: string[]; rows: (string | number)[][] };
  bars?: { label: string; value: number; secondary?: number; display?: string }[];
  barLegend?: [string, string?];
  note?: string;
}

const Bars: React.FC<{ bars: NonNullable<Report['bars']>; legend?: Report['barLegend'] }> = ({ bars, legend }) => {
  const max = Math.max(1, ...bars.map((b) => Math.max(b.value, b.secondary || 0)));
  return (
    <div style={{ padding: '14px' }}>
      {legend && (
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: HMS.label, marginBottom: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: HMS.primary }} /> {legend[0]}
          </span>
          {legend[1] && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#16a34a' }} /> {legend[1]}
            </span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {bars.map((b) => (
          <div key={b.label} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 72px', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: HMS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.label}>{b.label}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ height: '8px', borderRadius: '4px', background: HMS.divider, overflow: 'hidden' }}>
                <span className="hms-bar" style={{ display: 'block', height: '8px', width: `${(b.value / max) * 100}%`, background: HMS.primary, borderRadius: '4px' }} />
              </span>
              {b.secondary !== undefined && (
                <span style={{ height: '8px', borderRadius: '4px', background: HMS.divider, overflow: 'hidden' }}>
                  <span className="hms-bar" style={{ display: 'block', height: '8px', width: `${(b.secondary / max) * 100}%`, background: '#16a34a', borderRadius: '4px' }} />
                </span>
              )}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: HMS.text, textAlign: 'right' }}>{b.display ?? b.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const LabAdminReportsView: React.FC<LabAdminViewProps> = ({ data, notify, initialFilter }) => {
  const { orders, catalog, tariffs, state, analyzers } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(null);

  const reports = useMemo<Report[]>(() => {
    const signed = orders.filter((o) => o.stage === 'SIGNED_OFF');
    const todayNote = 'Today only — order times are recorded as HH:MM for the current day. Multi-day history needs the lab orders API.';

    // Workload by hour
    const hours = new Map<number, { ordered: number; signed: number }>();
    orders.forEach((o) => {
      const a = minutesOf(o.orderedAt);
      if (a !== null) hours.set(Math.floor(a / 60), { ...(hours.get(Math.floor(a / 60)) || { ordered: 0, signed: 0 }), ordered: (hours.get(Math.floor(a / 60))?.ordered || 0) + 1 });
      const b = minutesOf(o.signedOffAt);
      if (b !== null) {
        const h = Math.floor(b / 60);
        const cur = hours.get(h) || { ordered: 0, signed: 0 };
        hours.set(h, { ...cur, signed: cur.signed + 1 });
      }
    });
    const hourRows = Array.from(hours.entries()).sort((x, y) => x[0] - y[0]);
    const untimed = orders.filter((o) => minutesOf(o.orderedAt) === null).length;
    const peak = hourRows.reduce((best, cur) => (cur[1].ordered > (best?.[1].ordered || 0) ? cur : best), hourRows[0]);

    // TAT by section
    const sections = Array.from(new Set(orders.map((o) => o.category)));
    const tatRows = sections.map((sec) => {
      const done = signed.filter((o) => o.category === sec).map((o) => ({ o, t: tatMinutes(o) })).filter((x) => x.t !== null) as { o: typeof orders[number]; t: number }[];
      const within = done.filter(({ o, t }) => {
        const cat = catalog.find((c) => c.code === o.testCode);
        const target = parseTatTarget(o.priority === 'STAT' ? cat?.tatStat || cat?.tatTarget : cat?.tatTarget);
        return target === null || t <= target;
      }).length;
      const median = done.length ? done.map((x) => x.t).sort((a, b) => a - b)[Math.floor(done.length / 2)] : null;
      return { sec, count: done.length, within, median };
    });
    const tatDone = tatRows.reduce((n, r) => n + r.count, 0);
    const tatWithin = tatRows.reduce((n, r) => n + r.within, 0);

    // Volume by section & priority
    const bySection = sections.map((sec) => ({ sec, n: orders.filter((o) => o.category === sec).length })).sort((a, b) => b.n - a.n);
    const priorities = (['STAT', 'Urgent', 'Routine'] as const).map((p) => ({ p, n: orders.filter((o) => o.priority === p).length }));
    const opd = orders.filter((o) => /opd/i.test(o.location)).length;
    const ipd = orders.filter((o) => /ipd|ward|icu|bed/i.test(o.location)).length;

    // Top tests & revenue
    const priceOf = (testName: string, stat: boolean) => {
      const t = tariffs[testName];
      if (!t) return null;
      const extra = stat ? parseFloat((t.statSurcharge || '').replace(/[^0-9.]/g, '')) || 0 : 0;
      return t.basePrice + extra;
    };
    const tests = new Map<string, { n: number; revenue: number; unpriced: number }>();
    orders.forEach((o) => {
      const cur = tests.get(o.testName) || { n: 0, revenue: 0, unpriced: 0 };
      const p = priceOf(o.testName, o.priority === 'STAT');
      tests.set(o.testName, { n: cur.n + 1, revenue: cur.revenue + (p || 0), unpriced: cur.unpriced + (p === null ? 1 : 0) });
    });
    const testRows = Array.from(tests.entries()).sort((a, b) => b[1].n - a[1].n);
    const revenue = testRows.reduce((n, [, v]) => n + v.revenue, 0);
    const unpriced = testRows.reduce((n, [, v]) => n + v.unpriced, 0);

    // Quality
    const critical = orders.filter((o) => o.isCritical);
    const unacked = critical.filter((o) => !o.criticalAcknowledgedAt);
    const retests = orders.filter((o) => o.returnedForRetest);
    const held = orders.filter((o) => o.isBlockedByDowntime && o.stage !== 'SIGNED_OFF');

    // Resources
    const gaps = rosterGaps(state);
    const onDuty = state.staff.filter((s) => staffStatusNow(state, s) === 'On duty').length;
    const credDue = state.staff.filter((s) => ['expired', 'expiring'].includes(credentialState(s)));
    const lowStock = state.stock.filter((i) => stockState(i).label !== 'In stock');
    const down = analyzers.filter((a) => a.status === 'Offline' || a.status === 'Maintenance');
    const pmDue = analyzers.filter((a) => ['due', 'overdue'].includes(pmState(state.equipment[a.id])));

    return [
      {
        key: 'workload',
        group: 'Operations',
        title: 'Workload by hour',
        description: 'Orders received and reports signed off, per hour today.',
        headline: `${orders.length} orders`,
        stats: [
          { label: 'Orders', value: orders.length },
          { label: 'Signed off', value: signed.length },
          { label: 'Peak hour', value: peak ? `${String(peak[0]).padStart(2, '0')}:00` : '—', note: peak ? `${peak[1].ordered} orders` : undefined },
          { label: 'In progress', value: orders.length - signed.length },
        ],
        bars: hourRows.map(([h, v]) => ({ label: `${String(h).padStart(2, '0')}:00 – ${String(h + 1).padStart(2, '0')}:00`, value: v.ordered, secondary: v.signed, display: `${v.ordered} / ${v.signed}` })),
        barLegend: ['Ordered', 'Signed off'],
        table: { header: ['Hour', 'Ordered', 'Signed off'], rows: hourRows.map(([h, v]) => [`${String(h).padStart(2, '0')}:00`, v.ordered, v.signed]) },
        note: untimed ? `${untimed} order${untimed === 1 ? ' has' : 's have'} no recorded time and ${untimed === 1 ? 'is' : 'are'} not charted. ${todayNote}` : todayNote,
      },
      {
        key: 'tat',
        group: 'Quality',
        title: 'Turnaround vs target',
        description: 'Order to sign-off time for released reports, against the catalog target.',
        headline: tatDone ? `${Math.round((tatWithin / tatDone) * 100)}% within target` : 'No released reports',
        stats: [
          { label: 'Released', value: tatDone, note: 'With both times recorded' },
          { label: 'Within target', value: tatDone ? `${Math.round((tatWithin / tatDone) * 100)}%` : '—', tone: tatDone && tatWithin / tatDone < 0.9 ? 'amber' : 'green' },
          { label: 'Over target', value: tatDone - tatWithin, tone: tatDone - tatWithin ? 'red' : 'default' },
          { label: 'Sections', value: tatRows.filter((r) => r.count).length },
        ],
        bars: tatRows.filter((r) => r.count).map((r) => ({ label: r.sec, value: r.median || 0, display: fmtMinutes(r.median) })),
        barLegend: ['Median turnaround'],
        table: { header: ['Section', 'Released', 'Within target', 'Median turnaround (min)'], rows: tatRows.map((r) => [r.sec, r.count, r.within, r.median ?? '']) },
        note: todayNote,
      },
      {
        key: 'volume',
        group: 'Operations',
        title: 'Orders by section & source',
        description: 'Where today’s work comes from and which bench it lands on.',
        headline: `${bySection.length} sections`,
        stats: [
          { label: 'OPD', value: opd },
          { label: 'IPD / wards', value: ipd },
          { label: 'Other', value: orders.length - opd - ipd },
          { label: 'STAT', value: priorities[0].n, tone: priorities[0].n ? 'red' : 'default', note: `${priorities[1].n} urgent · ${priorities[2].n} routine` },
        ],
        bars: bySection.map((s) => ({ label: s.sec, value: s.n })),
        barLegend: ['Orders'],
        table: { header: ['Section', 'Orders'], rows: bySection.map((s) => [s.sec, s.n]) },
        note: todayNote,
      },
      {
        key: 'revenue',
        group: 'Finance',
        title: 'Top tests & revenue',
        description: 'Test volume and billed value at current tariff prices (STAT surcharge included).',
        headline: inr(revenue),
        stats: [
          { label: 'Billed value', value: inr(revenue), note: 'At current tariff' },
          { label: 'Tests', value: testRows.length },
          { label: 'Top test', value: testRows[0]?.[0] || '—', note: testRows[0] ? `${testRows[0][1].n} orders` : undefined },
          { label: 'Unpriced orders', value: unpriced, tone: unpriced ? 'red' : 'default', note: unpriced ? 'No tariff in Billing' : 'All priced' },
        ],
        bars: testRows.slice(0, 10).map(([name, v]) => ({ label: name, value: v.n, display: `${v.n} · ${inr(v.revenue)}` })),
        barLegend: ['Orders'],
        table: { header: ['Test', 'Orders', 'Billed value (₹)', 'Unpriced orders'], rows: testRows.map(([name, v]) => [name, v.n, Math.round(v.revenue), v.unpriced]) },
        note: 'Billed value is calculated from the Billing tariff master; collected cash is reported by Billing.',
      },
      {
        key: 'critical',
        group: 'Quality',
        title: 'Critical values, re-tests & holds',
        description: 'Safety exceptions that need follow-up.',
        headline: `${critical.length} critical`,
        stats: [
          { label: 'Critical', value: critical.length, tone: critical.length ? 'red' : 'default' },
          { label: 'Not acknowledged', value: unacked.length, tone: unacked.length ? 'red' : 'green' },
          { label: 'Re-tests', value: retests.length, tone: retests.length ? 'amber' : 'default' },
          { label: 'Held by downtime', value: held.length, tone: held.length ? 'red' : 'default' },
        ],
        table: {
          header: ['Order', 'Patient', 'Test', 'Issue', 'Detail'],
          rows: [
            ...critical.map((o) => [o.orderNumber, o.patientName, o.testName, 'Critical value', o.criticalAcknowledgedAt ? `Acknowledged ${o.criticalAcknowledgedAt}` : 'Awaiting acknowledgement']),
            ...retests.map((o) => [o.orderNumber, o.patientName, o.testName, 'Re-test', o.retestReason || '']),
            ...held.map((o) => [o.orderNumber, o.patientName, o.testName, 'Held', o.blockedReason || '']),
          ],
        },
      },
      {
        key: 'resources',
        group: 'Resources',
        title: 'Staffing, equipment & stock',
        description: 'Roster gaps, credentials, analyzer downtime and low stock in one place.',
        headline: `${gaps.length + credDue.length + down.length + lowStock.length} exceptions`,
        stats: [
          { label: 'On duty now', value: onDuty, note: `${gaps.length} roster gap${gaps.length === 1 ? '' : 's'} this week`, tone: gaps.length ? 'amber' : 'default' },
          { label: 'Credentials due', value: credDue.length, tone: credDue.length ? 'amber' : 'default' },
          { label: 'Analyzers down', value: down.length, note: `${pmDue.length} PM due`, tone: down.length ? 'red' : 'default' },
          { label: 'Stock alerts', value: lowStock.length, tone: lowStock.length ? 'red' : 'default' },
        ],
        table: {
          header: ['Area', 'Item', 'Status'],
          rows: [
            ...gaps.map((g) => ['Roster', `${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][g.day]} · ${g.rule}`, `Short by ${g.needed - g.have}`]),
            ...credDue.map((s) => ['Credential', `${s.name} · ${s.credentialName}`, s.credentialExpiry || '']),
            ...down.map((a) => ['Analyzer', a.name, a.status]),
            ...lowStock.map((i) => ['Stock', i.name, stockState(i).label]),
          ],
        },
      },
    ];
  }, [orders, catalog, tariffs, state, analyzers]);

  const groups = Array.from(new Set(reports.map((r) => r.group)));
  const q = search.trim().toLowerCase();
  const visible = reports.filter((r) => (pill === 'all' || r.group === pill) && (!q || `${r.title} ${r.description}`.toLowerCase().includes(q)));
  const pills = [{ key: 'all', label: 'All', count: reports.length }, ...groups.map((g) => ({ key: g, label: g, count: reports.filter((r) => r.group === g).length }))];

  const rows: HmsListRow[] = visible.map((r) => ({
    key: r.key,
    title: r.title,
    badge: <HmsBadge tone="gray">{r.group.toUpperCase()}</HmsBadge>,
    sub: r.description,
    metaLeft: 'Today',
    metaRight: <span style={{ fontWeight: 600, color: HMS.text }}>{r.headline}</span>,
  }));

  const exportReport = (r: Report) => {
    downloadCsv(`lab-${r.key}-${isoDate(new Date())}.csv`, r.table.header, r.table.rows);
    notify(`${r.title} exported (${r.table.rows.length} row${r.table.rows.length === 1 ? '' : 's'}).`);
  };

  const renderDetail = (key: string | null) => {
    const r = reports.find((x) => x.key === key);
    if (!r) return <HmsEmpty>Select a report.</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader
          icon={BarChart3}
          title={r.title}
          badge={<HmsBadge tone="gray">TODAY</HmsBadge>}
          subtitle={r.description}
          actions={
            <>
              <HmsButton icon={Printer} onClick={() => window.print()}>
                Print
              </HmsButton>
              <HmsButton variant="primary" icon={Download} onClick={() => exportReport(r)} disabled={!r.table.rows.length}>
                Export CSV
              </HmsButton>
            </>
          }
        />
        <HmsStatStrip items={r.stats} />
        <HmsDetailBody>
          {r.note && <HmsNotice tone="blue">{r.note}</HmsNotice>}
          {r.bars && (
            <HmsSection title="Chart">
              {r.bars.length ? <Bars bars={r.bars} legend={r.barLegend} /> : <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No data yet today.</div>}
            </HmsSection>
          )}
          <HmsSection title={`Data · ${r.table.rows.length} row${r.table.rows.length === 1 ? '' : 's'}`}>
            {r.table.rows.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: '#15803d', fontWeight: 600 }}>Nothing to report.</div>
            ) : (
              r.table.rows.slice(0, 50).map((row, i) => (
                <HmsRow key={i} last={i === Math.min(r.table.rows.length, 50) - 1} label={String(row[0])} hint={row.slice(1, -1).map(String).filter(Boolean).join(' · ') || undefined} value={String(row[row.length - 1])} />
              ))
            )}
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="lab-reports"
      title="Reports & analytics"
      description="Calculated live from the lab worklist, roster, analyzers, stock and tariffs. Export any report as CSV."
      total={reports.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search reports"
      pills={pills}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="export CSV"
      onPrimary={(key) => {
        const r = reports.find((x) => x.key === key);
        if (r && r.table.rows.length) exportReport(r);
      }}
      detailLabel="Report"
      renderDetail={renderDetail}
    />
  );
};

export default LabAdminReportsView;
