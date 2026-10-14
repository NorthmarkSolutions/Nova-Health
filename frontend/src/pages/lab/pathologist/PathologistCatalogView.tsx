// Pathologist · Test catalog & reference ranges — the pathologist owns ranges and critical limits.
// Edits are saved as a draft and only used for reporting once published as a new version.
// Prices are not edited here: Lab Admin sets them in Test pricing.
import React, { useMemo, useState } from 'react';
import { BookOpen, Plus, Save, Send, Trash2, Undo2 } from 'lucide-react';
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
  HMS,
} from '../../../components/hms';
import { LabDataStore, CatalogTestItem, CatalogRangeItem } from '../data/labDataStore';
import { LabAdminStore, buildPriceRows, inr } from '../data/labAdminStore';
import { hasDraft, SEGMENTS, RangeSegment } from '../data/pathologistStore';
import { PathologistViewProps } from './pathologistUi';

type Cell = { low: string; high: string; criticalLow: string; criticalHigh: string };
type Working = Record<RangeSegment, Cell[]>;

const str = (n?: number) => (n === undefined || n === null ? '' : String(n));
const toWorking = (ranges: CatalogTestItem['ranges']): Working =>
  Object.fromEntries(
    SEGMENTS.map(({ key }) => [key, (ranges[key] || []).map((r) => ({ low: str(r.low), high: str(r.draftHigh ?? r.high), criticalLow: str(r.criticalLow), criticalHigh: str(r.criticalHigh) }))])
  ) as Working;

const sameCell = (c: Cell, r: CatalogRangeItem) => c.low === str(r.low) && c.high === str(r.high) && c.criticalLow === str(r.criticalLow) && c.criticalHigh === str(r.criticalHigh);

const STATUS_TONE = { Active: 'green', Draft: 'amber', Inactive: 'gray' } as const;
const SECTIONS = ['Biochemistry', 'Hematology', 'Immunoassay', 'Coagulation', 'Clinical pathology', 'Microbiology'];

const NUM: React.CSSProperties = { ...INPUT, width: '88px', height: '36px', padding: '0 8px', textAlign: 'right' };

interface NewTest {
  name: string;
  code: string;
  section: string;
  sampleType: string;
  container: string;
  tatTarget: string;
  tatStat: string;
  paramName: string;
  unit: string;
  low: string;
  high: string;
}
const EMPTY_TEST: NewTest = { name: '', code: '', section: 'Biochemistry', sampleType: 'Serum', container: 'Gold top SST', tatTarget: '4 h', tatStat: '1 h', paramName: '', unit: '', low: '', high: '' };

