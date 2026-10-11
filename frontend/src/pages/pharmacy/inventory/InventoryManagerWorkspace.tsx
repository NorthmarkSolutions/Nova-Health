import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Building,
  Activity,
  DollarSign,
  UserCheck,
  Shield,
  User as UserIcon,
  KeyRound,
  X,
  ExternalLink
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
import { MyProfileModal } from './modals/MyProfileModal';
import { ChangePasswordModal } from './modals/ChangePasswordModal';

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

  // Profile Dropdown & Modal States
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMyProfileOpen, setIsMyProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
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
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileOpen]);

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

  // Active tab is medicine inventory tab
  const isMedicineTab = activeTab === 'dash' || activeTab === 'ledger' || activeTab === 'master';

  // Extract compact card fields for whatever item is in activeItems
  const getItemDetails = useCallback((item: any) => {
    switch (activeTab) {
      case 'dash': {
        const code = item.code || item.item_code;
        const med = medicines.find((m) => m.item_code === code) || (item.batches ? (item as MedicineItem) : null);
        const strength = med?.strength;
        const displayName = strength && !item.name.toLowerCase().includes(strength.toLowerCase())
          ? `${item.name} ${strength}`
          : item.name;
        const stock = item.in_stock !== undefined ? item.in_stock : (item.available_stock || 0);
        const par = item.reorder_level || (med ? med.reorder_level : 0);
        const hasExp = (med?.batches || item.batches || []).some((b: any) => b.months_left !== undefined && b.months_left <= 3);
        const isExpSoon = item.status === 'Expiring soon' || hasExp;
        const openPr = item.open_pr_id;
        let b: { bg: string; fg: string; bd: string; text: string };
        if (stock === 0) b = { ...B.red, text: 'Critical · Out of Stock' };
        else if (stock < par && !openPr) b = { ...B.red, text: 'Urgent · No PR Raised' };
        else if (stock < par) b = { ...B.amber, text: 'Warning · Low Stock' };
        else if (isExpSoon) b = { ...B.amber, text: 'Urgent · Expiring ≤90d' };
        else b = { ...B.green, text: 'In Stock' };
        return {
          key: item.id || code,
          title: displayName,
          badge: b,
          sub: `${code} · ${item.generic || item.category || 'Formulary'}`,
          metric: `${stock} in stock`,
          metricColor: stock === 0 ? '#dc2626' : stock < par ? '#b45309' : '#15803d',
          par: par > 0 ? `Min: ${par}` : undefined,
        };
      }
      case 'master': {
        const schedBadge = getScheduleBadge(item.schedule, item.is_narcotic);
        return {
          key: item.id || item.item_code,
          title: item.name,
          badge: schedBadge,
          sub: `${item.item_code} · ${item.generic_name || item.category || 'General'}`,
          metric: `${item.available_stock} ${item.unit_of_measure || 'units'}`,
          metricColor: item.available_stock < item.reorder_level ? '#b45309' : '#111827',
          par: item.reorder_level > 0 ? `Par: ${item.reorder_level}` : undefined,
        };
      }
      case 'ledger': {
        const stock = item.available_stock !== undefined ? item.available_stock : (item.in_stock || 0);
        const par = item.reorder_level || 0;
        const stBadge = getMedicineStatusBadge({ available_stock: stock, reorder_level: par });
        return {
          key: item.id || item.item_code,
          title: item.name,
          badge: stBadge,
          sub: `${item.item_code} · ${item.storage_rack || 'Rack A-01'}`,
          metric: `${stock} in stock`,
          metricColor: stock === 0 ? '#dc2626' : stock < par ? '#b45309' : '#15803d',
          par: par > 0 ? `Par: ${par}` : undefined,
        };
      }
      case 'batch': {
        return {
          key: item.id || item.batch_number,
          title: item.medicine_name,
          badge: getBatchStatusBadge(item),
          sub: `Batch #${item.batch_number} · Exp: ${formatDateMonth(item.expiry_date)}`,
          metric: `${item.available_quantity} units`,
          metricColor: item.available_quantity === 0 ? '#dc2626' : '#111827',
          par: item.storage_location || undefined,
        };
      }
      case 'expiry': {
        const isExp = item.months_left <= 0;
        const isCrit = item.months_left <= 1;
        const badge = isExp
          ? { ...B.red, text: 'Expired' }
          : isCrit
          ? { ...B.red, text: '≤ 30 Days' }
          : { ...B.amber, text: `≤ ${item.months_left * 30}d` };
        return {
          key: item.id || item.batch_number,
          title: item.medicine_name,
          badge,
          sub: `Batch #${item.batch_number} · ${isExp ? 'Expired' : `${item.months_left} mo left`}`,
          metric: `${item.available_quantity} units`,
          metricColor: '#dc2626',
          par: item.storage_location || undefined,
        };
      }
      case 'dead': {
        return {
          key: item.id || item.item_code,
          title: item.name,
          badge: item.recommendation === 'BUYBACK_RETURN' ? { ...B.red, text: 'Buyback' } : { ...B.blue, text: item.recommendation || 'Transfer' },
          sub: `${item.item_code} · ${item.days_without_movement}d inactive`,
          metric: `${item.units_in_stock} u (${formatINR(item.total_valuation)})`,
          metricColor: '#b91c1c',
          par: undefined,
        };
      }
      case 'adj': {
        return {
          key: item.id || item.adjustment_number,
          title: item.medicine_name,
          badge: item.quantity_delta < 0 ? { ...B.red, text: 'Scrap/Loss' } : { ...B.green, text: 'Surplus' },
          sub: `${item.adjustment_number} · Batch: ${item.batch_number}`,
          metric: `${item.quantity_delta > 0 ? `+${item.quantity_delta}` : item.quantity_delta} units`,
          metricColor: item.quantity_delta < 0 ? '#dc2626' : '#15803d',
          par: item.reason,
        };
      }
      case 'recon': {
        return {
          key: item.id || item.reconciliation_number,
          title: item.medicine_name,
          badge: item.status === 'RECONCILED' ? { ...B.green, text: 'Verified' } : { ...B.amber, text: 'Approval Req' },
          sub: `${item.reconciliation_number} · Batch: ${item.batch_number}`,
          metric: `Var: ${item.variance_units > 0 ? `+${item.variance_units}` : item.variance_units} u`,
          metricColor: item.variance_units === 0 ? '#15803d' : '#dc2626',
          par: formatINR(Math.abs(item.variance_value)),
        };
      }
      case 'fc': {
        return {
          key: item.id || item.item_code,
          title: item.name,
          badge: getForecastRiskBadge(item.risk_level),
          sub: `${item.item_code} · Burn: ${item.daily_burn_rate} u/d`,
          metric: `${item.days_of_stock_remaining}d cover`,
          metricColor: item.days_of_stock_remaining < 7 ? '#dc2626' : item.days_of_stock_remaining < 14 ? '#b45309' : '#15803d',
          par: `Reorder: ${item.suggested_reorder_quantity}`,
        };
      }
      case 'pr': {
        return {
          key: item.id || item.pr_number,
          title: item.medicine_name,
          badge: getPRBadge(item.status),
          sub: `${item.pr_number} · ${item.supplier_name || 'Vendor'}`,
          metric: `${item.requested_quantity} u (${formatINR(item.total_estimated_value)})`,
          metricColor: '#111827',
          par: `Stage ${item.workflow_stage}/8`,
        };
      }
      case 'appr': {
        return {
          key: item.id || item.pr_number,
          title: item.medicine_name,
          badge: { ...B.amber, text: 'Pending Approval' },
          sub: `${item.pr_number} · ${item.supplier_name || 'Requisition'}`,
          metric: `${item.requested_quantity} u (${formatINR(item.total_estimated_value)})`,
          metricColor: '#b45309',
          par: `Stage ${item.workflow_stage}/8`,
        };
      }
      case 'grn': {
        return {
          key: item.id || item.grn_number,
          title: item.grn_number,
          badge: item.status === 'Posted' ? { ...B.green, text: 'Posted' } : { ...B.blue, text: 'Intake / QC' },
          sub: `${item.supplier_name} · Inv: ${item.invoice_number}`,
          metric: `${item.lines?.length || 0} lines (${formatINR(item.total_value)})`,
          metricColor: '#111827',
          par: new Date(item.received_at).toLocaleDateString(),
        };
      }
      case 'supp': {
        return {
          key: item.id || item.supplier_code,
          title: item.name,
          badge: item.is_preferred ? { ...B.blue, text: 'Preferred' } : { ...B.gray, text: item.category || 'Vendor' },
          sub: `${item.supplier_code} · Lead: ${item.lead_time_days}d`,
          metric: `★ ${item.rating || '4.8'}`,
          metricColor: '#2563eb',
          par: `${item.open_prs_count || 0} Open PRs`,
        };
      }
      case 'demand': {
        return {
          key: item.id || item.token_number,
          title: item.medicine_name,
          badge: getDemandPriorityBadge(item.priority),
          sub: `#${item.token_number} · ${item.source}`,
          metric: `${item.requested_quantity} units req`,
          metricColor: item.priority === 'STAT' ? '#dc2626' : '#111827',
          par: `${item.central_stock} in store`,
        };
      }
      case 'tr': {
        return {
          key: item.id || item.transfer_number,
          title: item.medicine_name,
          badge: item.status === 'Received' ? { ...B.green, text: 'Received' } : { ...B.amber, text: 'In Transit' },
          sub: `${item.transfer_number} · to ${item.destination}`,
          metric: `${item.quantity} units`,
          metricColor: '#111827',
          par: item.destination,
        };
      }
      case 'cd': {
        return {
          key: item.id || item.entry_number,
          title: item.medicine_name,
          badge: { ...B.red, text: `Disp: ${item.quantity_dispensed}` },
          sub: `#${item.entry_number} · Dr. ${item.prescribing_doctor_name}`,
          metric: `Bal: ${item.balance_stock_after} units`,
          metricColor: '#111827',
          par: `Batch ${item.batch_number}`,
        };
      }
      default: {
        return {
          key: item.id,
          title: item.name || 'Item',
          badge: { ...B.gray, text: 'Active' },
          sub: item.code || '',
          metric: '—',
          metricColor: '#111827',
          par: undefined,
        };
      }
    }
  }, [activeTab, medicines]);

  // Active items for current tab filtered by query and activePill
  const activeItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    switch (activeTab) {
      case 'dash': {
        return alerts.filter((item: any) => {
          const code = (item.code || item.item_code || '').toLowerCase();
          const name = (item.name || '').toLowerCase();
          const gen = (item.generic || item.generic_name || '').toLowerCase();
          if (q && !code.includes(q) && !name.includes(q) && !gen.includes(q)) return false;
          return true;
        });
      }
      case 'master':
      case 'ledger': {
        return medicines.filter((m) => {
          const code = (m.item_code || '').toLowerCase();
          const name = (m.name || '').toLowerCase();
          const gen = (m.generic_name || '').toLowerCase();
          if (q && !code.includes(q) && !name.includes(q) && !gen.includes(q)) return false;
          if (activeTab === 'master') {
            if (activePill === 'core') return m.is_core_formulary !== false;
            if (activePill === 'sch') return ['H', 'H1', 'X'].includes(m.schedule);
            if (activePill === 'cold') return m.is_cold_chain;
            if (activePill === 'archived') return m.is_archived;
          } else if (activeTab === 'ledger') {
            if (activePill === 'low') return m.available_stock < m.reorder_level && m.available_stock > 0;
            if (activePill === 'out') return m.available_stock === 0;
            if (activePill === 'cd') return m.is_narcotic || ['H1', 'X'].includes(m.schedule);
            if (activePill === 'cold') return m.is_cold_chain;
            if (activePill === 'otc') return m.schedule === 'OTC';
          }
          return true;
        });
      }
      case 'batch': {
        return batches.filter((b) => {
          const num = (b.batch_number || '').toLowerCase();
          const medName = (b.medicine_name || '').toLowerCase();
          if (q && !num.includes(q) && !medName.includes(q)) return false;
          if (activePill === 'exp3') return b.months_left <= 3;
          if (activePill === 'quar') return b.is_quarantined || b.status === 'Quarantined';
          if (activePill === 'active') return !b.is_quarantined && b.months_left > 3;
          return true;
        });
      }
      case 'expiry': {
        return expiringBatches.filter((b) => {
          const num = (b.batch_number || '').toLowerCase();
          const medName = (b.medicine_name || '').toLowerCase();
          if (q && !num.includes(q) && !medName.includes(q)) return false;
          if (activePill === 'crit') return b.months_left <= 1;
          if (activePill === 'warn') return b.months_left > 1 && b.months_left <= 3;
          if (activePill === 'exp') return b.months_left <= 0;
          return true;
        });
      }
      case 'dead': {
        return deadStock.filter((d) => {
          const code = (d.item_code || '').toLowerCase();
          const name = (d.name || '').toLowerCase();
          if (q && !code.includes(q) && !name.includes(q)) return false;
          if (activePill === 'return') return d.recommendation === 'BUYBACK_RETURN';
          if (activePill === 'transfer') return d.recommendation !== 'BUYBACK_RETURN';
          return true;
        });
      }
      case 'adj': {
        return adjustments.filter((a) => {
          const num = (a.adjustment_number || '').toLowerCase();
          const medName = (a.medicine_name || '').toLowerCase();
          const batch = (a.batch_number || '').toLowerCase();
          if (q && !num.includes(q) && !medName.includes(q) && !batch.includes(q)) return false;
          if (activePill === 'scrap') return a.quantity_delta < 0;
          if (activePill === 'surplus') return a.quantity_delta > 0;
          return true;
        });
      }
      case 'recon': {
        return reconciliations.filter((r) => {
          const num = (r.reconciliation_number || '').toLowerCase();
          const medName = (r.medicine_name || '').toLowerCase();
          const batch = (r.batch_number || '').toLowerCase();
          if (q && !num.includes(q) && !medName.includes(q) && !batch.includes(q)) return false;
          if (activePill === 'pending') return r.status === 'PENDING_ADMIN_APPROVAL';
          if (activePill === 'reconciled') return r.status === 'RECONCILED';
          return true;
        });
      }
      case 'fc': {
        return forecasting.filter((f) => {
          const code = (f.item_code || '').toLowerCase();
          const name = (f.name || '').toLowerCase();
          if (q && !code.includes(q) && !name.includes(q)) return false;
          if (activePill === 'critical') return f.risk_level === 'CRITICAL';
          if (activePill === 'warning') return f.risk_level === 'WARNING';
          if (activePill === 'healthy') return f.risk_level !== 'CRITICAL' && f.risk_level !== 'WARNING';
          return true;
        });
      }
      case 'pr': {
        return purchaseRequests.filter((p) => {
          const num = (p.pr_number || '').toLowerCase();
          const medName = (p.medicine_name || '').toLowerCase();
          const supp = (p.supplier_name || '').toLowerCase();
          if (q && !num.includes(q) && !medName.includes(q) && !supp.includes(q)) return false;
          if (activePill !== 'all' && p.status !== activePill) return false;
          return true;
        });
      }
      case 'appr': {
        const list = purchaseRequests.filter(
          (p) => ['Submitted', 'SUBMITTED', 'Pending approval', 'UNDER_REVIEW'].includes(p.status) || p.workflow_stage === 2
        );
        const targetList = list.length > 0 ? list : purchaseRequests;
        return targetList.filter((p) => {
          const num = (p.pr_number || '').toLowerCase();
          const medName = (p.medicine_name || '').toLowerCase();
          if (q && !num.includes(q) && !medName.includes(q)) return false;
          return true;
        });
      }
      case 'grn': {
        return goodsReceipts.filter((g) => {
          const num = (g.grn_number || '').toLowerCase();
          const supp = (g.supplier_name || '').toLowerCase();
          const inv = (g.invoice_number || '').toLowerCase();
          if (q && !num.includes(q) && !supp.includes(q) && !inv.includes(q)) return false;
          if (activePill === 'pending') return g.status !== 'Posted';
          if (activePill === 'posted') return g.status === 'Posted';
          return true;
        });
      }
      case 'supp': {
        return suppliers.filter((s) => {
          const code = (s.supplier_code || '').toLowerCase();
          const name = (s.name || '').toLowerCase();
          if (q && !code.includes(q) && !name.includes(q)) return false;
          if (activePill === 'preferred') return s.is_preferred;
          return true;
        });
      }
      case 'demand': {
        return demands.filter((d) => {
          const num = (d.token_number || '').toLowerCase();
          const medName = (d.medicine_name || '').toLowerCase();
          const src = (d.source || '').toLowerCase();
          if (q && !num.includes(q) && !medName.includes(q) && !src.includes(q)) return false;
          if (activePill === 'stat') return d.priority === 'STAT';
          if (activePill === 'urgent') return d.priority === 'URGENT';
          if (activePill === 'routine') return d.priority === 'ROUTINE';
          return true;
        });
      }
      case 'tr': {
        return transfers.filter((t) => {
          const num = (t.transfer_number || '').toLowerCase();
          const medName = (t.medicine_name || '').toLowerCase();
          const dest = (t.destination || '').toLowerCase();
          if (q && !num.includes(q) && !medName.includes(q) && !dest.includes(q)) return false;
          if (activePill === 'transit') return t.status !== 'Received';
          if (activePill === 'received') return t.status === 'Received';
          return true;
        });
      }
      case 'cd': {
        return controlledDrugs.filter((c) => {
          const num = (c.entry_number || '').toLowerCase();
          const medName = (c.medicine_name || '').toLowerCase();
          const batch = (c.batch_number || '').toLowerCase();
          const doc = (c.prescribing_doctor_name || '').toLowerCase();
          if (q && !num.includes(q) && !medName.includes(q) && !batch.includes(q) && !doc.includes(q)) return false;
          return true;
        });
      }
      default:
        return medicines;
    }
  }, [
    activeTab,
    query,
    activePill,
    alerts,
    medicines,
    batches,
    expiringBatches,
    deadStock,
    adjustments,
    reconciliations,
    forecasting,
    purchaseRequests,
    goodsReceipts,
    suppliers,
    demands,
    transfers,
    controlledDrugs,
  ]);

  // Unified single-selection resolution: guarantees exactly 1 selected item
  const selectedItem = useMemo(() => {
    if (!activeItems || activeItems.length === 0) return null;
    if (selectedId) {
      const match = activeItems.find((item: any) => {
        const d = getItemDetails(item);
        return (
          d.key === selectedId ||
          item.id === selectedId ||
          item.item_code === selectedId ||
          item.code === selectedId ||
          item.batch_number === selectedId ||
          item.pr_number === selectedId ||
          item.grn_number === selectedId ||
          item.token_number === selectedId ||
          item.transfer_number === selectedId ||
          item.entry_number === selectedId ||
          item.reconciliation_number === selectedId ||
          item.adjustment_number === selectedId ||
          item.supplier_code === selectedId
        );
      });
      if (match) return match;
    }
    return activeItems[0];
  }, [activeItems, selectedId, getItemDetails]);

  // Unique key identifying the currently active selection
  const activeSelectionKey = useMemo(() => {
    return selectedItem ? getItemDetails(selectedItem).key : null;
  }, [selectedItem, getItemDetails]);

  // Motion: flash rows whose stock/metric changed (green up, amber down, blue new) after a refresh of the same view
  const [rowFlash, setRowFlash] = useState<Record<string, 'up' | 'down' | 'new'>>({});
  const rowSnapshotRef = useRef<{ ctx: string; metrics: Map<string, string> } | null>(null);
  useEffect(() => {
    const ctx = `${activeTab}|${activePill}|${query}`;
    const metrics = new Map<string, string>();
    activeItems.forEach((item: any) => {
      const d = getItemDetails(item);
      metrics.set(String(d.key), String(d.metric ?? ''));
    });
    const prev = rowSnapshotRef.current;
    rowSnapshotRef.current = { ctx, metrics };
    if (!prev || prev.ctx !== ctx || prev.metrics.size === 0) return;
    const changed: Record<string, 'up' | 'down' | 'new'> = {};
    metrics.forEach((metric, key) => {
      const before = prev.metrics.get(key);
      if (before === undefined) { changed[key] = 'new'; return; }
      if (before === metric) return;
      const a = parseFloat(before.replace(/[^0-9.-]/g, ''));
      const b = parseFloat(metric.replace(/[^0-9.-]/g, ''));
      changed[key] = !Number.isNaN(a) && !Number.isNaN(b) && b < a ? 'down' : 'up';
    });
    if (Object.keys(changed).length === 0) return;
    setRowFlash(changed);
    const t = window.setTimeout(() => setRowFlash({}), 1500);
    return () => window.clearTimeout(t);
  }, [activeItems, getItemDetails, activeTab, activePill, query]);

  // Motion: fade the inspection drawer when the selection changes (no remount, keeps focus)
  const inspectionPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = inspectionPanelRef.current;
    if (!el || !activeSelectionKey || typeof el.animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    el.animate([{ opacity: 0.55, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 160, easing: 'ease-out' });
  }, [activeSelectionKey, activeTab]);

  // Keep selected row visible and accessible in list viewport
  useEffect(() => {
    if (activeSelectionKey) {
      const el = document.getElementById(`compact-item-${activeSelectionKey}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [activeSelectionKey]);

  // Selected item references for Right Context Drawers (strictly synchronized with selectedItem)
  const selectedMedicine = useMemo(() => {
    if (!selectedItem) return medicines[0] || null;
    const it = selectedItem as any;
    if (activeTab === 'dash') {
      const found = medicines.find((m) => m.item_code === it.code || m.id === it.id);
      if (found) return found;
      return {
        id: it.id,
        item_code: it.code || it.item_code,
        name: it.name,
        generic_name: it.generic || it.generic_name,
        category: it.category,
        schedule: it.schedule,
        therapeutic_class: null,
        strength: null,
        unit_of_measure: 'units',
        unit_price: it.unit_price,
        cost_price: it.unit_price,
        reorder_level: it.reorder_level,
        reorder_quantity: (it.reorder_level || 0) * 2,
        is_narcotic: !!it.is_narcotic,
        is_cold_chain: !!it.is_cold_chain,
        available_stock: it.in_stock ?? it.available_stock ?? 0,
        supplier_name: null,
        active_pr: it.open_pr_id ? { id: it.open_pr_id, pr_number: 'PR-AUTO', status: 'Pending Review', stage: 2, qty: 100 } : null,
        batches: []
      } as MedicineItem;
    }
    if (activeTab === 'ledger' || activeTab === 'master') {
      return it as MedicineItem;
    }
    if (activeTab === 'batch' || activeTab === 'expiry') {
      const found = medicines.find((m) => m.name?.toLowerCase() === it.medicine_name?.toLowerCase() || m.item_code === it.item_code);
      return found || medicines[0] || null;
    }
    if (activeTab === 'dead' || activeTab === 'fc') {
      const found = medicines.find((m) => m.item_code === it.item_code || m.id === (it.medicine_id || it.id));
      return found || medicines[0] || null;
    }
    if (activeTab === 'recon') {
      const found = medicines.find((m) => m.name?.toLowerCase() === it.medicine_name?.toLowerCase() || m.id === it.medicine_id);
      return found || medicines[0] || null;
    }
    if (activeTab === 'pr' || activeTab === 'appr') {
      const found = medicines.find((m) => m.id === it.medicine_id || m.name?.toLowerCase() === it.medicine_name?.toLowerCase());
      return found || medicines[0] || null;
    }
    if (activeTab === 'grn') {
      if (it.lines && it.lines[0]) {
        const found = medicines.find((m) => m.item_code === it.lines[0].medicine_code || m.name?.toLowerCase() === it.lines[0].medicine_name?.toLowerCase());
        if (found) return found;
      }
      return medicines[0] || null;
    }
    if (activeTab === 'adj' || activeTab === 'tr' || activeTab === 'cd') {
      const found = medicines.find((m) => m.name?.toLowerCase() === it.medicine_name?.toLowerCase() || m.item_code === it.medicine_code || m.id === it.medicine);
      return found || medicines[0] || null;
    }
    return medicines.find((m) => m.item_code === it.item_code || m.id === it.id) || medicines[0] || null;
  }, [activeTab, selectedItem, medicines]);

  const selectedDemand = useMemo(() => {
    if (activeTab === 'demand' && selectedItem) return selectedItem as DemandItem;
    return demands.find((d) => d.id === selectedId || d.token_number === selectedId) || demands[0] || null;
  }, [activeTab, selectedItem, selectedId, demands]);

  const selectedBatch = useMemo(() => {
    if ((activeTab === 'batch' || activeTab === 'expiry') && selectedItem) return selectedItem as BatchItem;
    const list = activeTab === 'expiry' ? expiringBatches : batches;
    return list.find((b) => b.batch_number === selectedId || b.id === selectedId) || list[0] || null;
  }, [activeTab, selectedItem, selectedId, batches, expiringBatches]);

  const selectedPR = useMemo(() => {
    if ((activeTab === 'pr' || activeTab === 'appr') && selectedItem) return selectedItem as PurchaseRequestItem;
    return purchaseRequests.find((p) => p.id === selectedId || p.pr_number === selectedId) || purchaseRequests[0] || null;
  }, [activeTab, selectedItem, selectedId, purchaseRequests]);

  const selectedGRN = useMemo(() => {
    if (activeTab === 'grn' && selectedItem) return selectedItem as GoodsReceiptItem;
    return goodsReceipts.find((g) => g.id === selectedId || g.grn_number === selectedId) || goodsReceipts[0] || null;
  }, [activeTab, selectedItem, selectedId, goodsReceipts]);

  const selectedSupplier = useMemo(() => {
    if (activeTab === 'supp' && selectedItem) return selectedItem as SupplierItem;
    return suppliers.find((s) => s.supplier_code === selectedId || s.id === selectedId) || suppliers[0] || null;
  }, [activeTab, selectedItem, selectedId, suppliers]);

  const selectedAdj = useMemo(() => {
    if (activeTab === 'adj' && selectedItem) return selectedItem as StockAdjustmentItem;
    return adjustments.find((a) => a.id === selectedId || a.adjustment_number === selectedId) || adjustments[0] || null;
  }, [activeTab, selectedItem, selectedId, adjustments]);

  const selectedTransfer = useMemo(() => {
    if (activeTab === 'tr' && selectedItem) return selectedItem as TransferRequestItem;
    return transfers.find((t) => t.id === selectedId || t.transfer_number === selectedId) || transfers[0] || null;
  }, [activeTab, selectedItem, selectedId, transfers]);

  const selectedCD = useMemo(() => {
    if (activeTab === 'cd' && selectedItem) return selectedItem as ControlledDrugItem;
    return controlledDrugs.find((c) => c.id === selectedId || c.entry_number === selectedId) || controlledDrugs[0] || null;
  }, [activeTab, selectedItem, selectedId, controlledDrugs]);

  const selectedDeadStock = useMemo(() => {
    if (activeTab === 'dead' && selectedItem) return selectedItem as DeadStockItem;
    return deadStock.find((d) => d.id === selectedId || d.item_code === selectedId) || deadStock[0] || null;
  }, [activeTab, selectedItem, selectedId, deadStock]);

  const selectedForecasting = useMemo(() => {
    if (activeTab === 'fc' && selectedItem) return selectedItem as ForecastingItem;
    return forecasting.find((f) => f.id === selectedId || f.item_code === selectedId) || forecasting[0] || null;
  }, [activeTab, selectedItem, selectedId, forecasting]);

  const selectedRecon = useMemo(() => {
    if (activeTab === 'recon' && selectedItem) return selectedItem as ReconciliationItem;
    return reconciliations.find((r) => r.id === selectedId || r.reconciliation_number === selectedId) || reconciliations[0] || null;
  }, [activeTab, selectedItem, selectedId, reconciliations]);

  // Pill styling helper for wrapping chips
  const getPillStyle = (isActive: boolean) => ({
    height: '32px',
    padding: '0 12px',
    borderRadius: '9999px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    background: isActive ? '#2563eb' : '#ffffff',
    color: isActive ? '#ffffff' : '#374151',
    border: `1px solid ${isActive ? '#2563eb' : '#e5e7eb'}`,
    outline: 'none',
    transition: 'all 0.15s ease',
  });

  return (
    <div className="inv-root" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#f9fafb', fontFamily: "'Inter', sans-serif" }}>
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
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
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
          .med-compact-row {
            transition: background-color 0.15s ease, border-color 0.15s ease;
            outline: none;
          }
          .med-compact-row:hover:not(.med-selected) {
            background-color: #f8fafc !important;
          }
          .med-compact-row:focus-visible,
          [role="button"]:focus-visible {
            outline: 2px solid #2563eb !important;
            outline-offset: -2px;
          }
          .med-compact-scroll::-webkit-scrollbar {
            width: 5px;
          }
          .med-compact-scroll::-webkit-scrollbar-track {
            background: #f8fafc;
          }
          .med-compact-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .med-compact-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          @keyframes hms-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
          @keyframes hms-pop { from { opacity: 0; transform: scale(0.98) translateY(-2px); } to { opacity: 1; transform: none; } }
          @keyframes hms-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
          @keyframes hms-flash-up { 0%, 35% { background-color: #dcfce7; } 100% { background-color: transparent; } }
          @keyframes hms-flash-down { 0%, 35% { background-color: #fef3c7; } 100% { background-color: transparent; } }
          @keyframes hms-flash-new { 0%, 45% { background-color: #dbeafe; } 100% { background-color: transparent; } }
          @keyframes hms-pulse-once { 0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.35); } 100% { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); } }
          .hms-fade-in { animation: hms-fade-in 160ms ease-out both; }
          .hms-pop { animation: hms-pop 150ms ease-out both; transform-origin: top right; }
          .hms-kpi { transition: transform 150ms ease-out, box-shadow 150ms ease-out, border-color 150ms ease-out !important; }
          .hms-kpi:hover, .hms-kpi:focus-visible { transform: translateY(-1px); box-shadow: 0 6px 16px -6px rgba(15, 23, 42, 0.14) !important; border-color: #bfdbfe !important; }
          .hms-kpi:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
          .hms-chev { transition: transform 150ms ease-out; }
          .hms-skel { display: inline-block; border-radius: 6px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%); background-size: 400% 100%; animation: hms-shimmer 1.4s ease infinite; }
          .med-compact-row.hms-flash-up { animation: hms-flash-up 1.2s ease-out; }
          .med-compact-row.hms-flash-down { animation: hms-flash-down 1.2s ease-out; }
          .med-compact-row.hms-flash-new { animation: hms-flash-new 1.4s ease-out; }
          .hms-pulse-once { animation: hms-pulse-once 900ms ease-out 2; }
          .inv-root button { transition: transform 120ms ease-out, box-shadow 150ms ease-out, filter 150ms ease-out, background-color 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out; }
          .inv-root button:not(:disabled):not(.pharmacy-nav-item):not(.pharmacy-group-header):hover { transform: translateY(-1px); box-shadow: 0 4px 10px -4px rgba(15, 23, 42, 0.18); filter: brightness(0.97); }
          .inv-root button:not(:disabled):active { transform: translateY(0) scale(0.97) !important; box-shadow: none; filter: brightness(0.92); transition-duration: 60ms; }
          .inv-root button:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
          .inv-root button:disabled { cursor: not-allowed; }
          .inv-root button svg { transition: transform 200ms ease-out; }
          .inv-root button:not(:disabled):hover svg.lucide-plus { transform: rotate(90deg); }
          .inv-root button:not(:disabled):hover svg.lucide-refresh-cw, .inv-root button:not(:disabled):hover svg.lucide-rotate-cw { transform: rotate(180deg); }
          .inv-root button:not(:disabled):hover svg.lucide-download { transform: translateY(2px); }
          .inv-root button:not(:disabled):hover svg.lucide-arrow-right, .inv-root button:not(:disabled):hover svg.lucide-chevron-right, .inv-root button:not(:disabled):hover svg.lucide-send { transform: translateX(2px); }
          .inv-root button.pharmacy-nav-item:not(:disabled):hover svg { transform: scale(1.08); }
          @media (prefers-reduced-motion: reduce) {
            .hms-fade-in, .hms-pop, .hms-skel, .hms-pulse-once, .med-compact-row.hms-flash-up, .med-compact-row.hms-flash-down, .med-compact-row.hms-flash-new { animation: none !important; }
            .hms-kpi, .hms-chev, .pharmacy-nav-item, .med-compact-row { transition: none !important; }
            .inv-root button, .inv-root button svg { transition: none !important; transform: none !important; }
            .hms-kpi:hover, .hms-kpi:focus-visible { transform: none; }
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

        {/* Working Location & Operating Role Block */}
        <div
          style={{
            margin: '12px 14px 8px',
            padding: '14px 16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Where the user is working */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Working Location
              </span>
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
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Pharmacy Central Medical Store</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <span>Block B, Basement · Main Vault</span>
            </div>
          </div>

          {/* Which role they are operating as */}
          <div
            style={{
              paddingTop: '8px',
              borderTop: '1px dashed #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Operating As
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
                  letterSpacing: '0.03em',
                }}
              >
                ACTIVE
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                {role === RoleType.INVENTORY_MANAGER ? 'Inventory Manager' : (role ? role.replace(/_/g, ' ') : 'Inventory Manager')}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Badge ID: IM-2207 · Store Custodian
            </div>
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
                    <ChevronDown size={13} color="#94a3b8" className="hms-chev" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none' }} />
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="hms-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
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
                  gap: '8px',
                  height: '40px',
                  padding: '0 14px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#4b5563',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={16} />
                HMS Admin
              </button>
            )}
            <button
              onClick={() => navigate('/pharmacy/opd')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                height: '40px',
                padding: '0 14px',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#2563eb',
                background: '#eff6ff',
                cursor: 'pointer',
              }}
            >
              <Pill size={16} />
              OPD Dispense Counter
            </button>
            <button
              type="button"
              onClick={refreshData}
              title="Click to refresh inventory cache"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                height: '40px',
                padding: '0 14px',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                background: '#ffffff',
                fontSize: '14px',
                color: '#374151',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              <Clock size={16} /> Last stock sync · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </button>

            <div style={{ width: '1px', height: '20px', background: '#e5e7eb', margin: '0 2px' }} />

            {/* Profile Dropdown Trigger */}
            <div style={{ position: 'relative' }} ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                aria-expanded={isProfileOpen}
                title="Account Profile & Settings"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  height: '44px',
                  padding: '0 12px 0 6px',
                  background: isProfileOpen ? '#f1f5f9' : '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
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
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1.5px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>

                {/* Name & Role */}
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.25 }}>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#0f172a',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {displayName}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Inventory Manager
                  </span>
                </div>

                <ChevronDown
                  size={16}
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
                  className="hms-pop"
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
                          {user?.email || ''}
                        </div>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '6px',
                            fontSize: '12px',
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
                        fontSize: '14px',
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
                        fontSize: '14px',
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
                        logout();
                        navigate('/login');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        fontSize: '14px',
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
                  fontSize: '14px',
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
                  fontSize: '14px',
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
                  fontSize: '14px',
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
                  fontSize: '14px',
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
                  fontSize: '14px',
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
                {/* Card 1: Total Master SKUs & Valuation */}
                <div role="button" tabIndex={0} className="hms-kpi" onClick={() => updateURL('master')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateURL('master'); } }} style={cardStyle}>
                  <div style={headerStyle}>
                    <span style={labelStyle}>Total Master SKUs</span>
                    <span style={neutralTagStyle}>
                      {formatINR(kpis?.total_valuation || 0)}
                    </span>
                  </div>
                  <div style={metricRowStyle}>
                    <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                      {loading && !kpis ? <span className="hms-skel" aria-label="Loading" style={{ width: '64px', height: '28px' }} /> : medicines.length || kpis?.total_skus || 0}
                    </span>
                    <span style={subtextStyle}>catalog items</span>
                  </div>
                </div>

                {/* Card 2: Stock Deficits & Out of Stock */}
                <div role="button" tabIndex={0} className="hms-kpi" onClick={() => updateURL('ledger', '', 'low')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateURL('ledger', '', 'low'); } }} style={cardStyle}>
                  <div style={headerStyle}>
                    <span style={labelStyle}>Stock Deficits</span>
                    <span className={outOfStockCount > 0 ? 'hms-pulse-once' : undefined} style={outOfStockCount > 0 ? urgentRedTagStyle : neutralTagStyle}>
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
                      {loading && !kpis ? <span className="hms-skel" aria-label="Loading" style={{ width: '64px', height: '28px' }} /> : kpis?.low_stock_count || 0}
                    </span>
                    <span style={subtextStyle}>below threshold</span>
                  </div>
                </div>

                {/* Card 3: Expiring Batches */}
                <div role="button" tabIndex={0} className="hms-kpi" onClick={() => updateURL('expiry')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateURL('expiry'); } }} style={cardStyle}>
                  <div style={headerStyle}>
                    <span style={labelStyle}>Expiring Batches</span>
                    <span className={expiringThisMonthCount > 0 ? 'hms-pulse-once' : undefined} style={expiringThisMonthCount > 0 ? urgentRedTagStyle : neutralTagStyle}>
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
                      {loading && !kpis ? <span className="hms-skel" aria-label="Loading" style={{ width: '64px', height: '28px' }} /> : kpis?.expiring_batches_count || batches.filter(b => b.months_left <= 3).length || 0}
                    </span>
                    <span style={subtextStyle}>quarantine / FEFO queue</span>
                  </div>
                </div>

                {/* Card 4: Pending Demands & Ward Indents */}
                <div role="button" tabIndex={0} className="hms-kpi" onClick={() => updateURL('demand')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateURL('demand'); } }} style={cardStyle}>
                  <div style={headerStyle}>
                    <span style={labelStyle}>Pending Demands</span>
                    <span className={statDemandsCount > 0 ? 'hms-pulse-once' : undefined} style={statDemandsCount > 0 ? urgentRedTagStyle : neutralTagStyle}>
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
                      {loading && !kpis ? <span className="hms-skel" aria-label="Loading" style={{ width: '64px', height: '28px' }} /> : demands.filter(d => d.status === 'PENDING_TRANSFER').length}
                    </span>
                    <span style={subtextStyle}>ward & ICU indents</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 3. MASTER-DETAIL: Left box ~30% (min 340px) · Right box ~70% (HMS bible 19.6) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(340px, 1fr) minmax(0, 2.3fr)',
              gap: '16px',
              alignItems: 'start',
              width: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
            }}
          >
            {/* LEFT BOX: list with the important information only */}
            <div
              style={{
                width: '100%',
                minWidth: 0,
                maxWidth: '100%',
                boxSizing: 'border-box',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header Filters & Search */}
              <div style={{ padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'stretch',
                    gap: '10px',
                    flexWrap: 'nowrap',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                        {activeTab === 'dash'
                          ? 'Action Alerts'
                          : activeTab === 'master'
                          ? 'Formulary Master'
                          : activeTab === 'ledger'
                          ? 'Stock Ledger'
                          : activeTab === 'batch'
                          ? 'Batch Management'
                          : activeTab === 'expiry'
                          ? 'Expiry Monitoring'
                          : activeTab === 'dead'
                          ? 'Dead Stock (> 180 Days)'
                          : activeTab === 'recon'
                          ? 'Physical Reconciliation'
                          : activeTab === 'fc'
                          ? 'Demand Forecasting'
                          : activeTab === 'pr'
                          ? 'Purchase Requests'
                          : activeTab === 'appr'
                          ? 'Pending Approvals'
                          : activeTab === 'grn'
                          ? 'Purchase Receipts (GRN)'
                          : activeTab === 'supp'
                          ? 'Suppliers Directory'
                          : activeTab === 'demand'
                          ? 'Department Demand Hub'
                          : activeTab === 'tr'
                          ? 'Transfer Requests'
                          : 'Controlled Drug Register'}
                      </h2>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#2563eb',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          padding: '1px 8px',
                          borderRadius: '9999px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {(() => {
                          if (activeTab === 'dash') return `${alerts.length} Alerts`;
                          if (activeTab === 'master') return `${medicines.length} SKUs`;
                          if (activeTab === 'ledger') return `${medicines.length} Items`;
                          if (activeTab === 'batch') return `${batches.length} Batches`;
                          if (activeTab === 'expiry') return `${expiringBatches.length} Expiring`;
                          if (activeTab === 'dead') return `${deadStock.length} Items`;
                          if (activeTab === 'adj') return `${adjustments.length} Adjustments`;
                          if (activeTab === 'recon') return `${reconciliations.length} Audits`;
                          if (activeTab === 'fc') return `${forecasting.length} Forecasts`;
                          if (activeTab === 'pr') return `${purchaseRequests.length} PRs`;
                          if (activeTab === 'appr') return `${purchaseRequests.filter(p => ['Submitted', 'SUBMITTED', 'Pending approval', 'UNDER_REVIEW'].includes(p.status) || p.workflow_stage === 2).length} Pending`;
                          if (activeTab === 'grn') return `${goodsReceipts.length} GRNs`;
                          if (activeTab === 'supp') return `${suppliers.length} Suppliers`;
                          if (activeTab === 'demand') return `${demands.length} Demands`;
                          if (activeTab === 'tr') return `${transfers.length} Transfers`;
                          if (activeTab === 'cd') return `${controlledDrugs.length} Entries`;
                          return `${medicines.length} SKUs`;
                        })()}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                      {activeTab === 'dash'
                        ? 'Stock deficits, ≤90d expiry risks & unraised reorders'
                        : activeTab === 'master'
                        ? 'Formulary catalog, schedule rules & core flags'
                        : activeTab === 'ledger'
                        ? 'Central store balances & batch availability'
                        : activeTab === 'batch'
                        ? 'Batch inventory with FEFO expiry queue'
                        : activeTab === 'expiry'
                        ? 'Expiring batches requiring disposition or scrap'
                        : activeTab === 'dead'
                        ? 'Zero movement >180 days: capital lockup'
                        : activeTab === 'recon'
                        ? 'Physical cycle count audit vs system records'
                        : activeTab === 'fc'
                        ? '30-day run-rate burn and cover projection'
                        : activeTab === 'pr'
                        ? 'Requisitions & purchase orders pipeline'
                        : activeTab === 'appr'
                        ? 'Requisitions awaiting admin approval'
                        : activeTab === 'grn'
                        ? 'Goods receipts intake & inspection log'
                        : activeTab === 'supp'
                        ? 'Approved vendors & delivery lead times'
                        : activeTab === 'demand'
                        ? 'Real-time patient indents from wards & OPD'
                        : activeTab === 'tr'
                        ? 'Stock movements to department counters'
                        : 'Schedule X/H1 dual-witness dispense trace'}
                    </p>
                  </div>

                  <div style={{ position: 'relative', width: '100%', minWidth: 0 }}>
                    <Search size={15} style={{ position: 'absolute', left: '11px', top: '11px', color: '#9ca3af' }} />
                    <input
                      id="med-search-input"
                      value={query}
                      onChange={(e) => updateURL(activeTab, selectedId, activePill, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown' && activeItems.length > 0) {
                          e.preventDefault();
                          const firstKey = getItemDetails(activeItems[0]).key;
                          const firstEl = document.getElementById(`compact-item-${firstKey}`);
                          if (firstEl) firstEl.focus();
                        }
                      }}
                      placeholder="Search items, code or batch"
                      style={{
                        height: '36px',
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0 12px 0 34px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: '#111827',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Filter Pills with intentional wrapping to prevent horizontal clipping & nested scrollbars */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minWidth: 0, width: '100%', marginBottom: '4px' }}>
                  {activeTab === 'dash' && (
                    <>
                      {[
                        ['all', 'All Alerts'],
                        ['out', 'Out of Stock'],
                        ['low', 'Low Stock'],
                        ['exp', 'Expiring ≤90d'],
                        ['nopr', 'No Reorder PR'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={getPillStyle(activePill === k)}
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
                          style={getPillStyle(activePill === k)}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeTab === 'ledger' && (
                    <>
                      {[
                        ['all', 'All Items'],
                        ['low', 'Low Stock'],
                        ['out', 'Out of Stock'],
                        ['cd', 'Controlled'],
                        ['cold', 'Cold Chain'],
                        ['otc', 'OTC'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={getPillStyle(activePill === k)}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeTab === 'batch' && (
                    <>
                      {[
                        ['all', 'All Batches'],
                        ['exp3', 'Expiring ≤90d'],
                        ['quar', 'Quarantined'],
                        ['active', 'Active Stock'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={getPillStyle(activePill === k)}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeTab === 'expiry' && (
                    <>
                      {[
                        ['all', 'All Expiring'],
                        ['crit', 'Critical (≤30d)'],
                        ['warn', 'Warning (≤90d)'],
                        ['exp', 'Expired'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={getPillStyle(activePill === k)}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeTab === 'dead' && (
                    <>
                      {[
                        ['all', 'All (>180d)'],
                        ['return', 'Buyback Return'],
                        ['transfer', 'Transfer Rec'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={getPillStyle(activePill === k)}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeTab === 'adj' && (
                    <>
                      {[
                        ['all', 'All Adjustments'],
                        ['scrap', 'Scrap / Loss'],
                        ['surplus', 'Surplus Intake'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={getPillStyle(activePill === k)}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeTab === 'recon' && (
                    <>
                      {[
                        ['all', 'All Audits'],
                        ['pending', 'Needs Approval'],
                        ['reconciled', 'Reconciled'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={getPillStyle(activePill === k)}
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
                        ['critical', 'Critical (<7d)'],
                        ['warning', 'Warning (<14d)'],
                        ['healthy', 'Healthy Cover'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={getPillStyle(activePill === k)}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeTab === 'pr' && (
                    <>
                      {['all', 'Draft', 'Pending approval', 'Approved', 'PO issued', 'Closed'].map(
                        (k) => (
                          <button
                            key={k}
                            onClick={() => updateURL(activeTab, selectedId, k, query)}
                            style={getPillStyle(activePill === k)}
                          >
                            {k === 'all' ? 'All' : k}
                          </button>
                        ),
                      )}
                    </>
                  )}

                  {activeTab === 'appr' && (
                    <>
                      {[
                        ['all', 'All Pending'],
                        ['stat', 'STAT Priority'],
                        ['routine', 'Routine'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={getPillStyle(activePill === k)}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeTab === 'grn' && (
                    <>
                      {[
                        ['all', 'All Receipts'],
                        ['pending', 'Intake / QC'],
                        ['posted', 'Posted'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={getPillStyle(activePill === k)}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeTab === 'supp' && (
                    <>
                      {[
                        ['all', 'All Suppliers'],
                        ['preferred', 'Preferred Vendors'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={getPillStyle(activePill === k)}
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
                        ['routine', 'Routine'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={getPillStyle(activePill === k)}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeTab === 'tr' && (
                    <>
                      {[
                        ['all', 'All Transfers'],
                        ['transit', 'In Transit'],
                        ['received', 'Received'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={getPillStyle(activePill === k)}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}

                  {activeTab === 'cd' && (
                    <>
                      {[
                        ['all', 'All Entries'],
                        ['today', 'Today'],
                        ['narcotic', 'Schedule X/H1'],
                      ].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => updateURL(activeTab, selectedId, k, query)}
                          style={getPillStyle(activePill === k)}
                        >
                          {l}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Data View: Unified Compact Row List Across ALL Screens (Vital Info Only) */}
              <div
                className="med-compact-scroll"
                style={{
                  overflowY: 'auto',
                  flex: 1,
                  maxHeight: 'calc(100vh - 290px)',
                  borderTop: '1px solid #e5e7eb',
                  minWidth: 0,
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                {loading ? (
                  <div style={{ padding: '40px 16px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                    Loading inventory records...
                  </div>
                ) : activeItems.length === 0 ? (
                  <div style={{ padding: '40px 16px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                    No items match the selected filter.
                  </div>
                ) : (
                  activeItems.map((item: any, idx: number, arr: any[]) => {
                    const details = getItemDetails(item);
                    // Strictly single-selection invariant: exactly one row is selected
                    const isSel = activeSelectionKey !== null && details.key === activeSelectionKey;

                    return (
                      <div
                        key={details.key || idx}
                        id={`compact-item-${details.key}`}
                        tabIndex={0}
                        role="button"
                        aria-selected={isSel}
                        onClick={() => updateURL(activeTab, details.key, activePill, query)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            updateURL(activeTab, details.key, activePill, query);
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            const nextIdx = Math.min(idx + 1, arr.length - 1);
                            const nextDetails = getItemDetails(arr[nextIdx]);
                            updateURL(activeTab, nextDetails.key, activePill, query);
                            const el = document.getElementById(`compact-item-${nextDetails.key}`);
                            if (el) {
                              el.focus();
                              el.scrollIntoView({ block: 'nearest' });
                            }
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            if (idx === 0) {
                              const searchEl = document.getElementById('med-search-input');
                              if (searchEl) searchEl.focus();
                            } else {
                              const prevIdx = idx - 1;
                              const prevDetails = getItemDetails(arr[prevIdx]);
                              updateURL(activeTab, prevDetails.key, activePill, query);
                              const el = document.getElementById(`compact-item-${prevDetails.key}`);
                              if (el) {
                                el.focus();
                                el.scrollIntoView({ block: 'nearest' });
                              }
                            }
                          }
                        }}
                        className={`med-compact-row ${isSel ? 'med-selected' : ''}${rowFlash[String(details.key)] ? ` hms-flash-${rowFlash[String(details.key)]}` : ''}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          padding: '11px 16px',
                          borderBottom: '1px solid #f3f4f6',
                          borderLeft: isSel ? '3px solid #2563eb' : '3px solid transparent',
                          background: isSel ? '#eff6ff' : '#ffffff',
                          cursor: 'pointer',
                          userSelect: 'none',
                          minWidth: 0,
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: isSel ? 700 : 600,
                              color: isSel ? '#1d4ed8' : '#111827',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              flex: 1,
                              minWidth: 0,
                            }}
                            title={details.title}
                          >
                            {details.title}
                          </span>
                          <span style={{ flexShrink: 0 }}>{renderBadge(details.badge)}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', minWidth: 0, gap: '8px' }}>
                          <span
                            style={{
                              color: '#6b7280',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              flex: 1,
                              minWidth: 0,
                            }}
                            title={details.sub}
                          >
                            {details.sub}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span
                              style={{
                                fontWeight: 600,
                                color: details.metricColor || '#111827',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {details.metric}
                            </span>
                            {details.par && (
                              <span style={{ color: '#6b7280', fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                {details.par}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT BOX: sticky details drawer */}
            <div
              style={{
                width: '100%',
                minWidth: 0,
                position: 'sticky',
                top: '70px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280', marginBottom: '8px' }}>
                INSPECTION · CONTEXT DETAILS
              </div>

              <div
                ref={inspectionPanelRef}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  maxHeight: 'calc(100vh - 120px)',
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

                {/* ========================================================================= */}
                {/* 1. DRAWER FOR DEPARTMENT DEMAND HUB (demand)                              */}
                {/* ========================================================================= */}
                {activeTab === 'demand' && selectedDemand ? (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                            Demand #{selectedDemand.token_number}
                          </h3>
                          {renderBadge(getDemandPriorityBadge(selectedDemand.priority))}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          Origin: <strong style={{ color: '#111827' }}>{selectedDemand.source}</strong> ({selectedDemand.encounter_type}) · Requested: <strong>{selectedDemand.requested_at}</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setDemandTransferTarget(selectedDemand);
                          setIsCreateTransferOpen(true);
                        }}
                        style={{
                          height: '40px',
                          padding: '0 16px',
                          background: selectedDemand.priority === 'STAT' ? '#dc2626' : '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <ArrowLeftRight size={16} /> Fulfill Demand Transfer
                      </button>
                    </div>

                    {/* 4-Card Metric Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Requested Qty</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{selectedDemand.requested_quantity} u</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Patient Prescribed</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Counter Stock</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: selectedDemand.counter_stock === 0 ? '#dc2626' : '#0f172a', marginTop: '4px' }}>{selectedDemand.counter_stock} u</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Satellite On-Hand</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>Central Store Stock</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>{selectedDemand.central_stock} u</div>
                        <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>Available to Dispatch</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Indent Status</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{selectedDemand.status}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Queue Priority: {selectedDemand.priority}</div>
                      </div>
                    </div>

                    {/* Clinical Details Card */}
                    <div style={{ padding: '16px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Pill size={16} color="#2563eb" /> Clinical Medication Specification
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: '#6b7280' }}>Medicine Name:</span> <strong style={{ color: '#111827' }}>{selectedDemand.medicine_name}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Medicine Code:</span> <strong style={{ fontFamily: MONO_FONT, color: '#111827' }}>{selectedDemand.medicine_code}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Prescribing Clinician:</span> <strong style={{ color: '#111827' }}>Dr. {selectedDemand.doctor_name}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Patient Name:</span> <strong style={{ color: '#111827' }}>{selectedDemand.patient_name}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                /* ========================================================================= */
                /* 2. DRAWER FOR BATCH MANAGEMENT (batch)                                    */
                /* ========================================================================= */
                ) : activeTab === 'batch' && selectedBatch ? (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                            Batch #{selectedBatch.batch_number}
                          </h3>
                          {renderBadge(getBatchStatusBadge(selectedBatch))}
                          {selectedBatch.is_quarantined && (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>
                              QUARANTINED
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          Medicine: <strong style={{ color: '#111827' }}>{selectedBatch.medicine_name || 'Item'}</strong> · Code: <strong style={{ fontFamily: MONO_FONT, color: '#111827' }}>{selectedBatch.medicine_code || '—'}</strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const med = medicines.find(m => m.id === (selectedBatch as any).medicine_id || m.item_code === selectedBatch.medicine_code || m.name === selectedBatch.medicine_name) || medicines[0];
                            setReconMedTarget(med);
                            setIsReconOpen(true);
                          }}
                          style={{
                            height: '40px',
                            padding: '0 14px',
                            background: '#ffffff',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <ClipboardCheck size={15} /> Audit Shelf Count
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpiryBatchTarget(selectedBatch);
                            setIsExpiryActionOpen(true);
                          }}
                          style={{
                            height: '40px',
                            padding: '0 14px',
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <PackageX size={15} /> Dispose / Return
                        </button>
                      </div>
                    </div>

                    {/* 4-Card Metric Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Available Units</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: selectedBatch.available_quantity === 0 ? '#dc2626' : '#0f172a', marginTop: '4px' }}>
                          {selectedBatch.available_quantity} u
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Initial: {selectedBatch.initial_quantity} u</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: selectedBatch.months_left <= 3 ? '#fef2f2' : '#f8fafc', border: `1px solid ${selectedBatch.months_left <= 3 ? '#fecaca' : '#e2e8f0'}` }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: selectedBatch.months_left <= 3 ? '#dc2626' : '#64748b', textTransform: 'uppercase' }}>Expiry Window</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: selectedBatch.months_left <= 3 ? '#dc2626' : '#0f172a', marginTop: '4px' }}>
                          {formatDateMonth(selectedBatch.expiry_date)}
                        </div>
                        <div style={{ fontSize: '11px', color: selectedBatch.months_left <= 3 ? '#dc2626' : '#64748b', marginTop: '2px' }}>{selectedBatch.months_left} months remaining</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Unit Cost / Valuation</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{formatINR(selectedBatch.cost_price)}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Total: {formatINR(selectedBatch.available_quantity * selectedBatch.cost_price)}</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Storage Location</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedBatch.storage_location || 'Central Store'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Rack / Bin Slot</div>
                      </div>
                    </div>

                    {/* Batch Logistics & Compliance */}
                    <div style={{ padding: '16px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Truck size={16} color="#2563eb" /> Logistics & Quality Assurance Trace
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: '#6b7280' }}>Supplier Name:</span> <strong style={{ color: '#111827' }}>{selectedBatch.supplier_name || 'Cipla Institutional'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>GRN Inward Ref:</span> <strong style={{ fontFamily: MONO_FONT, color: '#111827' }}>{selectedBatch.grn_reference || 'GRN-DIRECT'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Cold Chain Monitored:</span> <strong style={{ color: '#111827' }}>{selectedBatch.is_cold_chain ? 'Yes (2°C - 8°C)' : 'No (Ambient)'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Dispensing Status:</span> <strong style={{ color: selectedBatch.is_quarantined ? '#dc2626' : '#15803d' }}>{selectedBatch.is_quarantined ? 'Quarantined · Blocked' : 'Active · FEFO Ready'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Footer */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                      <button
                        onClick={async () => {
                          await pharmacyInventoryService.quarantineBatch(selectedBatch.id, 'Quarantine shelf relocation');
                          setStatusNotice({ type: 'amber', title: `Batch ${selectedBatch.batch_number} Quarantined`, sub: 'Batch moved to quarantine shelf.' });
                          refreshData();
                        }}
                        style={{
                          height: '40px',
                          padding: '0 16px',
                          background: '#fffbeb',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          borderRadius: '10px',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <AlertTriangle size={15} /> Move to Quarantine
                      </button>
                    </div>
                  </div>

                /* ========================================================================= */
                /* 3. DRAWER FOR EXPIRY MONITORING (expiry)                                  */
                /* ========================================================================= */
                ) : activeTab === 'expiry' && selectedBatch ? (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                            Batch #{selectedBatch.batch_number} — Expiry Disposition
                          </h3>
                          {renderBadge(getBatchStatusBadge(selectedBatch))}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          Medicine: <strong style={{ color: '#111827' }}>{selectedBatch.medicine_name}</strong> · Location: <strong>{selectedBatch.storage_location}</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setExpiryBatchTarget(selectedBatch);
                          setIsExpiryActionOpen(true);
                        }}
                        style={{
                          height: '40px',
                          padding: '0 16px',
                          background: '#dc2626',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <PackageX size={16} /> Open Expiry Disposition Protocol
                      </button>
                    </div>

                    {/* 4-Card Metric Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase' }}>Units at Risk</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>{selectedBatch.available_quantity} u</div>
                        <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>Urgent FEFO Issue</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase' }}>Expiry Deadline</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>{formatDateMonth(selectedBatch.expiry_date)}</div>
                        <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>{selectedBatch.months_left <= 0 ? 'EXPIRED' : `${selectedBatch.months_left} months remaining`}</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Capital Value at Risk</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{formatINR(selectedBatch.available_quantity * selectedBatch.cost_price)}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>At {formatINR(selectedBatch.cost_price)}/unit</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Supplier Source</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedBatch.supplier_name || 'Vendor'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Buyback Eligible</div>
                      </div>
                    </div>

                    {/* Expiry Protocol Advisory */}
                    <div style={{ padding: '16px', borderRadius: '10px', background: selectedBatch.months_left <= 0 ? '#fef2f2' : '#fffbeb', border: `1px solid ${selectedBatch.months_left <= 0 ? '#fecaca' : '#fde68a'}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: selectedBatch.months_left <= 0 ? '#dc2626' : '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={16} /> Clinical Safety & Regulatory Advisory
                      </div>
                      <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>
                        {selectedBatch.months_left <= 0
                          ? 'This batch has officially expired. Dispensing from this batch is strictly blocked by pharmacy safety policies. Move units to quarantine immediately and log destruction certificate or vendor return credit note.'
                          : `This batch is due to expire within ${selectedBatch.months_left * 30} days. Prioritise for immediate inpatient issue under strict FEFO protocols, or arrange vendor return before the final cut-off.`}
                      </div>
                    </div>
                  </div>

                /* ========================================================================= */
                /* 4. DRAWER FOR DEAD STOCK (>180D) (dead)                                   */
                /* ========================================================================= */
                ) : activeTab === 'dead' && selectedDeadStock ? (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                            {selectedDeadStock.name}
                          </h3>
                          {renderBadge(selectedDeadStock.recommendation === 'BUYBACK_RETURN' ? { ...B.red, text: 'Vendor Buyback Return' } : selectedDeadStock.recommendation === 'NETWORK_TRANSFER' ? { ...B.blue, text: 'Inter-Branch Transfer' } : { ...B.amber, text: 'Clinical Substitution' })}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          Item Code: <strong style={{ fontFamily: MONO_FONT, color: '#111827' }}>{selectedDeadStock.item_code}</strong> · Category: <strong>{selectedDeadStock.category}</strong> · Schedule: <strong>{selectedDeadStock.schedule}</strong>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          if (selectedDeadStock.recommendation === 'NETWORK_TRANSFER') {
                            setIsCreateTransferOpen(true);
                          } else {
                            setStatusNotice({
                              type: 'blue',
                              title: `Action Initiated: ${selectedDeadStock.recommendation}`,
                              sub: `Liquidation workflow triggered for ${selectedDeadStock.units_in_stock} dormant units (${formatINR(selectedDeadStock.total_valuation)}).`
                            });
                          }
                        }}
                        style={{
                          height: '40px',
                          padding: '0 16px',
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Zap size={16} /> Execute Liquidation Recommendation
                      </button>
                    </div>

                    {/* 4-Card Metric Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase' }}>Capital Locked</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>{formatINR(selectedDeadStock.total_valuation)}</div>
                        <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>Non-performing inventory</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Units Dormant</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{selectedDeadStock.units_in_stock} u</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Cost: {formatINR(selectedDeadStock.cost_price)}/u</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#b45309', textTransform: 'uppercase' }}>Days Inactive</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>{selectedDeadStock.days_without_movement} d</div>
                        <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>Since: {selectedDeadStock.last_movement_date}</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Earliest Expiry</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{selectedDeadStock.earliest_expiry_date}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Liquidation Cut-off</div>
                      </div>
                    </div>

                    {/* Capital Liquidation Card */}
                    <div style={{ padding: '16px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={16} color="#2563eb" /> Liquidation Resolution Analysis
                      </div>
                      <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>
                        {selectedDeadStock.recommendation === 'BUYBACK_RETURN'
                          ? `Vendor procurement contract contains active buyback return clause for this SKU. Returning ${selectedDeadStock.units_in_stock} units will recover ${formatINR(selectedDeadStock.total_valuation)} in supplier credit note before expiry depreciation.`
                          : selectedDeadStock.recommendation === 'NETWORK_TRANSFER'
                          ? `Inpatient wards or network satellite centers have steady demand for this medicine. Initiating an internal transfer avoids write-off losses.`
                          : `Encourage prescribing clinicians to consider this medicine as an approved clinical substitute for routine therapy.`}
                      </div>
                    </div>
                  </div>

                /* ========================================================================= */
                /* 5. DRAWER FOR STOCK ADJUSTMENTS (adj)                                     */
                /* ========================================================================= */
                ) : activeTab === 'adj' && selectedAdj ? (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                            Adjustment #{selectedAdj.adjustment_number}
                          </h3>
                          {renderBadge(selectedAdj.status === 'Approved' ? { ...B.green, text: 'Approved' } : { ...B.amber, text: 'Pending Approval' })}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          Medicine: <strong style={{ color: '#111827' }}>{selectedAdj.medicine_name}</strong> ({selectedAdj.medicine_code}) · Batch: <strong>{selectedAdj.batch_number}</strong>
                        </div>
                      </div>

                      {selectedAdj.status !== 'Approved' && (
                        <button
                          onClick={async () => {
                            await pharmacyInventoryService.approveStockAdjustment(selectedAdj.id);
                            setStatusNotice({
                              type: 'green',
                              title: `Adjustment #${selectedAdj.adjustment_number} Approved`,
                              sub: `Central inventory adjusted by ${selectedAdj.quantity_delta} units.`
                            });
                            refreshData();
                          }}
                          style={{
                            height: '40px',
                            padding: '0 16px',
                            background: '#15803d',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Check size={16} /> Approve Stock Adjustment
                        </button>
                      )}
                    </div>

                    {/* 4-Card Metric Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '14px', borderRadius: '10px', background: selectedAdj.quantity_delta < 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${selectedAdj.quantity_delta < 0 ? '#fecaca' : '#bbf7d0'}` }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: selectedAdj.quantity_delta < 0 ? '#dc2626' : '#15803d', textTransform: 'uppercase' }}>Quantity Delta</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: selectedAdj.quantity_delta < 0 ? '#dc2626' : '#15803d', marginTop: '4px' }}>
                          {selectedAdj.quantity_delta > 0 ? `+${selectedAdj.quantity_delta}` : selectedAdj.quantity_delta} u
                        </div>
                        <div style={{ fontSize: '11px', color: selectedAdj.quantity_delta < 0 ? '#dc2626' : '#15803d', marginTop: '2px' }}>Book variance</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Value Impact</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{formatINR(selectedAdj.estimated_value)}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Ledger valuation</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Reason Code</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{selectedAdj.reason}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Operational audit</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Logged By</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedAdj.adjusted_by_name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{new Date(selectedAdj.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {/* Governance Trace */}
                    <div style={{ padding: '16px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={16} color="#2563eb" /> Audit Justification & Regulatory Status
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: '#6b7280' }}>Approver:</span> <strong style={{ color: '#111827' }}>{selectedAdj.approved_by_name || 'Pending Pharmacy Director Approval'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Schedule:</span> <strong style={{ color: '#111827' }}>Sch. {selectedAdj.medicine_schedule || 'H'}{selectedAdj.is_narcotic ? ' (Narcotic Regulated)' : ''}</strong>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <span style={{ color: '#6b7280' }}>Auditor Notes:</span> <span style={{ color: '#111827' }}>{selectedAdj.note || 'Physical count disparity reconciled with central warehouse ledger.'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                /* ========================================================================= */
                /* 6. DRAWER FOR PHYSICAL RECONCILIATION (recon)                             */
                /* ========================================================================= */
                ) : activeTab === 'recon' && selectedRecon ? (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                            Reconciliation #{selectedRecon.reconciliation_number}
                          </h3>
                          {renderBadge(selectedRecon.status === 'RECONCILED' ? { ...B.green, text: 'Verified' } : { ...B.amber, text: 'Pending Admin Approval' })}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          Medicine: <strong style={{ color: '#111827' }}>{selectedRecon.medicine_name}</strong> ({selectedRecon.medicine_code}) · Batch: <strong>{selectedRecon.batch_number}</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const med = medicines.find(m => m.id === selectedRecon.medicine_id || m.item_code === selectedRecon.medicine_code || m.name === selectedRecon.medicine_name) || medicines[0];
                          setReconMedTarget(med);
                          setIsReconOpen(true);
                        }}
                        style={{
                          height: '40px',
                          padding: '0 16px',
                          background: '#ffffff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          borderRadius: '10px',
                          fontWeight: 600,
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <RotateCcw size={15} /> Perform Cycle Re-Count
                      </button>
                    </div>

                    {/* 4-Card Metric Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>System Balance</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{selectedRecon.system_balance} u</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Ledger Recorded</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Physical Count</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{selectedRecon.physical_count} u</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Audited On Shelf</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: selectedRecon.variance_units === 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${selectedRecon.variance_units === 0 ? '#bbf7d0' : '#fecaca'}` }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: selectedRecon.variance_units === 0 ? '#15803d' : '#dc2626', textTransform: 'uppercase' }}>Variance Units</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: selectedRecon.variance_units === 0 ? '#15803d' : '#dc2626', marginTop: '4px' }}>
                          {selectedRecon.variance_units > 0 ? `+${selectedRecon.variance_units}` : selectedRecon.variance_units} u ({selectedRecon.variance_percentage}%)
                        </div>
                        <div style={{ fontSize: '11px', color: selectedRecon.variance_units === 0 ? '#15803d' : '#dc2626', marginTop: '2px' }}>Discrepancy</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Variance Value</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: selectedRecon.variance_units === 0 ? '#15803d' : '#dc2626', marginTop: '4px' }}>
                          {formatINR(Math.abs(selectedRecon.variance_value))}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Threshold: ₹1,000</div>
                      </div>
                    </div>

                    {/* Variance Breakdown Card */}
                    <div style={{ padding: '16px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ClipboardCheck size={16} color="#2563eb" /> Audit Verification Details
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: '#6b7280' }}>Reason Code:</span> <strong style={{ color: '#111827' }}>{selectedRecon.reason_code}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Audited By:</span> <strong style={{ color: '#111827' }}>{selectedRecon.performed_by_name}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Timestamp:</span> <strong style={{ color: '#111827' }}>{selectedRecon.reconciled_at}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Status:</span> <strong style={{ color: selectedRecon.status === 'RECONCILED' ? '#15803d' : '#b45309' }}>{selectedRecon.status}</strong>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <span style={{ color: '#6b7280' }}>Remarks:</span> <span style={{ color: '#111827' }}>{selectedRecon.notes || 'Routine physical shelf audit completed.'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                /* ========================================================================= */
                /* 7. DRAWER FOR DEMAND FORECASTING (fc)                                     */
                /* ========================================================================= */
                ) : activeTab === 'fc' && selectedForecasting ? (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                            {selectedForecasting.name}
                          </h3>
                          {renderBadge(getForecastRiskBadge(selectedForecasting.risk_level))}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          Item Code: <strong style={{ fontFamily: MONO_FONT, color: '#111827' }}>{selectedForecasting.item_code}</strong> · Projected Stockout: <strong style={{ color: selectedForecasting.days_of_stock_remaining < 7 ? '#dc2626' : '#111827' }}>{selectedForecasting.projected_stockout_date}</strong>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          const res = await pharmacyInventoryService.createPurchaseRequest({
                            medicine_id: selectedForecasting.medicine_id || selectedForecasting.id,
                            quantity: selectedForecasting.suggested_reorder_quantity,
                            notes: `Forecasting engine automated replenishment for ${selectedForecasting.name}`,
                          });
                          setStatusNotice({
                            type: 'green',
                            title: `Reorder PR #${res.pr_number} Drafted`,
                            sub: `Requisition created for ${res.requested_quantity} units.`
                          });
                          refreshData();
                        }}
                        style={{
                          height: '40px',
                          padding: '0 16px',
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Plus size={16} /> 1-Click Draft Reorder ({selectedForecasting.suggested_reorder_quantity} u)
                      </button>
                    </div>

                    {/* 4-Card Metric Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '14px', borderRadius: '10px', background: selectedForecasting.current_stock === 0 ? '#fef2f2' : '#f8fafc', border: `1px solid ${selectedForecasting.current_stock === 0 ? '#fecaca' : '#e2e8f0'}` }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: selectedForecasting.current_stock === 0 ? '#dc2626' : '#64748b', textTransform: 'uppercase' }}>Current Stock</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: selectedForecasting.current_stock === 0 ? '#dc2626' : '#0f172a', marginTop: '4px' }}>{selectedForecasting.current_stock} u</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Central + Satellite</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Daily Burn Rate</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{selectedForecasting.daily_burn_rate} u/d</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Monthly: {selectedForecasting.monthly_consumption_units} u</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: selectedForecasting.days_of_stock_remaining < 7 ? '#fef2f2' : '#f8fafc', border: `1px solid ${selectedForecasting.days_of_stock_remaining < 7 ? '#fecaca' : '#e2e8f0'}` }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: selectedForecasting.days_of_stock_remaining < 7 ? '#dc2626' : '#64748b', textTransform: 'uppercase' }}>Stock Cover</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: selectedForecasting.days_of_stock_remaining < 7 ? '#dc2626' : '#0f172a', marginTop: '4px' }}>
                          {selectedForecasting.days_of_stock_remaining} days
                        </div>
                        <div style={{ fontSize: '11px', color: selectedForecasting.days_of_stock_remaining < 7 ? '#dc2626' : '#64748b', marginTop: '2px' }}>Run-rate buffer</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>Suggested Reorder</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>{selectedForecasting.suggested_reorder_quantity} u</div>
                        <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>Optimised PO batch</div>
                      </div>
                    </div>

                    {/* Predictive Restocking Card */}
                    <div style={{ padding: '16px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart3 size={16} color="#2563eb" /> Consumption Velocity & Forecast Model
                      </div>
                      <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>
                        Based on rolling 30-day inpatient and outpatient dispensing records, consumption is tracking at <strong>{selectedForecasting.daily_burn_rate} units/day</strong>.
                        {selectedForecasting.days_of_stock_remaining < 7
                          ? ' CRITICAL ACTION: Lead time for supplier reorder typically exceeds current stock buffer. Expedite PR immediately to prevent care disruption.'
                          : ' Stock levels are within comfortable replenishment parameters.'}
                      </div>
                    </div>
                  </div>

                /* ========================================================================= */
                /* 8. DRAWER FOR PURCHASE REQUESTS & APPROVALS (pr / appr)                   */
                /* ========================================================================= */
                ) : (activeTab === 'pr' || activeTab === 'appr') && selectedPR ? (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                            PR #{selectedPR.pr_number}
                          </h3>
                          {renderBadge(getPRBadge(selectedPR.status))}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          Medicine: <strong style={{ color: '#111827' }}>{selectedPR.medicine_name}</strong> ({selectedPR.medicine_code}) · Created: <strong>{new Date(selectedPR.created_at).toLocaleDateString()}</strong>
                        </div>
                      </div>

                      {/* Dynamic Workflow Actions */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {selectedPR.workflow_stage === 1 && (
                          <button
                            onClick={async () => {
                              const res = await pharmacyInventoryService.transitionPR(selectedPR.id, 'submit');
                              setStatusNotice({ type: 'amber', title: `PR #${res.pr_number} Submitted`, sub: 'Forwarded for approval.' });
                              refreshData();
                            }}
                            style={{ height: '40px', padding: '0 14px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Submit for Approval
                          </button>
                        )}
                        {selectedPR.workflow_stage === 2 && (
                          <>
                            <button
                              onClick={async () => {
                                const res = await pharmacyInventoryService.transitionPR(selectedPR.id, 'approve');
                                setStatusNotice({ type: 'green', title: `PR #${res.pr_number} Approved`, sub: 'Purchase requisition approved.' });
                                refreshData();
                              }}
                              style={{ height: '40px', padding: '0 14px', background: '#15803d', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <Check size={16} /> Approve PR
                            </button>
                            <button
                              onClick={async () => {
                                const res = await pharmacyInventoryService.transitionPR(selectedPR.id, 'reject', 'Administrative rejection');
                                setStatusNotice({ type: 'red', title: `PR #${res.pr_number} Rejected`, sub: 'Requisition returned to requester.' });
                                refreshData();
                              }}
                              style={{ height: '40px', padding: '0 14px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {selectedPR.workflow_stage === 3 && (
                          <button
                            onClick={async () => {
                              const res = await pharmacyInventoryService.transitionPR(selectedPR.id, 'issue_po');
                              setStatusNotice({ type: 'blue', title: `PO #${res.purchase_order_number || 'PO-2026'} Issued`, sub: 'Purchase order transmitted to vendor.' });
                              refreshData();
                            }}
                            style={{ height: '40px', padding: '0 14px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <FileText size={16} /> Issue Purchase Order
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 4-Card Metric Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Requested Qty</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{selectedPR.requested_quantity} u</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Requisition volume</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Est. Total Value</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{formatINR(selectedPR.total_estimated_value)}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Approved budget</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#1d4ed8', textTransform: 'uppercase' }}>Workflow Stage</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#1d4ed8', marginTop: '4px' }}>Stage {selectedPR.workflow_stage}/8</div>
                        <div style={{ fontSize: '11px', color: '#1d4ed8', marginTop: '2px' }}>{selectedPR.status}</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Supplier Vendor</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedPR.supplier_name || 'Cipla Institutional'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Lead time: {selectedPR.supplier_lead_days || 3}d</div>
                      </div>
                    </div>

                    {/* Stepper Bar */}
                    <div style={{ padding: '16px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '10px' }}>Procurement Life-Cycle Progress</div>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {['Draft', 'Submitted', 'Approved', 'PO Issued', 'Dispatch', 'Receiving', 'QC Passed', 'Closed'].map((stName, idx) => {
                          const isDone = selectedPR.workflow_stage > idx + 1;
                          const isCurr = selectedPR.workflow_stage === idx + 1;
                          return (
                            <div key={stName} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div
                                style={{
                                  height: '6px',
                                  borderRadius: '9999px',
                                  background: isDone ? '#15803d' : isCurr ? '#2563eb' : '#e2e8f0',
                                }}
                              />
                              <span style={{ fontSize: '10px', color: isCurr ? '#2563eb' : isDone ? '#15803d' : '#94a3b8', fontWeight: isCurr ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {stName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Audit Details */}
                    <div style={{ padding: '16px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} color="#2563eb" /> Commercial & Audit Attributes
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: '#6b7280' }}>Requested By:</span> <strong style={{ color: '#111827' }}>{selectedPR.requested_by_name}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Approved By:</span> <strong style={{ color: '#111827' }}>{selectedPR.approved_by_name || 'Pending Review'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Purchase Order #:</span> <strong style={{ fontFamily: MONO_FONT, color: '#111827' }}>{selectedPR.purchase_order_number || 'Pending PO Generation'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Goods Receipt #:</span> <strong style={{ fontFamily: MONO_FONT, color: '#111827' }}>{selectedPR.goods_receipt_number || 'Pending Delivery'}</strong>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <span style={{ color: '#6b7280' }}>Requisition Notes:</span> <span style={{ color: '#111827' }}>{selectedPR.notes || 'Routine central pharmacy inventory restocking.'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                /* ========================================================================= */
                /* 9. DRAWER FOR PURCHASE RECEIPTS (grn)                                     */
                /* ========================================================================= */
                ) : activeTab === 'grn' && selectedGRN ? (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                            GRN #{selectedGRN.grn_number}
                          </h3>
                          {renderBadge(selectedGRN.status === 'Posted' ? { ...B.green, text: 'Posted to Ledger' } : { ...B.blue, text: 'Intake / QC Pending' })}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          Supplier: <strong style={{ color: '#111827' }}>{selectedGRN.supplier_name}</strong> · Invoice #: <strong style={{ fontFamily: MONO_FONT, color: '#111827' }}>{selectedGRN.invoice_number}</strong> · Received: <strong>{new Date(selectedGRN.received_at).toLocaleDateString()}</strong>
                        </div>
                      </div>

                      {selectedGRN.status !== 'Posted' && (
                        <button
                          onClick={async () => {
                            const res = await pharmacyInventoryService.postGoodsReceipt(selectedGRN.id, { all_passed: true });
                            setStatusNotice({
                              type: 'green',
                              title: `GRN #${res.grn_number} Posted`,
                              sub: `Stock absorbed into central store ledger (${res.total_units} units).`
                            });
                            refreshData();
                          }}
                          style={{
                            height: '40px',
                            padding: '0 16px',
                            background: '#15803d',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <PackageCheck size={16} /> Complete QC & Post to Stock Ledger
                        </button>
                      )}
                    </div>

                    {/* 4-Card Metric Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Units Received</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{selectedGRN.total_units} u</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Total shipment volume</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Invoice Total</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{formatINR(selectedGRN.total_value)}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Taxes included</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Line Items</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{selectedGRN.lines?.length || 0} lines</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Itemized batches</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>PO Reference</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedGRN.po_number || 'Direct GRN'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Procurement order</div>
                      </div>
                    </div>

                    {/* Itemized Received Lines */}
                    <div style={{ padding: '16px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ClipboardList size={16} color="#2563eb" /> Itemized Received Shipments
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                            <th style={{ padding: '8px 4px' }}>Medicine</th>
                            <th style={{ padding: '8px 4px' }}>Batch</th>
                            <th style={{ padding: '8px 4px' }}>Expiry</th>
                            <th style={{ padding: '8px 4px' }}>Qty</th>
                            <th style={{ padding: '8px 4px' }}>Cost</th>
                            <th style={{ padding: '8px 4px', textAlign: 'right' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedGRN.lines?.map((line) => (
                            <tr key={line.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '8px 4px', fontWeight: 600, color: '#111827' }}>{line.medicine_name}</td>
                              <td style={{ padding: '8px 4px', fontFamily: MONO_FONT, color: '#4b5563' }}>{line.batch_number}</td>
                              <td style={{ padding: '8px 4px', color: '#4b5563' }}>{formatDateMonth(line.expiry_date)}</td>
                              <td style={{ padding: '8px 4px', fontWeight: 600, color: '#111827' }}>{line.received_quantity} u</td>
                              <td style={{ padding: '8px 4px', color: '#4b5563' }}>{formatINR(Number(line.unit_cost))}</td>
                              <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>{formatINR(line.line_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                /* ========================================================================= */
                /* 10. DRAWER FOR SUPPLIERS DIRECTORY (supp)                                 */
                /* ========================================================================= */
                ) : activeTab === 'supp' && selectedSupplier ? (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                            {selectedSupplier.name}
                          </h3>
                          {renderBadge(selectedSupplier.is_preferred ? { ...B.blue, text: 'Preferred Vendor' } : { ...B.gray, text: selectedSupplier.category || 'Vendor' })}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          Supplier Code: <strong style={{ fontFamily: MONO_FONT, color: '#111827' }}>{selectedSupplier.supplier_code}</strong> · GSTIN: <strong>{selectedSupplier.tax_number || 'GSTIN-VERIFIED'}</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setStatusNotice({
                            type: 'blue',
                            title: `Reorder Requisition: ${selectedSupplier.name}`,
                            sub: `Initiating purchase request with preferred supplier.`
                          });
                          updateURL('pr', '', 'all');
                        }}
                        style={{
                          height: '40px',
                          padding: '0 16px',
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Plus size={16} /> Draft Reorder PR
                      </button>
                    </div>

                    {/* 4-Card Metric Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Avg Lead Time</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{selectedSupplier.lead_time_days} days</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Order to dispatch</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>On-Time Delivery</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>{selectedSupplier.on_time_delivery_rate}%</div>
                        <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>Fulfillment SLA</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Open PR Orders</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{selectedSupplier.open_prs_count || 0} PRs</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Pipeline active</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Vendor Score</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>★ {selectedSupplier.rating || '4.8'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Audited vendor</div>
                      </div>
                    </div>

                    {/* Contact & Commercial Profile */}
                    <div style={{ padding: '16px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building size={16} color="#2563eb" /> Commercial & Point of Contact
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: '#6b7280' }}>Phone Hotline:</span> <strong style={{ color: '#111827' }}>{selectedSupplier.phone}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Email Address:</span> <strong style={{ color: '#111827' }}>{selectedSupplier.email || 'orders@pharma-vendor.in'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Supplier Category:</span> <strong style={{ color: '#111827' }}>{selectedSupplier.category}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Commercial Status:</span> <strong style={{ color: '#15803d' }}>{selectedSupplier.status}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                /* ========================================================================= */
                /* 11. DRAWER FOR TRANSFER REQUESTS (tr)                                     */
                /* ========================================================================= */
                ) : activeTab === 'tr' && selectedTransfer ? (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                            Transfer #{selectedTransfer.transfer_number}
                          </h3>
                          {renderBadge(selectedTransfer.status === 'Received' ? { ...B.green, text: 'Received' } : { ...B.amber, text: 'In Transit' })}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          Medicine: <strong style={{ color: '#111827' }}>{selectedTransfer.medicine_name}</strong> ({selectedTransfer.medicine_code}) · To: <strong>{selectedTransfer.destination}</strong>
                        </div>
                      </div>

                      {selectedTransfer.status !== 'Received' && (
                        <button
                          onClick={async () => {
                            const res = await pharmacyInventoryService.receiveTransfer(selectedTransfer.id);
                            setStatusNotice({
                              type: 'green',
                              title: `Transfer #${res.transfer_number} Received`,
                              sub: `Satellite dispensary stock updated at ${res.destination}.`
                            });
                            refreshData();
                          }}
                          style={{
                            height: '40px',
                            padding: '0 16px',
                            background: '#15803d',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Check size={16} /> Acknowledge Satellite Receipt
                        </button>
                      )}
                    </div>

                    {/* 4-Card Metric Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Transfer Quantity</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{selectedTransfer.quantity} u</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Units in movement</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Destination</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedTransfer.destination}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Counter indent</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>Central Store Stock</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>{selectedTransfer.central_stock} u</div>
                        <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>Balance remaining</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Transfer Status</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{selectedTransfer.status}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Custody movement</div>
                      </div>
                    </div>

                    {/* Logistics Detail */}
                    <div style={{ padding: '16px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Truck size={16} color="#2563eb" /> Internal Movement Trace
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: '#6b7280' }}>Requested By:</span> <strong style={{ color: '#111827' }}>{selectedTransfer.requested_by_name}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Created At:</span> <strong style={{ color: '#111827' }}>{new Date(selectedTransfer.created_at).toLocaleString()}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Cold Chain Status:</span> <strong style={{ color: selectedTransfer.is_cold_chain ? '#0369a1' : '#4b5563' }}>{selectedTransfer.is_cold_chain ? 'Insulated Cold Carrier Required' : 'Standard'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Schedule:</span> <strong style={{ color: '#111827' }}>Sch. {selectedTransfer.medicine_schedule || 'H'}{selectedTransfer.is_narcotic ? ' (Narcotic Escort)' : ''}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                /* ========================================================================= */
                /* 12. DRAWER FOR CONTROLLED DRUG REGISTER (cd)                              */
                /* ========================================================================= */
                ) : activeTab === 'cd' && selectedCD ? (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                            Controlled Drug Dispense #{selectedCD.entry_number}
                          </h3>
                          {renderBadge({ ...B.red, text: 'Schedule X / H1 Narcotic' })}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          Medicine: <strong style={{ color: '#111827' }}>{selectedCD.medicine_name}</strong> ({selectedCD.medicine_code}) · Batch: <strong>{selectedCD.batch_number}</strong>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          const res = await pharmacyInventoryService.verifyCount(selectedCD.batch, selectedCD.balance_stock_after);
                          setStatusNotice({
                            type: res.matches ? 'green' : 'red',
                            title: res.matches ? 'Safe Balance Verified' : 'Count Discrepancy Flagged',
                            sub: res.message
                          });
                          refreshData();
                        }}
                        style={{
                          height: '40px',
                          padding: '0 16px',
                          background: '#ffffff',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <ShieldAlert size={16} /> Audit Safe Physical Balance
                      </button>
                    </div>

                    {/* 4-Card Metric Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase' }}>Dispensed Qty</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>{selectedCD.quantity_dispensed} u</div>
                        <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>Verified dose</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Safe Balance After</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{selectedCD.balance_stock_after} u</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Vault inventory</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Prescribing Doctor</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Dr. {selectedCD.prescribing_doctor_name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Lic: {selectedCD.doctor_license_number}</div>
                      </div>
                      <div style={{ padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Witness Staff</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedCD.witness_staff_name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{selectedCD.witness_role}</div>
                      </div>
                    </div>

                    {/* Regulatory Chain of Custody Card */}
                    <div style={{ padding: '16px', borderRadius: '10px', background: '#ffffff', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Lock size={16} color="#dc2626" /> NDPS Dual-Witness Regulatory Chain of Custody
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: '#6b7280' }}>Primary Pharmacist:</span> <strong style={{ color: '#111827' }}>{selectedCD.primary_pharmacist_name}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Mandatory Co-Sign Witness:</span> <strong style={{ color: '#111827' }}>{selectedCD.witness_staff_name} ({selectedCD.witness_role})</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Entry Timestamp:</span> <strong style={{ color: '#111827' }}>{new Date(selectedCD.created_at).toLocaleString()}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Regulatory Act:</span> <strong style={{ color: '#dc2626' }}>NDPS Schedule X Audit Standard</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                /* ========================================================================= */
                /* 13. DRAWER FOR FORMULARY MASTER / STOCK LEDGER (selectedMedicine)        */
                /* ========================================================================= */
                ) : selectedMedicine ? (
                  <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* 1. Header with Identity & Top Action Buttons */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
                              {selectedMedicine.name}
                            </h3>
                            {selectedMedicine.is_archived && (
                              <span style={{ fontSize: '10px', fontWeight: 700, color: '#991b1b', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                                ARCHIVED
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span>Item Code: <strong style={{ fontFamily: MONO_FONT, color: '#111827' }}>{selectedMedicine.item_code}</strong></span>
                            <span>·</span>
                            <span>Generic: <strong>{selectedMedicine.generic_name || 'Standard Generic'}</strong></span>
                            <span>·</span>
                            <span>Category: <strong>{selectedMedicine.category}</strong></span>
                          </div>
                        </div>

                        {/* Header Action Buttons */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingMedicine(selectedMedicine);
                              setIsAddEditMedOpen(true);
                            }}
                            style={{
                              height: '40px',
                              padding: '0 14px',
                              background: '#ffffff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              borderRadius: '10px',
                              fontSize: '14px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Edit Formulary Entry
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBatchMedTarget(selectedMedicine);
                              setIsCreateBatchOpen(true);
                            }}
                            style={{
                              height: '40px',
                              padding: '0 14px',
                              background: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '10px',
                              fontSize: '14px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            + Receive New Batch (GRN)
                          </button>
                        </div>
                      </div>

                      {/* Badges Row */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {renderBadge(getMedicineStatusBadge(selectedMedicine))}
                        {renderBadge(getScheduleBadge(selectedMedicine.schedule, selectedMedicine.is_narcotic))}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: '24px',
                            padding: '0 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            background: selectedMedicine.is_core_formulary !== false ? '#f0fdf4' : '#f1f5f9',
                            color: selectedMedicine.is_core_formulary !== false ? '#15803d' : '#64748b',
                            border: `1px solid ${selectedMedicine.is_core_formulary !== false ? '#bbf7d0' : '#cbd5e1'}`,
                          }}
                        >
                          {selectedMedicine.is_core_formulary !== false ? 'Core Formulary (EML)' : 'Non-Core'}
                        </span>
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
                          Rack: {selectedMedicine.storage_rack || 'A-01 · Ambient'}
                        </span>
                      </div>

                      {/* 2. Key Stock Metrics & Reorder Requirements (4 Stats) */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>Available Stock</div>
                          <div style={{ fontSize: '20px', fontWeight: 700, color: selectedMedicine.available_stock === 0 ? '#dc2626' : selectedMedicine.available_stock < selectedMedicine.reorder_level ? '#b45309' : '#111827', marginTop: '2px' }}>
                            {selectedMedicine.available_stock} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>{selectedMedicine.unit_of_measure}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: selectedMedicine.available_stock === 0 ? '#dc2626' : selectedMedicine.available_stock < selectedMedicine.reorder_level ? '#b45309' : '#15803d', fontWeight: 600, marginTop: '2px' }}>
                            {selectedMedicine.available_stock === 0 ? 'Out of Stock' : selectedMedicine.available_stock < selectedMedicine.reorder_level ? 'Below Reorder Par' : 'Optimal Reserve'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>Reorder Level (Par)</div>
                          <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                            {selectedMedicine.reorder_level} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>{selectedMedicine.unit_of_measure}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Reorder target: {selectedMedicine.reorder_quantity || selectedMedicine.reorder_level * 2} units
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>Stock Valuation</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                            {formatINR(selectedMedicine.available_stock * Number(selectedMedicine.unit_price || selectedMedicine.cost_price || 0))}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Unit MRP: ₹{Number(selectedMedicine.unit_price || 0).toFixed(2)}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>Procurement Pipeline</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: selectedMedicine.active_pr ? '#2563eb' : selectedMedicine.available_stock < selectedMedicine.reorder_level ? '#b45309' : '#15803d', marginTop: '4px' }}>
                            {selectedMedicine.active_pr ? selectedMedicine.active_pr.status : selectedMedicine.available_stock < selectedMedicine.reorder_level ? 'Reorder Needed' : 'Covered'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            {selectedMedicine.active_pr ? `PR #${selectedMedicine.active_pr.pr_number} (${selectedMedicine.active_pr.qty} units)` : selectedMedicine.available_stock < selectedMedicine.reorder_level ? 'No purchase request active' : 'Reserve healthy'}
                          </div>
                        </div>
                      </div>

                      {/* 3. FEFO Batches on Hand (Structured Table) */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', color: '#475569', textTransform: 'uppercase' }}>
                            FEFO Batches on Hand ({selectedMedicine.batches.length})
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBatchMedTarget(selectedMedicine);
                              setIsCreateBatchOpen(true);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#2563eb',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            + Receive Batch
                          </button>
                        </div>

                        {selectedMedicine.batches.length === 0 ? (
                          <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>No active batches currently on shelf. Central inventory is depleted.</div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setBatchMedTarget(selectedMedicine);
                                setIsCreateBatchOpen(true);
                              }}
                              style={{
                                height: '40px',
                                padding: '0 16px',
                                background: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Receive GRN
                            </button>
                          </div>
                        ) : (
                          <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(140px, 1.2fr) minmax(130px, 1fr) 90px minmax(130px, 1fr) 110px 90px',
                                alignItems: 'center',
                                height: '38px',
                                background: '#f9fafb',
                                borderBottom: '1px solid #e5e7eb',
                                fontSize: '11px',
                                fontWeight: 600,
                                letterSpacing: '0.04em',
                                color: '#64748b',
                                padding: '0 14px',
                              }}
                            >
                              <div>BATCH NUMBER</div>
                              <div>EXPIRY DATE</div>
                              <div>QUANTITY</div>
                              <div>STORAGE LOCATION</div>
                              <div>STATUS</div>
                              <div style={{ textAlign: 'right' }}>ACTION</div>
                            </div>

                            {selectedMedicine.batches.map((b, idx) => (
                              <div
                                key={b.id}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'minmax(140px, 1.2fr) minmax(130px, 1fr) 90px minmax(130px, 1fr) 110px 90px',
                                  alignItems: 'center',
                                  minHeight: '48px',
                                  padding: '0 14px',
                                  borderBottom: idx === selectedMedicine.batches.length - 1 ? 'none' : '1px solid #f3f4f6',
                                  fontSize: '13px',
                                }}
                              >
                                <div>
                                  <span style={{ fontFamily: MONO_FONT, fontWeight: 700, color: '#111827' }}>
                                    {b.batch_number}
                                  </span>
                                  {idx === 0 && (
                                    <span
                                      style={{
                                        marginLeft: '6px',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        background: '#eff6ff',
                                        color: '#1d4ed8',
                                        border: '1px solid #bfdbfe',
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                      }}
                                    >
                                      FEFO NEXT
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <div style={{ fontSize: '13px', color: b.months_left <= 3 ? '#b45309' : '#111827' }}>
                                    {formatDateMonth(b.expiry_date)}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                    {b.months_left <= 0 ? 'Expired' : `${b.months_left} mo remaining`}
                                  </div>
                                </div>

                                <div style={{ fontWeight: 700, color: '#111827' }}>
                                  {b.available_quantity}
                                </div>

                                <div style={{ fontSize: '12px', color: '#475569' }}>
                                  {b.storage_location || selectedMedicine.storage_rack || 'Main Shelf'}
                                </div>

                                <div>
                                  {renderBadge(getBatchStatusBadge(b))}
                                </div>

                                <div style={{ textAlign: 'right' }}>
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
                                      fontSize: '13px',
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
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 4. Formulary & Storage Specifications Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                        {/* Card 1: Clinical & Regulatory Specifications */}
                        <div style={{ padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', color: '#475569', textTransform: 'uppercase' }}>
                            Clinical & Regulatory Rules
                          </div>
                          <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Therapeutic Class:</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedMedicine.therapeutic_class || 'General Hospital Formulary'}</span>
                          </div>
                          <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Schedule Classification:</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>Schedule {selectedMedicine.schedule} {selectedMedicine.is_narcotic ? '(Narcotic CD)' : ''}</span>
                          </div>
                          <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Formulary Tier:</span>
                            <span style={{ fontWeight: 600, color: selectedMedicine.is_core_formulary !== false ? '#15803d' : '#64748b' }}>
                              {selectedMedicine.is_core_formulary !== false ? 'Core Hospital Formulary (EML)' : 'Non-Core / Specialized'}
                            </span>
                          </div>
                        </div>

                        {/* Card 2: Storage & Procurement Details */}
                        <div style={{ padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', color: '#475569', textTransform: 'uppercase' }}>
                            Storage & Procurement Trace
                          </div>
                          <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Storage Condition:</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>
                              {selectedMedicine.is_cold_chain ? 'Cold Chain (2°C to 8°C Refrigerator)' : 'Ambient Shelf (15°C to 25°C)'}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Preferred Supplier:</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedMedicine.supplier_name || 'Standard Contracted Vendor'}</span>
                          </div>
                          <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Physical Shelf Location:</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedMedicine.storage_rack || 'Rack A-01 · Ambient'}</span>
                          </div>
                        </div>
                      </div>

                      {/* 5. Bottom Contextual Shortcuts Toolbar */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #f1f5f9', marginTop: 'auto', flexWrap: 'wrap' }}>
                        {selectedMedicine.available_stock < selectedMedicine.reorder_level && !selectedMedicine.active_pr && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const res = await pharmacyInventoryService.createPurchaseRequest({
                                  medicine_id: selectedMedicine.id,
                                  quantity: selectedMedicine.reorder_quantity || selectedMedicine.reorder_level * 2,
                                  notes: '1-click reorder requisition from medicine inspection panel',
                                });
                                setStatusNotice({
                                  type: 'green',
                                  title: `Reorder PR #${res.pr_number} Drafted`,
                                  sub: `Purchase requisition created for ${res.requested_quantity} units.`,
                                });
                                refreshData();
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            style={{
                              height: '40px',
                              padding: '0 16px',
                              background: '#fffbeb',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              borderRadius: '10px',
                              fontSize: '14px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Draft Reorder (PR)
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReconMedTarget(selectedMedicine);
                            setIsReconOpen(true);
                          }}
                          style={{
                            height: '40px',
                            padding: '0 16px',
                            background: '#f8fafc',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Audit Shelf Count
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '60px 24px', textAlign: 'center', color: '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                        <Pill size={24} />
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>Select an item from the list</div>
                      <div style={{ fontSize: '13px', color: '#6b7280', maxWidth: '360px' }}>
                        Click any item in the left panel to inspect formulary details, live stock levels, FEFO batch queue, and procurement actions.
                      </div>
                    </div>
                  )
                }
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

        {/* Modal 6: Staff Profile Details */}
        <MyProfileModal
          isOpen={isMyProfileOpen}
          onClose={() => setIsMyProfileOpen(false)}
          user={user}
          role={role}
          displayName={displayName}
          designation={designation}
          initials={initials}
          onChangePasswordClick={() => setIsChangePasswordOpen(true)}
        />

        {/* Modal 7: Change Password */}
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          onSuccess={() => {
            setStatusNotice({
              type: 'green',
              title: 'Password Updated',
              sub: 'Account authentication password updated successfully.'
            });
          }}
        />
      </main>
    </div>
  );
};

export default InventoryManagerWorkspace;
