import React, { useState } from 'react';
import { Pill, CheckSquare, Search, AlertCircle, PackageCheck } from 'lucide-react';

export const PharmacyDashboard: React.FC = () => {
  const [prescriptions] = useState([
    {
      rxNumber: 'RX-20260915-0001',
      patient: 'Robert Fox (UHID-202609-00001)',
      doctor: 'Dr. Sarah Jenkins',
      medicines: [
        { name: 'Amoxicillin 500mg', qty: 10, dosage: '1-0-1', timing: 'After Food' },
        { name: 'Paracetamol 650mg', qty: 6, dosage: '1-0-1 SOS', timing: 'After Food' },
      ],
      status: 'PENDING_DISPENSE',
    },
  ]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Pharmacy Counter & Dispense Desk</h2>
          <p className="page-subtitle">Prescription verification, medicine dispensing, and pharmacy inventory</p>
        </div>
        <button className="btn btn-secondary"><PackageCheck size={18} /> Medicine Stock Directory</button>
      </div>

      <div className="page-body">
        {/* Prescription Verification Queue */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>
              Active Prescription Dispense Queue
            </h3>
            <span className="badge badge-warning">1 Order Pending</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {prescriptions.map((rx) => (
              <div
                key={rx.rxNumber}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{rx.rxNumber}</span>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--secondary)' }}>{rx.patient}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Prescribed by: {rx.doctor}</div>
                  </div>
                  <span className="badge badge-warning">Awaiting Dispense</span>
                </div>

                <div className="table-container" style={{ margin: '0.75rem 0' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Dosage & Timing</th>
                        <th>Quantity to Dispense</th>
                        <th>Batch Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rx.medicines.map((m, i) => (
                        <tr key={i}>
                          <td><strong>{m.name}</strong></td>
                          <td>{m.dosage} ({m.timing})</td>
                          <td><strong>{m.qty} Tabs</strong></td>
                          <td><span className="badge badge-success">In Stock (Exp: 2027)</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button className="btn btn-secondary btn-sm">Print Medication Label</button>
                  <button className="btn btn-primary btn-sm"><CheckSquare size={16} /> Mark as Dispensed</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
