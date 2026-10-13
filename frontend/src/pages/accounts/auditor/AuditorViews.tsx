// Auditor · read-only engagement views: integrity, shared evidence (PBC), internal controls,
// audit trail, journal trace and the general ledger. Every request is recorded server-side.
import React, { useState } from 'react';
import { ShieldCheck, ClipboardCheck, ListChecks, ScrollText, Route, BookOpen, ArrowRight, ExternalLink, Search as SearchIcon } from 'lucide-react';
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
  INPUT,
  HMS,
} from '../../../components/hms';
import { accountsService, AuditorPBCEvidence, JournalTrace } from '../../../services/accountsService';
import { humanize } from '../executive/executiveData';
import { MONO } from '../executive/executiveHelpers';
import { useSectionSource } from '../manager/managerData';
import { daysUntil, rupees, when } from './auditorData';
import type { AuditorViewProps } from './auditorHelpers';

const has = (q: string, values: (string | number | undefined | null)[]) => !q || values.some((v) => String(v ?? '').toLowerCase().includes(q));
const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>{children}</div>;
const tone = (s: string): HmsTone => (/verified|intact|closed|shared|posted|approved/i.test(s) ? 'green' : /broken|altered|missing|open|critical|escalat/i.test(s) ? 'red' : /remediat|high|medium/i.test(s) ? 'amber' : 'gray');
const Tag: React.FC<{ s: string }> = ({ s }) => <HmsBadge tone={tone(s)}>{humanize(s)}</HmsBadge>;
const ReadOnly = <HmsBadge tone="gray">Read-only</HmsBadge>;

/** Shown in every section while the engagement access is refused or not yet loaded. */
const Gate: React.FC<{ data: AuditorViewProps['data']; what: string }> = ({ data, what }) => (
  <HmsEmpty>{data.denied ? `${data.denied} Access is time-boxed to an engagement and granted by the Finance Controller.` : data.loading ? `Loading ${what}…` : `${what} is unavailable.`}</HmsEmpty>
);

/* ================================================================== */
/* Engagement & integrity                                              */
/* ================================================================== */

