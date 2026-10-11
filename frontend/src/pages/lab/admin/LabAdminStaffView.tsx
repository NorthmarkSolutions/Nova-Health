// Lab Admin · Staff & credentials — pathologists, technologists and phlebotomists, their licences,
// today's shift and pending leave / swap requests.
import React, { useMemo, useState } from 'react';
import { Plus, Edit2, Check, X } from 'lucide-react';
import {
  HmsMasterDetail,
  HmsListRow,
  HmsBadge,
  HmsButton,
  HmsDetailHeader,
  HmsStatStrip,
  HmsDetailBody,
  HmsSection,
  HmsRow,
  HmsEmpty,
  HmsModal,
  HmsField,
  HmsToggle,
  HmsNotice,
  INPUT,
  HMS,
  initialsOf,
} from '../../../components/hms';
import {
  LabAdminStore,
  LabStaffMember,
  LabStaffCategory,
  ShiftCode,
  SHIFT_INFO,
  DAY_NAMES,
  staffStatusNow,
  shiftToday,
  credentialState,
  weeklyHours,
  daysUntil,
  fmtDate,
  fmtShort,
  fmtStamp,
  todayIndex,
} from '../data/labAdminStore';
import { getHospitalStaff } from '../../admin/setup/organization/hospitalStaffStore';
import { LabAdminViewProps, STAFF_STATUS_TONE } from './labAdminUi';

const ROLES: { role: string; category: LabStaffCategory }[] = [
  { role: 'Consultant Pathologist', category: 'Pathologist' },
  { role: 'Hematopathologist', category: 'Pathologist' },
  { role: 'Clinical Biochemist', category: 'Pathologist' },
  { role: 'Lab In-Charge', category: 'Technologist' },
  { role: 'Sr. Lab Technologist', category: 'Technologist' },
  { role: 'Lab Technologist', category: 'Technologist' },
  { role: 'Phlebotomist', category: 'Phlebotomist' },
];

const SECTIONS = ['All sections', 'Hematology', 'Biochemistry', 'Chemistry', 'Hematology & Chemistry', 'Immunoassay', 'Microbiology', 'Blood gas / ER', 'Histopathology', 'Blood Bank', 'OPD collection', 'Ward rounds'];

const CATEGORY_ORDER: Record<LabStaffCategory, number> = { Pathologist: 0, Technologist: 1, Phlebotomist: 2 };

const PROFILE_FIELDS: (keyof LabStaffMember)[] = ['name', 'code', 'role', 'section', 'qualification', 'credentialName', 'credentialExpiry', 'phone', 'email'];

const profileCompletion = (s: LabStaffMember) => {
  const fields = s.category === 'Pathologist' ? [...PROFILE_FIELDS, 'licenceNumber' as const] : PROFILE_FIELDS;
  const filled = fields.filter((f) => String(s[f] ?? '').trim()).length;
  return Math.round((filled / fields.length) * 100);
};

type Draft = Omit<LabStaffMember, 'id'> & { defaultShift: ShiftCode };

const emptyDraft = (): Draft => ({
  name: '',
  code: '',
  role: 'Lab Technologist',
  category: 'Technologist',
  section: 'Biochemistry',
  qualification: '',
  licenceNumber: '',
  credentialName: 'Bench competency assessment',
  credentialExpiry: '',
  nablTrained: false,
  phone: '',
  email: '',
  bench: '',
  joinedOn: '',
  suspended: false,
  defaultShift: 'M',
});

