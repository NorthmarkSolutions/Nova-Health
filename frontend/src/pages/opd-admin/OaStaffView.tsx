// OPD Admin — staff & shifts. Nurses, front-desk staff and assistants posted to OPD (from the hospital staff master):
// role, shift, room, contact, licence and profile completeness, plus their roster duties this week. Change a person's
// shift, room or leave status here; new joiners are added by HR in the staff master.
import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, HmsProgress, INPUT, initialsOf } from '../../components/hms';
import { DepartmentStaffAssignment } from '../../types';
import { updateHospitalStaff } from '../admin/setup/organization/hospitalStaffStore';
import { fmtDate } from '../reception/receptionData';
import { OpdAdminActions, OpdAdminData, isoDay, logChange } from './opdAdminData';

export interface OaStaffViewProps {
  data: OpdAdminData;
  act: OpdAdminActions;
  initialFilter?: string;
}

const PILLS = ['nurse', 'desk', 'assistant', 'other', 'leave', 'all'];
const ROLE: Record<string, string> = { nurse: 'Nurse', receptionist: 'Front desk', admin: 'Front desk', supervisor: 'Supervisor', assistant: 'Doctor assistant', technician: 'Technician', pharmacist: 'Pharmacist', paramedic: 'Paramedic', support: 'Support' };
const roleLabel = (r: string) => ROLE[r] || r;
const isDesk = (r: string) => r === 'receptionist' || r === 'admin' || r === 'supervisor';

