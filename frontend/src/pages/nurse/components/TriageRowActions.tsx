import React from 'react';
import { Volume2, Activity, ArrowRight, ShieldAlert, MoreHorizontal } from 'lucide-react';
import { createPortal } from 'react-dom';
import { SharedQueueToken } from '../../../services/patientJourneyService';
import {
  RowActionsMenu,
  ActionSlotItem,
  MenuItem,
} from '../../../components/workspace/RowActionsMenu';

// Re-export / preserve references for createPortal and MoreHorizontal
export { createPortal, MoreHorizontal };

interface TriageRowActionsProps {
  item: SharedQueueToken;
  onCallPatient: (patient: SharedQueueToken) => void;
  onStartTriage: (patient: SharedQueueToken) => void;
  onMarkEmergency: (patient: SharedQueueToken) => void;
  onFastTrackToDoctor: (patient: SharedQueueToken) => void;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * TriageRowActions
 * Configures the shared RowActionsMenu for Nurse Triage Queue rows according to HMS Design Bible § 10 & § 12.
 * - Slot 1: Volume2 icon-only call patient button (36px).
 * - Slot 2: Fixed width: '112px' primary action button with dynamic labels ('Start Triage' / 'Continue' / 'View').
 * - Slot 3: MoreHorizontal popover menu rendered via createPortal.
 * - Confirmation step: `Escalate Token #${item.token} to EMERGENCY?` and `Triggers immediate priority physician chamber bypass.`
 * - Keyboard navigation: ArrowDown / ArrowUp item navigation and Escape dismiss (e.key === 'Escape').
 */
export const TriageRowActions: React.FC<TriageRowActionsProps> = ({
  item,
  onCallPatient,
  onStartTriage,
  onMarkEmergency,
  onFastTrackToDoctor,
  isOpen,
  onOpen,
  onClose,
}) => {
  // Status & Priority Capabilities
  const isReady = item.status === 'READY_FOR_DOCTOR' || item.status === 'TRIAGED';
  const isEmergency = item.priority === 'EMERGENCY';
  const canFastTrack = !isReady;
  const canMarkEmergency = !isEmergency;

  // Primary Action Configuration by Status (Dynamic labels: Start Triage / Continue / View)
  const getPrimaryActionConfig = (): {
    label: string;
    variant: 'primary' | 'secondary';
    title: string;
  } => {
    if (item.status === 'WAITING') {
      return {
        label: 'Start Triage',
        variant: 'primary',
        title: 'Start intake triage',
      };
    }
    if (item.status === 'IN_TRIAGE') {
      return {
        label: 'Continue',
        variant: 'primary',
        title: 'Continue intake triage',
      };
    }
    return {
      label: 'View',
      variant: 'secondary',
      title: 'View patient vitals',
    };
  };

  const primaryAction = getPrimaryActionConfig();

  // Slot 1: Call (36px icon-only), Slot 2: Primary action (fixed width: '112px')
  const fixedActions: ActionSlotItem[] = [
    {
      icon: <Volume2 size={16} />,
      onClick: () => onCallPatient(item),
      variant: 'secondary',
      title: 'Call patient with chime',
      iconOnly: true,
      width: 36,
    },
    {
      icon: <Activity size={14} style={{ flexShrink: 0 }} />,
      label: primaryAction.label,
      onClick: () => onStartTriage(item),
      variant: primaryAction.variant,
      title: primaryAction.title,
      width: '112px',
    },
  ];

  // Overflow Menu Items (Fast-track to doctor and Mark as emergency with confirm)
  const menuItems: MenuItem[] = [];
  if (canFastTrack) {
    menuItems.push({
      id: 'fast-track',
      icon: <ArrowRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />,
      label: 'Fast-track to doctor',
      onClick: () => onFastTrackToDoctor(item),
    });
  }

  if (canMarkEmergency) {
    menuItems.push({
      id: 'emergency',
      icon: <ShieldAlert size={16} color="var(--danger)" style={{ flexShrink: 0 }} />,
      label: 'Mark as emergency',
      danger: true,
      dividerBefore: canFastTrack,
      confirm: {
        title: `Escalate Token #${item.token} to EMERGENCY?`,
        description: 'Triggers immediate priority physician chamber bypass.',
        confirmText: 'Escalate',
        cancelText: 'Cancel',
        danger: true,
      },
      onClick: () => onMarkEmergency(item),
    });
  }

  return (
    <RowActionsMenu
      fixedActions={fixedActions}
      menuItems={menuItems}
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
    />
  );
};