export const LabAdminStaffView: React.FC<LabAdminViewProps> = ({ data, by, notify, onNavigateTab, newSignal, initialFilter }) => {
  const { state } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [formError, setFormError] = useState('');

  const pendingFor = (id: string) => state.requests.filter((r) => r.status === 'Pending' && (r.staffId === id || r.withStaffId === id));

  const openAdd = () => {
    setFormError('');
    setEditing({ id: null, draft: emptyDraft() });
  };

  // Alt+N from the shell opens "Add staff"
  const [seenSignal, setSeenSignal] = useState(newSignal);
  if (newSignal !== seenSignal) {
    setSeenSignal(newSignal);
    if (newSignal > 0) openAdd();
  }
  const openEdit = (id: string) => {
    const s = state.staff.find((m) => m.id === id);
    if (!s) return;
    setFormError('');
    setEditing({ id, draft: { ...emptyDraft(), ...s, defaultShift: 'M' } });
  };

  const staff = useMemo(() => [...state.staff].sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] || a.name.localeCompare(b.name)), [state.staff]);

  const filters: Record<string, (s: LabStaffMember) => boolean> = {
    all: () => true,
    Pathologist: (s) => s.category === 'Pathologist',
    Technologist: (s) => s.category === 'Technologist',
    Phlebotomist: (s) => s.category === 'Phlebotomist',
    credentials: (s) => ['expired', 'expiring'].includes(credentialState(s)),
    requests: (s) => pendingFor(s.id).length > 0,
  };
  const q = search.trim().toLowerCase();
  const visible = staff.filter((s) => filters[pill](s) && (!q || [s.name, s.code, s.role, s.section].some((v) => v.toLowerCase().includes(q))));

  const pills = [
    { key: 'all', label: 'All', count: staff.length },
    { key: 'Pathologist', label: 'Pathologists', count: staff.filter(filters.Pathologist).length },
    { key: 'Technologist', label: 'Technologists', count: staff.filter(filters.Technologist).length },
    { key: 'Phlebotomist', label: 'Phlebotomists', count: staff.filter(filters.Phlebotomist).length },
    { key: 'credentials', label: 'Credentials due', count: staff.filter(filters.credentials).length, tone: 'amber' as const },
    { key: 'requests', label: 'Requests', count: staff.filter(filters.requests).length, tone: 'amber' as const },
  ];

  const rows: HmsListRow[] = visible.map((s) => {
    const status = staffStatusNow(state, s);
    const code = shiftToday(state, s.id);
    const cred = credentialState(s);
    const d = daysUntil(s.credentialExpiry);
    return {
      key: s.id,
      title: s.name,
      badge: <HmsBadge tone={STAFF_STATUS_TONE[status]}>{status}</HmsBadge>,
      sub: (
        <>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{s.code}</span> · {s.role}
        </>
      ),
      metaLeft: SHIFT_INFO[code].working ? `${SHIFT_INFO[code].label} ${SHIFT_INFO[code].hours}` : SHIFT_INFO[code].label,
      metaRight:
        cred === 'expired' ? (
          <span style={{ color: '#dc2626', fontWeight: 600 }}>Credential expired</span>
        ) : cred === 'expiring' ? (
          <span style={{ color: '#b45309', fontWeight: 600 }}>Renew in {d} day{d === 1 ? '' : 's'}</span>
        ) : pendingFor(s.id).length ? (
          <span style={{ color: '#b45309', fontWeight: 600 }}>{pendingFor(s.id).length} request pending</span>
        ) : (
          s.section
        ),
      progress: { pct: profileCompletion(s), doneLabel: 'Profile complete' },
    };
  });

  const decide = (id: string, approve: boolean, name: string) => {
    LabAdminStore.decideRequest(id, approve, by);
    notify(approve ? `Approved request for ${name}. Roster updated — publish to notify staff.` : `Rejected request for ${name}.`);
  };

  const renderDetail = (key: string | null) => {
    const s = state.staff.find((m) => m.id === key);
    if (!s) return <HmsEmpty>Select a staff member to see their shift, credentials and requests.</HmsEmpty>;
    const status = staffStatusNow(state, s);
    const cells = state.roster.cells[s.id] || (Array(7).fill('O') as ShiftCode[]);
    const hours = weeklyHours(cells);
    const cred = credentialState(s);
    const d = daysUntil(s.credentialExpiry);
    const pct = profileCompletion(s);
    const requests = state.requests.filter((r) => r.staffId === s.id || r.withStaffId === s.id).slice(0, 6);
    const history = state.events.filter((e) => e.text.includes(s.name)).slice(0, 6);
    const nameOf = (id?: string) => state.staff.find((m) => m.id === id)?.name || '—';
    const code = shiftToday(state, s.id);
    return (
      <>
        <HmsDetailHeader
          avatar={initialsOf(s.name)}
          title={s.name}
          badge={<HmsBadge tone={STAFF_STATUS_TONE[status]}>{status}</HmsBadge>}
          subtitle={`${s.role} · ${s.code} · ${s.section}`}
          actions={
            <HmsButton icon={Edit2} onClick={() => openEdit(s.id)} title="Edit profile (Enter on the selected row)">
              {pct >= 100 ? 'Edit profile' : 'Complete profile'}
            </HmsButton>
          }
        />
        <HmsStatStrip
          items={[
            { label: 'Today', value: SHIFT_INFO[code].label, note: SHIFT_INFO[code].hours || (code === 'L' ? 'Approved leave' : 'Not rostered') },
            { label: 'This week', value: `${hours} h`, note: hours > 48 ? 'Over 48 h — overtime' : `${cells.filter((c) => SHIFT_INFO[c].working).length} shifts`, tone: hours > 48 ? 'amber' : 'default' },
            {
              label: 'Credential',
              value: s.credentialExpiry ? fmtShort(s.credentialExpiry) : 'Not recorded',
              note: cred === 'expired' ? 'Expired' : cred === 'expiring' ? `Renew in ${d} day${d === 1 ? '' : 's'}` : s.credentialName,
              tone: cred === 'expired' ? 'red' : cred === 'expiring' ? 'amber' : cred === 'none' ? 'amber' : 'green',
            },
            { label: 'NABL training', value: s.nablTrained ? 'Completed' : 'Pending', tone: s.nablTrained ? 'green' : 'amber' },
          ]}
        />
        <HmsDetailBody>
          {cred === 'expired' && <HmsNotice tone="red">{s.credentialName} expired on {fmtDate(s.credentialExpiry)}. Do not roster on the bench until renewed.</HmsNotice>}
          {s.suspended && <HmsNotice tone="red">Suspended — excluded from the roster and coverage checks.</HmsNotice>}

          <HmsSection
            title="This week"
            right={
              <HmsButton size="sm" variant="ghost" onClick={() => onNavigateTab('scheduling')}>
                Open duty scheduling
              </HmsButton>
            }
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px', padding: '12px 14px' }}>
              {cells.map((c, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: '8px',
                    padding: '8px 4px',
                    textAlign: 'center',
                    border: `1px solid ${i === todayIndex() ? HMS.primaryBorder : HMS.border}`,
                    background: c === 'L' ? '#fffbeb' : SHIFT_INFO[c].working ? HMS.primaryTint : '#ffffff',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: i === todayIndex() ? HMS.primaryStrong : HMS.textSecondary }}>{DAY_NAMES[i]}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: c === 'L' ? '#b45309' : SHIFT_INFO[c].working ? HMS.primaryStrong : HMS.textMuted, marginTop: '2px' }}>{SHIFT_INFO[c].label}</div>
                  <div style={{ fontSize: '12px', color: HMS.textSecondary }}>{SHIFT_INFO[c].hours || ' '}</div>
                </div>
              ))}
            </div>
          </HmsSection>

          <HmsSection title="Leave & swap requests">
            {requests.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No requests this week.</div>
            ) : (
              requests.map((r, i) => (
                <HmsRow
                  key={r.id}
                  last={i === requests.length - 1}
                  label={`${r.type} · ${r.days.map((d2) => DAY_NAMES[d2]).join(', ')}${r.withStaffId ? ` with ${nameOf(r.staffId === s.id ? r.withStaffId : r.staffId)}` : ''}`}
                  hint={`${r.reason} · raised ${fmtStamp(r.raisedAt)}`}
                  value={
                    r.status === 'Pending' && r.staffId === s.id ? (
                      <span style={{ display: 'flex', gap: '8px' }}>
                        <HmsButton size="sm" variant="danger" icon={X} onClick={() => decide(r.id, false, s.name)}>
                          Reject
                        </HmsButton>
                        <HmsButton size="sm" variant="primary" icon={Check} onClick={() => decide(r.id, true, s.name)}>
                          Approve
                        </HmsButton>
                      </span>
                    ) : (
                      <HmsBadge tone={r.status === 'Approved' ? 'green' : r.status === 'Rejected' ? 'red' : 'amber'}>{r.status}</HmsBadge>
                    )
                  }
                />
              ))
            )}
          </HmsSection>

          <HmsSection title="Credentials & compliance">
            <HmsRow label={s.credentialName} hint={s.credentialExpiry ? `Valid to ${fmtDate(s.credentialExpiry)}` : 'Expiry date not recorded'} value={<HmsBadge tone={cred === 'expired' ? 'red' : cred === 'valid' ? 'green' : 'amber'}>{cred === 'expired' ? 'Expired' : cred === 'expiring' ? 'Due' : cred === 'valid' ? 'Valid' : 'Missing'}</HmsBadge>} />
            <HmsRow label="Qualification" value={s.qualification || '—'} />
            {s.category === 'Pathologist' && <HmsRow label="Medical Council licence" value={s.licenceNumber || '—'} />}
            <HmsRow label="NABL quality training" value={<HmsBadge tone={s.nablTrained ? 'green' : 'amber'}>{s.nablTrained ? 'Completed' : 'Pending'}</HmsBadge>} last />
          </HmsSection>

          <HmsSection title="Contact">
            <HmsRow label="Phone" value={s.phone || '—'} />
            <HmsRow label="Email" value={s.email || '—'} />
            <HmsRow label="Bench / station" value={s.bench || '—'} last />
          </HmsSection>

          <HmsSection title="Recent changes">
            {history.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No changes recorded.</div>
            ) : (
              history.map((e, i) => <HmsRow key={e.at + i} label={e.text} hint={`${fmtStamp(e.at)} · ${e.by}`} last={i === history.length - 1} />)
            )}
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  const saveDraft = () => {
    if (!editing) return;
    const d = editing.draft;
    if (!d.name.trim() || !d.code.trim()) {
      setFormError('Name and employee code are required.');
      return;
    }
    if (state.staff.some((m) => m.code.toUpperCase() === d.code.trim().toUpperCase() && m.id !== editing.id)) {
      setFormError(`Employee code ${d.code.toUpperCase()} is already used.`);
      return;
    }
    const { defaultShift, ...member } = d;
    const clean = { ...member, name: d.name.trim(), code: d.code.trim().toUpperCase() };
    if (editing.id) {
      LabAdminStore.updateStaff(editing.id, clean, by);
      notify(`Saved ${clean.name}.`);
    } else {
      const id = LabAdminStore.addStaff(clean, defaultShift, by);
      setSelected(id);
      notify(`${clean.name} added to the lab team and rostered Mon–Fri ${SHIFT_INFO[defaultShift].label.toLowerCase()}. Publish the roster to notify them.`);
    }
    setEditing(null);
  };

  const setDraft = (patch: Partial<Draft>) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e));
  const hospitalPool = useMemo(() => getHospitalStaff(), []);

  return (
    <>
      <HmsMasterDetail
        listId="lab-staff"
        title="Staff & credentials"
        description="Everyone working in the lab, with today's shift, licence status and requests waiting for you."
        total={staff.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search name, ID, role or section"
        pills={pills}
        activePill={pill}
        onPill={setPill}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="edit profile"
        onPrimary={openEdit}
        headerAction={
          <HmsButton variant="primary" icon={Plus} onClick={openAdd} title="Add staff (Alt+N)" aria-keyshortcuts="Alt+N">
            Add staff
          </HmsButton>
        }
        detailLabel="Staff member"
        renderDetail={renderDetail}
      />

      {editing && (
        <HmsModal
          title={editing.id ? `Edit ${editing.draft.name || 'staff member'}` : 'Add lab staff member'}
          description="Role, section, credentials and contact details. Hospital Admin verifies uploaded documents."
          onClose={() => setEditing(null)}
          width={680}
          footer={
            <>
              <HmsButton onClick={() => setEditing(null)}>Cancel</HmsButton>
              <HmsButton variant="primary" icon={Check} onClick={saveDraft}>
                {editing.id ? 'Save changes' : 'Add staff member'}
              </HmsButton>
            </>
          }
        >
          {formError && <HmsNotice tone="red">{formError}</HmsNotice>}
          {!editing.id && hospitalPool.length > 0 && (
            <HmsField label="Fill from the hospital staff directory" hint="Optional — copies name, code and contact details.">
              <select
                style={INPUT}
                defaultValue=""
                onChange={(e) => {
                  const p = hospitalPool.find((x) => x.id === e.target.value);
                  if (p) setDraft({ name: p.fullName || '', code: p.employeeCode || '', phone: p.phone || '', email: p.email || '', qualification: p.qualification || '' });
                }}
              >
                <option value="">— Choose a person —</option>
                {hospitalPool.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} · {p.employeeCode} · {p.designation}
                  </option>
                ))}
              </select>
            </HmsField>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
            <HmsField label="Full name" required>
              <input style={INPUT} value={editing.draft.name} onChange={(e) => setDraft({ name: e.target.value })} placeholder="e.g. Suresh Nair" />
            </HmsField>
            <HmsField label="Employee code" required>
              <input style={INPUT} value={editing.draft.code} onChange={(e) => setDraft({ code: e.target.value.toUpperCase() })} placeholder="e.g. EMP-L-0420" />
            </HmsField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <HmsField label="Role" required>
              <select
                style={INPUT}
                value={editing.draft.role}
                onChange={(e) => {
                  const r = ROLES.find((x) => x.role === e.target.value)!;
                  setDraft({ role: r.role, category: r.category });
                }}
              >
                {ROLES.map((r) => (
                  <option key={r.role}>{r.role}</option>
                ))}
              </select>
            </HmsField>
            <HmsField label="Section">
              <select style={INPUT} value={editing.draft.section} onChange={(e) => setDraft({ section: e.target.value })}>
                {SECTIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </HmsField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <HmsField label="Qualification">
              <input style={INPUT} value={editing.draft.qualification} onChange={(e) => setDraft({ qualification: e.target.value })} placeholder="e.g. DMLT, B.Sc MLT, MD Pathology" />
            </HmsField>
            <HmsField label={editing.draft.category === 'Pathologist' ? 'Medical Council licence no.' : 'Licence no. (optional)'}>
              <input style={INPUT} value={editing.draft.licenceNumber || ''} onChange={(e) => setDraft({ licenceNumber: e.target.value })} />
            </HmsField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
            <HmsField label="Credential tracked" hint="Licence, competency assessment or BLS.">
              <input style={INPUT} value={editing.draft.credentialName} onChange={(e) => setDraft({ credentialName: e.target.value })} />
            </HmsField>
            <HmsField label="Credential valid to">
              <input type="date" style={INPUT} value={editing.draft.credentialExpiry || ''} onChange={(e) => setDraft({ credentialExpiry: e.target.value })} />
            </HmsField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <HmsField label="Phone">
              <input style={INPUT} value={editing.draft.phone || ''} onChange={(e) => setDraft({ phone: e.target.value })} placeholder="+91" />
            </HmsField>
            <HmsField label="Email">
              <input type="email" style={INPUT} value={editing.draft.email || ''} onChange={(e) => setDraft({ email: e.target.value })} />
            </HmsField>
            <HmsField label="Bench / station">
              <input style={INPUT} value={editing.draft.bench || ''} onChange={(e) => setDraft({ bench: e.target.value })} placeholder="e.g. Bench 2" />
            </HmsField>
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
            {!editing.id && (
              <HmsField label="Roster Mon–Fri on">
                <select style={{ ...INPUT, width: '200px' }} value={editing.draft.defaultShift} onChange={(e) => setDraft({ defaultShift: e.target.value as ShiftCode })}>
                  {(['M', 'D', 'E', 'N', 'OC'] as ShiftCode[]).map((c) => (
                    <option key={c} value={c}>
                      {SHIFT_INFO[c].label} {SHIFT_INFO[c].hours}
                    </option>
                  ))}
                </select>
              </HmsField>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: HMS.text }}>
              <HmsToggle checked={editing.draft.nablTrained} onChange={(v) => setDraft({ nablTrained: v })} label="NABL quality training completed" />
              NABL quality training completed
            </label>
            {editing.id && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: HMS.text }}>
                <HmsToggle checked={!!editing.draft.suspended} onChange={(v) => setDraft({ suspended: v })} label="Suspended" />
                Suspended
              </label>
            )}
          </div>
        </HmsModal>
      )}
    </>
  );
};

export default LabAdminStaffView;
