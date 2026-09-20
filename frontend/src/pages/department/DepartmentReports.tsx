import React, { useState } from 'react';
import {
  TrendingUp,
  Users,
  Clock,
  DoorClosed,
  Download,
  Calendar,
  CheckCircle2,
  DollarSign,
  Activity,
} from 'lucide-react';
import { DepartmentWorkspace } from '../../types';
import { getDepartmentDoctors, getDepartmentRooms } from './departmentWorkspaceStore';

interface Props {
  workspace: DepartmentWorkspace;
}

export const DepartmentReports: React.FC<Props> = ({ workspace }) => {
  const doctors = getDepartmentDoctors(workspace.departmentId);
  const rooms = getDepartmentRooms(workspace.departmentId);

  const [dateRange, setDateRange] = useState('Today');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span
              style={{
                backgroundColor: 'rgba(2, 132, 199, 0.1)',
                color: '#0284c7',
                padding: '0.375rem',
                borderRadius: '8px',
                display: 'flex',
              }}
            >
              <TrendingUp size={22} />
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--secondary)' }}>
              {workspace.shortName} Operational Analytics & Performance Reports
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
            Clinical throughput, doctor workload distribution, chamber utilization, and wait time analytics.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: 'auto', fontSize: '0.8125rem' }}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="Today">Today (Live Operational)</option>
            <option value="Week">This Week</option>
            <option value="Month">This Month</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Patients Consulted
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--secondary)', marginTop: '0.25rem' }}>
            86
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>
            ↑ 12% vs yesterday
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af', textTransform: 'uppercase' }}>
            Average Wait Time
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1d4ed8', marginTop: '0.25rem' }}>
            14 mins
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.25rem' }}>
            Token to chamber triage
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>
            Chamber Utilization
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#15803d', marginTop: '0.25rem' }}>
            88%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem' }}>
            Active occupancy rate
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9a3412', textTransform: 'uppercase' }}>
            Consultation Revenue
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#c2410c', marginTop: '0.25rem' }}>
            $6,450
          </div>
          <div style={{ fontSize: '0.75rem', color: '#ea580c', marginTop: '0.25rem' }}>
            Settled tariffs today
          </div>
        </div>
      </div>

      {/* Doctor Utilization Breakdown */}
      <div className="card" style={{ padding: '1.5rem', borderRadius: '14px' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem 0' }}>
          Doctor Workload & Daily Capacity Utilization
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {doctors.map((doc, idx) => {
            const completed = 24 + idx * 4;
            const pct = Math.min(100, Math.round((completed / (doc.patientCapacityPerDay || 30)) * 100));
            return (
              <div key={doc.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                    {doc.fullName} ({doc.specialization.split('&')[0].trim()})
                  </span>
                  <span style={{ fontWeight: 700, color: '#0369a1' }}>
                    {completed} / {doc.patientCapacityPerDay} Patients ({pct}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', borderRadius: '4px', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: pct > 85 ? '#0284c7' : '#10b981',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
