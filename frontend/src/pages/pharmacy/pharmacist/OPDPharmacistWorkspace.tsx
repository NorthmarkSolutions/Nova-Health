import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { RoleType } from '../../../types';
import {
  Clock,
  Search,
  RotateCcw,
  Plus,
  CircleCheck,
  Check,
  TriangleAlert,
  Package,
  PackageX,
  MessageSquare,
  Wallet,
  Receipt,
  BedDouble,
  ShieldCheck,
  FileImage,
  CircleX,
  Printer,
  MessageCircle,
  UserCheck,
  Info,
  ChevronRight,
  AlertCircle,
  Eye,
  ArrowRight,
  X,
  FileText,
  Boxes,
  ArrowLeft,
  LogOut,
  Building2,
  CreditCard,
  Coins,
  QrCode,
  Lock,
  FileBadge,
  CheckCircle2,
  Pill,
  PhoneCall,
  ShoppingCart,
} from 'lucide-react';
import {
  pharmacyOpdService,
  OPDKPIs,
  QueueOrder,
  QueueOrderItem,
  OTCSale,
  ReturnRecord,
  CompletedItem,
  TPADirectoryItem,
  CorporateDirectoryItem,
  CreditAccountItem,
  IPDAdmissionStatus,
  ShiftDrawerSummary,
} from '../../../services/pharmacyOpdService';
import NewOTCSalePage from './NewOTCSalePage';
import { pharmacyInventoryService } from '../../../services/pharmacyInventoryService';
import '../shared/pharmacyMotion.css';

