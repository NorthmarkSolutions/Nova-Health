// OPD Admin — doctor roster. Each OPD doctor's specialty, chamber, OPD days and hours, daily capacity and fee, with
// today's load against capacity. Add a doctor from the hospital staff master, edit the roster entry, or put a doctor
// on leave / off duty. Changes reach the front desk (booking, tokens), the chamber desk and the doctor's desk at once.
import React, { useState } from 'react';
import { Stethoscope, Plus, Pencil } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, INPUT, HMS } from '../../components/hms';
import { useCurrency } from '../../config/currency';
import { DepartmentDoctor } from '../../types';
import { saveDepartmentDoctor, saveDepartmentRoom, updateDoctorConsultationFee } from '../department/departmentWorkspaceStore';
import { OPD_DEPT, sameDoctor } from '../reception/receptionData';
import { OpdAdminActions, OpdAdminData, deskOf, doctorState, logChange, tokensOf } from './opdAdminData';

export interface OaDoctorsViewProps {
  data: OpdAdminData;
  act: OpdAdminActions;
  initialFilter?: string;
  newSignal?: number;
}

const PILLS = ['active', 'leave', 'all'];
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STATUS: Record<DepartmentDoctor['status'], { label: string; tone: 'green' | 'red' | 'gray' }> = { ACTIVE: { label: 'Active', tone: 'green' }, ON_LEAVE: { label: 'On leave', tone: 'red' }, OFF_DUTY: { label: 'Off duty', tone: 'gray' } };

