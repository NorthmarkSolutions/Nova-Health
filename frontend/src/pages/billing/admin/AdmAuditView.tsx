// Billing · Admin — the department audit trail: every financial, master-data, policy, contract and access event,
// hash-chained so any edit or deletion is detectable. Search, filter by category and date, verify the chain, export.
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollText, Download, ShieldCheck } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsField, HmsTone, INPUT } from '../../../components/hms';
import { AuditLogPage, billingService } from '../../../services/billingService';
import { apiError } from '../executive/executiveUi';
import { MONO, fmtWhen, titleCase } from './adminDeskData';

export interface AdmAuditViewProps {
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
}

const CATEGORIES = ['Financial', 'Master data', 'Policy', 'Contract', 'Access'];
const SEV: Record<string, HmsTone> = { HIGH: 'red', MEDIUM: 'amber', LOW: 'gray' };

export const AdmAuditView: React.FC<AdmAuditViewProps> = ({ notify, initialFilter }) => {
  const [category, setCategory] = useState(initialFilter && CATEGORIES.includes(initialFilter) ? initialFilter : 'All');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState<AuditLogPage | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [chain, setChain] = useState<{ intact: boolean; checked: number; message: string } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const params = { category, search: search.trim() || undefined, date_from: from || undefined, date_to: to || undefined };
  const load = useCallback(async () => {
    try {
      setPage(await billingService.getAuditLog(params));
      setFailed(null);
    } catch (e) {
      setFailed(apiError(e, 'The audit log could not be loaded.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, search, from, to]);

  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  const verify = useCallback(() => {
    billingService
      .verifyAuditChain()
      .then(setChain)
      .catch(() => setChain(null));
  }, []);
  useEffect(() => {
    Promise.resolve().then(verify);
  }, [verify]);

  const rows: HmsListRow[] = (page?.rows || []).map((e) => ({
    key: `e:${e.id}`,
    title: e.title,
    badge: <HmsBadge tone={SEV[e.severity] || 'gray'}>{e.category}</HmsBadge>,
    sub: e.change || '—',
    metaLeft: `${fmtWhen(e.occurred_at)} · ${e.user || 'System'}${e.counter ? ` · ${e.counter}` : ''}`,
    metaRight: <span style={MONO}>{e.reference}</span>,
  }));

  const exportCsv = async () => {
    try {
      await billingService.downloadCsv('/billing/audit-logs', params, 'billing-audit-log.csv');
      notify('Audit log exported · the export itself is logged');
    } catch (e) {
      notify(apiError(e, 'Export failed'), 'error');
    }
  };

  const renderDetail = (key: string | null) => {
    if (!page && !failed) return <HmsEmpty>Loading the audit log…</HmsEmpty>;
    if (failed) return <HmsEmpty>{failed}</HmsEmpty>;
    const e = page?.rows.find((x) => `e:${x.id}` === key);
    if (!e) return <HmsEmpty>No events match this search or filter.</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={ScrollText} title={e.title} badge={<HmsBadge tone={SEV[e.severity] || 'gray'}>{`${e.severity.toLowerCase()} · ${e.category}`}</HmsBadge>} subtitle={<span style={MONO}>{e.reference || e.event_type}</span>} />
        <HmsStatStrip
          items={[
            { label: 'When', value: fmtWhen(e.occurred_at) },
            { label: 'By', value: e.user || 'System' },
            { label: 'Counter', value: e.counter || '—' },
            { label: 'Sequence', value: e.sequence ?? '—', note: 'Position in the chain' },
          ]}
        />
        <HmsDetailBody>
          {chain && <HmsNotice tone={chain.intact ? 'green' : 'red'}>{chain.intact ? `Tamper check passed · ${chain.checked} entries verified.` : `Tamper check failed · ${chain.message}`}</HmsNotice>}
          <HmsSection title="Event">
            <HmsRow label="What changed" value={e.change || '—'} />
            <HmsRow label="Type" value={titleCase(e.event_type)} />
            <HmsRow label="Category" value={e.category} last />
          </HmsSection>
          <HmsSection title="Integrity">
            <HmsRow label="Entry hash" value={<span style={{ ...MONO, wordBreak: 'break-all' }}>{e.entry_hash || '—'}</span>} hint="Each entry seals the previous one; an edit or deletion breaks the chain" last />
          </HmsSection>
        </HmsDetailBody>
      </>
    );
  };

  const counts = page?.counts || {};
  return (
    <HmsMasterDetail
      listId="adm-audit"
      title="Audit trail"
      description={page?.retention ? `Every billing change, never edited. ${page.retention}` : 'Every billing change, never edited.'}
      total={page?.total ?? 0}
      rows={rows}
      search={search}
      onSearch={(v) => {
        setSearch(v);
        setSelected(null);
      }}
      searchPlaceholder="Search event, user or reference"
      headerAction={
        <div style={{ display: 'flex', gap: '8px' }}>
          <HmsButton size="sm" icon={ShieldCheck} onClick={verify} title="Re-run the tamper check">
            Verify
          </HmsButton>
          <HmsButton size="sm" icon={Download} onClick={exportCsv} title="Export the filtered log to CSV">
            CSV
          </HmsButton>
        </div>
      }
      pills={[
        { key: 'All', label: 'All', count: Object.values(counts).reduce((s, n) => s + n, 0) || page?.total || 0 },
        ...CATEGORIES.map((c) => ({ key: c, label: c, count: counts[c] ?? 0 })),
      ]}
      activePill={category}
      onPill={(k) => {
        setCategory(k);
        setSelected(null);
      }}
      leftExtra={
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
          <HmsField label="From" htmlFor="au-from">
            <input id="au-from" type="date" style={INPUT} value={from} onChange={(e) => setFrom(e.target.value)} />
          </HmsField>
          <HmsField label="To" htmlFor="au-to">
            <input id="au-to" type="date" style={INPUT} value={to} onChange={(e) => setTo(e.target.value)} />
          </HmsField>
        </div>
      }
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open event"
      detailLabel="Audit event"
      emptyText="No events match this search or filter."
      renderDetail={renderDetail}
    />
  );
};
