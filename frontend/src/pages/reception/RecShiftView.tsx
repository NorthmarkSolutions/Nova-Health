// Front Desk — the counter shift: opening float, what was collected by cash / UPI / card, the cash the drawer should
// hold, and the closing count with handover. Each desk payment is listed. A supervisor can reopen a closed shift.
import React, { useState } from 'react';
import { Store, Banknote, LockOpen, Lock, FileText } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty } from '../../components/hms';
import { patientJourneyService } from '../../services/patientJourneyService';
import { useCurrency } from '../../config/currency';
import { DeskActions, ReceptionData, MONO, feeDue, isCancelled, isDone, printSlip, tokenLabel } from './receptionData';
import { deskCollections } from './deskFees';

export interface RecShiftViewProps {
  data: ReceptionData;
  act: DeskActions;
  onOpenShift: () => void;
  onCloseShift: () => void;
}

export const RecShiftView: React.FC<RecShiftViewProps> = ({ data, act, onOpenShift, onCloseShift }) => {
  const { format } = useCurrency();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const s = data.session;
  const open = s.status === 'OPEN';
  const col = deskCollections(data.queue);
  const expectedCash = (s.openingFloat || 0) + col.cash;
  const q = search.trim().toLowerCase();
  const pays = col.paid.filter((t) => !q || [t.patient, t.uhid, t.invoiceNo, t.paymentMode].some((v) => (v || '').toLowerCase().includes(q))).sort((a, b) => b.token - a.token);
  const rows: HmsListRow[] = [
    { key: 'shift', title: `${s.counterNumber} · ${s.shift}`, badge: open ? <HmsBadge tone="green">Open</HmsBadge> : <HmsBadge tone="gray">Closed</HmsBadge>, sub: `${s.receptionistName || '—'} · since ${s.openedAt}`, metaLeft: `Float ${format(s.openingFloat || 0)}`, metaRight: `Drawer ${format(expectedCash)}` },
    ...pays.map((t) => ({
      key: `p:${t.token}`,
      title: `${tokenLabel(t.token)} · ${t.patient}`,
      badge: <HmsBadge tone={t.paymentMode === 'CASH' ? 'blue' : 'gray'}>{t.paymentMode || '—'}</HmsBadge>,
      sub: <span style={MONO}>{t.invoiceNo || t.uhid}</span>,
      metaRight: format(t.totalFee || 0),
    })),
  ];

  const report = () => {
    const due = data.queue.filter(feeDue);
    const ok = printSlip('Front desk shift report', [
      ['Desk / shift', `${s.counterNumber} · ${s.shift}`],
      ['Receptionist', s.receptionistName || '—'],
      ['Opened', s.openedAt],
      ['Closed', s.closedAt || 'still open'],
      ['Tokens issued', String(data.queue.length)],
      ['Seen & checked out', String(data.queue.filter(isDone).length)],
      ['No-show / cancelled', String(data.queue.filter(isCancelled).length)],
      ['Opening float', format(s.openingFloat || 0)],
      ['Cash', format(col.cash)],
      ['UPI', format(col.upi)],
      ['Card', format(col.card)],
      ['Cash expected in drawer', format(expectedCash)],
      ...(s.countedCash !== undefined ? ([['Cash counted', format(s.countedCash)], ['Difference', format(s.variance || 0)]] as Array<[string, string]>) : []),
      ['Fees still due', `${due.length} · ${format(due.reduce((x, t) => x + (t.totalFee || 0), 0))}`],
      ['Handed over to', s.handedTo || '—'],
    ]);
    if (!ok) act.notify('Allow pop-ups to print the report', 'error');
  };

  const renderDetail = (key: string | null) => {
    if (key && key.startsWith('p:')) {
      const t = data.queue.find((x) => `p:${x.token}` === key);
      if (!t) return <HmsEmpty>Select a payment.</HmsEmpty>;
      return (
        <>
          <HmsDetailHeader icon={Banknote} title={`${format(t.totalFee || 0)} · ${t.patient}`} badge={<HmsBadge tone="green">{t.paymentMode || 'Paid'}</HmsBadge>} subtitle={<><span style={MONO}>{t.invoiceNo || '—'}</span> · token {tokenLabel(t.token)}</>} />
          <HmsStatStrip items={[{ label: 'Amount', value: format(t.totalFee || 0) }, { label: 'Mode', value: t.paymentMode || '—' }, { label: 'Doctor', value: t.doctor.replace(/\s*\(.*\)$/, '') }, { label: 'Visit', value: t.time }]} />
          <HmsDetailBody>
            <HmsSection title="Payment">
              <HmsRow label="UHID" value={<span style={MONO}>{t.uhid}</span>} />
              <HmsRow label="Sent to Billing" value="Yes — the cashier will not collect it again" last />
            </HmsSection>
          </HmsDetailBody>
        </>
      );
    }
    return (
      <>
        <HmsDetailHeader icon={Store} title={`${s.counterNumber} · ${s.shift}`} badge={open ? <HmsBadge tone="green">Open</HmsBadge> : <HmsBadge tone="gray">Closed</HmsBadge>} subtitle={`${s.receptionistName || '—'} · opened ${s.openedAt}${s.closedAt ? ` · closed ${s.closedAt}` : ''}`} />
        <HmsStatStrip
          items={[
            { label: 'Opening float', value: format(s.openingFloat || 0) },
            { label: 'Cash collected', value: format(col.cash), note: `${col.paid.filter((t) => t.paymentMode === 'CASH').length} payments` },
            { label: 'UPI / card', value: format(col.upi + col.card), note: `UPI ${format(col.upi)} · card ${format(col.card)}` },
            { label: 'Drawer should hold', value: format(expectedCash), tone: 'green' },
          ]}
        />
        <HmsDetailBody>
          {!open && s.countedCash !== undefined && (
            <HmsNotice tone={Math.abs(s.variance || 0) < 1 ? 'green' : 'red'}>
              Closed by {s.closedBy || '—'} · counted {format(s.countedCash)} against {format(s.expectedCash || 0)}
              {Math.abs(s.variance || 0) < 1 ? ' · matched' : ` · ${(s.variance || 0) > 0 ? 'excess' : 'short'} ${format(Math.abs(s.variance || 0))}`}
              {s.handedTo ? ` · handed to ${s.handedTo}` : ''}
            </HmsNotice>
          )}
          {!open && <HmsNotice tone="amber">The counter is closed: open a shift before collecting money.</HmsNotice>}
          <HmsSection title="Today at the desk">
            <HmsRow label="Tokens issued" value={data.queue.length} />
            <HmsRow label="Checked out" value={data.queue.filter(isDone).length} />
            <HmsRow label="No-show / cancelled" value={data.queue.filter(isCancelled).length} />
            <HmsRow label="Fees still due" value={format(data.queue.filter(feeDue).reduce((x, t) => x + (t.totalFee || 0), 0))} hint={`${data.queue.filter(feeDue).length} visits`} last />
          </HmsSection>
          {s.notes && (
            <HmsSection title="Shift note">
              <HmsRow label={s.notes} last />
            </HmsSection>
          )}
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${!open && act.supervisor && s.countedCash !== undefined ? 3 : 2}, minmax(0, 1fr))`, gap: '10px' }}>
            <HmsButton icon={FileText} block onClick={report}>
              Print shift report
            </HmsButton>
            {!open && act.supervisor && s.countedCash !== undefined && (
              <HmsButton
                icon={LockOpen}
                block
                title="Supervisor: reopen the same shift (for example to correct a missed payment)"
                onClick={() => {
                  patientJourneyService.openCounterSession({ openingFloat: s.openingFloat, counterNumber: s.counterNumber, shift: s.shift, receptionistName: s.receptionistName, notes: `Reopened by ${act.userName}` });
                  data.reload();
                  act.notify('Shift reopened');
                }}
              >
                Reopen shift
              </HmsButton>
            )}
            {open ? (
              <HmsButton variant="danger" icon={Lock} block onClick={onCloseShift}>
                Close shift & hand over
              </HmsButton>
            ) : (
              <HmsButton variant="primary" icon={LockOpen} block onClick={onOpenShift}>
                Open a new shift
              </HmsButton>
            )}
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="rec-shift"
      title="Shift & cash"
      description="The counter shift and every payment taken at the desk."
      total={col.paid.length + 1}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search payment, patient or invoice"
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Shift"
      emptyText="No payments match this search."
      renderDetail={renderDetail}
    />
  );
};
