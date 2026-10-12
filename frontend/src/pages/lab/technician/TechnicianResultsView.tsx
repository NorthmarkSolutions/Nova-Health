// Lab Technician · Result entry — samples on an analyzer. Enter each parameter, check flags and
// delta against the previous result, then send to the pathologist. Critical values need a confirmed re-run.
import React, { useState } from 'react';
import { FlaskConical, Save, Send, Cpu, ShieldCheck } from 'lucide-react';
import {
  HmsMasterDetail,
  HmsListRow,
  HmsBadge,
  HmsButton,
  HmsDetailHeader,
  HmsStatStrip,
  HmsDetailBody,
  HmsDetailFooter,
  HmsSection,
  HmsRow,
  HmsNotice,
  HmsEmpty,
  HmsField,
  HmsToggle,
  INPUT,
  TEXTAREA,
  HMS,
} from '../../../components/hms';
import { LabDataStore, LabQueueOrder, TestParameterResult } from '../data/labDataStore';
import { fmtMinutes } from '../data/labAdminStore';
import { paramFlag, deltaPct, DELTA_LIMIT_PCT, minutesSince, tatTargetFor } from '../data/pathologistStore';
import { isOnBench, benchSort, analyzersFor, analyzerBlock } from '../data/technicianStore';
import { PriorityBadge, ANALYZER_TONE } from '../admin/labAdminUi';
import { TechnicianViewProps } from './technicianUi';

type Values = Record<string, string>;
const FLAG_TONE = { Critical: 'red', Abnormal: 'amber', Normal: 'green', Pending: 'gray' } as const;
const FLAG_COLOR = { Critical: '#dc2626', Abnormal: '#b45309', Normal: '#15803d', Pending: HMS.textMuted } as const;

