// Nurse — specimen collection. Lab orders waiting for a sample (OPD first), with Billing's collection clearance,
// samples the lab rejected for recollection, and what is already on its way through the lab. Collection goes to the
// lab server when signed in; the lab refuses an unpaid sample.
import React, { useState } from 'react';
import { FlaskConical, Printer } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsField, INPUT } from '../../components/hms';
import { MONO, printSlip } from '../reception/receptionData';
import { CollectModal } from './NurseModals';
import { NurseActions, NurseData, NurseLabOrder, inLab, isOpdOrder, toCollect } from './nurseData';

export interface NurseSpecimensViewProps {
  data: NurseData;
  act: NurseActions;
  initialFilter?: string;
}

const PILLS = ['collect', 'blocked', 'recollect', 'inlab', 'all'];
const STAGE: Record<string, string> = { COLLECTED: 'Collected', SAMPLE_COLLECTED: 'Collected', PROCESSING: 'In analysis', RESULT_ENTERED: 'Awaiting sign-off', VALIDATED: 'Validated', REPORT_GENERATED: 'Report ready', ORDERED: 'To collect' };

export const NurseSpecimensView: React.FC<NurseSpecimensViewProps> = ({ data, act, initialFilter }) => {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'opd' | 'all'>('opd');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'collect');
  const [selected, setSelected] = useState<string | null>(null);
  const [collect, setCollect] = useState<NurseLabOrder | null>(null);

  const orders = data.labOrders.filter((o) => !o.cancelled && o.stage !== 'REPORT_GENERATED' && (scope === 'all' || isOpdOrder(o)));
  const match: Record<string, (o: NurseLabOrder) => boolean> = {
    collect: (o) => toCollect(o) && o.billingOk !== false,
    blocked: (o) => toCollect(o) && o.billingOk === false,
    recollect: (o) => toCollect(o) && !!o.rejectedReason,
    inlab: inLab,
    all: () => true,
  };
  const pr = (o: NurseLabOrder) => (o.priority === 'STAT' ? 0 : o.priority === 'URGENT' ? 1 : 2);
  const q = search.trim().toLowerCase();
  const list = orders.filter((o) => match[pill](o) && (!q || [o.patientName, o.uhid, o.testName, o.orderNo, o.barcode, o.doctor].some((v) => (v || '').toLowerCase().includes(q)))).sort((a, b) => pr(a) - pr(b));
  const rows: HmsListRow[] = list.map((o) => ({
    key: `o:${o.id}`,
    title: `${o.patientName} · ${o.testName}`,
    badge: toCollect(o) ? o.billingOk === false ? <HmsBadge tone="red">Bill unpaid</HmsBadge> : o.rejectedReason ? <HmsBadge tone="amber">Recollect</HmsBadge> : <HmsBadge tone={o.priority === 'STAT' ? 'red' : 'amber'}>{o.priority === 'STAT' ? 'STAT' : 'To collect'}</HmsBadge> : <HmsBadge tone="blue">{STAGE[o.stage] || o.stage}</HmsBadge>,
    sub: <><span style={MONO}>{o.uhid}</span> · {o.sampleType || 'Sample'}{o.container ? ` · ${o.container}` : ''}</>,
    metaLeft: o.location || 'OPD',
    metaRight: o.orderNo,
  }));

  const renderDetail = (key: string | null) => {
    const o = data.labOrders.find((x) => `o:${x.id}` === key);
    if (!o) return <HmsEmpty>{orders.length ? 'Select an order from the list.' : 'No lab orders waiting. Tests the doctors order appear here for collection.'}</HmsEmpty>;
    const pending = toCollect(o);
    return (
      <>
        <HmsDetailHeader icon={FlaskConical} title={`${o.testName} · ${o.patientName}`} badge={<HmsBadge tone={pending ? 'amber' : 'blue'}>{STAGE[o.stage] || o.stage}</HmsBadge>} subtitle={<><span style={MONO}>{o.uhid}</span> · {o.age ? `${o.age} y` : '—'} · {o.gender || '—'} · {o.orderNo}</>} />
        <HmsStatStrip
          items={[
            { label: 'Priority', value: (o.priority || 'ROUTINE').toLowerCase(), tone: o.priority === 'STAT' ? 'red' : o.priority === 'URGENT' ? 'amber' : 'default' },
            { label: 'Sample', value: o.sampleType || '—', note: o.container || undefined },
            { label: 'Billing', value: o.billingOk === null ? '—' : o.billingOk ? 'Cleared' : 'Unpaid', tone: o.billingOk === false ? 'red' : o.billingOk ? 'green' : 'default', note: o.billingOk === null ? (data.labOnline ? 'Not known' : 'Offline demo') : undefined },
            { label: 'Collected', value: o.collectedAt || '—', note: o.sampleCollector },
          ]}
        />
        <HmsDetailBody>
          {pending && o.billingOk === false && <HmsNotice tone="red">Bill not settled{o.billingReason ? ` — ${o.billingReason}` : ''}. Send the patient to the cash counter; collect after payment.</HmsNotice>}
          {o.rejectedReason && pending && <HmsNotice tone="amber">The lab rejected the last sample: {o.rejectedReason}. Collect a fresh one.</HmsNotice>}
          <HmsSection title="Order">
            <HmsRow label="Test" value={o.testName} hint={o.category} />
            <HmsRow label="Ordered by" value={o.doctor || '—'} hint={o.location || undefined} />
            <HmsRow label="Barcode" value={o.barcode ? <span style={MONO}>{o.barcode}</span> : 'Printed at collection'} last />
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          {pending ? (
            <HmsButton variant="primary" icon={FlaskConical} block disabled={o.billingOk === false} onClick={() => setCollect(o)}>
              Collect sample
            </HmsButton>
          ) : (
            <HmsButton
              icon={Printer}
              block
              disabled={!o.barcode}
              onClick={() => {
                const ok = printSlip('Specimen label', [['Patient', o.patientName], ['UHID', o.uhid], ['Test', o.testName], ['Sample', `${o.sampleType || ''} ${o.container ? `· ${o.container}` : ''}`.trim()], ['Collected', `${o.collectedAt || '—'} · ${o.sampleCollector || ''}`.trim()]], o.barcode);
                if (!ok) act.notify('Allow pop-ups to print', 'error');
              }}
            >
              Reprint label
            </HmsButton>
          )}
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="nurse-specimens"
        title="Specimen collection"
        description="Samples to collect for lab orders, with Billing's clearance. STAT first."
        total={orders.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search patient, UHID, test, order or barcode"
        pills={[
          { key: 'collect', label: 'To collect', count: orders.filter(match.collect).length, tone: 'amber' },
          { key: 'blocked', label: 'Bill unpaid', count: orders.filter(match.blocked).length, tone: 'red' },
          { key: 'recollect', label: 'Recollect', count: orders.filter(match.recollect).length },
          { key: 'inlab', label: 'In lab', count: orders.filter(match.inlab).length },
          { key: 'all', label: 'All', count: orders.length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        leftExtra={
          <HmsField label="Show" htmlFor="spec-scope">
            <select id="spec-scope" style={INPUT} value={scope} onChange={(e) => { setScope(e.target.value as 'opd' | 'all'); setSelected(null); }}>
              <option value="opd">OPD orders</option>
              <option value="all">All locations (incl. IPD wards)</option>
            </select>
          </HmsField>
        }
        selectedKey={selected}
        onSelect={setSelected}
        onPrimary={(k) => {
          const o = data.labOrders.find((x) => `o:${x.id}` === k);
          if (o && toCollect(o) && o.billingOk !== false) setCollect(o);
        }}
        primaryLabel="collect sample"
        detailLabel="Order"
        emptyText="No orders match this search or filter."
        renderDetail={renderDetail}
      />
      {collect && (
        <CollectModal
          order={collect}
          userName={act.userName}
          onClose={() => setCollect(null)}
          onDone={() => {
            const o = collect;
            setCollect(null);
            data.reload();
            act.notify(`${o.sampleType || 'Sample'} collected for ${o.patientName} · ${o.testName}`);
          }}
        />
      )}
    </>
  );
};
