// Nurse — vitals & triage assessment. Vital signs with the NEWS2 early warning score, a 5-level triage category,
// presenting complaint, allergies / history / medicines (carried forward from the last visit for confirmation),
// fall-risk and pregnancy screening. "Send to doctor" puts the patient in the doctor's queue with everything recorded.
import React, { useRef, useState } from 'react';
import { Save, Send, X, Plus, Megaphone } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsNotice, HmsEmpty, HmsField, HmsToggle, INPUT, TEXTAREA, HMS, initialsOf } from '../../components/hms';
import { patientJourneyService, SharedQueueToken } from '../../services/patientJourneyService';
import { MONO, fmtWait, tokenLabel, waitMinutes } from '../reception/receptionData';
import { Choice, ObsFields, NewsPanel } from './NurseModals';
import { NurseActions, NurseData, CATEGORIES, TriageCategory, EMPTY_OBS, ObsForm, obsOf, news2, suggestedCategory, categoryOf, byTriageOrder, isInTriage, isToTriage, isReadyForDoctor, isEmergency, nurseStatusOf, parseBp, TRIAGE_POINT } from './nurseData';

export interface NurseVitalsViewProps {
  data: NurseData;
  act: NurseActions;
  initialFilter?: string;
  initialSelect?: string;
}

interface Draft {
  obs: ObsForm;
  rbs: string;
  height: string;
  weight: string;
  pain: string;
  category: TriageCategory | '';
  complaint: string;
  nkda: boolean;
  allergies: string[];
  history: string[];
  meds: string[];
  fallRisk: '' | 'LOW' | 'HIGH';
  pregnancy: '' | 'NOT_PREGNANT' | 'PREGNANT' | 'UNKNOWN';
  note: string;
  carriedFrom?: string;
}

const COMPLAINTS = ['Fever', 'Cough / cold', 'Breathlessness', 'Chest pain', 'Abdominal pain', 'Vomiting / loose motions', 'Headache', 'Giddiness', 'Body / joint pain', 'Injury', 'Rash / itching', 'Burning urination', 'Follow-up review', 'Report review'];
const PILLS = ['intriage', 'totriage', 'ready', 'all'];
const s = (v: unknown) => (v === undefined || v === null ? '' : String(v));

const draftFrom = (t: SharedQueueToken, queue: SharedQueueToken[]): Draft => {
  const v = t.vitals;
  const a = t.assessment;
  const bp = parseBp(v?.bp);
  let allergies = a?.allergies ?? t.allergies ?? [];
  let history = a?.medicalHistory ?? t.chronicConditions ?? t.medicalHistory ?? [];
  let meds = a?.currentMedications ?? t.currentMedications ?? [];
  let carriedFrom: string | undefined;
  if (!allergies.length && !history.length && !meds.length) {
    // Carry the last visit's safety information forward — the nurse confirms it with the patient
    const prev = queue.filter((x) => x.uhid === t.uhid && x.id !== t.id && x.assessment).sort((x, y) => (y.assessment?.triagedAt || '').localeCompare(x.assessment?.triagedAt || ''))[0];
    if (prev?.assessment && (prev.assessment.allergies?.length || prev.assessment.medicalHistory?.length || prev.assessment.currentMedications?.length)) {
      allergies = prev.assessment.allergies || [];
      history = prev.assessment.medicalHistory || [];
      meds = prev.assessment.currentMedications || [];
      const at = prev.assessment.triagedAt ? new Date(prev.assessment.triagedAt) : null;
      carriedFrom = at && !Number.isNaN(at.getTime()) ? at.toLocaleDateString() : 'an earlier visit';
    }
  }
  return {
    obs: { ...EMPTY_OBS, sys: bp ? String(bp.sys) : '', dia: bp ? String(bp.dia) : '', pulse: s(v?.pulse), temp: s(v?.temp), spo2: s(v?.spo2), rr: s(v?.respiratoryRate), avpu: v?.avpu || '', onOxygen: !!v?.onOxygen },
    rbs: s(v?.rbs),
    height: s(v?.height),
    weight: s(v?.weight),
    pain: s(v?.painScale ?? a?.painScale),
    category: a?.triageCategory || '',
    complaint: a?.chiefComplaint || (t.triageNotes && !t.triageNotes.startsWith('EMERGENCY') && !t.triageNotes.startsWith('Triage skipped') ? t.triageNotes : ''),
    nkda: allergies.includes('NKDA'),
    allergies: allergies.filter((x) => x !== 'NKDA'),
    history,
    meds,
    fallRisk: a?.fallRisk || '',
    pregnancy: a?.pregnancy || '',
    note: a?.nurseNotes || '',
    carriedFrom,
  };
};

