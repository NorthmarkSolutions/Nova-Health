// Accounts Supervisor · bank match reviews, collection oversight, GST review, document validation,
// daily close, team activity, escalations and the audit trail. Every action calls the accounts API.
import React, { useState } from 'react';
import { Landmark, HandCoins, FileCheck, FileSearch, CalendarCheck, TriangleAlert, ScrollText, Check, CornerUpLeft, X, Send, UserCheck, Lock, PlayCircle, MessageSquarePlus, CircleCheck } from 'lucide-react';
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
  HmsModal,
  HmsField,
  HmsProgress,
  INPUT,
  TEXTAREA,
  HMS,
} from '../../../components/hms';
import { accountsService } from '../../../services/accountsService';
import { fmtDate, fmtDateTime, humanize, inr2, num } from '../executive/executiveData';
import { MONO, useAction } from '../executive/executiveHelpers';
import { StatusBadge } from '../executive/executiveUi';
import { isSupervisorPending, docLabel } from './supervisorData';
import type { SupervisorViewProps } from './supervisorHelpers';

const has = (q: string, values: (string | number | undefined | null)[]) => !q || values.some((v) => String(v ?? '').toLowerCase().includes(q));
const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>{children}</div>;

/** A comment dialog shared by every "needs a reason" action on this page. */
interface CommentDraft {
  kind: string;
  id: string;
  title: string;
  description?: string;
  label: string;
  button: string;
  danger?: boolean;
  minLength: number;
  text: string;
  error?: string;
  owner?: string;
  onSave: (text: string, owner?: string) => Promise<boolean>;
}

const CommentDialog: React.FC<{ draft: CommentDraft; setDraft: (d: CommentDraft | null) => void; busy: boolean; ownerOptions?: string[] }> = ({ draft, setDraft, busy, ownerOptions }) => {
  const save = async () => {
    if (ownerOptions && !draft.owner) return setDraft({ ...draft, error: 'Choose who takes the case over.' });
    if (draft.text.trim().length < draft.minLength) return setDraft({ ...draft, error: `Write at least ${draft.minLength} characters.` });
    if (await draft.onSave(draft.text.trim(), draft.owner)) setDraft(null);
  };
  return (
    <HmsModal
      title={draft.title}
      description={draft.description}
      onClose={() => setDraft(null)}
      busy={busy}
      footer={
        <>
          <HmsButton onClick={() => setDraft(null)} disabled={busy}>
            Cancel
          </HmsButton>
          <HmsButton variant={draft.danger ? 'danger' : 'primary'} onClick={save} disabled={busy}>
            {busy ? 'Saving…' : draft.button}
          </HmsButton>
        </>
      }
    >
      {draft.error && <HmsNotice tone="red">{draft.error}</HmsNotice>}
      {ownerOptions && (
        <HmsField label="New owner" required>
          <select style={INPUT} value={draft.owner || ''} onChange={(e) => setDraft({ ...draft, owner: e.target.value, error: undefined })}>
            <option value="">Choose executive…</option>
            {ownerOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </HmsField>
      )}
      <HmsField label={draft.label} required={draft.minLength > 0}>
        <textarea style={TEXTAREA} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value, error: undefined })} />
      </HmsField>
    </HmsModal>
  );
};

/* ================================================================== */
/* Reconciliation reviews                                              */
/* ================================================================== */

