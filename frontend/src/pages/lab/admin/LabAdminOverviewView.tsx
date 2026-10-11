// Lab Admin · Live orders — every lab order in the pipeline, read-only oversight.
// Bench work (collection, results, sign-off) stays in the Technician and Pathologist workspaces.
import React, { useMemo, useState } from 'react';
import { FlaskConical, CheckCircle2, Circle } from 'lucide-react';
import {
  HmsMasterDetail,
  HmsListRow,
  HmsBadge,
  HmsDetailHeader,
  HmsStatStrip,
  HmsDetailBody,
  HmsSection,
  HmsRow,
  HmsNotice,
  HmsEmpty,
  HMS,
} from '../../../components/hms';
import { STAGE_ORDER, STAGE_LABEL, stageGroup, tatMinutes, minutesOf, fmtMinutes, parseTatTarget } from '../data/labAdminStore';
import type { LabQueueOrder } from '../data/labDataStore';
import { LabAdminViewProps, StageBadge, PriorityBadge } from './labAdminUi';

const STAGE_TIME: Partial<Record<LabQueueOrder['stage'], keyof LabQueueOrder>> = {
  ORDERED: 'orderedAt',
  COLLECTED: 'collectedAt',
  RECEIVED: 'receivedAt',
  ACCESSIONED: 'accessionedAt',
  PROCESSING: 'processingAt',
  RESULT_ENTERED: 'enteredAt',
  SIGNED_OFF: 'signedOffAt',
};

const priorityRank = { STAT: 0, Urgent: 1, Routine: 2 } as const;

