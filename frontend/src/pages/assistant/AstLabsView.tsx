// Chamber desk — lab tracking for the doctor's patients. Where each test is (ordered, collected, in the lab, report
// ready), overdue against the test's turnaround, and whether the patient has been told. Result values are never shown
// here: they are for the doctor.
import React, { useState } from 'react';
import { FlaskConical, MessageSquare, Phone, ShieldCheck, Check } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty } from '../../components/hms';
import { MONO, fmtWait, tokenLabel } from '../reception/receptionData';
import { AssistantActions, AssistantData, AstLabOrder, copyText, message } from './assistantData';

export interface AstLabsViewProps {
  data: AssistantData;
  act: AssistantActions;
  initialFilter?: string;
}

const PILLS = ['ready', 'progress', 'overdue', 'informed', 'all'];
const STEPS: [string, AstLabOrder['stage'][]][] = [
  ['Ordered', ['ORDERED']],
  ['Sample collected', ['COLLECTED', 'SAMPLE_COLLECTED']],
  ['In the lab', ['PROCESSING', 'RESULT_ENTERED', 'VALIDATED']],
  ['Report ready', ['REPORT_GENERATED']],
];
const stepOf = (o: AstLabOrder) => STEPS.findIndex(([, s]) => s.includes(o.stage));

