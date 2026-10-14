// Billing · Admin — fixed-price packages (surgery, maternity, day care). Inclusions are absorbed up to an allowance;
// exclusions bill at tariff. Draft → publish (now or on the effective date) → retire; live edits apply to new admissions.
import React, { useCallback, useEffect, useState } from 'react';
import { Package, Plus, Trash2, Save, Send, Archive, ShieldCheck } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsNotice, HmsEmpty, HmsField, HmsTone, INPUT, TEXTAREA, HMS } from '../../../components/hms';
import { billingService, PackageCoverage, PackageDefinition, PackageLine, TariffItem } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { packageBlocker } from './pricingMath';
import { MONO, fmtDate, todayIso } from './adminDeskData';
import { AdmTariffSearch } from './adminUi';

export interface AdmPackagesViewProps {
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
  newSignal: number;
}

const STATUS: Record<string, { label: string; tone: HmsTone }> = {
  DRAFT: { label: 'Draft', tone: 'gray' },
  SCHEDULED: { label: 'Scheduled', tone: 'blue' },
  ACTIVE: { label: 'Active', tone: 'green' },
  RETIRED: { label: 'Retired', tone: 'red' },
};
const PILLS = ['all', 'ACTIVE', 'pending', 'RETIRED'];
const NEW = '__new__';

interface Draft {
  code: string;
  name: string;
  department: string;
  price: string;
  los: string;
  effective: string;
  overrun: string;
  lines: PackageLine[];
}

const toDraft = (p: PackageDefinition): Draft => ({
  code: p.code,
  name: p.name,
  department: p.department,
  price: String(p.package_price || ''),
  los: String(p.length_of_stay_days ?? 0),
  effective: p.effective_from || todayIso(),
  overrun: p.overrun_rule || '',
  lines: [...p.inclusions, ...p.exclusions],
});
const newDraft = (): Draft => ({ code: '', name: '', department: 'SURGERY', price: '', los: '1', effective: todayIso(), overrun: 'Extra days billed at ward tariff.', lines: [] });

