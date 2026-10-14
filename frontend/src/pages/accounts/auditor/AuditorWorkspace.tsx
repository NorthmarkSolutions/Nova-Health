// Auditor workspace — HMS design bible Section 19 (reference: Lab Admin, Pharmacy Admin).
// Read-only and time-boxed to an engagement: the same records as the Controller's Audit Readiness and
// Internal Controls screens, without any action. Every request is recorded in the audit trail.
import React, { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, ClipboardCheck, ListChecks, ScrollText, Route, BookOpen, Tags, Scale, RefreshCw } from 'lucide-react';
import { HmsShell, HmsNavGroup, HmsPageHeader, HmsKpiRow, HmsBadge, HmsNotice, HMS } from '../../../components/hms';
import { WorkloadResponse } from '../../../services/accountsService';
import type { RoleViewKey } from '../components/AccountsStickyAppBar';
import { useAuditorData, daysUntil, when } from './auditorData';
import type { AuditorViewProps } from './auditorHelpers';
import { AuditorOverviewView, AuditorPbcView, AuditorControlsView, AuditorLogsView, AuditorTraceView, AuditorLedgerView } from './AuditorViews';

export interface AuditorWorkspaceProps {
  activeRoleView?: RoleViewKey;
  onSelectRole?: (role: RoleViewKey) => void;
  workload?: WorkloadResponse['queues'] | null;
  currentTime?: Date;
  onOpenMaster?: (master: 'coa' | 'dofa' | 'audit') => void;
}

const VIEWS: Record<string, React.FC<AuditorViewProps>> = {
  overview: AuditorOverviewView,
  pbc: AuditorPbcView,
  controls: AuditorControlsView,
  logs: AuditorLogsView,
  trace: AuditorTraceView,
  ledger: AuditorLedgerView,
};
const MASTERS: Record<string, 'coa' | 'dofa' | 'audit'> = { coa: 'coa', dofa: 'dofa', auditchain: 'audit' };

const CHIP: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '40px',
  padding: '0 12px',
  border: `1px solid ${HMS.border}`,
  borderRadius: '10px',
  fontSize: '13px',
  color: HMS.label,
  background: '#ffffff',
  whiteSpace: 'nowrap',
};

