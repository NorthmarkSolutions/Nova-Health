import React, { useState } from 'react';
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
} from 'lucide-react';
import { AppointmentStatus, Gender, PrescriptionItem } from '../../types';
import { patientJourneyService } from '../../services/patientJourneyService';

interface QueuePatient {
  id: string;
  tokenNumber: number;
  appointmentNumber: string;
  uhid: string;
  name: string;
  age: number;
  gender: Gender;
  bloodGroup: string;
  phone: string;
  slotTime: string;
  type: string;
  status: AppointmentStatus;
  allergies: string[];
  chronicConditions: string[];
  vitals?: {
    bp: string;
    pulse: number;
    temp: number;
    spo2: number;
    height: number;
    weight: number;
    bmi: number;
    triageNotes?: string;
  };
  previousVisitsCount: number;
}

export const DoctorDashboard: React.FC = () => {
  // Queue state loaded from patientJourneyService
  const [queue, setQueue] = useState<QueuePatient[]>(() => {
    const rawQueue = patientJourneyService.getQueue();
    return rawQueue.map((q) => ({
      id: q.id || `apt-${q.token}`,
      tokenNumber: q.token,
      appointmentNumber: q.aptNo,
      uhid: q.uhid,
      name: q.patient,
      age: q.age || 35,
      gender: (q.gender as Gender) || Gender.MALE,
      bloodGroup: q.bloodGroup || 'O+',
      phone: q.phone || '+1 555-010-9999',
      slotTime: q.time || '10:00 AM',
      type: q.type || 'WALK_IN',
      status: (q.status as AppointmentStatus) || AppointmentStatus.WAITING,
      allergies: q.allergies || [],
      chronicConditions: q.chronicConditions || [],
      vitals: q.vitals || {
        bp: '122/80',
        pulse: 76,
        temp: 98.6,
        spo2: 99,
        height: 175,
        weight: 72,
        bmi: 23.5,
        triageNotes: 'Newly registered patient. Ready for examination.',
      },
      previousVisitsCount: 1,
    }));
  });

  const [activePatientId, setActivePatientId] = useState<string>('apt-001');
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'soap' | 'prescription' | 'orders' | 'history'>('soap');

  // Active consultation form state
  const [chiefComplaints, setChiefComplaints] = useState('Persistent dry cough for 4 days, mild sore throat, and intermittent fatigue.');
  const [clinicalFindings, setClinicalFindings] = useState('Throat: Erythematous pharynx without purulent exudates.\nChest: Clear bilaterally, vesicular breath sounds.\nCVS: S1, S2 heard, no murmurs.');
  const [diagnosis, setDiagnosis] = useState('Acute Upper Respiratory Tract Infection');
  const [diagnosisCode, setDiagnosisCode] = useState('ICD-10: J06.9');
  const [doctorNotes, setDoctorNotes] = useState('Advised hydration, gargling, and symptomatic medication. Return if fever persists beyond 3 days.');
  const [followUpDate, setFollowUpDate] = useState('2026-09-22');

  // E-Prescription State
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
    {
      medicineName: 'Amoxicillin 500mg',
      dosage: '500mg (1 Cap)',
      frequency: '1-0-1',
      timing: 'AFTER_FOOD',
      durationDays: 5,
      totalQuantity: 10,
      instructions: 'Take after meals with a full glass of water',
    },
    {
      medicineName: 'Paracetamol 650mg',
      dosage: '650mg (1 Tab)',
      frequency: '1-0-1 SOS',
      timing: 'AFTER_FOOD',
      durationDays: 3,
      totalQuantity: 6,
      instructions: 'Take only if temperature exceeds 99°F',
    },
    {
      medicineName: 'Levocetirizine 5mg',
      dosage: '5mg (1 Tab)',
      frequency: '0-0-1',
      timing: 'AFTER_FOOD',
      durationDays: 5,
      totalQuantity: 5,
      instructions: 'Take before bedtime',
    },
  ]);

  // Selected patient entity
  const activePatient = queue.find((p) => p.id === activePatientId) || queue[0];

  const handleStartConsultation = (patientId: string) => {
    setActivePatientId(patientId);
    setQueue((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, status: AppointmentStatus.IN_CONSULTATION } : p)),
    );
  };

  const handleFinalizeConsultation = () => {
    // 1. Update queue status
    setQueue((prev) =>
      prev.map((p) => (p.id === activePatient.id ? { ...p, status: AppointmentStatus.COMPLETED } : p)),
    );
    patientJourneyService.updateQueueStatus(activePatient.tokenNumber, 'COMPLETED');

    // 2. Automatically dispatch Lab Order for Diagnostic Lab Station
    const labOrderId = `lab-${Date.now()}`;
    patientJourneyService.addLabOrder({
      id: labOrderId,
      orderNo: `LAB-202609-${Math.floor(100 + Math.random() * 900)}`,
      patientName: activePatient.name,
      uhid: activePatient.uhid,
      age: activePatient.age,
      gender: String(activePatient.gender),
      testName: 'Complete Blood Count (CBC) with ESR',
      category: 'Hematology',
      sampleType: 'Whole Blood',
      container: 'EDTA Vacutainer (Lavender Cap)',
      doctor: 'Dr. Sarah Jenkins, MD',
      barcode: `BC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      stage: 'COLLECTED',
      price: 45.0,
      isFlaggedAbnormal: false,
      parameters: [
        { paramName: 'Hemoglobin (Hb)', observedValue: '13.8', referenceRange: '13.0 - 17.0', unit: 'g/dL', isAbnormal: false },
        { paramName: 'Total Leukocyte Count (WBC)', observedValue: '7,500', referenceRange: '4,000 - 11,000', unit: '/mcL', isAbnormal: false },
        { paramName: 'Platelet Count', observedValue: '260,000', referenceRange: '150,000 - 450,000', unit: '/mcL', isAbnormal: false },
        { paramName: 'Erythrocyte Sedimentation Rate (ESR)', observedValue: '10', referenceRange: '0 - 15', unit: 'mm/1st hr', isAbnormal: false },
      ],
      technicianNote: 'Ordered during OPD Consultation. Sent to Lab.',
    });

    // 3. Automatically generate Consolidated Invoice for Billing & Accounts
    const invId = `inv-${Date.now()}`;
    patientJourneyService.addInvoice({
      id: invId,
      invNo: `INV-202609-${Math.floor(10000 + Math.random() * 90000)}`,
      patientName: activePatient.name,
      uhid: activePatient.uhid,
      phone: activePatient.phone,
      category: 'OPD',
      date: new Date().toISOString().split('T')[0],
      subtotal: 170.0,
      discount: 0.0,
      tax: 0.0,
      advanceDeducted: 0.0,
      total: 170.0,
      paid: 0.0,
      balance: 170.0,
      status: 'UNPAID',
      items: [
        { source: 'Consultation', description: 'Dr. Sarah Jenkins MD Consultation', qty: 1, unitPrice: 90.0, total: 90.0 },
        { source: 'Laboratory', description: 'Complete Blood Count (CBC) with ESR', qty: 1, unitPrice: 45.0, total: 45.0 },
        { source: 'Pharmacy', description: 'E-Prescription Medication Dispense', qty: 1, unitPrice: 35.0, total: 35.0 },
      ],
    });

    alert(`Consultation finalized for ${activePatient.name}!\n✓ E-Prescription issued to Pharmacy\n✓ CBC Lab Order routed to Laboratory\n✓ Itemized Invoice ($170.00) sent to Billing & Accounts`);
  };

  const addPrescriptionItem = () => {
    setPrescriptionItems([
      ...prescriptionItems,
      {
        medicineName: '',
        dosage: '1 Tab',
        frequency: '1-0-1',
        timing: 'AFTER_FOOD',
        durationDays: 3,
        totalQuantity: 6,
        instructions: '',
      },
    ]);
  };

  const removePrescriptionItem = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const filteredQueue = queue.filter(
    (p) =>
      p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.uhid.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.appointmentNumber.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="page-header" style={{ padding: '1.25rem 2rem' }}>
        <div>
          <h2 className="page-title">Doctor OPD Consultation Workspace</h2>
          <p className="page-subtitle">Dr. Sarah Jenkins, MD (Internal Medicine) • Room 204</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary">
            <Printer size={16} /> Print Blank Rx
          </button>
          <button className="btn btn-primary" onClick={handleFinalizeConsultation}>
            <CheckCircle2 size={18} /> Finalize Visit & Issue Rx
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Queue (340px), Right Active Consultation (Rest) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '1.5rem', gap: '1.5rem' }}>
        
        {/* ================= LEFT: PATIENT QUEUE PANEL ================= */}
        <aside
          style={{
            width: '360px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {/* Queue Header & Search */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--secondary)' }}>
                <Users size={18} color="var(--primary)" />
                Today's Queue ({queue.length})
              </div>
              <span className="badge badge-info">
                {queue.filter((p) => p.status === AppointmentStatus.COMPLETED).length} Done
              </span>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.25rem', fontSize: '0.8125rem' }}
                placeholder="Search token, name, UHID..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            </div>
          </div>

          {/* Queue List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredQueue.map((item) => {
              const isActive = item.id === activePatient.id;
              let badgeClass = 'badge-secondary';
              if (item.status === AppointmentStatus.IN_CONSULTATION) badgeClass = 'badge-info';
              if (item.status === AppointmentStatus.TRIAGED) badgeClass = 'badge-success';
              if (item.status === AppointmentStatus.COMPLETED) badgeClass = 'badge-secondary';

              return (
                <div
                  key={item.id}
                  onClick={() => handleStartConsultation(item.id)}
                  style={{
                    padding: '0.875rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}`,
                    backgroundColor: isActive ? 'var(--primary-light)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: isActive ? 'var(--primary)' : 'var(--secondary)',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        #{item.tokenNumber}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--secondary)' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {item.age}Y • {item.gender} • {item.uhid}
                        </div>
                      </div>
                    </div>
                    <span className={`badge ${badgeClass}`} style={{ fontSize: '0.6875rem' }}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: '0.625rem',
                      paddingTop: '0.5rem',
                      borderTop: '1px dashed var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>Slot: <strong>{item.slotTime}</strong></span>
                    {item.vitals ? (
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Vitals Triaged</span>
                    ) : (
                      <span style={{ color: 'var(--warning)', fontWeight: 600 }}>• Vitals Pending</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ================= RIGHT: ACTIVE CONSULTATION WORKSPACE ================= */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
          
          {/* 1. Patient Demographics & Vitals Header Banner */}
          <div
            className="card"
            style={{
              padding: '1.25rem 1.5rem',
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
              borderColor: '#bae6fd',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Top Row: Info & Alerts */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--secondary)' }}>
                    {activePatient.name}
                  </h3>
                  <span className="badge badge-info">{activePatient.uhid}</span>
                  <span className="badge badge-secondary">{activePatient.type}</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {activePatient.age} Years • {activePatient.gender} • Blood Group: <strong>{activePatient.bloodGroup}</strong> • Phone: {activePatient.phone}
                </div>
              </div>

              {/* Medical Alerts / Allergies Tag */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {activePatient.allergies.length > 0 && (
                  <div
                    style={{
                      padding: '0.375rem 0.75rem',
                      backgroundColor: 'var(--danger-light)',
                      border: '1px solid #fca5a5',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--danger)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    <AlertCircle size={14} />
                    Allergies: {activePatient.allergies.join(', ')}
                  </div>
                )}
                {activePatient.chronicConditions.length > 0 && (
                  <div
                    style={{
                      padding: '0.375rem 0.75rem',
                      backgroundColor: 'var(--warning-light)',
                      border: '1px solid #fde68a',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#92400e',
                    }}
                  >
                    Chronic: {activePatient.chronicConditions.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row: Vitals Stats Strip */}
            {activePatient.vitals ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: '0.75rem',
                  backgroundColor: 'var(--bg-surface)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>BLOOD PRESSURE</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>{activePatient.vitals.bp} <span style={{ fontSize: '0.6875rem', fontWeight: 500 }}>mmHg</span></div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>HEART RATE</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>{activePatient.vitals.pulse} <span style={{ fontSize: '0.6875rem', fontWeight: 500 }}>bpm</span></div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>TEMPERATURE</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)' }}>{activePatient.vitals.temp} <span style={{ fontSize: '0.6875rem', fontWeight: 500 }}>°F</span></div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>OXYGEN (SpO2)</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--success)' }}>{activePatient.vitals.spo2} <span style={{ fontSize: '0.6875rem', fontWeight: 500 }}>%</span></div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>HEIGHT / WEIGHT</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--secondary)' }}>{activePatient.vitals.height}cm / {activePatient.vitals.weight}kg</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>BMI INDEX</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>{activePatient.vitals.bmi} <span style={{ fontSize: '0.6875rem', fontWeight: 500 }}>Normal</span></div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--warning-light)', borderRadius: '6px', fontSize: '0.8125rem', color: '#92400e' }}>
                ⚠️ Patient vitals have not been logged by Nurse Station yet.
              </div>
            )}
          </div>

          {/* 2. Consultation Navigation Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('soap')}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'soap' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'soap' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Stethoscope size={16} /> Clinical Examination & SOAP
            </button>
            <button
              onClick={() => setActiveTab('prescription')}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'prescription' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'prescription' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <FileText size={16} /> E-Prescription ({prescriptionItems.length})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'orders' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'orders' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <FlaskConical size={16} /> Lab Orders
            </button>
          </div>

          {/* 3. Tab Contents */}

          {/* TAB 1: SOAP CLINICAL NOTES & DIAGNOSIS */}
          {activeTab === 'soap' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  1. Subjective & Objective Findings
                </div>

                <div className="form-group">
                  <label className="form-label">Chief Complaints & History of Present Illness *</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    value={chiefComplaints}
                    onChange={(e) => setChiefComplaints(e.target.value)}
                    placeholder="Patient states symptoms, duration, intensity..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Physical & Clinical Examination</label>
                  <textarea
                    className="form-textarea"
                    rows={5}
                    value={clinicalFindings}
                    onChange={(e) => setClinicalFindings(e.target.value)}
                    placeholder="General, CVS, RS, Abdomen, CNS observations..."
                  />
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  2. Assessment, Diagnosis & Follow-up
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Diagnosis *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="e.g. Acute Upper Respiratory Tract Infection"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ICD-10 Diagnosis Tag / Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={diagnosisCode}
                    onChange={(e) => setDiagnosisCode(e.target.value)}
                    placeholder="e.g. J06.9"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Doctor's Advice & Patient Instructions</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    placeholder="Lifestyle changes, warning signs, recovery advice..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Recommended Follow-up Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIGITAL E-PRESCRIPTION (Rx) */}
          {activeTab === 'prescription' && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)' }}>
                    Prescription Drugs & Regimen (Rx)
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Automatically synchronized with Hospital Pharmacy Dispense Queue
                  </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={addPrescriptionItem}>
                  <Plus size={16} /> Add Medication
                </button>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '28%' }}>Drug / Generic Name *</th>
                      <th style={{ width: '15%' }}>Dosage</th>
                      <th style={{ width: '12%' }}>Frequency</th>
                      <th style={{ width: '15%' }}>Timing</th>
                      <th style={{ width: '10%' }}>Duration</th>
                      <th style={{ width: '10%' }}>Total Qty</th>
                      <th style={{ width: '10%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptionItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            value={item.medicineName}
                            placeholder="e.g. Amoxicillin 500mg"
                            onChange={(e) => {
                              const updated = [...prescriptionItems];
                              updated[idx].medicineName = e.target.value;
                              setPrescriptionItems(updated);
                            }}
                            style={{ width: '100%', fontSize: '0.8125rem' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            value={item.dosage}
                            onChange={(e) => {
                              const updated = [...prescriptionItems];
                              updated[idx].dosage = e.target.value;
                              setPrescriptionItems(updated);
                            }}
                            style={{ width: '100%', fontSize: '0.8125rem' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            value={item.frequency}
                            onChange={(e) => {
                              const updated = [...prescriptionItems];
                              updated[idx].frequency = e.target.value;
                              setPrescriptionItems(updated);
                            }}
                            style={{ width: '100%', fontSize: '0.8125rem' }}
                          />
                        </td>
                        <td>
                          <select
                            className="form-select"
                            value={item.timing || 'AFTER_FOOD'}
                            onChange={(e) => {
                              const updated = [...prescriptionItems];
                              updated[idx].timing = e.target.value;
                              setPrescriptionItems(updated);
                            }}
                            style={{ width: '100%', fontSize: '0.8125rem' }}
                          >
                            <option value="AFTER_FOOD">After Food</option>
                            <option value="BEFORE_FOOD">Before Food</option>
                            <option value="WITH_FOOD">With Food</option>
                            <option value="EMPTY_STOMACH">Empty Stomach</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            value={item.durationDays}
                            onChange={(e) => {
                              const updated = [...prescriptionItems];
                              updated[idx].durationDays = parseInt(e.target.value, 10) || 0;
                              setPrescriptionItems(updated);
                            }}
                            style={{ width: '100%', fontSize: '0.8125rem' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            value={item.totalQuantity}
                            onChange={(e) => {
                              const updated = [...prescriptionItems];
                              updated[idx].totalQuantity = parseInt(e.target.value, 10) || 0;
                              setPrescriptionItems(updated);
                            }}
                            style={{ width: '100%', fontSize: '0.8125rem' }}
                          />
                        </td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => removePrescriptionItem(idx)}
                            style={{ padding: '0.375rem 0.5rem' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DIAGNOSTIC & LAB ORDERS */}
          {activeTab === 'orders' && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)' }}>
                Diagnostic & Pathology Lab Orders
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Ordered tests are instantly sent to the Laboratory Workstation for sample collection.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Complete Blood Count (CBC)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hematology • $45.00</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Chest X-Ray (PA View)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Radiology • $60.00</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Blood Glucose (Fasting)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Biochemistry • $20.00</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Bottom Action Footer */}
          <div
            style={{
              padding: '1rem 1.5rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Consultation ID: <code>CNS-{activePatient.appointmentNumber}</code> • Status: <strong>In Progress</strong>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary">
                <Save size={16} /> Save as Draft
              </button>
              <button className="btn btn-primary" onClick={handleFinalizeConsultation}>
                <CheckCircle2 size={16} /> Complete & Issue Prescription
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
