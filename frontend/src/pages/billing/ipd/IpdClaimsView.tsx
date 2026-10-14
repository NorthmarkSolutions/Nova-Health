// Billing · IPD & TPA desk — cashless claims.
// "preauth": requests waiting on the insurer (TAT clock, decision, query). "claims": approved → filed → settled, with enhancements and payment.
import React, { useEffect, useState } from 'react';
import { FilePlus2, Gavel, TrendingUp, Send, Banknote, ShieldCheck } from 'lucide-react';
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
  HmsTone,
  INPUT,
  TEXTAREA,
  resolveActiveKey,
} from '../../../components/hms';
import { billingService, CoPaySplitResult, TPAClaimRecord } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { CLAIM_LABEL, IpdClaim, IpdTpaData, PREAUTH_LABEL, PREAUTH_TAT_MIN, fmtAge, fmtDateTime, isPreAuthOpen, minutesSince, settlementOverdue } from './ipdTpaData';

export interface IpdClaimsViewProps {
  mode: 'preauth' | 'claims';
  data: IpdTpaData;
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
  /** One-shot request (Alt+N, header action, "Start pre-auth" on a running bill) to open the new pre-auth dialog. */
  newRequest: { admission?: string } | null;
  onNewConsumed: () => void;
}

const PREAUTH_TONE: Record<TPAClaimRecord['pre_auth_status'], HmsTone> = { PENDING: 'blue', QUERY_RAISED: 'red', APPROVED: 'green', PARTIAL: 'amber', REJECTED: 'gray' };
const CLAIM_TONE: Record<TPAClaimRecord['claim_status'], HmsTone> = { PRE_AUTH: 'blue', APPROVED: 'amber', CLAIM_FILED: 'blue', SETTLED: 'green', DENIED: 'gray' };
const PILLS = { preauth: ['open', 'pending', 'query', 'late'], claims: ['tofile', 'filed', 'overdue', 'settled', 'denied'] };
const DECISIONS: { value: TPAClaimRecord['pre_auth_status']; label: string }[] = [
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PARTIAL', label: 'Partly approved' },
  { value: 'QUERY_RAISED', label: 'Query raised' },
  { value: 'REJECTED', label: 'Rejected' },
];
const has = (q: string, values: (string | null | undefined)[]) => !q || values.some((v) => (v || '').toLowerCase().includes(q));
const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };

const Choice = <T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T | ''; onChange: (v: T) => void }) => (
  <div role="radiogroup" aria-label={label} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
    {options.map((o) => (
      <HmsButton key={o.value} role="radio" aria-checked={value === o.value} variant={value === o.value ? 'primary' : 'secondary'} onClick={() => onChange(o.value)}>
        {o.label}
      </HmsButton>
    ))}
  </div>
);

interface NewDraft {
  admission: string;
  payer: string;
  plan: string;
  policy: string;
  member: string;
  amount: string;
  error?: string;
}

