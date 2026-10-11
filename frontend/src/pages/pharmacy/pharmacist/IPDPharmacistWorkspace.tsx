import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  PackageOpen,
  CheckCircle2,
  Siren,
  RotateCcw,
  Check,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  Lock,
  MessageSquare,
  Search,
  ChevronRight,
  ShieldCheck,
  ThermometerSnowflake,
  FileText,
  User,
  AlertCircle,
  RefreshCw,
  Building2,
  Stethoscope,
  X,
  Pill,
  Boxes,
  ArrowRight,
  History,
  Activity,
  FileCheck,
  Printer,
  LogOut,
  BedDouble,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import '../shared/pharmacyMotion.css';
import pharmacyIpdService, {
  IPDKPIMetrics,
  IPDWardRequest,
  IPDWardReturn,
  IPDLineItem,
  IPDAlternative,
  IPDSubstitutionAudit,
  IPDHandoverRecord,
} from '../../../services/pharmacyIpdService';

// Priority Colors
const PRIO_STYLES: Record<string, { bg: string; fg: string; bd: string }> = {
  STAT: { bg: '#fef2f2', fg: '#dc2626', bd: '#fecaca' },
  URGENT: { bg: '#fffbeb', fg: '#b45309', bd: '#fde68a' },
  ROUTINE: { bg: '#f9fafb', fg: '#374151', bd: '#e5e7eb' },
  DISCHARGE: { bg: '#f9fafb', fg: '#374151', bd: '#e5e7eb' },
};

