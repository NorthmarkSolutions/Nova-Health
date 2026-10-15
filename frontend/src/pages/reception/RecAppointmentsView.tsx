// Front Desk — advance OPD appointments for any day. Check a patient in when they arrive (issues the queue token),
// reschedule, cancel with a reason, mark a no-show, and copy a confirmation or reminder message for SMS / WhatsApp.
import React, { useState } from 'react';
import { CalendarCheck, LogIn, CalendarClock, X, UserX, Copy, CalendarPlus } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsField, HmsTone, INPUT } from '../../components/hms';
import { patientJourneyService, SharedAppointment, SharedQueueToken } from '../../services/patientJourneyService';
import { opdActions } from '../../services/opdActions';
import { useCurrency } from '../../config/currency';
import { ReasonModal } from './ReceptionModals';
import { DeskActions, ReceptionData, MONO, fmtDate, nextTokenNo, slotMinutes, todayIso, tokenLabel } from './receptionData';

export interface RecAppointmentsViewProps {
  data: ReceptionData;
  act: DeskActions;
  initialFilter?: string;
  initialSelect?: string;
}

const STATUS: Record<SharedAppointment['status'], { label: string; tone: HmsTone }> = {
  BOOKED: { label: 'Booked', tone: 'blue' },
  CHECKED_IN: { label: 'Checked in', tone: 'green' },
  CANCELLED: { label: 'Cancelled', tone: 'gray' },
  NO_SHOW: { label: 'No-show', tone: 'red' },
};
const PILLS = ['BOOKED', 'late', 'CHECKED_IN', 'NO_SHOW', 'CANCELLED', 'all'];
const VISIT: Record<string, string> = { NEW: 'New consultation', FOLLOW_UP: 'Follow-up', SECOND_OPINION: 'Second opinion' };

