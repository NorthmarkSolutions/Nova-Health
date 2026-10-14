// Doctor — emergency calls: Code Blue / rapid response calls and nurse escalations raised from the nurse station.
// Respond to take the call; it then closes on every doctor desk.
import React, { useState } from 'react';
import { Siren, Check } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty } from '../../components/hms';
import { patientJourneyService, SharedEmergencyAlert } from '../../services/patientJourneyService';
import { DoctorActions, DoctorData, liveAlerts } from './doctorData';

export interface DocAlertsViewProps {
  data: DoctorData;
  act: DoctorActions;
  initialFilter?: string;
}

const PILLS = ['active', 'attended', 'all'];
const raisedAt = (a: SharedEmergencyAlert) => new Date(Number(a.id.slice(4)));

export const DocAlertsView: React.FC<DocAlertsViewProps> = ({ data, act, initialFilter }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'active');
  const [selected, setSelected] = useState<string | null>(null);
  const all = liveAlerts(data.alerts).sort((a, b) => b.id.localeCompare(a.id));
  const match: Record<string, (a: SharedEmergencyAlert) => boolean> = { active: (a) => a.status === 'ACTIVE', attended: (a) => a.status === 'ATTENDED', all: () => true };
  const q = search.trim().toLowerCase();
  const list = all.filter((a) => match[pill](a) && (!q || [a.patientName, a.location, a.presentingCondition].some((v) => (v || '').toLowerCase().includes(q))));
  const badge = (a: SharedEmergencyAlert) => (a.status === 'ATTENDED' ? <HmsBadge tone="gray">Attended</HmsBadge> : a.triagePriority === 'RED_IMMEDIATE' ? <HmsBadge tone="red">Immediate</HmsBadge> : <HmsBadge tone="amber">Urgent</HmsBadge>);
  const rows: HmsListRow[] = list.map((a) => ({
    key: `a:${a.id}`,
    title: `${a.location} · ${a.patientName}`,
    badge: badge(a),
    sub: a.presentingCondition,
    metaLeft: `Called ${a.callTime}`,
    metaRight: raisedAt(a).toLocaleDateString(),
  }));

  const renderDetail = (key: string | null) => {
    const a = all.find((x) => `a:${x.id}` === key);
    if (!a) return <HmsEmpty>{all.length ? 'Select a call from the list.' : 'No emergency calls. Calls from the nurse station appear here at once.'}</HmsEmpty>;
    const mins = Math.max(0, Math.round((data.lastSync.getTime() - raisedAt(a).getTime()) / 60000));
    return (
      <>
        <HmsDetailHeader icon={Siren} title={a.location} badge={badge(a)} subtitle={`${a.patientName}${a.age ? ` · ${a.age} y` : ''}${a.gender && a.gender !== '—' ? ` · ${a.gender}` : ''}`} />
        <HmsStatStrip
          items={[
            { label: 'Called', value: a.callTime },
            { label: 'Open for', value: a.status === 'ACTIVE' ? `${mins} min` : '—', tone: a.status === 'ACTIVE' && mins >= 5 ? 'red' : 'default' },
            { label: 'Type', value: a.triagePriority === 'RED_IMMEDIATE' ? 'Immediate' : 'Urgent' },
            { label: 'Status', value: a.status === 'ACTIVE' ? 'Waiting for a doctor' : 'Attended' },
          ]}
        />
        <HmsDetailBody>
          {a.status === 'ACTIVE' && <HmsNotice tone="red">Nobody has taken this call yet.</HmsNotice>}
          <HmsSection title="Call">
            <HmsRow label="Condition" value={a.presentingCondition} />
            <HmsRow label="Location" value={a.location} last />
          </HmsSection>
        </HmsDetailBody>
        {a.status === 'ACTIVE' && (
          <HmsDetailFooter>
            <HmsButton
              variant="danger"
              icon={Check}
              block
              onClick={() => {
                patientJourneyService.markEmergencyAlertAttended(a.id);
                data.reload();
                act.notify(`You are attending ${a.location}`);
              }}
            >
              I'm attending
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="doc-alerts"
      title="Emergency calls"
      description="Code Blue, rapid response and nurse escalations."
      total={all.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search location, patient or condition"
      pills={[
        { key: 'active', label: 'Active', count: all.filter(match.active).length, tone: 'red' },
        { key: 'attended', label: 'Attended', count: all.filter(match.attended).length },
        { key: 'all', label: 'All', count: all.length },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open call"
      detailLabel="Call"
      emptyText="No calls match this search or filter."
      renderDetail={renderDetail}
    />
  );
};
