// Billing · Cashier — the discount, void and refund requests this cashier raised, the supervisor's decision on each,
// and paying an approved cash refund out of the drawer.
import React, { useState } from 'react';
import { ClipboardList, Banknote } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsTone } from '../../../components/hms';
import { billingService } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { CashierDeskData, CashierRequestRow, fmtTime } from './cashierDeskData';

export interface CashierRequestsViewProps {
  data: CashierDeskData;
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
  shiftOpen: boolean;
}

const STATUS: Record<string, { label: string; tone: HmsTone }> = {
  PENDING: { label: 'With supervisor', tone: 'amber' },
  APPROVED: { label: 'Approved', tone: 'green' },
  REJECTED: { label: 'Rejected', tone: 'red' },
  DISBURSED: { label: 'Paid out', tone: 'gray' },
  WITHDRAWN: { label: 'Withdrawn', tone: 'gray' },
};
const PILLS = ['all', 'pay', 'PENDING', 'APPROVED', 'REJECTED'];

export const CashierRequestsView: React.FC<CashierRequestsViewProps> = ({ data, notify, initialFilter, initialSelect, shiftOpen }) => {
  const { format } = useCurrency();
  const list = data.requests;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `q:${initialSelect}` : null);
  const [payOut, setPayOut] = useState<CashierRequestRow | null>(null);
  const [busy, setBusy] = useState(false);

  const match = (r: CashierRequestRow, p: string) => (p === 'all' ? true : p === 'pay' ? r.payable : r.status === p);
  const q = search.trim().toLowerCase();
  const visible = list.filter((r) => match(r, pill) && (!q || [r.number, r.patient, r.uhid, r.invoice, r.type, r.reason].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = visible.map((r) => ({
    key: `q:${r.number}`,
    title: `${r.type} · ${r.patient || r.uhid || '—'}`,
    badge: r.payable ? <HmsBadge tone="blue">Pay from drawer</HmsBadge> : <HmsBadge tone={(STATUS[r.status] || STATUS.PENDING).tone}>{(STATUS[r.status] || { label: r.status }).label}</HmsBadge>,
    sub: `${r.number}${r.invoice ? ` · ${r.invoice}` : ''}`,
    metaLeft: r.detail,
    metaRight: format(r.amount),
  }));

  const confirmPay = async () => {
    if (!payOut) return;
    setBusy(true);
    try {
      const res = await billingService.payCashRefund(payOut.id);
      notify(`${payOut.number}: ${format(payOut.amount)} paid from your drawer · ${res.credit_note.credit_note_number}`);
      setPayOut(null);
      await data.reload();
    } catch (e) {
      notify(apiError(e, 'The cash payout failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const renderDetail = (key: string | null) => {
    if (data.loading && !list.length) return <HmsEmpty>Loading your requests…</HmsEmpty>;
    const r = list.find((x) => `q:${x.number}` === key);
    if (!r) return <HmsEmpty>{list.length ? 'Select a request from the list.' : 'You have not raised any discount, void or refund requests.'}</HmsEmpty>;
    const st = STATUS[r.status] || { label: r.status, tone: 'blue' as HmsTone };
    return (
      <>
        <HmsDetailHeader icon={ClipboardList} title={`${r.type} request · ${r.number}`} badge={<HmsBadge tone={st.tone}>{st.label}</HmsBadge>} subtitle={`${r.patient || '—'}${r.uhid ? ` · ${r.uhid}` : ''}${r.invoice ? ` · ${r.invoice}` : ''}`} />
        <HmsStatStrip
          items={[
            { label: 'Amount', value: format(r.amount), note: r.type === 'Discount' ? 'Discount value' : r.type === 'Void' ? 'Invoice value' : 'To refund' },
            { label: 'Raised', value: fmtTime(r.at) },
            { label: 'Decision', value: st.label, tone: r.status === 'REJECTED' ? 'red' : r.status === 'APPROVED' ? 'green' : 'amber' },
            { label: 'Next step', value: r.payable ? 'Pay out cash' : r.status === 'PENDING' ? 'Wait' : 'None', tone: r.payable ? 'amber' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {r.payable && <HmsNotice tone="amber">Approved. Pay {format(r.amount)} in cash from your drawer and get the patient to sign the voucher.</HmsNotice>}
          {r.status === 'REJECTED' && <HmsNotice tone="red">{r.decisionNote}</HmsNotice>}
          <HmsSection title="Request">
            <HmsRow label="What" value={r.detail} />
            <HmsRow label="Reason" value={r.reason || '—'} />
            <HmsRow label="Supervisor" value={r.decisionNote || 'Not decided yet'} last />
          </HmsSection>
        </HmsDetailBody>
        {r.payable && (
          <HmsDetailFooter>
            <HmsButton variant="primary" icon={Banknote} block disabled={!shiftOpen} title={shiftOpen ? 'Pay this refund from your drawer' : 'Open your counter shift to pay out cash'} onClick={() => setPayOut(r)}>
              Pay {format(r.amount)} from drawer
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="cashier-requests"
        title="My requests"
        description="Discounts, voids and refunds you raised, with the supervisor’s decision."
        total={list.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search request, patient or invoice"
        pills={[
          { key: 'all', label: 'All', count: list.length },
          { key: 'pay', label: 'To pay out', count: list.filter((r) => r.payable).length, tone: 'amber' },
          { key: 'PENDING', label: 'With supervisor', count: list.filter((r) => r.status === 'PENDING').length },
          { key: 'APPROVED', label: 'Approved', count: list.filter((r) => r.status === 'APPROVED').length },
          { key: 'REJECTED', label: 'Rejected', count: list.filter((r) => r.status === 'REJECTED').length, tone: 'red' },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open request"
        detailLabel="Request"
        emptyText="No requests match this search or filter."
        renderDetail={renderDetail}
      />
      {payOut && (
        <HmsModal
          title={`Pay ${format(payOut.amount)} from your drawer?`}
          description={`${payOut.number} · ${payOut.patient}. The drawer's expected cash goes down by this amount.`}
          onClose={() => setPayOut(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setPayOut(null)} data-autofocus>
                Cancel
              </HmsButton>
              <HmsButton variant="primary" icon={Banknote} onClick={confirmPay} disabled={busy}>
                {busy ? 'Paying…' : 'Pay out'}
              </HmsButton>
            </>
          }
        >
          <HmsNotice tone="amber">Hand the cash over only after the patient signs the refund voucher.</HmsNotice>
        </HmsModal>
      )}
    </>
  );
};
