// Front Desk & Reception — dialogs: register / edit a patient (with duplicate check), issue a walk-in token,
// book or reschedule an appointment on the slot grid, collect the desk fee, reassign a doctor, open / close the
// counter shift with a cash count, allocate or transfer a day-care bed, and a reason prompt.
import React, { useMemo, useState } from 'react';
import { UserPlus, Ticket, CalendarPlus, Banknote, Shuffle, Lock, LockOpen, BedDouble, ArrowRightLeft, Search, Save } from 'lucide-react';
import { HmsButton, HmsField, HmsModal, HmsNotice, HmsRow, HmsSection, HmsToggle, INPUT, TEXTAREA, HMS } from '../../components/hms';
import { patientJourneyService, DailyCounterSession, FlatCampusBed, SharedAppointment, SharedPatient, SharedQueueToken } from '../../services/patientJourneyService';
import { useCurrency } from '../../config/currency';
import { getDepartmentDoctors, getDepartmentWorkspaceById } from '../department/departmentWorkspaceStore';
import {
  DeskDoctor, ReceptionData, MONO, SLOTS, fmtDate, isCancelled, isDone, isWaiting, isWithDoctor, nextTokenNo, nextUhid, nowTime, patientName, sameDoctor, slotMinutes, todayIso, tokenLabel,
  localStamp,
  blockFor,
  issuedAt,
  OPD_DEPT,
} from './receptionData';
import { VisitKind, feeFor, recordDeskPayment } from './deskFees';

type Notify = (message: string, tone?: 'success' | 'error') => void;

const isFirstVisit = (p: SharedPatient | undefined, data: ReceptionData) => !!p && !p.visitsCount && !data.queue.some((t) => t.uhid === p.uhid);

/* ---------------- patient picker ---------------- */

export const PatientPicker: React.FC<{ patients: SharedPatient[]; value: string; onChange: (uhid: string) => void; onRegister?: () => void; id: string }> = ({ patients, value, onChange, onRegister, id }) => {
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const digits = term.replace(/\D/g, '');
  const hits = term
    ? patients.filter((p) => patientName(p).toLowerCase().includes(term) || p.uhid.toLowerCase().includes(term) || (digits.length >= 4 && p.phone.replace(/\D/g, '').includes(digits))).slice(0, 6)
    : [];
  const chosen = patients.find((p) => p.uhid === value);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ position: 'relative' }}>
        <Search size={18} color={HMS.primary} style={{ position: 'absolute', left: '12px', top: '11px', pointerEvents: 'none' }} />
        <input id={id} autoFocus style={{ ...INPUT, paddingLeft: '40px' }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, UHID or mobile number" aria-label="Find patient" />
      </div>
      {hits.length > 0 && (
        <div role="listbox" aria-label="Matching patients" style={{ border: `1px solid ${HMS.border}`, borderRadius: '10px', overflow: 'hidden' }}>
          {hits.map((p) => (
            <button
              key={p.uhid}
              type="button"
              role="option"
              aria-selected={p.uhid === value}
              onClick={() => {
                onChange(p.uhid);
                setQ('');
              }}
              style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '10px 12px', border: 'none', borderBottom: `1px solid ${HMS.divider}`, background: p.uhid === value ? HMS.primaryTint : '#ffffff', cursor: 'pointer', fontSize: '14px' }}
            >
              <span>
                {patientName(p)} <span style={{ ...MONO, color: HMS.textSecondary }}>· {p.uhid}</span>
              </span>
              <span style={{ fontSize: '12px', color: HMS.textSecondary }}>
                {p.age ? `${p.age}y` : ''} {p.gender ? String(p.gender).charAt(0) : ''} · {p.phone}
              </span>
            </button>
          ))}
        </div>
      )}
      {term && !hits.length && (
        <HmsNotice tone="blue" action={onRegister && <HmsButton size="sm" icon={UserPlus} onClick={onRegister}>Register</HmsButton>}>
          No patient matches “{q}”.
        </HmsNotice>
      )}
      {chosen && (
        <div style={{ padding: '10px 12px', border: `1px solid ${HMS.primaryBorder}`, background: HMS.primaryTint, borderRadius: '10px', fontSize: '13px', color: HMS.text }}>
          <strong>{patientName(chosen)}</strong> · <span style={MONO}>{chosen.uhid}</span> · {chosen.age ? `${chosen.age} y` : 'age —'} · {chosen.phone || 'no phone'}
          {(chosen.allergies || []).length > 0 && <span style={{ color: '#dc2626' }}> · Allergies: {(chosen.allergies || []).join(', ')}</span>}
        </div>
      )}
    </div>
  );
};

/* ---------------- register / edit patient ---------------- */

const BLOOD = ['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ID_TYPES = ['Aadhaar', 'ABHA ID', 'PAN', 'Passport', 'Driving licence', 'Voter ID', 'Other'];
const PAYERS = ['Self pay', 'Insurance / TPA', 'Corporate', 'Government scheme'];
const ageFrom = (dob: string) => {
  const d = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  const n = new Date();
  return Math.max(0, n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0));
};

