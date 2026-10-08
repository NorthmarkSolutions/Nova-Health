import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw, ShieldCheck } from 'lucide-react';
import { billingService, PackageCoverage, PackageDefinition, PackageLine, TariffItem } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { TariffServicePicker } from '../executive/TariffServicePicker';
import { Btn, C, Callout, Empty, Field, PageHeader, apiError, card, inputStyle, mono } from '../executive/executiveUi';
import { packageBlocker } from './pricingMath';

const STATUS: Record<string, [string, string, string]> = {
  DRAFT: ['Draft', C.muted, '#F3F4F6'],
  SCHEDULED: ['Scheduled', C.primary, C.primarySoft],
  ACTIVE: ['Active', C.green, C.greenSoft],
  RETIRED: ['Retired', C.red, C.redSoft]
};
const today = () => new Date().toLocaleDateString('en-CA');

interface Editable {
  code: string;
  name: string;
  department: string;
  package_price: string;
  length_of_stay_days: string;
  effective_from: string;
  overrun_rule: string;
  lines: PackageLine[];
}

const toEditable = (p: PackageDefinition): Editable => ({
  code: p.code,
  name: p.name,
  department: p.department,
  package_price: String(p.package_price || ''),
  length_of_stay_days: String(p.length_of_stay_days ?? 0),
  effective_from: p.effective_from || today(),
  overrun_rule: p.overrun_rule || '',
  lines: [...p.inclusions, ...p.exclusions]
});

