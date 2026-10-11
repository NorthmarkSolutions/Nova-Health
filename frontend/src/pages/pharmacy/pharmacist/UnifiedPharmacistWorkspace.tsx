import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { RoleType } from '../../../types';
import {
  Pill,
  BedDouble,
  Receipt,
  CheckCircle2,
  RotateCcw,
  Search,
  Layers,
  Siren,
  Lock,
  LogOut,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Building2,
  Coins,
  Clock,
  Plus,
  PhoneCall,
  User as UserIcon,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { pharmacyOpdService, OPDKPIs } from '../../../services/pharmacyOpdService';
import pharmacyIpdService, { IPDKPIMetrics } from '../../../services/pharmacyIpdService';
import { OPDPharmacistWorkspace } from './OPDPharmacistWorkspace';
import { IPDPharmacistWorkspace } from './IPDPharmacistWorkspace';
import { ControlledDrugRegisterWorkspace } from '../controlled/ControlledDrugRegisterWorkspace';
import { MyProfileModal } from '../inventory/modals/MyProfileModal';
import { ChangePasswordModal } from '../inventory/modals/ChangePasswordModal';

// Reusable Pharmacy Sidebar Tokens (HMS Design Bible aligned)
const SIDEBAR_TOKENS = {
  activeBg: '#eff6ff',
  activeBorder: '#bfdbfe',
  activeColor: '#1d4ed8',
  activeIconColor: '#2563eb',
  activeShadow: '0 1px 3px rgba(37, 99, 235, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
};

interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  subTab: string;
  badge?: string;
  isEmergency?: boolean;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'OPD COUNTER DISPENSING',
    icon: Pill,
    items: [
      { key: 'opd-queue', label: 'Prescription Queue', icon: Pill, subTab: 'queue' },
      { key: 'opd-otc', label: 'OTC Direct Sales', icon: Receipt, subTab: 'otc' },
      { key: 'opd-done', label: 'Completed Today', icon: CheckCircle2, subTab: 'done' },
      { key: 'opd-returns', label: 'Returns & Refunds', icon: RotateCcw, subTab: 'returns' },
      { key: 'opd-stock', label: 'Counter Stock Lookup', icon: Search, subTab: 'stock' },
    ],
  },
  {
    label: 'IPD WARD MEDICATION SUPPLY',
    icon: BedDouble,
    items: [
      { key: 'ipd-requests', label: 'Ward Indent Requests', icon: BedDouble, subTab: 'requests' },
      { key: 'ipd-pending', label: 'Pending Allocation / Issues', icon: Layers, subTab: 'pending' },
      { key: 'ipd-issued', label: 'Issued to Wards Today', icon: CheckCircle2, subTab: 'issued' },
      { key: 'ipd-emergency', label: 'Emergency / STAT Requests', icon: Siren, subTab: 'emergency', isEmergency: true },
      { key: 'ipd-returns', label: 'Ward Returns', icon: RotateCcw, subTab: 'returns' },
    ],
  },
  {
    label: 'COMPLIANCE & DRUGS',
    icon: Lock,
    items: [
      { key: 'controlled-drugs', label: 'Controlled Drugs Vault & Register', icon: Lock, subTab: 'cd', badge: 'Sch. X' },
    ],
  },
];

export interface UnifiedPharmacistWorkspaceProps {
  defaultModule?: string;
}

