import React, { useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { CashierLiveQueue } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { filterQueueRows } from './cashierMath';
import { Btn, C, Empty, PageHeader, PillTabs, StatBadge, StatusChip, card, deptLabel, inputStyle, mono } from './executiveUi';
import { QUEUE_TABS } from './ExecutiveDashboard';

const PAGE_SIZE = 25;
const SOURCE_CARDS = ['ALL', 'OPD', 'LAB', 'RADIOLOGY', 'PHARMACY'];

interface Props {
  queue: CashierLiveQueue | null;
  search: string;
  onSearch: (q: string) => void;
  department: string;
  onDepartment: (d: string) => void;
  statOnly: boolean;
  onStatOnly: (v: boolean) => void;
  onOpenPatient: (uhid: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  onWalkin: () => void;
}

export const InvoiceQueueScreen: React.FC<Props> = ({ queue, search, onSearch, department, onDepartment, statOnly, onStatOnly, onOpenPatient, onRefresh, refreshing, onWalkin }) => {
  const { format: fmt } = useCurrency();
  const [pageState, setPage] = useState({ page: 0, key: '' });
  const all = queue?.rows || [];
  const filtered = filterQueueRows(all, search, department).filter((r) => !statOnly || r.is_stat);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Any filter change returns to the first page.
  const filterKey = `${search}|${department}|${statOnly}`;
  const page = pageState.key === filterKey ? Math.min(pageState.page, pages - 1) : 0;
  const goPage = (p: number) => setPage({ page: p, key: filterKey });
  const rows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const cols = '96px minmax(170px,2fr) minmax(180px,2.4fr) minmax(110px,1fr) 110px 80px 110px 60px';

  return (
    <>
      <PageHeader
        title="Invoice Queue"
        subtitle="Unbilled charges from consultations, diagnostics and pharmacy. STAT orders first."
        actions={
          <>
            <Btn onClick={onRefresh} disabled={refreshing}>
              <RefreshCw size={16} /> {refreshing ? 'Refreshing…' : 'Refresh'}
            </Btn>
            <Btn variant="primary" onClick={onWalkin}>
              Walk-in bill
            </Btn>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        {SOURCE_CARDS.map((src) => {
          const list = src === 'ALL' ? all : all.filter((r) => r.sources.includes(src));
          const on = department === src;
          return (
            <button
              key={src}
              onClick={() => onDepartment(src)}
              style={{ ...card, padding: 14, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, borderColor: on ? C.primary : C.border, boxShadow: on ? `0 0 0 1px ${C.primary}` : 'none' }}
            >
              <span style={{ fontSize: 13, color: C.muted }}>{src === 'ALL' ? 'All pending' : deptLabel(src)}</span>
              <span style={{ fontSize: 22, fontWeight: 600, ...mono }}>{list.length}</span>
              <span style={{ fontSize: 12, color: C.textSub, ...mono }}>{fmt(list.reduce((t, r) => t + r.amount, 0))}</span>
            </button>
          );
        })}
      </div>

      <div style={{ ...card }}>
        <div style={{ padding: 14, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 'min(360px, 100%)' }}>
            <Search size={16} color={C.faint} style={{ position: 'absolute', left: 10, top: 11 }} />
            <input
              autoFocus
              style={{ ...inputStyle, paddingLeft: 34 }}
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search name, UHID, mobile or token"
            />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <PillTabs
              tabs={QUEUE_TABS.map((d) => ({ key: d, label: d === 'ALL' ? 'All' : deptLabel(d), count: queue?.department_counts?.[d] ?? 0 }))}
              active={department}
              onPick={onDepartment}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.textSub, cursor: 'pointer' }}>
              <input type="checkbox" checked={statOnly} onChange={(e) => onStatOnly(e.target.checked)} /> STAT only
            </label>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 960 }}>
            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, padding: '10px 14px', fontSize: 12, color: C.muted, borderBottom: `1px solid ${C.border}`, background: C.bg }}>
              <span>Token</span><span>Patient</span><span>Charges</span><span>Payer</span><span>Status</span><span>Waiting</span><span style={{ textAlign: 'right' }}>Amount</span><span />
            </div>
            {rows.length === 0 && <Empty text={queue ? 'No charges match.' : 'Loading queue…'} />}
            {rows.map((r) => (
              <div
                key={`${r.patient_id}-${r.draft_id || 'q'}`}
                onClick={() => onOpenPatient(r.uhid)}
                style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, alignItems: 'center', padding: '12px 14px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.hover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 13, fontWeight: 600, ...mono }}>{r.token}</span>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{r.patient_name}</span>
                  <span style={{ fontSize: 12, color: C.muted, ...mono }}>{r.uhid} · {r.age_sex}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                    {r.sources.map(deptLabel).join(' + ')} {r.is_stat && <StatBadge />}
                  </span>
                  <span style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.summary}{r.items_count > 3 ? ` +${r.items_count - 3} more` : ''}
                  </span>
                </div>
                <span style={{ fontSize: 13 }}>{r.payer_label}</span>
                <StatusChip status={r.status} />
                <span style={{ fontSize: 13, color: r.wait_minutes > 8 ? C.amber : C.textSub, ...mono }}>{r.wait_minutes} min</span>
                <span style={{ fontSize: 14, fontWeight: 500, textAlign: 'right', ...mono }}>{fmt(r.amount)}</span>
                <span style={{ fontSize: 13, color: C.primary }}>Open →</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', fontSize: 13, color: C.muted }}>
          <span>Showing {rows.length} of {filtered.length}</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <Btn style={{ height: 32 }} disabled={page === 0} onClick={() => goPage(page - 1)}>Previous</Btn>
            <Btn style={{ height: 32 }} disabled={page >= pages - 1} onClick={() => goPage(page + 1)}>Next</Btn>
          </span>
        </div>
      </div>
    </>
  );
};