export const AdmPackagesView: React.FC<AdmPackagesViewProps> = ({ notify, initialFilter, initialSelect, newSignal }) => {
  const { format } = useCurrency();
  const [packages, setPackages] = useState<PackageDefinition[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `p:${initialSelect}` : null);
  const [draft, setDraft] = useState<{ for: string; d: Draft } | null>(null);
  const [cov, setCov] = useState<{ code: string; used: string; result: PackageCoverage | null }>({ code: '', used: '0', result: null });
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState(newSignal);

  if (newSignal !== seen) {
    setSeen(newSignal);
    setDraft({ for: NEW, d: newDraft() });
  }

  const load = useCallback(async () => {
    try {
      setPackages(await billingService.listPackageDefinitions());
      setFailed(null);
    } catch (e) {
      setFailed(apiError(e, 'Packages could not be loaded.'));
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const list = packages || [];
  const match = (p: PackageDefinition, f: string) => (f === 'all' ? true : f === 'pending' ? p.status === 'DRAFT' || p.status === 'SCHEDULED' : p.status === f);
  const q = search.trim().toLowerCase();
  const visible = list.filter((p) => match(p, pill) && (!q || [p.name, p.code, p.department].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = visible.map((p) => ({
    key: `p:${p.code}`,
    title: p.name,
    badge: <HmsBadge tone={(STATUS[p.status] || STATUS.DRAFT).tone}>{(STATUS[p.status] || { label: p.status }).label}</HmsBadge>,
    sub: (
      <>
        <span style={MONO}>{p.code}</span> · {p.department}
      </>
    ),
    metaLeft: `${p.length_of_stay_days ? `${p.length_of_stay_days}-day stay` : 'Day care'} · ${p.inclusions.length} inclusion${p.inclusions.length === 1 ? '' : 's'}`,
    metaRight: format(p.package_price),
  }));

  const activeKey = draft?.for === NEW ? NEW : rows.find((r) => r.key === selected)?.key ?? rows[0]?.key ?? null;
  const current = activeKey && activeKey !== NEW ? list.find((p) => `p:${p.code}` === activeKey) : undefined;
  const d: Draft | null = draft && draft.for === activeKey ? draft.d : current ? toDraft(current) : null;
  const setD = (patch: Partial<Draft>) => d && activeKey && setDraft({ for: activeKey, d: { ...d, ...patch } });
  const setLine = (i: number, patch: Partial<PackageLine>) => d && setD({ lines: d.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const addLine = (type: 'INCLUDED' | 'EXCLUDED', t?: TariffItem) =>
    d && setD({ lines: [...d.lines, { inclusion_type: type, service_code: t?.code || '', service_name: t?.name || '', department: t?.department || '', max_quantity_covered: 1, is_mandatory: false }] });

  const save = async (publish: boolean) => {
    if (!d) return;
    const isNew = activeKey === NEW;
    setBusy(true);
    try {
      let saved = await billingService.savePackageDefinition(isNew ? null : d.code, {
        code: d.code.trim().toUpperCase(),
        name: d.name.trim(),
        department: d.department,
        package_price: parseFloat(d.price) || 0,
        length_of_stay_days: parseInt(d.los, 10) || 0,
        effective_from: d.effective,
        overrun_rule: d.overrun,
        items: d.lines.filter((l) => l.service_name.trim() || l.service_code.trim()),
      });
      if (publish) saved = await billingService.packageLifecycle(saved.code, 'publish');
      notify(publish ? `${saved.name} ${saved.status === 'SCHEDULED' ? `scheduled for ${fmtDate(saved.effective_from)}` : 'published'}` : `${saved.name} saved`);
      setDraft(null);
      setSelected(`p:${saved.code}`);
      await load();
    } catch (e) {
      notify(apiError(e, 'The package could not be saved'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const retire = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await billingService.packageLifecycle(current.code, 'retire');
      notify(`${current.name} retired · existing admissions are unaffected`);
      setDraft(null);
      await load();
    } catch (e) {
      notify(apiError(e, 'The package could not be retired'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    if (!current || !cov.code.trim()) return;
    try {
      const result = await billingService.checkPackageCoverage(current.code, cov.code.trim().toUpperCase(), parseInt(cov.used, 10) || 0);
      setCov({ ...cov, result });
    } catch (e) {
      notify(apiError(e, 'The coverage check failed'), 'error');
    }
  };

  const lineEditor = (type: 'INCLUDED' | 'EXCLUDED', retired: boolean) => {
    if (!d) return null;
    const mine = d.lines.map((l, i) => ({ l, i })).filter((x) => x.l.inclusion_type === type);
    return (
      <HmsSection title={type === 'INCLUDED' ? `Inclusions · ${mine.length}` : `Exclusions · billed separately · ${mine.length}`} padded>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!retired && <AdmTariffSearch onPick={(t) => addLine(type, t)} placeholder={type === 'INCLUDED' ? 'Add an included tariff service' : 'Add an excluded tariff service'} />}
          {mine.length === 0 && <span style={{ fontSize: '13px', color: HMS.textSecondary }}>{type === 'INCLUDED' ? 'No inclusions yet.' : 'No exclusions.'}</span>}
          {mine.map(({ l, i }) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: type === 'INCLUDED' ? '140px minmax(0, 1fr) 80px auto 36px' : '140px minmax(0, 1fr) 36px', gap: '8px', alignItems: 'center' }}>
              <input aria-label="Service code" style={{ ...INPUT, ...MONO }} value={l.service_code} disabled={retired} placeholder="Code" onChange={(e) => setLine(i, { service_code: e.target.value.toUpperCase() })} />
              <input aria-label="Description" style={INPUT} value={l.service_name} disabled={retired} placeholder="Description" onChange={(e) => setLine(i, { service_name: e.target.value })} />
              {type === 'INCLUDED' && (
                <>
                  <input aria-label="Units covered" title="Units covered" style={INPUT} inputMode="numeric" value={l.max_quantity_covered} disabled={retired} onChange={(e) => setLine(i, { max_quantity_covered: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                  <label style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', fontSize: '13px', color: HMS.label }}>
                    <input type="checkbox" checked={l.is_mandatory} disabled={retired} onChange={(e) => setLine(i, { is_mandatory: e.target.checked })} /> Mandatory
                  </label>
                </>
              )}
              {!retired && (
                <HmsButton size="sm" variant="ghost" icon={Trash2} aria-label={`Remove ${l.service_name || 'line'}`} title="Remove line" onClick={() => setD({ lines: d.lines.filter((_, j) => j !== i) })} />
              )}
            </div>
          ))}
        </div>
      </HmsSection>
    );
  };

  const renderDetail = () => {
    if (!packages && !failed) return <HmsEmpty>Loading packages…</HmsEmpty>;
    if (failed) return <HmsEmpty>{failed}</HmsEmpty>;
    if (!d) return <HmsEmpty>{list.length ? 'Select a package from the list.' : 'No packages yet. Create one with Alt+N.'}</HmsEmpty>;
    const isNew = activeKey === NEW;
    const status = current?.status || 'DRAFT';
    const retired = status === 'RETIRED';
    const inclusions = d.lines.filter((l) => l.inclusion_type === 'INCLUDED');
    const blocker = packageBlocker({ package_price: parseFloat(d.price) || 0, inclusions, status }) || (isNew && (!d.code.trim() || !d.name.trim()) ? 'Code and name are required' : '');
    const dirty = !!draft && draft.for === activeKey;
    return (
      <>
        <HmsDetailHeader icon={Package} title={isNew ? 'New package' : d.name} badge={<HmsBadge tone={(STATUS[status] || STATUS.DRAFT).tone}>{(STATUS[status] || STATUS.DRAFT).label}</HmsBadge>} subtitle={isNew ? 'Draft · not yet saved' : <><span style={MONO}>{d.code}</span> · {d.department}{current?.effective_from ? ` · effective ${fmtDate(current.effective_from)}` : ''}</>} />
        <HmsStatStrip
          items={[
            { label: 'Package price', value: parseFloat(d.price) > 0 ? format(parseFloat(d.price)) : '—' },
            { label: 'Stay', value: parseInt(d.los, 10) ? `${parseInt(d.los, 10)} days` : 'Day care' },
            { label: 'Inclusions', value: inclusions.length, note: `${inclusions.filter((l) => l.is_mandatory).length} mandatory` },
            { label: 'Exclusions', value: d.lines.length - inclusions.length, note: 'Billed at tariff' },
          ]}
        />
        <HmsDetailBody>
          {status === 'ACTIVE' && <HmsNotice tone="blue">Live package. Changes apply to new admissions only; admitted cases keep the terms they started with.</HmsNotice>}
          {retired && <HmsNotice tone="amber">Retired: no longer selectable at admission. Existing admissions are unaffected.</HmsNotice>}
          {dirty && !retired && <HmsNotice tone="amber">Unsaved changes.</HmsNotice>}
          <HmsSection title="Terms" padded>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
              {isNew && (
                <>
                  <HmsField label="Code" htmlFor="pk-code" required>
                    <input id="pk-code" autoFocus style={{ ...INPUT, ...MONO }} value={d.code} onChange={(e) => setD({ code: e.target.value })} placeholder="PKG-ORT-014" />
                  </HmsField>
                  <HmsField label="Department" htmlFor="pk-dept">
                    <input id="pk-dept" style={INPUT} value={d.department} onChange={(e) => setD({ department: e.target.value.toUpperCase() })} />
                  </HmsField>
                </>
              )}
              <HmsField label="Name" htmlFor="pk-name" required>
                <input id="pk-name" style={INPUT} value={d.name} disabled={retired} onChange={(e) => setD({ name: e.target.value })} />
              </HmsField>
              <HmsField label="Package price" htmlFor="pk-price" required>
                <input id="pk-price" style={INPUT} inputMode="decimal" value={d.price} disabled={retired} onChange={(e) => setD({ price: e.target.value })} />
              </HmsField>
              <HmsField label="Length of stay (days)" htmlFor="pk-los" hint="0 for day care.">
                <input id="pk-los" style={INPUT} inputMode="numeric" value={d.los} disabled={retired} onChange={(e) => setD({ los: e.target.value })} />
              </HmsField>
              <HmsField label="Effective from" htmlFor="pk-eff">
                <input id="pk-eff" type="date" style={INPUT} value={d.effective} disabled={retired} onChange={(e) => setD({ effective: e.target.value })} />
              </HmsField>
            </div>
            <div style={{ marginTop: '16px' }}>
              <HmsField label="Overrun rule" htmlFor="pk-over" hint="What the patient pays beyond the package stay or allowances.">
                <textarea id="pk-over" style={TEXTAREA} value={d.overrun} disabled={retired} onChange={(e) => setD({ overrun: e.target.value })} />
              </HmsField>
            </div>
          </HmsSection>
          {lineEditor('INCLUDED', retired)}
          {lineEditor('EXCLUDED', retired)}
          {current && status !== 'DRAFT' && (
            <HmsSection title="Coverage check" padded>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 120px auto', gap: '10px', alignItems: 'end' }}>
                <HmsField label="Tariff code" htmlFor="pk-cov">
                  <input id="pk-cov" style={{ ...INPUT, ...MONO }} value={cov.code} onChange={(e) => setCov({ ...cov, code: e.target.value, result: null })} />
                </HmsField>
                <HmsField label="Already used" htmlFor="pk-used">
                  <input id="pk-used" style={INPUT} inputMode="numeric" value={cov.used} onChange={(e) => setCov({ ...cov, used: e.target.value, result: null })} />
                </HmsField>
                <HmsButton icon={ShieldCheck} disabled={!cov.code.trim()} onClick={check}>
                  Check
                </HmsButton>
              </div>
              {cov.result && (
                <div style={{ marginTop: '12px' }}>
                  <HmsNotice tone={cov.result.covered ? 'green' : cov.result.excluded ? 'red' : 'amber'}>{cov.result.reason}</HmsNotice>
                </div>
              )}
            </HmsSection>
          )}
        </HmsDetailBody>
        {!retired && (
          <HmsDetailFooter>
            {blocker && <span style={{ display: 'block', fontSize: '12px', color: '#b45309', marginBottom: '8px' }}>{blocker}</span>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
              {status === 'ACTIVE' ? (
                <>
                  <HmsButton variant="danger" icon={Archive} block disabled={busy} onClick={retire}>
                    Retire
                  </HmsButton>
                  <HmsButton variant="primary" icon={Save} block disabled={busy || !dirty || !!blocker} onClick={() => save(false)}>
                    Save revision
                  </HmsButton>
                </>
              ) : (
                <>
                  <HmsButton icon={Save} block disabled={busy || (isNew && (!d.code.trim() || !d.name.trim()))} onClick={() => save(false)}>
                    Save draft
                  </HmsButton>
                  <HmsButton variant="primary" icon={Send} block disabled={busy || !!blocker} onClick={() => save(true)}>
                    Publish
                  </HmsButton>
                </>
              )}
            </div>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="adm-packages"
      title="Health packages"
      description="Fixed-price bundles. Charges inside a package are absorbed; exclusions bill separately."
      total={list.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search package, code or department"
      headerAction={
        <HmsButton size="sm" icon={Plus} onClick={() => setDraft({ for: NEW, d: newDraft() })} title="New package (Alt+N)" aria-keyshortcuts="Alt+N">
          New
        </HmsButton>
      }
      pills={[
        { key: 'all', label: 'All', count: list.length },
        { key: 'ACTIVE', label: 'Active', count: list.filter((p) => p.status === 'ACTIVE').length },
        { key: 'pending', label: 'Draft / scheduled', count: list.filter((p) => p.status === 'DRAFT' || p.status === 'SCHEDULED').length },
        { key: 'RETIRED', label: 'Retired', count: list.filter((p) => p.status === 'RETIRED').length },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
        setDraft(null);
      }}
      selectedKey={activeKey === NEW ? null : selected}
      onSelect={(k) => {
        if (draft && draft.for !== k) setDraft(null);
        setSelected(k);
        setCov({ code: '', used: '0', result: null });
      }}
      primaryLabel="edit package"
      detailLabel="Package"
      emptyText="No packages match this search or filter."
      renderDetail={renderDetail}
    />
  );
};
