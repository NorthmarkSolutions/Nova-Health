// Nurse — triage register. Every patient triaged today with the times that matter for audit: token issued → triage
// started (time to triage) → sent to doctor (triage duration), the category, NEWS2 and who triaged. Printable.
import React, { useState } from 'react';
import { ClipboardCheck, Printer } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsSection, HmsRow, HmsEmpty, HMS, initialsOf } from '../../components/hms';
import { SharedQueueToken } from '../../services/patientJourneyService';
import { MONO, fmtWait, printSlip, tokenLabel } from '../reception/receptionData';
import { NurseActions, NurseData, avgMin as avg, categoryOf, clock, timeToTriage, triageDuration, triagedToday } from './nurseData';

export interface NurseRegisterViewProps {
  data: NurseData;
  act: NurseActions;
  initialFilter?: string;
}

const PILLS = ['all', 'priority', 'news', 'mine'];
export const NurseRegisterView: React.FC<NurseRegisterViewProps> = ({ data, act, initialFilter }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(null);

  const done = data.queue.filter(triagedToday).sort((a, b) => (b.assessment?.triagedAt || '').localeCompare(a.assessment?.triagedAt || ''));
  const match: Record<string, (t: SharedQueueToken) => boolean> = {
    all: () => true,
    priority: (t) => ['IMMEDIATE', 'VERY_URGENT', 'URGENT'].includes(t.assessment?.triageCategory || ''),
    news: (t) => (t.vitals?.news2 ?? -1) >= 5,
    mine: (t) => t.assessment?.triagedBy === act.userName,
  };
  const q = search.trim().toLowerCase();
  const list = done.filter((t) => match[pill](t) && (!q || [t.patient, t.uhid, String(t.token), t.doctor, t.assessment?.triagedBy].some((v) => (v || '').toLowerCase().includes(q))));
  const toTriage = avg(done.map(timeToTriage));
  const duration = avg(done.map(triageDuration));
  const rows: HmsListRow[] = list.map((t) => {
    const c = categoryOf(t.assessment?.triageCategory);
    return {
      key: `t:${t.token}`,
      title: `${tokenLabel(t.token)} · ${t.patient}`,
      badge: c ? <HmsBadge tone={c.tone === 'gray' ? 'gray' : c.tone}>{c.label}</HmsBadge> : <HmsBadge tone="gray">No category</HmsBadge>,
      sub: <><span style={MONO}>{t.uhid}</span> · {t.doctor.replace(/\s*\(.*\)$/, '')}</>,
      metaLeft: `Sent ${clock(t.assessment?.triagedAt)} · ${t.assessment?.triagedBy || '—'}`,
      metaRight: t.vitals?.news2 !== undefined ? `NEWS2 ${t.vitals.news2}` : t.vitals?.bp ? `BP ${t.vitals.bp}` : '—',
    };
  });

  const print = () => {
    const ok = printSlip(
      `Triage register · ${new Date().toLocaleDateString()}`,
      [
        ['Patients triaged', String(done.length)],
        ['Average time to triage', fmtWait(toTriage)],
        ['Average triage time', fmtWait(duration)],
        ...done.map((t) => [`${tokenLabel(t.token)} ${t.patient}`, `${categoryOf(t.assessment?.triageCategory)?.label || '—'} · BP ${t.vitals?.bp || '—'} · NEWS2 ${t.vitals?.news2 ?? '—'} · ${clock(t.assessment?.triagedAt)} ${t.assessment?.triagedBy || ''}`.trim()] as [string, string]),
      ],
    );
    if (!ok) act.notify('Allow pop-ups to print', 'error');
  };

  const renderDetail = (key: string | null) => {
    const t = data.queue.find((x) => `t:${x.token}` === key);
    if (!t) return <HmsEmpty>{done.length ? 'Select a patient from the list.' : 'Nobody has been triaged today yet.'}</HmsEmpty>;
    const v = t.vitals;
    const a = t.assessment;
    const c = categoryOf(a?.triageCategory);
    return (
      <>
        <HmsDetailHeader avatar={initialsOf(t.patient)} title={`${tokenLabel(t.token)} · ${t.patient}`} badge={c ? <HmsBadge tone={c.tone === 'gray' ? 'gray' : c.tone}>{c.label}</HmsBadge> : undefined} subtitle={<><span style={MONO}>{t.uhid}</span> · {t.age ? `${t.age} y` : '—'} · {t.gender || '—'} · {t.doctor}</>} />
        <HmsStatStrip
          items={[
            { label: 'Time to triage', value: fmtWait(timeToTriage(t)), note: 'Token → triage start' },
            { label: 'Triage time', value: fmtWait(triageDuration(t)), note: 'Start → sent to doctor' },
            { label: 'NEWS2', value: v?.news2 ?? '—', tone: (v?.news2 ?? 0) >= 7 ? 'red' : (v?.news2 ?? 0) >= 5 ? 'amber' : 'default' },
            { label: 'Triaged by', value: a?.triagedBy || '—', note: clock(a?.triagedAt) },
          ]}
        />
        <HmsDetailBody>
          <HmsSection title="Vital signs">
            <HmsRow label="BP · pulse" value={`${v?.bp || '—'} · ${v?.pulse ?? '—'} bpm`} />
            <HmsRow label="SpO₂ · RR" value={`${v?.spo2 ?? '—'}%${v?.onOxygen ? ' on O₂' : ''} · ${v?.respiratoryRate ?? '—'}/min`} />
            <HmsRow label="Temperature · ACVPU" value={`${v?.temp ?? '—'} °F · ${v?.avpu || '—'}`} />
            <HmsRow label="Weight · BMI · sugar" value={`${v?.weight ?? '—'} kg · ${v?.bmi ?? '—'} · ${v?.rbs ?? '—'} mg/dL`} last />
          </HmsSection>
          <HmsSection title="Assessment">
            <HmsRow label="Complaint" value={a?.chiefComplaint || '—'} />
            <HmsRow label="Pain" value={a?.painScale !== undefined ? `${a.painScale}/10` : '—'} />
            <HmsRow label="Allergies" value={a?.allergies?.length ? a.allergies.join(', ') : '—'} />
            <HmsRow label="Fall risk" value={a?.fallRisk ? a.fallRisk.toLowerCase() : '—'} />
            <HmsRow label="Note" value={a?.nurseNotes || '—'} last />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="nurse-register"
      title="Triage register"
      description="Everyone triaged today, with time to triage and who triaged."
      total={done.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search name, UHID, token, doctor or nurse"
      headerAction={
        <HmsButton icon={Printer} onClick={print} disabled={!done.length}>
          Print
        </HmsButton>
      }
      leftExtra={
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: HMS.textSecondary }}>
          <span>
            <ClipboardCheck size={14} style={{ verticalAlign: '-2px' }} /> Avg time to triage <strong style={{ color: HMS.text }}>{fmtWait(toTriage)}</strong>
          </span>
          <span>
            Avg triage <strong style={{ color: HMS.text }}>{fmtWait(duration)}</strong>
          </span>
        </div>
      }
      pills={[
        { key: 'all', label: 'All', count: done.length },
        { key: 'priority', label: 'Urgent+', count: done.filter(match.priority).length, tone: 'amber' },
        { key: 'news', label: 'NEWS2 5+', count: done.filter(match.news).length, tone: 'red' },
        { key: 'mine', label: 'By me', count: done.filter(match.mine).length },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open record"
      detailLabel="Triage record"
      emptyText="Nobody matches this search or filter."
      renderDetail={renderDetail}
    />
  );
};