export const RegisterPatientModal: React.FC<{
  data: ReceptionData;
  editing?: SharedPatient | null;
  initialQuery?: string;
  onClose: () => void;
  onSaved: (p: SharedPatient, next: 'token' | 'book' | null) => void;
  onUseExisting?: (p: SharedPatient) => void;
  notify: Notify;
}> = ({ data, editing, initialQuery, onClose, onSaved, onUseExisting, notify }) => {
  const e = editing;
  const [f, setF] = useState(() => ({
    firstName: e?.firstName || (initialQuery && !/\d/.test(initialQuery) ? initialQuery.split(' ')[0] : ''),
    lastName: e?.lastName || (initialQuery && !/\d/.test(initialQuery) ? initialQuery.split(' ').slice(1).join(' ') : ''),
    dob: e?.dob || '',
    age: e?.age ? String(e.age) : '',
    gender: e ? String(e.gender).toUpperCase() : '',
    blood: e?.bloodGroup || 'Unknown',
    phone: e?.phone || (initialQuery && /\d{6,}/.test(initialQuery) ? initialQuery : ''),
    idType: e?.idType || 'Aadhaar',
    idNumber: e?.idNumber || '',
    emergency: e?.emergencyContact || '',
    payer: e?.insurance?.split(' ')[0] === 'Self' || !e?.insurance ? 'Self pay' : PAYERS.find((x) => e.insurance.startsWith(x)) || 'Insurance / TPA',
    policy: e?.insurance && !e.insurance.startsWith('Self') ? e.insurance.split('·').slice(1).join('·').trim() : '',
    allergies: (e?.allergies || []).join(', '),
    chronic: (e?.chronicConditions || []).join(', '),
  }));
  const set = (k: keyof typeof f) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: ev.target.value });
  const age = f.dob ? ageFrom(f.dob) : Number(f.age) || 0;
  const digits = f.phone.replace(/\D/g, '');

  const dupes = useMemo(() => {
    if (e) return [];
    const name = `${f.firstName} ${f.lastName}`.trim().toLowerCase();
    return data.patients
      .filter((p) => (digits.length >= 8 && p.phone.replace(/\D/g, '').endsWith(digits.slice(-8))) || (name.length > 3 && patientName(p).toLowerCase() === name && (!age || !p.age || Math.abs(p.age - age) <= 1)))
      .slice(0, 3);
  }, [data.patients, digits, f.firstName, f.lastName, age, e]);

  const invalid = !f.firstName.trim() ? 'First name is required' : !f.gender ? 'Choose a gender' : !f.dob && !f.age ? 'Enter a date of birth or age' : digits.length < 10 ? 'Enter a 10-digit mobile number' : '';

  const save = (next: 'token' | 'book' | null) => {
    if (invalid) return notify(invalid, 'error');
    const payer = f.payer === 'Self pay' ? 'Self pay' : `${f.payer}${f.policy.trim() ? ` · ${f.policy.trim()}` : ''}`;
    const p: SharedPatient = {
      ...(e || { visitsCount: 0, outstandingDue: 0, recentVisits: [] }),
      uhid: e?.uhid || nextUhid(data.patients),
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      phone: f.phone.trim(),
      dob: f.dob,
      age,
      gender: f.gender,
      bloodGroup: f.blood === 'Unknown' ? '' : f.blood,
      idType: f.idType,
      idNumber: f.idNumber.trim(),
      emergencyContact: f.emergency.trim(),
      insurance: payer,
      allergies: f.allergies.split(',').map((x) => x.trim()).filter(Boolean),
      chronicConditions: f.chronic.split(',').map((x) => x.trim()).filter(Boolean),
    } as SharedPatient;
    patientJourneyService.registerPatient(p);
    onSaved(p, next);
  };

  return (
    <HmsModal
      title={e ? `Edit ${patientName(e)}` : 'Register a new patient'}
      description={e ? `${e.uhid} · changes update the patient master for every desk.` : 'Creates the UHID used by every desk. Only name, gender, age and mobile are required.'}
      onClose={onClose}
      width={760}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          {e ? (
            <HmsButton variant="primary" icon={Save} onClick={() => save(null)}>
              Save changes
            </HmsButton>
          ) : (
            <>
              <HmsButton onClick={() => save('book')}>Register & book</HmsButton>
              <HmsButton variant="primary" icon={Ticket} onClick={() => save('token')}>
                Register & issue token
              </HmsButton>
            </>
          )}
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {dupes.length > 0 && (
          <HmsNotice tone="amber">
            Possible duplicate: {dupes.map((d) => `${patientName(d)} (${d.uhid}, ${d.phone})`).join('; ')}. Use the existing record instead of creating a second UHID.
          </HmsNotice>
        )}
        {dupes.length > 0 && onUseExisting && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {dupes.map((d) => (
              <HmsButton key={d.uhid} size="sm" onClick={() => onUseExisting(d)}>
                Use {patientName(d)} · {d.uhid}
              </HmsButton>
            ))}
          </div>
        )}
        <HmsSection title="Patient" padded>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
            <HmsField label="First name" htmlFor="rp-first" required>
              <input id="rp-first" autoFocus style={INPUT} value={f.firstName} onChange={set('firstName')} />
            </HmsField>
            <HmsField label="Last name" htmlFor="rp-last">
              <input id="rp-last" style={INPUT} value={f.lastName} onChange={set('lastName')} />
            </HmsField>
            <HmsField label="Gender" htmlFor="rp-gender" required>
              <select id="rp-gender" style={INPUT} value={f.gender} onChange={set('gender')}>
                <option value="">Choose…</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </HmsField>
            <HmsField label="Date of birth" htmlFor="rp-dob" hint={f.dob ? `Age ${age}` : 'Or enter the age'}>
              <input id="rp-dob" type="date" max={todayIso()} style={INPUT} value={f.dob} onChange={set('dob')} />
            </HmsField>
            <HmsField label="Age (years)" htmlFor="rp-age">
              <input id="rp-age" style={INPUT} inputMode="numeric" value={f.dob ? String(age) : f.age} disabled={!!f.dob} onChange={set('age')} />
            </HmsField>
            <HmsField label="Blood group" htmlFor="rp-blood">
              <select id="rp-blood" style={INPUT} value={f.blood} onChange={set('blood')}>
                {BLOOD.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </HmsField>
          </div>
        </HmsSection>
        <HmsSection title="Contact & identity" padded>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
            <HmsField label="Mobile" htmlFor="rp-phone" required>
              <input id="rp-phone" style={INPUT} inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="10-digit mobile" />
            </HmsField>
            <HmsField label="ID type" htmlFor="rp-idt">
              <select id="rp-idt" style={INPUT} value={f.idType} onChange={set('idType')}>
                {ID_TYPES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </HmsField>
            <HmsField label="ID number" htmlFor="rp-idn">
              <input id="rp-idn" style={INPUT} value={f.idNumber} onChange={set('idNumber')} />
            </HmsField>
            <div style={{ gridColumn: 'span 3' }}>
              <HmsField label="Emergency contact" htmlFor="rp-emg" hint="Name, relation and phone">
                <input id="rp-emg" style={INPUT} value={f.emergency} onChange={set('emergency')} />
              </HmsField>
            </div>
          </div>
        </HmsSection>
        <HmsSection title="Payer & medical alerts" padded>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
            <HmsField label="Payer" htmlFor="rp-payer">
              <select id="rp-payer" style={INPUT} value={f.payer} onChange={set('payer')}>
                {PAYERS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </HmsField>
            <HmsField label="Policy / member / scheme no." htmlFor="rp-pol">
              <input id="rp-pol" style={INPUT} value={f.policy} disabled={f.payer === 'Self pay'} onChange={set('policy')} />
            </HmsField>
            <HmsField label="Allergies" htmlFor="rp-all" hint="Comma separated — shown on every desk">
              <input id="rp-all" style={INPUT} value={f.allergies} onChange={set('allergies')} />
            </HmsField>
            <HmsField label="Long-term conditions" htmlFor="rp-chr" hint="Comma separated">
              <input id="rp-chr" style={INPUT} value={f.chronic} onChange={set('chronic')} />
            </HmsField>
          </div>
        </HmsSection>
        {invalid && <span style={{ fontSize: '12px', color: '#b45309' }}>{invalid}</span>}
      </div>
    </HmsModal>
  );
};

/* ---------------- walk-in token ---------------- */

export const WalkInModal: React.FC<{
  data: ReceptionData;
  presetUhid?: string;
  presetDoctor?: string;
  onClose: () => void;
  onRegister: () => void;
  onIssued: (t: SharedQueueToken) => void;
  notify: Notify;
}> = ({ data, presetUhid, presetDoctor, onClose, onRegister, onIssued, notify }) => {
  const { format } = useCurrency();
  const [uhid, setUhid] = useState(presetUhid || '');
  const [doctorId, setDoctorId] = useState(() => data.doctors.find((d) => sameDoctor(d.name, presetDoctor))?.id || data.doctors[0]?.id || '');
  const [kind, setKind] = useState<VisitKind>('WALK_IN');
  const [urgent, setUrgent] = useState(false);
  const [complaint, setComplaint] = useState('');
  const [payNow, setPayNow] = useState(true);
  const [mode, setMode] = useState('CASH');
  const p = data.patients.find((x) => x.uhid === uhid);
  const doc = data.doctors.find((d) => d.id === doctorId);
  const fee = feeFor(doc, kind, data, isFirstVisit(p, data));
  const active = p ? data.queue.find((t) => t.uhid === p.uhid && !isDone(t) && !isCancelled(t)) : undefined;
  const shiftClosed = data.session.status !== 'OPEN';
  // Department policies and doctor limits set by the OPD admin
  const cfg = getDepartmentWorkspaceById(OPD_DEPT).config;
  const walkInOff = cfg.isWalkInAllowed === false && kind !== 'EMERGENCY';
  const isToday = (t: SharedQueueToken) => {
    const d = issuedAt(t);
    return !d || d.toDateString() === new Date().toDateString();
  };
  const todayTokens = data.queue.filter((t) => isToday(t) && !isCancelled(t));
  const overDept = !!cfg.dailyCapacity && todayTokens.length >= cfg.dailyCapacity;
  const docCap = doc ? getDepartmentDoctors(OPD_DEPT).find((r) => r.id === doc.id || sameDoctor(r.fullName, doc.name))?.patientCapacityPerDay || 0 : 0;
  const docCount = doc ? todayTokens.filter((t) => sameDoctor(t.doctor, doc.name)).length : 0;
  const docAway = doc ? patientJourneyService.getDoctorBlocks().find((b) => b.date === todayIso() && b.allDay && sameDoctor(b.doctor, doc.name)) : undefined;

  const issue = () => {
    if (walkInOff) return notify('Walk-in tokens are switched off by the OPD admin — book an appointment instead', 'error');
    if (!p) return notify('Choose the patient first', 'error');
    if (!doc) return notify('Choose the doctor', 'error');
    if (active) return notify(`${patientName(p)} already holds token ${tokenLabel(active.token)} today`, 'error');
    const no = nextTokenNo();
    const now = new Date().getTime();
    const t: SharedQueueToken = {
      id: `tok-${now}`,
      token: no,
      aptNo: `APT-${todayIso().replace(/-/g, '')}-${String(no).padStart(4, '0')}`,
      uhid: p.uhid,
      patient: patientName(p),
      age: p.age,
      gender: String(p.gender),
      bloodGroup: p.bloodGroup,
      phone: p.phone,
      doctor: `${doc.name} (${doc.specialty})`,
      room: doc.room ? `${doc.room.name || doc.room.roomNumber}` : 'Chamber not assigned',
      time: nowTime(),
      type: kind,
      status: kind === 'EMERGENCY' ? 'EMERGENCY' : 'WAITING',
      priority: kind === 'EMERGENCY' ? 'EMERGENCY' : urgent ? 'URGENT' : 'NORMAL',
      feePaid: false,
      totalFee: fee.total,
      paymentMode: 'UNPAID',
      callingStatus: 'IDLE',
      waitingStartTime: new Date(now).toISOString(),
      allergies: p.allergies || [],
      chronicConditions: p.chronicConditions || [],
      triageNotes: complaint.trim() || undefined,
    };
    patientJourneyService.addQueueToken(t);
    if (payNow && fee.total > 0) {
      recordDeskPayment(t, mode, [
        [`Consultation · ${doc.name} (${kind.replace('_', ' ').toLowerCase()})`, fee.consult],
        ['Triage & vitals', fee.triage],
        ['Registration (first visit)', fee.reg],
      ]);
    }
    onIssued({ ...t, feePaid: payNow && fee.total > 0, paymentMode: payNow ? mode : 'UNPAID' });
  };

  return (
    <HmsModal
      title="Issue a walk-in token"
      description="Puts the patient in today’s OPD queue for the chosen doctor. The consultation charge reaches the cashier automatically."
      onClose={onClose}
      width={720}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton variant="primary" icon={Ticket} onClick={issue} disabled={!p || !doc || !!active || walkInOff}>
            Issue token{payNow && fee.total > 0 ? ` · collect ${format(fee.total)}` : ''}
          </HmsButton>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {walkInOff && <HmsNotice tone="red">Walk-in tokens are switched off by the OPD admin. Book an appointment, or choose Emergency for an emergency.</HmsNotice>}
        {overDept && <HmsNotice tone="amber">OPD has reached today's capacity of {cfg.dailyCapacity} patients ({todayTokens.length} tokens). Issue only if the patient cannot come another day.</HmsNotice>}
        {docAway && <HmsNotice tone="red">{doc?.name} is marked unavailable today ({docAway.reason}). Choose another doctor.</HmsNotice>}
        {!docAway && docCap > 0 && docCount >= docCap && <HmsNotice tone="amber">{doc?.name} already has {docCount} patients today (capacity {docCap}).</HmsNotice>}
        {shiftClosed && <HmsNotice tone="amber">Your counter shift is closed. Tokens can be issued, but take payment only after you open the shift.</HmsNotice>}
        {!data.doctors.length && <HmsNotice tone="red">No OPD doctors are set up. Department Admin adds doctors and their fees under the OPD tariff.</HmsNotice>}
        <HmsField label="Patient" htmlFor="wk-patient" required>
          <PatientPicker id="wk-patient" patients={data.patients} value={uhid} onChange={setUhid} onRegister={onRegister} />
        </HmsField>
        {active && <HmsNotice tone="amber">{patientName(p!)} already has token {tokenLabel(active.token)} ({active.status.toLowerCase().replace(/_/g, ' ')}) with {active.doctor}. Reassign it from the queue instead.</HmsNotice>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
          <HmsField label="Doctor" htmlFor="wk-doc" required>
            <select id="wk-doc" style={INPUT} value={doctorId} onChange={(ev) => setDoctorId(ev.target.value)}>
              {data.doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.specialty}
                  {d.room ? ` · ${d.room.roomNumber}` : ''}
                </option>
              ))}
            </select>
          </HmsField>
          <HmsField label="Visit type" htmlFor="wk-kind">
            <select id="wk-kind" style={INPUT} value={kind} onChange={(ev) => setKind(ev.target.value as VisitKind)}>
              <option value="WALK_IN">New consultation</option>
              <option value="FOLLOW_UP">Follow-up</option>
              <option value="EMERGENCY">Emergency (seen first)</option>
            </select>
          </HmsField>
          <div style={{ gridColumn: 'span 2' }}>
            <HmsField label="Reason for visit" htmlFor="wk-reason" hint="Optional — passed to triage and the doctor">
              <input id="wk-reason" style={INPUT} value={complaint} onChange={(ev) => setComplaint(ev.target.value)} placeholder="e.g. fever for 3 days" />
            </HmsField>
          </div>
        </div>
        {kind !== 'EMERGENCY' && <HmsToggle checked={urgent} onChange={setUrgent} label="Priority (elderly, pregnant, disabled, very unwell)" showLabel />}
        <HmsSection title="Fee">
          <HmsRow label="Consultation" value={format(fee.consult)} hint={doc ? doc.name : '—'} />
          {fee.triage > 0 && <HmsRow label="Triage & vitals" value={format(fee.triage)} />}
          {fee.reg > 0 && <HmsRow label="Registration (first visit)" value={format(fee.reg)} />}
          <HmsRow label={<strong>Total</strong>} value={<strong>{format(fee.total)}</strong>} last />
        </HmsSection>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <HmsToggle checked={payNow} onChange={setPayNow} label="Collect the fee now at the desk" showLabel />
          {payNow && (
            <HmsField label="Payment mode" htmlFor="wk-mode">
              <select id="wk-mode" style={{ ...INPUT, width: '160px' }} value={mode} onChange={(ev) => setMode(ev.target.value)}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
              </select>
            </HmsField>
          )}
        </div>
      </div>
    </HmsModal>
  );
};