export const OaStaffView: React.FC<OaStaffViewProps> = ({ data, act, initialFilter }) => {
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<DepartmentStaffAssignment | null>(null);
  const [shiftId, setShiftId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'ON_LEAVE'>('ACTIVE');

  const all = data.staff;
  const match: Record<string, (s: DepartmentStaffAssignment) => boolean> = {
    nurse: (s) => s.role === 'nurse',
    desk: (s) => isDesk(s.role),
    assistant: (s) => s.role === 'assistant',
    other: (s) => !['nurse', 'assistant'].includes(s.role) && !isDesk(s.role),
    leave: (s) => s.status !== 'ACTIVE',
    all: () => true,
  };
  const q = search.trim().toLowerCase();
  const list = all.filter((s) => match[pill](s) && (!q || [s.fullName, s.employeeCode, s.designation, s.phone, s.assignedRoomName].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = list.map((s) => ({
    key: `s:${s.staffId}`,
    title: s.fullName,
    badge: s.status === 'ACTIVE' ? <HmsBadge tone="green">On duty</HmsBadge> : <HmsBadge tone="amber">{s.status === 'ON_LEAVE' ? 'On leave' : s.status.toLowerCase()}</HmsBadge>,
    sub: `${roleLabel(s.role)} · ${s.employeeCode}`,
    metaLeft: s.shiftName || 'No shift',
    metaRight: s.assignedRoomName,
    progress: s.profileCompletion !== undefined && s.profileCompletion < 100 ? { pct: s.profileCompletion, doneLabel: 'Profile complete', tone: s.profileCompletion < 60 ? 'amber' : 'blue' } : undefined,
  }));

  const renderDetail = (key: string | null) => {
    const s = all.find((x) => `s:${x.staffId}` === key);
    if (!s) return <HmsEmpty>{all.length ? 'Select a staff member.' : 'No staff posted to OPD in the staff master.'}</HmsEmpty>;
    const week = data.roster.filter((r) => r.staffId === s.staffId && r.date >= isoDay(0) && r.date <= isoDay(6)).sort((a, b) => a.date.localeCompare(b.date));
    return (
      <>
        <HmsDetailHeader avatar={initialsOf(s.fullName)} title={s.fullName} badge={s.status === 'ACTIVE' ? <HmsBadge tone="green">On duty</HmsBadge> : <HmsBadge tone="amber">On leave</HmsBadge>} subtitle={`${roleLabel(s.role)} · ${s.designation || '—'} · ${s.employeeCode}`} actions={<HmsButton icon={Pencil} onClick={() => { setEditing(s); setShiftId(data.shifts.find((x) => x.name === s.shiftName || x.id === s.shiftId)?.id || ''); setRoomId(s.assignedRoomId || ''); setStatus(s.status === 'ACTIVE' ? 'ACTIVE' : 'ON_LEAVE'); }}>Change</HmsButton>} />
        <HmsStatStrip
          items={[
            { label: 'Shift', value: s.shiftName || '—' },
            { label: 'Room', value: s.assignedRoomName || '—' },
            { label: 'Duties this week', value: week.length, tone: week.length ? 'default' : 'amber', note: week.length ? undefined : 'Not on the roster' },
            { label: 'Profile', value: `${s.profileCompletion ?? 100}%`, tone: (s.profileCompletion ?? 100) < 60 ? 'amber' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {(s.profileCompletion ?? 100) < 100 && (
            <HmsSection title="Profile completeness">
              <div style={{ padding: '14px' }}>
                <HmsProgress pct={s.profileCompletion ?? 0} doneLabel="Profile complete" showLabel />
              </div>
            </HmsSection>
          )}
          {s.role === 'nurse' && !s.licenseNumber && <HmsNotice tone="amber">No nursing council registration number on file. Ask HR to add it.</HmsNotice>}
          <HmsSection title="Contact & credentials">
            <HmsRow label="Phone" value={s.phone || '—'} />
            <HmsRow label="Email" value={s.email || '—'} />
            <HmsRow label="Qualification" value={s.qualification || '—'} />
            <HmsRow label="Registration no." value={s.licenseNumber || '—'} />
            <HmsRow label="Joined" value={s.joiningDate ? fmtDate(s.joiningDate) : '—'} />
            <HmsRow label="Emergency contact" value={s.emergencyContact || '—'} last />
          </HmsSection>
          <HmsSection title={`Roster · next 7 days`}>
            {week.length === 0 && <HmsRow label="No duties assigned" last />}
            {week.map((r, i) => (
              <HmsRow key={r.id} label={fmtDate(r.date)} value={r.shiftName} hint={r.roomName} last={i === week.length - 1} />
            ))}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton variant="primary" icon={Pencil} block onClick={() => { setEditing(s); setShiftId(data.shifts.find((x) => x.name === s.shiftName || x.id === s.shiftId)?.id || ''); setRoomId(s.assignedRoomId || ''); setStatus(s.status === 'ACTIVE' ? 'ACTIVE' : 'ON_LEAVE'); }}>
            Change shift, room or status
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="oa-staff"
        title="Staff & shifts"
        description="Nurses, front desk and assistants posted to OPD."
        total={all.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search name, code, designation or phone"
        pills={[
          { key: 'nurse', label: 'Nurses', count: all.filter(match.nurse).length },
          { key: 'desk', label: 'Front desk', count: all.filter(match.desk).length },
          { key: 'assistant', label: 'Assistants', count: all.filter(match.assistant).length },
          { key: 'other', label: 'Other', count: all.filter(match.other).length },
          { key: 'leave', label: 'On leave', count: all.filter(match.leave).length, tone: 'amber' },
          { key: 'all', label: 'All', count: all.length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open profile"
        detailLabel="Staff"
        emptyText="No staff match this search or filter."
        renderDetail={renderDetail}
      />
      {editing && (
        <HmsModal
          title={`${editing.fullName}`}
          description="Shift, room and leave status for OPD. The staff master is updated."
          onClose={() => setEditing(null)}
          footer={
            <>
              <HmsButton onClick={() => setEditing(null)}>Cancel</HmsButton>
              <HmsButton
                variant="primary"
                icon={Pencil}
                onClick={() => {
                  const m = data.staffMaster.find((x) => x.id === editing.staffId);
                  if (!m) return act.notify('This person is not in the staff master any more', 'error');
                  const sh = data.shifts.find((x) => x.id === shiftId);
                  const rm = data.rooms.find((x) => x.id === roomId);
                  updateHospitalStaff({ ...m, shiftId: sh?.id || m.shiftId, shiftName: sh?.name || m.shiftName, roomId: rm?.id, roomName: rm ? rm.name || rm.roomNumber : undefined, status });
                  logChange(act.userName, 'STAFF', editing.fullName, [sh && sh.name !== editing.shiftName && `shift → ${sh.name}`, rm?.id !== editing.assignedRoomId && `room → ${rm?.roomNumber || 'none'}`, status !== (editing.status === 'ACTIVE' ? 'ACTIVE' : 'ON_LEAVE') && `status → ${status === 'ACTIVE' ? 'on duty' : 'on leave'}`].filter(Boolean).join('; ') || 'no change');
                  const n = editing.fullName;
                  setEditing(null);
                  data.reload();
                  act.notify(`${n} updated`);
                }}
              >
                Save
              </HmsButton>
            </>
          }
        >
          <HmsField label="Shift" htmlFor="st-shift">
            <select id="st-shift" style={INPUT} value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
              <option value="">Keep {editing.shiftName || 'current'}</option>
              {data.shifts.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} · {x.startTime}–{x.endTime}
                </option>
              ))}
            </select>
          </HmsField>
          <HmsField label="Room" htmlFor="st-room">
            <select id="st-room" style={INPUT} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">No room</option>
              {data.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} · {r.name}
                </option>
              ))}
            </select>
          </HmsField>
          <HmsField label="Status" htmlFor="st-status">
            <select id="st-status" style={INPUT} value={status} onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'ON_LEAVE')}>
              <option value="ACTIVE">On duty</option>
              <option value="ON_LEAVE">On leave</option>
            </select>
          </HmsField>
        </HmsModal>
      )}
    </>
  );
};
