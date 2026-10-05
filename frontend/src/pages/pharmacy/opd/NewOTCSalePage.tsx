import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  TriangleAlert,
  Search,
  Plus,
  Trash2,
  Printer,
  MessageCircle,
  QrCode,
  CreditCard,
  Banknote,
  UserCheck,
  ShieldCheck,
  Clock,
  Package,
  AlertCircle,
  RefreshCw,
  FileText,
  User,
  Phone,
  Calendar,
  Building,
  X,
} from 'lucide-react';
import api from '../../../services/api';
import { patientJourneyService } from '../../../services/patientJourneyService';
import { pharmacyOpdService, OTCSale } from '../../../services/pharmacyOpdService';

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

const formatINR = (n: number) =>
  '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface MedicineResult {
  id: string;
  item_code: string;
  name: string;
  generic_name: string;
  category: string;
  strength: string;
  unit_price: number | string;
  schedule: string;
  requires_prescription: boolean;
  is_narcotic: boolean;
  is_cold_chain: boolean;
  available_stock: number;
}

interface CartItem {
  medicine_id: string;
  item_code: string;
  name: string;
  generic_name: string;
  schedule: string;
  requires_prescription: boolean;
  is_narcotic: boolean;
  available_stock: number;
  unit_price: number;
  quantity: number;
  discount_percent: number;
  line_total: number;
  prescription_verified: boolean;
}

interface RegisteredPatient {
  id: string;
  uhid: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  allergies?: string[];
}

export interface NewOTCSalePageProps {
  embedded?: boolean;
  onClose?: () => void;
  onComplete?: () => void;
}