export const LabAdminOverviewView: React.FC<LabAdminViewProps> = ({ data, initialFilter }) => {
  const { orders, catalog } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'active');
  const [selected, setSelected] = useState<string | null>(null);

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const sorted = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const ra = a.stage === 'SIGNED_OFF' ? 1 : 0;
        const rb = b.stage === 'SIGNED_OFF' ? 1 : 0;
        if (ra !== rb) return ra - rb;
        const ca = a.isCritical ? 0 : 1;
        const cb = b.isCritical ? 0 : 1;
        if (ca !== cb) return ca - cb;
        if (priorityRank[a.priority] !== priorityRank[b.priority]) return priorityRank[a.priority] - priorityRank[b.priority];
        return (minutesOf(a.orderedAt) ?? 9999) - (minutesOf(b.orderedAt) ?? 9999);
      }),
    [orders]
  );

  const filters: Record<string, (o: LabQueueOrder) => boolean> = {
    active: (o) => o.stage !== 'SIGNED_OFF',
    urgent: (o) => o.priority === 'STAT' || !!o.isCritical,
    collection: (o) => stageGroup(o.stage) === 'collection',
    inlab: (o) => stageGroup(o.stage) === 'inlab',
    review: (o) => stageGroup(o.stage) === 'review',
    released: (o) => o.stage === 'SIGNED_OFF',
    all: () => true,
  };

  const q = search.trim().toLowerCase();
  const matches = (o: LabQueueOrder) =>
    !q || [o.patientName, o.uhid, o.orderNumber, o.testName, o.doctorName, o.specimenNumber].some((v) => (v || '').toLowerCase().includes(q));

  const visible = sorted.filter((o) => matches(o) && filters[pill](o));
  const pills = [
    { key: 'active', label: 'In progress', count: orders.filter(filters.active).length },
    { key: 'urgent', label: 'STAT & critical', count: orders.filter(filters.urgent).length, tone: 'red' as const },
    { key: 'collection', label: 'Awaiting collection', count: orders.filter(filters.collection).length, tone: 'amber' as const },
    { key: 'inlab', label: 'In lab', count: orders.filter(filters.inlab).length },
    { key: 'review', label: 'Awaiting sign-off', count: orders.filter(filters.review).length, tone: 'amber' as const },
    { key: 'released', label: 'Released', count: orders.filter(filters.released).length },
    { key: 'all', label: 'All', count: orders.length },
  ];

  const rows: HmsListRow[] = visible.map((o) => {
    const stepIdx = STAGE_ORDER.indexOf(o.stage);
    const tat = tatMinutes(o);
    return {
      key: o.id,
      title: o.patientName,
      badge: o.isCritical ? <HmsBadge tone="red">CRITICAL</HmsBadge> : <StageBadge stage={o.stage} />,
      sub: (
        <>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{o.orderNumber}</span> · {o.testName}
        </>
      ),
      metaLeft: `${o.priority} · ${o.doctorName}`,
      metaRight: tat !== null ? `TAT ${fmtMinutes(tat)}` : o.orderedAt ? `Ordered ${o.orderedAt}` : undefined,
      progress: { pct: ((stepIdx + 1) / STAGE_ORDER.length) * 100, doneLabel: 'Released to doctor', tone: o.isBlockedByDowntime ? 'red' : 'blue' },
    };
  });

  const renderDetail = (key: string | null) => {
    const o = orders.find((x) => x.id === key);
    if (!o) return <HmsEmpty>Select an order from the list to see its specimen journey.</HmsEmpty>;
    const stepIdx = STAGE_ORDER.indexOf(o.stage);
    const cat = catalog.find((c) => c.code === o.testCode);
    const target = parseTatTarget(o.priority === 'STAT' ? cat?.tatStat || cat?.tatTarget : cat?.tatTarget);
    const tat = tatMinutes(o);
    const start = minutesOf(o.orderedAt);
    const elapsed = tat ?? (start !== null && nowMinutes >= start ? nowMinutes - start : null);
    const late = target !== null && elapsed !== null && elapsed > target;
    return (
      <>
        <HmsDetailHeader
          icon={FlaskConical}
          title={o.patientName}
          badge={<PriorityBadge priority={o.priority} />}
          subtitle={`${o.orderNumber} · ${o.uhid} · ${o.age} y / ${o.gender}`}
          actions={<HmsBadge tone="gray">Read-only</HmsBadge>}
        />
        <HmsStatStrip
          items={[
            { label: 'Stage', value: STAGE_LABEL[o.stage], note: `Step ${stepIdx + 1} of ${STAGE_ORDER.length}` },
            { label: 'Ordered', value: o.orderedAt || '—', note: o.location },
            { label: tat !== null ? 'Turnaround' : 'Elapsed', value: fmtMinutes(elapsed), note: target !== null ? `Target ${fmtMinutes(target)}` : 'No target in catalog', tone: late ? 'red' : tat !== null ? 'green' : 'default' },
            { label: 'Specimen', value: o.specimenNumber, note: o.sampleType },
          ]}
        />
        <HmsDetailBody>
          {o.isCritical && (
            <HmsNotice tone="red">
              Critical value flagged{o.criticalAcknowledgedAt ? ` · acknowledged ${o.criticalAcknowledgedAt}` : ' · awaiting doctor acknowledgement'}
            </HmsNotice>
          )}
          {o.isBlockedByDowntime && <HmsNotice tone="red">Held: {o.blockedReason || 'analyzer offline'}</HmsNotice>}
          {o.returnedForRetest && <HmsNotice tone="amber">Returned for re-test{o.retestReason ? ` · ${o.retestReason}` : ''}{o.returnedBy ? ` · by ${o.returnedBy}` : ''}</HmsNotice>}
          {late && !o.isBlockedByDowntime && <HmsNotice tone="amber">Over the turnaround target by {fmtMinutes(elapsed! - target!)}</HmsNotice>}

          <HmsSection title="Specimen journey">
            {STAGE_ORDER.map((stage, i) => {
              const done = i <= stepIdx;
              const field = STAGE_TIME[stage];
              const time = field ? (o[field] as string | undefined) : undefined;
              return (
                <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: i < STAGE_ORDER.length - 1 ? `1px solid ${HMS.divider}` : 'none' }}>
                  {done ? <CheckCircle2 size={18} color={i === stepIdx && stage !== 'SIGNED_OFF' ? HMS.primary : '#16a34a'} /> : <Circle size={18} color="#cbd5e1" />}
                  <span style={{ flex: 1, fontSize: '14px', fontWeight: i === stepIdx ? 600 : 500, color: done ? HMS.text : HMS.textMuted }}>{STAGE_LABEL[stage]}</span>
                  <span style={{ fontSize: '13px', color: HMS.textSecondary }}>{done ? time || (i === stepIdx ? 'Current' : 'Done') : '—'}</span>
                </div>
              );
            })}
          </HmsSection>

          <HmsSection title="Test & specimen">
            <HmsRow label="Test" hint={`${o.testCode} · ${o.category}`} value={o.testName} />
            <HmsRow label="Sample" value={o.sampleType} />
            <HmsRow label="Analyzer" value={o.analyzerName || 'Not assigned yet'} />
            <HmsRow label="Technician" value={o.assignedTechnician || 'Not assigned yet'} />
            <HmsRow label="Signed off by" value={o.signedOffBy || '—'} last />
          </HmsSection>

          <HmsSection title="Requested by">
            <HmsRow label={o.doctorName} hint={o.location} value={<PriorityBadge priority={o.priority} />} last />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="lab-orders"
      title="Live orders"
      description="Every lab order from OPD, IPD and emergency, urgent first. Read-only — bench work happens in the Technician and Pathologist workspaces."
      total={orders.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search patient, UHID, order or test"
      pills={pills}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open details"
      detailLabel="Order"
      renderDetail={renderDetail}
    />
  );
};

export default LabAdminOverviewView;
