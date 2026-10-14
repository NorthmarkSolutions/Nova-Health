// Billing · Admin — pricing rules. Time-based emergency markup schedules (night / weekend surcharges) live here, plus
// a quotation calculator that prices any mix of services against the live tariff, packages, timing and sponsor terms.
// Nothing is billed from this screen.
import React, { useCallback, useEffect, useState } from 'react';
import { Moon, Plus, Power, Calculator, Trash2 } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsField, HmsToggle, INPUT, HMS } from '../../../components/hms';
import { billingService, CorporateAccount, MarkupSchedule, PackageDefinition, QuotationResult, TariffItem } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { windowActive } from './pricingMath';
import { MONO, num } from './adminDeskData';
import { AdmTariffSearch } from './adminUi';

export interface AdmPricingViewProps {
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  newSignal: number;
  quoteSignal: number;
}

const PILLS = ['all', 'live', 'active', 'inactive'];
const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export const AdmPricingView: React.FC<AdmPricingViewProps> = ({ notify, initialFilter, newSignal, quoteSignal }) => {
  const { format } = useCurrency();
  const [schedules, setSchedules] = useState<MarkupSchedule[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [add, setAdd] = useState<null | { label: string; department: string; markup: string; from: string; to: string; weekend: boolean }>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [seenNew, setSeenNew] = useState(newSignal);
  const [seenQuote, setSeenQuote] = useState(quoteSignal);
  const blankAdd = () => ({ label: 'Night surcharge', department: 'ALL', markup: '50', from: '22:00', to: '06:00', weekend: false });

  if (newSignal !== seenNew) {
    setSeenNew(newSignal);
    setAdd(blankAdd());
  }
  if (quoteSignal !== seenQuote) {
    setSeenQuote(quoteSignal);
    setQuoteOpen(true);
  }

  const load = useCallback(async () => {
    try {
      setSchedules(await billingService.getMarkupSchedules());
      setFailed(null);
    } catch (e) {
      setFailed(apiError(e, 'Markup schedules could not be loaded.'));
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const [now] = useState(() => new Date());
  const list = schedules || [];
  const live = (s: MarkupSchedule) => s.is_active && windowActive(s.applies_from_time, s.applies_to_time, now, s.is_weekend_active);
  const match = (s: MarkupSchedule, p: string) => (p === 'all' ? true : p === 'live' ? live(s) : p === 'active' ? s.is_active : !s.is_active);
  const q = search.trim().toLowerCase();
  const visible = list.filter((s) => match(s, pill) && (!q || [s.label, s.department].some((v) => (v || '').toLowerCase().includes(q))));
  const rows: HmsListRow[] = visible.map((s) => ({
    key: `s:${s.id}`,
    title: s.label,
    badge: !s.is_active ? <HmsBadge tone="gray">Inactive</HmsBadge> : live(s) ? <HmsBadge tone="green">Applies now</HmsBadge> : <HmsBadge tone="blue">Active</HmsBadge>,
    sub: `${s.department === 'ALL' ? 'All departments' : s.department} · +${s.markup_percentage}%`,
    metaLeft: `${s.applies_from_time}–${s.applies_to_time}`,
    metaRight: s.is_weekend_active ? 'All day on weekends' : 'Weekdays & weekends',
  }));

  const save = async (id: string | null, payload: Partial<MarkupSchedule>, msg: string) => {
    setBusy(true);
    try {
      await billingService.saveMarkupSchedule(id, payload);
      notify(msg);
      setAdd(null);
      await load();
    } catch (e) {
      notify(apiError(e, 'The schedule could not be saved'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const renderDetail = (key: string | null) => {
    if (!schedules && !failed) return <HmsEmpty>Loading markup schedules…</HmsEmpty>;
    if (failed) return <HmsEmpty>{failed}</HmsEmpty>;
    const s = list.find((x) => `s:${x.id}` === key);
    if (!s) return <HmsEmpty>{list.length ? 'Select a schedule from the list.' : 'No time-based schedules: emergency encounters use each service’s flat markup. Add one with Alt+N.'}</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={Moon} title={s.label} badge={!s.is_active ? <HmsBadge tone="gray">Inactive</HmsBadge> : live(s) ? <HmsBadge tone="green">Applies now</HmsBadge> : <HmsBadge tone="blue">Active</HmsBadge>} subtitle={s.department === 'ALL' ? 'All departments' : s.department} />
        <HmsStatStrip
          items={[
            { label: 'Markup', value: `+${s.markup_percentage}%` },
            { label: 'From', value: s.applies_from_time },
            { label: 'To', value: s.applies_to_time, note: s.applies_from_time > s.applies_to_time ? 'Crosses midnight' : undefined },
            { label: 'Weekends', value: s.is_weekend_active ? 'All day' : 'Same window' },
          ]}
        />
        <HmsDetailBody>
          <HmsNotice tone="blue">Applies to emergency encounters inside the window. When several schedules overlap the highest markup wins; outside every window the service’s flat emergency markup applies.</HmsNotice>
          <HmsSection title="Example">
            <HmsRow label="Service priced at" value={format(1000)} />
            <HmsRow label={`Emergency inside the window (+${s.markup_percentage}%)`} value={format(1000 * (1 + s.markup_percentage / 100))} last />
          </HmsSection>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton variant={s.is_active ? 'danger' : 'primary'} icon={Power} block disabled={busy} onClick={() => save(s.id, { is_active: !s.is_active }, `${s.label} ${s.is_active ? 'deactivated' : 'activated'}`)}>
            {s.is_active ? 'Deactivate schedule' : 'Activate schedule'}
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="adm-pricing"
        title="Pricing rules"
        description="Night and weekend emergency surcharges. Use the quote calculator to test any price."
        total={list.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search schedule or department"
        headerAction={
          <div style={{ display: 'flex', gap: '8px' }}>
            <HmsButton size="sm" icon={Calculator} onClick={() => setQuoteOpen(true)} title="Quotation calculator (Alt+Q)">
              Quote
            </HmsButton>
            <HmsButton size="sm" icon={Plus} onClick={() => setAdd(blankAdd())} title="Add a schedule (Alt+N)" aria-keyshortcuts="Alt+N">
              Add
            </HmsButton>
          </div>
        }
        pills={[
          { key: 'all', label: 'All', count: list.length },
          { key: 'live', label: 'Applies now', count: list.filter(live).length },
          { key: 'active', label: 'Active', count: list.filter((s) => s.is_active).length },
          { key: 'inactive', label: 'Inactive', count: list.filter((s) => !s.is_active).length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="open schedule"
        detailLabel="Markup schedule"
        emptyText="No schedules match this search or filter."
        renderDetail={renderDetail}
      />
      {add && (
        <HmsModal
          title="Add a markup schedule"
          description="Emergency encounters inside this window are priced up by the markup."
          onClose={() => setAdd(null)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setAdd(null)}>Cancel</HmsButton>
              <HmsButton
                variant="primary"
                icon={Plus}
                disabled={busy || !add.label.trim() || !(parseFloat(add.markup) > 0)}
                onClick={() => save(null, { label: add.label.trim(), department: add.department.trim().toUpperCase() || 'ALL', markup_percentage: parseFloat(add.markup), applies_from_time: add.from, applies_to_time: add.to, is_weekend_active: add.weekend, is_active: true }, `${add.label} added`)}
              >
                {busy ? 'Adding…' : 'Add schedule'}
              </HmsButton>
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
            <HmsField label="Label" htmlFor="ms-label" required>
              <input id="ms-label" autoFocus style={INPUT} value={add.label} onChange={(e) => setAdd({ ...add, label: e.target.value })} />
            </HmsField>
            <HmsField label="Department" htmlFor="ms-dept" hint="ALL or a department code.">
              <input id="ms-dept" style={INPUT} value={add.department} onChange={(e) => setAdd({ ...add, department: e.target.value })} />
            </HmsField>
            <HmsField label="Markup (%)" htmlFor="ms-mk" required>
              <input id="ms-mk" style={INPUT} inputMode="decimal" value={add.markup} onChange={(e) => setAdd({ ...add, markup: e.target.value })} />
            </HmsField>
            <div />
            <HmsField label="From" htmlFor="ms-from">
              <input id="ms-from" type="time" style={INPUT} value={add.from} onChange={(e) => setAdd({ ...add, from: e.target.value })} />
            </HmsField>
            <HmsField label="To" htmlFor="ms-to">
              <input id="ms-to" type="time" style={INPUT} value={add.to} onChange={(e) => setAdd({ ...add, to: e.target.value })} />
            </HmsField>
          </div>
          <div style={{ marginTop: '16px' }}>
            <HmsToggle checked={add.weekend} onChange={(v) => setAdd({ ...add, weekend: v })} label="Apply all day on weekends" showLabel />
          </div>
        </HmsModal>
      )}
      {quoteOpen && <QuoteModal onClose={() => setQuoteOpen(false)} notify={notify} />}
    </>
  );
};

const QuoteModal: React.FC<{ onClose: () => void; notify: (m: string, t?: 'success' | 'error') => void }> = ({ onClose, notify }) => {
  const { format } = useCurrency();
  const [lines, setLines] = useState<Array<{ t: TariffItem; qty: number }>>([]);
  const [packages, setPackages] = useState<PackageDefinition[]>([]);
  const [sponsors, setSponsors] = useState<CorporateAccount[]>([]);
  const [pkg, setPkg] = useState('');
  const [corp, setCorp] = useState('');
  const [emergency, setEmergency] = useState(false);
  const [at, setAt] = useState(localNow());
  const [quote, setQuote] = useState<QuotationResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    billingService.listPackageDefinitions({ status: 'ACTIVE' }).then(setPackages).catch(() => setPackages([]));
    billingService.getCorporateAccounts().then(setSponsors).catch(() => setSponsors([]));
  }, []);

  const addLine = (t: TariffItem) => {
    setQuote(null);
    setLines((ls) => (ls.some((l) => l.t.code === t.code) ? ls.map((l) => (l.t.code === t.code ? { ...l, qty: l.qty + 1 } : l)) : [...ls, { t, qty: 1 }]));
  };

  const run = async () => {
    setBusy(true);
    try {
      setQuote(
        await billingService.calculateQuote({
          items: lines.map((l) => ({ service_code: l.t.code, qty: l.qty })),
          is_emergency: emergency,
          encounter_type: emergency ? 'EMERGENCY' : 'OPD',
          package_code: pkg || undefined,
          corporate_account_id: corp || undefined,
          at: at ? `${at}:00` : undefined,
        })
      );
    } catch (e) {
      setQuote(null);
      notify(apiError(e, 'The quote failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <HmsModal
      title="Quotation calculator"
      description="Price services against the live tariff, packages, emergency timing and sponsor terms. Nothing is billed."
      onClose={onClose}
      busy={busy}
      width={760}
      footer={
        <>
          <HmsButton onClick={onClose}>Close</HmsButton>
          <HmsButton variant="primary" icon={Calculator} disabled={busy || (!lines.length && !pkg)} onClick={run}>
            {busy ? 'Calculating…' : 'Calculate quote'}
          </HmsButton>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <AdmTariffSearch onPick={addLine} id="quote-search" />
        {lines.length > 0 && (
          <HmsSection title={`Services · ${lines.length}`}>
            {lines.map((l) => (
              <div key={l.t.code} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 80px 36px', gap: '8px', alignItems: 'center', padding: '8px 14px', borderBottom: `1px solid ${HMS.divider}` }}>
                <span style={{ fontSize: '14px' }}>
                  {l.t.name} <span style={{ ...MONO, color: HMS.textSecondary }}>· {l.t.code} · {format(num(l.t.base_price))}</span>
                </span>
                <input aria-label={`Quantity of ${l.t.name}`} style={INPUT} inputMode="numeric" value={l.qty} onChange={(e) => setLines((ls) => ls.map((x) => (x.t.code === l.t.code ? { ...x, qty: Math.max(1, parseInt(e.target.value, 10) || 1) } : x)))} />
                <HmsButton size="sm" variant="ghost" icon={Trash2} aria-label={`Remove ${l.t.name}`} title="Remove" onClick={() => setLines((ls) => ls.filter((x) => x.t.code !== l.t.code))} />
              </div>
            ))}
          </HmsSection>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
          <HmsField label="Package" htmlFor="q-pkg">
            <select id="q-pkg" style={INPUT} value={pkg} onChange={(e) => setPkg(e.target.value)}>
              <option value="">No package</option>
              {packages.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name} · {format(p.package_price)}
                </option>
              ))}
            </select>
          </HmsField>
          <HmsField label="Sponsor" htmlFor="q-corp">
            <select id="q-corp" style={INPUT} value={corp} onChange={(e) => setCorp(e.target.value)}>
              <option value="">Self pay</option>
              {sponsors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </HmsField>
          <HmsField label="Time of service" htmlFor="q-at">
            <input id="q-at" type="datetime-local" style={INPUT} value={at} onChange={(e) => setAt(e.target.value)} />
          </HmsField>
        </div>
        <HmsToggle checked={emergency} onChange={setEmergency} label="Emergency encounter" showLabel />
        {quote && (
          <HmsSection title="Quote">
            {quote.items.map((l, i) => (
              <HmsRow
                key={i}
                label={`${l.description} × ${l.qty}`}
                hint={[l.covered_by_package ? `In package (standard ${format(num(l.standard_price) * l.qty)})` : l.coverage_note, l.markup_source, num(l.tax_amount) ? `GST ${format(num(l.tax_amount))}` : ''].filter(Boolean).join(' · ') || undefined}
                value={<span style={MONO}>{format(num(l.total))}</span>}
              />
            ))}
            <HmsRow label="Gross" value={format(num(quote.gross_total))} />
            <HmsRow label="GST" value={format(num(quote.total_tax))} />
            {quote.package && <HmsRow label="Absorbed by package" value={format(num(quote.package.absorbed_value))} />}
            <HmsRow label={<strong>Net payable</strong>} value={<strong>{format(num(quote.net_payable))}</strong>} last={!quote.corporate_name} />
            {quote.corporate_name && (
              <>
                <HmsRow label={`${quote.corporate_name} pays`} value={format(num(quote.sponsor_responsibility))} />
                <HmsRow label={<strong>Patient pays</strong>} value={<strong>{format(num(quote.patient_responsibility))}</strong>} last />
              </>
            )}
          </HmsSection>
        )}
      </div>
    </HmsModal>
  );
};
