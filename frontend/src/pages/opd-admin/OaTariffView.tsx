// OPD Admin — fees & tariffs. What the front desk charges: registration and triage fees, each doctor's consultation /
// follow-up / emergency fee, day-care bed rates and chamber facility fees. Every change is written to the audit log
// with the old and new value; the front desk uses the new fee for the next token.
import React, { useState } from 'react';
import { IndianRupee, Pencil } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, INPUT } from '../../components/hms';
import { useCurrency } from '../../config/currency';
import { DepartmentTariffMaster } from '../../types';
import { saveDepartmentTariffMaster } from '../department/departmentWorkspaceStore';
import { OpdAdminActions, OpdAdminData, logChange } from './opdAdminData';

export interface OaTariffViewProps {
  data: OpdAdminData;
  act: OpdAdminActions;
  initialFilter?: string;
}

const PILLS = ['doctors', 'desk', 'beds', 'rooms', 'all'];
type Field = { key: string; label: string; value: number | undefined; required?: boolean };
interface Item {
  key: string;
  group: 'doctors' | 'desk' | 'beds' | 'rooms';
  title: string;
  sub: string;
  fields: Field[];
  apply: (t: DepartmentTariffMaster, v: Record<string, number | undefined>) => DepartmentTariffMaster;
}
const GROUP: Record<Item['group'], string> = { doctors: 'Consultation fee', desk: 'Desk fee', beds: 'Day-care bed', rooms: 'Room fee' };

const itemsOf = (t: DepartmentTariffMaster): Item[] => [
  {
    key: 'desk:registration',
    group: 'desk',
    title: 'Registration fee (first visit)',
    sub: 'Charged once when a new patient gets a UHID',
    fields: [{ key: 'v', label: 'Fee', value: t.intakeRegistrationFee, required: true }],
    apply: (m, v) => ({ ...m, intakeRegistrationFee: v.v ?? 0 }),
  },
  {
    key: 'desk:triage',
    group: 'desk',
    title: 'Triage & vitals fee',
    sub: 'Added to each OPD visit',
    fields: [{ key: 'v', label: 'Fee', value: t.triageVitalsFee, required: true }],
    apply: (m, v) => ({ ...m, triageVitalsFee: v.v ?? 0 }),
  },
  ...t.doctorTariffs.map<Item>((d) => ({
    key: `doc:${d.doctorId}`,
    group: 'doctors',
    title: d.doctorName,
    sub: `${d.specialization || d.designation} · ${d.employeeCode || ''}`.replace(/ · $/, ''),
    fields: [
      { key: 'standard', label: 'New visit', value: d.standardFee, required: true },
      { key: 'followUp', label: 'Follow-up', value: d.followUpFee },
      { key: 'emergency', label: 'Emergency', value: d.emergencyFee },
    ],
    apply: (m, v) => ({ ...m, doctorTariffs: m.doctorTariffs.map((x) => (x.doctorId === d.doctorId ? { ...x, standardFee: v.standard ?? x.standardFee, followUpFee: v.followUp, emergencyFee: v.emergency, lastUpdated: new Date().toISOString() } : x)) }),
  })),
  ...t.wardTariffs.map<Item>((w) => ({
    key: `ward:${w.wardId}`,
    group: 'beds',
    title: w.wardName,
    sub: `${w.totalBeds} beds`,
    fields: [
      { key: 'daily', label: 'Per day', value: w.dailyRate, required: true },
      { key: 'hourly', label: 'Per hour (day-care)', value: w.hourlyRate },
      { key: 'nursing', label: 'Nursing per day', value: w.nursingChargePerDay },
    ],
    apply: (m, v) => ({ ...m, wardTariffs: m.wardTariffs.map((x) => (x.wardId === w.wardId ? { ...x, dailyRate: v.daily ?? x.dailyRate, hourlyRate: v.hourly, nursingChargePerDay: v.nursing } : x)) }),
  })),
  ...t.roomTariffs.map<Item>((r) => ({
    key: `room:${r.roomId}`,
    group: 'rooms',
    title: `${r.roomNumber} · ${r.roomName}`,
    sub: r.type,
    fields: [
      { key: 'facility', label: 'Facility fee / visit', value: r.facilityFee, required: true },
      { key: 'hourly', label: 'Procedure per hour', value: r.hourlyProcedureRate },
    ],
    apply: (m, v) => ({ ...m, roomTariffs: m.roomTariffs.map((x) => (x.roomId === r.roomId ? { ...x, facilityFee: v.facility ?? x.facilityFee, hourlyProcedureRate: v.hourly } : x)) }),
  })),
];