// Status Colors
const BADGE_STYLES: Record<string, { bg: string; fg: string; bd: string }> = {
  gray: { bg: '#f9fafb', fg: '#374151', bd: '#e5e7eb' },
  blue: { bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' },
  amber: { bg: '#fffbeb', fg: '#b45309', bd: '#fde68a' },
  red: { bg: '#fef2f2', fg: '#dc2626', bd: '#fecaca' },
  green: { bg: '#f0fdf4', fg: '#15803d', bd: '#bbf7d0' },
  sky: { bg: '#f0f9ff', fg: '#0369a1', bd: '#bae6fd' },
  dark: { bg: '#111827', fg: '#ffffff', bd: '#111827' },
};

// 5 Operational Workflow Steps (Requirement 2)
export const OPERATIONAL_STEPS = [
  { step: 1, key: 'REVIEW', label: 'Review', desc: 'Clinical & MAR checks' },
  { step: 2, key: 'ALLOCATE', label: 'Allocate Stock', desc: 'FEFO stock & quantities' },
  { step: 3, key: 'ISSUE', label: 'Issue Medicines', desc: 'Pick, label & pack' },
  { step: 4, key: 'HANDOVER', label: 'Ward Handover', desc: 'Nurse sign-off & custody' },
  { step: 5, key: 'COMPLETE', label: 'Complete', desc: 'Ledger charge & bedside MAR' },
];

// Pending Issue Statuses (Requirement 6)
export const PENDING_STATUS_FILTERS = [
  'All Pending',
  'Reviewing',
  'Allocated',
  'Awaiting Pickup',
  'Issued',
  'Partially Issued',
] as const;

export const PENDING_STATUS_STYLES: Record<string, { bg: string; fg: string; bd: string }> = {
  Reviewing: { bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' },
  Allocated: { bg: '#f5f3ff', fg: '#6d28d9', bd: '#ddd6fe' },
  'Awaiting Pickup': { bg: '#fffbeb', fg: '#b45309', bd: '#fde68a' },
  'Partially Issued': { bg: '#fff7ed', fg: '#c2410c', bd: '#fed7aa' },
  Issued: { bg: '#f0fdf4', fg: '#15803d', bd: '#bbf7d0' },
};

// Ward Return Classifications (Requirement 7)
export const WARD_RETURN_CLASSIFICATIONS = [
  'All returns',
  'Patient Discharged',
  'Medication Stopped',
  'Unused',
  'Expired',
  'Damaged',
] as const;

export const RETURN_CLASS_STYLES: Record<string, { bg: string; fg: string; bd: string }> = {
  'Patient Discharged': { bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' },
  'Medication Stopped': { bg: '#fffbeb', fg: '#b45309', bd: '#fde68a' },
  Unused: { bg: '#f0fdf4', fg: '#15803d', bd: '#bbf7d0' },
  Expired: { bg: '#fef2f2', fg: '#dc2626', bd: '#fecaca' },
  Damaged: { bg: '#fdf2f8', fg: '#be185d', bd: '#fbcfe8' },
};

const getPillStyle = (active: boolean) => ({
  height: '32px',
  padding: '0 12px',
  borderRadius: '9999px',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize: '13px',
  fontWeight: (active ? 600 : 500) as number,
  letterSpacing: '-0.01em',
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
  background: active ? '#2563eb' : '#ffffff',
  color: active ? '#ffffff' : '#4b5563',
  border: active ? '1px solid #2563eb' : '1px solid #e5e7eb',
  boxShadow: active ? '0 1px 2px rgba(37,99,235,0.2)' : 'none',
  outline: 'none',
  transition: 'all 0.15s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flexShrink: 0,
});

// MAR Badges (Requirement 5)
export const MAR_STATUS_STYLES: Record<string, { bg: string; fg: string; bd: string; icon: any }> = {
  'Awaiting Supply': { bg: '#fffbeb', fg: '#b45309', bd: '#fde68a', icon: Clock },
  'Ready To Administer': { bg: '#f0f9ff', fg: '#0369a1', bd: '#bae6fd', icon: Pill },
  Administered: { bg: '#f0fdf4', fg: '#15803d', bd: '#bbf7d0', icon: CheckCircle2 },
};

const TABS: Record<string, { title: string; subtitle: string; icon: any }> = {
  requests: {
    title: 'Ward requests',
    subtitle: 'New and in-review medication requests from wards',
    icon: ClipboardList,
  },
  pending: {
    title: 'Pending issues',
    subtitle: 'Allocated, being issued or awaiting stock',
    icon: PackageOpen,
  },
  issued: {
    title: 'Issued today',
    subtitle: 'Handed over to wards · MAR shows Issued',
    icon: CheckCircle2,
  },
  emergency: {
    title: 'Emergency requests',
    subtitle: 'STAT requests · target issue within 15 minutes',
    icon: Siren,
  },
  returns: {
    title: 'Ward returns',
    subtitle: 'Unused and discharge returns · credit back to the admission ledger',
    icon: RotateCcw,
  },
};

export interface IPDPharmacistWorkspaceProps {
  isEmbedded?: boolean;
  activeSubTab?: 'requests' | 'pending' | 'issued' | 'emergency' | 'returns';
  onSubTabChange?: (tab: string) => void;
  hideSidebar?: boolean;
  hideHeader?: boolean;
  triggerCallNext?: number;
}

export const IPDPharmacistWorkspace: React.FC<IPDPharmacistWorkspaceProps> = ({
  isEmbedded = false,
  activeSubTab,
  onSubTabChange,
  hideSidebar = false,
  hideHeader = false,
  triggerCallNext,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const displayName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.username || 'Sneha Nair';
  const designation = user?.designation || (user?.employeeId ? `Clinical Pharmacist · ${user.employeeId}` : 'Clinical Pharmacist · PH-4380');
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SN';

  // Navigation / Tabs
  const [internalActiveTab, setInternalActiveTab] = useState<'requests' | 'pending' | 'issued' | 'emergency' | 'returns'>('requests');
  const activeTab = activeSubTab || internalActiveTab;
  const setActiveTab = (t: 'requests' | 'pending' | 'issued' | 'emergency' | 'returns') => {
    setInternalActiveTab(t);
    if (onSubTabChange) onSubTabChange(t);
  };
  const [selectedWard, setSelectedWard] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Sub-Filters for Pending Issues & Returns
  const [pendingStatusFilter, setPendingStatusFilter] = useState<string>('All Pending');
  const [returnClassificationFilter, setReturnClassificationFilter] = useState<string>('All returns');

  // Data State
  const [kpis, setKpis] = useState<IPDKPIMetrics | null>(null);
  const [queue, setQueue] = useState<IPDWardRequest[]>([]);
  const [returnsList, setReturnsList] = useState<IPDWardReturn[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected Items & Completed Order Retention
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  // Motion: fade the right box when the selection changes (HMS bible 19.10)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll<HTMLElement>('[data-hms-detail]').forEach((el) => {
      if (typeof el.animate === 'function') el.animate([{ opacity: 0.55, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 160, easing: 'ease-out' });
    });
  }, [selectedOrderId, selectedReturnId]);
  const [completedOrder, setCompletedOrder] = useState<IPDWardRequest | null>(null);

  // Notifications
  const [notice, setNotice] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showNotice = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 4000);
  };

  // Right Panel 5-Step Operational Wizard State (Requirement 2)
  const [wizardStep, setWizardStep] = useState(1);
  const [allergyOverrideOpen, setAllergyOverrideOpen] = useState(false);
  const [allergyOverrideText, setAllergyOverrideText] = useState('');
  const [orderReviewMar, setOrderReviewMar] = useState(false);
  const [orderReviewDup, setOrderReviewDup] = useState(false);
  const [cdRemarks, setCdRemarks] = useState('');
  const [itemDecisions, setItemDecisions] = useState<Record<string, 'partial' | 'hold' | ''>>({});
  const [pickedChecks, setPickedChecks] = useState<Record<string, boolean>>({});
  const [labelsAffixed, setLabelsAffixed] = useState(false);
  const [coldPackBox, setColdPackBox] = useState(false);
  const [cdRegisterBag, setCdRegisterBag] = useState(false);

  // Handover Tracking State (Requirement 4)
  const [receivingNurse, setReceivingNurse] = useState('Rina Thomas');
  const [collectionTimeInput, setCollectionTimeInput] = useState(
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
  const pharmacistName = user ? `${displayName} · ${user.employeeId || 'PH-4380'}` : 'Sneha Nair · PH-4380';
  const [handoverCounted, setHandoverCounted] = useState(false);
  const [handoverSigned, setHandoverSigned] = useState(false);
  const [handoverFridge, setHandoverFridge] = useState(false);
  const [cdReceiverSig, setCdReceiverSig] = useState(false);
  const [cdHandoverRemarks, setCdHandoverRemarks] = useState('');

  // Alternative Medicine Workflow State (Requirement 3)
  const [substitutionModalOpen, setSubstitutionModalOpen] = useState(false);
  const [substitutingItem, setSubstitutingItem] = useState<IPDLineItem | null>(null);
  const [selectedSubstitute, setSelectedSubstitute] = useState<IPDAlternative | null>(null);
  const [prescriberApprovalNotes, setPrescriberApprovalNotes] = useState('Formulary approved therapeutic substitute due to stockout');
  const [prescriberApprovedCheck, setPrescriberApprovedCheck] = useState(true);

  // Emergency Modal State
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencyReasonInput, setEmergencyReasonInput] = useState('Acute arrhythmia crisis · verbal order Dr. Elena Morgan');
  const [emergencyNurseInput, setEmergencyNurseInput] = useState('Rina Thomas');
  const [emergencyCdRemarks, setEmergencyCdRemarks] = useState('Schedule X emergency dose verified');

  // Load KPIs
  const loadKpis = useCallback(async () => {
    try {
      const data = await pharmacyIpdService.getIPDKPIs();
      setKpis(data);
    } catch (err) {
      console.error('Failed to load IPD KPIs:', err);
    }
  }, []);

  // Load Queue
  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'returns') {
        const rets = await pharmacyIpdService.getWardReturns({
          ward: selectedWard,
          q: searchQuery,
          classification: returnClassificationFilter !== 'All returns' ? returnClassificationFilter : undefined,
        });
        setReturnsList(rets);
        setSelectedReturnId((prev) => prev || (rets.length > 0 ? rets[0].id : null));
      } else {
        const qData = await pharmacyIpdService.getIPDQueue({
          tab: activeTab,
          ward: selectedWard,
          q: searchQuery,
          pending_status: pendingStatusFilter !== 'All Pending' ? pendingStatusFilter : undefined,
        });
        setQueue(qData);
        setSelectedOrderId((prev) => prev || (qData.length > 0 ? qData[0].id : null));
      }
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedWard, searchQuery, pendingStatusFilter, returnClassificationFilter]);

  useEffect(() => {
    loadKpis();
    loadQueue();
    const interval = setInterval(() => {
      loadKpis();
      loadQueue();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadKpis, loadQueue]);

  // Active Order Object - retains completedOrder in Step 5 until explicitly confirmed
  const activeOrder = useMemo(() => {
    if (completedOrder && (!selectedOrderId || selectedOrderId === completedOrder.id)) {
      return completedOrder;
    }
    return queue.find((o) => o.id === selectedOrderId) || queue[0] || null;
  }, [queue, selectedOrderId, completedOrder]);

  // Track previous active order ID to avoid resetting wizard state on 15s polling cycles
  const lastActiveOrderIdRef = useRef<string | null>(null);

  // Sync wizard step when active order changes
  useEffect(() => {
    if (!activeOrder) {
      lastActiveOrderIdRef.current = null;
      return;
    }

    const isDifferentOrder = lastActiveOrderIdRef.current !== activeOrder.id;

    if (isDifferentOrder) {
      // Switched to a new order: initialize wizard step and fresh checklist
      lastActiveOrderIdRef.current = activeOrder.id;
      setWizardStep(activeOrder.status === 'DISPENSED' ? 5 : activeOrder.step ? Math.min(5, Math.max(1, activeOrder.step)) : 1);
      setReceivingNurse(activeOrder.nurse_name || 'Rina Thomas');
      setCollectionTimeInput(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      setOrderReviewMar(false);
      setOrderReviewDup(false);
      setAllergyOverrideOpen(false);
      setAllergyOverrideText(activeOrder.allergy_override || '');
      setLabelsAffixed(false);
      setColdPackBox(false);
      setCdRegisterBag(false);
      setHandoverCounted(false);
      setHandoverSigned(false);
      setHandoverFridge(false);
      setCdReceiverSig(false);
      const picks: Record<string, boolean> = {};
      activeOrder.lines.forEach((l) => {
        picks[l.id] = l.is_picked || false;
      });
      setPickedChecks(picks);
    } else {
      // Same order refreshed via background polling interval (15s):
      // Retain the pharmacist's current in-progress wizardStep and checks!
      if (activeOrder.status === 'DISPENSED') {
        setWizardStep((curr) => (curr !== 5 ? 5 : curr));
      }
      // Preserve any local picks made by the pharmacist while pulling any new items
      setPickedChecks((prev) => {
        const merged = { ...prev };
        activeOrder.lines.forEach((l) => {
          if (merged[l.id] === undefined) {
            merged[l.id] = l.is_picked || false;
          }
        });
        return merged;
      });
    }
  }, [activeOrder]);

  // Active Return Object
  const activeReturn = useMemo(() => {
    return returnsList.find((r) => r.id === selectedReturnId) || returnsList[0] || null;
  }, [returnsList, selectedReturnId]);

  // Wards list
  const availableWards = useMemo(() => {
    const defaultWards = ['All', 'ICU', 'HDU', 'Ward 4B', 'Ward 2A', 'Ward 3C'];
    const activeWards = new Set(queue.map((q) => q.ward));
    defaultWards.forEach((w) => activeWards.add(w));
    return Array.from(activeWards);
  }, [queue]);

  // Determine computed pending status for queue items (Requirement 6)
  const getOrderPendingStatus = useCallback((o: IPDWardRequest): string => {
    if (o.status === 'DISPENSED') return 'Issued';
    if (o.any_shortage) return 'Partially Issued';
    if (o.step === 1) return 'Reviewing';
    if (o.step === 2) return 'Allocated';
    if (o.step >= 3) return 'Awaiting Pickup';
    return 'Reviewing';
  }, []);

  // Filtered Queue by pending sub-status
  const displayedQueue = useMemo(() => {
    if (activeTab !== 'pending' || pendingStatusFilter === 'All Pending') {
      return queue;
    }
    return queue.filter((o) => getOrderPendingStatus(o) === pendingStatusFilter);
  }, [queue, activeTab, pendingStatusFilter, getOrderPendingStatus]);

  // Filtered Returns by Classification (Requirement 7)
  const displayedReturns = useMemo(() => {
    if (returnClassificationFilter === 'All returns') {
      return returnsList;
    }
    return returnsList.filter((r) => {
      const cls = r.classification || r.type || 'Unused';
      return cls.toLowerCase() === returnClassificationFilter.toLowerCase();
    });
  }, [returnsList, returnClassificationFilter]);

  // Handlers
  // Confirm Step 5 and Proceed to Next Patient
  const handleProceedToNextPatient = () => {
    const finishedId = completedOrder?.id || activeOrder?.id;
    setCompletedOrder(null);
    const remainingOpen = queue.filter(
      (o) => o.id !== finishedId && o.status !== 'DISPENSED' && !o.is_cancelled && !o.hold_reason
    );
    if (remainingOpen.length > 0) {
      const nextOrder = remainingOpen[0];
      setSelectedOrderId(nextOrder.id);
      showNotice(`Confirmed handover. Loaded next request: ${nextOrder.order_number} (${nextOrder.patient_name})`);
    } else {
      setSelectedOrderId(null);
      showNotice('Handover complete! All pending ward requests have been processed.', 'success');
    }
  };

  const handleCallNext = () => {
    setCompletedOrder(null);
    const openOrders = queue.filter((o) => o.status !== 'DISPENSED' && !o.is_cancelled && !o.hold_reason);
    if (openOrders.length > 0) {
      const next = openOrders[0];
      setSelectedOrderId(next.id);
      setActiveTab(next.priority === 'STAT' ? 'emergency' : 'requests');
      showNotice(`Called next request: ${next.order_number} (${next.patient_name})`);
    } else {
      showNotice('No pending ward requests waiting', 'error');
    }
  };

  // Listen for external triggerCallNext signal
  const lastTriggerRef = useRef<number | undefined>(triggerCallNext);
  useEffect(() => {
    if (triggerCallNext !== undefined && triggerCallNext !== lastTriggerRef.current) {
      lastTriggerRef.current = triggerCallNext;
      handleCallNext();
    }
  }, [triggerCallNext]);

  const handleQueryPrescriber = async () => {
    if (!activeOrder) return;
    const reason = prompt('Enter query notes for prescriber:', 'Allergy warning detected on regimen');
    if (!reason) return;
    try {
      await pharmacyIpdService.queryPrescriber(activeOrder.id, reason);
      showNotice(`Prescriber query sent for ${activeOrder.order_number}`);
      loadQueue();
      loadKpis();
    } catch (err: any) {
      showNotice(err.response?.data?.error || 'Failed to query prescriber', 'error');
    }
  };

  const handleCancelRequest = async () => {
    if (!activeOrder) return;
    const reason = prompt('Reason for request cancellation:', 'Patient discharged / order stopped on MAR');
    if (!reason) return;
    try {
      await pharmacyIpdService.cancelRequest(activeOrder.id, reason);
      showNotice(`Request ${activeOrder.order_number} cancelled`);
      loadQueue();
      loadKpis();
    } catch (err: any) {
      showNotice(err.response?.data?.error || 'Failed to cancel request', 'error');
    }
  };

  // Open Alternative Prescriber Approval Modal (Requirement 3)
  const handleOpenSubstitutionModal = (item: IPDLineItem, alt: IPDAlternative) => {
    setSubstitutingItem(item);
    setSelectedSubstitute(alt);
    setPrescriberApprovalNotes(`Hospital formulary equivalent substitution (${alt.name}) requested due to stockout`);
    setPrescriberApprovedCheck(true);
    setSubstitutionModalOpen(true);
  };

  // Execute Prescriber Approval & Record Substitution Audit (Requirement 3)
  const handleAuthorizeSubstitution = async () => {
    if (!activeOrder || !substitutingItem || !selectedSubstitute) return;
    const auditRecord: IPDSubstitutionAudit = {
      id: `SUB-${Date.now().toString().slice(-4)}`,
      original_code: substitutingItem.code,
      original_name: substitutingItem.name,
      substitute_code: selectedSubstitute.code,
      substitute_name: selectedSubstitute.name,
      prescriber_name: activeOrder.doctor_name || 'Dr. Michael Chang',
      prescriber_approved: prescriberApprovedCheck,
      approval_notes: prescriberApprovalNotes,
      reason: selectedSubstitute.reason || 'Therapeutic alternative due to stock shortage',
      requested_at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      approved_at: prescriberApprovedCheck ? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : undefined,
      pharmacist: pharmacistName,
    };

    try {
      await pharmacyIpdService.requestPrescriberApproval(activeOrder.id, {
        item_id: substitutingItem.id,
        substitute_code: selectedSubstitute.code,
        substitute_name: selectedSubstitute.name,
        prescriber_name: activeOrder.doctor_name || 'Dr. Michael Chang',
        reason: selectedSubstitute.reason,
        approval_notes: prescriberApprovalNotes,
        prescriber_approved: prescriberApprovedCheck,
      });

      // Update local state directly for immediate reactivity
      substitutingItem.name = `${selectedSubstitute.name} (Substituted)`;
      substitutingItem.code = selectedSubstitute.code;
      substitutingItem.available_stock = selectedSubstitute.stock;
      substitutingItem.substitution_audit = auditRecord;
      if (!activeOrder.substitution_history) {
        activeOrder.substitution_history = [];
      }
      activeOrder.substitution_history.push(auditRecord);

      setSubstitutionModalOpen(false);
      showNotice(`Substitution authorized: ${selectedSubstitute.name} approved by ${activeOrder.doctor_name}`);
      loadQueue();
    } catch (err: any) {
      showNotice(err.response?.data?.error || 'Failed to record substitution', 'error');
    }
  };

  // Execute Handover and Issue (Requirement 2 & 4)
  const handleExecuteIssue = async () => {
    if (!activeOrder) return;
    try {
      const handoverRecord: IPDHandoverRecord = {
        handed_over_by: pharmacistName,
        collected_by: receivingNurse,
        collection_time: collectionTimeInput,
        items_count: activeOrder.lines.length,
        cd_verified: activeOrder.has_cd,
        cold_chain_verified: activeOrder.has_cold_chain,
        notes: cdHandoverRemarks || 'Ward handover complete and verified against MAR.',
      };

      await pharmacyIpdService.issueToWard(activeOrder.id, {
        received_by: receivingNurse,
        collected_by: receivingNurse,
        collection_time: collectionTimeInput,
        handed_over_by: pharmacistName,
        cd_remarks: cdRemarks || cdHandoverRemarks,
      });

      // Retain finished order in Step 5 so pharmacist can review the full summary
      const updatedHandoverHistory = [...(activeOrder.handover_history || []), handoverRecord];
      const finished: IPDWardRequest = {
        ...activeOrder,
        status: 'DISPENSED',
        step: 5,
        handover_history: updatedHandoverHistory,
        tracking: {
          ...activeOrder.tracking,
          collected_by_nurse: receivingNurse,
          collection_time: collectionTimeInput,
          handed_over_by_pharmacist: pharmacistName,
          issued_at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        },
        lines: activeOrder.lines.map((l) => ({
          ...l,
          mar_status: 'Ready To Administer',
        })),
      };

      setCompletedOrder(finished);
      setWizardStep(5); // Complete
      showNotice(`Order ${finished.order_number} handed over to Nurse ${receivingNurse} (${finished.ward} ${finished.bed})`);
      loadQueue();
      loadKpis();
    } catch (err: any) {
      showNotice(err.response?.data?.error || 'Failed to issue order', 'error');
    }
  };

  // Emergency Release
  const handleExecuteEmergency = async () => {
    if (!activeOrder) return;
    if (emergencyReasonInput.trim().length < 10) {
      showNotice('Please enter an emergency justification (min 10 characters)', 'error');
      return;
    }
    try {
      await pharmacyIpdService.emergencyRelease(activeOrder.id, {
        reason: emergencyReasonInput.trim(),
        received_by: emergencyNurseInput,
        cd_remarks: emergencyCdRemarks,
      });
      const finished: IPDWardRequest = {
        ...activeOrder,
        status: 'DISPENSED',
        step: 5,
        is_emergency: true,
        emergency_reason: emergencyReasonInput.trim(),
        tracking: {
          ...activeOrder.tracking,
          collected_by_nurse: emergencyNurseInput,
          collection_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          handed_over_by_pharmacist: pharmacistName,
          issued_at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        },
        lines: activeOrder.lines.map((l) => ({
          ...l,
          mar_status: 'Ready To Administer',
        })),
      };

      setCompletedOrder(finished);
      setEmergencyModalOpen(false);
      setWizardStep(5); // Complete
      showNotice(`Emergency STAT release executed for ${finished.order_number}`);
      loadQueue();
      loadKpis();
    } catch (err: any) {
      showNotice(err.response?.data?.error || 'Emergency release failed', 'error');
    }
  };

  // Process Ward Returns with Classification (Requirement 7)
  const handleProcessReturn = async (action: 'receive' | 'inspect' | 'complete', disp = 'restock') => {
    if (!activeReturn) return;
    try {
      await pharmacyIpdService.processWardReturn(activeReturn.id, {
        action,
        disposition: disp,
        classification: activeReturn.classification || activeReturn.type || 'Unused',
      });
      showNotice(`Return ${activeReturn.return_number || activeReturn.id} processed as ${disp.toUpperCase()}`);
      loadQueue();
      loadKpis();
    } catch (err: any) {
      showNotice(err.response?.data?.error || 'Failed to process return', 'error');
    }
  };

  return (
    <div className="hms-motion" style={{ display: 'flex', height: isEmbedded ? 'auto' : '100vh', width: isEmbedded ? '100%' : '100vw', overflow: isEmbedded ? 'visible' : 'hidden', background: '#f9fafb', fontFamily: 'Inter, sans-serif' }}>
      {/* ------------------------------------------ */}
      {/* LEFT NAVIGATION SIDEBAR (260px)            */}
      {/* ------------------------------------------ */}
      {!hideSidebar && !isEmbedded && (
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

        {/* Department Badge */}
        <div style={{ margin: '0 16px', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Current department</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', background: '#eff6ff', borderRadius: '4px', padding: '1px 6px' }}>IPD</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '4px' }}>Pharmacy</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Central IPD store · Block B, level 1</div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #e5e7eb', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => navigate('/pharmacy/opd')}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563eb',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              <Pill size={12} />
              Switch to OPD Dispensing →
            </button>
            <button
              onClick={() => navigate('/pharmacy/inventory')}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#4b5563',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              <Boxes size={12} />
              Switch to Central Store →
            </button>
            <button
              onClick={() => navigate('/pharmacy/controlled-drugs')}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#b45309',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              <Lock size={12} />
              Controlled Drugs Register →
            </button>
          </div>
        </div>

        {/* Workspace Nav Header */}
        <div style={{ padding: '24px 20px 8px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
          WORKSPACE
        </div>

        {/* Nav Tabs */}
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
          {Object.keys(TABS).map((tabKey) => {
            const t = TABS[tabKey];
            const Icon = t.icon;
            const isActive = activeTab === tabKey;
            const count =
              tabKey === 'requests'
                ? kpis?.open_requests ?? 0
                : tabKey === 'pending'
                ? kpis?.pending_issues ?? 0
                : tabKey === 'issued'
                ? kpis?.issued_today ?? 0
                : tabKey === 'emergency'
                ? kpis?.emergency_requests ?? 0
                : kpis?.ward_returns_count ?? 0;

            return (
              <div
                key={tabKey}
                onClick={() => {
                  setActiveTab(tabKey as any);
                  setSelectedWard('All');
                }}
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
                }}
              >
                <Icon size={18} color={isActive ? '#2563eb' : tabKey === 'emergency' && count > 0 ? '#dc2626' : '#6b7280'} />
                <span style={{ flex: 1 }}>{t.title}</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: tabKey === 'emergency' && count > 0 ? '#dc2626' : '#6b7280',
                  }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </nav>

        {/* Logged in User Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {designation}
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
              color: '#6b7280',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#dc2626';
              e.currentTarget.style.backgroundColor = '#fef2f2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6b7280';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      )}

      {/* ------------------------------------------ */}
      {/* MAIN CONTENT AREA                          */}
      {/* ------------------------------------------ */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: isEmbedded ? 'visible' : 'auto' }}>
        {/* Sticky Breadcrumb Bar */}
        {!hideHeader && !isEmbedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', height: '52px', padding: '0 24px', borderBottom: '1px solid #e5e7eb', background: '#fff', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
            <span>North Hospital</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span>Pharmacy · IPD</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ color: '#111827', fontWeight: 600 }}>{TABS[activeTab].title}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '8px', fontSize: '12px', fontWeight: 600, color: '#16a34a', background: '#f0fdf4', borderRadius: '4px', padding: '2px 6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
              Live
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Station Switcher Pill (Unified Pharmacist Role) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#f1f5f9',
                borderRadius: '8px',
                padding: '2px',
                border: '1px solid #e2e8f0',
              }}
            >
              <button
                onClick={() => navigate('/pharmacy/opd')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Switch station to OPD Dispense Counter"
              >
                <Pill size={13} />
                <span>OPD Counter</span>
              </button>
              <button
                onClick={() => navigate('/pharmacy/ipd')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ffffff',
                  color: '#1d4ed8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                }}
                title="Currently active: IPD Ward Supply"
              >
                <BedDouble size={13} />
                <span>IPD Ward Supply</span>
                <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', padding: '0 4px', borderRadius: '4px', fontWeight: 700 }}>
                  ACTIVE
                </span>
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 14px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>
              <Clock size={14} color="#6b7280" />
              Morning shift · 07:00–15:00
            </div>
          </div>
        </div>
        )}

        {/* Body Container */}
        <div style={{ padding: isEmbedded ? '0' : '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Notification Toast */}
          {notice && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                background: notice.type === 'error' ? '#fef2f2' : '#f0fdf4',
                color: notice.type === 'error' ? '#dc2626' : '#15803d',
                border: `1px solid ${notice.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{notice.msg}</span>
              <X size={16} style={{ cursor: 'pointer' }} onClick={() => setNotice(null)} />
            </div>
          )}

          {/* Screen Header Banner */}
          {!hideHeader && !isEmbedded && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: '30px', fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>
                IPD Pharmacist Workspace
              </h1>
              <p style={{ fontSize: '14px', color: '#4b5563', marginTop: '6px' }}>
                Review, allocate and issue ward medication requests against each admission's MAR. Charges post to the admission ledger on handover.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveTab('returns')}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap',
                  background: activeTab === 'returns' ? '#eff6ff' : '#fff',
                  color: activeTab === 'returns' ? '#2563eb' : '#111827',
                  border: `1px solid ${activeTab === 'returns' ? '#2563eb' : '#d1d5db'}`,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Ward returns
              </button>
              <button
                onClick={() => setActiveTab('emergency')}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap',
                  background: '#fff',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Emergency requests
              </button>
              <button
                onClick={handleCallNext}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap',
                  background: '#2563eb',
                  color: '#fff',
                  border: '1px solid #2563eb',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Call next request
              </button>
            </div>
          </div>
          )}

          {/* 5 Real-Time KPI Cards (Retained Exact Design) */}
          {!hideHeader && !isEmbedded && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '16px' }}>
            {/* KPI 1 */}
            <div
              onClick={() => setActiveTab('requests')}
              style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', cursor: 'pointer', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#4b5563' }}>Open ward requests</span>
                <span style={{ fontSize: '12px', fontWeight: 600, borderRadius: '4px', padding: '2px 6px', background: '#f3f4f6', color: '#374151' }}>
                  {kpis?.wards_count ?? 4} wards
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{kpis?.open_requests ?? 0}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>to review</span>
              </div>
            </div>

            {/* KPI 2 */}
            <div
              onClick={() => setActiveTab('pending')}
              style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', cursor: 'pointer', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#4b5563' }}>Pending issues</span>
                <span style={{ fontSize: '12px', fontWeight: 600, borderRadius: '4px', padding: '2px 6px', background: '#fffbeb', color: '#b45309' }}>
                  {kpis?.awaiting_stock ?? 0} awaiting stock
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{kpis?.pending_issues ?? 0}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>in progress</span>
              </div>
            </div>

            {/* KPI 3 */}
            <div
              onClick={() => setActiveTab('issued')}
              style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', cursor: 'pointer', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#4b5563' }}>Issued today</span>
                <span style={{ fontSize: '12px', fontWeight: 600, borderRadius: '4px', padding: '2px 6px', background: '#f0fdf4', color: '#16a34a' }}>
                  {kpis?.units_issued_today ?? 0} units
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{kpis?.issued_today ?? 0}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>requests</span>
              </div>
            </div>

            {/* KPI 4 */}
            <div
              onClick={() => setActiveTab('emergency')}
              style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: '12px', padding: '20px', cursor: 'pointer', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#4b5563' }}>Emergency requests</span>
                <span style={{ fontSize: '12px', fontWeight: 600, borderRadius: '4px', padding: '2px 6px', background: '#fef2f2', color: '#dc2626' }}>
                  {kpis && kpis.emergency_requests > 0 ? `oldest ${kpis.oldest_stat_wait}m` : 'clear'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#dc2626' }}>{kpis?.emergency_requests ?? 0}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>STAT open</span>
              </div>
            </div>

            {/* KPI 5 */}
            <div
              onClick={() => setActiveTab('returns')}
              style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', cursor: 'pointer', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#4b5563' }}>Ward returns</span>
                <span style={{ fontSize: '12px', fontWeight: 600, borderRadius: '4px', padding: '2px 6px', background: '#f0f9ff', color: '#0369a1' }}>
                  credit to ledger
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{kpis?.ward_returns_count ?? 0}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>to process</span>
              </div>
            </div>
          </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STANDARDIZED 4-COLUMN TWO-PANEL WORKSPACE (1 COL : 3 COLS)    */}
          {/* ------------------------------------------------------------- */}
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
            {/* Left Panel: 1 Column */}
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
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              {/* Header with Title and Count Pill */}
              <div style={{ padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {TABS[activeTab].title}
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
                    {activeTab === 'returns' ? displayedReturns.length : displayedQueue.length} {activeTab === 'returns' ? 'Returns' : 'Orders'}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                  {TABS[activeTab].subtitle}
                </p>

                {/* 36px Search Input */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={15} style={{ position: 'absolute', left: '11px', top: '11px', color: '#9ca3af' }} />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search patient, admission, ward..."
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '0 12px 0 34px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Ward Pills */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
                  {availableWards.map((wardName) => {
                    const isSelected = selectedWard === wardName;
                    return (
                      <button
                        key={wardName}
                        onClick={() => setSelectedWard(wardName)}
                        style={{
                          height: '32px',
                          padding: '0 9px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          background: isSelected ? '#2563eb' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#4b5563',
                          border: `1px solid ${isSelected ? '#2563eb' : '#e5e7eb'}`,
                          flexShrink: 0,
                        }}
                      >
                        {wardName === 'All' ? `All (${queue.length})` : wardName}
                      </button>
                    );
                  })}
                </div>

                {/* Sub-status pills for Pending Issues */}
                {activeTab === 'pending' && (
                  <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    {PENDING_STATUS_FILTERS.map((st) => {
                      const isSelected = pendingStatusFilter === st;
                      const sStyle = PENDING_STATUS_STYLES[st];
                      return (
                        <button
                          key={st}
                          onClick={() => setPendingStatusFilter(st)}
                          style={{
                            height: '32px',
                            padding: '0 8px',
                            borderRadius: '5px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: isSelected ? (sStyle ? sStyle.bg : '#2563eb') : '#ffffff',
                            color: isSelected ? (sStyle ? sStyle.fg : '#ffffff') : '#64748b',
                            border: `1px solid ${isSelected ? (sStyle ? sStyle.bd : '#2563eb') : '#e2e8f0'}`,
                            flexShrink: 0,
                          }}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Return classification pills */}
                {activeTab === 'returns' && (
                  <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    {WARD_RETURN_CLASSIFICATIONS.map((cls) => {
                      const isSelected = returnClassificationFilter === cls;
                      const cStyle = RETURN_CLASS_STYLES[cls];
                      return (
                        <button
                          key={cls}
                          onClick={() => setReturnClassificationFilter(cls)}
                          style={{
                            height: '32px',
                            padding: '0 8px',
                            borderRadius: '5px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: isSelected ? (cStyle ? cStyle.bg : '#2563eb') : '#ffffff',
                            color: isSelected ? (cStyle ? cStyle.fg : '#ffffff') : '#64748b',
                            border: `1px solid ${isSelected ? (cStyle ? cStyle.bd : '#2563eb') : '#e2e8f0'}`,
                            flexShrink: 0,
                          }}
                        >
                          {cls}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Scrollable Items List */}
              <div
                style={{
                  maxHeight: 'calc(100vh - 290px)',
                  overflowY: 'auto',
                  borderTop: '1px solid #f3f4f6',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {activeTab === 'returns' ? (
                  displayedReturns.length === 0 ? (
                    <div style={{ padding: '36px 16px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                      No ward returns found
                    </div>
                  ) : (
                    displayedReturns.map((ret) => {
                      const isSelected = ret.id === selectedReturnId;
                      const returnClass = ret.classification || ret.type || 'Unused';
                      const cStyle = RETURN_CLASS_STYLES[returnClass] || RETURN_CLASS_STYLES.Unused;

                      return (
                        <div
                          key={ret.id}
                          onClick={() => setSelectedReturnId(ret.id)}
                          style={{
                            padding: '12px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: isSelected ? '#1d4ed8' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                              {ret.patient || ret.customer_name}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: cStyle.bg, color: cStyle.fg, border: `1px solid ${cStyle.bd}` }}>
                              {returnClass}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569' }}>
                              {ret.return_number || ret.id}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {ret.ward || 'Ward'} · {ret.bed || 'Bed'}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ret.items ? ret.items.map((i: any) => i.name).join(', ') : 'Returned items'}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: ret.status === 'Credited' ? '#15803d' : '#b45309' }}>
                              ₹{Number(ret.total_refund_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: ret.status === 'Credited' ? '#f0fdf4' : '#fffbeb', color: ret.status === 'Credited' ? '#15803d' : '#b45309' }}>
                              {ret.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )
                ) : (
                  displayedQueue.length === 0 ? (
                    <div style={{ padding: '36px 16px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                      No requisitions matching filters
                    </div>
                  ) : (
                    displayedQueue.map((req) => {
                      const isSelected = req.id === selectedOrderId;
                      const prio = PRIO_STYLES[req.priority] || PRIO_STYLES.ROUTINE;
                      const pendingSt = getOrderPendingStatus(req);
                      const pendingStyle = PENDING_STATUS_STYLES[pendingSt] || PENDING_STATUS_STYLES.Reviewing;

                      return (
                        <div
                          key={req.id}
                          onClick={() => {
                            setCompletedOrder(null);
                            setSelectedOrderId(req.id);
                          }}
                          style={{
                            padding: '12px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: isSelected ? '#1d4ed8' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                              {req.patient_name}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: prio.bg, color: prio.fg, border: `1px solid ${prio.bd}` }}>
                              {req.priority}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569' }}>
                              {req.admission_number}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {req.ward} · {req.bed}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {req.lines.map((l) => l.name.replace(/ \d.*$/, '')).join(', ')}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              {req.has_cd && (
                                <span style={{ fontSize: '9px', fontWeight: 700, borderRadius: '3px', padding: '1px 4px', background: '#111827', color: '#ffffff' }}>
                                  CD
                                </span>
                              )}
                              {req.has_cold_chain && (
                                <span style={{ fontSize: '9px', fontWeight: 700, borderRadius: '3px', padding: '1px 4px', background: '#f0f9ff', color: '#0369a1' }}>
                                  COLD
                                </span>
                              )}
                              {req.allergy_conflict && !req.allergy_override && (
                                <span style={{ fontSize: '9px', fontWeight: 700, borderRadius: '3px', padding: '1px 4px', background: '#fef2f2', color: '#dc2626' }}>
                                  ALLERGY
                                </span>
                              )}
                              <span style={{ fontSize: '11px', color: req.priority === 'STAT' ? '#dc2626' : '#64748b', fontWeight: req.priority === 'STAT' ? 700 : 400 }}>
                                {req.wait_minutes}m wait
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: activeTab === 'pending' ? pendingStyle.bg : (req.status === 'DISPENSED' ? '#f0fdf4' : '#eff6ff'),
                                color: activeTab === 'pending' ? pendingStyle.fg : (req.status === 'DISPENSED' ? '#15803d' : '#1d4ed8'),
                                border: `1px solid ${activeTab === 'pending' ? pendingStyle.bd : (req.status === 'DISPENSED' ? '#bbf7d0' : '#bfdbfe')}`,
                              }}
                            >
                              {activeTab === 'pending'
                                ? pendingSt
                                : (req.status === 'DISPENSED' ? 'Issued' : (req.step === 1 ? 'Review' : req.step === 2 ? 'Allocated' : 'Issuing'))}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>

            {/* Right Panel: 3 Columns */}
            <div
              data-hms-detail
              style={{
                width: '100%',
                minWidth: 0,
                maxWidth: '100%',
                boxSizing: 'border-box',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                position: 'sticky',
                top: '70px',
                maxHeight: 'calc(100vh - 120px)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ffffff',
                  flexShrink: 0,
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <PackageOpen size={20} color="#2563eb" />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                        {activeTab === 'returns'
                          ? (activeReturn?.return_number || 'Ward Return Details')
                          : (activeOrder?.order_number || 'Ward Requisition Inspection')}
                      </h3>
                      {activeTab === 'returns' && activeReturn ? (
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: (RETURN_CLASS_STYLES[activeReturn.classification || activeReturn.type || 'Unused'] || RETURN_CLASS_STYLES.Unused).bg, color: (RETURN_CLASS_STYLES[activeReturn.classification || activeReturn.type || 'Unused'] || RETURN_CLASS_STYLES.Unused).fg }}>
                          {activeReturn.classification || activeReturn.type || 'Unused'}
                        </span>
                      ) : activeOrder ? (
                        <>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: PRIO_STYLES[activeOrder.priority]?.bg, color: PRIO_STYLES[activeOrder.priority]?.fg }}>
                            {activeOrder.priority}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '1px 6px' }}>
                            Step {wizardStep} of 5 · {OPERATIONAL_STEPS[wizardStep - 1]?.label}
                          </span>
                        </>
                      ) : null}
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                      {activeTab === 'returns'
                        ? 'Inspection and credit return to inpatient admission ledger'
                        : 'MAR clinical check, stock allocation and nurse handover verification'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {activeOrder && activeOrder.is_emergency && activeOrder.status !== 'DISPENSED' && (
                    <button
                      onClick={() => setEmergencyModalOpen(true)}
                      style={{
                        height: '40px',
                        padding: '0 14px',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#dc2626',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Siren size={15} />
                      STAT Fast-Track
                    </button>
                  )}
                  <button
                    onClick={handleCallNext}
                    style={{
                      height: '40px',
                      padding: '0 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#2563eb',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <ArrowRight size={15} />
                    Call Next
                  </button>
                </div>
              </div>

              {/* 4-Box Overview Strip */}
              {activeOrder && activeTab !== 'returns' ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    gap: '12px',
                    padding: '16px 24px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e5e7eb',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Patient &amp; Admission
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeOrder.patient_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px', fontFamily: 'monospace' }}>
                      {activeOrder.admission_number} · {activeOrder.age}y/{activeOrder.gender.slice(0, 1)}
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Location &amp; Care Team
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                      {activeOrder.ward} · {activeOrder.bed}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                      {activeOrder.doctor_name}
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Priority &amp; Turnaround
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: activeOrder.priority === 'STAT' ? '#dc2626' : '#111827', marginTop: '2px' }}>
                      {activeOrder.priority} · {activeOrder.wait_minutes}m wait
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                      Req by {activeOrder.nurse_name} at {activeOrder.created_at_time}
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Clinical Status
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: wizardStep >= 4 || activeOrder.status === 'DISPENSED' ? '#15803d' : '#b45309', marginTop: '2px' }}>
                      MAR: {wizardStep >= 4 || activeOrder.status === 'DISPENSED' ? 'Ready to Administer' : 'Awaiting Supply'}
                    </div>
                    <div style={{ fontSize: '11px', color: activeOrder.allergies.length > 0 ? '#dc2626' : '#16a34a', fontWeight: 600, marginTop: '1px' }}>
                      {activeOrder.allergies.length > 0 ? `Allergies: ${activeOrder.allergies.join(', ')}` : 'No Known Allergies'}
                    </div>
                  </div>
                </div>
              ) : activeReturn ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    gap: '12px',
                    padding: '16px 24px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e5e7eb',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Patient &amp; UHID
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                      {activeReturn.patient || activeReturn.customer_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px', fontFamily: 'monospace' }}>
                      {activeReturn.adm || 'Admission'}
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Ward Location
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                      {activeReturn.ward}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                      Bed: {activeReturn.bed || 'General'}
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Classification
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                      {activeReturn.classification || activeReturn.type || 'Unused'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                      Reason: {activeReturn.reason}
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Refund Value
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#b45309', marginTop: '2px' }}>
                      ₹{Number(activeReturn.total_refund_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '11px', color: activeReturn.status === 'Credited' ? '#15803d' : '#2563eb', fontWeight: 600, marginTop: '1px' }}>
                      {activeReturn.status === 'Credited' ? 'Credited to Ledger' : 'Credit Pending Intake'}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Wizard Body Container */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {!activeOrder && activeTab !== 'returns' ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Nothing selected</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Open a row from the left queue</div>
                  </div>
                ) : activeTab === 'returns' && activeReturn ? (
                  /* ===================================== */
                  /* RETURNS WIZARD (Right Panel - Req 7)  */
                  /* ===================================== */
                  /* ===================================== */
                  <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                    <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>{activeReturn.return_number || activeReturn.id}</h3>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: '24px',
                            padding: '0 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: (RETURN_CLASS_STYLES[activeReturn.classification || activeReturn.type || 'Unused'] || RETURN_CLASS_STYLES.Unused).bg,
                            color: (RETURN_CLASS_STYLES[activeReturn.classification || activeReturn.type || 'Unused'] || RETURN_CLASS_STYLES.Unused).fg,
                            border: `1px solid ${(RETURN_CLASS_STYLES[activeReturn.classification || activeReturn.type || 'Unused'] || RETURN_CLASS_STYLES.Unused).bd}`,
                          }}
                        >
                          {activeReturn.classification || activeReturn.type || 'Unused'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff', border: '1px solid #e5e7eb', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>
                          {(activeReturn.patient || 'WP').slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{activeReturn.patient || activeReturn.customer_name}</div>
                          <div style={{ fontSize: '12px', color: '#4b5563', fontFamily: 'monospace', marginTop: '2px' }}>{activeReturn.adm}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{activeReturn.ward} · {activeReturn.bed}</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>RETURNED ITEMS</div>
                      <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1d4ed8' }}>
                        Total credit amount: ₹{Number(activeReturn.total_refund_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: '13px', color: '#374151' }}>Reason: {activeReturn.reason}</div>
                      {activeReturn.notes && (
                        <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>Note: {activeReturn.notes}</div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                        {activeReturn.status === 'Requested' && (
                          <button
                            onClick={() => handleProcessReturn('receive')}
                            style={{ height: '40px', borderRadius: '10px', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', border: 'none' }}
                          >
                            Mark received at pharmacy
                          </button>
                        )}
                        {activeReturn.status === 'Received' && (
                          <>
                            <button
                              onClick={() => handleProcessReturn('complete', 'restock')}
                              style={{ height: '40px', borderRadius: '10px', background: '#16a34a', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', border: 'none' }}
                            >
                              Restock & Credit admission ledger
                            </button>
                            <button
                              onClick={() => handleProcessReturn('complete', 'quarantine')}
                              style={{ height: '40px', borderRadius: '10px', background: '#fff', color: '#dc2626', fontWeight: 600, fontSize: '14px', cursor: 'pointer', border: '1px solid #fecaca' }}
                            >
                              Quarantine (log ward loss)
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ========================================================= */
                  /* INPATIENT REQUISITION 5-STEP LIFECYCLE WIZARD (Req 1,2,3,4,5) */
                  /* ========================================================= */
                  activeOrder && (
                    <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                      {/* Right Panel Header Info */}
                      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>
                              {activeOrder.order_number} · {activeOrder.lines.length} item{activeOrder.lines.length > 1 ? 's' : ''}
                            </h3>
                            <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: PRIO_STYLES[activeOrder.priority]?.bg, color: PRIO_STYLES[activeOrder.priority]?.fg, border: `1px solid ${PRIO_STYLES[activeOrder.priority]?.bd}` }}>
                              {activeOrder.priority}
                            </span>
                          </div>

                          {/* Requirement 2: Request Lifecycle Indicator */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                              Step {wizardStep} of 5 · <strong style={{ color: '#111827' }}>{OPERATIONAL_STEPS[wizardStep - 1]?.label}</strong>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', background: wizardStep === 5 ? '#f0fdf4' : '#eff6ff', color: wizardStep === 5 ? '#15803d' : '#1d4ed8' }}>
                              {wizardStep === 5 ? 'COMPLETED' : 'IN PROGRESS'}
                            </span>
                          </div>

                          {/* 5-Segment Progress Bar (Requirement 2) */}
                          <div style={{ display: 'flex', gap: '4px', marginTop: '10px' }}>
                            {OPERATIONAL_STEPS.map((s) => (
                              <div
                                key={s.step}
                                title={`${s.step}. ${s.label}`}
                                style={{
                                  flex: 1,
                                  height: '4px',
                                  borderRadius: '2px',
                                  background: s.step <= wizardStep ? (wizardStep === 5 ? '#16a34a' : '#2563eb') : '#e5e7eb',
                                  transition: 'background 0.2s',
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Patient & Location Card */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff', border: '1px solid #e5e7eb', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>
                            {activeOrder.patient_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                              {activeOrder.patient_name} · {activeOrder.age}y · {activeOrder.gender.slice(0, 1)}
                            </div>
                            <div style={{ fontSize: '12px', color: '#4b5563', fontFamily: 'monospace', marginTop: '2px' }}>
                              {activeOrder.admission_number}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                              {activeOrder.ward} · {activeOrder.bed} · {activeOrder.doctor_name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              Requested by {activeOrder.nurse_name} at {activeOrder.created_at_time}
                            </div>
                          </div>
                        </div>

                        {/* Chips & MAR Badge (Requirement 5) */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {activeOrder.allergies.length > 0 ? (
                            activeOrder.allergies.map((alg) => (
                              <span key={alg} style={{ display: 'inline-flex', alignItems: 'center', height: '26px', padding: '0 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                                Allergy: {alg}
                              </span>
                            ))
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', height: '26px', padding: '0 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb' }}>
                              No known allergies
                            </span>
                          )}
                          <span style={{ display: 'inline-flex', alignItems: 'center', height: '26px', padding: '0 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}>
                            IPD ledger
                          </span>

                          {/* Live MAR Badge (Requirement 5) */}
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              height: '26px',
                              padding: '0 10px',
                              borderRadius: '9999px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: wizardStep >= 4 || activeOrder.status === 'DISPENSED' ? '#f0fdf4' : '#fffbeb',
                              color: wizardStep >= 4 || activeOrder.status === 'DISPENSED' ? '#15803d' : '#b45309',
                              border: `1px solid ${wizardStep >= 4 || activeOrder.status === 'DISPENSED' ? '#bbf7d0' : '#fde68a'}`,
                            }}
                          >
                            <Pill size={12} />
                            MAR: {wizardStep >= 4 || activeOrder.status === 'DISPENSED' ? 'Ready To Administer' : 'Awaiting Supply'}
                          </span>
                        </div>
                      </div>

                      {/* Wizard Step Content Blocks */}
                      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* ========================================== */}
                        {/* STEP 1: REVIEW (CLINICAL & ALLERGIES)      */}
                        {/* ========================================== */}
                        {wizardStep === 1 && (
                          <>
                            {/* Requirement 1: Allocation Visibility in Step 1 */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                                REQUESTED ITEMS & ALLOCATION
                              </div>
                              {activeOrder.lines.map((l) => {
                                const reqQty = l.prescribed_quantity;
                                const allocQty = l.allocated_quantity ?? (l.available_stock >= reqQty ? reqQty : l.available_stock);
                                const remQty = l.remaining_quantity ?? Math.max(0, reqQty - allocQty);
                                const backorderQty = l.backordered_quantity ?? (l.available_stock < reqQty ? reqQty - l.available_stock : 0);

                                return (
                                  <div key={l.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{l.name}</span>
                                          {l.is_cd && <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', background: '#111827', borderRadius: '4px', padding: '1px 6px' }}>CD</span>}
                                          {l.mar_status && (
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1', background: '#f0f9ff', borderRadius: '4px', padding: '1px 6px' }}>
                                              {l.mar_status}
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                          {l.dose} · MAR order
                                        </div>
                                      </div>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', background: l.available_stock === 0 ? '#fef2f2' : l.available_stock < reqQty ? '#fffbeb' : '#f0fdf4', color: l.available_stock === 0 ? '#dc2626' : l.available_stock < reqQty ? '#b45309' : '#15803d', border: `1px solid ${l.available_stock === 0 ? '#fecaca' : l.available_stock < reqQty ? '#fde68a' : '#bbf7d0'}` }}>
                                        {l.available_stock === 0 ? 'Out of stock' : l.available_stock < reqQty ? `Partial · ${l.available_stock} of ${reqQty}` : `Available · ${l.available_stock}`}
                                      </span>
                                    </div>

                                    {/* Requirement 1: 4-Badge Allocation Strip */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '8px', padding: '6px 8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Requested</div>
                                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>{reqQty}</div>
                                      </div>
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#059669', fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Allocated</div>
                                        <div style={{ fontWeight: 700, color: '#059669', fontSize: '13px' }}>{allocQty}</div>
                                      </div>
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: remQty > 0 ? '#b45309' : '#64748b', fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Remaining</div>
                                        <div style={{ fontWeight: 700, color: remQty > 0 ? '#b45309' : '#64748b', fontSize: '13px' }}>{remQty}</div>
                                      </div>
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: backorderQty > 0 ? '#dc2626' : '#64748b', fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Backordered</div>
                                        <div style={{ fontWeight: 700, color: backorderQty > 0 ? '#dc2626' : '#64748b', fontSize: '13px' }}>{backorderQty}</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Allergy Check */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>ALLERGY CHECK</div>
                              {!activeOrder.allergy_conflict ? (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                  <CheckCircle2 size={18} color="#15803d" />
                                  <div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#15803d' }}>No allergy conflict</div>
                                    <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>
                                      {activeOrder.allergies.length ? `Checked against: ${activeOrder.allergies.join(', ')}` : 'No allergies on admission record'}
                                    </div>
                                  </div>
                                </div>
                              ) : activeOrder.allergy_override ? (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                                  <AlertTriangle size={18} color="#b45309" />
                                  <div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#b45309' }}>Override logged</div>
                                    <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>{activeOrder.allergy_override}</div>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                                    <XCircle size={18} color="#dc2626" />
                                    <div>
                                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>
                                        {activeOrder.allergy_conflict.allergen} allergy — {activeOrder.allergy_conflict.item_name}
                                      </div>
                                      <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>{activeOrder.allergy_conflict.note}</div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button
                                      onClick={handleQueryPrescriber}
                                      style={{ height: '40px', padding: '0 12px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#374151', border: '1px solid #d1d5db' }}
                                    >
                                      Query prescriber
                                    </button>
                                    <button
                                      onClick={() => setAllergyOverrideOpen(!allergyOverrideOpen)}
                                      style={{ height: '40px', padding: '0 12px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: allergyOverrideOpen ? '#eff6ff' : '#fff', color: allergyOverrideOpen ? '#1d4ed8' : '#374151', border: '1px solid #d1d5db' }}
                                    >
                                      Override with reason
                                    </button>
                                  </div>
                                  {allergyOverrideOpen && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      <textarea
                                        rows={2}
                                        value={allergyOverrideText}
                                        onChange={(e) => setAllergyOverrideText(e.target.value)}
                                        placeholder="Override reason · min 10 characters, then confirm"
                                        style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                                      />
                                      <button
                                        onClick={() => {
                                          if (allergyOverrideText.trim().length >= 10) {
                                            activeOrder.allergy_override = allergyOverrideText.trim();
                                            setAllergyOverrideOpen(false);
                                            showNotice('Allergy override recorded');
                                          }
                                        }}
                                        disabled={allergyOverrideText.trim().length < 10}
                                        style={{ height: '32px', borderRadius: '8px', background: '#dc2626', color: '#fff', fontSize: '12px', fontWeight: 600, border: 'none', cursor: allergyOverrideText.trim().length >= 10 ? 'pointer' : 'not-allowed', opacity: allergyOverrideText.trim().length >= 10 ? 1 : 0.5 }}
                                      >
                                        Confirm override
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Clinical Appropriateness Checks */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>CLINICAL MAR REVIEW</div>
                              <div
                                onClick={() => setOrderReviewMar(!orderReviewMar)}
                                style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', background: orderReviewMar ? '#eff6ff' : '#fff' }}
                              >
                                <span style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '1px', borderRadius: '5px', border: `1.5px solid ${orderReviewMar ? '#2563eb' : '#d1d5db'}`, background: orderReviewMar ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {orderReviewMar && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
                                </span>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Dose, route and frequency appropriate</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Clinical check against weight, renal function and indication</div>
                                </div>
                              </div>

                              <div
                                onClick={() => setOrderReviewDup(!orderReviewDup)}
                                style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', background: orderReviewDup ? '#eff6ff' : '#fff' }}
                              >
                                <span style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '1px', borderRadius: '5px', border: `1.5px solid ${orderReviewDup ? '#2563eb' : '#d1d5db'}`, background: orderReviewDup ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {orderReviewDup && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
                                </span>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>No duplicate issue in last 24 h</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Ward stock and previous issues verified</div>
                                </div>
                              </div>
                            </div>

                            {/* STAT Emergency Shortcut */}
                            {activeOrder.priority === 'STAT' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#dc2626' }}>EMERGENCY RELEASE SHORTCUT</div>
                                <button
                                  onClick={() => setEmergencyModalOpen(true)}
                                  style={{ height: '40px', padding: '0 12px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                  <Siren size={14} color="#dc2626" />
                                  Emergency issue · immediate release
                                </button>
                              </div>
                            )}
                          </>
                        )}

                        {/* ========================================== */}
                        {/* STEP 2: ALLOCATE STOCK (FEFO & Req 1, 3)   */}
                        {/* ========================================== */}
                        {wizardStep === 2 && (
                          <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                                FEFO STOCK ALLOCATION & BREAKDOWN
                              </div>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                <Layers size={18} color="#1d4ed8" />
                                <div>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1d4ed8' }}>Stock Allocation Status</div>
                                  <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>
                                    {activeOrder.lines.filter((l) => l.available_stock >= l.prescribed_quantity).length} of {activeOrder.lines.length} items fully allocated · partial and substitution supported
                                  </div>
                                </div>
                              </div>

                              {activeOrder.lines.map((l) => {
                                const reqQty = l.prescribed_quantity;
                                const allocQty = l.allocated_quantity ?? (l.available_stock >= reqQty ? reqQty : l.available_stock);
                                const remQty = l.remaining_quantity ?? Math.max(0, reqQty - allocQty);
                                const backorderQty = l.backordered_quantity ?? (l.available_stock < reqQty ? reqQty - l.available_stock : 0);

                                return (
                                  <div key={l.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{l.name}</span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                          {l.allocations && l.allocations.length > 0
                                            ? l.allocations.map((a) => `${a.batch_number} · Exp ${a.expiry_date} × ${a.allocated_quantity}`).join(', ')
                                            : 'No batch assigned'}
                                        </div>
                                      </div>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', background: l.available_stock === 0 ? '#fef2f2' : l.available_stock < reqQty ? '#fffbeb' : '#f0fdf4', color: l.available_stock === 0 ? '#dc2626' : l.available_stock < reqQty ? '#b45309' : '#15803d', border: `1px solid ${l.available_stock === 0 ? '#fecaca' : l.available_stock < reqQty ? '#fde68a' : '#bbf7d0'}` }}>
                                        {l.available_stock === 0 ? 'Out of stock' : l.available_stock < reqQty ? `Partial · ${l.available_stock}` : `Available · ${l.available_stock}`}
                                      </span>
                                    </div>

                                    {/* Requirement 1: 4-Segment Allocation Visibility Strip */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '8px', padding: '6px 8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Requested</div>
                                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>{reqQty}</div>
                                      </div>
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#059669', fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Allocated</div>
                                        <div style={{ fontWeight: 700, color: '#059669', fontSize: '13px' }}>{allocQty}</div>
                                      </div>
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: remQty > 0 ? '#b45309' : '#64748b', fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Remaining</div>
                                        <div style={{ fontWeight: 700, color: remQty > 0 ? '#b45309' : '#64748b', fontSize: '13px' }}>{remQty}</div>
                                      </div>
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: backorderQty > 0 ? '#dc2626' : '#64748b', fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Backordered</div>
                                        <div style={{ fontWeight: 700, color: backorderQty > 0 ? '#dc2626' : '#64748b', fontSize: '13px' }}>{backorderQty}</div>
                                      </div>
                                    </div>

                                    {/* Substitution Audit Display if exists (Requirement 3) */}
                                    {l.substitution_audit && (
                                      <div style={{ marginTop: '8px', padding: '8px 10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '12px', color: '#15803d' }}>
                                        <div style={{ fontWeight: 600 }}>Substitution Audit Logged</div>
                                        <div>Prescriber: {l.substitution_audit.prescriber_name} · Approved at {l.substitution_audit.approved_at || l.substitution_audit.requested_at}</div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Requirement 3: Shortage & Alternative Medicine Workflow */}
                            {activeOrder.lines
                              .filter((l) => l.available_stock < l.prescribed_quantity)
                              .map((l) => {
                                const d = itemDecisions[l.id];
                                return (
                                  <div key={l.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#b45309' }}>
                                      STOCK SHORTAGE · {l.name.toUpperCase()}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#374151' }}>
                                      Available: {l.available_stock} of {l.prescribed_quantity} requested
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                      {l.available_stock > 0 && (
                                        <button
                                          onClick={() => setItemDecisions({ ...itemDecisions, [l.id]: 'partial' })}
                                          style={{ height: '32px', padding: '0 10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: d === 'partial' ? '#eff6ff' : '#fff', color: d === 'partial' ? '#1d4ed8' : '#374151', border: `1px solid ${d === 'partial' ? '#2563eb' : '#d1d5db'}` }}
                                        >
                                          Allocate {l.available_stock}, backorder {l.prescribed_quantity - l.available_stock}
                                        </button>
                                      )}
                                      <button
                                        onClick={() => setItemDecisions({ ...itemDecisions, [l.id]: 'hold' })}
                                        style={{ height: '32px', padding: '0 10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: d === 'hold' ? '#eff6ff' : '#fff', color: d === 'hold' ? '#1d4ed8' : '#374151', border: `1px solid ${d === 'hold' ? '#2563eb' : '#d1d5db'}` }}
                                      >
                                        Hold line
                                      </button>
                                    </div>

                                    {/* Alternatives List & Prescriber Approval Trigger (Requirement 3) */}
                                    {l.alternatives && l.alternatives.length > 0 && (
                                      <div style={{ marginTop: '8px', borderTop: '1px solid #fde68a', paddingTop: '8px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                                          AVAILABLE FORMULARY SUBSTITUTES:
                                        </div>
                                        {l.alternatives.map((alt) => (
                                          <div key={alt.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', padding: '8px', background: '#fff', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                            <div>
                                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{alt.name}</span>
                                              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>
                                                {alt.reason} · <strong>{alt.stock} in stock</strong>
                                              </div>
                                            </div>
                                            <button
                                              onClick={() => handleOpenSubstitutionModal(l, alt)}
                                              style={{ height: '32px', padding: '0 10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                            >
                                              Request prescriber approval
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </>
                        )}

                        {/* ========================================== */}
                        {/* STEP 3: ISSUE MEDICINES (PICK & Req 5)     */}
                        {/* ========================================== */}
                        {wizardStep === 3 && (
                          <>
                            {/* MAR Validation Before Issue */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                                MAR VALIDATION · PRIOR TO ISSUE
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Admission active</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{activeOrder.admission_number}</div>
                                </div>
                                <span style={{ display: 'inline-flex', alignItems: 'center', height: '22px', padding: '0 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: activeOrder.mar_validation?.admission_active ? '#f0fdf4' : '#fef2f2', color: activeOrder.mar_validation?.admission_active ? '#15803d' : '#dc2626' }}>
                                  {activeOrder.mar_validation?.admission_active ? 'Verified' : 'Failed'}
                                </span>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Doctor order active on MAR</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{activeOrder.doctor_name} · current MAR</div>
                                </div>
                                <span style={{ display: 'inline-flex', alignItems: 'center', height: '22px', padding: '0 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: activeOrder.mar_validation?.order_active ? '#f0fdf4' : '#fef2f2', color: activeOrder.mar_validation?.order_active ? '#15803d' : '#dc2626' }}>
                                  {activeOrder.mar_validation?.order_active ? 'Verified' : 'Failed'}
                                </span>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Patient not discharged</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    {activeOrder.mar_validation?.patient_discharged ? `Discharged at ${activeOrder.mar_validation?.discharged_at || '10:15'}` : 'Inpatient'}
                                  </div>
                                </div>
                                <span style={{ display: 'inline-flex', alignItems: 'center', height: '22px', padding: '0 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: !activeOrder.mar_validation?.patient_discharged ? '#f0fdf4' : '#fef2f2', color: !activeOrder.mar_validation?.patient_discharged ? '#15803d' : '#dc2626' }}>
                                  {!activeOrder.mar_validation?.patient_discharged ? 'Verified' : 'Failed'}
                                </span>
                              </div>
                            </div>

                            {/* Pick & Label Checkboxes */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                                UNIT-DOSE PICK & LABEL
                              </div>
                              {activeOrder.lines.map((l) => {
                                const isPicked = !!pickedChecks[l.id];
                                return (
                                  <div
                                    key={l.id}
                                    onClick={() => setPickedChecks({ ...pickedChecks, [l.id]: !isPicked })}
                                    style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', background: isPicked ? '#eff6ff' : '#fff' }}
                                  >
                                    <span style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '1px', borderRadius: '5px', border: `1.5px solid ${isPicked ? '#2563eb' : '#d1d5db'}`, background: isPicked ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      {isPicked && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
                                    </span>
                                    <div>
                                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                                        {l.name} × {l.prescribed_quantity}
                                      </div>
                                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                        {l.allocations && l.allocations.length > 0 ? l.allocations.map((a) => `${a.batch_number} · Exp ${a.expiry_date}`).join(', ') : 'Unit dose picked'}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Labelled check */}
                              <div
                                onClick={() => setLabelsAffixed(!labelsAffixed)}
                                style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', background: labelsAffixed ? '#eff6ff' : '#fff' }}
                              >
                                <span style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '1px', borderRadius: '5px', border: `1.5px solid ${labelsAffixed ? '#2563eb' : '#d1d5db'}`, background: labelsAffixed ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {labelsAffixed && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
                                </span>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Labelled with patient, bed and admission ID</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                    {activeOrder.ward} · {activeOrder.bed} · {activeOrder.admission_number}
                                  </div>
                                </div>
                              </div>

                              {/* Cold chain box check */}
                              {activeOrder.has_cold_chain && (
                                <div
                                  onClick={() => setColdPackBox(!coldPackBox)}
                                  style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', background: coldPackBox ? '#eff6ff' : '#fff' }}
                                >
                                  <span style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '1px', borderRadius: '5px', border: `1.5px solid ${coldPackBox ? '#2563eb' : '#d1d5db'}`, background: coldPackBox ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {coldPackBox && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
                                  </span>
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Cold-chain box packed</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>2–8 °C with temperature strip</div>
                                  </div>
                                </div>
                              )}

                              {/* CD issued against register check */}
                              {activeOrder.has_cd && (
                                <div
                                  onClick={() => setCdRegisterBag(!cdRegisterBag)}
                                  style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', background: cdRegisterBag ? '#eff6ff' : '#fff' }}
                                >
                                  <span style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '1px', borderRadius: '5px', border: `1.5px solid ${cdRegisterBag ? '#2563eb' : '#d1d5db'}`, background: cdRegisterBag ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {cdRegisterBag && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
                                  </span>
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>CD issued against ward CD register</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Sealed bag · count recorded</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {/* ========================================== */}
                        {/* STEP 4: WARD HANDOVER (Req 4)              */}
                        {/* ========================================== */}
                        {wizardStep === 4 && (
                          <>
                            {/* Requirement 4: Ward Handover Tracking Form */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                                WARD HANDOVER TRACKING
                              </div>

                              {/* Handed Over By (Pharmacist) */}
                              <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                                <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                                  Handed Over By (Pharmacist)
                                </span>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginTop: '2px' }}>
                                  {pharmacistName}
                                </div>
                              </div>

                              {/* Collected By (Nurse) */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                                  Collected By (Nurse) <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                  value={receivingNurse}
                                  onChange={(e) => setReceivingNurse(e.target.value)}
                                  placeholder="Receiving nurse name"
                                  style={{ height: '36px', padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                                />
                                <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                  {[activeOrder.nurse_name || 'Rina Thomas', 'Anita Joseph', 'Charge Nurse on Duty'].map((n) => (
                                    <button
                                      key={n}
                                      onClick={() => setReceivingNurse(n)}
                                      style={{
                                        height: '32px',
                                        padding: '0 8px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: receivingNurse === n ? '#eff6ff' : '#f3f4f6',
                                        color: receivingNurse === n ? '#1d4ed8' : '#374151',
                                        border: `1px solid ${receivingNurse === n ? '#bfdbfe' : '#e5e7eb'}`,
                                      }}
                                    >
                                      {n}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Collection Time */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                                    Collection Time <span style={{ color: '#dc2626' }}>*</span>
                                  </label>
                                  <button
                                    onClick={() => setCollectionTimeInput(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))}
                                    style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                                  >
                                    Set to Now
                                  </button>
                                </div>
                                <input
                                  value={collectionTimeInput}
                                  onChange={(e) => setCollectionTimeInput(e.target.value)}
                                  placeholder="e.g. 08:45"
                                  style={{ height: '36px', padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                                />
                              </div>
                            </div>

                            {/* Handover Verification Checks */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                                HANDOVER VERIFICATION CHECKS
                              </div>
                              <div
                                onClick={() => setHandoverCounted(!handoverCounted)}
                                style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', background: handoverCounted ? '#eff6ff' : '#fff' }}
                              >
                                <span style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '1px', borderRadius: '5px', border: `1.5px solid ${handoverCounted ? '#2563eb' : '#d1d5db'}`, background: handoverCounted ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {handoverCounted && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
                                </span>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Items and quantities counted with receiving nurse</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Per bed, per item</div>
                                </div>
                              </div>

                              <div
                                onClick={() => setHandoverSigned(!handoverSigned)}
                                style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', background: handoverSigned ? '#eff6ff' : '#fff' }}
                              >
                                <span style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '1px', borderRadius: '5px', border: `1.5px solid ${handoverSigned ? '#2563eb' : '#d1d5db'}`, background: handoverSigned ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {handoverSigned && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
                                </span>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Ward copy signed</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Nurse name, ID and time on the issue slip</div>
                                </div>
                              </div>

                              {activeOrder.has_cold_chain && (
                                <div
                                  onClick={() => setHandoverFridge(!handoverFridge)}
                                  style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', background: handoverFridge ? '#eff6ff' : '#fff' }}
                                >
                                  <span style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '1px', borderRadius: '5px', border: `1.5px solid ${handoverFridge ? '#2563eb' : '#d1d5db'}`, background: handoverFridge ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {handoverFridge && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
                                  </span>
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Cold items placed in ward fridge</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Fridge log updated</div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Controlled Drug Handover */}
                            {activeOrder.has_cd && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>CONTROLLED DRUG HANDOVER</div>
                                <div
                                  onClick={() => setCdReceiverSig(!cdReceiverSig)}
                                  style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', background: cdReceiverSig ? '#eff6ff' : '#fff' }}
                                >
                                  <span style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '1px', borderRadius: '5px', border: `1.5px solid ${cdReceiverSig ? '#2563eb' : '#d1d5db'}`, background: cdReceiverSig ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {cdReceiverSig && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
                                  </span>
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Receiver signature captured</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Signed in ward CD register and on issue slip</div>
                                  </div>
                                </div>
                                <textarea
                                  rows={2}
                                  value={cdHandoverRemarks}
                                  onChange={(e) => setCdHandoverRemarks(e.target.value)}
                                  placeholder="CD remarks · count, seal number, register page (min 10 characters)"
                                  style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                                />
                              </div>
                            )}
                          </>
                        )}

                        {/* ========================================== */}
                        {/* STEP 5: COMPLETE (AUDIT SUMMARY - Req 4,5) */}
                        {/* ========================================== */}
                        {wizardStep === 5 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', borderRadius: '10px', background: activeOrder.is_emergency ? '#fef2f2' : '#f0fdf4', border: `1px solid ${activeOrder.is_emergency ? '#fecaca' : '#bbf7d0'}` }}>
                              {activeOrder.is_emergency ? <Siren size={18} color="#dc2626" /> : <CheckCircle2 size={18} color="#15803d" />}
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: activeOrder.is_emergency ? '#dc2626' : '#15803d' }}>
                                  {activeOrder.is_emergency ? 'Emergency Issued' : 'Issued to Ward'}
                                </div>
                                <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>
                                  {receivingNurse} · {activeOrder.ward} · Bedside MAR Synchronized
                                </div>
                              </div>
                            </div>

                            {/* Requirement 4: Ward Handover History Card */}
                            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                                <History size={14} color="#64748b" />
                                WARD HANDOVER CUSTODY DETAILS
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '4px', borderBottom: '1px dashed #e2e8f0' }}>
                                <span style={{ color: '#64748b' }}>Order Number</span>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeOrder.order_number}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '4px', borderBottom: '1px dashed #e2e8f0' }}>
                                <span style={{ color: '#64748b' }}>Patient</span>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeOrder.patient_name} ({activeOrder.admission_number})</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '4px', borderBottom: '1px dashed #e2e8f0' }}>
                                <span style={{ color: '#64748b' }}>Ward & Bed</span>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{activeOrder.ward} · Bed {activeOrder.bed}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '4px', borderBottom: '1px dashed #e2e8f0' }}>
                                <span style={{ color: '#64748b' }}>Collected By (Nurse)</span>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{receivingNurse}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '4px', borderBottom: '1px dashed #e2e8f0' }}>
                                <span style={{ color: '#64748b' }}>Collection Time</span>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{collectionTimeInput}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '4px', borderBottom: '1px dashed #e2e8f0' }}>
                                <span style={{ color: '#64748b' }}>Handed Over By</span>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{pharmacistName}</span>
                              </div>
                              {activeOrder.has_cd && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '4px', borderBottom: '1px dashed #e2e8f0' }}>
                                  <span style={{ color: '#64748b' }}>Controlled Drug</span>
                                  <span style={{ fontWeight: 600, color: '#15803d' }}>Count Verified & Signed</span>
                                </div>
                              )}
                              {activeOrder.has_cold_chain && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                  <span style={{ color: '#64748b' }}>Cold Chain</span>
                                  <span style={{ fontWeight: 600, color: '#0369a1' }}>2–8 °C Cold-Pack Box Verified</span>
                                </div>
                              )}
                            </div>

                            {/* Dispensed Items & Batches Summary */}
                            <div style={{ padding: '12px', background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                                <Boxes size={14} color="#64748b" />
                                DISPENSED MEDICINES & ALLOCATED BATCHES ({activeOrder.lines.length})
                              </div>
                              {activeOrder.lines.map((l) => (
                                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '6px 0', borderBottom: '1px dashed #f1f5f9' }}>
                                  <div>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{l.name}</span>
                                    <span style={{ color: '#64748b', marginLeft: '6px' }}>× {l.prescribed_quantity}</span>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                                      {l.allocations && l.allocations.length > 0
                                        ? l.allocations.map((a) => `${a.batch_number} · Exp ${a.expiry_date} (Qty ${a.allocated_quantity})`).join(', ')
                                        : 'Unit-dose verified'}
                                    </div>
                                  </div>
                                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                                    Dispensed
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Requirement 5: Live MAR Status in Step 5 */}
                            <div style={{ padding: '12px', background: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Pill size={16} color="#0369a1" />
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0369a1' }}>MAR Integration: Ready To Administer</div>
                                  <div style={{ fontSize: '11px', color: '#0284c7' }}>Bedside workstation synchronized · Nurse administration enabled</div>
                                </div>
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#0369a1', color: '#fff' }}>
                                LIVE
                              </span>
                            </div>

                            {/* Requirement 3: Substitution Audit Trail in Step 5 if any */}
                            {activeOrder.substitution_history && activeOrder.substitution_history.length > 0 && (
                              <div style={{ padding: '12px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#b45309' }}>
                                  RECORDED SUBSTITUTION AUDIT
                                </div>
                                {activeOrder.substitution_history.map((sa) => (
                                  <div key={sa.id} style={{ fontSize: '12px', color: '#4b5563' }}>
                                    <strong>{sa.original_name}</strong> substituted with <strong>{sa.substitute_name}</strong> · Approved by {sa.prescriber_name} at {sa.approved_at || sa.requested_at}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Summary Cards */}
                            {activeOrder.receipt_data?.result_summary?.map((r, idx) => {
                              const b = BADGE_STYLES[r.badge] || BADGE_STYLES.gray;
                              return (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                                  <div>
                                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{r.title}</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{r.detail}</div>
                                  </div>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: b.bg, color: b.fg, border: `1px solid ${b.bd}` }}>
                                    {r.status}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Right Panel Footer Action Bar (5-Step Stepper Controls) */}
                      <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {wizardStep >= 2 && wizardStep <= 4 && (
                            <button
                              onClick={() => {
                                const prevStep = Math.max(1, wizardStep - 1);
                                activeOrder.step = prevStep;
                                setWizardStep(prevStep);
                              }}
                              style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: 'transparent', color: '#374151', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Back
                            </button>
                          )}

                          {wizardStep === 1 && (
                            <button
                              onClick={() => {
                                activeOrder.step = 2;
                                setWizardStep(2);
                              }}
                              disabled={!activeOrder.allergy_override && !!activeOrder.allergy_conflict}
                              style={{ flex: 1, height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#2563eb', border: '1px solid #2563eb', cursor: (!activeOrder.allergy_override && !!activeOrder.allergy_conflict) ? 'not-allowed' : 'pointer', opacity: (!activeOrder.allergy_override && !!activeOrder.allergy_conflict) ? 0.5 : 1 }}
                            >
                              Proceed to stock allocation →
                            </button>
                          )}

                          {wizardStep === 2 && (
                            <button
                              onClick={() => {
                                activeOrder.step = 3;
                                setWizardStep(3);
                              }}
                              style={{ flex: 1, height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#2563eb', border: '1px solid #2563eb', cursor: 'pointer' }}
                            >
                              Proceed to issue & packing →
                            </button>
                          )}

                          {wizardStep === 3 && (
                            <button
                              onClick={() => {
                                activeOrder.step = 4;
                                setWizardStep(4);
                              }}
                              disabled={!labelsAffixed || Object.values(pickedChecks).some((v) => !v)}
                              style={{ flex: 1, height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#2563eb', border: '1px solid #2563eb', cursor: !labelsAffixed || Object.values(pickedChecks).some((v) => !v) ? 'not-allowed' : 'pointer', opacity: !labelsAffixed || Object.values(pickedChecks).some((v) => !v) ? 0.5 : 1 }}
                            >
                              Proceed to ward handover →
                            </button>
                          )}

                          {wizardStep === 4 && (
                            <button
                              onClick={handleExecuteIssue}
                              disabled={!handoverCounted || !handoverSigned || !receivingNurse.trim() || !collectionTimeInput.trim() || (activeOrder.has_cd && (!cdReceiverSig || cdHandoverRemarks.trim().length < 10))}
                              style={{ flex: 1, height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#16a34a', border: '1px solid #16a34a', cursor: !handoverCounted || !handoverSigned || !receivingNurse.trim() || !collectionTimeInput.trim() || (activeOrder.has_cd && (!cdReceiverSig || cdHandoverRemarks.trim().length < 10)) ? 'not-allowed' : 'pointer', opacity: !handoverCounted || !handoverSigned || !receivingNurse.trim() || !collectionTimeInput.trim() || (activeOrder.has_cd && (!cdReceiverSig || cdHandoverRemarks.trim().length < 10)) ? 0.5 : 1 }}
                            >
                              Confirm handover & complete
                            </button>
                          )}

                          {wizardStep === 5 && (
                            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                              <button
                                onClick={() => window.print()}
                                style={{
                                  height: '40px',
                                  padding: '0 14px',
                                  borderRadius: '10px',
                                  background: 'transparent',
                                  color: '#374151',
                                  border: '1px solid #d1d5db',
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <Printer size={15} />
                                Print Slip
                              </button>
                              <button
                                onClick={handleProceedToNextPatient}
                                style={{
                                  flex: 1,
                                  height: '40px',
                                  padding: '0 16px',
                                  borderRadius: '10px',
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  color: '#fff',
                                  background: '#16a34a',
                                  border: '1px solid #16a34a',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                }}
                              >
                                <span>Confirm & Proceed to Next Patient</span>
                                <ArrowRight size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* REQUIREMENT 3: ALTERNATIVE PRESCRIBER APPROVAL MODAL          */}
      {/* ------------------------------------------------------------- */}
      {substitutionModalOpen && substitutingItem && selectedSubstitute && (
        <div className="hms-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', width: '500px', maxWidth: '92vw', borderRadius: '14px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Stethoscope size={20} color="#2563eb" />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>Prescriber Approval for Substitution</h3>
              </div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setSubstitutionModalOpen(false)} />
            </div>

            <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1d4ed8' }}>
              Therapeutic substitution requires attending prescriber authorization before dispensing. A permanent audit record will be logged with MAR and clinical pharmacy governance.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
              <div>
                <div style={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '10px' }}>Original Prescribed</div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', marginTop: '2px' }}>{substitutingItem.name}</div>
                <div style={{ color: '#dc2626', marginTop: '2px' }}>{substitutingItem.available_stock} in stock (Stock shortage)</div>
              </div>
              <div>
                <div style={{ color: '#059669', fontWeight: 600, textTransform: 'uppercase', fontSize: '10px' }}>Proposed Alternative</div>
                <div style={{ fontWeight: 700, color: '#059669', fontSize: '13px', marginTop: '2px' }}>{selectedSubstitute.name}</div>
                <div style={{ color: '#059669', marginTop: '2px' }}>{selectedSubstitute.stock} available in Central Store</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                Prescriber
              </label>
              <input
                value={activeOrder?.doctor_name || 'Dr. Michael Chang'}
                disabled
                style={{ height: '38px', padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', background: '#f9fafb', color: '#374151' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                Clinical Rationale & Prescriber Remarks
              </label>
              <textarea
                rows={2}
                value={prescriberApprovalNotes}
                onChange={(e) => setPrescriberApprovalNotes(e.target.value)}
                placeholder="Clinical reason, dose equivalence verified, prescriber phone/verbal approval note"
                style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', outline: 'none' }}
              />
            </div>

            <div
              onClick={() => setPrescriberApprovedCheck(!prescriberApprovedCheck)}
              style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px', borderRadius: '10px', border: '1px solid #e5e7eb', background: prescriberApprovedCheck ? '#eff6ff' : '#fff', cursor: 'pointer' }}
            >
              <span style={{ width: '18px', height: '18px', borderRadius: '4px', border: `1.5px solid ${prescriberApprovedCheck ? '#2563eb' : '#d1d5db'}`, background: prescriberApprovedCheck ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {prescriberApprovedCheck && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                Prescriber verbal / electronic approval verified
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={() => setSubstitutionModalOpen(false)}
                style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: '#fff', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAuthorizeSubstitution}
                disabled={!prescriberApprovedCheck}
                style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: '#2563eb', color: '#fff', border: 'none', fontSize: '14px', fontWeight: 600, cursor: prescriberApprovedCheck ? 'pointer' : 'not-allowed', opacity: prescriberApprovedCheck ? 1 : 0.5 }}
              >
                Authorize & Record Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------ */}
      {/* EMERGENCY STAT RELEASE MODAL               */}
      {/* ------------------------------------------ */}
      {emergencyModalOpen && (
        <div className="hms-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', width: '480px', maxWidth: '90vw', borderRadius: '14px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Siren size={20} color="#dc2626" />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>STAT Emergency Release</h3>
              </div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setEmergencyModalOpen(false)} />
            </div>

            <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca', fontSize: '13px', color: '#dc2626' }}>
              Immediate release with abbreviated checks. Stock will decrement and charge will post to admission ledger automatically. Full clinical and MAR validation is flagged for retrospective review within 24 hours.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                Reason for Emergency Release <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={2}
                value={emergencyReasonInput}
                onChange={(e) => setEmergencyReasonInput(e.target.value)}
                placeholder="e.g. Acute arrhythmia crisis, verbal order Dr. Morgan"
                style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                Received by Nurse <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                value={emergencyNurseInput}
                onChange={(e) => setEmergencyNurseInput(e.target.value)}
                placeholder="Nurse name"
                style={{ height: '38px', padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', outline: 'none' }}
              />
            </div>

            {activeOrder?.has_cd && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                  Controlled Drug Remarks <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  value={emergencyCdRemarks}
                  onChange={(e) => setEmergencyCdRemarks(e.target.value)}
                  placeholder="Schedule X seal and register page"
                  style={{ height: '38px', padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', outline: 'none' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={() => setEmergencyModalOpen(false)}
                style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: '#fff', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteEmergency}
                style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: '#dc2626', color: '#fff', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Release Immediately
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPDPharmacistWorkspace;
