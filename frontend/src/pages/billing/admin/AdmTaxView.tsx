// Billing · Admin — Tax & GST. GST on every billed line by rate slab, filing-ready returns and credit-note reversals,
// with a check that line-level tax reconciles to invoice tax. Healthcare services are exempt; pharmacy, implants and
// some room classes are taxable.
import React, { useCallback, useEffect, useState } from 'react';
import { Receipt, Download, FileJson } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsField, INPUT } from '../../../components/hms';
import { billingService, TaxGstReport } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { rangeFor } from '../finance/financeMath';
import { MONO, fmtDate } from './adminDeskData';

export interface AdmTaxViewProps {
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
}

const PILLS = ['slabs', 'returns', 'adjustments'];

export const AdmTaxView: React.FC<AdmTaxViewProps> = ({ notify, initialFilter }) => {
  const { format } = useCurrency();
  const [preset, setPreset] = useState<'MTD' | 'LAST_MONTH'>('MTD');
  const [data, setData] = useState<TaxGstReport | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'slabs');
  const [selected, setSelected] = useState<string | null>(null);

  const range = rangeFor(preset);
  const month = range.date_from.slice(0, 7);
  const load = useCallback(async () => {
    try {
      const r = rangeFor(preset);
      setData(await billingService.getTaxGst({ ...r, month: r.date_from.slice(0, 7) }));
      setFailed(null);
    } catch (e) {
      setData(null);
      setFailed(apiError(e, 'The GST report could not be loaded.'));
    }
  }, [preset]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const t = data?.totals;
  const returns = (data?.returns || []).filter((r) => r.total_tax !== undefined);
  const q = search.trim().toLowerCase();
  let rows: HmsListRow[] = [];
  if (data && pill === 'slabs')
    rows = data.slabs
      .filter((s) => !q || `${s.label} ${s.departments.join(' ')}`.toLowerCase().includes(q))
      .map((s) => ({ key: `s:${s.rate}`, title: s.label, badge: <HmsBadge tone={s.rate ? 'blue' : 'gray'}>{s.rate ? `${s.rate}%` : 'Exempt'}</HmsBadge>, sub: s.departments.join(', ') || '—', metaLeft: `${s.lines.toLocaleString('en-IN')} lines · taxable ${format(s.taxable_value)}`, metaRight: `GST ${format(s.total_tax)}` }));
  if (data && pill === 'returns')
    rows = returns.filter((r) => !q || `${r.return} ${r.description}`.toLowerCase().includes(q)).map((r) => ({ key: `r:${r.return}`, title: r.return, badge: <HmsBadge tone="blue">{month}</HmsBadge>, sub: r.description, metaLeft: `Taxable ${format(r.taxable_value || 0)}`, metaRight: `Tax ${format(r.total_tax || 0)}` }));
  if (data && pill === 'adjustments')
    rows = data.adjustments
      .filter((a) => !q || `${a.credit_note_number} ${a.invoice_number}`.toLowerCase().includes(q))
      .map((a) => ({ key: `a:${a.credit_note_number}`, title: a.credit_note_number, badge: <HmsBadge tone="amber">Reversal</HmsBadge>, sub: `${a.invoice_number} · original period ${a.original_period}`, metaLeft: fmtDate(a.issued_on), metaRight: `− ${format(a.tax_reversed)}` }));

  const downloadReturn = (name: string) => {
    const ret = returns.find((r) => r.return === name);
    if (!ret) return;
    // GSTIN is added by the filing tool; the hospital GSTIN is not configured in billing
    const url = URL.createObjectURL(new Blob([JSON.stringify({ period: month, ...ret }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-${month}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`${name} for ${month} downloaded`);
  };

  const exportCsv = async () => {
    try {
      await billingService.downloadCsv('/billing/reports/run/gst', range, `gst-${range.date_from}.csv`);
      notify('GST lines exported');
    } catch (e) {
      notify(apiError(e, 'Export failed'), 'error');
    }
  };

  const renderDetail = (key: string | null) => {
    if (!data && !failed) return <HmsEmpty>Loading the GST report…</HmsEmpty>;
    if (failed || !data || !t) return <HmsEmpty>{failed}</HmsEmpty>;
    const header = (
      <HmsStatStrip
        items={[
          { label: 'Taxable value', value: format(t.taxable_value) },
          { label: 'GST collected', value: format(t.total_tax), note: `CGST ${format(t.cgst)} · SGST ${format(t.sgst)}` },
          { label: 'Exempt value', value: format(t.exempt_value), note: 'Healthcare services' },
          { label: 'Reversed', value: format(t.tax_reversed_by_credit_notes), note: 'By credit notes', tone: t.tax_reversed_by_credit_notes ? 'amber' : 'default' },
        ]}
      />
    );
    const recon = <HmsNotice tone={data.reconciles_to_invoices ? 'green' : 'red'}>{data.reconciles_to_invoices ? `Line-level GST reconciles to invoice tax (${format(data.invoice_tax)}). ${data.lock_state.label}.` : `Line GST ${format(t.total_tax)} does not match invoice tax ${format(data.invoice_tax)} — investigate before filing.`}</HmsNotice>;
    if (!key) return <HmsEmpty>{pill === 'adjustments' ? 'No credit notes in this period.' : pill === 'returns' ? 'No returns for this period.' : 'No billed lines in this period.'}</HmsEmpty>;

    if (key.startsWith('s:')) {
      const s = data.slabs.find((x) => `s:${x.rate}` === key);
      if (!s) return <HmsEmpty>Select a slab.</HmsEmpty>;
      return (
        <>
          <HmsDetailHeader icon={Receipt} title={s.label} badge={<HmsBadge tone={s.rate ? 'blue' : 'gray'}>{s.rate ? `${s.rate}% GST` : 'Exempt'}</HmsBadge>} subtitle={`${data.period.from} to ${data.period.to}`} />
          {header}
          <HmsDetailBody>
            {recon}
            <HmsSection title="Slab">
              <HmsRow label="Departments" value={s.departments.join(', ') || '—'} />
              <HmsRow label="Billed lines" value={s.lines.toLocaleString('en-IN')} />
              <HmsRow label="Taxable value" value={format(s.taxable_value)} />
              <HmsRow label="CGST" value={format(s.cgst)} />
              <HmsRow label="SGST" value={format(s.sgst)} />
              <HmsRow label="IGST" value={format(s.igst)} hint="Only on inter-state supplies" />
              <HmsRow label={<strong>GST</strong>} value={<strong>{format(s.total_tax)}</strong>} last />
            </HmsSection>
          </HmsDetailBody>
        </>
      );
    }
    if (key.startsWith('r:')) {
      const r = returns.find((x) => `r:${x.return}` === key);
      if (!r) return <HmsEmpty>Select a return.</HmsEmpty>;
      return (
        <>
          <HmsDetailHeader icon={FileJson} title={r.return} badge={<HmsBadge tone="blue">{month}</HmsBadge>} subtitle={r.description} />
          {header}
          <HmsDetailBody>
            {recon}
            <HmsSection title="Return summary">
              <HmsRow label="Taxable value" value={format(r.taxable_value || 0)} />
              {r.exempt_value !== undefined && <HmsRow label="Exempt value" value={format(r.exempt_value)} />}
              <HmsRow label="CGST" value={format(r.cgst || 0)} />
              <HmsRow label="SGST" value={format(r.sgst || 0)} />
              <HmsRow label="IGST" value={format(r.igst || 0)} />
              <HmsRow label={<strong>Total tax</strong>} value={<strong>{format(r.total_tax || 0)}</strong>} last />
            </HmsSection>
          </HmsDetailBody>
          <HmsDetailFooter>
            <HmsButton variant="primary" icon={Download} block disabled={!data.reconciles_to_invoices} title={data.reconciles_to_invoices ? undefined : 'Resolve the reconciliation difference first'} onClick={() => downloadReturn(r.return)}>
              Download {r.return} (JSON)
            </HmsButton>
          </HmsDetailFooter>
        </>
      );
    }
    const a = data.adjustments.find((x) => `a:${x.credit_note_number}` === key);
    if (!a) return <HmsEmpty>Select a credit note.</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={Receipt} title={a.credit_note_number} badge={<HmsBadge tone="amber">Tax reversal</HmsBadge>} subtitle={<span style={MONO}>{a.invoice_number}</span>} />
        {header}
        <HmsDetailBody>
          <HmsNotice tone="blue">Reverse this tax in the return for the original period ({a.original_period}), not the month the credit note was issued.</HmsNotice>
          <HmsSection title="Credit note">
            <HmsRow label="Amount" value={format(a.amount)} />
            <HmsRow label="Tax reversed" value={format(a.tax_reversed)} />
            <HmsRow label="Original period" value={a.original_period} />
            <HmsRow label="Issued" value={fmtDate(a.issued_on)} last />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="adm-tax"
      title="Tax & GST"
      description="GST by rate slab, filing-ready returns and credit-note reversals."
      total={pill === 'slabs' ? data?.slabs.length ?? 0 : pill === 'returns' ? returns.length : data?.adjustments.length ?? 0}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search slab, return or credit note"
      headerAction={
        <HmsButton size="sm" icon={Download} onClick={exportCsv} title="Export GST lines to CSV">
          CSV
        </HmsButton>
      }
      pills={[
        { key: 'slabs', label: 'Rate slabs', count: data?.slabs.length ?? 0 },
        { key: 'returns', label: 'Returns', count: returns.length },
        { key: 'adjustments', label: 'Reversals', count: data?.adjustments.length ?? 0, tone: 'amber' },
      ]}
      activePill={pill}
      onPill={(k) => {
        setPill(k);
        setSelected(null);
      }}
      leftExtra={
        <HmsField label="Period" htmlFor="tax-period">
          <select id="tax-period" style={INPUT} value={preset} onChange={(e) => setPreset(e.target.value as 'MTD' | 'LAST_MONTH')}>
            <option value="MTD">This month</option>
            <option value="LAST_MONTH">Last month</option>
          </select>
        </HmsField>
      }
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open"
      detailLabel="GST"
      emptyText="Nothing in this list for the period."
      renderDetail={renderDetail}
    />
  );
};
