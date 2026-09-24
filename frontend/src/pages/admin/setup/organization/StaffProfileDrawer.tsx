import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  Phone,
  Mail,
  MapPin,
  Building2,
  Clock,
  Briefcase,
  CreditCard,
  FileText,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  Check,
  Award,
  Users,
  Calendar,
  HeartPulse,
} from 'lucide-react';
import {
  StaffMember,
  StaffRole,
  StaffStatus,
  EmploymentStatus,
  ContractType,
  HospitalShift,
  updateHospitalStaff,
  getHospitalStaff,
  getStaffReportingManagers,
} from './hospitalStaffStore';
import { adminResetStaffPassword } from '../../../../services/authResetService';

interface StaffProfileDrawerProps {
  staff: StaffMember | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: (updated: StaffMember) => void;
  availableDepartments?: { id: string; name: string }[];
  availableShifts?: HospitalShift[];
}

export const StaffProfileDrawer: React.FC<StaffProfileDrawerProps> = ({
  staff,
  isOpen,
  onClose,
  onSaveSuccess,
  availableDepartments = [],
  availableShifts = [],
}) => {
  const [activeTab, setActiveTab] = useState<
    'personal' | 'emergency' | 'employment' | 'bank' | 'documents' | 'shifts'
  >('personal');

  const [formData, setFormData] = useState<StaffMember | null>(null);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [tempPasswordModal, setTempPasswordModal] = useState<{
    isOpen: boolean;
    tempPass: string;
    msg: string;
  } | null>(null);

  // Sync state when staff changes
  useEffect(() => {
    if (staff) {
      setFormData({
        ...staff,
        bankDetails: staff.bankDetails || {
          bankName: '',
          accountNumber: '',
          ifscOrSwift: '',
          branchName: '',
          salaryPaymentMode: 'DIRECT_DEPOSIT',
          panOrTaxId: '',
        },
        documents: staff.documents || {
          aadhaarNumber: '',
          aadhaarVerified: false,
          panNumber: '',
          medicalRegCertUploaded: false,
          certificatesCount: 0,
          verified: false,
        },
        employmentStatus: staff.employmentStatus || 'FULL_TIME',
        contractType: staff.contractType || 'PERMANENT',
        probationPeriodMonths: staff.probationPeriodMonths || 6,
      });
      setActiveTab('personal');
      setSaveSuccessMsg(null);
    } else {
      setFormData(null);
    }
  }, [staff]);

  if (!isOpen || !formData) return null;

  const reportingManagers = getStaffReportingManagers().filter((s) => s.id !== formData.id);

  const handleInputChange = (field: keyof StaffMember, value: any) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleNestedAddressChange = (field: string, value: string) => {
    setFormData((prev) => {
      if (!prev) return null;
      const addr = typeof prev.address === 'object' && prev.address !== null ? { ...prev.address } : {};
      return {
        ...prev,
        address: { ...addr, [field]: value },
      };
    });
  };

  const handleNestedBankChange = (field: string, value: any) => {
    setFormData((prev) => {
      if (!prev) return null;
      const currentBank = prev.bankDetails || {
        bankName: '',
        accountNumber: '',
        ifscOrSwift: '',
        salaryPaymentMode: 'DIRECT_DEPOSIT',
      };
      return {
        ...prev,
        bankDetails: { ...currentBank, [field]: value },
      };
    });
  };

  const handleNestedDocsChange = (field: string, value: any) => {
    setFormData((prev) => {
      if (!prev) return null;
      const currentDocs = prev.documents || {};
      return {
        ...prev,
        documents: { ...currentDocs, [field]: value },
      };
    });
  };

  const handleSave = () => {
    if (!formData) return;
    setIsSaving(true);
    try {
      updateHospitalStaff(formData);
      setSaveSuccessMsg('Staff profile successfully updated.');
      if (onSaveSuccess) onSaveSuccess(formData);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save staff updates.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdminResetPassword = () => {
    if (!formData) return;
    const res = adminResetStaffPassword(formData.id, 'Super Administrator');
    if (res.success) {
      setTempPasswordModal({
        isOpen: true,
        tempPass: res.tempPassword,
        msg: res.message,
      });
    } else {
      alert(res.message);
    }
  };

  const getStatusBadge = (status: StaffStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span style={{ backgroundColor: '#065f46', color: '#6ee7b7', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>ACTIVE</span>;
      case 'ON_LEAVE':
        return <span style={{ backgroundColor: '#78350f', color: '#fde68a', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>ON LEAVE</span>;
      case 'SUSPENDED':
        return <span style={{ backgroundColor: '#7f1d1d', color: '#fca5a5', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>SUSPENDED</span>;
      case 'RESIGNED':
        return <span style={{ backgroundColor: '#334155', color: '#94a3b8', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>RESIGNED</span>;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          height: '100%',
          backgroundColor: '#0f172a',
          borderLeft: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Card */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #1e293b',
            backgroundColor: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '12px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.25rem',
                border: '2px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              {formData.fullName
                ? formData.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                : 'ST'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  {formData.fullName}
                </h2>
                <code
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#38bdf8',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    border: '1px solid #334155',
                  }}
                >
                  {formData.employeeCode}
                </code>
                {getStatusBadge(formData.status)}
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                {formData.designation} •{' '}
                <span style={{ color: '#38bdf8', textTransform: 'capitalize' }}>{formData.role}</span>
                {formData.departmentName && ` • ${formData.departmentName}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#0f172a',
            borderBottom: '1px solid #334155',
            padding: '0 1rem',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'personal', label: 'Overview & Personal', icon: User },
            { id: 'emergency', label: 'Emergency Contacts', icon: HeartPulse },
            { id: 'employment', label: 'Employment & Manager', icon: Briefcase },
            { id: 'bank', label: 'Bank & Payroll', icon: CreditCard },
            { id: 'documents', label: 'Regulatory Docs', icon: FileText },
            { id: 'shifts', label: 'Shifts & Workstation', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.85rem 1rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #0284c7' : '2px solid transparent',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* TAB 1: OVERVIEW & PERSONAL */}
          {activeTab === 'personal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Employee Code (Permanent ID)
                  </label>
                  <input
                    type="text"
                    value={formData.employeeCode}
                    onChange={(e) => handleInputChange('employeeCode', e.target.value.toUpperCase())}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Designation
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => handleInputChange('designation', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Gender
                  </label>
                  <select
                    value={formData.gender || 'Male'}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Blood Group
                  </label>
                  <input
                    type="text"
                    value={formData.bloodGroup || 'O+'}
                    onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Official Hospital Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Physical Address */}
              <div style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={16} /> Residential Address
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Street Address</label>
                    <input
                      type="text"
                      value={typeof formData.address === 'object' && formData.address ? formData.address.street || '' : ''}
                      onChange={(e) => handleNestedAddressChange('street', e.target.value)}
                      placeholder="e.g. 104 Medical Enclave"
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>City</label>
                    <input
                      type="text"
                      value={typeof formData.address === 'object' && formData.address ? formData.address.city || '' : ''}
                      onChange={(e) => handleNestedAddressChange('city', e.target.value)}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Pincode / Zip</label>
                    <input
                      type="text"
                      value={typeof formData.address === 'object' && formData.address ? formData.address.pincode || '' : ''}
                      onChange={(e) => handleNestedAddressChange('pincode', e.target.value)}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMERGENCY CONTACTS */}
          {activeTab === 'emergency' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.75rem' }}>
                Emergency contacts are required for hospital regulatory compliance and critical incident protocols.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Primary Emergency Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.emergencyContactName || ''}
                    onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                    placeholder="e.g. Eleanor Jenkins"
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Relationship
                  </label>
                  <select
                    value={formData.emergencyContactRelation || 'Spouse'}
                    onChange={(e) => handleInputChange('emergencyContactRelation', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Child">Child</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Friend">Friend / Colleague</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Primary Emergency Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.emergencyContactPhone || ''}
                    onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                    placeholder="e.g. +1 (555) 987-6543"
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Alternate Contact / Secondary Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.emergencyContact || ''}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    placeholder="e.g. +1 (555) 321-7654"
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EMPLOYMENT & HIERARCHY */}
          {activeTab === 'employment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Employment Status
                  </label>
                  <select
                    value={formData.employmentStatus || 'FULL_TIME'}
                    onChange={(e) => handleInputChange('employmentStatus', e.target.value as EmploymentStatus)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="FULL_TIME">Full Time Permanent</option>
                    <option value="PROBATION">Probationary Period</option>
                    <option value="VISITING">Visiting Consultant</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="ON_NOTICE">Serving Notice Period</option>
                    <option value="INACTIVE">Inactive / Archived</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Contract Type
                  </label>
                  <select
                    value={formData.contractType || 'PERMANENT'}
                    onChange={(e) => handleInputChange('contractType', e.target.value as ContractType)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="PERMANENT">Permanent Employment</option>
                    <option value="PROBATION">Probation Contract</option>
                    <option value="VISITING_CONSULTANT">Visiting Consultant Agreement</option>
                    <option value="RESIDENT">Junior / Senior Resident</option>
                    <option value="LOCUM">Locum Tenens</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Date of Joining
                  </label>
                  <input
                    type="date"
                    value={formData.joiningDate || '2023-01-15'}
                    onChange={(e) => handleInputChange('joiningDate', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Probation Period (Months)
                  </label>
                  <input
                    type="number"
                    value={formData.probationPeriodMonths || 6}
                    onChange={(e) => handleInputChange('probationPeriodMonths', parseInt(e.target.value) || 0)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Reporting Manager Assignment */}
              <div style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Users size={16} /> Reporting Manager & Organizational Hierarchy
                </h4>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                    Select Reporting Manager / Supervisor
                  </label>
                  <select
                    value={formData.reportingManagerId || ''}
                    onChange={(e) => {
                      const mgrId = e.target.value;
                      const mgr = reportingManagers.find((m) => m.id === mgrId);
                      setFormData((prev) =>
                        prev
                          ? {
                              ...prev,
                              reportingManagerId: mgrId,
                              reportingManagerName: mgr ? mgr.fullName : '',
                            }
                          : null
                      );
                    }}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="">-- No Direct Reporting Manager Assigned --</option>
                    {reportingManagers.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.fullName} ({mgr.designation} • {mgr.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BANK DETAILS & PAYROLL */}
          {activeTab === 'bank' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', color: '#38bdf8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={16} />
                Financial credentials are strictly encrypted and only accessible by authorized Hospital Administrators and Finance Cashiers.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.bankDetails?.bankName || ''}
                    onChange={(e) => handleNestedBankChange('bankName', e.target.value)}
                    placeholder="e.g. JPMorgan Chase / HDFC Bank"
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={formData.bankDetails?.branchName || ''}
                    onChange={(e) => handleNestedBankChange('branchName', e.target.value)}
                    placeholder="e.g. Downtown Central"
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', margin: 0 }}>
                      Bank Account Number
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAccountNumber(!showAccountNumber)}
                      style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    >
                      {showAccountNumber ? <EyeOff size={12} /> : <Eye size={12} />}
                      {showAccountNumber ? 'Mask' : 'Reveal'}
                    </button>
                  </div>
                  <input
                    type={showAccountNumber ? 'text' : 'password'}
                    value={formData.bankDetails?.accountNumber || ''}
                    onChange={(e) => handleNestedBankChange('accountNumber', e.target.value)}
                    placeholder="Account Number"
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem', fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    IFSC / SWIFT / Routing Code
                  </label>
                  <input
                    type="text"
                    value={formData.bankDetails?.ifscOrSwift || ''}
                    onChange={(e) => handleNestedBankChange('ifscOrSwift', e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0001234"
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#38bdf8', fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Salary Payment Mode
                  </label>
                  <select
                    value={formData.bankDetails?.salaryPaymentMode || 'DIRECT_DEPOSIT'}
                    onChange={(e) => handleNestedBankChange('salaryPaymentMode', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="DIRECT_DEPOSIT">Direct Deposit (Automated ACH)</option>
                    <option value="BANK_TRANSFER">Bank Wire Transfer (NEFT/RTGS)</option>
                    <option value="CHEQUE">Physical Paycheck</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Income Tax PAN / Tax ID
                  </label>
                  <input
                    type="text"
                    value={formData.bankDetails?.panOrTaxId || ''}
                    onChange={(e) => handleNestedBankChange('panOrTaxId', e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem', fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: REGULATORY DOCUMENTS */}
          {activeTab === 'documents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield size={18} color="#38bdf8" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>National Identity / Aadhaar</span>
                  </div>
                  <span style={{ backgroundColor: formData.documents?.aadhaarVerified ? '#065f46' : '#78350f', color: formData.documents?.aadhaarVerified ? '#6ee7b7' : '#fde68a', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 700 }}>
                    {formData.documents?.aadhaarVerified ? 'VERIFIED' : 'PENDING VERIFICATION'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                  <input
                    type="text"
                    value={formData.documents?.aadhaarNumber || ''}
                    onChange={(e) => handleNestedDocsChange('aadhaarNumber', e.target.value)}
                    placeholder="National ID / Aadhaar Number"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.8rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleNestedDocsChange('aadhaarVerified', !formData.documents?.aadhaarVerified)}
                    style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {formData.documents?.aadhaarVerified ? 'Revoke Mark' : 'Mark as Verified'}
                  </button>
                </div>
              </div>

              {/* Medical Council Registration Certificate */}
              <div style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Award size={18} color="#38bdf8" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>State Medical Council License</span>
                  </div>
                  <span style={{ backgroundColor: '#065f46', color: '#6ee7b7', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 700 }}>
                    ON FILE
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Registration Number</label>
                    <input
                      type="text"
                      value={formData.registrationNumber || ''}
                      onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                      placeholder="e.g. MCI-2018-99882"
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.8rem', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>License Number</label>
                    <input
                      type="text"
                      value={formData.licenseNumber || ''}
                      onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                      placeholder="e.g. LIC-MED-771"
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.8rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SHIFTS & WORKSTATION */}
          {activeTab === 'shifts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Primary Shift
                  </label>
                  <select
                    value={formData.shiftId || ''}
                    onChange={(e) => {
                      const shId = e.target.value;
                      const sh = availableShifts.find((s) => s.id === shId);
                      setFormData((prev) =>
                        prev
                          ? {
                              ...prev,
                              shiftId: shId,
                              shiftName: sh?.name || '',
                              shiftHours: sh ? `${sh.startTime} - ${sh.endTime}` : '',
                            }
                          : null
                      );
                    }}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  >
                    {availableShifts.map((sh) => (
                      <option key={sh.id} value={sh.id}>
                        {sh.name} ({sh.startTime} - {sh.endTime})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                    Primary Department
                  </label>
                  <select
                    value={formData.departmentId || ''}
                    onChange={(e) => {
                      const deptId = e.target.value;
                      const dept = availableDepartments.find((d) => d.id === deptId);
                      setFormData((prev) =>
                        prev
                          ? {
                              ...prev,
                              departmentId: deptId,
                              departmentName: dept?.name || '',
                            }
                          : null
                      );
                    }}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '0.85rem' }}
                  >
                    {availableDepartments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clinical doctor specifics */}
              {formData.role === 'doctor' && (
                <div style={{ backgroundColor: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#38bdf8' }}>
                    OPD Consultation Quota & Timing
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Slot Duration (Mins)</label>
                      <input
                        type="number"
                        value={formData.consultationDurationMinutes || 15}
                        onChange={(e) => handleInputChange('consultationDurationMinutes', parseInt(e.target.value) || 15)}
                        style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Daily Patient Quota</label>
                      <input
                        type="number"
                        value={formData.dailyPatientCapacity || 30}
                        onChange={(e) => handleInputChange('dailyPatientCapacity', parseInt(e.target.value) || 30)}
                        style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Consultation Fee ($)</label>
                      <input
                        type="number"
                        value={formData.consultationFee || 100}
                        onChange={(e) => handleInputChange('consultationFee', parseInt(e.target.value) || 100)}
                        style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #334155',
            backgroundColor: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            onClick={handleAdminResetPassword}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: '6px',
              backgroundColor: '#334155',
              border: '1px solid #475569',
              color: '#f87171',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <KeyRound size={14} /> Reset Credentials
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {saveSuccessMsg && (
              <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Check size={14} /> {saveSuccessMsg}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                border: '1px solid #475569',
                color: '#cbd5e1',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: '6px',
                backgroundColor: '#0284c7',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Save size={15} /> {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>

        {/* Temporary Password Modal Popup */}
        {tempPasswordModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10001,
            }}
          >
            <div
              style={{
                width: '420px',
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#34d399' }}>
                <CheckCircle2 size={22} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 800 }}>
                  Temporary Password Issued
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                {tempPasswordModal.msg}
              </p>
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#0f172a',
                  border: '1px dashed #38bdf8',
                  borderRadius: '6px',
                  marginBottom: '1.25rem',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>TEMPORARY ACCESS KEY</span>
                <code style={{ fontSize: '1.2rem', color: '#38bdf8', fontWeight: 900, letterSpacing: '0.05em' }}>
                  {tempPasswordModal.tempPass}
                </code>
              </div>
              <button
                type="button"
                onClick={() => setTempPasswordModal(null)}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: '6px',
                  backgroundColor: '#0284c7',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Dismiss & Copy to Staff
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
