// Billing · Admin — insurer and TPA contracts: co-pay, room-rent cap, tariff discount, turnaround, plans, documents,
// and how each payer is performing on claims. The admin adds (Alt+N), edits and suspends contracts; claims themselves are
// worked on the IPD & TPA desk. A co-pay calculator shows how a cashless bill splits.
import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Pencil, Plus, Power, Calculator, ArrowRight } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, INPUT } from '../../../components/hms';
import { billingService, CoPaySplitResult, CorporateAccount, TPAClaimRecord } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { MONO, fmtDate, num } from './adminDeskData';
import { AdmContractModal } from './AdmContractModal';
import { ContractDraft, contractDraft, contractPayload } from './contractDraft';

export interface AdmInsuranceViewProps {
  notify: (message: string, tone?: 'success' | 'error') => void;
  onOpenIpd: () => void;
  initialFilter?: string;
  initialSelect?: string;
  newSignal: number;
}

const PILLS = ['all', 'open', 'expiring', 'suspended'];
const OPEN_PA = ['PENDING', 'QUERY_RAISED'];
const RECEIVABLE = ['APPROVED', 'CLAIM_FILED'];

export const AdmInsuranceView: React.FC<AdmInsuranceViewProps> = ({ notify, onOpenIpd, initialFilter, initialSelect, newSignal }) => {
  const { format } = useCurrency();
  const [payers, setPayers] = useState<CorporateAccount[] | null>(null);
  const [claims, setClaims] = useState<TPAClaimRecord[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `p:${initialSelect}` : null);
  const [form, setForm] = useState<ContractDraft | null>(null);
  const [calc, setCalc] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState(newSignal);
  const [today] = useState(() => Date.now());

  if (newSignal !== seen) {
    setSeen(newSignal);
    setForm(contractDraft());
  }

  const load = useCallback(async () => {
    const [all, cl] = await Promise.allSettled([billingService.getCorporateAccounts({ type: 'TPA_INSURANCE' }), billingService.getTPAClaims()]);
    if (all.status === 'fulfilled') {
      setPayers(all.value);
      setFailed(null);
    } else setFailed(apiError(all.reason, 'Insurers could not be loaded.'));
    if (cl.status === 'fulfilled') setClaims(cl.value.claims || []);
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const list = payers || [];
  const claimsOf = (p: CorporateAccount) => claims.filter((c) => c.corporate_account === p.id);
  const expiring = (p: CorporateAccount) => !!p.valid_until && new Date(`${p.valid_until}T00:00:00`).getTime() - today < 30 * 86400000;
  const match = (p: CorporateAccount, f: string) =>
    f === 'all' ? true : f === 'suspended' ? !p.is_active : f === 'expiring' ? p.is_active && expiring(p) : p.is_active && claimsOf(p).some((c) => OPEN_PA.includes(c.pre_auth_status) || RECEIVABLE.includes(c.claim_status));
  const q = search.trim().toLowerCase();
  const visible = list.filter((p) => match(p, pill) && (!q || [p.name, p.code, p.contract_reference, ...(p.plans_data || []).map((x) => x.name)].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = visible.map((p) => {
    const mine = claimsOf(p);
    const open = mine.filter((c) => OPEN_PA.includes(c.pre_auth_status)).length;
    return {
      key: `p:${p.code}`,
      title: p.name,
      badge: !p.is_active ? <HmsBadge tone="gray">Suspended</HmsBadge> : expiring(p) ? <HmsBadge tone="amber">Renew contract</HmsBadge> : open ? <HmsBadge tone="blue">{`${open} pre-auth`}</HmsBadge> : <HmsBadge tone="green">Empanelled</HmsBadge>,
      sub: (
        <>
          <span style={MONO}>{p.code}</span> · co-pay {num(p.co_pay_percentage)}% · {(p.plans_data || []).length || 1} plan{(p.plans_data || []).length === 1 ? '' : 's'}
        </>
      ),
      metaLeft: num(p.room_rent_ceiling) ? `Room cap ${format(num(p.room_rent_ceiling))}/day` : 'No room cap',
      metaRight: p.settlement_tat_days ? `Pays in ${p.settlement_tat_days} days` : undefined,
    };
  });

  const save = async (d: ContractDraft) => {
    setBusy(true);
    try {
      const saved = d.id ? await billingService.updateCorporateAccount(d.id, contractPayload(d)) : await billingService.addInsurancePayer(contractPayload(d));
      notify(`${saved.name} ${d.id ? 'updated' : 'added'} · recorded in the audit log`);
      setForm(null);
      setSelected(`p:${saved.code}`);
      await load();
    } catch (e) {
      notify(apiError(e, 'The contract could not be saved'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (p: CorporateAccount) => {
    setBusy(true);
    try {
      await billingService.updateCorporateAccount(p.id, { is_active: !p.is_active });
      notify(`${p.name} ${p.is_active ? 'suspended — counters stop offering it' : 'reinstated'}`);
      await load();
    } catch (e) {
      notify(apiError(e, 'The contract could not be changed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const renderDetail = (key: string | null) => {
    if (!payers && !failed) return <HmsEmpty>Loading insurers…</HmsEmpty>;
    if (failed) return <HmsEmpty>{failed}</HmsEmpty>;
    const p = list.find((x) => `p:${x.code}` === key);
    if (!p) return <HmsEmpty>{list.length ? 'Select an insurer from the list.' : 'No insurers or TPAs yet. Add one with Alt+N.'}</HmsEmpty>;
    const mine = claimsOf(p);
    const openPa = mine.filter((c) => OPEN_PA.includes(c.pre_auth_status));
    const receivable = mine.filter((c) => RECEIVABLE.includes(c.claim_status)).reduce((s, c) => s + num(c.pre_auth_amount) + num(c.enhancement_amount), 0);
    const settled = mine.filter((c) => c.claim_status === 'SETTLED');
    const denied = mine.filter((c) => c.claim_status === 'DENIED').length;
    const deducted = settled.reduce((s, c) => s + num(c.deduction_amount), 0);
    const settledAmt = settled.reduce((s, c) => s + num(c.settled_amount), 0);
    const plans = p.plans_data || [];
    const docs = p.required_docs || [];
    return (
      <>
        <HmsDetailHeader
          icon={ShieldCheck}
          title={p.name}
          badge={!p.is_active ? <HmsBadge tone="gray">Suspended</HmsBadge> : <HmsBadge tone="green">Empanelled</HmsBadge>}
          subtitle={
            <>
              <span style={MONO}>{p.code}</span>
              {p.contract_reference ? ` · ${p.contract_reference}` : ''}
              {p.valid_until ? ` · valid until ${fmtDate(p.valid_until)}` : ''}
            </>
          }
          actions={
            <HmsButton icon={Pencil} onClick={() => setForm(contractDraft(p))}>
              Edit terms
            </HmsButton>
          }
        />
        <HmsStatStrip
          items={[
            { label: 'Open pre-auths', value: openPa.length, note: format(openPa.reduce((s, c) => s + num(c.requested_amount), 0)) + ' asked' },
            { label: 'Awaiting payment', value: format(receivable), note: `${mine.filter((c) => RECEIVABLE.includes(c.claim_status)).length} claims` },
            { label: 'Settled', value: format(settledAmt), note: deducted ? `${format(deducted)} deducted` : 'No deductions', tone: deducted ? 'amber' : 'default' },
            { label: 'Denied', value: denied, tone: denied ? 'red' : 'default', note: mine.length ? `of ${mine.length} claims` : 'No claims yet' },
          ]}
        />
        <HmsDetailBody>
          {!p.is_active && <HmsNotice tone="amber">Suspended: counters cannot select this payer for new admissions. Existing claims continue.</HmsNotice>}
          {p.is_active && expiring(p) && <HmsNotice tone="amber">The contract {p.valid_until && new Date(`${p.valid_until}T00:00:00`).getTime() < today ? 'has expired' : 'expires within 30 days'} ({fmtDate(p.valid_until)}). Renew it or update the date.</HmsNotice>}
          <HmsSection title="Billing terms">
            <HmsRow label="Co-pay" value={`${num(p.co_pay_percentage)}%`} hint="Patient share of the admissible amount" />
            <HmsRow label="Deductible" value={format(num(p.deductible_amount))} />
            <HmsRow label="Room rent cap" value={num(p.room_rent_ceiling) ? `${format(num(p.room_rent_ceiling))} / day` : 'No cap'} hint="Excess and proportionate charges go to the patient" />
            <HmsRow label="Tariff discount" value={`${num(p.tariff_discount_percent)}%`} />
            <HmsRow label="Credit limit" value={format(num(p.credit_limit))} />
            <HmsRow label="Settlement turnaround" value={p.settlement_tat_days ? `${p.settlement_tat_days} days` : '—'} hint={p.billing_cycle || undefined} last />
          </HmsSection>
          <HmsSection title={`Plans · ${plans.length}`}>
            {plans.length === 0 && <HmsRow label="No plans listed — the contract terms apply to every member" last />}
            {plans.map((pl, i) => (
              <HmsRow key={pl.name} label={pl.name} hint={pl.exc ? `Excludes ${pl.exc}` : undefined} value={`co-pay ${pl.copay}% · cap ${format(pl.cap)}`} last={i === plans.length - 1} />
            ))}
          </HmsSection>
          <HmsSection title="Documents & contacts">
            <HmsRow label="Required documents" value={docs.length ? docs.join(', ') : '—'} />
            <HmsRow label="Contact" value={p.contact_person || '—'} hint={[p.contact_email, p.contact_phone].filter(Boolean).join(' · ') || undefined} last />
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
            <HmsButton variant={p.is_active ? 'danger' : 'primary'} icon={Power} block disabled={busy} onClick={() => toggle(p)}>
              {p.is_active ? 'Suspend contract' : 'Reinstate contract'}
            </HmsButton>
            <HmsButton icon={ArrowRight} block onClick={onOpenIpd} title="Pre-auths and claims are worked on the IPD & TPA desk">
              Open claims desk
            </HmsButton>
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="adm-insurance"
        title="Insurance & TPA"
        description="Insurer and TPA contracts the counters split bills by, and how each payer performs on claims."
        total={list.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search insurer, code, plan or contract"
        headerAction={
          <div style={{ display: 'flex', gap: '8px' }}>
            <HmsButton size="sm" icon={Calculator} onClick={() => setCalc(true)} title="Co-pay calculator">
              Split
            </HmsButton>
            <HmsButton size="sm" icon={Plus} onClick={() => setForm(contractDraft())} title="Add an insurer (Alt+N)" aria-keyshortcuts="Alt+N">
              Add
            </HmsButton>
          </div>
        }
        pills={[
          { key: 'all', label: 'All', count: list.length },
          { key: 'open', label: 'Open claims', count: list.filter((p) => match(p, 'open')).length },
          { key: 'expiring', label: 'Renew soon', count: list.filter((p) => match(p, 'expiring')).length, tone: 'amber' },
          { key: 'suspended', label: 'Suspended', count: list.filter((p) => !p.is_active).length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="edit terms"
        onPrimary={(k) => {
          const p = list.find((x) => `p:${x.code}` === k);
          if (p) setForm(contractDraft(p));
        }}
        detailLabel="Insurer contract"
        emptyText="No insurers match this search or filter."
        renderDetail={renderDetail}
      />
      {form && <AdmContractModal kind="insurer" initial={form} busy={busy} onClose={() => setForm(null)} onSave={save} />}
      {calc && <CoPayModal onClose={() => setCalc(false)} notify={notify} />}
    </>
  );
};

const CoPayModal: React.FC<{ onClose: () => void; notify: (m: string, t?: 'success' | 'error') => void }> = ({ onClose, notify }) => {
  const { format } = useCurrency();
  const [f, setF] = useState({ total: '', gop: '', copay: '10', nonMedical: '0', roomExcess: '0' });
  const [res, setRes] = useState<CoPaySplitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setRes(null);
    setF({ ...f, [k]: e.target.value });
  };
  const run = async () => {
    setBusy(true);
    try {
      setRes(await billingService.calculateCoPaySplit({ total_bill: num(f.total), approved_gop: num(f.gop), copay_percent: num(f.copay), non_medical_deductibles: num(f.nonMedical), room_rent_excess: num(f.roomExcess) }));
    } catch (e) {
      notify(apiError(e, 'The split could not be calculated'), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <HmsModal
      title="Co-pay calculator"
      description="How a cashless bill splits between the insurer and the patient."
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <HmsButton onClick={onClose}>Close</HmsButton>
          <HmsButton variant="primary" icon={Calculator} disabled={busy || !(num(f.total) > 0)} onClick={run}>
            Calculate
          </HmsButton>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
        <HmsField label="Total bill" htmlFor="cp-total" required>
          <input id="cp-total" autoFocus style={INPUT} inputMode="decimal" value={f.total} onChange={set('total')} />
        </HmsField>
        <HmsField label="Approved GOP" htmlFor="cp-gop">
          <input id="cp-gop" style={INPUT} inputMode="decimal" value={f.gop} onChange={set('gop')} />
        </HmsField>
        <HmsField label="Co-pay (%)" htmlFor="cp-copay">
          <input id="cp-copay" style={INPUT} inputMode="decimal" value={f.copay} onChange={set('copay')} />
        </HmsField>
        <HmsField label="Non-medical items" htmlFor="cp-nm">
          <input id="cp-nm" style={INPUT} inputMode="decimal" value={f.nonMedical} onChange={set('nonMedical')} />
        </HmsField>
        <HmsField label="Room rent excess" htmlFor="cp-room">
          <input id="cp-room" style={INPUT} inputMode="decimal" value={f.roomExcess} onChange={set('roomExcess')} />
        </HmsField>
      </div>
      {res && (
        <div style={{ marginTop: '16px' }}>
          <HmsSection title="Split">
            <HmsRow label="Admissible amount" value={format(res.admissible_amount)} hint={`Bill less non-medical ${format(res.non_medical_deductibles)} and room excess ${format(res.room_rent_excess)}`} />
            <HmsRow label={`Co-pay (${res.copay_percent}%)`} value={format(res.copay_amount)} />
            <HmsRow label="GOP shortfall" value={format(res.gop_shortfall)} />
            <HmsRow label={<strong>Insurer pays</strong>} value={<strong>{format(res.insurer_payable)}</strong>} />
            <HmsRow label={<strong>Patient pays</strong>} value={<strong>{format(res.patient_copay)}</strong>} hint={res.breakdown_summary} last />
          </HmsSection>
        </div>
      )}
    </HmsModal>
  );
};