export const SupervisorReconView: React.FC<SupervisorViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { matches, bank } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'proposed');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [draft, setDraft] = useState<CommentDraft | null>(null);
  const { busy, run } = useAction(data, notify);

  const lineOf = (id: string) => bank.find((t) => t.id === id);
  const q = search.trim().toLowerCase();
  const visible = matches.filter((m) => (pill === 'all' || m.status === pill) && has(q, [m.matched_id, m.proposed_by_name, lineOf(m.bank_transaction)?.narration]));
  const count = (s: string) => matches.filter((m) => m.status === s).length;

  const rows: HmsListRow[] = visible.map((m) => {
    const t = lineOf(m.bank_transaction);
    return {
      key: m.id,
      title: t?.narration || 'Bank line',
      badge: <StatusBadge status={m.status} />,
      sub: (
        <>
          {humanize(m.matched_type)} <span style={MONO}>{m.matched_id}</span>
        </>
      ),
      metaLeft: `${m.confidence}% · ${humanize(m.method)} · ${m.proposed_by_name || '—'}`,
      metaRight: t ? <strong>{inr2(t.amount)}</strong> : undefined,
    };
  });

  const decide = (id: string, decision: 'approve' | 'return' | 'escalate', comment?: string) =>
    run(`m-${decision}`, () => accountsService.decideReconciliationMatch(id, { decision, comment }), decision === 'approve' ? 'Match confirmed' : decision === 'return' ? 'Match returned — the line is unmatched again' : 'Match escalated to the Accounts Manager', 'Could not record the decision');

  const renderDetail = (key: string | null) => {
    const m = matches.find((x) => x.id === key);
    if (!m) return <HmsEmpty>{matches.length ? 'Select a match from the list to see its details.' : 'No bank matches have been proposed by the executives.'}</HmsEmpty>;
    const t = lineOf(m.bank_transaction);
    return (
      <>
        <HmsDetailHeader icon={Landmark} title={t?.narration || 'Bank line'} badge={<StatusBadge status={m.status} />} subtitle={`Proposed by ${m.proposed_by_name || '—'} · ${fmtDateTime(m.created_at)}`} />
        <HmsStatStrip
          items={[
            { label: 'Line amount', value: t ? inr2(t.amount) : '—', note: t ? (t.direction === 'credit' ? 'Money in' : 'Money out') : undefined },
            { label: 'Confidence', value: `${m.confidence}%`, tone: m.confidence >= 90 ? 'green' : m.confidence >= 80 ? 'default' : 'amber' },
            { label: 'Method', value: humanize(m.method), tone: m.method === 'manual' ? 'amber' : 'default' },
            { label: 'Line date', value: t ? fmtDate(t.txn_date) : '—' },
          ]}
        />
        <HmsDetailBody>
          {m.method === 'manual' && <HmsNotice tone="amber">Manual match — check the ledger entry yourself before confirming.</HmsNotice>}
          <HmsSection title="Matched to">
            <HmsRow label="Type" value={humanize(m.matched_type)} />
            <HmsRow label="Ledger reference" value={<span style={MONO}>{m.matched_id}</span>} last />
          </HmsSection>
          <HmsSection title="Bank line">
            {t ? (
              <>
                <HmsRow label="Reference" value={t.bank_reference || '—'} />
                <HmsRow label="Type" value={humanize(t.type)} />
                <HmsRow label="Value date" value={fmtDate(t.value_date)} last />
              </>
            ) : (
              <Muted>The bank line was not returned by the server.</Muted>
            )}
          </HmsSection>
        </HmsDetailBody>
        {m.status === 'proposed' && (
          <HmsDetailFooter>
            <HmsButton variant="primary" block icon={Check} disabled={!!busy} onClick={() => decide(m.id, 'approve')}>
              Confirm match
            </HmsButton>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
              <HmsButton block icon={CornerUpLeft} disabled={!!busy} onClick={() => setDraft({ kind: 'return', id: m.id, title: 'Return match', label: 'What is wrong with the match', button: 'Return match', minLength: 5, text: '', onSave: (c) => decide(m.id, 'return', c) })}>
                Return
              </HmsButton>
              <HmsButton block icon={TriangleAlert} disabled={!!busy} onClick={() => setDraft({ kind: 'escalate', id: m.id, title: 'Escalate variance', label: 'What the manager needs to decide', button: 'Escalate', minLength: 5, text: '', onSave: (c) => decide(m.id, 'escalate', c) })}>
                Escalate
              </HmsButton>
            </div>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="sup-recon"
        title="Reconciliation reviews"
        description="Bank matches proposed by executives, waiting for your check."
        total={matches.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search narration, reference or executive"
        pills={[
          { key: 'proposed', label: 'To review', count: count('proposed') },
          { key: 'confirmed', label: 'Confirmed', count: count('confirmed') },
          { key: 'rejected', label: 'Returned', count: count('rejected'), tone: 'amber' },
          { key: 'all', label: 'All', count: matches.length },
        ]}
        activePill={pill}
        onPill={setPill}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open"
        detailLabel="Bank match"
        renderDetail={renderDetail}
      />
      {draft && <CommentDialog draft={draft} setDraft={setDraft} busy={!!busy} />}
    </>
  );
};

/* ================================================================== */
/* Collection oversight (cases + write-off requests)                  */
/* ================================================================== */

export const SupervisorCollectionsView: React.FC<SupervisorViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { cases, writeOffs, team } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [draft, setDraft] = useState<CommentDraft | null>(null);
  const [reassigning, setReassigning] = useState(false);
  const { busy, run } = useAction(data, notify);

  type Item = { key: string; kind: 'case' | 'wo'; id: string; name: string; status: string; amount: string };
  const items: Item[] = [
    ...writeOffs.map((w) => ({ key: `wo:${w.id}`, kind: 'wo' as const, id: w.id, name: w.customer_name || 'Payer not recorded', status: w.status, amount: w.amount })),
    ...cases.map((c) => ({ key: `case:${c.id}`, kind: 'case' as const, id: c.id, name: c.customer?.name || 'Payer not recorded', status: c.stage, amount: c.outstanding_amount })),
  ];
  const filters: Record<string, (i: Item) => boolean> = {
    all: () => true,
    writeoffs: (i) => i.kind === 'wo' && i.status === 'pending',
    escalated: (i) => i.kind === 'case' && i.status === 'escalated',
    due: (i) => i.kind === 'case' && (i.status === 'due_today' || i.status === 'followup_required'),
    cases: (i) => i.kind === 'case',
  };
  const q = search.trim().toLowerCase();
  const visible = items.filter((i) => (filters[pill] || filters.all)(i) && has(q, [i.name, i.status]));
  const count = (k: string) => items.filter(filters[k]).length;

  const rows: HmsListRow[] = visible.map((i) => {
    if (i.kind === 'wo') {
      const w = writeOffs.find((x) => x.id === i.id)!;
      return { key: i.key, title: i.name, badge: <StatusBadge status={w.status} />, sub: <>Write-off <span style={MONO}>{w.reference_no}</span> · {w.receivable_ref || '—'}</>, metaLeft: humanize(w.category), metaRight: <strong>{inr2(w.amount)}</strong> };
    }
    const c = cases.find((x) => x.id === i.id)!;
    return { key: i.key, title: i.name, badge: <StatusBadge status={c.stage} />, sub: c.next_action ? `Next: ${c.next_action}` : 'No next action set', metaLeft: c.next_action_on ? `By ${fmtDate(c.next_action_on)}` : `Priority ${humanize(c.recovery_priority)}`, metaRight: <strong>{inr2(c.outstanding_amount)}</strong> };
  });

  const renderDetail = (key: string | null) => {
    const i = items.find((x) => x.key === key);
    if (!i) return <HmsEmpty>{items.length ? 'Select an item from the list to see its details.' : 'No collection cases or write-off requests are open.'}</HmsEmpty>;
    if (i.kind === 'wo') {
      const w = writeOffs.find((x) => x.id === i.id)!;
      const over = num(w.amount) > 10000;
      return (
        <>
          <HmsDetailHeader icon={HandCoins} title={`Write-off · ${w.customer_name || '—'}`} badge={<StatusBadge status={w.status} />} subtitle={`${w.reference_no} · receivable ${w.receivable_ref || '—'} · ${fmtDate(w.created_at)}`} />
          <HmsStatStrip
            items={[
              { label: 'Amount', value: inr2(w.amount) },
              { label: 'Category', value: humanize(w.category) },
              { label: 'Your limit', value: inr2(10000), tone: over ? 'amber' : 'default', note: over ? 'Above limit — forward' : 'Within limit' },
              { label: 'Requested', value: fmtDate(w.created_at) },
            ]}
          />
          <HmsDetailBody>
            {w.status === 'pending' && over && <HmsNotice tone="blue">Above ₹10,000. Approving forwards it to the Accounts Manager.</HmsNotice>}
            <HmsSection title="Reason" padded>
              <div style={{ fontSize: '14px', color: HMS.text, lineHeight: 1.6 }}>{w.reason || 'No reason recorded.'}</div>
            </HmsSection>
          </HmsDetailBody>
          {w.status === 'pending' && (
            <HmsDetailFooter>
              <HmsButton variant="primary" block icon={over ? Send : Check} disabled={!!busy} onClick={() => run('wo-approve', () => accountsService.decideWriteOff(w.id, { decision: 'approve' }), over ? 'Write-off forwarded to the Accounts Manager' : 'Write-off approved', 'Could not approve the write-off')}>
                {over ? 'Verify & forward to manager' : 'Approve write-off'}
              </HmsButton>
              <HmsButton block variant="danger" icon={X} disabled={!!busy} onClick={() => setDraft({ kind: 'wo-reject', id: w.id, title: 'Reject write-off', description: `${w.reference_no} · ${inr2(w.amount)}`, label: 'Why recovery should continue', button: 'Reject write-off', danger: true, minLength: 5, text: '', onSave: (c) => run('wo-reject', () => accountsService.decideWriteOff(w.id, { decision: 'reject', comment: c }), 'Write-off rejected — recovery continues', 'Could not reject the write-off') })}>
                Reject
              </HmsButton>
            </HmsDetailFooter>
          )}
        </>
      );
    }
    const c = cases.find((x) => x.id === i.id)!;
    const followups: { id?: string; channel?: string; outcome?: string; notes?: string; created_at?: string; logged_by_name?: string }[] = c.followups || [];
    return (
      <>
        <HmsDetailHeader icon={HandCoins} title={c.customer?.name || 'Payer not recorded'} badge={<StatusBadge status={c.stage} />} subtitle="Collection case" />
        <HmsStatStrip
          items={[
            { label: 'Outstanding', value: inr2(c.outstanding_amount) },
            { label: 'Next action by', value: fmtDate(c.next_action_on) },
            { label: 'Priority', value: humanize(c.recovery_priority) },
            { label: 'Follow-ups', value: followups.length },
          ]}
        />
        <HmsDetailBody>
          {c.escalated && <HmsNotice tone="red">Escalated to the Accounts Manager.</HmsNotice>}
          <HmsSection title="Next action" padded>
            <div style={{ fontSize: '14px', color: c.next_action ? HMS.text : HMS.textSecondary, lineHeight: 1.6 }}>{c.next_action || 'No next action set.'}</div>
          </HmsSection>
          <HmsSection title={`Follow-ups (${followups.length})`}>
            {followups.length ? (
              followups.map((f, idx) => (
                <HmsRow key={f.id || idx} last={idx === followups.length - 1} label={`${humanize(f.channel)} · ${humanize(f.outcome)}`} hint={f.notes || undefined} value={<span style={{ fontSize: '12px', color: HMS.textSecondary }}>{`${fmtDateTime(f.created_at)}${f.logged_by_name ? ` · ${f.logged_by_name}` : ''}`}</span>} />
              ))
            ) : (
              <Muted>No follow-ups on this case yet.</Muted>
            )}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton
            block
            icon={UserCheck}
            disabled={!!busy || !team.length}
            title={team.length ? undefined : 'Team list unavailable'}
            onClick={() => {
              setReassigning(true);
              setDraft({ kind: 'reassign', id: c.id, title: 'Reassign case', description: c.customer?.name, label: 'Note for the new owner', button: 'Reassign', minLength: 0, text: '', onSave: async (_t, owner) => run('reassign', () => accountsService.reassignCollectionOwner(c.id, owner || ''), `Case reassigned to ${owner}`, 'Could not reassign the case') });
            }}
          >
            Reassign owner
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="sup-collections"
        title="Collection oversight"
        description="Recovery cases by stage and write-off requests waiting for a decision."
        total={items.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search payer or stage"
        pills={[
          { key: 'all', label: 'All', count: items.length },
          { key: 'writeoffs', label: 'Write-offs to decide', count: count('writeoffs'), tone: 'amber' },
          { key: 'escalated', label: 'Escalated', count: count('escalated'), tone: 'red' },
          { key: 'due', label: 'Follow-up due', count: count('due') },
          { key: 'cases', label: 'All cases', count: count('cases') },
        ]}
        activePill={pill}
        onPill={setPill}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open"
        detailLabel="Collection item"
        renderDetail={renderDetail}
      />
      {draft && (
        <CommentDialog
          draft={draft}
          setDraft={(d) => {
            setDraft(d);
            if (!d) setReassigning(false);
          }}
          busy={!!busy}
          ownerOptions={reassigning ? team.map((m) => m.name) : undefined}
        />
      )}
    </>
  );
};

/* ================================================================== */
/* GST review                                                          */
/* ================================================================== */

export const SupervisorGstView: React.FC<SupervisorViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { gst } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'submitted');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [draft, setDraft] = useState<CommentDraft | null>(null);
  const { busy, run } = useAction(data, notify);

  const q = search.trim().toLowerCase();
  const visible = gst.filter((g) => (pill === 'all' || g.status === pill) && has(q, [g.reference_no, g.period_from, g.period_to]));
  const count = (s: string) => gst.filter((g) => g.status === s).length;
  const title = (dir: string) => (dir === 'outward' ? 'Outward supplies (GSTR-1)' : 'Input tax credit (GSTR-3B)');

  const rows: HmsListRow[] = visible.map((g) => ({
    key: g.id,
    title: title(g.direction),
    badge: <StatusBadge status={g.status} />,
    sub: (
      <>
        <span style={MONO}>{g.reference_no}</span> · {fmtDate(g.period_from)} – {fmtDate(g.period_to)}
      </>
    ),
    metaLeft: `${g.invoice_count} invoices`,
    metaRight: <strong>{inr2(g.tax_value)}</strong>,
  }));

  const decide = (id: string, decision: 'approve' | 'return' | 'escalate', comment?: string) =>
    run(`g-${decision}`, () => accountsService.decideGSTBatch(id, { decision, comment }), decision === 'approve' ? 'GST batch approved for the Finance Controller' : decision === 'return' ? 'GST batch returned to the executive' : 'GST batch escalated', 'Could not record the decision');

  const renderDetail = (key: string | null) => {
    const g = gst.find((x) => x.id === key);
    if (!g) return <HmsEmpty>{gst.length ? 'Select a batch from the list to see its details.' : 'No GST batches have been prepared.'}</HmsEmpty>;
    const lines = g.lines || [];
    return (
      <>
        <HmsDetailHeader icon={FileCheck} title={title(g.direction)} badge={<StatusBadge status={g.status} />} subtitle={`${g.reference_no} · ${fmtDate(g.period_from)} – ${fmtDate(g.period_to)}`} />
        <HmsStatStrip
          items={[
            { label: 'Taxable value', value: inr2(g.taxable_value) },
            { label: 'Tax', value: inr2(g.tax_value) },
            { label: 'Invoices', value: g.invoice_count },
            { label: 'Lines loaded', value: lines.length },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title={`Invoice lines (${lines.length})`}>
            {lines.length ? (
              lines.map((l, idx) => <HmsRow key={l.id} last={idx === lines.length - 1} label={l.invoice_no} hint={`${l.gstin || 'No GSTIN'} · HSN/SAC ${l.hsn_sac || '—'} · ${fmtDate(l.invoice_date)}`} value={<strong>{inr2(l.taxable_value)}</strong>} />)
            ) : (
              <Muted>The server returned no lines for this batch.</Muted>
            )}
          </HmsSection>
        </HmsDetailBody>
        {g.status === 'submitted' && (
          <HmsDetailFooter>
            <HmsButton variant="primary" block icon={Check} disabled={!!busy} onClick={() => decide(g.id, 'approve')}>
              Approve batch
            </HmsButton>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
              <HmsButton block icon={CornerUpLeft} disabled={!!busy} onClick={() => setDraft({ kind: 'return', id: g.id, title: 'Return GST batch', label: 'What to correct', button: 'Return batch', minLength: 5, text: '', onSave: (c) => decide(g.id, 'return', c) })}>
                Return
              </HmsButton>
              <HmsButton block icon={TriangleAlert} disabled={!!busy} onClick={() => setDraft({ kind: 'escalate', id: g.id, title: 'Escalate GST issue', label: 'What needs a decision', button: 'Escalate', minLength: 5, text: '', onSave: (c) => decide(g.id, 'escalate', c) })}>
                Escalate
              </HmsButton>
            </div>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="sup-gst"
        title="GST review"
        description="Batches prepared by executives, checked here before the Finance Controller files."
        total={gst.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search reference or period"
        pills={[
          { key: 'submitted', label: 'To review', count: count('submitted') },
          { key: 'draft', label: 'Draft', count: count('draft') },
          { key: 'approved', label: 'Approved', count: count('approved') },
          { key: 'rejected', label: 'Returned', count: count('rejected'), tone: 'amber' },
          { key: 'all', label: 'All', count: gst.length },
        ]}
        activePill={pill}
        onPill={setPill}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open"
        detailLabel="GST batch"
        renderDetail={renderDetail}
      />
      {draft && <CommentDialog draft={draft} setDraft={setDraft} busy={!!busy} />}
    </>
  );
};

/* ================================================================== */
/* Document validation                                                 */
/* ================================================================== */

export const SupervisorDocsView: React.FC<SupervisorViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { documents } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'pending');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [draft, setDraft] = useState<CommentDraft | null>(null);
  const { busy, run } = useAction(data, notify);

  const stateOf = (d: (typeof documents)[number]) => (d.validated ? 'validated' : d.rejection_reason ? 'rejected' : 'pending');
  const BADGE = { validated: <HmsBadge tone="green">Validated</HmsBadge>, rejected: <HmsBadge tone="red">Rejected</HmsBadge>, pending: <HmsBadge tone="amber">To validate</HmsBadge> };
  const q = search.trim().toLowerCase();
  const visible = documents.filter((d) => (pill === 'all' || stateOf(d) === pill) && has(q, [d.file_name, d.doc_type, d.entity_type, d.entity_id, d.uploaded_by_name]));
  const count = (s: string) => documents.filter((d) => stateOf(d) === s).length;

  const rows: HmsListRow[] = visible.map((d) => ({ key: d.id, title: d.file_name, badge: BADGE[stateOf(d)], sub: `${humanize(d.doc_type)} · ${humanize(d.entity_type)} ${d.entity_id}`, metaLeft: d.uploaded_by_name || '—', metaRight: fmtDate(d.created_at) }));

  const renderDetail = (key: string | null) => {
    const d = documents.find((x) => x.id === key);
    if (!d) return <HmsEmpty>{documents.length ? 'Select a document from the list to see its details.' : 'No supporting documents have been attached yet.'}</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={FileSearch} title={d.file_name} badge={BADGE[stateOf(d)]} subtitle={`${humanize(d.doc_type)} · ${humanize(d.entity_type)} ${d.entity_id}`} />
        <HmsStatStrip
          items={[
            { label: 'Type', value: humanize(d.doc_type) },
            { label: 'Attached to', value: humanize(d.entity_type), note: d.entity_id },
            { label: 'Uploaded by', value: d.uploaded_by_name || '—' },
            { label: 'Uploaded', value: fmtDate(d.created_at) },
          ]}
        />
        <HmsDetailBody>
          {d.rejection_reason && <HmsNotice tone="red">Rejected: {d.rejection_reason}</HmsNotice>}
          <HmsSection title="File">
            <HmsRow label="Checksum" value={d.checksum ? <span style={MONO}>{d.checksum.slice(0, 16)}…</span> : '—'} />
            <HmsRow label="Location" value={d.file_url ? <a href={d.file_url} target="_blank" rel="noreferrer" style={{ color: HMS.primary, fontWeight: 600 }}>Open file</a> : 'No file link stored'} last />
          </HmsSection>
        </HmsDetailBody>
        {stateOf(d) === 'pending' && (
          <HmsDetailFooter>
            <HmsButton variant="primary" block icon={CircleCheck} disabled={!!busy} onClick={() => run('valid', () => accountsService.validateDocument(d.id, true), `${d.file_name} validated`, 'Could not validate the document')}>
              Validate document
            </HmsButton>
            <HmsButton block variant="danger" icon={X} disabled={!!busy} onClick={() => setDraft({ kind: 'invalid', id: d.id, title: 'Reject document', description: d.file_name, label: 'What evidence is missing or wrong', button: 'Reject document', danger: true, minLength: 5, text: '', onSave: (c) => run('invalid', () => accountsService.validateDocument(d.id, false, c), 'Document rejected — evidence requested', 'Could not reject the document') })}>
              Request new evidence
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="sup-docs"
        title="Document validation"
        description="Supporting evidence attached to vouchers, validated before close."
        total={documents.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search file, type or voucher"
        pills={[
          { key: 'pending', label: 'To validate', count: count('pending'), tone: 'amber' },
          { key: 'validated', label: 'Validated', count: count('validated') },
          { key: 'rejected', label: 'Rejected', count: count('rejected'), tone: 'red' },
          { key: 'all', label: 'All', count: documents.length },
        ]}
        activePill={pill}
        onPill={setPill}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open"
        detailLabel="Document"
        renderDetail={renderDetail}
      />
      {draft && <CommentDialog draft={draft} setDraft={setDraft} busy={!!busy} />}
    </>
  );
};

/* ================================================================== */
/* Daily close                                                         */
/* ================================================================== */

export const SupervisorCloseView: React.FC<SupervisorViewProps> = ({ data, notify, onNavigateTab, initialFilter, initialSelect }) => {
  const { close } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [draft, setDraft] = useState<CommentDraft | null>(null);
  const { busy, run } = useAction(data, notify);

  type Item = { key: string; kind: 'check' | 'section' | 'blocker'; title: string; ok: boolean; detail: string; pct?: number; screen?: string; done?: number; total?: number };
  const items: Item[] = close
    ? [
        ...close.blockers.map((b, i) => ({ key: `blocker:${i}`, kind: 'blocker' as const, title: b, ok: false, detail: 'Blocks the daily close until it is cleared.' })),
        ...close.checks.map((c, i) => ({ key: `check:${i}`, kind: 'check' as const, title: c.title, ok: c.ok, detail: c.desc })),
        ...close.sections.map((s, i) => ({ key: `section:${i}`, kind: 'section' as const, title: s.title, ok: s.total > 0 ? s.done >= s.total : true, detail: s.note, pct: s.total > 0 ? Math.round((s.done / s.total) * 100) : 100, screen: s.screen, done: s.done, total: s.total })),
      ]
    : [];
  const filters: Record<string, (i: Item) => boolean> = { all: () => true, open: (i) => !i.ok, checks: (i) => i.kind === 'check', sections: (i) => i.kind === 'section' };
  const q = search.trim().toLowerCase();
  const visible = items.filter((i) => (filters[pill] || filters.all)(i) && has(q, [i.title, i.detail]));
  const count = (k: string) => items.filter(filters[k]).length;
  const status = close?.status || '';

  const rows: HmsListRow[] = visible.map((i) => ({
    key: i.key,
    title: i.title,
    badge: <HmsBadge tone={i.ok ? 'green' : i.kind === 'blocker' ? 'red' : 'amber'}>{i.ok ? 'Done' : i.kind === 'blocker' ? 'Blocker' : 'Open'}</HmsBadge>,
    sub: i.kind === 'section' ? `${i.done} of ${i.total} cleared` : humanize(i.kind),
    metaLeft: i.detail || undefined,
    progress: i.kind === 'section' ? { pct: Math.min(100, i.pct ?? 0), doneLabel: 'Cleared' } : undefined,
  }));

  const renderDetail = (key: string | null) => {
    if (!close) return <HmsEmpty>{data.loading ? 'Loading the daily close…' : 'The daily close status is unavailable.'}</HmsEmpty>;
    const i = items.find((x) => x.key === key);
    return (
      <>
        <HmsDetailHeader icon={CalendarCheck} title={`Daily close · ${close.date_formatted || fmtDate(close.business_date)}`} badge={<StatusBadge status={status} />} subtitle={`${close.blocker_count} blocker${close.blocker_count === 1 ? '' : 's'} · ${close.checks.filter((c) => c.ok).length} of ${close.checks.length} checks passed`} />
        <HmsStatStrip
          items={[
            { label: 'Status', value: humanize(status) },
            { label: 'Blockers', value: close.blocker_count, tone: close.blocker_count ? 'red' : 'green' },
            { label: 'Checks passed', value: `${close.checks.filter((c) => c.ok).length}/${close.checks.length}` },
            { label: 'Sections cleared', value: `${close.sections.filter((s) => s.total === 0 || s.done >= s.total).length}/${close.sections.length}` },
          ]}
        />
        <HmsDetailBody>
          {status === 'locked' && <HmsNotice tone="blue">Today is locked. Further postings go to the next business day; reopening needs the Accounts Manager.</HmsNotice>}
          {status === 'open' && close.blocker_count > 0 && <HmsNotice tone="amber">Clear the blockers before running the close, or escalate the incomplete close to the Accounts Manager.</HmsNotice>}
          {i ? (
            <HmsSection title={i.kind === 'section' ? 'Section' : i.kind === 'check' ? 'Check' : 'Blocker'} padded>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: HMS.text }}>{i.title}</div>
                <div style={{ fontSize: '13px', color: HMS.textSecondary }}>{i.detail || '—'}</div>
                {i.kind === 'section' && <HmsProgress showLabel pct={Math.min(100, i.pct ?? 0)} doneLabel="Cleared" label={`Cleared · ${i.done} of ${i.total}`} />}
                {i.screen && !i.ok && (
                  <div>
                    <HmsButton size="sm" onClick={() => onNavigateTab(i.screen === 'recon' ? 'recon' : i.screen || 'overview')}>
                      Open {humanize(i.screen)}
                    </HmsButton>
                  </div>
                )}
              </div>
            </HmsSection>
          ) : null}
          <HmsSection title={`Checklist (${close.checks.length})`}>
            {close.checks.map((c, idx) => (
              <HmsRow key={c.title} last={idx === close.checks.length - 1} label={c.title} hint={c.desc} value={<HmsBadge tone={c.ok ? 'green' : 'red'}>{c.ok ? 'Passed' : 'Failed'}</HmsBadge>} />
            ))}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          {status === 'open' && (
            <HmsButton variant="primary" block icon={PlayCircle} disabled={!!busy || close.blocker_count > 0} title={close.blocker_count > 0 ? 'Clear the blockers first' : undefined} onClick={() => run('run', () => accountsService.runDailyClose(data.businessDate), 'Daily close completed', 'The server refused the daily close')}>
              Run daily close
            </HmsButton>
          )}
          {status === 'closed' && (
            <HmsButton variant="primary" block icon={Lock} disabled={!!busy} onClick={() => run('lock', () => accountsService.lockDailyOperations(data.businessDate), 'Today is locked', 'Could not lock the day')}>
              Lock today
            </HmsButton>
          )}
          {status === 'open' && close.blocker_count > 0 && (
            <HmsButton block icon={TriangleAlert} disabled={!!busy} onClick={() => setDraft({ kind: 'esc', id: 'close', title: 'Escalate incomplete close', description: `${close.blocker_count} blocker(s) outstanding`, label: 'Why the day cannot be closed', button: 'Escalate to manager', minLength: 5, text: close.blockers.join('; '), onSave: (c) => run('esc', () => accountsService.escalateDailyClose(data.businessDate, c), 'Incomplete close escalated to the Accounts Manager', 'Could not escalate the close') })}>
              Escalate incomplete close
            </HmsButton>
          )}
          {status === 'locked' && <div style={{ fontSize: '13px', color: HMS.textSecondary }}>No actions — the day is locked.</div>}
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="sup-close"
        title="Daily close"
        description="Blockers, checks and section progress for today's close."
        total={items.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search checks and sections"
        pills={[
          { key: 'all', label: 'All', count: items.length },
          { key: 'open', label: 'Not done', count: count('open'), tone: 'red' },
          { key: 'checks', label: 'Checks', count: count('checks') },
          { key: 'sections', label: 'Sections', count: count('sections') },
        ]}
        activePill={pill}
        onPill={setPill}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open"
        detailLabel="Daily close"
        renderDetail={renderDetail}
      />
      {draft && <CommentDialog draft={draft} setDraft={setDraft} busy={!!busy} />}
    </>
  );
};

/* ================================================================== */
/* Team activity                                                       */
/* ================================================================== */

export const SupervisorTeamView: React.FC<SupervisorViewProps> = ({ data, onNavigateTab, initialFilter, initialSelect }) => {
  const { team, requests } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);

  const pendingOf = (name: string) => requests.filter((r) => isSupervisorPending(r) && r.maker_name === name);
  const pctOf = (s: string) => Math.max(0, Math.min(100, parseInt(s, 10) || 0));
  const filters: Record<string, (m: (typeof team)[number]) => boolean> = { all: () => true, waiting: (m) => pendingOf(m.name).length > 0, errors: (m) => m.errors > 0 };
  const q = search.trim().toLowerCase();
  const visible = team.filter((m) => (filters[pill] || filters.all)(m) && has(q, [m.name, m.code]));
  const count = (k: string) => team.filter(filters[k]).length;

  const rows: HmsListRow[] = visible.map((m) => ({
    key: m.name,
    title: m.name,
    badge: m.errors ? <HmsBadge tone="amber">{m.errors} error{m.errors === 1 ? '' : 's'}</HmsBadge> : <HmsBadge tone="green">Clean</HmsBadge>,
    sub: `${m.code} · ${m.processed} processed · ${pendingOf(m.name).length} waiting on you`,
    metaLeft: `Productivity ${pctOf(m.productivity)}%`,
    metaRight: `First pass ${m.first_pass || '—'}`,
    progress: { pct: pctOf(m.productivity), doneLabel: 'Full productivity' },
  }));

  const renderDetail = (key: string | null) => {
    const m = team.find((x) => x.name === key);
    if (!m) return <HmsEmpty>{team.length ? 'Select an executive from the list to see their activity.' : 'Team activity is unavailable.'}</HmsEmpty>;
    const pending = pendingOf(m.name);
    return (
      <>
        <HmsDetailHeader avatar={m.name} title={m.name} badge={<HmsBadge tone="blue">{m.code}</HmsBadge>} subtitle="Accounts Executive" />
        <HmsStatStrip
          items={[
            { label: 'Processed', value: m.processed },
            { label: 'Approved', value: m.approved, tone: 'green' },
            { label: 'Returned', value: m.returned, tone: m.returned ? 'amber' : 'default' },
            { label: 'Errors', value: m.errors, tone: m.errors ? 'red' : 'default' },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title="Quality" padded>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <HmsProgress showLabel pct={pctOf(m.first_pass)} doneLabel="Every item passed first time" label="First-pass rate" />
              <HmsProgress showLabel pct={pctOf(m.productivity)} doneLabel="Full productivity" label="Productivity" />
            </div>
          </HmsSection>
          <HmsSection title={`Waiting on you (${pending.length})`}>
            {pending.length ? (
              pending.map((r, idx) => (
                <HmsRow
                  key={r.id}
                  last={idx === pending.length - 1}
                  label={`${docLabel(r.document_type)} · ${r.reference_no}`}
                  hint={fmtDateTime(r.submitted_at)}
                  value={
                    <HmsButton size="sm" onClick={() => onNavigateTab(r.document_type === 'journal' ? 'journals' : r.document_type === 'vendor_bill' ? 'bills' : r.document_type === 'expense' ? 'expenses' : 'overview', 'pending', r.id)}>
                      {inr2(r.amount)} · Review
                    </HmsButton>
                  }
                />
              ))
            ) : (
              <Muted>Nothing from {m.name} is waiting for your review.</Muted>
            )}
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="sup-team"
      title="Team activity"
      description="Workload, quality and what each executive has waiting on you."
      total={team.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search executive"
      pills={[
        { key: 'all', label: 'All', count: team.length },
        { key: 'waiting', label: 'Waiting on you', count: count('waiting') },
        { key: 'errors', label: 'With errors', count: count('errors'), tone: 'amber' },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Executive"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Escalations                                                         */
/* ================================================================== */

export const SupervisorEscalationsView: React.FC<SupervisorViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { escalations } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'open');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [draft, setDraft] = useState<CommentDraft | null>(null);
  const { busy, run } = useAction(data, notify);

  const filters: Record<string, (e: (typeof escalations)[number]) => boolean> = {
    open: (e) => e.status === 'open',
    with_manager: (e) => e.status === 'with_manager',
    resolved: (e) => e.status === 'resolved' || e.status === 'closed',
    all: () => true,
  };
  const q = search.trim().toLowerCase();
  const visible = escalations.filter((e) => (filters[pill] || filters.all)(e) && has(q, [e.reference_no, e.reason, e.type, e.raised_by_name]));
  const count = (k: string) => escalations.filter(filters[k]).length;

  const rows: HmsListRow[] = visible.map((e) => ({
    key: e.id,
    title: `${humanize(e.reason)} · ${humanize(e.type)}`,
    badge: <StatusBadge status={e.status} />,
    sub: (
      <>
        <span style={MONO}>{e.reference_no}</span> · {e.raised_by_name || '—'}
      </>
    ),
    metaLeft: fmtDate(e.created_at),
    metaRight: <strong>{inr2(e.amount)}</strong>,
  }));

  const renderDetail = (key: string | null) => {
    const e = escalations.find((x) => x.id === key);
    if (!e) return <HmsEmpty>{escalations.length ? 'Select an escalation from the list to see its details.' : 'No escalations have been raised.'}</HmsEmpty>;
    const open = e.status === 'open';
    const live = open || e.status === 'with_manager';
    return (
      <>
        <HmsDetailHeader icon={TriangleAlert} title={`${humanize(e.reason)} · ${humanize(e.type)}`} badge={<StatusBadge status={e.status} />} subtitle={`${e.reference_no} · raised by ${e.raised_by_name || '—'} · ${fmtDateTime(e.created_at)}`} />
        <HmsStatStrip
          items={[
            { label: 'Amount', value: inr2(e.amount) },
            { label: 'Reason', value: humanize(e.reason) },
            { label: 'Raised to', value: humanize(e.raised_to) },
            { label: 'Notes', value: e.notes.length },
          ]}
        />
        <HmsDetailBody>
          {open && <HmsNotice tone="amber">Not yet forwarded. The Accounts Manager sees it only after you forward it.</HmsNotice>}
          {e.resolution && <HmsNotice tone="green">Resolution: {e.resolution}</HmsNotice>}
          <HmsSection title="Record">
            <HmsRow label="Type" value={humanize(e.entity_type)} />
            <HmsRow label="Record ID" value={<span style={MONO}>{e.entity_id}</span>} last />
          </HmsSection>
          <HmsSection title={`Notes (${e.notes.length})`}>
            {e.notes.length ? e.notes.map((n, idx) => <HmsRow key={idx} last={idx === e.notes.length - 1} label={n.text} hint={`${n.author || '—'} · ${n.when || '—'}`} />) : <Muted>No notes yet.</Muted>}
          </HmsSection>
        </HmsDetailBody>
        {live && (
          <HmsDetailFooter>
            {open && (
              <HmsButton variant="primary" block icon={Send} disabled={!!busy} onClick={() => setDraft({ kind: 'forward', id: e.id, title: 'Forward to Accounts Manager', description: e.reference_no, label: 'What the manager needs to decide', button: 'Forward', minLength: 5, text: '', onSave: (c) => run('forward', () => accountsService.forwardEscalation(e.id, c), `${e.reference_no} forwarded to the Accounts Manager`, 'Could not forward') })}>
                Forward to manager
              </HmsButton>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
              <HmsButton block icon={MessageSquarePlus} disabled={!!busy} onClick={() => setDraft({ kind: 'note', id: e.id, title: 'Add note', description: e.reference_no, label: 'Note', button: 'Add note', minLength: 3, text: '', onSave: (c) => run('note', () => accountsService.addEscalationNote(e.id, c), 'Note added', 'Could not add the note') })}>
                Add note
              </HmsButton>
              <HmsButton block icon={CircleCheck} disabled={!!busy} onClick={() => setDraft({ kind: 'resolve', id: e.id, title: 'Resolve escalation', description: e.reference_no, label: 'How it was resolved', button: 'Resolve', minLength: 5, text: '', onSave: (c) => run('resolve', () => accountsService.resolveEscalation(e.id, c), `${e.reference_no} resolved`, 'Could not resolve') })}>
                Resolve
              </HmsButton>
            </div>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="sup-escalations"
        title="Escalations"
        description="Items raised for Accounts Manager review — forward, annotate or resolve."
        total={escalations.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search reference, reason or executive"
        pills={[
          { key: 'open', label: 'To forward', count: count('open'), tone: 'red' },
          { key: 'with_manager', label: 'With manager', count: count('with_manager') },
          { key: 'resolved', label: 'Resolved', count: count('resolved') },
          { key: 'all', label: 'All', count: escalations.length },
        ]}
        activePill={pill}
        onPill={setPill}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open"
        detailLabel="Escalation"
        renderDetail={renderDetail}
      />
      {draft && <CommentDialog draft={draft} setDraft={setDraft} busy={!!busy} />}
    </>
  );
};

/* ================================================================== */
/* Audit trail (read-only)                                             */
/* ================================================================== */

export const SupervisorAuditView: React.FC<SupervisorViewProps> = ({ data, initialFilter, initialSelect }) => {
  const { audit } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);

  const sameDay = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
  const modules = Array.from(new Set(audit.map((a) => a.module))).sort().slice(0, 4);
  const q = search.trim().toLowerCase();
  const visible = audit.filter((a) => (pill === 'all' ? true : pill === 'today' ? sameDay(a.occurred_at) : a.module === pill) && has(q, [a.actor_name, a.action, a.module, a.reference_no, a.entity_type]));

  const rows: HmsListRow[] = visible.map((a) => ({
    key: a.id,
    title: `${humanize(a.action)} · ${a.reference_no || humanize(a.entity_type)}`,
    badge: <HmsBadge tone="gray">{humanize(a.module)}</HmsBadge>,
    sub: `${a.actor_name} · ${humanize(a.actor_role)}`,
    metaLeft: fmtDateTime(a.occurred_at),
    metaRight: <span style={MONO}>{(a.entry_hash || '').slice(0, 10) || '—'}</span>,
  }));

  const renderDetail = (key: string | null) => {
    const a = audit.find((x) => x.id === key);
    if (!a) return <HmsEmpty>{audit.length ? 'Select an entry from the list to see its details.' : 'No department activity recorded in the last 31 days.'}</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={ScrollText} title={`${humanize(a.action)} · ${a.reference_no || humanize(a.entity_type)}`} badge={<HmsBadge tone="gray">Read-only</HmsBadge>} subtitle={`${a.actor_name} · ${humanize(a.actor_role)} · ${fmtDateTime(a.occurred_at)}`} />
        <HmsStatStrip
          items={[
            { label: 'Module', value: humanize(a.module) },
            { label: 'Action', value: humanize(a.action) },
            { label: 'Record', value: humanize(a.entity_type), note: a.reference_no || a.entity_id },
            { label: 'By', value: a.actor_name },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title="Hash chain">
            <HmsRow label="Entry hash" value={<span style={{ ...MONO, wordBreak: 'break-all' }}>{a.entry_hash || '—'}</span>} />
            <HmsRow label="Previous hash" value={<span style={{ ...MONO, wordBreak: 'break-all' }}>{a.previous_hash || '—'}</span>} last />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="sup-audit"
      title="Audit trail"
      description="Department approvals, returns, escalations and close actions — last 31 days, read-only."
      total={audit.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search user, action or reference"
      pills={[
        { key: 'all', label: 'All', count: audit.length },
        { key: 'today', label: 'Today', count: audit.filter((a) => sameDay(a.occurred_at)).length },
        ...modules.map((m) => ({ key: m, label: humanize(m), count: audit.filter((a) => a.module === m).length })),
      ]}
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
