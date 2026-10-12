// Lab Technician workspace — HMS design bible Section 19 (reference: Lab Admin).
// Bench order: sample intake → result entry → sent for review, then analyzers & QC.
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TestTube2, FlaskConical, ClipboardList, Cpu, ScanLine } from 'lucide-react';
import { HmsShell, HmsNavGroup, HmsPageHeader, HmsKpiRow, HmsToast, useHmsToast, HmsBadge, HmsModal, HmsButton, HmsField, HmsNotice, INPUT } from '../../../components/hms';
import { useAuth } from '../../../context/AuthContext';
import { LabAdminStore } from '../data/labAdminStore';
import { orderFlag } from '../data/pathologistStore';
import { useTechnicianData, isIntake, isOnBench, isSubmitted, isUnpaid, analyzerOnline } from '../data/technicianStore';
import { TechnicianIntakeView } from './TechnicianIntakeView';
import { TechnicianResultsView } from './TechnicianResultsView';
import { TechnicianSubmittedView } from './TechnicianSubmittedView';
import { TechnicianAnalyzersView } from './TechnicianAnalyzersView';
import { TechnicianViewProps } from './technicianUi';

const TABS = ['intake', 'results', 'submitted', 'analyzers'] as const;
type Tab = (typeof TABS)[number];

const VIEWS: Record<Tab, React.FC<TechnicianViewProps>> = {
  intake: TechnicianIntakeView,
  results: TechnicianResultsView,
  submitted: TechnicianSubmittedView,
  analyzers: TechnicianAnalyzersView,
};