const DoctorModal: React.FC<{ data: OpdAdminData; doctor?: DepartmentDoctor; userName: string; onClose: () => void; onDone: (d: DepartmentDoctor) => void }> = ({ data, doctor, userName, onClose, onDone }) => {
  const candidates = data.staffMaster.filter((s) => s.role === 'doctor' && s.status === 'ACTIVE' && !data.deptDoctors.some((d) => d.staffId === s.id || sameDoctor(d.fullName, s.fullName)));
  const [staffId, setStaffId] = useState(doctor?.staffId || '');
  const staff = data.staffMaster.find((s) => s.id === staffId);
  const [specialization, setSpecialization] = useState(doctor?.specialization || '');
  const [qualification, setQualification] = useState(doctor?.qualification || '');
  const [fee, setFee] = useState(doctor ? String(doctor.consultationFee || '') : '');
  const [start, setStart] = useState(doctor?.consultationStartTime || '09:00');
  const [end, setEnd] = useState(doctor?.consultationEndTime || '17:00');
  const [days, setDays] = useState<string[]>(doctor?.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const [cap, setCap] = useState(String(doctor?.patientCapacityPerDay || 30));
  const [avg, setAvg] = useState(String(doctor?.avgConsultationMinutes || 15));
  const [roomId, setRoomId] = useState(doctor?.assignedRoomId || data.rooms.find((r) => sameDoctor(r.assignedDoctorName, doctor?.fullName))?.id || '');
  const [status, setStatus] = useState<DepartmentDoctor['status']>(doctor?.status || 'ACTIVE');
  const name = doctor?.fullName || staff?.fullName || '';
  const ok = !!name && specialization.trim().length >= 2 && Number(fee) > 0 && days.length > 0 && Number(cap) > 0 && Number(avg) > 0 && end > start;
  const room = data.rooms.find((r) => r.id === roomId);
  const roomTaken = room && room.assignedDoctorName && !sameDoctor(room.assignedDoctorName, name) ? room.assignedDoctorName : '';
  return (
    <HmsModal
      title={doctor ? `Edit ${doctor.fullName}` : 'Add a doctor to OPD'}
      description={doctor ? 'Roster entry used by the front desk, chamber desk and doctor desk.' : 'Doctors come from the hospital staff master (HR adds new staff there).'}
      width={680}
      onClose={onClose}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton
            variant="primary"
            icon={doctor ? Pencil : Plus}
            disabled={!ok}
            onClick={() => {
              const next: DepartmentDoctor = {
                ...(doctor || {}),
                id: doctor?.id || `doc-opd-${new Date().getTime()}`,
                departmentId: OPD_DEPT,
                staffId: doctor?.staffId || staffId,
                fullName: name,
                employeeCode: doctor?.employeeCode || staff?.employeeCode || '',
                specialization: specialization.trim(),
                qualification: qualification.trim(),
                consultationFee: Number(fee),
                consultationStartTime: start,
                consultationEndTime: end,
                workingDays: WEEK.filter((d) => days.includes(d)),
                assignedRoomId: room?.id,
                assignedRoomName: room ? room.name || room.roomNumber : undefined,
                patientCapacityPerDay: Number(cap),
                avgConsultationMinutes: Number(avg),
                isAvailable: status === 'ACTIVE',
                status,
              };
              saveDepartmentDoctor(next);
              // Keep the fee tariff (what the front desk charges) in step with the roster fee
              const tariffRow = data.tariff.doctorTariffs.find((t) => t.doctorId === next.id);
              if (tariffRow && tariffRow.standardFee !== next.consultationFee) updateDoctorConsultationFee(OPD_DEPT, next.id, next.consultationFee, tariffRow.followUpFee, tariffRow.emergencyFee);
              // Chamber master follows the doctor's chamber
              data.rooms.forEach((r) => {
                if (r.id === room?.id && !sameDoctor(r.assignedDoctorName, name)) saveDepartmentRoom({ ...r, assignedDoctorId: next.id, assignedDoctorName: name });
                else if (r.id !== room?.id && sameDoctor(r.assignedDoctorName, name)) saveDepartmentRoom({ ...r, assignedDoctorId: undefined, assignedDoctorName: undefined });
              });
              const changes = doctor
                ? [
                    doctor.status !== status && `status ${doctor.status} → ${status}`,
                    doctor.consultationFee !== Number(fee) && `fee ${doctor.consultationFee} → ${fee}`,
                    doctor.assignedRoomId !== room?.id && `chamber → ${room?.roomNumber || 'none'}`,
                    doctor.patientCapacityPerDay !== Number(cap) && `capacity ${doctor.patientCapacityPerDay} → ${cap}`,
                    (doctor.workingDays || []).join(',') !== next.workingDays.join(',') && `OPD days ${next.workingDays.join(', ')}`,
                    (doctor.consultationStartTime !== start || doctor.consultationEndTime !== end) && `hours ${start}–${end}`,
                  ].filter(Boolean).join('; ') || 'details updated'
                : `Added to OPD · ${specialization.trim()} · fee ${fee}`;
              logChange(userName, 'DOCTOR', name, changes);
              onDone(next);
            }}
          >
            {doctor ? 'Save changes' : 'Add doctor'}
          </HmsButton>
        </>
      }
    >
      {!doctor && (
        <HmsField label="Doctor (hospital staff)" htmlFor="dm-staff" required hint={candidates.length ? undefined : 'Every active doctor in the staff master is already in OPD.'}>
          <select id="dm-staff" style={INPUT} value={staffId} onChange={(e) => { setStaffId(e.target.value); const s = data.staffMaster.find((x) => x.id === e.target.value); if (s) { setSpecialization(s.specialization || s.designation || ''); setQualification(s.qualification || ''); } }}>
            <option value="">Choose a doctor…</option>
            {candidates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} · {s.designation} ({s.employeeCode})
              </option>
            ))}
          </select>
        </HmsField>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <HmsField label="Specialty" htmlFor="dm-spec" required>
          <input id="dm-spec" style={INPUT} value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
        </HmsField>
        <HmsField label="Qualification" htmlFor="dm-qual">
          <input id="dm-qual" style={INPUT} value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g. MBBS, MD" />
        </HmsField>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
        <HmsField label="Consultation fee" htmlFor="dm-fee" required>
          <input id="dm-fee" inputMode="decimal" style={INPUT} value={fee} onChange={(e) => setFee(e.target.value.replace(/[^0-9.]/g, ''))} />
        </HmsField>
        <HmsField label="Patients / day" htmlFor="dm-cap" required>
          <input id="dm-cap" inputMode="numeric" style={INPUT} value={cap} onChange={(e) => setCap(e.target.value.replace(/\D/g, ''))} />
        </HmsField>
        <HmsField label="Minutes / patient" htmlFor="dm-avg" required>
          <input id="dm-avg" inputMode="numeric" style={INPUT} value={avg} onChange={(e) => setAvg(e.target.value.replace(/\D/g, ''))} />
        </HmsField>
      </div>
      <HmsField label="OPD days" required>
        <div role="group" aria-label="OPD days" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {WEEK.map((d) => {
            const on = days.includes(d);
            return (
              <button key={d} type="button" role="checkbox" aria-checked={on} onClick={() => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))} style={{ height: '36px', minWidth: '52px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? HMS.primary : '#d1d5db'}`, background: on ? HMS.primary : '#ffffff', color: on ? '#ffffff' : HMS.text }}>
                {d}
              </button>
            );
          })}
        </div>
      </HmsField>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
        <HmsField label="OPD from" htmlFor="dm-start" required>
          <input id="dm-start" type="time" style={INPUT} value={start} onChange={(e) => setStart(e.target.value)} />
        </HmsField>
        <HmsField label="OPD to" htmlFor="dm-end" required>
          <input id="dm-end" type="time" style={INPUT} value={end} onChange={(e) => setEnd(e.target.value)} />
        </HmsField>
        <HmsField label="Status" htmlFor="dm-status">
          <select id="dm-status" style={INPUT} value={status} onChange={(e) => setStatus(e.target.value as DepartmentDoctor['status'])}>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On leave</option>
            <option value="OFF_DUTY">Off duty</option>
          </select>
        </HmsField>
      </div>
      <HmsField label="Chamber" htmlFor="dm-room">
        <select id="dm-room" style={INPUT} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="">No chamber</option>
          {data.rooms.filter((r) => r.type === 'consultation' || r.id === roomId).map((r) => (
            <option key={r.id} value={r.id}>
              {r.roomNumber} · {r.name}{r.assignedDoctorName && !sameDoctor(r.assignedDoctorName, name) ? ` (now ${r.assignedDoctorName})` : ''}
            </option>
          ))}
        </select>
      </HmsField>
      {roomTaken && <HmsNotice tone="amber">{room?.roomNumber} is assigned to {roomTaken}; saving moves it to {name || 'this doctor'}.</HmsNotice>}
      {end <= start && <HmsNotice tone="red">OPD end time must be after the start time.</HmsNotice>}
    </HmsModal>
  );
};

