// Lab Admin · Test pricing — the Billing tariff master is the source of truth (it is what doctors
// see when ordering and what Billing charges). Edits are kept as drafts until synced.
import React, { useMemo, useState } from 'react';
import { Receipt, RefreshCw, Save, Trash2 } from 'lucide-react';
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
  HmsField,
  INPUT,
  HMS,
} from '../../../components/hms';
import { LabAdminStore, buildPriceRows, LabPriceRow, isoDate, fmtDate, fmtStamp, inr } from '../data/labAdminStore';
import { LabAdminViewProps } from './labAdminUi';
import { labApiMode } from '../../../services/labService';

const STATUS_TONE = { Synced: 'green', 'Pending sync': 'amber', 'Awaiting Billing': 'blue', 'No price': 'red' } as const;

interface Form {
  basePrice: string;
  tpaPrice: string;
  statSurcharge: string;
  effectiveDate: string;
}

const formFor = (r: LabPriceRow): Form => {
  const src = r.draft || r.tariff;
  return {
    basePrice: src ? String(src.basePrice) : '',
    tpaPrice: src ? String(src.tpaPrice) : '',
    statSurcharge: src?.statSurcharge || '',
    effectiveDate: r.draft?.effectiveDate || r.tariff?.effectiveDate || isoDate(new Date()),
  };
};

