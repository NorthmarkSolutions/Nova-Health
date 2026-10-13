// Finance Controller · treasury, reporting, compliance and governance sections.
import React, { useState } from 'react';
import { Send, Landmark, FileSpreadsheet, FileCheck, ClipboardCheck, ShieldX, ShieldAlert, TriangleAlert, BookLock, ScrollText, Check, Pause, CornerUpLeft, X, Snowflake, Flag, UserCheck, Share2, CircleCheck, Wrench, Download, PenLine } from 'lucide-react';
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
  HmsTone,
  HMS,
} from '../../../components/hms';
import { accountsService, TrailEntry } from '../../../services/accountsService';
import { fmtDateTime, humanize } from '../executive/executiveData';
import { MONO } from '../executive/executiveHelpers';
import { ageL, cr, exportAuditCsv } from '../manager/managerData';
import { MgrAction, MgrActionFooter } from '../manager/ManagerActions';
import { isBatchAwaiting, isOpenException, isReconApproved, staffOf, StatementKey } from './controllerData';
import type { ControllerViewProps } from './controllerHelpers';

const has = (q: string, values: (string | number | undefined | null)[]) => !q || values.some((v) => String(v ?? '').toLowerCase().includes(q));
const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>{children}</div>;
const tone = (s: string): HmsTone =>
  /released|approved|reconciled|closed|ready|shared|filed|active|remediated|accepted/i.test(s) ? 'green' : /hold|return|gap|missing|review due|exceptions|escalat|frozen|cfo|change/i.test(s) ? 'amber' : /reject|critical|unreconciled|open|new/i.test(s) ? 'red' : 'blue';
const Tag: React.FC<{ s: string }> = ({ s }) => <HmsBadge tone={tone(s)}>{s}</HmsBadge>;

const Trail: React.FC<{ trail?: TrailEntry[] }> = ({ trail }) => (
  <HmsSection title={`Trail (${trail?.length || 0})`}>
    {trail?.length ? trail.map((t, i) => <HmsRow key={i} last={i === trail.length - 1} label={t.t} hint={t.c || undefined} value={<span style={{ fontSize: '12px', color: HMS.textSecondary }}>{`${t.who} · ${t.when}`}</span>} />) : <Muted>No actions recorded yet.</Muted>}
  </HmsSection>
);

const NotSeeded: React.FC<{ what: string }> = ({ what }) => <HmsEmpty>No {what} on the server yet.</HmsEmpty>;

/* ================================================================== */
/* Payment release                                                     */
/* ================================================================== */