// ==========================================
// BADGE STYLES (HMS DESIGN BIBLE)
// ==========================================
const B = {
  gray: { bg: '#f9fafb', fg: '#374151', bd: '#e5e7eb' },
  blue: { bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' },
  amber: { bg: '#fffbeb', fg: '#b45309', bd: '#fde68a' },
  red: { bg: '#fef2f2', fg: '#dc2626', bd: '#fecaca' },
  green: { bg: '#f0fdf4', fg: '#15803d', bd: '#bbf7d0' },
  sky: { bg: '#f0f9ff', fg: '#0369a1', bd: '#bae6fd' },
  dark: { bg: '#111827', fg: '#ffffff', bd: '#111827' },
};

const formatINR = (n: number) =>
  '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

// Schedule badge helper
const getScheduleBadge = (sched: string, isCd: boolean) => {
  if (isCd) return { text: `CD · ${sched}`, bg: '#111827', fg: '#ffffff', bd: '#111827' };
  if (sched === 'OTC') return { text: 'OTC', bg: '#f0fdf4', fg: '#15803d', bd: '#bbf7d0' };
  return { text: `Sch. ${sched}`, bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' };
};

// Filter pill styling helper matching InventoryManagerWorkspace & HMS Design Bible
const getPillStyle = (isActive: boolean, customColor?: 'red' | 'dark' | 'amber') => {
  const base = {
    height: '32px',
    padding: '0 12px',
    borderRadius: '9999px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    outline: 'none',
    transition: 'all 0.15s ease',
  };

  if (customColor === 'red') {
    return {
      ...base,
      background: isActive ? '#dc2626' : '#fef2f2',
      color: isActive ? '#ffffff' : '#dc2626',
      border: `1px solid ${isActive ? '#dc2626' : '#fecaca'}`,
    };
  }
  if (customColor === 'dark') {
    return {
      ...base,
      background: isActive ? '#111827' : '#f3f4f6',
      color: isActive ? '#ffffff' : '#111827',
      border: `1px solid ${isActive ? '#111827' : '#d1d5db'}`,
    };
  }
  if (customColor === 'amber') {
    return {
      ...base,
      background: isActive ? '#d97706' : '#fffbeb',
      color: isActive ? '#ffffff' : '#b45309',
      border: `1px solid ${isActive ? '#d97706' : '#fde68a'}`,
    };
  }
  return {
    ...base,
    background: isActive ? '#2563eb' : '#ffffff',
    color: isActive ? '#ffffff' : '#374151',
    border: `1px solid ${isActive ? '#2563eb' : '#e5e7eb'}`,
  };
};

// Search match highlighter (HMS Design Bible aligned)
const highlightMatch = (text: string, query: string) => {
  if (!query || !query.trim() || !text) return text;
  const q = query.trim();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            style={{
              background: '#fef08a',
              color: '#854d0e',
              padding: '0 2px',
              borderRadius: '3px',
              fontWeight: 700,
            }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export interface OPDPharmacistWorkspaceProps {
  isEmbedded?: boolean;
  activeSubTab?: 'queue' | 'otc' | 'done' | 'returns' | 'stock';
  onSubTabChange?: (tab: string) => void;
  hideSidebar?: boolean;
  hideHeader?: boolean;
  initialQueuePill?: string;
  triggerCallNext?: number;
  initialStockSearch?: string;
  initialCreateOtc?: boolean;
}

export const OPDPharmacistWorkspace: React.FC<OPDPharmacistWorkspaceProps> = ({
  isEmbedded = false,
  activeSubTab,
  onSubTabChange,
  hideSidebar = false,
  hideHeader = false,
  initialQueuePill,
  triggerCallNext,
  initialStockSearch = '',
  initialCreateOtc = false,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (activeSubTab || searchParams.get('tab') || 'queue').toLowerCase();

  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const isHospitalAdmin = role === RoleType.HOSPITAL_ADMIN || role === RoleType.SUPER_ADMIN;
  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Arjun Varma';
  const initials = displayName.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'AV';
  const designation = user?.designation || (role === RoleType.PHARMACIST ? 'Clinical Pharmacist · Dispensing & Ward Supply' : (role ? role.replace(/_/g, ' ') : 'Clinical Pharmacist'));

  // Navigation Tabs
  const setTab = (t: string) => {
    if (onSubTabChange) {
      onSubTabChange(t);
    }
    setSearchParams({ tab: t });
  };

  // State: KPIs
  const [kpis, setKpis] = useState<OPDKPIs>({
    pending_verification: 6,
    stat_count: 1,
    otc_sales_today: 5,
    otc_revenue_today: 554.0,
    pending_returns: 1,
    refund_requests_due: 1,
    refund_amount_due: 28.8,
    cd_entries_today: 5,
    cd_overrides_today: 0,
  });

  // State: Tab 1 - Queue
  const [queue, setQueue] = useState<QueueOrder[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [qSearch, setQSearch] = useState('');
  const [queuePill, setQueuePill] = useState(initialQueuePill || 'all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Sync initialQueuePill changes
  useEffect(() => {
    if (initialQueuePill) {
      setQueuePill(initialQueuePill);
    }
  }, [initialQueuePill]);

  // Listen for external triggerCallNext signal
  const lastTriggerRef = React.useRef<number | undefined>(triggerCallNext);
  useEffect(() => {
    if (triggerCallNext !== undefined && triggerCallNext !== lastTriggerRef.current) {
      lastTriggerRef.current = triggerCallNext;
      handleCallNext();
    }
  }, [triggerCallNext]);

  // State: Tab 2 - OTC
  const [otcSales, setOtcSales] = useState<OTCSale[]>([]);
  const [otcLoading, setOtcLoading] = useState(false);
  const [activeSale, setActiveSale] = useState<any | null>(null);
  const [otcSearch, setOtcSearch] = useState('');
  const [selectedOtcId, setSelectedOtcId] = useState<string | null>(null);

  // State: Tab 3 - Completed Today
  const [completedList, setCompletedList] = useState<CompletedItem[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [compSearch, setCompSearch] = useState('');
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);

  // State: Tab 4 - Returns & Refunds
  const [returnsList, setReturnsList] = useState<ReturnRecord[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [returnPill, setReturnPill] = useState('all');
  const [returnSearch, setReturnSearch] = useState('');
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [newReturnOpen, setNewReturnOpen] = useState(false);
  const [newReturnSearch, setNewReturnSearch] = useState('');

  // State: Tab 5 - Stock Lookup
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockPill, setStockPill] = useState('all');
  const [stockSearch, setStockSearch] = useState(initialStockSearch);
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [stockNameTip, setStockNameTip] = useState<string | null>(null);

  // Sync initialStockSearch changes and auto-focus search input if on stock tab
  useEffect(() => {
    if (initialStockSearch !== undefined) {
      setStockSearch(initialStockSearch);
    }
  }, [initialStockSearch]);

  // Modals & UI States
  const [allergyModalOpen, setAllergyModalOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideRemarks, setOverrideRemarks] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Active Wizard Steppers in Right Panel
  // Queue 7-step wizard fields:
  const [wizardStep, setWizardStep] = useState(1);
  const [idConfirmed, setIdConfirmed] = useState(false);
  const [interactionAck, setInteractionAck] = useState(false);
  const [cdRemarks, setCdRemarks] = useState('');
  const [cdWitness, setCdWitness] = useState('Dr. Pooja Shah · Senior Pharmacist');
  const [cdRxSighted, setCdRxSighted] = useState(false);
  const [cdPhotoId, setCdPhotoId] = useState(false);
  // Phase 5: Billing Settlement & 6 Engines State
  const [tpaDirectory, setTpaDirectory] = useState<TPADirectoryItem[]>([]);
  const [corpDirectory, setCorpDirectory] = useState<CorporateDirectoryItem[]>([]);
  const [creditAccounts, setCreditAccounts] = useState<CreditAccountItem[]>([]);
  const [shiftSummary, setShiftSummary] = useState<ShiftDrawerSummary | null>(null);
  const [shiftDrawerModalOpen, setShiftDrawerModalOpen] = useState(false);

  const [paymentModeChoice, setPaymentModeChoice] = useState<
    'PAY_AT_PHARMACY' | 'PAY_AT_RECEPTION' | 'INSURANCE' | 'CORPORATE' | 'CREDIT' | 'IPD_RUNNING_BILL'
  >('PAY_AT_PHARMACY');
  const [tenderMethod, setTenderMethod] = useState<'Cash' | 'Card' | 'UPI'>('Cash');
  const [tenderAmount, setTenderAmount] = useState('');
  const [tenderRef, setTenderRef] = useState('');
  const [receptionRcpt, setReceptionRcpt] = useState('');
  const [receptionPolicy, setReceptionPolicy] = useState<'PRE_PAID' | 'POST_PAID'>('PRE_PAID');

  // Insurance / TPA State
  const [selectedTpaId, setSelectedTpaId] = useState<string>('TPA-STAR-01');
  const [tpaPolicyNo, setTpaPolicyNo] = useState<string>('SH-992140');
  const [tpaPreauthCode, setTpaPreauthCode] = useState<string>('AUTH-STAR-998');
  const [copaySettled, setCopaySettled] = useState<boolean>(true);
  const [copayMethod, setCopayMethod] = useState<'Cash' | 'Card' | 'UPI'>('Card');

  // Corporate B2B State
  const [selectedCorpId, setSelectedCorpId] = useState<string>('CORP-IR-01');
  const [corpBadgeId, setCorpBadgeId] = useState<string>('WR-EMP-88412');
  const [corpAuthLetter, setCorpAuthLetter] = useState<string>('LET-WR-2026-9');

  // Hospital Credit State
  const [selectedCreditId, setSelectedCreditId] = useState<string>('CR-STAFF-01');

  // Motion: fade the right box when the selection changes (HMS bible 19.10)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll<HTMLElement>('[data-hms-detail]').forEach((el) => {
      if (typeof el.animate === 'function') el.animate([{ opacity: 0.55, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 160, easing: 'ease-out' });
    });
  }, [selectedCompId, selectedOrderId, selectedOtcId, selectedReturnId, selectedStockId]);
  const [creditAuthName, setCreditAuthName] = useState<string>('Dr. Sarah Jenkins - Medical Superintendent');
  const [creditAuthPin, setCreditAuthPin] = useState<string>('4412');
  const [creditJustification, setCreditJustification] = useState<string>('Authorized monthly staff healthcare entitlement');

  // IPD Admission Status
  const [ipdAdmissionStatus, setIpdAdmissionStatus] = useState<IPDAdmissionStatus | null>(null);
  const [payerVerified, setPayerVerified] = useState(false);

  // Completed Dispense Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [completedReceiptData, setCompletedReceiptData] = useState<any | null>(null);
  const [pickedLines, setPickedLines] = useState<Record<string, boolean>>({});
  const [labelsAffixed, setLabelsAffixed] = useState(false);
  const [counselLang, setCounselLang] = useState('English');
  const [counselChecks, setCounselChecks] = useState<Record<string, boolean>>({
    dosage: false,
    timing: false,
    side_effects: false,
    storage: false,
    caution: false,
  });

  // Prescription Outcome State (Requirements 1, 2, 3)
  const [prescriptionOutcome, setPrescriptionOutcome] = useState<
    'FULL_PURCHASE' | 'PARTIAL_PURCHASE' | 'PURCHASED_OUTSIDE' | 'DECIDE_LATER'
  >('FULL_PURCHASE');
  const [selectedDispenseItems, setSelectedDispenseItems] = useState<Record<string, boolean>>({});
  const [outsideReason, setOutsideReason] = useState<
    'PATIENT_CHOICE' | 'PRICE_CONCERN' | 'OUT_OF_STOCK' | 'INSURANCE_RESTRICTION'
  >('PATIENT_CHOICE');
  const [outsideNotes, setOutsideNotes] = useState('');
  const [isCreatingOtcSale, setIsCreatingOtcSale] = useState(initialCreateOtc);

  useEffect(() => {
    if (initialCreateOtc) {
      setIsCreatingOtcSale(true);
    }
  }, [initialCreateOtc]);

  // Return wizard:
  const [retInspectChecks, setRetInspectChecks] = useState<Record<string, boolean>>({
    sealed: false,
    batch_matches: false,
    expiry_ok: false,
    storage_ok: false,
  });
  const [retDisposition, setRetDisposition] = useState<'restock' | 'quarantine'>('restock');

  // Load KPI data
  const loadKpis = useCallback(async () => {
    try {
      const data = await pharmacyOpdService.getOPDKPIs();
      setKpis(data);
    } catch (err) {
      console.error('Failed to load OPD KPIs:', err);
    }
  }, []);

  // Load Dispense Queue
  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const orders = await pharmacyOpdService.getDispenseQueue({
        pill: queuePill,
        q: qSearch,
      });
      setQueue(orders);
      if (orders.length > 0 && !selectedOrderId) {
        setSelectedOrderId(orders[0].id);
      }
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setQueueLoading(false);
    }
  }, [queuePill, qSearch, selectedOrderId]);

  // Load OTC Sales
  const loadOtcSales = useCallback(async () => {
    setOtcLoading(true);
    try {
      const sales = await pharmacyOpdService.getOTCSales({ q: otcSearch });
      setOtcSales(sales);
      if (sales.length > 0 && !selectedOtcId) {
        setSelectedOtcId(sales[0].id);
      }
    } catch (err) {
      console.error('Failed to load OTC sales:', err);
    } finally {
      setOtcLoading(false);
    }
  }, [otcSearch, selectedOtcId]);

  // Load Completed Today
  const loadCompletedToday = useCallback(async () => {
    setCompletedLoading(true);
    try {
      const comp = await pharmacyOpdService.getCompletedToday({ q: compSearch });
      setCompletedList(comp);
      if (comp.length > 0 && !selectedCompId) {
        setSelectedCompId(comp[0].id);
      }
    } catch (err) {
      console.error('Failed to load completed today:', err);
    } finally {
      setCompletedLoading(false);
    }
  }, [compSearch, selectedCompId]);

  // Load Returns
  const loadReturns = useCallback(async () => {
    setReturnsLoading(true);
    try {
      const rets = await pharmacyOpdService.getReturns({ status: returnPill, q: returnSearch });
      setReturnsList(rets);
      if (rets.length > 0 && !selectedReturnId) {
        setSelectedReturnId(rets[0].id);
      }
    } catch (err) {
      console.error('Failed to load returns:', err);
    } finally {
      setReturnsLoading(false);
    }
  }, [returnPill, returnSearch, selectedReturnId]);

  // Load Stock Lookup
  const loadStock = useCallback(async () => {
    setStockLoading(true);
    try {
      const st = await pharmacyOpdService.getStockLookup({ pill: stockPill, q: stockSearch });
      setStockItems(st);
    } catch (err) {
      console.error('Failed to load stock:', err);
    } finally {
      setStockLoading(false);
    }
  }, [stockPill, stockSearch]);

  // Load Billing Settlement Directories & Shift Drawer
  const loadBillingMetadata = useCallback(async () => {
    try {
      const [tpas, corps, credits, drawer] = await Promise.all([
        pharmacyOpdService.getTPADirectory(),
        pharmacyOpdService.getCorporateDirectory(),
        pharmacyOpdService.getCreditAccounts(),
        pharmacyOpdService.getShiftDrawer(),
      ]);
      setTpaDirectory(tpas);
      setCorpDirectory(corps);
      setCreditAccounts(credits);
      setShiftSummary(drawer);
    } catch (e) {
      console.error('Failed to load billing metadata:', e);
    }
  }, []);

  // Initial & Tab-based effect
  useEffect(() => {
    loadKpis();
    loadBillingMetadata();
    if (currentTab === 'queue') loadQueue();
    else if (currentTab === 'otc') loadOtcSales();
    else if (currentTab === 'done') loadCompletedToday();
    else if (currentTab === 'returns') loadReturns();
    else if (currentTab === 'stock') loadStock();
  }, [currentTab, loadKpis, loadBillingMetadata, loadQueue, loadOtcSales, loadCompletedToday, loadReturns, loadStock]);

  // Active Order object
  const activeOrder = useMemo(() => {
    return queue.find((o) => o.id === selectedOrderId) || queue[0] || null;
  }, [queue, selectedOrderId]);

  // Synchronize Active Order changes into local wizard state
  useEffect(() => {
    if (activeOrder) {
      setWizardStep(activeOrder.step || 1);
      setIdConfirmed(activeOrder.identity_confirmed || false);
      setInteractionAck(activeOrder.interaction_acknowledged || false);
      setPaymentModeChoice((activeOrder.settlement_mode as any) || 'PAY_AT_PHARMACY');
      setReceptionRcpt(activeOrder.token_slip_number || activeOrder.payment_reference || '');
      setReceptionPolicy((activeOrder.handover_policy as any) || 'PRE_PAID');

      if (activeOrder.insurance_data) {
        if (activeOrder.insurance_data.policy_number) setTpaPolicyNo(activeOrder.insurance_data.policy_number);
        if (activeOrder.insurance_data.preauth_code) setTpaPreauthCode(activeOrder.insurance_data.preauth_code);
      }
      if (activeOrder.corporate_data) {
        if (activeOrder.corporate_data.employee_badge_id) setCorpBadgeId(activeOrder.corporate_data.employee_badge_id);
        if (activeOrder.corporate_data.auth_letter_ref) setCorpAuthLetter(activeOrder.corporate_data.auth_letter_ref);
      }
      if (activeOrder.credit_data) {
        if (activeOrder.credit_data.authorizer_name) setCreditAuthName(activeOrder.credit_data.authorizer_name);
        if (activeOrder.credit_data.justification_note) setCreditJustification(activeOrder.credit_data.justification_note);
      }

      // Fetch IPD status if IPD encounter or IPD mode
      if (activeOrder.encounter_type === 'IPD' || activeOrder.settlement_mode === 'IPD_RUNNING_BILL') {
        pharmacyOpdService.getIPDAdmissionStatus(activeOrder.patient_uhid || activeOrder.patient)
          .then((res) => setIpdAdmissionStatus(res))
          .catch(() => setIpdAdmissionStatus(null));
      }

      // Sync Prescription Outcome & Selection
      setPrescriptionOutcome((activeOrder.prescription_outcome as any) || 'FULL_PURCHASE');
      setOutsideReason((activeOrder.purchased_outside_reason as any) || 'PATIENT_CHOICE');
      setOutsideNotes(activeOrder.purchased_outside_notes || '');

      const initialSelected: Record<string, boolean> = {};
      activeOrder.items?.forEach((it) => {
        initialSelected[it.id] = true;
      });
      setSelectedDispenseItems(initialSelected);

      // Initialize pick lines
      const picks: Record<string, boolean> = {};
      activeOrder.items?.forEach((it) => {
        picks[it.id] = it.is_picked || false;
      });
      setPickedLines(picks);
    }
  }, [activeOrder]);

  // Derived: billable items and total for partial dispense
  const billableItems = useMemo(() => {
    if (!activeOrder?.items) return [];
    if (prescriptionOutcome === 'PARTIAL_PURCHASE') {
      return activeOrder.items.filter((it) => selectedDispenseItems[it.id] !== false);
    }
    return activeOrder.items;
  }, [activeOrder, prescriptionOutcome, selectedDispenseItems]);

  const billableTotal = useMemo(() => {
    return billableItems.reduce((acc, it) => acc + Number(it.line_total || 0), 0);
  }, [billableItems]);

  // Notification helper
  const showNotice = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ==========================================
  // HANDLERS: TAB 1 - QUEUE & 7-STEP WIZARD
  // ==========================================
  const handleCallNext = async () => {
    try {
      const called = await pharmacyOpdService.callNext();
      showNotice(`Called next patient: ${called.patient_name} (${called.order_number})`, 'success');
      setSelectedOrderId(called.id);
      setWizardStep(1);
      loadQueue();
      loadKpis();
    } catch (err: any) {
      // Cycle to the next waiting order in the queue
      if (queue.length > 0) {
        const nextOrder = queue.find((o) => o.id !== selectedOrderId) || queue[0];
        setSelectedOrderId(nextOrder.id);
        setWizardStep(nextOrder.step || 1);
        showNotice(`Calling next in queue: ${nextOrder.patient_name} (${nextOrder.order_number})`, 'success');
      } else {
        showNotice(err.response?.data?.message || 'No patients waiting in queue', 'error');
      }
    }
  };

  const handleOpenOrder = async (order: QueueOrder) => {
    if (selectedOrderId === order.id) {
      // Order is already active! Advance to next step or trigger current step
      if (wizardStep === 1) {
        handleStep1Verify();
      } else if (wizardStep === 2) {
        handleStep2Continue();
      } else if (wizardStep === 3) {
        handleStep3Continue();
      } else if (wizardStep === 4) {
        handleStep4Continue();
      } else if (wizardStep === 5) {
        handleStep5Continue();
      } else if (wizardStep === 6) {
        handleStep6Continue();
      } else if (wizardStep === 7) {
        handleDispenseAndComplete();
      }
      return;
    }

    setSelectedOrderId(order.id);
    setWizardStep(order.step || 1);
    if (order.status === 'PENDING') {
      try {
        const claimed = await pharmacyOpdService.claimOrder(order.id);
        setQueue((prev) => prev.map((o) => (o.id === claimed.id ? claimed : o)));
        showNotice(`Selected & claimed order ${order.order_number}`);
      } catch (err) {
        console.error(err);
        showNotice(`Selected order ${order.order_number}`);
      }
    } else {
      showNotice(`Selected order ${order.order_number}`);
    }
  };

  const handleOutcomeChange = async (
    outcome: 'FULL_PURCHASE' | 'PARTIAL_PURCHASE' | 'PURCHASED_OUTSIDE' | 'DECIDE_LATER'
  ) => {
    setPrescriptionOutcome(outcome);
    if (!activeOrder) return;
    try {
      const updated = await pharmacyOpdService.setOutcome(activeOrder.id, outcome);
      setQueue((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      if (outcome === 'DECIDE_LATER') {
        showNotice('Prescription marked as Decide Later. Order remains pending in queue.', 'success');
      } else if (outcome === 'PARTIAL_PURCHASE') {
        showNotice('Partial Purchase selected. Choose the specific medicines to dispense below.', 'success');
      } else if (outcome === 'FULL_PURCHASE') {
        const allSel: Record<string, boolean> = {};
        activeOrder.items?.forEach((it) => {
          allSel[it.id] = true;
        });
        setSelectedDispenseItems(allSel);
        showNotice('Full Purchase selected. All prescribed medicines will be dispensed.', 'success');
      }
    } catch (err: any) {
      console.error('Failed to set outcome:', err);
    }
  };

  const handleConfirmPurchasedOutside = async () => {
    if (!activeOrder) return;
    try {
      const updated = await pharmacyOpdService.markPurchasedOutside(
        activeOrder.id,
        outsideReason,
        outsideNotes
      );
      setQueue((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      showNotice(
        `Prescription ${activeOrder.order_number} closed as Purchased Outside (${outsideReason.replace(/_/g, ' ')}). Zero billing or stock impact.`,
        'success'
      );
      setSelectedOrderId(null);
      loadQueue();
      loadKpis();
    } catch (err: any) {
      showNotice(err.response?.data?.error || 'Failed to mark as purchased outside', 'error');
    }
  };

  const handleToggleDispenseItem = (itemId: string) => {
    setSelectedDispenseItems((prev) => {
      const current = prev[itemId] !== false;
      return { ...prev, [itemId]: !current };
    });
  };

  const handleStep1Verify = async () => {
    if (!idConfirmed) {
      setIdConfirmed(true);
      showNotice('Patient identity confirmed at counter. Advancing to safety checks.', 'success');
    } else {
      showNotice('Prescription verified. Advancing to safety checks.', 'success');
    }
    try {
      if (activeOrder) {
        const updated = await pharmacyOpdService.setStep(activeOrder.id, 2, { identity_confirmed: true });
        setWizardStep(2);
        setQueue((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      } else {
        setWizardStep(2);
      }
    } catch (err) {
      console.error(err);
      setWizardStep(2);
    }
  };

  const handleAllergyOverrideConfirm = async () => {
    if (!overrideReason.trim()) {
      showNotice('Please select an override reason', 'error');
      return;
    }
    if (!overrideRemarks.trim()) {
      showNotice('Audit remarks are mandatory for allergy overrides', 'error');
      return;
    }
    try {
      if (activeOrder) {
        const updated = await pharmacyOpdService.overrideAllergy(activeOrder.id, overrideReason, overrideRemarks);
        setQueue((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        setAllergyModalOpen(false);
        showNotice('Allergy warning overridden and logged to audit trail');
        loadKpis();
      }
    } catch (err) {
      console.error(err);
      showNotice('Failed to log allergy override', 'error');
    }
  };

  const handleStep2Continue = async () => {
    if (activeOrder?.has_allergy_warning && !activeOrder.allergy_override_reason) {
      setAllergyModalOpen(true);
      showNotice('Allergy conflict detected. Please confirm override justification.', 'error');
      return;
    }
    try {
      if (activeOrder) {
        const updated = await pharmacyOpdService.setStep(activeOrder.id, 3, {
          interaction_acknowledged: interactionAck,
        });
        setWizardStep(3);
        setQueue((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        showNotice('Safety checks passed. Select payment settlement engine.', 'success');
      } else {
        setWizardStep(3);
      }
    } catch (err) {
      console.error(err);
      setWizardStep(3);
    }
  };

  const handleStep3SelectMode = async (mode: any) => {
    setPaymentModeChoice(mode);
    if (activeOrder) {
      try {
        const updated = await pharmacyOpdService.setPaymentSource(activeOrder.id, mode, {
          cover_rate: 0.8,
        });
        setQueue((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleStep3Continue = async () => {
    try {
      if (activeOrder) {
        const updated = await pharmacyOpdService.setStep(activeOrder.id, 4);
        setWizardStep(4);
        setQueue((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        showNotice(`Payment mode selected: ${paymentModeChoice}. Proceeding to settlement.`, 'success');
      } else {
        setWizardStep(4);
      }
    } catch (err) {
      console.error(err);
      setWizardStep(4);
    }
  };

  const handleRecordCounterPayment = async () => {
    if (!tenderAmount || parseFloat(tenderAmount) <= 0) {
      showNotice('Please enter amount received', 'error');
      return;
    }
    if (activeOrder) {
      try {
        const updated = await pharmacyOpdService.recordPayment(
          activeOrder.id,
          tenderMethod,
          parseFloat(tenderAmount),
          tenderRef || `TXN-${Date.now().toString().slice(-6)}`
        );
        setQueue((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        showNotice(`Payment of ${formatINR(parseFloat(tenderAmount))} recorded as ${updated.payment_status}`);
      } catch (err) {
        console.error(err);
        showNotice('Failed to record payment', 'error');
      }
    }
  };

  const handleVerifyReceptionReceipt = async () => {
    if (!receptionRcpt.trim()) {
      showNotice('Please enter reception receipt number', 'error');
      return;
    }
    if (activeOrder) {
      try {
        const updated = await pharmacyOpdService.verifyReceipt(activeOrder.id, receptionRcpt.trim());
        setQueue((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        showNotice(`Reception receipt ${receptionRcpt} verified successfully`);
      } catch (err) {
        console.error(err);
        showNotice('Failed to verify receipt', 'error');
      }
    }
  };

  const handleClearReceptionWebhook = async () => {
    if (!receptionRcpt.trim()) {
      showNotice('Please enter token slip or receipt number', 'error');
      return;
    }
    const token = activeOrder?.token_slip_number || receptionRcpt;
    const rcpt = receptionRcpt.startsWith('PH-') ? `RCP-${Date.now().toString().slice(-4)}` : receptionRcpt;
    try {
      const res = await pharmacyOpdService.clearReceptionWebhook(token, rcpt, Number(activeOrder?.total_amount));
      showNotice(res.message);
      if (res.order) {
        setQueue((prev) => prev.map((o) => (o.id === res.order.id ? res.order : o)));
      }
      loadBillingMetadata();
    } catch (err: any) {
      showNotice(err.response?.data?.error || 'Failed to clear reception payment', 'error');
    }
  };

  const handleStep4Continue = async () => {
    if (activeOrder) {
      if (paymentModeChoice === 'CREDIT' && creditAuthPin !== '4412' && creditAuthPin !== '1234') {
        showNotice('Valid Dual-Sign Authorizer PIN (4412) is required for Credit approval', 'error');
        return;
      }
      try {
        const updated = await pharmacyOpdService.setStep(activeOrder.id, 5);
        setWizardStep(5);
        setQueue((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        showNotice('Settlement recorded. Proceed to FEFO batch picking and labeling.', 'success');
      } catch (err) {
        console.error(err);
        setWizardStep(5);
      }
    } else {
      setWizardStep(5);
    }
  };

  const handleStep5Continue = async () => {
    if (activeOrder) {
      // Auto-pick items if not manually checked (selected billable items only)
      const picks = { ...pickedLines };
      billableItems.forEach((it) => {
        picks[it.id] = true;
      });
      setPickedLines(picks);
      setLabelsAffixed(true);

      try {
        const updated = await pharmacyOpdService.setStep(activeOrder.id, 6);
        setWizardStep(6);
        setQueue((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        showNotice('Selected items picked & labels affixed. Proceeding to counseling.', 'success');
      } catch (err) {
        console.error(err);
        setWizardStep(6);
      }
    } else {
      setWizardStep(6);
    }
  };

  const isCounselingComplete = !!(
    counselChecks.dosage &&
    counselChecks.timing &&
    counselChecks.side_effects &&
    counselChecks.storage
  );

  const handleStep6Continue = async () => {
    if (!isCounselingComplete) {
      showNotice('All 4 counseling items must be explained and confirmed before proceeding to dispense.', 'error');
      return;
    }

    if (activeOrder) {
      try {
        const updated = await pharmacyOpdService.setStep(activeOrder.id, 7);
        setWizardStep(7);
        setQueue((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        showNotice('Patient counseling verified. Ready for final dispense.', 'success');
      } catch (err) {
        console.error(err);
        setWizardStep(7);
      }
    } else {
      setWizardStep(7);
    }
  };

  const handleDispenseAndComplete = async () => {
    if (!activeOrder) return;
    if (prescriptionOutcome === 'PARTIAL_PURCHASE' && billableItems.length === 0) {
      showNotice('Please select at least one medicine to dispense.', 'error');
      return;
    }
    try {
      const activeTpa = tpaDirectory.find((t) => t.id === selectedTpaId);
      const activeCorp = corpDirectory.find((c) => c.id === selectedCorpId);
      const activeCredit = creditAccounts.find((c) => c.id === selectedCreditId);

      const selectedIds = prescriptionOutcome === 'PARTIAL_PURCHASE'
        ? billableItems.map((it) => it.id)
        : activeOrder.items?.map((it) => it.id) || [];

      const dispensed = await pharmacyOpdService.dispenseOrder(activeOrder.id, {
        counseling: {
          ...counselChecks,
          language: counselLang,
          pharmacist: displayName,
        },
        picks: pickedLines,
        selected_item_ids: selectedIds,
        cd_data: {
          witness_name: cdWitness,
          rx_sighted: cdRxSighted,
          photo_id: cdPhotoId,
          remarks: cdRemarks,
        },
        settlement: {
          settlement_mode: paymentModeChoice,
          payment_method: tenderMethod.toUpperCase(),
          amount_tendered: Number(tenderAmount) || billableTotal,
          payment_reference: tenderRef,
          handover_policy: receptionPolicy,
          insurance_data: {
            tpa_name: activeTpa?.name || 'Star Health & Allied Insurance',
            policy_number: tpaPolicyNo,
            preauth_code: tpaPreauthCode,
            cover_rate: (activeTpa?.standard_cover_pct || 80) / 100,
            copay_settled_at_counter: copaySettled,
            copay_tender_mode: copayMethod.toUpperCase(),
          },
          corporate_data: {
            corporate_name: activeCorp?.name || 'Indian Railways (Western Zone)',
            employee_badge_id: corpBadgeId,
            auth_letter_ref: corpAuthLetter,
            discount_rate: (activeCorp?.discount_pct || 15) / 100,
          },
          credit_data: {
            account_name: activeCredit?.account_name || 'Dr. Sarah Jenkins (Senior Consultant)',
            account_category: activeCredit?.category || 'STAFF_HEALTHCARE_ALLOWANCE',
            authorizer_name: creditAuthName,
            authorizer_pin: creditAuthPin,
            justification_note: creditJustification,
          },
        },
      });

      const outcomeText = dispensed.status === 'PARTIALLY_DISPENSED' ? 'partially dispensed' : 'dispensed & fulfilled';
      showNotice(`Prescription ${dispensed.order_number} ${outcomeText} and settled via ${paymentModeChoice}!`, 'success');
      if (dispensed.receipt_data) {
        setCompletedReceiptData(dispensed.receipt_data);
        setReceiptModalOpen(true);
      }
      loadQueue();
      loadKpis();
      loadBillingMetadata();
    } catch (err: any) {
      showNotice(err.response?.data?.error || 'Failed to complete dispense', 'error');
    }
  };

  const handlePutOnHold = async () => {
    if (!activeOrder) return;
    try {
      const updated = await pharmacyOpdService.holdOrder(activeOrder.id, 'Awaiting batch delivery from warehouse');
      setQueue((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      showNotice(`Prescription ${updated.order_number} put on hold`);
      loadKpis();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResumeOrder = async () => {
    if (!activeOrder) return;
    try {
      const updated = await pharmacyOpdService.resumeOrder(activeOrder.id);
      setQueue((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      showNotice(`Prescription ${updated.order_number} resumed`);
      loadKpis();
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // HANDLERS: TAB 4 - RETURNS & REFUNDS
  // ==========================================
  const activeReturn = useMemo(() => {
    return returnsList.find((r) => r.id === selectedReturnId) || returnsList[0] || null;
  }, [returnsList, selectedReturnId]);

  // Active OTC sale memo & filter
  const [otcModeFilter, setOtcModeFilter] = useState<'all' | 'Cash' | 'Card' | 'UPI'>('all');
  const filteredOtcSales = useMemo(() => {
    return otcSales.filter((s) => {
      const q = otcSearch.trim().toLowerCase();
      const matchesSearch = !q ||
        s.sale_number?.toLowerCase().includes(q) ||
        s.customer_name?.toLowerCase().includes(q) ||
        s.customer_phone?.toLowerCase().includes(q);
      const matchesMode = otcModeFilter === 'all' || s.payment_mode?.toUpperCase() === otcModeFilter.toUpperCase();
      return matchesSearch && matchesMode;
    });
  }, [otcSales, otcSearch, otcModeFilter]);

  const activeOtcSale = useMemo(() => {
    return filteredOtcSales.find((s) => s.id === selectedOtcId) || filteredOtcSales[0] || otcSales[0] || null;
  }, [filteredOtcSales, otcSales, selectedOtcId]);

  // Active Completed memo & filter
  const [compFilter, setCompFilter] = useState<string>('all');
  const filteredCompleted = useMemo(() => {
    return completedList.filter((c) => {
      const q = compSearch.trim().toLowerCase();
      const matchesSearch = !q ||
        c.patient?.toLowerCase().includes(q) ||
        c.uhid?.toLowerCase().includes(q) ||
        c.id?.toLowerCase().includes(q);
      const matchesPill = compFilter === 'all' ||
        (compFilter === 'cash' && c.mode?.toLowerCase().includes('cash')) ||
        (compFilter === 'card' && c.mode?.toLowerCase().includes('card')) ||
        (compFilter === 'tpa' && c.mode?.toLowerCase().includes('tpa'));
      return matchesSearch && matchesPill;
    });
  }, [completedList, compSearch, compFilter]);

  const activeCompleted = useMemo(() => {
    return filteredCompleted.find((c) => c.id === selectedCompId) || filteredCompleted[0] || completedList[0] || null;
  }, [filteredCompleted, completedList, selectedCompId]);

  // Active Stock memo & filter
  const filteredStockItems = useMemo(() => {
    return stockItems.filter((s) => {
      const q = stockSearch.trim().toLowerCase();
      const matchesSearch = !q ||
        s.name?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q);
      const matchesPill = stockPill === 'all' ||
        (stockPill === 'low' && s.in_stock > 0 && s.in_stock < s.reorder_level) ||
        (stockPill === 'out' && s.in_stock === 0) ||
        (stockPill === 'exp' && s.status?.toLowerCase().includes('expir'));
      return matchesSearch && matchesPill;
    });
  }, [stockItems, stockSearch, stockPill]);

  // The detail panel and the highlighted row both follow this value, so they never disagree. If search
  // or a filter hides the chosen medicine, the first visible row stands in until the filter is cleared.
  const activeStockItem = useMemo(() => {
    return filteredStockItems.find((s) => s.id === selectedStockId) || filteredStockItems[0] || null;
  }, [filteredStockItems, selectedStockId]);

  const selectStockByOffset = useCallback((delta: number | 'first' | 'last') => {
    if (!filteredStockItems.length) return;
    const idx = filteredStockItems.findIndex((s) => s.id === activeStockItem?.id);
    const next = delta === 'first' ? 0
      : delta === 'last' ? filteredStockItems.length - 1
      : Math.min(filteredStockItems.length - 1, Math.max(0, (idx < 0 ? 0 : idx) + delta));
    const id = filteredStockItems[next].id;
    setSelectedStockId(id);
    requestAnimationFrame(() => document.getElementById(`stock-row-${id}`)?.scrollIntoView({ block: 'nearest' }));
  }, [filteredStockItems, activeStockItem]);

  const handleStockListKey = (e: React.KeyboardEvent, fromSearch = false) => {
    const keys: Record<string, number | 'first' | 'last'> = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 };
    if (!fromSearch) Object.assign(keys, { Home: 'first', End: 'last' });
    if (!(e.key in keys)) return;
    e.preventDefault();
    selectStockByOffset(keys[e.key]);
  };

  // Quantities straight from the inventory ledger: counter shelf + central store = total sellable
  // (expired and quarantined batches are already excluded by the API).
  const stockView = useMemo(() => {
    const s = activeStockItem;
    if (!s) return null;
    const batches = [...(s.batches || [])].sort((a: any, b: any) => String(a.expiry_date).localeCompare(String(b.expiry_date)));
    const firstCounter = batches.find((b: any) => b.is_counter_stock && (b.available_quantity ?? 0) > 0);
    const batchTotal = batches.reduce((sum: number, b: any) => sum + (b.available_quantity ?? 0), 0);
    const withStock = batches.filter((b: any) => (b.available_quantity ?? 0) > 0);
    const sameGeneric = s.generic
      ? stockItems.filter((x) => x.id !== s.id && (x.generic || '').toLowerCase() === s.generic.toLowerCase())
      : [];
    return {
      counter: s.counter_stock ?? 0,
      central: s.central_stock ?? 0,
      total: s.in_stock ?? 0,
      batches,
      batchTotal,
      dispenseNextId: firstCounter?.id || null,
      nearestExpiry: withStock[0]?.expiry_date || null,
      sameGeneric,
    };
  }, [activeStockItem, stockItems]);

  const handleInspectReturnConfirm = async (disposition: 'restock' | 'quarantine') => {
    if (!activeReturn) return;
    try {
      const updated = await pharmacyOpdService.inspectReturn(activeReturn.id, retInspectChecks, disposition);
      setReturnsList((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showNotice(`Return ${updated.return_number} marked Inspected (${disposition})`);
      loadKpis();
    } catch (err) {
      console.error(err);
      showNotice('Inspection update failed', 'error');
    }
  };

  const handleProcessRefundConfirm = async () => {
    if (!activeReturn) return;
    try {
      const updated = await pharmacyOpdService.processRefund(activeReturn.id);
      setReturnsList((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showNotice(`Refund of ${formatINR(Number(updated.total_refund_amount))} successfully posted via ${updated.refund_route}`);
      loadKpis();
    } catch (err) {
      console.error(err);
      showNotice('Refund processing failed', 'error');
    }
  };

  const handleRejectReturnConfirm = async () => {
    if (!activeReturn) return;
    try {
      const updated = await pharmacyOpdService.rejectReturn(activeReturn.id, 'Inspection failed / Non-returnable item');
      setReturnsList((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showNotice(`Return ${updated.return_number} rejected`);
      loadKpis();
    } catch (err) {
      console.error(err);
      showNotice('Failed to reject return', 'error');
    }
  };

  // Navigation Items
  const navItems = [
    { id: 'queue', label: 'Dispensing queue', count: kpis.pending_verification, dot: false },
    { id: 'otc', label: 'OTC sales', count: kpis.otc_sales_today, dot: false },
    { id: 'done', label: 'Completed today', count: completedList.length || 6, dot: false },
    { id: 'returns', label: 'Returns & refunds', count: kpis.pending_returns, dot: kpis.pending_returns > 0 },
    { id: 'stock', label: 'Stock lookup', count: null, dot: false },
  ];

  return (
    <div className="hms-motion" style={{ display: 'flex', height: isEmbedded ? 'auto' : '100vh', width: isEmbedded ? '100%' : '100vw', overflow: isEmbedded ? 'visible' : 'hidden', background: '#f9fafb', fontFamily: 'Inter, sans-serif' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          key={notification.message}
          role="status"
          className={`hms-toast${notification.type === 'success' ? '' : ' hms-shake'}`}
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 100,
            padding: '12px 18px',
            borderRadius: '10px',
            background: notification.type === 'success' ? '#15803d' : '#dc2626',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {notification.type === 'success' ? <CircleCheck size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ==========================================
          SIDEBAR (260px)
      ========================================== */}
      {!hideSidebar && !isEmbedded && (
      <aside style={{ width: '260px', flexShrink: 0, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 20px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '15px' }}>
            N
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>North Hospital</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Clinical Enterprise HMS</div>
          </div>
        </div>

        <div style={{ margin: '0 16px', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Current department</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', background: '#eff6ff', borderRadius: '4px', padding: '1px 6px' }}>OPD</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '4px' }}>Pharmacy</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Counter 2 · Main OPD block, ground floor</div>
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #e5e7eb', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => navigate('/pharmacy/ipd')}
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
              <BedDouble size={12} />
              Switch to IPD Ward Supply →
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

        <div style={{ padding: '24px 20px 8px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>WORKSPACE</div>

        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
          {navItems.map((n) => {
            const isActive = currentTab === n.id;
            return (
              <div
                key={n.id}
                onClick={() => {
                  setTab(n.id);
                  if (n.id === 'otc') setIsCreatingOtcSale(false);
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
                  color: isActive ? '#1d4ed8' : '#374151',
                  background: isActive ? '#eff6ff' : 'transparent',
                }}
              >
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.count !== null && (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: isActive ? '#1d4ed8' : '#6b7280' }}>{n.count}</span>
                )}
                {n.dot && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />}
              </div>
            );
          })}
        </nav>

        {/* Current User Card */}
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
              logout();
              navigate('/login');
            }}
            title="Log Out"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      )}

      {/* ==========================================
          MAIN AREA
      ========================================== */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: isEmbedded ? 'visible' : 'auto' }}>
        {/* Sticky Top Bar (52px) */}
        {!hideHeader && !isEmbedded && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            height: '52px',
            padding: '0 24px',
            borderBottom: '1px solid #e5e7eb',
            background: '#fff',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
            <span>North Hospital</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span>Pharmacy</span>
            <span style={{ color: '#d1d5db' }}>/</span>
            <span style={{ color: '#111827', fontWeight: 600 }}>
              {currentTab === 'queue' && 'Dispensing Queue'}
              {currentTab === 'otc' && 'OTC Sales'}
              {currentTab === 'done' && 'Completed Today'}
              {currentTab === 'returns' && 'Returns & Refunds'}
              {currentTab === 'stock' && 'Stock Lookup'}
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
                  background: '#ffffff',
                  color: '#1d4ed8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                }}
                title="Currently active: OPD Dispense Counter"
              >
                <Pill size={13} />
                <span>OPD Counter</span>
                <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', padding: '0 4px', borderRadius: '4px', fontWeight: 700 }}>
                  ACTIVE
                </span>
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
                  background: 'transparent',
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Switch station to IPD Ward Supply"
              >
                <BedDouble size={13} />
                <span>IPD Ward Supply</span>
              </button>
            </div>
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
                <ArrowLeft size={14} />
                HMS Admin
              </button>
            )}
            <button
              onClick={() => navigate('/pharmacy/inventory')}
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
              <Boxes size={14} />
              Central Store
            </button>
            <button
              onClick={() => setShiftDrawerModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '32px',
                padding: '0 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0f172a',
                background: '#f8fafc',
                cursor: 'pointer',
              }}
              title="Click to view Drawer details and reconciliation"
            >
              <Coins size={14} color="#059669" />
              <span>Drawer: {shiftSummary ? formatINR(shiftSummary.net_drawer_cash) : '₹2,000.00'}</span>
              <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                ACTIVE
              </span>
            </button>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                height: '40px',
                padding: '0 14px',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '13px',
                color: '#374151',
                whiteSpace: 'nowrap',
              }}
            >
              <Clock size={14} />
              Morning shift · 07:00–15:00
            </div>
          </div>
        </div>
        )}

        {/* Floating Toast Notification */}
        {notification && (
          <div
            key={notification.message}
            role="status"
            className={`hms-toast${notification.type === 'error' ? ' hms-shake' : ''}`}
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              background: notification.type === 'error' ? '#991b1b' : '#0f172a',
              color: '#ffffff',
              border: `1px solid ${notification.type === 'error' ? '#ef4444' : '#334155'}`,
              borderRadius: '10px',
              padding: '12px 24px',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {notification.type === 'error' ? <TriangleAlert size={16} color="#fca5a5" /> : <CircleCheck size={16} color="#4ade80" />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Content Body */}
        <div style={{ padding: isEmbedded ? '0' : '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header Card */}
          {!hideHeader && !isEmbedded && (
          <div
            style={{
              background: '#fff',
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
              <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>
                OPD Pharmacist Workspace
              </h1>
              <p style={{ fontSize: '14px', color: '#4b5563', marginTop: '6px' }}>
                Verify, collect, counsel and dispense outpatient prescriptions and walk-in sales. Stock and billing post only on dispense.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setTab('stock');
                  showNotice('Switched to Live Stock Lookup');
                }}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap',
                  background: currentTab === 'stock' ? '#eff6ff' : '#fff',
                  color: currentTab === 'stock' ? '#1d4ed8' : '#111827',
                  border: `1px solid ${currentTab === 'stock' ? '#2563eb' : '#d1d5db'}`,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Search size={16} /> Search stock
              </button>
              <button
                onClick={() => {
                  setTab('returns');
                  setNewReturnOpen(true);
                  showNotice('Opened Medicine Return Intake');
                }}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap',
                  background: currentTab === 'returns' ? '#eff6ff' : '#fff',
                  color: currentTab === 'returns' ? '#1d4ed8' : '#111827',
                  border: `1px solid ${currentTab === 'returns' ? '#2563eb' : '#d1d5db'}`,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <RotateCcw size={16} /> Return medicine
              </button>
              <button
                onClick={() => {
                  setTab('otc');
                  setIsCreatingOtcSale(true);
                }}
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Plus size={16} color="#fff" /> New OTC sale
              </button>
            </div>
          </div>
          )}

          {/* ==========================================
              KPI ROW (5 CARDS, EXACT SPEC)
          ========================================== */}
          {!hideHeader && !isEmbedded && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '16px' }}>
            {/* Card 1: Pending verification */}
            <div
              onClick={() => {
                setTab('queue');
                setQueuePill('pending');
              }}
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                minHeight: '120px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#4b5563' }}>Pending verification</span>
                <span style={{ fontSize: '12px', fontWeight: 600, borderRadius: '4px', padding: '2px 6px', background: '#fef2f2', color: '#dc2626' }}>
                  {kpis.stat_count} STAT
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{kpis.pending_verification}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>prescriptions</span>
              </div>
            </div>

            {/* Card 2: OTC sales today */}
            <div
              onClick={() => {
                setTab('otc');
                setIsCreatingOtcSale(false);
              }}
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                minHeight: '120px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#4b5563' }}>OTC sales today</span>
                <span style={{ fontSize: '12px', fontWeight: 600, borderRadius: '4px', padding: '2px 6px', background: '#f0fdf4', color: '#15803d' }}>
                  {formatINR(kpis.otc_revenue_today)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{kpis.otc_sales_today}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>receipts</span>
              </div>
            </div>

            {/* Card 3: Pending returns */}
            <div
              onClick={() => {
                setTab('returns');
                setReturnPill('Requested');
              }}
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                minHeight: '120px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#4b5563' }}>Pending returns</span>
                <span style={{ fontSize: '12px', fontWeight: 600, borderRadius: '4px', padding: '2px 6px', background: '#fffbeb', color: '#b45309' }}>
                  awaiting inspection
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{kpis.pending_returns}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>requests</span>
              </div>
            </div>

            {/* Card 4: Refund requests */}
            <div
              onClick={() => {
                setTab('returns');
                setReturnPill('Inspected');
              }}
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                minHeight: '120px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#4b5563' }}>Refund requests</span>
                <span style={{ fontSize: '12px', fontWeight: 600, borderRadius: '4px', padding: '2px 6px', background: '#eff6ff', color: '#1d4ed8' }}>
                  {formatINR(kpis.refund_amount_due)} due
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827' }}>{kpis.refund_requests_due}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>inspected</span>
              </div>
            </div>

            {/* Card 5: Controlled drug entries */}
            <div
              onClick={() => {
                setTab('queue');
                setQueuePill('cd');
              }}
              style={{
                background: '#fff',
                border: '1px solid #dc2626',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                minHeight: '120px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#4b5563' }}>Controlled drug entries</span>
                <span style={{ fontSize: '12px', fontWeight: 600, borderRadius: '4px', padding: '2px 6px', background: '#111827', color: '#ffffff' }}>
                  {kpis.cd_overrides_today} overrides
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#dc2626' }}>{kpis.cd_entries_today}</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>logs today</span>
              </div>
            </div>
          </div>
          )}

          {/* ==========================================
              TAB 1: DISPENSING QUEUE + RIGHT ACTIVE PANEL
          ========================================== */}
          {currentTab === 'queue' && (
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
              {/* LEFT CONTAINER (Matches KPI Card 1 - Column 1 across ALL screens) */}
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
                          Prescription Queue
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
                          {queue.length} Prescriptions
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                        STAT always first, then urgent and routine by wait time
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                      <div style={{ position: 'relative', width: '100%', minWidth: 0, flex: 1 }}>
                        <Search size={15} style={{ position: 'absolute', left: '11px', top: '11px', color: '#9ca3af' }} />
                        <input
                          id="rx-queue-search"
                          value={qSearch}
                          onChange={(e) => setQSearch(e.target.value)}
                          placeholder="Search patient, UHID or drug"
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
                      <button
                        onClick={handleCallNext}
                        title="Call next patient in queue (Alt+N)"
                        style={{
                          height: '40px',
                          padding: '0 10px',
                          borderRadius: '10px',
                          background: '#ffffff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          flexShrink: 0,
                        }}
                      >
                        <PhoneCall size={13} />
                        <span>Call Next</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills with intentional wrapping to prevent horizontal clipping & nested scrollbars */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minWidth: 0, width: '100%', marginBottom: '4px' }}>
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'new', label: 'New' },
                      { key: 'verify', label: 'Verification' },
                      { key: 'payment', label: 'Awaiting payment' },
                      { key: 'dispensing', label: 'Dispensing' },
                      { key: 'hold', label: 'On hold' },
                      { key: 'partially_dispensed', label: 'Partially Dispensed', color: 'amber' as const },
                      { key: 'stat', label: 'STAT only', color: 'red' as const },
                      { key: 'cd', label: 'Controlled drugs', color: 'dark' as const },
                    ].map((p) => (
                      <button
                        key={p.key}
                        onClick={() => setQueuePill(p.key)}
                        style={getPillStyle(queuePill === p.key, p.color)}
                      >
                        {p.label}
                      </button>
                    ))}
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
                  {queueLoading ? (
                    <div style={{ padding: '40px 16px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                      Loading prescriptions...
                    </div>
                  ) : queue.length === 0 ? (
                    <div style={{ padding: '40px 16px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>No prescriptions waiting</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>New ones will appear here automatically</div>
                    </div>
                  ) : (
                    queue.map((r) => {
                      const isSelected = activeOrder?.id === r.id;
                      const prioBadge =
                        r.priority === 'STAT' ? B.red : r.priority === 'URGENT' ? B.amber : B.gray;
                      const firstMed = r.items[0]?.medicine_name || 'Prescription Items';
                      const isCd = r.items.some((it) => it.is_narcotic || it.medicine_schedule === 'H1');
                      const isAllergy = r.has_allergy_warning;
                      const isHold = r.status === 'AWAITING_STOCK';

                      return (
                        <div
                          key={r.id}
                          id={`rx-compact-item-${r.id}`}
                          tabIndex={0}
                          role="button"
                          aria-selected={isSelected}
                          onClick={() => handleOpenOrder(r)}
                          className={`med-compact-row ${isSelected ? 'med-selected' : ''}`}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            padding: '11px 16px',
                            borderBottom: '1px solid #f3f4f6',
                            borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            cursor: 'pointer',
                            userSelect: 'none',
                            minWidth: 0,
                            width: '100%',
                            boxSizing: 'border-box',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          {/* Line 1: Patient Name & Priority Badge + Action Button */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                              <span
                                style={{
                                  fontSize: '13px',
                                  fontWeight: isSelected ? 700 : 600,
                                  color: isSelected ? '#1d4ed8' : '#111827',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={r.patient_name}
                              >
                                {r.patient_name}
                              </span>
                              {isCd && (
                                <span style={{ fontSize: '10px', fontWeight: 700, borderRadius: '3px', padding: '1px 5px', background: '#111827', color: '#fff', flexShrink: 0 }}>
                                  CD
                                </span>
                              )}
                              {isAllergy && (
                                <span style={{ fontSize: '10px', fontWeight: 700, borderRadius: '3px', padding: '1px 5px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2', flexShrink: 0 }}>
                                  Allergy
                                </span>
                              )}
                              {isHold && (
                                <span style={{ fontSize: '10px', fontWeight: 700, borderRadius: '3px', padding: '1px 5px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', flexShrink: 0 }}>
                                  Hold
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: prioBadge.bg,
                                  color: prioBadge.fg,
                                  border: `1px solid ${prioBadge.bd}`,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {r.priority}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenOrder(r);
                                }}
                                style={{
                                  height: '32px',
                                  padding: '0 8px',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  background: isSelected ? '#2563eb' : '#ffffff',
                                  color: isSelected ? '#ffffff' : '#1d4ed8',
                                  border: `1px solid ${isSelected ? '#2563eb' : '#bfdbfe'}`,
                                }}
                              >
                                {isSelected ? 'Continue' : 'Open'}
                              </button>
                            </div>
                          </div>

                          {/* Line 2: Medicine information & Payment badge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', minWidth: 0, gap: '8px' }}>
                            <span
                              style={{
                                color: '#374151',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                flex: 1,
                                minWidth: 0,
                              }}
                              title={firstMed}
                            >
                              {firstMed} {r.items.length > 1 ? `(+${r.items.length - 1} more)` : ''}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                flexShrink: 0,
                                background:
                                  r.payment_status === 'PAID'
                                    ? '#f0fdf4'
                                    : r.payment_status === 'PARTIALLY_PAID'
                                    ? '#fffbeb'
                                    : '#fef2f2',
                                color:
                                  r.payment_status === 'PAID'
                                    ? '#15803d'
                                    : r.payment_status === 'PARTIALLY_PAID'
                                    ? '#b45309'
                                    : '#dc2626',
                                border: `1px solid ${
                                  r.payment_status === 'PAID'
                                    ? '#bbf7d0'
                                    : r.payment_status === 'PARTIALLY_PAID'
                                    ? '#fde68a'
                                    : '#fecaca'
                                }`,
                              }}
                            >
                              {r.payment_status}
                            </span>
                          </div>

                          {/* Line 3: UHID · Doctor and Prescription Status badge */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#6b7280', minWidth: 0, gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                              <span style={{ fontFamily: MONO_FONT, color: '#4b5563', flexShrink: 0 }}>
                                {r.patient_uhid}
                              </span>
                              <span style={{ color: '#9ca3af' }}>·</span>
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {r.doctor_name || r.order_number}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                flexShrink: 0,
                                whiteSpace: 'nowrap',
                                background:
                                  r.status === 'PARTIALLY_DISPENSED'
                                    ? '#fffbeb'
                                    : r.status === 'PURCHASED_OUTSIDE'
                                    ? '#f3f4f6'
                                    : isHold
                                    ? '#fffbeb'
                                    : r.status === 'DISPENSED'
                                    ? '#f0fdf4'
                                    : '#eff6ff',
                                color:
                                  r.status === 'PARTIALLY_DISPENSED'
                                    ? '#b45309'
                                    : r.status === 'PURCHASED_OUTSIDE'
                                    ? '#4b5563'
                                    : isHold
                                    ? '#b45309'
                                    : r.status === 'DISPENSED'
                                    ? '#15803d'
                                    : '#1d4ed8',
                                border: `1px solid ${
                                  r.status === 'PARTIALLY_DISPENSED'
                                    ? '#fde68a'
                                    : r.status === 'PURCHASED_OUTSIDE'
                                    ? '#d1d5db'
                                    : isHold
                                    ? '#fde68a'
                                    : r.status === 'DISPENSED'
                                    ? '#bbf7d0'
                                    : '#bfdbfe'
                                }`,
                              }}
                            >
                              {r.status === 'PARTIALLY_DISPENSED'
                                ? 'PARTIAL'
                                : r.status === 'PURCHASED_OUTSIDE'
                                ? 'OUTSIDE'
                                : r.status === 'UNDER_REVIEW'
                                ? 'UNDER REVIEW'
                                : r.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Left Panel Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', fontSize: '12px', color: '#6b7280', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
                  <span>{queue.length} prescriptions in queue</span>
                  <span>{queue.filter((p) => p.priority === 'STAT').length} STAT active</span>
                </div>
              </div>

              {/* RIGHT STICKY CONTEXT INSPECTION DRAWER */}
              <div
                data-hms-detail
                style={{
                  width: '100%',
                  minWidth: 0,
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  position: 'sticky',
                  top: '70px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                    ACTIVE PRESCRIPTION · CONTEXT &amp; VERIFICATION
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '1px 6px' }}>
                    Posts on dispense
                  </span>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    maxHeight: 'calc(100vh - 120px)',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  {!activeOrder ? (
                    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>No prescription selected</div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>
                        Select a prescription from the queue on the left or click "Call Next" to process the next waiting patient.
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Active Prescription Header & Stepper */}
                      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '14px', background: '#ffffff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>
                                  {activeOrder.order_number}
                                </h3>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    height: '24px',
                                    padding: '0 8px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    background: activeOrder.priority === 'STAT' ? '#fef2f2' : activeOrder.priority === 'URGENT' ? '#fffbeb' : '#f9fafb',
                                    color: activeOrder.priority === 'STAT' ? '#dc2626' : activeOrder.priority === 'URGENT' ? '#b45309' : '#374151',
                                    border: `1px solid ${activeOrder.priority === 'STAT' ? '#fecaca' : activeOrder.priority === 'URGENT' ? '#fde68a' : '#e5e7eb'}`,
                                  }}
                                >
                                  {activeOrder.priority}
                                </span>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    height: '24px',
                                    padding: '0 8px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    border: '1px solid #bfdbfe',
                                  }}
                                >
                                  {activeOrder.settlement_mode === 'INSURANCE'
                                    ? 'Insurance TPA'
                                    : activeOrder.settlement_mode === 'PAY_AT_RECEPTION'
                                    ? 'Reception Pay'
                                    : activeOrder.settlement_mode === 'IPD_RUNNING_BILL'
                                    ? 'IPD Running Bill'
                                    : 'Counter Pay'}
                                </span>
                              </div>
                              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                                Step {wizardStep} of 7 ·{' '}
                                <strong style={{ color: '#111827' }}>
                                  {[
                                    'Verify prescription',
                                    'Safety checks',
                                    'Payment source',
                                    'Payment verification',
                                    'Pick & label',
                                    'Counseling',
                                    'Dispense & complete',
                                  ][wizardStep - 1]}
                                </strong>
                              </div>
                            </div>

                            {/* Quick Action Button */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button
                                onClick={() => setTab('stock')}
                                style={{
                                  height: '40px',
                                  padding: '0 12px',
                                  borderRadius: '10px',
                                  background: '#ffffff',
                                  color: '#374151',
                                  border: '1px solid #d1d5db',
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <Search size={14} color="#2563eb" />
                                <span>Lookup Alternatives</span>
                              </button>
                            </div>
                          </div>

                          {/* 7-Segment Progress Bar */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                              <div
                                key={s}
                                style={{
                                  height: '4px',
                                  borderRadius: '2px',
                                  background: s <= wizardStep ? '#2563eb' : '#e5e7eb',
                                  transition: 'background-color 0.2s ease',
                                }}
                              />
                            ))}
                          </div>

                          {/* Patient Summary & Clinical Metadata Overview (4 Columns matching Inventory Manager's metric row) */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                              gap: '12px',
                              padding: '12px 16px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Patient</div>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {activeOrder.patient_name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', fontFamily: MONO_FONT }}>{activeOrder.patient_uhid}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prescribing Doctor</div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {activeOrder.doctor_name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>Outpatient Department</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Diagnosis / Encounter</div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {activeOrder.diagnosis || 'Acute Outpatient Care'}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>Order #{activeOrder.order_number}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Clinical Flags</div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                {activeOrder.has_allergy_warning ? (
                                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '1px 6px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                                    Allergy Alert
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '11px', fontWeight: 600, borderRadius: '4px', padding: '1px 6px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                                    No Allergies
                                  </span>
                                )}
                                {activeOrder.items?.some((it) => it.is_narcotic || it.medicine_schedule === 'H1') && (
                                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '1px 6px', background: '#111827', color: '#ffffff' }}>
                                    Schedule H1 / CD
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* PRESCRIPTION OUTCOME (Requirement 1, 2, 3) */}
                          {activeOrder.status !== 'DISPENSED' && activeOrder.status !== 'PURCHASED_OUTSIDE' && (
                            <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#4b5563', textTransform: 'uppercase' }}>
                                  PRESCRIPTION OUTCOME
                                </span>
                                <span style={{ fontSize: '11px', color: '#6b7280' }}>
                                  Patient purchase choice
                                </span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
                                {[
                                  { key: 'FULL_PURCHASE', label: 'Full Purchase', desc: 'All medicines' },
                                  { key: 'PARTIAL_PURCHASE', label: 'Partial Purchase', desc: 'Selected items only' },
                                  { key: 'PURCHASED_OUTSIDE', label: 'Purchased Outside', desc: 'Mark outside store' },
                                  { key: 'DECIDE_LATER', label: 'Decide Later', desc: 'Patient to confirm' },
                                ].map((opt) => {
                                  const isSelected = prescriptionOutcome === opt.key;
                                  return (
                                    <div
                                      key={opt.key}
                                      onClick={() => handleOutcomeChange(opt.key as any)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '8px',
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        border: `1.5px solid ${isSelected ? '#2563eb' : '#e5e7eb'}`,
                                        background: isSelected ? '#eff6ff' : '#fff',
                                        transition: 'all 0.15s ease',
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: '14px',
                                          height: '14px',
                                          marginTop: '2px',
                                          borderRadius: '50%',
                                          flexShrink: 0,
                                          border: `2px solid ${isSelected ? '#2563eb' : '#d1d5db'}`,
                                          background: '#fff',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}
                                      >
                                        {isSelected && (
                                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb' }} />
                                        )}
                                      </span>
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? '#1d4ed8' : '#111827' }}>
                                          {opt.label}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '1px' }}>
                                          {opt.desc}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* If PURCHASED OUTSIDE selected, show reason selector & confirm button */}
                              {prescriptionOutcome === 'PURCHASED_OUTSIDE' && (
                                <div style={{ marginTop: '10px', padding: '12px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#991b1b' }}>
                                    Reason for Outside Purchase:
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '6px' }}>
                                    {[
                                      { key: 'PATIENT_CHOICE', label: 'Patient Choice' },
                                      { key: 'PRICE_CONCERN', label: 'Price Concern' },
                                      { key: 'OUT_OF_STOCK', label: 'Out Of Stock' },
                                      { key: 'INSURANCE_RESTRICTION', label: 'Insurance Restriction' },
                                    ].map((r) => (
                                      <label
                                        key={r.key}
                                        onClick={() => setOutsideReason(r.key as any)}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          fontSize: '11px',
                                          cursor: 'pointer',
                                          padding: '6px 8px',
                                          borderRadius: '6px',
                                          background: outsideReason === r.key ? '#fff' : 'transparent',
                                          border: `1px solid ${outsideReason === r.key ? '#ef4444' : '#fee2e2'}`,
                                          color: outsideReason === r.key ? '#991b1b' : '#4b5563',
                                          fontWeight: outsideReason === r.key ? 600 : 400,
                                        }}
                                      >
                                        <input
                                          type="radio"
                                          name="outside_reason"
                                          checked={outsideReason === r.key}
                                          onChange={() => setOutsideReason(r.key as any)}
                                          style={{ width: '12px', height: '12px' }}
                                        />
                                        <span>{r.label}</span>
                                      </label>
                                    ))}
                                  </div>
                                  <input
                                    value={outsideNotes}
                                    onChange={(e) => setOutsideNotes(e.target.value)}
                                    placeholder="Pharmacist audit remarks (optional)"
                                    style={{ height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #fca5a5', fontSize: '12px', background: '#fff' }}
                                  />
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                                      Prescription will close without stock or billing impact.
                                    </span>
                                    <button
                                      onClick={handleConfirmPurchasedOutside}
                                      style={{
                                        height: '32px',
                                        padding: '0 14px',
                                        borderRadius: '8px',
                                        background: '#dc2626',
                                        color: '#fff',
                                        border: 'none',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Mark as Purchased Outside
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* If DECIDE LATER selected */}
                              {prescriptionOutcome === 'DECIDE_LATER' && (
                                <div style={{ marginTop: '8px', padding: '10px 12px', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fde68a', fontSize: '12px', color: '#92400e' }}>
                                  Patient needs time to decide. No stock reserved and no invoice created. Prescription stays in queue for counter revisit.
                                </div>
                              )}
                            </div>
                          )}

                          {/* If prescription was already marked PURCHASED_OUTSIDE */}
                          {activeOrder.status === 'PURCHASED_OUTSIDE' && (
                            <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>
                                Closed · Purchased Outside
                              </div>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                Reason: {activeOrder.purchased_outside_reason?.replace(/_/g, ' ') || 'Patient Choice'}
                              </div>
                              {activeOrder.purchased_outside_notes && (
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                  Notes: {activeOrder.purchased_outside_notes}
                                </div>
                              )}
                            </div>
                          )}

                          {/* If prescription is PARTIALLY_DISPENSED */}
                          {activeOrder.status === 'PARTIALLY_DISPENSED' && (
                            <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#b45309' }}>
                                Status: Partially Dispensed
                              </div>
                              <div style={{ fontSize: '11px', color: '#78350f' }}>
                                Remaining uncollected medicines remain available for future collection.
                              </div>
                            </div>
                          )}
                        </div>

                        {/* If On Hold */}
                        {activeOrder.status === 'AWAITING_STOCK' && (
                          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '10px', padding: '12px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                              <PackageX size={18} color="#b45309" />
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#b45309' }}>Held · Awaiting stock</div>
                                <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '2px' }}>
                                  {activeOrder.hold_reason || 'Levothyroxine 75 mcg out of stock · awaiting central warehouse transfer'}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => setTab('stock')}
                                style={{ flex: 1, height: '40px', borderRadius: '10px', background: '#fff', color: '#111827', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Review alternatives
                              </button>
                              <button
                                onClick={handleResumeOrder}
                                style={{ flex: 1, height: '40px', borderRadius: '10px', background: '#2563eb', color: '#fff', border: '1px solid #2563eb', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Stock received
                              </button>
                            </div>
                          </div>
                        )}

                        {/* STEP 1: VERIFY PRESCRIPTION */}
                        {wizardStep === 1 && activeOrder.status !== 'AWAITING_STOCK' && (
                          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                                PRESCRIPTION VERIFICATION
                              </div>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <CircleCheck size={18} color="#16a34a" className="hms-tick" />
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>E-signature & prescriber valid</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Verified against medical register (KMC 48211)</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <CircleCheck size={18} color="#16a34a" className="hms-tick" />
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Prescription issue date valid</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Issued today · within 7-day OPD validity period</div>
                                </div>
                              </div>

                              {/* Patient Identity Checkbox */}
                              <div
                                onClick={() => setIdConfirmed(!idConfirmed)}
                                style={{
                                  display: 'flex',
                                  gap: '10px',
                                  alignItems: 'flex-start',
                                  padding: '12px',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '10px',
                                  cursor: 'pointer',
                                  background: idConfirmed ? '#eff6ff' : '#fff',
                                }}
                              >
                                <span
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    flexShrink: 0,
                                    marginTop: '1px',
                                    borderRadius: '5px',
                                    border: `1.5px solid ${idConfirmed ? '#2563eb' : '#d1d5db'}`,
                                    background: idConfirmed ? '#2563eb' : '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {idConfirmed && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
                                </span>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                                    Patient identity confirmed at counter
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                    Name, UHID and date of birth match the prescription
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Prescribed Items & Live Stock Preview */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                                  PRESCRIBED ITEMS · LIVE STOCK
                                </div>
                                {prescriptionOutcome === 'PARTIAL_PURCHASE' && (
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px' }}>
                                    {billableItems.length} of {activeOrder.items?.length || 0} selected
                                  </span>
                                )}
                              </div>

                              {prescriptionOutcome === 'PARTIAL_PURCHASE' && (
                                <div style={{ padding: '8px 10px', borderRadius: '6px', background: '#fefce8', border: '1px solid #fef08a', fontSize: '11px', color: '#854d0e' }}>
                                  Click each medicine to include or exclude from this counter dispense. Excluded items remain available for future collection.
                                </div>
                              )}

                              {activeOrder.items?.map((it) => {
                                const isSelectedForDispense = selectedDispenseItems[it.id] !== false;
                                return (
                                  <div
                                    key={it.id}
                                    onClick={() => {
                                      if (prescriptionOutcome === 'PARTIAL_PURCHASE') {
                                        handleToggleDispenseItem(it.id);
                                      }
                                    }}
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '6px',
                                      padding: '10px 12px',
                                      borderRadius: '8px',
                                      border: `1.5px solid ${prescriptionOutcome === 'PARTIAL_PURCHASE' ? (isSelectedForDispense ? '#93c5fd' : '#e5e7eb') : '#f3f4f6'}`,
                                      background: prescriptionOutcome === 'PARTIAL_PURCHASE' ? (isSelectedForDispense ? '#f0f9ff' : '#fafafa') : '#fff',
                                      cursor: prescriptionOutcome === 'PARTIAL_PURCHASE' ? 'pointer' : 'default',
                                      opacity: prescriptionOutcome === 'PARTIAL_PURCHASE' && !isSelectedForDispense ? 0.65 : 1,
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', minWidth: 0 }}>
                                        {prescriptionOutcome === 'PARTIAL_PURCHASE' && (
                                          <span
                                            style={{
                                              width: '16px',
                                              height: '16px',
                                              marginTop: '2px',
                                              flexShrink: 0,
                                              borderRadius: '4px',
                                              border: `1.5px solid ${isSelectedForDispense ? '#2563eb' : '#d1d5db'}`,
                                              background: isSelectedForDispense ? '#2563eb' : '#fff',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                            }}
                                          >
                                            {isSelectedForDispense && <Check size={11} color="#fff" strokeWidth={3} className="hms-tick" />}
                                          </span>
                                        )}
                                        <div style={{ minWidth: 0 }}>
                                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{it.medicine_name}</span>
                                            {it.is_narcotic && (
                                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', background: '#111827', borderRadius: '4px', padding: '1px 6px' }}>
                                                CD
                                              </span>
                                            )}
                                          </div>
                                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                            {it.dosage_instruction} · × {it.prescribed_quantity}
                                          </div>
                                        </div>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            height: '22px',
                                            padding: '0 8px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                            background: '#f0fdf4',
                                            color: '#15803d',
                                            border: '1px solid #bbf7d0',
                                          }}
                                        >
                                          In stock
                                        </span>
                                        {prescriptionOutcome === 'PARTIAL_PURCHASE' && (
                                          <span style={{ fontSize: '10px', fontWeight: 600, color: isSelectedForDispense ? '#1d4ed8' : '#6b7280' }}>
                                            {isSelectedForDispense ? `Dispense (${formatINR(Number(it.line_total || 0))})` : 'Later collection (₹0)'}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', color: '#6b7280' }}>
                                      <Package size={13} />
                                      <span>FEFO: {it.suggested_fefo_batch?.batch_number || 'B-ACTIVE-24'} (Exp {it.suggested_fefo_batch?.expiry_date || '2027-08'})</span>
                                    </div>
                                  </div>
                                );
                              })}

                              {prescriptionOutcome === 'PARTIAL_PURCHASE' && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                                  <span style={{ color: '#475569' }}>Selected for immediate dispense:</span>
                                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatINR(billableTotal)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* STEP 2: SAFETY CHECKS */}
                        {wizardStep === 2 && (
                          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {/* Allergy Section */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                                ALLERGY CHECK
                              </div>
                              {activeOrder.has_allergy_warning ? (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                                  <TriangleAlert size={18} color="#dc2626" />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>
                                      {activeOrder.allergy_override_reason ? 'Allergy Warning Overridden' : 'Allergy Warning Flagged'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>
                                      {activeOrder.allergy_override_reason
                                        ? `Override Reason: ${activeOrder.allergy_override_reason}`
                                        : 'Patient has documented Penicillin / Sulfonamide allergy matching prescribed medicine.'}
                                    </div>
                                    {!activeOrder.allergy_override_reason && (
                                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                                        <button
                                          onClick={() => showNotice('Dr. R. Kulkarni notified via clinical messenger', 'success')}
                                          style={{ height: '40px', padding: '0 12px', borderRadius: '10px', background: '#fff', color: '#111827', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                          Contact doctor
                                        </button>
                                        <button
                                          onClick={() => setAllergyModalOpen(true)}
                                          style={{ height: '40px', padding: '0 12px', borderRadius: '10px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                          Override with reason
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                  <CircleCheck size={18} color="#15803d" className="hms-tick" />
                                  <div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#15803d' }}>No allergy conflicts detected</div>
                                    <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>Formulary cross-reactivity scan passed</div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Drug Interaction Section */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                                DRUG INTERACTION CHECK
                              </div>
                              {activeOrder.order_number === 'RX-24123' ? (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                                  <TriangleAlert size={18} color="#b45309" />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#b45309' }}>Moderate Interaction: Ciprofloxacin + Antacid</div>
                                    <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>
                                      Chelation reduces ciprofloxacin absorption. Advise a 2-hour gap between doses.
                                    </div>
                                    <div
                                      onClick={() => setInteractionAck(!interactionAck)}
                                      style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px', cursor: 'pointer' }}
                                    >
                                      <span
                                        style={{
                                          width: '18px',
                                          height: '18px',
                                          flexShrink: 0,
                                          borderRadius: '5px',
                                          border: `1.5px solid ${interactionAck ? '#2563eb' : '#d1d5db'}`,
                                          background: interactionAck ? '#2563eb' : '#fff',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}
                                      >
                                        {interactionAck && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
                                      </span>
                                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Reviewed — will counsel patient</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                  <CircleCheck size={18} color="#15803d" className="hms-tick" />
                                  <div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#15803d' }}>No significant interactions</div>
                                    <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>All concurrent prescribed items are clinically compatible</div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Controlled Drug Check */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                                CONTROLLED DRUG CHECK
                              </div>
                              {activeOrder.items?.some((it) => it.is_narcotic || it.medicine_schedule === 'H1') ? (
                                <div style={{ padding: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', background: '#111827', borderRadius: '4px', padding: '2px 6px' }}>
                                      CD · Schedule H1
                                    </span>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                                      {activeOrder.items.find((it) => it.is_narcotic)?.medicine_name}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 10px' }}>
                                    Statutory register entry required · Will be logged on dispense
                                  </div>
                                  <div
                                    onClick={() => setCdRxSighted(!cdRxSighted)}
                                    style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }}
                                  >
                                    <span style={{ width: '18px', height: '18px', flexShrink: 0, borderRadius: '5px', border: `1.5px solid ${cdRxSighted ? '#2563eb' : '#d1d5db'}`, background: cdRxSighted ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      {cdRxSighted && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
                                    </span>
                                    <div>
                                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Original physical prescription sighted</div>
                                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Signed by registered physician with registration number</div>
                                    </div>
                                  </div>
                                  <div
                                    onClick={() => setCdPhotoId(!cdPhotoId)}
                                    style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }}
                                  >
                                    <span style={{ width: '18px', height: '18px', flexShrink: 0, borderRadius: '5px', border: `1.5px solid ${cdPhotoId ? '#2563eb' : '#d1d5db'}`, background: cdPhotoId ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      {cdPhotoId && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
                                    </span>
                                    <div>
                                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Patient photo ID verified</div>
                                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Aadhaar / Voter ID verified against prescription name</div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                                      Register remarks <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <textarea
                                      value={cdRemarks}
                                      onChange={(e) => setCdRemarks(e.target.value)}
                                      rows={2}
                                      placeholder="Indication, quantity justification, patient ID number"
                                      style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                                    />
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Minimum 10 characters ({cdRemarks.length} entered)</span>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                  <CircleCheck size={18} color="#15803d" className="hms-tick" />
                                  <div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#15803d' }}>No controlled drugs</div>
                                    <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>No statutory CD register entry required for this order</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* STEP 3: PAYMENT SOURCE (6 SETTLEMENT ENGINES) */}
                        {wizardStep === 3 && (
                          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                                PAYMENT SOURCE · 6 SETTLEMENT ENGINES
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
                                Phase 5
                              </span>
                            </div>

                            {[
                              { mode: 'PAY_AT_PHARMACY', label: '1. Pay at Counter', sub: 'Instant POS · Cash with change calculator, Card, or UPI QR', icon: Wallet, badge: 'Instant POS' },
                              { mode: 'PAY_AT_RECEPTION', label: '2. Pay at Reception', sub: 'Token-linked deferred billing · Policy A (Hold) / Policy B (Handover)', icon: Receipt, badge: 'Token PH-88XX' },
                              { mode: 'INSURANCE', label: '3. Insurance / TPA', sub: 'Empanelled cashless pre-auth with automated Co-Pay split', icon: ShieldCheck, badge: '80% Cashless' },
                              { mode: 'CORPORATE', label: '4. Corporate B2B', sub: 'Empanelled institutional account · 10% to 20% schedule discount', icon: Building2, badge: 'B2B Tariff' },
                              { mode: 'CREDIT', label: '5. Hospital Credit Facility', sub: 'Staff allowance, VIP line, ER indigent fund · Dual-Sign PIN 4412', icon: FileBadge, badge: 'Credit Line' },
                              { mode: 'IPD_RUNNING_BILL', label: '6. IPD Running Folio', sub: 'Inpatient admission ledger · Deposit check & MAR sync', icon: BedDouble, badge: 'Ward Bed' },
                            ].map((m) => {
                              const isSelected = paymentModeChoice === m.mode;
                              const Icon = m.icon;
                              return (
                                <div
                                  key={m.mode}
                                  onClick={() => handleStep3SelectMode(m.mode)}
                                  style={{
                                    display: 'flex',
                                    gap: '12px',
                                    alignItems: 'center',
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    border: `1px solid ${isSelected ? '#2563eb' : '#e5e7eb'}`,
                                    background: isSelected ? '#eff6ff' : '#fff',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  <span
                                    style={{
                                      width: '18px',
                                      height: '18px',
                                      flexShrink: 0,
                                      borderRadius: '50%',
                                      border: `2px solid ${isSelected ? '#2563eb' : '#d1d5db'}`,
                                      background: '#fff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    {isSelected && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />}
                                  </span>
                                  <Icon size={18} color={isSelected ? '#2563eb' : '#4b5563'} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{m.label}</div>
                                      <span style={{ fontSize: '10px', fontWeight: 600, color: isSelected ? '#1d4ed8' : '#6b7280', background: isSelected ? '#dbeafe' : '#f3f4f6', padding: '1px 6px', borderRadius: '4px' }}>
                                        {m.badge}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{m.sub}</div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Dynamic Settlement Breakdown Preview */}
                            <div style={{ marginTop: '6px', padding: '12px 14px', background: '#f9fafb', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', border: '1px solid #e5e7eb' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#4b5563' }}>
                                  {prescriptionOutcome === 'PARTIAL_PURCHASE'
                                    ? `Partial dispense gross total (${billableItems.length} items)`
                                    : 'Prescription gross total'}
                                </span>
                                <span style={{ color: '#111827', fontWeight: 600 }}>{formatINR(billableTotal)}</span>
                              </div>

                              {paymentModeChoice === 'CORPORATE' && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                                  <span>Schedule discount (15%)</span>
                                  <span>- {formatINR(billableTotal * 0.15)}</span>
                                </div>
                              )}

                              {paymentModeChoice === 'INSURANCE' && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb' }}>
                                  <span>Admissible TPA cover (80%)</span>
                                  <span>{formatINR(billableTotal * 0.8)}</span>
                                </div>
                              )}

                              {paymentModeChoice === 'CREDIT' && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7c3aed' }}>
                                  <span>Hospital credit authorization</span>
                                  <span>{formatINR(billableTotal)} (100%)</span>
                                </div>
                              )}

                              {paymentModeChoice === 'PAY_AT_RECEPTION' && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309' }}>
                                  <span>Receivable at Central Reception Desk</span>
                                  <span>{formatINR(billableTotal)}</span>
                                </div>
                              )}

                              {paymentModeChoice === 'IPD_RUNNING_BILL' && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369a1' }}>
                                  <span>Inpatient Folio Debit</span>
                                  <span>{formatINR(billableTotal)}</span>
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #e5e7eb' }}>
                                <span style={{ fontWeight: 600, color: '#111827' }}>Net collect at this counter</span>
                                <span style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>
                                  {formatINR(
                                    paymentModeChoice === 'INSURANCE'
                                      ? billableTotal * 0.2
                                      : paymentModeChoice === 'CORPORATE'
                                      ? 0
                                      : paymentModeChoice === 'CREDIT'
                                      ? 0
                                      : paymentModeChoice === 'PAY_AT_RECEPTION'
                                      ? 0
                                      : paymentModeChoice === 'IPD_RUNNING_BILL'
                                      ? 0
                                      : billableTotal
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STEP 4: PAYMENT VERIFICATION (ADAPTIVE SUB-PANELS) */}
                        {wizardStep === 4 && (
                          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Settlement Engine</div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                                  {paymentModeChoice === 'PAY_AT_PHARMACY' && '1. Counter POS (Instant Cash / Card / UPI)'}
                                  {paymentModeChoice === 'PAY_AT_RECEPTION' && '2. Pay at Reception (Token Slip Deferred)'}
                                  {paymentModeChoice === 'INSURANCE' && '3. Insurance / TPA (Cashless Co-Pay Split)'}
                                  {paymentModeChoice === 'CORPORATE' && '4. Corporate B2B (Institutional Tariff)'}
                                  {paymentModeChoice === 'CREDIT' && '5. Hospital Credit Facility (Staff/VIP/Indigent)'}
                                  {paymentModeChoice === 'IPD_RUNNING_BILL' && '6. IPD Running Folio (Inpatient Ledger)'}
                                </div>
                              </div>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  height: '26px',
                                  padding: '0 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  background: activeOrder.payment_status === 'PAID' ? '#f0fdf4' : '#fffbeb',
                                  color: activeOrder.payment_status === 'PAID' ? '#15803d' : '#b45309',
                                  border: `1px solid ${activeOrder.payment_status === 'PAID' ? '#bbf7d0' : '#fde68a'}`,
                                }}
                              >
                                {activeOrder.payment_status}
                              </span>
                            </div>

                            {/* SUB-PANEL 1: PAY AT PHARMACY COUNTER */}
                            {paymentModeChoice === 'PAY_AT_PHARMACY' && (
                              <div style={{ padding: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                  <span style={{ fontSize: '13px', color: '#4b5563' }}>
                                    {prescriptionOutcome === 'PARTIAL_PURCHASE' ? 'Partial Amount due' : 'Amount due'}
                                  </span>
                                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{formatINR(billableTotal)}</span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                  {(['Cash', 'Card', 'UPI'] as const).map((m) => (
                                    <button
                                      key={m}
                                      onClick={() => setTenderMethod(m)}
                                      style={{
                                        height: '40px',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: tenderMethod === m ? '#eff6ff' : '#fff',
                                        color: tenderMethod === m ? '#1d4ed8' : '#374151',
                                        border: `1px solid ${tenderMethod === m ? '#2563eb' : '#d1d5db'}`,
                                      }}
                                    >
                                      {m}
                                    </button>
                                  ))}
                                </div>

                                {tenderMethod === 'Cash' && (
                                  <>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Cash Tendered</label>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                          {[
                                            { label: 'Exact', amt: billableTotal },
                                            { label: '+₹50', amt: Math.ceil(billableTotal / 50) * 50 },
                                            { label: '+₹100', amt: Math.ceil(billableTotal / 100) * 100 },
                                            { label: '+₹500', amt: Math.ceil(billableTotal / 500) * 500 },
                                          ].map((chip) => (
                                            <button
                                              key={chip.label}
                                              type="button"
                                              onClick={() => setTenderAmount(String(chip.amt))}
                                              style={{
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                border: '1px solid #d1d5db',
                                                background: '#f9fafb',
                                                color: '#374151',
                                                cursor: 'pointer',
                                              }}
                                            >
                                              {chip.label}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <input
                                        value={tenderAmount}
                                        onChange={(e) => setTenderAmount(e.target.value)}
                                        placeholder={String(billableTotal)}
                                        style={{ height: '40px', padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontWeight: 600, outline: 'none' }}
                                      />
                                    </div>

                                    {/* Calculated Change Due */}
                                    {Number(tenderAmount || billableTotal) >= billableTotal ? (
                                      <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#15803d' }}>Change Due to Patient</span>
                                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#15803d' }}>
                                          {formatINR(Math.max(0, Number(tenderAmount || billableTotal) - billableTotal))}
                                        </span>
                                      </div>
                                    ) : (
                                      <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', fontSize: '12px', color: '#dc2626', fontWeight: 500 }}>
                                        Insufficient cash tendered (Short {formatINR(billableTotal - Number(tenderAmount))})
                                      </div>
                                    )}
                                  </>
                                )}

                                {tenderMethod === 'Card' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                      Swipe/Tap on Counter 2 EDC Terminal (HDFC 8812)
                                    </div>
                                    <input
                                      value={tenderRef}
                                      onChange={(e) => setTenderRef(e.target.value)}
                                      placeholder="POS Auth Code / Approval Ref (e.g. POS-88219)"
                                      style={{ height: '40px', padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', outline: 'none', fontFamily: MONO_FONT }}
                                    />
                                  </div>
                                )}

                                {tenderMethod === 'UPI' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', padding: '12px', background: '#f9fafb', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                                    <div style={{ width: '100px', height: '100px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
                                      <QrCode size={64} color="#0f172a" />
                                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>UPI SCAN &amp; PAY</span>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: '11px', color: '#64748b' }}>Dynamic QR for Counter 2</div>
                                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', fontFamily: MONO_FONT }}>
                                        northhospital.pharma@icici
                                      </div>
                                    </div>
                                    <input
                                      value={tenderRef}
                                      onChange={(e) => setTenderRef(e.target.value)}
                                      placeholder="Txn ID / UTR (e.g. 2610-8849)"
                                      style={{ width: '100%', height: '36px', padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', outline: 'none', fontFamily: MONO_FONT }}
                                    />
                                  </div>
                                )}

                                <button
                                  onClick={handleRecordCounterPayment}
                                  style={{ height: '40px', borderRadius: '10px', background: '#fff', color: '#111827', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  Record Counter Payment
                                </button>
                              </div>
                            )}

                            {/* SUB-PANEL 2: PAY AT RECEPTION */}
                            {paymentModeChoice === 'PAY_AT_RECEPTION' && (
                              <div style={{ padding: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                  <span style={{ fontSize: '13px', color: '#4b5563' }}>Payable at Central Cashier</span>
                                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{formatINR(Number(activeOrder.total_amount))}</span>
                                </div>

                                {/* Token Slip Graphic */}
                                <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 600 }}>DISPENSE TOKEN SLIP</div>
                                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#78350f', fontFamily: MONO_FONT, letterSpacing: '0.05em' }}>
                                      {activeOrder.token_slip_number || 'PH-8821'}
                                    </div>
                                  </div>
                                  <span style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                                    BARCODE VERIFIED
                                  </span>
                                </div>

                                {/* Policy A vs Policy B Selector */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>Handover Policy</label>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                    <button
                                      type="button"
                                      onClick={() => setReceptionPolicy('PRE_PAID')}
                                      style={{
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        background: receptionPolicy === 'PRE_PAID' ? '#eff6ff' : '#fff',
                                        color: receptionPolicy === 'PRE_PAID' ? '#1d4ed8' : '#374151',
                                        border: `1px solid ${receptionPolicy === 'PRE_PAID' ? '#2563eb' : '#d1d5db'}`,
                                      }}
                                    >
                                      Policy A: Pre-Paid Hold
                                      <div style={{ fontSize: '10px', fontWeight: 400, color: '#6b7280', marginTop: '2px' }}>Hold on Counter 2 shelf until cleared</div>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setReceptionPolicy('POST_PAID')}
                                      style={{
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        background: receptionPolicy === 'POST_PAID' ? '#eff6ff' : '#fff',
                                        color: receptionPolicy === 'POST_PAID' ? '#1d4ed8' : '#374151',
                                        border: `1px solid ${receptionPolicy === 'POST_PAID' ? '#2563eb' : '#d1d5db'}`,
                                      }}
                                    >
                                      Policy B: Post-Paid
                                      <div style={{ fontSize: '10px', fontWeight: 400, color: '#6b7280', marginTop: '2px' }}>Handover with signed token slip</div>
                                    </button>
                                  </div>
                                </div>

                                {/* Central Cashier Clearance Webhook Simulator */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px dashed #e5e7eb' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                                    Cashier Receipt / Clearance Webhook <span style={{ color: '#dc2626' }}>*</span>
                                  </label>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <input
                                      value={receptionRcpt}
                                      onChange={(e) => setReceptionRcpt(e.target.value)}
                                      placeholder="RCP-2610-8842 or Token"
                                      style={{ flex: 1, height: '38px', padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: MONO_FONT }}
                                    />
                                    <button
                                      onClick={handleClearReceptionWebhook}
                                      style={{ height: '40px', padding: '0 12px', borderRadius: '10px', background: '#2563eb', color: '#fff', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    >
                                      Clear via Cashier
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* SUB-PANEL 3: INSURANCE / TPA */}
                            {paymentModeChoice === 'INSURANCE' && (
                              <div style={{ padding: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fff' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>Empanelled TPA / Insurer</label>
                                  <select
                                    value={selectedTpaId}
                                    onChange={(e) => setSelectedTpaId(e.target.value)}
                                    style={{ height: '38px', padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', background: '#fff' }}
                                  >
                                    {tpaDirectory.length > 0 ? (
                                      tpaDirectory.map((t) => (
                                        <option key={t.id} value={t.id}>
                                          {t.name} ({t.standard_cover_pct}% Cashless Cover)
                                        </option>
                                      ))
                                    ) : (
                                      <>
                                        <option value="TPA-STAR-01">Star Health &amp; Allied Insurance (80% Cover)</option>
                                        <option value="TPA-MEDIB-02">MediBuddy / Medi Assist TPA (85% Cover)</option>
                                        <option value="TPA-CARE-03">Care Health Insurance (80% Cover)</option>
                                        <option value="TPA-HDFC-04">HDFC ERGO General Insurance (75% Cover)</option>
                                      </>
                                    )}
                                  </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#4b5563' }}>Policy Number</label>
                                    <input
                                      value={tpaPolicyNo}
                                      onChange={(e) => setTpaPolicyNo(e.target.value)}
                                      placeholder="SH-992140"
                                      style={{ height: '36px', padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', fontFamily: MONO_FONT }}
                                    />
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#4b5563' }}>Pre-Auth Claim Code</label>
                                    <input
                                      value={tpaPreauthCode}
                                      onChange={(e) => setTpaPreauthCode(e.target.value)}
                                      placeholder="AUTH-STAR-998"
                                      style={{ height: '36px', padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', fontFamily: MONO_FONT }}
                                    />
                                  </div>
                                </div>

                                {/* Co-Pay Split Box */}
                                <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: '#1e40af' }}>Admissible Cashless Claim (80%)</span>
                                    <span style={{ fontWeight: 600, color: '#1e40af' }}>{formatINR(billableTotal * 0.8)}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingTop: '4px', borderTop: '1px dashed #bfdbfe' }}>
                                    <span style={{ fontWeight: 700, color: '#1e3a8a' }}>Patient Co-Pay Due (20%)</span>
                                    <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{formatINR(billableTotal * 0.2)}</span>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#111827', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={copaySettled}
                                      onChange={(e) => setCopaySettled(e.target.checked)}
                                      style={{ width: '16px', height: '16px' }}
                                    />
                                    <span>Patient Co-Pay settled at counter</span>
                                  </label>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    {(['Cash', 'Card', 'UPI'] as const).map((m) => (
                                      <button
                                        key={m}
                                        type="button"
                                        onClick={() => setCopayMethod(m)}
                                        style={{
                                          fontSize: '12px',
                                          fontWeight: 600,
                                          padding: '2px 8px',
                                          borderRadius: '4px',
                                          background: copayMethod === m ? '#2563eb' : '#fff',
                                          color: copayMethod === m ? '#fff' : '#4b5563',
                                          border: `1px solid ${copayMethod === m ? '#2563eb' : '#d1d5db'}`,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        {m}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* SUB-PANEL 4: CORPORATE B2B */}
                            {paymentModeChoice === 'CORPORATE' && (
                              <div style={{ padding: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fff' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>Empanelled Corporate Account</label>
                                  <select
                                    value={selectedCorpId}
                                    onChange={(e) => setSelectedCorpId(e.target.value)}
                                    style={{ height: '38px', padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', background: '#fff' }}
                                  >
                                    {corpDirectory.length > 0 ? (
                                      corpDirectory.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.name} ({c.discount_pct}% Schedule Tariff)
                                        </option>
                                      ))
                                    ) : (
                                      <>
                                        <option value="CORP-IR-01">Indian Railways (Western Zone) - 15%</option>
                                        <option value="CORP-CGHS-02">Central Govt Health Scheme (CGHS) - 20%</option>
                                        <option value="CORP-TECHM-03">Tech Mahindra Healthcare - 10%</option>
                                      </>
                                    )}
                                  </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#4b5563' }}>Employee Badge ID</label>
                                    <input
                                      value={corpBadgeId}
                                      onChange={(e) => setCorpBadgeId(e.target.value)}
                                      placeholder="WR-EMP-88412"
                                      style={{ height: '36px', padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', fontFamily: MONO_FONT }}
                                    />
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#4b5563' }}>Auth Letter / Voucher Ref</label>
                                    <input
                                      value={corpAuthLetter}
                                      onChange={(e) => setCorpAuthLetter(e.target.value)}
                                      placeholder="LET-WR-2026-9"
                                      style={{ height: '36px', padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', fontFamily: MONO_FONT }}
                                    />
                                  </div>
                                </div>

                                <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>SCHEDULE DISCOUNT (15%)</div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#14532d' }}>
                                      Net Corporate Invoice: {formatINR(Number(activeOrder.total_amount) * 0.85)}
                                    </div>
                                  </div>
                                  <span style={{ fontSize: '11px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                    -15% APPLIED
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* SUB-PANEL 5: HOSPITAL CREDIT FACILITY */}
                            {paymentModeChoice === 'CREDIT' && (
                              <div style={{ padding: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fff' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>Authorized Credit Line</label>
                                  <select
                                    value={selectedCreditId}
                                    onChange={(e) => setSelectedCreditId(e.target.value)}
                                    style={{ height: '38px', padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', background: '#fff' }}
                                  >
                                    {creditAccounts.length > 0 ? (
                                      creditAccounts.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.account_name} · Avail: {formatINR(c.available_balance)}
                                        </option>
                                      ))
                                    ) : (
                                      <>
                                        <option value="CR-STAFF-01">Dr. Sarah Jenkins (Staff Allowance · Avail: ₹46,200)</option>
                                        <option value="CR-STAFF-02">Marcus Vance (Lab HOD · Avail: ₹22,800)</option>
                                        <option value="CR-VIP-01">Elena Rostova (Executive Trustee · Avail: ₹88,500)</option>
                                        <option value="CR-EMERG-01">Emergency ER Relief Fund (Avail: ₹1,65,000)</option>
                                      </>
                                    )}
                                  </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                                    Dual-Sign Authorizer PIN (4412) <span style={{ color: '#dc2626' }}>*</span>
                                  </label>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                      type="password"
                                      maxLength={6}
                                      value={creditAuthPin}
                                      onChange={(e) => setCreditAuthPin(e.target.value)}
                                      placeholder="••••"
                                      style={{ width: '120px', height: '38px', padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '15px', fontFamily: MONO_FONT, letterSpacing: '0.2em', outline: 'none' }}
                                    />
                                    {creditAuthPin === '4412' || creditAuthPin === '1234' ? (
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#15803d' }}>
                                        <CheckCircle2 size={16} color="#16a34a" /> MS Authorized
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '11px', color: '#6b7280' }}>PIN required for credit book</span>
                                    )}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#4b5563' }}>Justification / Notes</label>
                                  <input
                                    value={creditJustification}
                                    onChange={(e) => setCreditJustification(e.target.value)}
                                    placeholder="Approved staff monthly medical allowance"
                                    style={{ height: '36px', padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* SUB-PANEL 6: IPD RUNNING BILL */}
                            {paymentModeChoice === 'IPD_RUNNING_BILL' && (
                              <div style={{ padding: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                                    Inpatient Admission Ledger
                                  </span>
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#0369a1', background: '#f0f9ff', padding: '2px 8px', borderRadius: '4px' }}>
                                    {ipdAdmissionStatus?.ward || 'ICU'} · {ipdAdmissionStatus?.bed || 'Bed 04'}
                                  </span>
                                </div>

                                {/* Deposit Gauge */}
                                <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: '#64748b' }}>Advance Deposit Balance</span>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                      {formatINR(ipdAdmissionStatus?.advance_deposit_total || 25000)}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: '#64748b' }}>Cumulative IPD Bill</span>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                      {formatINR(ipdAdmissionStatus?.cumulative_bill || 19400)}
                                    </span>
                                  </div>

                                  {/* Progress bar */}
                                  <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginTop: '2px' }}>
                                    <div
                                      style={{
                                        width: `${Math.min(100, ipdAdmissionStatus?.deposit_utilization_pct || 77.6)}%`,
                                        height: '100%',
                                        background: (ipdAdmissionStatus?.deposit_utilization_pct || 77.6) >= 80 ? '#f59e0b' : '#2563eb',
                                      }}
                                    />
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'right' }}>
                                    Deposit Utilization: {ipdAdmissionStatus?.deposit_utilization_pct || 77.6}%
                                  </div>
                                </div>

                                {(ipdAdmissionStatus?.threshold_warning || (ipdAdmissionStatus?.deposit_utilization_pct || 77.6) >= 80) && (
                                  <div style={{ padding: '8px 10px', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <TriangleAlert size={14} color="#b45309" />
                                    <span style={{ fontSize: '11px', color: '#92400e', fontWeight: 600 }}>
                                      Deposit balance utilization near 80% threshold — alert billing cashier.
                                    </span>
                                  </div>
                                )}

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: '#0369a1' }}>
                                  <Check size={14} color="#0369a1" />
                                  <span>Nurse MAR sync: Medication status will flip to READY_TO_ADMINISTER upon dispense.</span>
                                </div>
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', color: '#6b7280' }}>
                              <Info size={14} />
                              <span>Strict Read-Only Handoff Invariant: Pharmacy charge reaches Billing ledger on dispense (Step 7), not before.</span>
                            </div>
                          </div>
                        )}


                        {/* STEP 5: PICK & LABEL */}
                        {wizardStep === 5 && (
                          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                                PICK &amp; LABEL · FEFO ALLOCATION
                              </div>
                              {prescriptionOutcome === 'PARTIAL_PURCHASE' && (
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px' }}>
                                  Picking {billableItems.length} selected items
                                </span>
                              )}
                            </div>

                            {billableItems.map((it) => {
                              const isPicked = !!pickedLines[it.id];
                              return (
                                <div
                                  key={it.id}
                                  onClick={() => setPickedLines({ ...pickedLines, [it.id]: !isPicked })}
                                  style={{
                                    display: 'flex',
                                    gap: '10px',
                                    alignItems: 'flex-start',
                                    padding: '12px',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    background: isPicked ? '#eff6ff' : '#fff',
                                  }}
                                >
                                  <span
                                    style={{
                                      width: '18px',
                                      height: '18px',
                                      flexShrink: 0,
                                      borderRadius: '5px',
                                      border: `1.5px solid ${isPicked ? '#2563eb' : '#d1d5db'}`,
                                      background: isPicked ? '#2563eb' : '#fff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    {isPicked && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
                                  </span>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                                      {it.medicine_name} × {it.prescribed_quantity}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                      Batch {it.suggested_fefo_batch?.batch_number || 'B-ACTIVE-24'} (Exp {it.suggested_fefo_batch?.expiry_date || '2027-08'})
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {prescriptionOutcome === 'PARTIAL_PURCHASE' && activeOrder.items && activeOrder.items.length > billableItems.length && (
                              <div style={{ padding: '8px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px dashed #cbd5e1', fontSize: '11px', color: '#64748b' }}>
                                {activeOrder.items.length - billableItems.length} unselected medicine(s) excluded from batch allocation. No stock will be deducted for them.
                              </div>
                            )}

                            <div
                              onClick={() => setLabelsAffixed(!labelsAffixed)}
                              style={{
                                display: 'flex',
                                gap: '10px',
                                alignItems: 'flex-start',
                                padding: '12px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                background: labelsAffixed ? '#eff6ff' : '#fff',
                              }}
                            >
                              <span style={{ width: '18px', height: '18px', flexShrink: 0, borderRadius: '5px', border: `1.5px solid ${labelsAffixed ? '#2563eb' : '#d1d5db'}`, background: labelsAffixed ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {labelsAffixed && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
                              </span>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Dosage labels printed and affixed</div>
                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                  Patient name, dose, timing, and storage instructions affixed on every pack
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STEP 6: COUNSELING */}
                        {wizardStep === 6 && (
                          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                                PATIENT COUNSELING · BEFORE DISPENSE
                              </span>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                                {Object.values(counselChecks).filter(Boolean).length} of 4
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', color: '#4b5563' }}>Language</span>
                              <select
                                value={counselLang}
                                onChange={(e) => setCounselLang(e.target.value)}
                                style={{ height: '36px', padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', background: '#fff' }}
                              >
                                <option>English</option>
                                <option>Hindi</option>
                                <option>Kannada</option>
                                <option>Tamil</option>
                                <option>Telugu</option>
                              </select>
                            </div>

                            {[
                              { key: 'dosage', t: 'Dosage and route', s: 'Explained how many units per dose and method of intake' },
                              { key: 'timing', t: 'Timing and meal relationship', s: 'Explained before/after food, spacing, and duration' },
                              { key: 'side_effects', t: 'Common side effects & precautions', s: 'Explained drowsiness, hydration, and when to contact doctor' },
                              { key: 'storage', t: 'Storage conditions', s: 'Room temperature / refrigeration guidance confirmed' },
                            ].map((c) => {
                              const checked = counselChecks[c.key];
                              return (
                                <div
                                  key={c.key}
                                  onClick={() => setCounselChecks({ ...counselChecks, [c.key]: !checked })}
                                  style={{
                                    display: 'flex',
                                    gap: '10px',
                                    alignItems: 'flex-start',
                                    padding: '10px 12px',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    background: checked ? '#eff6ff' : '#fff',
                                  }}
                                >
                                  <span style={{ width: '18px', height: '18px', flexShrink: 0, borderRadius: '5px', border: `1.5px solid ${checked ? '#2563eb' : '#d1d5db'}`, background: checked ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {checked && <Check size={12} color="#fff" strokeWidth={3} className="hms-tick" />}
                                  </span>
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{c.t}</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{c.s}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* STEP 7: DISPENSE PREVIEW */}
                        {wizardStep === 7 && (
                          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {activeOrder.status === 'DISPENSED' ? (
                              <div style={{ display: 'flex', gap: '10px', padding: '12px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                <CircleCheck size={18} color="#15803d" className="hms-tick" />
                                <div>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#15803d' }}>Dispensed and handed over</div>
                                  <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>
                                    Prescription marked Fulfilled · moved to Completed today
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                                  ON DISPENSE, THE SYSTEM WILL
                                </div>
                                {prescriptionOutcome === 'PARTIAL_PURCHASE' && (
                                  <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#b45309' }}>
                                      Partial Dispense Confirmation
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#78350f' }}>
                                      Dispensing {billableItems.length} selected items ({formatINR(billableTotal)}). {activeOrder.items ? activeOrder.items.length - billableItems.length : 0} unselected items remain open for future collection. Status will transition to PARTIALLY DISPENSED.
                                    </div>
                                  </div>
                                )}
                                {[
                                  { t: 'Deduct batch inventory by FEFO', s: 'Batches updated atomically in live pharmacy ledger', icon: Package },
                                  { t: 'Post charge to Billing Ledger', s: 'Invoice items generated with payment status', icon: Receipt },
                                  { t: 'Update Patient Clinical Record', s: 'Medications recorded as Dispensed in EHR', icon: FileText },
                                  { t: 'Log statutory audit trail', s: 'Pharmacist ID, time, and counseling recorded', icon: CircleCheck },
                                ].map((x, idx) => {
                                  const Icon = x.icon;
                                  return (
                                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                                      <Icon size={16} color="#4b5563" />
                                      <div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{x.t}</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{x.s}</div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Sticky Panel Footer with Actions */}
                      <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {wizardStep > 1 && activeOrder.status !== 'DISPENSED' && (
                            <button
                              onClick={() => setWizardStep((prev) => Math.max(1, prev - 1))}
                              style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: 'transparent', color: '#374151', border: '1px solid transparent', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Back
                            </button>
                          )}

                          {wizardStep === 1 && (
                            <button
                              onClick={handleStep1Verify}
                              style={{ flex: 1, height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#2563eb', border: '1px solid #2563eb', cursor: 'pointer' }}
                            >
                              Verify &amp; run safety checks
                            </button>
                          )}
                          {wizardStep === 2 && (
                            <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                              <button
                                onClick={handlePutOnHold}
                                style={{ height: '40px', padding: '0 14px', borderRadius: '10px', background: '#fff', color: '#b45309', border: '1px solid #fde68a', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Put on hold
                              </button>
                              <button
                                onClick={handleStep2Continue}
                                style={{ flex: 1, height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#2563eb', border: '1px solid #2563eb', cursor: 'pointer' }}
                              >
                                Continue to payment
                              </button>
                            </div>
                          )}
                          {wizardStep === 3 && (
                            <button
                              onClick={handleStep3Continue}
                              style={{ flex: 1, height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#2563eb', border: '1px solid #2563eb', cursor: 'pointer' }}
                            >
                              Continue to payment verification
                            </button>
                          )}
                          {wizardStep === 4 && (
                            <button
                              onClick={handleStep4Continue}
                              style={{ flex: 1, height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#2563eb', border: '1px solid #2563eb', cursor: 'pointer' }}
                            >
                              Proceed to pick &amp; label
                            </button>
                          )}
                          {wizardStep === 5 && (
                            <button
                              onClick={handleStep5Continue}
                              style={{ flex: 1, height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#2563eb', border: '1px solid #2563eb', cursor: 'pointer' }}
                            >
                              Proceed to counseling
                            </button>
                          )}
                          {wizardStep === 6 && (
                            <button
                              onClick={handleStep6Continue}
                              disabled={!isCounselingComplete}
                              style={{
                                flex: 1,
                                height: '40px',
                                padding: '0 16px',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#fff',
                                background: isCounselingComplete ? '#2563eb' : '#9ca3af',
                                border: `1px solid ${isCounselingComplete ? '#2563eb' : '#9ca3af'}`,
                                cursor: isCounselingComplete ? 'pointer' : 'not-allowed',
                              }}
                            >
                              {isCounselingComplete ? 'Proceed to dispense' : 'Complete 4-point counseling to proceed'}
                            </button>
                          )}
                          {wizardStep === 7 && activeOrder.status !== 'DISPENSED' && (
                            <button
                              onClick={handleDispenseAndComplete}
                              style={{ flex: 1, height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#16a34a', border: '1px solid #16a34a', cursor: 'pointer' }}
                            >
                              Dispense &amp; complete
                            </button>
                          )}
                          {activeOrder.status === 'DISPENSED' && (
                            <button
                              onClick={handleCallNext}
                              style={{ flex: 1, height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#2563eb', border: '1px solid #2563eb', cursor: 'pointer' }}
                            >
                              Call next patient
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 2: OTC / WALK-IN SALES
          ========================================== */}
          {currentTab === 'otc' && (
            isCreatingOtcSale ? (
              <NewOTCSalePage
                embedded
                onClose={() => {
                  setIsCreatingOtcSale(false);
                  loadOtcSales();
                  loadKpis();
                }}
                onComplete={() => {
                  loadOtcSales();
                  loadKpis();
                }}
              />
            ) : (
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
                  <div style={{ padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        OTC Direct Sales
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
                        {filteredOtcSales.length} Sales
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                      Non-prescription walk-in sales &amp; cash counter
                    </p>

                    <div style={{ position: 'relative', width: '100%' }}>
                      <Search size={15} style={{ position: 'absolute', left: '11px', top: '11px', color: '#9ca3af' }} />
                      <input
                        value={otcSearch}
                        onChange={(e) => setOtcSearch(e.target.value)}
                        placeholder="Search invoice, customer or phone..."
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

                    {/* Mode Pills */}
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
                      {(['all', 'Cash', 'Card', 'UPI'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setOtcModeFilter(mode)}
                          style={getPillStyle(otcModeFilter === mode)}
                        >
                          {mode === 'all' ? 'All Payments' : mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* OTC Sales List */}
                  <div
                    style={{
                      maxHeight: 'calc(100vh - 290px)',
                      overflowY: 'auto',
                      borderTop: '1px solid #f3f4f6',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {filteredOtcSales.length === 0 ? (
                      <div style={{ padding: '36px 16px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                        No OTC sales match filters. Click "+ New sale" to record one.
                      </div>
                    ) : (
                      filteredOtcSales.map((s) => {
                        const isSelected = activeOtcSale?.id === s.id;
                        return (
                          <div
                            key={s.id}
                            onClick={() => setSelectedOtcId(s.id)}
                            style={{
                              padding: '12px 14px',
                              borderBottom: '1px solid #f1f5f9',
                              borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                              background: isSelected ? '#eff6ff' : '#ffffff',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              transition: 'all 0.12s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#1d4ed8' : '#111827', fontFamily: MONO_FONT }}>
                                {s.sale_number}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                                {formatINR(Number(s.total_amount))}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#4b5563' }}>
                              <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                                {s.customer_name || 'Walk-in Customer'}
                              </span>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                {s.items?.length || 1} items
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f766e', background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '1px 6px', borderRadius: '4px' }}>
                                {s.payment_mode || 'Cash'}
                              </span>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px' }}>
                                Settled
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Panel */}
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
                  {/* Context Header */}
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
                      <Receipt size={20} color="#2563eb" />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0, fontFamily: MONO_FONT }}>
                            {activeOtcSale?.sale_number || 'Direct OTC Sale'}
                          </h3>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '6px' }}>
                            Settled &amp; Billed
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                          Walk-in outpatient tax invoice · Dispensed at Main Counter 2
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => showNotice(`Reprinted invoice ${activeOtcSale?.sale_number || ''}`)}
                        style={{
                          height: '40px',
                          padding: '0 14px',
                          borderRadius: '10px',
                          border: '1px solid #d1d5db',
                          background: '#ffffff',
                          color: '#374151',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Printer size={15} />
                        Reprint Invoice
                      </button>
                      <button
                        onClick={() => setIsCreatingOtcSale(true)}
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
                        <Plus size={15} />
                        New Sale
                      </button>
                    </div>
                  </div>

                  {/* 4-Box Overview Strip */}
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
                        Customer
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activeOtcSale?.customer_name || 'Walk-in Customer'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
                        Ph: {activeOtcSale?.customer_phone || 'Not recorded'}
                      </div>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Payment Mode
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '3px' }}>
                        {activeOtcSale?.payment_mode || 'Cash'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
                        Ref: {activeOtcSale?.payment_reference || 'POS-CASH-OK'}
                      </div>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Dispensed By
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activeOtcSale?.sold_by_name || 'Counter Pharmacist'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
                        Main OPD Counter 2
                      </div>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Net Amount
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#16a34a', marginTop: '2px' }}>
                        {formatINR(Number(activeOtcSale?.total_amount || 0))}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                        Includes Tax: {formatINR(Number(activeOtcSale?.tax_amount || 0))}
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Items Table & Financial Breakdown */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Dispensed Items ({activeOtcSale?.items?.length || 1})
                      </div>
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 110px 80px 100px 100px', background: '#f8fafc', padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', borderBottom: '1px solid #e5e7eb' }}>
                          <div>MEDICINE / DESCRIPTION</div>
                          <div>BATCH #</div>
                          <div style={{ textAlign: 'center' }}>QTY</div>
                          <div style={{ textAlign: 'right' }}>UNIT PRICE</div>
                          <div style={{ textAlign: 'right' }}>TOTAL</div>
                        </div>

                        {(activeOtcSale?.items && activeOtcSale.items.length > 0) ? (
                          activeOtcSale.items.map((it: any, idx: number) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 110px 80px 100px 100px', padding: '12px 14px', borderBottom: idx < (activeOtcSale.items.length - 1) ? '1px solid #f1f5f9' : 'none', alignItems: 'center', fontSize: '13px' }}>
                              <div>
                                <div style={{ fontWeight: 600, color: '#111827' }}>{it.medicine_name}</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>Non-prescription OTC</div>
                              </div>
                              <div style={{ fontFamily: MONO_FONT, fontSize: '12px', color: '#475569' }}>
                                {it.batch_number || 'BAT-2026-X'}
                              </div>
                              <div style={{ textAlign: 'center', fontWeight: 600, color: '#111827' }}>
                                {it.quantity}
                              </div>
                              <div style={{ textAlign: 'right', color: '#475569' }}>
                                {formatINR(Number(it.unit_price))}
                              </div>
                              <div style={{ textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                                {formatINR(Number(it.line_total || it.quantity * it.unit_price))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 110px 80px 100px 100px', padding: '12px 14px', alignItems: 'center', fontSize: '13px' }}>
                            <div>
                              <div style={{ fontWeight: 600, color: '#111827' }}>Paracetamol 650 mg Tablets</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>Strip of 10 Tablets · OTC Analgesic</div>
                            </div>
                            <div style={{ fontFamily: MONO_FONT, fontSize: '12px', color: '#475569' }}>PCM-2026-A</div>
                            <div style={{ textAlign: 'center', fontWeight: 600, color: '#111827' }}>2</div>
                            <div style={{ textAlign: 'right', color: '#475569' }}>₹30.00</div>
                            <div style={{ textAlign: 'right', fontWeight: 600, color: '#111827' }}>{formatINR(Number(activeOtcSale?.total_amount || 60))}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Settlement Receipt Summary Box */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <div style={{ width: '280px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                          <span>Subtotal Amount</span>
                          <span>{formatINR(Number(activeOtcSale?.subtotal_amount || activeOtcSale?.total_amount || 0))}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                          <span>CGST (6%) + SGST (6%)</span>
                          <span>{formatINR(Number(activeOtcSale?.tax_amount || 0))}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, color: '#0f172a', paddingTop: '6px', borderTop: '1px solid #cbd5e1' }}>
                          <span>Net Payable</span>
                          <span>{formatINR(Number(activeOtcSale?.total_amount || 0))}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                          <span>Payment Received ({activeOtcSale?.payment_mode || 'Cash'})</span>
                          <span>PAID IN FULL</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sticky Footer */}
                  <div
                    style={{
                      padding: '14px 24px',
                      background: '#ffffff',
                      borderTop: '1px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Logged at {activeOtcSale?.created_at ? new Date(activeOtcSale.created_at).toLocaleTimeString() : '10:30 AM'} · Cash Drawer Reconciled
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setTab('returns');
                          setNewReturnOpen(true);
                          setNewReturnSearch(activeOtcSale?.sale_number || '');
                        }}
                        style={{
                          height: '40px',
                          padding: '0 14px',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: '#475569',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Initiate OTC Return
                      </button>
                      <button
                        onClick={() => showNotice(`Printed tax invoice for ${activeOtcSale?.sale_number || ''}`)}
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
                        <Printer size={15} />
                        Print Customer Slip
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* ==========================================
              TAB 3: COMPLETED TODAY
          ========================================== */}
          {currentTab === 'done' && (
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
                <div style={{ padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Completed Today
                    </h2>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#16a34a',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        padding: '1px 8px',
                        borderRadius: '9999px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {filteredCompleted.length} Dispensed
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                    Fulfilled prescriptions · ledger &amp; stock deducted
                  </p>

                  <div style={{ position: 'relative', width: '100%' }}>
                    <Search size={15} style={{ position: 'absolute', left: '11px', top: '11px', color: '#9ca3af' }} />
                    <input
                      value={compSearch}
                      onChange={(e) => setCompSearch(e.target.value)}
                      placeholder="Filter patient, UHID or dispense ID..."
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

                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
                    {[
                      { k: 'all', l: 'All' },
                      { k: 'cash', l: 'Cash' },
                      { k: 'card', l: 'Card' },
                      { k: 'tpa', l: 'Insurance' },
                    ].map((p) => (
                      <button
                        key={p.k}
                        onClick={() => setCompFilter(p.k)}
                        style={getPillStyle(compFilter === p.k)}
                      >
                        {p.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Completed Items List */}
                <div
                  style={{
                    maxHeight: 'calc(100vh - 290px)',
                    overflowY: 'auto',
                    borderTop: '1px solid #f3f4f6',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {filteredCompleted.length === 0 ? (
                    <div style={{ padding: '36px 16px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                      No completed dispenses found for this filter.
                    </div>
                  ) : (
                    filteredCompleted.map((d) => {
                      const isSelected = activeCompleted?.id === d.id;
                      return (
                        <div
                          key={d.id}
                          onClick={() => setSelectedCompId(d.id)}
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
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                              {d.patient}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                              {d.time || '10:31'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b' }}>
                            <span style={{ fontFamily: MONO_FONT, fontSize: '11px', color: '#475569' }}>
                              {d.id}
                            </span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>
                              {d.total_amount ? formatINR(d.total_amount) : 'Paid'}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.items}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px' }}>
                              {d.mode || 'Settled'}
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {d.flags?.slice(0, 1).map((f, fi) => (
                                <span key={fi} style={{ fontSize: '10px', fontWeight: 700, borderRadius: '4px', padding: '1px 5px', background: f.bg, color: f.fg }}>
                                  {f.text}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Panel */}
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
                    <CheckCircle2 size={20} color="#16a34a" />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0, fontFamily: MONO_FONT }}>
                          {activeCompleted?.id || 'DISP-RECORD'}
                        </h3>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '6px' }}>
                          Fulfilled &amp; Released
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                        Dispense record · Patient counselled and medications released
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => showNotice(`Printed dispense slip for ${activeCompleted?.id}`)}
                      style={{
                        height: '40px',
                        padding: '0 14px',
                        borderRadius: '10px',
                        border: '1px solid #d1d5db',
                        background: '#ffffff',
                        color: '#374151',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Printer size={15} />
                      Print Slip
                    </button>
                    <button
                      onClick={() => {
                        setTab('returns');
                        setNewReturnOpen(true);
                        setNewReturnSearch(activeCompleted?.id || '');
                      }}
                      style={{
                        height: '40px',
                        padding: '0 16px',
                        borderRadius: '10px',
                        border: '1px solid #bfdbfe',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <RotateCcw size={15} />
                      Initiate Return
                    </button>
                  </div>
                </div>

                {/* 4-Box Overview Strip */}
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
                      Patient
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeCompleted?.patient || 'Patient'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
                      UHID: {activeCompleted?.uhid || '202610-0012'}
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Prescriber
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeCompleted?.doctor || 'Consulting Physician'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
                      Outpatient Clinic
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Payment Status
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '3px' }}>
                      {activeCompleted?.mode || 'Direct Cash'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600, marginTop: '1px' }}>
                      Cleared &amp; Invoiced
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Dispense Time
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '3px' }}>
                      {activeCompleted?.time || '10:31 AM'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
                      Morning Shift · Desk 2
                    </div>
                  </div>
                </div>

                {/* Content Body: Dispensed Medication Lines & Counseling */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Fulfilled Prescription Lines
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) 110px 80px 100px 100px', background: '#f8fafc', padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', borderBottom: '1px solid #e5e7eb' }}>
                        <div>MEDICINE</div>
                        <div>BATCH DISPENSED</div>
                        <div style={{ textAlign: 'center' }}>QTY</div>
                        <div style={{ textAlign: 'right' }}>UNIT PRICE</div>
                        <div style={{ textAlign: 'right' }}>TOTAL</div>
                      </div>

                      {activeCompleted?.lines && activeCompleted.lines.length > 0 ? (
                        activeCompleted.lines.map((l: any, li: number) => (
                          <div key={li} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) 110px 80px 100px 100px', padding: '12px 14px', borderBottom: li < (activeCompleted.lines.length - 1) ? '1px solid #f1f5f9' : 'none', alignItems: 'center', fontSize: '13px' }}>
                            <div>
                              <div style={{ fontWeight: 600, color: '#111827' }}>{l.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                {l.is_cold ? 'Cold Chain 2°C–8°C · ' : ''}
                                {l.is_cd ? 'Schedule X Narcotic · ' : ''}
                                Verified
                              </div>
                            </div>
                            <div style={{ fontFamily: MONO_FONT, fontSize: '12px', color: '#475569' }}>
                              {l.batch}
                            </div>
                            <div style={{ textAlign: 'center', fontWeight: 600, color: '#111827' }}>
                              {l.qty}
                            </div>
                            <div style={{ textAlign: 'right', color: '#475569' }}>
                              {formatINR(Number(l.unit_price))}
                            </div>
                            <div style={{ textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                              {formatINR(Number(l.amt))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '16px 14px', fontSize: '13px', color: '#374151' }}>
                          <div style={{ fontWeight: 600 }}>{activeCompleted?.items}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{activeCompleted?.items_sub}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clinical Clearance & Patient Counseling Audit */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Clinical Verification &amp; Counseling Checklist
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#15803d', background: '#f0fdf4', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <ShieldCheck size={16} />
                        <span>Patient Identity (UHID &amp; Name) Confirmed</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#15803d', background: '#f0fdf4', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <ShieldCheck size={16} />
                        <span>Allergy Cross-Reactivity Screen: Negative</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#15803d', background: '#f0fdf4', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <ShieldCheck size={16} />
                        <span>Drug Interactions Scanned: None Critical</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#15803d', background: '#f0fdf4', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <ShieldCheck size={16} />
                        <span>Verbal Counseling on Food &amp; Dose Given</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div
                  style={{
                    padding: '14px 24px',
                    background: '#ffffff',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Record permanently logged to patient pharmacy MAR profile
                  </span>
                  <button
                    onClick={() => {
                      setTab('returns');
                      setNewReturnOpen(true);
                      setNewReturnSearch(activeCompleted?.id || '');
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <RotateCcw size={15} />
                    Initiate Return for this Dispense
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 4: RETURNS & REFUNDS
          ========================================== */}
          {currentTab === 'returns' && (
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
                <div style={{ padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Returns &amp; Refunds
                    </h2>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#b45309',
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        padding: '1px 8px',
                        borderRadius: '9999px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {returnsList.length} Requests
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                    Inspect, restock or quarantine, then execute refund
                  </p>

                  <div style={{ position: 'relative', width: '100%' }}>
                    <Search size={15} style={{ position: 'absolute', left: '11px', top: '11px', color: '#9ca3af' }} />
                    <input
                      value={returnSearch}
                      onChange={(e) => setReturnSearch(e.target.value)}
                      placeholder="Search patient or return ID..."
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

                  {/* Status Pills */}
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
                    {['all', 'Requested', 'Inspected', 'Refunded', 'Rejected'].map((p) => (
                      <button
                        key={p}
                        onClick={() => setReturnPill(p)}
                        style={getPillStyle(returnPill === p)}
                      >
                        {p === 'all' ? 'All Returns' : p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Returns List */}
                <div
                  style={{
                    maxHeight: 'calc(100vh - 290px)',
                    overflowY: 'auto',
                    borderTop: '1px solid #f3f4f6',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {returnsList.length === 0 ? (
                    <div style={{ padding: '36px 16px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                      No returns match the selected filter.
                    </div>
                  ) : (
                    returnsList.map((r) => {
                      const isSel = selectedReturnId === r.id;
                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedReturnId(r.id)}
                          style={{
                            padding: '12px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            borderLeft: isSel ? '3px solid #2563eb' : '3px solid transparent',
                            background: isSel ? '#eff6ff' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: isSel ? '#1d4ed8' : '#111827', fontFamily: MONO_FONT }}>
                              {r.return_number}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                              {formatINR(Number(r.total_refund_amount))}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.patient_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.items[0]?.medicine_name} × {r.items[0]?.quantity_returned || 1}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                            <span style={{ fontSize: '11px', color: '#475569' }}>
                              {r.refund_route}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background:
                                  r.status === 'Refunded'
                                    ? '#f0fdf4'
                                    : r.status === 'Inspected'
                                    ? '#eff6ff'
                                    : r.status === 'Rejected'
                                    ? '#f3f4f6'
                                    : '#fffbeb',
                                color:
                                  r.status === 'Refunded'
                                    ? '#15803d'
                                    : r.status === 'Inspected'
                                    ? '#1d4ed8'
                                    : r.status === 'Rejected'
                                    ? '#6b7280'
                                    : '#b45309',
                                border: `1px solid ${
                                  r.status === 'Refunded'
                                    ? '#bbf7d0'
                                    : r.status === 'Inspected'
                                    ? '#bfdbfe'
                                    : r.status === 'Rejected'
                                    ? '#e5e7eb'
                                    : '#fde68a'
                                }`,
                              }}
                            >
                              {r.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Panel */}
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
                    <RotateCcw size={20} color="#b45309" />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0, fontFamily: MONO_FONT }}>
                          {activeReturn?.return_number || 'RETURN INTAKE'}
                        </h3>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '6px' }}>
                          {activeReturn?.status || 'Requested'}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f766e', background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '2px 8px', borderRadius: '6px' }}>
                          Posts to Billing
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                        Medicine return intake &amp; multi-gate quality audit
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setNewReturnOpen(true)}
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
                      <Plus size={15} />
                      New Return Intake
                    </button>
                  </div>
                </div>

                {/* 4-Box Overview Strip */}
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
                      Patient Name
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeReturn?.patient_name || 'Patient'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
                      Ref: {activeReturn?.original_reference || 'DISP-ORIGINAL'}
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Return Reason
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeReturn?.reason || 'Unused medication'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
                      Route: {activeReturn?.refund_route || 'Original Card'}
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Item Count
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginTop: '3px' }}>
                      {activeReturn?.items?.length || 1} line item(s)
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
                      {activeReturn?.items[0]?.quantity_returned || 1} units returned
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Refund Due
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#b45309', marginTop: '2px' }}>
                      {formatINR(Number(activeReturn?.total_refund_amount || 0))}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                      Pending Pharmacist Clearance
                    </div>
                  </div>
                </div>

                {/* Content Body: Inspection, Checks & Disposition */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {activeReturn?.non_returnable_note && (
                    <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                      <CircleX size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>Non-Returnable Clinical Item</div>
                        <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '2px' }}>{activeReturn.non_returnable_note}</div>
                      </div>
                    </div>
                  )}

                  {/* Return Line Item Detail */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Returned Medication Information
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) 120px 80px 100px 100px', background: '#f8fafc', padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', borderBottom: '1px solid #e5e7eb' }}>
                        <div>MEDICINE</div>
                        <div>ORIGINAL BATCH</div>
                        <div style={{ textAlign: 'center' }}>QTY</div>
                        <div style={{ textAlign: 'right' }}>UNIT REFUND</div>
                        <div style={{ textAlign: 'right' }}>LINE TOTAL</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) 120px 80px 100px 100px', padding: '12px 14px', alignItems: 'center', fontSize: '13px' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{activeReturn?.items[0]?.medicine_name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Dispense Ref: {activeReturn?.original_reference}</div>
                        </div>
                        <div style={{ fontFamily: MONO_FONT, fontSize: '12px', color: '#475569' }}>
                          {activeReturn?.items[0]?.batch_number || 'BAT-MATCHED'}
                        </div>
                        <div style={{ textAlign: 'center', fontWeight: 600, color: '#111827' }}>
                          {activeReturn?.items[0]?.quantity_returned || 1}
                        </div>
                        <div style={{ textAlign: 'right', color: '#475569' }}>
                          {formatINR(Number(activeReturn?.items[0]?.refund_unit_price || 0))}
                        </div>
                        <div style={{ textAlign: 'right', fontWeight: 600, color: '#b45309' }}>
                          {formatINR(Number(activeReturn?.total_refund_amount || 0))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Physical Quality Checklist */}
                  {activeReturn?.status === 'Requested' && !activeReturn?.non_returnable_note && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Physical Quality Inspection Protocol
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                        {[
                          { key: 'sealed', label: 'Pack sealed & unopened' },
                          { key: 'batch_matches', label: 'Batch number matches dispense record' },
                          { key: 'expiry_ok', label: 'Expiry date is beyond 3 months' },
                          { key: 'storage_ok', label: 'Storage temperature integrity maintained' },
                        ].map((c) => (
                          <div
                            key={c.key}
                            onClick={() => setRetInspectChecks({ ...retInspectChecks, [c.key]: !retInspectChecks[c.key] })}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '10px 12px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              background: '#ffffff',
                              cursor: 'pointer',
                              userSelect: 'none',
                            }}
                          >
                            <span
                              style={{
                                width: '18px',
                                height: '18px',
                                flexShrink: 0,
                                borderRadius: '4px',
                                border: `1.5px solid ${retInspectChecks[c.key] ? '#2563eb' : '#d1d5db'}`,
                                background: retInspectChecks[c.key] ? '#2563eb' : '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {retInspectChecks[c.key] && <Check size={12} color="#ffffff" strokeWidth={3} className="hms-tick" />}
                            </span>
                            <span style={{ fontSize: '13px', color: '#1e293b' }}>{c.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ready for Refund Status Box */}
                  {activeReturn?.status === 'Inspected' && (
                    <div style={{ display: 'flex', gap: '12px', padding: '16px', borderRadius: '10px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                      <Receipt size={22} color="#0369a1" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0369a1' }}>
                          Physical Inspection Passed ({activeReturn.disposition || 'Restocked'})
                        </div>
                        <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px' }}>
                          Quality checks verified. Executing refund will post a reversal transaction to Billing via {activeReturn.refund_route}.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Action Footer */}
                <div
                  style={{
                    padding: '14px 24px',
                    background: '#ffffff',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Refund reversal strictly audits against cashier drawer and admission ledger
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {activeReturn?.status === 'Requested' && !activeReturn?.non_returnable_note && (
                      <>
                        <button
                          onClick={() => handleInspectReturnConfirm('quarantine')}
                          style={{
                            height: '40px',
                            padding: '0 14px',
                            borderRadius: '10px',
                            background: '#ffffff',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Quarantine / Dispose
                        </button>
                        <button
                          onClick={() => handleInspectReturnConfirm('restock')}
                          style={{
                            height: '40px',
                            padding: '0 18px',
                            borderRadius: '10px',
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Pass Quality &amp; Restock
                        </button>
                      </>
                    )}

                    {activeReturn?.status === 'Inspected' && (
                      <button
                        onClick={handleProcessRefundConfirm}
                        style={{
                          height: '40px',
                          padding: '0 20px',
                          borderRadius: '10px',
                          background: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '14px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Execute Refund ({formatINR(Number(activeReturn.total_refund_amount))})
                      </button>
                    )}

                    {activeReturn?.non_returnable_note && activeReturn.status !== 'Rejected' && (
                      <button
                        onClick={handleRejectReturnConfirm}
                        style={{
                          height: '40px',
                          padding: '0 16px',
                          borderRadius: '10px',
                          background: '#dc2626',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Reject Return
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 5: STOCK LOOKUP (READ-ONLY)
          ========================================== */}
          {currentTab === 'stock' && (
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
                <div style={{ padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Counter Stock Lookup
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
                      {filteredStockItems.length} Items
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                    Live read from pharmacy inventory ledger
                  </p>

                  {/* Big & Highlighted Stock Search Bar */}
                  <div style={{ position: 'relative', width: '100%' }}>
                    <Search
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '14px',
                        color: '#2563eb',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      id="pharmacy-stock-search-input"
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      onKeyDown={(e) => handleStockListKey(e, true)}
                      aria-controls="pharmacy-stock-listbox"
                      aria-activedescendant={activeStockItem ? `stock-row-${activeStockItem.id}` : undefined}
                      placeholder="Search medicine, generic or code..."
                      autoFocus
                      style={{
                        width: '100%',
                        height: '46px',
                        padding: '0 38px 0 42px',
                        border: '2px solid #2563eb',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                        fontWeight: 500,
                        color: '#111827',
                        background: '#ffffff',
                        boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.12), 0 1px 3px rgba(0, 0, 0, 0.05)',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.15s ease',
                      }}
                    />
                    {stockSearch && (
                      <button
                        onClick={() => setStockSearch('')}
                        title="Clear search"
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '13px',
                          background: '#f1f5f9',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#64748b',
                          padding: 0,
                        }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Stock Pills with HMS Design Bible Typography & Colors */}
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
                    {[
                      { k: 'all', l: 'All Items', count: stockItems.length, color: 'blue' },
                      { k: 'low', l: 'Low Stock', count: stockItems.filter((s) => s.in_stock > 0 && s.in_stock < s.reorder_level).length, color: 'amber' },
                      { k: 'out', l: 'Out of Stock', count: stockItems.filter((s) => s.in_stock === 0).length, color: 'red' },
                      { k: 'exp', l: 'Near Expiry', count: stockItems.filter((s) => s.status?.toLowerCase().includes('expir')).length, color: 'orange' },
                    ].map((p) => {
                      const isActive = stockPill === p.k;
                      let bg = '#ffffff';
                      let fg = '#4b5563';
                      let bd = '#e5e7eb';
                      let shadow = 'none';

                      if (isActive) {
                        if (p.color === 'blue') {
                          bg = '#2563eb';
                          fg = '#ffffff';
                          bd = '#2563eb';
                          shadow = '0 1px 3px rgba(37, 99, 235, 0.25)';
                        } else if (p.color === 'amber') {
                          bg = '#fffbeb';
                          fg = '#b45309';
                          bd = '#fde68a';
                          shadow = '0 1px 3px rgba(245, 158, 11, 0.15)';
                        } else if (p.color === 'red') {
                          bg = '#fef2f2';
                          fg = '#dc2626';
                          bd = '#fecaca';
                          shadow = '0 1px 3px rgba(220, 38, 38, 0.15)';
                        } else if (p.color === 'orange') {
                          bg = '#fff7ed';
                          fg = '#c2410c';
                          bd = '#fed7aa';
                          shadow = '0 1px 3px rgba(194, 65, 12, 0.15)';
                        }
                      }

                      return (
                        <button
                          key={p.k}
                          onClick={() => setStockPill(p.k)}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            borderRadius: '9999px',
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            fontSize: '13px',
                            fontWeight: 600,
                            letterSpacing: '-0.01em',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: bg,
                            color: fg,
                            border: `1px solid ${bd}`,
                            boxShadow: shadow,
                            outline: 'none',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            flexShrink: 0,
                          }}
                        >
                          <span>{p.l}</span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              opacity: isActive && p.color === 'blue' ? 0.9 : 0.85,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: isActive && p.color === 'blue' ? 'rgba(255,255,255,0.22)' : '#f1f5f9',
                              color: isActive && p.color === 'blue' ? '#ffffff' : '#64748b',
                            }}
                          >
                            {p.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Stock Items List — listbox: arrows / Home / End move the selection, which drives the right panel */}
                <div
                  id="pharmacy-stock-listbox"
                  role="listbox"
                  aria-label="Counter stock items"
                  tabIndex={-1}
                  onKeyDown={(e) => handleStockListKey(e)}
                  style={{
                    maxHeight: 'calc(100vh - 290px)',
                    overflowY: 'auto',
                    borderTop: '1px solid #f3f4f6',
                    display: 'flex',
                    flexDirection: 'column',
                    outline: 'none',
                  }}
                >
                  {filteredStockItems.length === 0 ? (
                    <div style={{ padding: '36px 16px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                      No formulary stock matches your search.
                    </div>
                  ) : (
                    filteredStockItems.map((s) => {
                      const isSel = activeStockItem?.id === s.id;
                      const isOutOfStock = s.in_stock === 0;
                      const isLowStock = !isOutOfStock && s.in_stock < s.reorder_level;
                      const showNameTip = stockNameTip === s.id;
                      const openNameTip = () => {
                        const el = document.getElementById(`stock-name-${s.id}`);
                        if (el && el.scrollWidth > el.clientWidth) setStockNameTip(s.id);
                      };

                      return (
                        <div
                          key={s.id}
                          id={`stock-row-${s.id}`}
                          role="option"
                          aria-selected={isSel}
                          aria-label={`${s.name}, ${s.in_stock} units total, ${s.counter_stock ?? 0} on counter, ${s.status}`}
                          aria-describedby={showNameTip ? `stock-name-tip-${s.id}` : undefined}
                          tabIndex={isSel ? 0 : -1}
                          onClick={() => setSelectedStockId(s.id)}
                          onFocus={() => { setSelectedStockId(s.id); openNameTip(); }}
                          onBlur={() => setStockNameTip(null)}
                          onMouseEnter={openNameTip}
                          onMouseLeave={() => setStockNameTip(null)}
                          style={{
                            position: 'relative',
                            padding: '12px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            borderLeft: isSel ? '3px solid #2563eb' : '3px solid transparent',
                            background: isSel ? '#eff6ff' : '#ffffff',
                            boxShadow: isSel ? 'inset 0 0 0 1px #bfdbfe' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            outline: 'none',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span
                              id={`stock-name-${s.id}`}
                              title={s.name}
                              style={{ flex: '1 1 auto', minWidth: 0, fontSize: '14px', fontWeight: 600, color: isSel ? '#1d4ed8' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {highlightMatch(s.name, stockSearch)}
                            </span>
                            <span
                              title="Total sellable: counter shelf + central store"
                              style={{ flexShrink: 0, whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 700, color: isOutOfStock ? '#dc2626' : isLowStock ? '#b45309' : '#111827' }}
                            >
                              {s.in_stock} <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>total</span>
                            </span>
                          </div>
                          {showNameTip && (
                            <div
                              id={`stock-name-tip-${s.id}`}
                              role="tooltip"
                              style={{
                                position: 'absolute',
                                top: '34px',
                                left: '12px',
                                right: '12px',
                                zIndex: 5,
                                background: '#111827',
                                color: '#ffffff',
                                fontSize: '12px',
                                fontWeight: 500,
                                lineHeight: 1.4,
                                padding: '6px 8px',
                                borderRadius: '6px',
                                boxShadow: '0 4px 12px rgba(17,24,39,0.18)',
                                pointerEvents: 'none',
                              }}
                            >
                              {s.name}
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
                            <span style={{ fontFamily: MONO_FONT, fontSize: '11px', color: '#475569', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {highlightMatch(s.code, stockSearch)}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b', flexShrink: 0, whiteSpace: 'nowrap' }}>
                              Counter {s.counter_stock ?? 0} · Reorder {s.reorder_level}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: s.is_narcotic ? '#111827' : '#eff6ff', color: s.is_narcotic ? '#ffffff' : '#1d4ed8' }}>
                              {s.is_narcotic ? 'Narcotic · CD' : `Sch. ${s.schedule || 'H'}`}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: isOutOfStock ? '#fef2f2' : isLowStock ? '#fffbeb' : '#f0fdf4',
                                color: isOutOfStock ? '#dc2626' : isLowStock ? '#b45309' : '#15803d',
                                border: `1px solid ${isOutOfStock ? '#fecaca' : isLowStock ? '#fde68a' : '#bbf7d0'}`,
                              }}
                            >
                              {s.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Panel */}
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
                {!activeStockItem || !stockView ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                    {stockLoading ? 'Loading stock…' : 'Select a medicine to see its counter and central-store stock.'}
                  </div>
                ) : (
                <>
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
                    <Search size={20} color="#2563eb" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 aria-live="polite" style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                          {highlightMatch(activeStockItem.name, stockSearch)}
                        </h3>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '6px', fontFamily: MONO_FONT }}>
                          {highlightMatch(activeStockItem.code, stockSearch)}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff', background: '#111827', padding: '2px 8px', borderRadius: '6px' }}>
                          {activeStockItem.is_narcotic ? 'Schedule X' : `Schedule ${activeStockItem.schedule || 'H'}`}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                        {activeStockItem.generic ? `${activeStockItem.generic} · ` : ''}Counter shelf and central store balances from the inventory ledger
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      title="Ask the central store to move stock to OPD Counter 2"
                      onClick={async () => {
                        try {
                          const res = await pharmacyInventoryService.createTransfer({
                            medicine_id: activeStockItem.id,
                            quantity: activeStockItem.reorder_level || 50,
                            destination: 'OPD Counter 2',
                            priority: stockView.counter === 0 ? 'STAT' : 'ROUTINE',
                            notes: `OPD counter replenishment for ${activeStockItem.name}`
                          });
                          showNotice(`Transfer request ${res.transfer_number || ''} sent to the central store for ${activeStockItem.name}.`);
                        } catch (err: any) {
                          showNotice(`Transfer request for ${activeStockItem.name} failed: ${err?.response?.data?.error || err?.response?.data?.detail || 'please retry'}.`);
                        }
                      }}
                      style={{
                        height: '40px',
                        padding: '0 14px',
                        borderRadius: '10px',
                        border: '1px solid #d1d5db',
                        background: '#ffffff',
                        color: '#374151',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Boxes size={15} />
                      Request Transfer to Counter
                    </button>
                    <button
                      title="Start a walk-in sale without a prescription"
                      onClick={() => {
                        setIsCreatingOtcSale(true);
                      }}
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
                      <Plus size={15} />
                      New OTC Sale
                    </button>
                  </div>
                </div>

                {/* Stock overview: counter shelf + central store = total sellable */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                    gap: '12px',
                    padding: '16px 24px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e5e7eb',
                    flexShrink: 0,
                  }}
                >
                  {[
                    {
                      label: 'On Counter Shelf',
                      value: `${stockView.counter} units`,
                      color: stockView.counter === 0 ? '#dc2626' : '#111827',
                      note: 'Ready to dispense here',
                    },
                    {
                      label: 'Central Store',
                      value: `${stockView.central} units`,
                      color: '#111827',
                      note: stockView.central > 0 ? 'Transfer to counter to sell' : 'Nothing to transfer',
                    },
                    {
                      label: 'Total Sellable',
                      value: `${stockView.total} units`,
                      color: stockView.total === 0 ? '#dc2626' : stockView.total < activeStockItem.reorder_level ? '#b45309' : '#16a34a',
                      note: 'Counter + central · excl. expired',
                    },
                    {
                      label: 'Reorder Threshold',
                      value: `${activeStockItem.reorder_level} units`,
                      color: '#111827',
                      note: 'Flags when total falls below',
                    },
                    {
                      label: 'Nearest Expiry',
                      value: stockView.nearestExpiry || '—',
                      color: '#111827',
                      note: activeStockItem.is_cold_chain ? 'Cold chain (2°C–8°C)' : 'Room temp (<25°C)',
                    },
                  ].map((box) => (
                    <div key={box.label} style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        {box.label}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: box.color, marginTop: '2px' }}>
                        {box.value}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                        {box.note}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Content Body: Batches by location & same-generic alternatives */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Batches by Location (FEFO order)
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 1.1fr) minmax(150px, 1.3fr) 100px 110px 100px 130px', background: '#f8fafc', padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', borderBottom: '1px solid #e5e7eb' }}>
                        <div>BATCH NUMBER</div>
                        <div>LOCATION</div>
                        <div>EXPIRY DATE</div>
                        <div style={{ textAlign: 'center' }}>BATCH QTY</div>
                        <div style={{ textAlign: 'right' }}>MRP / UNIT</div>
                        <div style={{ textAlign: 'right' }}>STATUS</div>
                      </div>

                      {stockView.batches.length > 0 ? (
                        stockView.batches.map((batch: any, bIdx: number) => {
                          const qty = batch.available_quantity ?? 0;
                          const status = batch.id === stockView.dispenseNextId
                            ? { label: 'Dispense next', fg: '#15803d', bg: '#f0fdf4', bd: '#bbf7d0' }
                            : qty === 0
                              ? { label: 'Depleted', fg: '#dc2626', bg: '#fef2f2', bd: '#fecaca' }
                              : batch.is_counter_stock
                                ? { label: 'On counter', fg: '#1d4ed8', bg: '#eff6ff', bd: '#bfdbfe' }
                                : { label: 'Central store', fg: '#64748b', bg: '#f1f5f9', bd: '#e2e8f0' };
                          return (
                            <div
                              key={batch.id || bIdx}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(130px, 1.1fr) minmax(150px, 1.3fr) 100px 110px 100px 130px',
                                padding: '12px 14px',
                                alignItems: 'center',
                                fontSize: '13px',
                                borderBottom: '1px solid #f1f5f9',
                              }}
                            >
                              <div style={{ fontFamily: MONO_FONT, fontWeight: 600, color: '#1e40af' }}>{batch.batch_number}</div>
                              <div style={{ color: '#475569', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={batch.storage_location}>
                                <span style={{ fontWeight: 600, color: batch.is_counter_stock ? '#1d4ed8' : '#475569' }}>
                                  {batch.is_counter_stock ? 'Counter' : 'Central'}
                                </span>
                                {batch.storage_location ? ` · ${batch.storage_location}` : ''}
                              </div>
                              <div style={{ color: '#475569' }}>{batch.expiry_date}</div>
                              <div style={{ textAlign: 'center', fontWeight: 700, color: qty === 0 ? '#dc2626' : '#111827' }}>{qty}</div>
                              <div style={{ textAlign: 'right', color: '#475569' }}>
                                ₹{Number(batch.mrp_price ?? activeStockItem.unit_price ?? 0).toFixed(2)}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: status.fg, background: status.bg, border: `1px solid ${status.bd}`, padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                  {status.label}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '16px 14px', fontSize: '13px', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                          No sellable batches — every batch is expired, quarantined or depleted.
                        </div>
                      )}

                      {/* Reconciliation line: batch quantities add up to the totals above */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '10px 14px', background: '#f8fafc', fontSize: '12px', color: '#475569' }}>
                        <span>
                          Counter <strong style={{ color: '#111827' }}>{stockView.counter}</strong> + Central store <strong style={{ color: '#111827' }}>{stockView.central}</strong> = Total sellable <strong style={{ color: '#111827' }}>{stockView.total}</strong> units
                        </span>
                        {stockView.batchTotal !== stockView.total && (
                          <span style={{ color: '#b45309', fontWeight: 600 }}>
                            Batch rows sum to {stockView.batchTotal} — ledger mismatch, refresh or report to inventory
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Same-generic alternatives (live rows from this stock list) */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Same-Generic Alternatives
                    </div>
                    {stockView.sameGeneric.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                        {stockView.sameGeneric.slice(0, 4).map((alt: any) => (
                          <button
                            key={alt.id}
                            onClick={() => setSelectedStockId(alt.id)}
                            disabled={!filteredStockItems.some((x) => x.id === alt.id)}
                            title={filteredStockItems.some((x) => x.id === alt.id) ? 'Show this medicine' : 'Hidden by the current search or filter'}
                            style={{ textAlign: 'left', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{alt.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontFamily: MONO_FONT }}>{alt.code}</div>
                            <div style={{ fontSize: '11px', fontWeight: 600, marginTop: '4px', color: (alt.counter_stock ?? 0) > 0 ? '#15803d' : '#b45309' }}>
                              Counter {alt.counter_stock ?? 0} · Total {alt.in_stock} units
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {activeStockItem.generic
                          ? `No other ${activeStockItem.generic} products in this stock list.`
                          : 'Generic name not recorded for this medicine.'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer note (actions live in the header only) */}
                <div
                  style={{
                    padding: '12px 24px',
                    background: '#ffffff',
                    borderTop: '1px solid #e5e7eb',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Quantities exclude expired and quarantined batches · balances update on checkout and GRN intake
                  </span>
                </div>
                </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ==========================================
          ALLERGY OVERRIDE MODAL
      ========================================== */}
      {allergyModalOpen && (
        <div className="hms-backdrop"
          onClick={() => setAllergyModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17,24,39,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '480px',
              maxWidth: '100%',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(17,24,39,0.18)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Override allergy warning</h3>
              <p style={{ fontSize: '13px', color: '#4b5563', marginTop: '4px' }}>
                Document justification for dispensing despite registered allergen conflict
              </p>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '10px', padding: '12px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                <TriangleAlert size={18} color="#dc2626" />
                <span style={{ fontSize: '13px', color: '#4b5563' }}>
                  Patient has documented reaction on file. Overriding requires clinical justification and pharmacist sign-off.
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                  Override reason <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  style={{ height: '40px', padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', background: '#fff' }}
                >
                  <option value="">Select reason</option>
                  <option value="Previously tolerated this drug without reaction">Previously tolerated this drug without reaction</option>
                  <option value="Intolerance on record, not true allergy">Intolerance on record, not true allergy</option>
                  <option value="Prescriber confirmed benefit outweighs risk">Prescriber confirmed benefit outweighs risk</option>
                  <option value="Other — see remarks">Other — see remarks</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                  Audit remarks <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  value={overrideRemarks}
                  onChange={(e) => setOverrideRemarks(e.target.value)}
                  rows={3}
                  placeholder="Who confirmed, when, and what monitoring was advised"
                  style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                />
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Logged to the audit trail with your ID, time and reason. The prescribing doctor is notified.
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setAllergyModalOpen(false)}
                style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: '#fff', color: '#111827', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAllergyOverrideConfirm}
                style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: '#dc2626', color: '#fff', border: '1px solid #dc2626', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Log override &amp; continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          PHASE 5: STATUTORY RECEIPT & CERTIFICATE MODAL
      ========================================== */}
      {receiptModalOpen && completedReceiptData && (
        <div className="hms-backdrop"
          onClick={() => setReceiptModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17,24,39,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '540px',
              maxWidth: '100%',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(17,24,39,0.2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            }}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 600 }}>NORTH HOSPITAL HMS · PHARMACY</div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                  {completedReceiptData.type === 'TAX_INVOICE_RECEIPT' && 'Official Tax Invoice & Cash Receipt'}
                  {completedReceiptData.type === 'RECEPTION_TOKEN_SLIP' && 'Central Reception Billing Token Slip'}
                  {completedReceiptData.type === 'TPA_DISPENSE_CERTIFICATE' && 'TPA Cashless Dispense Certificate'}
                  {completedReceiptData.type === 'B2B_CORPORATE_VOUCHER' && 'Empanelled Corporate Healthcare Voucher'}
                  {completedReceiptData.type === 'CREDIT_AUTHORIZATION_SLIP' && 'Hospital Credit Line Authorization Slip'}
                  {completedReceiptData.type === 'IPD_WARD_ISSUE_SLIP' && 'Inpatient Ward Medicine Issue & MAR Slip'}
                </h3>
              </div>
              <button
                onClick={() => setReceiptModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Receipt Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px dashed #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Patient UHID &amp; Name</div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{activeOrder?.patient_uhid} · {activeOrder?.patient_name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Doctor: {activeOrder?.doctor_name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Dispense Timestamp</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontFamily: MONO_FONT }}>
                    {completedReceiptData.timestamp || new Date().toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>Counter 2 · Main OPD</div>
                </div>
              </div>

              {/* Specific Content by Engine Type */}
              {completedReceiptData.type === 'TAX_INVOICE_RECEIPT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Invoice Number</span>
                    <span style={{ fontFamily: MONO_FONT, fontWeight: 600 }}>{completedReceiptData.invoice_number}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Tender Mode</span>
                    <span style={{ fontWeight: 600 }}>{completedReceiptData.tender_mode}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Amount Tendered</span>
                    <span style={{ fontWeight: 600 }}>{formatINR(completedReceiptData.amount_tendered || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 600, paddingTop: '6px', borderTop: '1px dashed #cbd5e1' }}>
                    <span>Change Returned to Patient</span>
                    <span>{formatINR(completedReceiptData.change_due || 0)}</span>
                  </div>
                </div>
              )}

              {completedReceiptData.type === 'RECEPTION_TOKEN_SLIP' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 600 }}>PRESENT THIS BARCODE AT RECEPTION CASHIER</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#78350f', fontFamily: MONO_FONT, letterSpacing: '0.1em' }}>
                    {completedReceiptData.token_slip_number}
                  </div>
                  <div style={{ fontSize: '13px', color: '#92400e' }}>
                    Payable Amount: <span style={{ fontWeight: 700, fontSize: '16px' }}>{formatINR(completedReceiptData.amount_due || 0)}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#b45309' }}>
                    Handover Policy: {completedReceiptData.handover_policy === 'PRE_PAID' ? 'Policy A (Pre-Paid Hold at Counter)' : 'Policy B (Post-Paid Handover)'}
                  </div>
                </div>
              )}

              {completedReceiptData.type === 'TPA_DISPENSE_CERTIFICATE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#1e40af' }}>TPA / Insurer</span>
                    <span style={{ fontWeight: 600, color: '#1e3a8a' }}>{completedReceiptData.tpa_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#1e40af' }}>Policy &amp; Pre-Auth</span>
                    <span style={{ fontFamily: MONO_FONT, fontWeight: 600 }}>{completedReceiptData.policy_number} / {completedReceiptData.preauth_code}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#1e40af' }}>Admissible Cashless Claim</span>
                    <span style={{ fontWeight: 700, color: '#1e40af' }}>{formatINR(completedReceiptData.admissible_claim || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 600, paddingTop: '6px', borderTop: '1px dashed #93c5fd' }}>
                    <span>Patient Co-Pay Collected</span>
                    <span>{formatINR(completedReceiptData.patient_copay || 0)}</span>
                  </div>
                </div>
              )}

              {completedReceiptData.type === 'B2B_CORPORATE_VOUCHER' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#166534' }}>Empanelled Corporate</span>
                    <span style={{ fontWeight: 600, color: '#14532d' }}>{completedReceiptData.corporate_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#166534' }}>Employee Badge ID</span>
                    <span style={{ fontFamily: MONO_FONT, fontWeight: 600 }}>{completedReceiptData.employee_badge_id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#166534' }}>Schedule Tariff Discount</span>
                    <span style={{ fontWeight: 600, color: '#15803d' }}>- {formatINR(completedReceiptData.discount_amount || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#14532d', paddingTop: '6px', borderTop: '1px dashed #86efac' }}>
                    <span>Net Billed to Corporate</span>
                    <span>{formatINR(completedReceiptData.net_amount || 0)}</span>
                  </div>
                </div>
              )}

              {completedReceiptData.type === 'CREDIT_AUTHORIZATION_SLIP' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#faf5ff', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b21a8' }}>Credit Line Account</span>
                    <span style={{ fontWeight: 600, color: '#581c87' }}>{completedReceiptData.account_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b21a8' }}>Authorizer</span>
                    <span style={{ fontWeight: 600 }}>{completedReceiptData.authorizer_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b21a8' }}>Justification</span>
                    <span style={{ fontSize: '12px', color: '#4c1d95' }}>{completedReceiptData.justification_note}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#581c87', paddingTop: '6px', borderTop: '1px dashed #d8b4fe' }}>
                    <span>Authorized Charge</span>
                    <span>{formatINR(completedReceiptData.amount || 0)}</span>
                  </div>
                </div>
              )}

              {completedReceiptData.type === 'IPD_WARD_ISSUE_SLIP' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#0369a1' }}>Inpatient Ward &amp; Bed</span>
                    <span style={{ fontWeight: 600, color: '#0c4a6e' }}>{completedReceiptData.ward_and_bed}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#0369a1' }}>Added to Running Bill</span>
                    <span style={{ fontWeight: 700, color: '#0c4a6e' }}>{formatINR(completedReceiptData.amount_added_to_folio || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 600, paddingTop: '6px', borderTop: '1px dashed #7dd3fc' }}>
                    <span>MAR State</span>
                    <span>{completedReceiptData.mar_status}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '11px', color: '#64748b' }}>
                <span>North Hospital Central Dispensary</span>
                <span>Pharmacist: Arjun Varma (Reg #DL-8812)</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc' }}>
              <button
                onClick={() => window.print()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                <Printer size={15} />
                Print Document
              </button>
              <button
                onClick={() => setReceiptModalOpen(false)}
                style={{
                  height: '40px',
                  padding: '0 20px',
                  borderRadius: '10px',
                  background: '#2563eb',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          PHASE 5: SHIFT DRAWER RECONCILIATION MODAL
      ========================================== */}
      {shiftDrawerModalOpen && (
        <div className="hms-backdrop"
          onClick={() => setShiftDrawerModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17,24,39,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '500px',
              maxWidth: '100%',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(17,24,39,0.2)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>POS Drawer &amp; Shift Reconciliation</h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {shiftSummary?.counter_name || 'Counter 2 · Main OPD'} · {shiftSummary?.shift_type || 'Morning (07:00 - 15:00)'}
                </div>
              </div>
              <button
                onClick={() => setShiftDrawerModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Opening Float Cash</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                    {formatINR(shiftSummary?.opening_float || 2000)}
                  </div>
                </div>
                <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', color: '#166534' }}>Net Cash in Drawer</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                    {formatINR(shiftSummary?.net_drawer_cash || 2000)}
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Cash Collected Today</span>
                  <span style={{ fontWeight: 600 }}>{formatINR(shiftSummary?.cash_collected || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Card POS Collected</span>
                  <span style={{ fontWeight: 600 }}>{formatINR(shiftSummary?.card_collected || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>UPI QR Collected</span>
                  <span style={{ fontWeight: 600 }}>{formatINR(shiftSummary?.upi_collected || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>Customer Return Refunds Paid</span>
                  <span>- {formatINR(shiftSummary?.refunds_paid || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                  <span>Total Shift Revenue</span>
                  <span>{formatINR(shiftSummary?.total_revenue || 0)}</span>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Active Pharmacist: {shiftSummary?.pharmacist_name || 'Arjun Varma'}. Reconciling closes the drawer float and records end-of-shift cash handoff.
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' }}>
              <button
                onClick={() => setShiftDrawerModalOpen(false)}
                style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: '#fff', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={async () => {
                  try {
                    await pharmacyOpdService.closeShiftDrawer();
                    showNotice('Shift drawer closed and reconciled for Counter 2');
                    setShiftDrawerModalOpen(false);
                    loadBillingMetadata();
                  } catch (e: any) {
                    showNotice(e.response?.data?.error || 'Failed to close shift drawer', 'error');
                  }
                }}
                style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: '#dc2626', border: 'none', fontSize: '14px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}
              >
                Reconcile &amp; End Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default OPDPharmacistWorkspace;

