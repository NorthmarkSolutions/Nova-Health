// Billing · Admin — department reports (GST, tender-wise collections, ageing, refunds, discounts, settlement journal…)
// for any period, with the period's lock state and source. Export to CSV, print, and post the settlement journal to the ERP.
import React, { useCallback, useEffect, useState } from 'react';
import { FileSpreadsheet, Download, Printer, Send } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsNotice, HmsEmpty, HmsField, INPUT } from '../../../components/hms';
import { billingService, ReportCatalogueItem, ReportResult } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { RangePreset, formatCell, rangeFor } from '../finance/financeMath';
import { fmtWhen } from './adminDeskData';
import { AdmTable } from './adminUi';

export interface AdmReportsViewProps {
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialSelect?: string;
}

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'TODAY', label: 'Today' },
  { key: 'MTD', label: 'Month to date' },
  { key: 'LAST_MONTH', label: 'Last month' },
  { key: 'FYTD', label: 'Financial year to date' },
  { key: 'CUSTOM', label: 'Custom range' },
];

export const AdmReportsView: React.FC<AdmReportsViewProps> = ({ notify, initialSelect }) => {
  const { format } = useCurrency();
  const [catalogue, setCatalogue] = useState<ReportCatalogueItem[] | null>(null);
  const [catErr, setCatErr] = useState<string | null>(null);
  const [preset, setPreset] = useState<RangePreset>('MTD');
  const [custom, setCustom] = useState(rangeFor('MTD'));
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `rep:${initialSelect}` : null);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [repErr, setRepErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    billingService
      .getReportCatalogue()
      .then((c) => setCatalogue(c.reports))
      .catch((e) => setCatErr(apiError(e, 'Reports are unavailable.')));
  }, []);

  const range = preset === 'CUSTOM' ? custom : rangeFor(preset);
  const q = search.trim().toLowerCase();
  const list = (catalogue || []).filter((r) => !q || `${r.name} ${r.description}`.toLowerCase().includes(q));
  const rows: HmsListRow[] = list.map((r) => ({ key: `rep:${r.key}`, title: r.name, sub: r.description, badge: r.key === 'journal' ? <HmsBadge tone="blue">ERP</HmsBadge> : undefined }));
  const activeKey = rows.find((r) => r.key === selected)?.key ?? rows[0]?.key ?? null;
  const repKey = activeKey ? activeKey.slice(4) : null;

  const run = useCallback(async (key: string, r: { date_from: string; date_to: string }) => {
    setBusy(true);
    setRepErr(null);
    try {
      setReport(await billingService.runReport(key, r));
    } catch (e) {
      setReport(null);
      setRepErr(apiError(e, 'The report failed to run.'));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (repKey && range.date_from && range.date_to && range.date_from <= range.date_to) Promise.resolve().then(() => run(repKey, range));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repKey, range.date_from, range.date_to, run]);

  const exportCsv = async () => {
    if (!repKey) return;
    try {
      await billingService.downloadCsv(`/billing/reports/run/${repKey}`, { ...range }, `${repKey}-${range.date_from}-${range.date_to}.csv`);
      notify('Report exported');
    } catch (e) {
      notify(apiError(e, 'Export failed'), 'error');
    }
  };

  const postErp = async () => {
    setBusy(true);
    try {
      const r = await billingService.postSettlementJournal(range);
      notify(`Journal ${r.journal_reference} posted to the ERP · ${format(r.total_debit)} ${r.balanced ? 'balanced' : 'NOT balanced'}`, r.balanced ? 'success' : 'error');
    } catch (e) {
      notify(apiError(e, 'Posting to the ERP failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const renderDetail = (key: string | null) => {
    if (catErr) return <HmsEmpty>{catErr}</HmsEmpty>;
    if (!catalogue) return <HmsEmpty>Loading reports…</HmsEmpty>;
    const item = catalogue.find((r) => `rep:${r.key}` === key);
    if (!item) return <HmsEmpty>Select a report from the list.</HmsEmpty>;
    const cur = report && report.key === item.key ? report : null;
    const locked = !!cur && cur.lock_state.locked_days === cur.lock_state.total_days;
    const right = (t: string) => t === 'money' || t === 'number' || t === 'percent';
    return (
      <>
        <HmsDetailHeader icon={FileSpreadsheet} title={item.name} badge={cur ? <HmsBadge tone={locked ? 'green' : 'amber'}>{locked ? 'Period closed' : 'Period open'}</HmsBadge> : undefined} subtitle={item.description} />
        <HmsStatStrip
          items={[
            { label: 'Period', value: `${range.date_from} → ${range.date_to}` },
            { label: 'Rows', value: cur ? cur.rows.length : '—' },
            { label: 'Closed days', value: cur ? `${cur.lock_state.locked_days} / ${cur.lock_state.total_days}` : '—', note: cur?.lock_state.label },
            { label: 'Generated', value: cur ? fmtWhen(cur.generated_at) : busy ? 'Running…' : '—', note: cur?.source },
          ]}
        />
        <HmsDetailBody>
          {range.date_from > range.date_to && <HmsNotice tone="amber">The start date is after the end date.</HmsNotice>}
          {repErr && <HmsNotice tone="red">{repErr}</HmsNotice>}
          {cur && !locked && <HmsNotice tone="amber">Some days in this period are not closed yet, so figures can still change.</HmsNotice>}
          {!cur && !repErr && <HmsEmpty>Running the report…</HmsEmpty>}
          {cur && cur.rows.length === 0 && <HmsEmpty>No activity in this period.</HmsEmpty>}
          {cur && cur.rows.length > 0 && (
            <HmsSection title="Report">
              <AdmTable
                columns={cur.columns.map((c) => ({ key: c.key, label: c.label, align: right(c.type) ? 'right' : 'left', mono: c.type !== 'text' }))}
                rows={cur.rows.map((r) => Object.fromEntries(cur.columns.map((c) => [c.key, formatCell(r[c.key], c.type, format)])))}
                total={cur.totals ? Object.fromEntries(cur.columns.map((c, i) => [c.key, i === 0 ? 'Total' : c.type === 'percent' ? '' : formatCell(cur.totals![c.key], c.type, format).replace('—', '')])) : undefined}
              />
            </HmsSection>
          )}
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${item.key === 'journal' ? 3 : 2}, minmax(0, 1fr))`, gap: '10px' }}>
            <HmsButton icon={Printer} block disabled={!cur} onClick={() => window.print()}>
              Print
            </HmsButton>
            <HmsButton variant={item.key === 'journal' ? 'secondary' : 'primary'} icon={Download} block disabled={!cur} onClick={exportCsv}>
              Export CSV
            </HmsButton>
            {item.key === 'journal' && (
              <HmsButton variant="primary" icon={Send} block disabled={busy || !cur} onClick={postErp}>
                Post to ERP
              </HmsButton>
            )}
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="adm-reports"
      title="Financial reports"
      description="Department reports for finance, tax filing and operations."
      total={catalogue?.length ?? 0}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search reports"
      leftExtra={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <HmsField label="Period" htmlFor="rp-preset">
            <select id="rp-preset" style={INPUT} value={preset} onChange={(e) => setPreset(e.target.value as RangePreset)}>
              {PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </HmsField>
          {preset === 'CUSTOM' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
              <HmsField label="From" htmlFor="rp-from">
                <input id="rp-from" type="date" style={INPUT} value={custom.date_from} onChange={(e) => setCustom({ ...custom, date_from: e.target.value })} />
              </HmsField>
              <HmsField label="To" htmlFor="rp-to">
                <input id="rp-to" type="date" style={INPUT} value={custom.date_to} onChange={(e) => setCustom({ ...custom, date_to: e.target.value })} />
              </HmsField>
            </div>
          )}
        </div>
      }
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open report"
      detailLabel="Report"
      emptyText={catErr || 'No reports match this search.'}
      renderDetail={renderDetail}
    />
  );
};
