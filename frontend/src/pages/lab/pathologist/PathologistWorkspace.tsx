// Lab Pathologist workspace — HMS design bible Section 19 (reference: Lab Admin).
// Validation first: review queue and critical call-backs, then released reports, then the test catalog.
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardCheck, PhoneCall, FileText, BookOpen } from 'lucide-react';
import { HmsShell, HmsNavGroup, HmsPageHeader, HmsKpiRow, HmsToast, useHmsToast, HmsBadge } from '../../../components/hms';
import { useAuth } from '../../../context/AuthContext';
import { LabAdminStore, fmtMinutes } from '../data/labAdminStore';
import { usePathologistData, isReviewable, orderFlag, awaitingAck, ackWaitMinutes, signedToday, reviewMinutes, hasDraft } from '../data/pathologistStore';
import { PathologistReviewView } from './PathologistReviewView';
import { PathologistCallbacksView } from './PathologistCallbacksView';
import { PathologistReportsView } from './PathologistReportsView';
import { PathologistCatalogView } from './PathologistCatalogView';
import { PathologistViewProps } from './pathologistUi';

const TABS = ['review', 'callbacks', 'signed-reports', 'catalog'] as const;
type Tab = (typeof TABS)[number];

const VIEWS: Record<Tab, React.FC<PathologistViewProps>> = {
  review: PathologistReviewView,
  callbacks: PathologistCallbacksView,
  'signed-reports': PathologistReportsView,
  catalog: PathologistCatalogView,
};