export const TechnicianWorkspace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = requested && (TABS as readonly string[]).includes(requested) ? requested : 'intake';
  const initialFilter = searchParams.get('filter') || undefined;
  const initialSelect = searchParams.get('select') || undefined;
  const { user } = useAuth();
  const by = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Lab Technician';

  const data = useTechnicianData();
  const { orders, analyzers } = data;
  const { toast, show, clear } = useHmsToast();
  const [newSignal, setNewSignal] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState('');
  const [scanError, setScanError] = useState('');

  const goTo = (tab: string, filter?: string, select?: string) => {
    const next: Record<string, string> = {};
    if (tab !== 'intake') next.tab = tab;
    if (filter) next.filter = filter;
    if (select) next.select = select;
    setSearchParams(next);
  };

  // Every figure below is derived from the lab data, never typed in
  const m = useMemo(() => {
    const intake = orders.filter(isIntake);
    const toCollect = intake.filter((o) => o.stage === 'ORDERED');
    const unpaid = toCollect.filter(isUnpaid);
    const toLoad = intake.filter((o) => o.stage === 'RECEIVED' || o.stage === 'ACCESSIONED');
    const bench = orders.filter(isOnBench);
    const retest = bench.filter((o) => o.returnedForRetest);
    const blocked = bench.filter((o) => o.isBlockedByDowntime);
    const stat = [...intake, ...bench].filter((o) => o.priority === 'STAT');
    const submitted = orders.filter(isSubmitted);
    const withPath = submitted.filter((o) => o.stage !== 'SIGNED_OFF');
    const critical = withPath.filter((o) => orderFlag(o) === 'Critical');
    const online = analyzers.filter(analyzerOnline);
    const offline = analyzers.filter((a) => a.status === 'Offline');
    const qcDue = analyzers.filter((a) => a.isQcDue && a.status !== 'Offline');
    return { intake, toCollect, unpaid, toLoad, bench, retest, blocked, stat, submitted, withPath, critical, online, offline, qcDue };
  }, [orders, analyzers]);

  const navGroups: HmsNavGroup[] = [
    {
      label: 'Bench work',
      items: [
        { key: 'intake', label: 'Sample intake', icon: TestTube2, count: m.intake.length },
        { key: 'results', label: 'Result entry', icon: FlaskConical, count: m.bench.length, alert: m.blocked.length > 0 || m.retest.length > 0 },
        { key: 'submitted', label: 'Sent for review', icon: ClipboardList, count: m.withPath.length },
      ],
    },
    { label: 'Equipment', items: [{ key: 'analyzers', label: 'Analyzers & QC', icon: Cpu, count: m.offline.length + m.qcDue.length, alert: m.offline.length > 0 }] },
  ];

  const doScan = () => {
    const code = scan.trim().toLowerCase();
    if (!code) return setScanError('Scan or type a specimen, order or UHID number.');
    const o = orders.find((x) => [x.specimenNumber, x.orderNumber, x.uhid, x.id].some((v) => v.toLowerCase() === code));
    if (!o) return setScanError(`No order matches “${scan.trim()}”. Check the label or search the lists.`);
    const tab = isIntake(o) ? 'intake' : isOnBench(o) ? 'results' : 'submitted';
    setScanning(false);
    setScan('');
    setScanError('');
    goTo(tab, undefined, o.id);
    show(`${o.specimenNumber} · ${o.patientName} — ${o.testName}`);
  };

  const View = VIEWS[activeTab];

  return (
    <HmsShell
      navLabel="Lab technician navigation"
      navGroups={navGroups}
      activeKey={activeTab}
      onNavigate={goTo}
      department={{ name: 'Diagnostic Laboratory', scope: LabAdminStore.get().settings.location, roleBadge: 'BENCH', roleName: 'Lab Technician', responsibility: 'Samples, analyzers & results' }}
      roleLabel="Lab Technician"
      crumb="Laboratory · Technician"
      crumbChip={
        <span style={{ marginLeft: '8px' }}>
          <HmsBadge tone="green" dot>
            Live
          </HmsBadge>
        </span>
      }
      altShortcuts={{
        KeyS: () => setScanning(true),
        KeyQ: () => goTo('analyzers', 'qc'),
        KeyN: () => {
          if (activeTab === 'analyzers') setNewSignal((s) => s + 1);
        },
      }}
      shortcutHelp={[
        ['Alt+S', 'Scan specimen barcode'],
        ['Alt+Q', 'Analyzers with QC due'],
        ['Alt+N', 'Log QC on the selected analyzer (on Analyzers & QC)'],
        ['Enter', 'Result entry: jump to the first value · Analyzers: log QC'],
      ]}
    >
      <HmsToast toast={toast} onClose={clear} />

      <HmsPageHeader
        title="Laboratory Technician Workspace"
        description="Sample intake, analyzer runs and result entry. Results go to the pathologist for sign-off; analyzer service and stock stay with Lab Admin."
        actions={[
          { label: 'QC due', icon: Cpu, onClick: () => goTo('analyzers', 'qc'), shortcutKey: 'Q' },
          { label: 'Scan specimen', icon: ScanLine, onClick: () => setScanning(true), primary: true, shortcutKey: 'S' },
        ]}
      />

      <HmsKpiRow
        items={[
          {
            key: 'intake',
            label: 'Samples to process',
            value: m.intake.length,
            unit: 'in intake',
            badge: m.stat.length ? { text: `${m.stat.length} STAT`, tone: 'red' } : { text: 'NO STAT', tone: 'gray' },
            caption: `${m.toCollect.length} to collect · ${m.toLoad.length} to load${m.unpaid.length ? ` · ${m.unpaid.length} bill unpaid` : ''}`,
            captionTone: m.unpaid.length ? 'amber' : 'muted',
            onOpen: () => goTo('intake', m.stat.length ? 'stat' : undefined),
            title: 'Open sample intake',
          },
          {
            key: 'bench',
            label: 'On analyzers',
            value: m.bench.length,
            unit: 'to enter',
            badge: m.retest.length ? { text: `${m.retest.length} RE-TEST`, tone: 'amber' } : { text: 'CLEAR', tone: 'green' },
            alert: m.blocked.length > 0,
            caption: m.blocked.length ? `${m.blocked.length} on an analyzer that is down` : 'Enter results when each run finishes',
            captionTone: m.blocked.length ? 'amber' : 'muted',
            onOpen: () => goTo('results', m.blocked.length ? 'blocked' : m.retest.length ? 'retest' : undefined),
            title: 'Open result entry',
          },
          {
            key: 'submitted',
            label: 'With pathologist',
            value: m.withPath.length,
            unit: 'awaiting sign-off',
            badge: m.critical.length ? { text: `${m.critical.length} CRITICAL`, tone: 'red' } : { text: 'NONE CRITICAL', tone: 'gray' },
            caption: `${m.submitted.length - m.withPath.length} signed off`,
            onOpen: () => goTo('submitted', 'review'),
            title: 'Open results sent for review',
          },
          {
            key: 'analyzers',
            label: 'Analyzers online',
            value: `${m.online.length}/${analyzers.length}`,
            unit: 'running or ready',
            badge: m.offline.length ? { text: `${m.offline.length} OFFLINE`, tone: 'red' } : m.qcDue.length ? { text: `${m.qcDue.length} QC DUE`, tone: 'amber' } : { text: 'QC OK', tone: 'green' },
            alert: m.offline.length > 0,
            caption: m.qcDue.length ? `${m.qcDue.length} need QC before patient samples` : 'All online analyzers in control',
            captionTone: m.qcDue.length ? 'amber' : 'muted',
            onOpen: () => goTo('analyzers', m.offline.length ? 'down' : m.qcDue.length ? 'qc' : undefined),
            title: 'Open analyzers & QC',
          },
        ]}
      />

      <View key={`${activeTab}-${initialFilter || ''}-${initialSelect || ''}`} data={data} by={by} notify={show} onNavigateTab={goTo} newSignal={newSignal} initialFilter={initialFilter} initialSelect={initialSelect} />

      {scanning && (
        <HmsModal
          title="Scan specimen"
          description="Scan the tube barcode, or type the specimen, order or UHID number."
          onClose={() => { setScanning(false); setScanError(''); }}
          width={460}
          footer={
            <>
              <HmsButton onClick={() => setScanning(false)}>Cancel</HmsButton>
              <HmsButton variant="primary" icon={ScanLine} onClick={doScan}>
                Open
              </HmsButton>
            </>
          }
        >
          <HmsField label="Barcode / number">
            <input
              style={INPUT}
              className={scanError ? 'hms-invalid' : undefined}
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  doScan();
                }
              }}
              placeholder="SPM-88213"
              autoComplete="off"
            />
          </HmsField>
          {scanError && <HmsNotice tone="red">{scanError}</HmsNotice>}
        </HmsModal>
      )}
    </HmsShell>
  );
};

export default TechnicianWorkspace;
