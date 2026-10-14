// Chamber desk — follow-ups the doctor asked for. Book the slot (it lands in the front desk's appointment book),
// send a reminder, and see which are overdue.
import React, { useState } from 'react';
import { CalendarHeart, CalendarPlus, MessageSquare, Phone } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty } from '../../components/hms';
import { SharedDoctorFollowUp } from '../../services/patientJourneyService';
import { MONO, fmtDate, sameDoctor, todayIso } from '../reception/receptionData';
import { AssistantActions, AssistantData, copyText, message } from './assistantData';

export interface AstFollowUpsViewProps {
  data: AssistantData;
  act: AssistantActions;
  initialFilter?: string;
}

const PILLS = ['tobook', 'overdue', 'booked', 'done', 'all'];

export const AstFollowUpsView: React.FC<AstFollowUpsViewProps> = ({ data, act, initialFilter }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'tobook');
  const [selected, setSelected] = useState<string | null>(null);

  const all = data.doctor ? data.followUps.filter((f) => sameDoctor(f.doctorName, data.doctor!.name)).sort((a, b) => a.followUpDate.localeCompare(b.followUpDate)) : [];
  const overdue = (f: SharedDoctorFollowUp) => f.status === 'PENDING_BOOKING' && f.followUpDate < todayIso();
  const match: Record<string, (f: SharedDoctorFollowUp) => boolean> = {
    tobook: (f) => f.status === 'PENDING_BOOKING',
    overdue,
    booked: (f) => f.status === 'BOOKED',
    done: (f) => f.status === 'COMPLETED',
    all: () => true,
  };
  const q = search.trim().toLowerCase();
  const list = all.filter((f) => match[pill](f) && (!q || [f.patientName, f.uhid, f.phone, f.reason].some((v) => (v || '').toLowerCase().includes(q))));
  const badge = (f: SharedDoctorFollowUp) => (f.status === 'BOOKED' ? <HmsBadge tone="green">Booked</HmsBadge> : f.status === 'COMPLETED' ? <HmsBadge tone="gray">Done</HmsBadge> : overdue(f) ? <HmsBadge tone="red">Overdue</HmsBadge> : <HmsBadge tone="amber">To book</HmsBadge>);
  const rows: HmsListRow[] = list.map((f) => ({
    key: `f:${f.id}`,
    title: `${f.patientName} · ${fmtDate(f.followUpDate)}`,
    badge: badge(f),
    sub: <><span style={MONO}>{f.uhid}</span> · {f.phone || 'no phone'}</>,
    metaLeft: f.reason || 'Review',
    metaRight: `Advised ${fmtDate(f.prescribedOn)}`,
  }));

  const renderDetail = (key: string | null) => {
    if (!data.doctor) return <HmsEmpty>Choose the doctor you are assisting (top bar).</HmsEmpty>;
    const f = all.find((x) => `f:${x.id}` === key);
    if (!f) return <HmsEmpty>{all.length ? 'Select a follow-up from the list.' : `${data.doctor.name} has not asked for any follow-ups yet.`}</HmsEmpty>;
    const appt = data.appointments.find((a) => a.followUpId === f.id && a.status !== 'CANCELLED');
    const reminders = data.log.filter((l) => l.kind === 'FOLLOWUP_REMINDED' && l.ref === f.id);
    const registered = data.patients.some((p) => p.uhid === f.uhid);
    return (
      <>
        <HmsDetailHeader icon={CalendarHeart} title={`${f.patientName} · follow-up`} badge={badge(f)} subtitle={<><span style={MONO}>{f.uhid}</span> · {f.phone || 'no phone'}</>} />
        <HmsStatStrip
          items={[
            { label: 'Due', value: fmtDate(f.followUpDate), tone: overdue(f) ? 'red' : 'default' },
            { label: 'Advised on', value: fmtDate(f.prescribedOn) },
            { label: 'Slot', value: appt ? appt.slot : '—', note: appt ? fmtDate(appt.date) : 'Not booked' },
            { label: 'Reminders', value: reminders.length, note: reminders[0] ? new Date(reminders[0].at).toLocaleDateString() : 'None sent' },
          ]}
        />
        <HmsDetailBody>
          {overdue(f) && <HmsNotice tone="red">The advised date has passed without a booking. Call the patient.</HmsNotice>}
          {!registered && <HmsNotice tone="amber">This patient is not in the patient master, so the slot must be booked at the front desk.</HmsNotice>}
          <HmsSection title="Doctor's instruction">
            <HmsRow label="Reason" value={f.reason || '—'} />
            <HmsRow label="Doctor" value={f.doctorName} last />
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
            {f.status === 'PENDING_BOOKING' && (
              <div style={{ gridColumn: '1 / -1' }}>
                <HmsButton variant="primary" icon={CalendarPlus} block disabled={!registered} onClick={() => act.book({ uhid: f.uhid, followUpId: f.id, visitType: 'FOLLOW_UP', date: f.followUpDate })}>
                  Book follow-up slot
                </HmsButton>
              </div>
            )}
            <HmsButton
              icon={MessageSquare}
              block
              onClick={async () => {
                const ok = await copyText(appt ? message.appointment(f.patientName, f.doctorName, fmtDate(appt.date), appt.slot) : message.followup(f.patientName, f.doctorName, fmtDate(f.followUpDate)));
                act.logAction('FOLLOWUP_REMINDED', f.id, f.uhid);
                act.notify(ok ? 'Reminder copied — paste it into SMS or WhatsApp' : 'Reminder logged (clipboard blocked by the browser)');
              }}
            >
              Copy reminder
            </HmsButton>
            {f.phone && (
              <HmsButton icon={Phone} block onClick={() => (window.location.href = `tel:${f.phone}`)}>
                Call {f.phone}
              </HmsButton>
            )}
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="ast-followups"
      title="Follow-ups"
      description={data.doctor ? `Return visits ${data.doctor.name} advised. Booking puts them in the appointment book.` : 'Choose the doctor you assist.'}
      total={all.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search name, UHID, phone or reason"
      pills={[
        { key: 'tobook', label: 'To book', count: all.filter(match.tobook).length, tone: 'amber' },
        { key: 'overdue', label: 'Overdue', count: all.filter(overdue).length, tone: 'red' },
        { key: 'booked', label: 'Booked', count: all.filter(match.booked).length },
        { key: 'done', label: 'Done', count: all.filter(match.done).length },
        { key: 'all', label: 'All', count: all.length },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open follow-up"
      detailLabel="Follow-up"
      emptyText="No follow-ups match this search or filter."
      renderDetail={renderDetail}
    />
  );
};