const TagInput: React.FC<{ id: string; label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string; disabled?: boolean; tone?: 'red' | 'gray' }> = ({ id, label, values, onChange, placeholder, disabled, tone = 'gray' }) => {
  const [text, setText] = useState('');
  const add = () => {
    const v = text.trim();
    if (v && !values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setText('');
  };
  return (
    <HmsField label={label} htmlFor={id}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          id={id}
          style={INPUT}
          disabled={disabled}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <HmsButton icon={Plus} disabled={disabled || !text.trim()} onClick={add} aria-label={`Add to ${label}`} title={`Add to ${label}`}>
          Add
        </HmsButton>
      </div>
      {values.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
          {values.map((v) => (
            <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 6px 4px 10px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, background: tone === 'red' ? '#fef2f2' : '#f3f4f6', color: tone === 'red' ? '#b91c1c' : '#374151', border: `1px solid ${tone === 'red' ? '#fecaca' : '#e5e7eb'}` }}>
              {v}
              <button type="button" aria-label={`Remove ${v}`} title={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', padding: '2px', color: 'inherit' }}>
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
    </HmsField>
  );
};

const bpStage = (sys?: number, dia?: number) => {
  if (!sys || !dia) return null;
  if (sys >= 180 || dia >= 120) return { label: 'Hypertensive crisis', tone: 'red' as const };
  if (sys >= 140 || dia >= 90) return { label: 'Stage 2 hypertension', tone: 'red' as const };
  if (sys >= 130 || dia >= 80) return { label: 'Stage 1 hypertension', tone: 'amber' as const };
  if (sys >= 120) return { label: 'Elevated', tone: 'amber' as const };
  if (sys < 90) return { label: 'Low BP', tone: 'amber' as const };
  return { label: 'Normal', tone: 'green' as const };
};

const TriageForm: React.FC<{ t: SharedQueueToken; data: NurseData; act: NurseActions; drafts: React.MutableRefObject<Map<string, Draft>>; onDirty: (id: string, dirty: boolean) => void; onSent: () => void }> = ({ t, data, act, drafts, onDirty, onSent }) => {
  const [d, setD] = useState<Draft>(() => drafts.current.get(t.id) || draftFrom(t, data.queue));
  const [dirty, setDirty] = useState(drafts.current.has(t.id));
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((prev) => {
      const next = { ...prev, [k]: v };
      drafts.current.set(t.id, next);
      return next;
    });
    setDirty(true);
    onDirty(t.id, true);
  };
  const now = data.lastSync.getTime();
  const obs = obsOf(d.obs);
  const r = news2(obs, t.age);
  const suggest = suggestedCategory(r);
  const h = Number(d.height) / 100;
  const bmi = h > 0 && Number(d.weight) > 0 ? Math.round((Number(d.weight) / (h * h)) * 10) / 10 : null;
  const stage = bpStage(obs.sbp, d.obs.dia ? Number(d.obs.dia) : undefined);
  const female = /^f/i.test(t.gender || '');
  const childbearing = female && (t.age || 0) >= 12 && (t.age || 0) <= 50;
  const s2 = nurseStatusOf(t);

  const missing = [
    !(d.obs.sys && d.obs.dia) && 'BP',
    !d.obs.pulse && 'pulse',
    !d.obs.temp && 'temperature',
    !d.obs.spo2 && 'SpO₂',
    !d.category && 'triage category',
    !d.nkda && !d.allergies.length && 'allergies (or NKDA)',
  ].filter(Boolean) as string[];

  const payload = (send: boolean) => {
    const stamp = new Date().toISOString();
    const cat = categoryOf(d.category || undefined);
    const vitals = {
      bp: d.obs.sys && d.obs.dia ? `${d.obs.sys}/${d.obs.dia}` : '',
      pulse: obs.pulse,
      temp: obs.tempF,
      spo2: obs.spo2,
      respiratoryRate: obs.rr,
      avpu: obs.avpu,
      onOxygen: d.obs.onOxygen || undefined,
      news2: r?.score,
      height: d.height ? Number(d.height) : undefined,
      weight: d.weight ? Number(d.weight) : undefined,
      bmi: bmi ?? undefined,
      rbs: d.rbs ? Number(d.rbs) : undefined,
      painScale: d.pain === '' ? undefined : Number(d.pain),
      recordedAt: stamp,
      recordedBy: act.userName,
    } as unknown as SharedQueueToken['vitals'];
    const allergies = d.nkda ? ['NKDA'] : d.allergies;
    const updates: Partial<SharedQueueToken> = {
      vitals,
      allergies,
      chronicConditions: d.history,
      currentMedications: d.meds,
      assessment: {
        chiefComplaint: d.complaint.trim(),
        painScale: d.pain === '' ? undefined : Number(d.pain),
        allergies,
        medicalHistory: d.history,
        currentMedications: d.meds,
        triageCategory: d.category || undefined,
        triagedBy: act.userName,
        triagedAt: send ? stamp : t.assessment?.triagedAt,
        fallRisk: d.fallRisk || undefined,
        pregnancy: childbearing ? d.pregnancy || undefined : undefined,
        nurseNotes: d.note.trim() || undefined,
      },
      triageStartTime: t.triageStartTime || stamp,
    };
    if (cat) updates.priority = cat.priority === 'NORMAL' && t.priority === 'VIP' ? 'VIP' : cat.priority;
    if (send) Object.assign(updates, { status: 'READY_FOR_DOCTOR', callingStatus: 'IDLE', callPoint: undefined });
    else if (!isReadyForDoctor(t)) Object.assign(updates, { status: 'IN_TRIAGE', callingStatus: 'ACCEPTED', callPoint: undefined });
    return updates;
  };

  const save = (send: boolean) => {
    patientJourneyService.updateQueueToken(t.token, payload(send));
    drafts.current.delete(t.id);
    setDirty(false);
    onDirty(t.id, false);
    data.reload();
    if (send) {
      act.notify(`${tokenLabel(t.token)} · ${t.patient} sent to ${t.doctor.replace(/\s*\(.*\)$/, '')}${d.category ? ` · ${categoryOf(d.category)?.label}` : ''}`);
      onSent();
    } else act.notify(`Assessment saved for ${tokenLabel(t.token)}`);
  };

  return (
    <>
      <HmsDetailHeader
        avatar={initialsOf(t.patient)}
        title={`${tokenLabel(t.token)} · ${t.patient}`}
        badge={<HmsBadge tone={s2.tone}>{s2.label}</HmsBadge>}
        subtitle={<><span style={MONO}>{t.uhid}</span> · {t.age ? `${t.age} y` : 'age —'} · {t.gender || '—'} · {t.doctor}</>}
        actions={isToTriage(t) && t.callPoint !== TRIAGE_POINT ? <HmsButton icon={Megaphone} onClick={() => act.callToTriage(t)}>Call</HmsButton> : dirty ? <HmsBadge tone="amber">Unsaved</HmsBadge> : undefined}
      />
      <HmsStatStrip
        items={[
          { label: 'Waited', value: fmtWait(waitMinutes(t, now)), note: t.time ? `Token at ${t.time}` : undefined },
          { label: 'NEWS2', value: r ? r.score : '—', tone: r ? (r.band === 'HIGH' ? 'red' : r.band === 'LOW' ? 'green' : 'amber') : 'default', note: r ? undefined : 'Incomplete' },
          { label: 'BP', value: obs.sbp && d.obs.dia ? `${d.obs.sys}/${d.obs.dia}` : '—', note: stage?.label, tone: stage?.tone === 'red' ? 'red' : stage?.tone === 'amber' ? 'amber' : 'default' },
          { label: 'BMI', value: bmi ?? '—', note: bmi === null ? 'Height & weight' : bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese', tone: bmi !== null && (bmi < 18.5 || bmi >= 30) ? 'amber' : 'default' },
        ]}
      />
      <HmsDetailBody>
        {isEmergency(t) && <HmsNotice tone="red">Emergency token{t.triageNotes ? ` — ${t.triageNotes.replace(/^EMERGENCY:\s*/, '')}` : ''}. Record a minimum set of vitals and send to the doctor.</HmsNotice>}
        {d.carriedFrom && <HmsNotice tone="amber">Allergies, conditions and medicines carried forward from {d.carriedFrom}. Confirm them with the patient.</HmsNotice>}
        <HmsSection title="Vital signs">
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <ObsFields value={d.obs} onChange={(v) => set('obs', v)} age={t.age} idPrefix="tri" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              <HmsField label="Random blood sugar (mg/dL)" htmlFor="tri-rbs">
                <input id="tri-rbs" inputMode="numeric" style={INPUT} value={d.rbs} onChange={(e) => set('rbs', e.target.value.replace(/[^0-9.]/g, ''))} />
              </HmsField>
              <HmsField label="Height (cm)" htmlFor="tri-h">
                <input id="tri-h" inputMode="numeric" style={INPUT} value={d.height} onChange={(e) => set('height', e.target.value.replace(/[^0-9.]/g, ''))} />
              </HmsField>
              <HmsField label="Weight (kg)" htmlFor="tri-w">
                <input id="tri-w" inputMode="decimal" style={INPUT} value={d.weight} onChange={(e) => set('weight', e.target.value.replace(/[^0-9.]/g, ''))} />
              </HmsField>
            </div>
            <NewsPanel obs={obs} age={t.age} />
          </div>
        </HmsSection>

        <HmsSection title="Triage">
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <HmsField label="Triage category" required hint={suggest ? `Early warning score suggests ${categoryOf(suggest)?.label.toLowerCase()} or higher.` : 'Category decides the patient’s place in the doctor’s queue.'}>
              <Choice label="Triage category" value={d.category} options={CATEGORIES.map((c) => ({ key: c.key, label: `${c.label} · ${c.target}`, tone: c.tone }))} onChange={(v) => set('category', v)} />
            </HmsField>
            <HmsField label="Pain score (0 none – 10 worst)">
              <Choice label="Pain score" value={d.pain} options={Array.from({ length: 11 }, (_, i) => ({ key: String(i), label: String(i), tone: i >= 7 ? 'red' : i >= 4 ? 'amber' : 'green' }))} onChange={(v) => set('pain', v)} />
            </HmsField>
          </div>
        </HmsSection>

        <HmsSection title="Presenting complaint">
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div role="group" aria-label="Common complaints" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {COMPLAINTS.map((c) => {
                const on = d.complaint.toLowerCase().includes(c.toLowerCase());
                return (
                  <button key={c} type="button" role="checkbox" aria-checked={on} onClick={() => set('complaint', on ? d.complaint.replace(new RegExp(`(,\\s*)?${c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}`, 'i'), '').replace(/^,\s*/, '') : d.complaint ? `${d.complaint}, ${c}` : c)} style={{ height: '32px', padding: '0 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? HMS.primaryBorder : '#e5e7eb'}`, background: on ? HMS.primaryTint : '#ffffff', color: on ? HMS.primaryStrong : '#374151' }}>
                    {c}
                  </button>
                );
              })}
            </div>
            <textarea aria-label="Chief complaint" style={TEXTAREA} value={d.complaint} onChange={(e) => set('complaint', e.target.value)} placeholder="Complaint, since when, anything that makes it better or worse" />
          </div>
        </HmsSection>

        <HmsSection title="Safety">
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <HmsToggle checked={d.nkda} onChange={(v) => { set('nkda', v); if (v) set('allergies', []); }} label="No known drug allergies (NKDA)" showLabel />
            <TagInput id="tri-allergy" label="Allergies" values={d.allergies} onChange={(v) => set('allergies', v)} placeholder={d.nkda ? 'NKDA recorded' : 'e.g. Penicillin — rash'} disabled={d.nkda} tone="red" />
            <TagInput id="tri-history" label="Known conditions" values={d.history} onChange={(v) => set('history', v)} placeholder="e.g. Diabetes, hypertension, asthma" />
            <TagInput id="tri-meds" label="Current medicines" values={d.meds} onChange={(v) => set('meds', v)} placeholder="e.g. Metformin 500 mg twice daily" />
            <HmsField label="Fall risk" hint="High: age over 65, unsteady, giddy, sedated or on BP medicines.">
              <Choice label="Fall risk" value={d.fallRisk} options={[{ key: 'LOW', label: 'Low', tone: 'green' }, { key: 'HIGH', label: 'High — assist and use a wheelchair', tone: 'red' }]} onChange={(v) => set('fallRisk', v)} />
            </HmsField>
            {childbearing && (
              <HmsField label="Pregnancy" hint="Asked before medicines and X-rays are ordered.">
                <Choice label="Pregnancy" value={d.pregnancy} options={[{ key: 'NOT_PREGNANT', label: 'Not pregnant' }, { key: 'PREGNANT', label: 'Pregnant', tone: 'amber' }, { key: 'UNKNOWN', label: 'Not sure' }]} onChange={(v) => set('pregnancy', v)} />
              </HmsField>
            )}
          </div>
        </HmsSection>

        <HmsField label="Note for the doctor" htmlFor="tri-note">
          <textarea id="tri-note" style={TEXTAREA} value={d.note} onChange={(e) => set('note', e.target.value)} />
        </HmsField>
        {r && r.band === 'HIGH' && (
          <HmsNotice tone="red" action={<HmsButton size="sm" variant="danger" onClick={() => act.codeBlue({ patientName: t.patient, uhid: t.uhid, age: t.age, gender: t.gender, token: t.token, location: TRIAGE_POINT, condition: `NEWS2 ${r.score}` })}>Code Blue</HmsButton>}>
            NEWS2 {r.score}: tell the doctor now. Send as Immediate.
          </HmsNotice>
        )}
      </HmsDetailBody>
      <HmsDetailFooter>
        {missing.length > 0 && <div style={{ fontSize: '12px', color: HMS.textSecondary, width: '100%' }}>To send to the doctor, record {missing.join(', ')}.</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
          <HmsButton icon={Save} block onClick={() => save(false)}>
            {isReadyForDoctor(t) ? 'Save changes' : 'Save draft'}
          </HmsButton>
          <HmsButton variant="primary" icon={Send} block disabled={missing.length > 0} onClick={() => save(true)}>
            {isReadyForDoctor(t) ? 'Update for doctor' : 'Send to doctor'}
          </HmsButton>
        </div>
      </HmsDetailFooter>
    </>
  );
};

export const NurseVitalsView: React.FC<NurseVitalsViewProps> = ({ data, act, initialFilter, initialSelect }) => {
  const [search, setSearch] = useState('');
  const pre = initialSelect ? data.queue.find((t) => String(t.token) === initialSelect) : undefined;
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : pre && isReadyForDoctor(pre) ? 'ready' : pre && isToTriage(pre) ? 'totriage' : 'intriage');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `t:${initialSelect}` : null);
  const drafts = useRef(new Map<string, Draft>());
  const [unsaved, setUnsaved] = useState<string[]>([]);
  const onDirty = (id: string, dirty: boolean) => setUnsaved((prev) => (dirty ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
  const now = data.lastSync.getTime();

  const pool = data.queue.filter((t) => isInTriage(t) || isToTriage(t) || isReadyForDoctor(t));
  const match: Record<string, (t: SharedQueueToken) => boolean> = { intriage: isInTriage, totriage: isToTriage, ready: isReadyForDoctor, all: () => true };
  const q = search.trim().toLowerCase();
  const list = pool.filter((t) => match[pill](t) && (!q || [t.patient, t.uhid, String(t.token), t.doctor].some((v) => (v || '').toLowerCase().includes(q)))).sort(byTriageOrder);
  const rows: HmsListRow[] = list.map((t) => {
    const st = nurseStatusOf(t);
    const cat = categoryOf(t.assessment?.triageCategory);
    return {
      key: `t:${t.token}`,
      title: `${tokenLabel(t.token)} · ${t.patient}`,
      badge: unsaved.includes(t.id) ? <HmsBadge tone="amber">Unsaved</HmsBadge> : <HmsBadge tone={isEmergency(t) ? 'red' : st.tone}>{isEmergency(t) ? 'Emergency' : st.label}</HmsBadge>,
      sub: <><span style={MONO}>{t.uhid}</span> · {t.age ? `${t.age} y` : '—'} · {t.doctor.replace(/\s*\(.*\)$/, '')}</>,
      metaLeft: cat ? cat.label : `Waiting ${fmtWait(waitMinutes(t, now))}`,
      metaRight: t.vitals?.bp ? `BP ${t.vitals.bp}${t.vitals.news2 !== undefined ? ` · NEWS2 ${t.vitals.news2}` : ''}` : 'No vitals',
    };
  });

  return (
    <HmsMasterDetail
      listId="nurse-vitals"
      title="Vitals & assessment"
      description="Record vitals and the triage assessment, then send the patient to the doctor."
      total={pool.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search name, UHID, token or doctor"
      pills={[
        { key: 'intriage', label: 'In triage', count: pool.filter(isInTriage).length },
        { key: 'totriage', label: 'Waiting', count: pool.filter(isToTriage).length },
        { key: 'ready', label: 'Sent to doctor', count: pool.filter(isReadyForDoctor).length },
        { key: 'all', label: 'All', count: pool.length },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open assessment"
      detailLabel="Assessment"
      emptyText={pill === 'intriage' ? 'Nobody is in triage. Start triage from the waiting list.' : 'Nobody matches this search or filter.'}
      renderDetail={(key) => {
        const t = data.queue.find((x) => `t:${x.token}` === key);
        if (!t) return <HmsEmpty>{pool.length ? 'Select a patient from the list.' : 'No patients waiting for triage.'}</HmsEmpty>;
        return <TriageForm key={t.id} t={t} data={data} act={act} drafts={drafts} onDirty={onDirty} onSent={() => setSelected(null)} />;
      }}
    />
  );
};

