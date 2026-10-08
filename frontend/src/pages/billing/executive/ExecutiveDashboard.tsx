import React from 'react';
import { FileText, Wallet, Clock, ClipboardCheck, Users, Search } from 'lucide-react';
import { CashierDashboardData, CashierLiveQueue } from '../../../services/billingService';
import { useCurrency } from '../../../config/currency';
import { TENDER_COLORS, TENDER_LABELS, TenderMode, filterQueueRows } from './cashierMath';
import { Btn, C, Empty, KpiCard, PageHeader, PillTabs, StatBadge, StatusChip, card, deptLabel, inputStyle, mono } from './executiveUi';

interface Props {
  dashboard: CashierDashboardData | null;
  queue: CashierLiveQueue | null;
  search: string;
  onSearch: (q: string) => void;
  department: string;
  onDepartment: (d: string) => void;
  onOpenPatient: (uhid: string) => void;
  onGoQueue: () => void;
  onGoRequests: () => void;
  onWalkin: () => void;
}

export const QUEUE_TABS = ['ALL', 'OPD', 'LAB', 'RADIOLOGY', 'PHARMACY', 'IPD'];

export const ExecutiveDashboard: React.FC<Props> = ({ dashboard, queue, search, onSearch, department, onDepartment, onOpenPatient, onGoQueue, onGoRequests, onWalkin }) => {
  const { format: fmt } = useCurrency();
  const k = dashboard?.kpis;
  const shift = dashboard?.shift;
  const rows = filterQueueRows(queue?.rows || [], search, department).slice(0, 8);
  const counts = queue?.department_counts || {};

  const tenders = Object.entries(dashboard?.collections_by_tender || {}).filter(([, v]) => v > 0);
  const collected = k?.collected_today || 0;
  const shiftState = shift?.has_active_shift ? (shift.status === 'OPEN' ? 'Open' : 'Closing Pending') : 'Closed';

  return (
    <>
      <PageHeader
        title="Billing Dashboard"
        subtitle={`${shift?.counter_name || 'Counter'} queue, shift collections and requests awaiting decision.`}
        actions={
          <>
            <Btn onClick={onWalkin}>Walk-in bill</Btn>
            <Btn variant="primary" onClick={onGoQueue}>
              New Bill
            </Btn>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <KpiCard label="Invoices Today" value={k?.invoices_today ?? '—'} sub={`${k?.invoices_paid_today ?? 0} paid`} icon={<FileText size={16} />} />
        <KpiCard label="Collections Today" value={fmt(collected)} sub="All tenders" trend={shift?.shift_number || undefined} trendColor={C.primary} icon={<Wallet size={16} />} />
        <KpiCard
          label="Pending Bills"
          value={k?.pending_queue_patients ?? '—'}
          sub={`${k?.pending_queue_stat ?? 0} STAT · ${fmt(k?.pending_queue_amount || 0)}`}
          trend={k && k.oldest_wait_minutes > 8 ? `oldest ${k.oldest_wait_minutes}m` : undefined}
          trendColor={C.amber}
          icon={<Clock size={16} />}
          onClick={onGoQueue}
        />
        <KpiCard
          label="My Requests"
          value={k?.pending_approvals ?? '—'}
          sub="Awaiting supervisor"
          trend={k && k.pending_approvals > 0 ? 'Review' : undefined}
          icon={<ClipboardCheck size={16} />}
          onClick={onGoRequests}
        />
        <KpiCard
          label="Turnaround"
          value={`${k?.avg_turnaround_minutes ?? 0}m`}
          sub={`SLA ${k?.turnaround_sla_minutes ?? 10}m`}
          trend={`${k?.within_sla_percent ?? 100}% within SLA`}
          trendColor={(k?.within_sla_percent ?? 100) >= 90 ? C.green : C.amber}
          icon={<Users size={16} />}
        />
      </div>

      {/* Counter status + shift collection meter */}
      <div style={{ ...card, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{shift?.counter_name || 'Counter'} status</span>
          <div style={{ display: 'flex', gap: 12 }}>
            {[['Open', '#16A34A'], ['Closing Pending', '#F59E0B'], ['Closed', C.faint]].map(([label, color]) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: shiftState === label ? C.text : C.faint, fontWeight: shiftState === label ? 600 : 400 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: shiftState === label ? color : '#D1D5DB' }} />
                {label}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {[
            ['Opening float', fmt(shift?.opening_float || 0)],
            ['Cash (shift)', fmt(shift?.cash_collected || 0)],
            ['UPI (shift)', fmt(shift?.upi_collected || 0)],
            ['Card (shift)', fmt(shift?.card_collected || 0)],
            ['Current shift total', fmt(shift?.total_collected || 0)]
          ].map(([l, v], i) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 12, color: C.muted }}>{l}</span>
              <span style={{ fontSize: 15, fontWeight: i === 4 ? 700 : 500, ...mono }}>{v}</span>
            </div>
          ))}
        </div>
        <div>
          <div aria-label="Collections by tender" style={{ display: 'flex', height: 10, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
            {tenders.map(([mode, v]) => (
              <div key={mode} title={`${mode} ${fmt(v)}`} style={{ width: `${(v / (collected || 1)) * 100}%`, background: TENDER_COLORS[mode as TenderMode] || C.faint }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8 }}>
            {tenders.length === 0 && <span style={{ fontSize: 12, color: C.muted }}>No collections yet today.</span>}
            {tenders.map(([mode, v]) => (
              <span key={mode} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textSub }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: TENDER_COLORS[mode as TenderMode] || C.faint }} />
                {TENDER_LABELS[mode as TenderMode] || mode} <span style={mono}>{fmt(v)}</span>
              </span>
            ))}
          </div>
        </div>
        {!shift?.has_active_shift && (
          <span style={{ fontSize: 13, color: C.amber }}>You have no open shift. Billing and collections are locked until you open your counter from Counter Shift.</span>
        )}
      </div>

      {/* Queue snapshot */}
      <div style={{ ...card }}>
        <div style={{ padding: 14, borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Invoice Queue</span>
              <span style={{ fontSize: 13, color: C.muted }}>{queue?.total_patients ?? 0} open · STAT first</span>
            </div>
            <div style={{ position: 'relative', width: 'min(320px, 100%)' }}>
              <Search size={16} color={C.faint} style={{ position: 'absolute', left: 10, top: 11 }} />
              <input style={{ ...inputStyle, paddingLeft: 34 }} value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Name, UHID, mobile, token" />
            </div>
          </div>
          <PillTabs
            tabs={QUEUE_TABS.map((d) => ({ key: d, label: d === 'ALL' ? 'All' : deptLabel(d), count: counts[d] ?? 0 }))}
            active={department}
            onPick={onDepartment}
          />
        </div>
        {rows.length === 0 && <Empty text="No invoices match this filter." />}
        {rows.map((r) => (
          <div
            key={`${r.patient_id}-${r.draft_id || 'q'}`}
            onClick={() => onOpenPatient(r.uhid)}
            style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,2fr) minmax(120px,1.5fr) minmax(90px,1fr) auto', gap: 12, alignItems: 'center', padding: '12px 14px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{r.patient_name}</span>
              <span style={{ fontSize: 12, color: C.muted, ...mono }}>{r.uhid} · {r.wait_minutes}m</span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13 }}>{r.sources.map(deptLabel).join(' + ')}</span>
              {r.is_stat && <StatBadge />}
            </div>
            {r.status === 'DRAFT' ? <StatusChip status="DRAFT" label={`Draft · ${r.token}`} /> : <StatusChip status="AWAITING_BILL" label={r.payer_label} />}
            <span style={{ fontSize: 14, fontWeight: 500, textAlign: 'right', ...mono }}>{fmt(r.amount)}</span>
          </div>
        ))}
        {(queue?.total_patients || 0) > rows.length && (
          <div style={{ padding: 12, textAlign: 'center' }}>
            <Btn variant="ghost" onClick={onGoQueue}>
              View full queue →
            </Btn>
          </div>
        )}
      </div>
    </>
  );
};
