// Lab Admin · Analyzers & service — live analyzer status (shared with the Technician workbench)
// plus preventive maintenance, service contracts and the service log.
import React, { useState } from 'react';
import { Cpu, Plus, Wrench, ClipboardCheck, Ticket } from 'lucide-react';
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
  HmsNotice,
  HmsEmpty,
  HmsModal,
  HmsField,
  HmsProgress,
  INPUT,
  TEXTAREA,
  HMS,
} from '../../../components/hms';
import { LabAdminStore, pmState, daysUntil, fmtDate, fmtShort, fmtStamp } from '../data/labAdminStore';
import { LabAdminViewProps, ANALYZER_TONE } from './labAdminUi';

type LogKind = 'pm' | 'calibration' | 'ticket';
const LOG_LABEL: Record<LogKind, string> = { pm: 'Preventive maintenance done', calibration: 'Calibration / QC run', ticket: 'Service ticket raised' };

export const LabAdminEquipmentView: React.FC<LabAdminViewProps> = ({ data, by, notify, newSignal, initialFilter }) => {
  const { analyzers, orders, state } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [logFor, setLogFor] = useState<{ id: string; kind: LogKind; note: string } | null>(null);
  const [adding, setAdding] = useState<{ name: string; serial: string; section: string; contract: string; testsCovered: string; error?: string } | null>(null);

  // Alt+N from the shell opens "Register analyzer"
  const [seenSignal, setSeenSignal] = useState(newSignal);
  if (newSignal !== seenSignal) {
    setSeenSignal(newSignal);
    if (newSignal > 0) setAdding({ name: '', serial: '', section: 'Hematology', contract: '', testsCovered: '' });
  }

  const contractDue = (id: string) => {
    const d = daysUntil(state.equipment[id]?.contractEnds);
    return d !== null && d <= 60;
  };
  const filters: Record<string, (id: string, status: string) => boolean> = {
    all: () => true,
    down: (_id, st) => st === 'Offline' || st === 'Maintenance',
    pm: (id) => ['due', 'overdue'].includes(pmState(state.equipment[id])),
    contract: (id) => contractDue(id),
  };
  const q = search.trim().toLowerCase();
  const visible = analyzers.filter((a) => filters[pill](a.id, a.status) && (!q || [a.name, a.serial, a.section, a.testsCovered].some((v) => (v || '').toLowerCase().includes(q))));
  const statusRank = { Offline: 0, Maintenance: 1, Ready: 2, Running: 3 } as const;
  visible.sort((a, b) => statusRank[a.status] - statusRank[b.status] || a.name.localeCompare(b.name));

  const pills = [
    { key: 'all', label: 'All', count: analyzers.length },
    { key: 'down', label: 'Offline / maintenance', count: analyzers.filter((a) => filters.down(a.id, a.status)).length, tone: 'red' as const },
    { key: 'pm', label: 'PM due', count: analyzers.filter((a) => filters.pm(a.id, a.status)).length, tone: 'amber' as const },
    { key: 'contract', label: 'Contract renewals', count: analyzers.filter((a) => contractDue(a.id)).length, tone: 'amber' as const },
  ];

  const rows: HmsListRow[] = visible.map((a) => {
    const meta = state.equipment[a.id];
    const pm = pmState(meta);
    return {
      key: a.id,
      title: a.name,
      badge: <HmsBadge tone={ANALYZER_TONE[a.status]}>{a.status}</HmsBadge>,
      sub: `${a.section} · ${a.serial}`,
      metaLeft: `${a.queuedCount} queued · reagent ${a.reagentPercent}%`,
      metaRight:
        pm === 'overdue' ? <span style={{ color: '#dc2626', fontWeight: 600 }}>PM overdue</span> : pm === 'due' ? <span style={{ color: '#b45309', fontWeight: 600 }}>PM {fmtShort(meta?.nextPm)}</span> : meta ? `PM ${fmtShort(meta.nextPm)}` : 'No PM record',
    };
  });

  const renderDetail = (key: string | null) => {
    const a = analyzers.find((x) => x.id === key);
    if (!a) return <HmsEmpty>Select an analyzer to see its status, service contract and log.</HmsEmpty>;
    const meta = state.equipment[a.id];
    const pm = pmState(meta);
    const held = orders.filter((o) => o.analyzerId === a.id && o.isBlockedByDowntime && o.stage !== 'SIGNED_OFF');
    const contractDays = daysUntil(meta?.contractEnds);
    return (
      <>
        <HmsDetailHeader
          icon={Cpu}
          title={a.name}
          badge={<HmsBadge tone={ANALYZER_TONE[a.status]}>{a.status}</HmsBadge>}
          subtitle={`${a.section} · ${a.serial} · ${a.testsCovered}`}
          actions={
            <>
              <HmsButton icon={Ticket} onClick={() => setLogFor({ id: a.id, kind: 'ticket', note: '' })}>
                Raise service ticket
              </HmsButton>
              <HmsButton variant="primary" icon={Wrench} onClick={() => setLogFor({ id: a.id, kind: 'pm', note: '' })}>
                Log maintenance
              </HmsButton>
            </>
          }
        />
        <HmsStatStrip
          items={[
            { label: 'Queue', value: a.queuedCount, note: held.length ? `${held.length} order${held.length === 1 ? '' : 's'} held` : 'Orders waiting', tone: held.length ? 'red' : 'default' },
            { label: 'Reagent', value: `${a.reagentPercent}%`, note: a.reagentPercent <= 20 ? 'Reorder now' : 'On-board level', tone: a.reagentPercent <= 20 ? 'red' : a.reagentPercent <= 35 ? 'amber' : 'default' },
            { label: 'Last QC', value: a.lastQc, note: a.isQcDue ? 'QC due' : 'Within schedule', tone: a.isQcDue ? 'amber' : 'default' },
            { label: 'Next PM', value: meta ? fmtShort(meta.nextPm) : '—', note: pm === 'overdue' ? 'Overdue' : pm === 'due' ? 'Due within 14 days' : meta ? `Last ${fmtShort(meta.lastPm)}` : 'Not recorded', tone: pm === 'overdue' ? 'red' : pm === 'due' ? 'amber' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {(a.alertTitle || a.status === 'Offline') && (
            <HmsNotice tone={a.status === 'Offline' ? 'red' : 'amber'}>
              {a.alertTitle || `${a.name} is offline`}
              {a.alertBody ? ` · ${a.alertBody}` : ''}
              {a.serviceTicket ? ` · ${a.serviceTicket}` : ''}
              {a.engineerEta ? ` · engineer ETA ${a.engineerEta}` : ''}
            </HmsNotice>
          )}

          <HmsSection title="Reagent on board">
            <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ flex: 1 }}>
                <HmsProgress pct={a.reagentPercent} doneLabel="Full" height={8} tone={a.reagentPercent <= 20 ? 'red' : a.reagentPercent <= 35 ? 'amber' : 'blue'} label="Reagent level" />
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: HMS.text }}>{a.reagentPercent}%</span>
            </div>
          </HmsSection>

          <HmsSection title="Service & contract">
            <HmsRow label="Last preventive maintenance" value={meta ? fmtDate(meta.lastPm) : '—'} />
            <HmsRow label="Next preventive maintenance" value={meta ? fmtDate(meta.nextPm) : '—'} hint="Every 90 days" />
            <HmsRow label="Service contract" value={meta?.contract || 'Not recorded'} />
            <HmsRow
              label="Contract valid to"
              value={meta?.contractEnds ? <HmsBadge tone={contractDays !== null && contractDays < 0 ? 'red' : contractDays !== null && contractDays <= 60 ? 'amber' : 'green'}>{fmtDate(meta.contractEnds)}</HmsBadge> : '—'}
              hint={contractDays !== null && contractDays <= 60 ? (contractDays < 0 ? 'Expired — renew before the next breakdown' : `Renewal due in ${contractDays} days`) : undefined}
              last
            />
          </HmsSection>

          <HmsSection
            title="Service log"
            right={
              <HmsButton size="sm" variant="ghost" icon={ClipboardCheck} onClick={() => setLogFor({ id: a.id, kind: 'calibration', note: '' })}>
                Log calibration
              </HmsButton>
            }
          >
            {!meta || meta.log.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No service entries yet.</div>
            ) : (
              meta.log.slice(0, 8).map((l, i) => <HmsRow key={l.at + i} label={l.text} hint={`${fmtStamp(l.at)} · ${l.by}`} last={i === Math.min(meta.log.length, 8) - 1} />)
            )}
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  const saveLog = () => {
    if (!logFor) return;
    const a = analyzers.find((x) => x.id === logFor.id);
    const text = `${LOG_LABEL[logFor.kind]} · ${a?.name || ''}${logFor.note.trim() ? ` · ${logFor.note.trim()}` : ''}`;
    LabAdminStore.logMaintenance(logFor.id, text, logFor.kind, by);
    notify(logFor.kind === 'pm' ? `Maintenance logged for ${a?.name}. Next PM set 90 days out.` : `${LOG_LABEL[logFor.kind]} logged for ${a?.name}.`);
    setLogFor(null);
  };

  const saveAnalyzer = () => {
    if (!adding) return;
    if (!adding.name.trim() || !adding.serial.trim()) {
      setAdding({ ...adding, error: 'Name and serial number are required.' });
      return;
    }
    if (analyzers.some((x) => x.serial.toLowerCase() === adding.serial.trim().toLowerCase())) {
      setAdding({ ...adding, error: 'An analyzer with this serial number is already registered.' });
      return;
    }
    const id = LabAdminStore.addAnalyzer({ name: adding.name.trim(), serial: adding.serial.trim(), section: adding.section, contract: adding.contract.trim(), testsCovered: adding.testsCovered.trim() || adding.section }, by);
    setSelected(id);
    notify(`${adding.name.trim()} registered. It appears on the Technician workbench as Ready, QC due.`);
    setAdding(null);
  };

  return (
    <>
      <HmsMasterDetail
        listId="lab-analyzers"
        title="Analyzers & service"
        description="Live status from the bench, plus maintenance and service contracts. Problems first."
        total={analyzers.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search analyzer, serial or section"
        pills={pills}
        activePill={pill}
        onPill={setPill}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="log maintenance"
        onPrimary={(id) => setLogFor({ id, kind: 'pm', note: '' })}
        headerAction={
          <HmsButton variant="primary" icon={Plus} onClick={() => setAdding({ name: '', serial: '', section: 'Hematology', contract: '', testsCovered: '' })} title="Register analyzer (Alt+N)" aria-keyshortcuts="Alt+N">
            Register
          </HmsButton>
        }
        detailLabel="Analyzer"
        renderDetail={renderDetail}
      />

      {logFor && (
        <HmsModal
          title="Log service entry"
          description={analyzers.find((x) => x.id === logFor.id)?.name}
          onClose={() => setLogFor(null)}
          footer={
            <>
              <HmsButton onClick={() => setLogFor(null)}>Cancel</HmsButton>
              <HmsButton variant="primary" onClick={saveLog}>
                Save entry
              </HmsButton>
            </>
          }
        >
          <HmsField label="Type">
            <select style={INPUT} value={logFor.kind} onChange={(e) => setLogFor({ ...logFor, kind: e.target.value as LogKind })}>
              {(Object.keys(LOG_LABEL) as LogKind[]).map((k) => (
                <option key={k} value={k}>
                  {LOG_LABEL[k]}
                </option>
              ))}
            </select>
          </HmsField>
          <HmsField label="Note" hint={logFor.kind === 'ticket' ? 'Fault, ticket number and engineer ETA.' : 'Work done, parts replaced, QC result.'}>
            <textarea style={TEXTAREA} value={logFor.note} onChange={(e) => setLogFor({ ...logFor, note: e.target.value })} />
          </HmsField>
        </HmsModal>
      )}

      {adding && (
        <HmsModal
          title="Register analyzer"
          description="Adds it to the equipment register and the Technician workbench."
          onClose={() => setAdding(null)}
          footer={
            <>
              <HmsButton onClick={() => setAdding(null)}>Cancel</HmsButton>
              <HmsButton variant="primary" icon={Plus} onClick={saveAnalyzer}>
                Register analyzer
              </HmsButton>
            </>
          }
        >
          {adding.error && <HmsNotice tone="red">{adding.error}</HmsNotice>}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
            <HmsField label="Analyzer name" required>
              <input style={INPUT} value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value, error: undefined })} placeholder="e.g. Sysmex XN-550" />
            </HmsField>
            <HmsField label="Serial number" required>
              <input style={INPUT} value={adding.serial} onChange={(e) => setAdding({ ...adding, serial: e.target.value, error: undefined })} />
            </HmsField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <HmsField label="Section">
              <select style={INPUT} value={adding.section} onChange={(e) => setAdding({ ...adding, section: e.target.value })}>
                {['Hematology', 'Chemistry', 'Immunoassay', 'Coagulation', 'Blood gas', 'HbA1c', 'Microbiology', 'Urinalysis'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </HmsField>
            <HmsField label="Service contract">
              <input style={INPUT} value={adding.contract} onChange={(e) => setAdding({ ...adding, contract: e.target.value })} placeholder="e.g. Vendor · AMC" />
            </HmsField>
          </div>
          <HmsField label="Tests covered">
            <input style={INPUT} value={adding.testsCovered} onChange={(e) => setAdding({ ...adding, testsCovered: e.target.value })} placeholder="e.g. CBC, ESR" />
          </HmsField>
        </HmsModal>
      )}
    </>
  );
};

export default LabAdminEquipmentView;
