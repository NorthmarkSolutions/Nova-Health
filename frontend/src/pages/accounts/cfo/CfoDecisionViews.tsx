// CFO · investments, executive and risk decisions: CapEx, strategic approvals, growth opportunities,
// strategic risks, financial alerts, board reporting and the executive decision log.
import React, { useState } from 'react';
import { Building, Stamp, Rocket, ShieldAlert, BellRing, Presentation, ScrollText, Check, X, Landmark, Search as SearchIcon, ArrowRight, Pause, UserCheck, FileDown, FilePlus2, Eye, EyeOff } from 'lucide-react';
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
  HmsTone,
  HMS,
} from '../../../components/hms';
import { accountsService, TrailEntry } from '../../../services/accountsService';
import { apiError, humanize } from '../executive/executiveData';
import { MgrAction, MgrActionFooter } from '../manager/ManagerActions';
import { BOARD_LIMIT_CR, crc, isAwaitingCfo } from './cfoData';
import type { CfoViewProps } from './cfoHelpers';

const has = (q: string, values: (string | number | undefined | null)[]) => !q || values.some((v) => String(v ?? '').toLowerCase().includes(q));
const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>{children}</div>;
const tone = (s: string): HmsTone => (/approved|accepted|handled|acknowledged|advance|mitigat|in pack|exported/i.test(s) ? 'green' : /awaiting|open|draft|monitor|idea|feasib|business/i.test(s) ? 'blue' : /reject|critical/i.test(s) ? 'red' : /board|info|analysis|park|revision|high|rising/i.test(s) ? 'amber' : 'gray');
const Tag: React.FC<{ s: string }> = ({ s }) => <HmsBadge tone={tone(s)}>{s}</HmsBadge>;
const riskTone = (r: string): HmsTone => (/critical/i.test(r) ? 'red' : /high/i.test(r) ? 'amber' : /medium/i.test(r) ? 'blue' : 'gray');
const msg = (r: unknown, fallback: string) => (r as { message?: string } | null)?.message || fallback;

const Trail: React.FC<{ trail?: TrailEntry[] }> = ({ trail }) => (
  <HmsSection title={`Trail (${trail?.length || 0})`}>
    {trail?.length ? trail.map((t, i) => <HmsRow key={i} last={i === trail.length - 1} label={t.t} hint={t.c || undefined} value={<span style={{ fontSize: '12px', color: HMS.textSecondary }}>{`${t.who} · ${t.when}`}</span>} />) : <Muted>No actions recorded yet.</Muted>}
  </HmsSection>
);

/* ================================================================== */
/* CapEx planning                                                      */
/* ================================================================== */