export const UnifiedPharmacistWorkspace: React.FC<UnifiedPharmacistWorkspaceProps> = ({
  defaultModule = 'opd-queue',
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();

  // Active module tab
  const rawTab = searchParams.get('tab') || defaultModule;
  const [activeModule, setActiveModule] = useState<string>(rawTab);

  // Synchronize when search params change
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeModule) {
      setActiveModule(tabParam);
    }
  }, [searchParams]);

  const selectModule = (moduleKey: string) => {
    setActiveModule(moduleKey);
    setSearchParams({ tab: moduleKey });
  };

  // Collapsed groups state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (groupLabel: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

  // Staff identity
  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
    : 'Clinical Pharmacist';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PH';
  const designation =
    user?.designation ||
    (role === RoleType.PHARMACIST
      ? 'Clinical Pharmacist · Dispensing & Ward Supply'
      : (role ? role.replace(/_/g, ' ') : 'Clinical Pharmacist'));
  const badgeId = user?.employeeId || (user?.username === 'sneha_nair' ? 'PH-4380' : 'EMP-PHARM-02');

  // Profile Dropdown & Modal States
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMyProfileOpen, setIsMyProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click or Esc
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileOpen]);

  // Real-time KPIs
  const [opdKpis, setOpdKpis] = useState<OPDKPIs | null>(null);
  const [ipdKpis, setIpdKpis] = useState<IPDKPIMetrics | null>(null);

  // Poll metrics
  useEffect(() => {
    let isMounted = true;
    const fetchKPIs = async () => {
      try {
        const [opdRes, ipdRes] = await Promise.all([
          pharmacyOpdService.getOPDKPIs().catch(() => null),
          pharmacyIpdService.getIPDKPIs().catch(() => null),
        ]);
        if (isMounted) {
          if (opdRes) setOpdKpis(opdRes);
          if (ipdRes) setIpdKpis(ipdRes);
        }
      } catch {
        // Fallback default metrics retained safely
      }
    };

    fetchKPIs();
    const interval = setInterval(fetchKPIs, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Computed live metrics for the 4 Master KPI Cards (Option C)
  const opdStatCount = opdKpis?.stat_count ?? 1;
  const ipdEmergencyCount = ipdKpis?.emergency_requests ?? 0;
  const totalStatCount = opdStatCount + ipdEmergencyCount;

  const opdQueueCount = opdKpis?.pending_verification ?? 6;
  const ipdInprogressCount = (ipdKpis?.open_requests ?? 1) + (ipdKpis?.pending_issues ?? 3);
  const totalFulfilledToday = 6 + (ipdKpis?.issued_today ?? 6);

  // Determine current active subTab for the respective workspace
  const currentSubTab = useMemo(() => {
    for (const grp of NAV_GROUPS) {
      const match = grp.items.find((i) => i.key === activeModule);
      if (match) return match.subTab;
    }
    return 'queue';
  }, [activeModule]);

  // Click handler for 🚨 STAT & Emergency Orders Card
  const [opdQueueFilter, setOpdQueueFilter] = useState<string>('all');
  const [callNextCounter, setCallNextCounter] = useState<number>(0);
  const [stockSearchQuery, setStockSearchQuery] = useState<string>('');

  const handleStatCardClick = () => {
    if (ipdEmergencyCount > 0) {
      selectModule('ipd-emergency');
    } else {
      setOpdQueueFilter('stat');
      selectModule('opd-queue');
    }
  };

  const handleOpdQueueCardClick = () => {
    setOpdQueueFilter('all');
    selectModule('opd-queue');
  };

  // Dedicated Call Next Order handler that directly triggers the active counter/ward order
  const handleGlobalCallNext = () => {
    if (activeModule.startsWith('ipd-')) {
      // In IPD context, keep IPD and trigger call next
      setCallNextCounter((c) => c + 1);
    } else if (ipdEmergencyCount > 0 && !activeModule.startsWith('opd-')) {
      selectModule('ipd-emergency');
      setCallNextCounter((c) => c + 1);
    } else {
      // In OPD context, ensure opd-queue is active and trigger call next
      if (activeModule !== 'opd-queue') {
        selectModule('opd-queue');
      }
      setCallNextCounter((c) => c + 1);
    }
  };

  // Dedicated Stock Search opener: opens stock tab and auto-focuses the search bar
  const handleOpenStockSearch = (initialQuery: string = '') => {
    setStockSearchQuery(initialQuery);
    selectModule('opd-stock');
    setTimeout(() => {
      const input = document.getElementById('pharmacy-stock-search-input') as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  };

  // Dedicated New OTC Sale opener: opens opd-otc tab and immediately opens NewOTCSalePage wizard
  const [createOtcTrigger, setCreateOtcTrigger] = useState<boolean>(false);
  const handleOpenNewOtcSale = () => {
    setCreateOtcTrigger(true);
    selectModule('opd-otc');
  };

  // Keyboard Shortcuts: Alt+N (Call Next), Alt+S (Search Stock), Alt+O (New OTC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is actively typing in an input, textarea or contenteditable, don't trigger navigation shortcuts unless with Alt/Ctrl
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // Alt+N or (F2) -> Call Next Order
      if ((e.altKey && (e.key === 'n' || e.key === 'N')) || e.key === 'F2') {
        e.preventDefault();
        handleGlobalCallNext();
      }
      // Alt+S -> Search Stock & Focus Input
      else if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleOpenStockSearch();
      }
      // Alt+O -> New OTC Sale (Opens 5-step wizard directly)
      else if (e.altKey && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        handleOpenNewOtcSale();
      }
      // Alt+1 -> OPD Queue
      else if (e.altKey && e.key === '1') {
        e.preventDefault();
        selectModule('opd-queue');
      }
      // Alt+2 -> IPD Requests
      else if (e.altKey && e.key === '2') {
        e.preventDefault();
        selectModule('ipd-requests');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModule, ipdEmergencyCount]);

  const isOpdModule = activeModule.startsWith('opd-');
  const isIpdModule = activeModule.startsWith('ipd-');
  const isCdModule = activeModule === 'controlled-drugs';

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#f9fafb',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* ============================================================ */}
      {/* UNIFIED NESTED SIDEBAR (260px, Matching Inventory Manager)  */}
      {/* ============================================================ */}
      <aside
        style={{
          width: '260px',
          flexShrink: 0,
          background: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 18px', borderBottom: '1px solid #f1f5f9' }}>
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
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>
              North Hospital
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Clinical Enterprise HMS</div>
          </div>
        </div>

        {/* Operating Station & Role Card */}
        <div
          style={{
            margin: '12px 14px 8px',
            padding: '10px 12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Working Station
              </span>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#2563eb',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '4px',
                  padding: '1px 5px',
                }}
              >
                CENTRAL STORE
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
              <Building2 size={13} style={{ color: '#2563eb', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                Pharmacy & Ward Supply
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
              Main OPD Counter 2 & IPD Satellite
            </div>
          </div>

          <div style={{ paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Operating Role
              </span>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#16a34a',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '4px',
                  padding: '1px 5px',
                }}
              >
                ACTIVE
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                Clinical Pharmacist
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
              ID: {badgeId} · Dispensing & Ward
            </div>
          </div>
        </div>

        {/* Grouped / Nested Navigation */}
        <nav
          style={{
            flex: 1,
            padding: '4px 10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
          }}
        >
          {NAV_GROUPS.map((group, gIdx) => {
            const isCollapsed = !!collapsedGroups[group.label];
            const hasActiveItem = group.items.some((i) => i.key === activeModule);

            return (
              <div key={group.label} style={{ marginTop: gIdx > 0 ? '6px' : '2px' }}>
                {/* Group Header */}
                <div
                  onClick={() => toggleGroup(group.label)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 8px 4px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderRadius: '6px',
                    borderTop: gIdx > 0 ? '1px solid #f1f5f9' : 'none',
                    paddingTop: gIdx > 0 ? '10px' : '6px',
                  }}
                  title={`Click to ${isCollapsed ? 'expand' : 'collapse'} ${group.label}`}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: hasActiveItem ? '#1d4ed8' : '#64748b',
                    }}
                  >
                    {group.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: hasActiveItem ? '#2563eb' : '#94a3b8',
                        background: hasActiveItem ? '#eff6ff' : '#f8fafc',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        border: hasActiveItem ? '1px solid #bfdbfe' : '1px solid #f1f5f9',
                      }}
                    >
                      {group.items.length}
                    </span>
                    {isCollapsed ? <ChevronRight size={13} color="#94a3b8" /> : <ChevronDown size={13} color="#94a3b8" />}
                  </div>
                </div>

                {/* Group Sub-Items */}
                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                    {group.items.map((item) => {
                      const isActive = activeModule === item.key;
                      const IconComponent = item.icon;

                      // Live Count resolution
                      let countDisplay: number | string | null = null;
                      let isHot = false;

                      if (item.key === 'opd-queue') {
                        countDisplay = opdQueueCount;
                        if (opdStatCount > 0) isHot = true;
                      } else if (item.key === 'opd-otc') {
                        countDisplay = opdKpis?.otc_sales_today ?? 0;
                      } else if (item.key === 'opd-done') {
                        countDisplay = 6;
                      } else if (item.key === 'opd-returns') {
                        countDisplay = opdKpis?.pending_returns ?? 3;
                      } else if (item.key === 'ipd-requests') {
                        countDisplay = ipdKpis?.open_requests ?? 1;
                      } else if (item.key === 'ipd-pending') {
                        countDisplay = ipdKpis?.pending_issues ?? 3;
                      } else if (item.key === 'ipd-issued') {
                        countDisplay = ipdKpis?.issued_today ?? 6;
                      } else if (item.key === 'ipd-emergency') {
                        countDisplay = ipdEmergencyCount;
                        if (ipdEmergencyCount > 0) isHot = true;
                      } else if (item.key === 'ipd-returns') {
                        countDisplay = ipdKpis?.ward_returns_count ?? 3;
                      } else if (item.badge) {
                        countDisplay = item.badge;
                      }

                      return (
                        <div
                          key={item.key}
                          onClick={() => selectModule(item.key)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            height: '36px',
                            padding: '0 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? SIDEBAR_TOKENS.activeColor : '#334155',
                            background: isActive ? SIDEBAR_TOKENS.activeBg : 'transparent',
                            border: `1px solid ${isActive ? SIDEBAR_TOKENS.activeBorder : 'transparent'}`,
                            boxShadow: isActive ? SIDEBAR_TOKENS.activeShadow : 'none',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          <IconComponent
                            size={16}
                            style={{
                              color: item.isEmergency
                                ? '#dc2626'
                                : isActive
                                ? SIDEBAR_TOKENS.activeIconColor
                                : '#64748b',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.label}
                          </span>

                          {countDisplay !== null && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '10px',
                                background: item.isEmergency && ipdEmergencyCount > 0
                                  ? '#fef2f2'
                                  : isHot
                                  ? '#fffbeb'
                                  : isActive
                                  ? '#dbeafe'
                                  : '#f1f5f9',
                                color: item.isEmergency && ipdEmergencyCount > 0
                                  ? '#dc2626'
                                  : isHot
                                  ? '#b45309'
                                  : isActive
                                  ? '#1e40af'
                                  : '#64748b',
                                border: item.isEmergency && ipdEmergencyCount > 0 ? '1px solid #fecaca' : 'none',
                              }}
                            >
                              {countDisplay}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Card / Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 16px',
            borderTop: '1px solid #e5e7eb',
            background: '#ffffff',
            flexShrink: 0,
          }}
        >
          <div
            onClick={() => setIsMyProfileOpen(true)}
            title="View My Profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flex: 1,
              minWidth: 0,
              cursor: 'pointer',
              borderRadius: '8px',
              padding: '2px 4px',
              margin: '-2px -4px',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#eff6ff',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                flexShrink: 0,
                border: '1.5px solid #bfdbfe',
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {designation}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              if (logout) logout();
              navigate('/login');
            }}
            title="Log Out"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fef2f2';
              e.currentTarget.style.color = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MAIN CONTENT AREA                                            */}
      {/* ============================================================ */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflowY: 'auto',
          background: '#f9fafb',
        }}
      >
        {/* Sticky Top Bar (52px, HMS Design Bible Spec) */}
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
          {/* Breadcrumb Path */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
            <span>North Hospital</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span>Pharmacy</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ color: '#64748b' }}>
              {isOpdModule ? 'OPD Dispense Desk' : isIpdModule ? 'IPD Ward Supply' : 'Compliance'}
            </span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ color: '#111827', fontWeight: 600 }}>
              {NAV_GROUPS.flatMap((g) => g.items).find((i) => i.key === activeModule)?.label || 'Active Station'}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: '8px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#16a34a',
                background: '#f0fdf4',
                borderRadius: '4px',
                padding: '2px 6px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
              Live
            </span>
          </div>

          {/* Quick Context & Shift Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Shift & Cash Drawer Widgets */}
            {isOpdModule && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '32px',
                  padding: '0 10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0f172a',
                  background: '#f8fafc',
                }}
              >
                <Coins size={14} color="#059669" />
                <span>Drawer: ₹2,000.00</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '32px',
                padding: '0 10px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#374151',
                whiteSpace: 'nowrap',
              }}
            >
              <Clock size={14} color="#6b7280" />
              Morning shift · 07:00–15:00
            </div>

            <div style={{ width: '1px', height: '20px', background: '#e5e7eb', margin: '0 2px' }} />

            {/* Profile Dropdown Trigger (Standard HMS Design) */}
            <div style={{ position: 'relative' }} ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                aria-expanded={isProfileOpen}
                title="Account Profile & Settings"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '34px',
                  padding: '0 10px 0 6px',
                  background: isProfileOpen ? '#f1f5f9' : '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isProfileOpen ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isProfileOpen) e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (!isProfileOpen) e.currentTarget.style.background = isProfileOpen ? '#f1f5f9' : '#ffffff';
                }}
              >
                {/* Initials Avatar */}
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>

                {/* Name & Role */}
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.15 }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#0f172a',
                      maxWidth: '125px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {displayName}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#64748b',
                      maxWidth: '125px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {designation}
                  </span>
                </div>

                <ChevronDown
                  size={14}
                  style={{
                    color: '#64748b',
                    marginLeft: '2px',
                    transform: isProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>

              {/* Profile Dropdown Popover */}
              {isProfileOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    width: '285px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 100,
                    overflow: 'hidden',
                  }}
                >
                  {/* Top Header Card */}
                  <div style={{ padding: '16px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '2px solid #bfdbfe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {displayName}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#64748b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '1px',
                          }}
                        >
                          {user?.email || 's.nair@northhospital.org'}
                        </div>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '6px',
                            fontSize: '10px',
                            fontWeight: 600,
                            color: '#16a34a',
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '4px',
                            padding: '1px 7px',
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a' }}></span>
                          {designation}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div style={{ padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsMyProfileOpen(true);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#334155',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <UserIcon size={16} style={{ color: '#64748b' }} />
                      <span>My Profile (Quick Card)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/profile');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#2563eb',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <ExternalLink size={16} style={{ color: '#2563eb' }} />
                      <span style={{ fontWeight: 600 }}>Dedicated Profile Page</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsChangePasswordOpen(true);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#334155',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <KeyRound size={16} style={{ color: '#64748b' }} />
                      <span>Change Password</span>
                    </button>
                  </div>

                  {/* Sign Out Option */}
                  <div style={{ borderTop: '1px solid #e2e8f0', padding: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        if (logout) logout();
                        navigate('/login');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#dc2626',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <LogOut size={16} style={{ color: '#dc2626' }} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Master Body Container */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* ============================================================ */}
          {/* HEADER BANNER CARD                                           */}
          {/* ============================================================ */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '22px 26px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', letterSpacing: '-0.01em', margin: 0 }}>
                Clinical Pharmacist Workspace
              </h1>
              <p style={{ fontSize: '13px', color: '#4b5563', marginTop: '4px', marginBottom: 0 }}>
                Unified outpatient dispensing counter & inpatient ward supply hub. Process prescriptions, OTC sales, and ward indents against admission MARs.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleOpenStockSearch()}
                title="Search stock directory (Alt+S)"
                style={{
                  height: '42px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap',
                  background: activeModule === 'opd-stock' ? '#eff6ff' : '#ffffff',
                  color: activeModule === 'opd-stock' ? '#1d4ed8' : '#334155',
                  border: `1.5px solid ${activeModule === 'opd-stock' ? '#2563eb' : '#d1d5db'}`,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <Search size={16} />
                <span>Search stock</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#64748b',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    padding: '2px 5px',
                    marginLeft: '2px',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Alt+S
                </span>
              </button>

              <button
                onClick={handleOpenNewOtcSale}
                title="New OTC Direct Sale (Alt+O)"
                style={{
                  height: '42px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap',
                  background: activeModule === 'opd-otc' ? '#eff6ff' : '#ffffff',
                  color: '#2563eb',
                  border: `1.5px solid ${activeModule === 'opd-otc' ? '#2563eb' : '#bfdbfe'}`,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(37,99,235,0.06)',
                }}
              >
                <Plus size={16} />
                <span>New OTC sale</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#2563eb',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '4px',
                    padding: '2px 5px',
                    marginLeft: '2px',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Alt+O
                </span>
              </button>

              <button
                onClick={handleGlobalCallNext}
                title="Call next order in queue (Alt+N or F2)"
                style={{
                  height: '42px',
                  padding: '0 20px',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.3), 0 1px 2px rgba(37,99,235,0.2)',
                  transition: 'all 0.15s ease',
                }}
              >
                <PhoneCall size={17} />
                <span>Call next order</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#ffffff',
                    background: 'rgba(255,255,255,0.22)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    marginLeft: '4px',
                  }}
                >
                  Alt+N
                </span>
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* THE 4 MASTER KPI CARDS (Option C: Strictly 4 Cards)           */}
          {/* ============================================================ */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '16px',
            }}
          >
            {/* KPI 1: 🚨 STAT & Emergency Orders */}
            <div
              onClick={handleStatCardClick}
              style={{
                background: '#ffffff',
                border: totalStatCount > 0 ? '1.5px solid #fecaca' : '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '18px 20px',
                cursor: 'pointer',
                minHeight: '115px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
                boxShadow: totalStatCount > 0 ? '0 2px 4px rgba(220, 38, 38, 0.05)' : 'none',
              }}
              title="Click to jump directly to Emergency STAT queue"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: totalStatCount > 0 ? '#b91c1c' : '#4b5563' }}>
                  🚨 Urgent / STAT Orders
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    background: totalStatCount > 0 ? '#fef2f2' : '#f0fdf4',
                    color: totalStatCount > 0 ? '#dc2626' : '#16a34a',
                    border: totalStatCount > 0 ? '1px solid #fecaca' : '1px solid #bbf7d0',
                  }}
                >
                  {totalStatCount > 0 ? 'IMMEDIATE ACTION' : 'CLEAR'}
                </span>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: totalStatCount > 0 ? '#dc2626' : '#111827' }}>
                    {totalStatCount}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>active urgent</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  {opdStatCount} OPD STAT · {ipdEmergencyCount} Ward STAT
                </div>
              </div>
            </div>

            {/* KPI 2: 💊 OPD Counter Queue */}
            <div
              onClick={handleOpdQueueCardClick}
              style={{
                background: '#ffffff',
                border: activeModule === 'opd-queue' ? '1.5px solid #bfdbfe' : '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '18px 20px',
                cursor: 'pointer',
                minHeight: '115px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
              title="Click to view OPD Prescription Queue"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>
                  💊 OPD Counter Queue
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  COUNTER 2
                </span>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>
                    {opdQueueCount}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>prescriptions</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  {opdKpis?.pending_verification ?? 6} to verify · walk-in & appointments
                </div>
              </div>
            </div>

            {/* KPI 3: 🛏️ IPD Ward Indents */}
            <div
              onClick={() => selectModule('ipd-requests')}
              style={{
                background: '#ffffff',
                border: isIpdModule ? '1.5px solid #bfdbfe' : '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '18px 20px',
                cursor: 'pointer',
                minHeight: '115px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
              title="Click to view Inpatient Ward Requests"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>
                  🛏️ IPD Ward Indents
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    background: '#fffbeb',
                    color: '#b45309',
                    border: '1px solid #fde68a',
                  }}
                >
                  {ipdKpis?.wards_count ?? 4} WARDS
                </span>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>
                    {ipdInprogressCount}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>in progress</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  {ipdKpis?.open_requests ?? 1} new review · {ipdKpis?.pending_issues ?? 3} allocating
                </div>
              </div>
            </div>

            {/* KPI 4: ✅ Dispensed Today */}
            <div
              onClick={() => selectModule('opd-done')}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '18px 20px',
                cursor: 'pointer',
                minHeight: '115px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
              title="Click to view Fulfilled Orders"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>
                  ✅ Dispensed Today
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    background: '#f0fdf4',
                    color: '#16a34a',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  HOSPITAL TOTAL
                </span>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>
                    {totalFulfilledToday}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>fulfilled</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  6 Outpatient · {ipdKpis?.issued_today ?? 6} Ward handovers
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* OPERATIONAL WORKSPACE VIEWS CONTAINER                         */}
          {/* ============================================================ */}
          <div style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
            {/* 1. OPD MODULES */}
            {isOpdModule && (
              <OPDPharmacistWorkspace
                isEmbedded={true}
                hideSidebar={true}
                hideHeader={true}
                activeSubTab={currentSubTab as any}
                initialQueuePill={opdQueueFilter}
                triggerCallNext={callNextCounter}
                initialStockSearch={stockSearchQuery}
                initialCreateOtc={createOtcTrigger}
                onSubTabChange={(tab) => {
                  if (tab !== 'otc') setCreateOtcTrigger(false);
                  selectModule(`opd-${tab}`);
                }}
              />
            )}

            {/* 2. IPD MODULES */}
            {isIpdModule && (
              <IPDPharmacistWorkspace
                isEmbedded={true}
                hideSidebar={true}
                hideHeader={true}
                activeSubTab={currentSubTab as any}
                triggerCallNext={callNextCounter}
                onSubTabChange={(tab) => selectModule(`ipd-${tab}`)}
              />
            )}

            {/* 3. CONTROLLED DRUGS MODULE */}
            {isCdModule && (
              <ControlledDrugRegisterWorkspace
                isEmbedded={true}
                hideSidebar={true}
                hideHeader={true}
              />
            )}
          </div>
        </div>
      </main>

      {/* Staff Profile Details Modal */}
      <MyProfileModal
        isOpen={isMyProfileOpen}
        onClose={() => setIsMyProfileOpen(false)}
        user={user}
        role={(role || RoleType.PHARMACIST) as RoleType}
        displayName={displayName}
        designation={designation}
        initials={initials}
        onChangePasswordClick={() => setIsChangePasswordOpen(true)}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};

export default UnifiedPharmacistWorkspace;
