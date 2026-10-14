// Front Desk — OPD doctors and their chambers: who is seeing whom now, how many are waiting, the longest wait,
// today's booked slots. Call the next patient for a doctor, mark the chamber free or busy, issue a token or book.
import React, { useState } from 'react';
import { Stethoscope, Megaphone, Ticket, CalendarPlus, DoorOpen } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty } from '../../components/hms';
import { saveDepartmentRoom } from '../department/departmentWorkspaceStore';
import { patientJourneyService } from '../../services/patientJourneyService';
import { useCurrency } from '../../config/currency';
import { DeskActions, DeskDoctor, ReceptionData, LONG_WAIT_MIN, MONO, fmtWait, isDone, isWaiting, isWithDoctor, sameDoctor, slotMinutes, todayIso, tokenLabel, waitMinutes } from './receptionData';

export interface RecDoctorsViewProps {
  data: ReceptionData;
  act: DeskActions;
  initialFilter?: string;
}

const PILLS = ['all', 'busy', 'free', 'queue'];

/** Doctor status the chamber desk sets; only "away" states are worth showing here. */
const AWAY: Record<string, string> = { BREAK: 'On a break', ROUNDS: 'On ward rounds', OT: 'In OT', LATE: 'Running late', OUT: 'Left for the day' };

