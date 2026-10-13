// Accounts Executive · receivables subledger and the collection pipeline.
import React, { useState } from 'react';
import { HandCoins, PhoneCall, MessageSquarePlus, ArrowRight } from 'lucide-react';
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
  HmsTone,
  INPUT,
  TEXTAREA,
  HMS,
} from '../../../components/hms';
import { accountsService, CollectionCaseItem, ReceivableItem } from '../../../services/accountsService';
import { AGING_LABEL, addDaysIso, fmtDate, fmtDateTime, humanize, inr2, num, todayIso } from './executiveData';
import { ExecutiveViewProps, MONO, useAction, useNewSignal } from './executiveHelpers';
import { StatusBadge } from './executiveUi';

const AGING_TONE: Record<ReceivableItem['aging_bucket'], HmsTone> = { '0_30': 'gray', '31_60': 'blue', '61_90': 'amber', '90_plus': 'red' };

const isReceivableOpen = (r: ReceivableItem) => r.status !== 'settled' && r.status !== 'written_off';

const payerName = (r: ReceivableItem) => r.customer?.name || r.patient_name || 'Payer not recorded';

/* ================================================================== */
/* Receivables                                                         */
/* ================================================================== */

interface FollowupDraft {
  receivableId: string;
  channel: string;
  contact: string;
  outcome: string;
  notes: string;
  next: string;
  error?: string;
}

