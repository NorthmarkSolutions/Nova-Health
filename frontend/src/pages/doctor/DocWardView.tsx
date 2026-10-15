// Doctor — my inpatients: admitted and day-care patients where you are the primary doctor, with the nurses' chart
// (vitals and NEWS2) and your ward-round notes. Write today's round note with the plan; the nurses read it.
import React, { useState } from 'react';
import { BedDouble, NotebookPen } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, TEXTAREA, HMS } from '../../components/hms';
import { patientJourneyService, FlatCampusBed } from '../../services/patientJourneyService';
import { opdActions } from '../../services/opdActions';
import { MONO } from '../reception/receptionData';
import { Choice } from '../nurse/NurseModals';
import { NEWS_BAND, bandOfScore, chartFor, clock, isTodayDate } from '../nurse/nurseData';
import { DoctorActions, DoctorData } from './doctorData';

export interface DocWardViewProps {
  data: DoctorData;
  act: DoctorActions;
  initialFilter?: string;
}

const PILLS = ['toround', 'done', 'all'];
const PLANS = ['Continue current treatment', 'Fit for discharge today', 'Shift to ICU / HDU', 'Refer to another specialty', 'Observe — review in the evening'];

export const DocWardView: React.FC<DocWardViewProps> = ({ data, act, initialFilter }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'toround');
  const [selected, setSelected] = useState<string | null>(null);
  const [writing, setWriting] = useState<FlatCampusBed | null>(null);
  const [note, setNote] = useState('');
  const [plan, setPlan] = useState(PLANS[0]);

  const notesFor = (b: FlatCampusBed) => data.roundNotes.filter((n) => n.bedId === b.bed.id && n.admissionNo === (b.bed.inpatientDetails?.ipdAdmissionNo || ''));
  const roundedToday = (b: FlatCampusBed) => notesFor(b).some((n) => isTodayDate(new Date(n.at)));
  const match: Record<string, (b: FlatCampusBed) => boolean> = { toround: (b) => !roundedToday(b), done: roundedToday, all: () => true };
  const q = search.trim().toLowerCase();
  const list = data.beds.filter((b) => match[pill](b) && (!q || [b.bed.bedNumber, b.wardName, b.bed.inpatientDetails?.patientName, b.bed.inpatientDetails?.uhid].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = list.map((b) => {
    const occ = b.bed.inpatientDetails!;
    const last = chartFor(data.chart, b).find((e) => e.kind === 'READING');
    const band = bandOfScore(last?.news2);
    return {
      key: `b:${b.bed.id}`,
      title: `${b.bed.bedNumber} · ${occ.patientName}`,
      badge: roundedToday(b) ? <HmsBadge tone="green">Rounded</HmsBadge> : <HmsBadge tone="amber">To round</HmsBadge>,
      sub: <><span style={MONO}>{occ.uhid}</span> · {b.wardName}</>,
      metaLeft: occ.diagnosis || '—',
      metaRight: band ? `NEWS2 ${last!.news2}` : occ.acuity ? occ.acuity.toLowerCase() : undefined,
    };
  });

  const renderDetail = (key: string | null) => {
    const b = data.beds.find((x) => `b:${x.bed.id}` === key);
    if (!b) return <HmsEmpty>{data.beds.length ? 'Select a patient from the list.' : 'No admitted or day-care patients are under you.'}</HmsEmpty>;
    const occ = b.bed.inpatientDetails!;
    const readings = chartFor(data.chart, b).filter((e) => e.kind === 'READING');
    const last = readings[0];
    const band = bandOfScore(last?.news2);
    const notes = notesFor(b).sort((x, y) => y.at.localeCompare(x.at));
    return (
      <>
        <HmsDetailHeader icon={BedDouble} title={`${b.bed.bedNumber} · ${occ.patientName}`} badge={roundedToday(b) ? <HmsBadge tone="green">Rounded today</HmsBadge> : <HmsBadge tone="amber">To round</HmsBadge>} subtitle={<><span style={MONO}>{occ.uhid}</span> · {occ.age ? `${occ.age} y` : '—'} · {occ.gender} · {b.buildingName} · {b.wardName}</>} />
        <HmsStatStrip
          items={[
            { label: 'Admitted', value: occ.admissionDate ? occ.admissionDate.slice(0, 10) : '—', note: occ.ipdAdmissionNo },
            { label: 'Acuity', value: (occ.acuity || '—').toLowerCase(), tone: occ.acuity === 'CRITICAL' ? 'red' : occ.acuity === 'GUARDED' ? 'amber' : 'default' },
            { label: 'Last NEWS2', value: last?.news2 ?? '—', tone: band === 'HIGH' ? 'red' : band === 'MEDIUM' ? 'amber' : 'default', note: last ? clock(last.at) : 'No chart' },
            { label: 'Nurse', value: occ.primaryNurse?.name || '—' },
          ]}
        />
        <HmsDetailBody>
          {band && band !== 'LOW' && <HmsNotice tone={band === 'HIGH' ? 'red' : 'amber'}>{NEWS_BAND[band].action}</HmsNotice>}
          <HmsSection title="Admission">
            <HmsRow label="Diagnosis / reason" value={occ.diagnosis || '—'} />
            <HmsRow label="Other doctors" value={occ.consultingDoctors?.length ? occ.consultingDoctors.map((c) => `${c.name} (${c.specialty})`).join(', ') : '—'} last />
          </HmsSection>
          <HmsSection title={`Nursing chart · ${readings.length}`}>
            {readings.length === 0 && <div style={{ padding: '12px 16px', fontSize: '14px', color: HMS.textSecondary }}>No readings charted by the nurses on this stay.</div>}
            {readings.slice(0, 6).map((e, i) => (
              <HmsRow key={e.id} label={clock(e.at)} value={`BP ${e.bp || '—'} · P ${e.pulse ?? '—'} · SpO₂ ${e.spo2 ?? '—'}% · NEWS2 ${e.news2 ?? '—'}`} hint={e.by} last={i === Math.min(readings.length, 6) - 1} />
            ))}
          </HmsSection>
          <HmsSection title={`Round notes · ${notes.length}`}>
            {notes.length === 0 && <div style={{ padding: '12px 16px', fontSize: '14px', color: HMS.textSecondary }}>No round notes yet.</div>}
            {notes.map((n, i) => (
              <HmsRow key={n.id} label={new Date(n.at).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} value={<span style={{ whiteSpace: 'pre-wrap' }}>{n.note}{n.plan ? ` — Plan: ${n.plan}` : ''}</span>} hint={n.doctor} last={i === notes.length - 1} />
            ))}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton variant="primary" icon={NotebookPen} block onClick={() => { setWriting(b); setNote(''); setPlan(PLANS[0]); }}>
            Write round note
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="doc-ward"
        title="My inpatients"
        description="Admitted and day-care patients under you, with the nurses' chart."
        total={data.beds.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search bed, ward, patient or UHID"
        pills={[
          { key: 'toround', label: 'To round', count: data.beds.filter(match.toround).length, tone: 'amber' },
          { key: 'done', label: 'Rounded today', count: data.beds.filter(roundedToday).length },
          { key: 'all', label: 'All', count: data.beds.length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open patient"
        detailLabel="Inpatient"
        emptyText="No patients match this search or filter."
        renderDetail={renderDetail}
      />
      {writing && (
        <HmsModal
          title={`Round note · ${writing.bed.inpatientDetails?.patientName}`}
          description={`${writing.bed.bedNumber} · ${writing.wardName}`}
          width={640}
          onClose={() => setWriting(null)}
          footer={
            <>
              <HmsButton onClick={() => setWriting(null)}>Cancel</HmsButton>
              <HmsButton
                variant="primary"
                icon={NotebookPen}
                disabled={note.trim().length < 5}
                onClick={() => {
                  const occ = writing.bed.inpatientDetails!;
                  const w = writing;
                  void opdActions.roundNote(w, note.trim(), plan, () => patientJourneyService.addRoundNote({ id: `rn-${new Date().getTime()}`, bedId: w.bed.id, admissionNo: occ.ipdAdmissionNo, uhid: occ.uhid, patientName: occ.patientName, doctor: data.doctor?.name || act.userName, at: new Date().toISOString(), note: note.trim(), plan })).then((ok) => {
                    data.reload();
                    if (!ok) return;
                    setWriting(null);
                    act.notify(`Round note saved for ${occ.patientName}`);
                  });
                }}
              >
                Save note
              </HmsButton>
            </>
          }
        >
          <HmsField label="Progress" htmlFor="rn-note" required>
            <textarea id="rn-note" style={{ ...TEXTAREA, minHeight: '120px' }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Subjective, findings, response to treatment" />
          </HmsField>
          <HmsField label="Plan">
            <Choice label="Plan" value={plan} options={PLANS.map((p) => ({ key: p, label: p }))} onChange={setPlan} />
          </HmsField>
        </HmsModal>
      )}
    </>
  );
};