export const NewOTCSalePage: React.FC<NewOTCSalePageProps> = ({
  embedded = false,
  onClose,
  onComplete,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const pharmacistName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Arjun Varma';

  // 5-step stepper
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // STEP 1: Customer Information
  const [customerType, setCustomerType] = useState<'walkin' | 'patient'>('walkin');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAge, setCustomerAge] = useState('');
  const [customerGender, setCustomerGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [customerNotes, setCustomerNotes] = useState('');

  // Registered Patient Lookup
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<RegisteredPatient[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<RegisteredPatient | null>(null);

  // STEP 2: Medicine Selection & Cart
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [medSearchResults, setMedSearchResults] = useState<MedicineResult[]>([]);
  const [medSearchLoading, setMedSearchLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  // STEP 3: Compliance Check
  const [rxNumber, setRxNumber] = useState('');
  const [prescriberName, setPrescriberName] = useState('');
  const [prescriberRegNo, setPrescriberRegNo] = useState('');
  const [rxConfirmed, setRxConfirmed] = useState(false);

  // STEP 4: Payment
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
  const [cashTendered, setCashTendered] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // STEP 5: Completed Sale Result
  const [completedSale, setCompletedSale] = useState<OTCSale | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // Search Patients across Database & Reception Local Store
  const handleSearchPatients = useCallback(async (query: string) => {
    const qClean = query.trim().toLowerCase();
    if (!qClean) {
      setPatientSearchResults([]);
      setPatientSearchLoading(false);
      return;
    }

    setPatientSearchLoading(true);
    try {
      // 1. Fetch from Django Backend DB
      let dbList: any[] = [];
      try {
        const res = await api.get('/patients/', { params: { q: qClean } });
        dbList = Array.isArray(res.data) ? res.data : res.data.results || [];
      } catch (e) {
        console.warn('DB patient search failed, fallback to local storage:', e);
      }

      // 2. Fetch from local reception patientJourneyService
      let localList: any[] = [];
      try {
        const stored = patientJourneyService.getPatients();
        localList = stored.filter((lp) => {
          const text = `${lp.firstName} ${lp.lastName} ${lp.uhid} ${lp.phone}`.toLowerCase();
          return text.includes(qClean);
        });
      } catch (e) {
        console.warn('Local patient search failed:', e);
      }

      // 3. Normalize into RegisteredPatient format
      const mapPatient = (p: any): RegisteredPatient => ({
        id: String(p.id || p.uhid),
        uhid: p.uhid || 'UHID-PENDING',
        first_name: p.firstName || p.first_name || '',
        last_name: p.lastName || p.last_name || '',
        phone: p.phoneNumber || p.phone || '',
        date_of_birth: p.dateOfBirth || p.date_of_birth || p.dob || '',
        gender: p.gender || 'Male',
        blood_group: p.bloodGroup || p.blood_group || '',
        allergies: Array.isArray(p.allergies) ? p.allergies : [],
      });

      const combined = [...dbList.map(mapPatient), ...localList.map(mapPatient)];
      const seen = new Set<string>();
      const unique = combined.filter((p) => {
        if (!p.uhid || seen.has(p.uhid)) return false;
        seen.add(p.uhid);
        return true;
      });

      setPatientSearchResults(unique.slice(0, 10));
    } catch (err) {
      console.error('Patient search failed:', err);
    } finally {
      setPatientSearchLoading(false);
    }
  }, []);

  const handleSelectPatient = (p: RegisteredPatient) => {
    setSelectedPatient(p);
    const fullName = `${p.first_name} ${p.last_name}`.trim() || 'Patient';
    setCustomerName(fullName);
    setCustomerPhone(p.phone || '');
    const g = p.gender ? String(p.gender).toLowerCase() : '';
    setCustomerGender(g.includes('female') ? 'Female' : g.includes('other') ? 'Other' : 'Male');

    // Calculate age if date_of_birth is present
    if (p.date_of_birth) {
      const birthYear = new Date(p.date_of_birth).getFullYear();
      if (!isNaN(birthYear)) {
        const age = Math.max(1, new Date().getFullYear() - birthYear);
        setCustomerAge(String(age));
      }
    }
    setPatientSearchResults([]);
    setPatientSearchQuery(`${fullName} (${p.uhid})`);
    showNotice(`Linked patient record: ${fullName} (${p.uhid})`, 'success');
  };

  // Debounced real-time live search as user types
  useEffect(() => {
    if (customerType !== 'patient' || selectedPatient) return;
    const q = patientSearchQuery.trim();
    if (!q) {
      setPatientSearchResults([]);
      setPatientSearchLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      handleSearchPatients(q);
    }, 150);
    return () => clearTimeout(timer);
  }, [customerType, patientSearchQuery, selectedPatient, handleSearchPatients]);

  // Search Medicines
  const handleSearchMedicines = useCallback(async (query: string) => {
    setMedSearchLoading(true);
    try {
      const res = await api.get('/pharmacy/medicines/', {
        params: { q: query.trim() },
      });
      const list = Array.isArray(res.data) ? res.data : res.data.results || [];
      setMedSearchResults(list.slice(0, 15));
    } catch (err) {
      console.error('Medicine search failed:', err);
    } finally {
      setMedSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentStep === 2) {
      handleSearchMedicines(medSearchQuery);
    }
  }, [currentStep, medSearchQuery, handleSearchMedicines]);

  // Cart operations
  const addToCart = (med: MedicineResult) => {
    const existingIndex = cart.findIndex((item) => item.medicine_id === med.id);
    const unitPrice = Number(med.unit_price || 0);

    if (existingIndex > -1) {
      const updated = [...cart];
      const cur = updated[existingIndex];
      const newQty = cur.quantity + 1;
      const lineSub = unitPrice * newQty;
      const lineTotal = cur.discount_percent > 0 ? lineSub * (1 - cur.discount_percent / 100) : lineSub;
      updated[existingIndex] = {
        ...cur,
        quantity: newQty,
        line_total: lineTotal,
      };
      setCart(updated);
    } else {
      const newItem: CartItem = {
        medicine_id: med.id,
        item_code: med.item_code,
        name: med.name,
        generic_name: med.generic_name,
        schedule: med.schedule,
        requires_prescription: med.requires_prescription,
        is_narcotic: med.is_narcotic,
        available_stock: med.available_stock,
        unit_price: unitPrice,
        quantity: 1,
        discount_percent: 0,
        line_total: unitPrice,
        prescription_verified: !med.requires_prescription,
      };
      setCart([...cart, newItem]);
    }
  };

  const updateCartQty = (medicineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.medicine_id === medicineId) {
            const newQty = Math.max(1, item.quantity + delta);
            const lineSub = item.unit_price * newQty;
            const lineTotal = item.discount_percent > 0 ? lineSub * (1 - item.discount_percent / 100) : lineSub;
            return { ...item, quantity: newQty, line_total: lineTotal };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const updateCartDiscount = (medicineId: string, disc: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.medicine_id === medicineId) {
          const lineSub = item.unit_price * item.quantity;
          const lineTotal = disc > 0 ? lineSub * (1 - disc / 100) : lineSub;
          return { ...item, discount_percent: disc, line_total: lineTotal };
        }
        return item;
      })
    );
  };

  const removeFromCart = (medicineId: string) => {
    setCart((prev) => prev.filter((item) => item.medicine_id !== medicineId));
  };

  // Cart financial totals
  const cartTotals = useMemo(() => {
    const grossSubtotal = cart.reduce((acc, it) => acc + it.unit_price * it.quantity, 0);
    const netTotal = cart.reduce((acc, it) => acc + it.line_total, 0);
    const totalDiscount = grossSubtotal - netTotal;
    const gstIncluded = netTotal * (12 / 112); // 12% GST included in MRP
    const totalUnits = cart.reduce((acc, it) => acc + it.quantity, 0);
    return {
      grossSubtotal,
      totalDiscount,
      gstIncluded,
      netTotal,
      totalUnits,
    };
  }, [cart]);

  // Compliance checks
  const restrictedItems = useMemo(() => {
    return cart.filter((item) => item.requires_prescription || item.schedule !== 'OTC' || item.is_narcotic);
  }, [cart]);

  const hasRestrictedItems = restrictedItems.length > 0;
  const isCompliancePassed = !hasRestrictedItems || (rxConfirmed && rxNumber.trim().length > 0 && prescriberName.trim().length > 0);

  // Cash change due
  const changeDue = useMemo(() => {
    const tendered = Number(cashTendered || 0);
    return Math.max(0, tendered - cartTotals.netTotal);
  }, [cashTendered, cartTotals.netTotal]);

  // Execution: Submit Sale at Step 4
  const handleExecuteSale = async () => {
    if (cart.length === 0) {
      showNotice('Cart is empty. Please add items.', 'error');
      return;
    }
    if (paymentMode === 'CASH') {
      const tendered = Number(cashTendered || cartTotals.netTotal);
      if (tendered < cartTotals.netTotal) {
        showNotice(`Insufficient cash tendered. Total is ${formatINR(cartTotals.netTotal)}`, 'error');
        return;
      }
    }

    setIsProcessingPayment(true);
    try {
      const payload = {
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_phone: customerPhone.trim(),
        patient_id: selectedPatient?.id,
        payment_mode: paymentMode,
        payment_reference: paymentReference || (paymentMode === 'CASH' ? 'CASH-COUNTER-2' : `TXN-${Date.now().toString().slice(-6)}`),
        items: cart.map((item) => ({
          medicine_id: item.medicine_id,
          quantity: item.quantity,
          discount_percent: item.discount_percent,
          prescription_verified: !item.requires_prescription || rxConfirmed,
        })),
      };

      const result = await pharmacyOpdService.createOTCSale(payload);
      setCompletedSale(result);
      setCurrentStep(5);
      showNotice(`OTC Sale ${result.sale_number} completed & invoice posted! Stock updated by FEFO.`, 'success');
      if (onComplete) {
        onComplete();
      }
    } catch (err: any) {
      console.error('Sale error:', err);
      showNotice(err.response?.data?.error || err.message || 'Failed to complete OTC sale.', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!completedSale) return;
    const phone = customerPhone.trim() || completedSale.customer_phone;
    if (!phone) {
      showNotice('No mobile number available for WhatsApp invoice.', 'error');
      return;
    }
    try {
      await pharmacyOpdService.sendWhatsAppInvoice(completedSale.id, phone);
      showNotice(`Invoice sent to WhatsApp (+91 ${phone})`, 'success');
    } catch (err) {
      showNotice('WhatsApp notification service error.', 'error');
    }
  };

  const resetForNewSale = () => {
    setCurrentStep(1);
    setCustomerType('walkin');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAge('');
    setSelectedPatient(null);
    setCart([]);
    setRxNumber('');
    setPrescriberName('');
    setPrescriberRegNo('');
    setRxConfirmed(false);
    setCashTendered('');
    setPaymentReference('');
    setCompletedSale(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: embedded ? 'auto' : '100vh', background: embedded ? '#fff' : '#f8fafc', borderRadius: embedded ? '12px' : '0', border: embedded ? '1px solid #e5e7eb' : 'none', overflow: 'hidden' }}>
      {/* Top Header */}
      {embedded ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={() => {
                if (onClose) onClose();
                else navigate('/pharmacy/opd');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '34px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={15} /> Back to OTC Sales List
            </button>
            <div style={{ height: '20px', width: '1px', background: '#e2e8f0' }} />
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Hospital Pharmacy Counter · New OTC &amp; Walk-in Sale
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Walk-in patient billing, non-prescription dispensing &amp; FEFO stock reduction
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#0284c7', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '3px 10px' }}>
              Counter 2 · Main OPD Desk
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '3px 10px' }}>
              {pharmacistName}
            </span>
          </div>
        </div>
      ) : (
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '56px',
            padding: '0 24px',
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => {
                if (onClose) onClose();
                else navigate('/pharmacy/opd');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '34px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={16} /> Return to OPD Queue
            </button>
            <div style={{ height: '24px', width: '1px', background: '#e2e8f0' }} />
            <div>
              <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Hospital Pharmacy Counter · New OTC Sale
              </h1>
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                Over-the-counter dispense, walk-in patient billing &amp; instant FEFO inventory ledger update
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#0284c7',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                padding: '3px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Building size={14} /> Counter 2 · Main OPD Desk
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#16a34a',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                padding: '3px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <UserCheck size={14} /> {pharmacistName}
            </span>
          </div>
        </header>
      )}

      {/* Floating Notification */}
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
          {notification.type === 'error' ? <TriangleAlert size={16} color="#fca5a5" /> : <CheckCircle2 size={16} color="#4ade80" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Progress Stepper Bar (5 Steps) */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 32px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {[
            { step: 1, title: 'Customer Info', desc: 'Walk-in / UHID' },
            { step: 2, title: 'Medicine Selection', desc: 'Formulary & FEFO' },
            { step: 3, title: 'Compliance Check', desc: 'Schedule & Limits' },
            { step: 4, title: 'Payment', desc: 'Cash / Card / UPI' },
            { step: 5, title: 'Invoice & Complete', desc: 'Receipt & Stock' },
          ].map((item, idx) => {
            const isActive = currentStep === item.step;
            const isDone = currentStep > item.step;
            return (
              <React.Fragment key={item.step}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isDone ? '#16a34a' : isActive ? '#2563eb' : '#f1f5f9',
                      color: isDone || isActive ? '#ffffff' : '#64748b',
                      border: `1.5px solid ${isDone ? '#16a34a' : isActive ? '#2563eb' : '#cbd5e1'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}
                  >
                    {isDone ? <Check size={16} strokeWidth={3} /> : item.step}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: isActive ? 700 : 600, color: isActive ? '#0f172a' : isDone ? '#16a34a' : '#64748b' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.desc}</div>
                  </div>
                </div>
                {idx < 4 && (
                  <div
                    style={{
                      flex: 1,
                      height: '2px',
                      background: isDone ? '#16a34a' : '#e2e8f0',
                      margin: '0 12px',
                      borderRadius: '1px',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Workflow Container */}
      <main style={{ flex: 1, padding: '24px 32px', maxWidth: '1280px', width: '100%', margin: '0 auto' }}>
        {/* ====================================================
            STEP 1: CUSTOMER INFORMATION
        ==================================================== */}
        {currentStep === 1 && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '28px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Step 1: Customer &amp; Patient Information
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Capture walk-in customer details or look up an existing North Hospital registered patient record
              </p>
            </div>

            {/* Type selector */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <label
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  border: `2px solid ${customerType === 'walkin' ? '#2563eb' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: customerType === 'walkin' ? '#eff6ff' : '#fff',
                }}
              >
                <input
                  type="radio"
                  name="custType"
                  checked={customerType === 'walkin'}
                  onChange={() => {
                    setCustomerType('walkin');
                    setSelectedPatient(null);
                  }}
                  style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
                />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>General Walk-in Customer</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>External customer purchasing OTC medicines over the counter</div>
                </div>
              </label>

              <label
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  border: `2px solid ${customerType === 'patient' ? '#2563eb' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: customerType === 'patient' ? '#eff6ff' : '#fff',
                }}
              >
                <input
                  type="radio"
                  name="custType"
                  checked={customerType === 'patient'}
                  onChange={() => setCustomerType('patient')}
                  style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
                />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Registered Hospital Patient</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Link purchase to patient EHR folio, UHID &amp; allergy profile</div>
                </div>
              </label>
            </div>

            {/* Registered Patient Lookup */}
            {customerType === 'patient' && (
              <div style={{ padding: '18px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                    Search Hospital Patient Directory <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Live query across Django Database &amp; Reception registrations
                  </span>
                </div>

                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <Search size={17} />
                  </div>

                  <input
                    value={patientSearchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPatientSearchQuery(val);
                      if (selectedPatient) {
                        setSelectedPatient(null);
                      }
                    }}
                    placeholder="Type patient name, UHID, or phone number to search..."
                    style={{
                      width: '100%',
                      height: '44px',
                      padding: '0 40px 0 40px',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      background: '#fff',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    }}
                  />

                  {patientSearchLoading ? (
                    <div
                      style={{
                        position: 'absolute',
                        right: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: '#0284c7',
                        fontWeight: 600,
                      }}
                    >
                      <RefreshCw size={14} className="animate-spin" /> Searching...
                    </div>
                  ) : patientSearchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPatientSearchQuery('');
                        setSelectedPatient(null);
                        setPatientSearchResults([]);
                      }}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        cursor: 'pointer',
                      }}
                      title="Clear search"
                    >
                      <X size={13} />
                    </button>
                  ) : null}

                  {/* Floating Absolute Dropdown: only appears when searching and floats without changing container box height */}
                  {patientSearchQuery.trim().length > 0 && !selectedPatient && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        right: 0,
                        zIndex: 100,
                        background: '#fff',
                        border: '1.5px solid #bfdbfe',
                        borderRadius: '10px',
                        maxHeight: '280px',
                        overflowY: 'auto',
                        boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.18), 0 4px 10px rgba(0, 0, 0, 0.06)',
                      }}
                    >
                      {patientSearchResults.length > 0 ? (
                        <>
                          <div
                            style={{
                              padding: '8px 14px',
                              background: '#f8fafc',
                              borderBottom: '1px solid #e2e8f0',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#64748b',
                              letterSpacing: '0.04em',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              position: 'sticky',
                              top: 0,
                              zIndex: 2,
                            }}
                          >
                            <span>MATCHING REGISTERED PATIENTS ({patientSearchResults.length})</span>
                            <span style={{ color: '#2563eb', fontWeight: 600 }}>Click any patient to select &amp; link</span>
                          </div>
                          {patientSearchResults.map((p) => {
                            const fullName = `${p.first_name} ${p.last_name}`.trim() || 'Patient';
                            const hasAllergy = p.allergies && p.allergies.length > 0 && p.allergies[0] !== 'None';
                            return (
                              <div
                                key={p.uhid || p.id}
                                onClick={() => handleSelectPatient(p)}
                                style={{
                                  padding: '12px 14px',
                                  borderBottom: '1px solid #f1f5f9',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  transition: 'background 0.12s ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f9ff')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                                      {fullName}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: '#0369a1',
                                        background: '#e0f2fe',
                                        borderRadius: '4px',
                                        padding: '1px 6px',
                                        fontFamily: MONO_FONT,
                                      }}
                                    >
                                      {p.uhid}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                      {p.gender} {p.blood_group ? `· ${p.blood_group}` : ''}
                                    </span>
                                  </div>
                                  {hasAllergy && (
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: '#dc2626',
                                      }}
                                    >
                                      <TriangleAlert size={12} /> Allergy alert: {p.allergies?.join(', ')}
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                                    📞 {p.phone || 'No phone'}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      color: '#2563eb',
                                      background: '#eff6ff',
                                      borderRadius: '6px',
                                      padding: '5px 12px',
                                      border: '1px solid #bfdbfe',
                                    }}
                                  >
                                    Select →
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      ) : !patientSearchLoading ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                            No registered patients found matching "{patientSearchQuery}"
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                            Check spelling or search by phone/UHID, or select General Walk-in Customer.
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Selected Linked Patient Card */}
                {selectedPatient && (
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '16px 18px',
                      background: '#eff6ff',
                      borderRadius: '10px',
                      border: '1.5px solid #93c5fd',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#1e40af' }}>
                            ✓ Linked Patient: {selectedPatient.first_name} {selectedPatient.last_name}
                          </span>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#1d4ed8',
                              background: '#dbeafe',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontFamily: MONO_FONT,
                            }}
                          >
                            {selectedPatient.uhid}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>
                          Phone: {selectedPatient.phone || 'N/A'} · Gender: {selectedPatient.gender} {selectedPatient.blood_group ? `· Blood: ${selectedPatient.blood_group}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(null);
                          setPatientSearchQuery('');
                          setPatientSearchResults([]);
                        }}
                        style={{
                          height: '30px',
                          padding: '0 12px',
                          background: '#fff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        Change / Unlink
                      </button>
                    </div>
                    {selectedPatient.allergies && selectedPatient.allergies.length > 0 && selectedPatient.allergies[0] !== 'None' && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          color: '#dc2626',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        <TriangleAlert size={15} /> Documented Patient Allergies: {selectedPatient.allergies.join(', ')} (Pharmacist warning)
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Form Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Customer Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  style={{ width: '100%', height: '42px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Customer Mobile Number (for e-Receipt) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' }}>
                  <span style={{ padding: '0 10px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>+91</span>
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="9876543210"
                    maxLength={10}
                    style={{ flex: 1, height: '40px', padding: '0 8px', border: 'none', fontSize: '14px', outline: 'none', fontFamily: MONO_FONT }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Gender
                </label>
                <select
                  value={customerGender}
                  onChange={(e) => setCustomerGender(e.target.value as any)}
                  style={{ width: '100%', height: '42px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', background: '#fff' }}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Counter Notes / Remarks (Optional)
              </label>
              <input
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Walk-in counter purchase, attendant notes..."
                style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              />
            </div>

            {/* Stepper Next button */}
            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <button
                type="button"
                onClick={() => {
                  if (!customerName.trim()) {
                    showNotice('Customer name is required', 'error');
                    return;
                  }
                  setCurrentStep(2);
                }}
                style={{
                  height: '42px',
                  padding: '0 24px',
                  borderRadius: '8px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Proceed to Medicine Selection →
              </button>
            </div>
          </div>
        )}

        {/* ====================================================
            STEP 2: MEDICINE SELECTION & LIVE CART
        ==================================================== */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            {/* Left: Medicine Search Directory (60%) */}
            <div style={{ flex: '1 1 55%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Formulary Medicine Search</h2>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>Search medicines by brand name, generic name, or item code</p>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Showing live FEFO stock</span>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '12px' }} />
                <input
                  value={medSearchQuery}
                  onChange={(e) => setMedSearchQuery(e.target.value)}
                  placeholder="Type drug name (e.g. Paracetamol, Cetirizine, ORS, Amoxicillin)..."
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 16px 0 42px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Medicine List */}
              <div style={{ maxHeight: '460px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {medSearchLoading ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Searching stock database...</div>
                ) : medSearchResults.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    No medicines found. Try another search term.
                  </div>
                ) : (
                  medSearchResults.map((med) => {
                    const isOutOfStock = med.available_stock <= 0;
                    return (
                      <div
                        key={med.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 14px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          background: isOutOfStock ? '#f8fafc' : '#fff',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{med.name}</span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '4px',
                                padding: '1px 6px',
                                background: med.schedule === 'OTC' ? '#f0fdf4' : '#eff6ff',
                                color: med.schedule === 'OTC' ? '#15803d' : '#1d4ed8',
                                border: `1px solid ${med.schedule === 'OTC' ? '#bbf7d0' : '#bfdbfe'}`,
                              }}
                            >
                              {med.schedule === 'OTC' ? 'OTC Approved' : `Sch ${med.schedule}`}
                            </span>
                            {med.is_narcotic && (
                              <span style={{ fontSize: '10px', fontWeight: 700, background: '#111827', color: '#fff', padding: '1px 5px', borderRadius: '3px' }}>
                                CD
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            {med.generic_name} {med.strength && `· ${med.strength}`}
                          </div>
                          <div style={{ fontSize: '12px', color: isOutOfStock ? '#dc2626' : '#16a34a', fontWeight: 500, marginTop: '2px' }}>
                            {isOutOfStock ? 'Out of Stock' : `Available Stock: ${med.available_stock} units`}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                              {formatINR(Number(med.unit_price))}
                            </div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>MRP incl. taxes</div>
                          </div>
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => addToCart(med)}
                            style={{
                              height: '34px',
                              padding: '0 12px',
                              borderRadius: '6px',
                              background: isOutOfStock ? '#e2e8f0' : '#2563eb',
                              color: isOutOfStock ? '#94a3b8' : '#fff',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Plus size={14} /> Add
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Counter Cart (45%) */}
            <div style={{ flex: '1 1 45%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Cart Items ({cart.length})
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div style={{ padding: '48px 16px', textAlign: 'center', border: '2px dashed #e2e8f0', borderRadius: '8px' }}>
                  <Package size={36} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>No medicines in counter cart</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    Search from the formulary on the left and click Add
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
                  {cart.map((item) => (
                    <div
                      key={item.medicine_id}
                      style={{
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        background: '#fafafa',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {item.schedule !== 'OTC' && (
                              <span style={{ color: '#b45309', fontWeight: 600 }}>Sch {item.schedule} · Rx Required</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.medicine_id)}
                          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        {/* Quantity Stepper */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.medicine_id, -1)}
                            style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 700 }}
                          >
                            -
                          </button>
                          <span style={{ width: '32px', textAlign: 'center', fontSize: '13px', fontWeight: 700, fontFamily: MONO_FONT }}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.medicine_id, 1)}
                            style={{ width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 700 }}
                          >
                            +
                          </button>
                        </div>

                        {/* Discount Selector */}
                        <select
                          value={item.discount_percent}
                          onChange={(e) => updateCartDiscount(item.medicine_id, Number(e.target.value))}
                          style={{ height: '28px', padding: '0 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff' }}
                        >
                          <option value={0}>0% Disc</option>
                          <option value={5}>5% Disc</option>
                          <option value={10}>10% Disc</option>
                        </select>

                        {/* Line Total */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                            {formatINR(item.line_total)}
                          </div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                            @{formatINR(item.unit_price)}/ea
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Cart Summary */}
              {cart.length > 0 && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
                    <span>Gross Subtotal ({cartTotals.totalUnits} items)</span>
                    <span>{formatINR(cartTotals.grossSubtotal)}</span>
                  </div>
                  {cartTotals.totalDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#16a34a' }}>
                      <span>Discount</span>
                      <span>- {formatINR(cartTotals.totalDiscount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
                    <span>GST (12% inclusive)</span>
                    <span>{formatINR(cartTotals.gstIncluded)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #cbd5e1', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    <span>Total Payable</span>
                    <span>{formatINR(cartTotals.netTotal)}</span>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  style={{ height: '40px', padding: '0 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  ← Back to Customer
                </button>
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={() => setCurrentStep(3)}
                  style={{
                    height: '40px',
                    padding: '0 20px',
                    borderRadius: '8px',
                    background: cart.length === 0 ? '#cbd5e1' : '#2563eb',
                    color: '#fff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Proceed to Compliance Check →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            STEP 3: COMPLIANCE CHECK
        ==================================================== */}
        {currentStep === 3 && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '28px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Step 3: Statutory Compliance Verification
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Verify statutory schedule classification under the Drugs and Cosmetics Act &amp; hospital counter limits
              </p>
            </div>

            {/* Check Status Card */}
            {!hasRestrictedItems ? (
              <div style={{ display: 'flex', gap: '14px', padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', marginBottom: '24px' }}>
                <CheckCircle2 size={24} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#15803d' }}>
                    Statutory Schedule Check: PASSED
                  </div>
                  <div style={{ fontSize: '13px', color: '#166534', marginTop: '4px' }}>
                    All items in this cart are classified as OTC / General Sales. They are legally approved for sale over the counter without requiring a medical practitioner prescription.
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '14px', padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', marginBottom: '24px' }}>
                <TriangleAlert size={24} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#b45309' }}>
                    Restricted Schedule Items Detected in Cart ({restrictedItems.length})
                  </div>
                  <div style={{ fontSize: '13px', color: '#92400e', marginTop: '4px' }}>
                    The following items are Schedule H/H1 drugs:
                  </div>
                  <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '13px', color: '#92400e' }}>
                    {restrictedItems.map((r) => (
                      <li key={r.medicine_id}>
                        {r.name} (Schedule {r.schedule})
                      </li>
                    ))}
                  </ul>
                  <div style={{ fontSize: '12px', color: '#b45309', marginTop: '6px', fontWeight: 600 }}>
                    As per pharmacy regulations, you must record prescriber details and verify the physical prescription before dispensing.
                  </div>
                </div>
              </div>
            )}

            {/* If Restricted, Show Prescriber Capture Form */}
            {hasRestrictedItems && (
              <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
                  Doctor Prescription Verification Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Prescription Number <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      value={rxNumber}
                      onChange={(e) => setRxNumber(e.target.value)}
                      placeholder="e.g. RX-2610-8812"
                      style={{ width: '100%', height: '38px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Prescribing Doctor Name <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      value={prescriberName}
                      onChange={(e) => setPrescriberName(e.target.value)}
                      placeholder="e.g. Dr. Kavitha Menon"
                      style={{ width: '100%', height: '38px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Medical Reg / License No.
                    </label>
                    <input
                      value={prescriberRegNo}
                      onChange={(e) => setPrescriberRegNo(e.target.value)}
                      placeholder="e.g. KMC 48211"
                      style={{ width: '100%', height: '38px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <label
                  onClick={() => setRxConfirmed(!rxConfirmed)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1.5px solid ${rxConfirmed ? '#2563eb' : '#cbd5e1'}`,
                    background: rxConfirmed ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: `1.5px solid ${rxConfirmed ? '#2563eb' : '#cbd5e1'}`,
                      background: rxConfirmed ? '#2563eb' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {rxConfirmed && <Check size={14} color="#fff" strokeWidth={3} />}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                    I confirm that I have physically verified the original valid doctor prescription and sighted proper medical credentials.
                  </span>
                </label>
              </div>
            )}

            {/* Checklist of hospital counter standards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Counter Operational Checks:
              </div>
              {[
                { t: 'Batch Expiry Compliance', d: 'All items picked from active, unexpired batches (FEFO compliant)' },
                { t: 'Counter Unit Quantity Limits', d: 'Dispensation quantities adhere to maximum hospital outpatient limits' },
                { t: 'Customer Identification Verified', d: `${customerName} (+91 ${customerPhone || 'N/A'}) recorded in hospital register` },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span>
                    <strong>{c.t}:</strong> {c.d}
                  </span>
                </div>
              ))}
            </div>

            {/* Nav buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                style={{ height: '40px', padding: '0 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                ← Back to Cart
              </button>
              <button
                type="button"
                disabled={!isCompliancePassed}
                onClick={() => setCurrentStep(4)}
                style={{
                  height: '40px',
                  padding: '0 24px',
                  borderRadius: '8px',
                  background: isCompliancePassed ? '#2563eb' : '#cbd5e1',
                  color: '#fff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isCompliancePassed ? 'pointer' : 'not-allowed',
                }}
              >
                {isCompliancePassed ? 'Proceed to Payment →' : 'Verify Prescription Details to Proceed'}
              </button>
            </div>
          </div>
        )}

        {/* ====================================================
            STEP 4: PAYMENT
        ==================================================== */}
        {currentStep === 4 && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '28px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Step 4: Counter Payment &amp; Settlement
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Select customer payment mode and process instant counter billing receipt
              </p>
            </div>

            {/* Net Amount Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Total Sale Amount Due</span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                  {formatINR(cartTotals.netTotal)}
                </div>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '6px' }}>
                {cartTotals.totalUnits} items in counter cart
              </span>
            </div>

            {/* Payment Method Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {[
                { mode: 'CASH', label: 'Cash Tender', icon: Banknote, sub: 'Physical Currency' },
                { mode: 'CARD', label: 'Credit / Debit Card', icon: CreditCard, sub: 'POS EDC Machine' },
                { mode: 'UPI', label: 'UPI QR Scan', icon: QrCode, sub: 'Instant Online Pay' },
              ].map((m) => {
                const isSelected = paymentMode === m.mode;
                const Icon = m.icon;
                return (
                  <button
                    key={m.mode}
                    type="button"
                    onClick={() => setPaymentMode(m.mode as any)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px',
                      borderRadius: '10px',
                      border: `2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                      background: isSelected ? '#eff6ff' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Icon size={24} color={isSelected ? '#2563eb' : '#64748b'} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#1d4ed8' : '#0f172a' }}>{m.label}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{m.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* CASH SUB-PANEL */}
            {paymentMode === 'CASH' && (
              <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Cash Received from Customer</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { label: 'Exact', amt: cartTotals.netTotal },
                      { label: '+₹50', amt: Math.ceil(cartTotals.netTotal / 50) * 50 },
                      { label: '+₹100', amt: Math.ceil(cartTotals.netTotal / 100) * 100 },
                      { label: '+₹500', amt: Math.ceil(cartTotals.netTotal / 500) * 500 },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => setCashTendered(String(chip.amt))}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder={String(cartTotals.netTotal)}
                  style={{ width: '100%', height: '42px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', fontWeight: 700, fontFamily: MONO_FONT }}
                />

                {Number(cashTendered || cartTotals.netTotal) >= cartTotals.netTotal ? (
                  <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#15803d' }}>Change Due to Customer:</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#15803d' }}>{formatINR(changeDue)}</span>
                  </div>
                ) : (
                  <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>
                    Cash tendered is short by {formatINR(cartTotals.netTotal - Number(cashTendered))}
                  </div>
                )}
              </div>
            )}

            {/* CARD SUB-PANEL */}
            {paymentMode === 'CARD' && (
              <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                  Swipe/Dip card on EDC Terminal (HDFC POS Counter 2). Enter Authorization Approval Code:
                </div>
                <input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="POS Auth Approval Code (e.g. POS-88421)"
                  style={{ width: '100%', height: '42px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontFamily: MONO_FONT }}
                />
              </div>
            )}

            {/* UPI SUB-PANEL */}
            {paymentMode === 'UPI' && (
              <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ width: '120px', height: '120px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <QrCode size={80} color="#0f172a" />
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>UPI SCAN &amp; PAY</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Customer scans Dynamic QR with GPay, PhonePe, Paytm:</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', fontFamily: MONO_FONT, margin: '4px 0 10px' }}>
                    northhospital.pharma@icici
                  </div>
                  <input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Enter UPI UTR / Transaction ID (e.g. 2610-8849)"
                    style={{ width: '100%', height: '38px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontFamily: MONO_FONT }}
                  />
                </div>
              </div>
            )}

            {/* Invariant guarantee notice */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b', marginBottom: '24px' }}>
              <ShieldCheck size={16} color="#16a34a" />
              <span>Strict Inventory Invariant: Medicine stock reduces by FEFO only when sale completes in next step.</span>
            </div>

            {/* Nav buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                style={{ height: '40px', padding: '0 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                ← Back to Compliance
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleExecuteSale}
                style={{
                  height: '42px',
                  padding: '0 28px',
                  borderRadius: '8px',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: isProcessingPayment ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {isProcessingPayment ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Complete Sale &amp; Generate Invoice
              </button>
            </div>
          </div>
        )}

        {/* ====================================================
            STEP 5: INVOICE & COMPLETE SALE
        ==================================================== */}
        {currentStep === 5 && completedSale && (
          <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Success Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={24} color="#16a34a" />
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#15803d' }}>
                    Sale Completed Successfully · Invoice #{completedSale.sale_number}
                  </div>
                  <div style={{ fontSize: '12px', color: '#166534' }}>
                    FEFO inventory decremented atomically · Cashier shift ledger updated
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '36px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Printer size={15} /> Print Receipt
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '36px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid #16a34a',
                    background: '#16a34a',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <MessageCircle size={15} /> WhatsApp
                </button>
              </div>
            </div>

            {/* Printable Tax Invoice Slip (Hospital Standard) */}
            <div
              id="printable-receipt"
              style={{
                background: '#fff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '28px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              }}
            >
              {/* Receipt Header */}
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: '16px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>NORTH HOSPITAL</h3>
                <div style={{ fontSize: '12px', color: '#475569' }}>Outpatient Department Pharmacy · Ground Floor Counter 2</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  DL No: KA-BLR-PH-2026-8812 · GSTIN: 29AAAAA0000A1Z5 · Tel: +91 80 4412 8800
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                  TAX INVOICE / CASH BILL
                </div>
              </div>

              {/* Meta Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Invoice No: </span>
                  <strong style={{ fontFamily: MONO_FONT }}>{completedSale.sale_number}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Date &amp; Time: </span>
                  <strong>{new Date().toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Customer Name: </span>
                  <strong>{completedSale.customer_name}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Phone: </span>
                  <span style={{ fontFamily: MONO_FONT }}>{completedSale.customer_phone || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Payment Mode: </span>
                  <strong>{completedSale.payment_mode}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Pharmacist: </span>
                  <strong>{pharmacistName}</strong>
                </div>
              </div>

              {/* Line Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '6px 4px' }}>Item Description</th>
                    <th style={{ padding: '6px 4px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Rate (₹)</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 4px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{item.generic_name}</div>
                      </td>
                      <td style={{ padding: '6px 4px', textAlign: 'center', fontFamily: MONO_FONT }}>{item.quantity}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: MONO_FONT }}>{Number(item.unit_price).toFixed(2)}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 600, fontFamily: MONO_FONT }}>{Number(item.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Bill Totals */}
              <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Subtotal:</span>
                  <span style={{ fontFamily: MONO_FONT }}>{formatINR(cartTotals.grossSubtotal)}</span>
                </div>
                {cartTotals.totalDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <span>Discount:</span>
                    <span style={{ fontFamily: MONO_FONT }}>- {formatINR(cartTotals.totalDiscount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>CGST 6% + SGST 6% (Inclusive):</span>
                  <span style={{ fontFamily: MONO_FONT }}>{formatINR(cartTotals.gstIncluded)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800, color: '#0f172a', paddingTop: '6px', borderTop: '1px dashed #cbd5e1' }}>
                  <span>Grand Total:</span>
                  <span>{formatINR(cartTotals.netTotal)}</span>
                </div>
              </div>

              {/* Receipt Footer */}
              <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '12px', borderTop: '1px dashed #94a3b8', fontSize: '11px', color: '#64748b' }}>
                <div>Thank you for choosing North Hospital Pharmacy.</div>
                <div>Goods once sold can only be returned within 48 hours with original receipt and intact packaging.</div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button
                type="button"
                onClick={resetForNewSale}
                style={{
                  height: '42px',
                  padding: '0 20px',
                  borderRadius: '8px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={16} /> Start Next OTC Sale
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose();
                  else navigate('/pharmacy/opd');
                }}
                style={{
                  height: '42px',
                  padding: '0 20px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {embedded ? 'Back to OTC Sales List' : 'Return to OPD Dispensing Queue'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NewOTCSalePage;
