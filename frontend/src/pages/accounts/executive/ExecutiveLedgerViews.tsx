// Accounts Executive · ledger work: event inbox, journals, vendor bills, bank reconciliation, expenses.
// Each section is one HmsMasterDetail (HMS bible 19.6). Actions call the accounts API and reload.
import React, { useState } from 'react';
import { Inbox, NotebookTabs, ReceiptText, Landmark, WalletCards, Check, X, Send, Plus, Search, Flag, Link2 } from 'lucide-react';
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
  HmsToggle,
  TEXTAREA,
  HMS,
} from '../../../components/hms';
import { accountsService, BankSuggestion, BankTransactionItem, FinancialEventItem, JournalVoucher, VendorBillItem, ExpenseRequestItem } from '../../../services/accountsService';
import { fmtDate, fmtDateTime, humanize, inr2, isBankOpen, isDuplicateRisk, isMakerOpen, num } from './executiveData';
import { ExecutiveViewProps, MONO, useAction } from './executiveHelpers';
import { StatusBadge } from './executiveUi';

const matches = (q: string, values: (string | undefined | null)[]) => !q || values.some((v) => (v || '').toLowerCase().includes(q));

const Mono: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={MONO}>{children}</span>;

/* ================================================================== */
/* Event inbox                                                         */
/* ================================================================== */

const isEventPending = (e: FinancialEventItem) => e.status === 'pending_validation' || e.status === 'received';

