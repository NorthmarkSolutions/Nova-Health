import React from 'react';
import { useLocation } from 'react-router-dom';
import { BillingAdminDeskWorkspace } from './admin/BillingAdminDeskWorkspace';
import { SupervisorDeskWorkspace } from './supervisor/SupervisorDeskWorkspace';
import { IpdTpaWorkspace } from './ipd/IpdTpaWorkspace';
import { CashierDeskWorkspace } from './cashier/CashierDeskWorkspace';

/**
 * Billing department: four role workspaces, each on the shared HMS shell (design bible §19) with its own sidebar,
 * top bar and shortcuts. The URL picks the desk; route guards decide who may open it.
 */
export const BillingDepartmentContainer: React.FC = () => {
  const path = useLocation().pathname;
  if (path.startsWith('/billing/admin')) return <BillingAdminDeskWorkspace />;
  if (path.startsWith('/billing/supervisor')) return <SupervisorDeskWorkspace />;
  if (path.startsWith('/billing/ipd')) return <IpdTpaWorkspace />;
  return <CashierDeskWorkspace />;
};
