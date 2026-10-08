import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CheckSquare, Square, Download } from 'lucide-react';
import { AuditStream, billingService } from '../../../services/billingService';
import { Btn, C, Callout, Empty, PageHeader, PillTabs, apiError, card, mono } from '../executive/executiveUi';

const SEVERITY: Record<string, [string, string]> = { HIGH: ['High', C.red], MEDIUM: ['Medium', '#F59E0B'], LOW: ['Low', C.faint] };

const csvCell = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Phase 5 audit stream: flagged financial events across all counters, reviewed before shift end. */
export const AuditStreamScreen: React.FC = () => {
  const [stream, setStream] = useState<AuditStream | null>(null);
  const [counter, setCounter] = useState('ALL');
  const [unreviewedOnly, setUnreviewedOnly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStream(await billingService.getAuditStream({ counter: counter === 'ALL' ? undefined : counter, unreviewed: unreviewedOnly }));
      setError(null);
    } catch (err) {
      setError(apiError(err, 'Could not load the audit stream.'));
    }
  }, [counter, unreviewedOnly]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [load]);

  const review = async (id: string) => {
    setBusy(id);
    try {
      await billingService.markAuditReviewed(id);
      await load();
    } catch (err) {
      setError(apiError(err, 'Could not mark the event reviewed.'));
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = () => {
    const rows = stream?.rows || [];
    const lines = [
      ['Time', 'Severity', 'Event', 'Detail', 'Counter', 'User', 'Reference', 'Reviewed by'].map(csvCell).join(','),
      ...rows.map((e) => [new Date(e.occurred_at).toLocaleString(), e.severity, e.title, e.detail, e.counter_name, e.actor, e.reference, e.reviewed_by || ''].map(csvCell).join(','))
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `billing-audit-stream-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { key: 'ALL', label: 'All counters', count: stream?.unreviewed },
    ...(stream?.counters || []).map((c) => ({ key: c.counter_code, label: c.counter_name, count: c.unreviewed }))
  ];

  return (
    <>
      <PageHeader
        title="Audit Stream"
        subtitle="Flagged financial events across all counters. Review each one before shift end."
        actions={
          <>
            <Btn onClick={load}><RefreshCw size={16} /> Refresh</Btn>
            <Btn onClick={exportCsv} disabled={!stream?.rows.length}><Download size={16} /> Export</Btn>
          </>
        }
      />
      {error && <div style={{ marginBottom: 12 }}><Callout tone="red">{error}</Callout></div>}

      <div style={{ ...card }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <PillTabs tabs={tabs} active={counter} onPick={setCounter} />
          <Btn style={{ height: 32, fontSize: 13 }} onClick={() => setUnreviewedOnly((v) => !v)}>
            {unreviewedOnly ? <CheckSquare size={15} color={C.primary} /> : <Square size={15} />} Unreviewed only · {stream?.unreviewed ?? 0}
          </Btn>
        </div>
        {stream && stream.rows.length === 0 && <Empty text={unreviewedOnly ? 'All events reviewed.' : 'No flagged events yet.'} />}
        <div style={{ overflowX: 'auto' }}>
          {(stream?.rows || []).map((e) => {
            const [sev, color] = SEVERITY[e.severity] || [e.severity, C.muted];
            return (
              <div
                key={e.id}
                style={{ display: 'grid', gridTemplateColumns: '70px minmax(220px,2.4fr) minmax(150px,1.4fr) minmax(120px,1fr) 150px', gap: 12, alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${C.border}`, minWidth: 760, opacity: e.reviewed ? 0.6 : 1 }}
              >
                <span style={{ fontSize: 13, ...mono }}>{new Date(e.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span title={sev} style={{ width: 8, height: 8, borderRadius: 999, background: color, marginTop: 6, flexShrink: 0 }} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{e.title}</span>
                    <span style={{ fontSize: 12, color: C.muted }}>{e.detail}</span>
                  </span>
                </div>
                <span style={{ fontSize: 13 }}>{e.counter_name} · {e.actor}</span>
                <span style={{ fontSize: 12, color: C.muted, ...mono }}>{e.reference}</span>
                <span style={{ textAlign: 'right' }}>
                  {e.reviewed ? (
                    <span style={{ fontSize: 12, color: C.muted }}>Reviewed {e.reviewed_at ? new Date(e.reviewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  ) : (
                    <Btn style={{ height: 28, fontSize: 12 }} disabled={busy === e.id} onClick={() => review(e.id)}>Mark reviewed</Btn>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
