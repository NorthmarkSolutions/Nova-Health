// Lab Admin · Department settings — saved to the Lab Admin store with who/when, one section at a time.
import React, { useEffect, useMemo, useState } from 'react';
import { Settings, Save, RotateCcw } from 'lucide-react';
import {
  HmsMasterDetail,
  HmsListRow,
  HmsBadge,
  HmsButton,
  HmsDetailHeader,
  HmsDetailBody,
  HmsDetailFooter,
  HmsSection,
  HmsRow,
  HmsField,
  HmsToggle,
  HmsEmpty,
  HmsNotice,
  INPUT,
  TEXTAREA,
  HMS,
} from '../../../components/hms';
import { LabAdminStore, LabSettings, fmtDate, fmtStamp } from '../data/labAdminStore';
import { LabAdminViewProps } from './labAdminUi';

type SectionKey = 'general' | 'hours' | 'workflow' | 'notifications' | 'printing' | 'integrations' | 'history';

const SECTION_FIELDS: Record<SectionKey, (keyof LabSettings)[]> = {
  general: ['deptName', 'location', 'hod', 'intercom', 'nablNo', 'nablValidTo'],
  hours: ['hours'],
  workflow: ['batchSignoff', 'autoFlag', 'retestRoute', 'criticalAckWindow', 'escalateTo', 'barcodeFormat', 'rejectionReasons'],
  notifications: ['notifyCriticalInApp', 'notifyCriticalSms', 'notifyIpdNurse', 'notifyDoctorAssistant', 'reportReadySms'],
  printing: ['reportTemplate', 'digitalSignature', 'showPreviousResult', 'labelPrinter'],
  integrations: [],
  history: [],
};

const SECTION_META: Record<SectionKey, { title: string; description: string }> = {
  general: { title: 'General', description: 'Shown on reports, labels and the department directory' },
  hours: { title: 'Operating hours', description: 'Used by Reception when booking tests and by Home Collection' },
  workflow: { title: 'Workflow rules', description: 'How orders move between technician, pathologist and the hospital' },
  notifications: { title: 'Notifications', description: 'Who gets told what, outside the lab' },
  printing: { title: 'Reports & printing', description: 'Layout and signatures on the final lab report' },
  integrations: { title: 'Integrations', description: 'Connections to analyzers and Billing — status for reference' },
  history: { title: 'Change history', description: 'Every admin change in the Lab, newest first' },
};

const ToggleRow: React.FC<{ label: string; hint?: string; checked: boolean; onChange?: (v: boolean) => void; locked?: boolean; last?: boolean }> = ({ label, hint, checked, onChange, locked, last }) => (
  <HmsRow
    label={label}
    hint={hint}
    last={last}
    value={locked ? <HmsBadge tone="gray">Locked</HmsBadge> : <HmsToggle checked={checked} onChange={(v) => onChange?.(v)} label={label} />}
  />
);

