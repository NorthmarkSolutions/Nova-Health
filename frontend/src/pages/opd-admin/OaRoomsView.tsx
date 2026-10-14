// OPD Admin — chambers & rooms. Consultation chambers, procedure / treatment rooms, triage and observation: who is
// assigned, what is happening in the room now, equipment, and maintenance. Assigning a doctor here moves the doctor's
// chamber everywhere (front desk, lobby screen, chamber desk).
import React, { useState } from 'react';
import { DoorOpen, Plus, Pencil, Wrench } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, INPUT } from '../../components/hms';
import { useCurrency } from '../../config/currency';
import { DepartmentRoom } from '../../types';
import { saveDepartmentDoctor, saveDepartmentRoom } from '../department/departmentWorkspaceStore';
import { OPD_DEPT, sameDoctor, tokenLabel } from '../reception/receptionData';
import { OpdAdminActions, OpdAdminData, logChange, tokensOf } from './opdAdminData';

export interface OaRoomsViewProps {
  data: OpdAdminData;
  act: OpdAdminActions;
  initialFilter?: string;
  newSignal?: number;
}

const PILLS = ['all', 'unassigned', 'maintenance'];
const TYPES: DepartmentRoom['type'][] = ['consultation', 'procedure', 'treatment', 'triage', 'observation'];
const STATUS: Record<DepartmentRoom['status'], { label: string; tone: 'green' | 'blue' | 'amber' | 'gray' }> = { AVAILABLE: { label: 'Available', tone: 'green' }, IN_CONSULTATION: { label: 'In use', tone: 'blue' }, OCCUPIED: { label: 'Occupied', tone: 'blue' }, MAINTENANCE: { label: 'Maintenance', tone: 'amber' } };

const RoomModal: React.FC<{ data: OpdAdminData; room?: DepartmentRoom; userName: string; onClose: () => void; onDone: (r: DepartmentRoom) => void }> = ({ data, room, userName, onClose, onDone }) => {
  const [roomNumber, setRoomNumber] = useState(room?.roomNumber || '');
  const [name, setName] = useState(room?.name || '');
  const [type, setType] = useState<DepartmentRoom['type']>(room?.type || 'consultation');
  const [floor, setFloor] = useState(room?.floorName || '');
  const [doctorId, setDoctorId] = useState(room?.assignedDoctorId || data.deptDoctors.find((d) => sameDoctor(d.fullName, room?.assignedDoctorName))?.id || '');
  const [nurseId, setNurseId] = useState(room?.assignedNurseId || '');
  const [equipment, setEquipment] = useState((room?.equipment || []).join(', '));
  const [maintenance, setMaintenance] = useState(room?.status === 'MAINTENANCE');
  const dup = data.rooms.some((r) => r.id !== room?.id && r.roomNumber.trim().toLowerCase() === roomNumber.trim().toLowerCase());
  const ok = roomNumber.trim().length >= 1 && name.trim().length >= 2 && !dup;
  const doc = data.deptDoctors.find((d) => d.id === doctorId);
  const nurse = data.staff.find((s) => s.staffId === nurseId);
  return (
    <HmsModal
      title={room ? `Edit ${room.roomNumber}` : 'Add a room'}
      onClose={onClose}
      width={620}
      footer={
        <>
          <HmsButton onClick={onClose}>Cancel</HmsButton>
          <HmsButton
            variant="primary"
            icon={room ? Pencil : Plus}
            disabled={!ok}
            onClick={() => {
              const next: DepartmentRoom = {
                ...(room || { capacity: 1 }),
                id: room?.id || `room-opd-${new Date().getTime()}`,
                departmentId: OPD_DEPT,
                roomNumber: roomNumber.trim(),
                name: name.trim(),
                type,
                floorName: floor.trim() || undefined,
                status: maintenance ? 'MAINTENANCE' : room?.status === 'MAINTENANCE' || !room ? 'AVAILABLE' : room.status,
                assignedDoctorId: doc?.id,
                assignedDoctorName: doc?.fullName,
                assignedNurseId: nurse?.staffId,
                assignedNurseName: nurse?.fullName,
                equipment: equipment.split(',').map((x) => x.trim()).filter(Boolean),
              } as DepartmentRoom;
              saveDepartmentRoom(next);
              // One chamber per doctor: the doctor's roster entry follows, other rooms let go of the doctor
              if (doc) {
                saveDepartmentDoctor({ ...doc, assignedRoomId: next.id, assignedRoomName: next.name || next.roomNumber });
                data.rooms.filter((r) => r.id !== next.id && sameDoctor(r.assignedDoctorName, doc.fullName)).forEach((r) => saveDepartmentRoom({ ...r, assignedDoctorId: undefined, assignedDoctorName: undefined }));
              }
              const prevDoc = room?.assignedDoctorName;
              logChange(userName, 'ROOM', next.roomNumber, room ? [prevDoc !== doc?.fullName && `doctor → ${doc?.fullName || 'none'}`, (room.status === 'MAINTENANCE') !== maintenance && (maintenance ? 'sent for maintenance' : 'back in service'), room.name !== next.name && `renamed ${next.name}`].filter(Boolean).join('; ') || 'details updated' : `Added ${type} room ${next.name}`, prevDoc, doc?.fullName);
              onDone(next);
            }}
          >
            {room ? 'Save changes' : 'Add room'}
          </HmsButton>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px' }}>
        <HmsField label="Room no." htmlFor="rm-no" required>
          <input id="rm-no" style={INPUT} value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="e.g. 105" />
        </HmsField>
        <HmsField label="Name" htmlFor="rm-name" required>
          <input id="rm-name" style={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chamber 5" />
        </HmsField>
      </div>
      {dup && <HmsNotice tone="red">Room {roomNumber} already exists.</HmsNotice>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <HmsField label="Type" htmlFor="rm-type">
          <select id="rm-type" style={INPUT} value={type} onChange={(e) => setType(e.target.value as DepartmentRoom['type'])}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </HmsField>
        <HmsField label="Floor / wing" htmlFor="rm-floor">
          <input id="rm-floor" style={INPUT} value={floor} onChange={(e) => setFloor(e.target.value)} />
        </HmsField>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <HmsField label="Doctor" htmlFor="rm-doc">
          <select id="rm-doc" style={INPUT} value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">None</option>
            {data.deptDoctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}{d.assignedRoomName && d.assignedRoomId !== room?.id ? ` (now ${d.assignedRoomName})` : ''}
              </option>
            ))}
          </select>
        </HmsField>
        <HmsField label="Nurse" htmlFor="rm-nurse">
          <select id="rm-nurse" style={INPUT} value={nurseId} onChange={(e) => setNurseId(e.target.value)}>
            <option value="">None</option>
            {data.staff.filter((s) => s.role === 'nurse').map((s) => (
              <option key={s.staffId} value={s.staffId}>
                {s.fullName}
              </option>
            ))}
          </select>
        </HmsField>
      </div>
      <HmsField label="Equipment" htmlFor="rm-eq" hint="Comma separated, e.g. ECG machine, examination couch">
        <input id="rm-eq" style={INPUT} value={equipment} onChange={(e) => setEquipment(e.target.value)} />
      </HmsField>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
        <input type="checkbox" checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} /> Out of service for maintenance
      </label>
    </HmsModal>
  );
};