/* ---------------- book / reschedule appointment ---------------- */

export const BookingModal: React.FC<{
  data: ReceptionData;
  preset?: { uhid?: string; doctor?: string; date?: string; followUpId?: string; visitType?: SharedAppointment['visitType'] };
  existing?: SharedAppointment | null;
  bookedBy: string;
  onClose: () => void;
  onRegister: () => void;
  onBooked: (a: SharedAppointment) => void;
  notify: Notify;
}> = ({ data, preset, existing, bookedBy, onClose, onRegister, onBooked, notify }) => {
  const { format } = useCurrency();
  const [uhid, setUhid] = useState(existing?.uhid || preset?.uhid || '');
  const [doctorId, setDoctorId] = useState(() => data.doctors.find((d) => sameDoctor(d.name, existing?.doctor || preset?.doctor))?.id || data.doctors[0]?.id || '');
  const [date, setDate] = useState(existing?.date || (preset?.date && preset.date >= todayIso() ? preset.date : todayIso()));
  const [slot, setSlot] = useState(existing?.slot || '');
  const [visitType, setVisitType] = useState<SharedAppointment['visitType']>(existing?.visitType || preset?.visitType || 'NEW');
  const [notes, setNotes] = useState(existing?.notes || '');
  const p = data.patients.find((x) => x.uhid === uhid);
  const doc = data.doctors.find((d) => d.id === doctorId);
  const fee = !doc ? 0 : visitType === 'FOLLOW_UP' ? doc.followUpFee : doc.fee;

  const taken = useMemo(() => {
    const m = new Map<string, string>();
    if (!doc) return m;
    data.appointments.filter((a) => a.date === date && a.id !== existing?.id && (a.status === 'BOOKED' || a.status === 'CHECKED_IN') && sameDoctor(a.doctor, doc.name)).forEach((a) => m.set(a.slot, a.patient));
    if (date === todayIso()) data.queue.filter((t) => sameDoctor(t.doctor, doc.name) && !isCancelled(t) && t.type !== 'WALK_IN').forEach((t) => m.set(t.time, t.patient));
    return m;
  }, [data.appointments, data.queue, date, doc, existing?.id]);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const past = (s: string) => date === todayIso() && (slotMinutes(s) ?? 0) <= nowMin;
  const clash = p ? data.appointments.find((a) => a.uhid === p.uhid && a.date === date && a.id !== existing?.id && a.status === 'BOOKED') : undefined;

  const book = () => {
    if (!p || !doc || !slot) return notify('Choose patient, doctor and slot', 'error');
    if (taken.has(slot)) return notify(`${slot} is already taken`, 'error');
    if (blockFor(doc.name, date, slot)) return notify(`${doc.name} is not available at ${slot}`, 'error');
    const a: SharedAppointment = {
      ...(existing || {}),
      id: existing?.id || `appt-${Date.now()}`,
      ref: existing?.ref || `APT-${date.replace(/-/g, '')}-${String(data.appointments.filter((x) => x.date === date).length + 1).padStart(3, '0')}`,
      date,
      slot,
      uhid: p.uhid,
      patient: patientName(p),
      phone: p.phone,
      age: p.age,
      gender: String(p.gender),
      doctor: doc.name,
      specialty: doc.specialty,
      room: doc.room ? doc.room.roomNumber : '',
      visitType,
      fee,
      status: 'BOOKED',
      followUpId: existing?.followUpId || preset?.followUpId,
      notes: notes.trim() || undefined,
      bookedBy: existing?.bookedBy || bookedBy,
      bookedAt: existing?.bookedAt || new Date().toISOString(),
    } as SharedAppointment;
    patientJourneyService.saveAppointment(a);
    if (a.followUpId) patientJourneyService.updateFollowUpStatus(a.followUpId, 'BOOKED', `${fmtDate(a.date)} ${a.slot}`);
    onBooked(a);
  };

  return (
    <HmsModal
      title={existing ? `Reschedule ${existing.ref}` : 'Book an appointment'}
      description="Reserve a slot with an OPD doctor. The patient checks in on arrival and gets a token then."
      onClose={onClose}
      width={780}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton variant="primary" icon={CalendarPlus} onClick={book} disabled={!p || !doc || !slot}>
            {existing ? 'Save new time' : 'Book'}
            {slot ? ` · ${slot}` : ''}
          </HmsButton>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {!existing && (
          <HmsField label="Patient" htmlFor="bk-patient" required>
            <PatientPicker id="bk-patient" patients={data.patients} value={uhid} onChange={setUhid} onRegister={onRegister} />
          </HmsField>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
          <HmsField label="Doctor" htmlFor="bk-doc" required>
            <select id="bk-doc" style={INPUT} value={doctorId} onChange={(ev) => { setDoctorId(ev.target.value); setSlot(''); }}>
              {data.doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.specialty}
                </option>
              ))}
            </select>
          </HmsField>
          <HmsField label="Date" htmlFor="bk-date" required>
            <input id="bk-date" type="date" min={todayIso()} style={INPUT} value={date} onChange={(ev) => { setDate(ev.target.value || todayIso()); setSlot(''); }} />
          </HmsField>
          <HmsField label="Visit" htmlFor="bk-type">
            <select id="bk-type" style={INPUT} value={visitType} onChange={(ev) => setVisitType(ev.target.value as SharedAppointment['visitType'])}>
              <option value="NEW">New consultation</option>
              <option value="FOLLOW_UP">Follow-up</option>
              <option value="SECOND_OPINION">Second opinion</option>
            </select>
          </HmsField>
        </div>
        {clash && <HmsNotice tone="amber">{clash.patient} already has {clash.ref} at {clash.slot} on {fmtDate(clash.date)}.</HmsNotice>}
        <HmsSection title={`Slots · ${fmtDate(date)} · ${SLOTS.filter((s) => !taken.has(s) && !past(s) && !(doc && blockFor(doc.name, date, s))).length} free`} padded>
          <div role="radiogroup" aria-label="Appointment slot" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: '8px' }}>
            {SLOTS.map((s) => {
              const who = taken.get(s);
              const blk = doc ? blockFor(doc.name, date, s) : undefined;
              const off = !!who || past(s) || !!blk;
              const on = slot === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={off}
                  title={who ? `Booked · ${who}` : blk ? `Doctor not available · ${blk.reason}` : past(s) ? 'Already passed' : `Book ${s}`}
                  onClick={() => setSlot(s)}
                  style={{ height: '36px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: off ? 'not-allowed' : 'pointer', border: `1px solid ${on ? HMS.primary : HMS.border}`, background: on ? HMS.primary : off ? HMS.subtle : '#ffffff', color: on ? '#ffffff' : off ? HMS.textMuted : HMS.text, textDecoration: who ? 'line-through' : 'none' }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </HmsSection>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '16px', alignItems: 'end' }}>
          <HmsField label="Note" htmlFor="bk-note" hint="Optional — e.g. bring previous reports">
            <input id="bk-note" style={INPUT} value={notes} onChange={(ev) => setNotes(ev.target.value)} />
          </HmsField>
          <div style={{ fontSize: '14px', color: HMS.label, paddingBottom: '10px' }}>
            Consultation fee <strong>{format(fee)}</strong>
          </div>
        </div>
      </div>
    </HmsModal>
  );
};

/* ---------------- collect fee ---------------- */

export const CollectFeeModal: React.FC<{ token: SharedQueueToken; data: ReceptionData; onClose: () => void; onPaid: (invNo: string, mode: string) => void }> = ({ token, data, onClose, onPaid }) => {
  const { format } = useCurrency();
  const [mode, setMode] = useState('CASH');
  const [tendered, setTendered] = useState('');
  const total = token.totalFee || 0;
  const change = mode === 'CASH' && Number(tendered) > total ? Number(tendered) - total : 0;
  const shiftClosed = data.session.status !== 'OPEN';
  return (
    <HmsModal
      title={`Collect ${format(total)} · token ${tokenLabel(token.token)}`}
      description={`${token.patient} · ${token.doctor}`}
      onClose={onClose}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton variant="primary" icon={Banknote} disabled={shiftClosed || (mode === 'CASH' && tendered !== '' && Number(tendered) < total)} onClick={() => onPaid(recordDeskPayment(token, mode, [[`Consultation & desk charges · ${token.doctor}`, total]]), mode)}>
            Mark paid
          </HmsButton>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {shiftClosed && <HmsNotice tone="red">Open your counter shift before taking money.</HmsNotice>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
          <HmsField label="Payment mode" htmlFor="cf-mode">
            <select id="cf-mode" autoFocus style={INPUT} value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
            </select>
          </HmsField>
          {mode === 'CASH' && (
            <HmsField label="Cash received" htmlFor="cf-tend" hint={change ? `Return ${format(change)}` : 'Optional — shows the change'}>
              <input id="cf-tend" style={INPUT} inputMode="decimal" value={tendered} onChange={(e) => setTendered(e.target.value)} />
            </HmsField>
          )}
        </div>
        <HmsNotice tone="blue">The payment is recorded on the patient’s visit and sent to Billing, so the cashier will not collect it again.</HmsNotice>
      </div>
    </HmsModal>
  );
};

/* ---------------- reassign doctor ---------------- */

export const ReassignModal: React.FC<{ token: SharedQueueToken; data: ReceptionData; onClose: () => void; onDone: (doc: DeskDoctor) => void }> = ({ token, data, onClose, onDone }) => {
  const others = data.doctors.filter((d) => !sameDoctor(d.name, token.doctor));
  const [doctorId, setDoctorId] = useState(others[0]?.id || '');
  const doc = data.doctors.find((d) => d.id === doctorId);
  const load = (d: DeskDoctor) => data.queue.filter((t) => sameDoctor(t.doctor, d.name) && isWaiting(t)).length;
  return (
    <HmsModal
      title={`Move token ${tokenLabel(token.token)} to another doctor`}
      description={`${token.patient} · now with ${token.doctor}`}
      onClose={onClose}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton
            variant="primary"
            icon={Shuffle}
            disabled={!doc}
            onClick={() => {
              if (!doc) return;
              patientJourneyService.updateQueueToken(token.token, { doctor: `${doc.name} (${doc.specialty})`, room: doc.room ? doc.room.name || doc.room.roomNumber : 'Chamber not assigned', callingStatus: 'IDLE' });
              onDone(doc);
            }}
          >
            Move
          </HmsButton>
        </>
      }
    >
      <HmsField label="New doctor" htmlFor="ra-doc">
        <select id="ra-doc" autoFocus style={INPUT} value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          {others.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} · {d.specialty} · {load(d)} waiting
            </option>
          ))}
        </select>
      </HmsField>
      {token.feePaid && doc && <p style={{ fontSize: '13px', color: HMS.label, margin: '12px 0 0' }}>The fee already paid stays on the visit; ask Billing to adjust if the new doctor’s fee differs.</p>}
    </HmsModal>
  );
};

