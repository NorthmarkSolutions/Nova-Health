import React, { useCallback, useEffect, useState } from 'react';
import { Calculator, Moon, Plus, Trash2 } from 'lucide-react';
import { billingService, CorporateAccount, MarkupSchedule, PackageDefinition, QuotationResult, TariffItem } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { TariffServicePicker } from '../executive/TariffServicePicker';
import { Btn, C, Callout, Empty, Field, PageHeader, Row, apiError, card, inputStyle, mono } from '../executive/executiveUi';
import { windowActive } from './pricingMath';

const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

/** Phase 6 pricing sandbox: quote any mix of services with packages, emergency timing and sponsors. */
export const PricingScreen: React.FC = () => {
  const { format: fmt } = useCurrency();
  const [lines, setLines] = useState<Array<{ tariff: TariffItem; qty: number }>>([]);
  const [packages, setPackages] = useState<PackageDefinition[]>([]);
  const [corporates, setCorporates] = useState<CorporateAccount[]>([]);
  const [pkg, setPkg] = useState('');
  const [corp, setCorp] = useState('');
  const [emergency, setEmergency] = useState(false);
  const [at, setAt] = useState(localNow());
  const [quote, setQuote] = useState<QuotationResult | null>(null);
  const [schedules, setSchedules] = useState<MarkupSchedule[]>([]);
  const [newSch, setNewSch] = useState({ label: 'Night surcharge', department: 'ALL', markup_percentage: '50', applies_from_time: '22:00', applies_to_time: '06:00', is_weekend_active: false });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSchedules = useCallback(async () => {
    try {
      setSchedules(await billingService.getMarkupSchedules());
    } catch (err) {
      setError(apiError(err, 'Could not load markup schedules.'));
    }
  }, []);

  useEffect(() => {
    loadSchedules();
    billingService.listPackageDefinitions({ status: 'ACTIVE' }).then(setPackages).catch(() => setPackages([]));
    billingService.getCorporateAccounts().then(setCorporates).catch(() => setCorporates([]));
  }, [loadSchedules]);

  const add = (t: TariffItem) => setLines((ls) => (ls.some((l) => l.tariff.code === t.code) ? ls.map((l) => (l.tariff.code === t.code ? { ...l, qty: l.qty + 1 } : l)) : [...ls, { tariff: t, qty: 1 }]));

  const run = async () => {
    setError(null);
    try {
      setQuote(await billingService.calculateQuote({
        items: lines.map((l) => ({ service_code: l.tariff.code, qty: l.qty })),
        is_emergency: emergency,
        encounter_type: emergency ? 'EMERGENCY' : 'OPD',
        package_code: pkg || undefined,
        corporate_account_id: corp || undefined,
        at: at ? `${at}:00` : undefined
      }));
    } catch (err) {
      setQuote(null);
      setError(apiError(err, 'Quote failed.'));
    }
  };

  const saveSchedule = async (id: string | null, payload: Partial<MarkupSchedule>, msg: string) => {
    setError(null);
    try {
      await billingService.saveMarkupSchedule(id, payload);
      setNotice(msg);
      await loadSchedules();
    } catch (err) {
      setError(apiError(err, 'Could not save the schedule.'));
    }
  };

  const atDate = at ? new Date(at) : new Date();
  return (
    <>
      <PageHeader title="Pricing" subtitle="Quote any mix of services against the live tariff, packages, emergency timing and sponsor terms. Nothing is billed from here." />
      {error && <div style={{ marginBottom: 12 }}><Callout tone="red">{error}</Callout></div>}
      {notice && <div style={{ marginBottom: 12 }}><Callout tone="green">{notice}</Callout></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, alignItems: 'start', marginBottom: 16 }}>
        <section style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 15, display: 'flex', gap: 6, alignItems: 'center' }}><Calculator size={16} /> Quotation simulator</span>
          <TariffServicePicker onPick={add} />
          {lines.length === 0 && <Empty text="Add services to quote." />}
          {lines.map((l) => (
            <div key={l.tariff.code} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 28px', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <span>{l.tariff.name} <span style={{ color: C.muted, ...mono }}>· {l.tariff.code} · {fmt(Number(l.tariff.base_price))}</span></span>
              <input style={{ ...inputStyle, height: 32, ...mono }} inputMode="numeric" value={l.qty}
                onChange={(e) => setLines((ls) => ls.map((x) => (x.tariff.code === l.tariff.code ? { ...x, qty: Math.max(1, parseInt(e.target.value, 10) || 1) } : x)))} />
              <button aria-label={`Remove ${l.tariff.name}`} onClick={() => setLines((ls) => ls.filter((x) => x.tariff.code !== l.tariff.code))} style={{ border: 'none', background: 'transparent', color: C.muted, cursor: 'pointer', display: 'flex' }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Field label="Package">
              <select style={inputStyle} value={pkg} onChange={(e) => setPkg(e.target.value)}>
                <option value="">No package</option>
                {packages.map((p) => <option key={p.code} value={p.code}>{p.name} · {fmt(p.package_price)}</option>)}
              </select>
            </Field>
            <Field label="Sponsor">
              <select style={inputStyle} value={corp} onChange={(e) => setCorp(e.target.value)}>
                <option value="">Self pay</option>
                {corporates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, height: 40 }}>
              <input type="checkbox" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} /> Emergency encounter
            </label>
            <Field label="Time of service"><input type="datetime-local" style={inputStyle} value={at} onChange={(e) => setAt(e.target.value)} /></Field>
          </div>
          <Btn variant="primary" disabled={!lines.length && !pkg} onClick={run}>Calculate quote</Btn>
        </section>

        <section style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Quote</span>
          {!quote && <Empty text="Run the simulator to see the breakdown." />}
          {quote && (
            <>
              {quote.items.map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: l.is_package ? 600 : 400 }}>{l.description} × {l.qty}</span>
                    <span style={{ fontSize: 12, color: l.covered_by_package ? C.green : C.muted }}>
                      {l.covered_by_package ? `Included in package (standard ${fmt(Number(l.standard_price) * l.qty)})` : l.coverage_note || ''}
                      {l.markup_source ? ` ${l.markup_source}` : ''}
                      {Number(l.tax_amount) ? ` · GST ${fmt(Number(l.tax_amount))}` : ''}
                    </span>
                  </span>
                  <span style={{ ...mono, color: l.covered_by_package ? C.green : C.text }}>{fmt(Number(l.total))}</span>
                </div>
              ))}
              <Row label="Gross" value={fmt(Number(quote.gross_total))} />
              <Row label="GST" value={fmt(Number(quote.total_tax))} />
              {quote.package && <Row label="Absorbed by package" value={fmt(Number(quote.package.absorbed_value))} color={C.green} />}
              <Row label="Net payable" value={fmt(Number(quote.net_payable))} strong />
              {quote.corporate_name && (
                <>
                  <Row label={`${quote.corporate_name} pays`} value={fmt(Number(quote.sponsor_responsibility))} />
                  <Row label="Patient pays" value={fmt(Number(quote.patient_responsibility))} strong />
                </>
              )}
            </>
          )}
        </section>
      </div>

      <section style={{ ...card }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 15, display: 'flex', gap: 6, alignItems: 'center' }}><Moon size={16} /> Emergency markup schedules</span>
          <span style={{ fontSize: 12, color: C.muted }}>Applied to emergency encounters inside the window; otherwise the service's flat emergency markup applies.</span>
        </div>
        {schedules.length === 0 && <Empty text="No time-based schedules." />}
        {schedules.map((s) => {
          const live = s.is_active && windowActive(s.applies_from_time, s.applies_to_time, atDate, s.is_weekend_active);
          return (
            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,1.5fr) 110px 90px 130px 100px auto', gap: 10, alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 13, opacity: s.is_active ? 1 : 0.55 }}>
              <span>{s.label}</span>
              <span>{s.department}</span>
              <span style={mono}>+{s.markup_percentage}%</span>
              <span style={mono}>{s.applies_from_time}–{s.applies_to_time}{s.is_weekend_active ? ' · wknd' : ''}</span>
              <span style={{ fontSize: 12, color: live ? C.green : C.muted }}>{live ? 'Applies at quote time' : s.is_active ? 'Not at quote time' : 'Inactive'}</span>
              <Btn style={{ height: 28, fontSize: 12 }} onClick={() => saveSchedule(s.id, { is_active: !s.is_active }, `${s.label} ${s.is_active ? 'deactivated' : 'activated'}.`)}>
                {s.is_active ? 'Deactivate' : 'Activate'}
              </Btn>
            </div>
          );
        })}
        <div style={{ padding: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Field label="Label"><input style={{ ...inputStyle, width: 160 }} value={newSch.label} onChange={(e) => setNewSch({ ...newSch, label: e.target.value })} /></Field>
          <Field label="Department"><input style={{ ...inputStyle, width: 120 }} value={newSch.department} onChange={(e) => setNewSch({ ...newSch, department: e.target.value.toUpperCase() })} /></Field>
          <Field label="Markup %"><input style={{ ...inputStyle, width: 80, ...mono }} inputMode="decimal" value={newSch.markup_percentage} onChange={(e) => setNewSch({ ...newSch, markup_percentage: e.target.value })} /></Field>
          <Field label="From"><input type="time" style={inputStyle} value={newSch.applies_from_time} onChange={(e) => setNewSch({ ...newSch, applies_from_time: e.target.value })} /></Field>
          <Field label="To"><input type="time" style={inputStyle} value={newSch.applies_to_time} onChange={(e) => setNewSch({ ...newSch, applies_to_time: e.target.value })} /></Field>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, height: 40 }}>
            <input type="checkbox" checked={newSch.is_weekend_active} onChange={(e) => setNewSch({ ...newSch, is_weekend_active: e.target.checked })} /> All day on weekends
          </label>
          <Btn variant="primary" disabled={!(parseFloat(newSch.markup_percentage) > 0)}
            onClick={() => saveSchedule(null, { ...newSch, markup_percentage: parseFloat(newSch.markup_percentage) }, `${newSch.label} added.`)}>
            <Plus size={14} /> Add schedule
          </Btn>
        </div>
      </section>
    </>
  );
};
