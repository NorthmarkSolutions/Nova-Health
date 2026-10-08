import React, { useCallback, useEffect, useState } from 'react';
import { Download, Printer, Play, Send, Lock, Unlock } from 'lucide-react';
import { billingService, ReportCatalogueItem, ReportResult } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { Btn, C, Callout, Empty, Field, PageHeader, PillTabs, apiError, card, inputStyle, mono } from '../executive/executiveUi';
import { RangePreset, formatCell, rangeFor } from './financeMath';

/**
 * A-20 Reports hub: catalogue → report view with period tabs, lock state and source, export and ERP posting.
 * `shiftOnly` (Billing Supervisor): today's shift reports only — the server enforces the same scope.
 */
export const ReportsScreen: React.FC<{ shiftOnly?: boolean }> = ({ shiftOnly = false }) => {
  const { format: fmt } = useCurrency();
  const [catalogue, setCatalogue] = useState<ReportCatalogueItem[]>([]);
  const [key, setKey] = useState<string>(shiftOnly ? 'tender' : 'gst');
  const [preset, setPreset] = useState<RangePreset>(shiftOnly ? 'TODAY' : 'MTD');
  const [custom, setCustom] = useState(rangeFor('MTD'));
  const [report, setReport] = useState<ReportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    billingService.getReportCatalogue().then((c) => setCatalogue(c.reports)).catch((err) => setError(apiError(err, 'Could not load reports.')));
  }, []);

  const range = preset === 'CUSTOM' ? custom : rangeFor(preset);
  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setReport(await billingService.runReport(key, range));
    } catch (err) {
      setError(apiError(err, 'Report failed.'));
      setReport(null);
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, range.date_from, range.date_to]);

  useEffect(() => {
    run();
  }, [run]);

  const exportCsv = async () => {
    try {
      await billingService.downloadCsv(`/billing/reports/run/${key}`, { ...range }, `${key}-${range.date_from}-${range.date_to}.csv`);
    } catch (err) {
      setError(apiError(err, 'Export failed.'));
    }
  };

  const postErp = async () => {
    setBusy(true);
    try {
      const res = await billingService.postSettlementJournal(range);
      setNotice(`Journal ${res.journal_reference} posted to the ERP feed · ${fmt(res.total_debit)} balanced.`);
    } catch (err) {
      setError(apiError(err, 'ERP posting failed.'));
    } finally {
      setBusy(false);
    }
  };

  const locked = report && report.lock_state.locked_days === report.lock_state.total_days;
  const align = (t: string): 'right' | 'left' => (t === 'money' || t === 'number' || t === 'percent' ? 'right' : 'left');

  return (
    <>
      <PageHeader
        title={shiftOnly ? 'Shift Reports' : 'Reports'}
        subtitle={shiftOnly ? 'Collections, refunds and cashier throughput for today across all counters.' : 'Department reports for finance, tax filing and operations.'}
        actions={
          <>
            <Btn onClick={exportCsv} disabled={!report}><Download size={16} /> Excel (CSV)</Btn>
            <Btn onClick={() => window.print()} disabled={!report}><Printer size={16} /> PDF</Btn>
            {key === 'journal' && !shiftOnly ? (
              <Btn variant="primary" disabled={busy || !report} onClick={postErp}><Send size={16} /> Post to ERP</Btn>
            ) : (
              <Btn variant="primary" disabled={busy} onClick={run}><Play size={16} /> Run report</Btn>
            )}
          </>
        }
      />
      {error && <div style={{ marginBottom: 12 }}><Callout tone="red">{error}</Callout></div>}
      {notice && <div style={{ marginBottom: 12 }}><Callout tone="green">{notice}</Callout></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 16, alignItems: 'start' }} className="reports-grid">
        <div style={{ ...card, overflow: 'hidden' }}>
          {catalogue.map((r) => (
            <button
              key={r.key}
              onClick={() => { setKey(r.key); setNotice(null); }}
              style={{ width: '100%', textAlign: 'left', border: 'none', borderBottom: `1px solid ${C.border}`, padding: '12px 14px', cursor: 'pointer',
                background: key === r.key ? C.hover : C.surface, display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <span style={{ fontSize: 14, fontWeight: 500, color: key === r.key ? C.primary : C.text }}>{r.name}</span>
              <span style={{ fontSize: 12, color: C.muted }}>{r.description}</span>
            </button>
          ))}
        </div>

        <div style={{ ...card, minWidth: 0 }}>
          <div style={{ padding: 14, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontWeight: 600, fontSize: 16 }}>{report?.name || '—'}</span>
              <span style={{ fontSize: 13, color: C.muted }}>{report ? `${report.description} · ${report.period.from} to ${report.period.to}` : ''}</span>
            </div>
            {!shiftOnly && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <PillTabs
                  tabs={[{ key: 'TODAY', label: 'Today' }, { key: 'MTD', label: 'MTD' }, { key: 'LAST_MONTH', label: 'Last month' }, { key: 'FYTD', label: 'FY to date' }, { key: 'CUSTOM', label: 'Custom' }]}
                  active={preset}
                  onPick={(p) => setPreset(p as RangePreset)}
                />
                {preset === 'CUSTOM' && (
                  <>
                    <Field label="From"><input type="date" style={inputStyle} value={custom.date_from} onChange={(e) => setCustom({ ...custom, date_from: e.target.value })} /></Field>
                    <Field label="To"><input type="date" style={inputStyle} value={custom.date_to} onChange={(e) => setCustom({ ...custom, date_to: e.target.value })} /></Field>
                  </>
                )}
              </div>
            )}
          </div>
          {report && (
            <div style={{ padding: '8px 14px', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center', color: locked ? C.green : C.amber, background: locked ? C.greenSoft : C.amberSoft }}>
              {locked ? <Lock size={13} /> : <Unlock size={13} />} {report.lock_state.label}
            </div>
          )}
          {!report && !error && <Empty text={busy ? 'Running…' : 'Select a report.'} />}
          {report && report.rows.length === 0 && <Empty text="No activity in this period." />}
          {report && report.rows.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {report.columns.map((c) => (
                      <th key={c.key} style={{ textAlign: align(c.type), padding: '8px 12px', fontWeight: 500, color: C.muted, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}` }}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r, i) => (
                    <tr key={i}>
                      {report.columns.map((c) => (
                        <td key={c.key} style={{ textAlign: align(c.type), padding: '8px 12px', borderBottom: `1px solid ${C.border}`, ...(c.type === 'text' ? {} : mono) }}>
                          {formatCell(r[c.key], c.type, fmt)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {report.totals && (
                    <tr style={{ background: C.bg, fontWeight: 600 }}>
                      {report.columns.map((c, i) => (
                        <td key={c.key} style={{ textAlign: align(c.type), padding: '8px 12px', ...(c.type === 'text' ? {} : mono) }}>
                          {i === 0 ? 'Total' : c.type === 'percent' ? '' : formatCell(report.totals![c.key], c.type, fmt).replace('—', '')}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {report && (
            <div style={{ padding: '10px 14px', fontSize: 12, color: C.muted, borderTop: `1px solid ${C.border}` }}>
              {report.source} · generated {new Date(report.generated_at).toLocaleString()}
              {key === 'journal' && report.totals ? ` · ${Number(report.totals.debit) === Number(report.totals.credit) ? 'Balanced: debits equal credits' : 'NOT balanced'}` : ''}
            </div>
          )}
        </div>
      </div>
      <style>{'@media (max-width: 760px) { .reports-grid { grid-template-columns: 1fr !important; } }'}</style>
    </>
  );
};