export const LabAdminSettingsView: React.FC<LabAdminViewProps> = ({ data, by, notify }) => {
  const { state, analyzers, tariffs } = data;
  const saved = state.settings;
  const [draft, setDraft] = useState<LabSettings>(saved);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>('general');

  // Pick up saves made elsewhere (another tab) when there are no local edits
  const dirtyFields = useMemo(() => (Object.keys(saved) as (keyof LabSettings)[]).filter((k) => k !== 'savedAt' && k !== 'savedBy' && JSON.stringify(saved[k]) !== JSON.stringify(draft[k])), [saved, draft]);
  useEffect(() => {
    if (!dirtyFields.length) setDraft(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const set = <K extends keyof LabSettings>(k: K, v: LabSettings[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const dirtyIn = (s: SectionKey) => SECTION_FIELDS[s].some((f) => dirtyFields.includes(f));
  const pathologists = state.staff.filter((s) => s.category === 'Pathologist' && !s.suspended);
  const lisOffline = analyzers.filter((a) => a.status === 'Offline').length;
  const labTariffs = Object.values(tariffs).filter((t) => !(t.code || '').toUpperCase().startsWith('RAD')).length;
  const pendingPrices = Object.keys(state.priceDrafts).length;

  const summary: Record<SectionKey, string> = {
    general: `${draft.deptName} · HOD ${draft.hod}`,
    hours: `${Object.values(draft.hours).filter(Boolean).length} of 4 services open`,
    workflow: `Critical ack ${draft.criticalAckWindow} · re-test to ${draft.retestRoute === 'general_queue' ? 'general queue' : 'technician'}`,
    notifications: `${[draft.notifyCriticalInApp, draft.notifyCriticalSms, draft.notifyIpdNurse, draft.notifyDoctorAssistant, draft.reportReadySms].filter(Boolean).length} of 5 on`,
    printing: draft.reportTemplate,
    integrations: `${analyzers.length} analyzers · ${labTariffs} tariffs`,
    history: `${state.events.length} change${state.events.length === 1 ? '' : 's'} recorded`,
  };

  const keys = Object.keys(SECTION_META) as SectionKey[];
  const q = search.trim().toLowerCase();
  const visible = keys.filter((k) => !q || `${SECTION_META[k].title} ${SECTION_META[k].description} ${summary[k]}`.toLowerCase().includes(q));
  const rows: HmsListRow[] = visible.map((k) => ({
    key: k,
    title: SECTION_META[k].title,
    badge: dirtyIn(k) ? <HmsBadge tone="amber">Unsaved</HmsBadge> : k === 'integrations' && lisOffline ? <HmsBadge tone="red">{lisOffline} offline</HmsBadge> : undefined,
    sub: summary[k],
  }));

  const save = () => {
    if (!draft.deptName.trim()) {
      notify('Department name cannot be empty.', 'error');
      return;
    }
    LabAdminStore.saveSettings(draft, by);
    notify('Department settings saved. Technician and Pathologist workspaces use them from now on.');
  };
  const discard = () => {
    setDraft(saved);
    notify('Unsaved changes discarded.');
  };

  const renderForm = (k: SectionKey) => {
    switch (k) {
      case 'general':
        return (
          <HmsSection title="General" padded>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
              <HmsField label="Department name" required>
                <input style={INPUT} value={draft.deptName} onChange={(e) => set('deptName', e.target.value)} />
              </HmsField>
              <HmsField label="Department code" hint="Set by Hospital Admin">
                <input style={{ ...INPUT, background: HMS.subtle, color: HMS.textSecondary }} value="LAB" readOnly />
              </HmsField>
              <HmsField label="Location">
                <input style={INPUT} value={draft.location} onChange={(e) => set('location', e.target.value)} />
              </HmsField>
              <HmsField label="Head of department" hint="Pathologists in the lab team">
                <select style={INPUT} value={draft.hod} onChange={(e) => set('hod', e.target.value)}>
                  {!pathologists.some((p) => p.name === draft.hod) && <option value={draft.hod}>{draft.hod}</option>}
                  {pathologists.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} · {p.role}
                    </option>
                  ))}
                </select>
              </HmsField>
              <HmsField label="Intercom extension">
                <input style={INPUT} value={draft.intercom} onChange={(e) => set('intercom', e.target.value)} />
              </HmsField>
              <HmsField label="NABL accreditation no." hint={`Valid to ${fmtDate(draft.nablValidTo)}`}>
                <input style={INPUT} value={draft.nablNo} onChange={(e) => set('nablNo', e.target.value)} />
              </HmsField>
              <HmsField label="NABL valid to">
                <input type="date" style={INPUT} value={draft.nablValidTo} onChange={(e) => set('nablValidTo', e.target.value)} />
              </HmsField>
            </div>
          </HmsSection>
        );
      case 'hours':
        return (
          <HmsSection title="Operating hours">
            <ToggleRow label="OPD sample collection" hint="Mon–Sat · 07:00 – 20:00" checked={draft.hours.opd} onChange={(v) => set('hours', { ...draft.hours, opd: v })} />
            <ToggleRow label="Sunday collection" hint="Sun · 08:00 – 13:00" checked={draft.hours.sunday} onChange={(v) => set('hours', { ...draft.hours, sunday: v })} />
            <ToggleRow label="Emergency & STAT processing" hint="All days · 24 hours" checked={draft.hours.stat} onChange={(v) => set('hours', { ...draft.hours, stat: v })} />
            <ToggleRow label="Home collection" hint="Mon–Sat · 07:00 – 11:00" checked={draft.hours.home} onChange={(v) => set('hours', { ...draft.hours, home: v })} last />
          </HmsSection>
        );
      case 'workflow':
        return (
          <>
            <HmsSection title="Sign-off">
              <ToggleRow label="Pathologist sign-off for every result" hint="Nothing reaches the doctor, billing or patient record without sign-off. Required for NABL." checked locked />
              <ToggleRow label="Batch sign-off for normal results" hint="Let pathologists approve fully-normal results in one step." checked={draft.batchSignoff} onChange={(v) => set('batchSignoff', v)} />
              <ToggleRow label="Auto-flag out-of-range values" hint="Amber for abnormal and red for critical as the technician types, using the Test Catalog ranges." checked={draft.autoFlag} onChange={(v) => set('autoFlag', v)} last />
            </HmsSection>
            <HmsSection title="Re-tests & critical values" padded>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
                <HmsField label="When a pathologist requests a re-test">
                  <select style={INPUT} value={draft.retestRoute} onChange={(e) => set('retestRoute', e.target.value as LabSettings['retestRoute'])}>
                    <option value="technician_queue">Original technician, tagged “Returned” in the queue</option>
                    <option value="technician_only">Original technician only</option>
                    <option value="general_queue">General test queue</option>
                  </select>
                </HmsField>
                <HmsField label="Critical acknowledgement window">
                  <select style={INPUT} value={draft.criticalAckWindow} onChange={(e) => set('criticalAckWindow', e.target.value)}>
                    {['15 minutes', '30 minutes', '45 minutes', '60 minutes'].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </HmsField>
                <HmsField label="If the doctor has not acknowledged, escalate to">
                  <select style={INPUT} value={draft.escalateTo} onChange={(e) => set('escalateTo', e.target.value)}>
                    {['Department HOD, then Medical Superintendent', 'Duty Consultant', 'Chief Medical Officer'].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </HmsField>
                <HmsField label="Specimen barcode format">
                  <select style={INPUT} value={draft.barcodeFormat} onChange={(e) => set('barcodeFormat', e.target.value)}>
                    {['LAB-YYMM-#### · Code 128', 'UHID-TEST-#### · Code 39', 'QR Code (2D DataMatrix)'].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </HmsField>
              </div>
              <div style={{ marginTop: '16px' }}>
                <HmsField label="Sample rejection reasons" hint="Comma separated — shown to technicians when rejecting a sample.">
                  <textarea style={TEXTAREA} value={draft.rejectionReasons} onChange={(e) => set('rejectionReasons', e.target.value)} />
                </HmsField>
              </div>
            </HmsSection>
          </>
        );
      case 'notifications':
        return (
          <HmsSection title="Notifications">
            <ToggleRow label="Critical values · in-app alert to the ordering doctor" hint="Must be acknowledged within the window above." checked={draft.notifyCriticalInApp} onChange={(v) => set('notifyCriticalInApp', v)} />
            <ToggleRow label="Critical values · SMS to the ordering doctor" checked={draft.notifyCriticalSms} onChange={(v) => set('notifyCriticalSms', v)} />
            <ToggleRow label="Notify ward nurse for IPD patients" hint="When a report is signed off for an admitted patient." checked={draft.notifyIpdNurse} onChange={(v) => set('notifyIpdNurse', v)} />
            <ToggleRow label="Status updates to Doctor Assistant" hint="Status only (collected, in progress, ready). No clinical values." checked={draft.notifyDoctorAssistant} onChange={(v) => set('notifyDoctorAssistant', v)} />
            <ToggleRow label="Report ready SMS to patient" hint="Sent with a secure download link after sign-off." checked={draft.reportReadySms} onChange={(v) => set('reportReadySms', v)} last />
          </HmsSection>
        );
      case 'printing':
        return (
          <HmsSection title="Reports & printing" padded>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
              <HmsField label="Report template">
                <select style={INPUT} value={draft.reportTemplate} onChange={(e) => set('reportTemplate', e.target.value)}>
                  {['NABL standard · A4', 'Compact summary · A4', 'Letterhead pre-printed · A4'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </HmsField>
              <HmsField label="Digital signature">
                <select style={INPUT} value={draft.digitalSignature} onChange={(e) => set('digitalSignature', e.target.value)}>
                  {['Signing pathologist + HOD', 'Signing pathologist only', 'Dual sign-off (Technician + Pathologist)'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </HmsField>
              <HmsField label="Show previous result">
                <select style={INPUT} value={draft.showPreviousResult} onChange={(e) => set('showPreviousResult', e.target.value)}>
                  {['Last 1 result with date', 'Last 3 results (trend table)', 'Do not show past results'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </HmsField>
              <HmsField label="Label printer">
                <select style={INPUT} value={draft.labelPrinter} onChange={(e) => set('labelPrinter', e.target.value)}>
                  {['Zebra ZD421 · Bench 2', 'TSC TE200 · Reception', 'Brother TD-4550DN · Phlebotomy'].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </HmsField>
            </div>
          </HmsSection>
        );
      case 'integrations':
        return (
          <HmsSection title="Integrations">
            <HmsRow label="Analyzers registered" hint="Status reported by the Technician workbench" value={<HmsBadge tone={lisOffline ? 'red' : 'green'}>{lisOffline ? `${analyzers.length - lisOffline} of ${analyzers.length} online` : `${analyzers.length} online`}</HmsBadge>} />
            <HmsRow label="Billing tariff master" hint={pendingPrices ? `${pendingPrices} draft price${pendingPrices === 1 ? '' : 's'} waiting to sync` : 'All lab prices synced'} value={<HmsBadge tone={pendingPrices ? 'amber' : 'green'}>{labTariffs} lab tariffs</HmsBadge>} />
            <HmsRow label="LIS middleware" hint="Managed by IT — connection health is not reported to the HMS yet" value={<HmsBadge tone="gray">Not monitored</HmsBadge>} />
            <HmsRow label="Home collection app" value={<HmsBadge tone="gray">Not configured</HmsBadge>} last />
          </HmsSection>
        );
      case 'history':
        return (
          <HmsSection title="Change history">
            {state.events.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No admin changes recorded yet.</div>
            ) : (
              state.events.slice(0, 60).map((e, i) => <HmsRow key={e.at + i} label={e.text} hint={`${fmtStamp(e.at)} · ${e.by}`} value={<HmsBadge tone="gray">{e.area.toUpperCase()}</HmsBadge>} last={i === Math.min(state.events.length, 60) - 1} />)
            )}
          </HmsSection>
        );
    }
  };

  const renderDetail = (key: string | null) => {
    const k = key as SectionKey | null;
    if (!k || !SECTION_META[k]) return <HmsEmpty>Select a settings section.</HmsEmpty>;
    const editable = SECTION_FIELDS[k].length > 0;
    return (
      <>
        <HmsDetailHeader
          icon={Settings}
          title={SECTION_META[k].title}
          badge={dirtyIn(k) ? <HmsBadge tone="amber">Unsaved</HmsBadge> : undefined}
          subtitle={`${SECTION_META[k].description}${saved.savedAt ? ` · last saved ${fmtStamp(saved.savedAt)} by ${saved.savedBy}` : ''}`}
        />
        <HmsDetailBody>
          {dirtyFields.length > 0 && <HmsNotice tone="amber">{dirtyFields.length} unsaved change{dirtyFields.length === 1 ? '' : 's'} across settings. Save to apply.</HmsNotice>}
          {renderForm(k)}
        </HmsDetailBody>
        {editable && (
          <HmsDetailFooter>
            <HmsButton icon={RotateCcw} onClick={discard} disabled={!dirtyFields.length}>
              Discard changes
            </HmsButton>
            <HmsButton variant="primary" icon={Save} onClick={save} disabled={!dirtyFields.length}>
              Save changes
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="lab-settings"
      title="Department settings"
      description="Department details, hours, workflow rules, notifications and printing. Changes apply after you save."
      total={keys.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search settings"
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="edit section"
      onPrimary={() => requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-label="Settings section details"] input:not([readonly]), [aria-label="Settings section details"] select, [aria-label="Settings section details"] [role="switch"]')?.focus())}
      detailLabel="Settings section"
      renderDetail={renderDetail}
    />
  );
};

export default LabAdminSettingsView;
