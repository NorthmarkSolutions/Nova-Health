import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  Heart,
  Thermometer,
  Weight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  ClipboardCheck,
  HeartPulse,
  Bell,
  Volume2,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Eye,
  Plus,
  X,
  Search,
  Pill,
  Syringe,
  Bandage,
  FileSpreadsheet,
  CheckSquare,
  BedDouble,
  UserCheck,
  Send,
  Save,
} from 'lucide-react';
import {
  patientJourneyService,
  SharedQueueToken,
  NurseClinicalTask,
  NurseObservationBed,
  NurseShiftRecord,
} from '../../services/patientJourneyService';

export const NurseDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'triage-queue';

  const handleTabChange = (t: string) => {
    setSearchParams({ tab: t });
  };

  // Station & Nurse Context
  const [currentShift, setCurrentShift] = useState<'MORNING' | 'EVENING' | 'NIGHT'>('MORNING');
  const [nurseName] = useState('Nurse Clara Adams, RN');
  const [triageBooth] = useState('OPD Triage Station 01');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Audio Chime Synthesizer for Calling Patients
  const playCallingChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.18); // A5
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.85);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.85);
    } catch {
      // Audio not supported in environment
    }
  };

  // Live Shared State
  const [queue, setQueue] = useState<SharedQueueToken[]>(() => patientJourneyService.getQueue());
  const [tasks, setTasks] = useState<NurseClinicalTask[]>(() => patientJourneyService.getNurseTasks());
  const [obsBeds, setObsBeds] = useState<NurseObservationBed[]>(() => patientJourneyService.getObservationBeds());
  const [shiftRecord, setShiftRecord] = useState<NurseShiftRecord>(() => patientJourneyService.getNurseShiftRecord());

  // Listen to cross-department sync events
  useEffect(() => {
    const handleSync = () => {
      setQueue(patientJourneyService.getQueue());
      setTasks(patientJourneyService.getNurseTasks());
      setObsBeds(patientJourneyService.getObservationBeds());
      setShiftRecord(patientJourneyService.getNurseShiftRecord());
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('nh_data_sync', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('nh_data_sync', handleSync);
    };
  }, []);

  // =========================================================================
  // SCREEN 1: TRIAGE QUEUE STATE & LOGIC
  // =========================================================================
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'WAITING' | 'IN_TRIAGE' | 'EMERGENCY' | 'READY_FOR_DOCTOR'>('ALL');
  const [queueSearch, setQueueSearch] = useState('');

  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      if (queueFilter === 'WAITING' && item.status !== 'WAITING') return false;
      if (queueFilter === 'IN_TRIAGE' && item.status !== 'IN_TRIAGE') return false;
      if (queueFilter === 'EMERGENCY' && item.priority !== 'EMERGENCY') return false;
      if (queueFilter === 'READY_FOR_DOCTOR' && item.status !== 'READY_FOR_DOCTOR' && item.status !== 'TRIAGED') return false;

      if (queueSearch.trim()) {
        const q = queueSearch.toLowerCase();
        return (
          item.patient.toLowerCase().includes(q) ||
          item.uhid.toLowerCase().includes(q) ||
          item.doctor.toLowerCase().includes(q) ||
          String(item.token).includes(q)
        );
      }
      return true;
    });
  }, [queue, queueFilter, queueSearch]);

  const handleStartTriage = (item: SharedQueueToken) => {
    patientJourneyService.updateQueueToken(item.token, {
      status: 'IN_TRIAGE',
      triageStartTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    setSelectedPatientId(item.id);
    handleTabChange('vitals');
    showToast(`🩺 Commenced triage assessment for Token #${item.token}: ${item.patient}`);
  };

  const handleCallPatient = (item: SharedQueueToken) => {
    playCallingChime();
    patientJourneyService.updateQueueToken(item.token, {
      callingStatus: 'CALLING',
    });
    showToast(`🔔 Called Token #${item.token} (${item.patient}) to Triage Booth 01`);
  };

  const handleMarkEmergency = (item: SharedQueueToken) => {
    patientJourneyService.updateQueueToken(item.token, {
      priority: 'EMERGENCY',
      status: 'EMERGENCY',
    });
    showToast(`🚨 Token #${item.token} (${item.patient}) escalated to EMERGENCY status! Notify physician immediately.`);
  };

  const handleDirectSendToDoctor = (item: SharedQueueToken) => {
    patientJourneyService.updateQueueToken(item.token, {
      status: 'READY_FOR_DOCTOR',
    });
    showToast(`✓ Token #${item.token} (${item.patient}) dispatched directly to Doctor's Chamber Queue.`);
  };

  // =========================================================================
  // SCREEN 2: VITALS & ASSESSMENT STATE & LOGIC
  // =========================================================================
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    return queue.find((q) => q.status === 'IN_TRIAGE' || q.status === 'WAITING')?.id || queue[0]?.id || '';
  });

  const selectedPatient = useMemo(() => {
    return queue.find((q) => q.id === selectedPatientId) || queue[0] || null;
  }, [queue, selectedPatientId]);

  // Vitals Inputs
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [pulse, setPulse] = useState('74');
  const [temp, setTemp] = useState('98.6');
  const [spo2, setSpo2] = useState('99');
  const [respiratoryRate, setRespiratoryRate] = useState('16');
  const [weight, setWeight] = useState('72');
  const [height, setHeight] = useState('174');
  const [rbs, setRbs] = useState('110');

  // Assessment Inputs
  const [chiefComplaints, setChiefComplaints] = useState('Mild fatigue and intermittent palpitations for 3 days.');
  const [painScale, setPainScale] = useState<number>(2);
  const [allergies, setAllergies] = useState<string[]>(['Penicillin']);
  const [medicalHistory, setMedicalHistory] = useState<string[]>(['Hypertension (Mild)']);
  const [currentMedications, setCurrentMedications] = useState<string[]>(['Amlodipine 5mg OD']);
  const [customAllergy, setCustomAllergy] = useState('');
  const [customMed, setCustomMed] = useState('');
  const [customHistory, setCustomHistory] = useState('');

  // Auto-populate when selected patient changes
  useEffect(() => {
    if (selectedPatient) {
      if (selectedPatient.vitals) {
        const bpParts = (selectedPatient.vitals.bp || '120/80').split('/');
        setSystolic(bpParts[0] || '120');
        setDiastolic(bpParts[1] || '80');
        setPulse(String(selectedPatient.vitals.pulse || 74));
        setTemp(String(selectedPatient.vitals.temp || 98.6));
        setSpo2(String(selectedPatient.vitals.spo2 || 99));
        setRespiratoryRate(String(selectedPatient.vitals.respiratoryRate || 16));
        setWeight(String(selectedPatient.vitals.weight || 72));
        setHeight(String(selectedPatient.vitals.height || 174));
        if (selectedPatient.vitals.rbs) setRbs(String(selectedPatient.vitals.rbs));
        if (selectedPatient.vitals.painScale !== undefined) setPainScale(selectedPatient.vitals.painScale);
      }
      if (selectedPatient.allergies && selectedPatient.allergies.length > 0) {
        setAllergies(selectedPatient.allergies);
      }
      if (selectedPatient.chronicConditions && selectedPatient.chronicConditions.length > 0) {
        setMedicalHistory(selectedPatient.chronicConditions);
      }
      if (selectedPatient.triageNotes) {
        setChiefComplaints(selectedPatient.triageNotes);
      }
    }
  }, [selectedPatient?.id]);

  // BMI Calculation
  const bmiValue = useMemo(() => {
    const hM = Number(height) / 100;
    const wKg = Number(weight);
    if (!hM || !wKg || hM <= 0) return 23.8;
    return Number((wKg / (hM * hM)).toFixed(1));
  }, [height, weight]);

  const bmiCategory = useMemo(() => {
    if (bmiValue < 18.5) return { label: 'Underweight', color: '#f59e0b', bg: '#fef3c7' };
    if (bmiValue <= 24.9) return { label: 'Normal Weight', color: '#10b981', bg: '#d1fae5' };
    if (bmiValue <= 29.9) return { label: 'Overweight', color: '#f97316', bg: '#ffedd5' };
    return { label: 'Obese', color: '#ef4444', bg: '#fee2e2' };
  }, [bmiValue]);

  // BP Staging
  const bpCategory = useMemo(() => {
    const s = Number(systolic);
    const d = Number(diastolic);
    if (s < 120 && d < 80) return { label: 'Normal BP', color: '#10b981', bg: '#d1fae5' };
    if (s <= 129 && d < 80) return { label: 'Elevated BP', color: '#f59e0b', bg: '#fef3c7' };
    if (s <= 139 || d <= 89) return { label: 'Stage 1 HTN', color: '#f97316', bg: '#ffedd5' };
    return { label: 'Stage 2 HTN', color: '#ef4444', bg: '#fee2e2' };
  }, [systolic, diastolic]);

  const handleSaveVitalsOnly = () => {
    if (!selectedPatient) return;
    const bpString = `${systolic || '120'}/${diastolic || '80'}`;
    const vObj = {
      bp: bpString,
      pulse: Number(pulse) || 74,
      temp: Number(temp) || 98.6,
      spo2: Number(spo2) || 99,
      respiratoryRate: Number(respiratoryRate) || 16,
      weight: Number(weight) || 72,
      height: Number(height) || 174,
      bmi: bmiValue,
      rbs: Number(rbs) || 110,
      painScale,
      triageNotes: chiefComplaints,
    };
    patientJourneyService.updateQueueToken(selectedPatient.token, {
      vitals: vObj,
    });
    showToast(`✓ Vital signs saved for Token #${selectedPatient.token} (${selectedPatient.patient}).`);
  };

  const handleSaveAssessmentOnly = () => {
    if (!selectedPatient) return;
    patientJourneyService.updateQueueToken(selectedPatient.token, {
      allergies,
      chronicConditions: medicalHistory,
      medicalHistory,
      currentMedications,
      triageNotes: chiefComplaints,
      assessment: {
        chiefComplaint: chiefComplaints,
        painScale,
        allergies,
        medicalHistory,
        currentMedications,
        triagedBy: nurseName,
        triagedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    });
    showToast(`✓ Clinical assessment recorded for Token #${selectedPatient.token} (${selectedPatient.patient}).`);
  };

  const handlePushToDoctorQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    const bpString = `${systolic || '120'}/${diastolic || '80'}`;
    const vObj = {
      bp: bpString,
      pulse: Number(pulse) || 74,
      temp: Number(temp) || 98.6,
      spo2: Number(spo2) || 99,
      respiratoryRate: Number(respiratoryRate) || 16,
      weight: Number(weight) || 72,
      height: Number(height) || 174,
      bmi: bmiValue,
      rbs: Number(rbs) || 110,
      painScale,
      triageNotes: chiefComplaints,
    };

    patientJourneyService.updateQueueToken(selectedPatient.token, {
      status: 'READY_FOR_DOCTOR',
      vitals: vObj,
      allergies,
      chronicConditions: medicalHistory,
      medicalHistory,
      currentMedications,
      triageNotes: chiefComplaints,
      assessment: {
        chiefComplaint: chiefComplaints,
        painScale,
        allergies,
        medicalHistory,
        currentMedications,
        triagedBy: nurseName,
        triagedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    });

    showToast(
      `🚀 Triage Complete: Token #${selectedPatient.token} (${selectedPatient.patient}) pushed live to ${selectedPatient.doctor} & Doctor Assistant!`
    );
  };

  // Symptom Quick Chips
  const toggleSymptom = (sym: string) => {
    if (chiefComplaints.includes(sym)) {
      setChiefComplaints(chiefComplaints.replace(new RegExp(`,?\\s*${sym}`), '').trim());
    } else {
      setChiefComplaints((prev) => (prev ? `${prev}, ${sym}` : sym));
    }
  };

  const addAllergy = () => {
    if (!customAllergy.trim()) return;
    if (!allergies.includes(customAllergy.trim())) {
      setAllergies([...allergies, customAllergy.trim()]);
    }
    setCustomAllergy('');
  };

  const addMed = () => {
    if (!customMed.trim()) return;
    if (!currentMedications.includes(customMed.trim())) {
      setCurrentMedications([...currentMedications, customMed.trim()]);
    }
    setCustomMed('');
  };

  const addHistory = () => {
    if (!customHistory.trim()) return;
    if (!medicalHistory.includes(customHistory.trim())) {
      setMedicalHistory([...medicalHistory, customHistory.trim()]);
    }
    setCustomHistory('');
  };

  // =========================================================================
  // SCREEN 3: CLINICAL TASKS STATE & LOGIC
  // =========================================================================
  const [taskCategoryFilter, setTaskCategoryFilter] = useState<'ALL' | 'MEDICATION' | 'INJECTION' | 'DRESSING' | 'PROCEDURE' | 'SAMPLE'>('ALL');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [activeTaskForNotes, setActiveTaskForNotes] = useState<NurseClinicalTask | null>(null);
  const [taskExecutionNotes, setTaskExecutionNotes] = useState('');

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (taskCategoryFilter !== 'ALL' && t.category !== taskCategoryFilter) return false;
      if (taskStatusFilter !== 'ALL' && t.status !== taskStatusFilter) return false;
      return true;
    });
  }, [tasks, taskCategoryFilter, taskStatusFilter]);

  const handleStartTask = (taskId: string) => {
    patientJourneyService.updateNurseTaskStatus(taskId, 'IN_PROGRESS');
    showToast('Task marked IN PROGRESS.');
  };

  const handleCompleteTask = (task: NurseClinicalTask) => {
    setActiveTaskForNotes(task);
    setTaskExecutionNotes(task.nurseNotes || '');
  };

  const handleSaveCompletedTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTaskForNotes) return;
    patientJourneyService.updateNurseTaskStatus(activeTaskForNotes.id, 'COMPLETED', taskExecutionNotes);
    showToast(`✓ Order ${activeTaskForNotes.orderNo} marked COMPLETED.`);
    setActiveTaskForNotes(null);
    setTaskExecutionNotes('');
  };

  // =========================================================================
  // SCREEN 4: OBSERVATION BEDS STATE & LOGIC
  // =========================================================================
  const [selectedObsBedId, setSelectedObsBedId] = useState<string>(() => obsBeds[0]?.id || 'obs-01');
  const [showRepeatVitalsModal, setShowRepeatVitalsModal] = useState(false);
  const [repeatBp, setRepeatBp] = useState('118/76');
  const [repeatPulse, setRepeatPulse] = useState('72');
  const [repeatTemp, setRepeatTemp] = useState('98.4');
  const [repeatSpo2, setRepeatSpo2] = useState('99');
  const [repeatRr, setRepeatRr] = useState('16');
  const [repeatPain, setRepeatPain] = useState<number>(1);
  const [repeatResponse, setRepeatResponse] = useState('Patient comfortable, stable response to therapy.');
  const [repeatNote, setRepeatNote] = useState('Continue hourly vitals monitoring.');

  const selectedObsBed = useMemo(() => {
    return obsBeds.find((b) => b.id === selectedObsBedId) || obsBeds[0] || null;
  }, [obsBeds, selectedObsBedId]);

  const handleAddRepeatReading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObsBed) return;
    patientJourneyService.addObservationReading(selectedObsBed.id, {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      bp: repeatBp,
      pulse: Number(repeatPulse) || 72,
      temp: Number(repeatTemp) || 98.4,
      spo2: Number(repeatSpo2) || 99,
      respiratoryRate: Number(repeatRr) || 16,
      pain: repeatPain,
      response: repeatResponse,
      note: repeatNote,
    });
    setShowRepeatVitalsModal(false);
    showToast(`✓ Serial vital signs logged for ${selectedObsBed.patientName} (${selectedObsBed.bedNumber}).`);
  };

  const handleEscalateBed = (bed: NurseObservationBed) => {
    patientJourneyService.escalateObservationBed(bed.id);
    showToast(`⚠️ ${bed.bedNumber} (${bed.patientName}) escalated to ${bed.doctorName}! Urgent consult requested.`);
  };

  const handleDischargeBed = (bed: NurseObservationBed) => {
    patientJourneyService.dischargeObservationBed(bed.id);
    showToast(`✓ ${bed.patientName} discharged from ${bed.bedNumber}. Bed available for clean turnover.`);
  };

  // =========================================================================
  // SCREEN 5: SHIFT & HANDOVER STATE & LOGIC
  // =========================================================================
  const [handoverNotes, setHandoverNotes] = useState(shiftRecord.handoffNotes);
  const [checklistCrashCart, setChecklistCrashCart] = useState(true);
  const [checklistGlucometer, setChecklistGlucometer] = useState(true);
  const [checklistNarcotics, setChecklistNarcotics] = useState(true);
  const [checklistSuction, setChecklistSuction] = useState(true);

  const handleSubmitHandover = (e: React.FormEvent) => {
    e.preventDefault();
    patientJourneyService.submitNurseHandover({
      handoffNotes: handoverNotes,
      shift: currentShift,
      nurseName,
      pendingTasksCount: tasks.filter((t) => t.status !== 'COMPLETED').length,
      completedTasksCount: tasks.filter((t) => t.status === 'COMPLETED').length,
    });
    showToast('✓ Shift Handover recorded and archived for next roster nurse.');
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '1.25rem',
            right: '1.5rem',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '0.875rem 1.25rem',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            zIndex: 9999,
            fontSize: '0.875rem',
            fontWeight: 700,
            borderLeft: '4px solid #10b981',
            animation: 'slideIn 0.3s ease',
          }}
        >
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER: Nurse Station Identity Bar */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: '#ffffff',
          borderLeft: '5px solid #059669',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--secondary)' }}>
                OPD Nurse Station & Triage Center
              </h2>
              <span className="badge badge-success" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                {triageBooth}
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Duty Nurse: <strong>{nurseName}</strong> • Roster: <strong>{currentShift} Shift (07:00 – 15:00)</strong>
            </p>
          </div>
        </div>

        {/* Shift Badge & Quick Emergency Escalation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#f1f5f9',
              padding: '0.5rem 0.875rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Shift:
            </span>
            <select
              value={currentShift}
              onChange={(e) => setCurrentShift(e.target.value as any)}
              style={{
                border: 'none',
                background: 'transparent',
                fontWeight: 800,
                fontSize: '0.875rem',
                color: 'var(--secondary)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="MORNING">Morning (07:00 – 15:00)</option>
              <option value="EVENING">Evening (15:00 – 23:00)</option>
              <option value="NIGHT">Night (23:00 – 07:00)</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => {
              playCallingChime();
              showToast('🚨 Code Blue / Emergency Broadcast alert chimed across OPD.');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}
          >
            <ShieldAlert size={16} />
            <span>Emergency Alert</span>
          </button>
        </div>
      </div>

      {/* SUB-NAVIGATION TAB PILLS (5 MODULES) */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button
          type="button"
          onClick={() => handleTabChange('triage-queue')}
          className={`subtab-pill ${activeTab === 'triage-queue' ? 'active' : ''}`}
        >
          <Users size={16} />
          <span>1. Triage Queue ({queue.filter((q) => q.status === 'WAITING' || q.status === 'IN_TRIAGE').length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('vitals')}
          className={`subtab-pill ${activeTab === 'vitals' ? 'active' : ''}`}
        >
          <Activity size={16} />
          <span>2. Vitals & Assessment</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('tasks')}
          className={`subtab-pill ${activeTab === 'tasks' ? 'active' : ''}`}
        >
          <ClipboardCheck size={16} />
          <span>3. Clinical Tasks ({tasks.filter((t) => t.status !== 'COMPLETED').length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('observation')}
          className={`subtab-pill ${activeTab === 'observation' ? 'active' : ''}`}
        >
          <HeartPulse size={16} />
          <span>4. Observation & Monitoring ({obsBeds.filter((b) => b.status === 'ACTIVE').length} Beds)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('handover')}
          className={`subtab-pill ${activeTab === 'handover' ? 'active' : ''}`}
        >
          <Clock size={16} />
          <span>5. Shift & Handover</span>
        </button>
      </div>

      {/* ======================================================================= */}
      {/* SCREEN 1: TRIAGE QUEUE                                                  */}
      {/* ======================================================================= */}
      {activeTab === 'triage-queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Quick Metrics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Waiting for Triage
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', margin: '0.25rem 0' }}>
                {queue.filter((q) => q.status === 'WAITING').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Awaiting nurse intake</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #0284c7' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Currently in Triage
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0284c7', margin: '0.25rem 0' }}>
                {queue.filter((q) => q.status === 'IN_TRIAGE').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>At Triage Booth</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Ready for Doctor
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', margin: '0.25rem 0' }}>
                {queue.filter((q) => q.status === 'READY_FOR_DOCTOR' || q.status === 'TRIAGED').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Pushed to Chamber Queue</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Emergency Priority
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ef4444', margin: '0.25rem 0' }}>
                {queue.filter((q) => q.priority === 'EMERGENCY').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Immediate doctor bypass</div>
            </div>
          </div>

          {/* Queue Filter & Search Bar */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(['ALL', 'WAITING', 'IN_TRIAGE', 'EMERGENCY', 'READY_FOR_DOCTOR'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setQueueFilter(filter)}
                    className={`btn btn-sm ${queueFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontWeight: 700 }}
                  >
                    {filter === 'ALL' && 'All Tokens'}
                    {filter === 'WAITING' && 'Waiting'}
                    {filter === 'IN_TRIAGE' && 'In Triage'}
                    {filter === 'EMERGENCY' && '🚨 Emergency'}
                    {filter === 'READY_FOR_DOCTOR' && '✓ Ready for Doctor'}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search Patient, UHID, Doctor..."
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  style={{
                    padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    width: '260px',
                  }}
                />
              </div>
            </div>

            {/* Queue Table */}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Patient Name & UHID</th>
                    <th>Demographics</th>
                    <th>Assigned Doctor</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Wait Time</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                        No patients found matching the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((item) => (
                      <tr key={item.id} style={{ backgroundColor: item.priority === 'EMERGENCY' ? '#fff1f2' : undefined }}>
                        <td>
                          <span
                            style={{
                              fontSize: '1rem',
                              fontWeight: 900,
                              color: item.priority === 'EMERGENCY' ? '#ef4444' : '#0284c7',
                            }}
                          >
                            #{item.token}
                          </span>
                        </td>
                        <td>
                          <div>
                            <strong>{item.patient}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.uhid}</div>
                          </div>
                        </td>
                        <td>
                          {item.age} Y • {item.gender}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Blood: {item.bloodGroup || 'O+'}</div>
                        </td>
                        <td>
                          <strong>{item.doctor}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.room}</div>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              item.status === 'READY_FOR_DOCTOR' || item.status === 'TRIAGED'
                                ? 'badge-success'
                                : item.status === 'IN_TRIAGE'
                                ? 'badge-info'
                                : item.status === 'EMERGENCY'
                                ? 'badge-danger'
                                : 'badge-warning'
                            }`}
                          >
                            {item.status === 'READY_FOR_DOCTOR' || item.status === 'TRIAGED'
                              ? 'Ready for Doctor'
                              : item.status === 'IN_TRIAGE'
                              ? 'In Triage'
                              : item.status === 'EMERGENCY'
                              ? 'Emergency'
                              : 'Waiting'}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              backgroundColor:
                                item.priority === 'EMERGENCY'
                                  ? '#fee2e2'
                                  : item.priority === 'URGENT'
                                  ? '#fef3c7'
                                  : '#f1f5f9',
                              color:
                                item.priority === 'EMERGENCY'
                                  ? '#ef4444'
                                  : item.priority === 'URGENT'
                                  ? '#b45309'
                                  : '#475569',
                            }}
                          >
                            {item.priority || 'NORMAL'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8125rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={14} />
                            {item.time || '10:00 AM'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleCallPatient(item)}
                              title="Call patient to booth with audio chime"
                            >
                              <Volume2 size={14} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleStartTriage(item)}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <Activity size={14} />
                              <span>Start Triage</span>
                            </button>

                            {item.priority !== 'EMERGENCY' && (
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleMarkEmergency(item)}
                                title="Mark as emergency bypass"
                              >
                                <ShieldAlert size={14} />
                              </button>
                            )}

                            {item.status !== 'READY_FOR_DOCTOR' && item.status !== 'TRIAGED' && (
                              <button
                                type="button"
                                className="btn btn-outline-success btn-sm"
                                onClick={() => handleDirectSendToDoctor(item)}
                                title="Fast-track directly to Doctor"
                              >
                                <ArrowRight size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SCREEN 2: VITALS & ASSESSMENT                                           */}
      {/* ======================================================================= */}
      {activeTab === 'vitals' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* LEFT: Patient Selector List */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>
                Select Patient for Triage
              </h3>
              <span className="badge badge-warning">{queue.length} Total</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '680px', overflowY: 'auto' }}>
              {queue.map((pt) => {
                const isSelected = pt.id === selectedPatient?.id;
                return (
                  <div
                    key={pt.id}
                    onClick={() => setSelectedPatientId(pt.id)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: isSelected ? '#059669' : 'var(--secondary)', fontSize: '0.9rem' }}>
                        #{pt.token} {pt.patient}
                      </span>
                      <span
                        className={`badge ${
                          pt.status === 'READY_FOR_DOCTOR' || pt.status === 'TRIAGED'
                            ? 'badge-success'
                            : pt.status === 'IN_TRIAGE'
                            ? 'badge-info'
                            : 'badge-warning'
                        }`}
                        style={{ fontSize: '0.6875rem' }}
                      >
                        {pt.status === 'READY_FOR_DOCTOR' || pt.status === 'TRIAGED' ? 'Ready' : pt.status === 'IN_TRIAGE' ? 'In Triage' : 'Waiting'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {pt.uhid} • {pt.age}Y/{pt.gender[0]} • {pt.doctor.split(' ')[1] || pt.doctor}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Triage Clinical Entry Form */}
          {selectedPatient ? (
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Active Patient Banner */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#059669' }}>
                      Token #{selectedPatient.token}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary)' }}>
                      {selectedPatient.patient}
                    </h3>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>({selectedPatient.uhid})</span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {selectedPatient.age} Y • {selectedPatient.gender} • Blood Group: <strong>{selectedPatient.bloodGroup || 'O+'}</strong> • Doctor: <strong>{selectedPatient.doctor}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCallPatient(selectedPatient)}
                  >
                    <Volume2 size={16} /> Re-Chime
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleMarkEmergency(selectedPatient)}
                  >
                    <ShieldAlert size={16} /> Mark Emergency
                  </button>
                </div>
              </div>

              {/* SECTION A: VITALS FORM */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={18} color="#059669" />
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>
                      Vital Signs & Physiological Telemetry
                    </h4>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: bpCategory.bg, color: bpCategory.color }}>
                      {bpCategory.label}
                    </span>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: bmiCategory.bg, color: bmiCategory.color }}>
                      BMI {bmiValue} ({bmiCategory.label})
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      Blood Pressure (mmHg)
                    </label>
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Sys (120)"
                        value={systolic}
                        onChange={(e) => setSystolic(e.target.value)}
                        style={{ fontWeight: 800 }}
                      />
                      <span style={{ color: '#94a3b8', fontWeight: 800 }}>/</span>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Dia (80)"
                        value={diastolic}
                        onChange={(e) => setDiastolic(e.target.value)}
                        style={{ fontWeight: 800 }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      Pulse Rate (bpm)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="72"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      style={{ fontWeight: 800 }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      Temperature (°F)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      placeholder="98.6"
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
                      style={{ fontWeight: 800 }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      Oxygen Saturation SpO2 (%)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="99"
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      style={{ fontWeight: 800 }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      Respiratory Rate (breaths/min)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="16"
                      value={respiratoryRate}
                      onChange={(e) => setRespiratoryRate(e.target.value)}
                      style={{ fontWeight: 800 }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="174"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      style={{ fontWeight: 800 }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      placeholder="72"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      style={{ fontWeight: 800 }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      Random Blood Sugar (mg/dL)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="110"
                      value={rbs}
                      onChange={(e) => setRbs(e.target.value)}
                      style={{ fontWeight: 800 }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION B: CLINICAL ASSESSMENT */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                  <Heart size={18} color="#059669" />
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>
                    Clinical Assessment, Pain Scale & Medical History
                  </h4>
                </div>

                {/* Visual Wong-Baker Style Pain Scale */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0 }}>
                      Pain Scale Assessment (0 = No Pain, 10 = Worst Possible)
                    </label>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: painScale === 0 ? '#10b981' : painScale <= 3 ? '#f59e0b' : painScale <= 6 ? '#f97316' : '#ef4444' }}>
                      Selected: {painScale} / 10 ({painScale === 0 ? 'No Pain' : painScale <= 3 ? 'Mild Pain' : painScale <= 6 ? 'Moderate Pain' : 'Severe Pain'})
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                      const isSelected = painScale === score;
                      const scoreColor =
                        score === 0 ? '#10b981' : score <= 3 ? '#84cc16' : score <= 6 ? '#f59e0b' : score <= 8 ? '#f97316' : '#ef4444';
                      return (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setPainScale(score)}
                          style={{
                            flex: 1,
                            minWidth: '40px',
                            padding: '0.5rem 0.25rem',
                            borderRadius: '8px',
                            border: isSelected ? `2px solid ${scoreColor}` : '1px solid #e2e8f0',
                            backgroundColor: isSelected ? scoreColor : '#ffffff',
                            color: isSelected ? '#ffffff' : scoreColor,
                            fontWeight: 900,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          <span>{score}</span>
                          <span style={{ fontSize: '0.625rem' }}>
                            {score === 0 ? '😊' : score <= 3 ? '🙂' : score <= 6 ? '😐' : score <= 8 ? '😣' : '😭'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chief Complaints & Quick Symptoms */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0 }}>
                      Chief Complaint & Presenting Symptoms
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click chips to quickly append:</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    {[
                      'Fever / Chills',
                      'Central Chest Tightness',
                      'Dyspnea on Exertion',
                      'Dry Persistent Cough',
                      'Epigastric Burning',
                      'Postural Dizziness',
                      'Severe Throbbing Headache',
                      'Acute Joint Pain',
                      'Nausea / Vomiting',
                    ].map((sym) => {
                      const isPresent = chiefComplaints.includes(sym);
                      return (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => toggleSymptom(sym)}
                          style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: isPresent ? '1px solid #059669' : '1px solid #cbd5e1',
                            backgroundColor: isPresent ? '#ecfdf5' : '#ffffff',
                            color: isPresent ? '#059669' : '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          {isPresent ? '✓ ' : '+ '}
                          {sym}
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    rows={2}
                    className="form-textarea"
                    value={chiefComplaints}
                    onChange={(e) => setChiefComplaints(e.target.value)}
                    placeholder="Patient describes presenting symptoms, duration, exacerbating factors..."
                    style={{ fontWeight: 600 }}
                  />
                </div>

                {/* Allergies & Chronic Conditions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  {/* Allergies */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c' }}>
                      ⚠️ Known Drug Allergies
                    </label>
                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.4rem' }}>
                      <input
                        type="text"
                        placeholder="e.g. Sulfa, NSAIDs"
                        value={customAllergy}
                        onChange={(e) => setCustomAllergy(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.8125rem', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }}
                      />
                      <button type="button" className="btn btn-secondary btn-sm" onClick={addAllergy}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {allergies.map((allg) => (
                        <span
                          key={allg}
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          {allg}
                          <X size={12} style={{ cursor: 'pointer' }} onClick={() => setAllergies(allergies.filter((a) => a !== allg))} />
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Medical History */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309' }}>
                      📋 Medical History / Chronic
                    </label>
                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.4rem' }}>
                      <input
                        type="text"
                        placeholder="e.g. Asthma, T2DM"
                        value={customHistory}
                        onChange={(e) => setCustomHistory(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHistory())}
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.8125rem', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }}
                      />
                      <button type="button" className="btn btn-secondary btn-sm" onClick={addHistory}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {medicalHistory.map((hist) => (
                        <span
                          key={hist}
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          {hist}
                          <X size={12} style={{ cursor: 'pointer' }} onClick={() => setMedicalHistory(medicalHistory.filter((h) => h !== hist))} />
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Current Medications */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca' }}>
                      💊 Current Medications
                    </label>
                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.4rem' }}>
                      <input
                        type="text"
                        placeholder="e.g. Metformin 500mg"
                        value={customMed}
                        onChange={(e) => setCustomMed(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMed())}
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.8125rem', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }}
                      />
                      <button type="button" className="btn btn-secondary btn-sm" onClick={addMed}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {currentMedications.map((med) => (
                        <span
                          key={med}
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            backgroundColor: '#e0e7ff',
                            color: '#4338ca',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          {med}
                          <X size={12} style={{ cursor: 'pointer' }} onClick={() => setCurrentMedications(currentMedications.filter((m) => m !== med))} />
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS: SAVE & PUSH */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '1.25rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleSaveVitalsOnly}>
                    <Save size={16} /> Save Vitals
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleSaveAssessmentOnly}>
                    <FileSpreadsheet size={16} /> Save Assessment
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handlePushToDoctorQueue}
                  style={{
                    backgroundColor: '#059669',
                    borderColor: '#059669',
                    fontSize: '0.9375rem',
                    fontWeight: 800,
                    padding: '0.625rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>Push To Doctor Queue</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              Select a patient from the left panel to begin vitals and assessment intake.
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* SCREEN 3: CLINICAL TASKS                                                */}
      {/* ======================================================================= */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filter Bar */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(['ALL', 'MEDICATION', 'INJECTION', 'DRESSING', 'PROCEDURE', 'SAMPLE'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTaskCategoryFilter(cat)}
                    className={`btn btn-sm ${taskCategoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontWeight: 700 }}
                  >
                    {cat === 'ALL' && 'All Orders'}
                    {cat === 'MEDICATION' && 'Medication Orders'}
                    {cat === 'INJECTION' && 'Injection Orders'}
                    {cat === 'DRESSING' && 'Dressings'}
                    {cat === 'PROCEDURE' && 'Procedures'}
                    {cat === 'SAMPLE' && 'Sample Collection'}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setTaskStatusFilter(st)}
                    className={`btn btn-sm ${taskStatusFilter === st ? 'btn-secondary' : 'btn-outline-secondary'}`}
                    style={{ fontSize: '0.75rem', fontWeight: 800 }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Task Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {filteredTasks.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1' }}>
                No nursing tasks found matching the filter criteria.
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="card"
                  style={{
                    padding: '1.25rem',
                    borderLeft: `4px solid ${
                      task.priority === 'STAT' ? '#ef4444' : task.priority === 'URGENT' ? '#f59e0b' : '#0284c7'
                    }`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                        {task.orderNo}
                      </span>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <span
                          style={{
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.6875rem',
                            fontWeight: 800,
                            backgroundColor: task.priority === 'STAT' ? '#fee2e2' : '#fef3c7',
                            color: task.priority === 'STAT' ? '#ef4444' : '#b45309',
                          }}
                        >
                          {task.priority}
                        </span>
                        <span
                          className={`badge ${
                            task.status === 'COMPLETED' ? 'badge-success' : task.status === 'IN_PROGRESS' ? 'badge-info' : 'badge-warning'
                          }`}
                          style={{ fontSize: '0.6875rem' }}
                        >
                          {task.status}
                        </span>
                      </div>
                    </div>

                    <h4 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem', fontWeight: 800, color: 'var(--secondary)' }}>
                      {task.title}
                    </h4>

                    <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.5rem' }}>
                      Patient: <strong>{task.patientName}</strong> ({task.uhid}) • {task.age}Y/{task.gender[0]}
                    </div>

                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.4', margin: '0 0 0.75rem' }}>
                      {task.description}
                    </p>

                    {task.dosage && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Dosage / Route: <strong>{task.dosage}</strong> via <strong>{task.route || 'Oral'}</strong>
                      </div>
                    )}

                    <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> Ordered by {task.doctorName} • Scheduled: {task.scheduledTime}
                    </div>

                    {task.nurseNotes && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '6px', fontSize: '0.75rem', color: '#334155' }}>
                        <strong>Nurse Note:</strong> {task.nurseNotes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                    {task.status === 'PENDING' && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleStartTask(task.id)}
                        style={{ flex: 1 }}
                      >
                        Start Task
                      </button>
                    )}
                    {task.status !== 'COMPLETED' && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleCompleteTask(task)}
                        style={{ flex: 1, backgroundColor: '#059669', borderColor: '#059669' }}
                      >
                        Complete Task
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCompleteTask(task)}
                    >
                      Add Notes
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Modal to complete task and write execution notes */}
          {activeTaskForNotes && (
            <div className="modal-overlay">
              <div className="modal-content" style={{ maxWidth: '480px' }}>
                <div className="modal-header">
                  <div>
                    <h3 className="modal-title">Complete Task: {activeTaskForNotes.orderNo}</h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {activeTaskForNotes.patientName} • {activeTaskForNotes.title}
                    </p>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveTaskForNotes(null)}>✕</button>
                </div>

                <form onSubmit={handleSaveCompletedTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                      Nurse Execution Notes & Patient Tolerance
                    </label>
                    <textarea
                      rows={3}
                      className="form-textarea"
                      required
                      placeholder="e.g. Administered as prescribed. Vitals checked post-dose; patient tolerated well without complaints."
                      value={taskExecutionNotes}
                      onChange={(e) => setTaskExecutionNotes(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setActiveTaskForNotes(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                      Save & Mark Completed
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* SCREEN 4: OBSERVATION & MONITORING                                      */}
      {/* ======================================================================= */}
      {activeTab === 'observation' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* LEFT: Bed Roster */}
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>
                OPD Day-Care Observation Beds
              </h3>
              <span className="badge badge-info">{obsBeds.length} Total</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {obsBeds.map((bed) => {
                const isSelected = bed.id === selectedObsBed?.id;
                return (
                  <div
                    key={bed.id}
                    onClick={() => setSelectedObsBedId(bed.id)}
                    style={{
                      padding: '0.875rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: isSelected ? '#059669' : 'var(--secondary)' }}>
                        {bed.bedNumber}
                      </span>
                      <span
                        className={`badge ${
                          bed.status === 'ACTIVE' ? 'badge-warning' : bed.status === 'ESCALATED' ? 'badge-danger' : 'badge-secondary'
                        }`}
                        style={{ fontSize: '0.6875rem' }}
                      >
                        {bed.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginTop: '0.25rem' }}>
                      {bed.patientName}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {bed.uhid} • Admitted: {bed.startTime}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Active Bed Serial Telemetry & Monitoring */}
          {selectedObsBed ? (
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#059669' }}>
                      {selectedObsBed.bedNumber}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary)' }}>
                      {selectedObsBed.patientName}
                    </h3>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>({selectedObsBed.uhid})</span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {selectedObsBed.age} Y • {selectedObsBed.gender} • Doctor: <strong>{selectedObsBed.doctorName}</strong> • Start: <strong>{selectedObsBed.startTime}</strong>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#0369a1', fontWeight: 700, marginTop: '0.25rem' }}>
                    Primary Observation Diagnosis: {selectedObsBed.diagnosis}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowRepeatVitalsModal(true)}
                    style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                  >
                    <Activity size={14} /> Log Repeat Vitals
                  </button>
                  {selectedObsBed.status !== 'DISCHARGED' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleEscalateBed(selectedObsBed)}
                      >
                        <ShieldAlert size={14} /> Escalate
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDischargeBed(selectedObsBed)}
                      >
                        <CheckCircle2 size={14} /> Discharge
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Vitals Trend Table */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9375rem', fontWeight: 800, color: 'var(--secondary)' }}>
                  Serial Vitals Trend & Patient Response Timeline
                </h4>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>BP (mmHg)</th>
                        <th>Pulse (bpm)</th>
                        <th>Temp (°F)</th>
                        <th>SpO2 (%)</th>
                        <th>RR (/min)</th>
                        <th>Pain (0-10)</th>
                        <th>Clinical Response & Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedObsBed.readings.map((r, idx) => (
                        <tr key={r.id || idx}>
                          <td><strong>{r.time}</strong></td>
                          <td><span style={{ fontWeight: 800, color: '#0369a1' }}>{r.bp}</span></td>
                          <td>{r.pulse}</td>
                          <td>{r.temp}</td>
                          <td>{r.spo2}%</td>
                          <td>{r.respiratoryRate || 16}</td>
                          <td>
                            <span
                              style={{
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                backgroundColor: r.pain === 0 ? '#d1fae5' : r.pain <= 3 ? '#fef3c7' : '#fee2e2',
                                color: r.pain === 0 ? '#059669' : r.pain <= 3 ? '#b45309' : '#b91c1c',
                              }}
                            >
                              {r.pain}/10
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.8125rem', color: '#334155' }}>{r.response}</div>
                            {r.note && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.note}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Repeat Vitals Modal */}
              {showRepeatVitalsModal && (
                <div className="modal-overlay">
                  <div className="modal-content" style={{ maxWidth: '520px' }}>
                    <div className="modal-header">
                      <div>
                        <h3 className="modal-title">Record Repeat Vitals: {selectedObsBed.bedNumber}</h3>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {selectedObsBed.patientName} ({selectedObsBed.uhid})
                        </p>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => setShowRepeatVitalsModal(false)}>✕</button>
                    </div>

                    <form onSubmit={handleAddRepeatReading} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>BP (mmHg)</label>
                          <input type="text" className="form-input" value={repeatBp} onChange={(e) => setRepeatBp(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Pulse (bpm)</label>
                          <input type="number" className="form-input" value={repeatPulse} onChange={(e) => setRepeatPulse(e.target.value)} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Temp (°F)</label>
                          <input type="number" step="0.1" className="form-input" value={repeatTemp} onChange={(e) => setRepeatTemp(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>SpO2 (%)</label>
                          <input type="number" className="form-input" value={repeatSpo2} onChange={(e) => setRepeatSpo2(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Pain (0-10)</label>
                          <input type="number" min={0} max={10} className="form-input" value={repeatPain} onChange={(e) => setRepeatPain(Number(e.target.value))} />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Patient Response to Therapy</label>
                        <textarea rows={2} className="form-textarea" value={repeatResponse} onChange={(e) => setRepeatResponse(e.target.value)} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowRepeatVitalsModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                          Log Reading
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              Select an observation bed from the left roster to view trend telemetry.
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* SCREEN 5: SHIFT & HANDOVER                                              */}
      {/* ======================================================================= */}
      {activeTab === 'handover' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* LEFT: Handover Notes & Critical Patient Review */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--secondary)' }}>
                  Nurse Shift Summary & Handover Document
                </h3>
              </div>
              <span className="badge badge-success">{currentShift} SHIFT</span>
            </div>

            <form onSubmit={handleSubmitHandover} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                  Detailed Handover Notes for Relieving Nurse
                </label>
                <textarea
                  rows={4}
                  className="form-textarea"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="Record ward status, doctor instructions, pending lab follow-ups..."
                  style={{ fontWeight: 600 }}
                />
              </div>

              {/* Critical Patients Surveillance List */}
              <div>
                <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#b91c1c' }}>
                  🚨 Critical Patients Requiring Continuous Surveillance
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {shiftRecord.criticalPatients.map((crit, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        backgroundColor: '#fff1f2',
                        border: '1px solid #fecdd3',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#9f1239' }}>{crit.patientName}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{crit.uhid}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#881337', marginTop: '0.2rem' }}>
                        {crit.alert}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shift Verification Checklist */}
              <div>
                <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                  End-of-Shift Safety Checklist
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checklistCrashCart}
                      onChange={(e) => setChecklistCrashCart(e.target.checked)}
                    />
                    <span>Crash Cart Inspected & Sealed</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checklistGlucometer}
                      onChange={(e) => setChecklistGlucometer(e.target.checked)}
                    />
                    <span>Glucometer Strip Batch Calibrated</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checklistNarcotics}
                      onChange={(e) => setChecklistNarcotics(e.target.checked)}
                    />
                    <span>Narcotics / Schedule H Ampoules Verified</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checklistSuction}
                      onChange={(e) => setChecklistSuction(e.target.checked)}
                    />
                    <span>Suction & Oxygen Flowmeters Functional</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    backgroundColor: '#059669',
                    borderColor: '#059669',
                    fontWeight: 800,
                    padding: '0.625rem 1.25rem',
                  }}
                >
                  <CheckSquare size={16} /> Submit Handover to Next Shift
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: Shift Metrics & Doctor Instructions Noticeboard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.875rem', fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>
                Shift Activity Metrics
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ padding: '0.875rem', borderRadius: '8px', backgroundColor: '#f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Total Triage Intakes</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#059669' }}>{queue.length}</div>
                </div>
                <div style={{ padding: '0.875rem', borderRadius: '8px', backgroundColor: '#f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Active Obs Beds</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0284c7' }}>
                    {obsBeds.filter((b) => b.status === 'ACTIVE').length}
                  </div>
                </div>
                <div style={{ padding: '0.875rem', borderRadius: '8px', backgroundColor: '#f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Completed Tasks</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>
                    {tasks.filter((t) => t.status === 'COMPLETED').length}
                  </div>
                </div>
                <div style={{ padding: '0.875rem', borderRadius: '8px', backgroundColor: '#f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Pending Orders</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f59e0b' }}>
                    {tasks.filter((t) => t.status !== 'COMPLETED').length}
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #6366f1' }}>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>
                Doctor Instructions & Special Standing Orders
              </h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                • <strong>Dr. Sarah Jenkins:</strong> Patients presenting with acute chest tightness or palpitations require a 12-lead ECG and Troponin-T STAT before consultation.
                <br /><br />
                • <strong>Dr. Michael Chang:</strong> Fasting blood glucose to be drawn on all post-op hernia review patients before surgical dressing change.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
