// Front Desk — day-care and observation beds (or the whole hospital). Allocate a clean bed to an OPD patient,
// move them, discharge (the bed goes to housekeeping) and mark a bed cleaned when housekeeping is done.
import React, { useState } from 'react';
import { BedDouble, UserPlus, ArrowRightLeft, LogOut, Sparkles } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsField, HmsTone, INPUT } from '../../components/hms';
import { patientJourneyService, FlatCampusBed } from '../../services/patientJourneyService';
import { opdActions } from '../../services/opdActions';
import { useCurrency } from '../../config/currency';
import { AllocateBedModal, TransferBedModal, ReasonModal } from './ReceptionModals';
import { DeskActions, ReceptionData, MONO, bedState, isDaycareBed } from './receptionData';

export interface RecBedsViewProps {
  data: ReceptionData;
  act: DeskActions;
  initialFilter?: string;
}

const STATE: Record<ReturnType<typeof bedState>, { label: string; tone: HmsTone }> = {
  available: { label: 'Available', tone: 'green' },
  occupied: { label: 'Occupied', tone: 'blue' },
  cleaning: { label: 'Needs cleaning', tone: 'amber' },
  reserved: { label: 'Reserved', tone: 'dark' },
  maintenance: { label: 'Maintenance', tone: 'gray' },
};
/** Stored as an ISO time by housekeeping, or as plain text by older records: show whichever is there. */
const cleanedAt = (v?: string) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};
const PILLS = ['all', 'available', 'occupied', 'cleaning', 'reserved'];

