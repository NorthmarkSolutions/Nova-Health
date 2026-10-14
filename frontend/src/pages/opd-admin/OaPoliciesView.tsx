// OPD Admin — department policies the front desk applies: the daily OPD capacity (warning when reached), whether
// walk-in tokens are allowed (emergencies always are), and the OPD operating hours shown to patients.
import React, { useState } from 'react';
import { Settings2, Save } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsField, HmsToggle, INPUT } from '../../components/hms';
import { saveDepartmentWorkspace } from '../department/departmentWorkspaceStore';
import { OpdAdminActions, OpdAdminData, isTodayTok, logChange } from './opdAdminData';

export interface OaPoliciesViewProps {
  data: OpdAdminData;
  act: OpdAdminActions;
}

type Key = 'capacity' | 'walkin' | 'hours';

const TITLE: Record<Key, string> = { capacity: 'Daily OPD capacity', walkin: 'Walk-in tokens', hours: 'OPD operating hours' };
const HINT: Record<Key, string> = { capacity: 'The front desk is warned when today’s tokens reach this number.', walkin: 'Whether the front desk may issue tokens without an appointment.', hours: 'The OPD timings patients are told.' };
const valueOf = (k: Key, data: OpdAdminData) => (k === 'capacity' ? (data.workspace.config.dailyCapacity ? `${data.workspace.config.dailyCapacity} / day` : 'No limit') : k === 'walkin' ? (data.workspace.config.isWalkInAllowed === false ? 'Off' : 'Allowed') : data.workspace.operatingHours || 'Not set');

const Editor: React.FC<{ k: Key; data: OpdAdminData; act: OpdAdminActions }> = ({ k, data, act }) => {
  const ws = data.workspace;
  const [cap, setCap] = useState(String(ws.config.dailyCapacity ?? ''));
  const [walkIn, setWalkIn] = useState(ws.config.isWalkInAllowed !== false);
  const [hours, setHours] = useState(ws.operatingHours || '');
  const today = data.queue.filter((t) => isTodayTok(t) && t.status !== 'CANCELLED').length;
  const hist = data.log.filter((l) => l.kind === 'POLICY' && l.subject === TITLE[k]);
  const dirty = k === 'capacity' ? cap !== String(ws.config.dailyCapacity ?? '') : k === 'walkin' ? walkIn !== (ws.config.isWalkInAllowed !== false) : hours !== (ws.operatingHours || '');
  const ok = k === 'capacity' ? cap === '' || Number(cap) > 0 : k === 'hours' ? hours.trim().length >= 3 : true;
  return (
    <>
      <HmsDetailHeader icon={Settings2} title={TITLE[k]} badge={<HmsBadge tone="blue">{valueOf(k, data)}</HmsBadge>} subtitle={HINT[k]} />
      <HmsStatStrip
        items={[
          { label: 'Current', value: valueOf(k, data) },
          { label: 'Tokens today', value: today, tone: k === 'capacity' && ws.config.dailyCapacity && today >= ws.config.dailyCapacity ? 'red' : 'default' },
          { label: 'Last changed', value: hist[0] ? new Date(hist[0].at).toLocaleDateString() : '—', note: hist[0]?.by },
          { label: 'Applies at', value: 'Front desk' },
        ]}
      />
      <HmsDetailBody>
        <HmsSection title="Setting" padded>
          {k === 'capacity' && (
            <HmsField label="Patients per day (whole OPD)" htmlFor="po-cap" hint="Leave empty for no limit. Each doctor also has their own capacity under Doctors.">
              <input id="po-cap" inputMode="numeric" style={{ ...INPUT, maxWidth: '200px' }} value={cap} onChange={(e) => setCap(e.target.value.replace(/\D/g, ''))} />
            </HmsField>
          )}
          {k === 'walkin' && <HmsToggle checked={walkIn} onChange={setWalkIn} label="Allow walk-in tokens (emergencies are always allowed)" showLabel />}
          {k === 'hours' && (
            <HmsField label="OPD hours" htmlFor="po-hours" hint="Shown to patients and on printed slips, e.g. Mon–Sat 09:00–17:00">
              <input id="po-hours" style={INPUT} value={hours} onChange={(e) => setHours(e.target.value)} />
            </HmsField>
          )}
        </HmsSection>
        {k === 'walkin' && !walkIn && <HmsNotice tone="amber">The front desk will only check in booked appointments and emergencies.</HmsNotice>}
        <HmsSection title={`Change history · ${hist.length}`}>
          {hist.length === 0 && <HmsRow label="No changes recorded from this desk" last />}
          {hist.map((h, n) => (
            <HmsRow key={h.id} label={new Date(h.at).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} value={h.change} hint={h.by} last={n === hist.length - 1} />
          ))}
        </HmsSection>
      </HmsDetailBody>
      <HmsDetailFooter>
        <HmsButton
          variant="primary"
          icon={Save}
          block
          disabled={!dirty || !ok}
          onClick={() => {
            const before = valueOf(k, data);
            const next = { ...ws, updatedAt: new Date().toISOString(), operatingHours: k === 'hours' ? hours.trim() : ws.operatingHours, config: { ...ws.config, dailyCapacity: k === 'capacity' ? (cap ? Number(cap) : undefined) : ws.config.dailyCapacity, isWalkInAllowed: k === 'walkin' ? walkIn : ws.config.isWalkInAllowed } };
            saveDepartmentWorkspace(next);
            const after = k === 'capacity' ? (cap ? `${cap} / day` : 'No limit') : k === 'walkin' ? (walkIn ? 'Allowed' : 'Off') : hours.trim();
            logChange(act.userName, 'POLICY', TITLE[k], `${before} → ${after}`, before, after);
            data.reload();
            act.notify(`${TITLE[k]}: ${after}`);
          }}
        >
          Save
        </HmsButton>
      </HmsDetailFooter>
    </>
  );
};

export const OaPoliciesView: React.FC<OaPoliciesViewProps> = ({ data, act }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const keys: Key[] = ['capacity', 'walkin', 'hours'];
  const q = search.trim().toLowerCase();
  const list = keys.filter((k) => !q || TITLE[k].toLowerCase().includes(q));
  const rows: HmsListRow[] = list.map((k) => ({ key: k, title: TITLE[k], badge: <HmsBadge tone={k === 'walkin' && data.workspace.config.isWalkInAllowed === false ? 'amber' : 'gray'}>{valueOf(k, data)}</HmsBadge>, sub: HINT[k] }));
  return (
    <HmsMasterDetail
      listId="oa-policies"
      title="Policies"
      description="Rules the OPD front desk applies."
      total={keys.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search policies"
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="edit policy"
      detailLabel="Policy"
      emptyText="No policies match this search."
      renderDetail={(key) => (key && keys.includes(key as Key) ? <Editor key={`${key}-${data.workspace.updatedAt}`} k={key as Key} data={data} act={act} /> : <HmsEmpty>Select a policy.</HmsEmpty>)}
    />
  );
};
