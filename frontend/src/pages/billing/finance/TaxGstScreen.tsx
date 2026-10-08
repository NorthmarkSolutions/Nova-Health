import React, { useCallback, useEffect, useState } from 'react';
import { Receipt, IndianRupee, ShieldCheck, Undo2, Download, CircleCheck, CircleAlert } from 'lucide-react';
import { billingService, TaxGstReport } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { Btn, C, Callout, Empty, KpiCard, PageHeader, PillTabs, apiError, card, mono } from '../executive/executiveUi';
import { rangeFor } from './financeMath';

const th: React.CSSProperties = { padding: '8px 12px', fontWeight: 500, color: C.muted, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '8px 12px', borderBottom: `1px solid ${C.border}` };

/** A-17 Tax & GST: tax on every billed line and filing-ready summaries. Healthcare services are exempt. */
export const TaxGstScreen: React.FC = () => {
  const { format: fmt } = useCurrency();
  const [preset, setPreset] = useState<'MTD' | 'LAST_MONTH'>('MTD');
  const [tab, setTab] = useState<'slabs' | 'adjustments' | 'returns'>('slabs');
  const [data, setData] = useState<TaxGstReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const range = rangeFor(preset);
  const load = useCallback(async () => {
    try {
      setData(await billingService.getTaxGst({ ...range, month: range.date_from.slice(0, 7) }));
      setError(null);
    } catch (err) {
      setError(apiError(err, 'Could not load the GST report.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  useEffect(() => {
    load();
  }, [load]);

  const downloadReturn = (name: string) => {
    const ret = data?.returns?.find((r) => r.return === name);
    if (!ret) return;
    const blob = new Blob([JSON.stringify({ gstin: '27AABCN1234F1Z8', period: range.date_from.slice(0, 7), ...ret }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-${range.date_from.slice(0, 7)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const t = data?.totals;
  return (
    <>
      <PageHeader
        title="Tax & GST"
        subtitle="Tax on every billed line, and filing-ready returns. Healthcare services are exempt; pharmacy, implants and some room classes are taxable."
        actions={<Btn onClick={() => billingService.downloadCsv('/billing/reports/run/gst', range, `gst-${range.date_from}.csv`).catch((e) => setError(apiError(e, 'Export failed.')))}><Download size={16} /> Export</Btn>}
      />
      <div style={{ marginBottom: 16 }}>
        <PillTabs tabs={[{ key: 'MTD', label: 'This month' }, { key: 'LAST_MONTH', label: 'Last month' }]} active={preset} onPick={(p) => setPreset(p as typeof preset)} />
      </div>
      {error && <div style={{ marginBottom: 12 }}><Callout tone="red">{error}</Callout></div>}
      {data && (
        <div style={{ marginBottom: 12 }}>
          <Callout tone={data.reconciles_to_invoices ? 'green' : 'red'} icon={data.reconciles_to_invoices ? <CircleCheck size={16} /> : <CircleAlert size={16} />}>
            {data.reconciles_to_invoices
              ? `Line-level GST reconciles to invoice tax (${fmt(data.invoice_tax)}). ${data.lock_state.label}.`
              : `Line GST ${fmt(t!.total_tax)} does not match invoice tax ${fmt(data.invoice_tax)} — investigate before filing.`}
          </Callout>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <KpiCard label="Taxable value" value={t ? fmt(t.taxable_value) : '—'} sub="Pharmacy, implants, rooms" icon={<Receipt size={16} />} />
        <KpiCard label="GST collected" value={t ? fmt(t.total_tax) : '—'} sub={t ? `CGST ${fmt(t.cgst)} · SGST ${fmt(t.sgst)}` : ''} icon={<IndianRupee size={16} />} />
        <KpiCard label="Exempt value" value={t ? fmt(t.exempt_value) : '—'} sub="Health care services" icon={<ShieldCheck size={16} />} />
        <KpiCard label="Credit note reversals" value={t ? fmt(t.tax_reversed_by_credit_notes) : '—'} sub="Reverse in the original period" icon={<Undo2 size={16} />} />
      </div>

      <div style={{ ...card }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${C.border}` }}>
          <PillTabs
            tabs={[{ key: 'slabs', label: 'Rate slabs', count: data?.slabs.length }, { key: 'adjustments', label: 'Credit note adjustments', count: data?.adjustments.length }, { key: 'returns', label: 'Returns' }]}
            active={tab}
            onPick={(k) => setTab(k as typeof tab)}
          />
        </div>
        {!data && <Empty text="Loading…" />}
        {data && tab === 'slabs' && (data.slabs.length === 0 ? <Empty text="No billed lines in this period." /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: C.bg }}>
                {['Rate slab', 'Departments', 'Lines', 'Taxable value', 'CGST', 'SGST', 'IGST', 'GST'].map((h, i) => <th key={h} style={{ ...th, textAlign: i < 2 ? 'left' : 'right' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {data.slabs.map((s) => (
                  <tr key={s.rate}>
                    <td style={td}>{s.label}</td>
                    <td style={{ ...td, color: C.muted }}>{s.departments.join(', ')}</td>
                    {[s.lines.toLocaleString('en-IN'), fmt(s.taxable_value), fmt(s.cgst), fmt(s.sgst), fmt(s.igst), fmt(s.total_tax)].map((v, i) => <td key={i} style={{ ...td, textAlign: 'right', ...mono }}>{v}</td>)}
                  </tr>
                ))}
                <tr style={{ background: C.bg, fontWeight: 600 }}>
                  <td style={td}>Total</td><td style={td} />
                  {[data.lines.toLocaleString('en-IN'), fmt(t!.taxable_value + t!.exempt_value), fmt(t!.cgst), fmt(t!.sgst), fmt(0), fmt(t!.total_tax)].map((v, i) => <td key={i} style={{ ...td, textAlign: 'right', ...mono }}>{v}</td>)}
                </tr>
              </tbody>
            </table>
            <div style={{ padding: '8px 12px', fontSize: 12, color: C.muted }}>Intra-state supply: CGST and SGST are each half of GST; IGST applies only to inter-state supplies.</div>
          </div>
        ))}
        {data && tab === 'adjustments' && (data.adjustments.length === 0 ? <Empty text="No credit notes in this period." /> : (
          data.adjustments.map((a) => (
            <div key={a.credit_note_number} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 110px 110px 120px', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <span style={mono}>{a.credit_note_number}</span>
              <span style={{ color: C.muted }}>{a.invoice_number} · original period {a.original_period}</span>
              <span style={{ textAlign: 'right', ...mono }}>{fmt(a.amount)}</span>
              <span style={{ textAlign: 'right', ...mono, color: C.red }}>− {fmt(a.tax_reversed)}</span>
              <span style={{ textAlign: 'right', color: C.muted }}>{a.issued_on}</span>
            </div>
          ))
        ))}
        {data && tab === 'returns' && (data.returns || []).filter((r) => r.total_tax !== undefined).map((r) => (
          <div key={r.return} style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,1.4fr) 1fr 1fr auto', gap: 10, alignItems: 'center', padding: '12px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
            <span style={{ display: 'flex', flexDirection: 'column' }}><b>{r.return}</b><span style={{ color: C.muted, fontSize: 12 }}>{r.description} · {range.date_from.slice(0, 7)}</span></span>
            <span style={{ ...mono }}>Taxable {fmt(r.taxable_value || 0)}</span>
            <span style={{ ...mono }}>Tax {fmt(r.total_tax || 0)}</span>
            <Btn style={{ height: 30, fontSize: 12 }} onClick={() => downloadReturn(r.return)}><Download size={13} /> JSON</Btn>
          </div>
        ))}
      </div>
    </>
  );
};
