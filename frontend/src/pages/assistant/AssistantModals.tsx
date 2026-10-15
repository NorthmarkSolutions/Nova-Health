// Chamber desk dialogs: attach an outside report (with an optional scan), record basic vitals when the nurse has not,
// and set the doctor's status (in clinic, break, rounds, running late…).
import React, { useState } from 'react';
import { FileUp, Activity, UserCheck } from 'lucide-react';
import { HmsModal, HmsButton, HmsField, HmsNotice, INPUT, HMS } from '../../components/hms';
import { patientJourneyService, DoctorSession, PatientDocument, SharedQueueToken } from '../../services/patientJourneyService';
import { opdActions } from '../../services/opdActions';
import { PatientPicker } from '../reception/ReceptionModals';
import { patientName, todayIso, tokenLabel } from '../reception/receptionData';
import { Choice, ObsFields, NewsPanel } from '../nurse/NurseModals';
import { EMPTY_OBS, ObsForm, news2, obsOf } from '../nurse/nurseData';
import { AssistantData, SESSION } from './assistantData';

const MAX_FILE = 1024 * 1024;
const CATS: { key: PatientDocument['category']; label: string }[] = [
  { key: 'LAB', label: 'Lab report' },
  { key: 'RADIOLOGY', label: 'X-ray / scan' },
  { key: 'PRESCRIPTION', label: 'Old prescription' },
  { key: 'DISCHARGE', label: 'Discharge summary' },
  { key: 'REFERRAL', label: 'Referral letter' },
  { key: 'OTHER', label: 'Other' },
];

export const AttachDocumentModal: React.FC<{ data: AssistantData; presetUhid?: string; userName: string; onClose: () => void; onDone: (d: PatientDocument) => void }> = ({ data, presetUhid, userName, onClose, onDone }) => {
  const [uhid, setUhid] = useState(presetUhid || '');
  const [category, setCategory] = useState<PatientDocument['category']>('LAB');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [reportDate, setReportDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [file, setFile] = useState<{ name: string; type: string; dataUrl: string } | null>(null);
  const [error, setError] = useState('');
  const p = data.patients.find((x) => x.uhid === uhid);
  const tok = data.mine.find((t) => t.uhid === uhid);
  const name = p ? patientName(p) : tok?.patient || '';
  const ok = !!uhid && !!name && title.trim().length >= 3 && source.trim().length >= 2 && !!reportDate && reportDate <= todayIso();
  return (
    <HmsModal
      title="Attach an outside report"
      description="Reports the patient brought from another lab, hospital or doctor. They stay on the patient's file for the doctor."
      width={640}
      onClose={onClose}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton
            variant="primary"
            icon={FileUp}
            disabled={!ok}
            onClick={() => {
              try {
                const d = patientJourneyService.addPatientDocument({
                  id: `doc-${new Date().getTime()}`,
                  uhid,
                  patientName: name,
                  title: title.trim(),
                  category,
                  source: source.trim(),
                  reportDate,
                  note: note.trim() || undefined,
                  fileName: file?.name,
                  fileType: file?.type,
                  dataUrl: file?.dataUrl,
                  doctor: data.doctor?.name,
                  uploadedBy: userName,
                  uploadedAt: new Date().toISOString(),
                });
                onDone(d);
              } catch {
                setError('The browser store is full. Attach without the scan, or use a smaller file.');
              }
            }}
          >
            Attach to file
          </HmsButton>
        </>
      }
    >
      {error && <HmsNotice tone="red">{error}</HmsNotice>}
      <HmsField label="Patient" htmlFor="doc-patient" required>
        {data.mine.length > 0 && !presetUhid && (
          <select aria-label="Today's patients" style={{ ...INPUT, marginBottom: '8px' }} value={tok ? uhid : ''} onChange={(e) => e.target.value && setUhid(e.target.value)}>
            <option value="">Today's patients with {data.doctor?.name || 'the doctor'}…</option>
            {data.mine.map((t) => (
              <option key={t.id} value={t.uhid}>
                {tokenLabel(t.token)} · {t.patient}
              </option>
            ))}
          </select>
        )}
        <PatientPicker id="doc-patient" patients={data.patients} value={uhid} onChange={setUhid} />
        {!p && tok && <span style={{ fontSize: '12px', color: HMS.textSecondary }}>{tok.patient} · {tok.uhid}</span>}
      </HmsField>
      <HmsField label="Type">
        <Choice label="Document type" value={category} options={CATS.map((c) => ({ key: c.key, label: c.label }))} onChange={setCategory} />
      </HmsField>
      <HmsField label="Title" htmlFor="doc-title" required>
        <input id="doc-title" style={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HbA1c and lipid profile" />
      </HmsField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '12px' }}>
        <HmsField label="From (lab / hospital / doctor)" htmlFor="doc-source" required>
          <input id="doc-source" style={INPUT} value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. City Diagnostics" />
        </HmsField>
        <HmsField label="Report date" htmlFor="doc-date" required>
          <input id="doc-date" type="date" max={todayIso()} style={INPUT} value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
        </HmsField>
      </div>
      <HmsField label="Scan or photo (optional, up to 1 MB)" htmlFor="doc-file" hint={file ? `${file.name} attached` : 'JPG, PNG or PDF'}>
        <input
          id="doc-file"
          type="file"
          accept="image/*,application/pdf"
          style={{ fontSize: '14px' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            setError('');
            if (!f) return setFile(null);
            if (f.size > MAX_FILE) {
              setFile(null);
              setError(`${f.name} is ${(f.size / 1024 / 1024).toFixed(1)} MB. Use a file under 1 MB.`);
              return;
            }
            const r = new FileReader();
            r.onload = () => setFile({ name: f.name, type: f.type, dataUrl: String(r.result) });
            r.readAsDataURL(f);
          }}
        />
      </HmsField>
      <HmsField label="Note for the doctor" htmlFor="doc-note">
        <input id="doc-note" style={INPUT} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Patient says this was done last week" />
      </HmsField>
    </HmsModal>
  );
};

