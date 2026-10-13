// Lab Technician · Sent for review — results the bench has released to the pathologist, and what happened next.
// Read-only: re-tests come back to Result entry automatically.
import React, { useState } from 'react';
import { ClipboardList } from 'lucide-react';
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
import { LabQueueOrder } from '../data/labDataStore';
import { fmtMinutes, minutesOf } from '../data/labAdminStore';
import { paramFlag, orderFlag, minutesSince } from '../data/pathologistStore';
import { isSubmitted } from '../data/technicianStore';
import { StageBadge } from '../admin/labAdminUi';
import { TechnicianViewProps } from './technicianUi';
import { LabMachineReportSection } from '../LabMachineReportSection';

const FLAG_TONE = { Critical: 'red', Abnormal: 'amber', Normal: 'green' } as const;
const FLAG_COLOR = { Critical: '#dc2626', Abnormal: '#b45309', Normal: '#15803d', Pending: HMS.textMuted } as const;

export const TechnicianSubmittedView: React.FC<TechnicianViewProps> = ({ data, by, initialFilter, initialSelect }) => {
  const { orders } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);

  const submitted = orders.filter(isSubmitted).sort((a, b) => (minutesOf(b.enteredAt) ?? -1) - (minutesOf(a.enteredAt) ?? -1));
  const filters: Record<string, (o: LabQueueOrder) => boolean> = {
    all: () => true,
    review: (o) => o.stage !== 'SIGNED_OFF',
    signed: (o) => o.stage === 'SIGNED_OFF',
    critical: (o) => orderFlag(o) === 'Critical',
    mine: (o) => o.assignedTechnician === by,
  };
  const q = search.trim().toLowerCase();
  const visible = submitted.filter((o) => (filters[pill] || filters.all)(o) && (!q || [o.patientName, o.uhid, o.orderNumber, o.specimenNumber, o.testName].some((v) => v.toLowerCase().includes(q))));
  const count = (k: string) => submitted.filter(filters[k]).length;

  const pills = [
    { key: 'all', label: 'All', count: submitted.length },
    { key: 'review', label: 'With pathologist', count: count('review') },
    { key: 'signed', label: 'Signed off', count: count('signed') },
    { key: 'critical', label: 'Critical', count: count('critical'), tone: 'red' as const },
    { key: 'mine', label: 'Entered by me', count: count('mine') },
  ];

  const rows: HmsListRow[] = visible.map((o) => ({
    key: o.id,
    title: o.patientName,
    badge: <StageBadge stage={o.stage} />,
    sub: (
      <>
        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{o.specimenNumber}</span> · {o.testName}
      </>
    ),
    metaLeft: o.enteredAt ? `Entered ${o.enteredAt}${o.assignedTechnician ? ` · ${o.assignedTechnician}` : ''}` : 'Entry time not recorded',
    metaRight: <HmsBadge tone={FLAG_TONE[orderFlag(o)]}>{orderFlag(o)}</HmsBadge>,
  }));

  const renderDetail = (key: string | null) => {
    const o = orders.find((x) => x.id === key);
    if (!o) return <HmsEmpty>Nothing sent for review yet.</HmsEmpty>;
    const waiting = o.stage !== 'SIGNED_OFF' ? minutesSince(o.enteredAt) : null;
    return (
      <>
        <HmsDetailHeader icon={ClipboardList} title={o.patientName} badge={<StageBadge stage={o.stage} />} subtitle={`${o.uhid} · ${o.specimenNumber} · ${o.testName}`} />
        <HmsStatStrip
          items={[
            { label: 'Entered', value: o.enteredAt || '—', note: o.assignedTechnician || 'Technician not recorded' },
            { label: 'Result flag', value: <HmsBadge tone={FLAG_TONE[orderFlag(o)]}>{orderFlag(o)}</HmsBadge> },
            { label: o.stage === 'SIGNED_OFF' ? 'Signed off' : 'With pathologist', value: o.stage === 'SIGNED_OFF' ? o.signedOffAt || '—' : fmtMinutes(waiting), note: o.stage === 'SIGNED_OFF' ? o.signedOffBy || 'Signer not recorded' : 'Since entry' },
            { label: 'Analyzer', value: o.analyzerName || '—' },
          ]}
        />
        <HmsDetailBody>
          {o.stage === 'SIGNED_OFF' && o.pathologistInterpretation && <HmsNotice tone="green">Pathologist: {o.pathologistInterpretation}</HmsNotice>}
          {o.stage !== 'SIGNED_OFF' && orderFlag(o) === 'Critical' && <HmsNotice tone="red">Critical result waiting for the pathologist. Make sure the pathologist on duty has been told.</HmsNotice>}
          <HmsSection title="Results sent">
            {o.parameters.map((p, idx) => {
              const f = paramFlag(p);
              return (
                <HmsRow
                  key={p.name}
                  last={idx === o.parameters.length - 1}
                  label={p.name}
                  hint={`Ref ${p.low}–${p.high} ${p.unit}`}
                  value={<span style={{ fontWeight: 700, color: FLAG_COLOR[f] }}>{p.observedValue ?? '—'} {p.unit}</span>}
                />
              );
            })}
          </HmsSection>
          {/* Upload stays open until the pathologist signs; after that only an addendum can change it */}
          <LabMachineReportSection canUpload={o.stage !== 'SIGNED_OFF'} />

          <HmsSection title="Run note" padded>
            <div style={{ fontSize: '14px', color: o.technicianNote ? HMS.text : HMS.textSecondary, lineHeight: 1.6 }}>{o.technicianNote || 'No note was added.'}</div>
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="tech-submitted"
      title="Sent for review"
      description="Results released to the pathologist, newest first. Re-tests return to Result entry."
      total={submitted.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search patient, specimen or test"
      pills={pills}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="Submitted result"
      renderDetail={renderDetail}
    />
  );
};

export default TechnicianSubmittedView;
