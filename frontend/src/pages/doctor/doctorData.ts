// OPD Doctor data. The chamber data (today's tokens, appointments, follow-ups, lab orders with turnaround, outside
// documents, prescriptions, doctor status) comes from the chamber-desk hook, scoped to the signed-in doctor (matched
// by name to the OPD doctor list; admins choose a doctor). Adds what only the doctor works with: emergency calls,
// admitted / day-care patients under this doctor, ward-round notes, unavailable blocks and the nursing chart.
import { opdApiMode } from '../../services/opdService';
import { useCallback, useEffect, useState } from 'react';
import {
  patientJourneyService,
  DoctorBlock,
  FlatCampusBed,
  NurseChartEntry,
  RoundNote,
  SharedEmergencyAlert,
  SharedPrescription,
  SharedQueueToken,
} from '../../services/patientJourneyService';
import { useAssistantData, AssistantData } from '../assistant/assistantData';
import { sameDoctor, bedState } from '../reception/receptionData';

export interface DoctorData extends AssistantData {
  alerts: SharedEmergencyAlert[];
  /** Occupied beds (IPD wards and day-care) where this doctor is the primary doctor */
  beds: FlatCampusBed[];
  roundNotes: RoundNote[];
  blocks: DoctorBlock[];
  chart: NurseChartEntry[];
}

const readExtra = () => ({
  alerts: patientJourneyService.getEmergencyAlerts(),
  allBeds: patientJourneyService.getFlatBedsList(),
  roundNotes: patientJourneyService.getRoundNotes(),
  blocks: patientJourneyService.getDoctorBlocks(),
  chart: patientJourneyService.getNurseChart(),
});

export const useDoctorData = (userId: string, preferName: string): DoctorData => {
  const base = useAssistantData(userId, { storagePrefix: 'nh_doctor_self', preferName });
  const [extra, setExtra] = useState(readExtra);
  const { reload: baseReload } = base;
  const reload = useCallback(() => {
    baseReload();
    setExtra(readExtra());
  }, [baseReload]);

  useEffect(() => {
    const onSync = () => setExtra(readExtra());
    const events = ['nh_data_sync', 'nh_campus_updated', 'storage', 'focus'];
    events.forEach((e) => window.addEventListener(e, onSync));
    const tick = window.setInterval(onSync, 15000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onSync));
      window.clearInterval(tick);
    };
  }, []);

  const name = base.doctor?.name || '';
  return {
    ...base,
    reload,
    alerts: extra.alerts,
    beds: name ? extra.allBeds.filter((b) => bedState(b) === 'occupied' && !!b.bed.inpatientDetails && sameDoctor(b.bed.inpatientDetails.primaryDoctor?.name, name)) : [],
    roundNotes: extra.roundNotes,
    blocks: name ? extra.blocks.filter((b) => sameDoctor(b.doctor, name)) : [],
    chart: extra.chart,
  };
};

/* ---------------- consultation draft ---------------- */

export interface RxLine {
  key: string;
  medicineName: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  timing: string;
  durationDays: string;
  instructions: string;
  inStock?: boolean | null;
}

export interface ConsultDraft {
  complaint: string;
  history: string;
  examination: string;
  diagnosis: string;
  diagnosisCode: string;
  rx: RxLine[];
  labTests: string[];
  radiology: string[];
  orderPriority: 'ROUTINE' | 'URGENT' | 'STAT';
  advice: string;
  followUpDate: string;
  followUpReason: string;
  referTo: string;
  referReason: string;
}

export const emptyDraft = (t: SharedQueueToken): ConsultDraft => ({
  complaint: t.assessment?.chiefComplaint || '',
  history: '',
  examination: '',
  diagnosis: '',
  diagnosisCode: '',
  rx: [],
  labTests: [],
  radiology: [],
  orderPriority: 'ROUTINE',
  advice: '',
  followUpDate: '',
  followUpReason: '',
  referTo: '',
  referReason: '',
});

export const newRxLine = (name = '', generic?: string, inStock?: boolean | null): RxLine => ({ key: `rx-${Math.random().toString(36).slice(2, 9)}`, medicineName: name, genericName: generic, dosage: '', frequency: '1-0-1', timing: 'After food', durationDays: '5', instructions: '', inStock });