export const BasicVitalsModal: React.FC<{ token: SharedQueueToken; userName: string; onClose: () => void; onDone: () => void }> = ({ token, userName, onClose, onDone }) => {
  const [f, setF] = useState<ObsForm>(EMPTY_OBS);
  const [weight, setWeight] = useState('');
  const ok = !!(f.sys && f.dia && f.pulse && f.spo2);
  return (
    <HmsModal
      title={`Basic vitals · ${tokenLabel(token.token)} ${token.patient}`}
      description="When the nurse could not triage this patient. Recorded under your name for the doctor."
      width={720}
      onClose={onClose}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton
            variant="primary"
            icon={Activity}
            disabled={!ok}
            title={ok ? undefined : 'BP, pulse and SpO₂ are required'}
            onClick={() => {
              const o = obsOf(f);
              const r = news2(o, token.age);
              void opdActions.saveTriage(token, {
                vitals: { ...(token.vitals || {}), bp: `${f.sys}/${f.dia}`, pulse: o.pulse, temp: o.tempF, spo2: o.spo2, respiratoryRate: o.rr, avpu: o.avpu, onOxygen: f.onOxygen || undefined, news2: r?.score, weight: weight ? Number(weight) : token.vitals?.weight, recordedAt: new Date().toISOString(), recordedBy: `${userName} (chamber desk)` } as SharedQueueToken['vitals'],
              }, false);
              onDone();
            }}
          >
            Save vitals
          </HmsButton>
        </>
      }
    >
      <ObsFields value={f} onChange={setF} age={token.age} idPrefix="bv" />
      <HmsField label="Weight (kg)" htmlFor="bv-weight">
        <input id="bv-weight" inputMode="decimal" style={{ ...INPUT, maxWidth: '200px' }} value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^0-9.]/g, ''))} />
      </HmsField>
      <NewsPanel obs={obsOf(f)} age={token.age} />
    </HmsModal>
  );
};

export const SessionModal: React.FC<{ doctor: string; current: DoctorSession | null; userName: string; onClose: () => void; onDone: (s: DoctorSession) => void }> = ({ doctor, current, userName, onClose, onDone }) => {
  const [status, setStatus] = useState<DoctorSession['status']>(current?.status || 'IN');
  const [until, setUntil] = useState(current?.until || '');
  const [note, setNote] = useState(current?.note || '');
  const needsTime = status === 'BREAK' || status === 'ROUNDS' || status === 'OT' || status === 'LATE';
  return (
    <HmsModal
      title={`${doctor} — status`}
      description="Shown to the front desk so they can tell waiting patients."
      onClose={onClose}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton
            variant="primary"
            icon={UserCheck}
            disabled={needsTime && !until}
            onClick={() => onDone(patientJourneyService.setDoctorSession({ doctor, status, until: needsTime ? until : undefined, note: note.trim() || undefined, since: new Date().toISOString(), by: userName }))}
          >
            Update status
          </HmsButton>
        </>
      }
    >
      <HmsField label="Status">
        <Choice label="Doctor status" value={status} options={(Object.keys(SESSION) as DoctorSession['status'][]).map((k) => ({ key: k, label: SESSION[k].label, tone: SESSION[k].tone === 'blue' ? undefined : SESSION[k].tone }))} onChange={setStatus} />
      </HmsField>
      {needsTime && (
        <HmsField label={status === 'LATE' ? 'Expected to start at' : 'Expected back at'} htmlFor="ss-until" required>
          <input id="ss-until" type="time" style={{ ...INPUT, maxWidth: '200px' }} value={until} onChange={(e) => setUntil(e.target.value)} />
        </HmsField>
      )}
      <HmsField label="Note for the front desk" htmlFor="ss-note">
        <input id="ss-note" style={INPUT} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Emergency in ICU" />
      </HmsField>
    </HmsModal>
  );
};
