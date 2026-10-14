// Billing · Supervisor — today's shift reports across all counters (collections by tender, refunds, cashier throughput…).
// The server limits a supervisor to the shift scope; export to CSV or print from the report.
import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsNotice, HmsEmpty, HMS } from '../../../components/hms';
import { ReportCatalogueItem, ReportResult, billingService } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { apiError } from '../executive/executiveUi';
import { formatCell, rangeFor } from '../finance/financeMath';
import { MONO, fmtWhen } from './supervisorDeskData';

export interface SupReportsViewProps {
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialSelect?: string;
}

const align = (t: string): 'right' | 'left' => (t === 'money' || t === 'number' || t === 'percent' ? 'right' : 'left');

export const SupReportsView: React.FC<SupReportsViewProps> = ({ notify, initialSelect }) => {
  const { format } = useCurrency();
  const [catalogue, setCatalogue] = useState<ReportCatalogueItem[] | null>(null);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `rep:${initialSelect}` : null);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    billingService
      .getReportCatalogue()
      .then((c) => setCatalogue(c.reports))
      .catch((e) => setCatalogueError(apiError(e, 'Reports are unavailable.')));
  }, []);

  const q = search.trim().toLowerCase();
  const list = (catalogue || []).filter((r) => !q || [r.name, r.description].some((v) => v.toLowerCase().includes(q)));
  const rows: HmsListRow[] = list.map((r) => ({ key: `rep:${r.key}`, title: r.name, badge: <HmsBadge tone="gray">Today</HmsBadge>, sub: r.description }));
  const activeKey = rows.find((r) => r.key === selected)?.key ?? rows[0]?.key ?? null;
  const reportKey = activeKey ? activeKey.slice(4) : null;
  const range = rangeFor('TODAY');

  const run = useCallback(async (key: string) => {
    setRunning(true);
    setReportError(null);
    try {
      setReport(await billingService.runReport(key, rangeFor('TODAY')));
    } catch (e) {
      setReport(null);
      setReportError(apiError(e, 'The report failed to run.'));
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    if (reportKey) Promise.resolve().then(() => run(reportKey));
  }, [reportKey, run]);

  const exportCsv = async () => {
    if (!reportKey) return;
    try {
      await billingService.downloadCsv(`/billing/reports/run/${reportKey}`, { ...range }, `${reportKey}-${range.date_from}.csv`);
      notify('Report exported');
    } catch (e) {
      notify(apiError(e, 'Export failed'), 'error');
    }
  };

  const renderDetail = (key: string | null) => {
    if (catalogueError) return <HmsEmpty>{catalogueError}</HmsEmpty>;
    if (!catalogue) return <HmsEmpty>Loading reports…</HmsEmpty>;
    const item = catalogue.find((r) => `rep:${r.key}` === key);
    if (!item) return <HmsEmpty>{catalogue.length ? 'Select a report from the list.' : 'No shift reports are available to you.'}</HmsEmpty>;
    const current = report && report.key === item.key ? report : null;
    const locked = current && current.lock_state.locked_days === current.lock_state.total_days;
    return (
      <>
        <HmsDetailHeader icon={FileText} title={item.name} badge={<HmsBadge tone={locked ? 'green' : 'amber'}>{current ? current.lock_state.label : 'Today'}</HmsBadge>} subtitle={item.description} />
        <HmsStatStrip
          items={[
            { label: 'Period', value: current ? current.period.from : range.date_from, note: 'Today · all counters' },
            { label: 'Rows', value: current ? current.rows.length : '—' },
            { label: 'Source', value: current ? current.source : '—' },
            { label: 'Generated', value: current ? fmtWhen(current.generated_at) : running ? 'Running…' : '—' },
          ]}
        />
        <HmsDetailBody>
          {reportError && <HmsNotice tone="red">{reportError}</HmsNotice>}
          {!current && !reportError && <HmsEmpty>Running the report…</HmsEmpty>}
          {current && current.rows.length === 0 && <HmsEmpty>No activity today yet.</HmsEmpty>}
          {current && current.rows.length > 0 && (
            <HmsSection title="Report">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: HMS.subtle }}>
                      {current.columns.map((c) => (
                        <th key={c.key} scope="col" style={{ textAlign: align(c.type), padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: HMS.label, whiteSpace: 'nowrap', borderBottom: `1px solid ${HMS.border}` }}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {current.rows.map((r, i) => (
                      <tr key={i}>
                        {current.columns.map((c) => (
                          <td key={c.key} style={{ textAlign: align(c.type), padding: '10px 14px', borderBottom: `1px solid ${HMS.divider}`, ...(c.type === 'text' ? {} : MONO) }}>
                            {formatCell(r[c.key], c.type, format)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {current.totals && (
                      <tr style={{ background: HMS.subtle, fontWeight: 600 }}>
                        {current.columns.map((c, i) => (
                          <td key={c.key} style={{ textAlign: align(c.type), padding: '10px 14px', ...(c.type === 'text' ? {} : MONO) }}>
                            {i === 0 ? 'Total' : c.type === 'percent' ? '' : formatCell(current.totals![c.key], c.type, format).replace('—', '')}
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </HmsSection>
          )}
        </HmsDetailBody>
        <HmsDetailFooter>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
            <HmsButton icon={Printer} block disabled={!current} onClick={() => window.print()}>
              Print
            </HmsButton>
            <HmsButton variant="primary" icon={Download} block disabled={!current} onClick={exportCsv}>
              Export CSV
            </HmsButton>
          </div>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="sup-reports"
      title="Shift reports"
      description="Today’s collections, refunds and cashier throughput across all counters."
      total={catalogue?.length ?? 0}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search reports"
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open report"
      detailLabel="Shift report"
      emptyText={catalogueError || (catalogue ? 'No reports match this search.' : 'Loading reports…')}
      renderDetail={renderDetail}
    />
  );
};
