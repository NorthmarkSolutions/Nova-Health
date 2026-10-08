import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListOrdered, Receipt, ClipboardList, Store, ShieldCheck, ArrowLeft, BedDouble } from 'lucide-react';
import { billingService, CashierDashboardData, CashierLiveQueue, counterMode } from '../../../services/billingService';
import { useAuth } from '../../../context/AuthContext';
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { InvoiceQueueScreen } from './InvoiceQueueScreen';
import { ReceiptsRepository } from './ReceiptsRepository';
import { MyRequestsScreen } from './MyRequestsScreen';
import { PatientBillingDrawer } from './PatientBillingDrawer';
import { WalkinBillDrawer } from './WalkinBillDrawer';
import { CounterShiftScreen } from './CounterShiftScreen';
import { IpdRunningBillsScreen } from './IpdRunningBillsScreen';
import { Btn, C, Callout, apiError } from './executiveUi';

const POLL_MS = 15000;
const SUPERVISOR_ROLES = ['BILLING_SUPERVISOR', 'BILLING_ADMIN', 'BILLING_MANAGER', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'];

/**
 * Phase 3 — Billing Executive / Cashier workspace.
 * Spec: "Billing Executive Workspace v2" (Dashboard, Invoice Queue, Patient Billing drawer,
 * Multi-tender collection drawer, Receipts & Invoices repository, My Requests).
 * Phase 4 — Counter Shift (open/close/pickups). Counter Closing moved to the Supervisor workspace in Phase 5.
 * Phase 5 — counter mode: a supervisor assisting another cashier's open shift sees a sticky amber banner;
 * every billing call carries the assist header (see billingService.counterMode).
 * Phase 9 — IPD Running Bills & Financial Discharge Clearance Gate.
 */
export const BillingExecutiveWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { role } = useAuth();
  const isSupervisor = SUPERVISOR_ROLES.includes(String(role));
  const [dashboard, setDashboard] = useState<CashierDashboardData | null>(null);
  const [queue, setQueue] = useState<CashierLiveQueue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [statOnly, setStatOnly] = useState(false);
  const [patientUhid, setPatientUhid] = useState<string | null>(null);
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [assist, setAssist] = useState(() => counterMode.get());
  const [assistEnded, setAssistEnded] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [d, q] = await Promise.all([billingService.getCashierDashboard(), billingService.getCashierLiveQueue()]);
      if (d.assist && 'detail' in d.assist) {
        // The assisted cashier closed their counter: drop out of counter mode
        counterMode.clear();
        setAssist(null);
        setAssistEnded(d.assist.detail);
      }
      setDashboard(d);
      setQueue(q);
      setError(null);
    } catch (err) {
      setError(apiError(err, 'Billing service is unreachable.'));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const counterCode = dashboard?.shift?.counter_code || undefined;
  const pendingApprovals = dashboard?.kpis.pending_approvals || 0;

  const backToSupervisor = async () => {
    await billingService.exitCounterMode();
    setAssist(null);
    navigate('/billing/supervisor');
  };

  // Phase 4 shift guard: no own open shift -> billing, payments and deposits are read-only
  const shiftOpen = !!dashboard?.shift?.has_active_shift;
  const shiftKnown = !!dashboard;

  return (
    <div style={{ background: C.bg, minHeight: '100%', color: C.text, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {assist && (
        <div
          role="status"
          style={{ position: 'sticky', top: 0, zIndex: 20, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
            padding: '10px 14px', borderRadius: 10, background: C.amberSoft, border: `1px solid ${C.amberBorder}`, color: C.amber, fontSize: 13 }}
        >
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <b>{assist.banner}</b>
            <span style={{ color: C.textSub }}>
              Actions post to this counter as “assisted by {assist.supervisor_name}”. Requests you raise here route to Billing Admin.
            </span>
          </span>
          <Btn style={{ height: 32, fontSize: 13 }} onClick={backToSupervisor}><ArrowLeft size={14} /> Back to supervisor</Btn>
        </div>
      )}
      {assistEnded && !assist && (
        <div style={{ marginBottom: 16 }}>
          <Callout tone="amber" title="Counter mode ended">
            {assistEnded} <Btn variant="ghost" style={{ height: 26, fontSize: 13 }} onClick={() => navigate('/billing/supervisor')}>Supervisor workspace</Btn>
          </Callout>
        </div>
      )}


      {error && (
        <div style={{ marginBottom: 16 }}>
          <Callout tone="red" title="Live data unavailable">{error}</Callout>
        </div>
      )}
      {shiftKnown && !shiftOpen && !assist && !pathname.startsWith('/billing/shift') && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 14px', borderRadius: 10, background: C.amberSoft, border: `1px solid ${C.amberBorder}`, color: C.amber, fontSize: 13 }}>
          <span><b>Counter closed.</b> Billing, payments and deposits are read-only until you open your shift.</span>
          <Btn style={{ height: 32, fontSize: 13 }} onClick={() => navigate('/billing/shift')}>Open counter</Btn>
        </div>
      )}

      <Routes>
        <Route
          index
          element={
            <ExecutiveDashboard
              dashboard={dashboard}
              queue={queue}
              search={search}
              onSearch={setSearch}
              department={department}
              onDepartment={setDepartment}
              onOpenPatient={setPatientUhid}
              onGoQueue={() => navigate('/billing/queue')}
              onGoRequests={() => navigate('/billing/requests')}
              onWalkin={() => setWalkinOpen(true)}
            />
          }
        />
        <Route
          path="queue"
          element={
            <InvoiceQueueScreen
              queue={queue}
              search={search}
              onSearch={setSearch}
              department={department}
              onDepartment={setDepartment}
              statOnly={statOnly}
              onStatOnly={setStatOnly}
              onOpenPatient={setPatientUhid}
              onRefresh={refresh}
              refreshing={refreshing}
              onWalkin={() => setWalkinOpen(true)}
            />
          }
        />
        <Route
          path="ipd"
          element={
            <IpdRunningBillsScreen
              onAcceptDeposit={(_ip, uhid) => setPatientUhid(uhid)}
            />
          }
        />
        <Route path="receipts" element={<ReceiptsRepository onChanged={refresh} />} />
        <Route path="requests" element={<MyRequestsScreen shiftOpen={shiftOpen} />} />
        <Route path="shift" element={<CounterShiftScreen onChanged={refresh} />} />
        <Route path="closing" element={<Navigate to="/billing/supervisor/closing" replace />} />
        <Route path="counter" element={<Navigate to="/billing/shift" replace />} />
        <Route path="*" element={<Navigate to="/billing" replace />} />
      </Routes>

      {patientUhid && (
        <PatientBillingDrawer uhid={patientUhid} counterCode={counterCode} shiftOpen={shiftOpen} onClose={() => setPatientUhid(null)} onChanged={refresh} />
      )}
      {walkinOpen && <WalkinBillDrawer counterCode={counterCode} shiftOpen={shiftOpen} onClose={() => setWalkinOpen(false)} onSettled={refresh} />}
    </div>
  );
};
