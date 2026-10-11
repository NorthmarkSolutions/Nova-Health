import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Store,
  Package2,
  Lock,
  Truck,
  FileText,
  Sliders,
  BarChart2,
  Calendar,
  AlertTriangle,
  XCircle,
  PackageX,
  CalendarClock,
  Clock,
  CheckCircle2,
  RotateCcw,
  ShoppingBag,
  Info,
  ShieldCheck,
  Search,
  ExternalLink,
  Filter,
  Download,
  Check,
  X,
  AlertCircle,
  Plus,
  Edit2,
  Sparkles,
  ChevronDown,
  LogOut,
  User as UserIcon,
  KeyRound,
  Building2
} from 'lucide-react';
import { PharmacyStaffModal } from './PharmacyStaffModal';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { RoleType } from '../../../types';
import { MyProfileModal } from '../inventory/modals/MyProfileModal';
import { ChangePasswordModal } from '../inventory/modals/ChangePasswordModal';
import '../shared/pharmacyMotion.css';
import {
  pharmacyAdminService,
  PharmacyAdminMetrics,
  PharmacyStaffMember,
  PharmacyDutyShift,
  PharmacyThroughputPoint,
  PharmacyInventoryHealthException,
  PharmacyControlledDrugMonitorItem,
  PharmacySupplierPerformance,
  PharmacyGovernanceAuditEntry,
  PharmacyGovernancePolicy,
  PharmacyAdminReport
} from '../../../services/pharmacyAdminService';

// Default static fallback data faithfully reflecting the mockup specifications
const DEFAULT_STAFF: PharmacyStaffMember[] = [
  { id: 'PH-4412', name: 'Arjun Varma', role: 'Pharmacist', area: 'OPD Counter 2', shift: '08:00 – 16:00', status: 'On duty', done: 62, target: 80, tat: '6.4m', ovr: 2, cd: 4, recent: ['Dispensed RX-24116 · OPD-C2', 'Override logged · Metformin conflict', 'Dispensed Tramadol · CDR-0914'] },
  { id: 'PH-4415', name: 'Sneha Nair', role: 'Pharmacist', area: 'IPD Ward 4B', shift: '08:00 – 16:00', status: 'On duty', done: 48, target: 60, tat: '7.8m', ovr: 0, cd: 6, recent: ['Issued WR-5506 to Ward 3C', 'Witnessed Morphine dispense · CDR-0911', 'Processed return RW-031'] },
  { id: 'PH-4420', name: 'Rajesh Kumar', role: 'Inventory Manager', area: 'Central Store', shift: '09:00 – 17:00', status: 'On duty', done: 34, target: 40, tat: '—', ovr: 0, cd: 2, recent: ['Stock adjustment −4 · Enoxaparin', 'GRN-4401 verified · 240 units', 'PO-9912 generated · Cipla Ltd'] },
  { id: 'TC-1102', name: 'Meghna Sengupta', role: 'Pharmacy Tech', area: 'OPD Counter 1', shift: '08:00 – 16:00', status: 'On break', done: 24, target: 50, tat: '5.9m', ovr: 0, cd: 0, recent: ['Assisted Arjun Varma · OPD-C1', 'Stocked bin A-14 · Paracetamol'] },
  { id: 'PH-4428', name: 'Divya R', role: 'Pharmacist', area: 'Emergency Satellite', shift: '16:00 – 00:00', status: 'Off shift', done: 0, target: 60, tat: '—', ovr: 0, cd: 0, recent: ['Completed night shift handover'] }
];

const DEFAULT_SHIFTS: PharmacyDutyShift[] = [
  { id: 'SH-01', slot: '08:00 – 16:00', day: 'Today', area: 'OPD Counter 1 & 2', service_point_code: 'OPD-C1', staff: ['Arjun Varma', 'Meghna Sengupta'], need: 2, status: 'Covered' },
  { id: 'SH-02', slot: '08:00 – 16:00', day: 'Today', area: 'IPD Ward Supply', service_point_code: 'IPD-01', staff: ['Sneha Nair'], need: 1, status: 'Covered' },
  { id: 'SH-03', slot: '09:00 – 17:00', day: 'Today', area: 'Central Store', service_point_code: 'STORE', staff: ['Rajesh Kumar'], need: 1, status: 'Covered' },
  { id: 'SH-04', slot: '16:00 – 00:00', day: 'Today', area: 'Emergency Satellite', service_point_code: 'ER-01', staff: ['Divya R'], need: 1, status: 'Covered' },
  { id: 'SH-05', slot: '00:00 – 08:00', day: 'Tonight', area: 'Night Emergency Cover', service_point_code: 'ER-NIGHT', staff: [], need: 1, status: 'Open' },
  { id: 'SH-06', slot: '08:00 – 16:00', day: 'Tomorrow', area: 'OPD Counters', service_point_code: 'OPD-ALL', staff: ['Arjun Varma'], need: 2, status: 'Understaffed' }
];

const DEFAULT_POINTS: PharmacyThroughputPoint[] = [
  { id: 'OPD-C1', name: 'OPD Counter 1', type: 'Outpatient dispensing', lead: 'Meghna Sengupta', queue: 5, tat: '5.9m', sla: '≤ 8m', today: 42, status: 'Normal' },
  { id: 'OPD-C2', name: 'OPD Counter 2', type: 'Outpatient dispensing', lead: 'Arjun Varma', queue: 8, tat: '6.4m', sla: '≤ 8m', today: 62, status: 'Busy' },
  { id: 'IPD-01', name: 'IPD Ward Supply', type: 'Inpatient orders & returns', lead: 'Sneha Nair', queue: 3, tat: '7.8m', sla: '≤ 15m', today: 48, status: 'Normal' },
  { id: 'STORE', name: 'Central Store', type: 'Receiving, staging & issue', lead: 'Rajesh Kumar', queue: 2, tat: '14m', sla: '≤ 30m', today: 34, status: 'Normal' },
  { id: 'ER-01', name: 'Emergency Satellite', type: 'Trauma & STAT dispensing', lead: 'Divya R (from 16:00)', queue: 0, tat: '3.1m', sla: '≤ 5m', today: 18, status: 'Normal' }
];

const DEFAULT_INVH: PharmacyInventoryHealthException[] = [
  { id: 'INV-01', name: 'Insulin Glargine 100 IU Pen', cat: 'Endocrinology · Cold chain', stock: 0, par: 15, issue: 'Out of stock', impact: '2 OPD prescriptions waiting · PO-9912 pending delivery', c: 'red' },
  { id: 'INV-02', name: 'Levothyroxine 75 mcg Tablets', cat: 'Endocrinology', stock: 0, par: 100, issue: 'Out of stock', impact: 'Substituted with 50 + 25 mcg where available', c: 'red' },
  { id: 'INV-03', name: 'Enoxaparin 40 mg/0.4 mL Injection', cat: 'Cardiology / Hematology', stock: 6, par: 20, issue: 'Low stock', impact: 'IPD demand high · supplier delivery expected 14:00', c: 'amber' },
  { id: 'INV-04', name: 'Meropenem 1g Injection', cat: 'Anti-infective', stock: 12, par: 25, issue: 'Expiring ≤ 60 days', impact: 'Batch MER2402 expires in 48 days · ₹14,200 at risk', c: 'amber' }
];

const DEFAULT_CDM: PharmacyControlledDrugMonitorItem[] = [
  { code: 'MOR10', name: 'Morphine Sulfate 10 mg/mL Ampoule', sched: 'X', open: 6, rec: 0, ret: 0, iss: 1, bal: 5, shelf: 4, last: '09:48 today', wit: 'Sneha Nair' },
  { code: 'FET50', name: 'Fentanyl Citrate 50 mcg/mL Ampoule', sched: 'X', open: 12, rec: 0, ret: 0, iss: 2, bal: 10, shelf: 10, last: '08:15 today', wit: 'Dr. Pooja Shah' },
  { code: 'TRA50', name: 'Tramadol 50 mg Capsule', sched: 'H1', open: 44, rec: 20, ret: 1, iss: 7, bal: 58, shelf: 58, last: '10:21 today', wit: 'Sneha Nair' },
  { code: 'MID05', name: 'Midazolam 5 mg/mL Injection', sched: 'H1', open: 18, rec: 0, ret: 0, iss: 2, bal: 16, shelf: 16, last: '07:30 today', wit: 'Arjun Varma' }
];

const DEFAULT_SUPS: PharmacySupplierPerformance[] = [
  { name: 'Sun Pharma Dist. Ltd', cat: 'Generic oral & injectables', po: 'PO-9911', lead: '24 h', ontime: 96, status: 'Approved' },
  { name: 'Cipla Institutional Care', cat: 'Respiratory & critical care', po: 'PO-9912', lead: '48 h', ontime: 78, status: 'Awaiting approval' },
  { name: 'Abbott Healthcare Pvt', cat: 'Cardiology & diabetes', po: '—', lead: '24 h', ontime: 94, status: 'No open PO' },
  { name: 'Govt. Opium & Alkaloid', cat: 'Schedule X narcotics', po: 'PO-9870', lead: '7 days', ontime: 100, status: 'Approved' }
];

const DEFAULT_AUDIT: PharmacyGovernanceAuditEntry[] = [
  { id: '1', time: '10:41', user: 'Arjun Varma', act: 'Allergy override logged', ent: 'RX-24116', sev: 'Override', ip: '192.168.4.12', det: 'Patient noted mild skin rash 2021; confirmed tolerating low dose' },
  { id: '2', time: '10:38', user: 'Rajesh Kumar', act: 'Stock adjusted −4', ent: 'MED-ENO-04', sev: 'Adjustment', ip: '192.168.4.20', det: 'Damaged in transit · carton seal ruptured · quarantined' },
  { id: '3', time: '10:21', user: 'Arjun Varma', act: 'Controlled drug dispensed', ent: 'CDR-0914', sev: 'Controlled', ip: '192.168.4.12', det: 'Tramadol 50 mg × 10 · countersigned by Dr. Pooja Shah' },
  { id: '4', time: '10:12', user: 'Sneha Nair', act: 'Ward return credited', ent: 'RW-031', sev: 'Refund', ip: '192.168.4.15', det: 'Ward 4B patient discharged · 3 unused Cefixime blisters restocked' },
  { id: '5', time: '09:48', user: 'Sneha Nair', act: 'Count discrepancy flagged', ent: 'MOR2311', sev: 'Discrepancy', ip: '192.168.4.15', det: 'Physical shelf count 4 vs register balance 5 · Investigation opened' },
  { id: '6', time: '09:05', user: 'Dr. Pooja Shah', act: 'Duty shift assigned', ent: 'SH-04', sev: 'Info', ip: '192.168.4.02', det: 'Assigned Divya R to Emergency Satellite evening coverage' }
];

const DEFAULT_SETTINGS: PharmacyGovernancePolicy[] = [
  { key: 'ovReason', name: 'Allergy override requires reason', scope: 'OPD · IPD', value: true, by: 'Dr. Pooja Shah · 12 Aug', description: 'Pharmacist must log a detailed clinical justification; prescriber is alerted' },
  { key: 'fullPay', name: 'Full payment before OPD dispense', scope: 'OPD', value: false, by: 'Finance · 01 Jul', description: 'When off, partial balances are linked to patient running account' },
  { key: 'cdWit', name: 'Controlled drug witness required', scope: 'OPD · IPD · Store', value: true, by: 'Dr. Pooja Shah · 03 Mar', description: 'Eligible peer pharmacist countersigns every Schedule X / H1 movement' },
  { key: 'wardSig', name: 'Ward handover signature', scope: 'IPD', value: true, by: 'Nursing · 20 Jun', description: 'Receiving staff nurse verifies and signs the ward dispatch slip' },
  { key: 'otcDisc', name: 'OTC discount limit', scope: 'OTC', value: '10%', by: 'Finance · 01 Apr', description: 'Maximum discretionary line discount allowable at the counter' },
  { key: 'expWin', name: 'Expiry alert window', scope: 'Store', value: '90 days', by: 'Rajesh Kumar · 15 May', description: 'Batches with expiry inside this window are flagged for priority issue' }
];