export const TechnicianResultsView: React.FC<TechnicianViewProps> = ({ data, by, notify, onNavigateTab, initialFilter, initialSelect }) => {
  const { orders, analyzers, catalog } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect || null);
  const [values, setValues] = useState<Record<string, Values>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<string[]>([]);

  const analyzerOf = (o: LabQueueOrder) => analyzers.find((a) => a.id === o.analyzerId) || analyzers.find((a) => a.name === o.analyzerName);
  const blocked = (o: LabQueueOrder) => {
    const a = analyzerOf(o);
    return !!o.isBlockedByDowntime || (!!a && (a.status === 'Offline' || a.status === 'Maintenance'));
  };
  const qcFailed = (o: LabQueueOrder) => {
    const a = analyzerOf(o);
    return !!a && !!a.isQcDue && a.lastQc.includes('✗');
  };

  const bench = orders.filter(isOnBench).sort(benchSort);
  const filters: Record<string, (o: LabQueueOrder) => boolean> = {
    all: () => true,
    retest: (o) => !!o.returnedForRetest,
    stat: (o) => o.priority === 'STAT',
    blocked: (o) => blocked(o) || qcFailed(o),
    draft: (o) => o.parameters.some((p) => p.observedValue !== null),
  };
  const q = search.trim().toLowerCase();
  const visible = bench.filter((o) => (filters[pill] || filters.all)(o) && (!q || [o.patientName, o.uhid, o.orderNumber, o.specimenNumber, o.testName, o.analyzerName || ''].some((v) => v.toLowerCase().includes(q))));
  const count = (k: string) => bench.filter(filters[k]).length;

  const pills = [
    { key: 'all', label: 'All', count: bench.length },
    { key: 'retest', label: 'Re-test', count: count('retest'), tone: 'amber' as const },
    { key: 'stat', label: 'STAT', count: count('stat'), tone: 'red' as const },
    { key: 'blocked', label: 'Analyzer down / QC', count: count('blocked'), tone: 'red' as const },
    { key: 'draft', label: 'Draft saved', count: count('draft') },
  ];

  const valuesOf = (o: LabQueueOrder): Values => values[o.id] ?? Object.fromEntries(o.parameters.map((p) => [p.name, p.observedValue === null || p.observedValue === undefined ? '' : String(p.observedValue)]));
  const entered = (o: LabQueueOrder) => Object.values(valuesOf(o)).filter((v) => v.trim() !== '').length;

  const rows: HmsListRow[] = visible.map((o) => {
    const done = entered(o);
    const total = o.parameters.length;
    return {
      key: o.id,
      title: o.patientName,
      badge: blocked(o) ? <HmsBadge tone="red">Analyzer down</HmsBadge> : qcFailed(o) ? <HmsBadge tone="red">QC failed</HmsBadge> : o.returnedForRetest ? <HmsBadge tone="amber">Re-test</HmsBadge> : <PriorityBadge priority={o.priority} />,
      sub: (
        <>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{o.specimenNumber}</span> · {o.testName}
        </>
      ),
      metaLeft: o.analyzerName || 'Analyzer not recorded',
      metaRight: o.processingAt ? `Loaded ${o.processingAt}` : undefined,
      progress: total ? { pct: (done / total) * 100, doneLabel: 'All values entered', tone: 'blue' } : undefined,
    };
  });

  const activeKey = rows.find((r) => r.key === selected)?.key ?? rows[0]?.key ?? null;
  const [errorsFor, setErrorsFor] = useState<string | null>(null);
  if (activeKey !== errorsFor) {
    setErrorsFor(activeKey);
    setErrors([]);
  }

  const build = (o: LabQueueOrder): TestParameterResult[] =>
    o.parameters.map((p) => {
      const raw = (valuesOf(o)[p.name] ?? '').trim();
      return { ...p, observedValue: raw === '' || !Number.isFinite(Number(raw)) ? null : Number(raw) };
    });

  const saveDraft = (o: LabQueueOrder) => {
    LabDataStore.saveResultDraft(o.id, build(o), (notes[o.id] ?? o.technicianNote ?? '').trim());
    notify(`Draft saved for ${o.specimenNumber}. It stays on the bench until you send it for review.`);
  };

  const submit = (o: LabQueueOrder) => {
    const errs: string[] = [];
    const v = valuesOf(o);
    o.parameters.forEach((p) => {
      const raw = (v[p.name] ?? '').trim();
      if (raw === '') errs.push(`${p.name}: enter a value.`);
      else if (!Number.isFinite(Number(raw))) errs.push(`${p.name}: “${raw}” is not a number.`);
    });
    const params = build(o);
    const crit = params.filter((p) => paramFlag(p) === 'Critical');
    if (crit.length && !confirmed[o.id]) errs.push('Critical value: re-run the sample and confirm before sending.');
    if (blocked(o)) errs.push('The analyzer is down. Move the sample to another analyzer.');
    if (qcFailed(o)) errs.push('QC failed on this analyzer. Results cannot be released until QC passes.');
    setErrors(errs);
    if (errs.length) return;
    const note = (notes[o.id] ?? o.technicianNote ?? '').trim();
    LabDataStore.submitResults(o.id, params, crit.length ? `${note ? `${note} · ` : ''}Critical value re-run and confirmed by ${by}.` : note, by);
    notify(crit.length ? `${o.testName} sent to the pathologist as CRITICAL. Inform the pathologist on duty now.` : `${o.testName} for ${o.patientName} sent for pathologist review.`, crit.length ? 'error' : 'success');
  };

  const renderDetail = (key: string | null) => {
    const o = orders.find((x) => x.id === key);
    if (!o) return <HmsEmpty>Nothing on the analyzers. Load a sample from Sample intake.</HmsEmpty>;
    const v = valuesOf(o);
    const params = build(o);
    const crit = params.filter((p) => paramFlag(p) === 'Critical');
    const abn = params.filter((p) => paramFlag(p) === 'Abnormal');
    const a = analyzerOf(o);
    const elapsed = minutesSince(o.orderedAt);
    const target = tatTargetFor(o, catalog);
    const down = blocked(o);
    const groups = Array.from(new Set(o.parameters.map((p) => p.group || 'Results')));

    return (
      <>
        <HmsDetailHeader icon={FlaskConical} title={o.patientName} badge={<PriorityBadge priority={o.priority} />} subtitle={`${o.uhid} · ${o.age}y ${o.gender} · ${o.specimenNumber} · ${o.testName}`} />
        <HmsStatStrip
          items={[
            { label: 'Analyzer', value: o.analyzerName || '—', note: a ? `${a.status} · QC ${a.lastQc}` : 'Not linked', tone: down || qcFailed(o) ? 'red' : 'default' },
            { label: 'Entered', value: `${entered(o)}/${o.parameters.length}`, note: 'Parameters' },
            { label: 'Flags', value: crit.length ? `${crit.length} critical` : abn.length ? `${abn.length} abnormal` : '—', tone: crit.length ? 'red' : abn.length ? 'amber' : 'default', note: crit.length || abn.length ? 'From values typed' : 'None so far' },
            { label: 'Turnaround', value: fmtMinutes(elapsed), note: target !== null ? `Target ${fmtMinutes(target)}` : 'No catalog target', tone: elapsed !== null && target !== null && elapsed > target ? 'red' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {o.returnedForRetest && <HmsNotice tone="amber">Re-test requested by {o.returnedBy || 'the pathologist'}: {o.retestReason || 'no reason recorded'}.</HmsNotice>}
          {qcFailed(o) && (
            <HmsNotice tone="red" action={<HmsButton size="sm" icon={ShieldCheck} onClick={() => onNavigateTab('analyzers', 'qc', a?.id)}>Open QC</HmsButton>}>
              QC failed on {a?.name}. Hold these results until QC passes, or move the sample.
            </HmsNotice>
          )}
          {down && (
            <HmsSection title="Move to another analyzer">
              {analyzersFor(o, analyzers)
                .filter((x) => x.id !== a?.id)
                .map((x, idx, arr) => {
                  const block = analyzerBlock(x);
                  return (
                    <HmsRow
                      key={x.id}
                      last={idx === arr.length - 1}
                      label={
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          {x.name} <HmsBadge tone={ANALYZER_TONE[x.status]}>{x.status}</HmsBadge>
                        </span>
                      }
                      hint={`${x.queuedCount} in queue · last QC ${x.lastQc}`}
                      value={block ? <HmsBadge tone="red">{block}</HmsBadge> : <HmsButton size="sm" variant="primary" icon={Cpu} onClick={() => { LabDataStore.loadOnAnalyzer(o.id, x.id, by); notify(`${o.specimenNumber} moved to ${x.name}.`); }}>Move here</HmsButton>}
                    />
                  );
                })}
            </HmsSection>
          )}
          {crit.length > 0 && (
            <HmsNotice tone="red">
              Critical: {crit.map((p) => `${p.name} ${p.observedValue} ${p.unit}`).join(' · ')}. Re-run the sample to confirm, then send — the pathologist is alerted straight away.
            </HmsNotice>
          )}

          {groups.map((g) => {
            const ps = o.parameters.filter((p) => (p.group || 'Results') === g);
            return (
              <HmsSection key={g} title={g === 'Results' ? 'Enter results' : `Enter results · ${g.toLowerCase()}`}>
                {ps.map((p, idx) => {
                  const built = params.find((x) => x.name === p.name)!;
                  const f = paramFlag(built);
                  const d = deltaPct(built);
                  const deltaFail = d !== null && Math.abs(d) > DELTA_LIMIT_PCT;
                  return (
                    <div key={p.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 140px 110px', gap: '12px', alignItems: 'center', padding: '10px 14px', borderBottom: idx < ps.length - 1 ? `1px solid ${HMS.divider}` : 'none' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: HMS.text }}>{p.name}</div>
                        <div style={{ fontSize: '12px', color: HMS.textSecondary }}>
                          Ref {p.low}–{p.high} {p.unit}
                          {p.previousValue !== null && p.previousValue !== undefined ? ` · previous ${p.previousValue}` : ''}
                          {deltaFail && <span style={{ color: '#b45309', fontWeight: 600 }}> · delta {d! > 0 ? '+' : ''}{d}% — check sample</span>}
                        </div>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          step="any"
                          inputMode="decimal"
                          aria-label={`${p.name} (${p.unit})`}
                          value={v[p.name] ?? ''}
                          onChange={(e) => setValues({ ...values, [o.id]: { ...v, [p.name]: e.target.value } })}
                          style={{ ...INPUT, paddingRight: '52px', textAlign: 'right', fontWeight: 600, color: FLAG_COLOR[f], borderColor: f === 'Critical' ? '#fca5a5' : f === 'Abnormal' ? '#fde68a' : undefined }}
                        />
                        <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: HMS.textSecondary, pointerEvents: 'none', maxWidth: '44px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.unit}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <HmsBadge tone={FLAG_TONE[f]}>{f === 'Pending' ? 'Not entered' : f === 'Abnormal' ? (built.observedValue! < p.low ? 'Low' : 'High') : f}</HmsBadge>
                      </div>
                    </div>
                  );
                })}
              </HmsSection>
            );
          })}

          <HmsSection title="Run note" padded>
            <HmsField label="Note for the pathologist" hint="Sample quality, re-runs, dilutions, interferences">
              <textarea style={TEXTAREA} rows={3} value={notes[o.id] ?? o.technicianNote ?? ''} onChange={(e) => setNotes({ ...notes, [o.id]: e.target.value })} placeholder="e.g. Mild lipaemia, result after 1:2 dilution" />
            </HmsField>
            {crit.length > 0 && (
              <div style={{ marginTop: '14px' }}>
                <HmsToggle checked={!!confirmed[o.id]} onChange={(c) => setConfirmed({ ...confirmed, [o.id]: c })} label="Critical value re-run on the same sample and confirmed" />
              </div>
            )}
          </HmsSection>
          {errors.length > 0 && (
            <div className="hms-invalid" style={{ borderRadius: '10px' }}>
              <HmsNotice tone="red">
                {errors.slice(0, 4).join(' ')}
                {errors.length > 4 ? ` (+${errors.length - 4} more)` : ''}
              </HmsNotice>
            </div>
          )}
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton style={{ flex: 1 }} icon={Save} onClick={() => saveDraft(o)}>
            Save draft
          </HmsButton>
          <HmsButton style={{ flex: 1 }} variant={crit.length ? 'danger' : 'primary'} icon={Send} onClick={() => submit(o)}>
            {crit.length ? 'Send as critical' : 'Send for review'}
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="tech-results"
      title="Result entry"
      description="Samples on an analyzer. Re-tests and STAT first. Values are flagged as you type."
      total={bench.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search patient, specimen, test or analyzer"
      pills={pills}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="enter values"
      onPrimary={() => requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-label="Result entry details"] input[type="number"]')?.focus())}
      detailLabel="Result entry"
      renderDetail={renderDetail}
    />
  );
};

export default TechnicianResultsView;
