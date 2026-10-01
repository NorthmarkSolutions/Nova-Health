import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleType } from '../../types';
import { FlaskConical, CheckCircle2, ShieldAlert } from 'lucide-react';
import { WorkspaceHeader } from '../../components/workspace/WorkspaceHeader';
import { LabDataStore, LabQueueOrder } from './data/labDataStore';
import { LabTechnicianQueueView } from './components/LabTechnicianQueueView';
import { LabTechnicianEquipmentView } from './components/LabTechnicianEquipmentView';
import { PathologistReviewQueueView } from './components/PathologistReviewQueueView';
import { PathologistSignedReportsView } from './components/PathologistSignedReportsView';
import { PathologistCatalogView } from './components/PathologistCatalogView';

export const LabDashboard: React.FC = () => {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine active role view mode
  const initialRoleMode = role === RoleType.PATHOLOGIST ? 'pathologist' : 'technician';
  const [roleMode, setRoleMode] = useState<'technician' | 'pathologist'>(initialRoleMode);

  // Tab parameter
  const tabParam = searchParams.get('tab');
  const currentTab = tabParam || (roleMode === 'pathologist' ? 'review' : 'queue');

  // Real-time reactive orders
  const [orders, setOrders] = useState<LabQueueOrder[]>(() => LabDataStore.getOrders());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOrderUpdated = () => {
    setOrders(LabDataStore.getOrders());
  };

  useEffect(() => {
    const handleSync = () => {
      setOrders(LabDataStore.getOrders());
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

  const isAdmin = role === RoleType.HOSPITAL_ADMIN || role === RoleType.SUPER_ADMIN;

  const headerTitle =
    roleMode === 'pathologist'
      ? 'Pathologist Review Station'
      : 'Laboratory Technician Workspace';

  const headerDescription =
    roleMode === 'pathologist'
      ? 'Clinical validation, critical flag review, and digital sign-off of diagnostic results.'
      : 'Sample intake, automated analyzer processing, and test parameter result entry.';

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: 'var(--bg-main)',
        minHeight: '100%',
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        flex: 1,
      }}
    >
      {/* Toast Notification matching NurseDashboard */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: 'var(--secondary)',
            color: '#ffffff',
            padding: '12px 18px',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 9999,
            fontSize: '14px',
            fontWeight: 500,
            borderLeft: '4px solid var(--success)',
          }}
        >
          <CheckCircle2 size={16} color="var(--success)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER: Standard WorkspaceHeader matching NurseHeader */}
      <WorkspaceHeader
        title={headerTitle}
        description={headerDescription}
        icon={<FlaskConical size={20} />}
        actions={
          <>
            {/* View Switcher for Administrators */}
            {isAdmin && (
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'var(--gray-100)',
                  borderRadius: '10px',
                  padding: '3px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setRoleMode('technician');
                    setSearchParams({ tab: 'queue' });
                  }}
                  style={{
                    border: 'none',
                    backgroundColor: roleMode === 'technician' ? '#ffffff' : 'transparent',
                    color: roleMode === 'technician' ? 'var(--secondary)' : 'var(--text-muted)',
                    fontWeight: roleMode === 'technician' ? 600 : 500,
                    fontSize: '13px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: roleMode === 'technician' ? '0 1px 2px rgba(0, 0, 0, 0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Technician View
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRoleMode('pathologist');
                    setSearchParams({ tab: 'review' });
                  }}
                  style={{
                    border: 'none',
                    backgroundColor: roleMode === 'pathologist' ? '#ffffff' : 'transparent',
                    color: roleMode === 'pathologist' ? 'var(--secondary)' : 'var(--text-muted)',
                    fontWeight: roleMode === 'pathologist' ? 600 : 500,
                    fontSize: '13px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: roleMode === 'pathologist' ? '0 1px 2px rgba(0, 0, 0, 0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Pathologist View
                </button>
              </div>
            )}
          </>
        }
      />

      {/* MAIN CONTENT AREA */}
      <main
        style={{
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {currentTab === 'queue' && (
          <LabTechnicianQueueView
            orders={orders}
            onOrderUpdated={handleOrderUpdated}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'equipment' && (
          <LabTechnicianEquipmentView onShowToast={showToast} />
        )}

        {currentTab === 'review' && (
          <PathologistReviewQueueView
            orders={orders}
            onOrderUpdated={handleOrderUpdated}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'signed-reports' && (
          <PathologistSignedReportsView onShowToast={showToast} />
        )}

        {currentTab === 'catalog' && (
          <PathologistCatalogView onShowToast={showToast} />
        )}
      </main>
    </div>
  );
};