export const ExecutiveReceivablesView: React.FC<ExecutiveViewProps> = ({ data, notify, newSignal, initialFilter, initialSelect }) => {
  const { receivables } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [draft, setDraft] = useState<FollowupDraft | null>(null);
  const { busy, run } = useAction(data, notify);

  const filters: Record<string, (r: ReceivableItem) => boolean> = {
    all: () => true,
    '0_30': (r) => r.aging_bucket === '0_30',
    '31_60': (r) => r.aging_bucket === '31_60',
    '61_90': (r) => r.aging_bucket === '61_90',
    '90_plus': (r) => r.aging_bucket === '90_plus' && isReceivableOpen(r),
    disputed: (r) => r.status === 'disputed',
  };
  const q = search.trim().toLowerCase();
  const visible = receivables.filter(
    (r) => (filters[pill] || filters.all)(r) && (!q || [r.reference_no, r.customer?.name, r.patient_name, r.receivable_type].some((v) => (v || '').toLowerCase().includes(q)))
  );
  const count = (k: string) => receivables.filter(filters[k]).length;

  const startFollowup = (id: string | null) => {
    if (id) setDraft({ receivableId: id, channel: 'call', contact: '', outcome: 'promised', notes: '', next: addDaysIso(todayIso(), 7) });
  };
  // Alt+N logs a follow-up on the selected (or first visible) receivable
  useNewSignal(newSignal, () => startFollowup(visible.find((r) => r.id === selected)?.id ?? visible[0]?.id ?? null));

  const settledPct = (r: ReceivableItem) => (num(r.original_amount) > 0 ? Math.round((num(r.settled_amount) / num(r.original_amount)) * 100) : 0);

  const rows: HmsListRow[] = visible.map((r) => ({
    key: r.id,
    title: payerName(r),
    badge: <HmsBadge tone={AGING_TONE[r.aging_bucket] || 'gray'}>{AGING_LABEL[r.aging_bucket] || humanize(r.aging_bucket)}</HmsBadge>,
    sub: (
      <>
        <span style={MONO}>{r.reference_no}</span> · {humanize(r.receivable_type)}
        {r.customer?.name && r.patient_name ? ` · ${r.patient_name}` : ''}
      </>
    ),
    metaLeft: `Due ${fmtDate(r.due_date)}`,
    metaRight: <strong>{inr2(r.outstanding_amount)}</strong>,
    progress: num(r.settled_amount) > 0 ? { pct: settledPct(r), doneLabel: 'Settled' } : undefined,
  }));

  const save = async () => {
    if (!draft) return;
    if (!draft.notes.trim()) return setDraft({ ...draft, error: 'Add a note of what was discussed.' });
    const r = receivables.find((x) => x.id === draft.receivableId);
    const ok = await run(
      'followup',
      () =>
        accountsService.logReceivableFollowup(draft.receivableId, {
          channel: draft.channel,
          contact_person: draft.contact.trim(),
          outcome: draft.outcome,
          notes: draft.notes.trim(),
          next_action_on: draft.next || undefined,
        }),
      `Follow-up logged for ${r?.reference_no || 'the receivable'}`,
      'Could not log the follow-up'
    );
    if (ok) setDraft(null);
  };

  const renderDetail = (key: string | null) => {
    const r = receivables.find((x) => x.id === key);
    if (!r) return <HmsEmpty>{receivables.length ? 'Select a receivable from the list to see its details.' : 'No open receivables.'}</HmsEmpty>;
    const followups = r.followups || [];
    return (
      <>
        <HmsDetailHeader icon={HandCoins} title={payerName(r)} badge={<StatusBadge status={r.status} />} subtitle={`${r.reference_no} · ${humanize(r.receivable_type)} · ${AGING_LABEL[r.aging_bucket] || '—'}`} />
        <HmsStatStrip
          items={[
            { label: 'Outstanding', value: inr2(r.outstanding_amount), tone: r.aging_bucket === '90_plus' && isReceivableOpen(r) ? 'red' : 'default' },
            { label: 'Original', value: inr2(r.original_amount), note: `Invoiced ${fmtDate(r.invoice_date)}` },
            { label: 'Settled', value: inr2(r.settled_amount), note: `${settledPct(r)}%` },
            { label: 'Due', value: fmtDate(r.due_date) },
          ]}
        />
        <HmsDetailBody>
          {r.aging_bucket === '90_plus' && isReceivableOpen(r) && <HmsNotice tone="red">Over 90 days. Follow up and tell the supervisor if the payer has not committed to a date.</HmsNotice>}
          {r.status === 'disputed' && <HmsNotice tone="amber">The payer has disputed this amount.</HmsNotice>}
          <HmsSection title="Party">
            <HmsRow label="Payer" value={r.customer?.name || '—'} hint={r.customer?.source_type ? humanize(r.customer.source_type) : undefined} />
            <HmsRow label="Patient" value={r.patient_name || '—'} />
            <HmsRow label="Last follow-up" value={fmtDateTime(r.last_followup_at)} last />
          </HmsSection>
          <HmsSection title={`Follow-ups (${followups.length})`}>
            {followups.length ? (
              followups.map((f, idx) => (
                <HmsRow
                  key={f.id}
                  last={idx === followups.length - 1}
                  label={`${humanize(f.channel)} · ${humanize(f.outcome)}`}
                  hint={[f.contact_person, f.notes].filter(Boolean).join(' — ') || undefined}
                  value={<span style={{ fontSize: '12px', color: HMS.textSecondary }}>{`${fmtDateTime(f.created_at)}${f.logged_by_name ? ` · ${f.logged_by_name}` : ''}`}</span>}
                />
              ))
            ) : (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No follow-ups logged yet.</div>
            )}
          </HmsSection>
        </HmsDetailBody>
        {isReceivableOpen(r) && (
          <HmsDetailFooter>
            <HmsButton variant="primary" block icon={MessageSquarePlus} onClick={() => startFollowup(r.id)} title="Log follow-up (Alt+N)">
              Log follow-up
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  const target = draft ? receivables.find((x) => x.id === draft.receivableId) : null;

  return (
    <>
      <HmsMasterDetail
        listId="acc-receivables"
        title="Receivables"
        description="Insurance, corporate and patient balances by age."
        total={receivables.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search payer, patient or reference"
        pills={[
          { key: 'all', label: 'All', count: receivables.length },
          { key: '0_30', label: '0–30', count: count('0_30') },
          { key: '31_60', label: '31–60', count: count('31_60') },
          { key: '61_90', label: '61–90', count: count('61_90'), tone: 'amber' },
          { key: '90_plus', label: '90+', count: count('90_plus'), tone: 'red' },
          { key: 'disputed', label: 'Disputed', count: count('disputed') },
        ]}
        activePill={pill}
        onPill={setPill}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="log follow-up"
        onPrimary={(id) => {
          const r = receivables.find((x) => x.id === id);
          if (r && isReceivableOpen(r)) startFollowup(id);
        }}
        detailLabel="Receivable"
        renderDetail={renderDetail}
      />
      {draft && (
        <HmsModal
          title="Log follow-up"
          description={target ? `${target.reference_no} · ${payerName(target)} · ${inr2(target.outstanding_amount)} outstanding` : undefined}
          onClose={() => setDraft(null)}
          busy={busy === 'followup'}
          footer={
            <>
              <HmsButton onClick={() => setDraft(null)} disabled={busy === 'followup'}>
                Cancel
              </HmsButton>
              <HmsButton variant="primary" icon={MessageSquarePlus} onClick={save} disabled={busy === 'followup'}>
                {busy === 'followup' ? 'Saving…' : 'Save follow-up'}
              </HmsButton>
            </>
          }
        >
          {draft.error && <HmsNotice tone="red">{draft.error}</HmsNotice>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <HmsField label="Channel" required>
              <select style={INPUT} value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })}>
                <option value="call">Phone call</option>
                <option value="email">Email</option>
                <option value="visit">Visit</option>
                <option value="letter">Letter</option>
              </select>
            </HmsField>
            <HmsField label="Outcome" required>
              <select style={INPUT} value={draft.outcome} onChange={(e) => setDraft({ ...draft, outcome: e.target.value })}>
                <option value="promised">Promised to pay</option>
                <option value="partial">Partial payment</option>
                <option value="disputed">Disputed</option>
                <option value="no_response">No response</option>
                <option value="callback">Asked to call back</option>
              </select>
            </HmsField>
            <HmsField label="Contact person">
              <input style={INPUT} value={draft.contact} onChange={(e) => setDraft({ ...draft, contact: e.target.value })} placeholder="Name at the payer" />
            </HmsField>
            <HmsField label="Next action on">
              <input type="date" style={INPUT} value={draft.next} onChange={(e) => setDraft({ ...draft, next: e.target.value })} />
            </HmsField>
          </div>
          <HmsField label="Notes" required>
            <textarea style={TEXTAREA} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value, error: undefined })} placeholder="What was discussed and agreed" />
          </HmsField>
        </HmsModal>
      )}
    </>
  );
};

