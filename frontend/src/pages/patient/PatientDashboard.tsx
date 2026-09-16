import React from 'react';
import { Calendar, FileText, FlaskConical, Receipt, Clock, Download } from 'lucide-react';

export const PatientDashboard: React.FC = () => {
  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Patient Health Portal</h2>
          <p className="page-subtitle">Welcome back, Robert Fox • UHID-202609-00001</p>
        </div>
      </div>

      <div className="page-body">
        {/* Quick Health Summary */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
              <Calendar size={24} />
            </div>
            <div>
              <div className="stat-value">1</div>
              <div className="stat-label">Upcoming Appointment</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
              <FileText size={24} />
            </div>
            <div>
              <div className="stat-value">2</div>
              <div className="stat-label">Active Prescriptions</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--teal-light)', color: 'var(--teal)' }}>
              <FlaskConical size={24} />
            </div>
            <div>
              <div className="stat-value">1</div>
              <div className="stat-label">Lab Reports Ready</div>
            </div>
          </div>
        </div>

        {/* Patient Clinical Records */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--secondary)' }}>
              Recent Prescriptions & Medications
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>RX-20260915-0001</strong>
                  <button className="btn btn-secondary btn-sm"><Download size={14} /> PDF</button>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Prescribed by Dr. Sarah Jenkins (Cardiology)
                </div>
                <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 500 }}>
                  • Amoxicillin 500mg (1-0-1 After Food) — 5 Days
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--secondary)' }}>
              Lab Reports & Diagnostic Files
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Chest X-Ray (PA View)</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sep 15, 2026 • Verified by Lab</div>
                  </div>
                  <button className="btn btn-secondary btn-sm"><Download size={14} /> Download</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
