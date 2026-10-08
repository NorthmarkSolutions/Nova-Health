import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GitPullRequest, CalendarClock, Tags, Undo2, Plus, Upload, RefreshCw, Search, AlertTriangle } from 'lucide-react';
import { billingService, TariffChangeQueue, TariffChangeRow, TariffImportResult, TariffItem } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { Btn, C, Callout, Drawer, Empty, Field, KpiCard, PageHeader, PillTabs, Row, apiError, card, inputStyle, mono } from '../executive/executiveUi';
import { CHANGE_ALERT_PERCENT, MIN_JUSTIFICATION_LENGTH, MIN_NOTE_LENGTH, changeTone, csvHeaderError, diffText, tariffDecision } from './pricingMath';

const STATUS: Record<string, [string, string, string]> = {
  PENDING: ['Pending review', C.amber, C.amberSoft],
  APPROVED: ['Approved · scheduled', C.primary, C.primarySoft],
  PUBLISHED: ['Published', C.green, C.greenSoft],
  REJECTED: ['Returned', C.red, C.redSoft],
  REVISION: ['Revision requested', '#C2410C', '#FFF7ED'],
  ACTIVE: ['Active', C.green, C.greenSoft],
  SCHEDULED: ['Scheduled', C.primary, C.primarySoft],
  INACTIVE: ['Inactive', C.muted, '#F3F4F6']
};
const TONE = { new: C.primary, red: C.red, amber: C.amber, green: C.green } as const;
const DEPARTMENTS = ['OPD', 'LAB', 'RADIOLOGY', 'PHARMACY', 'OT', 'IPD', 'CARDIOLOGY', 'EMERGENCY', 'DAY_CARE', 'GENERAL'];
const today = () => new Date().toLocaleDateString('en-CA');
const dateText = (iso?: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const Chip: React.FC<{ status: string }> = ({ status }) => {
  const [label, fg, bg] = STATUS[status] || [status, C.textSub, '#F3F4F6'];
  return <span style={{ fontSize: 12, fontWeight: 500, color: fg, background: bg, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>{label}</span>;
};

type DrawerState =
  | { kind: 'review'; id: string }
  | { kind: 'service'; code: string }
  | { kind: 'add' }
  | { kind: 'import' }
  | null;

/** Phase 6 A-05 Tariff Master: departments propose, Billing reviews and publishes; every price is versioned. */
export const TariffMasterScreen: React.FC = () => {
  const { format: fmt } = useCurrency();
  const [queue, setQueue] = useState<TariffChangeQueue | null>(null);
  const [tariffs, setTariffs] = useState<TariffItem[]>([]);
  const [tab, setTab] = useState<'pending' | 'revision' | 'decided'>('pending');
  const [owner, setOwner] = useState('All');
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [q, t] = await Promise.all([billingService.getTariffChangeQueue(), billingService.getTariffs()]);
      setQueue(q);
      setTariffs(t);
      setError(null);
    } catch (err) {
      setError(apiError(err, 'Could not load the tariff.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const done = async (msg: string) => {
    setNotice(msg);
    setDrawer(null);
    await load();
  };

  const owners = useMemo(() => Array.from(new Set(tariffs.map((t) => t.owner || t.department))).sort(), [tariffs]);
  const q = search.trim().toLowerCase();
  const shownTariffs = tariffs.filter((t) => (owner === 'All' || (t.owner || t.department) === owner) && (!q || `${t.name} ${t.code}`.toLowerCase().includes(q)));
  const rows = queue?.[tab] || [];
  const k = queue?.kpis;
  const quickApprove = async (r: TariffChangeRow) => {
    try {
      const res = await billingService.decideTariffChange(r.id, { action: 'APPROVE' });
      await done(`${r.service_name}: ${res.status === 'PUBLISHED' ? 'published to the hospital tariff' : `approved, goes live ${dateText(res.effective_from)}`}.`);
    } catch (err) {
      setError(apiError(err, 'Approval failed.'));
    }
  };

  return (
    <>
      <PageHeader
        title="Tariff Master"
        subtitle="Hospital price list. Departments own their service definitions and propose price changes. Billing reviews, approves and publishes. Pending changes are not visible at billing counters."
        actions={
          <>
            <Btn onClick={load}><RefreshCw size={16} /> Refresh</Btn>
            <Btn onClick={() => setDrawer({ kind: 'import' })}><Upload size={16} /> Import CSV</Btn>
            <Btn variant="primary" onClick={() => setDrawer({ kind: 'add' })}><Plus size={16} /> Add service</Btn>
          </>
        }
      />
      {error && <div style={{ marginBottom: 12 }}><Callout tone="red">{error}</Callout></div>}
      {notice && <div style={{ marginBottom: 12 }}><Callout tone="green">{notice}</Callout></div>}
      {!!k?.pending_over_3_days && (
        <div style={{ marginBottom: 12 }}>
          <Callout tone="amber" icon={<AlertTriangle size={16} />}>{k.pending_over_3_days} change request(s) have waited 3 days or more.</Callout>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <KpiCard label="Pending changes" value={k?.pending ?? '—'} sub={`${k?.above_alert ?? 0} above ${CHANGE_ALERT_PERCENT}%`} trendColor={C.amber} icon={<GitPullRequest size={16} />} />
        <KpiCard label="Approved, not yet live" value={k?.approved_not_live ?? '—'} sub="Go live on effective date" icon={<CalendarClock size={16} />} />
        <KpiCard label="Active services" value={k?.active_services ?? '—'} sub={`${k?.owning_departments ?? 0} owning departments`} icon={<Tags size={16} />} />
        <KpiCard label="Sent back" value={k?.sent_back ?? '—'} sub="Rejected or revision requested" icon={<Undo2 size={16} />} />
      </div>

      {/* Change requests */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Pending tariff changes</span>
            <span style={{ fontSize: 12, color: C.muted }}>Submitted by owning departments</span>
          </div>
          <PillTabs
            tabs={[
              { key: 'pending', label: 'Pending', count: queue?.pending.length ?? 0 },
              { key: 'revision', label: 'Revision requested', count: queue?.revision.length ?? 0 },
              { key: 'decided', label: 'Decided', count: queue?.decided.length ?? 0 }
            ]}
            active={tab}
            onPick={(t) => setTab(t as typeof tab)}
          />
        </div>
        {queue && rows.length === 0 && <Empty text="Nothing in this list." />}
        <div style={{ overflowX: 'auto' }}>
          {rows.map((r) => {
            const tone = changeTone(r.current_price, r.proposed_price);
            return (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(190px,2fr) 110px 100px 100px minmax(140px,1.2fr) minmax(130px,1fr) 100px 150px auto', gap: 10, alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${C.border}`, minWidth: 1100, fontSize: 13 }}>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{r.service_name}</span>
                  <span style={{ fontSize: 12, color: C.muted, ...mono }}>{r.service_code} · {r.request_number}</span>
                </span>
                <span>{r.owner}</span>
                <span style={{ textAlign: 'right', ...mono }}>{r.current_price ? fmt(r.current_price) : 'New'}</span>
                <span style={{ textAlign: 'right', fontWeight: 600, ...mono }}>{fmt(r.proposed_price)}</span>
                <span style={{ color: TONE[tone], fontWeight: 500, ...mono }}>{diffText(r.current_price, r.proposed_price, fmt)}</span>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{r.requested_by}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{new Date(r.requested_at).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </span>
                <span>{dateText(r.effective_from)}</span>
                <Chip status={r.status} />
                <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  {r.status === 'PENDING' && (
                    <Btn style={{ height: 28, fontSize: 12 }} disabled={!r.can_decide || r.needs_cfo} title={r.needs_cfo ? 'Above 15%: review and confirm CFO approval' : undefined} onClick={() => quickApprove(r)}>
                      Approve
                    </Btn>
                  )}
                  <Btn variant="ghost" style={{ height: 28, fontSize: 12 }} onClick={() => setDrawer({ kind: 'review', id: r.id })}>{r.status === 'PENDING' ? 'Review' : 'View'}</Btn>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hospital tariff */}
      <div style={{ ...card }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Hospital tariff</span>
            <div style={{ position: 'relative', width: 'min(300px, 100%)' }}>
              <Search size={16} color={C.faint} style={{ position: 'absolute', left: 10, top: 11 }} />
              <input style={{ ...inputStyle, paddingLeft: 34 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Service name or code" />
            </div>
          </div>
          <PillTabs
            tabs={[{ key: 'All', label: 'All', count: tariffs.length }, ...owners.map((o) => ({ key: o, label: o, count: tariffs.filter((t) => (t.owner || t.department) === o).length }))]}
            active={owner}
            onPick={setOwner}
          />
        </div>
        {shownTariffs.length === 0 && <Empty text="No services match." />}
        <div style={{ overflowX: 'auto' }}>
          {shownTariffs.map((t) => (
            <div
              key={t.code}
              onClick={() => setDrawer({ kind: 'service', code: t.code })}
              style={{ display: 'grid', gridTemplateColumns: 'minmax(200px,2fr) 120px 110px 70px 90px minmax(160px,1.3fr) 110px', gap: 10, alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', minWidth: 900, fontSize: 13, opacity: t.is_active ? 1 : 0.6 }}
            >
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 14 }}>{t.name}</span>
                <span style={{ fontSize: 12, color: C.muted, ...mono }}>{t.code}</span>
              </span>
              <span>{t.owner || t.department}</span>
              <span style={{ textAlign: 'right', ...mono }}>{fmt(Number(t.base_price))}</span>
              <span style={{ textAlign: 'right', ...mono }}>{Number(t.gst_rate)}%</span>
              <span style={{ textAlign: 'right', ...mono }} title="Emergency markup">{Number(t.emergency_markup_percent) ? `+${Number(t.emergency_markup_percent)}%` : '—'}</span>
              <span style={{ color: C.primary, fontSize: 12 }}>
                {t.scheduled_change ? `${fmt(t.scheduled_change.base_price)} from ${dateText(t.scheduled_change.effective_from)}` : t.pending_request ? `${t.pending_request} in review` : ''}
              </span>
              <Chip status={t.status || (t.is_active ? 'ACTIVE' : 'INACTIVE')} />
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 14px', fontSize: 12, color: C.muted }}>
          Showing {shownTariffs.length} of {tariffs.length} services · open bills keep the price at the time of charge
        </div>
      </div>

      {drawer?.kind === 'review' && queue && (
        <ReviewDrawer row={[...queue.pending, ...queue.revision, ...queue.decided].find((r) => r.id === drawer.id)!} onClose={() => setDrawer(null)} onDone={done} />
      )}
      {drawer?.kind === 'service' && <ServiceDrawer code={drawer.code} onClose={() => setDrawer(null)} onDone={done} />}
      {drawer?.kind === 'add' && <AddServiceDrawer onClose={() => setDrawer(null)} onDone={done} />}
      {drawer?.kind === 'import' && <ImportDrawer onClose={() => setDrawer(null)} onDone={done} />}
    </>
  );
};

// ---------- review a department's change ----------
const ReviewDrawer: React.FC<{ row: TariffChangeRow; onClose: () => void; onDone: (msg: string) => void }> = ({ row, onClose, onDone }) => {
  const { format: fmt } = useCurrency();
  const [note, setNote] = useState('');
  const [cfo, setCfo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const state = tariffDecision(row, { note, cfoConfirmed: cfo });
  const pending = row.status === 'PENDING';

  const act = async (action: 'APPROVE' | 'REJECT' | 'REVISION') => {
    setBusy(true);
    setError(null);
    try {
      const res = await billingService.decideTariffChange(row.id, { action, note: note.trim() || undefined, cfo_confirmed: cfo || undefined });
      onDone(
        action === 'APPROVE'
          ? `${row.service_name}: ${res.status === 'PUBLISHED' ? 'published to the hospital tariff' : `approved, goes live ${dateText(res.effective_from)}`}.`
          : action === 'REJECT' ? `${row.service_name}: returned to ${row.owner}.` : `${row.service_name}: revision requested from ${row.owner}.`
      );
    } catch (err) {
      setError(apiError(err, 'Decision failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      title="Review tariff change"
      subtitle={<span style={mono}>{row.request_number} · {row.service_name}</span>}
      onClose={onClose}
      width={520}
      footer={
        pending ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            <Btn variant="danger" disabled={busy || state.rejectDisabled} onClick={() => act('REJECT')}>Reject</Btn>
            <Btn disabled={busy || state.revisionDisabled} onClick={() => act('REVISION')}>Request revision</Btn>
            <Btn variant="primary" disabled={busy || state.approveDisabled} onClick={() => act('APPROVE')}>
              {row.publishes_immediately ? 'Approve & publish' : `Approve for ${dateText(row.effective_from)}`}
            </Btn>
          </div>
        ) : (
          <Btn onClick={onClose}>Close</Btn>
        )
      }
    >
      {error && <Callout tone="red">{error}</Callout>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          ['Current', row.current_price ? fmt(row.current_price) : 'New'],
          ['Proposed', fmt(row.proposed_price)],
          ['Difference', diffText(row.current_price, row.proposed_price, fmt)]
        ].map(([l, v]) => (
          <div key={l} style={{ ...card, padding: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 12, color: C.muted }}>{l}</span>
            <span style={{ fontSize: 15, fontWeight: 600, ...mono }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Row label="Owning department" value={row.owner} />
        <Row label="Effective from" value={dateText(row.effective_from)} />
        <Row label="Requested by" value={row.requested_by} />
        <Row label="Submitted" value={new Date(row.requested_at).toLocaleString()} />
        {row.proposed_gst_rate != null && <Row label="Proposed GST" value={`${row.proposed_gst_rate}%`} />}
        {row.proposed_emergency_markup != null && <Row label="Proposed emergency markup" value={`${row.proposed_emergency_markup}%`} />}
      </div>
      <Callout tone="neutral" title="Department justification">{row.justification}</Callout>
      {row.impact_note && <Callout tone="indigo" title="Impact">{row.impact_note}</Callout>}
      {state.cfoRequired && <Callout tone="red" icon={<AlertTriangle size={16} />}>Change above {CHANGE_ALERT_PERCENT}%. Confirm with the CFO before approving.</Callout>}
      {pending ? (
        <>
          {state.cfoRequired && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <input type="checkbox" checked={cfo} onChange={(e) => setCfo(e.target.checked)} /> CFO has approved this change
            </label>
          )}
          <Field label="Note to department" hint={state.cfoRequired ? 'Record the CFO approval reference here.' : 'Required to reject or request revision.'}>
            <textarea rows={3} style={{ ...inputStyle, height: 'auto', padding: 10 }} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {state.hint && <span style={{ fontSize: 12, color: C.amber }}>{state.hint}</span>}
        </>
      ) : (
        <Callout tone={row.status === 'REJECTED' ? 'red' : row.status === 'REVISION' ? 'amber' : 'green'}>
          {STATUS[row.status]?.[0] || row.status} by {row.decided_by}{row.decided_at ? ` · ${new Date(row.decided_at).toLocaleString()}` : ''}
          {row.decision_note ? ` · ${row.decision_note}` : ''}
          {row.cfo_confirmed ? ' · CFO confirmed' : ''}
        </Callout>
      )}
    </Drawer>
  );
};

// ---------- one service: versions, admin edit, propose change ----------
const ServiceDrawer: React.FC<{ code: string; onClose: () => void; onDone: (msg: string) => void }> = ({ code, onClose, onDone }) => {
  const { format: fmt } = useCurrency();
  const [t, setT] = useState<TariffItem | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'propose'>('view');
  const [form, setForm] = useState({ price: '', gst: '', markup: '', effective: today(), justification: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    billingService.getTariff(code).then((x) => {
      setT(x);
      setForm((f) => ({ ...f, price: String(Number(x.base_price)), gst: String(Number(x.gst_rate)), markup: String(Number(x.emergency_markup_percent)) }));
    }).catch((err) => setError(apiError(err, 'Could not load the service.')));
  }, [code]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const minLen = mode === 'propose' ? MIN_JUSTIFICATION_LENGTH : MIN_NOTE_LENGTH;
  const blocker = !(parseFloat(form.price) > 0) ? 'Enter a price' : form.justification.trim().length < minLen ? `Justification of at least ${minLen} characters` : form.effective < today() ? 'Effective date cannot be in the past' : '';

  const submit = async () => {
    if (!t) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'edit') {
        await billingService.updateTariff(t.code, {
          base_price: parseFloat(form.price), gst_rate: parseFloat(form.gst) || 0, emergency_markup_percent: parseFloat(form.markup) || 0,
          effective_from: form.effective, justification: form.justification.trim()
        });
        onDone(`${t.name} revised${form.effective > today() ? `, live from ${dateText(form.effective)}` : ''}. Revision logged.`);
      } else {
        const r = await billingService.proposeTariffChange({
          service_code: t.code, proposed_price: parseFloat(form.price), effective_from: form.effective, justification: form.justification.trim(),
          proposed_gst_rate: parseFloat(form.gst) !== Number(t.gst_rate) ? parseFloat(form.gst) : undefined,
          proposed_emergency_markup: parseFloat(form.markup) !== Number(t.emergency_markup_percent) ? parseFloat(form.markup) : undefined
        });
        onDone(`${r.request_number} submitted for review. Another billing admin must approve it.`);
      }
    } catch (err) {
      setError(apiError(err, 'Save failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      title={t?.name || 'Service'}
      subtitle={<span style={mono}>{code}{t ? ` · ${t.owner || t.department}` : ''}</span>}
      onClose={onClose}
      width={520}
      footer={
        mode === 'view' ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <Btn onClick={onClose}>Close</Btn>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={() => setMode('propose')} disabled={!t || !!t.pending_request}>Propose change</Btn>
              <Btn variant="primary" onClick={() => setMode('edit')} disabled={!t}>Edit price</Btn>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: blocker ? C.amber : C.muted }}>{blocker || (mode === 'edit' ? 'Writes an immutable revision' : 'Goes to the review queue')}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={() => setMode('view')}>Back</Btn>
              <Btn variant="primary" disabled={busy || !!blocker} onClick={submit}>{mode === 'edit' ? 'Save revision' : 'Submit for review'}</Btn>
            </div>
          </div>
        )
      }
    >
      {error && <Callout tone="red">{error}</Callout>}
      {!t && !error && <Empty text="Loading…" />}
      {t && mode === 'view' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Row label="Rate" value={fmt(Number(t.base_price))} strong />
            <Row label="GST" value={`${Number(t.gst_rate)}%`} />
            <Row label="Emergency markup" value={Number(t.emergency_markup_percent) ? `+${Number(t.emergency_markup_percent)}%` : 'None'} />
            <Row label="Visible at counters" value={t.is_active ? 'Yes' : t.scheduled_change ? `No · goes live ${dateText(t.scheduled_change.effective_from)}` : 'No · inactive'} />
            {t.scheduled_change && <Row label="Approved change" value={`${fmt(t.scheduled_change.base_price)} from ${dateText(t.scheduled_change.effective_from)}`} color={C.primary} />}
            {t.pending_request && <Row label="In review" value={t.pending_request} color={C.amber} />}
          </div>
          <Callout tone="neutral">This service is defined by {t.owner || t.department}. Price changes normally arrive as department requests; direct edits by a billing admin are logged with a justification.</Callout>
          <section style={{ ...card }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 14 }}>Price history</div>
            {(t.history || []).length === 0 && <Empty text="No recorded versions (price predates versioning)." />}
            {(t.history || []).map((v, i) => (
              <div key={i} style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span>{dateText(v.effective_from)} · {v.revised_by || 'System'}{v.live ? '' : ' · scheduled'}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{v.source_label}{v.request_number ? ` · ${v.request_number}` : ''} · {v.justification}</span>
                </span>
                <span style={{ ...mono, whiteSpace: 'nowrap' }}>{v.old_base_price != null ? `${fmt(v.old_base_price)} → ` : ''}{fmt(v.new_base_price)}</span>
              </div>
            ))}
          </section>
        </>
      )}
      {t && mode !== 'view' && (
        <>
          <Callout tone={mode === 'edit' ? 'amber' : 'indigo'}>
            {mode === 'edit'
              ? 'Direct admin revision. Open bills keep their price; new charges use this price from the effective date.'
              : 'Your proposal goes to the review queue. You cannot approve your own change.'}
          </Callout>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Field label="Price (₹)"><input style={{ ...inputStyle, width: 130, ...mono }} inputMode="decimal" value={form.price} onChange={set('price')} /></Field>
            <Field label="GST (%)"><input style={{ ...inputStyle, width: 90, ...mono }} inputMode="decimal" value={form.gst} onChange={set('gst')} /></Field>
            <Field label="Emergency markup (%)"><input style={{ ...inputStyle, width: 110, ...mono }} inputMode="decimal" value={form.markup} onChange={set('markup')} /></Field>
            <Field label="Effective from"><input type="date" min={today()} style={inputStyle} value={form.effective} onChange={set('effective')} /></Field>
          </div>
          <Field label="Justification">
            <textarea rows={3} style={{ ...inputStyle, height: 'auto', padding: 10 }} value={form.justification} onChange={set('justification')} placeholder="Why the price changes" />
          </Field>
        </>
      )}
    </Drawer>
  );
};

// ---------- add a service ----------
const AddServiceDrawer: React.FC<{ onClose: () => void; onDone: (msg: string) => void }> = ({ onClose, onDone }) => {
  const [f, setF] = useState({ code: '', name: '', department: 'GENERAL', owner_department: '', price: '', gst: '0', markup: '0', effective: today(), justification: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [key]: e.target.value }));
  const blocker = !f.code.trim() || !f.name.trim() ? 'Code and name are required' : !(parseFloat(f.price) > 0) ? 'Enter a price' : f.justification.trim().length < MIN_NOTE_LENGTH ? 'Add a justification' : '';

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const t = await billingService.createTariff({
        code: f.code.trim().toUpperCase(), name: f.name.trim(), department: f.department, owner_department: f.owner_department.trim() || undefined,
        base_price: parseFloat(f.price), gst_rate: parseFloat(f.gst) || 0, emergency_markup_percent: parseFloat(f.markup) || 0,
        effective_from: f.effective, justification: f.justification.trim()
      });
      onDone(`${t.name} added${t.is_active ? '' : `; visible at counters from ${dateText(f.effective)}`}.`);
    } catch (err) {
      setError(apiError(err, 'Could not add the service.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      title="Add service"
      subtitle="New tariff code · priced from the effective date"
      onClose={onClose}
      width={500}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: blocker ? C.amber : C.muted }}>{blocker || 'Logged as a new-service version'}</span>
          <Btn variant="primary" disabled={busy || !!blocker} onClick={save}>Add service</Btn>
        </div>
      }
    >
      {error && <Callout tone="red">{error}</Callout>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Field label="Code"><input style={{ ...inputStyle, width: 150, ...mono }} value={f.code} onChange={set('code')} placeholder="LAB-BIO-021" /></Field>
        <Field label="Department">
          <select style={inputStyle} value={f.department} onChange={set('department')}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select>
        </Field>
      </div>
      <Field label="Service name"><input style={inputStyle} value={f.name} onChange={set('name')} /></Field>
      <Field label="Owning department" hint="Leave blank to derive from the department."><input style={inputStyle} value={f.owner_department} onChange={set('owner_department')} /></Field>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Field label="Price (₹)"><input style={{ ...inputStyle, width: 120, ...mono }} inputMode="decimal" value={f.price} onChange={set('price')} /></Field>
        <Field label="GST (%)"><input style={{ ...inputStyle, width: 80, ...mono }} inputMode="decimal" value={f.gst} onChange={set('gst')} /></Field>
        <Field label="Emergency markup (%)"><input style={{ ...inputStyle, width: 100, ...mono }} inputMode="decimal" value={f.markup} onChange={set('markup')} /></Field>
        <Field label="Effective from"><input type="date" min={today()} style={inputStyle} value={f.effective} onChange={set('effective')} /></Field>
      </div>
      <Field label="Justification"><textarea rows={3} style={{ ...inputStyle, height: 'auto', padding: 10 }} value={f.justification} onChange={set('justification')} /></Field>
    </Drawer>
  );
};

// ---------- CSV import ----------
const ImportDrawer: React.FC<{ onClose: () => void; onDone: (msg: string) => void }> = ({ onClose, onDone }) => {
  const { format: fmt } = useCurrency();
  const [csv, setCsv] = useState('');
  const [effective, setEffective] = useState(today());
  const [justification, setJustification] = useState('');
  const [preview, setPreview] = useState<TariffImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headerError = csvHeaderError(csv);

  const run = async (dryRun: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await billingService.importTariffs({ csv, effective_from: effective, justification: justification.trim() || undefined, dry_run: dryRun });
      if (dryRun) setPreview(res);
      else onDone(`Import applied: ${res.summary.CREATE} new, ${res.summary.UPDATE} revised${effective > today() ? `, live from ${dateText(effective)}` : ''}.`);
    } catch (err) {
      setError(apiError(err, 'Import failed.'));
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsv(await file.text());
      setPreview(null);
    }
  };

  const canApply = !!preview && preview.summary.ERROR === 0 && justification.trim().length >= MIN_NOTE_LENGTH;
  return (
    <Drawer
      title="Import tariff CSV"
      subtitle="Preview first · applies all rows or none"
      onClose={onClose}
      width={640}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: C.muted }}>
            {preview ? (preview.summary.ERROR ? 'Fix the rows with errors, then preview again' : justification.trim().length < MIN_NOTE_LENGTH ? 'Add a justification to apply' : 'Ready to apply') : 'Columns: code, name, department, base_price, gst_rate, emergency_markup_percent'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn disabled={busy || !!headerError} onClick={() => run(true)}>Preview</Btn>
            <Btn variant="primary" disabled={busy || !canApply} onClick={() => run(false)}>Apply import</Btn>
          </div>
        </div>
      }
    >
      {error && <Callout tone="red">{error}</Callout>}
      <input type="file" accept=".csv,text/csv" onChange={onFile} />
      <Field label="CSV" hint={csv ? headerError : undefined}>
        <textarea rows={7} style={{ ...inputStyle, height: 'auto', padding: 10, ...mono, fontSize: 12 }} value={csv}
          onChange={(e) => { setCsv(e.target.value); setPreview(null); }} placeholder={'code,name,department,base_price,gst_rate\nLAB-HAE-001,Complete Blood Count,LAB,380,0'} />
      </Field>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Field label="Effective from"><input type="date" min={today()} style={inputStyle} value={effective} onChange={(e) => setEffective(e.target.value)} /></Field>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Field label="Justification"><input style={inputStyle} value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="e.g. FY 2026-27 tariff revision" /></Field>
        </div>
      </div>
      {preview && (
        <section style={{ ...card }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 13, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <b>Preview</b>
            <span style={{ color: C.green }}>{preview.summary.CREATE} new</span>
            <span style={{ color: C.primary }}>{preview.summary.UPDATE} revised</span>
            <span style={{ color: C.muted }}>{preview.summary.UNCHANGED} unchanged</span>
            <span style={{ color: C.red }}>{preview.summary.ERROR} errors</span>
          </div>
          {preview.rows.map((r) => (
            <div key={r.line} style={{ display: 'grid', gridTemplateColumns: '40px 130px 1fr 90px 160px', gap: 8, padding: '8px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 12, alignItems: 'center' }}>
              <span style={{ color: C.muted }}>#{r.line}</span>
              <span style={mono}>{r.code || '—'}</span>
              <span>{r.name}{r.message ? <span style={{ color: r.action === 'ERROR' ? C.red : C.amber }}> · {r.message}</span> : ''}</span>
              <span style={{ fontWeight: 600, color: r.action === 'ERROR' ? C.red : r.action === 'CREATE' ? C.green : r.action === 'UPDATE' ? C.primary : C.muted }}>{r.action}</span>
              <span style={{ textAlign: 'right', ...mono }}>{r.old_price != null ? `${fmt(r.old_price)} → ` : ''}{r.new_price != null ? fmt(r.new_price) : ''}</span>
            </div>
          ))}
        </section>
      )}
    </Drawer>
  );
};
