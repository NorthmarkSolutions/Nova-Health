import React, { useState } from 'react';
import { Clock, Send, AlertTriangle } from 'lucide-react';
import { NurseShiftRecord } from '../../../services/patientJourneyService';

interface DoctorHandoffViewProps {
  currentShift: 'MORNING' | 'EVENING' | 'NIGHT';
  shiftRecord: NurseShiftRecord;
  nurseName: string;
  onSubmitHandover: (notes: string, checklist: any) => void;
}

export const DoctorHandoffView: React.FC<DoctorHandoffViewProps> = ({
  currentShift,
  shiftRecord,
  nurseName,
  onSubmitHandover,
}) => {
  const [handoverNotes, setHandoverNotes] = useState(shiftRecord.handoffNotes || '');
  const [crashCartChecked, setCrashCartChecked] = useState(true);
  const [glucometerCalibrated, setGlucometerCalibrated] = useState(true);
  const [narcoticsReconciled, setNarcoticsReconciled] = useState(true);
  const [defibrillatorTested, setDefibrillatorTested] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitHandover(handoverNotes, {
      crashCartChecked,
      glucometerCalibrated,
      narcoticsReconciled,
      defibrillatorTested,
    });
  };

  return (
    <div className="nurse-handoff-layout">
      {/* LEFT COLUMN: SBAR HANDOVER DOCUMENT & SUBMIT (§ 8 & § 11) */}
      <div className="card" style={{ padding: '24px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--secondary)', margin: 0 }}>
              SBAR Clinical Shift Handover
            </h2>
          </div>
          <span className="badge badge-success">{currentShift} Shift</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label">
              Detailed Shift Handover & Clinical Handoff Notes (SBAR)
            </label>
            <textarea
              rows={5}
              className="form-textarea"
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              placeholder="S: Situation - Ward & triage throughput&#10;B: Background - Ongoing cases&#10;A: Assessment - Critical unstable patients&#10;R: Recommendation - Doctors to attend, pending lab alerts..."
            />
          </div>

          {/* End of Shift Safety Checklist */}
          <div>
            <label className="form-label" style={{ marginBottom: '12px', display: 'block' }}>
              Station Safety & Quality Checklist
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                backgroundColor: 'var(--gray-50)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={crashCartChecked}
                  onChange={(e) => setCrashCartChecked(e.target.checked)}
                />
                <span>Crash Cart Sealed</span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={glucometerCalibrated}
                  onChange={(e) => setGlucometerCalibrated(e.target.checked)}
                />
                <span>Glucometer Calibrated</span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={narcoticsReconciled}
                  onChange={(e) => setNarcoticsReconciled(e.target.checked)}
                />
                <span>Narcotics Register Signed</span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={defibrillatorTested}
                  onChange={(e) => setDefibrillatorTested(e.target.checked)}
                />
                <span>Defibrillator Battery Tested</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ alignSelf: 'flex-start', marginTop: '4px' }}
          >
            <Send size={16} />
            <span>Submit Shift Sign-off ({nurseName})</span>
          </button>
        </form>
      </div>

      {/* RIGHT COLUMN: CRITICAL PATIENTS SURVEILLANCE LIST (§ 8) */}
      <div className="card" style={{ padding: '24px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="var(--danger)" />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--secondary)', margin: 0 }}>
              Critical Surveillance Watchlist
            </h3>
          </div>
          <span className="badge badge-danger">
            {shiftRecord.criticalPatients.length} High Risk
          </span>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
          Patients flagged for continuous vitals monitoring and rapid escalation to consultant doctors.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {shiftRecord.criticalPatients.map((crit, idx) => (
            <div
              key={idx}
              style={{
                padding: '14px',
                borderRadius: '10px',
                backgroundColor: 'var(--danger-light)',
                border: '1px solid #fecdd3',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '14px', color: 'var(--danger)' }}>
                  {crit.patientName}
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{crit.uhid}</span>
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#991b1b',
                  marginTop: '4px',
                  lineHeight: 1.4,
                }}
              >
                {crit.alert}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