/* ---------------- shift open / close ---------------- */

export const ShiftModal: React.FC<{
  mode: 'open' | 'close';
  data: ReceptionData;
  userName: string;
  expected: { cash: number; upi: number; card: number };
  onClose: () => void;
  onDone: (s: DailyCounterSession) => void;
}> = ({ mode, data, userName, expected, onClose, onDone }) => {
  const { format } = useCurrency();
  const s = data.session;
  const [desk, setDesk] = useState(s.counterNumber || 'Desk 1');
  const [shift, setShift] = useState(s.shift || 'Morning (08:00–16:00)');
  const [float, setFloat] = useState(mode === 'open' ? '' : String(s.openingFloat || 0));
  const [counted, setCounted] = useState('');
  const [handedTo, setHandedTo] = useState('');
  const [notes, setNotes] = useState('');
  const expectedCash = (s.openingFloat || 0) + expected.cash;
  const variance = counted === '' ? null : Number(counted) - expectedCash;

  const submit = () => {
    if (mode === 'open') {
      const next = patientJourneyService.openCounterSession({ counterNumber: desk.trim() || 'Desk 1', shift, openingFloat: Number(float) || 0, receptionistName: userName, openedBy: userName, notes: notes.trim() || undefined, countedCash: undefined, expectedCash: undefined, variance: undefined, closedBy: undefined, handedTo: undefined });
      onDone(next);
    } else {
      patientJourneyService.closeCounterSession(notes.trim() || undefined);
      const closed = { ...patientJourneyService.getCounterSession(), countedCash: Number(counted) || 0, expectedCash, variance: variance ?? 0, closedBy: userName, handedTo: handedTo.trim() || undefined };
      localStorage.setItem('nh_counter_session', JSON.stringify(closed));
      onDone(closed);
    }
  };

  return (
    <HmsModal
      title={mode === 'open' ? 'Open the counter shift' : `Close ${s.counterNumber} · hand over`}
      description={mode === 'open' ? 'Count the opening cash float before taking any payment.' : 'Count the cash in the drawer. Any difference is recorded with your note.'}
      onClose={onClose}
      width={620}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton variant={mode === 'open' ? 'primary' : 'danger'} icon={mode === 'open' ? LockOpen : Lock} disabled={mode === 'open' ? float === '' : counted === '' || (!!variance && Math.abs(variance) >= 1 && notes.trim().length < 5)} onClick={submit}>
            {mode === 'open' ? 'Open shift' : 'Close shift'}
          </HmsButton>
        </>
      }
    >
      {mode === 'open' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
          <HmsField label="Desk" htmlFor="sh-desk">
            <input id="sh-desk" style={INPUT} value={desk} onChange={(e) => setDesk(e.target.value)} />
          </HmsField>
          <HmsField label="Shift" htmlFor="sh-shift">
            <select id="sh-shift" style={INPUT} value={shift} onChange={(e) => setShift(e.target.value)}>
              <option>Morning (08:00–16:00)</option>
              <option>Evening (16:00–00:00)</option>
              <option>Night (00:00–08:00)</option>
            </select>
          </HmsField>
          <HmsField label="Opening float" htmlFor="sh-float" required>
            <input id="sh-float" autoFocus style={INPUT} inputMode="decimal" value={float} onChange={(e) => setFloat(e.target.value)} />
          </HmsField>
          <div style={{ gridColumn: 'span 3' }}>
            <HmsField label="Note" htmlFor="sh-note">
              <input id="sh-note" style={INPUT} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </HmsField>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <HmsSection title="Expected in the drawer">
            <HmsRow label="Opening float" value={format(s.openingFloat || 0)} />
            <HmsRow label="Cash collected this shift" value={format(expected.cash)} />
            <HmsRow label={<strong>Cash expected</strong>} value={<strong>{format(expectedCash)}</strong>} />
            <HmsRow label="UPI / card (not in the drawer)" value={`${format(expected.upi)} · ${format(expected.card)}`} last />
          </HmsSection>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
            <HmsField label="Cash counted" htmlFor="sh-count" required hint={variance === null ? undefined : Math.abs(variance) < 1 ? 'Matches' : `${variance > 0 ? 'Excess' : 'Short'} ${format(Math.abs(variance))}`}>
              <input id="sh-count" autoFocus style={INPUT} inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} />
            </HmsField>
            <HmsField label="Handed over to" htmlFor="sh-to" hint="Next shift or cashier">
              <input id="sh-to" style={INPUT} value={handedTo} onChange={(e) => setHandedTo(e.target.value)} />
            </HmsField>
          </div>
          <HmsField label="Handover note" htmlFor="sh-note2" hint={variance !== null && Math.abs(variance) >= 1 ? 'Required: explain the difference' : 'Pending issues for the next shift'}>
            <textarea id="sh-note2" style={TEXTAREA} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </HmsField>
        </div>
      )}
    </HmsModal>
  );
};

