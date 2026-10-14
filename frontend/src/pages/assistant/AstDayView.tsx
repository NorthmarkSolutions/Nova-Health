// Chamber desk — the clinic day. The doctor's status (in clinic, break, rounds, running late) that the front desk
// sees, and every patient today with the visit timeline: token → called in → seated → seen, wait to see the doctor
// and time with the doctor. Printable day list.
import React, { useState } from 'react';
import { Clock, Printer, UserCheck } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsSection, HmsRow, HmsNotice, HmsEmpty, HMS, initialsOf } from '../../components/hms';
import { SharedQueueToken } from '../../services/patientJourneyService';
import { MONO, fmtWait, issuedAt, printSlip, tokenLabel } from '../reception/receptionData';
import { avgMin } from '../nurse/nurseData';
import { AssistantActions, AssistantData, SESSION, chamberStatus, consultMinutes, isSeen, isTodayToken } from './assistantData';

export interface AstDayViewProps {
  data: AssistantData;
  act: AssistantActions;
  onSession: () => void;
  initialFilter?: string;
}

const PILLS = ['all', 'seen', 'noshow'];
const hhmm = (d: Date | null) => (d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
/** Token issued → seated with the doctor. */
const waitToDoctor = (t: SharedQueueToken) => {
  const a = issuedAt(t);
  const b = t.seatedAt ? new Date(t.seatedAt) : null;
  return a && b && b > a ? Math.round((b.getTime() - a.getTime()) / 60000) : null;
};

export const AstDayView: React.FC<AstDayViewProps> = ({ data, act, onSession, initialFilter }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(null);

  const day = data.mine.filter(isTodayToken);
  const match: Record<string, (t: SharedQueueToken) => boolean> = { all: () => true, seen: isSeen, noshow: (t) => t.status === 'NO_SHOW' || t.status === 'CANCELLED' };
  const q = search.trim().toLowerCase();
  const list = day.filter((t) => match[pill](t) && (!q || [t.patient, t.uhid, String(t.token)].some((v) => (v || '').toLowerCase().includes(q)))).sort((a, b) => a.token - b.token);
  const avgWait = avgMin(day.map(waitToDoctor));
  const avgConsult = avgMin(day.map(consultMinutes));
  const s = data.doctorSession;
  const rows: HmsListRow[] = list.map((t) => {
    const st = chamberStatus(t);
    return {
      key: `t:${t.token}`,
      title: `${tokenLabel(t.token)} · ${t.patient}`,
      badge: <HmsBadge tone={st.tone}>{st.label}</HmsBadge>,
      sub: <><span style={MONO}>{t.uhid}</span> · {t.type || 'Visit'}</>,
      metaLeft: `Token ${t.time || hhmm(issuedAt(t))}${t.checkoutTime ? ` · seen ${t.checkoutTime}` : ''}`,
      metaRight: consultMinutes(t) !== null ? `${consultMinutes(t)} min` : undefined,
    };
  });

  const print = () => {
    const ok = printSlip(`${data.doctor?.name || 'Doctor'} · day list ${new Date().toLocaleDateString()}`, [
      ['Patients', String(day.length)],
      ['Seen', String(day.filter(isSeen).length)],
      ['No-show / cancelled', String(day.filter(match.noshow).length)],
      ['Average wait to doctor', fmtWait(avgWait)],
      ['Average time with doctor', fmtWait(avgConsult)],
      ...day.map((t) => [`${tokenLabel(t.token)} ${t.patient}`, `${chamberStatus(t).label}${t.checkoutTime ? ` · ${t.checkoutTime}` : ''}`] as [string, string]),
    ]);
    if (!ok) act.notify('Allow pop-ups to print', 'error');
  };

  const renderDetail = (key: string | null) => {
    if (!data.doctor) return <HmsEmpty>Choose the doctor you are assisting (top bar).</HmsEmpty>;
    const t = day.find((x) => `t:${x.token}` === key);
    if (!t) return <HmsEmpty>{day.length ? 'Select a patient from the list.' : 'No patients for this doctor today yet.'}</HmsEmpty>;
    const st = chamberStatus(t);
    return (
      <>
        <HmsDetailHeader avatar={initialsOf(t.patient)} title={`${tokenLabel(t.token)} · ${t.patient}`} badge={<HmsBadge tone={st.tone}>{st.label}</HmsBadge>} subtitle={<><span style={MONO}>{t.uhid}</span> · {t.type || 'Visit'}</>} />
        <HmsStatStrip
          items={[
            { label: 'Wait to doctor', value: fmtWait(waitToDoctor(t)) },
            { label: 'With doctor', value: fmtWait(consultMinutes(t)) },
            { label: 'Triage', value: t.assessment?.triagedAt ? hhmm(new Date(t.assessment.triagedAt)) : '—', note: t.assessment?.triagedBy },
            { label: 'Checked out', value: t.handoff ? hhmm(new Date(t.handoff.at)) : '—', note: t.handoff?.routes.join(', ') },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title="Timeline">
            <HmsRow label="Token issued" value={t.time || hhmm(issuedAt(t))} />
            <HmsRow label="Triage started" value={t.triageStartTime ? hhmm(new Date(t.triageStartTime)) : '—'} />
            <HmsRow label="Sent to doctor by nurse" value={t.assessment?.triagedAt ? hhmm(new Date(t.assessment.triagedAt)) : '—'} />
            <HmsRow label="Called into chamber" value={t.calledAt ? hhmm(new Date(t.calledAt)) : '—'} />
            <HmsRow label="Seated with doctor" value={t.seatedAt ? hhmm(new Date(t.seatedAt)) : '—'} />
            <HmsRow label="Seen" value={t.checkoutTime || '—'} />
            <HmsRow label="Checked out" value={t.handoff ? hhmm(new Date(t.handoff.at)) : '—'} hint={t.handoff?.by} last />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <>
      {data.doctor && (
        <HmsNotice
          tone={!s || s.status === 'IN' ? 'green' : s.status === 'LATE' ? 'red' : s.status === 'OUT' ? 'blue' : 'amber'}
          action={
            <HmsButton size="sm" icon={UserCheck} onClick={onSession}>
              Change status
            </HmsButton>
          }
        >
          <strong>{data.doctor.name}</strong> · {s ? SESSION[s.status].label : 'Status not set'}
          {s?.until ? ` · until ${s.until}` : ''}
          {s?.note ? ` · ${s.note}` : ''}
          {s ? <span style={{ color: HMS.textSecondary }}> (set {hhmm(new Date(s.since))} by {s.by})</span> : ' — the front desk sees this when patients ask.'}
        </HmsNotice>
      )}
      <HmsMasterDetail
        listId="ast-day"
        title="Clinic day"
        description="Everyone booked or walked in for the doctor today, with the visit timeline."
        total={day.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search name, UHID or token"
        headerAction={
          <HmsButton icon={Printer} onClick={print} disabled={!day.length}>
            Print
          </HmsButton>
        }
        leftExtra={
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: HMS.textSecondary, flexWrap: 'wrap' }}>
            <span>
              <Clock size={14} style={{ verticalAlign: '-2px' }} /> Avg wait to doctor <strong style={{ color: HMS.text }}>{fmtWait(avgWait)}</strong>
            </span>
            <span>
              Avg with doctor <strong style={{ color: HMS.text }}>{fmtWait(avgConsult)}</strong>
            </span>
          </div>
        }
        pills={[
          { key: 'all', label: 'All', count: day.length },
          { key: 'seen', label: 'Seen', count: day.filter(isSeen).length },
          { key: 'noshow', label: 'No-show', count: day.filter(match.noshow).length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open timeline"
        detailLabel="Visit"
        emptyText="Nobody matches this search or filter."
        renderDetail={renderDetail}
      />
    </>
  );
};
