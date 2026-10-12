// Lab Technician · Analyzers & QC — daily QC (pass or fail), fault reporting and return to service.
// A failed QC or a fault stops patient samples on that analyzer until it is cleared.
import React, { useState } from 'react';
import { Cpu, ShieldCheck, AlertTriangle, RotateCcw } from 'lucide-react';
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
  INPUT,
  TEXTAREA,
  HMS,
} from '../../../components/hms';
import { LabDataStore, AnalyzerItem } from '../data/labDataStore';
import { analyzerOnline, QC_LEVELS } from '../data/technicianStore';
import { ANALYZER_TONE } from '../admin/labAdminUi';
import { TechnicianViewProps } from './technicianUi';

interface QcForm {
  level: string;
  lot: string;
  pass: boolean;
  note: string;
}

export const TechnicianAnalyzersView: React.FC<TechnicianViewProps> = ({ data, by, notify, newSignal, initialFilter, initialSelect }) => {
  const { analyzers, orders, activity, catalog } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [qcFor, setQcFor] = useState<AnalyzerItem | null>(null);
  const [qc, setQc] = useState<QcForm>({ level: QC_LEVELS[1], lot: '', pass: true, note: '' });
  const [faultFor, setFaultFor] = useState<AnalyzerItem | null>(null);
  const [fault, setFault] = useState('');
  const [error, setError] = useState('');

  const filters: Record<string, (a: AnalyzerItem) => boolean> = {
    all: () => true,
    qc: (a) => !!a.isQcDue,
    down: (a) => !analyzerOnline(a),
    online: analyzerOnline,
  };
  const q = search.trim().toLowerCase();
  const rank = (a: AnalyzerItem) => (a.status === 'Offline' ? 0 : a.isQcDue ? 1 : a.status === 'Maintenance' ? 2 : 3);
  const visible = analyzers
    .filter((a) => (filters[pill] || filters.all)(a) && (!q || [a.name, a.serial, a.section, a.testsCovered].some((v) => v.toLowerCase().includes(q))))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));

  const pills = [
    { key: 'all', label: 'All', count: analyzers.length },
    { key: 'qc', label: 'QC due', count: analyzers.filter(filters.qc).length, tone: 'amber' as const },
    { key: 'down', label: 'Down', count: analyzers.filter(filters.down).length, tone: 'red' as const },
    { key: 'online', label: 'Online', count: analyzers.filter(analyzerOnline).length },
  ];

  const samplesOn = (a: AnalyzerItem) => orders.filter((o) => o.stage === 'PROCESSING' && (o.analyzerId === a.id || (!o.analyzerId && o.analyzerName === a.name)));

  const rows: HmsListRow[] = visible.map((a) => ({
    key: a.id,
    title: a.name,
    badge: <HmsBadge tone={ANALYZER_TONE[a.status]}>{a.status}</HmsBadge>,
    sub: `${a.section} · S/N ${a.serial}`,
    metaLeft: <span style={{ color: a.isQcDue ? '#b45309' : undefined, fontWeight: a.isQcDue ? 600 : undefined }}>{a.isQcDue ? `QC due · ${a.lastQc}` : `QC ${a.lastQc}`}</span>,
    metaRight: `${samplesOn(a).length} on bench`,
    progress: { pct: a.reagentPercent, doneLabel: 'Reagent full', tone: a.reagentPercent < 20 ? 'red' : a.reagentPercent < 40 ? 'amber' : 'blue' },
  }));

  // Alt+N logs QC on the active analyzer (adjusting state during render when the signal changes)
  const activeKey = rows.find((r) => r.key === selected)?.key ?? rows[0]?.key ?? null;
  const [seenSignal, setSeenSignal] = useState(newSignal);
  if (newSignal !== seenSignal) {
    setSeenSignal(newSignal);
    const a = analyzers.find((x) => x.id === activeKey);
    if (a) setQcFor(a);
  }

  const openQc = (a: AnalyzerItem) => {
    setQc({ level: QC_LEVELS[1], lot: '', pass: true, note: '' });
    setError('');
    setQcFor(a);
  };

  const saveQc = () => {
    if (!qcFor) return;
    if (qc.lot.trim().length < 3) return setError('Enter the control lot number.');
    if (!qc.pass && qc.note.trim().length < 5) return setError('Describe the failure (rule violated, value obtained).');
    LabDataStore.logQc(qcFor.id, { level: qc.level, lot: qc.lot.trim(), pass: qc.pass, by, note: qc.note.trim() || undefined });
    notify(qc.pass ? `QC passed on ${qcFor.name} (${qc.level}). Patient samples can run.` : `QC FAILED on ${qcFor.name}. Patient samples are held until QC passes.`, qc.pass ? 'success' : 'error');
    setQcFor(null);
    setError('');
  };

  const saveFault = () => {
    if (!faultFor) return;
    if (fault.trim().length < 5) return setError('Describe the fault (error code, what happened).');
    LabDataStore.reportFault(faultFor.id, fault.trim(), by);
    notify(`${faultFor.name} marked offline. Samples on it are flagged to move; Lab Admin sees the fault.`, 'error');
    setFaultFor(null);
    setFault('');
    setError('');
  };

  const renderDetail = (key: string | null) => {
    const a = analyzers.find((x) => x.id === key);
    if (!a) return <HmsEmpty>Select an analyzer to see its QC and samples.</HmsEmpty>;
    const samples = samplesOn(a);
    const log = a.qcLog || [];
    const catalogQc = catalog.flatMap((t) => t.recentQc.filter((x) => x.meta.toLowerCase().includes(a.name.toLowerCase().split(' ').slice(-1)[0])).map((x) => ({ ...x, test: t.name })));
    const events = activity.filter((x) => x.title.includes(a.name)).slice(0, 6);
    return (
      <>
        <HmsDetailHeader
          icon={Cpu}
          title={a.name}
          badge={<HmsBadge tone={ANALYZER_TONE[a.status]}>{a.status}</HmsBadge>}
          subtitle={`${a.section} · S/N ${a.serial} · ${a.testsCovered}`}
          actions={
            <>
              {a.status === 'Offline' ? (
                <HmsButton icon={RotateCcw} onClick={() => { LabDataStore.returnToService(a.id, by); notify(`${a.name} back in service. Run QC before patient samples.`); }}>
                  Return to service
                </HmsButton>
              ) : (
                <HmsButton variant="danger" icon={AlertTriangle} onClick={() => { setFault(''); setError(''); setFaultFor(a); }}>
                  Report fault
                </HmsButton>
              )}
              <HmsButton variant="primary" icon={ShieldCheck} shortcut="Alt+N" onClick={() => openQc(a)} disabled={a.status === 'Offline'}>
                Log QC
              </HmsButton>
            </>
          }
        />
        <HmsStatStrip
          items={[
            { label: 'Last QC', value: a.lastQc, tone: a.isQcDue ? 'amber' : 'green', note: a.isQcDue ? 'QC due' : 'In control' },
            { label: 'On bench', value: samples.length, note: 'Samples loaded' },
            { label: 'Reagent', value: `${a.reagentPercent}%`, tone: a.reagentPercent < 20 ? 'red' : a.reagentPercent < 40 ? 'amber' : 'default', note: a.reagentPercent < 20 ? 'Tell Lab Admin' : undefined },
            { label: 'Service', value: a.serviceTicket || '—', note: a.engineerEta ? `Engineer ${a.engineerEta}` : 'No open ticket' },
          ]}
        />
        <HmsDetailBody>
          {a.alertTitle && (
            <HmsNotice tone={a.status === 'Offline' || a.alertTitle.startsWith('QC failed') ? 'red' : 'amber'}>
              {a.alertTitle}
              {a.alertBody ? ` — ${a.alertBody}` : ''}
            </HmsNotice>
          )}
          {a.isQcDue && a.status !== 'Offline' && !a.alertTitle && <HmsNotice tone="amber">QC is due. Patient samples cannot be loaded until QC passes.</HmsNotice>}

          <HmsSection title="Samples on this analyzer">
            {samples.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No samples loaded.</div>
            ) : (
              samples.map((o, idx) => <HmsRow key={o.id} last={idx === samples.length - 1} label={`${o.patientName} · ${o.testName}`} hint={`${o.specimenNumber} · loaded ${o.processingAt || '—'}`} value={o.isBlockedByDowntime ? <HmsBadge tone="red">Move sample</HmsBadge> : <HmsBadge tone="blue">{o.priority}</HmsBadge>} />)
            )}
          </HmsSection>

          <HmsSection title="QC log">
            {log.length === 0 && catalogQc.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No QC runs recorded at the bench yet.</div>
            ) : (
              <>
                {log.map((x, idx) => (
                  <HmsRow key={x.id} last={idx === log.length - 1 && catalogQc.length === 0} label={`${x.level} · lot ${x.lot}`} hint={`${x.time} · ${x.by}${x.note ? ` · ${x.note}` : ''}`} value={<HmsBadge tone={x.pass ? 'green' : 'red'}>{x.pass ? 'Pass' : 'Fail'}</HmsBadge>} />
                ))}
                {catalogQc.map((x, idx) => (
                  <HmsRow key={`${x.test}-${idx}`} last={idx === catalogQc.length - 1} label={`${x.level} · ${x.test}`} hint={`${x.meta} · ${x.time}`} value={<HmsBadge tone={x.pass ? 'green' : 'red'}>{x.result}</HmsBadge>} />
                ))}
              </>
            )}
          </HmsSection>

          <HmsSection title="Recent activity" defaultOpen={events.length > 0}>
            {events.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No recent activity for this analyzer.</div>
            ) : (
              events.map((e, idx) => <HmsRow key={e.id} last={idx === events.length - 1} label={e.title} hint={e.by} value={<span style={{ fontSize: '13px', color: HMS.textSecondary }}>{e.time}</span>} />)
            )}
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="tech-analyzers"
        title="Analyzers & QC"
        description="Down and QC-due analyzers first. The bar shows reagent left."
        total={analyzers.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search analyzer, serial, section or test"
        pills={pills}
        activePill={pill}
        onPill={setPill}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="log QC"
        onPrimary={(k) => {
          const a = analyzers.find((x) => x.id === k);
          if (a && a.status !== 'Offline') openQc(a);
        }}
        detailLabel="Analyzer"
        renderDetail={renderDetail}
      />

      {qcFor && (
        <HmsModal
          title="Log QC run"
          description={`${qcFor.name} · ${qcFor.section}`}
          onClose={() => setQcFor(null)}
          footer={
            <>
              <HmsButton onClick={() => setQcFor(null)}>Cancel</HmsButton>
              <HmsButton variant={qc.pass ? 'primary' : 'danger'} icon={ShieldCheck} onClick={saveQc}>
                {qc.pass ? 'Record pass' : 'Record failure'}
              </HmsButton>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            <HmsField label="Control level">
              <select style={INPUT} value={qc.level} onChange={(e) => setQc({ ...qc, level: e.target.value })}>
                {QC_LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </HmsField>
            <HmsField label="Control lot" required>
              <input style={INPUT} className={error && qc.lot.trim().length < 3 ? 'hms-invalid' : undefined} value={qc.lot} onChange={(e) => setQc({ ...qc, lot: e.target.value })} placeholder="e.g. 8822" />
            </HmsField>
          </div>
          <HmsField label="Result">
            <div role="radiogroup" aria-label="QC result" style={{ display: 'flex', gap: '8px' }}>
              {[
                { v: true, label: 'Pass — within limits, Westgard OK' },
                { v: false, label: 'Fail — rule violated' },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  type="button"
                  role="radio"
                  aria-checked={qc.pass === o.v}
                  onClick={() => setQc({ ...qc, pass: o.v })}
                  style={{ flex: 1, height: '40px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${qc.pass === o.v ? (o.v ? '#16a34a' : '#dc2626') : '#d1d5db'}`, background: qc.pass === o.v ? (o.v ? '#f0fdf4' : '#fef2f2') : '#ffffff', color: qc.pass === o.v ? (o.v ? '#15803d' : '#dc2626') : HMS.text }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </HmsField>
          <HmsField label="Note" required={!qc.pass}>
            <textarea style={TEXTAREA} rows={2} value={qc.note} onChange={(e) => setQc({ ...qc, note: e.target.value })} placeholder={qc.pass ? 'Optional' : 'e.g. 1-3s violation on level 2, K+ 5.9 (mean 5.1)'} />
          </HmsField>
          {error && <HmsNotice tone="red">{error}</HmsNotice>}
        </HmsModal>
      )}

      {faultFor && (
        <HmsModal
          title="Report fault"
          description={`${faultFor.name} goes offline and samples on it are flagged to move.`}
          onClose={() => setFaultFor(null)}
          footer={
            <>
              <HmsButton onClick={() => setFaultFor(null)}>Cancel</HmsButton>
              <HmsButton variant="danger" icon={AlertTriangle} onClick={saveFault}>
                Mark offline
              </HmsButton>
            </>
          }
        >
          <HmsField label="What happened" required>
            <textarea style={TEXTAREA} rows={3} className={error ? 'hms-invalid' : undefined} value={fault} onChange={(e) => setFault(e.target.value)} placeholder="Error code, aspiration failure, sensor flag, mechanical jam…" />
          </HmsField>
          {error && <HmsNotice tone="red">{error}</HmsNotice>}
        </HmsModal>
      )}
    </>
  );
};

export default TechnicianAnalyzersView;
