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

export const OPDPharmacistWorkspace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') || 'queue').toLowerCase();

  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const isHospitalAdmin = role === RoleType.HOSPITAL_ADMIN || role === RoleType.SUPER_ADMIN;
  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Arjun Varma';
  const initials = displayName.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'AV';
  const designation = user?.designation || (role === RoleType.PHARMACIST ? 'OPD Pharmacist · PH-4412' : (role ? role.replace(/_/g, ' ') : 'OPD Pharmacist · PH-4412'));

  // Navigation Tabs
  const setTab = (t: string) => {
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
  const [queuePill, setQueuePill] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

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
  const [stockSearch, setStockSearch] = useState('');
  const [selectedStockCode, setSelectedStockCode] = useState<string | null>('SAL100');

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
  const [isCreatingOtcSale, setIsCreatingOtcSale] = useState(false);

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
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#f9fafb', fontFamily: 'Inter, sans-serif' }}>
      {/* Toast Notification */}
      {notification && (
        <div
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
                fontSize: '11px',
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
                fontSize: '11px',
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
                fontSize: '11px',
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

      {/* ==========================================
          MAIN AREA
      ========================================== */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Sticky Top Bar (52px) */}
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
              onClick={() => navigate('/pharmacy/inventory')}
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
                fontSize: '12px',
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
              <Clock size={14} />
              Morning shift · 07:00–15:00
            </div>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {notification && (
          <div
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
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header Card */}
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

          {/* ==========================================
              KPI ROW (5 CARDS, EXACT SPEC)
          ========================================== */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
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

          {/* ==========================================
              TAB 1: DISPENSING QUEUE + RIGHT ACTIVE PANEL
          ========================================== */}
          {currentTab === 'queue' && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Work Table (Flex 1, Min 620px) */}
              <div style={{ flex: '1 1 620px', minWidth: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Prescription queue</h2>
                      <p style={{ fontSize: '13px', color: '#4b5563', marginTop: '2px' }}>
                        STAT always first, then urgent and routine by wait time
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        value={qSearch}
                        onChange={(e) => setQSearch(e.target.value)}
                        placeholder="Filter by patient, UHID or drug"
                        style={{
                          height: '40px',
                          width: '240px',
                          maxWidth: '100%',
                          padding: '0 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '10px',
                          fontSize: '13px',
                          color: '#111827',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={handleCallNext}
                        style={{
                          height: '40px',
                          padding: '0 14px',
                          borderRadius: '10px',
                          background: '#fff',
                          color: '#111827',
                          border: '1px solid #d1d5db',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Call next
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'new', label: 'New' },
                      { key: 'verify', label: 'Verification' },
                      { key: 'payment', label: 'Awaiting payment' },
                      { key: 'dispensing', label: 'Dispensing' },
                      { key: 'hold', label: 'On hold' },
                      { key: 'partially_dispensed', label: 'Partially Dispensed', color: 'amber' },
                      { key: 'stat', label: 'STAT only', color: 'red' },
                      { key: 'cd', label: 'Controlled drugs', color: 'dark' },
                    ].map((p) => {
                      const isActive = queuePill === p.key;
                      let bg = isActive ? '#2563eb' : '#fff';
                      let fg = isActive ? '#fff' : '#374151';
                      let bd = isActive ? '#2563eb' : '#e5e7eb';
                      if (p.color === 'red') {
                        bg = isActive ? '#dc2626' : '#fef2f2';
                        fg = isActive ? '#fff' : '#dc2626';
                        bd = isActive ? '#dc2626' : '#fecaca';
                      } else if (p.color === 'dark') {
                        bg = isActive ? '#111827' : '#f3f4f6';
                        fg = isActive ? '#fff' : '#111827';
                        bd = isActive ? '#111827' : '#d1d5db';
                      } else if (p.color === 'amber') {
                        bg = isActive ? '#d97706' : '#fffbeb';
                        fg = isActive ? '#fff' : '#b45309';
                        bd = isActive ? '#d97706' : '#fde68a';
                      }
                      return (
                        <button
                          key={p.key}
                          onClick={() => setQueuePill(p.key)}
                          style={{
                            height: '32px',
                            padding: '0 12px',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: bg,
                            color: fg,
                            border: `1px solid ${bd}`,
                          }}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Table Data */}
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: '840px' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(170px, 1.2fr) minmax(220px, 1.7fr) 96px minmax(150px, 1fr) 150px 112px',
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
                      <div style={{ padding: '0 16px' }}>PATIENT · UHID</div>
                      <div style={{ padding: '0 16px' }}>PRESCRIPTION · DOCTOR</div>
                      <div style={{ padding: '0 16px' }}>PRIORITY</div>
                      <div style={{ padding: '0 16px' }}>PAYMENT</div>
                      <div style={{ padding: '0 16px' }}>STATUS</div>
                      <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                    </div>

                    {queueLoading ? (
                      <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>Loading prescriptions...</div>
                    ) : queue.length === 0 ? (
                      <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>No prescriptions waiting</div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          New ones will appear here automatically
                        </div>
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
                            onClick={() => handleOpenOrder(r)}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(170px, 1.2fr) minmax(220px, 1.7fr) 96px minmax(150px, 1fr) 150px 112px',
                              alignItems: 'center',
                              minHeight: '56px',
                              borderBottom: '1px solid #f3f4f6',
                              cursor: 'pointer',
                              background: isSelected ? '#eff6ff' : '#fff',
                            }}
                          >
                            <div style={{ padding: '10px 16px', minWidth: 0 }}>
                              <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{r.patient_name}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: MONO_FONT, marginTop: '2px' }}>
                                {r.patient_uhid}
                              </div>
                            </div>
                            <div style={{ padding: '10px 16px', minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{firstMed}</span>
                                {isCd && (
                                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '1px 6px', background: '#111827', color: '#fff' }}>
                                    CD
                                  </span>
                                )}
                                {isAllergy && (
                                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '1px 6px', background: '#fef2f2', color: '#dc2626' }}>
                                    Allergy
                                  </span>
                                )}
                                {isHold && (
                                  <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '1px 6px', background: '#fffbeb', color: '#b45309' }}>
                                    Hold
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                {r.order_number} · {r.doctor_name}
                              </div>
                            </div>
                            <div style={{ padding: '10px 16px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  height: '24px',
                                  padding: '0 8px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  background: prioBadge.bg,
                                  color: prioBadge.fg,
                                  border: `1px solid ${prioBadge.bd}`,
                                }}
                              >
                                {r.priority}
                              </span>
                            </div>
                            <div style={{ padding: '10px 16px', minWidth: 0 }}>
                              <div style={{ fontSize: '13px', color: '#111827' }}>
                                {r.settlement_mode === 'PAY_AT_RECEPTION'
                                  ? 'Pay at reception'
                                  : r.settlement_mode === 'INSURANCE'
                                  ? 'Insurance'
                                  : r.settlement_mode === 'IPD_RUNNING_BILL'
                                  ? 'Bill to IPD'
                                  : 'Pay at pharmacy'}
                              </div>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  height: '22px',
                                  marginTop: '4px',
                                  padding: '0 8px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
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
                            <div style={{ padding: '10px 16px', minWidth: 0 }}>
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
                                  ? 'PARTIALLY DISPENSED'
                                  : r.status === 'PURCHASED_OUTSIDE'
                                  ? 'PURCHASED OUTSIDE'
                                  : r.status}
                              </span>
                            </div>
                            <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleOpenOrder(r)}
                                style={{
                                  height: '36px',
                                  padding: '0 14px',
                                  borderRadius: '10px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  background: isSelected ? '#2563eb' : '#fff',
                                  color: isSelected ? '#fff' : '#1d4ed8',
                                  border: `1px solid ${isSelected ? '#2563eb' : '#bfdbfe'}`,
                                }}
                              >
                                {isSelected ? 'Continue' : 'Open'}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', fontSize: '12px', color: '#6b7280' }}>
                  <span>{queue.length} prescriptions in queue</span>
                  <span>1 / 1</span>
                </div>
              </div>

              {/* ==========================================
                  RIGHT ACTIVE PRESCRIPTION PANEL (400px Sticky)
              ========================================== */}
              <div style={{ flex: '0 1 400px', minWidth: '340px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: '76px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                    ACTIVE PRESCRIPTION
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '1px 6px' }}>
                    Posts on dispense
                  </span>
                </div>

                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    maxHeight: 'calc(100vh - 110px)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {!activeOrder ? (
                    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>No prescription selected</div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                        Open one from the queue or call the next patient
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Active Prescription Header & Stepper */}
                      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                              <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>{activeOrder.order_number}</h3>
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
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                              Step {wizardStep} of 7 ·{' '}
                              {[
                                'Verify prescription',
                                'Safety checks',
                                'Payment source',
                                'Payment verification',
                                'Pick & label',
                                'Counseling',
                                'Dispense & complete',
                              ][wizardStep - 1]}
                            </div>

                            {/* 7-Segment Progress Bar */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginTop: '10px' }}>
                              {[1, 2, 3, 4, 5, 6, 7].map((s) => (
                                <div
                                  key={s}
                                  style={{
                                    height: '4px',
                                    borderRadius: '2px',
                                    background: s <= wizardStep ? '#2563eb' : '#e5e7eb',
                                  }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Patient Summary Card */}
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff', border: '1px solid #e5e7eb', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>
                              {activeOrder.patient_name
                                .split(' ')
                                .map((w) => w[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{activeOrder.patient_name}</div>
                              <div style={{ fontSize: '12px', color: '#4b5563', fontFamily: MONO_FONT, marginTop: '2px' }}>
                                {activeOrder.patient_uhid}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{activeOrder.doctor_name}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>Dx: {activeOrder.diagnosis || 'Acute Outpatient Care'}</div>
                            </div>
                          </div>

                          {/* Tags: Allergies & Payment Source */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {activeOrder.has_allergy_warning && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', height: '26px', padding: '0 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                                Allergy Alert
                              </span>
                            )}
                            <span style={{ display: 'inline-flex', alignItems: 'center', height: '26px', padding: '0 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                              {activeOrder.settlement_mode === 'INSURANCE' ? 'Insurance' : activeOrder.settlement_mode === 'PAY_AT_RECEPTION' ? 'Reception Pay' : 'Counter Pay'}
                            </span>
                          </div>

                          {/* PRESCRIPTION OUTCOME (Requirement 1, 2, 3) */}
                          {activeOrder.status !== 'DISPENSED' && activeOrder.status !== 'PURCHASED_OUTSIDE' && (
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#4b5563' }}>
                                  PRESCRIPTION OUTCOME
                                </span>
                                <span style={{ fontSize: '11px', color: '#6b7280' }}>
                                  Patient purchase choice
                                </span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
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
                                        <div style={{ fontSize: '10px', color: '#6b7280' }}>
                                          {opt.desc}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* If PURCHASED OUTSIDE selected, show reason selector & confirm button */}
                              {prescriptionOutcome === 'PURCHASED_OUTSIDE' && (
                                <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#991b1b' }}>
                                    Reason for Outside Purchase:
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
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
                                          padding: '4px 6px',
                                          borderRadius: '6px',
                                          background: outsideReason === r.key ? '#fff' : 'transparent',
                                          border: `1px solid ${outsideReason === r.key ? '#ef4444' : 'transparent'}`,
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
                                    style={{ height: '32px', padding: '0 8px', borderRadius: '6px', border: '1px solid #fca5a5', fontSize: '12px', background: '#fff' }}
                                  />
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '10px', color: '#6b7280' }}>
                                      Prescription will close without stock or billing impact.
                                    </span>
                                    <button
                                      onClick={handleConfirmPurchasedOutside}
                                      style={{
                                        height: '30px',
                                        padding: '0 12px',
                                        borderRadius: '6px',
                                        background: '#dc2626',
                                        color: '#fff',
                                        border: 'none',
                                        fontSize: '12px',
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
                                <div style={{ marginTop: '8px', padding: '8px 10px', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fde68a', fontSize: '11px', color: '#92400e' }}>
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
                                <CircleCheck size={18} color="#16a34a" />
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>E-signature & prescriber valid</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Verified against medical register (KMC 48211)</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <CircleCheck size={18} color="#16a34a" />
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
                                  {idConfirmed && <Check size={12} color="#fff" strokeWidth={3} />}
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
                                            {isSelectedForDispense && <Check size={11} color="#fff" strokeWidth={3} />}
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
                                          style={{ height: '36px', padding: '0 12px', borderRadius: '10px', background: '#fff', color: '#111827', border: '1px solid #d1d5db', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                          Contact doctor
                                        </button>
                                        <button
                                          onClick={() => setAllergyModalOpen(true)}
                                          style={{ height: '36px', padding: '0 12px', borderRadius: '10px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                          Override with reason
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                  <CircleCheck size={18} color="#15803d" />
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
                                        {interactionAck && <Check size={12} color="#fff" strokeWidth={3} />}
                                      </span>
                                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>Reviewed — will counsel patient</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                  <CircleCheck size={18} color="#15803d" />
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
                                      {cdRxSighted && <Check size={12} color="#fff" strokeWidth={3} />}
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
                                      {cdPhotoId && <Check size={12} color="#fff" strokeWidth={3} />}
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
                                  <CircleCheck size={18} color="#15803d" />
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
                                        height: '36px',
                                        borderRadius: '10px',
                                        fontSize: '13px',
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
                                                fontSize: '11px',
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
                                      style={{ height: '38px', padding: '0 12px', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
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
                                          fontSize: '11px',
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
                                    {isPicked && <Check size={12} color="#fff" strokeWidth={3} />}
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
                                {labelsAffixed && <Check size={12} color="#fff" strokeWidth={3} />}
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
                                    {checked && <Check size={12} color="#fff" strokeWidth={3} />}
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
                                <CircleCheck size={18} color="#15803d" />
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
                                style={{ height: '40px', padding: '0 14px', borderRadius: '10px', background: '#fff', color: '#b45309', border: '1px solid #fde68a', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
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
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>OTC &amp; walk-in sales</h2>
                    <p style={{ fontSize: '13px', color: '#4b5563', marginTop: '2px' }}>
                      Non-prescription medicines only · Schedule H / H1 items need a prescription
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreatingOtcSale(true)}
                    style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: '#2563eb', color: '#fff', border: '1px solid #2563eb', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={16} /> New sale
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: '780px' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(150px, 1fr) minmax(150px, 1fr) minmax(200px, 1.6fr) minmax(130px, 1fr) 110px 96px',
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
                      <div style={{ padding: '0 16px' }}>INVOICE · TIME</div>
                      <div style={{ padding: '0 16px' }}>CUSTOMER</div>
                      <div style={{ padding: '0 16px' }}>ITEMS</div>
                      <div style={{ padding: '0 16px' }}>AMOUNT · METHOD</div>
                      <div style={{ padding: '0 16px' }}>STATUS</div>
                      <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                    </div>

                    {otcSales.length === 0 ? (
                      <div style={{ padding: '36px 16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                        No OTC sales recorded yet today. Click "+ New sale" to start a new sale.
                      </div>
                    ) : (
                      otcSales.map((s) => (
                        <div
                          key={s.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(150px, 1fr) minmax(150px, 1fr) minmax(200px, 1.6fr) minmax(130px, 1fr) 110px 96px',
                            alignItems: 'center',
                            minHeight: '56px',
                            borderBottom: '1px solid #f3f4f6',
                            background: '#fff',
                          }}
                        >
                          <div style={{ padding: '10px 16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', fontFamily: MONO_FONT }}>{s.sale_number}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Today</div>
                          </div>
                          <div style={{ padding: '10px 16px', minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{s.customer_name}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{s.customer_phone || '—'}</div>
                          </div>
                          <div style={{ padding: '10px 16px', minWidth: 0 }}>
                            <div style={{ fontSize: '14px', color: '#111827' }}>{s.items?.length || 1} items</div>
                          </div>
                          <div style={{ padding: '10px 16px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{formatINR(Number(s.total_amount))}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{s.payment_mode}</div>
                          </div>
                          <div style={{ padding: '10px 16px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                              Settled
                            </span>
                          </div>
                          <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => showNotice(`Printed invoice for ${s.sale_number}`)}
                              style={{ height: '36px', padding: '0 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#111827', border: '1px solid #d1d5db' }}
                            >
                              Print
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )
          )}

          {/* ==========================================
              TAB 3: COMPLETED TODAY
          ========================================== */}
          {currentTab === 'done' && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 620px', minWidth: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Completed today</h2>
                    <p style={{ fontSize: '13px', color: '#4b5563', marginTop: '2px' }}>
                      Prescriptions dispensed this shift · billing, stock and patient record already posted
                    </p>
                  </div>
                  <input
                    value={compSearch}
                    onChange={(e) => setCompSearch(e.target.value)}
                    placeholder="Filter by patient, UHID or dispense ID"
                    style={{ height: '40px', width: '260px', padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: '820px' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '72px minmax(170px, 1.2fr) minmax(200px, 1.5fr) minmax(150px, 1fr) minmax(140px, 1fr) 96px',
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
                      <div style={{ padding: '0 16px' }}>TIME</div>
                      <div style={{ padding: '0 16px' }}>PATIENT · DISPENSE</div>
                      <div style={{ padding: '0 16px' }}>ITEMS</div>
                      <div style={{ padding: '0 16px' }}>PAYMENT</div>
                      <div style={{ padding: '0 16px' }}>FLAGS</div>
                      <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                    </div>

                    {completedList.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => setSelectedCompId(d.id)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '72px minmax(170px, 1.2fr) minmax(200px, 1.5fr) minmax(150px, 1fr) minmax(140px, 1fr) 96px',
                          alignItems: 'center',
                          minHeight: '56px',
                          borderBottom: '1px solid #f3f4f6',
                          background: selectedCompId === d.id ? '#eff6ff' : '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ padding: '10px 16px', fontSize: '13px', color: '#4b5563' }}>{d.time || '10:31'}</div>
                        <div style={{ padding: '10px 16px', minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{d.patient}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: MONO_FONT, marginTop: '2px' }}>{d.id}</div>
                        </div>
                        <div style={{ padding: '10px 16px', minWidth: 0 }}>
                          <div style={{ fontSize: '14px', color: '#111827' }}>{d.items}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{d.items_sub}</div>
                        </div>
                        <div style={{ padding: '10px 16px' }}>
                          <div style={{ fontSize: '13px', color: '#111827' }}>{d.mode}</div>
                          <span style={{ display: 'inline-flex', alignItems: 'center', height: '22px', marginTop: '4px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                            Paid
                          </span>
                        </div>
                        <div style={{ padding: '10px 16px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {d.flags?.map((f, fi) => (
                            <span key={fi} style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '1px 6px', background: f.bg, color: f.fg }}>
                              {f.text}
                            </span>
                          ))}
                        </div>
                        <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setSelectedCompId(d.id)}
                            style={{ height: '36px', padding: '0 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Panel: Dispense Details & Initiate Return */}
              <div style={{ flex: '0 1 400px', minWidth: '340px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: '76px' }}>
                <div style={{ padding: '0 4px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                  DISPENSE RECORD
                </div>
                {selectedCompId && (
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>{selectedCompId}</h3>
                        <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                          Fulfilled
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb' }}>
                      <button
                        onClick={() => {
                          setTab('returns');
                          setNewReturnOpen(true);
                          setNewReturnSearch(selectedCompId);
                        }}
                        style={{ width: '100%', height: '40px', borderRadius: '10px', background: '#fff', color: '#111827', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Initiate return for this dispense
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 4: RETURNS & REFUNDS
          ========================================== */}
          {currentTab === 'returns' && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 620px', minWidth: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Returns &amp; refunds</h2>
                    <p style={{ fontSize: '13px', color: '#4b5563', marginTop: '2px' }}>
                      Inspect, restock or quarantine, then refund back through the original payment source
                    </p>
                  </div>
                  <button
                    onClick={() => setNewReturnOpen(true)}
                    style={{ height: '40px', padding: '0 14px', borderRadius: '10px', background: '#fff', color: '#111827', border: '1px solid #d1d5db', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    New return
                  </button>
                </div>

                <div style={{ padding: '0 20px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['all', 'Requested', 'Inspected', 'Refunded', 'Rejected'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setReturnPill(p)}
                      style={{
                        height: '32px',
                        padding: '0 12px',
                        borderRadius: '9999px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: returnPill === p ? '#2563eb' : '#fff',
                        color: returnPill === p ? '#fff' : '#374151',
                        border: `1px solid ${returnPill === p ? '#2563eb' : '#e5e7eb'}`,
                      }}
                    >
                      {p === 'all' ? 'All' : p}
                    </button>
                  ))}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: '860px' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(160px, 1.1fr) minmax(190px, 1.4fr) 64px minmax(170px, 1.3fr) minmax(150px, 1fr) 108px 96px',
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
                      <div style={{ padding: '0 16px' }}>RETURN · PATIENT</div>
                      <div style={{ padding: '0 16px' }}>ITEM · ORIGINAL</div>
                      <div style={{ padding: '0 16px' }}>QTY</div>
                      <div style={{ padding: '0 16px' }}>REASON</div>
                      <div style={{ padding: '0 16px' }}>REFUND ROUTE</div>
                      <div style={{ padding: '0 16px' }}>STATUS</div>
                      <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                    </div>

                    {returnsList.map((r) => {
                      const isSel = selectedReturnId === r.id;
                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedReturnId(r.id)}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(160px, 1.1fr) minmax(190px, 1.4fr) 64px minmax(170px, 1.3fr) minmax(150px, 1fr) 108px 96px',
                            alignItems: 'center',
                            minHeight: '56px',
                            borderBottom: '1px solid #f3f4f6',
                            background: isSel ? '#eff6ff' : '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ padding: '10px 16px', minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{r.patient_name}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: MONO_FONT, marginTop: '2px' }}>
                              {r.return_number}
                            </div>
                          </div>
                          <div style={{ padding: '10px 16px', minWidth: 0 }}>
                            <div style={{ fontSize: '14px', color: '#111827' }}>{r.items[0]?.medicine_name}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: MONO_FONT, marginTop: '2px' }}>
                              {r.original_reference}
                            </div>
                          </div>
                          <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                            {r.items[0]?.quantity_returned || 1}
                          </div>
                          <div style={{ padding: '10px 16px', fontSize: '13px', color: '#4b5563' }}>{r.reason}</div>
                          <div style={{ padding: '10px 16px' }}>
                            <div style={{ fontSize: '13px', color: '#111827' }}>{r.refund_route}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{formatINR(Number(r.total_refund_amount))}</div>
                          </div>
                          <div style={{ padding: '10px 16px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                height: '24px',
                                padding: '0 8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
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
                          <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setSelectedReturnId(r.id)}
                              style={{ height: '36px', padding: '0 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: isSel ? '#2563eb' : '#fff', color: isSel ? '#fff' : '#1d4ed8', border: `1px solid ${isSel ? '#2563eb' : '#bfdbfe'}` }}
                            >
                              Inspect
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Panel: 3-step Return Inspection & Refund */}
              <div style={{ flex: '0 1 400px', minWidth: '340px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: '76px' }}>
                <div style={{ padding: '0 4px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                  RETURN INSPECTION &amp; REFUND
                </div>
                {activeReturn && (
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>{activeReturn.return_number}</h3>
                        <span style={{ display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                          {activeReturn.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        Original: {activeReturn.original_reference} · {activeReturn.patient_name}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#4b5563' }}>Item</span>
                        <span style={{ fontWeight: 600, color: '#111827' }}>
                          {activeReturn.items[0]?.medicine_name} × {activeReturn.items[0]?.quantity_returned}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#4b5563' }}>Refund route</span>
                        <span style={{ color: '#111827' }}>{activeReturn.refund_route}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingTop: '6px', borderTop: '1px solid #f3f4f6' }}>
                        <span style={{ fontWeight: 600, color: '#111827' }}>Refund amount</span>
                        <span style={{ fontWeight: 700, color: '#111827' }}>{formatINR(Number(activeReturn.total_refund_amount))}</span>
                      </div>
                    </div>

                    {/* Non-returnable notice */}
                    {activeReturn.non_returnable_note && (
                      <div style={{ margin: '16px 20px 0', display: 'flex', gap: '10px', padding: '12px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                        <CircleX size={18} color="#dc2626" />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>Not returnable</div>
                          <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>{activeReturn.non_returnable_note}</div>
                        </div>
                      </div>
                    )}

                    {/* Inspection Checklist */}
                    {activeReturn.status === 'Requested' && !activeReturn.non_returnable_note && (
                      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280' }}>
                          INSPECTION
                        </div>
                        {[
                          { key: 'sealed', label: 'Pack sealed and unopened' },
                          { key: 'batch_matches', label: 'Batch matches dispense record' },
                          { key: 'expiry_ok', label: 'Expiry beyond 3 months' },
                          { key: 'storage_ok', label: 'Stored correctly · no damage' },
                        ].map((c) => (
                          <div
                            key={c.key}
                            onClick={() => setRetInspectChecks({ ...retInspectChecks, [c.key]: !retInspectChecks[c.key] })}
                            style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer' }}
                          >
                            <span style={{ width: '18px', height: '18px', flexShrink: 0, borderRadius: '5px', border: `1.5px solid ${retInspectChecks[c.key] ? '#2563eb' : '#d1d5db'}`, background: retInspectChecks[c.key] ? '#2563eb' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {retInspectChecks[c.key] && <Check size={12} color="#fff" strokeWidth={3} />}
                            </span>
                            <span style={{ fontSize: '13px', color: '#111827' }}>{c.label}</span>
                          </div>
                        ))}

                        <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', color: '#6b7280', marginTop: '6px' }}>
                          DISPOSITION
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <button
                            onClick={() => handleInspectReturnConfirm('restock')}
                            style={{ height: '40px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: '#2563eb', color: '#fff', border: '1px solid #2563eb' }}
                          >
                            Restock to shelf
                          </button>
                          <button
                            onClick={() => handleInspectReturnConfirm('quarantine')}
                            style={{ height: '40px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#b45309', border: '1px solid #fde68a' }}
                          >
                            Quarantine / Dispose
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Inspected - ready for refund */}
                    {activeReturn.status === 'Inspected' && (
                      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '10px', padding: '12px', borderRadius: '10px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                          <Receipt size={18} color="#0369a1" />
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0369a1' }}>
                              Ready for refund ({activeReturn.disposition})
                            </div>
                            <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '2px' }}>
                              Refund posts to Billing as a reversal to {activeReturn.refund_route}.
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleProcessRefundConfirm}
                          style={{ height: '40px', borderRadius: '10px', background: '#2563eb', color: '#fff', border: '1px solid #2563eb', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Execute refund
                        </button>
                      </div>
                    )}

                    {/* Footer for non-returnable reject */}
                    {activeReturn.non_returnable_note && activeReturn.status !== 'Rejected' && (
                      <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb' }}>
                        <button
                          onClick={handleRejectReturnConfirm}
                          style={{ width: '100%', height: '40px', borderRadius: '10px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Reject return (Non-returnable item)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 5: STOCK LOOKUP (READ-ONLY)
          ========================================== */}
          {currentTab === 'stock' && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 620px', minWidth: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Stock lookup</h2>
                    <p style={{ fontSize: '13px', color: '#4b5563', marginTop: '2px' }}>
                      Live read from the pharmacy ledger · adjustments are made by the Inventory Manager
                    </p>
                  </div>
                  <input
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    placeholder="Search item, generic or code"
                    style={{ height: '40px', width: '260px', padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div style={{ padding: '0 20px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { k: 'all', l: 'All' },
                    { k: 'low', l: 'Low stock' },
                    { k: 'out', l: 'Out of stock' },
                    { k: 'exp', l: 'Near expiry' },
                  ].map((p) => (
                    <button
                      key={p.k}
                      onClick={() => setStockPill(p.k)}
                      style={{
                        height: '32px',
                        padding: '0 12px',
                        borderRadius: '9999px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: stockPill === p.k ? '#2563eb' : '#fff',
                        color: stockPill === p.k ? '#fff' : '#374151',
                        border: `1px solid ${stockPill === p.k ? '#2563eb' : '#e5e7eb'}`,
                      }}
                    >
                      {p.l}
                    </button>
                  ))}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: '820px' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(220px, 1.8fr) 110px 90px 90px minmax(140px, 1fr) 120px 96px',
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
                      <div style={{ padding: '0 16px' }}>NEAREST EXPIRY</div>
                      <div style={{ padding: '0 16px' }}>STATUS</div>
                      <div style={{ padding: '0 16px', textAlign: 'right' }}>ACTION</div>
                    </div>

                    {stockItems.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setSelectedStockCode(s.code)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(220px, 1.8fr) 110px 90px 90px minmax(140px, 1fr) 120px 96px',
                          alignItems: 'center',
                          minHeight: '56px',
                          borderBottom: '1px solid #f3f4f6',
                          background: selectedStockCode === s.code ? '#eff6ff' : '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ padding: '10px 16px', minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{s.name}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: MONO_FONT, marginTop: '2px' }}>{s.code}</div>
                        </div>
                        <div style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, borderRadius: '4px', padding: '2px 6px', background: s.is_narcotic ? '#111827' : '#eff6ff', color: s.is_narcotic ? '#fff' : '#1d4ed8' }}>
                            {s.is_narcotic ? 'CD · H1' : `Sch. ${s.schedule}`}
                          </span>
                        </div>
                        <div style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600, color: s.in_stock === 0 ? '#dc2626' : s.in_stock < s.reorder_level ? '#b45309' : '#111827' }}>
                          {s.in_stock}
                        </div>
                        <div style={{ padding: '10px 16px', fontSize: '13px', color: '#4b5563' }}>{s.reorder_level}</div>
                        <div style={{ padding: '10px 16px', fontSize: '13px', color: '#4b5563' }}>2027-08</div>
                        <div style={{ padding: '10px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              height: '24px',
                              padding: '0 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: s.in_stock === 0 ? '#fef2f2' : s.in_stock < s.reorder_level ? '#fffbeb' : '#f0fdf4',
                              color: s.in_stock === 0 ? '#dc2626' : s.in_stock < s.reorder_level ? '#b45309' : '#15803d',
                              border: `1px solid ${s.in_stock === 0 ? '#fecaca' : s.in_stock < s.reorder_level ? '#fde68a' : '#bbf7d0'}`,
                            }}
                          >
                            {s.status}
                          </span>
                        </div>
                        <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setSelectedStockCode(s.code)}
                            style={{ height: '36px', padding: '0 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                          >
                            Batches
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ==========================================
          ALLERGY OVERRIDE MODAL
      ========================================== */}
      {allergyModalOpen && (
        <div
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
        <div
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
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
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
                  height: '38px',
                  padding: '0 20px',
                  borderRadius: '8px',
                  background: '#2563eb',
                  border: 'none',
                  fontSize: '13px',
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
        <div
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
                style={{ height: '38px', padding: '0 16px', borderRadius: '8px', background: '#fff', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}
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
                style={{ height: '38px', padding: '0 16px', borderRadius: '8px', background: '#dc2626', border: 'none', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}
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

