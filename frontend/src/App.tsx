import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './config/currency';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

import { LoginPage } from './pages/auth/LoginPage';
import { LogoutPage } from './pages/auth/LogoutPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ReceptionDashboard } from './pages/reception/ReceptionDashboard';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { DoctorAssistantDashboard } from './pages/doctor/DoctorAssistantDashboard';
import { NurseDashboard } from './pages/nurse/NurseDashboard';
import { PharmacyDashboard } from './pages/pharmacy/PharmacyDashboard';
import { InventoryManagerWorkspace } from './pages/pharmacy/inventory/InventoryManagerWorkspace';
import { OPDPharmacistWorkspace } from './pages/pharmacy/opd/OPDPharmacistWorkspace';
import { IPDPharmacistWorkspace } from './pages/pharmacy/ipd/IPDPharmacistWorkspace';
import { ControlledDrugRegisterWorkspace } from './pages/pharmacy/controlled/ControlledDrugRegisterWorkspace';
import { PharmacyAdminWorkspace } from './pages/pharmacy/admin/PharmacyAdminWorkspace';
import { NewOTCSalePage } from './pages/pharmacy/opd/NewOTCSalePage';
import { LabDashboard } from './pages/lab/LabDashboard';
import { OtDashboard } from './pages/ot/OtDashboard';
import { IpdDashboard } from './pages/ipd/IpdDashboard';
import { BillingDepartmentContainer } from './pages/billing/BillingDepartmentContainer';
import { AccountsDepartmentContainer } from './pages/accounts/AccountsDepartmentContainer';
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { DepartmentWorkspaceContainer } from './pages/department/DepartmentWorkspaceContainer';
import { RoleType, BILLING_WORKSPACE_ROLES } from './types';

const queryClient = new QueryClient();

