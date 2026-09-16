import React, { useState } from 'react';
import { Activity, Heart, Thermometer, Weight, Check, Edit } from 'lucide-react';

export const NurseDashboard: React.FC = () => {
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('Robert Fox');

  const [triageQueue] = useState([
    { token: 1, aptNo: 'APT-20260915-0001', name: 'Robert Fox', age: '38 Y', gender: 'MALE', doctor: 'Dr. Sarah Jenkins', status: 'PENDING_VITALS' },
    { token: 2, aptNo: 'APT-20260915-0002', name: 'Eleanor Vance', age: '31 Y', gender: 'FEMALE', doctor: 'Dr. Michael Chang', status: 'TRIAGED' },
  ]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Nurse Station & Triage Desk</h2>
          <p className="page-subtitle">Pre-consultation triage, vital signs entry, and patient prep</p>
        </div>
      </div>

      <div className="page-body">
        {/* Vitals Summary Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
              Patients Waiting for Triage
            </h3>
            <span className="badge badge-warning">1 Pending Triage</span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Patient Name</th>
                  <th>Demographics</th>
                  <th>Assigned Doctor</th>
                  <th>Triage Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {triageQueue.map((item) => (
                  <tr key={item.token}>
                    <td><strong>#{item.token}</strong></td>
                    <td><strong>{item.name}</strong></td>
                    <td>{item.age} • {item.gender}</td>
                    <td>{item.doctor}</td>
                    <td>
                      <span className={`badge ${item.status === 'TRIAGED' ? 'badge-success' : 'badge-warning'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setSelectedPatient(item.name);
                          setShowVitalsModal(true);
                        }}
                      >
                        <Activity size={16} /> Record Vitals
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Vitals Recording Modal */}
      {showVitalsModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Record Vitals — {selectedPatient}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Nurse Station OPD Triage</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowVitalsModal(false)}>✕</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setShowVitalsModal(false); }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Systolic BP (mmHg)</label>
                  <input type="number" className="form-input" defaultValue={120} placeholder="120" />
                </div>
                <div className="form-group">
                  <label className="form-label">Diastolic BP (mmHg)</label>
                  <input type="number" className="form-input" defaultValue={80} placeholder="80" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Pulse Rate (bpm)</label>
                  <input type="number" className="form-input" defaultValue={72} placeholder="72" />
                </div>
                <div className="form-group">
                  <label className="form-label">Temperature (°F)</label>
                  <input type="number" step="0.1" className="form-input" defaultValue={98.6} placeholder="98.6" />
                </div>
                <div className="form-group">
                  <label className="form-label">SpO2 (%)</label>
                  <input type="number" className="form-input" defaultValue={99} placeholder="99" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Height (cm)</label>
                  <input type="number" className="form-input" defaultValue={175} placeholder="175" />
                </div>
                <div className="form-group">
                  <label className="form-label">Weight (kg)</label>
                  <input type="number" step="0.5" className="form-input" defaultValue={70} placeholder="70" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nurse Remarks / Triage Notes</label>
                <textarea className="form-textarea" rows={2} placeholder="Patient reports mild dizziness on standing..." />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowVitalsModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save & Push to Doctor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
