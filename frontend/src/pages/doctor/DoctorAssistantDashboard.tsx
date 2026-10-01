import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Stethoscope,
  Activity,
  Bell,
  CheckCircle2,
  Clock,
  Printer,
  FlaskConical,
  Pill,
  Receipt,
  HeartPulse,
  AlertTriangle,
  Play,
  RotateCcw,
  UserX,
  Volume2,
  FileText,
  BadgeAlert,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  Upload,
  FileUp,
  Share2,
  Calendar,
  Building2,
  ClipboardCheck,
  CheckSquare,
  ShieldAlert,
  Eye,
  X,
  Search,
} from 'lucide-react';
import {
  patientJourneyService,
  SharedQueueToken,
  SharedPrescription,
  SharedLabOrder,
} from '../../services/patientJourneyService';
import {
  WorkspaceHeader,
  KpiRow,
  KpiCard,
  RowActionsMenu,
  PrimaryActionBar,
} from '../../components/workspace';

interface AttachedDocument {
  id: string;
  uhid: string;
  patientName: string;
  title: string;
  category: 'Lab' | 'Radiology' | 'Prescription' | 'Discharge Summary';
  date: string;
  uploadedBy: string;
}

export const DoctorAssistantDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const validTabs = ['queue', 'investigations', 'handoff'];
  const rawTab = searchParams.get('tab');
  const activeTab = validTabs.includes(rawTab || '') ? rawTab! : 'queue';

  // Assigned Doctor & Chamber Context
  const [selectedDoctor, setSelectedDoctor] = useState('Dr. Sarah Jenkins (Cardiology)');
  const [assignedChamber, setAssignedChamber] = useState('Chamber 204');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Queue and Clinical Shared State
  const [queue, setQueue] = useState<SharedQueueToken[]>(() => patientJourneyService.getQueue());
  const [prescriptions, setPrescriptions] = useState<SharedPrescription[]>(() => patientJourneyService.getPrescriptions());
  const [labOrders, setLabOrders] = useState<SharedLabOrder[]>(() => patientJourneyService.getLabOrders());
  const [selectedOrderForAssistantModal, setSelectedOrderForAssistantModal] = useState<SharedLabOrder | null>(null);

  // Attached External Documents Store
  const [attachedDocs, setAttachedDocs] = useState<AttachedDocument[]>([
    {
      id: 'doc-001',
      uhid: 'UHID-202609-00001',
      patientName: 'Robert Fox',
      title: 'Previous Cardiac Echo Report (Metropolis Diagnostic)',
      category: 'Radiology',
      date: '2026-07-15',
      uploadedBy: 'Emma Vance (Assistant)',
    },
    {
      id: 'doc-002',
      uhid: 'UHID-202609-00001',
      patientName: 'Robert Fox',
      title: 'External Lipid Profile & Fasting Blood Sugar',
      category: 'Lab',
      date: '2026-08-10',
      uploadedBy: 'Emma Vance (Assistant)',
    },
    {
      id: 'doc-003',
      uhid: 'UHID-202609-00002',
      patientName: 'Eleanor Vance',
      title: 'Prior Knee X-Ray & Orthopedic Referral',
      category: 'Radiology',
      date: '2026-06-22',
      uploadedBy: 'Emma Vance (Assistant)',
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync data across tabs & components
  const refreshAllData = () => {
    setQueue(patientJourneyService.getQueue());
    setPrescriptions(patientJourneyService.getPrescriptions());
    setLabOrders(patientJourneyService.getLabOrders());
  };

  useEffect(() => {
    refreshAllData();
    const handleSync = () => refreshAllData();
    window.addEventListener('storage', handleSync);
    window.addEventListener('nh_data_sync', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('nh_data_sync', handleSync);
    };
  }, []);

  // Filter Queue for Assigned Doctor
  const doctorQueue = useMemo(() => {
    return queue.filter(
      (q) =>
        q.doctor.toLowerCase().includes('jenkins') ||
        q.doctor.toLowerCase().includes('sarah') ||
        q.room.toLowerCase().includes('204')
    );
  }, [queue]);

  // Current Patient in Chamber
  const currentInChamber = useMemo(() => {
    return (
      doctorQueue.find((q) => q.status === 'IN_CONSULTATION' || q.callingStatus === 'CALLING') || null
    );
  }, [doctorQueue]);

  // Waiting Patients list
  const waitingPatients = useMemo(() => {
    return doctorQueue.filter(
      (q) => q.status === 'WAITING' || q.status === 'TRIAGED' || q.status === 'READY_FOR_DOCTOR' || q.status === 'SCHEDULED'
    );
  }, [doctorQueue]);

  // Triaged Ready Patients list
  const triagedReadyPatients = useMemo(() => {
    return doctorQueue.filter((q) => q.status === 'TRIAGED' || q.status === 'READY_FOR_DOCTOR');
  }, [doctorQueue]);

  // Completed Today list
  const completedPatients = useMemo(() => {
    return doctorQueue.filter((q) => q.status === 'COMPLETED');
  }, [doctorQueue]);

  // Active Patient for Pre-Consult Intake / Triage Desk
  const [activeIntakeId, setActiveIntakeId] = useState<string>(() => {
    return waitingPatients[0]?.id || currentInChamber?.id || doctorQueue[0]?.id || '';
  });

  const activeIntakeToken = useMemo(() => {
    return (
      doctorQueue.find((q) => q.id === activeIntakeId) ||
      waitingPatients[0] ||
      currentInChamber ||
      doctorQueue[0] ||
      null
    );
  }, [doctorQueue, activeIntakeId, waitingPatients, currentInChamber]);

  // Vitals Form State
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [pulse, setPulse] = useState('74');
  const [temp, setTemp] = useState('98.4');
  const [spo2, setSpo2] = useState('99');
  const [height, setHeight] = useState('178');
  const [weight, setWeight] = useState('76');
  const [rbs, setRbs] = useState('108'); // Random Blood Sugar
  const [chiefComplaints, setChiefComplaints] = useState('Throat pain, persistent dry cough, and mild fever');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([
    'Dry Cough',
    'Sore Throat',
    'Mild Fever',
  ]);
  const [allergies, setAllergies] = useState<string[]>(['Penicillin', 'Sulfa drugs']);
  const [chronicConditions, setChronicConditions] = useState<string[]>(['Hypertension (Stage 1)']);
  const [currentMedications, setCurrentMedications] = useState<string[]>([
    'Telmisartan 40mg (1-0-0)',
    'Aspirin 75mg (0-1-0)',
  ]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [customAllergy, setCustomAllergy] = useState('');
  const [customMed, setCustomMed] = useState('');

  // Auto-fill Vitals when switching active intake patient
  useEffect(() => {
    if (activeIntakeToken) {
      if (activeIntakeToken.vitals) {
        const bpParts = (activeIntakeToken.vitals.bp || '120/80').split('/');
        setSystolic(bpParts[0] || '120');
        setDiastolic(bpParts[1] || '80');
        setPulse(String(activeIntakeToken.vitals.pulse || 74));
        setTemp(String(activeIntakeToken.vitals.temp || 98.4));
        setSpo2(String(activeIntakeToken.vitals.spo2 || 99));
        setWeight(String(activeIntakeToken.vitals.weight || 76));
        setHeight(String(activeIntakeToken.vitals.height || 178));
        if (activeIntakeToken.vitals.rbs) {
          setRbs(String(activeIntakeToken.vitals.rbs));
        }
        if (activeIntakeToken.vitals.triageNotes) {
          setChiefComplaints(activeIntakeToken.vitals.triageNotes);
        }
      }
      if (activeIntakeToken.allergies && activeIntakeToken.allergies.length > 0) {
        setAllergies(activeIntakeToken.allergies);
      }
      if (activeIntakeToken.chronicConditions && activeIntakeToken.chronicConditions.length > 0) {
        setChronicConditions(activeIntakeToken.chronicConditions);
      }
      if (activeIntakeToken.currentMedications && activeIntakeToken.currentMedications.length > 0) {
        setCurrentMedications(activeIntakeToken.currentMedications);
      }
      if (activeIntakeToken.triageNotes) {
        setChiefComplaints(activeIntakeToken.triageNotes);
      }
    }
  }, [activeIntakeToken?.id]);

  // BMI Calculation
  const bmiValue = useMemo(() => {
    const hM = Number(height) / 100;
    const wKg = Number(weight);
    if (!hM || !wKg || hM <= 0) return 24.0;
    return Number((wKg / (hM * hM)).toFixed(1));
  }, [height, weight]);

  const bmiCategory = useMemo(() => {
    if (bmiValue < 18.5) return { label: 'Underweight', color: '#f59e0b' };
    if (bmiValue <= 24.9) return { label: 'Normal Weight', color: '#10b981' };
    if (bmiValue <= 29.9) return { label: 'Overweight', color: '#f97316' };
    return { label: 'Obese', color: '#ef4444' };
  }, [bmiValue]);

  // BP Category
  const bpCategory = useMemo(() => {
    const s = Number(systolic);
    const d = Number(diastolic);
    if (s < 120 && d < 80) return { label: 'Normal BP', color: '#10b981' };
    if (s <= 129 && d < 80) return { label: 'Elevated BP', color: '#f59e0b' };
    if (s <= 139 || d <= 89) return { label: 'Stage 1 HTN', color: '#f97316' };
    return { label: 'Stage 2 HTN', color: '#ef4444' };
  }, [systolic, diastolic]);

  // Web Audio Chime Sound for Token Calling
  const playCallingChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch {
      // Audio not supported in environment
    }
  };

  // Queue Actions
  const handleCallToken = (tokenObj: SharedQueueToken) => {
    playCallingChime();
    patientJourneyService.updateQueueToken(tokenObj.token, {
      callingStatus: 'CALLING',
      status: 'IN_CONSULTATION',
      room: assignedChamber,
    });
    showToast(`🔔 Token #${tokenObj.token} (${tokenObj.patient}) called to ${assignedChamber}!`);
  };

  const handleAdmitToChamber = (tokenObj: SharedQueueToken) => {
    patientJourneyService.updateQueueToken(tokenObj.token, {
      callingStatus: 'ACCEPTED',
      status: 'IN_CONSULTATION',
    });
    showToast(`✓ Patient ${tokenObj.patient} admitted inside ${assignedChamber}.`);
  };

  const handlePutOnHold = (tokenObj: SharedQueueToken) => {
    patientJourneyService.updateQueueToken(tokenObj.token, {
      callingStatus: 'IDLE',
      status: 'WAITING',
      priority: 'NORMAL',
    });
    showToast(`⏸️ Token #${tokenObj.token} put on hold. Will call next.`);
  };

  const handleMarkNoShow = (tokenObj: SharedQueueToken) => {
    patientJourneyService.updateQueueToken(tokenObj.token, {
      callingStatus: 'IDLE',
      status: 'NO_SHOW',
    });
    showToast(`❌ Token #${tokenObj.token} marked as absent / no-show.`);
  };

  const handleSaveAndPushVitals = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIntakeToken) return;

    const bpString = `${systolic || '120'}/${diastolic || '80'}`;
    const updatedVitals = {
      bp: bpString,
      pulse: Number(pulse) || 74,
      temp: Number(temp) || 98.4,
      spo2: Number(spo2) || 99,
      height: Number(height) || 178,
      weight: Number(weight) || 76,
      bmi: bmiValue,
      triageNotes: `${chiefComplaints}. Allergies: ${allergies.join(', ') || 'NKDA'}. Chronic: ${chronicConditions.join(', ') || 'None'}. Current Rx: ${currentMedications.join(', ') || 'None'}. RBS: ${rbs} mg/dL`,
    };

    patientJourneyService.updateQueueToken(activeIntakeToken.token, {
      status: 'TRIAGED',
      vitals: updatedVitals,
    });

    showToast(
      `✓ Triaged vitals for Token #${activeIntakeToken.token} (${activeIntakeToken.patient}) pushed directly to Dr. Sarah Jenkins in Chamber 204!`
    );
  };

  const toggleSymptom = (sym: string) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
      if (!chiefComplaints.includes(sym)) {
        setChiefComplaints((prev) => (prev ? `${prev}, ${sym}` : sym));
      }
    }
  };

  const addCustomSymptom = () => {
    if (!customSymptom.trim()) return;
    toggleSymptom(customSymptom.trim());
    setCustomSymptom('');
  };

  const addAllergy = () => {
    if (!customAllergy.trim()) return;
    if (!allergies.includes(customAllergy.trim())) {
      setAllergies([...allergies, customAllergy.trim()]);
    }
    setCustomAllergy('');
  };

  const removeAllergy = (allg: string) => {
    setAllergies(allergies.filter((a) => a !== allg));
  };

  const addCurrentMed = () => {
    if (!customMed.trim()) return;
    if (!currentMedications.includes(customMed.trim())) {
      setCurrentMedications([...currentMedications, customMed.trim()]);
    }
    setCustomMed('');
  };

  const removeCurrentMed = (med: string) => {
    setCurrentMedications(currentMedications.filter((m) => m !== med));
  };

  // Upload Document State in Tab 2
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<'Lab' | 'Radiology' | 'Prescription' | 'Discharge Summary'>('Lab');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);

  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !activeIntakeToken) return;

    const newDoc: AttachedDocument = {
      id: `doc-${Date.now()}`,
      uhid: activeIntakeToken.uhid,
      patientName: activeIntakeToken.patient,
      title: docTitle.trim(),
      category: docCategory,
      date: docDate,
      uploadedBy: 'Emma Vance (Assistant)',
    };

    setAttachedDocs([newDoc, ...attachedDocs]);
    setShowUploadModal(false);
    setDocTitle('');
    showToast(`✓ Document "${newDoc.title}" attached to ${activeIntakeToken.patient} (${activeIntakeToken.uhid})!`);
  };

  // Investigations Tab Filter
  const [invFilter, setInvFilter] = useState<'all' | 'lab' | 'radiology' | 'ready' | 'pending'>('all');

  const filteredLabOrders = useMemo(() => {
    return labOrders.filter((order) => {
      if (invFilter === 'lab') return order.category.toLowerCase().includes('pathology') || order.category.toLowerCase().includes('lab') || order.category.toLowerCase().includes('blood');
      if (invFilter === 'radiology') return order.category.toLowerCase().includes('radio') || order.category.toLowerCase().includes('x-ray') || order.category.toLowerCase().includes('scan');
      if (invFilter === 'ready') return order.stage === 'REPORT_GENERATED';
      if (invFilter === 'pending') return order.stage !== 'REPORT_GENERATED';
      return true;
    });
  }, [labOrders, invFilter]);

  // Printable Rx Preview Modal State
  const [selectedRxForPrint, setSelectedRxForPrint] = useState<SharedPrescription | null>(null);

  // Follow-Up Coordination in Tab 3
  const [selectedFollowUpDays, setSelectedFollowUpDays] = useState('7');
  const [followUpDateInput, setFollowUpDateInput] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [followUpNotes, setFollowUpNotes] = useState('Fasting Blood Sugar test before visit');

  const handleConfirmFollowUp = (patientName: string, uhid: string) => {
    showToast(`✓ Follow-up scheduled for ${patientName} on ${followUpDateInput}. Instructions noted.`);
  };

  // Checklist State in Tab 3
  const [checklist, setChecklist] = useState({
    vitalsDone: true,
    allergiesChecked: true,
    priorReportsAttached: true,
    fileOpened: true,
    patientSeated: true,
  });

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: 'var(--bg-main)',
        minHeight: '100%',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: 'var(--secondary)',
            color: '#ffffff',
            padding: '12px 18px',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 9999,
            fontSize: '14px',
            fontWeight: 500,
            borderLeft: '4px solid var(--success)',
          }}
        >
          <CheckCircle2 size={16} color="var(--success)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. WORKSPACE HEADER (§ 5: Standardized SaaS header, Chamber Selector & Session Status) */}
      <WorkspaceHeader
        title="OPD Doctor Assistant Workstation"
        description="Pre-consultation patient triage, vitals intake, diagnostic investigation tracking, and chamber handoff."
        icon={<Stethoscope size={20} />}
        actions={
          <>
            {/* Chamber Selector */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#ffffff',
                padding: '4px 10px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                Chamber:
              </span>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: 'var(--secondary)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="Dr. Sarah Jenkins (Cardiology)">Dr. Sarah Jenkins (Chamber 204)</option>
                <option value="Dr. Robert Chen (Internal Medicine)">Dr. Robert Chen (Chamber 205)</option>
                <option value="Dr. Emily Watson (Pediatrics)">Dr. Emily Watson (Chamber 206)</option>
              </select>
            </div>

            {/* Chamber Session Status - Small dot + label */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: currentInChamber ? 'var(--success)' : 'var(--text-muted)',
                padding: '6px 12px',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: currentInChamber ? 'var(--success)' : 'var(--primary)',
                  display: 'inline-block',
                }}
              />
              <span>{currentInChamber ? 'In Session' : 'Chamber Ready'}</span>
            </div>
          </>
        }
      />

      {/* 2. KPI ROW (§ 9: Max 5 cards, 120px height) */}
      <KpiRow>
        <KpiCard
          label="Waiting in Lobby"
          value={waitingPatients.length}
          trend="Awaiting Intake"
          trendColor="var(--warning)"
          iconBg="var(--warning-light)"
          iconColor="var(--warning)"
          icon={<Clock size={18} />}
        />
        <KpiCard
          label="Now in Chamber"
          value={currentInChamber ? 1 : 0}
          trend={currentInChamber ? `Token #${currentInChamber.token} inside` : 'Chamber 204 Ready'}
          trendColor="var(--primary)"
          iconBg="var(--primary-light)"
          iconColor="var(--primary)"
          icon={<Stethoscope size={18} />}
        />
        <KpiCard
          label="Prepared for Doctor"
          value={triagedReadyPatients.length}
          trend="Vitals Pushed"
          trendColor="var(--success)"
          iconBg="var(--success-light)"
          iconColor="var(--success)"
          icon={<CheckCircle2 size={18} />}
        />
        <KpiCard
          label="Pending Investigations"
          value={labOrders.filter((o) => o.stage !== 'REPORT_GENERATED').length}
          trend="Processing in Lab"
          trendColor="var(--info)"
          iconBg="var(--info-light)"
          iconColor="var(--info)"
          icon={<FlaskConical size={18} />}
        />
        <KpiCard
          label="Completed Consultations"
          value={completedPatients.length}
          trend="Ready for Handoff"
          trendColor="var(--success)"
          iconBg="var(--success-light)"
          iconColor="var(--success)"
          icon={<Activity size={18} />}
        />
      </KpiRow>



      {/* ======================================================================= */}
      {/* SCREEN 1: QUEUE & PATIENT PREPARATION (80% DAILY WORK)                  */}
      {/* ======================================================================= */}
      {activeTab === 'queue' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '380px minmax(0, 1fr)',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* Left Column: Chamber Queue & Token Calling Desk */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Call Next Token Card (§ 12) */}
            <div
              className="card"
              style={{
                padding: '16px 20px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Next in Queue
                </span>
                {waitingPatients[0] && (
                  <span
                    className={`badge ${waitingPatients[0].priority === 'URGENT' ? 'badge-danger' : 'badge-secondary'}`}
                    style={{ fontSize: '11px' }}
                  >
                    {waitingPatients[0].priority === 'URGENT' ? '🚨 URGENT' : 'Ready'}
                  </span>
                )}
              </div>

              {waitingPatients.length > 0 ? (
                <button
                  type="button"
                  onClick={() => handleCallToken(waitingPatients[0])}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <Volume2 size={16} />
                  <span>Call Next Token (#{waitingPatients[0].token})</span>
                </button>
              ) : (
                <div
                  style={{
                    padding: '8px',
                    textAlign: 'center',
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                  }}
                >
                  ✓ All waiting patients currently attended
                </div>
              )}
            </div>

            {/* Currently In Chamber Card (§ 8) */}
            <div
              className="card"
              style={{
                padding: '16px 20px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                borderLeft: currentInChamber ? '4px solid var(--success)' : '4px solid var(--border-color)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: currentInChamber ? 'var(--success)' : 'var(--text-light)',
                      display: 'inline-block',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: currentInChamber ? 'var(--success)' : 'var(--text-muted)',
                    }}
                  >
                    Now In Chamber (Cabin 204)
                  </span>
                </div>
                {currentInChamber?.callingStatus === 'CALLING' && (
                  <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                    Calling at Door...
                  </span>
                )}
              </div>

              {currentInChamber ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          fontSize: '1.75rem',
                          fontWeight: 700,
                          color: 'var(--secondary)',
                          backgroundColor: 'var(--bg-main)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '4px 10px',
                          lineHeight: 1,
                        }}
                      >
                        #{String(currentInChamber.token).padStart(2, '0')}
                      </div>
                      <div>
                        <strong style={{ fontSize: '1rem', color: 'var(--secondary)', display: 'block' }}>
                          {currentInChamber.patient}
                        </strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>UHID: {currentInChamber.uhid} • {currentInChamber.age}Y/{currentInChamber.gender}</span>
                          {(() => {
                            const cOrders = labOrders.filter((o) => o.uhid === currentInChamber.uhid);
                            if (cOrders.length === 0) return null;
                            if (cOrders.some((o) => o.stage === 'REPORT_GENERATED' || o.stage === 'VALIDATED')) {
                              return <span className="badge badge-success" style={{ fontSize: '10px', padding: '1px 6px' }}>✓ Report Ready</span>;
                            }
                            if (cOrders.some((o) => o.stage === 'PROCESSING' || o.stage === 'RESULT_ENTERED')) {
                              return <span className="badge badge-info" style={{ fontSize: '10px', padding: '1px 6px' }}>⚙️ In Analysis</span>;
                            }
                            if (cOrders.some((o) => o.stage === 'COLLECTED' || o.stage === 'SAMPLE_COLLECTED')) {
                              return <span className="badge badge-warning" style={{ fontSize: '10px', padding: '1px 6px' }}>🧪 Collected</span>;
                            }
                            return <span className="badge badge-secondary" style={{ fontSize: '10px', padding: '1px 6px' }}>📋 Ordered</span>;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '14px' }}>
                    <RowActionsMenu
                      fixedActions={[
                        {
                          icon: <Volume2 size={14} />,
                          label: 'Re-Chime',
                          onClick: () => handleCallToken(currentInChamber),
                          variant: 'secondary',
                          title: 'Call patient chime again',
                          width: 104,
                        },
                        {
                          icon: <RotateCcw size={14} />,
                          label: 'Hold',
                          onClick: () => handlePutOnHold(currentInChamber),
                          variant: 'secondary',
                          title: 'Put patient on hold',
                          width: 84,
                        },
                      ]}
                      menuItems={[
                        {
                          id: 'no-show',
                          icon: <UserX size={14} color="var(--danger)" />,
                          label: 'Mark as No Show',
                          danger: true,
                          confirm: {
                            title: `Mark Token #${currentInChamber.token} as No Show?`,
                            description: 'Patient will be flagged absent and removed from the active queue.',
                            confirmText: 'Mark Absent',
                            cancelText: 'Cancel',
                            danger: true,
                          },
                          onClick: () => handleMarkNoShow(currentInChamber),
                        },
                      ]}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Chamber 204 is currently idle. Call next patient into cabin.
                </div>
              )}
            </div>

            {/* Waiting Queue List */}
            <div
              className="card"
              style={{
                padding: '16px 20px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-color)',
                borderLeft: '4px solid var(--primary)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} color="var(--primary)" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Waiting In Lobby ({waitingPatients.length})
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Click to Prepare
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
                {waitingPatients.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No patients waiting in queue.
                  </div>
                ) : (
                  waitingPatients.map((item) => {
                    const isSelected = activeIntakeId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setActiveIntakeId(item.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          backgroundColor: isSelected ? 'var(--primary-light)' : '#ffffff',
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                          borderLeft: isSelected ? '3px solid var(--primary)' : '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '1.1rem',
                              fontWeight: 700,
                              color: isSelected ? 'var(--primary)' : 'var(--secondary)',
                              width: '32px',
                              flexShrink: 0,
                            }}
                          >
                            #{String(item.token).padStart(2, '0')}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ fontSize: '13px', color: 'var(--secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.patient}
                            </strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {item.age}Y • {item.gender} • {item.time}
                              </span>
                              {(() => {
                                const pOrders = labOrders.filter((o) => o.uhid === item.uhid);
                                if (pOrders.length === 0) return null;
                                if (pOrders.some((o) => o.stage === 'REPORT_GENERATED' || o.stage === 'VALIDATED')) {
                                  return <span className="badge badge-success" style={{ fontSize: '10px', padding: '1px 5px' }}>✓ Ready</span>;
                                }
                                if (pOrders.some((o) => o.stage === 'PROCESSING' || o.stage === 'RESULT_ENTERED')) {
                                  return <span className="badge badge-info" style={{ fontSize: '10px', padding: '1px 5px' }}>⚙️ In Analysis</span>;
                                }
                                if (pOrders.some((o) => o.stage === 'COLLECTED' || o.stage === 'SAMPLE_COLLECTED')) {
                                  return <span className="badge badge-warning" style={{ fontSize: '10px', padding: '1px 5px' }}>🧪 Collected</span>;
                                }
                                return <span className="badge badge-secondary" style={{ fontSize: '10px', padding: '1px 5px' }}>📋 Ordered</span>;
                              })()}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <span
                            className={`badge ${
                              item.status === 'TRIAGED'
                                ? 'badge-success'
                                : item.priority === 'URGENT'
                                ? 'badge-danger'
                                : 'badge-secondary'
                            }`}
                            style={{ fontSize: '11px' }}
                          >
                            {item.status === 'TRIAGED' ? '✓ Triaged' : item.priority === 'URGENT' ? '🚨 URGENT' : 'Waiting'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCallToken(item);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ width: '32px', height: '32px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
                            title="Call token directly"
                          >
                            <Play size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Rapid Pre-Consult Triage & Clinical Alerts */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Active Intake Header */}
            {activeIntakeToken ? (
              <div
                style={{
                  padding: '14px 18px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  borderLeft: '4px solid var(--primary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    #{activeIntakeToken.token}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '15px', color: 'var(--secondary)' }}>
                        {activeIntakeToken.patient}
                      </strong>
                      <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                        Token #{activeIntakeToken.token}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      UHID: <strong style={{ color: 'var(--secondary)' }}>{activeIntakeToken.uhid}</strong> • {activeIntakeToken.age} Yrs / {activeIntakeToken.gender} • Blood Group: <strong style={{ color: 'var(--danger)' }}>{activeIntakeToken.bloodGroup || 'O+'}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, height: '36px', borderRadius: '8px' }}
                  >
                    <Upload size={14} /> <span>Attach Outside Records</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '16px', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Select a patient from the queue to start pre-consult vitals recording.
              </div>
            )}

            {/* Vitals Form */}
            <form onSubmit={handleSaveAndPushVitals} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HeartPulse size={18} color="var(--primary)" />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--secondary)' }}>
                      Vital Signs Intake
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, backgroundColor: bpCategory.color + '20', color: bpCategory.color }}>
                      {bpCategory.label}
                    </span>
                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, backgroundColor: bmiCategory.color + '20', color: bmiCategory.color }}>
                      BMI: {bmiValue} ({bmiCategory.label})
                    </span>
                  </div>
                </div>

                {/* 6 Vital Metric Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
                  {/* BP */}
                  <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Blood Pressure (mmHg)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        value={systolic}
                        onChange={(e) => setSystolic(e.target.value)}
                        placeholder="120"
                        className="form-input"
                        style={{ padding: '6px 8px', fontWeight: 700, fontSize: '14px', textAlign: 'center', height: '36px' }}
                        required
                      />
                      <span style={{ fontWeight: 700, color: 'var(--text-light)' }}>/</span>
                      <input
                        type="number"
                        value={diastolic}
                        onChange={(e) => setDiastolic(e.target.value)}
                        placeholder="80"
                        className="form-input"
                        style={{ padding: '6px 8px', fontWeight: 700, fontSize: '14px', textAlign: 'center', height: '36px' }}
                        required
                      />
                    </div>
                  </div>

                  {/* Pulse */}
                  <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Pulse Rate (bpm)
                    </label>
                    <input
                      type="number"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      placeholder="74"
                      className="form-input"
                      style={{ padding: '6px 8px', fontWeight: 700, fontSize: '14px', height: '36px' }}
                      required
                    />
                  </div>

                  {/* Temp */}
                  <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Body Temp (°F)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
                      placeholder="98.4"
                      className="form-input"
                      style={{ padding: '6px 8px', fontWeight: 700, fontSize: '14px', height: '36px' }}
                      required
                    />
                  </div>

                  {/* SpO2 */}
                  <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Oxygen SpO2 (%)
                    </label>
                    <input
                      type="number"
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      placeholder="99"
                      className="form-input"
                      style={{ padding: '6px 8px', fontWeight: 700, fontSize: '14px', color: 'var(--success)', height: '36px' }}
                      required
                    />
                  </div>

                  {/* Height & Weight */}
                  <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Height (cm) / Wt (kg)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="178"
                        className="form-input"
                        style={{ padding: '6px 8px', fontWeight: 700, fontSize: '13px', height: '36px' }}
                        required
                      />
                      <input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="76"
                        className="form-input"
                        style={{ padding: '6px 8px', fontWeight: 700, fontSize: '13px', height: '36px' }}
                        required
                      />
                    </div>
                  </div>

                  {/* RBS */}
                  <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Blood Sugar RBS (mg/dL)
                    </label>
                    <input
                      type="number"
                      value={rbs}
                      onChange={(e) => setRbs(e.target.value)}
                      placeholder="108"
                      className="form-input"
                      style={{ padding: '6px 8px', fontWeight: 700, fontSize: '14px', color: 'var(--primary)', height: '36px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Presenting Complaints & Symptoms */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Activity size={18} color="var(--primary)" />
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--secondary)' }}>
                    Presenting Complaints & Symptoms
                  </h3>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {[
                    'Fever',
                    'Dry Cough',
                    'Productive Cough',
                    'Sore Throat',
                    'Chest Pain',
                    'Shortness of Breath',
                    'Headache',
                    'Fatigue',
                    'Bodyache',
                    'Dizziness',
                    'Nausea / Vomiting',
                    'Abdominal Pain',
                  ].map((sym) => {
                    const active = selectedSymptoms.includes(sym);
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => toggleSymptom(sym)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: active ? 'var(--primary)' : '#ffffff',
                          color: active ? '#ffffff' : 'var(--text-main)',
                          border: `1px solid ${active ? 'var(--primary)' : 'var(--border-color)'}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {active ? '✓ ' : '+ '}
                        {sym}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={customSymptom}
                    onChange={(e) => setCustomSymptom(e.target.value)}
                    placeholder="Type other symptom and press enter..."
                    className="form-input"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomSymptom();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustomSymptom}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 600, height: '38px', padding: '0 14px' }}
                  >
                    Add Symptom
                  </button>
                </div>

                <textarea
                  value={chiefComplaints}
                  onChange={(e) => setChiefComplaints(e.target.value)}
                  placeholder="Patient verbatim statement or additional clinical observation..."
                  className="form-textarea"
                  rows={2}
                  style={{ width: '100%', fontSize: '13px', borderRadius: '10px' }}
                />
              </div>

              {/* Clinical Alerts: Allergies, Chronic Conditions & Home Medications */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <AlertTriangle size={18} color="var(--danger)" />
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--secondary)' }}>
                    Clinical Safety Alerts & Medical History
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  {/* Drug Allergies */}
                  <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                      <AlertTriangle size={15} color="var(--danger)" />
                      <span>Drug Allergies</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {allergies.map((allg) => (
                        <span
                          key={allg}
                          className="badge badge-danger"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          {allg}
                          <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeAllergy(allg)} />
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        value={customAllergy}
                        onChange={(e) => setCustomAllergy(e.target.value)}
                        placeholder="Add allergy..."
                        className="form-input"
                        style={{ height: '36px', flex: 1, padding: '0 8px', fontSize: '12px' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addAllergy();
                          }
                        }}
                      />
                      <button type="button" onClick={addAllergy} className="btn btn-secondary btn-sm" style={{ height: '36px', padding: '0 10px' }}>
                        +
                      </button>
                    </div>
                  </div>

                  {/* Chronic Conditions */}
                  <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warning)', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                      <HeartPulse size={15} color="var(--warning)" />
                      <span>Chronic Conditions</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {chronicConditions.map((cond) => (
                        <span
                          key={cond}
                          className="badge badge-warning"
                        >
                          {cond}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Current Home Medications */}
                  <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                      <Pill size={15} color="var(--primary)" />
                      <span>Current Home Meds</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {currentMedications.map((med) => (
                        <span
                          key={med}
                          className="badge badge-success"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          {med}
                          <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeCurrentMed(med)} />
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        value={customMed}
                        onChange={(e) => setCustomMed(e.target.value)}
                        placeholder="Add med (e.g. Aspirin)..."
                        className="form-input"
                        style={{ height: '36px', flex: 1, padding: '0 8px', fontSize: '12px' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCurrentMed();
                          }
                        }}
                      />
                      <button type="button" onClick={addCurrentMed} className="btn btn-secondary btn-sm" style={{ height: '36px', padding: '0 10px' }}>
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary Action Bar (§ 11 & § 13) */}
              <PrimaryActionBar
                primaryAction={{
                  label: `Save & Push Vitals Directly to ${selectedDoctor.split('(')[0].trim()}`,
                  icon: <ArrowRight size={16} />,
                  onClick: () => handleSaveAndPushVitals({ preventDefault: () => {} } as any),
                  variant: 'primary',
                }}
                statusText={
                  activeIntakeToken ? (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Token #{activeIntakeToken.token} • {activeIntakeToken.patient} ({activeIntakeToken.uhid})
                    </span>
                  ) : undefined
                }
              />
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SCREEN 2: INVESTIGATIONS & REPORTS TRACKER & UPLOADER                   */}
      {/* ======================================================================= */}
      {activeTab === 'investigations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header Action Bar */}
          <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)' }}>
                Diagnostic Investigations & Patient Reports
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Track specimen progression, review ready pathologist & radiology sign-offs, and attach external documents.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setInvFilter('all')}
                className={`subtab-pill ${invFilter === 'all' ? 'active' : ''}`}
              >
                All Orders ({labOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setInvFilter('ready')}
                className={`subtab-pill ${invFilter === 'ready' ? 'active' : ''}`}
                style={{ borderColor: '#10b981' }}
              >
                ✓ Reports Ready ({labOrders.filter((o) => o.stage === 'REPORT_GENERATED').length})
              </button>
              <button
                type="button"
                onClick={() => setInvFilter('pending')}
                className={`subtab-pill ${invFilter === 'pending' ? 'active' : ''}`}
                style={{ borderColor: '#f59e0b' }}
              >
                Pending in Lab ({labOrders.filter((o) => o.stage !== 'REPORT_GENERATED').length})
              </button>
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
              >
                <Upload size={14} /> Attach Outside Records
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem' }}>
            {/* Orders & Readiness Grid */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <strong style={{ fontSize: '0.9375rem', color: 'var(--secondary)' }}>
                  Active Diagnostic Orders Queue
                </strong>
                <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                  Live Departmental Pipeline
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredLabOrders.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No diagnostic orders match the selected filter.
                  </div>
                ) : (
                  filteredLabOrders.map((order) => {
                    const isReady = order.stage === 'REPORT_GENERATED';
                    return (
                      <div
                        key={order.id}
                        style={{
                          padding: '1rem',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color)',
                          borderLeft: isReady ? '4px solid var(--success)' : '4px solid var(--border-color)',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          boxShadow: 'var(--shadow-xs)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '8px',
                              backgroundColor: isReady ? 'var(--success-light)' : 'var(--bg-main)',
                              color: isReady ? 'var(--success)' : 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <FlaskConical size={20} />
                          </div>
                          <div>
                            <strong style={{ fontSize: '0.9375rem', color: 'var(--secondary)', display: 'block' }}>
                              {order.testName}
                            </strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Patient: <strong>{order.patientName}</strong> • UHID: {order.uhid} • Order: #{order.orderNo}
                            </div>
                            <div style={{ fontSize: '0.7188rem', color: '#64748b', marginTop: '0.15rem' }}>
                              Sample: {order.sampleType} ({order.container}) • Specimen Barcode: <code>{order.barcode}</code>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            className={`badge ${isReady ? 'badge-success' : 'badge-warning'}`}
                            style={{ fontSize: '11px' }}
                          >
                            {isReady ? '✓ Report Ready' : order.stage.replace('_', ' ')}
                          </span>

                          <RowActionsMenu
                            fixedActions={[
                              ...(isReady
                                ? [
                                    {
                                      icon: <Bell size={13} />,
                                      label: 'Notify',
                                      onClick: () =>
                                        showToast(
                                          `🔔 Dr. Sarah Jenkins notified that ${order.testName} for ${order.patientName} is ready in Chamber 204!`
                                        ),
                                      variant: 'primary' as const,
                                      title: 'Notify Doctor',
                                      width: 90,
                                    },
                                  ]
                                : []),
                              {
                                icon: <Eye size={13} />,
                                label: 'View',
                                onClick: () => setSelectedOrderForAssistantModal(order),
                                variant: 'secondary' as const,
                                title: 'View Order Status',
                                width: 78,
                              },
                            ]}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Attached External Records & Document Timeline */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.9375rem', color: 'var(--secondary)' }}>
                  Attached Outside Records ({attachedDocs.length})
                </strong>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', fontWeight: 700 }}
                >
                  + Upload
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {attachedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.8125rem', color: '#0f172a' }}>{doc.title}</strong>
                      <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>
                        {doc.category}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>
                      Patient: <strong>{doc.patientName}</strong> ({doc.uhid})
                    </div>
                    <div style={{ fontSize: '0.7188rem', color: '#64748b' }}>
                      Report Date: {doc.date} • {doc.uploadedBy}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SCREEN 3: CONSULTATION HANDOFF & FOLLOW-UP                              */}
      {/* ======================================================================= */}
      {activeTab === 'handoff' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Left Column: Post-Consultation Dispatches & Rx Print */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary)' }}>
                Post-Consultation Patient Dispatches
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Patients who completed consultation in Chamber 204. Hand off printed prescriptions & route to next station.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {completedPatients.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No completed consultations yet today.
                </div>
              ) : (
                completedPatients.map((item) => {
                  const relatedRx = prescriptions.find((p) => p.uhid === item.uhid);
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '1.15rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        borderLeft: '4px solid var(--success)',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        boxShadow: 'var(--shadow-xs)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong style={{ fontSize: '1.05rem', color: 'var(--secondary)' }}>{item.patient}</strong>
                            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                              ✓ Consultation Concluded
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7813rem', color: '#475569', marginTop: '0.15rem' }}>
                            Token #{item.token} • UHID: {item.uhid} • Lead: Dr. Sarah Jenkins
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Checked out:</span>
                          <div style={{ fontWeight: 800, fontSize: '0.875rem' }}>{item.checkoutTime || '11:45 AM'}</div>
                        </div>
                      </div>

                      {/* Action Handoff Bar */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                        {relatedRx && (
                          <button
                            type="button"
                            onClick={() => setSelectedRxForPrint(relatedRx)}
                            className="btn btn-primary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800 }}
                          >
                            <Printer size={14} /> Print Official Rx Slip
                          </button>
                        )}
                        <span
                          style={{
                            padding: '0.3rem 0.65rem',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            borderRadius: '6px',
                            fontSize: '0.7813rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <Pill size={13} /> Route to Pharmacy (Dispense Counter)
                        </span>
                        <span
                          style={{
                            padding: '0.3rem 0.65rem',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            borderRadius: '6px',
                            fontSize: '0.7813rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <Receipt size={13} /> Route to Billing (Cashier #02)
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Pre-Doctor Readiness Checklist & Follow-Up Coordinator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Pre-Doctor Checklist */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <CheckSquare size={18} color="#0284c7" />
                <strong style={{ fontSize: '0.9375rem', color: 'var(--secondary)' }}>
                  Pre-Doctor Encounter Checklist
                </strong>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checklist.vitalsDone}
                    onChange={(e) => setChecklist({ ...checklist, vitalsDone: e.target.checked })}
                  />
                  <span>Vital signs (BP, Pulse, Temp, SpO2, BMI) entered</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checklist.allergiesChecked}
                    onChange={(e) => setChecklist({ ...checklist, allergiesChecked: e.target.checked })}
                  />
                  <span>Drug allergies confirmed with patient</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checklist.priorReportsAttached}
                    onChange={(e) => setChecklist({ ...checklist, priorReportsAttached: e.target.checked })}
                  />
                  <span>Prior diagnostic reports attached to digital file</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checklist.fileOpened}
                    onChange={(e) => setChecklist({ ...checklist, fileOpened: e.target.checked })}
                  />
                  <span>Physical chart / case file placed at doctor desk</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checklist.patientSeated}
                    onChange={(e) => setChecklist({ ...checklist, patientSeated: e.target.checked })}
                  />
                  <span>Patient seated in Ante-Room waiting for chime</span>
                </label>
              </div>

              {activeIntakeToken && (
                <button
                  type="button"
                  onClick={() => handleAdmitToChamber(activeIntakeToken)}
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '0.5rem', width: '100%', fontWeight: 800, padding: '0.625rem' }}
                >
                  <ArrowRight size={16} /> Send {activeIntakeToken.patient} to Doctor Cabin 204
                </button>
              )}
            </div>

            {/* Follow-Up Coordination Desk */}
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <Calendar size={18} color="#6366f1" />
                <strong style={{ fontSize: '0.9375rem', color: 'var(--secondary)' }}>
                  Coordinate Follow-Up Visit
                </strong>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Select Patient:
                  </label>
                  <select
                    className="form-select"
                    style={{ fontSize: '0.8125rem' }}
                    value={activeIntakeToken?.id || ''}
                    onChange={(e) => setActiveIntakeId(e.target.value)}
                  >
                    {doctorQueue.map((q) => (
                      <option key={q.id} value={q.id}>
                        #{q.token} - {q.patient} ({q.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Return Interval:
                  </label>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {['3', '5', '7', '14', '30'].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => {
                          setSelectedFollowUpDays(days);
                          const d = new Date();
                          d.setDate(d.getDate() + Number(days));
                          setFollowUpDateInput(d.toISOString().split('T')[0]);
                        }}
                        className={`subtab-pill ${selectedFollowUpDays === days ? 'active' : ''}`}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        {days}D
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Follow-Up Date:
                  </label>
                  <input
                    type="date"
                    value={followUpDateInput}
                    onChange={(e) => setFollowUpDateInput(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.8125rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Pre-Visit Instructions for Patient:
                  </label>
                  <textarea
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    className="form-textarea"
                    rows={2}
                    style={{ fontSize: '0.8125rem' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleConfirmFollowUp(activeIntakeToken?.patient || 'Patient', activeIntakeToken?.uhid || '')}
                  className="btn btn-primary"
                  style={{ width: '100%', fontWeight: 700, padding: '0.625rem' }}
                >
                  <CheckCircle2 size={16} /> Confirm Follow-Up Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* ATTACH OUTSIDE DOCUMENT MODAL                                           */}
      {/* ======================================================================= */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" style={{ maxWidth: '520px', padding: '1.75rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={20} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
                  Attach External Patient Record
                </h3>
              </div>
              <button type="button" onClick={() => setShowUploadModal(false)} className="btn btn-secondary btn-sm">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Patient UHID & Name</label>
                <input
                  type="text"
                  disabled
                  value={`${activeIntakeToken?.patient || 'Patient'} (${activeIntakeToken?.uhid || ''})`}
                  className="form-input"
                  style={{ backgroundColor: '#f1f5f9' }}
                />
              </div>

              <div>
                <label className="form-label">Document Title / Report Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Previous 2D Echo or Fasting Glucose from outside lab"
                  className="form-input"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">Category</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value as any)}
                    className="form-select"
                  >
                    <option value="Lab">Laboratory Report</option>
                    <option value="Radiology">Radiology / Imaging</option>
                    <option value="Prescription">External Prescription</option>
                    <option value="Discharge Summary">Discharge Summary</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Report Date</label>
                  <input
                    type="date"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div style={{ padding: '1.25rem', border: '2px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <FileUp size={28} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  Drag & drop PDF / Scanned Image or browse
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Supports PDF, JPEG, PNG up to 15MB
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, fontWeight: 800 }}
                >
                  Attach to Encounter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* OFFICIAL PRINTABLE PRESCRIPTION MODAL                                   */}
      {/* ======================================================================= */}
      {selectedRxForPrint && (
        <div className="modal-overlay" onClick={() => setSelectedRxForPrint(null)}>
          <div className="modal-content" style={{ maxWidth: '780px', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0284c7', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  NORTH HOSPITAL • OFFICIAL PRESCRIPTION (Rx)
                </h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Rx No: {selectedRxForPrint.prescriptionNo} • Date: {selectedRxForPrint.date}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Printer size={14} /> Print Now
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRxForPrint(null)}
                  className="btn btn-secondary btn-sm"
                >
                  <X size={14} /> Close
                </button>
              </div>
            </div>

            <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <div>Patient: <strong>{selectedRxForPrint.patientName}</strong></div>
              <div>UHID: <strong>{selectedRxForPrint.uhid}</strong></div>
              <div>Age/Sex: <strong>{selectedRxForPrint.age}Y / {selectedRxForPrint.gender}</strong></div>
              <div>Physician: <strong>{selectedRxForPrint.doctorName}</strong></div>
              <div>Chamber: <strong>{selectedRxForPrint.chamber}</strong></div>
              <div>Diagnosis: <strong>{selectedRxForPrint.diagnosis}</strong></div>
            </div>

            <table className="table" style={{ width: '100%', marginBottom: '1.5rem', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '0.5rem' }}>Medicine & Form</th>
                  <th style={{ padding: '0.5rem' }}>Dosage</th>
                  <th style={{ padding: '0.5rem' }}>Frequency</th>
                  <th style={{ padding: '0.5rem' }}>Timing</th>
                  <th style={{ padding: '0.5rem' }}>Duration</th>
                  <th style={{ padding: '0.5rem' }}>Clinical Reason</th>
                </tr>
              </thead>
              <tbody>
                {selectedRxForPrint.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 700 }}>{item.medicineName}</td>
                    <td style={{ padding: '0.5rem' }}>{item.dosage}</td>
                    <td style={{ padding: '0.5rem' }}>{item.frequency}</td>
                    <td style={{ padding: '0.5rem' }}>{item.timing}</td>
                    <td style={{ padding: '0.5rem' }}>{item.durationDays} days</td>
                    <td style={{ padding: '0.5rem', color: '#0369a1', fontWeight: 600 }}>{item.reason || 'General therapy'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Handed over by Doctor Assistant • Chamber 204
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800 }}>{selectedRxForPrint.doctorName}</div>
                <div style={{ fontSize: '0.7188rem', color: 'var(--text-muted)' }}>Authorized Medical Sign-off</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assistant Order Tracking Modal - Strictly NO Clinical Values */}
      {selectedOrderForAssistantModal && (
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
              maxWidth: '520px',
              width: '100%',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FlaskConical size={20} color="var(--primary)" />
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--secondary)' }}>
                  Diagnostic Order Logistics
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForAssistantModal(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8125rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Order Number:</span>
                <strong style={{ display: 'block', color: '#0f172a' }}>#{selectedOrderForAssistantModal.orderNo}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Specimen Barcode:</span>
                <strong style={{ display: 'block', color: '#0f172a' }}>{selectedOrderForAssistantModal.barcode}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Patient Name:</span>
                <strong style={{ display: 'block', color: '#0f172a' }}>{selectedOrderForAssistantModal.patientName}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Patient UHID:</span>
                <strong style={{ display: 'block', color: '#0f172a' }}>{selectedOrderForAssistantModal.uhid}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Test Requested:</span>
                <strong style={{ display: 'block', color: 'var(--primary)' }}>{selectedOrderForAssistantModal.testName}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Sample Type:</span>
                <strong style={{ display: 'block', color: '#0f172a' }}>{selectedOrderForAssistantModal.sampleType}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Referring Doctor:</span>
                <strong style={{ display: 'block', color: '#0f172a' }}>{selectedOrderForAssistantModal.doctor}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Current Status:</span>
                <span className={`badge ${selectedOrderForAssistantModal.stage === 'REPORT_GENERATED' ? 'badge-success' : 'badge-warning'}`} style={{ display: 'inline-block', marginTop: '2px' }}>
                  {selectedOrderForAssistantModal.stage === 'REPORT_GENERATED' ? '✓ Report Ready' : selectedOrderForAssistantModal.stage.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Privacy Restriction Notice (Constraint: NO clinical values for assistant) */}
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                fontSize: '0.7813rem',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <ShieldAlert size={16} color="#2563eb" style={{ flexShrink: 0 }} />
              <span>
                <strong>Confidential Clinical Record:</strong> Biological values, numerical findings, and diagnostic impressions are restricted to authorized Attending Physicians only.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSelectedOrderForAssistantModal(null)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAssistantDashboard;
