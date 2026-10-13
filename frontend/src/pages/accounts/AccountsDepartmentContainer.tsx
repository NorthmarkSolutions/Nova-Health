// Accounts & Finance — picks the signed-in role's workspace and hosts the shared masters dialog
// (Chart of accounts, DoFA matrix, Audit hash chain) opened at /accounts/coa | /dofa | /audit.
import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AccountsExecutiveWorkspace } from './executive/AccountsExecutiveWorkspace';
import { AccountsSupervisorWorkspace } from './supervisor/AccountsSupervisorWorkspace';
import { AccountsManagerWorkspace } from './manager/AccountsManagerWorkspace';
import { FinanceControllerWorkspace } from './controller/FinanceControllerWorkspace';
import { CFOExecutiveWorkspace } from './cfo/CFOExecutiveWorkspace';
import { AuditorWorkspace } from './auditor/AuditorWorkspace';
import { AccountsMastersModal, MasterKey } from './AccountsMasters';
import { RoleType } from '../../types';
import type { RoleViewKey } from './components/AccountsStickyAppBar';

const resolveRoleFromUser = (role?: string): RoleViewKey => {
  if (!role) return 'executive';
  if (role === RoleType.ACCOUNTS_SUPERVISOR) return 'supervisor';
  if (role === RoleType.ACCOUNTS_MANAGER) return 'manager';
  if (role === RoleType.FINANCE_CONTROLLER) return 'controller';
  if (role === RoleType.CFO) return 'cfo';
  if (role === RoleType.AUDITOR || role === RoleType.INTERNAL_AUDITOR) return 'auditor';
  return 'executive';
};

const roleTypeMap: Record<RoleViewKey, RoleType> = {
  executive: RoleType.ACCOUNTS_EXECUTIVE,
  supervisor: RoleType.ACCOUNTS_SUPERVISOR,
  manager: RoleType.ACCOUNTS_MANAGER,
  controller: RoleType.FINANCE_CONTROLLER,
  cfo: RoleType.CFO,
  auditor: RoleType.AUDITOR,
};

const WORKSPACES: Record<RoleViewKey, React.FC<{ activeRoleView?: RoleViewKey; onSelectRole?: (r: RoleViewKey) => void; onOpenMaster?: (m: MasterKey) => void }>> = {
  executive: AccountsExecutiveWorkspace,
  supervisor: AccountsSupervisorWorkspace,
  manager: AccountsManagerWorkspace,
  controller: FinanceControllerWorkspace,
  cfo: CFOExecutiveWorkspace,
  auditor: AuditorWorkspace,
};

export const AccountsDepartmentContainer: React.FC = () => {
  const { user, switchRolePreview } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // The workspace follows the signed-in role; a role preview switch overrides it until the role changes
  const [preview, setPreview] = useState<{ forRole?: string; view: RoleViewKey } | null>(null);
  const activeRoleView: RoleViewKey = preview && preview.forRole === user?.role ? preview.view : resolveRoleFromUser(user?.role);

  const activeMaster = useMemo<MasterKey | null>(() => {
    const path = location.pathname;
    if (path.endsWith('/coa')) return 'coa';
    if (path.endsWith('/dofa')) return 'dofa';
    if (path.endsWith('/audit')) return 'audit';
    return null;
  }, [location.pathname]);

  const handleSelectRole = (r: RoleViewKey) => {
    setPreview({ forRole: user?.role, view: r });
    if (switchRolePreview && roleTypeMap[r]) switchRolePreview(roleTypeMap[r]);
  };

  // Keep ?tab= so the workspace reopens on the section the master was opened from
  const openMaster = (m: MasterKey) => navigate({ pathname: `/accounts/${m}`, search: location.search });
  const closeMaster = () => navigate({ pathname: '/accounts', search: location.search });

  const Workspace = WORKSPACES[activeRoleView];

  return (
    <>
      <Workspace activeRoleView={activeRoleView} onSelectRole={handleSelectRole} onOpenMaster={openMaster} />
      {activeMaster && <AccountsMastersModal master={activeMaster} onClose={closeMaster} />}
    </>
  );
};

export default AccountsDepartmentContainer;
