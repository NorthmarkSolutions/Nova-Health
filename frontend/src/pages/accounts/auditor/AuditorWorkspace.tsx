import React, { useEffect, useState } from 'react';
import { AccountsStickyAppBar, RoleViewKey } from '../components/AccountsStickyAppBar';
import { AccountsSidebarUserFooter } from '../components/AccountsSidebarUserFooter';
import { ShieldCheck, ClipboardCheck, ListChecks, ScrollText, Route, BookOpen, Eye, RefreshCw } from 'lucide-react';
import {
  accountsService,
  AuditorMe,
  AuditorPBCItem,
  AuditorPBCEvidence,
  AuditorControls,
  AuditorLogEntry,
  AuditorIntegrity,
  AuditorLedgerEntry,
  JournalTrace
} from '../../../services/accountsService';

// Read-only auditor workspace (Phase 11): same records as the Controller's Audit Readiness and
// Internal Controls screens, without any action. Every request is recorded in the audit trail.

const fmt = (n: number | string) => '₹ ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const when = (iso: string) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const apiError = (e: any) => e?.response?.data?.error?.message || 'Request failed — please retry.';

const G = '#F3F4F6';
const GF = '#374151';
const CH: Record<string, [string, string]> = {
  Open: ['#FEF2F2', '#B91C1C'],
  Remediating: ['#FFFBEB', '#B45309'],
  Escalated: ['#FEF2F2', '#B91C1C'],
  Closed: ['#F0FDF4', '#15803D'],
  Shared: ['#F0FDF4', '#15803D'],
  Critical: ['#FEF2F2', '#B91C1C'],
  High: ['#FFFBEB', '#B45309'],
  Medium: ['#FFFBEB', '#B45309'],
  Low: [G, GF],
  Verified: ['#F0FDF4', '#15803D'],
  Broken: ['#FEF2F2', '#B91C1C'],
  intact: ['#F0FDF4', '#15803D'],
  altered: ['#FEF2F2', '#B91C1C'],
  missing: ['#FEF2F2', '#B91C1C'],
  chain_broken: ['#FEF2F2', '#B91C1C'],
  posted: ['#F0FDF4', '#15803D'],
  approved: ['#F0FDF4', '#15803D']
};
const Chip: React.FC<{ st: string }> = ({ st }) => {
  const c = CH[st] || [G, GF];
  return <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', background: c[0], color: c[1] }}>{st}</span>;
};

