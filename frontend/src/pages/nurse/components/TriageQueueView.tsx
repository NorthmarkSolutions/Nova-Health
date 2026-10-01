import React, { useState, useMemo } from 'react';
import {
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Search,
  FlaskConical,
  FileText,
} from 'lucide-react';
import {
  SharedQueueToken,
  SharedLabOrder,
  patientJourneyService,
} from '../../../services/patientJourneyService';
import { TriageRowActions } from './TriageRowActions';
import { KpiRow, KpiCard } from '../../../components/workspace';

interface TriageQueueViewProps {
  queue: SharedQueueToken[];
  onCallPatient: (patient: SharedQueueToken) => void;
  onStartTriage: (patient: SharedQueueToken) => void;
  onMarkEmergency: (patient: SharedQueueToken) => void;
  onFastTrackToDoctor: (patient: SharedQueueToken) => void;
  onCollectSample?: (order: SharedLabOrder) => void;
  onViewReport?: (order: SharedLabOrder) => void;
  onGoToSpecimenDesk?: () => void;
}

export const TriageQueueView: React.FC<TriageQueueViewProps> = ({
  queue,
  onCallPatient,
  onStartTriage,
  onMarkEmergency,
  onFastTrackToDoctor,
  onCollectSample,
  onViewReport,
  onGoToSpecimenDesk,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'WAITING' | 'IN_TRIAGE' | 'EMERGENCY' | 'READY_FOR_DOCTOR'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuTokenId, setOpenMenuTokenId] = useState<string | null>(null);

  const labOrders = useMemo(() => patientJourneyService.getLabOrders(), [queue]);
  const pendingPhlebotomyOrders = useMemo(
    () => labOrders.filter((o) => o.stage === 'ORDERED'),
    [labOrders]
  );

  // Counts for KPI Cards (§ 9)
  const waitingCount = useMemo(() => queue.filter((q) => q.status === 'WAITING').length, [queue]);
  const inTriageCount = useMemo(() => queue.filter((q) => q.status === 'IN_TRIAGE').length, [queue]);
  const readyCount = useMemo(
    () => queue.filter((q) => q.status === 'READY_FOR_DOCTOR' || q.status === 'TRIAGED').length,
    [queue]
  );
  const emergencyCount = useMemo(() => queue.filter((q) => q.priority === 'EMERGENCY').length, [queue]);

  // Filtered queue
  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      if (filter === 'WAITING' && item.status !== 'WAITING') return false;
      if (filter === 'IN_TRIAGE' && item.status !== 'IN_TRIAGE') return false;
      if (filter === 'EMERGENCY' && item.priority !== 'EMERGENCY') return false;
      if (
        filter === 'READY_FOR_DOCTOR' &&
        item.status !== 'READY_FOR_DOCTOR' &&
        item.status !== 'TRIAGED'
      )
        return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.patient.toLowerCase().includes(query);
        const matchesUhid = item.uhid.toLowerCase().includes(query);
        const matchesDoc = item.doctor.toLowerCase().includes(query);
        const matchesToken = String(item.token).includes(query);
        return matchesName || matchesUhid || matchesDoc || matchesToken;
      }

      return true;
    });
  }, [queue, filter, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. KPI CARDS ROW (§ 9: Max 5 cards, 120px height, clean scanning) */}
      <KpiRow>
        <KpiCard
          label="Waiting for Triage"
          value={waitingCount}
          trend="Awaiting Intake"
          trendColor="var(--warning)"
          iconBg="var(--warning-light)"
          iconColor="var(--warning)"
          icon={<Clock size={18} />}
        />
        <KpiCard
          label="Currently in Triage"
          value={inTriageCount}
          trend="At Triage Booth"
          trendColor="var(--primary)"
          iconBg="var(--primary-light)"
          iconColor="var(--primary)"
          icon={<Activity size={18} />}
        />
        <KpiCard
          label="Ready for Doctor"
          value={readyCount}
          trend="Chamber Ready"
          trendColor="var(--success)"
          iconBg="var(--success-light)"
          iconColor="var(--success)"
          icon={<CheckCircle2 size={18} />}
        />
        <KpiCard
          label="Emergency Priority"
          value={emergencyCount}
          trend="Direct Bypass"
          trendColor="var(--danger)"
          iconBg="var(--danger-light)"
          iconColor="var(--danger)"
          valueColor="var(--danger)"
          icon={<AlertTriangle size={18} />}
        />
      </KpiRow>

      {/* Pending Phlebotomy Banner */}
      {pendingPhlebotomyOrders.length > 0 && (
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fcd34d',
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FlaskConical size={18} />
            </div>
            <div>
              <strong style={{ fontSize: '13px', color: '#92400e' }}>
                {pendingPhlebotomyOrders.length} Bedside Specimen Collection{pendingPhlebotomyOrders.length > 1 ? 's' : ''} Pending
              </strong>
              <div style={{ fontSize: '12px', color: '#b45309' }}>
                Active laboratory orders waiting for nurse venipuncture, swab, or specimen tube collection.
              </div>
            </div>
          </div>
          {onGoToSpecimenDesk && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={onGoToSpecimenDesk}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              Open Specimen Desk →
            </button>
          )}
        </div>
      )}

      {/* 2. PRIMARY CONTENT: QUEUE CARD WITH FILTER & TABLE (§ 8 & § 10) */}
      <div className="card" style={{ padding: '20px' }}>
        {/* Filter and Search Bar (§ 10 & § 11) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['ALL', 'WAITING', 'IN_TRIAGE', 'EMERGENCY', 'READY_FOR_DOCTOR'] as const).map(
              (f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {f === 'ALL' && `All Tokens (${queue.length})`}
                  {f === 'WAITING' && `Waiting (${waitingCount})`}
                  {f === 'IN_TRIAGE' && `In Triage (${inTriageCount})`}
                  {f === 'EMERGENCY' && `🚨 Emergency (${emergencyCount})`}
                  {f === 'READY_FOR_DOCTOR' && `Ready for Doctor (${readyCount})`}
                </button>
              )
            )}
          </div>

          <div className="search-input-box" style={{ width: '280px' }}>
            <Search size={16} color="var(--text-light)" />
            <input
              type="text"
              placeholder="Search Patient, UHID, Doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Clean Table (§ 10: 56px row height, sticky header, hover state) */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Token</th>
                <th>Patient & UHID</th>
                <th>Demographics</th>
                <th>Consultant Doctor</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Arrival Time</th>
                <th style={{ width: '208px', minWidth: '208px', maxWidth: '208px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: 'center',
                      padding: '48px 24px',
                      color: 'var(--text-muted)',
                      fontSize: '14px',
                    }}
                  >
                    No patients matching the active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item) => {
                  const isEmergency = item.priority === 'EMERGENCY';
                  const patientOrders = labOrders.filter(
                    (lo) => lo.uhid.toLowerCase() === item.uhid.toLowerCase()
                  );
                  return (
                    <tr
                      key={item.id}
                      style={{
                        height: '56px',
                        backgroundColor: isEmergency ? 'var(--danger-light)' : undefined,
                      }}
                    >
                      <td>
                        <span
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: isEmergency ? 'var(--danger)' : 'var(--primary)',
                          }}
                        >
                          #{item.token}
                        </span>
                      </td>

                      <td>
                        <div>
                          <strong style={{ color: 'var(--secondary)' }}>{item.patient}</strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {item.uhid}
                          </div>
                          {/* Live Lab Status Badges */}
                          {patientOrders.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                              {patientOrders.map((lo) => {
                                if (lo.stage === 'REPORT_GENERATED') {
                                  return (
                                    <button
                                      key={lo.id}
                                      type="button"
                                      onClick={() => onViewReport?.(lo)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        backgroundColor: lo.isFlaggedCritical
                                          ? 'rgba(239, 68, 68, 0.15)'
                                          : lo.isFlaggedAbnormal
                                          ? 'rgba(245, 158, 11, 0.15)'
                                          : 'rgba(16, 185, 129, 0.15)',
                                        color: lo.isFlaggedCritical
                                          ? '#b91c1c'
                                          : lo.isFlaggedAbnormal
                                          ? '#b45309'
                                          : '#047857',
                                        width: 'fit-content',
                                      }}
                                    >
                                      <FileText size={11} />
                                      Lab Report Ready: {lo.testName} {lo.isFlaggedCritical ? '🚨 CRITICAL' : lo.isFlaggedAbnormal ? '⚠️ Abnormal' : '✓ Normal'}
                                    </button>
                                  );
                                }
                                if (lo.stage === 'ORDERED') {
                                  return (
                                    <button
                                      key={lo.id}
                                      type="button"
                                      onClick={() => onCollectSample?.(lo)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid #f59e0b',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        backgroundColor: '#fef3c7',
                                        color: '#92400e',
                                        width: 'fit-content',
                                      }}
                                    >
                                      <FlaskConical size={11} />
                                      Collect Specimen: {lo.testName}
                                    </button>
                                  );
                                }
                                return (
                                  <span
                                    key={lo.id}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      backgroundColor: '#e0f2fe',
                                      color: '#0369a1',
                                      width: 'fit-content',
                                    }}
                                  >
                                    <Clock size={10} />
                                    Lab Processing: {lo.testName}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                          {item.age} Y • {item.gender}
                        </span>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Blood: {item.bloodGroup || 'O+'}
                        </div>
                      </td>

                      <td>
                        <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                          {item.doctor}
                        </strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {item.room}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            item.status === 'READY_FOR_DOCTOR' || item.status === 'TRIAGED'
                              ? 'badge-success'
                              : item.status === 'IN_TRIAGE'
                              ? 'badge-info'
                              : item.status === 'EMERGENCY'
                              ? 'badge-danger'
                              : 'badge-warning'
                          }`}
                        >
                          {item.status === 'READY_FOR_DOCTOR' || item.status === 'TRIAGED'
                            ? 'Ready'
                            : item.status === 'IN_TRIAGE'
                            ? 'In Triage'
                            : item.status === 'EMERGENCY'
                            ? 'Emergency'
                            : 'Waiting'}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            isEmergency
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
                          style={{
                            fontSize: '13px',
                            color: 'var(--text-muted)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={13} />
                          {item.time || '10:00 AM'}
                        </span>
                      </td>

                      <td
                        style={{
                          width: '208px',
                          minWidth: '208px',
                          maxWidth: '208px',
                          textAlign: 'right',
                          padding: '0.75rem 1rem',
                          boxSizing: 'border-box',
                        }}
                      >
                        <TriageRowActions
                          item={item}
                          onCallPatient={onCallPatient}
                          onStartTriage={onStartTriage}
                          onMarkEmergency={onMarkEmergency}
                          onFastTrackToDoctor={onFastTrackToDoctor}
                          isOpen={openMenuTokenId === item.id}
                          onOpen={() => setOpenMenuTokenId(item.id)}
                          onClose={() => setOpenMenuTokenId(null)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