/* ---------------- day-care beds ---------------- */

export const AllocateBedModal: React.FC<{ bed: FlatCampusBed; data: ReceptionData; onClose: () => void; onDone: (patient: string) => void }> = ({ bed, data, onClose, onDone }) => {
  const [uhid, setUhid] = useState(() => data.queue.find((t) => isWithDoctor(t))?.uhid || '');
  const [doctor, setDoctor] = useState(data.doctors[0]?.name || '');
  const [nurse, setNurse] = useState('');
  const [reason, setReason] = useState('');
  const p = data.patients.find((x) => x.uhid === uhid);
  return (
    <HmsModal
      title={`Allocate ${bed.bed.bedNumber}`}
      description={`${bed.wardName} · ${bed.roomNumber}`}
      onClose={onClose}
      width={680}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton
            variant="primary"
            icon={BedDouble}
            disabled={!p || !doctor || reason.trim().length < 3}
            onClick={() => {
              if (!p) return;
              patientJourneyService.allocateCampusBed(bed.buildingId, bed.floorId, bed.wardId, bed.bed.id, {
                patientName: patientName(p),
                uhid: p.uhid,
                ipdAdmissionNo: `DC-${Date.now().toString().slice(-6)}`,
                admissionDate: localStamp(),
                age: p.age || 0,
                gender: (String(p.gender).toUpperCase() as 'MALE' | 'FEMALE' | 'OTHER') || 'OTHER',
                diagnosis: reason.trim(),
                acuity: 'OBSERVATION',
                primaryDoctor: { id: data.doctors.find((d) => d.name === doctor)?.id || 'opd', name: doctor, specialty: data.doctors.find((d) => d.name === doctor)?.specialty || 'OPD' },
                consultingDoctors: [],
                primaryNurse: { id: 'opd-nurse', name: nurse.trim() || 'Duty nurse', shift: 'Morning' },
                cleanlinessStatus: 'SANITIZED',
              });
              onDone(patientName(p));
            }}
          >
            Allocate bed
          </HmsButton>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <HmsField label="Patient" htmlFor="ab-patient" required>
          <PatientPicker id="ab-patient" patients={data.patients} value={uhid} onChange={setUhid} />
        </HmsField>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
          <HmsField label="Ordering doctor" htmlFor="ab-doc" required>
            <select id="ab-doc" style={INPUT} value={doctor} onChange={(e) => setDoctor(e.target.value)}>
              {data.doctors.map((d) => (
                <option key={d.id}>{d.name}</option>
              ))}
            </select>
          </HmsField>
          <HmsField label="Nurse in charge" htmlFor="ab-nurse">
            <input id="ab-nurse" style={INPUT} value={nurse} onChange={(e) => setNurse(e.target.value)} />
          </HmsField>
          <div style={{ gridColumn: 'span 2' }}>
            <HmsField label="Reason / procedure" htmlFor="ab-reason" required hint="e.g. IV fluids, nebulisation, post-procedure observation">
              <input id="ab-reason" style={INPUT} value={reason} onChange={(e) => setReason(e.target.value)} />
            </HmsField>
          </div>
        </div>
        <span style={{ fontSize: '13px', color: HMS.label }}>Bed rate {bed.bed.dailyTariff ? `${bed.bed.dailyTariff} / day` : 'not set'} · charged by Billing from the ward tariff.</span>
      </div>
    </HmsModal>
  );
};