const CARD: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(17,24,39,0.04)', minWidth: 0 };
const HEAD: React.CSSProperties = { display: 'grid', gap: '12px', padding: '0 20px', height: '44px', alignItems: 'center', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', fontSize: '12px', fontWeight: 600, color: '#6B7280' };
const ROW: React.CSSProperties = { display: 'grid', gap: '12px', padding: '8px 20px', minHeight: '52px', alignItems: 'center', borderBottom: '1px solid #F3F4F6', fontSize: '13px' };
const INPUT: React.CSSProperties = { height: '40px', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '0 12px', fontSize: '14px', outline: 'none', background: '#FFFFFF' };

const SCREENS: Record<string, [string, string, React.ComponentType<{ size?: number }>]> = {
  overview: ['Engagement & Integrity', 'Your access window, the audit hash chain and write-once exports.', ShieldCheck],
  pbc: ['Audit Readiness', 'Evidence the Finance Controller has shared with you for this engagement.', ClipboardCheck],
  controls: ['Internal Controls', 'Automated monitor coverage (IC-01 … IC-08) and the violations it raised.', ListChecks],
  logs: ['Audit Trail', 'Append-only record of every financial action, with each entry’s hash verified.', ScrollText],
  trace: ['Journal Trace', 'Follow any posted journal to its source event, approvals and documents.', Route],
  ledger: ['General Ledger', 'Posted ledger entries for the engagement period.', BookOpen]
};

const Kv: React.FC<{ l: string; v: React.ReactNode }> = ({ l, v }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
    <span style={{ fontSize: '12px', color: '#6B7280' }}>{l}</span>
    <span style={{ fontSize: '13px', fontWeight: 500, overflowWrap: 'anywhere' }}>{v}</span>
  </div>
);

const Check: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
    <span style={{ width: '18px', height: '18px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, background: ok ? '#DCFCE7' : '#FEE2E2', color: ok ? '#15803D' : '#B91C1C' }}>{ok ? '✓' : '!'}</span>
    <span>{label}</span>
  </div>
);

export const AuditorWorkspace: React.FC<any> = ({
  activeRoleView = 'auditor',
  onSelectRole = () => {},
  workload,
  currentTime,
  onOpenMaster
}) => {
  const [screen, setScreen] = useState('overview');
  const [me, setMe] = useState<AuditorMe | null>(null);
  const [denied, setDenied] = useState('');
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);

  const [integrity, setIntegrity] = useState<AuditorIntegrity | null>(null);
  const [pbc, setPbc] = useState<AuditorPBCItem[]>([]);
  const [pbcSel, setPbcSel] = useState('');
  const [evidence, setEvidence] = useState<AuditorPBCEvidence | null>(null);
  const [controls, setControls] = useState<AuditorControls | null>(null);
  const [ctlSel, setCtlSel] = useState('');
  const [logs, setLogs] = useState<AuditorLogEntry[]>([]);
  const [logFilter, setLogFilter] = useState({ module: '', user: '', q: '', from: '', to: '' });
  const [ledger, setLedger] = useState<AuditorLedgerEntry[]>([]);
  const [ledgerFilter, setLedgerFilter] = useState({ period: '', account: '' });
  const [traceRef, setTraceRef] = useState('');
  const [trace, setTrace] = useState<JournalTrace | null>(null);

  const load = async (fn: () => Promise<void>) => {
    setErr('');
    try {
      await fn();
    } catch (e: any) {
      if (e?.response?.status === 403) setDenied(apiError(e));
      else setErr(apiError(e));
    }
  };

  useEffect(() => {
    load(async () => {
      const m = await accountsService.getAuditorMe();
      setMe(m);
      setDenied('');
    });
  }, [tick]);

  useEffect(() => {
    if (!me) return;
    if (screen === 'overview') load(async () => setIntegrity(await accountsService.getAuditorIntegrity()));
    if (screen === 'pbc') load(async () => setPbc(await accountsService.getAuditorPBC()));
    if (screen === 'controls') load(async () => setControls(await accountsService.getAuditorControls()));
    if (screen === 'logs') load(async () => setLogs((await accountsService.getAuditorLogs(logFilter)).logs));
    if (screen === 'ledger') load(async () => setLedger((await accountsService.getAuditorLedger(ledgerFilter)).entries));
    // filters apply on demand through their own buttons
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, me, tick]);

  const openEvidence = (no: string) => {
    setPbcSel(no);
    setEvidence(null);
    load(async () => setEvidence(await accountsService.getAuditorPBCEvidence(no)));
  };

  const runTrace = () => {
    if (!traceRef.trim()) return;
    setTrace(null);
    load(async () => setTrace(await accountsService.getAuditorTrace(traceRef.trim())));
  };

  if (denied && !me) {
    return (
      <div style={{ ...CARD, padding: '32px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '18px', fontWeight: 700 }}>Auditor workspace unavailable</span>
        <span style={{ fontSize: '14px', color: '#6B7280' }}>{denied}</span>
        <span style={{ fontSize: '13px', color: '#6B7280' }}>Access is read-only and time-boxed to an engagement; the Finance Controller grants it.</span>
      </div>
    );
  }

  const head = SCREENS[screen];
  const selectedViolation = controls?.violations.find((v) => v.id === ctlSel) || controls?.violations[0];

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#111827', background: '#F9FAFB' }}>
      {/* SIDEBAR */}
      <aside style={{ width: '260px', flexShrink: 0, background: '#FFFFFF', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#2563EB', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>N</div>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>NorthHospital</div>
        </div>
        <div style={{ margin: '0 16px 8px', padding: '14px', border: '1px solid #E5E7EB', borderRadius: '12px', background: '#F9FAFB', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>Auditor · read-only</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>{me?.engagement ? `${me.engagement.engagement_no} · ${me.engagement.auditor_firm}` : 'No engagement'}</div>
          </div>
          <div style={{ paddingTop: '10px', borderTop: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>Access until</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{me?.access ? when(me.access.valid_until) : 'Governance preview'}</span>
          </div>
        </div>
        <nav style={{ flex: 1, overflow: 'auto', padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {Object.entries(SCREENS).map(([key, [label, , Icon]]) => {
            const on = key === screen;
            return (
              <button key={key} onClick={() => setScreen(key)} style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '40px', padding: '0 10px', border: 'none', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', fontSize: '14px', background: on ? '#EFF6FF' : 'transparent', color: on ? '#2563EB' : '#374151', fontWeight: on ? 600 : 500 }}>
                <span style={{ display: 'flex', opacity: 0.85 }}><Icon size={18} /></span>
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
        {/* AUDITOR USER FOOTER WITH LOGOUT */}
        <AccountsSidebarUserFooter customName={me?.auditor || 'Senior Auditor'} customRole="External Auditor · AUD-01" customInitials="AU" />
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <AccountsStickyAppBar
          activeRoleView={activeRoleView}
          onSelectRole={onSelectRole}
          workload={workload}
          breadcrumbScreen={head?.[0] || 'Auditor Engagement Workspace'}
          currentTime={currentTime}
          onOpenMaster={onOpenMaster}
        />
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <header style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Auditor · read-only</div>
            <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{head[0]}</h1>
            <p style={{ margin: 0, color: '#6B7280' }}>{head[1]}</p>
          </header>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: '#F0F9FF', border: '1px solid #BAE6FD', color: '#075985', fontSize: '13px' }}>
            <Eye size={16} />
            <span>Read-only access{me?.engagement ? ` for ${me.engagement.period_from} → ${me.engagement.period_to}` : ''}. Every view you open is recorded in the audit trail.</span>
          </div>
          {err && <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '13px' }}>{err}</div>}
          {denied && me && <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '13px' }}>{denied}</div>}

          {screen === 'overview' && me && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '16px' }}>
                <div style={{ ...CARD, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>Hash chain</span>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: me.chain.valid ? '#15803D' : '#B91C1C' }}>{me.chain.valid ? 'Verified' : 'Broken'}</span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>{me.chain.total_records} records · last #{me.chain.last_sequence}</span>
                </div>
                <div style={{ ...CARD, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>Write-once exports</span>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: integrity?.worm_exports.valid === false ? '#B91C1C' : '#111827' }}>{integrity?.worm_exports.exports.length ?? '—'}</span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>{integrity ? (integrity.worm_exports.valid ? 'All files intact' : 'A file failed verification') : 'Loading…'}</span>
                </div>
                <div style={{ ...CARD, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>Fieldwork</span>
                  <span style={{ fontSize: '18px', fontWeight: 700 }}>{me.engagement ? `${me.engagement.fieldwork_from} → ${me.engagement.fieldwork_to}` : '—'}</span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>{me.engagement?.type} audit</span>
                </div>
              </div>
              {integrity && !integrity.chain.valid && (
                <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '13px' }}>
                  Chain broken at sequence {integrity.chain.broken_at_sequence}: {integrity.chain.error}
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ ...CARD, flex: '1 1 380px', overflowX: 'auto' }}>
                  <div style={{ padding: '16px 20px', fontSize: '16px', fontWeight: 600 }}>Verification by day</div>
                  <div style={{ ...HEAD, gridTemplateColumns: '1fr 100px 100px' }}><span>Date</span><span>Records</span><span>Result</span></div>
                  {(integrity?.chain.days || []).slice().reverse().map((d) => (
                    <div key={d.date} style={{ ...ROW, gridTemplateColumns: '1fr 100px 100px' }}><span>{d.date}</span><span>{d.records}</span><span><Chip st={d.valid ? 'Verified' : 'Broken'} /></span></div>
                  ))}
                </div>
                <div style={{ ...CARD, flex: '1 1 380px', overflowX: 'auto' }}>
                  <div style={{ padding: '16px 20px', fontSize: '16px', fontWeight: 600 }}>Daily WORM exports</div>
                  <div style={{ ...HEAD, gridTemplateColumns: '1fr 100px 110px' }}><span>Export date</span><span>Records</span><span>File</span></div>
                  {(integrity?.worm_exports.exports || []).slice().reverse().map((x) => (
                    <div key={x.export_date} style={{ ...ROW, gridTemplateColumns: '1fr 100px 110px' }}><span>{x.export_date}</span><span>{x.records}</span><span><Chip st={x.status} /></span></div>
                  ))}
                  {integrity && !integrity.worm_exports.exports.length && <div style={{ padding: '24px 20px', color: '#6B7280' }}>No exports yet.</div>}
                </div>
              </div>
            </>
          )}

          {screen === 'pbc' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ ...CARD, flex: '999 1 520px', overflowX: 'auto' }}>
                <div style={{ ...HEAD, gridTemplateColumns: '90px minmax(200px,1fr) 140px 90px 90px' }}><span>Request</span><span>Item</span><span>Owner</span><span>Evidence</span><span>Status</span></div>
                {pbc.map((p) => (
                  <div key={p.id} onClick={() => openEvidence(p.id)} style={{ ...ROW, gridTemplateColumns: '90px minmax(200px,1fr) 140px 90px 90px', cursor: 'pointer', background: pbcSel === p.id ? '#EFF6FF' : '#FFFFFF' }}>
                    <span style={{ fontWeight: 600 }}>{p.id}</span><span>{p.title}</span><span>{p.owner}</span><span>{p.evidence_count} files</span><span><Chip st={p.status} /></span>
                  </div>
                ))}
                {!pbc.length && <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6B7280' }}>Nothing has been shared with you yet.</div>}
              </div>
              <div style={{ ...CARD, flex: '1 1 320px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {!evidence && <span style={{ color: '#6B7280' }}>Select a shared item to view its evidence.</span>}
                {evidence && (
                  <>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>{evidence.id} · shared {when(evidence.shared_at)}</span>
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>{evidence.title}</span>
                    {evidence.note && <span style={{ fontSize: '13px', color: '#374151' }}>{evidence.note}</span>}
                    {evidence.evidence.map((f) => (
                      <div key={f.file_name} style={{ padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {f.file_url ? <a href={f.file_url} target="_blank" rel="noreferrer" style={{ fontWeight: 500 }}>{f.file_name}</a> : <span style={{ fontWeight: 500 }}>{f.file_name}</span>}
                        {f.checksum && <span style={{ fontSize: '11px', color: '#6B7280', fontFamily: 'monospace' }}>sha256 {f.checksum}</span>}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {screen === 'controls' && controls && (
            <>
              <div style={{ ...CARD, overflowX: 'auto' }}>
                <div style={{ padding: '16px 20px', fontSize: '16px', fontWeight: 600 }}>Control monitor coverage</div>
                <div style={{ ...HEAD, gridTemplateColumns: '70px minmax(180px,1fr) 90px 90px 160px 80px 80px', minWidth: '820px' }}><span>Code</span><span>Control</span><span>Severity</span><span>Frequency</span><span>Last run</span><span>Checked</span><span>Open</span></div>
                {controls.coverage.map((c) => (
                  <div key={c.code} style={{ ...ROW, gridTemplateColumns: '70px minmax(180px,1fr) 90px 90px 160px 80px 80px', minWidth: '820px' }}>
                    <span style={{ fontWeight: 600 }}>{c.code}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontWeight: 500 }}>{c.name}</span><span style={{ fontSize: '12px', color: '#6B7280' }}>{c.description}</span></span>
                    <span><Chip st={c.severity} /></span><span>{c.frequency}</span>
                    <span style={{ color: c.covered ? '#111827' : '#B91C1C' }}>{c.covered ? when(c.last_run_at) : 'Not yet run'}</span>
                    <span>{c.last_checked}</span><span style={{ fontWeight: 600, color: c.open_violations ? '#B91C1C' : '#15803D' }}>{c.open_violations}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ ...CARD, flex: '999 1 520px', overflowX: 'auto' }}>
                  <div style={{ ...HEAD, gridTemplateColumns: '120px minmax(200px,1fr) 90px 110px' }}><span>Violation</span><span>Finding</span><span>Severity</span><span>Status</span></div>
                  {controls.violations.map((v) => (
                    <div key={v.id} onClick={() => setCtlSel(v.id)} style={{ ...ROW, gridTemplateColumns: '120px minmax(200px,1fr) 90px 110px', cursor: 'pointer', background: selectedViolation?.id === v.id ? '#EFF6FF' : '#FFFFFF' }}>
                      <span style={{ fontWeight: 600 }}>{v.id}</span><span>{v.title}</span><span><Chip st={v.severity} /></span><span><Chip st={v.status} /></span>
                    </div>
                  ))}
                </div>
                {selectedViolation && (
                  <div style={{ ...CARD, flex: '1 1 320px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>{selectedViolation.control_name}</span>
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>{selectedViolation.title}</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <Kv l="Who" v={selectedViolation.who || '—'} />
                      <Kv l="References" v={selectedViolation.refs || '—'} />
                      <Kv l="Exposure" v={fmt(selectedViolation.exposure_amount)} />
                      <Kv l="Remediation owner" v={selectedViolation.owner || '—'} />
                    </div>
                    {selectedViolation.trail.map((t, i) => (
                      <div key={i} style={{ fontSize: '13px' }}><strong>{t.t}</strong> <span style={{ color: '#6B7280' }}>· {t.who} · {t.when}</span>{t.c ? <div style={{ color: '#374151' }}>“{t.c}”</div> : null}</div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {screen === 'logs' && (
            <div style={{ ...CARD, overflowX: 'auto' }}>
              <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <input placeholder="Module" value={logFilter.module} onChange={(e) => setLogFilter({ ...logFilter, module: e.target.value })} style={{ ...INPUT, width: '140px' }} />
                <input placeholder="User" value={logFilter.user} onChange={(e) => setLogFilter({ ...logFilter, user: e.target.value })} style={{ ...INPUT, width: '140px' }} />
                <input placeholder="Reference or detail" value={logFilter.q} onChange={(e) => setLogFilter({ ...logFilter, q: e.target.value })} style={{ ...INPUT, width: '200px' }} />
                <input type="date" value={logFilter.from} onChange={(e) => setLogFilter({ ...logFilter, from: e.target.value })} style={INPUT} />
                <input type="date" value={logFilter.to} onChange={(e) => setLogFilter({ ...logFilter, to: e.target.value })} style={INPUT} />
                <button onClick={() => load(async () => setLogs((await accountsService.getAuditorLogs(logFilter)).logs))} style={{ ...INPUT, cursor: 'pointer', fontWeight: 500 }}>Apply</button>
              </div>
              <div style={{ ...HEAD, gridTemplateColumns: '70px 150px 150px 150px minmax(120px,1fr) 140px minmax(160px,1.3fr) 80px', minWidth: '1080px' }}>
                <span>#</span><span>Timestamp</span><span>User</span><span>Action</span><span>Module</span><span>Reference</span><span>Detail</span><span>Hash</span>
              </div>
              {logs.map((a) => (
                <div key={a.id} style={{ ...ROW, gridTemplateColumns: '70px 150px 150px 150px minmax(120px,1fr) 140px minmax(160px,1.3fr) 80px', minWidth: '1080px' }}>
                  <span style={{ color: '#6B7280' }}>{a.sequence}</span><span style={{ color: '#6B7280' }}>{when(a.occurred_at)}</span>
                  <span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: 500 }}>{a.actor_name}</span><span style={{ fontSize: '11px', color: '#6B7280' }}>{a.actor_role}</span></span>
                  <span>{a.action.replace(/_/g, ' ')}</span><span>{a.module.replace(/_/g, ' ')}</span><span style={{ fontWeight: 500 }}>{a.reference_no || '—'}</span>
                  <span style={{ color: '#374151' }}>{a.reason || '—'}</span>
                  <span title={a.entry_hash}><Chip st={a.hash_valid ? 'Verified' : 'Broken'} /></span>
                </div>
              ))}
              {!logs.length && <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6B7280' }}>No records for these filters.</div>}
            </div>
          )}

          {screen === 'trace' && (
            <>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input placeholder="Journal reference (e.g. JV-2610-0150) or id" value={traceRef} onChange={(e) => setTraceRef(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runTrace()} style={{ ...INPUT, width: '360px' }} />
                <button onClick={runTrace} style={{ ...INPUT, cursor: 'pointer', fontWeight: 600, background: '#2563EB', color: '#FFFFFF', border: '1px solid #2563EB' }}>Trace</button>
              </div>
              {trace && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ ...CARD, padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>{trace.journal.entry_type.replace(/_/g, ' ')} · {trace.journal.period}</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>{trace.journal.reference_no} — {trace.journal.description}</div>
                      </div>
                      <Chip st={trace.journal.status} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '8px' }}>
                      <Check ok={trace.completeness.source_identified} label="Source identified" />
                      <Check ok={trace.completeness.approval_evidence} label={trace.completeness.auto_posted_by_rule ? 'Auto-posted under event rule' : 'Approval evidence'} />
                      <Check ok={trace.completeness.gl_posted} label="Posted to GL" />
                      <Check ok={trace.completeness.audit_entries_hash_valid} label="Audit entries hash-valid" />
                      <Check ok={trace.completeness.chain_valid} label="Audit chain intact" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '12px' }}>
                      <Kv l="Journal date" v={trace.journal.journal_date} />
                      <Kv l="Maker" v={trace.journal.maker} />
                      <Kv l="Posted" v={when(trace.journal.posted_at)} />
                      <Kv l="Debit / Credit" v={`${fmt(trace.journal.total_debit)} / ${fmt(trace.journal.total_credit)}`} />
                    </div>
                  </div>

                  <div style={{ ...CARD, overflowX: 'auto' }}>
                    <div style={{ padding: '16px 20px', fontSize: '16px', fontWeight: 600 }}>Journal lines</div>
                    <div style={{ ...HEAD, gridTemplateColumns: 'minmax(200px,1fr) 100px 120px 120px minmax(160px,1fr)' }}><span>Account</span><span>Cost center</span><span>Debit</span><span>Credit</span><span>Narration</span></div>
                    {trace.journal.lines.map((l, i) => (
                      <div key={i} style={{ ...ROW, gridTemplateColumns: 'minmax(200px,1fr) 100px 120px 120px minmax(160px,1fr)' }}><span>{l.account}</span><span>{l.cost_center || '—'}</span><span>{fmt(l.debit)}</span><span>{fmt(l.credit)}</span><span style={{ color: '#6B7280' }}>{l.narration}</span></div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,380px),1fr))', gap: '16px' }}>
                    <div style={{ ...CARD, padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 600 }}>Source</span>
                      {trace.source_events.map((e) => (
                        <div key={e.event_id} style={{ padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '13px' }}>
                          <div style={{ fontWeight: 600 }}>{e.event_type}</div>
                          <div style={{ color: '#6B7280' }}>{e.source_department} · {e.source_reference} · {e.business_date} · {fmt(e.amount)}</div>
                        </div>
                      ))}
                      {trace.source_documents.map((d) => (
                        <div key={d.reference_no} style={{ padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '13px' }}>
                          <div style={{ fontWeight: 600 }}>{d.type.replace(/_/g, ' ')} · {d.reference_no}</div>
                          <div style={{ color: '#6B7280' }}>{d.vendor || d.partner || ''} {d.invoice_no ? `· ${d.invoice_no}` : ''} · {fmt(d.amount)}</div>
                        </div>
                      ))}
                      {!trace.source_events.length && !trace.source_documents.length && <span style={{ color: '#6B7280', fontSize: '13px' }}>Manual journal — maker {trace.journal.maker}.</span>}
                    </div>
                    <div style={{ ...CARD, padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 600 }}>Approvals</span>
                      {trace.approvals.map((a) => (
                        <div key={a.reference_no} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ fontSize: '13px' }}><strong>{a.reference_no}</strong> · {a.document_type.replace(/_/g, ' ')} · {fmt(a.amount)} · maker {a.maker} <Chip st={a.status} /></div>
                          {a.steps.map((s) => (
                            <div key={s.step_no} style={{ fontSize: '13px', paddingLeft: '12px', borderLeft: '2px solid #BFDBFE' }}>
                              {s.decision.replace(/_/g, ' ')} by {s.actor} ({s.level}){s.limit_applied ? ` · limit ${fmt(s.limit_applied)}` : ''} · {when(s.decided_at)}
                              {s.comment && <div style={{ color: '#374151' }}>“{s.comment}”</div>}
                            </div>
                          ))}
                        </div>
                      ))}
                      {!trace.approvals.length && <span style={{ color: '#6B7280', fontSize: '13px' }}>{trace.completeness.auto_posted_by_rule ? 'Posted automatically under the event auto-post rule.' : 'No approval records.'}</span>}
                    </div>
                    <div style={{ ...CARD, padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 600 }}>Documents</span>
                      {trace.documents.map((d) => (
                        <div key={d.file_name} style={{ fontSize: '13px' }}><strong>{d.file_name}</strong> · {d.doc_type}{d.checksum ? ` · sha256 ${d.checksum.slice(0, 12)}…` : ''}</div>
                      ))}
                      {!trace.documents.length && <span style={{ color: '#6B7280', fontSize: '13px' }}>No supporting documents attached.</span>}
                    </div>
                  </div>

                  <div style={{ ...CARD, overflowX: 'auto' }}>
                    <div style={{ padding: '16px 20px', fontSize: '16px', fontWeight: 600 }}>Audit trail for this journal</div>
                    <div style={{ ...HEAD, gridTemplateColumns: '70px 160px 160px 160px minmax(160px,1fr) 80px', minWidth: '860px' }}><span>#</span><span>Timestamp</span><span>User</span><span>Action</span><span>Detail</span><span>Hash</span></div>
                    {trace.audit_trail.map((a) => (
                      <div key={a.id} style={{ ...ROW, gridTemplateColumns: '70px 160px 160px 160px minmax(160px,1fr) 80px', minWidth: '860px' }}>
                        <span style={{ color: '#6B7280' }}>{a.sequence}</span><span>{when(a.occurred_at)}</span><span>{a.actor_name}</span><span>{a.action.replace(/_/g, ' ')}</span><span style={{ color: '#374151' }}>{a.reason || '—'}</span>
                        <span title={a.entry_hash}><Chip st={a.hash_valid ? 'Verified' : 'Broken'} /></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {screen === 'ledger' && (
            <div style={{ ...CARD, overflowX: 'auto' }}>
              <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <input placeholder="Period (YYYY-MM)" value={ledgerFilter.period} onChange={(e) => setLedgerFilter({ ...ledgerFilter, period: e.target.value })} style={{ ...INPUT, width: '160px' }} />
                <input placeholder="Account code" value={ledgerFilter.account} onChange={(e) => setLedgerFilter({ ...ledgerFilter, account: e.target.value })} style={{ ...INPUT, width: '160px' }} />
                <button onClick={() => load(async () => setLedger((await accountsService.getAuditorLedger(ledgerFilter)).entries))} style={{ ...INPUT, cursor: 'pointer', fontWeight: 500 }}>Apply</button>
              </div>
              <div style={{ ...HEAD, gridTemplateColumns: '110px 140px minmax(200px,1fr) 100px 120px 120px', minWidth: '820px' }}><span>Date</span><span>Journal</span><span>Account</span><span>Cost center</span><span>Debit</span><span>Credit</span></div>
              {ledger.map((g, i) => (
                <div key={i} onClick={() => { setTraceRef(g.journal); setScreen('trace'); }} style={{ ...ROW, gridTemplateColumns: '110px 140px minmax(200px,1fr) 100px 120px 120px', minWidth: '820px', cursor: 'pointer' }} title="Trace this journal">
                  <span>{g.posting_date}</span><span style={{ fontWeight: 500, color: '#2563EB' }}>{g.journal}</span><span>{g.account}</span><span>{g.cost_center || '—'}</span><span>{fmt(g.debit)}</span><span>{fmt(g.credit)}</span>
                </div>
              ))}
              {!ledger.length && <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6B7280' }}>No ledger entries for these filters.</div>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AuditorWorkspace;
