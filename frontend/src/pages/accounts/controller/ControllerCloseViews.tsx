// Finance Controller · overview and the close cycle: month-end, quarter-end, year-end, period locks.
import React, { useState } from 'react';
import { LayoutDashboard, CalendarCheck, CalendarRange, CalendarClock, Lock, Unlock, Check, CalendarX, Send, ArrowRight, CircleCheck } from 'lucide-react';
import {
  HmsMasterDetail,
  HmsListRow,
  HmsBadge,
  HmsButton,
  HmsDetailHeader,
  HmsStatStrip,
  HmsDetailBody,
  HmsDetailFooter,
  HmsSection,
  HmsRow,
  HmsNotice,
  HmsEmpty,
  HmsProgress,
  HmsTone,
  HMS,
} from '../../../components/hms';
import { accountsService } from '../../../services/accountsService';
import { humanize } from '../executive/executiveData';
import { cr } from '../manager/managerData';
import { MgrAction, MgrActionFooter } from '../manager/ManagerActions';
import { PERIOD_LABEL } from './controllerData';
import type { ControllerViewProps } from './controllerHelpers';

const has = (q: string, values: (string | number | undefined | null)[]) => !q || values.some((v) => String(v ?? '').toLowerCase().includes(q));
const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>{children}</div>;
const IQ_TONE: Record<string, HmsTone> = { g: 'green', a: 'amber', r: 'red', b: 'blue' };
const ST_TONE = (st: string): HmsTone => (/done|approved|reviewed|remediated|locked/i.test(st) ? 'green' : /risk|blocked|open/i.test(st) ? 'red' : /review|progress/i.test(st) ? 'blue' : 'gray');

/* ================================================================== */
/* Overview — integrity questions, risks, pending actions              */
/* ================================================================== */

