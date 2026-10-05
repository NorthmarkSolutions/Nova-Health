import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronRight,
  Filter,
  Download,
  Check,
  X,
  AlertCircle,
  Plus,
  Edit2,
  Sparkles
} from 'lucide-react';
import { PharmacyStaffModal } from './PharmacyStaffModal';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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

export const PharmacyAdminWorkspace: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
  const [selectedSupIndex, setSelectedSupIndex] = useState<number>(1);
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

  // Current Breadcrumb Title
  const crumbTitle = useMemo(() => {
    const item = navGroups.flatMap(g => g.items).find(i => i.key === activeTab);
    return item ? item.label : 'Overview';
  }, [activeTab]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#f9fafb', fontFamily: 'Inter, sans-serif' }}>
      {/* 1. Left Navigation Sidebar */}
      <aside style={{ width: '260px', flexShrink: 0, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 20px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '15px' }}>
            N
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>North Hospital</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Clinical Enterprise HMS</div>
          </div>
        </div>

        {/* Current Department Badge */}
        <div style={{ margin: '0 16px', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Current department</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', background: '#eff6ff', borderRadius: '4px', padding: '1px 6px' }}>
              ADMIN
            </span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '4px' }}>Pharmacy</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>OPD · IPD · Central store</div>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
          {navGroups.map((group, gIdx) => (
            <div key={gIdx}>
              <div style={{ padding: '16px 8px 8px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                {group.label}
              </div>
              {group.items.map(item => {
                const isActive = activeTab === item.key;
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.key}
                    onClick={() => handleNav(item.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#2563eb' : '#374151',
                      background: isActive ? '#eff6ff' : 'transparent',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.background = '#f3f4f6';
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <IconComponent size={18} color={isActive ? '#2563eb' : '#6b7280'} />
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                    {item.count && (
                      <span style={{ fontSize: '12px', fontWeight: 600, color: item.isRed ? '#dc2626' : '#6b7280' }}>
                        {item.count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f3f4f6', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
            PS
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Dr. Pooja Shah</div>
            <div style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Pharmacy Admin · Chief Pharmacist
            </div>
          </div>
          <button
            onClick={() => logout ? logout() : navigate('/login')}
            style={{ fontSize: '12px', color: '#374151', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            Log out
          </button>
        </div>
      </aside>

      {/* 2. Main Workspace Body */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Sticky Top Breadcrumbs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', height: '52px', padding: '0 24px', borderBottom: '1px solid #e5e7eb', background: '#fff', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
            <span>North Hospital</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span>Pharmacy · Admin</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ color: '#111827', fontWeight: 600 }}>{crumbTitle}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '8px', fontSize: '12px', fontWeight: 600, color: '#374151', background: '#f3f4f6', borderRadius: '4px', padding: '2px 6px' }}>
              Read-only
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', color: '#374151', whiteSpace: 'nowrap' }}>
            <Calendar size={14} color="#6b7280" />
            Today · 01 Oct 2026 · 10:44
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
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: '30px', fontWeight: 700, color: '#111827', letterSpacing: '-0.01em', margin: 0 }}>Pharmacy Admin Workspace</h1>
              <p style={{ fontSize: '14px', color: '#4b5563', marginTop: '6px', marginBottom: 0 }}>
                Department oversight across OPD, IPD and the central store · staff, reports, audit trail and controlled drugs.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleNav('audit')}
                style={{ height: '40px', padding: '0 16px', borderRadius: '10px', whiteSpace: 'nowrap', background: '#fff', color: '#111827', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Audit logs
              </button>
              <button
                onClick={() => handleNav('reports')}
                style={{ height: '40px', padding: '0 16px', borderRadius: '10px', whiteSpace: 'nowrap', background: '#2563eb', color: '#fff', border: '1px solid #2563eb', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Daily report
              </button>
            </div>
          </div>

          {/* 5 Top KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
            {/* KPI 1 */}
            <div
              onClick={() => handleNav('overview')}
              style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', cursor: 'pointer', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#4b5563' }}>Prescription volume</span>
                <span style={{ fontSize: '12px', fontWeight: 600, borderRadius: '4px', padding: '2px 6px', background: '#f3f4f6', color: '#374151' }}>
                  today
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>
                  {metrics?.kpis?.rx_volume ?? 214}
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  OPD {metrics?.kpis?.rx_breakdown?.opd ?? 142} · IPD {metrics?.kpis?.rx_breakdown?.ipd ?? 58} · OTC {metrics?.kpis?.rx_breakdown?.otc ?? 14}
                </span>
              </div>
            </div>

            {/* KPI 2 */}
            <div
              onClick={() => handleNav('reports')}
              style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', cursor: 'pointer', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#4b5563' }}>Dispensed today</span>
                <span style={{ fontSize: '12px', fontWeight: 600, borderRadius: '4px', padding: '2px 6px', background: '#f0fdf4', color: '#16a34a' }}>
                  {metrics?.kpis?.dispensed_pct_received ?? 79}% of received
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>
                  {metrics?.kpis?.dispensed_today ?? 168}
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>fulfilled</span>
              </div>
            </div>

            {/* KPI 3 */}
            <div
              onClick={() => handleNav('inv', 'out')}
              style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', cursor: 'pointer', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#4b5563' }}>Inventory health</span>
                <span style={{ fontSize: '12px', fontWeight: 600, borderRadius: '4px', padding: '2px 6px', background: '#fef2f2', color: '#dc2626' }}>
                  {stockoutCount} out of stock
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>
                  {metrics?.kpis?.inventory_health_pct ?? 86}%
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>SKUs healthy</span>
              </div>
            </div>

            {/* KPI 4 */}
            <div
              onClick={() => handleNav('staff')}
              style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', cursor: 'pointer', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#4b5563' }}>Staff productivity</span>
                <span style={{ fontSize: '12px', fontWeight: 600, borderRadius: '4px', padding: '2px 6px', background: '#eff6ff', color: '#1d4ed8' }}>
                  {onDutyCount} on duty
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>
                  {metrics?.kpis?.avg_turnaround_mins ?? '6.8'}
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>min avg OPD turnaround</span>
              </div>
            </div>

            {/* KPI 5 */}
            <div
              onClick={() => handleNav('reports')}
              style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', cursor: 'pointer', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#4b5563' }}>Revenue</span>
                <span style={{ fontSize: '12px', fontWeight: 600, borderRadius: '4px', padding: '2px 6px', background: '#f0fdf4', color: '#16a34a' }}>
                  {metrics?.kpis?.revenue_otc_inr ?? 'OTC ₹13.6K'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>
                  {metrics?.kpis?.revenue_today_inr ?? '₹1.84L'}
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>today</span>
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

          {/* SECTION B: TABULAR + RIGHT INSPECTION DRAWER (For tabs !== 'overview') */}
          {activeTab !== 'overview' && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Left Main Table Card */}
              <div style={{ flex: '1 1 620px', minWidth: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>
                        {activeTab === 'staff' && 'Staff & roster'}
                        {activeTab === 'schedule' && 'Duty scheduling'}
                        {activeTab === 'ops' && 'Pharmacy operations'}
                        {activeTab === 'inv' && 'Inventory health'}
                        {activeTab === 'cd' && 'Controlled drug monitoring'}
                        {activeTab === 'supp' && 'Suppliers & procurement'}
                        {activeTab === 'audit' && 'Audit logs'}
                        {activeTab === 'settings' && 'Department settings'}
                        {activeTab === 'reports' && 'Reports'}
                      </h2>
                      <p style={{ fontSize: '13px', color: '#4b5563', margin: '2px 0 0' }}>
                        {activeTab === 'staff' && 'Pharmacy roster and productivity this shift'}
                        {activeTab === 'schedule' && 'Shift coverage by service point · minimum staffing per policy'}
                        {activeTab === 'ops' && 'Live load and turnaround by service point'}
                        {activeTab === 'inv' && 'Exceptions that affect patient care · managed by the Inventory Manager'}
                        {activeTab === 'cd' && 'Daily movement and physical count vs register balance'}
                        {activeTab === 'supp' && 'Vendor performance and purchase orders awaiting admin approval'}
                        {activeTab === 'audit' && 'Immutable trail of every pharmacy action · user, time and terminal'}
                        {activeTab === 'settings' && 'Pharmacy policies applied across OPD, IPD, OTC and the store'}
                        {activeTab === 'reports' && 'Generated automatically from dispensing, billing and inventory data'}
                      </p>
                    </div>
                    {/* Search & Actions Container */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* Search Box */}
                      <div style={{ position: 'relative' }}>
                        <input
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search"
                          style={{ height: '40px', width: '220px', maxWidth: '100%', padding: '0 12px 0 34px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', outline: 'none' }}
                        />
                        <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                      </div>

                      {/* Add Staff Button (OPD & Pharmacy departmental pattern) */}
                      {activeTab === 'staff' && (
                        <button
                          onClick={handleOpenAddStaff}
                          style={{
                            whiteSpace: 'nowrap',
                            height: '40px',
                            padding: '0 16px',
                            borderRadius: '10px',
                            border: '1px solid #2563eb',
                            backgroundColor: '#2563eb',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Plus size={16} />
                          Add Staff
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {activeTab === 'staff' && ['all', 'On duty', 'On break', 'Off shift'].map(k => (
                      <button
                        key={k}
                        onClick={() => setFilterPill(k)}
                        style={{ height: '32px', padding: '0 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: filterPill === k ? '#eff6ff' : '#fff', color: filterPill === k ? '#2563eb' : '#374151', border: `1px solid ${filterPill === k ? '#bfdbfe' : '#e5e7eb'}` }}
                      >
                        {k === 'all' ? `All · ${staffList.length}` : `${k} · ${staffList.filter(s => s.status === k).length}`}
                      </button>
                    ))}
                    {activeTab === 'schedule' && ['all', 'Today', 'Tomorrow', 'Understaffed', 'Open'].map(k => (
                      <button
                        key={k}
                        onClick={() => setFilterPill(k)}
                        style={{ height: '32px', padding: '0 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: filterPill === k ? '#eff6ff' : '#fff', color: filterPill === k ? '#2563eb' : '#374151', border: `1px solid ${filterPill === k ? '#bfdbfe' : '#e5e7eb'}` }}
                      >
                        {k === 'all' ? 'All' : k}
                      </button>
                    ))}
                    {activeTab === 'ops' && ['all', 'Normal', 'Busy', 'Night gap'].map(k => (
                      <button
                        key={k}
                        onClick={() => setFilterPill(k)}
                        style={{ height: '32px', padding: '0 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: filterPill === k ? '#eff6ff' : '#fff', color: filterPill === k ? '#2563eb' : '#374151', border: `1px solid ${filterPill === k ? '#bfdbfe' : '#e5e7eb'}` }}
                      >
                        {k === 'all' ? 'All' : k}
                      </button>
                    ))}
                    {activeTab === 'inv' && [['all', 'All'], ['out', 'Out of stock'], ['risk', 'Low / expiring']].map(([k, label]) => (
                      <button
                        key={k}
                        onClick={() => setFilterPill(k)}
                        style={{ height: '32px', padding: '0 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: filterPill === k ? '#eff6ff' : '#fff', color: filterPill === k ? '#2563eb' : '#374151', border: `1px solid ${filterPill === k ? '#bfdbfe' : '#e5e7eb'}` }}
                      >
                        {label}
                      </button>
                    ))}
                    {activeTab === 'cd' && [['all', 'All'], ['disc', 'Discrepancies'], ['X', 'Schedule X'], ['H1', 'Schedule H1']].map(([k, label]) => (
                      <button
                        key={k}
                        onClick={() => setFilterPill(k)}
                        style={{ height: '32px', padding: '0 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: filterPill === k ? '#eff6ff' : '#fff', color: filterPill === k ? '#2563eb' : '#374151', border: `1px solid ${filterPill === k ? '#bfdbfe' : '#e5e7eb'}` }}
                      >
                        {label}
                      </button>
                    ))}
                    {activeTab === 'supp' && ['all', 'Awaiting approval', 'Approved'].map(k => (
                      <button
                        key={k}
                        onClick={() => setFilterPill(k)}
                        style={{ height: '32px', padding: '0 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: filterPill === k ? '#eff6ff' : '#fff', color: filterPill === k ? '#2563eb' : '#374151', border: `1px solid ${filterPill === k ? '#bfdbfe' : '#e5e7eb'}` }}
                      >
                        {k === 'all' ? 'All' : k}
                      </button>
                    ))}
                    {activeTab === 'audit' && ['all', 'Override', 'Controlled', 'Discrepancy', 'Adjustment', 'Refund', 'Info'].map(k => (
                      <button
                        key={k}
                        onClick={() => setFilterPill(k)}
                        style={{ height: '32px', padding: '0 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: filterPill === k ? '#eff6ff' : '#fff', color: filterPill === k ? '#2563eb' : '#374151', border: `1px solid ${filterPill === k ? '#bfdbfe' : '#e5e7eb'}` }}
                      >
                        {k === 'all' ? `All · ${auditList.length}` : `${k} · ${auditList.filter(a => a.sev === k).length}`}
                      </button>
                    ))}
                    {activeTab === 'settings' && ['all', 'OPD', 'IPD', 'OTC', 'Store', 'Billing'].map(k => (
                      <button
                        key={k}
                        onClick={() => setFilterPill(k)}
                        style={{ height: '32px', padding: '0 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: filterPill === k ? '#eff6ff' : '#fff', color: filterPill === k ? '#2563eb' : '#374151', border: `1px solid ${filterPill === k ? '#bfdbfe' : '#e5e7eb'}` }}
                      >
                        {k === 'all' ? 'All' : k}
                      </button>
                    ))}
                    {activeTab === 'reports' && ['all', 'Today', 'This week', 'Next 90 days'].map(k => (
                      <button
                        key={k}
                        onClick={() => setFilterPill(k)}
                        style={{ height: '32px', padding: '0 12px', borderRadius: '9999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: filterPill === k ? '#eff6ff' : '#fff', color: filterPill === k ? '#2563eb' : '#374151', border: `1px solid ${filterPill === k ? '#bfdbfe' : '#e5e7eb'}` }}
                      >
                        {k === 'all' ? 'All' : k}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table Component */}
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: '820px' }}>
                    {/* STAFF TABLE */}
                    {activeTab === 'staff' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, 1.4fr) minmax(150px, 1.1fr) 120px 110px 100px 110px 90px', alignItems: 'center', height: '44px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', color: '#4b5563' }}>
                          <div style={{ padding: '0 16px' }}>NAME · ID</div>
                          <div style={{ padding: '0 16px' }}>ROLE · AREA</div>
                          <div style={{ padding: '0 16px' }}>SHIFT</div>
                          <div style={{ padding: '0 16px' }}>PROCESSED</div>
                          <div style={{ padding: '0 16px' }}>TURNAROUND</div>
                          <div style={{ padding: '0 16px' }}>STATUS</div>
                          <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                        </div>
                        {staffList
                          .filter(s => (filterPill === 'all' || s.status === filterPill) && (!searchQuery || (s.name + s.role + s.id).toLowerCase().includes(searchQuery.toLowerCase())))
                          .map(s => {
                            const isSelected = selectedStaffId === s.id;
                            return (
                              <div
                                key={s.id}
                                onClick={() => setSelectedStaffId(s.id)}
                                style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.4fr) minmax(140px, 1.1fr) 110px 100px 90px 100px 130px', alignItems: 'center', minHeight: '56px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: isSelected ? '#eff6ff' : '#fff' }}
                              >
                                <div style={{ padding: '10px 16px' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{s.name}</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{s.id}</div>
                                </div>
                                <div style={{ padding: '10px 16px' }}>
                                  <div style={{ fontSize: '14px', color: '#111827' }}>{s.role}</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{s.area}</div>
                                </div>
                                <div style={{ padding: '10px 16px', fontSize: '13px', color: '#4b5563' }}>{s.shift}</div>
                                <div style={{ padding: '10px 16px' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{s.done} / {s.target}</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{Math.round(s.done / s.target * 100)}% of target</div>
                                </div>
                                <div style={{ padding: '10px 16px', fontSize: '14px', color: '#111827' }}>{s.tat}</div>
                                <div style={{ padding: '10px 16px' }}>{getStatusBadge(s.status)}</div>
                                <div style={{ padding: '10px 16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      setSelectedStaffId(s.id);
                                    }}
                                    style={{ height: '32px', padding: '0 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: isSelected ? '#2563eb' : '#fff', color: isSelected ? '#fff' : '#111827', border: `1px solid ${isSelected ? '#2563eb' : '#d1d5db'}` }}
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleOpenEditStaff(s);
                                    }}
                                    title="Edit & complete profile"
                                    style={{ height: '32px', padding: '0 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <Edit2 size={13} />
                                    Edit
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </>
                    )}

                    {/* DUTY SCHEDULING TABLE */}
                    {activeTab === 'schedule' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(170px, 1.2fr) minmax(160px, 1.2fr) minmax(170px, 1.3fr) 90px 120px 90px', alignItems: 'center', height: '44px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', color: '#4b5563' }}>
                          <div style={{ padding: '0 16px' }}>SHIFT</div>
                          <div style={{ padding: '0 16px' }}>SERVICE POINT</div>
                          <div style={{ padding: '0 16px' }}>ASSIGNED</div>
                          <div style={{ padding: '0 16px' }}>COVER</div>
                          <div style={{ padding: '0 16px' }}>STATUS</div>
                          <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                        </div>
                        {shiftsList
                          .filter(sh => (filterPill === 'all' || sh.day === filterPill || sh.status === filterPill) && (!searchQuery || (sh.area + sh.staff.join(' ')).toLowerCase().includes(searchQuery.toLowerCase())))
                          .map(sh => {
                            const isSelected = selectedShiftId === sh.id;
                            return (
                              <div
                                key={sh.id}
                                onClick={() => setSelectedShiftId(sh.id)}
                                style={{ display: 'grid', gridTemplateColumns: 'minmax(170px, 1.2fr) minmax(160px, 1.2fr) minmax(170px, 1.3fr) 90px 120px 90px', alignItems: 'center', minHeight: '56px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: isSelected ? '#eff6ff' : '#fff' }}
                              >
                                <div style={{ padding: '10px 16px' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{sh.slot}</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{sh.day}</div>
                                </div>
                                <div style={{ padding: '10px 16px', fontSize: '14px', color: '#111827' }}>{sh.area}</div>
                                <div style={{ padding: '10px 16px', fontSize: '14px', color: sh.staff.length ? '#111827' : '#dc2626' }}>
                                  {sh.staff.join(', ') || 'Unassigned'}
                                </div>
                                <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                                  {sh.staff.length} / {sh.need}
                                </div>
                                <div style={{ padding: '10px 16px' }}>{getStatusBadge(sh.status)}</div>
                                <div style={{ padding: '10px 16px', textAlign: 'right' }}>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleOpenAssignShift(sh);
                                    }}
                                    style={{ height: '32px', padding: '0 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                                  >
                                    Assign
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </>
                    )}

                    {/* PHARMACY OPERATIONS TABLE */}
                    {activeTab === 'ops' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, 1.4fr) minmax(150px, 1.1fr) 80px 110px 110px 110px 90px', alignItems: 'center', height: '44px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', color: '#4b5563' }}>
                          <div style={{ padding: '0 16px' }}>SERVICE POINT</div>
                          <div style={{ padding: '0 16px' }}>LEAD</div>
                          <div style={{ padding: '0 16px' }}>QUEUE</div>
                          <div style={{ padding: '0 16px' }}>TURNAROUND</div>
                          <div style={{ padding: '0 16px' }}>HANDLED</div>
                          <div style={{ padding: '0 16px' }}>STATUS</div>
                          <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                        </div>
                        {pointsList
                          .filter(p => (filterPill === 'all' || p.status === filterPill) && (!searchQuery || (p.name + p.lead).toLowerCase().includes(searchQuery.toLowerCase())))
                          .map(p => {
                            const isSelected = selectedPointId === p.id;
                            return (
                              <div
                                key={p.id}
                                onClick={() => setSelectedPointId(p.id)}
                                style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, 1.4fr) minmax(150px, 1.1fr) 80px 110px 110px 110px 90px', alignItems: 'center', minHeight: '56px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: isSelected ? '#eff6ff' : '#fff' }}
                              >
                                <div style={{ padding: '10px 16px' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{p.name}</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{p.type}</div>
                                </div>
                                <div style={{ padding: '10px 16px', fontSize: '14px', color: '#111827' }}>{p.lead}</div>
                                <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: p.queue > 6 ? '#b45309' : '#111827' }}>
                                  {p.queue}
                                </div>
                                <div style={{ padding: '10px 16px' }}>
                                  <div style={{ fontSize: '14px', color: '#111827' }}>{p.tat}</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>SLA {p.sla}</div>
                                </div>
                                <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                                  {p.today} today
                                </div>
                                <div style={{ padding: '10px 16px' }}>{getStatusBadge(p.status)}</div>
                                <div style={{ padding: '10px 16px', textAlign: 'right' }}>
                                  <button style={{ height: '32px', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: isSelected ? '#2563eb' : '#fff', color: isSelected ? '#fff' : '#111827', border: `1px solid ${isSelected ? '#2563eb' : '#d1d5db'}` }}>
                                    View
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </>
                    )}

                    {/* INVENTORY HEALTH TABLE */}
                    {activeTab === 'inv' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.7fr) minmax(120px, 1fr) 80px 80px 140px 90px', alignItems: 'center', height: '44px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', color: '#4b5563' }}>
                          <div style={{ padding: '0 16px' }}>ITEM</div>
                          <div style={{ padding: '0 16px' }}>CATEGORY</div>
                          <div style={{ padding: '0 16px' }}>STOCK</div>
                          <div style={{ padding: '0 16px' }}>REORDER</div>
                          <div style={{ padding: '0 16px' }}>ISSUE</div>
                          <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                        </div>
                        {invhList
                          .filter(inv => (filterPill === 'all' || (filterPill === 'out' ? inv.c === 'red' : inv.c === 'amber')) && (!searchQuery || (inv.name + inv.impact).toLowerCase().includes(searchQuery.toLowerCase())))
                          .map((inv, idx) => {
                            const isSelected = selectedInvId === (inv.id || `inv-${idx}`);
                            return (
                              <div
                                key={inv.id || idx}
                                onClick={() => setSelectedInvId(inv.id || `inv-${idx}`)}
                                style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.7fr) minmax(120px, 1fr) 80px 80px 140px 90px', alignItems: 'center', minHeight: '56px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: isSelected ? '#eff6ff' : '#fff' }}
                              >
                                <div style={{ padding: '10px 16px' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{inv.name}</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{inv.impact}</div>
                                </div>
                                <div style={{ padding: '10px 16px', fontSize: '13px', color: '#4b5563' }}>{inv.cat}</div>
                                <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: inv.stock === 0 ? '#dc2626' : '#111827' }}>
                                  {inv.stock}
                                </div>
                                <div style={{ padding: '10px 16px', fontSize: '13px', color: '#4b5563' }}>{inv.par}</div>
                                <div style={{ padding: '10px 16px' }}>
                                  {renderBadge(inv.c === 'red' ? '#fef2f2' : '#fffbeb', inv.c === 'red' ? '#dc2626' : '#b45309', inv.c === 'red' ? '#fecaca' : '#fde68a', inv.issue)}
                                </div>
                                <div style={{ padding: '10px 16px', textAlign: 'right' }}>
                                  <button style={{ height: '32px', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: isSelected ? '#2563eb' : '#fff', color: isSelected ? '#fff' : '#111827', border: `1px solid ${isSelected ? '#2563eb' : '#d1d5db'}` }}>
                                    View
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </>
                    )}

                    {/* CONTROLLED DRUG MONITORING TABLE */}
                    {activeTab === 'cd' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1.6fr) 90px 80px 80px 80px 90px 90px 120px', alignItems: 'center', height: '44px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', color: '#4b5563' }}>
                          <div style={{ padding: '0 16px' }}>DRUG</div>
                          <div style={{ padding: '0 16px' }}>SCHEDULE</div>
                          <div style={{ padding: '0 16px' }}>OPENING</div>
                          <div style={{ padding: '0 16px' }}>IN</div>
                          <div style={{ padding: '0 16px' }}>OUT</div>
                          <div style={{ padding: '0 16px' }}>REGISTER</div>
                          <div style={{ padding: '0 16px' }}>SHELF</div>
                          <div style={{ padding: '0 16px' }}>STATUS</div>
                        </div>
                        {cdmList
                          .filter(c => (filterPill === 'all' || (filterPill === 'disc' ? c.bal !== c.shelf : c.sched === filterPill)) && (!searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())))
                          .map(c => {
                            const isSelected = selectedCdCode === c.code;
                            const isDisc = c.shelf !== c.bal;
                            return (
                              <div
                                key={c.code}
                                onClick={() => setSelectedCdCode(c.code)}
                                style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1.6fr) 90px 80px 80px 80px 90px 90px 120px', alignItems: 'center', minHeight: '56px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: isSelected ? '#eff6ff' : '#fff' }}
                              >
                                <div style={{ padding: '10px 16px' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{c.name}</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{c.code}</div>
                                </div>
                                <div style={{ padding: '10px 16px' }}>{renderBadge('#111827', '#ffffff', '#111827', `Sch. ${c.sched}`)}</div>
                                <div style={{ padding: '10px 16px', fontSize: '14px', color: '#111827' }}>{c.open}</div>
                                <div style={{ padding: '10px 16px', fontSize: '14px', color: '#15803d' }}>+{c.rec + c.ret}</div>
                                <div style={{ padding: '10px 16px', fontSize: '14px', color: '#4b5563' }}>−{c.iss}</div>
                                <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{c.bal}</div>
                                <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: isDisc ? '#dc2626' : '#111827' }}>
                                  {c.shelf}
                                </div>
                                <div style={{ padding: '10px 16px' }}>
                                  {!isDisc ? renderBadge('#f0fdf4', '#15803d', '#bbf7d0', 'Reconciled') : renderBadge('#fef2f2', '#dc2626', '#fecaca', `Variance ${c.shelf - c.bal}`)}
                                </div>
                              </div>
                            );
                          })}
                      </>
                    )}

                    {/* SUPPLIERS & PROCUREMENT TABLE */}
                    {activeTab === 'supp' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, 1.4fr) minmax(150px, 1.1fr) minmax(150px, 1.1fr) 90px 90px 140px 90px', alignItems: 'center', height: '44px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', color: '#4b5563' }}>
                          <div style={{ padding: '0 16px' }}>SUPPLIER</div>
                          <div style={{ padding: '0 16px' }}>CATEGORY</div>
                          <div style={{ padding: '0 16px' }}>OPEN PO</div>
                          <div style={{ padding: '0 16px' }}>LEAD</div>
                          <div style={{ padding: '0 16px' }}>ON-TIME</div>
                          <div style={{ padding: '0 16px' }}>STATUS</div>
                          <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                        </div>
                        {supsList
                          .filter(s => (filterPill === 'all' || s.status === filterPill) && (!searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())))
                          .map((s, idx) => {
                            const isSelected = selectedSupIndex === idx;
                            return (
                              <div
                                key={idx}
                                onClick={() => setSelectedSupIndex(idx)}
                                style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, 1.4fr) minmax(150px, 1.1fr) minmax(150px, 1.1fr) 90px 90px 140px 90px', alignItems: 'center', minHeight: '56px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: isSelected ? '#eff6ff' : '#fff' }}
                              >
                                <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{s.name}</div>
                                <div style={{ padding: '10px 16px', fontSize: '13px', color: '#4b5563' }}>{s.cat}</div>
                                <div style={{ padding: '10px 16px', fontSize: '13px', fontFamily: 'monospace', color: '#111827' }}>{s.po}</div>
                                <div style={{ padding: '10px 16px', fontSize: '14px', color: '#111827' }}>{s.lead}</div>
                                <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: s.ontime < 80 ? '#dc2626' : '#111827' }}>
                                  {s.ontime}%
                                </div>
                                <div style={{ padding: '10px 16px' }}>{getStatusBadge(s.status)}</div>
                                <div style={{ padding: '10px 16px', textAlign: 'right' }}>
                                  {s.status === 'Awaiting approval' ? (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleReviewPR(s, 'APPROVE');
                                      }}
                                      style={{ height: '32px', padding: '0 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: '#2563eb', color: '#fff', border: '1px solid #2563eb' }}
                                    >
                                      Approve
                                    </button>
                                  ) : (
                                    <button style={{ height: '32px', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: isSelected ? '#2563eb' : '#fff', color: isSelected ? '#fff' : '#111827', border: `1px solid ${isSelected ? '#2563eb' : '#d1d5db'}` }}>
                                      View
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </>
                    )}

                    {/* AUDIT LOGS TABLE */}
                    {activeTab === 'audit' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '72px minmax(140px, 1fr) minmax(160px, 1.2fr) minmax(180px, 1.4fr) 120px 90px', alignItems: 'center', height: '44px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', color: '#4b5563' }}>
                          <div style={{ padding: '0 16px' }}>TIME</div>
                          <div style={{ padding: '0 16px' }}>USER</div>
                          <div style={{ padding: '0 16px' }}>ACTION</div>
                          <div style={{ padding: '0 16px' }}>ENTITY</div>
                          <div style={{ padding: '0 16px' }}>TYPE</div>
                          <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                        </div>
                        {auditList
                          .filter(a => (filterPill === 'all' || a.sev === filterPill) && (!searchQuery || (a.user + a.act + a.ent).toLowerCase().includes(searchQuery.toLowerCase())))
                          .map(a => {
                            const isSelected = selectedAuditId === a.id;
                            return (
                              <div
                                key={a.id}
                                onClick={() => setSelectedAuditId(a.id)}
                                style={{ display: 'grid', gridTemplateColumns: '72px minmax(140px, 1fr) minmax(160px, 1.2fr) minmax(180px, 1.4fr) 120px 90px', alignItems: 'center', minHeight: '56px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: isSelected ? '#eff6ff' : '#fff' }}
                              >
                                <div style={{ padding: '10px 16px', fontSize: '13px', color: '#4b5563' }}>{a.time}</div>
                                <div style={{ padding: '10px 16px' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{a.user}</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{a.ip}</div>
                                </div>
                                <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{a.act}</div>
                                <div style={{ padding: '10px 16px', fontSize: '13px', fontFamily: 'monospace', color: '#374151' }}>{a.ent}</div>
                                <div style={{ padding: '10px 16px' }}>{getSeverityBadge(a.sev)}</div>
                                <div style={{ padding: '10px 16px', textAlign: 'right' }}>
                                  <button style={{ height: '32px', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: isSelected ? '#2563eb' : '#fff', color: isSelected ? '#fff' : '#111827', border: `1px solid ${isSelected ? '#2563eb' : '#d1d5db'}` }}>
                                    View
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </>
                    )}

                    {/* DEPARTMENT SETTINGS TABLE */}
                    {activeTab === 'settings' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1.9fr) minmax(130px, 1fr) 130px minmax(160px, 1.1fr) 90px', alignItems: 'center', height: '44px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', color: '#4b5563' }}>
                          <div style={{ padding: '0 16px' }}>POLICY</div>
                          <div style={{ padding: '0 16px' }}>SCOPE</div>
                          <div style={{ padding: '0 16px' }}>VALUE</div>
                          <div style={{ padding: '0 16px' }}>LAST CHANGED</div>
                          <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                        </div>
                        {settingsList
                          .filter(s => (filterPill === 'all' || s.scope.includes(filterPill)) && (!searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())))
                          .map(s => {
                            const isSelected = selectedSettingKey === s.key;
                            return (
                              <div
                                key={s.key}
                                onClick={() => setSelectedSettingKey(s.key)}
                                style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1.9fr) minmax(130px, 1fr) 130px minmax(160px, 1.1fr) 90px', alignItems: 'center', minHeight: '56px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: isSelected ? '#eff6ff' : '#fff' }}
                              >
                                <div style={{ padding: '10px 16px' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{s.name}</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{s.description}</div>
                                </div>
                                <div style={{ padding: '10px 16px', fontSize: '13px', color: '#4b5563' }}>{s.scope}</div>
                                <div style={{ padding: '10px 16px' }}>
                                  {typeof s.value === 'boolean'
                                    ? renderBadge(s.value ? '#f0fdf4' : '#f3f4f6', s.value ? '#15803d' : '#4b5563', s.value ? '#bbf7d0' : '#e5e7eb', s.value ? 'On' : 'Off')
                                    : renderBadge('#eff6ff', '#1d4ed8', '#bfdbfe', String(s.value))}
                                </div>
                                <div style={{ padding: '10px 16px', fontSize: '13px', color: '#4b5563' }}>{s.by}</div>
                                <div style={{ padding: '10px 16px', textAlign: 'right' }}>
                                  <button style={{ height: '32px', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: isSelected ? '#2563eb' : '#fff', color: isSelected ? '#fff' : '#111827', border: `1px solid ${isSelected ? '#2563eb' : '#d1d5db'}` }}>
                                    View
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </>
                    )}

                    {/* REPORTS TABLE */}
                    {activeTab === 'reports' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.8fr) 120px minmax(130px, 1fr) 110px 100px 110px 90px', alignItems: 'center', height: '44px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', color: '#4b5563' }}>
                          <div style={{ padding: '0 16px' }}>REPORT</div>
                          <div style={{ padding: '0 16px' }}>PERIOD</div>
                          <div style={{ padding: '0 16px' }}>OWNER</div>
                          <div style={{ padding: '0 16px' }}>GENERATED</div>
                          <div style={{ padding: '0 16px' }}>FORMAT</div>
                          <div style={{ padding: '0 16px' }}>STATUS</div>
                          <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                        </div>
                        {reportsList
                          .filter(r => (filterPill === 'all' || r.period === filterPill) && (!searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase())))
                          .map(r => {
                            const isSelected = selectedReportId === r.id;
                            return (
                              <div
                                key={r.id}
                                onClick={() => setSelectedReportId(r.id)}
                                style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.8fr) 120px minmax(130px, 1fr) 110px 100px 110px 90px', alignItems: 'center', minHeight: '56px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: isSelected ? '#eff6ff' : '#fff' }}
                              >
                                <div style={{ padding: '10px 16px' }}>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{r.name}</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{r.id}</div>
                                </div>
                                <div style={{ padding: '10px 16px', fontSize: '13px', color: '#4b5563' }}>{r.period}</div>
                                <div style={{ padding: '10px 16px', fontSize: '13px', color: '#111827' }}>{r.owner}</div>
                                <div style={{ padding: '10px 16px', fontSize: '13px', color: '#4b5563' }}>{r.gen}</div>
                                <div style={{ padding: '10px 16px', fontSize: '13px', color: '#4b5563' }}>{r.fmt}</div>
                                <div style={{ padding: '10px 16px' }}>{getStatusBadge(r.status)}</div>
                                <div style={{ padding: '10px 16px', textAlign: 'right' }}>
                                  <button style={{ height: '32px', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: isSelected ? '#2563eb' : '#fff', color: isSelected ? '#fff' : '#111827', border: `1px solid ${isSelected ? '#2563eb' : '#d1d5db'}` }}>
                                    View
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </>
                    )}
                  </div>
                </div>

                {/* Table Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', fontSize: '12px', color: '#6b7280', borderTop: '1px solid #e5e7eb' }}>
                  <span>Showing {activeTab === 'staff' ? staffList.length : activeTab === 'schedule' ? shiftsList.length : activeTab === 'ops' ? pointsList.length : activeTab === 'inv' ? invhList.length : activeTab === 'cd' ? cdmList.length : activeTab === 'supp' ? supsList.length : activeTab === 'audit' ? auditList.length : activeTab === 'settings' ? settingsList.length : reportsList.length} records</span>
                  <span>1 / 1</span>
                </div>
              </div>

              {/* Right Sticky Inspection Drawer */}
              <div style={{ flex: '0 1 400px', minWidth: '340px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: '76px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                    {activeTab === 'staff' && 'STAFF MEMBER'}
                    {activeTab === 'schedule' && 'SHIFT'}
                    {activeTab === 'ops' && 'SERVICE POINT'}
                    {activeTab === 'inv' && 'ITEM'}
                    {activeTab === 'cd' && 'CONTROLLED DRUG'}
                    {activeTab === 'supp' && 'SUPPLIER'}
                    {activeTab === 'audit' && 'LOG ENTRY'}
                    {activeTab === 'settings' && 'POLICY'}
                    {activeTab === 'reports' && 'REPORT PREVIEW'}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '1px 6px' }}>
                    Read-only
                  </span>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', maxHeight: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                    {/* STAFF DRAWER CONTENT */}
                    {activeTab === 'staff' && (() => {
                      const staff = staffList.find(s => s.id === selectedStaffId) || staffList[0];
                      return (
                        <>
                          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>{staff.name}</h3>
                                {getStatusBadge(staff.status)}
                              </div>
                              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                                {staff.role} · {staff.id} · {staff.shift}
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Processed</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{staff.done}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Target</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{staff.target}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Turnaround</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{staff.tat}</div>
                              </div>
                            </div>
                          </div>

                          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280', marginBottom: '8px' }}>
                                SAFETY & COMPLIANCE
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Allergy overrides today</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Each logged with reason</div>
                                </div>
                                {staff.ovr > 0 ? renderBadge('#fef2f2', '#dc2626', '#fecaca', String(staff.ovr)) : renderBadge('#f0fdf4', '#15803d', '#bbf7d0', '0')}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Controlled drug entries</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Dispensed or witnessed</div>
                                </div>
                                {renderBadge('#111827', '#ffffff', '#111827', String(staff.cd))}
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280', marginBottom: '8px' }}>
                                RECENT ACTIONS
                              </div>
                              {staff.recent.map((rec, rIdx) => (
                                <div key={rIdx} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                  <div style={{ fontSize: '13px', color: '#111827' }}>{rec}</div>
                                  {renderBadge('#f3f4f6', '#4b5563', '#e5e7eb', 'Logged')}
                                </div>
                              ))}
                            </div>

                            <div style={{ marginTop: '8px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
                              <button
                                onClick={() => handleOpenEditStaff(staff)}
                                style={{
                                  width: '100%',
                                  height: '38px',
                                  borderRadius: '8px',
                                  background: '#eff6ff',
                                  color: '#2563eb',
                                  border: '1px solid #bfdbfe',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px'
                                }}
                              >
                                <Edit2 size={15} />
                                Complete / Edit Profile
                              </button>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {/* DUTY SCHEDULING DRAWER CONTENT */}
                    {activeTab === 'schedule' && (() => {
                      const sh = shiftsList.find(s => s.id === selectedShiftId) || shiftsList[0];
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
                              style={{ height: '38px', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                            >
                              Edit shift assignment
                            </button>
                          </div>
                        </>
                      );
                    })()}

                    {/* CONTROLLED DRUG DRAWER CONTENT */}
                    {activeTab === 'cd' && (() => {
                      const cd = cdmList.find(c => c.code === selectedCdCode) || cdmList[0];
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
                              style={{ height: '38px', borderRadius: '8px', background: '#111827', color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              <Lock size={14} /> Open controlled drug register
                            </button>
                          </div>
                        </>
                      );
                    })()}

                    {/* INVENTORY HEALTH DRAWER CONTENT */}
                    {activeTab === 'inv' && (() => {
                      const item = invhList.find(i => (i.id || '') === selectedInvId) || invhList[0];
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
                      const sup = supsList[selectedSupIndex] || supsList[0];
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
                                style={{ height: '38px', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                              >
                                Approve procurement budget
                              </button>
                            )}

                            {sup.status === 'Approved' && (
                              <button
                                onClick={() => handleDispatchPO(sup)}
                                style={{ height: '38px', borderRadius: '8px', background: '#15803d', color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
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
                      const log = auditList.find(a => a.id === selectedAuditId) || auditList[0];
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
                      const sett = settingsList.find(s => s.key === selectedSettingKey) || settingsList[0];
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
                      const rep = reportsList.find(r => r.id === selectedReportId) || reportsList[0];
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
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* SHIFT ASSIGNMENT MODAL */}
      {isAssignModalOpen && assigningShift && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '14px', width: '480px', maxWidth: '90%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>Assign Shift Coverage</h3>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>
                  {assigningShift.area} · {assigningShift.slot} ({assigningShift.day})
                </p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Select Staff Members (Required: {assigningShift.need})
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px' }}>
                  {staffList.map(s => {
                    const isSelected = selectedStaffToAssign.includes(s.name);
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedStaffToAssign(selectedStaffToAssign.filter(name => name !== s.name));
                          } else {
                            setSelectedStaffToAssign([...selectedStaffToAssign, s.name]);
                          }
                        }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', background: isSelected ? '#eff6ff' : 'transparent' }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{s.name}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{s.role} · {s.status}</div>
                        </div>
                        {isSelected && <Check size={16} color="#2563eb" />}
                      </div>
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
                  style={{ height: '38px', padding: '0 16px', borderRadius: '8px', background: '#fff', border: '1px solid #d1d5db', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveShiftAssignment}
                  style={{ height: '38px', padding: '0 16px', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Assignment
                </button>
              </div>
            </div>
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
