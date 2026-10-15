// Nurse — day-care observation. The beds the front desk allocated, each with its nursing chart: serial vitals with
// NEWS2, the next check timed from the last score, escalation to the doctor and discharge on the doctor's order.
import React, { useState } from 'react';
import { BedDouble, Activity, ShieldAlert, LogOut, Printer } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HMS } from '../../components/hms';
import { patientJourneyService, FlatCampusBed } from '../../services/patientJourneyService';
import { opdActions } from '../../services/opdActions';
import { ReasonModal } from '../reception/ReceptionModals';
import { MONO, printSlip } from '../reception/receptionData';
import { ObservationModal, EscalateModal } from './NurseModals';
import { NurseActions, NurseData, NEWS_BAND, bandOfScore, chartFor, clock, obsDue } from './nurseData';

export interface NurseObservationViewProps {
  data: NurseData;
  act: NurseActions;
  initialFilter?: string;
}

const PILLS = ['all', 'due', 'high', 'escalated'];
const TH: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: '12px', fontWeight: 600, color: HMS.label, borderBottom: `1px solid ${HMS.border}`, whiteSpace: 'nowrap' };
const TD: React.CSSProperties = { padding: '8px 10px', fontSize: '13px', borderBottom: `1px solid ${HMS.divider}`, verticalAlign: 'top' };
const since = (s?: string) => {
  if (!s) return '—';
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? s : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const NurseObservationView: React.FC<NurseObservationViewProps> = ({ data, act, initialFilter }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [reading, setReading] = useState<FlatCampusBed | null>(null);
  const [escalate, setEscalate] = useState<FlatCampusBed | null>(null);
  const [discharge, setDischarge] = useState<FlatCampusBed | null>(null);
  const now = data.lastSync.getTime();

  const info = (b: FlatCampusBed) => {
    const entries = chartFor(data.chart, b);
    const due = obsDue(entries, now);
    const lastEsc = entries.find((e) => e.kind === 'ESCALATION');
    const band = bandOfScore(due.last?.news2);
    return { entries, due, lastEsc, band, isDue: due.dueIn <= 0 };
  };
  const beds = data.occupiedBeds;
  const match: Record<string, (b: FlatCampusBed) => boolean> = {
    all: () => true,
    due: (b) => info(b).isDue,
    high: (b) => (info(b).due.last?.news2 ?? -1) >= 5,
    escalated: (b) => !!info(b).lastEsc,
  };
  const q = search.trim().toLowerCase();
  const list = beds.filter((b) => match[pill](b) && (!q || [b.bed.bedNumber, b.wardName, b.bed.inpatientDetails?.patientName, b.bed.inpatientDetails?.uhid].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = list.map((b) => {
    const occ = b.bed.inpatientDetails!;
    const i = info(b);
    return {
      key: `b:${b.bed.id}`,
      title: `${b.bed.bedNumber} · ${occ.patientName}`,
      badge: !i.due.last ? <HmsBadge tone="amber">First obs due</HmsBadge> : i.isDue ? <HmsBadge tone="red">Obs overdue</HmsBadge> : i.band ? <HmsBadge tone={NEWS_BAND[i.band].tone}>NEWS2 {i.due.last.news2}</HmsBadge> : <HmsBadge tone="blue">Charted</HmsBadge>,
      sub: <><span style={MONO}>{occ.uhid}</span> · {occ.primaryDoctor?.name || '—'} · since {since(occ.admissionDate)}</>,
      metaLeft: i.due.last ? `Last ${clock(i.due.last.at)}${i.due.last.bp ? ` · BP ${i.due.last.bp}` : ''}` : 'No observations yet',
      metaRight: i.due.last ? (i.isDue ? `Overdue ${-i.due.dueIn} min` : `Next in ${i.due.dueIn} min`) : 'Due now',
    };
  });

  const renderDetail = (key: string | null) => {
    const b = data.occupiedBeds.find((x) => `b:${x.bed.id}` === key);
    if (!b) return <HmsEmpty>{beds.length ? 'Select a bed from the list.' : data.daycareBeds.length ? 'No patients on day-care beds. The front desk allocates beds from Reception → Day-care beds.' : 'No day-care or observation ward is set up. Ask Admin to add one.'}</HmsEmpty>;
    const occ = b.bed.inpatientDetails!;
    const i = info(b);
    const last = i.due.last;
    const readings = i.entries.filter((e) => e.kind === 'READING');
    return (
      <>
        <HmsDetailHeader icon={BedDouble} title={`${b.bed.bedNumber} · ${occ.patientName}`} badge={i.isDue ? <HmsBadge tone="red">Obs due</HmsBadge> : i.band ? <HmsBadge tone={NEWS_BAND[i.band].tone}>{NEWS_BAND[i.band].label} risk</HmsBadge> : undefined} subtitle={<><span style={MONO}>{occ.uhid}</span> · {occ.age ? `${occ.age} y` : '—'} · {occ.gender} · {b.wardName}</>} />
        <HmsStatStrip
          items={[
            { label: 'NEWS2', value: last?.news2 ?? '—', tone: i.band === 'HIGH' ? 'red' : i.band === 'MEDIUM' ? 'amber' : 'default', note: last ? `at ${clock(last.at)}` : 'Not charted' },
            { label: 'BP · pulse', value: last?.bp ? `${last.bp}` : '—', note: last?.pulse ? `${last.pulse} bpm` : undefined },
            { label: 'SpO₂', value: last?.spo2 !== undefined ? `${last.spo2}%` : '—', tone: last?.spo2 !== undefined && last.spo2 < 94 ? 'red' : 'default', note: last?.onOxygen ? 'On oxygen' : last ? 'Room air' : undefined },
            { label: 'Next check', value: !last ? 'Now' : i.isDue ? 'Overdue' : `${i.due.dueIn} min`, tone: i.isDue ? 'red' : 'default', note: i.due.intervalMin ? `Every ${i.due.intervalMin} min` : 'First set of obs' },
          ]}
        />
        <HmsDetailBody>
          {i.band && i.band !== 'LOW' && <HmsNotice tone={i.band === 'HIGH' ? 'red' : 'amber'}>{NEWS_BAND[i.band].action}</HmsNotice>}
          {i.lastEsc && <HmsNotice tone="amber">Escalated to {i.lastEsc.escalatedTo} at {clock(i.lastEsc.at)}: {i.lastEsc.note}</HmsNotice>}
          <HmsSection title="Stay">
            <HmsRow label="Reason" value={occ.diagnosis || '—'} />
            <HmsRow label="Doctor" value={occ.primaryDoctor?.name || '—'} />
            <HmsRow label="Day-care no." value={<span style={MONO}>{occ.ipdAdmissionNo}</span>} hint={`Since ${since(occ.admissionDate)}`} last />
          </HmsSection>
          <HmsSection title={`Nursing chart · ${readings.length} reading${readings.length === 1 ? '' : 's'}`}>
            {i.entries.length === 0 ? (
              <div style={{ padding: '16px', fontSize: '14px', color: HMS.textSecondary }}>No observations yet. Record the first set now.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Time', 'BP', 'Pulse', 'SpO₂', 'RR', 'Temp', 'ACVPU', 'NEWS2', 'Note', 'By'].map((h) => (
                        <th key={h} scope="col" style={TH}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {i.entries.map((e) =>
                      e.kind === 'READING' ? (
                        <tr key={e.id}>
                          <td style={TD}>{clock(e.at)}</td>
                          <td style={TD}>{e.bp || '—'}</td>
                          <td style={TD}>{e.pulse ?? '—'}</td>
                          <td style={{ ...TD, color: e.spo2 !== undefined && e.spo2 < 94 ? '#dc2626' : undefined, fontWeight: e.spo2 !== undefined && e.spo2 < 94 ? 600 : undefined }}>
                            {e.spo2 !== undefined ? `${e.spo2}%${e.onOxygen ? ' O₂' : ''}` : '—'}
                          </td>
                          <td style={TD}>{e.respiratoryRate ?? '—'}</td>
                          <td style={TD}>{e.temp ?? '—'}</td>
                          <td style={TD}>{e.avpu || '—'}</td>
                          <td style={TD}>{e.news2 !== undefined ? <HmsBadge tone={NEWS_BAND[bandOfScore(e.news2)!].tone}>{e.news2}</HmsBadge> : '—'}</td>
                          <td style={{ ...TD, color: HMS.textSecondary }}>{[e.pain !== undefined ? `Pain ${e.pain}/10` : '', e.note || ''].filter(Boolean).join(' · ') || '—'}</td>
                          <td style={{ ...TD, color: HMS.textSecondary, whiteSpace: 'nowrap' }}>{e.by}</td>
                        </tr>
                      ) : (
                        <tr key={e.id} style={{ background: e.kind === 'ESCALATION' ? '#fffbeb' : HMS.subtle }}>
                          <td style={TD}>{clock(e.at)}</td>
                          <td style={TD} colSpan={8}>
                            {e.kind === 'ESCALATION' ? <><strong>Escalated to {e.escalatedTo}:</strong> {e.note}</> : e.note}
                          </td>
                          <td style={{ ...TD, color: HMS.textSecondary, whiteSpace: 'nowrap' }}>{e.by}</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
            <HmsButton variant="primary" icon={Activity} block onClick={() => setReading(b)}>
              Record observation
            </HmsButton>
            <HmsButton variant="danger" icon={ShieldAlert} block onClick={() => setEscalate(b)}>
              Escalate to doctor
            </HmsButton>
            <HmsButton
              icon={Printer}
              block
              disabled={!readings.length}
              onClick={() => {
                const ok = printSlip(`Nursing chart · ${b.bed.bedNumber}`, [['Patient', `${occ.patientName} (${occ.uhid})`], ['Reason', occ.diagnosis || '—'], ...readings.slice().reverse().map((e) => [clock(e.at), `BP ${e.bp || '—'} · P ${e.pulse ?? '—'} · SpO₂ ${e.spo2 ?? '—'} · NEWS2 ${e.news2 ?? '—'}`] as [string, string])]);
                if (!ok) act.notify('Allow pop-ups to print', 'error');
              }}
            >
              Print chart
            </HmsButton>
            <HmsButton icon={LogOut} block onClick={() => setDischarge(b)}>
              Discharge
            </HmsButton>
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="nurse-obs"
        title="Day-care observation"
        description="Patients on day-care beds. The next check is timed from the last early warning score."
        total={beds.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search bed, ward, patient or UHID"
        pills={[
          { key: 'all', label: 'All', count: beds.length },
          { key: 'due', label: 'Obs due', count: beds.filter(match.due).length, tone: 'red' },
          { key: 'high', label: 'NEWS2 5+', count: beds.filter(match.high).length, tone: 'amber' },
          { key: 'escalated', label: 'Escalated', count: beds.filter(match.escalated).length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        onPrimary={(k) => {
          const b = data.occupiedBeds.find((x) => `b:${x.bed.id}` === k);
          if (b) setReading(b);
        }}
        primaryLabel="record observation"
        detailLabel="Bed"
        emptyText="No beds match this search or filter."
        renderDetail={renderDetail}
      />
      {reading && (
        <ObservationModal
          bed={reading}
          userName={act.userName}
          onClose={() => setReading(null)}
          onDone={(score) => {
            const bed = reading;
            setReading(null);
            data.reload();
            act.notify(`Observation charted for ${bed.bed.inpatientDetails?.patientName}${score !== null ? ` · NEWS2 ${score}` : ''}`, score !== null && score >= 7 ? 'error' : 'success');
          }}
        />
      )}
      {escalate && (
        <EscalateModal
          bed={escalate}
          data={data}
          userName={act.userName}
          lastNews={info(escalate).due.last?.news2}
          onClose={() => setEscalate(null)}
          onDone={(to) => {
            setEscalate(null);
            data.reload();
            act.notify(`Escalated to ${to}`);
          }}
        />
      )}
      {discharge && (
        <ReasonModal
          title={`Discharge ${discharge.bed.inpatientDetails?.patientName} from ${discharge.bed.bedNumber}?`}
          description="Only on the doctor's order. The bed goes to housekeeping; Billing settles the bed charge."
          label="Outcome"
          confirm="Discharge"
          options={['Doctor reviewed — fit to go home', 'Admitted to IPD on doctor’s order', 'Referred / transferred out', 'Left against medical advice']}
          onClose={() => setDischarge(null)}
          onConfirm={(reason) => {
            const b = discharge;
            setDischarge(null);
            if (!opdActions.server()) patientJourneyService.addNurseChartEntry({ id: `chart-${new Date().getTime()}`, chartKey: `${b.bed.id}|${b.bed.inpatientDetails?.ipdAdmissionNo || ''}`, bedId: b.bed.id, uhid: b.bed.inpatientDetails?.uhid || '', patientName: b.bed.inpatientDetails?.patientName || '', kind: 'NOTE', at: new Date().toISOString(), by: act.userName, note: `Discharged: ${reason}` });
            void opdActions.dischargeBed(b, reason).then((ok) => {
              data.reload();
              if (ok) act.notify(`${b.bed.bedNumber} discharged · ${reason.toLowerCase()}`);
            });
          }}
        />
      )}
    </>
  );
};
