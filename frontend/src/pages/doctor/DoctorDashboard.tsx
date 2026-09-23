import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  HeartPulse,
  Plus,
  Trash2,
  FileText,
  FlaskConical,
  Calendar,
  User,
  Activity,
  ChevronRight,
  Printer,
  Save,
  LayoutDashboard,
  Pill,
  ClipboardList,
  BarChart2,
  BedDouble,
  Share2,
  Send,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Phone,
  Building2,
  ShieldAlert,
  ArrowRight,
  History,
  Sparkles,
  Download,
  CheckCircle,
  Eye,
  FileCheck,
  Edit3,
  TrendingUp,
  DollarSign,
  Award,
} from 'lucide-react';
import { PrescriptionItem } from '../../types';
import {
  patientJourneyService,
  SharedPatient,
  SharedQueueToken,
  SharedPrescription,
  SharedDoctorFollowUp,
  SharedInpatientRound,
  SharedEmergencyAlert,
} from '../../services/patientJourneyService';

interface ScheduleDay {
  day: string;
  isActive: boolean;
  morning: string;
  evening: string;
  room: string;
  maxPatients: number;
}

const DEFAULT_WEEKLY_SCHEDULE: ScheduleDay[] = [
  { day: 'Monday', isActive: true, morning: '08:30 AM - 01:30 PM', evening: '05:00 PM - 07:30 PM', room: 'Chamber 204', maxPatients: 25 },
  { day: 'Tuesday', isActive: true, morning: '08:30 AM - 01:30 PM', evening: '05:00 PM - 07:30 PM', room: 'Chamber 204', maxPatients: 25 },
  { day: 'Wednesday', isActive: true, morning: '08:30 AM - 01:30 PM', evening: 'OT Theaters (Surgery)', room: 'OT Bay 01', maxPatients: 15 },
  { day: 'Thursday', isActive: true, morning: '08:30 AM - 01:30 PM', evening: '05:00 PM - 07:30 PM', room: 'Chamber 204', maxPatients: 25 },
  { day: 'Friday', isActive: true, morning: '08:30 AM - 01:30 PM', evening: '05:00 PM - 07:30 PM', room: 'Chamber 204', maxPatients: 25 },
  { day: 'Saturday', isActive: true, morning: '09:00 AM - 02:00 PM', evening: 'Off-Duty', room: 'Chamber 204', maxPatients: 18 },
  { day: 'Sunday', isActive: false, morning: 'On-Call Emergency', evening: 'Off-Duty', room: 'Casualty / ER', maxPatients: 10 },
];

const COMMON_MEDICATIONS = [
  { name: 'Amoxicillin 500mg', dosage: '500mg (1 Cap)', freq: '1-0-1', timing: 'AFTER_FOOD', days: 5, reason: 'Bacterial pharyngitis & throat infection coverage', notes: 'Take with full glass of water' },
  { name: 'Paracetamol 650mg', dosage: '650mg (1 Tab)', freq: '1-0-1 SOS', timing: 'AFTER_FOOD', days: 3, reason: 'Fever reduction & headache/bodyache relief (SOS)', notes: 'Take only if fever > 99°F or bodyache' },
  { name: 'Pantoprazole 40mg', dosage: '40mg (1 Tab)', freq: '1-0-0', timing: 'BEFORE_FOOD', days: 5, reason: 'Gastric acid reflux & mucosal protection', notes: 'Take 30 mins before breakfast' },
  { name: 'Levocetirizine 5mg', dosage: '5mg (1 Tab)', freq: '0-0-1', timing: 'BEDTIME', days: 5, reason: 'Allergic rhinitis, sneezing & cough relief', notes: 'Take before sleep at night' },
  { name: 'Azithromycin 500mg', dosage: '500mg (1 Tab)', freq: '1-0-0', timing: 'AFTER_FOOD', days: 3, reason: 'Atypical respiratory bacterial coverage', notes: 'Take once daily for 3 days' },
  { name: 'Metformin 500mg', dosage: '500mg (1 Tab)', freq: '1-0-1', timing: 'WITH_FOOD', days: 30, reason: 'Glycemic control for Type 2 Diabetes', notes: 'Take with main meals' },
  { name: 'Telmisartan 40mg', dosage: '40mg (1 Tab)', freq: '1-0-0', timing: 'AFTER_FOOD', days: 30, reason: 'Blood pressure control & hypertension management', notes: 'Take in morning' },
  { name: 'Montelukast 10mg', dosage: '10mg (1 Tab)', freq: '0-0-1', timing: 'BEDTIME', days: 10, reason: 'Airway inflammation & nocturnal cough relief', notes: 'Take at bedtime' },
];

const COMMON_SYMPTOMS = [
  'Fever',
  'Dry Cough',
  'Productive Cough',
  'Sore Throat',
  'Chest Pain',
  'Shortness of Breath',
  'Palpitations',
  'Headache',
  'Fatigue',
  'Gastric Burning',
  'Dizziness',
];

