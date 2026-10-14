// Doctor — availability. The next two weeks day by day: booked appointments and the time you have blocked (leave,
// OT, conference). The front desk cannot book a blocked slot; patients already booked inside a new block are listed
// so the chamber desk can reschedule them.
import React, { useState } from 'react';
import { CalendarOff, CalendarX2, Trash2 } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, HmsToggle, INPUT } from '../../components/hms';
import { useCurrency } from '../../config/currency';
import { patientJourneyService, DoctorBlock } from '../../services/patientJourneyService';
import { SLOTS, fmtDate, sameDoctor, slotMinutes } from '../reception/receptionData';
import { DoctorActions, DoctorData, addDays } from './doctorData';

export interface DocAvailabilityViewProps {
  data: DoctorData;
  act: DoctorActions;
  newSignal?: number;
  initialFilter?: string;
}

const DAYS = 14;
const covers = (b: DoctorBlock, slot: string) => {
  const m = slotMinutes(slot);
  return b.allDay || (m !== null && (slotMinutes(b.from || '') ?? -1) <= m && m <= (slotMinutes(b.to || '') ?? -1));
};

export const DocAvailabilityView: React.FC<DocAvailabilityViewProps> = ({ data, act, newSignal = 0, initialFilter }) => {
  const { format } = useCurrency();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState('all');
  const [blocking, setBlocking] = useState<string | null>(initialFilter === 'block' ? addDays(0) : null);
  const [allDay, setAllDay] = useState(true);
  const [from, setFrom] = useState(SLOTS[0]);
  const [to, setTo] = useState(SLOTS[SLOTS.length - 1]);
  const [reason, setReason] = useState('');
  const [seen, setSeen] = useState(newSignal);
  const doc = data.doctor!;
  if (newSignal !== seen) {
    setSeen(newSignal);
    setBlocking(selected?.slice(2) || addDays(0));
  }

  const days = Array.from({ length: DAYS }, (_, i) => addDays(i));
  const apptsOn = (date: string) => data.appointments.filter((a) => a.date === date && sameDoctor(a.doctor, doc.name) && (a.status === 'BOOKED' || a.status === 'CHECKED_IN'));
  const blocksOn = (date: string) => data.blocks.filter((b) => b.date === date);
  const clashes = (date: string) => apptsOn(date).filter((a) => a.status === 'BOOKED' && blocksOn(date).some((b) => covers(b, a.slot)));
  const match: Record<string, (d: string) => boolean> = { all: () => true, blocked: (d) => blocksOn(d).length > 0, booked: (d) => apptsOn(d).length > 0 };
  const q = search.trim().toLowerCase();
  const list = days.filter((d) => match[pill](d) && (!q || fmtDate(d).toLowerCase().includes(q) || d.includes(q)));
  const rows: HmsListRow[] = list.map((d) => {
    const bl = blocksOn(d);
    const n = apptsOn(d).length;
    return {
      key: `d:${d}`,
      title: `${fmtDate(d)}${d === addDays(0) ? ' · today' : ''}`,
      badge: bl.some((b) => b.allDay) ? <HmsBadge tone="red">Not available</HmsBadge> : bl.length ? <HmsBadge tone="amber">Part blocked</HmsBadge> : <HmsBadge tone="green">Available</HmsBadge>,
      sub: bl.length ? bl.map((b) => (b.allDay ? b.reason : `${b.from}–${b.to} · ${b.reason}`)).join(' · ') : 'Normal OPD',
      metaLeft: `${n} booked`,
      metaRight: clashes(d).length ? `${clashes(d).length} to reschedule` : undefined,
      progress: { pct: Math.min(100, (n / SLOTS.length) * 100), doneLabel: 'Fully booked', tone: n >= SLOTS.length * 0.8 ? 'amber' : 'blue' },
    };
  });

  const renderDetail = (key: string | null) => {
    const d = key?.slice(2);
    if (!d) return <HmsEmpty>Select a day.</HmsEmpty>;
    const appts = apptsOn(d).sort((a, b) => (slotMinutes(a.slot) ?? 0) - (slotMinutes(b.slot) ?? 0));
    const bl = blocksOn(d);
    const cl = clashes(d);
    return (
      <>
        <HmsDetailHeader icon={CalendarOff} title={fmtDate(d)} badge={bl.some((b) => b.allDay) ? <HmsBadge tone="red">Not available</HmsBadge> : bl.length ? <HmsBadge tone="amber">Part blocked</HmsBadge> : <HmsBadge tone="green">Available</HmsBadge>} subtitle={`${doc.name} · ${doc.room ? doc.room.roomNumber : 'no chamber assigned'}`} />
        <HmsStatStrip
          items={[
            { label: 'Booked', value: appts.length, note: `of ${SLOTS.length} slots` },
            { label: 'Free slots', value: SLOTS.filter((s) => !appts.some((a) => a.slot === s) && !bl.some((b) => covers(b, s))).length },
            { label: 'Consultation fee', value: format(doc.fee), note: `Follow-up ${format(doc.followUpFee)}` },
            { label: 'Blocks', value: bl.length, tone: bl.length ? 'amber' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {cl.length > 0 && <HmsNotice tone="red">{cl.length} booked patient{cl.length === 1 ? ' falls' : 's fall'} inside blocked time: {cl.map((a) => `${a.patient} ${a.slot}`).join(', ')}. Ask the chamber desk to reschedule.</HmsNotice>}
          <HmsSection title="Blocked time">
            {bl.length === 0 && <HmsRow label="Nothing blocked" last />}
            {bl.map((b, i) => (
              <HmsRow
                key={b.id}
                label={b.allDay ? 'All day' : `${b.from} – ${b.to}`}
                hint={`${b.reason} · by ${b.by}`}
                value={
                  <HmsButton size="sm" icon={Trash2} onClick={() => { patientJourneyService.removeDoctorBlock(b.id); data.reload(); act.notify('Block removed — the slots are open for booking'); }}>
                    Remove
                  </HmsButton>
                }
                last={i === bl.length - 1}
              />
            ))}
          </HmsSection>
          <HmsSection title={`Appointments · ${appts.length}`}>
            {appts.length === 0 && <HmsRow label="No bookings" last />}
            {appts.map((a, i) => (
              <HmsRow key={a.id} label={`${a.slot} · ${a.patient}`} hint={a.visitType.replace('_', ' ').toLowerCase()} value={a.status === 'CHECKED_IN' ? <HmsBadge tone="green">Arrived</HmsBadge> : cl.includes(a) ? <HmsBadge tone="red">In blocked time</HmsBadge> : <HmsBadge tone="blue">Booked</HmsBadge>} last={i === appts.length - 1} />
            ))}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton variant="primary" icon={CalendarX2} block onClick={() => { setBlocking(d); setReason(''); setAllDay(true); }}>
            Block time on this day
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  const fromM = slotMinutes(from) ?? 0;
  const toM = slotMinutes(to) ?? 0;
  return (
    <>
      <HmsMasterDetail
        listId="doc-avail"
        title="Availability"
        description="Your next two weeks. Blocked time cannot be booked at the front desk."
        total={days.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search a day, e.g. Mon or 2026-10-20"
        headerAction={
          <HmsButton variant="primary" icon={CalendarX2} onClick={() => { setBlocking(selected?.slice(2) || addDays(0)); setReason(''); setAllDay(true); }} title="Block time (Alt+N)" aria-keyshortcuts="Alt+N">
            Block time
          </HmsButton>
        }
        pills={[
          { key: 'all', label: 'All', count: days.length },
          { key: 'booked', label: 'Booked', count: days.filter(match.booked).length },
          { key: 'blocked', label: 'Blocked', count: days.filter(match.blocked).length, tone: 'amber' },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open day"
        detailLabel="Day"
        emptyText="No days match this search or filter."
        renderDetail={renderDetail}
      />
      {blocking && (
        <HmsModal
          title="Block time"
          description="Patients cannot be booked in this time. Use it for leave, OT, rounds or a conference."
          onClose={() => setBlocking(null)}
          footer={
            <>
              <HmsButton onClick={() => setBlocking(null)}>Cancel</HmsButton>
              <HmsButton
                variant="primary"
                icon={CalendarX2}
                disabled={reason.trim().length < 3 || (!allDay && toM < fromM)}
                onClick={() => {
                  patientJourneyService.addDoctorBlock({ id: `blk-${new Date().getTime()}`, doctor: doc.name, date: blocking, allDay, from: allDay ? undefined : from, to: allDay ? undefined : to, reason: reason.trim(), by: act.userName, at: new Date().toISOString() });
                  const n = data.appointments.filter((a) => a.date === blocking && a.status === 'BOOKED' && sameDoctor(a.doctor, doc.name) && (allDay || ((slotMinutes(a.slot) ?? -1) >= fromM && (slotMinutes(a.slot) ?? -1) <= toM))).length;
                  setBlocking(null);
                  data.reload();
                  setSelected(`d:${blocking}`);
                  act.notify(`${fmtDate(blocking)} ${allDay ? 'blocked all day' : `blocked ${from}–${to}`}${n ? ` · ${n} booked patient${n === 1 ? '' : 's'} to reschedule` : ''}`, n ? 'error' : 'success');
                }}
              >
                Block
              </HmsButton>
            </>
          }
        >
          <HmsField label="Day" htmlFor="blk-date" required>
            <input id="blk-date" type="date" min={addDays(0)} style={INPUT} value={blocking} onChange={(e) => setBlocking(e.target.value || addDays(0))} />
          </HmsField>
          <HmsToggle checked={allDay} onChange={setAllDay} label="Whole day" showLabel />
          {!allDay && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <HmsField label="From slot" htmlFor="blk-from">
                <select id="blk-from" style={INPUT} value={from} onChange={(e) => setFrom(e.target.value)}>
                  {SLOTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </HmsField>
              <HmsField label="To slot (included)" htmlFor="blk-to">
                <select id="blk-to" style={INPUT} value={to} onChange={(e) => setTo(e.target.value)}>
                  {SLOTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </HmsField>
            </div>
          )}
          <HmsField label="Reason" htmlFor="blk-reason" required>
            <input id="blk-reason" style={INPUT} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Annual leave, OT list, CME conference" />
          </HmsField>
        </HmsModal>
      )}
    </>
  );
};