export const RecBedsView: React.FC<RecBedsViewProps> = ({ data, act, initialFilter }) => {
  const { format } = useCurrency();
  const [scope, setScope] = useState<'daycare' | 'all'>('daycare');
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [allocate, setAllocate] = useState<FlatCampusBed | null>(null);
  const [transfer, setTransfer] = useState<FlatCampusBed | null>(null);
  const [discharge, setDischarge] = useState<FlatCampusBed | null>(null);

  const beds = data.beds.filter((b) => (scope === 'daycare' ? isDaycareBed(b) : true));
  const q = search.trim().toLowerCase();
  const list = beds.filter((b) => (pill === 'all' || bedState(b) === pill) && (!q || [b.bed.bedNumber, b.roomNumber, b.wardName, b.buildingName, b.bed.inpatientDetails?.patientName, b.bed.inpatientDetails?.uhid].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = list.map((b) => {
    const s = STATE[bedState(b)];
    const occ = b.bed.inpatientDetails;
    return {
      key: `b:${b.bed.id}`,
      title: `${b.bed.bedNumber}${occ ? ` · ${occ.patientName}` : ''}`,
      badge: <HmsBadge tone={s.tone}>{s.label}</HmsBadge>,
      sub: `${b.wardName} · ${b.roomNumber || 'bay'}`,
      metaLeft: occ ? `Since ${occ.admissionDate?.slice(11) || occ.admissionDate}` : b.bed.bedType,
      metaRight: b.bed.dailyTariff ? `${format(b.bed.dailyTariff)}/day` : undefined,
    };
  });

  const done = (msg: string) => {
    setAllocate(null);
    setTransfer(null);
    setDischarge(null);
    data.reload();
    act.notify(msg);
  };

  const renderDetail = (key: string | null) => {
    const b = data.beds.find((x) => `b:${x.bed.id}` === key);
    if (!b) return <HmsEmpty>{beds.length ? 'Select a bed from the list.' : scope === 'daycare' ? 'No day-care or observation beds are set up. Show all hospital beds, or ask Admin to add a day-care ward.' : 'No beds are set up.'}</HmsEmpty>;
    const st = bedState(b);
    const occ = b.bed.inpatientDetails;
    return (
      <>
        <HmsDetailHeader icon={BedDouble} title={`${b.bed.bedNumber}${occ ? ` · ${occ.patientName}` : ''}`} badge={<HmsBadge tone={STATE[st].tone}>{STATE[st].label}</HmsBadge>} subtitle={`${b.buildingName} · ${b.floorName} · ${b.wardName} · ${b.roomNumber || 'bay'}`} />
        <HmsStatStrip
          items={[
            { label: 'Bed type', value: b.bed.bedType },
            { label: 'Rate', value: b.bed.dailyTariff ? `${format(b.bed.dailyTariff)}/day` : '—' },
            { label: 'Cleanliness', value: (b.bed.cleanlinessStatus || 'SANITIZED').replace(/_/g, ' ').toLowerCase(), tone: st === 'cleaning' ? 'amber' : 'default' },
            { label: 'Last cleaned', value: cleanedAt(b.bed.lastCleanedAt), note: b.bed.assignedCleaner },
          ]}
        />
        <HmsDetailBody>
          {st === 'cleaning' && <HmsNotice tone="amber">Waiting for housekeeping. Mark it cleaned once the bed is ready, then it can be allocated.</HmsNotice>}
          {occ ? (
            <HmsSection title="Patient">
              <HmsRow label="UHID" value={<span style={MONO}>{occ.uhid}</span>} />
              <HmsRow label="Admission no." value={<span style={MONO}>{occ.ipdAdmissionNo}</span>} hint={occ.admissionDate} />
              <HmsRow label="Reason" value={occ.diagnosis || '—'} />
              <HmsRow label="Doctor" value={occ.primaryDoctor?.name || '—'} />
              <HmsRow label="Nurse" value={occ.primaryNurse?.name || '—'} last />
            </HmsSection>
          ) : (
            <HmsSection title="Bed">
              <HmsRow label="Ward" value={b.wardName} hint={b.wardType} />
              <HmsRow label="Note" value={b.bed.notes || '—'} last />
            </HmsSection>
          )}
        </HmsDetailBody>
        <HmsDetailFooter>
          {st === 'available' && (
            <HmsButton variant="primary" icon={UserPlus} block onClick={() => setAllocate(b)}>
              Allocate to a patient
            </HmsButton>
          )}
          {st === 'occupied' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
              <HmsButton icon={ArrowRightLeft} block onClick={() => setTransfer(b)}>
                Move to another bed
              </HmsButton>
              <HmsButton variant="primary" icon={LogOut} block onClick={() => setDischarge(b)}>
                Discharge
              </HmsButton>
            </div>
          )}
          {st === 'cleaning' && (
            <HmsButton
              variant="primary"
              icon={Sparkles}
              block
              onClick={() => {
                void opdActions.bedCleaned(b, act.userName).then((ok) => ok && done(`${b.bed.bedNumber} is clean and available`));
              }}
            >
              Mark cleaned
            </HmsButton>
          )}
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="rec-beds"
        title="Day-care beds"
        description="Observation and day-care beds for OPD patients."
        total={beds.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search bed, room, ward or patient"
        pills={[
          { key: 'all', label: 'All', count: beds.length },
          { key: 'available', label: 'Available', count: beds.filter((b) => bedState(b) === 'available').length },
          { key: 'occupied', label: 'Occupied', count: beds.filter((b) => bedState(b) === 'occupied').length },
          { key: 'cleaning', label: 'Cleaning', count: beds.filter((b) => bedState(b) === 'cleaning').length, tone: 'amber' },
          { key: 'reserved', label: 'Reserved', count: beds.filter((b) => bedState(b) === 'reserved').length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        leftExtra={
          <HmsField label="Show" htmlFor="bed-scope">
            <select id="bed-scope" style={INPUT} value={scope} onChange={(e) => { setScope(e.target.value as 'daycare' | 'all'); setSelected(null); }}>
              <option value="daycare">Day-care & observation beds</option>
              <option value="all">All hospital beds</option>
            </select>
          </HmsField>
        }
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open bed"
        detailLabel="Bed"
        emptyText="No beds match this search or filter."
        renderDetail={renderDetail}
      />
      {allocate && <AllocateBedModal bed={allocate} data={data} onClose={() => setAllocate(null)} onDone={(p) => done(`${allocate.bed.bedNumber} allocated to ${p}`)} />}
      {transfer && <TransferBedModal bed={transfer} data={data} onClose={() => setTransfer(null)} onDone={(to) => done(`Moved to ${to}`)} />}
      {discharge && (
        <ReasonModal
          title={`Discharge ${discharge.bed.inpatientDetails?.patientName || 'patient'} from ${discharge.bed.bedNumber}?`}
          description="The bed goes to housekeeping for cleaning. Bed charges are settled by Billing."
          label="Discharge outcome"
          confirm="Discharge"
          options={['Treatment completed — home', 'Referred for admission (IPD)', 'Left against medical advice', 'Transferred out']}
          onClose={() => setDischarge(null)}
          onConfirm={(reason) => {
            const b = discharge;
            setDischarge(null);
            void opdActions.dischargeBed(b, reason).then((ok) => ok && done(`${b.bed.bedNumber} discharged · ${reason.toLowerCase()}`));
          }}
        />
      )}
    </>
  );
};
