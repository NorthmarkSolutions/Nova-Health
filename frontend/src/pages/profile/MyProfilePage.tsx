import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  User as UserIcon,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  KeyRound,
  FileText,
  Award,
  CheckCircle2,
  Copy,
  Check,
  Lock,
  Layers,
  AlertTriangle,
  HeartPulse,
  Pill,
  Stethoscope,
  Activity,
  BadgeCheck,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getStaffProfileForUser,
  getStaffProfileById,
  ExtendedStaffProfile
} from '../../services/staffProfileService';
import { ChangePasswordModal } from '../pharmacy/inventory/modals/ChangePasswordModal';

export const MyProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, role, logout } = useAuth();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Look up target profile with access control check (Stage 3)
  const targetId = searchParams.get('id') || searchParams.get('emp') || '';
  const lookupResult = getStaffProfileById(targetId, user, role);
  const profile: ExtendedStaffProfile = lookupResult.profile || getStaffProfileForUser(user, role);
  const accessError = lookupResult.error;

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top Sticky Navigation Bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            title="Return to previous screen"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
            <span>North Hospital</span>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span>Staff Administration</span>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span style={{ color: '#0f172a', fontWeight: 600 }}>My Staff Profile</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setIsChangePasswordOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '34px',
              padding: '0 14px',
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#374151',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            <KeyRound size={14} style={{ color: '#6b7280' }} />
            <span>Change Password</span>
          </button>

          <button
            type="button"
            onClick={() => {
              window.print();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '34px',
              padding: '0 14px',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
          >
            <FileText size={14} />
            <span>Export Record</span>
          </button>
        </div>
      </header>

      {/* Access Restriction Notice if user requested another profile without admin clearance */}
      {accessError && (
        <div
          style={{
            maxWidth: '1140px',
            width: '100%',
            margin: '20px auto 0',
            padding: '12px 20px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#b45309',
            fontSize: '13px',
            boxSizing: 'border-box',
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>{accessError} Showing your authenticated personal staff record.</div>
        </div>
      )}

      {/* Main Container - Breathable, Spacious SaaS Layout */}
      <main
        style={{
          maxWidth: '1140px',
          width: '100%',
          margin: '28px auto 48px',
          padding: '0 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
          boxSizing: 'border-box',
        }}
      >
        {/* ============================================================== */}
        {/* HERO CARD: Staff Identity & Status Banner                      */}
        {/* ============================================================== */}
        <section
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '32px 36px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flex: 1, minWidth: '320px' }}>
            {/* 72px Breathable Avatar */}
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                border: '3px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                fontWeight: 700,
                flexShrink: 0,
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.1)',
                marginTop: '2px',
              }}
            >
              {profile.personal.initials}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: 0,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                  }}
                >
                  {profile.personal.fullName}
                </h1>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#16a34a',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
                  {profile.account.accountStatus}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#2563eb',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {profile.employment.employmentStatus.replace(/_/g, ' ')}
                </span>
              </div>

              <div style={{ fontSize: '15px', color: '#475569', fontWeight: 500, lineHeight: 1.3 }}>
                {profile.employment.designation}
              </div>

              {/* Clean metadata badge row */}
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
                    gap: '5px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                  onClick={() => copyToClipboard(profile.employment.employeeCode, 'hero-code')}
                  title="Click to copy employee ID"
                >
                  <span style={{ color: '#64748b' }}>Staff ID:</span>
                  <strong style={{ color: '#1e293b' }}>{profile.employment.employeeCode}</strong>
                  {copiedKey === 'hero-code' ? <Check size={13} style={{ color: '#16a34a' }} /> : <Copy size={12} style={{ color: '#94a3b8' }} />}
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '4px 10px',
                    borderRadius: '6px',
                  }}
                >
                  <Building2 size={13} style={{ color: '#94a3b8' }} />
                  <span style={{ color: '#64748b' }}>Dept:</span>
                  <strong style={{ color: '#1e293b' }}>{profile.assignment.primaryDepartment}</strong>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '4px 10px',
                    borderRadius: '6px',
                  }}
                >
                  <MapPin size={13} style={{ color: '#94a3b8' }} />
                  <span style={{ color: '#64748b' }}>Station:</span>
                  <strong style={{ color: '#1e293b' }}>{profile.assignment.workLocation.roomOrCounter}</strong>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '12px 18px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              minWidth: '200px',
              alignSelf: 'center',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Clearance Level
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              {profile.account.clearanceLevel}
            </div>
            <div style={{ fontSize: '11px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '2px' }}>
              <ShieldCheck size={13} />
              <span>Two-Factor Authentication Active</span>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION 1 & 2: Personal & Employment Information               */}
        {/* ============================================================== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
          {/* 1. PERSONAL INFORMATION */}
          <section
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: '28px 30px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserIcon size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Personal Information
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                    Identity, contact details & emergency kin
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, backgroundColor: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                Read-Only
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 20px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Official Email</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', wordBreak: 'break-all' }}>{profile.personal.email}</span>
                  <button
                    onClick={() => copyToClipboard(profile.personal.email, 'email')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                    title="Copy Email"
                  >
                    {copiedKey === 'email' ? <Check size={13} style={{ color: '#16a34a' }} /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Phone</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{profile.personal.phone}</span>
                  <button
                    onClick={() => copyToClipboard(profile.personal.phone, 'phone')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                    title="Copy Phone"
                  >
                    {copiedKey === 'phone' ? <Check size={13} style={{ color: '#16a34a' }} /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date of Birth</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                  {profile.personal.dob}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Gender & Blood Group</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                  {profile.personal.gender} · {profile.personal.bloodGroup}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Residential Address</span>
                <div style={{ fontSize: '13px', color: '#334155', marginTop: '4px', lineHeight: 1.4 }}>
                  {profile.personal.address.street}, {profile.personal.address.city}, {profile.personal.address.state} — {profile.personal.address.pincode}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2', padding: '12px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                  Emergency Contact Kin
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  {profile.personal.emergencyContact.name} ({profile.personal.emergencyContact.relation})
                </div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                  Emergency Helpline: {profile.personal.emergencyContact.phone}
                </div>
              </div>
            </div>
          </section>

          {/* 2. EMPLOYMENT INFORMATION */}
          <section
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: '28px 30px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Employment Information
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                    HR designation, contract terms & joining date
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, backgroundColor: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                HR Verified
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 20px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Employee ID / Code</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#2563eb' }}>{profile.employment.employeeCode}</span>
                  <button
                    onClick={() => copyToClipboard(profile.employment.employeeCode, 'code')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                    title="Copy Code"
                  >
                    {copiedKey === 'code' ? <Check size={13} style={{ color: '#16a34a' }} /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date of Joining</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                  {profile.employment.joiningDate}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Employment Status</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', marginTop: '4px' }}>
                  {profile.employment.employmentStatus.replace(/_/g, ' ')}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contract Type</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                  {profile.employment.contractType.replace(/_/g, ' ')}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Experience Standing</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                  {profile.employment.experienceYears}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Probation Status</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                  {profile.employment.probationPeriodMonths} Months (Completed)
                </div>
              </div>

              <div style={{ gridColumn: 'span 2', padding: '12px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                  Reporting Manager & Department Escalation
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  {profile.employment.reportingManagerName}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Direct reporting authority for leave, shift roster modifications, and clinical protocol compliance.
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ============================================================== */}
        {/* SECTION 3 & 4: Department & Assignment / Account Info          */}
        {/* ============================================================== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
          {/* 3. DEPARTMENT & ASSIGNMENT */}
          <section
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: '28px 30px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Department & Work Assignment
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                    Facility station, building floor & operational shift
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 20px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Primary Department</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  {profile.assignment.primaryDepartment}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Campus Building</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                  {profile.assignment.workLocation.buildingName}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Level / Floor</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                  {profile.assignment.workLocation.floorName}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Designated Station / Vault</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', marginTop: '4px' }}>
                  {profile.assignment.workLocation.roomOrCounter}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2', padding: '12px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Scheduled Working Shift
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', backgroundColor: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                    ACTIVE
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#15803d' }}>
                  {profile.assignment.shift.name} ({profile.assignment.shift.hours})
                </div>
                <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>
                  Includes 30-minute mandatory clinical handover buffer at shift transition.
                </div>
              </div>
            </div>
          </section>

          {/* 4. ACCOUNT INFORMATION */}
          <section
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: '28px 30px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#faf5ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Account & Security Information
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                    Authentication identifier, active role & sessions
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 20px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>System Username</span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '4px', fontFamily: 'monospace' }}>
                  @{profile.account.username}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assigned System Role</span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
                  {profile.account.systemRole}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Account Verification</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', marginTop: '4px' }}>
                  Hospital Verified · Active
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Last Authentication</span>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#475569', marginTop: '4px' }}>
                  {profile.account.lastLogin}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2', padding: '14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Authentication Password</span>
                  <button
                    onClick={() => setIsChangePasswordOpen(true)}
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#2563eb',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Change Password →
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                  Password meets hospital security requirements. Next mandatory enterprise rotation in 74 days.
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ============================================================== */}
        {/* SECTION 5: ROLE-BASED PROFILE INFORMATION (STAGE 4)            */}
        {/* ============================================================== */}
        <section
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '28px 32px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Role-Specific Professional Credentials & Delegations
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Regulatory certifications, council licenses & department permissions
                </p>
              </div>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#2563eb',
                backgroundColor: '#eff6ff',
                padding: '3px 10px',
                borderRadius: '6px',
                border: '1px solid #bfdbfe',
                letterSpacing: '0.04em',
              }}
            >
              {profile.staffCategory} PROFILE
            </span>
          </div>

          {/* DOCTOR SPECIFIC DETAILS */}
          {profile.roleDetails.doctor && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px 24px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Medical Registration No.</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  {profile.roleDetails.doctor.medicalRegNumber}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>State License ID</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  {profile.roleDetails.doctor.licenseNumber}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Clinical Qualifications</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                  {profile.roleDetails.doctor.qualification}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Subspecialty Expertise</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                  {profile.roleDetails.doctor.specialization}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Consultation Fee</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>
                  ₹{profile.roleDetails.doctor.consultationFee} / Visit
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Daily Capacity / Avg Time</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                  {profile.roleDetails.doctor.dailyPatientCapacity} Patients ({profile.roleDetails.doctor.consultationDurationMinutes} min / slot)
                </div>
              </div>
            </div>
          )}

          {/* NURSE SPECIFIC DETAILS */}
          {profile.roleDetails.nurse && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px 24px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Nursing Council Reg.</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  {profile.roleDetails.nurse.nursingRegNumber}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Nursing Designation</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  {profile.roleDetails.nurse.nursingDesignation}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Clinical Ward Assignment</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', marginTop: '4px' }}>
                  {profile.roleDetails.nurse.wardAssignment}
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Verified Certifications</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {profile.roleDetails.nurse.certifications.map((c) => (
                    <span key={c} style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: '6px' }}>
                      ✓ {c}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Handover Protocol</span>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                  {profile.roleDetails.nurse.handoverProtocol}
                </div>
              </div>
            </div>
          )}

          {/* PHARMACY SPECIFIC DETAILS */}
          {profile.roleDetails.pharmacy && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px 24px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Pharmacy Council Reg.</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  {profile.roleDetails.pharmacy.pharmacyRegNumber}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Assigned Pharmacy Area</span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
                  {profile.roleDetails.pharmacy.assignedStore}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Substance Custody Clearance</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#b45309', marginTop: '4px' }}>
                  {profile.roleDetails.pharmacy.custodyClearance}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Schedule X Witness Authority</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CheckCircle2 size={16} /> Authorized Witness Staff
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Cold Chain Inspection</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CheckCircle2 size={16} /> Certified Cold Chain Custodian
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Dispensary Level</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '4px' }}>
                  Tier 1 Enterprise Central Store
                </div>
              </div>
            </div>
          )}

          {/* ADMIN SPECIFIC DETAILS */}
          {profile.roleDetails.admin && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px 24px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Executive Rank</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  {profile.roleDetails.admin.administrativeRank}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Governance Level</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>
                  {profile.roleDetails.admin.governanceLevel}
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Enterprise Scope</span>
                <div style={{ fontSize: '13px', color: '#334155', marginTop: '4px' }}>
                  {profile.roleDetails.admin.executiveScope}
                </div>
              </div>
            </div>
          )}

          {/* RECEPTION & OTHER */}
          {profile.roleDetails.reception && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px 24px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Front Counter Desk</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  {profile.roleDetails.reception.counterDesk}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Triage Bay</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', marginTop: '4px' }}>
                  {profile.roleDetails.reception.triageStation}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Visitor Authority</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', marginTop: '4px' }}>
                  {profile.roleDetails.reception.visitorAuthority}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onSuccess={() => {
          showToast('Password credentials updated successfully.');
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default MyProfilePage;
