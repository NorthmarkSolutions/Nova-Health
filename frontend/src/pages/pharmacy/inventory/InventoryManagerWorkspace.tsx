import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { RoleType } from '../../../types';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  CalendarClock,
  SlidersHorizontal,
  ClipboardList,
  Hourglass,
  PackageCheck,
  Truck,
  ArrowLeftRight,
  Lock,
  Clock,
  Check,
  TriangleAlert,
  PackageX,
  CircleCheck,
  CircleX,
  Info,
  FileText,
  Search,
  RefreshCw,
  ArrowLeft,
  Pill,
  BedDouble,
  LogOut,
  Plus,
  ChevronDown,
  ChevronRight,
  Edit3,
  Archive,
  TrendingUp,
  Zap,
  ClipboardCheck,
  AlertOctagon,
  Flame,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  BarChart3,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import {
  pharmacyInventoryService,
  InventoryKPIs,
  InventoryAlertItem,
  MedicineItem,
  BatchItem,
  PurchaseRequestItem,
  GoodsReceiptItem,
  SupplierItem,
  StockAdjustmentItem,
  TransferRequestItem,
  ControlledDrugItem,
  DemandItem,
  DeadStockItem,
  ForecastingItem,
  ReconciliationItem
} from '../../../services/pharmacyInventoryService';

import { AddEditMedicineModal } from './modals/AddEditMedicineModal';
import { CreateBatchModal } from './modals/CreateBatchModal';
import { CreateTransferModal } from './modals/CreateTransferModal';
import { StockReconciliationModal } from './modals/StockReconciliationModal';
import { ExpiryActionModal } from './modals/ExpiryActionModal';