const DEFAULT_REPORTS: PharmacyAdminReport[] = [
  { id: 'RPT-DS', name: 'Daily Dispensing & Throughput Summary', period: 'Today', owner: 'Dr. Pooja Shah', gen: '10:00 today', fmt: 'PDF · CSV', status: 'Ready', kv: [['Prescriptions processed', 168], ['OPD queue average', '6.4 min'], ['Turnaround SLA pass', '96.2%'], ['Gross collection', '₹1,84,290']] },
  { id: 'RPT-CDR', name: 'Controlled Drug Reconciliation & NDPS Log', period: 'This week', owner: 'Dr. Pooja Shah', gen: '07:00 today', fmt: 'PDF · Audit trail', status: 'Due today', kv: [['Schedule X movements', 14], ['Schedule H1 movements', 28], ['Dual-sign compliance', '100%'], ['Open investigations', 1]] },
  { id: 'RPT-INV', name: 'Near-Expiry & Critical Inventory Valuation', period: 'Next 90 days', owner: 'Rajesh Kumar', gen: '08:30 today', fmt: 'CSV · Excel', status: 'Ready', kv: [['Batches expiring ≤ 90d', 9], ['Value at risk', '₹18,940'], ['Critical stockouts', 2], ['Active suppliers', 8]] },
  { id: 'RPT-STF', name: 'Pharmacy Staff Productivity & Overrides', period: 'This week', owner: 'Dr. Pooja Shah', gen: 'Yesterday', fmt: 'PDF', status: 'Ready', kv: [['Active pharmacists', 5], ['Total items filled', 1042], ['Allergy overrides', 4], ['Shift coverage', '95.8%']] }
];

// Sidebar active state shared with the Clinical Pharmacist and Inventory Manager workspaces
const SIDEBAR_TOKENS = {
  activeBg: '#eff6ff',
  activeBorder: '#bfdbfe',
  activeColor: '#1d4ed8',
  activeIconColor: '#2563eb',
  activeShadow: '0 1px 3px rgba(37, 99, 235, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
};

const PANEL: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  minWidth: 0,
};

const KPI_CARD: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '18px 20px',
  cursor: 'pointer',
  minHeight: '120px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  transition: 'all 0.15s ease',
  minWidth: 0,
};

const kpiBadge = (tone: 'gray' | 'green' | 'amber' | 'red' | 'blue'): React.CSSProperties => {
  const c = {
    gray: ['#f3f4f6', '#374151', '#e5e7eb'],
    green: ['#f0fdf4', '#16a34a', '#bbf7d0'],
    amber: ['#fffbeb', '#b45309', '#fde68a'],
    red: ['#fef2f2', '#dc2626', '#fecaca'],
    blue: ['#eff6ff', '#1d4ed8', '#bfdbfe'],
  }[tone];
  return { fontSize: '12px', fontWeight: 600, borderRadius: '6px', padding: '2px 8px', background: c[0], color: c[1], border: `1px solid ${c[2]}`, whiteSpace: 'nowrap' };
};

// Design bible: Inter everywhere (buttons and inputs do not inherit it by default), visible keyboard focus
const FOCUS_CSS = `
.pa-root, .pa-root button, .pa-root input, .pa-root select, .pa-root textarea { font-family: 'Inter', sans-serif; }
.pa-focus:focus-visible, .pa-root button:focus-visible, .pa-root [role="button"]:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
.pa-row:focus-visible { outline: 2px solid #2563eb; outline-offset: -2px; }
.pa-kbd { font-size: 11px; font-weight: 600; line-height: 1; padding: 3px 5px; border-radius: 4px; border: 1px solid #e2e8f0; background: #f8fafc; color: #64748b; white-space: nowrap; }
@keyframes pa-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes pa-pop { from { opacity: 0; transform: scale(0.98) translateY(-2px); } to { opacity: 1; transform: none; } }
@keyframes pa-backdrop { from { opacity: 0; } to { opacity: 1; } }
@keyframes pa-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes pa-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.pa-fade-in { animation: pa-fade-in 160ms ease-out both; }
.pa-pop { animation: pa-pop 150ms ease-out both; transform-origin: top right; }
.pa-backdrop { animation: pa-backdrop 150ms ease-out both; }
.pa-bar { transform-origin: left center; animation: pa-grow 500ms ease-out both; transition: width 300ms ease-out; }
.pa-kpi { transition: transform 150ms ease-out, box-shadow 150ms ease-out, border-color 150ms ease-out; }
.pa-kpi:hover, .pa-kpi:focus-visible { transform: translateY(-1px); box-shadow: 0 6px 16px -6px rgba(15, 23, 42, 0.14); border-color: #bfdbfe; }
.pa-chev { transition: transform 150ms ease-out; }
.pa-row { transition: background-color 120ms ease-out, border-left-color 120ms ease-out; }
.pa-skel { display: inline-block; border-radius: 6px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%); background-size: 400% 100%; animation: pa-shimmer 1.4s ease infinite; }
@media (prefers-reduced-motion: reduce) {
  .pa-root *, .pa-root *::before, .pa-root *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
  .pa-kpi:hover, .pa-kpi:focus-visible { transform: none; }
}
`;

// Alt+1 … Alt+0 open the sidebar sections in this order
const NAV_ORDER = ['overview', 'staff', 'schedule', 'ops', 'inv', 'cd', 'supp', 'audit', 'settings', 'reports'];
const navShortcut = (key: string) => {
  const i = NAV_ORDER.indexOf(key);
  return i < 0 ? '' : `Alt+${i === 9 ? 0 : i + 1}`;
};
const domId = (key: string) => `pa-row-${key.replace(/[^A-Za-z0-9_-]/g, '_')}`;
const invKey = (item: { id?: string }, idx: number) => item.id || `inv-${idx}`;

type MDRow = {
  key: string;
  title: string;
  badge: React.ReactNode;
  sub: React.ReactNode;
  metaLeft?: React.ReactNode;
  metaRight?: React.ReactNode;
  // Completion bar; hidden once the target is reached
  progress?: { pct: number; doneLabel: string };
};