/** Phase 6 A-06 Packages: fixed-price bundles; inclusions are absorbed up to an allowance, exclusions bill at tariff. */
export const PackagesScreen: React.FC = () => {
  const { format: fmt } = useCurrency();
  const [packages, setPackages] = useState<PackageDefinition[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<Editable | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cov, setCov] = useState<{ code: string; consumed: string; result: PackageCoverage | null }>({ code: '', consumed: '0', result: null });

  const load = useCallback(async (select?: string) => {
    try {
      const list = await billingService.listPackageDefinitions();
      setPackages(list);
      const pick = list.find((p) => p.code === (select ?? sel)) || list[0];
      if (pick) {
        setSel(pick.code);
        setDraft(toEditable(pick));
        setIsNew(false);
      }
      setError(null);
    } catch (err) {
      setError(apiError(err, 'Could not load packages.'));
    }
  }, [sel]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = packages.find((p) => p.code === sel);
  const select = (p: PackageDefinition) => {
    setSel(p.code);
    setDraft(toEditable(p));
    setIsNew(false);
    setNotice(null);
    setCov({ code: '', consumed: '0', result: null });
  };
  const newPackage = () => {
    setSel(null);
    setIsNew(true);
    setDraft({ code: '', name: '', department: 'SURGERY', package_price: '', length_of_stay_days: '1', effective_from: today(), overrun_rule: 'Extra days at ward tariff.', lines: [] });
  };

  const setField = (k: keyof Editable) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft((d) => (d ? { ...d, [k]: e.target.value } : d));
  const setLine = (i: number, patch: Partial<PackageLine>) => setDraft((d) => (d ? { ...d, lines: d.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) } : d));
  const addLine = (type: 'INCLUDED' | 'EXCLUDED', t?: TariffItem) =>
    setDraft((d) => (d ? { ...d, lines: [...d.lines, { inclusion_type: type, service_code: t?.code || '', service_name: t?.name || '', department: t?.department || '', max_quantity_covered: 1, is_mandatory: false }] } : d));
  const removeLine = (i: number) => setDraft((d) => (d ? { ...d, lines: d.lines.filter((_, j) => j !== i) } : d));

  const save = async (andPublish = false) => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        code: draft.code.trim().toUpperCase(), name: draft.name.trim(), department: draft.department,
        package_price: parseFloat(draft.package_price) || 0, length_of_stay_days: parseInt(draft.length_of_stay_days, 10) || 0,
        effective_from: draft.effective_from, overrun_rule: draft.overrun_rule,
        items: draft.lines.filter((l) => l.service_name.trim() || l.service_code.trim())
      };
      let saved = await billingService.savePackageDefinition(isNew ? null : draft.code, payload);
      if (andPublish) saved = await billingService.packageLifecycle(saved.code, 'publish');
      setNotice(andPublish ? `${saved.name} ${saved.status === 'SCHEDULED' ? `scheduled for ${saved.effective_from}` : 'published'}.` : `${saved.name} saved.`);
      await load(saved.code);
    } catch (err) {
      setError(apiError(err, 'Could not save the package.'));
    } finally {
      setBusy(false);
    }
  };

  const retire = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await billingService.packageLifecycle(current.code, 'retire');
      setNotice(`${current.name} retired · existing admissions unaffected.`);
      await load(current.code);
    } catch (err) {
      setError(apiError(err, 'Could not retire the package.'));
    } finally {
      setBusy(false);
    }
  };

  const checkCoverage = async () => {
    if (!current || !cov.code.trim()) return;
    try {
      const result = await billingService.checkPackageCoverage(current.code, cov.code.trim().toUpperCase(), parseInt(cov.consumed, 10) || 0);
      setCov((c) => ({ ...c, result }));
    } catch (err) {
      setError(apiError(err, 'Coverage check failed.'));
    }
  };

  const retired = current?.status === 'RETIRED';
  const inclusions = (draft?.lines || []).filter((l) => l.inclusion_type === 'INCLUDED');
  const blocker = draft ? packageBlocker({ package_price: parseFloat(draft.package_price) || 0, inclusions, status: current?.status || 'DRAFT' }) || (isNew && (!draft.code.trim() || !draft.name.trim()) ? 'Code and name are required' : '') : '';
  const changed = !!current && !!draft && (parseFloat(draft.package_price) !== current.package_price || draft.effective_from !== (current.effective_from || today()) || String(current.length_of_stay_days) !== draft.length_of_stay_days);

  const lineEditor = (type: 'INCLUDED' | 'EXCLUDED') => (
    <section style={{ ...card }}>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{type === 'INCLUDED' ? 'Inclusions' : 'Exclusions · billed separately'}</span>
        {!retired && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <TariffServicePicker onPick={(t) => addLine(type, t)} placeholder="Add a tariff service" />
            </div>
            <Btn style={{ height: 36 }} onClick={() => addLine(type)}><Plus size={14} /> Free-text line</Btn>
          </div>
        )}
      </div>
      {(draft?.lines || []).every((l) => l.inclusion_type !== type) && <Empty text={type === 'INCLUDED' ? 'No inclusions yet.' : 'No exclusions.'} />}
      {(draft?.lines || []).map((l, i) =>
        l.inclusion_type !== type ? null : (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: type === 'INCLUDED' ? '120px 1fr 70px 90px 28px' : '120px 1fr 28px', gap: 8, alignItems: 'center', padding: '8px 14px', borderBottom: `1px solid ${C.border}` }}>
            <input style={{ ...inputStyle, height: 32, fontSize: 12, ...mono }} value={l.service_code} disabled={retired} placeholder="Code" onChange={(e) => setLine(i, { service_code: e.target.value.toUpperCase() })} />
            <input style={{ ...inputStyle, height: 32, fontSize: 13 }} value={l.service_name} disabled={retired} placeholder="Description" onChange={(e) => setLine(i, { service_name: e.target.value })} />
            {type === 'INCLUDED' && (
              <>
                <input style={{ ...inputStyle, height: 32, fontSize: 13, ...mono }} title="Units covered" inputMode="numeric" value={l.max_quantity_covered} disabled={retired}
                  onChange={(e) => setLine(i, { max_quantity_covered: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                <label style={{ fontSize: 12, display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input type="checkbox" checked={l.is_mandatory} disabled={retired} onChange={(e) => setLine(i, { is_mandatory: e.target.checked })} /> Mandatory
                </label>
              </>
            )}
            {!retired && (
              <button aria-label="Remove line" onClick={() => removeLine(i)} style={{ border: 'none', background: 'transparent', color: C.muted, cursor: 'pointer', display: 'flex' }}>
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )
      )}
      {type === 'INCLUDED' && inclusions.some((l) => !l.service_code) && (
        <div style={{ padding: '8px 14px', fontSize: 12, color: C.muted }}>Lines without a tariff code are descriptive only; automatic coverage matches by code.</div>
      )}
    </section>
  );

  return (
    <>
      <PageHeader
        title="Packages"
        subtitle="Fixed-price bundles for surgery, maternity and day care. Charges inside a package are absorbed; exclusions bill separately."
        actions={
          <>
            <Btn onClick={() => load()}><RefreshCw size={16} /> Refresh</Btn>
            <Btn variant="primary" onClick={newPackage}><Plus size={16} /> New package</Btn>
          </>
        }
      />
      {error && <div style={{ marginBottom: 12 }}><Callout tone="red">{error}</Callout></div>}
      {notice && <div style={{ marginBottom: 12 }}><Callout tone="green">{notice}</Callout></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {packages.length === 0 && <div style={card}><Empty text="No packages defined yet." /></div>}
          {packages.map((p) => {
            const [label, fg, bg] = STATUS[p.status] || [p.status, C.textSub, '#F3F4F6'];
            return (
              <div key={p.code} onClick={() => select(p)} style={{ ...card, padding: 14, cursor: 'pointer', borderColor: sel === p.code ? C.primary : C.border, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: fg, background: bg, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>{label}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.muted }}>
                  <span style={mono}>{fmt(p.package_price)}</span>
                  <span>{p.length_of_stay_days ? `${p.length_of_stay_days}-day stay` : 'Day care'} · {p.inclusions.length} inclusions</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, gridColumn: 'span 2' }}>
          {!draft && <Empty text="Select a package or create a new one." />}
          {draft && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 17, fontWeight: 600 }}>{isNew ? 'New package' : draft.name}</span>
                  <span style={{ fontSize: 13, color: C.muted, ...mono }}>{isNew ? 'Draft' : `${draft.code} · ${draft.department}${current?.effective_from ? ` · effective ${current.effective_from}` : ''}`}</span>
                </div>
                {current && <span style={{ fontSize: 12, fontWeight: 500, color: STATUS[current.status][1], background: STATUS[current.status][2], padding: '2px 8px', borderRadius: 999, alignSelf: 'flex-start' }}>{STATUS[current.status][0]}</span>}
              </div>

              {isNew && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Field label="Code"><input style={{ ...inputStyle, width: 150, ...mono }} value={draft.code} onChange={setField('code')} placeholder="PKG-ORT-014" /></Field>
                  <div style={{ flex: 1, minWidth: 200 }}><Field label="Name"><input style={inputStyle} value={draft.name} onChange={setField('name')} /></Field></div>
                  <Field label="Department"><input style={{ ...inputStyle, width: 150 }} value={draft.department} onChange={setField('department')} /></Field>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Field label="Package price (₹)"><input style={{ ...inputStyle, width: 140, ...mono }} inputMode="decimal" value={draft.package_price} disabled={retired} onChange={setField('package_price')} /></Field>
                <Field label="Length of stay (days)"><input style={{ ...inputStyle, width: 110, ...mono }} inputMode="numeric" value={draft.length_of_stay_days} disabled={retired} onChange={setField('length_of_stay_days')} /></Field>
                <Field label="Effective from"><input type="date" style={inputStyle} value={draft.effective_from} disabled={retired} onChange={setField('effective_from')} /></Field>
              </div>

              {lineEditor('INCLUDED')}
              {lineEditor('EXCLUDED')}

              <Field label="Overrun rule">
                <textarea rows={2} style={{ ...inputStyle, height: 'auto', padding: 10 }} value={draft.overrun_rule} disabled={retired} onChange={setField('overrun_rule')} />
              </Field>

              {current && (
                <Callout tone="neutral">
                  {current.status === 'ACTIVE'
                    ? 'Changes apply to new admissions only; admitted package cases keep the terms they started with.'
                    : current.status === 'RETIRED'
                      ? 'Retired: no longer selectable at admission. Existing admissions are unaffected.'
                      : `Not yet available at counters. Publishing makes it selectable from ${draft.effective_from}.`}
                </Callout>
              )}

              {current && current.status !== 'DRAFT' && (
                <section style={{ ...card, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, display: 'flex', gap: 6, alignItems: 'center' }}><ShieldCheck size={15} /> Coverage check</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <Field label="Tariff code"><input style={{ ...inputStyle, width: 150, ...mono }} value={cov.code} onChange={(e) => setCov({ ...cov, code: e.target.value, result: null })} /></Field>
                    <Field label="Already used"><input style={{ ...inputStyle, width: 90, ...mono }} inputMode="numeric" value={cov.consumed} onChange={(e) => setCov({ ...cov, consumed: e.target.value, result: null })} /></Field>
                    <Btn onClick={checkCoverage} disabled={!cov.code.trim()}>Check</Btn>
                  </div>
                  {cov.result && <Callout tone={cov.result.covered ? 'green' : cov.result.excluded ? 'red' : 'amber'}>{cov.result.reason}</Callout>}
                </section>
              )}

              {!retired && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: blocker ? C.amber : C.muted }}>{blocker || (current?.status === 'ACTIVE' ? 'Live package · edits are audited' : 'Ready to publish')}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {current?.status === 'ACTIVE' && <Btn variant="danger" disabled={busy} onClick={retire}>Retire</Btn>}
                    <Btn disabled={busy || (isNew && (!draft.code.trim() || !draft.name.trim()))} onClick={() => save(false)}>{current?.status === 'ACTIVE' ? 'Save revision' : 'Save draft'}</Btn>
                    {current?.status !== 'ACTIVE' && <Btn variant="primary" disabled={busy || !!blocker} onClick={() => save(true)}>Publish</Btn>}
                    {current?.status === 'ACTIVE' && changed && <span style={{ fontSize: 12, color: C.amber, alignSelf: 'center' }}>Unsaved changes</span>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
