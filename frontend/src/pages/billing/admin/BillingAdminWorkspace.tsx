import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RevenueCommandScreen } from './RevenueCommandScreen';
import { RevenueIntegrityScreen } from './RevenueIntegrityScreen';
import { CountersDirectoryScreen } from './CountersDirectoryScreen';
import { StaffRosterScreen } from './StaffRosterScreen';
import { ApprovalMatrixScreen } from './ApprovalMatrixScreen';
import { PolicyRulesScreen } from './PolicyRulesScreen';
import { TariffMasterScreen } from './TariffMasterScreen';
import { PackagesScreen } from './PackagesScreen';
import { PricingScreen } from './PricingScreen';
import { InsuranceTpaScreen } from './InsuranceTpaScreen';
import { CorporateScreen } from './CorporateScreen';
import { RevenueAnalyticsScreen } from '../finance/RevenueAnalyticsScreen';
import { ReportsScreen } from '../finance/ReportsScreen';
import { TaxGstScreen } from '../finance/TaxGstScreen';
import { PeriodCloseScreen } from '../finance/PeriodCloseScreen';
import { AuditLogScreen } from '../finance/AuditLogScreen';

/**
 * Billing Admin Workspace.
 * Clean layout driven by the Left Navigation Sidebar, matching Pharmacy Department and HMS Design Bible.
 */
export const BillingAdminWorkspace: React.FC = () => {
  return (
    <div style={{ minHeight: '100%', color: '#111827', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <Routes>
        <Route index element={<RevenueCommandScreen />} />
        <Route path="integrity" element={<RevenueIntegrityScreen />} />
        <Route path="analytics" element={<RevenueAnalyticsScreen />} />
        <Route path="reports" element={<ReportsScreen />} />
        <Route path="tax" element={<TaxGstScreen />} />
        <Route path="close" element={<PeriodCloseScreen />} />
        <Route path="audit" element={<AuditLogScreen />} />
        <Route path="insurance" element={<InsuranceTpaScreen />} />
        <Route path="corporate" element={<CorporateScreen />} />
        <Route path="counters" element={<CountersDirectoryScreen />} />
        <Route path="staff" element={<StaffRosterScreen />} />
        <Route path="approval-matrix" element={<ApprovalMatrixScreen />} />
        <Route path="policies" element={<PolicyRulesScreen />} />
        <Route path="tariffs" element={<TariffMasterScreen />} />
        <Route path="packages" element={<PackagesScreen />} />
        <Route path="pricing" element={<PricingScreen />} />
        <Route path="*" element={<Navigate to="/billing/admin" replace />} />
      </Routes>
    </div>
  );
};