export const PharmacyAdminWorkspace: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  // Signed-in identity (top-right profile control and sidebar footer)
  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Pharmacy Admin';
  const initials = displayName.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'PA';
  const designation = user?.designation || 'Pharmacy Admin';

  // Sidebar groups, profile menu and live clock
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMyProfileOpen, setIsMyProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const listSearchRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!isProfileOpen) return;
    const onClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) setIsProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileOpen(false);
        profileButtonRef.current?.focus();
      }
    };
    requestAnimationFrame(() => profileMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isProfileOpen]);

  const handleSignOut = () => {
    setIsProfileOpen(false);
    if (logout) logout();
    navigate('/login');
  };

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [activityScope, setActivityScope] = useState<string>('All');
  const [filterPill, setFilterPill] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [drawerNote, setDrawerNote] = useState<string>('');

  // Selected entities for right-hand inspection drawer
  const [selectedStaffId, setSelectedStaffId] = useState<string>('PH-4412');
  const [selectedShiftId, setSelectedShiftId] = useState<string>('SH-02');
  const [selectedPointId, setSelectedPointId] = useState<string>('OPD-C2');
  const [selectedInvId, setSelectedInvId] = useState<string>('INV-01');
  const [selectedCdCode, setSelectedCdCode] = useState<string>('MOR10');
  const [selectedSupKey, setSelectedSupKey] = useState<string>('');
  const [selectedAuditId, setSelectedAuditId] = useState<string>('1');
  const [selectedSettingKey, setSelectedSettingKey] = useState<string>('ovReason');
  const [selectedReportId, setSelectedReportId] = useState<string>('RPT-DS');

  // Live Data State
  const [metrics, setMetrics] = useState<PharmacyAdminMetrics | null>(null);
  const [staffList, setStaffList] = useState<PharmacyStaffMember[]>(DEFAULT_STAFF);
  const [shiftsList, setShiftsList] = useState<PharmacyDutyShift[]>(DEFAULT_SHIFTS);
  const [pointsList, setPointsList] = useState<PharmacyThroughputPoint[]>(DEFAULT_POINTS);
  const [invhList, setInvhList] = useState<PharmacyInventoryHealthException[]>(DEFAULT_INVH);
  const [cdmList, setCdmList] = useState<PharmacyControlledDrugMonitorItem[]>(DEFAULT_CDM);
  const [supsList, setSupsList] = useState<PharmacySupplierPerformance[]>(DEFAULT_SUPS);
  const [auditList, setAuditList] = useState<PharmacyGovernanceAuditEntry[]>(DEFAULT_AUDIT);
  const [settingsList, setSettingsList] = useState<PharmacyGovernancePolicy[]>(DEFAULT_SETTINGS);
  const [reportsList, setReportsList] = useState<PharmacyAdminReport[]>(DEFAULT_REPORTS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal State for Shift Assignment
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [assigningShift, setAssigningShift] = useState<PharmacyDutyShift | null>(null);
  const [selectedStaffToAssign, setSelectedStaffToAssign] = useState<string[]>([]);
  const [shiftAssignNote, setShiftAssignNote] = useState<string>('');

  // Staff Modal State (Add & Edit / Profile Completion)
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [editingStaffForModal, setEditingStaffForModal] = useState<PharmacyStaffMember | null>(null);
  const [successToast, setSuccessToast] = useState<{ message: string; sub?: string } | null>(null);

  // Fetch metrics & data from backend
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [m, st, sh, pts, inv, cd, su, au, sett, rep] = await Promise.allSettled([
        pharmacyAdminService.getAdminMetrics(activityScope),
        pharmacyAdminService.getStaffRoster(),
        pharmacyAdminService.getDutySchedules(),
        pharmacyAdminService.getThroughputPoints(),
        pharmacyAdminService.getInventoryHealth(),
        pharmacyAdminService.getControlledDrugMonitoring(),
        pharmacyAdminService.getSuppliersPerformance(),
        pharmacyAdminService.getAuditLogs(),
        pharmacyAdminService.getSettings(),
        pharmacyAdminService.getReports()
      ]);

      if (m.status === 'fulfilled') setMetrics(m.value);
      if (st.status === 'fulfilled' && st.value?.length) setStaffList(st.value);
      if (sh.status === 'fulfilled' && sh.value?.length) setShiftsList(sh.value);
      if (pts.status === 'fulfilled' && pts.value?.length) setPointsList(pts.value);
      if (inv.status === 'fulfilled' && inv.value?.length) setInvhList(inv.value);
      if (cd.status === 'fulfilled' && cd.value?.length) setCdmList(cd.value);
      if (su.status === 'fulfilled' && su.value?.length) setSupsList(su.value);
      if (au.status === 'fulfilled' && au.value?.length) setAuditList(au.value);
      if (sett.status === 'fulfilled' && sett.value?.length) setSettingsList(sett.value);
      if (rep.status === 'fulfilled' && rep.value?.length) setReportsList(rep.value);
    } catch (err) {
      console.warn('Using enriched fallback defaults for Pharmacy Admin Workspace', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [activityScope]);

  // Tab switch handler
  const handleNav = (tabKey: string, pill: string = 'all') => {
    setActiveTab(tabKey);
    setFilterPill(pill);
    setSearchQuery('');
    setDrawerNote('');
  };

  // Shift assignment action
  const handleOpenAssignShift = (shift: PharmacyDutyShift) => {
    setAssigningShift(shift);
    setSelectedStaffToAssign([...shift.staff]);
    setShiftAssignNote(shift.notes || '');
    setIsAssignModalOpen(true);
  };

  const handleSaveShiftAssignment = async () => {
    if (!assigningShift) return;
    try {
      await pharmacyAdminService.updateShiftAssignment({
        schedule_id: assigningShift.id,
        staff: selectedStaffToAssign,
        notes: shiftAssignNote
      });
      setShiftsList(prev =>
        prev.map(s =>
          s.id === assigningShift.id
            ? {
                ...s,
                staff: selectedStaffToAssign,
                status: selectedStaffToAssign.length >= s.need ? 'Covered' : selectedStaffToAssign.length > 0 ? 'Understaffed' : 'Open',
                notes: shiftAssignNote
              }
            : s
        )
      );
      setIsAssignModalOpen(false);
      setDrawerNote(`Shift coverage updated for ${assigningShift.area}`);
    } catch (err) {
      console.error('Failed to update shift', err);
    }
  };

  // Staff Management Actions (Add, Edit, and Complete Profile)
  const handleOpenAddStaff = () => {
    setEditingStaffForModal(null);
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaff = (staff: PharmacyStaffMember) => {
    setEditingStaffForModal(staff);
    setIsStaffModalOpen(true);
  };

  const handleStaffSaved = (updatedStaff: PharmacyStaffMember) => {
    setStaffList(prev => {
      const idx = prev.findIndex(s => s.id === updatedStaff.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedStaff;
        return copy;
      }
      return [updatedStaff, ...prev];
    });

    setSelectedStaffId(updatedStaff.id);

    // Update shift roster if assigned
    if (updatedStaff.area && updatedStaff.name) {
      setShiftsList(prev =>
        prev.map(sh => {
          if (sh.area.toLowerCase().includes((updatedStaff.area || '').toLowerCase()) && !sh.staff.includes(updatedStaff.name)) {
            const nextStaff = [...sh.staff, updatedStaff.name];
            return {
              ...sh,
              staff: nextStaff,
              status: nextStaff.length >= sh.need ? 'Covered' : 'Understaffed'
            };
          }
          return sh;
        })
      );
    }

    setSuccessToast({
      message: `Staff member ${updatedStaff.name} saved successfully`,
      sub: `${updatedStaff.role} · ${updatedStaff.area} · Shift ${updatedStaff.shift}`
    });
    setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
  };

  // PR Budget Approval action
  const handleReviewPR = async (sup: PharmacySupplierPerformance, action: 'APPROVE' | 'REJECT') => {
    if (!sup.po_id) {
      setDrawerNote(`Purchase order ${sup.po} status updated to ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`);
      setSupsList(prev => prev.map(s => s.name === sup.name ? { ...s, status: action === 'APPROVE' ? 'Approved' : 'Awaiting approval' } : s));
      return;
    }
    try {
      await pharmacyAdminService.reviewPurchaseRequest(sup.po_id, action, 'Approved by Pharmacy Admin');
      setDrawerNote(`PR for ${sup.name} formally approved for procurement.`);
      setSupsList(prev => prev.map(s => s.name === sup.name ? { ...s, status: 'Approved' } : s));
    } catch (err) {
      console.error(err);
    }
  };

  // PO Dispatch action
  const handleDispatchPO = async (sup: PharmacySupplierPerformance) => {
    if (!sup.po_id) {
      setDrawerNote(`PO ${sup.po} dispatched directly to ${sup.name}`);
      setSupsList(prev => prev.map(s => s.name === sup.name ? { ...s, status: 'Dispatched' } : s));
      return;
    }
    try {
      await pharmacyAdminService.dispatchPurchaseOrder(sup.po_id, 'Issued via electronic EDI portal');
      setDrawerNote(`PO dispatched successfully to vendor.`);
      setSupsList(prev => prev.map(s => s.name === sup.name ? { ...s, status: 'Dispatched' } : s));
    } catch (err) {
      console.error(err);
    }
  };

  // Calculated Counters & Alerts
  const discCount = useMemo(() => cdmList.filter(c => c.bal !== c.shelf).length, [cdmList]);
  const onDutyCount = useMemo(() => staffList.filter(s => s.status === 'On duty').length, [staffList]);
  const shiftGaps = useMemo(() => shiftsList.filter(s => s.status !== 'Covered').length, [shiftsList]);
  const stockoutCount = useMemo(() => invhList.filter(i => i.c === 'red').length, [invhList]);
  const awaitingPoCount = useMemo(() => supsList.filter(s => s.status === 'Awaiting approval').length, [supsList]);

  // Navigation Groups matching mockup
  const navGroups = [
    {
      label: 'OVERVIEW',
      items: [
        { key: 'overview', label: 'Overview', icon: LayoutDashboard, count: '' }
      ]
    },
    {
      label: 'OPERATIONS',
      items: [
        { key: 'staff', label: 'Staff & roster', icon: Users, count: `${onDutyCount} on duty`, isRed: false },
        { key: 'schedule', label: 'Duty scheduling', icon: CalendarDays, count: shiftGaps ? `${shiftGaps} gaps` : '', isRed: shiftGaps > 0 },
        { key: 'ops', label: 'Pharmacy operations', icon: Store, count: '' }
      ]
    },
    {
      label: 'SAFETY & STOCK',
      items: [
        { key: 'inv', label: 'Inventory health', icon: Package2, count: stockoutCount ? `${stockoutCount} out` : '', isRed: stockoutCount > 0 },
        { key: 'cd', label: 'Controlled drug monitoring', icon: Lock, count: discCount ? `${discCount} issue` : '', isRed: discCount > 0 },
        { key: 'supp', label: 'Suppliers & procurement', icon: Truck, count: awaitingPoCount ? `${awaitingPoCount} pending` : '' }
      ]
    },
    {
      label: 'GOVERNANCE',
      items: [
        { key: 'audit', label: 'Audit logs', icon: FileText, count: auditList.length.toString() },
        { key: 'settings', label: 'Department settings', icon: Sliders, count: '' },
        { key: 'reports', label: 'Reports', icon: BarChart2, count: reportsList.length.toString() }
      ]
    }
  ];

  // Helper Badge Formatter
  const renderBadge = (bg: string, fg: string, bd: string, text: string) => (
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
        backgroundColor: bg,
        color: fg,
        border: `1px solid ${bd}`
      }}
    >
      {text}
    </span>
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'On duty':
      case 'Covered':
      case 'Normal':
      case 'Reconciled':
      case 'Approved':
      case 'Ready':
      case 'On':
        return renderBadge('#f0fdf4', '#15803d', '#bbf7d0', status);
      case 'Open':
      case 'Open shift':
      case 'Out of stock':
      case 'Discrepancy':
      case 'Night gap':
        return renderBadge('#fef2f2', '#dc2626', '#fecaca', status);
      case 'On break':
      case 'Understaffed':
      case 'Busy':
      case 'Awaiting approval':
      case 'Due today':
      case 'Low stock':
        return renderBadge('#fffbeb', '#b45309', '#fde68a', status);
      case 'Off shift':
      case 'No open PO':
      case 'Off':
      default:
        return renderBadge('#f3f4f6', '#4b5563', '#e5e7eb', status);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'Override':
        return renderBadge('#fef2f2', '#dc2626', '#fecaca', 'Override');
      case 'Controlled':
        return renderBadge('#111827', '#ffffff', '#111827', 'Controlled');
      case 'Discrepancy':
        return renderBadge('#fef2f2', '#dc2626', '#fecaca', 'Discrepancy');
      case 'Adjustment':
        return renderBadge('#fffbeb', '#b45309', '#fde68a', 'Adjustment');
      case 'Refund':
        return renderBadge('#eff6ff', '#1d4ed8', '#bfdbfe', 'Refund');
      case 'Info':
      default:
        return renderBadge('#f3f4f6', '#4b5563', '#e5e7eb', sev);
    }
  };

  // ---------------- Master-detail model shared by every list tab ----------------
  const badgeFor = (tone: 'red' | 'amber' | 'green' | 'blue' | 'gray' | 'dark', text: string) => {
    const c = { red: ['#fef2f2', '#dc2626', '#fecaca'], amber: ['#fffbeb', '#b45309', '#fde68a'], green: ['#f0fdf4', '#15803d', '#bbf7d0'], blue: ['#eff6ff', '#1d4ed8', '#bfdbfe'], gray: ['#f3f4f6', '#4b5563', '#e5e7eb'], dark: ['#111827', '#ffffff', '#111827'] }[tone];
    return renderBadge(c[0], c[1], c[2], text);
  };

  const md = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const has = (text: string) => !q || text.toLowerCase().includes(q);
    type Cfg = {
      title: string; desc: string; detail: string; searchPh: string; primary: string;
      pills: Array<[string, string, (x: any) => boolean]>;
      items: Array<{ item: any; idx: number }>; key: (x: any, idx: number) => string; search: (x: any) => string; row: (x: any, key: string) => MDRow;
    };
    const all = (): boolean => true;
    const cfgs: Record<string, Cfg> = {
      staff: {
        title: 'Staff & roster', desc: 'Pharmacy roster and productivity this shift', detail: 'Staff member', searchPh: 'Search name, ID, role or area', primary: 'edit profile',
        pills: [['all', 'All', all], ...(['On duty', 'On break', 'Off shift'] as const).map(k => [k, k, (s: any) => s.status === k] as [string, string, (x: any) => boolean])],
        items: staffList.map((item, idx) => ({ item, idx })), key: s => s.id, search: s => `${s.name} ${s.role} ${s.id} ${s.area}`,
        row: s => ({
          key: s.id, title: s.name, badge: getStatusBadge(s.status),
          sub: <><span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: '12px' }}>{s.id}</span> · {s.role} · {s.area}</>,
          metaLeft: <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={13} color="#94a3b8" />{s.shift}</span>,
          metaRight: <><strong style={{ color: '#111827' }}>{s.done}/{s.target}</strong> · TAT {s.tat}</>,
          progress: { pct: s.target ? Math.round((s.done / s.target) * 100) : 0, doneLabel: 'Target met' },
        }),
      },
      schedule: {
        title: 'Duty scheduling', desc: 'Shift coverage by service point · minimum staffing per policy', detail: 'Shift', searchPh: 'Search service point or staff', primary: 'assign staff',
        pills: [['all', 'All', all], ...['Today', 'Tomorrow', 'Understaffed', 'Open'].map(k => [k, k, (sh: any) => sh.day === k || sh.status === k] as [string, string, (x: any) => boolean])],
        items: shiftsList.map((item, idx) => ({ item, idx })), key: sh => sh.id, search: sh => `${sh.area} ${sh.staff.join(' ')}`,
        row: sh => ({
          key: sh.id, title: `${sh.slot} · ${sh.area}`, badge: getStatusBadge(sh.status), sub: sh.day,
          metaLeft: <span style={{ color: sh.staff.length ? '#475569' : '#dc2626' }}>{sh.staff.join(', ') || 'Unassigned'}</span>,
          metaRight: <><strong style={{ color: '#111827' }}>{sh.staff.length}/{sh.need}</strong> cover</>,
          progress: { pct: sh.need ? Math.round((sh.staff.length / sh.need) * 100) : 100, doneLabel: 'Fully covered' },
        }),
      },
      ops: {
        title: 'Pharmacy operations', desc: 'Live load and turnaround by service point', detail: 'Service point', searchPh: 'Search service point or lead', primary: 'open details',
        pills: [['all', 'All', all], ...['Normal', 'Busy', 'Night gap'].map(k => [k, k, (p: any) => p.status === k] as [string, string, (x: any) => boolean])],
        items: pointsList.map((item, idx) => ({ item, idx })), key: p => p.id, search: p => `${p.name} ${p.lead}`,
        row: p => ({
          key: p.id, title: p.name, badge: getStatusBadge(p.status), sub: `${p.type} · Lead ${p.lead}`,
          metaLeft: <span style={{ color: p.queue > 6 ? '#b45309' : '#475569', fontWeight: p.queue > 6 ? 600 : 400 }}>Queue {p.queue}</span>,
          metaRight: <>TAT {p.tat} · SLA {p.sla} · {p.today} today</>,
        }),
      },
      inv: {
        title: 'Inventory health', desc: 'Exceptions that affect patient care · managed by the Inventory Manager', detail: 'Item', searchPh: 'Search item or impact', primary: 'open details',
        pills: [['all', 'All', all], ['out', 'Out of stock', (i: any) => i.c === 'red'], ['risk', 'Low / expiring', (i: any) => i.c === 'amber']],
        items: invhList.map((item, idx) => ({ item, idx })), key: (i, idx) => invKey(i, idx), search: i => `${i.name} ${i.impact}`,
        row: (i, key) => ({
          key, title: i.name, badge: badgeFor(i.c === 'red' ? 'red' : 'amber', i.issue), sub: `${i.cat} · ${i.impact}`,
          metaLeft: <span style={{ color: i.stock === 0 ? '#dc2626' : '#475569', fontWeight: i.stock === 0 ? 600 : 400 }}>Stock {i.stock}</span>,
          metaRight: <>Reorder at {i.par}</>,
        }),
      },
      cd: {
        title: 'Controlled drug monitoring', desc: 'Daily movement and physical count vs register balance', detail: 'Controlled drug', searchPh: 'Search drug or code', primary: 'open details',
        pills: [['all', 'All', all], ['disc', 'Discrepancies', (c: any) => c.bal !== c.shelf], ['X', 'Schedule X', (c: any) => c.sched === 'X'], ['H1', 'Schedule H1', (c: any) => c.sched === 'H1']],
        items: cdmList.map((item, idx) => ({ item, idx })), key: c => c.code, search: c => `${c.name} ${c.code}`,
        row: c => ({
          key: c.code, title: c.name,
          badge: c.shelf === c.bal ? badgeFor('green', 'Reconciled') : badgeFor('red', `Variance ${c.shelf - c.bal}`),
          sub: <><span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: '12px' }}>{c.code}</span> · Schedule {c.sched}</>,
          metaLeft: <>Open {c.open} · +{c.rec + c.ret} · −{c.iss}</>,
          metaRight: <>Register <strong style={{ color: '#111827' }}>{c.bal}</strong> · Shelf <strong style={{ color: c.shelf !== c.bal ? '#dc2626' : '#111827' }}>{c.shelf}</strong></>,
        }),
      },
      supp: {
        title: 'Suppliers & procurement', desc: 'Vendor performance and purchase orders awaiting admin approval', detail: 'Supplier', searchPh: 'Search supplier', primary: 'open details',
        pills: [['all', 'All', all], ...['Awaiting approval', 'Approved'].map(k => [k, k, (s: any) => s.status === k] as [string, string, (x: any) => boolean])],
        items: supsList.map((item, idx) => ({ item, idx })), key: s => s.name, search: s => s.name,
        row: s => ({
          key: s.name, title: s.name, badge: getStatusBadge(s.status), sub: `${s.cat} · PO ${s.po}`,
          metaLeft: <>Lead {s.lead}</>,
          metaRight: <span style={{ color: s.ontime < 80 ? '#dc2626' : '#475569', fontWeight: s.ontime < 80 ? 600 : 400 }}>On-time {s.ontime}%</span>,
        }),
      },
      audit: {
        title: 'Audit logs', desc: 'Immutable trail of every pharmacy action · user, time and terminal', detail: 'Log entry', searchPh: 'Search user, action or entity', primary: 'open details',
        pills: [['all', 'All', all], ...['Override', 'Controlled', 'Discrepancy', 'Adjustment', 'Refund', 'Info'].map(k => [k, k, (a: any) => a.sev === k] as [string, string, (x: any) => boolean])],
        items: auditList.map((item, idx) => ({ item, idx })), key: a => a.id, search: a => `${a.user} ${a.act} ${a.ent}`,
        row: a => ({
          key: a.id, title: a.act, badge: getSeverityBadge(a.sev), sub: `${a.time} · ${a.user}`,
          metaLeft: <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: '12px' }}>{a.ent}</span>,
          metaRight: <>Terminal {a.ip}</>,
        }),
      },
      settings: {
        title: 'Department settings', desc: 'Pharmacy policies applied across OPD, IPD, OTC and the store', detail: 'Policy', searchPh: 'Search policy', primary: 'open details',
        pills: [['all', 'All', all], ...['OPD', 'IPD', 'OTC', 'Store', 'Billing'].map(k => [k, k, (s: any) => s.scope.includes(k)] as [string, string, (x: any) => boolean])],
        items: settingsList.map((item, idx) => ({ item, idx })), key: s => s.key, search: s => s.name,
        row: s => ({
          key: s.key, title: s.name,
          badge: typeof s.value === 'boolean' ? badgeFor(s.value ? 'green' : 'gray', s.value ? 'On' : 'Off') : badgeFor('blue', String(s.value)),
          sub: s.description, metaLeft: <>{s.scope}</>, metaRight: <>Changed {s.by}</>,
        }),
      },
      reports: {
        title: 'Reports', desc: 'Generated automatically from dispensing, billing and inventory data', detail: 'Report preview', searchPh: 'Search report', primary: 'open details',
        pills: [['all', 'All', all], ...['Today', 'This week', 'Next 90 days'].map(k => [k, k, (r: any) => r.period === k] as [string, string, (x: any) => boolean])],
        items: reportsList.map((item, idx) => ({ item, idx })), key: r => r.id, search: r => r.name,
        row: r => ({
          key: r.id, title: r.name, badge: getStatusBadge(r.status), sub: `${r.id} · ${r.period}`,
          metaLeft: <>Owner {r.owner}</>, metaRight: <>{r.gen} · {r.fmt}</>,
        }),
      },
    };
    const cfg = cfgs[activeTab];
    if (!cfg) return null;
    const pill = cfg.pills.find(pl => pl[0] === filterPill) || cfg.pills[0];
    const rows = cfg.items
      .filter(({ item }) => pill[2](item) && has(cfg.search(item)))
      .map(({ item, idx }) => cfg.row(item, cfg.key(item, idx)));
    return {
      ...cfg,
      rows,
      total: cfg.items.length,
      pillCounts: cfg.pills.map(pl => [pl[0], pl[1], cfg.items.filter(({ item }) => pl[2](item)).length] as [string, string, number]),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filterPill, searchQuery, staffList, shiftsList, pointsList, invhList, cdmList, supsList, auditList, settingsList, reportsList]);

  const mdSelectedKey: string = ({
    staff: selectedStaffId, schedule: selectedShiftId, ops: selectedPointId, inv: selectedInvId, cd: selectedCdCode,
    supp: selectedSupKey, audit: selectedAuditId, settings: selectedSettingKey, reports: selectedReportId,
  } as Record<string, string>)[activeTab] || '';

  const mdSelect = (key: string) => {
    const setters: Record<string, (k: string) => void> = {
      staff: setSelectedStaffId, schedule: setSelectedShiftId, ops: setSelectedPointId, inv: setSelectedInvId, cd: setSelectedCdCode,
      supp: setSelectedSupKey, audit: setSelectedAuditId, settings: setSelectedSettingKey, reports: setSelectedReportId,
    };
    setters[activeTab]?.(key);
  };

  // The highlighted row and the detail panel always resolve to the same visible row
  const mdActiveKey: string | null = md ? (md.rows.find(r => r.key === mdSelectedKey)?.key ?? md.rows[0]?.key ?? null) : null;
  useEffect(() => {
    const el = detailRef.current;
    if (!el || !mdActiveKey || typeof el.animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    el.animate([{ opacity: 0.55, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 160, easing: 'ease-out' });
  }, [mdActiveKey, activeTab]);
  const activeStaff = activeTab === 'staff' ? staffList.find(s => s.id === mdActiveKey) || null : null;

  const runPrimaryAction = (key: string) => {
    if (activeTab === 'staff') {
      const s = staffList.find(x => x.id === key);
      if (s) handleOpenEditStaff(s);
    } else if (activeTab === 'schedule') {
      const sh = shiftsList.find(x => x.id === key);
      if (sh) handleOpenAssignShift(sh);
    } else {
      detailRef.current?.focus();
    }
  };

  const handleListKeyDown = (e: React.KeyboardEvent, fromSearch = false) => {
    if (!md) return;
    if (fromSearch && e.key === 'Escape') {
      if (searchQuery) setSearchQuery('');
      else (e.currentTarget as HTMLElement).blur();
      return;
    }
    if (e.key === 'Enter' && mdActiveKey) {
      e.preventDefault();
      runPrimaryAction(mdActiveKey);
      return;
    }
    const step: Record<string, number | 'first' | 'last'> = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 };
    if (!fromSearch) Object.assign(step, { Home: 'first', End: 'last' });
    if (!(e.key in step) || !md.rows.length) return;
    e.preventDefault();
    const idx = Math.max(0, md.rows.findIndex(r => r.key === mdActiveKey));
    const d = step[e.key];
    const next = d === 'first' ? 0 : d === 'last' ? md.rows.length - 1 : Math.min(md.rows.length - 1, Math.max(0, idx + (d as number)));
    const key = md.rows[next].key;
    mdSelect(key);
    requestAnimationFrame(() => {
      const el = document.getElementById(domId(key));
      el?.scrollIntoView({ block: 'nearest' });
      if (!fromSearch) el?.focus();
    });
  };

  // Global keyboard shortcuts (see the "?" dialog)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isAssignModalOpen || isStaffModalOpen || isMyProfileOpen || isChangePasswordOpen) return;
      const el = e.target as HTMLElement;
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const digit = /^Digit(\d)$/.exec(e.code);
        if (digit) {
          const n = Number(digit[1]);
          const tab = NAV_ORDER[n === 0 ? 9 : n - 1];
          e.preventDefault();
          handleNav(tab);
          if (tab !== 'overview') requestAnimationFrame(() => listSearchRef.current?.focus());
          return;
        }
        const actions: Record<string, () => void> = {
          KeyL: () => handleNav('audit'),
          KeyR: () => handleNav('reports'),
          KeyP: () => setIsProfileOpen(v => !v),
          KeyN: () => { if (activeTab === 'staff') handleOpenAddStaff(); },
        };
        if (actions[e.code]) {
          e.preventDefault();
          actions[e.code]();
        }
        return;
      }
      if (typing || e.ctrlKey || e.metaKey) return;
      if (e.key === '/' && activeTab !== 'overview') {
        e.preventDefault();
        listSearchRef.current?.focus();
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Current Breadcrumb Title
  const crumbTitle = useMemo(() => {
    const item = navGroups.flatMap(g => g.items).find(i => i.key === activeTab);
    return item ? item.label : 'Overview';
  }, [activeTab]);

  return (
    <div className="pa-root hms-motion" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#f9fafb', fontFamily: "'Inter', sans-serif", fontSize: '14px', color: '#111827' }}>
      {/* 1. Left Navigation Sidebar (260px, matching Clinical Pharmacist & Inventory Manager) */}
      <style>{FOCUS_CSS}</style>
      <aside style={{ width: '260px', flexShrink: 0, background: '#ffffff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '15px' }}>
            N
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>North Hospital</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Clinical Enterprise HMS</div>
          </div>
        </div>

        {/* Department & Role Card */}
        <div style={{ margin: '12px 14px 8px', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Current Department</span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '1px 5px' }}>ADMIN</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
              <Building2 size={13} style={{ color: '#2563eb', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>Pharmacy</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>OPD · IPD · Central store</div>
          </div>
          <div style={{ paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Operating Role</span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', padding: '1px 5px' }}>ACTIVE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>Pharmacy Admin</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
              {user?.employeeId ? `ID: ${user.employeeId} · ` : ''}Oversight & governance
            </div>
          </div>
        </div>

        {/* Grouped Navigation (collapsible groups) */}
        <nav aria-label="Pharmacy admin navigation" style={{ flex: 1, padding: '4px 10px 12px', display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', scrollbarWidth: 'thin' }}>
          {navGroups.map((group, gIdx) => {
            const isCollapsed = !!collapsedGroups[group.label];
            const hasActiveItem = group.items.some(i => i.key === activeTab);
            return (
              <div key={group.label} style={{ marginTop: gIdx > 0 ? '6px' : '2px' }}>
                <button
                  type="button"
                  className="pa-focus pharmacy-group-header"
                  onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.label]: !prev[group.label] }))}
                  aria-expanded={!isCollapsed}
                  title={`${isCollapsed ? 'Expand' : 'Collapse'} ${group.label.toLowerCase()}`}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: gIdx > 0 ? '10px 8px 4px' : '6px 8px 4px', cursor: 'pointer', userSelect: 'none', borderRadius: '6px', border: 'none', borderTop: gIdx > 0 ? '1px solid #f1f5f9' : 'none', background: 'transparent', fontFamily: 'inherit' }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: hasActiveItem ? '#1d4ed8' : '#64748b' }}>
                    {group.label}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: hasActiveItem ? '#2563eb' : '#94a3b8', background: hasActiveItem ? '#eff6ff' : '#f8fafc', padding: '1px 5px', borderRadius: '4px', border: hasActiveItem ? '1px solid #bfdbfe' : '1px solid #f1f5f9' }}>
                      {group.items.length}
                    </span>
                    <ChevronDown size={13} color="#94a3b8" className="pa-chev" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none' }} />
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="pa-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                    {group.items.map(item => {
                      const isActive = activeTab === item.key;
                      const IconComponent = item.icon;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className="pa-focus pharmacy-nav-item"
                          onClick={() => handleNav(item.key)}
                          aria-current={isActive ? 'page' : undefined}
                          aria-keyshortcuts={navShortcut(item.key).replace('+', '+') || undefined}
                          title={`${item.label} (${navShortcut(item.key)})`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            width: '100%',
                            height: '40px',
                            padding: '0 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontSize: '14px',
                            fontWeight: isActive ? 600 : 500,
                            textAlign: 'left',
                            color: isActive ? SIDEBAR_TOKENS.activeColor : '#334155',
                            background: isActive ? SIDEBAR_TOKENS.activeBg : 'transparent',
                            border: `1px solid ${isActive ? SIDEBAR_TOKENS.activeBorder : 'transparent'}`,
                            boxShadow: isActive ? SIDEBAR_TOKENS.activeShadow : 'none',
                            transition: 'all 0.12s ease',
                          }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <IconComponent size={18} style={{ color: isActive ? SIDEBAR_TOKENS.activeIconColor : '#64748b', flexShrink: 0 }} />
                          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                          {item.count && (
                            <span style={{ fontSize: '12px', fontWeight: 600, padding: '1px 7px', borderRadius: '10px', whiteSpace: 'nowrap', flexShrink: 0, background: item.isRed ? '#fef2f2' : isActive ? '#dbeafe' : '#f1f5f9', color: item.isRed ? '#dc2626' : isActive ? '#1e40af' : '#64748b', border: item.isRed ? '1px solid #fecaca' : 'none' }}>
                              {item.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Card / Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderTop: '1px solid #e5e7eb', background: '#ffffff', flexShrink: 0 }}>
          <button
            type="button"
            className="pa-focus"
            onClick={() => setIsMyProfileOpen(true)}
            title="View my profile"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, cursor: 'pointer', borderRadius: '8px', padding: '2px 4px', margin: '-2px -4px', border: 'none', background: 'transparent', textAlign: 'left', fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0, border: '1.5px solid #bfdbfe' }}>
              {initials}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
              <span style={{ display: 'block', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{designation}</span>
            </span>
          </button>
          <button
            type="button"
            className="pa-focus"
            onClick={handleSignOut}
            title="Log out"
            aria-label="Log out"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* 2. Main Workspace Body */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Sticky Top Bar (52px) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', height: '52px', padding: '0 24px', borderBottom: '1px solid #e5e7eb', background: '#ffffff', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b', minWidth: 0 }}>
            <span>North Hospital</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span>Pharmacy · Admin</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ color: '#111827', fontWeight: 600 }}>{crumbTitle}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '8px', fontSize: '11px', fontWeight: 600, color: '#374151', background: '#f3f4f6', borderRadius: '4px', padding: '2px 6px' }}>
              Read-only
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>
              <Calendar size={16} color="#6b7280" />
              Today · {now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>

            <button
              type="button"
              onClick={() => setIsShortcutsOpen(true)}
              aria-keyshortcuts="?"
              title="Keyboard shortcuts (?)"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#ffffff', fontSize: '13px', fontWeight: 500, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <span className="pa-kbd">?</span>
              Shortcuts
            </button>

            <div style={{ width: '1px', height: '20px', background: '#e5e7eb', margin: '0 2px' }} />

            {/* Profile Dropdown */}
            <div style={{ position: 'relative' }} ref={profileMenuRef}>
              <button
                ref={profileButtonRef}
                type="button"
                className="pa-focus"
                onClick={() => setIsProfileOpen(prev => !prev)}
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
                aria-keyshortcuts="Alt+P"
                title="Account (Alt+P)"
                style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '44px', padding: '0 12px 0 6px', background: isProfileOpen ? '#f1f5f9' : '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' }}
              >
                <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                  {initials}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.25 }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
                  <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>Pharmacy Admin</span>
                </span>
                <ChevronDown size={16} style={{ color: '#64748b', transform: isProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
              </button>

              {isProfileOpen && (
                <div
                  className="pa-pop"
                  role="menu"
                  aria-label="Account"
                  onKeyDown={e => {
                    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
                    e.preventDefault();
                    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
                    const i = items.indexOf(document.activeElement as HTMLElement);
                    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
                    items[next]?.focus();
                  }}
                  style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: '285px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', zIndex: 100, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', border: '2px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
                      {initials}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                      {user?.email && <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>{user.email}</div>}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '10px', fontWeight: 600, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', padding: '1px 7px' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a' }} />
                        {designation}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button
                      type="button"
                      role="menuitem"
                      className="pa-focus"
                      onClick={() => { setIsProfileOpen(false); setIsMyProfileOpen(true); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', fontSize: '14px', fontWeight: 500, color: '#334155', background: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <UserIcon size={16} style={{ color: '#64748b' }} />
                      <span>My Profile</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="pa-focus"
                      onClick={() => { setIsProfileOpen(false); setIsChangePasswordOpen(true); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', fontSize: '14px', fontWeight: 500, color: '#334155', background: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <KeyRound size={16} style={{ color: '#64748b' }} />
                      <span>Change Password</span>
                    </button>
                  </div>
                  <div style={{ borderTop: '1px solid #e2e8f0', padding: '6px' }}>
                    <button
                      type="button"
                      role="menuitem"
                      className="pa-focus"
                      onClick={handleSignOut}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', fontSize: '14px', fontWeight: 500, color: '#dc2626', background: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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

        {/* Scrollable Content Container */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Success Toast Banner */}
          {successToast && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: '12px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #86efac',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.1)',
                animation: 'fadeIn 0.2s ease-in'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={18} color="#16a34a" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#166534' }}>{successToast.message}</div>
                  {successToast.sub && <div style={{ fontSize: '12px', color: '#15803d', marginTop: '2px' }}>{successToast.sub}</div>}
                </div>
              </div>
              <button
                onClick={() => setSuccessToast(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Header Banner */}
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '22px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#111827', letterSpacing: '-0.01em', margin: 0 }}>Pharmacy Admin Workspace</h1>
              <p style={{ fontSize: '14px', color: '#4b5563', marginTop: '6px', marginBottom: 0 }}>
                Department oversight across OPD, IPD and the central store · staff, reports, audit trail and controlled drugs.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="pa-focus"
                onClick={() => handleNav('audit')}
                aria-keyshortcuts="Alt+L"
                style={{ height: '40px', padding: '0 16px', borderRadius: '10px', whiteSpace: 'nowrap', background: activeTab === 'audit' ? '#eff6ff' : '#ffffff', color: activeTab === 'audit' ? '#1d4ed8' : '#111827', border: `1px solid ${activeTab === 'audit' ? '#2563eb' : '#d1d5db'}`, fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FileText size={18} />
                <span>Audit logs</span>
                <span className="pa-kbd">Alt+L</span>
              </button>
              <button
                type="button"
                className="pa-focus"
                onClick={() => handleNav('reports')}
                aria-keyshortcuts="Alt+R"
                style={{ height: '40px', padding: '0 16px', borderRadius: '10px', whiteSpace: 'nowrap', background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <BarChart2 size={18} />
                <span>Daily report</span>
                <span className="pa-kbd" style={{ background: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.35)', color: '#ffffff' }}>Alt+R</span>
              </button>
            </div>
          </div>

          {/* Exactly 4 KPI cards — Revenue lives in Reports */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
            {/* KPI 1: Prescription volume */}
            <div role="button" tabIndex={0} className="pa-focus pa-kpi" onClick={() => handleNav('overview')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNav('overview'); } }} style={KPI_CARD} title="Open overview">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4b5563' }}>Prescription volume</span>
                <span style={kpiBadge('gray')}>TODAY</span>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{metrics ? metrics.kpis.rx_volume : isLoading ? <span className="pa-skel" aria-label="Loading" style={{ width: '72px', height: '28px' }} /> : '—'}</span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>received</span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  {metrics ? `OPD ${metrics.kpis.rx_breakdown.opd} · IPD ${metrics.kpis.rx_breakdown.ipd} · OTC ${metrics.kpis.rx_breakdown.otc}` : isLoading ? 'Loading…' : 'Metrics unavailable'}
                </div>
              </div>
            </div>

            {/* KPI 2: Dispensed today */}
            <div role="button" tabIndex={0} className="pa-focus pa-kpi" onClick={() => handleNav('reports')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNav('reports'); } }} style={KPI_CARD} title="Open reports">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4b5563' }}>Dispensed today</span>
                {metrics && (
                  <span style={kpiBadge(metrics.kpis.dispensed_pct_received < 70 ? 'amber' : 'green')}>{metrics.kpis.dispensed_pct_received}% OF RECEIVED</span>
                )}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{metrics ? metrics.kpis.dispensed_today : isLoading ? <span className="pa-skel" aria-label="Loading" style={{ width: '72px', height: '28px' }} /> : '—'}</span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>fulfilled</span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Across OPD, IPD and OTC counters</div>
              </div>
            </div>

            {/* KPI 3: Inventory health */}
            <div role="button" tabIndex={0} className="pa-focus pa-kpi" onClick={() => handleNav('inv', 'out')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNav('inv', 'out'); } }} style={{ ...KPI_CARD, border: stockoutCount > 0 ? '1.5px solid #fecaca' : KPI_CARD.border, boxShadow: stockoutCount > 0 ? '0 2px 4px rgba(220, 38, 38, 0.05)' : 'none' }} title="Open inventory health">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: stockoutCount > 0 ? '#b91c1c' : '#4b5563' }}>Inventory health</span>
                <span style={kpiBadge(stockoutCount > 0 ? 'red' : 'green')}>{stockoutCount > 0 ? `${stockoutCount} OUT OF STOCK` : 'CLEAR'}</span>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{metrics ? `${metrics.kpis.inventory_health_pct}%` : isLoading ? <span className="pa-skel" aria-label="Loading" style={{ width: '72px', height: '28px' }} /> : '—'}</span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>SKUs healthy</span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{invhList.length} exceptions tracked by the Inventory Manager</div>
              </div>
            </div>

            {/* KPI 4: Staff productivity */}
            <div role="button" tabIndex={0} className="pa-focus pa-kpi" onClick={() => handleNav('staff')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNav('staff'); } }} style={KPI_CARD} title="Open staff & roster">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4b5563' }}>Staff productivity</span>
                <span style={kpiBadge('blue')}>{onDutyCount} ON DUTY</span>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{metrics ? metrics.kpis.avg_turnaround_mins : isLoading ? <span className="pa-skel" aria-label="Loading" style={{ width: '72px', height: '28px' }} /> : '—'}</span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>min avg OPD turnaround</span>
                </div>
                <div style={{ fontSize: '12px', marginTop: '2px', color: shiftGaps > 0 ? '#b45309' : '#94a3b8' }}>
                  {shiftGaps > 0 ? `${shiftGaps} shift ${shiftGaps === 1 ? 'gap' : 'gaps'} to cover` : 'All shifts covered'}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION A: OVERVIEW TAB CONTENT */}
          {activeTab === 'overview' && (
            <>
              {/* Overview Row 1: Hourly Activity + Alerts Feed */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '16px' }}>
                {/* Hourly Activity Bar Chart */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Prescription activity</h2>
                      <p style={{ fontSize: '13px', color: '#4b5563', margin: '2px 0 0' }}>Prescriptions received per hour · today</p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {['All', 'OPD', 'IPD', 'OTC'].map(scope => (
                        <button
                          key={scope}
                          onClick={() => setActivityScope(scope)}
                          style={{
                            height: '30px',
                            padding: '0 10px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: activityScope === scope ? '#eff6ff' : '#fff',
                            color: activityScope === scope ? '#2563eb' : '#374151',
                            border: `1px solid ${activityScope === scope ? '#bfdbfe' : '#e5e7eb'}`
                          }}
                        >
                          {scope}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 8 Columns Bar Chart */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '10px', alignItems: 'end', height: '180px', paddingTop: '8px', borderBottom: '1px solid #e5e7eb' }}>
                    {(metrics?.hourly_activity?.bars || [
                      { hour: '07:00', value: 8, height: '24px', color: '#2563eb' },
                      { hour: '08:00', value: 24, height: '72px', color: '#2563eb' },
                      { hour: '09:00', value: 38, height: '114px', color: '#2563eb' },
                      { hour: '10:00', value: 44, height: '130px', color: '#2563eb' },
                      { hour: '11:00', value: '~40', height: '120px', color: '#dbeafe' },
                      { hour: '12:00', value: '~32', height: '96px', color: '#dbeafe' },
                      { hour: '13:00', value: '~18', height: '54px', color: '#dbeafe' },
                      { hour: '14:00', value: '~10', height: '30px', color: '#dbeafe' }
                    ]).map((b, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', height: '100%' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{b.value}</span>
                        <div style={{ width: '100%', maxWidth: '36px', height: b.height, background: b.color, borderRadius: '6px 6px 0 0' }} />
                      </div>
                    ))}
                  </div>

                  {/* Hours Labels */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '10px', marginTop: '-8px' }}>
                    {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'].map((h, i) => (
                      <span key={i} style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>{h}</span>
                    ))}
                  </div>

                  {/* 4 Bottom Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Received</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{metrics?.hourly_activity?.stats?.received ?? 114}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Peak hour</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{metrics?.hourly_activity?.stats?.peak_hour ?? '10:00'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Avg / hour</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{metrics?.hourly_activity?.stats?.avg_per_hour ?? 28}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Forecast today</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{metrics?.hourly_activity?.stats?.forecast_today ?? 214}</div>
                    </div>
                  </div>
                </div>

                {/* Alerts Feed */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Alerts</h2>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', background: '#fef2f2', borderRadius: '4px', padding: '2px 6px' }}>
                      5 open
                    </span>
                  </div>

                  {(metrics?.alerts || [
                    { id: '1', type: 'red', icon: 'XCircle', title: 'CD count discrepancy · Morphine', subtitle: 'MOR2311 · register 5, shelf 4 · investigation required', time: '09:48', link_tab: 'cd' },
                    { id: '2', type: 'red', icon: 'PackageX', title: '2 items out of stock', subtitle: 'Insulin glargine pen, Levothyroxine 75 mcg · 2 Rx on hold', time: '10:30', link_tab: 'inv' },
                    { id: '3', type: 'amber', icon: 'AlertTriangle', title: '2 allergy overrides today', subtitle: 'Both by Arjun Varma · review reasons', time: '10:41', link_tab: 'audit' },
                    { id: '4', type: 'amber', icon: 'CalendarClock', title: '9 batches expire within 90 days', subtitle: '₹18,940 value at risk', time: '08:00', link_tab: 'reports' },
                    { id: '5', type: 'blue', icon: 'Clock', title: 'CD reconciliation report due', subtitle: 'Weekly sign-off pending', time: '07:00', link_tab: 'reports' }
                  ]).map(a => {
                    const isRed = a.type === 'red';
                    const isAmber = a.type === 'amber';
                    return (
                      <div
                        key={a.id}
                        onClick={() => handleNav(a.link_tab)}
                        style={{
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'flex-start',
                          padding: '12px',
                          borderRadius: '10px',
                          background: isRed ? '#fef2f2' : isAmber ? '#fffbeb' : '#eff6ff',
                          border: `1px solid ${isRed ? '#fecaca' : isAmber ? '#fde68a' : '#bfdbfe'}`,
                          cursor: 'pointer'
                        }}
                      >
                        {isRed ? <XCircle size={18} color="#dc2626" /> : isAmber ? <AlertTriangle size={18} color="#b45309" /> : <Clock size={18} color="#1d4ed8" />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: isRed ? '#dc2626' : isAmber ? '#b45309' : '#1d4ed8' }}>
                            {a.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>{a.subtitle}</div>
                        </div>
                        <span style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{a.time}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Overview Row 2: Inventory Health + Staff Performance */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '16px' }}>
                {/* Inventory Health Progress Meter */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Inventory health</h2>
                    <p style={{ fontSize: '13px', color: '#4b5563', margin: '2px 0 0' }}>Share of SKUs by stock status · central store</p>
                  </div>

                  {/* Segmented Bar */}
                  <div style={{ display: 'flex', height: '12px', borderRadius: '9999px', overflow: 'hidden', gap: '2px' }}>
                    {(metrics?.inventory_segments || [
                      { label: 'In stock', count: 23, color: '#16a34a', width_pct: '72%', pct_formatted: '72%' },
                      { label: 'Low stock', count: 4, color: '#f59e0b', width_pct: '12%', pct_formatted: '12%' },
                      { label: 'Expiring ≤ 90 days', count: 3, color: '#fde68a', width_pct: '9%', pct_formatted: '9%' },
                      { label: 'Out of stock', count: 2, color: '#dc2626', width_pct: '6%', pct_formatted: '6%' }
                    ]).map((seg, i) => (
                      <div key={i} style={{ width: seg.width_pct, background: seg.color }} />
                    ))}
                  </div>

                  {/* Legend Rows */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {(metrics?.inventory_segments || [
                      { label: 'In stock', count: 23, color: '#16a34a', pct_formatted: '72%' },
                      { label: 'Low stock', count: 4, color: '#f59e0b', pct_formatted: '12%' },
                      { label: 'Expiring ≤ 90 days', count: 3, color: '#fde68a', pct_formatted: '9%' },
                      { label: 'Out of stock', count: 2, color: '#dc2626', pct_formatted: '6%' }
                    ]).map((seg, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: seg.color }} />
                          <span style={{ fontSize: '14px', color: '#111827' }}>{seg.label}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>{seg.pct_formatted}</span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827', minWidth: '28px', textAlign: 'right' }}>
                            {seg.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 3 Summary Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Stock value</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{metrics?.inventory_stats?.stock_value ?? '₹6.2L'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Pending GRNs</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{metrics?.inventory_stats?.pending_grns ?? 2}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Turnover (30 d)</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{metrics?.inventory_stats?.turnover_30d ?? '2.4×'}</div>
                    </div>
                  </div>
                </div>

                {/* Staff Performance Widget */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Staff performance</h2>
                      <p style={{ fontSize: '13px', color: '#4b5563', margin: '2px 0 0' }}>Items processed this shift vs target</p>
                    </div>
                    <button
                      onClick={() => handleNav('staff')}
                      style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      View staff
                    </button>
                  </div>

                  {(metrics?.staff_performance || [
                    { id: '1', initials: 'AV', name: 'Arjun Varma', role: 'Pharmacist · On duty', done: 62, target: 80, progress_pct: 78, bar_color: '#16a34a', tat: '6.4m avg' },
                    { id: '2', initials: 'SN', name: 'Sneha Nair', role: 'Pharmacist · On duty', done: 48, target: 60, progress_pct: 80, bar_color: '#16a34a', tat: '7.8m avg' },
                    { id: '3', initials: 'RK', name: 'Rajesh Kumar', role: 'Inventory Manager · On duty', done: 34, target: 40, progress_pct: 85, bar_color: '#16a34a', tat: 'tasks' },
                    { id: '4', initials: 'MS', name: 'Meghna Sengupta', role: 'Pharmacy Tech · On break', done: 24, target: 50, progress_pct: 48, bar_color: '#f59e0b', tat: '5.9m avg' }
                  ]).map(perf => (
                    <div key={perf.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f3f4f6', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
                            {perf.initials}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{perf.name}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{perf.role}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{perf.done} / {perf.target}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{perf.tat}</div>
                        </div>
                      </div>
                      <div style={{ height: '6px', borderRadius: '9999px', background: '#f3f4f6', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, perf.progress_pct)}%`, background: perf.bar_color, borderRadius: '9999px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overview Row 3: Recent Activity Feed */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Recent activity</h2>
                    <p style={{ fontSize: '13px', color: '#4b5563', margin: '2px 0 0' }}>Live feed across OPD, IPD and the store</p>
                  </div>
                  <button
                    onClick={() => handleNav('audit')}
                    style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Full audit log
                  </button>
                </div>

                {(metrics?.recent_activity_feed || [
                  { time: '10:41', icon: 'AlertTriangle', title: 'Allergy override logged on RX-24116', subtitle: 'Arjun Varma · OPD Counter 2', badge: { text: 'Override', bg: '#fef2f2', fg: '#dc2626', bd: '#fecaca' } },
                  { time: '10:38', icon: 'PackageX', title: 'Stock adjusted · Enoxaparin −4', subtitle: 'Rajesh Kumar · damage in transit', badge: { text: 'Adjustment', bg: '#fffbeb', fg: '#b45309', bd: '#fde68a' } },
                  { time: '10:36', icon: 'ShoppingBag', title: 'OTC sale INV-OTC-0584 · ₹117.00', subtitle: 'Arjun Varma · cash', badge: { text: 'Sale', bg: '#f0fdf4', fg: '#16a34a', bd: '#bbf7d0' } },
                  { time: '10:21', icon: 'Lock', title: 'Tramadol 50 mg dispensed · CDR-0914', subtitle: 'Witness Dr. Pooja Shah', badge: { text: 'CD', bg: '#111827', fg: '#ffffff', bd: '#111827' } },
                  { time: '10:12', icon: 'RotateCcw', title: 'Ward return RW-031 credited', subtitle: 'Sneha Nair · Ward 4B', badge: { text: 'Return', bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' } },
                  { time: '09:20', icon: 'Truck', title: 'WR-5506 issued to Ward 3C', subtitle: 'Sneha Nair · received by Leena P', badge: { text: 'Issued', bg: '#f0fdf4', fg: '#16a34a', bd: '#bbf7d0' } }
                ]).map((feed, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 32px 1fr auto', gap: '12px', alignItems: 'center', minHeight: '56px', padding: '8px 20px', borderTop: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{feed.time}</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f9fafb', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={16} color="#4b5563" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14px', color: '#111827' }}>{feed.title}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{feed.subtitle}</div>
                    </div>
                    {renderBadge(feed.badge.bg, feed.badge.fg, feed.badge.bd, feed.badge.text)}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* SECTION M: MASTER-DETAIL — compact list (left) drives a wide detail panel (right) on every list tab */}
          {md && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) minmax(0, 2.3fr)', gap: '16px', alignItems: 'start' }}>
              {/* Left: list */}
              <div style={{ ...PANEL, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{md.title}</h2>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1px 8px', borderRadius: '9999px', whiteSpace: 'nowrap' }}>
                        {md.rows.length === md.total ? md.total : `${md.rows.length} of ${md.total}`}
                      </span>
                    </div>
                    {activeTab === 'staff' && (
                      <button
                        type="button"
                        onClick={handleOpenAddStaff}
                        aria-keyshortcuts="Alt+N"
                        title="Add staff (Alt+N)"
                        style={{ whiteSpace: 'nowrap', height: '40px', padding: '0 14px', borderRadius: '10px', border: '1px solid #2563eb', backgroundColor: '#2563eb', fontSize: '14px', fontWeight: 600, color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                      >
                        <Plus size={18} />
                        Add Staff
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{md.desc}</p>

                  <div style={{ position: 'relative' }}>
                    <Search size={18} color="#2563eb" style={{ position: 'absolute', left: '12px', top: '11px', pointerEvents: 'none' }} />
                    <input
                      ref={listSearchRef}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => handleListKeyDown(e, true)}
                      placeholder={`${md.searchPh}…`}
                      aria-label={md.searchPh}
                      aria-keyshortcuts="/"
                      aria-controls="pa-md-list"
                      aria-activedescendant={mdActiveKey ? domId(mdActiveKey) : undefined}
                      style={{ width: '100%', height: '40px', padding: '0 64px 0 40px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    {searchQuery ? (
                      <button type="button" onClick={() => { setSearchQuery(''); listSearchRef.current?.focus(); }} aria-label="Clear search" style={{ position: 'absolute', right: '10px', top: '10px', width: '20px', height: '20px', borderRadius: '50%', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                        <X size={13} />
                      </button>
                    ) : (
                      <span className="pa-kbd" style={{ position: 'absolute', right: '10px', top: '11px' }}>/</span>
                    )}
                  </div>

                  <div role="group" aria-label="Filters" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {md.pillCounts.map(([k, label, count]) => {
                      const on = filterPill === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setFilterPill(k)}
                          aria-pressed={on}
                          style={{ height: '32px', padding: '0 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', background: on ? '#2563eb' : '#ffffff', color: on ? '#ffffff' : '#4b5563', border: `1px solid ${on ? '#2563eb' : '#e5e7eb'}`, boxShadow: on ? '0 1px 3px rgba(37,99,235,0.25)' : 'none' }}
                        >
                          <span>{label}</span>
                          <span style={{ fontSize: '12px', fontWeight: 600, padding: '0 6px', borderRadius: '4px', background: on ? 'rgba(255,255,255,0.22)' : '#f1f5f9', color: on ? '#ffffff' : '#64748b' }}>{count}</span>
                        </button>
                      );
                    })}
                  </div>

                  {activeTab === 'reports' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Revenue today</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginTop: '2px' }}>{metrics ? metrics.kpis.revenue_today_inr : '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>OTC revenue</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginTop: '2px' }}>{metrics ? metrics.kpis.revenue_otc_inr : '—'}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  id="pa-md-list"
                  role="listbox"
                  aria-label={md.title}
                  onKeyDown={e => handleListKeyDown(e)}
                  style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto', borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column' }}
                >
                  {md.rows.length === 0 ? (
                    <div style={{ padding: '36px 16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>Nothing matches this search or filter.</div>
                  ) : (
                    md.rows.map(row => {
                      const isSel = row.key === mdActiveKey;
                      const done = row.progress && row.progress.pct >= 100;
                      return (
                        <div
                          key={row.key}
                          id={domId(row.key)}
                          role="option"
                          aria-selected={isSel}
                          tabIndex={isSel ? 0 : -1}
                          className="pa-row"
                          onClick={() => mdSelect(row.key)}
                          onFocus={() => mdSelect(row.key)}
                          onDoubleClick={() => runPrimaryAction(row.key)}
                          style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', borderLeft: `3px solid ${isSel ? '#2563eb' : 'transparent'}`, background: isSel ? '#eff6ff' : '#ffffff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px', }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span title={row.title} style={{ flex: 1, minWidth: 0, fontSize: '14px', fontWeight: 600, color: isSel ? '#1d4ed8' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</span>
                            <span style={{ flexShrink: 0 }}>{row.badge}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.sub}</div>
                          {(row.metaLeft || row.metaRight) && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '12px', color: '#475569' }}>
                              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.metaLeft}</span>
                              <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>{row.metaRight}</span>
                            </div>
                          )}
                          {row.progress && (done ? (
                            <span className="pa-fade-in" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#15803d' }}>
                              <CheckCircle2 size={14} /> {row.progress.doneLabel}
                            </span>
                          ) : (
                            <span
                              role="progressbar"
                              aria-valuenow={row.progress.pct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${row.progress.pct}% complete`}
                              style={{ display: 'block', height: '6px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}
                            >
                              <span className="pa-bar" style={{ display: 'block', height: '6px', width: `${row.progress.pct}%`, borderRadius: '3px', background: '#2563eb' }} />
                            </span>
                          ))}
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '12px 16px', fontSize: '12px', color: '#6b7280', borderTop: '1px solid #e5e7eb' }}>
                  <span>{md.rows.length} of {md.total} shown</span>
                  <span>↑ ↓ move · Enter {md.primary}</span>
                </div>
              </div>

              {/* Right: detail */}
              <div
                ref={detailRef}
                tabIndex={-1}
                aria-label={`${md.detail} details`}
                style={{ ...PANEL, position: 'sticky', top: '76px', maxHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', outline: 'none' }}
              >
                {activeTab === 'staff' ? (
                <>{!activeStaff ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>Select a staff member to see their shift, productivity and compliance.</div>
                ) : (() => {
                  const staff = activeStaff;
                  const pct = staff.target ? Math.round((staff.done / staff.target) * 100) : 0;
                  return (
                    <>
                      <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <span style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                            {staff.name.split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <h3 aria-live="polite" style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>{staff.name}</h3>
                              {getStatusBadge(staff.status)}
                            </div>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>{staff.role} · {staff.id} · {staff.area}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="pa-focus"
                          onClick={() => handleOpenEditStaff(staff)}
                          title="Edit profile (Enter on the selected row)"
                          style={{ height: '40px', padding: '0 16px', borderRadius: '10px', border: '1px solid #d1d5db', background: '#ffffff', color: '#111827', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}
                        >
                          <Edit2 size={16} />
                          Complete / Edit Profile
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
                        {[
                          { l: 'Shift', v: staff.shift, n: staff.status === 'On duty' ? 'Currently on duty' : staff.status },
                          { l: 'Processed', v: String(staff.done), n: `Target ${staff.target}` },
                          { l: 'Of Target', v: `${pct}%`, n: pct >= 80 ? 'On pace' : pct >= 50 ? 'Below pace' : 'Well below pace', c: pct >= 80 ? '#16a34a' : pct >= 50 ? '#111827' : '#b45309' },
                          { l: 'Turnaround', v: staff.tat, n: 'Average per order' },
                        ].map(b => (
                          <div key={b.l} style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{b.l}</div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: b.c || '#111827', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.v}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>{b.n}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>Staff performance</div>
                          {pct >= 100 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: '#15803d' }}>
                              <CheckCircle2 size={18} /> Target met · {staff.done} of {staff.target} processed
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to target" style={{ flex: 1, height: '8px', borderRadius: '4px', background: '#f1f5f9', overflow: 'hidden' }}>
                                <span className="pa-bar" style={{ display: 'block', height: '8px', width: `${pct}%`, borderRadius: '4px', background: '#2563eb' }} />
                              </span>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{staff.done} of {staff.target} processed</span>
                            </div>
                          )}
                        </div>

                        <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Safety &amp; compliance</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Allergy overrides today</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>Each logged with reason</div>
                            </div>
                            {staff.ovr > 0 ? renderBadge('#fef2f2', '#dc2626', '#fecaca', String(staff.ovr)) : renderBadge('#f0fdf4', '#15803d', '#bbf7d0', '0')}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', padding: '12px 14px' }}>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Controlled drug entries</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>Dispensed or witnessed</div>
                            </div>
                            {renderBadge('#111827', '#ffffff', '#111827', String(staff.cd))}
                          </div>
                        </div>

                        <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Recent actions</div>
                          {staff.recent.length === 0 ? (
                            <div style={{ padding: '12px 14px', fontSize: '13px', color: '#6b7280' }}>No actions recorded this shift.</div>
                          ) : (
                            staff.recent.map((rec, rIdx) => (
                              <div key={rIdx} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', padding: '10px 14px', borderBottom: rIdx < staff.recent.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                <div style={{ fontSize: '13px', color: '#111827' }}>{rec}</div>
                                {renderBadge('#f3f4f6', '#4b5563', '#e5e7eb', 'Logged')}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}</>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b' }}>{md.detail}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '1px 8px' }}>Read-only</span>
                    </div>
                    {!mdActiveKey ? (
                      <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>Select an item from the list to see its details.</div>
                    ) : (
                      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                    {/* PHARMACY OPERATIONS DRAWER CONTENT */}
                    {activeTab === 'ops' && (() => {
                      const pt = pointsList.find(x => x.id === mdActiveKey);
                      if (!pt) return null;
                      return (
                        <>
                          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>{pt.name}</h3>
                                {getStatusBadge(pt.status)}
                              </div>
                              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{pt.type} · Lead {pt.lead}</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                              {[['Queue', String(pt.queue)], ['Turnaround', pt.tat], ['SLA', pt.sla], ['Handled today', String(pt.today)]].map(([l, v]) => (
                                <div key={l}>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{l}</div>
                                  <div style={{ fontSize: '20px', fontWeight: 700, color: l === 'Queue' && pt.queue > 6 ? '#b45309' : '#111827' }}>{v}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {pt.status !== 'Normal' && (
                            <div style={{ padding: '16px 20px' }}>
                              <div style={{ padding: '12px', borderRadius: '10px', background: pt.status === 'Busy' ? '#fffbeb' : '#fef2f2', border: `1px solid ${pt.status === 'Busy' ? '#fde68a' : '#fecaca'}` }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <AlertTriangle size={16} color={pt.status === 'Busy' ? '#b45309' : '#dc2626'} />
                                  <span style={{ fontSize: '14px', fontWeight: 600, color: pt.status === 'Busy' ? '#b45309' : '#dc2626' }}>
                                    {pt.status === 'Busy' ? 'Queue above normal load' : 'No cover for the night shift'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '4px' }}>
                                  {pt.status === 'Busy' ? 'Consider moving staff from a quieter service point.' : 'Assign staff in Duty scheduling (Alt+3).'}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* DUTY SCHEDULING DRAWER CONTENT */}
                    {activeTab === 'schedule' && (() => {
                      const sh = shiftsList.find(s => s.id === mdActiveKey);
                      if (!sh) return null;
                      return (
                        <>
                          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>{sh.area}</h3>
                                {getStatusBadge(sh.status)}
                              </div>
                              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                                {sh.day} · {sh.slot}
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Required</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{sh.need}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Assigned</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: sh.staff.length < sh.need ? '#dc2626' : '#111827' }}>{sh.staff.length}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Gap</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{Math.max(0, sh.need - sh.staff.length)}</div>
                              </div>
                            </div>
                          </div>

                          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280', marginBottom: '8px' }}>
                                ASSIGNED STAFF
                              </div>
                              {sh.staff.length ? sh.staff.map((name, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{name}</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Confirmed</div>
                                  </div>
                                  {renderBadge('#f0fdf4', '#15803d', '#bbf7d0', 'On roster')}
                                </div>
                              )) : (
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#dc2626' }}>No one assigned</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Minimum staffing not met</div>
                                  </div>
                                  {renderBadge('#fef2f2', '#dc2626', '#fecaca', 'Gap')}
                                </div>
                              )}
                            </div>

                            {sh.status !== 'Covered' && (
                              <div style={{ padding: '12px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <Users size={16} color="#b45309" />
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#b45309' }}>Suggested cover</span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '4px' }}>
                                  Divya R (available) · Meghna S (on call)
                                </div>
                              </div>
                            )}

                            <button
                              onClick={() => handleOpenAssignShift(sh)}
                              style={{ height: '40px', borderRadius: '10px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                            >
                              Edit shift assignment
                            </button>
                          </div>
                        </>
                      );
                    })()}

                    {/* CONTROLLED DRUG DRAWER CONTENT */}
                    {activeTab === 'cd' && (() => {
                      const cd = cdmList.find(c => c.code === mdActiveKey);
                      if (!cd) return null;
                      const isDisc = cd.shelf !== cd.bal;
                      return (
                        <>
                          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>{cd.name}</h3>
                                {!isDisc ? renderBadge('#f0fdf4', '#15803d', '#bbf7d0', 'Reconciled') : renderBadge('#fef2f2', '#dc2626', '#fecaca', 'Discrepancy')}
                              </div>
                              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                                {cd.code} · Schedule {cd.sched} · last count {cd.last}
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Register</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{cd.bal}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Shelf count</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: isDisc ? '#dc2626' : '#111827' }}>{cd.shelf}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Issued today</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{cd.iss}</div>
                              </div>
                            </div>
                          </div>

                          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {isDisc && (
                              <div style={{ padding: '12px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <XCircle size={16} color="#dc2626" />
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>Variance of {cd.shelf - cd.bal} unit</span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '4px' }}>
                                  Batch locked · Inventory Manager and issuing pharmacist notified · statement required within 24 h.
                                </div>
                              </div>
                            )}

                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280', marginBottom: '8px' }}>
                                MOVEMENT TODAY
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: '13px', color: '#111827' }}>Opening balance (07:00)</span>
                                {renderBadge('#f3f4f6', '#4b5563', '#e5e7eb', String(cd.open))}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: '13px', color: '#111827' }}>Received receipts</span>
                                {renderBadge('#f0fdf4', '#15803d', '#bbf7d0', `+${cd.rec}`)}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: '13px', color: '#111827' }}>Returned from wards</span>
                                {renderBadge('#eff6ff', '#1d4ed8', '#bfdbfe', `+${cd.ret}`)}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: '13px', color: '#111827' }}>Issued / dispensed</span>
                                {renderBadge('#f3f4f6', '#4b5563', '#e5e7eb', `−${cd.iss}`)}
                              </div>
                            </div>

                            <button
                              onClick={() => navigate('/pharmacy/controlled-drugs')}
                              style={{ height: '40px', borderRadius: '10px', background: '#111827', color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              <Lock size={14} /> Open controlled drug register
                            </button>
                          </div>
                        </>
                      );
                    })()}

                    {/* INVENTORY HEALTH DRAWER CONTENT */}
                    {activeTab === 'inv' && (() => {
                      const item = invhList.find((i, idx) => invKey(i, idx) === mdActiveKey);
                      if (!item) return null;
                      return (
                        <>
                          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>{item.name}</h3>
                                {renderBadge(item.c === 'red' ? '#fef2f2' : '#fffbeb', item.c === 'red' ? '#dc2626' : '#b45309', item.c === 'red' ? '#fecaca' : '#fde68a', item.issue)}
                              </div>
                              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{item.cat}</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>In stock</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: item.stock === 0 ? '#dc2626' : '#111827' }}>{item.stock}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Reorder</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{item.par}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Health</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{item.c === 'red' ? 'Critical' : 'At risk'}</div>
                              </div>
                            </div>
                          </div>

                          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ padding: '12px', borderRadius: '10px', background: item.c === 'red' ? '#fef2f2' : '#fffbeb', border: `1px solid ${item.c === 'red' ? '#fecaca' : '#fde68a'}` }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <AlertTriangle size={16} color={item.c === 'red' ? '#dc2626' : '#b45309'} />
                                <span style={{ fontSize: '13px', fontWeight: 600, color: item.c === 'red' ? '#dc2626' : '#b45309' }}>Patient Impact</span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '4px' }}>
                                {item.impact}
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Rajesh Kumar</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Inventory Manager · action in store workspace</div>
                              </div>
                              {renderBadge('#f3f4f6', '#4b5563', '#e5e7eb', 'Assigned')}
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {/* SUPPLIER DRAWER CONTENT */}
                    {activeTab === 'supp' && (() => {
                      const sup = supsList.find(s => s.name === mdActiveKey);
                      if (!sup) return null;
                      return (
                        <>
                          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>{sup.name}</h3>
                                {getStatusBadge(sup.status)}
                              </div>
                              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{sup.cat}</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Lead time</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{sup.lead}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>On-time</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: sup.ontime < 80 ? '#dc2626' : '#111827' }}>{sup.ontime}%</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Open PO</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{sup.po === '—' ? 0 : 1}</div>
                              </div>
                            </div>
                          </div>

                          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Purchase Order: {sup.po}</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Raised by Rajesh Kumar · Central Store</div>
                              </div>
                              {getStatusBadge(sup.status)}
                            </div>

                            {sup.status === 'Awaiting approval' && (
                              <button
                                onClick={() => handleReviewPR(sup, 'APPROVE')}
                                style={{ height: '40px', borderRadius: '10px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                              >
                                Approve procurement budget
                              </button>
                            )}

                            {sup.status === 'Approved' && (
                              <button
                                onClick={() => handleDispatchPO(sup)}
                                style={{ height: '40px', borderRadius: '10px', background: '#15803d', color: '#fff', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                              >
                                Formal PO dispatch to vendor
                              </button>
                            )}
                          </div>
                        </>
                      );
                    })()}

                    {/* AUDIT DRAWER CONTENT */}
                    {activeTab === 'audit' && (() => {
                      const log = auditList.find(a => a.id === mdActiveKey);
                      if (!log) return null;
                      return (
                        <>
                          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>{log.act}</h3>
                                {getSeverityBadge(log.sev)}
                              </div>
                              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                                {log.time} · {log.user} · terminal {log.ip}
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Time</div>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{log.time}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Terminal</div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{log.ip}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Type</div>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>{log.sev}</div>
                              </div>
                            </div>
                          </div>

                          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280', marginBottom: '8px' }}>
                                DETAIL
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Entity Reference</div>
                                  <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#2563eb' }}>{log.ent}</div>
                                </div>
                                {renderBadge('#eff6ff', '#1d4ed8', '#bfdbfe', 'Linked')}
                              </div>
                              <div style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Recorded Audit Message</div>
                                <div style={{ fontSize: '13px', color: '#111827', marginTop: '4px' }}>{log.det}</div>
                              </div>
                            </div>

                            {(log.sev === 'Override' || log.sev === 'Discrepancy') && (
                              <div style={{ padding: '12px', borderRadius: '10px', background: log.sev === 'Override' ? '#fffbeb' : '#fef2f2', border: `1px solid ${log.sev === 'Override' ? '#fde68a' : '#fecaca'}` }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <AlertTriangle size={16} color={log.sev === 'Override' ? '#b45309' : '#dc2626'} />
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: log.sev === 'Override' ? '#b45309' : '#dc2626' }}>
                                    {log.sev === 'Override' ? 'Admin review recommended' : 'Investigation open'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '4px' }}>
                                  Visible in the weekly governance compliance report.
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}

                    {/* SETTINGS DRAWER CONTENT */}
                    {activeTab === 'settings' && (() => {
                      const sett = settingsList.find(s => s.key === mdActiveKey);
                      if (!sett) return null;
                      return (
                        <>
                          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>{sett.name}</h3>
                                {typeof sett.value === 'boolean'
                                  ? renderBadge(sett.value ? '#f0fdf4' : '#f3f4f6', sett.value ? '#15803d' : '#4b5563', sett.value ? '#bbf7d0' : '#e5e7eb', sett.value ? 'On' : 'Off')
                                  : renderBadge('#eff6ff', '#1d4ed8', '#bfdbfe', String(sett.value))}
                              </div>
                              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                                {sett.scope} · last changed {sett.by}
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Value</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                                  {typeof sett.value === 'boolean' ? (sett.value ? 'On' : 'Off') : sett.value}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Scope</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{sett.scope.split(' · ').length} areas</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Audited</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>Yes</div>
                              </div>
                            </div>
                          </div>

                          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ padding: '12px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <Info size={16} color="#1d4ed8" />
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1d4ed8' }}>Policy Impact</span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '4px' }}>
                                {sett.description}. Changes take effect at next shift rotation and are logged immutably.
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {/* REPORTS DRAWER CONTENT */}
                    {activeTab === 'reports' && (() => {
                      const rep = reportsList.find(r => r.id === mdActiveKey);
                      if (!rep) return null;
                      return (
                        <>
                          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>{rep.name}</h3>
                                {getStatusBadge(rep.status)}
                              </div>
                              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                                {rep.period} · generated {rep.gen} · {rep.owner}
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Period</div>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{rep.period}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Format</div>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{rep.fmt.split(' · ')[0]}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Metrics</div>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{rep.kv.length}</div>
                              </div>
                            </div>
                          </div>

                          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280', marginBottom: '8px' }}>
                                KEY FIGURES
                              </div>
                              {rep.kv.map(([k, v], idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                  <span style={{ fontSize: '13px', color: '#111827' }}>{k}</span>
                                  {renderBadge('#f3f4f6', '#111827', '#e5e7eb', String(v))}
                                </div>
                              ))}
                            </div>

                            {rep.status !== 'Ready' && (
                              <div style={{ padding: '12px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <Clock size={16} color="#b45309" />
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#b45309' }}>Weekly sign-off pending</span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '4px' }}>
                                  Review the open discrepancy before signing.
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                      </div>
                    )}
                  {/* Drawer Export Buttons */}
                  <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {drawerNote && (
                      <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 500 }}>
                        {drawerNote}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setDrawerNote('CSV export queued · download link sent to your email')}
                        style={{ flex: 1, height: '40px', borderRadius: '10px', background: '#fff', color: '#111827', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Export CSV
                      </button>
                      <button
                        onClick={() => setDrawerNote('PDF generated · audit trail records the export')}
                        style={{ flex: 1, height: '40px', borderRadius: '10px', background: '#fff', color: '#111827', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Export PDF
                      </button>
                    </div>
                  </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* SHIFT ASSIGNMENT MODAL */}
      {isAssignModalOpen && assigningShift && (
        <div
          onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setIsAssignModalOpen(false); } }}
          className="pa-backdrop"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div className="pa-pop" role="dialog" aria-modal="true" aria-label="Assign shift coverage" style={{ background: '#fff', borderRadius: '14px', width: '480px', maxWidth: '90%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>Assign Shift Coverage</h3>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>
                  {assigningShift.area} · {assigningShift.slot} ({assigningShift.day})
                </p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Select Staff Members (Required: {assigningShift.need})
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px' }}>
                  {staffList.map((s, sIdx) => {
                    const isSelected = selectedStaffToAssign.includes(s.name);
                    return (
                      <button
                        type="button"
                        key={s.id}
                        role="checkbox"
                        aria-checked={isSelected}
                        autoFocus={sIdx === 0}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedStaffToAssign(selectedStaffToAssign.filter(name => name !== s.name));
                          } else {
                            setSelectedStaffToAssign([...selectedStaffToAssign, s.name]);
                          }
                        }}
                        style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', border: 'none', background: isSelected ? '#eff6ff' : 'transparent' }}
                      >
                        <span>
                          <span style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{s.name}</span>
                          <span style={{ display: 'block', fontSize: '12px', color: '#6b7280' }}>{s.role} · {s.status}</span>
                        </span>
                        {isSelected && <Check size={16} color="#2563eb" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Governance / Handover Notes
                </label>
                <input
                  type="text"
                  value={shiftAssignNote}
                  onChange={e => setShiftAssignNote(e.target.value)}
                  placeholder="e.g. Assigned by Dr. Pooja Shah"
                  style={{ width: '100%', height: '38px', padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={() => setIsAssignModalOpen(false)}
                  style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: '#fff', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveShiftAssignment}
                  style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: '#2563eb', color: '#fff', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <MyProfileModal
        isOpen={isMyProfileOpen}
        onClose={() => setIsMyProfileOpen(false)}
        user={user}
        role={(role || RoleType.DEPARTMENT_ADMIN) as RoleType}
        displayName={displayName}
        designation={designation}
        initials={initials}
        onChangePasswordClick={() => {
          setIsMyProfileOpen(false);
          setIsChangePasswordOpen(true);
        }}
      />
      <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />

      {/* KEYBOARD SHORTCUTS (press ?) */}
      {isShortcutsOpen && (
        <div
          onClick={() => setIsShortcutsOpen(false)}
          onKeyDown={e => { if (e.key === 'Escape') setIsShortcutsOpen(false); }}
          className="pa-backdrop"
          style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div className="pa-pop" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={e => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: '12px', width: '520px', maxWidth: '92%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>Keyboard shortcuts</h3>
              <button type="button" autoFocus onClick={() => setIsShortcutsOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>
            {[
              ['Alt+1 … Alt+0', 'Open a sidebar section (Overview … Reports)'],
              ['/', 'Search the current list'],
              ['↑ ↓  ·  Home End', 'Move through the list'],
              ['Enter', 'Edit profile (Staff) · Assign staff (Duty scheduling) · Open details'],
              ['Esc', 'Clear search · close dialogs and menus'],
              ['Alt+N', 'Add staff (Staff & roster)'],
              ['Alt+L  ·  Alt+R', 'Audit logs · Daily report'],
              ['Alt+P', 'Account menu'],
              ['?', 'Show this list'],
            ].map(([k, d]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '10px 0', borderBottom: '1px solid #f3f4f6', fontSize: '14px' }}>
                <span style={{ color: '#374151' }}>{d}</span>
                <span className="pa-kbd" style={{ fontSize: '12px', alignSelf: 'center' }}>{k}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PHARMACY STAFF ADD / EDIT / ONBOARDING MODAL */}
      <PharmacyStaffModal
        isOpen={isStaffModalOpen}
        onClose={() => {
          setIsStaffModalOpen(false);
          setEditingStaffForModal(null);
        }}
        onStaffSaved={handleStaffSaved}
        editingStaff={editingStaffForModal}
      />
    </div>
  );
};

export default PharmacyAdminWorkspace;