export const ControllerPaymentsView: React.FC<ControllerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { batches } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'awaiting');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const filters: Record<string, (b: (typeof batches)[number]) => boolean> = {
    awaiting: isBatchAwaiting,
    blocked: (b) => isBatchAwaiting(b) && b.checks.some((c) => !c.ok),
    hold: (b) => /hold|return/i.test(b.status),
    released: (b) => /released/i.test(b.status),
    all: () => true,
  };
  const q = search.trim().toLowerCase();
  const visible = batches.filter((b) => (filters[pill] || filters.all)(b) && has(q, [b.id, b.name, b.batch_type, b.prepared_by]));
  const count = (k: string) => batches.filter(filters[k]).length;
  const rows: HmsListRow[] = visible.map((b) => {
    const failing = b.checks.filter((c) => !c.ok).length;
    return {
      key: b.id,
      title: b.name,
      badge: <Tag s={b.status} />,
      sub: (
        <>
          <span style={MONO}>{b.id}</span> · {b.batch_type} · {b.item_count} payments
        </>
      ),
      metaLeft: failing ? <HmsBadge tone="red">{failing} check{failing === 1 ? '' : 's'} failing</HmsBadge> : `Value date ${b.value_date_label || '—'}`,
      metaRight: <strong>{cr(b.total_amount)}</strong>,
    };
  });

  const renderDetail = (key: string | null) => {
    const b = batches.find((x) => x.id === key);
    if (!b) return batches.length ? <HmsEmpty>Select a batch from the list.</HmsEmpty> : <NotSeeded what="payment batches" />;
    const hardFail = b.checks.some((c) => !c.ok && c.hard);
    const failing = b.checks.filter((c) => !c.ok);
    const items = Array.isArray(b.items_summary) ? b.items_summary : b.items_summary ? [b.items_summary] : [];
    const actions: MgrAction[] = [];
    if (isBatchAwaiting(b) && /cfo/i.test(b.status)) actions.push({ key: 'cosign', label: 'Co-sign', icon: PenLine, comment: 'required', run: async (c) => (await accountsService.cosignPaymentBatch(b.id, c)).message });
    else if (isBatchAwaiting(b))
      actions.push({ key: 'release', label: 'Release payments', icon: Send, confirm: b.ack_text || 'I have reviewed every check for this batch and authorise the release.', run: async (_c, _v, acks) => (await accountsService.releasePaymentBatch(b.id, acks.includes('confirmed'))).message });
    if (isBatchAwaiting(b))
      actions.push(
        { key: 'hold', label: 'Hold', icon: Pause, comment: 'required', run: async (c) => (await accountsService.holdPaymentBatch(b.id, c)).message },
        { key: 'return', label: 'Return', icon: CornerUpLeft, comment: 'required', run: async (c) => (await accountsService.returnPaymentBatch(b.id, c)).message }
      );
    return (
      <>
        <HmsDetailHeader icon={Send} title={b.name} badge={<Tag s={b.status} />} subtitle={`${b.id} · ${b.batch_type} · prepared by ${b.prepared_by || '—'}`} />
        <HmsStatStrip
          items={[
            { label: 'Amount', value: cr(b.total_amount) },
            { label: 'Payments', value: b.item_count },
            { label: 'Checks passing', value: `${b.checks.length - failing.length}/${b.checks.length}`, tone: failing.length ? 'red' : 'green' },
            { label: 'Value date', value: b.value_date_label || '—' },
          ]}
        />
        <HmsDetailBody>
          {hardFail && <HmsNotice tone="red">A hard check is failing — the server will refuse the release until it passes.</HmsNotice>}
          <HmsSection title={`Pre-release checks (${b.checks.length})`}>
            {b.checks.length ? b.checks.map((c, i) => <HmsRow key={i} last={i === b.checks.length - 1} label={c.t} hint={c.ctl ? `Control ${c.ctl}` : undefined} value={<HmsBadge tone={c.ok ? 'green' : c.hard ? 'red' : 'amber'}>{c.ok ? 'Pass' : c.hard ? 'Blocks release' : 'Warning'}</HmsBadge>} />) : <Muted>No checks returned.</Muted>}
          </HmsSection>
          <HmsSection title="Batch">
            <HmsRow label="Approved by" value={b.approved_by || '—'} />
            <HmsRow label="Source bank" value={b.source_bank_code || '—'} last />
          </HmsSection>
          {items.length > 0 && (
            <HmsSection title={`Payments (${items.length})`}>
              {items.map((it, i) => (
                <HmsRow key={i} last={i === items.length - 1} label={it} />
              ))}
            </HmsSection>
          )}
          <Trail trail={b.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="fc-payments"
      title="Payment release"
      description="Approved payment batches — check, then release, hold or return."
      total={batches.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search batch, type or preparer"
      pills={[
        { key: 'awaiting', label: 'Awaiting release', count: count('awaiting') },
        { key: 'blocked', label: 'Checks failing', count: count('blocked'), tone: 'red' },
        { key: 'hold', label: 'Held / returned', count: count('hold'), tone: 'amber' },
        { key: 'released', label: 'Released', count: count('released') },
        { key: 'all', label: 'All', count: batches.length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Payment batch"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Bank control (reconciliations + accounts)                          */
/* ================================================================== */

export const ControllerBankView: React.FC<ControllerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { recons, accounts } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'recons');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const q = search.trim().toLowerCase();

  const reconRows: HmsListRow[] = recons
    .filter((r) => (pill === 'recons' || (pill === 'open' && !isReconApproved(r))) && has(q, [r.bank_name, r.account_no_masked, r.purpose, r.id]))
    .map((r) => ({
      key: `rec:${r.id}`,
      title: `${r.bank_name} ${r.account_no_masked}`,
      badge: <Tag s={r.status} />,
      sub: `${humanize(r.purpose)} · prepared by ${r.prepared_by || '—'}`,
      metaLeft: r.difference ? <span style={{ color: '#b91c1c' }}>Difference {cr(r.difference)}</span> : 'Balances agree',
      metaRight: <strong>{cr(r.book_balance)}</strong>,
    }));
  const accountRows: HmsListRow[] = accounts
    .filter((a) => pill === 'accounts' && has(q, [a.bank_name, a.account_no_masked, a.purpose]))
    .map((a) => ({
      key: `acc:${a.id}`,
      title: `${a.bank_name} ${a.account_no_masked}`,
      badge: <HmsBadge tone={a.frozen ? 'red' : 'green'}>{a.frozen ? 'Frozen' : 'Active'}</HmsBadge>,
      sub: humanize(a.purpose),
      metaLeft: a.book_balance !== a.statement_balance ? <span style={{ color: '#b91c1c' }}>Statement {cr(a.statement_balance)}</span> : 'Book = statement',
      metaRight: <strong>{cr(a.book_balance)}</strong>,
    }));
  const rows = pill === 'accounts' ? accountRows : reconRows;

  const renderDetail = (key: string | null) => {
    if (key?.startsWith('acc:')) {
      const a = accounts.find((x) => `acc:${x.id}` === key)!;
      return (
        <>
          <HmsDetailHeader icon={Landmark} title={`${a.bank_name} ${a.account_no_masked}`} badge={<HmsBadge tone={a.frozen ? 'red' : 'green'}>{a.frozen ? 'Frozen' : 'Active'}</HmsBadge>} subtitle={humanize(a.purpose)} />
          <HmsStatStrip
            items={[
              { label: 'Book balance', value: cr(a.book_balance) },
              { label: 'Statement balance', value: cr(a.statement_balance) },
              { label: 'Difference', value: cr(a.book_balance - a.statement_balance), tone: a.book_balance !== a.statement_balance ? 'red' : 'green' },
              { label: 'Outgoing payments', value: a.frozen ? 'Blocked' : 'Allowed', tone: a.frozen ? 'red' : 'default' },
            ]}
          />
          <HmsDetailBody>{a.frozen && <HmsNotice tone="red">Frozen{a.frozen_reason ? ` — ${a.frozen_reason}` : ''}. Payment batches from this account fail their checks.</HmsNotice>}</HmsDetailBody>
          <MgrActionFooter
            actions={[{ key: 'freeze', label: a.frozen ? 'Unfreeze account' : 'Freeze account', variant: a.frozen ? 'primary' : 'danger', icon: Snowflake, comment: 'required', run: async (c) => (await accountsService.freezeBankAccount(a.id, c)).message }]}
            notify={notify}
            reload={data.reload}
          />
        </>
      );
    }
    const r = recons.find((x) => `rec:${x.id}` === key);
    if (!r) return recons.length || accounts.length ? <HmsEmpty>Select an item from the list.</HmsEmpty> : <NotSeeded what="bank reconciliations or accounts" />;
    const actions: MgrAction[] = isReconApproved(r)
      ? []
      : [
          { key: 'approve', label: 'Approve reconciliation', icon: Check, confirm: r.ack_text || (r.difference ? `I accept the unexplained difference of ${cr(r.difference)} for now.` : 'Book and statement balances agree.'), run: async (_c, _v, acks) => (await accountsService.approveBankReconciliation(r.id, acks.includes('confirmed'))).message },
          { key: 'return', label: 'Return', icon: CornerUpLeft, comment: 'required', run: async (c) => (await accountsService.returnBankReconciliation(r.id, c)).message },
        ];
    return (
      <>
        <HmsDetailHeader icon={Landmark} title={`${r.bank_name} ${r.account_no_masked}`} badge={<Tag s={r.status} />} subtitle={`${r.id} · ${humanize(r.purpose)} · last reconciled ${r.last_reconciled || '—'}`} />
        <HmsStatStrip
          items={[
            { label: 'Book balance', value: cr(r.book_balance) },
            { label: 'Statement balance', value: cr(r.statement_balance) },
            { label: 'Difference', value: cr(r.difference), tone: r.difference ? 'red' : 'green' },
            { label: 'Prepared by', value: r.prepared_by || '—' },
          ]}
        />
        <HmsDetailBody>
          {r.difference !== 0 && <HmsNotice tone="red">Unexplained difference of {cr(r.difference)}{r.exception_ref ? ` — tracked as ${r.exception_ref}` : ''}.</HmsNotice>}
          <Trail trail={r.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="fc-bank"
      title="Bank control"
      description="Approve bank reconciliations; freeze an account to block outgoing payments."
      total={recons.length + accounts.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search bank, account or purpose"
      pills={[
        { key: 'recons', label: 'Reconciliations', count: recons.length },
        { key: 'open', label: 'Not approved', count: recons.filter((r) => !isReconApproved(r)).length, tone: 'red' },
        { key: 'accounts', label: 'Accounts', count: accounts.length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Bank control"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Financial statements                                                */
/* ================================================================== */

const ST_NAME: Record<StatementKey, string> = { pl: 'Profit & loss', bs: 'Balance sheet', cf: 'Cash flow' };

export const ControllerStatementsView: React.FC<ControllerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const [st, setSt] = useState<StatementKey>(initialFilter === 'bs' || initialFilter === 'cf' ? initialFilter : 'pl');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const s = data.statements[st];
  const lines = s?.lines || [];
  const q = search.trim().toLowerCase();
  const visible = [{ line_key: '__summary' } as { line_key: string }, ...lines].filter((l) => l.line_key === '__summary' || has(q, [(l as (typeof lines)[number]).label]));

  const rows: HmsListRow[] = visible.map((l) => {
    if (l.line_key === '__summary') return { key: '__summary', title: s ? s.name : ST_NAME[st], badge: s ? <HmsBadge tone={s.is_approved ? 'green' : 'amber'}>{s.is_approved ? 'Approved' : 'In review'}</HmsBadge> : <HmsBadge tone="gray">Not prepared</HmsBadge>, sub: s ? `${s.sub_title} · ${s.period}` : `No ${ST_NAME[st].toLowerCase()} for ${data.period}` };
    const x = l as (typeof lines)[number];
    const big = Math.abs(x.variance_pct) >= 10;
    return {
      key: x.line_key,
      title: x.label,
      badge: x.flag_exception_no ? <HmsBadge tone="red">Flagged</HmsBadge> : big ? <HmsBadge tone="amber">{`${x.variance_pct > 0 ? '+' : ''}${x.variance_pct.toFixed(1)}%`}</HmsBadge> : undefined,
      sub: `Prior ${cr(x.comparison_amount)}`,
      metaRight: <strong style={{ fontWeight: x.line_type === 't' ? 700 : 600 }}>{cr(x.current_amount)}</strong>,
    };
  });

  const tieOuts = (s?.tie_outs || []).map((t) => (Array.isArray(t) ? { check: String(t[0]), passed: !!t[1] } : (t as { check: string; passed: boolean })));

  const renderDetail = (key: string | null) => {
    if (!s) return <HmsEmpty>{data.loading ? 'Loading statements…' : `The ${ST_NAME[st].toLowerCase()} for ${data.period} has not been prepared on the server.`}</HmsEmpty>;
    const line = lines.find((l) => l.line_key === key);
    const flags = lines.filter((l) => l.flag_exception_no);
    const actions: MgrAction[] = [];
    if (line && !line.flag_exception_no) actions.push({ key: 'flag', label: 'Flag variance', icon: Flag, comment: 'required', commentHint: 'Creates an exception the preparer must answer.', run: async (c) => (await accountsService.flagStatementVariance(st, line.line_key, c)).message });
    if (!s.is_approved) actions.push({ key: 'approve', label: `Approve ${ST_NAME[st].toLowerCase()}`, variant: line ? 'secondary' : 'primary', icon: Check, confirm: `Tie-outs reviewed and the ${ST_NAME[st].toLowerCase()} for ${s.period} is approved.`, run: async (_c, _v, acks) => (await accountsService.approveFinancialStatement(st, acks.includes('confirmed'))).message });
    return (
      <>
        <HmsDetailHeader icon={FileSpreadsheet} title={line ? line.label : s.name} badge={<HmsBadge tone={s.is_approved ? 'green' : 'amber'}>{s.is_approved ? 'Approved' : 'In review'}</HmsBadge>} subtitle={`${s.name} · ${s.period}`} />
        {line && (
          <HmsStatStrip
            items={[
              { label: 'Current', value: cr(line.current_amount) },
              { label: 'Prior', value: cr(line.comparison_amount) },
              { label: 'Variance', value: `${line.variance_pct > 0 ? '+' : ''}${line.variance_pct.toFixed(1)}%`, tone: Math.abs(line.variance_pct) >= 10 ? 'amber' : 'default' },
              { label: 'Flag', value: line.flag_exception_no || '—', tone: line.flag_exception_no ? 'red' : 'default' },
            ]}
          />
        )}
        <HmsDetailBody>
          {flags.length > 0 && <HmsNotice tone="amber">{flags.length} line{flags.length === 1 ? '' : 's'} flagged: {flags.map((f) => `${f.label} (${f.flag_exception_no})`).join(', ')}.</HmsNotice>}
          <HmsSection title={`Tie-outs (${tieOuts.length})`}>
            {tieOuts.length ? tieOuts.map((t, i) => <HmsRow key={i} last={i === tieOuts.length - 1} label={t.check} value={<HmsBadge tone={t.passed ? 'green' : 'red'}>{t.passed ? 'Pass' : 'Fail'}</HmsBadge>} />) : <Muted>No tie-outs returned.</Muted>}
          </HmsSection>
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="fc-statements"
      title="Financial statements"
      description={`Validate P&L, balance sheet and cash flow for ${data.period}.`}
      total={lines.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search statement line"
      pills={(['pl', 'bs', 'cf'] as StatementKey[]).map((k) => ({ key: k, label: ST_NAME[k], count: data.statements[k]?.lines.length || 0 }))}
      activePill={st}
      onPill={(k) => setSt(k as StatementKey)}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Statement"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* GST compliance (tax returns)                                        */
/* ================================================================== */

export const ControllerGstView: React.FC<ControllerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { taxReturns } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const filters: Record<string, (r: (typeof taxReturns)[number]) => boolean> = {
    all: () => true,
    ready: (r) => r.status === 'Ready',
    exceptions: (r) => r.exceptions.length > 0 || /exception/i.test(r.status),
    approved: (r) => /approved|filed/i.test(r.status),
  };
  const q = search.trim().toLowerCase();
  const visible = taxReturns.filter((r) => (filters[pill] || filters.all)(r) && has(q, [r.form, r.period, r.id]));
  const count = (k: string) => taxReturns.filter(filters[k]).length;
  const rows: HmsListRow[] = visible.map((r) => ({ key: r.id, title: `${r.form} · ${r.period}`, badge: <Tag s={r.status} />, sub: `Due ${r.due_date} · ${r.invoice_count} invoices · ${r.prepared_by || '—'}`, metaLeft: r.exceptions.length ? <HmsBadge tone="amber">{r.exceptions.length} exceptions</HmsBadge> : undefined, metaRight: <strong>{cr(r.tax_amount)}</strong> }));

  const renderDetail = (key: string | null) => {
    const r = taxReturns.find((x) => x.id === key);
    if (!r) return taxReturns.length ? <HmsEmpty>Select a return from the list.</HmsEmpty> : <NotSeeded what="tax returns" />;
    const decided = /approved|filed|cfo/i.test(r.status);
    const actions: MgrAction[] = decided
      ? []
      : [
          { key: 'approve', label: 'Approve for filing', icon: Check, confirm: r.ack_text || `${r.form} ${r.period} is complete and correct for filing.`, run: async (_c, _v, acks) => (await accountsService.approveTaxReturn(r.id, acks.includes('confirmed'))).message },
          { key: 'return', label: 'Return', icon: CornerUpLeft, comment: 'required', run: async (c) => (await accountsService.returnTaxReturn(r.id, c)).message },
          { key: 'escalate', label: 'Escalate to CFO', icon: Send, comment: 'required', run: async (c) => (await accountsService.escalateTaxReturn(r.id, c)).message },
        ];
    return (
      <>
        <HmsDetailHeader icon={FileCheck} title={`${r.form} · ${r.period}`} badge={<Tag s={r.status} />} subtitle={`${r.id} · due ${r.due_date} · prepared by ${r.prepared_by || '—'}`} />
        <HmsStatStrip
          items={[
            { label: 'Tax', value: cr(r.tax_amount) },
            { label: 'Invoices', value: r.invoice_count },
            { label: 'Exceptions', value: r.exceptions.length, tone: r.exceptions.length ? 'amber' : 'green' },
            { label: 'Due', value: r.due_date },
          ]}
        />
        <HmsDetailBody>
          {r.exceptions.length > 0 && <HmsNotice tone="amber">{r.exceptions.join(' · ')}{r.link_exception ? ` (tracked as ${r.link_exception})` : ''}</HmsNotice>}
          <Trail trail={r.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="fc-gst"
      title="GST compliance"
      description="Approve returns for filing, return them or escalate to the CFO."
      total={taxReturns.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search form or period"
      pills={[
        { key: 'all', label: 'All', count: taxReturns.length },
        { key: 'ready', label: 'Ready', count: count('ready') },
        { key: 'exceptions', label: 'With exceptions', count: count('exceptions'), tone: 'amber' },
        { key: 'approved', label: 'Approved / filed', count: count('approved') },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Tax return"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Audit readiness (PBC requests)                                      */
/* ================================================================== */

export const ControllerAuditReadyView: React.FC<ControllerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { auditRequests } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const staff = staffOf(data);
  const filters: Record<string, (r: (typeof auditRequests)[number]) => boolean> = { all: () => true, gaps: (r) => /gap|missing/i.test(r.status), progress: (r) => /progress|requested/i.test(r.status), ready: (r) => /ready|shared/i.test(r.status) };
  const q = search.trim().toLowerCase();
  const visible = auditRequests.filter((r) => (filters[pill] || filters.all)(r) && has(q, [r.id, r.title, r.owner]));
  const count = (k: string) => auditRequests.filter(filters[k]).length;
  const rows: HmsListRow[] = visible.map((r) => ({ key: r.id, title: r.title, badge: <Tag s={r.status} />, sub: `${r.id} · ${r.owner} · due ${r.due_date}`, metaRight: `${r.evidence_files.length} files` }));
  const readyPct = auditRequests.length ? Math.round((count('ready') / auditRequests.length) * 100) : 0;

  const renderDetail = (key: string | null) => {
    const r = auditRequests.find((x) => x.id === key);
    if (!r) return auditRequests.length ? <HmsEmpty>Select a request from the list.</HmsEmpty> : <NotSeeded what="audit (PBC) requests" />;
    const actions: MgrAction[] = [];
    if (!/ready|shared/i.test(r.status)) actions.push({ key: 'ready', label: 'Mark ready', icon: Check, run: async () => (await accountsService.markAuditRequestReady(r.id)).message });
    if (/ready/i.test(r.status)) actions.push({ key: 'share', label: 'Share with auditor', icon: Share2, run: async () => (await accountsService.shareAuditRequest(r.id)).message });
    if (!/shared/i.test(r.status)) actions.push({ key: 'evidence', label: 'Request evidence', icon: UserCheck, select: { label: 'From', options: staff, current: r.owner }, run: async (_c, v) => (await accountsService.requestAuditEvidence(r.id, v)).message });
    return (
      <>
        <HmsDetailHeader icon={ClipboardCheck} title={r.title} badge={<Tag s={r.status} />} subtitle={`${r.id} · owner ${r.owner} · due ${r.due_date}`} />
        <HmsStatStrip
          items={[
            { label: 'Evidence files', value: r.evidence_files.length },
            { label: 'Owner', value: r.owner },
            { label: 'Due', value: r.due_date },
            { label: 'Overall ready', value: `${readyPct}%`, note: `${count('ready')} of ${auditRequests.length}` },
          ]}
        />
        <HmsDetailBody>
          {r.note && <HmsNotice tone="blue">{r.note}</HmsNotice>}
          <HmsSection title={`Evidence (${r.evidence_files.length})`}>
            {r.evidence_files.length ? r.evidence_files.map((f, i) => <HmsRow key={i} last={i === r.evidence_files.length - 1} label={f} />) : <Muted>No evidence attached yet.</Muted>}
          </HmsSection>
          <Trail trail={r.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="fc-auditready"
      title="Audit readiness"
      description="Prepared-by-client (PBC) requests for the statutory audit."
      total={auditRequests.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search request or owner"
      pills={[
        { key: 'all', label: 'All', count: auditRequests.length },
        { key: 'gaps', label: 'Gaps', count: count('gaps'), tone: 'red' },
        { key: 'progress', label: 'In progress', count: count('progress') },
        { key: 'ready', label: 'Ready / shared', count: count('ready') },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Audit request"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Internal controls (violations)                                      */
/* ================================================================== */

export const ControllerControlsView: React.FC<ControllerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { controls } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'open');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const staff = staffOf(data);
  const open = (v: (typeof controls)[number]) => !/closed/i.test(v.status);
  const filters: Record<string, (v: (typeof controls)[number]) => boolean> = { open, critical: (v) => open(v) && /critical|high/i.test(v.severity), closed: (v) => !open(v), all: () => true };
  const q = search.trim().toLowerCase();
  const visible = controls.filter((v) => (filters[pill] || filters.all)(v) && has(q, [v.id, v.control_name, v.title, v.who]));
  const count = (k: string) => controls.filter(filters[k]).length;
  const rows: HmsListRow[] = visible.map((v) => ({ key: v.id, title: v.title, badge: <HmsBadge tone={/critical/i.test(v.severity) ? 'red' : /high/i.test(v.severity) ? 'amber' : 'gray'}>{v.severity}</HmsBadge>, sub: `${v.id} · ${v.control_name} · ${v.who}`, metaLeft: <Tag s={v.status} />, metaRight: v.exposure_amount ? <strong>{cr(v.exposure_amount)}</strong> : undefined }));

  const renderDetail = (key: string | null) => {
    const v = controls.find((x) => x.id === key);
    if (!v) return controls.length ? <HmsEmpty>Select a violation from the list.</HmsEmpty> : <NotSeeded what="control violations" />;
    const actions: MgrAction[] = open(v)
      ? [
          { key: 'remediate', label: 'Assign remediation', icon: Wrench, select: { label: 'Owner', options: staff, current: v.owner || undefined }, comment: 'optional', run: async (c, o) => (await accountsService.actControlViolation(v.id, 'remediate', o, c)).message },
          { key: 'escalate', label: 'Escalate to CFO', icon: Send, comment: 'required', run: async (c) => (await accountsService.actControlViolation(v.id, 'escalate', undefined, c)).message },
          { key: 'close', label: 'Close', icon: CircleCheck, comment: 'required', run: async (c) => (await accountsService.actControlViolation(v.id, 'close', undefined, c)).message },
        ]
      : [];
    return (
      <>
        <HmsDetailHeader icon={ShieldX} title={v.title} badge={<Tag s={v.status} />} subtitle={`${v.id} · ${v.control_name} · detected ${v.detected_date}`} />
        <HmsStatStrip
          items={[
            { label: 'Severity', value: v.severity, tone: /critical/i.test(v.severity) ? 'red' : /high/i.test(v.severity) ? 'amber' : 'default' },
            { label: 'Exposure', value: v.exposure_amount ? cr(v.exposure_amount) : '—' },
            { label: 'User / source', value: v.who || '—' },
            { label: 'Owner', value: v.owner || 'Unassigned', tone: v.owner ? 'default' : 'amber' },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title="References">
            <HmsRow label="Records" value={v.refs || '—'} last />
          </HmsSection>
          <Trail trail={v.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="fc-controls"
      title="Internal controls"
      description="Control monitor breaches — assign remediation, escalate or close."
      total={controls.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search control, user or reference"
      pills={[
        { key: 'open', label: 'Open', count: count('open') },
        { key: 'critical', label: 'Critical / high', count: count('critical'), tone: 'red' },
        { key: 'closed', label: 'Closed', count: count('closed') },
        { key: 'all', label: 'All', count: controls.length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Control violation"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* High-risk review                                                    */
/* ================================================================== */

export const ControllerHighRiskView: React.FC<ControllerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { highRisk } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'awaiting');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const awaiting = (h: (typeof highRisk)[number]) => /awaiting/i.test(h.status);
  const filters: Record<string, (h: (typeof highRisk)[number]) => boolean> = { awaiting, high: (h) => awaiting(h) && h.risk === 'High', decided: (h) => !awaiting(h), all: () => true };
  const q = search.trim().toLowerCase();
  const visible = highRisk.filter((h) => (filters[pill] || filters.all)(h) && has(q, [h.ref, h.title, h.dept, h.kind]));
  const count = (k: string) => highRisk.filter(filters[k]).length;
  const rows: HmsListRow[] = visible.map((h) => ({ key: h.id, title: h.title, badge: <Tag s={h.status} />, sub: `${h.kind} · ${h.ref} · ${h.dept}`, metaLeft: <HmsBadge tone={h.risk === 'High' ? 'red' : h.risk === 'Medium' ? 'amber' : 'gray'}>{h.risk} risk</HmsBadge>, metaRight: <strong>{cr(h.amount)}</strong> }));

  const renderDetail = (key: string | null) => {
    const h = highRisk.find((x) => x.id === key);
    if (!h) return highRisk.length ? <HmsEmpty>Select an item from the list.</HmsEmpty> : <NotSeeded what="high-risk items" />;
    const decide = (d: 'approve' | 'return' | 'reject' | 'forward_to_cfo') => async (c: string, _v: string, acks: string[]) => (await accountsService.decideHighRiskItem(h.id, d, c, acks.includes('confirmed'))).message;
    const actions: MgrAction[] = awaiting(h)
      ? [
          { key: 'approve', label: 'Approve', icon: Check, confirm: h.ack_text || `I have reviewed the evidence for ${h.ref}.`, comment: 'optional', run: decide('approve') },
          { key: 'return', label: 'Return', icon: CornerUpLeft, comment: 'required', run: decide('return') },
          { key: 'reject', label: 'Reject', variant: 'danger', icon: X, comment: 'required', run: decide('reject') },
          { key: 'cfo', label: 'Forward to CFO', icon: Send, comment: 'required', run: decide('forward_to_cfo') },
        ]
      : [];
    return (
      <>
        <HmsDetailHeader icon={ShieldAlert} title={h.title} badge={<Tag s={h.status} />} subtitle={`${h.kind} · ${h.ref} · ${h.dept} · received ${h.recv_date}`} />
        <HmsStatStrip
          items={[
            { label: 'Amount', value: cr(h.amount) },
            { label: 'Risk', value: h.risk, tone: h.risk === 'High' ? 'red' : h.risk === 'Medium' ? 'amber' : 'default' },
            { label: 'Documents', value: h.documents.length },
            { label: 'Department', value: h.dept },
          ]}
        />
        <HmsDetailBody>
          {h.why && <HmsNotice tone="amber">Why it is here: {h.why}</HmsNotice>}
          <HmsSection title="Details">{h.key_values.length ? h.key_values.map(([k, v], i) => <HmsRow key={k} label={k} value={v} last={i === h.key_values.length - 1} />) : <Muted>No further details.</Muted>}</HmsSection>
          <HmsSection title={`Evidence (${h.documents.length})`}>{h.documents.length ? h.documents.map((d, i) => <HmsRow key={i} label={d} last={i === h.documents.length - 1} />) : <Muted>No documents attached.</Muted>}</HmsSection>
          <Trail trail={h.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="fc-highrisk"
      title="High-risk review"
      description="Journals, bills, write-offs and related-party items above the manager's authority."
      total={highRisk.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search reference, title or department"
      pills={[
        { key: 'awaiting', label: 'Awaiting you', count: count('awaiting') },
        { key: 'high', label: 'High risk', count: count('high'), tone: 'red' },
        { key: 'decided', label: 'Decided', count: count('decided') },
        { key: 'all', label: 'All', count: highRisk.length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="High-risk item"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Exception governance                                                */
/* ================================================================== */

export const ControllerExceptionsView: React.FC<ControllerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { exceptions } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'open');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const staff = staffOf(data);
  const filters: Record<string, (x: (typeof exceptions)[number]) => boolean> = { open: isOpenException, unassigned: (x) => isOpenException(x) && !x.owner, done: (x) => !isOpenException(x), all: () => true };
  const q = search.trim().toLowerCase();
  const visible = exceptions.filter((x) => (filters[pill] || filters.all)(x) && has(q, [x.id, x.ref, x.title, x.owner, x.type])).sort((a, b) => b.amt - a.amt);
  const count = (k: string) => exceptions.filter(filters[k]).length;
  const rows: HmsListRow[] = visible.map((x) => ({ key: x.id, title: x.title, badge: <Tag s={x.status} />, sub: `${x.type} · ${x.id} · ${x.ref}`, metaLeft: `${x.owner || 'Unassigned'} · ${ageL(x.age)}`, metaRight: <strong>{cr(x.amt)}</strong> }));

  const renderDetail = (key: string | null) => {
    const x = exceptions.find((e) => e.id === key);
    if (!x) return exceptions.length ? <HmsEmpty>Select an exception from the list.</HmsEmpty> : <NotSeeded what="exceptions" />;
    const act = (a: 'assign' | 'accept' | 'cfo' | 'close') => async (c: string, v: string) => (await accountsService.actControllerException(x.id, a, v, c)).message;
    const actions: MgrAction[] = isOpenException(x)
      ? [
          { key: 'close', label: 'Close', icon: CircleCheck, comment: 'required', run: act('close') },
          { key: 'assign', label: 'Assign owner', icon: UserCheck, select: { label: 'Owner', options: staff, current: x.owner || undefined }, run: act('assign') },
          { key: 'accept', label: 'Accept risk', icon: Check, comment: 'required', commentHint: 'Not allowed for Critical or High exceptions.', run: act('accept') },
          { key: 'cfo', label: 'Escalate to CFO', icon: Send, comment: 'required', run: act('cfo') },
        ]
      : [];
    return (
      <>
        <HmsDetailHeader icon={TriangleAlert} title={x.title} badge={<Tag s={x.status} />} subtitle={`${x.type} · ${x.id} · ${x.src}`} />
        <HmsStatStrip
          items={[
            { label: 'Amount', value: cr(x.amt) },
            { label: 'Owner', value: x.owner || 'Unassigned', tone: x.owner ? 'default' : 'amber' },
            { label: 'Age', value: ageL(x.age) },
            { label: 'Department', value: x.dept },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title="Exception">
            <HmsRow label="Reference" value={x.ref} />
            <HmsRow label="Raised" value={x.raised} last />
          </HmsSection>
          <Trail trail={x.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="fc-exceptions"
      title="Exception governance"
      description="Every open financial exception — close, assign, accept the risk or escalate."
      total={exceptions.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search exception, reference or owner"
      pills={[
        { key: 'open', label: 'Open', count: count('open') },
        { key: 'unassigned', label: 'Unassigned', count: count('unassigned'), tone: 'red' },
        { key: 'done', label: 'Closed / accepted', count: count('done') },
        { key: 'all', label: 'All', count: exceptions.length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Exception"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Financial policies                                                  */
/* ================================================================== */

export const ControllerPoliciesView: React.FC<ControllerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { policies } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const filters: Record<string, (p: (typeof policies)[number]) => boolean> = { all: () => true, change: (p) => !!p.change_data, due: (p) => /review due/i.test(p.status), active: (p) => /active/i.test(p.status) };
  const q = search.trim().toLowerCase();
  const visible = policies.filter((p) => (filters[pill] || filters.all)(p) && has(q, [p.id, p.name, p.owner]));
  const count = (k: string) => policies.filter(filters[k]).length;
  const rows: HmsListRow[] = visible.map((p) => ({ key: p.id, title: p.name, badge: <Tag s={p.status} />, sub: `${p.id} · v${p.version} · ${p.owner}`, metaLeft: `Next review ${p.next_review}` }));

  const renderDetail = (key: string | null) => {
    const p = policies.find((x) => x.id === key);
    if (!p) return policies.length ? <HmsEmpty>Select a policy from the list.</HmsEmpty> : <NotSeeded what="financial policies" />;
    const actions: MgrAction[] = [];
    if (p.change_data)
      actions.push(
        { key: 'approveChange', label: 'Approve change', icon: Check, comment: 'optional', run: async (c) => (await accountsService.decidePolicyChange(p.id, 'approve', c)).message },
        { key: 'rejectChange', label: 'Reject change', variant: 'danger', icon: X, comment: 'required', run: async (c) => (await accountsService.decidePolicyChange(p.id, 'reject', c)).message }
      );
    actions.push({ key: 'review', label: 'Mark reviewed', icon: BookLock, run: async () => (await accountsService.reviewPolicy(p.id)).message });
    return (
      <>
        <HmsDetailHeader icon={BookLock} title={p.name} badge={<Tag s={p.status} />} subtitle={`${p.id} · version ${p.version} · owner ${p.owner}`} />
        <HmsDetailBody>
          {p.change_data && (
            <HmsNotice tone="amber">
              Proposed change{p.change_data.by ? ` by ${p.change_data.by}` : ''}: {p.change_data.what || '—'}
              {p.change_data.why ? ` — ${p.change_data.why}` : ''}
            </HmsNotice>
          )}
          <HmsSection title="Key rules">{p.key_values.length ? p.key_values.map(([k, v], i) => <HmsRow key={k} label={k} value={v} last={i === p.key_values.length - 1} />) : <Muted>No rules recorded.</Muted>}</HmsSection>
          <Trail trail={p.trail} />
        </HmsDetailBody>
        <MgrActionFooter actions={actions} notify={notify} reload={data.reload} />
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="fc-policies"
      title="Financial policies"
      description="Policy master — review due dates and proposed changes."
      total={policies.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search policy or owner"
      pills={[
        { key: 'all', label: 'All', count: policies.length },
        { key: 'change', label: 'Change proposed', count: count('change'), tone: 'amber' },
        { key: 'due', label: 'Review due', count: count('due') },
        { key: 'active', label: 'Active', count: count('active') },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Policy"
      renderDetail={renderDetail}
    />
  );
};

/* ================================================================== */
/* Audit trail (read-only)                                             */
/* ================================================================== */

export const ControllerAuditView: React.FC<ControllerViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { audit } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'month');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [now] = useState(() => Date.now());
  const daysAgo = (iso: string) => Math.floor((now - new Date(iso).getTime()) / 86400000);
  const LIM: Record<string, number> = { today: 0, week: 6, month: 31 };
  const q = search.trim().toLowerCase();
  const visible = audit.filter((a) => daysAgo(a.occurred_at) <= (LIM[pill] ?? 31) && has(q, [a.reference_no, a.reason, a.actor_name, a.action, a.module]));
  const rows: HmsListRow[] = visible.map((a) => ({ key: a.id, title: `${humanize(a.action)} · ${a.reference_no || humanize(a.module)}`, badge: <HmsBadge tone="gray">{humanize(a.module)}</HmsBadge>, sub: `${a.actor_name} · ${humanize(a.actor_role)}`, metaLeft: fmtDateTime(a.occurred_at) }));

  const renderDetail = (key: string | null) => {
    const a = audit.find((x) => x.id === key);
    if (!a) return <HmsEmpty>{audit.length ? 'Select a record from the list.' : 'No finance activity in the last 31 days.'}</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={ScrollText} title={`${humanize(a.action)} · ${a.reference_no || humanize(a.module)}`} badge={<HmsBadge tone="gray">Read-only</HmsBadge>} subtitle={`${a.actor_name} · ${humanize(a.actor_role)} · ${fmtDateTime(a.occurred_at)}`} />
        <HmsDetailBody>
          <HmsSection title="Record">
            <HmsRow label="Module" value={humanize(a.module)} />
            <HmsRow label="Action" value={humanize(a.action)} />
            <HmsRow label="Reference" value={a.reference_no || '—'} />
            <HmsRow label="Detail" value={a.reason || '—'} last />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="fc-audit"
      title="Audit trail"
      description="Locks, releases, approvals and escalations across finance — immutable."
      total={audit.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search user, action or reference"
      pills={[
        { key: 'today', label: 'Today', count: audit.filter((a) => daysAgo(a.occurred_at) <= 0).length },
        { key: 'week', label: 'This week', count: audit.filter((a) => daysAgo(a.occurred_at) <= 6).length },
        { key: 'month', label: 'This month', count: audit.filter((a) => daysAgo(a.occurred_at) <= 31).length },
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      headerAction={
        <HmsButton
          icon={Download}
          disabled={!visible.length}
          onClick={() => {
            exportAuditCsv(visible);
            notify(`Exported ${visible.length} audit records`);
          }}
        >
          Export
        </HmsButton>
      }
      detailLabel="Audit record"
      renderDetail={renderDetail}
    />
  );
};
