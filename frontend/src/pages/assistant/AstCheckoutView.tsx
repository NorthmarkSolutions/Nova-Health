// Chamber desk — after the consultation. For each patient the doctor has seen: print the prescription, see where
// they go next (pharmacy, sample collection, cash counter, follow-up booking — worked out from what the doctor
// ordered), book the follow-up and check them out with the route recorded.
import React, { useState } from 'react';
import { LogOut, Printer, CalendarPlus, Check, ArrowRight } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsField, INPUT, initialsOf } from '../../components/hms';
import { patientJourneyService, SharedQueueToken } from '../../services/patientJourneyService';
import { opdActions } from '../../services/opdActions';
import { MONO, fmtWait, sameDoctor, tokenLabel } from '../reception/receptionData';
import { AssistantActions, AssistantData, consultMinutes, isSeen, isTodayToken, nextStops, printRx, rxFor } from './assistantData';

export interface AstCheckoutViewProps {
  data: AssistantData;
  act: AssistantActions;
  initialFilter?: string;
  initialSelect?: string;
}

const PILLS = ['pending', 'done', 'all'];

export const AstCheckoutView: React.FC<AstCheckoutViewProps> = ({ data, act, initialFilter, initialSelect }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'pending');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `t:${initialSelect}` : null);
  const [note, setNote] = useState('');

  const seen = data.mine.filter((t) => isSeen(t) && isTodayToken(t));
  const match: Record<string, (t: SharedQueueToken) => boolean> = { pending: (t) => !t.handoff, done: (t) => !!t.handoff, all: () => true };
  const q = search.trim().toLowerCase();
  const list = seen.filter((t) => match[pill](t) && (!q || [t.patient, t.uhid, String(t.token)].some((v) => (v || '').toLowerCase().includes(q)))).sort((a, b) => b.token - a.token);
  const rows: HmsListRow[] = list.map((t) => {
    const todo = nextStops(t, data).filter((s) => s.todo);
    return {
      key: `t:${t.token}`,
      title: `${tokenLabel(t.token)} · ${t.patient}`,
      badge: t.handoff ? <HmsBadge tone="gray">Sent out</HmsBadge> : <HmsBadge tone="amber">Check out</HmsBadge>,
      sub: <><span style={MONO}>{t.uhid}</span> · seen {t.checkoutTime || '—'}</>,
      metaLeft: t.handoff ? `→ ${t.handoff.routes.join(', ') || 'Home'}` : todo.length ? `Next: ${todo.map((s) => s.label).join(', ')}` : 'Nothing pending — home',
      metaRight: consultMinutes(t) !== null ? `${consultMinutes(t)} min with doctor` : undefined,
    };
  });

  const renderDetail = (key: string | null) => {
    if (!data.doctor) return <HmsEmpty>Choose the doctor you are assisting (top bar).</HmsEmpty>;
    const t = seen.find((x) => `t:${x.token}` === key);
    if (!t) return <HmsEmpty>{seen.length ? 'Select a patient from the list.' : 'Nobody has finished with the doctor yet today.'}</HmsEmpty>;
    const stops = nextStops(t, data);
    const todo = stops.filter((s) => s.todo);
    const rx = rxFor(t, data.prescriptions);
    const fu = data.followUps.find((f) => f.uhid === t.uhid && sameDoctor(f.doctorName, t.doctor) && f.status === 'PENDING_BOOKING');
    return (
      <>
        <HmsDetailHeader avatar={initialsOf(t.patient)} title={`${tokenLabel(t.token)} · ${t.patient}`} badge={t.handoff ? <HmsBadge tone="gray">Sent out</HmsBadge> : <HmsBadge tone="amber">Check out</HmsBadge>} subtitle={<><span style={MONO}>{t.uhid}</span> · {t.phone || 'no phone'}</>} />
        <HmsStatStrip
          items={[
            { label: 'Seen at', value: t.checkoutTime || '—' },
            { label: 'With doctor', value: consultMinutes(t) !== null ? fmtWait(consultMinutes(t)) : '—', note: t.seatedAt ? undefined : 'Seat time not recorded' },
            { label: 'Prescription', value: rx ? `${rx.items.length} item${rx.items.length === 1 ? '' : 's'}` : 'None', note: rx?.prescriptionNo },
            { label: 'Next stops', value: todo.length, tone: todo.length ? 'amber' : 'green', note: todo.length ? undefined : 'Can go home' },
          ]}
        />
        <HmsDetailBody>
          {t.handoff && <HmsNotice tone="green">Checked out by {t.handoff.by} at {new Date(t.handoff.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → {t.handoff.routes.join(', ') || 'home'}{t.handoff.note ? ` · ${t.handoff.note}` : ''}.</HmsNotice>}
          {t.triageNotes?.startsWith('Referred') && <HmsNotice tone="blue">{t.triageNotes}</HmsNotice>}
          <HmsSection title="Where the patient goes next">
            {stops.map((s, i) => (
              <HmsRow key={s.key} label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>{s.todo ? <ArrowRight size={16} color="#d97706" aria-label="To do" /> : <Check size={16} color="#94a3b8" aria-label="Not needed" />}{s.label}</span>} value={s.hint} last={i === stops.length - 1} />
            ))}
          </HmsSection>
          {rx && (
            <HmsSection title={`Prescription ${rx.prescriptionNo}`}>
              {rx.items.map((it, i) => (
                <HmsRow key={`${it.medicineName}-${i}`} label={it.medicineName} hint={it.instructions} value={`${it.dosage} · ${it.frequency} · ${it.durationDays} d`} last={i === rx.items.length - 1} />
              ))}
            </HmsSection>
          )}
          {!t.handoff && (
            <HmsField label="Note (optional)" htmlFor="co-note">
              <input id="co-note" style={INPUT} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Explained dosage to daughter" />
            </HmsField>
          )}
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
            {!t.handoff && (
              <div style={{ gridColumn: '1 / -1' }}>
                <HmsButton
                  variant="primary"
                  icon={LogOut}
                  block
                  onClick={() => {
                    const routes = todo.filter((s) => s.key !== 'followup' || !!fu).map((s) => s.label);
                    const n = note.trim() || undefined;
                    void opdActions.checkout(t, routes, act.userName, n).then((done) => {
                      data.reload();
                      if (!done) return;
                      setNote('');
                      act.notify(`${t.patient} checked out${routes.length ? ` → ${routes.join(', ')}` : ' — home'}`);
                    });
                  }}
                >
                  {todo.length ? `Check out → ${todo.map((s) => s.label).join(', ')}` : 'Check out — patient can go home'}
                </HmsButton>
              </div>
            )}
            <HmsButton icon={Printer} block disabled={!rx} title={rx ? undefined : 'The doctor has not issued a prescription today'} onClick={() => rx && !printRx(rx) && act.notify('Allow pop-ups to print', 'error')}>
              Print prescription
            </HmsButton>
            <HmsButton icon={CalendarPlus} block onClick={() => act.book(fu ? { uhid: t.uhid, followUpId: fu.id, visitType: 'FOLLOW_UP', date: fu.followUpDate } : { uhid: t.uhid, visitType: 'FOLLOW_UP' })}>
              {fu ? 'Book follow-up' : 'Book next visit'}
            </HmsButton>
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="ast-checkout"
      title="Checkout"
      description="Patients the doctor has seen today: prescription, next stops and follow-up."
      total={seen.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search name, UHID or token"
      pills={[
        { key: 'pending', label: 'To check out', count: seen.filter(match.pending).length, tone: 'amber' },
        { key: 'done', label: 'Sent out', count: seen.filter(match.done).length },
        { key: 'all', label: 'All', count: seen.length },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open checkout"
      detailLabel="Checkout"
      emptyText="Nobody matches this search or filter."
      renderDetail={renderDetail}
    />
  );
};
