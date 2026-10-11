import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  User as UserIcon,
  ShieldCheck,
  Building2,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  KeyRound,
  ExternalLink,
  Award,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  FileText
} from 'lucide-react';
import { User, RoleType } from '../../../../types';
import {
  getStaffProfileForUser,
  ExtendedStaffProfile
} from '../../../../services/staffProfileService';

interface MyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  role: RoleType;
  displayName: string;
  designation: string;
  initials: string;
  onChangePasswordClick?: () => void;
}

export const MyProfileModal: React.FC<MyProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  role,
  displayName,
  designation,
  initials,
  onChangePasswordClick,
}) => {
  const navigate = useNavigate();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const profile: ExtendedStaffProfile = getStaffProfileForUser(user, role);

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '880px',
          maxWidth: '94vw',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 32px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserIcon size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Staff Profile & Governance Card
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#16a34a',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                  }}
                >
                  Active Staff
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0 0' }}>
                North Hospital Enterprise Clinical System · Official Credential Directory
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/profile');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563eb',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
              title="Open full dedicated profile page"
            >
              <ExternalLink size={14} />
              <span>Dedicated Profile Page</span>
            </button>

            <button
              onClick={onClose}
              style={{
                padding: '6px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: '#9ca3af',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Body Content - Generous Space & Zero Clutter */}
        <div
          style={{
            padding: '28px 32px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Hero Banner Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              padding: '20px 24px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flex: 1, minWidth: '320px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  border: '3px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                {profile.personal.initials}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                    {profile.personal.fullName}
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#2563eb',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {profile.employment.employmentStatus.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#475569', fontWeight: 500, lineHeight: 1.3 }}>
                  {profile.employment.designation}
                </div>
                
                {/* Clean metadata badge row with no wrap breaking */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '12px',
                    color: '#64748b',
                    marginTop: '4px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                    onClick={() => copyToClipboard(profile.employment.employeeCode, 'modal-emp-code')}
                    title="Click to copy employee ID"
                  >
                    <span style={{ color: '#64748b' }}>Staff ID:</span>
                    <strong style={{ color: '#1e293b' }}>{profile.employment.employeeCode}</strong>
                    {copiedKey === 'modal-emp-code' ? <Check size={12} style={{ color: '#16a34a' }} /> : <Copy size={11} style={{ color: '#94a3b8' }} />}
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    <span style={{ color: '#64748b' }}>Dept:</span>
                    <strong style={{ color: '#1e293b' }}>{profile.assignment.primaryDepartment}</strong>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    <span style={{ color: '#64748b' }}>Station:</span>
                    <strong style={{ color: '#1e293b' }}>{profile.assignment.workLocation.roomOrCounter}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Clearance Card aligned neatly on right */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                alignItems: 'flex-end',
                textAlign: 'right',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '10px 14px',
                borderRadius: '8px',
                alignSelf: 'center',
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Clearance Level
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                {profile.account.clearanceLevel}
              </span>
              <span style={{ fontSize: '11px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <ShieldCheck size={13} /> MFA Protected
              </span>
            </div>
          </div>

          {/* Section 1 & 2 Grid: Personal & Employment */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            {/* Section 1: Personal Information */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <UserIcon size={16} style={{ color: '#2563eb' }} />
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Personal Information
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Official Email</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginTop: '2px', wordBreak: 'break-all' }}>
                    {profile.personal.email}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Contact Phone</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                    {profile.personal.phone}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Date of Birth</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                    {profile.personal.dob}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Gender & Blood</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                    {profile.personal.gender} · {profile.personal.bloodGroup}
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Residential Address</div>
                  <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px', lineHeight: 1.35 }}>
                    {profile.personal.address.street}, {profile.personal.address.city}, {profile.personal.address.state} — {profile.personal.address.pincode}
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Emergency Contact</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                    {profile.personal.emergencyContact.name} ({profile.personal.emergencyContact.relation})
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                    Phone: {profile.personal.emergencyContact.phone}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Employment Information */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <Briefcase size={16} style={{ color: '#16a34a' }} />
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Employment Information
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Employee ID</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>
                    {profile.employment.employeeCode}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Joining Date</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                    {profile.employment.joiningDate}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Contract Type</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                    {profile.employment.contractType.replace(/_/g, ' ')}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Experience</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                    {profile.employment.experienceYears}
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Probation Status</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a', marginTop: '2px' }}>
                    Completed ({profile.employment.probationPeriodMonths} Months Verified)
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Reporting Manager</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                    {profile.employment.reportingManagerName}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                    Direct escalation authority for leave, roster & regulatory audit
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 & 4 Grid: Department & Assignment / Account Info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            {/* Section 3: Department & Assignment */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <Building2 size={16} style={{ color: '#2563eb' }} />
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Department & Assignment
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 16px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Department</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                    {profile.assignment.primaryDepartment}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Building & Floor</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                    {profile.assignment.workLocation.buildingName} · {profile.assignment.workLocation.floorName}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Workstation / Room</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', marginTop: '2px' }}>
                    {profile.assignment.workLocation.roomOrCounter}
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2', backgroundColor: '#f0fdf4', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Active Roster Shift</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#15803d', marginTop: '2px' }}>
                    {profile.assignment.shift.name} ({profile.assignment.shift.hours})
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Account & Security */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <ShieldCheck size={16} style={{ color: '#7e22ce' }} />
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Account & Security
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Username</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
                    @{profile.account.username}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>System Role</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>
                    {profile.account.systemRole}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Account Status</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a', marginTop: '2px' }}>
                    Active · Enterprise Verified
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Last Active</div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#475569', marginTop: '2px' }}>
                    {profile.account.lastLogin}
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Account Password</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Updated and compliant with hospital policy</div>
                  </div>
                  {onChangePasswordClick && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onChangePasswordClick();
                      }}
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#2563eb',
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Change →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Role-Specific Credentials */}
          {profile.roleDetails.pharmacy && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={16} style={{ color: '#2563eb' }} />
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Pharmacy Governance & Vault Authority
                  </h4>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                  PHARMACY ROLE
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 18px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Pharmacy Council Reg.</span>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{profile.roleDetails.pharmacy.pharmacyRegNumber}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Assigned Facility Vault</span>
                  <div style={{ fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>{profile.roleDetails.pharmacy.assignedStore}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Schedule X Witness Authority</span>
                  <div style={{ fontWeight: 600, color: '#16a34a', marginTop: '2px' }}>✓ Authorized Witness Staff</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 32px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Profile records synchronized with Hospital Enterprise Master HR.
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 22px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151',
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