export const RecDoctorsView: React.FC<RecDoctorsViewProps> = ({ data, act, initialFilter }) => {
  const sessions = patientJourneyService.getDoctorSessions();
  const away = (d: DeskDoctor) => {
    const x = sessions[d.name];
    return x && x.status !== 'IN' && new Date(x.since).toDateString() === new Date().toDateString() ? x : null;
  };
  const { format } = useCurrency();
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const now = data.lastSync.getTime();

  const tokensOf = (d: DeskDoctor) => data.queue.filter((t) => sameDoctor(t.doctor, d.name));
  const waitingOf = (d: DeskDoctor) => tokensOf(d).filter(isWaiting).sort((a, b) => a.token - b.token);
  const servingOf = (d: DeskDoctor) => tokensOf(d).find((t) => isWithDoctor(t));
  const busy = (d: DeskDoctor) => !!servingOf(d) || d.room?.status === 'IN_CONSULTATION';
  const match = (d: DeskDoctor, p: string) => (p === 'all' ? true : p === 'busy' ? busy(d) : p === 'free' ? !busy(d) : waitingOf(d).length >= 3);
  const q = search.trim().toLowerCase();
  const list = data.doctors.filter((d) => match(d, pill) && (!q || [d.name, d.specialty, d.room?.roomNumber, d.room?.name].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = list.map((d) => {
    const w = waitingOf(d);
    const done = tokensOf(d).filter(isDone).length;
    const total = tokensOf(d).length;
    const longest = Math.max(-1, ...w.map((t) => waitMinutes(t, now) ?? -1));
    return {
      key: `d:${d.id}`,
      title: d.name,
      badge: away(d) ? <HmsBadge tone={away(d)!.status === 'LATE' ? 'red' : 'amber'}>{AWAY[away(d)!.status]}</HmsBadge> : busy(d) ? <HmsBadge tone="green">Seeing patient</HmsBadge> : <HmsBadge tone="blue">Free</HmsBadge>,
      sub: `${d.specialty} · ${d.room ? d.room.roomNumber : 'no chamber'}`,
      metaLeft: `${w.length} waiting${longest >= 0 ? ` · longest ${fmtWait(longest)}` : ''}`,
      metaRight: `${done} of ${total} seen`,
      progress: total ? { pct: (done / total) * 100, doneLabel: 'All seen', tone: longest > LONG_WAIT_MIN ? 'red' : 'blue' } : undefined,
    };
  });

  const renderDetail = (key: string | null) => {
    if (!data.doctors.length) return <HmsEmpty>No OPD doctors are set up. Department Admin adds doctors, fees and chambers under the OPD department.</HmsEmpty>;
    const d = data.doctors.find((x) => `d:${x.id}` === key);
    if (!d) return <HmsEmpty>Select a doctor from the list.</HmsEmpty>;
    const w = waitingOf(d);
    const serving = servingOf(d);
    const done = tokensOf(d).filter(isDone).length;
    const booked = data.appointments.filter((a) => a.date === todayIso() && a.status === 'BOOKED' && sameDoctor(a.doctor, d.name)).sort((a, b) => (slotMinutes(a.slot) ?? 0) - (slotMinutes(b.slot) ?? 0));
    return (
      <>
        <HmsDetailHeader icon={Stethoscope} title={d.name} badge={busy(d) ? <HmsBadge tone="green">Seeing patient</HmsBadge> : <HmsBadge tone="blue">Free</HmsBadge>} subtitle={`${d.specialty} · ${d.room ? `${d.room.roomNumber}${d.room.name ? ` · ${d.room.name}` : ''}` : 'no chamber assigned'}`} />
        <HmsStatStrip
          items={[
            { label: 'Now seeing', value: serving ? tokenLabel(serving.token) : '—', note: serving ? serving.patient : 'Nobody' },
            { label: 'Waiting', value: w.length, tone: w.length >= 5 ? 'amber' : 'default' },
            { label: 'Seen today', value: done },
            { label: 'Fee', value: format(d.fee), note: `Follow-up ${format(d.followUpFee)}` },
          ]}
        />
        <HmsDetailBody>
          {away(d) && (
            <HmsNotice tone={away(d)!.status === 'LATE' ? 'red' : 'amber'}>
              {AWAY[away(d)!.status]}
              {away(d)!.until ? ` · expected ${away(d)!.until}` : ''}
              {away(d)!.note ? ` · ${away(d)!.note}` : ''} — set by the chamber desk at {new Date(away(d)!.since).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Tell waiting patients.
            </HmsNotice>
          )}
          {!d.room && <HmsNotice tone="amber">No chamber is assigned to this doctor in the OPD room master, so patients are told “chamber not assigned”.</HmsNotice>}
          <HmsSection title={`Waiting · ${w.length}`}>
            {w.length === 0 && <HmsRow label="Nobody waiting" last />}
            {w.slice(0, 8).map((t, i, arr) => {
              const m = waitMinutes(t, now);
              return <HmsRow key={t.token} label={`${tokenLabel(t.token)} · ${t.patient}`} hint={<><span style={MONO}>{t.uhid}</span> · {t.status.toLowerCase().replace(/_/g, ' ')}</>} value={<HmsBadge tone={m !== null && m > LONG_WAIT_MIN ? 'red' : 'gray'}>{fmtWait(m)}</HmsBadge>} last={i === arr.length - 1} />;
            })}
          </HmsSection>
          <HmsSection title={`Booked for later today · ${booked.length}`}>
            {booked.length === 0 && <HmsRow label="No booked slots left today" last />}
            {booked.map((a, i) => (
              <HmsRow key={a.id} label={`${a.slot} · ${a.patient}`} hint={a.ref} value={a.visitType === 'FOLLOW_UP' ? 'Follow-up' : 'New'} last={i === booked.length - 1} />
            ))}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <HmsButton variant="primary" icon={Megaphone} block disabled={!w.length} onClick={() => w[0] && act.callToken(w[0])}>
              {w[0] ? `Call next · ${tokenLabel(w[0].token)} ${w[0].patient}` : 'Nobody waiting'}
            </HmsButton>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
              <HmsButton icon={Ticket} block onClick={() => act.walkIn(undefined, d.name)}>
                Token
              </HmsButton>
              <HmsButton icon={CalendarPlus} block onClick={() => act.book({ doctor: d.name })}>
                Book
              </HmsButton>
              <HmsButton
                icon={DoorOpen}
                block
                disabled={!d.room}
                title={d.room ? 'Mark the chamber free or busy' : 'No chamber assigned'}
                onClick={() => {
                  if (!d.room) return;
                  const next = d.room.status === 'AVAILABLE' ? 'IN_CONSULTATION' : 'AVAILABLE';
                  saveDepartmentRoom({ ...d.room, status: next });
                  data.reload();
                  act.notify(`${d.room.roomNumber} marked ${next === 'AVAILABLE' ? 'free' : 'busy'}`);
                }}
              >
                {d.room?.status === 'AVAILABLE' ? 'Mark busy' : 'Mark free'}
              </HmsButton>
            </div>
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="rec-doctors"
      title="Doctors & chambers"
      description="Who is seeing whom, queue length and the longest wait for each OPD doctor."
      total={data.doctors.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search doctor, specialty or chamber"
      pills={[
        { key: 'all', label: 'All', count: data.doctors.length },
        { key: 'busy', label: 'Seeing patient', count: data.doctors.filter(busy).length },
        { key: 'free', label: 'Free', count: data.doctors.filter((d) => !busy(d)).length },
        { key: 'queue', label: '3+ waiting', count: data.doctors.filter((d) => waitingOf(d).length >= 3).length, tone: 'amber' },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="call next"
      onPrimary={(k) => {
        const d = data.doctors.find((x) => `d:${x.id}` === k);
        const n = d ? waitingOf(d)[0] : undefined;
        if (n) act.callToken(n);
      }}
      detailLabel="Doctor"
      emptyText="No doctors match this search or filter."
      renderDetail={renderDetail}
    />
  );
};