export const LabAdminPricingView: React.FC<LabAdminViewProps> = ({ data, by, notify, initialFilter }) => {
  const { state, catalog, tariffs, orders } = data;
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [formKey, setFormKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const priceRows = useMemo(() => buildPriceRows(state, catalog, tariffs, data.pendingPrices), [state, catalog, tariffs, data.pendingPrices]);
  const rank = { 'No price': 0, 'Pending sync': 1, 'Awaiting Billing': 2, Synced: 3 } as const;
  const sections = Array.from(new Set(priceRows.map((r) => r.section))).sort();

  const filters: Record<string, (r: LabPriceRow) => boolean> = {
    all: () => true,
    noprice: (r) => r.status === 'No price',
    pending: (r) => r.status === 'Pending sync',
    billing: (r) => r.status === 'Awaiting Billing',
    ...Object.fromEntries(sections.map((s) => [s, (r: LabPriceRow) => r.section === s])),
  };
  const q = search.trim().toLowerCase();
  const visible = priceRows
    .filter((r) => filters[pill]?.(r) !== false && (!q || [r.testName, r.code, r.section].some((v) => v.toLowerCase().includes(q))))
    .sort((a, b) => rank[a.status] - rank[b.status] || a.testName.localeCompare(b.testName));

  const pending = priceRows.filter((r) => r.status === 'Pending sync');
  const pills = [
    { key: 'all', label: 'All', count: priceRows.length },
    { key: 'noprice', label: 'No price', count: priceRows.filter(filters.noprice).length, tone: 'red' as const },
    { key: 'pending', label: 'Pending sync', count: pending.length, tone: 'amber' as const },
    ...(labApiMode() ? [{ key: 'billing', label: 'Awaiting Billing', count: priceRows.filter((r) => r.status === 'Awaiting Billing').length }] : []),
    ...sections.map((s) => ({ key: s, label: s, count: priceRows.filter((r) => r.section === s).length })),
  ];

  const ordersToday = (r: LabPriceRow) => orders.filter((o) => o.testName === r.testName || (r.catalogCode && o.testCode === r.catalogCode)).length;

  const rows: HmsListRow[] = visible.map((r) => {
    const live = r.tariff;
    return {
      key: r.key,
      title: r.testName,
      badge: <HmsBadge tone={STATUS_TONE[r.status]}>{r.status}</HmsBadge>,
      sub: (
        <>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{r.code}</span> · {r.section}
        </>
      ),
      metaLeft: live ? `${inr(live.basePrice)} · TPA ${inr(live.tpaPrice)}` : 'Not orderable until priced',
      metaRight: r.draft ? <span style={{ color: '#b45309', fontWeight: 600 }}>Draft {inr(r.draft.basePrice)}</span> : live?.statSurcharge ? `STAT ${live.statSurcharge}` : undefined,
    };
  });

  // Reset the edit form whenever the active test changes (adjusting state during render)
  const activeKey = rows.find((r) => r.key === selected)?.key ?? rows[0]?.key ?? null;
  if (activeKey !== formKey) {
    const r = priceRows.find((x) => x.key === activeKey);
    setForm(r ? formFor(r) : null);
    setFormKey(activeKey);
    setError('');
  }

  const validate = (r: LabPriceRow) => {
    if (!form) return null;
    const base = Number(form.basePrice);
    const tpa = Number(form.tpaPrice);
    if (!(base > 0)) return setError('Enter a base price above zero.'), null;
    if (!(tpa > 0)) return setError('Enter a TPA / panel price above zero.'), null;
    if (tpa > base) return setError('TPA / panel price cannot be higher than the base price.'), null;
    setError('');
    return { testName: r.testName, code: r.code, basePrice: base, tpaPrice: tpa, statSurcharge: form.statSurcharge.trim() || 'Not offered', effectiveDate: form.effectiveDate };
  };

  const saveDraft = (r: LabPriceRow, andSync: boolean) => {
    const d = validate(r);
    if (!d) return;
    LabAdminStore.savePriceDraft(d, by);
    if (andSync) {
      LabAdminStore.syncPrices([r.testName], by);
      notify(
        labApiMode()
          ? `${r.testName} at ${inr(d.basePrice)} sent to Billing for approval. It applies from ${fmtDate(d.effectiveDate)} once approved.`
          : `${r.testName} now costs ${inr(d.basePrice)} in Billing and doctor ordering.`
      );
    } else {
      notify(`Draft saved for ${r.testName}. Billing still charges the current price until you sync.`);
    }
  };

  const syncAll = () => {
    const n = LabAdminStore.syncPrices(pending.map((r) => r.testName), by);
    notify(n ? (labApiMode() ? `${n} price change${n === 1 ? '' : 's'} sent to Billing for approval.` : `${n} price${n === 1 ? '' : 's'} synced to the Billing tariff master.`) : 'Nothing waiting to sync.');
  };

  const renderDetail = (key: string | null) => {
    const r = priceRows.find((x) => x.key === key);
    if (!r || !form) return <HmsEmpty>Select a test to see and edit its price.</HmsEmpty>;
    const live = r.tariff;
    const changed = !!live && (Number(form.basePrice) !== live.basePrice || Number(form.tpaPrice) !== live.tpaPrice || form.statSurcharge.trim() !== live.statSurcharge);
    const delta = live && Number(form.basePrice) > 0 ? Number(form.basePrice) - live.basePrice : 0;
    return (
      <>
        <HmsDetailHeader
          icon={Receipt}
          title={r.testName}
          badge={<HmsBadge tone={STATUS_TONE[r.status]}>{r.status}</HmsBadge>}
          subtitle={`${r.code} · ${r.section}${r.sampleType ? ` · ${r.sampleType}` : ''}${r.tatTarget ? ` · TAT ${r.tatTarget}` : ''}`}
        />
        <HmsStatStrip
          items={[
            { label: 'Billing price', value: live ? inr(live.basePrice) : '—', note: live ? 'Live in Billing' : 'Not in tariff master', tone: live ? 'default' : 'red' },
            { label: 'TPA / panel', value: live ? inr(live.tpaPrice) : '—' },
            { label: 'STAT surcharge', value: live?.statSurcharge || '—' },
            { label: 'Ordered today', value: ordersToday(r), note: 'From the lab worklist' },
          ]}
        />
        <HmsDetailBody>
          {r.status === 'No price' && <HmsNotice tone="red">Added to the test catalog by Pathology but has no price — doctors cannot be charged for it yet.</HmsNotice>}
          {r.pending && (
            <HmsNotice tone="blue">
              {r.pending.requestNumber}: {inr(r.pending.proposedPrice)} from {fmtDate(r.pending.effectiveFrom)} · {r.pending.statusLabel}. Billing approves price changes; the live price changes when it takes effect.
            </HmsNotice>
          )}
          {r.draft && <HmsNotice tone="amber">Draft {inr(r.draft.basePrice)} saved {fmtStamp(r.draft.savedAt)} — Billing still charges {live ? inr(live.basePrice) : 'nothing'} until synced.</HmsNotice>}

          <HmsSection title="Edit price" padded>
            {error && <div style={{ marginBottom: '12px' }}><HmsNotice tone="red">{error}</HmsNotice></div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
              <HmsField label="Base price (₹)" required>
                <input type="number" min={1} style={INPUT} value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
              </HmsField>
              <HmsField label="TPA / panel (₹)" required>
                <input type="number" min={1} style={INPUT} value={form.tpaPrice} onChange={(e) => setForm({ ...form, tpaPrice: e.target.value })} />
              </HmsField>
              <HmsField label="STAT surcharge">
                <input style={INPUT} value={form.statSurcharge} onChange={(e) => setForm({ ...form, statSurcharge: e.target.value })} placeholder="e.g. Rs. 200" />
              </HmsField>
              <HmsField label="Effective from">
                <input type="date" style={INPUT} value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} />
              </HmsField>
            </div>
            {changed && delta !== 0 && (
              <div style={{ fontSize: '13px', color: HMS.textSecondary, marginTop: '10px' }}>
                Base price {delta > 0 ? 'up' : 'down'} {inr(Math.abs(delta))} ({Math.round((Math.abs(delta) / live!.basePrice) * 100)}%) from the live price.
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
              <HmsButton variant="primary" icon={RefreshCw} onClick={() => saveDraft(r, true)}>
                {labApiMode() ? 'Save & send to Billing' : 'Save & sync to Billing'}
              </HmsButton>
              <HmsButton icon={Save} onClick={() => saveDraft(r, false)}>
                Save draft
              </HmsButton>
              {r.draft && (
                <HmsButton variant="danger" icon={Trash2} onClick={() => { LabAdminStore.discardPriceDraft(r.testName, by); setFormKey(null); notify(`Draft discarded for ${r.testName}.`); }}>
                  Discard draft
                </HmsButton>
              )}
            </div>
          </HmsSection>

          <HmsSection title="Where this price is used">
            <HmsRow label="Doctor test ordering" hint="Price shown when a doctor orders the test" value={live ? inr(live.basePrice) : 'Not orderable'} />
            <HmsRow label="Billing & cashier" hint="Charged on the patient's invoice; STAT adds the surcharge" value={live ? inr(live.basePrice) : '—'} />
            <HmsRow label="Effective from" value={live?.effectiveDate ? fmtDate(live.effectiveDate) : 'Not recorded'} last />
          </HmsSection>

          <HmsSection title="Catalog link">
            <HmsRow label="Catalog test" hint="Reference ranges are managed by Pathology" value={r.catalogCode || 'Not linked'} />
            <HmsRow label="Sample" value={r.sampleType || '—'} />
            <HmsRow label="Turnaround target" value={r.tatTarget || '—'} last />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="lab-pricing"
      title="Test pricing"
      description="Live prices from the Billing tariff master. Tests without a price and unsynced drafts come first."
      total={priceRows.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search test, code or section"
      pills={pills}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="edit price"
      onPrimary={() => requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-label="Test pricing details"] input')?.focus())}
      headerAction={
        <HmsButton variant={pending.length ? 'primary' : 'secondary'} icon={RefreshCw} onClick={syncAll} disabled={!pending.length} title="Sync all drafts to Billing">
          Sync {pending.length || ''}
        </HmsButton>
      }
      detailLabel="Test pricing"
      renderDetail={renderDetail}
    />
  );
};

export default LabAdminPricingView;
