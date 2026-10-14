// OPD Admin — audit log. Every change made from the OPD admin desk: fees (old → new with the reason), doctors,
// chambers, staff postings, roster, policies and live queue moves — who, when and what.
import React, { useState } from 'react';
import { History } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsSection, HmsRow, HmsEmpty } from '../../components/hms';
import { OpdAdminLogEntry } from '../../services/patientJourneyService';
import { OpdAdminData } from './opdAdminData';

export interface OaAuditViewProps {
  data: OpdAdminData;
  initialFilter?: string;
}

const KIND: Record<OpdAdminLogEntry['kind'], { label: string; tone: 'blue' | 'amber' | 'green' | 'gray' | 'red' }> = {
  TARIFF: { label: 'Fee', tone: 'amber' },
  DOCTOR: { label: 'Doctor', tone: 'blue' },
  ROOM: { label: 'Room', tone: 'gray' },
  STAFF: { label: 'Staff', tone: 'gray' },
  ROSTER: { label: 'Roster', tone: 'green' },
  POLICY: { label: 'Policy', tone: 'amber' },
  LIVE: { label: 'Live OPD', tone: 'red' },
};
const PILLS = ['all', 'TARIFF', 'DOCTOR', 'ROOM', 'STAFF', 'ROSTER', 'POLICY', 'LIVE'];

export const OaAuditView: React.FC<OaAuditViewProps> = ({ data, initialFilter }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const all = data.log;
  const q = search.trim().toLowerCase();
  const list = all.filter((l) => (pill === 'all' || l.kind === pill) && (!q || [l.subject, l.change, l.by].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = list.map((l) => ({
    key: l.id,
    title: l.subject,
    badge: <HmsBadge tone={KIND[l.kind].tone}>{KIND[l.kind].label}</HmsBadge>,
    sub: l.change,
    metaLeft: l.by,
    metaRight: new Date(l.at).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
  }));
  return (
    <HmsMasterDetail
      listId="oa-audit"
      title="Audit log"
      description="Every change made from this desk."
      total={all.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search subject, change or person"
      pills={PILLS.map((k) => ({ key: k, label: k === 'all' ? 'All' : KIND[k as OpdAdminLogEntry['kind']].label, count: k === 'all' ? all.length : all.filter((l) => l.kind === k).length }))}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open entry"
      detailLabel="Entry"
      emptyText={all.length ? 'Nothing matches this search or filter.' : 'No changes yet. Edits to fees, doctors, rooms, staff, roster and policies appear here.'}
      renderDetail={(key) => {
        const l = all.find((x) => x.id === key);
        if (!l) return <HmsEmpty>{all.length ? 'Select an entry.' : 'No changes recorded yet.'}</HmsEmpty>;
        return (
          <>
            <HmsDetailHeader icon={History} title={l.subject} badge={<HmsBadge tone={KIND[l.kind].tone}>{KIND[l.kind].label}</HmsBadge>} subtitle={`${l.by} · ${new Date(l.at).toLocaleString()}`} />
            <HmsStatStrip items={[{ label: 'Area', value: KIND[l.kind].label }, { label: 'By', value: l.by }, { label: 'Date', value: new Date(l.at).toLocaleDateString() }, { label: 'Time', value: new Date(l.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]} />
            <HmsDetailBody>
              <HmsSection title="Change">
                <HmsRow label="What changed" value={l.change} />
                {l.before !== undefined && <HmsRow label="Before" value={l.before || '—'} />}
                {l.after !== undefined && <HmsRow label="After" value={l.after || '—'} />}
                <HmsRow label="Reference" value={l.id} last />
              </HmsSection>
            </HmsDetailBody>
          </>
        );
      }}
    />
  );
};
