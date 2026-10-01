import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, FileText, Printer, X, FlaskConical } from 'lucide-react';
import {
  patientJourneyService,
  SharedQueueToken,
  SharedLabOrder,
  NurseObservationBed,
  NurseShiftRecord,
} from '../../services/patientJourneyService';
import { useAuth } from '../../context/AuthContext';
import { resolveNurseTab, NurseTabKey } from './nurseTabs';
import { NurseHeader } from './components/NurseHeader';
import { TriageQueueView } from './components/TriageQueueView';
import { VitalsAssessmentView } from './components/VitalsAssessmentView';
import { ObservationBedsView } from './components/ObservationBedsView';
import { DoctorHandoffView } from './components/DoctorHandoffView';
import { NurseReportsView } from './components/NurseReportsView';
import { NurseSpecimenDeskView } from './components/NurseSpecimenDeskView';
import { SpecimenCollectionModal } from './components/SpecimenCollectionModal';

export const NurseDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = resolveNurseTab(searchParams.get('tab'));

  const handleTabChange = (t: NurseTabKey) => {
    setSearchParams({ tab: t });
  };

  // Station & Nurse Context (§ Requirement 6: read from AuthContext, fallback to Clara Adams)
  const { user } = useAuth();
  const nurseName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.firstName || 'Nurse Clara Adams, RN';
  const [currentShift, setCurrentShift] = useState<'MORNING' | 'EVENING' | 'NIGHT'>('MORNING');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Audio Chime Synthesizer
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
  const [obsBeds, setObsBeds] = useState<NurseObservationBed[]>(() =>
    patientJourneyService.getObservationBeds()
  );
  const [shiftRecord, setShiftRecord] = useState<NurseShiftRecord>(() =>
    patientJourneyService.getNurseShiftRecord()
  );
  const [labOrders, setLabOrders] = useState<SharedLabOrder[]>(() =>
    patientJourneyService.getLabOrders()
  );
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedOrderForCollection, setSelectedOrderForCollection] = useState<SharedLabOrder | null>(null);
  const [selectedLabReportToView, setSelectedLabReportToView] = useState<SharedLabOrder | null>(null);

  // Sync Listener across departments
  useEffect(() => {
    const handleSync = () => {
      setQueue(patientJourneyService.getQueue());
      setObsBeds(patientJourneyService.getObservationBeds());
      setShiftRecord(patientJourneyService.getNurseShiftRecord());
      setLabOrders(patientJourneyService.getLabOrders());
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('nh_data_sync', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('nh_data_sync', handleSync);
    };
  }, []);

  // Specimen Collection Action
  const handleConfirmCollection = async (orderId: string, collectorName: string) => {
    patientJourneyService.collectSample(orderId, collectorName);
    setLabOrders(patientJourneyService.getLabOrders());

    try {
      await fetch(`/api/v1/lab/orders/${orderId}/collect-sample/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectorName }),
      });
    } catch {
      // Offline fallback
    }

    setSelectedOrderForCollection(null);
    showToast(`✓ Specimen collected & barcode label generated`);
  };

  // Queue Actions
  const handleCallPatient = (patient: SharedQueueToken) => {
    playCallingChime();
    patientJourneyService.updateQueueToken(patient.token, {
      callingStatus: 'CALLING',
    });
    setQueue(patientJourneyService.getQueue());
    showToast(`🔔 Summoning Token #${patient.token} (${patient.patient}) to Triage Station 01`);
  };

  const handleStartTriage = (patient: SharedQueueToken) => {
    patientJourneyService.updateQueueStatus(patient.token, 'IN_TRIAGE');
    setQueue(patientJourneyService.getQueue());
    setSelectedPatientId(patient.id);
    handleTabChange('vitals');
    showToast(`✓ Commenced intake assessment for Token #${patient.token}`);
  };

  const handleMarkEmergency = (patient: SharedQueueToken) => {
    playCallingChime();
    patientJourneyService.updateQueueToken(patient.token, {
      status: 'EMERGENCY',
      priority: 'EMERGENCY',
      triageNotes: 'EMERGENCY: Immediate priority physician chamber bypass required.',
    });
    setQueue(patientJourneyService.getQueue());
    showToast(`🚨 Token #${patient.token} escalated to EMERGENCY priority!`);
  };

  const handleFastTrackToDoctor = (patient: SharedQueueToken) => {
    patientJourneyService.updateQueueStatus(patient.token, 'READY_FOR_DOCTOR');
    setQueue(patientJourneyService.getQueue());
    showToast(`✓ Token #${patient.token} fast-tracked directly to ${patient.doctor}`);
  };

  // Vitals Actions
  const handleSaveDraft = (
    patient: SharedQueueToken,
    vitals: any,
    assessment: any,
    priority?: string
  ) => {
    patientJourneyService.updateQueueToken(patient.token, {
      vitals,
      assessment,
      ...(priority ? { priority: priority as any } : {}),
      status: patient.status === 'WAITING' ? 'IN_TRIAGE' : patient.status,
    });
    setQueue(patientJourneyService.getQueue());
    showToast(`✓ Intake assessment saved for Token #${patient.token}`);
  };

  const handlePushToDoctor = (
    patient: SharedQueueToken,
    vitals: any,
    assessment: any,
    priority?: string
  ) => {
    patientJourneyService.updateQueueToken(patient.token, {
      vitals,
      assessment,
      ...(priority ? { priority: priority as any } : {}),
      status: 'READY_FOR_DOCTOR',
    });
    setQueue(patientJourneyService.getQueue());
    showToast(`✓ Token #${patient.token} pushed to ${patient.doctor} Chamber Queue`);
    handleTabChange('triage-queue');
  };

  // Observation Bed Actions
  const handleAddTelemetry = (bedId: string, reading: any) => {
    patientJourneyService.addObservationReading(bedId, reading);
    setObsBeds(patientJourneyService.getObservationBeds());
    showToast('✓ Serial vital signs logged to flowsheet');
  };

  const handleDischargeBed = (bedId: string) => {
    patientJourneyService.dischargeObservationBed(bedId);
    setObsBeds(patientJourneyService.getObservationBeds());
    showToast('✓ Patient discharged from day-care observation');
  };

  const handleEscalateBed = (bedId: string) => {
    patientJourneyService.escalateObservationBed(bedId);
    setObsBeds(patientJourneyService.getObservationBeds());
    showToast('🚨 Bed status escalated to Inpatient Care');
  };

  // Handover Action (§ Requirement 7: accept notes and checklist)
  const handleSubmitHandover = (notes: string, _checklist?: any) => {
    const updated = patientJourneyService.submitNurseHandover({
      handoffNotes: notes,
      submittedAt: new Date().toISOString(),
    });
    setShiftRecord(updated);
    showToast(`✓ Shift handover submitted by ${nurseName}`);
  };

  const handleEmergencyAlert = () => {
    playCallingChime();
    showToast('🚨 Code Blue broadcast chimed across all OPD stations.');
  };

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: 'var(--bg-main)',
        minHeight: '100%',
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        flex: 1,
      }}
    >
      {/* Toast Notification (§ 8: 10px radius, soft shadow, clean border) */}
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

      {/* HEADER (§ 5 & § 14) */}
      <NurseHeader
        currentShift={currentShift}
        onShiftChange={setCurrentShift}
        onEmergencyAlert={handleEmergencyAlert}
      />

      {/* MAIN CONTENT AREA (§ 13: Screen Structure) */}
      <main
        style={{
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {activeTab === 'triage-queue' && (
          <TriageQueueView
            queue={queue}
            onCallPatient={handleCallPatient}
            onStartTriage={handleStartTriage}
            onMarkEmergency={handleMarkEmergency}
            onFastTrackToDoctor={handleFastTrackToDoctor}
            onCollectSample={(order) => setSelectedOrderForCollection(order)}
            onViewReport={(order) => setSelectedLabReportToView(order)}
            onGoToSpecimenDesk={() => handleTabChange('specimen-desk')}
          />
        )}

        {activeTab === 'vitals' && (
          <VitalsAssessmentView
            queue={queue}
            selectedPatientId={selectedPatientId}
            onSelectPatient={setSelectedPatientId}
            onCallPatient={handleCallPatient}
            onMarkEmergency={handleMarkEmergency}
            onSaveDraft={handleSaveDraft}
            onPushToDoctor={handlePushToDoctor}
          />
        )}

        {activeTab === 'observation-beds' && (
          <ObservationBedsView
            beds={obsBeds}
            onAddTelemetry={handleAddTelemetry}
            onDischargeBed={handleDischargeBed}
            onEscalateBed={handleEscalateBed}
          />
        )}

        {activeTab === 'specimen-desk' && (
          <NurseSpecimenDeskView
            orders={labOrders}
            nurseName={nurseName}
            onCollectSample={(order) => setSelectedOrderForCollection(order)}
            onViewReport={(order) => setSelectedLabReportToView(order)}
          />
        )}

        {activeTab === 'shift-handover' && (
          <DoctorHandoffView
            currentShift={currentShift}
            shiftRecord={shiftRecord}
            nurseName={nurseName}
            onSubmitHandover={handleSubmitHandover}
          />
        )}

        {activeTab === 'reports' && <NurseReportsView queue={queue} />}
      </main>

      {/* Bedside Specimen Collection & Barcode Label Modal */}
      {selectedOrderForCollection && (
        <SpecimenCollectionModal
          order={selectedOrderForCollection}
          nurseName={nurseName}
          onClose={() => setSelectedOrderForCollection(null)}
          onConfirmCollection={handleConfirmCollection}
        />
      )}

      {/* Signed NABL Laboratory Report Viewer Modal */}
      {selectedLabReportToView && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: '820px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '12px',
              padding: '28px',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Hospital NABL Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '2px solid var(--border-color)',
                paddingBottom: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FlaskConical size={24} color="var(--primary)" />
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'var(--secondary)', letterSpacing: '-0.02em' }}>
                    NORTHMARK MULTISPECIALTY HOSPITAL
                  </h3>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Department of Laboratory Medicine & Pathology • NABL Accr. #MC-5102
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ISO 15189:2022 Certified • 24/7 STAT & Clinical Diagnostics
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                  ✓ RELEASED & SIGNED
                </span>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--secondary)', marginTop: '4px' }}>
                  Report ID: {selectedLabReportToView.reportId || 'REP-202609-001'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Order: {selectedLabReportToView.orderNo}
                </div>
              </div>
            </div>

            {/* Patient Context Dossier */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '0.8125rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Patient Name:</span>
                <strong style={{ display: 'block', color: 'var(--secondary)', fontSize: '0.9rem' }}>
                  {selectedLabReportToView.patientName}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>UHID:</span>
                <strong style={{ display: 'block', color: 'var(--secondary)' }}>
                  {selectedLabReportToView.uhid}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Age / Gender:</span>
                <strong style={{ display: 'block', color: 'var(--secondary)' }}>
                  {selectedLabReportToView.age}Y / {selectedLabReportToView.gender}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Ordering Doctor:</span>
                <strong style={{ display: 'block', color: 'var(--primary)' }}>
                  {selectedLabReportToView.doctor}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Sample Type:</span>
                <strong style={{ display: 'block', color: 'var(--secondary)' }}>
                  {selectedLabReportToView.sampleType}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Released At:</span>
                <strong style={{ display: 'block', color: 'var(--success)' }}>
                  {selectedLabReportToView.approvedAt || '2026-09-20 14:30'}
                </strong>
              </div>
            </div>

            {/* Test Investigation Title */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--secondary)' }}>
                  Investigation: {selectedLabReportToView.testName}
                </h4>
                <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                  {selectedLabReportToView.category}
                </span>
              </div>

              {/* Parameters Table */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 800, color: 'var(--text-main)' }}>Investigation Parameter</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'center', fontWeight: 800, color: 'var(--text-main)' }}>Observed Result</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'center', fontWeight: 800, color: 'var(--text-main)' }}>Units</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'center', fontWeight: 800, color: 'var(--text-main)' }}>Biological Reference Range</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'right', fontWeight: 800, color: 'var(--text-main)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLabReportToView.parameters && selectedLabReportToView.parameters.length > 0 ? (
                      selectedLabReportToView.parameters.map((param, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: param.isCritical
                              ? 'rgba(239, 68, 68, 0.08)'
                              : param.isAbnormal
                              ? 'rgba(245, 158, 11, 0.08)'
                              : '#ffffff',
                          }}
                        >
                          <td style={{ padding: '0.65rem 1rem', fontWeight: param.isAbnormal ? 700 : 500, color: 'var(--text-main)' }}>
                            {param.paramName}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', fontWeight: 800, color: param.isCritical ? 'var(--danger)' : param.isAbnormal ? '#d97706' : 'var(--primary)' }}>
                            {param.observedValue}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            {param.unit}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            {param.referenceRange}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                            <span
                              className={`badge ${
                                param.isCritical
                                  ? 'badge-danger'
                                  : param.isAbnormal
                                  ? 'badge-warning'
                                  : 'badge-success'
                              }`}
                              style={{ fontSize: '0.72rem' }}
                            >
                              {param.isCritical ? 'CRITICAL' : param.isAbnormal ? 'ABNORMAL' : 'NORMAL'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Standard physiological parameters verified by automated analyzer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pathologist Clinical Interpretation */}
            {selectedLabReportToView.pathologistRemarks && (
              <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.8125rem' }}>
                <strong style={{ color: 'var(--secondary)' }}>Pathologist Clinical Impression:</strong>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  {selectedLabReportToView.pathologistRemarks}
                </p>
              </div>
            )}

            {/* Digital Signature & Certification Block */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid var(--border-color)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <div>Barcode Identifier: <code>{selectedLabReportToView.barcode}</code></div>
                <div>Authenticated under NABL digital signature guidelines.</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.9375rem', fontWeight: 900, color: 'var(--secondary)' }}>
                  {selectedLabReportToView.approvedBy || 'Dr. Ananya Iyer, MD (Pathology)'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                  Consultant Pathologist & Laboratory Director
                </div>
                <div style={{ fontSize: '0.7188rem', color: 'var(--text-light)' }}>
                  Released: {selectedLabReportToView.approvedAt || '2026-09-20 14:30'}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem' }}
              >
                <Printer size={16} /> Print Report
              </button>

              <button
                type="button"
                onClick={() => setSelectedLabReportToView(null)}
                className="btn btn-primary"
                style={{ fontSize: '0.875rem', fontWeight: 700 }}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default NurseDashboard;