export const AuditorOverviewView: React.FC<AuditorViewProps> = ({ data, initialFilter, initialSelect }) => {
  const { me, integrity } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'chain');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const days = integrity?.chain.days || [];
  const exportsList = integrity?.worm_exports.exports || [];
  const q = search.trim().toLowerCase();
  const rows: HmsListRow[] = [
    ...(me ? [{ key: '__engagement', title: me.engagement ? `${me.engagement.engagement_no} · ${me.engagement.auditor_firm}` : 'Governance preview', badge: <HmsBadge tone={me.chain.valid ? 'green' : 'red'}>{me.chain.valid ? 'Chain verified' : 'Chain broken'}</HmsBadge>, sub: me.engagement ? `${me.engagement.type} audit · ${me.engagement.period_from} → ${me.engagement.period_to}` : 'No engagement linked' }] : []),
    ...(pill === 'chain'
      ? [...days].reverse().filter((d) => has(q, [d.date])).map((d) => ({ key: `d:${d.date}`, title: d.date, badge: <Tag s={d.valid ? 'Verified' : 'Broken'} />, sub: `${d.records} records hashed` }))
      : [...exportsList].reverse().filter((x) => has(q, [x.export_date])).map((x) => ({ key: `x:${x.export_date}`, title: `Export ${x.export_date}`, badge: <Tag s={x.status} />, sub: `${x.records} records · write-once file` }))),
  ];

  const renderDetail = (key: string | null) => {
    if (!me || !integrity) return <Gate data={data} what="Engagement" />;
    const d = days.find((x) => `d:${x.date}` === key);
    const x = exportsList.find((e) => `x:${e.export_date}` === key);
    const left = daysUntil(me.access?.valid_until);
    return (
      <>
        <HmsDetailHeader icon={ShieldCheck} title={d ? `Chain verification · ${d.date}` : x ? `WORM export · ${x.export_date}` : 'Engagement & integrity'} badge={ReadOnly} subtitle={me.engagement ? `${me.engagement.engagement_no} · ${me.engagement.auditor_firm}` : 'Governance preview'} />
        <HmsStatStrip
          items={[
            { label: 'Hash chain', value: integrity.chain.valid ? 'Verified' : 'Broken', tone: integrity.chain.valid ? 'green' : 'red', note: `${integrity.chain.total_records} records · #${integrity.chain.last_sequence}` },
            { label: 'WORM exports', value: exportsList.length, tone: integrity.worm_exports.valid ? 'green' : 'red', note: integrity.worm_exports.valid ? 'All files intact' : 'A file failed verification' },
            { label: 'Fieldwork', value: me.engagement ? `${me.engagement.fieldwork_from} → ${me.engagement.fieldwork_to}` : '—' },
            { label: 'Access until', value: me.access ? when(me.access.valid_until) : 'Preview', tone: left != null && left <= 3 ? 'amber' : 'default', note: left != null ? `${Math.max(0, left)} day${left === 1 ? '' : 's'} left` : undefined },
          ]}
        />
        <HmsDetailBody>
          {!integrity.chain.valid && (
            <HmsNotice tone="red">
              Chain broken at sequence {integrity.chain.broken_at_sequence}: {integrity.chain.error}
            </HmsNotice>
          )}
          {d && (
            <HmsSection title="Day">
              <HmsRow label="Records hashed" value={d.records} />
              <HmsRow label="Result" value={<Tag s={d.valid ? 'Verified' : 'Broken'} />} last />
            </HmsSection>
          )}
          {x && (
            <HmsSection title="Export">
              <HmsRow label="Records" value={x.records} />
              <HmsRow label="File check" value={<Tag s={x.status} />} last />
            </HmsSection>
          )}
          <HmsSection title="Chain head">
            <HmsRow label="Head hash" value={<span style={{ ...MONO, wordBreak: 'break-all' }}>{integrity.chain.head_hash || '—'}</span>} />
            <HmsRow label="Status" value={humanize(integrity.chain.status)} last />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="aud-overview"
      title="Engagement & integrity"
      description="Your access window, the audit hash chain and write-once exports."
      total={days.length + exportsList.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search date"
      pills={[
        { key: 'chain', label: 'Chain by day', count: days.length },
        { key: 'exports', label: 'WORM exports', count: exportsList.length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Integrity"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Audit readiness — evidence shared by the Finance Controller        */
/* ================================================================== */

export const AuditorPbcView: React.FC<AuditorViewProps> = ({ data, initialSelect }) => {
  const { pbc } = data;
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const q = search.trim().toLowerCase();
  const visible = pbc.filter((p) => has(q, [p.id, p.title, p.owner]));
  const activeId = visible.find((p) => p.id === selected)?.id ?? visible[0]?.id ?? '';
  const ev = useSectionSource<AuditorPBCEvidence | null>(() => (activeId ? accountsService.getAuditorPBCEvidence(activeId) : Promise.resolve(null)), [activeId], null);
  const rows: HmsListRow[] = visible.map((p) => ({ key: p.id, title: p.title, badge: <Tag s={p.status} />, sub: `${p.id} · ${p.owner}`, metaLeft: `Shared ${when(p.shared_at)}`, metaRight: `${p.evidence_count} file${p.evidence_count === 1 ? '' : 's'}` }));

  const renderDetail = (key: string | null) => {
    if (data.denied) return <Gate data={data} what="Shared evidence" />;
    const p = pbc.find((x) => x.id === key);
    if (!p) return <HmsEmpty>{pbc.length ? 'Select an item from the list.' : 'Nothing has been shared with you yet.'}</HmsEmpty>;
    const e = ev.value && ev.value.id === p.id ? ev.value : null;
    return (
      <>
        <HmsDetailHeader icon={ClipboardCheck} title={p.title} badge={ReadOnly} subtitle={`${p.id} · owner ${p.owner} · due ${p.due_date}`} />
        <HmsStatStrip
          items={[
            { label: 'Status', value: humanize(p.status) },
            { label: 'Files', value: p.evidence_count },
            { label: 'Shared', value: when(p.shared_at) },
            { label: 'Due', value: p.due_date },
          ]}
        />
        <HmsDetailBody>
          {e?.note && <HmsNotice tone="blue">{e.note}</HmsNotice>}
          <HmsSection title={`Evidence (${e ? e.evidence.length : p.evidence_count})`}>
            {!e ? (
              <Muted>{ev.failed ? 'The evidence could not be loaded.' : 'Loading evidence…'}</Muted>
            ) : e.evidence.length ? (
              e.evidence.map((f, i) => (
                <HmsRow
                  key={f.file_name}
                  last={i === e.evidence.length - 1}
                  label={
                    f.file_url ? (
                      <a href={f.file_url} target="_blank" rel="noreferrer" style={{ color: HMS.primary, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {f.file_name} <ExternalLink size={14} />
                      </a>
                    ) : (
                      f.file_name
                    )
                  }
                  hint={f.checksum ? `sha256 ${f.checksum}` : undefined}
                  value={<span style={{ fontSize: '12px', color: HMS.textSecondary }}>{when(f.uploaded_at)}</span>}
                />
              ))
            ) : (
              <Muted>No files attached.</Muted>
            )}
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="aud-pbc"
      title="Audit readiness"
      description="Evidence the Finance Controller has shared with you for this engagement."
      total={pbc.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search request, item or owner"
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Shared evidence"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Internal controls — monitor coverage and violations                */
/* ================================================================== */

export const AuditorControlsView: React.FC<AuditorViewProps> = ({ data, initialFilter, initialSelect }) => {
  const c = data.controls;
  const coverage = c?.coverage || [];
  const violations = c?.violations || [];
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'coverage');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const q = search.trim().toLowerCase();
  const isOpenV = (s: string) => !/closed/i.test(s);
  const rows: HmsListRow[] =
    pill === 'coverage'
      ? coverage.filter((x) => has(q, [x.code, x.name])).map((x) => ({ key: `c:${x.code}`, title: `${x.code} · ${x.name}`, badge: <Tag s={x.severity} />, sub: `${x.frequency} · ${x.covered ? `last run ${when(x.last_run_at)}` : 'not yet run'}`, metaLeft: `${x.last_checked} checked · ${x.last_findings} findings`, metaRight: x.open_violations ? <HmsBadge tone="red">{x.open_violations} open</HmsBadge> : <HmsBadge tone="green">Clear</HmsBadge> }))
      : violations.filter((v) => (pill === 'open' ? isOpenV(v.status) : true) && has(q, [v.id, v.title, v.control_name, v.who])).map((v) => ({ key: `v:${v.id}`, title: v.title, badge: <Tag s={v.status} />, sub: `${v.id} · ${v.control_name}`, metaLeft: <Tag s={v.severity} />, metaRight: v.exposure_amount ? <strong>{rupees(v.exposure_amount)}</strong> : undefined }));

  const renderDetail = (key: string | null) => {
    if (!c) return <Gate data={data} what="Internal controls" />;
    const cov = coverage.find((x) => `c:${x.code}` === key);
    if (cov)
      return (
        <>
          <HmsDetailHeader icon={ListChecks} title={`${cov.code} · ${cov.name}`} badge={ReadOnly} subtitle={`${cov.severity} · runs ${cov.frequency.toLowerCase()}`} />
          <HmsStatStrip
            items={[
              { label: 'Last run', value: cov.covered ? when(cov.last_run_at) : 'Not yet run', tone: cov.covered ? 'default' : 'red' },
              { label: 'Checked', value: cov.last_checked },
              { label: 'Findings', value: cov.last_findings, tone: cov.last_findings ? 'amber' : 'default' },
              { label: 'Open violations', value: cov.open_violations, tone: cov.open_violations ? 'red' : 'green' },
            ]}
          />
          <HmsDetailBody>
            <HmsSection title="What it checks" padded>
              <div style={{ fontSize: '14px', color: HMS.text, lineHeight: 1.6 }}>{cov.description}</div>
            </HmsSection>
          </HmsDetailBody>
        </>
      );
    const v = violations.find((x) => `v:${x.id}` === key);
    if (!v) return <HmsEmpty>{violations.length || coverage.length ? 'Select an item from the list.' : 'No controls on record.'}</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={ListChecks} title={v.title} badge={<Tag s={v.status} />} subtitle={`${v.id} · ${v.control_name} · detected ${v.detected_date}`} />
        <HmsStatStrip
          items={[
            { label: 'Severity', value: v.severity, tone: /critical/i.test(v.severity) ? 'red' : /high/i.test(v.severity) ? 'amber' : 'default' },
            { label: 'Exposure', value: rupees(v.exposure_amount) },
            { label: 'Who', value: v.who || '—' },
            { label: 'Remediation owner', value: v.owner || '—' },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title="References">
            <HmsRow label="Records" value={v.refs || '—'} last />
          </HmsSection>
          <HmsSection title={`Trail (${v.trail.length})`}>
            {v.trail.length ? v.trail.map((t, i) => <HmsRow key={i} last={i === v.trail.length - 1} label={t.t} hint={t.c || undefined} value={<span style={{ fontSize: '12px', color: HMS.textSecondary }}>{`${t.who} · ${t.when}`}</span>} />) : <Muted>No actions recorded.</Muted>}
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="aud-controls"
      title="Internal controls"
      description="Automated monitor coverage and the violations it raised."
      total={coverage.length + violations.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search control or violation"
      pills={[
        { key: 'coverage', label: 'Coverage', count: coverage.length },
        { key: 'open', label: 'Open violations', count: violations.filter((v) => isOpenV(v.status)).length, tone: 'red' },
        { key: 'violations', label: 'All violations', count: violations.length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Control"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Audit trail                                                         */
/* ================================================================== */

export const AuditorLogsView: React.FC<AuditorViewProps> = ({ data, onNavigateTab, initialFilter, initialSelect }) => {
  const { logs } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const modules = Array.from(new Set(logs.map((l) => l.module))).sort().slice(0, 4);
  const filters: Record<string, (l: (typeof logs)[number]) => boolean> = { all: () => true, broken: (l) => !l.hash_valid, ...Object.fromEntries(modules.map((m) => [m, (l: (typeof logs)[number]) => l.module === m])) };
  const q = search.trim().toLowerCase();
  const visible = logs.filter((l) => (filters[pill] || filters.all)(l) && has(q, [l.reference_no, l.actor_name, l.action, l.module, l.reason, l.sequence]));
  const rows: HmsListRow[] = visible.map((l) => ({ key: l.id, title: `${humanize(l.action)} · ${l.reference_no || humanize(l.entity_type)}`, badge: <Tag s={l.hash_valid ? 'Verified' : 'Broken'} />, sub: `#${l.sequence} · ${l.actor_name} · ${humanize(l.actor_role)}`, metaLeft: when(l.occurred_at), metaRight: humanize(l.module) }));

  const renderDetail = (key: string | null) => {
    if (data.denied) return <Gate data={data} what="Audit trail" />;
    const l = logs.find((x) => x.id === key);
    if (!l) return <HmsEmpty>{logs.length ? 'Select an entry from the list.' : 'No audit records in the engagement period.'}</HmsEmpty>;
    const isJournal = /journal/i.test(l.entity_type) && !!l.reference_no;
    return (
      <>
        <HmsDetailHeader icon={ScrollText} title={`${humanize(l.action)} · ${l.reference_no || humanize(l.entity_type)}`} badge={<Tag s={l.hash_valid ? 'Verified' : 'Broken'} />} subtitle={`#${l.sequence} · ${l.actor_name} · ${humanize(l.actor_role)} · ${when(l.occurred_at)}`} />
        <HmsDetailBody>
          {!l.hash_valid && <HmsNotice tone="red">This entry's hash does not match its contents — it may have been altered.</HmsNotice>}
          <HmsSection title="Record">
            <HmsRow label="Module" value={humanize(l.module)} />
            <HmsRow label="Record" value={`${humanize(l.entity_type)} ${l.entity_id}`} />
            <HmsRow label="Detail" value={l.reason || '—'} last />
          </HmsSection>
          <HmsSection title="Hash chain">
            <HmsRow label="Entry hash" value={<span style={{ ...MONO, wordBreak: 'break-all' }}>{l.entry_hash}</span>} />
            <HmsRow label="Previous hash" value={<span style={{ ...MONO, wordBreak: 'break-all' }}>{l.previous_hash || '—'}</span>} last />
          </HmsSection>
        </HmsDetailBody>
        {isJournal && (
          <HmsDetailFooter>
            <HmsButton block icon={Route} onClick={() => onNavigateTab('trace', undefined, l.reference_no)}>
              Trace {l.reference_no}
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="aud-logs"
      title="Audit trail"
      description="Append-only record of every financial action, each entry's hash verified."
      total={logs.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search user, action, reference or #"
      pills={[{ key: 'all', label: 'All', count: logs.length }, { key: 'broken', label: 'Hash broken', count: logs.filter(filters.broken).length, tone: 'red' }, ...modules.map((m) => ({ key: m, label: humanize(m), count: logs.filter((l) => l.module === m).length }))]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Audit entry"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Journal trace                                                       */
/* ================================================================== */

export const AuditorTraceView: React.FC<AuditorViewProps> = ({ data, initialSelect }) => {
  // Journals the auditor can pick from: every journal in the ledger, plus one typed in
  const journals = Array.from(new Set(data.ledger.map((g) => g.journal)));
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const q = search.trim().toLowerCase();
  const keys = [...(selected && !journals.includes(selected) ? [selected] : []), ...journals].filter((j) => has(q, [j]));
  const activeRef = keys.find((k) => k === selected) ?? keys[0] ?? '';
  const tr = useSectionSource<JournalTrace | null>(() => (activeRef ? accountsService.getAuditorTrace(activeRef) : Promise.resolve(null)), [activeRef], null);
  const rows: HmsListRow[] = keys.map((j) => {
    const lines = data.ledger.filter((g) => g.journal === j);
    return { key: j, title: j, sub: lines.length ? `${lines[0].posting_date} · ${lines.length} ledger line${lines.length === 1 ? '' : 's'}` : 'Typed reference' };
  });
  const go = () => {
    const ref = typed.trim();
    if (ref) {
      setSelected(ref);
      setTyped('');
    }
  };

  const renderDetail = (key: string | null) => {
    if (data.denied) return <Gate data={data} what="Journal trace" />;
    if (!key) return <HmsEmpty>Type a journal reference on the left, or pick one from the ledger.</HmsEmpty>;
    const t = tr.value && tr.value.journal.reference_no === key ? tr.value : tr.value && (tr.value.journal.id === key) ? tr.value : null;
    if (!t) return <HmsEmpty>{tr.failed ? `No posted journal found for ${key}.` : `Tracing ${key}…`}</HmsEmpty>;
    const c = t.completeness;
    const j = t.journal;
    return (
      <>
        <HmsDetailHeader icon={Route} title={`${j.reference_no} — ${j.description}`} badge={<Tag s={j.status} />} subtitle={`${humanize(j.entry_type)} · ${j.period} · maker ${j.maker}`} />
        <HmsStatStrip
          items={[
            { label: 'Journal date', value: j.journal_date },
            { label: 'Posted', value: when(j.posted_at) },
            { label: 'Debit', value: rupees(j.total_debit) },
            { label: 'Credit', value: rupees(j.total_credit) },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title="Completeness">
            <HmsRow label="Source identified" value={<Tag s={c.source_identified ? 'Verified' : 'Missing'} />} />
            <HmsRow label={c.auto_posted_by_rule ? 'Auto-posted under event rule' : 'Approval evidence'} value={<Tag s={c.approval_evidence ? 'Verified' : 'Missing'} />} />
            <HmsRow label="Posted to GL" value={<Tag s={c.gl_posted ? 'Verified' : 'Missing'} />} />
            <HmsRow label="Audit entries hash-valid" value={<Tag s={c.audit_entries_hash_valid ? 'Verified' : 'Broken'} />} />
            <HmsRow label="Audit chain intact" value={<Tag s={c.chain_valid ? 'Verified' : 'Broken'} />} last />
          </HmsSection>
          <HmsSection title={`Journal lines (${j.lines.length})`}>
            {j.lines.map((l, i) => (
              <HmsRow key={i} last={i === j.lines.length - 1} label={l.account} hint={[l.cost_center, l.narration].filter(Boolean).join(' · ') || undefined} value={<strong>{Number(l.debit) ? `Dr ${rupees(l.debit)}` : `Cr ${rupees(l.credit)}`}</strong>} />
            ))}
          </HmsSection>
          <HmsSection title="Source">
            {t.source_events.map((e, i) => (
              <HmsRow key={e.event_id} last={i === t.source_events.length - 1 && !t.source_documents.length} label={humanize(e.event_type)} hint={`${humanize(e.source_department)} · ${e.source_reference} · ${e.business_date}`} value={rupees(e.amount)} />
            ))}
            {t.source_documents.map((d, i) => (
              <HmsRow key={d.reference_no} last={i === t.source_documents.length - 1} label={`${humanize(d.type)} · ${d.reference_no}`} hint={[d.vendor || d.partner, d.invoice_no].filter(Boolean).join(' · ') || undefined} value={rupees(d.amount)} />
            ))}
            {!t.source_events.length && !t.source_documents.length && <Muted>Manual journal — maker {j.maker}.</Muted>}
          </HmsSection>
          <HmsSection title={`Approvals (${t.approvals.length})`}>
            {t.approvals.length ? (
              t.approvals.flatMap((a) => [
                <HmsRow key={a.reference_no} label={`${a.reference_no} · ${humanize(a.document_type)}`} hint={`maker ${a.maker}`} value={<span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>{rupees(a.amount)} <Tag s={a.status} /></span>} />,
                ...a.steps.map((s) => <HmsRow key={`${a.reference_no}-${s.step_no}`} label={`↳ ${humanize(s.decision)} by ${s.actor} (${humanize(s.level)})`} hint={[s.limit_applied ? `limit ${rupees(s.limit_applied)}` : '', s.comment ? `“${s.comment}”` : ''].filter(Boolean).join(' · ') || undefined} value={<span style={{ fontSize: '12px', color: HMS.textSecondary }}>{when(s.decided_at)}</span>} />),
              ])
            ) : (
              <Muted>{c.auto_posted_by_rule ? 'Posted automatically under the event auto-post rule.' : 'No approval records.'}</Muted>
            )}
          </HmsSection>
          <HmsSection title={`Documents (${t.documents.length})`}>
            {t.documents.length ? t.documents.map((d, i) => <HmsRow key={d.file_name} last={i === t.documents.length - 1} label={d.file_name} hint={d.checksum ? `sha256 ${d.checksum.slice(0, 16)}…` : undefined} value={<HmsBadge tone={d.validated ? 'green' : 'amber'}>{d.validated ? 'Validated' : humanize(d.doc_type)}</HmsBadge>} />) : <Muted>No supporting documents attached.</Muted>}
          </HmsSection>
          <HmsSection title={`Audit trail for this journal (${t.audit_trail.length})`} defaultOpen={false}>
            {t.audit_trail.map((a, i) => (
              <HmsRow key={a.id} last={i === t.audit_trail.length - 1} label={`#${a.sequence} · ${humanize(a.action)} · ${a.actor_name}`} hint={a.reason || undefined} value={<Tag s={a.hash_valid ? 'Verified' : 'Broken'} />} />
            ))}
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="aud-trace"
      title="Journal trace"
      description="Follow a posted journal to its source, approvals, documents and audit entries."
      total={journals.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Filter ledger journals"
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="trace"
      leftExtra={
        <div style={{ padding: '0 20px 12px', display: 'flex', gap: '8px' }}>
          <input
            style={INPUT}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                go();
              }
            }}
            placeholder="Journal reference or id"
            aria-label="Journal reference to trace"
          />
          <HmsButton variant="primary" icon={SearchIcon} onClick={go} disabled={!typed.trim()}>
            Trace
          </HmsButton>
        </div>
      }
      detailLabel="Journal trace"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* General ledger                                                      */
/* ================================================================== */

export const AuditorLedgerView: React.FC<AuditorViewProps> = ({ data, onNavigateTab, initialFilter, initialSelect }) => {
  const { ledger } = data;
  const keyOf = (g: (typeof ledger)[number], i: number) => `${g.journal}|${g.account}|${i}`;
  const indexed = ledger.map((g, i) => ({ g, key: keyOf(g, i) }));
  const periods = Array.from(new Set(ledger.map((g) => g.period))).sort().reverse().slice(0, 4);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const q = search.trim().toLowerCase();
  const visible = indexed.filter(({ g }) => (pill === 'all' || g.period === pill) && has(q, [g.journal, g.account, g.cost_center, g.department]));
  const rows: HmsListRow[] = visible.map(({ g, key }) => ({ key, title: g.account, sub: `${g.posting_date} · ${g.journal}${g.cost_center ? ` · ${g.cost_center}` : ''}`, metaRight: <strong>{Number(g.debit) ? `Dr ${rupees(g.debit)}` : `Cr ${rupees(g.credit)}`}</strong> }));

  const renderDetail = (key: string | null) => {
    if (data.denied) return <Gate data={data} what="General ledger" />;
    const hit = indexed.find((x) => x.key === key);
    if (!hit) return <HmsEmpty>{ledger.length ? 'Select an entry from the list.' : 'No ledger entries in the engagement period.'}</HmsEmpty>;
    const g = hit.g;
    return (
      <>
        <HmsDetailHeader icon={BookOpen} title={g.account} badge={ReadOnly} subtitle={`${g.journal} · ${g.posting_date} · period ${g.period}`} />
        <HmsStatStrip
          items={[
            { label: 'Debit', value: rupees(g.debit) },
            { label: 'Credit', value: rupees(g.credit) },
            { label: 'Cost centre', value: g.cost_center || '—' },
            { label: 'Department', value: g.department || '—' },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title="Journal">
            <HmsRow label="Reference" value={g.journal} />
            <HmsRow label="Lines in this journal" value={ledger.filter((x) => x.journal === g.journal).length} last />
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton variant="primary" block icon={ArrowRight} onClick={() => onNavigateTab('trace', undefined, g.journal)}>
            Trace {g.journal}
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="aud-ledger"
      title="General ledger"
      description="Posted ledger entries for the engagement period."
      total={ledger.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search account, journal or cost centre"
      pills={[{ key: 'all', label: 'All', count: ledger.length }, ...periods.map((p) => ({ key: p, label: p, count: ledger.filter((g) => g.period === p).length }))]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="trace"
      onPrimary={(k) => {
        const hit = indexed.find((x) => x.key === k);
        if (hit) onNavigateTab('trace', undefined, hit.g.journal);
      }}
      detailLabel="Ledger entry"
      renderDetail={renderDetail}
    />
  );
};
