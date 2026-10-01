import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Wrench,
  Receipt,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { DepartmentWorkspaceLayout } from '../../department/DepartmentWorkspaceLayout';
import { getDepartmentWorkspaceById } from '../../department/departmentWorkspaceStore';
import { LabDataStore } from '../data/labDataStore';
import { LabAdminOverviewView } from './LabAdminOverviewView';
import { LabAdminStaffView } from './LabAdminStaffView';
import { LabAdminSchedulingView } from './LabAdminSchedulingView';
import { LabAdminEquipmentView } from './LabAdminEquipmentView';
import { LabAdminPricingView } from './LabAdminPricingView';
import { LabAdminSettingsView } from './LabAdminSettingsView';
import { LabAdminReportsView } from './LabAdminReportsView';

export const LabAdminWorkspace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const workspace = getDepartmentWorkspaceById('ws-lab');
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(() => {
    return LabDataStore.getOrders().filter((o) => o.stage === 'ORDERED' || o.stage === 'COLLECTED').length;
  });

  useEffect(() => {
    const handleSync = () => {
      const orders = LabDataStore.getOrders();
      setPendingOrdersCount(orders.filter((o) => o.stage === 'ORDERED' || o.stage === 'COLLECTED').length);
    };
    window.addEventListener('nh_lab_sync', handleSync);
    window.addEventListener('nh_data_sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('nh_lab_sync', handleSync);
      window.removeEventListener('nh_data_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const labAdminNavItems = [
    {
      id: 'overview',
      label: 'Dashboard Overview',
      icon: <LayoutDashboard size={18} />,
      badge: pendingOrdersCount > 0 ? String(pendingOrdersCount) : undefined,
    },
    { id: 'staff', label: '1. Staff Pool & Roster', icon: <Users size={18} />, badge: '14' },
    { id: 'scheduling', label: '2. Duty Scheduling', icon: <Calendar size={18} />, badge: '2' },
    { id: 'equipment', label: '3. Equipment & Inventory', icon: <Wrench size={18} />, badge: '3' },
    { id: 'pricing', label: '4. Test Pricing', icon: <Receipt size={18} />, badge: '1' },
    { id: 'settings', label: '5. Department Settings', icon: <Settings size={18} /> },
    { id: 'reports', label: 'Reports & Analytics', icon: <TrendingUp size={18} /> },
  ];

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <LabAdminOverviewView onNavigateTab={(tab) => setSearchParams({ tab })} />;
      case 'staff':
        return <LabAdminStaffView onNavigateTab={(tab) => setSearchParams({ tab })} />;
      case 'scheduling':
        return <LabAdminSchedulingView onNavigateTab={(tab) => setSearchParams({ tab })} />;
      case 'equipment':
        return <LabAdminEquipmentView onNavigateTab={(tab) => setSearchParams({ tab })} />;
      case 'pricing':
        return <LabAdminPricingView onNavigateTab={(tab) => setSearchParams({ tab })} />;
      case 'settings':
        return <LabAdminSettingsView onNavigateTab={(tab) => setSearchParams({ tab })} />;
      case 'reports':
        return <LabAdminReportsView onNavigateTab={(tab) => setSearchParams({ tab })} />;
      default:
        return <LabAdminOverviewView onNavigateTab={(tab) => setSearchParams({ tab })} />;
    }
  };

  return (
    <DepartmentWorkspaceLayout
      workspace={workspace}
      activeTab={activeTab}
      onSelectTab={(tabId) => {
        if (tabId === 'overview') setSearchParams({});
        else setSearchParams({ tab: tabId });
      }}
      customNavItems={labAdminNavItems}
    >
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {renderActiveView()}
      </div>
    </DepartmentWorkspaceLayout>
  );
};

export default LabAdminWorkspace;