export const RecAppointmentsView: React.FC<RecAppointmentsViewProps> = ({ data, act, initialFilter, initialSelect }) => {
  const { format } = useCurrency();
  // Opening a specific appointment (e.g. right after booking it) shows its day
  const [date, setDate] = useState(() => data.appointments.find((a) => a.id === initialSelect)?.date || todayIso());
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'BOOKED');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `a:${initialSelect}` : null);
  const [cancel, setCancel] = useState<SharedAppointment | null>(null);
  const nowMin = data.lastSync.getHours() * 60 + data.lastSync.getMinutes();

  const day = data.appointments.filter((a) => a.date === date);
  const late = (a: SharedAppointment) => a.status === 'BOOKED' && (a.date < todayIso() || (a.date === todayIso() && (slotMinutes(a.slot) ?? 0) + 15 < nowMin));
  const match = (a: SharedAppointment, p: string) => (p === 'all' ? true : p === 'late' ? late(a) : a.status === p);
  const q = search.trim().toLowerCase();
  const list = day.filter((a) => match(a, pill) && (!q || [a.patient, a.uhid, a.phone, a.doctor, a.ref].some((v) => (v || '').toLowerCase().includes(q)))).sort((a, b) => (slotMinutes(a.slot) ?? 0) - (slotMinutes(b.slot) ?? 0));
  const rows: HmsListRow[] = list.map((a) => ({
    key: `a:${a.id}`,
    title: `${a.slot} · ${a.patient}`,
    badge: late(a) ? <HmsBadge tone="amber">Late</HmsBadge> : <HmsBadge tone={STATUS[a.status].tone}>{a.status === 'CHECKED_IN' && a.token ? `Token ${tokenLabel(a.token)}` : STATUS[a.status].label}</HmsBadge>,
    sub: (
      <>
        <span style={MONO}>{a.uhid}</span> · {a.doctor}
      </>
    ),
    metaLeft: VISIT[a.visitType] || a.visitType,
    metaRight: format(a.fee),
  }));

  const checkIn = (a: SharedAppointment) => {
    if (a.date !== todayIso()) return act.notify('Patients can be checked in only on the day of the appointment', 'error');
    const already = data.queue.find((t) => t.uhid === a.uhid && !['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(t.status));
    if (already) return act.notify(`${a.patient} already holds token ${tokenLabel(already.token)}`, 'error');
    const p = data.patients.find((x) => x.uhid === a.uhid);
    const no = nextTokenNo();
    const now = Date.now();
    const triage = Number(data.tariff.triageVitalsFee) || 0;
    const t: SharedQueueToken = {
      id: `tok-${now}`,
      token: no,
      aptNo: a.ref,
      uhid: a.uhid,
      patient: a.patient,
      age: a.age ?? p?.age ?? 0,
      gender: a.gender || String(p?.gender || ''),
      bloodGroup: p?.bloodGroup || '',
      phone: a.phone,
      doctor: `${a.doctor} (${a.specialty})`,
      room: a.room || 'Chamber not assigned',
      time: a.slot,
      type: a.visitType === 'FOLLOW_UP' ? 'FOLLOW_UP' : 'SCHEDULED',
      status: 'WAITING',
      priority: 'NORMAL',
      feePaid: false,
      totalFee: a.fee + triage,
      paymentMode: 'UNPAID',
      callingStatus: 'IDLE',
      waitingStartTime: new Date(now).toISOString(),
      allergies: p?.allergies || [],
      chronicConditions: p?.chronicConditions || [],
      triageNotes: a.notes,
    };
    const local = async () => {
      patientJourneyService.addQueueToken(t);
      patientJourneyService.updateAppointment(a.id, { status: 'CHECKED_IN', token: no });
      return no;
    };
    void opdActions.checkIn(a, a.fee + triage, local).then((token) => {
      data.reload();
      if (token !== null) act.notify(`${a.patient} checked in · token ${tokenLabel(token)}`);
    });
  };

  const message = (a: SharedAppointment) =>
    `North Hospital: ${a.patient}, your appointment with ${a.doctor} is on ${fmtDate(a.date)} at ${a.slot} (ref ${a.ref}). Please arrive 15 minutes early with your UHID ${a.uhid}${a.notes ? ` · ${a.notes}` : ''}.`;
  const copy = async (a: SharedAppointment) => {
    try {
      await navigator.clipboard.writeText(message(a));
      act.notify('Message copied — paste it into SMS or WhatsApp');
    } catch {
      act.notify('Could not copy to the clipboard', 'error');
    }
  };

  const renderDetail = (key: string | null) => {
    const a = data.appointments.find((x) => `a:${x.id}` === key);
    if (!a) return <HmsEmpty>{day.length ? 'Select an appointment from the list.' : `No appointments on ${fmtDate(date)}. Book one with Alt+B.`}</HmsEmpty>;
    const st = STATUS[a.status];
    const token = a.token ? data.queue.find((t) => t.token === a.token) : undefined;
    return (
      <>
        <HmsDetailHeader icon={CalendarCheck} title={`${a.patient} · ${a.slot}`} badge={<HmsBadge tone={late(a) ? 'amber' : st.tone}>{late(a) ? 'Late' : st.label}</HmsBadge>} subtitle={<><span style={MONO}>{a.ref}</span> · <span style={MONO}>{a.uhid}</span> · {a.phone}</>} />
        <HmsStatStrip
          items={[
            { label: 'When', value: a.slot, note: fmtDate(a.date) },
            { label: 'Doctor', value: a.doctor, note: a.specialty },
            { label: 'Visit', value: VISIT[a.visitType] || a.visitType, note: a.room || 'Chamber not assigned' },
            { label: 'Fee', value: format(a.fee), note: 'Collected at check-in or by the cashier' },
          ]}
        />
        <HmsDetailBody>
          {late(a) && <HmsNotice tone="amber">The patient has not arrived {a.date < todayIso() ? 'on the booked day' : 'within 15 minutes of the slot'}. Call them, or mark a no-show to free the doctor’s slot.</HmsNotice>}
          {a.status === 'CHECKED_IN' && <HmsNotice tone="green">Checked in as token {a.token ? tokenLabel(a.token) : '—'}{token ? ` · ${token.status.toLowerCase().replace(/_/g, ' ')}` : ''}.</HmsNotice>}
          {a.status === 'CANCELLED' && a.cancelReason && <HmsNotice tone="blue">Cancelled: {a.cancelReason}</HmsNotice>}
          <HmsSection title="Booking">
            <HmsRow label="Booked by" value={a.bookedBy} hint={new Date(a.bookedAt).toLocaleString('en-IN')} />
            {a.followUpId && <HmsRow label="Source" value="Doctor’s follow-up advice" />}
            <HmsRow label="Note" value={a.notes || '—'} last />
          </HmsSection>
          <HmsSection title="Message to patient">
            <HmsRow label={message(a)} last />
          </HmsSection>
        </HmsDetailBody>
        {a.status === 'BOOKED' && (
          <HmsDetailFooter>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
                <HmsButton icon={Copy} block onClick={() => copy(a)}>
                  Copy reminder
                </HmsButton>
                <HmsButton variant="primary" icon={LogIn} block disabled={a.date !== todayIso()} title={a.date !== todayIso() ? 'Check-in opens on the day' : 'Issue the queue token'} onClick={() => checkIn(a)}>
                  Check in
                </HmsButton>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                <HmsButton icon={CalendarClock} block onClick={() => act.reschedule(a)}>
                  Reschedule
                </HmsButton>
                <HmsButton variant="danger" icon={UserX} block disabled={!late(a)} title={late(a) ? undefined : 'Only after the slot has passed'} onClick={() => { void opdActions.bookingNoShow(a).then((ok) => { data.reload(); if (ok) act.notify(`${a.ref} marked no-show`); }); }}>
                  No-show
                </HmsButton>
                <HmsButton variant="danger" icon={X} block onClick={() => setCancel(a)}>
                  Cancel
                </HmsButton>
              </div>
            </div>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="rec-appointments"
        title="Appointments"
        description="Booked OPD slots. Check patients in on arrival; their token joins the live queue."
        total={day.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search patient, UHID, phone, doctor or ref"
        headerAction={
          <HmsButton size="sm" icon={CalendarPlus} onClick={() => act.book({ date })} title="Book an appointment (Alt+B)">
            Book
          </HmsButton>
        }
        pills={[
          { key: 'BOOKED', label: 'To arrive', count: day.filter((a) => a.status === 'BOOKED').length },
          { key: 'late', label: 'Late', count: day.filter(late).length, tone: 'amber' },
          { key: 'CHECKED_IN', label: 'Checked in', count: day.filter((a) => a.status === 'CHECKED_IN').length },
          { key: 'NO_SHOW', label: 'No-show', count: day.filter((a) => a.status === 'NO_SHOW').length, tone: 'red' },
          { key: 'CANCELLED', label: 'Cancelled', count: day.filter((a) => a.status === 'CANCELLED').length },
          { key: 'all', label: 'All', count: day.length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        leftExtra={
          <HmsField label="Day" htmlFor="appt-day">
            <input id="appt-day" type="date" style={INPUT} value={date} onChange={(e) => { setDate(e.target.value || todayIso()); setSelected(null); }} />
          </HmsField>
        }
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="check in"
        onPrimary={(k) => {
          const a = data.appointments.find((x) => `a:${x.id}` === k);
          if (a && a.status === 'BOOKED') checkIn(a);
        }}
        detailLabel="Appointment"
        emptyText="No appointments match this search or filter."
        renderDetail={renderDetail}
      />
      {cancel && (
        <ReasonModal
          title={`Cancel ${cancel.ref}?`}
          description={`${cancel.patient} · ${fmtDate(cancel.date)} ${cancel.slot} with ${cancel.doctor}. The slot becomes free.`}
          label="Reason"
          confirm="Cancel appointment"
          danger
          options={['Patient request', 'Doctor unavailable', 'Booked in error', 'Rescheduled by phone', 'Other']}
          onClose={() => setCancel(null)}
          onConfirm={(reason) => {
            const c = cancel;
            setCancel(null);
            void opdActions.cancelBooking(c, reason).then((ok) => {
              data.reload();
              if (ok) act.notify(`${c.ref} cancelled`);
            });
          }}
        />
      )}
    </>
  );
};
