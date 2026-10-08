import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleType, DepartmentWorkspace } from '../../types';
import { getDepartmentWorkspaceById } from './departmentWorkspaceStore';
import { DepartmentWorkspaceLayout } from './DepartmentWorkspaceLayout';
import { DepartmentDashboard } from './DepartmentDashboard';
import { DepartmentStaffManagement } from './DepartmentStaffManagement';
import { DepartmentDoctorManagement } from './DepartmentDoctorManagement';
import { DepartmentRoomsManagement } from './DepartmentRoomsManagement';
import { DepartmentScheduling } from './DepartmentScheduling';
import { DepartmentSettings } from './DepartmentSettings';
import { DepartmentReports } from './DepartmentReports';
import { DepartmentOpdOperations } from './DepartmentOpdOperations';
import { LabAdminWorkspace } from '../lab/admin/LabAdminWorkspace';
import { PharmacyAdminWorkspace } from '../pharmacy/admin/PharmacyAdminWorkspace';
import { BillingAdminWorkspace } from '../billing/admin/BillingAdminWorkspace';

export const DepartmentWorkspaceContainer: React.FC = () => {
  const { deptId } = useParams<{ deptId?: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  // If user is DEPARTMENT_ADMIN, their scope is strictly locked to their assigned department!
  const isDeptAdmin = role === RoleType.DEPARTMENT_ADMIN;

  // Department alias helpers
  const isLabDept = (id?: string) =>
    id === 'lab' || id === 'dept-lab' || id === 'ws-lab' || id === '9';
  const isPharmacyDept = (id?: string) =>
    id === 'pharmacy' || id === 'dept-pharmacy' || id === 'ws-pharmacy' || id === '8';
  const isBillingDept = (id?: string) =>
    id === 'billing' || id === 'dept-billing' || id === 'ws-billing';
  const isOpdDept = (id?: string) =>
    id === '1' || id === 'opd' || id === 'dept-opd' || id === 'ws-opd';
  const isCardioDept = (id?: string) =>
    id === 'dept-cardiology' || id === 'cardiology' || id === 'ws-dept-cardiology';

  // Determine user's assigned department based on explicit ID or credentials heuristics
  const isLabUser =
    isLabDept(user?.departmentId) ||
    (user as any)?.departmentCode === 'LAB' ||
    user?.username === 'labadmin' ||
    user?.email === 'lab.admin@northhospital.com' ||
    (user?.firstName?.includes('Marcus') && user?.lastName?.includes('Vance'));

  const isPharmacyUser =
    isPharmacyDept(user?.departmentId) ||
    (user as any)?.departmentCode === 'PHARMACY' ||
    user?.username === 'pharmadmin' ||
    user?.username === 'dr_pooja_shah' ||
    user?.email === 'dr.pooja.shah@northhospital.com' ||
    (user?.firstName?.includes('Pooja') && user?.lastName?.includes('Shah'));

  const isCardioUser =
    isCardioDept(user?.departmentId) ||
    (user as any)?.departmentCode === 'CARDIO' ||
    user?.email?.includes('cardio');

  const resolvedDeptId = isLabUser
    ? 'lab'
    : isPharmacyUser
    ? 'pharmacy'
    : isCardioUser
    ? 'dept-cardiology'
    : user?.departmentId || '1';

  const userAssignedDeptId = isDeptAdmin ? resolvedDeptId : (user?.departmentId || '1');

  // Determine effective department id
  const effectiveDeptId = isDeptAdmin
    ? userAssignedDeptId
    : deptId || '1';

  // Security & Scope Protection: If Department Admin tries to access a different dept URL, redirect immediately!
  useEffect(() => {
    if (!isDeptAdmin) return;

    if (isLabUser) {
      if (!isLabDept(deptId)) {
        navigate('/department/lab', { replace: true });
      }
    } else if (isPharmacyUser) {
      if (!isPharmacyDept(deptId)) {
        navigate('/department/pharmacy', { replace: true });
      }
    } else if (isCardioUser) {
      if (!isCardioDept(deptId)) {
        navigate('/department/dept-cardiology', { replace: true });
      }
    } else {
      if (deptId && !isOpdDept(deptId) && deptId !== userAssignedDeptId) {
        navigate(`/department/${userAssignedDeptId}`, { replace: true });
      }
    }
  }, [isDeptAdmin, isLabUser, isPharmacyUser, isCardioUser, deptId, userAssignedDeptId, navigate]);

  const [workspace, setWorkspace] = useState<DepartmentWorkspace>(() =>
    getDepartmentWorkspaceById(effectiveDeptId)
  );

  const [activeTab, setActiveTab] = useState<string>('dashboard');

  useEffect(() => {
    setWorkspace(getDepartmentWorkspaceById(effectiveDeptId));
  }, [effectiveDeptId]);

  const handleSwitchDepartment = (newDeptId: string) => {
    navigate(`/department/${newDeptId}`);
    setWorkspace(getDepartmentWorkspaceById(newDeptId));
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DepartmentDashboard workspace={workspace} onNavigateTab={setActiveTab} />;
      case 'staff':
        return <DepartmentStaffManagement workspace={workspace} />;
      case 'doctors':
        return <DepartmentDoctorManagement workspace={workspace} />;
      case 'rooms':
        return <DepartmentRoomsManagement workspace={workspace} />;
      case 'scheduling':
        return <DepartmentScheduling workspace={workspace} />;
      case 'reports':
        return <DepartmentReports workspace={workspace} />;
      case 'settings':
        return <DepartmentSettings workspace={workspace} onWorkspaceUpdated={setWorkspace} />;
      case 'operations':
        return <DepartmentOpdOperations workspace={workspace} />;
      default:
        return <DepartmentDashboard workspace={workspace} onNavigateTab={setActiveTab} />;
    }
  };

  const isLabWorkspace =
    isLabDept(deptId) ||
    isLabDept(effectiveDeptId) ||
    workspace?.departmentCode === 'DEPT-LAB' ||
    workspace?.id === 'ws-lab' ||
    isLabUser;

  if (isLabWorkspace) {
    return <LabAdminWorkspace />;
  }

  const isPharmacyWorkspace =
    isPharmacyDept(deptId) ||
    isPharmacyDept(effectiveDeptId) ||
    workspace?.departmentCode === 'DEPT-PHARMACY' ||
    workspace?.id === 'ws-pharmacy' ||
    isPharmacyUser;

  if (isPharmacyWorkspace) {
    return <PharmacyAdminWorkspace />;
  }

  const isBillingWorkspace =
    isBillingDept(deptId) ||
    isBillingDept(effectiveDeptId) ||
    workspace?.departmentCode === 'DEPT-BILLING' ||
    workspace?.id === 'ws-billing';

  if (isBillingWorkspace) {
    return <BillingAdminWorkspace />;
  }

  return (
    <DepartmentWorkspaceLayout
      workspace={workspace}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onSwitchDepartment={handleSwitchDepartment}
    >
      {renderActiveTabContent()}
    </DepartmentWorkspaceLayout>
  );
};

