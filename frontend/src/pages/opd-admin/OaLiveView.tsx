// OPD Admin — live OPD. Every doctor's queue right now: who is waiting and for how long, who is in the room, how many
// are seen against the doctor's daily capacity, and the doctor's status (late, on rounds, on leave). When a doctor is
// late or away, move the waiting patients to another doctor, or mark the doctor unavailable for the rest of the day.
import React, { useState } from 'react';
import { Activity, ArrowRightLeft, CalendarX2 } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, INPUT, HMS } from '../../components/hms';
import { patientJourneyService, SharedQueueToken } from '../../services/patientJourneyService';
import { opdActions } from '../../services/opdActions';
import { DeskDoctor, LONG_WAIT_MIN, fmtWait, isWaiting, todayIso, tokenLabel, waitMinutes, sameDoctor } from '../reception/receptionData';
import { OpdAdminActions, OpdAdminData, doctorState, logChange, recordOf, tokensOf } from './opdAdminData';

export interface OaLiveViewProps {
  data: OpdAdminData;
  act: OpdAdminActions;
  initialFilter?: string;
}

const PILLS = ['all', 'busy', 'attention', 'away'];

export const OaLiveView: React.FC<OaLiveViewProps> = ({ data, act, initialFilter }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [moving, setMoving] = useState<DeskDoctor | null>(null);
  const [target, setTarget] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [away, setAway] = useState<DeskDoctor | null>(null);
  const [reason, setReason] = useState('');
  const now = data.lastSync.getTime();

  const info = (d: DeskDoctor) => {
    const toks = tokensOf(data, d.name);
    const waiting = toks.filter(isWaiting);
    const longest = Math.max(-1, ...waiting.map((t) => waitMinutes(t, now) ?? -1));
    const seen = toks.filter((t) => t.status === 'COMPLETED').length;
    const cap = recordOf(data, d)?.patientCapacityPerDay || 0;
    return { toks, waiting, longest, seen, cap, state: doctorState(data, d.name), serving: toks.find((t) => t.status === 'IN_CONSULTATION') };
  };
  const match: Record<string, (d: DeskDoctor) => boolean> = {
    all: () => true,
    busy: (d) => info(d).waiting.length > 0,
    attention: (d) => {
      const i = info(d);
      return i.longest > LONG_WAIT_MIN || (i.waiting.length > 0 && ['LATE', 'AWAY', 'LEAVE', 'OFF', 'NOT_TODAY'].includes(i.state.key));
    },
    away: (d) => ['LATE', 'AWAY', 'LEAVE', 'OFF'].includes(info(d).state.key),
  };
  const q = search.trim().toLowerCase();
  const list = data.doctors.filter((d) => match[pill](d) && (!q || [d.name, d.specialty, d.room?.roomNumber].some((v) => (v || '').toLowerCase().includes(q)))).sort((a, b) => info(b).waiting.length - info(a).waiting.length);
  const rows: HmsListRow[] = list.map((d) => {
    const i = info(d);
    return {
      key: `d:${d.id}`,
      title: d.name,
      badge: <HmsBadge tone={i.state.tone}>{i.state.label}</HmsBadge>,
      sub: `${d.specialty} · ${d.room ? d.room.roomNumber : 'no chamber'}`,
      metaLeft: <span style={{ color: i.longest > LONG_WAIT_MIN ? '#b45309' : undefined }}>{i.waiting.length} waiting{i.longest >= 0 ? ` · longest ${fmtWait(i.longest)}` : ''}</span>,
      metaRight: i.cap ? `${i.seen}/${i.cap} seen` : `${i.seen} seen`,
      progress: i.cap ? { pct: Math.min(100, (i.toks.length / i.cap) * 100), doneLabel: 'At daily capacity', tone: i.toks.length >= i.cap ? 'red' : 'blue' } : undefined,
    };
  });

  const renderDetail = (key: string | null) => {
    const d = data.doctors.find((x) => `d:${x.id}` === key);
    if (!d) return <HmsEmpty>{data.doctors.length ? 'Select a doctor.' : 'No OPD doctors are set up. Add them under Doctors.'}</HmsEmpty>;
    const i = info(d);
    const order = [...i.waiting].sort((a, b) => a.token - b.token);
    return (
      <>
        <HmsDetailHeader icon={Activity} title={d.name} badge={<HmsBadge tone={i.state.tone}>{i.state.label}</HmsBadge>} subtitle={`${d.specialty} · ${d.room ? `${d.room.roomNumber}${d.room.name ? ` · ${d.room.name}` : ''}` : 'no chamber assigned'}`} />
        <HmsStatStrip
          items={[
            { label: 'Waiting', value: i.waiting.length, tone: i.longest > LONG_WAIT_MIN ? 'amber' : 'default', note: i.longest >= 0 ? `Longest ${fmtWait(i.longest)}` : undefined },
            { label: 'In room', value: i.serving ? tokenLabel(i.serving.token) : '—', note: i.serving?.patient },
            { label: 'Seen', value: i.seen, note: i.cap ? `Capacity ${i.cap}/day` : 'No capacity set' },
            { label: 'Tokens today', value: i.toks.length, tone: i.cap && i.toks.length >= i.cap ? 'red' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {i.waiting.length > 0 && ['LATE', 'AWAY', 'LEAVE', 'OFF', 'NOT_TODAY'].includes(i.state.key) && <HmsNotice tone="red">{i.waiting.length} patient{i.waiting.length === 1 ? ' is' : 's are'} waiting while the doctor is {i.state.label.toLowerCase()}. Move them to another doctor or tell them the expected time.</HmsNotice>}
          {i.cap > 0 && i.toks.length >= i.cap && <HmsNotice tone="amber">Daily capacity reached ({i.cap}). The front desk should book further patients on another day or with another doctor.</HmsNotice>}
          <HmsSection title={`Waiting · ${order.length}`}>
            {order.length === 0 && <HmsRow label="Nobody waiting" last />}
            {order.map((t, n) => (
              <HmsRow key={t.id} label={`${tokenLabel(t.token)} · ${t.patient}`} hint={t.priority && t.priority !== 'NORMAL' ? t.priority.toLowerCase() : t.type} value={fmtWait(waitMinutes(t, now))} last={n === order.length - 1} />
            ))}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
            <HmsButton icon={ArrowRightLeft} block disabled={!order.length || data.doctors.length < 2} onClick={() => { setMoving(d); setPicked(order.map((t) => t.id)); setTarget(data.doctors.find((x) => x.id !== d.id && x.specialty === d.specialty)?.id || data.doctors.find((x) => x.id !== d.id)?.id || ''); }}>
              Move waiting patients
            </HmsButton>
            <HmsButton variant="danger" icon={CalendarX2} block disabled={i.state.key === 'LEAVE'} onClick={() => { setAway(d); setReason(''); }}>
              Unavailable today
            </HmsButton>
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  const moveFrom = moving ? info(moving).waiting.sort((a, b) => a.token - b.token) : [];
  const targetDoc = data.doctors.find((x) => x.id === target);
  return (
    <>
      <HmsMasterDetail
        listId="oa-live"
        title="Live OPD"
        description="Every doctor's queue now. Doctors with the most waiting first."
        total={data.doctors.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search doctor, specialty or chamber"
        pills={[
          { key: 'all', label: 'All', count: data.doctors.length },
          { key: 'busy', label: 'Has a queue', count: data.doctors.filter(match.busy).length },
          { key: 'attention', label: 'Needs attention', count: data.doctors.filter(match.attention).length, tone: 'red' },
          { key: 'away', label: 'Away / leave', count: data.doctors.filter(match.away).length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open doctor"
        detailLabel="Doctor"
        emptyText="No doctors match this search or filter."
        renderDetail={renderDetail}
      />
      {moving && (
        <HmsModal
          title={`Move patients from ${moving.name}`}
          description="The patients keep their token numbers; the lobby screen and the new doctor's desk update at once."
          width={600}
          onClose={() => setMoving(null)}
          footer={
            <>
              <HmsButton onClick={() => setMoving(null)}>Cancel</HmsButton>
              <HmsButton
                variant="primary"
                icon={ArrowRightLeft}
                disabled={!targetDoc || picked.length === 0}
                onClick={() => {
                  if (!targetDoc) return;
                  moveFrom.filter((t: SharedQueueToken) => picked.includes(t.id)).forEach((t) => void opdActions.reassign(t, targetDoc.id, targetDoc.name, targetDoc.room?.roomNumber || t.room));
                  logChange(act.userName, 'LIVE', moving.name, `Moved ${picked.length} waiting patient${picked.length === 1 ? '' : 's'} to ${targetDoc.name}`);
                  const n = picked.length;
                  setMoving(null);
                  data.reload();
                  act.notify(`${n} patient${n === 1 ? '' : 's'} moved to ${targetDoc.name}`);
                }}
              >
                Move {picked.length}
              </HmsButton>
            </>
          }
        >
          <HmsField label="To doctor" htmlFor="mv-to" required>
            <select id="mv-to" style={INPUT} value={target} onChange={(e) => setTarget(e.target.value)}>
              {data.doctors.filter((x) => x.id !== moving.id).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} · {x.specialty}{x.specialty === moving.specialty ? ' (same specialty)' : ''} · {info(x).waiting.length} waiting
                </option>
              ))}
            </select>
          </HmsField>
          {targetDoc && doctorState(data, targetDoc.name).key !== 'IN' && doctorState(data, targetDoc.name).key !== 'BUSY' && <HmsNotice tone="amber">{targetDoc.name} is {doctorState(data, targetDoc.name).label.toLowerCase()}.</HmsNotice>}
          <div role="group" aria-label="Patients to move" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {moveFrom.map((t) => {
              const on = picked.includes(t.id);
              return (
                <button key={t.id} type="button" role="checkbox" aria-checked={on} onClick={() => setPicked((prev) => (prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]))} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', fontSize: '14px', border: `1px solid ${on ? HMS.primaryBorder : HMS.border}`, background: on ? HMS.primaryTint : '#ffffff', color: HMS.text }}>
                  <span>
                    {on ? '☑' : '☐'} {tokenLabel(t.token)} · {t.patient}
                  </span>
                  <span style={{ fontSize: '12px', color: HMS.textSecondary }}>waiting {fmtWait(waitMinutes(t, now))}</span>
                </button>
              );
            })}
          </div>
        </HmsModal>
      )}
      {away && (
        <HmsModal
          title={`${away.name} unavailable today`}
          description="Blocks today's remaining slots for booking. Waiting patients stay in the queue until you move them."
          onClose={() => setAway(null)}
          footer={
            <>
              <HmsButton onClick={() => setAway(null)}>Cancel</HmsButton>
              <HmsButton
                variant="danger"
                icon={CalendarX2}
                disabled={reason.trim().length < 3}
                onClick={() => {
                  patientJourneyService.addDoctorBlock({ id: `blk-${new Date().getTime()}`, doctor: away.name, date: todayIso(), allDay: true, reason: reason.trim(), by: act.userName, at: new Date().toISOString() });
                  logChange(act.userName, 'LIVE', away.name, `Marked unavailable today: ${reason.trim()}`);
                  const booked = data.appointments.filter((a) => a.date === todayIso() && a.status === 'BOOKED' && sameDoctor(a.doctor, away.name)).length;
                  setAway(null);
                  data.reload();
                  act.notify(`${away.name} marked unavailable today${booked ? ` · ${booked} booked appointment${booked === 1 ? '' : 's'} to reschedule` : ''}`, booked ? 'error' : 'success');
                }}
              >
                Mark unavailable
              </HmsButton>
            </>
          }
        >
          <HmsField label="Reason" htmlFor="aw-reason" required>
            <input id="aw-reason" style={INPUT} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Called to emergency surgery" />
          </HmsField>
        </HmsModal>
      )}
    </>
  );
};
