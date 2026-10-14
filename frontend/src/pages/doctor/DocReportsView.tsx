// Doctor — reports. Your case mix for today, the last 7 or 30 days: visits by diagnosis, with the medicines and tests
// you used for each, plus the period's totals (visits, patients, tests ordered, follow-ups, referrals). Printable.
import React, { useState } from 'react';
import { BarChart3, Printer } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsSection, HmsRow, HmsEmpty, HmsField, INPUT, HMS } from '../../components/hms';
import { SharedPrescription } from '../../services/patientJourneyService';
import { MONO, fmtDate, fmtWait, printSlip, sameDoctor } from '../reception/receptionData';
import { avgMin, isTodayIso } from '../nurse/nurseData';
import { consultMinutes, isSeen } from '../assistant/assistantData';
import { DoctorActions, DoctorData, addDays } from './doctorData';

export interface DocReportsViewProps {
  data: DoctorData;
  act: DoctorActions;
}

const PERIODS: Record<string, { label: string; days: number }> = { today: { label: 'Today', days: 0 }, week: { label: 'Last 7 days', days: 6 }, month: { label: 'Last 30 days', days: 29 } };
const top = (xs: string[], n = 3) => {
  const m = new Map<string, number>();
  xs.forEach((x) => m.set(x, (m.get(x) || 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
};

export const DocReportsView: React.FC<DocReportsViewProps> = ({ data, act }) => {
  const [period, setPeriod] = useState('week');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const me = data.doctor?.name || '';
  const fromIso = addDays(-PERIODS[period].days);
  const rx = data.prescriptions.filter((r) => sameDoctor(r.doctorName, me) && (period === 'today' ? isTodayIso(r.date) : r.date >= fromIso));
  const groups = new Map<string, SharedPrescription[]>();
  rx.forEach((r) => {
    const k = (r.diagnosis || 'No diagnosis recorded').trim();
    groups.set(k, [...(groups.get(k) || []), r]);
  });
  const q = search.trim().toLowerCase();
  const list = [...groups.entries()].filter(([k]) => !q || k.toLowerCase().includes(q)).sort((a, b) => b[1].length - a[1].length);
  const patients = new Set(rx.map((r) => r.uhid)).size;
  const tests = rx.reduce((s, r) => s + (r.investigations?.length || 0), 0);
  const fus = rx.filter((r) => r.followUpDate).length;
  const refs = rx.filter((r) => r.referral).length;
  const avgConsult = avgMin(data.mine.filter(isSeen).map(consultMinutes));
  const rows: HmsListRow[] = list.map(([k, v]) => ({
    key: `g:${k}`,
    title: k,
    badge: <HmsBadge tone="blue">{v.length}</HmsBadge>,
    sub: v[0].diagnosisCode ? <span style={MONO}>{v[0].diagnosisCode}</span> : 'No ICD-10 code',
    metaLeft: `${new Set(v.map((r) => r.uhid)).size} patient${new Set(v.map((r) => r.uhid)).size === 1 ? '' : 's'}`,
    metaRight: rx.length ? `${Math.round((v.length / rx.length) * 100)}% of visits` : undefined,
    progress: rx.length ? { pct: Math.min(99, (v.length / rx.length) * 100), doneLabel: 'All visits' } : undefined,
  }));

  const print = () => {
    const ok = printSlip(`${me} · ${PERIODS[period].label}`, [
      ['Visits', String(rx.length)],
      ['Patients', String(patients)],
      ['Tests ordered', String(tests)],
      ['Follow-ups advised', String(fus)],
      ['Referrals', String(refs)],
      ...list.map(([k, v]) => [k, String(v.length)] as [string, string]),
    ]);
    if (!ok) act.notify('Allow pop-ups to print', 'error');
  };

  const renderDetail = (key: string | null) => {
    const g = list.find(([k]) => `g:${k}` === key);
    if (!g) return <HmsEmpty>{rx.length ? 'Select a diagnosis from the list.' : `No consultations recorded for ${PERIODS[period].label.toLowerCase()}.`}</HmsEmpty>;
    const [k, v] = g;
    const meds = top(v.flatMap((r) => r.items.map((i) => i.medicineName)));
    const inv = top(v.flatMap((r) => r.investigations || []));
    return (
      <>
        <HmsDetailHeader icon={BarChart3} title={k} badge={<HmsBadge tone="blue">{v.length} visit{v.length === 1 ? '' : 's'}</HmsBadge>} subtitle={`${PERIODS[period].label} · ${v[0].diagnosisCode || 'no ICD-10 code'}`} />
        <HmsStatStrip
          items={[
            { label: 'Visits', value: v.length, note: rx.length ? `${Math.round((v.length / rx.length) * 100)}% of yours` : undefined },
            { label: 'Patients', value: new Set(v.map((r) => r.uhid)).size },
            { label: 'Tests ordered', value: v.reduce((s, r) => s + (r.investigations?.length || 0), 0) },
            { label: 'Follow-ups', value: v.filter((r) => r.followUpDate).length },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title="Most used">
            <HmsRow label="Medicines" value={meds.length ? meds.map(([m, n]) => `${m} (${n})`).join(', ') : '—'} />
            <HmsRow label="Investigations" value={inv.length ? inv.map(([m, n]) => `${m} (${n})`).join(', ') : '—'} last />
          </HmsSection>
          <HmsSection title="Visits">
            {v.map((r, i) => (
              <HmsRow key={r.id} label={`${r.patientName}`} hint={`${fmtDate(r.date)} · ${r.prescriptionNo}`} value={`${r.items.length} medicine${r.items.length === 1 ? '' : 's'}`} last={i === v.length - 1} />
            ))}
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="doc-reports"
      title="Case mix"
      description="Your consultations by diagnosis."
      total={groups.size}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search diagnosis"
      headerAction={
        <HmsButton icon={Printer} onClick={print} disabled={!rx.length}>
          Print
        </HmsButton>
      }
      leftExtra={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <HmsField label="Period" htmlFor="rep-period">
            <select id="rep-period" style={INPUT} value={period} onChange={(e) => { setPeriod(e.target.value); setSelected(null); }}>
              {Object.entries(PERIODS).map(([k, p]) => (
                <option key={k} value={k}>
                  {p.label}
                </option>
              ))}
            </select>
          </HmsField>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: HMS.textSecondary }}>
            <span>Visits <strong style={{ color: HMS.text }}>{rx.length}</strong></span>
            <span>Patients <strong style={{ color: HMS.text }}>{patients}</strong></span>
            <span>Tests <strong style={{ color: HMS.text }}>{tests}</strong></span>
            <span>Follow-ups <strong style={{ color: HMS.text }}>{fus}</strong></span>
            <span>Referrals <strong style={{ color: HMS.text }}>{refs}</strong></span>
            <span>Avg consult today <strong style={{ color: HMS.text }}>{fmtWait(avgConsult)}</strong></span>
          </div>
        </div>
      }
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open diagnosis"
      detailLabel="Diagnosis"
      emptyText="No diagnoses match this search."
      renderDetail={renderDetail}
    />
  );
};