export const AuditorWorkspace: React.FC<AuditorWorkspaceProps> = ({ onOpenMaster }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const requested = searchParams.get('tab') || '';
  const activeTab = VIEWS[requested] ? requested : 'overview';
  const initialFilter = searchParams.get('filter') || undefined;
  const initialSelect = searchParams.get('select') || undefined;

  const data = useAuditorData();

  const goTo = (tab: string, filter?: string, select?: string) => {
    if (MASTERS[tab]) {
      if (onOpenMaster) navigate({ pathname: `/accounts/${MASTERS[tab]}`, search: location.search });
      return;
    }
    const next: Record<string, string> = {};
    if (tab !== 'overview') next.tab = tab;
    if (filter) next.filter = filter;
    if (select) next.select = select;
    setSearchParams(next);
  };

  // Live figures — every number is derived from the auditor API, never typed in
  const m = useMemo(() => {
    const violations = data.controls?.violations || [];
    const openV = violations.filter((v) => !/closed/i.test(v.status));
    const criticalV = openV.filter((v) => /critical/i.test(v.severity));
    const uncovered = (data.controls?.coverage || []).filter((c) => !c.covered);
    const brokenLogs = data.logs.filter((l) => !l.hash_valid);
    const files = data.pbc.reduce((a, p) => a + (p.evidence_count || 0), 0);
    return { openV, criticalV, uncovered, brokenLogs, files };
  }, [data]);

  const me = data.me;
  const chainOk = data.integrity ? data.integrity.chain.valid : me?.chain.valid;
  const left = daysUntil(me?.access?.valid_until);
  const blocked = !!data.denied;

  const navGroups: HmsNavGroup[] = [
    { label: 'Engagement', items: [{ key: 'overview', label: 'Engagement & integrity', icon: ShieldCheck, alert: chainOk === false }] },
    {
      label: 'Evidence',
      items: [
        { key: 'pbc', label: 'Audit readiness', icon: ClipboardCheck, count: blocked ? undefined : data.pbc.length },
        { key: 'controls', label: 'Internal controls', icon: ListChecks, count: blocked ? undefined : m.openV.length, alert: m.criticalV.length > 0 },
      ],
    },
    {
      label: 'Records',
      items: [
        { key: 'logs', label: 'Audit trail', icon: ScrollText, count: blocked ? undefined : m.brokenLogs.length || undefined, alert: m.brokenLogs.length > 0 },
        { key: 'trace', label: 'Journal trace', icon: Route },
        { key: 'ledger', label: 'General ledger', icon: BookOpen },
      ],
    },
    {
      label: 'Masters',
      items: [
        { key: 'coa', label: 'Chart of accounts', icon: Tags },
        { key: 'dofa', label: 'DoFA matrix', icon: Scale },
        { key: 'auditchain', label: 'Audit hash chain', icon: ShieldCheck },
      ],
    },
  ];

  const View = VIEWS[activeTab];

  return (
    <HmsShell
      navLabel="Auditor navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={goTo}
      department={{
        name: 'Accounts & Finance',
        scope: me?.engagement ? `${me.engagement.engagement_no} · ${me.engagement.auditor_firm}` : 'Statutory audit',
        roleBadge: 'AUDITOR',
        roleName: 'Auditor',
        responsibility: 'Read-only · time-boxed',
      }}
      roleLabel="Auditor"
      crumb="Accounts & Finance · Auditor"
      crumbChip={
        <span style={{ marginLeft: '8px' }}>
          <HmsBadge tone="gray">Read-only</HmsBadge>
        </span>
      }
      statusChips={
        <button type="button" style={{ ...CHIP, cursor: 'pointer' }} onClick={() => data.reload()} title="Refresh data (Alt+R)" aria-keyshortcuts="Alt+R">
          <RefreshCw size={16} />
          {data.lastSync ? `Synced ${data.lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Syncing…'}
        </button>
      }
      altShortcuts={{ KeyT: () => goTo('trace'), KeyL: () => goTo('ledger'), KeyR: () => data.reload() }}
      shortcutHelp={[
        ['Alt+T  ·  Alt+L', 'Journal trace · General ledger'],
        ['Alt+R', 'Refresh data'],
      ]}
    >
      <HmsPageHeader
        title="Auditor Workspace"
        description={
          me?.engagement
            ? `Read-only access for ${me.engagement.period_from} → ${me.engagement.period_to}. Every view you open is recorded in the audit trail.`
            : 'Read-only engagement access to evidence, controls, the audit trail and the ledger. Every view you open is recorded.'
        }
        actions={[
          { label: 'General ledger', icon: BookOpen, onClick: () => goTo('ledger'), shortcutKey: 'L' },
          { label: 'Journal trace', icon: Route, onClick: () => goTo('trace'), primary: true, shortcutKey: 'T' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'chain',
            label: 'Hash chain',
            value: blocked || chainOk == null ? null : chainOk ? 'Verified' : 'Broken',
            loading: data.loading,
            unit: me ? `${me.chain.total_records} records` : undefined,
            badge: chainOk == null ? { text: blocked ? 'NO ACCESS' : 'UNAVAILABLE', tone: 'gray' } : chainOk ? { text: 'INTACT', tone: 'green' } : { text: 'BROKEN', tone: 'red' },
            alert: chainOk === false,
            caption: blocked ? 'Access not active' : data.integrity ? (data.integrity.worm_exports.valid ? `${data.integrity.worm_exports.exports.length} WORM exports intact` : 'A WORM export failed verification') : 'Integrity unavailable',
            onOpen: () => goTo('overview'),
            title: 'Open engagement & integrity',
          },
          {
            key: 'pbc',
            label: 'Evidence shared',
            value: blocked ? null : data.pbc.length,
            loading: data.loading,
            unit: 'requests',
            badge: data.pbc.length ? { text: `${m.files} FILES`, tone: 'blue' } : { text: blocked ? 'NO ACCESS' : 'NONE YET', tone: 'gray' },
            caption: blocked ? 'Access not active' : 'Shared by the Finance Controller',
            onOpen: () => goTo('pbc'),
            title: 'Open audit readiness',
          },
          {
            key: 'controls',
            label: 'Open control violations',
            value: blocked || !data.controls ? null : m.openV.length,
            loading: data.loading,
            unit: 'violations',
            badge: m.criticalV.length ? { text: `${m.criticalV.length} CRITICAL`, tone: 'red' } : data.controls ? { text: m.openV.length ? 'OPEN' : 'CLEAR', tone: m.openV.length ? 'amber' : 'green' } : { text: blocked ? 'NO ACCESS' : 'UNAVAILABLE', tone: 'gray' },
            alert: m.criticalV.length > 0,
            caption: data.controls ? (m.uncovered.length ? `${m.uncovered.length} control${m.uncovered.length === 1 ? '' : 's'} not yet run` : 'Every control has run') : 'Controls unavailable',
            captionTone: m.uncovered.length ? 'amber' : 'muted',
            onOpen: () => goTo('controls', m.openV.length ? 'open' : 'coverage'),
            title: 'Open internal controls',
          },
          {
            key: 'access',
            label: 'Access until',
            value: me?.access ? when(me.access.valid_until).split(',')[0] : blocked ? 'Expired' : null,
            loading: data.loading,
            unit: left != null ? `${Math.max(0, left)} day${left === 1 ? '' : 's'} left` : undefined,
            badge: blocked ? { text: 'NOT ACTIVE', tone: 'red' } : left != null && left <= 3 ? { text: 'ENDING SOON', tone: 'amber' } : { text: 'ACTIVE', tone: 'green' },
            alert: blocked,
            caption: me?.engagement ? `Fieldwork ${me.engagement.fieldwork_from} → ${me.engagement.fieldwork_to}` : blocked ? 'The Finance Controller grants access' : 'Governance preview',
            onOpen: () => goTo('overview'),
            title: 'Open engagement & integrity',
          },
        ]}
      />

      {blocked && <HmsNotice tone="red">{data.denied} Access is read-only and time-boxed to an engagement; the Finance Controller grants it.</HmsNotice>}
      {!blocked && !data.loading && data.failed.length > 0 && <HmsNotice tone="amber">Could not load: {data.failed.join(', ')}. Those figures show as “—” until the next refresh (Alt+R).</HmsNotice>}

      <View key={`${activeTab}-${initialFilter || ''}-${initialSelect || ''}`} data={data} onNavigateTab={goTo} initialFilter={initialFilter} initialSelect={initialSelect} />
    </HmsShell>
  );
};

export default AuditorWorkspace;
