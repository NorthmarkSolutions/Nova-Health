// Front Desk — desk fee collection for today's tokens: who still owes the consultation fee, what was paid and how,
// with the receipt lines. Collecting here marks the visit paid and tells Billing not to collect it again.
import React, { useState } from 'react';
import { Banknote, Printer, Receipt } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty } from '../../components/hms';
import { SharedQueueToken } from '../../services/patientJourneyService';
import { useCurrency } from '../../config/currency';
import { DeskActions, ReceptionData, MONO, feeDue, isCancelled, isDone, printSlip, statusOf, tokenLabel } from './receptionData';

export interface RecFeesViewProps {
  data: ReceptionData;
  act: DeskActions;
  initialFilter?: string;
}

const PILLS = ['due', 'seen', 'paid', 'all'];

export const RecFeesView: React.FC<RecFeesViewProps> = ({ data, act, initialFilter }) => {
  const { format } = useCurrency();
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'due');
  const [selected, setSelected] = useState<string | null>(null);
  const billable = data.queue.filter((t) => !isCancelled(t) && (t.totalFee || 0) > 0);
  const match = (t: SharedQueueToken, p: string) => (p === 'due' ? feeDue(t) : p === 'seen' ? feeDue(t) && isDone(t) : p === 'paid' ? !!t.feePaid : true);
  const q = search.trim().toLowerCase();
  const list = billable.filter((t) => match(t, pill) && (!q || [t.patient, t.uhid, t.invoiceNo, String(t.token)].some((v) => (v || '').toLowerCase().includes(q)))).sort((a, b) => b.token - a.token);
  const rows: HmsListRow[] = list.map((t) => ({
    key: `f:${t.token}`,
    title: `${tokenLabel(t.token)} · ${t.patient}`,
    badge: t.feePaid ? <HmsBadge tone="green">{`Paid · ${t.paymentMode}`}</HmsBadge> : isDone(t) ? <HmsBadge tone="red">Left unpaid</HmsBadge> : <HmsBadge tone="amber">Due</HmsBadge>,
    sub: (
      <>
        <span style={MONO}>{t.uhid}</span> · {t.doctor.replace(/\s*\(.*\)$/, '')}
      </>
    ),
    metaLeft: statusOf(t).label,
    metaRight: format(t.totalFee || 0),
  }));
  const dueTotal = billable.filter(feeDue).reduce((s, t) => s + (t.totalFee || 0), 0);

  const receipt = (t: SharedQueueToken) => {
    const inv = data.invoices.find((i) => i.invNo === t.invoiceNo);
    const lines: Array<[string, string]> = [['Patient', t.patient], ['UHID', t.uhid], ['Invoice', t.invoiceNo || '—']];
    (inv?.items || []).forEach((it) => lines.push([it.description, format(it.total)]));
    lines.push(['Total paid', format(inv?.paid ?? t.totalFee ?? 0)], ['Mode', t.paymentMode || '—']);
    if (!printSlip('Receipt', lines)) act.notify('Allow pop-ups to print the receipt', 'error');
  };

  const renderDetail = (key: string | null) => {
    const t = data.queue.find((x) => `f:${x.token}` === key);
    if (!t) return <HmsEmpty>{billable.length ? 'Select a visit from the list.' : 'No chargeable visits yet today.'}</HmsEmpty>;
    const inv = data.invoices.find((i) => i.invNo === t.invoiceNo);
    return (
      <>
        <HmsDetailHeader icon={Receipt} title={`${tokenLabel(t.token)} · ${t.patient}`} badge={t.feePaid ? <HmsBadge tone="green">Paid</HmsBadge> : <HmsBadge tone="amber">Due</HmsBadge>} subtitle={<><span style={MONO}>{t.uhid}</span> · {t.doctor}</>} />
        <HmsStatStrip
          items={[
            { label: 'Amount', value: format(t.totalFee || 0) },
            { label: 'Status', value: t.feePaid ? 'Paid' : 'Due', tone: t.feePaid ? 'green' : 'amber' },
            { label: 'Mode', value: t.feePaid ? t.paymentMode || '—' : '—' },
            { label: 'Invoice', value: <span style={MONO}>{t.invoiceNo || '—'}</span> },
          ]}
        />
        <HmsDetailBody>
          {feeDue(t) && isDone(t) && <HmsNotice tone="red">The patient was checked out without paying. Billing will show this as an unpaid OPD visit.</HmsNotice>}
          {!t.feePaid && <HmsNotice tone="blue">If the patient pays at the billing counter instead, the cashier’s payment clears this automatically.</HmsNotice>}
          <HmsSection title="Receipt lines">
            {!inv && <HmsRow label={t.feePaid ? 'Paid — no line detail recorded' : 'Consultation and desk charges'} value={format(t.totalFee || 0)} last />}
            {inv?.items.map((it, i) => (
              <HmsRow key={i} label={it.description} value={format(it.total)} last={i === inv.items.length - 1} />
            ))}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          {t.feePaid ? (
            <HmsButton icon={Printer} block onClick={() => receipt(t)}>
              Print receipt
            </HmsButton>
          ) : (
            <HmsButton variant="primary" icon={Banknote} block onClick={() => act.collectFee(t)}>
              Collect {format(t.totalFee || 0)}
            </HmsButton>
          )}
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="rec-fees"
      title="Fee collection"
      description={`Desk fees for today’s visits · ${format(dueTotal)} still due.`}
      total={billable.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search token, patient, UHID or invoice"
      pills={[
        { key: 'due', label: 'Due', count: billable.filter(feeDue).length, tone: 'amber' },
        { key: 'seen', label: 'Left unpaid', count: billable.filter((t) => feeDue(t) && isDone(t)).length, tone: 'red' },
        { key: 'paid', label: 'Paid', count: billable.filter((t) => t.feePaid).length },
        { key: 'all', label: 'All', count: billable.length },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="collect"
      onPrimary={(k) => {
        const t = data.queue.find((x) => `f:${x.token}` === k);
        if (t && feeDue(t)) act.collectFee(t);
      }}
      detailLabel="Visit fee"
      emptyText="Nothing matches this search or filter."
      renderDetail={renderDetail}
    />
  );
};