/* ================================================================== */
/* Collection pipeline                                                 */
/* ================================================================== */

const STAGES: CollectionCaseItem['stage'][] = ['due_today', 'followup_required', 'promised', 'escalated', 'recovered'];

export const ExecutiveCollectionsView: React.FC<ExecutiveViewProps> = ({ data, onNavigateTab, initialFilter, initialSelect }) => {
  const { cases } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);

  const q = search.trim().toLowerCase();
  const visible = cases.filter((c) => (pill === 'all' || c.stage === pill) && (!q || [c.customer?.name, c.next_action].some((v) => (v || '').toLowerCase().includes(q))));

  const rows: HmsListRow[] = visible.map((c) => ({
    key: c.id,
    title: c.customer?.name || 'Payer not recorded',
    badge: <StatusBadge status={c.stage} />,
    sub: c.next_action ? `Next: ${c.next_action}` : 'No next action set',
    metaLeft: c.next_action_on ? `By ${fmtDate(c.next_action_on)}` : `Priority ${humanize(c.recovery_priority)}`,
    metaRight: <strong>{inr2(c.outstanding_amount)}</strong>,
  }));

  const renderDetail = (key: string | null) => {
    const c = cases.find((x) => x.id === key);
    if (!c) return <HmsEmpty>{cases.length ? 'Select a case from the list to see its details.' : 'No collection cases are open.'}</HmsEmpty>;
    const followups: { id?: string; channel?: string; outcome?: string; notes?: string; created_at?: string; logged_by_name?: string }[] = c.followups || [];
    return (
      <>
        <HmsDetailHeader icon={PhoneCall} title={c.customer?.name || 'Payer not recorded'} badge={<StatusBadge status={c.stage} />} subtitle={c.customer?.source_type ? humanize(c.customer.source_type) : 'Collection case'} />
        <HmsStatStrip
          items={[
            { label: 'Outstanding', value: inr2(c.outstanding_amount) },
            { label: 'Stage', value: <StatusBadge status={c.stage} /> },
            { label: 'Next action by', value: fmtDate(c.next_action_on) },
            { label: 'Priority', value: humanize(c.recovery_priority), tone: c.escalated ? 'red' : 'default', note: c.escalated ? 'Escalated' : undefined },
          ]}
        />
        <HmsDetailBody>
          {c.escalated && <HmsNotice tone="red">Escalated to the supervisor.</HmsNotice>}
          <HmsSection title="Next action" padded>
            <div style={{ fontSize: '14px', color: c.next_action ? HMS.text : HMS.textSecondary, lineHeight: 1.6 }}>{c.next_action || 'No next action set.'}</div>
          </HmsSection>
          <HmsSection title={`Follow-ups (${followups.length})`}>
            {followups.length ? (
              followups.map((f, idx) => (
                <HmsRow
                  key={f.id || idx}
                  last={idx === followups.length - 1}
                  label={`${humanize(f.channel)} · ${humanize(f.outcome)}`}
                  hint={f.notes || undefined}
                  value={<span style={{ fontSize: '12px', color: HMS.textSecondary }}>{`${fmtDateTime(f.created_at)}${f.logged_by_name ? ` · ${f.logged_by_name}` : ''}`}</span>}
                />
              ))
            ) : (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No follow-ups on this case yet.</div>
            )}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton block icon={ArrowRight} onClick={() => onNavigateTab('receivables')}>
            Log follow-ups in Receivables
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="acc-collections"
      title="Collection pipeline"
      description="Payer-level recovery cases by stage, largest balance first."
      total={cases.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search payer or next action"
      pills={[
        { key: 'all', label: 'All', count: cases.length },
        ...STAGES.map((s) => ({
          key: s,
          label: s === 'due_today' ? 'Due today' : s === 'followup_required' ? 'Follow-up due' : humanize(s),
          count: cases.filter((c) => c.stage === s).length,
          ...(s === 'escalated' ? { tone: 'red' as const } : s === 'due_today' ? { tone: 'amber' as const } : {}),
        })),
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Collection case"
      renderDetail={renderDetail}
    />
  );
};