export const DoctorDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'dashboard';

  // Map legacy / consolidated tab URLs to our 6 core tabs
  const activeTab = useMemo(() => {
    if (rawTab === 'appointments' || rawTab === 'followups') return 'queue';
    if (rawTab === 'prescriptions' || rawTab === 'investigations' || rawTab === 'patients') return 'consultation';
    if (['dashboard', 'queue', 'consultation', 'schedule', 'reports', 'inpatient'].includes(rawTab)) {
      return rawTab;
    }
    return 'dashboard';
  }, [rawTab]);

  const setActiveTab = (tabName: string) => {
    setSearchParams({ tab: tabName });
  };

  // Doctor Identity & Telemetry
  const doctorName = 'Dr. Sarah Jenkins';
  const doctorSpecialization = 'MD (Cardiology / Internal Medicine)';
  const [doctorChamber, setDoctorChamber] = useState(() => {
    const saved = localStorage.getItem('nh_doctor_chamber');
    return saved || 'Chamber 204 • OPD Block B';
  });
  const [doctorStatus, setDoctorStatus] = useState<'AVAILABLE' | 'IN_CONSULTATION' | 'BREAK' | 'OFFLINE'>('AVAILABLE');
  const [doctorFilter, setDoctorFilter] = useState<'my' | 'all'>('my');

  // Master Data Synced with Reception & Clinical Pipeline
  const [queue, setQueue] = useState<SharedQueueToken[]>([]);
  const [patients, setPatients] = useState<SharedPatient[]>([]);
  const [prescriptions, setPrescriptions] = useState<SharedPrescription[]>([]);
  const [followUps, setFollowUps] = useState<SharedDoctorFollowUp[]>([]);
  const [inpatientRounds, setInpatientRounds] = useState<SharedInpatientRound[]>([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState<SharedEmergencyAlert[]>([]);

  // Queue sub-filter inside Tab 2
  const [queueSubFilter, setQueueSubFilter] = useState<'all' | 'appointments' | 'followups' | 'completed'>('all');

  // Active workflow step inside Tab 3 (Sequential Doctor Workflow: Assessment -> Prescription -> Investigations -> Follow-up)
  const [consultationWorkflowStep, setConsultationWorkflowStep] = useState<'assessment' | 'prescription' | 'investigations' | 'followup'>('assessment');

  // Right-hand clinical decision support panel active tab
  const [rightHistoryTab, setRightHistoryTab] = useState<'rx' | 'labs' | 'radiology' | 'visits'>('rx');

  // Load and subscribe to cross-department synchronization
  const refreshAllData = () => {
    setQueue(patientJourneyService.getQueue());
    setPatients(patientJourneyService.getPatients());
    setPrescriptions(patientJourneyService.getPrescriptions());
    setFollowUps(patientJourneyService.getFollowUps());
    setInpatientRounds(patientJourneyService.getInpatientRounds());
    setEmergencyAlerts(patientJourneyService.getEmergencyAlerts());
  };

  useEffect(() => {
    refreshAllData();

    const handleDataSync = () => refreshAllData();
    window.addEventListener('storage', handleDataSync);
    window.addEventListener('nh_data_sync', handleDataSync);

    return () => {
      window.removeEventListener('storage', handleDataSync);
      window.removeEventListener('nh_data_sync', handleDataSync);
    };
  }, []);

  // Filter queue for Dr. Sarah Jenkins vs All OPD
  const displayedQueue = useMemo(() => {
    if (doctorFilter === 'all') return queue;
    return queue.filter(
      (q) =>
        q.doctor.toLowerCase().includes('jenkins') ||
        q.doctor.toLowerCase().includes('sarah')
    );
  }, [queue, doctorFilter]);

  // Fallback token to guarantee safety against empty queue or race conditions
  const fallbackToken: SharedQueueToken = useMemo(() => ({
    id: 'apt-default',
    aptNo: 'APT-2026-001',
    token: 1,
    patient: 'Robert Fox',
    uhid: 'UHID-202609-00001',
    age: 38,
    gender: 'MALE' as any,
    bloodGroup: 'O+',
    phone: '+1 555-019-2834',
    doctor: 'Dr. Sarah Jenkins (Cardiology)',
    room: 'Chamber 204',
    time: '09:00 AM',
    status: 'IN_CONSULTATION',
    priority: 'NORMAL',
    type: 'Consultation',
    vitals: {
      bp: '120/80',
      pulse: 74,
      temp: 98.4,
      spo2: 99,
      height: 178,
      weight: 76,
      bmi: 24.0,
      triageNotes: 'Routine follow-up for mild hypertension',
    },
  }), []);

  // Selected Active Patient for Consultation
  const [activeTokenId, setActiveTokenId] = useState<string>(() => {
    const inConsult = displayedQueue.find((q) => q.status === 'IN_CONSULTATION');
    if (inConsult) return inConsult.id;
    return displayedQueue[0]?.id || 'apt-001';
  });

  const activeToken = useMemo(() => {
    return displayedQueue.find((q) => q.id === activeTokenId) || displayedQueue[0] || queue[0] || fallbackToken;
  }, [displayedQueue, activeTokenId, queue, fallbackToken]);

  // Full Patient Profile matching activeToken with complete safety guards
  const activePatientProfile = useMemo(() => {
    const tokenAllergies = activeToken?.allergies?.length
      ? activeToken.allergies
      : activeToken?.assessment?.allergies?.length
      ? activeToken.assessment.allergies
      : null;
    const tokenChronic = activeToken?.chronicConditions?.length
      ? activeToken.chronicConditions
      : activeToken?.assessment?.medicalHistory?.length
      ? activeToken.assessment.medicalHistory
      : null;

    const tokenVitals = activeToken?.vitals
      ? {
          bp: activeToken.vitals.bp || '120/80',
          pulse: activeToken.vitals.pulse || 74,
          temp: activeToken.vitals.temp || 98.4,
          spo2: activeToken.vitals.spo2 || 99,
          weight: activeToken.vitals.weight || 76,
          height: activeToken.vitals.height || 178,
          bmi: activeToken.vitals.bmi ? `${activeToken.vitals.bmi}` : '24.0 (Normal)',
        }
      : null;

    const defaultProfile = {
      uhid: activeToken?.uhid || 'UHID-202609-00001',
      firstName: (activeToken?.patient || 'Robert').split(' ')[0] || 'Robert',
      lastName: (activeToken?.patient || 'Fox').split(' ').slice(1).join(' ') || 'Fox',
      phone: activeToken?.phone || '+1 555-019-2834',
      dob: '1988-04-12',
      age: activeToken?.age || 38,
      gender: activeToken?.gender || 'MALE',
      bloodGroup: activeToken?.bloodGroup || 'O+',
      idType: 'Passport',
      idNumber: 'P8920194A',
      emergencyContact: 'Family Contact • ' + (activeToken?.phone || '+1 555-019-2834'),
      insurance: 'Comprehensive Health Plan',
      visitsCount: 1,
      outstandingDue: 0,
      allergies: tokenAllergies || ['None reported'],
      chronicConditions: tokenChronic || ['None reported'],
      recentVisits: [
        { date: '2026-08-14', doctor: 'Dr. Sarah Jenkins', dept: 'Cardiology', diagnosis: 'Seasonal Allergies & Rhinitis' },
      ],
      triageVitals: tokenVitals || {
        bp: '120/80',
        pulse: 74,
        temp: 98.4,
        spo2: 99,
        weight: 76,
        height: 178,
        bmi: '24.0 (Normal)',
      },
    };

    if (!activeToken) return patients[0] ? { ...defaultProfile, ...patients[0] } : defaultProfile;
    const match = patients.find((p) => p.uhid === activeToken.uhid);
    if (match) {
      return {
        ...defaultProfile,
        ...match,
        firstName: match.firstName || defaultProfile.firstName,
        lastName: match.lastName || defaultProfile.lastName,
        allergies: tokenAllergies || (match as any).allergies || defaultProfile.allergies,
        chronicConditions: tokenChronic || (match as any).chronicConditions || defaultProfile.chronicConditions,
        recentVisits: (match as any).recentVisits || defaultProfile.recentVisits,
        triageVitals: tokenVitals || (match as any).triageVitals || defaultProfile.triageVitals,
      };
    }
    return defaultProfile;
  }, [patients, activeToken]);

  // Active Consultation Form State
  const [chiefComplaints, setChiefComplaints] = useState('Persistent dry cough for 4 days, mild sore throat, and intermittent fatigue.');

  // Auto-sync chief complaints when switching active patient
  useEffect(() => {
    if (activeToken) {
      const complaintText =
        activeToken.assessment?.chiefComplaint ||
        activeToken.vitals?.triageNotes ||
        activeToken.triageNotes;
      if (complaintText) {
        setChiefComplaints(complaintText);
      }
    }
  }, [activeToken?.id]);
  const [clinicalFindings, setClinicalFindings] = useState(
    'General: Conscious, oriented, no pallor or icterus.\nThroat: Mild erythematous pharynx without purulent exudates.\nChest: Clear bilaterally, vesicular breath sounds without rhonchi or wheeze.\nCVS: Normal S1, S2 heard, no murmurs.'
  );
  const [diagnosis, setDiagnosis] = useState('Acute Upper Respiratory Tract Infection');
  const [diagnosisCode, setDiagnosisCode] = useState('ICD-10: J06.9');
  const [doctorNotes, setDoctorNotes] = useState('Advised warm saline gargles, adequate hydration (2.5L/day), and symptomatic oral medication. Return if high fever persists beyond 72 hours.');
  const [followUpPreset, setFollowUpPreset] = useState('7');
  const [followUpDate, setFollowUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [followUpReason, setFollowUpReason] = useState('Symptom reassessment and throat resolution check');

  const toggleSymptom = (sym: string) => {
    if (chiefComplaints.includes(sym)) {
      setChiefComplaints((prev) => prev.replace(sym + ', ', '').replace(sym, '').trim());
    } else {
      setChiefComplaints((prev) => (prev ? `${prev}, ${sym}` : sym));
    }
  };

  // E-Prescription Items State (Integrated directly in Consultation)
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
    {
      medicineName: 'Amoxicillin 500mg',
      dosage: '500mg (1 Cap)',
      frequency: '1-0-1',
      timing: 'AFTER_FOOD',
      durationDays: 5,
      totalQuantity: 10,
      reason: 'Bacterial pharyngitis & throat infection coverage',
      instructions: 'Take with a full glass of water after meals',
    },
    {
      medicineName: 'Paracetamol 650mg',
      dosage: '650mg (1 Tab)',
      frequency: '1-0-1 SOS',
      timing: 'AFTER_FOOD',
      durationDays: 3,
      totalQuantity: 6,
      reason: 'Fever reduction & headache/bodyache relief (SOS)',
      instructions: 'Take only if fever > 99°F or headache occurs',
    },
    {
      medicineName: 'Levocetirizine 5mg',
      dosage: '5mg (1 Tab)',
      frequency: '0-0-1',
      timing: 'AFTER_FOOD',
      durationDays: 5,
      totalQuantity: 5,
      reason: 'Allergic rhinitis, sneezing & cough relief',
      instructions: 'Take before bedtime',
    },
  ]);

  const addPrescriptionItem = (medName = '') => {
    const preset = COMMON_MEDICATIONS.find((m) => m.name === medName);
    setPrescriptionItems((prev) => [
      ...prev,
      preset
        ? {
            medicineName: preset.name,
            dosage: preset.dosage,
            frequency: preset.freq,
            timing: preset.timing,
            durationDays: preset.days,
            totalQuantity: preset.days * 2,
            reason: preset.reason,
            instructions: preset.notes,
          }
        : {
            medicineName: medName,
            dosage: '1 Tab',
            frequency: '1-0-1',
            timing: 'AFTER_FOOD',
            durationDays: 5,
            totalQuantity: 10,
            reason: '',
            instructions: 'Take after meals with water',
          },
    ]);
  };

  const removePrescriptionItem = (index: number) => {
    setPrescriptionItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePrescriptionItem = (index: number, field: keyof PrescriptionItem, val: any) => {
    setPrescriptionItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  // Investigation Ordering State
  const [orderedLabTests, setOrderedLabTests] = useState<string[]>(['Complete Blood Count (CBC) with ESR']);
  const [orderedRadiology, setOrderedRadiology] = useState<string[]>(['12-Lead ECG']);
  const [orderPriority, setOrderPriority] = useState<'ROUTINE' | 'STAT'>('ROUTINE');

  const toggleLabTest = (test: string) => {
    setOrderedLabTests((prev) =>
      prev.includes(test) ? prev.filter((t) => t !== test) : [...prev, test]
    );
  };

  const toggleRadiology = (rad: string) => {
    setOrderedRadiology((prev) =>
      prev.includes(rad) ? prev.filter((r) => r !== rad) : [...prev, rad]
    );
  };

  // Editable Schedule State
  const [weeklySchedule, setWeeklySchedule] = useState<ScheduleDay[]>(() => {
    const saved = localStorage.getItem('nh_doctor_schedule');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.weeklySchedule) return parsed.weeklySchedule;
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_WEEKLY_SCHEDULE;
  });

  const [slotDuration, setSlotDuration] = useState('15');
  const [consultationFee, setConsultationFee] = useState('80.00');
  const [followUpFee, setFollowUpFee] = useState('45.00');

  const handleUpdateScheduleDay = (index: number, field: keyof ScheduleDay, val: any) => {
    setWeeklySchedule((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const handleSaveSchedule = () => {
    localStorage.setItem(
      'nh_doctor_schedule',
      JSON.stringify({
        weeklySchedule,
        slotDuration,
        consultationFee,
        followUpFee,
        doctorChamber,
      })
    );
    localStorage.setItem('nh_doctor_chamber', doctorChamber);
    showToast('✓ Weekly schedule and consultation settings saved successfully.');
  };

  // Modals
  const [showPrintRxModal, setShowPrintRxModal] = useState(false);
  const [rxToPrint, setRxToPrint] = useState<SharedPrescription | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareRx, setShareRx] = useState<SharedPrescription | null>(null);
  const [showReferModal, setShowReferModal] = useState(false);
  const [referDept, setReferDept] = useState('Pulmonology / Chest Medicine');
  const [referReason, setReferReason] = useState('Persistent cough unresolving; rule out bronchial asthma or atypical pneumonia.');
  const [showProgressNoteModal, setShowProgressNoteModal] = useState(false);
  const [selectedRoundPatient, setSelectedRoundPatient] = useState<SharedInpatientRound | null>(null);
  const [progressNoteText, setProgressNoteText] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Queue Operations
  const handleCallNext = () => {
    const nextWaiting = displayedQueue.find((q) => q.status === 'WAITING');
    if (!nextWaiting) {
      showToast('All registered queue patients have been attended to!');
      return;
    }
    patientJourneyService.updateQueueToken(nextWaiting.token, {
      status: 'IN_CONSULTATION',
      callingStatus: 'CALLING',
    });
    setActiveTokenId(nextWaiting.id);
    setDoctorStatus('IN_CONSULTATION');
    setQueue(patientJourneyService.getQueue());
    showToast(`📢 Calling Token #${nextWaiting.token} (${nextWaiting.patient}) to ${doctorChamber}`);
  };

  const handleStartConsultation = (token: SharedQueueToken) => {
    patientJourneyService.updateQueueToken(token.token, {
      status: 'IN_CONSULTATION',
      callingStatus: 'ACCEPTED',
    });
    setActiveTokenId(token.id);
    setDoctorStatus('IN_CONSULTATION');
    setQueue(patientJourneyService.getQueue());
    setActiveTab('consultation');
    showToast(`Consultation commenced for ${token.patient} (Token #${token.token})`);
  };

  const handleDispatchLabOrders = () => {
    if (!activeToken) return;
    if (orderedLabTests.length === 0 && orderedRadiology.length === 0) {
      showToast('Please select at least one lab test or radiology investigation.');
      return;
    }
    [...orderedLabTests, ...orderedRadiology].forEach((testName, i) => {
      patientJourneyService.addLabOrder({
        id: `lab-${Date.now()}-${i}`,
        orderNo: `LAB-202609-${Math.floor(100 + Math.random() * 900)}`,
        patientName: activeToken.patient,
        uhid: activeToken.uhid,
        age: activeToken.age,
        gender: activeToken.gender,
        testName,
        category: orderedRadiology.includes(testName) ? 'Radiology' : 'Clinical Pathology',
        sampleType: orderedRadiology.includes(testName) ? 'Imaging Scan' : 'Venous Blood',
        container: orderedRadiology.includes(testName) ? 'N/A' : 'EDTA / Serum Tube',
        doctor: doctorName,
        barcode: `8902026${Math.floor(1000 + Math.random() * 9000)}`,
        stage: 'COLLECTED',
        price: orderedRadiology.includes(testName) ? 75.0 : 35.0,
        isFlaggedAbnormal: false,
        parameters: [],
        technicianNote: `${orderPriority} Order dispatched directly from ${doctorName}'s chamber`,
      });
    });
    showToast(`✓ ${orderedLabTests.length + orderedRadiology.length} Diagnostic Orders dispatched to Laboratory.`);
  };

  const handleCompleteConsultation = () => {
    if (!activeToken) return;

    // 1. Mark Queue Token as Completed
    patientJourneyService.updateQueueToken(activeToken.token, {
      status: 'COMPLETED',
      checkoutTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    // 2. Issue Official Prescription
    const newRxNo = `RX-202609-${Math.floor(100 + Math.random() * 900)}`;
    const newPrescription: SharedPrescription = {
      id: `rx-${Date.now()}`,
      prescriptionNo: newRxNo,
      uhid: activeToken.uhid,
      patientName: activeToken.patient,
      age: activeToken.age,
      gender: activeToken.gender,
      doctorName,
      doctorSpecialization,
      chamber: doctorChamber,
      date: new Date().toISOString().split('T')[0],
      diagnosis,
      diagnosisCode,
      chiefComplaints,
      clinicalNotes: doctorNotes,
      vitals: activeToken.vitals
        ? {
            bp: activeToken.vitals.bp,
            pulse: activeToken.vitals.pulse,
            temp: activeToken.vitals.temp,
            spo2: activeToken.vitals.spo2,
            weight: activeToken.vitals.weight,
          }
        : undefined,
      items: prescriptionItems.filter((p) => p.medicineName.trim().length > 0),
      followUpDate,
      isDispensed: false,
    };
    patientJourneyService.addPrescription(newPrescription);
    setPrescriptions(patientJourneyService.getPrescriptions());

    // 3. Dispatch Investigation Orders
    if (orderedLabTests.length > 0 || orderedRadiology.length > 0) {
      [...orderedLabTests, ...orderedRadiology].forEach((testName, i) => {
        patientJourneyService.addLabOrder({
          id: `lab-${Date.now()}-${i}`,
          orderNo: `LAB-202609-${Math.floor(100 + Math.random() * 900)}`,
          patientName: activeToken.patient,
          uhid: activeToken.uhid,
          age: activeToken.age,
          gender: activeToken.gender,
          testName,
          category: orderedRadiology.includes(testName) ? 'Radiology' : 'Pathology',
          sampleType: orderedRadiology.includes(testName) ? 'Scan' : 'Venous Blood',
          container: 'Standard',
          doctor: doctorName,
          barcode: `8902026${Math.floor(1000 + Math.random() * 9000)}`,
          stage: 'COLLECTED',
          price: 45.0,
          isFlaggedAbnormal: false,
          parameters: [],
        });
      });
    }

    // 4. Record Follow-Up in System
    if (followUpDate) {
      patientJourneyService.addFollowUp({
        id: `fu-${Date.now()}`,
        uhid: activeToken.uhid,
        patientName: activeToken.patient,
        phone: activeToken.phone,
        doctorName,
        prescribedOn: new Date().toISOString().split('T')[0],
        followUpDate,
        reason: followUpReason,
        status: 'PENDING_BOOKING',
      });
      setFollowUps(patientJourneyService.getFollowUps());
    }

    // 5. Route itemized consultation fee to Billing
    patientJourneyService.addInvoice({
      id: `inv-opd-${Date.now()}`,
      invNo: `INV-OPD-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName: activeToken.patient,
      uhid: activeToken.uhid,
      phone: activeToken.phone,
      category: 'OPD',
      date: new Date().toISOString().split('T')[0],
      subtotal: Number(consultationFee),
      discount: 0,
      tax: 0,
      advanceDeducted: 0,
      total: Number(consultationFee),
      paid: Number(consultationFee),
      balance: 0,
      status: 'PAID',
      items: [
        {
          source: 'Consultation',
          description: `Specialist OPD Consultation - ${doctorName} (${doctorSpecialization})`,
          qty: 1,
          unitPrice: Number(consultationFee),
          total: Number(consultationFee),
        },
      ],
    });

    setQueue(patientJourneyService.getQueue());
    setDoctorStatus('AVAILABLE');
    showToast(`✓ Consultation finalized for ${activeToken.patient}. Official Rx #${newRxNo} issued.`);
  };

  const handleReferPatient = () => {
    if (!activeToken) return;
    patientJourneyService.updateQueueToken(activeToken.token, {
      status: 'COMPLETED',
      triageNotes: `Referred to ${referDept} by ${doctorName}: ${referReason}`,
    });
    setQueue(patientJourneyService.getQueue());
    setShowReferModal(false);
    showToast(`✓ Patient ${activeToken.patient} successfully referred to ${referDept}.`);
  };

  // Calculations for KPI Cards
  const stats = useMemo(() => {
    const totalAppointments = displayedQueue.length + 8;
    const waiting = displayedQueue.filter((q) => q.status === 'WAITING').length;
    const completed = displayedQueue.filter((q) => q.status === 'COMPLETED').length + 8;
    const followUpsDue = followUps.filter((f) => f.status === 'PENDING_BOOKING').length;
    const activeAlerts = emergencyAlerts.filter((a) => a.status === 'ACTIVE').length;

    return {
      totalAppointments,
      waiting,
      completed,
      followUpsDue,
      activeAlerts,
    };
  }, [displayedQueue, followUps, emergencyAlerts]);

  // Filtered Queue for Tab 2
  const filteredQueueList = useMemo(() => {
    if (queueSubFilter === 'appointments') {
      return displayedQueue.filter((q) => q.type === 'SCHEDULED');
    }
    if (queueSubFilter === 'followups') {
      return displayedQueue.filter((q) => q.type === 'FOLLOW_UP' || q.vitals?.triageNotes?.toLowerCase().includes('follow'));
    }
    if (queueSubFilter === 'completed') {
      return displayedQueue.filter((q) => q.status === 'COMPLETED');
    }
    return displayedQueue;
  }, [displayedQueue, queueSubFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* ========================================================================= */}
      {/* 1. TOP EXECUTIVE DOCTOR CONTROL STRIP                                     */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Left: Doctor Station Telemetry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)',
            }}
          >
            <Stethoscope size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                {doctorName}
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(2, 132, 199, 0.25)',
                  color: '#38bdf8',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                Lead Consultant
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              {doctorSpecialization} • <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{doctorChamber}</span> • Morning Shift (08:30 - 15:00)
            </div>
          </div>
        </div>

        {/* Right: Presence Status, Queue Scope, & Quick Call */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
          {/* Status Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
            <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Status:</span>
            <select
              value={doctorStatus}
              onChange={(e) => setDoctorStatus(e.target.value as any)}
              style={{
                backgroundColor: doctorStatus === 'AVAILABLE' ? '#10b981' : doctorStatus === 'IN_CONSULTATION' ? '#0284c7' : doctorStatus === 'BREAK' ? '#f59e0b' : '#64748b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.75rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="AVAILABLE">🟢 Available for Next</option>
              <option value="IN_CONSULTATION">🔵 In Consultation</option>
              <option value="BREAK">🟡 Break / Ward Rounds</option>
              <option value="OFFLINE">⚪ Offline / Off Duty</option>
            </select>
          </div>

          {/* Queue Filter: My Queue vs All OPD */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '0.25rem',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <button
              onClick={() => setDoctorFilter('my')}
              style={{
                border: 'none',
                backgroundColor: doctorFilter === 'my' ? '#0284c7' : 'transparent',
                color: '#ffffff',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              My Queue ({displayedQueue.length})
            </button>
            <button
              onClick={() => setDoctorFilter('all')}
              style={{
                border: 'none',
                backgroundColor: doctorFilter === 'all' ? '#0284c7' : 'transparent',
                color: '#ffffff',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              All OPD ({queue.length})
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleCallNext}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#f59e0b',
              color: '#0f172a',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)',
            }}
          >
            <Users size={18} />
            Call Next
          </button>

          <button
            onClick={refreshAllData}
            title="Sync Data from Reception"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '0.6rem 0.95rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
            Sync
          </button>
        </div>
      </div>

      {/* Emergency Casualty Red Alert Banner if active */}
      {stats.activeAlerts > 0 && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            borderBottom: '2px solid #ef4444',
            padding: '0.75rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.875rem',
            color: '#991b1b',
            fontWeight: 700,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldAlert size={20} color="#dc2626" />
            <span>
              EMERGENCY RED ALERT: Marcus Brody (52M) in ER Bay 02 • Acute ST-elevation MI. STAT Cardiology Evaluation requested.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('inpatient')}
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.85rem',
              fontSize: '0.8125rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            View Alert ➔
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STREAMLINED TOP NAVIGATION BAR (6 Focused Clinical Pillars)            */}
      {/* ========================================================================= */}
      <div
        style={{
          padding: '0.75rem 2rem',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          gap: '0.75rem',
          overflowX: 'auto',
          alignItems: 'center',
        }}
      >
        {[
          { id: 'dashboard', label: '1. Dashboard', icon: <LayoutDashboard size={18} /> },
          { id: 'queue', label: '2. Queue & Appointments', icon: <Users size={18} />, count: displayedQueue.length },
          { id: 'consultation', label: '3. Patient Consultation & Rx', icon: <Stethoscope size={18} /> },
          { id: 'schedule', label: '4. My Schedule', icon: <Clock size={18} /> },
          { id: 'reports', label: '5. Reports & Analytics', icon: <BarChart2 size={18} /> },
          { id: 'inpatient', label: '6. Inpatient Rounds', icon: <BedDouble size={18} />, count: inpatientRounds.length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                padding: '0.625rem 1.15rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? '#0284c7' : 'transparent',
                color: isActive ? '#ffffff' : '#475569',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : '#e2e8f0',
                    color: isActive ? '#ffffff' : '#334155',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN BODY CONTAINER                                                   */}
      {/* ========================================================================= */}
      <div className="page-body" style={{ padding: '1.75rem 2rem', gap: '1.5rem' }}>
        {/* ======================================================================= */}
        {/* TAB 1: EXECUTIVE DOCTOR DASHBOARD (HOME)                                */}
        {/* ======================================================================= */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Top 4 KPI Cards (Spacious, bold legibility) */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
              <div
                className="stat-card"
                style={{ cursor: 'pointer', padding: '1.25rem' }}
                onClick={() => setActiveTab('queue')}
              >
                <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                  <Calendar size={26} />
                </div>
                <div>
                  <div className="stat-value" style={{ fontSize: '1.75rem' }}>{stats.totalAppointments}</div>
                  <div className="stat-label" style={{ fontSize: '0.875rem' }}>Today's Appointments</div>
                </div>
              </div>

              <div
                className="stat-card"
                style={{ cursor: 'pointer', padding: '1.25rem' }}
                onClick={() => setActiveTab('queue')}
              >
                <div className="stat-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                  <Users size={26} />
                </div>
                <div>
                  <div className="stat-value" style={{ fontSize: '1.75rem', color: '#b45309' }}>{stats.waiting}</div>
                  <div className="stat-label" style={{ fontSize: '0.875rem' }}>Patients Waiting in Lobby</div>
                </div>
              </div>

              <div
                className="stat-card"
                style={{ cursor: 'pointer', padding: '1.25rem' }}
                onClick={() => setActiveTab('queue')}
              >
                <div className="stat-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                  <CheckCircle2 size={26} />
                </div>
                <div>
                  <div className="stat-value" style={{ fontSize: '1.75rem', color: '#047857' }}>{stats.completed}</div>
                  <div className="stat-label" style={{ fontSize: '0.875rem' }}>Consultations Completed</div>
                </div>
              </div>

              <div
                className="stat-card"
                style={{ cursor: 'pointer', padding: '1.25rem' }}
                onClick={() => setActiveTab('queue')}
              >
                <div className="stat-icon" style={{ backgroundColor: '#ede9fe', color: '#7c3aed' }}>
                  <ClipboardList size={26} />
                </div>
                <div>
                  <div className="stat-value" style={{ fontSize: '1.75rem', color: '#6d28d9' }}>{stats.followUpsDue}</div>
                  <div className="stat-label" style={{ fontSize: '0.875rem' }}>Follow-ups Due Today</div>
                </div>
              </div>
            </div>

            {/* Doctor Queue Flow Radar (Current In-Chamber + Next Up) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Box 1: Current In-Chamber Patient */}
              <div
                className="card"
                style={{
                  borderLeft: '5px solid #0284c7',
                  backgroundColor: '#ffffff',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.8125rem',
                        fontWeight: 800,
                        color: '#0284c7',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
                      Current In Chamber
                    </span>
                    {activeToken && <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>Token #{activeToken.token}</span>}
                  </div>
                  <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>In Consultation</span>
                </div>

                {activeToken ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--secondary)' }}>
                          {activeToken.patient}
                        </h3>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          UHID: {activeToken.uhid} • {activeToken.age} Yrs / {activeToken.gender} • Blood: {activeToken.bloodGroup}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Slot Time</div>
                        <strong style={{ fontSize: '1rem', color: 'var(--secondary)' }}>{activeToken.time}</strong>
                      </div>
                    </div>

                    {/* Vitals Summary Strip */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '0.875rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>BP</div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{activeToken.vitals?.bp || '120/80'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PULSE</div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{activeToken.vitals?.pulse || 74} <span style={{ fontSize: '0.75rem' }}>bpm</span></div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TEMP</div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{activeToken.vitals?.temp || 98.4}°F</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SPO2</div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#047857' }}>{activeToken.vitals?.spo2 || 99}%</div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                      <strong>Chief Complaint:</strong> {activeToken.vitals?.triageNotes || 'Fever and dry cough for 3 days'}
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button
                        onClick={() => setActiveTab('consultation')}
                        className="btn btn-primary"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.875rem' }}
                      >
                        <Stethoscope size={18} /> Open Patient Consultation & Rx
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No patient currently in chamber. Click "Call Next" to summon the first waiting patient.
                  </div>
                )}
              </div>

              {/* Box 2: Next Patient On Deck */}
              <div
                className="card"
                style={{
                  borderLeft: '5px solid #f59e0b',
                  backgroundColor: '#ffffff',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8125rem',
                      fontWeight: 800,
                      color: '#d97706',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    <Clock size={16} />
                    Next On Deck
                  </span>
                  <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>Waiting in Lobby</span>
                </div>

                {displayedQueue.find((q) => q.status === 'WAITING') ? (
                  (() => {
                    const nextP = displayedQueue.find((q) => q.status === 'WAITING')!;
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--secondary)' }}>
                              {nextP.patient}
                            </h3>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              Token #{nextP.token} • UHID: {nextP.uhid} • {nextP.age}Y / {nextP.gender}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Slot</div>
                            <strong style={{ fontSize: '1rem', color: 'var(--secondary)' }}>{nextP.time}</strong>
                          </div>
                        </div>

                        <div style={{ backgroundColor: '#fffbeb', padding: '0.875rem', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '0.875rem', color: '#92400e' }}>
                          <strong>Triage Note:</strong> {nextP.vitals?.triageNotes || 'Routine checkup / Follow-up review'}
                          {nextP.vitals && (
                            <div style={{ marginTop: '0.35rem', fontWeight: 600 }}>
                              Triaged BP: {nextP.vitals.bp} | Pulse: {nextP.vitals.pulse} bpm | SpO2: {nextP.vitals.spo2}%
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                          <button
                            onClick={() => handleStartConsultation(nextP)}
                            className="btn btn-primary"
                            style={{ flex: 1, fontWeight: 800, fontSize: '0.875rem' }}
                          >
                            Call to Chamber Now ➔
                          </button>
                        </div>
                      </>
                    );
                  })()
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    All registered queue patients have been attended to!
                  </div>
                )}
              </div>
            </div>

            {/* Inpatient & Critical Care Snapshot */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <BedDouble size={22} color="#0284c7" />
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--secondary)' }}>
                    Inpatient Ward & Critical Care Rounds ({inpatientRounds.length} Admitted Patients)
                  </h3>
                </div>
                <button onClick={() => setActiveTab('inpatient')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.85rem' }}>
                  Manage Inpatient Rounds ➔
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {inpatientRounds.map((round) => (
                  <div
                    key={round.id}
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: round.roundStatus === 'COMPLETED' ? '#f0fdf4' : '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--secondary)' }}>
                        {round.patientName}
                      </span>
                      <span className={round.roundStatus === 'COMPLETED' ? 'badge badge-success' : 'badge badge-warning'}>
                        {round.roundStatus === 'COMPLETED' ? 'Done' : 'Pending'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#0284c7', fontWeight: 700, marginTop: '0.25rem' }}>
                      {round.bedCode} • {round.wardName.split('(')[0]}
                    </div>
                    <div style={{ fontSize: '0.7813rem', color: 'var(--text-muted)', marginTop: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {round.primaryDiagnosis}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 2: UNIFIED QUEUE & APPOINTMENTS                                     */}
        {/* ======================================================================= */}
        {activeTab === 'queue' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--secondary)' }}>
                  Patient Queue & Appointments Roster
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Live OPD queue tokens, scheduled appointment slots, and follow-ups assigned by Reception.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={handleCallNext} className="btn btn-primary" style={{ fontWeight: 800, fontSize: '0.875rem' }}>
                  <Users size={18} /> Call Next in Line
                </button>
              </div>
            </div>

            {/* Sub-Filter Navigation Pills */}
            <div style={{ display: 'flex', gap: '0.625rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              {[
                { id: 'all', label: `All Active Queue (${displayedQueue.length})` },
                { id: 'appointments', label: `Scheduled Slots (${displayedQueue.filter((q) => q.type === 'SCHEDULED').length})` },
                { id: 'followups', label: `Follow-Ups Due (${followUps.filter((f) => f.status === 'PENDING_BOOKING').length})` },
                { id: 'completed', label: `Completed Today (${displayedQueue.filter((q) => q.status === 'COMPLETED').length})` },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setQueueSubFilter(pill.id as any)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: queueSubFilter === pill.id ? '#0284c7' : '#cbd5e1',
                    backgroundColor: queueSubFilter === pill.id ? '#eff6ff' : '#ffffff',
                    color: queueSubFilter === pill.id ? '#0284c7' : '#475569',
                    fontWeight: queueSubFilter === pill.id ? 800 : 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Queue Table */}
            <div className="card" style={{ padding: 0, borderRadius: '12px', overflow: 'hidden' }}>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '85px', fontSize: '0.8125rem' }}>Token</th>
                      <th style={{ fontSize: '0.8125rem' }}>Patient Name & UHID</th>
                      <th style={{ fontSize: '0.8125rem' }}>Age / Gender</th>
                      <th style={{ fontSize: '0.8125rem' }}>Slot & Type</th>
                      <th style={{ fontSize: '0.8125rem' }}>Chief Complaint / Nurse Triage</th>
                      <th style={{ fontSize: '0.8125rem' }}>Priority</th>
                      <th style={{ fontSize: '0.8125rem' }}>Status</th>
                      <th style={{ textAlign: 'right', fontSize: '0.8125rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQueueList.map((item) => {
                      const isActive = item.id === activeToken?.id;
                      return (
                        <tr key={item.id} style={{ backgroundColor: isActive ? '#f0f9ff' : undefined }}>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                backgroundColor: isActive ? '#0284c7' : '#e2e8f0',
                                color: isActive ? '#ffffff' : '#334155',
                                fontWeight: 900,
                                fontSize: '0.9375rem',
                              }}
                            >
                              #{item.token}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: 'var(--secondary)', fontSize: '0.9375rem' }}>{item.patient}</strong>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{item.uhid}</div>
                          </td>
                          <td style={{ fontSize: '0.875rem' }}>{item.age}Y / {item.gender}</td>
                          <td>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.time}</div>
                            <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>{item.type}</span>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.875rem', color: '#334155' }}>
                              {item.vitals?.triageNotes || 'Routine consultation'}
                            </div>
                            {item.vitals && (
                              <div style={{ fontSize: '0.7813rem', color: '#047857', fontWeight: 600, marginTop: '0.2rem' }}>
                                BP: {item.vitals.bp} • Pulse: {item.vitals.pulse} • SpO2: {item.vitals.spo2}%
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={item.priority === 'URGENT' ? 'badge badge-warning' : item.priority === 'VIP' ? 'badge badge-info' : 'badge badge-secondary'} style={{ fontSize: '0.7813rem' }}>
                              {item.priority || 'NORMAL'}
                            </span>
                          </td>
                          <td>
                            <span className={item.status === 'IN_CONSULTATION' ? 'badge badge-info' : item.status === 'COMPLETED' ? 'badge badge-success' : 'badge badge-warning'} style={{ fontSize: '0.7813rem' }}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                              {item.status !== 'COMPLETED' ? (
                                <button
                                  onClick={() => handleStartConsultation(item)}
                                  className="btn btn-primary btn-sm"
                                  style={{ fontWeight: 800, fontSize: '0.8125rem' }}
                                >
                                  Consult
                                </button>
                              ) : (
                                <span style={{ color: '#047857', fontSize: '0.8125rem', fontWeight: 800 }}>✓ Done</span>
                              )}
                              <button
                                onClick={() => {
                                  setActiveTokenId(item.id);
                                  setShowReferModal(true);
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.8125rem' }}
                              >
                                Refer
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 3: 3-COLUMN ENTERPRISE CLINICAL WORKSTATION & DIGITAL RX            */}
        {/* ======================================================================= */}
        {activeTab === 'consultation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top Page Header (Parity with Tab 2) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--secondary)' }}>
                  Patient Clinical Consultation & Digital Prescription (Rx)
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Active chamber encounter for {activePatientProfile?.firstName || 'Patient'} {activePatientProfile?.lastName || ''} • Token #{activeToken?.token || 1} • Chamber 204 • Lead: {doctorName}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => showToast('✓ Consultation draft saved successfully.')}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.875rem' }}
                >
                  <Save size={16} /> Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tempRx: SharedPrescription = {
                      id: `temp-${Date.now()}`,
                      prescriptionNo: `PREVIEW-${Math.floor(100 + Math.random() * 900)}`,
                      uhid: activePatientProfile.uhid,
                      patientName: `${activePatientProfile.firstName} ${activePatientProfile.lastName}`,
                      age: activePatientProfile.age,
                      gender: String(activePatientProfile.gender),
                      doctorName,
                      doctorSpecialization,
                      chamber: doctorChamber,
                      date: new Date().toISOString().split('T')[0],
                      diagnosis,
                      diagnosisCode,
                      chiefComplaints,
                      clinicalNotes: doctorNotes,
                      items: prescriptionItems,
                      followUpDate,
                    };
                    setRxToPrint(tempRx);
                    setShowPrintRxModal(true);
                  }}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.875rem' }}
                >
                  <Printer size={16} /> Print Rx
                </button>
                <button
                  type="button"
                  onClick={handleCompleteConsultation}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.875rem' }}
                >
                  <CheckCircle2 size={18} /> Finalize Visit & Issue Rx ➔
                </button>
              </div>
            </div>

            {/* ======================================================================= */}
            {/* 3-COLUMN ENTERPRISE CLINICAL WORKSPACE GRID                             */}
            {/* Left: Patient Context (Sticky) | Center: Active Tab | Right: Records    */}
            {/* ======================================================================= */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '290px minmax(0, 1fr) 310px',
                gap: '1.25rem',
                alignItems: 'start',
              }}
            >
              {/* ==================== COLUMN 1: LEFT PANEL (STICKY PATIENT CONTEXT) ==================== */}
              <div style={{ position: 'sticky', top: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Card 1: Patient Identity & Safety Badges */}
                <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid #0284c7' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.15rem',
                        boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)',
                        flexShrink: 0,
                      }}
                    >
                      {(activePatientProfile?.firstName?.[0] || 'P')}
                      {(activePatientProfile?.lastName?.[0] || 'T')}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activePatientProfile?.firstName || 'Patient'} {activePatientProfile?.lastName || ''}
                      </strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                        <span className="badge badge-info" style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem' }}>Token #{activeToken?.token || 1}</span>
                        <span className="badge badge-secondary" style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem' }}>{activeToken?.type || 'OPD'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                    <div>UHID: <strong style={{ color: '#0f172a' }}>{activePatientProfile.uhid}</strong></div>
                    <div>Age / Gender: <strong style={{ color: '#0f172a' }}>{activePatientProfile.age}Y / {activePatientProfile.gender}</strong></div>
                    <div>Blood Group: <strong style={{ color: '#ef4444' }}>{activePatientProfile.bloodGroup}</strong></div>
                    <div>Phone: <strong style={{ color: '#0f172a' }}>{activePatientProfile.phone}</strong></div>
                  </div>

                  {/* Safety Alerts: Allergies & Chronic Conditions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '0.45rem 0.65rem', borderRadius: '8px', color: '#991b1b', fontSize: '0.8125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
                      <span>Allergies: <strong>Penicillin, Sulfa</strong></span>
                    </div>
                    <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '0.45rem 0.65rem', borderRadius: '8px', color: '#92400e', fontSize: '0.8125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <HeartPulse size={15} color="#b45309" style={{ flexShrink: 0 }} />
                      <span>Chronic: <strong>Hypertension (5Y)</strong></span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Nurse Triaged Vitals Tiles */}
                <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Activity size={16} color="#0284c7" />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Triaged Vitals
                      </span>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>✓ Normal</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div style={{ backgroundColor: '#f8fafc', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>BP</div>
                      <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>120/80</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}> mmHg</span>
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>PULSE</div>
                      <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>74</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}> bpm</span>
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>TEMP</div>
                      <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>98.4</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}> °F</span>
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>SpO2</div>
                      <strong style={{ fontSize: '0.875rem', color: '#047857' }}>99%</strong>
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>HT / WT</div>
                      <strong style={{ fontSize: '0.7813rem', color: '#0f172a' }}>178cm/76kg</strong>
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>BMI</div>
                      <strong style={{ fontSize: '0.875rem', color: '#0284c7' }}>24.0</strong>
                    </div>
                  </div>
                </div>

                {/* Card 3: Quick Past Visits Summary */}
                <div className="card" style={{ padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Past Visits:</div>
                    <strong style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>{activePatientProfile.visitsCount} Consultations</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRightHistoryTab('visits')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.55rem' }}
                  >
                    <History size={13} /> View
                  </button>
                </div>
              </div>

              {/* ==================== COLUMN 2: CENTER PANEL (ACTIVE WORKFLOW WORKSPACE) ==================== */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
                {/* Sequential Workflow Tabs Bar (Parity with Tab 2 Queue pills) */}
                <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.625rem', overflowX: 'auto' }}>
                  {[
                    { id: 'assessment', label: '1. Assessment & Diagnosis', icon: Stethoscope },
                    { id: 'prescription', label: `2. Prescription (Rx - ${prescriptionItems.length})`, icon: Pill },
                    { id: 'investigations', label: `3. Diagnostic Orders (${orderedLabTests.length + orderedRadiology.length})`, icon: FlaskConical },
                    { id: 'followup', label: '4. Follow-Up & Plan', icon: Calendar },
                  ].map((tab) => {
                    const IconComp = tab.icon;
                    const isActive = consultationWorkflowStep === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setConsultationWorkflowStep(tab.id as any)}
                        style={{
                          padding: '0.55rem 1rem',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: isActive ? '#0284c7' : '#cbd5e1',
                          backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                          color: isActive ? '#0284c7' : '#475569',
                          fontWeight: isActive ? 800 : 600,
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <IconComp size={16} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* ONLY ONE TAB ACTIVE AT A TIME */}

                {/* TAB 1: ASSESSMENT & DIAGNOSIS */}
                {consultationWorkflowStep === 'assessment' && (
                  <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                      <Stethoscope size={20} color="#0284c7" />
                      <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
                        Clinical Assessment & Provisional Diagnosis
                      </h4>
                    </div>

                    {/* Chief Complaints & HPI */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontWeight: 800, fontSize: '0.9375rem', margin: 0 }}>
                          Chief Complaints & History of Present Illness (HPI) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Click symptom chips to append</span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.75rem' }}>
                        {COMMON_SYMPTOMS.map((sym) => {
                          const isSelected = chiefComplaints.includes(sym);
                          return (
                            <button
                              key={sym}
                              type="button"
                              onClick={() => toggleSymptom(sym)}
                              style={{
                                padding: '0.35rem 0.75rem',
                                borderRadius: '6px',
                                border: `1px solid ${isSelected ? '#0284c7' : '#cbd5e1'}`,
                                backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                                color: isSelected ? '#0284c7' : '#475569',
                                fontSize: '0.8125rem',
                                fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              {isSelected ? '✓ ' : '+ '}
                              {sym}
                            </button>
                          );
                        })}
                      </div>

                      <textarea
                        className="form-textarea"
                        rows={4}
                        style={{ fontSize: '0.9375rem', lineHeight: '1.5', width: '100%' }}
                        value={chiefComplaints}
                        onChange={(e) => setChiefComplaints(e.target.value)}
                        placeholder="Describe patient onset, duration, severity, and aggravating factors..."
                      />
                    </div>

                    {/* Physical Examination */}
                    <div>
                      <label className="form-label" style={{ fontWeight: 800, fontSize: '0.9375rem', marginBottom: '0.5rem' }}>
                        Physical & Systemic Examination Notes
                      </label>
                      <textarea
                        className="form-textarea"
                        rows={4}
                        style={{ fontSize: '0.9375rem', lineHeight: '1.5', width: '100%' }}
                        value={clinicalFindings}
                        onChange={(e) => setClinicalFindings(e.target.value)}
                        placeholder="General appearance, respiratory, cardiovascular, ENT, and abdominal findings..."
                      />
                    </div>

                    {/* Provisional Diagnosis & ICD-10 Code */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: 800, fontSize: '0.9375rem' }}>
                          Primary Provisional Diagnosis <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          className="form-input"
                          style={{ fontSize: '0.9375rem' }}
                          value={diagnosis}
                          onChange={(e) => setDiagnosis(e.target.value)}
                          placeholder="e.g. Acute Upper Respiratory Tract Infection"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: 800, fontSize: '0.9375rem' }}>
                          ICD-10 Code
                        </label>
                        <input
                          className="form-input"
                          style={{ fontSize: '0.9375rem' }}
                          value={diagnosisCode}
                          onChange={(e) => setDiagnosisCode(e.target.value)}
                          placeholder="e.g. ICD-10: J06.9"
                        />
                      </div>
                    </div>

                    {/* Step Navigation Action */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                      <button
                        type="button"
                        onClick={() => setConsultationWorkflowStep('prescription')}
                        className="btn btn-primary"
                        style={{ fontWeight: 800, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
                      >
                        Proceed to Prescription (Rx) <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: PRESCRIPTION (RX FORMULARY BUILDER) */}
                {consultationWorkflowStep === 'prescription' && (
                  <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Pill size={18} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
                          Digital Prescription & Medication Orders (Rx)
                        </h4>
                        <span className="badge badge-info" style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                          {prescriptionItems.length} Prescribed
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => addPrescriptionItem()}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 700 }}
                      >
                        <Plus size={16} /> Add Custom Drug
                      </button>
                    </div>

                    {/* Quick Formulary Selection Chips */}
                    <div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.45rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Quick Formulary Selection (Click to add with standard dosage & indication):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                        {COMMON_MEDICATIONS.map((med) => (
                          <button
                            key={med.name}
                            type="button"
                            onClick={() => addPrescriptionItem(med.name)}
                            style={{
                              padding: '0.4rem 0.75rem',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#f8fafc',
                              color: '#334155',
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#eff6ff';
                              e.currentTarget.style.borderColor = '#0284c7';
                              e.currentTarget.style.color = '#0284c7';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#f8fafc';
                              e.currentTarget.style.borderColor = '#cbd5e1';
                              e.currentTarget.style.color = '#334155';
                            }}
                          >
                            <Plus size={13} /> {med.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Prescription Table with Reason Column */}
                    <div className="table-container" style={{ borderRadius: '10px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
                      <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ width: '40px', fontSize: '0.8125rem', textAlign: 'center' }}>#</th>
                            <th style={{ fontSize: '0.8125rem', minWidth: '180px' }}>Medicine Name & Strength</th>
                            <th style={{ width: '110px', fontSize: '0.8125rem' }}>Dosage</th>
                            <th style={{ width: '130px', fontSize: '0.8125rem' }}>Frequency</th>
                            <th style={{ width: '125px', fontSize: '0.8125rem' }}>Timing</th>
                            <th style={{ width: '75px', fontSize: '0.8125rem' }}>Days</th>
                            <th style={{ fontSize: '0.8125rem', minWidth: '220px' }}>
                              Reason for Prescribing / Indication <span style={{ color: '#ef4444' }}>*</span>
                            </th>
                            <th style={{ fontSize: '0.8125rem', minWidth: '180px' }}>Instructions</th>
                            <th style={{ width: '45px', textAlign: 'center' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {prescriptionItems.length === 0 ? (
                            <tr>
                              <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                                No medications prescribed yet. Select from the quick formulary above or choose from Right Panel Rx History.
                              </td>
                            </tr>
                          ) : (
                            prescriptionItems.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.8125rem' }}>
                                  {idx + 1}
                                </td>
                                <td>
                                  <input
                                    className="form-input"
                                    style={{ fontSize: '0.875rem', padding: '0.45rem 0.65rem', fontWeight: 600 }}
                                    value={item.medicineName}
                                    onChange={(e) => updatePrescriptionItem(idx, 'medicineName', e.target.value)}
                                    placeholder="Drug name & strength"
                                  />
                                </td>
                                <td>
                                  <input
                                    className="form-input"
                                    style={{ fontSize: '0.875rem', padding: '0.45rem 0.65rem' }}
                                    value={item.dosage}
                                    onChange={(e) => updatePrescriptionItem(idx, 'dosage', e.target.value)}
                                  />
                                </td>
                                <td>
                                  <select
                                    className="form-select"
                                    style={{ fontSize: '0.875rem', padding: '0.45rem 0.65rem' }}
                                    value={item.frequency}
                                    onChange={(e) => updatePrescriptionItem(idx, 'frequency', e.target.value)}
                                  >
                                    <option value="1-0-1">1-0-1 (BID)</option>
                                    <option value="1-0-0">1-0-0 (Morning)</option>
                                    <option value="0-0-1">0-0-1 (Night)</option>
                                    <option value="1-1-1">1-1-1 (TID)</option>
                                    <option value="1-0-1 SOS">1-0-1 SOS</option>
                                    <option value="QID">QID (4x)</option>
                                  </select>
                                </td>
                                <td>
                                  <select
                                    className="form-select"
                                    style={{ fontSize: '0.875rem', padding: '0.45rem 0.65rem' }}
                                    value={item.timing || 'AFTER_FOOD'}
                                    onChange={(e) => updatePrescriptionItem(idx, 'timing', e.target.value)}
                                  >
                                    <option value="AFTER_FOOD">After Food</option>
                                    <option value="BEFORE_FOOD">Before Food</option>
                                    <option value="WITH_FOOD">With Food</option>
                                    <option value="BEDTIME">At Bedtime</option>
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-input"
                                    style={{ fontSize: '0.875rem', padding: '0.45rem 0.65rem', textAlign: 'center' }}
                                    value={item.durationDays}
                                    onChange={(e) => updatePrescriptionItem(idx, 'durationDays', Number(e.target.value))}
                                  />
                                </td>
                                <td>
                                  <input
                                    className="form-input"
                                    style={{ fontSize: '0.875rem', padding: '0.45rem 0.65rem', color: '#0369a1', fontWeight: 600 }}
                                    value={item.reason || ''}
                                    onChange={(e) => updatePrescriptionItem(idx, 'reason', e.target.value)}
                                    placeholder="Reason (e.g. Throat infection)"
                                  />
                                </td>
                                <td>
                                  <input
                                    className="form-input"
                                    style={{ fontSize: '0.875rem', padding: '0.45rem 0.65rem' }}
                                    value={item.instructions || ''}
                                    onChange={(e) => updatePrescriptionItem(idx, 'instructions', e.target.value)}
                                    placeholder="Patient instructions..."
                                  />
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => removePrescriptionItem(idx)}
                                    title="Remove"
                                    style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Step Navigation Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setConsultationWorkflowStep('assessment')}
                        className="btn btn-secondary"
                        style={{ fontWeight: 700, fontSize: '0.875rem' }}
                      >
                        ⬅ Back to Assessment
                      </button>
                      <button
                        type="button"
                        onClick={() => setConsultationWorkflowStep('investigations')}
                        className="btn btn-primary"
                        style={{ fontWeight: 800, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
                      >
                        Proceed to Diagnostic Orders <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 3: DIAGNOSTIC INVESTIGATIONS & LAB ORDERS */}
                {consultationWorkflowStep === 'investigations' && (
                  <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FlaskConical size={18} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
                          Diagnostic Orders & Laboratory Investigations
                        </h4>
                      </div>

                      <select
                        value={orderPriority}
                        onChange={(e) => setOrderPriority(e.target.value as any)}
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 800,
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: orderPriority === 'STAT' ? '#fef2f2' : '#f8fafc',
                          color: orderPriority === 'STAT' ? '#dc2626' : '#334155',
                        }}
                      >
                        <option value="ROUTINE">Routine Priority</option>
                        <option value="STAT">⚡ STAT (Emergency)</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      {/* Pathology Tests */}
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Pathology & Blood Tests:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                          {[
                            'Complete Blood Count (CBC) with ESR',
                            'Liver Function Test (LFT)',
                            'Kidney Function Test (KFT)',
                            'Lipid Profile',
                            'HbA1c Glycated Hemoglobin',
                            'Serum Electrolytes',
                          ].map((test) => {
                            const isSelected = orderedLabTests.includes(test);
                            return (
                              <button
                                key={test}
                                type="button"
                                onClick={() => toggleLabTest(test)}
                                style={{
                                  padding: '0.4rem 0.8rem',
                                  borderRadius: '6px',
                                  border: `1px solid ${isSelected ? '#0284c7' : '#cbd5e1'}`,
                                  backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                                  color: isSelected ? '#0284c7' : '#334155',
                                  fontSize: '0.8125rem',
                                  fontWeight: isSelected ? 700 : 500,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                }}
                              >
                                <span>{test}</span>
                                {isSelected && <Check size={14} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Radiology & Imaging */}
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Radiology & Imaging:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                          {[
                            '12-Lead ECG',
                            'Chest X-Ray PA View',
                            'Ultrasound Abdomen (USG)',
                            'CT Brain (Plain)',
                          ].map((rad) => {
                            const isSelected = orderedRadiology.includes(rad);
                            return (
                              <button
                                key={rad}
                                type="button"
                                onClick={() => toggleRadiology(rad)}
                                style={{
                                  padding: '0.4rem 0.8rem',
                                  borderRadius: '6px',
                                  border: `1px solid ${isSelected ? '#0284c7' : '#cbd5e1'}`,
                                  backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                                  color: isSelected ? '#0284c7' : '#334155',
                                  fontSize: '0.8125rem',
                                  fontWeight: isSelected ? 700 : 500,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                }}
                              >
                                <span>{rad}</span>
                                {isSelected && <Check size={14} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <button
                        type="button"
                        onClick={handleDispatchLabOrders}
                        className="btn btn-secondary"
                        style={{ fontWeight: 800, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <Send size={16} /> Dispatch Orders to Diagnostic Lab ({orderedLabTests.length + orderedRadiology.length})
                      </button>

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => setConsultationWorkflowStep('prescription')}
                          className="btn btn-secondary"
                          style={{ fontWeight: 700, fontSize: '0.875rem' }}
                        >
                          ⬅ Back to Prescription
                        </button>
                        <button
                          type="button"
                          onClick={() => setConsultationWorkflowStep('followup')}
                          className="btn btn-primary"
                          style={{ fontWeight: 800, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
                        >
                          Proceed to Follow-Up & Plan <ArrowRight size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: FOLLOW-UP, ADVICE & FINALIZE */}
                {consultationWorkflowStep === 'followup' && (
                  <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                      <Calendar size={20} color="#0284c7" />
                      <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
                        Doctor's Advice, Follow-Up Schedule & Final Signoff
                      </h4>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      {/* Doctor's Advice */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 800, fontSize: '0.9375rem', marginBottom: '0.5rem' }}>
                          Doctor's Advice & Lifestyle Instructions
                        </label>
                        <textarea
                          className="form-textarea"
                          rows={4}
                          style={{ fontSize: '0.9375rem', lineHeight: '1.5', width: '100%' }}
                          value={doctorNotes}
                          onChange={(e) => setDoctorNotes(e.target.value)}
                          placeholder="Dietary instructions, hydration, rest, warning signs to watch out for..."
                        />
                      </div>

                      {/* Follow-up Visit Scheduler */}
                      <div>
                        <label className="form-label" style={{ fontWeight: 800, fontSize: '0.9375rem', marginBottom: '0.5rem' }}>
                          Scheduled Follow-Up Visit
                        </label>
                        <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                            <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>Follow-up Date:</span>
                            <span style={{ color: 'var(--text-muted)' }}>Reserved by Reception Desk</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {['3', '7', '14', '30'].map((days) => (
                              <button
                                key={days}
                                type="button"
                                onClick={() => {
                                  setFollowUpPreset(days);
                                  const d = new Date();
                                  d.setDate(d.getDate() + Number(days));
                                  setFollowUpDate(d.toISOString().split('T')[0]);
                                }}
                                style={{
                                  padding: '0.4rem 0.8rem',
                                  borderRadius: '6px',
                                  border: `1px solid ${followUpPreset === days ? '#0284c7' : '#cbd5e1'}`,
                                  backgroundColor: followUpPreset === days ? '#0284c7' : '#ffffff',
                                  color: followUpPreset === days ? '#ffffff' : '#475569',
                                  fontSize: '0.8125rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                +{days} Days
                              </button>
                            ))}
                            <input
                              type="date"
                              className="form-input"
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
                              value={followUpDate}
                              onChange={(e) => {
                                setFollowUpDate(e.target.value);
                                setFollowUpPreset('');
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Encounter Summary Review Box */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Encounter Signoff Checklist:</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--secondary)', marginTop: '0.2rem' }}>
                          Diagnosis: <strong>{diagnosis}</strong> • Prescribed: <strong>{prescriptionItems.length} Medications</strong> • Tests Ordered: <strong>{orderedLabTests.length + orderedRadiology.length}</strong>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.625rem' }}>
                        <button
                          type="button"
                          onClick={() => setConsultationWorkflowStep('investigations')}
                          className="btn btn-secondary"
                          style={{ fontWeight: 700, fontSize: '0.875rem' }}
                        >
                          ⬅ Back to Diagnostic Orders
                        </button>
                      </div>
                    </div>

                    {/* Final Action Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <button
                        type="button"
                        onClick={() => showToast('✓ Draft consultation notes saved.')}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                      >
                        <Save size={18} /> Save Draft
                      </button>

                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const tempRx: SharedPrescription = {
                              id: `temp-${Date.now()}`,
                              prescriptionNo: `PREVIEW-${Math.floor(100 + Math.random() * 900)}`,
                              uhid: activePatientProfile.uhid,
                              patientName: `${activePatientProfile.firstName} ${activePatientProfile.lastName}`,
                              age: activePatientProfile.age,
                              gender: String(activePatientProfile.gender),
                              doctorName,
                              doctorSpecialization,
                              chamber: doctorChamber,
                              date: new Date().toISOString().split('T')[0],
                              diagnosis,
                              diagnosisCode,
                              chiefComplaints,
                              clinicalNotes: doctorNotes,
                              items: prescriptionItems,
                              followUpDate,
                            };
                            setRxToPrint(tempRx);
                            setShowPrintRxModal(true);
                          }}
                          className="btn btn-secondary"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.875rem' }}
                        >
                          <Printer size={18} /> Print Rx
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const tempRx: SharedPrescription = {
                              id: `temp-${Date.now()}`,
                              prescriptionNo: `RX-${Math.floor(100 + Math.random() * 900)}`,
                              uhid: activePatientProfile.uhid,
                              patientName: `${activePatientProfile.firstName} ${activePatientProfile.lastName}`,
                              age: activePatientProfile.age,
                              gender: String(activePatientProfile.gender),
                              doctorName,
                              doctorSpecialization,
                              chamber: doctorChamber,
                              date: new Date().toISOString().split('T')[0],
                              diagnosis,
                              diagnosisCode,
                              chiefComplaints,
                              clinicalNotes: doctorNotes,
                              items: prescriptionItems,
                              followUpDate,
                            };
                            setShareRx(tempRx);
                            setShowShareModal(true);
                          }}
                          className="btn btn-secondary"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.875rem', color: '#047857' }}
                        >
                          <Share2 size={18} /> WhatsApp / SMS
                        </button>

                        <button
                          type="button"
                          onClick={handleCompleteConsultation}
                          className="btn btn-primary"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, padding: '0.75rem 1.75rem', fontSize: '0.9375rem' }}
                        >
                          <CheckCircle2 size={20} /> Finalize Visit & Issue Rx ➔
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ==================== COLUMN 3: RIGHT PANEL (CLINICAL RECORDS & CDSS) ==================== */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '1rem' }}>
                <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Panel Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <History size={18} color="#0284c7" />
                      <strong style={{ fontSize: '0.9375rem', color: 'var(--secondary)' }}>Patient Records & CDSS</strong>
                    </div>
                  </div>

                  {/* Sub-Tabs */}
                  <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
                    {[
                      { id: 'rx', label: 'Rx History' },
                      { id: 'labs', label: 'Labs' },
                      { id: 'radiology', label: 'Radiology' },
                      { id: 'visits', label: 'Visits' },
                    ].map((sub) => {
                      const isSubActive = rightHistoryTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setRightHistoryTab(sub.id as any)}
                          style={{
                            flex: 1,
                            padding: '0.4rem 0.35rem',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: isSubActive ? '#ffffff' : 'transparent',
                            color: isSubActive ? '#0284c7' : '#64748b',
                            fontWeight: isSubActive ? 800 : 600,
                            fontSize: '0.7813rem',
                            cursor: 'pointer',
                            boxShadow: isSubActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* SUB-TAB 1: RX HISTORY (WITH QUICK RE-PRESCRIBE) */}
                  {rightHistoryTab === 'rx' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Prior prescriptions on file. Click "+ Add" to copy into current prescription:
                      </div>
                      {[
                        { med: 'Amoxicillin 500mg', dose: '500mg (1 Cap)', freq: '1-0-1', days: 5, date: '2026-08-14', reason: 'Pharyngitis' },
                        { med: 'Paracetamol 650mg', dose: '650mg (1 Tab)', freq: '1-0-1 SOS', days: 3, date: '2026-08-14', reason: 'Fever SOS' },
                        { med: 'Pantoprazole 40mg', dose: '40mg (1 Tab)', freq: '1-0-0', days: 7, date: '2026-05-20', reason: 'GERD Reflux' },
                        { med: 'Levocetirizine 5mg', dose: '5mg (1 Tab)', freq: '0-0-1', days: 5, date: '2026-05-20', reason: 'Allergic Rhinitis' },
                        { med: 'Telmisartan 40mg', dose: '40mg (1 Tab)', freq: '1-0-0', days: 30, date: '2026-02-10', reason: 'Essential HTN' },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '0.65rem 0.75rem',
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ fontSize: '0.8125rem', color: '#0f172a', display: 'block' }}>{item.med}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {item.freq} • {item.days}d • {item.date}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 600 }}>{item.reason}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              addPrescriptionItem(item.med);
                              showToast(`✓ Added ${item.med} to active prescription`);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.5rem', flexShrink: 0 }}
                            title="Copy into current prescription"
                          >
                            <Plus size={13} /> Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* SUB-TAB 2: LAB REPORTS */}
                  {rightHistoryTab === 'labs' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Recent pathology investigation findings (2026-08-14):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {[
                          { test: 'Hemoglobin (Hb)', value: '14.2 g/dL', range: '13.5 - 17.5', status: 'NORMAL' },
                          { test: 'Total WBC Count', value: '8,400 /µL', range: '4,000 - 11,000', status: 'NORMAL' },
                          { test: 'Platelet Count', value: '280,000 /µL', range: '150,000 - 450,000', status: 'NORMAL' },
                          { test: 'ESR (Westergren)', value: '12 mm/hr', range: '0 - 15', status: 'NORMAL' },
                          { test: 'Fasting Blood Sugar', value: '98 mg/dL', range: '70 - 100', status: 'NORMAL' },
                          { test: 'Serum Creatinine', value: '0.9 mg/dL', range: '0.7 - 1.3', status: 'NORMAL' },
                          { test: 'Serum Potassium', value: '4.2 mEq/L', range: '3.5 - 5.0', status: 'NORMAL' },
                        ].map((lab, i) => (
                          <div
                            key={i}
                            style={{
                              padding: '0.55rem 0.75rem',
                              backgroundColor: '#ffffff',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <strong style={{ fontSize: '0.8125rem', color: '#0f172a' }}>{lab.test}</strong>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ref: {lab.range}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <strong style={{ fontSize: '0.875rem', color: '#0284c7' }}>{lab.value}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 3: RADIOLOGY */}
                  {rightHistoryTab === 'radiology' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Imaging & diagnostic scans on file:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7', fontWeight: 700, fontSize: '0.8125rem' }}>
                            <span>12-Lead ECG</span>
                            <span>2026-05-20</span>
                          </div>
                          <strong style={{ fontSize: '0.8125rem', color: 'var(--secondary)', display: 'block', marginTop: '0.2rem' }}>
                            Normal Sinus Rhythm (HR 72 bpm)
                          </strong>
                          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>
                            PR interval 150ms, QRS 84ms, normal axis. No acute ST-T wave abnormalities.
                          </div>
                        </div>

                        <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7', fontWeight: 700, fontSize: '0.8125rem' }}>
                            <span>Chest X-Ray PA View</span>
                            <span>2026-05-20</span>
                          </div>
                          <strong style={{ fontSize: '0.8125rem', color: 'var(--secondary)', display: 'block', marginTop: '0.2rem' }}>
                            Normal Cardiothoracic Ratio
                          </strong>
                          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>
                            Both lung fields clear. CP angles sharp. No focal consolidation or effusion.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 4: VISITS & IPD ADMISSIONS */}
                  {rightHistoryTab === 'visits' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '550px', overflowY: 'auto' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Chronological encounter & admission log:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {(activePatientProfile.recentVisits || []).map((v: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              padding: '0.65rem 0.75rem',
                              backgroundColor: '#f8fafc',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              fontSize: '0.8125rem',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7', fontWeight: 700 }}>
                              <span>{v.date}</span>
                              <span>{v.dept}</span>
                            </div>
                            <div style={{ fontWeight: 800, color: 'var(--secondary)', marginTop: '0.2rem' }}>
                              {v.diagnosis}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              Consultant: {v.doctor}
                            </div>
                          </div>
                        ))}

                        <div
                          style={{
                            padding: '0.65rem 0.75rem',
                            backgroundColor: '#f0fdf4',
                            borderRadius: '8px',
                            border: '1px solid #bbf7d0',
                            fontSize: '0.8125rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534', fontWeight: 700 }}>
                            <span>IPD Stay (3 Days)</span>
                            <span>2025-11-04</span>
                          </div>
                          <div style={{ fontWeight: 800, color: '#14532d', marginTop: '0.2rem' }}>
                            Executive Health & Cardiac Monitoring
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '0.15rem' }}>
                            Ward 3B • Bed 12 • Discharged Stable
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 4: MY SCHEDULE (CLEAN & EDITABLE WEEKLY TIMETABLE)                   */}
        {/* ======================================================================= */}
        {activeTab === 'schedule' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.75fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
            {/* Left: Editable Weekly Timetable */}
            <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--secondary)' }}>
                    Weekly Consultation Timetable for {doctorName}
                  </h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Edit session timings, designated chambers, and active working days.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, fontSize: '0.875rem' }}
                >
                  <Save size={18} /> Save Schedule Changes
                </button>
              </div>

              {/* Day by Day Editable Schedule */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {weeklySchedule.map((s, idx) => (
                  <div
                    key={s.day}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 80px 1.5fr 1.5fr 120px 80px',
                      gap: '0.75rem',
                      alignItems: 'center',
                      padding: '0.875rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: s.isActive ? '#ffffff' : '#f8fafc',
                      border: `1px solid ${s.isActive ? '#cbd5e1' : '#e2e8f0'}`,
                      opacity: s.isActive ? 1 : 0.65,
                    }}
                  >
                    <strong style={{ fontSize: '0.9375rem', color: 'var(--secondary)' }}>{s.day}</strong>

                    {/* Toggle Active / Day Off */}
                    <button
                      type="button"
                      onClick={() => handleUpdateScheduleDay(idx, 'isActive', !s.isActive)}
                      style={{
                        padding: '0.3rem 0.5rem',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        backgroundColor: s.isActive ? '#dcfce7' : '#fee2e2',
                        color: s.isActive ? '#166534' : '#991b1b',
                      }}
                    >
                      {s.isActive ? 'Active' : 'Off'}
                    </button>

                    {/* Morning Hours */}
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Morning:</span>
                      <input
                        className="form-input"
                        disabled={!s.isActive}
                        style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                        value={s.morning}
                        onChange={(e) => handleUpdateScheduleDay(idx, 'morning', e.target.value)}
                      />
                    </div>

                    {/* Evening Hours */}
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Evening:</span>
                      <input
                        className="form-input"
                        disabled={!s.isActive}
                        style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                        value={s.evening}
                        onChange={(e) => handleUpdateScheduleDay(idx, 'evening', e.target.value)}
                      />
                    </div>

                    {/* Chamber / Room */}
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Room:</span>
                      <input
                        className="form-input"
                        disabled={!s.isActive}
                        style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                        value={s.room}
                        onChange={(e) => handleUpdateScheduleDay(idx, 'room', e.target.value)}
                      />
                    </div>

                    {/* Max Patients */}
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Cap:</span>
                      <input
                        type="number"
                        className="form-input"
                        disabled={!s.isActive}
                        style={{ fontSize: '0.8125rem', padding: '0.35rem 0.5rem' }}
                        value={s.maxPatients}
                        onChange={(e) => handleUpdateScheduleDay(idx, 'maxPatients', Number(e.target.value))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Consultation Parameters & Settings */}
            <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)' }}>
                Consultation Parameters & Chamber
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800, fontSize: '0.875rem' }}>
                    Designated Chamber & Block
                  </label>
                  <input
                    className="form-input"
                    style={{ fontSize: '0.9375rem' }}
                    value={doctorChamber}
                    onChange={(e) => setDoctorChamber(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800, fontSize: '0.875rem' }}>
                    Consultation Slot Duration (Minutes)
                  </label>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.9375rem' }}
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(e.target.value)}
                  >
                    <option value="10">10 Minutes per Patient</option>
                    <option value="15">15 Minutes per Patient (Recommended)</option>
                    <option value="20">20 Minutes per Patient</option>
                    <option value="30">30 Minutes per Patient</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800, fontSize: '0.875rem' }}>
                    Standard OPD Consultation Tariff ($)
                  </label>
                  <input
                    className="form-input"
                    style={{ fontSize: '0.9375rem' }}
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800, fontSize: '0.875rem' }}>
                    Follow-Up Review Tariff ($)
                  </label>
                  <input
                    className="form-input"
                    style={{ fontSize: '0.9375rem' }}
                    value={followUpFee}
                    onChange={(e) => setFollowUpFee(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  className="btn btn-primary"
                  style={{ width: '100%', fontWeight: 800, fontSize: '0.9375rem', marginTop: '0.5rem' }}
                >
                  <CheckCircle2 size={18} /> Update Parameters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 5: REPORTS & CLINICAL PERFORMANCE ANALYTICS                         */}
        {/* ======================================================================= */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--secondary)' }}>
                Doctor Clinical Performance & Revenue Analytics
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Personal operational summary for {doctorName} across consultations, diagnoses, and revenue generated.
              </p>
            </div>

            {/* Top 4 Performance Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 700 }}>PATIENTS SEEN TODAY</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0284c7', marginTop: '0.35rem' }}>{stats.completed}</div>
                <div style={{ fontSize: '0.8125rem', color: '#047857', marginTop: '0.35rem', fontWeight: 600 }}>↑ 100% on schedule</div>
              </div>
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 700 }}>PATIENTS THIS MONTH</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', marginTop: '0.35rem' }}>284</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Target: 300 patients</div>
              </div>
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 700 }}>AVG CONSULTATION DURATION</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#8b5cf6', marginTop: '0.35rem' }}>12.4m</div>
                <div style={{ fontSize: '0.8125rem', color: '#8b5cf6', marginTop: '0.35rem' }}>Target: 15.0 mins</div>
              </div>
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 700 }}>OPD REVENUE GENERATED</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#d97706', marginTop: '0.35rem' }}>$4,250.00</div>
                <div style={{ fontSize: '0.8125rem', color: '#d97706', marginTop: '0.35rem' }}>Consultations & Diagnostics</div>
              </div>
            </div>

            {/* Diagnostic Breakdown & Volume Trend */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
              {/* Top Diagnoses Breakdown */}
              <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
                  Top 5 Diagnoses Breakdown (ICD-10)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {[
                    { code: 'J06.9', label: 'Acute Upper Respiratory Infection', count: 94, pct: 38, color: '#0284c7' },
                    { code: 'I10', label: 'Essential Primary Hypertension', count: 58, pct: 24, color: '#10b981' },
                    { code: 'E11.9', label: 'Type 2 Diabetes Mellitus', count: 39, pct: 16, color: '#f59e0b' },
                    { code: 'J02.9', label: 'Acute Pharyngitis', count: 28, pct: 12, color: '#8b5cf6' },
                    { code: 'K30', label: 'Functional Dyspepsia / GERD', count: 24, pct: 10, color: '#ec4899' },
                  ].map((d) => (
                    <div key={d.code}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                          {d.label} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({d.code})</span>
                        </span>
                        <span style={{ fontWeight: 800 }}>{d.count} ({d.pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${d.pct}%`, height: '100%', backgroundColor: d.color, borderRadius: '4px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Volume & Quality Metrics */}
              <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
                  Clinical Quality & Compliance Metrics
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.9375rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Generic Drug Prescription Compliance:</span>
                    <strong style={{ color: '#047857' }}>92.4% (High)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Investigation Ordering Ratio:</span>
                    <strong style={{ color: '#0284c7' }}>42.0% of Visits</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Follow-Up Return Adherence:</span>
                    <strong style={{ color: '#047857' }}>84.2%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Patient Satisfaction Rating:</span>
                    <strong style={{ color: '#f59e0b' }}>★ 4.9 / 5.0</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 6: INPATIENT ROUNDS & CRITICAL CARE WORKFLOWS                       */}
        {/* ======================================================================= */}
        {activeTab === 'inpatient' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--secondary)' }}>
                Inpatient Rounds, ICU Reviews & Emergency Desk
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Cross-department care continuum for patients admitted under {doctorName}.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
              {/* Box 1: IPD Ward Rounds */}
              <div className="card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <BedDouble size={22} color="#0284c7" />
                    <strong style={{ fontSize: '1.125rem', color: 'var(--secondary)' }}>
                      Inpatient Ward Rounds ({inpatientRounds.filter((r) => !r.wardName.includes('ICU')).length} Patients)
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {inpatientRounds
                    .filter((r) => !r.wardName.includes('ICU'))
                    .map((round) => (
                      <div
                        key={round.id}
                        style={{
                          padding: '1rem 1.15rem',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: round.roundStatus === 'COMPLETED' ? '#f0fdf4' : '#ffffff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <strong style={{ fontSize: '1rem', color: 'var(--secondary)' }}>{round.patientName}</strong>
                            <div style={{ fontSize: '0.8125rem', color: '#0284c7', fontWeight: 700 }}>
                              {round.bedCode} • {round.wardName}
                            </div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              Diagnosis: <strong>{round.primaryDiagnosis}</strong>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedRoundPatient(round);
                              setProgressNoteText(round.progressNote || '');
                              setShowProgressNoteModal(true);
                            }}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.8125rem', fontWeight: 800 }}
                          >
                            Progress Note
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Box 2: Emergency Casualty Desk */}
              <div className="card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <ShieldAlert size={22} color="#dc2626" />
                    <strong style={{ fontSize: '1.125rem', color: 'var(--secondary)' }}>
                      Emergency Casualty Desk ({emergencyAlerts.length} Calls)
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {emergencyAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      style={{
                        padding: '1rem 1.15rem',
                        borderRadius: '10px',
                        border: `1px solid ${alert.triagePriority === 'RED_IMMEDIATE' ? '#fca5a5' : '#fed7aa'}`,
                        backgroundColor: alert.triagePriority === 'RED_IMMEDIATE' ? '#fef2f2' : '#fffbeb',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: alert.triagePriority === 'RED_IMMEDIATE' ? '#dc2626' : '#d97706' }}>
                            {alert.location} • {alert.callTime}
                          </span>
                          <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--secondary)', marginTop: '0.15rem' }}>
                            {alert.patientName} ({alert.age}{alert.gender})
                          </div>
                        </div>
                        {alert.status === 'ATTENDED' ? (
                          <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>✓ Attended</span>
                        ) : (
                          <button
                            onClick={() => {
                              patientJourneyService.markEmergencyAlertAttended(alert.id);
                              setEmergencyAlerts(patientJourneyService.getEmergencyAlerts());
                              showToast(`Emergency alert acknowledged for ${alert.patientName}.`);
                            }}
                            className="btn btn-primary btn-sm"
                            style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', fontSize: '0.8125rem', fontWeight: 800 }}
                          >
                            Mark Attended
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '0.35rem' }}>
                        {alert.presentingCondition}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. OFFICIAL HOSPITAL PRINT PRESCRIPTION MODAL                             */}
      {/* ========================================================================= */}
      {showPrintRxModal && rxToPrint && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <strong style={{ fontSize: '1rem', color: 'var(--secondary)' }}>Official Hospital Prescription</strong>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => {
                    window.print();
                    showToast('🖨️ Prescription sent to chamber printer.');
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 800 }}
                >
                  <Printer size={16} /> Print Sheet
                </button>
                <button
                  onClick={() => setShowPrintRxModal(false)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Prescription Content */}
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0284c7', paddingBottom: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0, color: '#0284c7', fontSize: '1.5rem', fontWeight: 900 }}>NORTH HOSPITAL</h2>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Clinical Enterprise HMS • NABH Accredited</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>100 Hospital Way, Medical District • +1 (555) 019-2834</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--secondary)' }}>{rxToPrint.doctorName}</h4>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{rxToPrint.doctorSpecialization}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{rxToPrint.chamber}</div>
                </div>
              </div>

              {/* Patient Dossier Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                <div>Patient: <strong>{rxToPrint.patientName}</strong></div>
                <div>UHID: <strong>{rxToPrint.uhid}</strong></div>
                <div>Age/Gender: <strong>{rxToPrint.age}Y / {rxToPrint.gender}</strong></div>
                <div>Date: <strong>{rxToPrint.date}</strong></div>
              </div>

              {/* Clinical Section */}
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Provisional Diagnosis:</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--secondary)' }}>
                  {rxToPrint.diagnosis} {rxToPrint.diagnosisCode && `(${rxToPrint.diagnosisCode})`}
                </div>
                {rxToPrint.clinicalNotes && (
                  <div style={{ fontSize: '0.875rem', color: '#475569', marginTop: '0.35rem', fontStyle: 'italic' }}>
                    "{rxToPrint.clinicalNotes}"
                  </div>
                )}
              </div>

              {/* Rx Medications */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Pill size={16} />
                  </div>
                  <strong style={{ fontSize: '1rem', color: 'var(--secondary)' }}>Prescribed Medications (Rx):</strong>
                </div>

                <div className="table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Medicine</th>
                        <th>Dosage</th>
                        <th>Frequency</th>
                        <th>Duration</th>
                        <th>Clinical Indication / Reason</th>
                        <th>Instructions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rxToPrint.items.map((it, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td><strong>{it.medicineName}</strong></td>
                          <td>{it.dosage}</td>
                          <td>{it.frequency}</td>
                          <td>{it.durationDays} Days</td>
                          <td style={{ color: '#0369a1', fontWeight: 600 }}>{it.reason || 'Clinical indication'}</td>
                          <td>{it.instructions || 'As advised'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Follow-up Note */}
              {rxToPrint.followUpDate && (
                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '0.875rem', color: '#0369a1' }}>
                  <strong>Scheduled Follow-Up:</strong> Please report back on <strong>{rxToPrint.followUpDate}</strong> for reassessment.
                </div>
              )}

              {/* Doctor Signature Block */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Valid across all hospital pharmacies and registered medical counters.
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #0f172a', width: '180px', marginBottom: '0.35rem' }} />
                  <strong style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>{rxToPrint.doctorName}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified Digital Signature</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. WHATSAPP / SMS SHARE MODAL                                            */}
      {/* ========================================================================= */}
      {showShareModal && shareRx && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Share2 size={20} color="#16a34a" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
                  Send Digital Prescription
                </h3>
              </div>
              <button onClick={() => setShowShareModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Dispatch prescription <strong>#{shareRx.prescriptionNo}</strong> via verified hospital SMS & WhatsApp gateway.
            </p>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 800, fontSize: '0.875rem' }}>Patient Mobile Number</label>
              <input className="form-input" defaultValue="+1 (555) 019-2834" />
            </div>

            <div style={{ padding: '0.85rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.8125rem', color: '#166534' }}>
              <strong>Message Preview:</strong>
              <div style={{ marginTop: '0.35rem' }}>
                "Dear {shareRx.patientName}, your prescription from {shareRx.doctorName} at North Hospital is ready. View & download PDF: https://northhospital.health/rx/{shareRx.prescriptionNo}"
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  setShowShareModal(false);
                  showToast(`✓ Prescription sent via WhatsApp to ${shareRx.patientName}`);
                }}
                className="btn btn-primary"
                style={{ flex: 1, backgroundColor: '#16a34a', borderColor: '#16a34a', fontWeight: 800, fontSize: '0.875rem' }}
              >
                <Send size={16} /> Send via WhatsApp
              </button>
              <button onClick={() => setShowShareModal(false)} className="btn btn-secondary" style={{ fontSize: '0.875rem' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SPECIALIST REFERRAL MODAL                                             */}
      {/* ========================================================================= */}
      {showReferModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
                Refer Patient to Specialist
              </h3>
              <button onClick={() => setShowReferModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 800, fontSize: '0.875rem' }}>Referral Department</label>
              <select className="form-select" value={referDept} onChange={(e) => setReferDept(e.target.value)}>
                <option value="Pulmonology / Chest Medicine">Pulmonology / Chest Medicine</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Gastroenterology">Gastroenterology</option>
                <option value="General Surgery">General Surgery</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 800, fontSize: '0.875rem' }}>Reason for Referral</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={referReason}
                onChange={(e) => setReferReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={handleReferPatient} className="btn btn-primary" style={{ flex: 1, fontWeight: 800, fontSize: '0.875rem' }}>
                Confirm Referral
              </button>
              <button onClick={() => setShowReferModal(false)} className="btn btn-secondary" style={{ fontSize: '0.875rem' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. INPATIENT PROGRESS NOTE MODAL                                         */}
      {/* ========================================================================= */}
      {showProgressNoteModal && selectedRoundPatient && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
                  Daily Inpatient Progress Note
                </h3>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {selectedRoundPatient.patientName} • {selectedRoundPatient.bedCode} ({selectedRoundPatient.wardName})
                </div>
              </div>
              <button onClick={() => setShowProgressNoteModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 800, fontSize: '0.875rem' }}>SOAP Clinical Notes</label>
              <textarea
                className="form-textarea"
                rows={5}
                value={progressNoteText}
                onChange={(e) => setProgressNoteText(e.target.value)}
                placeholder="Subjective, Objective, Assessment, Plan (SOAP)..."
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  patientJourneyService.updateInpatientRound(selectedRoundPatient.id, progressNoteText, 'COMPLETED');
                  setInpatientRounds(patientJourneyService.getInpatientRounds());
                  setShowProgressNoteModal(false);
                  showToast(`✓ Progress note recorded for ${selectedRoundPatient.patientName}.`);
                }}
                className="btn btn-primary"
                style={{ flex: 1, fontWeight: 800, fontSize: '0.875rem' }}
              >
                Save Progress Note
              </button>
              <button onClick={() => setShowProgressNoteModal(false)} className="btn btn-secondary" style={{ fontSize: '0.875rem' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. PATIENT PAST MEDICAL RECORDS & HISTORY MODAL                          */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '650px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <History size={22} color="#0284c7" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary)' }}>
                    Patient Medical History & Past Visits
                  </h3>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {activePatientProfile.firstName} {activePatientProfile.lastName} • UHID: {activePatientProfile.uhid}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Past Consultations Timeline */}
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Past Consultations ({activePatientProfile.visitsCount} Recorded Visits)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {(activePatientProfile.recentVisits || []).map((v: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.875rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7', fontWeight: 700 }}>
                      <span>Visit Date: {v.date}</span>
                      <span>{v.dept}</span>
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--secondary)', marginTop: '0.25rem' }}>
                      Diagnosis: {v.diagnosis}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Attending Consultant: {v.doctor}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Past Prescriptions */}
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Previous Prescriptions on File
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {prescriptions.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.875rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7', fontWeight: 700 }}>
                      <span>{p.prescriptionNo}</span>
                      <span>{p.date}</span>
                    </div>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
                      {p.diagnosis}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '0.25rem' }}>
                      Prescribed: {p.items.map((it) => it.medicineName).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="btn btn-secondary"
                style={{ fontSize: '0.875rem' }}
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '0.875rem 1.35rem',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            fontSize: '0.875rem',
            fontWeight: 700,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Sparkles size={18} color="#38bdf8" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
