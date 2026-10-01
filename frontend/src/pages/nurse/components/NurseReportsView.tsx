import React from 'react';
import { FileText, Clock, AlertTriangle, Users, Award } from 'lucide-react';
import { SharedQueueToken } from '../../../services/patientJourneyService';
import { KpiRow, KpiCard } from '../../../components/workspace';

interface NurseReportsViewProps {
  queue: SharedQueueToken[];
}

export const NurseReportsView: React.FC<NurseReportsViewProps> = ({ queue }) => {
  const triagedCount = queue.filter(
    (q) => q.status === 'READY_FOR_DOCTOR' || q.status === 'TRIAGED' || q.status === 'COMPLETED'
  ).length;
  const emergencyCount = queue.filter((q) => q.priority === 'EMERGENCY').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. KPI CARDS (§ 9: 120px height, clean metric + trend) */}
      <KpiRow>
        <KpiCard
          label="Total Triaged Today"
          value={triagedCount}
          trend="+14% vs yesterday"
          trendColor="var(--success)"
          iconBg="var(--primary-light)"
          iconColor="var(--primary)"
          icon={<Users size={18} />}
        />
        <KpiCard
          label="Avg. Intake Duration"
          value="4.2 min"
          trend="Optimal target < 5m"
          trendColor="var(--success)"
          iconBg="var(--info-light)"
          iconColor="var(--info)"
          icon={<Clock size={18} />}
        />
        <KpiCard
          label="Emergency Escalations"
          value={emergencyCount}
          trend="Chamber bypasses"
          trendColor="var(--danger)"
          iconBg="var(--danger-light)"
          iconColor="var(--danger)"
          valueColor="var(--danger)"
          icon={<AlertTriangle size={18} />}
        />
        <KpiCard
          label="Vitals Compliance"
          value="98.5%"
          trend="Exceeds NABH standard"
          trendColor="var(--success)"
          iconBg="var(--success-light)"
          iconColor="var(--success)"
          icon={<Award size={18} />}
        />
      </KpiRow>

      {/* 2. SUMMARY CARD (§ 8 & § 10) */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <FileText size={18} color="var(--primary)" />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--secondary)', margin: 0 }}>
            Triage Throughput & Patient Allocation Summary
          </h2>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Patient UHID</th>
                <th>Patient Name</th>
                <th>Assigned Doctor</th>
                <th>Consulting Chamber</th>
                <th>Acuity Tier</th>
                <th>Triage Status</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr key={item.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{item.uhid}</td>
                  <td>
                    <strong style={{ color: 'var(--secondary)' }}>{item.patient}</strong>
                  </td>
                  <td>{item.doctor}</td>
                  <td>{item.room}</td>
                  <td>
                    <span
                      className={`badge ${
                        item.priority === 'EMERGENCY'
                          ? 'badge-danger'
                          : item.priority === 'URGENT'
                          ? 'badge-warning'
                          : 'badge-secondary'
                      }`}
                    >
                      {item.priority || 'NORMAL'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        item.status === 'READY_FOR_DOCTOR' || item.status === 'TRIAGED'
                          ? 'badge-success'
                          : item.status === 'IN_TRIAGE'
                          ? 'badge-info'
                          : 'badge-warning'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
