import React from 'react';
import {
  X,
  User,
  Calendar,
  Phone,
  FileText,
  DollarSign,
  AlertCircle,
  Activity,
  Receipt,
  RotateCcw,
  Sparkles,
  Stethoscope,
  Clock,
  Printer,
} from 'lucide-react';
import { SharedPatient, SharedQueueToken, patientJourneyService } from '../../../services/patientJourneyService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: SharedPatient | null;
  onBookFollowUp: (patient: SharedPatient) => void;
  onIssueQuickToken: (patient: SharedPatient) => void;
}

export const PatientDossierModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  onBookFollowUp,
  onIssueQuickToken,
}) => {
  if (!isOpen || !patient) return null;

  const pastVisits = patient.recentVisits || [
    {
      date: '2026-08-14',
      doctor: 'Dr. Sarah Jenkins',
      dept: 'Cardiology',
      diagnosis: 'Essential Hypertension - Routine Checkup & ECG Normal',
    },
    {
      date: '2026-05-10',
      doctor: 'Dr. Michael Chang',
      dept: 'General Surgery',
      diagnosis: 'Abdominal Wall Strain - Conservative Management',
    },
  ];

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '720px',
          padding: '1.75rem',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.2rem',
              }}
            >
              {patient.firstName.charAt(0)}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary)' }}>
                {patient.firstName} {patient.lastName}
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <code>{patient.uhid}</code> • {patient.age}Y • {patient.gender} • Blood: <strong style={{ color: '#ef4444' }}>{patient.bloodGroup}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="action-btn"
            onClick={onClose}
            style={{ color: 'var(--text-muted)', border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Vitals & Demographic Ribbon */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.75rem',
            padding: '1rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: '12px',
            fontSize: '0.8125rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7188rem' }}>Primary Phone</span>
            <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{patient.phone}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7188rem' }}>Govt Identity</span>
            <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{patient.idType}: {patient.idNumber}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7188rem' }}>Insurance Provider</span>
            <div style={{ fontWeight: 700, color: '#0284c7' }}>{patient.insurance.split('•')[0]}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7188rem' }}>Emergency Contact</span>
            <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--secondary)' }}>{patient.emergencyContact}</div>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onBookFollowUp(patient);
              onClose();
            }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', fontWeight: 800 }}
          >
            <Calendar size={16} /> Book Follow-Up Slot (Discounted Fee)
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              onIssueQuickToken(patient);
              onClose();
            }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', fontWeight: 800 }}
          >
            <RotateCcw size={16} /> Issue Today's OPD Token
          </button>
        </div>

        {/* Clinical History Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: 'var(--secondary)' }}>
              Episode & Longitudinal Medical Visits ({pastVisits.length})
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Lifetime Visits: <strong>{patient.visitsCount}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', maxHeight: '240px', overflowY: 'auto' }}>
            {pastVisits.map((visit: any, index: number) => (
              <div
                key={index}
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, color: 'var(--secondary)', fontSize: '0.875rem' }}>
                      {visit.doctor}
                    </span>
                    <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>
                      {visit.dept}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Diagnosis: <strong style={{ color: 'var(--secondary)' }}>{visit.diagnosis}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} /> {visit.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