export const PathologistCatalogView: React.FC<PathologistViewProps> = ({ data, by, notify, newSignal, initialFilter }) => {
  const { catalog, orders, tariffs } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [segment, setSegment] = useState<RangeSegment>('adultMale');
  const [working, setWorking] = useState<Working | null>(null);
  const [workingKey, setWorkingKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [adding, setAdding] = useState<NewTest | null>(null);
  const [addError, setAddError] = useState('');

  // Alt+N opens "Add test" (adjusting state during render when the signal changes)
  const [seenSignal, setSeenSignal] = useState(newSignal);
  if (newSignal !== seenSignal) {
    setSeenSignal(newSignal);
    setAdding({ ...EMPTY_TEST });
  }

  const prices = useMemo(() => buildPriceRows(LabAdminStore.get(), catalog, tariffs), [catalog, tariffs]);
  const priceOf = (t: CatalogTestItem) => prices.find((p) => p.catalogCode === t.code);

  const sections = Array.from(new Set(catalog.map((t) => t.section))).sort();
  const filters: Record<string, (t: CatalogTestItem) => boolean> = {
    all: () => true,
    drafts: hasDraft,
    ...Object.fromEntries(sections.map((s) => [s, (t: CatalogTestItem) => t.section === s])),
  };
  const q = search.trim().toLowerCase();
  const visible = catalog
    .filter((t) => (filters[pill] || filters.all)(t) && (!q || [t.name, t.code, t.section, t.sampleType].some((v) => v.toLowerCase().includes(q))))
    .sort((a, b) => Number(hasDraft(b)) - Number(hasDraft(a)) || a.name.localeCompare(b.name));

  const pills = [
    { key: 'all', label: 'All', count: catalog.length },
    { key: 'drafts', label: 'Changes to publish', count: catalog.filter(hasDraft).length, tone: 'amber' as const },
    ...sections.map((s) => ({ key: s, label: s, count: catalog.filter((t) => t.section === s).length })),
  ];

  const rows: HmsListRow[] = visible.map((t) => ({
    key: t.code,
    title: t.name,
    badge: <HmsBadge tone={STATUS_TONE[t.status]}>{t.version === 0 ? 'New' : t.status}</HmsBadge>,
    sub: (
      <>
        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{t.code}</span> · {t.section}
      </>
    ),
    metaLeft: `${t.sampleType} · ${t.container}`,
    metaRight: t.version ? `v${t.version} · TAT ${t.tatTarget}` : 'Never published',
  }));

  // Reset the range editor whenever the active test changes or its saved data changes
  const activeKey = rows.find((r) => r.key === selected)?.key ?? rows[0]?.key ?? null;
  const active = catalog.find((t) => t.code === activeKey);
  const stamp = active ? `${active.code}:${active.version}:${JSON.stringify(active.draftRanges || null)}` : null;
  if (stamp !== workingKey) {
    setWorkingKey(stamp);
    setWorking(active ? toWorking(active.draftRanges || active.ranges) : null);
    setErrors([]);
  }

  const validate = (t: CatalogTestItem, w: Working): CatalogTestItem['ranges'] | null => {
    const errs: string[] = [];
    const out = {} as CatalogTestItem['ranges'];
    SEGMENTS.forEach(({ key, label }) => {
      out[key] = (t.ranges[key] || []).map((r, i) => {
        const c = w[key][i];
        const n = (s: string) => (s.trim() === '' ? undefined : Number(s));
        const low = n(c.low);
        const high = n(c.high);
        const cl = n(c.criticalLow);
        const ch = n(c.criticalHigh);
        const name = `${label} · ${r.name}`;
        if (low === undefined || high === undefined || !Number.isFinite(low) || !Number.isFinite(high)) errs.push(`${name}: enter both low and high limits.`);
        else if (low >= high) errs.push(`${name}: low must be below high.`);
        if (cl !== undefined && (!Number.isFinite(cl) || (low !== undefined && cl >= low))) errs.push(`${name}: critical low must be below the reference low.`);
        if (ch !== undefined && (!Number.isFinite(ch) || (high !== undefined && ch <= high))) errs.push(`${name}: critical high must be above the reference high.`);
        return { name: r.name, unit: r.unit, low: low ?? r.low, high: high ?? r.high, ...(cl !== undefined ? { criticalLow: cl } : {}), ...(ch !== undefined ? { criticalHigh: ch } : {}) };
      });
    });
    setErrors(errs);
    return errs.length ? null : out;
  };

  const saveDraft = (t: CatalogTestItem) => {
    if (!working) return;
    const ranges = validate(t, working);
    if (!ranges) return;
    LabDataStore.saveRangeDraft(t.code, ranges, by);
    notify(`Draft saved for ${t.name}. Reporting still uses v${t.version} until you publish.`);
  };

  const publish = (t: CatalogTestItem) => {
    if (!working) return;
    const ranges = validate(t, working);
    if (!ranges) return;
    LabDataStore.saveRangeDraft(t.code, ranges, by);
    LabDataStore.publishRangeChanges(t.code, by);
    notify(`${t.name} v${t.version + 1} published. New results are flagged against these ranges.`);
  };

  const createTest = () => {
    if (!adding) return;
    const a = adding;
    const low = Number(a.low);
    const high = Number(a.high);
    if (a.name.trim().length < 3) return setAddError('Enter the test name.');
    if (!/^[A-Z]{2,4}-[A-Z0-9]{2,6}-\d{2}$/.test(a.code.trim().toUpperCase())) return setAddError('Use a code like BIO-TSH-01 (section, test, number).');
    if (!a.paramName.trim() || !a.unit.trim()) return setAddError('Enter the first parameter and its unit.');
    if (a.low.trim() === '' || a.high.trim() === '' || !(low < high)) return setAddError('Enter a reference range where low is below high.');
    const range: CatalogRangeItem = { name: a.paramName.trim(), unit: a.unit.trim(), low, high };
    const test: CatalogTestItem = {
      code: a.code.trim().toUpperCase(),
      name: a.name.trim(),
      section: a.section,
      sampleType: a.sampleType.trim(),
      container: a.container.trim(),
      paramsCount: 1,
      tatTarget: a.tatTarget.trim(),
      tatStat: a.tatStat.trim(),
      status: 'Draft',
      version: 0,
      lastPublished: '',
      ranges: { adultMale: [range], adultFemale: [{ ...range }], child: [{ ...range }] },
      recentQc: [],
    };
    if (!LabDataStore.addCatalogTest(test, by)) return setAddError(`${test.code} is already in the catalog.`);
    setAdding(null);
    setAddError('');
    setSelected(test.code);
    setPill('all');
    notify(`${test.name} added as a draft. Check the ranges for each group, then publish. Lab Admin sets the price.`);
  };

  const renderDetail = (key: string | null) => {
    const t = catalog.find((x) => x.code === key);
    if (!t || !working) return <HmsEmpty>Select a test to see its reference ranges.</HmsEmpty>;
    const live = t.ranges[segment] || [];
    const cells = working[segment] || [];
    const dirtyLive = SEGMENTS.some(({ key: k }) => (working[k] || []).some((c, i) => t.ranges[k][i] && !sameCell(c, t.ranges[k][i])));
    const savedDraft = !!t.draftRanges;
    const unsaved = JSON.stringify(working) !== JSON.stringify(toWorking(t.draftRanges || t.ranges));
    const price = priceOf(t);
    const orderedToday = orders.filter((o) => o.testCode === t.code).length;
    const set = (i: number, field: keyof Cell, v: string) => setWorking({ ...working, [segment]: cells.map((c, j) => (j === i ? { ...c, [field]: v } : c)) });

    return (
      <>
        <HmsDetailHeader
          icon={BookOpen}
          title={t.name}
          badge={<HmsBadge tone={STATUS_TONE[t.status]}>{t.version === 0 ? 'Never published' : hasDraft(t) ? 'Changes to publish' : 'Published'}</HmsBadge>}
          subtitle={`${t.code} · ${t.section} · ${t.sampleType} · ${t.container}`}
          actions={
            <>
              {savedDraft && (
                <HmsButton variant="danger" icon={Trash2} onClick={() => { LabDataStore.discardRangeDraft(t.code, by); notify(`Draft discarded for ${t.name}.`); }}>
                  Discard draft
                </HmsButton>
              )}
              <HmsButton variant="primary" icon={Send} onClick={() => publish(t)} disabled={!hasDraft(t) && !dirtyLive}>
                Publish v{t.version + 1}
              </HmsButton>
            </>
          }
        />
        <HmsStatStrip
          items={[
            { label: 'Live version', value: t.version ? `v${t.version}` : '—', note: t.lastPublished ? `Published ${t.lastPublished}` : 'Not published yet' },
            { label: 'Parameters', value: t.ranges.adultMale.length, note: 'Adult male panel' },
            { label: 'Turnaround', value: t.tatTarget, note: `STAT ${t.tatStat}` },
            { label: 'Ordered today', value: orderedToday, note: 'On the lab worklist' },
          ]}
        />
        <HmsDetailBody>
          {t.version === 0 && <HmsNotice tone="amber">New test — doctors cannot order it until you publish v1 and Lab Admin sets a price.</HmsNotice>}
          {t.version > 0 && hasDraft(t) && <HmsNotice tone="amber">{savedDraft ? `Draft saved${t.draftSavedBy ? ` by ${t.draftSavedBy}` : ''}.` : 'Marked as draft.'} Results are still flagged with v{t.version} until you publish.</HmsNotice>}
          {price?.status === 'No price' && <HmsNotice tone="red">No billing price. Lab Admin sets it in Test pricing before Billing can charge for this test.</HmsNotice>}

          <HmsSection
            title="Reference & critical ranges"
            right={
              <div role="group" aria-label="Patient group" style={{ display: 'flex', gap: '6px' }}>
                {SEGMENTS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={segment === s.key}
                    onClick={() => setSegment(s.key)}
                    style={{ height: '28px', padding: '0 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${segment === s.key ? HMS.primary : HMS.border}`, background: segment === s.key ? HMS.primary : '#ffffff', color: segment === s.key ? '#ffffff' : HMS.label }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            }
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) repeat(4, 88px)', gap: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, color: HMS.textSecondary, borderBottom: `1px solid ${HMS.divider}` }}>
              <span>Parameter</span>
              <span style={{ textAlign: 'right' }}>Low</span>
              <span style={{ textAlign: 'right' }}>High</span>
              <span style={{ textAlign: 'right', color: '#dc2626' }}>Critical low</span>
              <span style={{ textAlign: 'right', color: '#dc2626' }}>Critical high</span>
            </div>
            {cells.length === 0 && <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No ranges defined for this group.</div>}
            {cells.map((c, i) => {
              const r = live[i];
              const changed = r && !sameCell(c, r);
              const field = (f: keyof Cell, label: string) => (
                <input
                  type="number"
                  step="any"
                  aria-label={`${r?.name} ${label}`}
                  value={c[f]}
                  onChange={(e) => set(i, f, e.target.value)}
                  style={{ ...NUM, borderColor: r && c[f] !== str(r[f as keyof CatalogRangeItem] as number) ? '#f59e0b' : undefined, background: r && c[f] !== str(r[f as keyof CatalogRangeItem] as number) ? '#fffbeb' : '#ffffff' }}
                />
              );
              return (
                <div key={r?.name || i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) repeat(4, 88px)', gap: '8px', alignItems: 'center', padding: '8px 14px', borderBottom: i < cells.length - 1 ? `1px solid ${HMS.divider}` : 'none' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: HMS.text }}>{r?.name}</div>
                    <div style={{ fontSize: '12px', color: changed ? '#b45309' : HMS.textSecondary }}>
                      {r?.unit}
                      {changed ? ` · live ${r.low}–${r.high}` : ''}
                    </div>
                  </div>
                  {field('low', 'low')}
                  {field('high', 'high')}
                  {field('criticalLow', 'critical low')}
                  {field('criticalHigh', 'critical high')}
                </div>
              );
            })}
            <div style={{ padding: '12px 14px', borderTop: `1px solid ${HMS.divider}`, display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <HmsButton size="sm" icon={Save} onClick={() => saveDraft(t)} disabled={!unsaved}>
                Save draft
              </HmsButton>
              <HmsButton size="sm" icon={Undo2} onClick={() => { setWorking(toWorking(t.draftRanges || t.ranges)); setErrors([]); }} disabled={!unsaved}>
                Undo edits
              </HmsButton>
              {unsaved && <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 600 }}>Unsaved edits</span>}
            </div>
          </HmsSection>
          {errors.length > 0 && (
            <HmsNotice tone="red">
              {errors.slice(0, 4).join(' ')}
              {errors.length > 4 ? ` (+${errors.length - 4} more)` : ''}
            </HmsNotice>
          )}

          <HmsSection title="Specimen & billing" defaultOpen={false}>
            <HmsRow label="Sample · container" value={`${t.sampleType} · ${t.container}`} />
            <HmsRow label="Turnaround target" value={`${t.tatTarget} routine · ${t.tatStat} STAT`} />
            <HmsRow label="Billing price" hint="Managed by Lab Admin › Test pricing" value={price?.tariff ? inr(price.tariff.basePrice) : 'Not priced'} last />
          </HmsSection>

          {t.versionHistory && t.versionHistory.length > 0 && (
            <HmsSection title="Version history" defaultOpen={false}>
              {t.versionHistory.map((v, idx) => (
                <HmsRow
                  key={v.version}
                  last={idx === t.versionHistory!.length - 1}
                  label={`v${v.version}`}
                  hint={`${v.publishedByName || 'Publisher not recorded'}${v.notes ? ` · ${v.notes}` : ''}`}
                  value={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', color: HMS.textSecondary }}>{v.publishedAt ? new Date(v.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                      <HmsBadge tone={v.status === 'PUBLISHED' ? 'green' : 'gray'}>{v.status === 'PUBLISHED' ? 'Live' : 'Retired'}</HmsBadge>
                    </span>
                  }
                />
              ))}
            </HmsSection>
          )}

          <HmsSection title="Recent QC">
            {t.recentQc.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '13px', color: HMS.textSecondary }}>No QC runs recorded for this test.</div>
            ) : (
              t.recentQc.map((x, idx) => (
                <HmsRow key={`${x.level}-${idx}`} last={idx === t.recentQc.length - 1} label={x.level} hint={`${x.meta} · ${x.time}`} value={<HmsBadge tone={x.pass ? 'green' : 'red'}>{x.result}</HmsBadge>} />
              ))
            )}
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  const upd = (f: keyof NewTest, v: string) => adding && setAdding({ ...adding, [f]: v });

  return (
    <>
      <HmsMasterDetail
        listId="path-catalog"
        title="Test catalog & ranges"
        description="Reference and critical limits used to flag every result. Tests with changes to publish come first."
        total={catalog.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search test, code, section or sample"
        pills={pills}
        activePill={pill}
        onPill={setPill}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="edit ranges"
        onPrimary={() => requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-label="Test ranges details"] input')?.focus())}
        headerAction={
          <HmsButton variant="primary" icon={Plus} shortcut="Alt+N" onClick={() => setAdding({ ...EMPTY_TEST })}>
            Add test
          </HmsButton>
        }
        detailLabel="Test ranges"
        renderDetail={renderDetail}
      />

      {adding && (
        <HmsModal
          title="Add test"
          description="Added as a draft. Publish it after checking ranges for each patient group."
          onClose={() => { setAdding(null); setAddError(''); }}
          width={640}
          footer={
            <>
              <HmsButton onClick={() => setAdding(null)}>Cancel</HmsButton>
              <HmsButton variant="primary" icon={Plus} onClick={createTest}>
                Add as draft
              </HmsButton>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            <HmsField label="Test name" required>
              <input style={INPUT} value={adding.name} onChange={(e) => upd('name', e.target.value)} placeholder="e.g. Thyroid stimulating hormone" />
            </HmsField>
            <HmsField label="Code" required hint="Section-Test-Number">
              <input style={INPUT} value={adding.code} onChange={(e) => upd('code', e.target.value.toUpperCase())} placeholder="IMM-TSH-01" />
            </HmsField>
            <HmsField label="Section">
              <select style={INPUT} value={adding.section} onChange={(e) => upd('section', e.target.value)}>
                {Array.from(new Set([...sections, ...SECTIONS])).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </HmsField>
            <HmsField label="Sample · container">
              <div style={{ display: 'flex', gap: '8px' }}>
                <input style={INPUT} value={adding.sampleType} onChange={(e) => upd('sampleType', e.target.value)} aria-label="Sample type" />
                <input style={INPUT} value={adding.container} onChange={(e) => upd('container', e.target.value)} aria-label="Container" />
              </div>
            </HmsField>
            <HmsField label="Turnaround (routine)">
              <input style={INPUT} value={adding.tatTarget} onChange={(e) => upd('tatTarget', e.target.value)} placeholder="4 h" />
            </HmsField>
            <HmsField label="Turnaround (STAT)">
              <input style={INPUT} value={adding.tatStat} onChange={(e) => upd('tatStat', e.target.value)} placeholder="1 h" />
            </HmsField>
            <HmsField label="First parameter" required>
              <input style={INPUT} value={adding.paramName} onChange={(e) => upd('paramName', e.target.value)} placeholder="e.g. TSH" />
            </HmsField>
            <HmsField label="Unit" required>
              <input style={INPUT} value={adding.unit} onChange={(e) => upd('unit', e.target.value)} placeholder="µIU/mL" />
            </HmsField>
            <HmsField label="Reference low" required>
              <input type="number" step="any" style={INPUT} value={adding.low} onChange={(e) => upd('low', e.target.value)} />
            </HmsField>
            <HmsField label="Reference high" required>
              <input type="number" step="any" style={INPUT} value={adding.high} onChange={(e) => upd('high', e.target.value)} />
            </HmsField>
          </div>
          {addError && <HmsNotice tone="red">{addError}</HmsNotice>}
        </HmsModal>
      )}
    </>
  );
};

export default PathologistCatalogView;
