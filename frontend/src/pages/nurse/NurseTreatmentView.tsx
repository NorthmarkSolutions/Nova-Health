// Nurse — treatment room. Injections, drips and nebulisation the doctor prescribed today for giving in the clinic,
// plus dressings, ECGs and other procedures done on a doctor's order. Each is recorded with the five-rights check,
// site and batch, or as refused with the reason.
import React, { useState } from 'react';
import { Syringe, Plus, Printer } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty } from '../../components/hms';
import { NurseProcedure } from '../../services/patientJourneyService';
import { MONO, printSlip } from '../reception/receptionData';
import { AdministerModal } from './NurseModals';
import { NurseActions, NurseData, ClinicDose, PROC_KIND, clinicDoses, clock, isTodayDate } from './nurseData';

export interface NurseTreatmentViewProps {
  data: NurseData;
  act: NurseActions;
  initialFilter?: string;
  newSignal?: number;
}

const PILLS = ['togive', 'given', 'refused', 'all'];
type Item = { key: string; dose?: ClinicDose; proc?: NurseProcedure };

export const NurseTreatmentView: React.FC<NurseTreatmentViewProps> = ({ data, act, initialFilter, newSignal = 0 }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'togive');
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ dose?: ClinicDose } | null>(null);
  // Alt+N from the workspace opens "record a procedure"
  const [seenSignal, setSeenSignal] = useState(newSignal);
  if (newSignal !== seenSignal) {
    setSeenSignal(newSignal);
    setDialog({});
  }

  const doses = clinicDoses(data.prescriptions, data.procedures);
  const manual = data.procedures.filter((p) => !p.rxNo && isTodayDate(new Date(p.at)));
  const items: Item[] = [...doses.map((d) => ({ key: `d:${d.key}`, dose: d, proc: d.done })), ...manual.map((p) => ({ key: `p:${p.id}`, proc: p }))];
  const state = (i: Item) => (!i.proc ? 'togive' : i.proc.status === 'REFUSED' ? 'refused' : 'given');
  const q = search.trim().toLowerCase();
  const list = items.filter((i) => (pill === 'all' || state(i) === pill) && (!q || [i.dose?.rx.patientName, i.proc?.patientName, i.dose?.rx.uhid, i.proc?.uhid, i.dose?.name, i.proc?.detail, i.dose?.rx.doctorName].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = list.map((i) => {
    const st = state(i);
    const name = i.dose?.rx.patientName || i.proc?.patientName || '';
    return {
      key: i.key,
      title: `${name} · ${i.dose?.name || i.proc?.detail}`,
      badge: st === 'togive' ? <HmsBadge tone="amber">To give</HmsBadge> : st === 'refused' ? <HmsBadge tone="red">Refused</HmsBadge> : <HmsBadge tone="green">Given</HmsBadge>,
      sub: <><span style={MONO}>{i.dose?.rx.uhid || i.proc?.uhid}</span> · {i.dose?.rx.doctorName || i.proc?.orderedBy}</>,
      metaLeft: i.dose ? i.dose.dose || 'As prescribed' : PROC_KIND[i.proc!.kind],
      metaRight: i.proc ? `${clock(i.proc.at)} · ${i.proc.by}` : i.dose?.rx.prescriptionNo,
    };
  });

  const renderDetail = (key: string | null) => {
    const i = items.find((x) => x.key === key);
    if (!i) return <HmsEmpty>{items.length ? 'Select an item from the list.' : 'Nothing for the treatment room today. Injections, drips and nebulisation the doctors prescribe appear here; record other procedures with "Record procedure".'}</HmsEmpty>;
    const p = i.proc;
    const d = i.dose;
    const st = state(i);
    return (
      <>
        <HmsDetailHeader icon={Syringe} title={d?.name || p!.detail} badge={st === 'togive' ? <HmsBadge tone="amber">To give</HmsBadge> : st === 'refused' ? <HmsBadge tone="red">Refused</HmsBadge> : <HmsBadge tone="green">Given</HmsBadge>} subtitle={<>{d?.rx.patientName || p!.patientName} · <span style={MONO}>{d?.rx.uhid || p!.uhid}</span></>} />
        <HmsStatStrip
          items={[
            { label: 'Type', value: PROC_KIND[p?.kind || (d ? 'INJECTION' : 'OTHER')] },
            { label: 'Ordered by', value: (d?.rx.doctorName || p!.orderedBy).replace(/^Dr\.?\s*/, 'Dr '), note: d?.rx.prescriptionNo },
            { label: p ? 'Done at' : 'Prescribed', value: p ? clock(p.at) : d!.rx.date, note: p?.by },
            { label: 'Route · site', value: p?.route || '—', note: p?.site },
          ]}
        />
        <HmsDetailBody>
          {st === 'refused' && <HmsNotice tone="red">Not given: {p?.note}</HmsNotice>}
          {d && (
            <HmsSection title="Prescription line">
              <HmsRow label="Medicine" value={d.name} />
              <HmsRow label="Dose & instructions" value={d.dose || '—'} />
              <HmsRow label="Diagnosis" value={d.rx.diagnosis || '—'} last />
            </HmsSection>
          )}
          {p && (
            <HmsSection title="Record">
              <HmsRow label="Given / done" value={p.detail} />
              <HmsRow label="Batch no." value={p.batchNo || '—'} />
              <HmsRow label="Note" value={p.note || '—'} />
              <HmsRow label="By" value={p.by} hint={new Date(p.at).toLocaleString()} last />
            </HmsSection>
          )}
          {!p && <HmsNotice tone="blue">Check two identifiers and allergies with the patient before giving.</HmsNotice>}
        </HmsDetailBody>
        <HmsDetailFooter>
          {!p ? (
            <HmsButton variant="primary" icon={Syringe} block onClick={() => setDialog({ dose: d })}>
              Give / record
            </HmsButton>
          ) : (
            <HmsButton
              icon={Printer}
              block
              onClick={() => {
                const ok = printSlip('Treatment record', [['Patient', `${p.patientName} (${p.uhid})`], ['Item', p.detail], ['Ordered by', p.orderedBy], ['Route / site', [p.route, p.site].filter(Boolean).join(' · ') || '—'], ['Batch', p.batchNo || '—'], ['Outcome', p.status === 'GIVEN' ? 'Given' : `Refused — ${p.note || ''}`], ['By', `${p.by} · ${new Date(p.at).toLocaleString()}`]]);
                if (!ok) act.notify('Allow pop-ups to print', 'error');
              }}
            >
              Print record
            </HmsButton>
          )}
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="nurse-treatment"
        title="Treatment room"
        description="Clinic doses prescribed today and procedures done on a doctor's order."
        total={items.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search patient, UHID, medicine or doctor"
        headerAction={
          <HmsButton variant="primary" icon={Plus} onClick={() => setDialog({})} title="Record a procedure (Alt+N)" aria-keyshortcuts="Alt+N">
            Record procedure
          </HmsButton>
        }
        pills={[
          { key: 'togive', label: 'To give', count: items.filter((i) => state(i) === 'togive').length, tone: 'amber' },
          { key: 'given', label: 'Given', count: items.filter((i) => state(i) === 'given').length },
          { key: 'refused', label: 'Refused', count: items.filter((i) => state(i) === 'refused').length },
          { key: 'all', label: 'All', count: items.length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        onPrimary={(k) => {
          const i = items.find((x) => x.key === k);
          if (i && !i.proc) setDialog({ dose: i.dose });
        }}
        primaryLabel="give / record"
        detailLabel="Treatment"
        emptyText="Nothing matches this search or filter."
        renderDetail={renderDetail}
      />
      {dialog && (
        <AdministerModal
          dose={dialog.dose}
          data={data}
          userName={act.userName}
          onClose={() => setDialog(null)}
          onDone={(p) => {
            setDialog(null);
            data.reload();
            act.notify(`${p.detail} ${p.status === 'GIVEN' ? 'recorded as given' : 'recorded as refused'} · ${p.patientName}`);
          }}
        />
      )}
    </>
  );
};