const RoleHomeRedirect: React.FC = () => {
  const { role, user, isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Dr. Pooja Shah or Pharmacy Admin credentials redirect directly to pharmacy department workspace
  if (
    user?.username === 'pharmadmin' ||
    user?.username === 'dr_pooja_shah' ||
    user?.email === 'dr.pooja.shah@northhospital.com' ||
    (user?.firstName?.includes('Pooja') && user?.lastName?.includes('Shah')) ||
    (user as any)?.designation?.includes('Chief Pharmacist') ||
    (user as any)?.badge === 'Pharmacy Admin'
  ) {
    return <Navigate to="/department/pharmacy" replace />;
  }

  // Sneha Nair or IPD Pharmacist credentials redirect directly to IPD workspace
  if (
    user?.username === 'sneha_nair' ||
    user?.email === 'sneha.nair@northhospital.com' ||
    (user as any)?.designation?.includes('IPD') ||
    (user as any)?.badge === 'IPD Pharmacist'
  ) {
    return <Navigate to="/pharmacy/ipd" replace />;
  }

  // For DEPARTMENT_ADMIN, route to their actual assigned department workspace
  if (role === RoleType.DEPARTMENT_ADMIN) {
    const isBilling =
      user?.departmentId === 'billing' ||
      user?.departmentId === 'dept-billing' ||
      (user as any)?.departmentCode === 'BILLING' ||
      user?.username?.includes('bill') ||
      user?.email?.includes('bill');

    const isAccounts =
      user?.departmentId === 'accounts' ||
      user?.departmentId === 'dept-accounts' ||
      (user as any)?.departmentCode === 'ACCOUNTS' ||
      user?.username?.includes('acc') ||
      user?.email?.includes('acc');

    if (isBilling) return <Navigate to="/billing/admin" replace />;
    if (isAccounts) return <Navigate to="/accounts" replace />;

    const isLab =
      user?.departmentId === 'lab' ||
      user?.departmentId === 'dept-lab' ||
      user?.departmentId === '9' ||
      (user as any)?.departmentCode === 'LAB' ||
      user?.username === 'labadmin' ||
      user?.email === 'lab.admin@northhospital.com' ||
      (user?.firstName?.includes('Marcus') && user?.lastName?.includes('Vance'));

    const isPharmacy =
      user?.departmentId === 'pharmacy' ||
      user?.departmentId === 'dept-pharmacy' ||
      user?.departmentId === '8' ||
      (user as any)?.departmentCode === 'PHARMACY' ||
      user?.username === 'pharmadmin' ||
      user?.username === 'dr_pooja_shah' ||
      user?.email === 'dr.pooja.shah@northhospital.com' ||
      (user?.firstName?.includes('Pooja') && user?.lastName?.includes('Shah'));

    const deptId = isLab ? 'lab' : isPharmacy ? 'pharmacy' : user?.departmentId || 'opd';
    return <Navigate to={`/department/${deptId}`} replace />;
  }

  const roleRoutes: Record<string, string> = {
    [RoleType.SUPER_ADMIN]: '/admin',
    [RoleType.HOSPITAL_ADMIN]: '/admin',
    [RoleType.RECEPTION_SUPERVISOR]: '/reception',
    [RoleType.RECEPTIONIST]: '/reception',
    [RoleType.DOCTOR]: '/doctor',
    [RoleType.DOCTOR_ASSISTANT]: '/assistant',
    [RoleType.MEDICAL_SUPERINTENDENT]: '/doctor',
    [RoleType.SURGEON]: '/ot',
    [RoleType.ANESTHETIST]: '/ot',
    [RoleType.OT_MANAGER]: '/ot',
    [RoleType.WARD_MANAGER]: '/ipd',
    [RoleType.NURSE]: '/nurse',
    [RoleType.PATHOLOGIST]: '/lab',
    [RoleType.LAB_TECH]: '/lab',
    [RoleType.PHARMACIST]: '/pharmacy',
    [RoleType.INVENTORY_MANAGER]: '/pharmacy/inventory',
    [RoleType.FINANCE_MANAGER]: '/accounts',
    [RoleType.INTERNAL_AUDITOR]: '/accounts/audit',
    [RoleType.CASHIER]: '/billing',
    [RoleType.BILLING_SUPERVISOR]: '/billing/supervisor',
    [RoleType.BILLING_MANAGER]: '/billing/supervisor',
    [RoleType.BILLING_ADMIN]: '/billing/admin',
    [RoleType.PATIENT]: '/patient',
  };

  return <Navigate to={roleRoutes[role] || '/admin'} replace />;
};

const PharmacyWorkspaceRouter: React.FC = () => {
  const { role, user } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const view = searchParams.get('view');

  if (view === 'admin' || user?.username === 'pharmadmin' || user?.email === 'dr.pooja.shah@northhospital.com') {
    return <PharmacyAdminWorkspace />;
  }
  if (view === 'cd' || view === 'controlled' || view === 'controlled-drugs') {
    return <ControlledDrugRegisterWorkspace />;
  }
  if (
    view === 'ipd' ||
    user?.username === 'sneha_nair' ||
    user?.email === 'sneha.nair@northhospital.com' ||
    (user as any)?.badge === 'IPD Pharmacist'
  ) {
    return <IPDPharmacistWorkspace />;
  }
  if (role === RoleType.INVENTORY_MANAGER || view === 'inventory') {
    return <InventoryManagerWorkspace />;
  }
  return <OPDPharmacistWorkspace />;
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CurrencyProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/logout" element={<LogoutPage />} />

            {/* Department Workspace: Independent Dedicated Engine */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[
                    RoleType.DEPARTMENT_ADMIN,
                    RoleType.HOSPITAL_ADMIN,
                    RoleType.SUPER_ADMIN,
                  ]}
                />
              }
            >
              <Route path="/department/:deptId/*" element={<DepartmentWorkspaceContainer />} />
              <Route path="/department/*" element={<DepartmentWorkspaceContainer />} />
            </Route>

            {/* Pharmacy Workspaces: Independent Dedicated Engine (OPD Counter & Central Store) */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[
                    RoleType.PHARMACIST,
                    RoleType.INVENTORY_MANAGER,
                    RoleType.DEPARTMENT_ADMIN,
                    RoleType.SUPER_ADMIN,
                    RoleType.HOSPITAL_ADMIN,
                  ]}
                />
              }
            >
              <Route path="/pharmacy" element={<PharmacyWorkspaceRouter />} />
              <Route path="/pharmacy/admin" element={<PharmacyAdminWorkspace />} />
              <Route path="/pharmacy/opd" element={<OPDPharmacistWorkspace />} />
              <Route path="/pharmacy/otc-sale/new" element={<NewOTCSalePage />} />
              <Route path="/pharmacy/ipd" element={<IPDPharmacistWorkspace />} />
              <Route path="/pharmacy/inventory" element={<InventoryManagerWorkspace />} />
              <Route path="/pharmacy/controlled-drugs" element={<ControlledDrugRegisterWorkspace />} />
              <Route path="/pharmacy/controlled" element={<ControlledDrugRegisterWorkspace />} />
            </Route>

            {/* Billing Department Workspace: Independent Dedicated Engine */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[
                    ...BILLING_WORKSPACE_ROLES,
                    RoleType.DEPARTMENT_ADMIN,
                    RoleType.SUPER_ADMIN,
                    RoleType.HOSPITAL_ADMIN,
                  ]}
                />
              }
            >
              <Route path="/billing/*" element={<BillingDepartmentContainer />} />
            </Route>

            {/* Accounts & Financial Governance: Independent Dedicated Engine */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[
                    RoleType.FINANCE_MANAGER,
                    RoleType.INTERNAL_AUDITOR,
                    RoleType.BILLING_ADMIN,
                    RoleType.DEPARTMENT_ADMIN,
                    RoleType.SUPER_ADMIN,
                    RoleType.HOSPITAL_ADMIN,
                  ]}
                />
              }
            >
              <Route path="/accounts/*" element={<AccountsDepartmentContainer />} />
            </Route>

            {/* Authenticated Role Workspaces Wrapped in Unified AppLayout */}
            <Route
              path="/*"
              element={
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<RoleHomeRedirect />} />
                    
                    {/* 1. Admin Workspace */}
                    <Route element={<ProtectedRoute allowedRoles={[RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]} />}>
                      <Route path="/admin" element={<AdminDashboard />} />
                    </Route>

                    {/* 2. Receptionist Workspace */}
                    <Route element={<ProtectedRoute allowedRoles={[RoleType.RECEPTIONIST, RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]} />}>
                      <Route path="/reception" element={<ReceptionDashboard />} />
                    </Route>

                    {/* 3. Doctor OPD Station */}
                    <Route element={<ProtectedRoute allowedRoles={[RoleType.DOCTOR, RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]} />}>
                      <Route path="/doctor" element={<DoctorDashboard />} />
                    </Route>

                    {/* 3b. Doctor Assistant Chamber Ante-Room Station */}
                    <Route element={<ProtectedRoute allowedRoles={[RoleType.DOCTOR_ASSISTANT, RoleType.DOCTOR, RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]} />}>
                      <Route path="/assistant" element={<DoctorAssistantDashboard />} />
                    </Route>

                    {/* 4. Nurse Triage Desk */}
                    <Route element={<ProtectedRoute allowedRoles={[RoleType.NURSE, RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]} />}>
                      <Route path="/nurse" element={<NurseDashboard />} />
                    </Route>


                    {/* 6. Lab Technician & Pathologist Workstation */}
                    <Route element={<ProtectedRoute allowedRoles={[RoleType.LAB_TECH, RoleType.PATHOLOGIST, RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]} />}>
                      <Route path="/lab" element={<LabDashboard />} />
                    </Route>

                    {/* 7. Operation Theatre (OT) Station */}
                    <Route element={<ProtectedRoute allowedRoles={[RoleType.SURGEON, RoleType.ANESTHETIST, RoleType.OT_MANAGER, RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]} />}>
                      <Route path="/ot" element={<OtDashboard />} />
                    </Route>

                    {/* 8. Inpatient Department (IPD) Care */}
                    <Route element={<ProtectedRoute allowedRoles={[RoleType.WARD_MANAGER, RoleType.NURSE, RoleType.DOCTOR, RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]} />}>
                      <Route path="/ipd" element={<IpdDashboard />} />
                    </Route>

                    {/* 10. Patient Companion Portal */}
                    <Route element={<ProtectedRoute allowedRoles={[RoleType.PATIENT, RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]} />}>
                      <Route path="/patient" element={<PatientDashboard />} />
                    </Route>

                    {/* Unauthorized Access Notice */}
                    <Route
                      path="/unauthorized"
                      element={
                        <div style={{ padding: '3rem', textAlign: 'center' }}>
                          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '0.5rem' }}>
                            Access Restricted
                          </h2>
                          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Your active role does not have permission to access this departmental workspace.
                          </p>
                          <RoleHomeRedirect />
                        </div>
                      }
                    />

                    {/* Catch-all fallback */}
                    <Route path="*" element={<RoleHomeRedirect />} />
                  </Routes>
                </AppLayout>
              }
            />
          </Routes>
        </BrowserRouter>
      </CurrencyProvider>
    </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
