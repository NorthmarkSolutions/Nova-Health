// Billing · Supervisor — the audit stream: flagged financial events across all counters (high cash, voids, overrides,
// refunds, closings, counter mode, desk handovers). Each one is reviewed before shift end; low-risk events can be cleared in bulk.
import React, { useState } from 'react';
import { ShieldAlert, CheckCheck, Download, Check } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsSection, HmsRow, HmsNotice, HmsEmpty, HmsModal, HmsTone } from '../../../components/hms';
import { AuditEventRow, billingService } from '../../../services/billingService';
import { apiError } from '../executive/executiveUi';
import { SupervisorDeskData, MONO, fmtClock, fmtWhen } from './supervisorDeskData';

export interface SupAuditViewProps {
  data: SupervisorDeskData;
  notify: (message: string, tone?: 'success' | 'error') => void;
  initialFilter?: string;
  initialSelect?: string;
}

const SEVERITY: Record<string, { label: string; tone: HmsTone }> = {
  HIGH: { label: 'High', tone: 'red' },
  MEDIUM: { label: 'Medium', tone: 'amber' },
  LOW: { label: 'Low', tone: 'gray' },
};
const PILLS = ['open', 'HIGH', 'MEDIUM', 'LOW', 'reviewed'];
const csvCell = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export const SupAuditView: React.FC<SupAuditViewProps> = ({ data, notify, initialFilter, initialSelect }) => {
  const events = data.audit?.rows || [];
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter && PILLS.includes(initialFilter) ? initialFilter : 'open');
  const [selected, setSelected] = useState<string | null>(initialSelect ? `e:${initialSelect}` : null);
  const [busy, setBusy] = useState(false);
  const [bulk, setBulk] = useState(false);

  const match = (e: AuditEventRow, p: string) => (p === 'open' ? !e.reviewed : p === 'reviewed' ? e.reviewed : !e.reviewed && e.severity === p);
  const q = search.trim().toLowerCase();
  const visible = events.filter((e) => match(e, pill) && (!q || [e.title, e.detail, e.counter_name, e.actor, e.reference, e.event_type].some((v) => (v || '').toLowerCase().includes(q))));
  const lowOpen = events.filter((e) => !e.reviewed && e.severity === 'LOW');
  const rows: HmsListRow[] = visible.map((e) => {
    const sev = SEVERITY[e.severity] || { label: e.severity, tone: 'gray' as HmsTone };
    return {
      key: `e:${e.id}`,
      title: e.title,
      badge: e.reviewed ? <HmsBadge tone="gray">Reviewed</HmsBadge> : <HmsBadge tone={sev.tone}>{sev.label}</HmsBadge>,
      sub: e.detail || '—',
      metaLeft: `${fmtClock(e.occurred_at)} · ${e.counter_name || '—'} · ${e.actor || '—'}`,
      metaRight: <span style={MONO}>{e.reference}</span>,
    };
  });

  const review = async (id: string) => {
    setBusy(true);
    try {
      await billingService.markAuditReviewed(id);
      notify('Event marked reviewed');
      setSelected(null);
      await data.reload();
    } catch (err) {
      notify(apiError(err, 'Could not mark the event reviewed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const reviewLow = async () => {
    setBusy(true);
    const results = await Promise.allSettled(lowOpen.map((e) => billingService.markAuditReviewed(e.id)));
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    setBusy(false);
    setBulk(false);
    notify(ok === lowOpen.length ? `${ok} low-risk event${ok === 1 ? '' : 's'} marked reviewed` : `${ok} of ${lowOpen.length} marked reviewed — try the rest again`, ok === lowOpen.length ? 'success' : 'error');
    await data.reload();
  };

  const exportCsv = () => {
    const lines = [
      ['Time', 'Severity', 'Event', 'Detail', 'Counter', 'User', 'Reference', 'Reviewed by', 'Reviewed at'].map(csvCell).join(','),
      ...visible.map((e) => [new Date(e.occurred_at).toLocaleString(), e.severity, e.title, e.detail, e.counter_name, e.actor, e.reference, e.reviewed_by || '', e.reviewed_at ? new Date(e.reviewed_at).toLocaleString() : ''].map(csvCell).join(',')),
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `billing-audit-stream-${new Date().toLocaleDateString('en-CA')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`${visible.length} event${visible.length === 1 ? '' : 's'} exported`);
  };

  const renderDetail = (key: string | null) => {
    if (data.loading && !data.audit) return <HmsEmpty>Loading the audit stream…</HmsEmpty>;
    const e = events.find((x) => `e:${x.id}` === key);
    if (!e) return <HmsEmpty>{events.length ? 'Select an event from the list.' : 'No flagged events yet.'}</HmsEmpty>;
    const sev = SEVERITY[e.severity] || { label: e.severity, tone: 'gray' as HmsTone };
    const sameRef = e.reference ? events.filter((x) => x.reference === e.reference && x.id !== e.id) : [];
    return (
      <>
        <HmsDetailHeader icon={ShieldAlert} title={e.title} badge={<HmsBadge tone={e.reviewed ? 'gray' : sev.tone}>{e.reviewed ? 'Reviewed' : `${sev.label} risk`}</HmsBadge>} subtitle={<span style={MONO}>{e.reference || e.event_type}</span>} />
        <HmsStatStrip
          items={[
            { label: 'When', value: fmtClock(e.occurred_at), note: fmtWhen(e.occurred_at) },
            { label: 'Counter', value: e.counter_name || '—', note: e.counter_code || undefined },
            { label: 'By', value: e.actor || '—' },
            { label: 'Severity', value: sev.label, tone: e.severity === 'HIGH' ? 'red' : e.severity === 'MEDIUM' ? 'amber' : 'default' },
          ]}
        />
        <HmsDetailBody>
          {!e.reviewed && e.severity === 'HIGH' && <HmsNotice tone="red">High-risk event. Check the reference and talk to the cashier before marking it reviewed.</HmsNotice>}
          <HmsSection title="Event">
            <HmsRow label="What happened" value={e.detail || '—'} />
            <HmsRow label="Type" value={e.event_type.replace(/_/g, ' ').toLowerCase()} />
            <HmsRow label="Reviewed" value={e.reviewed ? `${e.reviewed_by || 'Supervisor'} · ${fmtWhen(e.reviewed_at)}` : 'Not yet'} last />
          </HmsSection>
          {sameRef.length > 0 && (
            <HmsSection title={`Same reference · ${sameRef.length}`}>
              {sameRef.slice(0, 8).map((x, i, arr) => (
                <HmsRow key={x.id} label={x.title} hint={`${fmtClock(x.occurred_at)} · ${x.actor}`} value={<HmsBadge tone={x.reviewed ? 'gray' : (SEVERITY[x.severity] || SEVERITY.LOW).tone}>{x.reviewed ? 'Reviewed' : x.severity.toLowerCase()}</HmsBadge>} last={i === arr.length - 1} />
              ))}
            </HmsSection>
          )}
        </HmsDetailBody>
        {!e.reviewed && (
          <HmsDetailFooter>
            <HmsButton variant="primary" icon={Check} block disabled={busy} onClick={() => review(e.id)}>
              Mark reviewed
            </HmsButton>
          </HmsDetailFooter>
        )}
      </>
    );
  };

  return (
    <>
      <HmsMasterDetail
        listId="sup-audit"
        title="Audit stream"
        description="Flagged financial events across all counters. Review each one before the shift ends."
        total={events.length}
        rows={rows}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search event, counter, user or reference"
        headerAction={
          <div style={{ display: 'flex', gap: '8px' }}>
            <HmsButton size="sm" icon={Download} disabled={!visible.length} onClick={exportCsv} aria-label="Export shown events to CSV" title="Export shown events to CSV">
              CSV
            </HmsButton>
            <HmsButton size="sm" icon={CheckCheck} disabled={!lowOpen.length} onClick={() => setBulk(true)} title={lowOpen.length ? `Mark ${lowOpen.length} low-risk events reviewed` : 'No low-risk events to clear'}>
              Low
            </HmsButton>
          </div>
        }
        pills={[
          { key: 'open', label: 'To review', count: events.filter((e) => !e.reviewed).length },
          { key: 'HIGH', label: 'High', count: events.filter((e) => !e.reviewed && e.severity === 'HIGH').length, tone: 'red' },
          { key: 'MEDIUM', label: 'Medium', count: events.filter((e) => !e.reviewed && e.severity === 'MEDIUM').length, tone: 'amber' },
          { key: 'LOW', label: 'Low', count: lowOpen.length },
          { key: 'reviewed', label: 'Reviewed', count: events.filter((e) => e.reviewed).length },
        ]}
        activePill={pill}
        onPill={(k) => {
          setPill(k);
          setSelected(null);
        }}
        selectedKey={selected}
        onSelect={setSelected}
        primaryLabel="mark reviewed"
        onPrimary={(k) => {
          const e = events.find((x) => `e:${x.id}` === k);
          if (e && !e.reviewed && !busy) review(e.id);
        }}
        detailLabel="Audit event"
        emptyText={pill === 'open' ? 'All events reviewed.' : 'No events match this search or filter.'}
        renderDetail={renderDetail}
      />
      {bulk && (
        <HmsModal
          title={`Mark ${lowOpen.length} low-risk event${lowOpen.length === 1 ? '' : 's'} reviewed?`}
          description="Counter-mode switches, routine pickups and similar low-risk events. High and medium events still need a one-by-one review."
          onClose={() => setBulk(false)}
          busy={busy}
          footer={
            <>
              <HmsButton onClick={() => setBulk(false)} data-autofocus>
                Cancel
              </HmsButton>
              <HmsButton variant="primary" icon={CheckCheck} onClick={reviewLow} disabled={busy}>
                {busy ? 'Marking…' : 'Mark reviewed'}
              </HmsButton>
            </>
          }
        >
          {lowOpen.slice(0, 6).map((e) => (
            <HmsRow key={e.id} label={e.title} hint={`${fmtClock(e.occurred_at)} · ${e.counter_name} · ${e.actor}`} />
          ))}
          {lowOpen.length > 6 && <HmsRow label={`…and ${lowOpen.length - 6} more`} last />}
        </HmsModal>
      )}
    </>
  );
};
