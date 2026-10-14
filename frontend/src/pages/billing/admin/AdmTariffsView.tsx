// Billing · Admin — tariff master. Departments propose price changes; the Billing Admin reviews, approves (with CFO
// confirmation above 15%), and publishes. Every price is versioned. Services can also be edited directly (logged),
// added (Alt+N) or imported from CSV (preview first, all-or-nothing).
import React, { useCallback, useEffect, useState } from 'react';
import { Tags, GitPullRequest, Check, X, RotateCcw, Pencil, Send, Plus, Upload, Save } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, HmsToggle, HmsTone, INPUT, TEXTAREA } from '../../../components/hms';
import { billingService, TariffChangeRow, TariffImportResult, TariffItem } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { CHANGE_ALERT_PERCENT, MIN_JUSTIFICATION_LENGTH, MIN_NOTE_LENGTH, csvHeaderError, diffText, tariffDecision } from './pricingMath';
import { AdminDeskData, MONO, fmtDate, fmtWhen, todayIso } from './adminDeskData';

export interface AdmTariffsViewProps {
  data: AdminDeskData;
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
  newSignal: number;
}

const REQ_STATUS: Record<string, { label: string; tone: HmsTone }> = {
  PENDING: { label: 'Pending review', tone: 'amber' },
  APPROVED: { label: 'Approved · scheduled', tone: 'blue' },
  PUBLISHED: { label: 'Published', tone: 'green' },
  REJECTED: { label: 'Returned', tone: 'red' },
  REVISION: { label: 'Revision asked', tone: 'amber' },
};
const SVC_STATUS: Record<string, { label: string; tone: HmsTone }> = { ACTIVE: { label: 'Active', tone: 'green' }, SCHEDULED: { label: 'Scheduled', tone: 'blue' }, INACTIVE: { label: 'Inactive', tone: 'gray' } };
const DEPARTMENTS = ['OPD', 'LAB', 'RADIOLOGY', 'PHARMACY', 'OT', 'IPD', 'CARDIOLOGY', 'EMERGENCY', 'DAY_CARE', 'GENERAL'];
const PILLS = ['pending', 'revision', 'decided', 'services', 'inactive'];
const svcStatus = (t: TariffItem) => t.status || (t.is_active ? 'ACTIVE' : 'INACTIVE');

type Edit = { mode: 'edit' | 'propose'; t: TariffItem; price: string; gst: string; markup: string; effective: string; justification: string };

