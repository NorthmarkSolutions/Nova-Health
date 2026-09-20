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

export const DepartmentWorkspaceContainer: React.FC = () => {
  const { deptId } = useParams<{ deptId?: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  // If user is DEPARTMENT_ADMIN, their scope is strictly locked to their assigned department!
  const isDeptAdmin = role === RoleType.DEPARTMENT_ADMIN;
  const userAssignedDeptId = user?.departmentId || '1';

  // Determine effective department id
  const effectiveDeptId = isDeptAdmin
    ? userAssignedDeptId
    : deptId || '1';

  // Security & Scope Protection: If Department Admin tries to access a different dept URL, redirect immediately!
  useEffect(() => {
    if (isDeptAdmin && deptId && deptId !== userAssignedDeptId && deptId !== 'opd') {
      navigate(`/department/${userAssignedDeptId}`, { replace: true });
    }
  }, [isDeptAdmin, deptId, userAssignedDeptId, navigate]);

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