export const PathologistWorkspace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = requested && (TABS as readonly string[]).includes(requested) ? requested : 'review';
  const initialFilter = searchParams.get('filter') || undefined;
  const { user } = useAuth();
  const by = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Pathologist';

  const data = usePathologistData();
  const { orders, reports, catalog, ackWindowMin, ackWindowLabel } = data;
  const { toast, show, clear } = useHmsToast();
  const [newSignal, setNewSignal] = useState(0);

  const goTo = (tab: string, filter?: string) => {
    const next: Record<string, string> = {};
    if (tab !== 'review') next.tab = tab;
    if (filter) next.filter = filter;
    setSearchParams(next);
  };

  // Every figure below is derived from the lab data, never typed in
  const m = useMemo(() => {
    const queue = orders.filter(isReviewable);
    const critical = queue.filter((o) => orderFlag(o) === 'Critical');
    const abnormal = queue.filter((o) => orderFlag(o) === 'Abnormal');
    const stat = queue.filter((o) => o.priority === 'STAT');
    const pendingAck = reports.filter(awaitingAck);
    const overdue = pendingAck.filter((r) => {
      const w = ackWaitMinutes(r);
      return w !== null && ackWindowMin !== null && w > ackWindowMin;
    });
    const today = reports.filter(signedToday);
    const todayCritical = today.filter((r) => r.flag === 'Critical');
    const todayAbnormal = today.filter((r) => r.flag === 'Abnormal');
    const times = today.map(reviewMinutes).filter((x): x is number => x !== null);
    const avgReview = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
    const drafts = catalog.filter(hasDraft);
    return { queue, critical, abnormal, stat, pendingAck, overdue, today, todayCritical, todayAbnormal, times, avgReview, drafts };
  }, [orders, reports, catalog, ackWindowMin]);

  const navGroups: HmsNavGroup[] = [
    {
      label: 'Validation',
      items: [
        { key: 'review', label: 'Review queue', icon: ClipboardCheck, count: m.queue.length, alert: m.critical.length > 0 },
        { key: 'callbacks', label: 'Critical call-backs', icon: PhoneCall, count: m.pendingAck.length, alert: m.pendingAck.length > 0 },
      ],
    },
    { label: 'Reports', items: [{ key: 'signed-reports', label: 'Signed reports', icon: FileText, count: m.today.length }] },
    { label: 'Quality & catalog', items: [{ key: 'catalog', label: 'Test catalog & ranges', icon: BookOpen, count: m.drafts.length }] },
  ];

  const View = VIEWS[activeTab];

  return (
    <HmsShell
      navLabel="Pathologist navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={goTo}
      department={{ name: 'Diagnostic Laboratory', scope: LabAdminStore.get().settings.location, roleBadge: 'PATHOLOGY', roleName: 'Consultant Pathologist', responsibility: 'Validation & sign-off' }}
      roleLabel="Pathologist"
      crumb="Laboratory · Pathologist"
      crumbChip={
        <span style={{ marginLeft: '8px' }}>
          <HmsBadge tone="green" dot>
            Live
          </HmsBadge>
        </span>
      }
      altShortcuts={{
        KeyN: () => {
          if (activeTab === 'catalog') setNewSignal((s) => s + 1);
        },
        KeyQ: () => goTo('review'),
        KeyC: () => goTo('callbacks', 'pending'),
      }}
      shortcutHelp={[
        ['Alt+N', 'Add test (on Test catalog & ranges)'],
        ['Alt+Q  ·  Alt+C', 'Review queue · Critical call-backs'],
        ['Enter', 'Review queue: write interpretation · Call-backs: record read-back · Reports: print'],
      ]}
    >
      <HmsToast toast={toast} onClose={clear} />

      <HmsPageHeader
        title="Laboratory Pathologist Workspace"
        description="Validate results, release signed reports and close critical call-backs. Reference ranges are published here; prices and analyzers stay with Lab Admin."
        actions={[
          { label: 'Critical call-backs', icon: PhoneCall, onClick: () => goTo('callbacks', 'pending'), shortcutKey: 'C' },
          { label: 'Review queue', icon: ClipboardCheck, onClick: () => goTo('review'), primary: true, shortcutKey: 'Q' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'queue',
            label: 'Awaiting sign-off',
            value: m.queue.length,
            unit: 'results',
            badge: m.stat.length ? { text: `${m.stat.length} STAT`, tone: 'red' } : { text: 'NO STAT', tone: 'gray' },
            alert: m.critical.length > 0,
            caption: `${m.critical.length} critical · ${m.abnormal.length} abnormal`,
            captionTone: m.critical.length ? 'amber' : 'muted',
            onOpen: () => goTo('review', m.critical.length ? 'critical' : undefined),
            title: 'Open the review queue',
          },
          {
            key: 'callbacks',
            label: 'Critical call-backs',
            value: m.pendingAck.length,
            unit: 'awaiting read-back',
            badge: m.overdue.length ? { text: `${m.overdue.length} OVERDUE`, tone: 'red' } : m.pendingAck.length ? { text: 'IN WINDOW', tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            alert: m.overdue.length > 0,
            caption: `Acknowledge within ${ackWindowLabel}`,
            captionTone: m.pendingAck.length ? 'amber' : 'muted',
            onOpen: () => goTo('callbacks', m.overdue.length ? 'overdue' : 'pending'),
            title: 'Open critical call-backs',
          },
          {
            key: 'signed',
            label: 'Signed today',
            value: m.today.length,
            unit: 'reports',
            badge: { text: 'TODAY', tone: 'gray' },
            caption: `${m.todayCritical.length} critical · ${m.todayAbnormal.length} abnormal`,
            onOpen: () => goTo('signed-reports', 'today'),
            title: 'Open reports signed today',
          },
          {
            key: 'review-time',
            label: 'Average review time',
            value: m.avgReview,
            unit: m.avgReview !== null ? 'min' : undefined,
            badge: { text: 'TODAY', tone: 'gray' },
            caption: m.times.length ? `Result entry to sign-off · ${m.times.length} report${m.times.length === 1 ? '' : 's'}` : 'No sign-offs with entry times today',
            onOpen: () => goTo('signed-reports', 'today'),
            title: `Open reports signed today${m.avgReview !== null ? ` (average ${fmtMinutes(m.avgReview)})` : ''}`,
          },
        ]}
      />

      <View key={`${activeTab}-${initialFilter || ''}`} data={data} by={by} notify={show} onNavigateTab={goTo} newSignal={newSignal} initialFilter={initialFilter} />
    </HmsShell>
  );
};

export default PathologistWorkspace;