export const IpdClaimsView: React.FC<IpdClaimsViewProps> = ({ mode, data, notify, initialFilter, initialSelect, newRequest, onNewConsumed }) => {
  const { format } = useCurrency();
  const money = (n: number | null | undefined) => (n === null || n === undefined ? '—' : format(n));
  const { claims, payers, admissions } = data;
  // Ages move on with every data sync (30 s), not on every render
  const now = data.lastSync ? data.lastSync.getTime() : 0;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS[mode].includes(initialFilter) ? initialFilter : PILLS[mode][0]);
  const [selected, setSelected] = useState<string | null>(initialSelect ? `c:${initialSelect}` : null);
  const [split, setSplit] = useState<Record<string, CoPaySplitResult | null>>({});
  const [busy, setBusy] = useState(false);

  const [newDraft, setNewDraft] = useState<NewDraft | null>(null);
  const [decision, setDecision] = useState<{ status: TPAClaimRecord['pre_auth_status'] | ''; amount: string; gop: string; deductibles: string; note: string; error?: string } | null>(null);
  const [enhance, setEnhance] = useState<{ amount: string; note: string; error?: string } | null>(null);
  const [fileOpen, setFileOpen] = useState<{ confirmed: boolean; error?: string } | null>(null);
  const [settle, setSettle] = useState<{ amount: string; ref: string; note: string; error?: string } | null>(null);

  const blankNew = (admission = ''): NewDraft => ({ admission, payer: '', plan: '', policy: '', member: '', amount: '' });

  // Alt+N / header action / "Start pre-auth" open the dialog once, even across a tab switch
  useEffect(() => {
    if (!newRequest || mode !== 'preauth') return;
    Promise.resolve().then(() => {
      setNewDraft(blankNew(newRequest.admission || ''));
      onNewConsumed();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newRequest]);

  const payerOf = (c: IpdClaim) => payers.find((p) => p.id === c.corporate_account);
  const waitMins = (c: IpdClaim) => minutesSince(c.updated_at, now);
  const lateDecision = (c: IpdClaim) => isPreAuthOpen(c) && c.pre_auth_status === 'PENDING' && (waitMins(c) ?? 0) > PREAUTH_TAT_MIN;

  const q = search.trim().toLowerCase();
  const base = mode === 'preauth' ? claims.filter(isPreAuthOpen) : claims.filter((c) => !isPreAuthOpen(c));
  const pillMatch = (c: IpdClaim, p: string) => {
    switch (p) {
      case 'pending':
        return c.pre_auth_status === 'PENDING';
      case 'query':
        return c.pre_auth_status === 'QUERY_RAISED';
      case 'late':
        return lateDecision(c);
      case 'tofile':
        return c.claim_status === 'APPROVED';
      case 'filed':
        return c.claim_status === 'CLAIM_FILED';
      case 'overdue':
        return settlementOverdue(c, payers, now);
      case 'settled':
        return c.claim_status === 'SETTLED';
      case 'denied':
        return c.claim_status === 'DENIED';
      default:
        return true;
    }
  };
  const visible = base.filter((c) => pillMatch(c, pill) && has(q, [c.claim_number, c.patient_name, c.patient_uhid, c.admission_number, c.corporate_account_name, c.policy_number, c.gop_letter_number]));

  const rows: HmsListRow[] = visible.map((c) => {
    const mins = waitMins(c);
    return {
      key: `c:${c.claim_number}`,
      title: c.patient_name,
      badge:
        mode === 'preauth' ? (
          <HmsBadge tone={lateDecision(c) ? 'red' : PREAUTH_TONE[c.pre_auth_status]}>{lateDecision(c) ? `Late · ${fmtAge(mins)}` : PREAUTH_LABEL[c.pre_auth_status]}</HmsBadge>
        ) : (
          <HmsBadge tone={settlementOverdue(c, payers, now) ? 'red' : CLAIM_TONE[c.claim_status]}>{settlementOverdue(c, payers, now) ? 'Payment overdue' : CLAIM_LABEL[c.claim_status]}</HmsBadge>
        ),
      sub: `${c.claim_number} · ${c.admission_number || c.patient_uhid} · ${c.corporate_account_name}`,
      metaLeft: mode === 'preauth' ? `Waiting ${fmtAge(mins)}` : c.claim_status === 'SETTLED' ? `Paid ${money(c.settled_amount)}` : `Approved ${money(c.approved_total)}`,
      metaRight: mode === 'preauth' ? `Requested ${money(c.requested_amount)}` : c.claim_status === 'SETTLED' && c.deduction_amount > 0 ? `Deducted ${money(c.deduction_amount)}` : `Requested ${money(c.requested_amount)}`,
    };
  });

  const activeKey = resolveActiveKey(rows, selected);
  const active = activeKey ? claims.find((c) => `c:${c.claim_number}` === activeKey) : undefined;
  const activeId = active?.id;
  const activeSig = active ? `${active.id}:${active.updated_at}` : '';

  // The co-pay split for the selected claim comes from the server (same engine as the final bill)
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    billingService.getTPAClaimDetail(activeId).then(
      (d) => !cancelled && setSplit((prev) => ({ ...prev, [activeId]: d.split_calculation || null })),
      () => !cancelled && setSplit((prev) => ({ ...prev, [activeId]: null }))
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSig]);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try {
      notify(await fn());
      await data.reload();
      return true;
    } catch (e) {
      notify(apiError(e, 'The server refused the change'), 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- actions ---------------- */

  const openAdmissions = admissions.filter((a) => a.status !== 'CLEARED' && !claims.some((c) => c.admission_number === a.ip && c.claim_status !== 'DENIED'));

  const saveNew = async () => {
    if (!newDraft) return;
    const d = newDraft;
    const amt = Number(d.amount);
    if (!d.admission) return setNewDraft({ ...d, error: 'Choose the admitted patient.' });
    if (!d.payer) return setNewDraft({ ...d, error: 'Choose the insurer or TPA.' });
    if (!d.policy.trim()) return setNewDraft({ ...d, error: 'Enter the policy number from the health card.' });
    if (!(amt > 0)) return setNewDraft({ ...d, error: 'Enter the estimated cost of treatment.' });
    setBusy(true);
    try {
      const c = await billingService.registerTPAClaim({ admission: d.admission, corporate_account: d.payer, plan_name: d.plan, policy_number: d.policy.trim(), tpa_member_id: d.member.trim(), requested_amount: amt } as unknown as Partial<TPAClaimRecord>);
      notify(`Pre-auth ${c.claim_number} sent for ${format(amt)}`);
      setNewDraft(null);
      setPill('open');
      setSelected(`c:${c.claim_number}`);
      await data.reload();
    } catch (e) {
      setNewDraft({ ...d, error: apiError(e, 'The pre-auth was not registered') });
    } finally {
      setBusy(false);
    }
  };

  const saveDecision = async () => {
    if (!active || !decision) return;
    const d = decision;
    if (!d.status) return setDecision({ ...d, error: 'Choose the insurer’s decision.' });
    const amt = Number(d.amount);
    if ((d.status === 'APPROVED' || d.status === 'PARTIAL') && !(amt > 0)) return setDecision({ ...d, error: 'Enter the amount the insurer approved.' });
    if ((d.status === 'APPROVED' || d.status === 'PARTIAL') && !d.gop.trim()) return setDecision({ ...d, error: 'Enter the authorisation (GOP) letter number.' });
    if ((d.status === 'QUERY_RAISED' || d.status === 'REJECTED') && !d.note.trim()) return setDecision({ ...d, error: d.status === 'REJECTED' ? 'Enter the insurer’s reason for rejecting.' : 'Describe what the insurer asked for.' });
    const ok = await run(async () => {
      await billingService.updateTPAPreAuth(active.id, {
        status: d.status,
        approved_amount: d.status === 'APPROVED' || d.status === 'PARTIAL' ? amt : undefined,
        gop_letter_number: d.gop.trim() || undefined,
        non_medical_deductibles: d.deductibles.trim() ? Number(d.deductibles) : undefined,
        denial_reason: d.status === 'REJECTED' ? d.note.trim() : undefined,
        note: d.note.trim() ? `${PREAUTH_LABEL[d.status as TPAClaimRecord['pre_auth_status']]}: ${d.note.trim()}` : undefined,
      });
      return `${active.claim_number}: ${PREAUTH_LABEL[d.status as TPAClaimRecord['pre_auth_status']].toLowerCase()} recorded`;
    });
    if (ok) setDecision(null);
  };

  const saveEnhance = async () => {
    if (!active || !enhance) return;
    const amt = Number(enhance.amount);
    if (!(amt > 0)) return setEnhance({ ...enhance, error: 'Enter the additional amount the insurer approved.' });
    const ok = await run(async () => {
      await billingService.updateTPAPreAuth(active.id, { enhancement_amount: active.enhancement_amount + amt, note: `Enhancement approved ${format(amt)}${enhance.note.trim() ? ` · ${enhance.note.trim()}` : ''}` });
      return `Enhancement of ${format(amt)} recorded on ${active.claim_number}`;
    });
    if (ok) setEnhance(null);
  };

  const fileClaim = async () => {
    if (!active || !fileOpen) return;
    if (!fileOpen.confirmed) return setFileOpen({ ...fileOpen, error: 'Confirm the documents are attached.' });
    const ok = await run(async () => {
      const d = await billingService.compileClaimDossier(active.id);
      return `Claim ${active.claim_number} filed with ${d.charges_count ?? 0} bill lines and ${d.diagnostics_count ?? 0} reports`;
    });
    if (ok) setFileOpen(null);
  };

  const saveSettle = async () => {
    if (!active || !settle) return;
    const amt = Number(settle.amount);
    if (!(amt > 0)) return setSettle({ ...settle, error: 'Enter the amount received.' });
    if (amt > active.approved_total) return setSettle({ ...settle, error: `The insurer cannot pay more than the approved ${format(active.approved_total)}.` });
    if (!settle.ref.trim()) return setSettle({ ...settle, error: 'Enter the UTR or cheque number.' });
    const ok = await run(async () => {
      await billingService.settleTPAClaim(active.id, { settled_amount: amt, reference: settle.ref.trim(), note: settle.note.trim() });
      return `${active.claim_number} settled for ${format(amt)}`;
    });
    if (ok) setSettle(null);
  };

  /* ---------------- detail ---------------- */

  const renderDetail = () => {
    if (data.loading && !claims.length) return <HmsEmpty>Loading cashless claims…</HmsEmpty>;
    if (!active)
      return <HmsEmpty>{base.length ? 'Select a claim from the list.' : mode === 'preauth' ? 'No pre-auths are waiting on an insurer. Start one with “New pre-auth” (Alt+N).' : 'No approved or filed claims yet.'}</HmsEmpty>;
    const c = active;
    const payer = payerOf(c);
    const s = split[c.id];
    const mins = waitMins(c);
    const docs = payer?.required_docs || [];
    const notes = c.tracking_notes || [];
    const open = isPreAuthOpen(c);
    return (
      <>
        <HmsDetailHeader
          icon={ShieldCheck}
          title={`${c.claim_number} · ${c.patient_name}`}
          badge={open ? <HmsBadge tone={PREAUTH_TONE[c.pre_auth_status]}>{PREAUTH_LABEL[c.pre_auth_status]}</HmsBadge> : <HmsBadge tone={CLAIM_TONE[c.claim_status]}>{CLAIM_LABEL[c.claim_status]}</HmsBadge>}
          subtitle={`${c.corporate_account_name}${c.plan_name ? ` · ${c.plan_name}` : ''} · ${c.admission_number || 'No admission linked'} · ${c.patient_uhid}`}
        />
        <HmsStatStrip
          items={[
            { label: 'Requested', value: money(c.requested_amount), note: `Opened ${fmtDateTime(c.created_at)}` },
            { label: 'Approved', value: c.approved_total ? money(c.approved_total) : '—', note: c.enhancement_amount ? `incl. ${money(c.enhancement_amount)} enhancement` : c.gop_letter_number ? `GOP ${c.gop_letter_number}` : 'Not yet', tone: c.approved_total ? 'green' : 'default' },
            c.claim_status === 'SETTLED'
              ? { label: 'Received', value: money(c.settled_amount), note: c.deduction_amount ? `${money(c.deduction_amount)} deducted` : 'In full', tone: c.deduction_amount ? 'amber' : 'green' }
              : { label: 'Patient share (est.)', value: s ? money(s.patient_copay) : '—', note: s ? `${c.copay_percent}% co-pay · ${money(s.non_medical_deductibles)} non-medical` : 'From the co-pay engine' },
            open
              ? { label: 'Waiting', value: fmtAge(mins), note: c.pre_auth_status === 'PENDING' ? 'Insurer target 1 hour' : 'Answer the query', tone: c.pre_auth_status === 'QUERY_RAISED' || (mins ?? 0) > PREAUTH_TAT_MIN ? 'red' : 'default' }
              : { label: 'Payer pays in', value: payer?.settlement_tat_days ? `${payer.settlement_tat_days} days` : '—', note: settlementOverdue(c, payers, now) ? 'Overdue — follow up' : 'Contracted', tone: settlementOverdue(c, payers, now) ? 'red' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {c.pre_auth_status === 'QUERY_RAISED' && open && <HmsNotice tone="red">The insurer raised a query: {notes[0]?.text || 'see the timeline'}. Reply with the documents, then record their decision.</HmsNotice>}
          {c.pre_auth_status === 'PENDING' && open && (mins ?? 0) > PREAUTH_TAT_MIN && <HmsNotice tone="amber">The insurer has taken {fmtAge(mins)}, beyond the 1-hour cashless guideline. Call the TPA desk and note the call.</HmsNotice>}
          {c.claim_status === 'DENIED' && <HmsNotice tone="amber">Rejected{c.denial_reason ? `: ${c.denial_reason}` : ''}. The patient pays the bill; deposits continue as self-pay.</HmsNotice>}
          {settlementOverdue(c, payers, now) && <HmsNotice tone="red">Filed more than {payer?.settlement_tat_days} days ago with no payment. Chase {c.corporate_account_name}.</HmsNotice>}
          <HmsSection title="Policy">
            <HmsRow label="Insurer / TPA" value={c.corporate_account_name} hint={payer?.contact_phone ? `Desk ${payer.contact_phone}` : undefined} />
            <HmsRow label="Policy number" value={<span style={mono}>{c.policy_number || '—'}</span>} />
            <HmsRow label="Member ID" value={<span style={mono}>{c.tpa_member_id || '—'}</span>} />
            <HmsRow label="Room-rent cap" value={c.room_rent_cap ? `${money(c.room_rent_cap)} / day` : 'No cap'} hint="A costlier room makes the patient pay the difference on linked charges." />
            <HmsRow label="Co-pay" value={`${c.copay_percent}%`} last />
          </HmsSection>
          {s && (
            <HmsSection title="Who pays what (estimate)">
              <HmsRow label="Bill considered" value={money(s.total_bill)} />
              <HmsRow label="Non-medical items" value={`− ${money(s.non_medical_deductibles)}`} hint="Consumables and items the policy never pays" />
              <HmsRow label="Admissible" value={money(s.admissible_amount)} />
              <HmsRow label={`Co-pay ${s.copay_percent}%`} value={money(s.copay_amount)} />
              <HmsRow label="Insurer pays" value={<strong>{money(s.insurer_payable)}</strong>} />
              <HmsRow label="Patient pays" value={<strong>{money(s.patient_copay)}</strong>} hint={s.gop_shortfall > 0 ? `Includes ${money(s.gop_shortfall)} above the approved amount` : undefined} last />
            </HmsSection>
          )}
          {docs.length > 0 && (
            <HmsSection title={`${c.corporate_account_name} needs (${docs.length})`} defaultOpen={open || c.claim_status === 'APPROVED'}>
              {docs.map((d, i) => (
                <HmsRow key={d} label={d} last={i === docs.length - 1} />
              ))}
            </HmsSection>
          )}
          <HmsSection title={`Timeline (${notes.length})`}>
            {notes.length ? notes.map((n, i) => <HmsRow key={`${n.t}-${i}`} label={n.text} hint={`${n.t}${n.by ? ` · ${n.by}` : ''}`} last={i === notes.length - 1} />) : <HmsRow label="No activity yet" last />}
          </HmsSection>
        </HmsDetailBody>
        {(open || c.claim_status === 'APPROVED' || c.claim_status === 'CLAIM_FILED') && (
          <HmsDetailFooter>
            {open && (
              <HmsButton variant="primary" icon={Gavel} block onClick={() => setDecision({ status: '', amount: String(c.requested_amount || ''), gop: c.gop_letter_number || '', deductibles: '', note: '' })}>
                Record insurer decision
              </HmsButton>
            )}
            {c.claim_status === 'APPROVED' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <HmsButton icon={TrendingUp} block onClick={() => setEnhance({ amount: '', note: '' })}>
                  Record enhancement
                </HmsButton>
                <HmsButton variant="primary" icon={Send} block onClick={() => setFileOpen({ confirmed: false })}>
                  File claim
                </HmsButton>
              </div>
            )}
            {c.claim_status === 'CLAIM_FILED' && (
              <HmsButton variant="primary" icon={Banknote} block onClick={() => setSettle({ amount: String(c.approved_total || ''), ref: '', note: '' })}>
                Record payment received
              </HmsButton>
            )}
          </HmsDetailFooter>
        )}
      </>
    );
  };

  const pillDefs =
    mode === 'preauth'
      ? [
          { key: 'open', label: 'All open', count: base.length },
          { key: 'pending', label: 'Awaiting insurer', count: base.filter((c) => c.pre_auth_status === 'PENDING').length },
          { key: 'query', label: 'Query raised', count: base.filter((c) => c.pre_auth_status === 'QUERY_RAISED').length, tone: 'red' as const },
          { key: 'late', label: 'Over 1 hour', count: base.filter(lateDecision).length, tone: 'amber' as const },
        ]
      : [
          { key: 'tofile', label: 'To file', count: base.filter((c) => c.claim_status === 'APPROVED').length, tone: 'amber' as const },
          { key: 'filed', label: 'Awaiting payment', count: base.filter((c) => c.claim_status === 'CLAIM_FILED').length },
          { key: 'overdue', label: 'Overdue', count: base.filter((c) => settlementOverdue(c, payers, now)).length, tone: 'red' as const },
          { key: 'settled', label: 'Settled', count: base.filter((c) => c.claim_status === 'SETTLED').length },
          { key: 'denied', label: 'Rejected', count: base.filter((c) => c.claim_status === 'DENIED').length },
        ];

  const newPayer = newDraft ? payers.find((p) => p.id === newDraft.payer) : undefined;
  const newAdm = newDraft ? admissions.find((a) => a.ip === newDraft.admission) : undefined;

  return (
    <>
      <HmsMasterDetail
        listId={`ipd-${mode}`}
        title={mode === 'preauth' ? 'Pre-authorisations' : 'Claims & settlement'}
        description={mode === 'preauth' ? 'Cashless requests waiting on the insurer — chase anything past an hour.' : 'Approved claims to file, filed claims awaiting payment, and settled or rejected ones.'}
        total={base.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search patient, claim, policy, insurer or GOP"
        pills={pillDefs}
        activePill={pill}
        onPill={(p) => {
          setPill(p);
          setSelected(null);
        }}
        selectedKey={activeKey}
        onSelect={setSelected}
        primaryLabel="open claim"
        headerAction={
          mode === 'preauth' ? (
            <HmsButton variant="primary" icon={FilePlus2} onClick={() => setNewDraft(blankNew())} title="New pre-auth (Alt+N)" aria-keyshortcuts="Alt+N">
              New pre-auth
            </HmsButton>
          ) : undefined
        }
        detailLabel="Cashless claim"
        emptyText="No claims match this search or filter."
        renderDetail={renderDetail}
      />

      {newDraft && (
        <HmsModal
          title="New cashless pre-authorisation"
          description="Sends the estimated treatment cost to the insurer for approval. Fill it from the patient's health card and the doctor's estimate."
          onClose={() => setNewDraft(null)}
          busy={busy}
          width={640}
          footer={
            <>
              <HmsButton onClick={() => setNewDraft(null)} disabled={busy}>
                Cancel
              </HmsButton>
              <HmsButton variant="primary" icon={FilePlus2} onClick={saveNew} disabled={busy}>
                {busy ? 'Sending…' : 'Send pre-auth'}
              </HmsButton>
            </>
          }
        >
          {newDraft.error && <HmsNotice tone="red">{newDraft.error}</HmsNotice>}
          <HmsField label="Admitted patient" required hint="Patients who already have an open claim are not listed.">
            <select style={INPUT} value={newDraft.admission} onChange={(e) => setNewDraft({ ...newDraft, admission: e.target.value, error: undefined })}>
              <option value="">Choose patient…</option>
              {openAdmissions.map((a) => (
                <option key={a.ip} value={a.ip}>
                  {a.name} · {a.ip} · {a.ward}
                </option>
              ))}
            </select>
          </HmsField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <HmsField label="Insurer / TPA" required>
              <select style={INPUT} value={newDraft.payer} onChange={(e) => setNewDraft({ ...newDraft, payer: e.target.value, plan: payers.find((p) => p.id === e.target.value)?.plans_data?.[0]?.name || '', error: undefined })}>
                <option value="">Choose insurer…</option>
                {payers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </HmsField>
            <HmsField label="Plan">
              <select style={INPUT} value={newDraft.plan} onChange={(e) => setNewDraft({ ...newDraft, plan: e.target.value })} disabled={!newPayer?.plans_data?.length}>
                {(newPayer?.plans_data || []).map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
                {!newPayer?.plans_data?.length && <option value="">—</option>}
              </select>
            </HmsField>
            <HmsField label="Policy number" required>
              <input style={INPUT} value={newDraft.policy} onChange={(e) => setNewDraft({ ...newDraft, policy: e.target.value, error: undefined })} />
            </HmsField>
            <HmsField label="Member / card ID">
              <input style={INPUT} value={newDraft.member} onChange={(e) => setNewDraft({ ...newDraft, member: e.target.value })} />
            </HmsField>
          </div>
          <HmsField label="Estimated cost of treatment" required hint={newAdm && newAdm.ledger > 0 ? `Bill so far ${money(newAdm.ledger)}` : 'From the treating doctor’s estimate'}>
            <input type="number" min={0} step="1" style={INPUT} value={newDraft.amount} onChange={(e) => setNewDraft({ ...newDraft, amount: e.target.value, error: undefined })} />
          </HmsField>
          {newPayer && (
            <HmsNotice tone="blue">
              {newPayer.name}: co-pay {Number(newPayer.co_pay_percentage)}% · room-rent cap {Number(newPayer.room_rent_ceiling) ? `${money(Number(newPayer.room_rent_ceiling))}/day` : 'none'} · pays in {newPayer.settlement_tat_days ?? '—'} days
              {newPayer.required_docs?.length ? ` · needs ${newPayer.required_docs.join(', ')}` : ''}.
            </HmsNotice>
          )}
        </HmsModal>
      )}

      {decision && active && (
        <HmsModal
          title="Record the insurer’s decision"
          description={`${active.claim_number} · ${active.patient_name} · requested ${money(active.requested_amount)}`}
          onClose={() => setDecision(null)}
          busy={busy}
          width={620}
          footer={
            <>
              <HmsButton onClick={() => setDecision(null)} disabled={busy}>
                Cancel
              </HmsButton>
              <HmsButton variant={decision.status === 'REJECTED' ? 'danger' : 'primary'} icon={Gavel} onClick={saveDecision} disabled={busy || !decision.status}>
                {busy ? 'Saving…' : 'Save decision'}
              </HmsButton>
            </>
          }
        >
          {decision.error && <HmsNotice tone="red">{decision.error}</HmsNotice>}
          <HmsField label="Decision" required>
            <Choice label="Insurer decision" options={DECISIONS} value={decision.status} onChange={(v) => setDecision({ ...decision, status: v, error: undefined })} />
          </HmsField>
          {(decision.status === 'APPROVED' || decision.status === 'PARTIAL') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <HmsField label="Approved amount" required>
                <input type="number" min={0} style={INPUT} value={decision.amount} onChange={(e) => setDecision({ ...decision, amount: e.target.value, error: undefined })} />
              </HmsField>
              <HmsField label="GOP letter no." required>
                <input style={INPUT} value={decision.gop} onChange={(e) => setDecision({ ...decision, gop: e.target.value, error: undefined })} />
              </HmsField>
              <HmsField label="Non-medical items" hint="Not payable by policy">
                <input type="number" min={0} style={INPUT} value={decision.deductibles} onChange={(e) => setDecision({ ...decision, deductibles: e.target.value })} />
              </HmsField>
            </div>
          )}
          {decision.status && (
            <HmsField label={decision.status === 'REJECTED' ? 'Reason given by the insurer' : decision.status === 'QUERY_RAISED' ? 'What the insurer asked for' : 'Note'} required={decision.status === 'REJECTED' || decision.status === 'QUERY_RAISED'}>
              <textarea style={TEXTAREA} value={decision.note} onChange={(e) => setDecision({ ...decision, note: e.target.value, error: undefined })} />
            </HmsField>
          )}
          {decision.status === 'REJECTED' && <HmsNotice tone="amber">The claim closes and the stay becomes self-pay. Tell the patient's family and ask for a deposit.</HmsNotice>}
        </HmsModal>
      )}

      {enhance && active && (
        <HmsModal
          title="Record an enhancement"
          description={`${active.claim_number} · approved so far ${money(active.approved_total)}. Use when the stay costs more than first approved and the insurer extends cover.`}
          onClose={() => setEnhance(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setEnhance(null)} disabled={busy}>
                Cancel
              </HmsButton>
              <HmsButton variant="primary" icon={TrendingUp} onClick={saveEnhance} disabled={busy}>
                {busy ? 'Saving…' : 'Add to approval'}
              </HmsButton>
            </>
          }
        >
          {enhance.error && <HmsNotice tone="red">{enhance.error}</HmsNotice>}
          <HmsField label="Additional amount approved" required>
            <input type="number" min={0} style={INPUT} value={enhance.amount} onChange={(e) => setEnhance({ ...enhance, amount: e.target.value, error: undefined })} />
          </HmsField>
          <HmsField label="Note" hint="e.g. enhancement letter number">
            <input style={INPUT} value={enhance.note} onChange={(e) => setEnhance({ ...enhance, note: e.target.value })} />
          </HmsField>
          {Number(enhance.amount) > 0 && <HmsNotice tone="blue">New approved total: {money(active.approved_total + Number(enhance.amount))}.</HmsNotice>}
        </HmsModal>
      )}

      {fileOpen && active && (
        <HmsModal
          title="File the claim"
          description={`${active.claim_number} · ${active.corporate_account_name}. Packs the itemised bill, lab reports and discharge details into the claim file.`}
          onClose={() => setFileOpen(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setFileOpen(null)} disabled={busy}>
                Cancel
              </HmsButton>
              <HmsButton variant="primary" icon={Send} onClick={fileClaim} disabled={busy || !fileOpen.confirmed}>
                {busy ? 'Filing…' : 'File claim'}
              </HmsButton>
            </>
          }
        >
          {fileOpen.error && <HmsNotice tone="red">{fileOpen.error}</HmsNotice>}
          {(payerOf(active)?.required_docs || []).length > 0 && (
            <HmsSection title="Documents the payer needs">
              {(payerOf(active)?.required_docs || []).map((d, i, arr) => (
                <HmsRow key={d} label={d} last={i === arr.length - 1} />
              ))}
            </HmsSection>
          )}
          <HmsToggle showLabel checked={fileOpen.confirmed} onChange={(v) => setFileOpen({ confirmed: v })} label="The discharge summary and every document above are attached." />
        </HmsModal>
      )}

      {settle && active && (
        <HmsModal
          title="Record payment received"
          description={`${active.claim_number} · approved ${money(active.approved_total)}`}
          onClose={() => setSettle(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setSettle(null)} disabled={busy}>
                Cancel
              </HmsButton>
              <HmsButton variant="primary" icon={Banknote} onClick={saveSettle} disabled={busy}>
                {busy ? 'Saving…' : 'Mark settled'}
              </HmsButton>
            </>
          }
        >
          {settle.error && <HmsNotice tone="red">{settle.error}</HmsNotice>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <HmsField label="Amount received" required>
              <input type="number" min={0} style={INPUT} value={settle.amount} onChange={(e) => setSettle({ ...settle, amount: e.target.value, error: undefined })} />
            </HmsField>
            <HmsField label="UTR / cheque no." required>
              <input style={INPUT} value={settle.ref} onChange={(e) => setSettle({ ...settle, ref: e.target.value, error: undefined })} />
            </HmsField>
          </div>
          <HmsField label="Deduction reason" hint="What the insurer disallowed, if they paid less">
            <input style={INPUT} value={settle.note} onChange={(e) => setSettle({ ...settle, note: e.target.value })} />
          </HmsField>
          {Number(settle.amount) > 0 && Number(settle.amount) < active.approved_total && <HmsNotice tone="amber">{money(active.approved_total - Number(settle.amount))} will be booked as the insurer's deduction.</HmsNotice>}
        </HmsModal>
      )}
    </>
  );
};

