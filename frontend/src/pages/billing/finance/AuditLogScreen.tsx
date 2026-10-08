import React, { useCallback, useEffect, useState } from 'react';
import { Download, Search, ShieldCheck, ShieldAlert } from 'lucide-react';
import { AuditLogPage, billingService } from '../../../services/billingService';
import { Btn, C, Callout, Empty, Field, PageHeader, PillTabs, apiError, card, inputStyle, mono } from '../executive/executiveUi';

const CATEGORY_TONE: Record<string, [string, string]> = {
  Financial: [C.amber, C.amberSoft],
  'Master data': [C.primary, C.primarySoft],
  Policy: [C.indigo, C.indigoSoft],
  Contract: ['#0369A1', '#F0F9FF'],
  Access: [C.textSub, '#F3F4F6']
};
const CATEGORIES = ['All', 'Financial', 'Master data', 'Policy', 'Contract', 'Access'];

/** A-21 Audit Log: every financial, master-data, policy, contract and access event. Hash-chained; never edited. */
export const AuditLogScreen: React.FC = () => {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [user, setUser] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState<AuditLogPage | null>(null);
  const [chain, setChain] = useState<{ intact: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const params = { category, search: search.trim() || undefined, user: user.trim() || undefined, date_from: from || undefined, date_to: to || undefined };
  const load = useCallback(async () => {
    try {
      setPage(await billingService.getAuditLog(params));
      setError(null);
    } catch (err) {
      setError(apiError(err, 'Could not load the audit log.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, search, user, from, to]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    billingService.verifyAuditChain().then(setChain).catch(() => setChain(null));
  }, []);

  return (
    <>
      <PageHeader
        title="Audit Log"
        subtitle="Every financial and master-data change across the department. Entries cannot be edited or deleted."
        actions={<Btn onClick={() => billingService.downloadCsv('/billing/audit-logs', params, 'billing-audit-log.csv').catch((e) => setError(apiError(e, 'Export failed.')))}><Download size={16} /> Export</Btn>}
      />
      {error && <div style={{ marginBottom: 12 }}><Callout tone="red">{error}</Callout></div>}
      {chain && (
        <div style={{ marginBottom: 12 }}>
          <Callout tone={chain.intact ? 'green' : 'red'} icon={chain.intact ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />} title={chain.intact ? 'Tamper check passed' : 'Tamper check failed'}>
            {chain.message}
          </Callout>
        </div>
      )}
      <div style={{ ...card }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PillTabs tabs={CATEGORIES.map((c) => ({ key: c, label: c, count: page?.counts[c] }))} active={category} onPick={setCategory} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search size={16} color={C.faint} style={{ position: 'absolute', left: 10, top: 11 }} />
              <input style={{ ...inputStyle, paddingLeft: 34 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Event, change, reference or user" />
            </div>
            <Field label="Username"><input style={{ ...inputStyle, width: 150 }} value={user} onChange={(e) => setUser(e.target.value)} /></Field>
            <Field label="From"><input type="date" style={inputStyle} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="To"><input type="date" style={inputStyle} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
        </div>
        {page && page.rows.length === 0 && <Empty text="No entries match." />}
        <div style={{ overflowX: 'auto' }}>
          {(page?.rows || []).map((e) => {
            const [fg, bg] = CATEGORY_TONE[e.category] || [C.textSub, '#F3F4F6'];
            return (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '56px 130px 110px minmax(200px,2fr) minmax(130px,1fr) minmax(120px,1fr) 100px', gap: 10, alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 13, minWidth: 980 }}>
                <span style={{ color: C.faint, ...mono, fontSize: 12 }}>#{e.sequence ?? '—'}</span>
                <span style={{ ...mono, fontSize: 12 }}>{new Date(e.occurred_at).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: fg, background: bg, padding: '2px 8px', borderRadius: 999, justifySelf: 'start', whiteSpace: 'nowrap' }}>{e.category}</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontWeight: 500 }}>{e.title}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{e.change}</span>
                </span>
                <span>{e.user}{e.counter ? <span style={{ color: C.muted }}> · {e.counter}</span> : null}</span>
                <span style={{ ...mono, fontSize: 12 }}>{e.reference}</span>
                <span title="Entry hash (first 12 characters)" style={{ ...mono, fontSize: 11, color: C.faint }}>{e.entry_hash}</span>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '10px 14px', fontSize: 12, color: C.muted }}>
          {page ? `${page.rows.length} of ${page.total} entries shown · ${page.retention}` : ''}
        </div>
      </div>
    </>
  );
};