export const TransferBedModal: React.FC<{ bed: FlatCampusBed; data: ReceptionData; onClose: () => void; onDone: (to: string) => void }> = ({ bed, data, onClose, onDone }) => {
  const free = data.beds.filter((b) => b.bed.id !== bed.bed.id && b.bed.status === 'AVAILABLE' && b.bed.cleanlinessStatus !== 'NEEDS_CLEANING' && b.bed.cleanlinessStatus !== 'CLEANING_IN_PROGRESS');
  const [target, setTarget] = useState(free[0]?.bed.id || '');
  const t = free.find((b) => b.bed.id === target);
  return (
    <HmsModal
      title={`Move ${bed.bed.inpatientDetails?.patientName || 'patient'} to another bed`}
      description={`From ${bed.bed.bedNumber} · ${bed.wardName}`}
      onClose={onClose}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton variant="primary" icon={ArrowRightLeft} disabled={!t} onClick={() => { patientJourneyService.transferCampusBed(bed.bed.id, target); onDone(t ? t.bed.bedNumber : ''); }}>
            Move patient
          </HmsButton>
        </>
      }
    >
      {free.length ? (
        <HmsField label="Clean, vacant bed" htmlFor="tb-bed">
          <select id="tb-bed" autoFocus style={INPUT} value={target} onChange={(e) => setTarget(e.target.value)}>
            {free.map((b) => (
              <option key={b.bed.id} value={b.bed.id}>
                {b.bed.bedNumber} · {b.wardName} · {b.roomNumber}
              </option>
            ))}
          </select>
        </HmsField>
      ) : (
        <HmsNotice tone="amber">No clean vacant bed is available.</HmsNotice>
      )}
    </HmsModal>
  );
};

/* ---------------- reason prompt ---------------- */

export const ReasonModal: React.FC<{ title: string; description: string; label: string; confirm: string; danger?: boolean; onClose: () => void; onConfirm: (reason: string) => void; options?: string[] }> = ({ title, description, label, confirm, danger, onClose, onConfirm, options }) => {
  const [reason, setReason] = useState(options?.[0] || '');
  return (
    <HmsModal
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <HmsButton onClick={onClose}>Back</HmsButton>
          <HmsButton variant={danger ? 'danger' : 'primary'} disabled={reason.trim().length < 3} onClick={() => onConfirm(reason.trim())}>
            {confirm}
          </HmsButton>
        </>
      }
    >
      <HmsField label={label} htmlFor="rs-reason" required>
        {options ? (
          <select id="rs-reason" autoFocus style={INPUT} value={reason} onChange={(e) => setReason(e.target.value)}>
            {options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ) : (
          <input id="rs-reason" autoFocus style={INPUT} value={reason} onChange={(e) => setReason(e.target.value)} />
        )}
      </HmsField>
    </HmsModal>
  );
};
