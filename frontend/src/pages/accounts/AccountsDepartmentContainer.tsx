import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart3,
  ShieldAlert,
  FileSpreadsheet,
  Receipt,
  Lock,
  ScrollText,
  Building2,
  FileText,
  Tags,
  Calendar,
  LogOut,
  Clock,
  Store,
  ArrowRight
} from 'lucide-react';
import { RevenueAnalyticsScreen } from '../billing/finance/RevenueAnalyticsScreen';
import { RevenueIntegrityScreen } from '../billing/admin/RevenueIntegrityScreen';
import { TaxGstScreen } from '../billing/finance/TaxGstScreen';
import { PeriodCloseScreen } from '../billing/finance/PeriodCloseScreen';
import { AuditLogScreen } from '../billing/finance/AuditLogScreen';
import { ReportsScreen } from '../billing/finance/ReportsScreen';
import { CorporateScreen } from '../billing/admin/CorporateScreen';
import { InsuranceTpaScreen } from '../billing/admin/InsuranceTpaScreen';
import { TariffMasterScreen } from '../billing/admin/TariffMasterScreen';

export const AccountsDepartmentContainer: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
    : 'Accounts Staff';
  const initials = displayName
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AC';

  const userDesignation =
    user?.designation || 'Chief Accounts Officer & Financial Controller';

  const path = location.pathname;

  const crumbTitle = useMemo(() => {
    if (path.includes('/accounts/integrity')) return 'Revenue Integrity';
    if (path.includes('/accounts/tax')) return 'Tax & GST (GSTR-1)';
    if (path.includes('/accounts/close')) return 'Fiscal Period Close';
    if (path.includes('/accounts/audit')) return 'Audit Trail Logs';
    if (path.includes('/accounts/reports')) return 'Financial Reports';
    if (path.includes('/accounts/corporate')) return 'Corporate Credit';
    if (path.includes('/accounts/insurance')) return 'Insurance & TPA Claims';
    if (path.includes('/accounts/tariffs')) return 'Tariff Master Review';
    return 'Revenue Analytics';
  }, [path]);

  const navGroups = [
    {
      label: 'FINANCIAL COMMAND',
      items: [
        { to: '/accounts', end: true, label: 'Revenue Analytics', icon: BarChart3, count: '' },
        { to: '/accounts/integrity', label: 'Revenue Integrity', icon: ShieldAlert, count: 'Action', isRed: true }
      ]
    },
    {
      label: 'TAX & FISCAL COMPLIANCE',
      items: [
        { to: '/accounts/tax', label: 'Tax & GST (GSTR-1)', icon: Receipt, count: '' },
        { to: '/accounts/close', label: 'Fiscal Period Close', icon: Lock, count: '' }
      ]
    },
    {
      label: 'AUDIT & REPORTING',
      items: [
        { to: '/accounts/audit', label: 'Audit Trail Logs', icon: ScrollText, count: '' },
        { to: '/accounts/reports', label: 'Financial Reports', icon: FileSpreadsheet, count: '' }
      ]
    },
    {
      label: 'CREDIT & CLAIMS',
      items: [
        { to: '/accounts/corporate', label: 'Corporate Accounts', icon: Building2, count: '' },
        { to: '/accounts/insurance', label: 'Insurance & TPA', icon: FileText, count: '' },
        { to: '/accounts/tariffs', label: 'Hospital Tariff Master', icon: Tags, count: '' }
      ]
    },
    {
      label: 'CROSS-DEPARTMENT',
      items: [
        { to: '/billing', label: 'Patient Billing & POS', icon: Store, count: 'Live' }
      ]
    }
  ];

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#f9fafb',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* 1. Left Navigation Sidebar - Matches Pharmacy */}
      <aside
        style={{
          width: '260px',
          flexShrink: 0,
          background: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 20,
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 20px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '15px',
            }}
          >
            N
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
              North Hospital
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              Clinical Enterprise HMS
            </div>
          </div>
        </div>

        {/* Current Department Badge */}
        <div style={{ margin: '0 16px', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Current department</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#2563eb',
                background: '#eff6ff',
                borderRadius: '4px',
                padding: '1px 6px',
              }}
            >
              FINANCE
            </span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '4px' }}>
            Accounts & Governance
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
            Corporate Tower · Floor 2 (Finance Suite)
          </div>
        </div>

        {/* Navigation Items */}
        <nav
          style={{
            flex: 1,
            padding: '8px 12px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            overflowY: 'auto',
          }}
        >
          {navGroups.map((group, gIdx) => (
            <div key={gIdx}>
              <div
                style={{
                  padding: '16px 8px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                }}
              >
                {group.label}
              </div>
              {group.items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#2563eb' : '#374151',
                      background: isActive ? '#eff6ff' : 'transparent',
                      transition: 'all 0.15s ease',
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        <IconComponent size={18} color={isActive ? '#2563eb' : '#6b7280'} />
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.label}
                        </span>
                        {item.count && (
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: item.isRed ? '#dc2626' : '#6b7280',
                            }}
                          >
                            {item.count}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '16px 20px',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#f3f4f6',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
              {displayName}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#6b7280',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {userDesignation}
            </div>
          </div>
          <button
            onClick={() => (logout ? logout() : navigate('/login'))}
            style={{
              fontSize: '12px',
              color: '#374151',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      {/* 2. Main Workspace Body */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#f9fafb',
        }}
      >
        {/* Sticky Top Breadcrumbs */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            height: '52px',
            padding: '0 24px',
            borderBottom: '1px solid #e5e7eb',
            background: '#ffffff',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
            <span>North Hospital</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span>Accounts · Finance</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ color: '#111827', fontWeight: 600 }}>{crumbTitle}</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#374151',
                background: '#f3f4f6',
                borderRadius: '4px',
                padding: '2px 6px',
              }}
            >
              Audit Active
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#047857',
                background: '#ecfdf5',
                borderRadius: '4px',
                padding: '2px 8px',
                border: '1px solid #a7f3d0',
              }}
            >
              OPD · Lab · Pharmacy GL Synced
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', color: '#374151', whiteSpace: 'nowrap' }}>
            <Calendar size={14} color="#6b7280" />
            <span>
              Today · {currentTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ·{' '}
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Scrollable View Content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px' }}>
          <Routes>
            <Route index element={<RevenueAnalyticsScreen />} />
            <Route path="integrity" element={<RevenueIntegrityScreen />} />
            <Route path="tax" element={<TaxGstScreen />} />
            <Route path="close" element={<PeriodCloseScreen />} />
            <Route path="audit" element={<AuditLogScreen />} />
            <Route path="reports" element={<ReportsScreen />} />
            <Route path="corporate" element={<CorporateScreen />} />
            <Route path="insurance" element={<InsuranceTpaScreen />} />
            <Route path="tariffs" element={<TariffMasterScreen />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};
