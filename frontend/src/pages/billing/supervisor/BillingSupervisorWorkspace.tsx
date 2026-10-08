import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Stamp, Undo2, Scale, ShieldAlert, ChevronDown, Monitor, Tags } from 'lucide-react';
import { billingService, SupervisorDashboard } from '../../../services/billingService';
import { useAuth } from '../../../context/AuthContext';
import { CounterClosingScreen } from '../executive/CounterClosingScreen';
import { C, Callout, apiError, card } from '../executive/executiveUi';
import { SupervisorDashboardScreen } from './SupervisorDashboardScreen';
import { ApprovalsScreen } from './ApprovalsScreen';
import { RefundsScreen } from './RefundsScreen';
import { AuditStreamScreen } from './AuditStreamScreen';
import { ReportsScreen } from '../finance/ReportsScreen';

const POLL_MS = 15000;

/**
 * Phase 5 — Billing Supervisor workspace.
 * Spec: "Billing Supervisor Workspace" (Dashboard, Approvals, Refunds, Counter Closing, Audit Stream,
 * workspace switcher into counter mode). Credit & Outstanding and Shift Reports belong to later phases.
 */
export const BillingSupervisorWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [dash, setDash] = useState<SupervisorDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [entering, setEntering] = useState<string | null>(null);
  const switcherRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      setDash(await billingService.getSupervisorDashboard());
      setError(null);
    } catch (err) {
      setError(apiError(err, 'Supervisor data is unavailable.'));
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!switcherOpen) return;
    const close = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) setSwitcherOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [switcherOpen]);

  const enterCounter = async (shiftId: string) => {
    setEntering(shiftId);
    try {
      await billingService.enterCounterMode(shiftId);
      setSwitcherOpen(false);
      navigate('/billing');
    } catch (err) {
      setError(apiError(err, 'Could not enter counter mode.'));
    } finally {
      setEntering(null);
    }
  };

  const k = dash?.kpis;
  const openCounters = (dash?.counters || []).filter((c) => c.status === 'OPEN' && c.shift_id);


  return (
    <div style={{ background: C.bg, minHeight: '100%', color: C.text, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {openCounters.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 }}>
          {/* Workspace switcher: supervisor view or counter mode on any open counter */}
          <div ref={switcherRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setSwitcherOpen((o) => !o)}
              aria-expanded={switcherOpen}
              style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontSize: 13 }}
            >
              <span style={{ color: C.muted }}>Assist Open Counter</span>
              <span style={{ color: C.amber, fontWeight: 600 }}>({openCounters.length} Open)</span>
              <ChevronDown size={14} color={C.muted} />
            </button>
            {switcherOpen && (
              <div style={{ ...card, position: 'absolute', right: 0, top: 40, width: 320, zIndex: 30, boxShadow: '0 12px 32px rgba(17,24,39,0.14)', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', fontSize: 11, color: C.muted, letterSpacing: 0.4, borderBottom: `1px solid ${C.border}` }}>
                  SIGNED IN AS {([user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'SUPERVISOR').toUpperCase()} · {String(role).replace(/_/g, ' ')}
                </div>
                <div style={{ padding: '10px 14px', background: C.hover, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Supervisor Dashboard</span>
                  <span style={{ fontSize: 12, color: C.muted }}>Approvals, refunds, closing, audit</span>
                </div>
                {openCounters.length === 0 && <div style={{ padding: '10px 14px', fontSize: 13, color: C.muted }}>No counters are open to assist.</div>}
                {openCounters.map((c) => (
                  <button
                    key={c.counter_code}
                    disabled={!!entering}
                    onClick={() => enterCounter(c.shift_id!)}
                    style={{ width: '100%', textAlign: 'left', display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', border: 'none', borderTop: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer' }}
                  >
                    <Monitor size={16} color={C.muted} />
                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 14 }}>{c.counter_name}{c.counter_location ? ` · ${c.counter_location}` : ''}</span>
                      <span style={{ fontSize: 12, color: C.muted }}>{entering === c.shift_id ? 'Entering counter mode…' : `${c.cashier_name} · shift open`}</span>
                    </span>
                  </button>
                ))}
                <div style={{ padding: '8px 14px', fontSize: 11, color: C.muted, borderTop: `1px solid ${C.border}` }}>Every workspace switch is recorded in the audit stream.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Callout tone="red" title="Live data unavailable">{error}</Callout>
        </div>
      )}

      <Routes>
        <Route index element={<SupervisorDashboardScreen dash={dash} onRefresh={refresh} onEnterCounter={enterCounter} />} />
        <Route path="approvals" element={<ApprovalsScreen onChanged={refresh} />} />
        <Route path="refunds" element={<RefundsScreen onChanged={refresh} />} />
        <Route path="closing" element={<CounterClosingScreen />} />
        <Route path="audit" element={<AuditStreamScreen />} />
        <Route path="reports" element={<ReportsScreen shiftOnly />} />
        <Route path="*" element={<Navigate to="/billing/supervisor" replace />} />
      </Routes>
    </div>
  );
};
