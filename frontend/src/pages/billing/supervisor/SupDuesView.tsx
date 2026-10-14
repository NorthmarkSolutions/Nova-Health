// Billing · Supervisor — patient dues: unpaid and part-paid invoices, aged so the oldest balances are chased first.
// Copy a payment reminder for the patient; collection itself happens at a counter.
import React, { useState } from 'react';
import { Wallet, Copy } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsTone } from '../../../components/hms';
import { BillingInvoice } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { deptName } from '../cashier/cashierDeskData';
import { SupervisorDeskData, DUE_BUCKETS, MONO, dueAgeDays, dueBucket } from './supervisorDeskData';

export interface SupDuesViewProps {
  data: SupervisorDeskData;
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
}

const BUCKET_TONE: Record<string, HmsTone> = { d0: 'blue', d7: 'amber', d30: 'amber', d31: 'red' };
const PILLS = ['all', ...DUE_BUCKETS.map((b) => b.key)];
const invNo = (i: BillingInvoice) => i.invoice_number || i.invNo;
const ageText = (d: number) => (d === 0 ? 'Today' : `${d} day${d === 1 ? '' : 's'}`);

export const SupDuesView: React.FC<SupDuesViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const { format } = useCurrency();
  const [now] = useState(() => Date.now());
  const dues = [...data.dues].map((i) => ({ inv: i, days: dueAgeDays(i, now), balance: Number(i.balance) || 0 })).sort((a, b) => b.days - a.days || b.balance - a.balance);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `d:${initialSelect}` : null);

  const q = search.trim().toLowerCase();
  const visible = dues.filter(({ inv, days }) => (pill === 'all' || dueBucket(days) === pill) && (!q || [invNo(inv), inv.patientName, inv.uhid, inv.phone, inv.cashierName].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = visible.map(({ inv, days, balance }) => ({
    key: `d:${invNo(inv)}`,
    title: inv.patientName || inv.uhid || '—',
    badge: <HmsBadge tone={BUCKET_TONE[dueBucket(days)]}>{ageText(days)}</HmsBadge>,
    sub: (
      <>
        <span style={MONO}>{invNo(inv)}</span> · {inv.uhid} · {deptName(inv.category)}
      </>
    ),
    metaLeft: inv.status === 'PARTIALLY_PAID' ? `Part paid ${format(Number(inv.paid) || 0)}` : 'Unpaid',
    metaRight: format(balance),
  }));

  const copyReminder = async (inv: BillingInvoice, balance: number) => {
    const text = `Dear ${inv.patientName || 'patient'}, a balance of ${format(balance)} is due on North Hospital invoice ${invNo(inv)} dated ${String(inv.date)}. Please clear it at any billing counter. Thank you.`;
    try {
      await navigator.clipboard.writeText(text);
      notify('Reminder copied — paste it into SMS or WhatsApp');
    } catch {
      notify('Could not copy to the clipboard', 'error');
    }
  };

  const renderDetail = (key: string | null) => {
    if (data.loading && !dues.length) return <HmsEmpty>Loading dues…</HmsEmpty>;
    const row = dues.find((d) => `d:${invNo(d.inv)}` === key);
    if (!row) return <HmsEmpty>{dues.length ? 'Select an invoice from the list.' : 'No unpaid or part-paid invoices.'}</HmsEmpty>;
    const { inv, days, balance } = row;
    const bucket = DUE_BUCKETS.find((b) => b.key === dueBucket(days));
    return (
      <>
        <HmsDetailHeader
          icon={Wallet}
          title={inv.patientName || inv.uhid || '—'}
          badge={<HmsBadge tone={BUCKET_TONE[dueBucket(days)]}>{bucket?.label}</HmsBadge>}
          subtitle={
            <>
              <span style={MONO}>{invNo(inv)}</span> · {inv.uhid}
              {inv.phone ? ` · ${inv.phone}` : ''}
            </>
          }
        />
        <HmsStatStrip
          items={[
            { label: 'Balance', value: format(balance), tone: days > 30 ? 'red' : days > 0 ? 'amber' : 'default' },
            { label: 'Invoice total', value: format(Number(inv.total) || 0), note: String(inv.date) },
            { label: 'Paid', value: format(Number(inv.paid) || 0), note: inv.status === 'PARTIALLY_PAID' ? 'Part paid' : 'Nothing yet' },
            { label: 'Age', value: ageText(days), note: inv.counterCode ? `Counter ${inv.counterCode}` : deptName(inv.category) },
          ]}
        />
        <HmsDetailBody>
          {days > 30 && <HmsNotice tone="red">Over 30 days old. Call the patient, and if it cannot be collected raise it with the Billing Admin for write-off.</HmsNotice>}
          <HmsSection title="Items">
            {(inv.items || []).length === 0 && <HmsRow label="No line items" last />}
            {(inv.items || []).map((it, i, arr) => (
              <HmsRow key={it.id || i} label={it.description || 'Item'} hint={`Qty ${it.quantity ?? it.qty ?? 1}`} value={format(Number(it.total) || 0)} last={i === arr.length - 1} />
            ))}
          </HmsSection>
          <HmsSection title="Invoice">
            <HmsRow label="Department" value={deptName(inv.category)} />
            <HmsRow label="Billed by" value={inv.cashierName || '—'} hint={inv.counterCode || undefined} />
            {Number(inv.discount) > 0 && <HmsRow label="Discount" value={format(Number(inv.discount))} />}
            <HmsRow label="Status" value={inv.status === 'PARTIALLY_PAID' ? 'Part paid' : 'Unpaid'} last />
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton variant="primary" icon={Copy} block onClick={() => copyReminder(inv, balance)}>
            Copy payment reminder
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="sup-dues"
      title="Patient dues"
      description="Unpaid and part-paid invoices, oldest first. Chase the old ones before they turn into write-offs."
      total={dues.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search patient, invoice, UHID or phone"
      pills={[
        { key: 'all', label: 'All', count: dues.length },
        ...DUE_BUCKETS.map((b) => ({ key: b.key, label: b.label, count: dues.filter((d) => dueBucket(d.days) === b.key).length, tone: b.key === 'd31' ? ('red' as const) : undefined })),
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open invoice"
      detailLabel="Invoice due"
      emptyText="No dues match this search or filter."
      renderDetail={renderDetail}
    />
  );
};