export const AdmTariffsView: React.FC<AdmTariffsViewProps> = ({ data, notify, initialFilter, initialSelect, newSignal }) => {
  const { format } = useCurrency();
  const queue = data.tariffQueue;
  const [tariffs, setTariffs] = useState<TariffItem[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : queue?.pending.length === 0 ? 'services' : 'pending');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `t:${initialSelect}` : null);
  const [detail, setDetail] = useState<TariffItem | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [cfo, setCfo] = useState<Record<string, boolean>>({});
  const [edit, setEdit] = useState<Edit | null>(null);
  const [add, setAdd] = useState<null | { code: string; name: string; department: string; owner: string; price: string; gst: string; markup: string; effective: string; justification: string }>(null);
  const [imp, setImp] = useState<null | { csv: string; effective: string; justification: string; preview: TariffImportResult | null }>(null);
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState(newSignal);

  const blankAdd = () => ({ code: '', name: '', department: 'GENERAL', owner: '', price: '', gst: '0', markup: '0', effective: todayIso(), justification: '' });
  if (newSignal !== seen) {
    setSeen(newSignal);
    setAdd(blankAdd());
  }

  const loadTariffs = useCallback(async () => {
    try {
      setTariffs(await billingService.getTariffs());
      setFailed(null);
    } catch (e) {
      setFailed(apiError(e, 'The tariff could not be loaded.'));
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadTariffs);
  }, [loadTariffs]);

  const all = tariffs || [];
  const requests: TariffChangeRow[] = [...(queue?.pending || []), ...(queue?.revision || []), ...(queue?.decided || [])];
  const q = search.trim().toLowerCase();
  const has = (vals: (string | undefined | null)[]) => !q || vals.some((v) => (v || '').toLowerCase().includes(q));

  let rows: HmsListRow[];
  if (pill === 'services' || pill === 'inactive') {
    rows = all
      .filter((t) => (pill === 'inactive' ? svcStatus(t) !== 'ACTIVE' : true) && has([t.name, t.code, t.owner, t.department]))
      .map((t) => {
        const st = SVC_STATUS[svcStatus(t)] || SVC_STATUS.ACTIVE;
        return {
          key: `t:${t.code}`,
          title: t.name,
          badge: t.pending_request ? <HmsBadge tone="amber">In review</HmsBadge> : <HmsBadge tone={st.tone}>{st.label}</HmsBadge>,
          sub: (
            <>
              <span style={MONO}>{t.code}</span> · {t.owner || t.department}
            </>
          ),
          metaLeft: `GST ${Number(t.gst_rate)}%${Number(t.emergency_markup_percent) ? ` · emergency +${Number(t.emergency_markup_percent)}%` : ''}`,
          metaRight: t.scheduled_change ? `${format(Number(t.base_price))} → ${format(t.scheduled_change.base_price)}` : format(Number(t.base_price)),
        };
      });
  } else {
    const src = pill === 'pending' ? queue?.pending || [] : pill === 'revision' ? queue?.revision || [] : queue?.decided || [];
    rows = src
      .filter((r) => has([r.service_name, r.service_code, r.request_number, r.owner, r.requested_by]))
      .map((r) => {
        const st = REQ_STATUS[r.status] || { label: r.status, tone: 'gray' as HmsTone };
        return {
          key: `r:${r.id}`,
          title: r.service_name,
          badge: r.needs_cfo && r.status === 'PENDING' ? <HmsBadge tone="red">{`Above ${CHANGE_ALERT_PERCENT}%`}</HmsBadge> : <HmsBadge tone={st.tone}>{st.label}</HmsBadge>,
          sub: (
            <>
              <span style={MONO}>{r.request_number}</span> · {r.owner} · {r.requested_by}
            </>
          ),
          metaLeft: r.status === 'PENDING' ? `Waiting ${r.age_days} day${r.age_days === 1 ? '' : 's'}` : `Effective ${fmtDate(r.effective_from)}`,
          metaRight: diffText(r.current_price, r.proposed_price, format),
        };
      });
  }

  const activeKey = rows.find((r) => r.key === selected)?.key ?? rows[0]?.key ?? null;
  const activeCode = activeKey?.startsWith('t:') ? activeKey.slice(2) : null;
  useEffect(() => {
    if (!activeCode) return;
    let stale = false;
    billingService
      .getTariff(activeCode)
      .then((t) => !stale && setDetail(t))
      .catch(() => !stale && setDetail(null));
    return () => {
      stale = true;
    };
  }, [activeCode]);

  const refreshAll = async () => {
    await Promise.all([loadTariffs(), data.reload()]);
    if (activeCode) billingService.getTariff(activeCode).then(setDetail).catch(() => setDetail(null));
  };

  const decide = async (r: TariffChangeRow, action: 'APPROVE' | 'REJECT' | 'REVISION') => {
    setBusy(true);
    try {
      const res = await billingService.decideTariffChange(r.id, { action, note: (note[r.id] || '').trim() || undefined, cfo_confirmed: cfo[r.id] || undefined });
      notify(
        action === 'APPROVE'
          ? `${r.service_name}: ${res.status === 'PUBLISHED' ? 'published to the hospital tariff' : `approved, live from ${fmtDate(res.effective_from)}`}`
          : action === 'REJECT'
            ? `${r.service_name}: returned to ${r.owner}`
            : `${r.service_name}: revision asked from ${r.owner}`
      );
      setSelected(null);
      await refreshAll();
    } catch (e) {
      notify(apiError(e, 'The decision failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async () => {
    if (!edit) return;
    const min = edit.mode === 'propose' ? MIN_JUSTIFICATION_LENGTH : MIN_NOTE_LENGTH;
    if (!(parseFloat(edit.price) > 0)) return notify('Enter a price', 'error');
    if (edit.justification.trim().length < min) return notify(`Add a justification of at least ${min} characters`, 'error');
    if (edit.effective < todayIso()) return notify('The effective date cannot be in the past', 'error');
    setBusy(true);
    try {
      if (edit.mode === 'edit') {
        await billingService.updateTariff(edit.t.code, { base_price: parseFloat(edit.price), gst_rate: parseFloat(edit.gst) || 0, emergency_markup_percent: parseFloat(edit.markup) || 0, effective_from: edit.effective, justification: edit.justification.trim() });
        notify(`${edit.t.name} revised${edit.effective > todayIso() ? `, live from ${fmtDate(edit.effective)}` : ''}`);
      } else {
        const r = await billingService.proposeTariffChange({
          service_code: edit.t.code,
          proposed_price: parseFloat(edit.price),
          effective_from: edit.effective,
          justification: edit.justification.trim(),
          proposed_gst_rate: parseFloat(edit.gst) !== Number(edit.t.gst_rate) ? parseFloat(edit.gst) : undefined,
          proposed_emergency_markup: parseFloat(edit.markup) !== Number(edit.t.emergency_markup_percent) ? parseFloat(edit.markup) : undefined,
        });
        notify(`${r.request_number} sent for review — another admin must approve it`);
      }
      setEdit(null);
      await refreshAll();
    } catch (e) {
      notify(apiError(e, 'The change could not be saved'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitAdd = async () => {
    if (!add) return;
    if (!add.code.trim() || !add.name.trim()) return notify('Code and name are required', 'error');
    if (!(parseFloat(add.price) > 0)) return notify('Enter a price', 'error');
    if (add.justification.trim().length < MIN_NOTE_LENGTH) return notify('Add a justification', 'error');
    setBusy(true);
    try {
      const t = await billingService.createTariff({
        code: add.code.trim().toUpperCase(),
        name: add.name.trim(),
        department: add.department,
        owner_department: add.owner.trim() || undefined,
        base_price: parseFloat(add.price),
        gst_rate: parseFloat(add.gst) || 0,
        emergency_markup_percent: parseFloat(add.markup) || 0,
        effective_from: add.effective,
        justification: add.justification.trim(),
      });
      notify(`${t.name} added${t.is_active ? '' : `; at counters from ${fmtDate(add.effective)}`}`);
      setAdd(null);
      setPill('services');
      setSelected(`t:${t.code}`);
      await refreshAll();
    } catch (e) {
      notify(apiError(e, 'The service could not be added'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const runImport = async (dry: boolean) => {
    if (!imp) return;
    setBusy(true);
    try {
      const res = await billingService.importTariffs({ csv: imp.csv, effective_from: imp.effective, justification: imp.justification.trim() || undefined, dry_run: dry });
      if (dry) setImp({ ...imp, preview: res });
      else {
        notify(`Import applied: ${res.summary.CREATE} new, ${res.summary.UPDATE} revised`);
        setImp(null);
        await refreshAll();
      }
    } catch (e) {
      notify(apiError(e, 'The import failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const renderRequest = (r: TariffChangeRow) => {
    const st = REQ_STATUS[r.status] || { label: r.status, tone: 'gray' as HmsTone };
    const n = note[r.id] || '';
    const state = tariffDecision(r, { note: n, cfoConfirmed: !!cfo[r.id] });
    const pending = r.status === 'PENDING';
    return (
      <>
        <HmsDetailHeader icon={GitPullRequest} title={r.service_name} badge={<HmsBadge tone={st.tone}>{st.label}</HmsBadge>} subtitle={<><span style={MONO}>{r.request_number}</span> · <span style={MONO}>{r.service_code}</span> · {r.owner}</>} />
        <HmsStatStrip
          items={[
            { label: 'Current', value: r.current_price ? format(r.current_price) : 'New' },
            { label: 'Proposed', value: format(r.proposed_price) },
            { label: 'Difference', value: r.change_percent == null ? 'New' : `${r.change_percent >= 0 ? '+' : ''}${r.change_percent}%`, note: r.current_price ? format(Math.abs(r.difference)) : 'New service', tone: r.needs_cfo ? 'red' : 'default' },
            { label: 'Effective', value: fmtDate(r.effective_from), note: r.publishes_immediately ? 'Publishes on approval' : 'Scheduled' },
          ]}
        />
        <HmsDetailBody>
          {pending && state.cfoRequired && <HmsNotice tone="red">Change above {CHANGE_ALERT_PERCENT}%. Confirm with the CFO and record the reference in the note before approving.</HmsNotice>}
          <HmsSection title="Request">
            <HmsRow label="Department justification" value={r.justification || '—'} />
            {r.impact_note && <HmsRow label="Impact" value={r.impact_note} />}
            {r.proposed_gst_rate != null && <HmsRow label="Proposed GST" value={`${r.proposed_gst_rate}%`} />}
            {r.proposed_emergency_markup != null && <HmsRow label="Proposed emergency markup" value={`${r.proposed_emergency_markup}%`} />}
            <HmsRow label="Requested" value={`${r.requested_by} · ${fmtWhen(r.requested_at)}`} last />
          </HmsSection>
          {pending ? (
            <HmsSection title="Your decision" padded>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {state.cfoRequired && <HmsToggle checked={!!cfo[r.id]} onChange={(v) => setCfo((c) => ({ ...c, [r.id]: v }))} label="The CFO has approved this change" showLabel />}
                <HmsField label="Note to the department" htmlFor="tariff-note" hint={state.cfoRequired ? 'Record the CFO approval reference.' : 'Required to return or ask for revision.'}>
                  <textarea id="tariff-note" style={TEXTAREA} value={n} onChange={(e) => setNote((x) => ({ ...x, [r.id]: e.target.value }))} />
                </HmsField>
                {state.hint && <span style={{ fontSize: '12px', color: '#b45309' }}>{state.hint}</span>}
              </div>
            </HmsSection>
          ) : (
            <HmsNotice tone={r.status === 'REJECTED' ? 'red' : r.status === 'REVISION' ? 'amber' : 'green'}>
              {st.label} by {r.decided_by || '—'}
              {r.decided_at ? ` · ${fmtWhen(r.decided_at)}` : ''}
              {r.decision_note ? ` · ${r.decision_note}` : ''}
              {r.cfo_confirmed ? ' · CFO confirmed' : ''}
            </HmsNotice>
          )}
        </HmsDetailBody>
        {pending && (
          <HmsDetailFooter>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
              <HmsButton variant="danger" icon={X} block disabled={busy || state.rejectDisabled} onClick={() => decide(r, 'REJECT')}>
                Return
              </HmsButton>
              <HmsButton icon={RotateCcw} block disabled={busy || state.revisionDisabled} onClick={() => decide(r, 'REVISION')}>
                Ask revision
              </HmsButton>
              <HmsButton variant="primary" icon={Check} block disabled={busy || state.approveDisabled} onClick={() => decide(r, 'APPROVE')}>
                {r.publishes_immediately ? 'Approve & publish' : 'Approve'}
              </HmsButton>
            </div>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  const renderService = (code: string) => {
    const base = all.find((t) => t.code === code);
    const t = detail && detail.code === code ? detail : base;
    if (!t) return <HmsEmpty>Loading the service…</HmsEmpty>;
    const st = SVC_STATUS[svcStatus(t)] || SVC_STATUS.ACTIVE;
    const history = detail?.code === code ? detail.history || [] : [];
    const open = (mode: 'edit' | 'propose') => setEdit({ mode, t, price: String(Number(t.base_price)), gst: String(Number(t.gst_rate)), markup: String(Number(t.emergency_markup_percent)), effective: todayIso(), justification: '' });
    return (
      <>
        <HmsDetailHeader icon={Tags} title={t.name} badge={<HmsBadge tone={st.tone}>{st.label}</HmsBadge>} subtitle={<><span style={MONO}>{t.code}</span> · {t.owner || t.department}</>} actions={<HmsButton icon={Pencil} onClick={() => open('edit')}>Edit price</HmsButton>} />
        <HmsStatStrip
          items={[
            { label: 'Rate', value: format(Number(t.base_price)) },
            { label: 'GST', value: `${Number(t.gst_rate)}%`, note: Number(t.gst_rate) ? 'Taxable' : 'Exempt' },
            { label: 'Emergency', value: Number(t.emergency_markup_percent) ? `+${Number(t.emergency_markup_percent)}%` : 'None', note: 'Flat markup' },
            { label: 'At counters', value: t.is_active ? 'Yes' : 'No', tone: t.is_active ? 'green' : 'amber', note: t.scheduled_change ? `Change from ${fmtDate(t.scheduled_change.effective_from)}` : undefined },
          ]}
        />
        <HmsDetailBody>
          {t.scheduled_change && <HmsNotice tone="blue">Approved change: {format(t.scheduled_change.base_price)} from {fmtDate(t.scheduled_change.effective_from)}.</HmsNotice>}
          {t.pending_request && <HmsNotice tone="amber">{t.pending_request} is in review for this service.</HmsNotice>}
          <HmsSection title={`Price history · ${history.length}`}>
            {history.length === 0 && <HmsRow label={detail?.code === code ? 'No recorded versions (the price predates versioning)' : 'Loading history…'} last />}
            {history.map((v, i) => (
              <HmsRow
                key={i}
                label={`${fmtDate(v.effective_from)} · ${v.revised_by || 'System'}${v.live ? '' : ' · scheduled'}`}
                hint={`${v.source_label}${v.request_number ? ` · ${v.request_number}` : ''} · ${v.justification}`}
                value={<span style={MONO}>{v.old_base_price != null ? `${format(v.old_base_price)} → ` : ''}{format(v.new_base_price)}</span>}
                last={i === history.length - 1}
              />
            ))}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton icon={Send} block disabled={!!t.pending_request} title={t.pending_request ? 'A change is already in review' : 'Send a change for another admin to approve'} onClick={() => open('propose')}>
            Propose a change for review
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  const renderDetail = (key: string | null) => {
    if (!queue && data.loading) return <HmsEmpty>Loading the tariff…</HmsEmpty>;
    if (!key) return <HmsEmpty>{pill === 'services' || pill === 'inactive' ? failed || 'No services in this list.' : 'Nothing in this list.'}</HmsEmpty>;
    if (key.startsWith('r:')) {
      const r = requests.find((x) => `r:${x.id}` === key);
      return r ? renderRequest(r) : <HmsEmpty>Select a request from the list.</HmsEmpty>;
    }
    return renderService(key.slice(2));
  };

  const k = queue?.kpis;
  return (
    <>
      <HmsMasterDetail
        listId="adm-tariffs"
        title="Tariff master"
        description="Department price-change requests and the hospital price list. Pending changes are not visible at counters."
        total={pill === 'services' || pill === 'inactive' ? all.length : requests.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search service, code, department or request"
        headerAction={
          <div style={{ display: 'flex', gap: '8px' }}>
            <HmsButton size="sm" icon={Upload} onClick={() => setImp({ csv: '', effective: todayIso(), justification: '', preview: null })} title="Import a tariff CSV">
              CSV
            </HmsButton>
            <HmsButton size="sm" icon={Plus} onClick={() => setAdd(blankAdd())} title="Add a service (Alt+N)" aria-keyshortcuts="Alt+N">
              Add
            </HmsButton>
          </div>
        }
        pills={[
          { key: 'pending', label: 'To review', count: queue?.pending.length ?? 0, tone: k?.above_alert ? 'red' : undefined },
          { key: 'revision', label: 'With department', count: queue?.revision.length ?? 0 },
          { key: 'decided', label: 'Decided', count: queue?.decided.length ?? 0 },
          { key: 'services', label: 'Price list', count: all.length },
          { key: 'inactive', label: 'Not live', count: all.filter((t) => svcStatus(t) !== 'ACTIVE').length },
        ]}
        activePill={pill}
        onPill={(p) => {
          setPill(p);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel={pill === 'services' || pill === 'inactive' ? 'open service' : 'review'}
        detailLabel="Tariff"
        emptyText="Nothing matches this search or filter."
        renderDetail={renderDetail}
      />

      {edit && (
        <HmsModal
          title={edit.mode === 'edit' ? `Revise ${edit.t.name}` : `Propose a change · ${edit.t.name}`}
          description={edit.mode === 'edit' ? 'Direct admin revision, logged with your justification. Open bills keep their price.' : 'Goes to the review queue. You cannot approve your own proposal.'}
          onClose={() => setEdit(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setEdit(null)}>Cancel</HmsButton>
              <HmsButton variant="primary" icon={edit.mode === 'edit' ? Save : Send} onClick={submitEdit} disabled={busy}>
                {busy ? 'Saving…' : edit.mode === 'edit' ? 'Save revision' : 'Send for review'}
              </HmsButton>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
            <HmsField label="Price" htmlFor="te-price" required>
              <input id="te-price" autoFocus style={INPUT} inputMode="decimal" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} />
            </HmsField>
            <HmsField label="Effective from" htmlFor="te-eff">
              <input id="te-eff" type="date" min={todayIso()} style={INPUT} value={edit.effective} onChange={(e) => setEdit({ ...edit, effective: e.target.value })} />
            </HmsField>
            <HmsField label="GST (%)" htmlFor="te-gst">
              <input id="te-gst" style={INPUT} inputMode="decimal" value={edit.gst} onChange={(e) => setEdit({ ...edit, gst: e.target.value })} />
            </HmsField>
            <HmsField label="Emergency markup (%)" htmlFor="te-mk">
              <input id="te-mk" style={INPUT} inputMode="decimal" value={edit.markup} onChange={(e) => setEdit({ ...edit, markup: e.target.value })} />
            </HmsField>
          </div>
          <div style={{ marginTop: '16px' }}>
            <HmsField label="Justification" htmlFor="te-just" required hint={`At least ${edit.mode === 'propose' ? MIN_JUSTIFICATION_LENGTH : MIN_NOTE_LENGTH} characters.`}>
              <textarea id="te-just" style={TEXTAREA} value={edit.justification} onChange={(e) => setEdit({ ...edit, justification: e.target.value })} placeholder="Why the price changes" />
            </HmsField>
          </div>
          {parseFloat(edit.price) > 0 && <p style={{ fontSize: '13px', color: '#475569', margin: '12px 0 0' }}>{diffText(Number(edit.t.base_price), parseFloat(edit.price), format)}</p>}
        </HmsModal>
      )}

      {add && (
        <HmsModal
          title="Add a service"
          description="New tariff code, priced from the effective date."
          onClose={() => setAdd(null)}
          busy={busy}
          width={640}
          footer={
            <>
              <HmsButton onClick={() => setAdd(null)}>Cancel</HmsButton>
              <HmsButton variant="primary" icon={Plus} onClick={submitAdd} disabled={busy}>
                {busy ? 'Adding…' : 'Add service'}
              </HmsButton>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
            <HmsField label="Code" htmlFor="ta-code" required>
              <input id="ta-code" autoFocus style={INPUT} value={add.code} onChange={(e) => setAdd({ ...add, code: e.target.value })} placeholder="LAB-BIO-021" />
            </HmsField>
            <HmsField label="Department" htmlFor="ta-dept">
              <select id="ta-dept" style={INPUT} value={add.department} onChange={(e) => setAdd({ ...add, department: e.target.value })}>
                {DEPARTMENTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </HmsField>
            <HmsField label="Service name" htmlFor="ta-name" required>
              <input id="ta-name" style={INPUT} value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} />
            </HmsField>
            <HmsField label="Owning department" htmlFor="ta-owner" hint="Blank = same as department.">
              <input id="ta-owner" style={INPUT} value={add.owner} onChange={(e) => setAdd({ ...add, owner: e.target.value })} />
            </HmsField>
            <HmsField label="Price" htmlFor="ta-price" required>
              <input id="ta-price" style={INPUT} inputMode="decimal" value={add.price} onChange={(e) => setAdd({ ...add, price: e.target.value })} />
            </HmsField>
            <HmsField label="Effective from" htmlFor="ta-eff">
              <input id="ta-eff" type="date" min={todayIso()} style={INPUT} value={add.effective} onChange={(e) => setAdd({ ...add, effective: e.target.value })} />
            </HmsField>
            <HmsField label="GST (%)" htmlFor="ta-gst">
              <input id="ta-gst" style={INPUT} inputMode="decimal" value={add.gst} onChange={(e) => setAdd({ ...add, gst: e.target.value })} />
            </HmsField>
            <HmsField label="Emergency markup (%)" htmlFor="ta-mk">
              <input id="ta-mk" style={INPUT} inputMode="decimal" value={add.markup} onChange={(e) => setAdd({ ...add, markup: e.target.value })} />
            </HmsField>
          </div>
          <div style={{ marginTop: '16px' }}>
            <HmsField label="Justification" htmlFor="ta-just" required>
              <textarea id="ta-just" style={TEXTAREA} value={add.justification} onChange={(e) => setAdd({ ...add, justification: e.target.value })} />
            </HmsField>
          </div>
        </HmsModal>
      )}

      {imp && (
        <HmsModal
          title="Import a tariff CSV"
          description="Preview first. The import applies every row or none."
          onClose={() => setImp(null)}
          busy={busy}
          width={720}
          footer={
            <>
              <HmsButton onClick={() => setImp(null)}>Cancel</HmsButton>
              <HmsButton disabled={busy || !!csvHeaderError(imp.csv)} onClick={() => runImport(true)}>
                Preview
              </HmsButton>
              <HmsButton variant="primary" icon={Upload} disabled={busy || !imp.preview || imp.preview.summary.ERROR > 0 || imp.justification.trim().length < MIN_NOTE_LENGTH} onClick={() => runImport(false)}>
                Apply import
              </HmsButton>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="file"
              accept=".csv,text/csv"
              aria-label="Choose a CSV file"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setImp({ ...imp, csv: await f.text(), preview: null });
              }}
            />
            <HmsField label="CSV" htmlFor="ti-csv" hint={imp.csv ? csvHeaderError(imp.csv) || 'Columns: code, name, department, base_price, gst_rate, emergency_markup_percent' : 'Columns: code, name, department, base_price, gst_rate, emergency_markup_percent'}>
              <textarea id="ti-csv" style={{ ...TEXTAREA, ...MONO, minHeight: '120px' }} value={imp.csv} onChange={(e) => setImp({ ...imp, csv: e.target.value, preview: null })} placeholder={'code,name,department,base_price,gst_rate\nLAB-HAE-001,Complete Blood Count,LAB,380,0'} />
            </HmsField>
            <div style={{ display: 'grid', gridTemplateColumns: '180px minmax(0, 1fr)', gap: '16px' }}>
              <HmsField label="Effective from" htmlFor="ti-eff">
                <input id="ti-eff" type="date" min={todayIso()} style={INPUT} value={imp.effective} onChange={(e) => setImp({ ...imp, effective: e.target.value })} />
              </HmsField>
              <HmsField label="Justification" htmlFor="ti-just" required>
                <input id="ti-just" style={INPUT} value={imp.justification} onChange={(e) => setImp({ ...imp, justification: e.target.value })} placeholder="e.g. FY 2026-27 tariff revision" />
              </HmsField>
            </div>
            {imp.preview && (
              <HmsSection title={`Preview · ${imp.preview.summary.CREATE} new · ${imp.preview.summary.UPDATE} revised · ${imp.preview.summary.UNCHANGED} unchanged · ${imp.preview.summary.ERROR} errors`}>
                {imp.preview.rows.map((r, i, arr) => (
                  <HmsRow
                    key={r.line}
                    label={`#${r.line} · ${r.name || r.code || '—'}`}
                    hint={r.message || r.code}
                    value={
                      <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                        <span style={MONO}>{r.old_price != null ? `${format(r.old_price)} → ` : ''}{r.new_price != null ? format(r.new_price) : ''}</span>
                        <HmsBadge tone={r.action === 'ERROR' ? 'red' : r.action === 'CREATE' ? 'green' : r.action === 'UPDATE' ? 'blue' : 'gray'}>{r.action.toLowerCase()}</HmsBadge>
                      </span>
                    }
                    last={i === arr.length - 1}
                  />
                ))}
              </HmsSection>
            )}
          </div>
        </HmsModal>
      )}
    </>
  );
};
