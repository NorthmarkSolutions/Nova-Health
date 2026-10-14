// Billing · IPD & TPA desk — payer reference: plans, co-pay, room-rent caps, documents and turnaround. Read-only (Billing Admin owns the contracts).
import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsSection, HmsRow, HmsEmpty } from '../../../components/hms';
import { useCurrency } from '../../../config/currency';
import { IpdTpaData, isPreAuthOpen, isReceivable } from './ipdTpaData';

export interface IpdPayersViewProps {
  data: IpdTpaData;
  initialFilter?: string;
  initialSelect?: string;
}

const has = (q: string, values: (string | null | undefined)[]) => !q || values.some((v) => (v || '').toLowerCase().includes(q));

export const IpdPayersView: React.FC<IpdPayersViewProps> = ({ data, initialFilter, initialSelect }) => {
  const { format } = useCurrency();
  const { payers, claims } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter === 'open' ? 'open' : 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `p:${initialSelect}` : null);

  const q = search.trim().toLowerCase();
  const claimsOf = (id: string) => claims.filter((c) => c.corporate_account === id);
  const withOpen = (id: string) => claimsOf(id).some((c) => isPreAuthOpen(c) || isReceivable(c));
  const visible = payers.filter((p) => (pill === 'open' ? withOpen(p.id) : true) && has(q, [p.name, p.code, ...(p.plans_data || []).map((x) => x.name)]));

  const rows: HmsListRow[] = visible.map((p) => {
    const mine = claimsOf(p.id);
    const open = mine.filter((c) => isPreAuthOpen(c) || isReceivable(c)).length;
    return {
      key: `p:${p.code}`,
      title: p.name,
      badge: open ? <HmsBadge tone="blue">{`${open} open`}</HmsBadge> : <HmsBadge tone="gray">No open claims</HmsBadge>,
      sub: `${(p.plans_data || []).length || 1} plan${(p.plans_data || []).length === 1 ? '' : 's'} · co-pay ${Number(p.co_pay_percentage)}%`,
      metaLeft: Number(p.room_rent_ceiling) ? `Room cap ${format(Number(p.room_rent_ceiling))}/day` : 'No room cap',
      metaRight: p.settlement_tat_days ? `Pays in ${p.settlement_tat_days} days` : undefined,
    };
  });

  const renderDetail = (key: string | null) => {
    if (data.loading && !payers.length) return <HmsEmpty>Loading payers…</HmsEmpty>;
    const p = payers.find((x) => `p:${x.code}` === key);
    if (!p) return <HmsEmpty>{payers.length ? 'Select a payer from the list.' : 'No insurers or TPAs are set up. Billing Admin adds them under Insurance & TPA.'}</HmsEmpty>;
    const mine = claimsOf(p.id);
    const receivable = mine.filter(isReceivable).reduce((s, c) => s + c.approved_total, 0);
    const settled = mine.filter((c) => c.claim_status === 'SETTLED');
    const deducted = settled.reduce((s, c) => s + c.deduction_amount, 0);
    const plans = p.plans_data || [];
    const docs = p.required_docs || [];
    return (
      <>
        <HmsDetailHeader icon={Building2} title={p.name} badge={<HmsBadge tone="green">Empanelled</HmsBadge>} subtitle={`${p.contract_reference || 'Contract on file'}${p.billing_cycle ? ` · ${p.billing_cycle}` : ''}`} />
        <HmsStatStrip
          items={[
            { label: 'Open pre-auths', value: mine.filter(isPreAuthOpen).length },
            { label: 'Awaiting payment', value: format(receivable), note: `${mine.filter(isReceivable).length} claims` },
            { label: 'Settled', value: settled.length, note: deducted ? `${format(deducted)} deducted` : 'No deductions', tone: deducted ? 'amber' : 'default' },
            { label: 'Tariff discount', value: `${Number(p.tariff_discount_percent || 0)}%`, note: 'Off hospital rates' },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title={`Plans (${plans.length})`}>
            {plans.length ? (
              plans.map((x, i) => (
                <HmsRow
                  key={x.name}
                  label={x.name}
                  hint={x.exc ? `Excludes: ${x.exc}` : undefined}
                  value={`${x.copay}% co-pay · ${x.cap ? `${format(x.cap)}/day room` : 'no room cap'}`}
                  last={i === plans.length - 1}
                />
              ))
            ) : (
              <HmsRow label="Standard terms" value={`${Number(p.co_pay_percentage)}% co-pay`} last />
            )}
          </HmsSection>
          <HmsSection title={`Documents needed for a claim (${docs.length})`}>
            {docs.length ? docs.map((d, i) => <HmsRow key={d} label={d} last={i === docs.length - 1} />) : <HmsRow label="No list on file — ask the TPA desk" last />}
          </HmsSection>
          <HmsSection title="Contact">
            <HmsRow label="Person" value={p.contact_person || '—'} />
            <HmsRow label="Phone" value={p.contact_phone || '—'} />
            <HmsRow label="Email" value={p.contact_email || '—'} last />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="ipd-payers"
      title="Payers & plans"
      description="Insurers and TPAs the hospital is empanelled with — terms to check at admission."
      total={payers.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search insurer, TPA or plan"
      pills={[
        { key: 'all', label: 'All', count: payers.length },
        { key: 'open', label: 'With open claims', count: payers.filter((p) => withOpen(p.id)).length },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open payer"
      detailLabel="Payer"
      emptyText="No payers match this search."
      renderDetail={renderDetail}
    />
  );
};