export const OaRoomsView: React.FC<OaRoomsViewProps> = ({ data, act, initialFilter, newSignal = 0 }) => {
  const { format } = useCurrency();
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<DepartmentRoom | 'new' | null>(null);
  const [seen, setSeen] = useState(newSignal);
  if (newSignal !== seen) {
    setSeen(newSignal);
    setEditing('new');
  }

  const all = data.rooms;
  const match: Record<string, (r: DepartmentRoom) => boolean> = { all: () => true, unassigned: (r) => r.type === 'consultation' && !r.assignedDoctorName, maintenance: (r) => r.status === 'MAINTENANCE' };
  const q = search.trim().toLowerCase();
  const list = all.filter((r) => match[pill](r) && (!q || [r.roomNumber, r.name, r.type, r.assignedDoctorName, r.assignedNurseName].some((v) => (v || '').toLowerCase().includes(q))));
  const serving = (r: DepartmentRoom) => (r.assignedDoctorName ? tokensOf(data, r.assignedDoctorName).find((t) => t.status === 'IN_CONSULTATION') : undefined);
  const rows: HmsListRow[] = list.map((r) => {
    const s = serving(r);
    const st = r.status === 'MAINTENANCE' ? STATUS.MAINTENANCE : s ? STATUS.IN_CONSULTATION : STATUS[r.status] || STATUS.AVAILABLE;
    return {
      key: `r:${r.id}`,
      title: `${r.roomNumber} · ${r.name}`,
      badge: <HmsBadge tone={st.tone}>{st.label}</HmsBadge>,
      sub: `${r.type}${r.floorName ? ` · ${r.floorName}` : ''}`,
      metaLeft: r.assignedDoctorName || (r.type === 'consultation' ? 'No doctor assigned' : '—'),
      metaRight: s ? `${tokenLabel(s.token)} in room` : r.assignedNurseName,
    };
  });

  const renderDetail = (key: string | null) => {
    const r = all.find((x) => `r:${x.id}` === key);
    if (!r) return <HmsEmpty>{all.length ? 'Select a room.' : 'No rooms set up. Add the OPD chambers.'}</HmsEmpty>;
    const s = serving(r);
    const fee = data.tariff.roomTariffs.find((t) => t.roomId === r.id);
    const waiting = r.assignedDoctorName ? tokensOf(data, r.assignedDoctorName).filter((t) => !['COMPLETED', 'NO_SHOW', 'CANCELLED', 'IN_CONSULTATION'].includes(t.status)).length : 0;
    return (
      <>
        <HmsDetailHeader icon={DoorOpen} title={`${r.roomNumber} · ${r.name}`} badge={<HmsBadge tone={r.status === 'MAINTENANCE' ? 'amber' : s ? 'blue' : 'green'}>{r.status === 'MAINTENANCE' ? 'Maintenance' : s ? 'In use' : 'Available'}</HmsBadge>} subtitle={`${r.type}${r.floorName ? ` · ${r.floorName}` : ''}${r.buildingName ? ` · ${r.buildingName}` : ''}`} actions={<HmsButton icon={Pencil} onClick={() => setEditing(r)}>Edit</HmsButton>} />
        <HmsStatStrip
          items={[
            { label: 'Doctor', value: r.assignedDoctorName || '—' },
            { label: 'Nurse', value: r.assignedNurseName || '—' },
            { label: 'Now', value: s ? tokenLabel(s.token) : '—', note: s ? s.patient : waiting ? `${waiting} waiting` : 'Empty' },
            { label: 'Facility fee', value: fee?.facilityFee ? format(fee.facilityFee) : '—' },
          ]}
        />
        <HmsDetailBody>
          {r.status === 'MAINTENANCE' && <HmsNotice tone="amber">Out of service. {r.assignedDoctorName ? `${r.assignedDoctorName} needs another chamber until it is back.` : ''}</HmsNotice>}
          {r.type === 'consultation' && !r.assignedDoctorName && <HmsNotice tone="blue">Free chamber — assign a doctor to use it.</HmsNotice>}
          <HmsSection title="Equipment">
            {(r.equipment || []).length === 0 && <HmsRow label="None recorded" last />}
            {(r.equipment || []).map((e, i, arr) => (
              <HmsRow key={e} label={e} last={i === arr.length - 1} />
            ))}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
            <HmsButton icon={Pencil} block onClick={() => setEditing(r)}>
              Edit room
            </HmsButton>
            <HmsButton
              icon={Wrench}
              block
              variant={r.status === 'MAINTENANCE' ? 'primary' : 'secondary'}
              onClick={() => {
                const down = r.status !== 'MAINTENANCE';
                saveDepartmentRoom({ ...r, status: down ? 'MAINTENANCE' : 'AVAILABLE' });
                logChange(act.userName, 'ROOM', r.roomNumber, down ? 'Sent for maintenance' : 'Back in service');
                data.reload();
                act.notify(`${r.roomNumber} ${down ? 'out of service' : 'back in service'}`);
              }}
            >
              {r.status === 'MAINTENANCE' ? 'Back in service' : 'Out of service'}
            </HmsButton>
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="oa-rooms"
        title="Chambers & rooms"
        description="Who is in each room, what is in it, and what is out of service."
        total={all.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search room, name, doctor or nurse"
        headerAction={
          <HmsButton variant="primary" icon={Plus} onClick={() => setEditing('new')} title="Add room (Alt+N)" aria-keyshortcuts="Alt+N">
            Add
          </HmsButton>
        }
        pills={[
          { key: 'all', label: 'All', count: all.length },
          { key: 'unassigned', label: 'Free chambers', count: all.filter(match.unassigned).length },
          { key: 'maintenance', label: 'Maintenance', count: all.filter(match.maintenance).length, tone: 'amber' },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        onPrimary={(k) => {
          const r = all.find((x) => `r:${x.id}` === k);
          if (r) setEditing(r);
        }}
        primaryLabel="edit room"
        detailLabel="Room"
        emptyText="No rooms match this search or filter."
        renderDetail={renderDetail}
      />
      {editing && (
        <RoomModal
          data={data}
          room={editing === 'new' ? undefined : editing}
          userName={act.userName}
          onClose={() => setEditing(null)}
          onDone={(r) => {
            setEditing(null);
            data.reload();
            setSelected(`r:${r.id}`);
            act.notify(`${r.roomNumber} saved`);
          }}
        />
      )}
    </>
  );
};
