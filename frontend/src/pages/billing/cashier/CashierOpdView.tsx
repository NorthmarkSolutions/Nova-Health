// Billing · Cashier — today's OPD visits from the front desk (and online bookings): who is here, which doctor, and whether
// the consultation fee is still to collect, already billed, or was taken at the front desk.
import React, { useState } from 'react';
import { Stethoscope, Banknote } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty } from '../../../components/hms';
import { CashierOpdVisit } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { CashierDeskData, VISIT_STATE, VISIT_STATUS, fmtTime } from './cashierDeskData';

export interface CashierOpdViewProps {
  data: CashierDeskData;
  initialFilter?: string;
  initialSelect?: string;
  /** Opens the patient's account in the billing queue. */
  onOpenAccount: (uhid: string) => void;
}

const PILLS = ['all', 'collect', 'unpaid', 'paid', 'desk', 'cancelled'];
const has = (q: string, values: (string | null | undefined)[]) => !q || values.some((v) => (v || '').toLowerCase().includes(q));

export const CashierOpdView: React.FC<CashierOpdViewProps> = ({ data, initialFilter, initialSelect, onOpenAccount }) => {
  const { format } = useCurrency();
  const money = (n: number | null | undefined) => (n === null || n === undefined ? '—' : format(Number(n)));
  const visits = data.visits;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `v:${initialSelect}` : null);

  const match = (v: CashierOpdVisit, p: string) => {
    const s = v.billing.state;
    switch (p) {
      case 'collect':
        return s === 'TO_COLLECT' || s === 'DRAFT';
      case 'unpaid':
        return s === 'BILLED';
      case 'paid':
        return s === 'PAID';
      case 'desk':
        return s === 'PAID_AT_DESK';
      case 'cancelled':
        return s === 'CANCELLED' || v.status === 'CANCELLED';
      default:
        return true;
    }
  };
  const q = search.trim().toLowerCase();
  const visible = visits.filter((v) => match(v, pill) && has(q, [v.patient_name, v.uhid, v.mobile, v.doctor, v.department, v.appointment_number, String(v.token)]));

  const rows: HmsListRow[] = visible.map((v) => {
    const st = VISIT_STATE[v.billing.state];
    return {
      key: `v:${v.appointment_number}`,
      title: `#${v.token} · ${v.patient_name}`,
      badge: <HmsBadge tone={st.tone}>{st.label}</HmsBadge>,
      sub: `${v.uhid}${v.mobile ? ` · ${v.mobile}` : ''}`,
      metaLeft: `${v.doctor || 'Doctor not matched'}${v.department ? ` · ${v.department}` : ''}`,
      metaRight: `${VISIT_STATUS[v.status] || v.status}${v.billing.amount !== null ? ` · ${money(v.billing.amount)}` : ''}`,
    };
  });

  const renderDetail = (key: string | null) => {
    if (data.loading && !visits.length) return <HmsEmpty>Loading today’s OPD visits…</HmsEmpty>;
    const v = visits.find((x) => `v:${x.appointment_number}` === key);
    if (!v)
      return (
        <HmsEmpty>
          {visits.length ? 'Select a visit from the list.' : 'No OPD visits today yet. Tokens issued at the front desk appear here within a few seconds.'}
        </HmsEmpty>
      );
    const st = VISIT_STATE[v.billing.state];
    const quoted = v.quoted_fee !== null && v.quoted_fee !== undefined ? Number(v.quoted_fee) : null;
    const amount = v.billing.amount !== null ? Number(v.billing.amount) : null;
    const mismatch = quoted !== null && amount !== null && v.billing.state !== 'PAID_AT_DESK' && Math.abs(quoted - amount) >= 1;
    return (
      <>
        <HmsDetailHeader icon={Stethoscope} title={`${v.patient_name} · token ${v.token}`} badge={<HmsBadge tone={st.tone}>{st.label}</HmsBadge>} subtitle={`${v.uhid} · ${v.appointment_number} · ${v.source === 'FRONT_DESK' ? 'Front desk' : 'Online / API'}`} />
        <HmsStatStrip
          items={[
            { label: 'Doctor', value: v.doctor || '—', note: v.department || 'Not matched to a doctor profile' },
            { label: 'Visit', value: VISIT_STATUS[v.status] || v.status, note: `${v.type.replace('_', ' ').toLowerCase()} · slot ${v.slot || '—'}` },
            { label: 'Consultation fee', value: money(amount ?? quoted), note: v.billing.state === 'PAID_AT_DESK' ? 'Front desk amount' : 'Tariff Master' },
            { label: 'Booked', value: fmtTime(v.created_at), note: v.mobile || '—' },
          ]}
        />
        <HmsDetailBody>
          {v.billing.state === 'PAID_AT_DESK' && (
            <HmsNotice tone="green">
              The front desk collected {money(quoted)}
              {v.billing.mode ? ` by ${v.billing.mode}` : ''}
              {v.billing.invoice ? ` (receipt ${v.billing.invoice})` : ''}. Nothing to collect here.
            </HmsNotice>
          )}
          {v.billing.state === 'TO_COLLECT' && <HmsNotice tone="amber">The consultation fee has not been paid. Collect it before the patient goes in, or with their lab and pharmacy bill.</HmsNotice>}
          {v.billing.state === 'BILLED' && <HmsNotice tone="red">Invoice {v.billing.invoice} is unpaid{v.billing.balance ? ` — ${money(v.billing.balance)} due` : ''}.</HmsNotice>}
          {v.billing.state === 'CANCELLED' && <HmsNotice tone="blue">Cancelled or no-show — the consultation charge was released.</HmsNotice>}
          {mismatch && (
            <HmsNotice tone="amber">
              The front desk quoted {money(quoted)}; the Tariff Master fee is {money(amount)}. Tell the patient before collecting, and report the difference to the Billing Admin.
            </HmsNotice>
          )}
          <HmsSection title="Billing">
            <HmsRow label="Status" value={<HmsBadge tone={st.tone}>{st.label}</HmsBadge>} />
            <HmsRow label="Amount" value={money(amount)} />
            <HmsRow label="Invoice / receipt" value={v.billing.invoice || '—'} />
            <HmsRow label="Front desk quoted" value={money(quoted)} last />
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton variant={v.billing.state === 'TO_COLLECT' || v.billing.state === 'BILLED' || v.billing.state === 'DRAFT' ? 'primary' : 'secondary'} icon={Banknote} block onClick={() => onOpenAccount(v.uhid)}>
            Open {v.patient_name.split(' ')[0]}’s account
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  const count = (p: string) => visits.filter((v) => match(v, p)).length;
  return (
    <HmsMasterDetail
      listId="cashier-opd"
      title="OPD visits today"
      description="Every token from the front desk and online bookings, with where its consultation fee stands."
      total={visits.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search patient, UHID, doctor or token"
      pills={[
        { key: 'all', label: 'All', count: visits.length },
        { key: 'collect', label: 'To collect', count: count('collect'), tone: 'amber' },
        { key: 'unpaid', label: 'Billed · unpaid', count: count('unpaid'), tone: 'red' },
        { key: 'paid', label: 'Paid here', count: count('paid') },
        { key: 'desk', label: 'Paid at desk', count: count('desk') },
        { key: 'cancelled', label: 'Cancelled', count: count('cancelled') },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open visit"
      onPrimary={(k) => {
        const v = visits.find((x) => `v:${x.appointment_number}` === k);
        if (v) onOpenAccount(v.uhid);
      }}
      detailLabel="OPD visit"
      emptyText="No visits match this search or filter."
      renderDetail={renderDetail}
    />
  );
};
