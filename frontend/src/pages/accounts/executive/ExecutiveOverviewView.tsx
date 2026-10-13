// Accounts Executive · Overview: one queue of everything waiting on the executive, across sections.
// Each row opens its own section with that record selected.
import React, { useMemo, useState } from 'react';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { HmsMasterDetail, HmsListRow, HmsBadge, HmsButton, HmsDetailHeader, HmsStatStrip, HmsDetailBody, HmsDetailFooter, HmsNotice, HmsEmpty } from '../../../components/hms';
import { fmtDate, inr2 } from './executiveData';
import { buildWorkQueue, SECTION_LABEL } from './executiveQueue';
import type { ExecutiveViewProps } from './executiveHelpers';
import { StatusBadge } from './executiveUi';

export const ExecutiveOverviewView: React.FC<ExecutiveViewProps & { onOpenItem: (tab: string, filter: string | undefined, id: string) => void }> = ({ data, initialFilter, onOpenItem }) => {
  const queue = useMemo(() => buildWorkQueue(data), [data]);
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState(initialFilter || 'all');
  const [selected, setSelected] = useState<string | null>(null);

  const tabs = Object.keys(SECTION_LABEL).filter((t) => queue.some((w) => w.tab === t));
  const q = search.trim().toLowerCase();
  const visible = queue.filter((w) => (pill === 'all' || w.tab === pill) && (!q || [w.title, w.ref, w.section].some((v) => v.toLowerCase().includes(q))));

  const rows: HmsListRow[] = visible.map((w) => ({
    key: w.key,
    title: w.title,
    badge: <HmsBadge tone={w.tone}>{w.section}</HmsBadge>,
    sub: w.ref,
    metaLeft: w.date ? fmtDate(w.date) : undefined,
    metaRight: <strong>{inr2(w.amount)}</strong>,
  }));

  const open = (key: string) => {
    const w = queue.find((x) => x.key === key);
    if (w) onOpenItem(w.tab, w.filter, w.id);
  };

  const renderDetail = (key: string | null) => {
    const w = queue.find((x) => x.key === key);
    if (!w) return <HmsEmpty>{data.loading ? 'Loading your work…' : 'Nothing is waiting on you. New events, returns and unmatched lines will appear here.'}</HmsEmpty>;
    return (
      <>
        <HmsDetailHeader icon={LayoutDashboard} title={w.title} badge={<StatusBadge status={w.status} />} subtitle={`${w.section} · ${w.ref}`} />
        <HmsStatStrip
          items={[
            { label: 'Section', value: w.section },
            { label: 'Amount', value: inr2(w.amount) },
            { label: 'Date', value: fmtDate(w.date) },
            { label: 'Status', value: <StatusBadge status={w.status} /> },
          ]}
        />
        <HmsDetailBody>
          <HmsNotice tone={w.tone === 'red' ? 'red' : w.tone === 'amber' ? 'amber' : 'blue'}>{w.todo}</HmsNotice>
        </HmsDetailBody>
        <HmsDetailFooter>
          <HmsButton variant="primary" block icon={ArrowRight} onClick={() => open(w.key)}>
            Open in {w.section}
          </HmsButton>
        </HmsDetailFooter>
      </>
    );
  };

  return (
    <HmsMasterDetail
      listId="acc-overview"
      title="Today's work"
      description="Everything waiting on you across the ledger, most urgent first."
      total={queue.length}
      rows={rows}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search item, reference or section"
      pills={[
        { key: 'all', label: 'All', count: queue.length },
        ...tabs.map((t) => ({ key: t, label: SECTION_LABEL[t], count: queue.filter((w) => w.tab === t).length, ...(queue.some((w) => w.tab === t && w.tone === 'red') ? { tone: 'red' as const } : {}) })),
      ]}
      activePill={pill}
      onPill={setPill}
      selectedKey={selected}
      onSelect={setSelected}
      primaryLabel="open in its section"
      onPrimary={open}
      detailLabel="Work item"
      renderDetail={renderDetail}
    />
  );
};
