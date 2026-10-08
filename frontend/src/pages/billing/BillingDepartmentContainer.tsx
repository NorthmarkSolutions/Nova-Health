import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleType } from '../../types';
import {
  LayoutDashboard,
  ListOrdered,
  BedDouble,
  Receipt,
  Store,
  ClipboardList,
  ShieldCheck,
  ShieldAlert,
  Stamp,
  Undo2,
  Scale,
  Activity,
  Tags,
  Package,
  Monitor,
  Users,
  Sliders,
  Calendar,
  LogOut,
  Building2,
  ArrowRight,
  Sparkles,
  Clock,
  CircleDot,
  BarChart3,
  FileSpreadsheet,
  FileText,
  Lock,
  ScrollText,
  Calculator,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Building,
  CheckCircle2
} from 'lucide-react';
import { BillingExecutiveWorkspace } from './executive/BillingExecutiveWorkspace';
import { BillingSupervisorWorkspace } from './supervisor/BillingSupervisorWorkspace';
import { BillingAdminWorkspace } from './admin/BillingAdminWorkspace';

export const BillingDepartmentContainer: React.FC = () => {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
    : 'Billing Staff';
  const initials = displayName
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'BS';

  const userDesignation =
    user?.designation ||
    (role === RoleType.BILLING_ADMIN
      ? 'Head of Billing & Revenue'
      : role === RoleType.BILLING_SUPERVISOR
      ? 'Billing Shift Supervisor'
      : role === RoleType.CASHIER
      ? 'Senior Cashier & Billing Executive'
      : 'Billing Department Staff');

  const isAdminRole =
    role === RoleType.BILLING_ADMIN ||
    role === RoleType.DEPARTMENT_ADMIN ||
    role === RoleType.HOSPITAL_ADMIN ||
    role === RoleType.SUPER_ADMIN;

  const isSupervisorRole =
    role === RoleType.BILLING_SUPERVISOR ||
    role === RoleType.BILLING_MANAGER ||
    isAdminRole;

  // Determine current active section for dynamic navigation groups
  const path = location.pathname;
  const isCurrentlyInAdmin = path.startsWith('/billing/admin');
  const isCurrentlyInSupervisor = path.startsWith('/billing/supervisor');
  const isCurrentlyInCashier = !isCurrentlyInAdmin && !isCurrentlyInSupervisor;

  // Active view title for breadcrumbs
  const crumbTitle = useMemo(() => {
    if (path.includes('/billing/admin/analytics')) return 'Revenue Analytics';
    if (path.includes('/billing/admin/integrity')) return 'Revenue Integrity';
    if (path.includes('/billing/admin/reports')) return 'Financial Reports';
    if (path.includes('/billing/admin/tax')) return 'Tax & GST';
    if (path.includes('/billing/admin/close')) return 'Period Close';
    if (path.includes('/billing/admin/audit')) return 'Audit Log';
    if (path.includes('/billing/admin/insurance')) return 'Insurance & TPA';
    if (path.includes('/billing/admin/corporate')) return 'Corporate Credit';
    if (path.includes('/billing/admin/counters')) return 'Counters Directory';
    if (path.includes('/billing/admin/staff')) return 'Staff & Shifts';
    if (path.includes('/billing/admin/approval-matrix')) return 'Approval Matrix';
    if (path.includes('/billing/admin/policies')) return 'Policy Rules';
    if (path.includes('/billing/admin/tariffs')) return 'Tariff Master';
    if (path.includes('/billing/admin/packages')) return 'Packages';
    if (path.includes('/billing/admin/pricing')) return 'Pricing Sandbox';
    if (path === '/billing/admin' || path === '/billing/admin/') return 'Revenue Command';

    if (path.includes('/billing/supervisor/approvals')) return 'Approvals Queue';
    if (path.includes('/billing/supervisor/refunds')) return 'Refund Authorizations';
    if (path.includes('/billing/supervisor/closing')) return 'Counter Closing';
    if (path.includes('/billing/supervisor/audit')) return 'Audit Stream';
    if (path.includes('/billing/supervisor/reports')) return 'Shift Reports';
    if (path === '/billing/supervisor' || path === '/billing/supervisor/') return 'Supervisor Board';

    if (path.includes('/billing/queue')) return 'Invoice Queue';
    if (path.includes('/billing/ipd')) return 'IPD Running Bills';
    if (path.includes('/billing/receipts')) return 'Receipts & Invoices';
    if (path.includes('/billing/shift')) return 'Counter Shift';
    if (path.includes('/billing/requests')) return 'My Requests';
    return 'Cashier Dashboard';
  }, [path]);

  // Current view department badge text
  const departmentBadge = isCurrentlyInAdmin ? 'ADMIN' : isCurrentlyInSupervisor ? 'SUPERVISOR' : 'CASHIER';

  // Navigation Groups tailored cleanly matching Pharmacy
  const navGroups = useMemo(() => {
    if (isCurrentlyInAdmin) {
      return [
        {
          label: 'OVERVIEW',
          items: [
            { to: '/billing/admin', end: true, label: 'Revenue Command', icon: Activity, count: '' },
            { to: '/billing/admin/analytics', label: 'Revenue Analytics', icon: BarChart3, count: '' }
          ]
        },
        {
          label: 'OPERATIONS',
          items: [
            { to: '/billing/admin/counters', label: 'Counters & Cash', icon: Monitor, count: '2 open' },
            { to: '/billing/admin/staff', label: 'Staff & Roster', icon: Users, count: '4 active' },
            { to: '/billing', label: 'Frontline Cashier Desk', icon: LayoutDashboard, count: '' },
            { to: '/billing/supervisor', label: 'Supervisor Oversight', icon: ShieldCheck, count: '' }
          ]
        },
        {
          label: 'PRICING & TARIFFS',
          items: [
            { to: '/billing/admin/tariffs', label: 'Tariff Master', icon: Tags, count: '' },
            { to: '/billing/admin/packages', label: 'Health Packages', icon: Package, count: '' },
            { to: '/billing/admin/pricing', label: 'Pricing Sandbox', icon: Calculator, count: '' }
          ]
        },
        {
          label: 'GOVERNANCE & AUDIT',
          items: [
            { to: '/billing/admin/integrity', label: 'Revenue Integrity', icon: ShieldAlert, count: 'Action', isRed: true },
            { to: '/billing/admin/approval-matrix', label: 'Approval Matrix', icon: ShieldCheck, count: '' },
            { to: '/billing/admin/policies', label: 'Policy Rules', icon: Sliders, count: '' },
            { to: '/billing/admin/audit', label: 'Audit Trail Logs', icon: ScrollText, count: '' },
            { to: '/billing/admin/reports', label: 'Financial Reports', icon: FileSpreadsheet, count: '' }
          ]
        },
        {
          label: 'INSURANCE & CORPORATE',
          items: [
            { to: '/billing/admin/insurance', label: 'Insurance & TPA', icon: FileText, count: '' },
            { to: '/billing/admin/corporate', label: 'Corporate Credit', icon: Building2, count: '' },
            { to: '/billing/admin/tax', label: 'Tax & GST (GSTR-1)', icon: Receipt, count: '' },
            { to: '/billing/admin/close', label: 'Period Close', icon: Lock, count: '' }
          ]
        }
      ];
    }

    if (isCurrentlyInSupervisor) {
      return [
        {
          label: 'SUPERVISOR DESK',
          items: [
            { to: '/billing/supervisor', end: true, label: 'Supervisor Board', icon: LayoutDashboard, count: '' },
            { to: '/billing/supervisor/approvals', label: 'Approvals Queue', icon: Stamp, count: '1 pending', isRed: true },
            { to: '/billing/supervisor/refunds', label: 'Refund Authorizations', icon: Undo2, count: '' },
            { to: '/billing/supervisor/closing', label: 'Counter Closing', icon: Scale, count: '' },
            { to: '/billing/supervisor/audit', label: 'Audit Stream', icon: ShieldAlert, count: '' },
            { to: '/billing/supervisor/reports', label: 'Shift Reports', icon: FileText, count: '' }
          ]
        },
        {
          label: 'OTHER WORKSPACES',
          items: [
            { to: '/billing', label: 'Cashier POS Counter', icon: Store, count: 'Live' },
            ...(isAdminRole
              ? [{ to: '/billing/admin', label: 'Revenue Command & Admin', icon: Activity, count: '' }]
              : [])
          ]
        }
      ];
    }

    // Cashier Frontline Desk
    return [
      {
        label: 'CASHIER DESK',
        items: [
          { to: '/billing', end: true, label: 'Dashboard', icon: LayoutDashboard, count: '' },
          { to: '/billing/queue', label: 'Invoice Queue', icon: ListOrdered, count: '4 live', isRed: false },
          { to: '/billing/ipd', label: 'IPD Running Bills', icon: BedDouble, count: 'TPA' },
          { to: '/billing/receipts', label: 'Receipts & Invoices', icon: Receipt, count: '' },
          { to: '/billing/shift', label: 'Counter Shift & Drawer', icon: Store, count: 'Open' },
          { to: '/billing/requests', label: 'My Requests', icon: ClipboardList, count: '1' }
        ]
      },
      ...(isSupervisorRole
        ? [
            {
              label: 'MANAGEMENT',
              items: [
                { to: '/billing/supervisor', label: 'Supervisor Oversight', icon: ShieldCheck, count: '' },
                ...(isAdminRole
                  ? [{ to: '/billing/admin', label: 'Billing Admin Command', icon: Activity, count: '' }]
                  : [])
              ]
            }
          ]
        : [])
    ];
  }, [isCurrentlyInAdmin, isCurrentlyInSupervisor, isAdminRole, isSupervisorRole]);

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
      {/* ========================================================= */}
      {/* 1. LEFT NAVIGATION SIDEBAR (260px) - Matches Pharmacy     */}
      {/* ========================================================= */}
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
              {departmentBadge}
            </span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '4px' }}>
            Patient Billing & Cashier
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
            Main Lobby OPD · Counter 01 & 02
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

      {/* ========================================================= */}
      {/* 2. MAIN WORKSPACE BODY - Matches Pharmacy                 */}
      {/* ========================================================= */}
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
        {/* Sticky Top Breadcrumbs Bar */}
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
            <span>Billing · {departmentBadge === 'ADMIN' ? 'Admin' : departmentBadge === 'SUPERVISOR' ? 'Supervisor' : 'Cashier'}</span>
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
              Live POS
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Active Counter Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '32px',
                padding: '0 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#374151',
                whiteSpace: 'nowrap',
              }}
            >
              <Store size={14} color="#6b7280" />
              <span>Counter 1 · Shift Open · Float ₹5,000</span>
            </div>

            {/* Date & Time Clock */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '32px',
                padding: '0 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#374151',
                whiteSpace: 'nowrap',
              }}
            >
              <Calendar size={14} color="#6b7280" />
              <span>
                Today · {currentTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ·{' '}
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable View Content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px' }}>
          <Routes>
            <Route path="admin/*" element={<BillingAdminWorkspace />} />
            <Route path="supervisor/*" element={<BillingSupervisorWorkspace />} />
            <Route path="*" element={<BillingExecutiveWorkspace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};
