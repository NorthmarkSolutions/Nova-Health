import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Heart,
  Volume2,
  ShieldAlert,
  Save,
  ArrowRight,
  Plus,
  X,
} from 'lucide-react';
import { SharedQueueToken } from '../../../services/patientJourneyService';
import { getVitalFlagDetails, VitalFieldKey } from './vitalRanges';
import { useAuth } from '../../../context/AuthContext';
import { PrimaryActionBar } from '../../../components/workspace/PrimaryActionBar';

interface VitalsAssessmentViewProps {
  queue: SharedQueueToken[];
  selectedPatientId: string | null;
  onSelectPatient: (patientId: string) => void;
  onCallPatient: (patient: SharedQueueToken) => void;
  onMarkEmergency: (patient: SharedQueueToken) => void;
  onSaveDraft: (patient: SharedQueueToken, vitals: any, assessment: any, priority?: string) => void;
  onPushToDoctor: (patient: SharedQueueToken, vitals: any, assessment: any, priority?: string) => void;
}

export const VitalsAssessmentView: React.FC<VitalsAssessmentViewProps> = ({
  queue,
  selectedPatientId,
  onSelectPatient,
  onCallPatient,
  onMarkEmergency,
  onSaveDraft,
  onPushToDoctor,
}) => {
  const { user } = useAuth();
  const currentUserName = user
    ? ((user as any)?.name as string | undefined) ||
      `${user.firstName || ''} ${user.lastName || ''}`.replace(/^Nurse\s+/i, '').replace(/^Dr\.\s+/i, '').trim() ||
      user.username
    : 'Priya Sharma';

  const selectedPatient = useMemo(
    () => queue.find((q) => q.id === selectedPatientId) || queue[0] || null,
    [queue, selectedPatientId]
  );

  // Vitals State (initial empty strings - untouched patient has empty fields)
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [temp, setTemp] = useState('');
  const [spo2, setSpo2] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [rbs, setRbs] = useState('');

  // Clinical Assessment State
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomFreeText, setSymptomFreeText] = useState('');
  const [painScale, setPainScale] = useState<number | null>(null); // Default null (§ Requirement C.4)
  const [allergies, setAllergies] = useState<string[]>([]);
  const [isNkda, setIsNkda] = useState(false); // No known drug allergies (§ Requirement C.3)
  const [medicalHistory, setMedicalHistory] = useState<string[]>([]);
  const [currentMedications, setCurrentMedications] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');
  const [customMed, setCustomMed] = useState('');
  const [customHistory, setCustomHistory] = useState('');

  // Triage Priority State (§ Requirement C.1)
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT' | 'EMERGENCY'>('NORMAL');
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);

  // Save Tracking & Audit Trail State (§ Requirement B & C.5)
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');
  const [auditInfo, setAuditInfo] = useState<{ time: string; name: string } | null>(null);

  // Auto-populate when selected patient changes (§ Requirement B: Reload Bug Fix & Zero Carryover)
  useEffect(() => {
    // 1. RESET every field first to empty state (zero data leakage between patients)
    setSystolic('');
    setDiastolic('');
    setPulse('');
    setTemp('');
    setSpo2('');
    setRespiratoryRate('');
    setWeight('');
    setHeight('');
    setRbs('');
    setSelectedSymptoms([]);
    setSymptomFreeText('');
    setPainScale(null);
    setAllergies([]);
    setIsNkda(false);
    setMedicalHistory([]);
    setCurrentMedications([]);
    setCustomAllergy('');
    setCustomMed('');
    setCustomHistory('');
    setShowEmergencyConfirm(false);

    if (!selectedPatient) {
      setPriority('NORMAL');
      setLastSavedTime(null);
      setAuditInfo(null);
      setSavedSnapshot('');
      return;
    }

    // 2. Pre-select patient's current priority (§ Requirement C.1)
    const initPriority =
      selectedPatient.priority === 'EMERGENCY'
        ? 'EMERGENCY'
        : selectedPatient.priority === 'URGENT'
        ? 'URGENT'
        : 'NORMAL';
    setPriority(initPriority);

    // 3. Populate vitals from patient.vitals
    let initSys = '';
    let initDia = '';
    let initPulse = '';
    let initTemp = '';
    let initSpo2 = '';
    let initResp = '';
    let initWeight = '';
    let initHeight = '';
    let initRbs = '';
    let initPain: number | null = null;

    if (selectedPatient.vitals) {
      if (selectedPatient.vitals.bp) {
        const bpParts = selectedPatient.vitals.bp.split('/');
        initSys = bpParts[0] || '';
        initDia = bpParts[1] || '';
        setSystolic(initSys);
        setDiastolic(initDia);
      }
      if (selectedPatient.vitals.pulse !== undefined) {
        initPulse = String(selectedPatient.vitals.pulse);
        setPulse(initPulse);
      }
      if (selectedPatient.vitals.temp !== undefined) {
        initTemp = String(selectedPatient.vitals.temp);
        setTemp(initTemp);
      }
      if (selectedPatient.vitals.spo2 !== undefined) {
        initSpo2 = String(selectedPatient.vitals.spo2);
        setSpo2(initSpo2);
      }
      if (selectedPatient.vitals.respiratoryRate !== undefined) {
        initResp = String(selectedPatient.vitals.respiratoryRate);
        setRespiratoryRate(initResp);
      }
      if (selectedPatient.vitals.weight !== undefined) {
        initWeight = String(selectedPatient.vitals.weight);
        setWeight(initWeight);
      }
      if (selectedPatient.vitals.height !== undefined) {
        initHeight = String(selectedPatient.vitals.height);
        setHeight(initHeight);
      }
      if (selectedPatient.vitals.rbs !== undefined) {
        initRbs = String(selectedPatient.vitals.rbs);
        setRbs(initRbs);
      }
      if (selectedPatient.vitals.painScale !== undefined) {
        initPain = selectedPatient.vitals.painScale;
        setPainScale(initPain);
      }
    }

    // 4. Populate assessment from patient.assessment (FIX RELOAD BUG) falling back to top-level
    const rawAllergies =
      selectedPatient.assessment?.allergies ?? selectedPatient.allergies ?? [];
    let initAllergies: string[] = [];
    let initNkda = false;
    if (rawAllergies.includes('NKDA')) {
      initNkda = true;
      initAllergies = ['NKDA'];
      setIsNkda(true);
      setAllergies(['NKDA']);
    } else if (rawAllergies.length > 0) {
      initAllergies = [...rawAllergies];
      setAllergies([...rawAllergies]);
    }

    const rawHistory =
      (selectedPatient.assessment as any)?.chronicConditions ??
      selectedPatient.assessment?.medicalHistory ??
      selectedPatient.chronicConditions ??
      selectedPatient.medicalHistory ??
      [];
    let initHistory: string[] = [];
    if (rawHistory.length > 0) {
      initHistory = [...rawHistory];
      setMedicalHistory([...rawHistory]);
    }

    // Medications reload fix: load from assessment.currentMedications or patient.currentMedications
    const rawMeds =
      selectedPatient.assessment?.currentMedications ??
      selectedPatient.currentMedications ??
      [];
    let initMeds: string[] = [];
    if (rawMeds.length > 0) {
      initMeds = [...rawMeds];
      setCurrentMedications([...rawMeds]);
    }

    // Pain scale from assessment if vitals didn't have it
    if (initPain === null && selectedPatient.assessment?.painScale !== undefined) {
      initPain = selectedPatient.assessment.painScale;
      setPainScale(initPain);
    }

    // Chief complaints
    const rawComplaints =
      (selectedPatient.assessment as any)?.chiefComplaints ??
      selectedPatient.assessment?.chiefComplaint ??
      (selectedPatient.triageNotes && !selectedPatient.triageNotes.startsWith('EMERGENCY')
        ? selectedPatient.triageNotes
        : '');
    let initComplaints = '';
    if (rawComplaints) {
      initComplaints = rawComplaints;
      setSymptomFreeText(rawComplaints);
    }

    // Audit Info & Saved Time
    if (selectedPatient.assessment?.triagedAt) {
      setLastSavedTime(selectedPatient.assessment.triagedAt);
      setAuditInfo({
        time: selectedPatient.assessment.triagedAt,
        name: selectedPatient.assessment.triagedBy || currentUserName,
      });
    } else {
      setLastSavedTime(null);
      setAuditInfo(null);
    }

    // Initialize baseline snapshot for dirty tracking
    setSavedSnapshot(
      JSON.stringify({
        systolic: initSys,
        diastolic: initDia,
        pulse: initPulse,
        temp: initTemp,
        spo2: initSpo2,
        respiratoryRate: initResp,
        weight: initWeight,
        height: initHeight,
        rbs: initRbs,
        painScale: initPain,
        allergies: initAllergies,
        isNkda: initNkda,
        medicalHistory: initHistory,
        currentMedications: initMeds,
        symptomFreeText: initComplaints,
        priority: initPriority,
      })
    );
  }, [selectedPatient?.id]);

  // Dirty State Evaluation (§ Requirement B: "Unsaved changes")
  const currentSnapshot = JSON.stringify({
    systolic,
    diastolic,
    pulse,
    temp,
    spo2,
    respiratoryRate,
    weight,
    height,
    rbs,
    painScale,
    allergies,
    isNkda,
    medicalHistory,
    currentMedications,
    symptomFreeText,
    priority,
  });

  const isDirty = savedSnapshot !== '' && currentSnapshot !== savedSnapshot;

  // BMI Calculation
  const bmiValue = useMemo(() => {
    const hM = Number(height) / 100;
    const wKg = Number(weight);
    if (!hM || !wKg || hM <= 0 || isNaN(hM) || isNaN(wKg)) return null;
    return Number((wKg / (hM * hM)).toFixed(1));
  }, [height, weight]);

  const bmiCategory = useMemo(() => {
    if (bmiValue === null) return { label: '-', color: 'var(--text-muted)', bg: 'var(--gray-100)' };
    if (bmiValue < 18.5) return { label: 'Underweight', color: 'var(--warning)', bg: 'var(--warning-light)' };
    if (bmiValue <= 24.9) return { label: 'Normal Weight', color: 'var(--success)', bg: 'var(--success-light)' };
    if (bmiValue <= 29.9) return { label: 'Overweight', color: 'var(--warning)', bg: 'var(--warning-light)' };
    return { label: 'Obese', color: 'var(--danger)', bg: 'var(--danger-light)' };
  }, [bmiValue]);

  // BP Staging
  const bpCategory = useMemo(() => {
    if (!systolic || !diastolic || !systolic.trim() || !diastolic.trim()) {
      return { label: '-', color: 'var(--text-muted)', bg: 'var(--gray-100)' };
    }
    const s = Number(systolic);
    const d = Number(diastolic);
    if (isNaN(s) || isNaN(d) || s <= 0 || d <= 0) {
      return { label: '-', color: 'var(--text-muted)', bg: 'var(--gray-100)' };
    }
    if (s >= 140 || d >= 90) {
      return { label: 'Stage 2 HTN', color: 'var(--danger)', bg: 'var(--danger-light)' };
    }
    if (s >= 130 || d >= 80) {
      return { label: 'Stage 1 HTN', color: 'var(--warning)', bg: 'var(--warning-light)' };
    }
    if (s >= 120 && d < 80) {
      return { label: 'Elevated', color: 'var(--warning)', bg: 'var(--warning-light)' };
    }
    return { label: 'Normal', color: 'var(--success)', bg: 'var(--success-light)' };
  }, [systolic, diastolic]);

  // Symptom Chips Toggle
  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  // Build chiefComplaints from chips + free text
  const combinedChiefComplaints = useMemo(() => {
    const parts: string[] = [];
    if (selectedSymptoms.length > 0) {
      parts.push(selectedSymptoms.join(', '));
    }
    if (symptomFreeText.trim()) {
      parts.push(symptomFreeText.trim());
    }
    return parts.join('. ');
  }, [selectedSymptoms, symptomFreeText]);

  const addAllergy = () => {
    if (isNkda) return;
    if (customAllergy.trim() && !allergies.includes(customAllergy.trim())) {
      setAllergies([...allergies, customAllergy.trim()]);
      setCustomAllergy('');
    }
  };

  const addHistory = () => {
    if (customHistory.trim() && !medicalHistory.includes(customHistory.trim())) {
      setMedicalHistory([...medicalHistory, customHistory.trim()]);
      setCustomHistory('');
    }
  };

  const addMed = () => {
    if (customMed.trim() && !currentMedications.includes(customMed.trim())) {
      setCurrentMedications([...currentMedications, customMed.trim()]);
      setCustomMed('');
    }
  };

  // Payloads
  const getVitalsPayload = () => ({
    bp: systolic.trim() && diastolic.trim() ? `${systolic.trim()}/${diastolic.trim()}` : undefined,
    pulse: pulse.trim() ? Number(pulse) : undefined,
    temp: temp.trim() ? Number(temp) : undefined,
    spo2: spo2.trim() ? Number(spo2) : undefined,
    respiratoryRate: respiratoryRate.trim() ? Number(respiratoryRate) : undefined,
    weight: weight.trim() ? Number(weight) : undefined,
    height: height.trim() ? Number(height) : undefined,
    bmi: bmiValue ?? undefined,
    rbs: rbs.trim() ? Number(rbs) : undefined,
    painScale: painScale !== null ? painScale : undefined,
  });

  const getAssessmentPayload = (timeStr?: string) => ({
    chiefComplaint: combinedChiefComplaints,
    chiefComplaints: combinedChiefComplaints,
    allergies: isNkda ? ['NKDA'] : allergies,
    chronicConditions: medicalHistory,
    medicalHistory,
    currentMedications,
    painScale: painScale !== null ? painScale : undefined,
    triagedBy: currentUserName,
    triagedAt: timeStr || lastSavedTime || undefined,
  });

  // Validation: disable Push to Doctor unless BP, pulse, temp, and SpO2 filled
  const isVitalsComplete = Boolean(
    systolic.trim() &&
    diastolic.trim() &&
    pulse.trim() &&
    temp.trim() &&
    spo2.trim()
  );

  // Helper for Clinical Flags (§ Requirement C.2)
  const getFlagHelper = (field: VitalFieldKey, value: string) => {
    return getVitalFlagDetails(field, value, selectedPatient?.age);
  };

  const pulseFlag = getFlagHelper('pulse', pulse);
  const tempFlag = getFlagHelper('temp', temp);
  const spo2Flag = getFlagHelper('spo2', spo2);
  const respFlag = getFlagHelper('respiratoryRate', respiratoryRate);
  const rbsFlag = getFlagHelper('rbs', rbs);

  // Unified Save Draft Handler (§ Requirement B)
  const handleSave = () => {
    if (!selectedPatient) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const vitals = getVitalsPayload();
    const assessment = getAssessmentPayload(timeStr);

    onSaveDraft(selectedPatient, vitals, assessment, priority);
    setLastSavedTime(timeStr);
    setAuditInfo({ time: timeStr, name: currentUserName });
    setSavedSnapshot(currentSnapshot);
  };

  // Push to Doctor Handler
  const handlePush = () => {
    if (!selectedPatient || !isVitalsComplete) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const vitals = getVitalsPayload();
    const assessment = getAssessmentPayload(timeStr);

    onPushToDoctor(selectedPatient, vitals, assessment, priority);
    setLastSavedTime(timeStr);
    setAuditInfo({ time: timeStr, name: currentUserName });
    setSavedSnapshot(currentSnapshot);
  };

  return (
    <div
      className="nurse-vitals-layout"
      style={{
        flex: 1,
        minHeight: '640px',
        height: 'calc(100vh - 200px)',
        alignItems: 'stretch',
      }}
    >
      {/* LEFT COLUMN: PATIENT SELECTION ROSTER (Scrolls independently) */}
      <div
        className="card"
        style={{
          padding: '20px',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Fixed Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--secondary)', margin: 0 }}>
            Triage Patients
          </h2>
          <span className="badge badge-secondary">{queue.length} Queue</span>
        </div>

        {/* Scrollable list: fills available height without hard maxHeight (§ Requirement A) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          {queue.map((pt) => {
            const isSelected = pt.id === selectedPatient?.id;
            return (
              <div
                key={pt.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectPatient(pt.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectPatient(pt.id);
                  }
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  backgroundColor: isSelected ? 'var(--primary-light)' : '#ffffff',
                  transition: 'var(--transition)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontWeight: 600,
                      color: isSelected ? 'var(--primary)' : 'var(--secondary)',
                      fontSize: '14px',
                    }}
                  >
                    #{pt.token} {pt.patient}
                  </span>
                  <span
                    className={`badge ${
                      pt.status === 'READY_FOR_DOCTOR' || pt.status === 'TRIAGED'
                        ? 'badge-success'
                        : pt.status === 'IN_TRIAGE'
                        ? 'badge-info'
                        : pt.status === 'EMERGENCY'
                        ? 'badge-danger'
                        : 'badge-warning'
                    }`}
                  >
                    {pt.status === 'READY_FOR_DOCTOR' || pt.status === 'TRIAGED'
                      ? 'Ready'
                      : pt.status === 'IN_TRIAGE'
                      ? 'In Triage'
                      : pt.status === 'EMERGENCY'
                      ? 'Emergency'
                      : 'Waiting'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {pt.uhid} • {pt.age}Y/{pt.gender[0]} • {pt.doctor.split(' ')[1] || pt.doctor}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: CLINICAL INTAKE FORM (Scrollable body with pinned action footer) */}
      {selectedPatient ? (
        <div
          className="card"
          style={{
            padding: 0,
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* SCROLLABLE FORM BODY */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '24px',
            }}
          >
            {/* Active Patient Identity Banner */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: 'var(--gray-50)',
                border: '1px solid var(--border-color)',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>
                    #{selectedPatient.token}
                  </span>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--secondary)' }}>
                    {selectedPatient.patient}
                  </h2>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    ({selectedPatient.uhid})
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {selectedPatient.age} Y • {selectedPatient.gender} • Blood Group:{' '}
                  <strong style={{ color: 'var(--text-main)' }}>
                    {selectedPatient.bloodGroup || 'O+'}
                  </strong>{' '}
                  • Doctor:{' '}
                  <strong style={{ color: 'var(--text-main)' }}>{selectedPatient.doctor}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onCallPatient(selectedPatient)}
                >
                  <Volume2 size={14} /> Chime
                </button>
              </div>
            </div>

            {/* SECTION 1: VITALS FORM */}
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} color="var(--primary)" />
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--secondary)' }}>
                    Vital Signs & Physiological Telemetry
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Triage Priority Segmented Control (§ Requirement C.1) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Priority:
                    </span>
                    <div
                      className="triage-priority-segmented"
                      style={{
                        display: 'inline-flex',
                        backgroundColor: 'var(--gray-100)',
                        borderRadius: '8px',
                        padding: '3px',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setPriority('NORMAL')}
                        style={{
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          backgroundColor: priority === 'NORMAL' ? '#ffffff' : 'transparent',
                          color: priority === 'NORMAL' ? 'var(--secondary)' : 'var(--text-muted)',
                          boxShadow: priority === 'NORMAL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriority('URGENT')}
                        style={{
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          backgroundColor: priority === 'URGENT' ? 'var(--warning)' : 'transparent',
                          color: priority === 'URGENT' ? '#ffffff' : 'var(--text-muted)',
                          boxShadow: priority === 'URGENT' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Urgent
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (priority === 'EMERGENCY') return;
                          setShowEmergencyConfirm(true);
                        }}
                        style={{
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          backgroundColor: priority === 'EMERGENCY' ? 'var(--danger)' : 'transparent',
                          color: priority === 'EMERGENCY' ? '#ffffff' : 'var(--text-muted)',
                          boxShadow: priority === 'EMERGENCY' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Emergency
                      </button>
                    </div>
                  </div>

                  {/* BP & BMI Badges */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: bpCategory.bg,
                        color: bpCategory.color,
                      }}
                    >
                      {bpCategory.label}
                    </span>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: bmiCategory.bg,
                        color: bmiCategory.color,
                      }}
                    >
                      {bmiValue !== null ? `BMI ${bmiValue} (${bmiCategory.label})` : 'BMI: -'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Emergency Escalation Confirmation Step (§ Requirement C.1) */}
              {showEmergencyConfirm && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--danger-light)',
                    border: '1px solid var(--danger)',
                    marginBottom: '16px',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--danger)' }}>
                      Escalate Token #{selectedPatient.token} to EMERGENCY priority?
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ height: '28px', padding: '0 10px', fontSize: '12px' }}
                      onClick={() => setShowEmergencyConfirm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      style={{ height: '28px', padding: '0 12px', fontSize: '12px', fontWeight: 600 }}
                      onClick={() => {
                        onMarkEmergency(selectedPatient);
                        setPriority('EMERGENCY');
                        setShowEmergencyConfirm(false);
                      }}
                    >
                      Confirm Emergency
                    </button>
                  </div>
                </div>
              )}

              {/* Vitals Input Grid with Abnormal Value Flags (§ Requirement C.2) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '16px',
                }}
              >
                {/* BP */}
                <div className="form-group">
                  <label className="form-label">Blood Pressure (mmHg)</label>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%' }}>
                    <input
                      type="number"
                      className="form-input"
                      style={{ flex: 1, minWidth: 0 }}
                      placeholder="e.g. 120"
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                    />
                    <span style={{ color: 'var(--text-light)', fontWeight: 600 }}>/</span>
                    <input
                      type="number"
                      className="form-input"
                      style={{ flex: 1, minWidth: 0 }}
                      placeholder="e.g. 80"
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                    />
                  </div>
                </div>

                {/* Pulse */}
                <div className="form-group">
                  <label className="form-label">Pulse Rate (bpm)</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{
                      border: pulseFlag
                        ? pulseFlag.level === 'critical'
                          ? '1px solid var(--danger)'
                          : '1px solid var(--warning)'
                        : undefined,
                    }}
                    placeholder="e.g. 72"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                  />
                  {pulseFlag && (
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: pulseFlag.level === 'critical' ? 'var(--danger)' : 'var(--warning)',
                        marginTop: '2px',
                      }}
                    >
                      {pulseFlag.label}
                    </span>
                  )}
                </div>

                {/* Temp */}
                <div className="form-group">
                  <label className="form-label">Temperature (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    style={{
                      border: tempFlag
                        ? tempFlag.level === 'critical'
                          ? '1px solid var(--danger)'
                          : '1px solid var(--warning)'
                        : undefined,
                    }}
                    placeholder="e.g. 98.6"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                  />
                  {tempFlag && (
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: tempFlag.level === 'critical' ? 'var(--danger)' : 'var(--warning)',
                        marginTop: '2px',
                      }}
                    >
                      {tempFlag.label}
                    </span>
                  )}
                </div>

                {/* SpO2 */}
                <div className="form-group">
                  <label className="form-label">Oxygen SpO2 (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{
                      border: spo2Flag
                        ? spo2Flag.level === 'critical'
                          ? '1px solid var(--danger)'
                          : '1px solid var(--warning)'
                        : undefined,
                    }}
                    placeholder="e.g. 99"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                  />
                  {spo2Flag && (
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: spo2Flag.level === 'critical' ? 'var(--danger)' : 'var(--warning)',
                        marginTop: '2px',
                      }}
                    >
                      {spo2Flag.label}
                    </span>
                  )}
                </div>

                {/* Respiratory Rate */}
                <div className="form-group">
                  <label className="form-label">Respiratory Rate (/min)</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{
                      border: respFlag
                        ? respFlag.level === 'critical'
                          ? '1px solid var(--danger)'
                          : '1px solid var(--warning)'
                        : undefined,
                    }}
                    placeholder="e.g. 16"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(e.target.value)}
                  />
                  {respFlag && (
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: respFlag.level === 'critical' ? 'var(--danger)' : 'var(--warning)',
                        marginTop: '2px',
                      }}
                    >
                      {respFlag.label}
                    </span>
                  )}
                </div>

                {/* Height */}
                <div className="form-group">
                  <label className="form-label">Height (cm)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 174"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>

                {/* Weight */}
                <div className="form-group">
                  <label className="form-label">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    placeholder="e.g. 70"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>

                {/* RBS */}
                <div className="form-group">
                  <label className="form-label">Random Sugar (mg/dL)</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{
                      border: rbsFlag
                        ? rbsFlag.level === 'critical'
                          ? '1px solid var(--danger)'
                          : '1px solid var(--warning)'
                        : undefined,
                    }}
                    placeholder="e.g. 110"
                    value={rbs}
                    onChange={(e) => setRbs(e.target.value)}
                  />
                  {rbsFlag && (
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: rbsFlag.level === 'critical' ? 'var(--danger)' : 'var(--warning)',
                        marginTop: '2px',
                      }}
                    >
                      {rbsFlag.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: CLINICAL ASSESSMENT & PAIN SCALE */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Heart size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--secondary)' }}>
                  Clinical Assessment, Pain Scale & History
                </h3>
              </div>

              {/* Pain Scale (Wong-Baker 0-10 - Default null § Requirement C.4) */}
              <div style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <label className="form-label" style={{ margin: 0 }}>
                    Pain Scale Assessment (0 = No Pain, 10 = Worst)
                  </label>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color:
                        painScale === null
                          ? 'var(--text-muted)'
                          : painScale === 0
                          ? 'var(--success)'
                          : painScale <= 3
                          ? 'var(--warning)'
                          : 'var(--danger)',
                    }}
                  >
                    Score: {painScale !== null ? `${painScale} / 10` : 'Not assessed'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                    const isSelected = painScale === score;
                    return (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setPainScale((prev) => (prev === score ? null : score))}
                        aria-pressed={isSelected}
                        style={{
                          flex: 1,
                          minWidth: '38px',
                          height: '40px',
                          borderRadius: '8px',
                          border: isSelected
                            ? '1px solid var(--primary)'
                            : '1px solid var(--border-color)',
                          backgroundColor: isSelected ? 'var(--primary)' : '#ffffff',
                          color: isSelected ? '#ffffff' : 'var(--text-main)',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'var(--transition)',
                        }}
                      >
                        <span>{score}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chief Complaints with Chips */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <label className="form-label" style={{ margin: 0 }}>
                    Chief Complaint & Symptoms
                  </label>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Click chips to append:
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {[
                    'Fever / Chills',
                    'Central Chest Tightness',
                    'Dyspnea on Exertion',
                    'Dry Cough',
                    'Epigastric Burning',
                    'Severe Headache',
                    'Acute Joint Pain',
                  ].map((sym) => {
                    const isPresent = selectedSymptoms.includes(sym);
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => toggleSymptom(sym)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: 500,
                          border: isPresent
                            ? '1px solid var(--primary)'
                            : '1px solid var(--border-color)',
                          backgroundColor: isPresent ? 'var(--primary-light)' : 'var(--gray-50)',
                          color: isPresent ? 'var(--primary)' : 'var(--text-main)',
                          cursor: 'pointer',
                          transition: 'var(--transition)',
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
                  value={symptomFreeText}
                  onChange={(e) => setSymptomFreeText(e.target.value)}
                  placeholder="Additional notes: duration, triggers, clinical specifics..."
                />

                {combinedChiefComplaints && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-main)' }}>Recorded Complaints:</strong>{' '}
                    {combinedChiefComplaints}
                  </div>
                )}
              </div>

              {/* Allergies, Medical History, Medications (3-Column Layout) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px',
                }}
              >
                {/* Drug Allergies with NKDA Checkbox (§ Requirement C.3) */}
                <div className="form-group">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px',
                    }}
                  >
                    <label className="form-label" style={{ color: 'var(--danger)', margin: 0 }}>
                      ⚠️ Drug Allergies
                    </label>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isNkda}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsNkda(checked);
                          if (checked) {
                            setAllergies(['NKDA']);
                            setCustomAllergy('');
                          } else {
                            setAllergies([]);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                      No known drug allergies (NKDA)
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', width: '100%' }}>
                    <input
                      type="text"
                      className="form-input"
                      disabled={isNkda}
                      style={{
                        height: '36px',
                        flex: 1,
                        minWidth: 0,
                        backgroundColor: isNkda ? 'var(--gray-100)' : '#ffffff',
                        cursor: isNkda ? 'not-allowed' : 'text',
                      }}
                      placeholder={isNkda ? 'NKDA recorded' : 'e.g. Sulfa, NSAIDs'}
                      value={customAllergy}
                      onChange={(e) => setCustomAllergy(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                    />
                    <button
                      type="button"
                      disabled={isNkda}
                      className="btn btn-secondary btn-sm"
                      style={{
                        height: '36px',
                        flexShrink: 0,
                        cursor: isNkda ? 'not-allowed' : 'pointer',
                        opacity: isNkda ? 0.5 : 1,
                      }}
                      onClick={addAllergy}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {allergies.map((allg) => (
                      <span
                        key={allg}
                        className={allg === 'NKDA' ? 'badge badge-success' : 'badge badge-danger'}
                      >
                        {allg}
                        {!isNkda && (
                          <X
                            size={12}
                            style={{ cursor: 'pointer', marginLeft: '4px' }}
                            onClick={() => setAllergies(allergies.filter((a) => a !== allg))}
                          />
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Medical History */}
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--warning)' }}>
                    📋 Chronic History
                  </label>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', width: '100%' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ height: '36px', flex: 1, minWidth: 0 }}
                      placeholder="e.g. Asthma, T2DM"
                      value={customHistory}
                      onChange={(e) => setCustomHistory(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHistory())}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ height: '36px', flexShrink: 0 }}
                      onClick={addHistory}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {medicalHistory.map((hist) => (
                      <span key={hist} className="badge badge-warning">
                        {hist}
                        <X
                          size={12}
                          style={{ cursor: 'pointer', marginLeft: '4px' }}
                          onClick={() => setMedicalHistory(medicalHistory.filter((h) => h !== hist))}
                        />
                      </span>
                    ))}
                  </div>
                </div>

                {/* Current Medications */}
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--primary)' }}>
                    💊 Medications
                  </label>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', width: '100%' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ height: '36px', flex: 1, minWidth: 0 }}
                      placeholder="e.g. Metformin 500mg"
                      value={customMed}
                      onChange={(e) => setCustomMed(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMed())}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ height: '36px', flexShrink: 0 }}
                      onClick={addMed}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {currentMedications.map((med) => (
                      <span key={med} className="badge badge-info">
                        {med}
                        <X
                          size={12}
                          style={{ cursor: 'pointer', marginLeft: '4px' }}
                          onClick={() =>
                            setCurrentMedications(currentMedications.filter((m) => m !== med))
                          }
                        />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PINNED ACTION FOOTER (§ Requirement A & B: Pinned to bottom, single Save + Push) */}
          <PrimaryActionBar
            className="pinned-action-footer"
            style={{ position: 'sticky' }}
            secondaryAction={
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSave}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                }}
              >
                <Save size={16} />
                <span>Save</span>
              </button>
            }
            statusText={
              <>
                {isDirty ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Unsaved changes
                  </span>
                ) : lastSavedTime ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Saved {lastSavedTime}
                  </span>
                ) : null}

                {auditInfo && (
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      borderLeft: '1px solid var(--border-color)',
                      paddingLeft: '12px',
                    }}
                  >
                    Recorded {auditInfo.time} by {auditInfo.name}
                  </span>
                )}
              </>
            }
            hint={
              !isVitalsComplete ? '⚠️ Fill BP, Pulse, Temp & SpO2 to push to doctor' : undefined
            }
            primaryAction={
              <button
                type="button"
                className="btn btn-primary"
                disabled={!isVitalsComplete}
                style={{
                  height: '40px',
                  padding: '0 18px',
                  borderRadius: '10px',
                  opacity: isVitalsComplete ? 1 : 0.5,
                  cursor: isVitalsComplete ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onClick={handlePush}
              >
                <span>Push to Doctor Chamber Queue</span>
                <ArrowRight size={16} />
              </button>
            }
          />
        </div>
      ) : (
        <div
          className="card"
          style={{
            padding: '48px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '14px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Select a patient from the left roster to record physiological vitals and pre-consultation intake.
        </div>
      )}
    </div>
  );
};
