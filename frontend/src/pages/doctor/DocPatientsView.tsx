// Doctor — my patients: everyone you have seen or have today, with their visit history (diagnoses and prescriptions),
// lab results, outside reports and follow-ups in one place. Reprint any prescription.
import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsSection, HmsRow, HmsEmpty, HMS, initialsOf } from '../../components/hms';
import { SharedPrescription } from '../../services/patientJourneyService';
import { MONO, fmtDate, patientName, sameDoctor, todayIso } from '../reception/receptionData';
import { printRx } from '../assistant/assistantData';
import { DoctorActions, DoctorData } from './doctorData';

export interface DocPatientsViewProps {
  data: DoctorData;
  act: DoctorActions;
  initialFilter?: string;
}

const PILLS = ['today', 'followup', 'all'];
interface Pt {
  uhid: string;
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  visits: SharedPrescription[];
  today: boolean;
}

export const DocPatientsView: React.FC<DocPatientsViewProps> = ({ data, act, initialFilter }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const me = data.doctor?.name || '';

  const map = new Map<string, Pt>();
  data.prescriptions
    .filter((r) => sameDoctor(r.doctorName, me))
    .forEach((r) => {
      const p = map.get(r.uhid) || { uhid: r.uhid, name: r.patientName, age: r.age, gender: r.gender, visits: [], today: false };
      p.visits.push(r);
      map.set(r.uhid, p);
    });
  data.mine.forEach((t) => {
    const p = map.get(t.uhid) || { uhid: t.uhid, name: t.patient, age: t.age, gender: t.gender, phone: t.phone, visits: [], today: false };
    p.today = true;
    p.phone = p.phone || t.phone;
    map.set(t.uhid, p);
  });
  map.forEach((p) => {
    const m = data.patients.find((x) => x.uhid === p.uhid);
    if (m) {
      p.name = patientName(m) || p.name;
      p.phone = p.phone || m.phone;
    }
    p.visits.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  });
  const all = [...map.values()];
  const fuOf = (uhid: string) => data.followUps.filter((f) => f.uhid === uhid && sameDoctor(f.doctorName, me));
  const match: Record<string, (p: Pt) => boolean> = {
    today: (p) => p.today,
    followup: (p) => fuOf(p.uhid).some((f) => f.status !== 'COMPLETED' && f.followUpDate >= todayIso()),
    all: () => true,
  };
  const q = search.trim().toLowerCase();
  const list = all.filter((p) => match[pill](p) && (!q || [p.name, p.uhid, p.phone, ...p.visits.map((v) => v.diagnosis)].some((v) => (v || '').toLowerCase().includes(q)))).sort((a, b) => (b.visits[0]?.date || '').localeCompare(a.visits[0]?.date || ''));
  const rows: HmsListRow[] = list.map((p) => ({
    key: `p:${p.uhid}`,
    title: p.name,
    badge: p.today ? <HmsBadge tone="blue">Today</HmsBadge> : undefined,
    sub: <><span style={MONO}>{p.uhid}</span> · {p.age ? `${p.age} y` : '—'} {p.gender ? p.gender[0] : ''}</>,
    metaLeft: p.visits[0] ? `${fmtDate(p.visits[0].date)} · ${p.visits[0].diagnosis || '—'}` : 'No prescription yet',
    metaRight: `${p.visits.length} visit${p.visits.length === 1 ? '' : 's'}`,
  }));

  const renderDetail = (key: string | null) => {
    const p = all.find((x) => `p:${x.uhid}` === key);
    if (!p) return <HmsEmpty>{all.length ? 'Select a patient from the list.' : 'Patients appear here once you see them.'}</HmsEmpty>;
    const labs = data.labOrders.filter((o) => o.uhid === p.uhid && !o.cancelled);
    const docs = data.documents.filter((d) => d.uhid === p.uhid);
    const fus = fuOf(p.uhid);
    return (
      <>
        <HmsDetailHeader avatar={initialsOf(p.name)} title={p.name} badge={p.today ? <HmsBadge tone="blue">In clinic today</HmsBadge> : undefined} subtitle={<><span style={MONO}>{p.uhid}</span> · {p.age ? `${p.age} y` : 'age —'} · {p.gender || '—'} · {p.phone || 'no phone'}</>} />
        <HmsStatStrip
          items={[
            { label: 'Visits', value: p.visits.length, note: p.visits[0] ? `Last ${fmtDate(p.visits[0].date)}` : undefined },
            { label: 'Lab tests', value: labs.length, note: labs.filter((o) => o.stage === 'REPORT_GENERATED' && (o.isFlaggedAbnormal || o.isFlaggedCritical)).length ? 'Abnormal on file' : undefined },
            { label: 'Outside reports', value: docs.length },
            { label: 'Follow-up', value: fus.find((f) => f.status !== 'COMPLETED') ? fmtDate(fus.find((f) => f.status !== 'COMPLETED')!.followUpDate) : '—', note: fus.find((f) => f.status !== 'COMPLETED')?.status === 'BOOKED' ? 'Booked' : fus.length ? 'To book' : undefined },
          ]}
        />
        <HmsDetailBody>
          {p.visits.length === 0 && <div style={{ fontSize: '14px', color: HMS.textSecondary }}>No prescriptions from you yet.</div>}
          {p.visits.map((v) => (
            <HmsSection key={v.id} title={`${fmtDate(v.date)} · ${v.diagnosis || 'Visit'}${v.diagnosisCode ? ` (${v.diagnosisCode})` : ''}`} right={<HmsButton size="sm" icon={Printer} onClick={() => { if (!printRx(v)) act.notify('Allow pop-ups to print', 'error'); }}>Print</HmsButton>} defaultOpen={v === p.visits[0]}>
              <HmsRow label="Complaint" value={v.chiefComplaints || '—'} />
              {v.examination && <HmsRow label="Examination" value={<span style={{ whiteSpace: 'pre-wrap' }}>{v.examination}</span>} />}
              <HmsRow label="Medicines" value={v.items.length ? v.items.map((i) => `${i.medicineName} ${i.frequency} × ${i.durationDays} d`).join('; ') : 'None'} />
              {v.investigations?.length ? <HmsRow label="Investigations" value={v.investigations.join(', ')} /> : null}
              {v.advice && <HmsRow label="Advice" value={v.advice} />}
              {v.referral && <HmsRow label="Referral" value={v.referral} />}
              <HmsRow label="Prescription" value={<span style={MONO}>{v.prescriptionNo}</span>} hint={v.doctorName} last />
            </HmsSection>
          ))}
          {labs.length > 0 && (
            <HmsSection title={`Lab · ${labs.length}`} defaultOpen={false}>
              {labs.map((o, i) => (
                <HmsRow key={o.id} label={o.testName} hint={o.orderNo} value={o.stage === 'REPORT_GENERATED' ? <HmsBadge tone={o.isFlaggedCritical ? 'red' : o.isFlaggedAbnormal ? 'amber' : 'green'}>{o.isFlaggedCritical ? 'Critical' : o.isFlaggedAbnormal ? 'Abnormal' : 'Normal'}</HmsBadge> : <HmsBadge tone="blue">Pending</HmsBadge>} last={i === labs.length - 1} />
              ))}
            </HmsSection>
          )}
          {docs.length > 0 && (
            <HmsSection title={`Outside reports · ${docs.length}`} defaultOpen={false}>
              {docs.map((d, i) => (
                <HmsRow key={d.id} label={d.title} hint={`${d.source} · ${d.reportDate}`} value={d.fileName ? 'Scan attached' : 'Paper copy'} last={i === docs.length - 1} />
              ))}
            </HmsSection>
          )}
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="doc-patients"
      title="My patients"
      description="Everyone you have seen, with their visit history and results."
      total={all.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search name, UHID, phone or diagnosis"
      pills={[
        { key: 'today', label: 'Today', count: all.filter(match.today).length },
        { key: 'followup', label: 'Follow-up due', count: all.filter(match.followup).length },
        { key: 'all', label: 'All', count: all.length },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open history"
      detailLabel="Patient"
      emptyText="No patients match this search or filter."
      renderDetail={renderDetail}
    />
  );
};

