// Nurse — shift handover. SBAR pre-filled from the live station (queue, day-care beds and their last scores,
// samples to collect, critical results, clinic doses still to give), station safety checks, signed to a named
// incoming nurse. Past handovers stay readable.
import React, { useState } from 'react';
import { ClipboardList, Send, Printer, Check, X } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty } from '../../components/hms';
import { NurseHandover } from '../../services/patientJourneyService';
import { printSlip, tokenLabel } from '../reception/receptionData';
import { HandoverModal } from './NurseModals';
import { NurseActions, NurseData, SHIFTS, chartFor, clinicDoses, clock, criticalOpen, currentShift, isEmergency, isInTriage, isOpdOrder, isReadyForDoctor, isToTriage, isTodayDate, obsDue, toCollect, triagedToday } from './nurseData';

export interface NurseHandoverViewProps {
  data: NurseData;
  act: NurseActions;
  newSignal?: number;
}

/** Live station summary in SBAR form; the nurse edits it before signing. */
const buildDraft = (data: NurseData, from: string): Omit<NurseHandover, 'id' | 'at' | 'to' | 'checklist' | 'exceptions'> => {
  const now = data.lastSync.getTime();
  const shift = currentShift();
  const waiting = data.queue.filter(isToTriage);
  const inTriage = data.queue.filter(isInTriage);
  const ready = data.queue.filter(isReadyForDoctor);
  const triaged = data.queue.filter(triagedToday);
  const emerg = data.queue.filter((t) => isEmergency(t) && (isToTriage(t) || isInTriage(t) || isReadyForDoctor(t)));
  const specimens = data.labOrders.filter((o) => toCollect(o) && isOpdOrder(o));
  const crit = data.labOrders.filter((o) => criticalOpen(o) && isOpdOrder(o));
  const toGive = clinicDoses(data.prescriptions, data.procedures).filter((d) => !d.done);
  const beds = data.occupiedBeds.map((b) => {
    const occ = b.bed.inpatientDetails!;
    const due = obsDue(chartFor(data.chart, b), now);
    return { b, occ, due };
  });
  const lines = (xs: string[], none: string) => (xs.length ? xs.map((x) => `• ${x}`).join('\n') : none);
  return {
    shift,
    from,
    situation: `${SHIFTS[shift].label}, ${new Date(now).toLocaleDateString()}. Triaged ${triaged.length} today. Now: ${waiting.length} waiting for triage, ${inTriage.length} in triage, ${ready.length} waiting for the doctor, ${beds.length} on day-care beds. ${specimens.length} sample${specimens.length === 1 ? '' : 's'} to collect, ${crit.length} critical result${crit.length === 1 ? '' : 's'} not acknowledged, ${toGive.length} clinic dose${toGive.length === 1 ? '' : 's'} to give.`,
    background: lines(
      beds.map(({ b, occ, due }) => `${b.bed.bedNumber} — ${occ.patientName} (${occ.uhid}), ${occ.diagnosis || 'observation'}, ${occ.primaryDoctor?.name || 'doctor —'}${due.last ? `, last obs ${clock(due.last.at)}${due.last.news2 !== undefined ? ` NEWS2 ${due.last.news2}` : ''}` : ', no obs charted'}`),
      'No patients on day-care beds.',
    ),
    assessment: lines(
      [
        ...emerg.map((t) => `${tokenLabel(t.token)} ${t.patient} — emergency${t.triageNotes ? `: ${t.triageNotes.replace(/^EMERGENCY:\s*/, '')}` : ''}`),
        ...beds.filter(({ due }) => (due.last?.news2 ?? -1) >= 5).map(({ b, occ, due }) => `${b.bed.bedNumber} ${occ.patientName} — NEWS2 ${due.last!.news2}`),
        ...crit.map((o) => `${o.patientName} — critical ${o.testName}, not acknowledged`),
      ],
      'No patient currently flagged as unwell.',
    ),
    recommendation: lines(
      [
        ...beds.filter(({ due }) => due.dueIn <= 0).map(({ b }) => `Chart observations for ${b.bed.bedNumber} (due now)`),
        ...crit.map((o) => `Read back critical ${o.testName} for ${o.patientName} and inform ${o.doctor || 'the doctor'}`),
        ...(specimens.length ? [`Collect ${specimens.length} sample${specimens.length === 1 ? '' : 's'}${specimens.some((o) => o.priority === 'STAT') ? ` (${specimens.filter((o) => o.priority === 'STAT').length} STAT)` : ''}`] : []),
        ...toGive.map((d) => `Give ${d.name} to ${d.rx.patientName}`),
        ...(waiting.length ? [`Triage ${waiting.length} waiting patient${waiting.length === 1 ? '' : 's'}`] : []),
      ],
      'No pending actions.',
    ),
    counts: { triaged: triaged.length, waiting: waiting.length, onBeds: beds.length, specimensPending: specimens.length, criticalOpen: crit.length },
  };
};

const PILLS = ['today', 'all'];