export const AstLabsView: React.FC<AstLabsViewProps> = ({ data, act, initialFilter }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'ready');
  const [selected, setSelected] = useState<string | null>(null);

  const orders = data.labOrders.filter((o) => !o.cancelled);
  const informed = (o: AstLabOrder) => data.log.find((l) => l.kind === 'LAB_INFORMED' && l.ref === o.id);
  const ready = (o: AstLabOrder) => o.stage === 'REPORT_GENERATED';
  const overdue = (o: AstLabOrder) => !ready(o) && o.ageMin !== null && o.tatMin !== null && o.tatMin > 0 && o.ageMin > o.tatMin;
  const match: Record<string, (o: AstLabOrder) => boolean> = {
    ready: (o) => ready(o) && !informed(o),
    progress: (o) => !ready(o),
    overdue,
    informed: (o) => !!informed(o),
    all: () => true,
  };
  const q = search.trim().toLowerCase();
  const list = orders.filter((o) => match[pill](o) && (!q || [o.patientName, o.uhid, o.testName, o.orderNo].some((v) => (v || '').toLowerCase().includes(q))));
  const badge = (o: AstLabOrder) => (ready(o) ? (informed(o) ? <HmsBadge tone="gray">Patient told</HmsBadge> : <HmsBadge tone="green">Report ready</HmsBadge>) : overdue(o) ? <HmsBadge tone="red">Overdue</HmsBadge> : <HmsBadge tone="blue">{STEPS[Math.max(0, stepOf(o))][0]}</HmsBadge>);
  const rows: HmsListRow[] = list.map((o) => ({
    key: `o:${o.id}`,
    title: `${o.patientName} · ${o.testName}`,
    badge: badge(o),
    sub: <><span style={MONO}>{o.uhid}</span> · {o.orderNo}</>,
    metaLeft: o.priority && o.priority !== 'ROUTINE' ? o.priority : o.category,
    metaRight: o.ageMin !== null ? `${fmtWait(o.ageMin)} since order` : undefined,
    progress: { pct: Math.round(((Math.max(0, stepOf(o)) + 1) / STEPS.length) * 100), doneLabel: 'Report ready', tone: overdue(o) ? 'red' : 'blue' },
  }));

  const renderDetail = (key: string | null) => {
    if (!data.doctor) return <HmsEmpty>Choose the doctor you are assisting (top bar).</HmsEmpty>;
    const o = orders.find((x) => `o:${x.id}` === key);
    if (!o) return <HmsEmpty>{orders.length ? 'Select a test from the list.' : `No lab tests ordered by ${data.doctor.name}.`}</HmsEmpty>;
    const step = stepOf(o);
    const inf = informed(o);
    const tok = data.mine.find((t) => t.uhid === o.uhid && !['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(t.status));
    const phone = tok?.phone || data.patients.find((p) => p.uhid === o.uhid)?.phone;
    return (
      <>
        <HmsDetailHeader icon={FlaskConical} title={`${o.testName} · ${o.patientName}`} badge={badge(o)} subtitle={<><span style={MONO}>{o.uhid}</span> · {o.orderNo} · {o.sampleType || 'sample'}</>} />
        <HmsStatStrip
          items={[
            { label: 'Stage', value: STEPS[Math.max(0, step)][0] },
            { label: 'Open for', value: fmtWait(o.ageMin), note: o.tatMin ? `Target ${fmtWait(o.tatMin)}` : 'No target on file', tone: overdue(o) ? 'red' : 'default' },
            { label: 'Priority', value: (o.priority || 'ROUTINE').toLowerCase(), tone: o.priority === 'STAT' ? 'red' : 'default' },
            { label: 'Patient', value: tok ? `In clinic ${tokenLabel(tok.token)}` : 'Not in clinic', note: phone || undefined },
          ]}
        />
        <HmsDetailBody>
          {inf && <HmsNotice tone="green">Patient told by {inf.by} at {new Date(inf.at).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}{inf.note ? ` · ${inf.note}` : ''}.</HmsNotice>}
          {overdue(o) && <HmsNotice tone="red">Past the lab's turnaround time. Ask the lab about this sample.</HmsNotice>}
          {o.stage === 'ORDERED' && <HmsNotice tone="amber">Sample not collected yet — send the patient to the nurse / sample collection (after paying at the cash counter if needed).</HmsNotice>}
          <HmsSection title="Progress">
            {STEPS.map(([label], i) => (
              <HmsRow key={label} label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>{i <= step ? <Check size={16} color="#16a34a" aria-label="Done" /> : <span style={{ width: 16 }} />}{label}</span>} value={i === 1 && o.collectedAt ? `${o.collectedAt}${o.sampleCollector ? ` · ${o.sampleCollector}` : ''}` : i === 3 && o.approvedAt ? o.approvedAt : i <= step ? 'Done' : '—'} last={i === STEPS.length - 1} />
            ))}
          </HmsSection>
          <HmsNotice tone="blue">
            <ShieldCheck size={14} style={{ verticalAlign: '-2px' }} /> Result values are for the doctor only and are not shown on the chamber desk.
          </HmsNotice>
        </HmsDetailBody>
        {ready(o) && (
          <HmsDetailFooter>
            <div style={{ display: 'grid', gridTemplateColumns: phone ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: '10px', width: '100%' }}>
              <HmsButton
                variant={inf ? 'secondary' : 'primary'}
                icon={MessageSquare}
                block
                onClick={async () => {
                  const ok = await copyText(message.report(o.patientName, o.testName, data.doctor!.name));
                  act.logAction('LAB_INFORMED', o.id, o.uhid, ok ? 'Message copied for SMS / WhatsApp' : undefined);
                  act.notify(ok ? 'Message copied and patient marked as told' : 'Patient marked as told (clipboard blocked by the browser)');
                }}
              >
                {inf ? 'Copy message again' : 'Copy message & mark told'}
              </HmsButton>
              {phone && (
                <HmsButton icon={Phone} block onClick={() => (window.location.href = `tel:${phone}`)}>
                  Call {phone}
                </HmsButton>
              )}
            </div>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="ast-labs"
      title="Lab tracking"
      description={data.doctor ? `Tests ${data.doctor.name} ordered — status only, no result values.` : 'Choose the doctor you assist.'}
      total={orders.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search patient, UHID, test or order"
      pills={[
        { key: 'ready', label: 'Ready — tell patient', count: orders.filter(match.ready).length, tone: 'amber' },
        { key: 'progress', label: 'In progress', count: orders.filter(match.progress).length },
        { key: 'overdue', label: 'Overdue', count: orders.filter(overdue).length, tone: 'red' },
        { key: 'informed', label: 'Told', count: orders.filter(match.informed).length },
        { key: 'all', label: 'All', count: orders.length },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open test"
      detailLabel="Test"
      emptyText="No tests match this search or filter."
      renderDetail={renderDetail}
    />
  );
};
