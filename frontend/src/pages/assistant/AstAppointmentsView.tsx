// Chamber desk — the doctor's appointment book for any day: who is booked, who has arrived, who is late. Send
// reminders, reschedule or book a new slot (the front desk checks patients in on arrival).
import React, { useState } from 'react';
import { CalendarCheck, CalendarPlus, CalendarClock, MessageSquare, Phone } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsField, INPUT } from '../../components/hms';
import { SharedAppointment } from '../../services/patientJourneyService';
import { MONO, fmtDate, sameDoctor, slotMinutes, todayIso } from '../reception/receptionData';
import { AssistantActions, AssistantData, copyText, message } from './assistantData';

export interface AstAppointmentsViewProps {
  data: AssistantData;
  act: AssistantActions;
  initialFilter?: string;
}

const PILLS = ['booked', 'late', 'arrived', 'missed', 'all'];

export const AstAppointmentsView: React.FC<AstAppointmentsViewProps> = ({ data, act, initialFilter }) => {
  const [date, setDate] = useState(todayIso());
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'booked');
  const [selected, setSelected] = useState<string | null>(null);
  const now = data.lastSync;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const day = data.doctor ? data.appointments.filter((a) => a.date === date && sameDoctor(a.doctor, data.doctor!.name)).sort((a, b) => (slotMinutes(a.slot) ?? 0) - (slotMinutes(b.slot) ?? 0)) : [];
  const isLate = (a: SharedAppointment) => a.status === 'BOOKED' && date === todayIso() && (slotMinutes(a.slot) ?? 0) + 15 < nowMin;
  const match: Record<string, (a: SharedAppointment) => boolean> = {
    booked: (a) => a.status === 'BOOKED',
    late: isLate,
    arrived: (a) => a.status === 'CHECKED_IN',
    missed: (a) => a.status === 'NO_SHOW' || a.status === 'CANCELLED',
    all: () => true,
  };
  const q = search.trim().toLowerCase();
  const list = day.filter((a) => match[pill](a) && (!q || [a.patient, a.uhid, a.phone, a.ref].some((v) => (v || '').toLowerCase().includes(q))));
  const badge = (a: SharedAppointment) =>
    a.status === 'CHECKED_IN' ? <HmsBadge tone="green">Arrived</HmsBadge> : a.status === 'CANCELLED' ? <HmsBadge tone="gray">Cancelled</HmsBadge> : a.status === 'NO_SHOW' ? <HmsBadge tone="gray">No-show</HmsBadge> : isLate(a) ? <HmsBadge tone="red">Late</HmsBadge> : <HmsBadge tone="blue">Booked</HmsBadge>;
  const rows: HmsListRow[] = list.map((a) => ({
    key: `a:${a.id}`,
    title: `${a.slot} · ${a.patient}`,
    badge: badge(a),
    sub: <><span style={MONO}>{a.uhid}</span> · {a.phone || 'no phone'}</>,
    metaLeft: a.visitType.replace('_', ' ').toLowerCase(),
    metaRight: a.token ? `Token #${String(a.token).padStart(2, '0')}` : a.ref,
  }));

  const renderDetail = (key: string | null) => {
    if (!data.doctor) return <HmsEmpty>Choose the doctor you are assisting (top bar).</HmsEmpty>;
    const a = data.appointments.find((x) => `a:${x.id}` === key);
    if (!a) return <HmsEmpty>{day.length ? 'Select an appointment from the list.' : `No appointments for ${data.doctor.name} on ${fmtDate(date)}.`}</HmsEmpty>;
    const reminded = data.log.filter((l) => l.kind === 'APPT_REMINDED' && l.ref === a.id);
    return (
      <>
        <HmsDetailHeader icon={CalendarCheck} title={`${a.patient} · ${a.slot}`} badge={badge(a)} subtitle={<><span style={MONO}>{a.uhid}</span> · {fmtDate(a.date)} · {a.ref}</>} />
        <HmsStatStrip
          items={[
            { label: 'Slot', value: a.slot, note: fmtDate(a.date) },
            { label: 'Visit', value: a.visitType.replace('_', ' ').toLowerCase() },
            { label: 'Phone', value: a.phone || '—' },
            { label: 'Reminders', value: reminded.length, note: reminded[0] ? `Last ${new Date(reminded[0].at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'None sent' },
          ]}
        />
        <HmsDetailBody>
          {isLate(a) && <HmsNotice tone="amber">More than 15 minutes past the slot. Call the patient or mark them a no-show at the front desk.</HmsNotice>}
          {a.status === 'CHECKED_IN' && <HmsNotice tone="green">Arrived — the patient is in the chamber queue{a.token ? ` as token #${String(a.token).padStart(2, '0')}` : ''}.</HmsNotice>}
          {a.cancelReason && <HmsNotice tone="amber">Cancelled: {a.cancelReason}</HmsNotice>}
          <HmsSection title="Booking">
            <HmsRow label="Booked by" value={a.bookedBy} hint={new Date(a.bookedAt).toLocaleString()} />
            <HmsRow label="Note" value={a.notes || '—'} last />
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
            {a.status === 'BOOKED' && (
              <HmsButton
                icon={MessageSquare}
                block
                onClick={async () => {
                  const ok = await copyText(message.appointment(a.patient, a.doctor, fmtDate(a.date), a.slot));
                  act.logAction('APPT_REMINDED', a.id, a.uhid);
                  act.notify(ok ? 'Reminder copied — paste it into SMS or WhatsApp' : 'Reminder logged (clipboard blocked by the browser)');
                }}
              >
                Copy reminder
              </HmsButton>
            )}
            {a.phone && (
              <HmsButton icon={Phone} block onClick={() => (window.location.href = `tel:${a.phone}`)}>
                Call {a.phone}
              </HmsButton>
            )}
            {a.status === 'BOOKED' && (
              <HmsButton icon={CalendarClock} block onClick={() => act.reschedule(a.id)}>
                Reschedule
              </HmsButton>
            )}
            <HmsButton icon={CalendarPlus} block onClick={() => act.book({ uhid: a.uhid })}>
              Book another visit
            </HmsButton>
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="ast-appts"
      title="Appointments"
      description={data.doctor ? `${data.doctor.name}'s booked slots. The front desk checks patients in.` : 'Choose the doctor you assist.'}
      total={day.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search name, UHID, phone or ref"
      leftExtra={
        <HmsField label="Day" htmlFor="ast-day">
          <input id="ast-day" type="date" style={INPUT} value={date} onChange={(e) => { setDate(e.target.value || todayIso()); setSelected(null); }} />
        </HmsField>
      }
      pills={[
        { key: 'booked', label: 'Booked', count: day.filter(match.booked).length },
        { key: 'late', label: 'Late', count: day.filter(isLate).length, tone: 'red' },
        { key: 'arrived', label: 'Arrived', count: day.filter(match.arrived).length },
        { key: 'missed', label: 'Missed', count: day.filter(match.missed).length },
        { key: 'all', label: 'All', count: day.length },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open booking"
      detailLabel="Appointment"
      emptyText="No appointments match this day or filter."
      renderDetail={renderDetail}
    />
  );
};