export const OaTariffView: React.FC<OaTariffViewProps> = ({ data, act, initialFilter }) => {
  const { format } = useCurrency();
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'doctors');
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');

  const items = itemsOf(data.tariff);
  const q = search.trim().toLowerCase();
  const list = items.filter((i) => (pill === 'all' || i.group === pill) && (!q || [i.title, i.sub].some((v) => v.toLowerCase().includes(q))));
  const money = (v?: number) => (v === undefined || v === null ? '—' : format(v));
  const historyOf = (i: Item) => data.log.filter((l) => l.kind === 'TARIFF' && l.subject === i.title);
  const rows: HmsListRow[] = list.map((i) => ({
    key: i.key,
    title: i.title,
    badge: <HmsBadge tone="gray">{GROUP[i.group]}</HmsBadge>,
    sub: i.sub,
    metaLeft: i.fields.map((f) => `${f.label} ${money(f.value)}`).join(' · '),
    metaRight: historyOf(i)[0] ? `Changed ${new Date(historyOf(i)[0].at).toLocaleDateString()}` : undefined,
  }));

  const open = (i: Item) => {
    setEditing(i);
    setVals(Object.fromEntries(i.fields.map((f) => [f.key, f.value === undefined || f.value === null ? '' : String(f.value)])));
    setReason('');
  };

  const renderDetail = (key: string | null) => {
    const i = items.find((x) => x.key === key);
    if (!i) return <HmsEmpty>Select a fee.</HmsEmpty>;
    const hist = historyOf(i);
    return (
      <>
        <HmsDetailHeader icon={IndianRupee} title={i.title} badge={<HmsBadge tone="gray">{GROUP[i.group]}</HmsBadge>} subtitle={i.sub} actions={<HmsButton icon={Pencil} onClick={() => open(i)}>Change</HmsButton>} />
        <HmsStatStrip items={[...i.fields.map((f) => ({ label: f.label, value: money(f.value) })), { label: 'Last changed', value: hist[0] ? new Date(hist[0].at).toLocaleDateString() : '—', note: hist[0]?.by }].slice(0, 4)} />
        <HmsDetailBody>
          {i.group === 'doctors' && <HmsNotice tone="blue">The front desk charges the new-visit fee for walk-ins, the follow-up fee for return visits, and the emergency fee for emergency tokens.</HmsNotice>}
          <HmsSection title={`Change history · ${hist.length}`}>
            {hist.length === 0 && <HmsRow label="No changes recorded from this desk" last />}
            {hist.map((h, n) => (
              <HmsRow key={h.id} label={new Date(h.at).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} value={h.change} hint={h.by} last={n === hist.length - 1} />
            ))}
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton variant="primary" icon={Pencil} block onClick={() => open(i)}>
            Change fee
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
  const valid = editing ? editing.fields.every((f) => (f.required ? num(vals[f.key] || '') !== undefined && Number(vals[f.key]) >= 0 : vals[f.key] === '' || Number(vals[f.key]) >= 0)) && reason.trim().length >= 3 : false;
  return (
    <>
      <HmsMasterDetail
        listId="oa-tariff"
        title="Fees & tariffs"
        description="What the OPD front desk charges. Every change is logged."
        total={items.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search doctor, ward, room or fee"
        pills={[
          { key: 'doctors', label: 'Doctors', count: items.filter((i) => i.group === 'doctors').length },
          { key: 'desk', label: 'Desk', count: items.filter((i) => i.group === 'desk').length },
          { key: 'beds', label: 'Day-care', count: items.filter((i) => i.group === 'beds').length },
          { key: 'rooms', label: 'Rooms', count: items.filter((i) => i.group === 'rooms').length },
          { key: 'all', label: 'All', count: items.length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        onPrimary={(k) => {
          const i = items.find((x) => x.key === k);
          if (i) open(i);
        }}
        primaryLabel="change fee"
        detailLabel="Fee"
        emptyText="No fees match this search or filter."
        renderDetail={renderDetail}
      />
      {editing && (
        <HmsModal
          title={`Change · ${editing.title}`}
          description="Applies to the next token or bill. Already-billed visits keep their fee."
          onClose={() => setEditing(null)}
          footer={
            <>
              <HmsButton onClick={() => setEditing(null)}>Cancel</HmsButton>
              <HmsButton
                variant="primary"
                icon={Pencil}
                disabled={!valid}
                onClick={() => {
                  const v = Object.fromEntries(editing.fields.map((f) => [f.key, num(vals[f.key] || '')]));
                  saveDepartmentTariffMaster({ ...editing.apply(data.tariff, v), updatedBy: act.userName });
                  const before = editing.fields.map((f) => `${f.label} ${money(f.value)}`).join(', ');
                  const after = editing.fields.map((f) => `${f.label} ${money(v[f.key])}`).join(', ');
                  logChange(act.userName, 'TARIFF', editing.title, `${after} (was ${before}) — ${reason.trim()}`, before, after);
                  const t = editing.title;
                  setEditing(null);
                  data.reload();
                  act.notify(`${t}: fee updated`);
                }}
              >
                Save fee
              </HmsButton>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${editing.fields.length}, minmax(0, 1fr))`, gap: '12px' }}>
            {editing.fields.map((f) => (
              <HmsField key={f.key} label={f.label} htmlFor={`tf-${f.key}`} required={f.required}>
                <input id={`tf-${f.key}`} inputMode="decimal" style={INPUT} value={vals[f.key] || ''} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value.replace(/[^0-9.]/g, '') })} />
              </HmsField>
            ))}
          </div>
          <HmsField label="Reason for the change" htmlFor="tf-reason" required>
            <input id="tf-reason" style={INPUT} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Annual tariff revision approved by management" />
          </HmsField>
        </HmsModal>
      )}
    </>
  );
};