export const CfoCapexView: React.FC<CfoViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const cx = data.capex;
  const list = cx?.requests || [];
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'awaiting');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const filters: Record<string, (x: (typeof list)[number]) => boolean> = { awaiting: (x) => isAwaitingCfo(x.status), board: (x) => /board/i.test(x.status), decided: (x) => !isAwaitingCfo(x.status), all: () => true };
  const q = search.trim().toLowerCase();
  const visible = list.filter((x) => (filters[pill] || filters.all)(x) && has(q, [x.reference_no, x.name, x.department_id]));
  const count = (k: string) => list.filter(filters[k]).length;
  const rows: HmsListRow[] = visible.map((x) => ({ key: x.id, title: x.name, badge: <Tag s={x.status} />, sub: `${x.reference_no} · ${x.department_id} · due ${x.due_date}`, metaLeft: `ROI ${Number(x.roi_pct)}% · payback ${Number(x.payback_years)} yrs`, metaRight: <strong>{crc(x.cost)}</strong> }));

  const renderDetail = (key: string | null) => {
    if (!cx) return <HmsEmpty>{data.loading ? 'Loading CapEx…' : 'CapEx requests are unavailable.'}</HmsEmpty>;
    const x = list.find((i) => i.id === key);
    if (!x) return <HmsEmpty>{list.length ? 'Select a request from the list.' : 'No CapEx requests.'}</HmsEmpty>;
    const overAuthority = Number(x.cost) > BOARD_LIMIT_CR;
    const decide = (a: 'approve' | 'board' | 'reject' | 'analysis', done: string) => async (c: string) => msg(await accountsService.decideCfoCapex(x.id, a, c), `${x.reference_no} — ${done}`);
    const actions: MgrAction[] = isAwaitingCfo(x.status)
      ? [
          overAuthority ? { key: 'board', label: 'Recommend to Board', icon: Landmark, comment: 'required', run: decide('board', 'recommended to the Board') } : { key: 'approve', label: 'Approve CapEx', icon: Check, comment: 'optional', confirm: `I approve ${crc(x.cost)} for ${x.name}, funded ${x.funding_mix}.`, run: decide('approve', 'approved') },
          { key: 'analysis', label: 'Request analysis', icon: SearchIcon, comment: 'required', run: decide('analysis', 'analysis requested') },
          { key: 'reject', label: 'Reject', variant: 'danger', icon: X, comment: 'required', run: decide('reject', 'rejected') },
          ...(!overAuthority ? [{ key: 'board', label: 'Refer to Board', icon: Landmark, comment: 'required' as const, run: decide('board', 'recommended to the Board') }] : []),
        ]
      : [];
    const pf = cx.pro_forma;
    return (
      <>
        <HmsDetailHeader icon={Building} title={x.name} badge={<Tag s={x.status} />} subtitle={`${x.reference_no} · ${x.department_id} · proposed by ${x.proposed_by}`} />
        <HmsStatStrip
          items={[
            { label: 'Cost', value: crc(x.cost), tone: overAuthority ? 'amber' : 'default', note: overAuthority ? `Above ₹ ${BOARD_LIMIT_CR} Cr — Board` : 'Within your authority' },
            { label: 'ROI', value: `${Number(x.roi_pct)}%`, note: `NPV ${crc(x.npv)}` },
            { label: 'Payback', value: `${Number(x.payback_years)} yrs` },
            { label: 'Risk', value: x.risk_level, tone: x.risk_level === 'High' ? 'red' : 'default' },
          ]}
        />
        <HmsDetailBody>
          <HmsNotice tone="blue">Why: {x.driver}</HmsNotice>
          <HmsSection title="Proposal">
            <HmsRow label="Funding" value={x.funding_mix} />
            <HmsRow label="Cash out" value={crc(x.cash_out)} />
            <HmsRow label="Annual revenue impact" value={crc(x.annual_revenue_impact)} />
            <HmsRow label="Timeline" value={x.timeline} last />
          </HmsSection>
          <HmsSection title="Debt position (pro forma)">
            <HmsRow label="Total debt" value={crc(pf.total_debt)} hint={pf.new_loans ? `incl. ${crc(pf.new_loans)} new loans` : undefined} />
            <HmsRow label="Debt / equity" value={`${pf.de_ratio.toFixed(2)}x`} />
            <HmsRow label="Debt service cover (DSCR)" value={`${pf.dscr.toFixed(2)}x`} />
            <HmsRow label="Borrowing headroom" value={crc(pf.borrowing_headroom)} last />
          </HmsSection>
          <Trail trail={x.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="cfo-capex"
      title="CapEx planning"
      description={cx ? `${cx.kpis.awaiting_count} awaiting · ${cx.kpis.awaiting_cost} · expected ROI ${cx.kpis.expected_roi}` : 'Capital expenditure requests.'}
      total={list.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search reference, name or department"
      pills={[
        { key: 'awaiting', label: 'Awaiting you', count: count('awaiting'), tone: 'amber' },
        { key: 'board', label: 'With Board', count: count('board') },
        { key: 'decided', label: 'Decided', count: count('decided') },
        { key: 'all', label: 'All', count: list.length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="CapEx request"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Strategic approvals                                                 */
/* ================================================================== */

export const CfoApprovalsView: React.FC<CfoViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const list = data.approvals;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'awaiting');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const filters: Record<string, (x: (typeof list)[number]) => boolean> = { awaiting: (x) => isAwaitingCfo(x.status), high: (x) => isAwaitingCfo(x.status) && x.risk_level === 'High', decided: (x) => !isAwaitingCfo(x.status), all: () => true };
  const q = search.trim().toLowerCase();
  const visible = list.filter((x) => (filters[pill] || filters.all)(x) && has(q, [x.reference_no, x.title, x.approval_type]));
  const count = (k: string) => list.filter(filters[k]).length;
  const rows: HmsListRow[] = visible.map((x) => ({ key: x.id, title: x.title, badge: <Tag s={x.status} />, sub: `${x.reference_no} · ${x.approval_type} · ${x.value_text}`, metaLeft: <HmsBadge tone={riskTone(x.risk_level)}>{x.risk_level} risk</HmsBadge>, metaRight: <strong>{Number(x.annual_impact) ? `${crc(x.annual_impact)} / yr` : '—'}</strong> }));

  const renderDetail = (key: string | null) => {
    const x = list.find((i) => i.id === key);
    if (!x) return <HmsEmpty>{list.length ? 'Select an approval from the list.' : 'No strategic approvals.'}</HmsEmpty>;
    const decide = (a: 'approve' | 'reject' | 'info' | 'board', done: string) => async (c: string) => msg(await accountsService.decideCfoStrategicApproval(x.id, a, c), `${x.reference_no} — ${done}`);
    const actions: MgrAction[] = isAwaitingCfo(x.status)
      ? [
          { key: 'approve', label: 'Approve', icon: Check, comment: 'optional', run: decide('approve', 'approved') },
          { key: 'info', label: 'Request information', icon: SearchIcon, comment: 'required', run: decide('info', 'information requested') },
          { key: 'board', label: 'Refer to Board', icon: Landmark, comment: 'required', run: decide('board', 'referred to the Board') },
          { key: 'reject', label: 'Reject', variant: 'danger', icon: X, comment: 'required', run: decide('reject', 'rejected') },
        ]
      : [];
    return (
      <>
        <HmsDetailHeader icon={Stamp} title={x.title} badge={<Tag s={x.status} />} subtitle={`${x.reference_no} · ${x.approval_type} · submitted by ${x.submitted_by}`} />
        <HmsStatStrip
          items={[
            { label: 'Value', value: x.value_text },
            { label: 'Annual impact', value: Number(x.annual_impact) ? crc(x.annual_impact) : '—' },
            { label: 'Return', value: x.roi_text || '—' },
            { label: 'Risk', value: x.risk_level, tone: x.risk_level === 'High' ? 'red' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {x.note && <HmsNotice tone="blue">{x.note}</HmsNotice>}
          <HmsSection title="Terms">{x.key_values.length ? x.key_values.map(([k, v], n) => <HmsRow key={k} label={k} value={v} last={n === x.key_values.length - 1} />) : <Muted>No terms recorded.</Muted>}</HmsSection>
          <Trail trail={x.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="cfo-approvals"
      title="Strategic approvals"
      description="Major contracts, tariffs and commitments awaiting your decision."
      total={list.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search reference, title or type"
      pills={[
        { key: 'awaiting', label: 'Awaiting you', count: count('awaiting'), tone: 'amber' },
        { key: 'high', label: 'High risk', count: count('high'), tone: 'red' },
        { key: 'decided', label: 'Decided', count: count('decided') },
        { key: 'all', label: 'All', count: list.length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Strategic approval"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Growth opportunities                                                */
/* ================================================================== */

const STAGES = ['Idea', 'Feasibility', 'Business Case', 'Approved'];

export const CfoGrowthView: React.FC<CfoViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const list = data.growth;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const q = search.trim().toLowerCase();
  const visible = list.filter((x) => (pill === 'all' || x.stage === pill) && has(q, [x.reference_no, x.title, x.opportunity_type]));
  const rows: HmsListRow[] = visible.map((x) => ({ key: x.id, title: x.title, badge: <Tag s={x.stage} />, sub: `${x.reference_no} · ${x.opportunity_type}`, metaLeft: `IRR ${Number(x.irr_pct)}% · ${crc(x.revenue_potential)} / yr`, metaRight: <strong>{crc(x.investment)}</strong> }));

  const renderDetail = (key: string | null) => {
    const x = list.find((i) => i.id === key);
    if (!x) return <HmsEmpty>{list.length ? 'Select an opportunity from the list.' : 'No growth opportunities.'}</HmsEmpty>;
    const live = STAGES.includes(x.stage) && x.stage !== 'Approved';
    const decide = (a: 'advance' | 'board' | 'park' | 'reject', done: string) => async (c: string) => msg(await accountsService.decideCfoGrowthOpportunity(x.id, a, c), `${x.reference_no} — ${done}`);
    const next = STAGES[STAGES.indexOf(x.stage) + 1];
    const actions: MgrAction[] = live
      ? [
          { key: 'advance', label: next ? `Advance to ${next}` : 'Advance', icon: ArrowRight, comment: 'optional', run: decide('advance', `advanced${next ? ` to ${next}` : ''}`) },
          { key: 'board', label: 'Refer to Board', icon: Landmark, comment: 'required', run: decide('board', 'referred to the Board') },
          { key: 'park', label: 'Park', icon: Pause, comment: 'required', run: decide('park', 'parked') },
          { key: 'reject', label: 'Reject', variant: 'danger', icon: X, comment: 'required', run: decide('reject', 'rejected') },
        ]
      : [];
    return (
      <>
        <HmsDetailHeader icon={Rocket} title={x.title} badge={<Tag s={x.stage} />} subtitle={`${x.reference_no} · ${x.opportunity_type}`} />
        <HmsStatStrip
          items={[
            { label: 'Investment', value: crc(x.investment) },
            { label: 'Revenue potential', value: `${crc(x.revenue_potential)} / yr`, note: `by year ${x.maturity_year}` },
            { label: 'IRR', value: `${Number(x.irr_pct)}%`, note: `payback ${Number(x.payback_years)} yrs` },
            { label: 'Risk', value: x.risk_level, tone: x.risk_level === 'High' ? 'red' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {x.note && <HmsNotice tone="blue">{x.note}</HmsNotice>}
          <Trail trail={x.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="cfo-growth"
      title="Growth opportunities"
      description="New specialties, expansions and partnerships, from idea to approval."
      total={list.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search opportunity"
      pills={[{ key: 'all', label: 'All', count: list.length }, ...STAGES.map((s) => ({ key: s, label: s, count: list.filter((x) => x.stage === s).length }))]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Opportunity"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Strategic risks                                                     */
/* ================================================================== */

const LIKELIHOOD = ['Rare', 'Possible', 'Likely', 'Almost certain'];
const IMPACT = ['Low', 'Medium', 'High', 'Critical'];

export const CfoRisksView: React.FC<CfoViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const list = data.risks;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const q = search.trim().toLowerCase();
  const visible = list.filter((x) => (pill === 'all' || (pill === 'rising' ? /rising/i.test(x.trend) : x.rating === pill)) && has(q, [x.reference_no, x.title, x.owner]));
  const rows: HmsListRow[] = visible.map((x) => ({ key: x.id, title: x.title, badge: <HmsBadge tone={riskTone(x.rating)}>{x.rating}</HmsBadge>, sub: `${x.reference_no} · ${x.owner}`, metaLeft: <Tag s={x.status} />, metaRight: x.trend }));

  const renderDetail = (key: string | null) => {
    const x = list.find((i) => i.id === key);
    if (!x) return <HmsEmpty>{list.length ? 'Select a risk from the list.' : 'No strategic risks logged.'}</HmsEmpty>;
    const decide = (a: 'mitigate' | 'accept' | 'board', done: string) => async (c: string) => msg(await accountsService.decideCfoStrategicRisk(x.id, a, c), `${x.reference_no} — ${done}`);
    const closed = /accepted|with board/i.test(x.status);
    const actions: MgrAction[] = closed
      ? []
      : [
          { key: 'mitigate', label: 'Request mitigation plan', icon: ShieldAlert, comment: 'required', commentHint: `Sent to ${x.owner}.`, run: decide('mitigate', 'mitigation requested') },
          { key: 'accept', label: 'Accept risk', icon: Check, comment: 'required', run: decide('accept', 'accepted') },
          { key: 'board', label: 'Escalate to Board', icon: Landmark, comment: 'required', run: decide('board', 'escalated to the Board') },
        ];
    return (
      <>
        <HmsDetailHeader icon={ShieldAlert} title={x.title} badge={<HmsBadge tone={riskTone(x.rating)}>{x.rating}</HmsBadge>} subtitle={`${x.reference_no} · owner ${x.owner} · ${x.status}`} />
        <HmsStatStrip
          items={[
            { label: 'Impact', value: IMPACT[x.impact] || x.impact },
            { label: 'Likelihood', value: LIKELIHOOD[x.likelihood] || x.likelihood },
            { label: 'Trend', value: x.trend, tone: /rising/i.test(x.trend) ? 'amber' : 'default' },
            { label: 'Status', value: x.status },
          ]}
        />
        <HmsDetailBody>
          <HmsNotice tone={riskTone(x.rating) === 'red' ? 'red' : 'amber'}>{x.description}</HmsNotice>
          <HmsSection title="Mitigation" padded>
            <div style={{ fontSize: '14px', color: x.mitigation ? HMS.text : HMS.textSecondary, lineHeight: 1.6 }}>{x.mitigation || 'No mitigation recorded.'}</div>
          </HmsSection>
          <Trail trail={x.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="cfo-risks"
      title="Strategic risks"
      description="Enterprise financial risks by rating and trend."
      total={list.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search risk or owner"
      pills={[
        { key: 'all', label: 'All', count: list.length },
        ...['Critical', 'High', 'Medium', 'Low'].map((r) => ({ key: r, label: r, count: list.filter((x) => x.rating === r).length, ...(r === 'Critical' ? { tone: 'red' as const } : {}) })),
        { key: 'rising', label: 'Rising', count: list.filter((x) => /rising/i.test(x.trend)).length, tone: 'amber' },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Strategic risk"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Financial alerts                                                    */
/* ================================================================== */

export const CfoAlertsView: React.FC<CfoViewProps> = ({ data, notify, onNavigateTab, initialFilter, initialSelect }) => {
  const list = data.alerts;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'open');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const isOpen = (x: (typeof list)[number]) => /open/i.test(x.status);
  const filters: Record<string, (x: (typeof list)[number]) => boolean> = { open: isOpen, critical: (x) => isOpen(x) && /critical/i.test(x.severity), handled: (x) => !isOpen(x), all: () => true };
  const q = search.trim().toLowerCase();
  const visible = list.filter((x) => (filters[pill] || filters.all)(x) && has(q, [x.alert_no, x.title, x.alert_type]));
  const count = (k: string) => list.filter(filters[k]).length;
  const rows: HmsListRow[] = visible.map((x) => ({ key: x.id, title: x.title, badge: <HmsBadge tone={riskTone(x.severity)}>{x.severity}</HmsBadge>, sub: `${x.alert_no} · ${x.alert_type}`, metaLeft: <Tag s={x.status} />, metaRight: x.assigned_to ? `→ ${x.assigned_to}` : undefined }));

  const renderDetail = (key: string | null) => {
    const x = list.find((i) => i.id === key);
    if (!x) return <HmsEmpty>{list.length ? 'Select an alert from the list.' : 'No financial alerts.'}</HmsEmpty>;
    const act = (a: 'ack' | 'assign' | 'pack', done: string) => async (c: string, v: string) => msg(await accountsService.actCfoExecutiveAlert(x.id, a, v || undefined, c), done);
    const actions: MgrAction[] = isOpen(x)
      ? [
          { key: 'ack', label: 'Acknowledge', icon: Check, comment: 'optional', run: act('ack', 'Alert acknowledged') },
          { key: 'assign', label: 'Assign', icon: UserCheck, field: { label: 'Who should act', type: 'text', placeholder: 'e.g. Finance Controller' }, comment: 'optional', run: act('assign', 'Alert assigned') },
          { key: 'pack', label: 'Add to board pack', icon: FilePlus2, comment: 'optional', run: act('pack', 'Added to the board pack') },
        ]
      : [];
    return (
      <>
        <HmsDetailHeader icon={BellRing} title={x.title} badge={<HmsBadge tone={riskTone(x.severity)}>{x.severity}</HmsBadge>} subtitle={`${x.alert_no} · ${x.alert_type} · ${x.status}${x.assigned_to ? ` · assigned to ${x.assigned_to}` : ''}`} />
        <HmsDetailBody>
          <HmsNotice tone={/critical/i.test(x.severity) ? 'red' : 'amber'}>{x.detail}</HmsNotice>
          {x.target_screen && (
            <div>
              <HmsButton size="sm" icon={ArrowRight} onClick={() => onNavigateTab(x.target_screen)}>
                Open {humanize(x.target_screen)}
              </HmsButton>
            </div>
          )}
          <Trail trail={x.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="cfo-alerts"
      title="Financial alerts"
      description="Cash, margin, payer and compliance alerts raised by finance analytics."
      total={list.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search alert"
      pills={[
        { key: 'open', label: 'Open', count: count('open') },
        { key: 'critical', label: 'Critical', count: count('critical'), tone: 'red' },
        { key: 'handled', label: 'Handled', count: count('handled') },
        { key: 'all', label: 'All', count: list.length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Alert"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Board reporting                                                     */
/* ================================================================== */

export const CfoBoardView: React.FC<CfoViewProps> = ({ data, notify, initialSelect }) => {
  const br = data.board;
  const sections = br?.sections || [];
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [busy, setBusy] = useState<string | null>(null);
  const q = search.trim().toLowerCase();
  const rows: HmsListRow[] = [
    ...(br ? [{ key: '__pack', title: `Board pack · ${br.period}`, badge: <Tag s={br.status} />, sub: `Meeting ${br.meeting_date} · ${sections.filter((s) => s.included).length} of ${sections.length} sections` }] : []),
    ...sections.filter((s) => has(q, [s.title])).map((s) => ({ key: s.key, title: s.title, badge: <HmsBadge tone={s.included ? 'green' : 'gray'}>{s.included ? 'Included' : 'Left out'}</HmsBadge>, sub: s.metrics.map((m) => `${m.label} ${m.value}`).join(' · ') })),
  ];

  const toggle = async (key: string, included: boolean) => {
    setBusy(key);
    try {
      await accountsService.toggleCfoBoardSection(key, included);
      notify(included ? 'Section added to the pack' : 'Section left out of the pack');
      await data.reload();
    } catch (e) {
      notify(apiError(e, 'Could not change the section'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const renderDetail = (key: string | null) => {
    if (!br) return <HmsEmpty>{data.loading ? 'Loading the board pack…' : 'The board pack is unavailable.'}</HmsEmpty>;
    const s = sections.find((x) => x.key === key);
    const approved = /approved/i.test(br.status);
    const packActions: MgrAction[] = [
      ...(!approved ? [{ key: 'approve', label: 'Approve board pack', icon: Check, comment: 'optional' as const, confirm: `I approve the ${br.period} board pack for the ${br.meeting_date} meeting.`, run: async (c: string) => msg(await accountsService.approveCfoBoardReport(c), 'Board pack approved') }] : []),
      { key: 'pdf', label: 'Export PDF', icon: FileDown, run: async () => msg(await accountsService.exportCfoBoardReport('pdf'), 'Board pack exported') },
      { key: 'pptx', label: 'Export slides', icon: FileDown, run: async () => msg(await accountsService.exportCfoBoardReport('pptx'), 'Board slides exported') },
    ];
    if (s)
      return (
        <>
          <HmsDetailHeader icon={Presentation} title={s.title} badge={<HmsBadge tone={s.included ? 'green' : 'gray'}>{s.included ? 'Included' : 'Left out'}</HmsBadge>} subtitle={`Board pack · ${br.period}`} />
          <HmsDetailBody>
            <HmsSection title="Figures">{s.metrics.map((m, n) => <HmsRow key={m.label} label={m.label} value={<strong>{m.value}</strong>} last={n === s.metrics.length - 1} />)}</HmsSection>
            <HmsSection title="Narrative" padded>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', lineHeight: 1.5 }}>
                {s.bullets.map((b) => (
                  <div key={b}>• {b}</div>
                ))}
              </div>
            </HmsSection>
          </HmsDetailBody>
          {!approved && (
            <HmsDetailFooter>
              <HmsButton block icon={s.included ? EyeOff : Eye} disabled={busy === s.key} onClick={() => toggle(s.key, !s.included)}>
                {busy === s.key ? 'Saving…' : s.included ? 'Leave out of the pack' : 'Include in the pack'}
              </HmsButton>
            </HmsDetailFooter>
          )}
        </>
      );
    return (
      <>
        <HmsDetailHeader icon={Presentation} title={`Board pack · ${br.period}`} badge={<Tag s={br.status} />} subtitle={`Board meeting ${br.meeting_date}`} />
        <HmsStatStrip
          items={[
            { label: 'Meeting', value: br.kpis.meeting },
            { label: 'Status', value: br.kpis.pack_status },
            { label: 'Sections', value: `${sections.filter((x) => x.included).length}/${br.kpis.sections_count}` },
            { label: 'Decisions for Board', value: br.kpis.decisions_for_board },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title="Headlines" padded>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', lineHeight: 1.5 }}>
              {br.headlines.map((h) => (
                <div key={h}>• {h}</div>
              ))}
            </div>
          </HmsSection>
          <Trail trail={br.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={packActions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="cfo-board"
      title="Board reporting"
      description={br ? `${br.period} pack for the ${br.meeting_date} meeting` : 'Quarterly board pack.'}
      total={sections.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search section"
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Board pack"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Executive decisions (read-only log)                                 */
/* ================================================================== */

const DEC_CATS = ['Investment', 'CapEx', 'Budget', 'Expansion'];

export const CfoDecisionsView: React.FC<CfoViewProps> = ({ data, initialFilter, initialSelect }) => {
  const list = data.decisions;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const q = search.trim().toLowerCase();
  const visible = list.filter((x) => (pill === 'all' || x.category === pill) && has(q, [x.decision_no, x.title, x.reason]));
  const rows: HmsListRow[] = visible.map((x) => ({ key: x.id, title: x.title, badge: <Tag s={x.outcome} />, sub: `${x.decision_no} · ${x.category} · ${x.decided_date}`, metaLeft: x.impact_text || undefined }));

  const renderDetail = (key: string | null) => {
    const x = list.find((i) => i.id === key);
    if (!x) return <HmsEmpty>{list.length ? 'Select a decision from the list.' : 'No executive decisions logged.'}</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={ScrollText} title={x.title} badge={<Tag s={x.outcome} />} subtitle={`${x.decision_no} · ${x.category} · ${x.decided_date}${x.decided_by_name ? ` · ${x.decided_by_name}` : ''}`} />
        <HmsDetailBody>
          <HmsSection title="Decision">
            <HmsRow label="Outcome" value={x.outcome} />
            <HmsRow label="Reason" value={x.reason || '—'} />
            <HmsRow label="Impact" value={x.impact_text || '—'} last />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="cfo-decisions"
      title="Executive decisions"
      description="Every CFO decision with its reason and impact — read-only."
      total={list.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search decision or reason"
      pills={[{ key: 'all', label: 'All', count: list.length }, ...DEC_CATS.map((c) => ({ key: c, label: c, count: list.filter((x) => x.category === c).length }))]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Decision"
      renderDetail={renderDetail}
    />
  );
};