export const ExecutiveEventsView: React.FC<ExecutiveViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { events } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [rejecting, setRejecting] = useState<{ id: string; reason: string; error?: string } | null>(null);
  const { busy, run } = useAction(data, notify);

  const filters: Record<string, (e: FinancialEventItem) => boolean> = {
    all: () => true,
    pending: isEventPending,
    validated: (e) => e.status === 'validated' || e.status === 'posted',
    rejected: (e) => e.status.startsWith('rejected'),
  };
  const q = search.trim().toLowerCase();
  const visible = events.filter((e) => (filters[pill] || filters.all)(e) && matches(q, [e.event_id, e.event_type, e.source_department, e.source_reference]));
  const count = (k: string) => events.filter(filters[k]).length;

  const rows: HmsListRow[] = visible.map((e) => ({
    key: e.id,
    title: humanize(e.event_type),
    badge: <StatusBadge status={e.status} />,
    sub: (
      <>
        <Mono>{e.event_id}</Mono> · {e.source_reference || 'No source reference'}
      </>
    ),
    metaLeft: `${humanize(e.source_department)} · ${fmtDate(e.business_date)}`,
    metaRight: <strong>{inr2(e.amount)}</strong>,
  }));

  const reject = async () => {
    if (!rejecting) return;
    if (!rejecting.reason.trim()) return setRejecting({ ...rejecting, error: 'Give the reason the event is rejected. The source department sees it.' });
    const ok = await run('reject', () => accountsService.rejectEvent(rejecting.id, rejecting.reason.trim()), 'Event rejected and returned to the source department', 'Could not reject the event');
    if (ok) setRejecting(null);
  };

  const renderDetail = (key: string | null) => {
    const e = events.find((x) => x.id === key);
    if (!e) return <HmsEmpty>{events.length ? 'Select an event from the list to see its details.' : 'No financial events have arrived from the departments.'}</HmsEmpty>;
    const payload = e.payload && typeof e.payload === 'object' && Object.keys(e.payload).length ? e.payload : null;
    return (
      <>
        <HmsDetailHeader icon={Inbox} title={humanize(e.event_type)} badge={<StatusBadge status={e.status} />} subtitle={`${e.event_id} · ${humanize(e.source_department)}`} />
        <HmsStatStrip
          items={[
            { label: 'Amount', value: inr2(e.amount) },
            { label: 'Source', value: humanize(e.source_department), note: e.source_reference || '—' },
            { label: 'Business date', value: fmtDate(e.business_date) },
            { label: 'Received', value: fmtDateTime(e.created_at) },
          ]}
        />
        <HmsDetailBody>
          {e.rejection_reason && <HmsNotice tone="red">Rejected: {e.rejection_reason}</HmsNotice>}
          {isEventPending(e) && <HmsNotice tone="blue">Check the amount and source reference against the department record, then validate it for posting or reject it with a reason.</HmsNotice>}
          <HmsSection title="Event">
            <HmsRow label="Event ID" value={<Mono>{e.event_id}</Mono>} />
            <HmsRow label="Event type" value={humanize(e.event_type)} />
            <HmsRow label="Source reference" value={e.source_reference || '—'} />
            <HmsRow label="Status" value={<StatusBadge status={e.status} />} last />
          </HmsSection>
          <HmsSection title="Payload" padded defaultOpen={false}>
            {payload ? (
              <pre style={{ ...MONO, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: HMS.label }}>{JSON.stringify(payload, null, 2)}</pre>
            ) : (
              <span style={{ fontSize: '13px', color: HMS.textSecondary }}>The event carries no payload.</span>
            )}
          </HmsSection>
        </HmsDetailBody>
        {isEventPending(e) && (
          <HmsDetailFooter>
            <HmsButton variant="primary" block icon={Check} disabled={!!busy} onClick={() => run('validate', () => accountsService.validateEvent(e.id), 'Event validated for posting', 'Could not validate the event')}>
              {busy === 'validate' ? 'Validating…' : 'Validate for posting'}
            </HmsButton>
            <HmsButton variant="danger" block icon={X} disabled={!!busy} onClick={() => setRejecting({ id: e.id, reason: '' })}>
              Reject
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="acc-events"
        title="Event inbox"
        description="Billing, pharmacy and lab revenue events waiting for ledger validation."
        total={events.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search event, source or reference"
        pills={[
          { key: 'all', label: 'All', count: events.length },
          { key: 'pending', label: 'To validate', count: count('pending'), tone: 'amber' },
          { key: 'validated', label: 'Validated', count: count('validated') },
          { key: 'rejected', label: 'Rejected', count: count('rejected'), tone: 'red' },
        ]}
        activePill={pill}
        onPill={setPill}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open"
        detailLabel="Financial event"
        renderDetail={renderDetail}
      />
      {rejecting && (
        <HmsModal
          title="Reject event"
          description={events.find((x) => x.id === rejecting.id)?.event_id}
          onClose={() => setRejecting(null)}
          busy={busy === 'reject'}
          footer={
            <>
              <HmsButton onClick={() => setRejecting(null)} disabled={busy === 'reject'}>
                Cancel
              </HmsButton>
              <HmsButton variant="danger" icon={X} onClick={reject} disabled={busy === 'reject'}>
                {busy === 'reject' ? 'Rejecting…' : 'Reject event'}
              </HmsButton>
            </>
          }
        >
          {rejecting.error && <HmsNotice tone="red">{rejecting.error}</HmsNotice>}
          <HmsField label="Reason" required>
            <textarea style={TEXTAREA} value={rejecting.reason} onChange={(ev) => setRejecting({ ...rejecting, reason: ev.target.value, error: undefined })} placeholder="e.g. Amount does not match the bill" />
          </HmsField>
        </HmsModal>
      )}
    </>
  );
};

/* ================================================================== */
/* Journals                                                            */
/* ================================================================== */

export const ExecutiveJournalsView: React.FC<ExecutiveViewProps> = ({ data, notify, openDialog, initialFilter, initialSelect }) => {
  const { journals } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const { busy, run } = useAction(data, notify);

  const filters: Record<string, (j: JournalVoucher) => boolean> = {
    all: () => true,
    open: (j) => isMakerOpen(j.status),
    review: (j) => ['submitted', 'in_approval', 'approved'].includes(j.status),
    posted: (j) => j.status === 'posted',
    closed: (j) => j.status === 'rejected' || j.status === 'reversed',
  };
  const q = search.trim().toLowerCase();
  const visible = journals.filter((j) => (filters[pill] || filters.all)(j) && matches(q, [j.reference_no, j.description, j.external_reference]));
  const count = (k: string) => journals.filter(filters[k]).length;

  const rows: HmsListRow[] = visible.map((j) => ({
    key: j.id,
    title: j.description || 'No narration',
    badge: <StatusBadge status={j.status} />,
    sub: (
      <>
        <Mono>{j.reference_no}</Mono> · {fmtDate(j.journal_date)}
      </>
    ),
    metaLeft: humanize(j.entry_type),
    metaRight: <strong>{inr2(j.total_debit)}</strong>,
  }));

  const renderDetail = (key: string | null) => {
    const j = journals.find((x) => x.id === key);
    if (!j) return <HmsEmpty>{journals.length ? 'Select a journal from the list to see its details.' : 'No journal vouchers yet. Create one with New journal (Alt+N).'}</HmsEmpty>;
    const diff = num(j.total_debit) - num(j.total_credit);
    const lines = j.lines || [];
    return (
      <>
        <HmsDetailHeader icon={NotebookTabs} title={j.reference_no} badge={<StatusBadge status={j.status} />} subtitle={`${fmtDate(j.journal_date)} · ${humanize(j.entry_type)} · Period ${j.posting_period || '—'}`} />
        <HmsStatStrip
          items={[
            { label: 'Total debit', value: inr2(j.total_debit) },
            { label: 'Total credit', value: inr2(j.total_credit) },
            { label: 'Difference', value: inr2(Math.abs(diff)), tone: Math.abs(diff) < 0.005 ? 'green' : 'red', note: Math.abs(diff) < 0.005 ? 'Balanced' : 'Unbalanced' },
            { label: 'Lines', value: lines.length, note: `Version ${j.version ?? 1}` },
          ]}
        />
        <HmsDetailBody>
          {j.status === 'returned' && <HmsNotice tone="amber">Returned by the approver. Correct it and submit again.</HmsNotice>}
          <HmsSection title="Narration" padded>
            <div style={{ fontSize: '14px', color: HMS.text, lineHeight: 1.6 }}>{j.description || 'No narration recorded.'}</div>
          </HmsSection>
          <HmsSection title={`Journal lines (${lines.length})`}>
            {lines.length ? (
              lines.map((ln, idx) => (
                <HmsRow
                  key={ln.id || idx}
                  last={idx === lines.length - 1}
                  label={ln.account_name || ln.account_code || ln.account_id}
                  hint={[ln.account_code, ln.cost_center_code, ln.narration].filter(Boolean).join(' · ') || undefined}
                  value={<strong>{num(ln.debit) > 0 ? `Dr ${inr2(ln.debit)}` : `Cr ${inr2(ln.credit)}`}</strong>}
                />
              ))
            ) : (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>The server returned no lines for this journal.</div>
            )}
          </HmsSection>
          <HmsSection title="Details">
            <HmsRow label="External reference" value={j.external_reference || '—'} />
            <HmsRow label="Source" value={humanize(j.source)} />
            <HmsRow label="Maker" value={j.maker_name || '—'} />
            <HmsRow label="Created" value={fmtDateTime(j.created_at)} last />
          </HmsSection>
        </HmsDetailBody>
        {isMakerOpen(j.status) && (
          <HmsDetailFooter>
            <HmsButton
              variant="primary"
              block
              icon={Send}
              disabled={!!busy || Math.abs(diff) >= 0.005}
              title={Math.abs(diff) >= 0.005 ? 'Debits and credits must match before submitting' : undefined}
              onClick={() => run('submit', () => accountsService.submitJournal(j.id, j.version ?? 1), `Journal ${j.reference_no} sent to the supervisor`, 'Could not submit the journal')}
            >
              {busy === 'submit' ? 'Submitting…' : 'Submit for approval'}
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="acc-journals"
      title="Journal entries"
      description="Accruals, adjustments and reclassifications. Debits must equal credits."
      total={journals.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search reference or narration"
      pills={[
        { key: 'all', label: 'All', count: journals.length },
        { key: 'open', label: 'Drafts & returned', count: count('open'), tone: 'amber' },
        { key: 'review', label: 'In approval', count: count('review') },
        { key: 'posted', label: 'Posted', count: count('posted') },
        { key: 'closed', label: 'Rejected / reversed', count: count('closed') },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      headerAction={
        <HmsButton variant="primary" icon={Plus} onClick={() => openDialog('journal')} title="New journal (Alt+N)" aria-keyshortcuts="Alt+N">
          New journal
        </HmsButton>
      }
      detailLabel="Journal voucher"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Vendor bills                                                        */
/* ================================================================== */

export const ExecutiveBillsView: React.FC<ExecutiveViewProps> = ({ data, notify, openDialog, initialFilter, initialSelect }) => {
  const { bills } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [ackFor, setAckFor] = useState<string | null>(null);
  const { busy, run } = useAction(data, notify);

  const filters: Record<string, (b: VendorBillItem) => boolean> = {
    all: () => true,
    open: (b) => isMakerOpen(b.status),
    duplicates: isDuplicateRisk,
    review: (b) => ['submitted', 'in_approval', 'on_hold'].includes(b.status),
    approved: (b) => ['approved', 'scheduled', 'paid'].includes(b.status),
  };
  const q = search.trim().toLowerCase();
  const visible = bills.filter((b) => (filters[pill] || filters.all)(b) && matches(q, [b.reference_no, b.invoice_no, b.vendor?.name, b.po_no]));
  const count = (k: string) => bills.filter(filters[k]).length;

  const rows: HmsListRow[] = visible.map((b) => ({
    key: b.id,
    title: b.vendor?.name || 'Vendor not recorded',
    badge: <StatusBadge status={b.status} />,
    sub: (
      <>
        <Mono>{b.reference_no}</Mono> · Invoice {b.invoice_no || '—'}
      </>
    ),
    metaLeft: isDuplicateRisk(b) ? <HmsBadge tone="red">{b.duplicate_score}% duplicate risk</HmsBadge> : `Due ${fmtDate(b.due_date)}`,
    metaRight: <strong>{inr2(b.net_payable)}</strong>,
  }));

  const renderDetail = (key: string | null) => {
    const b = bills.find((x) => x.id === key);
    if (!b) return <HmsEmpty>{bills.length ? 'Select a bill from the list to see its details.' : 'No vendor bills recorded yet. Record one with Alt+N.'}</HmsEmpty>;
    const gst = num(b.cgst) + num(b.sgst) + num(b.igst);
    const twm = b.three_way_match;
    const dup = isDuplicateRisk(b);
    const acknowledged = ackFor === b.id;
    return (
      <>
        <HmsDetailHeader icon={ReceiptText} title={b.vendor?.name || 'Vendor not recorded'} badge={<StatusBadge status={b.status} />} subtitle={`${b.reference_no} · Invoice ${b.invoice_no || '—'}`} />
        <HmsStatStrip
          items={[
            { label: 'Net payable', value: inr2(b.net_payable) },
            { label: 'Taxable', value: inr2(b.taxable_amount) },
            { label: 'GST', value: inr2(gst), note: num(b.igst) > 0 ? 'IGST' : 'CGST + SGST' },
            { label: 'TDS', value: inr2(b.tds_amount) },
          ]}
        />
        <HmsDetailBody>
          {dup && <HmsNotice tone="red">Possible duplicate ({b.duplicate_score}% match with another invoice from this vendor). Check the original before submitting.</HmsNotice>}
          {b.status === 'returned' && <HmsNotice tone="amber">Returned by the approver. Correct it and submit again.</HmsNotice>}
          <HmsSection title="3-way match">
            {twm ? (
              <>
                <HmsRow label="Purchase order" value={twm.po_no || '—'} />
                <HmsRow label="Goods receipt (GRN)" value={twm.grn_no || '—'} />
                <HmsRow label="Result" value={<HmsBadge tone={twm.result === 'matched' ? 'green' : 'red'}>{humanize(twm.result)}</HmsBadge>} />
                <HmsRow label="Variance" value={`${inr2(twm.variance_amount)} (${num(twm.variance_pct)}%)`} last />
              </>
            ) : (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No PO / GRN match recorded for this bill yet.</div>
            )}
          </HmsSection>
          <HmsSection title="Invoice">
            <HmsRow label="Invoice date" value={fmtDate(b.invoice_date)} />
            <HmsRow label="Due date" value={fmtDate(b.due_date)} />
            <HmsRow label="PO number" value={b.po_no || '—'} />
            <HmsRow label="Vendor GSTIN" value={b.vendor?.gstin ? <Mono>{b.vendor.gstin}</Mono> : '—'} />
            <HmsRow label="Payment priority" value={humanize(b.payment_priority)} last />
          </HmsSection>
        </HmsDetailBody>
        {isMakerOpen(b.status) && (
          <HmsDetailFooter>
            {dup && <HmsToggle checked={acknowledged} onChange={(v) => setAckFor(v ? b.id : null)} label="I checked the original invoice — this is not a duplicate" showLabel />}
            <HmsButton
              variant="primary"
              block
              icon={Send}
              disabled={!!busy || (dup && !acknowledged)}
              onClick={() => run('submit', () => accountsService.submitVendorBill(b.id, acknowledged, b.version ?? 1), `Bill ${b.reference_no} sent for approval`, 'Could not submit the bill')}
            >
              {busy === 'submit' ? 'Submitting…' : 'Submit for approval'}
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="acc-bills"
      title="Vendor bills"
      description="Invoices checked against PO and GRN, with duplicate detection."
      total={bills.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search vendor, invoice or PO"
      pills={[
        { key: 'all', label: 'All', count: bills.length },
        { key: 'open', label: 'Drafts & returned', count: count('open'), tone: 'amber' },
        { key: 'duplicates', label: 'Duplicate risk', count: count('duplicates'), tone: 'red' },
        { key: 'review', label: 'In approval', count: count('review') },
        { key: 'approved', label: 'Approved', count: count('approved') },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      headerAction={
        <HmsButton variant="primary" icon={Plus} onClick={() => openDialog('bill')} title="Record vendor bill (Alt+N)" aria-keyshortcuts="Alt+N">
          Record bill
        </HmsButton>
      }
      detailLabel="Vendor bill"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Bank reconciliation                                                 */
/* ================================================================== */

export const ExecutiveBankView: React.FC<ExecutiveViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { bank } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  // Suggestions fetched on demand for a line (the server also stores its last run on the line)
  const [found, setFound] = useState<Record<string, BankSuggestion[]>>({});
  const { busy, run } = useAction(data, notify);

  const filters: Record<string, (t: BankTransactionItem) => boolean> = {
    all: () => true,
    open: isBankOpen,
    suggested: (t) => t.match_status === 'suggested',
    review: (t) => t.match_status === 'for_review',
    matched: (t) => t.match_status === 'matched',
  };
  const q = search.trim().toLowerCase();
  const visible = bank.filter((t) => (filters[pill] || filters.all)(t) && matches(q, [t.narration, t.bank_reference, t.txn_date, t.type]));
  const count = (k: string) => bank.filter(filters[k]).length;

  const signed = (t: BankTransactionItem) => (
    <strong style={{ color: t.direction === 'credit' ? '#15803d' : HMS.text }}>
      {t.direction === 'credit' ? '+' : '−'}
      {inr2(t.amount)}
    </strong>
  );

  const rows: HmsListRow[] = visible.map((t) => ({
    key: t.id,
    title: t.narration || 'No narration',
    badge: <StatusBadge status={t.match_status} />,
    sub: (
      <>
        {fmtDate(t.txn_date)} · <Mono>{t.bank_reference || '—'}</Mono>
      </>
    ),
    metaLeft: humanize(t.type),
    metaRight: signed(t),
  }));

  const findMatches = async (t: BankTransactionItem) => {
    try {
      const list = await accountsService.getBankSuggestions(t.id);
      setFound((f) => ({ ...f, [t.id]: list }));
      notify(list.length ? `${list.length} possible match${list.length === 1 ? '' : 'es'} found` : 'No ledger entry matches this line');
    } catch {
      notify('Could not load suggestions for this line', 'error');
    }
  };

  const renderDetail = (key: string | null) => {
    const t = bank.find((x) => x.id === key);
    if (!t) return <HmsEmpty>{bank.length ? 'Select a bank line from the list to see its details.' : 'No bank statement lines have been imported.'}</HmsEmpty>;
    const suggestions = found[t.id] ?? t.suggested_matches ?? [];
    const open = isBankOpen(t);
    return (
      <>
        <HmsDetailHeader icon={Landmark} title={t.narration || 'Bank line'} badge={<StatusBadge status={t.match_status} />} subtitle={`${fmtDate(t.txn_date)} · Ref ${t.bank_reference || '—'}`} />
        <HmsStatStrip
          items={[
            { label: 'Amount', value: signed(t), note: t.direction === 'credit' ? 'Money in' : 'Money out' },
            { label: 'Type', value: humanize(t.type) },
            { label: 'Value date', value: fmtDate(t.value_date) },
            { label: 'Suggestions', value: suggestions.length },
          ]}
        />
        <HmsDetailBody>
          {t.match_status === 'matched' && <HmsNotice tone="green">Matched to a ledger entry.</HmsNotice>}
          {t.match_status === 'for_review' && <HmsNotice tone="amber">Flagged for supervisor review.</HmsNotice>}
          <HmsSection
            title="Suggested matches"
            right={
              open ? (
                <HmsButton size="sm" icon={Search} disabled={!!busy} onClick={() => findMatches(t)}>
                  Find matches
                </HmsButton>
              ) : undefined
            }
          >
            {suggestions.length ? (
              suggestions.map((s, idx) => (
                <HmsRow
                  key={`${s.matched_type}-${s.matched_id}`}
                  last={idx === suggestions.length - 1}
                  label={s.reference_no || s.matched_id}
                  hint={`${humanize(s.matched_type)} · ${fmtDate(s.date)} · ${inr2(s.amount)}${num(s.difference) ? ` · differs by ${inr2(s.difference)}` : ''}`}
                  value={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <HmsBadge tone={s.confidence >= 90 ? 'green' : s.confidence >= 80 ? 'blue' : 'amber'}>{s.confidence}%</HmsBadge>
                      {open && (
                        <HmsButton
                          size="sm"
                          variant="primary"
                          icon={Link2}
                          disabled={!!busy}
                          onClick={() =>
                            run(
                              `match-${s.matched_id}`,
                              () => accountsService.matchBankTransaction({ bank_transaction_id: t.id, matched_type: s.matched_type, matched_id: s.matched_id, confidence: s.confidence, method: 'suggested' }),
                              `Match proposed for ${s.reference_no || 'this line'} — sent for supervisor check`,
                              'Could not match this line'
                            )
                          }
                        >
                          Match
                        </HmsButton>
                      )}
                    </span>
                  }
                />
              ))
            ) : (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>
                {open ? 'No suggestions yet. Use Find matches to search receipts within ±3 days of this line.' : 'No suggestions recorded.'}
              </div>
            )}
          </HmsSection>
        </HmsDetailBody>
        {open && t.match_status !== 'for_review' && (
          <HmsDetailFooter>
            <HmsButton block icon={Flag} disabled={!!busy} onClick={() => run('flag', () => accountsService.flagBankTransaction(t.id), 'Line flagged for supervisor review', 'Could not flag this line')}>
              Flag for review
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="acc-bank"
      title="Bank reconciliation"
      description="Statement lines matched against receipts and payments."
      total={bank.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search narration, reference or date"
      pills={[
        { key: 'all', label: 'All', count: bank.length },
        { key: 'open', label: 'To match', count: count('open'), tone: 'amber' },
        { key: 'suggested', label: 'Suggested', count: count('suggested') },
        { key: 'review', label: 'For review', count: count('review') },
        { key: 'matched', label: 'Matched', count: count('matched') },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Bank line"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Expense requests                                                    */
/* ================================================================== */

export const ExecutiveExpensesView: React.FC<ExecutiveViewProps> = ({ data, notify, openDialog, initialFilter, initialSelect }) => {
  const { expenses } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const { busy, run } = useAction(data, notify);

  const filters: Record<string, (e: ExpenseRequestItem) => boolean> = {
    all: () => true,
    open: (e) => isMakerOpen(e.status),
    in_approval: (e) => e.status === 'in_approval',
    approved: (e) => e.status === 'approved',
    rejected: (e) => e.status === 'rejected',
  };
  const q = search.trim().toLowerCase();
  const visible = expenses.filter((e) => (filters[pill] || filters.all)(e) && matches(q, [e.reference_no, e.department_id, e.requested_by_staff, e.expense_type]));
  const count = (k: string) => expenses.filter(filters[k]).length;

  const rows: HmsListRow[] = visible.map((e) => ({
    key: e.id,
    title: humanize(e.expense_type),
    badge: <StatusBadge status={e.status} />,
    sub: (
      <>
        <Mono>{e.reference_no}</Mono> · {humanize(e.department_id)}
      </>
    ),
    metaLeft: e.requested_by_staff || '—',
    metaRight: <strong>{inr2(e.amount)}</strong>,
  }));

  const renderDetail = (key: string | null) => {
    const e = expenses.find((x) => x.id === key);
    if (!e) return <HmsEmpty>{expenses.length ? 'Select a request from the list to see its details.' : 'No expense requests yet. Raise one with Alt+N.'}</HmsEmpty>;
    const budget = num(e.budget_available_at_submit);
    const overBudget = e.status !== 'draft' && budget > 0 && num(e.amount) > budget;
    return (
      <>
        <HmsDetailHeader icon={WalletCards} title={humanize(e.expense_type)} badge={<StatusBadge status={e.status} />} subtitle={`${e.reference_no} · ${humanize(e.department_id)}`} />
        <HmsStatStrip
          items={[
            { label: 'Amount', value: inr2(e.amount) },
            { label: 'Budget at submit', value: e.status === 'draft' ? '—' : inr2(budget), tone: overBudget ? 'red' : 'default', note: e.status === 'draft' ? 'Checked on submit' : undefined },
            { label: 'Department', value: humanize(e.department_id), note: e.cost_center_code || undefined },
            { label: 'Raised', value: fmtDate(e.created_at) },
          ]}
        />
        <HmsDetailBody>
          {overBudget && <HmsNotice tone="red">The request is more than the budget that was available when it was submitted.</HmsNotice>}
          {e.status === 'returned' && <HmsNotice tone="amber">Returned by the approver. Correct it and submit again.</HmsNotice>}
          <HmsSection title="Business reason" padded>
            <div style={{ fontSize: '14px', color: e.business_reason ? HMS.text : HMS.textSecondary, lineHeight: 1.6 }}>{e.business_reason || 'No reason recorded.'}</div>
          </HmsSection>
          <HmsSection title="Request">
            <HmsRow label="Requested by" value={e.requested_by_staff || '—'} />
            <HmsRow label="Cost centre" value={e.cost_center_code || '—'} />
            <HmsRow label="Maker" value={e.maker_name || '—'} last />
          </HmsSection>
        </HmsDetailBody>
        {isMakerOpen(e.status) && (
          <HmsDetailFooter>
            <HmsButton variant="primary" block icon={Send} disabled={!!busy} onClick={() => run('submit', () => accountsService.submitExpenseRequest(e.id), `Expense ${e.reference_no} sent for approval`, 'Could not submit the expense')}>
              {busy === 'submit' ? 'Submitting…' : 'Submit for approval'}
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="acc-expenses"
      title="Expense requests"
      description="Department purchases raised within the maker limit."
      total={expenses.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search reference, department or requester"
      pills={[
        { key: 'all', label: 'All', count: expenses.length },
        { key: 'open', label: 'Drafts & returned', count: count('open'), tone: 'amber' },
        { key: 'in_approval', label: 'In approval', count: count('in_approval') },
        { key: 'approved', label: 'Approved', count: count('approved') },
        { key: 'rejected', label: 'Rejected', count: count('rejected'), tone: 'red' },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      headerAction={
        <HmsButton variant="primary" icon={Plus} onClick={() => openDialog('expense')} title="Raise expense (Alt+N)" aria-keyshortcuts="Alt+N">
          Raise expense
        </HmsButton>
      }
      detailLabel="Expense request"
      renderDetail={renderDetail}
    />
  );
};