export const OaDoctorsView: React.FC<OaDoctorsViewProps> = ({ data, act, initialFilter, newSignal = 0 }) => {
  const { format } = useCurrency();
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<DepartmentDoctor | 'new' | null>(initialFilter === 'new' ? 'new' : null);
  const [seen, setSeen] = useState(newSignal);
  if (newSignal !== seen) {
    setSeen(newSignal);
    setEditing('new');
  }

  const all = data.deptDoctors;
  const match: Record<string, (d: DepartmentDoctor) => boolean> = { active: (d) => d.status === 'ACTIVE', leave: (d) => d.status !== 'ACTIVE', all: () => true };
  const q = search.trim().toLowerCase();
  const list = all.filter((d) => match[pill](d) && (!q || [d.fullName, d.specialization, d.employeeCode, d.assignedRoomName].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = list.map((d) => {
    const toks = tokensOf(data, d.fullName).length;
    const desk = deskOf(data, d);
    return {
      key: `d:${d.id}`,
      title: d.fullName,
      badge: <HmsBadge tone={STATUS[d.status].tone}>{STATUS[d.status].label}</HmsBadge>,
      sub: `${d.specialization} · ${desk?.room?.roomNumber || d.assignedRoomName || 'no chamber'}`,
      metaLeft: `${(d.workingDays || []).join(' ')} · ${d.consultationStartTime}–${d.consultationEndTime}`,
      metaRight: desk ? format(desk.fee) : undefined,
      progress: d.patientCapacityPerDay ? { pct: Math.min(100, (toks / d.patientCapacityPerDay) * 100), doneLabel: 'At capacity today', tone: toks >= d.patientCapacityPerDay ? 'red' : 'blue' } : undefined,
    };
  });

  const renderDetail = (key: string | null) => {
    const d = all.find((x) => `d:${x.id}` === key);
    if (!d) return <HmsEmpty>{all.length ? 'Select a doctor.' : 'No doctors in OPD yet. Add one from the hospital staff master.'}</HmsEmpty>;
    const desk = deskOf(data, d);
    const toks = tokensOf(data, d.fullName);
    const st = doctorState(data, d.fullName);
    const slots = d.avgConsultationMinutes ? Math.floor(((Number(d.consultationEndTime.slice(0, 2)) * 60 + Number(d.consultationEndTime.slice(3, 5))) - (Number(d.consultationStartTime.slice(0, 2)) * 60 + Number(d.consultationStartTime.slice(3, 5)))) / d.avgConsultationMinutes) : 0;
    const upcoming = data.blocks.filter((b) => sameDoctor(b.doctor, d.fullName) && b.date >= new Date().toISOString().slice(0, 10));
    return (
      <>
        <HmsDetailHeader icon={Stethoscope} title={d.fullName} badge={<HmsBadge tone={STATUS[d.status].tone}>{STATUS[d.status].label}</HmsBadge>} subtitle={`${d.specialization}${d.qualification ? ` · ${d.qualification}` : ''}${d.employeeCode ? ` · ${d.employeeCode}` : ''}`} actions={<HmsButton icon={Pencil} onClick={() => setEditing(d)}>Edit</HmsButton>} />
        <HmsStatStrip
          items={[
            { label: 'Today', value: `${toks.length}/${d.patientCapacityPerDay || '—'}`, note: st.label, tone: d.patientCapacityPerDay && toks.length >= d.patientCapacityPerDay ? 'red' : 'default' },
            { label: 'Fee', value: desk ? format(desk.fee) : format(d.consultationFee), note: desk ? `Follow-up ${format(desk.followUpFee)}` : undefined },
            { label: 'Chamber', value: desk?.room?.roomNumber || d.assignedRoomName || '—' },
            { label: 'Hours fit', value: slots || '—', note: slots && d.patientCapacityPerDay > slots ? 'Capacity above hours' : 'patients at set pace', tone: slots && d.patientCapacityPerDay > slots ? 'amber' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {!desk?.room && <HmsNotice tone="amber">No chamber assigned — patients are told "chamber not assigned".</HmsNotice>}
          {slots > 0 && d.patientCapacityPerDay > slots && <HmsNotice tone="amber">Capacity {d.patientCapacityPerDay}/day needs more time than the OPD hours allow at {d.avgConsultationMinutes} min per patient ({slots} fit).</HmsNotice>}
          <HmsSection title="OPD timetable">
            {WEEK.map((w, i) => (
              <HmsRow key={w} label={w} value={(d.workingDays || []).includes(w) ? `${d.consultationStartTime} – ${d.consultationEndTime}` : 'No OPD'} last={i === WEEK.length - 1} />
            ))}
          </HmsSection>
          <HmsSection title={`Leave & blocked time · ${upcoming.length}`}>
            {upcoming.length === 0 && <HmsRow label="Nothing booked off" last />}
            {upcoming.map((b, i) => (
              <HmsRow key={b.id} label={b.date} value={b.allDay ? 'All day' : `${b.from} – ${b.to}`} hint={`${b.reason} · ${b.by}`} last={i === upcoming.length - 1} />
            ))}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton variant="primary" icon={Pencil} block onClick={() => setEditing(d)}>
            Edit roster entry
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="oa-doctors"
        title="Doctors"
        description="OPD consultants: days, hours, chamber, capacity and fee."
        total={all.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search name, specialty, code or chamber"
        headerAction={
          <HmsButton variant="primary" icon={Plus} onClick={() => setEditing('new')} title="Add doctor (Alt+N)" aria-keyshortcuts="Alt+N">
            Add
          </HmsButton>
        }
        pills={[
          { key: 'active', label: 'Active', count: all.filter(match.active).length },
          { key: 'leave', label: 'Leave / off', count: all.filter(match.leave).length, tone: 'amber' },
          { key: 'all', label: 'All', count: all.length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        onPrimary={(k) => {
          const d = all.find((x) => `d:${x.id}` === k);
          if (d) setEditing(d);
        }}
        primaryLabel="edit doctor"
        detailLabel="Doctor"
        emptyText="No doctors match this search or filter."
        renderDetail={renderDetail}
      />
      {editing && (
        <DoctorModal
          data={data}
          doctor={editing === 'new' ? undefined : editing}
          userName={act.userName}
          onClose={() => setEditing(null)}
          onDone={(d) => {
            setEditing(null);
            data.reload();
            setSelected(`d:${d.id}`);
            act.notify(`${d.fullName} saved`);
          }}
        />
      )}
    </>
  );
};
