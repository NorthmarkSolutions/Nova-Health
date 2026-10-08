import React from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { BarChart3, FileSpreadsheet, Receipt, Lock, ScrollText } from 'lucide-react';
import { C } from '../executive/executiveUi';
import { RevenueAnalyticsScreen } from './RevenueAnalyticsScreen';
import { ReportsScreen } from './ReportsScreen';
import { TaxGstScreen } from './TaxGstScreen';
import { PeriodCloseScreen } from './PeriodCloseScreen';
import { AuditLogScreen } from './AuditLogScreen';

/**
 * Phase 11 — Finance & Audit workspace for the CFO (Finance Manager) and Internal Auditor:
 * Revenue Analytics (A-02), Reports (A-20), Tax & GST (A-17), Period Close (A-13), Audit Log (A-21).
 * The same screens also appear inside the Billing Admin workspace.
 */
export const BillingFinanceWorkspace: React.FC = () => {
  const tabs = [
    { to: '/billing/finance', end: true, label: 'Revenue Analytics', icon: <BarChart3 size={16} /> },
    { to: '/billing/finance/reports', label: 'Reports', icon: <FileSpreadsheet size={16} /> },
    { to: '/billing/finance/tax', label: 'Tax & GST', icon: <Receipt size={16} /> },
    { to: '/billing/finance/close', label: 'Period Close', icon: <Lock size={16} /> },
    { to: '/billing/finance/audit', label: 'Audit Log', icon: <ScrollText size={16} /> }
  ];
  return (
    <div style={{ background: C.bg, minHeight: '100%', color: C.text, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <nav style={{ display: 'flex', gap: 4, overflowX: 'auto', borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap',
              textDecoration: 'none', color: isActive ? C.primary : C.textSub, borderBottom: `2px solid ${isActive ? C.primary : 'transparent'}`, marginBottom: -1
            })}
          >
            {t.icon}
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<RevenueAnalyticsScreen />} />
        <Route path="reports" element={<ReportsScreen />} />
        <Route path="tax" element={<TaxGstScreen />} />
        <Route path="close" element={<PeriodCloseScreen />} />
        <Route path="audit" element={<AuditLogScreen />} />
        <Route path="*" element={<Navigate to="/billing/finance" replace />} />
      </Routes>
    </div>
  );
};
