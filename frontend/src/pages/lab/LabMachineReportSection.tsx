// Machine report (the analyzer's own printout as PDF) on a lab order — placeholder until upload is built.
// Technician uploads before sign-off; the pathologist reviews it with the values and the sign-off covers it.
import React from 'react';
import { Upload } from 'lucide-react';
import { HmsSection, HmsButton, HmsBadge, HMS } from '../../components/hms';

export const LabMachineReportSection: React.FC<{ canUpload: boolean }> = ({ canUpload }) => (
  <HmsSection
    title="Machine report"
    right={
      canUpload ? (
        <HmsButton size="sm" icon={Upload} disabled title="Coming soon" aria-label="Upload machine report (coming soon)">
          Upload machine report
        </HmsButton>
      ) : undefined
    }
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px' }}>
      <span style={{ fontSize: '13px', color: HMS.textSecondary }}>
        {canUpload ? 'No machine report uploaded yet. Upload the analyzer printout (PDF) before sending for review.' : 'No machine report uploaded yet.'}
      </span>
      <HmsBadge tone="gray">Coming soon</HmsBadge>
    </div>
  </HmsSection>
);

export default LabMachineReportSection;