// Badge Styles matching HMS Design Bible
const B = {
  gray: { bg: '#f9fafb', fg: '#374151', bd: '#e5e7eb' },
  blue: { bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' },
  amber: { bg: '#fffbeb', fg: '#b45309', bd: '#fde68a' },
  red: { bg: '#fef2f2', fg: '#dc2626', bd: '#fecaca' },
  green: { bg: '#f0fdf4', fg: '#15803d', bd: '#bbf7d0' },
  sky: { bg: '#f0f9ff', fg: '#0369a1', bd: '#bae6fd' },
  purple: { bg: '#faf5ff', fg: '#7e22ce', bd: '#e9d5ff' },
  dark: { bg: '#111827', fg: '#ffffff', bd: '#111827' },
};

const formatINR = (n: number) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
const formatDateMonth = (dStr: string) => {
  if (!dStr) return '';
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return dStr;
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

// Reusable Pharmacy Sidebar Design Tokens
const SIDEBAR_TOKENS = {
  activeBg: '#eff6ff',
  activeBorder: '#bfdbfe',
  activeColor: '#1d4ed8',
  activeIconColor: '#2563eb',
  activeShadow: '0 1px 3px rgba(37, 99, 235, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
  badgePillActiveBg: '#dbeafe',
  badgePillActiveColor: '#1e40af',
  badgePillHotBg: '#fef2f2',
  badgePillHotColor: '#dc2626',
  badgePillWarnBg: '#fffbeb',
  badgePillWarnColor: '#b45309',
  badgePillMutedBg: '#f1f5f9',
  badgePillMutedColor: '#64748b',
};

// 11 Operational Modules Grouped Nav
const NAV_GROUPS = [
  {
    label: 'STOCK & CATALOG',
    items: [
      { key: 'dash', label: 'Inventory Dashboard', icon: LayoutDashboard },
      { key: 'master', label: 'Medicine Master', icon: Pill },
      { key: 'ledger', label: 'Stock Ledger', icon: BookOpen },
      { key: 'batch', label: 'Batch Management', icon: Layers },
      { key: 'expiry', label: 'Expiry Monitoring', icon: CalendarClock },
      { key: 'dead', label: 'Dead Stock (>180d)', icon: PackageX },
      { key: 'adj', label: 'Stock Adjustments', icon: SlidersHorizontal },
      { key: 'recon', label: 'Physical Reconciliation', icon: ClipboardCheck },
    ],
  },
  {
    label: 'PROCUREMENT & PLANNING',
    items: [
      { key: 'fc', label: 'Demand Forecasting', icon: TrendingUp },
      { key: 'pr', label: 'Purchase Requests', icon: ClipboardList },
      { key: 'appr', label: 'Pending Approvals', icon: Hourglass },
      { key: 'grn', label: 'Purchase Receipts', icon: PackageCheck },
      { key: 'supp', label: 'Suppliers Directory', icon: Truck },
    ],
  },
  {
    label: 'MOVEMENT & COMPLIANCE',
    items: [
      { key: 'demand', label: 'Department Demand Hub', icon: Zap },
      { key: 'tr', label: 'Transfer Requests', icon: ArrowLeftRight },
      { key: 'cd', label: 'Controlled Drug Register', icon: Lock },
    ],
  },
];

export const InventoryManagerWorkspace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const isHospitalAdmin = role === RoleType.HOSPITAL_ADMIN || role === RoleType.SUPER_ADMIN;
  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Rajesh Kumar';
  const initials = displayName.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'RK';
  const designation = user?.designation || (role === RoleType.INVENTORY_MANAGER ? 'Inventory Manager · IM-2207' : (role ? role.replace(/_/g, ' ') : 'Inventory Manager · IM-2207'));

  // Tab & Filter States mapped to URL
  const activeTab = searchParams.get('view') || 'dash';
  const activePill = searchParams.get('pill') || 'all';
  const query = searchParams.get('q') || '';
  const selectedId = searchParams.get('sel') || '';

  // Collapsible Nav Groups State
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = useCallback((groupLabel: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  }, []);

  // Ensure active tab's group is auto-expanded
  useEffect(() => {
    const parentGroup = NAV_GROUPS.find((g) => g.items.some((i) => i.key === activeTab));
    if (parentGroup && collapsedGroups[parentGroup.label]) {
      setCollapsedGroups((prev) => ({
        ...prev,
        [parentGroup.label]: false,
      }));
    }
  }, [activeTab]);

  // Core Data States
  const [kpis, setKpis] = useState<InventoryKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<InventoryAlertItem[]>([]);
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<BatchItem[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequestItem[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceiptItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustmentItem[]>([]);
  const [transfers, setTransfers] = useState<TransferRequestItem[]>([]);
  const [controlledDrugs, setControlledDrugs] = useState<ControlledDrugItem[]>([]);

  // Operational Data States
  const [demands, setDemands] = useState<DemandItem[]>([]);
  const [deadStock, setDeadStock] = useState<DeadStockItem[]>([]);
  const [forecasting, setForecasting] = useState<ForecastingItem[]>([]);
  const [reconciliations, setReconciliations] = useState<ReconciliationItem[]>([]);

  // Modal Dialog States
  const [isAddEditMedOpen, setIsAddEditMedOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineItem | null>(null);

  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false);
  const [batchMedTarget, setBatchMedTarget] = useState<MedicineItem | null>(null);

  const [isCreateTransferOpen, setIsCreateTransferOpen] = useState(false);
  const [demandTransferTarget, setDemandTransferTarget] = useState<DemandItem | null>(null);

  const [isReconOpen, setIsReconOpen] = useState(false);
  const [reconMedTarget, setReconMedTarget] = useState<MedicineItem | null>(null);

  const [isExpiryActionOpen, setIsExpiryActionOpen] = useState(false);
  const [expiryBatchTarget, setExpiryBatchTarget] = useState<BatchItem | null>(null);

  // Action Drawer Sub-states
  const [drawerMode, setDrawerMode] = useState<'pr' | 'tr' | 'adj'>('pr');
  const [formQty, setFormQty] = useState('');
  const [formSup, setFormSup] = useState('');
  const [formDest, setFormDest] = useState('OPD Counter 1');
  const [formReason, setFormReason] = useState('Physical count');
  const [formNote, setFormNote] = useState('');
  const [qcChecks, setQcChecks] = useState<Record<string, boolean>>({});
  const [countInput, setCountInput] = useState('');
  const [countResult, setCountResult] = useState<{ matches: boolean; message: string } | null>(null);
  const [statusNotice, setStatusNotice] = useState<{
    type: 'green' | 'blue' | 'amber' | 'red';
    title: string;
    sub: string;
  } | null>(null);

  // Sync state helpers
  const updateURL = useCallback(
    (view: string, sel: string = '', pill: string = 'all', q: string = '') => {
      const params = new URLSearchParams();
      params.set('view', view);
      if (sel) params.set('sel', sel);
      if (pill) params.set('pill', pill);
      if (q) params.set('q', q);
      setSearchParams(params);
      setStatusNotice(null);
      setCountResult(null);
    },
    [setSearchParams],
  );

  // Load KPIs and Core Data
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        kpiData,
        alertsData,
        medsData,
        prsData,
        grnsData,
        suppData,
        adjsData,
        trsData,
        cdsData,
        batchData,
        demandsData,
        deadData,
        fcData,
        reconData
      ] = await Promise.all([
        pharmacyInventoryService.getKPIs(3),
        pharmacyInventoryService.getDashboardAlerts(activePill, query),
        pharmacyInventoryService.getMedicines(activePill, query),
        pharmacyInventoryService.getPurchaseRequests(activePill, query),
        pharmacyInventoryService.getGoodsReceipts(activePill, query),
        pharmacyInventoryService.getSuppliers(activePill, query),
        pharmacyInventoryService.getStockAdjustments(activePill, query),
        pharmacyInventoryService.getTransfers(activePill, query),
        pharmacyInventoryService.getControlledDrugs(activePill, query),
        pharmacyInventoryService.getBatches(activePill, query),
        pharmacyInventoryService.getDemandQueue(),
        pharmacyInventoryService.getDeadStock(),
        pharmacyInventoryService.getForecastingAnalytics(),
        pharmacyInventoryService.getReconciliations()
      ]);

      setKpis(kpiData);
      setAlerts(alertsData);
      setMedicines(medsData);
      setPurchaseRequests(prsData);
      setGoodsReceipts(grnsData);
      setSuppliers(suppData);
      setAdjustments(adjsData);
      setTransfers(trsData);
      setControlledDrugs(cdsData);
      setBatches(batchData);
      setDemands(demandsData);
      setDeadStock(deadData);
      setForecasting(fcData);
      setReconciliations(reconData);

      if (activeTab === 'expiry') {
        const expData = await pharmacyInventoryService.getExpiringBatches(6, activePill, query);
        setExpiringBatches(expData);
      }
    } catch (err) {
      console.error('Error fetching inventory data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, activePill, query]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Bulk Reorder Action
  const handleBulkReorder = async () => {
    try {
      const res = await pharmacyInventoryService.bulkReorder();
      setStatusNotice({
        type: res.count > 0 ? 'green' : 'blue',
        title: res.count > 0 ? `${res.count} reorder drafts created` : 'No new reorders needed',
        sub:
          res.count > 0
            ? 'Review quantities and submit for admin approval'
            : 'Every low-stock item already has an open purchase request',
      });
      await refreshData();
      updateURL('pr', res.prs?.[0]?.id || '', 'Draft');
    } catch (err) {
      console.error(err);
    }
  };

  // Badge Helper
  const renderBadge = (badge: { bg: string; fg: string; bd: string; text: string }) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: '24px',
        padding: '0 8px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        backgroundColor: badge.bg,
        color: badge.fg,
        border: `1px solid ${badge.bd}`,
      }}
    >
      {badge.text}
    </span>
  );

  // Status Badge for Medicine
  const getMedicineStatusBadge = (item: { in_stock?: number; available_stock?: number; reorder_level: number }) => {
    const stock = item.in_stock !== undefined ? item.in_stock : item.available_stock || 0;
    if (stock === 0) return { ...B.red, text: 'Out of stock' };
    if (stock < item.reorder_level) return { ...B.amber, text: 'Low stock' };
    return { ...B.green, text: 'In stock' };
  };

  // Schedule Badge
  const getScheduleBadge = (sched: string, isNarcotic: boolean) => {
    if (isNarcotic) return { ...B.dark, text: `CD · Sch. ${sched}` };
    if (sched === 'OTC') return { ...B.green, text: 'OTC' };
    if (sched === 'X') return { ...B.red, text: 'Sch. X' };
    if (sched === 'H1') return { ...B.purple, text: 'Sch. H1' };
    return { ...B.blue, text: `Sch. ${sched}` };
  };

  // Batch Status Badge
  const getBatchStatusBadge = (b: BatchItem) => {
    if (b.is_quarantined || b.status === 'Quarantined') return { ...B.amber, text: 'Quarantined' };
    if (b.status === 'Return') return { ...B.blue, text: 'Return to supplier' };
    if (b.status === 'Write-off' || b.status === 'Destroyed') return { ...B.red, text: 'Destroyed' };
    if (b.months_left <= 0) return { ...B.red, text: 'Expired' };
    if (b.months_left <= 1) return { ...B.red, text: '≤ 30 days' };
    if (b.months_left <= 3) return { ...B.amber, text: '≤ 90 days' };
    return { ...B.green, text: 'Active' };
  };

  // PR Stage Badge
  const getPRBadge = (st: string) => {
    switch (st) {
      case 'Draft':
        return { ...B.gray, text: 'Draft' };
      case 'Pending approval':
      case 'UNDER_REVIEW':
      case 'SUBMITTED':
        return { ...B.amber, text: 'Pending approval' };
      case 'Approved':
        return { ...B.blue, text: 'Approved' };
      case 'PO issued':
        return { ...B.blue, text: 'PO issued' };
      case 'Receiving':
        return { ...B.sky, text: 'Receiving' };
      case 'Closed':
        return { ...B.green, text: 'Inventory updated' };
      case 'Rejected':
        return { ...B.red, text: 'Rejected' };
      default:
        return { ...B.gray, text: st };
    }
  };

  // Demand Priority Badge
  const getDemandPriorityBadge = (priority: string) => {
    if (priority === 'STAT') return { ...B.red, text: 'STAT EMERGENCY' };
    if (priority === 'URGENT') return { ...B.amber, text: 'URGENT' };
    return { ...B.blue, text: 'ROUTINE' };
  };

  // Forecast Risk Badge
  const getForecastRiskBadge = (risk: string) => {
    if (risk === 'CRITICAL') return { ...B.red, text: 'Critical Risk (<7d)' };
    if (risk === 'WARNING') return { ...B.amber, text: 'Warning (<14d)' };
    if (risk === 'SURPLUS') return { ...B.sky, text: 'Surplus (>90d)' };
    return { ...B.green, text: 'Healthy Cover' };
  };

  // Active counts for navigation badges
  const navCounts = useMemo(() => {
    return {
      dash: (kpis?.low_stock_count || 0) + (kpis?.expiring_batches_count || 0),
      master: medicines.length,
      ledger: kpis?.total_skus || medicines.length,
      batch: batches.length,
      expiry: kpis?.expiring_batches_count || 0,
      dead: kpis?.dead_stock_count || deadStock.length,
      adj: adjustments.length,
      recon: reconciliations.filter(r => r.status === 'PENDING_ADMIN_APPROVAL').length,
      fc: forecasting.filter(f => f.risk_level === 'CRITICAL').length,
      pr: purchaseRequests.filter((p) => !['Closed', 'Rejected'].includes(p.status)).length,
      appr: kpis?.pending_approvals_count || 0,
      grn: goodsReceipts.filter((g) => g.status !== 'Posted').length,
      supp: suppliers.length,
      demand: demands.filter(d => d.status === 'PENDING_TRANSFER').length,
      tr: transfers.filter((t) => t.status !== 'Received').length,
      cd: controlledDrugs.length,
    };
  }, [kpis, medicines, batches, purchaseRequests, goodsReceipts, suppliers, adjustments, transfers, controlledDrugs, deadStock, reconciliations, forecasting, demands]);

  // Selected item references
  const selectedMedicine = useMemo(() => {
    if (activeTab === 'dash') {
      const match = alerts.find((a) => a.code === selectedId || a.id === selectedId) || alerts[0];
      return match ? medicines.find((m) => m.item_code === match.code) || null : null;
    }
    if (activeTab === 'ledger' || activeTab === 'master') {
      return medicines.find((m) => m.item_code === selectedId || m.id === selectedId) || medicines[0] || null;
    }
    return null;
  }, [activeTab, selectedId, alerts, medicines]);

  const selectedPR = useMemo(() => {
    return purchaseRequests.find((p) => p.id === selectedId || p.pr_number === selectedId) || purchaseRequests[0] || null;
  }, [selectedId, purchaseRequests]);

  const selectedBatch = useMemo(() => {
    const list = activeTab === 'expiry' ? expiringBatches : batches;
    return list.find((b) => b.batch_number === selectedId || b.id === selectedId) || list[0] || null;
  }, [activeTab, selectedId, batches, expiringBatches]);

  const selectedGRN = useMemo(() => {
    return goodsReceipts.find((g) => g.id === selectedId || g.grn_number === selectedId) || goodsReceipts[0] || null;
  }, [selectedId, goodsReceipts]);

  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.supplier_code === selectedId || s.id === selectedId) || suppliers[0] || null;
  }, [selectedId, suppliers]);

  const selectedAdj = useMemo(() => {
    return adjustments.find((a) => a.id === selectedId || a.adjustment_number === selectedId) || adjustments[0] || null;
  }, [selectedId, adjustments]);

  const selectedTransfer = useMemo(() => {
    return transfers.find((t) => t.id === selectedId || t.transfer_number === selectedId) || transfers[0] || null;
  }, [selectedId, transfers]);

  const selectedCD = useMemo(() => {
    return controlledDrugs.find((c) => c.id === selectedId || c.entry_number === selectedId) || controlledDrugs[0] || null;
  }, [selectedId, controlledDrugs]);

  const selectedDemand = useMemo(() => {
    return demands.find((d) => d.id === selectedId || d.token_number === selectedId) || demands[0] || null;
  }, [selectedId, demands]);

  const selectedDeadStock = useMemo(() => {
    return deadStock.find((d) => d.id === selectedId || d.item_code === selectedId) || deadStock[0] || null;
  }, [selectedId, deadStock]);

  const selectedForecasting = useMemo(() => {
    return forecasting.find((f) => f.id === selectedId || f.item_code === selectedId) || forecasting[0] || null;
  }, [selectedId, forecasting]);

  const selectedRecon = useMemo(() => {
    return reconciliations.find((r) => r.id === selectedId || r.reconciliation_number === selectedId) || reconciliations[0] || null;
  }, [selectedId, reconciliations]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#f9fafb' }}>
      {/* 1. SIDEBAR (260px) */}
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
        <style>{`
          .pharmacy-nav-item {
            transition: all 0.15s ease;
            outline: none;
          }
          .pharmacy-nav-item:hover:not(.active-nav-item) {
            background-color: #f8fafc !important;
            color: #0f172a !important;
          }
          .pharmacy-nav-item:hover:not(.active-nav-item) svg {
            color: #0f172a !important;
          }
          .pharmacy-nav-item:focus-visible {
            outline: 2px solid #2563eb !important;
            outline-offset: -1px;
          }
          .pharmacy-sidebar-nav::-webkit-scrollbar {
            width: 4px;
          }
          .pharmacy-sidebar-nav::-webkit-scrollbar-track {
            background: transparent;
          }
          .pharmacy-sidebar-nav::-webkit-scrollbar-thumb {
            background: #e2e8f0;
            border-radius: 4px;
          }
          .pharmacy-sidebar-nav::-webkit-scrollbar-thumb:hover {
            background: #cbd5e1;
          }
          .pharmacy-group-header:hover {
            background-color: #f8fafc;
            border-radius: 6px;
          }
          .pharmacy-group-header:hover span {
            color: #475569 !important;
          }
          .pharmacy-dept-btn:hover {
            color: #1d4ed8 !important;
          }
        `}</style>

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
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
              flexShrink: 0,
            }}
          >
            N
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>North Hospital</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>Clinical Enterprise HMS</div>
          </div>
        </div>

        {/* Department Info */}
        <div style={{ margin: '12px 12px 6px', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Current department</span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#2563eb',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '4px',
                padding: '1px 6px',
                letterSpacing: '0.04em',
              }}
            >
              STORE
            </span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>Pharmacy</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            Central medical store · Block B, basement
          </div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => navigate('/pharmacy/ipd')}
              className="pharmacy-dept-btn"
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#2563eb',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: 0,
                transition: 'color 0.15s ease',
              }}
            >
              <BedDouble size={12} />
              Switch to IPD Ward Supply →
            </button>
            <button
              onClick={() => navigate('/pharmacy/opd')}
              className="pharmacy-dept-btn"
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#475569',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: 0,
                transition: 'color 0.15s ease',
              }}
            >
              <Pill size={12} />
              Switch to OPD Counter →
            </button>
            <button
              onClick={() => navigate('/pharmacy/controlled-drugs')}
              className="pharmacy-dept-btn"
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#b45309',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: 0,
                transition: 'color 0.15s ease',
              }}
            >
              <Lock size={12} />
              Controlled Drugs Register →
            </button>
          </div>
        </div>

        {/* Grouped Nav */}
        <nav
          className="pharmacy-sidebar-nav"
          style={{
            flex: 1,
            padding: '6px 10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: '#e2e8f0 transparent',
          }}
        >
          {NAV_GROUPS.map((group, gIdx) => {
            const isCollapsed = !!collapsedGroups[group.label];
            const hasActiveItem = group.items.some((i) => i.key === activeTab);

            return (
              <div key={group.label} style={{ marginTop: gIdx > 0 ? '6px' : '0' }}>
                <div
                  onClick={() => toggleGroup(group.label)}
                  className="pharmacy-group-header"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleGroup(group.label);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 8px 4px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderRadius: '6px',
                    transition: 'background-color 0.15s ease',
                    borderTop: gIdx > 0 ? '1px solid #f1f5f9' : 'none',
                    paddingTop: gIdx > 0 ? '10px' : '8px',
                  }}
                  title={`Click to ${isCollapsed ? 'expand' : 'collapse'} ${group.label}`}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: hasActiveItem ? '#64748b' : '#94a3b8',
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {group.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                    {isCollapsed ? (
                      <ChevronRight size={13} color="#94a3b8" />
                    ) : (
                      <ChevronDown size={13} color="#94a3b8" />
                    )}
                  </div>
                </div>

                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                    {group.items.map((item) => {
                      const isActive = activeTab === item.key;
                      const IconComponent = item.icon;
                      const count = (navCounts as Record<string, number>)[item.key] || 0;
                      const isHot = ['dash', 'expiry', 'appr', 'grn', 'tr', 'demand', 'recon'].includes(item.key) && count > 0;
                      const isUrgent = ['appr', 'demand', 'expiry'].includes(item.key);

                      return (
                        <div
                          key={item.key}
                          onClick={() => updateURL(item.key)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              updateURL(item.key);
                            }
                          }}
                          title={item.label}
                          className={`pharmacy-nav-item ${isActive ? 'active-nav-item' : ''}`}
                          style={{
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            height: '38px',
                            padding: '0 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? SIDEBAR_TOKENS.activeColor : '#475569',
                            background: isActive ? SIDEBAR_TOKENS.activeBg : 'transparent',
                            border: isActive ? `1px solid ${SIDEBAR_TOKENS.activeBorder}` : '1px solid transparent',
                            boxShadow: isActive ? SIDEBAR_TOKENS.activeShadow : 'none',
                          }}
                        >
                          <IconComponent
                            size={18}
                            strokeWidth={1.8}
                            style={{
                              color: isActive ? SIDEBAR_TOKENS.activeIconColor : '#64748b',
                              flexShrink: 0,
                              transition: 'color 0.15s ease',
                            }}
                          />
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: 1.3,
                            }}
                          >
                            {item.label}
                          </span>
                          {count > 0 && (
                            <span
                              style={{
                                marginLeft: 'auto',
                                flexShrink: 0,
                                minWidth: '20px',
                                height: '20px',
                                padding: '0 6px',
                                borderRadius: '10px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: isActive
                                  ? SIDEBAR_TOKENS.badgePillActiveBg
                                  : isHot
                                  ? (isUrgent ? SIDEBAR_TOKENS.badgePillHotBg : SIDEBAR_TOKENS.badgePillWarnBg)
                                  : SIDEBAR_TOKENS.badgePillMutedBg,
                                color: isActive
                                  ? SIDEBAR_TOKENS.badgePillActiveColor
                                  : isHot
                                  ? (isUrgent ? SIDEBAR_TOKENS.badgePillHotColor : SIDEBAR_TOKENS.badgePillWarnColor)
                                  : SIDEBAR_TOKENS.badgePillMutedColor,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {count}
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

        {/* User Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 16px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
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
            <div
              title={displayName}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayName}
            </div>
            <div
              title={designation}
              style={{
                fontSize: '12px',
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {designation}
            </div>
          </div>
          <button
            onClick={() => {
              logout();
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

      {/* 2. MAIN CONTENT AREA */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Sticky App Bar */}
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
            zIndex: 5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
            <span>North Hospital</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span>Pharmacy · Inventory</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ color: '#111827', fontWeight: 600 }}>
              {NAV_GROUPS.flatMap((g) => g.items).find((i) => i.key === activeTab)?.label || 'Workspace'}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#16a34a',
                background: '#f0fdf4',
                borderRadius: '4px',
                padding: '2px 6px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
              Live Store
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isHospitalAdmin && (
              <button
                onClick={() => navigate('/admin')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '32px',
                  padding: '0 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#4b5563',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={14} />
                HMS Admin
              </button>
            )}
            <button
              onClick={() => navigate('/pharmacy/opd')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '32px',
                padding: '0 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#2563eb',
                background: '#eff6ff',
                cursor: 'pointer',
              }}
            >
              <Pill size={14} />
              OPD Dispense Counter
            </button>
            <div
              onClick={refreshData}
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
                cursor: 'pointer',
              }}
            >
              <Clock size={14} /> Last stock sync · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Page Inner Container */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header Card with Operational Actions */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px 28px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h1 style={{ fontSize: '30px', fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>
                Inventory Manager Operational Workspace
              </h1>
              <p style={{ fontSize: '14px', color: '#4b5563', marginTop: '6px' }}>
                Manage medicine master formulary, receive GRN batches, execute FEFO store transfers, and conduct cycle count reconciliations.
              </p>
            </div>

            {/* 5 Primary Operational Triggers */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setEditingMedicine(null);
                  setIsAddEditMedOpen(true);
                }}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
                }}
              >
                <Plus size={16} />
                Add Medicine
              </button>

              <button
                onClick={() => {
                  setBatchMedTarget(null);
                  setIsCreateBatchOpen(true);
                }}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#111827',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Layers size={16} color="#2563eb" />
                Receive Batch
              </button>

              <button
                onClick={() => {
                  setDemandTransferTarget(null);
                  setIsCreateTransferOpen(true);
                }}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#111827',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ArrowLeftRight size={16} color="#16a34a" />
                Internal Transfer
              </button>

              <button
                onClick={() => {
                  setReconMedTarget(null);
                  setIsReconOpen(true);
                }}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  color: '#111827',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ClipboardCheck size={16} color="#7c3aed" />
                Cycle Count
              </button>

              <button
                onClick={handleBulkReorder}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={14} />
                Bulk Reorders
              </button>
            </div>
          </div>

          {/* Top 4 Essential KPI Cards: Single Row x 4 Cards Layout */}
          {(() => {
            const outOfStockCount = kpis?.out_of_stock_count || 0;
            const statDemandsCount = demands.filter(d => d.priority === 'STAT').length;
            const expiringThisMonthCount = batches.filter(b => b.months_left <= 1).length;

            const cardStyle: React.CSSProperties = {
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '16px 18px',
              minHeight: '112px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
            };

            const headerStyle: React.CSSProperties = {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px'
            };

            const labelStyle: React.CSSProperties = {
              fontSize: '13px',
              color: '#6b7280',
              fontWeight: 500
            };

            const neutralTagStyle: React.CSSProperties = {
              fontSize: '11px',
              fontWeight: 500,
              borderRadius: '4px',
              padding: '2px 6px',
              background: '#f3f4f6',
              color: '#6b7280'
            };

            const urgentRedTagStyle: React.CSSProperties = {
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '4px',
              padding: '2px 6px',
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fee2e2'
            };

            const metricRowStyle: React.CSSProperties = {
              display: 'flex',
              alignItems: 'baseline',
              gap: '6px',
              marginTop: '12px'
            };

            const subtextStyle: React.CSSProperties = {
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: 400
            };

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {/* Card 1: Total Master SKUs & Valuation */}
                <div onClick={() => updateURL('master')} style={cardStyle}>
                  <div style={headerStyle}>
                    <span style={labelStyle}>Total Master SKUs</span>
                    <span style={neutralTagStyle}>
                      {formatINR(kpis?.total_valuation || 0)}
                    </span>
                  </div>
                  <div style={metricRowStyle}>
                    <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                      {medicines.length || kpis?.total_skus || 0}
                    </span>
                    <span style={subtextStyle}>catalog items</span>
                  </div>
                </div>

                {/* Card 2: Stock Deficits & Out of Stock */}
                <div onClick={() => updateURL('ledger', '', 'low')} style={cardStyle}>
                  <div style={headerStyle}>
                    <span style={labelStyle}>Stock Deficits</span>
                    <span style={outOfStockCount > 0 ? urgentRedTagStyle : neutralTagStyle}>
                      {outOfStockCount > 0 ? `${outOfStockCount} Out of Stock` : '0 Out of Stock'}
                    </span>
                  </div>
                  <div style={metricRowStyle}>
                    <span
                      style={{
                        fontSize: '28px',
                        fontWeight: 700,
                        color: outOfStockCount > 0 ? '#dc2626' : '#111827',
                        lineHeight: 1.1,
                        letterSpacing: '-0.02em'
                      }}
                    >
                      {kpis?.low_stock_count || 0}
                    </span>
                    <span style={subtextStyle}>below threshold</span>
                  </div>
                </div>

                {/* Card 3: Expiring Batches */}
                <div onClick={() => updateURL('expiry')} style={cardStyle}>
                  <div style={headerStyle}>
                    <span style={labelStyle}>Expiring Batches</span>
                    <span style={expiringThisMonthCount > 0 ? urgentRedTagStyle : neutralTagStyle}>
                      {expiringThisMonthCount > 0 ? `${expiringThisMonthCount} in ≤30d` : '≤ 90 Days'}
                    </span>
                  </div>
                  <div style={metricRowStyle}>
                    <span
                      style={{
                        fontSize: '28px',
                        fontWeight: 700,
                        color: expiringThisMonthCount > 0 ? '#dc2626' : '#111827',
                        lineHeight: 1.1,
                        letterSpacing: '-0.02em'
                      }}
                    >
                      {kpis?.expiring_batches_count || batches.filter(b => b.months_left <= 3).length || 0}
                    </span>
                    <span style={subtextStyle}>quarantine / FEFO queue</span>
                  </div>
                </div>

                {/* Card 4: Pending Demands & Ward Indents */}
                <div onClick={() => updateURL('demand')} style={cardStyle}>
                  <div style={headerStyle}>
                    <span style={labelStyle}>Pending Demands</span>
                    <span style={statDemandsCount > 0 ? urgentRedTagStyle : neutralTagStyle}>
                      {statDemandsCount > 0 ? `${statDemandsCount} STAT` : 'Routine'}
                    </span>
                  </div>
                  <div style={metricRowStyle}>
                    <span
                      style={{
                        fontSize: '28px',
                        fontWeight: 700,
                        color: statDemandsCount > 0 ? '#dc2626' : '#111827',
                        lineHeight: 1.1,
                        letterSpacing: '-0.02em'
                      }}
                    >
                      {demands.filter(d => d.status === 'PENDING_TRANSFER').length || 2}
                    </span>
                    <span style={subtextStyle}>ward & ICU indents</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 3. SPLIT-SCREEN WORKSPACE: Table (Left) + Sticky Context Drawer (Right) */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* LEFT DATA TABLE CONTAINER */}
            <div style={{ flex: '1 1 640px', minWidth: 0, background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
              {/* Header Filters & Search */}
              <div style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                      {activeTab === 'dash'
                        ? 'Items needing action'
                        : activeTab === 'master'
                        ? 'Medicine Master (Hospital Formulary Catalog)'
                        : activeTab === 'ledger'
                        ? 'Central Stock Ledger'
                        : activeTab === 'batch'
                        ? 'Batch Management & FEFO Queue'
                        : activeTab === 'expiry'
                        ? 'Expiry Monitoring & Disposition'
                        : activeTab === 'dead'
                        ? 'Dead Stock Capital Lockup (> 180 Days)'
                        : activeTab === 'recon'
                        ? 'Physical Stock Reconciliation (Cycle Count Audits)'
                        : activeTab === 'fc'
                        ? 'Demand Forecasting & 30-Day Run-Rate'
                        : activeTab === 'pr'
                        ? 'Purchase Requests Workflow'
                        : activeTab === 'appr'
                        ? 'Pending Admin Approvals'
                        : activeTab === 'grn'
                        ? 'Purchase Receipts (GRN)'
                        : activeTab === 'supp'
                        ? 'Approved Suppliers Directory'
                        : activeTab === 'demand'
                        ? 'Department Demand Hub (Ward & OPD Queue)'
                        : activeTab === 'tr'
                        ? 'Internal Stock Transfers'
                        : 'Controlled Drug Register'}
                    </h2>
                    <p style={{ fontSize: '13px', color: '#4b5563', marginTop: '2px' }}>
                      {activeTab === 'dash'
                        ? 'Low stock is detected automatically · create a reorder to start the purchase workflow'
                        : activeTab === 'master'
                        ? 'Full hospital formulary catalog: add, edit, schedule classification (OTC/H/H1/X), and core formulary flags'
                        : activeTab === 'ledger'
                        ? 'Live balance across all batches · OPD and IPD issue from this central ledger'
                        : activeTab === 'batch'
                        ? 'Every batch on hand with FEFO expiry queueing, storage rack allocation, and trace'
                        : activeTab === 'expiry'
                        ? 'Batches expiring soon: execute isolation quarantine, vendor debit return, or bio-destruction scrap'
                        : activeTab === 'dead'
                        ? 'SKUs with zero consumption over 180 days: capital locked and AI recommendations to transfer or return'
                        : activeTab === 'recon'
                        ? 'Physical shelf count verification: live variances calculated with > ₹1,000 threshold approval routing'
                        : activeTab === 'fc'
                        ? 'Consumption run-rate analytics, daily burn, and days of cover with 1-click PR requisition'
                        : activeTab === 'pr'
                        ? 'Draft → Submitted → Admin Approval → PO Issued → GRN Intake → Inventory Updated'
                        : activeTab === 'appr'
                        ? 'Awaiting review by Pharmacy Admin (Dr. Pooja Shah) or Hospital Admin'
                        : activeTab === 'grn'
                        ? 'Receive stock against purchase orders with physical seal & COA checklist'
                        : activeTab === 'supp'
                        ? 'Approved pharma vendors: lead time, preferred status, and on-time performance trace'
                        : activeTab === 'demand'
                        ? 'Real-time patient indents from OPD counters, IPD wards, and Emergency STAT with 1-click transfer'
                        : activeTab === 'tr'
                        ? 'Central store stock movements to OPD counters, IPD ward satellite, and Trauma Emergency'
                        : 'Every receipt, issue, return and destruction · dual witnessed with running balance'}
                    </p>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9ca3af' }} />
                    <input
                      value={query}
                      onChange={(e) => updateURL(activeTab, selectedId, activePill, e.target.value)}
                      placeholder="Search items, code or batch"
                      style={{
                        height: '40px',
                        width: '260px',
                        maxWidth: '100%',
                        padding: '0 12px 0 36px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px',
                        fontSize: '13px',
                        color: '#111827',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {activeTab === 'dash' && (
                    <>
                      {[
                        ['all', 'All alerts'],
                        ['out', 'Out of stock'],
                        ['low', 'Low stock'],
                        ['exp', 'Expiring soon'],
                        ['nopr', 'No reorder yet'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: activePill === k ? '#2563eb' : '#ffffff',
                            color: activePill === k ? '#ffffff' : '#374151',
                            border: `1px solid ${activePill === k ? '#2563eb' : '#e5e7eb'}`,
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeTab === 'master' && (
                    <>
                      {[
                        ['all', 'All Master SKUs'],
                        ['core', 'Core Formulary'],
                        ['sch', 'Scheduled (H/H1/X)'],
                        ['cold', 'Cold Chain'],
                        ['archived', 'Archived Items'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: activePill === k ? '#2563eb' : '#ffffff',
                            color: activePill === k ? '#ffffff' : '#374151',
                            border: `1px solid ${activePill === k ? '#2563eb' : '#e5e7eb'}`,
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeTab === 'demand' && (
                    <>
                      {[
                        ['all', 'All Demands'],
                        ['stat', 'STAT Emergency'],
                        ['urgent', 'Urgent Indents'],
                        ['routine', 'Routine Replenishment'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: activePill === k ? '#2563eb' : '#ffffff',
                            color: activePill === k ? '#ffffff' : '#374151',
                            border: `1px solid ${activePill === k ? '#2563eb' : '#e5e7eb'}`,
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeTab === 'fc' && (
                    <>
                      {[
                        ['all', 'All Forecasts'],
                        ['critical', 'Critical Risk (<7d)'],
                        ['warning', 'Warning (<14d)'],
                        ['healthy', 'Healthy'],
                        ['surplus', 'Surplus Cover'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: activePill === k ? '#2563eb' : '#ffffff',
                            color: activePill === k ? '#ffffff' : '#374151',
                            border: `1px solid ${activePill === k ? '#2563eb' : '#e5e7eb'}`,
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeTab === 'recon' && (
                    <>
                      {[
                        ['all', 'All Reconciliations'],
                        ['reconciled', 'Reconciled (Matched)'],
                        ['pending', 'Pending Admin Approval (> ₹1,000)'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: activePill === k ? '#2563eb' : '#ffffff',
                            color: activePill === k ? '#ffffff' : '#374151',
                            border: `1px solid ${activePill === k ? '#2563eb' : '#e5e7eb'}`,
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeTab === 'ledger' && (
                    <>
                      {[
                        ['all', 'All'],
                        ['low', 'Low stock'],
                        ['out', 'Out of stock'],
                        ['cd', 'Controlled'],
                        ['cold', 'Cold chain'],
                        ['otc', 'OTC'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: activePill === k ? '#2563eb' : '#ffffff',
                            color: activePill === k ? '#ffffff' : '#374151',
                            border: `1px solid ${activePill === k ? '#2563eb' : '#e5e7eb'}`,
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeTab === 'pr' && (
                    <>
                      {['all', 'Draft', 'Pending approval', 'Approved', 'PO issued', 'Receiving', 'Closed', 'Rejected'].map(
                        (k) => (
                          <button
                            key={k}
                            onClick={() => updateURL(activeTab, selectedId, k, query)}
                            style={{
                              height: '32px',
                              padding: '0 12px',
                              borderRadius: '9999px',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              background: activePill === k ? '#2563eb' : '#ffffff',
                              color: activePill === k ? '#ffffff' : '#374151',
                              border: `1px solid ${activePill === k ? '#2563eb' : '#e5e7eb'}`,
                            }}
                          >
                            {k === 'all' ? 'All' : k}
                          </button>
                        ),
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Table Data View */}
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: '820px' }}>
                  {/* 1. MEDICINE MASTER TABLE (activeTab === 'master') */}
                  {activeTab === 'master' && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(220px, 1.8fr) 110px 100px 90px minmax(130px, 1fr) 100px 140px',
                          alignItems: 'center',
                          height: '44px',
                          background: '#f9fafb',
                          borderTop: '1px solid #e5e7eb',
                          borderBottom: '1px solid #e5e7eb',
                          fontSize: '12px',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: '#4b5563',
                        }}
                      >
                        <div style={{ padding: '0 16px' }}>MEDICINE · GENERIC</div>
                        <div style={{ padding: '0 16px' }}>SCHEDULE</div>
                        <div style={{ padding: '0 16px' }}>FORMULARY</div>
                        <div style={{ padding: '0 16px' }}>REORDER</div>
                        <div style={{ padding: '0 16px' }}>STORAGE RACK</div>
                        <div style={{ padding: '0 16px' }}>STOCK</div>
                        <div style={{ padding: '0 16px', textAlign: 'right' }}>OPERATIONS</div>
                      </div>

                      {loading ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>Loading master formulary...</div>
                      ) : medicines.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>No medicines found in master catalog</div>
                      ) : (
                        medicines.map((m) => {
                          const isSel = selectedId === m.item_code || selectedId === m.id;
                          const schedBadge = getScheduleBadge(m.schedule, m.is_narcotic);
                          return (
                            <div
                              key={m.id}
                              onClick={() => updateURL(activeTab, m.item_code, activePill, query)}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(220px, 1.8fr) 110px 100px 90px minmax(130px, 1fr) 100px 140px',
                                alignItems: 'center',
                                minHeight: '56px',
                                borderBottom: '1px solid #f3f4f6',
                                cursor: 'pointer',
                                background: isSel ? '#eff6ff' : '#ffffff',
                                transition: 'background 0.15s ease',
                              }}
                            >
                              <div style={{ padding: '10px 16px' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{m.name}</span>
                                  {m.is_archived && (
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#991b1b', background: '#fee2e2', padding: '1px 5px', borderRadius: '4px' }}>
                                      ARCHIVED
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                  {m.item_code} · {m.generic_name || 'Generic'} ({m.category})
                                </div>
                              </div>

                              <div style={{ padding: '10px 16px' }}>{renderBadge(schedBadge)}</div>

                              <div style={{ padding: '10px 16px' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: m.is_core_formulary !== false ? '#15803d' : '#64748b',
                                    background: m.is_core_formulary !== false ? '#f0fdf4' : '#f1f5f9',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {m.is_core_formulary !== false ? 'Core Formulary' : 'Non-Core'}
                                </span>
                              </div>

                              <div style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>
                                {m.reorder_level} {m.unit_of_measure}
                              </div>

                              <div style={{ padding: '10px 16px', fontSize: '12px', color: '#475569' }}>
                                {m.storage_rack || (m.is_cold_chain ? 'Cold Refrigerator 01' : 'Rack A-01 · Ambient')}
                              </div>

                              <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 700, color: m.available_stock < m.reorder_level ? '#dc2626' : '#111827' }}>
                                {m.available_stock}
                              </div>

                              <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingMedicine(m);
                                    setIsAddEditMedOpen(true);
                                  }}
                                  title="Edit Medicine"
                                  style={{
                                    height: '32px',
                                    padding: '0 10px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    background: '#ffffff',
                                    color: '#2563eb',
                                    border: '1px solid #bfdbfe',
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBatchMedTarget(m);
                                    setIsCreateBatchOpen(true);
                                  }}
                                  title="Receive Batch"
                                  style={{
                                    height: '32px',
                                    padding: '0 10px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    border: '1px solid #93c5fd',
                                  }}
                                >
                                  + Batch
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  )}

                  {/* 2. DEPARTMENT DEMAND QUEUE TABLE (activeTab === 'demand') */}
                  {activeTab === 'demand' && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(140px, 1fr) minmax(160px, 1.2fr) minmax(180px, 1.4fr) 90px 90px 110px 130px',
                          alignItems: 'center',
                          height: '44px',
                          background: '#f9fafb',
                          borderTop: '1px solid #e5e7eb',
                          borderBottom: '1px solid #e5e7eb',
                          fontSize: '12px',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: '#4b5563',
                        }}
                      >
                        <div style={{ padding: '0 16px' }}>TOKEN · TIME</div>
                        <div style={{ padding: '0 16px' }}>SOURCE LOCATION</div>
                        <div style={{ padding: '0 16px' }}>MEDICINE · PRESCRIBER</div>
                        <div style={{ padding: '0 16px' }}>DEMAND</div>
                        <div style={{ padding: '0 16px' }}>STORE STOCK</div>
                        <div style={{ padding: '0 16px' }}>PRIORITY</div>
                        <div style={{ padding: '0 16px', textAlign: 'right' }}>FULFILLMENT</div>
                      </div>

                      {demands.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>All ward & counter demands fulfilled</div>
                      ) : (
                        demands.map((d) => {
                          const isSel = selectedDemand?.id === d.id;
                          return (
                            <div
                              key={d.id}
                              onClick={() => updateURL(activeTab, d.id, activePill, query)}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(140px, 1fr) minmax(160px, 1.2fr) minmax(180px, 1.4fr) 90px 90px 110px 130px',
                                alignItems: 'center',
                                minHeight: '56px',
                                borderBottom: '1px solid #f3f4f6',
                                cursor: 'pointer',
                                background: isSel ? '#eff6ff' : '#ffffff',
                              }}
                            >
                              <div style={{ padding: '10px 16px' }}>
                                <div style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: '13px', color: '#111827' }}>
                                  #{d.token_number}
                                </div>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                  {new Date(d.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>

                              <div style={{ padding: '10px 16px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{d.source}</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>Stock at counter: {d.counter_stock} units</div>
                              </div>

                              <div style={{ padding: '10px 16px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{d.medicine_name}</div>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>Dr. {d.doctor_name} · Pt: {d.patient_name}</div>
                              </div>

                              <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                                {d.requested_quantity} units
                              </div>

                              <div style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: d.central_stock < d.requested_quantity ? '#dc2626' : '#15803d' }}>
                                {d.central_stock} units
                              </div>

                              <div style={{ padding: '10px 16px' }}>
                                {renderBadge(getDemandPriorityBadge(d.priority))}
                              </div>

                              <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDemandTransferTarget(d);
                                    setIsCreateTransferOpen(true);
                                  }}
                                  style={{
                                    height: '34px',
                                    padding: '0 12px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    background: d.priority === 'STAT' ? '#dc2626' : '#2563eb',
                                    color: '#ffffff',
                                    border: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <ArrowLeftRight size={13} /> 1-Click Transfer
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  )}

                  {/* 3. DEAD STOCK TABLE (activeTab === 'dead') */}
                  {activeTab === 'dead' && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(200px, 1.8fr) 100px 90px 120px 120px 140px 120px',
                          alignItems: 'center',
                          height: '44px',
                          background: '#f9fafb',
                          borderTop: '1px solid #e5e7eb',
                          borderBottom: '1px solid #e5e7eb',
                          fontSize: '12px',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: '#4b5563',
                        }}
                      >
                        <div style={{ padding: '0 16px' }}>MEDICINE · CODE</div>
                        <div style={{ padding: '0 16px' }}>SCHEDULE</div>
                        <div style={{ padding: '0 16px' }}>LOCKED UNITS</div>
                        <div style={{ padding: '0 16px' }}>VALUATION</div>
                        <div style={{ padding: '0 16px' }}>DAYS INACTIVE</div>
                        <div style={{ padding: '0 16px' }}>RECOMMENDATION</div>
                        <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                      </div>

                      {deadStock.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>No dead stock detected &gt; 180 days</div>
                      ) : (
                        deadStock.map((d) => {
                          const isSel = selectedDeadStock?.id === d.id;
                          return (
                            <div
                              key={d.id}
                              onClick={() => updateURL(activeTab, d.id, activePill, query)}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(200px, 1.8fr) 100px 90px 120px 120px 140px 120px',
                                alignItems: 'center',
                                minHeight: '56px',
                                borderBottom: '1px solid #f3f4f6',
                                cursor: 'pointer',
                                background: isSel ? '#eff6ff' : '#ffffff',
                              }}
                            >
                              <div style={{ padding: '10px 16px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{d.name}</div>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>{d.item_code} · {d.category}</div>
                              </div>

                              <div style={{ padding: '10px 16px' }}>{renderBadge(getScheduleBadge(d.schedule, false))}</div>

                              <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 700, color: '#b91c1c' }}>
                                {d.units_in_stock}
                              </div>

                              <div style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                                {formatINR(d.total_valuation)}
                              </div>

                              <div style={{ padding: '10px 16px', fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>
                                {d.days_without_movement} days
                              </div>

                              <div style={{ padding: '10px 16px' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    background: d.recommendation === 'BUYBACK_RETURN' ? '#fef2f2' : '#eff6ff',
                                    color: d.recommendation === 'BUYBACK_RETURN' ? '#dc2626' : '#1d4ed8'
                                  }}
                                >
                                  {d.recommendation}
                                </span>
                              </div>

                              <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const med = medicines.find(m => m.id === d.medicine_id);
                                    if (med) {
                                      setBatchMedTarget(med);
                                      setIsCreateTransferOpen(true);
                                    }
                                  }}
                                  style={{
                                    height: '32px',
                                    padding: '0 12px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    background: '#ffffff',
                                    color: '#2563eb',
                                    border: '1px solid #bfdbfe'
                                  }}
                                >
                                  Transfer
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  )}

                  {/* 4. DEMAND FORECASTING TABLE (activeTab === 'fc') */}
                  {activeTab === 'fc' && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(200px, 1.8fr) 90px 90px 110px 110px 130px 120px',
                          alignItems: 'center',
                          height: '44px',
                          background: '#f9fafb',
                          borderTop: '1px solid #e5e7eb',
                          borderBottom: '1px solid #e5e7eb',
                          fontSize: '12px',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: '#4b5563',
                        }}
                      >
                        <div style={{ padding: '0 16px' }}>MEDICINE · SKU</div>
                        <div style={{ padding: '0 16px' }}>STOCK</div>
                        <div style={{ padding: '0 16px' }}>DAILY BURN</div>
                        <div style={{ padding: '0 16px' }}>DAYS COVER</div>
                        <div style={{ padding: '0 16px' }}>PROJECTED OUT</div>
                        <div style={{ padding: '0 16px' }}>RISK LEVEL</div>
                        <div style={{ padding: '0 16px', textAlign: 'right' }}>REORDER</div>
                      </div>

                      {forecasting.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>No run-rate projections computed</div>
                      ) : (
                        forecasting.map((f) => {
                          const isSel = selectedForecasting?.id === f.id;
                          return (
                            <div
                              key={f.id}
                              onClick={() => updateURL(activeTab, f.id, activePill, query)}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(200px, 1.8fr) 90px 90px 110px 110px 130px 120px',
                                alignItems: 'center',
                                minHeight: '56px',
                                borderBottom: '1px solid #f3f4f6',
                                cursor: 'pointer',
                                background: isSel ? '#eff6ff' : '#ffffff',
                              }}
                            >
                              <div style={{ padding: '10px 16px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{f.name}</div>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>{f.item_code} · 30d Burn: {f.monthly_consumption_units} units</div>
                              </div>

                              <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                                {f.current_stock}
                              </div>

                              <div style={{ padding: '10px 16px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                                {f.daily_burn_rate} / day
                              </div>

                              <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 700, color: f.days_of_stock_remaining < 7 ? '#dc2626' : f.days_of_stock_remaining < 14 ? '#b45309' : '#15803d' }}>
                                {f.days_of_stock_remaining} days
                              </div>

                              <div style={{ padding: '10px 16px', fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                                {f.projected_stockout_date}
                              </div>

                              <div style={{ padding: '10px 16px' }}>
                                {renderBadge(getForecastRiskBadge(f.risk_level))}
                              </div>

                              <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const med = medicines.find(m => m.id === f.medicine_id);
                                    if (med) {
                                      pharmacyInventoryService.createPurchaseRequest({
                                        medicine_id: med.id,
                                        quantity: f.suggested_reorder_quantity,
                                        notes: `Automated 30-day run rate replenishment (${f.days_of_stock_remaining} days cover remaining)`
                                      }).then((res) => {
                                        setStatusNotice({
                                          type: 'green',
                                          title: `PR ${res.pr_number} Drafted`,
                                          sub: `Reorder of ${f.suggested_reorder_quantity} units drafted for Dr. Pooja Shah review.`
                                        });
                                        refreshData();
                                      });
                                    }
                                  }}
                                  style={{
                                    height: '32px',
                                    padding: '0 12px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    background: f.risk_level === 'CRITICAL' ? '#dc2626' : '#2563eb',
                                    color: '#ffffff',
                                    border: 'none'
                                  }}
                                >
                                  Reorder {f.suggested_reorder_quantity}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  )}

                  {/* 5. PHYSICAL STOCK RECONCILIATION TABLE (activeTab === 'recon') */}
                  {activeTab === 'recon' && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(120px, 0.9fr) minmax(180px, 1.4fr) 80px 80px 110px 120px 130px',
                          alignItems: 'center',
                          height: '44px',
                          background: '#f9fafb',
                          borderTop: '1px solid #e5e7eb',
                          borderBottom: '1px solid #e5e7eb',
                          fontSize: '12px',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: '#4b5563',
                        }}
                      >
                        <div style={{ padding: '0 16px' }}>RECON # · DATE</div>
                        <div style={{ padding: '0 16px' }}>MEDICINE · BATCH</div>
                        <div style={{ padding: '0 16px' }}>SYSTEM</div>
                        <div style={{ padding: '0 16px' }}>COUNT</div>
                        <div style={{ padding: '0 16px' }}>VARIANCE</div>
                        <div style={{ padding: '0 16px' }}>REASON CODE</div>
                        <div style={{ padding: '0 16px', textAlign: 'right' }}>STATUS</div>
                      </div>

                      {reconciliations.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>No physical cycle counts logged</div>
                      ) : (
                        reconciliations.map((r) => {
                          const isSel = selectedRecon?.id === r.id;
                          return (
                            <div
                              key={r.id}
                              onClick={() => updateURL(activeTab, r.id, activePill, query)}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(120px, 0.9fr) minmax(180px, 1.4fr) 80px 80px 110px 120px 130px',
                                alignItems: 'center',
                                minHeight: '56px',
                                borderBottom: '1px solid #f3f4f6',
                                cursor: 'pointer',
                                background: isSel ? '#eff6ff' : '#ffffff',
                              }}
                            >
                              <div style={{ padding: '10px 16px' }}>
                                <div style={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: '13px', color: '#111827' }}>
                                  {r.reconciliation_number}
                                </div>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                  {new Date(r.reconciled_at).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                                </div>
                              </div>

                              <div style={{ padding: '10px 16px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{r.medicine_name}</div>
                                <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>Batch: {r.batch_number}</div>
                              </div>

                              <div style={{ padding: '10px 16px', fontSize: '13px', color: '#4b5563' }}>{r.system_balance}</div>

                              <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 700, color: '#7c3aed' }}>
                                {r.physical_count}
                              </div>

                              <div style={{ padding: '10px 16px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: r.variance_units === 0 ? '#15803d' : r.variance_units > 0 ? '#1d4ed8' : '#b91c1c' }}>
                                  {r.variance_units > 0 ? `+${r.variance_units}` : r.variance_units} units
                                </div>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                  ₹{Math.abs(r.variance_value).toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                                </div>
                              </div>

                              <div style={{ padding: '10px 16px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                  {r.reason_code}
                                </span>
                              </div>

                              <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    borderRadius: '4px',
                                    padding: '2px 8px',
                                    background: r.status === 'RECONCILED' ? '#f0fdf4' : '#fffbeb',
                                    color: r.status === 'RECONCILED' ? '#15803d' : '#b45309',
                                    border: `1px solid ${r.status === 'RECONCILED' ? '#bbf7d0' : '#fde68a'}`
                                  }}
                                >
                                  {r.status === 'RECONCILED' ? 'RECONCILED' : 'ADMIN APPROVAL'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  )}

                  {/* 6. DASHBOARD & STOCK LEDGER TABLE */}
                  {(activeTab === 'dash' || activeTab === 'ledger') && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(220px, 1.8fr) 110px 90px 90px minmax(130px, 1fr) 140px 96px',
                          alignItems: 'center',
                          height: '44px',
                          background: '#f9fafb',
                          borderTop: '1px solid #e5e7eb',
                          borderBottom: '1px solid #e5e7eb',
                          fontSize: '12px',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: '#4b5563',
                        }}
                      >
                        <div style={{ padding: '0 16px' }}>ITEM · CODE</div>
                        <div style={{ padding: '0 16px' }}>SCHEDULE</div>
                        <div style={{ padding: '0 16px' }}>IN STOCK</div>
                        <div style={{ padding: '0 16px' }}>REORDER</div>
                        <div style={{ padding: '0 16px' }}>REORDER STATUS</div>
                        <div style={{ padding: '0 16px' }}>STATUS</div>
                        <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                      </div>

                      {loading ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>Loading inventory records...</div>
                      ) : (activeTab === 'dash' ? alerts : medicines).length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>No items match filter</div>
                      ) : (
                        (activeTab === 'dash' ? alerts : medicines).map((item: any) => {
                          const code = item.code || item.item_code;
                          const name = item.name;
                          const generic = item.generic || item.generic_name;
                          const sched = item.schedule;
                          const isCD = item.is_narcotic;
                          const stock = item.in_stock !== undefined ? item.in_stock : item.available_stock;
                          const par = item.reorder_level;
                          const isSel = selectedId === code || (selectedMedicine && selectedMedicine.item_code === code);
                          const stBadge = getMedicineStatusBadge({ in_stock: stock, reorder_level: par });
                          const schedBadge = getScheduleBadge(sched, isCD);

                          return (
                            <div
                              key={code}
                              onClick={() => updateURL(activeTab, code, activePill, query)}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(220px, 1.8fr) 110px 90px 90px minmax(130px, 1fr) 140px 96px',
                                alignItems: 'center',
                                minHeight: '56px',
                                borderBottom: '1px solid #f3f4f6',
                                cursor: 'pointer',
                                background: isSel ? '#eff6ff' : '#ffffff',
                                transition: 'background 0.15s ease',
                              }}
                            >
                              <div style={{ padding: '10px 16px' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{name}</span>
                                  {isCD && (
                                    <span
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        color: '#ffffff',
                                        background: '#111827',
                                        borderRadius: '4px',
                                        padding: '1px 6px',
                                      }}
                                    >
                                      CD
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                  {code} · {generic}
                                </div>
                              </div>

                              <div style={{ padding: '10px 16px' }}>{renderBadge(schedBadge)}</div>

                              <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: stock === 0 ? '#dc2626' : stock < par ? '#b45309' : '#111827' }}>
                                {stock}
                              </div>

                              <div style={{ padding: '10px 16px', fontSize: '14px', color: '#4b5563' }}>{par}</div>

                              <div style={{ padding: '10px 16px' }}>
                                {item.reorder_status ? (
                                  <span style={{ fontSize: '12px', fontWeight: 500, color: item.reorder_status.includes('Draft') || item.reorder_status.includes('Pending') ? '#b45309' : '#6b7280' }}>
                                    {item.reorder_status}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '12px', color: stock < par ? '#dc2626' : '#9ca3af' }}>
                                    {stock < par ? 'Not raised' : '—'}
                                  </span>
                                )}
                              </div>

                              <div style={{ padding: '10px 16px' }}>{renderBadge(stBadge)}</div>

                              <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                  style={{
                                    height: '36px',
                                    padding: '0 14px',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    background: isSel ? '#2563eb' : '#ffffff',
                                    color: isSel ? '#ffffff' : '#1d4ed8',
                                    border: `1px solid ${isSel ? '#2563eb' : '#bfdbfe'}`,
                                  }}
                                >
                                  {stock < par && !item.active_pr ? 'Reorder' : 'Details'}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  )}

                  {/* 7. PURCHASE REQUESTS TABLE */}
                  {activeTab === 'pr' && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(130px, 0.9fr) minmax(200px, 1.6fr) 100px minmax(150px, 1.1fr) 90px 150px 96px',
                          alignItems: 'center',
                          height: '44px',
                          background: '#f9fafb',
                          borderTop: '1px solid #e5e7eb',
                          borderBottom: '1px solid #e5e7eb',
                          fontSize: '12px',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: '#4b5563',
                        }}
                      >
                        <div style={{ padding: '0 16px' }}>PR · CREATED</div>
                        <div style={{ padding: '0 16px' }}>ITEM</div>
                        <div style={{ padding: '0 16px' }}>QTY · VALUE</div>
                        <div style={{ padding: '0 16px' }}>SUPPLIER</div>
                        <div style={{ padding: '0 16px' }}>STAGE</div>
                        <div style={{ padding: '0 16px' }}>STATUS</div>
                        <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                      </div>

                      {purchaseRequests.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>No purchase requests found</div>
                      ) : (
                        purchaseRequests.map((p) => {
                          const isSel = selectedPR?.id === p.id;
                          return (
                            <div
                              key={p.id}
                              onClick={() => updateURL('pr', p.id, activePill, query)}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(130px, 0.9fr) minmax(200px, 1.6fr) 100px minmax(150px, 1.1fr) 90px 150px 96px',
                                alignItems: 'center',
                                minHeight: '56px',
                                borderBottom: '1px solid #f3f4f6',
                                cursor: 'pointer',
                                background: isSel ? '#eff6ff' : '#ffffff',
                              }}
                            >
                              <div style={{ padding: '10px 16px' }}>
                                <div style={{ fontFamily: MONO_FONT, fontWeight: 600, fontSize: '13px', color: '#111827' }}>
                                  {p.pr_number}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                  {new Date(p.created_at).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                                </div>
                              </div>

                              <div style={{ padding: '10px 16px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{p.medicine_name}</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{p.notes || 'Requisition item'}</div>
                              </div>

                              <div style={{ padding: '10px 16px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{p.requested_quantity}</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{formatINR(p.total_estimated_value)}</div>
                              </div>

                              <div style={{ padding: '10px 16px' }}>
                                <div style={{ fontSize: '13px', color: '#111827' }}>{p.supplier_name}</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{p.purchase_order_number || ''}</div>
                              </div>

                              <div style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                                {p.workflow_stage} / 8
                              </div>

                              <div style={{ padding: '10px 16px' }}>{renderBadge(getPRBadge(p.status))}</div>

                              <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                  style={{
                                    height: '36px',
                                    padding: '0 14px',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    background: isSel ? '#2563eb' : '#ffffff',
                                    color: isSel ? '#ffffff' : '#1d4ed8',
                                    border: `1px solid ${isSel ? '#2563eb' : '#bfdbfe'}`,
                                  }}
                                >
                                  {p.status === 'Draft' ? 'Submit' : p.status === 'Approved' ? 'Issue PO' : p.status === 'PO issued' ? 'Receive' : 'Track'}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  )}

                  {/* 8. GOODS RECEIPTS (GRN) TABLE */}
                  {activeTab === 'grn' && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(150px, 1fr) minmax(170px, 1.3fr) 130px 80px 110px 150px 96px',
                          alignItems: 'center',
                          height: '44px',
                          background: '#f9fafb',
                          borderTop: '1px solid #e5e7eb',
                          borderBottom: '1px solid #e5e7eb',
                          fontSize: '12px',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: '#4b5563',
                        }}
                      >
                        <div style={{ padding: '0 16px' }}>GRN · RECEIVED</div>
                        <div style={{ padding: '0 16px' }}>SUPPLIER</div>
                        <div style={{ padding: '0 16px' }}>PO · PR</div>
                        <div style={{ padding: '0 16px' }}>LINES</div>
                        <div style={{ padding: '0 16px' }}>VALUE</div>
                        <div style={{ padding: '0 16px' }}>STATUS</div>
                        <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                      </div>

                      {goodsReceipts.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>No goods receipts found</div>
                      ) : (
                        goodsReceipts.map((g) => {
                          const isSel = selectedGRN?.id === g.id;
                          return (
                            <div
                              key={g.id}
                              onClick={() => updateURL('grn', g.id, activePill, query)}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(150px, 1fr) minmax(170px, 1.3fr) 130px 80px 110px 150px 96px',
                                alignItems: 'center',
                                minHeight: '56px',
                                borderBottom: '1px solid #f3f4f6',
                                cursor: 'pointer',
                                background: isSel ? '#eff6ff' : '#ffffff',
                              }}
                            >
                              <div style={{ padding: '10px 16px' }}>
                                <div style={{ fontFamily: MONO_FONT, fontWeight: 600, fontSize: '13px' }}>{g.grn_number}</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{new Date(g.received_at).toLocaleDateString()}</div>
                              </div>
                              <div style={{ padding: '10px 16px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600 }}>{g.supplier_name}</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{g.invoice_number}</div>
                              </div>
                              <div style={{ padding: '10px 16px', fontFamily: MONO_FONT, fontSize: '12px' }}>
                                {g.po_number || '—'}
                              </div>
                              <div style={{ padding: '10px 16px', fontWeight: 600 }}>{g.lines.length}</div>
                              <div style={{ padding: '10px 16px' }}>{formatINR(g.total_value)}</div>
                              <div style={{ padding: '10px 16px' }}>
                                {renderBadge(
                                  g.status === 'Posted'
                                    ? { ...B.green, text: 'Inventory updated' }
                                    : { ...B.amber, text: 'Batch verification' },
                                )}
                              </div>
                              <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                  style={{
                                    height: '36px',
                                    padding: '0 14px',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    background: isSel ? '#2563eb' : '#ffffff',
                                    color: isSel ? '#ffffff' : '#1d4ed8',
                                    border: `1px solid ${isSel ? '#2563eb' : '#bfdbfe'}`,
                                  }}
                                >
                                  {g.status === 'Posted' ? 'View' : 'Verify'}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  )}

                  {/* 9. BATCH MANAGEMENT & EXPIRY TABLE */}
                  {(activeTab === 'batch' || activeTab === 'expiry') && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(130px, 0.9fr) minmax(200px, 1.6fr) 80px minmax(120px, 1fr) minmax(140px, 1fr) 140px 120px',
                          alignItems: 'center',
                          height: '44px',
                          background: '#f9fafb',
                          borderTop: '1px solid #e5e7eb',
                          borderBottom: '1px solid #e5e7eb',
                          fontSize: '12px',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: '#4b5563',
                        }}
                      >
                        <div style={{ padding: '0 16px' }}>BATCH</div>
                        <div style={{ padding: '0 16px' }}>ITEM</div>
                        <div style={{ padding: '0 16px' }}>QTY</div>
                        <div style={{ padding: '0 16px' }}>EXPIRY</div>
                        <div style={{ padding: '0 16px' }}>SUPPLIER · GRN</div>
                        <div style={{ padding: '0 16px' }}>STATUS</div>
                        <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                      </div>

                      {(activeTab === 'expiry' ? expiringBatches : batches).map((b) => {
                        const isSel = selectedBatch?.id === b.id;
                        const bBadge = getBatchStatusBadge(b);
                        return (
                          <div
                            key={b.id}
                            onClick={() => updateURL(activeTab, b.batch_number, activePill, query)}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(130px, 0.9fr) minmax(200px, 1.6fr) 80px minmax(120px, 1fr) minmax(140px, 1fr) 140px 120px',
                              alignItems: 'center',
                              minHeight: '56px',
                              borderBottom: '1px solid #f3f4f6',
                              cursor: 'pointer',
                              background: isSel ? '#eff6ff' : '#ffffff',
                            }}
                          >
                            <div style={{ padding: '10px 16px', fontFamily: MONO_FONT, fontWeight: 600, fontSize: '13px' }}>
                              {b.batch_number}
                            </div>
                            <div style={{ padding: '10px 16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 600 }}>{b.medicine_name}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>{b.medicine_code} · {b.storage_location}</div>
                            </div>
                            <div style={{ padding: '10px 16px', fontWeight: 600 }}>{b.available_quantity}</div>
                            <div style={{ padding: '10px 16px' }}>
                              <div style={{ fontSize: '13px', color: b.months_left <= 3 ? '#b45309' : '#111827' }}>
                                {formatDateMonth(b.expiry_date)}
                              </div>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                {b.months_left <= 0 ? 'expired' : `${b.months_left} mo left`}
                              </div>
                            </div>
                            <div style={{ padding: '10px 16px' }}>
                              <div style={{ fontSize: '13px' }}>{b.supplier_name}</div>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>{b.grn_reference || '—'}</div>
                            </div>
                            <div style={{ padding: '10px 16px' }}>{renderBadge(bBadge)}</div>
                            <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpiryBatchTarget(b);
                                  setIsExpiryActionOpen(true);
                                }}
                                style={{
                                  height: '32px',
                                  padding: '0 10px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  background: '#fff7ed',
                                  color: '#c2410c',
                                  border: '1px solid #fdba74',
                                }}
                              >
                                Dispose
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* 10. STOCK ADJUSTMENTS TABLE */}
                  {activeTab === 'adj' && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(120px, 0.9fr) minmax(200px, 1.6fr) minmax(110px, 0.9fr) 80px 120px 140px',
                          alignItems: 'center',
                          height: '44px',
                          background: '#f9fafb',
                          borderTop: '1px solid #e5e7eb',
                          borderBottom: '1px solid #e5e7eb',
                          fontSize: '12px',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: '#4b5563',
                        }}
                      >
                        <div style={{ padding: '0 16px' }}>ADJUSTMENT</div>
                        <div style={{ padding: '0 16px' }}>ITEM</div>
                        <div style={{ padding: '0 16px' }}>BATCH</div>
                        <div style={{ padding: '0 16px' }}>CHANGE</div>
                        <div style={{ padding: '0 16px' }}>REASON</div>
                        <div style={{ padding: '0 16px' }}>STATUS</div>
                      </div>

                      {adjustments.map((a) => {
                        const isSel = selectedAdj?.id === a.id;
                        return (
                          <div
                            key={a.id}
                            onClick={() => updateURL('adj', a.id, activePill, query)}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(120px, 0.9fr) minmax(200px, 1.6fr) minmax(110px, 0.9fr) 80px 120px 140px',
                              alignItems: 'center',
                              minHeight: '56px',
                              borderBottom: '1px solid #f3f4f6',
                              cursor: 'pointer',
                              background: isSel ? '#eff6ff' : '#ffffff',
                            }}
                          >
                            <div style={{ padding: '10px 16px', fontFamily: MONO_FONT, fontWeight: 600 }}>{a.adjustment_number}</div>
                            <div style={{ padding: '10px 16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 600 }}>{a.medicine_name}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>{a.note || 'Audit record'}</div>
                            </div>
                            <div style={{ padding: '10px 16px', fontFamily: MONO_FONT, fontSize: '13px' }}>{a.batch_number}</div>
                            <div
                              style={{
                                padding: '10px 16px',
                                fontWeight: 600,
                                color: a.quantity_delta < 0 ? '#dc2626' : '#15803d',
                              }}
                            >
                              {a.quantity_delta > 0 ? `+${a.quantity_delta}` : a.quantity_delta}
                            </div>
                            <div style={{ padding: '10px 16px', fontSize: '13px', color: '#4b5563' }}>{a.reason}</div>
                            <div style={{ padding: '10px 16px' }}>
                              {renderBadge(
                                a.status === 'Applied'
                                  ? { ...B.green, text: 'Inventory updated' }
                                  : { ...B.amber, text: 'Pending approval' },
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* 11. TRANSFER REQUESTS TABLE */}
                  {activeTab === 'tr' && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(120px, 0.9fr) minmax(200px, 1.6fr) 80px minmax(150px, 1.2fr) 140px 96px',
                          alignItems: 'center',
                          height: '44px',
                          background: '#f9fafb',
                          borderTop: '1px solid #e5e7eb',
                          borderBottom: '1px solid #e5e7eb',
                          fontSize: '12px',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: '#4b5563',
                        }}
                      >
                        <div style={{ padding: '0 16px' }}>TRANSFER #</div>
                        <div style={{ padding: '0 16px' }}>ITEM</div>
                        <div style={{ padding: '0 16px' }}>QTY</div>
                        <div style={{ padding: '0 16px' }}>DESTINATION</div>
                        <div style={{ padding: '0 16px' }}>STATUS</div>
                        <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                      </div>

                      {transfers.map((t) => {
                        const isSel = selectedTransfer?.id === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => updateURL('tr', t.id, activePill, query)}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(120px, 0.9fr) minmax(200px, 1.6fr) 80px minmax(150px, 1.2fr) 140px 96px',
                              alignItems: 'center',
                              minHeight: '56px',
                              borderBottom: '1px solid #f3f4f6',
                              cursor: 'pointer',
                              background: isSel ? '#eff6ff' : '#ffffff',
                            }}
                          >
                            <div style={{ padding: '10px 16px', fontFamily: MONO_FONT, fontWeight: 600 }}>{t.transfer_number}</div>
                            <div style={{ padding: '10px 16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 600 }}>{t.medicine_name}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>{t.medicine_code}</div>
                            </div>
                            <div style={{ padding: '10px 16px', fontWeight: 600 }}>{t.quantity}</div>
                            <div style={{ padding: '10px 16px', fontSize: '13px' }}>{t.destination}</div>
                            <div style={{ padding: '10px 16px' }}>
                              {renderBadge(
                                t.status === 'Received'
                                  ? { ...B.green, text: 'Received at counter' }
                                  : { ...B.blue, text: 'In transit' },
                              )}
                            </div>
                            <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                              <button
                                style={{
                                  height: '36px',
                                  padding: '0 14px',
                                  borderRadius: '10px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  background: isSel ? '#2563eb' : '#ffffff',
                                  color: isSel ? '#ffffff' : '#1d4ed8',
                                  border: `1px solid ${isSel ? '#2563eb' : '#bfdbfe'}`,
                                }}
                              >
                                View
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* 12. CONTROLLED DRUGS TABLE */}
                  {activeTab === 'cd' && (
                    <>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(120px, 0.9fr) minmax(200px, 1.6fr) minmax(110px, 0.9fr) 80px 120px 140px',
                          alignItems: 'center',
                          height: '44px',
                          background: '#f9fafb',
                          borderTop: '1px solid #e5e7eb',
                          borderBottom: '1px solid #e5e7eb',
                          fontSize: '12px',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: '#4b5563',
                        }}
                      >
                        <div style={{ padding: '0 16px' }}>REGISTER #</div>
                        <div style={{ padding: '0 16px' }}>ITEM</div>
                        <div style={{ padding: '0 16px' }}>BATCH</div>
                        <div style={{ padding: '0 16px' }}>DISPENSED</div>
                        <div style={{ padding: '0 16px' }}>BALANCE AFTER</div>
                        <div style={{ padding: '0 16px' }}>WITNESS PHARMACIST</div>
                      </div>

                      {controlledDrugs.map((c) => {
                        const isSel = selectedCD?.id === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => updateURL('cd', c.id, activePill, query)}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(120px, 0.9fr) minmax(200px, 1.6fr) minmax(110px, 0.9fr) 80px 120px 140px',
                              alignItems: 'center',
                              minHeight: '56px',
                              borderBottom: '1px solid #f3f4f6',
                              cursor: 'pointer',
                              background: isSel ? '#eff6ff' : '#ffffff',
                            }}
                          >
                            <div style={{ padding: '10px 16px', fontFamily: MONO_FONT, fontWeight: 600 }}>{c.entry_number}</div>
                            <div style={{ padding: '10px 16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 600 }}>{c.medicine_name}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>Dr. {c.prescribing_doctor_name}</div>
                            </div>
                            <div style={{ padding: '10px 16px', fontFamily: MONO_FONT, fontSize: '13px' }}>{c.batch_number}</div>
                            <div style={{ padding: '10px 16px', fontWeight: 600, color: '#dc2626' }}>{c.quantity_dispensed}</div>
                            <div style={{ padding: '10px 16px', fontWeight: 700, color: '#111827' }}>{c.balance_stock_after}</div>
                            <div style={{ padding: '10px 16px', fontSize: '12px', color: '#4b5563' }}>
                              {c.witness_staff_name} ({c.witness_role})
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT STICKY CONTEXT INSPECTION DRAWER */}
            <div style={{ flex: '1 1 360px', minWidth: '320px', maxWidth: '420px', position: 'sticky', top: '70px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280', marginBottom: '8px' }}>
                INSPECTION · CONTEXT DETAILS
              </div>

              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  maxHeight: 'calc(100vh - 110px)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Status Notice Toast inside Drawer */}
                {statusNotice && (
                  <div
                    style={{
                      margin: '12px 16px 0',
                      padding: '12px',
                      borderRadius: '8px',
                      background: B[statusNotice.type].bg,
                      border: `1px solid ${B[statusNotice.type].bd}`,
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <CircleCheck size={18} color={B[statusNotice.type].fg} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: B[statusNotice.type].fg }}>
                        {statusNotice.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>{statusNotice.sub}</div>
                    </div>
                  </div>
                )}

                {/* DRAWER FOR MEDICINE (dash/ledger/master) */}
                {(activeTab === 'dash' || activeTab === 'ledger' || activeTab === 'master') && selectedMedicine && (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{selectedMedicine.name}</h3>
                        {renderBadge(getMedicineStatusBadge(selectedMedicine))}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        {selectedMedicine.item_code} · {selectedMedicine.generic_name}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {renderBadge(getScheduleBadge(selectedMedicine.schedule, selectedMedicine.is_narcotic))}
                      {selectedMedicine.is_cold_chain && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: '24px',
                            padding: '0 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: '#f0f9ff',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                          }}
                        >
                          Cold chain 2–8 °C
                        </span>
                      )}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: '24px',
                          padding: '0 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: '#f8fafc',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        Rack: {selectedMedicine.storage_rack || 'A-01'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>In stock</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: selectedMedicine.available_stock < selectedMedicine.reorder_level ? '#b45309' : '#111827' }}>
                          {selectedMedicine.available_stock}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>Reorder</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{selectedMedicine.reorder_level}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>Stock value</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                          {formatINR(selectedMedicine.available_stock * Number(selectedMedicine.unit_price))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#64748b', marginBottom: '8px' }}>
                        FEFO BATCHES ON HAND ({selectedMedicine.batches.length})
                      </div>
                      {selectedMedicine.batches.length === 0 ? (
                        <div style={{ padding: '10px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', color: '#dc2626', fontSize: '12px' }}>
                          No active batches on hand.
                        </div>
                      ) : (
                        selectedMedicine.batches.map((b, idx) => (
                          <div
                            key={b.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 0',
                              borderBottom: '1px solid #f3f4f6',
                            }}
                          >
                            <div>
                              <div style={{ fontFamily: MONO_FONT, fontSize: '12px', fontWeight: 700 }}>
                                {b.batch_number} {idx === 0 && <span style={{ color: '#2563eb' }}>· FEFO next</span>}
                              </div>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                Exp {formatDateMonth(b.expiry_date)} · {b.available_quantity} units
                              </div>
                            </div>
                            {renderBadge(getBatchStatusBadge(b))}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Quick Trigger Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                      <button
                        onClick={() => {
                          setEditingMedicine(selectedMedicine);
                          setIsAddEditMedOpen(true);
                        }}
                        style={{
                          height: '36px',
                          background: '#ffffff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Edit Formulary Entry
                      </button>

                      <button
                        onClick={() => {
                          setBatchMedTarget(selectedMedicine);
                          setIsCreateBatchOpen(true);
                        }}
                        style={{
                          height: '36px',
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Receive New Batch (GRN)
                      </button>
                    </div>
                  </div>
                )}

                {/* DRAWER FOR DEMAND (demand) */}
                {activeTab === 'demand' && selectedDemand && (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>Demand #{selectedDemand.token_number}</h3>
                        {renderBadge(getDemandPriorityBadge(selectedDemand.priority))}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        Origin: <strong>{selectedDemand.source}</strong> ({selectedDemand.encounter_type})
                      </div>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Medicine Requested</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{selectedDemand.medicine_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Requested Quantity: <strong style={{ color: '#0f172a' }}>{selectedDemand.requested_quantity} units</strong></div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Prescribing Clinician: <strong>Dr. {selectedDemand.doctor_name}</strong></div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Patient: <strong>{selectedDemand.patient_name}</strong></div>
                    </div>

                    <div style={{ padding: '12px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#166534' }}>Central Store Stock:</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#15803d' }}>{selectedDemand.central_stock} units</div>
                    </div>

                    <button
                      onClick={() => {
                        setDemandTransferTarget(selectedDemand);
                        setIsCreateTransferOpen(true);
                      }}
                      style={{
                        height: '40px',
                        background: selectedDemand.priority === 'STAT' ? '#dc2626' : '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        marginTop: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <ArrowLeftRight size={16} /> Fulfill Demand Transfer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* OPERATIONAL MODALS (Mounted at root with full event bindings)              */}
        {/* ========================================================================= */}

        {/* Modal 1: Add / Edit Medicine Master */}
        <AddEditMedicineModal
          isOpen={isAddEditMedOpen}
          onClose={() => {
            setIsAddEditMedOpen(false);
            setEditingMedicine(null);
          }}
          onSaved={(savedMed) => {
            setStatusNotice({
              type: 'green',
              title: `Formulary Updated: ${savedMed.name}`,
              sub: 'Master catalog item parameters and reorder thresholds saved.'
            });
            refreshData();
          }}
          editingMedicine={editingMedicine}
          suppliers={suppliers}
        />

        {/* Modal 2: Create / Receive Batch (GRN) */}
        <CreateBatchModal
          isOpen={isCreateBatchOpen}
          onClose={() => {
            setIsCreateBatchOpen(false);
            setBatchMedTarget(null);
          }}
          onCreated={(batch) => {
            setStatusNotice({
              type: 'green',
              title: `Batch ${batch.batch_number} Logged`,
              sub: `Initial quantity of ${batch.initial_quantity} units stored at ${batch.storage_location}.`
            });
            refreshData();
          }}
          medicines={medicines}
          suppliers={suppliers}
          selectedMedicine={batchMedTarget}
        />

        {/* Modal 3: Internal Stock Transfer */}
        <CreateTransferModal
          isOpen={isCreateTransferOpen}
          onClose={() => {
            setIsCreateTransferOpen(false);
            setDemandTransferTarget(null);
          }}
          onTransferred={(transfer) => {
            setStatusNotice({
              type: 'green',
              title: `Transfer Dispatched`,
              sub: `Stock allocation dispatched to satellite counter.`
            });
            refreshData();
          }}
          medicines={medicines}
          preselectedDemand={demandTransferTarget}
        />

        {/* Modal 4: Physical Stock Reconciliation (Cycle Count) */}
        <StockReconciliationModal
          isOpen={isReconOpen}
          onClose={() => {
            setIsReconOpen(false);
            setReconMedTarget(null);
          }}
          onSubmitted={(item) => {
            setStatusNotice({
              type: item.status === 'RECONCILED' ? 'green' : 'amber',
              title: item.status === 'RECONCILED' ? 'Stock Reconciled' : 'Reconciliation Queued for Admin Approval',
              sub: `Audit record ${item.reconciliation_number} submitted.`
            });
            refreshData();
          }}
          medicines={medicines}
          preselectedMedicine={reconMedTarget}
        />

        {/* Modal 5: Expiry Action Disposition */}
        <ExpiryActionModal
          isOpen={isExpiryActionOpen}
          onClose={() => {
            setIsExpiryActionOpen(false);
            setExpiryBatchTarget(null);
          }}
          onActionCompleted={(batchId, actionType) => {
            setStatusNotice({
              type: 'green',
              title: 'Disposition Action Executed',
              sub: `Protocol ${actionType} logged for target batch.`
            });
            refreshData();
          }}
          batch={expiryBatchTarget}
          medicineName={expiryBatchTarget?.medicine_name}
        />
      </main>
    </div>
  );
};

export default InventoryManagerWorkspace;
