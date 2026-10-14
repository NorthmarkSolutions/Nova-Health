// Billing · Supervisor — OPD reconciliation. Today's visits from the reception front desk (and online bookings), checked
// for revenue leakage: patients seen but not billed, fees the desk collected that billing has not received, refunds due on
// cancelled paid visits and visits that never raised a charge. The supervisor confirms desk cash handovers here.
import React, { useEffect, useState } from 'react';
import { Stethoscope, HandCoins } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, INPUT } from '../../../components/hms';
import { CashierOpdVisit, billingService } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { VISIT_STATUS } from '../cashier/cashierDeskData';
import { SupervisorDeskData, OPD_FLAG, OpdFlag, MONO, fmtClock, fmtWhen, opdFlag, visitAmount } from './supervisorDeskData';

export interface SupOpdViewProps {
  data: SupervisorDeskData;
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
  receiveRequest: boolean;
  onReceiveConsumed: () => void;
}

const PILLS = ['all', 'leak', 'desk', 'refund', 'nocharge', 'settled'];
const SETTLED: OpdFlag[] = ['paid', 'received'];

export const SupOpdView: React.FC<SupOpdViewProps> = ({ data, notify, initialFilter, initialSelect, receiveRequest, onReceiveConsumed }) => {
  const { format } = useCurrency();
  const visits = data.visits;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `v:${initialSelect}` : null);
  const [receive, setReceive] = useState<CashierOpdVisit[] | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const deskPending = visits.filter((v) => opdFlag(v) === 'desk');
  // Alt+O from the workspace opens the desk handover dialog once the visits are loaded
  useEffect(() => {
    if (!receiveRequest || data.loading) return;
    Promise.resolve().then(() => {
      setReceive(visits.filter((v) => opdFlag(v) === 'desk'));
      onReceiveConsumed();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiveRequest, data.loading]);

  const count = (f: OpdFlag) => visits.filter((v) => opdFlag(v) === f).length;
  const match = (v: CashierOpdVisit, p: string) => (p === 'all' ? true : p === 'settled' ? SETTLED.includes(opdFlag(v)) : opdFlag(v) === p);
  const q = search.trim().toLowerCase();
  const visible = visits.filter((v) => match(v, pill) && (!q || [v.patient_name, v.uhid, v.mobile, v.doctor, v.department, v.appointment_number, String(v.token), v.billing.invoice].some((x) => (x || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = visible.map((v) => {
    const f = OPD_FLAG[opdFlag(v)];
    return {
      key: `v:${v.id}`,
      title: `#${v.token} · ${v.patient_name}`,
      badge: <HmsBadge tone={f.tone}>{f.label}</HmsBadge>,
      sub: (
        <>
          <span style={MONO}>{v.uhid}</span> · {v.doctor || 'Doctor not mapped'}
        </>
      ),
      metaLeft: `${VISIT_STATUS[v.status] || v.status}${v.source === 'FRONT_DESK' ? ' · front desk' : ' · online'}`,
      metaRight: visitAmount(v) ? format(visitAmount(v)) : '—',
    };
  });

  const total = (list: CashierOpdVisit[]) => list.reduce((s, v) => s + visitAmount(v), 0);
  const byMode = (list: CashierOpdVisit[]) => {
    const m: Record<string, number> = {};
    for (const v of list) {
      const k = (v.billing.mode || 'CASH').toUpperCase();
      m[k] = (m[k] || 0) + visitAmount(v);
    }
    return Object.entries(m);
  };

  const confirmReceive = async () => {
    if (!receive?.length) return;
    setBusy(true);
    try {
      const res = await billingService.reconcileDeskCash(
        receive.map((v) => v.id),
        note.trim() || undefined
      );
      notify(
        res.reconciled.length
          ? `${res.reconciled.length} desk fee${res.reconciled.length === 1 ? '' : 's'} received · ${format(res.total)}${res.skipped.length ? ` · ${res.skipped.length} already done` : ''}`
          : 'Nothing new to receive — those fees were already confirmed'
      );
      setReceive(null);
      setNote('');
      await data.reload();
    } catch (e) {
      notify(apiError(e, 'Could not confirm the desk handover'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const renderDetail = (key: string | null) => {
    if (data.loading && !visits.length) return <HmsEmpty>Loading today’s OPD visits…</HmsEmpty>;
    const v = visits.find((x) => `v:${x.id}` === key);
    if (!v) return <HmsEmpty>{visits.length ? 'Select a visit from the list.' : 'No OPD visits today yet. Tokens issued at the reception front desk appear here.'}</HmsEmpty>;
    const flag = opdFlag(v);
    const f = OPD_FLAG[flag];
    const b = v.billing;
    const rec = b.reconciled;

    return (
      <>
        <HmsDetailHeader
          icon={Stethoscope}
          title={`Token #${v.token} · ${v.patient_name}`}
          badge={<HmsBadge tone={f.tone}>{f.label}</HmsBadge>}
          subtitle={
            <>
              <span style={MONO}>{v.uhid}</span> · <span style={MONO}>{v.appointment_number}</span>
              {v.mobile ? ` · ${v.mobile}` : ''}
            </>
          }
        />
        <HmsStatStrip
          items={[
            { label: 'Visit', value: VISIT_STATUS[v.status] || v.status, note: v.slot ? `Slot ${v.slot}` : v.type },
            { label: 'Fee', value: visitAmount(v) ? format(visitAmount(v)) : '—', note: v.quoted_fee != null ? `Desk quoted ${format(Number(v.quoted_fee))}` : 'Tariff' },
            { label: 'Billing', value: f.label, tone: f.tone === 'red' ? 'red' : f.tone === 'amber' ? 'amber' : f.tone === 'green' ? 'green' : 'default' },
            { label: 'Source', value: v.source === 'FRONT_DESK' ? 'Front desk' : 'Online', note: `Booked ${fmtClock(v.created_at)}` },
          ]}
        />
        <HmsDetailBody>
          <HmsNotice tone={f.tone === 'red' ? 'red' : f.tone === 'green' ? 'green' : f.tone === 'amber' ? 'amber' : 'blue'}>{f.hint}</HmsNotice>

          <HmsSection title="Consultation">
            <HmsRow label="Doctor" value={v.doctor || 'Not mapped'} hint={v.department || undefined} />
            <HmsRow label="Visit type" value={v.type.replace(/_/g, ' ').toLowerCase()} />
            <HmsRow label="Status" value={VISIT_STATUS[v.status] || v.status} last />
          </HmsSection>

          <HmsSection title="Payment">
            {b.state === 'PAID_AT_DESK' ? (
              <>
                <HmsRow label="Collected at" value="Reception front desk" />
                <HmsRow label="Mode" value={b.mode || 'Cash'} />
                <HmsRow label="Desk receipt" value={<span style={MONO}>{b.invoice || '—'}</span>} />
                <HmsRow label="Handed to billing" value={rec ? `${rec.by} · ${fmtWhen(rec.at)}` : 'Not yet'} hint={rec?.note || undefined} last />
              </>
            ) : (
              <>
                <HmsRow label="Invoice" value={<span style={MONO}>{b.invoice || '—'}</span>} />
                <HmsRow label="Amount" value={b.amount != null ? format(Number(b.amount)) : '—'} />
                {b.balance != null && <HmsRow label="Balance" value={format(Number(b.balance))} />}
                <HmsRow label="Where it stands" value={f.label} last />
              </>
            )}
          </HmsSection>
        </HmsDetailBody>
        {flag === 'desk' && (
          <HmsDetailFooter>
            <HmsButton variant="primary" icon={HandCoins} block onClick={() => setReceive([v])}>
              Receive {format(visitAmount(v))} from the desk
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="sup-opd"
        title="OPD reconciliation"
        description="Today’s front-desk and online visits, checked so every consultation fee reaches billing."
        total={visits.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search patient, UHID, doctor or token"
        headerAction={
          <HmsButton size="sm" icon={HandCoins} disabled={!deskPending.length} onClick={() => setReceive(deskPending)} title={deskPending.length ? 'Receive all fees collected at the front desk (Alt+O)' : 'No desk fees waiting'}>
            Receive
          </HmsButton>
        }
        pills={[
          { key: 'all', label: 'All', count: visits.length },
          { key: 'leak', label: 'Seen · not paid', count: count('leak'), tone: 'red' },
          { key: 'desk', label: 'Desk cash', count: count('desk'), tone: 'amber' },
          { key: 'refund', label: 'Refund due', count: count('refund'), tone: 'amber' },
          { key: 'nocharge', label: 'No charge', count: count('nocharge'), tone: 'amber' },
          { key: 'settled', label: 'Settled', count: visits.filter((v) => SETTLED.includes(opdFlag(v))).length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open visit"
        detailLabel="OPD visit"
        emptyText="No visits match this search or filter."
        renderDetail={renderDetail}
      />
      {receive && (
        <HmsModal
          title={receive.length ? `Receive ${format(total(receive))} from the front desk?` : 'No desk fees waiting'}
          description={receive.length ? `${receive.length} visit${receive.length === 1 ? '' : 's'} paid at reception. Count the money with the desk before you confirm.` : 'Every fee collected at the front desk is already confirmed.'}
          onClose={() => setReceive(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setReceive(null)} data-autofocus>
                Cancel
              </HmsButton>
              {receive.length > 0 && (
                <HmsButton variant="primary" icon={HandCoins} onClick={confirmReceive} disabled={busy}>
                  {busy ? 'Confirming…' : 'Confirm received'}
                </HmsButton>
              )}
            </>
          }
        >
          {receive.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                {byMode(receive).map(([mode, amt], i, arr) => (
                  <HmsRow key={mode} label={mode.charAt(0) + mode.slice(1).toLowerCase()} value={format(amt)} last={i === arr.length - 1} />
                ))}
              </div>
              <HmsField label="Note (optional)" htmlFor="sup-desk-note" hint="e.g. cash bag number or who handed it over">
                <input id="sup-desk-note" style={INPUT} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
              </HmsField>
            </div>
          )}
        </HmsModal>
      )}
    </>
  );
};
