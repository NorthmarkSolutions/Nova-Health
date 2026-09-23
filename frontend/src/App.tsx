import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import { LabDashboard } from './pages/lab/LabDashboard';
import { OtDashboard } from './pages/ot/OtDashboard';
import { IpdDashboard } from './pages/ipd/IpdDashboard';
import { BillingDashboard } from './pages/billing/BillingDashboard';
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { DepartmentWorkspaceContainer } from './pages/department/DepartmentWorkspaceContainer';
import { RoleType } from './types';

const queryClient = new QueryClient();

const RoleHomeRedirect: React.FC = () => {
  const { role, isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const roleRoutes: Record<string, string> = {
    [RoleType.SUPER_ADMIN]: '/admin',
    [RoleType.HOSPITAL_ADMIN]: '/admin',
    [RoleType.DEPARTMENT_ADMIN]: '/department/opd',
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
    [RoleType.FINANCE_MANAGER]: '/billing',
    [RoleType.CASHIER]: '/billing',
    [RoleType.PATIENT]: '/patient',
  };

  return <Navigate to={roleRoutes[role] || '/admin'} replace />;
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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

                    {/* 5. Pharmacist Dispense Counter */}
                    <Route element={<ProtectedRoute allowedRoles={[RoleType.PHARMACIST, RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]} />}>
                      <Route path="/pharmacy" element={<PharmacyDashboard />} />
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

                    {/* 9. Cashier / Billing Desk */}
                    <Route element={<ProtectedRoute allowedRoles={[RoleType.CASHIER, RoleType.FINANCE_MANAGER, RoleType.SUPER_ADMIN, RoleType.HOSPITAL_ADMIN]} />}>
                      <Route path="/billing" element={<BillingDashboard />} />
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
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
