// Front Desk — follow-ups the doctors asked for. Book each one into an appointment slot, copy a reminder for the
// patient, and see which are overdue (the advised date has passed without a booking).
import React, { useState } from 'react';
import { CalendarHeart, CalendarPlus, Copy } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty } from '../../components/hms';
import { SharedDoctorFollowUp } from '../../services/patientJourneyService';
import { DeskActions, ReceptionData, MONO, fmtDate, todayIso } from './receptionData';

export interface RecFollowUpsViewProps {
  data: ReceptionData;
  act: DeskActions;
  initialFilter?: string;
}

const PILLS = ['pending', 'overdue', 'BOOKED', 'COMPLETED'];

export const RecFollowUpsView: React.FC<RecFollowUpsViewProps> = ({ data, act, initialFilter }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'pending');
  const [selected, setSelected] = useState<string | null>(null);
  const today = todayIso();
  const overdue = (f: SharedDoctorFollowUp) => f.status === 'PENDING_BOOKING' && f.followUpDate < today;
  const match = (f: SharedDoctorFollowUp, p: string) => (p === 'pending' ? f.status === 'PENDING_BOOKING' : p === 'overdue' ? overdue(f) : f.status === p);
  const q = search.trim().toLowerCase();
  const list = data.followUps.filter((f) => match(f, pill) && (!q || [f.patientName, f.uhid, f.phone, f.doctorName, f.reason].some((v) => (v || '').toLowerCase().includes(q)))).sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));
  const rows: HmsListRow[] = list.map((f) => ({
    key: `f:${f.id}`,
    title: f.patientName,
    badge: overdue(f) ? <HmsBadge tone="red">Overdue</HmsBadge> : f.status === 'BOOKED' ? <HmsBadge tone="green">Booked</HmsBadge> : f.status === 'COMPLETED' ? <HmsBadge tone="gray">Done</HmsBadge> : <HmsBadge tone="amber">To book</HmsBadge>,
    sub: (
      <>
        <span style={MONO}>{f.uhid}</span> · {f.doctorName}
      </>
    ),
    metaLeft: `Due ${fmtDate(f.followUpDate)}`,
    metaRight: f.bookedSlot || f.phone,
  }));

  const msg = (f: SharedDoctorFollowUp) => `North Hospital: ${f.patientName}, ${f.doctorName} has advised a follow-up visit around ${fmtDate(f.followUpDate)} (${f.reason}). Please call the front desk to book your slot.`;

  const renderDetail = (key: string | null) => {
    const f = data.followUps.find((x) => `f:${x.id}` === key);
    if (!f) return <HmsEmpty>{data.followUps.length ? 'Select a follow-up from the list.' : 'No follow-ups have been advised by the doctors yet.'}</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={CalendarHeart} title={f.patientName} badge={overdue(f) ? <HmsBadge tone="red">Overdue</HmsBadge> : f.status === 'BOOKED' ? <HmsBadge tone="green">Booked</HmsBadge> : <HmsBadge tone="amber">To book</HmsBadge>} subtitle={<><span style={MONO}>{f.uhid}</span> · {f.phone}</>} />
        <HmsStatStrip
          items={[
            { label: 'Advised by', value: f.doctorName },
            { label: 'Advised on', value: fmtDate(f.prescribedOn) },
            { label: 'Follow-up due', value: fmtDate(f.followUpDate), tone: overdue(f) ? 'red' : 'default' },
            { label: 'Booked', value: f.bookedSlot || '—' },
          ]}
        />
        <HmsDetailBody>
          {overdue(f) && <HmsNotice tone="red">The advised date has passed. Call the patient to book.</HmsNotice>}
          <HmsSection title="Doctor’s advice">
            <HmsRow label="Reason" value={f.reason} />
            <HmsRow label="Clinical note" value={f.clinicalNotes || '—'} last />
          </HmsSection>
          <HmsSection title="Reminder message">
            <HmsRow label={msg(f)} last />
          </HmsSection>
        </HmsDetailBody>
        {f.status === 'PENDING_BOOKING' && (
          <HmsDetailFooter>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
              <HmsButton
                icon={Copy}
                block
                onClick={() =>
                  navigator.clipboard
                    .writeText(msg(f))
                    .then(() => act.notify('Reminder copied'))
                    .catch(() => act.notify('Could not copy to the clipboard', 'error'))
                }
              >
                Copy reminder
              </HmsButton>
              <HmsButton
                variant="primary"
                icon={CalendarPlus}
                block
                disabled={!data.patients.some((p) => p.uhid === f.uhid)}
                title={data.patients.some((p) => p.uhid === f.uhid) ? 'Book the follow-up slot' : 'Patient is not in the directory'}
                onClick={() => act.book({ uhid: f.uhid, doctor: f.doctorName, date: f.followUpDate, followUpId: f.id, visitType: 'FOLLOW_UP' })}
              >
                Book follow-up
              </HmsButton>
            </div>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="rec-followups"
      title="Doctor follow-ups"
      description="Follow-up visits the doctors advised. Book them before the due date."
      total={data.followUps.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search patient, UHID, phone or doctor"
      pills={[
        { key: 'pending', label: 'To book', count: data.followUps.filter((f) => f.status === 'PENDING_BOOKING').length },
        { key: 'overdue', label: 'Overdue', count: data.followUps.filter(overdue).length, tone: 'red' },
        { key: 'BOOKED', label: 'Booked', count: data.followUps.filter((f) => f.status === 'BOOKED').length },
        { key: 'COMPLETED', label: 'Done', count: data.followUps.filter((f) => f.status === 'COMPLETED').length },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="book"
      detailLabel="Follow-up"
      emptyText="No follow-ups match this search or filter."
      renderDetail={renderDetail}
    />
  );
};
