// Accounts Executive · compliance and trace: GST preparation, supporting documents, my requests, activity log.
import React, { useState } from 'react';
import { FileCheck, Paperclip, Send, History, ShieldCheck, ArrowRight, BadgeCheck, ExternalLink } from 'lucide-react';
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
  INPUT,
  HMS,
} from '../../../components/hms';
import { accountsService, AccountDocumentItem, ApprovalRequestItem, AuditLogItem, GSTBatchItem } from '../../../services/accountsService';
import { fmtDate, fmtDateTime, humanize, inr2, isRequestOpen, num } from './executiveData';
import { ExecutiveViewProps, MONO, useAction } from './executiveHelpers';
import { StatusBadge } from './executiveUi';

const contains = (q: string, values: (string | number | undefined | null)[]) => !q || values.some((v) => String(v ?? '').toLowerCase().includes(q));

/* ================================================================== */
/* GST preparation                                                     */
/* ================================================================== */

const gstTitle = (g: GSTBatchItem) => (g.direction === 'outward' ? 'Outward supplies (GSTR-1)' : 'Input tax credit (GSTR-3B)');

export const ExecutiveGstView: React.FC<ExecutiveViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { gst } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [gstin, setGstin] = useState('');
  const [check, setCheck] = useState<{ gstin: string; valid: boolean; state_code?: string; reason?: string } | null>(null);
  const { busy, run } = useAction(data, notify);

  const q = search.trim().toLowerCase();
  const visible = gst.filter((g) => (pill === 'all' || g.status === pill) && contains(q, [g.reference_no, g.period_from, g.period_to, gstTitle(g)]));
  const count = (s: string) => gst.filter((g) => g.status === s).length;

  const rows: HmsListRow[] = visible.map((g) => ({
    key: g.id,
    title: gstTitle(g),
    badge: <StatusBadge status={g.status} />,
    sub: (
      <>
        <span style={MONO}>{g.reference_no}</span> · {fmtDate(g.period_from)} – {fmtDate(g.period_to)}
      </>
    ),
    metaLeft: `${g.invoice_count} invoice${g.invoice_count === 1 ? '' : 's'}`,
    metaRight: <strong>{inr2(g.tax_value)}</strong>,
  }));

  const checkGstin = async () => {
    const value = gstin.trim().toUpperCase();
    if (!value) return;
    try {
      const res = await accountsService.validateGSTIN(value);
      setCheck({ gstin: value, ...res });
    } catch {
      notify('Could not check the GSTIN', 'error');
    }
  };

  const renderDetail = (key: string | null) => {
    const g = gst.find((x) => x.id === key);
    if (!g) return <HmsEmpty>{gst.length ? 'Select a batch from the list to see its details.' : 'No GST batches have been prepared.'}</HmsEmpty>;
    const lines = g.lines || [];
    return (
      <>
        <HmsDetailHeader icon={FileCheck} title={gstTitle(g)} badge={<StatusBadge status={g.status} />} subtitle={`${g.reference_no} · ${fmtDate(g.period_from)} – ${fmtDate(g.period_to)}`} />
        <HmsStatStrip
          items={[
            { label: 'Taxable value', value: inr2(g.taxable_value) },
            { label: 'Tax', value: inr2(g.tax_value) },
            { label: 'Invoices', value: g.invoice_count },
            { label: 'Lines loaded', value: lines.length },
          ]}
        />
        <HmsDetailBody>
          {g.status === 'rejected' && <HmsNotice tone="red">Rejected by the reviewer. Correct the lines and prepare the batch again.</HmsNotice>}
          <HmsSection title={`Invoice lines (${lines.length})`}>
            {lines.length ? (
              lines.map((l, idx) => (
                <HmsRow
                  key={l.id}
                  last={idx === lines.length - 1}
                  label={l.invoice_no}
                  hint={`${l.gstin || 'No GSTIN'} · HSN/SAC ${l.hsn_sac || '—'} · ${fmtDate(l.invoice_date)}`}
                  value={
                    <span style={{ textAlign: 'right' }}>
                      <strong>{inr2(l.taxable_value)}</strong>
                      <span style={{ display: 'block', fontSize: '12px', color: HMS.textSecondary }}>Tax {inr2(num(l.cgst) + num(l.sgst))}</span>
                    </span>
                  }
                />
              ))
            ) : (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>The server returned no lines for this batch.</div>
            )}
          </HmsSection>
          <HmsSection title="GSTIN check" padded>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                style={{ ...INPUT, ...MONO, fontSize: '14px', textTransform: 'uppercase' }}
                value={gstin}
                maxLength={15}
                onChange={(e) => setGstin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') checkGstin();
                }}
                placeholder="15-character GSTIN"
                aria-label="GSTIN to check"
              />
              <HmsButton icon={BadgeCheck} onClick={checkGstin} disabled={!gstin.trim()}>
                Check
              </HmsButton>
            </div>
            {check && (
              <div style={{ marginTop: '12px' }}>
                <HmsNotice tone={check.valid ? 'green' : 'red'}>
                  {check.gstin}: {check.valid ? `valid${check.state_code ? ` · state code ${check.state_code}` : ''}` : check.reason || 'not valid'}
                </HmsNotice>
              </div>
            )}
          </HmsSection>
        </HmsDetailBody>
        {g.status === 'draft' && (
          <HmsDetailFooter>
            <HmsButton variant="primary" block icon={Send} disabled={!!busy} onClick={() => run('submit', () => accountsService.submitGSTBatch(g.id), `GST batch ${g.reference_no} sent for review`, 'Could not submit the batch')}>
              {busy === 'submit' ? 'Submitting…' : 'Submit for review'}
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="acc-gst"
      title="GST preparation"
      description="Monthly GSTR-1 outward and GSTR-3B input credit batches."
      total={gst.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search reference or period"
      pills={[
        { key: 'all', label: 'All', count: gst.length },
        { key: 'draft', label: 'Draft', count: count('draft'), tone: 'amber' },
        { key: 'submitted', label: 'Submitted', count: count('submitted') },
        { key: 'approved', label: 'Approved', count: count('approved') },
        { key: 'rejected', label: 'Rejected', count: count('rejected'), tone: 'red' },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="GST batch"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Supporting documents                                                */
/* ================================================================== */

const docState = (d: AccountDocumentItem) => (d.validated ? 'validated' : d.rejection_reason ? 'rejected' : 'pending');

export const ExecutiveDocumentsView: React.FC<ExecutiveViewProps> = ({ data, initialFilter, initialSelect }) => {
  const { documents } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);

  const q = search.trim().toLowerCase();
  const visible = documents.filter((d) => (pill === 'all' || docState(d) === pill) && contains(q, [d.file_name, d.doc_type, d.entity_type, d.entity_id, d.uploaded_by_name]));
  const count = (s: string) => documents.filter((d) => docState(d) === s).length;
  const DOC_BADGE = { validated: <HmsBadge tone="green">Validated</HmsBadge>, rejected: <HmsBadge tone="red">Rejected</HmsBadge>, pending: <HmsBadge tone="amber">To validate</HmsBadge> };

  const rows: HmsListRow[] = visible.map((d) => ({
    key: d.id,
    title: d.file_name,
    badge: DOC_BADGE[docState(d)],
    sub: `${humanize(d.doc_type)} · ${humanize(d.entity_type)} ${d.entity_id}`,
    metaLeft: d.uploaded_by_name || '—',
    metaRight: fmtDate(d.created_at),
  }));

  const renderDetail = (key: string | null) => {
    const d = documents.find((x) => x.id === key);
    if (!d) return <HmsEmpty>{documents.length ? 'Select a document from the list to see its details.' : 'No supporting documents are attached to any voucher yet.'}</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={Paperclip} title={d.file_name} badge={DOC_BADGE[docState(d)]} subtitle={`${humanize(d.doc_type)} · ${humanize(d.entity_type)} ${d.entity_id}`} />
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
            <HmsRow label="File name" value={d.file_name} />
            <HmsRow label="Checksum" value={d.checksum ? <span style={MONO}>{d.checksum.slice(0, 16)}…</span> : '—'} />
            <HmsRow
              label="Location"
              value={
                d.file_url ? (
                  <a href={d.file_url} target="_blank" rel="noreferrer" style={{ color: HMS.primary, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Open <ExternalLink size={14} />
                  </a>
                ) : (
                  'No file link stored'
                )
              }
              last
            />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="acc-docs"
      title="Supporting documents"
      description="Invoices, GRNs, approval notes and bank advices attached to vouchers."
      total={documents.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search file, type or voucher"
      pills={[
        { key: 'all', label: 'All', count: documents.length },
        { key: 'pending', label: 'To validate', count: count('pending'), tone: 'amber' },
        { key: 'validated', label: 'Validated', count: count('validated') },
        { key: 'rejected', label: 'Rejected', count: count('rejected'), tone: 'red' },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Document"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* My requests                                                         */
/* ================================================================== */

const DOC_SECTION: Record<string, string> = { journal: 'journals', vendor_bill: 'bills', expense: 'expenses', expense_request: 'expenses', bank_match: 'bank', reconciliation: 'bank', gst_batch: 'gst' };

export const ExecutiveRequestsView: React.FC<ExecutiveViewProps> = ({ data, onNavigateTab, initialFilter, initialSelect }) => {
  const { requests } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);

  const filters: Record<string, (r: ApprovalRequestItem) => boolean> = {
    all: () => true,
    open: isRequestOpen,
    returned: (r) => r.status === 'returned',
    approved: (r) => r.status === 'approved',
    rejected: (r) => r.status === 'rejected' || r.status === 'withdrawn',
  };
  const q = search.trim().toLowerCase();
  const visible = requests.filter((r) => (filters[pill] || filters.all)(r) && contains(q, [r.reference_no, r.document_type, r.current_approver_role]));
  const count = (k: string) => requests.filter(filters[k]).length;

  const rows: HmsListRow[] = visible.map((r) => ({
    key: r.id,
    title: `${humanize(r.document_type)} · ${r.reference_no}`,
    badge: <StatusBadge status={r.status} />,
    sub: isRequestOpen(r) ? `With ${humanize(r.current_approver_role || r.current_level)}` : `Submitted ${fmtDate(r.submitted_at)}`,
    metaLeft: (r.risk_flags || []).length ? <HmsBadge tone="amber">{r.risk_flags.length} risk flag{r.risk_flags.length === 1 ? '' : 's'}</HmsBadge> : `${humanize(r.priority)} priority`,
    metaRight: <strong>{inr2(r.amount)}</strong>,
  }));

  const renderDetail = (key: string | null) => {
    const r = requests.find((x) => x.id === key);
    if (!r) return <HmsEmpty>{requests.length ? 'Select a request from the list to see its details.' : 'You have not submitted anything for approval yet.'}</HmsEmpty>;
    const steps = r.steps || [];
    const section = DOC_SECTION[r.document_type];
    return (
      <>
        <HmsDetailHeader icon={Send} title={r.reference_no} badge={<StatusBadge status={r.status} />} subtitle={`${humanize(r.document_type)} · submitted ${fmtDateTime(r.submitted_at)}`} />
        <HmsStatStrip
          items={[
            { label: 'Amount', value: inr2(r.amount) },
            { label: 'Current level', value: humanize(r.current_level), note: humanize(r.current_approver_role) },
            { label: 'Priority', value: humanize(r.priority), tone: r.priority === 'high' ? 'amber' : 'default' },
            { label: 'Steps', value: steps.length },
          ]}
        />
        <HmsDetailBody>
          {r.status === 'returned' && <HmsNotice tone="amber">Returned to you. Correct the document and submit it again.</HmsNotice>}
          {(r.risk_flags || []).length > 0 && (
            <HmsSection title="Risk flags" padded>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {r.risk_flags.map((f) => (
                  <HmsBadge key={f} tone="amber">
                    {humanize(f)}
                  </HmsBadge>
                ))}
              </div>
            </HmsSection>
          )}
          <HmsSection title={`Approval trail (${steps.length})`}>
            {steps.length ? (
              steps.map((s, idx) => (
                <HmsRow
                  key={s.step_no}
                  last={idx === steps.length - 1}
                  label={`${s.step_no}. ${humanize(s.level)} · ${s.actor_name || '—'}`}
                  hint={s.comment || undefined}
                  value={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <StatusBadge status={s.decision} />
                      <span style={{ fontSize: '12px', color: HMS.textSecondary }}>{fmtDateTime(s.decided_at)}</span>
                    </span>
                  }
                />
              ))
            ) : (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No decisions yet.</div>
            )}
          </HmsSection>
        </HmsDetailBody>
        {section && (
          <HmsDetailFooter>
            <HmsButton block icon={ArrowRight} onClick={() => onNavigateTab(section, r.status === 'returned' ? 'open' : undefined)}>
              Open in {humanize(section)}
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="acc-requests"
      title="My requests"
      description="Everything you submitted, and where it is in the approval chain."
      total={requests.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search reference, type or approver"
      pills={[
        { key: 'all', label: 'All', count: requests.length },
        { key: 'open', label: 'In approval', count: count('open') },
        { key: 'returned', label: 'Returned', count: count('returned'), tone: 'amber' },
        { key: 'approved', label: 'Approved', count: count('approved') },
        { key: 'rejected', label: 'Rejected', count: count('rejected'), tone: 'red' },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Approval request"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Activity log                                                        */
/* ================================================================== */

const isToday = (iso: string) => {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

export const ExecutiveActivityView: React.FC<ExecutiveViewProps> = ({ data, onOpenMaster, initialFilter, initialSelect }) => {
  const { activity, integrity } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);

  const modules = Array.from(new Set(activity.map((a) => a.module))).sort().slice(0, 4);
  const q = search.trim().toLowerCase();
  const filterFn = (a: AuditLogItem) => (pill === 'all' ? true : pill === 'today' ? isToday(a.occurred_at) : a.module === pill);
  const visible = activity.filter((a) => filterFn(a) && contains(q, [a.action, a.module, a.reference_no, a.entity_type, a.entity_id]));

  const rows: HmsListRow[] = visible.map((a) => ({
    key: a.id,
    title: `${humanize(a.action)} · ${a.reference_no || humanize(a.entity_type)}`,
    badge: <HmsBadge tone="gray">{humanize(a.module)}</HmsBadge>,
    sub: fmtDateTime(a.occurred_at),
    metaLeft: humanize(a.entity_type),
    metaRight: <span style={MONO}>{(a.entry_hash || '').slice(0, 10) || '—'}</span>,
  }));

  const renderDetail = (key: string | null) => {
    const a = activity.find((x) => x.id === key);
    if (!a) return <HmsEmpty>{activity.length ? 'Select an entry from the list to see its details.' : 'No activity recorded for you yet.'}</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={History} title={`${humanize(a.action)} · ${a.reference_no || humanize(a.entity_type)}`} badge={<HmsBadge tone="gray">{humanize(a.module)}</HmsBadge>} subtitle={`${a.actor_name} · ${humanize(a.actor_role)}`} />
        <HmsStatStrip
          items={[
            { label: 'When', value: fmtDateTime(a.occurred_at) },
            { label: 'Module', value: humanize(a.module) },
            { label: 'Record', value: humanize(a.entity_type), note: a.reference_no || a.entity_id },
            { label: 'Chain', value: integrity ? (integrity.valid ? 'Intact' : 'Broken') : '—', tone: integrity ? (integrity.valid ? 'green' : 'red') : 'default' },
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
      listId="acc-activity"
      title="Activity log"
      description="Your own actions, chained by SHA-256 so no entry can be changed later."
      total={activity.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search action, module or reference"
      pills={[
        { key: 'all', label: 'All', count: activity.length },
        { key: 'today', label: 'Today', count: activity.filter((a) => isToday(a.occurred_at)).length },
        ...modules.map((m) => ({ key: m, label: humanize(m), count: activity.filter((a) => a.module === m).length })),
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      headerAction={
        onOpenMaster ? (
          <HmsButton icon={ShieldCheck} onClick={() => onOpenMaster('audit')}>
            Hash chain
          </HmsButton>
        ) : undefined
      }
      leftExtra={
        integrity ? (
          <div style={{ padding: '0 20px 12px' }}>
            <HmsNotice tone={integrity.valid ? 'green' : 'red'}>
              {integrity.valid ? `Ledger hash chain verified · ${integrity.total_records.toLocaleString('en-IN')} records` : 'The ledger hash chain failed verification. Tell the supervisor.'}
            </HmsNotice>
          </div>
        ) : undefined
      }
      detailLabel="Audit entry"
      renderDetail={renderDetail}
    />
  );
};