export const NurseHandoverView: React.FC<NurseHandoverViewProps> = ({ data, act, newSignal = 0 }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState('today');
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [seenSignal, setSeenSignal] = useState(newSignal);
  if (newSignal !== seenSignal) {
    setSeenSignal(newSignal);
    setOpen(true);
  }

  const all = data.handovers;
  const isToday = (h: NurseHandover) => isTodayDate(new Date(h.at));
  const q = search.trim().toLowerCase();
  const list = all.filter((h) => (pill === 'all' || isToday(h)) && (!q || [h.from, h.to, h.situation, h.background, h.assessment].some((v) => (v || '').toLowerCase().includes(q))));
  const shiftNow = currentShift();
  const doneThisShift = all.some((h) => isToday(h) && h.shift === shiftNow);
  const rows: HmsListRow[] = list.map((h) => ({
    key: `h:${h.id}`,
    title: `${SHIFTS[h.shift].label} · ${h.from} → ${h.to}`,
    badge: Object.values(h.checklist).every(Boolean) ? <HmsBadge tone="green">Checks done</HmsBadge> : <HmsBadge tone="amber">Exceptions</HmsBadge>,
    sub: new Date(h.at).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    metaLeft: `${h.counts.onBeds} on beds · ${h.counts.waiting} waiting`,
    metaRight: h.counts.criticalOpen ? `${h.counts.criticalOpen} critical open` : `${h.counts.triaged} triaged`,
  }));

  const renderDetail = (key: string | null) => {
    const h = all.find((x) => `h:${x.id}` === key);
    if (!h) return <HmsEmpty>{all.length ? 'Select a handover from the list.' : 'No handovers yet. At the end of your shift, use "Hand over now" — it fills in the SBAR from the live station.'}</HmsEmpty>;
    const block = (title: string, text: string) => (
      <HmsSection title={title}>
        <div style={{ padding: '12px 16px', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{text || '—'}</div>
      </HmsSection>
    );
    return (
      <>
        <HmsDetailHeader icon={ClipboardList} title={`${SHIFTS[h.shift].label} handover`} badge={Object.values(h.checklist).every(Boolean) ? <HmsBadge tone="green">Checks done</HmsBadge> : <HmsBadge tone="amber">Exceptions</HmsBadge>} subtitle={`${h.from} → ${h.to} · ${new Date(h.at).toLocaleString()}`} />
        <HmsStatStrip
          items={[
            { label: 'Triaged', value: h.counts.triaged },
            { label: 'Waiting', value: h.counts.waiting },
            { label: 'On beds', value: h.counts.onBeds },
            { label: 'Critical open', value: h.counts.criticalOpen, tone: h.counts.criticalOpen ? 'red' : 'default', note: `${h.counts.specimensPending} samples pending` },
          ]}
        />
        <HmsDetailBody>
          {block('S — Situation', h.situation)}
          {block('B — Background', h.background)}
          {block('A — Assessment', h.assessment)}
          {block('R — Recommendation', h.recommendation)}
          <HmsSection title="Station safety checks">
            {Object.entries(h.checklist).map(([k, v], i, arr) => (
              <HmsRow key={k} label={k} value={v ? <span style={{ color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Check size={16} /> Done</span> : <span style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><X size={16} /> Not done</span>} last={i === arr.length - 1 && !h.exceptions} />
            ))}
            {h.exceptions && <HmsRow label="Reason" value={h.exceptions} last />}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton
            icon={Printer}
            block
            onClick={() => {
              const ok = printSlip(`Nursing handover · ${SHIFTS[h.shift].label}`, [['From', h.from], ['To', h.to], ['Signed', new Date(h.at).toLocaleString()], ['Situation', h.situation], ['Background', h.background], ['Assessment', h.assessment], ['Recommendation', h.recommendation], ...Object.entries(h.checklist).map(([k, v]) => [k, v ? 'Done' : 'Not done'] as [string, string])]);
              if (!ok) act.notify('Allow pop-ups to print', 'error');
            }}
          >
            Print handover
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      {!doneThisShift && (
        <HmsNotice tone="blue" action={<HmsButton size="sm" icon={Send} onClick={() => setOpen(true)}>Hand over now</HmsButton>}>
          No handover signed yet for the {SHIFTS[shiftNow].label.toLowerCase()} ({SHIFTS[shiftNow].hours}).
        </HmsNotice>
      )}
      <HmsMasterDetail
        listId="nurse-handover"
        title="Shift handover"
        description="Signed SBAR handovers between nurses, with the station safety checks."
        total={all.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search nurse or handover text"
        headerAction={
          <HmsButton variant="primary" icon={Send} onClick={() => setOpen(true)} title="Hand over now (Alt+N)" aria-keyshortcuts="Alt+N">
            Hand over now
          </HmsButton>
        }
        pills={[
          { key: 'today', label: 'Today', count: all.filter(isToday).length },
          { key: 'all', label: 'All', count: all.length },
        ]}
        activePill={PILLS.includes(pill) ? pill : 'today'}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open handover"
        detailLabel="Handover"
        emptyText={pill === 'today' ? 'No handovers today yet.' : 'Nothing matches this search.'}
        renderDetail={renderDetail}
      />
      {open && (
        <HandoverModal
          draft={buildDraft(data, act.userName)}
          onClose={() => setOpen(false)}
          onDone={(h) => {
            setOpen(false);
            data.reload();
            setSelected(`h:${h.id}`);
            act.notify(`Handover signed to ${h.to}`);
          }}
        />
      )}
    </>
  );
};
