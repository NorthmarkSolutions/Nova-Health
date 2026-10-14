// Billing · Admin — corporate employer contracts (MOUs): credit limit and how much of it is used, tariff discount,
// co-pay, the authorisation letters (vouchers) issued against it. Add (Alt+N), edit, suspend; verify a voucher.
import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Pencil, Plus, Power, ShieldCheck } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, INPUT } from '../../../components/hms';
import { billingService, CorporateAccount, CorporateCreditVoucher } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { MONO, fmtDate, num } from './adminDeskData';
import { AdmMeter } from './adminUi';
import { AdmContractModal } from './AdmContractModal';
import { ContractDraft, contractDraft, contractPayload } from './contractDraft';

export interface AdmCorporateViewProps {
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
  newSignal: number;
}

type Account = CorporateAccount & { utilization_pct?: number; available_headroom?: number };
const PILLS = ['all', 'near', 'expiring', 'suspended'];
const util = (a: Account) => (a.utilization_pct ?? a.utilization_percentage ?? (num(a.credit_limit) ? (num(a.utilized_credit) / num(a.credit_limit)) * 100 : 0));

export const AdmCorporateView: React.FC<AdmCorporateViewProps> = ({ notify, initialFilter, initialSelect, newSignal }) => {
  const { format } = useCurrency();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [vouchers, setVouchers] = useState<CorporateCreditVoucher[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `c:${initialSelect}` : null);
  const [form, setForm] = useState<ContractDraft | null>(null);
  const [verify, setVerify] = useState<null | { code: string; result: { is_valid: boolean; reason: string } | null }>(null);
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState(newSignal);
  const [today] = useState(() => Date.now());

  if (newSignal !== seen) {
    setSeen(newSignal);
    setForm(contractDraft());
  }

  const load = useCallback(async () => {
    const [ov, vc] = await Promise.allSettled([billingService.getCorporateAccountsOverview(), billingService.getCorporateVouchers()]);
    if (ov.status === 'fulfilled') {
      setAccounts(ov.value.accounts || []);
      setFailed(null);
    } else setFailed(apiError(ov.reason, 'Corporate accounts could not be loaded.'));
    if (vc.status === 'fulfilled') setVouchers(vc.value || []);
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const list = accounts || [];
  const expiring = (a: Account) => !!a.valid_until && new Date(`${a.valid_until}T00:00:00`).getTime() - today < 30 * 86400000;
  const match = (a: Account, f: string) => (f === 'all' ? true : f === 'suspended' ? !a.is_active : f === 'near' ? a.is_active && util(a) >= 85 : a.is_active && expiring(a));
  const q = search.trim().toLowerCase();
  const visible = list.filter((a) => match(a, pill) && (!q || [a.name, a.code, a.contract_reference, a.contact_person].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = visible.map((a) => {
    const u = util(a);
    return {
      key: `c:${a.code}`,
      title: a.name,
      badge: !a.is_active ? <HmsBadge tone="gray">Suspended</HmsBadge> : u >= 95 ? <HmsBadge tone="red">At limit</HmsBadge> : u >= 85 ? <HmsBadge tone="amber">Near limit</HmsBadge> : expiring(a) ? <HmsBadge tone="amber">Renew MOU</HmsBadge> : <HmsBadge tone="green">Active</HmsBadge>,
      sub: (
        <>
          <span style={MONO}>{a.code}</span> · discount {num(a.tariff_discount_percent)}% · co-pay {num(a.co_pay_percentage)}%
        </>
      ),
      metaLeft: `${format(num(a.utilized_credit))} used`,
      metaRight: `of ${format(num(a.credit_limit))} · ${Math.round(u)}%`,
    };
  });

  const save = async (d: ContractDraft) => {
    setBusy(true);
    try {
      const saved = d.id ? await billingService.updateCorporateAccount(d.id, contractPayload(d)) : await billingService.createCorporateAccount({ ...contractPayload(d), account_type: 'CORPORATE' });
      notify(`${saved.name} ${d.id ? 'updated' : 'added'} · recorded in the audit log`);
      setForm(null);
      setSelected(`c:${saved.code}`);
      await load();
    } catch (e) {
      notify(apiError(e, 'The contract could not be saved'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (a: Account) => {
    setBusy(true);
    try {
      await billingService.updateCorporateAccount(a.id, { is_active: !a.is_active });
      notify(`${a.name} ${a.is_active ? 'suspended — no new credit at counters' : 'reinstated'}`);
      await load();
    } catch (e) {
      notify(apiError(e, 'The contract could not be changed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const runVerify = async () => {
    if (!verify?.code.trim()) return;
    setBusy(true);
    try {
      const r = await billingService.verifyCorporateVoucher({ voucher_number: verify.code.trim() });
      setVerify({ ...verify, result: { is_valid: r.is_valid, reason: r.reason } });
    } catch (e) {
      notify(apiError(e, 'The voucher could not be verified'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const renderDetail = (key: string | null) => {
    if (!accounts && !failed) return <HmsEmpty>Loading corporate accounts…</HmsEmpty>;
    if (failed) return <HmsEmpty>{failed}</HmsEmpty>;
    const a = list.find((x) => `c:${x.code}` === key);
    if (!a) return <HmsEmpty>{list.length ? 'Select an account from the list.' : 'No corporate contracts yet. Add one with Alt+N.'}</HmsEmpty>;
    const u = util(a);
    const mine = vouchers.filter((v) => v.corporate_account === a.id);
    const live = mine.filter((v) => new Date(`${v.validity_date}T23:59:59`).getTime() >= today);
    return (
      <>
        <HmsDetailHeader
          icon={Building2}
          title={a.name}
          badge={!a.is_active ? <HmsBadge tone="gray">Suspended</HmsBadge> : <HmsBadge tone="green">Active</HmsBadge>}
          subtitle={
            <>
              <span style={MONO}>{a.code}</span>
              {a.contract_reference ? ` · ${a.contract_reference}` : ''}
              {a.valid_until ? ` · valid until ${fmtDate(a.valid_until)}` : ''}
            </>
          }
          actions={
            <HmsButton icon={Pencil} onClick={() => setForm(contractDraft(a))}>
              Edit terms
            </HmsButton>
          }
        />
        <HmsStatStrip
          items={[
            { label: 'Credit limit', value: format(num(a.credit_limit)) },
            { label: 'Used', value: format(num(a.utilized_credit)), note: `${Math.round(u)}%`, tone: u >= 95 ? 'red' : u >= 85 ? 'amber' : 'default' },
            { label: 'Headroom', value: format(a.available_headroom ?? a.available_credit ?? Math.max(0, num(a.credit_limit) - num(a.utilized_credit))) },
            { label: 'Live vouchers', value: live.length, note: `${mine.length} issued` },
          ]}
        />
        <HmsDetailBody>
          {!a.is_active && <HmsNotice tone="amber">Suspended: counters will not extend credit to this employer’s staff.</HmsNotice>}
          {a.is_active && u >= 85 && <HmsNotice tone={u >= 95 ? 'red' : 'amber'}>Credit is {Math.round(u)}% used. Raise the limit, or chase settlement before counters start refusing credit.</HmsNotice>}
          {a.is_active && expiring(a) && <HmsNotice tone="amber">The MOU {a.valid_until && new Date(`${a.valid_until}T00:00:00`).getTime() < today ? 'has expired' : 'expires within 30 days'} ({fmtDate(a.valid_until)}).</HmsNotice>}
          <HmsSection title="Credit used">
            <AdmMeter pct={u} label="Credit used against limit" caption={`${format(num(a.utilized_credit))} of ${format(num(a.credit_limit))}`} />
          </HmsSection>
          <HmsSection title="Commercial terms">
            <HmsRow label="Tariff discount" value={`${num(a.tariff_discount_percent)}%`} />
            <HmsRow label="Co-pay" value={`${num(a.co_pay_percentage)}%`} />
            <HmsRow label="Room rent cap" value={num(a.room_rent_ceiling) ? `${format(num(a.room_rent_ceiling))} / day` : 'No cap'} />
            <HmsRow label="Settlement" value={a.settlement_tat_days ? `${a.settlement_tat_days} days` : '—'} hint={a.billing_cycle || undefined} />
            <HmsRow label="Contact" value={a.contact_person || '—'} hint={[a.contact_email, a.contact_phone].filter(Boolean).join(' · ') || undefined} last />
          </HmsSection>
          <HmsSection title={`Authorisation letters · ${mine.length}`}>
            {mine.length === 0 && <HmsRow label="No vouchers issued yet" last />}
            {mine.slice(0, 12).map((v, i, arr) => (
              <HmsRow
                key={v.id}
                label={`${v.employee_name || v.patient_name} · ${v.relationship || 'Employee'}`}
                hint={
                  <>
                    <span style={MONO}>{v.voucher_number}</span> · valid until {fmtDate(v.validity_date)}
                  </>
                }
                value={
                  <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                    <span style={MONO}>
                      {format(num(v.utilized_amount))} / {format(num(v.approved_credit_ceiling))}
                    </span>
                    <HmsBadge tone={v.is_verified ? 'green' : 'amber'}>{v.is_verified ? 'Verified' : 'Unverified'}</HmsBadge>
                  </span>
                }
                last={i === arr.length - 1}
              />
            ))}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton variant={a.is_active ? 'danger' : 'primary'} icon={Power} block disabled={busy} onClick={() => toggle(a)}>
            {a.is_active ? 'Suspend contract' : 'Reinstate contract'}
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="adm-corporate"
        title="Corporate credit"
        description="Employer MOUs: credit limits, discounts and the authorisation letters counters accept."
        total={list.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search employer, code, MOU or contact"
        headerAction={
          <div style={{ display: 'flex', gap: '8px' }}>
            <HmsButton size="sm" icon={ShieldCheck} onClick={() => setVerify({ code: '', result: null })} title="Verify an authorisation letter">
              Verify
            </HmsButton>
            <HmsButton size="sm" icon={Plus} onClick={() => setForm(contractDraft())} title="Add a corporate contract (Alt+N)" aria-keyshortcuts="Alt+N">
              Add
            </HmsButton>
          </div>
        }
        pills={[
          { key: 'all', label: 'All', count: list.length },
          { key: 'near', label: 'Near limit', count: list.filter((a) => match(a, 'near')).length, tone: 'red' },
          { key: 'expiring', label: 'Renew soon', count: list.filter((a) => match(a, 'expiring')).length, tone: 'amber' },
          { key: 'suspended', label: 'Suspended', count: list.filter((a) => !a.is_active).length },
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
          const a = list.find((x) => `c:${x.code}` === k);
          if (a) setForm(contractDraft(a));
        }}
        detailLabel="Corporate contract"
        emptyText="No accounts match this search or filter."
        renderDetail={renderDetail}
      />
      {form && <AdmContractModal kind="corporate" initial={form} busy={busy} onClose={() => setForm(null)} onSave={save} />}
      {verify && (
        <HmsModal
          title="Verify an authorisation letter"
          description="Checks the voucher against its employer contract, validity and remaining credit."
          onClose={() => setVerify(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setVerify(null)}>Close</HmsButton>
              <HmsButton variant="primary" icon={ShieldCheck} disabled={busy || !verify.code.trim()} onClick={runVerify}>
                Verify
              </HmsButton>
            </>
          }
        >
          <HmsField label="Voucher number" htmlFor="cv-code" required>
            <input id="cv-code" autoFocus style={{ ...INPUT, ...MONO, fontSize: '14px' }} value={verify.code} onChange={(e) => setVerify({ code: e.target.value, result: null })} onKeyDown={(e) => e.key === 'Enter' && runVerify()} />
          </HmsField>
          {verify.result && (
            <div style={{ marginTop: '16px' }}>
              <HmsNotice tone={verify.result.is_valid ? 'green' : 'red'}>
                {verify.result.is_valid ? 'Valid · ' : 'Not valid · '}
                {verify.result.reason}
              </HmsNotice>
            </div>
          )}
        </HmsModal>
      )}
    </>
  );
};