export const ControllerOverviewView: React.FC<ControllerViewProps> = ({ data, onNavigateTab, initialFilter, initialSelect }) => {
  const { dash } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);

  type Item = { key: string; kind: 'question' | 'risk' | 'action'; title: string; sub: string; badge: React.ReactNode; screen: string; select?: string; amount?: number; detail: string };
  const items: Item[] = dash
    ? [
        ...dash.integrity_questions.map((q, i) => ({ key: `q:${i}`, kind: 'question' as const, title: q.q, sub: q.desc, badge: <HmsBadge tone={IQ_TONE[q.tone] || 'gray'}>{q.v}</HmsBadge>, screen: q.screen, detail: q.desc })),
        ...dash.risks.map((r, i) => ({ key: `r:${i}`, kind: 'risk' as const, title: r.title, sub: r.desc, badge: <HmsBadge tone={/critical/i.test(r.sev) ? 'red' : 'amber'}>{r.sev}</HmsBadge>, screen: r.screen, detail: r.desc })),
        ...dash.pending_actions.map((a, i) => ({ key: `a:${i}`, kind: 'action' as const, title: `${a.type} · ${a.ref}`, sub: `${a.module} · ${a.title}`, badge: <HmsBadge tone="blue">{a.type}</HmsBadge>, screen: a.screen, select: a.item_id, amount: a.amount || undefined, detail: a.title })),
      ]
    : [];
  const filters: Record<string, (i: Item) => boolean> = { all: () => true, questions: (i) => i.kind === 'question', risks: (i) => i.kind === 'risk', actions: (i) => i.kind === 'action' };
  const q = search.trim().toLowerCase();
  const visible = items.filter((i) => (filters[pill] || filters.all)(i) && has(q, [i.title, i.sub]));
  const count = (k: string) => items.filter(filters[k]).length;
  const rows: HmsListRow[] = visible.map((i) => ({ key: i.key, title: i.title, badge: i.badge, sub: i.sub, metaRight: i.amount ? <strong>{cr(i.amount)}</strong> : undefined }));

  const renderDetail = (key: string | null) => {
    if (!dash) return <HmsEmpty>{data.loading ? 'Loading the controller dashboard…' : 'The controller dashboard is unavailable.'}</HmsEmpty>;
    const i = items.find((x) => x.key === key);
    if (!i) return <HmsEmpty>Nothing needs you right now.</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={LayoutDashboard} title={i.title} badge={i.badge} subtitle={i.kind === 'question' ? 'Integrity question' : i.kind === 'risk' ? 'Critical risk' : 'Pending action'} />
        <HmsDetailBody>
          <HmsNotice tone={i.kind === 'risk' ? 'red' : i.kind === 'question' ? 'blue' : 'amber'}>{i.detail}</HmsNotice>
          <HmsSection title="Headline figures">
            {dash.kpis.map((k, idx) => (
              <HmsRow key={k.code} last={idx === dash.kpis.length - 1} label={k.label} hint={k.trend} value={<HmsButton size="sm" onClick={() => onNavigateTab(k.link_screen)}>{k.value}</HmsButton>} />
            ))}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton variant="primary" block icon={ArrowRight} onClick={() => onNavigateTab(i.screen, undefined, i.select)}>
            Open {humanize(i.screen)}
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="fc-overview"
      title="Integrity overview"
      description="Can we close, are the books right, and what is waiting on you."
      total={items.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search question, risk or action"
      pills={[
        { key: 'all', label: 'All', count: items.length },
        { key: 'questions', label: 'Integrity questions', count: count('questions') },
        { key: 'risks', label: 'Risks', count: count('risks'), tone: 'red' },
        { key: 'actions', label: 'Waiting on you', count: count('actions'), tone: 'amber' },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      onPrimary={(k) => {
        const i = items.find((x) => x.key === k);
        if (i) onNavigateTab(i.screen, undefined, i.select);
      }}
      detailLabel="Overview"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Month-end close                                                     */
/* ================================================================== */

export const ControllerMonthEndView: React.FC<ControllerViewProps> = ({ data, notify, onNavigateTab, initialFilter, initialSelect }) => {
  const me = data.monthEnd;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const list = me?.checklist || [];
  const q = search.trim().toLowerCase();
  const visible = list.filter((k) => (pill === 'all' || (pill === 'open' ? k.pct < 100 : k.pct >= 100)) && has(q, [k.t, k.d, k.owner]));

  const rows: HmsListRow[] = visible.map((k) => ({
    key: k.id,
    title: k.t,
    badge: <HmsBadge tone={ST_TONE(k.st)}>{k.st}</HmsBadge>,
    sub: `${k.owner} · ${k.d}`,
    metaLeft: `${k.pct}% complete`,
    progress: { pct: k.pct, doneLabel: 'Done', tone: k.st === 'At Risk' ? 'red' : 'blue' },
  }));

  const renderDetail = (key: string | null) => {
    if (!me) return <HmsEmpty>{data.loading ? 'Loading the month-end close…' : 'The month-end close is unavailable.'}</HmsEmpty>;
    const k = list.find((x) => x.id === key);
    const open = me.status === 'open' || me.status === 'reopened';
    const ready = me.readiness_pct >= 100;
    const actions: MgrAction[] = open
      ? [
          ...(ready ? [{ key: 'approve', label: 'Approve month-end close', icon: Check, confirm: `Every checklist item for ${me.period} is complete and I approve the close.`, run: async () => (await accountsService.approveMonthEndClose(me.period)).message }] : []),
          { key: 'delay', label: 'Delay close', icon: CalendarX, field: { label: 'New close date', type: 'date' }, comment: 'required', run: async (c, v) => (await accountsService.delayMonthEndClose(me.period, v, c)).message },
          { key: 'escalate', label: 'Escalate to CFO', icon: Send, comment: 'required', run: async (c) => (await accountsService.escalateMonthEndClose(me.period, c)).message },
        ]
      : [];
    return (
      <>
        <HmsDetailHeader icon={CalendarCheck} title={k ? k.t : `Month-end close · ${me.period}`} badge={<HmsBadge tone={ST_TONE(PERIOD_LABEL[me.status] || me.status)}>{PERIOD_LABEL[me.status] || humanize(me.status)}</HmsBadge>} subtitle={`Period ${me.period} · target ${me.target_date}`} />
        <HmsStatStrip
          items={[
            { label: 'Readiness', value: `${me.readiness_pct}%`, tone: ready ? 'green' : 'amber' },
            { label: 'Checklist done', value: `${list.filter((x) => x.pct >= 100).length}/${list.length}` },
            { label: 'Blockers', value: me.blockers.length, tone: me.blockers.length ? 'red' : 'green' },
            { label: 'Target', value: me.target_date },
          ]}
        />
        <HmsDetailBody>
          {open && !ready && <HmsNotice tone="amber">Close can be approved only when every checklist item reaches 100%. Blocking: {me.blockers.join(', ') || '—'}.</HmsNotice>}
          {!open && <HmsNotice tone="blue">Close is {(PERIOD_LABEL[me.status] || humanize(me.status)).toLowerCase()} — no further close actions.</HmsNotice>}
          {k && (
            <HmsSection title="Checklist item" padded>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '14px', color: HMS.text }}>{k.d}</div>
                <HmsProgress showLabel pct={k.pct} doneLabel="Done" label={`Complete · owner ${k.owner}`} tone={k.st === 'At Risk' ? 'red' : 'blue'} />
                {k.go && k.pct < 100 && (
                  <div>
                    <HmsButton size="sm" icon={ArrowRight} onClick={() => onNavigateTab(k.go!)}>
                      Open {humanize(k.go)}
                    </HmsButton>
                  </div>
                )}
              </div>
            </HmsSection>
          )}
          <HmsSection title="Close timeline">
            {me.timeline.map((t, i) => (
              <HmsRow key={i} last={i === me.timeline.length - 1} label={t.t} hint={t.when} value={<HmsBadge tone={t.state === 'd' ? 'green' : t.state === 'c' ? 'blue' : 'gray'}>{t.state === 'd' ? 'Done' : t.state === 'c' ? 'Current' : 'Upcoming'}</HmsBadge>} />
            ))}
          </HmsSection>
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="fc-monthend"
      title="Month-end close"
      description={me ? `Checklist for ${me.period} · ${me.readiness_pct}% ready` : 'Checklist for the period being closed.'}
      total={list.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search checklist or owner"
      pills={[
        { key: 'all', label: 'All', count: list.length },
        { key: 'open', label: 'Not done', count: list.filter((k) => k.pct < 100).length, tone: 'red' },
        { key: 'done', label: 'Done', count: list.filter((k) => k.pct >= 100).length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Month-end close"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Quarter-end close                                                   */
/* ================================================================== */

export const ControllerQuarterView: React.FC<ControllerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const qe = data.quarter;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const list = qe?.items || [];
  const q = search.trim().toLowerCase();
  const visible = list.filter((x) => (pill === 'all' || (pill === 'review' ? x.status === 'For Review' : x.status !== 'For Review')) && has(q, [x.title, x.owner]));
  const rows: HmsListRow[] = visible.map((x) => ({ key: x.id, title: x.title, badge: <HmsBadge tone={ST_TONE(x.status)}>{x.status}</HmsBadge>, sub: `${x.owner} · ${x.desc}` }));

  const renderDetail = (key: string | null) => {
    if (!qe) return <HmsEmpty>{data.loading ? 'Loading the quarter-end close…' : 'The quarter-end close is unavailable.'}</HmsEmpty>;
    const x = list.find((i) => i.id === key);
    const locked = /locked/i.test(qe.status);
    const actions: MgrAction[] = [];
    if (x && x.status === 'For Review') actions.push({ key: 'review', label: 'Mark reviewed', icon: Check, run: async () => (await accountsService.reviewQuarterEndItem(qe.quarter, x.id)).message });
    if (!locked) {
      actions.push({ key: 'approveQ', label: 'Approve quarter close', icon: CircleCheck, confirm: `I approve the ${qe.label} close.`, run: async () => (await accountsService.approveQuarterEndClose(qe.quarter)).message });
      actions.push({ key: 'lockQ', label: 'Lock quarter', icon: Lock, confirm: `Lock ${qe.label}. Further postings need a reopen.`, run: async () => (await accountsService.lockQuarterEndClose(qe.quarter)).message });
    }
    return (
      <>
        <HmsDetailHeader icon={CalendarRange} title={x ? x.title : qe.label} badge={<HmsBadge tone={ST_TONE(x ? x.status : qe.status)}>{x ? x.status : qe.status}</HmsBadge>} subtitle={`${qe.label} · ${qe.quarter}`} />
        <HmsStatStrip
          items={[
            { label: 'Months locked', value: qe.months_locked },
            { label: 'Items reviewed', value: qe.items_reviewed },
            { label: 'Bad-debt provision', value: qe.bad_debt_provision, note: 'From the server' },
            { label: 'Status', value: qe.status },
          ]}
        />
        <HmsDetailBody>
          {x ? (
            <HmsSection title="Item">
              <HmsRow label="Owner" value={x.owner} />
              <HmsRow label="Detail" value={x.desc} last />
            </HmsSection>
          ) : (
            <Muted>{list.length ? 'Select an item from the list.' : 'No quarter-end items have been set up on the server.'}</Muted>
          )}
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} note={locked ? 'The quarter is locked.' : undefined} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="fc-quarter"
      title="Quarter-end close"
      description={qe ? `${qe.label} · ${qe.months_locked} months locked` : 'Quarter-end review items.'}
      total={list.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search item or owner"
      pills={[
        { key: 'all', label: 'All', count: list.length },
        { key: 'review', label: 'For review', count: list.filter((x) => x.status === 'For Review').length, tone: 'amber' },
        { key: 'other', label: 'Other', count: list.filter((x) => x.status !== 'For Review').length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Quarter-end close"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Year-end close (audit observations and plan items)                  */
/* ================================================================== */

export const ControllerYearView: React.FC<ControllerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const ye = data.year;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'open');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const list = ye?.items || [];
  const isOpen = (s: string) => !/remediated|approved/i.test(s);
  const q = search.trim().toLowerCase();
  const visible = list.filter((x) => (pill === 'all' || (pill === 'open' ? isOpen(x.status) : !isOpen(x.status))) && has(q, [x.title, x.owner]));
  const rows: HmsListRow[] = visible.map((x) => ({ key: x.id, title: x.title, badge: <HmsBadge tone={ST_TONE(x.status)}>{x.status}</HmsBadge>, sub: `${x.kind === 'obs' ? 'Audit observation' : 'Year-end plan'} · ${x.owner}` }));

  const renderDetail = (key: string | null) => {
    if (!ye) return <HmsEmpty>{data.loading ? 'Loading the year-end close…' : 'The year-end close is unavailable.'}</HmsEmpty>;
    const x = list.find((i) => i.id === key);
    if (!x) return <HmsEmpty>{list.length ? 'Select an item from the list.' : `No audit observations or plan items for ${ye.fiscal_year} on the server.`}</HmsEmpty>;
    const actions: MgrAction[] = isOpen(x.status) ? [{ key: 'act', label: x.kind === 'obs' ? 'Mark remediated' : 'Approve plan item', icon: Check, run: async () => (await accountsService.actYearEndItem(ye.fiscal_year, x.id)).message }] : [];
    return (
      <>
        <HmsDetailHeader icon={CalendarClock} title={x.title} badge={<HmsBadge tone={ST_TONE(x.status)}>{x.status}</HmsBadge>} subtitle={`${ye.fiscal_year} · ${x.kind === 'obs' ? 'Audit observation' : 'Year-end plan'} · ${x.owner}`} />
        <HmsDetailBody>
          <HmsSection title="Detail" padded>
            <div style={{ fontSize: '14px', color: HMS.text, lineHeight: 1.6 }}>{x.desc || x.description || 'No description.'}</div>
          </HmsSection>
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="fc-year"
      title="Year-end close"
      description={`Audit observations and year-end plan · ${data.fy}`}
      total={list.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search observation or owner"
      pills={[
        { key: 'open', label: 'Open', count: list.filter((x) => isOpen(x.status)).length, tone: 'amber' },
        { key: 'done', label: 'Done', count: list.filter((x) => !isOpen(x.status)).length },
        { key: 'all', label: 'All', count: list.length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Year-end item"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Period locks                                                        */
/* ================================================================== */

export const ControllerLocksView: React.FC<ControllerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { periods } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const sorted = [...periods].sort((a, b) => b.period_key.localeCompare(a.period_key));
  const filters: Record<string, (p: (typeof periods)[number]) => boolean> = {
    all: () => true,
    open: (p) => ['open', 'reopened', 'soft_closed', 'close_pending', 'close_approved'].includes(p.status),
    requests: (p) => p.status === 'reopen_requested',
    locked: (p) => p.status === 'locked',
  };
  const q = search.trim().toLowerCase();
  const visible = sorted.filter((p) => (filters[pill] || filters.all)(p) && has(q, [p.period_key, p.period_type]));
  const count = (k: string) => periods.filter(filters[k]).length;
  const rows: HmsListRow[] = visible.map((p) => ({ key: p.id, title: p.period_key, badge: <HmsBadge tone={p.status === 'locked' ? 'gray' : p.status === 'reopen_requested' ? 'amber' : 'blue'}>{PERIOD_LABEL[p.status] || humanize(p.status)}</HmsBadge>, sub: humanize(p.period_type) }));

  const renderDetail = (key: string | null) => {
    const p = periods.find((x) => x.id === key);
    if (!p) return <HmsEmpty>{periods.length ? 'Select a period from the list.' : 'No accounting periods on the server.'}</HmsEmpty>;
    const raw = p as unknown as { note?: string; close_target_date?: string; locked_at?: string | null; approved_at?: string | null };
    const actions: MgrAction[] =
      p.status === 'locked'
        ? [{ key: 'reopen', label: 'Reopen period', icon: Unlock, comment: 'required', commentHint: 'Reopening a locked period is logged and the CFO is told.', run: async (c) => (await accountsService.reopenControllerPeriod(p.id, c)).message }]
        : p.status === 'reopen_requested'
          ? []
          : [{ key: 'lock', label: 'Lock period', icon: Lock, confirm: `Lock ${p.period_key}. Further postings need a reopen.`, run: async () => (await accountsService.lockControllerPeriod(p.id)).message }];
    return (
      <>
        <HmsDetailHeader icon={Lock} title={p.period_key} badge={<HmsBadge tone={p.status === 'locked' ? 'gray' : 'blue'}>{PERIOD_LABEL[p.status] || humanize(p.status)}</HmsBadge>} subtitle={humanize(p.period_type)} />
        <HmsDetailBody>
          {p.status === 'reopen_requested' && <HmsNotice tone="amber">A reopen has been requested for this period. Deciding it needs the request ID, which the period list does not return yet — decide it from the backend admin until that endpoint exists.</HmsNotice>}
          <HmsSection title="Period">
            <HmsRow label="Type" value={humanize(p.period_type)} />
            <HmsRow label="Close target" value={raw.close_target_date || '—'} />
            <HmsRow label="Locked at" value={raw.locked_at || '—'} />
            <HmsRow label="Note" value={raw.note || '—'} last />
          </HmsSection>
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="fc-locks"
      title="Period locks"
      description="Lock closed periods; reopen a locked one with a reason."
      total={periods.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search period"
      pills={[
        { key: 'all', label: 'All', count: periods.length },
        { key: 'open', label: 'Open', count: count('open') },
        { key: 'requests', label: 'Reopen requested', count: count('requests'), tone: 'amber' },
        { key: 'locked', label: 'Locked', count: count('locked') },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Period"
      renderDetail={renderDetail}
    />
  );
};
