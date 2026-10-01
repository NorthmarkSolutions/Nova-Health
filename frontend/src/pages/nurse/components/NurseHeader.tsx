import React from 'react';
import { ShieldAlert, Activity } from 'lucide-react';
import { WorkspaceHeader } from '../../../components/workspace/WorkspaceHeader';

interface NurseHeaderProps {
  currentShift: 'MORNING' | 'EVENING' | 'NIGHT';
  onShiftChange: (shift: 'MORNING' | 'EVENING' | 'NIGHT') => void;
  onEmergencyAlert: () => void;
}

const SHIFT_ROSTER_HOURS: Record<'MORNING' | 'EVENING' | 'NIGHT', string> = {
  MORNING: '07:00 – 15:00',
  EVENING: '15:00 – 23:00',
  NIGHT: '23:00 – 07:00',
};

export const NurseHeader: React.FC<NurseHeaderProps> = ({
  currentShift,
  onShiftChange,
  onEmergencyAlert,
}) => {
  return (
    <WorkspaceHeader
      title="Nurse Triage Station"
      description="Patient intake, clinical vitals assessment, and rapid doctor chamber handoff."
      icon={<Activity size={20} />}
      actions={
        <>
          {/* Shift Selector (§ 11 & § 12) */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--gray-100)',
              borderRadius: '10px',
              padding: '3px',
              border: '1px solid var(--border-color)',
            }}
          >
            {(['MORNING', 'EVENING', 'NIGHT'] as const).map((shift) => (
              <button
                key={shift}
                type="button"
                onClick={() => onShiftChange(shift)}
                title={SHIFT_ROSTER_HOURS[shift]}
                style={{
                  border: 'none',
                  backgroundColor: currentShift === shift ? '#ffffff' : 'transparent',
                  color: currentShift === shift ? 'var(--secondary)' : 'var(--text-muted)',
                  fontWeight: currentShift === shift ? 600 : 500,
                  fontSize: '13px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: currentShift === shift ? '0 1px 2px rgba(0, 0, 0, 0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {shift}
              </button>
            ))}
          </div>

          {/* Emergency Broadcast (§ 12) */}
          <button
            type="button"
            className="btn btn-danger"
            onClick={onEmergencyAlert}
            title="Broadcast Code Blue or emergency priority alert to OPD & ER"
          >
            <ShieldAlert size={16} />
            <span>Code Blue Alert</span>
          </button>
        </>
      }
    />
  );
};