/** Repeat a previous prescription's lines (the doctor edits before saving). */
export const linesFrom = (rx: SharedPrescription): RxLine[] =>
  rx.items.map((i) => ({ ...newRxLine(i.medicineName), dosage: i.dosage || '', frequency: i.frequency || '', timing: i.timing || '', durationDays: String(i.durationDays || ''), instructions: i.instructions || '' }));

export const FREQUENCIES = ['1-0-0', '0-0-1', '1-0-1', '1-1-1', '1-1-1-1', 'SOS', 'Stat', 'Once a week'];
export const TIMINGS = ['Before food', 'After food', 'With food', 'Bedtime', 'Empty stomach', '—'];
/** Common imaging requests (sent as radiology orders). */
export const RADIOLOGY = ['X-ray chest PA', 'X-ray knee AP/lateral', 'X-ray lumbar spine', 'USG abdomen & pelvis', '12-lead ECG', '2D Echocardiography', 'CT brain (plain)', 'MRI lumbar spine'];
export const DEPARTMENTS = ['General Medicine', 'Cardiology', 'Pulmonology', 'Gastroenterology', 'Orthopaedics', 'Neurology', 'ENT', 'Ophthalmology', 'Dermatology', 'Obstetrics & Gynaecology', 'Paediatrics', 'General Surgery', 'Psychiatry', 'Physiotherapy', 'Emergency / Casualty', 'IPD admission'];

/** Common OPD diagnoses with ICD-10 codes, for quick entry (the doctor can type any diagnosis). */
export const ICD10: [string, string][] = [
  ['J06.9', 'Acute upper respiratory infection'],
  ['J02.9', 'Acute pharyngitis'],
  ['J20.9', 'Acute bronchitis'],
  ['J45.9', 'Asthma'],
  ['J18.9', 'Pneumonia, unspecified'],
  ['A09', 'Infectious gastroenteritis'],
  ['K29.7', 'Gastritis'],
  ['K21.9', 'Gastro-oesophageal reflux disease'],
  ['A90', 'Dengue fever'],
  ['A01.0', 'Typhoid fever'],
  ['B54', 'Malaria, unspecified'],
  ['R50.9', 'Fever, unspecified'],
  ['I10', 'Essential (primary) hypertension'],
  ['E11.9', 'Type 2 diabetes mellitus'],
  ['E78.5', 'Hyperlipidaemia'],
  ['I20.9', 'Angina pectoris'],
  ['I25.10', 'Coronary artery disease'],
  ['E03.9', 'Hypothyroidism'],
  ['D64.9', 'Anaemia, unspecified'],
  ['N39.0', 'Urinary tract infection'],
  ['M54.5', 'Low back pain'],
  ['M17.9', 'Osteoarthritis of knee'],
  ['G43.9', 'Migraine'],
  ['R51', 'Headache'],
  ['L30.9', 'Dermatitis'],
  ['F41.1', 'Generalised anxiety disorder'],
  ['Z09', 'Follow-up examination'],
];

export const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Simple local allergy check: an allergy word appearing in the medicine name / generic. */
export const localAllergyHit = (allergies: string[], line: RxLine) => {
  const hay = `${line.medicineName} ${line.genericName || ''}`.toLowerCase();
  return allergies.filter((a) => a && a !== 'NKDA').find((a) => {
    const w = a.toLowerCase().split(/[\s,—-]+/)[0];
    return w.length >= 4 && hay.includes(w);
  });
};

/* ---------------- emergency calls ---------------- */

/** Calls raised in this system (nurse station); the seeded demo alerts are not shown as live. */
// Signed in, every alert comes from the server and is live
export const liveAlerts = (alerts: SharedEmergencyAlert[]) => (opdApiMode() ? alerts : alerts.filter((a) => /^eal-\d{13}$/.test(a.id)));

/* ---------------- actions the views share ---------------- */

export interface DoctorActions {
  notify: (msg: string, tone?: 'success' | 'error') => void;
  goTo: (tab: string, filter?: string, select?: string) => void;
  userName: string;
  callIn: (t: SharedQueueToken) => void;
  startConsult: (t: SharedQueueToken) => void;
}
